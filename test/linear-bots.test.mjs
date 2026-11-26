import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';

async function startTestServer(overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-linear-bots-'));
  const config = loadConfig({
    cli: {
      hosts: '127.0.0.1',
      port: 4322,
      demo: true,
      readOnly: overrides.readOnly ?? false,
      webKey: overrides.webKey ?? '',
    },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  return {
    app,
    baseUrl: addresses[0].url,
    cleanup: async () => {
      await app.stop();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

test('Linear AI Project Management APIs: CRUD, DAG cycle prevention, Commander decomposition, and GitHub sync', async () => {
  const { baseUrl, cleanup } = await startTestServer();
  try {
    // 1. Initial Linear state
    const initRes = await fetch(`${baseUrl}/api/linear/state`);
    assert.equal(initRes.status, 200);
    const initJson = await initRes.json();
    assert.equal(initJson.ok, true);
    assert.ok(initJson.projects.length >= 2);
    assert.ok(initJson.cycles.length >= 1);
    assert.ok(initJson.issues.length >= 5);
    assert.ok(initJson.commander.leadAgentId);
    assert.ok(initJson.githubConfig.owner);

    // 2. Create two Linear issues and verify DAG cycle prevention
    const issueARes = await fetch(`${baseUrl}/api/linear/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '重构 GitHub PR 状态同步器',
        description: '确保所有 Worktree 分支与 PR 状态保持强一致',
        priority: 'urgent',
        status: 'triage',
        projectId: initJson.projects[0].id,
        estimate: 5,
      }),
    });
    assert.equal(issueARes.status, 201);
    const issueA = (await issueARes.json()).issue;
    assert.ok(issueA.id);
    assert.match(issueA.identifier, /^[A-Z]+-\d+$/);

    const issueBRes = await fetch(`${baseUrl}/api/linear/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '验证 PR 状态回写监控指标',
        priority: 'high',
        status: 'todo',
        projectId: initJson.projects[0].id,
        blockedBy: [issueA.id],
      }),
    });
    assert.equal(issueBRes.status, 201);
    const issueB = (await issueBRes.json()).issue;
    assert.deepEqual(issueB.blockedBy, [issueA.id]);

    // Attempting to make A blockedBy B must fail with 400 (cycle detection)
    const cycleRes = await fetch(`${baseUrl}/api/linear/issues/${encodeURIComponent(issueA.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedBy: [issueB.id] }),
    });
    assert.equal(cycleRes.status, 400);

    // 3. Commander-in-Chief takes over Issue A, decomposes into 3 chained sub-issues & dispatches A2A
    const dispatchRes = await fetch(
      `${baseUrl}/api/linear/issues/${encodeURIComponent(issueA.id)}/dispatch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
    assert.equal(dispatchRes.status, 200);
    const dispatchJson = await dispatchRes.json();
    assert.equal(dispatchJson.ok, true);
    assert.equal(dispatchJson.issue.status, 'in_progress');
    assert.ok(dispatchJson.issue.worktreeBranch);
    assert.equal(dispatchJson.createdSubIssues.length, 3);
    assert.equal(dispatchJson.createdSubIssues[0].parentId, issueA.id);
    assert.ok(dispatchJson.createdSubIssues[1].blockedBy.includes(dispatchJson.createdSubIssues[0].id));
    assert.ok(dispatchJson.createdSubIssues[2].blockedBy.includes(dispatchJson.createdSubIssues[1].id));
    assert.ok(dispatchJson.dispatchedTask?.id);

    // 4. GitHub config validation (reject invalid env var name) & bidirectional sync
    const badGhRes = await fetch(`${baseUrl}/api/linear/github/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: 'example-org',
        repo: 'ops-console',
        tokenEnvVar: 'not valid env!',
      }),
    });
    assert.equal(badGhRes.status, 400);

    const ghCfgRes = await fetch(`${baseUrl}/api/linear/github/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        owner: 'example-org',
        repo: 'ops-console',
        defaultBranch: 'main',
        syncDirection: 'bidirectional',
        tokenEnvVar: 'GITHUB_TOKEN',
      }),
    });
    assert.equal(ghCfgRes.status, 200);

    const syncRes = await fetch(`${baseUrl}/api/linear/github/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: 'bidirectional' }),
    });
    assert.equal(syncRes.status, 200);
    const syncJson = await syncRes.json();
    assert.equal(syncJson.ok, true);
    assert.equal(syncJson.repo, 'example-org/ops-console');
    assert.ok(syncJson.syncedAt);

    // 5. Delete Issue B cleanly
    const delRes = await fetch(`${baseUrl}/api/linear/issues/${encodeURIComponent(issueB.id)}`, {
      method: 'DELETE',
    });
    assert.equal(delRes.status, 200);
  } finally {
    await cleanup();
  }
});

test('Bot Fleet APIs: create, toggle, trigger event -> auto Linear Issue -> Commander dispatch, and delete', async () => {
  const { baseUrl, cleanup } = await startTestServer();
  try {
    const listRes = await fetch(`${baseUrl}/api/bots`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.ok, true);
    assert.ok(listJson.bots.length >= 3);

    // Create a new custom release Bot
    const createRes = await fetch(`${baseUrl}/api/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '发布守护 Bot',
        handle: '@release-guard-bot',
        channel: 'github',
        role: 'commander-bridge',
        webhookEnvVar: 'OPS_TEST_BOT_TOKEN',
        triggerKeywords: ['/release', '/hotfix'],
        autoCreateIssue: true,
        autoDispatchCommander: true,
      }),
    });
    assert.equal(createRes.status, 201);
    const createdBot = (await createRes.json()).bot;
    assert.equal(createdBot.handle, '@release-guard-bot');
    assert.equal(createdBot.enabled, true);

    // Trigger an event on the Bot and verify end-to-end Linear Issue + Commander sub-issue creation
    const trigRes = await fetch(`${baseUrl}/api/bots/${encodeURIComponent(createdBot.id)}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '修复生产发布回滚超时',
        message: '/hotfix 生产发布健康检查超过 30 秒，请总指挥介入排查',
        priority: 'urgent',
        dispatchCommander: true,
      }),
    });
    assert.equal(trigRes.status, 200);
    const trigJson = await trigRes.json();
    assert.equal(trigJson.ok, true);
    assert.ok(trigJson.createdIssue?.identifier);
    assert.equal(trigJson.dispatchResult?.createdSubIssues?.length, 3);
    assert.equal(trigJson.bot.stats.eventsReceived, 1);
    assert.equal(trigJson.bot.stats.issuesCreated, 1);
    assert.equal(trigJson.bot.stats.tasksDispatched, 1);

    // Disable bot and verify disabled bot rejects trigger with 409
    const disableRes = await fetch(`${baseUrl}/api/bots/${encodeURIComponent(createdBot.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(disableRes.status, 200);

    const disabledTrigRes = await fetch(
      `${baseUrl}/api/bots/${encodeURIComponent(createdBot.id)}/trigger`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'should reject while disabled' }),
      },
    );
    assert.equal(disabledTrigRes.status, 409);

    // Delete bot
    const delBotRes = await fetch(`${baseUrl}/api/bots/${encodeURIComponent(createdBot.id)}`, {
      method: 'DELETE',
    });
    assert.equal(delBotRes.status, 200);
  } finally {
    await cleanup();
  }
});

test('Linear and Bot mutating routes strictly enforce readOnly=true -> 403', async () => {
  const { baseUrl, cleanup } = await startTestServer({ readOnly: true });
  try {
    const getLin = await fetch(`${baseUrl}/api/linear/state`);
    assert.equal(getLin.status, 200);

    const getBots = await fetch(`${baseUrl}/api/bots`);
    assert.equal(getBots.status, 200);

    const postIssue = await fetch(`${baseUrl}/api/linear/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'blocked in readonly' }),
    });
    assert.equal(postIssue.status, 403);

    const postSync = await fetch(`${baseUrl}/api/linear/github/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(postSync.status, 403);

    const postBot = await fetch(`${baseUrl}/api/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'blocked-bot', channel: 'webhook', role: 'custom' }),
    });
    assert.equal(postBot.status, 403);
  } finally {
    await cleanup();
  }
});
