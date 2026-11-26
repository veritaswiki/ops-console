import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTriggerPathBreakdown,
  computeAttentionBudgetState,
  computeContextSpillStats,
  filterCollaborationLogs,
  formatBytesKb,
  getLogEventMeta,
} from './swarm-memory-engine';
import type {
  A2ACollaborationLog,
  A2AContextSpillNode,
  A2ASuperAgentTicket,
  A2ATriggerEvent,
} from '../types';

test('buildTriggerPathBreakdown computes Fast Drop, Passthrough, and Slow Spawn ratios', () => {
  const events: A2ATriggerEvent[] = [
    {
      id: 't1',
      ts: '2026-05-01T00:00:00Z',
      channel: 'github',
      actor: 'dsh-bot',
      threadKey: 'gh:repo#1',
      summary: 'echo',
      decision: 'fast_drop',
      reason: 'self-echo',
      ticketId: null,
      tokensSaved: 1450,
    },
    {
      id: 't2',
      ts: '2026-05-01T00:01:00Z',
      channel: 'ci',
      actor: 'actions',
      threadKey: 'ci:repo#1',
      summary: 'ci log',
      decision: 'fast_passthrough',
      reason: 'subscribed',
      ticketId: 'tkt-1',
      tokensSaved: 980,
    },
    {
      id: 't3',
      ts: '2026-05-01T00:02:00Z',
      channel: 'github',
      actor: 'maintainer',
      threadKey: 'gh:repo#2',
      summary: 'new pr',
      decision: 'slow_spawn',
      reason: 'router spawn',
      ticketId: 'tkt-2',
      tokensSaved: 0,
    },
    {
      id: 't4',
      ts: '2026-05-01T00:03:00Z',
      channel: 'webhook',
      actor: 'bot',
      threadKey: 'gh:repo#3',
      summary: 'noise',
      decision: 'fast_drop',
      reason: 'noise',
      ticketId: null,
      tokensSaved: 1200,
    },
  ];

  const breakdown = buildTriggerPathBreakdown(events);
  assert.equal(breakdown.total, 4);
  assert.equal(breakdown.offloadPct, 75);
  assert.equal(breakdown.totalTokensSaved, 3630);
  assert.equal(breakdown.items.find((i) => i.key === 'fast_drop')?.count, 2);
  assert.equal(breakdown.items.find((i) => i.key === 'fast_passthrough')?.count, 1);
  assert.equal(breakdown.items.find((i) => i.key === 'slow_spawn')?.count, 1);
});

test('computeContextSpillStats tracks inline budget overflow and offload ratio', () => {
  const nodes: A2AContextSpillNode[] = [
    {
      spillId: 'spill-1',
      ticketId: 'tkt-1',
      threadKey: 'gh:repo#1',
      parentRef: 'tkt-1 -> diff',
      label: 'Big diff',
      state: 'spilled',
      bytes: 92 * 1024,
      preview: '{}',
      recallCount: 2,
      updatedAt: '2026-05-01T00:00:00Z',
    },
    {
      spillId: 'spill-2',
      ticketId: 'tkt-1',
      threadKey: 'gh:repo#1',
      parentRef: 'tkt-1 -> rubric',
      label: 'Rubric',
      state: 'inline',
      bytes: 8 * 1024,
      preview: '{}',
      recallCount: 4,
      updatedAt: '2026-05-01T00:00:00Z',
    },
  ];

  const okStats = computeContextSpillStats(nodes, 32);
  assert.equal(okStats.inlineKb, 8);
  assert.equal(okStats.spilledKb, 92);
  assert.equal(okStats.offloadPct, 92);
  assert.equal(okStats.overBudget, false);
  assert.equal(okStats.totalRecalls, 6);

  const tightStats = computeContextSpillStats(nodes, 4);
  assert.equal(tightStats.overBudget, true);
});

test('computeAttentionBudgetState flags stalled tickets as error tone', () => {
  const tickets: A2ASuperAgentTicket[] = [
    {
      id: 't1',
      threadKey: 'gh:1',
      channel: 'github',
      title: 'T1',
      status: 'review_gate',
      pathTaken: 'slow_spawn',
      workerAgentId: 'a1',
      workerAgentName: 'Claude',
      worktreeBranch: '.worktrees/t1',
      subscribed: true,
      inlineBytes: 1024,
      spilledCount: 1,
      lastProgressAt: '2026-05-01T00:00:00Z',
      watchdogState: 'healthy',
      updatedAt: '2026-05-01T00:00:00Z',
    },
    {
      id: 't2',
      threadKey: 'alert:2',
      channel: 'alert',
      title: 'T2',
      status: 'stalled',
      pathTaken: 'slow_spawn',
      workerAgentId: 'a2',
      workerAgentName: 'Gemini',
      worktreeBranch: '.worktrees/t2',
      subscribed: true,
      inlineBytes: 2048,
      spilledCount: 1,
      lastProgressAt: '2026-05-01T00:00:00Z',
      watchdogState: 'stalled',
      updatedAt: '2026-05-01T00:00:00Z',
    },
  ];

  const state = computeAttentionBudgetState(tickets, 4);
  assert.equal(state.active, 2);
  assert.equal(state.stalled, 1);
  assert.equal(state.needsAttention, 2);
  assert.equal(state.utilizationPct, 50);
  assert.equal(state.tone, 'err');
});

test('filterCollaborationLogs filters by agentId, SuperAgent event prefix, level, and spillRefId', () => {
  const sample: A2ACollaborationLog[] = [
    {
      id: 'l1',
      ts: '2026-05-01T00:00:00Z',
      level: 'info',
      eventType: 'superagent.fast_path',
      sourceAgentId: 'lead-1',
      sourceAgentName: 'Codex Lead',
      targetAgentId: 'pi-1',
      targetAgentName: 'Pi Fast',
      summary: 'Subscription Passthrough to Pi',
      detail: 'Bypassed thin router',
    },
    {
      id: 'l2',
      ts: '2026-05-01T00:01:00Z',
      level: 'warn',
      eventType: 'context.spill',
      sourceAgentId: 'lead-1',
      sourceAgentName: 'Codex Lead',
      targetAgentId: 'claude-1',
      targetAgentName: 'Claude Arch',
      spillRefId: 'spill-901a',
      summary: 'Spilled 92 KB diff',
      detail: 'Offloaded to Chain of Recall',
    },
  ];

  assert.equal(filterCollaborationLogs(sample, { agentId: 'pi-1' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { eventType: 'superagent' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { eventType: 'context' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { level: 'warn' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { q: 'spill-901a' }).length, 1);
  assert.equal(filterCollaborationLogs(sample, { agentId: 'all' }).length, 2);
});

test('formatBytesKb and getLogEventMeta return readable SuperAgent labels', () => {
  assert.equal(formatBytesKb(512), '512 B');
  assert.equal(formatBytesKb(8192), '8 KB');
  assert.equal(formatBytesKb(120832), '118 KB');
  assert.equal(getLogEventMeta('superagent.fast_path').label, 'Fast Path 直滤');
  assert.equal(getLogEventMeta('context.recall').label, 'Chain of Recall');
  assert.equal(getLogEventMeta('watchdog.check').label, 'Watchdog 巡检');
  assert.equal(getLogEventMeta('dsh.review_vote').label, 'DSH 团队投票');
});
