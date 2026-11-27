import fs from 'node:fs/promises';
import path from 'node:path';
import EventEmitter from 'node:events';
import { redactText } from './redact.mjs';

const LEVELS = {
  debug: { rank: 10, priority: 7 },
  info: { rank: 20, priority: 6 },
  warn: { rank: 30, priority: 4 },
  error: { rank: 40, priority: 3 },
};

async function rotateFileIfNeeded(filePath, maxBytes, maxFiles) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size < maxBytes) return;
    for (let i = maxFiles - 1; i >= 1; i -= 1) {
      const src = i === 1 ? filePath : `${filePath}.${i - 1}`;
      const dst = `${filePath}.${i}`;
      try {
        await fs.rename(src, dst);
      } catch {
        // ignore missing older rotations
      }
    }
  } catch {
    // file does not exist yet
  }
}

async function readTailChunk(filePath, maxBytes = 128 * 1024) {
  const fh = await fs.open(filePath, 'r');
  try {
    const stat = await fh.stat();
    const size = stat.size;
    const start = Math.max(0, size - maxBytes);
    const length = size - start;
    if (length <= 0) return '';
    const buf = Buffer.allocUnsafe(length);
    const { bytesRead } = await fh.read(buf, 0, length, start);
    let text = buf.subarray(0, bytesRead).toString('utf8');
    if (start > 0) {
      const firstNl = text.indexOf('\n');
      if (firstNl !== -1) text = text.slice(firstNl + 1);
    }
    return text;
  } finally {
    await fh.close();
  }
}

export class StructuredLogger extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.dataDir = opts.dataDir || '';
    this.appLogPath = this.dataDir ? path.join(this.dataDir, 'ops-console.jsonl') : '';
    this.auditLogPath = this.dataDir ? path.join(this.dataDir, 'audit.jsonl') : '';
    this.minLevel = LEVELS[opts.level || 'info'] ? (opts.level || 'info') : 'info';
    this.maxBytes = opts.maxBytes || 5 * 1024 * 1024;
    this.maxFiles = opts.maxFiles || 5;
    this.ringLimit = opts.ringLimit || 500;
    this.ring = [];
    this.silentStdout = Boolean(opts.silentStdout);
    this.writeQueue = Promise.resolve();
    this.dirReady = false;
    this.securedFiles = new Set();
    this.writeMeta = new Map();
  }

  setLevel(level, { maxBytes, maxFiles } = {}) {
    if (level && LEVELS[level]) {
      this.minLevel = level;
    }
    if (Number.isFinite(Number(maxBytes)) && Number(maxBytes) > 0) this.maxBytes = Number(maxBytes);
    if (Number.isFinite(Number(maxFiles)) && Number(maxFiles) > 0) this.maxFiles = Number(maxFiles);
  }

  _enqueueWrite(filePath, line) {
    if (!filePath) return Promise.resolve();
    this.writeQueue = this.writeQueue
      .then(async () => {
        if (!this.dirReady) {
          await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
          this.dirReady = true;
        }
        const payload = `${line}\n`;
        const payloadBytes = Buffer.byteLength(payload, 'utf8');
        let tracker = this.writeMeta.get(filePath);
        if (!tracker) {
          let initialSize = 0;
          try {
            initialSize = (await fs.stat(filePath)).size;
          } catch {
            initialSize = 0;
          }
          tracker = { count: 0, lastCheck: 0, approxBytes: initialSize };
        }
        const now = Date.now();
        const shouldCheck = tracker.approxBytes >= this.maxBytes
          || tracker.count % 64 === 0
          || now - tracker.lastCheck >= 30_000;
        if (shouldCheck) {
          await rotateFileIfNeeded(filePath, this.maxBytes, this.maxFiles);
          try {
            tracker.approxBytes = (await fs.stat(filePath)).size;
          } catch {
            tracker.approxBytes = 0;
          }
          tracker.lastCheck = now;
        }
        tracker.count += 1;
        tracker.approxBytes += payloadBytes;
        this.writeMeta.set(filePath, tracker);
        await fs.appendFile(filePath, payload, { encoding: 'utf8', mode: 0o600 });
        if (!this.securedFiles.has(filePath)) {
          await fs.chmod(filePath, 0o600).catch(() => {});
          this.securedFiles.add(filePath);
        }
      })
      .catch(() => {});
    return this.writeQueue;
  }

  log(level, msg, meta = {}) {
    const def = LEVELS[level] || LEVELS.info;
    const minDef = LEVELS[this.minLevel] || LEVELS.info;
    if (def.rank < minDef.rank) return null;

    const entry = {
      ts: new Date().toISOString(),
      level,
      priority: def.priority,
      unit: 'ops-console',
      message: redactText(String(msg)),
      ...meta,
    };
    if (typeof entry.error === 'string') entry.error = redactText(entry.error);
    if (typeof entry.output === 'string') entry.output = redactText(entry.output);

    this.ring.push(entry);
    if (this.ring.length > this.ringLimit) {
      this.ring.splice(0, this.ring.length - this.ringLimit);
    }
    this.emit('log', entry);

    const serialized = JSON.stringify(entry);
    if (!this.silentStdout) {
      const stream = level === 'error' ? process.stderr : process.stdout;
      stream.write(`${serialized}\n`);
    }
    if (this.appLogPath) {
      this._enqueueWrite(this.appLogPath, serialized);
    }
    return entry;
  }

  debug(msg, meta) { return this.log('debug', msg, meta); }
  info(msg, meta) { return this.log('info', msg, meta); }
  warn(msg, meta) { return this.log('warn', msg, meta); }
  error(msg, meta) { return this.log('error', msg, meta); }

  getRecent(limit = 150) {
    const n = Math.min(this.ringLimit, Math.max(1, Number(limit) || 150));
    return this.ring.slice(-n);
  }

  async appendAudit(entry) {
    const record = {
      ts: new Date().toISOString(),
      ...entry,
      output: entry?.output !== undefined ? redactText(String(entry.output)) : undefined,
    };
    const serialized = JSON.stringify(record);
    if (this.auditLogPath) {
      await this._enqueueWrite(this.auditLogPath, serialized);
    }
    this.info(`audit:${record.category || 'ops'}:${record.action || 'event'}`, {
      target: record.target,
      ok: record.ok,
      durationMs: record.durationMs,
      actor: record.actor,
    });
    return record;
  }

  async readAudit(limit = 80) {
    const n = Math.min(500, Math.max(1, Number(limit) || 80));
    if (!this.auditLogPath) return [];
    try {
      const raw = await readTailChunk(this.auditLogPath, 256 * 1024);
      const lines = raw.trim().split('\n').filter(Boolean);
      return lines
        .slice(-n)
        .reverse()
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { ts: '', category: 'parse_error', action: 'corrupt_line', output: line.slice(0, 200) };
          }
        });
    } catch {
      return [];
    }
  }

  async flush() {
    await this.writeQueue;
  }
}
