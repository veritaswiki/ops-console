import React from 'react';
import { Check, Copy, Radio, RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal, Terminal } from 'lucide-react';
import type {
  A2AAgentPeer,
  A2AConnectProfilesResponse,
  A2APingResponse,
  A2ASigningMetadata,
  A2ASigningVerifyResponse,
  ReasoningEffort,
} from '../../types';
import { cn, FOCUS_RING } from '../../lib/cn';
import {
  Button,
  CommandCombobox,
  EmptyState,
  InspectorDrawer,
  NativeSelect,
  SegmentedControl,
  SettingGroup,
  SettingRow,
  StatusIndicator,
  Switch,
  TextInput,
  WidgetSkeleton,
  type CommandComboboxOption,
} from '../../components/ui';
import {
  CommandSnippet,
  SettingsField,
  SettingsInsetSurface,
} from '../../components/settings/SettingsPrimitives';
import { EFFORT_OPTIONS } from '../../components/AgentOrchestrationCanvas';

function formatShortTime(iso?: string | null): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

export function MultiDeviceSettingsPanel({
  readOnly,
  a2aAgents,
  leadAgentId,
  a2aLoading,
  modelOptions,
  connectProfiles,
  profilesLoading,
  selectedProfileId,
  onSelectProfileId,
  profileParams,
  onChangeProfileParams,
  onRegenerateProfiles,
  activeSigningMeta,
  verifyingSigning,
  signingVerifyResult,
  onVerifySigning,
  scanningLocal,
  onDiscoverLocal,
  onReloadA2A,
  pingingAgentId,
  pingResults,
  onPingAgent,
  onUpdateAgent,
  onSetLeadAgent,
  copiedKey,
  onCopy,
}: {
  readOnly: boolean;
  a2aAgents: A2AAgentPeer[];
  leadAgentId?: string | null;
  a2aLoading: boolean;
  modelOptions: CommandComboboxOption[];
  connectProfiles: A2AConnectProfilesResponse | null;
  profilesLoading: boolean;
  selectedProfileId: string;
  onSelectProfileId: (id: string) => void;
  profileParams: { nodeId: string; deviceType: string; tailscaleHost: string };
  onChangeProfileParams: React.Dispatch<
    React.SetStateAction<{ nodeId: string; deviceType: string; tailscaleHost: string }>
  >;
  onRegenerateProfiles: (event: React.FormEvent) => void;
  activeSigningMeta: A2ASigningMetadata | null;
  verifyingSigning: boolean;
  signingVerifyResult: A2ASigningVerifyResponse | null;
  onVerifySigning: () => Promise<void>;
  scanningLocal: boolean;
  onDiscoverLocal: () => Promise<void>;
  onReloadA2A: () => Promise<void>;
  pingingAgentId: string | null;
  pingResults: Record<string, A2APingResponse>;
  onPingAgent: (agent: A2AAgentPeer) => Promise<void>;
  onUpdateAgent: (
    agentId: string,
    patch: { modelHint?: string; reasoningEffort?: ReasoningEffort; delegatable?: boolean },
  ) => Promise<void>;
  onSetLeadAgent: (agentId: string) => Promise<void>;
  copiedKey: string | null;
  onCopy: (key: string, text: string, label: string) => Promise<void>;
}) {
  const [editingAgentId, setEditingAgentId] = React.useState<string | null>(null);
  const [agentDraft, setAgentDraft] = React.useState<{
    modelHint: string;
    reasoningEffort: ReasoningEffort;
    delegatable: boolean;
  }>({
    modelHint: '',
    reasoningEffort: 'medium',
    delegatable: true,
  });
  const [savingAgent, setSavingAgent] = React.useState(false);
  const [scriptDrawerOpen, setScriptDrawerOpen] = React.useState(false);

  const editingAgent = React.useMemo(
    () => a2aAgents.find((a) => a.id === editingAgentId) || null,
    [a2aAgents, editingAgentId],
  );

  const activeConnectProfile =
    connectProfiles?.profiles.find((p) => p.id === selectedProfileId) ||
    connectProfiles?.profiles[0] ||
    null;

  const openAgentInspector = (agent: A2AAgentPeer) => {
    setEditingAgentId(agent.id);
    setAgentDraft({
      modelHint: agent.magpieModel || agent.modelHint || '',
      reasoningEffort: (agent.magpieEffort || agent.reasoningEffort || 'medium') as ReasoningEffort,
      delegatable: agent.delegatable !== false,
    });
  };

  const handleSaveAgent = async () => {
    if (!editingAgent || readOnly) return;
    setSavingAgent(true);
    try {
      await onUpdateAgent(editingAgent.id, {
        modelHint: agentDraft.modelHint.trim() || undefined,
        reasoningEffort: agentDraft.reasoningEffort,
        delegatable: agentDraft.delegatable,
      });
      setEditingAgentId(null);
    } finally {
      setSavingAgent(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-section-multi-device">
      <SettingGroup
        title="A2A v0.3 Hub 端点与签名安全"
        description="用于跨机器 Agent 双向发现、HMAC-SHA256 签名鉴权与 JSON-RPC 任务路由。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={verifyingSigning}
              onClick={() => void onVerifySigning()}
              data-testid="verify-a2a-signing-btn"
            >
              <ShieldCheck
                className={cn('size-3.5', verifyingSigning && 'animate-pulse')}
                strokeWidth={1.75}
              />
              {verifyingSigning ? '校验中...' : 'HMAC 签名自检'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={profilesLoading}
              onClick={() => setScriptDrawerOpen(true)}
            >
              <Terminal className="size-3.5" strokeWidth={1.75} />
              跨机安装脚本
            </Button>
          </div>
        }
      >
        {activeSigningMeta && (
          <div className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 text-[12px] font-mono text-[var(--ink-muted)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1" data-testid="a2a-signing-metadata">
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
                来源：<span className="text-[var(--ink)]">{activeSigningMeta.keySource}</span>
              </span>
              <span>
                防重放：<span className="text-[var(--ink)]">{activeSigningMeta.replayWindowSec}s</span>
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

        {connectProfiles ? (
          <>
            <SettingRow
              title="Hub AgentCard URL"
              description={
                <span className="font-mono text-[12px] text-[var(--ink-muted)] break-all">
                  {connectProfiles.hubAgentCardUrl}
                </span>
              }
              control={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onCopy('hub-card', connectProfiles.hubAgentCardUrl, 'AgentCard URL')}
                >
                  {copiedKey === 'hub-card' ? (
                    <Check className="size-3.5 text-[var(--ok)]" strokeWidth={2} />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={1.75} />
                  )}
                  {copiedKey === 'hub-card' ? '已复制' : '复制'}
                </Button>
              }
            />
            <SettingRow
              title="Hub JSON-RPC 端点"
              description={
                <span className="font-mono text-[12px] text-[var(--ink-muted)] break-all">
                  {connectProfiles.hubRpcUrl}
                </span>
              }
              control={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onCopy('hub-rpc', connectProfiles.hubRpcUrl, 'JSON-RPC 端点')}
                >
                  {copiedKey === 'hub-rpc' ? (
                    <Check className="size-3.5 text-[var(--ok)]" strokeWidth={2} />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={1.75} />
                  )}
                  {copiedKey === 'hub-rpc' ? '已复制' : '复制'}
                </Button>
              }
            />
          </>
        ) : (
          <div className="p-5 sm:p-6">
            <WidgetSkeleton heightClass="h-[112px]" label="正在加载 Hub A2A 端点信息" />
          </div>
        )}
      </SettingGroup>

      <SettingGroup
        title={`已注册跨设备 Agent (${a2aAgents.length})`}
        description="扫描本机已安装的编码 CLI，发起连通性拨测，或点击任意 Agent 在右侧抽屉调整模型与权限。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={readOnly || scanningLocal}
              onClick={() => void onDiscoverLocal()}
              data-testid="discover-local-agents-btn"
            >
              <Search className={cn('size-3.5', scanningLocal && 'animate-spin')} strokeWidth={1.75} />
              {scanningLocal ? '扫描中...' : '扫描本机 CLI'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={a2aLoading}
              onClick={() => void onReloadA2A()}
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
            message="点击右上角「扫描本机 CLI」自动发现本机工具，或打开「跨机安装脚本」抽屉接入远端节点。"
          />
        ) : (
          a2aAgents.map((agent) => {
            const ping = pingResults[agent.id];
            const isPinging = pingingAgentId === agent.id;
            const isLead = agent.role === 'lead' || agent.id === leadAgentId;
            const statusVal = ping
              ? ping.reachable
                ? 'healthy'
                : 'failed'
              : agent.status === 'online' || agent.status === 'healthy'
                ? 'healthy'
                : agent.status === 'offline'
                  ? 'offline'
                  : 'standby';
            const statusText = ping
              ? ping.reachable
                ? `可达${ping.latencyMs != null ? ` · ${ping.latencyMs}ms` : ''}`
                : '拨测不可达'
              : agent.status === 'online' || agent.status === 'healthy'
                ? '在线'
                : agent.status || '待机';

            return (
              <SettingRow
                key={agent.id}
                title={
                  <span className="inline-flex items-center gap-2">
                    <span>{agent.name}</span>
                    {isLead && (
                      <span className="font-mono text-[11px] text-[var(--accent)]">· 总指挥</span>
                    )}
                  </span>
                }
                meta={`${agent.harness} · ${agent.nodeName || agent.nodeId}${agent.version ? ` · v${agent.version}` : ''}`}
                description={
                  <span className="font-mono text-[12px] text-[var(--ink-subtle)]">
                    模型 {agent.magpieModel || agent.modelHint || '继承默认'} · effort{' '}
                    {agent.magpieEffort || agent.reasoningEffort || 'medium'}
                    {ping
                      ? ` · ${ping.reachable ? `检查于 ${formatShortTime(ping.checkedAt)}` : ping.error || '拨测失败'}`
                      : ''}
                  </span>
                }
                control={
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusIndicator status={statusVal} label={statusText} />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPinging}
                      onClick={() => void onPingAgent(agent)}
                      data-testid={`ping-agent-${agent.id}`}
                    >
                      <Radio className={cn('size-3.5', isPinging && 'animate-pulse')} strokeWidth={1.75} />
                      {isPinging ? '拨测中...' : '拨测'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAgentInspector(agent)}
                    >
                      <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                      配置
                    </Button>
                  </div>
                }
              />
            );
          })
        )}
      </SettingGroup>

      <SettingGroup
        title="跨机器接入方案"
        description="选择组网方案并打开右侧抽屉自定义节点参数、复制一键安装与 A2A Peer 注册命令。"
      >
        {connectProfiles && connectProfiles.profiles.length > 0 ? (
          connectProfiles.profiles.map((profile) => {
            const isSelected = activeConnectProfile?.id === profile.id;
            return (
              <SettingRow
                key={profile.id}
                title={
                  <span className="inline-flex items-center gap-2">
                    <span>{profile.name}</span>
                    {profile.recommended && (
                      <span className="font-mono text-[11px] text-[var(--accent)]">· 推荐</span>
                    )}
                  </span>
                }
                meta={profile.badge}
                description={`${profile.whenToUse} · ${profile.securitySummary}`}
                testId={`connect-profile-${profile.id}`}
                onClick={() => {
                  onSelectProfileId(profile.id);
                  setScriptDrawerOpen(true);
                }}
                control={
                  <span
                    className={cn(
                      'text-[12px] font-medium',
                      isSelected ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]',
                    )}
                  >
                    查看脚本
                  </span>
                }
              />
            );
          })
        ) : (
          <div className="p-5 sm:p-6">
            <WidgetSkeleton heightClass="h-[140px]" label="正在生成跨机接入方案" />
          </div>
        )}
      </SettingGroup>

      <InspectorDrawer
        open={Boolean(editingAgent)}
        onOpenChange={(open) => {
          if (!open) setEditingAgentId(null);
        }}
        title={editingAgent ? `Agent 参数 · ${editingAgent.name}` : 'Agent 参数'}
        description={
          editingAgent
            ? `${editingAgent.harness} · ${editingAgent.nodeName || editingAgent.nodeId} · ${editingAgent.protocolVersion || 'A2A v0.3'}`
            : undefined
        }
        footer={
          editingAgent ? (
            <>
              {editingAgent.id !== leadAgentId && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={readOnly || savingAgent}
                  onClick={async () => {
                    await onSetLeadAgent(editingAgent.id);
                    setEditingAgentId(null);
                  }}
                  className="mr-auto"
                >
                  设为默认总指挥
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setEditingAgentId(null)}>
                取消
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={readOnly || savingAgent}
                onClick={() => void handleSaveAgent()}
              >
                <Save className="size-3.5" strokeWidth={1.75} />
                {savingAgent ? '保存中...' : '保存 Agent 配置'}
              </Button>
            </>
          ) : null
        }
      >
        {editingAgent && (
          <div className="space-y-4">
            <SettingsInsetSurface>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-[var(--ink-subtle)]">节点 ID</div>
                  <div className="font-mono text-[var(--ink)] truncate">{editingAgent.nodeId}</div>
                </div>
                <div>
                  <div className="text-[var(--ink-subtle)]">CLI 版本</div>
                  <div className="font-mono text-[var(--ink)]">{editingAgent.version || '-'}</div>
                </div>
              </div>
            </SettingsInsetSurface>

            <SettingsField label="绑定 / 推荐模型" hint="留空则继承全局默认模型">
              <CommandCombobox
                value={agentDraft.modelHint}
                disabled={readOnly || savingAgent}
                onChange={(modelHint) => setAgentDraft((prev) => ({ ...prev, modelHint }))}
                options={modelOptions}
                allowCustomValue
                placeholder="继承全局默认模型"
                searchPlaceholder="搜索在线节点模型..."
              />
            </SettingsField>

            <SettingsField label="默认推理思考深度">
              <SegmentedControl
                value={agentDraft.reasoningEffort}
                disabled={readOnly || savingAgent}
                onChange={(reasoningEffort) =>
                  setAgentDraft((prev) => ({ ...prev, reasoningEffort }))
                }
                options={EFFORT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                ariaLabel="Agent 推理思考深度"
                className="w-full"
              />
            </SettingsField>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium text-[var(--ink)]">允许接收委派任务</div>
                <div className="text-[12px] text-[var(--ink-muted)]">
                  关闭后该 Agent 不会进入自动路由候选池。
                </div>
              </div>
              <Switch
                checked={agentDraft.delegatable}
                disabled={readOnly || savingAgent}
                onCheckedChange={(delegatable) =>
                  setAgentDraft((prev) => ({ ...prev, delegatable }))
                }
                ariaLabel="允许接收委派任务"
              />
            </div>
          </div>
        )}
      </InspectorDrawer>

      <InspectorDrawer
        open={scriptDrawerOpen}
        onOpenChange={setScriptDrawerOpen}
        size="lg"
        title={activeConnectProfile ? `跨机接入脚本 · ${activeConnectProfile.name}` : '跨机接入脚本'}
        description="自定义目标节点参数后重新生成命令，并一键复制至目标宿主机执行。"
      >
        <form
          onSubmit={onRegenerateProfiles}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b border-[var(--border-subtle)]"
        >
          <SettingsField label="目标节点 ID（可选）">
            <TextInput
              mono
              value={profileParams.nodeId}
              onChange={(e) =>
                onChangeProfileParams((prev) => ({ ...prev, nodeId: e.target.value }))
              }
              placeholder="node-macbook-01"
            />
          </SettingsField>
          <SettingsField label="设备类型">
            <NativeSelect
              value={profileParams.deviceType}
              onChange={(e) =>
                onChangeProfileParams((prev) => ({ ...prev, deviceType: e.target.value }))
              }
            >
              <option value="mac">macOS (Apple Silicon / Intel)</option>
              <option value="linux">Linux 服务器 / 工作站</option>
              <option value="windows">Windows / WSL2</option>
              <option value="docker">Docker 容器节点</option>
            </NativeSelect>
          </SettingsField>
          <SettingsField label="Tailscale / 网关地址（可选）" className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <TextInput
                mono
                value={profileParams.tailscaleHost}
                onChange={(e) =>
                  onChangeProfileParams((prev) => ({ ...prev, tailscaleHost: e.target.value }))
                }
                placeholder="100.64.0.10"
              />
              <Button type="submit" variant="secondary" size="sm" disabled={profilesLoading}>
                <RefreshCw
                  className={cn('size-3.5', profilesLoading && 'animate-spin')}
                  strokeWidth={1.75}
                />
                重新生成
              </Button>
            </div>
          </SettingsField>
        </form>

        {connectProfiles && connectProfiles.profiles.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="切换接入方案">
            {connectProfiles.profiles.map((profile) => {
              const active = activeConnectProfile?.id === profile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectProfileId(profile.id)}
                  className={cn(
                    'h-8 px-3 rounded-lg text-[12.5px] font-medium cursor-pointer transition-colors duration-150 ease-out',
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
                    FOCUS_RING,
                  )}
                >
                  {profile.name}
                </button>
              );
            })}
          </div>
        )}

        {activeConnectProfile ? (
          <div className="space-y-3.5">
            <SettingsInsetSurface>
              <div className="space-y-2 text-[12.5px]">
                <div>
                  <span className="text-[var(--ink-subtle)]">Hub 接入地址：</span>
                  <span className="font-mono text-[var(--ink)]">{activeConnectProfile.hubUrl}</span>
                </div>
                <div className="text-[var(--ink-muted)]">{activeConnectProfile.securitySummary}</div>
              </div>
            </SettingsInsetSurface>

            <CommandSnippet
              title="1. Hub 端准备工作"
              command={activeConnectProfile.hubPrepCmd}
              copyKey={`${activeConnectProfile.id}-hub`}
              copiedKey={copiedKey}
              onCopy={(k, t, l) => void onCopy(k, t, l)}
            />
            <CommandSnippet
              title="2. Linux 节点安装探针并注册"
              command={activeConnectProfile.linuxInstallCmd}
              copyKey={`${activeConnectProfile.id}-linux`}
              copiedKey={copiedKey}
              onCopy={(k, t, l) => void onCopy(k, t, l)}
            />
            <CommandSnippet
              title="3. macOS 节点安装探针并注册"
              command={activeConnectProfile.macosInstallCmd}
              copyKey={`${activeConnectProfile.id}-macos`}
              copiedKey={copiedKey}
              onCopy={(k, t, l) => void onCopy(k, t, l)}
            />
            <CommandSnippet
              title="4. Docker 容器化接入"
              command={activeConnectProfile.dockerCmd}
              copyKey={`${activeConnectProfile.id}-docker`}
              copiedKey={copiedKey}
              onCopy={(k, t, l) => void onCopy(k, t, l)}
            />
            {activeConnectProfile.a2aPeerCmd && (
              <CommandSnippet
                title="5. A2A Peer 互连注册命令"
                command={activeConnectProfile.a2aPeerCmd}
                copyKey={`${activeConnectProfile.id}-peer`}
                copiedKey={copiedKey}
                onCopy={(k, t, l) => void onCopy(k, t, l)}
              />
            )}
          </div>
        ) : (
          <WidgetSkeleton heightClass="h-[220px]" label="正在生成跨机接入命令" />
        )}
      </InspectorDrawer>
    </div>
  );
}
