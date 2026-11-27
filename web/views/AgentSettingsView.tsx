import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type {
  A2AAgentPeer,
  A2AConnectProfilesResponse,
  A2APingResponse,
  A2ASigningVerifyResponse,
  A2ASkillCatalogItem,
  A2AStateResponse,
  DynamicModelCatalogResponse,
  GatewayTelemetryResponse,
  LinearStateResponse,
  MagpieCatalogResponse,
  ReasoningEffort,
  SnapshotResponse,
} from '../types';
import {
  copyToClipboard,
  createLinearProject,
  deleteA2ARoutingRule,
  discoverA2AAgent,
  discoverLocalA2AAgents,
  fetchA2AConnectProfiles,
  fetchA2AState,
  fetchGatewayTelemetry,
  fetchLinearState,
  fetchMagpieModels,
  fetchModelCatalog,
  pingA2AAgent,
  saveA2ATopologyPositions,
  setLeadA2AAgent,
  updateA2AAgent,
  updateA2AOrchestrationConfig,
  updateA2ASkill,
  updateLinearCommander,
  updateLinearGithubConfig,
  upsertA2ARoutingRule,
  verifyA2ASigning,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { formatCompactNumber } from '../utils/format';
import {
  SegmentedControl,
  type CommandComboboxOption,
  type ConfirmModalState,
} from '../components/ui';
import { MODEL_PRESETS } from '../components/AgentOrchestrationCanvas';
import { ModuleFrame } from '../modules/ModuleFrame';
import {
  getRailPanelSlots,
  getSettingsSectionSlots,
  useUiSlots,
  type AgentSettingsTabId,
} from '../modules/registry';
import {
  GeneralSettingsPanel,
  type GithubDraft,
  type RoutingDraft,
} from './agent-settings/GeneralSettingsPanel';
import { MultiDeviceSettingsPanel } from './agent-settings/MultiDeviceSettingsPanel';
import {
  OrchestrationSettingsPanel,
  type CommanderDraft,
  type OrchestrationSubTab,
  type ProjectFormDraft,
} from './agent-settings/OrchestrationSettingsPanel';
import {
  GovernanceSettingsPanel,
  type GovernanceSubTab,
} from './agent-settings/GovernanceSettingsPanel';
import { GatewaySettingsPanel } from './agent-settings/GatewaySettingsPanel';

export type AgentSettingsTab = AgentSettingsTabId;

export interface SettingsSectionSlotContext {
  snapshot: SnapshotResponse | null;
  readOnly: boolean;
  theme: 'light' | 'dark';
  modelCatalog: DynamicModelCatalogResponse | null;
  onSnapshotChanged?: () => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm?: (modal: ConfirmModalState) => void;
}

const ORCHESTRATION_SUB_TABS = [
  { value: 'a2a', label: 'A2A 路由与角色分工' },
  { value: 'topology', label: '集群拓扑画布' },
  { value: 'linear', label: 'Linear 总指挥与项目' },
] as const;

const GOVERNANCE_SUB_TABS = [
  { value: 'swarm', label: '蜂群引擎' },
  { value: 'guardrails', label: '安全护栏' },
  { value: 'logs', label: '协作日志' },
] as const;

export interface AgentSettingsViewProps {
  snapshot: SnapshotResponse | null;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  selectedCategory?: string;
  selectedPid?: number | null;
  onSelectCategory?: (category: string) => void;
  onSelectPid?: (pid: number | null) => void;
  onSnapshotChanged?: () => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm?: (modal: ConfirmModalState) => void;
}

export function AgentSettingsView({
  snapshot,
  readOnly = false,
  theme = 'light',
  onToggleTheme,
  selectedCategory = '',
  selectedPid = null,
  onSelectCategory,
  onSelectPid,
  onSnapshotChanged,
  onToast,
  onConfirm,
}: AgentSettingsViewProps) {
  const magpie = snapshot?.magpie;
  const processes = snapshot?.agents?.processes || [];

  const builtInSections = React.useMemo(() => getSettingsSectionSlots(), []);
  const dynamicSections = useUiSlots<SettingsSectionSlotContext>('settings.section');
  const settingsRailSlot = React.useMemo(
    () => getRailPanelSlots({ region: 'settings-rail', viewId: 'agent-settings' })[0] ?? null,
    [],
  );

  const [activeTab, setActiveTab] = React.useState<string>(
    selectedPid != null || Boolean(selectedCategory) ? 'gateway' : 'general',
  );
  const [orchestrationSubTab, setOrchestrationSubTab] =
    React.useState<OrchestrationSubTab>('a2a');
  const [governanceSubTab, setGovernanceSubTab] = React.useState<GovernanceSubTab>('swarm');

  const [a2aState, setA2aState] = React.useState<A2AStateResponse | null>(null);
  const [a2aLoading, setA2aLoading] = React.useState(false);
  const [magpieCatalog, setMagpieCatalog] = React.useState<MagpieCatalogResponse | null>(null);
  const [modelCatalog, setModelCatalog] = React.useState<DynamicModelCatalogResponse | null>(null);
  const [verifyingSigning, setVerifyingSigning] = React.useState(false);
  const [signingVerifyResult, setSigningVerifyResult] =
    React.useState<A2ASigningVerifyResponse | null>(null);
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [telemetry, setTelemetry] = React.useState<GatewayTelemetryResponse | null>(null);
  const [focusedLogAgentId, setFocusedLogAgentId] = React.useState<string>('all');

  const [savingRouting, setSavingRouting] = React.useState(false);
  const [routingDraft, setRoutingDraft] = React.useState<RoutingDraft>({
    leadAgentId: '',
    mode: 'lead-router',
    mainModel: 'gpt-5-codex',
    mainEffort: 'high',
    subModel: 'claude-sonnet-4-6',
    subEffort: 'medium',
    worktreeIsolation: true,
  });

  const [savingGithub, setSavingGithub] = React.useState(false);
  const [githubDraft, setGithubDraft] = React.useState<GithubDraft>({
    enabled: false,
    owner: '',
    repo: '',
    defaultBranch: 'main',
    autoCreatePr: true,
    syncDirection: 'bidirectional',
    tokenEnvVar: 'GITHUB_TOKEN',
  });

  const [connectProfiles, setConnectProfiles] =
    React.useState<A2AConnectProfilesResponse | null>(null);
  const [profilesLoading, setProfilesLoading] = React.useState(false);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>('tailscale');
  const [profileParams, setProfileParams] = React.useState({
    nodeId: '',
    deviceType: 'mac',
    tailscaleHost: '',
  });
  const [scanningLocal, setScanningLocal] = React.useState(false);
  const [pingingAgentId, setPingingAgentId] = React.useState<string | null>(null);
  const [pingResults, setPingResults] = React.useState<Record<string, A2APingResponse>>({});
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const [savingCommander, setSavingCommander] = React.useState(false);
  const [commanderDraft, setCommanderDraft] = React.useState<CommanderDraft>({
    leadAgentId: '',
    worktreePrefix: 'feat/linear-',
    autoDecompose: true,
    autoAssignWorkers: true,
    autoSyncGithub: true,
    requireDshReview: true,
  });
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [projectForm, setProjectForm] = React.useState<ProjectFormDraft>({
    name: '',
    key: '',
    summary: '',
    githubRepo: '',
    targetDate: '2026-12-31',
  });

  React.useEffect(() => {
    if (selectedPid != null || selectedCategory) {
      setActiveTab('gateway');
    }
  }, [selectedPid, selectedCategory]);

  const loadA2AState = React.useCallback(async (signal?: AbortSignal) => {
    setA2aLoading(true);
    try {
      const res = await fetchA2AState(signal);
      if (!signal?.aborted) {
        setA2aState(res);
        const cfg = res.orchestrationConfig;
        if (cfg) {
          setRoutingDraft({
            leadAgentId: res.leadAgentId || res.agents[0]?.id || '',
            mode: cfg.mode || 'lead-router',
            mainModel: cfg.mainModel || 'gpt-5-codex',
            mainEffort: cfg.mainEffort || 'high',
            subModel: cfg.subModel || 'claude-sonnet-4-6',
            subEffort: cfg.subEffort || 'medium',
            worktreeIsolation: cfg.worktreeIsolation !== false,
          });
        }
      }
    } catch {
      // ignore abort/transient failures
    } finally {
      if (!signal?.aborted) setA2aLoading(false);
    }
  }, []);

  const loadLinear = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const lin = await fetchLinearState(signal);
      if (signal?.aborted) return;
      setLinearState(lin);
      if (lin.commander) {
        setCommanderDraft({
          leadAgentId: lin.commander.leadAgentId || lin.availableAgents[0]?.id || '',
          worktreePrefix: lin.commander.worktreePrefix || 'feat/linear-',
          autoDecompose: lin.commander.autoDecompose !== false,
          autoAssignWorkers: lin.commander.autoAssignWorkers !== false,
          autoSyncGithub: lin.commander.autoSyncGithub !== false,
          requireDshReview: lin.commander.requireDshReview !== false,
        });
      }
      if (lin.githubConfig) {
        setGithubDraft({
          enabled: Boolean(lin.githubConfig.enabled),
          owner: lin.githubConfig.owner || '',
          repo: lin.githubConfig.repo || '',
          defaultBranch: lin.githubConfig.defaultBranch || 'main',
          autoCreatePr: lin.githubConfig.autoCreatePr !== false,
          syncDirection: lin.githubConfig.syncDirection || 'bidirectional',
          tokenEnvVar: lin.githubConfig.tokenEnvVar || 'GITHUB_TOKEN',
        });
      }
    } catch {
      // ignore abort/transient failures
    }
  }, []);

  const loadConnectProfiles = React.useCallback(
    async (
      params?: { nodeId?: string; deviceType?: string; tailscaleHost?: string },
      signal?: AbortSignal,
    ) => {
      setProfilesLoading(true);
      try {
        const res = await fetchA2AConnectProfiles(
          {
            nodeId: params?.nodeId || undefined,
            deviceType: params?.deviceType || undefined,
            tailscaleHost: params?.tailscaleHost || undefined,
          },
          signal,
        );
        if (!signal?.aborted) {
          setConnectProfiles(res);
          if (res.profiles.length > 0) {
            setSelectedProfileId((prev) => {
              if (res.profiles.some((p) => p.id === prev)) return prev;
              const rec = res.profiles.find((p) => p.recommended) || res.profiles[0];
              return rec.id;
            });
          }
        }
      } catch {
        // ignore abort
      } finally {
        if (!signal?.aborted) setProfilesLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    if (
      activeTab === 'general' ||
      activeTab === 'multi-device' ||
      activeTab === 'orchestration' ||
      activeTab === 'governance'
    ) {
      void loadA2AState(controller.signal);
    }
    if (activeTab === 'general' || activeTab === 'orchestration') {
      void loadLinear(controller.signal);
    }
    if (activeTab === 'multi-device') {
      void loadConnectProfiles(profileParams, controller.signal);
    }
    if (
      activeTab === 'general' ||
      activeTab === 'orchestration' ||
      activeTab === 'multi-device' ||
      activeTab === 'gateway'
    ) {
      fetchModelCatalog(controller.signal)
        .then((catalog) => {
          if (!controller.signal.aborted) setModelCatalog(catalog);
        })
        .catch(() => {});
      fetchMagpieModels(controller.signal)
        .then((catalog) => {
          if (!controller.signal.aborted) setMagpieCatalog(catalog);
        })
        .catch(() => {});
    }
    if (activeTab === 'gateway') {
      fetchGatewayTelemetry(controller.signal)
        .then((res) => {
          if (!controller.signal.aborted) setTelemetry(res);
        })
        .catch(() => {});
    }
    return () => controller.abort();
  }, [activeTab, loadA2AState, loadLinear, loadConnectProfiles]);

  const handleCopy = React.useCallback(
    async (key: string, text: string, label: string) => {
      const ok = await copyToClipboard(text);
      if (ok) {
        setCopiedKey(key);
        onToast?.(`已复制${label}`, 'ok');
        window.setTimeout(() => {
          setCopiedKey((current) => (current === key ? null : current));
        }, 1800);
      } else {
        onToast?.('复制失败，请检查浏览器剪贴板权限', 'err');
      }
    },
    [onToast],
  );

  const handleVerifySigning = React.useCallback(async () => {
    if (verifyingSigning) return;
    setVerifyingSigning(true);
    try {
      const res = await verifyA2ASigning();
      setSigningVerifyResult(res);
      onToast?.(
        res.valid
          ? `HMAC-SHA256 签名自检通过（Key ${res.signing.keyId}）`
          : `签名校验失败：${res.reason || 'invalid'}`,
        res.valid ? 'ok' : 'err',
      );
    } catch (err) {
      onToast?.(`签名校验请求失败：${(err as Error).message}`, 'err');
    } finally {
      setVerifyingSigning(false);
    }
  }, [verifyingSigning, onToast]);

  const modelOptions = React.useMemo<CommandComboboxOption[]>(() => {
    const seen = new Set<string>();
    const list: CommandComboboxOption[] = [];

    for (const node of modelCatalog?.onlineNodes || []) {
      const group = `${node.name || node.nodeId} (在线)`;
      for (const model of node.models || []) {
        if (model?.id && !seen.has(model.id)) {
          seen.add(model.id);
          list.push({
            value: model.id,
            label: model.id,
            group,
            meta: model.sourceKind || model.provider || undefined,
            keywords: [node.nodeId, node.name || '', model.provider || '', model.sourceKind || ''],
          });
        }
      }
    }
    for (const model of magpieCatalog?.models || []) {
      if (model?.id && !seen.has(model.id)) {
        seen.add(model.id);
        list.push({
          value: model.id,
          label: model.id,
          group: 'Magpie 网关目录',
          meta: model.provider || undefined,
          keywords: [model.provider || ''],
        });
      }
    }
    for (const fallback of MODEL_PRESETS) {
      if (!seen.has(fallback)) {
        seen.add(fallback);
        list.push({
          value: fallback,
          label: fallback,
          group: '推荐兜底预设',
        });
      }
    }
    return list;
  }, [modelCatalog?.onlineNodes, magpieCatalog?.models]);

  const activeSigningMeta = connectProfiles?.signing || a2aState?.signing || null;
  const a2aAgents = a2aState?.agents || [];

  const handleSaveRouting = React.useCallback(
    async (nextDraft?: RoutingDraft) => {
      if (readOnly) return;
      const draft = nextDraft || routingDraft;
      setSavingRouting(true);
      try {
        const tasks: Array<Promise<unknown>> = [
          updateA2AOrchestrationConfig({
            mode: draft.mode,
            mainModel: draft.mainModel.trim() || 'gpt-5-codex',
            mainEffort: draft.mainEffort,
            subModel: draft.subModel.trim() || 'claude-sonnet-4-6',
            subEffort: draft.subEffort,
            worktreeIsolation: draft.worktreeIsolation,
          }),
        ];
        if (draft.leadAgentId && draft.leadAgentId !== a2aState?.leadAgentId) {
          tasks.push(setLeadA2AAgent(draft.leadAgentId));
        }
        await Promise.all(tasks);
        onToast?.('默认 Agent 路由与模型偏好已生效', 'ok');
        await loadA2AState();
        onSnapshotChanged?.();
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '保存默认路由偏好失败', 'err');
      } finally {
        setSavingRouting(false);
      }
    },
    [readOnly, routingDraft, a2aState?.leadAgentId, loadA2AState, onSnapshotChanged, onToast],
  );

  const handleSaveGithub = React.useCallback(
    async (nextDraft?: GithubDraft) => {
      if (readOnly) return;
      const draft = nextDraft || githubDraft;
      setSavingGithub(true);
      try {
        await updateLinearGithubConfig({
          enabled: draft.enabled,
          owner: draft.owner.trim(),
          repo: draft.repo.trim(),
          defaultBranch: draft.defaultBranch.trim() || 'main',
          autoCreatePr: draft.autoCreatePr,
          syncDirection: draft.syncDirection,
          tokenEnvVar: draft.tokenEnvVar.trim() || 'GITHUB_TOKEN',
        });
        onToast?.('GitHub 同步配置已生效', 'ok');
        await loadLinear();
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '保存 GitHub 配置失败', 'err');
      } finally {
        setSavingGithub(false);
      }
    },
    [readOnly, githubDraft, loadLinear, onToast],
  );

  const handleDiscoverLocal = async () => {
    if (readOnly) return;
    setScanningLocal(true);
    try {
      const res = await discoverLocalA2AAgents();
      onToast?.(
        `扫描完成：发现 ${res.discoveredCount} 个本机 CLI，新注册 ${res.newlyRegistered} 个`,
        'ok',
      );
      await loadA2AState();
      onSnapshotChanged?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '扫描本机 CLI 失败', 'err');
    } finally {
      setScanningLocal(false);
    }
  };

  const handlePingAgent = async (agent: A2AAgentPeer) => {
    setPingingAgentId(agent.id);
    try {
      const res = await pingA2AAgent(agent.id);
      setPingResults((prev) => ({ ...prev, [agent.id]: res }));
      onToast?.(
        res.reachable
          ? `${agent.name} 连通正常${res.latencyMs != null ? ` (${res.latencyMs}ms)` : ''}`
          : `${agent.name} 不可达${res.error ? `：${res.error}` : ''}`,
        res.reachable ? 'ok' : 'err',
      );
      await loadA2AState();
    } catch (err) {
      onToast?.(`拨测 ${agent.name} 失败：${(err as Error).message}`, 'err');
    } finally {
      setPingingAgentId((current) => (current === agent.id ? null : current));
    }
  };

  const handleRegenerateProfiles = (event: React.FormEvent) => {
    event.preventDefault();
    void loadConnectProfiles(profileParams);
  };

  const handleSaveCommander = React.useCallback(
    async (nextDraft?: CommanderDraft) => {
      if (readOnly) return;
      const draft = nextDraft || commanderDraft;
      setSavingCommander(true);
      try {
        await Promise.all([
          draft.leadAgentId ? setLeadA2AAgent(draft.leadAgentId) : Promise.resolve(),
          updateLinearCommander({
            leadAgentId: draft.leadAgentId || null,
            worktreePrefix: draft.worktreePrefix,
            autoDecompose: draft.autoDecompose,
            autoAssignWorkers: draft.autoAssignWorkers,
            autoSyncGithub: draft.autoSyncGithub,
            requireDshReview: draft.requireDshReview,
          }),
        ]);
        onToast?.('总指挥与分工策略已生效', 'ok');
        await Promise.all([loadLinear(), loadA2AState()]);
        onSnapshotChanged?.();
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '保存总指挥策略失败', 'err');
      } finally {
        setSavingCommander(false);
      }
    },
    [readOnly, commanderDraft, loadLinear, loadA2AState, onSnapshotChanged, onToast],
  );

  const handleCreateProject = React.useCallback(async (): Promise<boolean> => {
    if (readOnly || !projectForm.name.trim()) return false;
    setCreatingProject(true);
    try {
      const res = await createLinearProject({
        name: projectForm.name.trim(),
        key: projectForm.key.trim() || undefined,
        summary: projectForm.summary.trim(),
        githubRepo: projectForm.githubRepo.trim() || undefined,
        targetDate: projectForm.targetDate,
      });
      onToast?.(`已新增项目：${res.project.key} · ${res.project.name}`, 'ok');
      setProjectForm({
        name: '',
        key: '',
        summary: '',
        githubRepo: '',
        targetDate: '2026-12-31',
      });
      await loadLinear();
      return true;
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '新增项目失败', 'err');
      return false;
    } finally {
      setCreatingProject(false);
    }
  }, [readOnly, projectForm, loadLinear, onToast]);

  const handleJumpToAgentLogs = React.useCallback((agentId: string) => {
    setFocusedLogAgentId(agentId || 'all');
    setActiveTab('governance');
    setGovernanceSubTab('logs');
  }, []);

  const noopToast = React.useCallback(() => {}, []);
  const noopConfirm = React.useCallback(() => {}, []);
  const noopRefresh = React.useCallback(() => {}, []);

  const handleTopologyUpdateConfig = async (patch: Record<string, unknown>) => {
    if (readOnly) return;
    try {
      await updateA2AOrchestrationConfig(patch);
      await loadA2AState();
      onToast?.('编排调度策略已更新并持久化', 'ok');
    } catch (err) {
      onToast?.(`更新策略失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologySavePositions = async (
    positions: Record<string, { x: number; y: number }>,
  ) => {
    if (readOnly) return;
    try {
      await saveA2ATopologyPositions(positions);
      await loadA2AState();
    } catch (err) {
      onToast?.(`保存节点排版失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyUpsertRule = async (
    payload: Parameters<typeof upsertA2ARoutingRule>[0],
  ) => {
    if (readOnly) return;
    try {
      const res = await upsertA2ARoutingRule(payload);
      onToast?.(`已保存路由策略「${res.rule.name}」`, 'ok');
      await loadA2AState();
    } catch (err) {
      onToast?.(`保存路由失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyDeleteRule = async (ruleId: string) => {
    if (readOnly) return;
    try {
      await deleteA2ARoutingRule(ruleId);
      onToast?.('已移除路由边', 'ok');
      await loadA2AState();
    } catch (err) {
      onToast?.(`删除路由失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyUpdateAgent = async (
    agentId: string,
    patch: { modelHint?: string; reasoningEffort?: ReasoningEffort; delegatable?: boolean },
  ) => {
    if (readOnly) return;
    try {
      await updateA2AAgent(agentId, patch);
      onToast?.('Agent 参数已更新', 'ok');
      await loadA2AState();
    } catch (err) {
      onToast?.(`更新 Agent 参数失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologySetLead = async (agentId: string) => {
    if (readOnly) return;
    try {
      const res = await setLeadA2AAgent(agentId);
      onToast?.(`已选举「${res.leadAgent?.name || agentId}」为当前总指挥`, 'ok');
      await loadA2AState();
      onSnapshotChanged?.();
    } catch (err) {
      onToast?.(`切换总指挥失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyDiscover = async (agent: A2AAgentPeer) => {
    try {
      const res = await discoverA2AAgent(agent.id);
      onToast?.(
        res.ok
          ? `${agent.name} 探活成功 (${res.latencyMs ?? 0}ms)`
          : `${agent.name} 暂不可达${res.error ? `：${res.error}` : ''}`,
        res.ok ? 'ok' : 'err',
      );
      await loadA2AState();
    } catch (err) {
      onToast?.(`探活失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyToggleSkill = async (skill: A2ASkillCatalogItem, agentId: string) => {
    if (readOnly) return;
    try {
      await updateA2ASkill(skill.id, { toggleAgentId: agentId });
      await loadA2AState();
    } catch (err) {
      onToast?.(`更新 Skill 挂载失败：${(err as Error).message}`, 'err');
    }
  };

  const activeBuiltIn = builtInSections.find((item) => item.id === activeTab) || null;
  const activeDynamic = dynamicSections.find((item) => item.id === activeTab) || null;
  const activeHeader = activeBuiltIn || activeDynamic || builtInSections[0];

  const slotContext: SettingsSectionSlotContext = {
    snapshot,
    readOnly,
    theme,
    modelCatalog,
    onSnapshotChanged,
    onToast,
    onConfirm,
  };

  return (
    <ModuleFrame
      title="系统与 Agent 设置"
      description="统一管理控制台外观、多机 A2A 互联、默认路由模型、编排拓扑、蜂群护栏及模型网关。"
      spacing="compact"
      meta={
        magpie?.reachable
          ? `${formatCompactNumber(magpie.totalModels ?? 0)} 模型 · ${processes.length} 活跃进程`
          : `${processes.length} 活跃进程`
      }
      testId="view-agent-settings"
    >
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
        <aside
          aria-label="设置分组导航"
          className="w-full md:w-56 shrink-0 md:sticky md:top-[4.5rem]"
          data-testid="settings-nav-rail"
          data-slot-id={settingsRailSlot?.id}
        >
          <div className="mb-2 px-2.5 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-subtle)]">
            设置分组
          </div>
          <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-1">
            {builtInSections.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  data-settings-tab={item.id}
                  data-testid={`settings-nav-${item.id}`}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left text-[13px] font-medium border cursor-pointer transition-colors duration-150 ease-out',
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/25'
                      : 'bg-transparent text-[var(--ink-muted)] border-transparent hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                    FOCUS_RING,
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {dynamicSections.length > 0 && (
              <>
                <div className="col-span-full mt-3 mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-subtle)]">
                  扩展模块
                </div>
                {dynamicSections.map((slot) => {
                  const isActive = activeTab === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setActiveTab(slot.id)}
                      aria-current={isActive ? 'page' : undefined}
                      data-settings-tab={slot.id}
                      data-testid={`settings-nav-${slot.id}`}
                      className={cn(
                        'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left text-[13px] font-medium border cursor-pointer transition-colors duration-150 ease-out',
                        isActive
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/25'
                          : 'bg-transparent text-[var(--ink-muted)] border-transparent hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                        FOCUS_RING,
                      )}
                    >
                      <SlidersHorizontal className="size-4 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{slot.label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </nav>

          <div className="hidden md:block mt-5 pt-4 border-t border-[var(--border-subtle)] px-2.5 space-y-1.5 text-[12px] text-[var(--ink-subtle)]">
            <div className="flex items-center justify-between gap-2">
              <span>控制面模式</span>
              <span className="font-mono text-[var(--ink-muted)]">
                {readOnly ? '只读' : '读写'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>已注册 Agent</span>
              <span className="font-mono text-[var(--ink-muted)] tabular-nums">
                {a2aState?.summary?.totalAgents ?? a2aAgents.length}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>主机节点</span>
              <span
                className="font-mono text-[var(--ink-muted)] truncate max-w-[110px]"
                title={snapshot?.host?.hostname || 'localhost'}
              >
                {snapshot?.host?.hostname || 'localhost'}
              </span>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 w-full space-y-6">
          <div className="pb-4 border-b border-[var(--border-subtle)] flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-tight text-[var(--ink)]">
                {activeHeader.label}
              </h2>
              {activeHeader.description && (
                <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
                  {activeHeader.description}
                </p>
              )}
            </div>
            {activeTab === 'orchestration' && (
              <SegmentedControl
                value={orchestrationSubTab}
                onChange={setOrchestrationSubTab}
                options={ORCHESTRATION_SUB_TABS}
                ariaLabel="切换编排与拓扑子视图"
              />
            )}
            {activeTab === 'governance' && (
              <SegmentedControl
                value={governanceSubTab}
                onChange={setGovernanceSubTab}
                options={GOVERNANCE_SUB_TABS}
                ariaLabel="切换蜂群、护栏与日志子视图"
              />
            )}
          </div>

          {activeTab === 'general' && (
            <GeneralSettingsPanel
              snapshot={snapshot}
              readOnly={readOnly}
              theme={theme}
              onToggleTheme={onToggleTheme}
              a2aAgents={a2aAgents}
              modelCatalog={modelCatalog}
              magpieCatalog={magpieCatalog}
              modelOptions={modelOptions}
              routingDraft={routingDraft}
              savingRouting={savingRouting}
              onChangeRoutingDraft={setRoutingDraft}
              onSaveRouting={handleSaveRouting}
              linearState={linearState}
              githubDraft={githubDraft}
              savingGithub={savingGithub}
              onChangeGithubDraft={setGithubDraft}
              onSaveGithub={handleSaveGithub}
            />
          )}

          {activeTab === 'multi-device' && (
            <MultiDeviceSettingsPanel
              readOnly={readOnly}
              a2aAgents={a2aAgents}
              leadAgentId={a2aState?.leadAgentId}
              a2aLoading={a2aLoading}
              modelOptions={modelOptions}
              connectProfiles={connectProfiles}
              profilesLoading={profilesLoading}
              selectedProfileId={selectedProfileId}
              onSelectProfileId={setSelectedProfileId}
              profileParams={profileParams}
              onChangeProfileParams={setProfileParams}
              onRegenerateProfiles={handleRegenerateProfiles}
              activeSigningMeta={activeSigningMeta}
              verifyingSigning={verifyingSigning}
              signingVerifyResult={signingVerifyResult}
              onVerifySigning={handleVerifySigning}
              scanningLocal={scanningLocal}
              onDiscoverLocal={handleDiscoverLocal}
              onReloadA2A={() => loadA2AState()}
              pingingAgentId={pingingAgentId}
              pingResults={pingResults}
              onPingAgent={handlePingAgent}
              onUpdateAgent={handleTopologyUpdateAgent}
              onSetLeadAgent={handleTopologySetLead}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          )}

          {activeTab === 'orchestration' && (
            <OrchestrationSettingsPanel
              subTab={orchestrationSubTab}
              snapshot={snapshot}
              readOnly={readOnly}
              a2aState={a2aState}
              a2aLoading={a2aLoading}
              linearState={linearState}
              commanderDraft={commanderDraft}
              savingCommander={savingCommander}
              onChangeCommanderDraft={setCommanderDraft}
              onSaveCommander={handleSaveCommander}
              projectForm={projectForm}
              creatingProject={creatingProject}
              onChangeProjectForm={setProjectForm}
              onCreateProject={handleCreateProject}
              onReloadA2A={() => loadA2AState()}
              onTopologyUpdateConfig={handleTopologyUpdateConfig}
              onTopologySavePositions={handleTopologySavePositions}
              onTopologyUpsertRule={handleTopologyUpsertRule}
              onTopologyDeleteRule={handleTopologyDeleteRule}
              onTopologyUpdateAgent={handleTopologyUpdateAgent}
              onTopologySetLead={handleTopologySetLead}
              onTopologyDiscover={handleTopologyDiscover}
              onTopologyToggleSkill={handleTopologyToggleSkill}
              onInspectLogs={handleJumpToAgentLogs}
              onSnapshotChanged={onSnapshotChanged || noopRefresh}
              onToast={onToast || noopToast}
              onConfirm={onConfirm || noopConfirm}
            />
          )}

          {activeTab === 'governance' && (
            <GovernanceSettingsPanel
              subTab={governanceSubTab}
              a2aState={a2aState}
              focusedLogAgentId={focusedLogAgentId}
              readOnly={readOnly}
              onReloadA2A={() => loadA2AState()}
              onOpenAgentLogs={handleJumpToAgentLogs}
              onToast={onToast}
            />
          )}

          {activeTab === 'gateway' && (
            <GatewaySettingsPanel
              snapshot={snapshot}
              telemetry={telemetry}
              selectedCategory={selectedCategory}
              selectedPid={selectedPid}
              onSelectCategory={onSelectCategory}
              onSelectPid={onSelectPid}
            />
          )}

          {activeDynamic && (
            <div className="space-y-6" data-testid={`settings-section-${activeDynamic.id}`}>
              {activeDynamic.render ? activeDynamic.render(slotContext) : null}
            </div>
          )}
        </div>
      </div>
    </ModuleFrame>
  );
}

export default AgentSettingsView;
