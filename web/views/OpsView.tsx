import React from 'react';
import {
  Archive,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Play,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  AuditEntry,
  ConfigStudioResponse,
  IncidentItem,
  RunbookExecution,
  RunbooksResponse,
  SnapshotResponse,
  TimerItem,
} from '../types';
import {
  copyToClipboard,
  executeTimerAction,
  fetchConfigStudio,
  fetchPrometheusMetrics,
  fetchRunbooks,
  runOpsAction,
  runRunbook,
  validateConfigStudio,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import {
  auditEntriesToCsv,
  filterAuditEntries,
  type AuditOutcomeFilter,
} from '../lib/module-helpers';
import { ModuleFrame } from '../modules/ModuleFrame';
import { formatDateTime, statusLabel } from '../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  type ConfirmModalState,
} from '../components/ui';

const AUDIT_OUTCOME_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'ok', label: '成功' },
  { value: 'fail', label: '失败' },
] as const;

const OPS_TABS = [
  { value: 'tasks', label: '巡检与定时任务' },
  { value: 'runbooks', label: 'Runbook 自愈预案' },
  { value: 'studio', label: '配置中心与 RBAC' },
] as const;

type OpsTab = (typeof OPS_TABS)[number]['value'];

export function OpsView({
  snapshot,
  incidents,
  audit,
  readOnly,
  onRefresh,
  onRefreshOps,
  onToast,
  onConfirm,
}: {
  snapshot: SnapshotResponse | null;
  incidents: IncidentItem[];
  audit: AuditEntry[];
  readOnly: boolean;
  onRefresh: () => Promise<void>;
  onRefreshOps: () => Promise<void>;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const [tab, setTab] = React.useState<OpsTab>('tasks');
  const [opsBusy, setOpsBusy] = React.useState<'health-check' | 'backup' | null>(null);
  const [opsOutput, setOpsOutput] = React.useState('');

  // Runbooks state
  const [runbooksState, setRunbooksState] = React.useState<RunbooksResponse | null>(null);
  const [runningRbId, setRunningRbId] = React.useState<string | null>(null);
  const [latestExecution, setLatestExecution] = React.useState<RunbookExecution | null>(null);

  // Audit multi-dimensional filter state
  const [auditQuery, setAuditQuery] = React.useState('');
  const [auditOutcome, setAuditOutcome] = React.useState<AuditOutcomeFilter>('all');

  // Config Studio & Prometheus state
  const [studio, setStudio] = React.useState<ConfigStudioResponse | null>(null);
  const [configDraft, setConfigDraft] = React.useState('');
  const [validationResult, setValidationResult] = React.useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [validating, setValidating] = React.useState(false);
  const [promText, setPromText] = React.useState('');
  const [copiedKey, setCopiedKey] = React.useState('');

  const timers: TimerItem[] = snapshot?.services?.timers || snapshot?.timers || [];

  const filteredAudit = React.useMemo(
    () => filterAuditEntries(audit, { query: auditQuery, outcome: auditOutcome }),
    [audit, auditQuery, auditOutcome],
  );

  const handleExportAuditCsv = async () => {
    if (filteredAudit.length === 0) {
      onToast('当前没有可导出的审计记录', 'info');
      return;
    }
    const csv = auditEntriesToCsv(filteredAudit);
    try {
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ops-console-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast(`已导出 ${filteredAudit.length} 条审计记录 CSV`, 'ok');
    } catch {
      const ok = await copyToClipboard(csv);
      onToast(ok ? '已复制审计 CSV 到剪贴板' : '导出失败', ok ? 'ok' : 'err');
    }
  };

  const loadRunbooks = React.useCallback(async () => {
    try {
      const res = await fetchRunbooks();
      setRunbooksState(res);
    } catch {
      // Non-blocking
    }
  }, []);

  const loadStudio = React.useCallback(async () => {
    try {
      const [cfgRes, promRes] = await Promise.all([
        fetchConfigStudio(),
        fetchPrometheusMetrics().catch(() => ''),
      ]);
      setStudio(cfgRes);
      setConfigDraft(JSON.stringify(cfgRes.config, null, 2));
      setPromText(promRes);
    } catch {
      // Non-blocking
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'runbooks') {
      void loadRunbooks();
    } else if (tab === 'studio') {
      void loadStudio();
    }
  }, [tab, loadRunbooks, loadStudio]);

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      onToast('已复制到剪贴板', 'ok');
      window.setTimeout(() => setCopiedKey(''), 1800);
    }
  };

  const handleRunOps = (action: 'health-check' | 'backup') => {
    if (readOnly) {
      onToast('只读模式已禁用运维命令执行', 'err');
      return;
    }
    const label = action === 'health-check' ? '全栈健康巡检' : '配置与状态快照备份';
    onConfirm({
      open: true,
      title: `执行运维任务：${label}`,
      description: `确认在控制面主机执行受限白名单任务「${label}」？执行记录将记入审计日志。`,
      confirmLabel: '确认执行',
      onConfirm: async () => {
        setOpsBusy(action);
        try {
          const res = await runOpsAction(action);
          setOpsOutput(res.output || res.message || `${label} 已完成。`);
          onToast(`${label} 执行完成`, 'ok');
          await Promise.all([onRefresh(), onRefreshOps()]);
        } catch (err) {
          onToast(`${label} 失败：${(err as Error).message}`, 'err');
        } finally {
          setOpsBusy(null);
        }
      },
    });
  };

  const handleTimerAction = (timer: TimerItem, action: string) => {
    if (!action) return;
    if (readOnly) {
      onToast('只读模式已禁用定时器操作', 'err');
      return;
    }
    onConfirm({
      open: true,
      title: `定时器操作：${timer.name || timer.unit}`,
      description: `确认对定时任务 ${timer.unit} 执行 ${action} 操作？`,
      confirmLabel: '确认执行',
      danger: action === 'stop' || action === 'disable',
      onConfirm: async () => {
        try {
          await executeTimerAction(timer.unit, action);
          onToast(`定时器 ${timer.unit} 已执行 ${action}`, 'ok');
          await Promise.all([onRefresh(), onRefreshOps()]);
        } catch (err) {
          onToast(`操作失败：${(err as Error).message}`, 'err');
        }
      },
    });
  };

  const handleTriggerRunbook = (rbId: string, rbName: string) => {
    if (readOnly) {
      onToast('只读模式已禁用 Runbook 执行', 'err');
      return;
    }
    onConfirm({
      open: true,
      title: `执行 Runbook：${rbName}`,
      description: '将按编排顺序依次执行白名单诊断与恢复动作，受每小时自动熔断次数约束，并记录完整审计轨迹。',
      confirmLabel: '确认执行预案',
      onConfirm: async () => {
        setRunningRbId(rbId);
        try {
          const res = await runRunbook(rbId);
          setLatestExecution(res.run);
          onToast(`Runbook「${rbName}」执行${res.run.ok ? '成功' : '部分异常'}`, res.run.ok ? 'ok' : 'err');
          await Promise.all([loadRunbooks(), onRefreshOps(), onRefresh()]);
        } catch (err) {
          onToast(`Runbook 执行失败：${(err as Error).message}`, 'err');
        } finally {
          setRunningRbId(null);
        }
      },
    });
  };

  const handleValidateConfig = async () => {
    setValidating(true);
    try {
      const res = await validateConfigStudio(configDraft);
      setValidationResult({ valid: res.valid, errors: res.errors || [] });
      onToast(res.valid ? '配置 Schema 校验通过' : `发现 ${res.errors.length} 项配置问题`, res.valid ? 'ok' : 'err');
    } catch (err) {
      onToast(`校验请求失败：${(err as Error).message}`, 'err');
    } finally {
      setValidating(false);
    }
  };

  const allIncidents = incidents.length > 0 ? incidents : snapshot?.incidents || [];

  return (
    <ModuleFrame
      title="运维、Runbook 与配置治理"
      description="白名单巡检备份、受控自愈预案 (Runbooks)、配置 Schema 校验、RBAC 权限态势与 Prometheus 指标导出。"
      actions={
        <SegmentedFilter
          value={tab}
          onChange={setTab}
          options={OPS_TABS}
          ariaLabel="运维子视图切换"
        />
      }
    >

      {tab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="md"
              disabled={opsBusy !== null || readOnly}
              onClick={() => handleRunOps('health-check')}
            >
              <ShieldCheck className="size-4 text-[var(--accent)]" strokeWidth={1.75} />
              {opsBusy === 'health-check' ? '巡检中...' : '执行全栈健康巡检'}
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={opsBusy !== null || readOnly}
              onClick={() => handleRunOps('backup')}
            >
              <Archive className="size-4" strokeWidth={1.75} />
              {opsBusy === 'backup' ? '备份中...' : '触发配置备份'}
            </Button>
          </div>

          {opsOutput && (
            <Panel
              title="运维命令输出"
              actions={
                <Button variant="ghost" size="sm" onClick={() => setOpsOutput('')}>
                  收起
                </Button>
              }
            >
              <pre className="m-0 rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-4 font-mono text-[12px] overflow-x-auto whitespace-pre-wrap max-h-[260px]">
                {opsOutput}
              </pre>
            </Panel>
          )}

          <Panel
            title="systemd 定时任务"
            description="自动化备份、索引维护与健康检查计划任务状态。"
            bodyClassName="p-0"
          >
            {timers.length === 0 ? (
              <EmptyState message="尚未配置受管 systemd 定时任务。" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                      <th className="py-2.5 pl-5 sm:pl-6 pr-3">定时单元</th>
                      <th className="py-2.5 px-3">状态</th>
                      <th className="py-2.5 px-3">下次触发</th>
                      <th className="py-2.5 px-3">上次运行</th>
                      <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">控制</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {timers.map((t) => (
                      <tr key={t.unit} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out">
                        <td className="py-2.5 pl-5 sm:pl-6 pr-3 max-w-[260px]">
                          <div className="font-medium text-[var(--ink)] truncate">{t.name || t.unit}</div>
                          <div className="font-mono text-[12px] text-[var(--ink-subtle)] truncate">{t.unit}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <StatusIndicator status={t.status || t.activeState} />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                          {t.nextElapse || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                          {t.lastTrigger || '-'}
                        </td>
                        <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap">
                          <select
                            defaultValue=""
                            disabled={readOnly}
                            aria-label={`操作定时器 ${t.unit}`}
                            onChange={(e) => {
                              const val = e.target.value;
                              e.target.value = '';
                              if (val) handleTimerAction(t, val);
                            }}
                            className={cn(
                              'ui-select h-8 pl-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[12.5px] text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--border-strong)] focus:border-[var(--accent)] disabled:opacity-45 cursor-pointer',
                              FOCUS_RING,
                            )}
                          >
                            <option value="" disabled>
                              操作
                            </option>
                            <option value="start">启动</option>
                            <option value="stop">停止</option>
                            <option value="enable">启用</option>
                            <option value="disable">禁用</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Panel
              title="持久化状态变更事件"
              description="记录全栈服务与连接器的健康度漂移历史。"
            >
              {allIncidents.length === 0 ? (
                <EmptyState message="暂无持久化状态变更记录。" />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {allIncidents.slice(0, 12).map((inc, idx) => {
                    const actor = inc.node || inc.component || inc.target || inc.entityKey || '系统';
                    const fromS = inc.fromState || inc.fromStatus || inc.from;
                    const toS = inc.toState || inc.toStatus || inc.to;
                    const transition = fromS || toS ? `${statusLabel(fromS)} → ${statusLabel(toS)}` : '';
                    const detail = inc.detail || inc.message || inc.summary || '';
                    return (
                      <li
                        key={inc.id || `${inc.ts}-${idx}`}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-[13px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                            <span className="font-medium text-[var(--ink)] truncate max-w-[180px]" title={actor}>
                              {actor}
                            </span>
                            {transition && (
                              <span className="font-mono text-[12px] text-[var(--ink-muted)] whitespace-nowrap">
                                {transition}
                              </span>
                            )}
                          </div>
                          {detail && (
                            <p className="mt-0.5 text-[12px] text-[var(--ink-subtle)] truncate" title={detail}>
                              {detail}
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                          {formatDateTime(inc.ts || inc.timestamp)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              title="不可变操作审计轨迹"
              description={`所有写操作、探针登记与命令触发均留痕可溯，当前匹配 ${filteredAudit.length}/${audit.length} 条。`}
              bodyClassName="p-0"
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={filteredAudit.length === 0}
                  onClick={() => void handleExportAuditCsv()}
                  data-testid="audit-export-csv-btn"
                >
                  <Download className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                  导出 CSV
                </Button>
              }
            >
              <div className="px-5 sm:px-6 py-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-[160px]">
                  <Search
                    className="size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.75}
                  />
                  <input
                    type="search"
                    value={auditQuery}
                    onChange={(e) => setAuditQuery(e.target.value)}
                    placeholder="过滤操作、目标或执行人..."
                    aria-label="过滤审计记录"
                    data-testid="audit-search-input"
                    className={cn('w-full h-8 pl-8 pr-2.5 sm:text-[12.5px]', inputBaseClass)}
                  />
                </div>
                <SegmentedFilter
                  value={auditOutcome}
                  onChange={setAuditOutcome}
                  options={AUDIT_OUTCOME_OPTIONS}
                  ariaLabel="按结果筛选审计日志"
                />
              </div>
              {filteredAudit.length === 0 ? (
                <EmptyState
                  message={audit.length === 0 ? '暂无操作审计记录。' : '当前筛选条件下无匹配审计记录。'}
                  action={
                    auditQuery || auditOutcome !== 'all'
                      ? {
                          label: '重置筛选',
                          onClick: () => {
                            setAuditQuery('');
                            setAuditOutcome('all');
                          },
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" data-testid="audit-log-table">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                        <th className="py-2.5 pl-5 sm:pl-6 pr-3">时间</th>
                        <th className="py-2.5 px-3">操作与目标</th>
                        <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">结果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                      {filteredAudit.slice(0, 20).map((item, idx) => (
                        <tr key={`${item.ts || idx}-${idx}`} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out">
                          <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
                            {formatDateTime(item.ts || item.timestamp)}
                          </td>
                          <td className="py-2.5 px-3 max-w-[240px] truncate">
                            <span className="font-medium text-[var(--ink)]">{item.action || '-'}</span>
                            {item.target && (
                              <span className="ml-1.5 font-mono text-[12px] text-[var(--ink-muted)]">
                                {item.target}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap">
                            <StatusIndicator
                              status={item.ok === false || item.status === 'error' ? 'failed' : 'healthy'}
                              label={item.ok === false ? '失败' : item.result || '成功'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === 'runbooks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {(runbooksState?.runbooks || []).map((rb) => {
              const quotaUsed = rb.recentRunsLastHour ?? 0;
              const quotaFull = quotaUsed >= rb.maxAutoRunsPerHour;
              return (
                <Panel
                  key={rb.id}
                  title={rb.name}
                  description={rb.description}
                  className="flex flex-col"
                  bodyClassName="flex-1 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[12px] text-[var(--ink-subtle)] font-mono tabular-nums">
                      <span>{rb.approvalMode === 'auto-guarded' ? '受限自动保护' : '人工审批触发'}</span>
                      <span>
                        1h 配额 {quotaUsed}/{rb.maxAutoRunsPerHour}
                      </span>
                    </div>
                    <ol className="space-y-1.5 text-[12.5px] text-[var(--ink-muted)] list-decimal pl-4">
                      {rb.steps.map((s) => (
                        <li key={s.id}>{s.label}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">{rb.id}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={readOnly || runningRbId !== null || quotaFull}
                      onClick={() => handleTriggerRunbook(rb.id, rb.name)}
                      data-testid={`run-runbook-${rb.id}`}
                    >
                      <Play className="size-3.5 translate-x-[1px]" strokeWidth={1.75} />
                      {runningRbId === rb.id ? '执行中...' : quotaFull ? '已达熔断上限' : '执行预案'}
                    </Button>
                  </div>
                </Panel>
              );
            })}
          </div>

          {latestExecution && (
            <Panel
              title={`执行追踪：${latestExecution.runbookName}`}
              description={`执行 ID ${latestExecution.id} · 开始于 ${formatDateTime(latestExecution.startedAt)} · 耗时 ${latestExecution.durationMs}ms · 触发人 ${latestExecution.actor}`}
              actions={
                <div className="flex items-center gap-3">
                  <StatusIndicator
                    status={latestExecution.ok ? 'healthy' : 'failed'}
                    label={latestExecution.ok ? '全部步骤通过' : '存在失败步骤'}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setLatestExecution(null)}>
                    收起
                  </Button>
                </div>
              }
            >
              <ul className="divide-y divide-[var(--border-subtle)]" data-testid="runbook-trace">
                {latestExecution.steps.map((step) => (
                  <li key={step.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-[13px]">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {step.ok ? (
                        <CheckCircle2 className="size-4 text-[var(--ok)] shrink-0 mt-0.5" strokeWidth={1.75} />
                      ) : (
                        <XCircle className="size-4 text-[var(--err)] shrink-0 mt-0.5" strokeWidth={1.75} />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--ink)]">{step.label}</div>
                        <div className="font-mono text-[12px] text-[var(--ink-subtle)]">{step.detail}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                      {step.durationMs}ms
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Runbook 历史执行记录"
            description="点击任意历史记录行可在上方展开完整的逐步执行追踪与耗时明细。"
            bodyClassName="p-0"
          >
            {!runbooksState || runbooksState.runs.length === 0 ? (
              <EmptyState message="尚未执行过任何自愈 Runbook 预案。" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                      <th className="py-2.5 pl-5 sm:pl-6 pr-3">执行时间</th>
                      <th className="py-2.5 px-3">预案名称</th>
                      <th className="py-2.5 px-3">状态</th>
                      <th className="py-2.5 px-3 text-right">步骤</th>
                      <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">耗时</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {runbooksState.runs.map((run) => {
                      const isInspected = latestExecution?.id === run.id;
                      return (
                        <tr
                          key={run.id}
                          onClick={() => setLatestExecution(run)}
                          data-testid={`runbook-history-row-${run.id}`}
                          className={cn(
                            'cursor-pointer transition-colors duration-150 ease-out',
                            isInspected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)]',
                          )}
                        >
                          <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
                            {formatDateTime(run.startedAt)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[var(--ink)]">{run.runbookName}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <StatusIndicator status={run.ok ? 'healthy' : 'failed'} label={run.ok ? '通过' : '异常'} />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums">
                            {run.steps.filter((s) => s.ok).length}/{run.steps.length}
                          </td>
                          <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
                            {run.durationMs}ms
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === 'studio' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <Panel
              className="lg:col-span-7"
              title="脱敏配置快照与 Schema 预检 (Dry-Run)"
              description="所有密钥字段已在服务端自动掩码脱敏。编辑 JSON 后可在线执行配置 Schema 校验。"
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  disabled={validating || !configDraft.trim()}
                  onClick={() => void handleValidateConfig()}
                  data-testid="validate-config-btn"
                >
                  {validating ? '校验中...' : '校验配置 Schema'}
                </Button>
              }
            >
              <textarea
                value={configDraft}
                onChange={(e) => setConfigDraft(e.target.value)}
                rows={14}
                spellCheck={false}
                aria-label="配置 JSON 编辑器"
                className={cn(
                  'w-full p-3.5 font-mono sm:text-[12px] leading-relaxed resize-y',
                  inputBaseClass,
                )}
              />
              {validationResult && (
                <div
                  data-testid="config-validation-result"
                  className={cn(
                    'mt-3 rounded-lg px-3.5 py-2.5 text-[12.5px] flex items-start gap-2',
                    validationResult.valid
                      ? 'bg-[var(--ok)]/[0.08] text-[var(--ok)]'
                      : 'bg-[var(--err)]/[0.08] text-[var(--err)]',
                  )}
                >
                  {validationResult.valid ? (
                    <>
                      <CheckCircle2 className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                      <span className="font-medium">Schema 预检通过：未发现结构或端口范围错误。</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                      <ul className="list-disc pl-4 space-y-1">
                        {validationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </Panel>

            <div className="lg:col-span-5 space-y-6">
              <Panel
                title="RBAC 角色与 SSO 鉴权态势"
                description="细粒度角色权限矩阵与零信任代理头接入能力。"
              >
                {studio?.config?.rbacPosture ? (
                  <div className="space-y-4">
                    <div className="text-[12.5px] text-[var(--ink-muted)]">
                      当前会话主体：
                      <span className="ml-1.5 font-mono font-medium text-[var(--ink)]">
                        {studio.config.rbacPosture.currentActor}
                      </span>
                    </div>
                    <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                      {studio.config.rbacPosture.roles.map((r) => (
                        <li key={r.role} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-[var(--ink)]">{r.role}</span>
                            <StatusIndicator
                              status={r.active ? 'healthy' : 'standby'}
                              label={r.active ? '已生效' : '可配置'}
                            />
                          </div>
                          <div className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                            {r.permissions.join(' · ')}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-[var(--border-subtle)] text-[12px] text-[var(--ink-subtle)]">
                      支持前置鉴权：{studio.config.rbacPosture.ssoAdapters.join(' / ')}
                    </div>
                  </div>
                ) : (
                  <EmptyState message="正在加载 RBAC 配置..." />
                )}
              </Panel>

              <Panel
                title="最小权限 sudoers 模板"
                description="仅授予白名单 systemd 单元的 NOPASSWD 启停权限。"
                actions={
                  studio?.sudoersPreview ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleCopy('sudoers', studio.sudoersPreview)}
                    >
                      {copiedKey === 'sudoers' ? (
                        <Check className="size-3.5 text-[var(--ok)]" strokeWidth={1.75} />
                      ) : (
                        <Copy className="size-3.5" strokeWidth={1.75} />
                      )}
                      复制规则
                    </Button>
                  ) : undefined
                }
              >
                <pre className="m-0 rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-3.5 font-mono text-[11.5px] overflow-x-auto whitespace-pre-wrap">
                  {studio?.sudoersPreview || '暂无 system-scope 服务需要 sudoers 授权。'}
                </pre>
              </Panel>
            </div>
          </div>

          <Panel
            title="Prometheus / OpenMetrics 抓取端点"
            description="可直接被 Grafana Alloy / Prometheus 拉取的原生指标输出（GET /api/metrics）。"
            actions={
              promText ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleCopy('prom', promText)}
                >
                  {copiedKey === 'prom' ? (
                    <Check className="size-3.5 text-[var(--ok)]" strokeWidth={1.75} />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={1.75} />
                  )}
                  复制指标文本
                </Button>
              ) : undefined
            }
          >
            <pre
              data-testid="prometheus-preview"
              className="m-0 rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-4 font-mono text-[11.5px] overflow-x-auto whitespace-pre max-h-[240px]"
            >
              {promText || '正在抓取 /api/metrics ...'}
            </pre>
          </Panel>
        </div>
      )}
    </ModuleFrame>
  );
}
