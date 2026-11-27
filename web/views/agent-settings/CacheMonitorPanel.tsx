import React from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  ChevronRight,
  RefreshCw,
  Search,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  CacheMonitorBucket,
  CacheMonitorConfig,
  CacheMonitorStatusResponse,
  DecisionAdvisorDiagnosis,
  StatusTone,
} from '../../types';
import {
  fetchCacheMonitorStatus,
  triggerCacheMonitorAnalysis,
  updateCacheMonitorConfig,
} from '../../api';
import { cn, FOCUS_RING } from '../../lib/cn';
import {
  classifyCacheHealth,
  extractDriftClues,
  filterCacheBuckets,
  formatBudgetUsage,
  formatCacheHitPct,
  sortCacheBuckets,
  type CacheSortMode,
} from '../../lib/cache-monitor';
import { formatBytes, formatCompactNumber, formatDateTime } from '../../utils/format';
import {
  Button,
  CommandCombobox,
  type CommandComboboxOption,
  EmptyState,
  ErrorState,
  inputBaseClass,
  InspectorDrawer,
  KpiStrip,
  NativeSelect,
  SegmentedControl,
  SettingGroup,
  SettingRow,
  StatusIndicator,
  ToggleSwitch,
  WidgetSkeleton,
} from '../../components/ui';

const DEFAULT_DECISION_MODEL = 'auto/deepseek-v4.1-flash';

const SORT_OPTIONS: ReadonlyArray<{ value: CacheSortMode; label: string }> = [
  { value: 'anomaly', label: '异常优先' },
  { value: 'hit-asc', label: '命中率升序' },
  { value: 'requests-desc', label: '请求量降序' },
];

const INTERVAL_PRESETS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: '仅异常触发' },
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
];

function healthToTone(health: ReturnType<typeof classifyCacheHealth>): StatusTone {
  if (health === 'critical') return 'err';
  if (health === 'warn') return 'warn';
  if (health === 'healthy') return 'ok';
  return 'muted';
}

function healthToStatus(health: ReturnType<typeof classifyCacheHealth>): string {
  if (health === 'critical') return 'critical';
  if (health === 'warn') return 'warn';
  if (health === 'healthy') return 'healthy';
  return 'standby';
}

function healthLabel(health: ReturnType<typeof classifyCacheHealth>): string {
  if (health === 'critical') return '严重跌落';
  if (health === 'warn') return '低于阈值';
  if (health === 'healthy') return '健康';
  return '样本不足';
}

function severityToStatus(severity: DecisionAdvisorDiagnosis['severity']): string {
  if (severity === 'critical') return 'critical';
  if (severity === 'warn') return 'warn';
  return 'healthy';
}

function severityLabel(severity: DecisionAdvisorDiagnosis['severity']): string {
  if (severity === 'critical') return '严重';
  if (severity === 'warn') return '告警';
  return '提示';
}

function riskLabel(risk: 'low' | 'medium' | 'high'): string {
  if (risk === 'high') return '高风险';
  if (risk === 'medium') return '中风险';
  return '低风险';
}

function anomalyTypeLabel(type: CacheMonitorBucket['anomalyType']): string {
  if (type === 'sudden_drop_and_low') return '突降且低于阈值';
  if (type === 'sudden_drop') return '短期突降';
  if (type === 'sustained_low') return '持续低于阈值';
  return '正常';
}

function formatHourLabel(ts: number): string {
  try {
    const date = new Date(ts);
    return `${String(date.getHours()).padStart(2, '0')}:00`;
  } catch {
    return '';
  }
}

function skippedReasonLabel(reason: string | null): string | null {
  if (!reason) return null;
  if (reason === 'advisor_disabled') return '决策模型已关闭，已采用 0-token 规则归因';
  if (reason === 'budget_exhausted') return '调用或 Token 预算已耗尽，已回退规则归因';
  if (reason === 'cooldown_active') return '处于冷却窗口内';
  return reason;
}

export interface CacheMonitorPanelProps {
  readOnly?: boolean;
  modelOptions: ReadonlyArray<CommandComboboxOption>;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}

export function CacheMonitorPanel({
  readOnly = false,
  modelOptions,
  onToast,
}: CacheMonitorPanelProps) {
  const [status, setStatus] = React.useState<CacheMonitorStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [draft, setDraft] = React.useState<CacheMonitorConfig | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [analyzingKey, setAnalyzingKey] = React.useState<string | null>(null);

  const [nodeFilter, setNodeFilter] = React.useState<string>('');
  const [query, setQuery] = React.useState('');
  const [onlyAnomalies, setOnlyAnomalies] = React.useState(false);
  const [sortMode, setSortMode] = React.useState<CacheSortMode>('anomaly');

  const [inspectedBucket, setInspectedBucket] = React.useState<CacheMonitorBucket | null>(null);
  const [inspectedDiagnosis, setInspectedDiagnosis] =
    React.useState<DecisionAdvisorDiagnosis | null>(null);

  const loadStatus = React.useCallback(async (silent = false, signal?: AbortSignal) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetchCacheMonitorStatus(signal);
      if (signal?.aborted) return;
      setStatus(res);
      setError(null);
      setDraft((prev) => prev || res.config);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadStatus(false, controller.signal);
    return () => controller.abort();
  }, [loadStatus]);

  const config = draft || status?.config || null;

  const isDirty = React.useMemo(() => {
    if (!draft || !status?.config) return false;
    const baseline = status.config;
    return (
      draft.enabled !== baseline.enabled ||
      draft.advisorEnabled !== baseline.advisorEnabled ||
      draft.decisionModel !== baseline.decisionModel ||
      draft.thresholdPct !== baseline.thresholdPct ||
      draft.dropDeltaPct !== baseline.dropDeltaPct ||
      draft.windowMinutes !== baseline.windowMinutes ||
      draft.minSamples !== baseline.minSamples ||
      draft.analysisIntervalMinutes !== baseline.analysisIntervalMinutes ||
      draft.cooldownMinutes !== baseline.cooldownMinutes ||
      draft.maxCallsPerHour !== baseline.maxCallsPerHour ||
      draft.dailyTokenBudget !== baseline.dailyTokenBudget
    );
  }, [draft, status?.config]);

  const availableNodes = React.useMemo(() => {
    const set = new Set<string>();
    for (const bucket of status?.buckets || []) {
      if (bucket.nodeId) set.add(bucket.nodeId);
    }
    return Array.from(set).sort();
  }, [status?.buckets]);

  const filteredBuckets = React.useMemo(() => {
    const buckets = status?.buckets || [];
    const filtered = filterCacheBuckets(buckets, {
      nodeId: nodeFilter || undefined,
      query,
      onlyAnomalies,
    });
    return sortCacheBuckets(filtered, sortMode);
  }, [status?.buckets, nodeFilter, query, onlyAnomalies, sortMode]);

  const hourlyData = React.useMemo(
    () =>
      (status?.hourly || []).map((point) => ({
        ...point,
        label: formatHourLabel(point.ts),
        requests: Math.round(point.rpm * 60),
      })),
    [status?.hourly],
  );

  const decisionModelOptions = React.useMemo<ReadonlyArray<CommandComboboxOption>>(() => {
    const exists = modelOptions.some((opt) => opt.value === DEFAULT_DECISION_MODEL);
    if (exists) return modelOptions;
    return [
      {
        value: DEFAULT_DECISION_MODEL,
        label: DEFAULT_DECISION_MODEL,
        group: '推荐决策模型',
        meta: '默认',
      },
      ...modelOptions,
    ];
  }, [modelOptions]);

  const handleSaveConfig = async () => {
    if (readOnly || !draft) return;
    setSaving(true);
    try {
      const res = await updateCacheMonitorConfig(draft);
      setDraft(res.config);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              config: res.config,
              advisor: res.advisor ?? prev.advisor,
            }
          : prev,
      );
      onToast?.('缓存监控与决策归因配置已保存', 'ok');
      void loadStatus(true);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '保存配置失败', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async (
    bucketKey: string | null = null,
    mode: 'llm' | 'deterministic' | null = null,
  ) => {
    if (readOnly) return;
    const activeKey = bucketKey || '__top__';
    setAnalyzingKey(activeKey);
    try {
      const res = await triggerCacheMonitorAnalysis({
        key: bucketKey,
        model: draft?.decisionModel || status?.config.decisionModel || null,
        mode,
      });
      if (res.skipped) {
        onToast?.(
          res.skipReason === 'no_cache_samples'
            ? '当前窗口暂无可分析的缓存样本'
            : `已跳过分析：${res.skipReason || 'cooldown'}`,
          'info',
        );
      } else if (res.diagnosis) {
        setInspectedDiagnosis(res.diagnosis);
        onToast?.(
          res.diagnosis.mode === 'llm'
            ? `已完成决策模型归因 (${res.diagnosis.model || DEFAULT_DECISION_MODEL})`
            : '已完成确定性规则归因（0 token）',
          'ok',
        );
        void loadStatus(true);
      }
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '触发归因分析失败', 'err');
    } finally {
      setAnalyzingKey(null);
    }
  };

  if (loading && !status) {
    return (
      <div className="space-y-6" data-testid="settings-section-cache">
        <WidgetSkeleton heightClass="h-[112px]" label="正在加载缓存命中监控" />
        <WidgetSkeleton heightClass="h-[260px]" label="正在加载 24h 命中趋势" />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div data-testid="settings-section-cache">
        <ErrorState
          title="无法加载缓存监控数据"
          message={error}
          onRetry={() => void loadStatus(false)}
          retrying={refreshing}
        />
      </div>
    );
  }

  const summary = status?.summary;
  const advisor = status?.advisor;
  const budget = advisor?.budget;
  const latestDiagnosis = status?.recentDiagnoses?.[0] || null;
  const thresholdPct = status?.config.thresholdPct ?? 75;
  const minSamples = status?.config.minSamples ?? 5;

  const overallHealth = classifyCacheHealth(
    summary?.overallHitPct ?? null,
    thresholdPct,
    summary?.totalRequests ?? 0,
    minSamples,
  );
  const callsUsage = formatBudgetUsage(
    budget?.callsLastHour ?? 0,
    budget?.maxCallsPerHour ?? config?.maxCallsPerHour ?? 12,
  );
  const tokenUsage = formatBudgetUsage(
    budget?.tokensToday ?? 0,
    budget?.dailyTokenBudget ?? config?.dailyTokenBudget ?? 120_000,
  );

  return (
    <div className="space-y-6" data-testid="settings-section-cache">
      <div data-testid="cache-monitor-kpi">
        <KpiStrip
          asymmetric
          cells={[
            {
              label: '全网缓存命中率',
              meta: `阈值 ${thresholdPct}% · 窗口 ${status?.config.windowMinutes ?? 60}m`,
              value: formatCacheHitPct(summary?.overallHitPct ?? null),
              ratioPct: summary?.overallHitPct ?? undefined,
              sub: status?.source.available
                ? `本地 usage.jsonl · 远端节点 ${summary?.remoteNodeCount ?? 0}`
                : `暂无本地 usage 样本 · 远端节点 ${summary?.remoteNodeCount ?? 0}`,
              tone: healthToTone(overallHealth),
            },
            {
              label: '活跃异常桶',
              value: String(summary?.anomalyCount ?? 0),
              numeric: { primary: summary?.anomalyCount ?? 0 },
              sub: `严重 ${summary?.criticalCount ?? 0} · 总桶数 ${summary?.bucketCount ?? 0}`,
              tone:
                (summary?.criticalCount ?? 0) > 0
                  ? 'err'
                  : (summary?.anomalyCount ?? 0) > 0
                    ? 'warn'
                    : 'ok',
            },
            {
              label: '窗口请求与缓存读',
              value: formatCompactNumber(summary?.totalRequests ?? 0),
              numeric: { primary: summary?.totalRequests ?? 0 },
              sub: `Cache Read ${formatCompactNumber(summary?.totalCacheRead ?? 0)} · In ${formatCompactNumber(summary?.totalTokensIn ?? 0)}`,
              tone: 'ok',
            },
            {
              label: '决策归因预算',
              meta: advisor?.enabled ? 'LLM + 规则' : '仅规则 0-token',
              value: `${budget?.callsLastHour ?? 0}/${budget?.maxCallsPerHour ?? config?.maxCallsPerHour ?? 12}`,
              sub: `日 Token ${formatCompactNumber(budget?.tokensToday ?? 0)} / ${formatCompactNumber(budget?.dailyTokenBudget ?? config?.dailyTokenBudget ?? 120_000)}`,
              tone: budget?.exhausted ? 'warn' : advisor?.enabled ? 'ok' : 'muted',
            },
          ]}
        />
      </div>

      <SettingGroup
        title="24 小时缓存命中趋势"
        description="基于本机 Magpie usage.jsonl 增量采集的按小时命中率曲线与告警阈值基线。"
        meta={status?.source.lastReadAt ? `更新于 ${formatDateTime(status.source.lastReadAt)}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadStatus(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn('size-3.5', refreshing && 'animate-spin')}
                strokeWidth={1.75}
              />
              刷新
            </Button>
            {!readOnly && (
              <Button
                variant="primary"
                size="sm"
                data-testid="cache-analyze-now-btn"
                disabled={analyzingKey !== null || (summary?.bucketCount ?? 0) === 0}
                onClick={() => void handleAnalyze(null, null)}
              >
                <Sparkles className="size-3.5" strokeWidth={1.75} />
                {analyzingKey === '__top__' ? '分析中...' : '立即归因分析'}
              </Button>
            )}
          </div>
        }
      >
        <div className="p-5 sm:p-6 space-y-4">
          {latestDiagnosis?.chartAnnotation && (
            <button
              type="button"
              onClick={() => setInspectedDiagnosis(latestDiagnosis)}
              className={cn(
                'w-full text-left rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer',
                latestDiagnosis.chartAnnotation.severity === 'critical'
                  ? 'border-[var(--err)]/30 bg-[var(--err)]/5 hover:bg-[var(--err)]/10'
                  : latestDiagnosis.chartAnnotation.severity === 'warn'
                    ? 'border-[var(--warn)]/30 bg-[var(--warn)]/5 hover:bg-[var(--warn)]/10'
                    : 'border-[var(--border)] bg-[var(--surface-subtle)]/70 hover:bg-[var(--surface-hover)]',
                FOCUS_RING,
              )}
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <StatusIndicator
                  status={severityToStatus(latestDiagnosis.chartAnnotation.severity)}
                  label={latestDiagnosis.chartAnnotation.label}
                />
                <span className="text-[12.5px] text-[var(--ink-muted)] truncate">
                  {latestDiagnosis.chartAnnotation.detail}
                </span>
              </div>
              <ChevronRight className="size-4 shrink-0 text-[var(--ink-subtle)]" strokeWidth={1.75} />
            </button>
          )}

          {hourlyData.some((point) => point.requests > 0 || point.cacheHitPct > 0) ? (
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cacheHitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                    tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown, name: unknown) => {
                      if (name === 'cacheHitPct') return [`${Number(val).toFixed(1)}%`, '缓存命中率'];
                      return [String(val), String(name)];
                    }}
                    labelFormatter={(label) => `时段 ${label}`}
                  />
                  <ReferenceLine
                    y={thresholdPct}
                    stroke="var(--warn)"
                    strokeDasharray="4 4"
                    label={{
                      value: `阈值 ${thresholdPct}%`,
                      position: 'insideTopRight',
                      fill: 'var(--warn)',
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cacheHitPct"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#cacheHitFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="近 24 小时暂无缓存命中时序样本。Magpie 产生带 cache_read / in token 的调用后将自动绘制曲线。" />
          )}
        </div>
      </SettingGroup>

      <SettingGroup
        title="多机 Agent × 模型缓存分布"
        description="按节点、Agent 与模型维度聚合命中率、突降幅度与 5 类失效线索（系统提示/工具定义/路由/端点/会话间隔）。"
        meta={`${filteredBuckets.length} / ${status?.buckets.length ?? 0} 桶`}
        actions={
          <SegmentedControl
            value={sortMode}
            onChange={setSortMode}
            options={SORT_OPTIONS}
            ariaLabel="缓存桶排序方式"
          />
        }
      >
        <div className="px-5 sm:px-6 py-3.5 border-b border-[var(--border-subtle)] flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="size-3.5 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="筛选节点、Agent 或模型..."
              aria-label="筛选节点、Agent 或模型"
              className={cn(inputBaseClass, 'h-8 pl-8 pr-3 text-[12.5px]')}
            />
          </div>
          {availableNodes.length > 1 && (
            <NativeSelect
              value={nodeFilter}
              onChange={(event) => setNodeFilter(event.target.value)}
              aria-label="按节点筛选"
              className="h-8 text-[12.5px] w-auto min-w-[130px]"
            >
              <option value="">全部节点 ({availableNodes.length})</option>
              {availableNodes.map((nodeId) => (
                <option key={nodeId} value={nodeId}>
                  {nodeId}
                </option>
              ))}
            </NativeSelect>
          )}
          <button
            type="button"
            onClick={() => setOnlyAnomalies((prev) => !prev)}
            aria-pressed={onlyAnomalies}
            className={cn(
              'h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors duration-150 cursor-pointer',
              onlyAnomalies
                ? 'bg-[var(--warn)]/12 text-[var(--warn)] border-[var(--warn)]/35'
                : 'bg-transparent text-[var(--ink-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
              FOCUS_RING,
            )}
          >
            仅看异常 ({summary?.anomalyCount ?? 0})
          </button>
        </div>

        {filteredBuckets.length === 0 ? (
          <EmptyState
            message={
              (status?.buckets.length ?? 0) === 0
                ? '当前滑动窗口内暂无 Agent × 模型缓存记录。'
                : '没有符合当前筛选条件的缓存桶。'
            }
          />
        ) : (
          <div className="overflow-x-auto" data-testid="cache-monitor-table">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 sm:pl-6 pr-3">节点 / Agent / 模型</th>
                  <th className="py-2.5 px-3">命中率与状态</th>
                  <th className="py-2.5 px-3 text-right">请求 / 缓存读</th>
                  <th className="py-2.5 px-3">失效线索</th>
                  <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {filteredBuckets.map((bucket) => {
                  const health = classifyCacheHealth(
                    bucket.cacheHitPct,
                    thresholdPct,
                    bucket.requests,
                    minSamples,
                  );
                  const clues = extractDriftClues(bucket);
                  const isRowAnalyzing = analyzingKey === bucket.key;
                  return (
                    <tr
                      key={bucket.key}
                      className="hover:bg-[var(--surface-hover)]/65 transition-colors duration-150"
                    >
                      <td className="py-3 pl-5 sm:pl-6 pr-3 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--ink-muted)]">
                            {bucket.nodeId}
                          </span>
                          <span className="font-medium text-[var(--ink)]">{bucket.agent}</span>
                        </div>
                        <div className="mt-0.5 font-mono text-[12px] text-[var(--ink-muted)] break-all">
                          {bucket.model}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold tabular-nums text-[var(--ink)]">
                            {formatCacheHitPct(bucket.cacheHitPct)}
                          </span>
                          <StatusIndicator
                            status={healthToStatus(health)}
                            label={
                              bucket.anomalyType
                                ? anomalyTypeLabel(bucket.anomalyType)
                                : healthLabel(health)
                            }
                          />
                        </div>
                        {bucket.dropPct > 0 && (
                          <div className="mt-0.5 text-[11.5px] font-mono text-[var(--warn)] tabular-nums">
                            降幅 -{bucket.dropPct.toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono text-[12.5px] tabular-nums whitespace-nowrap">
                        <div className="text-[var(--ink)]">{formatCompactNumber(bucket.requests)} req</div>
                        <div className="text-[11.5px] text-[var(--ink-subtle)]">
                          read {formatCompactNumber(bucket.cacheRead)}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        {clues.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {clues.slice(0, 3).map((clue) => (
                              <span
                                key={clue.key}
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11.5px] font-medium border',
                                  clue.tone === 'warn'
                                    ? 'bg-[var(--warn)]/10 text-[var(--warn)] border-[var(--warn)]/25'
                                    : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] border-[var(--border-subtle)]',
                                )}
                              >
                                {clue.label} ×{clue.count}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[12px] text-[var(--ink-subtle)]">无明显漂移</span>
                        )}
                      </td>
                      <td className="py-3 pl-3 pr-5 sm:pr-6 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectedBucket(bucket)}
                          >
                            详情
                          </Button>
                          {!readOnly && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={analyzingKey !== null}
                              onClick={() => void handleAnalyze(bucket.key, null)}
                            >
                              {isRowAnalyzing ? '分析中...' : '归因'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SettingGroup>

      <SettingGroup
        title="决策归因记录"
        description="由共享 DecisionAdvisor 生成的只读根因诊断与处置建议；每条建议均标注需人工审批，不会自动改动配置。"
        meta={`${status?.recentDiagnoses.length ?? 0} 条记录`}
        actions={
          !readOnly ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={analyzingKey !== null || (summary?.bucketCount ?? 0) === 0}
              onClick={() => void handleAnalyze(null, 'deterministic')}
            >
              仅规则巡检 (0-token)
            </Button>
          ) : undefined
        }
      >
        {(status?.recentDiagnoses.length ?? 0) === 0 ? (
          <EmptyState message="暂无归因记录。当命中率触发阈值告警或手动点击「立即归因分析」后，诊断结果将展示在此处。" />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {(status?.recentDiagnoses || []).slice(0, 8).map((diag) => (
              <SettingRow
                key={diag.id}
                title={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <StatusIndicator
                      status={severityToStatus(diag.severity)}
                      label={severityLabel(diag.severity)}
                    />
                    <span>{diag.summary}</span>
                  </span>
                }
                description={
                  <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px]">
                    <span>{diag.key}</span>
                    <span>
                      {diag.mode === 'llm'
                        ? `LLM · ${diag.model || diag.configuredModel}`
                        : '确定性规则 (0-token)'}
                    </span>
                    <span>根因 {diag.rootCauses.length} 项 · 建议 {diag.suggestedActions.length} 项</span>
                    <span>{formatDateTime(diag.createdAt)}</span>
                  </span>
                }
                onClick={() => setInspectedDiagnosis(diag)}
              />
            ))}
          </div>
        )}
      </SettingGroup>

      {config && (
        <SettingGroup
          title="监控策略与决策模型配置"
          description="调整命中率告警阈值、巡检节奏与可选决策模型预算；配置持久化在控制台数据目录中。"
          actions={
            !readOnly && isDirty ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => status?.config && setDraft(status.config)}
                  disabled={saving}
                >
                  重置
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="cache-save-config-btn"
                  onClick={() => void handleSaveConfig()}
                  disabled={saving}
                >
                  {saving ? '保存中...' : '保存配置'}
                </Button>
              </div>
            ) : undefined
          }
        >
          <div className="divide-y divide-[var(--border-subtle)]">
            <SettingRow
              title="启用运行时缓存监控"
              description="持续增量读取本机 Magpie usage.jsonl 并聚合远端在线探针上报的缓存命中指标。"
              control={
                <ToggleSwitch
                  checked={config.enabled}
                  disabled={readOnly}
                  onCheckedChange={(checked) => setDraft({ ...config, enabled: checked })}
                  label={config.enabled ? '已开启' : '已关闭'}
                  ariaLabel="启用运行时缓存监控"
                  testId="cache-monitor-enabled-toggle"
                />
              }
            />
            <SettingRow
              title="启用决策模型自动归因"
              description="开启后将在异常触发或定期巡检时调用指定决策模型输出结构化根因与只读建议；关闭时保留 0-token 规则归因。"
              control={
                <ToggleSwitch
                  checked={config.advisorEnabled}
                  disabled={readOnly}
                  onCheckedChange={(checked) => setDraft({ ...config, advisorEnabled: checked })}
                  label={config.advisorEnabled ? 'LLM 归因开启' : '仅规则'}
                  ariaLabel="启用决策模型自动归因"
                  testId="cache-advisor-toggle"
                />
              }
            />
            <SettingRow
              title="决策归因模型"
              description="复用在线节点与 Magpie 网关模型目录，也支持自定义输入网关路由标识（默认 auto/deepseek-v4.1-flash）。"
              stacked
              control={
                <CommandCombobox
                  value={config.decisionModel}
                  onChange={(nextModel) => setDraft({ ...config, decisionModel: nextModel })}
                  options={decisionModelOptions}
                  allowCustomValue
                  disabled={readOnly}
                  placeholder="选择或输入决策模型..."
                  searchPlaceholder="搜索网关或在线节点模型..."
                  ariaLabel="决策归因模型"
                  testId="cache-decision-model-combobox"
                />
              }
            />
            <SettingRow
              title="告警阈值与滑动窗口"
              description="命中率低于告警阈值或短期突降超过降幅阈值（且满足最小样本数）即判定为异常桶。"
              stacked
              control={
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                  <label className="space-y-1">
                    <span className="text-[11.5px] text-[var(--ink-muted)]">告警阈值 (%)</span>
                    <input
                      type="number"
                      min={5}
                      max={99}
                      disabled={readOnly}
                      value={config.thresholdPct}
                      onChange={(event) =>
                        setDraft({
                          ...config,
                          thresholdPct: Math.max(5, Math.min(99, Number(event.target.value) || 75)),
                        })
                      }
                      className={cn(inputBaseClass, 'h-8 px-2.5 text-[12.5px] font-mono tabular-nums')}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11.5px] text-[var(--ink-muted)]">突降阈值 (%)</span>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      disabled={readOnly}
                      value={config.dropDeltaPct}
                      onChange={(event) =>
                        setDraft({
                          ...config,
                          dropDeltaPct: Math.max(5, Math.min(90, Number(event.target.value) || 20)),
                        })
                      }
                      className={cn(inputBaseClass, 'h-8 px-2.5 text-[12.5px] font-mono tabular-nums')}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11.5px] text-[var(--ink-muted)]">滑动窗口 (分钟)</span>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      disabled={readOnly}
                      value={config.windowMinutes}
                      onChange={(event) =>
                        setDraft({
                          ...config,
                          windowMinutes: Math.max(
                            5,
                            Math.min(1440, Number(event.target.value) || 60),
                          ),
                        })
                      }
                      className={cn(inputBaseClass, 'h-8 px-2.5 text-[12.5px] font-mono tabular-nums')}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11.5px] text-[var(--ink-muted)]">最小样本数</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      disabled={readOnly}
                      value={config.minSamples}
                      onChange={(event) =>
                        setDraft({
                          ...config,
                          minSamples: Math.max(1, Math.min(500, Number(event.target.value) || 5)),
                        })
                      }
                      className={cn(inputBaseClass, 'h-8 px-2.5 text-[12.5px] font-mono tabular-nums')}
                    />
                  </label>
                </div>
              }
            />
            <SettingRow
              title="定期巡检间隔"
              description="除异常实时触发外，可按固定间隔对最异常桶运行一次巡检归因；设为 0 表示仅异常时触发。"
              control={
                <div className="flex flex-wrap items-center gap-1.5">
                  {INTERVAL_PRESETS.map((preset) => {
                    const active = config.analysisIntervalMinutes === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          setDraft({ ...config, analysisIntervalMinutes: preset.value })
                        }
                        className={cn(
                          'h-7 px-2.5 rounded-lg text-[12px] font-medium border transition-colors duration-150 cursor-pointer disabled:opacity-50',
                          active
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/35'
                            : 'bg-transparent text-[var(--ink-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                          FOCUS_RING,
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              }
            />
            <SettingRow
              title="调用冷却与预算护栏"
              description="硬上限保护：同一异常键在冷却期内去重（除非严重度升级），超出小时调用或日 Token 预算时自动回退规则引擎。"
              stacked
              control={
                <div className="space-y-3 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="text-[11.5px] text-[var(--ink-muted)]">冷却时间 (分钟)</span>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        disabled={readOnly}
                        value={config.cooldownMinutes}
                        onChange={(event) =>
                          setDraft({
                            ...config,
                            cooldownMinutes: Math.max(
                              1,
                              Math.min(1440, Number(event.target.value) || 15),
                            ),
                          })
                        }
                        className={cn(inputBaseClass, 'h-8 px-2.5 text-[12.5px] font-mono tabular-nums')}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11.5px] text-[var(--ink-muted)]">每小时调用上限</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        disabled={readOnly}
                        value={config.maxCallsPerHour}
                        onChange={(event) =>
                          setDraft({
                            ...config,
                            maxCallsPerHour: Math.max(
                              1,
                              Math.min(120, Number(event.target.value) || 12),
                            ),
                          })
                        }
                        className={cn(inputBaseClass, 'h-8 px-2.5 text-[12.5px] font-mono tabular-nums')}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11.5px] text-[var(--ink-muted)]">每日 Token 预算</span>
                      <input
                        type="number"
                        min={1000}
                        max={2000000}
                        step={10000}
                        disabled={readOnly}
                        value={config.dailyTokenBudget}
                        onChange={(event) =>
                          setDraft({
                            ...config,
                            dailyTokenBudget: Math.max(
                              1000,
                              Math.min(2_000_000, Number(event.target.value) || 120_000),
                            ),
                          })
                        }
                        className={cn(inputBaseClass, 'h-8 px-2.5 text-[12.5px] font-mono tabular-nums')}
                      />
                    </label>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-subtle)]/75 border border-[var(--border-subtle)] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                    <span className="text-[var(--ink-muted)] inline-flex items-center gap-1.5">
                      <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                      当前小时已用 {callsUsage.label} ({budget?.callsLastHour ?? 0}/{budget?.maxCallsPerHour ?? config.maxCallsPerHour})
                    </span>
                    <span className="font-mono text-[var(--ink-muted)] tabular-nums">
                      今日 Token 已用 {tokenUsage.label} ({formatCompactNumber(budget?.tokensToday ?? 0)} / {formatCompactNumber(budget?.dailyTokenBudget ?? config.dailyTokenBudget)})
                    </span>
                  </div>
                </div>
              }
            />
          </div>
        </SettingGroup>
      )}

      <InspectorDrawer
        open={inspectedBucket !== null}
        onOpenChange={(open) => {
          if (!open) setInspectedBucket(null);
        }}
        title={inspectedBucket ? `${inspectedBucket.agent} · ${inspectedBucket.model}` : '缓存桶详情'}
        description={
          inspectedBucket
            ? `节点 ${inspectedBucket.nodeId} (${inspectedBucket.source === 'probe' ? '远端探针' : '本地 usage.jsonl'}) · 最近样本 ${formatDateTime(inspectedBucket.lastSeenAt)}`
            : undefined
        }
        size="lg"
        testId="cache-bucket-drawer"
        footer={
          inspectedBucket && !readOnly ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setInspectedBucket(null)}>
                关闭
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={analyzingKey !== null}
                onClick={() => {
                  const targetKey = inspectedBucket.key;
                  setInspectedBucket(null);
                  void handleAnalyze(targetKey, null);
                }}
              >
                <BrainCircuit className="size-3.5" strokeWidth={1.75} />
                运行根因归因
              </Button>
            </>
          ) : undefined
        }
      >
        {inspectedBucket && (
          <div className="space-y-5 text-[13px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="text-[11.5px] text-[var(--ink-subtle)]">当前命中率</div>
                <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[var(--ink)]">
                  {formatCacheHitPct(inspectedBucket.cacheHitPct)}
                </div>
                <div className="text-[11px] text-[var(--ink-muted)] font-mono">
                  基线 {formatCacheHitPct(inspectedBucket.baselineHitPct)} → 近段 {formatCacheHitPct(inspectedBucket.recentHitPct)}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="text-[11.5px] text-[var(--ink-subtle)]">请求与错误率</div>
                <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[var(--ink)]">
                  {formatCompactNumber(inspectedBucket.requests)}
                </div>
                <div className="text-[11px] text-[var(--ink-muted)] font-mono">
                  错误 {inspectedBucket.errorCount} ({inspectedBucket.errorRatePct}%)
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <div className="text-[11.5px] text-[var(--ink-subtle)]">时延 (TTFT / P95)</div>
                <div className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[var(--ink)]">
                  {inspectedBucket.avgTtftMs} ms
                </div>
                <div className="text-[11px] text-[var(--ink-muted)] font-mono">
                  P95 {inspectedBucket.p95LatencyMs} ms
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-[var(--ink)]">Token 构成</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[12px] tabular-nums">
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
                  <div className="text-[11px] text-[var(--ink-subtle)]">Cache Read</div>
                  <div className="font-semibold text-[var(--ink)]">
                    {formatCompactNumber(inspectedBucket.cacheRead)}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
                  <div className="text-[11px] text-[var(--ink-subtle)]">Cache Write</div>
                  <div className="font-semibold text-[var(--ink)]">
                    {formatCompactNumber(inspectedBucket.cacheWrite)}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
                  <div className="text-[11px] text-[var(--ink-subtle)]">Uncached In</div>
                  <div className="font-semibold text-[var(--ink)]">
                    {formatCompactNumber(inspectedBucket.tokensIn)}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
                  <div className="text-[11px] text-[var(--ink-subtle)]">Output</div>
                  <div className="font-semibold text-[var(--ink)]">
                    {formatCompactNumber(inspectedBucket.tokensOut)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-[var(--ink)]">5 类缓存失效漂移信号</div>
              <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border-subtle)] text-[12.5px]">
                <div className="px-3.5 py-2 flex items-center justify-between">
                  <span className="text-[var(--ink-muted)]">System Prompt 长度抖动</span>
                  <span className="font-mono tabular-nums text-[var(--ink)]">
                    {inspectedBucket.systemDriftCount} 次 · 累计变动 {formatBytes(inspectedBucket.systemDeltaBytes)}
                  </span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between">
                  <span className="text-[var(--ink-muted)]">Tools / MCP Schema 变更</span>
                  <span className="font-mono tabular-nums text-[var(--ink)]">
                    {inspectedBucket.toolsDriftCount} 次 · 累计变动 {formatBytes(inspectedBucket.toolsDeltaBytes)}
                  </span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between">
                  <span className="text-[var(--ink-muted)]">上游 Provider / 实际模型路由切换</span>
                  <span className="font-mono tabular-nums text-[var(--ink)]">
                    {inspectedBucket.routeSwitchCount} 次
                  </span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between">
                  <span className="text-[var(--ink-muted)]">网关协议端点切换 (ep)</span>
                  <span className="font-mono tabular-nums text-[var(--ink)]">
                    {inspectedBucket.epSwitchCount} 次
                  </span>
                </div>
                <div className="px-3.5 py-2 flex items-center justify-between">
                  <span className="text-[var(--ink-muted)]">超过 TTL 的长会话间隔 (&gt;5m)</span>
                  <span className="font-mono tabular-nums text-[var(--ink)]">
                    {inspectedBucket.longGapCount} 次 · 均间隔 {inspectedBucket.avgSessionGapSec}s
                  </span>
                </div>
              </div>
            </div>

            {(inspectedBucket.uniqueProviders.length > 0 ||
              inspectedBucket.uniqueServedModels.length > 0 ||
              inspectedBucket.endpoints.length > 0) && (
              <div className="space-y-2">
                <div className="text-[12px] font-semibold text-[var(--ink)]">脱敏路由元数据</div>
                <div className="rounded-xl bg-[var(--surface-subtle)] px-3.5 py-2.5 space-y-1 text-[12px] font-mono text-[var(--ink-muted)]">
                  {inspectedBucket.uniqueProviders.length > 0 && (
                    <div>Providers: {inspectedBucket.uniqueProviders.join(', ')}</div>
                  )}
                  {inspectedBucket.uniqueServedModels.length > 0 && (
                    <div>Served: {inspectedBucket.uniqueServedModels.join(', ')}</div>
                  )}
                  {inspectedBucket.endpoints.length > 0 && (
                    <div>Endpoints: {inspectedBucket.endpoints.join(', ')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </InspectorDrawer>

      <InspectorDrawer
        open={inspectedDiagnosis !== null}
        onOpenChange={(open) => {
          if (!open) setInspectedDiagnosis(null);
        }}
        title="缓存根因归因报告"
        description={
          inspectedDiagnosis
            ? `${inspectedDiagnosis.key} · ${formatDateTime(inspectedDiagnosis.createdAt)}`
            : undefined
        }
        meta={
          inspectedDiagnosis
            ? inspectedDiagnosis.mode === 'llm'
              ? `LLM (${inspectedDiagnosis.model || inspectedDiagnosis.configuredModel})`
              : '确定性规则'
            : undefined
        }
        size="lg"
        testId="cache-diagnosis-drawer"
      >
        {inspectedDiagnosis && (
          <div className="space-y-5 text-[13px]">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/65 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusIndicator
                  status={severityToStatus(inspectedDiagnosis.severity)}
                  label={`${severityLabel(inspectedDiagnosis.severity)} · 置信度 ${Math.round(inspectedDiagnosis.confidence * 100)}%`}
                />
                <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                  {inspectedDiagnosis.mode === 'llm'
                    ? `in ${inspectedDiagnosis.inputTokens} / out ${inspectedDiagnosis.outputTokens} tok · ${inspectedDiagnosis.latencyMs}ms`
                    : '0 token'}
                </span>
              </div>
              <p className="text-[13.5px] font-medium text-[var(--ink)] leading-relaxed">
                {inspectedDiagnosis.summary}
              </p>
              {(inspectedDiagnosis.llmSkippedReason || inspectedDiagnosis.llmError) && (
                <div className="text-[12px] text-[var(--ink-muted)]">
                  {skippedReasonLabel(inspectedDiagnosis.llmSkippedReason) ||
                    `决策模型调用降级：${inspectedDiagnosis.llmError}`}
                </div>
              )}
            </div>

            {inspectedDiagnosis.affectedScopes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[12px] font-semibold text-[var(--ink)]">受影响范围</div>
                <div className="flex flex-wrap gap-1.5">
                  {inspectedDiagnosis.affectedScopes.map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-mono text-[11.5px] text-[var(--ink-muted)]"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-[var(--ink)]">结构化根因分析</div>
              {inspectedDiagnosis.rootCauses.length === 0 ? (
                <p className="text-[12.5px] text-[var(--ink-muted)]">暂无明确根因条目。</p>
              ) : (
                <div className="space-y-2">
                  {inspectedDiagnosis.rootCauses.map((cause, idx) => (
                    <div
                      key={`${cause.category}-${idx}`}
                      className="rounded-xl border border-[var(--border)] p-3.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] font-semibold text-[var(--ink)]">
                          {cause.category}
                        </span>
                        <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                          置信度 {Math.round(cause.confidence * 100)}%
                        </span>
                      </div>
                      {cause.explanation && (
                        <p className="text-[12.5px] text-[var(--ink)] leading-relaxed">
                          {cause.explanation}
                        </p>
                      )}
                      {cause.evidence && (
                        <p className="text-[11.5px] font-mono text-[var(--ink-muted)]">
                          证据：{cause.evidence}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--ink)]">只读处置建议</span>
                <span className="text-[11.5px] text-[var(--ink-subtle)] inline-flex items-center gap-1">
                  <AlertTriangle className="size-3" strokeWidth={1.75} />
                  仅建议，需人工审批确认
                </span>
              </div>
              <div className="space-y-2">
                {inspectedDiagnosis.suggestedActions.map((action, idx) => (
                  <div
                    key={`${action.title}-${idx}`}
                    className="rounded-xl border border-[var(--border)] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--ink)]">{action.title}</span>
                      <span className="text-[11px] font-mono text-[var(--ink-subtle)] shrink-0">
                        {riskLabel(action.risk)} · 需审批
                      </span>
                    </div>
                    {action.commandHint && (
                      <pre className="rounded-lg bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[11.5px] font-mono text-[var(--ink-muted)] overflow-x-auto whitespace-pre-wrap">
                        {action.commandHint}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </InspectorDrawer>
    </div>
  );
}

export default CacheMonitorPanel;
