import React from 'react';
import {
  BellOff,
  CheckCircle2,
  FilePenLine,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { AlertsStateResponse, IncidentItem } from '../types';
import {
  ackAlert,
  createAlertRule,
  deleteAlertRule,
  fetchAlerts,
  saveIncidentNote,
  setAlertSilence,
  toggleAlertRule,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { formatDateTime, statusLabel } from '../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  KpiStrip,
  Panel,
  ResourceMeter,
  StatusIndicator,
  ToggleSwitch,
  type ConfirmModalState,
} from '../components/ui';

const METRIC_LABELS: Record<string, string> = {
  'host.memory.usedPercent': '主机内存占用 (%)',
  'host.load1': '主机 1 分钟负载 (Load1)',
  'host.disk.maxPercent': '磁盘最高使用率 (%)',
  'gateway.latencyMs': '模型网关延迟 (ms)',
  'services.failedCount': '故障服务数量',
  'memory.offlineEngines': '离线记忆引擎数量',
  'fleet.offlineCount': '离线节点数量',
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  eq: '=',
};

const CHANNEL_LABELS: Record<string, string> = {
  webhook: 'HTTPS Webhook',
  slack: 'Slack',
  telegram: 'Telegram Bot',
  discord: 'Discord',
  feishu: '飞书机器人',
  wecom: '企业微信',
  bark: 'Bark 推送',
  email: 'Email',
};

export function AlertsView({
  incidents,
  readOnly,
  onRefreshIncidents,
  onToast,
  onConfirm,
}: {
  incidents: IncidentItem[];
  readOnly: boolean;
  onRefreshIncidents: () => Promise<void>;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const [state, setState] = React.useState<AlertsStateResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Rule creation form
  const [showCreate, setShowCreate] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const [ruleForm, setRuleForm] = React.useState({
    name: '',
    metric: 'host.memory.usedPercent',
    operator: 'gte',
    threshold: '85',
    severity: 'warning',
    channel: 'webhook',
    channelTarget: '',
    forMinutes: '5',
    cooldownMinutes: '30',
  });

  // Incident postmortem note editor
  const [editingIncidentId, setEditingIncidentId] = React.useState<string | null>(null);
  const [noteDraft, setNoteDraft] = React.useState('');
  const [savingNote, setSavingNote] = React.useState(false);

  const loadAlerts = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts();
      setState(data);
    } catch (err) {
      onToast(`加载告警中心失败：${(err as Error).message}`, 'err');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  React.useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const handleSilence = async (minutes: number) => {
    if (readOnly) {
      onToast('只读模式已禁用告警静默控制', 'err');
      return;
    }
    setBusyId('silence');
    try {
      const res = await setAlertSilence(minutes);
      onToast(
        res.silenced ? `已开启全局告警静默 ${minutes} 分钟` : '已解除全局告警静默',
        'ok',
      );
      await loadAlerts();
    } catch (err) {
      onToast(`操作失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyId(null);
    }
  };

  const handleAck = async (alertId: string) => {
    if (readOnly) {
      onToast('只读模式已禁用告警确认', 'err');
      return;
    }
    setBusyId(alertId);
    try {
      await ackAlert(alertId);
      onToast('已确认该告警', 'ok');
      await loadAlerts();
    } catch (err) {
      onToast(`确认失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleRule = async (ruleId: string, nextEnabled: boolean) => {
    if (readOnly) {
      onToast('只读模式已禁用规则切换', 'err');
      return;
    }
    setBusyId(ruleId);
    try {
      await toggleAlertRule(ruleId, nextEnabled);
      onToast(nextEnabled ? '已启用告警规则' : '已暂停告警规则', 'ok');
      await loadAlerts();
    } catch (err) {
      onToast(`更新失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRule = (ruleId: string, name: string) => {
    if (readOnly) {
      onToast('只读模式已禁用删除规则', 'err');
      return;
    }
    onConfirm({
      open: true,
      title: `删除告警规则：${name}`,
      description: '删除后该阈值监控将立即停止评估，历史已触发事件仍保留在记录中。',
      confirmLabel: '确认删除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteAlertRule(ruleId);
          onToast(`已删除规则「${name}」`, 'ok');
          await loadAlerts();
        } catch (err) {
          onToast(`删除失败：${(err as Error).message}`, 'err');
        }
      },
    });
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (readOnly) {
      onToast('只读模式已禁用新建规则', 'err');
      return;
    }
    const trimmedName = ruleForm.name.trim();
    const threshold = Number(ruleForm.threshold);
    if (!trimmedName) {
      setFormError('请输入规则名称');
      return;
    }
    if (!Number.isFinite(threshold)) {
      setFormError('请输入有效的数值阈值');
      return;
    }

    setBusyId('create');
    try {
      await createAlertRule({
        name: trimmedName,
        metric: ruleForm.metric,
        operator: ruleForm.operator,
        threshold,
        severity: ruleForm.severity,
        channel: ruleForm.channel,
        channelTarget: ruleForm.channelTarget.trim(),
        forMinutes: Number(ruleForm.forMinutes) || 0,
        cooldownMinutes: Number(ruleForm.cooldownMinutes) || 15,
      });
      setRuleForm((prev) => ({ ...prev, name: '', channelTarget: '' }));
      setShowCreate(false);
      onToast(`告警规则「${trimmedName}」已生效`, 'ok');
      await loadAlerts();
    } catch (err) {
      const msg = (err as Error).message || '创建失败';
      setFormError(msg);
      onToast(`创建规则失败：${msg}`, 'err');
    } finally {
      setBusyId(null);
    }
  };

  const startEditNote = (inc: IncidentItem) => {
    setEditingIncidentId(String(inc.id ?? ''));
    setNoteDraft(inc.note || '');
  };

  const handleSaveNote = async (incidentId: string | number) => {
    if (readOnly) {
      onToast('只读模式已禁用复盘备注编辑', 'err');
      return;
    }
    setSavingNote(true);
    try {
      await saveIncidentNote(incidentId, noteDraft.trim());
      setEditingIncidentId(null);
      onToast('事件复盘备注已保存', 'ok');
      await onRefreshIncidents();
    } catch (err) {
      onToast(`保存失败：${(err as Error).message}`, 'err');
    } finally {
      setSavingNote(false);
    }
  };

  const sla = state?.sla;
  const activeCount = state?.activeCount ?? 0;
  const rules = state?.rules || [];
  const alerts = state?.alerts || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--ink)] leading-tight text-balance">
            告警、事件与 SLA 可靠性
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed text-pretty">
            声明式指标阈值规则、SSRF 防护外发通知、维护静默窗口、30 天可用性与事件复盘记录。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {state?.silenced ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busyId === 'silence' || readOnly}
              onClick={() => void handleSilence(0)}
            >
              <BellOff className="size-4 text-[var(--warn)]" strokeWidth={1.75} />
              解除静默
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={busyId === 'silence' || readOnly}
              onClick={() => void handleSilence(30)}
            >
              <BellOff className="size-4 text-[var(--ink-muted)]" strokeWidth={1.75} />
              静默 30 分钟
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void loadAlerts()}
          >
            <RefreshCw className={cn('size-4 text-[var(--ink-muted)]', loading && 'animate-spin')} strokeWidth={1.75} />
            刷新
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={readOnly}
            onClick={() => setShowCreate((v) => !v)}
            data-testid="toggle-create-rule"
          >
            <Plus className="size-4" strokeWidth={1.75} />
            新建规则
          </Button>
        </div>
      </div>

      {state?.silenced && state.silenceUntil && (
        <div className="rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/5 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-[var(--warn)]">
          <span className="font-medium">
            全局维护静默生效中，将暂停外发告警直至 {formatDateTime(state.silenceUntil)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => void handleSilence(0)} disabled={readOnly}>
            立即恢复通知
          </Button>
        </div>
      )}

      <KpiStrip
        asymmetric
        cells={[
          {
            label: '30 天全栈 SLA 可用性',
            meta: sla ? `${sla.windowDays}d 滚动窗口` : undefined,
            value: sla ? `${sla.overallUptimePct.toFixed(2)}%` : '-',
            ratioPct: sla?.overallUptimePct ?? 99.9,
            sub: sla
              ? `MTTR ${sla.mttrMinutes}m · 累计故障时长 ${sla.totalDowntimeMin} 分钟`
              : '正在计算可用性指标',
            tone: sla && sla.overallUptimePct < 99.5 ? 'warn' : 'ok',
          },
          {
            label: '活跃未确认告警',
            value: String(activeCount),
            numeric: { primary: activeCount },
            sub: `${alerts.length} 条近期告警记录`,
            tone: activeCount > 0 ? 'err' : 'ok',
          },
          {
            label: '生效阈值规则',
            value: `${rules.filter((r) => r.enabled).length}/${rules.length}`,
            numeric: { primary: rules.filter((r) => r.enabled).length, denominator: rules.length },
            sub: '每次快照自动评估',
          },
          {
            label: '历史状态事件',
            value: String(incidents.length),
            numeric: { primary: incidents.length },
            sub: `${incidents.filter((i) => Boolean(i.note)).length} 条已附加复盘备注`,
          },
        ]}
      />

      {showCreate && (
        <Panel
          title="新建声明式告警规则"
          description="所有外发 Webhook 地址均强制 HTTPS 并阻断内网回环与元数据地址（SSRF 防护）。"
        >
          <form onSubmit={handleCreateRule} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">规则名称</span>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => {
                    setRuleForm((s) => ({ ...s, name: e.target.value }));
                    if (formError) setFormError('');
                  }}
                  placeholder="例如：主机内存高水位预警"
                  data-testid="alert-rule-name"
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </label>

              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">监控指标</span>
                <select
                  value={ruleForm.metric}
                  onChange={(e) => setRuleForm((s) => ({ ...s, metric: e.target.value }))}
                  className={cn('ui-select w-full h-9 pl-3 cursor-pointer', inputBaseClass)}
                >
                  {(state?.supportedMetrics || Object.keys(METRIC_LABELS)).map((m) => (
                    <option key={m} value={m}>
                      {METRIC_LABELS[m] || m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">条件与阈值</span>
                <div className="grid grid-cols-5 gap-2">
                  <select
                    value={ruleForm.operator}
                    onChange={(e) => setRuleForm((s) => ({ ...s, operator: e.target.value }))}
                    aria-label="比较操作符"
                    className={cn('ui-select col-span-2 h-9 pl-2.5 cursor-pointer', inputBaseClass)}
                  >
                    <option value="gte">≥</option>
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                    <option value="eq">=</option>
                  </select>
                  <input
                    type="number"
                    step="any"
                    value={ruleForm.threshold}
                    onChange={(e) => setRuleForm((s) => ({ ...s, threshold: e.target.value }))}
                    aria-label="告警阈值"
                    data-testid="alert-rule-threshold"
                    className={cn('col-span-3 h-9 px-3 font-mono tabular-nums', inputBaseClass)}
                  />
                </div>
              </label>

              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">严重等级</span>
                <select
                  value={ruleForm.severity}
                  onChange={(e) => setRuleForm((s) => ({ ...s, severity: e.target.value }))}
                  className={cn('ui-select w-full h-9 pl-3 cursor-pointer', inputBaseClass)}
                >
                  <option value="critical">Critical（紧急）</option>
                  <option value="warning">Warning（告警）</option>
                  <option value="info">Info（提示）</option>
                </select>
              </label>

              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">通知渠道</span>
                <select
                  value={ruleForm.channel}
                  onChange={(e) => setRuleForm((s) => ({ ...s, channel: e.target.value }))}
                  className={cn('ui-select w-full h-9 pl-3 cursor-pointer', inputBaseClass)}
                >
                  {(state?.supportedChannels || Object.keys(CHANNEL_LABELS)).map((ch) => (
                    <option key={ch} value={ch}>
                      {CHANNEL_LABELS[ch] || ch}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">
                  通知 Webhook URL（留空仅在控制台告警）
                </span>
                <input
                  type="url"
                  value={ruleForm.channelTarget}
                  onChange={(e) => setRuleForm((s) => ({ ...s, channelTarget: e.target.value }))}
                  placeholder="https://hooks.example.com/ops-alerts"
                  className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                />
              </label>
            </div>

            {formError && (
              <p role="alert" className="text-[12.5px] font-medium text-[var(--err)]">
                {formError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={busyId === 'create'}
                data-testid="submit-alert-rule"
              >
                {busyId === 'create' ? '保存中...' : '保存并启用'}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Panel
          className="lg:col-span-7"
          bodyClassName="p-0"
          title="活跃告警与处理队列"
          description="实时汇总触发中的阈值告警，支持一键确认（Ack）以消音升级链路。"
        >
          {alerts.length === 0 ? (
            <EmptyState
              title="当前无活跃告警"
              message="所有启用中的阈值规则均处于健康水位。"
            />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {alerts.map((al) => {
                const isAcked = al.status === 'acked';
                return (
                  <li
                    key={al.id}
                    className="px-5 sm:px-6 py-4 flex flex-wrap items-start justify-between gap-4 hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <StatusIndicator
                          status={isAcked ? 'healthy' : al.severity === 'critical' ? 'failed' : 'degraded'}
                          label={isAcked ? '已确认' : al.severity === 'critical' ? '紧急' : '告警'}
                        />
                        <span className="font-medium text-[13.5px] text-[var(--ink)] truncate">
                          {al.ruleName}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-[var(--ink-muted)] text-pretty">
                        {al.summary}
                      </p>
                      <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                        {METRIC_LABELS[al.metric] || al.metric} · 当前 {al.value}（阈值 {al.threshold}） · 触发于{' '}
                        {formatDateTime(al.firedAt)}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isAcked ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--ok)]">
                          <CheckCircle2 className="size-3.5" strokeWidth={1.75} />
                          Ack
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === al.id || readOnly}
                          onClick={() => void handleAck(al.id)}
                          data-testid={`ack-alert-${al.id}`}
                        >
                          <ShieldAlert className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                          确认告警
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          className="lg:col-span-5"
          title="30 天核心服务 SLA 明细"
          description="基于持久化故障事件与当前健康探针实时估算可用率。"
        >
          {!sla || sla.services.length === 0 ? (
            <EmptyState message="暂无服务可用性统计数据。" />
          ) : (
            <div className="space-y-3.5">
              {sla.services.slice(0, 7).map((svc) => (
                <ResourceMeter
                  key={svc.id}
                  label={svc.name}
                  value={svc.uptimePct}
                  valueText={`${svc.uptimePct.toFixed(2)}% · ${svc.incidents} 次事件`}
                  tone={svc.uptimePct < 99.0 ? 'err' : svc.uptimePct < 99.8 ? 'warn' : 'ok'}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="声明式告警规则库"
        description="按需启停内建与自定义阈值策略，所有配置实时应用于采集循环。"
        bodyClassName="p-0"
      >
        {rules.length === 0 ? (
          <EmptyState message="尚未定义任何告警规则。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 sm:pl-6 pr-3">规则名称</th>
                  <th className="py-2.5 px-3">指标条件</th>
                  <th className="py-2.5 px-3">级别与通道</th>
                  <th className="py-2.5 px-3">冷却</th>
                  <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">启用 / 操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                  >
                    <td className="py-3 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)] max-w-[240px] truncate" title={rule.name}>
                      {rule.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                      {METRIC_LABELS[rule.metric] || rule.metric} {OPERATOR_LABELS[rule.operator] || rule.operator}{' '}
                      <span className="text-[var(--ink)] font-semibold">{rule.threshold}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <StatusIndicator
                          status={rule.severity === 'critical' ? 'failed' : rule.severity === 'warning' ? 'degraded' : 'healthy'}
                          label={rule.severity}
                        />
                        <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                          {CHANNEL_LABELS[rule.channel] || rule.channel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
                      {rule.cooldownMinutes}m
                    </td>
                    <td className="py-3 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-3">
                        <ToggleSwitch
                          checked={rule.enabled}
                          onCheckedChange={(next) => void handleToggleRule(rule.id, next)}
                          label={rule.enabled ? '启用' : '暂停'}
                        />
                        {!rule.builtin && (
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => handleDeleteRule(rule.id, rule.name)}
                            aria-label={`删除规则 ${rule.name}`}
                            className={cn(
                              'h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--err)] hover:bg-[var(--err)]/10 transition-colors duration-150 ease-out cursor-pointer disabled:opacity-40',
                              FOCUS_RING,
                            )}
                          >
                            <Trash2 className="size-4" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="事件时间线与复盘备注 (Postmortem)"
        description="为持久化状态变更事件附加根因分析与处置结论，便于后续回溯。"
      >
        {incidents.length === 0 ? (
          <EmptyState message="暂无状态变更事件。" />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {incidents.slice(0, 10).map((inc, idx) => {
              const incKey = String(inc.id ?? idx);
              const actor = inc.node || inc.component || inc.target || inc.entityKey || '系统';
              const fromS = inc.fromState || inc.fromStatus || inc.from;
              const toS = inc.toState || inc.toStatus || inc.to;
              const transition = fromS || toS ? `${statusLabel(fromS)} → ${statusLabel(toS)}` : '';
              const isEditing = editingIncidentId === incKey && inc.id != null;
              return (
                <li key={incKey} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium text-[13.5px] text-[var(--ink)]">{actor}</span>
                        {transition && (
                          <span className="font-mono text-[12px] text-[var(--ink-muted)]">
                            {transition}
                          </span>
                        )}
                      </div>
                      {(inc.detail || inc.message) && (
                        <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)] text-pretty">
                          {inc.detail || inc.message}
                        </p>
                      )}
                      {inc.note && !isEditing && (
                        <p className="mt-1.5 text-[12.5px] text-[var(--ink)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-pretty">
                          复盘备注：{inc.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
                        {formatDateTime(inc.ts || inc.timestamp)}
                      </span>
                      {inc.id != null && !isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={readOnly}
                          onClick={() => startEditNote(inc)}
                          data-testid={`edit-incident-note-${inc.id}`}
                        >
                          <FilePenLine className="size-3.5" strokeWidth={1.75} />
                          {inc.note ? '编辑复盘' : '添加复盘'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {isEditing && inc.id != null && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="输入根因定位、影响面与改进动作..."
                        data-testid={`incident-note-input-${inc.id}`}
                        className={cn('flex-1 min-w-[220px] h-9 px-3', inputBaseClass)}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={savingNote}
                        onClick={() => void handleSaveNote(inc.id!)}
                        data-testid={`save-incident-note-${inc.id}`}
                      >
                        {savingNote ? '保存中...' : '保存备注'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingIncidentId(null)}
                      >
                        取消
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
