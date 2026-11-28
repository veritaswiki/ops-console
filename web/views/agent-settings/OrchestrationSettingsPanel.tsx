import React from 'react';
import { Plus, RefreshCw, Save } from 'lucide-react';
import type {
  A2AAgentPeer,
  A2ASkillCatalogItem,
  A2AStateResponse,
  LinearStateResponse,
  ReasoningEffort,
  SnapshotResponse,
} from '../../types';
import type { upsertA2ARoutingRule } from '../../api';
import { cn } from '../../lib/cn';
import {
  Button,
  CommandCombobox,
  EmptyState,
  InspectorDrawer,
  Panel,
  ResourceMeter,
  SettingGroup,
  SettingRow,
  StatusIndicator,
  Switch,
  TextInput,
  WidgetSkeleton,
  type CommandComboboxOption,
  type ConfirmModalState,
} from '../../components/ui';
import { SettingsField } from '../../components/settings/SettingsPrimitives';
import { A2AOrchestratorSection } from '../../components/A2AOrchestratorSection';

const AgentOrchestrationCanvas = React.lazy(() =>
  import('../../components/AgentOrchestrationCanvas').then((m) => ({
    default: m.AgentOrchestrationCanvas,
  })),
);

export type OrchestrationSubTab = 'a2a' | 'topology' | 'linear';

export interface CommanderDraft {
  leadAgentId: string;
  worktreePrefix: string;
  autoDecompose: boolean;
  autoAssignWorkers: boolean;
  autoSyncGithub: boolean;
  requireDshReview: boolean;
}

export interface ProjectFormDraft {
  name: string;
  key: string;
  summary: string;
  githubRepo: string;
  targetDate: string;
}

export function OrchestrationSettingsPanel({
  subTab,
  snapshot,
  readOnly,
  a2aState,
  a2aLoading,
  linearState,
  commanderDraft,
  savingCommander,
  onChangeCommanderDraft,
  onSaveCommander,
  projectForm,
  creatingProject,
  onChangeProjectForm,
  onCreateProject,
  onReloadA2A,
  onTopologyUpdateConfig,
  onTopologySavePositions,
  onTopologyUpsertRule,
  onTopologyDeleteRule,
  onTopologyUpdateAgent,
  onTopologySetLead,
  onTopologyDiscover,
  onTopologyToggleSkill,
  onInspectLogs,
  onSnapshotChanged,
  onToast,
  onConfirm,
}: {
  subTab: OrchestrationSubTab;
  snapshot: SnapshotResponse | null;
  readOnly: boolean;
  a2aState: A2AStateResponse | null;
  a2aLoading: boolean;
  linearState: LinearStateResponse | null;
  commanderDraft: CommanderDraft;
  savingCommander: boolean;
  onChangeCommanderDraft: React.Dispatch<React.SetStateAction<CommanderDraft>>;
  onSaveCommander: (nextDraft?: CommanderDraft) => Promise<void>;
  projectForm: ProjectFormDraft;
  creatingProject: boolean;
  onChangeProjectForm: React.Dispatch<React.SetStateAction<ProjectFormDraft>>;
  onCreateProject: () => Promise<boolean>;
  onReloadA2A: () => Promise<void>;
  onTopologyUpdateConfig: (patch: Record<string, unknown>) => Promise<void>;
  onTopologySavePositions: (positions: Record<string, { x: number; y: number }>) => Promise<void>;
  onTopologyUpsertRule: (payload: Parameters<typeof upsertA2ARoutingRule>[0]) => Promise<void>;
  onTopologyDeleteRule: (ruleId: string) => Promise<void>;
  onTopologyUpdateAgent: (
    agentId: string,
    patch: { modelHint?: string; reasoningEffort?: ReasoningEffort; delegatable?: boolean },
  ) => Promise<void>;
  onTopologySetLead: (agentId: string) => Promise<void>;
  onTopologyDiscover: (agent: A2AAgentPeer) => Promise<void>;
  onTopologyToggleSkill: (skill: A2ASkillCatalogItem, agentId: string) => Promise<void>;
  onInspectLogs: (agentId: string) => void;
  onSnapshotChanged: () => void;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const [projectDrawerOpen, setProjectDrawerOpen] = React.useState(false);

  const cycles = linearState?.cycles || [];
  const projects = linearState?.projects || [];
  const availableAgents = linearState?.availableAgents || [];
  const fleetNodes = snapshot?.fleet?.nodes || [];

  const commanderOptions = React.useMemo<CommandComboboxOption[]>(
    () =>
      availableAgents.map((agent) => ({
        value: agent.id,
        label: agent.name,
        group: agent.status === 'online' || agent.status === 'healthy' ? '在线 Agent' : '已注册 Agent',
        description: `${agent.harness}${agent.role === 'lead' ? ' · 当前总指挥' : ''}`,
        keywords: [agent.id, agent.harness, agent.modelHint || ''],
      })),
    [availableAgents],
  );

  const applyCommanderPatch = (patch: Partial<CommanderDraft>) => {
    const next = { ...commanderDraft, ...patch };
    onChangeCommanderDraft(next);
    if (!readOnly) {
      void onSaveCommander(next);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-section-orchestration">
      {subTab === 'a2a' ? (
        <A2AOrchestratorSection
          snapshot={snapshot}
          readOnly={readOnly}
          onSnapshotChanged={onSnapshotChanged}
          onToast={onToast}
          onConfirm={onConfirm}
        />
      ) : subTab === 'topology' ? (
        <Panel
          title="Agent 集群连接拓扑与节点编排"
          description="融合全节点探针状态与 A2A 路由链路，可视化展示宿主机与主/子 Agent 连接延迟、健康度及 Skill 挂载。"
          actions={
            <Button
              variant="secondary"
              size="sm"
              disabled={a2aLoading}
              onClick={() => void onReloadA2A()}
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
                onUpdateConfig={onTopologyUpdateConfig}
                onSavePositions={onTopologySavePositions}
                onUpsertRule={onTopologyUpsertRule}
                onDeleteRule={onTopologyDeleteRule}
                onUpdateAgent={onTopologyUpdateAgent}
                onSetLead={onTopologySetLead}
                onDiscoverAgent={onTopologyDiscover}
                onToggleSkillAgent={onTopologyToggleSkill}
                onInspectLogs={onInspectLogs}
              />
            </React.Suspense>
          ) : (
            <WidgetSkeleton heightClass="h-[580px]" label="正在采集 Agent 集群节点与路由拓扑" />
          )}
        </Panel>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <SettingGroup
              title="Linear 总指挥与自动分工"
              description="开关改动即时生效；Worktree 前缀支持按需修改保存。"
              className="lg:col-span-7"
            >
              <SettingRow
                title="总指挥 Agent"
                description="接收规划态任务并协调拆解、分派与 PR 审查。"
                control={
                  <CommandCombobox
                    value={commanderDraft.leadAgentId}
                    disabled={readOnly || savingCommander || commanderOptions.length === 0}
                    onChange={(leadAgentId) => applyCommanderPatch({ leadAgentId })}
                    options={commanderOptions}
                    placeholder="选择总指挥 Agent"
                    className="w-56"
                  />
                }
              />

              <SettingRow
                title="Worktree 分支前缀"
                description="新建隔离任务分支时自动使用的前缀模板。"
                control={
                  <div className="flex items-center gap-2">
                    <TextInput
                      mono
                      disabled={readOnly || savingCommander}
                      value={commanderDraft.worktreePrefix}
                      onChange={(e) =>
                        onChangeCommanderDraft((prev) => ({
                          ...prev,
                          worktreePrefix: e.target.value,
                        }))
                      }
                      className="w-40 h-8 text-[12px]"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={readOnly || savingCommander}
                      onClick={() => void onSaveCommander(commanderDraft)}
                    >
                      <Save className="size-3.5" strokeWidth={1.75} />
                      保存
                    </Button>
                  </div>
                }
              />

              <SettingRow
                title="自动拆解子任务"
                description="总指挥接单后自动拆分为可并行交付的原子步骤。"
                control={
                  <Switch
                    checked={commanderDraft.autoDecompose}
                    disabled={readOnly || savingCommander}
                    onCheckedChange={(autoDecompose) => applyCommanderPatch({ autoDecompose })}
                    ariaLabel="自动拆解子任务"
                  />
                }
              />

              <SettingRow
                title="自动分派 Worker"
                description="按在线节点负载与模型能力自动指派执行代理。"
                control={
                  <Switch
                    checked={commanderDraft.autoAssignWorkers}
                    disabled={readOnly || savingCommander}
                    onCheckedChange={(autoAssignWorkers) =>
                      applyCommanderPatch({ autoAssignWorkers })
                    }
                    ariaLabel="自动分派 Worker"
                  />
                }
              />

              <SettingRow
                title="自动同步 GitHub 状态"
                description="将分支推送、检查结果与 PR 状态回写至任务卡片。"
                control={
                  <Switch
                    checked={commanderDraft.autoSyncGithub}
                    disabled={readOnly || savingCommander}
                    onCheckedChange={(autoSyncGithub) => applyCommanderPatch({ autoSyncGithub })}
                    ariaLabel="自动同步 GitHub"
                  />
                }
              />

              <SettingRow
                title="强制要求质量审查"
                description="任务合入前必须通过自动评审与门禁校验。"
                control={
                  <Switch
                    checked={commanderDraft.requireDshReview}
                    disabled={readOnly || savingCommander}
                    onCheckedChange={(requireDshReview) =>
                      applyCommanderPatch({ requireDshReview })
                    }
                    ariaLabel="强制要求质量审查"
                  />
                }
              />
            </SettingGroup>

            <SettingGroup
              title={`迭代周期 (${cycles.length})`}
              description="追踪当前与近期 Sprint 交付进度。"
              className="lg:col-span-5"
            >
              {cycles.length === 0 ? (
                <EmptyState message="暂无迭代周期记录。" />
              ) : (
                cycles.map((cycle) => (
                  <div key={cycle.id} className="px-5 sm:px-6 py-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-[var(--ink)]">
                        {cycle.name}
                      </span>
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                        {cycle.startsAt} → {cycle.endsAt}
                      </span>
                    </div>
                    <ResourceMeter
                      value={cycle.progressPct}
                      label={`完成 ${cycle.doneCount}/${cycle.issueCount} · ${cycle.status}`}
                      valueText={`${cycle.progressPct}%`}
                      tone={cycle.progressPct >= 50 ? 'ok' : 'warn'}
                    />
                  </div>
                ))
              )}
            </SettingGroup>
          </div>

          <SettingGroup
            title={`项目路线图 (${projects.length})`}
            description="绑定仓库与目标交付日期；点击右上角在侧滑抽屉中新增项目。"
            actions={
              <Button
                variant="primary"
                size="sm"
                disabled={readOnly}
                onClick={() => setProjectDrawerOpen(true)}
              >
                <Plus className="size-3.5" strokeWidth={1.75} />
                新增项目
              </Button>
            }
          >
            {projects.length === 0 ? (
              <EmptyState message="暂无项目路线图数据。" />
            ) : (
              projects.map((proj) => (
                <div key={proj.id} className="px-5 sm:px-6 py-4 space-y-2.5">
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
              ))
            )}
          </SettingGroup>

          <InspectorDrawer
            open={projectDrawerOpen}
            onOpenChange={setProjectDrawerOpen}
            title="新增路线图项目"
            description="创建后自动同步到任务看板与项目筛选列表。"
            footer={
              <>
                <Button variant="secondary" size="sm" onClick={() => setProjectDrawerOpen(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={readOnly || creatingProject || !projectForm.name.trim()}
                  onClick={async () => {
                    const ok = await onCreateProject();
                    if (ok) setProjectDrawerOpen(false);
                  }}
                >
                  <Plus className="size-3.5" strokeWidth={1.75} />
                  {creatingProject ? '创建中...' : '创建项目'}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <SettingsField label="项目名称 *" className="col-span-2">
                  <TextInput
                    required
                    disabled={readOnly || creatingProject}
                    value={projectForm.name}
                    onChange={(e) =>
                      onChangeProjectForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="例如：边缘节点自动扩缩容"
                  />
                </SettingsField>
                <SettingsField label="Key">
                  <TextInput
                    mono
                    disabled={readOnly || creatingProject}
                    value={projectForm.key}
                    onChange={(e) =>
                      onChangeProjectForm((prev) => ({
                        ...prev,
                        key: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="EDGE"
                  />
                </SettingsField>
              </div>

              <SettingsField label="GitHub 仓库 (owner/repo)">
                <TextInput
                  mono
                  disabled={readOnly || creatingProject}
                  value={projectForm.githubRepo}
                  onChange={(e) =>
                    onChangeProjectForm((prev) => ({ ...prev, githubRepo: e.target.value }))
                  }
                  placeholder="example-org/ops-console"
                />
              </SettingsField>

              <SettingsField label="目标说明">
                <TextInput
                  disabled={readOnly || creatingProject}
                  value={projectForm.summary}
                  onChange={(e) =>
                    onChangeProjectForm((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  placeholder="描述该项目下 Agent 的交付目标..."
                />
              </SettingsField>

              <SettingsField label="目标交付日期">
                <TextInput
                  mono
                  disabled={readOnly || creatingProject}
                  value={projectForm.targetDate}
                  onChange={(e) =>
                    onChangeProjectForm((prev) => ({ ...prev, targetDate: e.target.value }))
                  }
                  placeholder="2026-12-31"
                />
              </SettingsField>
            </div>
          </InspectorDrawer>
        </div>
      )}
    </div>
  );
}
