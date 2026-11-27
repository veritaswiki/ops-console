import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { findLogFile, findService, findTimer } from './config.mjs';
import { getUserEnv, runCmd } from './exec.mjs';
import { redactLogEntry, redactText } from './redact.mjs';

export const DEFAULT_MAX_FILE_TAIL_BYTES = 256 * 1024;
export const MIN_FILE_TAIL_BYTES = 8 * 1024;
export const MAX_FILE_TAIL_BYTES = 512 * 1024;
const MAX_STREAM_DELTA_BYTES = 64 * 1024;
const FILE_READ_CONCURRENCY = 4;

const SINCE_ALLOWLIST = new Map([
  ['15m', '-15m'],
  ['30m', '-30m'],
  ['1h', '-1h'],
  ['6h', '-6h'],
  ['24h', '-24h'],
  ['7d', '-7d'],
]);

const SINCE_MS_MAP = new Map([
  ['15m', 15 * 60 * 1000],
  ['30m', 30 * 60 * 1000],
  ['1h', 60 * 60 * 1000],
  ['6h', 6 * 60 * 60 * 1000],
  ['24h', 24 * 60 * 60 * 1000],
  ['7d', 7 * 24 * 60 * 60 * 1000],
]);

const LEVEL_TO_MAX_PRIORITY = new Map([
  ['err', 3],
  ['error', 3],
  ['warn', 4],
  ['warning', 4],
  ['info', 6],
  ['debug', 7],
  ['all', 7],
]);

export function clampMaxTailBytes(raw) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_FILE_TAIL_BYTES;
  return Math.min(MAX_FILE_TAIL_BYTES, Math.max(MIN_FILE_TAIL_BYTES, Math.floor(parsed)));
}

export function parseSinceCutoffMs(since, nowMs = Date.now()) {
  const spanMs = SINCE_MS_MAP.get(String(since || '1h'));
  if (!spanMs) return null;
  return nowMs - spanMs;
}

export function parseTargetList(rawTargets) {
  const items = Array.isArray(rawTargets)
    ? rawTargets
    : String(rawTargets || '').split(',');
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const token = String(item || '').trim();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

export function priorityToLevel(priority) {
  const p = Number(priority);
  if (!Number.isFinite(p)) return 'info';
  if (p <= 3) return 'error';
  if (p === 4) return 'warn';
  if (p <= 6) return 'info';
  return 'debug';
}

export function inferLevelFromText(text) {
  const lower = String(text || '').toLowerCase();
  if (/\b(fatal|panic|crit|critical|error|err|exception|failed|traceback)\b/.test(lower)) return 'error';
  if (/\b(warn|warning|degraded|retry|timeout|slow)\b/.test(lower)) return 'warn';
  if (/\b(debug|trace)\b/.test(lower)) return 'debug';
  return 'info';
}

export function parseJournalJsonLine(line) {
  if (!line || !line.trim()) return null;
  try {
    const raw = JSON.parse(line);
    const usec = Number(raw.__REALTIME_TIMESTAMP || 0);
    const ts = usec > 0 ? new Date(Math.floor(usec / 1000)).toISOString() : new Date().toISOString();
    const priority = raw.PRIORITY !== undefined ? Number(raw.PRIORITY) : 6;
    let message = '';
    if (typeof raw.MESSAGE === 'string') {
      message = raw.MESSAGE;
    } else if (Array.isArray(raw.MESSAGE)) {
      message = Buffer.from(raw.MESSAGE).toString('utf8');
    } else if (raw.MESSAGE !== undefined && raw.MESSAGE !== null) {
      message = String(raw.MESSAGE);
    }
    const unit = raw._SYSTEMD_USER_UNIT || raw._SYSTEMD_UNIT || raw.UNIT || raw.SYSLOG_IDENTIFIER || 'system';
    return {
      ts,
      unit: String(unit),
      priority: Number.isFinite(priority) ? priority : 6,
      level: priorityToLevel(priority),
      pid: raw._PID ? String(raw._PID) : '',
      message,
      cursor: raw.__CURSOR ? String(raw.__CURSOR) : '',
    };
  } catch {
    return null;
  }
}

function buildQueryMatcher(q) {
  const trimmed = String(q || '').trim();
  if (!trimmed) return null;
  if (trimmed.length > 120) {
    const needle = trimmed.slice(0, 120).toLowerCase();
    return (entry) => `${entry.serviceName || ''} ${entry.unit || ''} ${entry.sourceLabel || ''} ${entry.message || ''}`.toLowerCase().includes(needle);
  }
  if (trimmed.startsWith('/') && trimmed.endsWith('/') && trimmed.length > 2) {
    const body = trimmed.slice(1, -1);
    if (!/(\([^)]*[+*][^)]*\))[+*]/.test(body)) {
      try {
        const re = new RegExp(body, 'i');
        return (entry) => re.test(`${entry.serviceName || ''} ${entry.unit || ''} ${entry.sourceLabel || ''} ${entry.message || ''}`);
      } catch {
        // fall back to substring
      }
    }
  }
  const needle = trimmed.toLowerCase();
  return (entry) => `${entry.serviceName || ''} ${entry.unit || ''} ${entry.sourceLabel || ''} ${entry.message || ''}`.toLowerCase().includes(needle);
}

function summarizeCounts(entries) {
  const counts = { total: entries.length, error: 0, warn: 0, info: 0, debug: 0 };
  for (const e of entries) {
    if (counts[e.level] !== undefined) counts[e.level] += 1;
    else counts.info += 1;
  }
  return counts;
}

export async function readFileTailBounded(filePath, maxBytes = DEFAULT_MAX_FILE_TAIL_BYTES) {
  const startedAt = Date.now();
  const limit = clampMaxTailBytes(maxBytes);
  const handle = await fs.open(filePath, 'r');
  try {
    const stat = await handle.stat();
    const size = stat.size;
    const start = Math.max(0, size - limit);
    const len = size - start;
    if (len <= 0) {
      return {
        text: '',
        fileSizeBytes: size,
        readBytes: 0,
        truncated: false,
        elapsedMs: Date.now() - startedAt,
      };
    }
    const buf = Buffer.allocUnsafe(len);
    const { bytesRead } = await handle.read(buf, 0, len, start);
    let text = buf.subarray(0, bytesRead).toString('utf8');
    if (start > 0) {
      const firstNl = text.indexOf('\n');
      if (firstNl >= 0) text = text.slice(firstNl + 1);
    }
    return {
      text,
      fileSizeBytes: size,
      readBytes: bytesRead,
      truncated: start > 0,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    await handle.close();
  }
}

function entryWithinCutoff(entry, cutoffMs) {
  if (!cutoffMs) return true;
  const rawTs = entry?.ts || entry?.timestamp;
  if (!rawTs) return true;
  const parsedMs = Date.parse(rawTs);
  if (!Number.isFinite(parsedMs)) return true;
  return parsedMs >= cutoffMs;
}

function sortEntriesChronologically(entries) {
  return entries
    .map((entry, idx) => {
      const parsedMs = entry?.ts ? Date.parse(entry.ts) : Number.NaN;
      return {
        entry,
        idx,
        ms: Number.isFinite(parsedMs) ? parsedMs : 0,
      };
    })
    .sort((left, right) => {
      if (left.ms !== right.ms) return left.ms - right.ms;
      return left.idx - right.idx;
    })
    .map((item) => item.entry);
}

function parseGenericLogLine(line, unitLabel) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      const level = obj.level && ['error', 'warn', 'info', 'debug'].includes(obj.level)
        ? obj.level
        : (obj.ok === false ? 'error' : inferLevelFromText(obj.message || obj.output || trimmed));
      const priority = level === 'error' ? 3 : level === 'warn' ? 4 : level === 'debug' ? 7 : 6;
      const message = obj.message
        || (obj.action ? `[${obj.category || 'audit'}] ${obj.action} ${obj.target || ''} -> ${obj.ok ? 'OK' : 'FAIL'} ${obj.output || ''}`.trim() : trimmed);
      return {
        ts: obj.ts || obj.timestamp || new Date().toISOString(),
        unit: obj.unit || obj.target || unitLabel,
        priority,
        level,
        pid: obj.pid ? String(obj.pid) : '',
        message,
        meta: obj,
      };
    } catch {
      // fall through
    }
  }
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(.*)$/);
  const ts = isoMatch ? isoMatch[1] : '';
  const msg = isoMatch ? isoMatch[2] : trimmed;
  const level = inferLevelFromText(msg);
  const priority = level === 'error' ? 3 : level === 'warn' ? 4 : level === 'debug' ? 7 : 6;
  return { ts, unit: unitLabel, priority, level, pid: '', message: msg };
}

export class LogService {
  constructor({ config, logger, demoProvider = null }) {
    this.config = config;
    this.logger = logger;
    this.demoProvider = demoProvider;
    this.activeStreams = new Set();
  }

  listSources() {
    const linkedByService = new Map();
    for (const fileItem of this.config.logFiles || []) {
      if (fileItem.serviceId && !linkedByService.has(fileItem.serviceId)) {
        linkedByService.set(fileItem.serviceId, fileItem.id);
      }
    }

    const serviceUnits = this.config.services.map((svc) => {
      const logFileId = svc.logFile ? `svc-file:${svc.id}` : (linkedByService.get(svc.id) || null);
      return {
        id: svc.id,
        unit: svc.unit,
        name: svc.name,
        scope: svc.scope,
        layer: svc.layer,
        hasLogFile: Boolean(logFileId),
        logFileId,
      };
    });

    const units = [
      ...serviceUnits,
      ...this.config.timers.map((t) => ({
        id: t.id,
        unit: t.unit,
        name: t.name,
        scope: t.scope,
        layer: 'timers',
        hasLogFile: false,
        logFileId: null,
      })),
    ];

    const files = [
      ...this.config.logFiles.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        serviceId: f.serviceId || '',
      })),
      ...this.config.services
        .filter((svc) => Boolean(svc.logFile))
        .map((svc) => ({
          id: `svc-file:${svc.id}`,
          name: `${svc.name} 原生日志`,
          path: svc.logFile,
          serviceId: svc.id,
          unit: svc.unit,
        })),
    ];

    const memory = serviceUnits
      .filter((svc) => svc.layer === 'memory' || /nmem|openviking|memory/i.test(`${svc.id} ${svc.unit}`))
      .map((svc) => ({ id: svc.id, unit: svc.unit, name: svc.name }));

    return {
      units,
      services: serviceUnits,
      files,
      memory,
      builtin: [
        { id: 'self', name: 'Ops Console Structured Log' },
        { id: 'audit', name: 'Operations Audit Trail' },
      ],
      limits: {
        maxLines: 500,
        defaultMaxBytesPerFile: DEFAULT_MAX_FILE_TAIL_BYTES,
        maxBytesPerFile: MAX_FILE_TAIL_BYTES,
        maxSseStreams: this.config.security.maxSseStreams,
      },
      maxSseStreams: this.config.security.maxSseStreams,
      activeSseStreams: this.activeStreams.size,
    };
  }

  findServiceByUnit(unitName) {
    if (!unitName) return null;
    return this.config.services.find((svc) => svc.unit === unitName || svc.id === unitName)
      || this.config.timers.find((timer) => timer.unit === unitName || timer.id === unitName)
      || null;
  }

  getServiceLogFiles(svc) {
    if (!svc) return [];
    const out = [];
    if (svc.logFile) {
      out.push({
        id: `svc-file:${svc.id}`,
        name: `${svc.name} 原生日志`,
        path: svc.logFile,
        serviceId: svc.id,
        unit: svc.unit,
      });
    }
    for (const fileItem of this.config.logFiles || []) {
      if (fileItem.serviceId && fileItem.serviceId === svc.id) {
        out.push(fileItem);
      }
    }
    return out;
  }

  resolveUnifiedTargets(rawTargets) {
    const tokens = parseTargetList(rawTargets);
    const selectAll = tokens.length === 0 || tokens.includes('all');
    const userUnits = new Map();
    const systemUnits = new Map();
    const fileTargets = new Map();
    let includeSelf = false;
    let includeAudit = false;

    const addUnitTarget = (unitObj) => {
      if (!unitObj) return;
      if (unitObj.scope === 'system') systemUnits.set(unitObj.unit, unitObj);
      else userUnits.set(unitObj.unit, unitObj);
      for (const linkedFile of this.getServiceLogFiles(unitObj)) {
        fileTargets.set(linkedFile.id, linkedFile);
      }
    };

    if (selectAll) {
      for (const svc of this.config.services) {
        addUnitTarget(svc);
      }
      for (const fileItem of this.config.logFiles || []) {
        fileTargets.set(fileItem.id, fileItem);
      }
      includeSelf = true;
      includeAudit = true;
      return {
        ok: true,
        selectAll: true,
        tokens: ['all'],
        userUnits,
        systemUnits,
        fileTargets,
        includeSelf,
        includeAudit,
      };
    }

    for (const token of tokens) {
      if (token === 'self') {
        includeSelf = true;
        continue;
      }
      if (token === 'audit') {
        includeAudit = true;
        continue;
      }
      const svcOrTimer = findService(this.config, token) || findTimer(this.config, token);
      if (svcOrTimer) {
        addUnitTarget(svcOrTimer);
        continue;
      }
      const logFile = findLogFile(this.config, token);
      if (logFile) {
        fileTargets.set(logFile.id, logFile);
        continue;
      }
      return { ok: false, error: `Log target not in allowlist: ${token}` };
    }

    return {
      ok: true,
      selectAll: false,
      tokens,
      userUnits,
      systemUnits,
      fileTargets,
      includeSelf,
      includeAudit,
    };
  }

  async readSingleLogFile(logFile, { maxPriority, matcher, cutoffMs, maxBytes, lines }) {
    const startedAt = Date.now();
    const linkedSvc = logFile.serviceId ? findService(this.config, logFile.serviceId) : null;
    const unitLabel = logFile.unit || linkedSvc?.unit || logFile.name;
    try {
      const realTarget = await fs.realpath(logFile.path);
      const tail = await readFileTailBounded(realTarget, maxBytes);
      let entries = tail.text
        .split('\n')
        .map((line) => parseGenericLogLine(line, unitLabel))
        .filter(Boolean)
        .map((entry) => redactLogEntry({
          ...entry,
          unit: entry.unit || unitLabel,
          serviceId: linkedSvc?.id || logFile.serviceId || '',
          serviceName: linkedSvc?.name || logFile.name,
          sourceKind: 'file',
          sourceId: logFile.id,
          sourceLabel: logFile.name,
        }))
        .filter((entry) => entry.priority <= maxPriority)
        .filter((entry) => entryWithinCutoff(entry, cutoffMs));
      if (matcher) entries = entries.filter(matcher);
      const sliced = entries.slice(-lines);
      return {
        entries: sliced,
        sourceMeta: {
          id: logFile.id,
          name: logFile.name,
          unit: unitLabel,
          serviceId: linkedSvc?.id || logFile.serviceId || '',
          sourceKind: 'file',
          count: sliced.length,
          readBytes: tail.readBytes,
          fileSizeBytes: tail.fileSizeBytes,
          truncated: tail.truncated,
          elapsedMs: tail.elapsedMs,
        },
      };
    } catch (err) {
      return {
        entries: [],
        warning: err.code === 'ENOENT' ? 'Log file does not exist yet' : err.message,
        sourceMeta: {
          id: logFile.id,
          name: logFile.name,
          unit: unitLabel,
          serviceId: linkedSvc?.id || logFile.serviceId || '',
          sourceKind: 'file',
          count: 0,
          readBytes: 0,
          fileSizeBytes: 0,
          truncated: false,
          elapsedMs: Date.now() - startedAt,
          warning: err.code === 'ENOENT' ? 'Log file does not exist yet' : err.message,
        },
      };
    }
  }

  async runJournalBatch(scope, unitMap, { sinceArg, fetchLines, maxPriority }) {
    const units = [...unitMap.keys()];
    if (units.length === 0) {
      return { entries: [], readBytes: 0, elapsedMs: 0, warning: '' };
    }
    const startedAt = Date.now();
    const args = [];
    if (scope === 'user') args.push('--user');
    for (const unitName of units) {
      args.push('-u', unitName);
    }
    args.push('--since', sinceArg, '-n', String(fetchLines), '--no-pager', '--output=json');
    if (maxPriority < 7) {
      args.push('-p', `0..${maxPriority}`);
    }
    try {
      const { stdout } = await runCmd('journalctl', args, { timeout: 4000, maxBuffer: 4 * 1024 * 1024 });
      const readBytes = Buffer.byteLength(stdout || '', 'utf8');
      const entries = (stdout || '')
        .split('\n')
        .map(parseJournalJsonLine)
        .filter(Boolean)
        .map((entry) => {
          const matchedSvc = unitMap.get(entry.unit) || this.findServiceByUnit(entry.unit);
          return {
            ...entry,
            serviceId: matchedSvc?.id || '',
            serviceName: matchedSvc?.name || entry.unit,
            sourceKind: 'journald',
            sourceId: matchedSvc?.unit || entry.unit,
            sourceLabel: matchedSvc?.name || entry.unit,
          };
        });
      return {
        entries,
        readBytes,
        elapsedMs: Date.now() - startedAt,
        warning: '',
      };
    } catch (err) {
      return {
        entries: [],
        readBytes: 0,
        elapsedMs: Date.now() - startedAt,
        warning: err?.message ? String(err.message).slice(0, 160) : 'journalctl unavailable',
      };
    }
  }

  async query(params = {}) {
    const queryStartedAt = Date.now();
    const source = String(params.source || 'journald');
    const unitId = String(params.unit || '');
    const fileId = String(params.file || '');
    const rawTargets = params.targets || params.services || (source === 'unified' ? (params.target || unitId) : '');
    const level = String(params.level || 'all').toLowerCase();
    const since = String(params.since || '1h');
    const q = String(params.q || '');
    const lines = Math.min(500, Math.max(10, Number(params.lines) || 150));
    const maxBytesPerFile = clampMaxTailBytes(params.maxBytesPerFile);
    const includeLines = Boolean(params.includeLines);
    const maxPriority = LEVEL_TO_MAX_PRIORITY.get(level) ?? 7;
    const matcher = buildQueryMatcher(q);
    const cutoffMs = parseSinceCutoffMs(since);

    if (this.config.demo && this.demoProvider) {
      const demoRes = this.demoProvider.queryLogs({
        source,
        unit: unitId,
        file: fileId,
        targets: parseTargetList(rawTargets),
        level,
        since,
        q,
        lines,
      });
      const sanitized = (demoRes.entries || []).map(redactLogEntry);
      const payload = { ...demoRes, entries: sanitized };
      if (!includeLines) delete payload.lines;
      return payload;
    }

    if (source === 'memory') {
      const memoryTarget = String(params.target || unitId || '').trim();
      if (memoryTarget) {
        const matchedSvc = findService(this.config, memoryTarget);
        if (matchedSvc) {
          return this.query({ ...params, source: 'unified', targets: [matchedSvc.id] });
        }
        const matchedFile = findLogFile(this.config, memoryTarget);
        if (matchedFile) {
          return this.query({ ...params, source: 'file', file: matchedFile.id });
        }
      }
      const memIds = this.config.services
        .filter((svc) => svc.layer === 'memory' || /nmem|openviking|memory/i.test(`${svc.id} ${svc.unit}`))
        .map((svc) => svc.id);
      if (memIds.length > 0) {
        return this.query({ ...params, source: 'unified', targets: memIds });
      }
      return {
        ok: true,
        source: 'memory',
        label: memoryTarget || 'Memory Services',
        entries: [],
        counts: summarizeCounts([]),
        sources: [],
        stats: {
          directRead: true,
          elapsedMs: Date.now() - queryStartedAt,
          totalReadBytes: 0,
          sourcesQueried: 0,
          truncatedSources: 0,
          maxBytesPerFile,
          maxLines: lines,
        },
      };
    }

    if (source === 'self') {
      const rawEntries = this.logger.getRecent(500).map((entry) => redactLogEntry({
        ...entry,
        unit: entry.unit || 'ops-console',
        serviceId: 'self',
        serviceName: 'Ops Console',
        sourceKind: 'self',
        sourceId: 'self',
        sourceLabel: 'Ops Console 结构化日志',
      }));
      let filtered = rawEntries
        .filter((e) => (e.priority ?? 6) <= maxPriority)
        .filter((e) => entryWithinCutoff(e, cutoffMs));
      if (matcher) filtered = filtered.filter(matcher);
      const sliced = filtered.slice(-lines);
      return {
        ok: true,
        source: 'self',
        label: 'ops-console',
        entries: sliced,
        counts: summarizeCounts(sliced),
        sources: [
          {
            id: 'self',
            name: 'Ops Console 结构化日志',
            unit: 'ops-console',
            sourceKind: 'self',
            count: sliced.length,
            readBytes: 0,
            fileSizeBytes: 0,
            truncated: false,
            elapsedMs: Date.now() - queryStartedAt,
          },
        ],
        stats: {
          directRead: true,
          elapsedMs: Date.now() - queryStartedAt,
          totalReadBytes: 0,
          sourcesQueried: 1,
          truncatedSources: 0,
          maxBytesPerFile,
          maxLines: lines,
        },
        ...(includeLines ? { lines: sliced.map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.message}`).join('\n') } : {}),
      };
    }

    if (source === 'audit') {
      const records = await this.logger.readAudit(500);
      let entries = records.reverse().map((r) => ({
        ts: r.ts || '',
        unit: r.target || r.category || 'audit',
        serviceId: 'audit',
        serviceName: '操作审计日志',
        sourceKind: 'audit',
        sourceId: 'audit',
        sourceLabel: 'audit.jsonl',
        priority: r.ok === false ? 3 : 6,
        level: r.ok === false ? 'error' : 'info',
        pid: '',
        message: redactText(`[${r.category || 'ops'}:${r.action || 'run'}] ${r.target || ''} (${r.ok ? 'OK' : 'FAIL'}, ${r.durationMs ?? 0}ms) ${r.output || ''}`.trim()),
        meta: r,
      }));
      entries = entries
        .filter((e) => e.priority <= maxPriority)
        .filter((e) => entryWithinCutoff(e, cutoffMs));
      if (matcher) entries = entries.filter(matcher);
      const sliced = entries.slice(-lines);
      return {
        ok: true,
        source: 'audit',
        label: 'audit.jsonl',
        entries: sliced,
        counts: summarizeCounts(sliced),
        sources: [
          {
            id: 'audit',
            name: '操作审计日志',
            unit: 'audit.jsonl',
            sourceKind: 'audit',
            count: sliced.length,
            readBytes: 0,
            fileSizeBytes: 0,
            truncated: false,
            elapsedMs: Date.now() - queryStartedAt,
          },
        ],
        stats: {
          directRead: true,
          elapsedMs: Date.now() - queryStartedAt,
          totalReadBytes: 0,
          sourcesQueried: 1,
          truncatedSources: 0,
          maxBytesPerFile,
          maxLines: lines,
        },
        ...(includeLines ? { lines: sliced.map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.message}`).join('\n') } : {}),
      };
    }

    if (source === 'file') {
      const logFile = findLogFile(this.config, fileId);
      if (!logFile) {
        return { ok: false, error: `Log file not in allowlist: ${fileId}` };
      }
      const res = await this.readSingleLogFile(logFile, {
        maxPriority,
        matcher,
        cutoffMs,
        maxBytes: maxBytesPerFile,
        lines,
      });
      return {
        ok: true,
        source: 'file',
        target: logFile.id,
        label: logFile.name,
        path: logFile.path,
        entries: res.entries,
        counts: summarizeCounts(res.entries),
        sources: [res.sourceMeta],
        stats: {
          directRead: true,
          elapsedMs: Date.now() - queryStartedAt,
          totalReadBytes: res.sourceMeta.readBytes,
          sourcesQueried: 1,
          truncatedSources: res.sourceMeta.truncated ? 1 : 0,
          maxBytesPerFile,
          maxLines: lines,
        },
        ...(res.warning ? { warning: res.warning } : {}),
        ...(includeLines ? { lines: res.entries.map((e) => `${e.ts ? e.ts + ' ' : ''}[${e.level.toUpperCase()}] ${e.message}`).join('\n') } : {}),
      };
    }

    if (source === 'unified') {
      const resolved = this.resolveUnifiedTargets(rawTargets);
      if (!resolved.ok) {
        return resolved;
      }

      const sinceArg = SINCE_ALLOWLIST.get(since) || '-1h';
      const fetchLines = matcher ? Math.min(750, lines * 3) : Math.min(500, lines * 2);
      const fileList = [...resolved.fileTargets.values()];

      const [userJournal, systemJournal, fileResults, auditRecords] = await Promise.all([
        this.runJournalBatch('user', resolved.userUnits, { sinceArg, fetchLines, maxPriority }),
        this.runJournalBatch('system', resolved.systemUnits, { sinceArg, fetchLines, maxPriority }),
        mapWithConcurrency(fileList, FILE_READ_CONCURRENCY, (logFile) =>
          this.readSingleLogFile(logFile, {
            maxPriority,
            matcher,
            cutoffMs,
            maxBytes: maxBytesPerFile,
            lines: fetchLines,
          }),
        ),
        resolved.includeAudit ? this.logger.readAudit(250) : Promise.resolve([]),
      ]);

      const combined = [];
      const sourcesMeta = [];
      let totalReadBytes = userJournal.readBytes + systemJournal.readBytes;

      const processJournalEntries = (batch, unitMap) => {
        const perUnitCount = new Map();
        for (const rawEntry of batch.entries) {
          const clean = redactLogEntry(rawEntry);
          if (matcher && !matcher(clean)) continue;
          combined.push(clean);
          const key = clean.sourceId || clean.unit;
          perUnitCount.set(key, (perUnitCount.get(key) || 0) + 1);
        }
        for (const [unitName, unitObj] of unitMap.entries()) {
          sourcesMeta.push({
            id: unitObj.id || unitName,
            name: unitObj.name || unitName,
            unit: unitName,
            serviceId: unitObj.id || '',
            sourceKind: 'journald',
            count: perUnitCount.get(unitName) || 0,
            readBytes: unitMap.size > 0 ? Math.round(batch.readBytes / unitMap.size) : 0,
            fileSizeBytes: 0,
            truncated: false,
            elapsedMs: batch.elapsedMs,
            ...(batch.warning ? { warning: batch.warning } : {}),
          });
        }
      };

      processJournalEntries(userJournal, resolved.userUnits);
      processJournalEntries(systemJournal, resolved.systemUnits);

      for (const fileRes of fileResults) {
        combined.push(...fileRes.entries);
        sourcesMeta.push(fileRes.sourceMeta);
        totalReadBytes += fileRes.sourceMeta.readBytes || 0;
      }

      if (resolved.includeSelf) {
        const selfStartedAt = Date.now();
        let selfEntries = this.logger.getRecent(300).map((entry) => redactLogEntry({
          ...entry,
          unit: entry.unit || 'ops-console',
          serviceId: 'self',
          serviceName: 'Ops Console',
          sourceKind: 'self',
          sourceId: 'self',
          sourceLabel: 'Ops Console 结构化日志',
        }))
          .filter((e) => (e.priority ?? 6) <= maxPriority)
          .filter((e) => entryWithinCutoff(e, cutoffMs));
        if (matcher) selfEntries = selfEntries.filter(matcher);
        combined.push(...selfEntries.slice(-lines));
        sourcesMeta.push({
          id: 'self',
          name: 'Ops Console 结构化日志',
          unit: 'ops-console',
          serviceId: 'self',
          sourceKind: 'self',
          count: Math.min(selfEntries.length, lines),
          readBytes: 0,
          fileSizeBytes: 0,
          truncated: false,
          elapsedMs: Date.now() - selfStartedAt,
        });
      }

      if (resolved.includeAudit) {
        const auditStartedAt = Date.now();
        let auditEntries = auditRecords.reverse().map((r) => ({
          ts: r.ts || '',
          unit: r.target || r.category || 'audit',
          serviceId: 'audit',
          serviceName: '操作审计日志',
          sourceKind: 'audit',
          sourceId: 'audit',
          sourceLabel: 'audit.jsonl',
          priority: r.ok === false ? 3 : 6,
          level: r.ok === false ? 'error' : 'info',
          pid: '',
          message: redactText(`[${r.category || 'ops'}:${r.action || 'run'}] ${r.target || ''} (${r.ok ? 'OK' : 'FAIL'}, ${r.durationMs ?? 0}ms) ${r.output || ''}`.trim()),
          meta: r,
        }))
          .filter((e) => e.priority <= maxPriority)
          .filter((e) => entryWithinCutoff(e, cutoffMs));
        if (matcher) auditEntries = auditEntries.filter(matcher);
        combined.push(...auditEntries.slice(-lines));
        sourcesMeta.push({
          id: 'audit',
          name: '操作审计日志',
          unit: 'audit.jsonl',
          serviceId: 'audit',
          sourceKind: 'audit',
          count: Math.min(auditEntries.length, lines),
          readBytes: 0,
          fileSizeBytes: 0,
          truncated: false,
          elapsedMs: Date.now() - auditStartedAt,
        });
      }

      const ordered = sortEntriesChronologically(combined);
      const sliced = ordered.slice(-lines);
      const truncatedSources = sourcesMeta.filter((s) => s.truncated).length;

      return {
        ok: true,
        source: 'unified',
        target: resolved.selectAll ? 'all' : resolved.tokens.join(','),
        targets: resolved.tokens,
        label: resolved.selectAll
          ? '大一统全服务直读日志'
          : `统一日志 (${resolved.tokens.length} 项)`,
        entries: sliced,
        counts: summarizeCounts(sliced),
        sources: sourcesMeta,
        stats: {
          directRead: true,
          elapsedMs: Date.now() - queryStartedAt,
          totalReadBytes,
          sourcesQueried: sourcesMeta.length,
          truncatedSources,
          maxBytesPerFile,
          maxLines: lines,
        },
        ...(includeLines ? { lines: sliced.map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.unit}: ${e.message}`).join('\n') } : {}),
      };
    }

    const sinceArg = SINCE_ALLOWLIST.get(since) || '-1h';
    const targetUnit = unitId && unitId !== 'all'
      ? (findService(this.config, unitId) || findTimer(this.config, unitId))
      : null;

    if (unitId && unitId !== 'all' && !targetUnit) {
      return { ok: false, error: `Unit not in allowlist: ${unitId}` };
    }

    const fetchLines = matcher ? Math.min(800, lines * 3) : lines;
    const userMap = new Map();
    const sysMap = new Map();
    if (targetUnit) {
      if (targetUnit.scope === 'system') sysMap.set(targetUnit.unit, targetUnit);
      else userMap.set(targetUnit.unit, targetUnit);
    } else {
      for (const svc of this.config.services) {
        if (svc.scope === 'system') sysMap.set(svc.unit, svc);
        else userMap.set(svc.unit, svc);
      }
    }

    const [userBatch, sysBatch] = await Promise.all([
      this.runJournalBatch('user', userMap, { sinceArg, fetchLines, maxPriority }),
      this.runJournalBatch('system', sysMap, { sinceArg, fetchLines, maxPriority }),
    ]);

    let entries = sortEntriesChronologically([...userBatch.entries, ...sysBatch.entries]);
    entries = entries.map(redactLogEntry);
    if (matcher) entries = entries.filter(matcher);
    const sliced = entries.slice(-lines);
    const totalReadBytes = userBatch.readBytes + sysBatch.readBytes;

    return {
      ok: true,
      source: 'journald',
      unit: targetUnit ? targetUnit.unit : 'all',
      scope: targetUnit ? targetUnit.scope : 'mixed',
      label: targetUnit ? targetUnit.name : 'All Managed Units',
      entries: sliced,
      counts: summarizeCounts(sliced),
      sources: [
        ...(targetUnit
          ? [{
              id: targetUnit.id || targetUnit.unit,
              name: targetUnit.name || targetUnit.unit,
              unit: targetUnit.unit,
              serviceId: targetUnit.id || '',
              sourceKind: 'journald',
              count: sliced.length,
              readBytes: totalReadBytes,
              fileSizeBytes: 0,
              truncated: false,
              elapsedMs: Date.now() - queryStartedAt,
            }]
          : []),
      ],
      stats: {
        directRead: true,
        elapsedMs: Date.now() - queryStartedAt,
        totalReadBytes,
        sourcesQueried: userMap.size + sysMap.size,
        truncatedSources: 0,
        maxBytesPerFile,
        maxLines: lines,
      },
      ...(includeLines ? { lines: sliced.map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.unit}: ${e.message}`).join('\n') } : {}),
    };
  }

  formatExport(result, format = 'jsonl') {
    const entries = (result.entries || []).map(redactLogEntry);
    if (format === 'text' || format === 'log') {
      const text = entries
        .map((e) => `${e.ts || ''} [${String(e.level || 'info').toUpperCase().padEnd(5)}] ${e.unit || '-'}${e.pid ? `[${e.pid}]` : ''}: ${e.message}`)
        .join('\n');
      return { contentType: 'text/plain; charset=utf-8', ext: 'log', body: text + (text ? '\n' : '') };
    }
    const body = entries.map((e) => JSON.stringify(e)).join('\n');
    return { contentType: 'application/x-ndjson; charset=utf-8', ext: 'jsonl', body: body + (body ? '\n' : '') };
  }

  openStream(req, res, params = {}) {
    if (this.activeStreams.size >= this.config.security.maxSseStreams) {
      res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Too many concurrent live log streams' }));
      return;
    }

    const source = String(params.source || 'journald');
    const unitId = String(params.unit || '');
    const fileId = String(params.file || '');
    const rawTargets = params.targets || params.services || (source === 'unified' ? (params.target || unitId) : '');
    const level = String(params.level || 'all').toLowerCase();
    const q = String(params.q || '');
    const maxPriority = LEVEL_TO_MAX_PRIORITY.get(level) ?? 7;
    const matcher = buildQueryMatcher(q);

    let targetUnit = null;
    let targetFile = null;
    let unifiedPlan = null;

    if (source === 'journald' && !this.config.demo) {
      if (unitId && unitId !== 'all') {
        targetUnit = findService(this.config, unitId) || findTimer(this.config, unitId);
        if (!targetUnit) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: `Unit not in allowlist: ${unitId}` }));
          return;
        }
      }
    } else if (source === 'file' && !this.config.demo) {
      targetFile = findLogFile(this.config, fileId);
      if (!targetFile) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: `Log file not in allowlist: ${fileId}` }));
        return;
      }
    } else if (source === 'unified' && !this.config.demo) {
      unifiedPlan = this.resolveUnifiedTargets(rawTargets);
      if (!unifiedPlan.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(unifiedPlan));
        return;
      }
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    });

    const sendEvent = (eventName, payload) => {
      if (res.writableEnded || res.destroyed) return;
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    const cleanups = [];
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      this.activeStreams.delete(streamHandle);
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          // ignore
        }
      }
      if (!res.writableEnded) {
        try {
          res.end();
        } catch {
          // ignore
        }
      }
    };

    const streamHandle = { close: cleanup };
    this.activeStreams.add(streamHandle);
    req.on('close', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

    const keepalive = setInterval(() => {
      if (!res.writableEnded) res.write(': keepalive\n\n');
    }, 15_000);
    keepalive.unref();
    cleanups.push(() => clearInterval(keepalive));

    sendEvent('ready', {
      source,
      unit: targetUnit?.unit || targetFile?.id || unitId || 'all',
      ts: new Date().toISOString(),
    });

    const emitEntry = (entry) => {
      if (!entry) return;
      if ((entry.priority ?? 6) > maxPriority) return;
      const clean = redactLogEntry(entry);
      if (matcher && !matcher(clean)) return;
      sendEvent('log', clean);
    };

    if (this.config.demo && this.demoProvider) {
      const stopDemo = this.demoProvider.startDemoLogStream(emitEntry, {
        unit: unitId,
        targets: parseTargetList(rawTargets),
      });
      cleanups.push(stopDemo);
      return;
    }

    const attachSelfStream = () => {
      const onLog = (entry) => emitEntry({
        ...entry,
        unit: entry.unit || 'ops-console',
        serviceId: 'self',
        serviceName: 'Ops Console',
        sourceKind: 'self',
        sourceId: 'self',
        sourceLabel: 'Ops Console 结构化日志',
      });
      this.logger.on('log', onLog);
      cleanups.push(() => this.logger.off('log', onLog));
    };

    const attachFileTailPoller = (logFile) => {
      const linkedSvc = logFile.serviceId ? findService(this.config, logFile.serviceId) : null;
      const unitLabel = logFile.unit || linkedSvc?.unit || logFile.name;
      let offset = -1;
      let pendingLine = '';
      let polling = false;

      const poll = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const realTarget = await fs.realpath(logFile.path);
          const handle = await fs.open(realTarget, 'r');
          try {
            const stat = await handle.stat();
            if (offset < 0) {
              offset = stat.size;
              return;
            }
            if (stat.size < offset) {
              offset = Math.max(0, stat.size - MAX_STREAM_DELTA_BYTES);
              pendingLine = '';
            }
            const delta = stat.size - offset;
            if (delta <= 0) return;
            const readLen = Math.min(delta, MAX_STREAM_DELTA_BYTES);
            const readStart = stat.size - readLen;
            const buf = Buffer.allocUnsafe(readLen);
            const { bytesRead } = await handle.read(buf, 0, readLen, readStart);
            offset = readStart + bytesRead;
            const chunk = pendingLine + buf.subarray(0, bytesRead).toString('utf8');
            const linesArr = chunk.split('\n');
            pendingLine = linesArr.pop() || '';
            for (const line of linesArr) {
              const parsed = parseGenericLogLine(line, unitLabel);
              if (!parsed) continue;
              emitEntry({
                ...parsed,
                unit: parsed.unit || unitLabel,
                serviceId: linkedSvc?.id || logFile.serviceId || '',
                serviceName: linkedSvc?.name || logFile.name,
                sourceKind: 'file',
                sourceId: logFile.id,
                sourceLabel: logFile.name,
              });
            }
          } finally {
            await handle.close();
          }
        } catch {
          // ignore transient missing/rotated file
        } finally {
          polling = false;
        }
      };

      void poll();
      const timer = setInterval(() => void poll(), 2000);
      timer.unref();
      cleanups.push(() => clearInterval(timer));
    };

    const attachJournalStream = (scope, unitMap, closeOnExit = true) => {
      const units = [...unitMap.keys()];
      if (units.length === 0) return;
      const args = [];
      if (scope === 'user') args.push('--user');
      for (const unitName of units) args.push('-u', unitName);
      args.push('-f', '-n', '10', '--no-pager', '--output=json');
      if (maxPriority < 7) args.push('-p', `0..${maxPriority}`);

      const child = spawn('journalctl', args, {
        env: getUserEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let buf = '';
      child.stdout.on('data', (chunk) => {
        buf += chunk.toString('utf8');
        const linesArr = buf.split('\n');
        buf = linesArr.pop() || '';
        for (const line of linesArr) {
          const parsed = parseJournalJsonLine(line);
          if (!parsed) continue;
          const matchedSvc = unitMap.get(parsed.unit) || this.findServiceByUnit(parsed.unit);
          emitEntry({
            ...parsed,
            serviceId: matchedSvc?.id || '',
            serviceName: matchedSvc?.name || parsed.unit,
            sourceKind: 'journald',
            sourceId: matchedSvc?.unit || parsed.unit,
            sourceLabel: matchedSvc?.name || parsed.unit,
          });
        }
      });

      child.stderr.on('data', (chunk) => {
        const msg = chunk.toString('utf8').trim();
        if (msg) sendEvent('warning', { message: msg.slice(0, 300) });
      });

      child.on('error', (err) => {
        sendEvent('warning', { message: `journalctl stream unavailable: ${err.message}` });
        if (closeOnExit) cleanup();
      });

      child.on('exit', () => {
        if (closeOnExit) cleanup();
      });

      cleanups.push(() => {
        if (!child.killed) {
          child.kill('SIGTERM');
          const killTimer = setTimeout(() => {
            if (!child.killed) {
              try {
                child.kill('SIGKILL');
              } catch {
                // ignore
              }
            }
          }, 2000);
          killTimer.unref();
        }
      });
    };

    if (source === 'self') {
      attachSelfStream();
      return;
    }

    if (source === 'file' && targetFile) {
      attachFileTailPoller(targetFile);
      return;
    }

    if (source === 'unified' && unifiedPlan) {
      if (unifiedPlan.userUnits.size > 0) {
        attachJournalStream('user', unifiedPlan.userUnits, false);
      }
      if (unifiedPlan.systemUnits.size > 0) {
        attachJournalStream('system', unifiedPlan.systemUnits, false);
      }
      for (const fileItem of unifiedPlan.fileTargets.values()) {
        attachFileTailPoller(fileItem);
      }
      if (unifiedPlan.includeSelf) {
        attachSelfStream();
      }
      return;
    }

    const userMap = new Map();
    const sysMap = new Map();
    if (targetUnit) {
      if (targetUnit.scope === 'system') sysMap.set(targetUnit.unit, targetUnit);
      else userMap.set(targetUnit.unit, targetUnit);
    } else {
      for (const svc of this.config.services) {
        if (svc.scope === 'system') sysMap.set(svc.unit, svc);
        else userMap.set(svc.unit, svc);
      }
    }
    if (userMap.size > 0) {
      attachJournalStream('user', userMap, sysMap.size === 0);
    }
    if (sysMap.size > 0) {
      attachJournalStream('system', sysMap, userMap.size === 0);
    }
  }

  closeAllStreams() {
    for (const handle of [...this.activeStreams]) {
      handle.close();
    }
  }
}
