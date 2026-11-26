import test from 'node:test';
import assert from 'node:assert/strict';
import type { LinearIssueItem } from '../types';
import {
  computeAgentWorkloads,
  describeAgentRole,
  groupIssuesForSimpleBoard,
  isAgentOnline,
  mapStatusToSimpleColumn,
  pickUpcomingTasks,
  shortAgentName,
  SIMPLE_BOARD_COLUMNS,
} from './agent-console';

function makeIssue(overrides: Partial<LinearIssueItem>): LinearIssueItem {
  return {
    id: overrides.id || 'iss-1',
    identifier: overrides.identifier || 'OPS-1',
    title: overrides.title || 'Sample Task',
    description: '',
    status: overrides.status || 'todo',
    priority: overrides.priority || 'medium',
    projectId: 'proj-1',
    cycleId: 'cycle-1',
    parentId: null,
    blockedBy: [],
    assigneeType: 'agent',
    assigneeId: overrides.assigneeId || 'a2a-hub-codex-lead',
    assigneeName: overrides.assigneeName || 'Codex',
    commanderId: 'a2a-hub-codex-lead',
    labels: [],
    estimate: 2,
    worktreeBranch: null,
    linkedTaskId: null,
    github: null,
    sourceBotId: null,
    createdAt: '2026-11-26T00:00:00Z',
    updatedAt: '2026-11-26T00:00:00Z',
  };
}

test('mapStatusToSimpleColumn collapses 6 Linear statuses into 4 crisp workflow columns', () => {
  assert.equal(SIMPLE_BOARD_COLUMNS.length, 4);
  assert.equal(mapStatusToSimpleColumn('triage'), 'queued');
  assert.equal(mapStatusToSimpleColumn('backlog'), 'queued');
  assert.equal(mapStatusToSimpleColumn('todo'), 'queued');
  assert.equal(mapStatusToSimpleColumn('in_progress'), 'in_progress');
  assert.equal(mapStatusToSimpleColumn('in_review'), 'in_review');
  assert.equal(mapStatusToSimpleColumn('done'), 'done');
  assert.equal(mapStatusToSimpleColumn('canceled'), null);
});

test('groupIssuesForSimpleBoard bubbles triage first and sorts by priority weight', () => {
  const issues: LinearIssueItem[] = [
    makeIssue({ id: '1', status: 'backlog', priority: 'urgent' }),
    makeIssue({ id: '2', status: 'triage', priority: 'low' }),
    makeIssue({ id: '3', status: 'todo', priority: 'high' }),
    makeIssue({ id: '4', status: 'in_progress', priority: 'medium' }),
    makeIssue({ id: '5', status: 'done', priority: 'high' }),
    makeIssue({ id: '6', status: 'canceled', priority: 'urgent' }),
  ];

  const grouped = groupIssuesForSimpleBoard(issues);
  assert.deepEqual(
    grouped.queued.map((i) => i.id),
    ['2', '1', '3'],
  );
  assert.equal(grouped.in_progress.length, 1);
  assert.equal(grouped.done.length, 1);
});

test('computeAgentWorkloads tracks current, next, review, and done tasks per Agent', () => {
  const agents = [
    { id: 'a1', name: 'Codex Lead', harness: 'codex-cli', role: 'lead', status: 'online', modelHint: 'gpt-5-codex' },
    { id: 'a2', name: 'Claude Worker', harness: 'claude-code', role: 'worker', status: 'online', modelHint: 'claude-sonnet-4-6' },
  ];
  const issues = [
    makeIssue({ id: 'i1', assigneeId: 'a1', status: 'in_progress', priority: 'urgent' }),
    makeIssue({ id: 'i2', assigneeId: 'a1', status: 'todo', priority: 'high' }),
    makeIssue({ id: 'i3', assigneeId: 'a2', status: 'in_review', priority: 'medium' }),
    makeIssue({ id: 'i4', assigneeId: 'a2', status: 'done', priority: 'low' }),
  ];

  const workloads = computeAgentWorkloads(agents, issues);
  assert.equal(workloads[0].currentIssues.length, 1);
  assert.equal(workloads[0].nextIssues.length, 1);
  assert.equal(workloads[1].reviewIssues.length, 1);
  assert.equal(workloads[1].doneCount, 1);

  const upcoming = pickUpcomingTasks(issues, 3);
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].id, 'i2');

  assert.match(describeAgentRole({ role: 'lead', harness: 'codex-cli' }), /总指挥/);
  assert.match(describeAgentRole({ role: 'worker', harness: 'claude-code' }), /主力开发/);
});

test('isAgentOnline and shortAgentName normalize agent status and display labels', () => {
  assert.equal(isAgentOnline('healthy'), true);
  assert.equal(isAgentOnline('online'), true);
  assert.equal(isAgentOnline('offline'), false);
  assert.equal(shortAgentName('Codex CLI (主控 Harness)'), 'Codex CLI');
  assert.equal(shortAgentName('Claude Code（架构与 UI 专家）'), 'Claude Code');
  assert.equal(shortAgentName(''), 'Agent');
});

