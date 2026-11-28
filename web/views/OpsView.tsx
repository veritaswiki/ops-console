import React from 'react';
import {
  Archive,
  CheckCircle2,
  Download,
  GitBranch,
  History,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import type {
  AuditEntry,
  ConfigStudioResponse,
  HotReloadScope,
  IncidentItem,
  RunbookExecution,
  RunbooksResponse,
  SnapshotResponse,
  TimerItem,
  ToastHandler,
  UpdateCheckResponse,
  UpdateStatusResponse,
} from '../types';
import {
  applyIncrementalUpdate,
  checkForUpdates,
  copyToClipboard,
  executeTimerAction,
  fetchConfigStudio,
  fetchPrometheusMetrics,
  fetchRunbooks,
  fetchUpdateStatus,
  issueUpdateConfirmToken,
  rollbackUpdate,
  runOpsAction,
  runRunbook,
  triggerGracefulRestart,
  triggerHotReload,
  validateConfigStudio,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import {
  auditEntriesToCsv,
  filterAuditEntries,
  type AuditOutcomeFilter,
} from '../lib/module-helpers';
import {
  extractRollbackCandidates,
  listActiveLayers,
  UPDATE_LAYER_LABELS,
  UPDATE_STRATEGY_META,
} from '../lib/updates';
import { ModuleFrame } from '../modules/ModuleFrame';
import { formatDateTime, statusLabel } from '../utils/format';
import {
  Button,
  CopyAction,
  EmptyState,
  inputBaseClass,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  type ConfirmModalState,
} from '../components/ui';
import { SelfEvolutionSection } from '../components/SelfEvolutionSection';

const AUDIT_OUTCOME_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'ok', label: '成功' },
  { value: 'fail', label: '失败' },
] as const;

const OPS_TABS = [
  { value: 'tasks', label: '巡检与定时任务' },
  { value: 'runbooks', label: '自动修复预案' },
  { value: 'studio', label: '配置与权限' },
  { value: 'updates', label: '系统更新与热重载' },
] as const;

type OpsTab = (typeof OPS_TABS)[number]['value'];

export function OpsView({
  snapshot,
  incidents,
  audit,
  readOnly,
  activeTab,
  onTabChange,
  onRefresh,
  onRefreshOps,
  onToast,
  onConfirm,
}: {
  snapshot: SnapshotResponse | null;
  incidents: IncidentItem[];
  audit: AuditEntry[];
  readOnly: boolean;
  activeTab?: string | null;
  onTabChange?: (tab: OpsTab) => void;
  onRefresh: () => Promise<void>;
  onRefreshOps: () => Promise<void>;
  onToast: ToastHandler;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const normalizeOpsTab = (raw?: string | null): OpsTab =>
    raw === 'runbooks' || raw === 'studio' || raw === 'updates' ? raw : 'tasks';
  const [tab, setTabState] = React.useState<OpsTab>(() => normalizeOpsTab(activeTab));
  React.useEffect(() => {
    if (activeTab) {
      setTabState(normalizeOpsTab(activeTab));
    }
  }, [activeTab]);
  const setTab = (next: OpsTab) => {
    setTabState(next);
    onTabChange?.(next);
  };
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

  // Incremental Update & Hot Reload state
  const [updateStatus, setUpdateStatus] = React.useState<UpdateStatusResponse | null>(null);
  const [updateCheck, setUpdateCheck] = React.useState<UpdateCheckResponse | null>(null);
  const [updateBusy, setUpdateBusy] = React.useState<string | null>(null);
  const [rebuildFrontendOpt, setRebuildFrontendOpt] = React.useState(false);
  const [autoRestartOpt, setAutoRestartOpt] = React.useState(false);

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

  const loadUpdateStatus = React.useCallback(async () => {
    try {
      const res = await fetchUpdateStatus();
      setUpdateStatus(res);
      if (res.lastCheck) {
        setUpdateCheck(res.lastCheck);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  React.useEffect(() => {
    if (tab === 'runbooks') {
      void loadRunbooks();
    } else if (tab === 'studio') {
      void loadStudio();
    } else if (tab === 'updates') {
      void loadUpdateStatus();
    }
  }, [tab, loadRunbooks, loadStudio, loadUpdateStatus]);

  const handleCheckUpdates = async () => {
    setUpdateBusy('check');
    try {
      const res = await checkForUpdates({ fetchRemote: true });
      setUpdateCheck(res);
      await loadUpdateStatus();
      onToast(
        res.hasUpdate
          ? `发现 ${res.behind} 个新提交 · ${UPDATE_STRATEGY_META[res.plan.strategy].label}`
          : '当前已是最新提交，无需增量拉取',
        res.hasUpdate ? 'info' : 'ok',
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : '检查增量更新失败', 'err');
    } finally {
      setUpdateBusy(null);
    }
  };

  const handleHotReload = async (scopes: HotReloadScope[], label: string) => {
    if (guardReadOnly(readOnly, onToast, label)) return;
    setUpdateBusy(`reload:${scopes.join(',')}`);
    try {
      const res = await triggerHotReload({ scopes, force: scopes.includes('assets'), reason: 'manual' });
      await Promise.all([loadUpdateStatus(), onRefresh()]);
      onToast(`${label}完成（耗时 ${res.durationMs}ms）`, 'ok');
    } catch (err) {
      onToast(extractErrorMessage(err, `${label}失败`), 'err');
    } finally {
      setUpdateBusy(null);
    }
  };

  const handleApplyUpdate = () => {
    if (guardReadOnly(readOnly, onToast, '执行系统更新')) return;
    const strategyLabel = updateCheck?.plan
      ? UPDATE_STRATEGY_META[updateCheck.plan.strategy].label
      : '增量拉取并热更新';
    onConfirm({
      open: true,
      title: '确认更新系统版本？',
      description: `将从远端分支拉取最新代码并按「${strategyLabel}」方式生效。${autoRestartOpt ? '若包含后端变更，系统会自动平滑重启。' : ''}`,
      confirmLabel: '确认更新',
      danger: Boolean(updateCheck?.plan?.requiresRestart),
      onConfirm: async () => {
        setUpdateBusy('apply');
        try {
          let confirmToken = '';
          if (updateStatus?.requireCriticalConfirm) {
            const issued = await issueUpdateConfirmToken('apply');
            confirmToken = issued.confirmToken;
          }
          const res = await applyIncrementalUpdate({
            confirmToken,
            rebuildFrontend: rebuildFrontendOpt,
            autoRestart: autoRestartOpt,
          });
          await Promise.all([loadUpdateStatus(), onRefresh()]);
          onToast(
            res.status === 'up-to-date'
              ? '当前已是最新版本'
              : res.restartRequired
                ? '更新已拉取，重启后端服务后生效'
                : '系统更新已完成并无感生效',
            'ok',
          );
        } catch (err) {
          onToast(extractErrorMessage(err, '系统更新失败'), 'err');
        } finally {
          setUpdateBusy(null);
        }
      },
    });
  };

  const handleRollbackCommit = (commit: string) => {
    if (guardReadOnly(readOnly, onToast, '回滚系统版本')) return;
    const shortCommit = commit.slice(0, 8);
    onConfirm({
      open: true,
      title: `回滚系统至版本 ${shortCommit}？`,
      description: '回滚会将当前代码强制重置为该历史版本并重载前端与配置，请确认该版本稳定可用。',
      confirmLabel: '确认回滚',
      danger: true,
      requireToken: shortCommit,
      requireTokenLabel: '为防误操作，请输入目标版本号以确认回滚',
      onConfirm: async () => {
        setUpdateBusy(`rollback:${commit}`);
        try {
          let confirmToken = '';
          if (updateStatus?.requireCriticalConfirm) {
            const issued = await issueUpdateConfirmToken('rollback');
            confirmToken = issued.confirmToken;
          }
          const res = await rollbackUpdate({
            commit,
            confirmToken,
            autoRestart: autoRestartOpt,
          });
          await Promise.all([loadUpdateStatus(), onRefresh()]);
          onToast(
            res.restartRequired
              ? `已回滚至 ${res.toCommit.slice(0, 8)}，重启后端后完全生效`
              : `已回滚至 ${res.toCommit.slice(0, 8)} 并自动生效`,
            'ok',
          );
        } catch (err) {
          onToast(extractErrorMessage(err, '版本回滚失败'), 'err');
        } finally {
          setUpdateBusy(null);
        }
      },
    });
  };

  const handleGracefulRestart = () => {
    if (guardReadOnly(readOnly, onToast, '平滑重启后端')) return;
    onConfirm({
      open: true,
      title: '确认平滑重启控制台服务？',
      description: updateStatus?.supervised
        ? '当前受守护进程托管，关闭后会自动拉起新版本，页面将在几秒内自动恢复连接。'
        : '将向当前服务发起平滑重启；请确认系统已配置自动拉起（如 systemd 托管）。',
      confirmLabel: '立即重启',
      danger: true,
      onConfirm: async () => {
        setUpdateBusy('restart');
        try {
          let confirmToken = '';
          if (updateStatus?.requireCriticalConfirm) {
            const issued = await issueUpdateConfirmToken('restart');
            confirmToken = issued.confirmToken;
          }
          await triggerGracefulRestart({ confirmToken, reason: 'manual-ops-view' });
          onToast('已触发平滑重启，等待服务重新就绪…', 'info');
        } catch (err) {
          onToast(extractErrorMessage(err, '触发平滑重启失败'), 'err');
        } finally {
          setUpdateBusy(null);
        }
      },
    });
  };

  const executeOpsAction = async (action: 'health-check' | 'backup', label: string) => {
    setOpsBusy(action);
    try {
      const res = await runOpsAction(action);
      setOpsOutput(res.output || res.message || `${label}已完成。`);
      onToast(`${label}已完成`, 'ok');
      await Promise.all([onRefresh(), onRefreshOps()]);
    } catch (err) {
      onToast(extractErrorMessage(err, `${label}失败`), 'err');
    } finally {
      setOpsBusy(null);
    }
  };
  const handleRunOps = (action: 'health-check' | 'backup') => {
    const label = action === 'health-check' ? '全栈健康巡检' : '配置与状态快照备份';
    if (guardReadOnly(readOnly, onToast, `执行${label}`)) {
      return;
    }
    // Tier 0: health-check is read-only diagnostic — run immediately without modal interruption
    if (action === 'health-check') {
      void executeOpsAction('health-check', label);
      return;
    }
    onConfirm({
      open: true,
      title: `执行${label}？`,
      description: '将生成一份当前配置与运行状态的备份快照，操作记录会写入审计日志。',
      confirmLabel: '开始备份',
      onConfirm: () => executeOpsAction('backup', label),
    });
  };

  const handleTimerAction = (timer: TimerItem, action: string) => {
    if (!action) return;
    if (guardReadOnly(readOnly, onToast, '操作定时任务')) {
      return;
    }
    const timerActionLabel =
      action === 'start'
        ? '立即运行'
        : action === 'stop'
          ? '停止'
          : action === 'enable'
            ? '启用'
            : action === 'disable'
              ? '停用'
              : action;
    onConfirm({
      open: true,
      title: `${timerActionLabel}定时任务：${timer.name || timer.unit}`,
      description: `确认对定时任务「${timer.name || timer.unit}」执行${timerActionLabel}操作？`,
      confirmLabel: `确认${timerActionLabel}`,
      danger: action === 'stop' || action === 'disable',
      onConfirm: async () => {
        try {
          await executeTimerAction(timer.unit, action);
          onToast(`定时任务「${timer.name || timer.unit}」已${timerActionLabel}`, 'ok');
          await Promise.all([onRefresh(), onRefreshOps()]);
        } catch (err) {
          onToast(extractErrorMessage(err, '操作定时任务失败'), 'err');
        }
      },
    });
  };

  const handleTriggerRunbook = (rbId: string, rbName: string) => {
    if (guardReadOnly(readOnly, onToast, '执行自动修复预案')) {
      return;
    }
    onConfirm({
      open: true,
      title: `执行预案：${rbName}`,
      description: '将按顺序运行内置诊断与恢复步骤，受安全频率上限保护并全程记录审计日志。',
      confirmLabel: '开始执行',
      onConfirm: async () => {
        setRunningRbId(rbId);
        try {
          const res = await runRunbook(rbId);
          setLatestExecution(res.run);
          onToast(`预案「${rbName}」执行${res.run.ok ? '成功' : '部分异常'}`, res.run.ok ? 'ok' : 'err');
          await Promise.all([loadRunbooks(), onRefreshOps(), onRefresh()]);
        } catch (err) {
          onToast(extractErrorMessage(err, '执行预案失败'), 'err');
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
                    <CopyAction
                      variant="button"
                      size="sm"
                      text={studio.sudoersPreview}
                      label="复制规则"
                      copiedLabel="已复制"
                      onCopied={() => onToast('已复制 sudoers 规则到剪贴板', 'ok')}
                      onError={() => onToast('复制失败，请检查剪贴板权限', 'err')}
                    />
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
                <CopyAction
                  variant="button"
                  size="sm"
                  text={promText}
                  label="复制指标文本"
                  copiedLabel="已复制"
                  onCopied={() => onToast('已复制指标文本到剪贴板', 'ok')}
                  onError={() => onToast('复制失败，请检查剪贴板权限', 'err')}
                />
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

      {tab === 'updates' && (
        <div className="space-y-6" data-testid="ops-updates-panel">
          <Panel
            title="实时热重载与运行态"
            description="配置、外部插件、热切模块、声明式 Agent 与前端资源支持零停机热更新；修改文件后由内置 Watcher 自动触发并经 SSE 推送客户端。"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={readOnly || updateBusy !== null}
                  onClick={() => void handleHotReload(['config'], '配置热重载')}
                >
                  <Zap className="size-3.5" strokeWidth={1.75} />
                  重载配置
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={readOnly || updateBusy !== null}
                  onClick={() => void handleHotReload(['plugins'], '插件热重载')}
                >
                  <Sparkles className="size-3.5" strokeWidth={1.75} />
                  重载插件
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={readOnly || updateBusy !== null}
                  onClick={() => void handleHotReload(['assets'], '前端资源缓存刷新')}
                >
                  <RefreshCw className="size-3.5" strokeWidth={1.75} />
                  刷新静态资源
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={readOnly || updateBusy !== null}
                  onClick={() => void handleHotReload(['module-hot-swap'], 'Agent 模块热切')}
                >
                  <Zap className="size-3.5" strokeWidth={1.75} />
                  热切模块
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={readOnly || updateBusy !== null}
                  onClick={() => void handleHotReload(['agent-declarative'], '声明式 Agent 同步')}
                >
                  <Sparkles className="size-3.5" strokeWidth={1.75} />
                  同步声明式
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={readOnly || updateBusy !== null}
                  onClick={() =>
                    void handleHotReload(
                      ['config', 'plugins', 'assets', 'agent-declarative', 'module-hot-swap'],
                      '全量零停机热重载',
                    )}
                >
                  <Zap className="size-3.5" strokeWidth={1.75} />
                  一键全量热重载
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[12.5px]">
              <div className="space-y-1">
                <div className="text-[var(--ink-muted)]">当前提交 / 分支</div>
                <div className="font-mono font-medium tabular-nums text-[var(--ink)] flex items-center gap-1.5">
                  <GitBranch className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                  <span>{updateStatus?.git.shortCommit || 'non-git'}</span>
                  <span className="text-[var(--ink-muted)]">·</span>
                  <span>{updateStatus?.git.branch || updateStatus?.branch || 'main'}</span>
                </div>
                <div className="text-[11.5px] text-[var(--ink-muted)]">
                  工作树：{updateStatus?.git.dirty ? `有 ${updateStatus.git.dirtyCount} 处未提交修改` : '干净可增量更新'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[var(--ink-muted)]">静态资源版本</div>
                <div className="font-mono font-medium tabular-nums text-[var(--ink)]">
                  {updateStatus?.assetsRevision || '—'}
                </div>
                <div className="text-[11.5px] text-[var(--ink-muted)] tabular-nums">
                  文件数 {updateStatus?.assetsFileCount ?? 0} · 累计热载 {updateStatus?.reloadCount ?? 0} 次
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[var(--ink-muted)]">文件监听 Watcher</div>
                <div className="font-mono text-[12px] text-[var(--ink)] tabular-nums">
                  配置 {updateStatus?.watchers.config ? 'ON' : 'OFF'} · 插件 {updateStatus?.watchers.plugins ? 'ON' : 'OFF'} · 资源 {updateStatus?.watchers.public ? 'ON' : 'OFF'}
                </div>
                <div className="font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums">
                  模块 {updateStatus?.watchers.modules ? 'ON' : 'OFF'} · 声明式 {updateStatus?.watchers.agents ? 'ON' : 'OFF'} · 防抖 {updateStatus?.watchers.debounceMs ?? 500}ms ·{' '}
                  {updateStatus?.supervised ? 'Supervised' : 'Standard'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[var(--ink-muted)]">重启状态</div>
                <StatusIndicator
                  status={updateStatus?.pendingRestart ? 'degraded' : 'healthy'}
                  label={updateStatus?.pendingRestart ? '待平滑重启' : '运行态同步'}
                />
                <div className="text-[11.5px] text-[var(--ink-muted)] truncate">
                  {updateStatus?.pendingRestartReason || '无需重启，所有热重载层已对齐'}
                </div>
              </div>
            </div>

            {updateStatus?.pendingRestart && updateStatus.allowSelfRestart && (
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <span className="text-[var(--warn)]">{updateStatus.pendingRestartReason}</span>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={readOnly || updateBusy !== null}
                  onClick={handleGracefulRestart}
                >
                  <RotateCcw className="size-3.5" strokeWidth={1.75} />
                  立即平滑重启后端
                </Button>
              </div>
            )}
          </Panel>

          <Panel
            title="增量更新引擎（Git Fast-Forward + 分层执行）"
            description="自动识别前端、外部插件、声明式 Agent 规则、热切模块与后端核心差异，仅执行必要构建与热重载，避免整包停机部署。"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={updateBusy !== null || !updateStatus?.updatesEnabled}
                  onClick={() => void handleCheckUpdates()}
                >
                  <RefreshCw
                    className={cn('size-3.5', updateBusy === 'check' && 'animate-spin')}
                    strokeWidth={1.75}
                  />
                  检查增量更新
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={
                    readOnly
                    || updateBusy !== null
                    || !updateStatus?.updatesEnabled
                    || Boolean(updateCheck && !updateCheck.hasUpdate && !updateStatus?.demo)
                    || Boolean(updateCheck?.dirty)
                    || Boolean(updateCheck?.diverged)
                  }
                  onClick={handleApplyUpdate}
                >
                  <Download className="size-3.5" strokeWidth={1.75} />
                  执行增量更新
                </Button>
              </div>
            }
          >
            <div className="flex flex-wrap items-center gap-6 pb-3 mb-4 border-b border-[var(--border)] text-[12px] text-[var(--ink-muted)]">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rebuildFrontendOpt}
                  onChange={(e) => setRebuildFrontendOpt(e.target.checked)}
                />
                <span>强制增量重编前端（npm run build）</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRestartOpt}
                  onChange={(e) => setAutoRestartOpt(e.target.checked)}
                />
                <span>涉及后端核心时自动平滑重启</span>
              </label>
              <span className="font-mono tabular-nums">
                远端目标：{updateStatus?.remote || 'origin'}/{updateStatus?.branch || 'main'}
              </span>
            </div>

            {!updateCheck ? (
              <EmptyState
                title="尚未检测远端差异"
                message="点击右上角「检查增量更新」，按文件层级预览本次更新策略（零停机热重载 / 模块热切 / 平滑重启）。"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <div className="flex items-center gap-2">
                    <StatusIndicator
                      status={
                        UPDATE_STRATEGY_META[updateCheck.plan.strategy].tone === 'ok'
                          ? 'healthy'
                          : UPDATE_STRATEGY_META[updateCheck.plan.strategy].tone === 'warn'
                            ? 'degraded'
                            : 'idle'
                      }
                      label={UPDATE_STRATEGY_META[updateCheck.plan.strategy].label}
                    />
                    <span className="text-[var(--ink-muted)]">·</span>
                    <span className="font-mono text-[12px] tabular-nums text-[var(--ink-muted)]">
                      落后 {updateCheck.behind} · 领先 {updateCheck.ahead} · 变更文件 {updateCheck.plan.totalFiles}
                    </span>
                  </div>
                  <span className="font-mono text-[11.5px] tabular-nums text-[var(--ink-muted)]">
                    {updateCheck.shortCommit || 'n/a'} → {updateCheck.shortRemoteCommit || 'n/a'}
                  </span>
                </div>

                <p className="m-0 text-[12.5px] text-[var(--ink-muted)]">
                  {UPDATE_STRATEGY_META[updateCheck.plan.strategy].detail}
                </p>

                {listActiveLayers(updateCheck.plan).length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-mono tabular-nums text-[var(--ink)]">
                    {listActiveLayers(updateCheck.plan).map((item) => (
                      <span key={item.layer}>
                        {item.label} {item.count}
                      </span>
                    ))}
                  </div>
                )}

                {updateCheck.changedFiles.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="divide-y divide-[var(--border)] max-h-[220px] overflow-y-auto font-mono text-[11.5px]">
                      {updateCheck.changedFiles.slice(0, 40).map((file) => (
                        <div
                          key={`${file.status}-${file.path}`}
                          className="px-3 py-1.5 flex items-center justify-between gap-3"
                        >
                          <span className="truncate text-[var(--ink)]">
                            <span className="text-[var(--ink-muted)] mr-2">{file.status}</span>
                            {file.path}
                          </span>
                          <span className="shrink-0 text-[var(--ink-muted)]">
                            {UPDATE_LAYER_LABELS[file.layer] || file.layer}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>

          <SelfEvolutionSection readOnly={readOnly} onToast={onToast} />

          <Panel
            title="更新历史与原子回滚"
            description="记录每次热重载、增量拉取、平滑重启与回滚操作；支持按历史提交 SHA 一键回滚并自动触发热重载。"
          >
            {(() => {
              const rollbackCandidates = extractRollbackCandidates(
                updateStatus?.history || [],
                updateStatus?.git.commit,
              );
              return (
                <div className="space-y-4">
                  {rollbackCandidates.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[var(--border)] text-[12px]">
                      <span className="text-[var(--ink-muted)] inline-flex items-center gap-1">
                        <History className="size-3.5" strokeWidth={1.75} />
                        可回滚版本：
                      </span>
                      {rollbackCandidates.map((cand) => (
                        <Button
                          key={cand.commit}
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || updateBusy !== null}
                          onClick={() => handleRollbackCommit(cand.commit)}
                        >
                          <RotateCcw className="size-3" strokeWidth={1.75} />
                          <span className="font-mono tabular-nums">{cand.shortCommit}</span>
                        </Button>
                      ))}
                    </div>
                  )}

                  {!updateStatus?.history?.length ? (
                    <EmptyState
                      title="暂无更新记录"
                      message="执行热重载或增量更新后将自动写入审计历史并持久化至 data/update-history.json。"
                    />
                  ) : (
                    <div className="divide-y divide-[var(--border)] text-[12px]">
                      {updateStatus.history.slice(0, 12).map((item) => (
                        <div
                          key={item.id}
                          className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-medium text-[var(--ink)]">{item.kind}</span>
                            <span className="text-[var(--ink-muted)]">·</span>
                            <span className="text-[var(--ink-muted)]">{item.status}</span>
                            {item.fromCommit && item.toCommit && (
                              <>
                                <span className="text-[var(--ink-muted)]">·</span>
                                <span className="font-mono tabular-nums text-[var(--ink)]">
                                  {item.fromCommit.slice(0, 8)} → {item.toCommit.slice(0, 8)}
                                </span>
                              </>
                            )}
                            {item.scopes && item.scopes.length > 0 && (
                              <>
                                <span className="text-[var(--ink-muted)]">·</span>
                                <span className="font-mono text-[var(--ink-muted)]">
                                  {item.scopes.join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="font-mono text-[11.5px] tabular-nums text-[var(--ink-muted)]">
                            {formatDateTime(item.ts)} · {item.actor || 'system'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </Panel>
        </div>
      )}
    </ModuleFrame>
  );
}
