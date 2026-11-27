import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import { buildOnlineModelCatalog, filterOnlineModelCatalog } from '../src/model-catalog.mjs';
import { createOpsConsole } from '../src/server.mjs';
import { ProbeRegistry, sanitizeProbePayload } from '../src/probes.mjs';
import { discoverLocalModelCatalog, parseProbeMagpieBindings } from '../probe/ops-probe.mjs';

// Synthetic PII/secret fixtures: built by concatenation so no literal
// credential-shaped string or personal path ever lands in the repo.
const SYNTHETIC_EMAIL = 'alice' + '@example.org';
const SYNTHETIC_SECRET = 'sk-' + 'live_1234567890abcdef';
const SYNTHETIC_HOME_PATH = '/home/' + 'someuser' + '/.config/pi/settings.json';

function assertNoSensitiveFragments(serialized, label) {
  assert.equal(serialized.includes(SYNTHETIC_EMAIL), false, `${label} leaked synthetic account`);
  assert.equal(serialized.includes(SYNTHETIC_SECRET), false, `${label} leaked synthetic secret`);
  assert.equal(serialized.includes('someuser'), false, `${label} leaked personal home path`);
  assert.equal(serialized.includes('/home/'), false, `${label} leaked absolute home path`);
}

const HARNESS_BINDING = {
  name: 'Pi',
  harness: 'pi-agent',
  canonicalModel: 'mlx/qwen3-32b-4bit',
  mode: 'pinned',
  effort: 'high',
  configSource: 'settings.json',
};

test('buildOnlineModelCatalog keeps offline nodes out of every online model surface', () => {
  const catalog = buildOnlineModelCatalog({
    localNodeId: 'hub-primary',
    hubMagpieCatalog: {
      reachable: true,
      latencyMs: 9,
      models: [
        { id: 'auto/deepseek-v4.1-flash', provider: 'qoder-cn', isRoutingGroup: true },
      ],
      agentBindings: [],
    },
    fleetNodes: [
      { id: 'hub-primary', name: 'Hub', deviceType: 'hub', probeMode: 'local', status: 'healthy' },
      {
        id: 'node-alpha',
        name: 'Alpha',
        deviceType: 'server',
        status: 'healthy',
        modelSources: [{ id: 'node-alpha-openai', kind: 'openai-compatible', name: 'Upstream', reachable: true, modelsCount: 1 }],
        models: [{ id: 'acme/alpha-model', provider: 'acme', sourceKind: 'openai-compatible', sourceId: 'node-alpha-openai' }],
      },
      {
        id: 'node-degraded',
        name: 'Degraded',
        deviceType: 'server',
        status: 'degraded',
        models: [{ id: 'ollama/llama3.3:70b', provider: 'ollama', sourceKind: 'ollama', sourceId: 'node-degraded-ollama' }],
      },
      {
        id: 'node-offline',
        name: 'Offline',
        deviceType: 'server',
        status: 'offline',
        offlineReason: 'probe heartbeat lost',
        offlineCategory: 'probe_timeout',
        modelSources: [{ id: 'node-offline-mlx', kind: 'mlx', name: 'Hidden MLX', reachable: true, modelsCount: 1 }],
        models: [{ id: 'offline-only-model', displayName: 'Offline Only', provider: 'mlx', sourceKind: 'mlx', sourceId: 'node-offline-mlx' }],
      },
      {
        id: 'node-standby',
        name: 'Standby',
        deviceType: 'server',
        status: 'standby',
        models: [{ id: 'standby-only-model', provider: 'mlx', sourceKind: 'mlx' }],
      },
      {
        id: 'node-external',
        name: 'External',
        deviceType: 'edge',
        probeMode: 'external',
        status: 'standby',
        models: [{ id: 'external-only-model', provider: 'acme', sourceKind: 'openai-compatible' }],
      },
    ],
    agents: [{ id: 'agent-hub', name: 'Claude Code', harness: 'claude-code', nodeId: 'hub-primary' }],
  });

  assert.deepEqual(catalog.onlineNodes.map((n) => n.nodeId), ['hub-primary', 'node-alpha', 'node-degraded']);
  assert.deepEqual(catalog.offlineNodes.map((n) => n.nodeId), ['node-external', 'node-offline', 'node-standby']);

  for (const offlineNode of catalog.offlineNodes) {
    assert.deepEqual(
      Object.keys(offlineNode).sort(),
      ['deviceType', 'lastSeenAt', 'name', 'nodeId', 'offlineCategory', 'offlineReason', 'platform', 'status'],
      `offline node ${offlineNode.nodeId} must be disconnect metadata only`,
    );
  }
  const offlineReason = catalog.offlineNodes.find((n) => n.nodeId === 'node-offline');
  assert.equal(offlineReason.offlineReason, 'probe heartbeat lost');
  assert.equal(offlineReason.offlineCategory, 'probe_timeout');

  const hubNode = catalog.onlineNodes.find((n) => n.nodeId === 'hub-primary');
  assert.equal(hubNode.isLocal, true);
  assert.deepEqual(hubNode.models.map((m) => m.id), ['auto/deepseek-v4.1-flash']);

  const serialized = JSON.stringify(catalog);
  for (const leaked of ['offline-only-model', 'standby-only-model', 'external-only-model', 'node-offline-mlx']) {
    assert.equal(serialized.includes(leaked), false, `offline-only artifact ${leaked} leaked into catalog`);
  }
  for (const agent of catalog.agents) {
    assert.deepEqual(agent.models.filter((m) => m.id.includes('only-model')), []);
  }
  assert.equal(catalog.summary.onlineNodesCount, 3);
  assert.equal(catalog.summary.offlineNodesCount, 3);
  assert.equal(catalog.summary.totalOnlineModels, 3);
  assert.equal(catalog.summary.uniqueOnlineModels, 3);
  assert.equal(
    catalog.summary.totalOnlineModels,
    catalog.onlineNodes.reduce((acc, node) => acc + node.totalModels, 0),
  );
});

test('buildOnlineModelCatalog intersects node models with harness capabilities and the agent binding', () => {
  const catalog = buildOnlineModelCatalog({
    localNodeId: 'hub-primary',
    fleetNodes: [
      { id: 'hub-primary', name: 'Hub', deviceType: 'hub', probeMode: 'local', status: 'healthy' },
      {
        id: 'node-mix',
        name: 'Mixed Runtime',
        deviceType: 'server',
        status: 'healthy',
        modelSources: [
          { id: 'node-mix-magpie', kind: 'magpie', name: 'Magpie Gateway', reachable: true },
          { id: 'node-mix-mlx', kind: 'mlx', name: 'MLX Local', reachable: true },
          { id: 'node-mix-ollama', kind: 'ollama', name: 'Ollama Local', reachable: true },
        ],
        models: [
          { id: 'auto/deepseek-v4.1-flash', provider: 'qoder-cn', sourceKind: 'magpie', sourceId: 'node-mix-magpie', isRoutingGroup: true, reasoningLevels: ['low', 'high', 'max'] },
          { id: 'mlx/qwen3-32b-4bit', displayName: 'Qwen3 32B', provider: 'mlx', sourceKind: 'mlx', sourceId: 'node-mix-mlx' },
          { id: 'ollama/llama3.3:70b', displayName: 'Llama 3.3 70B', provider: 'ollama', sourceKind: 'ollama', sourceId: 'node-mix-ollama' },
        ],
        agentBindings: [HARNESS_BINDING],
      },
    ],
    agents: [
      { id: 'agent-claude', name: 'Claude Code', harness: 'claude-code', nodeId: 'node-mix' },
      { id: 'agent-pi', name: 'Pi Agent', harness: 'pi-agent', nodeId: 'node-mix' },
    ],
  });

  const claude = catalog.agents.find((a) => a.agentId === 'agent-claude');
  assert.equal(claude.online, true);
  assert.deepEqual(claude.models.map((m) => m.id), ['auto/deepseek-v4.1-flash']);
  assert.equal(claude.models.every((m) => m.sourceKind === 'magpie'), true);
  assert.deepEqual(claude.sources.map((s) => s.id), ['node-mix-magpie']);
  assert.equal(claude.binding, null);
  assert.equal(claude.defaultModel, 'auto/deepseek-v4.1-flash');
  assert.equal(claude.defaultSource, 'node-recommended');
  assert.deepEqual(claude.parameterConstraints.allowedEfforts, ['low', 'high', 'max']);
  assert.equal(claude.parameterConstraints.defaultEffort, 'high');
  assert.ok(claude.parameterConstraints.supportedSources.includes('openai-compatible'));

  const pi = catalog.agents.find((a) => a.agentId === 'agent-pi');
  assert.equal(pi.online, true);
  assert.deepEqual(pi.models.map((m) => m.id), [
    'auto/deepseek-v4.1-flash',
    'mlx/qwen3-32b-4bit',
    'ollama/llama3.3:70b',
  ]);
  assert.deepEqual(pi.sources.map((s) => s.id), ['node-mix-magpie', 'node-mix-mlx', 'node-mix-ollama']);
  assert.equal(pi.binding.mode, 'pinned');
  assert.equal(pi.binding.configSource, 'settings.json');
  assert.equal(pi.defaultModel, 'mlx/qwen3-32b-4bit');
  assert.equal(pi.defaultSource, 'node-binding');
  assert.equal(pi.models.find((m) => m.id === 'mlx/qwen3-32b-4bit').boundToAgent, true);
  assert.equal(pi.models.filter((m) => m.boundToAgent).length, 1);
  assert.equal(pi.parameterConstraints.defaultEffort, 'high');
  assert.deepEqual(pi.parameterConstraints.allowedEfforts, ['minimal', 'low', 'medium', 'high', 'xhigh']);
});

test('buildOnlineModelCatalog marks agents on offline or unknown nodes as unavailable', () => {
  const catalog = buildOnlineModelCatalog({
    localNodeId: 'hub-primary',
    fleetNodes: [
      { id: 'hub-primary', name: 'Hub', deviceType: 'hub', probeMode: 'local', status: 'healthy' },
      {
        id: 'node-offline',
        name: 'Offline',
        deviceType: 'server',
        status: 'offline',
        models: [{ id: 'mlx/offline-model', provider: 'mlx', sourceKind: 'mlx' }],
        agentBindings: [HARNESS_BINDING],
      },
    ],
    agents: [
      { id: 'agent-offline', name: 'Pi Agent', harness: 'pi-agent', nodeId: 'node-offline' },
      { id: 'agent-ghost', name: 'Codex CLI', harness: 'codex-cli', nodeId: 'node-missing' },
    ],
  });

  const offline = catalog.agents.find((a) => a.agentId === 'agent-offline');
  assert.equal(offline.online, false);
  assert.equal(offline.unavailableReason, 'node_offline');
  assert.deepEqual(offline.models, []);
  assert.equal(offline.totalModels, 0);
  assert.equal(offline.defaultModel, null);
  assert.equal(offline.defaultSource, 'none');
  assert.equal(offline.binding, null);
  assert.equal(offline.nodeName, 'Offline');
  assert.ok(offline.parameterConstraints.defaultEffort);

  const ghost = catalog.agents.find((a) => a.agentId === 'agent-ghost');
  assert.equal(ghost.online, false);
  assert.equal(ghost.unavailableReason, 'node_unreachable');
  assert.deepEqual(ghost.models, []);
  assert.equal(ghost.defaultModel, null);

  const serialized = JSON.stringify(catalog.agents);
  assert.equal(serialized.includes('mlx/offline-model'), false);
  assert.equal(catalog.summary.onlineAgents, 0);
  assert.equal(catalog.summary.offlineAgents, 2);
});

test('buildOnlineModelCatalog redacts accounts, secrets, and local config paths', () => {
  const catalog = buildOnlineModelCatalog({
    localNodeId: 'hub-primary',
    hubMagpieCatalog: {
      reachable: true,
      latencyMs: 7,
      models: [
        { id: 'auto/clean-model', displayName: `Clean model for ${SYNTHETIC_EMAIL}`, provider: 'vendor-a' },
        { id: `auto/${SYNTHETIC_SECRET}`, displayName: 'Secret id must drop' },
        { id: `auto/${SYNTHETIC_EMAIL}`, displayName: 'Account id must drop' },
      ],
      agentBindings: [
        { name: 'Claude Code', harness: 'claude-code', canonicalModel: 'auto/clean-model', mode: 'pinned', effort: 'max', configSource: SYNTHETIC_HOME_PATH },
        { name: 'Broken Binding', harness: 'claude-code', canonicalModel: SYNTHETIC_EMAIL },
      ],
    },
    fleetNodes: [
      {
        id: 'hub-primary',
        name: 'Hub',
        deviceType: 'hub',
        probeMode: 'local',
        status: 'healthy',
        modelSources: [{ id: 'hub-extra', kind: 'ollama', name: `Local ${SYNTHETIC_EMAIL}`, reachable: true }],
      },
      {
        id: 'node-leaky',
        name: 'Leaky Node',
        deviceType: 'server',
        status: 'healthy',
        modelSources: [{ id: 'node-leaky-mlx', kind: 'mlx', name: `MLX owned by ${SYNTHETIC_EMAIL}`, reachable: true }],
        models: [
          { id: 'mlx/safe-model', displayName: `Qwen for ${SYNTHETIC_EMAIL}`, provider: 'mlx', sourceKind: 'mlx', sourceId: 'node-leaky-mlx' },
          { id: `mlx/${SYNTHETIC_SECRET}`, displayName: 'drop me' },
        ],
      },
    ],
    agents: [
      { id: 'agent-claude', name: 'Claude Code', harness: 'claude-code', nodeId: 'hub-primary' },
    ],
  });

  const serialized = JSON.stringify(catalog);
  assertNoSensitiveFragments(serialized, 'model catalog');
  assert.equal(serialized.includes('drop me'), false);
  assert.ok(serialized.includes('[redacted-account]'));

  const hub = catalog.onlineNodes.find((n) => n.nodeId === 'hub-primary');
  assert.deepEqual(hub.models.map((m) => m.id), ['auto/clean-model']);
  assert.match(hub.models[0].displayName, /\[redacted-account\]/);
  assert.equal(hub.sources.find((s) => s.id === 'hub-extra').name.includes('[redacted-account]'), true);
  assert.equal(hub.agentBindings.length, 1);
  assert.equal(hub.agentBindings[0].configSource, 'local-config');

  const claude = catalog.agents.find((a) => a.agentId === 'agent-claude');
  assert.equal(claude.defaultModel, 'auto/clean-model');
  assert.equal(claude.defaultSource, 'node-binding');
  assert.equal(claude.binding.configSource, 'local-config');

  const leaky = catalog.onlineNodes.find((n) => n.nodeId === 'node-leaky');
  assert.deepEqual(leaky.models.map((m) => m.id), ['mlx/safe-model']);
  assert.equal(leaky.sources.find((s) => s.id === 'node-leaky-mlx').name.includes('[redacted-account]'), true);
  assert.equal(leaky.sources.find((s) => s.id === 'node-leaky-mlx').modelsCount, 1);
});

test('buildOnlineModelCatalog orders models deterministically and hashes stably', () => {
  const hubNode = { id: 'hub-primary', name: 'Hub', deviceType: 'hub', probeMode: 'local', status: 'healthy' };
  const makeNode = () => ({
    id: 'node-order',
    name: 'Order Node',
    deviceType: 'server',
    status: 'healthy',
    models: [
      { id: 'zeta/z-model', provider: 'zeta', sourceKind: 'openai-compatible' },
      { id: 'ollama/llama3.3:70b', provider: 'ollama', sourceKind: 'ollama' },
      { id: 'auto/deepseek-v4.1-flash', provider: 'qoder-cn', sourceKind: 'magpie', isRoutingGroup: true },
      { id: 'alpha/a-model', provider: 'alpha', sourceKind: 'openai-compatible' },
      { id: 'mlx/qwen3-32b-4bit', provider: 'mlx', sourceKind: 'mlx' },
    ],
    agentBindings: [HARNESS_BINDING],
  });
  const agents = [
    { id: 'agent-z', name: 'Zed', harness: 'codex-cli', nodeId: 'node-order' },
    { id: 'agent-a', name: 'Pi Agent', harness: 'pi-agent', nodeId: 'node-order' },
  ];

  const first = buildOnlineModelCatalog({ localNodeId: 'hub-primary', fleetNodes: [hubNode, makeNode()], agents });
  const second = buildOnlineModelCatalog({
    localNodeId: 'hub-primary',
    fleetNodes: [makeNode(), hubNode],
    agents: [...agents].reverse(),
  });

  const node = first.onlineNodes.find((n) => n.nodeId === 'node-order');
  assert.deepEqual(node.models.map((m) => `${m.category}|${m.id}`), [
    'routing-group|auto/deepseek-v4.1-flash',
    'local|mlx/qwen3-32b-4bit',
    'local|ollama/llama3.3:70b',
    'cloud|alpha/a-model',
    'cloud|zeta/z-model',
  ]);
  assert.deepEqual(first.agents.map((a) => a.agentId), ['agent-a', 'agent-z']);
  assert.match(first.catalogHash, /^[0-9a-f]{16}$/);
  assert.equal(first.catalogHash, second.catalogHash);
  assert.equal(second.onlineNodes[1].models.length, 5);

  const extendedNode = makeNode();
  extendedNode.models.push({ id: 'beta/b-model', provider: 'beta', sourceKind: 'openai-compatible' });
  const extended = buildOnlineModelCatalog({ localNodeId: 'hub-primary', fleetNodes: [hubNode, extendedNode], agents });
  assert.notEqual(extended.catalogHash, first.catalogHash);

  const filtered = filterOnlineModelCatalog(first, { nodeId: 'node-order' });
  assert.deepEqual(filtered.onlineNodes.map((n) => n.nodeId), ['node-order']);
  assert.deepEqual(filtered.agents.map((a) => a.agentId), ['agent-a', 'agent-z']);
  assert.equal(filtered.catalogHash, first.catalogHash);
  assert.equal(filtered.summary.totalAgents, 2);

  const noMatch = filterOnlineModelCatalog(first, { nodeId: 'node-missing' });
  assert.deepEqual(noMatch.onlineNodes, []);
  assert.deepEqual(noMatch.agents, []);
  assert.equal(noMatch.summary.onlineNodesCount, 0);
});

test('discoverLocalModelCatalog probes loopback sources only and strips sensitive ids', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const payload = (() => {
      if (url.includes(':3426')) {
        return {
          object: 'list',
          data: [
            { id: 'auto/deepseek-v4.1-flash', owned_by: 'auto', reasoning: true, reasoning_levels: ['low', 'high'] },
            { id: `auto/${SYNTHETIC_SECRET}`, owned_by: 'auto' },
            { id: `tenant-${SYNTHETIC_EMAIL}`, owned_by: 'auto' },
            { id: 'opencode-go/gpt-6-luna', owned_by: 'opencode-go', display_name: `Luna for ${SYNTHETIC_EMAIL}` },
          ],
        };
      }
      if (url.includes(':11434')) return { models: [{ name: 'llama3.3:70b' }] };
      if (url.includes(':8080')) return { data: [{ id: 'mlx/qwen3-32b-4bit', owned_by: 'mlx' }] };
      if (url.includes(':9000')) return { data: [{ id: 'custom/model-one' }] };
      throw new Error(`unexpected endpoint ${url}`);
    })();
    return { ok: true, json: async () => payload };
  };

  const result = await discoverLocalModelCatalog({
    fetchImpl,
    nodeId: 'lab-node-1',
    customSources: [
      { id: 'custom-remote', kind: 'openai-compatible', name: 'Remote', url: 'http://example.com:9100/v1/models' },
      { id: 'custom-loop', kind: 'openai-compatible', name: 'Loop', url: 'http://127.0.0.1:9000/v1/models' },
    ],
  });

  assert.deepEqual(result.modelSources.map((s) => `${s.kind}:${s.id}`), [
    'magpie:lab-node-1-magpie',
    'ollama:lab-node-1-ollama',
    'mlx:lab-node-1-mlx',
    'openai-compatible:custom-loop',
  ]);
  assert.equal(result.modelSources.every((s) => s.endpointScope === 'loopback'), true);
  assert.equal(result.modelSources.some((s) => s.id === 'custom-remote'), false);
  assert.equal(calls.some((url) => url.includes('example.com')), false);

  const modelIds = result.models.map((m) => m.id);
  assert.deepEqual(modelIds, [
    'auto/deepseek-v4.1-flash',
    'opencode-go/gpt-6-luna',
    'llama3.3:70b',
    'mlx/qwen3-32b-4bit',
    'custom/model-one',
  ]);
  assert.equal(result.models.find((m) => m.id === 'auto/deepseek-v4.1-flash').isRoutingGroup, true);
  assert.match(result.models.find((m) => m.id === 'opencode-go/gpt-6-luna').displayName, /\[redacted-account\]/);
  assert.deepEqual(result.agentBindings, []);
  assertNoSensitiveFragments(JSON.stringify(result), 'probe discovery');

  const partial = await discoverLocalModelCatalog({
    fetchImpl: async (url) => (url.includes(':11434') ? { ok: false, json: async () => null } : fetchImpl(url)),
    nodeId: 'lab-node-1',
  });
  assert.deepEqual(partial.modelSources.map((s) => s.kind), ['magpie', 'mlx']);
});

test('parseProbeMagpieBindings parses magpie ls table lines without leaking noise', () => {
  const stdout = [
    'NAME        MODEL                                      EFFORT',
    '----------  -----------------------------------------  ------',
    'Codex       auto/deepseek-v4.1-flash                    high',
    'Claude Code  magpie/opencode-go/claude-sonnet-5-5        max',
    'Pi          —',
    'Alma        provider opencode-go',
    'Codex       auto/duplicate-model                       low',
    'Broken line without a model column',
  ].join('\n');

  const bindings = parseProbeMagpieBindings(stdout);
  assert.deepEqual(bindings.map((b) => b.name), ['Codex', 'Claude Code', 'Pi', 'Alma']);

  const [codex, claude, pi, alma] = bindings;
  assert.equal(codex.harness, 'codex-cli');
  assert.equal(codex.canonicalModel, 'auto/deepseek-v4.1-flash');
  assert.equal(codex.mode, 'pinned');
  assert.equal(codex.effort, 'high');

  assert.equal(claude.harness, 'claude-code');
  assert.equal(claude.canonicalModel, 'opencode-go/claude-sonnet-5-5');
  assert.equal(claude.effort, 'max');

  assert.equal(pi.harness, 'pi-agent');
  assert.equal(pi.canonicalModel, null);
  assert.equal(pi.mode, 'default');
  assert.equal(pi.effort, null);

  assert.equal(alma.harness, 'alma');
  assert.equal(alma.canonicalModel, null);
  assert.equal(alma.mode, 'provider');

  assert.deepEqual(parseProbeMagpieBindings(''), []);
  const redacted = parseProbeMagpieBindings(`Codex  ${SYNTHETIC_EMAIL}  high`);
  assertNoSensitiveFragments(JSON.stringify(redacted), 'parsed bindings');
});

test('sanitizeProbePayload keeps harness versions and sanitizes model discovery blocks', () => {
  const clean = sanitizeProbePayload({
    nodeId: 'lab-node-1',
    deviceType: 'server',
    platform: 'linux',
    harnesses: [
      { name: 'Pi Agent', harness: 'pi-agent', version: '0.18.4', status: 'healthy' },
      { name: 'Codex CLI', harness: 'codex-cli', version: '0.29.0\n', status: 'healthy' },
    ],
    modelSources: [
      { id: 'lab-node-1-mlx', kind: 'mlx', name: `MLX for ${SYNTHETIC_EMAIL}`, reachable: true, modelsCount: 2 },
      { id: 'lab-node-1-bad', kind: 'mlx', name: 'Bad', reachable: true, modelsCount: Number.NaN },
    ],
    models: [
      { id: 'mlx/qwen3-32b-4bit', displayName: `Qwen for ${SYNTHETIC_EMAIL}`, provider: 'mlx', sourceKind: 'mlx', sourceId: 'lab-node-1-mlx' },
      { id: `mlx/${SYNTHETIC_SECRET}`, displayName: 'secret model' },
      { id: `mlx/${SYNTHETIC_EMAIL}`, displayName: 'account model' },
    ],
    agentBindings: [
      { name: 'Pi', harness: 'pi-agent', canonicalModel: 'mlx/qwen3-32b-4bit', mode: 'pinned', effort: 'high', configSource: SYNTHETIC_HOME_PATH },
      { name: 'Claude Code', harness: 'claude-code', canonicalModel: SYNTHETIC_EMAIL },
    ],
  }, 'lab-node-1');

  assert.equal(clean.harnesses[0].version, '0.18.4');
  assert.equal(clean.harnesses[1].version, '0.29.0');
  assert.equal(clean.modelSources.length, 2);
  assert.equal(clean.modelSources[0].modelsCount, 2);
  assert.equal(clean.modelSources[1].modelsCount, 0);
  assert.match(clean.modelSources[0].name, /\[redacted-account\]/);
  assert.deepEqual(clean.models.map((m) => m.id), ['mlx/qwen3-32b-4bit']);
  assert.deepEqual(clean.agentBindings.map((b) => b.name), ['Pi']);
  assert.equal(clean.agentBindings[0].configSource, 'local-config');
  assertNoSensitiveFragments(JSON.stringify(clean), 'sanitized telemetry');
});

test('ProbeRegistry.buildFleetView exposes models only while the probe is online', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-fleet-'));
  const config = {
    demo: false,
    console: { dataDir, hosts: ['127.0.0.1'], port: 0 },
    security: { exposeClientIps: false },
    fleet: {
      localNode: { id: 'hub-local', name: 'Hub Local' },
      probeStaleSec: 90,
      probeOfflineSec: 180,
      declaredNodes: [],
      meshLinks: [],
    },
  };
  const registry = new ProbeRegistry({ config, logger: null, timeseries: null });
  try {
    const payload = sanitizeProbePayload({
      nodeId: 'lab-node-1',
      deviceType: 'server',
      platform: 'linux',
      modelSources: [
        { id: 'lab-node-1-ollama', kind: 'ollama', name: 'Ollama Local', reachable: true, modelsCount: 1 },
      ],
      models: [
        { id: 'ollama/llama3.3:70b', provider: 'ollama', sourceKind: 'ollama', sourceId: 'lab-node-1-ollama' },
      ],
      agentBindings: [HARNESS_BINDING],
    }, 'lab-node-1');
    await registry.ingest({ nodeId: 'lab-node-1', payload, sourceIp: '127.0.0.1' });

    const fresh = registry.buildFleetView({ snapshot: {} }).nodes.find((n) => n.id === 'lab-node-1');
    assert.equal(fresh.status, 'healthy');
    assert.deepEqual(fresh.modelSources.map((s) => s.id), ['lab-node-1-ollama']);
    assert.deepEqual(fresh.models.map((m) => m.id), ['ollama/llama3.3:70b']);
    assert.deepEqual(fresh.agentBindings.map((b) => b.name), ['Pi']);

    const telemetry = registry.telemetry.get('lab-node-1');
    telemetry.receivedMs = Date.now() - 10 * 60 * 1000;
    const stale = registry.buildFleetView({ snapshot: {} }).nodes.find((n) => n.id === 'lab-node-1');
    assert.equal(stale.status, 'offline');
    assert.deepEqual(stale.modelSources, []);
    assert.deepEqual(stale.models, []);
    assert.deepEqual(stale.agentBindings, []);

    assert.equal(registry.telemetry.get('lab-node-1').data.models.length, 1);
  } finally {
    await registry.flush();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

function startSseCollector(baseUrl) {
  const controller = new AbortController();
  const events = [];
  const ready = (async () => {
    const res = await fetch(`${baseUrl}/api/events/stream`, {
      signal: controller.signal,
      headers: { Accept: 'text/event-stream' },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/event-stream/);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const eventLine = frame.split('\n').find((line) => line.startsWith('event: '));
            const dataLine = frame.split('\n').find((line) => line.startsWith('data: '));
            if (eventLine && dataLine) {
              events.push({ type: eventLine.slice(7).trim(), data: JSON.parse(dataLine.slice(6)) });
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch {
        // stream aborted on teardown
      }
    })();
  })();
  return {
    events,
    ready,
    close: () => controller.abort(),
    async waitFor(predicate, timeoutMs = 8000) {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutMs) {
        const hit = events.find(predicate);
        if (hit) return hit;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error('Timed out waiting for SSE model catalog event');
    },
  };
}

test('HTTP + SSE: probe ingest and revoke update the online node model catalog', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-http-'));
  const config = loadConfig({
    cli: { hosts: '127.0.0.1', port: 4321, demo: true },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  config.security.trustProxy = true;
  const hubMagpieCatalog = {
    reachable: true,
    latencyMs: 8,
    models: [
      { id: 'auto/deepseek-v4.1-flash', displayName: 'DeepSeek V4.1 Flash', provider: 'qoder-cn', isRoutingGroup: true, reasoningLevels: ['low', 'high', 'max'] },
      { id: 'opencode-go/claude-sonnet-5-5', displayName: 'Claude Sonnet 5.5', provider: 'opencode-go' },
    ],
    agentBindings: [
      { name: 'Claude Code', harness: 'claude-code', canonicalModel: 'auto/deepseek-v4.1-flash', mode: 'pinned', effort: 'max', configSource: 'settings.json' },
    ],
  };
  const app = createOpsConsole({
    config,
    silentStdout: true,
    collectHubMagpieCatalog: async () => hubMagpieCatalog,
  });
  const busEvents = [];
  const unsubscribe = app.eventBus.subscribe('model_catalog_updated', (evt) => busEvents.push(evt));
  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;
  const sse = startSseCollector(baseUrl);
  try {
    await sse.ready;

    const baseline = await fetch(`${baseUrl}/api/models/catalog`).then((r) => r.json());
    assert.equal(baseline.ok, true);
    assert.match(baseline.catalogHash, /^[0-9a-f]{16}$/);
    const baselineLocal = baseline.onlineNodes.find((n) => n.isLocal);
    assert.ok(baselineLocal);
    assert.equal(baselineLocal.models.some((m) => m.id === 'auto/deepseek-v4.1-flash'), true);

    const enroll = await fetch(`${baseUrl}/api/probes/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'lab-node-1', name: 'Lab Node', deviceType: 'server', region: 'Lab' }),
    }).then((r) => r.json());
    assert.equal(enroll.ok, true);
    assert.ok(enroll.token.startsWith('ops_prb_'));

    const ingestRes = await fetch(`${baseUrl}/api/probes/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ops-Probe-Id': 'lab-node-1',
        Authorization: `Bearer ${enroll.token}`,
      },
      body: JSON.stringify({
        nodeId: 'lab-node-1',
        deviceType: 'server',
        platform: 'linux',
        cpu: { cores: 8, usagePct: 12 },
        memory: { totalBytes: 8589934592, usedBytes: 858993459, usedPct: 10 },
        harnesses: [{ name: 'Pi Agent', harness: 'pi-agent', version: '0.18.4', status: 'healthy' }],
        modelSources: [
          { id: 'lab-node-1-mlx', kind: 'mlx', name: 'MLX Local Server', reachable: true, modelsCount: 2 },
        ],
        models: [
          { id: 'mlx/lab-only-model-one', displayName: 'Lab Model One', provider: 'mlx', sourceKind: 'mlx', sourceId: 'lab-node-1-mlx', reasoningLevels: ['low', 'high'] },
          { id: 'mlx/lab-only-model-two', displayName: 'Lab Model Two', provider: 'mlx', sourceKind: 'mlx', sourceId: 'lab-node-1-mlx' },
          { id: `mlx/${SYNTHETIC_SECRET}`, displayName: 'must drop' },
        ],
        agentBindings: [
          { name: 'Pi', harness: 'pi-agent', canonicalModel: 'mlx/lab-only-model-two', mode: 'pinned', effort: 'high', configSource: 'pi-settings.json' },
        ],
        note: `contact ${SYNTHETIC_EMAIL}`,
      }),
    });
    assert.equal(ingestRes.status, 200);
    const ingestBody = await ingestRes.json();
    assert.equal(ingestBody.ok, true);
    assert.equal(ingestBody.nodeId, 'lab-node-1');

    const ingestSse = await sse.waitFor(
      (evt) => evt.type === 'model_catalog_updated' && evt.data.payload.reason === 'probe_ingest',
    );
    assert.equal(ingestSse.data.payload.nodeId, 'lab-node-1');
    const ingestBus = busEvents.find((evt) => evt.payload.reason === 'probe_ingest');
    assert.ok(ingestBus, 'eventBus must emit model_catalog_updated on probe ingest');
    assert.equal(ingestBus.payload.catalogHash, ingestSse.data.payload.catalogHash);
    assert.equal(ingestBus.payload.uniqueOnlineModels > 0, true);

    const catalog = await fetch(`${baseUrl}/api/models/catalog`).then((r) => r.json());
    const localNode = catalog.onlineNodes.find((n) => n.isLocal);
    const probeNode = catalog.onlineNodes.find((n) => n.nodeId === 'lab-node-1');
    assert.ok(localNode, 'local hub node must be present');
    assert.ok(probeNode, 'online probe node must be present');
    assert.equal(probeNode.status, 'healthy');
    assert.deepEqual(probeNode.models.map((m) => m.id), ['mlx/lab-only-model-one', 'mlx/lab-only-model-two']);
    assert.equal(localNode.models.some((m) => m.id === 'auto/deepseek-v4.1-flash'), true);
    assert.equal(localNode.models.some((m) => m.id === 'opencode-go/claude-sonnet-5-5'), true);
    assertNoSensitiveFragments(JSON.stringify(catalog), 'catalog API');

    const probeAgent = catalog.agents.find((a) => a.nodeId === 'lab-node-1');
    assert.ok(probeAgent, 'probe harness must be registered as an agent');
    assert.equal(probeAgent.online, true);
    assert.equal(probeAgent.defaultModel, 'mlx/lab-only-model-two');
    assert.equal(probeAgent.defaultSource, 'node-binding');
    assert.deepEqual(probeAgent.models.map((m) => m.id), ['mlx/lab-only-model-one', 'mlx/lab-only-model-two']);

    const byNode = await fetch(`${baseUrl}/api/models/catalog?nodeId=lab-node-1`).then((r) => r.json());
    assert.deepEqual(byNode.onlineNodes.map((n) => n.nodeId), ['lab-node-1']);
    assert.deepEqual(byNode.offlineNodes, []);
    assert.equal(byNode.agents.every((a) => a.nodeId === 'lab-node-1'), true);
    assert.equal(byNode.catalogHash, catalog.catalogHash);

    const byAgent = await fetch(`${baseUrl}/api/models/catalog?agentId=${encodeURIComponent(probeAgent.agentId)}`).then((r) => r.json());
    assert.deepEqual(byAgent.agents.map((a) => a.agentId), [probeAgent.agentId]);
    assert.equal(byAgent.agents[0].nodeId, 'lab-node-1');
    assert.equal(byAgent.agents[0].models.length, 2);
    assert.equal(byAgent.catalogHash, catalog.catalogHash);

    const card = await fetch(`${baseUrl}/.well-known/agent-card.json`).then((r) => r.json());
    assert.ok(card.metadata.modelCatalog);
    assert.equal(card.metadata.modelCatalog.catalogHash, catalog.catalogHash);
    assert.equal(card.metadata.modelCatalog.uniqueOnlineModels, catalog.summary.uniqueOnlineModels);
    assert.ok(Array.isArray(card.metadata.agents) && card.metadata.agents.length > 0);
    const cardAgent = card.metadata.agents.find((a) => a.id === probeAgent.agentId);
    assert.ok(cardAgent, 'agent card must expose catalog agent details');
    assert.equal(cardAgent.online, true);
    assert.equal(cardAgent.defaultModel, 'mlx/lab-only-model-two');
    assert.equal(cardAgent.defaultSource, 'node-binding');
    assert.equal(cardAgent.availableModelsCount, 2);
    assert.equal(cardAgent.availableModels.some((m) => m.boundToAgent), true);

    const revoke = await fetch(`${baseUrl}/api/probes/lab-node-1`, { method: 'DELETE' }).then((r) => r.json());
    assert.equal(revoke.ok, true);
    assert.equal(revoke.id, 'lab-node-1');

    const revokeSse = await sse.waitFor(
      (evt) => evt.type === 'model_catalog_updated' && evt.data.payload.reason === 'probe_revoked',
    );
    assert.equal(revokeSse.data.payload.nodeId, 'lab-node-1');
    const revokeBus = busEvents.filter((evt) => evt.payload.reason === 'probe_revoked');
    assert.equal(revokeBus.length, 1);
    assert.notEqual(revokeBus[0].payload.catalogHash, ingestBus.payload.catalogHash);

    const afterRevoke = await fetch(`${baseUrl}/api/models/catalog`).then((r) => r.json());
    assert.equal(afterRevoke.onlineNodes.some((n) => n.nodeId === 'lab-node-1'), false);
    assert.equal(afterRevoke.offlineNodes.some((n) => n.nodeId === 'lab-node-1'), false);
    const revokedSerialized = JSON.stringify(afterRevoke);
    assert.equal(revokedSerialized.includes('mlx/lab-only-model-one'), false);
    assert.equal(revokedSerialized.includes('mlx/lab-only-model-two'), false);
    assert.equal(revokedSerialized.includes('lab-node-1-mlx'), false);
    const revokedAgent = afterRevoke.agents.find((a) => a.agentId === probeAgent.agentId);
    if (revokedAgent) {
      assert.equal(revokedAgent.online, false);
      assert.deepEqual(revokedAgent.models, []);
      assert.equal(revokedAgent.defaultModel, null);
    }
  } finally {
    sse.close();
    unsubscribe();
    await app.stop();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
