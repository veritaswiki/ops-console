import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  Cpu,
  Globe,
  Moon,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Workflow,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  OrchestrationMode,
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
import { formatBytes, formatCompactNumber, formatUptime } from '../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  KpiStrip,
  Panel,
  ResourceMeter,
  SegmentedFilter,
  StatusIndicator,
  WidgetSkeleton,
  type ConfirmModalState,
} from '../components/ui';
import { A2AOrchestratorSection } from '../components/A2AOrchestratorSection';
import { AgentLogsSection } from '../components/AgentLogsSection';
import { EFFORT_OPTIONS, MODEL_PRESETS } from '../components/AgentOrchestrationCanvas';
import { AiGovernanceSection } from '../components/AiGovernanceSection';
import { SwarmMemorySection } from '../components/SwarmMemorySection';
import { ModuleFrame } from '../modules/ModuleFrame';

const ArchitectureGraph = React.lazy(() =>
  import('../components/ArchitectureGraph').then((m) => ({ default: m.ArchitectureGraph })),
);

const AgentOrchestrationCanvas = React.lazy(() =>
  import('../components/AgentOrchestrationCanvas').then((m) => ({ default: m.AgentOrchestrationCanvas })),
);

export type AgentSettingsTab = 'general' | 'multi-device' | 'orchestration' | 'governance' | 'gateway';

type OrchestrationSubTab = 'a2a' | 'topology' | 'linear';
type GovernanceSubTab = 'swarm' | 'guardrails' | 'logs';

interface SettingsNavItem {
  value: AgentSettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const SETTINGS_NAV_ITEMS: readonly SettingsNavItem[] = [
  {
    value: 'general',
    label: '常规与外观',
    description: '主题切换、默认路由模型与 GitHub 仓库配置',
    icon: SlidersHorizontal,
  },
  {
    value: 'multi-device',
    label: '多机 Agent 与 A2A 互联',
    description: 'A2A v0.3 Hub 端点、本机扫描、拨测与跨机接入命令',
    icon: Globe,
  },
  {
    value: 'orchestration',
    label: '编排与拓扑',
    description: 'A2A 路由规则、集群拓扑画布与 Linear 总指挥',
    icon: Workflow,
  },
  {
    value: 'governance',
    label: '蜂群、护栏与日志',
    description: '蜂群协同引擎、AI 安全护栏与协作日志流',
    icon: ShieldCheck,
  },
  {
    value: 'gateway',
    label: '网关与进程',
    description: 'Magpie 24h 遥测、成本熔断、加速器与本地进程',
    icon: Activity,
  },
] as const;

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

const TELEMETRY_MODES = [
  { value: 'tokens', label: 'Token 吞吐 (K)' },
  { value: 'latency', label: 'TTFT / P95 延迟 (ms)' },
] as const;

type TelemetryMode = (typeof TELEMETRY_MODES)[number]['value'];

const ORCHESTRATION_MODE_OPTIONS: ReadonlyArray<{ value: OrchestrationMode; label: string }> = [
  { value: 'lead-router', label: '总指挥路由 (Lead Router)' },
  { value: 'main-sub', label: '主子分级 (Main / Sub)' },
  { value: 'swarm', label: '蜂群协同 (Swarm)' },
];

const SYNC_DIRECTION_OPTIONS = [
  { value: 'bidirectional', label: '双向同步 (Bidirectional)' },
  { value: 'pull', label: '仅拉取 (Pull)' },
  { value: 'push', label: '仅推送 (Push)' },
] as const;

function formatHourLabel(ts: number): string {
  const date = new Date(ts);
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

function formatShortTime(ts?: string | null): string {
  if (!ts) return '-';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

function CommandSnippet({
  title,
  command,
  copyKey,
  copiedKey,
  onCopy,
}: {
  title: string;
  command: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string, label: string) => void;
}) {
  const isCopied = copiedKey === copyKey;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]/55 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
        <span className="text-[12px] font-medium text-[var(--ink-muted)]">{title}</span>
        <button
          type="button"
          onClick={() => onCopy(copyKey, command, title)}
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium cursor-pointer transition-colors duration-150 ease-out',
            isCopied
              ? 'text-[var(--ok)] bg-[var(--ok-soft)]'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
            FOCUS_RING,
          )}
        >
          {isCopied ? <Check className="size-3.5" strokeWidth={2} /> : <Copy className="size-3.5" strokeWidth={1.75} />}
          <span>{isCopied ? '已复制' : '复制'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-[var(--ink)] whitespace-pre">
        {command}
      </pre>
    </div>
  );
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
}: {
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
}) {
  const magpie = snapshot?.magpie;
  const processes = snapshot?.agents?.processes || [];
  const fleetNodes = snapshot?.fleet?.nodes || [];
  const rowRefs = React.useRef<Record<number, HTMLTableRowElement | null>>({});

  const [activeTab, setActiveTab] = React.useState<AgentSettingsTab>(
    selectedPid != null || Boolean(selectedCategory) ? 'gateway' : 'general',
  );
  const [orchestrationSubTab, setOrchestrationSubTab] = React.useState<OrchestrationSubTab>('a2a');
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
  const [routingDraft, setRoutingDraft] = React.useState<{
    leadAgentId: string;
    mode: OrchestrationMode;
    mainModel: string;
    mainEffort: ReasoningEffort;
    subModel: string;
    subEffort: ReasoningEffort;
    worktreeIsolation: boolean;
  }>({
    leadAgentId: '',
    mode: 'lead-router',
    mainModel: 'gpt-5-codex',
    mainEffort: 'high',
    subModel: 'claude-sonnet-4-6',
    subEffort: 'medium',
    worktreeIsolation: true,
  });

  const [savingGithub, setSavingGithub] = React.useState(false);
  const [githubDraft, setGithubDraft] = React.useState({
    enabled: false,
    owner: '',
    repo: '',
    defaultBranch: 'main',
    autoCreatePr: true,
    syncDirection: 'bidirectional',
    tokenEnvVar: 'GITHUB_TOKEN',
  });

  const [connectProfiles, setConnectProfiles] = React.useState<A2AConnectProfilesResponse | null>(null);
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
  const [commanderDraft, setCommanderDraft] = React.useState({
    leadAgentId: '',
    worktreePrefix: 'feat/linear-',
    autoDecompose: true,
    autoAssignWorkers: true,
    autoSyncGithub: true,
    requireDshReview: true,
  });
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [projectForm, setProjectForm] = React.useState({
    name: '',
    key: '',
    summary: '',
    githubRepo: '',
    targetDate: '2026-12-31',
  });

  const [chartMode, setChartMode] = React.useState<TelemetryMode>('tokens');
  const [procQuery, setProcQuery] = React.useState('');
  const [procSort, setProcSort] = React.useState<'cpu' | 'mem' | 'pid'>('cpu');
  const [procSortDir, setProcSortDir] = React.useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    if (selectedPid != null || selectedCategory) {
      setActiveTab('gateway');
    }
  }, [selectedPid, selectedCategory]);

  const loadA2AState = React.useCallback(
    async (signal?: AbortSignal) => {
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
              worktreeIsolation: Boolean(cfg.worktreeIsolation),
            });
          }
        }
      } catch (err) {
        if (!signal?.aborted) {
          onToast?.(`加载 Agent 编排状态失败：${(err as Error).message}`, 'err');
        }
      } finally {
        if (!signal?.aborted) setA2aLoading(false);
      }
    },
    [onToast],
  );

  const loadLinear = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const lin = await fetchLinearState(signal);
      if (signal?.aborted) return;
      setLinearState(lin);
      setCommanderDraft({
        leadAgentId: lin.commander.leadAgentId || lin.availableAgents[0]?.id || '',
        worktreePrefix: lin.commander.worktreePrefix || 'feat/linear-',
        autoDecompose: lin.commander.autoDecompose,
        autoAssignWorkers: lin.commander.autoAssignWorkers,
        autoSyncGithub: lin.commander.autoSyncGithub,
        requireDshReview: lin.commander.requireDshReview,
      });
      if (lin.githubConfig) {
        setGithubDraft({
          enabled: Boolean(lin.githubConfig.enabled),
          owner: lin.githubConfig.owner || '',
          repo: lin.githubConfig.repo || '',
          defaultBranch: lin.githubConfig.defaultBranch || 'main',
          autoCreatePr: Boolean(lin.githubConfig.autoCreatePr),
          syncDirection: lin.githubConfig.syncDirection || 'bidirectional',
          tokenEnvVar: lin.githubConfig.tokenEnvVar || 'GITHUB_TOKEN',
        });
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const loadConnectProfiles = React.useCallback(
    async (
      params: { nodeId?: string; deviceType?: string; tailscaleHost?: string },
      signal?: AbortSignal,
    ) => {
      setProfilesLoading(true);
      try {
        const res = await fetchA2AConnectProfiles(
          {
            nodeId: params.nodeId?.trim() || undefined,
            deviceType: params.deviceType?.trim() || undefined,
            tailscaleHost: params.tailscaleHost?.trim() || undefined,
          },
          signal,
        );
        if (!signal?.aborted) {
          setConnectProfiles(res);
          setSelectedProfileId((prev) => {
            if (res.profiles.some((p) => p.id === prev)) return prev;
            const rec = res.profiles.find((p) => p.recommended) || res.profiles[0];
            return rec ? rec.id : 'tailscale';
          });
        }
      } catch (err) {
        if (!signal?.aborted) {
          onToast?.(`加载跨机接入配置失败：${(err as Error).message}`, 'err');
        }
      } finally {
        if (!signal?.aborted) setProfilesLoading(false);
      }
    },
    [onToast],
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
      Promise.all([
        fetchModelCatalog(controller.signal).catch(() => null),
        fetchMagpieModels(controller.signal).catch(() => null),
      ])
        .then(([dynamicCat, legacyCat]) => {
          if (!controller.signal.aborted) {
            setModelCatalog(dynamicCat);
            setMagpieCatalog(legacyCat);
          }
        })
        .catch(() => {
          // Non-blocking catalog lookup
        });
    }
    if (activeTab === 'gateway') {
      fetchGatewayTelemetry(controller.signal)
        .then((res) => {
          if (!controller.signal.aborted) setTelemetry(res);
        })
        .catch(() => {
          // Non-blocking secondary telemetry
        });
    }
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loadA2AState, loadLinear, loadConnectProfiles]);

  React.useEffect(() => {
    if (selectedPid != null && rowRefs.current[selectedPid]) {
      rowRefs.current[selectedPid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPid]);

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

  const modelPresetOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const node of modelCatalog?.onlineNodes || []) {
      for (const model of node.models || []) {
        if (model?.id && !seen.has(model.id)) {
          seen.add(model.id);
          list.push(model.id);
        }
      }
    }
    for (const model of magpieCatalog?.models || []) {
      if (model?.id && !seen.has(model.id)) {
        seen.add(model.id);
        list.push(model.id);
      }
    }
    for (const fallback of MODEL_PRESETS) {
      if (!seen.has(fallback)) {
        seen.add(fallback);
        list.push(fallback);
      }
    }
    return list;
  }, [modelCatalog?.onlineNodes, magpieCatalog?.models]);

  const activeSigningMeta = connectProfiles?.signing || a2aState?.signing || null;

  const handleSaveRouting = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    setSavingRouting(true);
    try {
      const tasks: Array<Promise<unknown>> = [
        updateA2AOrchestrationConfig({
          mode: routingDraft.mode,
          mainModel: routingDraft.mainModel.trim() || 'gpt-5-codex',
          mainEffort: routingDraft.mainEffort,
          subModel: routingDraft.subModel.trim() || 'claude-sonnet-4-6',
          subEffort: routingDraft.subEffort,
          worktreeIsolation: routingDraft.worktreeIsolation,
        }),
      ];
      if (routingDraft.leadAgentId && routingDraft.leadAgentId !== a2aState?.leadAgentId) {
        tasks.push(setLeadA2AAgent(routingDraft.leadAgentId));
      }
      await Promise.all(tasks);
      onToast?.('默认 Agent 路由与模型偏好已保存', 'ok');
      await loadA2AState();
      onSnapshotChanged?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '保存默认路由偏好失败', 'err');
    } finally {
      setSavingRouting(false);
    }
  };

  const handleSaveGithub = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    setSavingGithub(true);
    try {
      await updateLinearGithubConfig({
        enabled: githubDraft.enabled,
        owner: githubDraft.owner.trim(),
        repo: githubDraft.repo.trim(),
        defaultBranch: githubDraft.defaultBranch.trim() || 'main',
        autoCreatePr: githubDraft.autoCreatePr,
        syncDirection: githubDraft.syncDirection,
        tokenEnvVar: githubDraft.tokenEnvVar.trim() || 'GITHUB_TOKEN',
      });
      onToast?.('GitHub 同步配置已保存', 'ok');
      await loadLinear();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '保存 GitHub 配置失败', 'err');
    } finally {
      setSavingGithub(false);
    }
  };

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

  const handleSaveCommander = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    setSavingCommander(true);
    try {
      await Promise.all([
        commanderDraft.leadAgentId ? setLeadA2AAgent(commanderDraft.leadAgentId) : Promise.resolve(),
        updateLinearCommander({
          leadAgentId: commanderDraft.leadAgentId || null,
          worktreePrefix: commanderDraft.worktreePrefix,
          autoDecompose: commanderDraft.autoDecompose,
          autoAssignWorkers: commanderDraft.autoAssignWorkers,
          autoSyncGithub: commanderDraft.autoSyncGithub,
          requireDshReview: commanderDraft.requireDshReview,
        }),
      ]);
      onToast?.('总指挥与分工策略已保存', 'ok');
      await Promise.all([loadLinear(), loadA2AState()]);
      onSnapshotChanged?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '保存总指挥策略失败', 'err');
    } finally {
      setSavingCommander(false);
    }
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly || !projectForm.name.trim()) return;
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
      setProjectForm({ name: '', key: '', summary: '', githubRepo: '', targetDate: '2026-12-31' });
      await loadLinear();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '新增项目失败', 'err');
    } finally {
      setCreatingProject(false);
    }
  };

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

  const handleTopologySavePositions = async (positions: Record<string, { x: number; y: number }>) => {
    if (readOnly) return;
    try {
      await saveA2ATopologyPositions(positions);
      await loadA2AState();
    } catch (err) {
      onToast?.(`保存节点排版失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyUpsertRule = async (payload: Parameters<typeof upsertA2ARoutingRule>[0]) => {
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

  const toggleProcSort = (field: 'cpu' | 'mem' | 'pid') => {
    if (procSort === field) {
      setProcSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setProcSort(field);
      setProcSortDir(field === 'pid' ? 'asc' : 'desc');
    }
  };

  const renderProcSortIcon = (field: 'cpu' | 'mem' | 'pid') => {
    if (procSort !== field) {
      return <ArrowUpDown className="size-3 text-[var(--ink-subtle)]/70" strokeWidth={1.75} />;
    }
    return procSortDir === 'asc' ? (
      <ArrowUp className="size-3 text-[var(--accent)]" strokeWidth={2} />
    ) : (
      <ArrowDown className="size-3 text-[var(--accent)]" strokeWidth={2} />
    );
  };

  const filteredProcesses = React.useMemo(() => {
    let base = processes;
    if (selectedPid != null) {
      const pidMatches = processes.filter((p) => p.pid === selectedPid);
      if (pidMatches.length > 0) base = pidMatches;
    } else if (selectedCategory) {
      base = processes.filter(
        (p) => (p.categoryLabel || p.category || 'Agent') === selectedCategory,
      );
    }
    const query = procQuery.trim().toLowerCase();
    if (query) {
      base = base.filter((p) => {
        const hay = `${p.pid} ${p.categoryLabel || p.category || ''} ${p.cmd || p.command || ''}`.toLowerCase();
        return hay.includes(query);
      });
    }
    const dir = procSortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      if (procSort === 'cpu') return ((a.cpu ?? 0) - (b.cpu ?? 0)) * dir;
      if (procSort === 'mem') {
        return ((a.memoryBytes ?? a.rssBytes ?? 0) - (b.memoryBytes ?? b.rssBytes ?? 0)) * dir;
      }
      return (a.pid - b.pid) * dir;
    });
  }, [processes, selectedCategory, selectedPid, procQuery, procSort, procSortDir]);

  const totalProviderCost = React.useMemo(
    () => (telemetry?.providers || []).reduce((sum, item) => sum + (item.costUsd || 0), 0),
    [telemetry?.providers],
  );

  const providers = magpie?.providers || [];
  const totalModels = magpie?.totalModels || providers.reduce((sum, item) => sum + (item.count || 0), 0) || 1;
  const registeredMagpieAgents = magpie?.agents || [];
  const summary = telemetry?.summary;
  const budgetPct = summary?.dailyBudgetUsd
    ? Math.min(100, Math.round((summary.estimatedCostUsd24h / summary.dailyBudgetUsd) * 100))
    : 0;

  const cycles = linearState?.cycles || [];
  const projects = linearState?.projects || [];
  const availableAgents = linearState?.availableAgents || [];
  const a2aAgents = a2aState?.agents || [];

  const activeNavItem =
    SETTINGS_NAV_ITEMS.find((item) => item.value === activeTab) || SETTINGS_NAV_ITEMS[0];
  const activeConnectProfile =
    connectProfiles?.profiles.find((p) => p.id === selectedProfileId) ||
    connectProfiles?.profiles[0] ||
    null;

  return (
    <ModuleFrame
      title="系统与 Agent 设置"
      description="统一管理控制台外观、多机 A2A 互联、默认路由模型、编排拓扑、蜂群护栏及模型网关。"
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
          className="w-full md:w-56 shrink-0 md:sticky md:top-4"
          data-testid="settings-nav-rail"
        >
          <div className="mb-2 px-2.5 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-subtle)]">
            设置分组
          </div>
          <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-1">
            {SETTINGS_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActiveTab(item.value)}
                  aria-current={isActive ? 'page' : undefined}
                  data-settings-tab={item.value}
                  data-testid={`settings-nav-${item.value}`}
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
                {activeNavItem.label}
              </h2>
              <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
                {activeNavItem.description}
              </p>
            </div>
            {activeTab === 'orchestration' && (
              <SegmentedFilter
                value={orchestrationSubTab}
                onChange={setOrchestrationSubTab}
                options={ORCHESTRATION_SUB_TABS}
                ariaLabel="切换编排与拓扑子视图"
              />
            )}
            {activeTab === 'governance' && (
              <SegmentedFilter
                value={governanceSubTab}
                onChange={setGovernanceSubTab}
                options={GOVERNANCE_SUB_TABS}
                ariaLabel="切换蜂群、护栏与日志子视图"
              />
            )}
          </div>

          {activeTab === 'general' && (
            <div className="space-y-6" data-testid="settings-section-general">
              <Panel
                title="外观与工作台概览"
                description="切换控制台明暗外观，并查看当前宿主机与控制面运行状态。"
              >
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
                    <div>
                      <div className="text-[13.5px] font-medium text-[var(--ink)]">界面主题</div>
                      <div className="mt-0.5 text-[12.5px] text-[var(--ink-muted)]">
                        Pure Zinc 亮/暗配色，实时应用并持久化至本机浏览器。
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (theme !== 'light') onToggleTheme?.();
                        }}
                        aria-pressed={theme === 'light'}
                        data-testid="settings-theme-light"
                        className={cn(
                          'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12.5px] font-medium cursor-pointer transition-colors duration-150 ease-out',
                          theme === 'light'
                            ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
                          FOCUS_RING,
                        )}
                      >
                        <Sun className="size-3.5" strokeWidth={1.75} />
                        <span>亮色</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (theme !== 'dark') onToggleTheme?.();
                        }}
                        aria-pressed={theme === 'dark'}
                        data-testid="settings-theme-dark"
                        className={cn(
                          'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12.5px] font-medium cursor-pointer transition-colors duration-150 ease-out',
                          theme === 'dark'
                            ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
                          FOCUS_RING,
                        )}
                      >
                        <Moon className="size-3.5" strokeWidth={1.75} />
                        <span>深色</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
                    <div className="space-y-0.5">
                      <div className="text-[11.5px] text-[var(--ink-subtle)]">控制面宿主机</div>
                      <div className="font-mono text-[13px] font-medium text-[var(--ink)] truncate">
                        {snapshot?.host?.hostname || 'localhost'}
                      </div>
                      <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                        {snapshot?.host?.os || snapshot?.host?.platform || 'linux'} · {snapshot?.host?.arch || 'x64'}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11.5px] text-[var(--ink-subtle)]">写操作权限</div>
                      <div className="pt-0.5">
                        <StatusIndicator
                          status={readOnly ? 'standby' : 'healthy'}
                          label={readOnly ? '只读保护模式' : '允许控制变更'}
                        />
                      </div>
                      <div className="text-[11.5px] text-[var(--ink-subtle)]">
                        {snapshot?.demo ? '演示模式运行中' : '实时采集模式'}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11.5px] text-[var(--ink-subtle)]">Magpie 模型网关</div>
                      <div className="pt-0.5">
                        <StatusIndicator
                          status={magpie?.reachable ? 'healthy' : 'offline'}
                          label={magpie?.reachable ? '在线可达' : '未连接'}
                        />
                      </div>
                      <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                        {formatCompactNumber(magpie?.totalModels ?? 0)} 模型 · {providers.length} 渠道
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11.5px] text-[var(--ink-subtle)]">Agent 集群规模</div>
                      <div className="font-mono text-[13px] font-medium text-[var(--ink)] tabular-nums">
                        {a2aState?.summary?.onlineAgents ?? 0} / {a2aState?.summary?.totalAgents ?? a2aAgents.length} 在线
                      </div>
                      <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                        {processes.length} 本地进程 · {fleetNodes.length} 节点
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel
                title="默认 Agent 路由与模型偏好"
                description="设置默认总指挥、编排模式以及主/子 Agent 的推荐模型与思考深度。"
              >
                <form onSubmit={handleSaveRouting} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">默认总指挥 Agent (Lead)</span>
                      <select
                        disabled={readOnly || savingRouting || a2aAgents.length === 0}
                        value={routingDraft.leadAgentId}
                        onChange={(e) => setRoutingDraft((prev) => ({ ...prev, leadAgentId: e.target.value }))}
                        className={cn('w-full h-9 px-3 text-[13px]', inputBaseClass)}
                      >
                        {a2aAgents.length === 0 && <option value="">暂未发现已注册 Agent</option>}
                        {a2aAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.harness} · {agent.nodeName || agent.nodeId})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">默认编排模式</span>
                      <select
                        disabled={readOnly || savingRouting}
                        value={routingDraft.mode}
                        onChange={(e) =>
                          setRoutingDraft((prev) => ({ ...prev, mode: e.target.value as OrchestrationMode }))
                        }
                        className={cn('w-full h-9 px-3 text-[13px]', inputBaseClass)}
                      >
                        {ORCHESTRATION_MODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">主控模型 (Main Model)</span>
                      <input
                        type="text"
                        list="settings-model-presets"
                        disabled={readOnly || savingRouting}
                        value={routingDraft.mainModel}
                        onChange={(e) => setRoutingDraft((prev) => ({ ...prev, mainModel: e.target.value }))}
                        placeholder="gpt-5-codex"
                        className={cn('w-full h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                      />
                    </label>

                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">主控思考深度 (Main Effort)</span>
                      <select
                        disabled={readOnly || savingRouting}
                        value={routingDraft.mainEffort}
                        onChange={(e) =>
                          setRoutingDraft((prev) => ({ ...prev, mainEffort: e.target.value as ReasoningEffort }))
                        }
                        className={cn('w-full h-9 px-3 text-[13px]', inputBaseClass)}
                      >
                        {EFFORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">子任务模型 (Sub Model)</span>
                      <input
                        type="text"
                        list="settings-model-presets"
                        disabled={readOnly || savingRouting}
                        value={routingDraft.subModel}
                        onChange={(e) => setRoutingDraft((prev) => ({ ...prev, subModel: e.target.value }))}
                        placeholder="claude-sonnet-4-6"
                        className={cn('w-full h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                      />
                    </label>

                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">子任务思考深度 (Sub Effort)</span>
                      <select
                        disabled={readOnly || savingRouting}
                        value={routingDraft.subEffort}
                        onChange={(e) =>
                          setRoutingDraft((prev) => ({ ...prev, subEffort: e.target.value as ReasoningEffort }))
                        }
                        className={cn('w-full h-9 px-3 text-[13px]', inputBaseClass)}
                      >
                        {EFFORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <datalist id="settings-model-presets">
                    {modelPresetOptions.map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>

                  <div className="text-[12px] font-mono text-[var(--ink-subtle)]">
                    {modelCatalog
                      ? `在线节点 ${modelCatalog.summary.onlineNodesCount} 台 · 可选模型 ${modelCatalog.summary.uniqueOnlineModels} 个${modelCatalog.summary.offlineNodesCount > 0 ? `（已自动隐藏 ${modelCatalog.summary.offlineNodesCount} 台离线节点模型）` : ''}`
                      : magpieCatalog?.reachable
                        ? `已从 Magpie 网关同步 ${magpieCatalog.totalModels} 个模型，识别 ${magpieCatalog.agentBindings.length} 项 Agent 模型绑定。`
                        : '在线模型目录暂未就绪，当前使用兜底候选列表。'}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <label className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={readOnly || savingRouting}
                        checked={routingDraft.worktreeIsolation}
                        onChange={(e) =>
                          setRoutingDraft((prev) => ({ ...prev, worktreeIsolation: e.target.checked }))
                        }
                        className="accent-[var(--accent)]"
                      />
                      <span>为并行子任务自动启用 Git Worktree 分支隔离</span>
                    </label>

                    <Button type="submit" variant="primary" size="sm" disabled={readOnly || savingRouting}>
                      <Save className="size-3.5" strokeWidth={1.75} />
                      {savingRouting ? '保存中...' : '保存路由偏好'}
                    </Button>
                  </div>
                </form>
              </Panel>

              <Panel
                title="GitHub 仓库同步设置"
                description="配置 Linear 任务板与 GitHub Issues / PR 之间的默认绑定仓库与同步方向。"
                actions={
                  linearState?.githubConfig && (
                    <StatusIndicator
                      status={linearState.githubConfig.hasServerToken ? 'healthy' : 'standby'}
                      label={linearState.githubConfig.hasServerToken ? '服务端 Token 就绪' : '未检测到 Token'}
                    />
                  )
                }
              >
                <form onSubmit={handleSaveGithub} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">仓库 Owner</span>
                      <input
                        type="text"
                        disabled={readOnly || savingGithub}
                        value={githubDraft.owner}
                        onChange={(e) => setGithubDraft((prev) => ({ ...prev, owner: e.target.value }))}
                        placeholder="example-org"
                        className={cn('w-full h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                      />
                    </label>
                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">仓库名 (Repo)</span>
                      <input
                        type="text"
                        disabled={readOnly || savingGithub}
                        value={githubDraft.repo}
                        onChange={(e) => setGithubDraft((prev) => ({ ...prev, repo: e.target.value }))}
                        placeholder="ops-console"
                        className={cn('w-full h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                      />
                    </label>
                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">默认分支</span>
                      <input
                        type="text"
                        disabled={readOnly || savingGithub}
                        value={githubDraft.defaultBranch}
                        onChange={(e) => setGithubDraft((prev) => ({ ...prev, defaultBranch: e.target.value }))}
                        placeholder="main"
                        className={cn('w-full h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">同步方向</span>
                      <select
                        disabled={readOnly || savingGithub}
                        value={githubDraft.syncDirection}
                        onChange={(e) => setGithubDraft((prev) => ({ ...prev, syncDirection: e.target.value }))}
                        className={cn('w-full h-9 px-3 text-[13px]', inputBaseClass)}
                      >
                        {SYNC_DIRECTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-[12.5px]">
                      <span className="text-[var(--ink-muted)]">Token 环境变量名</span>
                      <input
                        type="text"
                        disabled={readOnly || savingGithub}
                        value={githubDraft.tokenEnvVar}
                        onChange={(e) => setGithubDraft((prev) => ({ ...prev, tokenEnvVar: e.target.value }))}
                        placeholder="GITHUB_TOKEN"
                        className={cn('w-full h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-4 text-[13px] text-[var(--ink-muted)]">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={readOnly || savingGithub}
                          checked={githubDraft.enabled}
                          onChange={(e) => setGithubDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
                          className="accent-[var(--accent)]"
                        />
                        <span>启用自动同步</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={readOnly || savingGithub}
                          checked={githubDraft.autoCreatePr}
                          onChange={(e) => setGithubDraft((prev) => ({ ...prev, autoCreatePr: e.target.checked }))}
                          className="accent-[var(--accent)]"
                        />
                        <span>任务完成自动创建 PR</span>
                      </label>
                    </div>

                    <Button type="submit" variant="primary" size="sm" disabled={readOnly || savingGithub}>
                      <Save className="size-3.5" strokeWidth={1.75} />
                      {savingGithub ? '保存中...' : '保存 GitHub 配置'}
                    </Button>
                  </div>
                </form>
              </Panel>
            </div>
          )}

          {activeTab === 'multi-device' && (
            <div className="space-y-6" data-testid="settings-section-multi-device">
              <Panel
                title="Google A2A v0.3 Hub 端点与签名校验"
                description="供其他主机上的 Agent、CLI 探针或第三方编排器通过标准 AgentCard 与 JSON-RPC 接入。"
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {connectProfiles && (
                      <StatusIndicator
                        status={connectProfiles.signingConfigured ? 'healthy' : 'degraded'}
                        label={
                          connectProfiles.signingConfigured
                            ? `HMAC 已配置 (${activeSigningMeta?.keyId || 'default'})`
                            : '临时进程签名'
                        }
                      />
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={verifyingSigning}
                      onClick={() => void handleVerifySigning()}
                      data-testid="verify-a2a-signing-btn"
                    >
                      <ShieldCheck className="size-3.5" strokeWidth={1.75} />
                      {verifyingSigning ? '验证中...' : '验证 HMAC 签名'}
                    </Button>
                  </div>
                }
              >
                {profilesLoading && !connectProfiles ? (
                  <WidgetSkeleton heightClass="h-[110px]" label="正在加载 A2A Hub 端点信息" />
                ) : !connectProfiles ? (
                  <EmptyState
                    message="暂无法获取 A2A Hub 端点配置。"
                    action={{
                      label: '重试加载',
                      onClick: () => void loadConnectProfiles(profileParams),
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--ink-muted)]">
                      <span>
                        协议：<span className="font-mono text-[var(--ink)]">{connectProfiles.protocol}</span>
                      </span>
                      <span className="text-[var(--border)]">/</span>
                      <span>
                        规范版本：<span className="font-mono text-[var(--ink)]">v{connectProfiles.specVersion}</span>
                      </span>
                      <span className="text-[var(--border)]">/</span>
                      <span>
                        互联模式：<span className="font-mono text-[var(--ink)]">{connectProfiles.profiles.length} 套方案</span>
                      </span>
                    </div>

                    {activeSigningMeta && (
                      <div
                        data-testid="a2a-signing-metadata"
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]/45 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12px] font-mono text-[var(--ink-muted)]"
                      >
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            算法：<span className="text-[var(--ink)]">{activeSigningMeta.algorithm}</span>
                          </span>
                          <span>
                            请求头：<span className="text-[var(--ink)]">{activeSigningMeta.header}</span>
                          </span>
                          <span>
                            Key ID：<span className="text-[var(--ink)]">{activeSigningMeta.keyId}</span>
                          </span>
                          <span>
                            密钥来源：<span className="text-[var(--ink)]">{activeSigningMeta.keySource}</span>
                          </span>
                          <span>
                            防重放窗口：<span className="text-[var(--ink)]">{activeSigningMeta.replayWindowSec}s</span>
                          </span>
                        </div>
                        {signingVerifyResult && (
                          <span
                            data-testid="a2a-signing-verify-result"
                            className={cn(
                              'font-medium',
                              signingVerifyResult.valid ? 'text-[var(--ok)]' : 'text-[var(--err)]',
                            )}
                          >
                            {signingVerifyResult.valid
                              ? `自检通过 · sig=${signingVerifyResult.sampleSignaturePrefix || 'ok'}`
                              : `校验失败 · ${signingVerifyResult.reason || 'invalid'}`}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]/50">
                        <div className="min-w-0">
                          <div className="text-[11.5px] text-[var(--ink-subtle)]">Hub AgentCard URL</div>
                          <div
                            className="mt-0.5 font-mono text-[12px] text-[var(--ink)] truncate"
                            title={connectProfiles.hubAgentCardUrl}
                          >
                            {connectProfiles.hubAgentCardUrl}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleCopy('hub-card', connectProfiles.hubAgentCardUrl, 'AgentCard URL')}
                        >
                          {copiedKey === 'hub-card' ? (
                            <Check className="size-3.5 text-[var(--ok)]" strokeWidth={2} />
                          ) : (
                            <Copy className="size-3.5" strokeWidth={1.75} />
                          )}
                          {copiedKey === 'hub-card' ? '已复制' : '复制'}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]/50">
                        <div className="min-w-0">
                          <div className="text-[11.5px] text-[var(--ink-subtle)]">Hub JSON-RPC 端点</div>
                          <div
                            className="mt-0.5 font-mono text-[12px] text-[var(--ink)] truncate"
                            title={connectProfiles.hubRpcUrl}
                          >
                            {connectProfiles.hubRpcUrl}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleCopy('hub-rpc', connectProfiles.hubRpcUrl, 'JSON-RPC 端点')}
                        >
                          {copiedKey === 'hub-rpc' ? (
                            <Check className="size-3.5 text-[var(--ok)]" strokeWidth={2} />
                          ) : (
                            <Copy className="size-3.5" strokeWidth={1.75} />
                          )}
                          {copiedKey === 'hub-rpc' ? '已复制' : '复制'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Panel>

              <Panel
                title={`已注册跨设备 Agent (${a2aAgents.length})`}
                description="自动扫描本机已安装的编码 CLI，或对任意远程节点 Agent 发起 A2A 实时连通性拨测。"
                bodyClassName="p-0"
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={readOnly || scanningLocal}
                      onClick={() => void handleDiscoverLocal()}
                      data-testid="discover-local-agents-btn"
                    >
                      <Search className={cn('size-3.5', scanningLocal && 'animate-spin')} strokeWidth={1.75} />
                      {scanningLocal ? '扫描中...' : '扫描本机 CLI'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={a2aLoading}
                      onClick={() => void loadA2AState()}
                    >
                      <RefreshCw className={cn('size-3.5', a2aLoading && 'animate-spin')} strokeWidth={1.75} />
                      刷新
                    </Button>
                  </div>
                }
              >
                {a2aAgents.length === 0 ? (
                  <EmptyState
                    title="暂未注册跨设备 Agent"
                    message="点击右上角「扫描本机 CLI」自动发现本机工具，或使用下方一键接入命令注册远端节点。"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                          <th className="py-2.5 pl-5 sm:pl-6 pr-3">Agent / Harness</th>
                          <th className="py-2.5 px-3">节点与版本</th>
                          <th className="py-2.5 px-3">模型 / 思考</th>
                          <th className="py-2.5 px-3">连通状态与拨测</th>
                          <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                        {a2aAgents.map((agent) => {
                          const ping = pingResults[agent.id];
                          const isPinging = pingingAgentId === agent.id;
                          const isLead = agent.role === 'lead' || agent.id === a2aState?.leadAgentId;
                          return (
                            <tr
                              key={agent.id}
                              className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                            >
                              <td className="py-2.5 pl-5 sm:pl-6 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[var(--ink)]">{agent.name}</span>
                                  {isLead && (
                                    <span className="font-mono text-[11px] text-[var(--accent)]">
                                      · 总指挥
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                                  {agent.harness} · {agent.protocolVersion || 'A2A v0.3'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="text-[var(--ink)]">{agent.nodeName || agent.nodeId}</div>
                                <div className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                                  {agent.version ? `v${agent.version}` : agent.nodeId}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]">
                                <div className="text-[var(--ink)]">
                                  {agent.magpieModel || agent.modelHint || '继承默认'}
                                </div>
                                <div className="text-[11px] text-[var(--ink-subtle)]">
                                  effort: {agent.magpieEffort || agent.reasoningEffort || 'medium'}
                                  {agent.magpieModel ? ' · Magpie' : ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="space-y-1">
                                  <StatusIndicator
                                    status={
                                      ping
                                        ? ping.reachable
                                          ? 'healthy'
                                          : 'failed'
                                        : agent.status === 'online' || agent.status === 'healthy'
                                          ? 'healthy'
                                          : agent.status === 'offline'
                                            ? 'offline'
                                            : 'standby'
                                    }
                                    label={
                                      ping
                                        ? ping.reachable
                                          ? `可达${ping.latencyMs != null ? ` · ${ping.latencyMs}ms` : ''}`
                                          : '拨测不可达'
                                        : agent.status === 'online' || agent.status === 'healthy'
                                          ? '在线'
                                          : agent.status || '待机'
                                    }
                                  />
                                  {ping && (
                                    <div
                                      className={cn(
                                        'font-mono text-[11px] tabular-nums truncate max-w-[240px]',
                                        ping.reachable ? 'text-[var(--ink-subtle)]' : 'text-[var(--err)]',
                                      )}
                                      title={ping.error || ping.checkedAt}
                                    >
                                      {ping.reachable
                                        ? `检查于 ${formatShortTime(ping.checkedAt)}`
                                        : ping.error || `失败于 ${formatShortTime(ping.checkedAt)}`}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={isPinging}
                                  onClick={() => void handlePingAgent(agent)}
                                  data-testid={`ping-agent-${agent.id}`}
                                >
                                  <Radio className={cn('size-3.5', isPinging && 'animate-pulse')} strokeWidth={1.75} />
                                  {isPinging ? '拨测中...' : '拨测连通性'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel
                title="跨机器接入方案与一键安装命令"
                description="选择适合当前拓扑的组网方案（Tailscale / Cloudflare Tunnel / 局域网），自定义节点参数后一键复制执行。"
              >
                <div className="space-y-5">
                  <form
                    onSubmit={handleRegenerateProfiles}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end pb-4 border-b border-[var(--border-subtle)]"
                  >
                    <label className="block space-y-1 text-[12px]">
                      <span className="text-[var(--ink-muted)]">目标节点 ID（可选）</span>
                      <input
                        type="text"
                        value={profileParams.nodeId}
                        onChange={(e) => setProfileParams((prev) => ({ ...prev, nodeId: e.target.value }))}
                        placeholder="node-macbook-01"
                        className={cn('w-full h-9 px-3 font-mono text-[12px]', inputBaseClass)}
                      />
                    </label>

                    <label className="block space-y-1 text-[12px]">
                      <span className="text-[var(--ink-muted)]">设备类型</span>
                      <select
                        value={profileParams.deviceType}
                        onChange={(e) => setProfileParams((prev) => ({ ...prev, deviceType: e.target.value }))}
                        className={cn('w-full h-9 px-3 text-[12.5px]', inputBaseClass)}
                      >
                        <option value="mac">macOS 工作站</option>
                        <option value="linux">Linux 服务器</option>
                        <option value="docker">Docker 容器</option>
                        <option value="edge">边缘设备</option>
                      </select>
                    </label>

                    <label className="block space-y-1 text-[12px]">
                      <span className="text-[var(--ink-muted)]">Tailscale / 网关地址（可选）</span>
                      <input
                        type="text"
                        value={profileParams.tailscaleHost}
                        onChange={(e) => setProfileParams((prev) => ({ ...prev, tailscaleHost: e.target.value }))}
                        placeholder="100.64.0.10"
                        className={cn('w-full h-9 px-3 font-mono text-[12px]', inputBaseClass)}
                      />
                    </label>

                    <Button type="submit" variant="secondary" size="sm" disabled={profilesLoading} className="h-9">
                      <RefreshCw className={cn('size-3.5', profilesLoading && 'animate-spin')} strokeWidth={1.75} />
                      重新生成命令
                    </Button>
                  </form>

                  {connectProfiles && connectProfiles.profiles.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="选择跨机接入方案">
                        {connectProfiles.profiles.map((profile) => {
                          const isSelected = activeConnectProfile?.id === profile.id;
                          return (
                            <button
                              key={profile.id}
                              type="button"
                              role="tab"
                              aria-selected={isSelected}
                              onClick={() => setSelectedProfileId(profile.id)}
                              data-testid={`connect-profile-${profile.id}`}
                              className={cn(
                                'inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border text-[13px] font-medium cursor-pointer transition-colors duration-150 ease-out',
                                isSelected
                                  ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
                                FOCUS_RING,
                              )}
                            >
                              <span>{profile.name}</span>
                              {profile.recommended && (
                                <span className="font-mono text-[11px] opacity-80">· 推荐</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {activeConnectProfile && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 text-[12.5px]">
                            <div className="space-y-1">
                              <div className="text-[11.5px] font-medium text-[var(--ink-subtle)]">安全模型</div>
                              <div className="text-[var(--ink)] leading-relaxed">
                                {activeConnectProfile.securitySummary}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[11.5px] font-medium text-[var(--ink-subtle)]">适用场景</div>
                              <div className="text-[var(--ink)] leading-relaxed">
                                {activeConnectProfile.whenToUse}
                              </div>
                            </div>
                            <div className="md:col-span-2 pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[12px]">
                              <span className="text-[var(--ink-subtle)]">
                                Hub 接入地址：
                                <span className="ml-1 font-mono text-[var(--ink)]">{activeConnectProfile.hubUrl}</span>
                              </span>
                              <span className="font-mono text-[11.5px] text-[var(--ink-muted)]">
                                {activeConnectProfile.badge}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <CommandSnippet
                              title="1. Hub 端准备工作"
                              command={activeConnectProfile.hubPrepCmd}
                              copyKey={`${activeConnectProfile.id}-hub`}
                              copiedKey={copiedKey}
                              onCopy={(k, t, l) => void handleCopy(k, t, l)}
                            />
                            <CommandSnippet
                              title="2. Linux 节点安装探针并注册"
                              command={activeConnectProfile.linuxInstallCmd}
                              copyKey={`${activeConnectProfile.id}-linux`}
                              copiedKey={copiedKey}
                              onCopy={(k, t, l) => void handleCopy(k, t, l)}
                            />
                            <CommandSnippet
                              title="3. macOS 节点安装探针并注册"
                              command={activeConnectProfile.macosInstallCmd}
                              copyKey={`${activeConnectProfile.id}-macos`}
                              copiedKey={copiedKey}
                              onCopy={(k, t, l) => void handleCopy(k, t, l)}
                            />
                            <CommandSnippet
                              title="4. Docker 容器化接入"
                              command={activeConnectProfile.dockerCmd}
                              copyKey={`${activeConnectProfile.id}-docker`}
                              copiedKey={copiedKey}
                              onCopy={(k, t, l) => void handleCopy(k, t, l)}
                            />
                            {activeConnectProfile.a2aPeerCmd && (
                              <CommandSnippet
                                title="5. A2A Peer 互连注册命令"
                                command={activeConnectProfile.a2aPeerCmd}
                                copyKey={`${activeConnectProfile.id}-peer`}
                                copiedKey={copiedKey}
                                onCopy={(k, t, l) => void handleCopy(k, t, l)}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <WidgetSkeleton heightClass="h-[220px]" label="正在生成跨机接入命令" />
                  )}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'orchestration' && (
            <div className="space-y-6" data-testid="settings-section-orchestration">
              {orchestrationSubTab === 'a2a' ? (
                <A2AOrchestratorSection
                  snapshot={snapshot}
                  readOnly={readOnly}
                  onSnapshotChanged={onSnapshotChanged || noopRefresh}
                  onToast={onToast || noopToast}
                  onConfirm={onConfirm || noopConfirm}
                />
              ) : orchestrationSubTab === 'topology' ? (
                <Panel
                  title="Agent 集群连接拓扑与节点编排"
                  description="融合全节点探针状态与 A2A 路由链路，可视化展示宿主机与主/子 Agent 连接延迟、健康度及 Skill 清单。"
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={a2aLoading}
                      onClick={() => void loadA2AState()}
                      data-testid="topology-refresh-btn"
                    >
                      <RefreshCw className={cn('size-3.5', a2aLoading && 'animate-spin')} strokeWidth={1.75} />
                      刷新拓扑
                    </Button>
                  }
                >
                  {a2aState?.orchestrationConfig ? (
                    <React.Suspense
                      fallback={<WidgetSkeleton heightClass="h-[580px]" label="正在加载集群拓扑视图" />}
                    >
                      <AgentOrchestrationCanvas
                        agents={a2aState.agents}
                        fleetNodes={fleetNodes}
                        skillCatalog={a2aState.skillCatalog}
                        routingRules={a2aState.routingRules}
                        leadAgentId={a2aState.leadAgentId}
                        orchestrationConfig={a2aState.orchestrationConfig}
                        readOnly={readOnly}
                        initialLens="cluster"
                        canvasHeightClass="h-[580px]"
                        onUpdateConfig={handleTopologyUpdateConfig}
                        onSavePositions={handleTopologySavePositions}
                        onUpsertRule={handleTopologyUpsertRule}
                        onDeleteRule={handleTopologyDeleteRule}
                        onUpdateAgent={handleTopologyUpdateAgent}
                        onSetLead={handleTopologySetLead}
                        onDiscoverAgent={handleTopologyDiscover}
                        onToggleSkillAgent={handleTopologyToggleSkill}
                        onInspectLogs={handleJumpToAgentLogs}
                      />
                    </React.Suspense>
                  ) : (
                    <WidgetSkeleton heightClass="h-[580px]" label="正在采集 Agent 集群节点与路由拓扑" />
                  )}
                </Panel>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <Panel
                      title="总指挥分工与编排策略"
                      description="配置谁作为总指挥 Agent、Worktree 隔离分支前缀及自动拆解/审校门禁。"
                    >
                      <form onSubmit={handleSaveCommander} className="space-y-3.5">
                        <label className="block space-y-1 text-[12.5px]">
                          <span className="text-[var(--ink-muted)]">总指挥 Agent (Lead)</span>
                          <select
                            disabled={readOnly}
                            value={commanderDraft.leadAgentId}
                            onChange={(e) =>
                              setCommanderDraft((prev) => ({ ...prev, leadAgentId: e.target.value }))
                            }
                            className={cn('w-full h-10 sm:h-9 px-3 text-[13px]', inputBaseClass)}
                          >
                            {availableAgents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name} ({agent.harness} · {agent.role})
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1 text-[12.5px]">
                          <span className="text-[var(--ink-muted)]">Worktree 隔离分支前缀</span>
                          <input
                            type="text"
                            disabled={readOnly}
                            value={commanderDraft.worktreePrefix}
                            onChange={(e) =>
                              setCommanderDraft((prev) => ({ ...prev, worktreePrefix: e.target.value }))
                            }
                            placeholder="feat/linear-"
                            className={cn('w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                          />
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[12.5px] text-[var(--ink-muted)] pt-1">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={commanderDraft.autoDecompose}
                              onChange={(e) =>
                                setCommanderDraft((prev) => ({ ...prev, autoDecompose: e.target.checked }))
                              }
                              className="accent-[var(--accent)]"
                            />
                            <span>接单自动拆解子任务</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={commanderDraft.autoAssignWorkers}
                              onChange={(e) =>
                                setCommanderDraft((prev) => ({ ...prev, autoAssignWorkers: e.target.checked }))
                              }
                              className="accent-[var(--accent)]"
                            />
                            <span>自动分配 Worker Agent</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={commanderDraft.autoSyncGithub}
                              onChange={(e) =>
                                setCommanderDraft((prev) => ({ ...prev, autoSyncGithub: e.target.checked }))
                              }
                              className="accent-[var(--accent)]"
                            />
                            <span>派发时自动关联 PR</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={commanderDraft.requireDshReview}
                              onChange={(e) =>
                                setCommanderDraft((prev) => ({ ...prev, requireDshReview: e.target.checked }))
                              }
                              className="accent-[var(--accent)]"
                            />
                            <span>交付前强制专家评审</span>
                          </label>
                        </div>

                        <Button type="submit" variant="primary" size="sm" disabled={readOnly || savingCommander}>
                          <Save className="size-3.5" strokeWidth={1.75} />
                          {savingCommander ? '保存中...' : '保存策略'}
                        </Button>
                      </form>
                    </Panel>

                    <Panel title="迭代周期 (Cycles)" description="按故事点追踪当前迭代交付进度。">
                      {cycles.length === 0 ? (
                        <EmptyState message="暂无迭代周期数据。" />
                      ) : (
                        <div className="space-y-4">
                          {cycles.map((cycle) => (
                            <div
                              key={cycle.id}
                              className="space-y-2 pb-4 border-b border-[var(--border-subtle)] last:border-b-0 last:pb-0"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-[14px] font-semibold text-[var(--ink)]">{cycle.name}</div>
                                  <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                                    {cycle.startsAt} → {cycle.endsAt} · {cycle.doneCount}/{cycle.issueCount} 任务
                                  </div>
                                </div>
                                <StatusIndicator
                                  status={cycle.status === 'active' ? 'healthy' : 'standby'}
                                  label={cycle.status === 'active' ? '进行中' : '即将开始'}
                                />
                              </div>
                              <ResourceMeter
                                value={cycle.progressPct}
                                label={`已完成 ${cycle.completedPoints}pt / 总计 ${cycle.scopePoints}pt`}
                                valueText={`${cycle.progressPct}%`}
                                tone={cycle.progressPct >= 50 ? 'ok' : 'warn'}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <Panel title={`项目路线图 (${projects.length})`} className="lg:col-span-7">
                      {projects.length === 0 ? (
                        <EmptyState message="暂无项目路线图数据。" />
                      ) : (
                        <div className="space-y-3.5">
                          {projects.map((proj) => (
                            <div
                              key={proj.id}
                              className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="text-[13.5px] font-semibold text-[var(--ink)]">
                                    <span className="font-mono text-[var(--accent)] mr-1.5">{proj.key}</span>
                                    {proj.name}
                                  </div>
                                  <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                                    仓库 {proj.githubRepo || '未绑定'} · 目标 {proj.targetDate}
                                  </div>
                                </div>
                                <StatusIndicator
                                  status={proj.status === 'in_progress' ? 'healthy' : 'standby'}
                                  label={`${proj.progressPct}%`}
                                />
                              </div>
                              <ResourceMeter
                                value={proj.progressPct}
                                label={`已完成 ${proj.doneCount} / 总计 ${proj.issueCount}`}
                                valueText={`${proj.progressPct}%`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>

                    <Panel title="新增项目" className="lg:col-span-5">
                      <form onSubmit={handleCreateProject} className="space-y-3">
                        <div className="grid grid-cols-3 gap-2.5">
                          <label className="col-span-2 block space-y-1 text-[12.5px]">
                            <span className="text-[var(--ink-muted)]">项目名称 *</span>
                            <input
                              type="text"
                              required
                              disabled={readOnly || creatingProject}
                              value={projectForm.name}
                              onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="例如：边缘节点自动扩缩容"
                              className={cn('w-full h-10 sm:h-9 px-3 text-[13px]', inputBaseClass)}
                            />
                          </label>
                          <label className="block space-y-1 text-[12.5px]">
                            <span className="text-[var(--ink-muted)]">Key</span>
                            <input
                              type="text"
                              disabled={readOnly || creatingProject}
                              value={projectForm.key}
                              onChange={(e) =>
                                setProjectForm((prev) => ({ ...prev, key: e.target.value.toUpperCase() }))
                              }
                              placeholder="EDGE"
                              className={cn('w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                            />
                          </label>
                        </div>

                        <label className="block space-y-1 text-[12.5px]">
                          <span className="text-[var(--ink-muted)]">GitHub 仓库 (owner/repo)</span>
                          <input
                            type="text"
                            disabled={readOnly || creatingProject}
                            value={projectForm.githubRepo}
                            onChange={(e) => setProjectForm((prev) => ({ ...prev, githubRepo: e.target.value }))}
                            placeholder="example-org/ops-console"
                            className={cn('w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                          />
                        </label>

                        <label className="block space-y-1 text-[12.5px]">
                          <span className="text-[var(--ink-muted)]">目标说明</span>
                          <input
                            type="text"
                            disabled={readOnly || creatingProject}
                            value={projectForm.summary}
                            onChange={(e) => setProjectForm((prev) => ({ ...prev, summary: e.target.value }))}
                            placeholder="描述该项目下 Agent 的交付目标..."
                            className={cn('w-full h-10 sm:h-9 px-3 text-[13px]', inputBaseClass)}
                          />
                        </label>

                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={readOnly || creatingProject || !projectForm.name.trim()}
                        >
                          <Plus className="size-3.5" strokeWidth={1.75} />
                          {creatingProject ? '创建中...' : '新增项目'}
                        </Button>
                      </form>
                    </Panel>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'governance' && (
            <div className="space-y-6" data-testid="settings-section-governance">
              {governanceSubTab === 'swarm' ? (
                a2aState?.swarmMetrics && a2aState?.superAgentConfig ? (
                  <SwarmMemorySection
                    agents={a2aState.agents}
                    swarmMetrics={a2aState.swarmMetrics}
                    superAgentConfig={a2aState.superAgentConfig}
                    superAgentTickets={a2aState.superAgentTickets || []}
                    contextSpillNodes={a2aState.contextSpillNodes || []}
                    triggerEvents={a2aState.triggerEvents || []}
                    readOnly={readOnly}
                    onReload={loadA2AState}
                    onOpenAgentLogs={handleJumpToAgentLogs}
                    onToast={onToast}
                  />
                ) : (
                  <WidgetSkeleton heightClass="h-[460px]" label="正在加载蜂群协同引擎" />
                )
              ) : governanceSubTab === 'guardrails' ? (
                <AiGovernanceSection readOnly={readOnly} onToast={onToast} />
              ) : (
                <AgentLogsSection
                  agents={a2aState?.agents || []}
                  initialAgentId={focusedLogAgentId}
                  readOnly={readOnly}
                  onToast={onToast}
                  onDataMutated={() => void loadA2AState()}
                />
              )}
            </div>
          )}

          {activeTab === 'gateway' && (
            <div className="space-y-6" data-testid="settings-section-gateway">
              {summary && (
                <KpiStrip
                  asymmetric
                  cells={[
                    {
                      label: '24h 估算成本与预算水位',
                      meta: `日预算 $${summary.dailyBudgetUsd.toFixed(0)}`,
                      value: `$${summary.estimatedCostUsd24h.toFixed(2)}`,
                      ratioPct: budgetPct,
                      sub: `累计 ${formatCompactNumber(summary.totalTokens)} Tokens · 缓存命中 ${summary.cacheHitPct}%`,
                      tone: budgetPct >= 85 ? 'warn' : 'ok',
                    },
                    {
                      label: '24h 网关请求量',
                      value: formatCompactNumber(summary.totalRequests),
                      numeric: { primary: summary.totalRequests },
                      sub: `异常率 ${summary.errorRatePct}% (429/5xx)`,
                      tone: summary.errorRatePct > 2 ? 'warn' : 'ok',
                    },
                    {
                      label: '平均 TTFT 首字延迟',
                      value: `${summary.avgTtftMs}ms`,
                      numeric: { primary: summary.avgTtftMs, suffix: 'ms' },
                      sub: `P95 端到端 ${summary.p95LatencyMs}ms`,
                    },
                    {
                      label: '活跃 Agent 会话',
                      value: String(telemetry?.sessions?.length ?? 0),
                      numeric: { primary: telemetry?.sessions?.length ?? 0 },
                      sub: `${processes.length} 个宿主机进程在线`,
                    },
                  ]}
                />
              )}

              {telemetry && telemetry.hourly.length > 0 && (
                <Panel
                  title="模型网关 24h 吞吐与延迟遥测"
                  description="追踪 Prompt / Completion Token 消耗趋势及 TTFT / P95 尾延迟。"
                  actions={
                    <SegmentedFilter
                      value={chartMode}
                      onChange={setChartMode}
                      options={TELEMETRY_MODES}
                      ariaLabel="切换网关图表维度"
                    />
                  }
                >
                  <div className="h-[220px] w-full" data-testid="gateway-telemetry-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={telemetry.hourly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gwPrimaryFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="gwSecondaryFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--ok-dot)" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="var(--ok-dot)" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="ts"
                          tickFormatter={(value) => formatHourLabel(Number(value))}
                          tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={28}
                        />
                        <YAxis
                          tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => (chartMode === 'tokens' ? `${value}K` : `${value}ms`)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--surface-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            fontSize: '12px',
                            color: 'var(--ink)',
                          }}
                          labelFormatter={(label) => formatHourLabel(Number(label))}
                        />
                        {chartMode === 'tokens' ? (
                          <>
                            <Area
                              type="monotone"
                              dataKey="promptK"
                              name="Prompt (K)"
                              stroke="var(--accent)"
                              strokeWidth={1.75}
                              fill="url(#gwPrimaryFill)"
                              isAnimationActive={false}
                            />
                            <Area
                              type="monotone"
                              dataKey="completionK"
                              name="Completion (K)"
                              stroke="var(--ok-dot)"
                              strokeWidth={1.75}
                              fill="url(#gwSecondaryFill)"
                              isAnimationActive={false}
                            />
                          </>
                        ) : (
                          <>
                            <Area
                              type="monotone"
                              dataKey="p95Ms"
                              name="P95 延迟 (ms)"
                              stroke="var(--warn-dot)"
                              strokeWidth={1.75}
                              fill="url(#gwPrimaryFill)"
                              isAnimationActive={false}
                            />
                            <Area
                              type="monotone"
                              dataKey="ttftMs"
                              name="TTFT 首字 (ms)"
                              stroke="var(--accent)"
                              strokeWidth={1.75}
                              fill="url(#gwSecondaryFill)"
                              isAnimationActive={false}
                            />
                          </>
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              )}

              {telemetry && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <Panel
                    className="lg:col-span-7"
                    bodyClassName="p-0"
                    title="上游 Provider 成本与熔断状态"
                    description="监控各模型供应商的请求占比、平均 TTFT 与熔断器状态。"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                            <th className="py-2.5 pl-5 sm:pl-6 pr-3">Provider</th>
                            <th className="py-2.5 px-3">熔断器</th>
                            <th className="py-2.5 px-3 text-right">请求 / Token</th>
                            <th className="py-2.5 px-3 text-right">TTFT</th>
                            <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">24h 成本</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                          {telemetry.providers.map((provider) => {
                            const sharePct =
                              totalProviderCost > 0
                                ? Math.round(((provider.costUsd || 0) / totalProviderCost) * 100)
                                : 0;
                            return (
                              <tr
                                key={provider.name}
                                className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                              >
                                <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)]">
                                  {provider.name}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <StatusIndicator
                                    status={
                                      provider.circuitState === 'closed'
                                        ? 'healthy'
                                        : provider.circuitState === 'half-open'
                                          ? 'degraded'
                                          : 'failed'
                                    }
                                    label={
                                      provider.circuitState === 'closed'
                                        ? '闭合正常'
                                        : provider.circuitState === 'half-open'
                                          ? '半开探活'
                                          : '已熔断'
                                    }
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                                  {formatCompactNumber(provider.requests)} · {provider.tokensK}K
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                                  {provider.avgTtftMs}ms
                                </td>
                                <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12.5px] font-medium text-[var(--ink)] tabular-nums whitespace-nowrap">
                                  <div className="inline-flex flex-col items-end gap-1 min-w-[82px]">
                                    <span>
                                      ${provider.costUsd.toFixed(2)}
                                      <span className="ml-1 text-[11px] font-normal text-[var(--ink-subtle)]">
                                        {sharePct}%
                                      </span>
                                    </span>
                                    <span className="w-16 h-[2px] rounded-full bg-[var(--border-subtle)] overflow-hidden">
                                      <span
                                        className="block h-full bg-[var(--accent)]"
                                        style={{ width: `${Math.min(100, sharePct)}%` }}
                                      />
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Panel>

                  <Panel
                    className="lg:col-span-5"
                    title="本地推理加速器 (MLX / GPU)"
                    description="监控统一内存 / 显存水位、温度及常驻本地模型。"
                  >
                    {telemetry.accelerators.length === 0 ? (
                      <EmptyState message="未检测到本地推理加速器。" />
                    ) : (
                      <div className="space-y-4">
                        {telemetry.accelerators.map((acc) => {
                          const vramPct =
                            acc.vramTotalGb > 0 ? Math.round((acc.vramUsedGb / acc.vramTotalGb) * 100) : 0;
                          return (
                            <div key={acc.id} className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 font-medium text-[13.5px] text-[var(--ink)]">
                                    <Cpu className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
                                    <span className="truncate">{acc.name}</span>
                                  </div>
                                  <div className="mt-0.5 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                                    {acc.backend} · {acc.tempC}°C
                                  </div>
                                </div>
                                <span className="font-mono text-[12px] font-medium text-[var(--ink)] tabular-nums shrink-0">
                                  计算 {acc.utilizationPct}%
                                </span>
                              </div>
                              <ResourceMeter
                                label="显存 / 统一内存"
                                value={vramPct}
                                valueText={`${acc.vramUsedGb} / ${acc.vramTotalGb} GB (${vramPct}%)`}
                              />
                              {acc.activeModels.length > 0 && (
                                <div
                                  className="font-mono text-[11.5px] text-[var(--ink-muted)] truncate"
                                  title={acc.activeModels.join(', ')}
                                >
                                  常驻模型：{acc.activeModels.join(' · ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                </div>
              )}

              {telemetry && telemetry.sessions.length > 0 && (
                <Panel
                  title="活跃 Agent 会话与上下文水位"
                  description="追踪自主代理会话、工具调用成功率与上下文窗口占用。"
                  bodyClassName="p-0"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                          <th className="py-2.5 pl-5 sm:pl-6 pr-3">会话 / Agent</th>
                          <th className="py-2.5 px-3">当前模型</th>
                          <th className="py-2.5 px-3">状态</th>
                          <th className="py-2.5 px-3">上下文水位</th>
                          <th className="py-2.5 px-3 text-right">工具调用</th>
                          <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">时长 / 内存</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                        {telemetry.sessions.map((session) => (
                          <tr
                            key={session.id}
                            className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                          >
                            <td className="py-2.5 pl-5 sm:pl-6 pr-3">
                              <div className="font-medium text-[var(--ink)]">{session.agent}</div>
                              <div className="font-mono text-[11.5px] text-[var(--ink-subtle)]">{session.id}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]">
                              {session.model}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <StatusIndicator
                                status={session.state === 'running' ? 'healthy' : 'standby'}
                                label={session.state === 'running' ? '推理中' : '待机'}
                              />
                            </td>
                            <td className="py-2.5 px-3 min-w-[140px]">
                              <ResourceMeter
                                value={session.contextPct}
                                valueText={`${session.contextPct}%`}
                                tone={session.contextPct >= 80 ? 'warn' : 'ok'}
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                              {session.toolCalls} 次
                              {session.failedTools > 0 && (
                                <span className="ml-1 text-[var(--err)]">({session.failedTools} 失败)</span>
                              )}
                            </td>
                            <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
                              {formatUptime(session.uptimeSec)} · {session.memoryMb}MB
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              )}

              <Panel
                title="Agent 路由与模型分发图谱"
                description="点击任意 Agent 运行时进程组即可快速筛选下方进程列表。"
              >
                <React.Suspense
                  fallback={<WidgetSkeleton heightClass="h-[400px]" label="正在加载 Agent 分发图谱" />}
                >
                  <ArchitectureGraph
                    snapshot={snapshot}
                    mode="agents"
                    onSelectAgentCategory={onSelectCategory}
                  />
                </React.Suspense>
              </Panel>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <Panel
                  className="lg:col-span-6"
                  title="Magpie 模型供给分布"
                  description={magpie?.protocol || 'OpenAI Compatible /v1/models'}
                  actions={<StatusIndicator status={magpie?.status || (magpie?.reachable ? 'healthy' : 'offline')} />}
                >
                  {providers.length === 0 ? (
                    <EmptyState message="暂无可用的模型渠道目录。" />
                  ) : (
                    <div className="space-y-3.5">
                      {providers.map((provider) => (
                        <ResourceMeter
                          key={provider.name}
                          label={provider.name}
                          value={(provider.count / totalModels) * 100}
                          valueText={`${formatCompactNumber(provider.count)} 模型`}
                          tone="ok"
                        />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
                  className="lg:col-span-6"
                  title="注册 Agent 与共享 MCP 库"
                  description="异步采集自 Magpie 网关注册表与 MCP Hub。"
                >
                  <div className="space-y-4">
                    {registeredMagpieAgents.length > 0 ? (
                      <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                        {registeredMagpieAgents.slice(0, 6).map((item, idx) => (
                          <li
                            key={item.id || item.name || idx}
                            className="py-2.5 first:pt-0 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1 flex items-baseline gap-2">
                              <span className="font-medium text-[var(--ink)] truncate" title={item.name || item.id}>
                                {item.name || item.id}
                              </span>
                              {item.model && (
                                <span
                                  className="font-mono text-[12px] text-[var(--ink-subtle)] truncate"
                                  title={item.model}
                                >
                                  {item.model}
                                </span>
                              )}
                            </div>
                            <StatusIndicator status={item.status || (item.active === false ? 'standby' : 'healthy')} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[13px] text-[var(--ink-subtle)]">未发现已注册的 Magpie Agent 桥接。</p>
                    )}
                  </div>
                </Panel>
              </div>

              <Panel
                title="本地活跃 Agent 进程"
                description="实时发现宿主机正在运行的编码与编排 Agent 进程。"
                bodyClassName="p-0"
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-52">
                      <Search
                        className="size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        strokeWidth={1.75}
                      />
                      <input
                        type="search"
                        value={procQuery}
                        onChange={(e) => setProcQuery(e.target.value)}
                        placeholder="过滤 PID 或命令行..."
                        aria-label="过滤 Agent 进程"
                        className={cn('h-9 sm:h-8 w-full pl-8 pr-2.5', inputBaseClass)}
                      />
                    </div>
                    {selectedPid != null && onSelectPid && (
                      <button
                        type="button"
                        data-testid="clear-pid-filter"
                        onClick={() => onSelectPid(null)}
                        className={cn(
                          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[12.5px] font-mono font-medium text-[var(--accent)] cursor-pointer select-none',
                          FOCUS_RING,
                        )}
                      >
                        <span className="tabular-nums">PID {selectedPid}</span>
                        <X className="size-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                    {selectedCategory && onSelectCategory && (
                      <button
                        type="button"
                        onClick={() => onSelectCategory('')}
                        className={cn(
                          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[12.5px] font-medium text-[var(--ink)] cursor-pointer select-none',
                          FOCUS_RING,
                        )}
                      >
                        <span>筛选：{selectedCategory}</span>
                        <X className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                }
              >
                {filteredProcesses.length === 0 ? (
                  <EmptyState
                    title="未匹配到活跃进程"
                    message="当前主机没有匹配到活跃 Agent 进程。"
                    action={
                      selectedCategory || selectedPid != null || procQuery.trim()
                        ? {
                            label: '清除筛选',
                            onClick: () => {
                              setProcQuery('');
                              onSelectCategory?.('');
                              onSelectPid?.(null);
                            },
                          }
                        : undefined
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                          <th className="py-2.5 pl-5 sm:pl-6 pr-3">
                            <button
                              type="button"
                              onClick={() => toggleProcSort('pid')}
                              className={cn(
                                'inline-flex items-center gap-1 hover:text-[var(--ink)] cursor-pointer',
                                FOCUS_RING,
                              )}
                            >
                              PID
                              {renderProcSortIcon('pid')}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">分类</th>
                          <th className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => toggleProcSort('cpu')}
                              className={cn(
                                'inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] cursor-pointer',
                                FOCUS_RING,
                              )}
                            >
                              CPU
                              {renderProcSortIcon('cpu')}
                            </button>
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => toggleProcSort('mem')}
                              className={cn(
                                'inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] cursor-pointer',
                                FOCUS_RING,
                              )}
                            >
                              内存
                              {renderProcSortIcon('mem')}
                            </button>
                          </th>
                          <th className="py-2.5 pl-3 pr-5 sm:pr-6">命令行</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                        {filteredProcesses.map((proc) => {
                          const isPidSelected = selectedPid === proc.pid;
                          return (
                            <tr
                              key={proc.pid}
                              ref={(el) => {
                                rowRefs.current[proc.pid] = el;
                              }}
                              data-pid={proc.pid}
                              data-selected-pid={isPidSelected ? 'true' : undefined}
                              className={cn(
                                'transition-colors duration-150 ease-out',
                                isPidSelected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)]',
                              )}
                            >
                              <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12.5px] font-medium text-[var(--ink)] tabular-nums">
                                {proc.pid}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-[var(--ink)] whitespace-nowrap">
                                {proc.categoryLabel || proc.category || 'Agent'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[12.5px] text-[var(--ink)] tabular-nums whitespace-nowrap">
                                {proc.cpu != null ? `${Number(proc.cpu).toFixed(1)}%` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                                {formatBytes(proc.memoryBytes ?? proc.rssBytes)}
                              </td>
                              <td
                                className="py-2.5 pl-3 pr-5 sm:pr-6 font-mono text-[12px] text-[var(--ink-muted)] max-w-[460px] truncate"
                                title={proc.cmd || proc.command}
                              >
                                {proc.cmd || proc.command || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>
    </ModuleFrame>
  );
}

export default AgentSettingsView;
