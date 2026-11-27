import type {
  A2AAgentPeer,
  MagpieAgentBinding,
  MagpieModelItem,
} from '../types';

export interface MagpieModelGroup {
  id: string;
  label: string;
  isRoutingGroup: boolean;
  models: MagpieModelItem[];
}

export function groupMagpieModels(models: MagpieModelItem[]): MagpieModelGroup[] {
  if (!Array.isArray(models) || models.length === 0) return [];
  const routing: MagpieModelItem[] = [];
  const providerGroups = new Map<string, MagpieModelItem[]>();

  for (const model of models) {
    if (!model?.id) continue;
    if (model.isRoutingGroup || model.group === 'routing-group' || model.id.startsWith('auto/')) {
      routing.push(model);
      continue;
    }
    const key = model.group || model.provider || 'other';
    const bucket = providerGroups.get(key) || [];
    bucket.push(model);
    providerGroups.set(key, bucket);
  }

  const groups: MagpieModelGroup[] = [];
  if (routing.length > 0) {
    groups.push({
      id: 'routing-group',
      label: `Magpie 路由组 (${routing.length})`,
      isRoutingGroup: true,
      models: routing,
    });
  }

  const sortedProviders = [...providerGroups.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0]);
  });

  for (const [providerId, items] of sortedProviders) {
    groups.push({
      id: providerId,
      label: `${providerId} (${items.length})`,
      isRoutingGroup: false,
      models: items,
    });
  }

  return groups;
}

function canonicalHarnessKey(value: string | null | undefined): string {
  const lower = String(value || '').trim().toLowerCase();
  if (lower === 'codex' || lower === 'codex-cli') return 'codex-cli';
  if (lower === 'pi' || lower === 'pi-agent') return 'pi-agent';
  if (lower === 'dsh' || lower === 'dsh-expert') return 'dsh-expert';
  if (lower === 'agy' || lower === 'agy-cli') return 'agy-cli';
  return lower;
}

export function matchMagpieBindingForAgent(
  agent: A2AAgentPeer | null | undefined,
  bindings: MagpieAgentBinding[],
): MagpieAgentBinding | null {
  if (!agent || !Array.isArray(bindings) || bindings.length === 0) return null;
  const harness = canonicalHarnessKey(agent.harness);
  const name = String(agent.name || '').toLowerCase();
  for (const binding of bindings) {
    const bHarness = canonicalHarnessKey(binding.harness);
    const bName = String(binding.name || '').toLowerCase();
    if (harness && bHarness && harness === bHarness) return binding;
    if (name && bName && (name.includes(bName) || bName.includes(name))) return binding;
  }
  return null;
}

export function resolveAgentDefaultModel(
  agent: A2AAgentPeer | null | undefined,
  bindings: MagpieAgentBinding[],
  fallbackModel?: string | null,
): { model: string; source: 'magpie' | 'agent-hint' | 'orchestrator' | 'auto'; label: string } {
  if (agent?.magpieModel) {
    return {
      model: agent.magpieModel,
      source: 'magpie',
      label: `Magpie 配置 · ${agent.magpieModel}`,
    };
  }
  const matched = matchMagpieBindingForAgent(agent, bindings);
  if (matched?.canonicalModel) {
    return {
      model: matched.canonicalModel,
      source: 'magpie',
      label: `Magpie 配置 · ${matched.canonicalModel}`,
    };
  }
  if (agent?.modelHint) {
    return {
      model: agent.modelHint,
      source: 'agent-hint',
      label: `Agent 默认 · ${agent.modelHint}`,
    };
  }
  if (fallbackModel) {
    return {
      model: fallbackModel,
      source: 'orchestrator',
      label: `编排默认 · ${fallbackModel}`,
    };
  }
  return {
    model: '',
    source: 'auto',
    label: '跟随目标 Agent 配置',
  };
}

export function formatMagpieModelOption(model: MagpieModelItem): string {
  const name = model.displayName && model.displayName !== model.id
    ? `${model.displayName} (${model.id})`
    : model.id;
  return model.reasoning ? `${name} · 推理` : name;
}

export function formatSigningSourceLabel(source?: string | null): string {
  switch (String(source || '').toLowerCase()) {
    case 'file':
      return '密钥文件 (0600)';
    case 'env':
      return '环境变量';
    case 'config':
      return '配置文件';
    case 'ephemeral':
      return '进程内临时密钥';
    default:
      return source || '未知来源';
  }
}
