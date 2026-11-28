import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyHotConfigUpdate, loadConfig } from '../src/config.mjs';
import { ControlPlaneEventBus } from '../src/events.mjs';
import { runCmd } from '../src/exec.mjs';
import { StructuredLogger } from '../src/logger.mjs';
import { PluginManager } from '../src/plugins/manager.mjs';
import { createOpsConsole } from '../src/server.mjs';
import {
  buildIncrementalPlan,
  classifyChangedFile,
  IncrementalUpdater,
  parseGitNameStatus,
  RESERVED_UPDATE_LAYERS,
  RESERVED_UPDATE_SSE_EVENTS,
} from '../src/updater.mjs';

async function mkTmpDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function gitIn(cwd, args) {
  return runCmd('git', args, {
    cwd,
    timeout: 15_000,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Ops Test',
      GIT_AUTHOR_EMAIL: 'ops-test@example.com',
      GIT_COMMITTER_NAME: 'Ops Test',
      GIT_COMMITTER_EMAIL: 'ops-test@example.com',
    },
  });
}

test('classifyChangedFile and buildIncrementalPlan classify layers including reserved PR2/PR3 hooks', () => {
  assert.equal(classifyChangedFile('public/index.html'), 'frontend');
  assert.equal(classifyChangedFile('web/views/OpsView.tsx'), 'frontend');
  assert.equal(classifyChangedFile('plugins/demo/index.mjs'), 'plugins');
  assert.equal(classifyChangedFile('src/server.mjs'), 'backend');
  assert.equal(classifyChangedFile('package.json'), 'deps');
  assert.equal(classifyChangedFile('agents/router.agent.json'), 'agent-declarative');
  assert.equal(classifyChangedFile('skills/review/SKILL.md'), 'agent-declarative');
  assert.equal(classifyChangedFile('src/modules/agent-runtime.mjs'), 'module-hot-swap');
  assert.equal(classifyChangedFile('src/agent-modules/orchestrator.mjs'), 'module-hot-swap');

  assert.deepEqual(RESERVED_UPDATE_LAYERS, ['agent-declarative', 'module-hot-swap']);
  assert.deepEqual(RESERVED_UPDATE_SSE_EVENTS, ['module_reloaded', 'pr_applied']);

  const parsed = parseGitNameStatus('M\tpublic/index.html\nA\tplugins/custom/index.mjs\nM\tagents/triage.prompt.md\n');
  const hotPlan = buildIncrementalPlan(parsed);
  assert.equal(hotPlan.strategy, 'hot-reload');
  assert.equal(hotPlan.requiresRestart, false);
  assert.equal(hotPlan.hotReloadOnly, true);
  assert.deepEqual(hotPlan.hotReloadScopes, ['assets', 'plugins', 'agent-declarative']);

  const modSwapPlan = buildIncrementalPlan(['src/agent-modules/orchestrator.mjs']);
  assert.equal(modSwapPlan.strategy, 'module-hot-swap');
  assert.equal(modSwapPlan.requiresRestart, false);
  assert.deepEqual(modSwapPlan.hotReloadScopes, ['module-hot-swap']);

  const buildPlan = buildIncrementalPlan(['web/App.tsx']);
  assert.equal(buildPlan.strategy, 'hot-reload-with-build');
  assert.equal(buildPlan.needsFrontendBuild, true);
  assert.equal(buildPlan.requiresRestart, false);

  const backendPlan = buildIncrementalPlan(['src/server.mjs', 'public/styles.css']);
  assert.equal(backendPlan.strategy, 'rolling-restart');
  assert.equal(backendPlan.requiresRestart, true);
  assert.equal(backendPlan.hotReloadOnly, false);
});

test('applyHotConfigUpdate mutates hot sections in place and flags restart-required fields', () => {
  const current = loadConfig({ cli: { demo: true, hotReload: false }, env: {} });
  const next = loadConfig({ cli: { demo: true, hotReload: false }, env: {} });
  next.console.title = 'Hot Updated Title';
  next.logging.level = 'debug';
  next.console.port = current.console.port + 1;

  const diff = applyHotConfigUpdate(current, next);
  assert.equal(diff.changed, true);
  assert.ok(diff.changedSections.includes('console'));
  assert.ok(diff.changedSections.includes('logging'));
  assert.deepEqual(diff.restartRequiredFields, ['console.port']);
  assert.equal(current.console.title, 'Hot Updated Title');
  assert.equal(current.logging.level, 'debug');
  assert.notEqual(current.console.port, next.console.port);
});

test('IncrementalUpdater hot-reloads config, external plugins (ESM cache bust), assets, and reserved hooks', async () => {
  const tmp = await mkTmpDir('ops-updater-hot-');
  const dataDir = path.join(tmp, 'data');
  const pluginsDir = path.join(tmp, 'plugins');
  const publicDir = path.join(tmp, 'public');
  const configPath = path.join(tmp, 'config.json');
  await fs.mkdir(path.join(pluginsDir, 'hot-sample'), { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });

  await fs.writeFile(path.join(publicDir, 'index.html'), '<html><body>v1</body></html>', 'utf8');
  await fs.writeFile(
    path.join(pluginsDir, 'hot-sample', 'index.mjs'),
    `export default {
      id: 'hot-sample',
      name: 'Hot Sample v1',
      category: 'custom',
      version: '1.0.0',
      officialSpec: { protocol: 'HTTP', vendor: 'Test' },
      collect: async () => ({ status: 'ok', summary: 'v1' }),
    };\n`,
    'utf8',
  );
  await fs.writeFile(
    configPath,
    JSON.stringify({
      console: { title: 'Initial Title', dataDir, readOnly: false },
      plugins: { dir: pluginsDir },
      updates: { enabled: true, watchConfig: false, watchPlugins: false, watchPublic: false },
      logging: { level: 'info' },
    }),
    'utf8',
  );

  const config = loadConfig({ cli: { configPath }, env: {} });
  const logger = new StructuredLogger({ dataDir, silentStdout: true });
  const eventBus = new ControlPlaneEventBus();
  const emitted = [];
  eventBus.emitter.on('event', (evt) => emitted.push(evt));

  const pluginManager = new PluginManager({ config, logger });
  await pluginManager.loadExternalPlugins();
  assert.equal(pluginManager.plugins.get('hot-sample')?.version, '1.0.0');

  let assetsInvalidatedCount = 0;
  const updater = new IncrementalUpdater({
    config,
    logger,
    pluginManager,
    eventBus,
    repoDir: tmp,
    publicDir,
    onAssetsInvalidated: () => {
      assetsInvalidatedCount += 1;
    },
    onDeclarativeReload: async () => ({ reloaded: true, rulesCount: 3 }),
    onModuleReload: async ({ moduleId }) => ({
      moduleId: moduleId || 'agent-core',
      revision: 'rev-slot-b',
      prevRevision: 'rev-slot-a',
      slot: 'green',
    }),
  });
  await updater.init();
  const initialRev = updater.assetsRevision;

  // Mutate config, plugin, and public HTML
  await fs.writeFile(
    configPath,
    JSON.stringify({
      console: { title: 'Reloaded Title', dataDir, readOnly: false },
      plugins: { dir: pluginsDir },
      updates: { enabled: true, watchConfig: false, watchPlugins: false, watchPublic: false },
      logging: { level: 'debug' },
    }),
    'utf8',
  );
  await fs.writeFile(
    path.join(pluginsDir, 'hot-sample', 'index.mjs'),
    `export default {
      id: 'hot-sample',
      name: 'Hot Sample v2',
      category: 'custom',
      version: '2.0.0',
      officialSpec: { protocol: 'HTTP', vendor: 'Test' },
      collect: async () => ({ status: 'ok', summary: 'v2' }),
    };\n`,
    'utf8',
  );
  await fs.writeFile(path.join(publicDir, 'index.html'), '<html><body>v2</body></html>', 'utf8');

  const res = await updater.hotReload({
    scopes: ['config', 'plugins', 'assets', 'agent-declarative', 'module-hot-swap'],
    reason: 'manual',
    actor: 'test',
    moduleId: 'agent-orchestrator',
    prMeta: { prNumber: 77, prUrl: 'https://github.com/example/ops-console/pull/77' },
  });

  assert.equal(res.ok, true);
  assert.equal(config.console.title, 'Reloaded Title');
  assert.equal(pluginManager.plugins.get('hot-sample')?.version, '2.0.0');
  assert.notEqual(updater.assetsRevision, initialRev);
  assert.equal(assetsInvalidatedCount, 1);
  assert.ok(emitted.some((e) => e.type === 'config_reloaded'));
  assert.ok(emitted.some((e) => e.type === 'plugins_reloaded'));
  assert.ok(emitted.some((e) => e.type === 'assets_updated'));
  assert.ok(emitted.some((e) => e.type === 'agent_declarative_reloaded'));
  const modEvt = emitted.find((e) => e.type === 'module_reloaded');
  assert.equal(modEvt?.payload?.moduleId, 'agent-orchestrator');
  assert.equal(modEvt?.payload?.prNumber, 77);

  // Delete external plugin and verify incremental removal
  await fs.rm(path.join(pluginsDir, 'hot-sample'), { recursive: true, force: true });
  const removeRes = await updater.hotReload({ scopes: ['plugins'], reason: 'manual', actor: 'test' });
  assert.deepEqual(removeRes.results.plugins.removed, ['hot-sample']);
  assert.equal(pluginManager.plugins.has('hot-sample'), false);

  updater.stopWatchers();
  await fs.rm(tmp, { recursive: true, force: true });
});

test('IncrementalUpdater checks, applies fast-forward incremental update, and rolls back on real git repos', async () => {
  const tmp = await mkTmpDir('ops-updater-git-');
  const bareDir = path.join(tmp, 'remote.git');
  const workDir = path.join(tmp, 'work');
  const authorDir = path.join(tmp, 'author');
  const dataDir = path.join(tmp, 'data');

  await fs.mkdir(bareDir, { recursive: true });
  await gitIn(bareDir, ['init', '--bare', '-b', 'main']);
  await gitIn(tmp, ['clone', bareDir, authorDir]);
  await fs.mkdir(path.join(authorDir, 'public'), { recursive: true });
  await fs.writeFile(path.join(authorDir, 'public', 'index.html'), '<h1>v1</h1>\n', 'utf8');
  await gitIn(authorDir, ['add', '.']);
  await gitIn(authorDir, ['commit', '-m', 'init v1']);
  await gitIn(authorDir, ['push', '-u', 'origin', 'main']);

  await gitIn(tmp, ['clone', '-b', 'main', bareDir, workDir]);
  const baseSha = (await gitIn(workDir, ['rev-parse', 'HEAD'])).stdout.trim();

  // Push an incremental frontend-only commit to bare remote
  await fs.writeFile(path.join(authorDir, 'public', 'index.html'), '<h1>v2 hot</h1>\n', 'utf8');
  await gitIn(authorDir, ['add', '.']);
  await gitIn(authorDir, ['commit', '-m', 'feat: hot frontend update']);
  await gitIn(authorDir, ['push', 'origin', 'main']);
  const nextSha = (await gitIn(authorDir, ['rev-parse', 'HEAD'])).stdout.trim();

  const config = loadConfig({ cli: { hotReload: false }, env: { OPS_CONSOLE_DATA_DIR: dataDir } });
  config.security.requireCriticalConfirm = true;
  const logger = new StructuredLogger({ dataDir, silentStdout: true });
  const eventBus = new ControlPlaneEventBus();
  const events = [];
  eventBus.emitter.on('event', (evt) => events.push(evt));

  const updater = new IncrementalUpdater({
    config,
    logger,
    eventBus,
    repoDir: workDir,
    publicDir: path.join(workDir, 'public'),
  });
  await updater.init();

  const check = await updater.checkForUpdates({ remote: 'origin', branch: 'main', fetchRemote: true });
  assert.equal(check.hasUpdate, true);
  assert.equal(check.behind, 1);
  assert.equal(check.plan.strategy, 'hot-reload');
  assert.equal(check.plan.requiresRestart, false);

  // Missing confirmToken should fail with 409
  await assert.rejects(
    () => updater.applyIncrementalUpdate({ remote: 'origin', branch: 'main' }),
    (err) => err.statusCode === 409 && err.requiresConfirm === true,
  );

  const applyToken = updater.issueConfirmToken('apply').confirmToken;
  const applied = await updater.applyIncrementalUpdate({
    remote: 'origin',
    branch: 'main',
    confirmToken: applyToken,
    prMeta: { prNumber: 99, prUrl: 'https://github.com/example/ops-console/pull/99' },
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.status, 'applied_hot');
  assert.equal(applied.fromCommit, baseSha);
  assert.equal(applied.toCommit, nextSha);
  assert.equal(applied.restartRequired, false);
  assert.ok(events.some((e) => e.type === 'update_applied'));
  assert.ok(events.some((e) => e.type === 'pr_applied' && e.payload.prNumber === 99));

  // Rollback back to baseSha
  const rbToken = updater.issueConfirmToken('rollback').confirmToken;
  const rolled = await updater.rollbackToCommit({ commit: baseSha, confirmToken: rbToken });
  assert.equal(rolled.ok, true);
  assert.equal(rolled.toCommit, baseSha);
  const htmlAfterRb = await fs.readFile(path.join(workDir, 'public', 'index.html'), 'utf8');
  assert.equal(htmlAfterRb, '<h1>v1</h1>\n');
  assert.ok(events.some((e) => e.type === 'update_rolled_back'));

  updater.stopWatchers();
  await fs.rm(tmp, { recursive: true, force: true });
});

test('HTTP /api/updates/* routes enforce readOnly 403 and confirmToken 409', async () => {
  const tmp = await mkTmpDir('ops-updater-http-');
  const dataDir = path.join(tmp, 'data');

  // 1. Read-only mode blocks mutations
  const roConfig = loadConfig({
    cli: { demo: true, readOnly: true, hotReload: false },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  roConfig.console.port = 0;
  const roInstance = createOpsConsole({ config: roConfig, silentStdout: true });
  const { addresses: roAddrs } = await roInstance.start();
  const roBase = roAddrs[0].url;
  try {
    const st = await fetch(`${roBase}/api/updates/status`);
    assert.equal(st.status, 200);
    const stJson = await st.json();
    assert.equal(stJson.ok, true);
    assert.deepEqual(stJson.extensionHooks.layers, ['agent-declarative', 'module-hot-swap']);

    const reloadRes = await fetch(`${roBase}/api/updates/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopes: ['assets'] }),
    });
    assert.equal(reloadRes.status, 403);
  } finally {
    await roInstance.stop();
  }

  // 2. Writable mode with confirmToken enforcement
  const rwConfig = loadConfig({
    cli: { demo: true, hotReload: false },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  rwConfig.console.port = 0;
  rwConfig.security.requireCriticalConfirm = true;
  const rwInstance = createOpsConsole({ config: rwConfig, silentStdout: true });
  const { addresses: rwAddrs } = await rwInstance.start();
  const rwBase = rwAddrs[0].url;
  try {
    const metaRes = await fetch(`${rwBase}/api/meta`);
    const metaJson = await metaRes.json();
    assert.ok(metaJson.updates?.assetsRevision);

    const missingConfirm = await fetch(`${rwBase}/api/updates/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(missingConfirm.status, 409);
    const missingJson = await missingConfirm.json();
    assert.equal(missingJson.requiresConfirm, true);

    const confirmRes = await fetch(`${rwBase}/api/updates/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'apply' }),
    });
    assert.equal(confirmRes.status, 200);
    const { confirmToken } = await confirmRes.json();
    assert.ok(confirmToken);

    const appliedRes = await fetch(`${rwBase}/api/updates/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmToken }),
    });
    assert.equal(appliedRes.status, 200);
    const appliedJson = await appliedRes.json();
    assert.equal(appliedJson.ok, true);
    assert.equal(appliedJson.status, 'demo_applied');
  } finally {
    await rwInstance.stop();
  }

  await fs.rm(tmp, { recursive: true, force: true });
});
