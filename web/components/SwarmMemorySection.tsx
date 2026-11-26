import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Database,
  GitBranch,
  HardDriveDownload,
  HardDriveUpload,
  Play,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type {
  A2AAgentPeer,
  A2AContextSpillNode,
  A2ASuperAgentConfig,
  A2ASuperAgentTicket,
  A2ASwarmMetrics,
  A2ATaskRecord,
  A2ATriggerEvent,
} from '../types';
import {
  ingestSuperAgentTrigger,
  runDshTeamCollaboration,
  runSuperAgentWatchdogSweep,
  toggleSuperAgentContextSpill,
  updateSuperAgentConfig,
} from '../api';
import {
  buildTriggerPathBreakdown,
  computeAttentionBudgetState,
  computeContextSpillStats,
  formatBytesKb,
} from '../lib/swarm-memory-engine';
import { formatCompactNumber } from '../utils/format';
import { cn } from '../lib/cn';
import { Button, inputBaseClass, KpiStrip, Panel, StatusIndicator } from './ui';

interface LastTeamRunResult {
  task: A2ATaskRecord;
  ticket: A2ASuperAgentTicket;
  policy: string;
  approved: boolean;
  spilledNode: A2AContextSpillNode | null;
}

const TRIGGER_PRESETS = [
  {
    id: 'drop',
    label: '自回声 (Fast Drop)',
    channel: 'github',
    actor: 'dsh-bot',
    threadKey: 'gh:ops-console#pr-142',
    summary: 'GitHub PR 状态标签自动回写（Agent 自触发回声）',
  },
  {
    id: 'passthrough',
    label: '已订阅线程 (Passthrough)',
    channel: 'ci',
    actor: 'github-actions',
    threadKey: 'ci:main#run-8812',
    summary: 'CI #8812 追加失败日志片段，直推已认领 Worker',
  },
  {
    id: 'spawn',
    label: '新工单 (Slow Spawn)',
    channel: 'feishu',
    actor: 'ops-lead',
    threadKey: 'feishu:ops-console#inc-209',
    summary: '排查亚太边缘节点 TLS 握手抖动并生成隔离修复工单',
  },
] as const;

function getTicketStatusMeta(ticket: A2ASuperAgentTicket): {
  status: string;
  label: string;
} {
  if (ticket.status === 'stalled' || ticket.watchdogState === 'stalled') {
    return { status: 'failed', label: '疑似阻塞' };
  }
  if (ticket.status === 'review_gate') {
    return { status: 'degraded', label: 'DSH 评审门禁' };
  }
  if (ticket.status === 'completed') {
    return { status: 'healthy', label: '已完成' };
  }
  if (ticket.watchdogState === 'recovered') {
    return { status: 'healthy', label: '已巡检恢复' };
  }
  return { status: 'healthy', label: '隔离运行中' };
}

function getDecisionMeta(decision: string): { label: string; colorClass: string } {
  if (decision === 'fast_drop') {
    return { label: 'FAST DROP', colorClass: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (decision === 'fast_passthrough') {
    return { label: 'PASSTHROUGH', colorClass: 'text-sky-600 dark:text-sky-400' };
  }
  return { label: 'SLOW SPAWN', colorClass: 'text-[var(--accent)]' };
}

function formatShortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

export function SwarmMemorySection({
  agents,
  swarmMetrics,
  superAgentConfig,
  superAgentTickets,
  contextSpillNodes,
  triggerEvents,
  readOnly = false,
  onReload,
  onOpenAgentLogs,
  onToast,
}: {
  agents: A2AAgentPeer[];
  swarmMetrics: A2ASwarmMetrics;
  superAgentConfig: A2ASuperAgentConfig;
  superAgentTickets: A2ASuperAgentTicket[];
  contextSpillNodes: A2AContextSpillNode[];
  triggerEvents: A2ATriggerEvent[];
  readOnly?: boolean;
  onReload: () => Promise<void> | void;
  onOpenAgentLogs?: (agentId: string) => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [routerThinMode, setRouterThinMode] = React.useState(superAgentConfig.routerThinMode !== false);
  const [fastPathEnabled, setFastPathEnabled] = React.useState(superAgentConfig.fastPathEnabled !== false);
  const [subscriptionPassthrough, setSubscriptionPassthrough] = React.useState(
    superAgentConfig.subscriptionPassthrough !== false,
  );
  const [inlineBudgetKb, setInlineBudgetKb] = React.useState(superAgentConfig.inlineBudgetKb || 32);
  const [watchdogStallSec, setWatchdogStallSec] = React.useState(superAgentConfig.watchdogStallSec || 180);
  const [attentionBudgetLimit, setAttentionBudgetLimit] = React.useState(
    superAgentConfig.attentionBudgetLimit || 4,
  );
  const [consensusPolicy, setConsensusPolicy] = React.useState(superAgentConfig.consensusPolicy || 'weighted');
  const [maxReworkRounds, setMaxReworkRounds] = React.useState(superAgentConfig.maxReworkRounds || 2);

  const [savingConfig, setSavingConfig] = React.useState(false);
  const [sweepingWatchdog, setSweepingWatchdog] = React.useState(false);
  const [togglingSpillId, setTogglingSpillId] = React.useState<string | null>(null);

  const [triggerChannel, setTriggerChannel] = React.useState<string>('github');
  const [triggerActor, setTriggerActor] = React.useState<string>('dsh-bot');
  const [triggerThreadKey, setTriggerThreadKey] = React.useState<string>('gh:ops-console#pr-142');
  const [triggerSummary, setTriggerSummary] = React.useState<string>(
    'GitHub PR 状态标签自动回写（Agent 自触发回声）',
  );
  const [sendingTrigger, setSendingTrigger] = React.useState(false);

  const [teamPrompt, setTeamPrompt] = React.useState(
    '使用隔离 Worktree 蜂群重构 auth 安全路由并由 DSH 专家团队执行多维评审门禁',
  );
  const [teamChannel, setTeamChannel] = React.useState<string>('github');
  const [enableAutoSpill, setEnableAutoSpill] = React.useState(true);
  const [runningTeam, setRunningTeam] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<LastTeamRunResult | null>(null);

  React.useEffect(() => {
    setRouterThinMode(superAgentConfig.routerThinMode !== false);
    setFastPathEnabled(superAgentConfig.fastPathEnabled !== false);
    setSubscriptionPassthrough(superAgentConfig.subscriptionPassthrough !== false);
    setInlineBudgetKb(superAgentConfig.inlineBudgetKb || 32);
    setWatchdogStallSec(superAgentConfig.watchdogStallSec || 180);
    setAttentionBudgetLimit(superAgentConfig.attentionBudgetLimit || 4);
    setConsensusPolicy(superAgentConfig.consensusPolicy || 'weighted');
    setMaxReworkRounds(superAgentConfig.maxReworkRounds || 2);
  }, [
    superAgentConfig.routerThinMode,
    superAgentConfig.fastPathEnabled,
    superAgentConfig.subscriptionPassthrough,
    superAgentConfig.inlineBudgetKb,
    superAgentConfig.watchdogStallSec,
    superAgentConfig.attentionBudgetLimit,
    superAgentConfig.consensusPolicy,
    superAgentConfig.maxReworkRounds,
  ]);

  const triggerBreakdown = React.useMemo(
    () => buildTriggerPathBreakdown(triggerEvents),
    [triggerEvents],
  );
  const spillStats = React.useMemo(
    () => computeContextSpillStats(contextSpillNodes, inlineBudgetKb),
    [contextSpillNodes, inlineBudgetKb],
  );
  const attentionState = React.useMemo(
    () => computeAttentionBudgetState(superAgentTickets, attentionBudgetLimit),
    [superAgentTickets, attentionBudgetLimit],
  );
  const agentNameById = React.useMemo(
    () => new Map(agents.map((a) => [a.id, a.name])),
    [agents],
  );

  const inlineBudgetPct = Math.min(
    100,
    Math.round((spillStats.inlineKb / Math.max(1, inlineBudgetKb)) * 100),
  );

  const handleSaveConfig = async () => {
    if (readOnly || savingConfig) return;
    setSavingConfig(true);
    try {
      const res = await updateSuperAgentConfig({
        routerThinMode,
        fastPathEnabled,
        subscriptionPassthrough,
        inlineBudgetKb,
        watchdogStallSec,
        attentionBudgetLimit,
        consensusPolicy,
        maxReworkRounds,
      });
      onToast?.(
        `SuperAgent 策略已保存：Inline 预算 ${res.superAgentConfig.inlineBudgetKb}KB · Watchdog ${res.superAgentConfig.watchdogStallSec}s`,
        'ok',
      );
      await onReload();
    } catch (err) {
      onToast?.(`保存 SuperAgent 策略失败：${(err as Error).message}`, 'err');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleWatchdogSweep = async () => {
    if (readOnly || sweepingWatchdog) return;
    setSweepingWatchdog(true);
    try {
      const res = await runSuperAgentWatchdogSweep();
      onToast?.(
        res.recoveredCount > 0
          ? `Watchdog 巡检完成：检测 ${res.checkedCount} 个工单，已自动恢复 ${res.recoveredCount} 个阻塞会话`
          : `Watchdog 巡检完成：${res.checkedCount} 个活跃隔离工单全部心跳正常`,
        'ok',
      );
      await onReload();
    } catch (err) {
      onToast?.(`执行 Watchdog 巡检失败：${(err as Error).message}`, 'err');
    } finally {
      setSweepingWatchdog(false);
    }
  };

  const handleIngestTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || sendingTrigger) return;
    if (!triggerSummary.trim()) {
      onToast?.('请填写触发事件摘要', 'err');
      return;
    }
    setSendingTrigger(true);
    try {
      const res = await ingestSuperAgentTrigger({
        channel: triggerChannel,
        actor: triggerActor.trim() || 'webhook',
        threadKey: triggerThreadKey.trim() || undefined,
        summary: triggerSummary.trim(),
      });
      const meta = getDecisionMeta(res.trigger.decision);
      onToast?.(
        `触发器分流完成 [${meta.label}]${res.ticket ? ` -> 工单 ${res.ticket.id}` : ''}${res.trigger.tokensSaved > 0 ? ` · 节省 ${res.trigger.tokensSaved} Token` : ''}`,
        'ok',
      );
      await onReload();
    } catch (err) {
      onToast?.(`提交触发事件失败：${(err as Error).message}`, 'err');
    } finally {
      setSendingTrigger(false);
    }
  };

  const handleToggleSpill = async (node: A2AContextSpillNode) => {
    if (readOnly || togglingSpillId) return;
    setTogglingSpillId(node.spillId);
    try {
      const res = await toggleSuperAgentContextSpill(node.spillId);
      onToast?.(
        res.node.state === 'inline'
          ? `Chain of Recall 已按需回溯 ${res.node.spillId}（累计回溯 ${res.node.recallCount} 次）`
          : `已将 ${res.node.spillId} 溢出降载，释放 ${formatBytesKb(res.node.bytes)} 活动窗口`,
        'ok',
      );
      await onReload();
    } catch (err) {
      onToast?.(`切换上下文状态失败：${(err as Error).message}`, 'err');
    } finally {
      setTogglingSpillId(null);
    }
  };

  const handleRunDshTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || runningTeam) return;
    if (!teamPrompt.trim()) {
      onToast?.('请输入团队协同任务描述', 'err');
      return;
    }
    setRunningTeam(true);
    try {
      const res = await runDshTeamCollaboration({
        prompt: teamPrompt.trim(),
        channel: teamChannel,
        consensusPolicy,
        enableAutoSpill,
      });
      setLastRun({
        task: res.task,
        ticket: res.ticket,
        policy: res.policy,
        approved: res.approved,
        spilledNode: res.spilledNode,
      });
      onToast?.(
        `DSH 智能体团队协同完成：工单 ${res.ticket.id} · 评分 ${res.task.dshReview?.score ?? 92}/100 (${res.approved ? '共识放行' : '待返工'})`,
        'ok',
      );
      await onReload();
    } catch (err) {
      onToast?.(`执行 DSH 团队协同失败：${(err as Error).message}`, 'err');
    } finally {
      setRunningTeam(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. SuperAgent Swarm & Context Telemetry KPI Strip */}
      <KpiStrip
        asymmetric
        cells={[
          {
            label: '任务 / Agent 吞吐比',
            meta: `${swarmMetrics.activeAgents} 在线节点`,
            value: `${swarmMetrics.taskToAgentThroughputRatio.toFixed(2)}x`,
            sub: `${swarmMetrics.totalWorkUnits} 单元 · 并行加速 ${swarmMetrics.parallelSpeedup.toFixed(2)}x`,
            tone: 'ok',
          },
          {
            label: 'Fast Path 代码直滤卸载',
            meta: `节省 ~${formatCompactNumber(swarmMetrics.routerTokensSaved)} Token`,
            value: `${swarmMetrics.fastPathOffloadPct}%`,
            ratioPct: swarmMetrics.fastPathOffloadPct,
            sub: `直滤 ${swarmMetrics.fastDropCount} · 订阅直通 ${swarmMetrics.fastPassthroughCount} · Router ${swarmMetrics.slowSpawnCount}`,
            tone: swarmMetrics.fastPathOffloadPct >= 50 ? 'ok' : undefined,
          },
          {
            label: 'Inline / Spill 上下文降载',
            meta: `预算 ${inlineBudgetKb} KB`,
            value: `${spillStats.spilledKb} KB`,
            ratioPct: spillStats.offloadPct,
            sub: `活动窗口 ${spillStats.inlineKb} KB · ${spillStats.spilledCount}/${contextSpillNodes.length} 节点已溢出`,
            tone: spillStats.overBudget ? 'warn' : 'ok',
          },
          {
            label: 'Watchdog 与注意力预算',
            meta: `DSH 共识 ${swarmMetrics.dshConsensusRate}%`,
            value: `${attentionState.needsAttention}/${attentionState.limit}`,
            sub:
              attentionState.stalled > 0
                ? `${attentionState.stalled} 个阻塞工单待巡检恢复`
                : `${attentionState.active} 个活跃工单全部心跳正常`,
            tone: attentionState.tone,
          },
        ]}
      />

      {/* 2. Swarm Node Load & Fast/Slow Path Routing Analytics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="蜂群节点任务吞吐与协作负载"
          description="统计各 Agent 节点承接的隔离工单、主控拆解与子任务工作单元及跨节点协作事件密度。"
        >
          <div className="h-[224px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={swarmMetrics.perAgentStats}
                margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickFormatter={(v) => {
                    const s = String(v || '');
                    return s.length > 8 ? `${s.slice(0, 7)}…` : s;
                  }}
                  tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickLine={false}
                  interval={0}
                  height={28}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--ink)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="handledUnits"
                  name="处理工作单元"
                  fill="var(--accent)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="collabEvents"
                  name="协作事件数"
                  fill="#0ea5e9"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={26}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Fast / Slow Path 事件分流与 Router 卸载"
          description="借鉴 DeepSeek SuperAgent：优先在纯代码 Fast Path 拦截自回声/噪音与已订阅线程直通，仅将新任务升至薄 Router。"
        >
          <div className="h-[192px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={triggerBreakdown.items}
                margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [String(value), String(name)]}
                  contentStyle={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--ink)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="count"
                  name="事件数"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                  isAnimationActive={false}
                >
                  {triggerBreakdown.items.map((item) => (
                    <Cell
                      key={item.key}
                      fill={
                        item.key === 'fast_drop'
                          ? '#10b981'
                          : item.key === 'fast_passthrough'
                            ? '#0ea5e9'
                            : 'var(--accent)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5 text-[11px] font-mono tabular-nums text-[var(--ink-subtle)]">
            <span>代码层卸载率 {triggerBreakdown.offloadPct}%（共 {triggerBreakdown.total} 条触发记录）</span>
            <span className="text-[var(--ok)]">
              累计节省 ~{formatCompactNumber(triggerBreakdown.totalTokensSaved)} Router Token
            </span>
          </div>
        </Panel>
      </div>

      {/* 3. SuperAgent Policy + Isolated Worker Tickets & Watchdog | Fast/Slow Path Trigger Simulator */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        {/* Left: SuperAgent Policy Controls & Active Isolated Worker Tickets */}
        <Panel
          title="薄 Router 策略与隔离工单 (Watchdog)"
          description="全局薄 Router 仅做路由受理而不执行本地 Bash；外部 Watchdog 监控各独立 Git Worktree 进展并自动恢复阻塞工单。"
          actions={
            !readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={savingConfig}
                  onClick={() => void handleSaveConfig()}
                  data-testid="superagent-config-save-btn"
                >
                  <Save className="size-3.5" />
                  {savingConfig ? '保存中…' : '保存策略'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={sweepingWatchdog}
                  onClick={() => void handleWatchdogSweep()}
                  data-testid="superagent-watchdog-sweep-btn"
                >
                  <RefreshCw className={cn('size-3.5', sweepingWatchdog && 'animate-spin')} />
                  {sweepingWatchdog ? '巡检恢复中…' : '运行 Watchdog 巡检恢复'}
                </Button>
              </div>
            )
          }
        >
          {/* Policy Controls Grid */}
          <div className="mb-4 space-y-3 border-b border-[var(--border-subtle)] pb-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--ink-muted)]">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={routerThinMode}
                  disabled={readOnly}
                  onChange={(e) => setRouterThinMode(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] accent-[var(--accent)]"
                />
                薄 Router 零执行模式
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fastPathEnabled}
                  disabled={readOnly}
                  onChange={(e) => setFastPathEnabled(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] accent-[var(--accent)]"
                />
                Fast Path 确定性直滤
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscriptionPassthrough}
                  disabled={readOnly}
                  onChange={(e) => setSubscriptionPassthrough(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] accent-[var(--accent)]"
                />
                Subscription Passthrough 线程直通
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                  Inline 阈值 (KB)
                </span>
                <select
                  value={inlineBudgetKb}
                  disabled={readOnly}
                  onChange={(e) => setInlineBudgetKb(Number(e.target.value))}
                  className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
                  data-testid="superagent-inline-budget-select"
                >
                  {[16, 24, 32, 48, 64].map((kb) => (
                    <option key={kb} value={kb}>
                      {kb} KB
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                  Watchdog 超时
                </span>
                <select
                  value={watchdogStallSec}
                  disabled={readOnly}
                  onChange={(e) => setWatchdogStallSec(Number(e.target.value))}
                  className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
                >
                  {[60, 120, 180, 300, 600].map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}s
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                  注意力上限
                </span>
                <select
                  value={attentionBudgetLimit}
                  disabled={readOnly}
                  onChange={(e) => setAttentionBudgetLimit(Number(e.target.value))}
                  className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
                >
                  {[2, 4, 6, 8].map((n) => (
                    <option key={n} value={n}>
                      最多 {n} 项
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                  DSH 共识策略
                </span>
                <select
                  value={consensusPolicy}
                  disabled={readOnly}
                  onChange={(e) => setConsensusPolicy(e.target.value)}
                  className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
                  data-testid="dsh-consensus-select"
                >
                  <option value="weighted">加权专家共识</option>
                  <option value="unanimous">全员一致门禁</option>
                  <option value="lead-override">主控最终裁决</option>
                </select>
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                  最大返工轮次
                </span>
                <select
                  value={maxReworkRounds}
                  disabled={readOnly}
                  onChange={(e) => setMaxReworkRounds(Number(e.target.value))}
                  className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} 轮
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Isolated Worker Tickets List */}
          <div className="divide-y divide-[var(--border-subtle)]" data-testid="superagent-tickets-list">
            {superAgentTickets.map((ticket) => {
              const statusMeta = getTicketStatusMeta(ticket);
              const isStalled = ticket.status === 'stalled' || ticket.watchdogState === 'stalled';
              return (
                <div
                  key={ticket.id}
                  data-testid={`superagent-ticket-${ticket.id}`}
                  className="py-3 first:pt-0 last:pb-0 space-y-1.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isStalled ? (
                          <ShieldAlert className="size-3.5 text-[var(--err)] shrink-0" />
                        ) : (
                          <ShieldCheck className="size-3.5 text-[var(--accent)] shrink-0" />
                        )}
                        <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                          {ticket.id}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--ink-subtle)]">
                          [{ticket.channel}] {ticket.threadKey}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[var(--ink)] leading-snug">
                        {ticket.title}
                      </p>
                    </div>
                    <StatusIndicator status={statusMeta.status} label={statusMeta.label} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[var(--ink-subtle)]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                      <span className="text-[var(--ink-muted)] truncate">
                        Worker: {ticket.workerAgentName.replace(/\s*\(.*?\)\s*/g, '')}
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <GitBranch className="size-3 shrink-0" />
                        {ticket.worktreeBranch}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0">
                      <span>Inline {formatBytesKb(ticket.inlineBytes)}</span>
                      <span>Spill {ticket.spilledCount}</span>
                      {ticket.dshScore != null && (
                        <span className="text-[var(--ok)] font-semibold">DSH {ticket.dshScore}/100</span>
                      )}
                      {onOpenAgentLogs && (
                        <button
                          type="button"
                          onClick={() => onOpenAgentLogs(ticket.workerAgentId)}
                          className="text-[var(--accent)] hover:underline cursor-pointer"
                        >
                          追踪日志
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Right: Fast / Slow Path Trigger Simulator & Recent Events */}
        <Panel
          title="Fast / Slow Path 触发器入口"
          description="模拟外部 GitHub / CI / 飞书 / 告警事件流入，验证零 Token 代码直滤、已订阅直通与薄 Router 派单。"
        >
          {/* Preset buttons */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {TRIGGER_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="secondary"
                size="sm"
                type="button"
                disabled={readOnly}
                data-testid={`trigger-preset-${preset.id}`}
                onClick={() => {
                  setTriggerChannel(preset.channel);
                  setTriggerActor(preset.actor);
                  setTriggerThreadKey(preset.threadKey);
                  setTriggerSummary(preset.summary);
                }}
              >
                <Zap className="size-3 text-[var(--accent)]" />
                {preset.label}
              </Button>
            ))}
          </div>

          <form onSubmit={(e) => void handleIngestTrigger(e)} className="space-y-2.5 border-b border-[var(--border-subtle)] pb-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">来源通道</span>
                <select
                  value={triggerChannel}
                  disabled={readOnly}
                  onChange={(e) => setTriggerChannel(e.target.value)}
                  className={cn('ui-select w-full h-8 pl-2.5 text-xs cursor-pointer', inputBaseClass)}
                >
                  <option value="github">github</option>
                  <option value="ci">ci</option>
                  <option value="feishu">feishu</option>
                  <option value="alert">alert</option>
                  <option value="webhook">webhook</option>
                </select>
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">触发者 Actor</span>
                <input
                  type="text"
                  value={triggerActor}
                  disabled={readOnly}
                  onChange={(e) => setTriggerActor(e.target.value)}
                  placeholder="dsh-bot / maintainer"
                  className={cn(inputBaseClass, 'w-full h-8 px-2.5 text-xs font-mono')}
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">线程键 ThreadKey</span>
              <input
                type="text"
                value={triggerThreadKey}
                disabled={readOnly}
                onChange={(e) => setTriggerThreadKey(e.target.value)}
                placeholder="gh:ops-console#pr-142"
                className={cn(inputBaseClass, 'w-full h-8 px-2.5 text-xs font-mono')}
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">事件内容摘要</span>
              <input
                type="text"
                value={triggerSummary}
                disabled={readOnly}
                onChange={(e) => setTriggerSummary(e.target.value)}
                placeholder="描述触发事件…"
                className={cn(inputBaseClass, 'w-full h-8 px-2.5 text-xs')}
                data-testid="superagent-trigger-summary-input"
              />
            </label>

            {!readOnly && (
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={sendingTrigger}
                  data-testid="superagent-trigger-submit-btn"
                >
                  <Send className="size-3.5" />
                  {sendingTrigger ? '分流中…' : '模拟触发分流'}
                </Button>
              </div>
            )}
          </form>

          {/* Recent Trigger Decisions */}
          <div className="mt-3 divide-y divide-[var(--border-subtle)] max-h-[250px] overflow-y-auto" data-testid="superagent-triggers-list">
            {triggerEvents.slice(0, 8).map((ev) => {
              const meta = getDecisionMeta(ev.decision);
              return (
                <div key={ev.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('font-semibold shrink-0', meta.colorClass)}>{meta.label}</span>
                      <span className="text-[var(--ink-subtle)] truncate">
                        {ev.channel}/{ev.actor} · {ev.threadKey}
                      </span>
                    </div>
                    <span className="text-[var(--ink-subtle)] shrink-0">
                      {ev.tokensSaved > 0 ? `-${ev.tokensSaved} tok` : ev.ticketId || formatShortTime(ev.ts)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink)] leading-snug line-clamp-1">{ev.summary}</p>
                  <p className="text-[11px] text-[var(--ink-subtle)] leading-snug line-clamp-2">{ev.reason}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* 4. Inline / Spill Context Cache (Chain of Recall) + DSH Team Collaboration Runner */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* Left: Inline / Spill Context Cache */}
        <Panel
          title="Inline / Spill 上下文缓存 (Chain of Recall)"
          description="遵循编译器缓存分层理念：大体积 Diff 与 CI 输出自动溢出为外部句柄，保持活动上下文低于预算阈值，按需一键回溯。"
        >
          {/* Context Window Budget Bar */}
          <div className="mb-4 space-y-1.5 border-b border-[var(--border-subtle)] pb-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
              <span className="text-[var(--ink-muted)]">
                活动窗口 Inline：{spillStats.inlineKb} KB / {inlineBudgetKb} KB 预算
              </span>
              <span className={spillStats.overBudget ? 'text-[var(--warn)] font-semibold' : 'text-[var(--ok)]'}>
                已溢出释放 {spillStats.spilledKb} KB（降载率 {spillStats.offloadPct}% · 累计回溯 {spillStats.totalRecalls} 次）
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-200 ease-out',
                  spillStats.overBudget ? 'bg-[var(--warn-dot)]' : 'bg-[var(--accent)]',
                )}
                style={{ width: `${Math.max(4, inlineBudgetPct)}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]" data-testid="superagent-spill-list">
            {contextSpillNodes.map((node) => {
              const isInline = node.state === 'inline';
              const isBusy = togglingSpillId === node.spillId;
              return (
                <div
                  key={node.spillId}
                  data-testid={`spill-node-${node.spillId}`}
                  className="py-3 first:pt-0 last:pb-0 space-y-1.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Database className="size-3.5 text-[var(--accent)] shrink-0" />
                        <span className="font-mono font-semibold text-[var(--ink)]">{node.spillId}</span>
                        <span className="font-mono text-[11px] text-[var(--ink-subtle)] truncate">
                          {node.parentRef}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[var(--ink)]">{node.label}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-subtle)] break-all line-clamp-2">
                        {node.preview}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
                        <span className={isInline ? 'text-[var(--warn)] font-semibold' : 'text-[var(--ok)] font-semibold'}>
                          {isInline ? 'INLINE 活动' : 'SPILLED 溢出'}
                        </span>
                        <span className="text-[var(--ink-subtle)]">
                          {formatBytesKb(node.bytes)} · 回溯 {node.recallCount} 次
                        </span>
                      </div>

                      {!readOnly && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleToggleSpill(node)}
                          data-testid={`spill-toggle-${node.spillId}`}
                        >
                          {isInline ? (
                            <>
                              <HardDriveUpload className="size-3 text-[var(--ok)]" />
                              溢出降载
                            </>
                          ) : (
                            <>
                              <HardDriveDownload className="size-3 text-[var(--accent)]" />
                              Chain of Recall 回溯
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Right: DSH Multi-Agent Team Collaboration Studio */}
        <Panel
          title="DSH 智能体团队协同编排 (Team Runner)"
          description="由薄 Router 统筹隔离 Worker 蜂群并行拆解执行，自动将大体积 Diff 溢出至 Chain of Recall，并经 DSH 专家团加权门禁放行。"
        >
          {/* Role Roster */}
          <div className="mb-4 divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] pb-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)]">
                <Users className="size-3.5 text-[var(--accent)]" />
                SuperAgent × DSH 角色编组与投票权重
              </span>
              <span className="font-mono text-[11px] text-[var(--ink-subtle)]">
                策略: {consensusPolicy}
              </span>
            </div>
            {(superAgentConfig.roles || []).map((role) => {
              const assignedName = agentNameById.get(role.agentId) || role.agentId;
              return (
                <div key={role.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--ink)] truncate">{role.title}</div>
                    <div className="text-[11px] text-[var(--ink-subtle)] truncate">{assignedName}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono tabular-nums text-[11px] text-[var(--ink-muted)]">
                      权重 {Math.round(role.weight * 100)}%
                    </span>
                    {onOpenAgentLogs && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenAgentLogs(role.agentId)}
                      >
                        实时日志
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Launch DSH Team Collaboration Form */}
          <form onSubmit={(e) => void handleRunDshTeam(e)} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                团队协同任务指令（创建独立 Git Worktree 工单并触发 DSH 专家多维评审）
              </span>
              <textarea
                rows={3}
                value={teamPrompt}
                disabled={readOnly}
                onChange={(e) => setTeamPrompt(e.target.value)}
                className={cn(inputBaseClass, 'w-full px-2.5 py-2 text-xs leading-relaxed')}
                data-testid="dsh-team-prompt-input"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={teamChannel}
                  disabled={readOnly}
                  onChange={(e) => setTeamChannel(e.target.value)}
                  aria-label="选择任务来源通道"
                  className={cn('ui-select h-8 pl-2.5 text-xs cursor-pointer', inputBaseClass)}
                >
                  <option value="github">github</option>
                  <option value="ci">ci</option>
                  <option value="feishu">feishu</option>
                  <option value="alert">alert</option>
                </select>

                <label className="inline-flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableAutoSpill}
                    disabled={readOnly}
                    onChange={(e) => setEnableAutoSpill(e.target.checked)}
                    className="rounded border-[var(--border-subtle)] accent-[var(--accent)]"
                  />
                  自动 Spill 溢出证据链
                </label>
              </div>

              {!readOnly && (
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={runningTeam}
                  data-testid="dsh-team-run-btn"
                >
                  <Play className="size-3.5" />
                  {runningTeam ? '团队蜂群协同中…' : '启动 DSH 团队协同'}
                </Button>
              )}
            </div>
          </form>

          {/* Latest Collaboration Execution Trace */}
          {lastRun && (
            <div
              className="mt-4 space-y-2.5 border-t border-[var(--border-subtle)] pt-4"
              data-testid="dsh-team-run-result"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)]">
                  <Sparkles className="size-3.5 text-[var(--ok)]" />
                  最近一次 DSH 团队协同结果
                </span>
                <span
                  className={cn(
                    'font-mono text-xs font-semibold',
                    lastRun.approved ? 'text-[var(--ok)]' : 'text-[var(--warn)]',
                  )}
                >
                  {lastRun.task.dshReview?.score ?? 92}/100 · {lastRun.approved ? '共识放行' : '打回返工'}
                </span>
              </div>

              <div className="font-mono text-[11px] text-[var(--ink-subtle)]">
                工单 {lastRun.ticket.id} · 分支 {lastRun.ticket.worktreeBranch}
                {lastRun.spilledNode && (
                  <span className="ml-2 text-[var(--warn)]">
                    · Spill 句柄 {lastRun.spilledNode.spillId} ({formatBytesKb(lastRun.spilledNode.bytes)})
                  </span>
                )}
              </div>

              <div className="text-xs text-[var(--ink-muted)] leading-relaxed">
                {lastRun.task.artifact}
              </div>

              {lastRun.task.subtasks && lastRun.task.subtasks.length > 0 && (
                <div className="divide-y divide-[var(--border-subtle)] rounded border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-2.5">
                  {lastRun.task.subtasks.map((st) => (
                    <div key={st.id} className="flex items-center justify-between gap-2 py-1.5 text-[11px]">
                      <span className="font-medium text-[var(--ink)] truncate">
                        [{st.role}] {st.agentName.replace(/\s*\(.*?\)\s*/g, '')}
                      </span>
                      <span className="font-mono text-[var(--ink-subtle)] shrink-0">
                        {st.model} · {st.effort}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {onOpenAgentLogs && (
                <div className="pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenAgentLogs('all')}
                  >
                    在实时 Agent 协作日志中查看完整追踪
                  </Button>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
