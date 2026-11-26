import React from 'react';
import {
  BellOff,
  CheckCheck,
  CheckCircle2,
  FilePenLine,
  Plus,
  RefreshCw,
  Search,
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
import { formatRemainingSilence } from '../lib/module-helpers';
import { ModuleFrame } from '../modules/ModuleFrame';
import { formatDateTime, statusLabel } from '../utils/format';
import {
  Button,
  EmptyState,
  ErrorState,
  inputBaseClass,
  KpiStrip,
  Panel,
  ResourceMeter,
  SegmentedFilter,
  StatusIndicator,
  ToggleSwitch,
  type ConfirmModalState,
} from '../components/ui';

const SILENCE_DURATIONS = [
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 120, label: '2 小时' },
  { value: 480, label: '8 小时' },
] as const;

const ALERT_QUEUE_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'unacked', label: '未确认' },
  { value: 'acked', label: '已确认' },
] as const;

const RULE_STATUS_FILTERS = [
  { value: 'all', label: '全部规则' },
  { value: 'enabled', label: '已启用' },
  { value: 'paused', label: '已暂停' },
] as const;

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
  const [loadError, setLoadError] = React.useState('');
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

  // Wave 2: Silence window duration + live countdown + queue/rule filters
  const [silenceMinutes, setSilenceMinutes] = React.useState<number>(30);
  const [activeSilenceWindowMin, setActiveSilenceWindowMin] = React.useState<number>(30);
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());
  const [alertFilter, setAlertFilter] = React.useState<'all' | 'unacked' | 'acked'>('all');
  const [ruleQuery, setRuleQuery] = React.useState('');
  const [ruleStatusFilter, setRuleStatusFilter] = React.useState<'all' | 'enabled' | 'paused'>('all');

  const abortRef = React.useRef<AbortController | null>(null);

  const loadAlerts = React.useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchAlerts(controller.signal);
      if (!controller.signal.aborted) {
        setState(data);
      }
    } catch (err) {
      if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
      const msg = (err as Error).message || '告警中心请求失败';
      setLoadError(msg);
      onToast(`加载告警中心失败：${msg}`, 'err');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [onToast]);

  React.useEffect(() => {
    void loadAlerts();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadAlerts]);

  React.useEffect(() => {
    if (!state?.silenced || !state.silenceUntil) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state?.silenced, state?.silenceUntil]);

  const handleSilence = async (minutes: number) => {
    if (readOnly) {
      onToast('只读模式已禁用告警静默控制', 'err');
      return;
    }
    const prevState = state;
    const optimisticUntil = minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
    if (minutes > 0) {
      setActiveSilenceWindowMin(minutes);
      setNowMs(Date.now());
    }
    if (state) {
      setState({
        ...state,
        silenced: minutes > 0,
        silenceUntil: optimisticUntil,
      });
    }
    setBusyId('silence');
    try {
      const res = await setAlertSilence(minutes);
      setState((curr) =>
        curr ? { ...curr, silenced: res.silenced, silenceUntil: res.silenceUntil } : curr,
      );
      onToast(
        res.silenced ? `已开启全局告警静默 ${minutes} 分钟` : '已解除全局告警静默',
        'ok',
      );
    } catch (err) {
      if (prevState) setState(prevState);
      onToast(`操作失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkAck = async () => {
    if (readOnly || !state) {
      if (readOnly) onToast('只读模式已禁用告警确认', 'err');
      return;
    }
    const unacked = state.alerts.filter((al) => al.status !== 'acked');
    if (unacked.length === 0) return;
    const prevState = state;
    setState({
      ...state,
      alerts: state.alerts.map((al) => ({ ...al, status: 'acked' as const })),
      activeCount: 0,
    });
    setBusyId('bulk-ack');
    try {
      await Promise.all(unacked.map((al) => ackAlert(al.id)));
      onToast(`已批量确认 ${unacked.length} 条告警`, 'ok');
    } catch (err) {
      setState(prevState);
      onToast(`批量确认失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyId(null);
    }
  };

  const handleAck = async (alertId: string) => {
    if (readOnly) {
      onToast('只读模式已禁用告警确认', 'err');
      return;
    }
    const prevState = state;
    if (state) {
      const nextAlerts = state.alerts.map((al) =>
        al.id === alertId ? { ...al, status: 'acked' as const } : al,
      );
      const nextActive = nextAlerts.filter((al) => al.status !== 'acked').length;
      setState({ ...state, alerts: nextAlerts, activeCount: nextActive });
    }
    setBusyId(alertId);
    try {
      await ackAlert(alertId);
      onToast('已确认该告警', 'ok');
    } catch (err) {
      if (prevState) setState(prevState);
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
    const prevState = state;
    if (state) {
      setState({
        ...state,
        rules: state.rules.map((r) => (r.id === ruleId ? { ...r, enabled: nextEnabled } : r)),
      });
    }
    setBusyId(ruleId);
    try {
      await toggleAlertRule(ruleId, nextEnabled);
      onToast(nextEnabled ? '已启用告警规则' : '已暂停告警规则', 'ok');
    } catch (err) {
      if (prevState) setState(prevState);
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
        const prevState = state;
        if (state) {
          setState({
            ...state,
            rules: state.rules.filter((r) => r.id !== ruleId),
          });
        }
        try {
          await deleteAlertRule(ruleId);
          onToast(`已删除规则「${name}」`, 'ok');
        } catch (err) {
          if (prevState) setState(prevState);
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

  const filteredAlerts = React.useMemo(() => {
    if (alertFilter === 'unacked') return alerts.filter((al) => al.status !== 'acked');
    if (alertFilter === 'acked') return alerts.filter((al) => al.status === 'acked');
    return alerts;
  }, [alerts, alertFilter]);

  const filteredRules = React.useMemo(() => {
    const q = ruleQuery.trim().toLowerCase();
    return rules.filter((r) => {
      if (ruleStatusFilter === 'enabled' && !r.enabled) return false;
      if (ruleStatusFilter === 'paused' && r.enabled) return false;
      if (!q) return true;
      const haystack = [r.name, r.metric, METRIC_LABELS[r.metric] || '', r.channel, r.severity]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rules, ruleQuery, ruleStatusFilter]);

  const silenceCountdown = React.useMemo(
    () => formatRemainingSilence(state?.silenceUntil, nowMs, activeSilenceWindowMin),
    [state?.silenceUntil, nowMs, activeSilenceWindowMin],
  );

  return (
    <ModuleFrame
      title="告警、事件与 SLA 可靠性"
      description="声明式指标阈值规则、SSRF 防护外发通知、维护静默窗口、30 天可用性与事件复盘记录。"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {state?.silenced ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busyId === 'silence' || readOnly}
              onClick={() => void handleSilence(0)}
              data-testid="unsilence-alerts-btn"
            >
              <BellOff className="size-4 text-[var(--warn)]" strokeWidth={1.75} />
              解除静默
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5">
              <select
                value={silenceMinutes}
                onChange={(e) => setSilenceMinutes(Number(e.target.value))}
                disabled={busyId === 'silence' || readOnly}
                aria-label="选择维护静默时长"
                data-testid="silence-duration-select"
                className={cn(
                  'ui-select h-8 pl-2.5 sm:text-[12.5px] font-mono tabular-nums cursor-pointer',
                  inputBaseClass,
                )}
              >
                {SILENCE_DURATIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                disabled={busyId === 'silence' || readOnly}
                onClick={() => void handleSilence(silenceMinutes)}
                data-testid="silence-alerts-btn"
              >
                <BellOff className="size-4 text-[var(--ink-muted)]" strokeWidth={1.75} />
                开启静默
              </Button>
            </div>
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
      }
    >
      {loadError && !state && (
        <Panel>
          <ErrorState
            title="告警中心加载失败"
            message={loadError}
            onRetry={() => void loadAlerts()}
            retrying={loading}
          />
        </Panel>
      )}

      {state?.silenced && state.silenceUntil && (
        <div
          data-testid="silence-active-banner"
          className="rounded-xl bg-[var(--warn)]/[0.08] px-4 py-3 space-y-2 text-[13px] text-[var(--warn)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              全局维护静默生效中 · 剩余{' '}
              <span className="font-mono tabular-nums font-semibold">
                {silenceCountdown.label}
              </span>{' '}
              <span className="font-mono text-[12px] opacity-80 tabular-nums">
                （直至 {formatDateTime(state.silenceUntil)}）
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => void handleSilence(0)} disabled={readOnly}>
              立即恢复通知
            </Button>
          </div>
          <div className="h-[3px] w-full rounded-full bg-[var(--warn)]/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--warn)] transition-[width] duration-500 ease-out"
              style={{ width: `${silenceCountdown.progressPct}%` }}
            />
          </div>
        </div>
      )}

      {loading && !state ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" aria-busy="true">
          <div className="lg:col-span-5 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
          <div className="lg:col-span-7 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
        </div>
      ) : (
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
      )}

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
          description="实时汇总触发中的阈值告警，支持按确认状态筛选及批量 Ack 消音。"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedFilter
                value={alertFilter}
                onChange={setAlertFilter}
                options={ALERT_QUEUE_FILTERS}
                ariaLabel="按确认状态筛选告警"
              />
              {activeCount > 1 && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === 'bulk-ack' || readOnly}
                  onClick={() => void handleBulkAck()}
                  data-testid="bulk-ack-alerts-btn"
                >
                  <CheckCheck className="size-3.5 text-[var(--ok)]" strokeWidth={1.75} />
                  {busyId === 'bulk-ack' ? '确认中...' : `全部确认 (${activeCount})`}
                </Button>
              )}
            </div>
          }
        >
          {filteredAlerts.length === 0 ? (
            <EmptyState
              title={alerts.length === 0 ? '当前无活跃告警' : '当前筛选下无告警'}
              message={
                alerts.length === 0
                  ? '所有启用中的阈值规则均处于健康水位。'
                  : '切换状态筛选即可查看其他告警记录。'
              }
              action={
                alertFilter !== 'all'
                  ? { label: '显示全部告警', onClick: () => setAlertFilter('all') }
                  : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {filteredAlerts.map((al) => {
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
        description={`按需启停内建与自定义阈值策略，当前匹配 ${filteredRules.length}/${rules.length} 条规则。`}
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <div className="relative w-full sm:w-52">
              <Search
                className="size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={ruleQuery}
                onChange={(e) => setRuleQuery(e.target.value)}
                placeholder="搜索规则名称或指标..."
                aria-label="搜索告警规则"
                data-testid="alert-rules-search"
                className={cn('w-full h-8 pl-8 pr-2.5 sm:text-[12.5px]', inputBaseClass)}
              />
            </div>
            <SegmentedFilter
              value={ruleStatusFilter}
              onChange={setRuleStatusFilter}
              options={RULE_STATUS_FILTERS}
              ariaLabel="按启用状态筛选规则"
            />
          </div>
        }
      >
        {filteredRules.length === 0 ? (
          <EmptyState
            message={rules.length === 0 ? '尚未定义任何告警规则。' : '未找到匹配的告警规则。'}
            action={
              ruleQuery || ruleStatusFilter !== 'all'
                ? {
                    label: '重置筛选',
                    onClick: () => {
                      setRuleQuery('');
                      setRuleStatusFilter('all');
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
                  <th className="py-2.5 pl-5 sm:pl-6 pr-3">规则名称</th>
                  <th className="py-2.5 px-3">指标条件</th>
                  <th className="py-2.5 px-3">级别与通道</th>
                  <th className="py-2.5 px-3">冷却</th>
                  <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">启用 / 操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {filteredRules.map((rule) => (
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
                        <p className="mt-1.5 text-[12.5px] text-[var(--ink)] bg-[var(--surface-subtle)]/75 rounded-lg px-3 py-2 text-pretty">
                          <span className="text-[var(--ink-subtle)] mr-1.5">复盘备注</span>
                          {inc.note}
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
    </ModuleFrame>
  );
}
