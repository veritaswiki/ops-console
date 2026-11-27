import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { redactText } from './redact.mjs';

const DEFAULT_INITIAL_TAIL_BYTES = 8 * 1024 * 1024;
const DEFAULT_TICK_READ_BYTES = 4 * 1024 * 1024;
const MAX_IN_MEMORY_RECORDS = 25_000;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_GAP_SEC = 300;
const SESSION_SALT = crypto.randomBytes(16).toString('hex');

function clampInt(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function clampFloat(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function round2(num) {
  return Math.round(num * 100) / 100;
}

function cleanLabel(value, fallback = 'unknown', maxLen = 80) {
  const raw = redactText(String(value || ''))
    .replace(/\b[A-Za-z0-9._%+-]+@(?![A-Za-z0-9.-]*\.(?:service|socket|timer|target|mount|slice|scope)\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
  if (!raw) return fallback;
  return raw.slice(0, maxLen);
}

function hashSessionId(sessionValue) {
  const raw = String(sessionValue || '').trim();
  if (!raw) return '';
  return crypto.createHash('sha256').update(`${SESSION_SALT}:${raw}`).digest('hex').slice(0, 10);
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * p)));
  return Math.round(sortedValues[idx]);
}

export function computeCacheHitPct(inputTokens, cacheRead, cacheWrite = 0) {
  const inTok = Math.max(0, Number(inputTokens) || 0);
  const readTok = Math.max(0, Number(cacheRead) || 0);
  const writeTok = Math.max(0, Number(cacheWrite) || 0);
  const denom = inTok + readTok + writeTok;
  if (denom <= 0) return null;
  return round2(Math.max(0, Math.min(100, (readTok / denom) * 100)));
}

/**
 * Strict privacy whitelist parser for a single Magpie usage.jsonl line.
 * Deliberately drops providerAccount, host, client_ip, providerKeyId,
 * native_session, response_id, raw session strings, and prompt bodies.
 */
export function parseSanitizedUsageLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed[0] !== '{') return null;
  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;

  const tsMs = typeof obj.t === 'number'
    ? obj.t
    : Date.parse(String(obj.t || ''));
  if (!Number.isFinite(tsMs) || tsMs <= 0) return null;

  const inputTokens = Math.max(0, Number(obj.in) || 0);
  const outputTokens = Math.max(0, Number(obj.out) || 0);
  const cacheRead = Math.max(0, Number(obj.cache_read) || 0);
  const cacheWrite = Math.max(0, Number(obj.cache_write) || 0);
  const ttftMs = Math.max(0, Number(obj.ttft_ms) || 0);
  const durationMs = Math.max(0, Number(obj.ms) || 0);
  const status = Number.isFinite(Number(obj.status)) ? Number(obj.status) : 200;
  const upParts = obj.up_parts && typeof obj.up_parts === 'object' ? obj.up_parts : {};
  const systemPart = Number.isFinite(Number(upParts.system)) ? Math.max(0, Number(upParts.system)) : null;
  const toolsPart = Number.isFinite(Number(upParts.tools)) ? Math.max(0, Number(upParts.tools)) : null;

  return {
    tsMs,
    agent: cleanLabel(obj.agent, 'unknown', 64),
    provider: cleanLabel(obj.provider, 'unknown', 64),
    model: cleanLabel(obj.model || obj.req, 'unknown', 120),
    req: cleanLabel(obj.req || obj.model, 'unknown', 120),
    served: cleanLabel(obj.served || obj.model, 'unknown', 120),
    ep: cleanLabel(obj.ep, 'unknown', 48),
    inputTokens,
    outputTokens,
    cacheRead,
    cacheWrite,
    ttftMs,
    durationMs,
    status,
    systemPart,
    toolsPart,
    sessionHash: hashSessionId(obj.session),
  };
}

export function resolveMagpieUsageFile(config = {}) {
  const magpie = config.connectors?.magpie || {};
  const explicit = String(magpie.usageFile || '').trim();
  if (explicit) return explicit;
  const configHome = String(magpie.configHome || '').trim();
  if (configHome) {
    return path.join(configHome, 'magpie', 'usage.jsonl');
  }
  return '/opt/magpie/config/magpie/usage.jsonl';
}

export function buildDeterministicCacheFallback(payload = {}) {
  const bucket = payload.bucket || payload;
  const scope = `${bucket.nodeId || 'local'}:${bucket.agent || 'unknown'}:${bucket.model || 'unknown'}`;
  const hitPct = bucket.cacheHitPct;
  const thresholdPct = Number(payload.thresholdPct ?? 90);
  const dropPct = Number(bucket.dropPct ?? 0);
  const severity = bucket.anomalySeverity === 'critical'
    ? 'critical'
    : (hitPct !== null && hitPct < Math.max(40, thresholdPct - 25) ? 'critical' : 'warn');

  const rootCauses = [];
  const suggestedActions = [];

  if (Number(bucket.systemDriftCount || 0) > 0) {
    rootCauses.push({
      category: 'system_prompt_drift',
      confidence: 0.85,
      evidence: `up_parts.system changed ${bucket.systemDriftCount} times (max delta ${bucket.systemDeltaBytes || 0} B)`,
      explanation: 'Dynamic system prompt content (timestamps, volatile memory snippets, or shifting instructions) breaks prompt cache prefix reuse.',
    });
    suggestedActions.push({
      title: 'Pin static system prompt prefix and move volatile context into trailing user turns',
      risk: 'low',
      requiresApproval: true,
    });
  }
  if (Number(bucket.toolsDriftCount || 0) > 0) {
    rootCauses.push({
      category: 'tools_schema_drift',
      confidence: 0.82,
      evidence: `up_parts.tools changed ${bucket.toolsDriftCount} times (max delta ${bucket.toolsDeltaBytes || 0} B)`,
      explanation: 'Tool definitions or MCP tool lists changed between turns, invalidating the cached tool-prefix KV block.',
    });
    suggestedActions.push({
      title: 'Keep MCP tool set stable within a session and enforce deterministic tool ordering',
      risk: 'low',
      requiresApproval: true,
    });
  }
  if (Number(bucket.routeSwitchCount || 0) > 0) {
    rootCauses.push({
      category: 'upstream_route_switch',
      confidence: 0.8,
      evidence: `provider/served model switched ${bucket.routeSwitchCount} times across ${(bucket.uniqueServedModels || []).length || 2} targets`,
      explanation: 'Traffic bounced across distinct upstream providers or backing models that do not share prompt KV caches.',
    });
    suggestedActions.push({
      title: 'Enable sticky session affinity on Magpie routing group for this agent',
      risk: 'medium',
      requiresApproval: true,
    });
  }
  if (Number(bucket.epSwitchCount || 0) > 0) {
    rootCauses.push({
      category: 'protocol_endpoint_change',
      confidence: 0.72,
      evidence: `API endpoint switched ${bucket.epSwitchCount} times`,
      explanation: 'Requests alternated across different API wire endpoints (e.g., responses vs chat/completions), fragmenting cache keys.',
    });
  }
  if (Number(bucket.longGapCount || 0) > 0) {
    rootCauses.push({
      category: 'session_ttl_expiry',
      confidence: 0.7,
      evidence: `${bucket.longGapCount} intra-session gaps exceeded ${SESSION_TTL_GAP_SEC}s (avg ${bucket.avgSessionGapSec || 0}s)`,
      explanation: 'Idle pauses between turns exceeded upstream prompt-cache TTL (~5 minutes), forcing cache rebuilds.',
    });
  }

  if (rootCauses.length === 0) {
    rootCauses.push({
      category: 'cold_start_or_short_turns',
      confidence: 0.55,
      evidence: `hitPct=${hitPct ?? 'n/a'}% across ${bucket.requests || 0} requests (threshold ${thresholdPct}%)`,
      explanation: 'Most requests appear to be short single-turn calls or fresh sessions without a warm shared prefix.',
    });
    suggestedActions.push({
      title: 'Inspect agent session reuse policy and verify prompt prefix stability',
      risk: 'low',
      requiresApproval: true,
    });
  }

  const topCause = rootCauses[0];
  const hitLabel = hitPct === null || hitPct === undefined ? 'n/a' : `${hitPct}%`;
  const summary = dropPct >= 15
    ? `${scope} cache hit dropped ${dropPct}pp to ${hitLabel} (likely ${topCause.category})`
    : `${scope} cache hit at ${hitLabel} < ${thresholdPct}% (likely ${topCause.category})`;

  return {
    severity,
    summary,
    rootCauses,
    affectedScopes: [scope],
    chartAnnotation: {
      label: `Cache ${hitLabel} · ${topCause.category}`,
      severity,
      detail: summary,
    },
    suggestedActions,
    confidence: topCause.confidence,
  };
}

export function aggregateSanitizedRecords(records, {
  nodeId = 'hub-local',
  nowMs = Date.now(),
  windowMinutes = 60,
  thresholdPct = 90,
  dropDeltaPct = 15,
  minSamples = 5,
} = {}) {
  const windowMs = Math.max(1, windowMinutes) * 60 * 1000;
  const windowStart = nowMs - windowMs;
  const grouped = new Map();

  for (const rec of records) {
    if (!rec || rec.tsMs < windowStart || rec.tsMs > nowMs + 60_000) continue;
    const key = `${nodeId}\0${rec.agent}\0${rec.model}`;
    let list = grouped.get(key);
    if (!list) {
      list = [];
      grouped.set(key, list);
    }
    list.push(rec);
  }

  const buckets = [];
  const anomalies = [];

  for (const [, list] of grouped.entries()) {
    list.sort((a, b) => a.tsMs - b.tsMs);
    const first = list[0];
    let tokensIn = 0;
    let tokensOut = 0;
    let cacheRead = 0;
    let cacheWrite = 0;
    let errorCount = 0;
    let ttftSum = 0;
    let ttftCount = 0;
    const latencies = [];

    let prevSystem = null;
    let prevTools = null;
    let prevRoute = null;
    let prevEp = null;
    let systemDriftCount = 0;
    let systemDeltaBytes = 0;
    let toolsDriftCount = 0;
    let toolsDeltaBytes = 0;
    let routeSwitchCount = 0;
    let epSwitchCount = 0;
    const uniqueServedModels = new Set();
    const uniqueProviders = new Set();
    const endpoints = new Set();
    const sessionLastTs = new Map();
    let gapSumSec = 0;
    let gapCount = 0;
    let longGapCount = 0;

    for (const rec of list) {
      tokensIn += rec.inputTokens;
      tokensOut += rec.outputTokens;
      cacheRead += rec.cacheRead;
      cacheWrite += rec.cacheWrite;
      if (rec.status >= 400) errorCount += 1;
      if (rec.ttftMs > 0) {
        ttftSum += rec.ttftMs;
        ttftCount += 1;
      }
      if (rec.durationMs > 0) latencies.push(rec.durationMs);
      uniqueServedModels.add(rec.served);
      uniqueProviders.add(rec.provider);
      endpoints.add(rec.ep);

      if (rec.systemPart !== null) {
        if (prevSystem !== null && rec.systemPart !== prevSystem) {
          systemDriftCount += 1;
          systemDeltaBytes = Math.max(systemDeltaBytes, Math.abs(rec.systemPart - prevSystem));
        }
        prevSystem = rec.systemPart;
      }
      if (rec.toolsPart !== null) {
        if (prevTools !== null && rec.toolsPart !== prevTools) {
          toolsDriftCount += 1;
          toolsDeltaBytes = Math.max(toolsDeltaBytes, Math.abs(rec.toolsPart - prevTools));
        }
        prevTools = rec.toolsPart;
      }
      const routeSig = `${rec.provider}|${rec.served}`;
      if (prevRoute !== null && routeSig !== prevRoute) {
        routeSwitchCount += 1;
      }
      prevRoute = routeSig;

      if (prevEp !== null && rec.ep !== prevEp) {
        epSwitchCount += 1;
      }
      prevEp = rec.ep;

      if (rec.sessionHash) {
        const prevTs = sessionLastTs.get(rec.sessionHash);
        if (prevTs !== undefined && rec.tsMs >= prevTs) {
          const gapSec = (rec.tsMs - prevTs) / 1000;
          gapSumSec += gapSec;
          gapCount += 1;
          if (gapSec > SESSION_TTL_GAP_SEC) longGapCount += 1;
        }
        sessionLastTs.set(rec.sessionHash, rec.tsMs);
      }
    }

    latencies.sort((a, b) => a - b);
    const cacheHitPct = computeCacheHitPct(tokensIn, cacheRead, cacheWrite);
    const requests = list.length;

    let baselineHitPct = null;
    let recentHitPct = null;
    let dropPct = 0;
    if (requests >= Math.max(4, minSamples)) {
      const splitIdx = Math.max(2, Math.floor(requests * 0.65));
      if (splitIdx < requests - 1) {
        const baseSlice = list.slice(0, splitIdx);
        const recentSlice = list.slice(splitIdx);
        baselineHitPct = computeCacheHitPct(
          baseSlice.reduce((s, r) => s + r.inputTokens, 0),
          baseSlice.reduce((s, r) => s + r.cacheRead, 0),
          baseSlice.reduce((s, r) => s + r.cacheWrite, 0),
        );
        recentHitPct = computeCacheHitPct(
          recentSlice.reduce((s, r) => s + r.inputTokens, 0),
          recentSlice.reduce((s, r) => s + r.cacheRead, 0),
          recentSlice.reduce((s, r) => s + r.cacheWrite, 0),
        );
        if (baselineHitPct !== null && recentHitPct !== null && baselineHitPct > recentHitPct) {
          dropPct = round2(baselineHitPct - recentHitPct);
        }
      }
    }

    const isSustainedLow = requests >= minSamples && cacheHitPct !== null && cacheHitPct < thresholdPct;
    const isSuddenDrop = requests >= minSamples && dropPct >= dropDeltaPct;
    let anomalyType = null;
    let anomalySeverity = null;
    if (isSustainedLow || isSuddenDrop) {
      anomalyType = isSuddenDrop && isSustainedLow
        ? 'sudden_drop_and_low'
        : (isSuddenDrop ? 'sudden_drop' : 'sustained_low');
      const isCritical = (cacheHitPct !== null && cacheHitPct < Math.max(40, thresholdPct - 25))
        || dropPct >= dropDeltaPct * 1.8;
      anomalySeverity = isCritical ? 'critical' : 'warn';
    }

    const bucket = {
      key: `${nodeId}:${first.agent}:${first.model}`,
      nodeId,
      source: 'local',
      agent: first.agent,
      model: first.model,
      requests,
      errorCount,
      errorRatePct: requests > 0 ? round2((errorCount / requests) * 100) : 0,
      tokensIn,
      tokensOut,
      cacheRead,
      cacheWrite,
      totalTokens: tokensIn + tokensOut + cacheRead + cacheWrite,
      cacheHitPct,
      baselineHitPct,
      recentHitPct,
      dropPct,
      avgTtftMs: ttftCount > 0 ? Math.round(ttftSum / ttftCount) : 0,
      p95LatencyMs: percentile(latencies, 0.95),
      systemDriftCount,
      systemDeltaBytes,
      toolsDriftCount,
      toolsDeltaBytes,
      routeSwitchCount,
      epSwitchCount,
      longGapCount,
      avgSessionGapSec: gapCount > 0 ? Math.round(gapSumSec / gapCount) : 0,
      uniqueServedModels: Array.from(uniqueServedModels).slice(0, 8),
      uniqueProviders: Array.from(uniqueProviders).slice(0, 8),
      endpoints: Array.from(endpoints).slice(0, 6),
      anomalyType,
      anomalySeverity,
      lastSeenAt: new Date(list[list.length - 1].tsMs).toISOString(),
    };
    buckets.push(bucket);
    if (anomalyType) {
      anomalies.push({
        key: bucket.key,
        nodeId: bucket.nodeId,
        agent: bucket.agent,
        model: bucket.model,
        anomalyType,
        severity: anomalySeverity,
        cacheHitPct: bucket.cacheHitPct,
        baselineHitPct: bucket.baselineHitPct,
        recentHitPct: bucket.recentHitPct,
        dropPct: bucket.dropPct,
        thresholdPct,
        requests: bucket.requests,
        driftSignals: {
          systemDriftCount,
          systemDeltaBytes,
          toolsDriftCount,
          toolsDeltaBytes,
          routeSwitchCount,
          epSwitchCount,
          longGapCount,
        },
        detectedAt: bucket.lastSeenAt,
      });
    }
  }

  buckets.sort((a, b) => {
    const aSev = a.anomalySeverity === 'critical' ? 2 : (a.anomalySeverity === 'warn' ? 1 : 0);
    const bSev = b.anomalySeverity === 'critical' ? 2 : (b.anomalySeverity === 'warn' ? 1 : 0);
    if (bSev !== aSev) return bSev - aSev;
    if (b.requests !== a.requests) return b.requests - a.requests;
    return a.key.localeCompare(b.key);
  });

  anomalies.sort((a, b) => {
    const aSev = a.severity === 'critical' ? 2 : 1;
    const bSev = b.severity === 'critical' ? 2 : 1;
    if (bSev !== aSev) return bSev - aSev;
    return (a.cacheHitPct ?? 100) - (b.cacheHitPct ?? 100);
  });

  return { buckets, anomalies };
}

export class RuntimeCacheMonitor {
  constructor(options = {}) {
    this.config = options.config || {};
    this.advisor = options.advisor || null;
    this.probeRegistry = options.probeRegistry || null;
    this.eventBus = options.eventBus || null;
    this.logger = options.logger || null;
    this.nowFn = options.nowFn || (() => Date.now());
    this.usageFile = options.usageFile !== undefined
      ? options.usageFile
      : resolveMagpieUsageFile(this.config);
    this.maxInitialTailBytes = clampInt(options.maxInitialTailBytes, 64 * 1024, 32 * 1024 * 1024, DEFAULT_INITIAL_TAIL_BYTES);
    this.dataDir = options.dataDir || this.config.console?.dataDir || '';
    this.stateFile = this.dataDir ? path.join(this.dataDir, 'cache-monitor-config.json') : '';

    const cmCfg = this.config.cacheMonitor || {};
    this.settings = {
      enabled: cmCfg.enabled !== undefined ? Boolean(cmCfg.enabled) : true,
      thresholdPct: clampFloat(cmCfg.thresholdPct, 1, 100, 90),
      dropDeltaPct: clampFloat(cmCfg.dropDeltaPct, 1, 100, 15),
      windowMinutes: clampInt(cmCfg.windowMinutes, 5, 1440, 60),
      minSamples: clampInt(cmCfg.minSamples, 1, 1000, 5),
      pollIntervalSec: clampInt(cmCfg.pollIntervalSec, 10, 3600, 60),
      analysisIntervalMinutes: clampInt(cmCfg.analysisIntervalMinutes, 0, 1440, 30),
    };

    this.cursor = {
      path: this.usageFile,
      inode: null,
      offset: 0,
      initialized: false,
      fileSize: 0,
      lastReadAt: null,
      sourceAvailable: false,
      parseErrors: 0,
      linesRead: 0,
    };

    this.records = [];
    this.lastAnomalyKeys = new Set();
    this.lastPeriodicAnalysisMs = 0;
    this._timer = null;
    this._loaded = false;
    this._refreshPromise = null;

    if (this.advisor) {
      this.advisor.registerDomain('cache', {
        description: 'Runtime prompt cache hit-rate drop & drift attribution',
        systemPrompt: 'Focus on prompt cache prefix stability (up_parts.system, up_parts.tools), upstream provider/served model route switching, API endpoint changes, and intra-session TTL expiry gaps.',
        buildPrompt: (payload) => JSON.stringify(payload, null, 2),
        fallbackAnalyze: (payload) => buildDeterministicCacheFallback(payload),
      });
    }
  }

  async ensureLoaded() {
    if (this._loaded || !this.stateFile) {
      this._loaded = true;
      return;
    }
    this._loaded = true;
    try {
      const raw = await fs.readFile(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this._applySettingsPatch(parsed);
      }
    } catch {
      // Use config defaults
    }
  }

  _applySettingsPatch(patch = {}) {
    if (patch.enabled !== undefined) this.settings.enabled = Boolean(patch.enabled);
    if (patch.thresholdPct !== undefined) this.settings.thresholdPct = clampFloat(patch.thresholdPct, 1, 100, this.settings.thresholdPct);
    if (patch.dropDeltaPct !== undefined) this.settings.dropDeltaPct = clampFloat(patch.dropDeltaPct, 1, 100, this.settings.dropDeltaPct);
    if (patch.windowMinutes !== undefined) this.settings.windowMinutes = clampInt(patch.windowMinutes, 5, 1440, this.settings.windowMinutes);
    if (patch.minSamples !== undefined) this.settings.minSamples = clampInt(patch.minSamples, 1, 1000, this.settings.minSamples);
    if (patch.pollIntervalSec !== undefined) this.settings.pollIntervalSec = clampInt(patch.pollIntervalSec, 10, 3600, this.settings.pollIntervalSec);
    if (patch.analysisIntervalMinutes !== undefined) this.settings.analysisIntervalMinutes = clampInt(patch.analysisIntervalMinutes, 0, 1440, this.settings.analysisIntervalMinutes);
  }

  async _persistConfig() {
    if (!this.stateFile) return;
    try {
      await fs.mkdir(path.dirname(this.stateFile), { recursive: true, mode: 0o700 });
      const tmpPath = `${this.stateFile}.tmp-${process.pid}-${Date.now()}`;
      await fs.writeFile(tmpPath, JSON.stringify(this.settings, null, 2), { mode: 0o600 });
      await fs.chmod(tmpPath, 0o600);
      await fs.rename(tmpPath, this.stateFile);
    } catch (err) {
      this.logger?.warn?.('cache_monitor_persist_failed', { error: err?.message || String(err) });
    }
  }

  getConfig() {
    const advisorCfg = this.advisor ? this.advisor.getConfig() : {};
    return {
      ...this.settings,
      advisorEnabled: advisorCfg.enabled ?? false,
      decisionModel: advisorCfg.model ?? 'auto/deepseek-v4.1-flash',
      cooldownMinutes: advisorCfg.cooldownMinutes ?? 15,
      maxCallsPerHour: advisorCfg.maxCallsPerHour ?? 12,
      dailyTokenBudget: advisorCfg.dailyTokenBudget ?? 120_000,
    };
  }

  async updateConfig(patch = {}) {
    await this.ensureLoaded();
    this._applySettingsPatch(patch);
    await this._persistConfig();

    if (this.advisor) {
      const advisorPatch = {};
      if (patch.advisorEnabled !== undefined) advisorPatch.enabled = Boolean(patch.advisorEnabled);
      if (patch.decisionModel !== undefined) advisorPatch.model = patch.decisionModel;
      if (patch.cooldownMinutes !== undefined) advisorPatch.cooldownMinutes = patch.cooldownMinutes;
      if (patch.maxCallsPerHour !== undefined) advisorPatch.maxCallsPerHour = patch.maxCallsPerHour;
      if (patch.dailyTokenBudget !== undefined) advisorPatch.dailyTokenBudget = patch.dailyTokenBudget;
      if (Object.keys(advisorPatch).length > 0) {
        await this.advisor.updateConfig(advisorPatch);
      }
    }

    if (this._timer) {
      this.stop();
      this.start();
    }
    return this.getConfig();
  }

  async readUsageIncremental() {
    const targetFile = this.usageFile;
    if (!targetFile) {
      this.cursor.sourceAvailable = false;
      return { added: 0, sourceAvailable: false };
    }

    let stat;
    try {
      stat = await fs.stat(targetFile);
    } catch {
      this.cursor.sourceAvailable = false;
      return { added: 0, sourceAvailable: false };
    }
    if (!stat.isFile()) {
      this.cursor.sourceAvailable = false;
      return { added: 0, sourceAvailable: false };
    }

    this.cursor.sourceAvailable = true;
    this.cursor.fileSize = stat.size;
    const nowMs = this.nowFn();
    const inode = String(stat.ino);

    let skipPartialFirstLine = false;
    if (!this.cursor.initialized) {
      this.cursor.inode = inode;
      if (stat.size > this.maxInitialTailBytes) {
        this.cursor.offset = stat.size - this.maxInitialTailBytes;
        skipPartialFirstLine = true;
      } else {
        this.cursor.offset = 0;
      }
      this.cursor.initialized = true;
    } else if (this.cursor.inode !== inode || stat.size < this.cursor.offset) {
      this.cursor.inode = inode;
      this.cursor.offset = stat.size > this.maxInitialTailBytes ? stat.size - this.maxInitialTailBytes : 0;
      skipPartialFirstLine = this.cursor.offset > 0;
    }

    const availableBytes = stat.size - this.cursor.offset;
    if (availableBytes <= 0) {
      this.cursor.lastReadAt = new Date(nowMs).toISOString();
      this._pruneRecords(nowMs);
      return { added: 0, sourceAvailable: true };
    }

    const readLimit = Math.min(availableBytes, this.cursor.linesRead === 0 ? this.maxInitialTailBytes : DEFAULT_TICK_READ_BYTES);
    const buffer = Buffer.allocUnsafe(readLimit);
    let bytesRead = 0;
    const handle = await fs.open(targetFile, 'r');
    try {
      const result = await handle.read(buffer, 0, readLimit, this.cursor.offset);
      bytesRead = result.bytesRead;
    } finally {
      await handle.close();
    }

    if (bytesRead <= 0) {
      this.cursor.lastReadAt = new Date(nowMs).toISOString();
      return { added: 0, sourceAvailable: true };
    }

    const slice = buffer.subarray(0, bytesRead);
    const lastNewline = slice.lastIndexOf(0x0a);
    if (lastNewline < 0) {
      if (this.cursor.offset + bytesRead >= stat.size && bytesRead < 65536) {
        const parsedSingle = parseSanitizedUsageLine(slice.toString('utf8'));
        if (parsedSingle) {
          this.records.push(parsedSingle);
          this.cursor.offset += bytesRead;
          this.cursor.linesRead += 1;
          this._pruneRecords(nowMs);
          this.cursor.lastReadAt = new Date(nowMs).toISOString();
          return { added: 1, sourceAvailable: true };
        }
      }
      this.cursor.lastReadAt = new Date(nowMs).toISOString();
      return { added: 0, sourceAvailable: true };
    }

    const completeChunk = slice.subarray(0, lastNewline).toString('utf8');
    this.cursor.offset += lastNewline + 1;
    const lines = completeChunk.split('\n');
    const startIdx = skipPartialFirstLine ? 1 : 0;
    let added = 0;
    const minKeepTs = nowMs - RETENTION_MS;

    for (let idx = startIdx; idx < lines.length; idx += 1) {
      const rawLine = lines[idx];
      if (!rawLine || !rawLine.trim()) continue;
      const parsed = parseSanitizedUsageLine(rawLine);
      if (!parsed) {
        this.cursor.parseErrors += 1;
        continue;
      }
      this.cursor.linesRead += 1;
      if (parsed.tsMs >= minKeepTs) {
        this.records.push(parsed);
        added += 1;
      }
    }

    this._pruneRecords(nowMs);
    this.cursor.lastReadAt = new Date(nowMs).toISOString();
    return { added, sourceAvailable: true };
  }

  _pruneRecords(nowMs) {
    const cutoff = nowMs - Math.max(RETENTION_MS, this.settings.windowMinutes * 60 * 1000);
    if (this.records.length > 0 && this.records[0].tsMs < cutoff) {
      this.records = this.records.filter((rec) => rec.tsMs >= cutoff);
    }
    if (this.records.length > MAX_IN_MEMORY_RECORDS) {
      this.records = this.records.slice(this.records.length - MAX_IN_MEMORY_RECORDS);
    }
  }

  _collectRemoteNodeBuckets() {
    if (!this.probeRegistry) return { buckets: [], anomalies: [], nodes: [] };
    const fleet = this.probeRegistry.buildFleetView({ snapshot: {} });
    const nodes = Array.isArray(fleet?.nodes) ? fleet.nodes : [];
    const remoteBuckets = [];
    const remoteAnomalies = [];
    const nodeSummaries = [];

    for (const node of nodes) {
      const isLocal = Boolean(node?.isLocal || node?.probeMode === 'local');
      const isOnline = node?.status === 'online' || node?.status === 'healthy' || node?.status === 'degraded';
      if (!node || isLocal || !isOnline || !node.cache) continue;
      const nodeId = cleanLabel(node.id, 'remote', 64);
      const cacheData = node.cache;
      nodeSummaries.push({
        nodeId,
        label: cleanLabel(node.label || node.name || node.id, nodeId, 80),
        requests: Number(cacheData.requests || 0),
        cacheHitPct: cacheData.cacheHitPct ?? null,
        avgTtftMs: Number(cacheData.avgTtftMs || 0),
        updatedAt: cacheData.collectedAt || node.lastSeenAt || null,
      });
      const buckets = Array.isArray(cacheData.buckets) ? cacheData.buckets : [];
      for (const b of buckets) {
        const requests = Math.max(0, Number(b.requests) || 0);
        const tokensIn = Math.max(0, Number(b.tokensIn) || 0);
        const tokensOut = Math.max(0, Number(b.tokensOut) || 0);
        const cacheRead = Math.max(0, Number(b.cacheRead) || 0);
        const cacheWrite = Math.max(0, Number(b.cacheWrite) || 0);
        const hitPct = b.cacheHitPct !== undefined && b.cacheHitPct !== null
          ? clampFloat(b.cacheHitPct, 0, 100, 0)
          : computeCacheHitPct(tokensIn, cacheRead, cacheWrite);
        const dropPct = clampFloat(b.dropPct, 0, 100, 0);
        const isLow = requests >= this.settings.minSamples && hitPct !== null && hitPct < this.settings.thresholdPct;
        const isDrop = requests >= this.settings.minSamples && dropPct >= this.settings.dropDeltaPct;
        const anomalyType = isLow || isDrop
          ? (isLow && isDrop ? 'sudden_drop_and_low' : (isDrop ? 'sudden_drop' : 'sustained_low'))
          : null;
        const anomalySeverity = anomalyType
          ? ((hitPct !== null && hitPct < Math.max(40, this.settings.thresholdPct - 25)) || dropPct >= this.settings.dropDeltaPct * 1.8 ? 'critical' : 'warn')
          : null;

        const entry = {
          key: `${nodeId}:${cleanLabel(b.agent, 'unknown', 64)}:${cleanLabel(b.model, 'unknown', 120)}`,
          nodeId,
          source: 'probe',
          agent: cleanLabel(b.agent, 'unknown', 64),
          model: cleanLabel(b.model, 'unknown', 120),
          requests,
          errorCount: Math.max(0, Number(b.errorCount) || 0),
          errorRatePct: requests > 0 ? round2((Math.max(0, Number(b.errorCount) || 0) / requests) * 100) : 0,
          tokensIn,
          tokensOut,
          cacheRead,
          cacheWrite,
          totalTokens: tokensIn + tokensOut + cacheRead + cacheWrite,
          cacheHitPct: hitPct,
          baselineHitPct: b.baselineHitPct ?? null,
          recentHitPct: b.recentHitPct ?? null,
          dropPct,
          avgTtftMs: Math.max(0, Math.round(Number(b.avgTtftMs) || 0)),
          p95LatencyMs: Math.max(0, Math.round(Number(b.p95LatencyMs) || 0)),
          systemDriftCount: Math.max(0, Number(b.systemDriftCount) || 0),
          systemDeltaBytes: Math.max(0, Number(b.systemDeltaBytes) || 0),
          toolsDriftCount: Math.max(0, Number(b.toolsDriftCount) || 0),
          toolsDeltaBytes: Math.max(0, Number(b.toolsDeltaBytes) || 0),
          routeSwitchCount: Math.max(0, Number(b.routeSwitchCount) || 0),
          epSwitchCount: Math.max(0, Number(b.epSwitchCount) || 0),
          longGapCount: Math.max(0, Number(b.longGapCount) || 0),
          avgSessionGapSec: Math.max(0, Number(b.avgSessionGapSec) || 0),
          uniqueServedModels: [],
          uniqueProviders: [],
          endpoints: [],
          anomalyType,
          anomalySeverity,
          lastSeenAt: cacheData.collectedAt || node.lastSeenAt || new Date(this.nowFn()).toISOString(),
        };
        remoteBuckets.push(entry);
        if (anomalyType) {
          remoteAnomalies.push({
            key: entry.key,
            nodeId: entry.nodeId,
            agent: entry.agent,
            model: entry.model,
            anomalyType,
            severity: anomalySeverity,
            cacheHitPct: entry.cacheHitPct,
            baselineHitPct: entry.baselineHitPct,
            recentHitPct: entry.recentHitPct,
            dropPct: entry.dropPct,
            thresholdPct: this.settings.thresholdPct,
            requests: entry.requests,
            driftSignals: {
              systemDriftCount: entry.systemDriftCount,
              systemDeltaBytes: entry.systemDeltaBytes,
              toolsDriftCount: entry.toolsDriftCount,
              toolsDeltaBytes: entry.toolsDeltaBytes,
              routeSwitchCount: entry.routeSwitchCount,
              epSwitchCount: entry.epSwitchCount,
              longGapCount: entry.longGapCount,
            },
            detectedAt: entry.lastSeenAt,
          });
        }
      }
    }

    return { buckets: remoteBuckets, anomalies: remoteAnomalies, nodes: nodeSummaries };
  }

  _buildHourlySeries(nowMs) {
    const currentHourMs = Math.floor(nowMs / (60 * 60 * 1000)) * 60 * 60 * 1000;
    const startHourMs = currentHourMs - 23 * 60 * 60 * 1000;
    const map = new Map();
    for (let idx = 0; idx < 24; idx += 1) {
      const ts = startHourMs + idx * 60 * 60 * 1000;
      map.set(ts, {
        ts,
        requests: 0,
        tokensIn: 0,
        tokensOut: 0,
        cacheRead: 0,
        cacheWrite: 0,
        ttftSum: 0,
        ttftCount: 0,
        latencies: [],
        errors: 0,
      });
    }
    for (const rec of this.records) {
      const hourTs = Math.floor(rec.tsMs / (60 * 60 * 1000)) * 60 * 60 * 1000;
      const slot = map.get(hourTs);
      if (!slot) continue;
      slot.requests += 1;
      slot.tokensIn += rec.inputTokens;
      slot.tokensOut += rec.outputTokens;
      slot.cacheRead += rec.cacheRead;
      slot.cacheWrite += rec.cacheWrite;
      if (rec.ttftMs > 0) {
        slot.ttftSum += rec.ttftMs;
        slot.ttftCount += 1;
      }
      if (rec.durationMs > 0) slot.latencies.push(rec.durationMs);
      if (rec.status >= 400) slot.errors += 1;
    }
    return Array.from(map.values()).map((slot) => {
      slot.latencies.sort((a, b) => a - b);
      const totalTokens = slot.tokensIn + slot.tokensOut + slot.cacheRead + slot.cacheWrite;
      return {
        ts: slot.ts,
        requests: slot.requests,
        tokensK: round2(totalTokens / 1000),
        avgTtftMs: slot.ttftCount > 0 ? Math.round(slot.ttftSum / slot.ttftCount) : 0,
        p95LatencyMs: percentile(slot.latencies, 0.95),
        cacheHitPct: computeCacheHitPct(slot.tokensIn, slot.cacheRead, slot.cacheWrite) ?? 0,
        errorRatePct: slot.requests > 0 ? round2((slot.errors / slot.requests) * 100) : 0,
      };
    });
  }

  async refresh({ runAdvisor = false, trigger = 'poll' } = {}) {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }
    const work = async () => {
      await this.ensureLoaded();
      if (this.settings.enabled) {
        await this.readUsageIncremental();
      }
      const nowMs = this.nowFn();
      const localNodeId = this.config.fleet?.localNode?.id || 'hub-local';
      const localAgg = aggregateSanitizedRecords(this.records, {
        nodeId: localNodeId,
        nowMs,
        windowMinutes: this.settings.windowMinutes,
        thresholdPct: this.settings.thresholdPct,
        dropDeltaPct: this.settings.dropDeltaPct,
        minSamples: this.settings.minSamples,
      });
      const remote = this._collectRemoteNodeBuckets();
      const buckets = [...localAgg.buckets, ...remote.buckets];
      const anomalies = [...localAgg.anomalies, ...remote.anomalies];

      const nextAnomalyKeys = new Set(anomalies.map((a) => `${a.key}:${a.severity}`));
      const newlyDetected = anomalies.filter((a) => !this.lastAnomalyKeys.has(`${a.key}:${a.severity}`));
      this.lastAnomalyKeys = nextAnomalyKeys;

      if (newlyDetected.length > 0) {
        this.eventBus?.emit?.('cache_anomaly', {
          count: anomalies.length,
          newlyDetected: newlyDetected.slice(0, 6),
          detectedAt: new Date(nowMs).toISOString(),
        });
      }

      if (runAdvisor && this.settings.enabled && this.advisor && anomalies.length > 0) {
        const intervalMs = this.settings.analysisIntervalMinutes * 60 * 1000;
        const periodicDue = intervalMs > 0 && (nowMs - this.lastPeriodicAnalysisMs) >= intervalMs;
        const targets = newlyDetected.length > 0
          ? newlyDetected.slice(0, 2)
          : (periodicDue ? anomalies.slice(0, 1) : []);
        if (targets.length > 0) {
          if (periodicDue) this.lastPeriodicAnalysisMs = nowMs;
          for (const target of targets) {
            const bucket = buckets.find((b) => b.key === target.key);
            if (!bucket) continue;
            const escalationFactor = target.dropPct >= this.settings.dropDeltaPct * 2 ? 2 : 1;
            await this.advisor.analyze({
              domainId: 'cache',
              key: target.key,
              payload: {
                thresholdPct: this.settings.thresholdPct,
                dropDeltaPct: this.settings.dropDeltaPct,
                windowMinutes: this.settings.windowMinutes,
                bucket,
              },
              trigger: newlyDetected.includes(target) ? 'anomaly' : trigger,
              severity: target.severity,
              escalationFactor,
            });
          }
        }
      }

      return { buckets, anomalies, remoteNodes: remote.nodes };
    };

    this._refreshPromise = work().finally(() => {
      this._refreshPromise = null;
    });
    return this._refreshPromise;
  }

  async getTelemetryOverlay(snapshot = null) {
    await this.ensureLoaded();
    if (this.settings.enabled) {
      await this.readUsageIncremental();
    }
    const nowMs = this.nowFn();
    const cutoff24h = nowMs - RETENTION_MS;
    const recent24h = this.records.filter((r) => r.tsMs >= cutoff24h);

    let totalIn = 0;
    let totalOut = 0;
    let totalCacheRead = 0;
    let totalCacheWrite = 0;
    let errorCount = 0;
    let ttftSum = 0;
    let ttftCount = 0;
    const latencies = [];
    const providerAgg = new Map();

    for (const rec of recent24h) {
      totalIn += rec.inputTokens;
      totalOut += rec.outputTokens;
      totalCacheRead += rec.cacheRead;
      totalCacheWrite += rec.cacheWrite;
      if (rec.status >= 400) errorCount += 1;
      if (rec.ttftMs > 0) {
        ttftSum += rec.ttftMs;
        ttftCount += 1;
      }
      if (rec.durationMs > 0) latencies.push(rec.durationMs);

      let p = providerAgg.get(rec.provider);
      if (!p) {
        p = {
          name: rec.provider,
          requests: 0,
          tokensIn: 0,
          tokensOut: 0,
          cacheRead: 0,
          cacheWrite: 0,
          ttftSum: 0,
          ttftCount: 0,
          errors: 0,
        };
        providerAgg.set(rec.provider, p);
      }
      p.requests += 1;
      p.tokensIn += rec.inputTokens;
      p.tokensOut += rec.outputTokens;
      p.cacheRead += rec.cacheRead;
      p.cacheWrite += rec.cacheWrite;
      if (rec.ttftMs > 0) {
        p.ttftSum += rec.ttftMs;
        p.ttftCount += 1;
      }
      if (rec.status >= 400) p.errors += 1;
    }

    latencies.sort((a, b) => a - b);
    const snapProviders = Array.isArray(snapshot?.magpie?.providers) ? snapshot.magpie.providers : [];
    for (const sp of snapProviders) {
      const name = cleanLabel(sp.name, 'unknown', 64);
      if (!providerAgg.has(name)) {
        providerAgg.set(name, {
          name,
          requests: 0,
          tokensIn: 0,
          tokensOut: 0,
          cacheRead: 0,
          cacheWrite: 0,
          ttftSum: 0,
          ttftCount: 0,
          errors: 0,
        });
      }
    }

    const providers = Array.from(providerAgg.values())
      .map((p) => {
        const totalTokens = p.tokensIn + p.tokensOut + p.cacheRead + p.cacheWrite;
        const errPct = p.requests > 0 ? round2((p.errors / p.requests) * 100) : 0;
        return {
          name: p.name,
          requests: p.requests,
          tokensK: round2(totalTokens / 1000),
          avgTtftMs: p.ttftCount > 0 ? Math.round(p.ttftSum / p.ttftCount) : (snapshot?.magpie?.latencyMs ?? 0),
          errorRatePct: errPct,
          cacheHitPct: computeCacheHitPct(p.tokensIn, p.cacheRead, p.cacheWrite),
          costUsd: 0,
          circuitState: errPct >= 30 && p.requests >= 5 ? 'open' : (errPct >= 10 && p.requests >= 5 ? 'half-open' : 'closed'),
        };
      })
      .sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name));

    const totalRequests = recent24h.length;
    const totalTokens = totalIn + totalOut + totalCacheRead + totalCacheWrite;
    const cacheHitPct = computeCacheHitPct(totalIn, totalCacheRead, totalCacheWrite) ?? 0;
    const hourly = this._buildHourlySeries(nowMs);

    return {
      ok: true,
      window: '24h',
      source: this.cursor.sourceAvailable ? 'usage-jsonl' : 'snapshot-only',
      summary: {
        totalRequests,
        totalTokens,
        avgTtftMs: ttftCount > 0 ? Math.round(ttftSum / ttftCount) : (snapshot?.magpie?.latencyMs ?? 0),
        p95LatencyMs: latencies.length > 0 ? percentile(latencies, 0.95) : (snapshot?.magpie?.latencyMs ?? 0),
        cacheHitPct,
        estimatedCostUsd24h: 0,
        dailyBudgetUsd: 10,
        errorRatePct: totalRequests > 0 ? round2((errorCount / totalRequests) * 100) : 0,
      },
      providers,
      sessions: [],
      accelerators: [],
      hourly,
    };
  }

  async getStatus() {
    const { buckets, anomalies, remoteNodes } = await this.refresh({ runAdvisor: false });
    const nowMs = this.nowFn();
    const totalIn = buckets.reduce((s, b) => s + b.tokensIn, 0);
    const totalCacheRead = buckets.reduce((s, b) => s + b.cacheRead, 0);
    const totalCacheWrite = buckets.reduce((s, b) => s + b.cacheWrite, 0);
    const totalRequests = buckets.reduce((s, b) => s + b.requests, 0);
    const advisorStatus = this.advisor ? await this.advisor.getStatus() : null;
    const recentDiagnoses = this.advisor ? await this.advisor.getDiagnoses({ domainId: 'cache', limit: 20 }) : [];

    return {
      ok: true,
      collectedAt: new Date(nowMs).toISOString(),
      config: this.getConfig(),
      source: {
        available: this.cursor.sourceAvailable,
        fileSizeBytes: this.cursor.fileSize,
        linesRead: this.cursor.linesRead,
        inMemoryRecords: this.records.length,
        parseErrors: this.cursor.parseErrors,
        lastReadAt: this.cursor.lastReadAt,
      },
      summary: {
        totalRequests,
        totalTokensIn: totalIn,
        totalCacheRead,
        totalCacheWrite,
        overallHitPct: computeCacheHitPct(totalIn, totalCacheRead, totalCacheWrite),
        bucketCount: buckets.length,
        anomalyCount: anomalies.length,
        criticalCount: anomalies.filter((a) => a.severity === 'critical').length,
        remoteNodeCount: remoteNodes.length,
      },
      buckets,
      anomalies,
      remoteNodes,
      hourly: this._buildHourlySeries(nowMs),
      advisor: advisorStatus,
      recentDiagnoses,
    };
  }

  async triggerManualAnalysis({ key = null, model = null, mode = null } = {}) {
    if (!this.advisor) {
      throw new Error('DecisionAdvisor is not configured');
    }
    const { buckets, anomalies } = await this.refresh({ runAdvisor: false });
    let targetBucket = null;
    if (key) {
      targetBucket = buckets.find((b) => b.key === key) || null;
      if (!targetBucket) {
        const err = new Error(`Cache bucket not found: ${key}`);
        err.statusCode = 404;
        throw err;
      }
    } else if (anomalies.length > 0) {
      targetBucket = buckets.find((b) => b.key === anomalies[0].key) || buckets[0] || null;
    } else {
      targetBucket = buckets[0] || null;
    }

    if (!targetBucket) {
      return {
        ok: true,
        skipped: true,
        skipReason: 'no_cache_samples',
        diagnosis: null,
      };
    }

    return this.advisor.analyze({
      domainId: 'cache',
      key: targetBucket.key,
      payload: {
        thresholdPct: this.settings.thresholdPct,
        dropDeltaPct: this.settings.dropDeltaPct,
        windowMinutes: this.settings.windowMinutes,
        bucket: targetBucket,
        allAnomaliesCount: anomalies.length,
      },
      trigger: 'manual',
      force: true,
      severity: targetBucket.anomalySeverity || 'info',
      modelOverride: model || null,
      modeOverride: mode || null,
    });
  }

  start() {
    if (this._timer || !this.settings.enabled) return;
    const intervalMs = Math.max(10_000, this.settings.pollIntervalSec * 1000);
    this._timer = setInterval(() => {
      this.refresh({ runAdvisor: true, trigger: 'periodic' }).catch((err) => {
        this.logger?.warn?.('cache_monitor_tick_failed', { error: err?.message || String(err) });
      });
    }, intervalMs);
    this._timer.unref?.();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
