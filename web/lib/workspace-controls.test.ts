import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  A2ABtwMergeProposal,
  A2ABtwThread,
  A2ATaskRecord,
  GithubPullRequestSummary,
  LinearIssueItem,
} from '../types';
import {
  CONTEXT_RAIL_DEFAULT_WIDTH,
  CONTEXT_RAIL_MAX_WIDTH,
  CONTEXT_RAIL_MIN_WIDTH,
  DEFAULT_INLINE_PREVIEW_CHARS,
  buildNeedsYouQueue,
  buildNodeDraftKey,
  buildTaskIssueLinkIndex,
  clampContextRailWidth,
  clearNodeDraft,
  formatInlineOutputPreview,
  loadNodeDraft,
  saveNodeDraft,
} from './workspace-controls';

function makeTask(overrides: Partial<A2ATaskRecord> = {}): A2ATaskRecord {
  return {
    id: 'task-1',
    protocolMethod: 'message/send',
    state: 'working',
    prompt: '检查探针心跳',
    leadAgentId: 'agent-lead',
    leadAgentName: 'Lead Agent',
    leadNodeId: 'node-a',
    workerAgentId: 'agent-worker',
    workerAgentName: 'Worker Agent',
    workerNodeId: 'node-a',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
    durationMs: 1000,
    steps: [],
    ...overrides,
  };
}

function makeProposal(overrides: Partial<A2ABtwMergeProposal> = {}): A2ABtwMergeProposal {
  return {
    id: 'proposal-1',
    proposedAt: '2026-06-01T10:00:00.000Z',
    proposedBy: 'Agent BTW',
    summary: '合并探针修复',
    rationale: '补充健康检查',
    targetType: 'task_step',
    patchPreview: '+ ping()',
    riskLevel: 'low',
    status: 'pending',
    ...overrides,
  };
}

function makeBtwThread(overrides: Partial<A2ABtwThread> = {}): A2ABtwThread {
  return {
    id: 'btw-1',
    contextId: 'ctx-1',
    title: '探针修复旁路',
    mode: 'btw',
    status: 'pending_approval',
    isolation: 'ephemeral',
    targetAgentId: 'agent-worker',
    targetAgentName: 'Worker Agent',
    model: 'mlx/node-b-one',
    mainlineRevisionAtOpen: 1,
    messages: [],
    mergeProposal: makeProposal(),
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:10:00.000Z',
    createdBy: 'operator',
    ...overrides,
  };
}

function makeIssue(overrides: Partial<LinearIssueItem> = {}): LinearIssueItem {
  return {
    id: 'issue-1',
    identifier: 'OPS-101',
    title: 'Improve probes',
    description: '',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-1',
    cycleId: null,
    parentId: null,
    blockedBy: [],
    assigneeType: 'agent',
    assigneeId: 'agent-1',
    assigneeName: 'Agent One',
    commanderId: 'commander-1',
    labels: [],
    estimate: 1,
    worktreeBranch: null,
    linkedTaskId: null,
    github: null,
    sourceBotId: null,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

function makePr(overrides: Partial<GithubPullRequestSummary> = {}): GithubPullRequestSummary {
  return {
    number: 42,
    title: 'Fix OPS-101',
    state: 'OPEN',
    headRefName: 'feat/ops-101',
    url: 'https://example.com/pr/42',
    updatedAt: '2026-06-01T09:00:00.000Z',
    ...overrides,
  };
}

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

test('buildNodeDraftKey scopes drafts by node and task', () => {
  assert.equal(
    buildNodeDraftKey('node-a', 'task-1'),
    'ops-console:agent-draft:node-a:task-1',
  );
  assert.equal(
    buildNodeDraftKey('node-a', 'task-2'),
    'ops-console:agent-draft:node-a:task-2',
  );
  assert.notEqual(
    buildNodeDraftKey('node-a', 'task-1'),
    buildNodeDraftKey('node-b', 'task-1'),
  );
  assert.equal(
    buildNodeDraftKey(null, undefined),
    'ops-console:agent-draft:default:default',
  );
  assert.equal(
    buildNodeDraftKey('  node a  ', ' task:1 '),
    'ops-console:agent-draft:node%20a:task%3A1',
  );
});

test('node draft helpers isolate writes, clear blanks, and tolerate missing storage', () => {
  const storage = makeStorage();
  assert.equal(loadNodeDraft(null, 'node-a', 'task-1'), '');
  assert.equal(loadNodeDraft(undefined, 'node-a', 'task-1'), '');
  saveNodeDraft(null, 'node-a', 'task-1', 'ignored');
  clearNodeDraft(null, 'node-a', 'task-1');

  saveNodeDraft(storage, 'node-a', 'task-1', '第一个节点的草稿');
  assert.equal(loadNodeDraft(storage, 'node-a', 'task-1'), '第一个节点的草稿');
  assert.equal(loadNodeDraft(storage, 'node-b', 'task-1'), '');
  assert.equal(
    storage.data.get('ops-console:agent-draft:node-a:task-1'),
    '第一个节点的草稿',
  );

  saveNodeDraft(storage, 'node-b', 'task-1', ' second draft ');
  assert.equal(loadNodeDraft(storage, 'node-b', 'task-1'), ' second draft ');

  saveNodeDraft(storage, 'node-a', 'task-1', '   ');
  assert.equal(loadNodeDraft(storage, 'node-a', 'task-1'), '');
  assert.equal(storage.data.has('ops-console:agent-draft:node-a:task-1'), false);

  saveNodeDraft(storage, 'node-a', 'task-1', 'to clear');
  clearNodeDraft(storage, 'node-a', 'task-1');
  assert.equal(loadNodeDraft(storage, 'node-a', 'task-1'), '');

  const throwingStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };
  assert.equal(loadNodeDraft(throwingStorage, 'node-a', 'task-1'), '');
  assert.doesNotThrow(() => saveNodeDraft(throwingStorage, 'node-a', 'task-1', 'draft'));
  assert.doesNotThrow(() => clearNodeDraft(throwingStorage, 'node-a', 'task-1'));
});

test('formatInlineOutputPreview truncates at the configured character budget', () => {
  assert.deepEqual(formatInlineOutputPreview(null), {
    preview: '',
    truncated: false,
    totalChars: 0,
    omittedChars: 0,
  });
  assert.deepEqual(formatInlineOutputPreview(undefined, 10), {
    preview: '',
    truncated: false,
    totalChars: 0,
    omittedChars: 0,
  });
  assert.deepEqual(formatInlineOutputPreview('', 10), {
    preview: '',
    truncated: false,
    totalChars: 0,
    omittedChars: 0,
  });
  assert.deepEqual(formatInlineOutputPreview('abcde', 5), {
    preview: 'abcde',
    truncated: false,
    totalChars: 5,
    omittedChars: 0,
  });
  assert.deepEqual(formatInlineOutputPreview('abcdefghij', 4), {
    preview: 'abcd',
    truncated: true,
    totalChars: 10,
    omittedChars: 6,
  });
  assert.deepEqual(formatInlineOutputPreview('abcdef', 2.9), {
    preview: 'ab',
    truncated: true,
    totalChars: 6,
    omittedChars: 4,
  });
  assert.deepEqual(formatInlineOutputPreview('abc', 0), {
    preview: '',
    truncated: true,
    totalChars: 3,
    omittedChars: 3,
  });
  assert.deepEqual(formatInlineOutputPreview('abc', -10), {
    preview: '',
    truncated: true,
    totalChars: 3,
    omittedChars: 3,
  });

  const longText = 'x'.repeat(DEFAULT_INLINE_PREVIEW_CHARS + 25);
  const longPreview = formatInlineOutputPreview(longText);
  assert.equal(longPreview.preview.length, DEFAULT_INLINE_PREVIEW_CHARS);
  assert.equal(longPreview.truncated, true);
  assert.equal(longPreview.totalChars, DEFAULT_INLINE_PREVIEW_CHARS + 25);
  assert.equal(longPreview.omittedChars, 25);

  const nanLimit = formatInlineOutputPreview(longText, Number.NaN);
  assert.equal(nanLimit.preview.length, DEFAULT_INLINE_PREVIEW_CHARS);
  assert.equal(nanLimit.truncated, true);
});

test('buildNeedsYouQueue prioritizes approvals, snoozes, failures, then attention', () => {
  const nowMs = Date.parse('2026-06-01T12:00:00.000Z');
  const tasks = [
    makeTask({
      id: 'task-snooze',
      state: 'working',
      prompt: '等待部署窗口',
      snoozedAt: '2026-06-01T10:00:00.000Z',
      snoozedUntil: '2026-06-01T11:00:00.000Z',
      updatedAt: '2026-06-01T11:20:00.000Z',
    }),
    makeTask({
      id: 'task-snooze-early',
      state: 'working',
      prompt: '提前唤醒的旁路',
      snoozedAt: '2026-06-01T10:00:00.000Z',
      snoozedUntil: '2026-06-01T13:00:00.000Z',
      attention: {
        unread: false,
        snoozed: true,
        snoozeWokenEarly: true,
        needsAttention: true,
        reasons: ['收到新消息'],
      },
      updatedAt: '2026-06-01T11:10:00.000Z',
    }),
    makeTask({
      id: 'task-future-snooze',
      state: 'working',
      snoozedAt: '2026-06-01T10:00:00.000Z',
      snoozedUntil: '2026-06-01T13:00:00.000Z',
      updatedAt: '2026-06-01T11:15:00.000Z',
    }),
    makeTask({
      id: 'task-snoozed-unread',
      state: 'working',
      snoozedAt: '2026-06-01T10:00:00.000Z',
      snoozedUntil: '2026-06-01T13:00:00.000Z',
      updatedAt: '2026-06-01T11:35:00.000Z',
      attention: {
        unread: true,
        snoozed: true,
        snoozeWokenEarly: false,
        needsAttention: false,
        reasons: ['unread_update'],
      },
    }),
    makeTask({
      id: 'task-snooze-read',
      state: 'working',
      snoozedAt: '2026-06-01T09:00:00.000Z',
      snoozedUntil: '2026-06-01T11:00:00.000Z',
      updatedAt: '2026-06-01T11:25:00.000Z',
      attention: {
        unread: false,
        snoozed: false,
        snoozeWokenEarly: false,
        needsAttention: false,
        reasons: [],
      },
    }),
    makeTask({
      id: 'task-failed',
      state: 'failed',
      prompt: '构建矩阵失败',
      workerAgentName: 'Builder',
      updatedAt: '2026-06-01T10:00:00.000Z',
      steps: [{ ts: '2026-06-01T10:00:00.000Z', state: 'failed', detail: 'build failed' }],
    }),
    makeTask({
      id: 'task-overlap',
      state: 'failed',
      prompt: '失败且未读',
      updatedAt: '2026-06-01T10:30:00.000Z',
      steps: [{ ts: '2026-06-01T10:30:00.000Z', state: 'failed', detail: 'tests failed' }],
      attention: {
        unread: true,
        snoozed: false,
        snoozeWokenEarly: false,
        needsAttention: true,
        reasons: ['失败'],
      },
    }),
    makeTask({
      id: 'task-attention',
      state: 'working',
      prompt: '需要审批',
      workerNodeId: 'node-attention',
      updatedAt: '2026-06-01T09:00:00.000Z',
      attention: {
        unread: true,
        snoozed: false,
        snoozeWokenEarly: false,
        needsAttention: true,
        reasons: ['CI 失败', '等待审批'],
      },
    }),
    makeTask({
      id: 'task-read-attention',
      state: 'working',
      updatedAt: '2026-06-01T11:30:00.000Z',
      attention: {
        unread: false,
        snoozed: false,
        snoozeWokenEarly: false,
        needsAttention: true,
        reasons: ['已读'],
      },
    }),
    makeTask({
      id: 'task-settled-failed',
      state: 'failed',
      settledAt: '2026-06-01T11:40:00.000Z',
      updatedAt: '2026-06-01T11:40:00.000Z',
    }),
    makeTask({
      id: 'task-canceled',
      state: 'canceled',
      snoozedUntil: '2026-06-01T11:00:00.000Z',
      updatedAt: '2026-06-01T11:50:00.000Z',
    }),
  ];

  const btwThreads = [
    makeBtwThread({
      id: 'btw-pending',
      taskId: 'task-attention',
      status: 'pending_approval',
      updatedAt: '2026-06-01T11:40:00.000Z',
      mergeProposal: makeProposal({ summary: '合并探针修复', targetType: 'task_step', riskLevel: 'low' }),
    }),
    makeBtwThread({
      id: 'btw-awaiting',
      status: 'awaiting_approval',
      updatedAt: '2026-06-01T11:50:00.000Z',
      mergeProposal: null,
    }),
    makeBtwThread({
      id: 'btw-open-proposal',
      status: 'open',
      updatedAt: '2026-06-01T11:30:00.000Z',
      mergeProposal: makeProposal({ summary: '开放中的待批提案', status: 'pending' }),
    }),
    makeBtwThread({
      id: 'btw-approved',
      status: 'approved',
      updatedAt: '2026-06-01T11:55:00.000Z',
      mergeProposal: makeProposal({ status: 'approved' }),
    }),
    makeBtwThread({
      id: 'btw-open',
      status: 'open',
      updatedAt: '2026-06-01T11:25:00.000Z',
      mergeProposal: null,
    }),
  ];

  const queue = buildNeedsYouQueue(tasks, btwThreads, nowMs);
  assert.deepEqual(
    queue.map((item) => item.id),
    [
      'btw:btw-awaiting',
      'btw:btw-pending',
      'btw:btw-open-proposal',
      'snooze:task-snooze',
      'snooze:task-snooze-early',
      'failed:task-overlap',
      'failed:task-failed',
      'attention:task-attention',
    ],
  );
  assert.deepEqual(
    queue.map((item) => item.kind),
    [
      'btw_approval',
      'btw_approval',
      'btw_approval',
      'snooze_woken',
      'snooze_woken',
      'task_failed',
      'task_failed',
      'task_attention',
    ],
  );

  const pendingBtw = queue.find((item) => item.id === 'btw:btw-pending');
  assert.equal(pendingBtw?.taskId, 'task-attention');
  assert.equal(pendingBtw?.threadId, 'btw-pending');
  assert.equal(pendingBtw?.nodeId, 'node-attention');
  assert.equal(pendingBtw?.severity, 'warn');
  assert.match(pendingBtw?.title || '', /BTW 待审批/);
  assert.match(pendingBtw?.subtitle || '', /task_step/);
  assert.match(pendingBtw?.subtitle || '', /风险 low/);
  assert.match(pendingBtw?.subtitle || '', /合并探针修复/);

  const failed = queue.find((item) => item.id === 'failed:task-failed');
  assert.equal(failed?.severity, 'err');
  assert.match(failed?.subtitle || '', /build failed/);

  const snoozed = queue.find((item) => item.id === 'snooze:task-snooze');
  assert.equal(snoozed?.severity, 'info');
  assert.match(snoozed?.title || '', /已唤醒/);

  const attention = queue.find((item) => item.id === 'attention:task-attention');
  assert.equal(attention?.severity, 'warn');
  assert.match(attention?.subtitle || '', /CI 失败/);
  assert.match(attention?.subtitle || '', /等待审批/);

  assert.deepEqual(buildNeedsYouQueue([], [], nowMs), []);

  const mappedReasons = buildNeedsYouQueue(
    [
      makeTask({
        id: 'task-mapped-reasons',
        attention: {
          unread: true,
          snoozed: false,
          snoozeWokenEarly: false,
          needsAttention: true,
          reasons: ['unread_update', 'pending_btw'],
        },
      }),
    ],
    [],
    nowMs,
  );
  assert.equal(
    mappedReasons[0]?.subtitle,
    'Worker Agent · 有未读更新 · BTW 待审批',
  );
});

test('buildTaskIssueLinkIndex links issues, tasks, branches, and pull requests bidirectionally', () => {
  const task1 = makeTask({ id: 'task-1', worktreeBranch: 'feat/ops-101' });
  const task2 = makeTask({ id: 'task-2', worktreeBranch: 'feat/ops-102' });
  const task3 = makeTask({ id: 'task-3', worktreeBranch: 'feat/unrelated' });

  const issue1 = makeIssue({
    id: 'issue-1',
    identifier: 'OPS-101',
    linkedTaskId: 'task-1',
    worktreeBranch: 'feat/ops-101',
    github: { repo: 'acme/ops', prNumber: 42, branch: 'feat/ops-101' },
  });
  const issue2 = makeIssue({
    id: 'issue-2',
    identifier: 'OPS-102',
    worktreeBranch: 'feat/ops-102',
  });
  const issue3 = makeIssue({
    id: 'issue-3',
    identifier: 'OPS-103',
  });
  const issue4 = makeIssue({
    id: 'issue-4',
    identifier: 'OPS-104',
    github: { repo: 'acme/ops', issueNumber: 77 },
  });
  const issue5 = makeIssue({
    id: 'issue-5',
    identifier: 'OPS-105',
  });

  const pr42 = makePr({ number: 42, headRefName: 'feat/ops-101', title: 'Fix OPS-101' });
  const pr102 = makePr({
    number: 102,
    headRefName: 'feat/OPS-102-fix',
    title: 'Unrelated title',
    url: 'https://example.com/pr/102',
  });
  const pr103 = makePr({
    number: 103,
    headRefName: 'feat/unrelated',
    title: 'Ops work',
    linkedIssueIdentifier: 'OPS-103',
    url: 'https://example.com/pr/103',
  });
  const pr77 = makePr({
    number: 77,
    headRefName: 'feat/something',
    title: 'No identifier here',
    issueNumber: 77,
    url: 'https://example.com/pr/77',
  });
  const prOther = makePr({
    number: 9,
    headRefName: 'chore/cleanup',
    title: 'Cleanup',
    url: 'https://example.com/pr/9',
  });

  const index = buildTaskIssueLinkIndex(
    [issue1, issue2, issue3, issue4, issue5],
    [task1, task2, task3],
    [pr42, pr102, pr103, pr77, prOther],
  );

  assert.equal(index.taskByIssueId.get('issue-1')?.id, 'task-1');
  assert.equal(index.taskByIssueId.get('issue-2')?.id, 'task-2');
  assert.equal(index.taskByIssueId.has('issue-3'), false);
  assert.equal(index.taskByIssueId.has('issue-4'), false);
  assert.equal(index.taskByIssueId.has('issue-5'), false);

  assert.equal(index.issueByTaskId.get('task-1')?.id, 'issue-1');
  assert.equal(index.issueByTaskId.get('task-2')?.id, 'issue-2');
  assert.equal(index.issueByTaskId.has('task-3'), false);

  assert.equal(index.prByIssueId.get('issue-1')?.number, 42);
  assert.equal(index.prByIssueId.get('issue-2')?.number, 102);
  assert.equal(index.prByIssueId.get('issue-3')?.number, 103);
  assert.equal(index.prByIssueId.get('issue-4')?.number, 77);
  assert.equal(index.prByIssueId.has('issue-5'), false);

  assert.equal(index.prByBranch.get('feat/ops-101')?.number, 42);
  assert.equal(index.prByBranch.get('feat/OPS-102-fix')?.number, 102);
  assert.equal(index.prByBranch.get('chore/cleanup')?.number, 9);
  assert.equal(index.prByBranch.size, 5);

  const empty = buildTaskIssueLinkIndex([], [], []);
  assert.equal(empty.taskByIssueId.size, 0);
  assert.equal(empty.issueByTaskId.size, 0);
  assert.equal(empty.prByIssueId.size, 0);
  assert.equal(empty.prByBranch.size, 0);
});

test('clampContextRailWidth keeps the rail inside its persisted bounds', () => {
  assert.equal(CONTEXT_RAIL_MIN_WIDTH, 280);
  assert.equal(CONTEXT_RAIL_MAX_WIDTH, 560);
  assert.equal(CONTEXT_RAIL_DEFAULT_WIDTH, 360);
  assert.equal(clampContextRailWidth(100), 280);
  assert.equal(clampContextRailWidth(900), 560);
  assert.equal(clampContextRailWidth(360.4), 360.4);
  assert.equal(clampContextRailWidth(280), 280);
  assert.equal(clampContextRailWidth(560), 560);
  assert.equal(clampContextRailWidth(Number.NaN), 360);
  assert.equal(clampContextRailWidth(Number.POSITIVE_INFINITY), 360);
  assert.equal(clampContextRailWidth(Number.NEGATIVE_INFINITY), 360);
});
