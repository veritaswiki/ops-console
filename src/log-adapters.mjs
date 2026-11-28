import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runCmd } from './exec.mjs';
import { redactLogEntry, redactText } from './redact.mjs';
import { validateHttpUrl } from './plugins/sdk.mjs';

export const VALID_ADAPTER_KINDS = new Set(['journald', 'file', 'docker', 'http-json', 'remote']);
export const DEFAULT_ADAPTER_MAX_BYTES = 128 * 1024;
export const MAX_ADAPTER_MAX_BYTES = 512 * 1024;
export const MAX_HTTP_JSON_BYTES = 256 * 1024;
export const DOCKER_CONTAINER_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

const EMBEDDED_EMAIL_RE = /\b[A-Za-z0-9._%+-]+@(?![A-Za-z0-9.-]*\.(?:service|socket|timer|target|mount|slice|scope)\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const RESTART_PATTERNS = [
  /\b(?:restarting|restarted|scheduled restart job|started .*service|stopped .*service|main process exited|oom[- ]?kill|killed with signal|exited with code [1-9])\b/i,
  /\b(?:sigterm|sigkill|sigsegv|crashloop|backoff)\b/i,
];

const HTTP_5XX_PATTERNS = [
  /\bHTTP\/[12](?:\.[01])?["']?\s+5\d{2}\b/i,
  /\b(?:status|code|statusCode|http_status)[=:\s"]+5\d{2}\b/i,
  /\b50[0234]\s+(?:internal server error|bad gateway|service unavailable|gateway timeout)\b/i,
];

const LEVEL_PRIORITY_MAP = {
  emerg: 0,
  alert: 1,
  crit: 2,
  err: 3,
  error: 3,
  warn: 4,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7,
};

export function scrubSensitiveText(value) {
  if (typeof value !== 'string') return '';
  return redactText(value).replace(EMBEDDED_EMAIL_RE, '[REDACTED_EMAIL]');
}

export function normalizeLevel(rawLevel, fallbackPriority = 6) {
  const lowered = String(rawLevel || '').trim().toLowerCase();
  if (lowered in LEVEL_PRIORITY_MAP) {
    const priority = LEVEL_PRIORITY_MAP[lowered];
    const level = priority <= 2 ? 'crit' : priority === 3 ? 'err' : priority === 4 ? 'warn' : priority === 5 ? 'notice' : priority === 6 ? 'info' : 'debug';
    return { level, priority };
  }
  const num = Number(rawLevel);
  if (Number.isInteger(num) && num >= 0 && num <= 7) {
    const level = num <= 2 ? 'crit' : num === 3 ? 'err' : num === 4 ? 'warn' : num === 5 ? 'notice' : num === 6 ? 'info' : 'debug';
    return { level, priority: num };
  }
  const p = Number.isInteger(fallbackPriority) ? Math.max(0, Math.min(7, fallbackPriority)) : 6;
  const level = p <= 2 ? 'crit' : p === 3 ? 'err' : p === 4 ? 'warn' : p === 5 ? 'notice' : p === 6 ? 'info' : 'debug';
  return { level, priority: p };
}

export function inferLogLevel(text = '') {
  const sample = String(text || '');
  if (/\b(?:panic|fatal|emerg|critical|crit|oom[- ]?kill)\b/i.test(sample)) return { level: 'crit', priority: 2 };
  if (/\b(?:error|err|exception|traceback|failed|failure|econnrefused|etimedout|50[0234])\b/i.test(sample)) return { level: 'err', priority: 3 };
  if (/\b(?:warn|warning|deprecated|retry|timeout|throttl|slow)\b/i.test(sample)) return { level: 'warn', priority: 4 };
  if (/\b(?:debug|trace)\b/i.test(sample)) return { level: 'debug', priority: 7 };
  return { level: 'info', priority: 6 };
}

export function isRestartMessage(message = '') {
  const text = String(message || '');
  return RESTART_PATTERNS.some((re) => re.test(text));
}

export function isHttp5xxMessage(message = '') {
  const text = String(message || '');
  return HTTP_5XX_PATTERNS.some((re) => re.test(text));
}

export function normalizeLogFingerprint(rawMessage) {
  const cleaned = scrubSensitiveText(String(rawMessage || ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  if (!cleaned) {
    return { fingerprint: 'fp-empty', template: '' };
  }

  const template = cleaned
    .replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/g, '<TS>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
    .replace(/\b0x[0-9a-f]{4,}\b/gi, '<HEX>')
    .replace(/\b[0-9a-f]{16,}\b/gi, '<HASH>')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '<IP>')
    .replace(/\[(?:[0-9a-f:]+)\](?::\d+)?/gi, '<IP6>')
    .replace(/\b(?:pid|req|request|session|trace|span|port|line|offset|id|fd)[=:\s#]+[\w.-]+/gi, (match) => {
      const idx = match.search(/[=:\s#]/);
      return idx > 0 ? `${match.slice(0, idx)}=<ID>` : '<ID>';
    })
    .replace(/\/(?:[\w.-]+\/){2,}[\w.-]+/g, '<PATH>')
    .replace(/\b\d+(?:\.\d+)?(?:ms|us|ns|s|kb|mb|gb|bytes|b|%)\b/gi, '<NUM>')
    .replace(/\b\d{2,}\b/g, '<N>')
    .slice(0, 220);

  const hash = crypto.createHash('sha256').update(template).digest('hex').slice(0, 16);
  return {
    fingerprint: `fp-${hash}`,
    template,
  };
}

export function validateDockerContainerName(rawName) {
  const name = String(rawName || '').trim();
  if (!name || !DOCKER_CONTAINER_RE.test(name)) {
    return { ok: false, error: `Invalid docker container name: ${rawName}` };
  }
  return { ok: true, value: name };
}

function isPrivateOrLoopbackHost(hostname) {
  const host = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
  const parts = host.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => n < 0 || n > 255)) return true;
    const [a, b] = nums;
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

export function validateHttpJsonLogUrl(rawUrl, options = {}) {
  const baseCheck = validateHttpUrl(rawUrl);
  if (!baseCheck.ok) return baseCheck;
  const allowPrivate = options.allowPrivate !== false;
  const allowlistedHosts = Array.isArray(options.allowlistedHosts)
    ? options.allowlistedHosts.map((h) => String(h || '').trim().toLowerCase()).filter(Boolean)
    : [];
  try {
    const parsed = new URL(baseCheck.value);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.username || parsed.password) {
      return { ok: false, error: 'HTTP-JSON log URL must not embed credentials in URL' };
    }
    if (!allowPrivate && isPrivateOrLoopbackHost(hostname)) {
      return { ok: false, error: `Private or loopback HTTP-JSON log URL rejected: ${hostname}` };
    }
    if (allowlistedHosts.length > 0 && !allowlistedHosts.includes(hostname)) {
      return { ok: false, error: `HTTP-JSON log host not in allowlist: ${hostname}` };
    }
    return { ok: true, value: parsed.toString(), hostname };
  } catch {
    return { ok: false, error: 'Invalid HTTP-JSON log URL' };
  }
}

export function buildNormalizedEntry({
  ts,
  level,
  priority,
  unit,
  serviceId,
  nodeId = 'local',
  message,
  cursor = null,
  sourceKind,
  sourceId,
}) {
  const parsedTs = ts ? Date.parse(String(ts)) : NaN;
  const tsMs = Number.isFinite(parsedTs) ? parsedTs : Date.now();
  const isoTs = new Date(tsMs).toISOString();
  const safeMessage = scrubSensitiveText(String(message || '').trim()).slice(0, 2000);
  const resolvedLevel = level ? normalizeLevel(level, priority) : inferLogLevel(safeMessage);
  const { fingerprint, template } = normalizeLogFingerprint(safeMessage);
  const cleanUnit = scrubSensitiveText(String(unit || serviceId || sourceId || 'unknown')).slice(0, 120);
  const cleanServiceId = scrubSensitiveText(String(serviceId || unit || sourceId || 'unknown')).slice(0, 120);
  const cleanNodeId = scrubSensitiveText(String(nodeId || 'local')).slice(0, 80);
  const cleanSourceId = scrubSensitiveText(String(sourceId || cleanServiceId)).slice(0, 160);
  const cleanCursor = cursor !== undefined && cursor !== null && String(cursor).trim()
    ? String(cursor).trim().slice(0, 320)
    : null;

  const redacted = redactLogEntry({
    ts: isoTs,
    level: resolvedLevel.level,
    priority: resolvedLevel.priority,
    unit: cleanUnit,
    message: safeMessage,
    source: sourceKind,
    target: cleanSourceId,
  });

  return {
    ...redacted,
    ts: isoTs,
    tsMs,
    serviceId: cleanServiceId,
    nodeId: cleanNodeId,
    cursor: cleanCursor,
    fingerprint,
    template,
    isRestart: isRestartMessage(redacted.message),
    isHttp5xx: isHttp5xxMessage(redacted.message),
    sourceRef: {
      sourceKind,
      sourceId: cleanSourceId,
      nodeId: cleanNodeId,
      ts: isoTs,
      cursor: cleanCursor,
    },
  };
}

function parseGenericLine(rawLine, fallbackTsIso) {
  const trimmed = String(rawLine || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') {
        const message = obj.message || obj.msg || obj.error || obj.text || JSON.stringify(obj);
        const ts = obj.ts || obj.timestamp || obj.time || obj.when || fallbackTsIso;
        const level = obj.level || obj.severity || obj.lvl || null;
        return { ts, level, message: String(message) };
      }
    } catch {
      // fall through to plain text
    }
  }
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(.*)$/);
  if (isoMatch) {
    return { ts: isoMatch[1], level: null, message: isoMatch[2] };
  }
  return { ts: fallbackTsIso, level: null, message: trimmed };
}

export async function scanJournaldAdapter({
  unit,
  serviceId,
  user = false,
  nodeId = 'local',
  cursor = null,
  since = '15m',
  limit = 200,
  runCmdFn = runCmd,
} = {}) {
  const safeUnit = String(unit || '').trim();
  if (!safeUnit || !/^[a-zA-Z0-9@_.:-]+$/.test(safeUnit)) {
    return { ok: false, error: `Invalid systemd unit: ${unit}`, entries: [], nextCursor: cursor };
  }
  const maxLines = Math.max(10, Math.min(500, Number(limit) || 200));
  const args = [];
  if (user) args.push('--user');
  args.push('-u', safeUnit, '-n', String(maxLines), '--no-pager', '--output=json');
  if (cursor && typeof cursor === 'string' && !cursor.startsWith('-')) {
    args.push('--after-cursor', cursor);
  } else {
    const safeSince = /^-\d+[smhd]$/.test(String(since || ''))
      ? String(since)
      : (/^\d+[smhd]$/.test(String(since || '')) ? `-${since}` : '-15m');
    args.push('--since', safeSince);
  }

  const res = await runCmdFn('journalctl', args, { timeout: 4000, maxBuffer: 2 * 1024 * 1024 });
  if (!res.ok) {
    return {
      ok: false,
      error: scrubSensitiveText(res.stderr || res.error || 'journalctl query failed'),
      entries: [],
      nextCursor: cursor,
      bytesRead: 0,
    };
  }

  const entries = [];
  let nextCursor = cursor || null;
  const rawLines = String(res.stdout || '').split(/\r?\n/);
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      const rawMsg = Array.isArray(obj.MESSAGE)
        ? Buffer.from(obj.MESSAGE).toString('utf8')
        : String(obj.MESSAGE ?? '');
      const usec = Number(obj.__REALTIME_TIMESTAMP);
      const ts = Number.isFinite(usec) && usec > 0 ? new Date(Math.floor(usec / 1000)).toISOString() : new Date().toISOString();
      const prio = Number.isInteger(Number(obj.PRIORITY)) ? Number(obj.PRIORITY) : 6;
      const entryCursor = obj.__CURSOR ? String(obj.__CURSOR) : null;
      if (entryCursor) nextCursor = entryCursor;
      entries.push(buildNormalizedEntry({
        ts,
        priority: prio,
        unit: obj._SYSTEMD_UNIT || obj.SYSLOG_IDENTIFIER || safeUnit,
        serviceId: serviceId || safeUnit,
        nodeId,
        message: rawMsg,
        cursor: entryCursor,
        sourceKind: 'journald',
        sourceId: safeUnit,
      }));
    } catch {
      // skip malformed JSON lines
    }
  }

  return {
    ok: true,
    entries,
    nextCursor,
    bytesRead: Buffer.byteLength(res.stdout || '', 'utf8'),
  };
}

export function parseFileCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') return { inode: null, offset: null };
  const [inoRaw, offsetRaw] = cursor.split(':');
  const offset = Number(offsetRaw);
  if (!inoRaw || !Number.isFinite(offset) || offset < 0) return { inode: null, offset: null };
  return { inode: inoRaw, offset: Math.floor(offset) };
}

export async function scanFileAdapter({
  id,
  name,
  filePath,
  serviceId,
  nodeId = 'local',
  cursor = null,
  maxBytes = DEFAULT_ADAPTER_MAX_BYTES,
  limit = 300,
} = {}) {
  const resolvedInput = String(filePath || '').trim();
  if (!resolvedInput) {
    return { ok: false, error: 'Missing file path', entries: [], nextCursor: cursor, bytesRead: 0 };
  }
  const boundBytes = Math.max(8 * 1024, Math.min(MAX_ADAPTER_MAX_BYTES, Number(maxBytes) || DEFAULT_ADAPTER_MAX_BYTES));
  const maxLines = Math.max(10, Math.min(500, Number(limit) || 300));
  let realPath;
  try {
    realPath = await fs.realpath(path.resolve(resolvedInput));
  } catch (err) {
    return { ok: false, error: err.code === 'ENOENT' ? 'Log file not found' : String(err.message || err), entries: [], nextCursor: cursor, bytesRead: 0 };
  }

  let handle;
  try {
    handle = await fs.open(realPath, 'r');
    const stat = await handle.stat();
    if (!stat.isFile()) {
      return { ok: false, error: 'Log target is not a regular file', entries: [], nextCursor: cursor, bytesRead: 0 };
    }

    const inode = String(stat.ino);
    const parsedCursor = parseFileCursor(cursor);
    let rotated = false;
    let startOffset = 0;

    if (parsedCursor.inode !== null && parsedCursor.offset !== null) {
      if (parsedCursor.inode !== inode || stat.size < parsedCursor.offset) {
        rotated = true;
        startOffset = Math.max(0, stat.size - boundBytes);
      } else {
        startOffset = parsedCursor.offset;
      }
    } else {
      startOffset = Math.max(0, stat.size - boundBytes);
    }

    const available = Math.max(0, stat.size - startOffset);
    if (available === 0) {
      return {
        ok: true,
        entries: [],
        nextCursor: `${inode}:${stat.size}`,
        rotated,
        truncated: false,
        bytesRead: 0,
      };
    }

    const readLen = Math.min(available, boundBytes);
    const truncated = available > boundBytes;
    const readPos = truncated ? stat.size - readLen : startOffset;
    const buf = Buffer.allocUnsafe(readLen);
    const { bytesRead } = await handle.read(buf, 0, readLen, readPos);
    const chunk = buf.subarray(0, bytesRead);

    const lastNewline = chunk.lastIndexOf(0x0a);
    let sliceBuf = chunk;
    let nextOffset = readPos + bytesRead;
    if (lastNewline >= 0 && lastNewline < bytesRead - 1) {
      sliceBuf = chunk.subarray(0, lastNewline);
      nextOffset = readPos + lastNewline + 1;
    }

    let text = sliceBuf.toString('utf8');
    if (readPos > 0 && (parsedCursor.inode === null || truncated)) {
      const firstNl = text.indexOf('\n');
      if (firstNl >= 0) text = text.slice(firstNl + 1);
    }

    const fallbackTs = new Date(stat.mtimeMs || Date.now()).toISOString();
    const rawLines = text.split(/\r?\n/).filter(Boolean);
    const boundedLines = rawLines.slice(-maxLines);
    const nextCursor = `${inode}:${nextOffset}`;
    const sourceId = id || name || path.basename(realPath);

    const entries = [];
    for (const line of boundedLines) {
      const parsed = parseGenericLine(line, fallbackTs);
      if (!parsed) continue;
      entries.push(buildNormalizedEntry({
        ts: parsed.ts,
        level: parsed.level,
        unit: name || sourceId,
        serviceId: serviceId || sourceId,
        nodeId,
        message: parsed.message,
        cursor: nextCursor,
        sourceKind: 'file',
        sourceId,
      }));
    }

    return {
      ok: true,
      entries,
      nextCursor,
      rotated,
      truncated,
      bytesRead,
    };
  } catch (err) {
    return { ok: false, error: scrubSensitiveText(String(err.message || err)), entries: [], nextCursor: cursor, bytesRead: 0 };
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

export async function scanDockerAdapter({
  id,
  name,
  container,
  serviceId,
  nodeId = 'local',
  cursor = null,
  since = '15m',
  limit = 200,
  runCmdFn = runCmd,
} = {}) {
  const check = validateDockerContainerName(container);
  if (!check.ok) {
    return { ok: false, error: check.error, entries: [], nextCursor: cursor, bytesRead: 0 };
  }
  const maxLines = Math.max(10, Math.min(500, Number(limit) || 200));
  const args = ['logs', '--timestamps', '--tail', String(maxLines)];
  if (cursor && /^\d{4}-\d{2}-\d{2}T/.test(String(cursor))) {
    args.push('--since', String(cursor));
  } else if (since && /^\d+[smhd]$/.test(String(since))) {
    args.push('--since', String(since));
  } else {
    args.push('--since', '15m');
  }
  args.push(check.value);

  const res = await runCmdFn('docker', args, { timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
  if (!res.ok) {
    return {
      ok: false,
      error: scrubSensitiveText(res.stderr || res.error || 'docker logs failed'),
      entries: [],
      nextCursor: cursor,
      bytesRead: 0,
    };
  }

  const combined = [res.stdout || '', res.stderr || ''].filter(Boolean).join('\n');
  const rawLines = combined.split(/\r?\n/).filter(Boolean).slice(-maxLines);
  const cursorMs = cursor ? Date.parse(String(cursor)) : NaN;
  let maxTsMs = Number.isFinite(cursorMs) ? cursorMs : 0;
  let nextCursor = cursor || null;
  const sourceId = id || check.value;
  const entries = [];

  for (const line of rawLines) {
    const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))\s+(.*)$/);
    const rawTs = tsMatch ? tsMatch[1] : new Date().toISOString();
    const rawMsg = tsMatch ? tsMatch[2] : line;
    const tsMs = Date.parse(rawTs);
    if (Number.isFinite(cursorMs) && Number.isFinite(tsMs) && tsMs <= cursorMs) {
      continue;
    }
    if (Number.isFinite(tsMs) && tsMs > maxTsMs) {
      maxTsMs = tsMs;
      nextCursor = new Date(tsMs + 1).toISOString();
    }
    const parsed = parseGenericLine(rawMsg, rawTs);
    entries.push(buildNormalizedEntry({
      ts: parsed?.ts || rawTs,
      level: parsed?.level || null,
      unit: name || check.value,
      serviceId: serviceId || check.value,
      nodeId,
      message: parsed?.message || rawMsg,
      cursor: rawTs,
      sourceKind: 'docker',
      sourceId,
    }));
  }

  return {
    ok: true,
    entries,
    nextCursor,
    bytesRead: Buffer.byteLength(combined, 'utf8'),
  };
}

function resolveJsonPath(root, dotPath) {
  if (!dotPath) return root;
  const parts = String(dotPath).split('.').map((p) => p.trim()).filter(Boolean);
  let current = root;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

export async function scanHttpJsonAdapter({
  id,
  name,
  url,
  serviceId,
  nodeId = 'local',
  headers = {},
  allowPrivate = true,
  allowlistedHosts = [],
  jsonItemsPath = '',
  sinceParam = 'since',
  cursorField = '',
  cursor = null,
  limit = 200,
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
} = {}) {
  const urlCheck = validateHttpJsonLogUrl(url, { allowPrivate, allowlistedHosts });
  if (!urlCheck.ok) {
    return { ok: false, error: urlCheck.error, entries: [], nextCursor: cursor, bytesRead: 0 };
  }

  const reqUrl = new URL(urlCheck.value);
  if (cursor && sinceParam && /^[a-zA-Z0-9_.-]{1,40}$/.test(String(sinceParam))) {
    reqUrl.searchParams.set(String(sinceParam), String(cursor));
  }

  const safeHeaders = { Accept: 'application/json' };
  if (headers && typeof headers === 'object') {
    for (const [key, val] of Object.entries(headers)) {
      const k = String(key || '').trim();
      if (!k || !/^[a-zA-Z0-9-]+$/.test(k)) continue;
      if (val !== undefined && val !== null) safeHeaders[k] = String(val);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Math.min(15_000, Number(timeoutMs) || 5000)));
  try {
    const resp = await fetchImpl(reqUrl.toString(), {
      method: 'GET',
      headers: safeHeaders,
      redirect: 'error',
      signal: controller.signal,
    });
    if (!resp.ok) {
      return {
        ok: false,
        error: `HTTP-JSON log endpoint returned ${resp.status}`,
        entries: [],
        nextCursor: cursor,
        bytesRead: 0,
      };
    }

    const rawText = await resp.text();
    const boundedText = rawText.length > MAX_HTTP_JSON_BYTES ? rawText.slice(0, MAX_HTTP_JSON_BYTES) : rawText;
    let payload;
    try {
      payload = JSON.parse(boundedText);
    } catch {
      return { ok: false, error: 'HTTP-JSON log endpoint did not return valid JSON', entries: [], nextCursor: cursor, bytesRead: Buffer.byteLength(boundedText, 'utf8') };
    }

    let items = null;
    if (jsonItemsPath) {
      items = resolveJsonPath(payload, jsonItemsPath);
    } else if (Array.isArray(payload)) {
      items = payload;
    } else if (payload && typeof payload === 'object') {
      items = payload.messages || payload.entries || payload.logs || payload.items || payload.events || [];
    }

    if (!Array.isArray(items)) {
      return { ok: false, error: 'HTTP-JSON response did not contain an array of log items', entries: [], nextCursor: cursor, bytesRead: Buffer.byteLength(boundedText, 'utf8') };
    }

    const maxLines = Math.max(10, Math.min(500, Number(limit) || 200));
    const boundedItems = items.slice(-maxLines);
    const cursorMs = cursor ? Date.parse(String(cursor)) : NaN;
    let nextCursor = (cursorField && payload && typeof payload === 'object' && resolveJsonPath(payload, cursorField))
      ? String(resolveJsonPath(payload, cursorField))
      : cursor;

    const sourceId = id || name || reqUrl.hostname;
    const entries = [];
    for (const item of boundedItems) {
      if (typeof item === 'string') {
        const parsed = parseGenericLine(item, new Date().toISOString());
        if (!parsed) continue;
        entries.push(buildNormalizedEntry({
          ts: parsed.ts,
          level: parsed.level,
          unit: name || sourceId,
          serviceId: serviceId || sourceId,
          nodeId,
          message: parsed.message,
          cursor: nextCursor,
          sourceKind: 'http-json',
          sourceId,
        }));
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const itemTs = item.when || item.ts || item.timestamp || item.time || new Date().toISOString();
      const itemTsMs = Date.parse(String(itemTs));
      const itemCursor = item.cursor || item.id || item.seq || itemTs;
      if (!cursorField && Number.isFinite(cursorMs) && Number.isFinite(itemTsMs) && itemTsMs <= cursorMs) {
        continue;
      }
      if (!cursorField && itemCursor) {
        nextCursor = String(itemCursor);
      }
      const message = item.message || item.msg || item.text || item.error || JSON.stringify(item);
      entries.push(buildNormalizedEntry({
        ts: itemTs,
        level: item.level || item.severity || null,
        priority: item.priority,
        unit: item.unit || item.service || name || sourceId,
        serviceId: serviceId || item.service || sourceId,
        nodeId,
        message: String(message),
        cursor: itemCursor ? String(itemCursor) : null,
        sourceKind: 'http-json',
        sourceId,
      }));
    }

    return {
      ok: true,
      entries,
      nextCursor,
      bytesRead: Buffer.byteLength(boundedText, 'utf8'),
    };
  } catch (err) {
    return {
      ok: false,
      error: scrubSensitiveText(err?.name === 'AbortError' ? 'HTTP-JSON log fetch timed out' : String(err?.message || err)),
      entries: [],
      nextCursor: cursor,
      bytesRead: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function queryRemoteProbeLogs({
  rpcUrl,
  nodeId,
  sourceKind = 'journald',
  target = '',
  since = '15m',
  level = 'all',
  limit = 150,
  q = '',
  sharedSecret = '',
  token = '',
  timeoutMs = 6000,
  fetchImpl = globalThis.fetch,
} = {}) {
  const urlCheck = validateHttpUrl(rpcUrl);
  if (!urlCheck.ok || !urlCheck.value) {
    return { ok: false, error: `Invalid remote probe RPC URL: ${urlCheck.error || 'URL is required'}`, entries: [] };
  }

  const rpcBody = JSON.stringify({
    jsonrpc: '2.0',
    id: `logs-${Date.now()}`,
    method: 'logs/read',
    params: {
      sourceKind: String(sourceKind || 'journald'),
      target: String(target || ''),
      since: String(since || '15m'),
      level: String(level || 'all'),
      limit: Math.max(10, Math.min(300, Number(limit) || 150)),
      q: String(q || '').slice(0, 120),
    },
  });

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (sharedSecret) {
    const tsSec = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac('sha256', sharedSecret).update(`${tsSec}.${rpcBody}`).digest('hex');
    headers['X-A2A-Timestamp'] = tsSec;
    headers['X-A2A-Signature'] = `sha256=${sig}`;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, Math.min(15_000, Number(timeoutMs) || 6000)));
  try {
    const resp = await fetchImpl(urlCheck.value, {
      method: 'POST',
      headers,
      body: rpcBody,
      redirect: 'error',
      signal: controller.signal,
    });
    if (!resp.ok) {
      return { ok: false, error: `Remote probe returned HTTP ${resp.status}`, entries: [] };
    }
    const payload = await resp.json();
    if (payload?.error) {
      return { ok: false, error: scrubSensitiveText(payload.error.message || 'Remote probe logs/read error'), entries: [] };
    }
    const rawEntries = Array.isArray(payload?.result?.entries) ? payload.result.entries : [];
    const entries = rawEntries.slice(-300).map((item) => buildNormalizedEntry({
      ts: item.ts,
      level: item.level,
      priority: item.priority,
      unit: item.unit || target || nodeId,
      serviceId: item.serviceId || item.unit || target || 'remote',
      nodeId: nodeId || 'remote',
      message: item.message,
      cursor: item.cursor || null,
      sourceKind: 'remote',
      sourceId: `${nodeId}:${item.sourceId || target || item.unit || 'journald'}`,
    }));

    return {
      ok: true,
      entries,
      nodeId,
      sources: Array.isArray(payload?.result?.sources) ? payload.result.sources : [],
      truncated: Boolean(payload?.result?.truncated),
    };
  } catch (err) {
    return {
      ok: false,
      error: scrubSensitiveText(err?.name === 'AbortError' ? 'Remote probe log read timed out' : String(err?.message || err)),
      entries: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

export function buildConfiguredAdapters(config = {}) {
  const adapters = [];
  const seenIds = new Set();

  const obsAdapters = Array.isArray(config.observability?.adapters) ? config.observability.adapters : [];
  for (const raw of obsAdapters) {
    if (!raw || typeof raw !== 'object' || !raw.id) continue;
    const id = String(raw.id).trim();
    const kind = String(raw.kind || '').trim().toLowerCase();
    if (!id || !VALID_ADAPTER_KINDS.has(kind) || seenIds.has(id)) continue;
    seenIds.add(id);
    adapters.push({
      id,
      name: String(raw.name || id),
      kind,
      enabled: raw.enabled !== false,
      serviceId: String(raw.serviceId || id),
      unit: raw.unit ? String(raw.unit) : undefined,
      user: Boolean(raw.user),
      path: raw.path ? String(raw.path) : undefined,
      container: raw.container ? String(raw.container) : undefined,
      url: raw.url ? String(raw.url) : undefined,
      headers: raw.headers && typeof raw.headers === 'object' ? { ...raw.headers } : undefined,
      allowPrivate: raw.allowPrivate !== false,
      jsonItemsPath: raw.jsonItemsPath ? String(raw.jsonItemsPath) : undefined,
      sinceParam: raw.sinceParam ? String(raw.sinceParam) : 'since',
      cursorField: raw.cursorField ? String(raw.cursorField) : undefined,
      origin: 'config',
    });
  }

  for (const svc of config.services || []) {
    if (svc.unit) {
      const id = `journald:${svc.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        adapters.push({
          id,
          name: `${svc.name || svc.id} (journald)`,
          kind: 'journald',
          enabled: true,
          serviceId: svc.id,
          unit: svc.unit,
          user: svc.scope === 'user',
          origin: 'service',
        });
      }
    }
    if (svc.logFile) {
      const id = `svc-file:${svc.id}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        adapters.push({
          id,
          name: `${svc.name || svc.id} (file)`,
          kind: 'file',
          enabled: true,
          serviceId: svc.id,
          path: svc.logFile,
          origin: 'service',
        });
      }
    }
  }

  for (const lf of config.logFiles || []) {
    if (!lf?.id || !lf?.path) continue;
    const id = `file:${lf.id}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      adapters.push({
        id,
        name: lf.name || lf.id,
        kind: 'file',
        enabled: true,
        serviceId: lf.serviceId || lf.id,
        path: lf.path,
        origin: 'logFiles',
      });
    }
  }

  return adapters;
}

export async function scanAdapter(adapter, { cursor = null, since = '15m', limit = 200, nodeId = 'local', runCmdFn = runCmd, fetchImpl = globalThis.fetch } = {}) {
  if (!adapter || !adapter.enabled) {
    return { ok: true, skipped: true, entries: [], nextCursor: cursor, bytesRead: 0 };
  }
  switch (adapter.kind) {
    case 'journald':
      return scanJournaldAdapter({
        unit: adapter.unit,
        serviceId: adapter.serviceId,
        user: adapter.user,
        nodeId,
        cursor,
        since,
        limit,
        runCmdFn,
      });
    case 'file':
      return scanFileAdapter({
        id: adapter.id,
        name: adapter.name,
        filePath: adapter.path,
        serviceId: adapter.serviceId,
        nodeId,
        cursor,
        limit,
      });
    case 'docker':
      return scanDockerAdapter({
        id: adapter.id,
        name: adapter.name,
        container: adapter.container,
        serviceId: adapter.serviceId,
        nodeId,
        cursor,
        since,
        limit,
        runCmdFn,
      });
    case 'http-json': {
      let allowlistedHosts = [];
      if (adapter.url) {
        try {
          allowlistedHosts = [new URL(adapter.url).hostname.toLowerCase()];
        } catch {
          allowlistedHosts = [];
        }
      }
      return scanHttpJsonAdapter({
        id: adapter.id,
        name: adapter.name,
        url: adapter.url,
        serviceId: adapter.serviceId,
        nodeId,
        headers: adapter.headers,
        allowPrivate: adapter.allowPrivate !== false,
        allowlistedHosts,
        jsonItemsPath: adapter.jsonItemsPath,
        sinceParam: adapter.sinceParam,
        cursorField: adapter.cursorField,
        cursor,
        limit,
        fetchImpl,
      });
    }
    default:
      return { ok: false, error: `Unsupported log adapter kind: ${adapter.kind}`, entries: [], nextCursor: cursor, bytesRead: 0 };
  }
}
