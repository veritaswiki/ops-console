import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildConfiguredAdapters,
  queryRemoteProbeLogs,
  scanAdapter,
  scrubSensitiveText,
} from './log-adapters.mjs';

export const ALLOWED_DIGEST_INTERVALS = new Set([0, 5, 15, 30, 60]);
export const DEFAULT_FAST_SCAN_SEC = 30;
export const DEFAULT_TRIAGE_DEBOUNCE_SEC = 45;
export const DEFAULT_DIGEST_INTERVAL_MINUTES = 15;
export const DEFAULT_HEARTBEAT_DIGEST_HOURS = 6;
const ALLOWED_READ_SINCE = new Set(['5m', '15m', '30m', '1h', '6h', '24h']);
const LEVEL_RANK = { crit: 2, err: 3, error: 3, warn: 4, warning: 4, notice: 5, info: 6, debug: 7 };

function isRemoteOnlineProbe(node) {
  if (!node || typeof node !== 'object') return false;
  const isLocal = Boolean(node.isLocal || node.probeMode === 'local');
  if (isLocal) return false;
  return node.status === 'online' || node.status === 'healthy' || node.status === 'degraded';
}

function resolveRemoteRpcUrl(node) {
  if (!node || typeof node !== 'object') return '';
  if (node.a2a?.rpcUrl) return String(node.a2a.rpcUrl);
  if (Array.isArray(node.harnesses)) {
    for (const h of node.harnesses) {
      if (h?.rpcUrl) return String(h.rpcUrl);
    }
  }
  return '';
}

function clampInt(raw, min, max, fallback) {
  const num = Math.round(Number(raw));
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function normalizeDigestInterval(raw, fallback = DEFAULT_DIGEST_INTERVAL_MINUTES) {
  const num = Math.round(Number(raw));
  if (!Number.isFinite(num)) return fallback;
  if (ALLOWED_DIGEST_INTERVALS.has(num)) return num;
  if (num <= 0) return 0;
  if (num <= 10) return 5;
  if (num <= 22) return 15;
  if (num <= 45) return 30;
  return 60;
}

export function buildDeterministicLogsFallback(payload = {}) {
  const anomalies = Array.isArray(payload.anomalies) ? payload.anomalies : [];
  const top = anomalies[0] || null;
  const services = Array.from(new Set(
    anomalies.map((a) => String(a?.serviceId || '')).filter(Boolean),
  )).slice(0, 8);
  const hasCritical = anomalies.some((a) => a?.severity === 'critical' || a?.kind === 'service_restart_or_failure');
  const severity = hasCritical ? 'critical' : (anomalies.length > 0 ? 'warn' : 'info');

  const rootCauses = [];
  for (const item of anomalies.slice(0, 4)) {
    if (item.kind === 'error_spike') {
      rootCauses.push({
        category: 'log_error_spike',
        confidence: 0.82,
        evidence: `${item.serviceId} 5m errors=${item.recentErrors} vs baseline=${item.baselineErrors} (${item.ratio}x)`,
        explanation: `Deterministic fast-path detected error rate surge >= 3x baseline on ${item.serviceId}.`,
      });
    } else if (item.kind === 'new_error_fingerprint') {
      rootCauses.push({
        category: 'new_error_fingerprint',
        confidence: 0.78,
        evidence: `${item.serviceId} fingerprint ${item.fingerprint}: ${String(item.template || '').slice(0, 120)}`,
        explanation: `First-seen error signature appeared in ${item.serviceId} native log stream.`,
      });
    } else if (item.kind === 'service_restart_or_failure') {
      rootCauses.push({
        category: 'service_instability',
        confidence: 0.85,
        evidence: `${item.serviceId} restarts=${item.restarts || 1}`,
        explanation: `Repeated process restart or crash signature observed for ${item.serviceId}.`,
      });
    } else if (item.kind === 'http_5xx_burst') {
      rootCauses.push({
        category: 'upstream_http_5xx',
        confidence: 0.8,
        evidence: `${item.serviceId} http_5xx=${item.http5xx}`,
        explanation: `Upstream 5xx error responses spiked in ${item.serviceId}.`,
      });
    }
  }

  const summary = anomalies.length === 0
    ? 'No anomalous log signatures detected in the evaluated window.'
    : `${anomalies.length} log anomalies across ${services.join(', ') || 'local services'}${top?.template ? ` (${String(top.template).slice(0, 90)})` : ''}.`;

  const label = top
    ? `${top.serviceId}: ${top.kind === 'error_spike' ? '错误率突增' : top.kind === 'new_error_fingerprint' ? '新错误指纹' : top.kind === 'service_restart_or_failure' ? '异常重启' : '5xx 突增'}`
    : '日志巡检正常';

  const suggestedActions = [];
  if (services[0]) {
    suggestedActions.push({
      title: `检查 ${services[0]} 原生日志上下文并核对最近变更`,
      commandHint: `journalctl -u ${services[0]} -n 80 --no-pager`,
      risk: 'low',
      requiresApproval: true,
    });
  }
  if (hasCritical && services[0]) {
    suggestedActions.push({
      title: `通过 Preflight + 人工确认评估是否需要受控重启 ${services[0]}`,
      commandHint: `POST /api/ai/preflight -> service.restart (${services[0]})`,
      risk: 'high',
      requiresApproval: true,
    });
  }

  return {
    severity,
    summary,
    rootCauses,
    affectedScopes: services,
    chartAnnotation: {
      label,
      severity,
      detail: summary.slice(0, 260),
    },
    suggestedActions,
    confidence: anomalies.length > 0 ? 0.76 : 0.9,
  };
}

export function buildDeterministicTelemetryFallback(payload = {}) {
  const logErrors = Number(payload.windowTotals?.errorCount || 0);
  const newFps = Number(payload.windowTotals?.newFingerprintCount || 0);
  const restarts = Number(payload.windowTotals?.restartCount || 0);
  const cacheAnomalies = Number(payload.cacheSummary?.anomalyCount || 0);
  const failedServices = Array.isArray(payload.failedServices) ? payload.failedServices : [];

  const hasCritical = restarts > 0 || failedServices.length > 0 || Number(payload.cacheSummary?.criticalCount || 0) > 0;
  const hasWarn = logErrors > 0 || newFps > 0 || cacheAnomalies > 0;
  const severity = hasCritical ? 'critical' : (hasWarn ? 'warn' : 'info');

  const rootCauses = [];
  if (failedServices.length > 0) {
    rootCauses.push({
      category: 'service_down',
      confidence: 0.9,
      evidence: `Failed services: ${failedServices.slice(0, 5).join(', ')}`,
      explanation: 'One or more supervised services reported unhealthy or failed state.',
    });
  }
  if (logErrors > 0 || newFps > 0) {
    rootCauses.push({
      category: 'log_error_drift',
      confidence: 0.76,
      evidence: `errors=${logErrors}, newFingerprints=${newFps}, restarts=${restarts}`,
      explanation: 'Deterministic Logs-to-Metrics window recorded elevated error or fingerprint activity.',
    });
  }
  if (cacheAnomalies > 0) {
    rootCauses.push({
      category: 'cache_hit_degradation',
      confidence: 0.78,
      evidence: `cacheAnomalies=${cacheAnomalies}, overallHitPct=${payload.cacheSummary?.overallHitPct ?? 'n/a'}`,
      explanation: 'Prompt cache hit rate drifted below threshold during the same telemetry window.',
    });
  }

  const summary = hasCritical || hasWarn
    ? `周期遥测巡检发现 ${logErrors} 条错误、${newFps} 个新指纹、${restarts} 次重启迹象、${cacheAnomalies} 项缓存异常。`
    : '周期遥测巡检无异常漂移（Nominal）。';

  return {
    severity,
    summary,
    rootCauses,
    affectedScopes: failedServices.slice(0, 8),
    chartAnnotation: {
      label: hasCritical ? '遥测巡检：高危漂移' : hasWarn ? '遥测巡检：发现漂移' : '周期巡检正常',
      severity,
      detail: summary.slice(0, 260),
    },
    suggestedActions: (hasCritical || hasWarn)
      ? [{
          title: '展开受影响服务的原生日志与缓存归因详情进行人工核查',
          commandHint: 'GET /api/observability/fingerprints',
          risk: 'low',
          requiresApproval: true,
        }]
      : [],
    confidence: 0.8,
  };
}

export class ObservabilityAdvisor {
  constructor(options = {}) {
    this.config = options.config || {};
    this.indexer = options.indexer;
    this.advisor = options.advisor || null;
    this.probeRegistry = options.probeRegistry || null;
    this.cacheMonitor = options.cacheMonitor || null;
    this.hub = options.hub || null;
    this.logger = options.logger || null;
    this.eventBus = options.eventBus || null;
    this.nowFn = options.nowFn || (() => Date.now());
    this.runCmdFn = options.runCmdFn || undefined;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.dataDir = options.dataDir || this.config.console?.dataDir || '';
    this.configFile = this.dataDir ? path.join(this.dataDir, 'observability-config.json') : '';

    const obsCfg = this.config.observability || {};
    this.settings = {
      enabled: obsCfg.enabled !== undefined ? Boolean(obsCfg.enabled) : true,
      retentionDays: clampInt(obsCfg.retentionDays, 1, 90, 7),
      maxDiskMb: clampInt(obsCfg.maxDiskMb, 16, 4096, 256),
      fastScanSec: clampInt(obsCfg.fastScanSec, 10, 300, DEFAULT_FAST_SCAN_SEC),
      triageDebounceSec: clampInt(obsCfg.triageDebounceSec, 15, 120, DEFAULT_TRIAGE_DEBOUNCE_SEC),
      triageEnabled: obsCfg.triageEnabled !== undefined ? Boolean(obsCfg.triageEnabled) : true,
      digestIntervalMinutes: normalizeDigestInterval(obsCfg.digestIntervalMinutes, DEFAULT_DIGEST_INTERVAL_MINUTES),
      silentSkip: obsCfg.silentSkip !== undefined ? Boolean(obsCfg.silentSkip) : true,
      heartbeatDigestHours: clampInt(obsCfg.heartbeatDigestHours, 0, 24, DEFAULT_HEARTBEAT_DIGEST_HOURS),
    };

    this._loaded = false;
    this._fastTimer = null;
    this._digestTimer = null;
    this._debounceTimer = null;
    this._scanning = false;
    this._pendingAnomalies = [];
    this._adapterStatus = new Map();
    this._lastProbeSynced = new Map();
    this._lastServiceStates = new Map();
    this._lastFastScanAt = null;
    this._lastTriageAt = null;
    this._lastDigestAt = null;
    this._lastLlmDigestAt = 0;
    this._silentSkipCount = 0;
    this._recentDigests = [];

    if (this.advisor) {
      this.advisor.registerDomain('logs', {
        description: 'Federated log anomaly triage, error-spike attribution, and chart annotations',
        systemPrompt: 'Focus on correlating newly appeared error fingerprints, >=3x error rate spikes, service restarts, and HTTP 5xx bursts from redacted external log adapters. Never invent numeric metric series; produce concise root causes, chartAnnotation, and approval-gated suggestedActions.',
        buildPrompt: (payload) => JSON.stringify(payload, null, 2),
        fallbackAnalyze: (payload) => buildDeterministicLogsFallback(payload),
      });
      this.advisor.registerDomain('telemetry', {
        description: 'Periodic slow-drift cross-signal observability digest (logs, services, cache)',
        systemPrompt: 'Correlate Logs-to-Metrics error/restart/5xx deltas, service health transitions, and runtime cache hit-rate drops into a concise periodic digest with chartAnnotation. Never execute actions.',
        buildPrompt: (payload) => JSON.stringify(payload, null, 2),
        fallbackAnalyze: (payload) => buildDeterministicTelemetryFallback(payload),
      });
    }
  }

  async ensureLoaded() {
    if (this._loaded) return;
    this._loaded = true;
    if (this.configFile) {
      try {
        const raw = await fs.readFile(this.configFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this._applySettingsPatch(parsed);
        }
      } catch {
        // first run
      }
    }
    this.indexer?.updateLimits?.({
      retentionDays: this.settings.retentionDays,
      maxDiskMb: this.settings.maxDiskMb,
    });
  }

  _applySettingsPatch(patch = {}) {
    if (patch.enabled !== undefined) this.settings.enabled = Boolean(patch.enabled);
    if (patch.retentionDays !== undefined) this.settings.retentionDays = clampInt(patch.retentionDays, 1, 90, this.settings.retentionDays);
    if (patch.maxDiskMb !== undefined) this.settings.maxDiskMb = clampInt(patch.maxDiskMb, 16, 4096, this.settings.maxDiskMb);
    if (patch.fastScanSec !== undefined) this.settings.fastScanSec = clampInt(patch.fastScanSec, 10, 300, this.settings.fastScanSec);
    if (patch.triageDebounceSec !== undefined) this.settings.triageDebounceSec = clampInt(patch.triageDebounceSec, 15, 120, this.settings.triageDebounceSec);
    if (patch.triageEnabled !== undefined) this.settings.triageEnabled = Boolean(patch.triageEnabled);
    if (patch.digestIntervalMinutes !== undefined) {
      this.settings.digestIntervalMinutes = normalizeDigestInterval(patch.digestIntervalMinutes, this.settings.digestIntervalMinutes);
    }
    if (patch.silentSkip !== undefined) this.settings.silentSkip = Boolean(patch.silentSkip);
    if (patch.heartbeatDigestHours !== undefined) {
      this.settings.heartbeatDigestHours = clampInt(patch.heartbeatDigestHours, 0, 24, this.settings.heartbeatDigestHours);
    }
  }

  async _persistConfig() {
    if (!this.configFile) return;
    await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const tmp = `${this.configFile}.tmp.${process.pid}.${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(this.settings, null, 2), { mode: 0o600 });
    await fs.chmod(tmp, 0o600).catch(() => {});
    await fs.rename(tmp, this.configFile);
  }

  getConfig() {
    const adv = this.advisor?.getConfig?.() || {};
    return {
      ...this.settings,
      advisorEnabled: adv.enabled ?? true,
      decisionModel: adv.model || 'auto/deepseek-v4.1-flash',
      cooldownMinutes: adv.cooldownMinutes ?? 15,
      maxCallsPerHour: adv.maxCallsPerHour ?? 12,
      dailyTokenBudget: adv.dailyTokenBudget ?? 120_000,
    };
  }

  async updateConfig(patch = {}) {
    await this.ensureLoaded();
    const prevRetention = this.settings.retentionDays;
    const prevMaxDisk = this.settings.maxDiskMb;
    this._applySettingsPatch(patch);
    this.indexer?.updateLimits?.({
      retentionDays: this.settings.retentionDays,
      maxDiskMb: this.settings.maxDiskMb,
    });
    if (this.settings.retentionDays < prevRetention || this.settings.maxDiskMb < prevMaxDisk) {
      await this.indexer?.pruneShards?.().catch(() => {});
    }
    if (this.advisor) {
      const advPatch = {};
      if (patch.advisorEnabled !== undefined) advPatch.enabled = Boolean(patch.advisorEnabled);
      if (patch.decisionModel !== undefined) advPatch.model = String(patch.decisionModel);
      if (patch.cooldownMinutes !== undefined) advPatch.cooldownMinutes = patch.cooldownMinutes;
      if (patch.maxCallsPerHour !== undefined) advPatch.maxCallsPerHour = patch.maxCallsPerHour;
      if (patch.dailyTokenBudget !== undefined) advPatch.dailyTokenBudget = patch.dailyTokenBudget;
      if (Object.keys(advPatch).length > 0) {
        await this.advisor.updateConfig(advPatch);
      }
    }
    await this._persistConfig().catch(() => {});
    if (this._fastTimer || this._digestTimer) {
      this.stop();
      this.start();
    }
    return this.getConfig();
  }

  listAdapters() {
    const adapters = buildConfiguredAdapters(this.config);
    const localItems = adapters.map((adapter) => {
      const st = this._adapterStatus.get(adapter.id) || {};
      return {
        id: adapter.id,
        name: adapter.name,
        kind: adapter.kind,
        enabled: adapter.enabled,
        serviceId: adapter.serviceId,
        origin: adapter.origin,
        target: adapter.unit || adapter.container || adapter.url || adapter.path || adapter.id,
        cursor: this.indexer?.getCursor?.(adapter.id) || null,
        lastScanAt: st.lastScanAt || null,
        lastOk: st.lastOk ?? null,
        lastError: st.lastError || null,
        lastEntries: st.lastEntries ?? 0,
        lastBytesRead: st.lastBytesRead ?? 0,
      };
    });

    const remoteNodes = [];
    if (this.probeRegistry) {
      const fleet = this.probeRegistry.buildFleetView({ snapshot: {} });
      for (const node of fleet.nodes || []) {
        if (!isRemoteOnlineProbe(node)) continue;
        const rpcUrl = resolveRemoteRpcUrl(node);
        remoteNodes.push({
          nodeId: node.id,
          name: node.name || node.id,
          status: node.status,
          hasLogTelemetry: Boolean(node.logs),
          collectedAt: node.logs?.collectedAt || null,
          serviceCount: Array.isArray(node.logs?.services) ? node.logs.services.length : 0,
          fingerprintCount: Array.isArray(node.logs?.fingerprints) ? node.logs.fingerprints.length : 0,
          directReadSupported: Boolean(rpcUrl),
        });
      }
    }

    return {
      adapters: localItems,
      remoteNodes,
    };
  }

  async _detectErrorSpikes() {
    const series = await this.indexer.queryMetricsSeries({ range: '1h', step: 300 });
    const recentSummary = await this.indexer.getServiceRollupSummary(5);
    const hourSummary = await this.indexer.getServiceRollupSummary(60);
    const hourMap = new Map(hourSummary.map((item) => [`${item.nodeId}|${item.serviceId}`, item]));
    const spikes = [];

    for (const recent of recentSummary) {
      if (recent.errorCount < 5) continue;
      const key = `${recent.nodeId}|${recent.serviceId}`;
      const hourItem = hourMap.get(key);
      const priorErrors = Math.max(0, (hourItem?.errorCount || recent.errorCount) - recent.errorCount);
      const baselinePer5m = priorErrors / 11;
      const effectiveBaseline = Math.max(1, baselinePer5m);
      const ratio = Math.round((recent.errorCount / effectiveBaseline) * 10) / 10;
      if (ratio >= 3) {
        spikes.push({
          kind: 'error_spike',
          severity: recent.errorCount >= 20 || ratio >= 6 ? 'critical' : 'warn',
          nodeId: recent.nodeId,
          serviceId: recent.serviceId,
          recentErrors: recent.errorCount,
          baselineErrors: Math.round(baselinePer5m * 10) / 10,
          ratio,
          escalationFactor: ratio >= 6 ? 2 : 1,
        });
      }
      if (recent.http5xxCount >= 5) {
        spikes.push({
          kind: 'http_5xx_burst',
          severity: recent.http5xxCount >= 15 ? 'critical' : 'warn',
          nodeId: recent.nodeId,
          serviceId: recent.serviceId,
          http5xx: recent.http5xxCount,
          escalationFactor: recent.http5xxCount >= 15 ? 2 : 1,
        });
      }
    }
    return { spikes, recentTotalPoints: series.points.length };
  }

  async runFastScan({ skipTriageSchedule = false } = {}) {
    await this.ensureLoaded();
    if (!this.settings.enabled || this._scanning) {
      return { ok: true, skipped: true, scanned: 0, anomalies: [] };
    }
    this._scanning = true;
    const nowMs = this.nowFn();
    const localNodeId = this.config.fleet?.localNode?.id || 'local';
    const anomalies = [];
    let totalScanned = 0;

    try {
      const adapters = buildConfiguredAdapters(this.config);
      for (const adapter of adapters) {
        if (!adapter.enabled) continue;
        const prevCursor = this.indexer.getCursor(adapter.id);
        const res = await scanAdapter(adapter, {
          cursor: prevCursor,
          since: '5m',
          limit: 200,
          nodeId: localNodeId,
          runCmdFn: this.runCmdFn,
          fetchImpl: this.fetchImpl,
        });
        this._adapterStatus.set(adapter.id, {
          lastScanAt: new Date(nowMs).toISOString(),
          lastOk: Boolean(res.ok),
          lastError: res.ok ? null : scrubSensitiveText(String(res.error || 'scan failed')).slice(0, 200),
          lastEntries: Array.isArray(res.entries) ? res.entries.length : 0,
          lastBytesRead: Number(res.bytesRead || 0),
        });
        if (res.ok) {
          if (res.nextCursor) this.indexer.setCursor(adapter.id, res.nextCursor);
          if (Array.isArray(res.entries) && res.entries.length > 0) {
            const ingest = await this.indexer.ingestEntries(res.entries);
            totalScanned += ingest.scanned;
            for (const fp of ingest.newFingerprints) {
              anomalies.push({
                kind: 'new_error_fingerprint',
                severity: fp.level === 'crit' ? 'critical' : 'warn',
                nodeId: fp.nodeId,
                serviceId: fp.serviceId,
                fingerprint: fp.fingerprint,
                template: fp.template,
                sampleRedacted: fp.sampleRedacted,
                sourceRef: fp.sourceRef,
                ts: fp.ts,
              });
            }
            if (ingest.restarts > 0) {
              anomalies.push({
                kind: 'service_restart_or_failure',
                severity: 'critical',
                nodeId: localNodeId,
                serviceId: adapter.serviceId,
                restarts: ingest.restarts,
                sourceRef: res.entries[res.entries.length - 1]?.sourceRef || null,
                ts: new Date(nowMs).toISOString(),
              });
            }
          }
        }
      }

      if (this.probeRegistry) {
        const fleet = this.probeRegistry.buildFleetView({ snapshot: {} });
        for (const node of fleet.nodes || []) {
          if (!isRemoteOnlineProbe(node) || !node.logs) continue;
          const stamp = String(node.logs.collectedAt || node.lastSeenAt || '');
          if (stamp && this._lastProbeSynced.get(node.id) === stamp) continue;
          if (stamp) this._lastProbeSynced.set(node.id, stamp);
          const remoteIngest = await this.indexer.ingestRemoteTelemetry(node.id, node.logs);
          totalScanned += remoteIngest.scanned;
          for (const fp of remoteIngest.newFingerprints) {
            anomalies.push({
              kind: 'new_error_fingerprint',
              severity: fp.level === 'crit' ? 'critical' : 'warn',
              nodeId: fp.nodeId,
              serviceId: fp.serviceId,
              fingerprint: fp.fingerprint,
              template: fp.template,
              sampleRedacted: fp.sampleRedacted,
              sourceRef: fp.sourceRef,
              ts: fp.ts,
            });
          }
        }
      }

      await this.indexer.saveCursors().catch(() => {});
      const { spikes } = await this._detectErrorSpikes();
      anomalies.push(...spikes);

      this._lastFastScanAt = new Date(nowMs).toISOString();

      if (anomalies.length > 0 && this.settings.triageEnabled && !skipTriageSchedule) {
        this._enqueueForTriage(anomalies);
      }

      this.eventBus?.emit?.('observability_updated', {
        ts: this._lastFastScanAt,
        scanned: totalScanned,
        anomaliesDetected: anomalies.length,
      });

      return {
        ok: true,
        scanned: totalScanned,
        anomalies,
      };
    } finally {
      this._scanning = false;
    }
  }

  _enqueueForTriage(anomalies) {
    for (const item of anomalies) {
      this._pendingAnomalies.push(item);
    }
    if (this._pendingAnomalies.length > 80) {
      this._pendingAnomalies = this._pendingAnomalies.slice(-80);
    }
    if (!this._debounceTimer) {
      const delayMs = this.settings.triageDebounceSec * 1000;
      this._debounceTimer = setTimeout(() => {
        this._debounceTimer = null;
        this.flushPendingTriage().catch((err) => {
          this.logger?.warn?.('obs_triage_flush_failed', { error: String(err?.message || err) });
        });
      }, delayMs);
      if (typeof this._debounceTimer.unref === 'function') this._debounceTimer.unref();
    }
  }

  async flushPendingTriage({ force = false } = {}) {
    await this.ensureLoaded();
    const batch = this._pendingAnomalies.splice(0, this._pendingAnomalies.length);
    if (batch.length === 0) {
      return { ok: true, skipped: true, reason: 'no_pending_anomalies', diagnoses: [] };
    }

    const grouped = new Map();
    for (const item of batch) {
      const groupKey = `${item.nodeId || 'local'}:${item.serviceId || 'unknown'}`;
      const list = grouped.get(groupKey) || [];
      list.push(item);
      grouped.set(groupKey, list);
    }

    const results = [];
    for (const [groupKey, groupItems] of grouped.entries()) {
      const primary = groupItems[0];
      const hasCritical = groupItems.some((i) => i.severity === 'critical');
      const maxEscalation = groupItems.reduce((m, i) => Math.max(m, Number(i.escalationFactor || 1)), 1);
      const sourceRef = groupItems.find((i) => i.sourceRef)?.sourceRef || {
        sourceKind: 'journald',
        sourceId: primary.serviceId,
        nodeId: primary.nodeId || 'local',
        ts: new Date(this.nowFn()).toISOString(),
        cursor: null,
      };

      const payload = {
        scope: groupKey,
        nodeId: primary.nodeId || 'local',
        serviceId: primary.serviceId || 'unknown',
        anomalyCount: groupItems.length,
        anomalies: groupItems.slice(0, 10),
      };

      const res = await this.advisor.analyze({
        domainId: 'logs',
        key: `${groupKey}:${primary.fingerprint || primary.kind}`,
        payload,
        trigger: 'event_triage',
        force,
        severity: hasCritical ? 'critical' : 'warn',
        escalationFactor: maxEscalation,
      });

      if (res?.diagnosis) {
        const ann = await this.indexer.recordAnnotation({
          tsMs: this.nowFn(),
          domainId: 'logs',
          severity: res.diagnosis.severity,
          nodeId: primary.nodeId || 'local',
          serviceId: primary.serviceId || 'unknown',
          label: res.diagnosis.chartAnnotation?.label || `${primary.serviceId} 异常分诊`,
          detail: res.diagnosis.chartAnnotation?.detail || res.diagnosis.summary,
          summary: res.diagnosis.summary,
          diagnosisId: res.diagnosis.id,
          trigger: 'event_triage',
          mode: res.diagnosis.mode,
          sourceRef,
          payload: {
            rootCauses: res.diagnosis.rootCauses,
            suggestedActions: res.diagnosis.suggestedActions,
            affectedScopes: res.diagnosis.affectedScopes,
            confidence: res.diagnosis.confidence,
            model: res.diagnosis.model,
          },
        });
        this._lastTriageAt = ann.isoTs;
        this.eventBus?.emit?.('observability_annotation', ann);
        results.push({ ...res, annotation: ann });
      } else {
        results.push(res);
      }
    }

    return {
      ok: true,
      skipped: false,
      diagnoses: results,
      diagnosis: results.find((item) => item?.diagnosis)?.diagnosis || null,
      annotation: results.find((item) => item?.annotation)?.annotation || null,
    };
  }

  async runPeriodicDigest({ force = false, trigger = 'periodic_digest' } = {}) {
    await this.ensureLoaded();
    if (!this.settings.enabled && !force) {
      return { ok: true, skipped: true, reason: 'disabled' };
    }
    const nowMs = this.nowFn();
    const windowMin = Math.max(5, this.settings.digestIntervalMinutes || 15);
    const serviceRollups = await this.indexer.getServiceRollupSummary(windowMin);
    const windowTotals = serviceRollups.reduce(
      (acc, item) => {
        acc.errorCount += item.errorCount;
        acc.warnCount += item.warnCount;
        acc.newFingerprintCount += item.newFingerprintCount;
        acc.restartCount += item.restartCount;
        acc.http5xxCount += item.http5xxCount;
        acc.totalScanned += item.totalScanned;
        return acc;
      },
      { errorCount: 0, warnCount: 0, newFingerprintCount: 0, restartCount: 0, http5xxCount: 0, totalScanned: 0 },
    );

    const failedServices = [];
    let stateTransitions = 0;
    if (this.hub && typeof this.hub.getLastSnapshot === 'function') {
      const snap = this.hub.getLastSnapshot();
      for (const svc of snap?.services || []) {
        const state = String(svc.status || svc.activeState || 'unknown');
        const prev = this._lastServiceStates.get(svc.id);
        if (prev && prev !== state) stateTransitions += 1;
        this._lastServiceStates.set(svc.id, state);
        if (state === 'failed' || state === 'error' || state === 'down') {
          failedServices.push(svc.id);
        }
      }
    }

    const cacheStatus = this.cacheMonitor?.getStatus ? await Promise.resolve(this.cacheMonitor.getStatus()).catch(() => null) : null;
    const cacheSummary = cacheStatus?.summary || null;
    const hasCacheDrift = Number(cacheSummary?.anomalyCount || 0) > 0;
    const hasLogDrift = windowTotals.newFingerprintCount > 0
      || windowTotals.errorCount >= 5
      || windowTotals.restartCount > 0
      || windowTotals.http5xxCount > 0;
    const hasAnyDrift = hasLogDrift || stateTransitions > 0 || failedServices.length > 0 || hasCacheDrift;

    const heartbeatDue = this.settings.heartbeatDigestHours > 0
      && this._lastLlmDigestAt > 0
      && (nowMs - this._lastLlmDigestAt) >= this.settings.heartbeatDigestHours * 3600 * 1000;

    if (!force && this.settings.silentSkip && !hasAnyDrift && !heartbeatDue) {
      this._silentSkipCount += 1;
      const ann = await this.indexer.recordAnnotation({
        tsMs: nowMs,
        domainId: 'telemetry',
        severity: 'info',
        nodeId: 'all',
        serviceId: 'all',
        label: '周期巡检正常 (Silent Skip)',
        detail: `最近 ${windowMin}m 窗口无新增错误指纹、无指标漂移、无服务状态跳变，跳过模型调用（0 Token）。`,
        summary: 'Nominal periodic check — silent skip (0 tokens).',
        trigger,
        mode: 'silent_skip',
        payload: {
          windowMinutes: windowMin,
          windowTotals,
          stateTransitions,
          cacheAnomalyCount: Number(cacheSummary?.anomalyCount || 0),
        },
      });
      this._lastDigestAt = ann.isoTs;
      this._recordRecentDigest({
        id: ann.id,
        ts: ann.isoTs,
        mode: 'silent_skip',
        severity: 'info',
        summary: ann.detail,
        tokensUsed: 0,
      });
      return {
        ok: true,
        skipped: true,
        skipReason: 'silent_skip_nominal',
        annotation: ann,
      };
    }

    const topFingerprints = await this.indexer.queryFingerprints({ range: '1h', limit: 8 });
    const payload = {
      windowMinutes: windowMin,
      windowTotals,
      stateTransitions,
      failedServices,
      topServices: serviceRollups.slice(0, 8),
      topFingerprints: topFingerprints.slice(0, 6).map((fp) => ({
        fingerprint: fp.fingerprint,
        nodeId: fp.nodeId,
        serviceId: fp.serviceId,
        level: fp.level,
        count: fp.count,
        template: fp.template,
      })),
      cacheSummary: cacheSummary
        ? {
            overallHitPct: cacheSummary.overallHitPct,
            anomalyCount: cacheSummary.anomalyCount,
            criticalCount: cacheSummary.criticalCount,
          }
        : null,
      heartbeatDue,
    };

    const severity = (failedServices.length > 0 || windowTotals.restartCount > 0 || Number(cacheSummary?.criticalCount || 0) > 0)
      ? 'critical'
      : (hasAnyDrift ? 'warn' : 'info');

    const res = await this.advisor.analyze({
      domainId: 'telemetry',
      key: 'periodic-digest',
      payload,
      trigger,
      force,
      severity,
    });

    if (res?.diagnosis) {
      this._lastLlmDigestAt = nowMs;
      const primarySvc = failedServices[0] || serviceRollups[0]?.serviceId || 'all';
      const primarySourceRef = topFingerprints[0]?.sourceRef || null;
      const ann = await this.indexer.recordAnnotation({
        tsMs: nowMs,
        domainId: 'telemetry',
        severity: res.diagnosis.severity,
        nodeId: topFingerprints[0]?.nodeId || 'all',
        serviceId: primarySvc,
        label: res.diagnosis.chartAnnotation?.label || '周期遥测巡检结论',
        detail: res.diagnosis.chartAnnotation?.detail || res.diagnosis.summary,
        summary: res.diagnosis.summary,
        diagnosisId: res.diagnosis.id,
        trigger,
        mode: res.diagnosis.mode,
        sourceRef: primarySourceRef,
        payload: {
          rootCauses: res.diagnosis.rootCauses,
          suggestedActions: res.diagnosis.suggestedActions,
          affectedScopes: res.diagnosis.affectedScopes,
          confidence: res.diagnosis.confidence,
          model: res.diagnosis.model,
        },
      });
      this._lastDigestAt = ann.isoTs;
      this._recordRecentDigest({
        id: ann.id,
        ts: ann.isoTs,
        mode: res.diagnosis.mode,
        severity: res.diagnosis.severity,
        summary: res.diagnosis.summary,
        tokensUsed: Number(res.diagnosis.inputTokens || 0) + Number(res.diagnosis.outputTokens || 0),
      });
      this.eventBus?.emit?.('observability_annotation', ann);
      return { ok: true, skipped: false, diagnosis: res.diagnosis, annotation: ann };
    }

    return { ok: true, skipped: Boolean(res?.skipped), skipReason: res?.skipReason || null, result: res };
  }

  _recordRecentDigest(entry) {
    this._recentDigests.unshift(entry);
    if (this._recentDigests.length > 30) this._recentDigests.length = 30;
  }

  async triggerManual({ mode = 'triage', force = true, serviceId = '', nodeId = '' } = {}) {
    await this.ensureLoaded();
    if (mode === 'digest') {
      return this.runPeriodicDigest({ force: Boolean(force), trigger: 'manual_digest' });
    }
    await this.runFastScan({ skipTriageSchedule: true });
    if (this._pendingAnomalies.length > 0) {
      return this.flushPendingTriage({ force: Boolean(force) });
    }

    const fps = await this.indexer.queryFingerprints({ range: '6h', serviceId, nodeId, limit: 8 });
    const rollups = await this.indexer.getServiceRollupSummary(60);
    const filteredRollups = serviceId ? rollups.filter((r) => r.serviceId === serviceId) : rollups;
    const primary = filteredRollups[0] || null;
    const anomalies = fps.slice(0, 6).map((fp) => ({
      kind: 'new_error_fingerprint',
      severity: fp.level === 'crit' ? 'critical' : 'warn',
      nodeId: fp.nodeId,
      serviceId: fp.serviceId,
      fingerprint: fp.fingerprint,
      template: fp.template,
      count: fp.count,
      sourceRef: fp.sourceRef,
    }));
    const res = await this.advisor.analyze({
      domainId: 'logs',
      key: `manual:${nodeId || 'all'}:${serviceId || primary?.serviceId || 'all'}`,
      payload: {
        manual: true,
        serviceId: serviceId || primary?.serviceId || 'all',
        nodeId: nodeId || primary?.nodeId || 'all',
        anomalies,
        serviceRollups: filteredRollups.slice(0, 6),
      },
      trigger: 'manual_triage',
      force: Boolean(force),
      severity: anomalies.some((a) => a.severity === 'critical') ? 'critical' : (anomalies.length > 0 ? 'warn' : 'info'),
    });

    let annotation = null;
    if (res?.diagnosis) {
      annotation = await this.indexer.recordAnnotation({
        tsMs: this.nowFn(),
        domainId: 'logs',
        severity: res.diagnosis.severity,
        nodeId: nodeId || primary?.nodeId || 'all',
        serviceId: serviceId || primary?.serviceId || 'all',
        label: res.diagnosis.chartAnnotation?.label || '手动日志分诊结论',
        detail: res.diagnosis.chartAnnotation?.detail || res.diagnosis.summary,
        summary: res.diagnosis.summary,
        diagnosisId: res.diagnosis.id,
        trigger: 'manual_triage',
        mode: res.diagnosis.mode,
        sourceRef: fps[0]?.sourceRef || null,
        payload: {
          rootCauses: res.diagnosis.rootCauses,
          suggestedActions: res.diagnosis.suggestedActions,
          affectedScopes: res.diagnosis.affectedScopes,
          confidence: res.diagnosis.confidence,
          model: res.diagnosis.model,
        },
      });
      this._lastTriageAt = annotation.isoTs;
      this.eventBus?.emit?.('observability_annotation', annotation);
    }

    return { ok: true, diagnosis: res?.diagnosis || null, annotation, skipped: Boolean(res?.skipped), skipReason: res?.skipReason || null };
  }

  async getStatus() {
    await this.ensureLoaded();
    const storage = await this.indexer.getStorageStats();
    const adapters = this.listAdapters();
    const serviceRollups = await this.indexer.getServiceRollupSummary(60);
    const recentAnnotations = await this.indexer.queryAnnotations({ range: '24h', limit: 20 });
    const advisorStatus = this.advisor?.getStatus ? await this.advisor.getStatus() : null;
    const totals1h = serviceRollups.reduce(
      (acc, item) => {
        acc.errorCount += item.errorCount;
        acc.warnCount += item.warnCount;
        acc.newFingerprintCount += item.newFingerprintCount;
        acc.restartCount += item.restartCount;
        acc.http5xxCount += item.http5xxCount;
        acc.totalScanned += item.totalScanned;
        return acc;
      },
      { errorCount: 0, warnCount: 0, newFingerprintCount: 0, restartCount: 0, http5xxCount: 0, totalScanned: 0 },
    );

    return {
      ok: true,
      config: this.getConfig(),
      storage,
      cadence: {
        fastScanSec: this.settings.fastScanSec,
        triageDebounceSec: this.settings.triageDebounceSec,
        triageEnabled: this.settings.triageEnabled,
        digestIntervalMinutes: this.settings.digestIntervalMinutes,
        silentSkip: this.settings.silentSkip,
        heartbeatDigestHours: this.settings.heartbeatDigestHours,
        lastFastScanAt: this._lastFastScanAt,
        lastTriageAt: this._lastTriageAt,
        lastDigestAt: this._lastDigestAt,
        silentSkipCount: this._silentSkipCount,
        pendingTriageCount: this._pendingAnomalies.length,
      },
      summary1h: totals1h,
      serviceRollups: serviceRollups.slice(0, 30),
      adapters: adapters.adapters,
      remoteNodes: adapters.remoteNodes,
      recentAnnotations,
      recentDigests: this._recentDigests.slice(0, 15),
      advisor: advisorStatus,
    };
  }

  async readAdapterLogs({
    adapterId = '',
    nodeId = '',
    sourceKind = '',
    target = '',
    since = '15m',
    level = 'all',
    limit = 100,
    q = '',
  } = {}) {
    await this.ensureLoaded();
    const cleanSince = ALLOWED_READ_SINCE.has(String(since || '15m')) ? String(since || '15m') : '15m';
    const cleanLimit = clampInt(limit, 10, 250, 100);
    const cleanLevel = String(level || 'all').trim().toLowerCase();
    const cleanQuery = String(q || '').trim().toLowerCase().slice(0, 120);
    const localNodeId = this.config.fleet?.localNode?.id || 'local';
    const requestedKind = String(sourceKind || '').trim().toLowerCase();
    const requestedTarget = String(target || '').trim();
    let requestedNodeId = String(nodeId || '').trim();

    if (!requestedNodeId && requestedKind === 'remote' && requestedTarget.includes(':')) {
      requestedNodeId = requestedTarget.split(':')[0];
    }

    const filterEntries = (entries) => {
      const maxRank = cleanLevel !== 'all' && cleanLevel in LEVEL_RANK ? LEVEL_RANK[cleanLevel] : 7;
      return (Array.isArray(entries) ? entries : [])
        .filter((entry) => {
          if (!entry) return false;
          if (maxRank < 7) {
            const entryRank = entry.level in LEVEL_RANK ? LEVEL_RANK[entry.level] : Number(entry.priority ?? 6);
            if (entryRank > maxRank) return false;
          }
          if (cleanQuery) {
            const haystack = `${entry.unit || ''} ${entry.serviceId || ''} ${entry.message || ''}`.toLowerCase();
            if (!haystack.includes(cleanQuery)) return false;
          }
          return true;
        })
        .slice(-cleanLimit);
    };

    if (requestedKind === 'remote' || (requestedNodeId && requestedNodeId !== 'local' && requestedNodeId !== localNodeId)) {
      const fleet = this.probeRegistry?.buildFleetView ? this.probeRegistry.buildFleetView({ snapshot: {} }) : { nodes: [] };
      const node = (fleet.nodes || []).find((n) => n.id === requestedNodeId);
      if (!node || !isRemoteOnlineProbe(node)) {
        return {
          ok: false,
          sourceKind: 'remote',
          nodeId: requestedNodeId || 'remote',
          target: requestedTarget,
          entries: [],
          bytesRead: 0,
          error: `Remote probe node '${requestedNodeId || 'unknown'}' is offline or not registered`,
        };
      }
      const rpcUrl = resolveRemoteRpcUrl(node);
      if (!rpcUrl) {
        return {
          ok: false,
          sourceKind: 'remote',
          nodeId: node.id,
          target: requestedTarget,
          entries: [],
          bytesRead: 0,
          error: `Remote probe node '${node.id}' does not expose an A2A RPC endpoint for direct log read`,
        };
      }
      const remoteTarget = requestedTarget.startsWith(`${node.id}:`)
        ? requestedTarget.slice(node.id.length + 1)
        : requestedTarget;
      const remoteKind = requestedKind && requestedKind !== 'remote' ? requestedKind : 'journald';
      const sharedSecret = String(this.config.a2a?.sharedSecret || '');
      const res = await queryRemoteProbeLogs({
        rpcUrl,
        nodeId: node.id,
        sourceKind: remoteKind,
        target: remoteTarget,
        since: cleanSince,
        level: cleanLevel,
        limit: cleanLimit,
        q: cleanQuery,
        sharedSecret,
        fetchImpl: this.fetchImpl,
      });
      return {
        ok: Boolean(res.ok),
        sourceKind: 'remote',
        nodeId: node.id,
        target: remoteTarget,
        entries: filterEntries(res.entries),
        bytesRead: 0,
        truncated: Boolean(res.truncated),
        error: res.ok ? undefined : res.error,
      };
    }

    const adapters = buildConfiguredAdapters(this.config);
    let matched = null;
    if (adapterId) {
      matched = adapters.find((a) => a.id === adapterId) || null;
    }
    if (!matched && requestedTarget) {
      matched = adapters.find((a) => {
        if (requestedKind && a.kind !== requestedKind) return false;
        return a.id === requestedTarget
          || a.serviceId === requestedTarget
          || a.unit === requestedTarget
          || a.path === requestedTarget
          || a.container === requestedTarget
          || a.name === requestedTarget;
      }) || null;
    }
    if (!matched) {
      return {
        ok: false,
        sourceKind: requestedKind || 'unknown',
        nodeId: localNodeId,
        target: requestedTarget || adapterId,
        entries: [],
        bytesRead: 0,
        error: 'Allowlisted log adapter not found for direct read',
      };
    }

    const res = await scanAdapter(matched, {
      cursor: null,
      since: cleanSince,
      limit: cleanLimit,
      nodeId: localNodeId,
      runCmdFn: this.runCmdFn,
      fetchImpl: this.fetchImpl,
    });
    return {
      ok: Boolean(res.ok),
      sourceKind: matched.kind,
      nodeId: localNodeId,
      target: matched.unit || matched.container || matched.url || matched.path || matched.id,
      adapterId: matched.id,
      entries: filterEntries(res.entries),
      bytesRead: Number(res.bytesRead || 0),
      error: res.ok ? undefined : res.error,
    };
  }

  start() {
    if (!this.settings.enabled || this.config.demo) return;
    if (!this._fastTimer) {
      const fastMs = Math.max(10_000, this.settings.fastScanSec * 1000);
      this._fastTimer = setInterval(() => {
        this.runFastScan().catch((err) => {
          this.logger?.warn?.('obs_fast_scan_failed', { error: String(err?.message || err) });
        });
      }, fastMs);
      if (typeof this._fastTimer.unref === 'function') this._fastTimer.unref();
    }
    if (!this._digestTimer && this.settings.digestIntervalMinutes > 0) {
      const digestMs = this.settings.digestIntervalMinutes * 60 * 1000;
      this._digestTimer = setInterval(() => {
        this.runPeriodicDigest().catch((err) => {
          this.logger?.warn?.('obs_periodic_digest_failed', { error: String(err?.message || err) });
        });
      }, digestMs);
      if (typeof this._digestTimer.unref === 'function') this._digestTimer.unref();
    }
  }

  stop() {
    if (this._fastTimer) {
      clearInterval(this._fastTimer);
      this._fastTimer = null;
    }
    if (this._digestTimer) {
      clearInterval(this._digestTimer);
      this._digestTimer = null;
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }
}
