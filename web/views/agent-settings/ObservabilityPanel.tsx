import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Eye,
  HardDrive,
  Radar,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  DecisionAdvisorAction,
  DecisionAdvisorRootCause,
  LogNavigationRequest,
  ObservabilityAdapterStatus,
  ObservabilityAnnotation,
  ObservabilityConfig,
  ObservabilityFingerprint,
  ObservabilityLogsReadResponse,
  ObservabilityMetricsRange,
  ObservabilityMetricsResponse,
  ObservabilityRemoteNodeStatus,
  ObservabilitySourceRef,
  ObservabilityStatusResponse,
  StatusTone,
} from '../../types';
import {
  copyToClipboard,
  fetchObservabilityFingerprints,
  fetchObservabilityMetrics,
  fetchObservabilityStatus,
  readObservabilityAdapterLogs,
  triggerObservabilityAnalyze,
  triggerObservabilityPrune,
  triggerObservabilityScan,
  updateObservabilityConfig,
} from '../../api';
import { cn, FOCUS_RING } from '../../lib/cn';
import {
  buildLogJumpFilter,
  buildObservabilityChartSeries,
  classifyObservabilityHealth,
  formatDigestIntervalLabel,
  formatDiskQuota,
  positionAnnotationsOnTimeline,
  summarizeAnnotationsByMode,
  type ObservabilityHealthTone,
} from '../../lib/observability';
import {
  formatBytes,
  formatClock,
  formatCompactNumber,
  formatDateTime,
} from '../../utils/format';
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

const CHART_WIDTH = 640;
const CHART_PLOT_HEIGHT = 152;
const CHART_PAD = 18;
const CHART_TOTAL_HEIGHT = 204;

const RANGE_OPTIONS: ReadonlyArray<{ value: ObservabilityMetricsRange; label: string }> = [
  { value: '1h', label: '1 小时' },
  { value: '6h', label: '6 小时' },
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
];

const DIGEST_PRESET_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '0', label: '关闭 (0)' },
  { value: '5', label: '5 分钟' },
  { value: '15', label: '15 分钟' },
  { value: '30', label: '30 分钟' },
  { value: '60', label: '1 小时 (60)' },
];

interface InlineLogPreviewRequest {
  title: string;
  subtitle: string;
  adapterId?: string;
  nodeId?: string;
  sourceKind?: string;
  target?: string;
  since?: string;
  level?: string;
  query?: string;
}

type InspectorTarget =
  | { kind: 'annotation'; item: ObservabilityAnnotation }
  | { kind: 'fingerprint'; item: ObservabilityFingerprint }
  | { kind: 'adapter-preview'; req: InlineLogPreviewRequest };

function healthToTone(health: ObservabilityHealthTone): StatusTone {
  if (health === 'critical') return 'err';
  if (health === 'warn') return 'warn';
  return 'ok';
}

function healthLabel(health: ObservabilityHealthTone): string {
  if (health === 'critical') return '告警异常';
  if (health === 'warn') return '存在波动';
  return '健康正常';
}

function severityToStatus(severity: string): string {
  const normalized = String(severity || '').toLowerCase();
  if (normalized === 'critical' || normalized === 'error' || normalized === 'err') return 'critical';
  if (normalized === 'warn' || normalized === 'warning') return 'warn';
  return 'healthy';
}

function severityLabel(severity: string): string {
  const normalized = String(severity || '').toLowerCase();
  if (normalized === 'critical') return '严重';
  if (normalized === 'error' || normalized === 'err') return '错误';
  if (normalized === 'warn' || normalized === 'warning') return '告警';
  return '提示';
}

function modeKind(mode: string): 'llm' | 'deterministic' | 'silent_skip' {
  const normalized = String(mode || '').trim().toLowerCase();
  if (normalized === 'llm') return 'llm';
  if (normalized.includes('silent') || normalized.includes('skip')) return 'silent_skip';
  return 'deterministic';
}

function modeLabel(mode: string): string {
  const kind = modeKind(mode);
  if (kind === 'llm') return 'LLM 决策归因';
  if (kind === 'silent_skip') return '静默跳过 · 0 Token';
  return '确定性规则归因';
}

function riskLabel(risk: string): string {
  if (risk === 'high') return '高风险';
  if (risk === 'medium') return '中风险';
  return '低风险';
}

function sourceKindLabel(kind: string): string {
  if (kind === 'journald') return 'journald';
  if (kind === 'file') return '原生文件';
  if (kind === 'docker') return 'Docker';
  if (kind === 'http-json') return 'HTTP JSON';
  if (kind === 'remote') return '远端探针';
  return kind || 'unified';
}

function clampInt(raw: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function mapJumpFilterToLogNav(
  sourceRef: ObservabilitySourceRef | null | undefined,
  fallbackServiceId?: string,
  level = 'all',
): { nativeReq: LogNavigationRequest | null; previewReq: InlineLogPreviewRequest } {
  const cleanFallback = fallbackServiceId && fallbackServiceId !== 'all' ? fallbackServiceId : undefined;
  const jump = buildLogJumpFilter(sourceRef, cleanFallback);
  const nodeId = sourceRef?.nodeId && sourceRef.nodeId !== 'all' ? sourceRef.nodeId : undefined;

  if (jump.source === 'journald') {
    const unit = jump.unit || cleanFallback || 'all';
    return {
      nativeReq: {
        source: 'service',
        unit,
        target: unit,
        targets: [unit],
        since: jump.since || '1h',
        level,
        query: '',
      },
      previewReq: {
        title: `按需直读 · ${unit}`,
        subtitle: `journald · ${nodeId || 'local'}`,
        sourceKind: 'journald',
        target: unit,
        nodeId,
        since: jump.since || '1h',
        level,
      },
    };
  }

  if (jump.source === 'file') {
    const fileId = jump.file || '';
    return {
      nativeReq: {
        source: 'file',
        target: fileId,
        targets: fileId ? [fileId] : ['all'],
        since: jump.since || '1h',
        level,
        query: '',
      },
      previewReq: {
        title: `按需直读 · ${fileId || '原生文件'}`,
        subtitle: `file · ${nodeId || 'local'}`,
        sourceKind: 'file',
        target: fileId,
        nodeId,
        since: jump.since || '1h',
        level,
      },
    };
  }

  if (jump.source === 'unified') {
    const targets = jump.targets && jump.targets.length > 0 ? jump.targets : ['all'];
    return {
      nativeReq: {
        source: 'unified',
        target: targets[0],
        targets,
        since: jump.since || '1h',
        level,
        query: '',
      },
      previewReq: {
        title: `按需直读 · ${targets.join(', ')}`,
        subtitle: `unified · ${nodeId || 'local'}`,
        sourceKind: 'journald',
        target: targets[0] === 'all' ? '' : targets[0],
        nodeId,
        since: jump.since || '1h',
        level,
      },
    };
  }

  return {
    nativeReq: null,
    previewReq: {
      title: `联邦直读预览 · ${jump.target || cleanFallback || jump.source}`,
      subtitle: `${sourceKindLabel(jump.source)} · ${nodeId || 'local'}`,
      sourceKind: jump.source,
      target: jump.target || cleanFallback || '',
      nodeId,
      since: jump.since || '1h',
      level,
    },
  };
}

function parseRootCauses(payload: Record<string, unknown> | null | undefined): DecisionAdvisorRootCause[] {
  const raw = payload?.rootCauses;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      category: String(entry.category || 'unknown'),
      confidence: typeof entry.confidence === 'number' && Number.isFinite(entry.confidence) ? entry.confidence : 0,
      evidence: String(entry.evidence || ''),
      explanation: String(entry.explanation || ''),
    }));
}

function parseSuggestedActions(payload: Record<string, unknown> | null | undefined): DecisionAdvisorAction[] {
  const raw = payload?.suggestedActions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => {
      const rawRisk = String(entry.risk || 'low').toLowerCase();
      const risk: 'low' | 'medium' | 'high' =
        rawRisk === 'high' ? 'high' : rawRisk === 'medium' ? 'medium' : 'low';
      return {
        title: String(entry.title || '人工复核建议'),
        commandHint: entry.commandHint ? String(entry.commandHint) : undefined,
        risk,
        requiresApproval: entry.requiresApproval !== false,
      };
    });
}

function parseAffectedScopes(payload: Record<string, unknown> | null | undefined): string[] {
  const raw = payload?.affectedScopes;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item || '').trim()).filter(Boolean);
}

function isConfigEqual(left: ObservabilityConfig | null, right: ObservabilityConfig | null): boolean {
  if (!left || !right) return true;
  return (
    left.enabled === right.enabled &&
    left.retentionDays === right.retentionDays &&
    left.maxDiskMb === right.maxDiskMb &&
    left.fastScanSec === right.fastScanSec &&
    left.triageDebounceSec === right.triageDebounceSec &&
    left.triageEnabled === right.triageEnabled &&
    left.digestIntervalMinutes === right.digestIntervalMinutes &&
    left.silentSkip === right.silentSkip &&
    left.heartbeatDigestHours === right.heartbeatDigestHours &&
    left.advisorEnabled === right.advisorEnabled &&
    left.decisionModel === right.decisionModel &&
    left.cooldownMinutes === right.cooldownMinutes &&
    left.maxCallsPerHour === right.maxCallsPerHour &&
    left.dailyTokenBudget === right.dailyTokenBudget
  );
}

export interface ObservabilityPanelProps {
  readOnly?: boolean;
  modelOptions: ReadonlyArray<CommandComboboxOption>;
  onOpenLogs?: (req: LogNavigationRequest) => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}

export function ObservabilityPanel({
  readOnly = false,
  modelOptions,
  onOpenLogs,
  onToast,
}: ObservabilityPanelProps) {
  const [status, setStatus] = React.useState<ObservabilityStatusResponse | null>(null);
  const [metrics, setMetrics] = React.useState<ObservabilityMetricsResponse | null>(null);
  const [fingerprints, setFingerprints] = React.useState<ObservabilityFingerprint[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [range, setRange] = React.useState<ObservabilityMetricsRange>('6h');
  const [nodeFilter, setNodeFilter] = React.useState('');
  const [serviceFilter, setServiceFilter] = React.useState('');
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const [draft, setDraft] = React.useState<ObservabilityConfig | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState<'scan' | 'triage' | 'digest' | 'prune' | null>(null);

  const [inspector, setInspector] = React.useState<InspectorTarget | null>(null);
  const [previewState, setPreviewState] = React.useState<{
    loading: boolean;
    error: string | null;
    data: ObservabilityLogsReadResponse | null;
    activeKey: string;
  }>({ loading: false, error: null, data: null, activeKey: '' });
  const [copiedCmdKey, setCopiedCmdKey] = React.useState<string | null>(null);

  const draftDirtyRef = React.useRef(false);

  const loadAll = React.useCallback(
    async (silent = false, signal?: AbortSignal) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const [statusRes, metricsRes, fpRes] = await Promise.all([
          fetchObservabilityStatus(signal),
          fetchObservabilityMetrics(
            {
              range,
              nodeId: nodeFilter || undefined,
              serviceId: serviceFilter || undefined,
            },
            signal,
          ),
          fetchObservabilityFingerprints(
            {
              range,
              nodeId: nodeFilter || undefined,
              serviceId: serviceFilter || undefined,
              limit: 30,
            },
            signal,
          ),
        ]);
        if (signal?.aborted) return;
        setStatus(statusRes);
        setMetrics(metricsRes);
        setFingerprints(fpRes.items || []);
        setError(null);
        if (!draftDirtyRef.current && statusRes?.config) {
          setDraft(statusRes.config);
        }
      } catch (err) {
        if (signal?.aborted) return;
        setError((err as Error).message || '加载联邦日志可观测状态失败');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [range, nodeFilter, serviceFilter],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void loadAll(status !== null, controller.signal);
    return () => controller.abort();
  }, [loadAll]);

  const isDirty = React.useMemo(
    () => !isConfigEqual(draft, status?.config ?? null),
    [draft, status?.config],
  );

  React.useEffect(() => {
    draftDirtyRef.current = isDirty;
  }, [isDirty]);

  const decisionModelOptions = React.useMemo<CommandComboboxOption[]>(() => {
    const seen = new Set<string>();
    const result: CommandComboboxOption[] = [];
    const current = draft?.decisionModel || status?.config?.decisionModel || DEFAULT_DECISION_MODEL;
    const append = (option: CommandComboboxOption) => {
      if (!option.value || seen.has(option.value)) return;
      seen.add(option.value);
      result.push(option);
    };
    if (current) {
      append({
        value: current,
        label: current,
        description: '当前决策模型',
        group: '已选模型',
      });
    }
    append({
      value: DEFAULT_DECISION_MODEL,
      label: DEFAULT_DECISION_MODEL,
      description: '默认轻量低延迟归因模型',
      group: '推荐模型',
    });
    for (const opt of modelOptions) append(opt);
    return result;
  }, [draft?.decisionModel, status?.config?.decisionModel, modelOptions]);

  const nodeOptions = React.useMemo(() => {
    const set = new Set<string>();
    set.add('local');
    for (const node of status?.remoteNodes || []) {
      if (node.nodeId) set.add(node.nodeId);
    }
    for (const rollup of status?.serviceRollups || []) {
      if (rollup.nodeId && rollup.nodeId !== 'all') set.add(rollup.nodeId);
    }
    return Array.from(set);
  }, [status?.remoteNodes, status?.serviceRollups]);

  const serviceOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const rollup of status?.serviceRollups || []) {
      if (rollup.serviceId && rollup.serviceId !== 'all') set.add(rollup.serviceId);
    }
    for (const adapter of status?.adapters || []) {
      if (adapter.serviceId && adapter.serviceId !== 'all') set.add(adapter.serviceId);
    }
    return Array.from(set).sort((left, right) => left.localeCompare(right));
  }, [status?.serviceRollups, status?.adapters]);

  const loadInlineLogPreview = React.useCallback(async (req: InlineLogPreviewRequest) => {
    const key = `${req.adapterId || ''}|${req.sourceKind || ''}|${req.nodeId || ''}|${req.target || ''}`;
    setPreviewState({ loading: true, error: null, data: null, activeKey: key });
    try {
      const res = await readObservabilityAdapterLogs({
        adapterId: req.adapterId,
        nodeId: req.nodeId,
        sourceKind: req.sourceKind,
        target: req.target,
        since: req.since || '1h',
        level: req.level || 'all',
        limit: 80,
        q: req.query,
      });
      setPreviewState({
        loading: false,
        error: res.ok === false ? res.error || '直读返回失败' : null,
        data: res,
        activeKey: key,
      });
    } catch (err) {
      setPreviewState({
        loading: false,
        error: (err as Error).message || '按需直读日志失败',
        data: null,
        activeKey: key,
      });
    }
  }, []);

  const openAnnotationInspector = React.useCallback(
    (annotation: ObservabilityAnnotation) => {
      setPreviewState({ loading: false, error: null, data: null, activeKey: '' });
      setInspector({ kind: 'annotation', item: annotation });
      const mapped = mapJumpFilterToLogNav(annotation.sourceRef, annotation.serviceId);
      if (!mapped.nativeReq && annotation.sourceRef) {
        void loadInlineLogPreview(mapped.previewReq);
      }
    },
    [loadInlineLogPreview],
  );

  const openFingerprintInspector = React.useCallback(
    (fp: ObservabilityFingerprint) => {
      setPreviewState({ loading: false, error: null, data: null, activeKey: '' });
      setInspector({ kind: 'fingerprint', item: fp });
      const mapped = mapJumpFilterToLogNav(fp.sourceRef, fp.serviceId, fp.level || 'all');
      if (!mapped.nativeReq && fp.sourceRef) {
        void loadInlineLogPreview(mapped.previewReq);
      }
    },
    [loadInlineLogPreview],
  );

  const openAdapterPreview = React.useCallback(
    (req: InlineLogPreviewRequest) => {
      setInspector({ kind: 'adapter-preview', req });
      void loadInlineLogPreview(req);
    },
    [loadInlineLogPreview],
  );

  const handleNativeJump = React.useCallback(
    (sourceRef: ObservabilitySourceRef | null | undefined, fallbackServiceId?: string, level = 'all') => {
      const mapped = mapJumpFilterToLogNav(sourceRef, fallbackServiceId, level);
      if (mapped.nativeReq && onOpenLogs) {
        setInspector(null);
        onOpenLogs(mapped.nativeReq);
        return;
      }
      openAdapterPreview(mapped.previewReq);
    },
    [onOpenLogs, openAdapterPreview],
  );

  const handleSaveConfig = async () => {
    if (readOnly || !draft || saving) return;
    setSaving(true);
    try {
      const res = await updateObservabilityConfig(draft);
      draftDirtyRef.current = false;
      if (res.config) setDraft(res.config);
      onToast?.('联邦日志与可观测配置已保存', 'ok');
      await loadAll(true);
    } catch (err) {
      onToast?.(`保存失败：${(err as Error).message}`, 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerScan = async () => {
    if (readOnly || busyAction !== null) return;
    setBusyAction('scan');
    try {
      const res = await triggerObservabilityScan();
      const anomalyCount = Array.isArray(res.anomalies) ? res.anomalies.length : 0;
      onToast?.(
        res.skipped
          ? '扫描已跳过（当前功能未开启或无活跃适配器）'
          : `快速扫描完成：扫描 ${res.scanned ?? 0} 条，检出 ${anomalyCount} 项异常`,
        'ok',
      );
      await loadAll(true);
    } catch (err) {
      onToast?.(`触发扫描失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyAction(null);
    }
  };

  const handleTriggerAnalyze = async (mode: 'triage' | 'digest', targetService?: string, targetNode?: string) => {
    if (readOnly || busyAction !== null) return;
    setBusyAction(mode);
    try {
      const res = await triggerObservabilityAnalyze({
        mode,
        force: true,
        serviceId: targetService || serviceFilter || undefined,
        nodeId: targetNode || nodeFilter || undefined,
      });
      if (res.skipped) {
        onToast?.(`分析已跳过：${res.skipReason || '无待归因异常或处于静默/冷却窗口'}`, 'info');
      } else {
        onToast?.(
          mode === 'triage' ? '异常分诊归因已完成' : '周期遥测巡检结论已生成',
          'ok',
        );
      }
      await loadAll(true);
      if (res.annotation) {
        openAnnotationInspector(res.annotation);
      }
    } catch (err) {
      onToast?.(`触发归因失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyAction(null);
    }
  };

  const handleTriggerPrune = async () => {
    if (readOnly || busyAction !== null) return;
    setBusyAction('prune');
    try {
      const res = await triggerObservabilityPrune();
      const removed = res.removedShards?.length ?? 0;
      onToast?.(
        removed > 0
          ? `已裁剪 ${removed} 个分片，当前保留 ${res.shardCount} 个分片（${formatBytes(res.totalBytes)}）`
          : `当前分片占用在配额与保留期内（${res.shardCount} 分片 · ${formatBytes(res.totalBytes)}）`,
        'ok',
      );
      await loadAll(true);
    } catch (err) {
      onToast?.(`分片裁剪失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyCommand = async (cmdKey: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedCmdKey(cmdKey);
      onToast?.('只读参考命令已复制（未自动执行）', 'ok');
      window.setTimeout(() => {
        setCopiedCmdKey((prev) => (prev === cmdKey ? null : prev));
      }, 1800);
    } else {
      onToast?.('复制失败，请手动选中复制', 'err');
    }
  };

  const chartPoints = metrics?.points || [];
  const chartSeries = React.useMemo(
    () => buildObservabilityChartSeries(chartPoints, CHART_WIDTH, CHART_PLOT_HEIGHT, CHART_PAD),
    [chartPoints],
  );
  const chartAnnotations = React.useMemo(
    () => (metrics?.annotations?.length ? metrics.annotations : status?.recentAnnotations || []),
    [metrics?.annotations, status?.recentAnnotations],
  );
  const annotationPlacements = React.useMemo(
    () =>
      positionAnnotationsOnTimeline(
        chartAnnotations,
        chartSeries.hasData ? chartSeries.startTs : metrics?.startMs ?? 0,
        chartSeries.hasData ? chartSeries.endTs : metrics?.endMs ?? 0,
        CHART_WIDTH,
        CHART_PAD,
      ),
    [chartAnnotations, chartSeries.hasData, chartSeries.startTs, chartSeries.endTs, metrics?.startMs, metrics?.endMs],
  );
  const modeSummary = React.useMemo(
    () => summarizeAnnotationsByMode(chartAnnotations),
    [chartAnnotations],
  );

  const config = draft || status?.config || null;

  const digestSelectValue = React.useMemo(() => {
    const mins = config?.digestIntervalMinutes ?? 0;
    const allowed = ['0', '5', '15', '30', '60'];
    const str = String(mins);
    return allowed.includes(str) ? str : '15';
  }, [config?.digestIntervalMinutes]);

  if (loading && !status) {
    return (
      <div className="space-y-6" data-testid="settings-section-observability">
        <WidgetSkeleton heightClass="h-[116px]" label="正在加载联邦日志可观测指标" />
        <WidgetSkeleton heightClass="h-[260px]" label="正在加载 Logs-to-Metrics 趋势与标注" />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div data-testid="settings-section-observability">
        <ErrorState
          title="联邦日志与可观测模块加载失败"
          message={error}
          onRetry={() => void loadAll(false)}
          retrying={refreshing}
        />
      </div>
    );
  }

  const summary1h = status?.summary1h || {
    errorCount: 0,
    warnCount: 0,
    newFingerprintCount: 0,
    restartCount: 0,
    http5xxCount: 0,
    totalScanned: 0,
  };
  const storage = status?.storage;
  const cadence = status?.cadence;
  const advisor = status?.advisor;
  const budget = advisor?.budget;

  const diskQuota = formatDiskQuota(
    storage?.totalBytes ?? 0,
    config?.maxDiskMb ?? storage?.maxDiskMb ?? 256,
  );
  const overallHealth = classifyObservabilityHealth({
    errorCount: summary1h.errorCount,
    newFingerprintCount: summary1h.newFingerprintCount,
    restartCount: summary1h.restartCount,
    http5xxCount: summary1h.http5xxCount,
    diskUsedPct: diskQuota.pct,
  });

  const activeHoverPoint =
    hoveredIdx != null && chartSeries.plottedPoints[hoveredIdx]
      ? chartSeries.plottedPoints[hoveredIdx]
      : null;

  const readOnlyTitle = readOnly ? '当前处于只读模式，变更与主动触发已禁用' : undefined;

  const adapters = status?.adapters || [];
  const remoteNodes = status?.remoteNodes || [];
  const recentDigests = status?.recentDigests || [];

  const inspectedAnnotation = inspector?.kind === 'annotation' ? inspector.item : null;
  const inspectedFingerprint = inspector?.kind === 'fingerprint' ? inspector.item : null;
  const inspectedAdapterPreview = inspector?.kind === 'adapter-preview' ? inspector.req : null;

  const annotationRootCauses = inspectedAnnotation ? parseRootCauses(inspectedAnnotation.payload) : [];
  const annotationActions = inspectedAnnotation ? parseSuggestedActions(inspectedAnnotation.payload) : [];
  const annotationScopes = inspectedAnnotation ? parseAffectedScopes(inspectedAnnotation.payload) : [];

  const inspectorSourceRef = inspectedAnnotation
    ? inspectedAnnotation.sourceRef
    : inspectedFingerprint
      ? inspectedFingerprint.sourceRef
      : null;
  const inspectorFallbackService = inspectedAnnotation
    ? inspectedAnnotation.serviceId
    : inspectedFingerprint
      ? inspectedFingerprint.serviceId
      : undefined;
  const inspectorJumpMapping =
    inspectedAnnotation || inspectedFingerprint
      ? mapJumpFilterToLogNav(
          inspectorSourceRef,
          inspectorFallbackService,
          inspectedFingerprint?.level || 'all',
        )
      : null;

  return (
    <div className="space-y-6" data-testid="settings-section-observability">
      {readOnly && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/70 px-4 py-2.5 flex items-center gap-2 text-[12.5px] text-[var(--ink-muted)]">
          <AlertTriangle className="size-3.5 text-[var(--warn)] shrink-0" strokeWidth={1.75} />
          <span>只读模式已启用：配置保存、立即扫描、异常分诊、周期巡检与分片裁剪按钮均已禁用。</span>
        </div>
      )}

      <div data-testid="observability-kpi-strip">
        <KpiStrip
          asymmetric
          cells={[
            {
              label: '1h 错误与新指纹',
              meta: `${healthLabel(overallHealth)} · 新指纹 ${summary1h.newFingerprintCount}`,
              value: String(summary1h.errorCount),
              numeric: { primary: summary1h.errorCount },
              sub: `警告 ${summary1h.warnCount} · 扫描 ${formatCompactNumber(summary1h.totalScanned)} 行 · 静默跳过 ${cadence?.silentSkipCount ?? 0}`,
              tone: healthToTone(overallHealth),
            },
            {
              label: '重启与 HTTP 5xx',
              meta: `新指纹 ${summary1h.newFingerprintCount}`,
              value: `${summary1h.restartCount} / ${summary1h.http5xxCount}`,
              sub: `异常重启 ${summary1h.restartCount} · 5xx 突增 ${summary1h.http5xxCount}`,
              tone:
                summary1h.restartCount > 0 || summary1h.http5xxCount >= 5
                  ? 'err'
                  : summary1h.http5xxCount > 0
                    ? 'warn'
                    : 'ok',
            },
            {
              label: '磁盘配额',
              meta: `${Math.round(diskQuota.pct)}%`,
              value: `${diskQuota.usedLabel} / ${diskQuota.capLabel}`,
              sub: `${storage?.shardCount ?? 0} 个日分片 · 保留 ${config?.retentionDays ?? storage?.retentionDays ?? 14} 天`,
              tone: diskQuota.tone === 'crit' ? 'err' : diskQuota.tone === 'warn' ? 'warn' : 'ok',
            },
            {
              label: '共享决策预算',
              meta: advisor?.enabled ? 'LLM + 规则' : '仅规则 0-token',
              value: `${budget?.callsLastHour ?? 0}/${budget?.maxCallsPerHour ?? config?.maxCallsPerHour ?? 12}`,
              sub: `日 Token ${formatCompactNumber(budget?.tokensToday ?? 0)} / ${formatCompactNumber(budget?.dailyTokenBudget ?? config?.dailyTokenBudget ?? 120_000)}`,
              tone: budget?.exhausted ? 'warn' : advisor?.enabled ? 'ok' : 'muted',
            },
          ]}
        />
      </div>

      <SettingGroup
        title="Logs-to-Metrics 确定性趋势与 AI 标注"
        description="主序列由只读日志索引确定性聚合，不含模型生成数值；底部轨道展示事件分诊、周期巡检与静默跳过标记，点击可打开详情与原位日志跳转。"
        meta={
          cadence?.lastFastScanAt
            ? `上次扫描 ${formatDateTime(cadence.lastFastScanAt)}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadAll(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn('size-3.5', refreshing && 'animate-spin')}
                strokeWidth={1.75}
              />
              刷新
            </Button>
            <Button
              variant="secondary"
              size="sm"
              data-testid="observability-scan-btn"
              disabled={readOnly || busyAction !== null}
              title={readOnlyTitle}
              onClick={() => void handleTriggerScan()}
            >
              <Radar className="size-3.5" strokeWidth={1.75} />
              {busyAction === 'scan' ? '扫描中...' : '立即扫描'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              data-testid="observability-triage-btn"
              disabled={readOnly || busyAction !== null}
              title={readOnlyTitle}
              onClick={() => void handleTriggerAnalyze('triage')}
            >
              <Sparkles className="size-3.5" strokeWidth={1.75} />
              {busyAction === 'triage' ? '分诊中...' : '立即异常分诊'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              data-testid="observability-digest-btn"
              disabled={readOnly || busyAction !== null}
              title={readOnlyTitle}
              onClick={() => void handleTriggerAnalyze('digest')}
            >
              {busyAction === 'digest' ? '巡检中...' : '立即周期巡检'}
            </Button>
          </div>
        }
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <SegmentedControl
                value={range}
                onChange={setRange}
                options={RANGE_OPTIONS}
                ariaLabel="可观测时间范围"
                testId="observability-range-control"
              />
              <NativeSelect
                value={nodeFilter}
                onChange={(ev) => setNodeFilter(ev.target.value)}
                aria-label="按节点筛选"
                className="w-[140px]"
              >
                <option value="">全部节点</option>
                {nodeOptions.map((nodeId) => (
                  <option key={nodeId} value={nodeId}>
                    {nodeId}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={serviceFilter}
                onChange={(ev) => setServiceFilter(ev.target.value)}
                aria-label="按服务筛选"
                className="w-[170px]"
              >
                <option value="">全部服务</option>
                {serviceOptions.map((svcId) => (
                  <option key={svcId} value={svcId}>
                    {svcId}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="text-[11.5px] font-mono text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-[var(--ink-muted)]">确定性衍生指标，不含模型生成数值</span>
              <span>·</span>
              <span>
                标注 {modeSummary.total} (LLM {modeSummary.llmCount} / 规则 {modeSummary.deterministicCount} / 静默 {modeSummary.silentSkipCount})
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/45 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] font-mono tabular-nums text-[var(--ink-muted)]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-[var(--err)]" />
                  Errors ({metrics?.totals?.errorCount ?? 0})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-[var(--warn)]" />
                  Warnings ({metrics?.totals?.warnCount ?? 0})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 bg-[var(--accent)]" />
                  新指纹 ({metrics?.totals?.newFingerprintCount ?? 0})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 border-t border-dashed border-[var(--err)]" />
                  5xx ({metrics?.totals?.http5xxCount ?? 0})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 border-t border-dotted border-[var(--ink-muted)]" />
                  重启 ({metrics?.totals?.restartCount ?? 0})
                </span>
              </div>
              {activeHoverPoint ? (
                <span className="text-[var(--ink)]">
                  {formatClock(activeHoverPoint.point.isoTs)} · err {activeHoverPoint.point.errorCount} · warn{' '}
                  {activeHoverPoint.point.warnCount} · fp {activeHoverPoint.point.newFingerprintCount} · 5xx{' '}
                  {activeHoverPoint.point.http5xxCount} · scan {activeHoverPoint.point.totalScanned}
                </span>
              ) : (
                <span>步长 {metrics?.stepSec ?? 300}s · 峰值 {chartSeries.maxY}</span>
              )}
            </div>

            {chartSeries.hasData ? (
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_TOTAL_HEIGHT}`}
                className="w-full h-[204px] overflow-visible select-none"
                role="img"
                aria-label="确定性日志趋势与 AI 标注时间线"
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {[0, 0.5, 1].map((ratio) => {
                  const yPos = CHART_PLOT_HEIGHT - CHART_PAD - ratio * (CHART_PLOT_HEIGHT - CHART_PAD * 2);
                  const labelVal = Math.round(chartSeries.maxY * ratio);
                  return (
                    <g key={ratio}>
                      <line
                        x1={CHART_PAD}
                        x2={CHART_WIDTH - CHART_PAD}
                        y1={yPos}
                        y2={yPos}
                        stroke="var(--border-subtle)"
                        strokeDasharray={ratio === 0 ? undefined : '3 3'}
                        strokeWidth={1}
                      />
                      <text
                        x={CHART_PAD}
                        y={Math.max(10, yPos - 3)}
                        fill="var(--ink-subtle)"
                        fontSize={9.5}
                        fontFamily="var(--font-mono)"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {chartSeries.warnPath && (
                  <path
                    d={chartSeries.warnPath}
                    fill="none"
                    stroke="var(--warn)"
                    strokeWidth={1.5}
                    strokeOpacity={0.85}
                    strokeLinejoin="round"
                  />
                )}
                {chartSeries.newFpPath && (
                  <path
                    d={chartSeries.newFpPath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                  />
                )}
                {chartSeries.http5xxPath && (
                  <path
                    d={chartSeries.http5xxPath}
                    fill="none"
                    stroke="var(--err)"
                    strokeWidth={1.25}
                    strokeDasharray="4 3"
                    strokeOpacity={0.75}
                  />
                )}
                {chartSeries.restartPath && (
                  <path
                    d={chartSeries.restartPath}
                    fill="none"
                    stroke="var(--ink-muted)"
                    strokeWidth={1.25}
                    strokeDasharray="2 3"
                  />
                )}
                {chartSeries.errorPath && (
                  <path
                    d={chartSeries.errorPath}
                    fill="none"
                    stroke="var(--err)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                )}

                {activeHoverPoint && (
                  <g>
                    <line
                      x1={activeHoverPoint.x}
                      x2={activeHoverPoint.x}
                      y1={CHART_PAD}
                      y2={CHART_PLOT_HEIGHT - CHART_PAD}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <circle cx={activeHoverPoint.x} cy={activeHoverPoint.errorY} r={3.5} fill="var(--err)" />
                    <circle cx={activeHoverPoint.x} cy={activeHoverPoint.warnY} r={3} fill="var(--warn)" />
                  </g>
                )}

                {chartSeries.plottedPoints.map((plotted, idx) => (
                  <circle
                    key={plotted.ts}
                    cx={plotted.x}
                    cy={plotted.errorY}
                    r={8}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoveredIdx(idx)}
                  />
                ))}

                <line
                  x1={CHART_PAD}
                  x2={CHART_WIDTH - CHART_PAD}
                  y1={CHART_PLOT_HEIGHT + 6}
                  y2={CHART_PLOT_HEIGHT + 6}
                  stroke="var(--border-subtle)"
                  strokeWidth={1}
                />
                <text
                  x={CHART_PAD}
                  y={CHART_PLOT_HEIGHT + 18}
                  fill="var(--ink-subtle)"
                  fontSize={9.5}
                  fontFamily="var(--font-mono)"
                >
                  AI / 规则次级标注轨道（点击查看归因与直读原位日志）
                </text>

                {annotationPlacements.map((placement) => {
                  const kind = modeKind(placement.annotation.mode);
                  const markerY = CHART_PLOT_HEIGHT + 28 + placement.lane * 6;
                  const isCrit = placement.annotation.severity === 'critical';
                  const isWarn = placement.annotation.severity === 'warn';
                  const strokeColor =
                    kind === 'silent_skip'
                      ? 'var(--ink-subtle)'
                      : kind === 'llm'
                        ? 'var(--accent)'
                        : isCrit
                          ? 'var(--err)'
                          : isWarn
                            ? 'var(--warn)'
                            : 'var(--ok)';
                  const fillColor = kind === 'silent_skip' ? 'var(--surface)' : strokeColor;
                  return (
                    <g
                      key={placement.annotation.id}
                      className="cursor-pointer"
                      onClick={() => openAnnotationInspector(placement.annotation)}
                    >
                      <title>{`${placement.annotation.label} (${modeLabel(placement.annotation.mode)}) · ${formatDateTime(placement.annotation.isoTs)}`}</title>
                      <line
                        x1={placement.x}
                        x2={placement.x}
                        y1={CHART_PAD}
                        y2={markerY - 5}
                        stroke={strokeColor}
                        strokeOpacity={kind === 'silent_skip' ? 0.25 : 0.42}
                        strokeDasharray="2 3"
                        strokeWidth={1}
                      />
                      {kind === 'llm' ? (
                        <polygon
                          points={`${placement.x},${markerY - 5} ${placement.x + 5},${markerY} ${placement.x},${markerY + 5} ${placement.x - 5},${markerY}`}
                          fill={fillColor}
                          stroke={isCrit ? 'var(--err)' : 'var(--surface)'}
                          strokeWidth={1.2}
                        />
                      ) : (
                        <circle
                          cx={placement.x}
                          cy={markerY}
                          r={4.2}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={1.5}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <EmptyState message="当前筛选窗口暂无确定性日志聚合样本，执行扫描或等待后台快速扫描周期写入后将自动绘制曲线。" />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--ink-subtle)]">
              <div className="flex flex-wrap items-center gap-3">
                <span>菱形 · LLM 决策归因</span>
                <span>实心点 · 确定性规则归因</span>
                <span>空心环 · 静默跳过 (0 Token)</span>
              </div>
              {chartSeries.hasData && (
                <span className="tabular-nums">
                  {formatDateTime(new Date(chartSeries.startTs).toISOString())} →{' '}
                  {formatDateTime(new Date(chartSeries.endTs).toISOString())}
                </span>
              )}
            </div>
          </div>

          {chartAnnotations.length > 0 && (
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {chartAnnotations.slice(0, 6).map((ann) => (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => openAnnotationInspector(ann)}
                  className={cn(
                    'w-full text-left py-2.5 px-1 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors duration-150 cursor-pointer rounded-lg',
                    FOCUS_RING,
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
                      <StatusIndicator status={severityToStatus(ann.severity)} label={ann.label} />
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                        {modeLabel(ann.mode)} · {ann.nodeId}/{ann.serviceId}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--ink-muted)] truncate">
                      {ann.detail || ann.summary}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                      {formatDateTime(ann.isoTs)}
                    </span>
                    <ChevronRight className="size-4 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SettingGroup>

      {config && (
        <SettingGroup
          title="巡检节奏、存储配额与共享决策模型"
          description="控制多源只读日志扫描节奏、定时巡检频率档位、无漂移静默跳过（0 Token）、磁盘分片配额与共享 DecisionAdvisor 预算。"
          meta={
            cadence
              ? `当前周期档位 ${formatDigestIntervalLabel(config.digestIntervalMinutes)} · 待分诊 ${cadence.pendingTriageCount}`
              : undefined
          }
          actions={
            <div className="flex items-center gap-2">
              {isDirty && !readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => status?.config && setDraft(status.config)}
                  disabled={saving}
                >
                  重置
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                data-testid="observability-save-config-btn"
                disabled={readOnly || !isDirty || saving}
                title={readOnlyTitle}
                onClick={() => void handleSaveConfig()}
              >
                {saving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          }
        >
          <div className="divide-y divide-[var(--border-subtle)]">
            <SettingRow
              title="启用联邦日志索引与可观测"
              description="持续增量扫描本机 journald、白名单文件、Docker/HTTP 适配器及远端探针摘要，所有源严格只读。"
              control={
                <ToggleSwitch
                  checked={config.enabled}
                  disabled={readOnly}
                  onCheckedChange={(checked) => setDraft({ ...config, enabled: checked })}
                  label={config.enabled ? '已开启' : '已关闭'}
                  ariaLabel="启用联邦日志索引与可观测"
                  testId="observability-enabled-toggle"
                />
              }
            />
            <SettingRow
              title="快速扫描与事件防抖"
              description="快速扫描周期（10–300s）仅做确定性指纹聚合，0 Token；命中异常且开启分诊时按防抖窗口合并归因。"
              stacked
              control={
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                  <label className="space-y-1">
                    <span className="block text-[11.5px] text-[var(--ink-muted)]">快速扫描周期 (10–300s)</span>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      disabled={readOnly}
                      value={config.fastScanSec}
                      onChange={(ev) =>
                        setDraft({
                          ...config,
                          fastScanSec: clampInt(ev.target.value, config.fastScanSec, 10, 300),
                        })
                      }
                      className={cn(inputBaseClass, 'w-full font-mono tabular-nums')}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[11.5px] text-[var(--ink-muted)]">异常分诊防抖 (15–120s)</span>
                    <input
                      type="number"
                      min={15}
                      max={120}
                      disabled={readOnly}
                      value={config.triageDebounceSec}
                      onChange={(ev) =>
                        setDraft({
                          ...config,
                          triageDebounceSec: clampInt(ev.target.value, config.triageDebounceSec, 15, 120),
                        })
                      }
                      className={cn(inputBaseClass, 'w-full font-mono tabular-nums')}
                    />
                  </label>
                  <div className="flex items-end pb-1">
                    <ToggleSwitch
                      checked={config.triageEnabled}
                      disabled={readOnly}
                      onCheckedChange={(checked) => setDraft({ ...config, triageEnabled: checked })}
                      label={config.triageEnabled ? '自动异常分诊开启' : '异常分诊关闭'}
                      ariaLabel="启用自动异常分诊"
                      testId="observability-triage-toggle"
                    />
                  </div>
                </div>
              }
            />
            <SettingRow
              title="定时周期巡检频率档位"
              description={`当前档位：${formatDigestIntervalLabel(config.digestIntervalMinutes)}。关闭时仅按事件分诊或手动触发。`}
              stacked
              control={
                <SegmentedControl
                  value={digestSelectValue}
                  onChange={(nextVal) =>
                    setDraft({
                      ...config,
                      digestIntervalMinutes: Number.parseInt(nextVal, 10) || 0,
                    })
                  }
                  options={DIGEST_PRESET_OPTIONS}
                  disabled={readOnly}
                  ariaLabel="定时周期巡检频率档位"
                  testId="observability-digest-interval-control"
                />
              }
            />
            <SettingRow
              title="无漂移静默跳过 · 0 Token 与心跳兜底"
              description="周期窗口内无错误突增、无新指纹且无服务跳变时跳过模型调用；心跳兜底周期（0–24h，0 表示关闭）用于定期确认健康。"
              stacked
              control={
                <div className="flex flex-wrap items-center justify-between gap-4 w-full">
                  <ToggleSwitch
                    checked={config.silentSkip}
                    disabled={readOnly}
                    onCheckedChange={(checked) => setDraft({ ...config, silentSkip: checked })}
                    label="无漂移静默跳过 · 0 Token"
                    ariaLabel="无漂移静默跳过"
                    testId="observability-silent-skip-toggle"
                  />
                  <label className="flex items-center gap-2 text-[12px] text-[var(--ink-muted)]">
                    <span>心跳兜底 (0–24h)</span>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      disabled={readOnly}
                      value={config.heartbeatDigestHours}
                      onChange={(ev) =>
                        setDraft({
                          ...config,
                          heartbeatDigestHours: clampInt(ev.target.value, config.heartbeatDigestHours, 0, 24),
                        })
                      }
                      className={cn(inputBaseClass, 'w-20 font-mono tabular-nums')}
                    />
                  </label>
                </div>
              }
            />
            <SettingRow
              title="本地索引保留期与磁盘配额"
              description="按天分片落盘（仅存聚合计数、错误模板与脱敏样本，不复制原始日志全文）；超出保留期或配额自动淘汰最旧分片。"
              stacked
              control={
                <div className="space-y-3 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <label className="space-y-1">
                      <span className="block text-[11.5px] text-[var(--ink-muted)]">保留天数 (1–90d)</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        disabled={readOnly}
                        value={config.retentionDays}
                        onChange={(ev) =>
                          setDraft({
                            ...config,
                            retentionDays: clampInt(ev.target.value, config.retentionDays, 1, 90),
                          })
                        }
                        className={cn(inputBaseClass, 'w-full font-mono tabular-nums')}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11.5px] text-[var(--ink-muted)]">磁盘配额上限 (16–4096 MB)</span>
                      <input
                        type="number"
                        min={16}
                        max={4096}
                        disabled={readOnly}
                        value={config.maxDiskMb}
                        onChange={(ev) =>
                          setDraft({
                            ...config,
                            maxDiskMb: clampInt(ev.target.value, config.maxDiskMb, 16, 4096),
                          })
                        }
                        className={cn(inputBaseClass, 'w-full font-mono tabular-nums')}
                      />
                    </label>
                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        data-testid="observability-prune-btn"
                        disabled={readOnly || busyAction !== null}
                        title={readOnlyTitle}
                        onClick={() => void handleTriggerPrune()}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                        {busyAction === 'prune' ? '裁剪中...' : '立即裁剪分片'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px] font-mono tabular-nums">
                      <span className="inline-flex items-center gap-1.5 text-[var(--ink-muted)]">
                        <HardDrive className="size-3.5" strokeWidth={1.75} />
                        {storage?.driver || 'sqlite'} · {storage?.shardCount ?? 0} 分片
                      </span>
                      <span className="text-[var(--ink)]">
                        {diskQuota.usedLabel} / {diskQuota.capLabel} ({diskQuota.pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                      <div
                        className={cn(
                          'h-full w-full rounded-full origin-left transition-transform duration-200 ease-out',
                          diskQuota.tone === 'crit'
                            ? 'bg-[var(--err-dot)]'
                            : diskQuota.tone === 'warn'
                              ? 'bg-[var(--warn-dot)]'
                              : 'bg-[var(--ok-dot)]',
                        )}
                        style={{ transform: `scaleX(${Math.min(100, Math.max(0, diskQuota.pct)) / 100})` }}
                      />
                    </div>
                  </div>
                </div>
              }
            />
            <SettingRow
              title="共享决策模型开关与路由"
              description="与缓存监控共用 DecisionAdvisor 预算池与冷却保护；关闭时保留 0 Token 确定性归因。"
              stacked
              control={
                <div className="space-y-3 w-full">
                  <ToggleSwitch
                    checked={config.advisorEnabled}
                    disabled={readOnly}
                    onCheckedChange={(checked) => setDraft({ ...config, advisorEnabled: checked })}
                    label={config.advisorEnabled ? '共享 LLM 归因开启' : '仅规则归因 (0 Token)'}
                    ariaLabel="共享决策模型开关"
                    testId="observability-advisor-toggle"
                  />
                  <CommandCombobox
                    value={config.decisionModel}
                    onChange={(nextModel) => setDraft({ ...config, decisionModel: nextModel })}
                    options={decisionModelOptions}
                    allowCustomValue
                    disabled={readOnly}
                    placeholder="选择或输入共享决策模型..."
                    searchPlaceholder="搜索在线节点或 Magpie 模型..."
                    ariaLabel="共享决策归因模型"
                    testId="observability-decision-model-combobox"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="block text-[11.5px] text-[var(--ink-muted)]">冷却时间 (分钟)</span>
                      <input
                        type="number"
                        min={1}
                        max={240}
                        disabled={readOnly}
                        value={config.cooldownMinutes}
                        onChange={(ev) =>
                          setDraft({
                            ...config,
                            cooldownMinutes: clampInt(ev.target.value, config.cooldownMinutes, 1, 240),
                          })
                        }
                        className={cn(inputBaseClass, 'w-full font-mono tabular-nums')}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11.5px] text-[var(--ink-muted)]">每小时调用上限</span>
                      <input
                        type="number"
                        min={1}
                        max={240}
                        disabled={readOnly}
                        value={config.maxCallsPerHour}
                        onChange={(ev) =>
                          setDraft({
                            ...config,
                            maxCallsPerHour: clampInt(ev.target.value, config.maxCallsPerHour, 1, 240),
                          })
                        }
                        className={cn(inputBaseClass, 'w-full font-mono tabular-nums')}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11.5px] text-[var(--ink-muted)]">每日 Token 预算</span>
                      <input
                        type="number"
                        min={1000}
                        max={5_000_000}
                        step={5000}
                        disabled={readOnly}
                        value={config.dailyTokenBudget}
                        onChange={(ev) =>
                          setDraft({
                            ...config,
                            dailyTokenBudget: clampInt(ev.target.value, config.dailyTokenBudget, 1000, 5_000_000),
                          })
                        }
                        className={cn(inputBaseClass, 'w-full font-mono tabular-nums')}
                      />
                    </label>
                  </div>
                </div>
              }
            />
            {cadence && (
              <SettingRow
                title="运行节拍时间戳"
                description={
                  <span className="font-mono text-[11.5px] tabular-nums inline-flex flex-wrap gap-x-3 gap-y-1">
                    <span>快扫 {cadence.lastFastScanAt ? formatDateTime(cadence.lastFastScanAt) : '-'}</span>
                    <span>·</span>
                    <span>分诊 {cadence.lastTriageAt ? formatDateTime(cadence.lastTriageAt) : '-'}</span>
                    <span>·</span>
                    <span>巡检 {cadence.lastDigestAt ? formatDateTime(cadence.lastDigestAt) : '-'}</span>
                    <span>·</span>
                    <span>静默跳过累计 {cadence.silentSkipCount}</span>
                  </span>
                }
              />
            )}
          </div>
        </SettingGroup>
      )}

      <SettingGroup
        title="高频错误指纹"
        description="跨源去重聚合的异常日志签名，展示脱敏样本与来源；点击可查看归因细节、一键跳转原生日志或按需只读预览。"
        meta={`${fingerprints.length} 条指纹`}
      >
        {fingerprints.length === 0 ? (
          <EmptyState message="当前窗口暂无活跃错误指纹。出现告警或错误日志后将自动提取模板并聚合计数。" />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {fingerprints.slice(0, 15).map((fp) => {
              const isNative = fp.sourceKind === 'journald' || fp.sourceKind === 'file';
              return (
                <div
                  key={`${fp.fingerprint}-${fp.nodeId}-${fp.serviceId}`}
                  className="px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors duration-150"
                >
                  <button
                    type="button"
                    onClick={() => openFingerprintInspector(fp)}
                    className={cn('min-w-0 flex-1 text-left space-y-1 cursor-pointer rounded-lg', FOCUS_RING)}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
                      <StatusIndicator status={severityToStatus(fp.level)} label={severityLabel(fp.level)} />
                      <span className="font-medium text-[var(--ink)]">{fp.serviceId}</span>
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                        {fp.nodeId} · {sourceKindLabel(fp.sourceKind)} · ×{fp.count} · {formatDateTime(fp.lastSeenAt)}
                      </span>
                    </div>
                    <p className="font-mono text-[12px] text-[var(--ink-muted)] truncate" title={fp.template}>
                      {fp.template || fp.sampleRedacted}
                    </p>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openFingerprintInspector(fp)}
                    >
                      详情
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleNativeJump(fp.sourceRef, fp.serviceId, fp.level || 'all')}
                    >
                      {isNative && onOpenLogs ? (
                        <>
                          <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                          直读日志
                        </>
                      ) : (
                        <>
                          <Eye className="size-3.5" strokeWidth={1.75} />
                          只读预览
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SettingGroup>

      <SettingGroup
        title="联邦只读适配器与远端节点"
        description="本机日志源游标状态与在线远端探针汇总；所有读取均严格只读且受字节与超时上限保护。"
        meta={`${adapters.length} 适配器 · ${remoteNodes.length} 远端节点`}
      >
        <div className="divide-y divide-[var(--border-subtle)]">
          {adapters.length === 0 ? (
            <EmptyState message="当前尚未注册日志适配器。" />
          ) : (
            adapters.map((adapter: ObservabilityAdapterStatus) => {
              const adapterStatus =
                !adapter.enabled
                  ? 'standby'
                  : adapter.lastOk === false
                    ? 'critical'
                    : adapter.lastOk === true
                      ? 'healthy'
                      : 'standby';
              const isNative = adapter.kind === 'journald' || adapter.kind === 'file';
              return (
                <div
                  key={adapter.id}
                  className="px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-[12.5px]"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <StatusIndicator
                        status={adapterStatus}
                        label={adapter.name || adapter.id}
                      />
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                        {sourceKindLabel(adapter.kind)} · {adapter.serviceId} · {adapter.origin}
                      </span>
                    </div>
                    <div className="font-mono text-[11.5px] text-[var(--ink-muted)] truncate tabular-nums">
                      目标 {adapter.target || '-'} · 游标 {adapter.cursor ? '已跟踪' : '未初始化'} · 上次{' '}
                      {adapter.lastScanAt ? formatDateTime(adapter.lastScanAt) : '未扫描'} · {adapter.lastEntries} 行 /{' '}
                      {formatBytes(adapter.lastBytesRead || 0)}
                    </div>
                    {adapter.lastError && (
                      <div className="text-[11.5px] text-[var(--err)] truncate" title={adapter.lastError}>
                        错误：{adapter.lastError}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isNative && onOpenLogs && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          handleNativeJump(
                            {
                              sourceKind: adapter.kind,
                              sourceId: adapter.target || adapter.serviceId,
                              nodeId: 'local',
                            },
                            adapter.serviceId,
                          )
                        }
                      >
                        <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                        原位直读
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        openAdapterPreview({
                          title: `适配器只读预览 · ${adapter.name || adapter.id}`,
                          subtitle: `${sourceKindLabel(adapter.kind)} · ${adapter.target || adapter.serviceId}`,
                          adapterId: adapter.id,
                          sourceKind: adapter.kind,
                          target: adapter.target,
                          since: '1h',
                        })
                      }
                    >
                      <Eye className="size-3.5" strokeWidth={1.75} />
                      预览
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {remoteNodes.length > 0 && (
            <div className="px-5 sm:px-6 py-3 bg-[var(--surface-subtle)]/35 space-y-2">
              <div className="text-[12px] font-semibold tracking-tight text-[var(--ink)]">
                远端探针联邦节点 ({remoteNodes.length})
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {remoteNodes.map((node: ObservabilityRemoteNodeStatus) => (
                  <div
                    key={node.nodeId}
                    className="py-2 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-2 text-[12.5px]"
                  >
                    <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <StatusIndicator status={node.status || 'standby'} label={node.name || node.nodeId} />
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                        {node.nodeId} · {node.hasLogTelemetry ? `服务 ${node.serviceCount} / 指纹 ${node.fingerprintCount}` : '暂无日志摘要'}
                        {node.collectedAt ? ` · ${formatDateTime(node.collectedAt)}` : ''}
                      </span>
                    </div>
                    {node.directReadSupported && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openAdapterPreview({
                            title: `远端只读预览 · ${node.name || node.nodeId}`,
                            subtitle: `remote · ${node.nodeId}`,
                            nodeId: node.nodeId,
                            sourceKind: 'remote',
                            target: node.nodeId,
                            since: '1h',
                          })
                        }
                      >
                        <Eye className="size-3.5" strokeWidth={1.75} />
                        按需直读
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentDigests.length > 0 && (
            <div className="px-5 sm:px-6 py-3 space-y-2">
              <div className="text-[12px] font-semibold tracking-tight text-[var(--ink)]">
                近期周期巡检记录 ({recentDigests.length})
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {recentDigests.slice(0, 6).map((digest) => (
                  <div
                    key={digest.id}
                    className="py-2 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-2 text-[12px]"
                  >
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <StatusIndicator status={severityToStatus(digest.severity)} label={modeLabel(digest.mode)} />
                      <span className="text-[var(--ink-muted)] truncate">{digest.summary}</span>
                    </div>
                    <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                      {digest.tokensUsed} tok · {formatDateTime(digest.ts)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SettingGroup>

      <InspectorDrawer
        open={inspector !== null}
        onOpenChange={(open) => {
          if (!open) setInspector(null);
        }}
        size="lg"
        title={
          inspectedAnnotation
            ? inspectedAnnotation.label
            : inspectedFingerprint
              ? `${inspectedFingerprint.serviceId} · 错误指纹详情`
              : inspectedAdapterPreview?.title || '联邦日志预览'
        }
        description={
          inspectedAnnotation
            ? `${inspectedAnnotation.nodeId} / ${inspectedAnnotation.serviceId} · ${formatDateTime(inspectedAnnotation.isoTs)}`
            : inspectedFingerprint
              ? `${inspectedFingerprint.nodeId} · ${sourceKindLabel(inspectedFingerprint.sourceKind)} · 累计 ${inspectedFingerprint.count} 次`
              : inspectedAdapterPreview?.subtitle
        }
        testId="observability-inspector-drawer"
      >
        <div className="space-y-5 text-[13px]">
          {inspectedAnnotation && (
            <>
              <div className="space-y-2 pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusIndicator
                      status={severityToStatus(inspectedAnnotation.severity)}
                      label={severityLabel(inspectedAnnotation.severity)}
                    />
                    <span className="font-mono text-[11.5px] text-[var(--ink-muted)]">
                      {modeLabel(inspectedAnnotation.mode)}
                    </span>
                    {typeof inspectedAnnotation.payload?.model === 'string' && inspectedAnnotation.payload.model && (
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                        · {inspectedAnnotation.payload.model}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                    触发器 {inspectedAnnotation.trigger}
                  </span>
                </div>
                <p className="text-[13.5px] font-medium text-[var(--ink)] leading-relaxed text-pretty">
                  {inspectedAnnotation.summary || inspectedAnnotation.detail}
                </p>
                {inspectedAnnotation.detail && inspectedAnnotation.detail !== inspectedAnnotation.summary && (
                  <p className="text-[12.5px] text-[var(--ink-muted)] leading-relaxed text-pretty">
                    {inspectedAnnotation.detail}
                  </p>
                )}
              </div>

              {annotationScopes.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[12px] font-semibold text-[var(--ink)]">受影响服务与范围</div>
                  <div className="font-mono text-[12px] text-[var(--ink-muted)]">
                    {annotationScopes.join(' · ')}
                  </div>
                </div>
              )}

              {annotationRootCauses.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[12px] font-semibold text-[var(--ink)]">结构化根因分析</div>
                  <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                    {annotationRootCauses.map((cause, idx) => (
                      <div key={`${cause.category}-${idx}`} className="py-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[12px] font-semibold text-[var(--ink)]">
                            {cause.category}
                          </span>
                          <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                            置信度 {Math.round(cause.confidence * 100)}%
                          </span>
                        </div>
                        {cause.explanation && (
                          <p className="text-[12.5px] text-[var(--ink)] leading-relaxed">{cause.explanation}</p>
                        )}
                        {cause.evidence && (
                          <p className="text-[11.5px] font-mono text-[var(--ink-muted)] break-all">
                            证据：{cause.evidence}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {annotationActions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[var(--ink)]">只读处置建议</span>
                    <span className="text-[11.5px] text-[var(--ink-subtle)] inline-flex items-center gap-1">
                      <AlertTriangle className="size-3" strokeWidth={1.75} />
                      仅建议，需人工确认，零自动执行
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                    {annotationActions.map((action, idx) => {
                      const cmdKey = `${inspectedAnnotation.id}-act-${idx}`;
                      return (
                        <div key={cmdKey} className="py-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-[var(--ink)]">{action.title}</span>
                            <span className="text-[11px] font-mono text-[var(--ink-subtle)] shrink-0">
                              {riskLabel(action.risk)} · 需人工确认
                            </span>
                          </div>
                          {action.commandHint && (
                            <div className="flex items-start gap-2">
                              <pre className="flex-1 rounded-lg bg-[var(--surface-subtle)] px-2.5 py-1.5 text-[11.5px] font-mono text-[var(--ink-muted)] overflow-x-auto whitespace-pre-wrap break-all">
                                {action.commandHint}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleCopyCommand(cmdKey, action.commandHint || '')}
                                title="复制只读参考命令"
                              >
                                {copiedCmdKey === cmdKey ? (
                                  <Check className="size-3.5 text-[var(--ok)]" strokeWidth={1.75} />
                                ) : (
                                  <Copy className="size-3.5" strokeWidth={1.75} />
                                )}
                                复制命令
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {inspectedFingerprint && (
            <div className="space-y-3 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                <span>指纹 {inspectedFingerprint.fingerprint}</span>
                <span>
                  首次 {formatDateTime(inspectedFingerprint.firstSeenAt)} · 最近{' '}
                  {formatDateTime(inspectedFingerprint.lastSeenAt)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-[12px] font-semibold text-[var(--ink)]">归并模板</div>
                <pre className="rounded-lg bg-[var(--surface-subtle)] p-2.5 font-mono text-[12px] text-[var(--ink)] overflow-x-auto whitespace-pre-wrap break-all">
                  {inspectedFingerprint.template}
                </pre>
              </div>
              {inspectedFingerprint.sampleRedacted && (
                <div className="space-y-1">
                  <div className="text-[12px] font-semibold text-[var(--ink)]">脱敏示例行</div>
                  <pre className="rounded-lg bg-[var(--surface-subtle)] p-2.5 font-mono text-[11.5px] text-[var(--ink-muted)] overflow-x-auto whitespace-pre-wrap break-all">
                    {inspectedFingerprint.sampleRedacted}
                  </pre>
                </div>
              )}
              {!readOnly && (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyAction !== null}
                    onClick={() =>
                      void handleTriggerAnalyze(
                        'triage',
                        inspectedFingerprint.serviceId,
                        inspectedFingerprint.nodeId,
                      )
                    }
                  >
                    <Sparkles className="size-3.5" strokeWidth={1.75} />
                    对此服务立即分诊
                  </Button>
                </div>
              )}
            </div>
          )}

          {inspectorJumpMapping && (
            <div className="flex flex-wrap items-center gap-2">
              {inspectorJumpMapping.nativeReq && onOpenLogs && (
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="observability-jump-logs-btn"
                  onClick={() => {
                    setInspector(null);
                    onOpenLogs(inspectorJumpMapping.nativeReq!);
                  }}
                >
                  <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                  跳转原位直读日志
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                data-testid="observability-inline-read-btn"
                disabled={previewState.loading}
                onClick={() => void loadInlineLogPreview(inspectorJumpMapping.previewReq)}
              >
                <Eye className="size-3.5" strokeWidth={1.75} />
                {previewState.loading ? '正在按需直读...' : '按需直读原位片段'}
              </Button>
            </div>
          )}

          {(previewState.loading || previewState.error || previewState.data) && (
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-[var(--ink)]">只读原位日志片段</span>
                {previewState.data && (
                  <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                    {previewState.data.entries.length} 行
                    {previewState.data.bytesRead != null ? ` · ${formatBytes(previewState.data.bytesRead)}` : ''}
                    {previewState.data.truncated ? ' · 已按配额截断' : ''}
                  </span>
                )}
              </div>
              {previewState.loading ? (
                <WidgetSkeleton heightClass="h-[140px]" label="正在按需读取只读日志片段" />
              ) : previewState.error ? (
                <div className="rounded-lg border border-[var(--err)]/30 bg-[var(--err)]/5 px-3 py-2 text-[12px] text-[var(--err)]">
                  {previewState.error}
                </div>
              ) : previewState.data && previewState.data.entries.length === 0 ? (
                <p className="text-[12px] text-[var(--ink-subtle)]">该目标在最近时间窗口内无匹配日志行。</p>
              ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/60 max-h-[320px] overflow-auto divide-y divide-[var(--border-subtle)] font-mono text-[11.5px]">
                  {(previewState.data?.entries || []).map((entry, idx) => (
                    <div key={`${entry.ts}-${idx}`} className="px-3 py-1.5 flex items-start gap-2.5 leading-relaxed">
                      <span className="text-[var(--ink-subtle)] tabular-nums shrink-0">
                        {formatClock(entry.ts)}
                      </span>
                      <span
                        className={cn(
                          'uppercase shrink-0 w-11',
                          severityToStatus(entry.level) === 'critical'
                            ? 'text-[var(--err)]'
                            : severityToStatus(entry.level) === 'warn'
                              ? 'text-[var(--warn)]'
                              : 'text-[var(--ink-subtle)]',
                        )}
                      >
                        {entry.level || 'info'}
                      </span>
                      <span className="text-[var(--ink)] break-all whitespace-pre-wrap flex-1">
                        {entry.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </InspectorDrawer>
    </div>
  );
}

export default ObservabilityPanel;
