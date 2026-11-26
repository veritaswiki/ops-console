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
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  Bot,
  Check,
  Crown,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Layers,
  Map as MapIcon,
  Maximize2,
  Minus,
  Play,
  Plus,
  X,
} from 'lucide-react';
import type {
  LinearIssueItem,
  LinearIssuePriority,
  LinearIssueStatus,
  LinearProjectItem,
} from '../types';
import {
  buildLinearDependencyGraph,
  getIssueStatusMeta,
  getPriorityMeta,
  LINEAR_STATUS_COLUMNS,
  type LinearGraphNodeSpec,
} from '../lib/linear-projects';
import { shortAgentName } from '../lib/agent-console';
import { cn, FOCUS_RING } from '../lib/cn';
import { Button, inputBaseClass, StatusIndicator } from './ui';

interface N8nNodeData extends Record<string, unknown> {
  spec: LinearGraphNodeSpec;
  isSelected: boolean;
}

function safeGithubHref(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(\/.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * n8n-style Workflow Node:
 * Iconic rounded square icon tile with circular left/right connection ports,
 * corner execution status badge, and clean label + assignee caption underneath.
 */
const N8nWorkflowNode = React.memo(function N8nWorkflowNode({
  data,
}: NodeProps<Node<N8nNodeData>>) {
  const { spec, isSelected } = data;
  const isCommander = spec.kind === 'commander';
  const isPr = spec.kind === 'github-pr';
  const isSub = spec.kind === 'sub-issue';
  const statusMeta = getIssueStatusMeta(spec.status);
  const isDone = spec.status === 'done' || spec.status === 'merged';
  const isActive = spec.status === 'in_progress';

  const Icon = isCommander
    ? Crown
    : isPr
      ? GitPullRequest
      : isSub
        ? Bot
        : Layers;

  const tileBorder = isSelected
    ? 'border-[var(--accent)] ring-4 ring-[var(--accent)]/20'
    : isCommander
      ? 'border-[var(--accent)]/70'
      : isPr
        ? 'border-[var(--ok-dot)]/60'
        : 'border-[var(--border-strong)] hover:border-[var(--ink-subtle)]';

  const iconTone = isCommander
    ? 'text-[var(--accent)]'
    : isPr
      ? 'text-[var(--ok)]'
      : isSub
        ? 'text-[var(--ink)]'
        : 'text-[var(--ink-muted)]';

  return (
    <div
      data-testid={`linear-graph-node-${spec.id}`}
      className="flex flex-col items-center w-[164px] select-none cursor-pointer group"
    >
      {/* n8n Square Icon Tile with circular Left/Right ports */}
      <div
        className={cn(
          'relative w-[68px] h-[68px] rounded-2xl border-2 bg-[var(--surface-elevated)] flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.22)] transition-[border-color,box-shadow,transform] duration-150 group-hover:-translate-y-0.5',
          tileBorder,
          isCommander && 'rounded-l-[28px]',
        )}
      >
        {!isCommander && (
          <Handle
            type="target"
            position={Position.Left}
            id="in"
            className="!w-3 !h-3 !rounded-full !border-2 !border-[var(--border-strong)] !bg-[var(--surface)] !-left-[7px]"
          />
        )}
        {!isPr && (
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className="!w-3 !h-3 !rounded-full !border-2 !border-[var(--accent)] !bg-[var(--surface)] !-right-[7px]"
          />
        )}

        <Icon className={cn('size-7', iconTone)} strokeWidth={1.75} />

        {/* n8n Corner Execution Badge */}
        {(isDone || isActive) && (
          <span
            className={cn(
              'absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full border-2 border-[var(--bg)] flex items-center justify-center',
              isDone ? 'bg-[var(--ok-dot)] text-white' : 'bg-[var(--accent)] text-white',
            )}
            title={statusMeta.label}
          >
            {isDone ? (
              <Check className="size-3" strokeWidth={2.5} />
            ) : (
              <Play className="size-2.5 fill-current" />
            )}
          </span>
        )}
      </div>

      {/* Clean n8n Label Underneath Tile */}
      <div className="mt-2 text-center w-full px-1 space-y-0.5">
        <div className="text-[12px] font-semibold text-[var(--ink)] leading-tight line-clamp-2">
          {spec.title}
        </div>
        <div className="font-mono text-[10.5px] text-[var(--ink-subtle)] truncate tabular-nums">
          {spec.identifier ? `${spec.identifier} · ` : ''}
          {shortAgentName(spec.assigneeName)}
        </div>
      </div>
    </div>
  );
});

const NODE_TYPES = {
  n8nNode: N8nWorkflowNode,
};

function N8nCanvasInner({
  commanderName,
  commanderId,
  issues,
  projects,
  availableAgents,
  availableBots,
  readOnly,
  dispatchingId,
  onUpdateIssue,
  onDispatchCommander,
}: {
  commanderName: string;
  commanderId: string;
  issues: LinearIssueItem[];
  projects: LinearProjectItem[];
  availableAgents: Array<{ id: string; name: string; role: string; harness: string }>;
  availableBots: Array<{ id: string; name: string; channel: string; handle?: string; role?: string }>;
  readOnly: boolean;
  dispatchingId: string | null;
  onUpdateIssue: (
    issueId: string,
    patch: Partial<{
      status: LinearIssueStatus;
      priority: LinearIssuePriority;
      assigneeId: string;
      assigneeName: string;
      assigneeType: string;
    }>,
  ) => Promise<void>;
  onDispatchCommander: (issueId: string) => Promise<void>;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [showMiniMap, setShowMiniMap] = React.useState(false);

  const graphSpec = React.useMemo(
    () =>
      buildLinearDependencyGraph({
        commanderName: shortAgentName(commanderName),
        commanderId,
        issues,
        projects,
      }),
    [commanderName, commanderId, issues, projects],
  );

  const rfNodes = React.useMemo<Node<N8nNodeData>[]>(
    () =>
      graphSpec.nodes.map((spec) => ({
        id: spec.id,
        type: 'n8nNode',
        position: { x: spec.x, y: spec.y },
        data: {
          spec,
          isSelected: selectedNodeId === spec.id,
        },
      })),
    [graphSpec.nodes, selectedNodeId],
  );

  const rfEdges = React.useMemo<Edge[]>(
    () =>
      graphSpec.edges.map((edge) => {
        const isBlocking = edge.kind === 'blocks';
        const isCommander = edge.kind === 'commands';
        const isPr = edge.kind === 'delivers';
        const color = isBlocking
          ? 'var(--warn-dot)'
          : isCommander
            ? 'var(--accent)'
            : isPr
              ? 'var(--ok-dot)'
              : 'var(--border-strong)';

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'default',
          animated: Boolean(edge.animated),
          label: isBlocking ? edge.label : undefined,
          labelStyle: isBlocking
            ? {
                fill: 'var(--warn)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }
            : undefined,
          labelBgStyle: isBlocking
            ? {
                fill: 'var(--bg)',
                fillOpacity: 0.92,
              }
            : undefined,
          labelBgPadding: [5, 2] as [number, number],
          labelBgBorderRadius: 4,
          style: {
            stroke: color,
            strokeWidth: isCommander ? 2.2 : 1.8,
            strokeDasharray: isBlocking ? '5 4' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color,
          },
        };
      }),
    [graphSpec.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<N8nNodeData>>(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  React.useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges, setNodes, setEdges]);

  const selectedSpec = React.useMemo(
    () => graphSpec.nodes.find((n) => n.id === selectedNodeId) || null,
    [graphSpec.nodes, selectedNodeId],
  );

  const selectedIssue = React.useMemo(
    () => (selectedSpec?.issueId ? issues.find((i) => i.id === selectedSpec.issueId) || null : null),
    [selectedSpec, issues],
  );

  return (
    <div
      className="relative w-full h-[calc(100dvh-11.5rem)] min-h-[540px] rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden"
      data-testid="linear-graph-canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_evt, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
        minZoom={0.35}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="var(--border-strong)" />
        {showMiniMap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            nodeColor="var(--surface-active)"
            maskColor="rgba(9,9,11,0.45)"
            className="!bg-[var(--surface-elevated)] !border !border-[var(--border)] !rounded-xl"
          />
        )}
      </ReactFlow>

      {/* Top-Left Subtle Canvas Stats */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 font-mono text-[11.5px] text-[var(--ink-subtle)] bg-[var(--surface-elevated)]/90 backdrop-blur-sm border border-[var(--border)] rounded-lg px-3 py-1.5 tabular-nums">
        <span>{graphSpec.nodes.length} 节点</span>
        <span aria-hidden="true">·</span>
        <span>{graphSpec.edges.length} 连线</span>
      </div>

      {/* n8n-Style Floating Bottom-Left Controls */}
      <div className="absolute left-4 bottom-4 flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-sm p-1 shadow-[var(--shadow-card)]">
        <button
          type="button"
          onClick={() => void zoomOut()}
          aria-label="缩小画布"
          className={cn(
            'h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors',
            FOCUS_RING,
          )}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void zoomIn()}
          aria-label="放大画布"
          className={cn(
            'h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors',
            FOCUS_RING,
          )}
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void fitView({ padding: 0.16, duration: 220 })}
          aria-label="自适应画布"
          className={cn(
            'h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors',
            FOCUS_RING,
          )}
        >
          <Maximize2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowMiniMap((v) => !v)}
          aria-label="切换缩略图"
          className={cn(
            'h-8 w-8 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors',
            showMiniMap
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
            FOCUS_RING,
          )}
        >
          <MapIcon className="size-4" />
        </button>
      </div>

      {/* n8n On-Demand Floating Right Node Parameters Drawer */}
      {selectedSpec && (
        <aside
          aria-label="节点参数面板"
          data-testid="n8n-node-inspector"
          className="absolute right-4 top-4 bottom-4 w-[320px] max-w-[calc(100%-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/98 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden z-20"
        >
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <div className="font-mono text-[11px] text-[var(--accent)] truncate">
                {selectedSpec.identifier || (selectedSpec.kind === 'commander' ? 'TRIGGER · 总指挥' : 'NODE')}
              </div>
              <div className="text-[13.5px] font-semibold text-[var(--ink)] truncate">
                {selectedSpec.title}
              </div>
            </div>
            <button
              type="button"
              aria-label="关闭节点面板"
              onClick={() => setSelectedNodeId(null)}
              className={cn(
                'h-7 w-7 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer',
                FOCUS_RING,
              )}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[12.5px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--ink-subtle)]">节点状态</span>
              <StatusIndicator
                status={getIssueStatusMeta(selectedSpec.status).tone}
                label={getIssueStatusMeta(selectedSpec.status).label}
              />
            </div>

            {selectedIssue ? (
              <>
                {selectedIssue.description && (
                  <p className="text-[var(--ink-muted)] leading-relaxed">
                    {selectedIssue.description}
                  </p>
                )}

                <label className="block space-y-1">
                  <span className="text-[11.5px] text-[var(--ink-subtle)]">工作流状态</span>
                  <select
                    disabled={readOnly}
                    value={selectedIssue.status}
                    onChange={(e) =>
                      void onUpdateIssue(selectedIssue.id, {
                        status: e.target.value as LinearIssueStatus,
                      })
                    }
                    className={cn('ui-select w-full h-9 pl-2.5 text-[12.5px] cursor-pointer', inputBaseClass)}
                  >
                    {LINEAR_STATUS_COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11.5px] text-[var(--ink-subtle)]">优先级</span>
                  <select
                    disabled={readOnly}
                    value={selectedIssue.priority}
                    onChange={(e) =>
                      void onUpdateIssue(selectedIssue.id, {
                        priority: e.target.value as LinearIssuePriority,
                      })
                    }
                    className={cn('ui-select w-full h-9 pl-2.5 text-[12.5px] cursor-pointer', inputBaseClass)}
                  >
                    <option value="urgent">P0 紧急</option>
                    <option value="high">P1 高</option>
                    <option value="medium">P2 中</option>
                    <option value="low">P3 低</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11.5px] text-[var(--ink-subtle)]">执行 Agent / Bot</span>
                  <select
                    disabled={readOnly}
                    value={`${selectedIssue.assigneeType}:${selectedIssue.assigneeId}`}
                    onChange={(e) => {
                      const [aType, aId] = e.target.value.split(':');
                      const name =
                        aType === 'bot'
                          ? availableBots.find((b) => b.id === aId)?.name || aId
                          : availableAgents.find((a) => a.id === aId)?.name || aId;
                      void onUpdateIssue(selectedIssue.id, {
                        assigneeType: aType,
                        assigneeId: aId,
                        assigneeName: name,
                      });
                    }}
                    className={cn('ui-select w-full h-9 pl-2.5 text-[12.5px] cursor-pointer', inputBaseClass)}
                  >
                    <option value={`${selectedIssue.assigneeType}:${selectedIssue.assigneeId}`}>
                      {shortAgentName(selectedIssue.assigneeName)}
                    </option>
                    {availableAgents.map((a) => (
                      <option key={`agent:${a.id}`} value={`agent:${a.id}`}>
                        Agent · {shortAgentName(a.name)}
                      </option>
                    ))}
                    {availableBots.map((b) => (
                      <option key={`bot:${b.id}`} value={`bot:${b.id}`}>
                        Bot · {b.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedIssue.worktreeBranch && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <span className="text-[var(--ink-subtle)] shrink-0">Worktree</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11.5px] text-[var(--ink-muted)] truncate">
                      <GitBranch className="size-3 shrink-0" />
                      <span className="truncate">{selectedIssue.worktreeBranch}</span>
                    </span>
                  </div>
                )}

                {selectedIssue.github?.prNumber && safeGithubHref(selectedIssue.github.url) && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--ink-subtle)]">GitHub PR</span>
                    <a
                      href={safeGithubHref(selectedIssue.github.url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--accent)] hover:underline"
                    >
                      PR #{selectedIssue.github.prNumber}
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                {!selectedIssue.parentId && (
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled={readOnly || dispatchingId === selectedIssue.id}
                      onClick={() => void onDispatchCommander(selectedIssue.id)}
                    >
                      <Play className="size-3.5" />
                      {dispatchingId === selectedIssue.id ? '正在派发...' : '执行总指挥拆解'}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2 text-[var(--ink-muted)]">
                <p>{selectedSpec.subtitle}</p>
                {selectedSpec.url && safeGithubHref(selectedSpec.url) && (
                  <a
                    href={safeGithubHref(selectedSpec.url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--accent)] hover:underline"
                  >
                    在 GitHub 查看
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

export function LinearGraphCanvas(props: {
  commanderName: string;
  commanderId: string;
  issues: LinearIssueItem[];
  projects: LinearProjectItem[];
  availableAgents: Array<{ id: string; name: string; role: string; harness: string }>;
  availableBots: Array<{ id: string; name: string; channel: string; handle?: string; role?: string }>;
  readOnly?: boolean;
  dispatchingId?: string | null;
  onUpdateIssue: (
    issueId: string,
    patch: Partial<{
      status: LinearIssueStatus;
      priority: LinearIssuePriority;
      assigneeId: string;
      assigneeName: string;
      assigneeType: string;
    }>,
  ) => Promise<void>;
  onDispatchCommander: (issueId: string) => Promise<void>;
}) {
  return (
    <ReactFlowProvider>
      <N8nCanvasInner
        commanderName={props.commanderName}
        commanderId={props.commanderId}
        issues={props.issues}
        projects={props.projects}
        availableAgents={props.availableAgents}
        availableBots={props.availableBots}
        readOnly={Boolean(props.readOnly)}
        dispatchingId={props.dispatchingId || null}
        onUpdateIssue={props.onUpdateIssue}
        onDispatchCommander={props.onDispatchCommander}
      />
    </ReactFlowProvider>
  );
}
