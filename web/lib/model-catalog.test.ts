import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AgentModelCatalogEntry,
  CatalogModelItem,
  DynamicModelCatalogResponse,
  OnlineNodeModelCatalog,
} from '../types';
import {
  formatCatalogModelOption,
  getEffectiveEffortOptions,
  getOnlineNodesFromCatalog,
  getSelectableModelsForAgent,
  groupCatalogModels,
  resolveSelectedModelFallback,
} from './model-catalog';

function makeModel(overrides: Partial<CatalogModelItem> = {}): CatalogModelItem {
  return {
    id: 'vendor/model',
    displayName: 'Vendor Model',
    label: 'Vendor Model · vendor',
    provider: 'vendor',
    group: 'vendor',
    sourceKind: 'openai-compatible',
    sourceId: 'node-a-openai',
    category: 'cloud',
    isRoutingGroup: false,
    recommended: false,
    reasoning: false,
    reasoningLevels: [],
    contextWindow: null,
    maxOutputTokens: null,
    toolCall: true,
    nodeId: 'node-a',
    nodeName: 'Node A',
    ...overrides,
  };
}

function makeNode(overrides: Partial<OnlineNodeModelCatalog> = {}): OnlineNodeModelCatalog {
  return {
    nodeId: 'node-a',
    name: 'Node A',
    deviceType: 'server',
    platform: 'linux',
    role: 'Managed Node',
    region: 'Lab',
    status: 'healthy',
    isLocal: false,
    sources: [],
    models: [],
    agentBindings: [],
    totalModels: 0,
    lastSeenAt: null,
    ...overrides,
  };
}

function makeAgentEntry(overrides: Partial<AgentModelCatalogEntry> = {}): AgentModelCatalogEntry {
  return {
    agentId: 'agent-a',
    name: 'Agent A',
    harness: 'pi-agent',
    canonicalHarness: 'pi-agent',
    nodeId: 'node-a',
    nodeName: 'Node A',
    online: true,
    unavailableReason: null,
    binding: null,
    defaultModel: null,
    defaultSource: 'none',
    parameterConstraints: {
      supportsEffort: true,
      supportsThinking: true,
      supportsExplicitModel: true,
      supportsRoutingGroups: true,
      supportedSources: ['magpie', 'ollama', 'mlx', 'openai-compatible'],
      allowedEfforts: ['low', 'medium', 'high'],
      defaultEffort: 'medium',
      thinkingParam: 'thinkingLevel',
    },
    sources: [],
    models: [],
    totalModels: 0,
    ...overrides,
  };
}

function makeCatalog(overrides: Partial<DynamicModelCatalogResponse> = {}): DynamicModelCatalogResponse {
  return {
    ok: true,
    generatedAt: '2026-01-01T00:00:00.000Z',
    catalogHash: '0123456789abcdef',
    localNodeId: 'hub-primary',
    onlineNodes: [],
    offlineNodes: [],
    agents: [],
    summary: {
      onlineNodesCount: 0,
      offlineNodesCount: 0,
      totalOnlineModels: 0,
      uniqueOnlineModels: 0,
      totalAgents: 0,
      onlineAgents: 0,
      offlineAgents: 0,
    },
    ...overrides,
  };
}

test('getOnlineNodesFromCatalog returns selectable nodes and tolerates missing catalogs', () => {
  assert.deepEqual(getOnlineNodesFromCatalog(null), []);
  assert.deepEqual(getOnlineNodesFromCatalog(undefined), []);

  const catalog = makeCatalog({
    onlineNodes: [
      makeNode({ nodeId: 'node-healthy', status: 'healthy' }),
      makeNode({ nodeId: 'node-degraded', status: 'degraded' }),
      makeNode({ nodeId: 'node-standby', status: 'standby' }),
      makeNode({ nodeId: 'node-offline', status: 'offline' }),
    ],
  });
  assert.deepEqual(
    getOnlineNodesFromCatalog(catalog).map((node) => node.nodeId),
    ['node-healthy', 'node-degraded', 'node-standby'],
  );
});

test('getSelectableModelsForAgent obeys agent liveness before node fallback', () => {
  const onlineModels = [
    makeModel({ id: 'mlx/lab-one', category: 'local', sourceKind: 'mlx' }),
    makeModel({ id: 'mlx/lab-two', category: 'local', sourceKind: 'mlx' }),
  ];
  const fallbackModels = [makeModel({ id: 'auto/fallback', category: 'routing-group', isRoutingGroup: true, provider: 'vendor-b' })];
  const catalog = makeCatalog({
    onlineNodes: [
      makeNode({ nodeId: 'node-a', models: onlineModels, totalModels: onlineModels.length }),
      makeNode({ nodeId: 'node-b', status: 'degraded', models: fallbackModels, totalModels: 1 }),
    ],
    agents: [
      makeAgentEntry({ agentId: 'agent-online', nodeId: 'node-a', models: onlineModels, totalModels: 2, defaultModel: 'mlx/lab-two', defaultSource: 'node-binding' }),
      makeAgentEntry({ agentId: 'agent-offline', nodeId: 'node-gone', online: false, unavailableReason: 'node_offline', models: onlineModels, totalModels: 2 }),
    ],
  });

  assert.deepEqual(
    getSelectableModelsForAgent(catalog, 'agent-online').map((model) => model.id),
    ['mlx/lab-one', 'mlx/lab-two'],
  );
  assert.deepEqual(getSelectableModelsForAgent(catalog, 'agent-offline'), []);
  assert.deepEqual(getSelectableModelsForAgent(catalog, 'agent-offline', 'node-a'), []);
  assert.deepEqual(
    getSelectableModelsForAgent(catalog, 'agent-unknown', 'node-b').map((model) => model.id),
    ['auto/fallback'],
  );
  assert.deepEqual(
    getSelectableModelsForAgent(catalog, 'agent-unknown').map((model) => model.id),
    ['mlx/lab-one', 'mlx/lab-two'],
  );
  assert.deepEqual(getSelectableModelsForAgent(catalog, 'agent-unknown', 'node-missing'), []);

  const emptyCatalog = makeCatalog({ onlineNodes: [makeNode({ nodeId: 'node-offline', status: 'offline' })] });
  assert.deepEqual(getSelectableModelsForAgent(emptyCatalog, 'agent-unknown'), []);
  assert.deepEqual(getSelectableModelsForAgent(null, 'agent-unknown'), []);
});

test('groupCatalogModels orders routing groups, local runtimes, then cloud providers', () => {
  assert.deepEqual(groupCatalogModels([]), []);

  const models = [
    makeModel({ id: 'zeta/z-model', provider: 'zeta', displayName: 'Zed', category: 'cloud' }),
    makeModel({ id: 'ollama/llama3.3:70b', provider: 'ollama', sourceKind: 'ollama', category: 'local' }),
    makeModel({ id: 'auto/deepseek-v4.1-flash', provider: 'qoder-cn', category: 'routing-group', isRoutingGroup: true }),
    makeModel({ id: 'alpha/a-model', provider: 'alpha', displayName: 'Alpha', category: 'cloud' }),
    makeModel({ id: 'mlx/qwen3-32b-4bit', provider: 'mlx', sourceKind: 'mlx', category: 'local' }),
    makeModel({ id: 'alpha/a-model-2', provider: 'alpha', category: 'cloud' }),
  ];
  const groups = groupCatalogModels(models);

  assert.deepEqual(groups.map((group) => group.id), ['routing-group', 'local', 'cloud:alpha', 'cloud:zeta']);
  assert.deepEqual(groups.map((group) => group.category), ['routing-group', 'local', 'cloud', 'cloud']);
  assert.deepEqual(groups[0].items.map((model) => model.id), ['auto/deepseek-v4.1-flash']);
  assert.deepEqual(groups[1].items.map((model) => model.id), ['ollama/llama3.3:70b', 'mlx/qwen3-32b-4bit']);
  assert.deepEqual(groups[2].items.map((model) => model.id), ['alpha/a-model', 'alpha/a-model-2']);
  assert.deepEqual(groups[3].items.map((model) => model.id), ['zeta/z-model']);
  assert.equal(groups[2].label, '云端上游 · alpha');
});

test('resolveSelectedModelFallback keeps valid selections and clears stale ones', () => {
  const selectable = [
    makeModel({ id: 'mlx/lab-one' }),
    makeModel({ id: 'mlx/lab-two' }),
  ];

  assert.deepEqual(resolveSelectedModelFallback('', selectable, 'mlx/lab-two'), {
    model: '',
    didFallback: false,
    reason: 'empty_override',
  });
  assert.deepEqual(resolveSelectedModelFallback('mlx/lab-one', selectable, 'mlx/lab-two'), {
    model: 'mlx/lab-one',
    didFallback: false,
    reason: 'valid',
  });
  assert.deepEqual(resolveSelectedModelFallback('mlx/removed-model', selectable, 'mlx/lab-two'), {
    model: '',
    didFallback: true,
    reason: 'node_or_model_unavailable',
  });
  assert.deepEqual(resolveSelectedModelFallback('mlx/removed-model', selectable, null), {
    model: '',
    didFallback: true,
    reason: 'node_or_model_unavailable',
  });
  assert.deepEqual(resolveSelectedModelFallback('mlx/lab-one', [], null), {
    model: '',
    didFallback: true,
    reason: 'node_or_model_unavailable',
  });
});

test('getEffectiveEffortOptions prefers the selected model, then catalogs constraints', () => {
  const models = [
    makeModel({ id: 'mlx/lab-one', effectiveEfforts: ['low', 'high'] }),
    makeModel({ id: 'mlx/lab-two' }),
  ];
  const entry = makeAgentEntry({ models, totalModels: models.length, defaultModel: 'mlx/lab-one' });

  assert.deepEqual(getEffectiveEffortOptions(null), ['low', 'medium', 'high']);
  assert.deepEqual(getEffectiveEffortOptions(undefined), ['low', 'medium', 'high']);
  assert.deepEqual(getEffectiveEffortOptions(entry), ['low', 'high']);
  assert.deepEqual(getEffectiveEffortOptions(entry, 'mlx/lab-one'), ['low', 'high']);
  assert.deepEqual(getEffectiveEffortOptions(entry, 'mlx/lab-two'), ['low', 'medium', 'high']);
  assert.deepEqual(getEffectiveEffortOptions(entry, 'mlx/removed'), ['low', 'medium', 'high']);

  const constrained = makeAgentEntry({
    models: [],
    defaultModel: null,
    parameterConstraints: {
      supportsEffort: true,
      supportsThinking: true,
      supportsExplicitModel: true,
      supportsRoutingGroups: true,
      supportedSources: ['magpie'],
      allowedEfforts: ['minimal', 'low', 'high', 'xhigh'],
      defaultEffort: 'low',
      thinkingParam: 'thinkingLevel',
    },
  });
  assert.deepEqual(getEffectiveEffortOptions(constrained), ['minimal', 'low', 'high', 'xhigh']);

  const unconstrained = {
    ...entry,
    models: [],
    defaultModel: null,
    parameterConstraints: undefined,
  } as unknown as AgentModelCatalogEntry;
  assert.deepEqual(getEffectiveEffortOptions(unconstrained), ['low', 'medium', 'high']);
});

test('formatCatalogModelOption renders binding, routing, local, cloud, and reasoning tags', () => {
  const boundRouting = makeModel({
    id: 'auto/deepseek-v4.1-flash',
    displayName: 'DeepSeek Flash',
    category: 'routing-group',
    isRoutingGroup: true,
    boundToAgent: true,
    reasoning: true,
  });
  assert.equal(formatCatalogModelOption(boundRouting), 'DeepSeek Flash [默认绑定 · 路由组 · 推理]');

  const routingOnly = makeModel({ displayName: 'Auto', category: 'routing-group', isRoutingGroup: true });
  assert.equal(formatCatalogModelOption(routingOnly), 'Auto [路由组]');

  const localMlx = makeModel({ displayName: 'Qwen3 32B', category: 'local', sourceKind: 'mlx', provider: 'mlx' });
  assert.equal(formatCatalogModelOption(localMlx), 'Qwen3 32B [MLX]');

  const localOllama = makeModel({ displayName: 'Llama', category: 'local', sourceKind: 'ollama', provider: 'ollama', reasoning: true });
  assert.equal(formatCatalogModelOption(localOllama), 'Llama [OLLAMA · 推理]');

  const cloud = makeModel({ displayName: 'Claude', provider: 'acme' });
  assert.equal(formatCatalogModelOption(cloud), 'Claude [acme]');

  const unnamed = makeModel({ id: 'acme/unnamed', displayName: '', provider: 'acme' });
  assert.equal(formatCatalogModelOption(unnamed), 'acme/unnamed [acme]');
});
