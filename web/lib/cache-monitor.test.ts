import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyCacheHealth,
  computeCacheHitPct,
  extractDriftClues,
  filterCacheBuckets,
  formatBudgetUsage,
  formatCacheHitPct,
  sortCacheBuckets,
  summarizeCacheOverview,
} from './cache-monitor';

interface TestBucket {
  nodeId: string;
  agent: string;
  model: string;
  cacheHitPct: number | null;
  requests: number;
  anomalySeverity?: string | null;
}

function makeBucket(overrides: Partial<TestBucket> = {}): TestBucket {
  return {
    nodeId: 'node-a',
    agent: 'agent-a',
    model: 'model-a',
    cacheHitPct: 80,
    requests: 10,
    anomalySeverity: 'healthy',
    ...overrides,
  };
}

test('computeCacheHitPct uses input, read and write in the denominator', () => {
  assert.equal(computeCacheHitPct(1000, 500), 33.33);
  assert.equal(computeCacheHitPct(0, 300, 100), 75);
  assert.equal(computeCacheHitPct(100, 0, 0), 0);
  assert.equal(computeCacheHitPct(0, 3), 100);
  assert.equal(computeCacheHitPct(1, 2), 66.67);
});

test('computeCacheHitPct rounds to two decimals', () => {
  assert.equal(computeCacheHitPct(2, 1), 33.33);
  assert.equal(computeCacheHitPct(0, 2, 1), 66.67);
  assert.equal(computeCacheHitPct(9999, 1), 0.01);
});

test('computeCacheHitPct returns null for empty or negative totals', () => {
  assert.equal(computeCacheHitPct(0, 0), null);
  assert.equal(computeCacheHitPct(0, 0, 0), null);
  assert.equal(computeCacheHitPct(-10, -5), null);
  assert.equal(computeCacheHitPct(-1, 0, -100), null);
});

test('computeCacheHitPct ignores non-finite inputs safely', () => {
  assert.equal(computeCacheHitPct(Number.NaN, 100), null);
  assert.equal(computeCacheHitPct(100, Number.NaN), null);
  assert.equal(computeCacheHitPct(Infinity, 100), null);
  assert.equal(computeCacheHitPct(100, -Infinity), null);
  assert.equal(computeCacheHitPct(0, 100, Number.NaN), null);
});

test('computeCacheHitPct never exceeds the 0-100 range', () => {
  const pct = computeCacheHitPct(0, 5, -3);
  assert.equal(pct, 100);
  assert.ok(pct !== null && pct >= 0 && pct <= 100);
});

test('classifyCacheHealth returns insufficient without enough data', () => {
  assert.equal(classifyCacheHealth(null, 70, 100), 'insufficient');
  assert.equal(classifyCacheHealth(80, 70, 4), 'insufficient');
  assert.equal(classifyCacheHealth(80, 70, 5), 'healthy');
  assert.equal(classifyCacheHealth(80, 70, 2, 2), 'healthy');
  assert.equal(classifyCacheHealth(80, 70, -1), 'insufficient');
  assert.equal(classifyCacheHealth(Number.NaN, 70, 100), 'insufficient');
  assert.equal(classifyCacheHealth(80, 70, Number.NaN), 'insufficient');
});

test('classifyCacheHealth marks healthy at or above threshold', () => {
  assert.equal(classifyCacheHealth(70, 70, 10), 'healthy');
  assert.equal(classifyCacheHealth(99.9, 70, 10), 'healthy');
});

test('classifyCacheHealth marks warn between critical cutoff and threshold', () => {
  assert.equal(classifyCacheHealth(45, 70, 10), 'warn');
  assert.equal(classifyCacheHealth(60, 70, 10), 'warn');
  assert.equal(classifyCacheHealth(69.99, 70, 10), 'warn');
});

test('classifyCacheHealth marks critical below max(40, threshold - 25)', () => {
  assert.equal(classifyCacheHealth(44.99, 70, 10), 'critical');
  assert.equal(classifyCacheHealth(0, 70, 10), 'critical');
  assert.equal(classifyCacheHealth(39.9, 50, 10), 'critical');
  assert.equal(classifyCacheHealth(40, 50, 10), 'warn');
  assert.equal(classifyCacheHealth(74.9, 100, 10), 'critical');
  assert.equal(classifyCacheHealth(75, 100, 10), 'warn');
});

test('classifyCacheHealth accepts the default sample floor of five', () => {
  assert.equal(classifyCacheHealth(90, 80, 4), 'insufficient');
  assert.equal(classifyCacheHealth(90, 80, 5), 'healthy');
});

test('formatCacheHitPct renders one decimal or a dash', () => {
  assert.equal(formatCacheHitPct(null), '—');
  assert.equal(formatCacheHitPct(Number.NaN), '—');
  assert.equal(formatCacheHitPct(Infinity), '—');
  assert.equal(formatCacheHitPct(-Infinity), '—');
  assert.equal(formatCacheHitPct(0), '0.0%');
  assert.equal(formatCacheHitPct(33.33), '33.3%');
  assert.equal(formatCacheHitPct(66.67), '66.7%');
  assert.equal(formatCacheHitPct(42.36), '42.4%');
  assert.equal(formatCacheHitPct(100), '100.0%');
});

test('extractDriftClues returns an empty list for no clues', () => {
  assert.deepEqual(extractDriftClues({}), []);
  assert.deepEqual(
    extractDriftClues({
      systemDriftCount: 0,
      toolsDriftCount: 0,
      routeSwitchCount: 0,
      epSwitchCount: 0,
      longGapCount: 0,
    }),
    [],
  );
});

test('extractDriftClues keeps deterministic order, labels and tones', () => {
  assert.deepEqual(
    extractDriftClues({
      systemDriftCount: 1,
      toolsDriftCount: 2,
      routeSwitchCount: 3,
      epSwitchCount: 4,
      longGapCount: 5,
    }),
    [
      { key: 'system_drift', label: 'System 漂移', count: 1, tone: 'warn' },
      { key: 'tools_drift', label: 'Tools 变更', count: 2, tone: 'warn' },
      { key: 'route_switch', label: '上游切换', count: 3, tone: 'warn' },
      { key: 'ep_switch', label: '协议变更', count: 4, tone: 'info' },
      { key: 'long_gap', label: '会话间隔超时', count: 5, tone: 'info' },
    ],
  );
});

test('extractDriftClues preserves relative ordering for partial clues', () => {
  assert.deepEqual(
    extractDriftClues({ longGapCount: 2, routeSwitchCount: 1 }),
    [
      { key: 'route_switch', label: '上游切换', count: 1, tone: 'warn' },
      { key: 'long_gap', label: '会话间隔超时', count: 2, tone: 'info' },
    ],
  );
});

test('extractDriftClues ignores negative and non-finite counts', () => {
  assert.deepEqual(
    extractDriftClues({
      systemDriftCount: -1,
      toolsDriftCount: Number.NaN,
      epSwitchCount: 3,
      longGapCount: Infinity,
    }),
    [{ key: 'ep_switch', label: '协议变更', count: 3, tone: 'info' }],
  );
});

test('sortCacheBuckets anomaly mode orders critical, warn, hit asc, requests desc, key', () => {
  const critical = makeBucket({
    nodeId: 'node-z',
    cacheHitPct: 95,
    requests: 1,
    anomalySeverity: 'critical',
  });
  const warn = makeBucket({
    nodeId: 'node-a',
    cacheHitPct: 10,
    requests: 100,
    anomalySeverity: 'warn',
  });
  const lowHit = makeBucket({ nodeId: 'node-b', cacheHitPct: 5, requests: 3 });
  const highHit = makeBucket({
    nodeId: 'node-c',
    cacheHitPct: 90,
    requests: 3,
    anomalySeverity: null,
  });
  const noHit = makeBucket({
    nodeId: 'node-d',
    cacheHitPct: null,
    requests: 1000,
    anomalySeverity: 'healthy',
  });

  const input = [noHit, highHit, warn, lowHit, critical];
  const sorted = sortCacheBuckets(input, 'anomaly');
  assert.deepEqual(
    sorted.map((bucket) => bucket.nodeId),
    ['node-z', 'node-a', 'node-b', 'node-c', 'node-d'],
  );
  assert.deepEqual(
    input.map((bucket) => bucket.nodeId),
    ['node-d', 'node-c', 'node-a', 'node-b', 'node-z'],
  );
});

test('sortCacheBuckets anomaly mode breaks ties by requests, then key', () => {
  const buckets = [
    makeBucket({ nodeId: 'node-b', agent: 'agent-a', model: 'model-a', cacheHitPct: 50, requests: 10 }),
    makeBucket({ nodeId: 'node-a', agent: 'agent-b', model: 'model-a', cacheHitPct: 50, requests: 10 }),
    makeBucket({ nodeId: 'node-a', agent: 'agent-a', model: 'model-b', cacheHitPct: 50, requests: 10 }),
    makeBucket({ nodeId: 'node-a', agent: 'agent-a', model: 'model-a', cacheHitPct: 50, requests: 10 }),
    makeBucket({ nodeId: 'node-c', agent: 'agent-a', model: 'model-a', cacheHitPct: 50, requests: 50 }),
  ];

  const sorted = sortCacheBuckets(buckets, 'anomaly');
  assert.deepEqual(
    sorted.map((bucket) => `${bucket.nodeId}/${bucket.agent}/${bucket.model}`),
    [
      'node-c/agent-a/model-a',
      'node-a/agent-a/model-a',
      'node-a/agent-a/model-b',
      'node-a/agent-b/model-a',
      'node-b/agent-a/model-a',
    ],
  );
});

test('sortCacheBuckets hit-asc mode puts null and NaN hits last', () => {
  const buckets = [
    makeBucket({ nodeId: 'node-null', cacheHitPct: null, requests: 999 }),
    makeBucket({ nodeId: 'node-nan', cacheHitPct: Number.NaN, requests: 999 }),
    makeBucket({ nodeId: 'node-mid', cacheHitPct: 50, requests: 1 }),
    makeBucket({ nodeId: 'node-low-slow', cacheHitPct: 10, requests: 5 }),
    makeBucket({ nodeId: 'node-low-fast', cacheHitPct: 10, requests: 40 }),
  ];

  const sorted = sortCacheBuckets(buckets, 'hit-asc');
  assert.deepEqual(
    sorted.map((bucket) => bucket.nodeId),
    ['node-low-fast', 'node-low-slow', 'node-mid', 'node-nan', 'node-null'],
  );
});

test('sortCacheBuckets requests-desc mode orders by requests then lowest hit', () => {
  const buckets = [
    makeBucket({ nodeId: 'node-small', cacheHitPct: 1, requests: 5 }),
    makeBucket({ nodeId: 'node-big-high', cacheHitPct: 90, requests: 10 }),
    makeBucket({ nodeId: 'node-big-low', cacheHitPct: 30, requests: 10 }),
    makeBucket({ nodeId: 'node-big-null', cacheHitPct: null, requests: 10 }),
    makeBucket({ nodeId: 'node-tiny', cacheHitPct: 99, requests: 1 }),
  ];

  const sorted = sortCacheBuckets(buckets, 'requests-desc');
  assert.deepEqual(
    sorted.map((bucket) => bucket.nodeId),
    ['node-big-low', 'node-big-high', 'node-big-null', 'node-small', 'node-tiny'],
  );
});

test('sortCacheBuckets handles empty input and returns a fresh array', () => {
  const input: TestBucket[] = [];
  const sorted = sortCacheBuckets(input, 'anomaly');
  assert.deepEqual(sorted, []);
  assert.notEqual(sorted, input);
});

test('filterCacheBuckets returns all buckets without filters', () => {
  const buckets = [
    makeBucket({ nodeId: 'node-a', agent: 'agent-a', model: 'model-a' }),
    makeBucket({ nodeId: 'node-b', agent: 'agent-b', model: 'model-b' }),
  ];
  const filtered = filterCacheBuckets(buckets, {});
  assert.deepEqual(filtered, buckets);
  assert.notEqual(filtered, buckets);
});

test('filterCacheBuckets filters by exact nodeId', () => {
  const buckets = [
    makeBucket({ nodeId: 'node-a' }),
    makeBucket({ nodeId: 'node-b' }),
    makeBucket({ nodeId: 'node-a' }),
  ];
  assert.equal(filterCacheBuckets(buckets, { nodeId: 'node-a' }).length, 2);
  assert.equal(filterCacheBuckets(buckets, { nodeId: 'NODE-A' }).length, 0);
  assert.equal(filterCacheBuckets(buckets, { nodeId: 'node-c' }).length, 0);
});

test('filterCacheBuckets query matches nodeId, agent and model case-insensitively', () => {
  const buckets = [
    makeBucket({ nodeId: 'node-alpha', agent: 'agent-a', model: 'model-a' }),
    makeBucket({ nodeId: 'node-beta', agent: 'agent-b', model: 'model-b' }),
    makeBucket({ nodeId: 'node-gamma', agent: 'agent-c', model: 'model-c' }),
  ];
  assert.deepEqual(
    filterCacheBuckets(buckets, { query: 'ALPHA' }).map((bucket) => bucket.nodeId),
    ['node-alpha'],
  );
  assert.deepEqual(
    filterCacheBuckets(buckets, { query: 'Agent-B' }).map((bucket) => bucket.nodeId),
    ['node-beta'],
  );
  assert.deepEqual(
    filterCacheBuckets(buckets, { query: 'model-c' }).map((bucket) => bucket.nodeId),
    ['node-gamma'],
  );
  assert.deepEqual(filterCacheBuckets(buckets, { query: '   ' }), buckets);
  assert.deepEqual(filterCacheBuckets(buckets, { query: 'no-such' }), []);
});

test('filterCacheBuckets onlyAnomalies keeps warn and critical', () => {
  const buckets = [
    makeBucket({ nodeId: 'node-critical', anomalySeverity: 'critical' }),
    makeBucket({ nodeId: 'node-warn', anomalySeverity: 'warn' }),
    makeBucket({ nodeId: 'node-healthy', anomalySeverity: 'healthy' }),
    makeBucket({ nodeId: 'node-insufficient', anomalySeverity: 'insufficient' }),
    makeBucket({ nodeId: 'node-null', anomalySeverity: null }),
  ];
  assert.deepEqual(
    filterCacheBuckets(buckets, { onlyAnomalies: true }).map((bucket) => bucket.nodeId),
    ['node-critical', 'node-warn'],
  );
  assert.equal(filterCacheBuckets(buckets, { onlyAnomalies: false }).length, 5);
});

test('filterCacheBuckets combines nodeId, query and onlyAnomalies', () => {
  const buckets = [
    makeBucket({ nodeId: 'node-a', agent: 'agent-alpha', anomalySeverity: 'warn' }),
    makeBucket({ nodeId: 'node-a', agent: 'agent-beta', anomalySeverity: 'warn' }),
    makeBucket({ nodeId: 'node-a', agent: 'agent-alpha', anomalySeverity: 'healthy' }),
    makeBucket({ nodeId: 'node-b', agent: 'agent-alpha', anomalySeverity: 'warn' }),
  ];
  assert.deepEqual(
    filterCacheBuckets(buckets, {
      nodeId: 'node-a',
      query: 'alpha',
      onlyAnomalies: true,
    }).map((bucket) => bucket.agent),
    ['agent-alpha'],
  );
});

test('summarizeCacheOverview returns zeros for an empty list', () => {
  assert.deepEqual(summarizeCacheOverview([]), {
    totalRequests: 0,
    totalTokensIn: 0,
    totalCacheRead: 0,
    overallHitPct: null,
    anomalyCount: 0,
    criticalCount: 0,
  });
});

test('summarizeCacheOverview aggregates totals and overall hit percentage', () => {
  const summary = summarizeCacheOverview([
    { requests: 10, tokensIn: 1000, cacheRead: 500, anomalySeverity: 'warn' },
    { requests: 5, tokensIn: 100, cacheRead: 50, cacheWrite: 50, anomalySeverity: 'critical' },
  ]);
  assert.equal(summary.totalRequests, 15);
  assert.equal(summary.totalTokensIn, 1100);
  assert.equal(summary.totalCacheRead, 550);
  assert.equal(summary.overallHitPct, 32.35);
  assert.equal(summary.anomalyCount, 2);
  assert.equal(summary.criticalCount, 1);
});

test('summarizeCacheOverview includes cache writes in the overall denominator', () => {
  const summary = summarizeCacheOverview([
    { requests: 4, tokensIn: 100, cacheRead: 300, cacheWrite: 100 },
  ]);
  assert.deepEqual(summary, {
    totalRequests: 4,
    totalTokensIn: 100,
    totalCacheRead: 300,
    overallHitPct: 60,
    anomalyCount: 0,
    criticalCount: 0,
  });
});

test('summarizeCacheOverview counts warn and critical severities only', () => {
  const summary = summarizeCacheOverview([
    { requests: 1, tokensIn: 10, cacheRead: 5, anomalySeverity: 'critical' },
    { requests: 1, tokensIn: 10, cacheRead: 5, anomalySeverity: 'warn' },
    { requests: 1, tokensIn: 10, cacheRead: 5, anomalySeverity: 'healthy' },
    { requests: 1, tokensIn: 10, cacheRead: 5, anomalySeverity: 'insufficient' },
    { requests: 1, tokensIn: 10, cacheRead: 5, anomalySeverity: null },
    { requests: 1, tokensIn: 10, cacheRead: 5 },
  ]);
  assert.equal(summary.anomalyCount, 2);
  assert.equal(summary.criticalCount, 1);
});

test('summarizeCacheOverview ignores negative and non-finite values', () => {
  const summary = summarizeCacheOverview([
    {
      requests: -5,
      tokensIn: Number.NaN,
      cacheRead: -100,
      cacheWrite: Infinity,
      anomalySeverity: 'warn',
    },
    { requests: 2, tokensIn: 0, cacheRead: 0 },
  ]);
  assert.deepEqual(summary, {
    totalRequests: 2,
    totalTokensIn: 0,
    totalCacheRead: 0,
    overallHitPct: null,
    anomalyCount: 1,
    criticalCount: 0,
  });
});

test('summarizeCacheOverview computes a hit rate with zero requests', () => {
  const summary = summarizeCacheOverview([
    { requests: 0, tokensIn: 100, cacheRead: 50 },
  ]);
  assert.equal(summary.totalRequests, 0);
  assert.equal(summary.overallHitPct, 33.33);
});

test('formatBudgetUsage reports partial usage', () => {
  assert.deepEqual(formatBudgetUsage(50, 100), {
    pct: 50,
    label: '50.0%',
    exhausted: false,
  });
  assert.deepEqual(formatBudgetUsage(33, 100), {
    pct: 33,
    label: '33.0%',
    exhausted: false,
  });
  assert.deepEqual(formatBudgetUsage(1, 3), {
    pct: 33.3,
    label: '33.3%',
    exhausted: false,
  });
  assert.deepEqual(formatBudgetUsage(0, 100), {
    pct: 0,
    label: '0.0%',
    exhausted: false,
  });
});

test('formatBudgetUsage detects exhaustion at and beyond the limit', () => {
  assert.deepEqual(formatBudgetUsage(100, 100), {
    pct: 100,
    label: '100.0%',
    exhausted: true,
  });
  assert.deepEqual(formatBudgetUsage(120, 100), {
    pct: 100,
    label: '100.0%',
    exhausted: true,
  });
});

test('formatBudgetUsage treats a missing or negative limit as exhausted', () => {
  assert.deepEqual(formatBudgetUsage(0, 0), {
    pct: 0,
    label: '0.0%',
    exhausted: true,
  });
  assert.deepEqual(formatBudgetUsage(5, 0), {
    pct: 100,
    label: '100.0%',
    exhausted: true,
  });
  assert.deepEqual(formatBudgetUsage(5, -10), {
    pct: 100,
    label: '100.0%',
    exhausted: true,
  });
});

test('formatBudgetUsage guards negative and non-finite inputs', () => {
  assert.deepEqual(formatBudgetUsage(-20, 100), {
    pct: 0,
    label: '0.0%',
    exhausted: false,
  });
  assert.deepEqual(formatBudgetUsage(Number.NaN, 100), {
    pct: 0,
    label: '0.0%',
    exhausted: false,
  });
  assert.deepEqual(formatBudgetUsage(5, Number.NaN), {
    pct: 100,
    label: '100.0%',
    exhausted: true,
  });
  assert.deepEqual(formatBudgetUsage(Infinity, 100), {
    pct: 100,
    label: '100.0%',
    exhausted: true,
  });
});
