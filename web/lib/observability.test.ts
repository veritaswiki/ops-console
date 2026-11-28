import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLogJumpFilter,
  buildObservabilityChartSeries,
  classifyObservabilityHealth,
  formatDigestIntervalLabel,
  formatDiskQuota,
  positionAnnotationsOnTimeline,
  summarizeAnnotationsByMode,
  type ObservabilityAnnotation,
  type ObservabilityMetricPoint,
  type ObservabilitySourceRef,
} from './observability';

function makePoint(overrides: Partial<ObservabilityMetricPoint> = {}): ObservabilityMetricPoint {
  return {
    ts: Date.parse('2026-11-27T00:00:00.000Z'),
    isoTs: '2026-11-27T00:00:00.000Z',
    errorCount: 2,
    warnCount: 4,
    newFingerprintCount: 1,
    restartCount: 0,
    http5xxCount: 0,
    totalScanned: 100,
    ...overrides,
  };
}

function makeAnnotation(
  overrides: Partial<ObservabilityAnnotation> = {},
): ObservabilityAnnotation {
  return {
    id: 'ann-1',
    ts: Date.parse('2026-11-27T00:00:00.000Z'),
    isoTs: '2026-11-27T00:00:00.000Z',
    domainId: 'logs',
    severity: 'info',
    nodeId: 'node-a',
    serviceId: 'service-a',
    label: 'Event',
    detail: '',
    summary: '',
    trigger: 'event',
    mode: 'deterministic',
    ...overrides,
  };
}

test('buildObservabilityChartSeries handles an empty array', () => {
  const series = buildObservabilityChartSeries([]);
  assert.equal(series.hasData, false);
  assert.equal(series.startTs, 0);
  assert.equal(series.endTs, 0);
  assert.equal(series.maxY, 1);
  assert.deepEqual(series.plottedPoints, []);
  assert.equal(series.errorPath, '');
  assert.equal(series.warnPath, '');
  assert.equal(series.newFpPath, '');
  assert.equal(series.http5xxPath, '');
  assert.equal(series.restartPath, '');
});

test('buildObservabilityChartSeries centers a single point and keeps maxY at least 1', () => {
  const series = buildObservabilityChartSeries([makePoint({ errorCount: 0, warnCount: 0 })], 640, 160, 16);
  assert.equal(series.hasData, true);
  assert.equal(series.startTs, series.endTs);
  assert.equal(series.maxY, 1);
  assert.equal(series.plottedPoints.length, 1);
  assert.equal(series.plottedPoints[0].x, 320);
  assert.equal(series.plottedPoints[0].errorY, 144);
  assert.match(series.errorPath, /^M 320 144$/);
});

test('buildObservabilityChartSeries plots sorted points and all series paths without NaN', () => {
  const start = Date.parse('2026-11-27T00:00:00.000Z');
  const series = buildObservabilityChartSeries([
    makePoint({ ts: start + 60_000, errorCount: 8, warnCount: 6, newFingerprintCount: 2, http5xxCount: 4, restartCount: 1 }),
    makePoint({ ts: start, errorCount: 0, warnCount: 2, newFingerprintCount: 0, http5xxCount: 0, restartCount: 0 }),
  ], 640, 160, 16);
  assert.equal(series.hasData, true);
  assert.equal(series.startTs, start);
  assert.equal(series.endTs, start + 60_000);
  assert.equal(series.maxY, 8);
  assert.equal(series.plottedPoints[0].x, 16);
  assert.equal(series.plottedPoints[1].x, 624);
  assert.equal(series.plottedPoints[0].errorY, 144);
  assert.equal(series.plottedPoints[1].errorY, 16);
  for (const path of [series.errorPath, series.warnPath, series.newFpPath, series.http5xxPath, series.restartPath]) {
    assert.match(path, /^M /);
    assert.doesNotMatch(path, /NaN|Infinity/);
  }
});

test('buildObservabilityChartSeries sanitizes non-finite values and ignores invalid timestamps', () => {
  const validTs = Date.parse('2026-11-27T00:00:00.000Z');
  const series = buildObservabilityChartSeries([
    makePoint({ ts: Number.NaN }),
    makePoint({
      ts: validTs,
      errorCount: Number.NaN,
      warnCount: Number.POSITIVE_INFINITY,
      newFingerprintCount: -10,
      http5xxCount: Number.NEGATIVE_INFINITY,
      restartCount: Number.NaN,
    }),
  ]);
  assert.equal(series.hasData, true);
  assert.equal(series.plottedPoints.length, 1);
  assert.equal(series.maxY, 1);
  assert.equal(series.plottedPoints[0].errorY, 144);
  assert.equal(series.plottedPoints[0].warnY, 144);
  assert.doesNotMatch(series.errorPath, /NaN|Infinity/);
  assert.doesNotMatch(series.http5xxPath, /NaN|Infinity/);
});

test('positionAnnotationsOnTimeline sorts, scales, and clamps annotations', () => {
  const start = Date.parse('2026-11-27T00:00:00.000Z');
  const placements = positionAnnotationsOnTimeline([
    makeAnnotation({ id: 'late', ts: start + 120_000 }),
    makeAnnotation({ id: 'before', ts: start - 60_000 }),
    makeAnnotation({ id: 'early', ts: start }),
  ], start, start + 120_000, 640, 16);
  assert.deepEqual(placements.map((item) => item.annotation.id), ['before', 'early', 'late']);
  assert.equal(placements[0].x, 16);
  assert.equal(placements[1].x, 16);
  assert.equal(placements[2].x, 624);
  assert.equal(placements[0].lane, 0);
  assert.equal(placements[1].lane, 1);
  assert.equal(placements[2].lane, 0);
});

test('positionAnnotationsOnTimeline stacks nearby annotations into lanes 0..3', () => {
  const start = Date.parse('2026-11-27T00:00:00.000Z');
  const width = 640;
  const pad = 16;
  const plot = width - pad * 2;
  const ts = start + Math.round((plot / 1000) * 5);
  const annotations = Array.from({ length: 5 }, (_, index) => makeAnnotation({
    id: `ann-${index}`,
    ts,
  }));
  const placements = positionAnnotationsOnTimeline(annotations, start, start + 1000, width, pad);
  assert.deepEqual(placements.map((item) => item.lane), [0, 1, 2, 3, 0]);
  assert.deepEqual(placements.map((item) => item.x), Array(5).fill(placements[0].x));
});

test('positionAnnotationsOnTimeline handles a zero-width range and empty input', () => {
  const ts = Date.parse('2026-11-27T00:00:00.000Z');
  const [placement] = positionAnnotationsOnTimeline([makeAnnotation({ ts })], ts, ts, 640, 16);
  assert.equal(placement.x, 320);
  assert.equal(placement.lane, 0);
  assert.deepEqual(positionAnnotationsOnTimeline([], 0, 100), []);
});

test('formatDigestIntervalLabel maps canned intervals and rounds the rest', () => {
  assert.equal(formatDigestIntervalLabel(0), '关闭');
  assert.equal(formatDigestIntervalLabel(-5), '关闭');
  assert.equal(formatDigestIntervalLabel(Number.NaN), '关闭');
  assert.equal(formatDigestIntervalLabel(5), '5 分钟');
  assert.equal(formatDigestIntervalLabel(15), '15 分钟');
  assert.equal(formatDigestIntervalLabel(30), '30 分钟');
  assert.equal(formatDigestIntervalLabel(60), '1 小时');
  assert.equal(formatDigestIntervalLabel(7), '7 分钟');
  assert.equal(formatDigestIntervalLabel(12.6), '13 分钟');
});

test('classifyObservabilityHealth applies critical, warn, and healthy thresholds', () => {
  assert.equal(classifyObservabilityHealth({}), 'healthy');
  assert.equal(classifyObservabilityHealth({ errorCount: 0, diskUsedPct: 74 }), 'healthy');
  assert.equal(classifyObservabilityHealth({ errorCount: 1 }), 'warn');
  assert.equal(classifyObservabilityHealth({ newFingerprintCount: 1 }), 'warn');
  assert.equal(classifyObservabilityHealth({ http5xxCount: 1 }), 'warn');
  assert.equal(classifyObservabilityHealth({ diskUsedPct: 75 }), 'warn');
  assert.equal(classifyObservabilityHealth({ errorCount: 19 }), 'warn');
  assert.equal(classifyObservabilityHealth({ errorCount: 20 }), 'critical');
  assert.equal(classifyObservabilityHealth({ restartCount: 1 }), 'critical');
  assert.equal(classifyObservabilityHealth({ http5xxCount: 5 }), 'critical');
  assert.equal(classifyObservabilityHealth({ diskUsedPct: 90 }), 'critical');
});

test('classifyObservabilityHealth ignores non-finite and negative values', () => {
  assert.equal(classifyObservabilityHealth({
    errorCount: Number.NaN,
    newFingerprintCount: Number.POSITIVE_INFINITY,
    restartCount: -1,
    http5xxCount: Number.NEGATIVE_INFINITY,
    diskUsedPct: Number.NaN,
  }), 'healthy');
});

test('formatDiskQuota reports safe labels and boundary tones', () => {
  const empty = formatDiskQuota(0, 0);
  assert.equal(empty.usedLabel, '0 B');
  assert.equal(empty.capLabel, '0 B');
  assert.equal(empty.pct, 0);
  assert.equal(empty.tone, 'ok');

  const normal = formatDiskQuota(256 * 1024 * 1024, 1024);
  assert.equal(normal.usedLabel, '256 MB');
  assert.equal(normal.capLabel, '1.0 GB');
  assert.equal(normal.pct, 25);
  assert.equal(normal.tone, 'ok');
});

test('formatDiskQuota clamps unsafe values and classifies warn and crit', () => {
  assert.equal(formatDiskQuota(Number.NaN, 100).pct, 0);
  assert.equal(formatDiskQuota(-50, 100).usedLabel, '0 B');
  assert.equal(formatDiskQuota(75 * 1024 * 1024, 100).tone, 'warn');
  assert.equal(formatDiskQuota(74 * 1024 * 1024, 100).tone, 'ok');
  assert.equal(formatDiskQuota(90 * 1024 * 1024, 100).tone, 'crit');
  assert.equal(formatDiskQuota(200 * 1024 * 1024, 100).pct, 100);
});

test('buildLogJumpFilter maps every source kind', () => {
  const cases: Array<[ObservabilitySourceRef, Record<string, unknown>]> = [
    [{ sourceKind: 'journald', sourceId: 'ops-console.service' }, { source: 'journald', unit: 'ops-console.service', since: '1h' }],
    [{ sourceKind: 'file', sourceId: '/var/log/app.log' }, { source: 'file', file: '/var/log/app.log', since: '1h' }],
    [{ sourceKind: 'docker', sourceId: 'api' }, { source: 'docker', target: 'api', since: '1h' }],
    [{ sourceKind: 'http-json', sourceId: 'https://example.com/logs' }, { source: 'http-json', target: 'https://example.com/logs', since: '1h' }],
    [{ sourceKind: 'remote', sourceId: 'node-b' }, { source: 'remote', target: 'node-b', since: '1h' }],
  ];
  for (const [sourceRef, expected] of cases) {
    assert.deepEqual(buildLogJumpFilter(sourceRef), expected);
  }
});

test('buildLogJumpFilter falls back to unified targets and tolerates missing input', () => {
  assert.deepEqual(buildLogJumpFilter(null, 'svc-a'), { source: 'unified', targets: ['svc-a'], since: '1h' });
  assert.deepEqual(buildLogJumpFilter(undefined), { source: 'unified', targets: [], since: '1h' });
  assert.deepEqual(buildLogJumpFilter(null, ''), { source: 'unified', targets: [], since: '1h' });
});

test('summarizeAnnotationsByMode counts modes and severities', () => {
  const summary = summarizeAnnotationsByMode([
    makeAnnotation({ id: '1', mode: 'llm', severity: 'critical' }),
    makeAnnotation({ id: '2', mode: 'deterministic', severity: 'warn' }),
    makeAnnotation({ id: '3', mode: 'silent_skip', severity: 'info' }),
    makeAnnotation({ id: '4', mode: 'skipped', severity: 'warn' }),
    makeAnnotation({ id: '5', mode: 'unknown', severity: 'critical' }),
  ]);
  assert.deepEqual(summary, {
    total: 5,
    llmCount: 1,
    deterministicCount: 1,
    silentSkipCount: 2,
    criticalCount: 2,
    warnCount: 2,
  });
});

test('summarizeAnnotationsByMode handles empty input', () => {
  assert.deepEqual(summarizeAnnotationsByMode([]), {
    total: 0,
    llmCount: 0,
    deterministicCount: 0,
    silentSkipCount: 0,
    criticalCount: 0,
    warnCount: 0,
  });
});
