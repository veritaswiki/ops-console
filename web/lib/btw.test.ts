import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BTW_MERGE_TARGET_OPTIONS,
  BTW_STATUS_META,
  canExecuteBtwMerge,
  canProposeBtwMerge,
  canReviewBtwMerge,
  countBtwAttention,
  defaultProposalSummary,
  filterBtwThreads,
  getBtwStatusMeta,
} from './btw';
import type {
  A2ABtwMergeProposal,
  A2ABtwMessage,
  A2ABtwStatus,
  A2ABtwThread,
} from '../types';

function makeMessage(overrides: Partial<A2ABtwMessage> = {}): A2ABtwMessage {
  return {
    id: overrides.id || 'msg-1',
    ts: overrides.ts || '2026-11-27T01:00:00Z',
    role: overrides.role || 'assistant',
    content: overrides.content ?? '旁支结论',
    agentId: overrides.agentId ?? 'a2a-hub-codex',
    agentName: overrides.agentName ?? 'Codex CLI',
    model: overrides.model ?? 'gpt-5.6-codex',
  };
}

function makeProposal(overrides: Partial<A2ABtwMergeProposal> = {}): A2ABtwMergeProposal {
  return {
    id: overrides.id || 'proposal-1',
    proposedAt: overrides.proposedAt || '2026-11-27T02:00:00Z',
    proposedBy: overrides.proposedBy || 'Codex CLI',
    summary: overrides.summary || '补齐探针重启校验',
    rationale: overrides.rationale || '旁支已验证重启顺序与回滚路径',
    targetType: overrides.targetType || 'task_step',
    targetSessionId: overrides.targetSessionId ?? 'session-alpha',
    targetTaskId: overrides.targetTaskId ?? 'task-alpha',
    targetBranch: overrides.targetBranch ?? null,
    patchPreview: overrides.patchPreview ?? 'diff --git a/probe/ops-probe.mjs b/probe/ops-probe.mjs',
    prDraftSpec: overrides.prDraftSpec ?? null,
    riskLevel: overrides.riskLevel || 'low',
    status: overrides.status || 'pending',
    reviewedAt: overrides.reviewedAt ?? null,
    reviewedBy: overrides.reviewedBy ?? null,
    reviewComment: overrides.reviewComment ?? null,
    mergedAt: overrides.mergedAt ?? null,
    mergedRevision: overrides.mergedRevision ?? null,
    mergedStepTs: overrides.mergedStepTs ?? null,
    spillRefId: overrides.spillRefId ?? null,
  };
}

function makeThread(overrides: Partial<A2ABtwThread> = {}): A2ABtwThread {
  return {
    id: overrides.id || 'btw-1',
    sessionId: overrides.sessionId ?? 'session-alpha',
    taskId: overrides.taskId ?? 'task-alpha',
    contextId: overrides.contextId || 'ctx-alpha',
    title: overrides.title || '旁支排查',
    mode: overrides.mode || 'btw',
    status: overrides.status || 'open',
    isolation: overrides.isolation || 'ephemeral',
    worktreeBranch: overrides.worktreeBranch ?? null,
    forkedTaskId: overrides.forkedTaskId ?? null,
    targetAgentId: overrides.targetAgentId || 'a2a-hub-codex',
    targetAgentName: overrides.targetAgentName || 'Codex CLI',
    model: overrides.model || 'gpt-5.6-codex',
    mainlineRevisionAtOpen: overrides.mainlineRevisionAtOpen ?? 12,
    messages: overrides.messages || [],
    mergeProposal: overrides.mergeProposal ?? null,
    createdAt: overrides.createdAt || '2026-11-27T00:00:00Z',
    updatedAt: overrides.updatedAt || '2026-11-27T01:00:00Z',
    createdBy: overrides.createdBy || 'operator',
  };
}

test('BTW_STATUS_META covers all six statuses with concise Chinese labels and valid tones', () => {
  assert.deepEqual(Object.keys(BTW_STATUS_META), [
    'open',
    'pending_approval',
    'approved',
    'merged',
    'rejected',
    'archived',
  ]);
  const expectedLabels: Record<A2ABtwStatus, string> = {
    open: '进行中',
    pending_approval: '待审批',
    approved: '已批准待并入',
    merged: '已并入主线',
    rejected: '已驳回',
    archived: '已归档',
  };
  const allowedTones = ['neutral', 'warn', 'accent', 'ok', 'err', 'muted'];
  for (const status of Object.keys(BTW_STATUS_META) as A2ABtwStatus[]) {
    const meta = BTW_STATUS_META[status];
    assert.equal(meta.label, expectedLabels[status]);
    assert.ok(allowedTones.includes(meta.tone));
    assert.ok(meta.description.length > 0);
  }
  assert.notEqual(BTW_STATUS_META.open.tone, BTW_STATUS_META.archived.tone);
  assert.notEqual(BTW_STATUS_META.pending_approval.tone, BTW_STATUS_META.approved.tone);
});

test('getBtwStatusMeta resolves known statuses and falls back to open for unknown input', () => {
  assert.equal(getBtwStatusMeta('pending_approval').label, '待审批');
  assert.equal(getBtwStatusMeta(' MERGED ').label, '已并入主线');
  assert.equal(getBtwStatusMeta(undefined), BTW_STATUS_META.open);
  assert.equal(getBtwStatusMeta(null), BTW_STATUS_META.open);
  assert.equal(getBtwStatusMeta(''), BTW_STATUS_META.open);
  assert.equal(getBtwStatusMeta('future_state'), BTW_STATUS_META.open);
});

test('BTW_MERGE_TARGET_OPTIONS exposes the three merge targets in contract order', () => {
  assert.deepEqual(
    BTW_MERGE_TARGET_OPTIONS.map((option) => option.id),
    ['session_context', 'task_step', 'pr_draft'],
  );
  for (const option of BTW_MERGE_TARGET_OPTIONS) {
    assert.ok(option.label.length > 0);
    assert.ok(option.hint.length > 0);
  }
});

test('filterBtwThreads sorts pending approval and approved first, then newest updatedAt', () => {
  const threads = [
    makeThread({ id: 'btw-pending-old', status: 'pending_approval', updatedAt: '2026-11-27T01:00:00Z' }),
    makeThread({ id: 'btw-approved', status: 'approved', updatedAt: '2026-11-27T03:00:00Z' }),
    makeThread({ id: 'btw-open-newest', status: 'open', updatedAt: '2026-11-27T05:00:00Z' }),
    makeThread({ id: 'btw-merged', status: 'merged', updatedAt: '2026-11-27T04:00:00Z' }),
    makeThread({ id: 'btw-rejected', status: 'rejected', updatedAt: '2026-11-27T02:00:00Z' }),
  ];

  assert.deepEqual(
    filterBtwThreads(threads).map((thread) => thread.id),
    ['btw-pending-old', 'btw-approved', 'btw-open-newest', 'btw-merged', 'btw-rejected'],
  );
  assert.deepEqual(
    threads.map((thread) => thread.id),
    ['btw-pending-old', 'btw-approved', 'btw-open-newest', 'btw-merged', 'btw-rejected'],
  );
});

test('filterBtwThreads matches sessionId and taskId scopes exactly', () => {
  const threads = [
    makeThread({ id: 'btw-a1', sessionId: 'session-alpha', taskId: 'task-alpha', status: 'open' }),
    makeThread({ id: 'btw-a2', sessionId: 'session-alpha', taskId: 'task-beta', status: 'approved' }),
    makeThread({ id: 'btw-b1', sessionId: 'session-beta', taskId: 'task-alpha', status: 'pending_approval' }),
    makeThread({ id: 'btw-b2', sessionId: 'session-beta', taskId: 'task-beta', status: 'merged' }),
  ];

  assert.deepEqual(
    filterBtwThreads(threads, { sessionId: 'session-alpha' }).map((thread) => thread.id),
    ['btw-a2', 'btw-a1'],
  );
  assert.deepEqual(
    filterBtwThreads(threads, { taskId: 'task-alpha' }).map((thread) => thread.id),
    ['btw-b1', 'btw-a1'],
  );
  assert.deepEqual(
    filterBtwThreads(threads, { sessionId: 'session-alpha', taskId: 'task-beta' }).map(
      (thread) => thread.id,
    ),
    ['btw-a2'],
  );
  assert.deepEqual(
    filterBtwThreads(threads, { sessionId: 'session-missing' }),
    [],
  );
  assert.equal(filterBtwThreads(threads, { sessionId: null, taskId: '' }).length, 4);
});

test('filterBtwThreads filters by status, treats all as no filter, and supports onlyAttention', () => {
  const threads = [
    makeThread({ id: 'btw-open', status: 'open' }),
    makeThread({ id: 'btw-pending', status: 'pending_approval' }),
    makeThread({ id: 'btw-approved', status: 'approved' }),
    makeThread({ id: 'btw-merged', status: 'merged' }),
    makeThread({ id: 'btw-rejected', status: 'rejected' }),
    makeThread({ id: 'btw-archived', status: 'archived' }),
  ];

  assert.deepEqual(
    filterBtwThreads(threads, { status: 'approved' }).map((thread) => thread.id),
    ['btw-approved'],
  );
  assert.equal(filterBtwThreads(threads, { status: 'all' }).length, 6);
  assert.deepEqual(filterBtwThreads(threads, { status: 'ARCHIVED' }).map((thread) => thread.id), [
    'btw-archived',
  ]);
  assert.deepEqual(filterBtwThreads(threads, { status: 'unknown_state' }), []);
  assert.deepEqual(
    filterBtwThreads(threads, { onlyAttention: true }).map((thread) => thread.id),
    ['btw-pending', 'btw-approved'],
  );
  assert.deepEqual(
    filterBtwThreads(threads, { onlyAttention: true, status: 'merged' }),
    [],
  );
});

test('filterBtwThreads searches title, agent, scope ids, proposal, and message content', () => {
  const threads = [
    makeThread({
      id: 'btw-timeout',
      title: '核对网关超时',
      targetAgentName: 'Codex CLI',
      updatedAt: '2026-11-27T02:00:00Z',
    }),
    makeThread({
      id: 'btw-probe',
      title: '探针重启顺序',
      targetAgentName: 'Claude Code',
      status: 'approved',
      updatedAt: '2026-11-27T01:00:00Z',
      mergeProposal: makeProposal({ summary: '补齐探针重启校验' }),
    }),
    makeThread({
      id: 'btw-log',
      title: '日志脱敏',
      sessionId: 'session-beta',
      taskId: 'task-beta',
      status: 'rejected',
      updatedAt: '2026-11-27T03:00:00Z',
      messages: [makeMessage({ role: 'user', content: '驳回原因：风险过高' })],
    }),
  ];

  assert.deepEqual(
    filterBtwThreads(threads, { query: ' 日志脱敏 ' }).map((thread) => thread.id),
    ['btw-log'],
  );
  assert.deepEqual(
    filterBtwThreads(threads, { query: 'claude' }).map((thread) => thread.id),
    ['btw-probe'],
  );
  assert.deepEqual(
    filterBtwThreads(threads, { query: 'session-beta' }).map((thread) => thread.id),
    ['btw-log'],
  );
  assert.deepEqual(
    filterBtwThreads(threads, { query: '补齐探针' }).map((thread) => thread.id),
    ['btw-probe'],
  );
  assert.deepEqual(
    filterBtwThreads(threads, { query: '驳回原因' }).map((thread) => thread.id),
    ['btw-log'],
  );
  assert.deepEqual(filterBtwThreads(threads, { query: '不存在的关键字' }), []);
});

test('countBtwAttention counts statuses and scopes attention to session or task', () => {
  const threads = [
    makeThread({ id: 'btw-1', sessionId: 'session-alpha', taskId: 'task-alpha', status: 'open' }),
    makeThread({ id: 'btw-2', sessionId: 'session-alpha', taskId: 'task-alpha', status: 'pending_approval' }),
    makeThread({ id: 'btw-3', sessionId: 'session-alpha', taskId: 'task-beta', status: 'approved' }),
    makeThread({ id: 'btw-4', sessionId: 'session-alpha', taskId: 'task-beta', status: 'merged' }),
    makeThread({ id: 'btw-5', sessionId: 'session-beta', taskId: 'task-alpha', status: 'open' }),
    makeThread({ id: 'btw-6', sessionId: 'session-beta', taskId: 'task-alpha', status: 'rejected' }),
    makeThread({ id: 'btw-7', sessionId: 'session-beta', taskId: 'task-beta', status: 'archived' }),
    makeThread({ id: 'btw-8', sessionId: 'session-beta', taskId: 'task-beta', status: 'pending_approval' }),
  ];

  assert.deepEqual(countBtwAttention(threads), {
    total: 8,
    open: 2,
    pendingApproval: 2,
    approved: 1,
    merged: 1,
    attentionCount: 3,
  });
  assert.deepEqual(countBtwAttention(threads, { sessionId: 'session-alpha' }), {
    total: 4,
    open: 1,
    pendingApproval: 1,
    approved: 1,
    merged: 1,
    attentionCount: 2,
  });
  assert.deepEqual(countBtwAttention(threads, { taskId: 'task-beta' }), {
    total: 4,
    open: 0,
    pendingApproval: 1,
    approved: 1,
    merged: 1,
    attentionCount: 2,
  });
  assert.deepEqual(countBtwAttention(threads, { sessionId: 'session-alpha', taskId: 'task-alpha' }), {
    total: 2,
    open: 1,
    pendingApproval: 1,
    approved: 0,
    merged: 0,
    attentionCount: 1,
  });
  assert.deepEqual(countBtwAttention([], {}), {
    total: 0,
    open: 0,
    pendingApproval: 0,
    approved: 0,
    merged: 0,
    attentionCount: 0,
  });
});

test('canProposeBtwMerge requires an open or rejected thread with at least one message', () => {
  assert.equal(canProposeBtwMerge(makeThread({ status: 'open', messages: [makeMessage()] })), true);
  assert.equal(
    canProposeBtwMerge(
      makeThread({ status: 'rejected', messages: [makeMessage({ role: 'user', content: '补充依据' })] }),
    ),
    true,
  );
  assert.equal(canProposeBtwMerge(makeThread({ status: 'open', messages: [] })), false);
  assert.equal(canProposeBtwMerge(makeThread({ status: 'pending_approval', messages: [makeMessage()] })), false);
  assert.equal(canProposeBtwMerge(makeThread({ status: 'approved', messages: [makeMessage()] })), false);
  assert.equal(canProposeBtwMerge(makeThread({ status: 'merged', messages: [makeMessage()] })), false);
  assert.equal(canProposeBtwMerge(null), false);
  assert.equal(canProposeBtwMerge(undefined), false);
});

test('canReviewBtwMerge requires pending approval with a merge proposal', () => {
  assert.equal(
    canReviewBtwMerge(makeThread({ status: 'pending_approval', mergeProposal: makeProposal() })),
    true,
  );
  assert.equal(canReviewBtwMerge(makeThread({ status: 'pending_approval', mergeProposal: null })), false);
  assert.equal(canReviewBtwMerge(makeThread({ status: 'approved', mergeProposal: makeProposal() })), false);
  assert.equal(canReviewBtwMerge(makeThread({ status: 'open', mergeProposal: makeProposal() })), false);
  assert.equal(canReviewBtwMerge(null), false);
});

test('canExecuteBtwMerge requires approved status with a merge proposal', () => {
  assert.equal(
    canExecuteBtwMerge(makeThread({ status: 'approved', mergeProposal: makeProposal() })),
    true,
  );
  assert.equal(canExecuteBtwMerge(makeThread({ status: 'approved', mergeProposal: null })), false);
  assert.equal(
    canExecuteBtwMerge(makeThread({ status: 'pending_approval', mergeProposal: makeProposal() })),
    false,
  );
  assert.equal(canExecuteBtwMerge(makeThread({ status: 'merged', mergeProposal: makeProposal() })), false);
  assert.equal(canExecuteBtwMerge(undefined), false);
});

test('defaultProposalSummary uses the latest assistant reply and strips markdown', () => {
  const thread = makeThread({
    title: '备用标题',
    messages: [
      makeMessage({ id: 'msg-1', role: 'assistant', content: '第一版结论：先检查配置。' }),
      makeMessage({ id: 'msg-2', role: 'user', content: '再确认一下重启顺序' }),
      makeMessage({
        id: 'msg-3',
        role: 'assistant',
        content:
          '## 最终结论\n\n- **重启** 探针前先 [`校验`](https://example.com) 配置\n- 再执行回滚演练\n\n```bash\nnpm test\n```',
      }),
    ],
  });

  assert.equal(defaultProposalSummary(thread), '最终结论 重启 探针前先 校验 配置 再执行回滚演练');
});

test('defaultProposalSummary skips empty assistant replies and falls back to a clean title', () => {
  const withEmptyLatest = makeThread({
    messages: [
      makeMessage({ id: 'msg-1', role: 'assistant', content: '有效结论：先灰度。' }),
      makeMessage({ id: 'msg-2', role: 'assistant', content: '   ' }),
    ],
  });
  assert.equal(defaultProposalSummary(withEmptyLatest), '有效结论：先灰度。');

  const titleOnly = makeThread({
    title: '  旁支：**探针** 排查  ',
    messages: [makeMessage({ role: 'user', content: '只有用户提问' })],
  });
  assert.equal(defaultProposalSummary(titleOnly), '旁支：探针 排查');
  assert.equal(defaultProposalSummary(null), '');
  assert.equal(defaultProposalSummary(makeThread({ title: '   ', messages: [] })), '');
});

test('defaultProposalSummary truncates to 160 characters with a trailing ellipsis', () => {
  const longReply = '结'.repeat(200);
  const summary = defaultProposalSummary(
    makeThread({ messages: [makeMessage({ role: 'assistant', content: longReply })] }),
  );
  assert.equal(Array.from(summary).length, 160);
  assert.equal(summary, `${'结'.repeat(159)}…`);

  const exactReply = '短'.repeat(160);
  const exactSummary = defaultProposalSummary(
    makeThread({ messages: [makeMessage({ role: 'assistant', content: exactReply })] }),
  );
  assert.equal(exactSummary, exactReply);
  assert.equal(Array.from(exactSummary).length, 160);
});
