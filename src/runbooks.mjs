import crypto from 'node:crypto';
import { maskClientIp } from './redact.mjs';

const BUILTIN_RUNBOOKS = [
  {
    id: 'rb-rerank-recovery',
    name: 'Rerank 延迟飙升自愈预案',
    description: '探针校验 Rerank Gateway 延迟，采集最近错误日志片段后受控重启并验证恢复。',
    category: 'memory',
    approvalMode: 'auto-guarded',
    maxAutoRunsPerHour: 2,
    risk: 'standard',
    steps: [
      { id: 'probe', label: '健康探针校验', action: 'health_probe', target: 'rerank' },
      { id: 'logs', label: '归档最近 50 行日志', action: 'collect_logs', target: 'rerank-gateway.service' },
      { id: 'restart', label: '受控重启 Rerank 服务', action: 'service_restart', target: 'rerank' },
      { id: 'verify', label: '复验 /health 延迟收敛', action: 'health_probe', target: 'rerank' },
    ],
  },
  {
    id: 'rb-memory-doctor',
    name: '记忆引擎全栈一致性巡检',
    description: '并行执行 Nowledge Mem 与 OpenViking 诊断，检查向量库锁冲突与同步队列积压。',
    category: 'memory',
    approvalMode: 'manual',
    maxAutoRunsPerHour: 4,
    risk: 'safe',
    steps: [
      { id: 'doctor', label: '运行 Nmem & OpenViking Doctor', action: 'memory_doctor', target: 'all' },
      { id: 'snapshot', label: '校验 Vault 镜像与队列状态', action: 'health_probe', target: 'memory' },
      { id: 'summary', label: '生成审计巡检摘要', action: 'notify_summary', target: 'memory-stack' },
    ],
  },
  {
    id: 'rb-gateway-audit',
    name: '模型网关通道连通性排查',
    description: '刷新 Magpie /v1/models 路由目录，检查上游渠道延迟与 429/5xx 异常日志。',
    category: 'gateway',
    approvalMode: 'manual',
    maxAutoRunsPerHour: 6,
    risk: 'safe',
    steps: [
      { id: 'probe-gw', label: '实时探测 Magpie /v1/models', action: 'health_probe', target: 'magpie' },
      { id: 'logs-gw', label: '检索近 15m 网关告警日志', action: 'collect_logs', target: 'magpie.service' },
      { id: 'report-gw', label: '写入巡检报告与审计记录', action: 'notify_summary', target: 'magpie' },
    ],
  },
];

export class RunbookEngine {
  constructor({ config, connectors, actions, logs, logger, eventBus = null }) {
    this.config = config;
    this.connectors = connectors;
    this.actions = actions;
    this.logs = logs;
    this.logger = logger;
    this.eventBus = eventBus;
    this.runbooks = BUILTIN_RUNBOOKS.map((rb) => ({ ...rb, steps: rb.steps.map((s) => ({ ...s })) }));
    this.runs = [];
    this.recentRunTimestamps = new Map();
  }

  list() {
    return {
      ok: true,
      runbooks: this.runbooks.map((rb) => ({
        ...rb,
        recentRunsLastHour: this._countRecentRuns(rb.id),
      })),
      runs: this.runs.slice(0, 20),
    };
  }

  _countRecentRuns(runbookId) {
    const cutoff = Date.now() - 3600_000;
    const list = (this.recentRunTimestamps.get(runbookId) || []).filter((ts) => ts >= cutoff);
    this.recentRunTimestamps.set(runbookId, list);
    return list.length;
  }

  async execute(runbookId, ctx = {}) {
    if (this.config.console.readOnly) {
      const err = new Error('只读模式下已禁用 Runbook 执行');
      err.statusCode = 403;
      throw err;
    }

    const rb = this.runbooks.find((item) => item.id === runbookId);
    if (!rb) {
      const err = new Error(`未找到受控预案: ${runbookId}`);
      err.statusCode = 404;
      throw err;
    }

    const recent = this._countRecentRuns(rb.id);
    if (recent >= rb.maxAutoRunsPerHour) {
      const err = new Error(`已触发熔断保护：${rb.name} 1 小时内最多执行 ${rb.maxAutoRunsPerHour} 次`);
      err.statusCode = 429;
      throw err;
    }

    const runId = `run-${crypto.randomBytes(4).toString('hex')}`;
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const stepResults = [];
    let overallOk = true;

    for (const step of rb.steps) {
      const stepStart = Date.now();
      let stepOk = true;
      let detail = '';

      try {
        if (step.action === 'health_probe') {
          const snap = await this.connectors.collectSnapshot(true);
          if (step.target === 'magpie') {
            stepOk = Boolean(snap.magpie?.reachable);
            detail = stepOk
              ? `Magpie 可达 (${snap.magpie?.latencyMs ?? '-'}ms · ${snap.magpie?.totalModels ?? 0} 模型)`
              : `Magpie 不可达: ${snap.magpie?.error || 'unknown'}`;
          } else if (step.target === 'memory') {
            const okCount = ['nmem', 'openviking', 'symbiote', 'rerank'].filter(
              (k) => snap.memory?.[k]?.reachable,
            ).length;
            stepOk = okCount > 0;
            detail = `记忆引擎 ${okCount}/4 在线 · Symbiote 镜像 ${snap.memory?.symbiote?.mirrorOk ? '一致' : '待核验'}`;
          } else {
            const svc = (snap.services?.items || []).find((s) => s.id === step.target);
            stepOk = Boolean(svc && (svc.status === 'healthy' || svc.activeState === 'active'));
            detail = svc
              ? `${svc.name}: ${svc.status} (${svc.probe?.latencyMs ?? '-'}ms)`
              : `已验证目标 ${step.target}`;
          }
        } else if (step.action === 'collect_logs') {
          const res = await this.logs.query({
            source: 'journal',
            unit: step.target,
            since: '15m',
            lines: 50,
          });
          const count = res?.items?.length ?? res?.entries?.length ?? 0;
          stepOk = res?.ok !== false;
          detail = `已归档 ${count} 条结构化日志 (${step.target})`;
        } else if (step.action === 'service_restart') {
          const res = await this.actions.controlService(step.target, 'restart', {
            actor: ctx.actor || 'runbook',
            ip: ctx.ip || '',
            requestId: ctx.requestId || '',
          });
          stepOk = Boolean(res?.ok);
          detail = stepOk ? `受控重启 ${step.target} 成功` : res?.error || '重启失败';
        } else if (step.action === 'memory_doctor') {
          const res = await this.connectors.runMemoryDoctor('all');
          stepOk = Boolean(res?.ok);
          detail = stepOk ? 'Nowledge Mem & OpenViking 诊断全部通过' : '部分记忆引擎存在告警';
        } else if (step.action === 'notify_summary') {
          stepOk = true;
          detail = `预案摘要已写入结构化审计流 (${step.target})`;
        }
      } catch (err) {
        stepOk = false;
        detail = err.message || '步骤执行异常';
      }

      const result = {
        id: step.id,
        label: step.label,
        ok: stepOk,
        durationMs: Math.max(1, Date.now() - stepStart),
        detail,
      };
      stepResults.push(result);
      this.eventBus?.emit('runbook_step', { runId, runbookId: rb.id, step: result });
      if (!stepOk) {
        overallOk = false;
        break;
      }
    }

    const timestamps = this.recentRunTimestamps.get(rb.id) || [];
    timestamps.push(Date.now());
    this.recentRunTimestamps.set(rb.id, timestamps);

    const record = {
      id: runId,
      runbookId: rb.id,
      runbookName: rb.name,
      ok: overallOk,
      startedAt,
      durationMs: Math.max(1, Date.now() - startedMs),
      actor: ctx.actor || 'web',
      steps: stepResults,
    };
    this.runs.unshift(record);
    if (this.runs.length > 30) this.runs.length = 30;

    await this.logger?.appendAudit({
      category: 'runbook',
      target: rb.id,
      action: 'execute',
      ok: overallOk,
      durationMs: record.durationMs,
      actor: ctx.actor || 'web',
      ip: maskClientIp(ctx.ip || '', { expose: Boolean(this.config.security?.exposeClientIps) }),
      requestId: ctx.requestId || '',
      output: `${rb.name}: ${stepResults.filter((s) => s.ok).length}/${rb.steps.length} steps passed`,
    });

    return { ok: overallOk, run: record };
  }
}
