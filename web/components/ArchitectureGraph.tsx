import React from 'react';
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  ArrowRight,
  Bot,
  Cpu,
  Database,
  FileText,
  Filter,
  Globe,
  Layers,
  Minus,
  Network,
  Orbit,
  Plus,
  RotateCcw,
  Server,
  Shield,
  X,
} from 'lucide-react';
import type { SnapshotResponse, StatusTone } from '../types';
import {
  buildAgentsMiniGraph,
  buildFullGraph,
  buildMemoryMiniGraph,
  computeNodeDegrees,
  layoutGraphByMode,
  type GraphLayoutMode,
  type PlacedNode,
} from '../lib/graph-layout';
import { statusLabel, statusTone } from '../utils/format';
import { EmptyState, SegmentedFilter, StatusIndicator } from './ui';

const LAYOUT_OPTIONS = [
  { value: 'lanes', label: '泳道架构' },
  { value: 'force-degree', label: '连接度力导向' },
  { value: 'force-health', label: '健康度力导向' },
] as const;

type TopologyNodeData = {
  node: PlacedNode;
  tone: StatusTone;
  degree: number;
  layoutMode: GraphLayoutMode;
  isSelected: boolean;
  isConnected: boolean;
  isDimmed: boolean;
};

type LaneBackdropData = {
  title: string;
  subtitle: string;
  okCount: number;
  count: number;
  width: number;
  height: number;
};

function kindIcon(kind: string, lane: string) {
  const k = String(kind || '').toLowerCase();
  if (k === 'agent' || lane === 'entry') return Bot;
  if (k === 'gateway' || k === 'provider' || lane === 'gateway') return Cpu;
  if (k === 'memory' || lane === 'memory') return Database;
  if (k === 'firewall') return Shield;
  if (k === 'fleet') return Globe;
  if (k === 'network' || lane === 'network') return Network;
  if (k === 'service') return Server;
  return Layers;
}

const TopologyNode = React.memo(function TopologyNode({
  data,
}: NodeProps<Node<TopologyNodeData>>) {
  const { node, tone, degree, layoutMode, isSelected, isConnected, isDimmed } = data;
  const Icon = kindIcon(node.kind, node.lane);

  const dotClass =
    tone === 'ok'
      ? 'bg-[var(--ok-dot)]'
      : tone === 'warn'
        ? 'bg-[var(--warn-dot)]'
        : tone === 'err'
          ? 'bg-[var(--err-dot)]'
          : 'bg-[var(--muted-dot)]';

  const statusTextClass =
    tone === 'ok'
      ? 'text-[var(--ok)]'
      : tone === 'warn'
        ? 'text-[var(--warn)]'
        : tone === 'err'
          ? 'text-[var(--err)]'
          : 'text-[var(--ink-subtle)]';

  return (
    <div
      data-graph-node-id={node.id}
      style={{ width: node.w, minHeight: node.h }}
      className={`group relative rounded-lg border bg-[var(--graph-node)] px-3.5 py-2.5 transition-[border-color,box-shadow,opacity] duration-150 ease-out select-none ${
        isSelected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/25 shadow-[0_0_0_1px_var(--accent),0_6px_20px_rgba(99,102,241,0.16)]'
          : isConnected
            ? 'border-[var(--accent)]/60 shadow-xs'
            : 'border-[var(--graph-node-stroke)] hover:border-[var(--ink-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
      } ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Left} id="l" />
      <Handle type="source" position={Position.Right} id="r" />
      {layoutMode !== 'lanes' && (
        <>
          <Handle type="target" position={Position.Top} id="t" />
          <Handle type="source" position={Position.Bottom} id="b" />
        </>
      )}

      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-150 ease-out ${
            isSelected
              ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--ink-muted)] group-hover:text-[var(--ink)]'
          }`}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="truncate text-[13px] font-semibold tracking-tight text-[var(--ink)] leading-snug"
              title={node.label}
            >
              {node.label}
            </span>
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`}
              title={statusLabel(node.status)}
            />
          </div>

          <div
            className="mt-0.5 truncate font-mono text-[11.5px] text-[var(--ink-muted)] leading-snug tabular-nums"
            title={node.meta || node.detail || ''}
          >
            {node.meta || node.detail || '-'}
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
            <span className={`font-medium ${statusTextClass}`}>{statusLabel(node.status)}</span>
            <span className="font-mono text-[var(--ink-subtle)] tabular-nums">
              {degree > 0 ? `${degree} 连接` : '独立'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

const LaneBackdropNode = React.memo(function LaneBackdropNode({
  data,
}: NodeProps<Node<LaneBackdropData>>) {
  return (
    <div
      style={{ width: data.width, height: data.height }}
      className="rounded-xl border border-dashed border-[var(--graph-lane-stroke)] bg-[var(--graph-lane)] pointer-events-none select-none px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold tracking-tight text-[var(--ink)]">
          {data.title}
        </span>
        <span className="font-mono text-[11.5px] font-medium text-[var(--ink-subtle)] tabular-nums">
          {data.okCount}/{data.count}
        </span>
      </div>
      <div className="text-[11px] text-[var(--ink-subtle)] mt-0.5">{data.subtitle}</div>
    </div>
  );
});

const NODE_TYPES = {
  topologyNode: TopologyNode,
  laneBackdrop: LaneBackdropNode,
};

function statusHexColor(tone: StatusTone): string {
  if (tone === 'ok') return '#16a34a';
  if (tone === 'warn') return '#d97706';
  if (tone === 'err') return '#dc2626';
  return '#94a3b8';
}

function FlowCanvasInner({
  snapshot,
  mode,
  filter,
  enableAutoLayout,
  onOpenLogs,
  onSelectAgentCategory,
}: {
  snapshot: SnapshotResponse;
  mode: 'full' | 'memory' | 'agents';
  filter: string;
  enableAutoLayout: boolean;
  onOpenLogs?: (unit: string) => void;
  onSelectAgentCategory?: (category: string) => void;
}) {
  const compact = mode !== 'full';
  const [layoutMode, setLayoutMode] = React.useState<GraphLayoutMode>('lanes');
  const [layoutSeed, setLayoutSeed] = React.useState<number>(0);
  const [selectedId, setSelectedId] = React.useState<string>('');

  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  const rawGraph = React.useMemo(() => {
    if (mode === 'memory') return buildMemoryMiniGraph(snapshot);
    if (mode === 'agents') return buildAgentsMiniGraph(snapshot);
    return buildFullGraph(snapshot, filter);
  }, [snapshot, mode, filter]);

  const degreeMap = React.useMemo(
    () => computeNodeDegrees(rawGraph.nodes, rawGraph.edges),
    [rawGraph],
  );

  const layout = React.useMemo(() => {
    if (!rawGraph.nodes.length) return null;
    return layoutGraphByMode(rawGraph, layoutMode, compact, layoutSeed);
  }, [rawGraph, layoutMode, compact, layoutSeed]);

  React.useEffect(() => {
    if (selectedId && layout && !layout.nodes.some((n) => n.id === selectedId)) {
      setSelectedId('');
    }
  }, [selectedId, layout]);

  const { activeNodeIds, activeEdgeIds, hasSelection } = React.useMemo(() => {
    const aNodes = new Set<string>();
    const aEdges = new Set<string>();
    const valid = Boolean(selectedId) && Boolean(layout?.nodes.some((n) => n.id === selectedId));
    if (valid && layout) {
      aNodes.add(selectedId);
      for (const edge of layout.edges) {
        if (edge.from === selectedId || edge.to === selectedId) {
          aEdges.add(edge.id);
          aNodes.add(edge.from);
          aNodes.add(edge.to);
        }
      }
    }
    return { activeNodeIds: aNodes, activeEdgeIds: aEdges, hasSelection: valid };
  }, [selectedId, layout]);

  const computedFlowNodes = React.useMemo<Node[]>(() => {
    if (!layout) return [];
    const list: Node[] = [];

    if (layoutMode === 'lanes') {
      for (const lane of layout.lanes) {
        list.push({
          id: `lane-bg:${lane.id}`,
          type: 'laneBackdrop',
          position: { x: lane.x, y: lane.y },
          draggable: false,
          selectable: false,
          focusable: false,
          zIndex: -10,
          data: {
            title: lane.title,
            subtitle: lane.subtitle,
            okCount: lane.okCount,
            count: lane.count,
            width: lane.w,
            height: lane.h,
          },
        });
      }
    }

    for (const node of layout.nodes) {
      const tone = statusTone(node.status);
      const isSelected = hasSelection && node.id === selectedId;
      const isConnected = hasSelection && activeNodeIds.has(node.id) && !isSelected;
      const isDimmed = hasSelection && !activeNodeIds.has(node.id);
      list.push({
        id: node.id,
        type: 'topologyNode',
        position: { x: node.x, y: node.y },
        zIndex: isSelected ? 20 : isConnected ? 10 : 5,
        data: {
          node,
          tone,
          degree: degreeMap.get(node.id)?.total ?? 0,
          layoutMode,
          isSelected,
          isConnected,
          isDimmed,
        } satisfies TopologyNodeData,
      });
    }

    return list;
  }, [layout, layoutMode, degreeMap, hasSelection, selectedId, activeNodeIds]);

  const computedFlowEdges = React.useMemo<Edge[]>(() => {
    if (!layout) return [];
    const posById = new Map(layout.nodes.map((n) => [n.id, n]));
    return layout.edges.map((edge) => {
      const isHighlight = hasSelection && activeEdgeIds.has(edge.id);
      const isDimmed = hasSelection && !isHighlight;
      const src = posById.get(edge.from);
      const dst = posById.get(edge.to);

      // Pick natural handle attachment in force modes based on relative delta
      let sourceHandle = 'r';
      let targetHandle = 'l';
      if (layoutMode !== 'lanes' && src && dst) {
        const dx = dst.x - src.x;
        const dy = dst.y - src.y;
        if (Math.abs(dy) > Math.abs(dx) * 1.15) {
          sourceHandle = dy >= 0 ? 'b' : 'r';
          targetHandle = dy >= 0 ? 't' : 'l';
        }
      }

      const strokeColor = isHighlight ? 'var(--accent)' : 'var(--graph-edge)';

      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        sourceHandle,
        targetHandle,
        type: 'default',
        animated: isHighlight,
        label: isHighlight && edge.label ? edge.label : undefined,
        labelStyle: {
          fontSize: 10.5,
          fontFamily: "'JetBrains Mono Variable', monospace",
          fill: 'var(--ink)',
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: 'var(--surface)',
          fillOpacity: 0.92,
          stroke: 'var(--border)',
          strokeWidth: 0.8,
        },
        labelBgPadding: [5, 2] as [number, number],
        labelBgBorderRadius: 4,
        style: {
          stroke: strokeColor,
          strokeWidth: isHighlight ? 2.1 : 1.25,
          opacity: isDimmed ? 0.16 : isHighlight ? 1 : 0.82,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: isHighlight ? 15 : 13,
          height: isHighlight ? 15 : 13,
          color: strokeColor,
        },
      };
    });
  }, [layout, layoutMode, hasSelection, activeEdgeIds]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(computedFlowNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>(computedFlowEdges);

  // Structural sync when layout mode, filter, seed, or snapshot node set changes
  const layoutSignature = React.useMemo(
    () => `${mode}|${filter}|${layoutMode}|${layoutSeed}|${rawGraph.nodes.map((n) => n.id).join(',')}`,
    [mode, filter, layoutMode, layoutSeed, rawGraph.nodes],
  );
  const prevSigRef = React.useRef<string>('');

  React.useEffect(() => {
    const structuralChange = prevSigRef.current !== layoutSignature;
    prevSigRef.current = layoutSignature;

    if (structuralChange) {
      setRfNodes(computedFlowNodes);
      window.requestAnimationFrame(() => {
        void fitView({ padding: 0.08, duration: 240 });
      });
    } else {
      // Preserve user-dragged node positions while updating highlight/telemetry data
      setRfNodes((prev) => {
        const posMap = new Map(prev.map((n) => [n.id, n.position]));
        return computedFlowNodes.map((n) => ({
          ...n,
          position: n.type === 'laneBackdrop' ? n.position : posMap.get(n.id) || n.position,
        }));
      });
    }
  }, [computedFlowNodes, layoutSignature, setRfNodes, fitView]);

  React.useEffect(() => {
    setRfEdges(computedFlowEdges);
  }, [computedFlowEdges, setRfEdges]);

  const handleAutoLayoutClick = () => {
    if (layoutMode === 'lanes') {
      setLayoutMode('force-degree');
      setLayoutSeed((s) => s + 1);
    } else {
      setLayoutSeed((s) => s + 1);
    }
  };

  if (!layout) {
    return <EmptyState message="当前视图暂无可绘制的关系节点。" />;
  }

  const selectedNode = hasSelection ? layout.nodes.find((n) => n.id === selectedId) || null : null;
  const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));
  const incoming = selectedNode
    ? layout.edges
        .filter((e) => e.to === selectedNode.id)
        .map((e) => ({ edge: e, peer: nodeMap.get(e.from) }))
        .filter((x): x is { edge: typeof x.edge; peer: NonNullable<typeof x.peer> } => Boolean(x.peer))
    : [];
  const outgoing = selectedNode
    ? layout.edges
        .filter((e) => e.from === selectedNode.id)
        .map((e) => ({ edge: e, peer: nodeMap.get(e.to) }))
        .filter((x): x is { edge: typeof x.edge; peer: NonNullable<typeof x.peer> } => Boolean(x.peer))
    : [];

  const zoomPct = Math.round(zoom * 100);
  const canvasHeightClass =
    mode === 'full' ? 'h-[560px]' : mode === 'agents' ? 'h-[400px]' : 'h-[340px]';

  return (
    <div className="space-y-3">
      {/* Control Strip: Auto-Layout Mode + Force Relayout + Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
          {enableAutoLayout ? (
            <SegmentedFilter
              value={layoutMode}
              onChange={(next) => {
                setLayoutMode(next);
                setLayoutSeed((s) => s + 1);
              }}
              options={LAYOUT_OPTIONS}
              ariaLabel="拓扑自动布局模式"
            />
          ) : (
            <span className="text-[12px] text-[var(--ink-subtle)]">
              滚轮缩放 · 拖拽画布平移 · 点击节点高亮上下游
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {enableAutoLayout && (
            <button
              type="button"
              data-testid="graph-auto-layout"
              onClick={handleAutoLayoutClick}
              title="按当前力导向策略重新计算无重叠布局"
              className="h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-out inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
            >
              <Orbit className="size-4 text-[var(--accent)]" strokeWidth={1.75} />
              <span>自动布局</span>
            </button>
          )}

          <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] divide-x divide-[var(--border-subtle)] overflow-hidden">
            <button
              type="button"
              data-testid="graph-zoom-out"
              onClick={() => void zoomOut({ duration: 180 })}
              aria-label="缩小图谱"
              title="缩小图谱"
              className="h-8 w-8 inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
            >
              <Minus className="size-4" strokeWidth={1.75} />
            </button>
            <span
              data-testid="graph-zoom-level"
              className="px-2.5 font-mono text-[11.5px] font-medium text-[var(--ink-muted)] tabular-nums select-none min-w-[48px] text-center"
            >
              {zoomPct}%
            </span>
            <button
              type="button"
              data-testid="graph-zoom-in"
              onClick={() => void zoomIn({ duration: 180 })}
              aria-label="放大图谱"
              title="放大图谱"
              className="h-8 w-8 inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
            >
              <Plus className="size-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              data-testid="graph-zoom-reset"
              onClick={() => void fitView({ padding: 0.1, duration: 220 })}
              aria-label="适配画布"
              title="适配全图"
              className="h-8 px-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.97] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
            >
              <RotateCcw className="size-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">适配</span>
            </button>
          </div>
        </div>
      </div>

      {/* React Flow Interactive Canvas */}
      <div
        data-testid="graph-viewport"
        data-layout-mode={layoutMode}
        className={`ops-flow relative w-full ${canvasHeightClass} rounded-xl border border-[var(--border-subtle)] overflow-hidden`}
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => {
            if (node.type === 'laneBackdrop') return;
            setSelectedId((prev) => (prev === node.id ? '' : node.id));
          }}
          onPaneClick={() => {
            if (selectedId) setSelectedId('');
          }}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.35}
          maxZoom={2.4}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="var(--flow-dot)" />
          {mode === 'full' && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/92 backdrop-blur-sm text-[11.5px] text-[var(--ink-muted)] select-none">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-1.5 w-1.5 rounded-full bg-[var(--ok-dot)]" aria-hidden="true" />
                健康
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-1.5 w-1.5 rounded-full bg-[var(--warn-dot)]" aria-hidden="true" />
                降级
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-1.5 w-1.5 rounded-full bg-[var(--err-dot)]" aria-hidden="true" />
                故障
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-1.5 w-1.5 rounded-full bg-[var(--muted-dot)]" aria-hidden="true" />
                待机
              </span>
            </div>
          )}
          {mode === 'full' && (
            <MiniMap
              pannable
              zoomable
              className="hidden sm:block"
              style={{ width: 148, height: 92 }}
              nodeColor={(n) => {
                if (n.type === 'laneBackdrop') return 'transparent';
                const tone = (n.data as TopologyNodeData | undefined)?.tone || 'muted';
                return statusHexColor(tone);
              }}
              nodeStrokeWidth={2}
            />
          )}
        </ReactFlow>
      </div>

      {/* Inline Node Inspector */}
      {selectedNode && (
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5"
          data-testid="graph-inspector"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <span className="text-[14px] font-semibold text-[var(--ink)] truncate max-w-[260px]">
                {selectedNode.label}
              </span>
              <StatusIndicator status={selectedNode.status} />
              {selectedNode.meta && (
                <span className="font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums truncate max-w-[240px]">
                  {selectedNode.meta}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedNode.unit && onOpenLogs && (
                <button
                  type="button"
                  onClick={() => onOpenLogs(selectedNode.unit!)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
                >
                  <FileText className="size-4 text-[var(--ink-muted)]" strokeWidth={1.75} />
                  查看日志
                </button>
              )}
              {selectedNode.agentCategory && onSelectAgentCategory && (
                <button
                  type="button"
                  onClick={() => onSelectAgentCategory(selectedNode.agentCategory!)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
                >
                  <Filter className="size-4 text-[var(--ink-muted)]" strokeWidth={1.75} />
                  筛选进程
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedId('')}
                aria-label="收起节点详情"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {selectedNode.detail && (
            <p className="mt-1.5 text-[13px] text-[var(--ink-muted)] text-pretty">{selectedNode.detail}</p>
          )}

          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-[var(--ink-subtle)] font-medium">上游调用</span>
              {incoming.length === 0 ? (
                <span className="text-[var(--ink-subtle)]">无上游连线</span>
              ) : (
                incoming.map(({ edge, peer }) => (
                  <button
                    key={`${edge.id}-in`}
                    type="button"
                    onClick={() => setSelectedId(peer.id)}
                    className="inline-flex items-center gap-1 rounded-md px-1 font-medium text-[var(--accent)] hover:underline cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
                  >
                    <span>{peer.label}</span>
                    {edge.label && (
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                        ({edge.label})
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-[var(--ink-subtle)] font-medium">下游依赖</span>
              {outgoing.length === 0 ? (
                <span className="text-[var(--ink-subtle)]">无下游连线</span>
              ) : (
                outgoing.map(({ edge, peer }) => (
                  <button
                    key={`${edge.id}-out`}
                    type="button"
                    onClick={() => setSelectedId(peer.id)}
                    className="inline-flex items-center gap-1 rounded-md px-1 font-medium text-[var(--accent)] hover:underline cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45"
                  >
                    <ArrowRight className="size-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                    <span>{peer.label}</span>
                    {edge.label && (
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                        ({edge.label})
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ArchitectureGraph({
  snapshot,
  mode = 'full',
  filter = 'all',
  interactiveZoom,
  onOpenLogs,
  onSelectAgentCategory,
}: {
  snapshot: SnapshotResponse | null;
  mode?: 'full' | 'memory' | 'agents';
  filter?: string;
  interactiveZoom?: boolean;
  onOpenLogs?: (unit: string) => void;
  onSelectAgentCategory?: (category: string) => void;
}) {
  if (!snapshot) {
    return <EmptyState message="当前视图暂无可绘制的关系节点。" />;
  }

  const enableAutoLayout = interactiveZoom ?? (mode === 'full' || mode === 'agents');

  return (
    <ReactFlowProvider>
      <FlowCanvasInner
        snapshot={snapshot}
        mode={mode}
        filter={filter}
        enableAutoLayout={enableAutoLayout}
        onOpenLogs={onOpenLogs}
        onSelectAgentCategory={onSelectAgentCategory}
      />
    </ReactFlowProvider>
  );
}
