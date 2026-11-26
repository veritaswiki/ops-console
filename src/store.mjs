import fs from 'node:fs/promises';
import path from 'node:path';

const DAY_MS = 86_400_000;

function toDayKey(tsMs) {
  return new Date(tsMs).toISOString().slice(0, 10);
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export class TelemetryStore {
  constructor(opts = {}) {
    this.dataDir = opts.dataDir || '';
    this.preferredDriver = opts.driver || 'auto';
    this.rawRetentionDays = Math.max(1, Number(opts.rawRetentionDays || 7));
    this.rollup1mDays = Math.max(1, Number(opts.rollup1mDays || 30));
    this.rollup5mDays = Math.max(7, Number(opts.rollup5mDays || 365));
    this.incidentRetentionDays = Math.max(7, Number(opts.incidentRetentionDays || 90));
    this.logger = opts.logger || null;

    this.driver = 'memory';
    this.db = null;
    this.stmts = null;
    this.dbPath = this.dataDir ? path.join(this.dataDir, 'ops-console.db') : '';
    this.metricsDir = this.dataDir ? path.join(this.dataDir, 'metrics') : '';
    this.incidentsPath = this.dataDir ? path.join(this.dataDir, 'incidents.jsonl') : '';

    this.stateByKey = new Map();
    this.memoryIncidents = [];
    this.writeQueue = Promise.resolve();
    this.initialized = false;
    this.closed = false;
    this.lastPruneAt = 0;
  }

  async init() {
    if (this.initialized) return this.driver;
    this.initialized = true;
    if (!this.dataDir) {
      this.driver = 'memory';
      return this.driver;
    }

    await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    await fs.chmod(this.dataDir, 0o700).catch(() => {});

    if (this.preferredDriver === 'auto' || this.preferredDriver === 'sqlite') {
      try {
        const sqliteMod = await import('node:sqlite');
        if (typeof sqliteMod.DatabaseSync === 'function') {
          this.db = new sqliteMod.DatabaseSync(this.dbPath);
          this._initSqliteSchema();
          await fs.chmod(this.dbPath, 0o600).catch(() => {});
          this.driver = 'sqlite';
          this._hydrateOpenStatesFromSqlite();
          return this.driver;
        }
      } catch (err) {
        if (this.preferredDriver === 'sqlite') {
          this.logger?.warn('store_sqlite_unavailable_fallback', { error: err.message });
        }
      }
    }

    await fs.mkdir(this.metricsDir, { recursive: true, mode: 0o700 });
    await fs.chmod(this.metricsDir, 0o700).catch(() => {});
    this.driver = 'jsonl';
    await this._loadJsonlIncidents();
    return this.driver;
  }

  _initSqliteSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = MEMORY;
      PRAGMA busy_timeout = 3000;

      CREATE TABLE IF NOT EXISTS sample (
        series TEXT NOT NULL,
        ts INTEGER NOT NULL,
        cpu REAL,
        mem REAL,
        disk REAL,
        load1 REAL,
        rtt REAL,
        battery REAL,
        online_nodes INTEGER,
        total_nodes INTEGER,
        services_ok_pct REAL,
        PRIMARY KEY (series, ts)
      ) WITHOUT ROWID;

      CREATE TABLE IF NOT EXISTS rollup (
        series TEXT NOT NULL,
        step INTEGER NOT NULL,
        bucket INTEGER NOT NULL,
        cpu_sum REAL DEFAULT 0,
        cpu_count INTEGER DEFAULT 0,
        cpu_max REAL,
        mem_sum REAL DEFAULT 0,
        mem_count INTEGER DEFAULT 0,
        mem_max REAL,
        n INTEGER DEFAULT 0,
        PRIMARY KEY (series, step, bucket)
      ) WITHOUT ROWID;

      CREATE TABLE IF NOT EXISTS incident (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        entity_key TEXT NOT NULL,
        node TEXT NOT NULL,
        kind TEXT NOT NULL,
        from_state TEXT NOT NULL,
        to_state TEXT NOT NULL,
        detail TEXT DEFAULT '',
        resolved_ts INTEGER,
        note TEXT DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_incident_ts ON incident(ts DESC);
      CREATE INDEX IF NOT EXISTS idx_incident_open ON incident(entity_key) WHERE resolved_ts IS NULL;
    `);
    try {
      this.db.exec("ALTER TABLE incident ADD COLUMN note TEXT DEFAULT ''");
    } catch {
      // column already exists
    }

    this.stmts = {
      insertSample: this.db.prepare(`
        INSERT OR REPLACE INTO sample
          (series, ts, cpu, mem, disk, load1, rtt, battery, online_nodes, total_nodes, services_ok_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      upsertRollup: this.db.prepare(`
        INSERT INTO rollup (series, step, bucket, cpu_sum, cpu_count, cpu_max, mem_sum, mem_count, mem_max, n)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(series, step, bucket) DO UPDATE SET
          cpu_sum = rollup.cpu_sum + excluded.cpu_sum,
          cpu_count = rollup.cpu_count + excluded.cpu_count,
          cpu_max = CASE
            WHEN rollup.cpu_max IS NULL THEN excluded.cpu_max
            WHEN excluded.cpu_max IS NULL THEN rollup.cpu_max
            WHEN excluded.cpu_max > rollup.cpu_max THEN excluded.cpu_max
            ELSE rollup.cpu_max
          END,
          mem_sum = rollup.mem_sum + excluded.mem_sum,
          mem_count = rollup.mem_count + excluded.mem_count,
          mem_max = CASE
            WHEN rollup.mem_max IS NULL THEN excluded.mem_max
            WHEN excluded.mem_max IS NULL THEN rollup.mem_max
            WHEN excluded.mem_max > rollup.mem_max THEN excluded.mem_max
            ELSE rollup.mem_max
          END,
          n = rollup.n + 1
      `),
      selectSamples: this.db.prepare(`
        SELECT ts, cpu, mem, disk, load1, rtt, battery, online_nodes, total_nodes, services_ok_pct
        FROM sample
        WHERE series = ? AND ts >= ?
        ORDER BY ts DESC
        LIMIT ?
      `),
      selectRecentSeriesNames: this.db.prepare(`
        SELECT DISTINCT series FROM sample WHERE ts >= ?
      `),
      selectHydrateWindowed: this.db.prepare(`
        SELECT series, ts, cpu, mem, disk, load1, rtt, battery, online_nodes, total_nodes, services_ok_pct
        FROM (
          SELECT
            series, ts, cpu, mem, disk, load1, rtt, battery, online_nodes, total_nodes, services_ok_pct,
            ROW_NUMBER() OVER (PARTITION BY series ORDER BY ts DESC) AS rn
          FROM sample
          WHERE ts >= ?
        )
        WHERE rn <= ?
        ORDER BY series ASC, ts ASC
      `),
      insertIncident: this.db.prepare(`
        INSERT INTO incident (ts, entity_key, node, kind, from_state, to_state, detail, resolved_ts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),
      resolveOpenIncidents: this.db.prepare(`
        UPDATE incident SET resolved_ts = ? WHERE entity_key = ? AND resolved_ts IS NULL
      `),
      selectSamplesRange: this.db.prepare(`
        SELECT ts, cpu, mem, disk, load1, rtt, battery, online_nodes, total_nodes, services_ok_pct
        FROM sample
        WHERE series = ? AND ts >= ?
        ORDER BY ts ASC
        LIMIT ?
      `),
      selectRollupsRange: this.db.prepare(`
        SELECT bucket AS ts, cpu_sum, cpu_count, cpu_max, mem_sum, mem_count, mem_max, n
        FROM rollup
        WHERE series = ? AND step = ? AND bucket >= ?
        ORDER BY bucket ASC
        LIMIT ?
      `),
      selectIncidents: this.db.prepare(`
        SELECT id, ts, entity_key, node, kind, from_state, to_state, detail, resolved_ts, COALESCE(note, '') AS note
        FROM incident
        ORDER BY ts DESC, id DESC
        LIMIT ?
      `),
      selectOpenIncidents: this.db.prepare(`
        SELECT id, ts, entity_key, node, kind, from_state, to_state, detail, resolved_ts, COALESCE(note, '') AS note
        FROM incident
        WHERE resolved_ts IS NULL
        ORDER BY ts DESC, id DESC
        LIMIT ?
      `),
      updateIncidentNote: this.db.prepare(`
        UPDATE incident SET note = ? WHERE id = ?
      `),
      countSamples: this.db.prepare('SELECT COUNT(*) AS cnt FROM sample'),
      countOpenIncidents: this.db.prepare('SELECT COUNT(*) AS cnt FROM incident WHERE resolved_ts IS NULL'),
      pruneSamples: this.db.prepare('DELETE FROM sample WHERE ts < ?'),
      pruneRollup: this.db.prepare('DELETE FROM rollup WHERE step = ? AND bucket < ?'),
      pruneIncidents: this.db.prepare('DELETE FROM incident WHERE resolved_ts IS NOT NULL AND resolved_ts < ?'),
    };
  }

  _hydrateOpenStatesFromSqlite() {
    if (!this.stmts) return;
    const openRows = this.stmts.selectOpenIncidents.all(200);
    for (const row of openRows) {
      if (!this.stateByKey.has(row.entity_key)) {
        this.stateByKey.set(row.entity_key, row.to_state);
      }
    }
  }

  async _loadJsonlIncidents() {
    try {
      const raw = await fs.readFile(this.incidentsPath, 'utf8');
      const lines = raw.trim().split('\n').filter(Boolean).slice(-250);
      this.memoryIncidents = [];
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          this.memoryIncidents.push(item);
          if (item.entityKey && !item.resolvedAt) {
            this.stateByKey.set(item.entityKey, item.toState);
          } else if (item.entityKey && item.resolvedAt) {
            this.stateByKey.set(item.entityKey, 'healthy');
          }
        } catch {
          // skip corrupt line
        }
      }
    } catch {
      this.memoryIncidents = [];
    }
  }

  _enqueueJsonl(fn) {
    this.writeQueue = this.writeQueue.then(fn).catch(() => {});
    return this.writeQueue;
  }

  recordSample(series, sample) {
    if (this.closed) return;
    const cleanSeries = String(series || '').trim();
    if (!cleanSeries || !sample || typeof sample !== 'object') return;
    const ts = typeof sample.ts === 'number' && Number.isFinite(sample.ts) ? Math.floor(sample.ts) : Date.now();
    const cpu = normalizeNumber(sample.cpuPct ?? sample.avgCpuPct);
    const mem = normalizeNumber(sample.memPct ?? sample.avgMemPct);
    const disk = normalizeNumber(sample.diskPct);
    const load1 = normalizeNumber(sample.load1);
    const rtt = normalizeNumber(sample.rttMs);
    const battery = normalizeNumber(sample.batteryPct);
    const onlineNodes = normalizeNumber(sample.onlineNodes);
    const totalNodes = normalizeNumber(sample.totalNodes);
    const servicesOkPct = normalizeNumber(sample.servicesOkPct);

    if (this.driver === 'sqlite' && this.stmts) {
      let inTx = false;
      try {
        this.db.exec('BEGIN IMMEDIATE');
        inTx = true;
        this.stmts.insertSample.run(
          cleanSeries,
          ts,
          cpu,
          mem,
          disk,
          load1,
          rtt,
          battery,
          onlineNodes,
          totalNodes,
          servicesOkPct,
        );
        for (const stepSec of [60, 300]) {
          const bucket = Math.floor(ts / (stepSec * 1000)) * stepSec * 1000;
          this.stmts.upsertRollup.run(
            cleanSeries,
            stepSec,
            bucket,
            cpu ?? 0,
            cpu === null ? 0 : 1,
            cpu,
            mem ?? 0,
            mem === null ? 0 : 1,
            mem,
          );
        }
        this.db.exec('COMMIT');
        inTx = false;
      } catch {
        if (inTx) {
          try {
            this.db.exec('ROLLBACK');
          } catch {
            // ignore rollback error
          }
        }
      }
      this._maybePrune(ts);
      return;
    }

    if (this.driver === 'jsonl' && this.metricsDir) {
      const line = JSON.stringify({
        series: cleanSeries,
        ts,
        cpuPct: cpu,
        memPct: mem,
        diskPct: disk,
        load1,
        rttMs: rtt,
        batteryPct: battery,
        onlineNodes,
        totalNodes,
        servicesOkPct,
      });
      const dayFile = path.join(this.metricsDir, `${toDayKey(ts)}.jsonl`);
      this._enqueueJsonl(async () => {
        await fs.appendFile(dayFile, `${line}\n`, { encoding: 'utf8', mode: 0o600 });
      });
      this._maybePrune(ts);
    }
  }

  async hydrateTimeSeries(timeseries, { limitPerSeries = 60, windowMs = 6 * 3600_000 } = {}) {
    if (!timeseries || this.closed) return 0;
    const sinceMs = Date.now() - windowMs;
    let loaded = 0;

    if (this.driver === 'sqlite' && this.stmts) {
      try {
        const rows = this.stmts.selectHydrateWindowed.all(sinceMs, limitPerSeries);
        for (const pt of rows) {
          timeseries.record(pt.series, {
            ts: pt.ts,
            cpuPct: pt.cpu,
            avgCpuPct: pt.cpu,
            memPct: pt.mem,
            avgMemPct: pt.mem,
            diskPct: pt.disk,
            load1: pt.load1,
            rttMs: pt.rtt,
            batteryPct: pt.battery,
            onlineNodes: pt.online_nodes,
            totalNodes: pt.total_nodes,
            servicesOkPct: pt.services_ok_pct,
          }, { persist: false });
          loaded += 1;
        }
      } catch {
        // ignore hydration failure
      }
      return loaded;
    }

    if (this.driver === 'jsonl' && this.metricsDir) {
      try {
        const files = (await fs.readdir(this.metricsDir))
          .filter((name) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name))
          .sort()
          .slice(-2);
        const bySeries = new Map();
        for (const name of files) {
          const raw = await fs.readFile(path.join(this.metricsDir, name), 'utf8').catch(() => '');
          for (const line of raw.split('\n')) {
            if (!line) continue;
            try {
              const item = JSON.parse(line);
              if (!item.series || (item.ts || 0) < sinceMs) continue;
              let list = bySeries.get(item.series);
              if (!list) {
                list = [];
                bySeries.set(item.series, list);
              }
              list.push(item);
            } catch {
              // ignore bad jsonl line
            }
          }
        }
        for (const [series, items] of bySeries.entries()) {
          for (const pt of items.slice(-limitPerSeries)) {
            timeseries.record(series, pt, { persist: false });
            loaded += 1;
          }
        }
      } catch {
        // ignore
      }
    }
    return loaded;
  }

  recordStateTransition({ entityKey, node, kind, toState, detail = '' }) {
    if (this.closed) return null;
    const key = String(entityKey || '').trim();
    const nextState = String(toState || '').trim().toLowerCase();
    if (!key || !nextState) return null;

    const prevState = this.stateByKey.get(key);
    this.stateByKey.set(key, nextState);
    if (!prevState || prevState === nextState) {
      return null;
    }

    const nowMs = Date.now();
    const isRecovered = nextState === 'healthy' || nextState === 'standby';
    const cleanNode = String(node || key).slice(0, 80);
    const cleanKind = String(kind || 'service').slice(0, 24);
    const cleanDetail = String(detail || '').slice(0, 240);

    if (this.driver === 'sqlite' && this.stmts) {
      try {
        if (isRecovered) {
          this.stmts.resolveOpenIncidents.run(nowMs, key);
        }
        const info = this.stmts.insertIncident.run(
          nowMs,
          key,
          cleanNode,
          cleanKind,
          prevState,
          nextState,
          cleanDetail,
          isRecovered ? nowMs : null,
        );
        return {
          id: Number(info.lastInsertRowid || 0),
          ts: new Date(nowMs).toISOString(),
          entityKey: key,
          node: cleanNode,
          kind: cleanKind,
          fromState: prevState,
          toState: nextState,
          detail: cleanDetail,
          resolvedAt: isRecovered ? new Date(nowMs).toISOString() : null,
        };
      } catch {
        return null;
      }
    }

    if (isRecovered) {
      for (const item of this.memoryIncidents) {
        if (item.entityKey === key && !item.resolvedAt) {
          item.resolvedAt = new Date(nowMs).toISOString();
        }
      }
    }

    const record = {
      id: this.memoryIncidents.length + 1,
      ts: new Date(nowMs).toISOString(),
      entityKey: key,
      node: cleanNode,
      kind: cleanKind,
      fromState: prevState,
      toState: nextState,
      detail: cleanDetail,
      resolvedAt: isRecovered ? new Date(nowMs).toISOString() : null,
    };
    this.memoryIncidents.push(record);
    if (this.memoryIncidents.length > 300) {
      this.memoryIncidents.splice(0, this.memoryIncidents.length - 300);
    }

    if (this.driver === 'jsonl' && this.incidentsPath) {
      this._enqueueJsonl(async () => {
        await fs.appendFile(this.incidentsPath, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
      });
    }
    return record;
  }

  listIncidents({ limit = 60, openOnly = false } = {}) {
    const capped = Math.min(200, Math.max(1, Number(limit) || 60));
    if (this.driver === 'sqlite' && this.stmts) {
      const rows = openOnly
        ? this.stmts.selectOpenIncidents.all(capped)
        : this.stmts.selectIncidents.all(capped);
      return rows.map((row) => ({
        id: Number(row.id),
        ts: new Date(Number(row.ts)).toISOString(),
        entityKey: row.entity_key,
        node: row.node,
        kind: row.kind,
        fromState: row.from_state,
        toState: row.to_state,
        detail: row.detail || '',
        note: row.note || '',
        resolvedAt: row.resolved_ts ? new Date(Number(row.resolved_ts)).toISOString() : null,
      }));
    }

    const filtered = openOnly
      ? this.memoryIncidents.filter((item) => !item.resolvedAt)
      : this.memoryIncidents;
    return filtered.slice(-capped).reverse();
  }

  updateIncidentNote(id, note) {
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) return null;
    const cleanNote = String(note || '').trim().slice(0, 600);
    if (this.driver === 'sqlite' && this.stmts) {
      const info = this.stmts.updateIncidentNote.run(cleanNote, numId);
      if (Number(info.changes || 0) === 0) return null;
      return { id: numId, note: cleanNote };
    }
    const found = this.memoryIncidents.find((item) => Number(item.id) === numId);
    if (!found) return null;
    found.note = cleanNote;
    if (this.driver === 'jsonl' && this.incidentsPath) {
      const snapshotLines = this.memoryIncidents.map((item) => JSON.stringify(item)).join('\n');
      this._enqueueJsonl(async () => {
        const tmp = `${this.incidentsPath}.tmp.${process.pid}`;
        await fs.writeFile(tmp, snapshotLines ? `${snapshotLines}\n` : '', { encoding: 'utf8', mode: 0o600 });
        await fs.rename(tmp, this.incidentsPath);
      });
    }
    return { id: numId, note: cleanNote };
  }

  querySeries({ series = 'fleet', range = '24h', limit = 120 } = {}) {
    const cleanSeries = String(series || 'fleet').trim().slice(0, 64);
    const rangeMap = {
      '1h': { ms: 3600_000, source: 'raw', stepSec: 0 },
      '6h': { ms: 6 * 3600_000, source: 'raw', stepSec: 0 },
      '24h': { ms: 24 * 3600_000, source: 'rollup', stepSec: 60 },
      '7d': { ms: 7 * DAY_MS, source: 'rollup', stepSec: 300 },
      '30d': { ms: 30 * DAY_MS, source: 'rollup', stepSec: 300 },
      '90d': { ms: 90 * DAY_MS, source: 'rollup', stepSec: 300 },
    };
    const spec = rangeMap[range] || rangeMap['24h'];
    const sinceMs = Date.now() - spec.ms;
    const capped = Math.min(240, Math.max(12, Number(limit) || 120));

    if (this.driver === 'sqlite' && this.stmts) {
      if (spec.source === 'rollup') {
        const rows = this.stmts.selectRollupsRange.all(cleanSeries, spec.stepSec, sinceMs, capped);
        if (rows.length > 0) {
          return {
            series: cleanSeries,
            range,
            source: `rollup_${spec.stepSec}s`,
            points: rows.map((r) => ({
              ts: Number(r.ts),
              cpuPct: r.cpu_count > 0 ? Number((r.cpu_sum / r.cpu_count).toFixed(1)) : null,
              cpuMaxPct: r.cpu_max != null ? Number(r.cpu_max) : null,
              memPct: r.mem_count > 0 ? Number((r.mem_sum / r.mem_count).toFixed(1)) : null,
              memMaxPct: r.mem_max != null ? Number(r.mem_max) : null,
              samples: Number(r.n || 1),
            })),
          };
        }
      }
      const rawRows = this.stmts.selectSamplesRange.all(cleanSeries, sinceMs, capped);
      return {
        series: cleanSeries,
        range,
        source: 'raw',
        points: rawRows.map((r) => ({
          ts: Number(r.ts),
          cpuPct: r.cpu != null ? Number(r.cpu) : null,
          memPct: r.mem != null ? Number(r.mem) : null,
          diskPct: r.disk != null ? Number(r.disk) : null,
          load1: r.load1 != null ? Number(r.load1) : null,
          rttMs: r.rtt != null ? Number(r.rtt) : null,
          servicesOkPct: r.services_ok_pct != null ? Number(r.services_ok_pct) : null,
        })),
      };
    }

    return { series: cleanSeries, range, source: this.driver, points: [] };
  }

  _maybePrune(nowMs) {
    if (nowMs - this.lastPruneAt < 6 * 3600_000) return;
    this.lastPruneAt = nowMs;
    this.prune(nowMs).catch(() => {});
  }

  async prune(nowMs = Date.now()) {
    if (this.closed) return;
    if (this.driver === 'sqlite' && this.stmts) {
      try {
        this.stmts.pruneSamples.run(nowMs - this.rawRetentionDays * DAY_MS);
        this.stmts.pruneRollup.run(60, nowMs - this.rollup1mDays * DAY_MS);
        this.stmts.pruneRollup.run(300, nowMs - this.rollup5mDays * DAY_MS);
        this.stmts.pruneIncidents.run(nowMs - this.incidentRetentionDays * DAY_MS);
      } catch {
        // ignore prune errors
      }
      return;
    }

    if (this.driver === 'jsonl' && this.metricsDir) {
      try {
        const cutoffKey = toDayKey(nowMs - this.rawRetentionDays * DAY_MS);
        const files = await fs.readdir(this.metricsDir);
        for (const name of files) {
          if (!/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)) continue;
          if (name.slice(0, 10) < cutoffKey) {
            await fs.unlink(path.join(this.metricsDir, name)).catch(() => {});
          }
        }
      } catch {
        // ignore
      }
    }
  }

  async getStats() {
    if (this.driver === 'sqlite' && this.stmts) {
      let bytes = 0;
      try {
        const stat = await fs.stat(this.dbPath);
        bytes = stat.size;
      } catch {
        bytes = 0;
      }
      const sampleRow = this.stmts.countSamples.get();
      const openRow = this.stmts.countOpenIncidents.get();
      return {
        driver: 'sqlite',
        path: this.dbPath,
        bytes,
        samples: Number(sampleRow?.cnt || 0),
        openIncidents: Number(openRow?.cnt || 0),
      };
    }

    return {
      driver: this.driver,
      path: this.driver === 'jsonl' ? this.metricsDir : null,
      bytes: 0,
      samples: 0,
      openIncidents: this.memoryIncidents.filter((item) => !item.resolvedAt).length,
    };
  }

  async flush() {
    await this.writeQueue;
  }

  async close() {
    this.closed = true;
    await this.writeQueue;
    if (this.db) {
      try {
        this.db.close();
      } catch {
        // ignore
      }
      this.db = null;
      this.stmts = null;
    }
  }
}
