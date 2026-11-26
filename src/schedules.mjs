import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const CRON_FIELD_RE = /^[0-9*/,-]+$/;

function cleanStr(value, maxLen = 160) {
  return String(value ?? '').trim().slice(0, maxLen);
}

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function validateCronExpression(expr) {
  const trimmed = String(expr || '').trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: 'Cron 表达式必须包含 5 段（分 时 日 月 周），例如 "0 9 * * *"' };
  }
  for (const part of parts) {
    if (!CRON_FIELD_RE.test(part) || part.length > 24) {
      return { valid: false, error: `Cron 字段格式无效：${part}` };
    }
  }
  return { valid: true, normalized: parts.join(' ') };
}

export function describeCronZh(expr) {
  const parts = String(expr || '').trim().split(/\s+/);
  if (parts.length !== 5) return expr || '自定义周期';
  const [min, hour, dom, mon, dow] = parts;
  if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `每 ${min.slice(2)} 分钟`;
  }
  if (min === '0' && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return '每小时整点';
  }
  if (min === '0' && hour.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
    return `每 ${hour.slice(2)} 小时`;
  }
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && mon === '*') {
    const timeStr = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
    if (dow === '*') return `每天 ${timeStr}`;
    if (dow === '1-5') return `工作日 ${timeStr}`;
    const dayNames = { '0': '周日', '1': '周一', '2': '周二', '3': '周三', '4': '周四', '5': '周五', '6': '周六', '7': '周日' };
    if (dayNames[dow]) return `每${dayNames[dow]} ${timeStr}`;
  }
  return expr;
}

function buildSeedSchedules() {
  const now = Date.now();
  const iso = (offsetMin) => new Date(now - offsetMin * 60_000).toISOString();

  return {
    version: 1,
    schedules: [
      {
        id: 'sched-daily-audit',
        name: '每日安全基线与依赖巡检',
        cron: '0 9 * * *',
        prompt: '检查当前仓库依赖安全更新、A2A 节点连通性与 MCP 工具数量是否超过 40 上限，并输出简短巡检结论。',
        targetAgentId: 'a2a-hub-codex-lead',
        targetAgentName: 'Codex CLI',
        botId: '',
        enabled: true,
        runCount: 14,
        lastRunAt: iso(180),
        lastStatus: 'completed',
        lastTaskId: 'a2a-task-9024',
        createdAt: iso(10080),
      },
      {
        id: 'sched-hourly-edge',
        name: '每小时边缘节点健康拨测',
        cron: '0 * * * *',
        prompt: '核查东京与法兰克福节点服务延迟与证书有效期，若发现异常则在任务看板创建高优先级工单。',
        targetAgentId: 'a2a-tokyo-opencode',
        targetAgentName: 'OpenCode Edge Ops',
        botId: '',
        enabled: true,
        runCount: 48,
        lastRunAt: iso(42),
        lastStatus: 'completed',
        lastTaskId: 'a2a-task-9023',
        createdAt: iso(7200),
      },
      {
        id: 'sched-weekly-pr-digest',
        name: '每周五 PR 交付与迭代复盘',
        cron: '0 17 * * 5',
        prompt: '汇总本周所有已合并与待评审 GitHub PR、Worktree 遗留分支及未闭合任务，生成迭代复盘摘要。',
        targetAgentId: 'a2a-hub-claude',
        targetAgentName: 'Claude Code',
        botId: '',
        enabled: false,
        runCount: 4,
        lastRunAt: iso(4320),
        lastStatus: 'completed',
        lastTaskId: null,
        createdAt: iso(14400),
      },
    ],
  };
}

export class ScheduleManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.dataDir = config?.console?.dataDir || path.resolve(process.cwd(), 'data');
    this.stateFile = path.join(this.dataDir, 'schedules.json');
    this.state = buildSeedSchedules();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const raw = await fs.readFile(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.schedules)) {
        this.state = {
          version: 1,
          schedules: parsed.schedules,
        };
      }
    } catch {
      await this.persist().catch(() => {});
    }
  }

  async persist() {
    await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const tmpFile = `${this.stateFile}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    await fs.rename(tmpFile, this.stateFile);
    await fs.chmod(this.stateFile, 0o600).catch(() => {});
  }

  list() {
    const schedules = this.state.schedules.map((s) => ({
      ...s,
      humanLabel: describeCronZh(s.cron),
    }));
    return {
      ok: true,
      summary: {
        total: schedules.length,
        enabled: schedules.filter((s) => s.enabled).length,
        totalRuns: schedules.reduce((sum, s) => sum + (s.runCount || 0), 0),
      },
      schedules,
    };
  }

  async create(payload = {}, { agents = [] } = {}) {
    const name = cleanStr(payload.name, 80);
    if (!name) throw createHttpError(400, '定时任务名称不能为空');

    const prompt = cleanStr(payload.prompt, 1200);
    if (!prompt) throw createHttpError(400, '执行指令内容不能为空');

    const cronCheck = validateCronExpression(payload.cron || '0 9 * * *');
    if (!cronCheck.valid) throw createHttpError(400, cronCheck.error);

    const targetAgentId = cleanStr(payload.targetAgentId, 80);
    const matchedAgent = agents.find((a) => a.id === targetAgentId);

    const item = {
      id: `sched-${crypto.randomBytes(4).toString('hex')}`,
      name,
      cron: cronCheck.normalized,
      prompt,
      targetAgentId: matchedAgent ? matchedAgent.id : targetAgentId || '',
      targetAgentName: matchedAgent ? matchedAgent.name : cleanStr(payload.targetAgentName, 64) || '自动调度',
      botId: cleanStr(payload.botId, 64),
      enabled: payload.enabled !== false,
      runCount: 0,
      lastRunAt: null,
      lastStatus: 'idle',
      lastTaskId: null,
      createdAt: new Date().toISOString(),
    };

    this.state.schedules.unshift(item);
    await this.persist();
    return { ok: true, schedule: { ...item, humanLabel: describeCronZh(item.cron) } };
  }

  async update(scheduleId, patch = {}, { agents = [] } = {}) {
    const item = this.state.schedules.find((s) => s.id === scheduleId);
    if (!item) throw createHttpError(404, `未找到定时任务: ${scheduleId}`);

    if (patch.name !== undefined) {
      const n = cleanStr(patch.name, 80);
      if (!n) throw createHttpError(400, '定时任务名称不能为空');
      item.name = n;
    }
    if (patch.prompt !== undefined) {
      const p = cleanStr(patch.prompt, 1200);
      if (!p) throw createHttpError(400, '执行指令内容不能为空');
      item.prompt = p;
    }
    if (patch.cron !== undefined) {
      const cronCheck = validateCronExpression(patch.cron);
      if (!cronCheck.valid) throw createHttpError(400, cronCheck.error);
      item.cron = cronCheck.normalized;
    }
    if (patch.targetAgentId !== undefined) {
      const tid = cleanStr(patch.targetAgentId, 80);
      const matched = agents.find((a) => a.id === tid);
      item.targetAgentId = tid;
      item.targetAgentName = matched ? matched.name : (tid ? tid : '自动调度');
    }
    if (patch.botId !== undefined) {
      item.botId = cleanStr(patch.botId, 64);
    }
    if (patch.enabled !== undefined) {
      item.enabled = Boolean(patch.enabled);
    }

    await this.persist();
    return { ok: true, schedule: { ...item, humanLabel: describeCronZh(item.cron) } };
  }

  async delete(scheduleId) {
    const idx = this.state.schedules.findIndex((s) => s.id === scheduleId);
    if (idx === -1) throw createHttpError(404, `未找到定时任务: ${scheduleId}`);
    const [removed] = this.state.schedules.splice(idx, 1);
    await this.persist();
    return { ok: true, id: removed.id };
  }

  async runNow(scheduleId, { a2aOrchestrator, actor = 'schedule' } = {}) {
    const item = this.state.schedules.find((s) => s.id === scheduleId);
    if (!item) throw createHttpError(404, `未找到定时任务: ${scheduleId}`);
    if (!a2aOrchestrator) throw createHttpError(500, 'A2A 调度引擎未初始化');

    const task = await a2aOrchestrator.dispatchTask(
      {
        prompt: `[定时任务 · ${item.name}] ${item.prompt}`,
        targetAgentId: item.targetAgentId || undefined,
        contextId: `cron:${item.id}`,
      },
      { actor: `cron:${actor}` },
    );

    item.runCount = (item.runCount || 0) + 1;
    item.lastRunAt = new Date().toISOString();
    item.lastStatus = task.state || 'completed';
    item.lastTaskId = task.id;
    await this.persist();

    return {
      ok: true,
      schedule: { ...item, humanLabel: describeCronZh(item.cron) },
      task,
    };
  }
}
