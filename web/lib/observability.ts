export interface ObservabilitySourceRef {
  sourceKind: 'journald' | 'file' | 'docker' | 'http-json' | 'remote';
  sourceId: string;
  nodeId?: string;
  ts?: string;
  cursor?: string | null;
}

export interface ObservabilityMetricPoint {
  ts: number;
  isoTs: string;
  errorCount: number;
  warnCount: number;
  newFingerprintCount: number;
  restartCount: number;
  http5xxCount: number;
  totalScanned: number;
}

export interface ObservabilityAnnotation {
  id: string;
  ts: number;
  isoTs: string;
  domainId: string;
  severity: 'info' | 'warn' | 'critical' | string;
  nodeId: string;
  serviceId: string;
  label: string;
  detail: string;
  summary: string;
  diagnosisId?: string | null;
  trigger: string;
  mode: string;
  sourceRef?: ObservabilitySourceRef | null;
  payload?: Record<string, unknown> | null;
}

export type ObservabilityHealthTone = 'healthy' | 'warn' | 'critical';

export interface ObservabilityChartPoint {
  ts: number;
  x: number;
  errorY: number;
  warnY: number;
  point: ObservabilityMetricPoint;
}

export interface ObservabilityChartSeries {
  hasData: boolean;
  startTs: number;
  endTs: number;
  maxY: number;
  errorPath: string;
  warnPath: string;
  newFpPath: string;
  http5xxPath: string;
  restartPath: string;
  plottedPoints: ObservabilityChartPoint[];
}

export interface ObservabilityAnnotationPlacement {
  annotation: ObservabilityAnnotation;
  x: number;
  lane: number;
}

export interface ObservabilityDiskQuota {
  usedLabel: string;
  capLabel: string;
  pct: number;
  tone: 'ok' | 'warn' | 'crit';
}

export interface ObservabilityLogJumpFilter {
  source: 'journald' | 'file' | 'docker' | 'http-json' | 'remote' | 'unified';
  unit?: string;
  file?: string;
  target?: string;
  targets?: string[];
  since?: string;
}

export interface ObservabilityModeSummary {
  total: number;
  llmCount: number;
  deterministicCount: number;
  silentSkipCount: number;
  criticalCount: number;
  warnCount: number;
}

export interface ObservabilityHealthInput {
  errorCount?: number;
  newFingerprintCount?: number;
  restartCount?: number;
  http5xxCount?: number;
  diskUsedPct?: number;
}

const CHART_LANES = 4;
const LANE_GAP_PX = 20;

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: unknown): number {
  return Math.max(0, finiteOr(value, 0));
}

function positiveOr(value: unknown, fallback: number): number {
  const num = finiteOr(value, fallback);
  return num > 0 ? num : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundCoord(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function buildPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${roundCoord(point.x)} ${roundCoord(point.y)}`)
    .join(' ');
}

function formatBytesSafe(bytes: unknown): string {
  const safe = nonNegative(bytes);
  if (safe < 1024) return `${Math.round(safe)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = safe / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function buildObservabilityChartSeries(
  points: ObservabilityMetricPoint[],
  width = 640,
  height = 160,
  pad = 16,
): ObservabilityChartSeries {
  const safeWidth = positiveOr(width, 640);
  const safeHeight = positiveOr(height, 160);
  const safePad = clamp(nonNegative(pad), 0, Math.max(0, Math.min(safeWidth, safeHeight) / 2 - 1));
  const plotWidth = Math.max(0, safeWidth - safePad * 2);
  const plotHeight = Math.max(0, safeHeight - safePad * 2);

  const sorted = (Array.isArray(points) ? points : [])
    .filter((point): point is ObservabilityMetricPoint => Boolean(point) && Number.isFinite(point.ts))
    .slice()
    .sort((a, b) => a.ts - b.ts);

  const empty: ObservabilityChartSeries = {
    hasData: false,
    startTs: 0,
    endTs: 0,
    maxY: 1,
    errorPath: '',
    warnPath: '',
    newFpPath: '',
    http5xxPath: '',
    restartPath: '',
    plottedPoints: [],
  };
  if (sorted.length === 0) return empty;

  const startTs = sorted[0].ts;
  const endTs = sorted[sorted.length - 1].ts;
  const span = endTs - startTs;

  let rawMax = 0;
  for (const point of sorted) {
    rawMax = Math.max(
      rawMax,
      nonNegative(point.errorCount),
      nonNegative(point.warnCount),
      nonNegative(point.newFingerprintCount),
      nonNegative(point.http5xxCount),
      nonNegative(point.restartCount),
    );
  }
  const maxY = rawMax > 0 && Number.isFinite(rawMax) ? rawMax : 1;

  const xFor = (ts: number): number => {
    if (sorted.length === 1 || span <= 0) return safeWidth / 2;
    return safePad + ((ts - startTs) / span) * plotWidth;
  };
  const yFor = (value: unknown): number => {
    const ratio = nonNegative(value) / maxY;
    return safeHeight - safePad - ratio * plotHeight;
  };

  const plottedPoints: ObservabilityChartPoint[] = sorted.map((point) => ({
    ts: point.ts,
    x: xFor(point.ts),
    errorY: yFor(point.errorCount),
    warnY: yFor(point.warnCount),
    point,
  }));

  return {
    hasData: true,
    startTs,
    endTs,
    maxY,
    errorPath: buildPath(plottedPoints.map((point) => ({ x: point.x, y: point.errorY }))),
    warnPath: buildPath(plottedPoints.map((point) => ({ x: point.x, y: point.warnY }))),
    newFpPath: buildPath(sorted.map((point) => ({ x: xFor(point.ts), y: yFor(point.newFingerprintCount) }))),
    http5xxPath: buildPath(sorted.map((point) => ({ x: xFor(point.ts), y: yFor(point.http5xxCount) }))),
    restartPath: buildPath(sorted.map((point) => ({ x: xFor(point.ts), y: yFor(point.restartCount) }))),
    plottedPoints,
  };
}

export function positionAnnotationsOnTimeline(
  annotations: ObservabilityAnnotation[],
  startTs: number,
  endTs: number,
  width = 640,
  pad = 16,
): ObservabilityAnnotationPlacement[] {
  const safeWidth = positiveOr(width, 640);
  const safePad = clamp(nonNegative(pad), 0, Math.max(0, safeWidth / 2 - 1));
  const minX = safePad;
  const maxX = Math.max(minX, safeWidth - safePad);
  const sorted = (Array.isArray(annotations) ? annotations : [])
    .filter((annotation): annotation is ObservabilityAnnotation => Boolean(annotation) && Number.isFinite(annotation.ts))
    .slice()
    .sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));

  const safeStart = finiteOr(startTs, 0);
  const safeEnd = finiteOr(endTs, safeStart);
  const span = safeEnd - safeStart;
  const canScale = span > 0;
  const laneLastX: number[] = new Array(CHART_LANES).fill(Number.NEGATIVE_INFINITY);

  return sorted.map((annotation) => {
    const rawX = canScale
      ? minX + ((annotation.ts - safeStart) / span) * (maxX - minX)
      : safeWidth / 2;
    const x = clamp(rawX, minX, maxX);

    let lane = -1;
    for (let index = 0; index < CHART_LANES; index += 1) {
      if (x - laneLastX[index] >= LANE_GAP_PX) {
        lane = index;
        break;
      }
    }
    if (lane === -1) {
      lane = 0;
      for (let index = 1; index < CHART_LANES; index += 1) {
        if (laneLastX[index] < laneLastX[lane]) lane = index;
      }
    }
    laneLastX[lane] = x;
    return { annotation, x, lane };
  });
}

export function formatDigestIntervalLabel(minutes: number): string {
  const safe = finiteOr(minutes, 0);
  if (safe <= 0) return '关闭';
  const rounded = Math.round(safe);
  if (rounded === 5) return '5 分钟';
  if (rounded === 15) return '15 分钟';
  if (rounded === 30) return '30 分钟';
  if (rounded === 60) return '1 小时';
  return `${rounded} 分钟`;
}

export function classifyObservabilityHealth(input: ObservabilityHealthInput): ObservabilityHealthTone {
  const errorCount = nonNegative(input?.errorCount);
  const newFingerprintCount = nonNegative(input?.newFingerprintCount);
  const restartCount = nonNegative(input?.restartCount);
  const http5xxCount = nonNegative(input?.http5xxCount);
  const diskUsedPct = nonNegative(input?.diskUsedPct);

  if (restartCount >= 1 || http5xxCount >= 5 || errorCount >= 20 || diskUsedPct >= 90) {
    return 'critical';
  }
  if (errorCount >= 1 || newFingerprintCount >= 1 || http5xxCount >= 1 || diskUsedPct >= 75) {
    return 'warn';
  }
  return 'healthy';
}

export function formatDiskQuota(totalBytes: number, maxDiskMb: number): ObservabilityDiskQuota {
  const usedBytes = nonNegative(totalBytes);
  const capMb = nonNegative(maxDiskMb);
  const capBytes = capMb * 1024 * 1024;
  const pct = capBytes > 0 ? clamp((usedBytes / capBytes) * 100, 0, 100) : 0;
  return {
    usedLabel: formatBytesSafe(usedBytes),
    capLabel: formatBytesSafe(capBytes),
    pct,
    tone: pct >= 90 ? 'crit' : pct >= 75 ? 'warn' : 'ok',
  };
}

export function buildLogJumpFilter(
  sourceRef: ObservabilitySourceRef | null | undefined,
  fallbackServiceId?: string,
): ObservabilityLogJumpFilter {
  if (!sourceRef) {
    return {
      source: 'unified',
      targets: fallbackServiceId ? [fallbackServiceId] : [],
      since: '1h',
    };
  }

  switch (sourceRef.sourceKind) {
    case 'journald':
      return { source: 'journald', unit: sourceRef.sourceId, since: '1h' };
    case 'file':
      return { source: 'file', file: sourceRef.sourceId, since: '1h' };
    case 'docker':
      return { source: 'docker', target: sourceRef.sourceId, since: '1h' };
    case 'http-json':
      return { source: 'http-json', target: sourceRef.sourceId, since: '1h' };
    case 'remote':
      return { source: 'remote', target: sourceRef.sourceId, since: '1h' };
    default:
      return {
        source: 'unified',
        targets: fallbackServiceId ? [fallbackServiceId] : [],
        since: '1h',
      };
  }
}

export function summarizeAnnotationsByMode(annotations: ObservabilityAnnotation[]): ObservabilityModeSummary {
  const summary: ObservabilityModeSummary = {
    total: 0,
    llmCount: 0,
    deterministicCount: 0,
    silentSkipCount: 0,
    criticalCount: 0,
    warnCount: 0,
  };

  for (const annotation of Array.isArray(annotations) ? annotations : []) {
    if (!annotation) continue;
    summary.total += 1;
    const mode = String(annotation.mode || '').trim().toLowerCase();
    if (mode === 'llm') {
      summary.llmCount += 1;
    } else if (mode === 'deterministic') {
      summary.deterministicCount += 1;
    } else if (mode.includes('silent') || mode.includes('skip')) {
      summary.silentSkipCount += 1;
    }
    const severity = String(annotation.severity || '').trim().toLowerCase();
    if (severity === 'critical') summary.criticalCount += 1;
    if (severity === 'warn') summary.warnCount += 1;
  }

  return summary;
}
