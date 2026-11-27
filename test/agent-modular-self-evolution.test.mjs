import assert from 'node:assert/strict';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { A2AOrchestrator } from '../src/a2a-orchestrator.mjs';
import {
  AgentModuleHost,
  parseSkillFrontmatter,
  validateDeclarativeAgentManifest,
  validateModuleExport,
} from '../src/agent-module-host.mjs';
import { loadConfig } from '../src/config.mjs';
import { ControlPlaneEventBus } from '../src/events.mjs';
import { runCmd } from '../src/exec.mjs';
import { StructuredLogger } from '../src/logger.mjs';
import {
  scanPatchContentForSecrets,
  SelfEvolutionEngine,
  validateEvolutionBranch,
  validateEvolutionPatchPath,
} from '../src/self-evolution.mjs';
import { createOpsConsole } from '../src/server.mjs';
import { IncrementalUpdater } from '../src/updater.mjs';

async function mkTmpDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function gitIn(cwd, args) {
  return runCmd('git', args, {
    cwd,
    timeout: 20_000,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_AUTHOR_NAME: 'Ops Test',
      GIT_AUTHOR_EMAIL: 'ops-test@example.com',
      GIT_COMMITTER_NAME: 'Ops Test',
      GIT_COMMITTER_EMAIL: 'ops-test@example.com',
    },
  });
}

function buildHotModuleSource({
  id = 'sample-mod',
  name = 'Sample Hot Module',
  version = '1.0.0',
  tag = 'v1',
  healthy = true,
  healthyOnlyInVerify = false,
} = {}) {
  const healthBody = healthyOnlyInVerify
    ? `if (ctx?.slot === 'verify') return { ok: true, detail: 'verify-slot-ok' };
  return { ok: false, detail: 'runtime slot degraded for ${tag}' };`
    : healthy
      ? `return { ok: true, detail: 'healthy-${tag}' };`
      : `return { ok: false, detail: 'unhealthy-${tag}' };`;

  return `export const manifest = {
  id: ${JSON.stringify(id)},
  name: ${JSON.stringify(name)},
  version: ${JSON.stringify(version)},
  description: 'Test hot-swap module ${tag}',
  capabilities: ['diagnostics', ${JSON.stringify(tag)}],
  layer: 'module-hot-swap',
};

let calls = 0;

export async function init() {
  calls = 0;
  return { ok: true, tag: ${JSON.stringify(tag)} };
}

export async function health(ctx = {}) {
  ${healthBody}
}

export async function handle(input = {}, ctx = {}) {
  calls += 1;
  return {
    moduleId: manifest.id,
    version: manifest.version,
    tag: ${JSON.stringify(tag)},
    mode: String(input?.mode || 'summary'),
    calls,
    slot: ctx.slot || null,
    revision: ctx.revision || null,
  };
}

export async function dispose() {
  return { ok: true, calls };
}
`;
}

function buildDeclarativeAgentJson({
  id = 'decl-sample-agent',
  name = 'Sample Declarative Agent v1',
  modelHint = 'gpt-5-mini',
  skills = ['log-audit', 'health-probe'],
  enabled = true,
} = {}) {
  return `${JSON.stringify(
    {
      id,
      name,
      harness: 'custom-a2a',
      nodeId: 'hub-primary',
      agentCardUrl: 'http://127.0.0.1:9109/.well-known/agent-card.json',
      rpcUrl: 'http://127.0.0.1:9109/a2a',
      modelHint,
      reasoningEffort: 'medium',
      skills,
      description: `Declarative agent ${name}`,
      enabled,
    },
    null,
    2,
  )}\n`;
}

async function createTempEvolutionRepo(tmpRoot, { moduleId = 'sample-mod', agentId = 'decl-sample-agent' } = {}) {
  const bareDir = path.join(tmpRoot, 'remote.git');
  const seedDir = path.join(tmpRoot, 'seed');
  const repoDir = path.join(tmpRoot, 'repo');

  await fs.mkdir(bareDir, { recursive: true });
  await gitIn(bareDir, ['init', '--bare', '-b', 'main']);
  await gitIn(tmpRoot, ['clone', bareDir, seedDir]);

  await fs.mkdir(path.join(seedDir, 'src', 'agent-modules'), { recursive: true });
  await fs.mkdir(path.join(seedDir, 'agents'), { recursive: true });
  await fs.mkdir(path.join(seedDir, 'skills', 'incident-triage'), { recursive: true });
  await fs.mkdir(path.join(seedDir, 'public'), { recursive: true });

  await fs.writeFile(path.join(seedDir, '.gitignore'), 'data/\n.worktrees/\n', 'utf8');
  await fs.writeFile(
    path.join(seedDir, 'src', 'agent-modules', `${moduleId}.mjs`),
    buildHotModuleSource({ id: moduleId, name: 'Ops Diagnostics Hot Module', version: '1.0.0', tag: 'v1' }),
    'utf8',
  );
  await fs.writeFile(
    path.join(seedDir, 'agents', 'sample.agent.json'),
    buildDeclarativeAgentJson({ id: agentId, name: 'Sample Agent v1', skills: ['log-audit', 'ops-triage'] }),
    'utf8',
  );
  await fs.writeFile(
    path.join(seedDir, 'skills', 'incident-triage', 'SKILL.md'),
    '---\nname: Incident Triage\ndescription: Summarize alerts and probe status\nversion: 1.0.0\n---\n# Incident Triage\n',
    'utf8',
  );
  await fs.writeFile(path.join(seedDir, 'public', 'index.html'), '<!doctype html><html><body>ops</body></html>\n', 'utf8');

  await gitIn(seedDir, ['add', '.']);
  await gitIn(seedDir, ['commit', '-m', 'chore: seed initial hot module and declarative agent']);
  await gitIn(seedDir, ['push', '-u', 'origin', 'main']);
  await gitIn(tmpRoot, ['clone', '-b', 'main', bareDir, repoDir]);

  return { bareDir, repoDir };
}

async function requestJson(baseUrl, pathname, { method = 'GET', body } = {}) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json };
}

test('AgentModuleHost performs dual-slot A/B hot-swap, preserves active slot on broken module, and rolls back instantaneously', async () => {
  const tmp = await mkTmpDir('ops-mod-host-ab-');
  const repoDir = path.join(tmp, 'repo');
  const dataDir = path.join(tmp, 'data');
  const modPath = path.join(repoDir, 'src', 'agent-modules', 'sample-mod.mjs');

  await fs.mkdir(path.dirname(modPath), { recursive: true });
  await fs.writeFile(
    modPath,
    buildHotModuleSource({ id: 'sample-mod', name: 'Sample Module', version: '1.0.0', tag: 'v1' }),
    'utf8',
  );

  const config = loadConfig({ cli: { demo: true, hotReload: false }, env: { OPS_CONSOLE_DATA_DIR: dataDir } });
  const logger = new StructuredLogger({ dataDir, silentStdout: true });
  const eventBus = new ControlPlaneEventBus();
  const events = [];
  eventBus.emitter.on('event', (evt) => events.push(evt));

  const host = new AgentModuleHost({ config, repoDir, logger, eventBus });
  try {
    const initialState = await host.init();
    assert.equal(initialState.ok, true);
    assert.equal(initialState.modules.length, 1);
    assert.equal(initialState.modules[0].id, 'sample-mod');
    assert.equal(initialState.modules[0].activeSlot, 'A');
    assert.equal(initialState.modules[0].canRollback, false);
    assert.equal(initialState.modules[0].version, '1.0.0');
    assert.equal(initialState.modules[0].healthy, true);

    const v1Invoke = await host.invokeModule('sample-mod', { mode: 'check' });
    assert.equal(v1Invoke.ok, true);
    assert.equal(v1Invoke.slot, 'A');
    assert.equal(v1Invoke.version, '1.0.0');
    assert.equal(v1Invoke.result.tag, 'v1');
    assert.equal(v1Invoke.result.mode, 'check');
    const v1Revision = v1Invoke.revision;

    await fs.writeFile(
      modPath,
      buildHotModuleSource({ id: 'sample-mod', name: 'Sample Module', version: '2.0.0', tag: 'v2' }),
      'utf8',
    );
    const swapV2 = await host.reloadModule('sample-mod', { reason: 'upgrade-v2', actor: 'test' });
    assert.equal(swapV2.ok, true);
    assert.equal(swapV2.slot, 'B');
    assert.notEqual(swapV2.revision, v1Revision);
    assert.equal(swapV2.module.version, '2.0.0');
    assert.equal(swapV2.module.activeSlot, 'B');
    assert.equal(swapV2.module.canRollback, true);
    assert.equal(swapV2.module.slots.A.version, '1.0.0');
    assert.equal(swapV2.module.slots.B.version, '2.0.0');

    const v2Invoke = await host.invokeModule('sample-mod', { mode: 'post-swap' });
    assert.equal(v2Invoke.slot, 'B');
    assert.equal(v2Invoke.version, '2.0.0');
    assert.equal(v2Invoke.result.tag, 'v2');
    assert.ok(events.some((evt) => evt.type === 'module_reloaded' && evt.payload.slot === 'B' && evt.payload.version === '2.0.0'));

    await fs.writeFile(
      modPath,
      buildHotModuleSource({ id: 'sample-mod', name: 'Sample Module', version: '3.0.0-bad', tag: 'v3-unhealthy', healthy: false }),
      'utf8',
    );
    await assert.rejects(
      () => host.reloadModule('sample-mod', { force: true, reason: 'bad-health', actor: 'test' }),
      (err) => err.statusCode === 422 && err.rolledBack === true && err.preservedSlot === 'B',
    );

    const afterUnhealthy = await host.invokeModule('sample-mod');
    assert.equal(afterUnhealthy.slot, 'B');
    assert.equal(afterUnhealthy.version, '2.0.0');
    assert.equal(afterUnhealthy.result.tag, 'v2');

    await fs.writeFile(modPath, 'export const manifest = { broken syntax !!!\n', 'utf8');
    await assert.rejects(
      () => host.reloadModule('sample-mod', { force: true, reason: 'bad-syntax', actor: 'test' }),
      (err) => err.statusCode === 422 && err.rolledBack === true && err.preservedSlot === 'B',
    );

    const afterSyntaxErr = await host.invokeModule('sample-mod');
    assert.equal(afterSyntaxErr.slot, 'B');
    assert.equal(afterSyntaxErr.result.tag, 'v2');
    const stateAfterFailures = host.getState();
    assert.equal(stateAfterFailures.modules[0].activeSlot, 'B');
    assert.equal(stateAfterFailures.modules[0].failedSwaps, 2);

    const rolledBack = await host.rollbackModule('sample-mod', { actor: 'test', reason: 'instant-slot-rollback' });
    assert.equal(rolledBack.ok, true);
    assert.equal(rolledBack.rolledBackFromSlot, 'B');
    assert.equal(rolledBack.activeSlot, 'A');
    assert.equal(rolledBack.revision, v1Revision);

    const afterRollback = await host.invokeModule('sample-mod');
    assert.equal(afterRollback.slot, 'A');
    assert.equal(afterRollback.version, '1.0.0');
    assert.equal(afterRollback.result.tag, 'v1');
    assert.ok(events.some((evt) => evt.type === 'module_reloaded' && evt.payload.slot === 'A' && evt.payload.reason === 'instant-slot-rollback'));
  } finally {
    await host.dispose();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('AgentModuleHost syncs declarative .agent.json and skills/SKILL.md into A2AOrchestrator on add, update, and delete', async () => {
  const tmp = await mkTmpDir('ops-mod-host-decl-');
  const repoDir = path.join(tmp, 'repo');
  const dataDir = path.join(tmp, 'data');
  const agentFile = path.join(repoDir, 'agents', 'triage.agent.json');
  const skillFile = path.join(repoDir, 'skills', 'log-analyzer', 'SKILL.md');

  await fs.mkdir(path.dirname(agentFile), { recursive: true });
  await fs.mkdir(path.dirname(skillFile), { recursive: true });

  await fs.writeFile(
    agentFile,
    buildDeclarativeAgentJson({
      id: 'decl-triage',
      name: 'Declarative Triage v1',
      modelHint: 'gpt-5-mini',
      skills: ['ops-triage', 'log-audit'],
      enabled: true,
    }),
    'utf8',
  );
  await fs.writeFile(
    skillFile,
    '---\nname: Log Analyzer\ndescription: Parse structured journald anomalies\nversion: 1.2.0\n---\n# Log Analyzer\n',
    'utf8',
  );

  const config = loadConfig({ cli: { demo: true, hotReload: false }, env: { OPS_CONSOLE_DATA_DIR: dataDir } });
  const logger = new StructuredLogger({ dataDir, silentStdout: true });
  const eventBus = new ControlPlaneEventBus();
  const events = [];
  eventBus.emitter.on('event', (evt) => events.push(evt));

  const a2a = new A2AOrchestrator(config, logger);
  await a2a.init();
  const initialPeerCount = a2a.agents.size;

  const host = new AgentModuleHost({ config, repoDir, a2aOrchestrator: a2a, logger, eventBus });
  try {
    const firstSync = await host.syncDeclarativeAgents({ reason: 'initial', actor: 'test', emitEvent: true });
    assert.equal(firstSync.ok, true);
    assert.equal(firstSync.agentCount, 1);
    assert.equal(firstSync.skillCount, 1);
    assert.ok(firstSync.added.includes('decl-triage'));
    assert.ok(firstSync.added.includes('skill-log-analyzer'));

    const syncedAgent = a2a.agents.get('decl-triage');
    assert.ok(syncedAgent);
    assert.equal(syncedAgent.source, 'declarative');
    assert.equal(syncedAgent.status, 'healthy');
    assert.equal(syncedAgent.name, 'Declarative Triage v1');
    assert.deepEqual(
      syncedAgent.skills.map((skill) => ({ id: skill.id, name: skill.name })),
      [
        { id: 'ops-triage', name: 'ops-triage' },
        { id: 'log-audit', name: 'log-audit' },
      ],
    );
    assert.ok(syncedAgent.skills.every((skill) => typeof skill === 'object' && typeof skill.description === 'string'));

    const syncedSkill = a2a.skillCatalog.get('skill-log-analyzer');
    assert.ok(syncedSkill);
    assert.equal(syncedSkill.name, 'Log Analyzer');
    assert.equal(syncedSkill.version, '1.2.0');
    assert.equal(syncedSkill.provider, 'pi-skill');
    assert.equal(syncedSkill.enabled, true);
    assert.ok(events.some((evt) => evt.type === 'agent_declarative_reloaded' && evt.payload.reason === 'initial'));

    await fs.writeFile(
      agentFile,
      buildDeclarativeAgentJson({
        id: 'decl-triage',
        name: 'Declarative Triage v2',
        modelHint: 'gpt-5-codex',
        skills: ['ops-triage', 'hot-swap-check'],
        enabled: true,
      }),
      'utf8',
    );
    const updateSync = await host.syncDeclarativeAgents({ reason: 'update', actor: 'test', emitEvent: true });
    assert.equal(updateSync.ok, true);
    assert.deepEqual(updateSync.updated, ['decl-triage']);
    assert.ok(updateSync.unchanged.includes('skill-log-analyzer'));

    const updatedAgent = a2a.agents.get('decl-triage');
    assert.equal(updatedAgent.name, 'Declarative Triage v2');
    assert.equal(updatedAgent.modelHint, 'gpt-5-codex');
    assert.deepEqual(
      updatedAgent.skills.map((skill) => skill.id),
      ['ops-triage', 'hot-swap-check'],
    );

    await fs.rm(agentFile, { force: true });
    const deleteSync = await host.syncDeclarativeAgents({ reason: 'delete', actor: 'test', emitEvent: true });
    assert.equal(deleteSync.ok, true);
    assert.deepEqual(deleteSync.removed, ['decl-triage']);
    assert.equal(deleteSync.agentCount, 0);
    assert.equal(a2a.agents.has('decl-triage'), false);
    assert.equal(a2a.agents.size, initialPeerCount);

    const parsedFrontmatter = parseSkillFrontmatter('---\nname: Quick Check\nversion: 2.1.0\n---\nBody', 'fallback');
    assert.equal(parsedFrontmatter.name, 'Quick Check');
    assert.equal(parsedFrontmatter.version, '2.1.0');

    assert.throws(() => validateModuleExport(null), (err) => err.statusCode === 400);
    assert.throws(() => validateDeclarativeAgentManifest({ id: 'bad id with spaces' }), (err) => err.statusCode === 400);
  } finally {
    await host.dispose();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('SelfEvolutionEngine rejects path traversal, protected paths, protected branches, and secret patterns', async () => {
  const tmp = await mkTmpDir('ops-evo-sec-');
  const repoDir = path.join(tmp, 'repo');
  const dataDir = path.join(tmp, 'data');
  await fs.mkdir(repoDir, { recursive: true });

  const config = loadConfig({ cli: { demo: true, hotReload: false }, env: { OPS_CONSOLE_DATA_DIR: dataDir } });
  const engine = new SelfEvolutionEngine({ config, repoDir, dataDir });

  const fakeGithubToken = ['ghp', 'a'.repeat(24)].join('_');
  const fakePrivateKeyHeader = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');
  const fakeApiSecret = ['sk', 'proj', 'unitTestTokenValue123456'].join('-');

  try {
    for (const badPath of ['../escape.mjs', '.env', '.env.local', '.git/config', 'data/self-evolution.json', 'certs/tls.key']) {
      assert.throws(() => validateEvolutionPatchPath(badPath, repoDir), (err) => err.statusCode === 400);
    }
    assert.equal(validateEvolutionPatchPath('src/agent-modules/safe-mod.mjs', repoDir), 'src/agent-modules/safe-mod.mjs');

    for (const badBranch of ['main', 'master', 'HEAD', 'bad..ref', '/leading-slash']) {
      assert.throws(() => validateEvolutionBranch(badBranch), (err) => err.statusCode === 400);
    }
    assert.equal(validateEvolutionBranch('evolve/safe-upgrade'), 'evolve/safe-upgrade');

    assert.ok(scanPatchContentForSecrets(`const token = "${fakeGithubToken}";`).includes('github-pat'));
    assert.ok(scanPatchContentForSecrets(fakePrivateKeyHeader).includes('private-key'));
    assert.ok(scanPatchContentForSecrets(`const key = "${fakeApiSecret}";`).includes('api-secret'));

    await assert.rejects(
      () => engine.createProposal({
        title: 'Traversal attempt',
        filePatches: [{ path: '../escape.mjs', content: 'export const x = 1;\n' }],
      }),
      (err) => err.statusCode === 400,
    );
    await assert.rejects(
      () => engine.createProposal({
        title: 'Env tamper attempt',
        filePatches: [{ path: '.env', content: 'FOO=bar\n' }],
      }),
      (err) => err.statusCode === 400,
    );
    await assert.rejects(
      () => engine.createProposal({
        title: 'Git config tamper attempt',
        filePatches: [{ path: '.git/config', content: '[core]\n' }],
      }),
      (err) => err.statusCode === 400,
    );
    await assert.rejects(
      () => engine.createProposal({
        title: 'Protected branch attempt',
        branch: 'main',
        filePatches: [{ path: 'src/agent-modules/sample-mod.mjs', content: 'export const manifest = { id: "sample-mod" };\n' }],
      }),
      (err) => err.statusCode === 400,
    );
    await assert.rejects(
      () => engine.createProposal({
        title: 'Leaked token attempt',
        filePatches: [{ path: 'src/agent-modules/sample-mod.mjs', content: `export const token = ${JSON.stringify(fakeGithubToken)};\n` }],
      }),
      (err) => err.statusCode === 400 && /secret pattern/i.test(err.message),
    );
    await assert.rejects(
      () => engine.createProposal({
        title: 'Leaked key header attempt',
        filePatches: [{ path: 'src/agent-modules/sample-mod.mjs', content: `export const pem = ${JSON.stringify(fakePrivateKeyHeader)};\n` }],
      }),
      (err) => err.statusCode === 400 && /secret pattern/i.test(err.message),
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('SelfEvolutionEngine full lifecycle: BTW pr_draft promotion, isolated worktree, verify, confirm-gated PR push, hot-swap apply, rollback, cleanup, and 0600 persistence', async () => {
  const tmp = await mkTmpDir('ops-evo-lifecycle-');
  const dataDir = path.join(tmp, 'data');
  const { bareDir, repoDir } = await createTempEvolutionRepo(tmp, {
    moduleId: 'sample-mod',
    agentId: 'decl-sample-agent',
  });

  const config = loadConfig({ cli: { demo: true, hotReload: false }, env: { OPS_CONSOLE_DATA_DIR: dataDir } });
  config.security.requireCriticalConfirm = true;

  const logger = new StructuredLogger({ dataDir, silentStdout: true });
  const eventBus = new ControlPlaneEventBus();
  const events = [];
  eventBus.emitter.on('event', (evt) => events.push(evt));

  const a2a = new A2AOrchestrator(config, logger);
  await a2a.init();

  const moduleHost = new AgentModuleHost({ config, repoDir, a2aOrchestrator: a2a, logger, eventBus });
  await moduleHost.init();

  const updater = new IncrementalUpdater({
    config,
    logger,
    eventBus,
    repoDir,
    publicDir: path.join(repoDir, 'public'),
    onDeclarativeReload: ({ force, reason, actor, prMeta }) =>
      moduleHost.syncDeclarativeAgents({ force, reason, actor, prMeta, emitEvent: false }),
    onModuleReload: ({ moduleId, force, reason, actor, prMeta }) =>
      moduleHost.reloadAllModules({ moduleId, force, reason, actor, prMeta, emitEvent: false }),
  });
  await updater.init();

  const publisherCalls = [];
  const engine = new SelfEvolutionEngine({
    config,
    repoDir,
    dataDir,
    updater,
    moduleHost,
    a2aOrchestrator: a2a,
    logger,
    eventBus,
    prPublisher: async ({ proposal, sandboxDir, commitSha, remote, pushRemote, createPr, draft }) => {
      publisherCalls.push({ proposalId: proposal.id, sandboxDir, commitSha, remote, pushRemote, createPr, draft });
      if (pushRemote) {
        await gitIn(sandboxDir, ['push', '-u', remote, proposal.branch]);
      }
      return {
        number: 108,
        url: 'https://github.com/example/ops-console/pull/108',
        pushed: Boolean(pushRemote),
      };
    },
  });
  await engine.init();

  try {
    const v1Result = await moduleHost.invokeModule('sample-mod');
    assert.equal(v1Result.result.tag, 'v1');
    assert.equal(a2a.agents.get('decl-sample-agent')?.name, 'Sample Agent v1');

    const brokenCreated = await engine.createProposal({
      title: 'Broken module & agent verification test',
      branch: 'evolve/broken-verify',
      filePatches: [
        {
          path: 'src/agent-modules/sample-mod.mjs',
          content: buildHotModuleSource({ id: 'sample-mod', version: '9.9.9', tag: 'v9-broken', healthy: false }),
        },
        {
          path: 'agents/sample.agent.json',
          content: '{"id": "bad id with spaces", "agentCardUrl": "ftp://invalid.example.com"}\n',
        },
      ],
    });
    const brokenId = brokenCreated.proposal.id;
    const brokenSandbox = await engine.prepareSandbox(brokenId, { actor: 'test' });
    assert.equal(brokenSandbox.proposal.status, 'sandbox_ready');
    assert.equal(fsSync.existsSync(brokenSandbox.proposal.sandbox.path), true);

    const mainStatusAfterBrokenSandbox = (await gitIn(repoDir, ['status', '--porcelain'])).stdout.trim();
    assert.equal(mainStatusAfterBrokenSandbox, '');

    const brokenVerify = await engine.verifyProposal(brokenId, { actor: 'test' });
    assert.equal(brokenVerify.ok, true);
    assert.equal(brokenVerify.verified, false);
    assert.equal(brokenVerify.proposal.status, 'failed');
    assert.ok(brokenVerify.proposal.verification.checks.some((check) => !check.ok && check.name.includes('sample-mod.mjs')));
    assert.ok(brokenVerify.proposal.verification.checks.some((check) => !check.ok && check.name.includes('sample.agent.json')));

    await engine.cleanupSandbox(brokenId, { actor: 'test' });
    assert.equal(fsSync.existsSync(brokenSandbox.proposal.sandbox.path), false);

    const openedBtw = await a2a.openBtwThread({
      prompt: 'Upgrade sample-mod to v2 and refresh declarative triage agent skills',
      title: 'BTW sample-mod v2 draft',
    });
    const proposedBtw = await a2a.proposeBtwMerge(openedBtw.thread.id, {
      targetType: 'pr_draft',
      summary: 'Upgrade sample-mod to v2 with declarative sync',
      rationale: 'Verified in isolated BTW thread for zero-downtime hot swap',
    });
    const prDraftSpec = proposedBtw.thread.mergeProposal.prDraftSpec;
    assert.ok(prDraftSpec);

    const v2ModuleSrc = buildHotModuleSource({ id: 'sample-mod', name: 'Sample Module v2', version: '2.0.0', tag: 'v2' });
    const v2AgentJson = buildDeclarativeAgentJson({
      id: 'decl-sample-agent',
      name: 'Sample Agent v2',
      modelHint: 'gpt-5-codex',
      skills: ['log-audit', 'ops-triage', 'hot-swap-v2'],
    });

    const created = await engine.createProposal({
      btwThreadId: openedBtw.thread.id,
      filePatches: [
        { path: 'src/agent-modules/sample-mod.mjs', content: v2ModuleSrc },
        { path: 'agents/sample.agent.json', content: v2AgentJson },
      ],
    });
    assert.equal(created.ok, true);
    assert.equal(created.proposal.btwThreadId, openedBtw.thread.id);
    assert.equal(created.proposal.title, prDraftSpec.title);
    assert.equal(created.proposal.goal, proposedBtw.thread.mergeProposal.summary);
    assert.equal(created.proposal.branch, prDraftSpec.branch);
    assert.equal(created.proposal.hotSwappable, true);
    assert.equal(created.proposal.preflight.ok, true);
    assert.equal(created.proposal.preflight.actionType, 'module-hot-swap');
    assert.notEqual(created.proposal.preflight.verdict, 'block');
    assert.equal(created.proposal.status, 'preflight_checked');

    const proposalId = created.proposal.id;
    const sandboxed = await engine.prepareSandbox(proposalId, { actor: 'test' });
    assert.equal(sandboxed.proposal.status, 'sandbox_ready');
    const sandboxPath = sandboxed.proposal.sandbox.path;
    assert.ok(sandboxed.proposal.sandbox.relPath.startsWith('.worktrees/evolve-'));
    assert.equal(fsSync.existsSync(sandboxPath), true);
    assert.equal((await gitIn(repoDir, ['status', '--porcelain'])).stdout.trim(), '');
    assert.equal(await fs.readFile(path.join(sandboxPath, 'src', 'agent-modules', 'sample-mod.mjs'), 'utf8'), v2ModuleSrc);
    assert.notEqual(await fs.readFile(path.join(repoDir, 'src', 'agent-modules', 'sample-mod.mjs'), 'utf8'), v2ModuleSrc);

    const verified = await engine.verifyProposal(proposalId, { actor: 'test' });
    assert.equal(verified.ok, true);
    assert.equal(verified.verified, true);
    assert.equal(verified.proposal.status, 'verified');
    assert.ok(verified.proposal.verification.checks.some((check) => check.ok && check.name === 'module-contract:src/agent-modules/sample-mod.mjs'));
    assert.ok(verified.proposal.verification.checks.some((check) => check.ok && check.name === 'agent-manifest:agents/sample.agent.json'));

    await assert.rejects(
      () => engine.publishProposalPr(proposalId, { pushRemote: true, createPr: true }),
      (err) => err.statusCode === 409 && err.requiresConfirm === true,
    );
    const wrongActionToken = engine.issueConfirmToken('apply').confirmToken;
    await assert.rejects(
      () => engine.publishProposalPr(proposalId, { confirmToken: wrongActionToken, pushRemote: true, createPr: true }),
      (err) => err.statusCode === 409 && err.requiresConfirm === true,
    );

    const publishToken = engine.issueConfirmToken('publish-pr').confirmToken;
    const published = await engine.publishProposalPr(proposalId, {
      confirmToken: publishToken,
      pushRemote: true,
      createPr: true,
      actor: 'test',
    });
    assert.equal(published.ok, true);
    assert.equal(published.proposal.status, 'pr_opened');
    assert.equal(published.proposal.pr.number, 108);
    assert.equal(published.proposal.pr.url, 'https://github.com/example/ops-console/pull/108');
    assert.equal(published.proposal.pr.pushed, true);
    assert.equal(publisherCalls.length, 1);
    assert.equal(publisherCalls[0].proposalId, proposalId);

    const remoteBranchSha = (await gitIn(bareDir, ['rev-parse', `refs/heads/${published.proposal.branch}`])).stdout.trim();
    assert.equal(remoteBranchSha, published.proposal.pr.commitSha);

    await assert.rejects(
      () => engine.publishProposalPr(proposalId, { confirmToken: publishToken, pushRemote: true, createPr: true }),
      (err) => err.statusCode === 409 && err.requiresConfirm === true,
    );

    await assert.rejects(
      () => engine.applyProposal(proposalId, { applyMode: 'hot-swap' }),
      (err) => err.statusCode === 409 && err.requiresConfirm === true,
    );
    const applyToken = engine.issueConfirmToken('apply').confirmToken;
    const applied = await engine.applyProposal(proposalId, {
      confirmToken: applyToken,
      applyMode: 'hot-swap',
      actor: 'test',
    });
    assert.equal(applied.ok, true);
    assert.equal(applied.mode, 'hot-swap');
    assert.equal(applied.proposal.status, 'applied');
    assert.equal(applied.proposal.applyResult.restartRequired, false);
    assert.equal(await fs.readFile(path.join(repoDir, 'src', 'agent-modules', 'sample-mod.mjs'), 'utf8'), v2ModuleSrc);

    const v2Invoked = await moduleHost.invokeModule('sample-mod');
    assert.equal(v2Invoked.slot, 'B');
    assert.equal(v2Invoked.version, '2.0.0');
    assert.equal(v2Invoked.result.tag, 'v2');
    assert.equal(a2a.agents.get('decl-sample-agent')?.name, 'Sample Agent v2');
    assert.ok(events.some((evt) => evt.type === 'pr_applied' && evt.payload.prNumber === 108));
    assert.ok(events.some((evt) => evt.type === 'module_reloaded' && evt.payload.prNumber === 108));
    assert.ok(events.some((evt) => evt.type === 'agent_declarative_reloaded'));

    await assert.rejects(
      () => engine.rollbackProposal(proposalId),
      (err) => err.statusCode === 409 && err.requiresConfirm === true,
    );
    const rollbackToken = engine.issueConfirmToken('rollback').confirmToken;
    const rolledBack = await engine.rollbackProposal(proposalId, { confirmToken: rollbackToken, actor: 'test' });
    assert.equal(rolledBack.ok, true);
    assert.equal(rolledBack.proposal.status, 'rolled_back');

    const v1Restored = await moduleHost.invokeModule('sample-mod');
    assert.equal(v1Restored.version, '1.0.0');
    assert.equal(v1Restored.result.tag, 'v1');
    assert.equal(a2a.agents.get('decl-sample-agent')?.name, 'Sample Agent v1');

    const cleaned = await engine.cleanupSandbox(proposalId, { actor: 'test' });
    assert.equal(cleaned.ok, true);
    assert.ok(cleaned.proposal.sandbox.cleanedAt);
    assert.equal(fsSync.existsSync(sandboxPath), false);

    const stateStat = await fs.stat(engine.statePath);
    assert.equal(stateStat.mode & 0o777, 0o600);

    const reloadedEngine = new SelfEvolutionEngine({ config, repoDir, dataDir, updater, moduleHost, a2aOrchestrator: a2a, logger });
    const reloadedState = await reloadedEngine.init();
    assert.equal(reloadedState.proposals.length, 2);
    const restoredProposal = reloadedEngine.getProposal(proposalId);
    assert.equal(restoredProposal.status, 'rolled_back');
    assert.equal(restoredProposal.pr.number, 108);
    assert.equal(restoredProposal.btwThreadId, openedBtw.thread.id);

    const nativePushEngine = new SelfEvolutionEngine({ config, repoDir, dataDir: path.join(tmp, 'data-native'), logger });
    await nativePushEngine.init();
    const nativeCreated = await nativePushEngine.createProposal({
      title: 'Native git push verification',
      branch: 'evolve/native-push',
      filePatches: [
        {
          path: 'agents/sample.agent.json',
          content: buildDeclarativeAgentJson({ id: 'decl-sample-agent', name: 'Native Push Agent' }),
        },
      ],
    });
    await nativePushEngine.prepareSandbox(nativeCreated.proposal.id, { actor: 'test' });
    const nativeVerified = await nativePushEngine.verifyProposal(nativeCreated.proposal.id, { actor: 'test' });
    assert.equal(nativeVerified.verified, true);
    const nativePubToken = nativePushEngine.issueConfirmToken('publish-pr').confirmToken;
    const nativePublished = await nativePushEngine.publishProposalPr(nativeCreated.proposal.id, {
      confirmToken: nativePubToken,
      pushRemote: true,
      createPr: false,
      actor: 'test',
    });
    assert.equal(nativePublished.proposal.pr.pushed, true);
    const nativeRemoteSha = (await gitIn(bareDir, ['rev-parse', 'refs/heads/evolve/native-push'])).stdout.trim();
    assert.equal(nativeRemoteSha, nativePublished.proposal.pr.commitSha);
    await nativePushEngine.cleanupSandbox(nativeCreated.proposal.id, { actor: 'test' });
  } finally {
    updater.stopWatchers();
    await moduleHost.dispose();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('SelfEvolutionEngine applyProposal auto-rolls back disk files and active module slot when live hot-swap fails healthcheck', async () => {
  const tmp = await mkTmpDir('ops-evo-autorollback-');
  const dataDir = path.join(tmp, 'data');
  const { repoDir } = await createTempEvolutionRepo(tmp, {
    moduleId: 'sample-mod',
    agentId: 'decl-sample-agent',
  });

  const config = loadConfig({ cli: { demo: true, hotReload: false }, env: { OPS_CONSOLE_DATA_DIR: dataDir } });
  config.security.requireCriticalConfirm = false;
  const logger = new StructuredLogger({ dataDir, silentStdout: true });
  const eventBus = new ControlPlaneEventBus();
  const moduleHost = new AgentModuleHost({ config, repoDir, logger, eventBus });
  await moduleHost.init();

  const updater = new IncrementalUpdater({
    config,
    logger,
    eventBus,
    repoDir,
    publicDir: path.join(repoDir, 'public'),
    onDeclarativeReload: ({ force, reason, actor, prMeta }) =>
      moduleHost.syncDeclarativeAgents({ force, reason, actor, prMeta, emitEvent: false }),
    onModuleReload: ({ moduleId, force, reason, actor, prMeta }) =>
      moduleHost.reloadAllModules({ moduleId, force, reason, actor, prMeta, emitEvent: false }),
  });
  await updater.init();

  const engine = new SelfEvolutionEngine({ config, repoDir, dataDir, updater, moduleHost, logger, eventBus });
  await engine.init();

  try {
    const originalSrc = await fs.readFile(path.join(repoDir, 'src', 'agent-modules', 'sample-mod.mjs'), 'utf8');
    const sneakyModuleSrc = buildHotModuleSource({
      id: 'sample-mod',
      name: 'Sneaky Runtime Unhealthy Module',
      version: '2.1.0-degraded',
      tag: 'v2-degraded',
      healthyOnlyInVerify: true,
    });

    const created = await engine.createProposal({
      title: 'Live slot unhealthy auto-rollback test',
      branch: 'evolve/live-unhealthy',
      filePatches: [{ path: 'src/agent-modules/sample-mod.mjs', content: sneakyModuleSrc }],
    });
    const proposalId = created.proposal.id;

    await engine.prepareSandbox(proposalId, { actor: 'test' });
    const verified = await engine.verifyProposal(proposalId, { actor: 'test' });
    assert.equal(verified.verified, true);
    assert.equal(verified.proposal.status, 'verified');

    await assert.rejects(
      () => engine.applyProposal(proposalId, { applyMode: 'hot-swap', actor: 'test' }),
      (err) => err.statusCode === 422 && err.autoRolledBack === true,
    );

    const restoredOnDisk = await fs.readFile(path.join(repoDir, 'src', 'agent-modules', 'sample-mod.mjs'), 'utf8');
    assert.equal(restoredOnDisk, originalSrc);

    const liveInvoke = await moduleHost.invokeModule('sample-mod');
    assert.equal(liveInvoke.version, '1.0.0');
    assert.equal(liveInvoke.result.tag, 'v1');

    const persistedProposal = engine.getProposal(proposalId);
    assert.equal(persistedProposal.status, 'verified');
    assert.equal(persistedProposal.timeline[0].stage, 'apply_auto_rolled_back');

    await engine.cleanupSandbox(proposalId, { actor: 'test' });
  } finally {
    updater.stopWatchers();
    await moduleHost.dispose();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('HTTP integration via createOpsConsole covers /api/agents/modules/*, /api/evolution/* full cycle, and eventBus events', async () => {
  const tmp = await mkTmpDir('ops-evo-http-');
  const dataDir = path.join(tmp, 'data');
  const { bareDir, repoDir } = await createTempEvolutionRepo(tmp, {
    moduleId: 'ops-diagnostics',
    agentId: 'decl-ops-triage',
  });

  const config = loadConfig({
    rawConfig: {
      console: { dataDir },
      security: {
        requireCriticalConfirm: true,
        mutatingRateLimitPerMinute: 600,
        rateLimitPerMinute: 1200,
      },
    },
    cli: { demo: true, hotReload: false, hosts: '127.0.0.1', webKey: '' },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;

  const publisherCalls = [];
  const app = createOpsConsole({
    config,
    repoDir,
    silentStdout: true,
    evolutionPrPublisher: async ({ proposal, sandboxDir, commitSha, remote, pushRemote }) => {
      publisherCalls.push({ proposalId: proposal.id, commitSha, branch: proposal.branch });
      if (pushRemote) {
        await gitIn(sandboxDir, ['push', '-u', remote, proposal.branch]);
      }
      return {
        number: 88,
        url: 'https://github.com/example/ops-console/pull/88',
        pushed: Boolean(pushRemote),
      };
    },
  });

  const events = [];
  app.eventBus.emitter.on('event', (evt) => events.push(evt));

  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;

  try {
    const listMods = await requestJson(baseUrl, '/api/agents/modules');
    assert.equal(listMods.status, 200);
    assert.equal(listMods.body.ok, true);
    assert.ok(listMods.body.modules.some((mod) => mod.id === 'ops-diagnostics' && mod.activeSlot === 'A'));
    assert.ok(listMods.body.declarativeItems.some((item) => item.id === 'decl-ops-triage'));

    const invokeV1 = await requestJson(baseUrl, '/api/agents/modules/ops-diagnostics/invoke', {
      method: 'POST',
      body: { input: { mode: 'deep' } },
    });
    assert.equal(invokeV1.status, 200);
    assert.equal(invokeV1.body.ok, true);
    assert.equal(invokeV1.body.version, '1.0.0');
    assert.equal(invokeV1.body.result.tag, 'v1');
    assert.equal(invokeV1.body.result.mode, 'deep');

    const reloadAll = await requestJson(baseUrl, '/api/agents/modules/reload', {
      method: 'POST',
      body: { force: true, reason: 'http-reload-all' },
    });
    assert.equal(reloadAll.status, 200);
    assert.equal(reloadAll.body.ok, true);
    assert.equal(reloadAll.body.state.modules[0].activeSlot, 'B');

    const syncDecl = await requestJson(baseUrl, '/api/agents/modules/declarative/sync', {
      method: 'POST',
      body: { force: true, reason: 'http-decl-sync' },
    });
    assert.equal(syncDecl.status, 200);
    assert.equal(syncDecl.body.ok, true);
    assert.equal(syncDecl.body.reload.results['agent-declarative'].agentCount, 1);

    const rollbackSlot = await requestJson(baseUrl, '/api/agents/modules/ops-diagnostics/rollback', {
      method: 'POST',
      body: { reason: 'http-slot-rollback' },
    });
    assert.equal(rollbackSlot.status, 200);
    assert.equal(rollbackSlot.body.activeSlot, 'A');

    const singleReload = await requestJson(baseUrl, '/api/agents/modules/ops-diagnostics/reload', {
      method: 'POST',
      body: { force: true, reason: 'http-single-module-reload' },
    });
    assert.equal(singleReload.status, 200);
    assert.equal(singleReload.body.ok, true);
    assert.equal(singleReload.body.module.activeSlot, 'B');

    const v2DiagSource = buildHotModuleSource({
      id: 'ops-diagnostics',
      name: 'Ops Diagnostics Hot Module v2',
      version: '2.0.0',
      tag: 'v2-http',
    });
    const v2TriageJson = buildDeclarativeAgentJson({
      id: 'decl-ops-triage',
      name: 'Ops Triage Agent v2',
      skills: ['ops-triage', 'log-audit', 'self-evolve'],
    });

    const createRes = await requestJson(baseUrl, '/api/evolution/proposals', {
      method: 'POST',
      body: {
        title: 'HTTP self-evolution v2 upgrade',
        goal: 'Upgrade ops-diagnostics module and triage agent via HTTP API',
        branch: 'evolve/http-v2-upgrade',
        filePatches: [
          { path: 'src/agent-modules/ops-diagnostics.mjs', content: v2DiagSource },
          { path: 'agents/sample.agent.json', content: v2TriageJson },
        ],
      },
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.ok, true);
    const proposalId = createRes.body.proposal.id;
    assert.equal(createRes.body.proposal.status, 'preflight_checked');
    assert.equal(createRes.body.proposal.hotSwappable, true);

    const detailRes = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.proposal.id, proposalId);

    const listRes = await requestJson(baseUrl, '/api/evolution/proposals?status=preflight_checked');
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.proposals.some((item) => item.id === proposalId));

    const sandboxRes = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/sandbox`, {
      method: 'POST',
      body: {},
    });
    assert.equal(sandboxRes.status, 200);
    assert.equal(sandboxRes.body.proposal.status, 'sandbox_ready');
    const sandboxPath = sandboxRes.body.proposal.sandbox.path;
    assert.equal(fsSync.existsSync(sandboxPath), true);

    const verifyRes = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/verify`, {
      method: 'POST',
      body: { runRepoCheck: false },
    });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.verified, true);
    assert.equal(verifyRes.body.proposal.status, 'verified');

    const publishNoToken = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/publish-pr`, {
      method: 'POST',
      body: { pushRemote: true, createPr: true },
    });
    assert.equal(publishNoToken.status, 409);
    assert.equal(publishNoToken.body.requiresConfirm, true);

    const pubTokenRes = await requestJson(baseUrl, '/api/evolution/confirm', {
      method: 'POST',
      body: { action: 'publish-pr' },
    });
    assert.equal(pubTokenRes.status, 200);
    assert.ok(pubTokenRes.body.confirmToken);

    const publishRes = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/publish-pr`, {
      method: 'POST',
      body: { confirmToken: pubTokenRes.body.confirmToken, pushRemote: true, createPr: true },
    });
    assert.equal(publishRes.status, 200);
    assert.equal(publishRes.body.proposal.status, 'pr_opened');
    assert.equal(publishRes.body.proposal.pr.number, 88);
    assert.equal(publisherCalls.length, 1);

    const pushedSha = (await gitIn(bareDir, ['rev-parse', 'refs/heads/evolve/http-v2-upgrade'])).stdout.trim();
    assert.equal(pushedSha, publishRes.body.proposal.pr.commitSha);

    const applyNoToken = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/apply`, {
      method: 'POST',
      body: { applyMode: 'hot-swap' },
    });
    assert.equal(applyNoToken.status, 409);
    assert.equal(applyNoToken.body.requiresConfirm, true);

    const applyTokenRes = await requestJson(baseUrl, '/api/evolution/confirm', {
      method: 'POST',
      body: { action: 'apply' },
    });
    assert.equal(applyTokenRes.status, 200);

    const applyRes = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/apply`, {
      method: 'POST',
      body: { confirmToken: applyTokenRes.body.confirmToken, applyMode: 'hot-swap' },
    });
    assert.equal(applyRes.status, 200);
    assert.equal(applyRes.body.mode, 'hot-swap');
    assert.equal(applyRes.body.proposal.status, 'applied');

    const invokeV2 = await requestJson(baseUrl, '/api/agents/modules/ops-diagnostics/invoke', {
      method: 'POST',
      body: { input: { mode: 'after-apply' } },
    });
    assert.equal(invokeV2.status, 200);
    assert.equal(invokeV2.body.version, '2.0.0');
    assert.equal(invokeV2.body.result.tag, 'v2-http');

    const rbNoToken = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/rollback`, {
      method: 'POST',
      body: {},
    });
    assert.equal(rbNoToken.status, 409);
    assert.equal(rbNoToken.body.requiresConfirm, true);

    const rbTokenRes = await requestJson(baseUrl, '/api/evolution/confirm', {
      method: 'POST',
      body: { action: 'rollback' },
    });
    assert.equal(rbTokenRes.status, 200);

    const rbRes = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/rollback`, {
      method: 'POST',
      body: { confirmToken: rbTokenRes.body.confirmToken },
    });
    assert.equal(rbRes.status, 200);
    assert.equal(rbRes.body.proposal.status, 'rolled_back');

    const invokeAfterRb = await requestJson(baseUrl, '/api/agents/modules/ops-diagnostics/invoke', {
      method: 'POST',
      body: { input: { mode: 'after-rb' } },
    });
    assert.equal(invokeAfterRb.status, 200);
    assert.equal(invokeAfterRb.body.version, '1.0.0');
    assert.equal(invokeAfterRb.body.result.tag, 'v1');

    const cleanupRes = await requestJson(baseUrl, `/api/evolution/proposals/${encodeURIComponent(proposalId)}/cleanup`, {
      method: 'POST',
      body: {},
    });
    assert.equal(cleanupRes.status, 200);
    assert.ok(cleanupRes.body.proposal.sandbox.cleanedAt);
    assert.equal(fsSync.existsSync(sandboxPath), false);

    assert.ok(events.some((evt) => evt.type === 'module_reloaded'));
    assert.ok(events.some((evt) => evt.type === 'pr_applied' && evt.payload.prNumber === 88));
    assert.ok(events.some((evt) => evt.type === 'agent_declarative_reloaded'));
    assert.ok(events.some((evt) => evt.type === 'evolution_updated' && evt.payload.action === 'created'));
    assert.ok(events.some((evt) => evt.type === 'evolution_updated' && evt.payload.action === 'sandbox_ready'));
    assert.ok(events.some((evt) => evt.type === 'evolution_updated' && evt.payload.action === 'verified'));
    assert.ok(events.some((evt) => evt.type === 'evolution_updated' && evt.payload.action === 'pr_opened'));
    assert.ok(events.some((evt) => evt.type === 'evolution_updated' && evt.payload.action === 'applied'));
    assert.ok(events.some((evt) => evt.type === 'evolution_updated' && evt.payload.action === 'rolled_back'));
    assert.ok(events.some((evt) => evt.type === 'evolution_updated' && evt.payload.action === 'sandbox_cleaned'));
  } finally {
    await app.stop();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('readOnly mode returns 403 on all mutating /api/agents/modules/* and /api/evolution/* routes while allowing GET reads', async () => {
  const tmp = await mkTmpDir('ops-evo-ro-');
  const dataDir = path.join(tmp, 'data');
  const { repoDir } = await createTempEvolutionRepo(tmp, {
    moduleId: 'ops-diagnostics',
    agentId: 'decl-ops-triage',
  });

  const config = loadConfig({
    rawConfig: {
      console: { dataDir },
      security: {
        mutatingRateLimitPerMinute: 600,
        rateLimitPerMinute: 1200,
      },
    },
    cli: { demo: true, readOnly: true, hotReload: false, hosts: '127.0.0.1', webKey: '' },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;

  const app = createOpsConsole({ config, repoDir, silentStdout: true });
  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;

  try {
    const getModules = await requestJson(baseUrl, '/api/agents/modules');
    assert.equal(getModules.status, 200);
    assert.equal(getModules.body.ok, true);

    const getProposals = await requestJson(baseUrl, '/api/evolution/proposals');
    assert.equal(getProposals.status, 200);
    assert.equal(getProposals.body.readOnly, true);

    const mutatingRequests = [
      { method: 'POST', path: '/api/agents/modules/reload', body: {} },
      { method: 'POST', path: '/api/agents/modules/declarative/sync', body: {} },
      { method: 'POST', path: '/api/agents/modules/ops-diagnostics/reload', body: {} },
      { method: 'POST', path: '/api/agents/modules/ops-diagnostics/rollback', body: {} },
      { method: 'POST', path: '/api/agents/modules/ops-diagnostics/invoke', body: { input: {} } },
      { method: 'POST', path: '/api/evolution/confirm', body: { action: 'apply' } },
      { method: 'POST', path: '/api/evolution/proposals', body: { title: 'Blocked in read-only' } },
      { method: 'POST', path: '/api/evolution/proposals/evo_dummy/sandbox', body: {} },
      { method: 'DELETE', path: '/api/evolution/proposals/evo_dummy/sandbox' },
      { method: 'POST', path: '/api/evolution/proposals/evo_dummy/verify', body: {} },
      { method: 'POST', path: '/api/evolution/proposals/evo_dummy/publish-pr', body: {} },
      { method: 'POST', path: '/api/evolution/proposals/evo_dummy/apply', body: {} },
      { method: 'POST', path: '/api/evolution/proposals/evo_dummy/rollback', body: {} },
      { method: 'POST', path: '/api/evolution/proposals/evo_dummy/cleanup', body: {} },
    ];

    for (const reqSpec of mutatingRequests) {
      const res = await requestJson(baseUrl, reqSpec.path, {
        method: reqSpec.method,
        body: reqSpec.body,
      });
      assert.equal(res.status, 403, `${reqSpec.method} ${reqSpec.path} should return 403 in readOnly mode`);
      assert.equal(res.body.ok, false);
    }
  } finally {
    await app.stop();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
