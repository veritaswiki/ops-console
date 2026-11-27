import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildBtwMergePatchPreview,
  buildBtwReply,
  canTransitionBtwStatus,
  classifyBtwMergeRisk,
  normalizeBtwThread,
  summarizeBtwStats,
} from '../src/a2a-btw.mjs';
import { A2AOrchestrator } from '../src/a2a-orchestrator.mjs';
import { loadConfig } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';

async function startTestServer(overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-a2a-btw-'));
  const config = loadConfig({
    rawConfig: {
      console: { dataDir },
      security: {
        requireCriticalConfirm: overrides.requireCriticalConfirm ?? true,
        mutatingRateLimitPerMinute: 600,
        rateLimitPerMinute: 1200,
      },
    },
    cli: {
      demo: overrides.demo ?? true,
      readOnly: Boolean(overrides.readOnly),
      hosts: '127.0.0.1',
      webKey: '',
    },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  return {
    app,
    config,
    dataDir,
    baseUrl: addresses[0].url,
    cleanup: async () => {
      await app.stop();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

async function postJson(baseUrl, pathname, payload) {
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };
  if (payload !== undefined) {
    init.body = JSON.stringify(payload);
  }
  const res = await fetch(`${baseUrl}${pathname}`, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function createMainline(baseUrl, label) {
  const createdSession = await postJson(baseUrl, '/api/a2a/sessions', {
    title: `${label} 主会话`,
    primaryAgentId: 'a2a-hub-codex-lead',
    syncMode: 'a2a-context-bus',
  });
  assert.equal(createdSession.status, 201, `create session failed: ${JSON.stringify(createdSession.body)}`);
  const sessionId = createdSession.body.session.id;

  const createdTask = await postJson(baseUrl, '/api/a2a/tasks', {
    prompt: `${label} 主线任务：验证旁支不会中断主线程`,
    sessionId,
    targetAgentId: 'a2a-mac-pi',
  });
  assert.equal(createdTask.status, 201, `create task failed: ${JSON.stringify(createdTask.body)}`);
  return { sessionId, taskId: createdTask.body.task.id };
}

async function readMainlineState(baseUrl, { sessionId, taskId }) {
  const result = await getJson(baseUrl, '/api/a2a/state');
  assert.equal(result.status, 200);
  const session = result.body.sessions.find((item) => item.id === sessionId);
  const task = result.body.tasks.find((item) => item.id === taskId);
  return { state: result.body, session, task };
}

test('BTW status transitions, risk grading, and summary counters are deterministic', () => {
  const legalTransitions = [
    ['open', 'pending_approval'],
    ['open', 'archived'],
    ['pending_approval', 'approved'],
    ['pending_approval', 'rejected'],
    ['pending_approval', 'open'],
    ['pending_approval', 'archived'],
    ['approved', 'merged'],
    ['approved', 'rejected'],
    ['approved', 'archived'],
    ['rejected', 'open'],
    ['rejected', 'pending_approval'],
    ['rejected', 'archived'],
    ['archived', 'open'],
  ];
  for (const [from, to] of legalTransitions) {
    assert.equal(canTransitionBtwStatus(from, to), true, `${from} -> ${to} should be allowed`);
  }

  const illegalTransitions = [
    ['open', 'approved'],
    ['open', 'merged'],
    ['pending_approval', 'merged'],
    ['approved', 'open'],
    ['rejected', 'approved'],
    ['archived', 'merged'],
    ['merged', 'open'],
    ['merged', 'archived'],
    ['unknown', 'open'],
    ['', 'open'],
    ['open', 'unknown'],
  ];
  for (const [from, to] of illegalTransitions) {
    assert.equal(canTransitionBtwStatus(from, to), false, `${from} -> ${to} should be rejected`);
  }

  assert.equal(classifyBtwMergeRisk({
    targetType: 'session_context',
    thread: { mode: 'btw', isolation: 'ephemeral' },
    summary: '补充只读探针检查项',
    rationale: '旁支验证完成，仅补充上下文',
  }), 'low');

  assert.equal(classifyBtwMergeRisk({
    targetType: 'pr_draft',
    thread: { mode: 'btw', isolation: 'ephemeral' },
    summary: '整理发布说明草案',
    rationale: '仅生成 PR 草案',
  }), 'medium');

  assert.equal(classifyBtwMergeRisk({
    targetType: 'session_context',
    thread: { mode: 'fork', isolation: 'worktree' },
    summary: '整理发布说明草案',
    rationale: '独立 worktree 验证完成后回传',
  }), 'medium');

  assert.equal(classifyBtwMergeRisk({
    targetType: 'session_context',
    thread: { mode: 'btw' },
    summary: '轮换 auth token',
    rationale: '只读核对',
  }), 'high');

  assert.equal(classifyBtwMergeRisk({
    targetType: 'pr_draft',
    thread: { mode: 'fork' },
    summary: '调整 production 部署',
    rationale: 'server.mjs 边界检查',
  }), 'high');

  assert.equal(classifyBtwMergeRisk({
    targetType: 'session_context',
    thread: { isolation: 'worktree' },
    summary: '整理发布说明',
    rationale: '常规检查',
  }), 'medium');

  const stats = summarizeBtwStats([
    { status: 'open' },
    { status: 'pending_approval' },
    { status: 'approved' },
    { status: 'merged' },
    { status: 'rejected' },
    { status: 'archived' },
    { status: 'unknown' },
  ]);
  assert.deepEqual(stats, {
    total: 7,
    open: 1,
    pendingApproval: 1,
    approved: 1,
    merged: 1,
    rejected: 1,
    archived: 1,
    attentionCount: 2,
  });
});

test('BTW text helpers redact secrets, truncate oversized fields, and build PR draft specs', () => {
  const fakeBearer = 'Bearer unit-test-token-abcdefghijklmnop';
  const fakeApiKey = ['sk', 'test', 'unit', 'placeholder', '1234567890'].join('-');
  const reply = buildBtwReply({
    prompt: `请检查 ${fakeBearer} 与 ${fakeApiKey} 是否已脱敏`,
    session: { revision: 4, gitBranch: 'a2a/example-mainline' },
    mode: 'btw',
    turnCount: 2,
  });
  assert.ok(reply.includes('Bearer [REDACTED]'));
  assert.ok(!reply.includes('unit-test-token-abcdefghijklmnop'));
  assert.ok(reply.includes('[REDACTED_API_KEY]'));
  assert.ok(!reply.includes(fakeApiKey));
  assert.ok(reply.includes('旁支轮次：2 轮'));
  assert.ok(reply.includes('rev.4'));

  const longReply = buildBtwReply({ prompt: 'x'.repeat(600), turnCount: 1 });
  assert.ok(longReply.includes('x'.repeat(400)));
  assert.ok(!longReply.includes('x'.repeat(401)));

  const normalized = normalizeBtwThread({
    id: 'btw-normalize-test',
    status: 'not-a-status',
    mode: 'not-a-mode',
    title: 'T'.repeat(180),
    messages: [
      { role: 'user', content: 'q'.repeat(2500) },
      { role: 'hacker', content: fakeBearer, ts: 'not-a-date' },
    ],
  });
  assert.ok(normalized);
  assert.equal(normalized.status, 'open');
  assert.equal(normalized.mode, 'btw');
  assert.equal(normalized.isolation, 'ephemeral');
  assert.equal(normalized.title.length, 120);
  assert.equal(normalized.messages.length, 2);
  assert.equal(normalized.messages[0].role, 'user');
  assert.equal(normalized.messages[0].content.length, 2000);
  assert.equal(normalized.messages[1].role, 'assistant');
  assert.ok(normalized.messages[1].content.includes('Bearer [REDACTED]'));
  assert.equal(normalizeBtwThread(null), null);
  assert.equal(normalizeBtwThread({ title: 'missing id' }), null);

  const longSummary = 'S'.repeat(500);
  const preview = buildBtwMergePatchPreview({
    thread: { id: 'btw-preview-1', messages: [{}, {}], worktreeBranch: null },
    session: { gitBranch: 'a2a/example-mainline', revision: 7 },
    targetType: 'pr_draft',
    summary: longSummary,
    rationale: 'R'.repeat(1500),
  });
  assert.ok(preview.patchPreview.length <= 2400);
  assert.ok(preview.patchPreview.includes(`summary: ${'S'.repeat(400)}`));
  assert.ok(!preview.patchPreview.includes('S'.repeat(401)));
  assert.ok(preview.prDraftSpec);
  assert.equal(preview.prDraftSpec.branch, 'btw/btw-preview-1');
  assert.equal(preview.prDraftSpec.baseBranch, 'a2a/example-mainline');
  assert.ok(preview.prDraftSpec.title.startsWith('btw: '));
  assert.ok(preview.prDraftSpec.title.length <= 77);
  assert.ok(preview.prDraftSpec.body.includes('```diff'));
  assert.ok(preview.prDraftSpec.body.includes('未写入主线'));

  const forkPreview = buildBtwMergePatchPreview({
    thread: { id: 'btw-preview-2', messages: [], worktreeBranch: 'side/a2a-task-example' },
    session: { gitBranch: 'main', revision: 2 },
    targetType: 'pr_draft',
    summary: '整理旁支结论',
    rationale: '仅生成草案',
  });
  assert.equal(forkPreview.prDraftSpec.branch, 'side/a2a-task-example');
  assert.equal(forkPreview.prDraftSpec.baseBranch, 'main');

  const redactedPreview = buildBtwMergePatchPreview({
    thread: { id: 'btw-preview-3', messages: [] },
    targetType: 'pr_draft',
    summary: `轮换 ${fakeApiKey}`,
    rationale: '仅生成草案',
  });
  assert.ok(redactedPreview.patchPreview.includes('[REDACTED_API_KEY]'));
  assert.ok(!redactedPreview.patchPreview.includes(fakeApiKey));
});

test('BTW HTTP approval loop keeps mainline untouched and merges only with a single-use confirm token', async () => {
  const ctx = await startTestServer({ requireCriticalConfirm: true });
  try {
    assert.equal(ctx.config.security.requireCriticalConfirm, true);
    const { sessionId, taskId } = await createMainline(ctx.baseUrl, 'BTW 审批闭环');
    const baseline = await readMainlineState(ctx.baseUrl, { sessionId, taskId });
    assert.ok(baseline.session);
    assert.ok(baseline.task);
    const revisionBefore = baseline.session.revision;
    const stepsBefore = baseline.task.steps.length;
    assert.ok(revisionBefore >= 1);
    assert.ok(stepsBefore >= 1);

    const opened = await postJson(ctx.baseUrl, '/api/a2a/btw', {
      sessionId,
      taskId,
      prompt: '主线程保持运行，旁支先确认发布前只读探针检查项',
      title: '发布前只读探针旁支',
    });
    assert.equal(opened.status, 201);
    const threadId = opened.body.thread.id;
    assert.equal(opened.body.thread.status, 'open');
    assert.equal(opened.body.thread.mode, 'btw');
    assert.equal(opened.body.thread.mainlineRevisionAtOpen, revisionBefore);
    assert.equal(opened.body.thread.messages.length, 2);

    const afterOpen = await readMainlineState(ctx.baseUrl, { sessionId, taskId });
    assert.equal(afterOpen.session.revision, revisionBefore, 'opening BTW must not bump session revision');
    assert.equal(afterOpen.task.steps.length, stepsBefore, 'opening BTW must not append mainline steps');

    const followedUp = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/messages`, {
      prompt: '补充探针心跳、服务健康与部署版本一致性检查',
    });
    assert.equal(followedUp.status, 200);
    assert.equal(followedUp.body.thread.messages.length, opened.body.thread.messages.length + 2);
    assert.equal(followedUp.body.thread.status, 'open');

    const proposed = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/propose-merge`, {
      summary: '将旁支确认的只读检查清单并入主会话上下文',
      rationale: '旁支只读验证完成，仅补充上下文',
      targetType: 'session_context',
    });
    assert.equal(proposed.status, 200);
    assert.equal(proposed.body.thread.status, 'pending_approval');
    assert.equal(proposed.body.thread.mergeProposal.targetType, 'session_context');
    assert.equal(proposed.body.thread.mergeProposal.riskLevel, 'low');
    assert.ok(proposed.body.thread.mergeProposal.patchPreview.includes('未写入主线'));
    const rejectedProposalId = proposed.body.thread.mergeProposal.id;

    const rejected = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/review`, {
      decision: 'reject',
      comment: '请补充部署版本一致性检查',
    });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.thread.status, 'rejected');
    assert.equal(rejected.body.thread.mergeProposal.status, 'rejected');
    assert.equal(rejected.body.thread.mergeProposal.reviewComment, '请补充部署版本一致性检查');

    const reopened = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/messages`, {
      prompt: '已补充部署版本一致性检查，请再次审阅',
    });
    assert.equal(reopened.status, 200);
    assert.equal(reopened.body.thread.status, 'open');
    assert.ok(reopened.body.thread.messages.length > followedUp.body.thread.messages.length);

    const reproposed = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/propose-merge`, {
      summary: '将补充后的只读检查清单并入主会话上下文',
      rationale: '旁支只读验证完成，仅补充上下文',
      targetType: 'session_context',
    });
    assert.equal(reproposed.status, 200);
    assert.equal(reproposed.body.thread.status, 'pending_approval');
    assert.notEqual(reproposed.body.thread.mergeProposal.id, rejectedProposalId);

    const approved = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/review`, {
      decision: 'approve',
      comment: '同意并入只读上下文',
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.thread.status, 'approved');
    assert.equal(approved.body.thread.mergeProposal.status, 'approved');

    const missingToken = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/merge`, {});
    assert.equal(missingToken.status, 409);
    assert.equal(missingToken.body.requiresConfirm, true);
    assert.match(missingToken.body.error, /confirmToken/);

    const confirm = await postJson(ctx.baseUrl, '/api/a2a/btw/confirm', {
      threadId,
      action: 'merge',
    });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.body.threadId, threadId);
    assert.equal(confirm.body.action, 'merge');
    assert.equal(confirm.body.expiresInSec, 120);
    assert.match(confirm.body.confirmToken, /^[a-f0-9]{36}$/);

    const merged = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/merge`, {
      confirmToken: confirm.body.confirmToken,
    });
    assert.equal(merged.status, 200);
    assert.equal(merged.body.thread.status, 'merged');
    assert.equal(merged.body.thread.mergeProposal.status, 'merged');
    assert.ok(merged.body.thread.mergeProposal.spillRefId.startsWith('spill-btw-'));
    assert.equal(merged.body.thread.mergeProposal.spillRefId, merged.body.spillNode.spillId);
    assert.equal(merged.body.spillNode.state, 'spilled');
    assert.ok(merged.body.spillNode.bytes > 0);
    assert.equal(merged.body.session.id, sessionId);

    const finalState = await readMainlineState(ctx.baseUrl, { sessionId, taskId });
    assert.equal(finalState.session.revision, revisionBefore + 1);
    assert.ok(finalState.session.mergedBtwIds.includes(threadId));
    const mergedThread = finalState.state.btwThreads.find((item) => item.id === threadId);
    assert.ok(mergedThread);
    assert.equal(mergedThread.status, 'merged');
    assert.equal(mergedThread.mergeProposal.spillRefId, merged.body.spillNode.spillId);
    assert.ok(finalState.state.contextSpillNodes.some((node) => node.spillId === merged.body.spillNode.spillId));

    const repeatedMerge = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadId}/merge`, {
      confirmToken: confirm.body.confirmToken,
    });
    assert.equal(repeatedMerge.status, 409);
    assert.equal(repeatedMerge.body.ok, false);
    assert.match(repeatedMerge.body.error, /must be approved/);
  } finally {
    await ctx.cleanup();
  }
});

test('BTW fork, task_step, and pr_draft modes isolate or merge with target-specific artifacts', async () => {
  const ctx = await startTestServer();
  try {
    const forkMainline = await createMainline(ctx.baseUrl, 'BTW fork 模式');
    const forkBaseline = await readMainlineState(ctx.baseUrl, forkMainline);
    const forked = await postJson(ctx.baseUrl, '/api/a2a/btw', {
      sessionId: forkMainline.sessionId,
      taskId: forkMainline.taskId,
      mode: 'fork',
      prompt: '在独立 worktree 验证迁移脚本与回滚路径',
      title: '迁移脚本隔离旁支',
    });
    assert.equal(forked.status, 201);
    assert.equal(forked.body.thread.mode, 'fork');
    assert.equal(forked.body.thread.isolation, 'worktree');
    assert.ok(forked.body.thread.forkedTaskId);
    assert.match(forked.body.thread.worktreeBranch, /^side\//);
    assert.equal(forked.body.forkedTask.isSideThread, true);
    assert.equal(forked.body.forkedTask.worktreeBranch, forked.body.thread.worktreeBranch);
    assert.equal(forked.body.forkedTask.parentTaskId, forkMainline.taskId);

    const forkAfter = await readMainlineState(ctx.baseUrl, forkMainline);
    assert.equal(forkAfter.session.revision, forkBaseline.session.revision);
    assert.equal(forkAfter.task.steps.length, forkBaseline.task.steps.length);
    const sideTask = forkAfter.state.tasks.find((item) => item.id === forked.body.thread.forkedTaskId);
    assert.ok(sideTask);
    assert.equal(sideTask.isSideThread, true);

    const stepMainline = await createMainline(ctx.baseUrl, 'BTW task_step 模式');
    const stepBaseline = await readMainlineState(ctx.baseUrl, stepMainline);
    const stepOpened = await postJson(ctx.baseUrl, '/api/a2a/btw', {
      sessionId: stepMainline.sessionId,
      taskId: stepMainline.taskId,
      prompt: '验证旁支结论可作为目标任务的补充步骤',
      title: '任务步骤旁支',
    });
    assert.equal(stepOpened.status, 201);
    const stepProposed = await postJson(ctx.baseUrl, `/api/a2a/btw/${stepOpened.body.thread.id}/propose-merge`, {
      summary: '将旁支只读验证步骤追加到主任务轨迹',
      rationale: '仅追加步骤，不修改主线任务状态',
      targetType: 'task_step',
    });
    assert.equal(stepProposed.status, 200);
    assert.equal(stepProposed.body.thread.mergeProposal.targetType, 'task_step');
    assert.equal(stepProposed.body.thread.mergeProposal.riskLevel, 'low');
    await postJson(ctx.baseUrl, `/api/a2a/btw/${stepOpened.body.thread.id}/review`, { decision: 'approve' });
    const stepConfirm = await postJson(ctx.baseUrl, '/api/a2a/btw/confirm', {
      threadId: stepOpened.body.thread.id,
      action: 'merge',
    });
    const stepMerged = await postJson(ctx.baseUrl, `/api/a2a/btw/${stepOpened.body.thread.id}/merge`, {
      confirmToken: stepConfirm.body.confirmToken,
    });
    assert.equal(stepMerged.status, 200);
    assert.equal(stepMerged.body.thread.status, 'merged');
    assert.equal(stepMerged.body.task.id, stepMainline.taskId);
    assert.equal(stepMerged.body.task.steps.length, stepBaseline.task.steps.length + 1);
    assert.equal(stepMerged.body.task.steps.at(-1).phase, 'btw-merge');
    assert.match(stepMerged.body.task.steps.at(-1).detail, /已审批并入/);
    const stepAfter = await readMainlineState(ctx.baseUrl, stepMainline);
    assert.equal(stepAfter.session.revision, stepBaseline.session.revision);
    assert.ok(stepAfter.session.mergedBtwIds.includes(stepOpened.body.thread.id));

    const prMainline = await createMainline(ctx.baseUrl, 'BTW pr_draft 模式');
    const prBaseline = await readMainlineState(ctx.baseUrl, prMainline);
    const prOpened = await postJson(ctx.baseUrl, '/api/a2a/btw', {
      sessionId: prMainline.sessionId,
      taskId: prMainline.taskId,
      prompt: '将旁支验证结论整理为可审阅的 PR 草案',
      title: 'PR 草案旁支',
    });
    assert.equal(prOpened.status, 201);
    const prProposed = await postJson(ctx.baseUrl, `/api/a2a/btw/${prOpened.body.thread.id}/propose-merge`, {
      summary: '整理旁支验证结论为 PR 草案',
      rationale: '仅生成草案，不直接写入主线',
      targetType: 'pr_draft',
    });
    assert.equal(prProposed.status, 200);
    assert.equal(prProposed.body.thread.mergeProposal.targetType, 'pr_draft');
    assert.equal(prProposed.body.thread.mergeProposal.riskLevel, 'medium');
    const prDraftSpec = prProposed.body.thread.mergeProposal.prDraftSpec;
    assert.ok(prDraftSpec);
    assert.equal(prDraftSpec.branch, `btw/${prOpened.body.thread.id}`);
    assert.equal(prDraftSpec.baseBranch, prBaseline.session.gitBranch);
    assert.ok(prDraftSpec.title.startsWith('btw: '));
    assert.ok(prDraftSpec.title.length <= 77);
    assert.ok(prDraftSpec.body.includes('```diff'));

    await postJson(ctx.baseUrl, `/api/a2a/btw/${prOpened.body.thread.id}/review`, { decision: 'approve' });
    const prConfirm = await postJson(ctx.baseUrl, '/api/a2a/btw/confirm', {
      threadId: prOpened.body.thread.id,
      action: 'merge',
    });
    const prMerged = await postJson(ctx.baseUrl, `/api/a2a/btw/${prOpened.body.thread.id}/merge`, {
      confirmToken: prConfirm.body.confirmToken,
    });
    assert.equal(prMerged.status, 200);
    assert.equal(prMerged.body.thread.status, 'merged');
    assert.equal(prMerged.body.thread.mergeProposal.prDraftSpec.branch, prDraftSpec.branch);
    assert.equal(prMerged.body.thread.mergeProposal.prDraftSpec.baseBranch, prDraftSpec.baseBranch);
    assert.ok(prMerged.body.thread.mergeProposal.prDraftSpec.title.startsWith('btw: '));
    assert.ok(prMerged.body.thread.mergeProposal.prDraftSpec.body.includes('未写入主线'));
    assert.equal(prMerged.body.task.steps.at(-1).phase, 'btw-pr-draft');
    assert.equal(prMerged.body.session.revision, prBaseline.session.revision + 1);
    assert.ok(prMerged.body.session.mergedBtwIds.includes(prOpened.body.thread.id));
  } finally {
    await ctx.cleanup();
  }
});

test('BTW archive, compatibility route, list filters, and state summary expose side threads', async () => {
  const ctx = await startTestServer();
  try {
    const mainA = await createMainline(ctx.baseUrl, 'BTW 过滤 A');
    const threadA = await postJson(ctx.baseUrl, '/api/a2a/btw', {
      sessionId: mainA.sessionId,
      taskId: mainA.taskId,
      prompt: '为过滤与状态汇总保留一个待审批旁支',
      title: '待审批旁支 A',
    });
    assert.equal(threadA.status, 201);
    const proposedA = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadA.body.thread.id}/propose-merge`, {
      summary: '将待审批旁支并入主会话上下文',
      rationale: '仅补充上下文',
      targetType: 'session_context',
    });
    assert.equal(proposedA.status, 200);
    assert.equal(proposedA.body.thread.status, 'pending_approval');

    const mainB = await createMainline(ctx.baseUrl, 'BTW 过滤 B');
    const threadB = await postJson(ctx.baseUrl, '/api/a2a/btw', {
      sessionId: mainB.sessionId,
      taskId: mainB.taskId,
      prompt: '为归档测试创建一个独立旁支',
      title: '待归档旁支 B',
    });
    assert.equal(threadB.status, 201);
    const archived = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadB.body.thread.id}/archive`);
    assert.equal(archived.status, 200);
    assert.equal(archived.body.thread.status, 'archived');
    const archivedMessage = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadB.body.thread.id}/messages`, {
      prompt: '归档后不应还能追问',
    });
    assert.equal(archivedMessage.status, 409);
    const archivedProposal = await postJson(ctx.baseUrl, `/api/a2a/btw/${threadB.body.thread.id}/propose-merge`, {
      summary: '归档后不应还能提交合并',
      targetType: 'session_context',
    });
    assert.equal(archivedProposal.status, 409);

    const compatibility = await postJson(ctx.baseUrl, `/api/a2a/tasks/${mainA.taskId}/btw`, {
      sessionId: mainA.sessionId,
      prompt: '通过任务兼容路由创建旁支',
      title: '兼容路由旁支',
    });
    assert.equal(compatibility.status, 201);
    assert.ok(compatibility.body.thread);
    assert.equal(compatibility.body.note.threadId, compatibility.body.thread.id);
    assert.ok(compatibility.body.task.btwNotes.some((note) => note.threadId === compatibility.body.thread.id));

    const bySession = await getJson(
      ctx.baseUrl,
      `/api/a2a/btw?sessionId=${encodeURIComponent(mainA.sessionId)}`,
    );
    assert.equal(bySession.status, 200);
    assert.ok(bySession.body.threads.length >= 2);
    assert.ok(bySession.body.threads.every((thread) => thread.sessionId === mainA.sessionId));
    const sessionThreadIds = new Set(bySession.body.threads.map((thread) => thread.id));
    assert.ok(sessionThreadIds.has(threadA.body.thread.id));
    assert.ok(sessionThreadIds.has(compatibility.body.thread.id));

    const byTask = await getJson(
      ctx.baseUrl,
      `/api/a2a/btw?taskId=${encodeURIComponent(mainB.taskId)}`,
    );
    assert.equal(byTask.status, 200);
    assert.ok(byTask.body.threads.length >= 1);
    assert.ok(byTask.body.threads.every((thread) => thread.taskId === mainB.taskId));
    assert.ok(byTask.body.threads.some((thread) => thread.id === threadB.body.thread.id));

    const pending = await getJson(ctx.baseUrl, '/api/a2a/btw?status=pending_approval');
    assert.equal(pending.status, 200);
    assert.ok(pending.body.threads.every((thread) => thread.status === 'pending_approval'));
    assert.ok(pending.body.threads.some((thread) => thread.id === threadA.body.thread.id));
    assert.equal(pending.body.summary.pendingApproval, pending.body.threads.length);

    const archivedOnly = await getJson(ctx.baseUrl, '/api/a2a/btw?status=archived');
    assert.equal(archivedOnly.status, 200);
    assert.ok(archivedOnly.body.threads.every((thread) => thread.status === 'archived'));
    assert.ok(archivedOnly.body.threads.some((thread) => thread.id === threadB.body.thread.id));

    const state = await getJson(ctx.baseUrl, '/api/a2a/state');
    assert.equal(state.status, 200);
    assert.ok(Array.isArray(state.body.btwThreads));
    assert.ok(state.body.btwThreads.some((thread) => thread.id === threadA.body.thread.id));
    assert.ok(state.body.btwThreads.some((thread) => thread.id === threadB.body.thread.id));
    assert.ok(state.body.btwSummary);
    assert.equal(state.body.btwSummary.total, state.body.btwThreads.length);
    assert.equal(state.body.summary.pendingBtwApprovals, state.body.btwSummary.attentionCount);
    assert.ok(state.body.summary.pendingBtwApprovals >= 1);
    const taskA = state.body.tasks.find((item) => item.id === mainA.taskId);
    assert.ok(taskA);
    assert.ok(taskA.btwNotes.some((note) => note.threadId === compatibility.body.thread.id));
  } finally {
    await ctx.cleanup();
  }
});

test('Read-only mode blocks every A2A BTW mutation route with 403', async () => {
  const ctx = await startTestServer({ readOnly: true });
  try {
    assert.equal(ctx.config.console.readOnly, true);
    const routes = [
      ['/api/a2a/btw', { sessionId: 'sess-readonly', prompt: 'blocked' }],
      ['/api/a2a/btw/confirm', { threadId: 'btw-readonly', action: 'merge' }],
      ['/api/a2a/btw/btw-readonly/messages', { prompt: 'blocked' }],
      ['/api/a2a/btw/btw-readonly/propose-merge', { summary: 'blocked', targetType: 'session_context' }],
      ['/api/a2a/btw/btw-readonly/review', { decision: 'approve' }],
      ['/api/a2a/btw/btw-readonly/merge', { confirmToken: 'placeholder-token' }],
      ['/api/a2a/btw/btw-readonly/archive', {}],
      ['/api/a2a/tasks/a2a-task-readonly/btw', { prompt: 'blocked' }],
    ];
    for (const [pathname, payload] of routes) {
      const result = await postJson(ctx.baseUrl, pathname, payload);
      assert.equal(result.status, 403, `${pathname} must be blocked in read-only mode`);
      assert.equal(result.body.ok, false);
      assert.match(result.body.error, /Read-only mode/);
    }
  } finally {
    await ctx.cleanup();
  }
});

test('BTW threads and proposals persist across orchestrator rebuild with 0600 state permissions', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-a2a-btw-persist-'));
  try {
    const config = loadConfig({
      rawConfig: {
        console: { dataDir },
        security: { requireCriticalConfirm: true },
      },
      cli: { demo: false, hosts: '127.0.0.1', webKey: '' },
      env: { OPS_CONSOLE_DATA_DIR: dataDir },
    });
    config.console.port = 0;

    const orchestrator = new A2AOrchestrator(config, null);
    await orchestrator.init();
    await orchestrator.registerAgent({
      id: 'a2a-btw-persist-lead',
      name: 'BTW Persist Lead',
      harness: 'codex-cli',
      nodeId: 'hub-primary',
      agentCardUrl: 'http://127.0.0.1:4320/.well-known/agent-card.json',
      setAsLead: true,
    });
    const session = (await orchestrator.createSession({
      title: 'BTW Persist Session',
      primaryAgentId: 'a2a-btw-persist-lead',
    })).session;
    const opened = await orchestrator.openBtwThread({
      sessionId: session.id,
      prompt: '持久化与文件权限验证',
      title: '持久化旁支会话',
    });
    const proposed = await orchestrator.proposeBtwMerge(opened.thread.id, {
      summary: '持久化合并提案摘要',
      rationale: '仅用于验证重启后完整读回',
      targetType: 'session_context',
    });
    assert.equal(proposed.thread.status, 'pending_approval');

    const statePath = path.join(dataDir, 'a2a-orchestrator.json');
    const fileStat = await fs.stat(statePath);
    if (process.platform !== 'win32') {
      assert.equal(fileStat.mode & 0o777, 0o600);
    }
    const persisted = JSON.parse(await fs.readFile(statePath, 'utf8'));
    assert.ok(Array.isArray(persisted.btwThreads));
    const persistedThread = persisted.btwThreads.find((thread) => thread.id === opened.thread.id);
    assert.ok(persistedThread);
    assert.equal(persistedThread.status, 'pending_approval');
    assert.equal(persistedThread.messages.length, 2);
    assert.equal(persistedThread.mergeProposal.summary, '持久化合并提案摘要');

    const restored = new A2AOrchestrator(config, null);
    await restored.init();
    const restoredListing = restored.listBtwThreads({ sessionId: session.id });
    assert.equal(restoredListing.threads.length, 1);
    const restoredThread = restoredListing.threads[0];
    assert.equal(restoredThread.id, opened.thread.id);
    assert.equal(restoredThread.status, 'pending_approval');
    assert.equal(restoredThread.sessionId, session.id);
    assert.equal(restoredThread.messages.length, 2);
    assert.equal(restoredThread.messages[0].content, '持久化与文件权限验证');
    assert.equal(restoredThread.mergeProposal.targetType, 'session_context');
    assert.equal(restoredThread.mergeProposal.riskLevel, 'low');
    assert.ok(restoredThread.mergeProposal.patchPreview.includes('未写入主线'));
    assert.equal(restoredThread.createdBy, 'web');
    assert.equal(restoredListing.summary.pendingApproval, 1);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
