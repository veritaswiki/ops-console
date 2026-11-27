import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractRollbackCandidates,
  listActiveLayers,
  parseHotUpdateSseEvent,
  UPDATE_STRATEGY_META,
} from './updates';
import type { UpdatePlan } from '../types';

test('listActiveLayers includes reserved agent-declarative and module-hot-swap layers in priority order', () => {
  const plan: UpdatePlan = {
    totalFiles: 5,
    counts: {
      frontend: 1,
      backend: 0,
      plugins: 1,
      deps: 0,
      config: 0,
      probe: 0,
      docs: 1,
      'agent-declarative': 1,
      'module-hot-swap': 1,
    },
    strategy: 'module-hot-swap',
    hotReloadOnly: true,
    hotReloadScopes: ['assets', 'plugins', 'agent-declarative', 'module-hot-swap'],
    needsDepsSync: false,
    needsFrontendBuild: false,
    requiresRestart: false,
    summary: '前端 1 · 插件 1 · 声明式Agent 1 · 热切模块 1 · 文档 1',
  };
  const layers = listActiveLayers(plan);
  assert.deepEqual(
    layers.map((item) => item.layer),
    ['frontend', 'plugins', 'agent-declarative', 'module-hot-swap', 'docs'],
  );
  assert.equal(UPDATE_STRATEGY_META[plan.strategy].tone, 'ok');
});

test('extractRollbackCandidates deduplicates commits and excludes current HEAD', () => {
  const candidates = extractRollbackCandidates(
    [
      {
        id: 'u2',
        ts: '2026-11-27T10:00:00Z',
        kind: 'incremental-apply',
        status: 'applied_hot',
        fromCommit: 'aaaa1111bbbb2222',
        toCommit: 'cccc3333dddd4444',
      },
      {
        id: 'u1',
        ts: '2026-11-27T09:00:00Z',
        kind: 'incremental-apply',
        status: 'applied_hot',
        fromCommit: '00009999eeee8888',
        toCommit: 'aaaa1111bbbb2222',
      },
    ],
    'cccc3333dddd4444',
  );
  assert.deepEqual(
    candidates.map((c) => c.shortCommit),
    ['aaaa1111', '00009999'],
  );
});

test('parseHotUpdateSseEvent handles assets_updated, server_restarting, module_reloaded, and pr_applied', () => {
  assert.equal(
    parseHotUpdateSseEvent(
      'assets_updated',
      JSON.stringify({ payload: { revision: 'rev-same' } }),
      'rev-same',
    ),
    null,
  );

  const assetNotice = parseHotUpdateSseEvent(
    'assets_updated',
    JSON.stringify({ payload: { revision: 'rev-next-1234' } }),
    'rev-same',
  );
  assert.equal(assetNotice?.kind, 'assets');
  assert.equal(assetNotice?.canReloadPage, true);

  const modNotice = parseHotUpdateSseEvent(
    'module_reloaded',
    JSON.stringify({ payload: { moduleId: 'agent-orchestrator', revision: 'abc12345' } }),
    'rev-same',
  );
  assert.equal(modNotice?.kind, 'module');
  assert.match(modNotice?.message || '', /agent-orchestrator/);

  const prNotice = parseHotUpdateSseEvent(
    'pr_applied',
    JSON.stringify({ payload: { prNumber: 42, restartRequired: false } }),
    'rev-same',
  );
  assert.equal(prNotice?.kind, 'pr');
  assert.match(prNotice?.message || '', /PR #42/);
  assert.equal(prNotice?.canReloadPage, true);

  const restartNotice = parseHotUpdateSseEvent(
    'server_restarting',
    JSON.stringify({ payload: { commit: 'deadbeef' } }),
    'rev-same',
  );
  assert.equal(restartNotice?.kind, 'restarting');
  assert.equal(restartNotice?.canReloadPage, false);
});
