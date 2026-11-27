import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  DEFAULT_CONTEXT_MAX_TOKENS,
  INLINE_OUTPUT_MAX_CHARS,
  MAX_QUEUED_TURNS,
  MAX_STEER_NOTES,
  THREAD_RELATIONS,
  computeThreadAttention,
  estimateContextBudget,
  normalizeTaskWorkspaceFields,
  paginateTasks,
  readSpillPayload,
  truncateInlineWithSpill,
} from '../src/a2a-workspace-controls.mjs';
import { A2AOrchestrator } from '../src/a2a-orchestrator.mjs';
import { loadConfig } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';

async function startTestServer(overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-a2a-workspace-'));
  const config = loadConfig({
    rawConfig: {
      console: { dataDir },
      security: {
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
  const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
  if (payload !== undefined) init.body = JSON.stringify(payload);
  const res = await fetch(`${baseUrl}${pathname}`, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function getJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function patchJson(baseUrl, pathname, payload) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function createTask(baseUrl, prompt = '验证 A2A 工作台线程控制') {
  const created = await postJson(baseUrl, '/api/a2a/tasks', {
    prompt,
    targetAgentId: 'a2a-mac-pi',
  });
  assert.equal(created.status, 201, `create task failed: ${JSON.stringify(created.body)}`);
  return created.body.task;
}

async function readTask(baseUrl, taskId) {
  const state = await getJson(baseUrl, '/api/a2a/state');
  assert.equal(state.status, 200);
  return state.body.tasks.find((item) => item.id === taskId);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('workspace control constants and task normalization stay backward compatible', () => {
  assert.equal(INLINE_OUTPUT_MAX_CHARS, 4000);
  assert.equal(MAX_QUEUED_TURNS, 20);
  assert.equal(MAX_STEER_NOTES, 20);
  assert.deepEqual(THREAD_RELATIONS, ['root', 'fork', 'fresh-context', 'btw', 'subtask']);

  const legacy = {
    id: 'a2a-task-legacy-1',
    state: 'completed',
    prompt: 'legacy thread',
    createdAt: '2026-11-26T08:00:00.000Z',
    updatedAt: '2026-11-26T08:05:00.000Z',
    steps: [{ ts: '2026-11-26T08:01:00.000Z', state: 'working', detail: 'legacy step' }],
    artifact: 'legacy artifact',
  };
  const normalized = normalizeTaskWorkspaceFields(legacy);
  assert.equal(normalized, legacy);
  assert.equal(normalized.parentThreadId, null);
  assert.equal(normalized.rootThreadId, 'a2a-task-legacy-1');
  assert.equal(normalized.relation, 'root');
  assert.deepEqual(normalized.queuedTurns, []);
  assert.deepEqual(normalized.steeringNotes, []);
  assert.equal(normalized.settledAt, null);
  assert.equal(normalized.snoozedAt, null);
  assert.equal(normalized.snoozedUntil, null);
  assert.equal(normalized.readWatermarkAt, null);
  assert.equal(normalized.lastActivityAt, '2026-11-26T08:05:00.000Z');
  assert.deepEqual(normalized.compactions, []);
  assert.deepEqual(normalized.outputSpills, []);
  assert.equal(normalized.contextBudget.maxTokens, DEFAULT_CONTEXT_MAX_TOKENS);
  assert.equal(normalized.contextBudget.compactedCount, 0);
  assert.ok(normalized.attention);
  assert.equal(normalized.attention.unread, false);

  const subtask = normalizeTaskWorkspaceFields({
    id: 'a2a-task-legacy-2',
    parentTaskId: 'a2a-task-parent',
    updatedAt: '2026-11-26T08:10:00.000Z',
  });
  assert.equal(subtask.parentThreadId, 'a2a-task-parent');
  assert.equal(subtask.rootThreadId, 'a2a-task-parent');
  assert.equal(subtask.relation, 'subtask');

  const sideThread = normalizeTaskWorkspaceFields({
    id: 'a2a-task-legacy-3',
    isSideThread: true,
    updatedAt: '2026-11-26T08:11:00.000Z',
  });
  assert.equal(sideThread.relation, 'btw');

  const explicit = normalizeTaskWorkspaceFields({
    id: 'a2a-task-legacy-4',
    parentTaskId: 'a2a-task-parent',
    parentThreadId: 'a2a-task-explicit-parent',
    rootThreadId: 'a2a-task-explicit-root',
    relation: 'fork',
    updatedAt: '2026-11-26T08:12:00.000Z',
  });
  assert.equal(explicit.parentThreadId, 'a2a-task-explicit-parent');
  assert.equal(explicit.rootThreadId, 'a2a-task-explicit-root');
  assert.equal(explicit.relation, 'fork');

  const invalidRelation = normalizeTaskWorkspaceFields({
    id: 'a2a-task-legacy-5',
    relation: 'nonsense',
    updatedAt: '2026-11-26T08:13:00.000Z',
  });
  assert.equal(invalidRelation.relation, 'root');
});

test('thread attention distinguishes unread, failure, snooze, and early wake', () => {
  const nowMs = Date.parse('2026-11-27T10:00:00.000Z');

  const working = computeThreadAttention({
    state: 'working',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
  }, { nowMs });
  assert.equal(working.unread, true);
  assert.equal(working.needsAttention, true);
  assert.deepEqual(working.reasons, ['unread_update']);

  const completed = computeThreadAttention({
    state: 'completed',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
  }, { nowMs });
  assert.equal(completed.unread, false);
  assert.equal(completed.needsAttention, false);

  const pendingBtw = computeThreadAttention({
    state: 'completed',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
  }, { nowMs, pendingBtwCount: 1 });
  assert.equal(pendingBtw.unread, true);
  assert.deepEqual(pendingBtw.reasons, ['pending_btw', 'unread_update']);
  assert.equal(pendingBtw.needsAttention, true);

  const failed = computeThreadAttention({
    state: 'failed',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
    readWatermarkAt: '2026-11-27T09:59:30.000Z',
  }, { nowMs });
  assert.deepEqual(failed.reasons, ['task_failed']);
  assert.equal(failed.unread, false);
  assert.equal(failed.needsAttention, true);

  const settled = computeThreadAttention({
    state: 'working',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
    settledAt: '2026-11-27T09:59:30.000Z',
  }, { nowMs });
  assert.equal(settled.unread, false);
  assert.equal(settled.needsAttention, false);

  const snoozed = computeThreadAttention({
    state: 'working',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
    snoozedAt: '2026-11-27T09:58:00.000Z',
    snoozedUntil: '2026-11-27T10:30:00.000Z',
  }, { nowMs });
  assert.equal(snoozed.snoozed, true);
  assert.equal(snoozed.snoozeWokenEarly, false);
  assert.equal(snoozed.needsAttention, false);

  const wokenByPendingBtw = computeThreadAttention({
    state: 'working',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
    snoozedAt: '2026-11-27T09:58:00.000Z',
    snoozedUntil: '2026-11-27T10:30:00.000Z',
  }, { nowMs, pendingBtwCount: 2 });
  assert.equal(wokenByPendingBtw.snoozeWokenEarly, true);
  assert.equal(wokenByPendingBtw.snoozed, false);
  assert.ok(wokenByPendingBtw.reasons.includes('snooze_woken'));
  assert.ok(wokenByPendingBtw.reasons.includes('pending_btw'));
  assert.equal(wokenByPendingBtw.needsAttention, true);

  const wokenByCompletion = computeThreadAttention({
    state: 'completed',
    lastActivityAt: '2026-11-27T09:59:30.000Z',
    snoozedAt: '2026-11-27T09:58:00.000Z',
    snoozedUntil: '2026-11-27T10:30:00.000Z',
  }, { nowMs });
  assert.equal(wokenByCompletion.snoozeWokenEarly, true);
  assert.equal(wokenByCompletion.snoozed, false);
  assert.ok(wokenByCompletion.reasons.includes('snooze_woken'));

  const expiredSnooze = computeThreadAttention({
    state: 'working',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
    snoozedAt: '2026-11-27T09:00:00.000Z',
    snoozedUntil: '2026-11-27T09:30:00.000Z',
  }, { nowMs });
  assert.equal(expiredSnooze.snoozed, false);
  assert.equal(expiredSnooze.snoozeWokenEarly, false);
  assert.equal(expiredSnooze.needsAttention, true);

  const watermarkAhead = computeThreadAttention({
    state: 'completed',
    lastActivityAt: '2026-11-27T09:59:00.000Z',
    readWatermarkAt: '2026-11-27T09:59:30.000Z',
  }, { nowMs });
  assert.equal(watermarkAhead.unread, false);
});

test('context budget estimate shrinks after mark-don\u0027t-delete compaction', () => {
  const steps = Array.from({ length: 10 }, (_, index) => ({
    ts: `2026-11-27T09:0${index}:00.000Z`,
    state: 'working',
    detail: 's'.repeat(400),
  }));
  const task = {
    id: 'a2a-task-budget',
    prompt: 'p'.repeat(400),
    steps,
    artifact: 'a'.repeat(240),
  };
  const before = estimateContextBudget(task);
  assert.equal(before.maxTokens, DEFAULT_CONTEXT_MAX_TOKENS);
  assert.equal(before.compactedCount, 0);
  assert.ok(before.estimatedTokens > 1000);
  assert.ok(before.usagePct > 0);

  task.compactions = [{
    id: 'cmp-test',
    summary: 'summary'.repeat(50),
    compactedUpToStepIndex: steps.length,
  }];
  task.steps = [...steps, { state: 'working', detail: 'tail step' }];
  const after = estimateContextBudget(task);
  assert.equal(after.compactedCount, 1);
  assert.ok(after.estimatedTokens < before.estimatedTokens);

  const custom = estimateContextBudget({ ...task, contextBudget: { maxTokens: 1000 } });
  assert.equal(custom.maxTokens, 1000);
});

test('task pagination filters by state, attention, and text query', () => {
  const base = Date.parse('2026-11-27T09:00:00.000Z');
  const tasks = [
    normalizeTaskWorkspaceFields({
      id: 'a2a-task-page-1',
      state: 'completed',
      prompt: 'alpha release checks',
      workerAgentName: 'Pi',
      createdAt: new Date(base).toISOString(),
      updatedAt: new Date(base).toISOString(),
    }),
    normalizeTaskWorkspaceFields({
      id: 'a2a-task-page-2',
      state: 'working',
      prompt: 'beta rollout',
      workerAgentName: 'Claude',
      createdAt: new Date(base + 60_000).toISOString(),
      updatedAt: new Date(base + 60_000).toISOString(),
    }),
    normalizeTaskWorkspaceFields({
      id: 'a2a-task-page-3',
      state: 'failed',
      prompt: 'gamma regression',
      workerAgentName: 'Codex',
      createdAt: new Date(base + 120_000).toISOString(),
      updatedAt: new Date(base + 120_000).toISOString(),
    }),
  ];

  const page = paginateTasks(tasks, { limit: 2, offset: 0 });
  assert.equal(page.total, 3);
  assert.equal(page.items.length, 2);
  assert.equal(page.hasMore, true);
  assert.equal(page.items[0].id, 'a2a-task-page-3');

  const secondPage = paginateTasks(tasks, { limit: 2, offset: 2 });
  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.hasMore, false);
  assert.equal(secondPage.items[0].id, 'a2a-task-page-1');

  assert.equal(paginateTasks(tasks, { state: 'working' }).total, 1);
  assert.equal(paginateTasks(tasks, { attentionOnly: true }).total, 2);
  assert.equal(paginateTasks(tasks, { q: 'gamma' }).total, 1);
  assert.equal(paginateTasks(tasks, { q: 'pi' }).total, 1);
  assert.equal(paginateTasks(tasks, { limit: 0 }).limit, 1);
  assert.equal(paginateTasks(tasks, { limit: 500 }).limit, 100);
});

test('inline truncation redacts, spills to 0600 files, and rejects traversal ids', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-a2a-spill-'));
  try {
    const memorySpills = new Map();
    const fakeBearer = 'Bearer unit-test-token-abcdefghijklmnop';
    const small = await truncateInlineWithSpill({
      text: `检查 ${fakeBearer}`,
      taskId: 'a2a-task-spill',
      label: 'small',
      dataDir,
      memorySpills,
    });
    assert.equal(small.truncated, false);
    assert.equal(small.spillRef, null);
    assert.ok(small.text.includes('Bearer [REDACTED]'));
    assert.ok(!small.text.includes('unit-test-token-abcdefghijklmnop'));
    assert.equal(memorySpills.size, 0);

    const fakeApiKey = ['sk', 'test', 'spill', 'placeholder', '1234567890'].join('-');
    const bigText = `${fakeApiKey}\n${'x'.repeat(INLINE_OUTPUT_MAX_CHARS + 1500)}`;
    const big = await truncateInlineWithSpill({
      text: bigText,
      taskId: 'a2a-task-spill',
      label: 'artifact',
      dataDir,
      memorySpills,
    });
    assert.equal(big.truncated, true);
    assert.ok(big.spillRef);
    assert.match(big.spillRef.id, /^spill-[a-f0-9]{12}$/);
    assert.equal(big.spillRef.taskId, 'a2a-task-spill');
    assert.equal(big.spillRef.label, 'artifact');
    assert.equal(big.spillRef.truncated, true);
    assert.ok(big.spillRef.bytes > INLINE_OUTPUT_MAX_CHARS);
    assert.ok(big.text.includes(`[truncated, spillRef=${big.spillRef.id}]`));
    assert.ok(!big.text.includes(fakeApiKey));
    assert.equal(memorySpills.size, 1);

    const spillDir = path.join(dataDir, 'blobs', 'a2a-spills');
    const spillPath = path.join(spillDir, `${big.spillRef.id}.txt`);
    if (process.platform !== 'win32') {
      assert.equal((await fs.stat(spillDir)).mode & 0o777, 0o700);
      assert.equal((await fs.stat(spillPath)).mode & 0o777, 0o600);
    }
    const fileContent = await fs.readFile(spillPath, 'utf8');
    assert.equal(fileContent.length, bigText.length - fakeApiKey.length + '[REDACTED_API_KEY]'.length);
    assert.ok(fileContent.includes('[REDACTED_API_KEY]'));

    const fromMemory = await readSpillPayload({
      spillId: big.spillRef.id,
      taskId: 'a2a-task-spill',
      dataDir,
      memorySpills,
    });
    assert.equal(fromMemory.ok, true);
    assert.equal(fromMemory.content, fileContent);

    const fromDisk = await readSpillPayload({
      spillId: big.spillRef.id,
      taskId: 'a2a-task-spill',
      dataDir,
      memorySpills: new Map(),
    });
    assert.equal(fromDisk.ok, true);
    assert.equal(fromDisk.content, fileContent);

    for (const badId of ['', '..', 'ab', '../escape', 'nested/path', 'x'.repeat(81), 'bad id!']) {
      const rejected = await readSpillPayload({
        spillId: badId,
        taskId: 'a2a-task-spill',
        dataDir,
        memorySpills,
      });
      assert.equal(rejected, null, `spill id ${JSON.stringify(badId)} must be rejected`);
    }
    assert.equal(await readSpillPayload({ spillId: 'spill-000000000000', dataDir, memorySpills: new Map() }), null);

    const boundedMap = new Map();
    for (let index = 0; index < 125; index += 1) {
      await truncateInlineWithSpill({
        text: `${index}-${'y'.repeat(INLINE_OUTPUT_MAX_CHARS + 10)}`,
        taskId: 'a2a-task-spill',
        label: `bounded-${index}`,
        dataDir,
        memorySpills: boundedMap,
      });
    }
    assert.equal(boundedMap.size, 120);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('legacy orchestrator state normalizes on load and queued turn caps hold', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-a2a-workspace-load-'));
  try {
    const config = loadConfig({
      rawConfig: { console: { dataDir } },
      cli: { demo: false, hosts: '127.0.0.1', webKey: '' },
      env: { OPS_CONSOLE_DATA_DIR: dataDir },
    });
    config.console.port = 0;
    await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
    await fs.writeFile(
      path.join(dataDir, 'a2a-orchestrator.json'),
      JSON.stringify({
        version: 4,
        tasks: [{
          id: 'a2a-task-legacy-load',
          state: 'working',
          prompt: 'legacy persisted task',
          createdAt: '2026-11-26T08:00:00.000Z',
          updatedAt: '2026-11-26T08:10:00.000Z',
          steps: [{ ts: '2026-11-26T08:05:00.000Z', state: 'working', detail: 'legacy step' }],
        }],
      }),
      { mode: 0o600 },
    );

    const orchestrator = new A2AOrchestrator(config, null);
    await orchestrator.init();
    const state = orchestrator.getState();
    const task = state.tasks.find((item) => item.id === 'a2a-task-legacy-load');
    assert.ok(task);
    assert.equal(task.relation, 'root');
    assert.equal(task.rootThreadId, 'a2a-task-legacy-load');
    assert.deepEqual(task.queuedTurns, []);
    assert.ok(task.attention);
    assert.ok(task.contextBudget);
    assert.equal(task.attention.unread, true, 'working task without watermark is unread');

    for (let index = 0; index < MAX_QUEUED_TURNS + 5; index += 1) {
      await orchestrator.enqueueTaskTurn(task.id, { prompt: `turn-${index}` });
      await orchestrator.steerTask(task.id, { instruction: `steer-${index}` });
    }
    const refreshed = orchestrator.tasks.find((item) => item.id === task.id);
    assert.equal(refreshed.queuedTurns.length, MAX_QUEUED_TURNS);
    assert.equal(refreshed.queuedTurns.at(-1).prompt, `turn-${MAX_QUEUED_TURNS + 4}`);
    assert.equal(refreshed.steeringNotes.length, MAX_STEER_NOTES);
    assert.equal(refreshed.steeringNotes.at(-1).instruction, `steer-${MAX_STEER_NOTES + 4}`);

    const persisted = JSON.parse(await fs.readFile(path.join(dataDir, 'a2a-orchestrator.json'), 'utf8'));
    const persistedTask = persisted.tasks.find((item) => item.id === task.id);
    assert.equal(persistedTask.queuedTurns.length, MAX_QUEUED_TURNS);
    assert.equal(persistedTask.outputSpills.length, 0);
    assert.ok(Array.isArray(persistedTask.compactions));
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('HTTP workspace flow covers queue, steer, settle, read watermark, and restarts', async () => {
  const ctx = await startTestServer();
  try {
    const task = await createTask(ctx.baseUrl);
    assert.equal(task.relation, 'root');
    assert.equal(task.parentThreadId, null);
    assert.ok(task.contextBudget);
    assert.ok(task.attention);
    const baselineSteps = task.steps.length;

    const invalidQueue = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/queue-turn`, { prompt: '   ' });
    assert.equal(invalidQueue.status, 400);
    const missingQueue = await postJson(ctx.baseUrl, '/api/a2a/tasks/a2a-task-missing/queue-turn', { prompt: 'hello' });
    assert.equal(missingQueue.status, 404);

    const queued = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/queue-turn`, {
      prompt: '请补充部署版本一致性检查 Bearer unit-test-token-abcdefghijklmnop',
      model: 'gpt-5-codex',
      effort: 'high',
    });
    assert.equal(queued.status, 200);
    assert.equal(queued.body.ok, true);
    assert.equal(queued.body.task.queuedTurns.length, 1);
    assert.equal(queued.body.queuedTurn.status, 'queued');
    assert.equal(queued.body.queuedTurn.effort, 'high');
    assert.ok(queued.body.queuedTurn.prompt.includes('Bearer [REDACTED]'));
    assert.equal(queued.body.task.steps.length, baselineSteps + 1);
    assert.equal(queued.body.task.steps.at(-1).phase, 'queue-turn');

    const invalidSteer = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/steer`, { instruction: '' });
    assert.equal(invalidSteer.status, 400);
    const steered = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/steer`, {
      instruction: '先跑只读探针再改配置',
    });
    assert.equal(steered.status, 200);
    assert.equal(steered.body.task.steeringNotes.length, 1);
    assert.equal(steered.body.steeringNote.appliedAt, null);
    assert.equal(steered.body.steeringNote.actor, 'web');
    assert.equal(steered.body.task.steps.at(-1).phase, 'steer');

    const settled = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/settle`, {});
    assert.equal(settled.status, 200);
    assert.ok(settled.body.task.settledAt);
    assert.equal(settled.body.task.settledAt, settled.body.task.readWatermarkAt);
    assert.equal(settled.body.task.snoozedAt, null);
    assert.equal(settled.body.task.snoozedUntil, null);
    assert.equal(settled.body.task.attention.unread, false);

    const restarted = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/restart`, { freshContext: false });
    assert.equal(restarted.status, 200);
    assert.equal(restarted.body.freshContext, false);
    assert.equal(restarted.body.sourceTaskId, task.id);
    assert.equal(restarted.body.task.state, 'working');
    assert.equal(restarted.body.task.settledAt, null);
    assert.equal(restarted.body.task.steps.at(-1).phase, 'restart');

    const staleWatermark = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/read`, {
      watermarkAt: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(staleWatermark.status, 200);
    assert.equal(staleWatermark.body.task.readWatermarkAt, '2026-01-01T00:00:00.000Z');
    assert.equal(staleWatermark.body.task.attention.unread, true);

    const freshWatermark = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/read`, {});
    assert.equal(freshWatermark.status, 200);
    assert.equal(freshWatermark.body.task.attention.unread, false);

    const invalidWatermark = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/read`, {
      watermarkAt: 'not-a-timestamp',
    });
    assert.equal(invalidWatermark.status, 400);

    const stepsBeforeFresh = restarted.body.task.steps.length;
    const fresh = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/restart`, {
      freshContext: true,
      prompt: '以全新上下文重跑同一任务',
    });
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.freshContext, true);
    assert.equal(fresh.body.sourceTaskId, task.id);
    const nextTask = fresh.body.task;
    assert.notEqual(nextTask.id, task.id);
    assert.equal(nextTask.parentThreadId, task.id);
    assert.equal(nextTask.rootThreadId, task.rootThreadId);
    assert.equal(nextTask.relation, 'fresh-context');
    assert.equal(nextTask.state, 'working');
    assert.equal(nextTask.prompt, '以全新上下文重跑同一任务');
    assert.equal(nextTask.workerAgentId, task.workerAgentId);
    assert.equal(nextTask.appliedModel, task.appliedModel);
    assert.equal(nextTask.appliedEffort, task.appliedEffort);
    assert.equal(nextTask.steps.at(-1).phase, 'fresh-context');

    const sourceAfterFresh = await readTask(ctx.baseUrl, task.id);
    assert.equal(sourceAfterFresh.steps.length, stepsBeforeFresh, 'fresh context must not drop source history');
    const nextFromState = await readTask(ctx.baseUrl, nextTask.id);
    assert.ok(nextFromState);
    assert.equal(nextFromState.parentThreadId, task.id);
  } finally {
    await ctx.cleanup();
  }
});

test('HTTP snooze wakes early on completion and pending BTW', async () => {
  const ctx = await startTestServer();
  try {
    const task = await createTask(ctx.baseUrl, '验证 snooze 提前唤醒');
    await wait(10);
    const normalizedActivity = await patchJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/state`, {
      state: 'working',
    });
    assert.equal(normalizedActivity.status, 200);

    const snoozed = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/snooze`, { minutes: 5 });
    assert.equal(snoozed.status, 200);
    assert.ok(snoozed.body.task.snoozedAt);
    assert.ok(Date.parse(snoozed.body.task.snoozedUntil) > Date.now());
    assert.equal(snoozed.body.task.attention.snoozed, true);
    assert.equal(snoozed.body.task.attention.needsAttention, false);

    const missing = await postJson(ctx.baseUrl, '/api/a2a/tasks/a2a-task-missing/snooze', { minutes: 5 });
    assert.equal(missing.status, 404);
    const badUntil = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/snooze`, {
      untilIso: '2020-01-01T00:00:00.000Z',
    });
    assert.equal(badUntil.status, 400);

    await wait(15);
    const completed = await patchJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/state`, { state: 'completed' });
    assert.equal(completed.status, 200);
    const afterCompletion = await readTask(ctx.baseUrl, task.id);
    assert.equal(afterCompletion.attention.snoozeWokenEarly, true);
    assert.equal(afterCompletion.attention.snoozed, false);
    assert.ok(afterCompletion.attention.reasons.includes('snooze_woken'));
    assert.equal(afterCompletion.attention.needsAttention, true);

    const snoozedAgain = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/snooze`, { minutes: 5 });
    assert.equal(snoozedAgain.status, 200);
    assert.equal(snoozedAgain.body.task.attention.snoozed, true);

    const clamped = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/snooze`, { minutes: 0 });
    assert.equal(clamped.status, 200);
    const untilDelta = Date.parse(clamped.body.task.snoozedUntil) - Date.parse(clamped.body.task.snoozedAt);
    assert.ok(untilDelta >= 55_000 && untilDelta <= 65_000, `minutes must clamp to 1..10080, got ${untilDelta}`);

    const btw = await postJson(ctx.baseUrl, '/api/a2a/btw', {
      taskId: task.id,
      prompt: '旁支先确认只读探针检查项',
      title: 'snooze 唤醒旁支',
    });
    assert.equal(btw.status, 201);
    const afterBtw = await readTask(ctx.baseUrl, task.id);
    assert.equal(afterBtw.attention.snoozeWokenEarly, true);
    assert.equal(afterBtw.attention.snoozed, false);
    assert.ok(afterBtw.attention.reasons.includes('pending_btw'));
    assert.ok(afterBtw.attention.reasons.includes('snooze_woken'));
  } finally {
    await ctx.cleanup();
  }
});

test('HTTP compaction is mark-don\u0027t-delete and spills oversized summaries with readback', async () => {
  const ctx = await startTestServer();
  try {
    const task = await createTask(ctx.baseUrl, '验证上下文压缩与 spill 回读');
    const baselineDetails = task.steps.map((step) => step.detail);

    const hugeSummary = 'S'.repeat(INLINE_OUTPUT_MAX_CHARS + 2000);
    const compacted = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/compact`, {
      summary: hugeSummary,
    });
    assert.equal(compacted.status, 200);
    assert.equal(compacted.body.ok, true);
    const compaction = compacted.body.compaction;
    assert.equal(compaction.compactedUpToStepIndex, baselineDetails.length);
    assert.equal(compacted.body.task.compactions.length, 1);
    assert.equal(compacted.body.task.steps.length, baselineDetails.length + 1);
    assert.equal(compacted.body.task.steps.at(-1).phase, 'compact');
    assert.equal(compacted.body.task.contextBudget.compactedCount, 1);
    assert.ok(compaction.tokensBefore > 0);
    assert.ok(compaction.tokensAfter > 0);
    assert.ok(compaction.spillRefId);
    assert.ok(compaction.summary.includes('[truncated, spillRef='));
    assert.deepEqual(
      compacted.body.task.steps.slice(0, baselineDetails.length).map((step) => step.detail),
      baselineDetails,
      'compaction must preserve every existing step',
    );
    assert.ok(compacted.body.task.outputSpills.some((spill) => spill.id === compaction.spillRefId));
    const spillMeta = compacted.body.task.outputSpills.find((spill) => spill.id === compaction.spillRefId);
    assert.equal(spillMeta.taskId, task.id);
    assert.equal(spillMeta.label, 'compaction-summary');
    assert.equal(spillMeta.truncated, true);

    const spillDir = path.join(ctx.dataDir, 'blobs', 'a2a-spills');
    const spillPath = path.join(spillDir, `${compaction.spillRefId}.txt`);
    if (process.platform !== 'win32') {
      assert.equal((await fs.stat(spillDir)).mode & 0o777, 0o700);
      assert.equal((await fs.stat(spillPath)).mode & 0o777, 0o600);
    }
    assert.equal((await fs.readFile(spillPath, 'utf8')).length, hugeSummary.length);

    const spill = await getJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/spills/${compaction.spillRefId}`);
    assert.equal(spill.status, 200);
    assert.equal(spill.body.ok, true);
    assert.equal(spill.body.content, hugeSummary);
    assert.equal(spill.body.spill.content, hugeSummary);
    assert.equal(spill.body.id, compaction.spillRefId);

    const unknownSpill = await getJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/spills/spill-000000000000`);
    assert.equal(unknownSpill.status, 404);
    const unknownTask = await getJson(ctx.baseUrl, `/api/a2a/tasks/a2a-task-missing/spills/spill-000000000000`);
    assert.equal(unknownTask.status, 404);
    const traversal = await getJson(
      ctx.baseUrl,
      `/api/a2a/tasks/${task.id}/spills/%2e%2e%2fescape`,
    );
    assert.equal(traversal.status, 404);
    assert.equal(traversal.body.ok, false);

    const secondCompact = await postJson(ctx.baseUrl, `/api/a2a/tasks/${task.id}/compact`, {
      summary: '第二轮压缩仅标记，原始步骤全部保留',
    });
    assert.equal(secondCompact.status, 200);
    assert.equal(secondCompact.body.task.compactions.length, 2);
    assert.equal(
      secondCompact.body.task.compactions[0].id,
      compaction.id,
      'earlier compaction markers must survive',
    );
    assert.equal(secondCompact.body.task.steps.length, baselineDetails.length + 2);
    assert.equal(secondCompact.body.compaction.compactedUpToStepIndex, baselineDetails.length + 1);
    assert.deepEqual(
      secondCompact.body.task.steps.slice(0, baselineDetails.length).map((step) => step.detail),
      baselineDetails,
    );

    const page = await getJson(ctx.baseUrl, '/api/a2a/tasks?limit=1&offset=0');
    assert.equal(page.status, 200);
    assert.equal(page.body.items.length, 1);
    assert.ok(page.body.total >= 3);
    assert.equal(page.body.hasMore, true);
    assert.equal(page.body.limit, 1);
    assert.equal(page.body.offset, 0);

    const secondPage = await getJson(ctx.baseUrl, '/api/a2a/tasks?limit=1&offset=1');
    assert.equal(secondPage.status, 200);
    assert.notEqual(secondPage.body.items[0].id, page.body.items[0].id);

    const byState = await getJson(ctx.baseUrl, '/api/a2a/tasks?state=working&limit=50');
    assert.equal(byState.status, 200);
    assert.ok(byState.body.items.every((item) => item.state === 'working'));

    const attention = await getJson(ctx.baseUrl, '/api/a2a/tasks?attentionOnly=1&limit=50');
    assert.equal(attention.status, 200);
    assert.ok(attention.body.total >= 1);
    assert.ok(attention.body.items.every((item) => item.attention.needsAttention));
    assert.ok(attention.body.items.some((item) => item.id === 'a2a-task-9024'));

    const searched = await getJson(ctx.baseUrl, `/api/a2a/tasks?q=${encodeURIComponent(task.id)}`);
    assert.equal(searched.status, 200);
    assert.equal(searched.body.total, 1);
    assert.equal(searched.body.items[0].id, task.id);
    assert.ok(searched.body.items[0].contextBudget);
  } finally {
    await ctx.cleanup();
  }
});

test('Read-only mode blocks every A2A workspace mutation route with 403', async () => {
  const ctx = await startTestServer({ readOnly: true });
  try {
    assert.equal(ctx.config.console.readOnly, true);
    const routes = [
      ['/api/a2a/tasks/a2a-task-readonly/queue-turn', { prompt: 'blocked' }],
      ['/api/a2a/tasks/a2a-task-readonly/steer', { instruction: 'blocked' }],
      ['/api/a2a/tasks/a2a-task-readonly/restart', { freshContext: true }],
      ['/api/a2a/tasks/a2a-task-readonly/settle', {}],
      ['/api/a2a/tasks/a2a-task-readonly/snooze', { minutes: 5 }],
      ['/api/a2a/tasks/a2a-task-readonly/read', {}],
      ['/api/a2a/tasks/a2a-task-readonly/compact', { summary: 'blocked' }],
    ];
    for (const [pathname, payload] of routes) {
      const result = await postJson(ctx.baseUrl, pathname, payload);
      assert.equal(result.status, 403, `${pathname} must be blocked in read-only mode`);
      assert.equal(result.body.ok, false);
      assert.match(result.body.error, /Read-only mode/);
    }

    const listing = await getJson(ctx.baseUrl, '/api/a2a/tasks?limit=2');
    assert.equal(listing.status, 200);
    assert.ok(Array.isArray(listing.body.items));
    const missingSpill = await getJson(ctx.baseUrl, '/api/a2a/tasks/a2a-task-readonly/spills/spill-000000000000');
    assert.equal(missingSpill.status, 404);
  } finally {
    await ctx.cleanup();
  }
});
