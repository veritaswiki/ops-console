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
