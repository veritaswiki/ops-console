import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type {
  A2AAgentPeer,
  DynamicModelCatalogResponse,
  OrchestrationMode,
  ReasoningEffort,
} from '../../types';
import {
  formatCatalogModelOption,
  getAgentCatalogEntry,
  getEffectiveEffortOptions,
  getModelsForNodeAgent,
  getOnlineAgentsForNode,
  getOnlineNodeOptions,
  groupCatalogModels,
} from '../../lib/model-catalog';
import { cn, FOCUS_RING } from '../../lib/cn';
import {
  AnimatedCollapse,
  CommandCombobox,
  NativeSelect,
  type CommandComboboxOption,
} from '../ui';

export interface NodeAgentModelSelectorProps {
  catalog: DynamicModelCatalogResponse | null;
  agents: A2AAgentPeer[];
  selectedNodeId: string;
  onSelectNodeId: (nodeId: string) => void;
  selectedTarget: string; // 'auto' | agentId
  onSelectTarget: (agentId: string) => void;
  modelOverride: string;
  onSelectModel: (modelId: string) => void;
  effort: ReasoningEffort | 'max' | string;
  onSelectEffort: (effort: ReasoningEffort | 'max' | string) => void;
  executionMode: OrchestrationMode | 'plan' | string;
  onSelectExecutionMode: (mode: OrchestrationMode | 'plan' | string) => void;
  resolvedDefaultModelLabel: string;
  leadAgentName?: string;
  offlineNotice?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
}

const ALL_NODES_VALUE = 'all';

const EXECUTION_MODE_OPTIONS = [
  { value: 'lead-router', label: '自动分配' },
  { value: 'main-sub', label: '主从拆解' },
  { value: 'swarm', label: '多助手并行' },
  { value: 'plan', label: '先规划再执行' },
] as const;

const LEGACY_MODE_LABELS: Record<string, string> = {
  'lead-router': '自动分配',
  'main-sub': '主从拆解',
  swarm: '多助手并行',
  plan: '先规划再执行',
};

const EFFORT_LABELS: Record<string, string> = {
  minimal: '极速',
  low: '轻量',
  medium: '均衡',
  high: '深入',
  xhigh: '深度',
  max: '最高',
};

function formatEffortLabel(value: string): string {
  return EFFORT_LABELS[value] || value;
}

function fieldLabelClass(): string {
  return 'text-[11px] font-medium tracking-wide text-[var(--ink-subtle)]';
}

function onlinePeerFilter(peer: A2AAgentPeer, nodeId: string): boolean {
  if (peer.nodeOnline === false) return false;
  if (!nodeId || nodeId === ALL_NODES_VALUE) return true;
  return peer.nodeId === nodeId;
}

export function NodeAgentModelSelector({
  catalog,
  agents,
  selectedNodeId,
  onSelectNodeId,
  selectedTarget,
  onSelectTarget,
  modelOverride,
  onSelectModel,
  effort,
  onSelectEffort,
  executionMode,
  onSelectExecutionMode,
  resolvedDefaultModelLabel,
  leadAgentName,
  offlineNotice,
  disabled = false,
  readOnly = false,
}: NodeAgentModelSelectorProps) {
  const locked = disabled || readOnly;
  const nodeOptions = React.useMemo(() => getOnlineNodeOptions(catalog), [catalog]);
  const peerById = React.useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents],
  );

  const onlineAgentEntries = React.useMemo(() => {
    const entries = getOnlineAgentsForNode(catalog, selectedNodeId || null);
    return entries.filter((entry) => peerById.get(entry.agentId)?.nodeOnline !== false);
  }, [catalog, selectedNodeId, peerById]);

  const fallbackPeers = React.useMemo(
    () =>
      agents.filter(
        (agent) =>
          onlinePeerFilter(agent, selectedNodeId) &&
          peerById.get(agent.id)?.status !== 'offline',
      ),
    [agents, peerById, selectedNodeId],
  );

  const targetOptions = React.useMemo(() => {
    if (onlineAgentEntries.length > 0) {
      return onlineAgentEntries.map((entry) => {
        const peer = peerById.get(entry.agentId);
        return {
          value: entry.agentId,
          label: entry.name || peer?.name || entry.agentId,
          meta: [entry.nodeName || peer?.nodeName, entry.harness || peer?.harness]
            .filter(Boolean)
            .join(' · '),
        };
      });
    }
    if (catalog) return [];
    return fallbackPeers.map((peer) => ({
      value: peer.id,
      label: peer.name || peer.id,
      meta: [peer.nodeName, peer.harness].filter(Boolean).join(' · '),
    }));
  }, [catalog, fallbackPeers, onlineAgentEntries, peerById]);

  const selectedAgentEntry = React.useMemo(
    () =>
      getAgentCatalogEntry(
        catalog,
        selectedTarget && selectedTarget !== 'auto' ? selectedTarget : null,
      ),
    [catalog, selectedTarget],
  );

  const selectedModels = React.useMemo(
    () =>
      getModelsForNodeAgent(
        catalog,
        selectedNodeId || null,
        selectedTarget && selectedTarget !== 'auto' ? selectedTarget : null,
      ),
    [catalog, selectedNodeId, selectedTarget],
  );

  const modelOptions = React.useMemo<CommandComboboxOption[]>(() => {
    const options: CommandComboboxOption[] = [
      {
        value: '',
        label: `默认 · ${resolvedDefaultModelLabel || '沿用 Agent 绑定配置'}`,
        group: '默认继承',
        keywords: ['default', 'inherit', '默认'],
      },
    ];
    const seen = new Set<string>();
    for (const group of groupCatalogModels(selectedModels)) {
      for (const item of group.items) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        options.push({
          value: item.id,
          label: formatCatalogModelOption(item),
          group: group.label,
          meta: item.nodeName || undefined,
          description: item.contextWindow
            ? `上下文 ${Math.round(item.contextWindow / 1000)}k`
            : undefined,
          keywords: [item.provider, item.sourceKind, item.id],
        });
      }
    }
    if (modelOverride && !seen.has(modelOverride)) {
      options.splice(1, 0, {
        value: modelOverride,
        label: modelOverride,
        group: '当前自定义值',
        meta: '未被当前节点目录收录',
      });
    }
    return options;
  }, [modelOverride, resolvedDefaultModelLabel, selectedModels]);

  const effortOptions = React.useMemo(() => {
    const base = getEffectiveEffortOptions(selectedAgentEntry, modelOverride || null);
    const normalized = base.length > 0 ? base : ['low', 'medium', 'high'];
    return normalized.includes(effort) ? normalized : [effort, ...normalized];
  }, [effort, modelOverride, selectedAgentEntry]);

  const modeOptions = React.useMemo(() => {
    const options: Array<{ value: string; label: string }> = EXECUTION_MODE_OPTIONS.map(
      (option) => ({ value: option.value, label: option.label }),
    );
    const current = String(executionMode || '');
    if (current && !options.some((option) => option.value === current)) {
      options.unshift({
        value: current,
        label: `${LEGACY_MODE_LABELS[current] || current} · 当前`,
      });
    }
    return options;
  }, [executionMode]);

  const offlineNodeCount = catalog?.offlineNodes?.length ?? 0;
  const offlineNodeNames = catalog?.offlineNodes?.map((node) => node.name || node.nodeId) ?? [];
  const hasOnlineSelection = !catalog || nodeOptions.length > 0;

  const quickNodeButtons = (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={locked}
        onClick={() => onSelectNodeId(ALL_NODES_VALUE)}
        className={cn(
          'ui-press h-7 rounded-md border px-2 text-[11.5px] font-medium cursor-pointer',
          selectedNodeId === ALL_NODES_VALUE || selectedNodeId === ''
            ? 'border-[var(--accent)]/45 bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]',
          locked && 'opacity-50 pointer-events-none',
          FOCUS_RING,
        )}
      >
        全部在线
      </button>
      {nodeOptions.map((node) => (
        <button
          key={node.nodeId}
          type="button"
          disabled={locked}
          data-testid={`agent-node-quick-${node.nodeId}`}
          onClick={() => onSelectNodeId(node.nodeId)}
          className={cn(
            'ui-press h-7 inline-flex items-center gap-1.5 rounded-md border px-2 text-[11.5px] font-medium cursor-pointer',
            selectedNodeId === node.nodeId
              ? 'border-[var(--accent)]/45 bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)]',
            locked && 'opacity-50 pointer-events-none',
            FOCUS_RING,
          )}
        >
          <span className="truncate max-w-[132px]">{node.name || node.nodeId}</span>
          <span className="font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
            {node.modelCount}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2.5 min-w-0">
      <AnimatedCollapse open={Boolean(offlineNotice)}>
        {offlineNotice ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-[var(--warn-dot)]/25 bg-[var(--warn-dot)]/5 px-3 py-2 text-[12px] leading-relaxed text-[var(--warn)]"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} />
            <span className="text-pretty">{offlineNotice}</span>
          </div>
        ) : null}
      </AnimatedCollapse>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
        <label className="min-w-0 space-y-1">
          <span className={fieldLabelClass()}>运行节点</span>
          <NativeSelect
            data-testid="agent-node-select"
            aria-label="选择在线运行节点"
            value={selectedNodeId && selectedNodeId !== 'all' ? selectedNodeId : ALL_NODES_VALUE}
            disabled={locked}
            onChange={(event) => onSelectNodeId(event.target.value)}
            className="text-[16px] sm:text-[13px]"
          >
            <option value={ALL_NODES_VALUE}>
              {nodeOptions.length === 0
                ? catalog
                  ? '暂无在线节点'
                  : '模型目录加载中…'
                : '全部在线节点'}
            </option>
            {nodeOptions.map((node) => (
              <option key={node.nodeId} value={node.nodeId}>
                {node.name || node.nodeId} · {node.modelCount} 模型 · {node.agentCount} 助手
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="min-w-0 space-y-1">
          <span className={fieldLabelClass()}>执行助手</span>
          <NativeSelect
            data-testid="agent-target-select"
            aria-label="选择执行助手"
            value={selectedTarget}
            disabled={locked}
            onChange={(event) => onSelectTarget(event.target.value)}
            className="text-[16px] sm:text-[13px]"
          >
            <option value="auto">自动选择 · {leadAgentName || '主控调度'}</option>
            {targetOptions.map((option) => (
              <option key={option.value} value={option.value} title={option.meta}>
                {option.label}
              </option>
            ))}
            {selectedTarget !== 'auto' &&
            !targetOptions.some((option) => option.value === selectedTarget) ? (
              <option value={selectedTarget} disabled>
                {selectedTarget} · 当前离线
              </option>
            ) : null}
          </NativeSelect>
        </label>

        <label className="col-span-2 min-w-0 space-y-1 xl:col-span-1">
          <span className={fieldLabelClass()}>模型</span>
          <CommandCombobox
            value={modelOverride}
            onChange={onSelectModel}
            options={modelOptions}
            placeholder={
              resolvedDefaultModelLabel
                ? `默认 · ${resolvedDefaultModelLabel}`
                : '选择模型或沿用默认'
            }
            searchPlaceholder="搜索模型或分组…"
            emptyText={
              catalog
                ? '当前节点与助手下无在线模型'
                : '模型目录加载中，可先沿用默认配置'
            }
            disabled={locked}
            headerSlot={quickNodeButtons}
            ariaLabel="选择执行模型"
            testId="agent-model-select"
            triggerClassName="text-[16px] sm:text-[13px]"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <label className="min-w-0 space-y-1">
          <span className={fieldLabelClass()}>思考深度</span>
          <NativeSelect
            data-testid="agent-effort-select"
            aria-label="选择思考深度"
            value={effort}
            disabled={locked}
            onChange={(event) => onSelectEffort(event.target.value)}
            className="text-[16px] sm:text-[13px]"
          >
            {effortOptions.map((option) => (
              <option key={option} value={option}>
                {formatEffortLabel(option)}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="min-w-0 space-y-1">
          <span className={fieldLabelClass()}>协作方式</span>
          <NativeSelect
            data-testid="agent-mode-select"
            aria-label="选择协作方式"
            value={executionMode}
            disabled={locked}
            onChange={(event) => onSelectExecutionMode(event.target.value)}
            className="text-[16px] sm:text-[13px]"
          >
            {modeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </label>

        <div className="col-span-2 min-w-0 flex flex-col justify-end gap-1 xl:col-span-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[var(--ink-subtle)]">
            <span className="text-[var(--ink-muted)]">
              默认模型 <span className="font-mono text-[var(--ink)]">{resolvedDefaultModelLabel || '—'}</span>
            </span>
            {leadAgentName ? (
              <>
                <span aria-hidden="true">·</span>
                <span>主控 {leadAgentName}</span>
              </>
            ) : null}
            {!hasOnlineSelection ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--warn)]">当前无在线节点可选</span>
              </>
            ) : null}
          </div>
          {offlineNodeCount > 0 ? (
            <div
              className="text-[11.5px] text-[var(--ink-subtle)] tabular-nums"
              title={offlineNodeNames.join(' · ')}
            >
              {offlineNodeCount} 个节点离线，已自动隐藏其模型
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default NodeAgentModelSelector;
