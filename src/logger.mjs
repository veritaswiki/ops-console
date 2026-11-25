import fs from 'node:fs/promises';
import path from 'node:path';
import EventEmitter from 'node:events';

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
  }

  _enqueueWrite(filePath, line) {
    if (!filePath) return Promise.resolve();
    this.writeQueue = this.writeQueue
      .then(async () => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await rotateFileIfNeeded(filePath, this.maxBytes, this.maxFiles);
        await fs.appendFile(filePath, `${line}\n`, 'utf8');
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
      message: String(msg),
      ...meta,
    };

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
      const raw = await fs.readFile(this.auditLogPath, 'utf8');
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
