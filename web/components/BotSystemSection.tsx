import React from 'react';
import { Bot, Play, Plus, Power, Send, Trash2 } from 'lucide-react';
import { createBot, deleteBot, triggerBotEvent, updateBot } from '../api';
import type {
  BotChannel,
  BotFleetResponse,
  BotItem,
  BotRole,
  LinearProjectItem,
  ToastHandler,
} from '../types';
import { cn } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import { formatDateTime } from '../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  KpiStrip,
  Panel,
  StatusIndicator,
  type ConfirmModalState,
} from './ui';

const CHANNEL_OPTIONS: ReadonlyArray<{ value: BotChannel; label: string }> = [
  { value: 'github', label: 'GitHub' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'webhook', label: '通用 Webhook' },
];

const ROLE_OPTIONS: ReadonlyArray<{ value: BotRole; label: string }> = [
  { value: 'commander-bridge', label: '主控助手直连' },
  { value: 'triage-intake', label: '需求分诊入队' },
  { value: 'pr-reviewer', label: 'PR 评审守门' },
  { value: 'ops-alerter', label: '运维告警建单' },
  { value: 'custom', label: '自定义机器人' },
];

function channelLabel(ch: string): string {
  return CHANNEL_OPTIONS.find((c) => c.value === ch)?.label.split(' ')[0] || ch;
}

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
}

export function BotSystemSection({
  botsState,
  projects,
  availableAgents,
  readOnly = false,
  onReload,
  onToast,
  onConfirm,
}: {
  botsState: BotFleetResponse | null;
  projects: LinearProjectItem[];
  availableAgents: Array<{ id: string; name: string; role: string; harness: string }>;
  readOnly?: boolean;
  onReload: () => Promise<void>;
  onToast?: ToastHandler;
  onConfirm?: (modal: ConfirmModalState) => void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [busyBotId, setBusyBotId] = React.useState<string | null>(null);
  const [activeTriggerBotId, setActiveTriggerBotId] = React.useState<string | null>(null);
  const [triggerTitle, setTriggerTitle] = React.useState('');
  const [triggerMessage, setTriggerMessage] = React.useState('');
  const [triggerPriority, setTriggerPriority] = React.useState('high');
  const [triggerDispatch, setTriggerDispatch] = React.useState(true);

  const [form, setForm] = React.useState({
    name: '',
    handle: '',
    channel: 'github' as BotChannel,
    role: 'commander-bridge' as BotRole,
    boundAgentId: availableAgents[0]?.id || '',
    defaultProjectId: projects[0]?.id || '',
    webhookEnvVar: 'BOT_WEBHOOK_TOKEN',
    triggerKeywords: '/fix, /deploy, @bot',
    description: '',
    autoCreateIssue: true,
    autoDispatchCommander: true,
  });

  React.useEffect(() => {
    setForm((prev) => ({
      ...prev,
      boundAgentId: prev.boundAgentId || availableAgents[0]?.id || '',
      defaultProjectId: prev.defaultProjectId || projects[0]?.id || '',
    }));
  }, [availableAgents, projects]);

  const bots = botsState?.bots || [];
  const activities = botsState?.activities || [];
  const liveIntegrations = botsState?.liveIntegrations;
  const summary = botsState?.summary || {
    total: 0,
    enabled: 0,
    online: 0,
    totalEvents: 0,
    totalIssuesCreated: 0,
    totalTasksDispatched: 0,
    byChannel: {},
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '创建机器人')) return;
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await createBot({
        name: form.name.trim(),
        handle: form.handle.trim() || undefined,
        channel: form.channel,
        role: form.role,
        boundAgentId: form.boundAgentId || undefined,
        defaultProjectId: form.defaultProjectId || undefined,
        webhookEnvVar: form.webhookEnvVar.trim() || undefined,
        triggerKeywords: form.triggerKeywords,
        description: form.description.trim(),
        autoCreateIssue: form.autoCreateIssue,
        autoDispatchCommander: form.autoDispatchCommander,
      });
      onToast?.(`已建立 Bot：${res.bot.name} (${res.bot.handle})`, 'ok');
      setForm((prev) => ({
        ...prev,
        name: '',
        handle: '',
        description: '',
      }));
      await onReload();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '建立 Bot 失败'), 'err');
    } finally {
      setCreating(false);
    }
  };

  const handleQuickCreateGithubBot = async () => {
    if (guardReadOnly(readOnly, onToast, '创建 GitHub 机器人')) return;
    setCreating(true);
    try {
      const repoName = liveIntegrations?.repoFullName || '当前仓库';
      const res = await createBot({
        name: `${repoName} GitHub 评审 Bot`,
        handle: '@github-reviewer',
        channel: 'github',
        role: 'pr-reviewer',
        boundAgentId: availableAgents[0]?.id || undefined,
        defaultProjectId: projects[0]?.id || undefined,
        webhookEnvVar: 'GITHUB_TOKEN',
        triggerKeywords: '/review, /fix, /ship',
        description: `对接 ${repoName} 真实 PR / Issue 与 Actions CI 的自动化评审 Bot`,
        autoCreateIssue: true,
        autoDispatchCommander: true,
      });
      onToast?.(`已建立 Bot：${res.bot.name}`, 'ok');
      await onReload();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '建立 GitHub Bot 失败'), 'err');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleBot = async (bot: BotItem) => {
    if (guardReadOnly(readOnly, onToast, bot.enabled ? '停用机器人' : '启用机器人')) return;
    const prevEnabled = bot.enabled;
    const nextEnabled = !prevEnabled;
    setBusyBotId(bot.id);
    try {
      await updateBot(bot.id, { enabled: nextEnabled });
      await onReload();
      onToast?.(`${bot.name} 已${nextEnabled ? '启用' : '停用'}`, 'ok', {
        action: {
          label: '撤销',
          onClick: async () => {
            try {
              await updateBot(bot.id, { enabled: prevEnabled });
              await onReload();
              onToast?.(`已恢复 ${bot.name} 为${prevEnabled ? '启用' : '停用'}`, 'info');
            } catch (undoErr) {
              onToast?.(extractErrorMessage(undoErr, '撤销失败'), 'err');
            }
          },
        },
      });
    } catch (err) {
      onToast?.(extractErrorMessage(err, '切换 Bot 状态失败'), 'err');
    } finally {
      setBusyBotId(null);
    }
  };

  const executeDeleteBot = async (bot: BotItem) => {
    setBusyBotId(bot.id);
    try {
      await deleteBot(bot.id);
      if (activeTriggerBotId === bot.id) setActiveTriggerBotId(null);
      onToast?.(`已删除 Bot：${bot.name}`, 'info');
      await onReload();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '删除 Bot 失败'), 'err');
    } finally {
      setBusyBotId(null);
    }
  };

  const handleDeleteBot = (bot: BotItem) => {
    if (guardReadOnly(readOnly, onToast, '删除机器人')) return;
    if (onConfirm) {
      onConfirm({
        open: true,
        title: `删除 Bot「${bot.name}」？`,
        description: '删除后该机器人将停止接收外部事件，原有事件记录仍会保留。',
        confirmLabel: '确认删除',
        danger: true,
        onConfirm: () => executeDeleteBot(bot),
      });
      return;
    }
    void executeDeleteBot(bot);
  };

  const handleTrigger = async (e: React.FormEvent, bot: BotItem) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '模拟触发机器人')) return;
    if (!triggerMessage.trim()) return;
    setBusyBotId(bot.id);
    try {
      const res = await triggerBotEvent(bot.id, {
        title: triggerTitle.trim() || undefined,
        message: triggerMessage.trim(),
        priority: triggerPriority,
        dispatchCommander: triggerDispatch,
      });
      const createdId = res.createdIssue?.identifier ? ` → 已建单 ${res.createdIssue.identifier}` : '';
      const subCount = res.dispatchResult?.createdSubIssues?.length || 0;
      const dispatchedMsg = subCount > 0 ? ` · 主控助手拆解 ${subCount} 个子任务` : '';
      onToast?.(`${bot.name} 已响应事件${createdId}${dispatchedMsg}`, 'ok');
      setTriggerTitle('');
      setTriggerMessage('');
      await onReload();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '触发 Bot 事件失败'), 'err');
    } finally {
      setBusyBotId(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="bot-system-section">
      <KpiStrip
        cells={[
          {
            label: '已注册 Bot',
            value: `${summary.online}/${summary.total}`,
            numeric: { primary: summary.online, denominator: summary.total },
            sub: `启用 ${summary.enabled} 个多渠道自动化 Bot`,
            tone: summary.online > 0 ? 'ok' : 'muted',
          },
          {
            label: '累计接收事件',
            value: String(summary.totalEvents),
            numeric: { primary: summary.totalEvents },
            sub: '支持 GitHub / Telegram / Discord / Slack / Webhook',
          },
          {
            label: '自动创建任务',
            value: String(summary.totalIssuesCreated),
            numeric: { primary: summary.totalIssuesCreated },
            sub: '自动写入任务看板待处理队列',
          },
          {
            label: '移交主控派发',
            value: String(summary.totalTasksDispatched),
            numeric: { primary: summary.totalTasksDispatched },
            sub: 'Bot 接单 → 主控拆解 → 助手执行',
            tone: summary.totalTasksDispatched > 0 ? 'ok' : 'muted',
          },
        ]}
      />

      {liveIntegrations && (
        <Panel
          title="实时通道与仓库自动化接入"
          description="自动检测本机 GitHub CLI、仓库 GitHub Actions 工作流与服务端 Bot 凭据环境变量就绪度（只读脱敏，不暴露密钥值）。"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-medium text-[var(--ink)]">
                  GitHub 仓库与 Actions 工作流 ({liveIntegrations.workflows.length})
                </span>
                <StatusIndicator
                  status={liveIntegrations.ghAuthenticated ? 'healthy' : 'standby'}
                  label={
                    liveIntegrations.ghAuthenticated
                      ? `gh 已登录${liveIntegrations.ghAccount ? ` (@${liveIntegrations.ghAccount})` : ''}`
                      : 'gh 未登录'
                  }
                />
              </div>
              {liveIntegrations.repoFullName && (
                <div className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                  当前仓库：{liveIntegrations.repoFullName}
                </div>
              )}
              {liveIntegrations.workflows.length === 0 ? (
                <div className="text-[12px] text-[var(--ink-subtle)]">
                  未在 .github/workflows 下检测到工作流 YAML。
                </div>
              ) : (
                <div className="space-y-1.5">
                  {liveIntegrations.workflows.map((wf) => (
                    <div
                      key={wf.file}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[12px]"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--ink)] truncate">{wf.name}</div>
                        <div className="font-mono text-[11px] text-[var(--ink-subtle)] truncate">{wf.file}</div>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--ink-muted)] shrink-0">
                        {wf.triggers.length > 0 ? wf.triggers.join(', ') : 'manual'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-[12px] font-medium text-[var(--ink)]">服务端凭据环境变量就绪状态</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {liveIntegrations.envStatus.map((envItem) => (
                  <div
                    key={envItem.name}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[12px]"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[11.5px] text-[var(--ink)] truncate">{envItem.name}</div>
                      <div className="text-[11px] text-[var(--ink-subtle)] truncate">{envItem.label}</div>
                    </div>
                    <StatusIndicator
                      status={envItem.configured ? 'healthy' : 'standby'}
                      label={envItem.configured ? '已配置' : '未设置'}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Create Bot Form */}
        <Panel
          title="建立新 Bot"
          description="创建绑定总指挥或 Worker Agent 的渠道 Bot，凭证统一通过服务端环境变量注入。"
          className="xl:col-span-5"
        >
          <form onSubmit={handleCreateBot} className="space-y-3.5" data-testid="create-bot-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">Bot 名称 *</span>
                <input
                  type="text"
                  required
                  disabled={readOnly || creating}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如：发布值守 Bot"
                  data-testid="bot-name-input"
                  className={cn('w-full h-9 px-3 text-[13px]', inputBaseClass)}
                />
              </label>

              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">Bot Handle</span>
                <input
                  type="text"
                  disabled={readOnly || creating}
                  value={form.handle}
                  onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                  placeholder="@release-bot"
                  data-testid="bot-handle-input"
                  className={cn('w-full h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">接入渠道</span>
                <select
                  disabled={readOnly || creating}
                  value={form.channel}
                  onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as BotChannel }))}
                  data-testid="bot-channel-select"
                  className={cn('ui-select w-full h-9 pl-3 text-[12.5px] cursor-pointer', inputBaseClass)}
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">职责角色</span>
                <select
                  disabled={readOnly || creating}
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as BotRole }))}
                  className={cn('ui-select w-full h-9 pl-3 text-[12.5px] cursor-pointer', inputBaseClass)}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">绑定执行 / 总指挥 Agent</span>
                <select
                  disabled={readOnly || creating}
                  value={form.boundAgentId}
                  onChange={(e) => setForm((f) => ({ ...f, boundAgentId: e.target.value }))}
                  className={cn('ui-select w-full h-9 pl-3 text-[12.5px] cursor-pointer', inputBaseClass)}
                >
                  {availableAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role === 'lead' ? '总指挥' : a.harness})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">默认归属项目</span>
                <select
                  disabled={readOnly || creating}
                  value={form.defaultProjectId}
                  onChange={(e) => setForm((f) => ({ ...f, defaultProjectId: e.target.value }))}
                  className={cn('ui-select w-full h-9 pl-3 text-[12.5px] cursor-pointer', inputBaseClass)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.key} · {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">服务端凭证环境变量名</span>
                <input
                  type="text"
                  disabled={readOnly || creating}
                  value={form.webhookEnvVar}
                  onChange={(e) => setForm((f) => ({ ...f, webhookEnvVar: e.target.value.toUpperCase() }))}
                  placeholder="GITHUB_WEBHOOK_SECRET"
                  className={cn('w-full h-9 px-3 font-mono text-[12px]', inputBaseClass)}
                />
              </label>

              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">触发指令 / 关键词</span>
                <input
                  type="text"
                  disabled={readOnly || creating}
                  value={form.triggerKeywords}
                  onChange={(e) => setForm((f) => ({ ...f, triggerKeywords: e.target.value }))}
                  placeholder="/fix, /ship, @commander"
                  className={cn('w-full h-9 px-3 font-mono text-[12px]', inputBaseClass)}
                />
              </label>
            </div>

            <label className="block space-y-1 text-[12.5px]">
              <span className="text-[var(--ink-muted)]">职责说明</span>
              <input
                type="text"
                disabled={readOnly || creating}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="例如：监听 GitHub PR 评论并自动转交总指挥拆解修复任务"
                className={cn('w-full h-9 px-3 text-[13px]', inputBaseClass)}
              />
            </label>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[12.5px] text-[var(--ink-muted)]">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={readOnly || creating}
                  checked={form.autoCreateIssue}
                  onChange={(e) => setForm((f) => ({ ...f, autoCreateIssue: e.target.checked }))}
                  className="accent-[var(--accent)]"
                />
                <span>收到事件自动创建任务</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={readOnly || creating}
                  checked={form.autoDispatchCommander}
                  onChange={(e) => setForm((f) => ({ ...f, autoDispatchCommander: e.target.checked }))}
                  className="accent-[var(--accent)]"
                />
                <span>自动移交主控助手拆解派发</span>
              </label>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={readOnly || creating || !form.name.trim()}
                data-testid="create-bot-submit"
                className="w-full sm:w-auto"
              >
                <Plus className="size-4" />
                {creating ? '创建中...' : '建立并激活 Bot'}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Registered Bots List + Inline Event Trigger */}
        <Panel
          title={`Bot 集群 (${bots.length})`}
          description="启停各渠道机器人，或发送模拟消息验证「接收消息 → 自动建单 → 主控派发」全链路。"
          className="xl:col-span-7"
          bodyClassName="p-0"
        >
          {bots.length === 0 ? (
            <div className="p-6 space-y-3 text-center">
              <EmptyState
                title="暂无已注册 Bot"
                message="尚未添加任何机器人。可在左侧创建多渠道 Bot，或一键接入本仓库的 GitHub 评审 Bot。"
              />
              {!readOnly && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={creating}
                  onClick={() => void handleQuickCreateGithubBot()}
                >
                  <Bot className="size-3.5" />
                  一键创建本仓库 GitHub Bot
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {bots.map((bot) => {
                const isBusy = busyBotId === bot.id;
                const isTriggerOpen = activeTriggerBotId === bot.id;
                const agentName =
                  availableAgents.find((a) => a.id === bot.boundAgentId)?.name || bot.boundAgentId || '未绑定';
                return (
                  <div
                    key={bot.id}
                    data-testid={`bot-card-${bot.id}`}
                    className="p-5 space-y-3 hover:bg-[var(--surface-hover)]/45 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ink)]">
                            <Bot className="size-4 text-[var(--accent)] shrink-0" />
                            <span>{bot.name}</span>
                          </span>
                          <span className="font-mono text-[12px] text-[var(--ink-subtle)]">{bot.handle}</span>
                          <StatusIndicator status={bot.enabled ? bot.status : 'standby'} label={bot.enabled ? '在线' : '已停用'} />
                        </div>

                        <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                          {channelLabel(bot.channel)} · {roleLabel(bot.role)} · 绑定 {agentName} · 凭证 {bot.webhookEnvVar || '无'}
                          {bot.hasServerSecret ? ' (已注入)' : ' (模拟模式)'}
                        </div>

                        {bot.description && (
                          <p className="text-[12.5px] text-[var(--ink-muted)] leading-relaxed">{bot.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums pt-0.5">
                          <span>事件 <strong className="text-[var(--ink)]">{bot.stats.eventsReceived}</strong></span>
                          <span aria-hidden="true">·</span>
                          <span>建单 <strong className="text-[var(--ink)]">{bot.stats.issuesCreated}</strong></span>
                          <span aria-hidden="true">·</span>
                          <span>总指挥派发 <strong className="text-[var(--ink)]">{bot.stats.tasksDispatched}</strong></span>
                          {bot.triggerKeywords.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[var(--ink-subtle)]">
                                指令 {bot.triggerKeywords.slice(0, 3).join(' / ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant={isTriggerOpen ? 'primary' : 'secondary'}
                          size="sm"
                          disabled={readOnly || isBusy || !bot.enabled}
                          data-testid={`bot-trigger-toggle-${bot.id}`}
                          onClick={() => {
                            if (isTriggerOpen) {
                              setActiveTriggerBotId(null);
                            } else {
                              setActiveTriggerBotId(bot.id);
                              setTriggerTitle('');
                              setTriggerMessage(`@commander 修复 ${channelLabel(bot.channel)} 渠道上报的生产延迟抖动`);
                              setTriggerDispatch(bot.autoDispatchCommander);
                            }
                          }}
                        >
                          <Play className="size-3.5" />
                          模拟触发
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={readOnly || isBusy}
                          aria-label={bot.enabled ? '停用 Bot' : '启用 Bot'}
                          title={bot.enabled ? '停用 Bot' : '启用 Bot'}
                          onClick={() => void handleToggleBot(bot)}
                        >
                          <Power className={cn('size-3.5', bot.enabled ? 'text-[var(--ok)]' : 'text-[var(--ink-subtle)]')} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={readOnly || isBusy}
                          aria-label="删除 Bot"
                          title="删除 Bot"
                          onClick={() => void handleDeleteBot(bot)}
                        >
                          <Trash2 className="size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]" />
                        </Button>
                      </div>
                    </div>

                    {isTriggerOpen && (
                      <form
                        onSubmit={(e) => void handleTrigger(e, bot)}
                        data-testid={`bot-trigger-form-${bot.id}`}
                        className="mt-2 pt-3 border-t border-[var(--border-subtle)] space-y-2.5 bg-[var(--surface-subtle)]/50 rounded-xl p-3.5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            value={triggerTitle}
                            onChange={(e) => setTriggerTitle(e.target.value)}
                            placeholder="可选：自定义任务标题"
                            className={cn('sm:col-span-2 h-8 px-2.5 text-[12.5px]', inputBaseClass)}
                          />
                          <select
                            value={triggerPriority}
                            onChange={(e) => setTriggerPriority(e.target.value)}
                            className={cn('ui-select h-8 pl-2.5 text-[12.5px] cursor-pointer', inputBaseClass)}
                          >
                            <option value="urgent">P0 紧急</option>
                            <option value="high">P1 高</option>
                            <option value="medium">P2 中</option>
                            <option value="low">P3 低</option>
                          </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            required
                            value={triggerMessage}
                            onChange={(e) => setTriggerMessage(e.target.value)}
                            placeholder="输入模拟消息或指令内容..."
                            data-testid="bot-trigger-message-input"
                            className={cn('flex-1 h-8 px-2.5 text-[12.5px]', inputBaseClass)}
                          />
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isBusy || !triggerMessage.trim()}
                            data-testid="bot-trigger-submit-btn"
                          >
                            <Send className="size-3.5" />
                            {isBusy ? '执行中...' : '发送测试消息'}
                          </Button>
                        </div>

                        <label className="inline-flex items-center gap-2 text-[12px] text-[var(--ink-muted)] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={triggerDispatch}
                            onChange={(e) => setTriggerDispatch(e.target.checked)}
                            className="accent-[var(--accent)]"
                          />
                          <span>建单后立即由主控助手拆解并派发执行</span>
                        </label>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Bot Real-time Activity Table */}
      <Panel
        title="Bot 事件与编排动态"
        description="记录所有 Bot 收到的触发消息、自动生成的 Linear Issue 编号及总指挥派发结果。"
        bodyClassName="p-0"
      >
        {activities.length === 0 ? (
          <EmptyState title="暂无触发记录" message="点击任意在线 Bot 的「模拟触发」以观察自动建单与总指挥派发轨迹。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11.5px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 px-5 font-medium whitespace-nowrap">时间</th>
                  <th className="py-2.5 px-4 font-medium whitespace-nowrap">Bot / 渠道</th>
                  <th className="py-2.5 px-4 font-medium">触发消息</th>
                  <th className="py-2.5 px-4 font-medium whitespace-nowrap">生成 Issue</th>
                  <th className="py-2.5 px-5 font-medium whitespace-nowrap text-right">总指挥派发</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {activities.slice(0, 16).map((act) => (
                  <tr key={act.id} className="hover:bg-[var(--surface-hover)]/50 transition-colors">
                    <td className="py-2.5 px-5 font-mono text-[12px] text-[var(--ink-subtle)] whitespace-nowrap tabular-nums">
                      {formatDateTime(act.ts)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-[var(--ink)]">{act.botName}</div>
                      <div className="font-mono text-[11px] text-[var(--ink-subtle)]">{channelLabel(act.channel)}</div>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--ink-muted)] max-w-[380px] truncate" title={act.message}>
                      {act.message}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[12px] text-[var(--accent)] whitespace-nowrap tabular-nums">
                      {act.createdIssueIdentifier || '-'}
                    </td>
                    <td className="py-2.5 px-5 whitespace-nowrap text-right">
                      <StatusIndicator
                        status={act.dispatched ? 'healthy' : 'standby'}
                        label={act.dispatched ? '已派发拆解' : '仅建单'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
