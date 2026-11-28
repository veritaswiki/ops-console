import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Cpu, Search, X } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AgentProcess, GatewayTelemetryResponse, SnapshotResponse } from '../../types';
import { cn, FOCUS_RING } from '../../lib/cn';
import { formatBytes, formatCompactNumber, formatUptime } from '../../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  InspectorDrawer,
  KpiStrip,
  Panel,
  ResourceMeter,
  SegmentedControl,
  SettingGroup,
  SettingRow,
  StatusIndicator,
  WidgetSkeleton,
} from '../../components/ui';
import { SettingsInsetSurface } from '../../components/settings/SettingsPrimitives';

const ArchitectureGraph = React.lazy(() =>
  import('../../components/ArchitectureGraph').then((m) => ({ default: m.ArchitectureGraph })),
);

const TELEMETRY_MODES = [
  { value: 'tokens', label: 'Token 吞吐 (K)' },
  { value: 'latency', label: 'TTFT / P95 延迟 (ms)' },
] as const;

type TelemetryMode = (typeof TELEMETRY_MODES)[number]['value'];

function formatHourLabel(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

export function GatewaySettingsPanel({
  snapshot,
  telemetry,
  selectedCategory,
  selectedPid,
  onSelectCategory,
  onSelectPid,
}: {
  snapshot: SnapshotResponse | null;
  telemetry: GatewayTelemetryResponse | null;
  selectedCategory: string;
  selectedPid: number | null;
  onSelectCategory?: (category: string) => void;
  onSelectPid?: (pid: number | null) => void;
}) {
  const magpie = snapshot?.magpie;
  const processes = snapshot?.agents?.processes || [];
  const rowRefs = React.useRef<Record<number, HTMLTableRowElement | null>>({});

  const [chartMode, setChartMode] = React.useState<TelemetryMode>('tokens');
  const [procQuery, setProcQuery] = React.useState('');
  const [procSort, setProcSort] = React.useState<'cpu' | 'mem' | 'pid'>('cpu');
  const [procSortDir, setProcSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [graphExpanded, setGraphExpanded] = React.useState(false);
  const [inspectedProc, setInspectedProc] = React.useState<AgentProcess | null>(null);

  React.useEffect(() => {
    if (selectedPid != null && rowRefs.current[selectedPid]) {
      rowRefs.current[selectedPid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPid]);

  const toggleProcSort = (field: 'cpu' | 'mem' | 'pid') => {
    if (procSort === field) {
      setProcSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setProcSort(field);
      setProcSortDir(field === 'pid' ? 'asc' : 'desc');
    }
  };

  const renderProcSortIcon = (field: 'cpu' | 'mem' | 'pid') => {
    if (procSort !== field) {
      return <ArrowUpDown className="size-3 text-[var(--ink-subtle)]/70" strokeWidth={1.75} />;
    }
    return procSortDir === 'asc' ? (
      <ArrowUp className="size-3 text-[var(--accent)]" strokeWidth={2} />
    ) : (
      <ArrowDown className="size-3 text-[var(--accent)]" strokeWidth={2} />
    );
  };

  const filteredProcesses = React.useMemo(() => {
    let base = processes;
    if (selectedPid != null) {
      const pidMatches = processes.filter((p) => p.pid === selectedPid);
      if (pidMatches.length > 0) base = pidMatches;
    } else if (selectedCategory) {
      base = processes.filter(
        (p) => (p.categoryLabel || p.category || 'Agent') === selectedCategory,
      );
    }
    const query = procQuery.trim().toLowerCase();
    if (query) {
      base = base.filter((p) => {
        const hay = `${p.pid} ${p.categoryLabel || p.category || ''} ${p.cmd || p.command || ''}`.toLowerCase();
        return hay.includes(query);
      });
    }
    const dir = procSortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      if (procSort === 'cpu') return ((a.cpu ?? 0) - (b.cpu ?? 0)) * dir;
      if (procSort === 'mem') {
        return ((a.memoryBytes ?? a.rssBytes ?? 0) - (b.memoryBytes ?? b.rssBytes ?? 0)) * dir;
      }
      return (a.pid - b.pid) * dir;
    });
  }, [processes, selectedCategory, selectedPid, procQuery, procSort, procSortDir]);

  const totalProviderCost = React.useMemo(
    () => (telemetry?.providers || []).reduce((sum, item) => sum + (item.costUsd || 0), 0),
    [telemetry?.providers],
  );

  const providers = magpie?.providers || [];
  const totalModels =
    magpie?.totalModels || providers.reduce((sum, item) => sum + (item.count || 0), 0) || 1;
  const registeredMagpieAgents = magpie?.agents || [];
  const summary = telemetry?.summary;
  const budgetPct = summary?.dailyBudgetUsd
    ? Math.min(100, Math.round((summary.estimatedCostUsd24h / summary.dailyBudgetUsd) * 100))
    : 0;

  return (
    <div className="space-y-6" data-testid="settings-section-gateway">
      {summary && (
        <KpiStrip
          asymmetric
          cells={[
            {
              label: '24h 估算成本与预算水位',
              meta: `日预算 $${summary.dailyBudgetUsd.toFixed(0)}`,
              value: `$${summary.estimatedCostUsd24h.toFixed(2)}`,
              ratioPct: budgetPct,
              sub: `累计 ${formatCompactNumber(summary.totalTokens)} Tokens · 缓存命中 ${summary.cacheHitPct}%`,
              tone: budgetPct >= 85 ? 'warn' : 'ok',
            },
            {
              label: '24h 网关请求量',
              value: formatCompactNumber(summary.totalRequests),
              numeric: { primary: summary.totalRequests },
              sub: `异常率 ${summary.errorRatePct}% (429/5xx)`,
              tone: summary.errorRatePct > 2 ? 'warn' : 'ok',
            },
            {
              label: '平均 TTFT 首字延迟',
              value: `${summary.avgTtftMs}ms`,
              numeric: { primary: summary.avgTtftMs, suffix: 'ms' },
              sub: `P95 端到端 ${summary.p95LatencyMs}ms`,
            },
            {
              label: '活跃 Agent 会话',
              value: String(telemetry?.sessions?.length ?? 0),
              numeric: { primary: telemetry?.sessions?.length ?? 0 },
              sub: `${processes.length} 个宿主机进程在线`,
            },
          ]}
        />
      )}

      {telemetry && telemetry.hourly.length > 0 && (
        <Panel
          title="模型网关 24h 吞吐与延迟遥测"
          description="追踪 Prompt / Completion Token 消耗趋势及 TTFT / P95 尾延迟。"
          actions={
            <SegmentedControl
              value={chartMode}
              onChange={setChartMode}
              options={TELEMETRY_MODES}
              ariaLabel="切换网关图表维度"
            />
          }
        >
          <div className="h-[220px] w-full" data-testid="gateway-telemetry-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={telemetry.hourly}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gwPrimaryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gwSecondaryFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ok-dot)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--ok-dot)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="ts"
                  tickFormatter={(value) => formatHourLabel(Number(value))}
                  tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => (chartMode === 'tokens' ? `${value}K` : `${value}ms`)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: 'var(--ink)',
                  }}
                  labelFormatter={(label) => formatHourLabel(Number(label))}
                />
                {chartMode === 'tokens' ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="promptK"
                      name="Prompt (K)"
                      stroke="var(--accent)"
                      strokeWidth={1.75}
                      fill="url(#gwPrimaryFill)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="completionK"
                      name="Completion (K)"
                      stroke="var(--ok-dot)"
                      strokeWidth={1.75}
                      fill="url(#gwSecondaryFill)"
                      isAnimationActive={false}
                    />
                  </>
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="avgTtftMs"
                      name="平均 TTFT (ms)"
                      stroke="var(--accent)"
                      strokeWidth={1.75}
                      fill="url(#gwPrimaryFill)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="p95LatencyMs"
                      name="P95 延迟 (ms)"
                      stroke="var(--warn-dot)"
                      strokeWidth={1.75}
                      fill="url(#gwSecondaryFill)"
                      isAnimationActive={false}
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {telemetry && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Panel
            className="lg:col-span-7"
            bodyClassName="p-0"
            title="上游 Provider 成本与熔断状态"
            description="监控各模型供应商的请求占比、平均 TTFT 与熔断器状态。"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                    <th className="py-2.5 pl-5 sm:pl-6 pr-3">Provider</th>
                    <th className="py-2.5 px-3">熔断器</th>
                    <th className="py-2.5 px-3 text-right">请求 / Token</th>
                    <th className="py-2.5 px-3 text-right">TTFT</th>
                    <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">24h 成本</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {telemetry.providers.map((provider) => {
                    const sharePct =
                      totalProviderCost > 0
                        ? Math.round(((provider.costUsd || 0) / totalProviderCost) * 100)
                        : 0;
                    return (
                      <tr
                        key={provider.name}
                        className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                      >
                        <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)]">
                          {provider.name}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <StatusIndicator
                            status={
                              provider.circuitState === 'closed'
                                ? 'healthy'
                                : provider.circuitState === 'half-open'
                                  ? 'degraded'
                                  : 'failed'
                            }
                            label={
                              provider.circuitState === 'closed'
                                ? '闭合正常'
                                : provider.circuitState === 'half-open'
                                  ? '半开探活'
                                  : '已熔断'
                            }
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                          {formatCompactNumber(provider.requests)} · {provider.tokensK}K
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                          {provider.avgTtftMs}ms
                        </td>
                        <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12.5px] font-medium text-[var(--ink)] tabular-nums whitespace-nowrap">
                          <div className="inline-flex flex-col items-end gap-1 min-w-[82px]">
                            <span>
                              ${provider.costUsd.toFixed(2)}
                              <span className="ml-1 text-[11px] font-normal text-[var(--ink-subtle)]">
                                {sharePct}%
                              </span>
                            </span>
                            <span className="w-16 h-[2px] rounded-full bg-[var(--border-subtle)] overflow-hidden">
                              <span
                                className="block h-full bg-[var(--accent)]"
                                style={{ width: `${Math.min(100, sharePct)}%` }}
                              />
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            className="lg:col-span-5"
            title="本地推理加速器 (MLX / GPU)"
            description="监控统一内存 / 显存水位、温度及常驻本地模型。"
          >
            {telemetry.accelerators.length === 0 ? (
              <EmptyState message="未检测到本地推理加速器。" />
            ) : (
              <div className="space-y-4">
                {telemetry.accelerators.map((acc) => {
                  const vramPct =
                    acc.vramTotalGb > 0 ? Math.round((acc.vramUsedGb / acc.vramTotalGb) * 100) : 0;
                  return (
                    <div key={acc.id} className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium text-[13.5px] text-[var(--ink)]">
                            <Cpu className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{acc.name}</span>
                          </div>
                          <div className="mt-0.5 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                            {acc.backend} · {acc.tempC}°C
                          </div>
                        </div>
                        <span className="font-mono text-[12px] font-medium text-[var(--ink)] tabular-nums shrink-0">
                          计算 {acc.utilizationPct}%
                        </span>
                      </div>
                      <ResourceMeter
                        label="显存 / 统一内存"
                        value={vramPct}
                        valueText={`${acc.vramUsedGb} / ${acc.vramTotalGb} GB (${vramPct}%)`}
                      />
                      {acc.activeModels.length > 0 && (
                        <div
                          className="font-mono text-[11.5px] text-[var(--ink-muted)] truncate"
                          title={acc.activeModels.join(', ')}
                        >
                          常驻模型：{acc.activeModels.join(' · ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {telemetry && telemetry.sessions.length > 0 && (
        <Panel
          title="活跃 Agent 会话与上下文水位"
          description="追踪自主代理会话、工具调用成功率与上下文窗口占用。"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 sm:pl-6 pr-3">会话 / Agent</th>
                  <th className="py-2.5 px-3">当前模型</th>
                  <th className="py-2.5 px-3">状态</th>
                  <th className="py-2.5 px-3">上下文水位</th>
                  <th className="py-2.5 px-3 text-right">工具调用</th>
                  <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">时长 / 内存</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {telemetry.sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                  >
                    <td className="py-2.5 pl-5 sm:pl-6 pr-3">
                      <div className="font-medium text-[var(--ink)]">{session.agent}</div>
                      <div className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                        {session.id}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]">
                      {session.model}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusIndicator
                        status={session.state === 'running' ? 'healthy' : 'standby'}
                        label={session.state === 'running' ? '推理中' : '待机'}
                      />
                    </td>
                    <td className="py-2.5 px-3 min-w-[140px]">
                      <ResourceMeter
                        value={session.contextPct}
                        valueText={`${session.contextPct}%`}
                        tone={session.contextPct >= 80 ? 'warn' : 'ok'}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                      {session.toolCalls} 次
                      {session.failedTools > 0 && (
                        <span className="ml-1 text-[var(--err)]">({session.failedTools} 失败)</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
                      {formatUptime(session.uptimeSec)} · {session.memoryMb}MB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <SettingGroup
        title="Agent 路由与模型分发图谱"
        description="按需展开交互式分发拓扑；点击任意进程分组可筛选下方活跃进程。"
      >
        <SettingRow
          title="交互式模型分发图谱"
          description="默认折叠以保持设置页视觉留白与低认知负荷。"
          onClick={() => setGraphExpanded((prev) => !prev)}
          control={
            <span className="text-[12.5px] font-medium text-[var(--ink-muted)]">
              {graphExpanded ? '收起图谱' : '展开图谱'}
            </span>
          }
        />
        {graphExpanded && (
          <div className="p-5 sm:p-6">
            <React.Suspense
              fallback={<WidgetSkeleton heightClass="h-[380px]" label="正在加载 Agent 分发图谱" />}
            >
              <ArchitectureGraph
                snapshot={snapshot}
                mode="agents"
                onSelectAgentCategory={onSelectCategory}
              />
            </React.Suspense>
          </div>
        )}
      </SettingGroup>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Panel
          className="lg:col-span-6"
          title="Magpie 模型供给分布"
          description={magpie?.protocol || 'OpenAI Compatible /v1/models'}
          actions={
            <StatusIndicator status={magpie?.status || (magpie?.reachable ? 'healthy' : 'offline')} />
          }
        >
          {providers.length === 0 ? (
            <EmptyState message="暂无可用的模型渠道目录。" />
          ) : (
            <div className="space-y-3.5">
              {providers.map((provider) => (
                <ResourceMeter
                  key={provider.name}
                  label={provider.name}
                  value={(provider.count / totalModels) * 100}
                  valueText={`${formatCompactNumber(provider.count)} 模型`}
                  tone="ok"
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          className="lg:col-span-6"
          title="注册 Agent 与共享 MCP 库"
          description="异步采集自 Magpie 网关注册表与 MCP Hub。"
        >
          {registeredMagpieAgents.length > 0 ? (
            <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
              {registeredMagpieAgents.slice(0, 6).map((item, idx) => (
                <li
                  key={item.id || item.name || idx}
                  className="py-2.5 first:pt-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 flex items-baseline gap-2">
                    <span
                      className="font-medium text-[var(--ink)] truncate"
                      title={item.name || item.id}
                    >
                      {item.name || item.id}
                    </span>
                    {item.model && (
                      <span
                        className="font-mono text-[12px] text-[var(--ink-subtle)] truncate"
                        title={item.model}
                      >
                        {item.model}
                      </span>
                    )}
                  </div>
                  <StatusIndicator
                    status={item.status || (item.active === false ? 'standby' : 'healthy')}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--ink-subtle)]">未发现已注册的 Magpie Agent 桥接。</p>
          )}
        </Panel>
      </div>

      <Panel
        title="本地活跃 Agent 进程"
        description="点击任意进程行可在右侧抽屉查看完整命令行与资源占用。"
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-52">
              <Search
                className="size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={procQuery}
                onChange={(e) => setProcQuery(e.target.value)}
                placeholder="过滤 PID 或命令行..."
                aria-label="过滤 Agent 进程"
                className={cn('h-9 sm:h-8 w-full pl-8 pr-2.5', inputBaseClass)}
              />
            </div>
            {selectedPid != null && onSelectPid && (
              <button
                type="button"
                data-testid="clear-pid-filter"
                onClick={() => onSelectPid(null)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[12.5px] font-mono font-medium text-[var(--accent)] cursor-pointer select-none',
                  FOCUS_RING,
                )}
              >
                <span className="tabular-nums">PID {selectedPid}</span>
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            )}
            {selectedCategory && onSelectCategory && (
              <button
                type="button"
                onClick={() => onSelectCategory('')}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[12.5px] font-medium text-[var(--ink)] cursor-pointer select-none',
                  FOCUS_RING,
                )}
              >
                <span>筛选：{selectedCategory}</span>
                <X className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
              </button>
            )}
          </div>
        }
      >
        {filteredProcesses.length === 0 ? (
          <EmptyState
            title="未匹配到活跃进程"
            message="当前主机没有匹配到活跃 Agent 进程。"
            action={
              selectedCategory || selectedPid != null || procQuery.trim()
                ? {
                    label: '清除筛选',
                    onClick: () => {
                      setProcQuery('');
                      onSelectPid?.(null);
                      onSelectCategory?.('');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 sm:pl-6 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleProcSort('pid')}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-[var(--ink)] cursor-pointer',
                        FOCUS_RING,
                      )}
                    >
                      PID
                      {renderProcSortIcon('pid')}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">分类</th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleProcSort('cpu')}
                      className={cn(
                        'inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] cursor-pointer',
                        FOCUS_RING,
                      )}
                    >
                      CPU
                      {renderProcSortIcon('cpu')}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleProcSort('mem')}
                      className={cn(
                        'inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] cursor-pointer',
                        FOCUS_RING,
                      )}
                    >
                      内存
                      {renderProcSortIcon('mem')}
                    </button>
                  </th>
                  <th className="py-2.5 pl-3 pr-5 sm:pr-6">命令行</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {filteredProcesses.map((proc) => {
                  const isPidSelected = selectedPid === proc.pid;
                  return (
                    <tr
                      key={proc.pid}
                      ref={(el) => {
                        rowRefs.current[proc.pid] = el;
                      }}
                      data-pid={proc.pid}
                      data-selected-pid={isPidSelected ? 'true' : undefined}
                      onClick={() => setInspectedProc(proc)}
                      className={cn(
                        'cursor-pointer transition-colors duration-150 ease-out',
                        isPidSelected
                          ? 'bg-[var(--accent-soft)]'
                          : 'hover:bg-[var(--surface-hover)]',
                      )}
                    >
                      <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12.5px] font-medium text-[var(--ink)] tabular-nums">
                        {proc.pid}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[var(--ink)] whitespace-nowrap">
                        {proc.categoryLabel || proc.category || 'Agent'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[12.5px] text-[var(--ink)] tabular-nums whitespace-nowrap">
                        {proc.cpu != null ? `${Number(proc.cpu).toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                        {formatBytes(proc.memoryBytes ?? proc.rssBytes)}
                      </td>
                      <td
                        className="py-2.5 pl-3 pr-5 sm:pr-6 font-mono text-[12px] text-[var(--ink-muted)] max-w-[460px] truncate"
                        title={proc.cmd || proc.command}
                      >
                        {proc.cmd || proc.command || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <InspectorDrawer
        open={Boolean(inspectedProc)}
        onOpenChange={(open) => {
          if (!open) setInspectedProc(null);
        }}
        title={inspectedProc ? `进程详情 · PID ${inspectedProc.pid}` : '进程详情'}
        description={inspectedProc?.categoryLabel || inspectedProc?.category || 'Agent 运行时进程'}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setInspectedProc(null)}>
            关闭
          </Button>
        }
      >
        {inspectedProc && (
          <div className="space-y-4">
            <SettingsInsetSurface>
              <div className="grid grid-cols-3 gap-3 text-[12px]">
                <div>
                  <div className="text-[var(--ink-subtle)]">PID</div>
                  <div className="font-mono text-[var(--ink)] tabular-nums">{inspectedProc.pid}</div>
                </div>
                <div>
                  <div className="text-[var(--ink-subtle)]">CPU 占用</div>
                  <div className="font-mono text-[var(--ink)] tabular-nums">
                    {inspectedProc.cpu != null ? `${Number(inspectedProc.cpu).toFixed(1)}%` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--ink-subtle)]">常驻内存</div>
                  <div className="font-mono text-[var(--ink)] tabular-nums">
                    {formatBytes(inspectedProc.memoryBytes ?? inspectedProc.rssBytes)}
                  </div>
                </div>
              </div>
            </SettingsInsetSurface>
            <div className="space-y-1.5">
              <div className="text-[12px] font-medium text-[var(--ink-muted)]">完整命令行</div>
              <pre className="p-3.5 rounded-xl bg-[var(--surface-subtle)]/70 font-mono text-[12px] leading-relaxed text-[var(--ink)] whitespace-pre-wrap break-all">
                {inspectedProc.cmd || inspectedProc.command || '-'}
              </pre>
            </div>
          </div>
        )}
      </InspectorDrawer>
    </div>
  );
}
