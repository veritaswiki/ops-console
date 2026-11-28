import React from 'react';
import { Drawer } from 'vaul';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Crown,
  GitBranch,
  Layers,
  Plus,
  Radar,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type {
  A2AAgentPeer,
  A2ASessionRecord,
  A2ASkillCatalogItem,
  A2AStateResponse,
  DynamicModelCatalogResponse,
  FleetMcpServer,
  OrchestrationMode,
  ReasoningEffort,
  SnapshotResponse,
  ToastHandler,
} from '../types';
import {
  cancelA2ATask,
  createA2ASession,
  deleteA2AAgent,
  deleteA2ARoutingRule,
  deleteA2ASkill,
  discoverA2AAgent,
  discoverLocalA2AAgents,
  dispatchA2ATask,
  fetchA2AState,
  fetchMcps,
  fetchModelCatalog,
  handoffA2ASession,
  registerA2AAgent,
  saveA2ATopologyPositions,
  setLeadA2AAgent,
  syncA2ASession,
  updateA2AAgent,
  updateA2AOrchestrationConfig,
  updateA2ASkill,
  upsertA2ARoutingRule,
  upsertA2ASkill,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { countBtwAttention } from '../lib/btw';
import {
  getModelsForNodeAgent,
  getOnlineNodeOptions,
} from '../lib/model-catalog';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import { formatRelativeAge, taskStateLabel } from '../utils/format';
import { AgentBtwDrawer } from './AgentBtwDrawer';
import { EFFORT_OPTIONS, MODEL_PRESETS } from './AgentOrchestrationCanvas';
import {
  Button,
  CommandCombobox,
  EmptyState,
  inputBaseClass,
  KpiStrip,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  WidgetSkeleton,
  type CommandComboboxOption,
  type ConfirmModalState,
} from './ui';

const AgentOrchestrationCanvas = React.lazy(() =>
  import('./AgentOrchestrationCanvas').then((m) => ({ default: m.AgentOrchestrationCanvas })),
);

const STUDIO_TABS = [
  { value: 'canvas', label: '可视化编排与调度' },
  { value: 'agents', label: 'Agent 与自动发现' },
  { value: 'skills', label: 'Skill 与 DSH 专家' },
  { value: 'sessions', label: '多端会话同步' },
] as const;

type StudioTab = (typeof STUDIO_TABS)[number]['value'];

const HARNESS_OPTIONS = [
  { value: 'codex-cli', label: 'Codex CLI' },
  { value: 'pi-agent', label: 'Pi Coding Agent' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'gemini-cli', label: 'Gemini CLI / Antigravity' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'dsh-expert', label: 'DSH 专家评审插件' },
  { value: 'langgraph', label: 'LangGraph' },
  { value: 'crewai', label: 'CrewAI' },
  { value: 'custom-a2a', label: 'Custom A2A Agent' },
] as const;

const SKILL_PROVIDERS = [
  { value: 'dsh-plugin', label: 'DSH 插件' },
  { value: 'pi-skill', label: 'Pi Skill' },
  { value: 'codex-skill', label: 'Codex Skill' },
  { value: 'claude-skill', label: 'Claude Skill' },
  { value: 'a2a-card', label: 'A2A Card Skill' },
] as const;

const SYNC_MODE_OPTIONS = [
  { value: 'a2a-context-bus', label: 'A2A Context Bus (contextId 实时广播)' },
  { value: 'nmem-shared', label: 'NMEM 共享语义记忆桥' },
  { value: 'git-worktree', label: 'Git Worktree 分支镜像同步' },
] as const;

const TASK_PRESETS = [
  {
    label: 'Pi 极速脚本修缮',
    mode: 'lead-router' as OrchestrationMode,
    prompt: '请路由给 Pi 快速修复本地 lint 脚本并整理格式化配置（低思考强度即可）。',
    requireDshReview: false,
  },
  {
    label: 'Swarm 蜂群重构 + DSH 会审',
    mode: 'swarm' as OrchestrationMode,
    prompt: '使用自动蜂群拆分前端组件与后端接口重构，在独立 Worktree 并行执行并通过 DSH 专家评审门禁。',
    requireDshReview: true,
  },
  {
    label: '法兰克福安全与 TLS 审计',
    mode: 'lead-router' as OrchestrationMode,
    prompt: '委派法兰克福中继 VPS 审计 nftables 公网端口与欧洲 DERP 延迟并输出安全结论。',
    requireDshReview: true,
  },
] as const;

function modeLabel(mode?: string): string {
  if (mode === 'swarm') return '自动蜂群 Swarm';
  if (mode === 'main-sub') return '主子模型分层';
  return '主控路由';
}

function taskStateStatus(state: string): string {
  if (state === 'completed') return 'healthy';
  if (state === 'working' || state === 'submitted' || state === 'reviewing') return 'degraded';
  if (state === 'failed') return 'failed';
  return 'standby';
}

export function A2AOrchestratorSection({
  snapshot,
  readOnly,
  onSnapshotChanged,
  onToast,
  onConfirm,
  modelCatalog = null,
  catalogRevision = 0,
}: {
  snapshot: SnapshotResponse | null;
  readOnly: boolean;
  onSnapshotChanged: () => void;
  onToast: ToastHandler;
  onConfirm: (modal: ConfirmModalState) => void;
  modelCatalog?: DynamicModelCatalogResponse | null;
  catalogRevision?: number;
}) {
  const fleetNodes = snapshot?.fleet?.nodes || [];

  const [studioTab, setStudioTab] = React.useState<StudioTab>('canvas');
  const [state, setState] = React.useState<A2AStateResponse | null>(null);
  const [fleetMcps, setFleetMcps] = React.useState<FleetMcpServer[]>([]);
  const [internalCatalog, setInternalCatalog] = React.useState<DynamicModelCatalogResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busyKey, setBusyKey] = React.useState('');
  const [selectedLeadDraft, setSelectedLeadDraft] = React.useState('');

  // Task dispatch form
  const [prompt, setPrompt] = React.useState('');
  const [targetAgentId, setTargetAgentId] = React.useState('auto');
  const [dispatchMode, setDispatchMode] = React.useState<'inherit' | OrchestrationMode>('inherit');
  const [effortOverride, setEffortOverride] = React.useState<'auto' | ReasoningEffort>('auto');
  const [sessionId, setSessionId] = React.useState('');
  const [requireDshReview, setRequireDshReview] = React.useState(false);
  const [dispatchBusy, setDispatchBusy] = React.useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = React.useState<Record<string, boolean>>({});
  const [editingMcpAgentId, setEditingMcpAgentId] = React.useState<string>('');

  // Handoff draft per session
  const [handoffDrafts, setHandoffDrafts] = React.useState<Record<string, string>>({});

  // Register external A2A agent drawer
  const [regOpen, setRegOpen] = React.useState(false);
  const [regBusy, setRegBusy] = React.useState(false);
  const [regForm, setRegForm] = React.useState({
    name: '',
    harness: 'pi-agent',
    nodeId: 'workstation-mac',
    agentCardUrl: 'http://100.64.0.45:9106/.well-known/agent-card.json',
    rpcUrl: '',
    modelHint: 'claude-sonnet-4-6',
    reasoningEffort: 'medium' as ReasoningEffort,
    skills: 'fast-edit, terminal-ops',
    setAsLead: false,
    description: '',
  });

  // Add Skill form
  const [skillOpen, setSkillOpen] = React.useState(false);
  const [skillForm, setSkillForm] = React.useState({
    name: '',
    version: '1.0.0',
    provider: 'dsh-plugin',
    description: '',
  });

  // New Aligned Session form
  const [sessionOpen, setSessionOpen] = React.useState(false);
  const [btwSessionId, setBtwSessionId] = React.useState<string | null>(null);
  const [sessionForm, setSessionForm] = React.useState({
    title: '',
    syncMode: 'a2a-context-bus',
    gitBranch: '',
    primaryAgentId: '',
  });

  const effectiveCatalog = modelCatalog ?? internalCatalog;

  React.useEffect(() => {
    if (modelCatalog) return;
    const controller = new AbortController();
    let cancelled = false;
    fetchModelCatalog(controller.signal)
      .then((response) => {
        if (!cancelled) setInternalCatalog(response);
      })
      .catch(() => {
        if (!cancelled) setInternalCatalog(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [catalogRevision, modelCatalog]);

  const registrationModelOptions = React.useMemo<CommandComboboxOption[]>(() => {
    const options: CommandComboboxOption[] = [];
    const seen = new Set<string>();
    for (const node of getOnlineNodeOptions(effectiveCatalog)) {
      const groupLabel = `${node.name || node.nodeId} · ${node.deviceType || 'node'}`;
      for (const model of getModelsForNodeAgent(effectiveCatalog, node.nodeId, null)) {
        if (!model?.id || seen.has(model.id)) continue;
        seen.add(model.id);
        options.push({
          value: model.id,
          label: model.displayName || model.id,
          group: groupLabel,
          description: [model.provider, model.category].filter(Boolean).join(' · '),
          meta: model.contextWindow
            ? `${Math.round(model.contextWindow / 1000)}k ctx`
            : undefined,
          keywords: [model.id, model.provider, model.sourceKind, model.nodeName],
        });
      }
    }
    return options;
  }, [effectiveCatalog]);

  const loadAll = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const [a2aRes, mcpRes] = await Promise.all([
        fetchA2AState(signal),
        fetchMcps('', signal).catch(() => null),
      ]);
      if (!signal?.aborted) {
        setState(a2aRes);
        setSelectedLeadDraft(a2aRes.leadAgentId || '');
        if (mcpRes?.items) setFleetMcps(mcpRes.items);
      }
    } catch (err) {
      if (!signal?.aborted) {
        onToast(`加载 Agent 编排状态失败：${(err as Error).message}`, 'err');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onToast]);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadAll(controller.signal);
    return () => controller.abort();
  }, [loadAll]);

  const handleSetLead = async (agentId: string) => {
    if (!agentId) return;
    if (guardReadOnly(readOnly, onToast, '切换默认主助手')) return;
    const prevLeadId = state?.leadAgentId || '';
    const prevLeadName = state?.agents.find((a) => a.id === prevLeadId)?.name || prevLeadId;
    setBusyKey(`lead:${agentId}`);
    try {
      const res = await setLeadA2AAgent(agentId);
      await loadAll();
      onSnapshotChanged();
      onToast(
        `已将「${res.leadAgent?.name || agentId}」设为默认主助手`,
        'ok',
        prevLeadId && prevLeadId !== agentId
          ? {
              action: {
                label: '撤销',
                onClick: async () => {
                  try {
                    await setLeadA2AAgent(prevLeadId);
                    await loadAll();
                    onSnapshotChanged();
                    onToast(`已恢复默认主助手为「${prevLeadName}」`, 'info');
                  } catch (undoErr) {
                    onToast(extractErrorMessage(undoErr, '恢复默认主助手失败'), 'err');
                  }
                },
              },
            }
          : undefined,
      );
    } catch (err) {
      onToast(extractErrorMessage(err, '切换主助手失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const handleUpdateConfig = async (patch: Record<string, unknown>) => {
    if (guardReadOnly(readOnly, onToast, '修改调度策略')) return;
    try {
      await updateA2AOrchestrationConfig(patch);
      await loadAll();
      onToast('调度策略已更新并保存', 'ok');
    } catch (err) {
      onToast(extractErrorMessage(err, '更新策略失败'), 'err');
    }
  };

  const handleSavePositions = async (positions: Record<string, { x: number; y: number }>) => {
    if (readOnly) return;
    try {
      await saveA2ATopologyPositions(positions);
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '保存画布布局失败'), 'err');
    }
  };

  const handleUpsertRule = async (payload: Parameters<typeof upsertA2ARoutingRule>[0]) => {
    if (guardReadOnly(readOnly, onToast, '保存路由规则')) return;
    try {
      const res = await upsertA2ARoutingRule(payload);
      onToast(`已保存路由策略「${res.rule.name}」（${res.rule.targetModel} · ${res.rule.reasoningEffort}）`, 'ok');
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '保存路由规则失败'), 'err');
    }
  };

  const handleDeleteRule = async (ruleId: string): Promise<void> => {
    if (guardReadOnly(readOnly, onToast, '删除路由规则')) return;
    const rule = routingRules.find((r) => r.id === ruleId);
    onConfirm({
      open: true,
      title: `移除路由规则${rule?.name ? `「${rule.name}」` : ''}？`,
      description: '移除后匹配该条件的任务将交由默认主助手自动路由。',
      confirmLabel: '确认移除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteA2ARoutingRule(ruleId);
          onToast('已移除该路由规则', 'info');
          await loadAll();
        } catch (err) {
          onToast(extractErrorMessage(err, '移除路由规则失败'), 'err');
        }
      },
    });
  };

  const handleDiscoverLocal = async () => {
    setBusyKey('discover-local');
    try {
      const res = await discoverLocalA2AAgents();
      const outdated = res.items.filter((i) => i.updateAvailable).length;
      onToast(
        `扫描完成：发现 ${res.discoveredCount} 个本机助手（新接入 ${res.newlyRegistered} 个${outdated > 0 ? `，${outdated} 个有新版本` : ''}）`,
        'ok',
      );
      await loadAll();
      onSnapshotChanged();
    } catch (err) {
      onToast(extractErrorMessage(err, '自动发现失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const handleDiscover = async (agent: A2AAgentPeer) => {
    setBusyKey(`discover:${agent.id}`);
    try {
      const res = await discoverA2AAgent(agent.id);
      if (res.ok) {
        onToast(`${agent.name}：${res.summary || '连通性检查通过'}`, 'ok');
      } else {
        onToast(`${agent.name} 探活失败：${res.error || '服务暂不可达'}`, 'err');
      }
      await loadAll();
      onSnapshotChanged();
    } catch (err) {
      onToast(extractErrorMessage(err, '助手探活失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const handleUpdateAgent = async (
    agentId: string,
    patch: Parameters<typeof updateA2AAgent>[1],
  ) => {
    if (guardReadOnly(readOnly, onToast, '修改助手配置')) return;
    setBusyKey(`agent:${agentId}`);
    try {
      await updateA2AAgent(agentId, patch);
      await loadAll();
      onSnapshotChanged();
      onToast('助手参数已更新', 'ok');
    } catch (err) {
      onToast(extractErrorMessage(err, '更新助手参数失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const handleToggleBoundMcp = async (agent: A2AAgentPeer, mcpId: string) => {
    if (guardReadOnly(readOnly, onToast, '调整助手工具绑定')) return;
    const has = agent.boundMcpIds.includes(mcpId);
    const next = has
      ? agent.boundMcpIds.filter((id) => id !== mcpId)
      : [...agent.boundMcpIds, mcpId];
    await handleUpdateAgent(agent.id, { boundMcpIds: next });
  };

  const handleDeleteAgent = (agent: A2AAgentPeer) => {
    if (guardReadOnly(readOnly, onToast, '移除助手')) return;
    onConfirm({
      open: true,
      title: `移除助手：${agent.name}`,
      description: `将从调度网络移除 ${agent.nodeName} 上的 ${agent.harness} 接入点，不会停止该节点本地进程。`,
      confirmLabel: '确认移除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteA2AAgent(agent.id);
          onToast(`已移除 ${agent.name}`, 'ok');
          await loadAll();
          onSnapshotChanged();
        } catch (err) {
          onToast(extractErrorMessage(err, '移除助手失败'), 'err');
        }
      },
    });
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '派发任务')) return;
    if (!prompt.trim()) {
      onToast('请输入需要派发的任务内容', 'err');
      return;
    }
    setDispatchBusy(true);
    try {
      const res = await dispatchA2ATask({
        prompt: prompt.trim(),
        targetAgentId,
        executionMode: dispatchMode === 'inherit' ? undefined : dispatchMode,
        reasoningEffort: effortOverride === 'auto' ? undefined : effortOverride,
        requireDshReview: requireDshReview || undefined,
        sessionId: sessionId || undefined,
      });
      const t = res.task;
      onToast(
        `任务已派发给 ${t.workerAgentName}（${t.appliedModel || '自动选模'} · ${t.appliedEffort || '中等'}）${t.dshReview ? ` · 评审 ${t.dshReview.score} 分` : ''}`,
        t.state === 'failed' ? 'err' : 'ok',
      );
      setPrompt('');
      setExpandedTaskIds((prev) => ({ ...prev, [t.id]: true }));
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '任务派发失败'), 'err');
    } finally {
      setDispatchBusy(false);
    }
  };

  const handleTriggerDshReview = async () => {
    if (guardReadOnly(readOnly, onToast, '触发专家评审')) return;
    setBusyKey('dsh-trial');
    try {
      const dshAgent = agents.find((a) => a.harness === 'dsh-expert');
      const res = await dispatchA2ATask({
        prompt: '对当前跨节点编排变更执行 DSH 多专家评审（架构一致性、安全边界、性能与测试覆盖）。',
        targetAgentId: dshAgent?.id || 'auto',
        executionMode: 'lead-router',
        reasoningEffort: 'xhigh',
        requireDshReview: true,
      });
      onToast(
        `专家评审完成：${res.task.dshReview?.score ?? 92}/100`,
        'ok',
      );
      setStudioTab('canvas');
      setExpandedTaskIds((prev) => ({ ...prev, [res.task.id]: true }));
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '触发评审失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const handleCancelTask = (taskId: string) => {
    if (guardReadOnly(readOnly, onToast, '中止任务')) return;
    onConfirm({
      open: true,
      title: '中止该任务？',
      description: '中止后将立即停止当前执行，已完成的部分上下文会被保留。',
      confirmLabel: '确认中止',
      danger: true,
      onConfirm: async () => {
        try {
          await cancelA2ATask(taskId);
          onToast('已中止任务', 'info');
          await loadAll();
        } catch (err) {
          onToast(extractErrorMessage(err, '中止任务失败'), 'err');
        }
      },
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '接入外部助手')) return;
    setRegBusy(true);
    try {
      const res = await registerA2AAgent({
        name: regForm.name.trim(),
        harness: regForm.harness,
        nodeId: regForm.nodeId,
        agentCardUrl: regForm.agentCardUrl.trim(),
        rpcUrl: regForm.rpcUrl.trim() || undefined,
        modelHint: regForm.modelHint.trim() || undefined,
        skills: regForm.skills,
        setAsLead: regForm.setAsLead,
        description: regForm.description.trim() || undefined,
      });
      onToast(`已接入助手「${res.agent.name}」`, 'ok');
      setRegOpen(false);
      setRegForm((prev) => ({ ...prev, name: '', rpcUrl: '', description: '', setAsLead: false }));
      await loadAll();
      onSnapshotChanged();
    } catch (err) {
      onToast(extractErrorMessage(err, '接入助手失败'), 'err');
    } finally {
      setRegBusy(false);
    }
  };

  const handleAddSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '新增技能')) return;
    if (!skillForm.name.trim()) return;
    setBusyKey('add-skill');
    try {
      const res = await upsertA2ASkill({
        name: skillForm.name.trim(),
        version: skillForm.version.trim() || '1.0.0',
        provider: skillForm.provider,
        description: skillForm.description.trim(),
        assignedAgentIds: state?.leadAgentId ? [state.leadAgentId] : [],
      });
      onToast(`已安装技能「${res.skill.name}」v${res.skill.version}`, 'ok');
      setSkillOpen(false);
      setSkillForm({ name: '', version: '1.0.0', provider: 'dsh-plugin', description: '' });
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '新增技能失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const handleToggleSkillAgent = async (skill: A2ASkillCatalogItem, agentId: string) => {
    if (guardReadOnly(readOnly, onToast, '调整技能绑定')) return;
    try {
      await updateA2ASkill(skill.id, { toggleAgentId: agentId });
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '更新技能绑定失败'), 'err');
    }
  };

  const handleToggleSkillEnabled = async (skill: A2ASkillCatalogItem) => {
    if (guardReadOnly(readOnly, onToast, skill.enabled ? '停用技能' : '启用技能')) return;
    const prevEnabled = skill.enabled;
    const nextEnabled = !prevEnabled;
    try {
      await updateA2ASkill(skill.id, { enabled: nextEnabled });
      await loadAll();
      onToast(`已${nextEnabled ? '启用' : '停用'}技能「${skill.name}」`, 'ok', {
        action: {
          label: '撤销',
          onClick: async () => {
            try {
              await updateA2ASkill(skill.id, { enabled: prevEnabled });
              await loadAll();
              onToast(`已恢复技能「${skill.name}」状态`, 'info');
            } catch (undoErr) {
              onToast(extractErrorMessage(undoErr, '撤销失败'), 'err');
            }
          },
        },
      });
    } catch (err) {
      onToast(extractErrorMessage(err, '切换技能状态失败'), 'err');
    }
  };

  const handleDeleteSkill = (skill: A2ASkillCatalogItem) => {
    if (guardReadOnly(readOnly, onToast, '移除技能')) return;
    onConfirm({
      open: true,
      title: `移除技能「${skill.name}」？`,
      description: '移除后关联助手将不再加载该技能。',
      confirmLabel: '确认移除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteA2ASkill(skill.id);
          onToast(`已移除技能「${skill.name}」`, 'info');
          await loadAll();
        } catch (err) {
          onToast(extractErrorMessage(err, '移除技能失败'), 'err');
        }
      },
    });
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '创建跨端会话')) return;
    if (!sessionForm.title.trim()) return;
    setBusyKey('add-session');
    try {
      const res = await createA2ASession({
        title: sessionForm.title.trim(),
        syncMode: sessionForm.syncMode,
        gitBranch: sessionForm.gitBranch.trim() || undefined,
        primaryAgentId: sessionForm.primaryAgentId || state?.leadAgentId || undefined,
        syncedNodes: fleetNodes.filter((n) => n.status !== 'offline').slice(0, 3).map((n) => n.id),
      });
      onToast(`已创建跨端同步会话「${res.session.title || res.session.contextId}」`, 'ok');
      setSessionOpen(false);
      setSessionForm({ title: '', syncMode: 'a2a-context-bus', gitBranch: '', primaryAgentId: '' });
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '创建会话失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const handleSyncSession = async (sess: A2ASessionRecord) => {
    if (guardReadOnly(readOnly, onToast, '同步会话')) return;
    setBusyKey(`sync:${sess.id}`);
    try {
      const res = await syncA2ASession(sess.id);
      onToast(`会话已完成全端同步（第 ${res.session.revision} 版）`, 'ok');
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '同步会话失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const handleHandoffSession = async (sess: A2ASessionRecord) => {
    if (guardReadOnly(readOnly, onToast, '交接会话')) return;
    const targetId = handoffDrafts[sess.id];
    if (!targetId || targetId === sess.primaryAgentId) return;
    setBusyKey(`handoff:${sess.id}`);
    try {
      const res = await handoffA2ASession(sess.id, targetId);
      const nextAgent = agents.find((a) => a.id === res.session.primaryAgentId);
      onToast(`会话已无损交接给 ${nextAgent?.name || targetId}`, 'ok');
      await loadAll();
    } catch (err) {
      onToast(extractErrorMessage(err, '交接会话失败'), 'err');
    } finally {
      setBusyKey('');
    }
  };

  const agents = state?.agents || [];
  const routingRules = state?.routingRules || [];
  const skillCatalog = state?.skillCatalog || [];
  const sessions = state?.sessions || [];
  const tasks = state?.tasks || [];
  const leadAgent = state?.leadAgent || null;
  const workers = agents.filter((a) => a.id !== state?.leadAgentId);
  const cfg = state?.orchestrationConfig;
  const summary = state?.summary;
  const onlinePct = summary && summary.totalAgents > 0
    ? Math.round((summary.onlineAgents / summary.totalAgents) * 100)
    : 100;

  return (
    <div className="space-y-6" data-testid="a2a-orchestrator-section">
      {summary && (
        <KpiStrip
          asymmetric
          cells={[
            {
              label: '默认主助手',
              meta: `${modeLabel(cfg?.mode)} · ${leadAgent?.harness || '未指定'}`,
              value: leadAgent ? leadAgent.name : '待选定',
              ratioPct: onlinePct,
              sub: `默认主模型 ${cfg?.mainModel || 'gpt-5-codex'}（${cfg?.mainEffort || 'high'}）`,
              tone: leadAgent ? 'ok' : 'warn',
            },
            {
              label: '已接入助手',
              value: `${summary.onlineAgents}/${summary.totalAgents}`,
              numeric: { primary: summary.onlineAgents, denominator: summary.totalAgents },
              sub: summary.outdatedAgents
                ? `${summary.outdatedAgents} 个助手有新版本可升级`
                : `覆盖 ${summary.nodesWithAgents} 台节点与专家插件`,
              tone: summary.outdatedAgents ? 'warn' : 'ok',
            },
            {
              label: '可视化路由与门禁',
              value: `${summary.enabledRules ?? routingRules.filter((r) => r.enabled).length}/${summary.totalRules ?? routingRules.length}`,
              numeric: {
                primary: summary.enabledRules ?? routingRules.filter((r) => r.enabled).length,
                denominator: summary.totalRules ?? routingRules.length,
              },
              sub: cfg?.dshReviewGate?.enabled
                ? `DSH 专家门禁已开启 (≥${cfg.dshReviewGate.minScore}分)`
                : 'DSH 专家门禁按规则触发',
            },
            {
              label: '多端同步会话',
              value: `${summary.syncedSessions ?? 0}/${summary.totalSessions ?? sessions.length}`,
              numeric: {
                primary: summary.syncedSessions ?? 0,
                denominator: summary.totalSessions ?? sessions.length,
              },
              sub: `累计 ${summary.completedTasks}/${summary.totalTasks} 次 A2A/蜂群委派`,
            },
          ]}
        />
      )}

      {/* Workspace Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedFilter
          value={studioTab}
          onChange={setStudioTab}
          options={STUDIO_TABS}
          ariaLabel="切换 Agent 编排工作台"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busyKey === 'discover-local'}
            onClick={() => void handleDiscoverLocal()}
            data-testid="a2a-discover-local-btn"
          >
            <Radar className={cn('size-3.5 text-[var(--accent)]', busyKey === 'discover-local' && 'animate-spin')} />
            {busyKey === 'discover-local' ? '扫描中...' : '自动发现已安装 Agent'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadAll()}
            disabled={loading}
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} strokeWidth={1.75} />
            刷新
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={readOnly}
            onClick={() => setRegOpen(true)}
            data-testid="a2a-register-btn"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            接入外部 Agent
          </Button>
        </div>
      </div>

      {/* ═══ TAB 1: Interactive Draggable Visual Canvas & Multi-Task/Swarm Dispatch ═══ */}
      {studioTab === 'canvas' && (
        <div className="space-y-6">
          <Panel
            title="可视化拖拽编排画布"
            description="自由拖动调整各节点与外部 Harness 拓扑，从节点连线自定义任务路由、目标模型与思考强度（low / medium / high / xhigh），并支持自动蜂群与主子模型分层。"
          >
            {cfg ? (
              <React.Suspense fallback={<WidgetSkeleton heightClass="h-[530px]" label="正在加载 Agent 可视化编排画布" />}>
                <AgentOrchestrationCanvas
                  agents={agents}
                  fleetNodes={fleetNodes}
                  skillCatalog={skillCatalog}
                  routingRules={routingRules}
                  leadAgentId={state?.leadAgentId || null}
                  orchestrationConfig={cfg}
                  readOnly={readOnly}
                  onUpdateConfig={handleUpdateConfig}
                  onSavePositions={handleSavePositions}
                  onUpsertRule={handleUpsertRule}
                  onDeleteRule={handleDeleteRule}
                  onUpdateAgent={(id, patch) => handleUpdateAgent(id, patch)}
                  onSetLead={handleSetLead}
                  onDiscoverAgent={handleDiscover}
                  onToggleSkillAgent={handleToggleSkillAgent}
                />
              </React.Suspense>
            ) : (
              <WidgetSkeleton heightClass="h-[530px]" label="正在加载拓扑编排" />
            )}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Multi-Task / Swarm / Routed Task Dispatcher */}
            <Panel
              className="lg:col-span-5 min-w-0"
              title="主控任务与蜂群派发"
              description="按画布路由规则自动匹配目标 Agent、模型与思考强度，或一键以 Swarm 自动蜂群并行拆解并过 DSH 专家评审。"
            >
              <form onSubmit={handleDispatchSubmit} className="space-y-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                  <span className="text-[var(--ink-subtle)]">快捷场景：</span>
                  {TASK_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setPrompt(preset.prompt);
                        setDispatchMode(preset.mode);
                        setRequireDshReview(preset.requireDshReview);
                      }}
                      className={cn(
                        'text-[var(--accent)] hover:underline cursor-pointer rounded',
                        FOCUS_RING,
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入任务目标（例如：交给 Pi 快速修脚本，或用 Swarm 蜂群重构并由 DSH 专家评审）..."
                  aria-label="A2A 委派任务描述"
                  data-testid="a2a-task-prompt"
                  className={cn('w-full p-3 text-[13px] resize-none', inputBaseClass)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="block space-y-1 text-[12px] min-w-0">
                    <span className="text-[var(--ink-muted)]">目标路由</span>
                    <select
                      value={targetAgentId}
                      onChange={(e) => setTargetAgentId(e.target.value)}
                      aria-label="目标 Worker Agent"
                      className={cn('ui-select w-full min-w-0 h-8 pl-2.5 text-[12px] cursor-pointer truncate', inputBaseClass)}
                    >
                      <option value="auto">按画布路由表自动匹配</option>
                      {agents
                        .filter((a) => a.delegatable || a.id === state?.leadAgentId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            指定：{a.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="block space-y-1 text-[12px] min-w-0">
                    <span className="text-[var(--ink-muted)]">执行模式</span>
                    <select
                      value={dispatchMode}
                      onChange={(e) => setDispatchMode(e.target.value as 'inherit' | OrchestrationMode)}
                      aria-label="执行模式"
                      data-testid="a2a-dispatch-mode"
                      className={cn('ui-select w-full min-w-0 h-8 pl-2.5 text-[12px] cursor-pointer', inputBaseClass)}
                    >
                      <option value="inherit">跟随画布 ({modeLabel(cfg?.mode)})</option>
                      <option value="lead-router">主控路由 (单点精准委派)</option>
                      <option value="swarm">自动蜂群 Swarm (并行拆解)</option>
                      <option value="main-sub">主子模型分层 (规划/执行分离)</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="block space-y-1 text-[12px] min-w-0">
                    <span className="text-[var(--ink-muted)]">思考强度覆盖</span>
                    <select
                      value={effortOverride}
                      onChange={(e) => setEffortOverride(e.target.value as 'auto' | ReasoningEffort)}
                      aria-label="思考强度覆盖"
                      className={cn('ui-select w-full min-w-0 h-8 pl-2.5 text-[12px] cursor-pointer', inputBaseClass)}
                    >
                      <option value="auto">跟随路由规则默认强度</option>
                      {EFFORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1 text-[12px] min-w-0">
                    <span className="text-[var(--ink-muted)]">关联多端会话 (contextId)</span>
                    <select
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      aria-label="关联多端同步会话"
                      className={cn('ui-select w-full min-w-0 h-8 pl-2.5 text-[12px] cursor-pointer truncate', inputBaseClass)}
                    >
                      <option value="">新建独立上下文</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.contextId})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 text-[12.5px] text-[var(--ink)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={requireDshReview}
                      onChange={(e) => setRequireDshReview(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span>强制附加 DSH 专家评审门禁</span>
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="shrink-0"
                    disabled={readOnly || dispatchBusy || !leadAgent}
                    data-testid="a2a-dispatch-btn"
                  >
                    <Send className="size-3.5" strokeWidth={1.75} />
                    {dispatchBusy ? '编排执行中...' : '按策略派发'}
                  </Button>
                </div>
              </form>
            </Panel>

            {/* Right: Multi-Task & Swarm Execution Trace + DSH Expert Verdict */}
            <Panel
              className="lg:col-span-7 min-w-0"
              title="多任务队列、蜂群子任务与 DSH 评审回溯"
              description="实时追踪主控路由命中规则、实际下发的模型与思考强度、并行 Worktree 子任务及 DSH 专家会审结论。"
            >
              {tasks.length === 0 ? (
                <EmptyState message="暂无调度记录，请在左侧输入任务测试可视化路由与蜂群协同。" />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]" data-testid="a2a-task-list">
                  {tasks.slice(0, 8).map((task) => {
                    const expanded = Boolean(expandedTaskIds[task.id]);
                    const canCancel = task.state === 'submitted' || task.state === 'working';
                    return (
                      <li key={task.id} className="py-3.5 first:pt-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTaskIds((prev) => ({ ...prev, [task.id]: !prev[task.id] }))
                            }
                            className={cn(
                              'min-w-0 flex-1 text-left flex items-start gap-1.5 cursor-pointer rounded',
                              FOCUS_RING,
                            )}
                          >
                            {expanded ? (
                              <ChevronDown className="size-3.5 mt-0.5 text-[var(--ink-subtle)] shrink-0" />
                            ) : (
                              <ChevronRight className="size-3.5 mt-0.5 text-[var(--ink-subtle)] shrink-0" />
                            )}
                            <span className="text-[13.5px] font-medium text-[var(--ink)] line-clamp-2">
                              {task.prompt}
                            </span>
                          </button>
                          <StatusIndicator
                            status={taskStateStatus(task.state)}
                            label={taskStateLabel(task.state)}
                          />
                        </div>

                        <div className="pl-5 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-[var(--accent)] font-medium">{modeLabel(task.executionMode)}</span>
                          <span>·</span>
                          <span className="text-[var(--ink-muted)]">{task.leadAgentName}</span>
                          <ArrowRight className="size-3 inline" />
                          <span className="text-[var(--ink-muted)]">{task.workerAgentName}</span>
                          {task.appliedModel && (
                            <>
                              <span>·</span>
                              <span>{task.appliedModel} ({task.appliedEffort || 'med'})</span>
                            </>
                          )}
                          {task.dshReview && (
                            <>
                              <span>·</span>
                              <span className={task.dshReview.verdict === 'approve' ? 'text-[var(--ok)] font-semibold' : 'text-[var(--warn)] font-semibold'}>
                                DSH {task.dshReview.score}/100
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span>{task.durationMs}ms</span>
                          <span>·</span>
                          <span>{formatRelativeAge(task.createdAt)}</span>
                          {canCancel && !readOnly && (
                            <button
                              type="button"
                              onClick={() => void handleCancelTask(task.id)}
                              className="ml-1 text-[var(--err)] hover:underline cursor-pointer"
                            >
                              取消
                            </button>
                          )}
                        </div>

                        {expanded && (
                          <div className="pl-5 pt-2 space-y-3 text-[12px]">
                            <div className="font-mono text-[11px] text-[var(--ink-subtle)] flex flex-wrap gap-x-2 gap-y-0.5">
                              <span>{task.id}</span>
                              {task.contextId && <span>· contextId: {task.contextId}</span>}
                              {task.matchedRuleName && <span>· 命中规则: {task.matchedRuleName}</span>}
                              {task.worktreeBranch && <span>· Worktree: {task.worktreeBranch}</span>}
                            </div>

                            {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                              <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
                                <div className="text-[11.5px] font-semibold text-[var(--ink-muted)]">
                                  蜂群 / 分层并行子任务 ({task.subtasks.length})
                                </div>
                                <div className="space-y-1">
                                  {task.subtasks.map((sub) => (
                                    <div key={sub.id} className="flex flex-wrap items-baseline justify-between gap-2 text-[12px]">
                                      <div className="min-w-0">
                                        <span className="font-medium text-[var(--ink)]">{sub.role}</span>
                                        <span className="mx-1.5 text-[var(--ink-subtle)]">·</span>
                                        <span className="text-[var(--ink-muted)]">{sub.agentName}</span>
                                        <span className="mx-1.5 text-[var(--ink-subtle)]">—</span>
                                        <span className="text-[var(--ink-muted)]">{sub.summary}</span>
                                      </div>
                                      <span className="font-mono text-[11px] text-[var(--ink-subtle)] shrink-0">
                                        {sub.model} · {sub.effort}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {task.dshReview && (
                              <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                                    <ShieldCheck className="size-3.5 text-[var(--ok)]" />
                                    {task.dshReview.reviewerName}
                                  </span>
                                  <span className="font-mono text-[12px] font-semibold text-[var(--ok)] tabular-nums">
                                    综合评分 {task.dshReview.score}/100 · {task.dshReview.verdict.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums">
                                  {task.dshReview.dimensions.map((d) => (
                                    <span key={d.name}>
                                      {d.name}: <strong className="text-[var(--ink)]">{d.score}</strong>
                                    </span>
                                  ))}
                                </div>
                                <ul className="space-y-0.5 text-[var(--ink-muted)]">
                                  {task.dshReview.findings.map((f, i) => (
                                    <li key={i}>• {f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <ol className="space-y-1 pt-1 border-t border-[var(--border-subtle)] text-[var(--ink-muted)]">
                              {task.steps.map((step, idx) => (
                                <li key={`${task.id}-s-${idx}`} className="flex items-baseline gap-2">
                                  <span className="font-mono text-[11px] text-[var(--accent)] shrink-0">
                                    [{step.state}]
                                  </span>
                                  <span>{step.detail}</span>
                                </li>
                              ))}
                            </ol>

                            {task.artifact && (
                              <div className="pt-1.5 border-t border-[var(--border-subtle)] font-mono text-[11.5px] text-[var(--ink)] leading-relaxed">
                                Artifact：{task.artifact}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: Auto-Discovered Agents, Versions, Lead Election & MCP Binding ═══ */}
      {studioTab === 'agents' && (
        <div className="space-y-6">
          <Panel
            title="默认主助手设置"
            description="可随时将任意节点的 Codex CLI、Pi、Claude Code 或 Gemini CLI 设为默认主助手，路由拓扑将自动重新连接。"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Crown className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
                  <span className="text-[14.5px] font-semibold text-[var(--ink)]">
                    {leadAgent ? leadAgent.name : '尚未选定主 Agent'}
                  </span>
                  {leadAgent && <StatusIndicator status={leadAgent.status} />}
                </div>
                {leadAgent && (
                  <div className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[var(--ink-muted)]">{leadAgent.nodeName}</span>
                    <span>·</span>
                    <span>{leadAgent.harness} v{leadAgent.version || '1.0'}</span>
                    <span>·</span>
                    <span>{leadAgent.modelHint || 'auto'} ({leadAgent.reasoningEffort || 'high'})</span>
                    <span>·</span>
                    <span>A2A v{leadAgent.protocolVersion} (Apache-2.0)</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 max-w-full">
                <select
                  value={selectedLeadDraft}
                  onChange={(e) => setSelectedLeadDraft(e.target.value)}
                  aria-label="选择主 Agent Harness"
                  data-testid="a2a-lead-select"
                  className={cn('ui-select h-9 pl-3 sm:text-[13px] min-w-0 max-w-full sm:min-w-[230px] cursor-pointer', inputBaseClass)}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.nodeId})
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={readOnly || !selectedLeadDraft || selectedLeadDraft === state?.leadAgentId || busyKey.startsWith('lead:')}
                  onClick={() => void handleSetLead(selectedLeadDraft)}
                  data-testid="a2a-elect-lead-btn"
                >
                  <Crown className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                  设为主 Agent
                </Button>
              </div>
            </div>
          </Panel>

          <Panel
            title="已安装与纳管的外部 Agent 清单（含版本与思考强度）"
            description="支持自动识别本机与探针节点已安装的 Codex / Pi / Claude Code / Gemini CLI / OpenCode 及 DSH 专家评审插件，可按 Agent 独立调节默认模型、思考强度与 MCP 权限。"
            bodyClassName="p-0"
          >
            {agents.length === 0 ? (
              <EmptyState message="尚未发现任何外部 Agent Harness，请点击上方「自动发现已安装 Agent」。" />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]" data-testid="a2a-agents-list">
                {agents.map((agent) => {
                  const isLead = agent.id === state?.leadAgentId;
                  const editingMcps = editingMcpAgentId === agent.id;
                  return (
                    <li
                      key={agent.id}
                      className={cn(
                        'px-5 sm:px-6 py-4 transition-colors',
                        isLead ? 'bg-[var(--accent-soft)]/45' : 'hover:bg-[var(--surface-hover)]/60',
                      )}
                    >
                      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isLead && <Crown className="size-3.5 text-[var(--accent)] shrink-0" strokeWidth={2} />}
                            {agent.harness === 'dsh-expert' && (
                              <ShieldCheck className="size-3.5 text-[var(--ok)] shrink-0" strokeWidth={2} />
                            )}
                            <span className="text-[14px] font-medium text-[var(--ink)]">{agent.name}</span>
                            <StatusIndicator status={agent.status} />
                            <span
                              className={cn(
                                'font-mono text-[11.5px]',
                                isLead ? 'text-[var(--accent)] font-semibold' : 'text-[var(--ink-subtle)]',
                              )}
                            >
                              {isLead ? '主 Agent' : agent.delegatable ? '可调度 Worker' : '已暂停委派'}
                            </span>
                            {agent.updateAvailable && agent.latestVersion && (
                              <span className="font-mono text-[11.5px] text-[var(--warn)]">
                                可更新 v{agent.version} -&gt; v{agent.latestVersion}
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[var(--ink-muted)]">{agent.nodeName}</span>
                            <span>·</span>
                            <span>{agent.harness} v{agent.version || '1.0'}</span>
                            {agent.installPath && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[220px]" title={agent.installPath}>{agent.installPath}</span>
                              </>
                            )}
                            {agent.latencyMs != null && (
                              <>
                                <span>·</span>
                                <span>{agent.latencyMs}ms</span>
                              </>
                            )}
                          </div>

                          <div className="text-[12px] text-[var(--ink-muted)] truncate">
                            技能：{agent.skills.map((s) => s.name).join(' · ') || '通用'}
                          </div>
                          <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                            绑定 MCP ({agent.boundMcpIds.length})：{agent.boundMcpIds.length > 0 ? agent.boundMcpIds.join(' · ') : '未绑定'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {(() => {
                            const isOfflineNode = agent.nodeOnline === false;
                            const catalogModels = getModelsForNodeAgent(
                              effectiveCatalog,
                              agent.nodeId,
                              agent.id,
                            );
                            const dynamicIds = !isOfflineNode
                              ? catalogModels.map((item) => item.id)
                              : [];
                            const candidateModels = isOfflineNode
                              ? []
                              : dynamicIds.length > 0
                                ? dynamicIds
                                : effectiveCatalog
                                  ? []
                                  : [...MODEL_PRESETS];
                            const allowedEfforts = agent.parameterConstraints?.allowedEfforts?.length
                              ? EFFORT_OPTIONS.filter((opt) => agent.parameterConstraints?.allowedEfforts.includes(opt.value))
                              : EFFORT_OPTIONS;
                            const effortList = allowedEfforts.length > 0 ? allowedEfforts : EFFORT_OPTIONS;
                            return (
                              <>
                                <select
                                  disabled={readOnly || isOfflineNode}
                                  aria-label={`${agent.name} 默认模型`}
                                  value={isOfflineNode ? '' : (agent.modelHint || agent.catalogDefaultModel || '')}
                                  onChange={(e) => void handleUpdateAgent(agent.id, { modelHint: e.target.value })}
                                  className={cn('ui-select h-8 pl-2.5 text-[12px] font-mono cursor-pointer max-w-[185px]', inputBaseClass)}
                                >
                                  {isOfflineNode ? (
                                    <option value="">节点离线（模型已隐藏）</option>
                                  ) : (
                                    <>
                                      {agent.modelHint && !candidateModels.includes(agent.modelHint) && (
                                        <option value={agent.modelHint}>{agent.modelHint}</option>
                                      )}
                                      {candidateModels.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                      ))}
                                    </>
                                  )}
                                </select>
                                <select
                                  disabled={readOnly || isOfflineNode}
                                  aria-label={`${agent.name} 思考强度`}
                                  value={agent.reasoningEffort || agent.parameterConstraints?.defaultEffort || 'medium'}
                                  onChange={(e) => void handleUpdateAgent(agent.id, { reasoningEffort: e.target.value })}
                                  className={cn('ui-select h-8 pl-2 text-[12px] font-mono cursor-pointer', inputBaseClass)}
                                >
                                  {effortList.map((opt) => (
                                    <option key={opt.value} value={opt.value}>思考:{opt.short}</option>
                                  ))}
                                </select>
                              </>
                            );
                          })()}
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busyKey === `discover:${agent.id}`}
                            onClick={() => void handleDiscover(agent)}
                          >
                            <Zap className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                            探活
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMcpAgentId(editingMcps ? '' : agent.id)}
                          >
                            <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                            MCP
                          </Button>
                          {!isLead && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={readOnly || busyKey === `lead:${agent.id}`}
                                onClick={() => void handleSetLead(agent.id)}
                              >
                                设为主
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={readOnly}
                                onClick={() => void handleUpdateAgent(agent.id, { delegatable: !agent.delegatable })}
                              >
                                {agent.delegatable ? '暂停委派' : '允许委派'}
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={readOnly}
                            aria-label={`移除 ${agent.name}`}
                            onClick={() => handleDeleteAgent(agent)}
                          >
                            <Trash2 className="size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]" strokeWidth={1.75} />
                          </Button>
                        </div>
                      </div>

                      {editingMcps && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                          <div className="text-[12px] font-medium text-[var(--ink-muted)]">
                            为 {agent.name} 授权可调用的全节点 MCP 服务
                          </div>
                          {fleetMcps.length === 0 ? (
                            <div className="text-[12px] text-[var(--ink-subtle)]">暂无可绑定的 MCP 服务</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {fleetMcps.map((mcp) => {
                                const bound = agent.boundMcpIds.includes(mcp.id);
                                return (
                                  <label
                                    key={mcp.id}
                                    className="flex items-center gap-2 py-1 text-[12px] text-[var(--ink)] cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={readOnly}
                                      checked={bound}
                                      onChange={() => void handleToggleBoundMcp(agent, mcp.id)}
                                      className="accent-[var(--accent)]"
                                    />
                                    <span className="truncate">{mcp.name}</span>
                                    <span className="font-mono text-[11px] text-[var(--ink-subtle)] shrink-0">
                                      ({mcp.nodeId})
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ═══ TAB 3: Unified Skills, Versions & DSH Expert Reviewer Plugin ═══ */}
      {studioTab === 'skills' && (
        <div className="space-y-6">
          <Panel
            title="DSH 专家评审插件（融合专家代理与发布门禁）"
            description="参考并融合你的 DSH 专家评审插件设计：将多视角专家会审作为独立插件化 Agent 嵌入调度链路，任何主从或蜂群产出均可自动过会审打分与阻断。"
            actions={
              <Button
                variant="primary"
                size="sm"
                disabled={readOnly || busyKey === 'dsh-trial'}
                onClick={() => void handleTriggerDshReview()}
                data-testid="dsh-trial-review-btn"
              >
                <ShieldCheck className="size-3.5" />
                {busyKey === 'dsh-trial' ? '专家会审中...' : '试跑 DSH 专家会审'}
              </Button>
            }
          >
            {cfg && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                <div className="lg:col-span-7 space-y-2 text-[13px]">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-[var(--ink)] cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={cfg.dshReviewGate.enabled}
                        onChange={(e) =>
                          void handleUpdateConfig({
                            dshReviewGate: { ...cfg.dshReviewGate, enabled: e.target.checked },
                          })
                        }
                        className="accent-[var(--accent)]"
                      />
                      <span>在蜂群与高风险路由上启用 DSH 自动门禁</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-[var(--ink)] cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={cfg.dshReviewGate.autoGateHighRisk}
                        onChange={(e) =>
                          void handleUpdateConfig({
                            dshReviewGate: { ...cfg.dshReviewGate, autoGateHighRisk: e.target.checked },
                          })
                        }
                        className="accent-[var(--accent)]"
                      />
                      <span>低于阈值自动退回主 Agent 重做</span>
                    </label>
                  </div>
                  <div className="font-mono text-[12px] text-[var(--ink-muted)]">
                    评审维度：{cfg.dshReviewGate.dimensions.join(' · ')}
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-wrap items-center lg:justify-end gap-3">
                  <label className="inline-flex items-center gap-2 text-[12.5px] text-[var(--ink-muted)]">
                    <span>最低放行分数</span>
                    <input
                      type="number"
                      min={50}
                      max={99}
                      disabled={readOnly}
                      value={cfg.dshReviewGate.minScore}
                      onChange={(e) =>
                        void handleUpdateConfig({
                          dshReviewGate: { ...cfg.dshReviewGate, minScore: Number(e.target.value) || 85 },
                        })
                      }
                      className={cn('w-20 h-8 px-2.5 font-mono text-center', inputBaseClass)}
                    />
                    <span className="font-mono text-[12px]">/ 100</span>
                  </label>
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="跨 Agent Skill 与插件版本目录"
            description="统一管理 DSH 插件、Pi Skill、Codex/Claude Skill 与 A2A Card 能力，勾选即可分发挂载给不同节点上的外部 Agent。"
            bodyClassName="p-0"
            actions={
              <Button
                variant="secondary"
                size="sm"
                disabled={readOnly}
                onClick={() => setSkillOpen((v) => !v)}
                data-testid="a2a-add-skill-toggle"
              >
                <Plus className="size-3.5" />
                安装 / 注册 Skill
              </Button>
            }
          >
            {skillOpen && (
              <form
                onSubmit={handleAddSkillSubmit}
                className="px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <label className="sm:col-span-4 space-y-1 text-[12px]">
                  <span className="text-[var(--ink-muted)]">Skill / 插件名称</span>
                  <input
                    type="text"
                    required
                    value={skillForm.name}
                    onChange={(e) => setSkillForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="例如：DSH 安全合规审查"
                    className={cn('w-full h-8 px-2.5', inputBaseClass)}
                  />
                </label>
                <label className="sm:col-span-2 space-y-1 text-[12px]">
                  <span className="text-[var(--ink-muted)]">版本</span>
                  <input
                    type="text"
                    value={skillForm.version}
                    onChange={(e) => setSkillForm((s) => ({ ...s, version: e.target.value }))}
                    placeholder="1.0.0"
                    className={cn('w-full h-8 px-2.5 font-mono', inputBaseClass)}
                  />
                </label>
                <label className="sm:col-span-2 space-y-1 text-[12px]">
                  <span className="text-[var(--ink-muted)]">生态来源</span>
                  <select
                    value={skillForm.provider}
                    onChange={(e) => setSkillForm((s) => ({ ...s, provider: e.target.value }))}
                    className={cn('ui-select w-full h-8 pl-2.5 text-[12px] cursor-pointer', inputBaseClass)}
                  >
                    {SKILL_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-3 space-y-1 text-[12px]">
                  <span className="text-[var(--ink-muted)]">用途说明</span>
                  <input
                    type="text"
                    value={skillForm.description}
                    onChange={(e) => setSkillForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="简述该 Skill 能力"
                    className={cn('w-full h-8 px-2.5', inputBaseClass)}
                  />
                </label>
                <div className="sm:col-span-1 flex justify-end">
                  <Button type="submit" variant="primary" size="sm" disabled={busyKey === 'add-skill'}>
                    保存
                  </Button>
                </div>
              </form>
            )}

            {skillCatalog.length === 0 ? (
              <EmptyState message="尚未注册任何跨 Agent Skill。" />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]" data-testid="a2a-skills-list">
                {skillCatalog.map((skill) => {
                  const hasUpdate = skill.latestVersion && skill.latestVersion !== skill.version;
                  return (
                    <li key={skill.id} className="px-5 sm:px-6 py-4 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Layers className="size-3.5 text-[var(--accent)] shrink-0" />
                            <span className="text-[14px] font-medium text-[var(--ink)]">{skill.name}</span>
                            <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                              v{skill.version} · {skill.provider}
                            </span>
                            {hasUpdate && (
                              <span className="font-mono text-[11.5px] text-[var(--warn)]">
                                最新 v{skill.latestVersion}
                              </span>
                            )}
                          </div>
                          {skill.description && (
                            <p className="text-[12.5px] text-[var(--ink-muted)]">{skill.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={readOnly}
                            onClick={() => void handleToggleSkillEnabled(skill)}
                          >
                            {skill.enabled ? '停用' : '启用'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={readOnly}
                            aria-label={`移除 ${skill.name}`}
                            onClick={() => void handleDeleteSkill(skill)}
                          >
                            <Trash2 className="size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
                        <span className="text-[var(--ink-subtle)]">挂载至 Agent：</span>
                        {agents.map((a) => {
                          const checked = skill.assignedAgentIds.includes(a.id);
                          return (
                            <label key={a.id} className="inline-flex items-center gap-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={readOnly}
                                checked={checked}
                                onChange={() => void handleToggleSkillAgent(skill, a.id)}
                                className="accent-[var(--accent)]"
                              />
                              <span>{a.name.split(' (')[0]}</span>
                            </label>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ═══ TAB 4: Cross-System Agent Session Alignment & Multi-Device Sync ═══ */}
      {studioTab === 'sessions' && (
        <Panel
          title="多端 Agent 会话同步与跨设备接力（A2A contextId 对齐）"
          description="借鉴 A2A contextId 协议与 Paseo / MultiAgents 跨端对齐机制：在 Mac、主控 Hub、云端 VPS 与手机间实时同步对话上下文、NMEM 摘要与隔离 Git Worktree，并支持无损切换主导 Agent。"
          bodyClassName="p-0"
          actions={
            <Button
              variant="primary"
              size="sm"
              disabled={readOnly}
              onClick={() => setSessionOpen((v) => !v)}
              data-testid="a2a-new-session-btn"
            >
              <Plus className="size-3.5" />
              新建跨端对齐会话
            </Button>
          }
        >
          {sessionOpen && (
            <form
              onSubmit={handleCreateSession}
              className="px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <label className="sm:col-span-4 space-y-1 text-[12px]">
                <span className="text-[var(--ink-muted)]">会话主题</span>
                <input
                  type="text"
                  required
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="例如：移动端与 Codex 联合排障"
                  className={cn('w-full h-8 px-2.5', inputBaseClass)}
                />
              </label>
              <label className="sm:col-span-3 space-y-1 text-[12px]">
                <span className="text-[var(--ink-muted)]">同步协议模式</span>
                <select
                  value={sessionForm.syncMode}
                  onChange={(e) => setSessionForm((s) => ({ ...s, syncMode: e.target.value }))}
                  className={cn('ui-select w-full h-8 pl-2.5 text-[12px] cursor-pointer', inputBaseClass)}
                >
                  {SYNC_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2 space-y-1 text-[12px]">
                <span className="text-[var(--ink-muted)]">Git 分支 (Worktree)</span>
                <input
                  type="text"
                  value={sessionForm.gitBranch}
                  onChange={(e) => setSessionForm((s) => ({ ...s, gitBranch: e.target.value }))}
                  placeholder="feat/multi-sync"
                  className={cn('w-full h-8 px-2.5 font-mono', inputBaseClass)}
                />
              </label>
              <label className="sm:col-span-2 space-y-1 text-[12px]">
                <span className="text-[var(--ink-muted)]">初始主导 Agent</span>
                <select
                  value={sessionForm.primaryAgentId || state?.leadAgentId || ''}
                  onChange={(e) => setSessionForm((s) => ({ ...s, primaryAgentId: e.target.value }))}
                  className={cn('ui-select w-full h-8 pl-2.5 text-[12px] cursor-pointer', inputBaseClass)}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-1 flex justify-end">
                <Button type="submit" variant="primary" size="sm" disabled={busyKey === 'add-session'}>
                  创建
                </Button>
              </div>
            </form>
          )}

          {sessions.length === 0 ? (
            <EmptyState message="暂无跨端对齐会话。" />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]" data-testid="a2a-sessions-list">
              {sessions.map((sess) => {
                const primaryAgent = agents.find((a) => a.id === sess.primaryAgentId);
                const handoffTarget = handoffDrafts[sess.id] ?? (workers[0]?.id || '');
                return (
                  <li key={sess.id} className="px-5 sm:px-6 py-4 space-y-2.5">
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Sparkles className="size-3.5 text-[var(--accent)] shrink-0" />
                          <span className="text-[14px] font-semibold text-[var(--ink)]">{sess.title}</span>
                          <StatusIndicator
                            status={sess.state === 'synced' ? 'healthy' : 'degraded'}
                            label={sess.state === 'synced' ? '全端已对齐' : '存在增量漂移'}
                          />
                          <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                            {sess.contextId} · rev.{sess.revision} · {sess.messageCount} turns
                          </span>
                        </div>

                        <div className="font-mono text-[12px] text-[var(--ink-muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>主导：{primaryAgent?.name || sess.primaryAgentId}</span>
                          <span>·</span>
                          <span>对齐设备：{sess.syncedNodes.join(' / ')}</span>
                          <span>·</span>
                          <span>同步模式：{sess.syncMode}</span>
                        </div>

                        <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] flex flex-wrap items-center gap-x-2">
                          <GitBranch className="size-3 inline" />
                          <span>{sess.gitBranch}</span>
                          {sess.worktreePath && <span>({sess.worktreePath})</span>}
                          {Array.isArray(sess.mergedBtwIds) && sess.mergedBtwIds.length > 0 && (
                            <span>· 已并入 {sess.mergedBtwIds.length} 条 BTW</span>
                          )}
                          <span>· 最近同步 {formatRelativeAge(sess.lastSyncedAt)}</span>
                        </div>

                        {sess.summary && (
                          <p className="text-[12.5px] text-[var(--ink-muted)] pt-0.5">{sess.summary}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {(() => {
                          const sessionBtw = countBtwAttention(state?.btwThreads || [], {
                            sessionId: sess.id,
                          });
                          return (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setBtwSessionId(sess.id)}
                              data-testid={`session-btw-${sess.id}`}
                            >
                              <GitBranch className="size-3.5" />
                              BTW 侧聊
                              {sessionBtw.attentionCount > 0 ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--warn)] tabular-nums">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--warn)]" aria-hidden="true" />
                                  {sessionBtw.attentionCount}
                                </span>
                              ) : sessionBtw.total > 0 ? (
                                <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                                  {sessionBtw.total}
                                </span>
                              ) : null}
                            </Button>
                          );
                        })()}
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || busyKey === `sync:${sess.id}`}
                          onClick={() => void handleSyncSession(sess)}
                          data-testid={`sync-session-${sess.id}`}
                        >
                          <RefreshCw className={cn('size-3.5', busyKey === `sync:${sess.id}` && 'animate-spin')} />
                          全端同步
                        </Button>
                        <select
                          disabled={readOnly}
                          aria-label={`选择接力目标 Agent (${sess.title})`}
                          value={handoffTarget}
                          onChange={(e) =>
                            setHandoffDrafts((prev) => ({ ...prev, [sess.id]: e.target.value }))
                          }
                          className={cn('ui-select h-8 pl-2.5 text-[12px] cursor-pointer max-w-[180px]', inputBaseClass)}
                        >
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>
                              接力至：{a.name.split(' (')[0]}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={readOnly || !handoffTarget || handoffTarget === sess.primaryAgentId || busyKey === `handoff:${sess.id}`}
                          onClick={() => void handleHandoffSession(sess)}
                        >
                          接力 Handoff
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      {/* Register External A2A Agent Drawer */}
      <Drawer.Root open={regOpen} onOpenChange={setRegOpen} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px]" />
          <Drawer.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
              <div>
                <Drawer.Title className="text-[15px] font-semibold text-[var(--ink)]">
                  接入外部 A2A Agent / 插件专家
                </Drawer.Title>
                <Drawer.Description className="text-[12px] text-[var(--ink-subtle)] mt-0.5">
                  通过标准 /.well-known/agent-card.json 接入任意节点上的 Codex / Pi / Claude / DSH 专家插件。
                </Drawer.Description>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setRegOpen(false)} aria-label="关闭抽屉">
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <label className="block space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">显示名称</span>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="例如：Pi Worker (Singapore VPS)"
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5 text-[13px]">
                  <span className="font-medium text-[var(--ink-muted)]">外部 Harness / 插件类型</span>
                  <select
                    value={regForm.harness}
                    onChange={(e) => setRegForm((s) => ({ ...s, harness: e.target.value }))}
                    className={cn('ui-select w-full h-9 pl-3 cursor-pointer', inputBaseClass)}
                  >
                    {HARNESS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 text-[13px]">
                  <span className="font-medium text-[var(--ink-muted)]">所在节点 / VPS</span>
                  <select
                    value={regForm.nodeId}
                    onChange={(e) => setRegForm((s) => ({ ...s, nodeId: e.target.value }))}
                    className={cn('ui-select w-full h-9 pl-3 cursor-pointer', inputBaseClass)}
                  >
                    {fleetNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">A2A Agent Card URL</span>
                <input
                  type="url"
                  required
                  value={regForm.agentCardUrl}
                  onChange={(e) => setRegForm((s) => ({ ...s, agentCardUrl: e.target.value }))}
                  placeholder="http://100.64.0.35:9105/.well-known/agent-card.json"
                  className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5 text-[13px]">
                  <span className="font-medium text-[var(--ink-muted)]">默认模型</span>
                  <CommandCombobox
                    value={regForm.modelHint}
                    onChange={(nextValue) =>
                      setRegForm((s) => ({ ...s, modelHint: nextValue }))
                    }
                    options={registrationModelOptions}
                    placeholder="claude-sonnet-4-6"
                    searchPlaceholder="搜索在线节点模型，或输入自定义模型 ID"
                    emptyText={
                      effectiveCatalog
                        ? '当前在线节点暂无可用模型，可直接输入自定义值'
                        : '模型目录加载中，可直接输入自定义值'
                    }
                    allowCustomValue
                    ariaLabel="默认模型"
                    className="w-full"
                    triggerClassName="h-9 font-mono text-[16px] sm:text-[13px]"
                  />
                </label>
                <label className="block space-y-1.5 text-[13px]">
                  <span className="font-medium text-[var(--ink-muted)]">默认思考强度</span>
                  <select
                    value={regForm.reasoningEffort}
                    onChange={(e) => setRegForm((s) => ({ ...s, reasoningEffort: e.target.value as ReasoningEffort }))}
                    className={cn('ui-select w-full h-9 pl-3 cursor-pointer', inputBaseClass)}
                  >
                    {EFFORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">声明技能 (逗号分隔)</span>
                <input
                  type="text"
                  value={regForm.skills}
                  onChange={(e) => setRegForm((s) => ({ ...s, skills: e.target.value }))}
                  placeholder="fast-edit, edge-ops, dsh-review"
                  className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                />
              </label>

              <label className="flex items-center gap-2 text-[13px] text-[var(--ink)] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={regForm.setAsLead}
                  onChange={(e) => setRegForm((s) => ({ ...s, setAsLead: e.target.checked }))}
                  className="accent-[var(--accent)]"
                />
                <span>接入后立即设为默认主助手</span>
              </label>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="md" onClick={() => setRegOpen(false)}>
                  取消
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={regBusy || readOnly}>
                  {regBusy ? '正在接入...' : '确认接入助手'}
                </Button>
              </div>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <AgentBtwDrawer
        open={Boolean(btwSessionId)}
        onClose={() => setBtwSessionId(null)}
        threads={state?.btwThreads || []}
        agents={agents}
        sessions={sessions}
        activeSession={sessions.find((item) => item.id === btwSessionId) || null}
        activeTask={null}
        initialThreadId={null}
        readOnly={readOnly}
        onRefresh={async () => {
          await loadAll();
        }}
        onToast={(message, tone) => onToast(message, tone)}
      />
    </div>
  );
}
