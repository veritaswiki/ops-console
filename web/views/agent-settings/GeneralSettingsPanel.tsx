import React from 'react';
import { Moon, Save, SlidersHorizontal, Sun } from 'lucide-react';
import type {
  A2AAgentPeer,
  DynamicModelCatalogResponse,
  LinearStateResponse,
  MagpieCatalogResponse,
  OrchestrationMode,
  ReasoningEffort,
  SnapshotResponse,
} from '../../types';
import { cn } from '../../lib/cn';
import { formatCompactNumber } from '../../utils/format';
import {
  Button,
  CommandCombobox,
  InspectorDrawer,
  NativeSelect,
  SegmentedControl,
  SettingGroup,
  SettingRow,
  StatusIndicator,
  Switch,
  TextInput,
  type CommandComboboxOption,
} from '../../components/ui';
import { SettingsField } from '../../components/settings/SettingsPrimitives';
import { EFFORT_OPTIONS } from '../../components/AgentOrchestrationCanvas';

export interface RoutingDraft {
  leadAgentId: string;
  mode: OrchestrationMode;
  mainModel: string;
  mainEffort: ReasoningEffort;
  subModel: string;
  subEffort: ReasoningEffort;
  worktreeIsolation: boolean;
}

export interface GithubDraft {
  enabled: boolean;
  owner: string;
  repo: string;
  defaultBranch: string;
  autoCreatePr: boolean;
  syncDirection: string;
  tokenEnvVar: string;
}

const ORCHESTRATION_MODE_OPTIONS: ReadonlyArray<{ value: OrchestrationMode; label: string }> = [
  { value: 'lead-router', label: '总指挥路由' },
  { value: 'main-sub', label: '主子分级' },
  { value: 'swarm', label: '蜂群协同' },
];

const SYNC_DIRECTION_OPTIONS = [
  { value: 'bidirectional', label: '双向同步 (Bidirectional)' },
  { value: 'pull', label: '仅拉取 (Pull)' },
  { value: 'push', label: '仅推送 (Push)' },
] as const;

export function GeneralSettingsPanel({
  snapshot,
  readOnly,
  theme,
  onToggleTheme,
  a2aAgents,
  modelCatalog,
  magpieCatalog,
  modelOptions,
  routingDraft,
  savingRouting,
  onChangeRoutingDraft,
  onSaveRouting,
  linearState,
  githubDraft,
  savingGithub,
  onChangeGithubDraft,
  onSaveGithub,
}: {
  snapshot: SnapshotResponse | null;
  readOnly: boolean;
  theme: 'light' | 'dark';
  onToggleTheme?: () => void;
  a2aAgents: A2AAgentPeer[];
  modelCatalog: DynamicModelCatalogResponse | null;
  magpieCatalog: MagpieCatalogResponse | null;
  modelOptions: CommandComboboxOption[];
  routingDraft: RoutingDraft;
  savingRouting: boolean;
  onChangeRoutingDraft: React.Dispatch<React.SetStateAction<RoutingDraft>>;
  onSaveRouting: (nextDraft?: RoutingDraft) => Promise<void>;
  linearState: LinearStateResponse | null;
  githubDraft: GithubDraft;
  savingGithub: boolean;
  onChangeGithubDraft: React.Dispatch<React.SetStateAction<GithubDraft>>;
  onSaveGithub: (nextDraft?: GithubDraft) => Promise<void>;
}) {
  const [routingDrawerOpen, setRoutingDrawerOpen] = React.useState(false);
  const [githubDrawerOpen, setGithubDrawerOpen] = React.useState(false);

  const magpie = snapshot?.magpie;
  const processes = snapshot?.agents?.processes || [];
  const fleetNodes = snapshot?.fleet?.nodes || [];

  const agentOptions = React.useMemo<CommandComboboxOption[]>(
    () =>
      a2aAgents.map((agent) => ({
        value: agent.id,
        label: agent.name,
        group: agent.nodeName || agent.nodeId || '本机节点',
        description: `${agent.harness} · ${agent.role === 'lead' ? '当前总指挥' : 'Worker'}`,
        meta: agent.magpieModel || agent.modelHint || undefined,
        keywords: [agent.id, agent.harness, agent.nodeId, agent.nodeName || ''],
      })),
    [a2aAgents],
  );

  const leadAgentLabel =
    a2aAgents.find((a) => a.id === routingDraft.leadAgentId)?.name ||
    routingDraft.leadAgentId ||
    '未指定';

  const repoSummary =
    githubDraft.owner && githubDraft.repo
      ? `${githubDraft.owner}/${githubDraft.repo} · ${githubDraft.defaultBranch || 'main'}`
      : '尚未绑定默认仓库';

  const catalogSummary = modelCatalog
    ? `在线节点 ${modelCatalog.summary.onlineNodesCount} 台 · 可选模型 ${modelCatalog.summary.uniqueOnlineModels} 个${
        modelCatalog.summary.offlineNodesCount > 0
          ? `（已隐藏 ${modelCatalog.summary.offlineNodesCount} 台离线节点）`
          : ''
      }`
    : magpieCatalog?.reachable
      ? `已同步 Magpie ${magpieCatalog.totalModels} 个模型 · ${magpieCatalog.agentBindings.length} 项绑定`
      : '使用内置兜底模型候选集';

  const applyRoutingPatch = (patch: Partial<RoutingDraft>) => {
    const next = { ...routingDraft, ...patch };
    onChangeRoutingDraft(next);
    if (!readOnly) {
      void onSaveRouting(next);
    }
  };

  const applyGithubPatch = (patch: Partial<GithubDraft>) => {
    const next = { ...githubDraft, ...patch };
    onChangeGithubDraft(next);
    if (!readOnly) {
      void onSaveGithub(next);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-section-general">
      <SettingGroup
        title="外观与工作台"
        description="Pure Zinc 90/10 配色实时生效，并呈现当前宿主机控制面核心状态。"
      >
        <SettingRow
          title="界面主题"
          description="亮色与深色模式即选即用，自动持久化至本机浏览器。"
          control={
            <SegmentedControl
              value={theme}
              onChange={(next) => {
                if (next !== theme) onToggleTheme?.();
              }}
              ariaLabel="切换界面主题"
              options={[
                {
                  value: 'light',
                  label: '亮色',
                  icon: <Sun className="size-3.5" strokeWidth={1.75} />,
                  testId: 'settings-theme-light',
                },
                {
                  value: 'dark',
                  label: '深色',
                  icon: <Moon className="size-3.5" strokeWidth={1.75} />,
                  testId: 'settings-theme-dark',
                },
              ]}
            />
          }
        />

        <div className="px-5 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
          <div className="space-y-0.5 min-w-0">
            <div className="text-[11.5px] text-[var(--ink-subtle)]">控制面宿主机</div>
            <div className="font-mono text-[13px] font-medium text-[var(--ink)] truncate">
              {snapshot?.host?.hostname || 'localhost'}
            </div>
            <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
              {snapshot?.host?.os || snapshot?.host?.platform || 'linux'} · {snapshot?.host?.arch || 'x64'}
            </div>
          </div>
          <div className="space-y-0.5 min-w-0">
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
          <div className="space-y-0.5 min-w-0">
            <div className="text-[11.5px] text-[var(--ink-subtle)]">Magpie 模型网关</div>
            <div className="pt-0.5">
              <StatusIndicator
                status={magpie?.reachable ? 'healthy' : 'offline'}
                label={magpie?.reachable ? '在线可达' : '未连接'}
              />
            </div>
            <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
              {formatCompactNumber(magpie?.totalModels ?? 0)} 模型 · {magpie?.providers?.length ?? 0} 渠道
            </div>
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-[11.5px] text-[var(--ink-subtle)]">集群与进程</div>
            <div className="font-mono text-[13px] font-medium text-[var(--ink)] tabular-nums">
              {a2aAgents.length} A2A Agent
            </div>
            <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
              {processes.length} 本地进程 · {fleetNodes.length} 节点
            </div>
          </div>
        </div>
      </SettingGroup>

      <SettingGroup
        title="默认 Agent 路由与模型偏好"
        description="常规切换即时保存生效；主/子模型与推理深度可在右侧抽屉精细调整。"
        meta={catalogSummary}
      >
        <SettingRow
          title="默认编排模式"
          description="控制多 Agent 任务委派与协同拓扑的默认执行策略。"
          control={
            <SegmentedControl
              value={routingDraft.mode}
              disabled={readOnly || savingRouting}
              onChange={(mode) => applyRoutingPatch({ mode })}
              options={ORCHESTRATION_MODE_OPTIONS}
              ariaLabel="选择默认编排模式"
            />
          }
        />

        <SettingRow
          title="默认总指挥 Agent (Lead)"
          description="负责需求拆解、任务分发与 PR 质量收敛的主控代理。"
          control={
            <CommandCombobox
              value={routingDraft.leadAgentId}
              disabled={readOnly || savingRouting || agentOptions.length === 0}
              onChange={(leadAgentId) => applyRoutingPatch({ leadAgentId })}
              options={agentOptions}
              placeholder={agentOptions.length === 0 ? '暂未注册 Agent' : '选择总指挥 Agent'}
              searchPlaceholder="按名称、Harness 或节点搜索..."
              className="w-60 sm:w-64"
              ariaLabel="默认总指挥 Agent"
            />
          }
        />

        <SettingRow
          title="Git Worktree 分支隔离"
          description="为并行子任务自动创建独立 Git Worktree，杜绝主工作区脏写冲突。"
          control={
            <Switch
              checked={routingDraft.worktreeIsolation}
              disabled={readOnly || savingRouting}
              onCheckedChange={(worktreeIsolation) => applyRoutingPatch({ worktreeIsolation })}
              ariaLabel="启用 Git Worktree 分支隔离"
            />
          }
        />

        <SettingRow
          title="主控与子任务默认模型"
          description="分别指定主控模型、廉价子任务模型及默认推理思考深度。"
          meta={`Main ${routingDraft.mainModel} (${routingDraft.mainEffort}) · Sub ${routingDraft.subModel} (${routingDraft.subEffort})`}
          onClick={() => setRoutingDrawerOpen(true)}
          control={
            <span className="text-[12.5px] font-medium text-[var(--ink-muted)]">配置模型</span>
          }
        />
      </SettingGroup>

      <SettingGroup
        title="GitHub 仓库同步"
        description="管理 Linear 任务板与 GitHub Issues / PR 之间的默认绑定仓库与自动化策略。"
        actions={
          linearState?.githubConfig && (
            <StatusIndicator
              status={linearState.githubConfig.hasServerToken ? 'healthy' : 'standby'}
              label={linearState.githubConfig.hasServerToken ? '服务端 Token 就绪' : '未检测到 Token'}
            />
          )
        }
      >
        <SettingRow
          title="启用 GitHub 仓库双向同步"
          description="开启后将自动关联 Issue、分支与 Pull Request 状态。"
          control={
            <Switch
              checked={githubDraft.enabled}
              disabled={readOnly || savingGithub}
              onCheckedChange={(enabled) => applyGithubPatch({ enabled })}
              ariaLabel="启用 GitHub 双向同步"
            />
          }
        />

        <SettingRow
          title="验收通过自动创建 PR"
          description="Worker 通过四步门禁校验后自动推送独立分支并生成 PR。"
          control={
            <Switch
              checked={githubDraft.autoCreatePr}
              disabled={readOnly || savingGithub}
              onCheckedChange={(autoCreatePr) => applyGithubPatch({ autoCreatePr })}
              ariaLabel="验收通过自动创建 PR"
            />
          }
        />

        <SettingRow
          title="默认仓库与 Token 环境变量"
          description="设置 Owner、Repo、默认分支、同步方向及只读 Token 环境变量名。"
          meta={repoSummary}
          onClick={() => setGithubDrawerOpen(true)}
          control={
            <span className="text-[12.5px] font-medium text-[var(--ink-muted)]">编辑仓库</span>
          }
        />
      </SettingGroup>

      <InspectorDrawer
        open={routingDrawerOpen}
        onOpenChange={setRoutingDrawerOpen}
        title="主控与子任务默认模型"
        description="支持从在线节点目录搜索选择，或直接输入自定义路由组 / 模型标识。"
        meta={leadAgentLabel}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRoutingDrawerOpen(false)}>
              关闭
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={readOnly || savingRouting}
              onClick={async () => {
                await onSaveRouting(routingDraft);
                setRoutingDrawerOpen(false);
              }}
            >
              <Save className="size-3.5" strokeWidth={1.75} />
              {savingRouting ? '保存中...' : '保存模型偏好'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="text-[12px] font-mono text-[var(--ink-subtle)]">{catalogSummary}</div>

          <SettingsField label="主控模型 (Main Model)" hint="承担架构设计与复杂代码修改">
            <CommandCombobox
              value={routingDraft.mainModel}
              disabled={readOnly || savingRouting}
              onChange={(mainModel) => onChangeRoutingDraft((prev) => ({ ...prev, mainModel }))}
              options={modelOptions}
              allowCustomValue
              placeholder="选择或输入主控模型"
              searchPlaceholder="搜索在线节点可用模型..."
              ariaLabel="主控模型"
            />
          </SettingsField>

          <SettingsField label="主控思考深度 (Main Effort)">
            <SegmentedControl
              value={routingDraft.mainEffort}
              disabled={readOnly || savingRouting}
              onChange={(mainEffort) =>
                onChangeRoutingDraft((prev) => ({ ...prev, mainEffort }))
              }
              options={EFFORT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
              ariaLabel="主控思考深度"
              className="w-full"
            />
          </SettingsField>

          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-4">
            <SettingsField label="子任务模型 (Sub Model)" hint="用于单测、审计与重复事务">
              <CommandCombobox
                value={routingDraft.subModel}
                disabled={readOnly || savingRouting}
                onChange={(subModel) => onChangeRoutingDraft((prev) => ({ ...prev, subModel }))}
                options={modelOptions}
                allowCustomValue
                placeholder="选择或输入子任务模型"
                searchPlaceholder="搜索在线节点可用模型..."
                ariaLabel="子任务模型"
              />
            </SettingsField>

            <SettingsField label="子任务思考深度 (Sub Effort)">
              <SegmentedControl
                value={routingDraft.subEffort}
                disabled={readOnly || savingRouting}
                onChange={(subEffort) =>
                  onChangeRoutingDraft((prev) => ({ ...prev, subEffort }))
                }
                options={EFFORT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                ariaLabel="子任务思考深度"
                className="w-full"
              />
            </SettingsField>
          </div>
        </div>
      </InspectorDrawer>

      <InspectorDrawer
        open={githubDrawerOpen}
        onOpenChange={setGithubDrawerOpen}
        title="GitHub 仓库绑定与凭据映射"
        description="仅保存环境变量名，不向配置文件或前端写入明文 Token。"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setGithubDrawerOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={readOnly || savingGithub}
              onClick={async () => {
                await onSaveGithub(githubDraft);
                setGithubDrawerOpen(false);
              }}
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
              {savingGithub ? '保存中...' : '保存 GitHub 配置'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <SettingsField label="仓库 Owner">
              <TextInput
                mono
                disabled={readOnly || savingGithub}
                value={githubDraft.owner}
                onChange={(e) =>
                  onChangeGithubDraft((prev) => ({ ...prev, owner: e.target.value }))
                }
                placeholder="example-org"
              />
            </SettingsField>
            <SettingsField label="仓库名称 (Repo)">
              <TextInput
                mono
                disabled={readOnly || savingGithub}
                value={githubDraft.repo}
                onChange={(e) =>
                  onChangeGithubDraft((prev) => ({ ...prev, repo: e.target.value }))
                }
                placeholder="ops-console"
              />
            </SettingsField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <SettingsField label="默认基线分支">
              <TextInput
                mono
                disabled={readOnly || savingGithub}
                value={githubDraft.defaultBranch}
                onChange={(e) =>
                  onChangeGithubDraft((prev) => ({ ...prev, defaultBranch: e.target.value }))
                }
                placeholder="main"
              />
            </SettingsField>
            <SettingsField label="Token 环境变量名">
              <TextInput
                mono
                disabled={readOnly || savingGithub}
                value={githubDraft.tokenEnvVar}
                onChange={(e) =>
                  onChangeGithubDraft((prev) => ({ ...prev, tokenEnvVar: e.target.value }))
                }
                placeholder="GITHUB_TOKEN"
              />
            </SettingsField>
          </div>

          <SettingsField label="同步方向">
            <NativeSelect
              disabled={readOnly || savingGithub}
              value={githubDraft.syncDirection}
              onChange={(e) =>
                onChangeGithubDraft((prev) => ({ ...prev, syncDirection: e.target.value }))
              }
            >
              {SYNC_DIRECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </SettingsField>

          <div className={cn('pt-3 border-t border-[var(--border-subtle)] space-y-3')}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--ink-muted)]">启用双向同步</span>
              <Switch
                checked={githubDraft.enabled}
                disabled={readOnly || savingGithub}
                onCheckedChange={(enabled) =>
                  onChangeGithubDraft((prev) => ({ ...prev, enabled }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--ink-muted)]">验收后自动创建 PR</span>
              <Switch
                checked={githubDraft.autoCreatePr}
                disabled={readOnly || savingGithub}
                onCheckedChange={(autoCreatePr) =>
                  onChangeGithubDraft((prev) => ({ ...prev, autoCreatePr }))
                }
              />
            </div>
          </div>
        </div>
      </InspectorDrawer>
    </div>
  );
}
