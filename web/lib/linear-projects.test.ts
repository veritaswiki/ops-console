import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLinearDependencyGraph,
  filterLinearIssues,
  getPriorityMeta,
  groupIssuesByStatus,
} from './linear-projects';
import type { LinearIssueItem, LinearProjectItem } from '../types';

const SAMPLE_PROJECTS: LinearProjectItem[] = [
  {
    id: 'proj-1',
    key: 'OPS',
    name: 'AI 控制面',
    summary: 'Core',
    status: 'in_progress',
    leadAgentId: 'lead-1',
    targetDate: '2026-12-01',
    githubRepo: 'ops-console/ops-console',
    issueCount: 3,
    doneCount: 1,
    inProgressCount: 1,
    progressPct: 33,
  },
];

const SAMPLE_ISSUES: LinearIssueItem[] = [
  {
    id: 'iss-1',
    identifier: 'OPS-1',
    title: '主需求：总指挥自动派发',
    description: 'desc',
    status: 'in_progress',
    priority: 'urgent',
    projectId: 'proj-1',
    cycleId: 'cycle-1',
    parentId: null,
    blockedBy: [],
    assigneeType: 'agent',
    assigneeId: 'lead-1',
    assigneeName: 'Codex Lead',
    commanderId: 'lead-1',
    labels: ['commander'],
    estimate: 5,
    worktreeBranch: 'ai/ops-1',
    linkedTaskId: null,
    github: {
      repo: 'ops-console/ops-console',
      issueNumber: 10,
      prNumber: 12,
      prState: 'open',
      branch: 'ai/ops-1',
      url: 'https://github.com/ops-console/ops-console/pull/12',
      syncedAt: '2026-11-26T00:00:00Z',
    },
    sourceBotId: null,
    createdAt: '2026-11-26T00:00:00Z',
    updatedAt: '2026-11-26T00:00:00Z',
  },
  {
    id: 'iss-2',
    identifier: 'OPS-2',
    title: '子任务：实现后端引擎',
    description: 'backend',
    status: 'done',
    priority: 'high',
    projectId: 'proj-1',
    cycleId: 'cycle-1',
    parentId: 'iss-1',
    blockedBy: [],
    assigneeType: 'agent',
    assigneeId: 'worker-1',
    assigneeName: 'Claude Worker',
    commanderId: 'lead-1',
    labels: ['backend'],
    estimate: 2,
    worktreeBranch: 'ai/ops-1',
    linkedTaskId: null,
    github: null,
    sourceBotId: null,
    createdAt: '2026-11-26T00:00:00Z',
    updatedAt: '2026-11-26T00:00:00Z',
  },
  {
    id: 'iss-3',
    identifier: 'OPS-3',
    title: '子任务：评审合并',
    description: 'review',
    status: 'todo',
    priority: 'low',
    projectId: 'proj-1',
    cycleId: 'cycle-1',
    parentId: 'iss-1',
    blockedBy: ['iss-2'],
    assigneeType: 'agent',
    assigneeId: 'dsh-1',
    assigneeName: 'DSH Reviewer',
    commanderId: 'lead-1',
    labels: ['review'],
    estimate: 1,
    worktreeBranch: 'ai/ops-1',
    linkedTaskId: null,
    github: null,
    sourceBotId: null,
    createdAt: '2026-11-26T00:00:00Z',
    updatedAt: '2026-11-26T00:00:00Z',
  },
];

test('filterLinearIssues filters by status, priority, and query text', () => {
  assert.equal(filterLinearIssues(SAMPLE_ISSUES, { status: 'done' }).length, 1);
  assert.equal(filterLinearIssues(SAMPLE_ISSUES, { priority: 'urgent' })[0]?.identifier, 'OPS-1');
  assert.equal(filterLinearIssues(SAMPLE_ISSUES, { query: 'dsh' })[0]?.identifier, 'OPS-3');
});

test('groupIssuesByStatus groups into Linear buckets sorted by priority weight', () => {
  const grouped = groupIssuesByStatus(SAMPLE_ISSUES);
  assert.equal(grouped.in_progress.length, 1);
  assert.equal(grouped.done.length, 1);
  assert.equal(grouped.todo.length, 1);
  assert.ok(getPriorityMeta('urgent').weight > getPriorityMeta('low').weight);
});

test('buildLinearDependencyGraph constructs commander, issues, blocking edges, and GitHub PR nodes', () => {
  const graph = buildLinearDependencyGraph({
    commanderName: 'Codex Lead',
    commanderId: 'lead-1',
    issues: SAMPLE_ISSUES,
    projects: SAMPLE_PROJECTS,
  });

  // 1 commander + 1 root issue + 2 sub-issues + 1 GitHub PR = 5 nodes
  assert.equal(graph.nodes.length, 5);
  assert.ok(graph.nodes.some((n) => n.kind === 'commander'));
  assert.ok(graph.nodes.some((n) => n.kind === 'github-pr' && n.title.includes('#12')));
  assert.ok(graph.edges.some((e) => e.kind === 'commands'));
  assert.ok(graph.edges.some((e) => e.kind === 'parent'));
  assert.ok(graph.edges.some((e) => e.kind === 'blocks'));
  assert.ok(graph.edges.some((e) => e.kind === 'delivers'));
});
