import crypto from 'node:crypto';
import net from 'node:net';

const ALLOWED_METRICS = new Set([
  'host.memory.usedPercent',
  'host.load1',
  'host.disk.maxPercent',
  'gateway.latencyMs',
  'services.failedCount',
  'memory.offlineEngines',
  'fleet.offlineCount',
]);

const ALLOWED_OPERATORS = new Set(['gt', 'gte', 'lt', 'eq']);
const ALLOWED_SEVERITIES = new Set(['critical', 'warning', 'info']);
const ALLOWED_CHANNELS = new Set(['webhook', 'slack', 'telegram', 'discord', 'feishu', 'wecom', 'bark', 'email']);

const DEFAULT_RULES = [
  {
    id: 'rule-mem-high',
    name: '主机内存高水位预警',
    metric: 'host.memory.usedPercent',
    operator: 'gt',
    threshold: 85,
    forMinutes: 5,
    cooldownMinutes: 15,
    severity: 'warning',
    channel: 'webhook',
    channelTarget: '',
    enabled: true,
    builtin: true,
  },
  {
    id: 'rule-svc-failed',
    name: '核心受管服务故障中断',
    metric: 'services.failedCount',
    operator: 'gte',
    threshold: 1,
    forMinutes: 1,
    cooldownMinutes: 5,
    severity: 'critical',
    channel: 'telegram',
    channelTarget: '',
    enabled: true,
    builtin: true,
  },
  {
    id: 'rule-mem-engine-down',
    name: '记忆引擎探针不可达',
    metric: 'memory.offlineEngines',
    operator: 'gte',
    threshold: 1,
    forMinutes: 2,
    cooldownMinutes: 10,
    severity: 'critical',
    channel: 'webhook',
    channelTarget: '',
    enabled: true,
    builtin: true,
  },
  {
    id: 'rule-disk-high',
    name: '磁盘挂载点使用率超限',
    metric: 'host.disk.maxPercent',
    operator: 'gt',
    threshold: 85,
    forMinutes: 10,
    cooldownMinutes: 60,
    severity: 'warning',
    channel: 'slack',
    channelTarget: '',
    enabled: true,
    builtin: true,
  },
  {
    id: 'rule-gateway-slow',
    name: '模型网关探针延迟升高',
    metric: 'gateway.latencyMs',
    operator: 'gt',
    threshold: 250,
    forMinutes: 3,
    cooldownMinutes: 15,
    severity: 'warning',
    channel: 'discord',
    channelTarget: '',
    enabled: true,
    builtin: true,
  },
];

function isPrivateOrLoopbackHost(hostname) {
  const lower = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!lower) return true;
  if (lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) return true;
  const ipVer = net.isIP(lower);
  if (ipVer === 4) {
    const parts = lower.split('.').map(Number);
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  } else if (ipVer === 6) {
    if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      return true;
    }
  }
  return false;
}

export function validateWebhookUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { valid: true, url: '' };
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: '通知目标必须为有效的 HTTPS URL' };
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: '安全策略仅允许 HTTPS 协议的外部通知回调地址' };
  }
  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    return { valid: false, error: '禁止将告警回调指向回环、内网或云元数据地址' };
  }
  return { valid: true, url: parsed.toString() };
}

export function extractMetricValue(metric, snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  switch (metric) {
    case 'host.memory.usedPercent': {
      const v = snapshot.host?.memory?.usedPercent ?? snapshot.host?.memory?.usedPct;
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    }
    case 'host.load1': {
      const v = snapshot.host?.load1 ?? snapshot.host?.cpu?.load1 ?? snapshot.host?.loadAvg?.[0];
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    }
    case 'host.disk.maxPercent': {
      const disks = snapshot.host?.disks;
      if (!disks || disks.length === 0) return 0;
      let maxPct = 0;
      for (let i = 0; i < disks.length; i += 1) {
        const pct = Number(disks[i].usePercent ?? disks[i].usedPercent ?? 0);
        if (pct > maxPct) maxPct = pct;
      }
      return maxPct;
    }
    case 'gateway.latencyMs': {
      const v = snapshot.magpie?.latencyMs;
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    }
    case 'services.failedCount': {
      const items = snapshot.services?.items;
      if (!items) return 0;
      let count = 0;
      for (let i = 0; i < items.length; i += 1) {
        const s = items[i];
        if (s.status === 'failed' || (!s.optional && s.status === 'inactive')) count += 1;
      }
      return count;
    }
    case 'memory.offlineEngines': {
      const mem = snapshot.memory;
      if (!mem) return 0;
      let offline = 0;
      if (mem.nmem?.enabled && !mem.nmem.reachable) offline += 1;
      if (mem.openviking?.enabled && !mem.openviking.reachable) offline += 1;
      if (mem.symbiote?.enabled && !mem.symbiote.reachable) offline += 1;
      if (mem.rerank?.enabled && !mem.rerank.reachable) offline += 1;
      return offline;
    }
    case 'fleet.offlineCount': {
      const nodes = snapshot.fleet?.nodes;
      if (!nodes) return 0;
      let offline = 0;
      for (let i = 0; i < nodes.length; i += 1) {
        const st = nodes[i].status;
        if (st === 'offline' || st === 'failed') offline += 1;
      }
      return offline;
    }
    default:
      return null;
  }
}

export function compareThreshold(value, operator, threshold) {
  if (value === null || value === undefined || !Number.isFinite(value)) return false;
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'gte':
      return value >= threshold;
    case 'lt':
      return value < threshold;
    case 'eq':
      return value === threshold;
    default:
      return false;
  }
}

export function computeSlaSummary({ services = [], incidents = [], windowDays = 30 } = {}) {
  const windowMs = Math.max(1, Number(windowDays) || 30) * 86_400_000;
  const nowMs = Date.now();
  const sinceMs = nowMs - windowMs;

  const byEntity = new Map();
  let totalDowntimeMs = 0;
  let resolvedCount = 0;
  let totalResolutionMs = 0;
  let totalIncidents = 0;
  let openIncidents = 0;

  for (let i = 0; i < incidents.length; i += 1) {
    const inc = incidents[i];
    if (!inc.resolvedAt) openIncidents += 1;
    const tsMs = Date.parse(inc.ts || '');
    if (!Number.isFinite(tsMs) || tsMs < sinceMs) continue;
    totalIncidents += 1;
    const isDegraded = inc.toState === 'failed' || inc.toState === 'offline' || inc.toState === 'degraded';
    if (!isDegraded) continue;
    const resolvedMs = inc.resolvedAt ? Date.parse(inc.resolvedAt) : nowMs;
    const dur = Math.max(0, (Number.isFinite(resolvedMs) ? resolvedMs : nowMs) - tsMs);
    totalDowntimeMs += dur;
    if (inc.resolvedAt && Number.isFinite(resolvedMs)) {
      resolvedCount += 1;
      totalResolutionMs += dur;
    }
    const key = inc.entityKey || `service:${inc.node}`;
    let prev = byEntity.get(key);
    if (!prev) {
      prev = { downtimeMs: 0, count: 0 };
      byEntity.set(key, prev);
    }
    prev.downtimeMs += dur;
    prev.count += 1;
  }

  const serviceSlas = [];
  let uptimeSum = 0;
  for (let i = 0; i < services.length; i += 1) {
    const svc = services[i];
    if (svc.optional) continue;
    const rec = byEntity.get(`service:${svc.id}`);
    const downtimeMs = rec ? rec.downtimeMs : 0;
    const uptimePct = Number(Math.max(0, Math.min(100, ((windowMs - downtimeMs) / windowMs) * 100)).toFixed(3));
    uptimeSum += uptimePct;
    serviceSlas.push({
      id: svc.id,
      name: svc.name || svc.unit,
      layer: svc.layer || 'core',
      uptimePct,
      incidents: rec ? rec.count : 0,
      downtimeMin: Math.round(downtimeMs / 60_000),
      status: svc.status || 'healthy',
    });
  }

  const avgUptime = serviceSlas.length
    ? Number((uptimeSum / serviceSlas.length).toFixed(3))
    : 99.98;
  const mttrMinutes = resolvedCount > 0 ? Math.round(totalResolutionMs / resolvedCount / 60_000) : 0;

  return {
    windowDays,
    overallUptimePct: avgUptime,
    mttrMinutes,
    totalIncidents,
    openIncidents,
    totalDowntimeMin: Math.round(totalDowntimeMs / 60_000),
    services: serviceSlas,
  };
}

export class AlertEngine {
  constructor({ eventBus = null, logger = null, demo = false } = {}) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.demo = Boolean(demo);
    this.rules = DEFAULT_RULES.map((r) => ({ ...r }));
    this.rulesById = new Map(this.rules.map((r) => [r.id, r]));
    this.alerts = [];
    this.alertsById = new Map();
    this.silenceUntilMs = 0;
    this.lastFiredByRule = new Map();

    if (this.demo) {
      const now = Date.now();
      this.alerts = [
        {
          id: 'alrt-demo-1',
          ruleId: 'rule-gateway-slow',
          ruleName: '模型网关探针延迟升高',
          severity: 'warning',
          metric: 'gateway.latencyMs',
          value: 312,
          threshold: 250,
          channel: 'discord',
          status: 'active',
          firedAt: new Date(now - 9 * 60_000).toISOString(),
          ackedAt: null,
          ackedBy: null,
          summary: 'Mihomo 上游代理探测延迟短暂升至 312ms（阈值 > 250ms）',
        },
        {
          id: 'alrt-demo-2',
          ruleId: 'rule-mem-high',
          ruleName: '主机内存高水位预警',
          severity: 'info',
          metric: 'host.memory.usedPercent',
          value: 86.4,
          threshold: 85,
          channel: 'webhook',
          status: 'resolved',
          firedAt: new Date(now - 5 * 3600_000).toISOString(),
          ackedAt: new Date(now - 4.7 * 3600_000).toISOString(),
          ackedBy: 'operator',
          summary: 'OpenViking 批处理期间内存峰值 86.4%，目前已回落至 38.8%',
        },
      ];
      for (const a of this.alerts) this.alertsById.set(a.id, a);
    }
  }

  getState({ snapshot = null, incidents = [] } = {}) {
    const now = Date.now();
    const silenced = this.silenceUntilMs > now;
    return {
      ok: true,
      silenced,
      silenceUntil: silenced ? new Date(this.silenceUntilMs).toISOString() : null,
      rules: this.rules.map((r) => ({ ...r })),
      alerts: this.alerts.slice(0, 50),
      activeCount: this.alerts.filter((a) => a.status === 'active').length,
      sla: computeSlaSummary({
        services: snapshot?.services?.items || [],
        incidents,
        windowDays: 30,
      }),
      supportedMetrics: [...ALLOWED_METRICS],
      supportedChannels: [...ALLOWED_CHANNELS],
    };
  }

  createRule(input) {
    const name = String(input?.name || '').trim().slice(0, 80);
    if (!name) {
      const err = new Error('规则名称不能为空');
      err.statusCode = 400;
      throw err;
    }
    const metric = String(input?.metric || '').trim();
    if (!ALLOWED_METRICS.has(metric)) {
      const err = new Error(`不支持的监控指标: ${metric}`);
      err.statusCode = 400;
      throw err;
    }
    const operator = String(input?.operator || 'gt').trim();
    if (!ALLOWED_OPERATORS.has(operator)) {
      const err = new Error(`不支持的比较运算符: ${operator}`);
      err.statusCode = 400;
      throw err;
    }
    const threshold = Number(input?.threshold);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1_000_000) {
      const err = new Error('阈值必须为有效数值 (0 - 1,000,000)');
      err.statusCode = 400;
      throw err;
    }
    const severity = ALLOWED_SEVERITIES.has(String(input?.severity || 'warning'))
      ? String(input.severity)
      : 'warning';
    const channel = ALLOWED_CHANNELS.has(String(input?.channel || 'webhook'))
      ? String(input.channel)
      : 'webhook';
    const urlCheck = validateWebhookUrl(input?.channelTarget || '');
    if (!urlCheck.valid) {
      const err = new Error(urlCheck.error);
      err.statusCode = 400;
      throw err;
    }
    const forMinutes = Math.min(1440, Math.max(1, Math.round(Number(input?.forMinutes || 3))));
    const cooldownMinutes = Math.min(1440, Math.max(1, Math.round(Number(input?.cooldownMinutes || 15))));

    const rule = {
      id: `rule-${crypto.randomBytes(4).toString('hex')}`,
      name,
      metric,
      operator,
      threshold,
      forMinutes,
      cooldownMinutes,
      severity,
      channel,
      channelTarget: urlCheck.url,
      enabled: input?.enabled !== false,
      builtin: false,
    };
    this.rules.unshift(rule);
    this.rulesById.set(rule.id, rule);
    this.eventBus?.emit('alert_rule_created', { ruleId: rule.id, name: rule.name });
    return rule;
  }

  updateRule(ruleId, patch) {
    const rule = this.rulesById.get(ruleId);
    if (!rule) {
      const err = new Error(`未找到告警规则: ${ruleId}`);
      err.statusCode = 404;
      throw err;
    }
    if (typeof patch?.enabled === 'boolean') {
      rule.enabled = patch.enabled;
    }
    if (patch?.threshold !== undefined) {
      const t = Number(patch.threshold);
      if (Number.isFinite(t) && t >= 0 && t <= 1_000_000) {
        rule.threshold = t;
      }
    }
    if (patch?.channelTarget !== undefined) {
      const check = validateWebhookUrl(patch.channelTarget);
      if (!check.valid) {
        const err = new Error(check.error);
        err.statusCode = 400;
        throw err;
      }
      rule.channelTarget = check.url;
    }
    this.eventBus?.emit('alert_rule_updated', { ruleId: rule.id, enabled: rule.enabled });
    return { ...rule };
  }

  deleteRule(ruleId) {
    if (!this.rulesById.has(ruleId)) {
      const err = new Error(`未找到告警规则: ${ruleId}`);
      err.statusCode = 404;
      throw err;
    }
    const idx = this.rules.findIndex((r) => r.id === ruleId);
    const [removed] = this.rules.splice(idx, 1);
    this.rulesById.delete(ruleId);
    this.lastFiredByRule.delete(ruleId);
    this.eventBus?.emit('alert_rule_deleted', { ruleId: removed.id });
    return removed;
  }

  ackAlert(alertId, actor = 'web') {
    const item = this.alertsById.get(alertId);
    if (!item) {
      const err = new Error(`未找到告警事件: ${alertId}`);
      err.statusCode = 404;
      throw err;
    }
    item.status = 'acked';
    item.ackedAt = new Date().toISOString();
    item.ackedBy = String(actor || 'web').slice(0, 48);
    this.eventBus?.emit('alert_acked', { alertId: item.id, ackedBy: item.ackedBy });
    return { ...item };
  }

  setSilence(minutes) {
    const mins = Math.min(24 * 60, Math.max(0, Math.round(Number(minutes) || 0)));
    this.silenceUntilMs = mins > 0 ? Date.now() + mins * 60_000 : 0;
    const silenceUntil = this.silenceUntilMs > 0 ? new Date(this.silenceUntilMs).toISOString() : null;
    this.eventBus?.emit('alert_silence_updated', { silenceUntil });
    return { silenced: this.silenceUntilMs > Date.now(), silenceUntil };
  }

  evaluateSnapshot(snapshot) {
    if (!snapshot) return [];
    const now = Date.now();
    if (this.silenceUntilMs > now) return [];

    const newlyFired = [];
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      const val = extractMetricValue(rule.metric, snapshot);
      if (val === null) continue;
      const breached = compareThreshold(val, rule.operator, rule.threshold);
      if (!breached) continue;

      const lastMs = this.lastFiredByRule.get(rule.id) || 0;
      if (now - lastMs < rule.cooldownMinutes * 60_000) continue;
      this.lastFiredByRule.set(rule.id, now);

      const alert = {
        id: `alrt-${crypto.randomBytes(4).toString('hex')}`,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        metric: rule.metric,
        value: Number(val.toFixed(2)),
        threshold: rule.threshold,
        channel: rule.channel,
        status: 'active',
        firedAt: new Date(now).toISOString(),
        ackedAt: null,
        ackedBy: null,
        summary: `${rule.metric} 当前值 ${val} 触发条件 (${rule.operator} ${rule.threshold})`,
      };
      this.alerts.unshift(alert);
      this.alertsById.set(alert.id, alert);
      while (this.alerts.length > 100) {
        const evicted = this.alerts.pop();
        if (evicted) this.alertsById.delete(evicted.id);
      }
      newlyFired.push(alert);
      this.eventBus?.emit('alert_fired', alert);
    }
    return newlyFired;
  }
}
