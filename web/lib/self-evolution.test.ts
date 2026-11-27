import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSampleEvolutionTemplates,
  EVOLUTION_PIPELINE_STAGES,
  EVOLUTION_STATUS_META,
  formatModuleSlotLabel,
  getAvailableProposalActions,
  getProposalStageIndex,
  summarizeModuleHost,
} from './self-evolution';
import type {
  AgentModulesStateResponse,
  EvolutionProposal,
  EvolutionProposalStatus,
  HotSwapModuleEntry,
} from '../types';

function createProposalFixture(
  overrides: Partial<EvolutionProposal> = {},
): EvolutionProposal {
  return {
    id: 'evo-test-001',
    title: 'Upgrade ops-diagnostics telemetry',
    goal: 'Add heap metrics to diagnostics hot module',
    status: 'preflight_checked',
    createdAt: '2026-11-27T08:00:00Z',
    updatedAt: '2026-11-27T08:00:00Z',
    createdBy: 'ops-admin',
    btwThreadId: null,
    sessionId: null,
    taskId: null,
    baseBranch: 'main',
    branch: 'feat/evolve-ops-diagnostics',
    primaryLayer: 'module-hot-swap',
    targetFiles: ['src/agent-modules/ops-diagnostics.mjs'],
    filePatches: [
      {
        path: 'src/agent-modules/ops-diagnostics.mjs',
        op: 'write',
        layer: 'module-hot-swap',
        bytes: 512,
      },
    ],
    plan: {
      totalFiles: 1,
      counts: {
        frontend: 0,
        backend: 0,
        plugins: 0,
        deps: 0,
        config: 0,
        probe: 0,
        docs: 0,
        'agent-declarative': 0,
        'module-hot-swap': 1,
      },
      strategy: 'module-hot-swap',
      hotReloadOnly: true,
      hotReloadScopes: ['module-hot-swap'],
      needsDepsSync: false,
      needsFrontendBuild: false,
      requiresRestart: false,
      summary: '热切模块 1',
    },
    hotSwappable: true,
    preflight: {
      checkedAt: '2026-11-27T08:00:00Z',
      actionType: 'self_evolution',
      target: 'src/agent-modules/ops-diagnostics.mjs',
      verdict: 'allow',
      blastRadius: 'low',
      safetyScore: 95,
      checks: [],
      coupledFiles: [],
      rollbackPlan: 'Swap back to standby slot',
      recommendedCommands: [],
    },
    sandbox: null,
    verification: null,
    pr: null,
    applyResult: null,
    canRollback: false,
    lastError: null,
    timeline: [],
    ...overrides,
  };
}

function createModuleFixture(
  overrides: Partial<HotSwapModuleEntry> = {},
): HotSwapModuleEntry {
  return {
    id: 'ops-diagnostics',
    name: 'Ops Diagnostics Hot Module',
    version: '1.0.0',
    description: 'Diagnostics module',
    capabilities: ['diagnostics', 'hot-swap'],
    relPath: 'src/agent-modules/ops-diagnostics.mjs',
    activeSlot: 'A',
    standbySlot: 'B',
    canRollback: true,
    revision: 'r2-abcd1234',
    hash: 'abcd1234ef567890',
    healthy: true,
    healthDetail: 'slot-ready',
    hasHandler: true,
    swapCount: 2,
    failedSwaps: 0,
    invocations: 5,
    lastError: null,
    lastSwappedAt: '2026-11-27T08:00:00Z',
    slots: {
      A: {
        slot: 'A',
        revision: 'r2-abcd1234',
        version: '1.0.0',
        hash: 'abcd1234',
        loadedAt: '2026-11-27T08:00:00Z',
        healthy: true,
        healthDetail: 'slot-ready',
      },
      B: {
        slot: 'B',
        revision: 'r1-99887766',
        version: '0.9.0',
        hash: '99887766',
        loadedAt: '2026-11-27T07:00:00Z',
        healthy: true,
        healthDetail: 'slot-ready',
      },
    },
    history: [],
    ...overrides,
  };
}

test('EVOLUTION_STATUS_META covers all 7 statuses and pipeline stages stay ordered', () => {
  const allStatuses: EvolutionProposalStatus[] = [
    'preflight_checked',
    'sandbox_ready',
    'verified',
    'pr_opened',
    'applied',
    'failed',
    'rolled_back',
  ];
  for (const status of allStatuses) {
    const meta = EVOLUTION_STATUS_META[status];
    assert.ok(meta.label.length > 0);
    assert.ok(['ok', 'warn', 'err', 'info', 'muted'].includes(meta.tone));
    const stageIdx = getProposalStageIndex(status);
    assert.ok(stageIdx >= 0 && stageIdx < EVOLUTION_PIPELINE_STAGES.length);
  }
  assert.deepEqual(
    EVOLUTION_PIPELINE_STAGES.map((stage) => stage.key),
    ['preflight', 'sandbox', 'verify', 'pr', 'apply'],
  );
  assert.equal(getProposalStageIndex('preflight_checked'), 0);
  assert.equal(getProposalStageIndex('sandbox_ready'), 1);
  assert.equal(getProposalStageIndex('verified'), 2);
  assert.equal(getProposalStageIndex('pr_opened'), 3);
  assert.equal(getProposalStageIndex('applied'), 4);
});

test('getAvailableProposalActions enforces backend state machine transitions', () => {
  const preflightOk = createProposalFixture({ status: 'preflight_checked' });
  assert.deepEqual(getAvailableProposalActions(preflightOk), {
    canSandbox: true,
    canVerify: false,
    canPublishPr: false,
    canApply: false,
    canRollback: false,
    canCleanup: false,
  });

  const blockedProposal = createProposalFixture({
    preflight: {
      ...preflightOk.preflight,
      verdict: 'block',
    },
  });
  assert.equal(getAvailableProposalActions(blockedProposal).canSandbox, false);

  const noPatchProposal = createProposalFixture({ filePatches: [] });
  assert.equal(getAvailableProposalActions(noPatchProposal).canSandbox, false);

  const activeSandbox = {
    path: '/tmp/worktree-demo',
    relPath: '.worktrees/evolve-evo-test-001',
    branch: 'feat/evolve-ops-diagnostics',
    baseRef: 'HEAD',
    statusShort: 'M src/agent-modules/ops-diagnostics.mjs',
    diffStat: '1 file changed',
    preparedAt: '2026-11-27T08:01:00Z',
  };

  const sandboxReady = createProposalFixture({
    status: 'sandbox_ready',
    sandbox: activeSandbox,
  });
  assert.deepEqual(getAvailableProposalActions(sandboxReady), {
    canSandbox: true,
    canVerify: true,
    canPublishPr: false,
    canApply: false,
    canRollback: false,
    canCleanup: true,
  });

  const verifiedActive = createProposalFixture({
    status: 'verified',
    sandbox: activeSandbox,
  });
  assert.deepEqual(getAvailableProposalActions(verifiedActive), {
    canSandbox: true,
    canVerify: true,
    canPublishPr: true,
    canApply: true,
    canRollback: false,
    canCleanup: true,
  });

  const verifiedCleaned = createProposalFixture({
    status: 'verified',
    sandbox: {
      ...activeSandbox,
      cleanedAt: '2026-11-27T08:05:00Z',
    },
  });
  assert.deepEqual(getAvailableProposalActions(verifiedCleaned), {
    canSandbox: true,
    canVerify: false,
    canPublishPr: false,
    canApply: true,
    canRollback: false,
    canCleanup: false,
  });

  const appliedRollbackReady = createProposalFixture({
    status: 'applied',
    sandbox: activeSandbox,
    canRollback: true,
  });
  assert.deepEqual(getAvailableProposalActions(appliedRollbackReady), {
    canSandbox: false,
    canVerify: false,
    canPublishPr: false,
    canApply: false,
    canRollback: true,
    canCleanup: true,
  });
});

test('summarizeModuleHost handles null and aggregates module & declarative stats', () => {
  assert.deepEqual(summarizeModuleHost(null), {
    totalModules: 0,
    healthyModules: 0,
    rollbackReadyCount: 0,
    totalSwaps: 0,
    failedSwaps: 0,
    declarativeCount: 0,
  });

  const state: AgentModulesStateResponse = {
    generation: 3,
    declarativeRevision: 2,
    modulesDirs: ['src/agent-modules'],
    declarativeDirs: ['agents'],
    modules: [
      createModuleFixture({ id: 'ops-diagnostics', healthy: true, canRollback: true, swapCount: 2, failedSwaps: 0 }),
      createModuleFixture({ id: 'ops-audit', healthy: false, canRollback: false, swapCount: 1, failedSwaps: 1 }),
    ],
    declarativeItems: [
      {
        id: 'decl-ops-triage',
        kind: 'agent',
        relPath: 'agents/ops-triage.agent.json',
        hash: '11223344',
        name: 'Ops Triage',
        version: '1.0.0',
        description: 'Declarative triage agent',
        skills: ['ops-triage'],
        syncedToA2A: true,
        syncedAt: '2026-11-27T08:00:00Z',
      },
    ],
    loadErrors: [],
    lastModuleSwap: null,
    lastDeclarativeSync: null,
    summary: {
      totalModules: 2,
      healthyModules: 1,
      totalSwaps: 3,
      failedSwaps: 1,
      totalDeclarativeAgents: 1,
      totalDeclarativeSkills: 1,
    },
  };

  assert.deepEqual(summarizeModuleHost(state), {
    totalModules: 2,
    healthyModules: 1,
    rollbackReadyCount: 1,
    totalSwaps: 3,
    failedSwaps: 1,
    declarativeCount: 2,
  });
});

test('formatModuleSlotLabel formats rollback-ready and empty standby slots', () => {
  const rollbackReady = createModuleFixture({
    activeSlot: 'A',
    standbySlot: 'B',
    version: '1.0.0',
    revision: 'r2-abcd1234',
    canRollback: true,
  });
  assert.equal(
    formatModuleSlotLabel(rollbackReady),
    'Slot A (v1.0.0 · r2-abcd1234) · 备槽 B 可回滚',
  );

  const emptyStandby = createModuleFixture({
    activeSlot: 'B',
    standbySlot: 'A',
    version: '1.1.0',
    revision: 'r3-ff00aa11',
    canRollback: false,
    slots: {
      A: null,
      B: {
        slot: 'B',
        revision: 'r3-ff00aa11',
        version: '1.1.0',
        hash: 'ff00aa11',
        loadedAt: '2026-11-27T08:00:00Z',
        healthy: true,
        healthDetail: 'slot-ready',
      },
    },
  });
  assert.equal(
    formatModuleSlotLabel(emptyStandby),
    'Slot B (v1.1.0 · r3-ff00aa11) · 备槽 A 空',
  );
});

test('buildSampleEvolutionTemplates provides two valid safe hot-swap & declarative templates', () => {
  const templates = buildSampleEvolutionTemplates();
  assert.equal(templates.length, 2);

  const hotModuleTemplate = templates[0];
  assert.equal(hotModuleTemplate.filePatches[0]?.path, 'src/agent-modules/ops-diagnostics.mjs');
  assert.match(hotModuleTemplate.filePatches[0]?.content || '', /export const manifest/);
  assert.match(hotModuleTemplate.filePatches[0]?.content || '', /1\.1\.0/);

  const declarativeTemplate = templates[1];
  assert.equal(declarativeTemplate.filePatches[0]?.path, 'agents/ops-triage.agent.json');
  const parsedManifest = JSON.parse(declarativeTemplate.filePatches[0]?.content || '{}') as {
    id?: string;
    skills?: string[];
  };
  assert.equal(parsedManifest.id, 'decl-ops-triage');
  assert.ok(Array.isArray(parsedManifest.skills) && parsedManifest.skills.length >= 3);
});
