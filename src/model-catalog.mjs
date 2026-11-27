import crypto from 'node:crypto';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SECRET_FRAGMENT_RE = /(?:sk-|ghp_|gho_|github_pat_|xox[baprs]-|bearer\s+)[A-Za-z0-9._-]{8,}/gi;
const SENSITIVE_KEY_RE = /(email|account|token|secret|password|apikey|api_key|authorization|credential|cookie|privatekey|private_key)/i;

const VALID_SOURCE_KINDS = new Set(['magpie', 'ollama', 'mlx', 'openai-compatible']);
const CATEGORY_ORDER = { 'routing-group': 0, local: 1, cloud: 2 };

export const HARNESS_CAPABILITIES = Object.freeze({
  'codex-cli': Object.freeze({
    harness: 'codex-cli',
    label: 'Codex CLI',
    supportsEffort: true,
    supportsThinking: false,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'openai-compatible', 'ollama', 'mlx']),
    allowedEfforts: Object.freeze(['low', 'medium', 'high', 'xhigh']),
    defaultEffort: 'high',
    thinkingParam: null,
  }),
  'claude-code': Object.freeze({
    harness: 'claude-code',
    label: 'Claude Code',
    supportsEffort: true,
    supportsThinking: true,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'openai-compatible']),
    allowedEfforts: Object.freeze(['low', 'medium', 'high', 'max']),
    defaultEffort: 'high',
    thinkingParam: 'thinkingBudget',
  }),
  'pi-agent': Object.freeze({
    harness: 'pi-agent',
    label: 'Pi Agent',
    supportsEffort: true,
    supportsThinking: true,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'ollama', 'mlx', 'openai-compatible']),
    allowedEfforts: Object.freeze(['minimal', 'low', 'medium', 'high', 'xhigh']),
    defaultEffort: 'medium',
    thinkingParam: 'thinkingLevel',
  }),
  'gemini-cli': Object.freeze({
    harness: 'gemini-cli',
    label: 'Gemini / AGY CLI',
    supportsEffort: true,
    supportsThinking: true,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'openai-compatible']),
    allowedEfforts: Object.freeze(['low', 'medium', 'high']),
    defaultEffort: 'high',
    thinkingParam: 'thinkingLevel',
  }),
  'opencode': Object.freeze({
    harness: 'opencode',
    label: 'OpenCode',
    supportsEffort: true,
    supportsThinking: false,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'ollama', 'mlx', 'openai-compatible']),
    allowedEfforts: Object.freeze(['low', 'medium', 'high']),
    defaultEffort: 'medium',
    thinkingParam: null,
  }),
  'dsh-expert': Object.freeze({
    harness: 'dsh-expert',
    label: 'DSH Expert',
    supportsEffort: true,
    supportsThinking: false,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'ollama', 'mlx', 'openai-compatible']),
    allowedEfforts: Object.freeze(['low', 'medium', 'high', 'max']),
    defaultEffort: 'high',
    thinkingParam: null,
  }),
  't3-code': Object.freeze({
    harness: 't3-code',
    label: 'T3 Code',
    supportsEffort: true,
    supportsThinking: false,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'openai-compatible', 'ollama', 'mlx']),
    allowedEfforts: Object.freeze(['low', 'medium', 'high', 'xhigh']),
    defaultEffort: 'high',
    thinkingParam: null,
  }),
  'alma': Object.freeze({
    harness: 'alma',
    label: 'Alma',
    supportsEffort: true,
    supportsThinking: true,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'ollama', 'mlx', 'openai-compatible']),
    allowedEfforts: Object.freeze(['low', 'medium', 'high']),
    defaultEffort: 'medium',
    thinkingParam: 'thinkingLevel',
  }),
  'custom-a2a': Object.freeze({
    harness: 'custom-a2a',
    label: 'Custom A2A',
    supportsEffort: true,
    supportsThinking: false,
    supportsExplicitModel: true,
    supportsRoutingGroups: true,
    supportedSources: Object.freeze(['magpie', 'ollama', 'mlx', 'openai-compatible']),
    allowedEfforts: Object.freeze(['low', 'medium', 'high']),
    defaultEffort: 'medium',
    thinkingParam: null,
  }),
});

export function canonicalizeHarnessName(raw) {
  const lower = String(raw || '').trim().toLowerCase();
  if (!lower) return 'custom-a2a';
  if (lower.includes('codex')) return 'codex-cli';
  if (lower.includes('claude')) return 'claude-code';
  if (lower === 'pi' || lower.startsWith('pi-') || lower.includes('pi-agent')) return 'pi-agent';
  if (lower.includes('gemini') || lower === 'agy' || lower.includes('agy-cli') || lower.includes('antigravity')) return 'gemini-cli';
  if (lower.includes('opencode')) return 'opencode';
  if (lower.includes('dsh')) return 'dsh-expert';
  if (lower.includes('t3')) return 't3-code';
  if (lower.includes('alma')) return 'alma';
  if (HARNESS_CAPABILITIES[lower]) return lower;
  return 'custom-a2a';
}

export function getHarnessCapabilities(rawHarness) {
  const canonical = canonicalizeHarnessName(rawHarness);
  return HARNESS_CAPABILITIES[canonical] || HARNESS_CAPABILITIES['custom-a2a'];
}

export function stripSensitiveText(value, maxLen = 120) {
  const cleaned = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(EMAIL_RE, '[redacted-account]')
    .replace(SECRET_FRAGMENT_RE, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLen);
}

export function containsSensitiveFragment(value) {
  const text = String(value ?? '');
  EMAIL_RE.lastIndex = 0;
  SECRET_FRAGMENT_RE.lastIndex = 0;
  return EMAIL_RE.test(text) || SECRET_FRAGMENT_RE.test(text);
}

function sanitizeSourceKind(raw) {
  const lower = String(raw || '').trim().toLowerCase();
  if (VALID_SOURCE_KINDS.has(lower)) return lower;
  if (lower.includes('magpie')) return 'magpie';
  if (lower.includes('ollama')) return 'ollama';
  if (lower.includes('mlx')) return 'mlx';
  return 'openai-compatible';
}

function inferModelCategory({ isRoutingGroup, sourceKind, provider, id }) {
  if (isRoutingGroup || String(id || '').startsWith('auto/')) return 'routing-group';
  if (sourceKind === 'ollama' || sourceKind === 'mlx') return 'local';
  const providerLower = String(provider || '').toLowerCase();
  if (providerLower === 'ollama' || providerLower === 'mlx' || providerLower === 'local') return 'local';
  return 'cloud';
}

export function sanitizeModelSource(raw, nodeId = '') {
  if (!raw || typeof raw !== 'object') return null;
  const kind = sanitizeSourceKind(raw.kind || raw.type || raw.id);
  const id = stripSensitiveText(raw.id || `${nodeId || 'node'}-${kind}`, 64)
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-');
  if (!id) return null;
  const latencyMs = Number(raw.latencyMs);
  const modelsCount = Number(raw.modelsCount);
  return {
    id,
    kind,
    name: stripSensitiveText(raw.name || kind.toUpperCase(), 64),
    reachable: raw.reachable !== false,
    latencyMs: Number.isFinite(latencyMs) && latencyMs >= 0 ? Math.min(60000, Math.round(latencyMs)) : null,
    modelsCount: Number.isFinite(modelsCount) && modelsCount >= 0 ? Math.min(2048, Math.round(modelsCount)) : 0,
    endpointScope: stripSensitiveText(raw.endpointScope || 'loopback', 32),
  };
}

export function sanitizeModelEntry(raw, defaults = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const rawId = String(raw.id || '').trim();
  if (!rawId || rawId.length > 160) return null;
  if (containsSensitiveFragment(rawId)) return null;

  const sourceKind = sanitizeSourceKind(raw.sourceKind || raw.source || defaults.sourceKind || 'magpie');
  const isRoutingGroup = Boolean(raw.isRoutingGroup || raw.group === 'routing-group' || rawId.startsWith('auto/'));
  const provider = stripSensitiveText(
    raw.provider || (rawId.includes('/') ? rawId.split('/')[0] : sourceKind),
    48,
  ) || sourceKind;
  const displayName = stripSensitiveText(raw.displayName || raw.name || rawId, 96) || rawId;
  const category = inferModelCategory({ isRoutingGroup, sourceKind, provider, id: rawId });
  const label = stripSensitiveText(
    raw.label || (isRoutingGroup ? `${displayName} · routing group` : `${displayName} · ${provider}`),
    140,
  );
  const rawLevels = Array.isArray(raw.reasoningLevels) ? raw.reasoningLevels : [];
  const reasoningLevels = [...new Set(
    rawLevels
      .map((lvl) => String(lvl || '').trim().toLowerCase())
      .filter((lvl) => ['off', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(lvl)),
  )];
  const contextWindow = Number(raw.contextWindow);
  const maxOutputTokens = Number(raw.maxOutputTokens);

  return {
    id: rawId,
    displayName,
    label,
    provider,
    group: stripSensitiveText(raw.group || (isRoutingGroup ? 'routing-group' : provider), 48) || provider,
    sourceKind,
    sourceId: stripSensitiveText(raw.sourceId || defaults.sourceId || `${defaults.nodeId || 'node'}-${sourceKind}`, 64),
    category,
    isRoutingGroup,
    recommended: Boolean(raw.recommended || isRoutingGroup),
    reasoning: Boolean(raw.reasoning || reasoningLevels.length > 0),
    reasoningLevels,
    contextWindow: Number.isFinite(contextWindow) && contextWindow > 0 ? Math.round(contextWindow) : null,
    maxOutputTokens: Number.isFinite(maxOutputTokens) && maxOutputTokens > 0 ? Math.round(maxOutputTokens) : null,
    toolCall: raw.toolCall !== false,
    nodeId: stripSensitiveText(defaults.nodeId || raw.nodeId || '', 64),
    nodeName: stripSensitiveText(defaults.nodeName || raw.nodeName || defaults.nodeId || '', 80),
  };
}

export function sanitizeAgentBinding(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = stripSensitiveText(raw.name || '', 64);
  if (!name) return null;
  const canonicalModel = stripSensitiveText(raw.canonicalModel || raw.model || '', 120);
  if (canonicalModel && canonicalModel.includes('[redacted')) return null;
  const harness = canonicalizeHarnessName(raw.harness || name);
  const modeRaw = String(raw.mode || 'default').trim().toLowerCase();
  const mode = ['pinned', 'provider', 'default'].includes(modeRaw) ? modeRaw : 'default';
  const effortRaw = String(raw.effort || '').trim().toLowerCase();
  const effort = ['off', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(effortRaw)
    ? effortRaw
    : null;
  const rawConfigSource = String(raw.configSource || '').trim();
  const configSource = rawConfigSource && !rawConfigSource.includes('/') && !rawConfigSource.includes('\\')
    ? stripSensitiveText(rawConfigSource, 48)
    : (rawConfigSource ? 'local-config' : null);

  return {
    name,
    harness,
    model: canonicalModel || null,
    canonicalModel: canonicalModel || null,
    mode,
    effort,
    configSource,
  };
}

export function stripSensitiveKeysDeep(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return stripSensitiveText(value, 240);
  if (Array.isArray(value)) return value.map((item) => stripSensitiveKeysDeep(item));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_RE.test(key)) continue;
    out[key] = stripSensitiveKeysDeep(val);
  }
  return out;
}

export function isNodeOnlineForCatalog(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.probeMode === 'local' || node.deviceType === 'hub' || node.isLocal === true) {
    return node.status !== 'offline';
  }
  return node.status === 'healthy' || node.status === 'degraded';
}

function compareCatalogModels(a, b) {
  if (Boolean(a.isRoutingGroup) !== Boolean(b.isRoutingGroup)) {
    return a.isRoutingGroup ? -1 : 1;
  }
  if (Boolean(a.recommended) !== Boolean(b.recommended)) {
    return a.recommended ? -1 : 1;
  }
  const catA = CATEGORY_ORDER[a.category] ?? 9;
  const catB = CATEGORY_ORDER[b.category] ?? 9;
  if (catA !== catB) return catA - catB;
  const provCmp = String(a.provider || '').localeCompare(String(b.provider || ''));
  if (provCmp !== 0) return provCmp;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

function mergeNodeModels(models) {
  const byId = new Map();
  for (const model of models) {
    if (!model?.id) continue;
    const prev = byId.get(model.id);
    if (!prev) {
      byId.set(model.id, model);
      continue;
    }
    const preferNext = (model.sourceKind === 'magpie' && prev.sourceKind !== 'magpie')
      || (model.isRoutingGroup && !prev.isRoutingGroup)
      || ((model.contextWindow || 0) > (prev.contextWindow || 0));
    if (preferNext) {
      byId.set(model.id, {
        ...prev,
        ...model,
        reasoningLevels: model.reasoningLevels.length ? model.reasoningLevels : prev.reasoningLevels,
      });
    }
  }
  return [...byId.values()].sort(compareCatalogModels);
}

function matchBindingForAgent(agent, bindings = []) {
  if (!agent || !Array.isArray(bindings) || !bindings.length) return null;
  const targetHarness = canonicalizeHarnessName(agent.harness || agent.name);
  const agentNameLower = String(agent.name || agent.id || '').toLowerCase();
  const byHarness = bindings.find((b) => canonicalizeHarnessName(b.harness || b.name) === targetHarness);
  if (byHarness) return byHarness;
  const byName = bindings.find((b) => {
    const bName = String(b.name || '').toLowerCase();
    return bName && (agentNameLower.includes(bName) || bName.includes(agentNameLower));
  });
  return byName || null;
}

function buildOnlineNodeEntry(node, { isLocal, hubMagpieCatalog, extraLocalSources = [] }) {
  const nodeId = stripSensitiveText(node.id || 'hub-local', 64);
  const nodeName = stripSensitiveText(node.name || nodeId, 80);
  const sourcesMap = new Map();
  const rawModels = [];
  const rawBindings = [];

  if (isLocal && hubMagpieCatalog && typeof hubMagpieCatalog === 'object') {
    const magpieModels = Array.isArray(hubMagpieCatalog.models) ? hubMagpieCatalog.models : [];
    const magpieSource = sanitizeModelSource({
      id: `${nodeId}-magpie`,
      kind: 'magpie',
      name: 'Magpie Gateway',
      reachable: Boolean(hubMagpieCatalog.reachable),
      latencyMs: hubMagpieCatalog.latencyMs,
      modelsCount: magpieModels.length,
      endpointScope: 'loopback',
    }, nodeId);
    if (magpieSource) sourcesMap.set(magpieSource.id, magpieSource);
    if (hubMagpieCatalog.reachable) {
      for (const m of magpieModels) {
        const clean = sanitizeModelEntry(m, {
          nodeId,
          nodeName,
          sourceKind: 'magpie',
          sourceId: `${nodeId}-magpie`,
        });
        if (clean) rawModels.push(clean);
      }
    }
    const hubBindings = Array.isArray(hubMagpieCatalog.agentBindings)
      ? hubMagpieCatalog.agentBindings
      : (Array.isArray(hubMagpieCatalog.agents) ? hubMagpieCatalog.agents : []);
    for (const b of hubBindings) {
      const clean = sanitizeAgentBinding(b);
      if (clean) rawBindings.push(clean);
    }
  }

  const nodeSources = [
    ...(Array.isArray(node.modelSources) ? node.modelSources : []),
    ...(isLocal && Array.isArray(extraLocalSources) ? extraLocalSources : []),
  ];
  for (const src of nodeSources) {
    const cleanSrc = sanitizeModelSource(src, nodeId);
    if (cleanSrc && !sourcesMap.has(cleanSrc.id)) {
      sourcesMap.set(cleanSrc.id, cleanSrc);
    }
    if (src && Array.isArray(src.models)) {
      for (const m of src.models) {
        const clean = sanitizeModelEntry(m, {
          nodeId,
          nodeName,
          sourceKind: cleanSrc?.kind || src.kind || 'openai-compatible',
          sourceId: cleanSrc?.id || `${nodeId}-local`,
        });
        if (clean) rawModels.push(clean);
      }
    }
  }

  for (const m of Array.isArray(node.models) ? node.models : []) {
    const clean = sanitizeModelEntry(m, { nodeId, nodeName });
    if (clean) {
      rawModels.push(clean);
      if (!sourcesMap.has(clean.sourceId)) {
        const inferredSrc = sanitizeModelSource({
          id: clean.sourceId,
          kind: clean.sourceKind,
          name: clean.sourceKind.toUpperCase(),
          reachable: true,
          modelsCount: 0,
        }, nodeId);
        if (inferredSrc) sourcesMap.set(inferredSrc.id, inferredSrc);
      }
    }
  }

  for (const b of Array.isArray(node.agentBindings) ? node.agentBindings : []) {
    const clean = sanitizeAgentBinding(b);
    if (clean) rawBindings.push(clean);
  }

  const models = mergeNodeModels(rawModels);
  const countBySource = new Map();
  for (const m of models) {
    countBySource.set(m.sourceId, (countBySource.get(m.sourceId) || 0) + 1);
  }
  const sources = [...sourcesMap.values()]
    .map((src) => ({
      ...src,
      modelsCount: countBySource.get(src.id) ?? src.modelsCount ?? 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const bindingsMap = new Map();
  for (const b of rawBindings) {
    const key = `${b.harness}:${b.name.toLowerCase()}`;
    if (!bindingsMap.has(key)) bindingsMap.set(key, b);
  }
  const agentBindings = [...bindingsMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    nodeId,
    name: nodeName,
    deviceType: stripSensitiveText(node.deviceType || (isLocal ? 'hub' : 'server'), 24),
    platform: stripSensitiveText(node.os || node.platform || '', 32),
    role: stripSensitiveText(node.role || (isLocal ? 'Primary Control Plane' : 'Managed Node'), 64),
    region: stripSensitiveText(node.region || '', 64),
    status: stripSensitiveText(node.status || 'healthy', 24),
    isLocal: Boolean(isLocal),
    sources,
    models,
    agentBindings,
    totalModels: models.length,
    lastSeenAt: node.lastSeenAt || null,
  };
}

export function resolveAgentModelCatalog(agent, { onlineNodesById, offlineNodesById, localNodeId }) {
  const canonicalHarness = canonicalizeHarnessName(agent?.harness || agent?.name);
  const cap = getHarnessCapabilities(canonicalHarness);
  const targetNodeId = stripSensitiveText(agent?.nodeId || localNodeId || '', 64);
  const onlineNode = onlineNodesById.get(targetNodeId) || null;
  const offlineNode = offlineNodesById.get(targetNodeId) || null;

  const baseConstraints = {
    supportsEffort: cap.supportsEffort,
    supportsThinking: cap.supportsThinking,
    supportsExplicitModel: cap.supportsExplicitModel,
    supportsRoutingGroups: cap.supportsRoutingGroups,
    supportedSources: [...cap.supportedSources],
    allowedEfforts: [...cap.allowedEfforts],
    defaultEffort: cap.defaultEffort,
    thinkingParam: cap.thinkingParam,
  };

  if (!onlineNode) {
    return {
      agentId: stripSensitiveText(agent?.id || '', 80),
      name: stripSensitiveText(agent?.name || agent?.id || '', 96),
      harness: stripSensitiveText(agent?.harness || canonicalHarness, 48),
      canonicalHarness,
      nodeId: targetNodeId,
      nodeName: offlineNode?.name || stripSensitiveText(agent?.nodeName || targetNodeId, 80),
      online: false,
      unavailableReason: offlineNode ? 'node_offline' : 'node_unreachable',
      binding: null,
      defaultModel: null,
      defaultSource: 'none',
      parameterConstraints: baseConstraints,
      sources: [],
      models: [],
      totalModels: 0,
    };
  }

  const allowedSourceSet = new Set(cap.supportedSources);
  const binding = matchBindingForAgent(agent, onlineNode.agentBindings);
  const boundModelId = binding?.canonicalModel || null;

  const compatibleModels = onlineNode.models
    .filter((model) => {
      if (!allowedSourceSet.has(model.sourceKind)) return false;
      if (model.isRoutingGroup && !cap.supportsRoutingGroups) return false;
      return true;
    })
    .map((model) => {
      const effectiveEfforts = model.reasoningLevels.length > 0
        ? model.reasoningLevels.filter((lvl) => cap.allowedEfforts.includes(lvl))
        : [...cap.allowedEfforts];
      return {
        ...model,
        boundToAgent: Boolean(boundModelId && model.id === boundModelId),
        effectiveEfforts: effectiveEfforts.length > 0 ? effectiveEfforts : [...cap.allowedEfforts],
      };
    });

  const compatibleIds = new Set(compatibleModels.map((m) => m.id));
  let defaultModel = null;
  let defaultSource = 'none';
  if (boundModelId && compatibleIds.has(boundModelId)) {
    defaultModel = boundModelId;
    defaultSource = 'node-binding';
  } else if (agent?.modelHint && compatibleIds.has(agent.modelHint)) {
    defaultModel = agent.modelHint;
    defaultSource = 'agent-hint';
  } else if (compatibleModels.length > 0) {
    defaultModel = compatibleModels[0].id;
    defaultSource = 'node-recommended';
  }

  const activeModelObj = compatibleModels.find((m) => m.id === defaultModel) || null;
  const activeEfforts = activeModelObj?.effectiveEfforts?.length
    ? activeModelObj.effectiveEfforts
    : [...cap.allowedEfforts];
  const defaultEffort = binding?.effort && activeEfforts.includes(binding.effort)
    ? binding.effort
    : (activeEfforts.includes(cap.defaultEffort) ? cap.defaultEffort : activeEfforts[0] || 'medium');

  const compatibleSourceIds = new Set(compatibleModels.map((m) => m.sourceId));
  const sources = onlineNode.sources.filter((src) => allowedSourceSet.has(src.kind) && (src.reachable || compatibleSourceIds.has(src.id)));

  return {
    agentId: stripSensitiveText(agent?.id || '', 80),
    name: stripSensitiveText(agent?.name || agent?.id || '', 96),
    harness: stripSensitiveText(agent?.harness || canonicalHarness, 48),
    canonicalHarness,
    nodeId: onlineNode.nodeId,
    nodeName: onlineNode.name,
    online: true,
    unavailableReason: null,
    binding,
    defaultModel,
    defaultSource,
    parameterConstraints: {
      ...baseConstraints,
      allowedEfforts: activeEfforts,
      defaultEffort,
    },
    sources,
    models: compatibleModels,
    totalModels: compatibleModels.length,
  };
}

export function computeModelCatalogHash({ onlineNodes, offlineNodes, agents }) {
  const fingerprint = {
    online: onlineNodes.map((node) => ({
      id: node.nodeId,
      status: node.status,
      sources: node.sources.map((s) => `${s.id}:${s.kind}:${s.reachable ? 1 : 0}:${s.modelsCount}`),
      models: node.models.map((m) => `${m.id}@${m.sourceKind}`),
      bindings: node.agentBindings.map((b) => `${b.harness}:${b.name}:${b.canonicalModel || ''}`),
    })),
    offline: offlineNodes.map((node) => `${node.nodeId}:${node.status}`),
    agents: agents.map((a) => ({
      id: a.agentId,
      nodeId: a.nodeId,
      online: a.online,
      defaultModel: a.defaultModel,
      models: a.models.map((m) => m.id),
    })),
  };
  return crypto.createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex').slice(0, 16);
}

export function buildOnlineModelCatalog({
  fleetNodes = [],
  localNodeId = '',
  hubMagpieCatalog = null,
  agents = [],
  extraLocalSources = [],
} = {}) {
  const nodes = Array.isArray(fleetNodes) ? fleetNodes : [];
  const inferredLocalNodeId = localNodeId
    || nodes.find((n) => n?.probeMode === 'local' || n?.deviceType === 'hub' || n?.isLocal)?.id
    || 'hub-local';

  const onlineNodes = [];
  const offlineNodes = [];
  let hasLocalNode = false;

  for (const node of nodes) {
    if (!node || !node.id) continue;
    const isLocal = node.id === inferredLocalNodeId || node.probeMode === 'local' || node.deviceType === 'hub';
    if (isLocal) hasLocalNode = true;

    if (isNodeOnlineForCatalog(node)) {
      onlineNodes.push(buildOnlineNodeEntry(node, { isLocal, hubMagpieCatalog, extraLocalSources }));
    } else {
      offlineNodes.push({
        nodeId: stripSensitiveText(node.id, 64),
        name: stripSensitiveText(node.name || node.id, 80),
        deviceType: stripSensitiveText(node.deviceType || 'server', 24),
        platform: stripSensitiveText(node.os || node.platform || '', 32),
        status: stripSensitiveText(node.status || 'offline', 24),
        offlineReason: stripSensitiveText(node.offlineReason || node.statusReason || '节点离线', 120),
        offlineCategory: stripSensitiveText(node.offlineCategory || 'probe_timeout', 48),
        lastSeenAt: node.lastSeenAt || null,
      });
    }
  }

  if (!hasLocalNode && hubMagpieCatalog) {
    onlineNodes.push(buildOnlineNodeEntry({
      id: inferredLocalNodeId,
      name: 'Hub Primary',
      deviceType: 'hub',
      probeMode: 'local',
      status: 'healthy',
      os: process.platform,
    }, { isLocal: true, hubMagpieCatalog, extraLocalSources }));
  }

  onlineNodes.sort((a, b) => {
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    return a.nodeId.localeCompare(b.nodeId);
  });
  offlineNodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  const onlineNodesById = new Map(onlineNodes.map((n) => [n.nodeId, n]));
  const offlineNodesById = new Map(offlineNodes.map((n) => [n.nodeId, n]));

  const sortedAgentsInput = [...(Array.isArray(agents) ? agents : [])]
    .filter((a) => a && a.id)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const agentEntries = sortedAgentsInput.map((agent) =>
    resolveAgentModelCatalog(agent, {
      onlineNodesById,
      offlineNodesById,
      localNodeId: inferredLocalNodeId,
    }),
  );

  const uniqueModelIds = new Set();
  for (const node of onlineNodes) {
    for (const model of node.models) {
      uniqueModelIds.add(model.id);
    }
  }

  const catalogHash = computeModelCatalogHash({ onlineNodes, offlineNodes, agents: agentEntries });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    catalogHash,
    localNodeId: inferredLocalNodeId,
    onlineNodes,
    offlineNodes,
    agents: agentEntries,
    harnessCapabilities: HARNESS_CAPABILITIES,
    summary: {
      onlineNodesCount: onlineNodes.length,
      offlineNodesCount: offlineNodes.length,
      totalOnlineModels: onlineNodes.reduce((acc, n) => acc + n.totalModels, 0),
      uniqueOnlineModels: uniqueModelIds.size,
      totalAgents: agentEntries.length,
      onlineAgents: agentEntries.filter((a) => a.online).length,
      offlineAgents: agentEntries.filter((a) => !a.online).length,
    },
  };
}

export function filterOnlineModelCatalog(catalog, { nodeId = '', agentId = '' } = {}) {
  const targetNodeId = String(nodeId || '').trim();
  const targetAgentId = String(agentId || '').trim();
  if (!targetNodeId && !targetAgentId) return catalog;

  const onlineNodes = targetNodeId
    ? catalog.onlineNodes.filter((n) => n.nodeId === targetNodeId)
    : catalog.onlineNodes;
  const offlineNodes = targetNodeId
    ? catalog.offlineNodes.filter((n) => n.nodeId === targetNodeId)
    : catalog.offlineNodes;
  const agents = catalog.agents.filter((a) => {
    if (targetAgentId && a.agentId !== targetAgentId) return false;
    if (targetNodeId && a.nodeId !== targetNodeId) return false;
    return true;
  });

  const uniqueModelIds = new Set();
  for (const node of onlineNodes) {
    for (const model of node.models) uniqueModelIds.add(model.id);
  }

  return {
    ...catalog,
    onlineNodes,
    offlineNodes,
    agents,
    summary: {
      onlineNodesCount: onlineNodes.length,
      offlineNodesCount: offlineNodes.length,
      totalOnlineModels: onlineNodes.reduce((acc, n) => acc + n.totalModels, 0),
      uniqueOnlineModels: uniqueModelIds.size,
      totalAgents: agents.length,
      onlineAgents: agents.filter((a) => a.online).length,
      offlineAgents: agents.filter((a) => !a.online).length,
    },
  };
}
