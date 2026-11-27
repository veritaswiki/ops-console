import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LinearCommanderManager } from '../src/linear-commander.mjs';
import { BotFleetManager, parseGithubWorkflowMeta } from '../src/bot-fleet.mjs';

test('LinearCommanderManager in live mode (demo=false) starts clean without mock seeds and clears legacy demo seed files', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-live-linear-'));
  try {
    const mgr = new LinearCommanderManager({ demo: false, console: { dataDir } }, null);
    await mgr.init();
    const state = mgr.getState();
    assert.equal(state.mode, 'live');
    assert.equal(state.issues.length, 0);
    assert.equal(state.projects.length, 0);
    assert.equal(state.commanderLogs.length, 0);

    // Creating a real issue in live mode auto-provisions a workspace project
    const created = await mgr.createIssue({
      title: '验证真实实网任务创建',
      priority: 'high',
      status: 'todo',
    });
    assert.equal(created.ok, true);
    assert.equal(created.issue.assigneeName, '未指派');
    assert.equal(mgr.getState().projects.length, 1);

    // Legacy demo-simulated seed file on disk is purged in live mode
    const legacyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-live-legacy-'));
    try {
      await fs.writeFile(
        path.join(legacyDir, 'linear-projects.json'),
        JSON.stringify({
          githubConfig: { owner: 'ops-console', repo: 'ops-console', lastSyncMode: 'demo-simulated' },
          projects: [{ id: 'proj-ops-core', key: 'OPS', name: 'Fake' }],
          issues: [{ id: 'iss-101', identifier: 'OPS-101', title: 'Fake' }],
        }),
      );
      const legacyMgr = new LinearCommanderManager({ demo: false, console: { dataDir: legacyDir } }, null);
      await legacyMgr.init();
      assert.equal(legacyMgr.getState().issues.length, 0);
      assert.equal(legacyMgr.getState().projects.length, 0);
    } finally {
      await fs.rm(legacyDir, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('BotFleetManager in live mode (demo=false) starts empty, purges legacy mock bots, and discovers real workflow metadata', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-live-bots-'));
  try {
    const mgr = new BotFleetManager({ demo: false, console: { dataDir } }, null);
    await mgr.init();
    const res = await mgr.listWithIntegrations({ githubOverview: null });
    assert.equal(res.mode, 'live');
    assert.equal(res.bots.length, 0);
    assert.equal(res.activities.length, 0);
    assert.ok(Array.isArray(res.liveIntegrations.workflows));
    assert.ok(Array.isArray(res.liveIntegrations.envStatus));

    const parsed = parseGithubWorkflowMeta('ci.yml', 'name: CI Check\non:\n  push:\n  pull_request:\njobs:\n  test:\n');
    assert.equal(parsed.file, 'ci.yml');
    assert.equal(parsed.name, 'CI Check');
    assert.deepEqual(parsed.triggers, ['push', 'pull_request']);

    // Legacy mock seed file is purged in live mode
    const legacyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-live-bots-legacy-'));
    try {
      await fs.writeFile(
        path.join(legacyDir, 'bots.json'),
        JSON.stringify({
          bots: [{ id: 'bot-github-commander', name: 'Fake' }],
          activities: [{ id: 'botact-1', message: 'PR #418 收到 /plan 指令，已同步至 OPS-101' }],
        }),
      );
      const legacyMgr = new BotFleetManager({ demo: false, console: { dataDir: legacyDir } }, null);
      await legacyMgr.init();
      assert.equal(legacyMgr.list().bots.length, 0);
    } finally {
      await fs.rm(legacyDir, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
