import type {
  LogEntry,
  LogFilterState,
  LogNavigationRequest,
  LogQueryStats,
  LogSourceKind,
  MetaResponse,
  ServiceItem,
} from '../types';
import { formatClock } from '../utils/format';

export const FULL_LOG_SOURCES: ReadonlyArray<{ value: LogSourceKind; label: string }> = [
  { value: 'unified', label: '大一统直读' },
  { value: 'service', label: '服务 (journald)' },
  { value: 'file', label: '原生文件' },
  { value: 'self', label: '控制台' },
  { value: 'audit', label: '审计日志' },
] as const;

export const LOG_SINCE_OPTIONS = [
  { value: '15m', label: '最近 15 分钟' },
  { value: '30m', label: '最近 30 分钟' },
  { value: '1h', label: '最近 1 小时' },
  { value: '6h', label: '最近 6 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
] as const;

export const LOG_LEVEL_OPTIONS = [
  { value: 'all', label: '全部级别' },
  { value: 'error', label: 'Error+' },
  { value: 'warn', label: 'Warn+' },
  { value: 'info', label: 'Info+' },
  { value: 'debug', label: 'Debug' },
] as const;

export interface ServiceNativeLogSourceOption {
  source: LogSourceKind;
  target: string;
  targets: string[];
  label: string;
  kindBadge: string;
}

export interface HistogramBucket {
  label: string;
  total: number;
  error: number;
  warn: number;
  info: number;
}

export function resolveServiceLogSources(
  service: ServiceItem,
  logSources?: MetaResponse['logSources'],
): ServiceNativeLogSourceOption[] {
  const unitTarget = service.unit || service.id;
  const options: ServiceNativeLogSourceOption[] = [
    {
      source: 'service',
      target: unitTarget,
      targets: [unitTarget],
      label: 'journald 服务日志',
      kindBadge: 'journald',
    },
  ];

  const files = logSources?.files || [];
  const matchedFile =
    (service.logFileId ? files.find((item) => item.id === service.logFileId) : null) ||
    files.find(
      (item) =>
        (item.serviceId && item.serviceId === service.id) ||
        (item.unit && item.unit === service.unit),
    ) ||
    null;

  const resolvedFileId = matchedFile?.id || service.logFileId || null;
  if (resolvedFileId) {
    options.push({
      source: 'file',
      target: resolvedFileId,
      targets: [resolvedFileId],
      label: matchedFile?.name || '服务原生日志文件',
      kindBadge: 'file',
    });
    options.push({
      source: 'unified',
      target: service.id,
      targets: [service.id],
      label: '聚合直读 (journald + 文件)',
      kindBadge: 'unified',
    });
  }

  return options;
}

export function toggleUnifiedTarget(currentTargets: string[], clickedToken: string): string[] {
  const cleanToken = clickedToken.trim();
  if (!cleanToken || cleanToken === 'all') {
    return ['all'];
  }
  const normalized = currentTargets.filter((item) => item && item !== 'all');
  if (normalized.includes(cleanToken)) {
    const next = normalized.filter((item) => item !== cleanToken);
    return next.length > 0 ? next : ['all'];
  }
  return [...normalized, cleanToken];
}

export function normalizeLogNavigation(
  input: string | LogNavigationRequest,
  fallbackLevel: string = 'all',
): LogFilterState {
  if (typeof input === 'string') {
    const unit = input.trim();
    return {
      source: unit ? 'service' : 'unified',
      target: unit || 'all',
      targets: unit ? [unit] : ['all'],
      since: '1h',
      level: fallbackLevel || 'all',
      query: '',
      regex: false,
    };
  }

  const validSources: LogSourceKind[] = ['unified', 'service', 'file', 'self', 'audit'];
  const source: LogSourceKind = input.source && validSources.includes(input.source)
    ? input.source
    : (input.unit ? 'service' : 'unified');
  const target = (input.target ?? input.unit ?? (source === 'unified' ? 'all' : '')).trim();
  const targets = Array.isArray(input.targets) && input.targets.length > 0
    ? input.targets.map((item) => item.trim()).filter(Boolean)
    : (target ? [target] : ['all']);

  return {
    source,
    target: target || (source === 'unified' ? targets.join(',') : ''),
    targets: targets.length > 0 ? targets : ['all'],
    since: input.since || '1h',
    level: input.level || fallbackLevel || 'all',
    query: input.query || '',
    regex: Boolean(input.regex),
  };
}

export function buildLogHistogram(entries: LogEntry[], bucketCount = 16): HistogramBucket[] {
  if (entries.length === 0) return [];
  const parsed = entries.map((entry, idx) => {
    const raw = entry.ts || entry.timestamp;
    const ms = raw ? Date.parse(raw) : Number.NaN;
    const levelStr = String(entry.level || entry.severity || 'info').toLowerCase();
    const kind = levelStr.includes('err') || levelStr.includes('crit') || levelStr.includes('fatal')
      ? 'error'
      : levelStr.includes('warn')
        ? 'warn'
        : 'info';
    return { ms, idx, kind };
  });
  const validMs = parsed.filter((item) => Number.isFinite(item.ms)).map((item) => item.ms);
  const useTime = validMs.length >= 2 && Math.max(...validMs) > Math.min(...validMs);
  const minVal = useTime ? Math.min(...validMs) : 0;
  const maxVal = useTime ? Math.max(...validMs) : Math.max(1, entries.length - 1);
  const span = Math.max(1, maxVal - minVal);

  const buckets: HistogramBucket[] = Array.from({ length: bucketCount }, (_, idx) => {
    const startMs = useTime ? minVal + (span * idx) / bucketCount : 0;
    return {
      label: useTime ? formatClock(new Date(startMs).toISOString()) : `#${idx + 1}`,
      total: 0,
      error: 0,
      warn: 0,
      info: 0,
    };
  });

  for (const item of parsed) {
    const pos = useTime && Number.isFinite(item.ms)
      ? (item.ms - minVal) / span
      : item.idx / Math.max(1, entries.length - 1);
    const bucketIdx = Math.min(bucketCount - 1, Math.max(0, Math.floor(pos * bucketCount)));
    const bucket = buckets[bucketIdx];
    bucket.total += 1;
    if (item.kind === 'error') bucket.error += 1;
    else if (item.kind === 'warn') bucket.warn += 1;
    else bucket.info += 1;
  }
  return buckets;
}

export function formatLogBytes(bytes?: number | null): string {
  const num = Number(bytes || 0);
  if (!Number.isFinite(num) || num <= 0) return '0 B';
  if (num < 1024) return `${Math.round(num)} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

export function sourceKindLabel(kind?: string): string {
  switch (kind) {
    case 'journald':
      return 'journald';
    case 'file':
      return 'file';
    case 'self':
      return 'console';
    case 'audit':
      return 'audit';
    default:
      return kind || 'log';
  }
}

export function formatDirectReadSummary(stats?: LogQueryStats | null): string {
  if (!stats) return '';
  const parts = [
    stats.directRead ? '原位直读（零落盘复制）' : '日志查询',
    `${stats.sourcesQueried} 源`,
    `${stats.elapsedMs}ms`,
    `读取 ${formatLogBytes(stats.totalReadBytes)}`,
  ];
  if (stats.truncatedSources > 0) {
    parts.push(`${stats.truncatedSources} 个大文件已按尾部 ${formatLogBytes(stats.maxBytesPerFile)} 截断`);
  }
  return parts.join(' · ');
}
