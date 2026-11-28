export type CacheHealth = 'healthy' | 'warn' | 'critical' | 'insufficient';
export type CacheSortMode = 'anomaly' | 'hit-asc' | 'requests-desc';
export type CacheDriftTone = 'warn' | 'info';

export interface CacheDriftInput {
  systemDriftCount?: number;
  toolsDriftCount?: number;
  routeSwitchCount?: number;
  epSwitchCount?: number;
  longGapCount?: number;
}

export interface CacheDriftClue {
  key: string;
  label: string;
  count: number;
  tone: CacheDriftTone;
}

export interface CacheBucketKey {
  nodeId: string;
  agent: string;
  model: string;
}

export interface SortableCacheBucket extends CacheBucketKey {
  cacheHitPct: number | null;
  requests: number;
  anomalySeverity?: string | null;
}

export interface CacheFilterOptions {
  nodeId?: string;
  query?: string;
  onlyAnomalies?: boolean;
}

export interface CacheOverviewInput {
  requests: number;
  tokensIn: number;
  cacheRead: number;
  cacheWrite?: number;
  anomalySeverity?: string | null;
}

export interface CacheOverviewSummary {
  totalRequests: number;
  totalTokensIn: number;
  totalCacheRead: number;
  overallHitPct: number | null;
  anomalyCount: number;
  criticalCount: number;
}

export interface BudgetUsage {
  pct: number;
  label: string;
  exhausted: boolean;
}

const DRIFT_CLUE_DEFS: ReadonlyArray<{
  field: keyof CacheDriftInput;
  key: string;
  label: string;
  tone: CacheDriftTone;
}> = [
  { field: 'systemDriftCount', key: 'system_drift', label: 'System 漂移', tone: 'warn' },
  { field: 'toolsDriftCount', key: 'tools_drift', label: 'Tools 变更', tone: 'warn' },
  { field: 'routeSwitchCount', key: 'route_switch', label: '上游切换', tone: 'warn' },
  { field: 'epSwitchCount', key: 'ep_switch', label: '协议变更', tone: 'info' },
  { field: 'longGapCount', key: 'long_gap', label: '会话间隔超时', tone: 'info' },
];

function nonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeHitPct(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isAnomaly(severity: string | null | undefined): boolean {
  return severity === 'critical' || severity === 'warn';
}

function severityRank(severity: string | null | undefined): number {
  if (severity === 'critical') return 0;
  if (severity === 'warn') return 1;
  return 2;
}

function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function compareHitAsc(a: number | null, b: number | null): number {
  const left = normalizeHitPct(a);
  const right = normalizeHitPct(b);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function compareBucketKey(a: CacheBucketKey, b: CacheBucketKey): number {
  return (
    compareText(a.nodeId, b.nodeId) ||
    compareText(a.agent, b.agent) ||
    compareText(a.model, b.model)
  );
}

export function computeCacheHitPct(
  inputTokens: number,
  cacheRead: number,
  cacheWrite?: number,
): number | null {
  if (!Number.isFinite(inputTokens) || !Number.isFinite(cacheRead)) return null;
  if (cacheWrite !== undefined && !Number.isFinite(cacheWrite)) return null;
  const input = nonNegative(inputTokens);
  const read = nonNegative(cacheRead);
  const write = nonNegative(cacheWrite);
  const denominator = input + read + write;
  if (denominator <= 0) return null;
  const pct = Math.round((read / denominator) * 10000) / 100;
  return Math.min(100, Math.max(0, pct));
}

export function classifyCacheHealth(
  hitPct: number | null,
  thresholdPct: number,
  requests: number,
  minSamples = 5,
): CacheHealth {
  const samples = nonNegative(requests);
  const minimum = nonNegative(minSamples);
  const threshold = Number.isFinite(thresholdPct) ? thresholdPct : 0;
  if (normalizeHitPct(hitPct) === null || samples < minimum) return 'insufficient';
  const hit = hitPct as number;
  if (hit >= threshold) return 'healthy';
  if (hit < Math.max(40, threshold - 25)) return 'critical';
  return 'warn';
}

export function formatCacheHitPct(hitPct: number | null): string {
  const hit = normalizeHitPct(hitPct);
  return hit === null ? '—' : `${hit.toFixed(1)}%`;
}

export function extractDriftClues(bucket: CacheDriftInput): CacheDriftClue[] {
  const clues: CacheDriftClue[] = [];
  for (const def of DRIFT_CLUE_DEFS) {
    const count = nonNegative(bucket[def.field]);
    if (count > 0) {
      clues.push({ key: def.key, label: def.label, count, tone: def.tone });
    }
  }
  return clues;
}

export function sortCacheBuckets<T extends SortableCacheBucket>(
  buckets: readonly T[],
  mode: CacheSortMode,
): T[] {
  const sorted = [...buckets];
  if (mode === 'anomaly') {
    return sorted.sort((a, b) => {
      const rankDiff = severityRank(a.anomalySeverity) - severityRank(b.anomalySeverity);
      if (rankDiff !== 0) return rankDiff;
      const hitDiff = compareHitAsc(a.cacheHitPct, b.cacheHitPct);
      if (hitDiff !== 0) return hitDiff;
      const requestDiff = nonNegative(b.requests) - nonNegative(a.requests);
      if (requestDiff !== 0) return requestDiff;
      return compareBucketKey(a, b);
    });
  }
  if (mode === 'hit-asc') {
    return sorted.sort((a, b) => {
      const hitDiff = compareHitAsc(a.cacheHitPct, b.cacheHitPct);
      if (hitDiff !== 0) return hitDiff;
      const requestDiff = nonNegative(b.requests) - nonNegative(a.requests);
      if (requestDiff !== 0) return requestDiff;
      return compareBucketKey(a, b);
    });
  }
  return sorted.sort((a, b) => {
    const requestDiff = nonNegative(b.requests) - nonNegative(a.requests);
    if (requestDiff !== 0) return requestDiff;
    const hitDiff = compareHitAsc(a.cacheHitPct, b.cacheHitPct);
    if (hitDiff !== 0) return hitDiff;
    return compareBucketKey(a, b);
  });
}

export function filterCacheBuckets<T extends CacheBucketKey & { anomalySeverity?: string | null }>(
  buckets: readonly T[],
  filters: CacheFilterOptions,
): T[] {
  const nodeId = filters.nodeId ?? '';
  const query = (filters.query ?? '').trim().toLowerCase();
  return buckets.filter((bucket) => {
    if (nodeId && bucket.nodeId !== nodeId) return false;
    if (filters.onlyAnomalies && !isAnomaly(bucket.anomalySeverity)) return false;
    if (!query) return true;
    return [bucket.nodeId, bucket.agent, bucket.model].some((value) =>
      value.toLowerCase().includes(query),
    );
  });
}

export function summarizeCacheOverview(
  buckets: readonly CacheOverviewInput[],
): CacheOverviewSummary {
  let totalRequests = 0;
  let totalTokensIn = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;
  let anomalyCount = 0;
  let criticalCount = 0;

  for (const bucket of buckets) {
    totalRequests += nonNegative(bucket.requests);
    totalTokensIn += nonNegative(bucket.tokensIn);
    totalCacheRead += nonNegative(bucket.cacheRead);
    totalCacheWrite += nonNegative(bucket.cacheWrite);
    if (bucket.anomalySeverity === 'critical') {
      criticalCount += 1;
      anomalyCount += 1;
    } else if (bucket.anomalySeverity === 'warn') {
      anomalyCount += 1;
    }
  }

  return {
    totalRequests,
    totalTokensIn,
    totalCacheRead,
    overallHitPct: computeCacheHitPct(totalTokensIn, totalCacheRead, totalCacheWrite),
    anomalyCount,
    criticalCount,
  };
}

export function formatBudgetUsage(used: number, limit: number): BudgetUsage {
  const safeUsed = used === Infinity ? Number.MAX_SAFE_INTEGER : nonNegative(used);
  const safeLimit = limit === Infinity ? Number.MAX_SAFE_INTEGER : nonNegative(limit);
  const exhausted = safeLimit <= 0 || safeUsed >= safeLimit;
  let pct: number;
  if (safeLimit > 0) {
    pct = Math.min(100, (safeUsed / safeLimit) * 100);
  } else {
    pct = safeUsed > 0 ? 100 : 0;
  }
  pct = Math.round(pct * 10) / 10;
  return { pct, label: `${pct.toFixed(1)}%`, exhausted };
}
