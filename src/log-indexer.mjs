import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scrubSensitiveText } from './log-adapters.mjs';

export const DEFAULT_RETENTION_DAYS = 7;
export const DEFAULT_MAX_DISK_MB = 256;
export const SHARD_PREFIX = 'obs-';
export const SHARD_RE = /^obs-(\d{4}-\d{2}-\d{2})\.db$/;

const RANGE_SPECS = {
  '1h': { ms: 60 * 60 * 1000, defaultStep: 60 },
  '6h': { ms: 6 * 60 * 60 * 1000, defaultStep: 300 },
  '24h': { ms: 24 * 60 * 60 * 1000, defaultStep: 300 },
  '7d': { ms: 7 * 24 * 60 * 60 * 1000, defaultStep: 300 },
};

export function utcDayFromMs(tsMs) {
  return new Date(tsMs).toISOString().slice(0, 10);
}

function clampInt(raw, min, max, fallback) {
  const num = Math.round(Number(raw));
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function floorBucketSec(tsMs, stepSec) {
  const sec = Math.floor(tsMs / 1000);
  return Math.floor(sec / stepSec) * stepSec;
}

export class LogIndexer {
  constructor(options = {}) {
    this.dataDir = options.dataDir ? path.resolve(options.dataDir) : '';
    this.retentionDays = clampInt(options.retentionDays, 1, 90, DEFAULT_RETENTION_DAYS);
    this.maxDiskMb = clampInt(options.maxDiskMb, 1, 4096, DEFAULT_MAX_DISK_MB);
    this.logger = options.logger || null;
    this.nowFn = options.nowFn || (() => Date.now());
    this.driver = 'pending';

    this._DatabaseSync = null;
    this._shards = new Map();
    this._cursors = new Map();
    this._cursorsLoaded = false;
    this._cursorsDirty = false;
    this._knownFingerprints = new Set();
    this._memoryRollups = new Map();
    this._memoryFingerprints = new Map();
    this._memoryAnnotations = [];
    this._lastPruneAt = 0;
  }

  get cursorsFile() {
    return this.dataDir ? path.join(this.dataDir, 'obs-cursors.json') : '';
  }

  shardPathForDay(dayKey) {
    return path.join(this.dataDir, `${SHARD_PREFIX}${dayKey}.db`);
  }

  updateLimits({ retentionDays, maxDiskMb } = {}) {
    if (retentionDays !== undefined) {
      this.retentionDays = clampInt(retentionDays, 1, 90, this.retentionDays);
    }
    if (maxDiskMb !== undefined) {
      this.maxDiskMb = clampInt(maxDiskMb, 1, 4096, this.maxDiskMb);
    }
  }

  async init() {
    if (this.driver !== 'pending') return this.driver;
    if (this.dataDir) {
      await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
      await fs.chmod(this.dataDir, 0o700).catch(() => {});
    }
    try {
      const mod = await import('node:sqlite');
      if (mod?.DatabaseSync && this.dataDir) {
        this._DatabaseSync = mod.DatabaseSync;
        this.driver = 'sqlite-daily';
        await this._loadCursors();
        await this._preloadRecentFingerprints();
        return this.driver;
      }
    } catch (err) {
      this.logger?.warn?.('obs_indexer_sqlite_unavailable', { error: String(err?.message || err) });
    }
    this.driver = 'memory';
    await this._loadCursors();
    return this.driver;
  }

  async _loadCursors() {
    if (this._cursorsLoaded) return;
    this._cursorsLoaded = true;
    if (!this.cursorsFile) return;
    try {
      const raw = await fs.readFile(this.cursorsFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.cursors && typeof parsed.cursors === 'object') {
        for (const [k, v] of Object.entries(parsed.cursors)) {
          if (typeof v === 'string' && v.length <= 512) {
            this._cursors.set(k, v);
          }
        }
      }
    } catch {
      // missing or unreadable cursor file starts fresh
    }
  }

  async saveCursors() {
    if (!this.cursorsFile || !this._cursorsDirty) return;
    this._cursorsDirty = false;
    const obj = {
      updatedAt: new Date(this.nowFn()).toISOString(),
      cursors: Object.fromEntries(this._cursors.entries()),
    };
    const tmp = `${this.cursorsFile}.tmp.${process.pid}.${Date.now()}`;
    await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    await fs.writeFile(tmp, JSON.stringify(obj, null, 2), { mode: 0o600 });
    await fs.chmod(tmp, 0o600).catch(() => {});
    await fs.rename(tmp, this.cursorsFile);
  }

  getCursor(adapterId) {
    return this._cursors.get(String(adapterId)) || null;
  }

  setCursor(adapterId, cursor) {
    const id = String(adapterId || '');
    if (!id) return;
    if (cursor === null || cursor === undefined || cursor === '') {
      if (this._cursors.delete(id)) this._cursorsDirty = true;
      return;
    }
    const next = String(cursor).slice(0, 512);
    if (this._cursors.get(id) !== next) {
      this._cursors.set(id, next);
      this._cursorsDirty = true;
    }
  }

  async _openShard(dayKey, { create = true } = {}) {
    if (this.driver !== 'sqlite-daily' || !this._DatabaseSync) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
    const existing = this._shards.get(dayKey);
    if (existing) return existing;

    const dbPath = this.shardPathForDay(dayKey);
    if (!create) {
      try {
        await fs.access(dbPath);
      } catch {
        return null;
      }
    }

    const db = new this._DatabaseSync(dbPath);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = MEMORY;
      PRAGMA busy_timeout = 3000;

      CREATE TABLE IF NOT EXISTS obs_metrics_rollup (
        bucket_ts INTEGER NOT NULL,
        step_sec INTEGER NOT NULL,
        node_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        error_count INTEGER NOT NULL DEFAULT 0,
        warn_count INTEGER NOT NULL DEFAULT 0,
        new_fingerprint_count INTEGER NOT NULL DEFAULT 0,
        restart_count INTEGER NOT NULL DEFAULT 0,
        http_5xx_count INTEGER NOT NULL DEFAULT 0,
        total_scanned INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (bucket_ts, step_sec, node_id, service_id)
      ) WITHOUT ROWID;

      CREATE TABLE IF NOT EXISTS obs_fingerprints (
        fingerprint TEXT NOT NULL,
        node_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        source_id TEXT NOT NULL,
        level TEXT NOT NULL,
        template TEXT NOT NULL,
        sample_redacted TEXT NOT NULL,
        first_seen_ts INTEGER NOT NULL,
        last_seen_ts INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        source_ref_json TEXT NOT NULL,
        PRIMARY KEY (fingerprint, node_id, service_id)
      ) WITHOUT ROWID;

      CREATE TABLE IF NOT EXISTS obs_annotations (
        id TEXT PRIMARY KEY,
        ts INTEGER NOT NULL,
        domain_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        node_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        label TEXT NOT NULL,
        detail TEXT NOT NULL,
        summary TEXT NOT NULL,
        diagnosis_id TEXT,
        trigger TEXT NOT NULL,
        mode TEXT NOT NULL,
        source_ref_json TEXT,
        payload_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_obs_annotations_ts ON obs_annotations(ts DESC);
      CREATE INDEX IF NOT EXISTS idx_obs_fp_last_seen ON obs_fingerprints(last_seen_ts DESC);
    `);

    await fs.chmod(dbPath, 0o600).catch(() => {});
    const shard = {
      dayKey,
      dbPath,
      db,
      upsertRollup: db.prepare(`
        INSERT INTO obs_metrics_rollup (
          bucket_ts, step_sec, node_id, service_id,
          error_count, warn_count, new_fingerprint_count, restart_count, http_5xx_count, total_scanned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(bucket_ts, step_sec, node_id, service_id) DO UPDATE SET
          error_count = error_count + excluded.error_count,
          warn_count = warn_count + excluded.warn_count,
          new_fingerprint_count = new_fingerprint_count + excluded.new_fingerprint_count,
          restart_count = restart_count + excluded.restart_count,
          http_5xx_count = http_5xx_count + excluded.http_5xx_count,
          total_scanned = total_scanned + excluded.total_scanned
      `),
      upsertFp: db.prepare(`
        INSERT INTO obs_fingerprints (
          fingerprint, node_id, service_id, source_kind, source_id, level,
          template, sample_redacted, first_seen_ts, last_seen_ts, count, source_ref_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(fingerprint, node_id, service_id) DO UPDATE SET
          level = excluded.level,
          sample_redacted = excluded.sample_redacted,
          last_seen_ts = MAX(last_seen_ts, excluded.last_seen_ts),
          count = count + excluded.count,
          source_ref_json = excluded.source_ref_json
      `),
      insertAnnotation: db.prepare(`
        INSERT OR REPLACE INTO obs_annotations (
          id, ts, domain_id, severity, node_id, service_id,
          label, detail, summary, diagnosis_id, trigger, mode, source_ref_json, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
    };
    this._shards.set(dayKey, shard);
    return shard;
  }

  async _listShardDayKeys() {
    if (!this.dataDir) return [];
    try {
      const files = await fs.readdir(this.dataDir);
      return files
        .map((name) => {
          const m = name.match(SHARD_RE);
          return m ? m[1] : null;
        })
        .filter(Boolean)
        .sort();
    } catch {
      return [];
    }
  }

  async _preloadRecentFingerprints() {
    const days = await this._listShardDayKeys();
    const recent = days.slice(-2);
    for (const dayKey of recent) {
      const shard = await this._openShard(dayKey, { create: false });
      if (!shard) continue;
      try {
        const rows = shard.db.prepare('SELECT fingerprint, node_id, service_id FROM obs_fingerprints LIMIT 5000').all();
        for (const row of rows) {
          this._knownFingerprints.add(`${row.node_id}|${row.service_id}|${row.fingerprint}`);
        }
      } catch {
        // ignore
      }
    }
  }

  async ingestEntries(entries = []) {
    await this.init();
    if (!Array.isArray(entries) || entries.length === 0) {
      return { scanned: 0, errors: 0, warns: 0, newFingerprints: [], restarts: 0, http5xx: 0 };
    }

    const rollupDelta = new Map();
    const fpDelta = new Map();
    const newFingerprints = [];
    let totalErrors = 0;
    let totalWarns = 0;
    let totalRestarts = 0;
    let totalHttp5xx = 0;

    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const tsMs = Number.isFinite(entry.tsMs) ? entry.tsMs : (Date.parse(String(entry.ts || '')) || this.nowFn());
      const dayKey = utcDayFromMs(tsMs);
      const nodeId = String(entry.nodeId || 'local').slice(0, 80);
      const serviceId = String(entry.serviceId || entry.unit || 'unknown').slice(0, 120);
      const level = String(entry.level || 'info').toLowerCase();
      const isErr = level === 'err' || level === 'crit' || level === 'alert' || level === 'emerg' || Number(entry.priority) <= 3;
      const isWarn = !isErr && (level === 'warn' || Number(entry.priority) === 4);
      const isRestart = Boolean(entry.isRestart);
      const isHttp5xx = Boolean(entry.isHttp5xx);
      const fp = String(entry.fingerprint || '').trim();
      const fpKey = fp ? `${nodeId}|${serviceId}|${fp}` : '';

      let isNewFp = false;
      if ((isErr || isWarn || isRestart || isHttp5xx) && fpKey) {
        if (!this._knownFingerprints.has(fpKey)) {
          this._knownFingerprints.add(fpKey);
          isNewFp = true;
          if (isErr || isRestart || isHttp5xx) {
            newFingerprints.push({
              fingerprint: fp,
              nodeId,
              serviceId,
              level,
              template: String(entry.template || '').slice(0, 220),
              sampleRedacted: scrubSensitiveText(String(entry.message || '')).slice(0, 280),
              ts: new Date(tsMs).toISOString(),
              sourceRef: entry.sourceRef || null,
            });
          }
        }

        const dayFpKey = `${dayKey}|${fpKey}`;
        const existingFp = fpDelta.get(dayFpKey);
        const sampleRedacted = scrubSensitiveText(String(entry.message || '')).slice(0, 280);
        if (existingFp) {
          existingFp.count += 1;
          existingFp.lastSeenTs = Math.max(existingFp.lastSeenTs, tsMs);
          existingFp.sampleRedacted = sampleRedacted;
          if (entry.sourceRef) existingFp.sourceRef = entry.sourceRef;
        } else {
          fpDelta.set(dayFpKey, {
            dayKey,
            fingerprint: fp,
            nodeId,
            serviceId,
            sourceKind: String(entry.sourceRef?.sourceKind || entry.source || 'file'),
            sourceId: String(entry.sourceRef?.sourceId || entry.target || serviceId),
            level,
            template: String(entry.template || sampleRedacted).slice(0, 220),
            sampleRedacted,
            firstSeenTs: tsMs,
            lastSeenTs: tsMs,
            count: 1,
            sourceRef: entry.sourceRef || {
              sourceKind: String(entry.source || 'file'),
              sourceId: String(entry.target || serviceId),
              nodeId,
              ts: new Date(tsMs).toISOString(),
              cursor: entry.cursor || null,
            },
          });
        }
      }

      if (isErr) totalErrors += 1;
      if (isWarn) totalWarns += 1;
      if (isRestart) totalRestarts += 1;
      if (isHttp5xx) totalHttp5xx += 1;

      for (const stepSec of [60, 300]) {
        const bucketTs = floorBucketSec(tsMs, stepSec);
        const rKey = `${dayKey}|${bucketTs}|${stepSec}|${nodeId}|${serviceId}`;
        const acc = rollupDelta.get(rKey) || {
          dayKey,
          bucketTs,
          stepSec,
          nodeId,
          serviceId,
          errorCount: 0,
          warnCount: 0,
          newFingerprintCount: 0,
          restartCount: 0,
          http5xxCount: 0,
          totalScanned: 0,
        };
        acc.totalScanned += 1;
        if (isErr) acc.errorCount += 1;
        if (isWarn) acc.warnCount += 1;
        if (isNewFp && isErr) acc.newFingerprintCount += 1;
        if (isRestart) acc.restartCount += 1;
        if (isHttp5xx) acc.http5xxCount += 1;
        rollupDelta.set(rKey, acc);
      }
    }

    await this._flushRollupAndFingerprints(rollupDelta, fpDelta);
    if (this.nowFn() - this._lastPruneAt > 10 * 60 * 1000) {
      await this.pruneShards().catch(() => {});
    }

    return {
      scanned: entries.length,
      errors: totalErrors,
      warns: totalWarns,
      newFingerprints,
      restarts: totalRestarts,
      http5xx: totalHttp5xx,
    };
  }

  async ingestRemoteTelemetry(nodeId, probeLogs) {
    await this.init();
    if (!probeLogs || typeof probeLogs !== 'object') {
      return { scanned: 0, newFingerprints: [] };
    }
    const cleanNodeId = String(nodeId || 'remote').slice(0, 80);
    const tsMs = Date.parse(String(probeLogs.collectedAt || '')) || this.nowFn();
    const dayKey = utcDayFromMs(tsMs);
    const rollupDelta = new Map();
    const fpDelta = new Map();
    const newFingerprints = [];
    let scanned = 0;

    const services = Array.isArray(probeLogs.services) ? probeLogs.services : [];
    for (const svc of services) {
      if (!svc || typeof svc !== 'object') continue;
      const serviceId = String(svc.serviceId || svc.unit || 'remote').slice(0, 120);
      const errCount = Math.max(0, Math.round(Number(svc.errorCount) || 0));
      const warnCount = Math.max(0, Math.round(Number(svc.warnCount) || 0));
      const newFpCount = Math.max(0, Math.round(Number(svc.newFingerprintCount) || 0));
      const restartCount = Math.max(0, Math.round(Number(svc.restartCount) || 0));
      const http5xxCount = Math.max(0, Math.round(Number(svc.http5xxCount) || 0));
      const total = Math.max(errCount + warnCount, Math.round(Number(svc.totalScanned) || 0));
      scanned += total;

      for (const stepSec of [60, 300]) {
        const bucketTs = floorBucketSec(tsMs, stepSec);
        const rKey = `${dayKey}|${bucketTs}|${stepSec}|${cleanNodeId}|${serviceId}`;
        const acc = rollupDelta.get(rKey) || {
          dayKey,
          bucketTs,
          stepSec,
          nodeId: cleanNodeId,
          serviceId,
          errorCount: 0,
          warnCount: 0,
          newFingerprintCount: 0,
          restartCount: 0,
          http5xxCount: 0,
          totalScanned: 0,
        };
        acc.errorCount += errCount;
        acc.warnCount += warnCount;
        acc.newFingerprintCount += newFpCount;
        acc.restartCount += restartCount;
        acc.http5xxCount += http5xxCount;
        acc.totalScanned += total;
        rollupDelta.set(rKey, acc);
      }
    }

    const fingerprints = Array.isArray(probeLogs.fingerprints) ? probeLogs.fingerprints : [];
    for (const fp of fingerprints) {
      if (!fp || typeof fp !== 'object' || !fp.fingerprint) continue;
      const serviceId = String(fp.serviceId || 'remote').slice(0, 120);
      const fpId = String(fp.fingerprint).slice(0, 64);
      const fpKey = `${cleanNodeId}|${serviceId}|${fpId}`;
      const isNew = !this._knownFingerprints.has(fpKey);
      if (isNew) {
        this._knownFingerprints.add(fpKey);
        if (fp.level === 'err' || fp.level === 'crit') {
          newFingerprints.push({
            fingerprint: fpId,
            nodeId: cleanNodeId,
            serviceId,
            level: fp.level,
            template: scrubSensitiveText(String(fp.template || '')).slice(0, 220),
            sampleRedacted: scrubSensitiveText(String(fp.sampleRedacted || fp.template || '')).slice(0, 280),
            ts: new Date(tsMs).toISOString(),
            sourceRef: {
              sourceKind: 'remote',
              sourceId: `${cleanNodeId}:${fp.sourceId || serviceId}`,
              nodeId: cleanNodeId,
              ts: new Date(tsMs).toISOString(),
              cursor: null,
            },
          });
        }
      }
      const dayFpKey = `${dayKey}|${fpKey}`;
      fpDelta.set(dayFpKey, {
        dayKey,
        fingerprint: fpId,
        nodeId: cleanNodeId,
        serviceId,
        sourceKind: 'remote',
        sourceId: `${cleanNodeId}:${fp.sourceId || serviceId}`,
        level: String(fp.level || 'err'),
        template: scrubSensitiveText(String(fp.template || '')).slice(0, 220),
        sampleRedacted: scrubSensitiveText(String(fp.sampleRedacted || fp.template || '')).slice(0, 280),
        firstSeenTs: tsMs,
        lastSeenTs: tsMs,
        count: Math.max(1, Math.round(Number(fp.count) || 1)),
        sourceRef: {
          sourceKind: 'remote',
          sourceId: `${cleanNodeId}:${fp.sourceId || serviceId}`,
          nodeId: cleanNodeId,
          ts: new Date(tsMs).toISOString(),
          cursor: null,
        },
      });
    }

    await this._flushRollupAndFingerprints(rollupDelta, fpDelta);
    return { scanned, newFingerprints };
  }

  async _flushRollupAndFingerprints(rollupDelta, fpDelta) {
    if (this.driver === 'sqlite-daily') {
      const byDay = new Map();
      for (const r of rollupDelta.values()) {
        const group = byDay.get(r.dayKey) || { rollups: [], fps: [] };
        group.rollups.push(r);
        byDay.set(r.dayKey, group);
      }
      for (const fp of fpDelta.values()) {
        const group = byDay.get(fp.dayKey) || { rollups: [], fps: [] };
        group.fps.push(fp);
        byDay.set(fp.dayKey, group);
      }
      for (const [dayKey, group] of byDay.entries()) {
        const shard = await this._openShard(dayKey, { create: true });
        if (!shard) continue;
        shard.db.exec('BEGIN');
        try {
          for (const r of group.rollups) {
            shard.upsertRollup.run(
              r.bucketTs, r.stepSec, r.nodeId, r.serviceId,
              r.errorCount, r.warnCount, r.newFingerprintCount, r.restartCount, r.http5xxCount, r.totalScanned,
            );
          }
          for (const fp of group.fps) {
            shard.upsertFp.run(
              fp.fingerprint, fp.nodeId, fp.serviceId, fp.sourceKind, fp.sourceId, fp.level,
              fp.template, fp.sampleRedacted, fp.firstSeenTs, fp.lastSeenTs, fp.count,
              JSON.stringify(fp.sourceRef || {}),
            );
          }
          shard.db.exec('COMMIT');
        } catch (err) {
          shard.db.exec('ROLLBACK');
          throw err;
        }
      }
      return;
    }

    for (const [k, r] of rollupDelta.entries()) {
      const existing = this._memoryRollups.get(k);
      if (existing) {
        existing.errorCount += r.errorCount;
        existing.warnCount += r.warnCount;
        existing.newFingerprintCount += r.newFingerprintCount;
        existing.restartCount += r.restartCount;
        existing.http5xxCount += r.http5xxCount;
        existing.totalScanned += r.totalScanned;
      } else {
        this._memoryRollups.set(k, { ...r });
      }
    }
    for (const [k, fp] of fpDelta.entries()) {
      const existing = this._memoryFingerprints.get(k);
      if (existing) {
        existing.count += fp.count;
        existing.lastSeenTs = Math.max(existing.lastSeenTs, fp.lastSeenTs);
        existing.sampleRedacted = fp.sampleRedacted;
        existing.sourceRef = fp.sourceRef;
      } else {
        this._memoryFingerprints.set(k, { ...fp });
      }
    }
  }

  async recordAnnotation(annotation = {}) {
    await this.init();
    const tsMs = Number.isFinite(annotation.tsMs) ? annotation.tsMs : (Date.parse(String(annotation.ts || '')) || this.nowFn());
    const id = String(annotation.id || `ann-${tsMs}-${crypto.randomBytes(3).toString('hex')}`);
    const dayKey = utcDayFromMs(tsMs);
    const record = {
      id,
      ts: tsMs,
      isoTs: new Date(tsMs).toISOString(),
      domainId: String(annotation.domainId || 'logs').slice(0, 32),
      severity: String(annotation.severity || 'info').slice(0, 16),
      nodeId: String(annotation.nodeId || 'all').slice(0, 80),
      serviceId: String(annotation.serviceId || 'all').slice(0, 120),
      label: scrubSensitiveText(String(annotation.label || 'Observability Event')).slice(0, 120),
      detail: scrubSensitiveText(String(annotation.detail || '')).slice(0, 400),
      summary: scrubSensitiveText(String(annotation.summary || '')).slice(0, 600),
      diagnosisId: annotation.diagnosisId ? String(annotation.diagnosisId).slice(0, 80) : null,
      trigger: String(annotation.trigger || 'event').slice(0, 32),
      mode: String(annotation.mode || 'deterministic').slice(0, 32),
      sourceRef: annotation.sourceRef || null,
      payload: annotation.payload || null,
    };

    if (this.driver === 'sqlite-daily') {
      const shard = await this._openShard(dayKey, { create: true });
      if (shard) {
        shard.insertAnnotation.run(
          record.id,
          record.ts,
          record.domainId,
          record.severity,
          record.nodeId,
          record.serviceId,
          record.label,
          record.detail,
          record.summary,
          record.diagnosisId,
          record.trigger,
          record.mode,
          record.sourceRef ? JSON.stringify(record.sourceRef) : null,
          record.payload ? JSON.stringify(record.payload) : null,
        );
      }
    } else {
      this._memoryAnnotations.unshift(record);
      if (this._memoryAnnotations.length > 500) this._memoryAnnotations.length = 500;
    }
    return record;
  }

  _dayKeysForRange(startMs, endMs) {
    const keys = [];
    const cur = new Date(Date.UTC(
      new Date(startMs).getUTCFullYear(),
      new Date(startMs).getUTCMonth(),
      new Date(startMs).getUTCDate(),
    ));
    const endDay = utcDayFromMs(endMs);
    for (let guard = 0; guard < 100; guard += 1) {
      const key = cur.toISOString().slice(0, 10);
      keys.push(key);
      if (key >= endDay) break;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return keys;
  }

  async queryMetricsSeries({ range = '6h', step = null, nodeId = '', serviceId = '' } = {}) {
    await this.init();
    const spec = RANGE_SPECS[range] || RANGE_SPECS['6h'];
    const stepSec = step === 60 || step === 300 ? step : spec.defaultStep;
    const endMs = this.nowFn();
    const startMs = endMs - spec.ms;
    const startBucket = floorBucketSec(startMs, stepSec);
    const endBucket = floorBucketSec(endMs, stepSec);
    const aggregated = new Map();

    if (this.driver === 'sqlite-daily') {
      const dayKeys = this._dayKeysForRange(startMs, endMs);
      for (const dayKey of dayKeys) {
        const shard = await this._openShard(dayKey, { create: false });
        if (!shard) continue;
        const clauses = ['step_sec = ?', 'bucket_ts >= ?', 'bucket_ts <= ?'];
        const params = [stepSec, startBucket, endBucket];
        if (nodeId && nodeId !== 'all') {
          clauses.push('node_id = ?');
          params.push(nodeId);
        }
        if (serviceId && serviceId !== 'all') {
          clauses.push('service_id = ?');
          params.push(serviceId);
        }
        const rows = shard.db.prepare(`
          SELECT bucket_ts,
            SUM(error_count) AS error_count,
            SUM(warn_count) AS warn_count,
            SUM(new_fingerprint_count) AS new_fingerprint_count,
            SUM(restart_count) AS restart_count,
            SUM(http_5xx_count) AS http_5xx_count,
            SUM(total_scanned) AS total_scanned
          FROM obs_metrics_rollup
          WHERE ${clauses.join(' AND ')}
          GROUP BY bucket_ts
          ORDER BY bucket_ts ASC
        `).all(...params);
        for (const row of rows) {
          const existing = aggregated.get(row.bucket_ts) || {
            ts: row.bucket_ts * 1000,
            isoTs: new Date(row.bucket_ts * 1000).toISOString(),
            errorCount: 0,
            warnCount: 0,
            newFingerprintCount: 0,
            restartCount: 0,
            http5xxCount: 0,
            totalScanned: 0,
          };
          existing.errorCount += Number(row.error_count || 0);
          existing.warnCount += Number(row.warn_count || 0);
          existing.newFingerprintCount += Number(row.new_fingerprint_count || 0);
          existing.restartCount += Number(row.restart_count || 0);
          existing.http5xxCount += Number(row.http_5xx_count || 0);
          existing.totalScanned += Number(row.total_scanned || 0);
          aggregated.set(row.bucket_ts, existing);
        }
      }
    } else {
      for (const r of this._memoryRollups.values()) {
        if (r.stepSec !== stepSec || r.bucketTs < startBucket || r.bucketTs > endBucket) continue;
        if (nodeId && nodeId !== 'all' && r.nodeId !== nodeId) continue;
        if (serviceId && serviceId !== 'all' && r.serviceId !== serviceId) continue;
        const existing = aggregated.get(r.bucketTs) || {
          ts: r.bucketTs * 1000,
          isoTs: new Date(r.bucketTs * 1000).toISOString(),
          errorCount: 0,
          warnCount: 0,
          newFingerprintCount: 0,
          restartCount: 0,
          http5xxCount: 0,
          totalScanned: 0,
        };
        existing.errorCount += r.errorCount;
        existing.warnCount += r.warnCount;
        existing.newFingerprintCount += r.newFingerprintCount;
        existing.restartCount += r.restartCount;
        existing.http5xxCount += r.http5xxCount;
        existing.totalScanned += r.totalScanned;
        aggregated.set(r.bucketTs, existing);
      }
    }

    const points = Array.from(aggregated.values()).sort((a, b) => a.ts - b.ts);
    const annotations = await this.queryAnnotations({ range, nodeId, serviceId, limit: 60 });

    const totals = points.reduce(
      (acc, p) => {
        acc.errorCount += p.errorCount;
        acc.warnCount += p.warnCount;
        acc.newFingerprintCount += p.newFingerprintCount;
        acc.restartCount += p.restartCount;
        acc.http5xxCount += p.http5xxCount;
        acc.totalScanned += p.totalScanned;
        return acc;
      },
      { errorCount: 0, warnCount: 0, newFingerprintCount: 0, restartCount: 0, http5xxCount: 0, totalScanned: 0 },
    );

    return {
      range,
      stepSec,
      startMs,
      endMs,
      deterministic: true,
      points,
      totals,
      annotations,
    };
  }

  async queryFingerprints({ range = '24h', nodeId = '', serviceId = '', level = '', limit = 50 } = {}) {
    await this.init();
    const spec = RANGE_SPECS[range] || RANGE_SPECS['24h'];
    const endMs = this.nowFn();
    const startMs = endMs - spec.ms;
    const maxItems = Math.max(1, Math.min(200, Number(limit) || 50));
    const merged = new Map();

    if (this.driver === 'sqlite-daily') {
      const dayKeys = this._dayKeysForRange(startMs, endMs);
      for (const dayKey of dayKeys) {
        const shard = await this._openShard(dayKey, { create: false });
        if (!shard) continue;
        const clauses = ['last_seen_ts >= ?'];
        const params = [startMs];
        if (nodeId && nodeId !== 'all') {
          clauses.push('node_id = ?');
          params.push(nodeId);
        }
        if (serviceId && serviceId !== 'all') {
          clauses.push('service_id = ?');
          params.push(serviceId);
        }
        if (level && level !== 'all') {
          clauses.push('level = ?');
          params.push(level);
        }
        const rows = shard.db.prepare(`
          SELECT * FROM obs_fingerprints
          WHERE ${clauses.join(' AND ')}
          ORDER BY last_seen_ts DESC
          LIMIT 250
        `).all(...params);
        for (const row of rows) {
          const k = `${row.node_id}|${row.service_id}|${row.fingerprint}`;
          let sourceRef = null;
          try {
            sourceRef = JSON.parse(row.source_ref_json || 'null');
          } catch {
            sourceRef = null;
          }
          const prev = merged.get(k);
          if (prev) {
            prev.count += Number(row.count || 0);
            prev.firstSeenTs = Math.min(prev.firstSeenTs, Number(row.first_seen_ts));
            if (Number(row.last_seen_ts) >= prev.lastSeenTs) {
              prev.lastSeenTs = Number(row.last_seen_ts);
              prev.sampleRedacted = row.sample_redacted;
              prev.sourceRef = sourceRef;
            }
          } else {
            merged.set(k, {
              fingerprint: row.fingerprint,
              nodeId: row.node_id,
              serviceId: row.service_id,
              sourceKind: row.source_kind,
              sourceId: row.source_id,
              level: row.level,
              template: row.template,
              sampleRedacted: row.sample_redacted,
              firstSeenTs: Number(row.first_seen_ts),
              lastSeenTs: Number(row.last_seen_ts),
              firstSeenAt: new Date(Number(row.first_seen_ts)).toISOString(),
              lastSeenAt: new Date(Number(row.last_seen_ts)).toISOString(),
              count: Number(row.count || 0),
              sourceRef,
            });
          }
        }
      }
    } else {
      for (const fp of this._memoryFingerprints.values()) {
        if (fp.lastSeenTs < startMs) continue;
        if (nodeId && nodeId !== 'all' && fp.nodeId !== nodeId) continue;
        if (serviceId && serviceId !== 'all' && fp.serviceId !== serviceId) continue;
        if (level && level !== 'all' && fp.level !== level) continue;
        const k = `${fp.nodeId}|${fp.serviceId}|${fp.fingerprint}`;
        const prev = merged.get(k);
        if (prev) {
          prev.count += fp.count;
          prev.firstSeenTs = Math.min(prev.firstSeenTs, fp.firstSeenTs);
          prev.lastSeenTs = Math.max(prev.lastSeenTs, fp.lastSeenTs);
        } else {
          merged.set(k, {
            ...fp,
            firstSeenAt: new Date(fp.firstSeenTs).toISOString(),
            lastSeenAt: new Date(fp.lastSeenTs).toISOString(),
          });
        }
      }
    }

    return Array.from(merged.values())
      .map((item) => ({
        ...item,
        firstSeenAt: new Date(item.firstSeenTs).toISOString(),
        lastSeenAt: new Date(item.lastSeenTs).toISOString(),
      }))
      .sort((a, b) => (b.count - a.count) || (b.lastSeenTs - a.lastSeenTs))
      .slice(0, maxItems);
  }

  async queryAnnotations({ range = '24h', nodeId = '', serviceId = '', limit = 50 } = {}) {
    await this.init();
    const spec = RANGE_SPECS[range] || RANGE_SPECS['24h'];
    const endMs = this.nowFn();
    const startMs = endMs - spec.ms;
    const maxItems = Math.max(1, Math.min(200, Number(limit) || 50));
    const results = [];

    if (this.driver === 'sqlite-daily') {
      const dayKeys = this._dayKeysForRange(startMs, endMs).reverse();
      for (const dayKey of dayKeys) {
        if (results.length >= maxItems) break;
        const shard = await this._openShard(dayKey, { create: false });
        if (!shard) continue;
        const clauses = ['ts >= ?'];
        const params = [startMs];
        if (nodeId && nodeId !== 'all') {
          clauses.push('(node_id = ? OR node_id = ?)');
          params.push(nodeId, 'all');
        }
        if (serviceId && serviceId !== 'all') {
          clauses.push('(service_id = ? OR service_id = ?)');
          params.push(serviceId, 'all');
        }
        const rows = shard.db.prepare(`
          SELECT * FROM obs_annotations
          WHERE ${clauses.join(' AND ')}
          ORDER BY ts DESC
          LIMIT ?
        `).all(...params, maxItems - results.length);
        for (const row of rows) {
          let sourceRef = null;
          let payload = null;
          try { sourceRef = row.source_ref_json ? JSON.parse(row.source_ref_json) : null; } catch { sourceRef = null; }
          try { payload = row.payload_json ? JSON.parse(row.payload_json) : null; } catch { payload = null; }
          results.push({
            id: row.id,
            ts: Number(row.ts),
            isoTs: new Date(Number(row.ts)).toISOString(),
            domainId: row.domain_id,
            severity: row.severity,
            nodeId: row.node_id,
            serviceId: row.service_id,
            label: row.label,
            detail: row.detail,
            summary: row.summary,
            diagnosisId: row.diagnosis_id || null,
            trigger: row.trigger,
            mode: row.mode,
            sourceRef,
            payload,
          });
        }
      }
    } else {
      for (const item of this._memoryAnnotations) {
        if (item.ts < startMs) continue;
        if (nodeId && nodeId !== 'all' && item.nodeId !== nodeId && item.nodeId !== 'all') continue;
        if (serviceId && serviceId !== 'all' && item.serviceId !== serviceId && item.serviceId !== 'all') continue;
        results.push(item);
        if (results.length >= maxItems) break;
      }
    }

    return results.sort((a, b) => b.ts - a.ts).slice(0, maxItems);
  }

  async getServiceRollupSummary(windowMinutes = 60) {
    await this.init();
    const endMs = this.nowFn();
    const startMs = endMs - Math.max(5, Math.min(1440, Number(windowMinutes) || 60)) * 60 * 1000;
    const startBucket = floorBucketSec(startMs, 60);
    const byService = new Map();

    if (this.driver === 'sqlite-daily') {
      const dayKeys = this._dayKeysForRange(startMs, endMs);
      for (const dayKey of dayKeys) {
        const shard = await this._openShard(dayKey, { create: false });
        if (!shard) continue;
        const rows = shard.db.prepare(`
          SELECT node_id, service_id,
            SUM(error_count) AS error_count,
            SUM(warn_count) AS warn_count,
            SUM(new_fingerprint_count) AS new_fingerprint_count,
            SUM(restart_count) AS restart_count,
            SUM(http_5xx_count) AS http_5xx_count,
            SUM(total_scanned) AS total_scanned
          FROM obs_metrics_rollup
          WHERE step_sec = 60 AND bucket_ts >= ?
          GROUP BY node_id, service_id
        `).all(startBucket);
        for (const row of rows) {
          const key = `${row.node_id}|${row.service_id}`;
          const prev = byService.get(key) || {
            nodeId: row.node_id,
            serviceId: row.service_id,
            errorCount: 0,
            warnCount: 0,
            newFingerprintCount: 0,
            restartCount: 0,
            http5xxCount: 0,
            totalScanned: 0,
          };
          prev.errorCount += Number(row.error_count || 0);
          prev.warnCount += Number(row.warn_count || 0);
          prev.newFingerprintCount += Number(row.new_fingerprint_count || 0);
          prev.restartCount += Number(row.restart_count || 0);
          prev.http5xxCount += Number(row.http_5xx_count || 0);
          prev.totalScanned += Number(row.total_scanned || 0);
          byService.set(key, prev);
        }
      }
    } else {
      for (const r of this._memoryRollups.values()) {
        if (r.stepSec !== 60 || r.bucketTs < startBucket) continue;
        const key = `${r.nodeId}|${r.serviceId}`;
        const prev = byService.get(key) || {
          nodeId: r.nodeId,
          serviceId: r.serviceId,
          errorCount: 0,
          warnCount: 0,
          newFingerprintCount: 0,
          restartCount: 0,
          http5xxCount: 0,
          totalScanned: 0,
        };
        prev.errorCount += r.errorCount;
        prev.warnCount += r.warnCount;
        prev.newFingerprintCount += r.newFingerprintCount;
        prev.restartCount += r.restartCount;
        prev.http5xxCount += r.http5xxCount;
        prev.totalScanned += r.totalScanned;
        byService.set(key, prev);
      }
    }

    return Array.from(byService.values()).sort(
      (a, b) => (b.errorCount - a.errorCount) || (b.warnCount - a.warnCount) || a.serviceId.localeCompare(b.serviceId),
    );
  }

  async _shardSizeBytes(dayKey) {
    const base = this.shardPathForDay(dayKey);
    let total = 0;
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        const st = await fs.stat(`${base}${suffix}`);
        total += st.size;
      } catch {
        // ignore missing sidecar
      }
    }
    return total;
  }

  async _unlinkShard(dayKey) {
    const existing = this._shards.get(dayKey);
    if (existing) {
      try {
        existing.db.close();
      } catch {
        // ignore
      }
      this._shards.delete(dayKey);
    }
    const base = this.shardPathForDay(dayKey);
    for (const suffix of ['', '-wal', '-shm']) {
      await fs.unlink(`${base}${suffix}`).catch(() => {});
    }
  }

  async pruneShards({ nowMs = this.nowFn(), maxDiskBytesOverride = null } = {}) {
    await this.init();
    this._lastPruneAt = nowMs;
    if (this.driver !== 'sqlite-daily' || !this.dataDir) {
      return { removedShards: [], totalBytes: 0, shardCount: 0 };
    }

    const dayKeys = await this._listShardDayKeys();
    const cutoffMs = nowMs - (this.retentionDays - 1) * 24 * 60 * 60 * 1000;
    const cutoffDay = utcDayFromMs(cutoffMs);
    const removedShards = [];
    const remaining = [];

    for (const dayKey of dayKeys) {
      if (dayKey < cutoffDay) {
        await this._unlinkShard(dayKey);
        removedShards.push({ dayKey, reason: 'retention_days' });
      } else {
        const bytes = await this._shardSizeBytes(dayKey);
        remaining.push({ dayKey, bytes });
      }
    }

    const maxBytes = Number.isFinite(maxDiskBytesOverride) && maxDiskBytesOverride > 0
      ? maxDiskBytesOverride
      : this.maxDiskMb * 1024 * 1024;

    let totalBytes = remaining.reduce((sum, item) => sum + item.bytes, 0);
    while (totalBytes > maxBytes && remaining.length > 1) {
      const oldest = remaining.shift();
      await this._unlinkShard(oldest.dayKey);
      totalBytes -= oldest.bytes;
      removedShards.push({ dayKey: oldest.dayKey, reason: 'disk_cap' });
    }

    return {
      removedShards,
      totalBytes: Math.max(0, totalBytes),
      shardCount: remaining.length,
    };
  }

  async getStorageStats() {
    await this.init();
    if (this.driver !== 'sqlite-daily' || !this.dataDir) {
      return {
        driver: this.driver,
        retentionDays: this.retentionDays,
        maxDiskMb: this.maxDiskMb,
        maxDiskBytes: this.maxDiskMb * 1024 * 1024,
        totalBytes: 0,
        usedPct: 0,
        shardCount: 0,
        shards: [],
      };
    }

    const dayKeys = await this._listShardDayKeys();
    const shards = [];
    let totalBytes = 0;
    for (const dayKey of dayKeys) {
      const bytes = await this._shardSizeBytes(dayKey);
      totalBytes += bytes;
      shards.push({
        dayKey,
        file: `${SHARD_PREFIX}${dayKey}.db`,
        bytes,
      });
    }
    const maxBytes = this.maxDiskMb * 1024 * 1024;
    return {
      driver: this.driver,
      retentionDays: this.retentionDays,
      maxDiskMb: this.maxDiskMb,
      maxDiskBytes: maxBytes,
      totalBytes,
      usedPct: maxBytes > 0 ? Math.min(100, Math.round((totalBytes / maxBytes) * 1000) / 10) : 0,
      shardCount: shards.length,
      shards,
    };
  }

  async close() {
    await this.saveCursors().catch(() => {});
    for (const shard of this._shards.values()) {
      try {
        shard.db.close();
      } catch {
        // ignore
      }
    }
    this._shards.clear();
  }
}
