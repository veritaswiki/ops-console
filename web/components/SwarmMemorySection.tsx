import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Brain,
  CheckCircle2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  A2AAgentPeer,
  A2ADshTeamConfig,
  A2AEngramEntry,
  A2ASwarmMetrics,
  A2ATaskRecord,
} from '../types';
import {
  consolidateA2AMemory,
  reviewA2AEngram,
  runDshTeamCollaboration,
  upsertA2AEngram,
} from '../api';
import {
  buildEngramUCurveSeries,
  computeSm2Preview,
  formatIntervalHuman,
} from '../lib/swarm-memory-engine';
import { cn } from '../lib/cn';
import { Button, inputBaseClass, KpiStrip, Panel } from './ui';

interface LastTeamRunResult {
  task: A2ATaskRecord;
  policy: string;
  approved: boolean;
  matchedEngrams: A2AEngramEntry[];
}

export function SwarmMemorySection({
  agents,
  swarmMetrics,
  engramMemory,
  dshTeamConfig,
  readOnly = false,
  onReload,
  onOpenAgentLogs,
  onToast,
}: {
  agents: A2AAgentPeer[];
  swarmMetrics: A2ASwarmMetrics;
  engramMemory: A2AEngramEntry[];
  dshTeamConfig: A2ADshTeamConfig;
  readOnly?: boolean;
  onReload: () => Promise<void> | void;
  onOpenAgentLogs?: (agentId: string) => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [ratioPct, setRatioPct] = React.useState<number>(dshTeamConfig.engramMemoryRatioPct || 25);
  const [consensusPolicy, setConsensusPolicy] = React.useState<string>(dshTeamConfig.consensusPolicy || 'weighted');
  const [maxReworkRounds, setMaxReworkRounds] = React.useState<number>(dshTeamConfig.maxReworkRounds || 2);
  const [consolidating, setConsolidating] = React.useState(false);
  const [reviewingId, setReviewingId] = React.useState<string | null>(null);

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newKeywords, setNewKeywords] = React.useState('');
  const [newContent, setNewContent] = React.useState('');
  const [newCategory, setNewCategory] = React.useState('swarm-protocol');
  const [savingEngram, setSavingEngram] = React.useState(false);

  const [teamPrompt, setTeamPrompt] = React.useState(
    '使用 swarm 蜂群重构 auth 安全路由并由 DSH 专家团队执行多维评审门禁',
  );
  const [useEngramLookup, setUseEngramLookup] = React.useState(true);
  const [runningTeam, setRunningTeam] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<LastTeamRunResult | null>(null);

  React.useEffect(() => {
    setRatioPct(dshTeamConfig.engramMemoryRatioPct || 25);
    setConsensusPolicy(dshTeamConfig.consensusPolicy || 'weighted');
    setMaxReworkRounds(dshTeamConfig.maxReworkRounds || 2);
  }, [dshTeamConfig.engramMemoryRatioPct, dshTeamConfig.consensusPolicy, dshTeamConfig.maxReworkRounds]);

  const uCurveData = React.useMemo(() => buildEngramUCurveSeries(ratioPct), [ratioPct]);
  const agentNameById = React.useMemo(
    () => new Map(agents.map((a) => [a.id, a.name])),
    [agents],
  );

  const handleConsolidate = async () => {
    if (readOnly || consolidating) return;
    setConsolidating(true);
    try {
      const res = await consolidateA2AMemory({
        engramMemoryRatioPct: ratioPct,
        consensusPolicy,
        maxReworkRounds,
        runSweep: true,
      });
      onToast?.(
        `已完成 SM-2 记忆巩固（强化到期条目 ${res.reinforcedCount} 条 · 配比 ${res.dshTeamConfig.engramMemoryRatioPct}%/${100 - res.dshTeamConfig.engramMemoryRatioPct}%）`,
        'ok',
      );
      await onReload();
    } catch (err) {
      onToast?.(`记忆巩固失败：${(err as Error).message}`, 'err');
    } finally {
      setConsolidating(false);
    }
  };

  const handleReviewEngram = async (entry: A2AEngramEntry, quality: number) => {
    if (readOnly || reviewingId) return;
    setReviewingId(entry.id);
    try {
      const res = await reviewA2AEngram(entry.id, quality);
      onToast?.(
        quality >= 3
          ? `SM-2 已强化「${entry.title.slice(0, 22)}」→ 下次复盘 ${formatIntervalHuman(res.engram.intervalHours)}`
          : `已标记遗忘重训「${entry.title.slice(0, 22)}」→ 稳定度重置`,
        'ok',
      );
      await onReload();
    } catch (err) {
      onToast?.(`SM-2 评审失败：${(err as Error).message}`, 'err');
    } finally {
      setReviewingId(null);
    }
  };

  const handleCreateEngram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || savingEngram) return;
    if (!newTitle.trim() || !newContent.trim()) {
      onToast?.('请填写 Engram 规则标题与核心内容', 'err');
      return;
    }
    setSavingEngram(true);
    try {
      await upsertA2AEngram({
        title: newTitle.trim(),
        content: newContent.trim(),
        keyPattern: newKeywords
          .split(/[,，\s]+/)
          .map((k) => k.trim())
          .filter(Boolean),
        category: newCategory,
        dshVerified: true,
      });
      setNewTitle('');
      setNewKeywords('');
      setNewContent('');
      setShowAddForm(false);
      onToast?.('已写入团队 Engram O(1) 条件记忆并纳入 SM-2 巩固计划', 'ok');
      await onReload();
    } catch (err) {
      onToast?.(`新增 Engram 失败：${(err as Error).message}`, 'err');
    } finally {
      setSavingEngram(false);
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
        useEngramLookup,
        consensusPolicy,
      });
      setLastRun({
        task: res.task,
        policy: res.policy,
        approved: res.approved,
        matchedEngrams: res.matchedEngrams,
      });
      onToast?.(
        `DSH 智能体团队协同完成：命中 ${res.matchedEngrams.length} 条 Engram · 评分 ${res.task.dshReview?.score ?? 92}/100 (${res.approved ? '共识放行' : '待返工'})`,
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
      {/* 1. Swarm / Bee-Hive Coordination Metrics KPI Strip */}
      <KpiStrip
        asymmetric
        cells={[
          {
            label: '任务 / Agent 吞吐比',
            meta: `${swarmMetrics.activeAgents} 在线节点`,
            value: `${swarmMetrics.taskToAgentThroughputRatio.toFixed(2)}x`,
            sub: `${swarmMetrics.totalWorkUnits} 单元 (${swarmMetrics.totalTasks} 主任务 + ${swarmMetrics.totalSubtasks} 子任务)`,
            tone: 'ok',
          },
          {
            label: '蜂群并行加速比',
            meta: 'Worktree 隔离',
            value: `${swarmMetrics.parallelSpeedup.toFixed(2)}x`,
            sub: `均耗 ${swarmMetrics.avgDurationMs}ms · 闭环 ${swarmMetrics.completedTasks}/${swarmMetrics.totalTasks}`,
            tone: swarmMetrics.parallelSpeedup >= 1.5 ? 'ok' : undefined,
          },
          {
            label: 'Engram O(1) 算力卸载',
            meta: `${swarmMetrics.engramMemoryRatioPct}/${swarmMetrics.computeRatioPct}`,
            value: `${swarmMetrics.engramOffloadPct}%`,
            ratioPct: swarmMetrics.uCurveEfficiencyPct,
            sub: `U 型效率 ${swarmMetrics.uCurveEfficiencyPct}% · 命中 ${swarmMetrics.totalEngramHits} 次`,
            tone: swarmMetrics.uCurveEfficiencyPct >= 92 ? 'ok' : 'warn',
          },
          {
            label: 'DSH 共识与 SM-2',
            meta: swarmMetrics.dueReviewCount > 0 ? `${swarmMetrics.dueReviewCount} 待复盘` : '稳态',
            value: `${swarmMetrics.dshConsensusRate}%`,
            sub: `SM-2 均保持率 ${swarmMetrics.avgRetentionPct}%`,
            tone: swarmMetrics.dueReviewCount > 0 ? 'warn' : 'ok',
          },
        ]}
      />

      {/* 2. Visual Swarm Analytics & DeepSeek Engram U-Shaped Scaling Curve */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="蜂群节点任务吞吐与协作负载"
          description="统计各 Agent 节点承接的调度工作单元（主控拆解 + 子任务执行）与跨节点协作事件密度。"
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
                    return s.length > 10 ? `${s.slice(0, 9)}…` : s;
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
                    borderRadius: '6px',
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
          title="DeepSeek Engram U 型记忆-算力配比曲线"
          description="遵循 Engram 论文 (arXiv:2601.07372) U 型缩放规律：约 25% 静态条件记忆 + 75% 动态推理算力达到综合效率峰值。"
        >
          <div className="h-[224px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={uCurveData}
                margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="engramEffFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="memoryPct"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[70, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [`${value}%`, String(name)]}
                  labelFormatter={(label) => `条件记忆 ${label}% / 动态推理 ${100 - Number(label)}%`}
                  contentStyle={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--ink)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine
                  x={25}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: '25% 最优峰', position: 'insideTopRight', fontSize: 11, fill: '#10b981' }}
                />
                <ReferenceLine x={ratioPct} stroke="var(--accent)" strokeWidth={1.5} />
                <Area
                  type="monotone"
                  dataKey="efficiencyPct"
                  name="调度综合效率"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#engramEffFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* 3. DeepSeek Engram × SuperMemo SM-2 Memory Bank + DSH Team Collaboration Runner */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        {/* Left: Engram Conditional Memory & SuperMemo SM-2 Consolidation */}
        <Panel
          title="Engram 条件记忆表 × SuperMemo SM-2 遗忘巩固"
          description="任务路由前执行 O(1) 团队记忆查表前置注入不变量，并以 SuperMemo SM-2 间隔重复算法追踪记忆保持率 R(t)=e^(-Δt/S)。"
          actions={
            !readOnly && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddForm((v) => !v)}
                  data-testid="engram-add-toggle-btn"
                >
                  <Plus className="size-3.5" />
                  新增 Engram
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={consolidating}
                  onClick={() => void handleConsolidate()}
                  data-testid="engram-consolidate-btn"
                >
                  <RefreshCw className={cn('size-3.5', consolidating && 'animate-spin')} />
                  {consolidating ? '巩固中…' : '保存配比并 SM-2 巩固'}
                </Button>
              </div>
            )
          }
        >
          {/* Allocation Slider + Consensus Policy Controls */}
          <div className="mb-4 grid grid-cols-1 gap-3 border-b border-[var(--border-subtle)] pb-4 sm:grid-cols-3">
            <label className="min-w-0">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-[var(--ink-subtle)]">Engram / Compute 配比</span>
                <span className="font-mono font-semibold text-[var(--ink)] tabular-nums">
                  {ratioPct}% / {100 - ratioPct}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                disabled={readOnly}
                value={ratioPct}
                onChange={(e) => setRatioPct(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
                data-testid="engram-ratio-slider"
              />
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                DSH 团队共识策略
              </span>
              <select
                value={consensusPolicy}
                disabled={readOnly}
                onChange={(e) => setConsensusPolicy(e.target.value)}
                className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
                data-testid="dsh-consensus-select"
              >
                <option value="weighted">加权专家共识 (Weighted)</option>
                <option value="unanimous">全员一致门禁 (Unanimous)</option>
                <option value="lead-override">主控最终裁决 (Lead Override)</option>
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                最大自动返工轮次
              </span>
              <select
                value={maxReworkRounds}
                disabled={readOnly}
                onChange={(e) => setMaxReworkRounds(Number(e.target.value))}
                className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    最多 {n} 轮返工闭环
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Inline Create Engram Form */}
          {showAddForm && !readOnly && (
            <form
              onSubmit={(e) => void handleCreateEngram(e)}
              className="mb-4 space-y-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3"
              data-testid="engram-add-form"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="团队规则标题（例：数据库迁移必须支持幂等回滚）"
                  className={cn(inputBaseClass, 'w-full h-8 px-2.5 text-xs')}
                />
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="触发关键词（逗号分隔，如：sql, migration, db）"
                  className={cn(inputBaseClass, 'w-full h-8 px-2.5 text-xs')}
                />
              </div>
              <textarea
                rows={2}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="O(1) 查表命中后自动注入 Worker 上下文的约束与最佳实践…"
                className={cn(inputBaseClass, 'w-full px-2.5 py-2 text-xs')}
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={cn('ui-select h-8 pl-2.5 text-xs cursor-pointer', inputBaseClass)}
                >
                  <option value="swarm-protocol">swarm-protocol</option>
                  <option value="security-invariant">security-invariant</option>
                  <option value="routing-heuristic">routing-heuristic</option>
                  <option value="ui-pattern">ui-pattern</option>
                  <option value="ops-runbook">ops-runbook</option>
                </select>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddForm(false)}>
                    取消
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={savingEngram}>
                    {savingEngram ? '写入中…' : '保存 Engram 记忆'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Engram Memory Entries */}
          <div className="divide-y divide-[var(--border-subtle)]" data-testid="engram-memory-list">
            {engramMemory.map((entry) => {
              const boostPreview = computeSm2Preview(entry, 5);
              const isBusy = reviewingId === entry.id;
              return (
                <div key={entry.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Brain className="size-3.5 text-[var(--accent)] shrink-0" />
                        <span className="text-xs font-semibold text-[var(--ink)]">
                          {entry.title}
                        </span>
                        {entry.dshVerified && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ok)]">
                            <ShieldCheck className="size-3" />
                            DSH 已校验
                          </span>
                        )}
                        {entry.dueForReview && (
                          <span className="text-[11px] font-medium text-[var(--warn)]">
                            · 到期待巩固
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-muted)] leading-relaxed">
                        {entry.content}
                      </p>
                    </div>

                    <div className="text-right font-mono text-[11px] tabular-nums shrink-0">
                      <div
                        className={cn(
                          'font-semibold',
                          entry.retrievabilityPct >= 75
                            ? 'text-[var(--ok)]'
                            : entry.retrievabilityPct >= 50
                              ? 'text-[var(--warn)]'
                              : 'text-[var(--err)]',
                        )}
                      >
                        保持率 {entry.retrievabilityPct}%
                      </div>
                      <div className="text-[var(--ink-subtle)]">
                        EF {entry.easeFactor.toFixed(2)} · 间隔 {formatIntervalHuman(entry.intervalHours)}
                      </div>
                    </div>
                  </div>

                  {/* Retention Bar + Keywords + SM-2 Action Triggers */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            entry.retrievabilityPct >= 75
                              ? 'bg-[var(--ok-dot)]'
                              : entry.retrievabilityPct >= 50
                                ? 'bg-[var(--warn-dot)]'
                                : 'bg-[var(--err-dot)]',
                          )}
                          style={{ width: `${Math.max(4, Math.min(100, entry.retrievabilityPct))}%` }}
                        />
                      </div>
                      <span className="truncate font-mono text-[11px] text-[var(--ink-subtle)]">
                        Keys: {entry.keyPattern.join(', ')} · 命中 {entry.hitCount} 次
                      </span>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleReviewEngram(entry, 5)}
                          title={`按 SM-2 q=5 强化，下次复盘将延展至 ${boostPreview.label}`}
                          data-testid={`engram-reinforce-${entry.id}`}
                        >
                          <CheckCircle2 className="size-3 text-[var(--ok)]" />
                          SM-2 强化 ({boostPreview.label})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleReviewEngram(entry, 1)}
                          title="按 SM-2 q=1 标记遗忘并重置巩固周期"
                        >
                          <RotateCcw className="size-3" />
                          重训
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Right: DSH Multi-Agent Team Collaboration Studio */}
        <Panel
          title="DSH 智能体团队协同编排 (Team Runner)"
          description="融合 DSH 多角色专家团队协作机制与 Engram 查表：先 O(1) 注入团队记忆，再并行 Swarm 拆解执行，最终经加权共识门禁并自动触发 SM-2 强化。"
        >
          {/* Role Roster */}
          <div className="mb-4 divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] pb-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)]">
                <Users className="size-3.5 text-[var(--accent)]" />
                DSH 团队角色编组与投票权重
              </span>
              <span className="font-mono text-[11px] text-[var(--ink-subtle)]">
                策略: {consensusPolicy}
              </span>
            </div>
            {(dshTeamConfig.roles || []).map((role) => {
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
                团队协同任务指令（含 auth / swarm / react flow / pi 等关键词将触发 Engram O(1) 命中）
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
              <label className="inline-flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useEngramLookup}
                  disabled={readOnly}
                  onChange={(e) => setUseEngramLookup(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] accent-[var(--accent)]"
                />
                路由前启用 Engram O(1) 条件记忆查表
              </label>

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

              <div className="text-xs text-[var(--ink-muted)] leading-relaxed">
                {lastRun.task.artifact}
              </div>

              {lastRun.matchedEngrams.length > 0 && (
                <div className="text-[11px] font-mono text-[var(--warn)]">
                  O(1) 命中 Engram ({lastRun.matchedEngrams.length})：
                  {lastRun.matchedEngrams.map((e) => e.id).join(' · ')}（通过后已自动 SM-2 强化）
                </div>
              )}

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
