import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  AI_SCHEDULING_PITFALLS,
  ARCHITECTURE_LAYERS,
  buildAiOpsContext,
  evaluateAiPreflight,
} from '../src/ai-ops-governance.mjs';
import { loadConfig } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';

test('AI governance catalog covers all 5 benchmark scheduling projects and 4 architecture layers', () => {
  const projects = new Set(AI_SCHEDULING_PITFALLS.map((item) => item.project));
  for (const expected of ['T3 Code', 'Orca', 'Alma', 'Claude Code', 'Codex']) {
    assert.ok(projects.has(expected), `Expected pitfalls for ${expected}`);
  }
  const layers = new Set(ARCHITECTURE_LAYERS.map((item) => item.layer));
  assert.deepEqual([...layers].sort(), ['Config', 'Data', 'Logic', 'UI']);
});

test('evaluateAiPreflight enforces safety rules across block, confirm_required, and allow verdicts', () => {
  // 1. Safe isolated worktree code patch -> allow
  const safeRes = evaluateAiPreflight(
    {
      actionType: 'code-patch',
      target: 'web/lib/ai-governance.ts',
      summary: 'Update pure helper filters and tests',
      worktreeBranch: 'feat/safe-filter',
      files: ['web/lib/ai-governance.ts', 'web/lib/ai-governance.test.ts'],
    },
    { config: { console: { readOnly: false } }, mcpFleetSummary: { totalTools: 16 } },
  );
  assert.equal(safeRes.verdict, 'allow');
  assert.equal(safeRes.blastRadius, 'low');
  assert.equal(safeRes.safetyScore, 100);

  // 2. Read-only mode blocks mutations
  const roRes = evaluateAiPreflight(
    { actionType: 'service-action', target: 'nmem.service' },
    { config: { console: { readOnly: true } } },
  );
  assert.equal(roRes.verdict, 'block');
  assert.ok(roRes.checks.some((c) => c.id === 'read-only-guard' && c.status === 'block'));

  // 3. Critical service without confirmToken -> confirm_required
  const critRes = evaluateAiPreflight(
    { actionType: 'service-action', target: 'magpie-gateway.service' },
    {
      config: { console: { readOnly: false } },
      snapshot: { services: { items: [{ id: 'magpie', unit: 'magpie-gateway.service', risk: 'critical' }] } },
    },
  );
  assert.equal(critRes.verdict, 'confirm_required');
  assert.equal(critRes.blastRadius, 'high');

  // 4. .claude/worktrees gitlink, path traversal, protected branch, and unpinned npx -> block
  const dangerRes = evaluateAiPreflight(
    {
      actionType: 'mcp-sync',
      target: 'local-hub',
      worktreeBranch: 'main',
      files: ['.claude/worktrees/tmp/file.txt', '../secrets.env'],
      command: 'npx -y abandoned-mcp-package',
      mcpToolsCount: 48,
    },
    { config: { console: { readOnly: false } } },
  );
  assert.equal(dangerRes.verdict, 'block');
  assert.ok(dangerRes.checks.some((c) => c.id === 'gitlink-guard' && c.status === 'block'));
  assert.ok(dangerRes.checks.some((c) => c.id === 'path-sandbox-guard' && c.status === 'block'));
  assert.ok(dangerRes.checks.some((c) => c.id === 'mcp-supply-chain-guard' && c.status === 'block'));
  assert.ok(dangerRes.checks.some((c) => c.id === 'mcp-tool-ceiling' && c.status === 'warn'));

  // 5. Synthetic secret leak detection (constructed dynamically to keep repo PII-clean)
  const syntheticToken = ['sk', '-', 'testSynthetic998877665544'].join('');
  const secretRes = evaluateAiPreflight(
    {
      actionType: 'config-edit',
      summary: `set key=${syntheticToken}`,
      rawConfigJson: '{"invalid": true',
    },
    { config: { console: { readOnly: false } } },
  );
  assert.equal(secretRes.verdict, 'block');
  assert.ok(secretRes.checks.some((c) => c.id === 'secret-leak-guard' && c.status === 'block'));
  assert.ok(secretRes.checks.some((c) => c.id === 'config-schema-guard' && c.status === 'block'));

  // 6. Coupled-file detection for package.json SemVer sync
  const coupledRes = evaluateAiPreflight(
    {
      actionType: 'code-patch',
      worktreeBranch: 'chore/bump-version',
      files: ['package.json'],
    },
    { config: { console: { readOnly: false } } },
  );
  assert.ok(coupledRes.coupledFiles.includes('Dockerfile'));
  assert.ok(coupledRes.coupledFiles.includes('probe/package.json'));
});

test('HTTP endpoints GET /api/ai/context and POST /api/ai/preflight work end-to-end', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-console-ai-gov-'));
  const config = loadConfig({
    cli: { hosts: '127.0.0.1', port: 4320, demo: true, readOnly: false, webKey: '' },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;
  try {
    const ctxRes = await fetch(`${baseUrl}/api/ai/context`);
    assert.equal(ctxRes.status, 200);
    const ctx = await ctxRes.json();
    assert.equal(ctx.ok, true);
    assert.equal(ctx.version, '0.4.0');
    assert.equal(ctx.schemaVersion, 'ops-console.ai-context/v1');
    assert.ok(ctx.boundaries.length === 4);
    assert.ok(ctx.pitfalls.length >= 15);

    const preflightRes = await fetch(`${baseUrl}/api/ai/preflight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
      },
      body: JSON.stringify({
        actionType: 'service-action',
        target: 'magpie-gateway.service',
        summary: 'Restart gateway after timeout change',
      }),
    });
    assert.equal(preflightRes.status, 200);
    const preflight = await preflightRes.json();
    assert.equal(preflight.ok, true);
    assert.equal(preflight.verdict, 'confirm_required');
    assert.ok(Array.isArray(preflight.checks));
    assert.ok(preflight.rollbackPlan.length > 0);
  } finally {
    await app.stop();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('buildAiOpsContext flags MCP tool ceiling overflow accurately', () => {
  const ctx = buildAiOpsContext({
    version: '0.4.0',
    config: { demo: true, console: { readOnly: false } },
    mcpFleetSummary: { total: 6, totalTools: 45 },
    alertsCount: 2,
  });
  assert.equal(ctx.liveSummary.mcpToolCeilingExceeded, true);
  assert.equal(ctx.liveSummary.activeAlerts, 2);
});
