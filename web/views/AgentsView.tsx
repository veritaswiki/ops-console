import React from 'react';
import {
  Activity,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  GitBranch,
  KanbanSquare,
  Layers,
  MessageSquare,
  PanelRight,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Slash,
  Sparkles,
  Square,
  Terminal,
  X,
} from 'lucide-react';
import type {
  A2AAgentPeer,
  A2APingResponse,
  A2AStateResponse,
  A2ATaskRecord,
  DynamicModelCatalogResponse,
  LinearStateResponse,
  MagpieCatalogResponse,
} from '../types';
import {
  cancelA2ATask,
  compactA2ATask,
  copyToClipboard,
  dispatchA2ATask,
  fetchA2AState,
  fetchLinearState,
  fetchMagpieModels,
  fetchModelCatalog,
  handoffA2ASession,
  markA2ATaskRead,
  openA2ABtwThread,
  pingA2AAgent,
  queueA2ATaskTurn,
  restartA2ATask,
  settleA2ATask,
  snoozeA2ATask,
  steerA2ATask,
  updateA2ATaskState,
} from '../api';
import {
  buildCompactThreadSummary,
  buildConversationThread,
  extractAtMention,
  filterAgentTasks,
  filterSlashCommands,
  groupAgentsByNode,
  isAgentOnline,
  KANBAN_LIFECYCLE_COLUMNS,
  kanbanColumnToTaskState,
  parseSlashInput,
  resolveAgentByToken,
  shortAgentName,
  SLASH_COMMANDS,
  taskStateToKanbanColumn,
  type CompactThreadSummary,
  type KanbanCanonicalTaskState,
  type KanbanLifecycleColumnId,
  type SlashCommandDef,
} from '../lib/agent-console';
import {
  resolveAgentDefaultModel,
} from '../lib/magpie-models';
import {
  getAgentCatalogEntry,
  getEffectiveEffortOptions,
  getModelsForNodeAgent,
  resolveOfflineFallback,
  resolveSelectedModelFallback,
} from '../lib/model-catalog';
import {
  buildNeedsYouQueue,
  buildTaskIssueLinkIndex,
  clearNodeDraft,
  formatInlineOutputPreview,
  loadNodeDraft,
  saveNodeDraft,
} from '../lib/workspace-controls';
import { cn, FOCUS_RING } from '../lib/cn';
import { countBtwAttention } from '../lib/btw';
import { formatClock, formatDateTime } from '../utils/format';
import { AgentBtwDrawer } from '../components/AgentBtwDrawer';
import { AgentSlashMenu } from '../components/AgentSlashMenu';
import { ContextRailHost } from '../components/workspace/ContextRailHost';
import { MobileNeedsYouStream } from '../components/workspace/MobileNeedsYouStream';
import { NodeAgentModelSelector } from '../components/workspace/NodeAgentModelSelector';
import { SessionRuntimeLane } from '../components/workspace/SessionRuntimeLane';
import { Button, inputBaseClass, StatusIndicator } from '../components/ui';

type WorkspaceMode = 'thread' | 'kanban';
type ComposerExecutionMode = 'lead-router' | 'main-sub' | 'swarm' | 'plan';
type ComposerEffortLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const VALID_COMPOSER_MODES = new Set<ComposerExecutionMode>([
  'lead-router',
  'main-sub',
  'swarm',
  'plan',
]);
const VALID_COMPOSER_EFFORTS = new Set<ComposerEffortLevel>([
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]);

const MODE_LABELS: Record<ComposerExecutionMode, string> = {
  'lead-router': '自动路由',
  'main-sub': '主从拆解',
  swarm: 'Swarm 并行',
  plan: '规划模式',
};

interface StarterSuggestion {
  title: string;
  detail: string;
  prompt: string;
  executeImmediately?: boolean;
}

const STARTER_SUGGESTIONS: readonly StarterSuggestion[] = [
  {
    title: '/status',
    detail: '检查多机 Agent 集群与 Google A2A v0.3 连通态势',
    prompt: '/status',
    executeImmediately: true,
  },
  {
    title: '/plan 架构与变更评估',
    detail: '以规划模式拆解服务变更风险、耦合文件与回滚方案',
    prompt: '/plan 评估核心服务配置变更风险并输出分步执行与回滚方案',
  },
  {
    title: '/worktree 隔离分支开发',
    detail: '在独立 Git Worktree 分支中安全实现并跑通单测',
    prompt: '/worktree feat/probe-watchdog 为多节点探针新增心跳延迟自愈告警',
  },
  {
    title: '/board',
    detail: '切换至 Pending / Working / Done / Failed 拖拽看板',
    prompt: '/board',
    executeImmediately: true,
  },
] as const;

type LocalSlashCard =
  | { id: string; kind: 'help'; createdAt: string }
  | {
      id: string;
      kind: 'status';
      createdAt: string;
      protocolVersion: string;
      onlineAgents: number;
      totalAgents: number;
      nodesWithAgents: number;
      activeTasks: number;
      completedTasks: number;
      totalTasks: number;
      leadName: string;
      mode: string;
      agents: A2AAgentPeer[];
    }
  | { id: string; kind: 'ping'; createdAt: string; result: A2APingResponse }
  | { id: string; kind: 'tasks'; createdAt: string; query: string; matched: A2ATaskRecord[] }
  | { id: string; kind: 'compact'; createdAt: string; summary: CompactThreadSummary }
  | {
      id: string;
      kind: 'handoff';
      createdAt: string;
      targetName: string;
      targetNode: string;
      targetId: string;
      sessionTitle: string | null;
      contextId: string | null;
    };

function makeCardId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function taskStatusTone(state: string): 'healthy' | 'degraded' | 'failed' | 'standby' {
  if (state === 'completed') return 'healthy';
  if (state === 'working' || state === 'submitted') return 'degraded';
  if (state === 'failed' || state === 'canceled') return 'failed';
  return 'standby';
}

function taskStatusLabel(state: string): string {
  switch (state) {
    case 'submitted':
      return 'Pending';
    case 'working':
      return 'Working';
    case 'completed':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'canceled':
      return 'Canceled';
    default:
      return state;
  }
}

function modeDisplayLabel(mode?: string | null): string {
  if (!mode) return '自动路由';
  if (mode in MODE_LABELS) {
    return MODE_LABELS[mode as ComposerExecutionMode];
  }
  return mode;
}

function formatDurationMs(ms?: number | null): string {
  if (ms == null || ms <= 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface ArtifactBlock {
  kind: 'text' | 'code';
  lang?: string;
  content: string;
}

function splitArtifactBlocks(raw: string): ArtifactBlock[] {
  const blocks: ArtifactBlock[] = [];
  const fenceRe = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match = fenceRe.exec(raw);
  while (match) {
    if (match.index > lastIndex) {
      const textChunk = raw.slice(lastIndex, match.index).trim();
      if (textChunk) {
        blocks.push({ kind: 'text', content: textChunk });
      }
    }
    blocks.push({
      kind: 'code',
      lang: match[1] || undefined,
      content: match[2].replace(/\n$/, ''),
    });
    lastIndex = match.index + match[0].length;
    match = fenceRe.exec(raw);
  }
  if (lastIndex < raw.length) {
    const tail = raw.slice(lastIndex).trim();
    if (tail) {
      blocks.push({ kind: 'text', content: tail });
    }
  }
  return blocks.length > 0 ? blocks : [{ kind: 'text', content: raw }];
}

export interface AgentsViewProps {
  readOnly?: boolean;
  activeTaskId?: string | null;
  searchQuery?: string;
  a2aRevision?: number;
  catalogRevision?: number;
  onSearchQueryChange?: (query: string) => void;
  onSelectTask?: (taskId: string | null) => void;
  onTasksUpdated?: () => void;
  onOpenSettings?: (tab?: string) => void;
  onOpenProjectIssue?: (issueId?: string) => void;
  onOpenSelfEvolution?: () => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}

export function AgentsView({
  readOnly = false,
  activeTaskId = null,
  searchQuery,
  a2aRevision = 0,
  catalogRevision = 0,
  onSearchQueryChange,
  onSelectTask,
  onTasksUpdated,
  onOpenSettings,
  onOpenProjectIssue,
  onOpenSelfEvolution,
  onToast,
}: AgentsViewProps) {
  const [a2aState, setA2aState] = React.useState<A2AStateResponse | null>(null);
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [magpieCatalog, setMagpieCatalog] = React.useState<MagpieCatalogResponse | null>(null);
  const [modelCatalog, setModelCatalog] = React.useState<DynamicModelCatalogResponse | null>(null);
  const [workspaceMode, setWorkspaceMode] = React.useState<WorkspaceMode>('thread');
  const [localSearchQuery, setLocalSearchQuery] = React.useState('');
  const [selectedNodeId, setSelectedNodeId] = React.useState<string>('all');
  const [offlineNotice, setOfflineNotice] = React.useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = React.useState<string>('auto');
  const [executionMode, setExecutionMode] = React.useState<ComposerExecutionMode>('lead-router');
  const [reasoningEffort, setReasoningEffort] = React.useState<ComposerEffortLevel>('high');
  const [modelOverride, setModelOverride] = React.useState('');
  const [armedWorktree, setArmedWorktree] = React.useState('');
  const [prompt, setPrompt] = React.useState('');
  const [expandedArtifacts, setExpandedArtifacts] = React.useState<Record<string, boolean>>({});
  const [busyControlTaskId, setBusyControlTaskId] = React.useState<string | null>(null);
  const [contextRailOpen, setContextRailOpen] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('ops-console:context-rail-open') === '1';
    } catch {
      return false;
    }
  });

  const [menuDismissed, setMenuDismissed] = React.useState(false);
  const [manualSlashOpen, setManualSlashOpen] = React.useState(false);
  const [menuActiveIndex, setMenuActiveIndex] = React.useState(0);

  const [submitting, setSubmitting] = React.useState(false);
  const [cancelingTaskId, setCancelingTaskId] = React.useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = React.useState<string | null>(null);
  const [optimisticStates, setOptimisticStates] = React.useState<
    Record<string, KanbanCanonicalTaskState>
  >({});
  const [expandedTraces, setExpandedTraces] = React.useState<Record<string, boolean>>({});
  const [copiedTaskId, setCopiedTaskId] = React.useState<string | null>(null);
  const [systemCards, setSystemCards] = React.useState<LocalSlashCard[]>([]);
  const [headerSearchOpen, setHeaderSearchOpen] = React.useState(false);
  const [btwOpen, setBtwOpen] = React.useState(false);
  const [btwInitialThreadId, setBtwInitialThreadId] = React.useState<string | null>(null);
  const [btwContextTaskId, setBtwContextTaskId] = React.useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const headerSearchInputRef = React.useRef<HTMLInputElement | null>(null);
  const configSeededRef = React.useRef(false);
  const prevActiveTaskIdRef = React.useRef<string | null>(activeTaskId);

  const effectiveSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
  const handleSearchChange = React.useCallback(
    (nextQuery: string) => {
      if (onSearchQueryChange) {
        onSearchQueryChange(nextQuery);
      } else {
        setLocalSearchQuery(nextQuery);
      }
    },
    [onSearchQueryChange],
  );

  const loadState = React.useCallback(async () => {
    try {
      const [res, linearRes] = await Promise.all([
        fetchA2AState(),
        fetchLinearState().catch(() => null),
      ]);
      setA2aState(res);
      if (linearRes) setLinearState(linearRes);
      if (!configSeededRef.current && res.orchestrationConfig) {
        configSeededRef.current = true;
        const serverMode = res.orchestrationConfig.mode as ComposerExecutionMode;
        if (VALID_COMPOSER_MODES.has(serverMode)) {
          setExecutionMode(serverMode);
        }
        const serverEffort = res.orchestrationConfig.mainEffort as ComposerEffortLevel;
        if (VALID_COMPOSER_EFFORTS.has(serverEffort)) {
          setReasoningEffort(serverEffort);
        }
      }
      return res;
    } catch {
      return null;
    }
  }, []);

  React.useEffect(() => {
    void loadState();
  }, [loadState, activeTaskId, a2aRevision]);

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchModelCatalog(controller.signal).catch(() => null),
      fetchMagpieModels(controller.signal).catch(() => null),
    ])
      .then(([dynamicCat, legacyCat]) => {
        if (!controller.signal.aborted) {
          setModelCatalog(dynamicCat);
          setMagpieCatalog(legacyCat);
        }
      });
    return () => controller.abort();
  }, [catalogRevision, a2aState?.summary?.onlineAgents]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem('ops-console:context-rail-open', contextRailOpen ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [contextRailOpen]);

  React.useEffect(() => {
    if (activeTaskId && activeTaskId !== prevActiveTaskIdRef.current) {
      setWorkspaceMode('thread');
    }
    prevActiveTaskIdRef.current = activeTaskId;
  }, [activeTaskId]);

  const agents: A2AAgentPeer[] = a2aState?.agents || [];
  const nodeGroups = React.useMemo(() => groupAgentsByNode(agents), [agents]);

  const tasks: A2ATaskRecord[] = React.useMemo(() => {
    const rawTasks = a2aState?.tasks || [];
    const keys = Object.keys(optimisticStates);
    if (keys.length === 0) return rawTasks;
    return rawTasks.map((task) => {
      const override = optimisticStates[task.id];
      return override ? { ...task, state: override } : task;
    });
  }, [a2aState?.tasks, optimisticStates]);

  const leadAgent = React.useMemo(
    () =>
      agents.find((agent) => agent.id === a2aState?.leadAgentId) ||
      agents.find((agent) => agent.role === 'lead') ||
      agents[0] ||
      null,
    [agents, a2aState?.leadAgentId],
  );

  const magpieBindings = React.useMemo(
    () => magpieCatalog?.agentBindings || [],
    [magpieCatalog?.agentBindings],
  );
  const selectedAgentPeer = React.useMemo(
    () =>
      selectedTarget === 'auto'
        ? leadAgent
        : agents.find((agent) => agent.id === selectedTarget) || leadAgent,
    [agents, leadAgent, selectedTarget],
  );
  const selectedAgentCatalog = React.useMemo(
    () => getAgentCatalogEntry(modelCatalog, selectedAgentPeer?.id),
    [modelCatalog, selectedAgentPeer?.id],
  );
  const selectableCatalogModels = React.useMemo(
    () =>
      getModelsForNodeAgent(
        modelCatalog,
        selectedNodeId && selectedNodeId !== 'all' ? selectedNodeId : selectedAgentPeer?.nodeId,
        selectedTarget !== 'auto' ? selectedTarget : selectedAgentPeer?.id,
      ),
    [modelCatalog, selectedNodeId, selectedTarget, selectedAgentPeer?.id, selectedAgentPeer?.nodeId],
  );
  const effectiveEffortOptions = React.useMemo(
    () => getEffectiveEffortOptions(selectedAgentCatalog, modelOverride),
    [selectedAgentCatalog, modelOverride],
  );

  React.useEffect(() => {
    if (!modelCatalog) return;
    const fallback = resolveOfflineFallback(
      {
        nodeId: selectedNodeId === 'all' ? '' : selectedNodeId,
        agentId: selectedTarget,
        model: modelOverride,
      },
      modelCatalog,
    );
    if (fallback.didFallback) {
      setSelectedNodeId(fallback.nodeId || 'all');
      setSelectedTarget(fallback.agentId || 'auto');
      setModelOverride(fallback.model);
      setOfflineNotice(fallback.notice);
      if (fallback.notice) {
        onToast?.(fallback.notice, 'info');
      }
    } else if (offlineNotice) {
      setOfflineNotice(null);
    }
  }, [modelCatalog, selectedNodeId, selectedTarget, modelOverride]);

  React.useEffect(() => {
    if (!modelCatalog || !modelOverride) return;
    const fallback = resolveSelectedModelFallback(
      modelOverride,
      selectableCatalogModels,
      selectedAgentCatalog?.defaultModel || null,
    );
    if (fallback.didFallback) {
      setModelOverride(fallback.model);
    }
  }, [modelCatalog, modelOverride, selectableCatalogModels, selectedAgentCatalog?.defaultModel]);

  React.useEffect(() => {
    if (!effectiveEffortOptions.length) return;
    if (!effectiveEffortOptions.includes(reasoningEffort)) {
      const preferred = selectedAgentCatalog?.parameterConstraints?.defaultEffort;
      const nextEffort = (preferred && effectiveEffortOptions.includes(preferred)
        ? preferred
        : effectiveEffortOptions[0]) as ComposerEffortLevel;
      if (nextEffort) setReasoningEffort(nextEffort);
    }
  }, [effectiveEffortOptions, reasoningEffort, selectedAgentCatalog?.parameterConstraints?.defaultEffort]);

  const resolvedDefaultModel = React.useMemo(
    () => {
      if (selectedAgentCatalog?.online && selectedAgentCatalog.defaultModel) {
        return {
          model: selectedAgentCatalog.defaultModel,
          label: `${selectedAgentCatalog.defaultModel} (${selectedAgentCatalog.nodeName})`,
          source: selectedAgentCatalog.defaultSource,
        };
      }
      if (selectedAgentCatalog && !selectedAgentCatalog.online) {
        return {
          model: null,
          label: `${selectedAgentCatalog.nodeName} 离线（已隐藏模型）`,
          source: 'offline',
        };
      }
      return resolveAgentDefaultModel(
        selectedAgentPeer,
        magpieBindings,
        a2aState?.orchestrationConfig?.mainModel,
      );
    },
    [selectedAgentCatalog, selectedAgentPeer, magpieBindings, a2aState?.orchestrationConfig?.mainModel],
  );
  const activeTask = React.useMemo(
    () => (activeTaskId ? tasks.find((task) => task.id === activeTaskId) || null : null),
    [tasks, activeTaskId],
  );

  const activeDraftNodeId =
    selectedNodeId && selectedNodeId !== 'all'
      ? selectedNodeId
      : selectedAgentPeer?.nodeId || 'hub';
  const draftScopeKey = `${activeDraftNodeId}::${activeTaskId || 'new'}`;
  const lastDraftScopeRef = React.useRef<string>('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (lastDraftScopeRef.current === draftScopeKey) return;
    lastDraftScopeRef.current = draftScopeKey;
    const saved = loadNodeDraft(window.localStorage, activeDraftNodeId, activeTaskId);
    setPrompt(saved);
  }, [draftScopeKey, activeDraftNodeId, activeTaskId]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (lastDraftScopeRef.current !== draftScopeKey) return;
    saveNodeDraft(window.localStorage, activeDraftNodeId, activeTaskId, prompt);
  }, [prompt, draftScopeKey, activeDraftNodeId, activeTaskId]);

  React.useEffect(() => {
    if (readOnly || !activeTask?.id || !activeTask.attention?.unread) return;
    void markA2ATaskRead(activeTask.id).catch(() => {});
  }, [readOnly, activeTask?.id, activeTask?.attention?.unread]);

  const linkIndex = React.useMemo(
    () => buildTaskIssueLinkIndex(linearState?.issues || [], tasks, []),
    [linearState?.issues, tasks],
  );
  const activeLinkedIssue = React.useMemo(
    () => (activeTask ? linkIndex.issueByTaskId.get(activeTask.id) || null : null),
    [activeTask, linkIndex],
  );

  const threadTasks = React.useMemo(
    () => buildConversationThread(tasks, activeTaskId),
    [tasks, activeTaskId],
  );

  const hasRunningThreadTask = threadTasks.some(
    (task) => task.state === 'working' || task.state === 'submitted',
  );
  const hasRunningAnyTask = tasks.some(
    (task) => task.state === 'working' || task.state === 'submitted',
  );

  React.useEffect(() => {
    const shouldPoll = hasRunningThreadTask || (workspaceMode === 'kanban' && hasRunningAnyTask);
    if (!shouldPoll) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadState();
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [hasRunningThreadTask, hasRunningAnyTask, workspaceMode, loadState]);

  const onlineAgentCount = React.useMemo(
    () => agents.filter((agent) => isAgentOnline(agent.status)).length,
    [agents],
  );

  const filteredTasksCount = React.useMemo(
    () => filterAgentTasks(tasks, effectiveSearchQuery).length,
    [tasks, effectiveSearchQuery],
  );

  const mentionInfo = React.useMemo(() => extractAtMention(prompt, agents), [prompt, agents]);

  const isTypingSlashCommand = React.useMemo(() => {
    const trimmedLeft = prompt.trimStart();
    if (!trimmedLeft.startsWith('/')) return false;
    if (/\s/.test(trimmedLeft)) return false;
    return /^\/[a-zA-Z0-9_-]*$/.test(trimmedLeft);
  }, [prompt]);

  const slashCandidates = React.useMemo(
    () => (isTypingSlashCommand ? filterSlashCommands(prompt) : [...SLASH_COMMANDS]),
    [isTypingSlashCommand, prompt],
  );

  const menuMode: 'slash' | 'mention' | null = React.useMemo(() => {
    if (readOnly) return null;
    if (manualSlashOpen) return 'slash';
    if (menuDismissed) return null;
    if (isTypingSlashCommand) return 'slash';
    if (mentionInfo.activeQuery !== null) return 'mention';
    return null;
  }, [readOnly, manualSlashOpen, menuDismissed, isTypingSlashCommand, mentionInfo.activeQuery]);

  const menuItemsCount =
    menuMode === 'slash'
      ? slashCandidates.length
      : menuMode === 'mention'
        ? mentionInfo.candidates.length
        : 0;

  React.useEffect(() => {
    setMenuActiveIndex(0);
  }, [menuMode, prompt]);

  const appendSystemCard = React.useCallback((card: LocalSlashCard) => {
    setSystemCards((prev) => [...prev.slice(-7), card]);
  }, []);

  const dismissSystemCard = React.useCallback((cardId: string) => {
    setSystemCards((prev) => prev.filter((item) => item.id !== cardId));
  }, []);

  const focusComposer = React.useCallback(() => {
    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 30);
  }, []);

  const dispatchTaskPayload = React.useCallback(
    async (opts: {
      promptText: string;
      targetAgentId?: string;
      mode?: ComposerExecutionMode;
      worktree?: string;
      slashCommand?: string;
      continueThread?: boolean;
    }) => {
      if (readOnly) {
        onToast?.('当前为只读模式，禁止派发 Agent 任务', 'err');
        return;
      }
      const cleanPrompt = opts.promptText.trim();
      if (!cleanPrompt) return;

      setSubmitting(true);
      try {
        const shouldThread = opts.continueThread !== false && Boolean(activeTask);
        const contextId = shouldThread
          ? activeTask?.contextId || `ctx-${activeTask?.id}`
          : undefined;
        const parentTaskId = shouldThread ? activeTask?.id : undefined;
        const resolvedTarget =
          opts.targetAgentId || (selectedTarget === 'auto' ? undefined : selectedTarget);
        const resolvedWorktree = opts.worktree || armedWorktree || undefined;

        const res = await dispatchA2ATask({
          prompt: cleanPrompt,
          targetAgentId: resolvedTarget,
          executionMode: opts.mode || executionMode,
          model: modelOverride || undefined,
          modelOverride: modelOverride || undefined,
          reasoningEffort,
          contextId,
          parentTaskId,
          worktreeBranch: resolvedWorktree,
          slashCommand: opts.slashCommand,
        });
        setPrompt('');
        setManualSlashOpen(false);
        setMenuDismissed(false);
        if (opts.worktree || armedWorktree) {
          setArmedWorktree('');
        }
        await loadState();
        onTasksUpdated?.();
        setWorkspaceMode('thread');
        if (res.task?.id) {
          onSelectTask?.(res.task.id);
        }
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '指令发送失败', 'err');
      } finally {
        setSubmitting(false);
      }
    },
    [
      readOnly,
      activeTask,
      selectedTarget,
      armedWorktree,
      executionMode,
      modelOverride,
      reasoningEffort,
      loadState,
      onTasksUpdated,
      onSelectTask,
      onToast,
    ],
  );

  const executeRawInput = React.useCallback(
    async (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed || submitting) return;

      setManualSlashOpen(false);
      setMenuDismissed(false);

      const parsed = parseSlashInput(trimmed);
      if (parsed.isSlash && parsed.command) {
        switch (parsed.command) {
          case '/help': {
            setPrompt('');
            setWorkspaceMode('thread');
            appendSystemCard({
              id: makeCardId('help'),
              kind: 'help',
              createdAt: new Date().toISOString(),
            });
            return;
          }
          case '/board': {
            setPrompt('');
            setWorkspaceMode((prev) => {
              const next: WorkspaceMode = prev === 'kanban' ? 'thread' : 'kanban';
              onToast?.(
                next === 'kanban' ? '已切换至任务生命周期看板' : '已切换至对话流视图',
                'info',
              );
              return next;
            });
            return;
          }
          case '/clear': {
            setPrompt('');
            setSystemCards([]);
            setModelOverride('');
            setArmedWorktree('');
            setWorkspaceMode('thread');
            onSelectTask?.(null);
            onToast?.('已开启全新对话线程', 'info');
            focusComposer();
            return;
          }
          case '/status': {
            setPrompt('');
            setWorkspaceMode('thread');
            const latest = (await loadState()) || a2aState;
            const latestAgents = latest?.agents || agents;
            const latestOnline = latestAgents.filter((agent) => isAgentOnline(agent.status)).length;
            const latestNodes = groupAgentsByNode(latestAgents).length;
            const latestTasks = latest?.tasks || tasks;
            appendSystemCard({
              id: makeCardId('status'),
              kind: 'status',
              createdAt: new Date().toISOString(),
              protocolVersion: latest?.architecture?.protocolVersion || '0.3',
              onlineAgents: latest?.summary?.onlineAgents ?? latestOnline,
              totalAgents: latest?.summary?.totalAgents ?? latestAgents.length,
              nodesWithAgents: latest?.summary?.nodesWithAgents ?? latestNodes,
              activeTasks:
                latest?.summary?.activeTasks ??
                latestTasks.filter(
                  (task) => task.state === 'working' || task.state === 'submitted',
                ).length,
              completedTasks:
                latest?.summary?.completedTasks ??
                latestTasks.filter((task) => task.state === 'completed').length,
              totalTasks: latest?.summary?.totalTasks ?? latestTasks.length,
              leadName: shortAgentName(latest?.leadAgent?.name || leadAgent?.name),
              mode: latest?.orchestrationConfig?.mode || executionMode,
              agents: latestAgents,
            });
            return;
          }
          case '/agent': {
            if (!parsed.args[0]) {
              onToast?.('用法：/agent <agentId | nodeId | auto>', 'info');
              return;
            }
            if (parsed.args[0].toLowerCase() === 'auto') {
              setSelectedTarget('auto');
              setPrompt('');
              onToast?.('已恢复自动调度路由', 'ok');
              return;
            }
            const matched = resolveAgentByToken(parsed.args[0], agents);
            if (!matched) {
              onToast?.(`未找到匹配的 Agent：${parsed.args[0]}`, 'err');
              return;
            }
            setSelectedTarget(matched.id);
            setPrompt('');
            onToast?.(
              `已切换目标 Agent：${shortAgentName(matched.name)} (${matched.nodeId})`,
              'ok',
            );
            return;
          }
          case '/model': {
            if (!parsed.rest) {
              onToast?.('用法：/model <模型名 | default>', 'info');
              return;
            }
            const lowerModel = parsed.rest.toLowerCase();
            if (lowerModel === 'default' || lowerModel === 'auto' || lowerModel === 'clear') {
              setModelOverride('');
              setPrompt('');
              onToast?.('已清除模型覆盖，恢复默认路由', 'ok');
              return;
            }
            setModelOverride(parsed.rest);
            setPrompt('');
            onToast?.(`已设置模型覆盖：${parsed.rest}`, 'ok');
            return;
          }
          case '/effort': {
            const level = (parsed.args[0] || '').toLowerCase() as ComposerEffortLevel;
            if (!VALID_COMPOSER_EFFORTS.has(level)) {
              onToast?.('思考力度仅支持：low | medium | high | xhigh | max', 'err');
              return;
            }
            setReasoningEffort(level);
            setPrompt('');
            onToast?.(`已调整思考力度：${level}`, 'ok');
            return;
          }
          case '/mode': {
            const mode = (parsed.args[0] || '').toLowerCase() as ComposerExecutionMode;
            if (!VALID_COMPOSER_MODES.has(mode)) {
              onToast?.('编排模式仅支持：lead-router | main-sub | swarm | plan', 'err');
              return;
            }
            setExecutionMode(mode);
            setPrompt('');
            onToast?.(`已切换编排模式：${MODE_LABELS[mode]}`, 'ok');
            return;
          }
          case '/tasks': {
            const queryTerm = parsed.rest;
            handleSearchChange(queryTerm);
            setPrompt('');
            const matched = filterAgentTasks(tasks, queryTerm);
            if (workspaceMode === 'kanban') {
              onToast?.(`看板已过滤：匹配 ${matched.length} 项任务`, 'info');
            } else {
              appendSystemCard({
                id: makeCardId('tasks'),
                kind: 'tasks',
                createdAt: new Date().toISOString(),
                query: queryTerm,
                matched: matched.slice(0, 8),
              });
              onToast?.(`已匹配 ${matched.length} 项任务`, 'info');
            }
            return;
          }
          case '/compact': {
            setPrompt('');
            setWorkspaceMode('thread');
            if (activeTask && !readOnly) {
              try {
                await compactA2ATask(activeTask.id, parsed.rest || undefined);
                await loadState();
                onTasksUpdated?.();
              } catch {
                // fallback to local summary card below
              }
            }
            const sourceTasks = threadTasks.length > 0 ? threadTasks : tasks.slice(0, 6);
            const summary = buildCompactThreadSummary(sourceTasks);
            appendSystemCard({
              id: makeCardId('compact'),
              kind: 'compact',
              createdAt: new Date().toISOString(),
              summary,
            });
            onToast?.(`已标记整理 ${summary.turnCount} 轮对话上下文（原始记录保留）`, 'ok');
            return;
          }
          case '/ping': {
            if (readOnly) {
              onToast?.('只读模式下不可发起实时 A2A 拨测', 'err');
              return;
            }
            const arg = parsed.args[0];
            const resolvedPeer = arg
              ? resolveAgentByToken(arg, agents)
              : selectedTarget !== 'auto'
                ? agents.find((agent) => agent.id === selectedTarget) || null
                : leadAgent;
            const targetId = resolvedPeer?.id || arg;
            if (!targetId) {
              onToast?.('用法：/ping <agentId>', 'err');
              return;
            }
            setPrompt('');
            setSubmitting(true);
            setWorkspaceMode('thread');
            try {
              const pingRes = await pingA2AAgent(targetId);
              appendSystemCard({
                id: makeCardId('ping'),
                kind: 'ping',
                createdAt: new Date().toISOString(),
                result: pingRes,
              });
              onToast?.(
                pingRes.reachable
                  ? `A2A 连通正常：${pingRes.agentName || targetId} (${pingRes.latencyMs ?? '-'}ms)`
                  : `A2A 拨测失败：${pingRes.error || targetId}`,
                pingRes.reachable ? 'ok' : 'err',
              );
            } catch (err) {
              onToast?.(err instanceof Error ? err.message : 'A2A 拨测失败', 'err');
            } finally {
              setSubmitting(false);
            }
            return;
          }
          case '/handoff': {
            const arg = parsed.args[0];
            if (!arg) {
              onToast?.('用法：/handoff <目标 Agent ID 或节点 ID>', 'err');
              return;
            }
            const targetPeer = resolveAgentByToken(arg, agents);
            if (!targetPeer) {
              onToast?.(`未找到可交接的 Agent：${arg}`, 'err');
              return;
            }
            setSelectedTarget(targetPeer.id);
            setPrompt('');
            setWorkspaceMode('thread');

            const matchingSession =
              a2aState?.sessions?.find(
                (sess) => activeTask?.contextId && sess.contextId === activeTask.contextId,
              ) ||
              a2aState?.sessions?.[0] ||
              null;

            if (!readOnly && matchingSession) {
              setSubmitting(true);
              try {
                await handoffA2ASession(matchingSession.id, targetPeer.id);
                await loadState();
              } catch (err) {
                onToast?.(err instanceof Error ? err.message : '会话交接失败', 'err');
                setSubmitting(false);
                return;
              } finally {
                setSubmitting(false);
              }
            }

            appendSystemCard({
              id: makeCardId('handoff'),
              kind: 'handoff',
              createdAt: new Date().toISOString(),
              targetName: shortAgentName(targetPeer.name),
              targetNode: targetPeer.nodeName || targetPeer.nodeId,
              targetId: targetPeer.id,
              sessionTitle: matchingSession?.title || null,
              contextId: activeTask?.contextId || matchingSession?.contextId || null,
            });
            onToast?.(
              `会话上下文已交接至 ${shortAgentName(targetPeer.name)} (${targetPeer.nodeId})`,
              'ok',
            );
            return;
          }
          case '/plan': {
            if (!parsed.rest) {
              setExecutionMode('plan');
              setPrompt('');
              onToast?.('已切换至规划模式，请输入待评估任务', 'ok');
              return;
            }
            await dispatchTaskPayload({
              promptText: parsed.rest,
              mode: 'plan',
              slashCommand: '/plan',
            });
            return;
          }
          case '/worktree': {
            if (parsed.args.length === 0) {
              onToast?.('用法：/worktree <分支名> <任务描述>', 'err');
              return;
            }
            const branch = parsed.args[0];
            const taskBody = parsed.rest.slice(branch.length).trim();
            if (!taskBody) {
              setArmedWorktree(branch);
              setPrompt('');
              onToast?.(`已锁定 Worktree 分支 ${branch}，请输入任务内容`, 'ok');
              return;
            }
            await dispatchTaskPayload({
              promptText: taskBody,
              worktree: branch,
              slashCommand: '/worktree',
            });
            return;
          }
          case '/btw': {
            const matchingSession =
              a2aState?.sessions?.find(
                (sess) => activeTask?.contextId && sess.contextId === activeTask.contextId,
              ) ||
              a2aState?.sessions?.[0] ||
              null;
            if (!parsed.rest) {
              setPrompt('');
              setBtwContextTaskId(activeTask?.id || null);
              setBtwInitialThreadId(null);
              setBtwOpen(true);
              return;
            }
            if (readOnly) {
              setPrompt('');
              setBtwContextTaskId(activeTask?.id || null);
              setBtwInitialThreadId(null);
              setBtwOpen(true);
              onToast?.('只读模式下仅可查看 BTW 旁支与审批记录', 'err');
              return;
            }
            setSubmitting(true);
            try {
              const opened = await openA2ABtwThread({
                sessionId: matchingSession?.id,
                taskId: activeTask?.id,
                prompt: parsed.rest,
                targetAgentId: selectedTarget !== 'auto' ? selectedTarget : undefined,
                model: modelOverride || undefined,
              });
              setPrompt('');
              setBtwContextTaskId(activeTask?.id || null);
              setBtwInitialThreadId(opened.thread.id);
              setBtwOpen(true);
              await loadState();
              onToast?.(`已开启隔离 BTW 旁支 ${opened.thread.id}（零污染主线）`, 'ok');
            } catch (err) {
              onToast?.(err instanceof Error ? err.message : '开启 BTW 旁支失败', 'err');
            } finally {
              setSubmitting(false);
            }
            return;
          }
          default: {
            onToast?.(`未知斜杠命令：${parsed.command}，输入 /help 查看全部命令`, 'err');
            return;
          }
        }
      }

      const mention = extractAtMention(trimmed, agents);
      await dispatchTaskPayload({
        promptText: mention.matchedAgent ? mention.cleanedPrompt : trimmed,
        targetAgentId: mention.matchedAgent?.id,
      });
    },
    [
      submitting,
      appendSystemCard,
      onToast,
      onSelectTask,
      focusComposer,
      loadState,
      a2aState,
      agents,
      tasks,
      leadAgent,
      executionMode,
      handleSearchChange,
      workspaceMode,
      threadTasks,
      readOnly,
      selectedTarget,
      activeTask,
      modelOverride,
      dispatchTaskPayload,
    ],
  );

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!prompt.trim() || submitting) return;
    await executeRawInput(prompt);
  };

  const handleSelectSlashCommand = React.useCallback(
    (command: SlashCommandDef) => {
      setManualSlashOpen(false);
      setMenuDismissed(true);
      if (!command.acceptsArgs) {
        void executeRawInput(command.name);
        return;
      }
      setPrompt(`${command.name} `);
      focusComposer();
    },
    [executeRawInput, focusComposer],
  );

  const handleSelectMentionAgent = React.useCallback(
    (agent: A2AAgentPeer) => {
      const startIdx = mentionInfo.activeStartIndex;
      if (startIdx >= 0) {
        const prefix = prompt.slice(0, startIdx);
        setPrompt(`${prefix}@${agent.id} `);
      } else {
        setPrompt((prev) => `${prev.trimEnd()} @${agent.id} `.trimStart());
      }
      setSelectedTarget(agent.id);
      setMenuDismissed(true);
      focusComposer();
    },
    [mentionInfo.activeStartIndex, prompt, focusComposer],
  );

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (menuMode && menuItemsCount > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMenuActiveIndex((prev) => (prev + 1) % menuItemsCount);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMenuActiveIndex((prev) => (prev - 1 + menuItemsCount) % menuItemsCount);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuDismissed(true);
        setManualSlashOpen(false);
        return;
      }
      if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
        event.preventDefault();
        if (menuMode === 'slash') {
          const chosen = slashCandidates[menuActiveIndex];
          if (chosen) {
            if (event.key === 'Tab' && chosen.acceptsArgs) {
              setManualSlashOpen(false);
              setMenuDismissed(true);
              setPrompt(`${chosen.name} `);
            } else if (
              event.key === 'Enter' &&
              chosen.name === '/tasks' &&
              prompt.trim().toLowerCase() === '/tasks'
            ) {
              void executeRawInput('/tasks');
            } else {
              handleSelectSlashCommand(chosen);
            }
          }
        } else if (menuMode === 'mention') {
          const chosen = mentionInfo.candidates[menuActiveIndex];
          if (chosen) {
            handleSelectMentionAgent(chosen);
          }
        }
        return;
      }
    } else if (event.key === 'Escape' && (manualSlashOpen || menuMode)) {
      event.preventDefault();
      setManualSlashOpen(false);
      setMenuDismissed(true);
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleCancelTask = async (taskId: string) => {
    if (readOnly || cancelingTaskId) return;
    setCancelingTaskId(taskId);
    try {
      await cancelA2ATask(taskId);
      await loadState();
      onTasksUpdated?.();
      onToast?.(`已停止任务 ${taskId}`, 'info');
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '取消失败', 'err');
    } finally {
      setCancelingTaskId(null);
    }
  };

  const handleMoveTaskState = async (
    taskId: string,
    targetState: KanbanCanonicalTaskState,
  ) => {
    if (readOnly) {
      onToast?.('只读模式下不可修改任务状态', 'err');
      return;
    }
    setMovingTaskId(taskId);
    setOptimisticStates((prev) => ({ ...prev, [taskId]: targetState }));
    try {
      await updateA2ATaskState(taskId, targetState, 'workspace-lifecycle-update');
      await loadState();
      onTasksUpdated?.();
      onToast?.(`任务 ${taskId} 已更新为 ${taskStatusLabel(targetState)}`, 'ok');
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '状态更新失败', 'err');
    } finally {
      setOptimisticStates((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setMovingTaskId(null);
    }
  };

  const handleCopyArtifact = async (task: A2ATaskRecord) => {
    const text = task.artifact || task.steps.map((step) => step.detail).join('\n') || task.prompt;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedTaskId(task.id);
      onToast?.('已复制输出内容到剪贴板', 'ok');
      window.setTimeout(() => {
        setCopiedTaskId((current) => (current === task.id ? null : current));
      }, 1800);
    } else {
      onToast?.('复制失败，请手动选中复制', 'err');
    }
  };

  const handleQueueTurn = React.useCallback(
    async (taskId: string, queuedPrompt: string) => {
      if (readOnly || !queuedPrompt.trim()) return;
      setBusyControlTaskId(taskId);
      try {
        await queueA2ATaskTurn(taskId, {
          prompt: queuedPrompt.trim(),
          model: modelOverride || undefined,
          effort: reasoningEffort,
        });
        await loadState();
        onTasksUpdated?.();
        onToast?.('已加入下一轮执行队列', 'ok');
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '加入队列失败', 'err');
      } finally {
        setBusyControlTaskId(null);
      }
    },
    [readOnly, modelOverride, reasoningEffort, loadState, onTasksUpdated, onToast],
  );

  const handleSteerTask = React.useCallback(
    async (taskId: string, instruction: string) => {
      if (readOnly || !instruction.trim()) return;
      setBusyControlTaskId(taskId);
      try {
        await steerA2ATask(taskId, instruction.trim());
        await loadState();
        onTasksUpdated?.();
        onToast?.('已注入运行中纠偏指令', 'ok');
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '注入指令失败', 'err');
      } finally {
        setBusyControlTaskId(null);
      }
    },
    [readOnly, loadState, onTasksUpdated, onToast],
  );

  const handleRestartTask = React.useCallback(
    async (taskId: string, freshContext: boolean) => {
      if (readOnly) return;
      setBusyControlTaskId(taskId);
      try {
        const res = await restartA2ATask(taskId, { freshContext });
        await loadState();
        onTasksUpdated?.();
        if (res.task?.id) {
          onSelectTask?.(res.task.id);
          setWorkspaceMode('thread');
        }
        onToast?.(freshContext ? '已开启干净上下文新线程（保留父线程谱系）' : '已重启任务执行', 'ok');
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '重启任务失败', 'err');
      } finally {
        setBusyControlTaskId(null);
      }
    },
    [readOnly, loadState, onTasksUpdated, onSelectTask, onToast],
  );

  const handleSettleTask = React.useCallback(
    async (taskId: string) => {
      if (readOnly) return;
      setBusyControlTaskId(taskId);
      try {
        await settleA2ATask(taskId);
        await loadState();
        onTasksUpdated?.();
        onToast?.('已将线程标记为已处理', 'ok');
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '标记已处理失败', 'err');
      } finally {
        setBusyControlTaskId(null);
      }
    },
    [readOnly, loadState, onTasksUpdated, onToast],
  );

  const handleSnoozeTask = React.useCallback(
    async (taskId: string, minutes: number) => {
      if (readOnly) return;
      setBusyControlTaskId(taskId);
      try {
        await snoozeA2ATask(taskId, { minutes });
        await loadState();
        onTasksUpdated?.();
        onToast?.(`已静默提醒 ${minutes} 分钟（新审批或完成将提前唤醒）`, 'info');
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '静默失败', 'err');
      } finally {
        setBusyControlTaskId(null);
      }
    },
    [readOnly, loadState, onTasksUpdated, onToast],
  );

  const handleCompactTask = React.useCallback(
    async (taskId: string) => {
      if (readOnly) return;
      setBusyControlTaskId(taskId);
      try {
        await compactA2ATask(taskId);
        await loadState();
        onTasksUpdated?.();
        onToast?.('已标记压缩上下文（原始步骤完整保留）', 'ok');
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '上下文压缩失败', 'err');
      } finally {
        setBusyControlTaskId(null);
      }
    },
    [readOnly, loadState, onTasksUpdated, onToast],
  );

  const handleOpenNewThread = () => {
    setWorkspaceMode('thread');
    setSystemCards([]);
    setArmedWorktree('');
    onSelectTask?.(null);
    if (typeof window !== 'undefined') {
      clearNodeDraft(window.localStorage, activeDraftNodeId, activeTaskId);
    }
    focusComposer();
  };

  const renderSystemCard = (card: LocalSlashCard) => {
    return (
      <div
        key={card.id}
        data-testid={`agent-slash-card-${card.id}`}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 min-w-0 text-[12.5px] font-medium text-[var(--ink)]">
            {card.kind === 'help' && (
              <>
                <Terminal className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                <span>斜杠命令与 @agent 路由手册</span>
              </>
            )}
            {card.kind === 'status' && (
              <>
                <Activity className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                <span>多机 Agent 集群 · Google A2A v{card.protocolVersion}</span>
              </>
            )}
            {card.kind === 'ping' && (
              <>
                <Radio className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                <span>A2A AgentCard 实时拨测 · {card.result.agentName || card.result.agentId}</span>
              </>
            )}
            {card.kind === 'tasks' && (
              <>
                <Search className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                <span>
                  任务筛选结果{card.query ? ` · 「${card.query}」` : ''}（{card.matched.length}）
                </span>
              </>
            )}
            {card.kind === 'compact' && (
              <>
                <Layers className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                <span>上下文精简摘要 · {card.summary.turnCount} 轮对话</span>
              </>
            )}
            {card.kind === 'handoff' && (
              <>
                <Sparkles className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                <span>会话控制权交接完成</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
              {formatClock(card.createdAt)}
            </span>
            <button
              type="button"
              onClick={() => dismissSystemCard(card.id)}
              aria-label="关闭卡片"
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
                FOCUS_RING,
              )}
            >
              <X className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {card.kind === 'help' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
              {SLASH_COMMANDS.map((cmd) => (
                <button
                  key={cmd.name}
                  type="button"
                  onClick={() => {
                    setPrompt(cmd.acceptsArgs ? `${cmd.name} ` : cmd.name);
                    focusComposer();
                  }}
                  className={cn(
                    'flex flex-col items-start rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
                    FOCUS_RING,
                  )}
                >
                  <span className="font-mono text-[12px] font-medium text-[var(--accent)]">
                    {cmd.usage}
                  </span>
                  <span className="text-[12px] text-[var(--ink-muted)]">{cmd.description}</span>
                </button>
              ))}
            </div>
            <p className="text-[12px] text-[var(--ink-subtle)] pt-2 border-t border-[var(--border-subtle)]">
              快捷路由：输入 <code className="font-mono text-[var(--ink)]">@agent-id</code> 或{' '}
              <code className="font-mono text-[var(--ink)]">@node-id</code>{' '}
              可呼出节点联想菜单并自动将任务路由至对应设备的 Agent。
            </p>
          </div>
        )}

        {card.kind === 'status' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums">
              <span className="text-[var(--ok)]">
                {card.onlineAgents}/{card.totalAgents} 在线 Agent
              </span>
              <span aria-hidden="true">·</span>
              <span>{card.nodesWithAgents} 设备节点</span>
              <span aria-hidden="true">·</span>
              <span>
                任务 {card.activeTasks} 活跃 / {card.completedTasks} 完成 / {card.totalTasks} 总计
              </span>
              <span aria-hidden="true">·</span>
              <span>主控 {card.leadName}</span>
              <span aria-hidden="true">·</span>
              <span>模式 {modeDisplayLabel(card.mode)}</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {card.agents.map((peer) => {
                const online = isAgentOnline(peer.status);
                return (
                  <div
                    key={peer.id}
                    className="py-2 flex items-center justify-between gap-3 text-[12.5px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          online ? 'bg-[var(--ok-dot)]' : 'bg-[var(--muted-dot)]',
                        )}
                      />
                      <span className="font-medium text-[var(--ink)] truncate">
                        {shortAgentName(peer.name)}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--ink-subtle)] truncate">
                        {peer.nodeId} · {peer.modelHint || peer.harness}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                      <span>{peer.latencyMs != null ? `${peer.latencyMs}ms` : '-'}</span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => void executeRawInput(`/ping ${peer.id}`)}
                          className={cn(
                            'text-[var(--accent)] hover:underline cursor-pointer rounded-sm',
                            FOCUS_RING,
                          )}
                        >
                          拨测
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {card.kind === 'ping' && (
          <div className="space-y-2 text-[12.5px]">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono tabular-nums">
              <StatusIndicator
                status={card.result.reachable ? 'healthy' : 'failed'}
                label={card.result.reachable ? 'AgentCard 可达' : '不可达'}
              />
              <span aria-hidden="true" className="text-[var(--ink-subtle)]">
                ·
              </span>
              <span className="text-[var(--ink-muted)]">
                RTT {card.result.latencyMs != null ? `${card.result.latencyMs}ms` : '-'}
              </span>
              {card.result.nodeId && (
                <>
                  <span aria-hidden="true" className="text-[var(--ink-subtle)]">
                    ·
                  </span>
                  <span className="text-[var(--ink-subtle)]">{card.result.nodeId}</span>
                </>
              )}
              {card.result.protocol && (
                <>
                  <span aria-hidden="true" className="text-[var(--ink-subtle)]">
                    ·
                  </span>
                  <span className="text-[var(--ink-subtle)]">{card.result.protocol}</span>
                </>
              )}
            </div>
            {card.result.error && (
              <p className="text-[12px] text-[var(--err)] font-mono break-words">
                {card.result.error}
              </p>
            )}
            {card.result.card && (
              <pre className="rounded-lg bg-[var(--terminal-bg)] text-[var(--terminal-ink)] p-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto">
                {JSON.stringify(card.result.card, null, 2)}
              </pre>
            )}
          </div>
        )}

        {card.kind === 'tasks' && (
          <div className="space-y-2">
            {card.matched.length === 0 ? (
              <p className="text-[12.5px] text-[var(--ink-muted)]">未匹配到符合条件的任务。</p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {card.matched.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTask?.(item.id)}
                    className={cn(
                      'w-full py-2 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] px-2 -mx-2 rounded-lg transition-colors cursor-pointer',
                      FOCUS_RING,
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[var(--ink)] truncate">
                        {item.prompt}
                      </p>
                      <p className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums truncate">
                        {item.id} · {shortAgentName(item.workerAgentName || item.leadAgentName)} ·{' '}
                        {item.workerNodeId}
                      </p>
                    </div>
                    <StatusIndicator
                      status={taskStatusTone(item.state)}
                      label={taskStatusLabel(item.state)}
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setWorkspaceMode('kanban')}>
                <KanbanSquare className="size-3.5" strokeWidth={1.75} />
                在生命周期看板查看
              </Button>
            </div>
          </div>
        )}

        {card.kind === 'compact' && (
          <div className="space-y-2.5 text-[12.5px]">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums">
              <span>完成 {card.summary.completedCount}</span>
              <span aria-hidden="true">·</span>
              <span>活跃 {card.summary.activeCount}</span>
              <span aria-hidden="true">·</span>
              <span>失败 {card.summary.failedCount}</span>
              {card.summary.contextId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{card.summary.contextId}</span>
                </>
              )}
            </div>
            {card.summary.agents.length > 0 && (
              <p className="text-[12px] text-[var(--ink-muted)]">
                参与 Agent：{card.summary.agents.join(' / ')}
                {card.summary.models.length > 0 && ` · 模型：${card.summary.models.join(' / ')}`}
                {card.summary.branches.length > 0 &&
                  ` · Worktree：${card.summary.branches.join(', ')}`}
              </p>
            )}
            {card.summary.highlights.length > 0 && (
              <ul className="space-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)]">
                {card.summary.highlights.map((line, idx) => (
                  <li key={`${card.id}-hl-${idx}`} className="truncate">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {card.kind === 'handoff' && (
          <div className="space-y-1 text-[12.5px] text-[var(--ink-muted)]">
            <p className="text-[var(--ink)]">
              后续任务将默认路由至{' '}
              <span className="font-medium">{card.targetName}</span>（
              <span className="font-mono text-[12px]">{card.targetNode}</span> /{' '}
              <span className="font-mono text-[12px]">{card.targetId}</span>）。
            </p>
            {(card.sessionTitle || card.contextId) && (
              <p className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                {card.sessionTitle ? `会话：${card.sessionTitle}` : ''}
                {card.sessionTitle && card.contextId ? ' · ' : ''}
                {card.contextId ? `Context：${card.contextId}` : ''}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const hasComposerBadges =
    Boolean(modelOverride) ||
    Boolean(armedWorktree) ||
    executionMode === 'plan' ||
    Boolean(mentionInfo.matchedAgent);

  const renderComposer = (compact = false) => (
    <div className="relative w-full">
      <AgentSlashMenu
        open={Boolean(menuMode)}
        mode={menuMode || 'slash'}
        commands={slashCandidates}
        agents={mentionInfo.candidates}
        activeIndex={menuActiveIndex}
        query={menuMode === 'mention' ? mentionInfo.activeQuery || '' : prompt}
        onHoverIndex={setMenuActiveIndex}
        onSelectCommand={handleSelectSlashCommand}
        onSelectAgent={handleSelectMentionAgent}
        onClose={() => {
          setMenuDismissed(true);
          setManualSlashOpen(false);
        }}
      />

      <form
        onSubmit={handleSubmit}
        data-testid="agent-console-composer"
        className={cn(
          'w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-within:border-[var(--accent)] transition-[border-color,box-shadow] duration-150',
          compact ? 'p-3' : 'p-4',
        )}
      >
        {hasComposerBadges && (
          <div className="mb-2 pb-2 border-b border-[var(--border-subtle)] flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-[var(--ink-muted)]">
            {executionMode === 'plan' && (
              <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                <span>规划模式</span>
                <button
                  type="button"
                  onClick={() => setExecutionMode('lead-router')}
                  aria-label="退出规划模式"
                  className="hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="size-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {modelOverride && (
              <span className="inline-flex items-center gap-1">
                <span className="text-[var(--ink-subtle)]">模型:</span>
                <span className="text-[var(--ink)]">{modelOverride}</span>
                <button
                  type="button"
                  onClick={() => setModelOverride('')}
                  aria-label="清除模型覆盖"
                  className="text-[var(--ink-subtle)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="size-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {armedWorktree && (
              <span className="inline-flex items-center gap-1 text-[var(--ink)]">
                <GitBranch className="size-3 text-[var(--accent)]" strokeWidth={1.75} />
                <span>{armedWorktree}</span>
                <button
                  type="button"
                  onClick={() => setArmedWorktree('')}
                  aria-label="取消 Worktree 分支"
                  className="text-[var(--ink-subtle)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="size-3" strokeWidth={1.75} />
                </button>
              </span>
            )}
            {mentionInfo.matchedAgent && (
              <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                <span>
                  路由 → {shortAgentName(mentionInfo.matchedAgent.name)} (
                  {mentionInfo.matchedAgent.nodeId})
                </span>
              </span>
            )}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={compact ? 2 : 3}
          disabled={readOnly || submitting}
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setMenuDismissed(false);
            setManualSlashOpen(false);
          }}
          onKeyDown={handleComposerKeyDown}
          placeholder={
            activeTask
              ? '继续追问当前线程，输入 / 使用斜杠命令，或 @agent 切换执行节点...'
              : '输入任务描述，输入 / 调用斜杠命令（/plan、/worktree、/status），或 @agent 指定节点...'
          }
          aria-label="输入 Agent 指令"
          data-testid="agent-console-input"
          className="w-full resize-none bg-transparent text-[16px] sm:text-[14.5px] leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
        />

        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <NodeAgentModelSelector
              catalog={modelCatalog}
              agents={agents}
              selectedNodeId={selectedNodeId}
              onSelectNodeId={(nextNodeId) => {
                setSelectedNodeId(nextNodeId);
                setOfflineNotice(null);
              }}
              selectedTarget={selectedTarget}
              onSelectTarget={(nextTarget) => {
                setSelectedTarget(nextTarget);
                setOfflineNotice(null);
              }}
              modelOverride={modelOverride}
              onSelectModel={(nextModel) => {
                setModelOverride(nextModel);
                setOfflineNotice(null);
              }}
              effort={reasoningEffort}
              onSelectEffort={(nextEffort) => {
                if (VALID_COMPOSER_EFFORTS.has(nextEffort as ComposerEffortLevel)) {
                  setReasoningEffort(nextEffort as ComposerEffortLevel);
                }
              }}
              executionMode={executionMode}
              onSelectExecutionMode={(nextMode) => {
                if (VALID_COMPOSER_MODES.has(nextMode as ComposerExecutionMode)) {
                  setExecutionMode(nextMode as ComposerExecutionMode);
                }
              }}
              resolvedDefaultModelLabel={resolvedDefaultModel.label}
              leadAgentName={leadAgent ? shortAgentName(leadAgent.name) : undefined}
              offlineNotice={offlineNotice}
              disabled={submitting}
              readOnly={readOnly}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={readOnly || submitting}
              data-testid="agent-slash-trigger-btn"
              aria-label="打开斜杠命令面板"
              title="斜杠命令 (/)"
              onClick={() => {
                setManualSlashOpen((prev) => !prev);
                setMenuDismissed(false);
                focusComposer();
              }}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-colors active:scale-[0.97] cursor-pointer disabled:opacity-40',
                manualSlashOpen && 'border-[var(--accent)] text-[var(--accent)]',
                FOCUS_RING,
              )}
            >
              <Slash className="size-3.5" strokeWidth={1.75} />
            </button>

            {hasRunningThreadTask && activeTask && !readOnly && (
              <button
                type="button"
                disabled={cancelingTaskId === activeTask.id}
                aria-label="停止当前任务"
                onClick={() => void handleCancelTask(activeTask.id)}
                className={cn(
                  'inline-flex h-8 px-2.5 items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12px] font-medium text-[var(--err)] hover:bg-[var(--surface-hover)] transition-colors active:scale-[0.97] cursor-pointer disabled:opacity-45',
                  FOCUS_RING,
                )}
              >
                <Square className="size-3" strokeWidth={2} />
                停止
              </button>
            )}

            <button
              type="submit"
              disabled={readOnly || submitting || !prompt.trim()}
              aria-label="发送指令"
              data-testid="agent-console-run-btn"
              className={cn(
                'h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 transition-[background-color,opacity,transform] duration-150 cursor-pointer active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed',
                'bg-[var(--accent)] text-white hover:opacity-90',
                FOCUS_RING,
              )}
            >
              <ArrowUp className="size-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  const showActiveThread = threadTasks.length > 0 || systemCards.length > 0;
  const btwThreads = a2aState?.btwThreads || [];
  const btwGlobalCounts = React.useMemo(() => countBtwAttention(btwThreads), [btwThreads]);
  const needsYouItems = React.useMemo(
    () => buildNeedsYouQueue(tasks, btwThreads),
    [tasks, btwThreads],
  );
  const btwDrawerTask = React.useMemo(
    () =>
      (btwContextTaskId ? tasks.find((item) => item.id === btwContextTaskId) : null) ||
      activeTask ||
      null,
    [btwContextTaskId, tasks, activeTask],
  );
  const btwDrawerSession = React.useMemo(() => {
    const sessions = a2aState?.sessions || [];
    if (btwDrawerTask?.contextId) {
      const matched = sessions.find((sess) => sess.contextId === btwDrawerTask.contextId);
      if (matched) return matched;
    }
    return sessions[0] || null;
  }, [a2aState?.sessions, btwDrawerTask]);

  return (
    <div
      data-testid="view-agent-console"
      className="min-h-[calc(100dvh-8.5rem)] w-full flex flex-col gap-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div
            role="tablist"
            aria-label="工作区视图模式"
            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={workspaceMode === 'thread'}
              data-testid="agent-workspace-mode-thread"
              onClick={() => setWorkspaceMode('thread')}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12.5px] font-medium transition-colors cursor-pointer',
                workspaceMode === 'thread'
                  ? 'bg-[var(--surface-elevated)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
                FOCUS_RING,
              )}
            >
              <MessageSquare className="size-3.5" strokeWidth={1.75} />
              对话流
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={workspaceMode === 'kanban'}
              data-testid="agent-workspace-mode-kanban"
              onClick={() => setWorkspaceMode('kanban')}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12.5px] font-medium transition-colors cursor-pointer',
                workspaceMode === 'kanban'
                  ? 'bg-[var(--surface-elevated)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
                FOCUS_RING,
              )}
            >
              <KanbanSquare className="size-3.5" strokeWidth={1.75} />
              运行泳道
              <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                {effectiveSearchQuery.trim()
                  ? `${filteredTasksCount}/${tasks.length}`
                  : tasks.length}
              </span>
            </button>
          </div>
          {onOpenProjectIssue && (
            <button
              type="button"
              data-testid="agent-open-projects-kanban-btn"
              onClick={() => onOpenProjectIssue()}
              className={cn(
                'hidden sm:inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
                FOCUS_RING,
              )}
            >
              项目看板
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0',
                onlineAgentCount > 0 ? 'bg-[var(--ok-dot)]' : 'bg-[var(--muted-dot)]',
              )}
              aria-hidden="true"
            />
            <span className="text-[var(--ink-muted)]">{onlineAgentCount} 在线 Agent</span>
            <span aria-hidden="true">·</span>
            <span>{nodeGroups.length} 设备节点</span>
            <span aria-hidden="true">·</span>
            <span>Google A2A v{a2aState?.architecture?.protocolVersion || '0.3'}</span>
            {a2aState?.signing && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="agent-signing-status"
                  title={`签名算法 ${a2aState.signing.algorithm} · Key ${a2aState.signing.keyId} · 来源 ${a2aState.signing.keySource}`}
                  className={cn(
                    'inline-flex items-center gap-1',
                    a2aState.signing.configured ? 'text-[var(--ok)]' : 'text-[var(--ink-subtle)]',
                  )}
                >
                  <ShieldCheck className="size-3.5 shrink-0" strokeWidth={1.75} />
                  <span>
                    {a2aState.signing.configured
                      ? `HMAC (${a2aState.signing.keyId})`
                      : 'HMAC 临时密钥'}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {workspaceMode === 'thread' && tasks.length > 0 && (
            headerSearchOpen || effectiveSearchQuery.trim().length > 0 ? (
              <div className="relative hidden sm:block w-[210px]">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--ink-subtle)]"
                  strokeWidth={1.75}
                />
                <input
                  ref={headerSearchInputRef}
                  type="text"
                  value={effectiveSearchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  onBlur={() => {
                    if (!effectiveSearchQuery.trim()) {
                      setHeaderSearchOpen(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && effectiveSearchQuery.trim()) {
                      setWorkspaceMode('kanban');
                    } else if (event.key === 'Escape') {
                      if (effectiveSearchQuery) {
                        handleSearchChange('');
                      } else {
                        setHeaderSearchOpen(false);
                      }
                    }
                  }}
                  placeholder="搜索任务 ID / 历史..."
                  aria-label="按任务 ID 或提示词搜索"
                  className={cn(inputBaseClass, 'h-8 w-full pl-8 pr-7')}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (effectiveSearchQuery) {
                      handleSearchChange('');
                    } else {
                      setHeaderSearchOpen(false);
                    }
                  }}
                  aria-label={effectiveSearchQuery ? '清空搜索' : '收起搜索'}
                  className={cn(
                    'h-5 w-5 absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
                    FOCUS_RING,
                  )}
                >
                  <X className="size-3" strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="搜索任务 ID 或提示词"
                title="搜索任务 ID 或提示词"
                data-testid="agent-header-search-toggle"
                onClick={() => {
                  setHeaderSearchOpen(true);
                  window.requestAnimationFrame(() => headerSearchInputRef.current?.focus());
                }}
              >
                <Search className="size-4" strokeWidth={1.75} />
              </Button>
            )
          )}

          <Button
            variant="secondary"
            size="sm"
            data-testid="agent-open-btw-btn"
            onClick={() => {
              setBtwContextTaskId(activeTask?.id || null);
              setBtwInitialThreadId(null);
              setBtwOpen(true);
            }}
          >
            <GitBranch className="size-3.5" strokeWidth={1.75} />
            BTW 侧聊
            {btwGlobalCounts.attentionCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--warn)] tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" aria-hidden="true" />
                {btwGlobalCounts.attentionCount}
              </span>
            ) : btwGlobalCounts.total > 0 ? (
              <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                {btwGlobalCounts.total}
              </span>
            ) : null}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            data-testid="agent-new-thread-btn"
            onClick={handleOpenNewThread}
          >
            <Plus className="size-3.5" strokeWidth={1.75} />
            新建对话
          </Button>

          {onOpenSelfEvolution && (
            <Button
              variant="ghost"
              size="sm"
              data-testid="agent-self-evolution-btn"
              title="打开模块热插拔与自进化 PR 流水线"
              onClick={onOpenSelfEvolution}
            >
              <Sparkles className="size-3.5" strokeWidth={1.75} />
              <span className="hidden lg:inline">自进化</span>
            </Button>
          )}

          <Button
            variant={contextRailOpen ? 'secondary' : 'ghost'}
            size="icon"
            aria-label={contextRailOpen ? '收起上下文侧栏' : '展开上下文侧栏'}
            title="上下文侧栏 (⌘])"
            data-testid="agent-context-rail-toggle"
            onClick={() => setContextRailOpen((prev) => !prev)}
          >
            <PanelRight className="size-4" strokeWidth={1.75} />
          </Button>

          {onOpenSettings && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="打开 Agent 与 A2A 设置"
              title="Agent 与 A2A 设置"
              onClick={() => onOpenSettings('agents')}
            >
              <Settings className="size-4" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </header>

      {needsYouItems.length > 0 && (
        <MobileNeedsYouStream
          items={needsYouItems}
          readOnly={readOnly}
          onOpenTask={(taskId) => {
            onSelectTask?.(taskId);
            setWorkspaceMode('thread');
          }}
          onOpenBtw={(taskId, threadId) => {
            setBtwContextTaskId(taskId);
            setBtwInitialThreadId(threadId || null);
            setBtwOpen(true);
          }}
          onSettleTask={(taskId) => void handleSettleTask(taskId)}
          onSnoozeTask={(taskId, minutes) => void handleSnoozeTask(taskId, minutes)}
        />
      )}

      <div className="flex-1 min-h-0 flex items-stretch gap-4">
        <div className="flex-1 min-w-0 flex flex-col">
      {workspaceMode === 'kanban' ? (
        <SessionRuntimeLane
          tasks={filterAgentTasks(tasks, effectiveSearchQuery)}
          agents={agents}
          activeTaskId={activeTaskId}
          issueByTaskId={linkIndex.issueByTaskId}
          readOnly={readOnly}
          busyTaskId={busyControlTaskId}
          onSelectTask={(taskId) => {
            onSelectTask?.(taskId);
            setWorkspaceMode('thread');
          }}
          onOpenBtw={(taskId) => {
            setBtwContextTaskId(taskId);
            setBtwInitialThreadId(null);
            setBtwOpen(true);
          }}
          onOpenProjectIssue={onOpenProjectIssue}
          onQueueTurn={handleQueueTurn}
          onSteerTask={handleSteerTask}
          onRestartTask={handleRestartTask}
          onSettleTask={handleSettleTask}
          onSnoozeTask={handleSnoozeTask}
          onCompactTask={handleCompactTask}
          onOpenProjectsBoard={onOpenProjectIssue ? () => onOpenProjectIssue() : undefined}
        />
      ) : !showActiveThread ? (
        <div className="flex-1 flex flex-col items-center justify-center w-full py-4 sm:py-8">
          <div className="w-full max-w-[760px] mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight text-[var(--ink)] text-balance">
                今天想让 Agent 完成什么？
              </h1>
              <p className="text-[13.5px] text-[var(--ink-muted)] text-pretty">
                支持自然语言任务、/ 斜杠命令与 @agent 多设备节点协同调度
              </p>
            </div>

            {nodeGroups.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2.5 border-y border-[var(--border-subtle)] text-[12px]">
                {nodeGroups.map((group) => (
                  <div key={group.nodeId} className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--ink-subtle)]">
                      <Server className="size-3" strokeWidth={1.75} />
                      {group.nodeName}
                    </span>
                    <span className="text-[var(--ink-subtle)]" aria-hidden="true">
                      /
                    </span>
                    <div className="inline-flex flex-wrap items-center gap-2">
                      {group.agents.map((peer) => {
                        const online = isAgentOnline(peer.status);
                        const isPicked = selectedTarget === peer.id;
                        return (
                          <button
                            key={peer.id}
                            type="button"
                            onClick={() => {
                              setSelectedTarget(isPicked ? 'auto' : peer.id);
                              focusComposer();
                            }}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[12px] transition-colors cursor-pointer',
                              isPicked
                                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                                : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
                              FOCUS_RING,
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full shrink-0',
                                online ? 'bg-[var(--ok-dot)]' : 'bg-[var(--muted-dot)]',
                              )}
                            />
                            <span>{shortAgentName(peer.name)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {renderComposer(false)}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STARTER_SUGGESTIONS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    if (item.executeImmediately) {
                      void executeRawInput(item.prompt);
                    } else {
                      setPrompt(item.prompt);
                      focusComposer();
                    }
                  }}
                  className={cn(
                    'group rounded-xl border border-[var(--border)] bg-[var(--surface)]/75 hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] px-3.5 py-3 text-left transition-colors active:scale-[0.99] cursor-pointer',
                    FOCUS_RING,
                  )}
                >
                  <div className="font-mono text-[12px] font-medium text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                    {item.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--ink-muted)] text-pretty">
                    {item.detail}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-[820px] w-full mx-auto flex flex-col justify-between gap-6">
          <div className="space-y-6" data-testid="agent-thread-stream">
            {activeTask && (
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0 text-[12px] font-mono text-[var(--ink-subtle)] tabular-nums">
                  <StatusIndicator
                    status={taskStatusTone(activeTask.state)}
                    label={taskStatusLabel(activeTask.state)}
                  />
                  <span aria-hidden="true">·</span>
                  <span className="text-[var(--ink-muted)] truncate">
                    {shortAgentName(activeTask.workerAgentName || activeTask.leadAgentName)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeTask.workerNodeId}</span>
                  {activeTask.contextId && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[180px]">{activeTask.contextId}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{threadTasks.length} 轮对话</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!readOnly && (
                    <select
                      aria-label="切换当前任务状态"
                      disabled={movingTaskId === activeTask.id}
                      value={taskStateToKanbanColumn(activeTask.state)}
                      onChange={(event) => {
                        const nextCol = event.target.value as KanbanLifecycleColumnId;
                        void handleMoveTaskState(activeTask.id, kanbanColumnToTaskState(nextCol));
                      }}
                      className={cn(
                        'h-7 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 font-mono text-[11.5px] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)] cursor-pointer transition-colors',
                        FOCUS_RING,
                      )}
                    >
                      {KANBAN_LIFECYCLE_COLUMNS.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.label} · {col.subtitle}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWorkspaceMode('kanban')}
                  >
                    <KanbanSquare className="size-3.5" strokeWidth={1.75} />
                    看板
                  </Button>
                </div>
              </div>
            )}

            {threadTasks.map((task) => {
              const isTaskRunning = task.state === 'working' || task.state === 'submitted';
              const traceExpanded =
                expandedTraces[task.id] !== undefined
                  ? expandedTraces[task.id]
                  : isTaskRunning;
              const latestStep =
                task.steps && task.steps.length > 0 ? task.steps[task.steps.length - 1] : null;
              const artifactBlocks = task.artifact ? splitArtifactBlocks(task.artifact) : [];
              const isActiveTurn = task.id === activeTask?.id;

              return (
                <div key={task.id} className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl bg-[var(--surface-active)] border border-[var(--border)] px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                        <span>{task.slashCommand ? `命令 ${task.slashCommand}` : '指令'}</span>
                        <span>{formatDateTime(task.createdAt)}</span>
                      </div>
                      <p className="text-[14px] leading-relaxed text-[var(--ink)] whitespace-pre-wrap break-words">
                        {task.prompt}
                      </p>
                    </div>
                  </div>

                  <div
                    data-testid={
                      isActiveTurn ? 'agent-thread-response' : `agent-thread-response-${task.id}`
                    }
                    className="space-y-3.5 text-[14px] leading-relaxed text-[var(--ink)]"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                      <StatusIndicator
                        status={taskStatusTone(task.state)}
                        label={taskStatusLabel(task.state)}
                      />
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[var(--ink)]">
                        {shortAgentName(task.workerAgentName || task.leadAgentName)}
                      </span>
                      <span>({task.workerNodeId})</span>
                      {task.appliedModel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[var(--ink-muted)]">
                            {task.appliedModel}
                            {task.modelSource === 'magpie-agent'
                              ? ' [Magpie]'
                              : task.modelSource === 'manual'
                                ? ' [指定]'
                                : ''}
                          </span>
                        </>
                      )}
                      {task.appliedEffort && (
                        <>
                          <span aria-hidden="true">/</span>
                          <span>{task.appliedEffort}</span>
                        </>
                      )}
                      {task.signed && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            title={`HMAC-SHA256 已签名 · keyId: ${task.signatureKeyId || 'default'}`}
                            className="inline-flex items-center gap-1 text-[var(--ok)]"
                          >
                            <ShieldCheck className="size-3 shrink-0" strokeWidth={1.75} />
                            <span>已签名</span>
                          </span>
                        </>
                      )}
                      {task.executionMode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{modeDisplayLabel(task.executionMode)}</span>
                        </>
                      )}
                      {task.worktreeBranch && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-[var(--ink-muted)]">
                            <GitBranch className="size-3" strokeWidth={1.75} />
                            {task.worktreeBranch}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{formatDurationMs(task.durationMs)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.id}</span>
                    </div>

                    {task.steps && task.steps.length > 0 && (
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/45 overflow-hidden">
                        <button
                          type="button"
                          data-testid={`agent-step-trace-toggle-${task.id}`}
                          aria-expanded={traceExpanded}
                          onClick={() =>
                            setExpandedTraces((prev) => ({
                              ...prev,
                              [task.id]: !traceExpanded,
                            }))
                          }
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
                            FOCUS_RING,
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {traceExpanded ? (
                              <ChevronDown
                                className="size-3.5 text-[var(--ink-subtle)] shrink-0"
                                strokeWidth={1.75}
                              />
                            ) : (
                              <ChevronRight
                                className="size-3.5 text-[var(--ink-subtle)] shrink-0"
                                strokeWidth={1.75}
                              />
                            )}
                            <span className="font-mono text-[11.5px] font-medium text-[var(--ink-muted)] tabular-nums shrink-0">
                              执行轨迹 · {task.steps.length} 步
                            </span>
                            {!traceExpanded && latestStep && (
                              <span className="text-[12px] text-[var(--ink-subtle)] truncate">
                                {latestStep.detail || latestStep.state}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-[var(--ink-subtle)] shrink-0">
                            {traceExpanded ? '收起' : '展开'}
                          </span>
                        </button>

                        {traceExpanded && (
                          <ol className="px-3.5 pb-3 pt-1 space-y-2 border-t border-[var(--border-subtle)]">
                            {task.steps.map((step, idx) => {
                              const stepTone = taskStatusTone(step.state);
                              const dotClass =
                                stepTone === 'healthy'
                                  ? 'bg-[var(--ok-dot)]'
                                  : stepTone === 'degraded'
                                    ? 'bg-[var(--warn-dot)]'
                                    : stepTone === 'failed'
                                      ? 'bg-[var(--err-dot)]'
                                      : 'bg-[var(--muted-dot)]';
                              return (
                                <li
                                  key={`${task.id}-step-${idx}`}
                                  className="relative pl-4 flex items-baseline justify-between gap-3 text-[12.5px]"
                                >
                                  <span
                                    className={cn(
                                      'absolute left-0 top-[7px] h-1.5 w-1.5 rounded-full',
                                      dotClass,
                                    )}
                                    aria-hidden="true"
                                  />
                                  <div className="min-w-0 flex-1 text-[var(--ink-muted)] break-words">
                                    <span className="font-mono text-[11px] text-[var(--ink-subtle)] mr-2">
                                      [{step.state}]
                                    </span>
                                    <span>{step.detail || step.state}</span>
                                  </div>
                                  <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                                    {formatClock(step.ts)}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </div>
                    )}

                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="border-y border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                        {task.subtasks.map((sub) => (
                          <div
                            key={sub.id}
                            className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[12.5px]"
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                              <StatusIndicator
                                status={taskStatusTone(sub.state)}
                                label={shortAgentName(sub.agentName)}
                              />
                              <span className="font-mono text-[11px] text-[var(--ink-subtle)]">
                                {sub.role} · {sub.model}/{sub.effort}
                              </span>
                              {sub.worktree && (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--ink-subtle)]">
                                  <GitBranch className="size-3" strokeWidth={1.75} />
                                  {sub.worktree}
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-[var(--ink-muted)] sm:text-right break-words">
                              {sub.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {task.dshReview && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/35 px-3.5 py-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                          <div className="flex items-center gap-2 font-medium text-[var(--ink)]">
                            <ShieldCheck
                              className="size-4 text-[var(--ok-dot)] shrink-0"
                              strokeWidth={1.75}
                            />
                            <span>DSH 专家会审 · {shortAgentName(task.dshReview.reviewerName)}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[12px] tabular-nums">
                            <span className="font-semibold text-[var(--ink)]">
                              {task.dshReview.score}/100
                            </span>
                            <span aria-hidden="true" className="text-[var(--ink-subtle)]">
                              ·
                            </span>
                            <span
                              className={cn(
                                task.dshReview.verdict === 'approve'
                                  ? 'text-[var(--ok)]'
                                  : task.dshReview.verdict === 'block'
                                    ? 'text-[var(--err)]'
                                    : 'text-[var(--warn)]',
                              )}
                            >
                              {task.dshReview.verdict}
                            </span>
                          </div>
                        </div>
                        {task.dshReview.dimensions && task.dshReview.dimensions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                            {task.dshReview.dimensions.map((dim, idx) => (
                              <React.Fragment key={`${task.id}-dim-${dim.name}`}>
                                {idx > 0 && <span aria-hidden="true">·</span>}
                                <span>
                                  {dim.name} {dim.score}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                        {task.dshReview.findings && task.dshReview.findings.length > 0 && (
                          <ul className="space-y-1 text-[12.5px] text-[var(--ink-muted)] list-disc pl-4">
                            {task.dshReview.findings.map((finding, idx) => (
                              <li key={`${task.id}-finding-${idx}`}>{finding}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {task.artifact ? (
                      (() => {
                        const previewInfo = formatInlineOutputPreview(task.artifact);
                        const isArtifactExpanded = Boolean(expandedArtifacts[task.id]);
                        const displayBlocks =
                          previewInfo.truncated && !isArtifactExpanded
                            ? splitArtifactBlocks(previewInfo.preview)
                            : artifactBlocks;
                        return (
                          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 space-y-3">
                            {displayBlocks.map((block, idx) =>
                              block.kind === 'code' ? (
                                <div key={`${task.id}-blk-${idx}`} className="space-y-1">
                                  {block.lang && (
                                    <div className="font-mono text-[10.5px] uppercase tracking-wide text-[var(--ink-subtle)]">
                                      {block.lang}
                                    </div>
                                  )}
                                  <pre className="rounded-lg bg-[var(--terminal-bg)] text-[var(--terminal-ink)] p-3 font-mono text-[12px] leading-relaxed overflow-x-auto">
                                    <code>{block.content}</code>
                                  </pre>
                                </div>
                              ) : (
                                <div
                                  key={`${task.id}-blk-${idx}`}
                                  className="text-[13.5px] leading-relaxed text-[var(--ink)] whitespace-pre-wrap break-words font-mono"
                                >
                                  {block.content}
                                </div>
                              ),
                            )}
                            {(previewInfo.truncated || (task.outputSpills && task.outputSpills.length > 0)) && (
                              <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11.5px] font-mono text-[var(--ink-subtle)] tabular-nums">
                                <span>
                                  {previewInfo.truncated && !isArtifactExpanded
                                    ? `已截断预览 · 省略 ${previewInfo.omittedChars} 字符`
                                    : `共 ${previewInfo.totalChars} 字符`}
                                  {task.outputSpills && task.outputSpills.length > 0
                                    ? ` · ${task.outputSpills.length} 个 Spill 产物`
                                    : ''}
                                </span>
                                <div className="flex items-center gap-2">
                                  {previewInfo.truncated && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedArtifacts((prev) => ({
                                          ...prev,
                                          [task.id]: !isArtifactExpanded,
                                        }))
                                      }
                                      className={cn(
                                        'text-[var(--accent)] hover:underline cursor-pointer',
                                        FOCUS_RING,
                                      )}
                                    >
                                      {isArtifactExpanded ? '收起预览' : '展开全部'}
                                    </button>
                                  )}
                                  {task.outputSpills && task.outputSpills.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setContextRailOpen(true)}
                                      className={cn(
                                        'text-[var(--accent)] hover:underline cursor-pointer',
                                        FOCUS_RING,
                                      )}
                                    >
                                      右侧栏查看 Spill
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : isTaskRunning ? (
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-[13px] text-[var(--ink-muted)] flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[var(--warn-dot)] animate-pulse" />
                        <span>正在通过 Google A2A 协议执行任务，轨迹实时回传中...</span>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px] text-[var(--ink-subtle)]">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleCopyArtifact(task)}
                          className={cn(
                            'inline-flex items-center gap-1 h-7 px-2 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors cursor-pointer',
                            FOCUS_RING,
                          )}
                        >
                          {copiedTaskId === task.id ? (
                            <Check className="size-3.5 text-[var(--ok)]" strokeWidth={1.75} />
                          ) : (
                            <Copy className="size-3.5" strokeWidth={1.75} />
                          )}
                          复制输出
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectTask?.(task.id);
                            focusComposer();
                          }}
                          className={cn(
                            'inline-flex items-center gap-1 h-7 px-2 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors cursor-pointer',
                            FOCUS_RING,
                          )}
                        >
                          <MessageSquare className="size-3.5" strokeWidth={1.75} />
                          追问
                        </button>

                        {!readOnly && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() =>
                              void dispatchTaskPayload({
                                promptText: task.prompt,
                                targetAgentId: task.workerAgentId,
                                mode: VALID_COMPOSER_MODES.has(
                                  task.executionMode as ComposerExecutionMode,
                                )
                                  ? (task.executionMode as ComposerExecutionMode)
                                  : executionMode,
                                worktree: task.worktreeBranch || undefined,
                                slashCommand: task.slashCommand || undefined,
                              })
                            }
                            className={cn(
                              'inline-flex items-center gap-1 h-7 px-2 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-45',
                              FOCUS_RING,
                            )}
                          >
                            <RotateCcw className="size-3.5" strokeWidth={1.75} />
                            重跑
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setWorkspaceMode('kanban')}
                          className={cn(
                            'inline-flex items-center gap-1 h-7 px-2 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors cursor-pointer',
                            FOCUS_RING,
                          )}
                        >
                          <KanbanSquare className="size-3.5" strokeWidth={1.75} />
                          运行泳道
                        </button>

                        {(() => {
                          const linkedIssue = linkIndex.issueByTaskId.get(task.id);
                          if (!linkedIssue || !onOpenProjectIssue) return null;
                          return (
                            <button
                              type="button"
                              data-testid={`task-open-issue-${task.id}`}
                              onClick={() => onOpenProjectIssue(linkedIssue.id)}
                              className={cn(
                                'inline-flex items-center gap-1 h-7 px-2 rounded-md font-mono text-[var(--accent)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
                                FOCUS_RING,
                              )}
                            >
                              {linkedIssue.identifier}
                            </button>
                          );
                        })()}

                        {(() => {
                          const taskBtw = countBtwAttention(btwThreads, { taskId: task.id });
                          return (
                            <button
                              type="button"
                              data-testid={`task-open-btw-${task.id}`}
                              onClick={() => {
                                setBtwContextTaskId(task.id);
                                setBtwInitialThreadId(null);
                                setBtwOpen(true);
                              }}
                              className={cn(
                                'inline-flex items-center gap-1 h-7 px-2 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors cursor-pointer',
                                taskBtw.attentionCount > 0 && 'text-[var(--warn)]',
                                FOCUS_RING,
                              )}
                            >
                              <GitBranch className="size-3.5" strokeWidth={1.75} />
                              <span>BTW 侧聊</span>
                              {taskBtw.total > 0 && (
                                <span className="font-mono text-[11px] tabular-nums">
                                  ({taskBtw.attentionCount > 0 ? `${taskBtw.attentionCount} 待审` : taskBtw.total})
                                </span>
                              )}
                            </button>
                          );
                        })()}

                        {isTaskRunning && !readOnly && (
                          <button
                            type="button"
                            disabled={cancelingTaskId === task.id}
                            onClick={() => void handleCancelTask(task.id)}
                            className={cn(
                              'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[var(--err)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-45',
                              FOCUS_RING,
                            )}
                          >
                            <Square className="size-3" strokeWidth={2} />
                            停止
                          </button>
                        )}
                      </div>

                      {!readOnly && (
                        <select
                          aria-label={`更新任务 ${task.id} 状态`}
                          disabled={movingTaskId === task.id}
                          value={taskStateToKanbanColumn(task.state)}
                          onChange={(event) => {
                            const nextCol = event.target.value as KanbanLifecycleColumnId;
                            void handleMoveTaskState(task.id, kanbanColumnToTaskState(nextCol));
                          }}
                          className={cn(
                            'h-6 rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 font-mono text-[11px] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)] cursor-pointer transition-colors',
                            FOCUS_RING,
                          )}
                        >
                          {KANBAN_LIFECYCLE_COLUMNS.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {systemCards.map(renderSystemCard)}
          </div>

          <div className="sticky bottom-0 pt-2 pb-1 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent">
            {renderComposer(true)}
          </div>
        </div>
      )}
        </div>

        <ContextRailHost
          open={contextRailOpen}
          onOpenChange={setContextRailOpen}
          context={{
            sessionId: activeTask?.contextId || null,
            taskId: activeTask?.id || null,
            ticketId: activeLinkedIssue?.identifier || null,
            workerId: activeTask?.workerAgentId || null,
            nodeId: activeTask?.workerNodeId || (selectedNodeId !== 'all' ? selectedNodeId : null),
            task: activeTask,
            linkedIssue: activeLinkedIssue,
          }}
          readOnly={readOnly}
          busyAction={busyControlTaskId}
          onCompactTask={(taskId) => void handleCompactTask(taskId)}
          onSettleTask={(taskId) => void handleSettleTask(taskId)}
          onSnoozeTask={(taskId, minutes) => void handleSnoozeTask(taskId, minutes)}
          onOpenProjectIssue={onOpenProjectIssue}
          onOpenBtw={(taskId) => {
            setBtwContextTaskId(taskId);
            setBtwInitialThreadId(null);
            setBtwOpen(true);
          }}
          onToast={onToast}
        />
      </div>

      <AgentBtwDrawer
        open={btwOpen}
        onClose={() => setBtwOpen(false)}
        threads={btwThreads}
        agents={agents}
        sessions={a2aState?.sessions || []}
        activeSession={btwDrawerSession}
        activeTask={btwDrawerTask}
        initialThreadId={btwInitialThreadId}
        readOnly={readOnly}
        onRefresh={async () => {
          await loadState();
        }}
        onToast={onToast}
      />
    </div>
  );
}

export default AgentsView;
