import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { findLogFile, findService, findTimer } from './config.mjs';
import { getUserEnv, runCmd } from './exec.mjs';

const SINCE_ALLOWLIST = new Map([
  ['15m', '-15m'],
  ['1h', '-1h'],
  ['6h', '-6h'],
  ['24h', '-24h'],
  ['7d', '-7d'],
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
    return (entry) => `${entry.unit} ${entry.message}`.toLowerCase().includes(needle);
  }
  if (trimmed.startsWith('/') && trimmed.endsWith('/') && trimmed.length > 2) {
    const body = trimmed.slice(1, -1);
    if (!/(\([^)]*[+*][^)]*\))[+*]/.test(body)) {
      try {
        const re = new RegExp(body, 'i');
        return (entry) => re.test(`${entry.unit} ${entry.message}`);
      } catch {
        // fall back to substring
      }
    }
  }
  const needle = trimmed.toLowerCase();
  return (entry) => `${entry.unit} ${entry.message}`.toLowerCase().includes(needle);
}

function summarizeCounts(entries) {
  const counts = { total: entries.length, error: 0, warn: 0, info: 0, debug: 0 };
  for (const e of entries) {
    if (counts[e.level] !== undefined) counts[e.level] += 1;
    else counts.info += 1;
  }
  return counts;
}

async function readFileTail(filePath, maxBytes = 512 * 1024) {
  const handle = await fs.open(filePath, 'r');
  try {
    const stat = await handle.stat();
    const size = stat.size;
    const start = Math.max(0, size - maxBytes);
    const len = size - start;
    if (len <= 0) return '';
    const buf = Buffer.allocUnsafe(len);
    await handle.read(buf, 0, len, start);
    let text = buf.toString('utf8');
    if (start > 0) {
      const firstNl = text.indexOf('\n');
      if (firstNl >= 0) text = text.slice(firstNl + 1);
    }
    return text;
  } finally {
    await handle.close();
  }
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
    const units = [
      ...this.config.services.map((s) => ({
        id: s.id,
        unit: s.unit,
        name: s.name,
        scope: s.scope,
        layer: s.layer,
      })),
      ...this.config.timers.map((t) => ({
        id: t.id,
        unit: t.unit,
        name: t.name,
        scope: t.scope,
        layer: 'timers',
      })),
    ];
    const files = this.config.logFiles.map((f) => ({ id: f.id, name: f.name, path: f.path }));
    return {
      units,
      files,
      builtin: [
        { id: 'self', name: 'Ops Console Structured Log' },
        { id: 'audit', name: 'Operations Audit Trail' },
      ],
      maxSseStreams: this.config.security.maxSseStreams,
      activeSseStreams: this.activeStreams.size,
    };
  }

  async query(params = {}) {
    const source = String(params.source || 'journald');
    const unitId = String(params.unit || '');
    const fileId = String(params.file || '');
    const level = String(params.level || 'all').toLowerCase();
    const since = String(params.since || '1h');
    const q = String(params.q || '');
    const lines = Math.min(500, Math.max(10, Number(params.lines) || 150));
    const maxPriority = LEVEL_TO_MAX_PRIORITY.get(level) ?? 7;
    const matcher = buildQueryMatcher(q);

    if (this.config.demo && this.demoProvider) {
      return this.demoProvider.queryLogs({ source, unit: unitId, file: fileId, level, since, q, lines });
    }

    if (source === 'self') {
      const rawEntries = this.logger.getRecent(500);
      let filtered = rawEntries.filter((e) => (e.priority ?? 6) <= maxPriority);
      if (matcher) filtered = filtered.filter(matcher);
      const sliced = filtered.slice(-lines);
      return {
        ok: true,
        source: 'self',
        label: 'ops-console',
        entries: sliced,
        counts: summarizeCounts(sliced),
        lines: sliced.map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.message}`).join('\n'),
      };
    }

    if (source === 'audit') {
      const records = await this.logger.readAudit(500);
      let entries = records.reverse().map((r) => ({
        ts: r.ts || '',
        unit: r.target || r.category || 'audit',
        priority: r.ok === false ? 3 : 6,
        level: r.ok === false ? 'error' : 'info',
        pid: '',
        message: `[${r.category || 'ops'}:${r.action || 'run'}] ${r.target || ''} (${r.ok ? 'OK' : 'FAIL'}, ${r.durationMs ?? 0}ms) ${r.output || ''}`.trim(),
        meta: r,
      }));
      entries = entries.filter((e) => e.priority <= maxPriority);
      if (matcher) entries = entries.filter(matcher);
      const sliced = entries.slice(-lines);
      return {
        ok: true,
        source: 'audit',
        label: 'audit.jsonl',
        entries: sliced,
        counts: summarizeCounts(sliced),
        lines: sliced.map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.message}`).join('\n'),
      };
    }

    if (source === 'file') {
      const logFile = findLogFile(this.config, fileId);
      if (!logFile) {
        return { ok: false, error: `Log file not in allowlist: ${fileId}` };
      }
      try {
        const realTarget = await fs.realpath(logFile.path);
        const raw = await readFileTail(realTarget);
        let entries = raw
          .split('\n')
          .map((line) => parseGenericLogLine(line, logFile.name))
          .filter(Boolean)
          .filter((e) => e.priority <= maxPriority);
        if (matcher) entries = entries.filter(matcher);
        const sliced = entries.slice(-lines);
        return {
          ok: true,
          source: 'file',
          label: logFile.name,
          path: logFile.path,
          entries: sliced,
          counts: summarizeCounts(sliced),
          lines: sliced.map((e) => `${e.ts ? e.ts + ' ' : ''}[${e.level.toUpperCase()}] ${e.message}`).join('\n'),
        };
      } catch (err) {
        return {
          ok: true,
          source: 'file',
          label: logFile.name,
          entries: [],
          counts: summarizeCounts([]),
          lines: '',
          warning: err.code === 'ENOENT' ? 'Log file does not exist yet' : err.message,
        };
      }
    }

    const sinceArg = SINCE_ALLOWLIST.get(since) || '-1h';
    const targetUnit = unitId && unitId !== 'all'
      ? (findService(this.config, unitId) || findTimer(this.config, unitId))
      : null;

    if (unitId && unitId !== 'all' && !targetUnit) {
      return { ok: false, error: `Unit not in allowlist: ${unitId}` };
    }

    const runJournal = async (scope, units, fetchLines) => {
      if (units.length === 0) return [];
      const args = [];
      if (scope === 'user') args.push('--user');
      for (const u of units) {
        args.push('-u', u);
      }
      args.push('--since', sinceArg, '-n', String(fetchLines), '--no-pager', '--output=json');
      if (maxPriority < 7) {
        args.push('-p', `0..${maxPriority}`);
      }
      try {
        const { stdout } = await runCmd('journalctl', args, { timeout: 6000, maxBuffer: 8 * 1024 * 1024 });
        return stdout
          .split('\n')
          .map(parseJournalJsonLine)
          .filter(Boolean);
      } catch {
        return [];
      }
    };

    let entries = [];
    const fetchLines = matcher ? Math.min(800, lines * 3) : lines;
    if (targetUnit) {
      entries = await runJournal(targetUnit.scope, [targetUnit.unit], fetchLines);
    } else {
      const userUnits = this.config.services.filter((s) => s.scope === 'user').map((s) => s.unit);
      const sysUnits = this.config.services.filter((s) => s.scope === 'system').map((s) => s.unit);
      const [userEntries, sysEntries] = await Promise.all([
        runJournal('user', userUnits, fetchLines),
        runJournal('system', sysUnits, fetchLines),
      ]);
      entries = [...userEntries, ...sysEntries].sort((a, b) => a.ts.localeCompare(b.ts));
    }

    if (matcher) entries = entries.filter(matcher);
    const sliced = entries.slice(-lines);

    return {
      ok: true,
      source: 'journald',
      unit: targetUnit ? targetUnit.unit : 'all',
      scope: targetUnit ? targetUnit.scope : 'mixed',
      label: targetUnit ? targetUnit.name : 'All Managed Units',
      entries: sliced,
      counts: summarizeCounts(sliced),
      lines: sliced.map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.unit}: ${e.message}`).join('\n'),
    };
  }

  formatExport(result, format = 'jsonl') {
    const entries = result.entries || [];
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
    const level = String(params.level || 'all').toLowerCase();
    const q = String(params.q || '');
    const maxPriority = LEVEL_TO_MAX_PRIORITY.get(level) ?? 7;
    const matcher = buildQueryMatcher(q);

    let targetUnit = null;
    if (source === 'journald' && !this.config.demo) {
      if (unitId && unitId !== 'all') {
        targetUnit = findService(this.config, unitId) || findTimer(this.config, unitId);
        if (!targetUnit) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: `Unit not in allowlist: ${unitId}` }));
          return;
        }
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

    sendEvent('ready', { source, unit: targetUnit?.unit || unitId || 'all', ts: new Date().toISOString() });

    const emitEntry = (entry) => {
      if (!entry) return;
      if ((entry.priority ?? 6) > maxPriority) return;
      if (matcher && !matcher(entry)) return;
      sendEvent('log', entry);
    };

    if (this.config.demo && this.demoProvider) {
      const stopDemo = this.demoProvider.startDemoLogStream(emitEntry, { unit: unitId });
      cleanups.push(stopDemo);
      return;
    }

    if (source === 'self') {
      const onLog = (entry) => emitEntry(entry);
      this.logger.on('log', onLog);
      cleanups.push(() => this.logger.off('log', onLog));
      return;
    }

    const args = [];
    if (targetUnit) {
      if (targetUnit.scope === 'user') args.push('--user');
      args.push('-u', targetUnit.unit);
    } else {
      const userUnits = this.config.services.filter((s) => s.scope === 'user').map((s) => s.unit);
      if (userUnits.length > 0) {
        args.push('--user');
        for (const u of userUnits) args.push('-u', u);
      }
    }
    args.push('-f', '-n', '15', '--no-pager', '--output=json');
    if (maxPriority < 7) args.push('-p', `0..${maxPriority}`);

    const child = spawn('journalctl', args, {
      env: getUserEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let buf = '';
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        emitEntry(parseJournalJsonLine(line));
      }
    });

    child.stderr.on('data', (chunk) => {
      const msg = chunk.toString('utf8').trim();
      if (msg) sendEvent('warning', { message: msg.slice(0, 300) });
    });

    child.on('error', (err) => {
      sendEvent('warning', { message: `journalctl stream unavailable: ${err.message}` });
      cleanup();
    });

    child.on('exit', () => {
      cleanup();
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
  }

  closeAllStreams() {
    for (const handle of [...this.activeStreams]) {
      handle.close();
    }
  }
}
