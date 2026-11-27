import React from 'react';
import {
  Background,
  BackgroundVariant,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodeDrag,
} from '@xyflow/react';
import {
  Bot,
  Crown,
  GitBranch,
  Laptop,
  Layers,
  Map as MapIcon,
  Maximize2,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import type {
  A2AAgentPeer,
  A2AOrchestrationConfig,
  A2ARoutingRule,
  A2ASkillCatalogItem,
  DynamicModelCatalogResponse,
  FleetNode,
  OrchestrationMode,
  ReasoningEffort,
} from '../types';
import {
  buildClusterTopologyGraph,
  buildRoutingEdges,
  buildRoutingNodes,
  computeClusterConnectivityStats,
  computeResetPositions,
  type AgentCanvasNodeData,
  type CanvasViewLens,
  type ClusterHostNodeData,
} from '../lib/agent-topology';
import { getModelsForNodeAgent } from '../lib/model-catalog';
import { cn, FOCUS_RING } from '../lib/cn';
import { statusLabel, statusTone } from '../utils/format';
import { Button, inputBaseClass, SegmentedFilter, StatusIndicator } from './ui';

const MODE_OPTIONS: ReadonlyArray<{ value: OrchestrationMode; label: string }> = [
  { value: 'lead-router', label: '主控路由' },
  { value: 'swarm', label: '自动蜂群 Swarm' },
  { value: 'main-sub', label: '主子模型分层' },
];

const LENS_OPTIONS: ReadonlyArray<{ value: CanvasViewLens; label: string }> = [
  { value: 'routing', label: '路由编排' },
  { value: 'cluster', label: '集群连接拓扑' },
];

export const EFFORT_OPTIONS: ReadonlyArray<{ value: ReasoningEffort; label: string; short: string }> = [
  { value: 'low', label: '低 (极速低成本)', short: 'low' },
  { value: 'medium', label: '中 (均衡推理)', short: 'med' },
  { value: 'high', label: '高 (深度规划)', short: 'high' },
  { value: 'xhigh', label: '极高 (专家审校)', short: 'xhigh' },
];

export const MODEL_PRESETS = [
  'gpt-5-codex',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'deepseek-r1-edge',
] as const;

function effortLabel(effort?: string): string {
  if (effort === 'xhigh') return '思考: 极高';
  if (effort === 'high') return '思考: 高';
  if (effort === 'low') return '思考: 低';
  return '思考: 中';
}

function toneDotClass(status?: string): string {
  const tone = statusTone(status);
  if (tone === 'ok') return 'bg-[var(--ok-dot)]';
  if (tone === 'warn') return 'bg-[var(--warn-dot)]';
  if (tone === 'err') return 'bg-[var(--err-dot)]';
  return 'bg-[var(--muted-dot)]';
}

function toneTextClass(status?: string): string {
  const tone = statusTone(status);
  if (tone === 'ok') return 'text-[var(--ok)]';
  if (tone === 'warn') return 'text-[var(--warn)]';
  if (tone === 'err') return 'text-[var(--err)]';
  return 'text-[var(--ink-subtle)]';
}

const AgentGraphNode = React.memo(function AgentGraphNode({
  data,
}: NodeProps<Node<AgentCanvasNodeData>>) {
  const { agent, isLead, isSelected, isDshExpert, inCount, outCount, skills, hostTelemetry } = data;
  const Icon = isLead ? Crown : isDshExpert ? ShieldCheck : Bot;
  const activeSkills = skills.filter((s) => s.enabled);
  const visibleSkills = activeSkills.slice(0, 2);
  const extraSkills = Math.max(0, activeSkills.length - visibleSkills.length);
  const latencyText =
    typeof agent.latencyMs === 'number'
      ? `${agent.latencyMs}ms`
      : typeof hostTelemetry?.rttMs === 'number'
        ? `${hostTelemetry.rttMs}ms`
        : null;

  return (
    <div
      data-testid={`canvas-agent-node-${agent.id}`}
      className={cn(
        'w-[262px] rounded-xl border bg-[var(--graph-node)] px-3.5 py-3 transition-[border-color,box-shadow] duration-150 ease-out select-none cursor-grab active:cursor-grabbing',
        isSelected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/25 shadow-[0_6px_22px_rgba(99,102,241,0.18)]'
          : isLead
            ? 'border-[var(--accent)]/70 shadow-[0_2px_10px_rgba(99,102,241,0.12)]'
            : 'border-[var(--graph-node-stroke)] hover:border-[var(--ink-subtle)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]',
      )}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />

      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
            isLead
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : isDshExpert
                ? 'bg-[var(--surface-subtle)] text-[var(--ok)]'
                : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)]',
          )}
        >
          <Icon className="w-4 h-4" strokeWidth={1.8} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="truncate text-[13px] font-semibold tracking-tight text-[var(--ink)]" title={agent.name}>
              {agent.name}
            </span>
            <span className={cn('inline-flex items-center gap-1 shrink-0 font-mono text-[10.5px]', toneTextClass(agent.status))}>
              <span className={cn('h-1.5 w-1.5 rounded-full', toneDotClass(agent.status))} />
              <span>{statusLabel(agent.status)}</span>
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-[var(--ink-subtle)] truncate tabular-nums">
            <span className="truncate">
              {isLead ? 'Lead 主控' : isDshExpert ? 'DSH 专家' : 'Worker'} · {agent.harness} · v{agent.version || '1.0'}
            </span>
            {agent.updateAvailable && agent.latestVersion && (
              <span className="shrink-0 text-[var(--warn)] font-medium" title={`最新版本 v${agent.latestVersion}`}>
                ↑v{agent.latestVersion}
              </span>
            )}
          </div>

          {/* Interactive Skill Summary Row */}
          <div
            className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--ink-muted)]"
            title={activeSkills.map((s) => `${s.name} (v${s.version})`).join(' · ')}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="truncate">
                <span className="text-[var(--ink-subtle)] mr-1">Skill:</span>
                {visibleSkills.length > 0
                  ? visibleSkills.map((s) => s.name).join(' · ')
                  : '未挂载技能'}
              </span>
              {extraSkills > 0 && (
                <span className="shrink-0 font-mono text-[10.5px] text-[var(--accent)] tabular-nums">
                  +{extraSkills}
                </span>
              )}
            </div>
          </div>

          {/* Model + Effort + Host Connectivity Row */}
          <div className="mt-1.5 pt-1.5 border-t border-[var(--border-subtle)]/70 flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
            <span className="truncate text-[var(--ink-muted)]" title={agent.modelHint || ''}>
              {agent.modelHint || 'auto-model'}
            </span>
            <span className="shrink-0 text-[var(--accent)] font-medium">
              {effortLabel(agent.reasoningEffort)}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
            <span className="truncate">
              {agent.nodeId}
              {latencyText ? ` · ${latencyText}` : ''}
            </span>
            <span className="shrink-0">
              入 {inCount} / 出 {outCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

const ClusterHostGraphNode = React.memo(function ClusterHostGraphNode({
  data,
}: NodeProps<Node<ClusterHostNodeData>>) {
  const { host, isSelected, hostedAgentIds, hasLead } = data;
  const DeviceIcon =
    host.deviceType === 'laptop'
      ? Laptop
      : host.deviceType === 'mobile'
        ? Smartphone
        : Server;

  return (
    <div
      data-testid={`canvas-host-node-${host.id}`}
      className={cn(
        'w-[238px] rounded-xl border bg-[var(--surface-elevated)] px-3.5 py-3 transition-[border-color,box-shadow] duration-150 ease-out select-none cursor-grab active:cursor-grabbing',
        isSelected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/25 shadow-[0_6px_20px_rgba(99,102,241,0.16)]'
          : 'border-[var(--border)] hover:border-[var(--ink-subtle)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
      )}
    >
      <Handle type="source" position={Position.Right} id="host-out" />

      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
            hasLead
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)]',
          )}
        >
          <DeviceIcon className="w-4 h-4" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="truncate text-[12.5px] font-semibold text-[var(--ink)]" title={host.name}>
              {host.name}
            </span>
            <span className={cn('inline-flex items-center gap-1 shrink-0 font-mono text-[10.5px]', toneTextClass(host.status))}>
              <span className={cn('h-1.5 w-1.5 rounded-full', toneDotClass(host.status))} />
              <span>{statusLabel(host.status)}</span>
            </span>
          </div>

          <div className="mt-0.5 font-mono text-[11px] text-[var(--ink-subtle)] truncate tabular-nums">
            {host.tailscaleIp || host.id}
            {host.region ? ` · ${host.region}` : ''}
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
            <span>
              {host.cpuPct != null ? `CPU ${host.cpuPct}%` : '宿主机'}
              {host.memPct != null ? ` · MEM ${host.memPct}%` : ''}
            </span>
            <span className="shrink-0 text-[var(--ink-subtle)]">
              {host.rttMs != null ? `${host.rttMs}ms` : '本地'}
            </span>
          </div>

          <div className="mt-1 font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
            承载 {hostedAgentIds.length} 个 Agent{hasLead ? ' · 含主控' : ''}
          </div>
        </div>
      </div>
    </div>
  );
});

const NODE_TYPES = {
  agentNode: AgentGraphNode,
  clusterHostNode: ClusterHostGraphNode,
};

interface CanvasProps {
  agents: A2AAgentPeer[];
  fleetNodes?: FleetNode[];
  skillCatalog?: A2ASkillCatalogItem[];
  modelCatalog?: DynamicModelCatalogResponse | null;
  routingRules: A2ARoutingRule[];
  leadAgentId: string | null;
  orchestrationConfig: A2AOrchestrationConfig;
  readOnly: boolean;
  initialLens?: CanvasViewLens;
  canvasHeightClass?: string;
  onUpdateConfig: (patch: Record<string, unknown>) => Promise<void>;
  onSavePositions: (positions: Record<string, { x: number; y: number }>) => Promise<void>;
  onUpsertRule: (payload: {
    id?: string;
    name?: string;
    sourceAgentId: string;
    targetAgentId: string;
    matchKeywords?: string[] | string;
    targetModel?: string;
    reasoningEffort?: ReasoningEffort;
    priority?: number;
    enabled?: boolean;
    requireDshReview?: boolean;
  }) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onUpdateAgent: (
    agentId: string,
    patch: { modelHint?: string; reasoningEffort?: ReasoningEffort; delegatable?: boolean },
  ) => Promise<void>;
  onSetLead: (agentId: string) => Promise<void>;
  onDiscoverAgent: (agent: A2AAgentPeer) => Promise<void>;
  onToggleSkillAgent?: (skill: A2ASkillCatalogItem, agentId: string) => Promise<void>;
  onInspectLogs?: (agentId: string) => void;
}

function CanvasInner({
  agents,
  fleetNodes = [],
  skillCatalog = [],
  modelCatalog = null,
  routingRules,
  leadAgentId,
  orchestrationConfig,
  readOnly,
  initialLens = 'routing',
  canvasHeightClass = 'h-[530px]',
  onUpdateConfig,
  onSavePositions,
  onUpsertRule,
  onDeleteRule,
  onUpdateAgent,
  onSetLead,
  onDiscoverAgent,
  onToggleSkillAgent,
  onInspectLogs,
}: CanvasProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [lens, setLens] = React.useState<CanvasViewLens>(initialLens);
  const [showMiniMap, setShowMiniMap] = React.useState(initialLens === 'cluster');
  const [selectedRuleId, setSelectedRuleId] = React.useState<string | null>(
    initialLens === 'routing' ? routingRules[0]?.id || null : null,
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    initialLens === 'cluster' ? leadAgentId || agents[0]?.id || null : null,
  );
  const [clusterPositions, setClusterPositions] = React.useState<Record<string, { x: number; y: number }>>({});
  const [saving, setSaving] = React.useState(false);

  const clusterStats = React.useMemo(
    () => computeClusterConnectivityStats(agents, fleetNodes, routingRules, skillCatalog),
    [agents, fleetNodes, routingRules, skillCatalog],
  );

  const modelOptions = React.useMemo(() => {
    const catalogModels = getModelsForNodeAgent(modelCatalog, null, null);
    const options: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();
    if (catalogModels.length > 0) {
      for (const model of catalogModels) {
        if (!model?.id || seen.has(model.id)) continue;
        seen.add(model.id);
        options.push({
          value: model.id,
          label: model.displayName || model.id,
        });
      }
    } else {
      for (const preset of MODEL_PRESETS) {
        if (seen.has(preset)) continue;
        seen.add(preset);
        options.push({ value: preset, label: preset });
      }
    }
    for (const current of [orchestrationConfig.mainModel, orchestrationConfig.subModel]) {
      if (!current || seen.has(current)) continue;
      seen.add(current);
      options.unshift({ value: current, label: `${current} · 当前配置` });
    }
    return options;
  }, [modelCatalog, orchestrationConfig.mainModel, orchestrationConfig.subModel]);

  const computeGraph = React.useCallback((): { nodes: Node[]; edges: Edge[] } => {
    if (lens === 'cluster') {
      return buildClusterTopologyGraph(
        agents,
        fleetNodes,
        routingRules,
        skillCatalog,
        leadAgentId,
        selectedNodeId,
        selectedRuleId,
        orchestrationConfig.mode,
        clusterPositions,
      );
    }
    return {
      nodes: buildRoutingNodes(agents, fleetNodes, routingRules, skillCatalog, leadAgentId, selectedNodeId),
      edges: buildRoutingEdges(routingRules, selectedRuleId, orchestrationConfig.mode),
    };
  }, [
    lens,
    agents,
    fleetNodes,
    routingRules,
    skillCatalog,
    leadAgentId,
    selectedNodeId,
    selectedRuleId,
    orchestrationConfig.mode,
    clusterPositions,
  ]);

  const initialGraph = React.useMemo(() => computeGraph(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialGraph.edges);

  const fittedKeyRef = React.useRef<string>('');
  React.useEffect(() => {
    const next = computeGraph();
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [computeGraph, setNodes, setEdges]);

  React.useEffect(() => {
    const fitKey = `${lens}:${agents.length}:${fleetNodes.length}`;
    if (agents.length > 0 && fittedKeyRef.current !== fitKey) {
      fittedKeyRef.current = fitKey;
      const timer = window.setTimeout(() => {
        void fitView({ padding: 0.14, duration: 200 });
      }, 90);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [lens, agents.length, fleetNodes.length, fitView]);

  const selectedRule = React.useMemo(
    () => routingRules.find((r) => r.id === selectedRuleId) || null,
    [routingRules, selectedRuleId],
  );
  const selectedAgent = React.useMemo(
    () => agents.find((a) => a.id === selectedNodeId) || null,
    [agents, selectedNodeId],
  );
  const selectedHostData = React.useMemo(() => {
    if (!selectedNodeId || !selectedNodeId.startsWith('host:')) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    return (node?.data as ClusterHostNodeData | undefined) || null;
  }, [nodes, selectedNodeId]);

  const selectedAgentNodeData = React.useMemo(() => {
    if (!selectedNodeId || selectedNodeId.startsWith('host:')) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    return (node?.data as AgentCanvasNodeData | undefined) || null;
  }, [nodes, selectedNodeId]);

  const [ruleDraft, setRuleDraft] = React.useState({
    name: '',
    keywords: '',
    targetModel: '',
    reasoningEffort: 'medium' as ReasoningEffort,
    priority: 10,
    enabled: true,
    requireDshReview: false,
  });

  React.useEffect(() => {
    if (!selectedRule) return;
    setRuleDraft({
      name: selectedRule.name,
      keywords: selectedRule.matchKeywords.join(', '),
      targetModel: selectedRule.targetModel,
      reasoningEffort: selectedRule.reasoningEffort,
      priority: selectedRule.priority,
      enabled: selectedRule.enabled,
      requireDshReview: selectedRule.requireDshReview,
    });
  }, [selectedRule]);

  const [agentDraft, setAgentDraft] = React.useState({
    modelHint: '',
    reasoningEffort: 'medium' as ReasoningEffort,
  });

  React.useEffect(() => {
    if (!selectedAgent) return;
    setAgentDraft({
      modelHint: selectedAgent.modelHint || '',
      reasoningEffort: selectedAgent.reasoningEffort || 'medium',
    });
  }, [selectedAgent]);

  const handleNodeDragStop: OnNodeDrag<Node> = React.useCallback(
    (_evt, draggedNode) => {
      const pos = {
        x: Math.round(draggedNode.position.x),
        y: Math.round(draggedNode.position.y),
      };
      if (lens === 'cluster') {
        setClusterPositions((prev) => ({ ...prev, [draggedNode.id]: pos }));
        return;
      }
      if (readOnly || draggedNode.id.startsWith('host:')) return;
      void onSavePositions({ [draggedNode.id]: pos });
    },
    [lens, onSavePositions, readOnly],
  );

  const handleConnect = React.useCallback(
    async (connection: Connection) => {
      if (
        readOnly ||
        !connection.source ||
        !connection.target ||
        connection.source === connection.target ||
        connection.source.startsWith('host:') ||
        connection.target.startsWith('host:')
      ) {
        return;
      }
      const target = agents.find((a) => a.id === connection.target);
      const source = agents.find((a) => a.id === connection.source);
      if (!target || !source) return;
      setSaving(true);
      try {
        await onUpsertRule({
          name: `${source.harness} -> ${target.name}`,
          sourceAgentId: connection.source,
          targetAgentId: connection.target,
          matchKeywords: [target.harness, target.nodeId],
          targetModel: target.modelHint || orchestrationConfig.subModel,
          reasoningEffort: target.reasoningEffort || 'medium',
          enabled: true,
          requireDshReview: target.harness === 'dsh-expert',
        });
      } finally {
        setSaving(false);
      }
    },
    [agents, onUpsertRule, orchestrationConfig.subModel, readOnly],
  );

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule || readOnly) return;
    setSaving(true);
    try {
      await onUpsertRule({
        id: selectedRule.id,
        name: ruleDraft.name,
        sourceAgentId: selectedRule.sourceAgentId,
        targetAgentId: selectedRule.targetAgentId,
        matchKeywords: ruleDraft.keywords,
        targetModel: ruleDraft.targetModel,
        reasoningEffort: ruleDraft.reasoningEffort,
        priority: ruleDraft.priority,
        enabled: ruleDraft.enabled,
        requireDshReview: ruleDraft.requireDshReview,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || readOnly) return;
    setSaving(true);
    try {
      await onUpdateAgent(selectedAgent.id, {
        modelHint: agentDraft.modelHint,
        reasoningEffort: agentDraft.reasoningEffort,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetLayout = async () => {
    if (lens === 'cluster') {
      setClusterPositions({});
      setTimeout(() => void fitView({ padding: 0.14, duration: 220 }), 80);
      return;
    }
    if (readOnly) return;
    const positions = computeResetPositions(agents, leadAgentId);
    await onSavePositions(positions);
    setTimeout(() => void fitView({ padding: 0.14, duration: 220 }), 80);
  };

  return (
    <div className="space-y-4" data-testid="agent-orchestration-canvas">
      {/* Top Strategy & Lens Control Strip */}
      <div className="space-y-2.5 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedFilter
              value={lens}
              onChange={(next) => {
                setLens(next);
                if (next === 'cluster') {
                  setSelectedRuleId(null);
                  if (!selectedNodeId && (leadAgentId || agents[0]?.id)) {
                    setSelectedNodeId(leadAgentId || agents[0]?.id || null);
                  }
                }
              }}
              options={LENS_OPTIONS}
              ariaLabel="切换画布视图维度"
            />
            <SegmentedFilter
              value={orchestrationConfig.mode}
              onChange={(next) => {
                if (!readOnly) void onUpdateConfig({ mode: next });
              }}
              options={MODE_OPTIONS}
              ariaLabel="切换 Agent 协同调度模式"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink-muted)] cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={orchestrationConfig.worktreeIsolation}
                onChange={(e) => void onUpdateConfig({ worktreeIsolation: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              <GitBranch className="size-3.5 text-[var(--ink-subtle)]" />
              <span>Git Worktree 隔离</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink-muted)] cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={orchestrationConfig.dshReviewGate.enabled}
                onChange={(e) =>
                  void onUpdateConfig({
                    dshReviewGate: { ...orchestrationConfig.dshReviewGate, enabled: e.target.checked },
                  })
                }
                className="accent-[var(--accent)]"
              />
              <ShieldCheck className="size-3.5 text-[var(--ok)]" />
              <span>DSH 专家门禁 (≥{orchestrationConfig.dshReviewGate.minScore}分)</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 pt-2.5 border-t border-[var(--border-subtle)]/70 text-[12px]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[var(--ink-subtle)] font-medium whitespace-nowrap">主模型</span>
              <select
                disabled={readOnly}
                aria-label="主模型选择"
                value={orchestrationConfig.mainModel}
                onChange={(e) => void onUpdateConfig({ mainModel: e.target.value })}
                className={cn('ui-select h-8 pl-2.5 text-[12px] font-mono cursor-pointer min-w-0 w-[180px]', inputBaseClass)}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                disabled={readOnly}
                aria-label="主模型思考强度"
                value={orchestrationConfig.mainEffort}
                onChange={(e) => void onUpdateConfig({ mainEffort: e.target.value })}
                className={cn('ui-select h-8 pl-2 text-[12px] font-mono cursor-pointer min-w-0', inputBaseClass)}
              >
                {EFFORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.short}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[var(--ink-subtle)] font-medium whitespace-nowrap">子模型</span>
              <select
                disabled={readOnly}
                aria-label="子模型选择"
                value={orchestrationConfig.subModel}
                onChange={(e) => void onUpdateConfig({ subModel: e.target.value })}
                className={cn('ui-select h-8 pl-2.5 text-[12px] font-mono cursor-pointer min-w-0 w-[180px]', inputBaseClass)}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                disabled={readOnly}
                aria-label="子模型思考强度"
                value={orchestrationConfig.subEffort}
                onChange={(e) => void onUpdateConfig({ subEffort: e.target.value })}
                className={cn('ui-select h-8 pl-2 text-[12px] font-mono cursor-pointer min-w-0', inputBaseClass)}
              >
                {EFFORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.short}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Cluster Connectivity Telemetry Strip (zero-pill tabular metadata) */}
          <div
            className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums"
            data-testid="cluster-connectivity-summary"
          >
            <span className="text-[var(--ink-muted)]">
              Agent <strong className="text-[var(--ink)]">{clusterStats.onlineAgents}/{clusterStats.totalAgents}</strong> 在线
            </span>
            <span aria-hidden="true">·</span>
            <span>
              宿主机 <strong className="text-[var(--ink)]">{clusterStats.onlineHosts}/{clusterStats.totalHosts}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              路由 <strong className="text-[var(--ink)]">{clusterStats.activeLinks}/{clusterStats.totalLinks}</strong>
            </span>
            {clusterStats.avgLatencyMs != null && (
              <>
                <span aria-hidden="true">·</span>
                <span>平均 {clusterStats.avgLatencyMs}ms</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>Skill {clusterStats.totalMountedSkills}</span>
          </div>
        </div>
      </div>

      {/* Main Draggable React Flow Canvas + Interactive Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div
          className={cn(
            'xl:col-span-8 min-w-0 relative rounded-xl border border-[var(--border)] bg-[var(--flow-bg)] overflow-hidden ops-flow',
            canvasHeightClass,
          )}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={handleNodeDragStop}
            onConnect={(conn) => void handleConnect(conn)}
            onNodeClick={(_e, node) => {
              setSelectedNodeId(node.id);
              setSelectedRuleId(null);
            }}
            onEdgeClick={(_e, edge) => {
              if (edge.id.startsWith('host-link:')) return;
              setSelectedRuleId(edge.id);
              setSelectedNodeId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedRuleId(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.14 }}
            minZoom={0.35}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--flow-dot)" />
            {showMiniMap && (
              <MiniMap
                pannable
                zoomable
                position="top-right"
                style={{
                  width: 148,
                  height: 92,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}
                maskColor="rgba(15, 23, 42, 0.25)"
                nodeColor={(node) => {
                  if (node.type === 'clusterHostNode') return 'var(--ink-subtle)';
                  const data = node.data as AgentCanvasNodeData | undefined;
                  if (data?.isLead) return 'var(--accent)';
                  if (data?.isDshExpert) return 'var(--ok-dot)';
                  return 'var(--ink-muted)';
                }}
              />
            )}
          </ReactFlow>

          {/* Compact Canvas Hint at Bottom-Left */}
          <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)]/92 border border-[var(--border)] font-mono text-[11px] text-[var(--ink-muted)] backdrop-blur-sm">
              {lens === 'cluster'
                ? '宿主机 → Agent 集群连接状态 · 点击节点查看 Skill、版本与实时延迟 · 拖拽自定义布局'
                : '拖拽节点排版 · 从右侧圆点拉线新增路由 · 点击节点查看 Skill 与版本 · 点击连线调优模型'}
            </span>
          </div>

          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/92 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setShowMiniMap((prev) => !prev)}
              aria-label="切换鹰眼缩略图"
              title="切换缩略图"
              className={cn(
                'h-7 w-7 rounded flex items-center justify-center cursor-pointer transition-colors',
                showMiniMap
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
                FOCUS_RING,
              )}
            >
              <MapIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void fitView({ padding: 0.14, duration: 200 })}
              aria-label="自适应居中视图"
              title="自适应居中"
              className={cn('h-7 w-7 rounded flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer', FOCUS_RING)}
            >
              <Maximize2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void zoomIn({ duration: 150 })}
              aria-label="放大画布"
              className={cn('h-7 w-7 rounded flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer', FOCUS_RING)}
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void zoomOut({ duration: 150 })}
              aria-label="缩小画布"
              className={cn('h-7 w-7 rounded flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer', FOCUS_RING)}
            >
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void handleResetLayout()}
              aria-label="重置节点排版"
              title="重置默认拓扑排版"
              className={cn('h-7 w-7 rounded flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer', FOCUS_RING)}
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Right Side Inspector: Selected Edge Rule / Selected Agent (Skills + Version + Host) / Selected Cluster Host */}
        <div
          className={cn(
            'xl:col-span-4 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 p-4 flex flex-col overflow-hidden',
            canvasHeightClass,
          )}
          data-testid="canvas-inspector"
        >
          {selectedRule ? (
            <form onSubmit={handleSaveRule} className="space-y-3">
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-[var(--ink)]">路由规则配置</div>
                  <div className="font-mono text-[11px] text-[var(--ink-subtle)] truncate mt-0.5">
                    {agents.find((a) => a.id === selectedRule.sourceAgentId)?.harness || selectedRule.sourceAgentId}
                    {' -> '}
                    {agents.find((a) => a.id === selectedRule.targetAgentId)?.name || selectedRule.targetAgentId}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={readOnly || saving}
                  aria-label="删除路由规则"
                  onClick={() => {
                    void onDeleteRule(selectedRule.id).then(() => setSelectedRuleId(null));
                  }}
                >
                  <Trash2 className="size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]" />
                </Button>
              </div>

              <label className="block space-y-1 text-[12px]">
                <span className="text-[var(--ink-muted)]">规则名称</span>
                <input
                  type="text"
                  disabled={readOnly}
                  value={ruleDraft.name}
                  onChange={(e) => setRuleDraft((d) => ({ ...d, name: e.target.value }))}
                  className={cn('w-full h-8 px-2.5 text-[12.5px]', inputBaseClass)}
                />
              </label>

              <label className="block space-y-1 text-[12px]">
                <span className="text-[var(--ink-muted)]">任务触发关键词 (逗号分隔)</span>
                <input
                  type="text"
                  disabled={readOnly}
                  value={ruleDraft.keywords}
                  onChange={(e) => setRuleDraft((d) => ({ ...d, keywords: e.target.value }))}
                  placeholder="pi, 脚本, 快速, lint"
                  data-testid="rule-keywords-input"
                  className={cn('w-full h-8 px-2.5 font-mono text-[12px]', inputBaseClass)}
                />
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1 text-[12px]">
                  <span className="text-[var(--ink-muted)]">指定执行模型</span>
                  <input
                    type="text"
                    list="ops-model-presets"
                    disabled={readOnly}
                    value={ruleDraft.targetModel}
                    onChange={(e) => setRuleDraft((d) => ({ ...d, targetModel: e.target.value }))}
                    className={cn('w-full h-8 px-2.5 font-mono text-[12px]', inputBaseClass)}
                  />
                </label>

                <label className="block space-y-1 text-[12px]">
                  <span className="text-[var(--ink-muted)]">思考强度 (Effort)</span>
                  <select
                    disabled={readOnly}
                    value={ruleDraft.reasoningEffort}
                    onChange={(e) =>
                      setRuleDraft((d) => ({ ...d, reasoningEffort: e.target.value as ReasoningEffort }))
                    }
                    data-testid="rule-effort-select"
                    className={cn('ui-select w-full h-8 pl-2.5 text-[12px] cursor-pointer min-w-0', inputBaseClass)}
                  >
                    {EFFORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2.5 items-center pt-1">
                <label className="block space-y-1 text-[12px]">
                  <span className="text-[var(--ink-muted)]">优先级 (越小越先匹配)</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    disabled={readOnly}
                    value={ruleDraft.priority}
                    onChange={(e) => setRuleDraft((d) => ({ ...d, priority: Number(e.target.value) || 10 }))}
                    className={cn('w-full h-8 px-2.5 font-mono text-[12px]', inputBaseClass)}
                  />
                </label>

                <div className="space-y-1.5 pt-3">
                  <label className="flex items-center gap-2 text-[12px] text-[var(--ink)] cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={ruleDraft.enabled}
                      onChange={(e) => setRuleDraft((d) => ({ ...d, enabled: e.target.checked }))}
                      className="accent-[var(--accent)]"
                    />
                    <span>启用该路由边</span>
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-[var(--ink)] cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={ruleDraft.requireDshReview}
                      onChange={(e) => setRuleDraft((d) => ({ ...d, requireDshReview: e.target.checked }))}
                      className="accent-[var(--accent)]"
                    />
                    <span>完成后过 DSH 评审</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={readOnly || saving}
                  data-testid="save-rule-btn"
                >
                  <Save className="size-3.5" />
                  {saving ? '保存中...' : '保存路由策略'}
                </Button>
              </div>
            </form>
          ) : selectedAgent ? (
            <form onSubmit={handleSaveAgent} className="flex flex-col h-full min-h-0 gap-3" data-testid="inspector-agent-panel">
              <div className="pb-2.5 border-b border-[var(--border-subtle)] space-y-1 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-[var(--ink)] truncate">
                    {selectedAgent.name}
                  </span>
                  <StatusIndicator status={selectedAgent.status} />
                </div>
                <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                  {selectedAgent.harness} · 当前 v{selectedAgent.version || '1.0'}
                  {selectedAgent.updateAvailable && selectedAgent.latestVersion ? (
                    <span className="text-[var(--warn)] font-medium"> (最新 v{selectedAgent.latestVersion})</span>
                  ) : (
                    ' (已最新)'
                  )}
                  {' · '}A2A v{selectedAgent.protocolVersion || '0.3'}
                </div>
                {selectedAgent.installPath && (
                  <div className="font-mono text-[11px] text-[var(--ink-subtle)] truncate" title={selectedAgent.installPath}>
                    路径：{selectedAgent.installPath}
                  </div>
                )}
              </div>

              {/* Host Cluster Connectivity Snapshot */}
              <div className="pb-2.5 border-b border-[var(--border-subtle)] text-[12px] space-y-1 shrink-0">
                <div className="flex items-center justify-between gap-2 text-[var(--ink-muted)]">
                  <span className="font-medium text-[var(--ink)] inline-flex items-center gap-1.5">
                    <Network className="size-3.5 text-[var(--accent)]" />
                    集群节点连接
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums">
                    {selectedAgent.latencyMs != null
                      ? `A2A ${selectedAgent.latencyMs}ms`
                      : selectedAgentNodeData?.hostTelemetry?.rttMs != null
                        ? `RTT ${selectedAgentNodeData.hostTelemetry.rttMs}ms`
                        : '本地直连'}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                  {selectedAgentNodeData?.hostTelemetry?.name || selectedAgent.nodeName}
                  {selectedAgentNodeData?.hostTelemetry?.tailscaleIp
                    ? ` · ${selectedAgentNodeData.hostTelemetry.tailscaleIp}`
                    : ''}
                  {selectedAgentNodeData?.hostTelemetry?.cpuPct != null
                    ? ` · CPU ${selectedAgentNodeData.hostTelemetry.cpuPct}%`
                    : ''}
                </div>
              </div>

              {/* Current Skills & Version Breakdown (internally scrollable so CTA row never clips) */}
              <div
                className="flex-1 min-h-0 flex flex-col pb-2.5 border-b border-[var(--border-subtle)]"
                data-testid="inspector-agent-skills"
              >
                <div className="flex items-center justify-between text-[12px] shrink-0 mb-1.5">
                  <span className="font-medium text-[var(--ink)] inline-flex items-center gap-1.5">
                    <Layers className="size-3.5 text-[var(--accent)]" />
                    当前 Skill 与版本 ({selectedAgentNodeData?.skills.length || 0})
                  </span>
                </div>
                {(selectedAgentNodeData?.skills.length || 0) === 0 ? (
                  <p className="text-[12px] text-[var(--ink-subtle)]">尚未装载 Skill。</p>
                ) : (
                  <ul className="flex-1 min-h-0 overflow-y-auto pr-1 divide-y divide-[var(--border-subtle)]/70 text-[12px]">
                    {(selectedAgentNodeData?.skills || []).map((sk) => {
                      const catalogMatch = sk.catalogItemId
                        ? skillCatalog.find((c) => c.id === sk.catalogItemId)
                        : null;
                      return (
                        <li key={sk.id} className="py-1.5 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-[var(--ink)] truncate">{sk.name}</div>
                            <div className="font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
                              v{sk.version} · {sk.provider}
                              {sk.updateAvailable && sk.latestVersion && (
                                <span className="text-[var(--warn)] ml-1">→ v{sk.latestVersion}</span>
                              )}
                            </div>
                          </div>
                          {catalogMatch && onToggleSkillAgent && !readOnly && (
                            <button
                              type="button"
                              onClick={() => void onToggleSkillAgent(catalogMatch, selectedAgent.id)}
                              className={cn(
                                'shrink-0 text-[11px] font-medium text-[var(--ink-subtle)] hover:text-[var(--err)] transition-colors cursor-pointer',
                                FOCUS_RING,
                              )}
                              title="从当前 Agent 卸载该 Skill"
                            >
                              卸载
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="shrink-0 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block space-y-1 text-[12px]">
                    <span className="text-[var(--ink-muted)]">默认模型</span>
                    <input
                      type="text"
                      list="ops-model-presets"
                      disabled={readOnly}
                      value={agentDraft.modelHint}
                      onChange={(e) => setAgentDraft((d) => ({ ...d, modelHint: e.target.value }))}
                      className={cn('w-full h-8 px-2.5 font-mono text-[12px]', inputBaseClass)}
                    />
                  </label>

                  <label className="block space-y-1 text-[12px]">
                    <span className="text-[var(--ink-muted)]">思考强度</span>
                    <select
                      disabled={readOnly}
                      value={agentDraft.reasoningEffort}
                      onChange={(e) =>
                        setAgentDraft((d) => ({ ...d, reasoningEffort: e.target.value as ReasoningEffort }))
                      }
                      className={cn('ui-select w-full h-8 pl-2 text-[12px] cursor-pointer min-w-0', inputBaseClass)}
                    >
                      {EFFORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="font-mono text-[11px] text-[var(--ink-subtle)] truncate">
                  绑定 MCP ({selectedAgent.boundMcpIds.length})：{selectedAgent.boundMcpIds.join(', ') || '未绑定'}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <Button type="submit" variant="primary" size="sm" disabled={readOnly || saving}>
                    <Save className="size-3.5" />
                    保存参数
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void onDiscoverAgent(selectedAgent)}
                  >
                    <Zap className="size-3.5 text-[var(--accent)]" />
                    探活
                  </Button>
                  {selectedAgent.id !== leadAgentId && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={readOnly}
                      onClick={() => void onSetLead(selectedAgent.id)}
                    >
                      <Crown className="size-3.5 text-[var(--accent)]" />
                      设为主 Agent
                    </Button>
                  )}
                  {onInspectLogs && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onInspectLogs(selectedAgent.id)}
                      data-testid="inspector-open-logs-btn"
                    >
                      实时日志
                    </Button>
                  )}
                </div>
              </div>
            </form>
          ) : selectedHostData ? (
            <div className="space-y-3.5" data-testid="inspector-host-panel">
              <div className="pb-2.5 border-b border-[var(--border-subtle)] space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-[var(--ink)] truncate">
                    {selectedHostData.host.name}
                  </span>
                  <StatusIndicator status={selectedHostData.host.status} />
                </div>
                <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                  {selectedHostData.host.id}
                  {selectedHostData.host.region ? ` · ${selectedHostData.host.region}` : ''}
                  {selectedHostData.host.os ? ` · ${selectedHostData.host.os}` : ''}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[12px] font-mono tabular-nums">
                <div>
                  <div className="text-[11px] text-[var(--ink-subtle)]">Tailscale / 内网地址</div>
                  <div className="mt-0.5 text-[var(--ink)]">{selectedHostData.host.tailscaleIp || '127.0.0.1'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--ink-subtle)]">节点延迟 (RTT)</div>
                  <div className="mt-0.5 text-[var(--ink)]">
                    {selectedHostData.host.rttMs != null ? `${selectedHostData.host.rttMs}ms` : '本地直连'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--ink-subtle)]">CPU 使用率</div>
                  <div className="mt-0.5 text-[var(--ink)]">
                    {selectedHostData.host.cpuPct != null ? `${selectedHostData.host.cpuPct}%` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--ink-subtle)]">内存水位</div>
                  <div className="mt-0.5 text-[var(--ink)]">
                    {selectedHostData.host.memPct != null ? `${selectedHostData.host.memPct}%` : '-'}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-2">
                <div className="text-[12px] font-medium text-[var(--ink)]">
                  运行于此节点的 Agent ({selectedHostData.hostedAgentIds.length})
                </div>
                {selectedHostData.hostedAgentIds.length === 0 ? (
                  <p className="text-[12px] text-[var(--ink-subtle)]">该节点暂未接入外部 Agent Harness。</p>
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
                    {selectedHostData.hostedAgentIds.map((aid) => {
                      const peer = agents.find((a) => a.id === aid);
                      if (!peer) return null;
                      return (
                        <li key={aid} className="py-2 first:pt-0">
                          <button
                            type="button"
                            onClick={() => setSelectedNodeId(peer.id)}
                            className={cn(
                              'w-full text-left flex items-center justify-between gap-2 hover:text-[var(--accent)] transition-colors cursor-pointer',
                              FOCUS_RING,
                            )}
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-[var(--ink)] truncate">{peer.name}</div>
                              <div className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                                {peer.harness} · v{peer.version || '1.0'} · {peer.skills.length} Skills
                              </div>
                            </div>
                            <StatusIndicator status={peer.status} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-[12.5px] text-[var(--ink-muted)] my-auto">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink)]">
                <Sparkles className="size-4 text-[var(--accent)]" />
                <span>Agent 编排与集群拓扑指南</span>
              </div>
              <ul className="space-y-2 leading-relaxed">
                <li>1. 点击任意 Agent 节点，即可查看当前装载的 Skill 清单、版本升级状态及宿主机连接延迟。</li>
                <li>2. 切换至「集群连接拓扑」可直观查看每台宿主机 / VPS 节点承载的 Agent 与跨节点协作链路。</li>
                <li>3. 在「路由编排」中拖动节点调整布局，或从节点右侧手柄拉线创建自定义模型与思考强度路由。</li>
              </ul>
            </div>
          )}

          <datalist id="ops-model-presets">
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}

export function AgentOrchestrationCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
