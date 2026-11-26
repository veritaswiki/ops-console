import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEngramUCurveSeries,
  computeSm2Preview,
  filterCollaborationLogs,
  formatIntervalHuman,
  getLogEventMeta,
} from './swarm-memory-engine';
import type { A2ACollaborationLog } from '../types';

test('buildEngramUCurveSeries peaks at 25% conditional memory / 75% compute', () => {
  const series = buildEngramUCurveSeries(25);
  assert.equal(series.length, 9);
  const peak = series.reduce((best, cur) => (cur.efficiencyPct > best.efficiencyPct ? cur : best), series[0]);
  assert.equal(peak.memoryPct, 25);
  assert.equal(peak.computePct, 75);
  assert.equal(peak.isOptimal, true);
  assert.equal(peak.isCurrent, true);
  assert.ok(peak.efficiencyPct > series[0].efficiencyPct);
  assert.ok(peak.efficiencyPct > series[series.length - 1].efficiencyPct);
});

test('computeSm2Preview expands interval on q=5 and resets on q=1', () => {
  const boosted = computeSm2Preview({ easeFactor: 2.5, intervalHours: 48, repetitions: 3 }, 5);
  assert.equal(boosted.nextRepetitions, 4);
  assert.ok(boosted.nextIntervalHours > 100);
  assert.ok(boosted.nextEaseFactor >= 2.5);

  const forgotten = computeSm2Preview({ easeFactor: 2.5, intervalHours: 48, repetitions: 3 }, 1);
  assert.equal(forgotten.nextRepetitions, 0);
  assert.equal(forgotten.nextIntervalHours, 6);
  assert.equal(forgotten.nextEaseFactor, 2.3);
});

test('filterCollaborationLogs filters by agentId, eventType prefix, level, and text query', () => {
  const sample: A2ACollaborationLog[] = [
    {
      id: 'l1',
      ts: '2026-05-01T00:00:00Z',
      level: 'info',
      eventType: 'swarm.fanout',
      sourceAgentId: 'lead-1',
      sourceAgentName: 'Codex Lead',
      targetAgentId: 'pi-1',
      targetAgentName: 'Pi Fast',
      summary: 'Fanout unit test task',
      detail: 'Run node:test in worktree',
    },
    {
      id: 'l2',
      ts: '2026-05-01T00:01:00Z',
      level: 'warn',
      eventType: 'memory.engram_hit',
      sourceAgentId: 'lead-1',
      sourceAgentName: 'Codex Lead',
      targetAgentId: 'claude-1',
      targetAgentName: 'Claude Arch',
      engramHitKey: 'engram-auth-csrf',
      summary: 'Engram O(1) hit',
      detail: 'Injected auth guard invariant',
    },
  ];

  assert.equal(filterCollaborationLogs(sample, { agentId: 'pi-1' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { eventType: 'memory' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { level: 'warn' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { q: 'engram-auth-csrf' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { agentId: 'all' }).length, 2);
});

test('formatIntervalHuman and getLogEventMeta return readable labels', () => {
  assert.equal(formatIntervalHuman(12), '12 小时');
  assert.equal(formatIntervalHuman(72), '3 天');
  assert.equal(getLogEventMeta('dsh.review_vote').label, 'DSH 团队投票');
});
