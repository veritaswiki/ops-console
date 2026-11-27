import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Radar,
  RefreshCw,
} from 'lucide-react';
import type {
  LogFilterState,
  MetaResponse,
  ObservabilityAnnotation,
  ObservabilityFingerprint,
  ObservabilityLogsReadResponse,
  ObservabilityMetricsResponse,
  ObservabilitySourceRef,
  SnapshotResponse,
} from '../types';
import {
  fetchObservabilityFingerprints,
  fetchObservabilityMetrics,
  readObservabilityAdapterLogs,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import {
  buildLogJumpFilter,
  buildObservabilityChartSeries,
  positionAnnotationsOnTimeline,
  summarizeAnnotationsByMode,
} from '../lib/observability';
import { formatBytes, formatClock, formatDateTime } from '../utils/format';
import { LogStreamPanel } from '../components/LogStreamPanel';
import {
  Button,
  InspectorDrawer,
  Panel,
  StatusIndicator,
  WidgetSkeleton,
} from '../components/ui';
import { ModuleFrame } from '../modules/ModuleFrame';

const MINI_CHART_WIDTH = 640;
const MINI_PLOT_HEIGHT = 82;
const MINI_PAD = 12;
const MINI_TOTAL_HEIGHT = 114;

interface FederatedPreviewTarget {
  title: string;
  subtitle: string;
  summary?: string;
  sourceKind: string;
  target: string;
  nodeId?: string;
  level?: string;
}

function obsSeverityStatus(severity: string): string {
  const normalized = String(severity || '').toLowerCase();
  if (normalized === 'critical' || normalized === 'error' || normalized === 'err') return 'critical';
  if (normalized === 'warn' || normalized === 'warning') return 'warn';
  return 'healthy';
}

function obsModeLabel(mode: string): string {
  const normalized = String(mode || '').trim().toLowerCase();
  if (normalized === 'llm') return 'LLM 归因';
  if (normalized.includes('silent') || normalized.includes('skip')) return '静默跳过 · 0 Token';
  return '规则归因';
}

export function LogsView({
  snapshot,
  meta,
  initialUnit,
  initialLevel = 'all',
  initialFilter = null,
  requestNonce = 0,
  onToast,
}: {
  snapshot: SnapshotResponse | null;
  meta: MetaResponse | null;
  initialUnit?: string;
  initialLevel?: string;
  initialFilter?: Partial<LogFilterState> | null;
  requestNonce?: number;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [counts, setCounts] = React.useState({ total: 0, error: 0, warn: 0, info: 0 });
  const [obsOpen, setObsOpen] = React.useState(true);
  const [obsMetrics, setObsMetrics] = React.useState<ObservabilityMetricsResponse | null>(null);
  const [obsFingerprints, setObsFingerprints] = React.useState<ObservabilityFingerprint[]>([]);
  const [obsLoading, setObsLoading] = React.useState(false);

  const [localFilterOverride, setLocalFilterOverride] = React.useState<Partial<LogFilterState> | null>(null);
  const [localNonce, setLocalNonce] = React.useState(0);

  const [federatedTarget, setFederatedTarget] = React.useState<FederatedPreviewTarget | null>(null);
  const [federatedState, setFederatedState] = React.useState<{
    loading: boolean;
    error: string | null;
    data: ObservabilityLogsReadResponse | null;
  }>({ loading: false, error: null, data: null });

  React.useEffect(() => {
    setLocalFilterOverride(null);
  }, [requestNonce]);

  const loadObservability = React.useCallback(async (signal?: AbortSignal) => {
    setObsLoading(true);
    try {
      const [metricsRes, fpRes] = await Promise.all([
        fetchObservabilityMetrics({ range: '6h' }, signal),
        fetchObservabilityFingerprints({ range: '6h', limit: 6 }, signal),
      ]);
      if (signal?.aborted) return;
      setObsMetrics(metricsRes);
      setObsFingerprints(fpRes.items || []);
    } catch {
      // Keep native LogStreamPanel unaffected if observability endpoint is unavailable
    } finally {
      if (!signal?.aborted) setObsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadObservability(controller.signal);
    return () => controller.abort();
  }, [loadObservability]);

  const resolvedInitialFilter = React.useMemo<Partial<LogFilterState>>(() => {
    if (initialFilter) {
      return initialFilter;
    }
    if (initialUnit) {
      return {
        source: 'service',
        target: initialUnit,
        targets: [initialUnit],
        since: '1h',
        level: initialLevel || 'all',
        query: '',
        regex: false,
      };
    }
    return {
      source: 'unified',
      target: 'all',
      targets: ['all'],
      since: '1h',
      level: initialLevel || 'all',
      query: '',
      regex: false,
    };
  }, [initialFilter, initialUnit, initialLevel]);

  const openFederatedPreview = React.useCallback(async (target: FederatedPreviewTarget) => {
    setFederatedTarget(target);
    setFederatedState({ loading: true, error: null, data: null });
    try {
      const res = await readObservabilityAdapterLogs({
        sourceKind: target.sourceKind,
        target: target.target,
        nodeId: target.nodeId,
        since: '1h',
        level: target.level || 'all',
        limit: 80,
      });
      setFederatedState({
        loading: false,
        error: res.ok === false ? res.error || '联邦直读失败' : null,
        data: res,
      });
    } catch (err) {
      setFederatedState({
        loading: false,
        error: (err as Error).message || '联邦直读失败',
        data: null,
      });
    }
  }, []);

  const handleSelectSourceItem = React.useCallback(
    (opts: {
      title: string;
      summary?: string;
      sourceRef?: ObservabilitySourceRef | null;
      serviceId?: string;
      nodeId?: string;
      level?: string;
    }) => {
      const cleanService = opts.serviceId && opts.serviceId !== 'all' ? opts.serviceId : undefined;
      const jump = buildLogJumpFilter(opts.sourceRef, cleanService);
      const effectiveLevel = opts.level || 'all';

      if (jump.source === 'journald') {
        const unit = jump.unit || cleanService || 'all';
        setLocalFilterOverride({
          source: 'service',
          target: unit,
          targets: [unit],
          since: jump.since || '1h',
          level: effectiveLevel,
          query: '',
          regex: false,
        });
        setLocalNonce((prev) => prev + 1);
        onToast(`已联动筛选 journald 服务：${unit}`, 'info');
        return;
      }

      if (jump.source === 'file') {
        const fileId = jump.file || '';
        setLocalFilterOverride({
          source: 'file',
          target: fileId,
          targets: fileId ? [fileId] : ['all'],
          since: jump.since || '1h',
          level: effectiveLevel,
          query: '',
          regex: false,
        });
        setLocalNonce((prev) => prev + 1);
        onToast(`已联动筛选原生日志文件：${fileId || 'file'}`, 'info');
        return;
      }

      if (jump.source === 'unified') {
        const targets = jump.targets && jump.targets.length > 0 ? jump.targets : ['all'];
        setLocalFilterOverride({
          source: 'unified',
          target: targets[0],
          targets,
          since: jump.since || '1h',
          level: effectiveLevel,
          query: '',
          regex: false,
        });
        setLocalNonce((prev) => prev + 1);
        onToast(`已联动筛选统一日志：${targets.join(', ')}`, 'info');
        return;
      }

      void openFederatedPreview({
        title: opts.title,
        subtitle: `${jump.source} · ${opts.sourceRef?.nodeId || opts.nodeId || 'local'}`,
        summary: opts.summary,
        sourceKind: jump.source,
        target: jump.target || cleanService || '',
        nodeId: opts.sourceRef?.nodeId || (opts.nodeId && opts.nodeId !== 'all' ? opts.nodeId : undefined),
        level: effectiveLevel,
      });
    },
    [onToast, openFederatedPreview],
  );

  const chartSeries = React.useMemo(
    () =>
      buildObservabilityChartSeries(
        obsMetrics?.points || [],
        MINI_CHART_WIDTH,
        MINI_PLOT_HEIGHT,
        MINI_PAD,
      ),
    [obsMetrics?.points],
  );
  const annotations = obsMetrics?.annotations || [];
  const placements = React.useMemo(
    () =>
      positionAnnotationsOnTimeline(
        annotations,
        chartSeries.hasData ? chartSeries.startTs : obsMetrics?.startMs ?? 0,
        chartSeries.hasData ? chartSeries.endTs : obsMetrics?.endMs ?? 0,
        MINI_CHART_WIDTH,
        MINI_PAD,
      ),
    [annotations, chartSeries.hasData, chartSeries.startTs, chartSeries.endTs, obsMetrics?.startMs, obsMetrics?.endMs],
  );
  const modeSummary = React.useMemo(() => summarizeAnnotationsByMode(annotations), [annotations]);

  const effectiveFilter = localFilterOverride ?? resolvedInitialFilter;
  const effectiveNonce = requestNonce * 1000 + localNonce;

  return (
    <ModuleFrame
      title="大一统直读日志中心"
      description="原位直读跨服务 journald、白名单原生日志文件、自身运行与审计日志；受限字节尾读防大文件拖慢，支持多源筛选与 SSE 实时追踪。"
      meta={`总计 ${counts.total} · 错误 ${counts.error} · 警告 ${counts.warn} · 信息 ${counts.info}`}
    >
      <section
        data-testid="logs-observability-panel"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden"
      >
        <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setObsOpen((prev) => !prev)}
            aria-expanded={obsOpen}
            data-testid="logs-observability-toggle"
            className={cn(
              'inline-flex items-center gap-2 text-left cursor-pointer rounded-lg py-0.5',
              FOCUS_RING,
            )}
          >
            {obsOpen ? (
              <ChevronDown className="size-4 text-[var(--ink-subtle)]" strokeWidth={1.75} />
            ) : (
              <ChevronRight className="size-4 text-[var(--ink-subtle)]" strokeWidth={1.75} />
            )}
            <Radar className="size-4 text-[var(--accent)]" strokeWidth={1.75} />
            <span className="text-[13.5px] font-semibold tracking-tight text-[var(--ink)]">
              联邦可观测趋势与 AI 标注
            </span>
            <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
              6h · 错误 {obsMetrics?.totals?.errorCount ?? 0} · 警告 {obsMetrics?.totals?.warnCount ?? 0} · 标注{' '}
              {modeSummary.total} · 指纹 {obsFingerprints.length}
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[var(--ink-subtle)] hidden sm:inline">
              确定性衍生指标 · 点击标注或指纹联动筛选
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadObservability()}
              disabled={obsLoading}
            >
              <RefreshCw
                className={cn('size-3.5', obsLoading && 'animate-spin')}
                strokeWidth={1.75}
              />
              刷新
            </Button>
          </div>
        </div>

        {obsOpen && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/45 px-3.5 py-2.5">
              {chartSeries.hasData ? (
                <svg
                  viewBox={`0 0 ${MINI_CHART_WIDTH} ${MINI_TOTAL_HEIGHT}`}
                  className="w-full h-[114px] overflow-visible select-none"
                  role="img"
                  aria-label="近 6 小时确定性错误与告警趋势及 AI 标注"
                >
                  <line
                    x1={MINI_PAD}
                    x2={MINI_CHART_WIDTH - MINI_PAD}
                    y1={MINI_PLOT_HEIGHT - MINI_PAD}
                    y2={MINI_PLOT_HEIGHT - MINI_PAD}
                    stroke="var(--border-subtle)"
                    strokeWidth={1}
                  />
                  {chartSeries.warnPath && (
                    <path
                      d={chartSeries.warnPath}
                      fill="none"
                      stroke="var(--warn)"
                      strokeWidth={1.4}
                      strokeOpacity={0.85}
                      strokeLinejoin="round"
                    />
                  )}
                  {chartSeries.errorPath && (
                    <path
                      d={chartSeries.errorPath}
                      fill="none"
                      stroke="var(--err)"
                      strokeWidth={1.85}
                      strokeLinejoin="round"
                    />
                  )}
                  <line
                    x1={MINI_PAD}
                    x2={MINI_CHART_WIDTH - MINI_PAD}
                    y1={MINI_PLOT_HEIGHT + 4}
                    y2={MINI_PLOT_HEIGHT + 4}
                    stroke="var(--border-subtle)"
                    strokeWidth={1}
                  />
                  {placements.map((placement) => {
                    const mode = String(placement.annotation.mode || '').toLowerCase();
                    const isLlm = mode === 'llm';
                    const isSkip = mode.includes('silent') || mode.includes('skip');
                    const markerY = MINI_PLOT_HEIGHT + 16 + (placement.lane % 2) * 8;
                    const color = isSkip
                      ? 'var(--ink-subtle)'
                      : isLlm
                        ? 'var(--accent)'
                        : placement.annotation.severity === 'critical'
                          ? 'var(--err)'
                          : placement.annotation.severity === 'warn'
                            ? 'var(--warn)'
                            : 'var(--ok)';
                    return (
                      <g
                        key={placement.annotation.id}
                        className="cursor-pointer"
                        onClick={() =>
                          handleSelectSourceItem({
                            title: placement.annotation.label,
                            summary: placement.annotation.summary || placement.annotation.detail,
                            sourceRef: placement.annotation.sourceRef,
                            serviceId: placement.annotation.serviceId,
                            nodeId: placement.annotation.nodeId,
                          })
                        }
                      >
                        <title>{`${placement.annotation.label} (${obsModeLabel(placement.annotation.mode)}) · ${formatDateTime(placement.annotation.isoTs)}`}</title>
                        <line
                          x1={placement.x}
                          x2={placement.x}
                          y1={MINI_PAD}
                          y2={markerY - 4}
                          stroke={color}
                          strokeOpacity={isSkip ? 0.25 : 0.4}
                          strokeDasharray="2 3"
                        />
                        <circle
                          cx={placement.x}
                          cy={markerY}
                          r={4}
                          fill={isSkip ? 'var(--surface)' : color}
                          stroke={color}
                          strokeWidth={1.4}
                        />
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="py-4 text-center text-[12px] text-[var(--ink-subtle)]">
                  近 6 小时暂无确定性日志索引趋势样本。
                </div>
              )}
            </div>

            {(obsFingerprints.length > 0 || annotations.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5 min-w-0">
                  <div className="text-[11.5px] font-semibold text-[var(--ink-muted)]">
                    活跃错误指纹 ({obsFingerprints.length})
                  </div>
                  {obsFingerprints.length === 0 ? (
                    <p className="text-[12px] text-[var(--ink-subtle)]">近 6 小时无活跃错误指纹。</p>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                      {obsFingerprints.slice(0, 6).map((fp) => {
                        const isFederated =
                          fp.sourceKind === 'docker' ||
                          fp.sourceKind === 'http-json' ||
                          fp.sourceKind === 'remote';
                        return (
                          <button
                            key={`${fp.fingerprint}-${fp.serviceId}-${fp.nodeId}`}
                            type="button"
                            onClick={() =>
                              handleSelectSourceItem({
                                title: `${fp.serviceId} · ${fp.level}`,
                                summary: fp.template || fp.sampleRedacted,
                                sourceRef: fp.sourceRef,
                                serviceId: fp.serviceId,
                                nodeId: fp.nodeId,
                                level: fp.level || 'error',
                              })
                            }
                            className={cn(
                              'w-full text-left py-2 px-1 flex items-center justify-between gap-2 hover:bg-[var(--surface-hover)] transition-colors duration-150 cursor-pointer rounded-md',
                              FOCUS_RING,
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-[12px]">
                                <StatusIndicator status={obsSeverityStatus(fp.level)} label={fp.serviceId} />
                                <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                                  {fp.nodeId} · {fp.sourceKind} · ×{fp.count}
                                </span>
                              </div>
                              <div className="font-mono text-[11.5px] text-[var(--ink-muted)] truncate">
                                {fp.template || fp.sampleRedacted}
                              </div>
                            </div>
                            {isFederated && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--accent)] shrink-0">
                                <Eye className="size-3" strokeWidth={1.75} />
                                预览
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="text-[11.5px] font-semibold text-[var(--ink-muted)]">
                    近期 AI / 规则标注 ({annotations.length})
                  </div>
                  {annotations.length === 0 ? (
                    <p className="text-[12px] text-[var(--ink-subtle)]">近 6 小时暂无事件分诊或周期巡检标注。</p>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                      {annotations.slice(0, 5).map((ann: ObservabilityAnnotation) => (
                        <button
                          key={ann.id}
                          type="button"
                          onClick={() =>
                            handleSelectSourceItem({
                              title: ann.label,
                              summary: ann.summary || ann.detail,
                              sourceRef: ann.sourceRef,
                              serviceId: ann.serviceId,
                              nodeId: ann.nodeId,
                            })
                          }
                          className={cn(
                            'w-full text-left py-2 px-1 flex items-center justify-between gap-2 hover:bg-[var(--surface-hover)] transition-colors duration-150 cursor-pointer rounded-md',
                            FOCUS_RING,
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-[12px]">
                              <StatusIndicator status={obsSeverityStatus(ann.severity)} label={ann.label} />
                              <span className="font-mono text-[11px] text-[var(--ink-subtle)]">
                                {obsModeLabel(ann.mode)} · {ann.serviceId}
                              </span>
                            </div>
                            <div className="text-[11.5px] text-[var(--ink-muted)] truncate">
                              {ann.detail || ann.summary}
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                            {formatClock(ann.isoTs)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Panel bodyClassName="p-0">
        <LogStreamPanel
          mode="full"
          snapshot={snapshot}
          meta={meta}
          initialFilter={effectiveFilter}
          requestNonce={effectiveNonce}
          onCountsChange={setCounts}
          onToast={onToast}
        />
      </Panel>

      <InspectorDrawer
        open={federatedTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFederatedTarget(null);
        }}
        size="lg"
        title={federatedTarget?.title || '联邦只读日志预览'}
        description={federatedTarget?.subtitle}
        testId="logs-federated-preview-drawer"
      >
        <div className="space-y-4 text-[13px]">
          {federatedTarget?.summary && (
            <p className="text-[12.5px] text-[var(--ink-muted)] leading-relaxed pb-3 border-b border-[var(--border-subtle)]">
              {federatedTarget.summary}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="font-semibold text-[var(--ink)]">按需只读联邦日志流</span>
            {federatedState.data && (
              <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                {federatedState.data.entries.length} 行
                {federatedState.data.bytesRead != null ? ` · ${formatBytes(federatedState.data.bytesRead)}` : ''}
                {federatedState.data.truncated ? ' · 已截断' : ''}
              </span>
            )}
          </div>
          {federatedState.loading ? (
            <WidgetSkeleton heightClass="h-[180px]" label="正在按需读取联邦只读日志" />
          ) : federatedState.error ? (
            <div className="rounded-lg border border-[var(--err)]/30 bg-[var(--err)]/5 px-3 py-2 text-[12px] text-[var(--err)]">
              {federatedState.error}
            </div>
          ) : federatedState.data && federatedState.data.entries.length === 0 ? (
            <p className="text-[12px] text-[var(--ink-subtle)]">该联邦源最近 1 小时内无匹配日志行。</p>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/60 max-h-[380px] overflow-auto divide-y divide-[var(--border-subtle)] font-mono text-[11.5px]">
              {(federatedState.data?.entries || []).map((entry, idx) => (
                <div key={`${entry.ts}-${idx}`} className="px-3 py-1.5 flex items-start gap-2.5 leading-relaxed">
                  <span className="text-[var(--ink-subtle)] tabular-nums shrink-0">{formatClock(entry.ts)}</span>
                  <span
                    className={cn(
                      'uppercase shrink-0 w-11',
                      obsSeverityStatus(entry.level) === 'critical'
                        ? 'text-[var(--err)]'
                        : obsSeverityStatus(entry.level) === 'warn'
                          ? 'text-[var(--warn)]'
                          : 'text-[var(--ink-subtle)]',
                    )}
                  >
                    {entry.level || 'info'}
                  </span>
                  <span className="text-[var(--ink)] break-all whitespace-pre-wrap flex-1">{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </InspectorDrawer>
    </ModuleFrame>
  );
}
