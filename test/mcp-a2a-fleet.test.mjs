import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';
import { validateSafeEndpointUrl } from '../src/mcp-fleet.mjs';
import { sanitizeProbePayload } from '../src/probes.mjs';

async function makeTestServer(overrides = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-mcp-a2a-'));
  const config = await loadConfig({
    cli: {
      demo: overrides.demo !== false,
      readOnly: Boolean(overrides.readOnly),
      host: '127.0.0.1',
    },
    env: {
      OPS_CONSOLE_DATA_DIR: tmpDir,
      OPS_CONSOLE_LOG_DIR: path.join(tmpDir, 'logs'),
      OPS_CONSOLE_AUTH_KEY: '',
    },
  });
  config.console.port = 0;
  const app = createOpsConsole({ config });
  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;
  return {
    app,
    baseUrl,
    cleanup: async () => {
      await app.stop();
      await fs.rm(tmpDir, { recursive: true, force: true });
    },
  };
}

test('validateSafeEndpointUrl blocks metadata SSRF targets and embedded credentials', () => {
  assert.equal(validateSafeEndpointUrl('http://127.0.0.1:8788/mcp').ok, true);
  assert.equal(validateSafeEndpointUrl('https://100.64.0.21:8443/a2a').ok, true);
  assert.equal(validateSafeEndpointUrl('http://169.254.169.254/latest/meta-data').ok, false);
  assert.equal(validateSafeEndpointUrl('http://metadata.google.internal/computeMetadata/v1/').ok, false);
  assert.equal(validateSafeEndpointUrl('http://user:secret@127.0.0.1:8788/mcp').ok, false);
  assert.equal(validateSafeEndpointUrl('file:///etc/passwd').ok, false);
});

test('sanitizeProbePayload preserves per-node mcps and agent harnesses safely', () => {
  const sanitized = sanitizeProbePayload({
    nodeId: 'vps-osaka-01',
    hostname: 'vps-osaka-01',
    deviceType: 'server',
    platform: 'linux',
    disks: [{ mount: '/', totalBytes: 1000, usedBytes: 300, usedPct: 30 }],
    mcps: [{ id: 'mcp-1', name: 'Osaka Docker MCP', transport: 'streamable-http', endpoint: 'http://100.64.0.88:8788/mcp', toolsCount: 6 }],
    harnesses: [{ id: 'a2a-1', name: 'OpenCode Osaka', harness: 'opencode', agentCardUrl: 'http://100.64.0.88:9102/.well-known/agent-card.json' }],
  });
  assert.equal(sanitized.mcps.length, 1);
  assert.equal(sanitized.mcps[0].name, 'Osaka Docker MCP');
  assert.equal(sanitized.harnesses.length, 1);
  assert.equal(sanitized.harnesses[0].harness, 'opencode');
});

test('GET /api/snapshot enriches every fleet node with disks, services, mcps, and harnesses', async () => {
  const ctx = await makeTestServer({ demo: true });
  try {
    const res = await fetch(`${ctx.baseUrl}/api/snapshot`);
    assert.equal(res.status, 200);
    const data = await res.json();
    const nodes = data.fleet?.nodes || [];
    assert.ok(nodes.length >= 5);

    for (const node of nodes) {
      assert.ok(Array.isArray(node.disks), `node ${node.id} should have disks array`);
      assert.ok(Array.isArray(node.watchedServices), `node ${node.id} should have watchedServices`);
      assert.ok(Array.isArray(node.mcps), `node ${node.id} should have mcps array`);
      assert.ok(Array.isArray(node.harnesses), `node ${node.id} should have harnesses array`);
    }

    const tokyo = nodes.find((n) => n.id === 'edge-tokyo');
    assert.ok(tokyo);
    assert.ok(tokyo.disks.length >= 2);
    assert.ok(tokyo.watchedServices.length >= 3);
    assert.ok(tokyo.mcps.length >= 2);
    assert.ok(tokyo.harnesses.length >= 1);
  } finally {
    await ctx.cleanup();
  }
});

test('Fleet MCP API supports register, multi-node sync, toggle, test, delete, and SSRF validation', async () => {
  const ctx = await makeTestServer({ demo: true });
  try {
    const listRes = await fetch(`${ctx.baseUrl}/api/mcps`);
    assert.equal(listRes.status, 200);
    const initial = await listRes.json();
    assert.ok(initial.items.length >= 6);
    assert.ok(initial.summary.nodesCovered >= 4);

    // Reject SSRF metadata URL
    const badRes = await fetch(`${ctx.baseUrl}/api/mcps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad Metadata MCP',
        transport: 'streamable-http',
        endpoint: 'http://169.254.169.254/latest/meta-data',
        nodeIds: ['edge-tokyo'],
      }),
    });
    assert.equal(badRes.status, 400);

    // Reject shell metacharacters in stdio command
    const badStdioRes = await fetch(`${ctx.baseUrl}/api/mcps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad Stdio',
        transport: 'stdio',
        command: 'npx; rm -rf /',
        nodeIds: ['hub-primary'],
      }),
    });
    assert.equal(badStdioRes.status, 400);

    // Register across hub + remote VPS
    const createRes = await fetch(`${ctx.baseUrl}/api/mcps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'ClickHouse ReadOnly MCP',
        transport: 'streamable-http',
        endpoint: 'http://100.64.0.35:8795/mcp',
        nodeIds: ['hub-primary', 'edge-tokyo'],
        envRefs: ['CH_READONLY_TOKEN'],
        scope: 'analytics',
      }),
    });
    assert.equal(createRes.status, 201);
    const createdPayload = await createRes.json();
    assert.equal(createdPayload.created.length, 2);
    assert.equal(createdPayload.queuedCommands.length, 1);
    assert.equal(createdPayload.queuedCommands[0].command, 'mcp-sync');
    assert.equal(createdPayload.queuedCommands[0].nodeId, 'edge-tokyo');

    const newId = createdPayload.created[0].id;

    // Handshake test
    const testRes = await fetch(`${ctx.baseUrl}/api/mcps/${encodeURIComponent(newId)}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(testRes.status, 200);
    const testJson = await testRes.json();
    assert.equal(testJson.ok, true);

    // Toggle disabled
    const toggleRes = await fetch(`${ctx.baseUrl}/api/mcps/${encodeURIComponent(newId)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(toggleRes.status, 200);
    const toggleJson = await toggleRes.json();
    assert.equal(toggleJson.item.enabled, false);

    // Sync to Frankfurt VPS
    const syncRes = await fetch(`${ctx.baseUrl}/api/mcps/${encodeURIComponent(newId)}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetNodeIds: ['edge-frankfurt'] }),
    });
    assert.equal(syncRes.status, 200);
    const syncJson = await syncRes.json();
    assert.equal(syncJson.synced.length, 1);
    assert.equal(syncJson.synced[0].nodeId, 'edge-frankfurt');

    // Delete
    const delRes = await fetch(`${ctx.baseUrl}/api/mcps/${encodeURIComponent(newId)}`, {
      method: 'DELETE',
    });
    assert.equal(delRes.status, 200);
  } finally {
    await ctx.cleanup();
  }
});

test('A2A Orchestrator API supports Codex Lead, Pi routing with effort, DSH Expert Review Gate, Swarm, Skills, and Session Sync', async () => {
  const ctx = await makeTestServer({ demo: true });
  try {
    const stateRes = await fetch(`${ctx.baseUrl}/api/a2a/state`);
    assert.equal(stateRes.status, 200);
    const state = await stateRes.json();
    assert.equal(state.architecture.harnessFree, true);
    assert.equal(state.architecture.license, 'Apache-2.0');
    assert.equal(state.leadAgentId, 'a2a-hub-codex-lead');
    assert.ok(state.agents.length >= 6);
    assert.ok(state.routingRules.length >= 5);
    assert.ok(state.skillCatalog.length >= 4);
    assert.ok(state.sessions.length >= 3);

    // 1. Update orchestration config to Swarm + Main/Sub models + DSH gate
    const cfgRes = await fetch(`${ctx.baseUrl}/api/a2a/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'swarm',
        mainModel: 'gpt-5-codex',
        mainEffort: 'xhigh',
        subModel: 'claude-sonnet-4-6',
        subEffort: 'low',
        dshReviewGate: { enabled: true, minScore: 86 },
      }),
    });
    assert.equal(cfgRes.status, 200);
    const cfgJson = await cfgRes.json();
    assert.equal(cfgJson.orchestrationConfig.mode, 'swarm');
    assert.equal(cfgJson.orchestrationConfig.mainEffort, 'xhigh');

    // 2. Save dragged node coordinates
    const topoRes = await fetch(`${ctx.baseUrl}/api/a2a/topology`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positions: { 'a2a-mac-pi': { x: 420, y: 80 } },
      }),
    });
    assert.equal(topoRes.status, 200);
    const topoJson = await topoRes.json();
    assert.equal(topoJson.updated, 1);

    // 3. Create custom visual routing rule with model & thinking effort
    const routeRes = await fetch(`${ctx.baseUrl}/api/a2a/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SQL 迁移交由 Pi 极速执行',
        sourceAgentId: 'a2a-hub-codex-lead',
        targetAgentId: 'a2a-mac-pi',
        matchKeywords: ['sql', 'migration'],
        targetModel: 'claude-sonnet-4-6',
        reasoningEffort: 'low',
        priority: 3,
        requireDshReview: true,
      }),
    });
    assert.equal(routeRes.status, 200);
    const routeJson = await routeRes.json();
    assert.equal(routeJson.rule.reasoningEffort, 'low');

    // 4. Dispatch task matching custom rule -> routes to Pi + runs DSH Expert Review Gate
    const taskRes = await fetch(`${ctx.baseUrl}/api/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '请执行 sql migration 脚本检查并回归验证',
        targetAgentId: 'auto',
        executionMode: 'swarm',
      }),
    });
    assert.equal(taskRes.status, 201);
    const taskJson = await taskRes.json();
    assert.equal(taskJson.task.workerAgentId, 'a2a-mac-pi');
    assert.equal(taskJson.task.appliedEffort, 'low');
    assert.ok(taskJson.task.subtasks.length >= 2);
    assert.ok(taskJson.task.dshReview);
    assert.ok(taskJson.task.dshReview.score >= 80);

    // 5. Auto-discover installed harnesses
    const autoDiscRes = await fetch(`${ctx.baseUrl}/api/a2a/discover-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(autoDiscRes.status, 200);
    const autoDiscJson = await autoDiscRes.json();
    assert.ok(autoDiscJson.discoveredCount >= 6);

    // 6. Add & assign a custom Skill
    const skillRes = await fetch(`${ctx.baseUrl}/api/a2a/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'DSH 并发压测插件',
        version: '1.1.0',
        provider: 'dsh-plugin',
        assignedAgentIds: ['a2a-dsh-expert-reviewer', 'a2a-mac-pi'],
      }),
    });
    assert.equal(skillRes.status, 201);

    // 7. Create, sync, and handoff cross-device aligned session
    const sessRes = await fetch(`${ctx.baseUrl}/api/a2a/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '多端协同调试会话',
        primaryAgentId: 'a2a-hub-codex-lead',
        syncedNodes: ['workstation-mac', 'hub-primary'],
        syncMode: 'a2a-context-bus',
      }),
    });
    assert.equal(sessRes.status, 201);
    const sessJson = await sessRes.json();
    const sessId = sessJson.session.id;

    const syncRes = await fetch(`${ctx.baseUrl}/api/a2a/sessions/${encodeURIComponent(sessId)}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraNodes: ['edge-tokyo'] }),
    });
    assert.equal(syncRes.status, 200);
    const syncJson = await syncRes.json();
    assert.equal(syncJson.session.revision, 2);
    assert.ok(syncJson.session.syncedNodes.includes('edge-tokyo'));

    const handoffRes = await fetch(`${ctx.baseUrl}/api/a2a/sessions/${encodeURIComponent(sessId)}/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetAgentId: 'a2a-mac-pi' }),
    });
    assert.equal(handoffRes.status, 200);
    const handoffJson = await handoffRes.json();
    assert.equal(handoffJson.session.primaryAgentId, 'a2a-mac-pi');

    // 8. Elect another agent as Lead Harness
    const leadRes = await fetch(`${ctx.baseUrl}/api/a2a/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'a2a-hub-claude' }),
    });
    assert.equal(leadRes.status, 200);
    const leadJson = await leadRes.json();
    assert.equal(leadJson.leadAgentId, 'a2a-hub-claude');

    // 9. Delete routing rule cleanly
    const delRouteRes = await fetch(`${ctx.baseUrl}/api/a2a/routes/${encodeURIComponent(routeJson.rule.id)}`, {
      method: 'DELETE',
    });
    assert.equal(delRouteRes.status, 200);
  } finally {
    await ctx.cleanup();
  }
});

test('Read-only mode blocks mutating MCP and A2A endpoints', async () => {
  const ctx = await makeTestServer({ demo: true, readOnly: true });
  try {
    const mcpRes = await fetch(`${ctx.baseUrl}/api/mcps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Blocked', transport: 'streamable-http', endpoint: 'http://127.0.0.1:9999/mcp', nodeIds: ['hub-primary'] }),
    });
    assert.equal(mcpRes.status, 403);

    const a2aLeadRes = await fetch(`${ctx.baseUrl}/api/a2a/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'a2a-hub-claude' }),
    });
    assert.equal(a2aLeadRes.status, 403);

    const a2aConfigRes = await fetch(`${ctx.baseUrl}/api/a2a/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'swarm' }),
    });
    assert.equal(a2aConfigRes.status, 403);

    const a2aTaskRes = await fetch(`${ctx.baseUrl}/api/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'should be blocked' }),
    });
    assert.equal(a2aTaskRes.status, 403);

    const saConfigRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inlineBudgetKb: 24 }),
    });
    assert.equal(saConfigRes.status, 403);

    const saTriggerRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'github', actor: 'maintainer', summary: 'Blocked trigger' }),
    });
    assert.equal(saTriggerRes.status, 403);

    const saSpillRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/context/spill-901a/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(saSpillRes.status, 403);

    const saWatchdogRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/watchdog/sweep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(saWatchdogRes.status, 403);

    const dshTeamRes = await fetch(`${ctx.baseUrl}/api/a2a/dsh-team/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Blocked team run' }),
    });
    assert.equal(dshTeamRes.status, 403);
  } finally {
    await ctx.cleanup();
  }
});

test('Wave 6: Agent Logs (REST + SSE), SuperAgent Fast/Slow Path, Inline/Spill Chain of Recall, Watchdog, and DSH Team Collaboration', async () => {
  const ctx = await makeTestServer({ demo: true });
  try {
    // 1. Swarm & SuperAgent coordination metrics
    const metricsRes = await fetch(`${ctx.baseUrl}/api/a2a/swarm/metrics`);
    assert.equal(metricsRes.status, 200);
    const metricsData = await metricsRes.json();
    assert.equal(metricsData.ok, true);
    assert.ok(metricsData.swarmMetrics.taskToAgentThroughputRatio > 0);
    assert.ok(metricsData.swarmMetrics.parallelSpeedup >= 1);
    assert.ok(metricsData.swarmMetrics.fastPathOffloadPct > 0);
    assert.ok(metricsData.swarmMetrics.routerTokensSaved > 0);
    assert.ok(metricsData.swarmMetrics.contextSavedKb > 0);
    assert.equal(metricsData.swarmMetrics.stalledTickets, 1);
    assert.equal(metricsData.superAgentConfig.routerThinMode, true);
    assert.ok(metricsData.superAgentTickets.length >= 3);
    assert.ok(metricsData.contextSpillNodes.length >= 4);
    assert.ok(metricsData.triggerEvents.length >= 5);

    // 2. Agent-scoped collaboration logs
    const logsRes = await fetch(`${ctx.baseUrl}/api/a2a/logs?agentId=a2a-mac-pi`);
    assert.equal(logsRes.status, 200);
    const logsData = await logsRes.json();
    assert.equal(logsData.ok, true);
    assert.ok(logsData.items.length >= 1);
    for (const item of logsData.items) {
      assert.ok(item.sourceAgentId === 'a2a-mac-pi' || item.targetAgentId === 'a2a-mac-pi');
    }

    // 3. Update SuperAgent config
    const cfgRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inlineBudgetKb: 24,
        watchdogStallSec: 120,
        attentionBudgetLimit: 6,
        consensusPolicy: 'unanimous',
        maxReworkRounds: 3,
      }),
    });
    assert.equal(cfgRes.status, 200);
    const cfgData = await cfgRes.json();
    assert.equal(cfgData.superAgentConfig.inlineBudgetKb, 24);
    assert.equal(cfgData.superAgentConfig.watchdogStallSec, 120);
    assert.equal(cfgData.superAgentConfig.consensusPolicy, 'unanimous');
    assert.equal(cfgData.superAgentConfig.maxReworkRounds, 3);

    // 4. Test all 3 Fast/Slow Path trigger decisions: fast_drop, fast_passthrough, slow_spawn
    const dropRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'github',
        actor: 'dsh-bot',
        threadKey: 'gh:ops-console#pr-142',
        summary: 'Self-origin bot label update',
      }),
    });
    assert.equal(dropRes.status, 201);
    const dropData = await dropRes.json();
    assert.equal(dropData.trigger.decision, 'fast_drop');
    assert.ok(dropData.trigger.tokensSaved > 0);
    assert.equal(dropData.ticket, null);

    const passRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'github',
        actor: 'reviewer',
        threadKey: 'gh:ops-console#pr-142',
        summary: 'Follow-up comment on subscribed PR thread',
      }),
    });
    assert.equal(passRes.status, 201);
    const passData = await passRes.json();
    assert.equal(passData.trigger.decision, 'fast_passthrough');
    assert.equal(passData.ticket.id, 'tkt-sa-401');

    const spawnRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'feishu',
        actor: 'ops-lead',
        threadKey: 'feishu:ops-console#inc-301',
        summary: 'Investigate edge TLS handshake latency spike',
      }),
    });
    assert.equal(spawnRes.status, 201);
    const spawnData = await spawnRes.json();
    assert.equal(spawnData.trigger.decision, 'slow_spawn');
    assert.ok(spawnData.ticket?.id?.startsWith('tkt-sa-'));

    // 5. Toggle Inline/Spill Chain of Recall node (spilled -> inline -> spilled)
    const recallRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/context/spill-901a/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(recallRes.status, 200);
    const recalled = await recallRes.json();
    assert.equal(recalled.node.state, 'inline');
    assert.equal(recalled.node.recallCount, 3);

    const reSpillRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/context/spill-901a/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'spilled' }),
    });
    assert.equal(reSpillRes.status, 200);
    const reSpilled = await reSpillRes.json();
    assert.equal(reSpilled.node.state, 'spilled');

    // 6. Run external Watchdog sweep to recover stalled ticket tkt-sa-403
    const watchdogRes = await fetch(`${ctx.baseUrl}/api/a2a/superagent/watchdog/sweep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(watchdogRes.status, 200);
    const watchdogData = await watchdogRes.json();
    assert.equal(watchdogData.ok, true);
    assert.ok(watchdogData.recoveredCount >= 1);
    assert.equal(watchdogData.swarmMetrics.stalledTickets, 0);

    // 7. Open live SSE /api/a2a/logs/stream & trigger DSH Team Collaboration
    const sseController = new AbortController();
    const sseRes = await fetch(`${ctx.baseUrl}/api/a2a/logs/stream?agentId=a2a-hub-codex-lead`, {
      signal: sseController.signal,
      headers: { Accept: 'text/event-stream' },
    });
    assert.equal(sseRes.status, 200);
    assert.ok((sseRes.headers.get('content-type') || '').includes('text/event-stream'));

    const reader = sseRes.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    // Read initial 'init' frame
    const firstChunk = await reader.read();
    sseBuffer += decoder.decode(firstChunk.value || new Uint8Array(), { stream: true });
    assert.ok(sseBuffer.includes('event: init'));

    // Trigger DSH Team Collaboration with auto-spill
    const teamRunRes = await fetch(`${ctx.baseUrl}/api/a2a/dsh-team/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '使用隔离 Worktree 蜂群重构 auth 认证与 api 路由并经过 DSH 团队评审',
        channel: 'github',
        consensusPolicy: 'weighted',
        enableAutoSpill: true,
      }),
    });
    assert.equal(teamRunRes.status, 201);
    const teamRun = await teamRunRes.json();
    assert.equal(teamRun.ok, true);
    assert.ok(teamRun.ticket?.id?.startsWith('tkt-sa-'));
    assert.ok(teamRun.spilledNode?.spillId?.startsWith('spill-'));
    assert.ok(teamRun.task.dshReview);
    assert.ok(teamRun.task.subtasks.length >= 2);

    // Verify live 'a2a_log' event pushed over SSE
    const secondChunk = await reader.read();
    sseBuffer += decoder.decode(secondChunk.value || new Uint8Array(), { stream: true });
    assert.ok(sseBuffer.includes('event: a2a_log'));

    sseController.abort();
  } finally {
    await ctx.cleanup();
  }
});

