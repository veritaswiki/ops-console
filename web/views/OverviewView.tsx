import React from 'react';
import { Check, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type {
  IncidentItem,
  LogNavigationRequest,
  ObservabilityStatusResponse,
  SnapshotResponse,
  StatusTone,
} from '../types';
import type { CacheMonitorStatusResponse } from '../types';
import { fetchCacheMonitorStatus, fetchObservabilityStatus } from '../api';
import {
  classifyCacheHealth,
  extractDriftClues,
  formatCacheHitPct,
  sortCacheBuckets,
} from '../lib/cache-monitor';
import {
  classifyObservabilityHealth,
  formatDigestIntervalLabel,
  formatDiskQuota,
} from '../lib/observability';
import { cn, FOCUS_RING } from '../lib/cn';
import {
  DEFAULT_OVERVIEW_PREFS,
  parseOverviewPrefs,
  type OverviewPanelPrefs,
} from '../lib/module-helpers';
import { ModuleFrame } from '../modules/ModuleFrame';
import {
  formatBytes,
  formatCompactNumber,
  formatDateTime,
  formatUptime,
  statusLabel,
  statusTone,
} from '../utils/format';
import {
  Button,
  EmptyState,
  KpiStrip,
  Panel,
  ResourceMeter,
  SegmentedFilter,
  StatusIndicator,
  WidgetSkeleton,
} from '../components/ui';

const OVERVIEW_PREFS_KEY = 'ops-console-overview-prefs-v1';

const PANEL_TOGGLE_ITEMS: ReadonlyArray<{ key: keyof OverviewPanelPrefs; label: string }> = [
  { key: 'metrics', label: '历史指标趋势' },
  { key: 'cache', label: '缓存命中健康' },
  { key: 'observability', label: '联邦日志可观测' },
  { key: 'graph', label: '架构依赖图谱' },
  { key: 'connectors', label: '插件与连接器' },
  { key: 'storageEvents', label: '存储与事件' },
];

const ArchitectureGraph = React.lazy(() =>
  import('../components/ArchitectureGraph').then((m) => ({ default: m.ArchitectureGraph })),
);
const MetricsChart = React.lazy(() =>
  import('../components/MetricsChart').then((m) => ({ default: m.MetricsChart })),
);

const GRAPH_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'services', label: '核心服务' },
  { value: 'memory', label: '记忆链路' },
  { value: 'agents', label: 'Agent 与网关' },
  { value: 'network', label: '网络与底座' },
] as const;

type GraphFilter = (typeof GRAPH_FILTERS)[number]['value'];

export function OverviewView({
  snapshot,
  incidents: persistedIncidents = [],
  onOpenLogs,
  onSelectAgentCategory,
  onOpenPlugins,
  onOpenCacheMonitor,
  onOpenObservability,
}: {
  snapshot: SnapshotResponse | null;
  incidents?: IncidentItem[];
  onOpenLogs: (unitOrRequest: string | LogNavigationRequest) => void;
  onSelectAgentCategory: (category: string) => void;
  onOpenPlugins?: () => void;
  onOpenCacheMonitor?: () => void;
  onOpenObservability?: () => void;
}) {
  const [graphFilter, setGraphFilter] = React.useState<GraphFilter>('all');
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const [cacheStatus, setCacheStatus] = React.useState<CacheMonitorStatusResponse | null>(null);
  const [cacheError, setCacheError] = React.useState(false);
  const [obsStatus, setObsStatus] = React.useState<ObservabilityStatusResponse | null>(null);
  const [obsError, setObsError] = React.useState(false);
  const [panelPrefs, setPanelPrefs] = React.useState<OverviewPanelPrefs>(() => {
    try {
      return parseOverviewPrefs(window.localStorage.getItem(OVERVIEW_PREFS_KEY));
    } catch {
      return { ...DEFAULT_OVERVIEW_PREFS };
    }
  });

  const updatePanelPref = (key: keyof OverviewPanelPrefs) => {
    setPanelPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(OVERVIEW_PREFS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const resetPanelPrefs = () => {
    setPanelPrefs({ ...DEFAULT_OVERVIEW_PREFS });
    try {
      window.localStorage.removeItem(OVERVIEW_PREFS_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const hiddenPanelsCount = PANEL_TOGGLE_ITEMS.filter((p) => !panelPrefs[p.key]).length;

  React.useEffect(() => {
    if (!panelPrefs.cache) return;
    const controller = new AbortController();
    setCacheError(false);
    fetchCacheMonitorStatus(controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setCacheStatus(res);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCacheError(true);
      });
    return () => controller.abort();
  }, [panelPrefs.cache]);

  React.useEffect(() => {
    if (!panelPrefs.observability) return;
    const controller = new AbortController();
    setObsError(false);
    fetchObservabilityStatus(controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setObsStatus(res);
      })
      .catch(() => {
        if (!controller.signal.aborted) setObsError(true);
      });
    return () => controller.abort();
  }, [panelPrefs.observability]);

  const topCacheBuckets = React.useMemo(
    () => sortCacheBuckets(cacheStatus?.buckets || [], 'anomaly').slice(0, 5),
    [cacheStatus?.buckets],
  );

  const obsDiskQuota = React.useMemo(
    () =>
      formatDiskQuota(
        obsStatus?.storage?.totalBytes ?? 0,
        obsStatus?.config?.maxDiskMb ?? obsStatus?.storage?.maxDiskMb ?? 256,
      ),
    [obsStatus?.storage?.totalBytes, obsStatus?.config?.maxDiskMb, obsStatus?.storage?.maxDiskMb],
  );

  const obsHealth = React.useMemo(
    () =>
      classifyObservabilityHealth({
        errorCount: obsStatus?.summary1h?.errorCount,
        newFingerprintCount: obsStatus?.summary1h?.newFingerprintCount,
        restartCount: obsStatus?.summary1h?.restartCount,
        http5xxCount: obsStatus?.summary1h?.http5xxCount,
        diskUsedPct: obsDiskQuota.pct,
      }),
    [obsStatus?.summary1h, obsDiskQuota.pct],
  );

  const host = snapshot?.host;
  const services = snapshot?.services?.items || [];
  const healthySvcs = services.filter((s) => statusTone(s.status) === 'ok').length;
  const failedSvcs = services.filter((s) => statusTone(s.status) === 'err').length;
  const degradedSvcs = services.filter((s) => statusTone(s.status) === 'warn').length;
  const standbySvcs = Math.max(0, services.length - healthySvcs - failedSvcs - degradedSvcs);

  const memEngines = [
    snapshot?.memory?.nmem,
    snapshot?.memory?.openviking,
    snapshot?.memory?.symbiote,
    snapshot?.memory?.rerank,
  ].filter((m) => m?.enabled);
  const memOk = memEngines.filter((m) => m?.reachable).length;

  const fleetSum = snapshot?.fleet?.summary;
  const tsOnline = snapshot?.network?.tailscale?.onlineCount ?? 0;
  const tsTotal = snapshot?.network?.tailscale?.devices?.length ?? 0;
  const modelsCount = snapshot?.magpie?.totalModels ?? 0;

  const load1 = host?.load1 ?? host?.cpu?.load1 ?? host?.loadAvg?.[0];
  const memPct = host?.memory?.usedPercent ?? host?.memory?.usedPct;
  const uptimeSec = host?.uptimeSeconds ?? host?.uptimeSec;

  const hostMeta = host
    ? [
        host.hostname,
        host.os || host.platform,
        uptimeSec != null ? `运行 ${formatUptime(uptimeSec)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '等待采集';

  const svcTone: StatusTone = failedSvcs > 0 ? 'err' : degradedSvcs > 0 ? 'warn' : 'ok';
  const svcRatioPct = services.length > 0 ? Math.round((healthySvcs / services.length) * 100) : 0;

  const connectors = React.useMemo(() => {
    const list: Array<{
      id?: string;
      name: string;
      status?: string;
      latencyMs?: number | null;
      metric: string;
    }> = [];

    if (Array.isArray(snapshot?.connectors) && snapshot.connectors.length > 0) {
      for (const c of snapshot.connectors) {
        list.push({
          id: c.id || c.name,
          name: c.name,
          status: c.status,
          latencyMs: c.latencyMs,
          metric: c.summary || c.detail || c.error || '-',
        });
      }
    } else {
      if (snapshot?.magpie?.enabled) {
        list.push({
          id: 'gateway-magpie',
          name: 'Magpie 模型网关',
          status: snapshot.magpie.status || (snapshot.magpie.reachable ? 'healthy' : 'offline'),
          latencyMs: snapshot.magpie.latencyMs,
          metric: snapshot.magpie.reachable
            ? `${formatCompactNumber(snapshot.magpie.totalModels ?? 0)} 模型 · ${snapshot.magpie.providers?.length ?? 0} 渠道`
            : snapshot.magpie.error || '不可达',
        });
      }
      if (snapshot?.memory?.nmem?.enabled) {
        const n = snapshot.memory.nmem;
        list.push({
          id: 'memory-nmem',
          name: 'Nowledge Mem',
          status: n.status || (n.reachable ? 'healthy' : 'offline'),
          latencyMs: n.latencyMs,
          metric: n.reachable
            ? `${formatCompactNumber(n.stats?.memories ?? 0)} 记忆 · ${n.spaces?.length ?? 0} 空间`
            : n.error || '不可达',
        });
      }
      if (snapshot?.memory?.openviking?.enabled) {
        const ov = snapshot.memory.openviking;
        list.push({
          id: 'memory-openviking',
          name: 'OpenViking',
          status: ov.status || (ov.reachable ? 'healthy' : 'offline'),
          latencyMs: ov.latencyMs,
          metric: ov.reachable
            ? `向量 ${formatCompactNumber(ov.vikingdb?.vectorCount)} · 技能 ${ov.skillsCount ?? 0}`
            : ov.error || '不可达',
        });
      }
      if (snapshot?.memory?.symbiote?.enabled) {
        const s = snapshot.memory.symbiote;
        list.push({
          id: 'memory-symbiote',
          name: 'Symbiote',
          status: s.status || (s.reachable ? 'healthy' : 'offline'),
          latencyMs: s.latencyMs,
          metric: s.reachable ? `Vault ${formatCompactNumber(s.vaultFileCount)} 文档` : s.error || '不可达',
        });
      }
      if (snapshot?.memory?.rerank?.enabled) {
        const r = snapshot.memory.rerank;
        list.push({
          id: 'memory-rerank',
          name: 'Rerank 重排',
          status: r.status || (r.reachable ? 'healthy' : 'offline'),
          latencyMs: r.latencyMs,
          metric: r.reachable ? r.model || 'Ready' : r.error || '不可达',
        });
      }
      if (snapshot?.network?.tailscale?.enabled) {
        const t = snapshot.network.tailscale;
        list.push({
          id: 'network-tailscale',
          name: 'Tailscale Mesh',
          status: t.status || (t.reachable ? 'healthy' : 'offline'),
          latencyMs: t.latencyMs,
          metric: t.reachable ? `${t.onlineCount ?? 0}/${t.devices?.length ?? 0} 设备在线` : t.error || '不可达',
        });
      }
      if (snapshot?.network?.mihomo?.enabled) {
        const m = snapshot.network.mihomo;
        list.push({
          id: 'network-mihomo',
          name: 'Mihomo 代理',
          status: m.status || (m.reachable ? 'healthy' : 'offline'),
          latencyMs: m.latencyMs,
          metric: m.reachable ? `${formatCompactNumber(m.activeConnections ?? 0)} 活跃连接` : m.error || '不可达',
        });
      }
      if (snapshot?.network?.syncthing?.enabled) {
        const st = snapshot.network.syncthing;
        list.push({
          id: 'service-syncthing',
          name: 'Syncthing 同步',
          status: st.status || (st.reachable ? 'healthy' : 'offline'),
          latencyMs: st.latencyMs,
          metric: st.reachable
            ? st.folders != null || st.devices != null
              ? `${st.folders ?? 0} 文件夹 · ${st.devices ?? 0} 设备`
              : 'REST 健康检查通过'
            : st.error || '不可达',
        });
      }
    }

    // Merge modular extra plugins (MCP Server, A2A Agent Runtime, OpenAI Gateway, Custom Services)
    const existingKeys = new Set(list.map((x) => x.id || x.name));
    for (const p of snapshot?.plugins || []) {
      if (existingKeys.has(p.id) || existingKeys.has(p.name)) continue;
      list.push({
        id: p.id,
        name: p.name,
        status: p.status || (p.reachable ? 'healthy' : 'offline'),
        latencyMs: p.latencyMs,
        metric: p.summary || p.protocol || '-',
      });
    }

    return list;
  }, [snapshot]);

  const disks = host?.disks || [];
  const incidents = persistedIncidents.length > 0 ? persistedIncidents : snapshot?.incidents || [];
  const alerts = snapshot?.alerts || [];

  const fleetOnlineNum = fleetSum ? (fleetSum.online ?? 0) : tsOnline;
  const fleetTotalNum = fleetSum ? (fleetSum.total ?? 0) : tsTotal;

  return (
    <ModuleFrame
      title="系统总览"
      description="跨机 AI Agent 控制平面总览：实时汇总在线节点、受管服务、记忆引擎与组网连接状态。"
      meta={hostMeta}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCustomizeOpen((v) => !v)}
          data-testid="overview-customize-btn"
        >
          <SlidersHorizontal className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
          自定义面板
          {hiddenPanelsCount > 0
            ? ` (${PANEL_TOGGLE_ITEMS.length - hiddenPanelsCount}/${PANEL_TOGGLE_ITEMS.length})`
            : ''}
        </Button>
      }
    >
      {customizeOpen && (
        <div
          data-testid="overview-customize-bar"
          className="rounded-xl bg-[var(--surface-subtle)]/75 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--ink-muted)] mr-1">
              显示工作台面板
            </span>
            {PANEL_TOGGLE_ITEMS.map((item) => {
              const active = panelPrefs[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => updatePanelPref(item.key)}
                  data-testid={`overview-toggle-${item.key}`}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-medium transition-colors duration-150 ease-out cursor-pointer select-none',
                    FOCUS_RING,
                    active
                      ? 'bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-card)]'
                      : 'text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
                  )}
                >
                  <Check
                    className={cn('size-3', active ? 'text-[var(--accent)] opacity-100' : 'opacity-20')}
                    strokeWidth={2}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
          {hiddenPanelsCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetPanelPrefs}>
              <RotateCcw className="size-3.5" strokeWidth={1.75} />
              恢复默认
            </Button>
          )}
        </div>
      )}

      <KpiStrip
        asymmetric
        cells={[
          {
            label: '受管服务健康度',
            meta: services.length ? `${svcRatioPct}% 可用` : undefined,
            value: services.length ? `${healthySvcs}/${services.length}` : '-',
            numeric: services.length
              ? { primary: healthySvcs, denominator: services.length }
              : undefined,
            ratioPct: services.length ? svcRatioPct : undefined,
            sub:
              failedSvcs > 0
                ? `${failedSvcs} 项故障 · ${degradedSvcs} 项降级`
                : degradedSvcs > 0
                  ? `${degradedSvcs} 项降级运行`
                  : standbySvcs > 0
                    ? `${healthySvcs} 项运行中 · ${standbySvcs} 项待机`
                    : '全部受管服务运行平稳',
            tone: svcTone,
          },
          {
            label: '主机内存占用',
            value: memPct != null ? `${Math.round(memPct)}%` : '-',
            numeric: memPct != null ? { primary: Math.round(memPct), suffix: '%' } : undefined,
            sub:
              load1 != null
                ? `负载 ${Number(load1).toFixed(2)} · ${formatBytes(host?.memory?.usedBytes)} / ${formatBytes(host?.memory?.totalBytes)}`
                : 'CPU 负载与内存占用',
            tone: memPct != null && memPct > 85 ? 'warn' : 'ok',
          },
          {
            label: '记忆引擎',
            value: memEngines.length ? `${memOk}/${memEngines.length}` : '待启用',
            numeric: memEngines.length
              ? { primary: memOk, denominator: memEngines.length }
              : undefined,
            sub: memEngines.length
              ? `${formatCompactNumber(snapshot?.memory?.nmem?.stats?.memories ?? 0)} 记忆 · ${snapshot?.memory?.openviking?.skillsCount ?? 0} 技能`
              : '可在「插件与接入」按需开启',
            tone: memEngines.length === 0 ? 'muted' : memOk < memEngines.length ? 'warn' : 'ok',
          },
          {
            label: '全球节点',
            value: `${fleetOnlineNum}/${fleetTotalNum}`,
            numeric: { primary: fleetOnlineNum, denominator: fleetTotalNum },
            sub: `Tailnet ${tsOnline}/${tsTotal} · ${formatCompactNumber(modelsCount)} 模型`,
          },
        ]}
      />

      {panelPrefs.metrics && (
        <React.Suspense
          fallback={
            <Panel
              title="历史指标与聚合趋势"
              description="直连 SQLite WAL 原始样本与 1m / 5m 聚合表，支持跨尺度回溯资源水位与探针延迟。"
            >
              <WidgetSkeleton heightClass="h-[248px]" label="正在加载历史趋势图表" />
            </Panel>
          }
        >
          <MetricsChart />
        </React.Suspense>
      )}

      {panelPrefs.cache && (
        <Panel
          title="运行时缓存命中健康"
          description={
            cacheStatus
              ? `全网命中率 ${formatCacheHitPct(cacheStatus.summary.overallHitPct)} · 异常桶 ${cacheStatus.summary.anomalyCount} · 告警阈值 ${cacheStatus.config.thresholdPct}% · 远端节点 ${cacheStatus.summary.remoteNodeCount}`
              : '实时聚合本机与远端探针的 Agent × 模型缓存命中率，异常桶支持一键下钻决策归因。'
          }
          actions={
            onOpenCacheMonitor ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenCacheMonitor}
                data-testid="overview-open-cache-monitor-btn"
              >
                监控与归因设置
              </Button>
            ) : undefined
          }
          bodyClassName="p-0"
        >
          <div data-testid="overview-cache-panel">
            {!cacheStatus ? (
              cacheError ? (
                <EmptyState
                  message="暂未获取到运行时缓存监控数据，可前往设置页检查监控状态。"
                  action={
                    onOpenCacheMonitor
                      ? { label: '打开缓存监控设置', onClick: onOpenCacheMonitor }
                      : undefined
                  }
                />
              ) : (
                <div className="p-5">
                  <WidgetSkeleton heightClass="h-[88px]" label="正在读取缓存命中率汇总" />
                </div>
              )
            ) : topCacheBuckets.length === 0 ? (
              <EmptyState
                message="当前窗口暂无 Agent × 模型缓存样本，Magpie 产生带缓存统计的调用后将自动呈现。"
                action={
                  onOpenCacheMonitor
                    ? { label: '配置监控与阈值', onClick: onOpenCacheMonitor }
                    : undefined
                }
              />
            ) : (
              <div>
                {cacheStatus.recentDiagnoses[0] && (
                  <div className="px-5 sm:px-6 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/55 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                    <div className="min-w-0 flex items-center gap-2">
                      <StatusIndicator
                        status={
                          cacheStatus.recentDiagnoses[0].severity === 'critical'
                            ? 'critical'
                            : cacheStatus.recentDiagnoses[0].severity === 'warn'
                              ? 'warn'
                              : 'healthy'
                        }
                        label={cacheStatus.recentDiagnoses[0].mode === 'llm' ? '最新模型归因' : '最新规则归因'}
                      />
                      <span className="text-[var(--ink)] truncate">
                        {cacheStatus.recentDiagnoses[0].summary}
                      </span>
                    </div>
                    <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                      {formatDateTime(cacheStatus.recentDiagnoses[0].createdAt)}
                    </span>
                  </div>
                )}
                <div className="divide-y divide-[var(--border-subtle)]">
                  {topCacheBuckets.map((bucket) => {
                    const health = classifyCacheHealth(
                      bucket.cacheHitPct,
                      cacheStatus.config.thresholdPct,
                      bucket.requests,
                      cacheStatus.config.minSamples,
                    );
                    const cacheBadgeStatus =
                      health === 'critical'
                        ? 'critical'
                        : health === 'warn'
                          ? 'warn'
                          : health === 'healthy'
                            ? 'healthy'
                            : 'standby';
                    const clues = extractDriftClues(bucket).slice(0, 2);
                    return (
                      <div
                        key={bucket.key}
                        className="px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-[13px]"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--ink-muted)]">
                            {bucket.nodeId}
                          </span>
                          <span className="font-medium text-[var(--ink)]">{bucket.agent}</span>
                          <span className="font-mono text-[12px] text-[var(--ink-muted)] truncate">
                            {bucket.model}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {clues.map((clue) => (
                            <span
                              key={clue.key}
                              className="text-[11.5px] px-2 py-0.5 rounded bg-[var(--warn)]/10 text-[var(--warn)]"
                            >
                              {clue.label} ×{clue.count}
                            </span>
                          ))}
                          <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
                            {formatCompactNumber(bucket.requests)} req
                          </span>
                          <StatusIndicator
                            status={cacheBadgeStatus}
                            label={formatCacheHitPct(bucket.cacheHitPct)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {panelPrefs.observability && (
        <Panel
          title="联邦日志可观测健康"
          description={
            obsStatus
              ? `1h 错误 ${obsStatus.summary1h.errorCount} · 新指纹 ${obsStatus.summary1h.newFingerprintCount} · 重启 ${obsStatus.summary1h.restartCount} · 5xx ${obsStatus.summary1h.http5xxCount} · 周期巡检 ${formatDigestIntervalLabel(obsStatus.config.digestIntervalMinutes)}`
              : '实时聚合多源只读日志错误趋势、新指纹与磁盘分片配额，支持静默跳过（0 Token）与决策模型归因。'
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onOpenLogs({
                    source: 'unified',
                    target: 'all',
                    targets: ['all'],
                    since: '1h',
                    level: (obsStatus?.summary1h?.errorCount ?? 0) > 0 ? 'error' : 'all',
                  })
                }
                data-testid="overview-open-logs-from-obs-btn"
              >
                查看日志中心
              </Button>
              {onOpenObservability && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onOpenObservability}
                  data-testid="overview-open-observability-btn"
                >
                  可观测与归因设置
                </Button>
              )}
            </div>
          }
          bodyClassName="p-0"
        >
          <div data-testid="overview-observability-panel">
            {!obsStatus ? (
              obsError ? (
                <EmptyState
                  message="暂未获取到联邦日志可观测状态，可前往设置页检查日志适配器与索引配置。"
                  action={
                    onOpenObservability
                      ? { label: '打开可观测设置', onClick: onOpenObservability }
                      : undefined
                  }
                />
              ) : (
                <div className="p-5">
                  <WidgetSkeleton heightClass="h-[88px]" label="正在读取联邦日志可观测汇总" />
                </div>
              )
            ) : (
              <div>
                {(() => {
                  const latestAnn = obsStatus.recentAnnotations?.[0] || null;
                  const latestDigest = obsStatus.recentDigests?.[0] || null;
                  if (!latestAnn && !latestDigest) return null;
                  const modeRaw = String(latestAnn?.mode || latestDigest?.mode || '').toLowerCase();
                  const modeText =
                    modeRaw === 'llm'
                      ? '最新模型归因'
                      : modeRaw.includes('silent') || modeRaw.includes('skip')
                        ? '静默跳过 · 0 Token'
                        : '最新规则归因';
                  const sevRaw = String(latestAnn?.severity || latestDigest?.severity || 'info').toLowerCase();
                  const sevStatus =
                    sevRaw === 'critical' ? 'critical' : sevRaw === 'warn' ? 'warn' : 'healthy';
                  const summaryText =
                    latestAnn?.detail || latestAnn?.summary || latestDigest?.summary || '';
                  const tsText = latestAnn?.isoTs || latestDigest?.ts || '';
                  return (
                    <div className="px-5 sm:px-6 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/55 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                      <div className="min-w-0 flex items-center gap-2">
                        <StatusIndicator status={sevStatus} label={modeText} />
                        <span className="text-[var(--ink)] truncate">{summaryText}</span>
                      </div>
                      {tsText && (
                        <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                          {formatDateTime(tsText)}
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="px-5 sm:px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-[12.5px]">
                  <div className="space-y-1">
                    <div className="text-[var(--ink-muted)]">整体状态 · 1h 错误</div>
                    <div className="flex items-center gap-2">
                      <StatusIndicator
                        status={
                          obsHealth === 'critical'
                            ? 'critical'
                            : obsHealth === 'warn'
                              ? 'warn'
                              : 'healthy'
                        }
                        label={
                          obsHealth === 'critical'
                            ? '告警异常'
                            : obsHealth === 'warn'
                              ? '存在波动'
                              : '健康正常'
                        }
                      />
                      <span className="font-mono font-semibold text-[var(--ink)] tabular-nums">
                        {obsStatus.summary1h.errorCount} err
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[var(--ink-muted)]">新指纹 · 警告</div>
                    <div className="font-mono text-[var(--ink)] tabular-nums">
                      {obsStatus.summary1h.newFingerprintCount} 指纹 · {obsStatus.summary1h.warnCount} warn
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[var(--ink-muted)]">重启 · HTTP 5xx</div>
                    <div className="font-mono text-[var(--ink)] tabular-nums">
                      {obsStatus.summary1h.restartCount} 重启 · {obsStatus.summary1h.http5xxCount} 5xx
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[var(--ink-muted)]">
                      <span>索引磁盘配额</span>
                      <span className="font-mono text-[11.5px] text-[var(--ink)] tabular-nums">
                        {obsDiskQuota.usedLabel} / {obsDiskQuota.capLabel}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                      <div
                        className={cn(
                          'h-full w-full rounded-full origin-left transition-transform duration-200 ease-out',
                          obsDiskQuota.tone === 'crit'
                            ? 'bg-[var(--err-dot)]'
                            : obsDiskQuota.tone === 'warn'
                              ? 'bg-[var(--warn-dot)]'
                              : 'bg-[var(--ok-dot)]',
                        )}
                        style={{
                          transform: `scaleX(${Math.min(100, Math.max(0, obsDiskQuota.pct)) / 100})`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {(obsStatus.serviceRollups || []).length > 0 && (
                  <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                    {obsStatus.serviceRollups.slice(0, 3).map((rollup) => (
                      <div
                        key={`${rollup.nodeId}-${rollup.serviceId}`}
                        className="px-5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12.5px]"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                            {rollup.nodeId}
                          </span>
                          <span className="font-medium text-[var(--ink)] truncate">
                            {rollup.serviceId}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums">
                          <span>err {rollup.errorCount}</span>
                          <span>fp {rollup.newFingerprintCount}</span>
                          <span>5xx {rollup.http5xxCount}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onOpenLogs({
                                source: 'unified',
                                target: rollup.serviceId,
                                targets: [rollup.serviceId],
                                since: '1h',
                                level: rollup.errorCount > 0 ? 'error' : 'all',
                              })
                            }
                          >
                            日志
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}

      {panelPrefs.graph && (
        <Panel
          title="统一架构与依赖图谱"
          description="按入口 Agent、模型网关、记忆上下文与网络底座实时映射依赖关系，点击节点高亮上下游并下钻日志。"
          actions={
            <SegmentedFilter
              value={graphFilter}
              onChange={setGraphFilter}
              options={GRAPH_FILTERS}
              ariaLabel="架构图谱筛选"
            />
          }
        >
          <React.Suspense fallback={<WidgetSkeleton heightClass="h-[520px]" label="正在加载架构依赖图谱" />}>
            <ArchitectureGraph
              snapshot={snapshot}
              mode="full"
              filter={graphFilter}
              onOpenLogs={onOpenLogs}
              onSelectAgentCategory={onSelectAgentCategory}
            />
          </React.Suspense>
        </Panel>
      )}

      {(panelPrefs.connectors || panelPrefs.storageEvents) && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {panelPrefs.connectors && (
        <Panel
          className={panelPrefs.storageEvents ? 'lg:col-span-7' : 'lg:col-span-12'}
          bodyClassName="p-0"
          title="已启用插件与连接器状态"
          description="通过各组件官方协议（MCP / A2A / OpenAI / REST API / 结构化 CLI）实时采集。"
          actions={
            onOpenPlugins ? (
              <Button variant="secondary" size="sm" onClick={onOpenPlugins}>
                管理插件
              </Button>
            ) : undefined
          }
        >
          {connectors.length === 0 ? (
            <EmptyState
              message="尚未配置已启用的插件或连接器。"
              action={onOpenPlugins ? { label: '前往插件目录', onClick: onOpenPlugins } : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                    <th className="py-2.5 pl-5 sm:pl-6 pr-3">组件 / 插件</th>
                    <th className="py-2.5 px-3">状态</th>
                    <th className="py-2.5 px-3 text-right">延迟</th>
                    <th className="py-2.5 pl-3 pr-5 sm:pr-6">核心指标</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {connectors.map((c) => (
                    <tr
                      key={c.id || c.name}
                      className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                    >
                      <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)] max-w-[180px] truncate" title={c.name}>
                        {c.name}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusIndicator status={c.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                        {c.latencyMs != null ? `${c.latencyMs}ms` : '-'}
                      </td>
                      <td
                        className="py-2.5 pl-3 pr-5 sm:pr-6 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums max-w-[260px] truncate"
                        title={c.metric}
                      >
                        {c.metric}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        )}

        {panelPrefs.storageEvents && (
        <Panel
          className={panelPrefs.connectors ? 'lg:col-span-5' : 'lg:col-span-12'}
          title="主机存储与近期事件"
          description="挂载点容量使用率、持久化状态变更时间线与近期告警。"
        >
          <div className="space-y-5">
            {disks.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-subtle)]">暂无磁盘挂载点采集数据。</p>
            ) : (
              <div className="space-y-3.5">
                {disks.slice(0, 4).map((d) => {
                  const pct = d.usePercent ?? d.usedPct ?? 0;
                  const totalBytes = d.sizeBytes ?? d.totalBytes;
                  const detail =
                    d.used && d.size
                      ? `${d.used} / ${d.size} (${Math.round(pct)}%)`
                      : d.usedBytes != null && totalBytes != null
                        ? `${formatBytes(d.usedBytes)} / ${formatBytes(totalBytes)} (${Math.round(pct)}%)`
                        : `${Math.round(pct)}%`;
                  return (
                    <ResourceMeter
                      key={d.mount}
                      label={d.mount}
                      value={pct}
                      valueText={detail}
                    />
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <h3 className="text-[13px] font-semibold tracking-tight text-[var(--ink)] mb-2.5">
                状态变更事件时间线
              </h3>
              {incidents.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-subtle)]">近期无组件状态漂移事件。</p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {incidents.slice(0, 5).map((inc, idx) => {
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
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <h3 className="text-[13px] font-semibold tracking-tight text-[var(--ink)] mb-2.5">
                最近告警与活跃任务
              </h3>
              {alerts.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-subtle)]">当前无未处理告警。</p>
              ) : (
                <ul className="space-y-2.5">
                  {alerts.slice(0, 4).map((al, idx) => (
                    <li
                      key={al.id || idx}
                      className="flex items-start justify-between gap-3 text-[13px]"
                    >
                      <div className="min-w-0 flex-1">
                        <StatusIndicator
                          status={al.severity || al.level || 'warn'}
                          label={al.title || al.component || '告警'}
                        />
                        {al.message && (
                          <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)] line-clamp-2 text-pretty">
                            {al.message}
                          </p>
                        )}
                      </div>
                      {al.ts && (
                        <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                          {formatDateTime(al.ts)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
        )}
      </div>
      )}
    </ModuleFrame>
  );
}
