import type {
  AgentModelCatalogEntry,
  CatalogModelItem,
  DynamicModelCatalogResponse,
  OnlineNodeModelCatalog,
} from '../types';

export interface CatalogModelGroup {
  id: string;
  label: string;
  category: string;
  items: CatalogModelItem[];
}

export function getOnlineNodesFromCatalog(
  catalog: DynamicModelCatalogResponse | null | undefined,
): OnlineNodeModelCatalog[] {
  if (!catalog || !Array.isArray(catalog.onlineNodes)) return [];
  return catalog.onlineNodes.filter((node) => node.status !== 'offline');
}

export function getAgentCatalogEntry(
  catalog: DynamicModelCatalogResponse | null | undefined,
  agentId: string | null | undefined,
): AgentModelCatalogEntry | null {
  if (!catalog || !agentId || !Array.isArray(catalog.agents)) return null;
  return catalog.agents.find((entry) => entry.agentId === agentId) || null;
}

export interface OnlineNodeOption {
  nodeId: string;
  name: string;
  status: string;
  deviceType: string;
  isLocal: boolean;
  modelCount: number;
  agentCount: number;
}

export function getOnlineNodeOptions(
  catalog: DynamicModelCatalogResponse | null | undefined,
): OnlineNodeOption[] {
  const nodes = getOnlineNodesFromCatalog(catalog);
  if (!nodes.length) return [];
  const agents = Array.isArray(catalog?.agents) ? catalog.agents : [];
  return nodes.map((node) => ({
    nodeId: node.nodeId,
    name: node.name,
    status: node.status,
    deviceType: node.deviceType,
    isLocal: Boolean(node.isLocal),
    modelCount: Array.isArray(node.models) ? node.models.length : 0,
    agentCount: agents.filter((entry) => entry.nodeId === node.nodeId && entry.online === true).length,
  }));
}

export function getOnlineAgentsForNode(
  catalog: DynamicModelCatalogResponse | null | undefined,
  nodeId?: string | null,
): AgentModelCatalogEntry[] {
  if (!catalog || !Array.isArray(catalog.agents)) return [];
  const normalizedNodeId = typeof nodeId === 'string' ? nodeId.trim() : '';
  const filterNodeId = normalizedNodeId && normalizedNodeId !== 'all' ? normalizedNodeId : null;
  return catalog.agents.filter(
    (entry) => entry.online === true && (!filterNodeId || entry.nodeId === filterNodeId),
  );
}

export function getModelsForNodeAgent(
  catalog: DynamicModelCatalogResponse | null | undefined,
  nodeId?: string | null,
  agentId?: string | null,
): CatalogModelItem[] {
  const normalizedNodeId = typeof nodeId === 'string' ? nodeId.trim() : '';
  const normalizedAgentId = typeof agentId === 'string' ? agentId.trim() : '';
  const filterNodeId = normalizedNodeId && normalizedNodeId !== 'all' ? normalizedNodeId : null;
  const filterAgentId = normalizedAgentId && normalizedAgentId !== 'auto' ? normalizedAgentId : null;

  if (filterAgentId) {
    const entry = getAgentCatalogEntry(catalog, filterAgentId);
    if (!entry || entry.online !== true) return [];
    if (filterNodeId && entry.nodeId !== filterNodeId) return [];
    return Array.isArray(entry.models) ? entry.models : [];
  }

  if (filterNodeId) {
    const node = getOnlineNodesFromCatalog(catalog).find((item) => item.nodeId === filterNodeId);
    return node && Array.isArray(node.models) ? node.models : [];
  }

  const models: CatalogModelItem[] = [];
  const seen = new Set<string>();
  for (const node of getOnlineNodesFromCatalog(catalog)) {
    if (!Array.isArray(node.models)) continue;
    for (const model of node.models) {
      if (model?.id) {
        if (seen.has(model.id)) continue;
        seen.add(model.id);
      }
      models.push(model);
    }
  }
  return models;
}

export interface OfflineFallbackResult {
  nodeId: string;
  agentId: string;
  model: string;
  didFallback: boolean;
  reason: 'valid' | 'node_offline' | 'agent_offline' | 'model_unavailable';
  notice: string | null;
}

export function resolveOfflineFallback(
  prev: { nodeId: string; agentId: string; model: string },
  catalog: DynamicModelCatalogResponse | null | undefined,
): OfflineFallbackResult {
  const onlineNodes = getOnlineNodesFromCatalog(catalog);
  const previousNodeId = prev.nodeId || '';
  const previousAgentId = prev.agentId || '';
  const previousModel = prev.model || '';
  const selectedNode = onlineNodes.find((node) => node.nodeId === previousNodeId) || null;

  if (!selectedNode) {
    const fallbackNode = onlineNodes[0] || null;
    const offlineNode = catalog?.offlineNodes?.find((node) => node.nodeId === previousNodeId) || null;
    const previousLabel = offlineNode?.name || previousNodeId || '当前节点';
    const nodeId = fallbackNode?.nodeId || '';
    const fallbackAgent =
      previousAgentId && previousAgentId !== 'auto'
        ? catalog?.agents?.find(
            (entry) =>
              entry.agentId === previousAgentId &&
              entry.online === true &&
              entry.nodeId === nodeId,
          ) || null
        : null;
    const agentId = previousAgentId && previousAgentId !== 'auto' && !fallbackAgent
      ? 'auto'
      : previousAgentId;
    return {
      nodeId,
      agentId,
      model: '',
      didFallback: true,
      reason: 'node_offline',
      notice: fallbackNode
        ? `节点「${previousLabel}」已离线，已切换到「${fallbackNode.name || fallbackNode.nodeId}」`
        : `节点「${previousLabel}」已离线，暂无可用节点`,
    };
  }

  let agentId = previousAgentId;
  let model = previousModel;
  let reason: OfflineFallbackResult['reason'] = 'valid';
  let notice: string | null = null;

  if (agentId && agentId !== 'auto') {
    const entry = getAgentCatalogEntry(catalog, agentId);
    if (!entry || entry.online !== true || entry.nodeId !== selectedNode.nodeId) {
      agentId = 'auto';
      reason = 'agent_offline';
      notice = `Agent「${entry?.name || previousAgentId}」在节点「${selectedNode.name || selectedNode.nodeId}」离线，已重置为自动选择`;
      if (model) {
        const available = getModelsForNodeAgent(catalog, selectedNode.nodeId, agentId);
        if (!available.some((item) => item.id === model)) model = '';
      }
    }
  }

  if (reason === 'valid' && model) {
    const available = getModelsForNodeAgent(catalog, selectedNode.nodeId, agentId);
    if (!available.some((item) => item.id === model)) {
      model = '';
      reason = 'model_unavailable';
      notice = `模型「${previousModel}」在节点「${selectedNode.name || selectedNode.nodeId}」不可用，已清除选择`;
    }
  }

  return {
    nodeId: selectedNode.nodeId,
    agentId,
    model,
    didFallback: reason !== 'valid',
    reason,
    notice,
  };
}

export function getSelectableModelsForAgent(
  catalog: DynamicModelCatalogResponse | null | undefined,
  agentId: string | null | undefined,
  fallbackNodeId?: string | null,
): CatalogModelItem[] {
  const entry = getAgentCatalogEntry(catalog, agentId);
  if (entry) {
    return entry.online ? entry.models : [];
  }
  const onlineNodes = getOnlineNodesFromCatalog(catalog);
  if (!onlineNodes.length) return [];
  const targetNode = fallbackNodeId
    ? onlineNodes.find((n) => n.nodeId === fallbackNodeId)
    : onlineNodes[0];
  return targetNode ? targetNode.models : [];
}

export function groupCatalogModels(models: CatalogModelItem[]): CatalogModelGroup[] {
  if (!Array.isArray(models) || !models.length) return [];
  const routing: CatalogModelItem[] = [];
  const local: CatalogModelItem[] = [];
  const byProvider = new Map<string, CatalogModelItem[]>();

  for (const item of models) {
    if (!item?.id) continue;
    if (item.category === 'routing-group' || item.isRoutingGroup) {
      routing.push(item);
      continue;
    }
    if (item.category === 'local' || item.sourceKind === 'ollama' || item.sourceKind === 'mlx') {
      local.push(item);
      continue;
    }
    const key = item.provider || item.group || 'cloud';
    const bucket = byProvider.get(key) || [];
    bucket.push(item);
    byProvider.set(key, bucket);
  }

  const groups: CatalogModelGroup[] = [];
  if (routing.length) {
    groups.push({ id: 'routing-group', label: '推荐 / 路由组', category: 'routing-group', items: routing });
  }
  if (local.length) {
    groups.push({ id: 'local', label: '本机推理 (MLX / Ollama)', category: 'local', items: local });
  }
  for (const key of [...byProvider.keys()].sort((a, b) => a.localeCompare(b))) {
    groups.push({
      id: `cloud:${key}`,
      label: `云端上游 · ${key}`,
      category: 'cloud',
      items: byProvider.get(key) || [],
    });
  }
  return groups;
}

export function resolveSelectedModelFallback(
  currentModel: string,
  selectableModels: CatalogModelItem[],
  defaultModel: string | null = null,
): { model: string; didFallback: boolean; reason: 'valid' | 'empty_override' | 'node_or_model_unavailable' } {
  if (!currentModel) {
    return { model: '', didFallback: false, reason: 'empty_override' };
  }
  if (selectableModels.some((m) => m.id === currentModel)) {
    return { model: currentModel, didFallback: false, reason: 'valid' };
  }
  if (defaultModel && selectableModels.some((m) => m.id === defaultModel)) {
    return { model: '', didFallback: true, reason: 'node_or_model_unavailable' };
  }
  return { model: '', didFallback: true, reason: 'node_or_model_unavailable' };
}

export function getEffectiveEffortOptions(
  entry: AgentModelCatalogEntry | null | undefined,
  selectedModelId?: string | null,
): string[] {
  const fallback = ['low', 'medium', 'high'];
  if (!entry) return fallback;
  const modelId = selectedModelId || entry.defaultModel || '';
  const matchedModel = modelId ? entry.models.find((m) => m.id === modelId) : null;
  if (matchedModel?.effectiveEfforts?.length) {
    return matchedModel.effectiveEfforts;
  }
  if (entry.parameterConstraints?.allowedEfforts?.length) {
    return entry.parameterConstraints.allowedEfforts;
  }
  return fallback;
}

export function formatCatalogModelOption(model: CatalogModelItem): string {
  const tags: string[] = [];
  if (model.boundToAgent) tags.push('默认绑定');
  if (model.isRoutingGroup) tags.push('路由组');
  else if (model.category === 'local') tags.push(model.sourceKind.toUpperCase());
  else tags.push(model.provider);
  if (model.reasoning) tags.push('推理');
  return `${model.displayName || model.id} [${tags.join(' · ')}]`;
}
