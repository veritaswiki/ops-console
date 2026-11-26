import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDown, ArrowUp, ArrowUpDown, Cpu, Plus, RefreshCw, Save, Search, X } from 'lucide-react';
import type {
  A2AAgentPeer,
  A2ASkillCatalogItem,
  A2AStateResponse,
  GatewayTelemetryResponse,
  LinearStateResponse,
  ReasoningEffort,
  SnapshotResponse,
} from '../types';
import {
  createLinearProject,
  deleteA2ARoutingRule,
  discoverA2AAgent,
  fetchA2AState,
  fetchGatewayTelemetry,
  fetchLinearState,
  saveA2ATopologyPositions,
  setLeadA2AAgent,
  updateA2AAgent,
  updateA2AOrchestrationConfig,
  updateA2ASkill,
  updateLinearCommander,
  upsertA2ARoutingRule,
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
import { AiGovernanceSection } from '../components/AiGovernanceSection';
import { SwarmMemorySection } from '../components/SwarmMemorySection';
import { ModuleFrame } from '../modules/ModuleFrame';

const ArchitectureGraph = React.lazy(() =>
  import('../components/ArchitectureGraph').then((m) => ({ default: m.ArchitectureGraph })),
);

const AgentOrchestrationCanvas = React.lazy(() =>
  import('../components/AgentOrchestrationCanvas').then((m) => ({ default: m.AgentOrchestrationCanvas })),
);

const SETTINGS_TABS = [
  { value: 'roles', label: '分工与迭代' },
  { value: 'a2a', label: 'A2A 路由' },
  { value: 'topology', label: '集群拓扑' },
  { value: 'swarm', label: '蜂群引擎' },
  { value: 'governance', label: '安全护栏' },
  { value: 'logs', label: '协作日志' },
  { value: 'gateway', label: '网关与进程' },
] as const;

export type AgentSettingsTab = (typeof SETTINGS_TABS)[number]['value'];

const TELEMETRY_MODES = [
  { value: 'tokens', label: 'Token 吞吐 (K)' },
  { value: 'latency', label: 'TTFT / P95 延迟 (ms)' },
] as const;

type TelemetryMode = (typeof TELEMETRY_MODES)[number]['value'];

function formatHourLabel(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

export function AgentSettingsView({
  snapshot,
  readOnly = false,
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
  const rowRefs = React.useRef<Record<number, HTMLTableRowElement | null>>({});

  const [activeTab, setActiveTab] = React.useState<AgentSettingsTab>(
    selectedPid != null || Boolean(selectedCategory) ? 'gateway' : 'roles',
  );
  const [telemetry, setTelemetry] = React.useState<GatewayTelemetryResponse | null>(null);
  const [topologyState, setTopologyState] = React.useState<A2AStateResponse | null>(null);
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [topologyLoading, setTopologyLoading] = React.useState(false);
  const [focusedLogAgentId, setFocusedLogAgentId] = React.useState<string>('all');
  const [chartMode, setChartMode] = React.useState<TelemetryMode>('tokens');
  const [procQuery, setProcQuery] = React.useState('');
  const [procSort, setProcSort] = React.useState<'cpu' | 'mem' | 'pid'>('cpu');
  const [procSortDir, setProcSortDir] = React.useState<'asc' | 'desc'>('desc');

  // Commander & Project forms (for 'roles' tab)
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

  React.useEffect(() => {
    if (selectedPid != null || selectedCategory) {
      setActiveTab('gateway');
    }
  }, [selectedPid, selectedCategory]);

  const loadLinear = React.useCallback(async () => {
    try {
      const lin = await fetchLinearState();
      setLinearState(lin);
      setCommanderDraft({
        leadAgentId: lin.commander.leadAgentId || lin.availableAgents[0]?.id || '',
        worktreePrefix: lin.commander.worktreePrefix || 'feat/linear-',
        autoDecompose: lin.commander.autoDecompose,
        autoAssignWorkers: lin.commander.autoAssignWorkers,
        autoSyncGithub: lin.commander.autoSyncGithub,
        requireDshReview: lin.commander.requireDshReview,
      });
    } catch {
      // Non-blocking
    }
  }, []);

  const loadTopologyState = React.useCallback(
    async (signal?: AbortSignal) => {
      setTopologyLoading(true);
      try {
        const res = await fetchA2AState(signal);
        if (!signal?.aborted) setTopologyState(res);
      } catch (err) {
        if (!signal?.aborted) {
          onToast?.(`加载 Agent 状态失败：${(err as Error).message}`, 'err');
        }
      } finally {
        if (!signal?.aborted) setTopologyLoading(false);
      }
    },
    [onToast],
  );

  React.useEffect(() => {
    if (activeTab === 'roles') {
      void loadLinear();
    }
    if (activeTab === 'topology' || activeTab === 'swarm' || activeTab === 'logs') {
      const controller = new AbortController();
      void loadTopologyState(controller.signal);
      return () => controller.abort();
    }
  }, [activeTab, loadLinear, loadTopologyState]);

  React.useEffect(() => {
    if (activeTab !== 'gateway') return;
    const controller = new AbortController();
    fetchGatewayTelemetry(controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setTelemetry(res);
      })
      .catch(() => {
        // Non-blocking secondary telemetry
      });
    return () => controller.abort();
  }, [activeTab]);

  React.useEffect(() => {
    if (selectedPid != null && rowRefs.current[selectedPid]) {
      rowRefs.current[selectedPid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPid]);

  const handleSaveCommander = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await loadLinear();
      onSnapshotChanged?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '保存总指挥策略失败', 'err');
    } finally {
      setSavingCommander(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setActiveTab('logs');
  }, []);

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
    const q = procQuery.trim().toLowerCase();
    if (q) {
      base = base.filter((p) => {
        const hay = `${p.pid} ${p.categoryLabel || p.category || ''} ${p.cmd || p.command || ''}`.toLowerCase();
        return hay.includes(q);
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
    () => (telemetry?.providers || []).reduce((sum, p) => sum + (p.costUsd || 0), 0),
    [telemetry?.providers],
  );

  const providers = magpie?.providers || [];
  const totalModels = magpie?.totalModels || providers.reduce((sum, p) => sum + p.count, 0) || 1;
  const agents = magpie?.agents || [];

  const summary = telemetry?.summary;
  const budgetPct =
    summary && summary.dailyBudgetUsd > 0
      ? Math.min(100, Math.round((summary.estimatedCostUsd24h / summary.dailyBudgetUsd) * 100))
      : 0;

  const noopToast = React.useCallback(() => {}, []);
  const noopConfirm = React.useCallback(() => {}, []);
  const noopRefresh = React.useCallback(() => {}, []);
  const fleetNodes = snapshot?.fleet?.nodes || [];

  const handleTopologyUpdateConfig = async (patch: Record<string, unknown>) => {
    if (readOnly) return;
    try {
      await updateA2AOrchestrationConfig(patch);
      await loadTopologyState();
      onToast?.('编排调度策略已更新并持久化', 'ok');
    } catch (err) {
      onToast?.(`更新策略失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologySavePositions = async (positions: Record<string, { x: number; y: number }>) => {
    if (readOnly) return;
    try {
      await saveA2ATopologyPositions(positions);
      await loadTopologyState();
    } catch (err) {
      onToast?.(`保存节点排版失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyUpsertRule = async (payload: Parameters<typeof upsertA2ARoutingRule>[0]) => {
    if (readOnly) return;
    try {
      const res = await upsertA2ARoutingRule(payload);
      onToast?.(`已保存路由策略「${res.rule.name}」`, 'ok');
      await loadTopologyState();
    } catch (err) {
      onToast?.(`保存路由失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyDeleteRule = async (ruleId: string) => {
    if (readOnly) return;
    try {
      await deleteA2ARoutingRule(ruleId);
      onToast?.('已移除路由边', 'ok');
      await loadTopologyState();
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
      await loadTopologyState();
    } catch (err) {
      onToast?.(`更新 Agent 参数失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologySetLead = async (agentId: string) => {
    if (readOnly) return;
    try {
      const res = await setLeadA2AAgent(agentId);
      onToast?.(`已选举「${res.leadAgent?.name || agentId}」为当前总指挥`, 'ok');
      await loadTopologyState();
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
      await loadTopologyState();
    } catch (err) {
      onToast?.(`探活失败：${(err as Error).message}`, 'err');
    }
  };

  const handleTopologyToggleSkill = async (skill: A2ASkillCatalogItem, agentId: string) => {
    if (readOnly) return;
    try {
      await updateA2ASkill(skill.id, { toggleAgentId: agentId });
      await loadTopologyState();
    } catch (err) {
      onToast?.(`更新 Skill 挂载失败：${(err as Error).message}`, 'err');
    }
  };

  const cycles = linearState?.cycles || [];
  const projects = linearState?.projects || [];
  const availableAgents = linearState?.availableAgents || [];

  return (
    <ModuleFrame
      title="Agent 设置与高级编排"
      description="集中管理总指挥分工、迭代路线图、A2A 路由规则、集群拓扑、蜂群引擎、AI 安全护栏及模型网关。"
      meta={
        magpie?.reachable
          ? `${formatCompactNumber(magpie.totalModels ?? 0)} 模型 · ${processes.length} 活跃进程`
          : `${processes.length} 活跃进程`
      }
      actions={
        <SegmentedFilter
          value={activeTab}
          onChange={setActiveTab}
          options={SETTINGS_TABS}
          ariaLabel="切换 Agent 高级设置分组"
        />
      }
      testId="view-agent-settings"
    >
      {activeTab === 'roles' ? (
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
                    disabled={readOnly || savingCommander}
                    value={commanderDraft.leadAgentId}
                    onChange={(e) => setCommanderDraft((d) => ({ ...d, leadAgentId: e.target.value }))}
                    className={cn('ui-select w-full h-10 sm:h-9 pl-3 text-[13px] cursor-pointer', inputBaseClass)}
                  >
                    {availableAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.harness} · {a.modelHint || 'auto'})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1 text-[12.5px]">
                  <span className="text-[var(--ink-muted)]">Git Worktree 分支前缀</span>
                  <input
                    type="text"
                    disabled={readOnly || savingCommander}
                    value={commanderDraft.worktreePrefix}
                    onChange={(e) => setCommanderDraft((d) => ({ ...d, worktreePrefix: e.target.value }))}
                    className={cn('w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[12.5px] text-[var(--ink-muted)]">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={commanderDraft.autoDecompose}
                      onChange={(e) => setCommanderDraft((d) => ({ ...d, autoDecompose: e.target.checked }))}
                      className="accent-[var(--accent)]"
                    />
                    <span>接单自动拆解子任务</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={commanderDraft.autoAssignWorkers}
                      onChange={(e) => setCommanderDraft((d) => ({ ...d, autoAssignWorkers: e.target.checked }))}
                      className="accent-[var(--accent)]"
                    />
                    <span>自动分配 Worker Agent</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={commanderDraft.autoSyncGithub}
                      onChange={(e) => setCommanderDraft((d) => ({ ...d, autoSyncGithub: e.target.checked }))}
                      className="accent-[var(--accent)]"
                    />
                    <span>派发时自动关联 PR</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={commanderDraft.requireDshReview}
                      onChange={(e) => setCommanderDraft((d) => ({ ...d, requireDshReview: e.target.checked }))}
                      className="accent-[var(--accent)]"
                    />
                    <span>交付前强制专家评审</span>
                  </label>
                </div>

                <Button type="submit" variant="primary" size="sm" disabled={readOnly || savingCommander}>
                  <Save className="size-3.5" />
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
                      <StatusIndicator status={proj.status === 'in_progress' ? 'healthy' : 'standby'} label={`${proj.progressPct}%`} />
                    </div>
                    <ResourceMeter
                      value={proj.progressPct}
                      label={`已完成 ${proj.doneCount} / 总计 ${proj.issueCount}`}
                      valueText={`${proj.progressPct}%`}
                    />
                  </div>
                ))}
              </div>
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
                      onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
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
                      onChange={(e) => setProjectForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))}
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
                    onChange={(e) => setProjectForm((f) => ({ ...f, githubRepo: e.target.value }))}
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
                    onChange={(e) => setProjectForm((f) => ({ ...f, summary: e.target.value }))}
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
                  <Plus className="size-3.5" />
                  {creatingProject ? '创建中...' : '新增项目'}
                </Button>
              </form>
            </Panel>
          </div>
        </div>
      ) : activeTab === 'a2a' ? (
        <A2AOrchestratorSection
          snapshot={snapshot}
          readOnly={readOnly}
          onSnapshotChanged={onSnapshotChanged || noopRefresh}
          onToast={onToast || noopToast}
          onConfirm={onConfirm || noopConfirm}
        />
      ) : activeTab === 'topology' ? (
        <Panel
          title="Agent 集群连接拓扑与节点编排"
          description="融合全节点探针状态与 A2A 路由链路，可视化展示宿主机与主/子 Agent 连接延迟、健康度及 Skill 清单。"
          actions={
            <Button
              variant="secondary"
              size="sm"
              disabled={topologyLoading}
              onClick={() => void loadTopologyState()}
              data-testid="topology-refresh-btn"
            >
              <RefreshCw className={cn('size-3.5', topologyLoading && 'animate-spin')} strokeWidth={1.75} />
              刷新拓扑
            </Button>
          }
        >
          {topologyState?.orchestrationConfig ? (
            <React.Suspense
              fallback={<WidgetSkeleton heightClass="h-[580px]" label="正在加载集群拓扑视图" />}
            >
              <AgentOrchestrationCanvas
                agents={topologyState.agents}
                fleetNodes={fleetNodes}
                skillCatalog={topologyState.skillCatalog}
                routingRules={topologyState.routingRules}
                leadAgentId={topologyState.leadAgentId}
                orchestrationConfig={topologyState.orchestrationConfig}
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
      ) : activeTab === 'swarm' ? (
        topologyState?.swarmMetrics && topologyState?.superAgentConfig ? (
          <SwarmMemorySection
            agents={topologyState.agents}
            swarmMetrics={topologyState.swarmMetrics}
            superAgentConfig={topologyState.superAgentConfig}
            superAgentTickets={topologyState.superAgentTickets || []}
            contextSpillNodes={topologyState.contextSpillNodes || []}
            triggerEvents={topologyState.triggerEvents || []}
            readOnly={readOnly}
            onReload={loadTopologyState}
            onOpenAgentLogs={handleJumpToAgentLogs}
            onToast={onToast}
          />
        ) : (
          <WidgetSkeleton heightClass="h-[460px]" label="正在加载蜂群协同引擎" />
        )
      ) : activeTab === 'governance' ? (
        <AiGovernanceSection readOnly={readOnly} onToast={onToast} />
      ) : activeTab === 'logs' ? (
        <AgentLogsSection
          agents={topologyState?.agents || []}
          initialAgentId={focusedLogAgentId}
          readOnly={readOnly}
          onToast={onToast}
          onDataMutated={() => void loadTopologyState()}
        />
      ) : (
        <>
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
                      tickFormatter={(v) => formatHourLabel(Number(v))}
                      tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      tick={{ fill: 'var(--ink-subtle)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (chartMode === 'tokens' ? `${v}K` : `${v}ms`)}
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
                      {telemetry.providers.map((p) => {
                        const sharePct =
                          totalProviderCost > 0
                            ? Math.round(((p.costUsd || 0) / totalProviderCost) * 100)
                            : 0;
                        return (
                          <tr
                            key={p.name}
                            className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                          >
                            <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)]">{p.name}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <StatusIndicator
                                status={
                                  p.circuitState === 'closed'
                                    ? 'healthy'
                                    : p.circuitState === 'half-open'
                                      ? 'degraded'
                                      : 'failed'
                                }
                                label={
                                  p.circuitState === 'closed'
                                    ? '闭合正常'
                                    : p.circuitState === 'half-open'
                                      ? '半开探活'
                                      : '已熔断'
                                }
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                              {formatCompactNumber(p.requests)} · {p.tokensK}K
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                              {p.avgTtftMs}ms
                            </td>
                            <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12.5px] font-medium text-[var(--ink)] tabular-nums whitespace-nowrap">
                              <div className="inline-flex flex-col items-end gap-1 min-w-[82px]">
                                <span>
                                  ${p.costUsd.toFixed(2)}
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
                    {telemetry.sessions.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                      >
                        <td className="py-2.5 pl-5 sm:pl-6 pr-3">
                          <div className="font-medium text-[var(--ink)]">{s.agent}</div>
                          <div className="font-mono text-[11.5px] text-[var(--ink-subtle)]">{s.id}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]">{s.model}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <StatusIndicator
                            status={s.state === 'running' ? 'healthy' : 'standby'}
                            label={s.state === 'running' ? '推理中' : '待机'}
                          />
                        </td>
                        <td className="py-2.5 px-3 min-w-[140px]">
                          <ResourceMeter
                            value={s.contextPct}
                            valueText={`${s.contextPct}%`}
                            tone={s.contextPct >= 80 ? 'warn' : 'ok'}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                          {s.toolCalls} 次
                          {s.failedTools > 0 && (
                            <span className="ml-1 text-[var(--err)]">({s.failedTools} 失败)</span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
                          {formatUptime(s.uptimeSec)} · {s.memoryMb}MB
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
            <React.Suspense fallback={<WidgetSkeleton heightClass="h-[400px]" label="正在加载 Agent 分发图谱" />}>
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
                  {providers.map((p) => (
                    <ResourceMeter
                      key={p.name}
                      label={p.name}
                      value={(p.count / totalModels) * 100}
                      valueText={`${formatCompactNumber(p.count)} 模型`}
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
                {agents.length > 0 ? (
                  <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {agents.slice(0, 6).map((a, i) => (
                      <li key={a.id || a.name || i} className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 flex items-baseline gap-2">
                          <span className="font-medium text-[var(--ink)] truncate" title={a.name || a.id}>
                            {a.name || a.id}
                          </span>
                          {a.model && (
                            <span className="font-mono text-[12px] text-[var(--ink-subtle)] truncate" title={a.model}>
                              {a.model}
                            </span>
                          )}
                        </div>
                        <StatusIndicator status={a.status || (a.active === false ? 'standby' : 'healthy')} />
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
                          className={cn('inline-flex items-center gap-1 hover:text-[var(--ink)] cursor-pointer', FOCUS_RING)}
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
                          className={cn('inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] cursor-pointer', FOCUS_RING)}
                        >
                          CPU
                          {renderProcSortIcon('cpu')}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleProcSort('mem')}
                          className={cn('inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] cursor-pointer', FOCUS_RING)}
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
        </>
      )}
    </ModuleFrame>
  );
}

export default AgentSettingsView;
