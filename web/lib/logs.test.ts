import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLogHistogram,
  formatDirectReadSummary,
  formatLogBytes,
  normalizeLogNavigation,
  resolveServiceLogSources,
  toggleUnifiedTarget,
} from './logs';

test('resolveServiceLogSources returns journald by default and adds native file + unified when linked', () => {
  const basic = resolveServiceLogSources(
    { id: 'magpie', name: 'Magpie', unit: 'magpie.service' },
    { files: [] },
  );
  assert.equal(basic.length, 1);
  assert.equal(basic[0].source, 'service');
  assert.equal(basic[0].target, 'magpie.service');

  const withFile = resolveServiceLogSources(
    { id: 'nmem', name: 'Nowledge Mem', unit: 'nmem.service', hasLogFile: true, logFileId: 'svc-file:nmem' },
    {
      files: [
        { id: 'svc-file:nmem', name: 'Nowledge Mem 原生日志', serviceId: 'nmem', unit: 'nmem.service' },
      ],
    },
  );
  assert.equal(withFile.length, 3);
  assert.deepEqual(
    withFile.map((item) => item.source),
    ['service', 'file', 'unified'],
  );
  assert.equal(withFile[1].target, 'svc-file:nmem');
  assert.deepEqual(withFile[2].targets, ['nmem']);
});

test('toggleUnifiedTarget switches cleanly between all and multi-service subset', () => {
  assert.deepEqual(toggleUnifiedTarget(['all'], 'magpie'), ['magpie']);
  assert.deepEqual(toggleUnifiedTarget(['magpie'], 'nmem'), ['magpie', 'nmem']);
  assert.deepEqual(toggleUnifiedTarget(['magpie', 'nmem'], 'magpie'), ['nmem']);
  assert.deepEqual(toggleUnifiedTarget(['nmem'], 'nmem'), ['all']);
  assert.deepEqual(toggleUnifiedTarget(['magpie', 'nmem'], 'all'), ['all']);
});

test('normalizeLogNavigation preserves modal filter handoff and legacy string unit calls', () => {
  const legacy = normalizeLogNavigation('openviking.service', 'error');
  assert.equal(legacy.source, 'service');
  assert.equal(legacy.target, 'openviking.service');
  assert.equal(legacy.level, 'error');

  const handoff = normalizeLogNavigation({
    source: 'file',
    target: 'svc-file:nmem',
    targets: ['svc-file:nmem'],
    level: 'warn',
    query: 'timeout|retry',
    regex: true,
    since: '6h',
  });
  assert.deepEqual(handoff, {
    source: 'file',
    target: 'svc-file:nmem',
    targets: ['svc-file:nmem'],
    level: 'warn',
    query: 'timeout|retry',
    regex: true,
    since: '6h',
  });
});

test('buildLogHistogram and formatDirectReadSummary compute buckets and truncation summaries', () => {
  const buckets = buildLogHistogram(
    [
      { ts: '2026-11-27T01:00:00.000Z', level: 'info', message: 'a' },
      { ts: '2026-11-27T01:05:00.000Z', level: 'warn', message: 'b' },
      { ts: '2026-11-27T01:10:00.000Z', level: 'error', message: 'c' },
    ],
    4,
  );
  assert.equal(buckets.length, 4);
  assert.equal(buckets.reduce((sum, item) => sum + item.total, 0), 3);
  assert.equal(formatLogBytes(262144), '256.0 KB');

  const summary = formatDirectReadSummary({
    directRead: true,
    elapsedMs: 18,
    totalReadBytes: 131072,
    sourcesQueried: 5,
    truncatedSources: 1,
    maxBytesPerFile: 262144,
    maxLines: 200,
  });
  assert.match(summary, /原位直读/);
  assert.match(summary, /5 源/);
  assert.match(summary, /18ms/);
  assert.match(summary, /截断/);
});
