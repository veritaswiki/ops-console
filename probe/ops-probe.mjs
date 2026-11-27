#!/usr/bin/env node
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROBE_VERSION = '0.4.0';
export const SCHEMA_VERSION = 1;

const DEFAULT_INTERVAL_SEC = 30;
const MIN_INTERVAL_SEC = 5;
const MAX_INTERVAL_SEC = 3600;
const HTTP_TIMEOUT_MS = 8000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const DEFAULT_CPU_SAMPLE_MS = 250;
const WATCH_SERVICE_RE = /^[A-Za-z0-9@._:-]{1,128}$/;
const DEVICE_TYPES = new Set(['hub', 'server', 'edge', 'laptop', 'mobile', 'auto']);
const A2A_PROTOCOL_VERSION = '0.3.0';
const DEFAULT_A2A_PORT = 9104;
const A2A_MAX_REPLAY_SKEW_SEC = 300;
const A2A_MAX_BODY_BYTES = 256 * 1024;
const A2A_MAX_STORED_TASKS = 128;
const LOCAL_CLI_CACHE_TTL_MS = 60_000;
const LOCAL_MODEL_CACHE_TTL_MS = 60_000;
const PROBE_EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PROBE_SECRET_RE = /(?:sk-|ghp_|gho_|github_pat_|xox[baprs]-|bearer\s+)[A-Za-z0-9._-]{8,}/gi;
let localModelCatalogCache = { expiresAt: 0, data: null };

const ALLOWLISTED_CLIS = [
  { id: 'codex', binary: 'codex', label: 'Codex CLI', harness: 'codex-cli', args: ['--version'] },
  { id: 'claude', binary: 'claude', label: 'Claude Code', harness: 'claude-code', args: ['--version'] },
  { id: 'pi', binary: 'pi', label: 'Pi Agent', harness: 'pi-agent', args: ['--version'] },
  { id: 'agy', binary: 'agy', label: 'AGY CLI', harness: 'agy-cli', args: ['--version'] },
  { id: 'opencode', binary: 'opencode', label: 'OpenCode', harness: 'opencode', args: ['--version'] },
  { id: 'dsh', binary: 'dsh', label: 'DSH Review CLI', harness: 'dsh-expert', args: ['--version'] },
];

const TAILSCALE_BINARIES = [
  'tailscale',
  '/usr/bin/tailscale',
  '/opt/homebrew/bin/tailscale',
  '/usr/local/bin/tailscale',
  '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
];

const DEFAULT_AGENT_MATCHERS = [
  { category: 'orchestrator', pattern: /agent-orchestrator|langgraph|autogen|crewai/i },
  { category: 'mcp', pattern: /mcp-server|modelcontextprotocol|fastmcp/i },
  { category: 'gateway', pattern: /litellm|ollama|vllm|(^|\/)magpie(\s|$)|magpie-.*bridge/i },
  { category: 'memory', pattern: /nmem-server|openviking|qdrant|milvus|rerank|embedding/i },
  { category: 'agent-runtime', pattern: /(^|\/)codex(\s|$)|(^|\/)claude(\s|$)|aider|opencode|goose/i },
];

function roundDecimal(value, digits = 1) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sleep(delayMs, signal = null) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, Math.max(0, delayMs));

    function onAbort() {
      clearTimeout(timer);
      resolve(false);
    }

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

// Uses execFile exclusively (no shell interpolation) to prevent command injection.
function runExecFile(command, args = [], options = {}) {
  const timeout = options.timeout ?? 3000;
  const maxBuffer = options.maxBuffer ?? 1024 * 1024;
  const execOpts = { timeout, maxBuffer, windowsHide: true };
  if (options.cwd) execOpts.cwd = options.cwd;
  if (options.env) execOpts.env = options.env;
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      execOpts,
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          code: error ? (typeof error.code === 'number' ? error.code : null) : 0,
          errorCode: error && typeof error.code === 'string' ? error.code : null,
          killed: Boolean(error?.killed),
        });
      },
    );
  });
}

export function validateWatchServiceName(name) {
  return typeof name === 'string' && WATCH_SERVICE_RE.test(name) && !name.startsWith('-');
}

export function parseProcMeminfo(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) return null;
  const valuesKb = new Map();
  for (const line of rawText.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_()]+):\s+(\d+)\s+kB/);
    if (match) {
      valuesKb.set(match[1], Number(match[2]));
    }
  }

  const totalKb = valuesKb.get('MemTotal');
  if (!Number.isFinite(totalKb) || totalKb <= 0) return null;

  let availableKb = valuesKb.get('MemAvailable');
  if (!Number.isFinite(availableKb)) {
    const fallbackKb = (valuesKb.get('MemFree') || 0)
      + (valuesKb.get('Buffers') || 0)
      + (valuesKb.get('Cached') || 0)
      + (valuesKb.get('SReclaimable') || 0)
      - (valuesKb.get('Shmem') || 0);
    availableKb = Math.max(0, Math.min(totalKb, fallbackKb));
  }

  const totalBytes = totalKb * 1024;
  const availableBytes = Math.max(0, Math.min(totalBytes, availableKb * 1024));
  const usedBytes = Math.max(0, totalBytes - availableBytes);
  const usedPct = roundDecimal((usedBytes / totalBytes) * 100, 1);
  return { totalBytes, usedBytes, availableBytes, usedPct };
}

export function parseVmStat(rawText, totalBytesInput = null) {
  if (typeof rawText !== 'string' || !rawText.trim()) return null;

  const pageSizeMatch = rawText.match(/page size of (\d+) bytes/i);
  const pageSize = pageSizeMatch ? Number(pageSizeMatch[1]) : 4096;
  if (!Number.isFinite(pageSize) || pageSize <= 0) return null;

  const activeMatch = rawText.match(/^Pages active:\s*(\d+)/m);
  const wiredMatch = rawText.match(/^Pages wired down:\s*(\d+)/m);
  const compressorMatch = rawText.match(/^Pages occupied by compressor:\s*(\d+)/m);
  if (!activeMatch && !wiredMatch && !compressorMatch) return null;

  const activePages = activeMatch ? Number(activeMatch[1]) : 0;
  const wiredPages = wiredMatch ? Number(wiredMatch[1]) : 0;
  const compressorPages = compressorMatch ? Number(compressorMatch[1]) : 0;

  const totalBytes = Number.isFinite(totalBytesInput) && totalBytesInput > 0
    ? Number(totalBytesInput)
    : os.totalmem();
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) return null;

  const rawUsedBytes = (activePages + wiredPages + compressorPages) * pageSize;
  const usedBytes = Math.max(0, Math.min(totalBytes, rawUsedBytes));
  const availableBytes = Math.max(0, totalBytes - usedBytes);
  const usedPct = roundDecimal((usedBytes / totalBytes) * 100, 1);
  return { totalBytes, usedBytes, availableBytes, usedPct };
}

export function parsePmsetBattery(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) return null;

  const sourceMatch = rawText.match(/Now drawing from '([^']+)'/i);
  const lines = rawText.split('\n');
  let batteryLine = lines.find((line) => /InternalBattery/i.test(line));
  if (!batteryLine) {
    batteryLine = lines.find((line) => /\b\d{1,3}%;/.test(line));
  }
  if (!batteryLine) return null;

  const percentMatch = batteryLine.match(/\b(\d{1,3})%;(.*)$/);
  if (!percentMatch) return null;

  const percent = Math.max(0, Math.min(100, Number(percentMatch[1])));
  const statusText = percentMatch[2] || '';
  let charging = false;
  if (/\b(?:not charging|discharging|charged)\b/i.test(statusText)) {
    charging = false;
  } else if (/\b(?:charging|finishing charge)\b/i.test(statusText)) {
    charging = true;
  }

  const source = sourceMatch
    ? sourceMatch[1].trim()
    : (charging ? 'AC Power' : 'Battery Power');

  return { percent, charging, source };
}

export function parseDfOutput(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) return [];

  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0];
  let blockSize = 1024;
  if (/\b1B-blocks\b|\b1-blocks\b/i.test(header)) {
    blockSize = 1;
  } else if (/\b512-blocks\b/i.test(header)) {
    blockSize = 512;
  }

  const targetFirst = /^Mounted on\b/i.test(header);
  const hasInodeColumns = /\biused\b/i.test(header);
  const seenMounts = new Set();
  const disks = [];

  for (const row of lines.slice(1)) {
    let mount = '';
    let totalBlocks = NaN;
    let usedBlocks = NaN;
    let reportedPct = NaN;

    if (targetFirst) {
      const match = row.match(/^(.+?)\s+(\d+)\s+(\d+)(?:\s+\d+)?\s+(\d+(?:\.\d+)?)%$/);
      if (!match) continue;
      mount = match[1].trim();
      totalBlocks = Number(match[2]);
      usedBlocks = Number(match[3]);
      reportedPct = Number(match[4]);
    } else {
      const rowPattern = hasInodeColumns
        ? /\s+(\d+)\s+(\d+)\s+\d+\s+(\d+(?:\.\d+)?)%\s+\d+\s+\d+\s+\S+\s+(\/.*)$/
        : /\s+(\d+)\s+(\d+)\s+\d+\s+(\d+(?:\.\d+)?)%\s+(\/.*)$/;
      const match = row.match(rowPattern);
      if (!match) continue;
      totalBlocks = Number(match[1]);
      usedBlocks = Number(match[2]);
      reportedPct = Number(match[3]);
      mount = match[4].trim();
    }

    if (!mount || seenMounts.has(mount)) continue;
    if (!Number.isFinite(totalBlocks) || totalBlocks <= 0 || !Number.isFinite(usedBlocks)) continue;

    const totalBytes = totalBlocks * blockSize;
    const usedBytes = Math.max(0, usedBlocks * blockSize);
    const usedPct = totalBytes > 0
      ? roundDecimal((usedBytes / totalBytes) * 100, 1)
      : (Number.isFinite(reportedPct) ? roundDecimal(reportedPct, 1) : 0);

    seenMounts.add(mount);
    disks.push({ mount, totalBytes, usedBytes, usedPct });
  }

  return disks;
}

export function parseProcNetDev(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) return null;

  let rxBytes = 0;
  let txBytes = 0;
  let foundAny = false;

  for (const line of rawText.split('\n').slice(2)) {
    const colonIndex = line.indexOf(':');
    if (colonIndex <= 0) continue;

    const ifaceName = line.slice(0, colonIndex).trim();
    if (!ifaceName || ifaceName === 'lo') continue;

    const columns = line.slice(colonIndex + 1).trim().split(/\s+/);
    if (columns.length < 9) continue;

    const ifaceRx = Number(columns[0]);
    const ifaceTx = Number(columns[8]);
    if (!Number.isFinite(ifaceRx) || !Number.isFinite(ifaceTx)) continue;

    rxBytes += ifaceRx;
    txBytes += ifaceTx;
    foundAny = true;
  }

  return foundAny ? { rxBytes, txBytes } : null;
}

export function parseNetstatIbn(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) return null;

  let rxBytes = 0;
  let txBytes = 0;
  let foundAny = false;
  const seenInterfaces = new Set();

  for (const line of rawText.split('\n').slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const columns = trimmed.split(/\s+/);
    if (columns.length < 10) continue;

    const ifaceName = columns[0];
    const networkCol = columns[2];
    if (!networkCol.startsWith('<Link#')) continue;
    if (ifaceName === 'lo0' || ifaceName === 'lo' || seenInterfaces.has(ifaceName)) continue;

    const rxToken = columns[columns.length - 5];
    const txToken = columns[columns.length - 2];
    if (!/^\d+$/.test(rxToken) || !/^\d+$/.test(txToken)) continue;

    seenInterfaces.add(ifaceName);
    rxBytes += Number(rxToken);
    txBytes += Number(txToken);
    foundAny = true;
  }

  return foundAny ? { rxBytes, txBytes } : null;
}

export function parseTailscaleStatus(rawText) {
  const parsed = JSON.parse(rawText);
  const selfNode = parsed?.Self || null;
  const backendState = typeof parsed?.BackendState === 'string' ? parsed.BackendState : '';
  const ips = Array.isArray(selfNode?.TailscaleIPs) ? selfNode.TailscaleIPs : [];
  const ipv4 = ips.find((entry) => typeof entry === 'string' && entry.includes('.'));
  const ip = ipv4 || (typeof ips[0] === 'string' ? ips[0] : null);
  const rawDnsName = typeof selfNode?.DNSName === 'string' ? selfNode.DNSName.replace(/\.$/, '') : '';
  const peers = parsed?.Peer && typeof parsed.Peer === 'object' ? Object.values(parsed.Peer) : [];
  const peersOnline = peers.filter((peer) => Boolean(peer?.Online)).length;
  const online = Boolean(selfNode?.Online && (!backendState || backendState === 'Running'));

  return {
    available: true,
    online,
    ip,
    dnsName: rawDnsName || null,
    relay: typeof selfNode?.Relay === 'string' && selfNode.Relay ? selfNode.Relay : null,
    peersOnline,
  };
}

export function snapshotCpuTimes(cpuList = os.cpus()) {
  let total = 0;
  let idle = 0;
  for (const cpu of cpuList) {
    const times = cpu?.times;
    if (!times) continue;
    idle += times.idle || 0;
    total += (times.user || 0)
      + (times.nice || 0)
      + (times.sys || 0)
      + (times.idle || 0)
      + (times.irq || 0);
  }
  return { total, idle };
}

export function computeCpuUsagePct(previousTimes, currentTimes) {
  if (!previousTimes || !currentTimes) return 0;
  const deltaTotal = currentTimes.total - previousTimes.total;
  const deltaIdle = currentTimes.idle - previousTimes.idle;
  if (!Number.isFinite(deltaTotal) || deltaTotal <= 0) return 0;
  const busyRatio = Math.max(0, Math.min(1, (deltaTotal - deltaIdle) / deltaTotal));
  return roundDecimal(busyRatio * 100, 1);
}

async function collectMemory() {
  if (process.platform === 'darwin') {
    const [memsizeRes, vmStatRes] = await Promise.all([
      runExecFile('sysctl', ['-n', 'hw.memsize'], { timeout: 2000 }),
      runExecFile('vm_stat', [], { timeout: 2000 }),
    ]);
    if (vmStatRes.ok) {
      const totalFromSysctl = memsizeRes.ok ? Number(memsizeRes.stdout.trim()) : null;
      const parsed = parseVmStat(vmStatRes.stdout, totalFromSysctl);
      if (parsed) return parsed;
    }
  } else if (process.platform === 'linux') {
    try {
      const rawMeminfo = await fs.readFile('/proc/meminfo', 'utf8');
      const parsed = parseProcMeminfo(rawMeminfo);
      if (parsed) return parsed;
    } catch {
      // Fallback below
    }
  }

  const totalBytes = os.totalmem();
  const availableBytes = Math.max(0, Math.min(totalBytes, os.freemem()));
  const usedBytes = Math.max(0, totalBytes - availableBytes);
  const usedPct = totalBytes > 0 ? roundDecimal((usedBytes / totalBytes) * 100, 1) : 0;
  return { totalBytes, usedBytes, availableBytes, usedPct };
}

async function collectDisks(mounts) {
  const safeMounts = (Array.isArray(mounts) && mounts.length > 0 ? mounts : ['/'])
    .filter((mount) => typeof mount === 'string' && mount.startsWith('/') && !mount.includes('\0'));
  const targetMounts = safeMounts.length > 0 ? safeMounts : ['/'];

  async function queryDf(mountArgs) {
    if (process.platform === 'linux') {
      const exactResult = await runExecFile('df', ['-B1', '-P', ...mountArgs], { timeout: 2500 });
      if (exactResult.ok) {
        const parsed = parseDfOutput(exactResult.stdout);
        if (parsed.length > 0) return parsed;
      }
    }
    const posixResult = await runExecFile('df', ['-k', '-P', ...mountArgs], { timeout: 2500 });
    if (posixResult.ok) {
      return parseDfOutput(posixResult.stdout);
    }
    return [];
  }

  const batchDisks = await queryDf(targetMounts);
  if (batchDisks.length > 0 || targetMounts.length === 1) {
    return batchDisks;
  }

  const perMountResults = await Promise.all(targetMounts.map((mount) => queryDf([mount])));
  const seenMounts = new Set();
  const merged = [];
  for (const list of perMountResults) {
    for (const entry of list) {
      if (!seenMounts.has(entry.mount)) {
        seenMounts.add(entry.mount);
        merged.push(entry);
      }
    }
  }
  return merged;
}

async function collectNetworkCounters() {
  if (process.platform === 'linux') {
    try {
      const rawNetDev = await fs.readFile('/proc/net/dev', 'utf8');
      return parseProcNetDev(rawNetDev);
    } catch {
      return null;
    }
  }
  if (process.platform === 'darwin') {
    const netstatRes = await runExecFile('netstat', ['-ibn'], { timeout: 2500 });
    if (netstatRes.ok) {
      return parseNetstatIbn(netstatRes.stdout);
    }
  }
  return null;
}

async function collectLinuxBattery() {
  const powerSupplyRoot = '/sys/class/power_supply';
  let entries;
  try {
    entries = await fs.readdir(powerSupplyRoot);
  } catch {
    return null;
  }

  const batteryEntry = entries.find((name) => /^BAT\d*/i.test(name));
  if (!batteryEntry) return null;

  const batteryDir = path.join(powerSupplyRoot, batteryEntry);
  let capacityText;
  let statusText = '';
  try {
    capacityText = await fs.readFile(path.join(batteryDir, 'capacity'), 'utf8');
  } catch {
    return null;
  }
  try {
    statusText = (await fs.readFile(path.join(batteryDir, 'status'), 'utf8')).trim();
  } catch {
    statusText = '';
  }

  const percent = Math.max(0, Math.min(100, Number(capacityText.trim())));
  if (!Number.isFinite(percent)) return null;

  const normalizedStatus = statusText.toLowerCase();
  const charging = normalizedStatus === 'charging';

  let acOnline = null;
  const acEntry = entries.find((name) => /^(AC|ACAD|ADP|Mains)/i.test(name));
  if (acEntry) {
    try {
      const onlineRaw = (await fs.readFile(path.join(powerSupplyRoot, acEntry, 'online'), 'utf8')).trim();
      acOnline = onlineRaw === '1';
    } catch {
      acOnline = null;
    }
  }

  let source = 'Battery Power';
  if (acOnline === true || charging || normalizedStatus === 'full' || normalizedStatus === 'not charging') {
    source = 'AC Power';
  }

  return { percent, charging, source };
}

async function collectBattery() {
  if (process.platform === 'darwin') {
    const pmsetRes = await runExecFile('pmset', ['-g', 'batt'], { timeout: 2000 });
    return pmsetRes.ok ? parsePmsetBattery(pmsetRes.stdout) : null;
  }
  if (process.platform === 'linux') {
    return collectLinuxBattery();
  }
  return null;
}

async function collectTailscale() {
  const unavailable = {
    available: false,
    online: false,
    ip: null,
    dnsName: null,
    relay: null,
    peersOnline: 0,
  };

  for (const binaryPath of TAILSCALE_BINARIES) {
    if (path.isAbsolute(binaryPath)) {
      try {
        await fs.access(binaryPath, fsSync.constants.X_OK);
      } catch {
        continue;
      }
    }

    const result = await runExecFile(binaryPath, ['status', '--json'], { timeout: 3000 });
    if (result.errorCode === 'ENOENT') {
      continue;
    }
    if (result.stdout.trim()) {
      try {
        return parseTailscaleStatus(result.stdout);
      } catch {
        return { ...unavailable, available: true };
      }
    }
    return unavailable;
  }

  return unavailable;
}

function probeLocalTcpPort(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let settled = false;

    function finish(isReachable) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(isReachable);
    }

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function probeHubTcpRtt(hubUrl, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(hubUrl);
    } catch {
      resolve(null);
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      resolve(null);
      return;
    }

    const port = parsed.port
      ? Number(parsed.port)
      : (parsed.protocol === 'https:' ? 443 : 80);
    const startedAt = performance.now();
    const socket = net.createConnection({ host: parsed.hostname, port });
    let settled = false;

    function finish(rttMs) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(rttMs);
    }

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(Math.max(0, Math.round(performance.now() - startedAt))));
    socket.once('timeout', () => finish(null));
    socket.once('error', () => finish(null));
  });
}

function normalizeWatchServices(rawEntries) {
  if (!Array.isArray(rawEntries)) return [];
  const normalized = [];

  for (const entry of rawEntries) {
    if (typeof entry === 'string') {
      if (validateWatchServiceName(entry)) {
        normalized.push({ name: entry, scope: 'auto', port: null, launchd: false });
      }
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    if (!validateWatchServiceName(entry.name)) continue;

    const port = Number.isInteger(entry.port) && entry.port >= 1 && entry.port <= 65535
      ? entry.port
      : null;
    const scope = entry.scope === 'system' || entry.scope === 'user' ? entry.scope : 'auto';
    const launchd = Boolean(entry.launchd);
    normalized.push({ name: entry.name, scope, port, launchd });
  }

  return normalized;
}

async function checkSingleService(serviceSpec) {
  if (serviceSpec.port !== null) {
    const reachable = await probeLocalTcpPort(serviceSpec.port);
    return { name: serviceSpec.name, status: reachable ? 'active' : 'inactive' };
  }

  if (process.platform === 'linux') {
    const checkScope = async (scope) => {
      const args = scope === 'user'
        ? ['--user', 'is-active', serviceSpec.name]
        : ['is-active', serviceSpec.name];
      const res = await runExecFile('systemctl', args, { timeout: 2500 });
      const state = res.stdout.trim().split('\n')[0] || '';
      return { state, ok: res.ok };
    };

    if (serviceSpec.scope === 'system' || serviceSpec.scope === 'user') {
      const res = await checkScope(serviceSpec.scope);
      return { name: serviceSpec.name, status: res.state || 'unknown' };
    }

    const systemRes = await checkScope('system');
    if (systemRes.state === 'active' || systemRes.state === 'activating' || systemRes.state === 'reloading' || systemRes.state === 'failed') {
      return { name: serviceSpec.name, status: systemRes.state };
    }
    const userRes = await checkScope('user');
    if (userRes.state && userRes.state !== 'unknown') {
      return { name: serviceSpec.name, status: userRes.state };
    }
    return { name: serviceSpec.name, status: systemRes.state || 'unknown' };
  }

  if (process.platform === 'darwin') {
    const res = await runExecFile('launchctl', ['list', serviceSpec.name], { timeout: 2500 });
    if (!res.ok) {
      return { name: serviceSpec.name, status: 'inactive' };
    }
    if (/"PID"\s*=\s*\d+/.test(res.stdout)) {
      return { name: serviceSpec.name, status: 'active' };
    }
    if (/"LastExitStatus"\s*=\s*[1-9]\d*/.test(res.stdout)) {
      return { name: serviceSpec.name, status: 'failed' };
    }
    return { name: serviceSpec.name, status: 'inactive' };
  }

  return { name: serviceSpec.name, status: 'unknown' };
}

async function collectServices(watchServices) {
  const specs = normalizeWatchServices(watchServices);
  if (specs.length === 0) return [];
  return Promise.all(specs.map((spec) => checkSingleService(spec)));
}

async function collectAgents(enabled = true) {
  if (enabled === false) {
    return { count: 0, categories: {} };
  }

  // Inspects process list strictly in-memory to emit aggregate category counts only.
  const psRes = await runExecFile('ps', ['-eo', 'pid=,comm=,args='], {
    timeout: 2500,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (!psRes.ok || !psRes.stdout.trim()) {
    return { count: 0, categories: {} };
  }

  const categories = {};
  let count = 0;

  for (const line of psRes.stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(\S+)\s+(.*)$/);
    if (!match) continue;

    const pid = Number(match[1]);
    const comm = match[2];
    const args = match[3];
    if (pid === process.pid) continue;
    if (args.includes('ops-probe.mjs') || args.includes('ps -eo')) continue;

    for (const matcher of DEFAULT_AGENT_MATCHERS) {
      if (matcher.pattern.test(args) || matcher.pattern.test(comm)) {
        categories[matcher.category] = (categories[matcher.category] || 0) + 1;
        count += 1;
        break;
      }
    }
  }

  return { count, categories };
}

function parseOptionalBool(value) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

function isTailscaleIpv4(ip) {
  if (typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((segment) => Number(segment));
  if (octets.some((num) => !Number.isInteger(num) || num < 0 || num > 255)) return false;
  return octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127;
}

function detectLocalTailscaleIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const entries of Object.values(interfaces)) {
      for (const entry of entries || []) {
        if (entry && !entry.internal && entry.family === 'IPv4' && isTailscaleIpv4(entry.address)) {
          return entry.address;
        }
      }
    }
  } catch {
    // Fall back to loopback when network interfaces cannot be inspected.
  }
  return null;
}

function isWildcardBindHost(host) {
  const normalized = String(host || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === '0.0.0.0' || normalized === '::' || normalized === '*';
}

function timingSafeEqualStr(left, right) {
  const a = Buffer.from(String(left ?? ''), 'utf8');
  const b = Buffer.from(String(right ?? ''), 'utf8');
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signA2APeerBody(rawBody, timestampSec, secret) {
  const digest = crypto
    .createHmac('sha256', String(secret))
    .update(`${String(timestampSec)}.${String(rawBody)}`)
    .digest('hex');
  return `sha256=${digest}`;
}

function verifyPeerRequestAuth(req, rawBody, { sharedSecret = '', token = '' } = {}) {
  const effectiveSecret = String(sharedSecret || token || '').trim();
  const secondaryToken = String(token || '').trim();
  if (!effectiveSecret) {
    return { authorized: false, reason: 'A2A peer authentication secret is not configured' };
  }

  const sigHeader = String(req.headers['x-a2a-signature'] || '').trim();
  const tsHeader = String(req.headers['x-a2a-timestamp'] || '').trim();
  const hasSigHeaders = Boolean(sigHeader || tsHeader);

  let hmacReason = 'Missing X-A2A-Signature or X-A2A-Timestamp header';
  if (hasSigHeaders) {
    const tsNum = Number(tsHeader);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!sigHeader || !Number.isFinite(tsNum) || tsNum <= 0) {
      hmacReason = 'Missing X-A2A-Signature or X-A2A-Timestamp header';
    } else if (Math.abs(nowSec - tsNum) > A2A_MAX_REPLAY_SKEW_SEC) {
      hmacReason = `Timestamp outside allowed replay window (±${A2A_MAX_REPLAY_SKEW_SEC}s)`;
    } else {
      const expectedPrimary = signA2APeerBody(rawBody, tsNum, effectiveSecret);
      const primaryMatch = timingSafeEqualStr(sigHeader, expectedPrimary);
      const secondaryMatch = !primaryMatch && secondaryToken && secondaryToken !== effectiveSecret
        ? timingSafeEqualStr(sigHeader, signA2APeerBody(rawBody, tsNum, secondaryToken))
        : false;
      if (primaryMatch || secondaryMatch) {
        return { authorized: true, method: 'hmac' };
      }
      hmacReason = 'Invalid HMAC-SHA256 signature';
    }
  }

  const authHeader = String(req.headers.authorization || '').trim();
  if (/^Bearer\s+/i.test(authHeader)) {
    const presented = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (
      timingSafeEqualStr(presented, effectiveSecret)
      || (secondaryToken && secondaryToken !== effectiveSecret && timingSafeEqualStr(presented, secondaryToken))
    ) {
      return { authorized: true, method: 'bearer' };
    }
  }

  return {
    authorized: false,
    reason: hasSigHeaders
      ? hmacReason
      : 'Unauthorized A2A request: valid HMAC-SHA256 signature or Bearer token required',
  };
}

function buildExpandedEnv(baseEnv = process.env) {
  const homeDir = os.homedir();
  const extraDirs = [
    '/opt/homebrew/bin',
    path.join(homeDir, '.local', 'bin'),
    path.join(homeDir, '.npm-global', 'bin'),
    '/usr/local/bin',
  ];
  const existing = String(baseEnv.PATH || '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const merged = [...new Set([...existing, ...extraDirs])];
  return { ...baseEnv, PATH: merged.join(path.delimiter) };
}

let cliDiscoveryCache = {
  expiresAt: 0,
  items: [],
};

export async function discoverLocalCliHarnesses(options = {}) {
  const nowMs = Date.now();
  if (!options.force && cliDiscoveryCache.expiresAt > nowMs) {
    return cliDiscoveryCache.items;
  }

  const env = buildExpandedEnv(options.env || process.env);
  const checks = await Promise.all(
    ALLOWLISTED_CLIS.map(async (cli) => {
      const res = await runExecFile(cli.binary, cli.args, { timeout: 2500, env });
      if (res.errorCode === 'ENOENT' || res.errorCode === 'EACCES') {
        return null;
      }
      if (!res.ok) {
        return null;
      }
      const rawLine = (res.stdout || res.stderr || '').trim().split('\n')[0] || 'detected';
      const version = rawLine.replace(/\s+/g, ' ').trim().slice(0, 64) || 'detected';
      return {
        id: cli.id,
        binary: cli.binary,
        label: cli.label,
        harness: cli.harness,
        version,
      };
    }),
  );

  const discovered = checks.filter(Boolean);
  cliDiscoveryCache = {
    expiresAt: nowMs + LOCAL_CLI_CACHE_TTL_MS,
    items: discovered,
  };
  return discovered;
}

function sanitizeProbeModelText(value, maxLen = 120) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(PROBE_EMAIL_RE, '[redacted-account]')
    .replace(PROBE_SECRET_RE, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function isLoopbackModelEndpoint(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || ''));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

async function fetchLoopbackModelJson(urlStr, timeoutMs = 1500, fetchImpl = globalThis.fetch) {
  if (!isLoopbackModelEndpoint(urlStr) || typeof fetchImpl !== 'function') {
    return { ok: false, latencyMs: null, data: null };
  }
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(urlStr, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const latencyMs = Math.max(0, Date.now() - start);
    if (!res.ok) return { ok: false, latencyMs, data: null };
    const data = await res.json();
    return { ok: true, latencyMs, data };
  } catch {
    return { ok: false, latencyMs: null, data: null };
  } finally {
    clearTimeout(timer);
  }
}

function inferProbeHarnessFromName(name) {
  const lower = String(name || '').trim().toLowerCase();
  if (lower.includes('codex')) return 'codex-cli';
  if (lower.includes('claude')) return 'claude-code';
  if (lower === 'pi' || lower.startsWith('pi')) return 'pi-agent';
  if (lower.includes('gemini') || lower.includes('agy')) return 'gemini-cli';
  if (lower.includes('opencode')) return 'opencode';
  if (lower.includes('dsh')) return 'dsh-expert';
  if (lower.includes('t3')) return 't3-code';
  if (lower.includes('alma')) return 'alma';
  return 'custom-a2a';
}

export function parseProbeMagpieBindings(stdout = '') {
  const lines = String(stdout || '').split(/\r?\n/);
  const out = [];
  const seen = new Set();
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('NAME') || line.startsWith('─') || line.startsWith('-')) continue;
    const cols = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;
    const name = sanitizeProbeModelText(cols[0], 48);
    if (!name || seen.has(name.toLowerCase())) continue;
    const rawModel = sanitizeProbeModelText(cols[1] || '', 120);
    const lowerModel = rawModel.toLowerCase();
    const emptyModel = !rawModel || rawModel === '—' || rawModel === '-' || lowerModel === 'none' || lowerModel.startsWith('provider ');
    const canonicalModel = emptyModel ? null : rawModel.replace(/^magpie\//i, '');
    const mode = lowerModel.startsWith('provider ') ? 'provider' : (canonicalModel ? 'pinned' : 'default');
    const effortCandidate = String(cols[2] || '').trim().toLowerCase();
    const effort = ['off', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(effortCandidate)
      ? effortCandidate
      : null;
    seen.add(name.toLowerCase());
    out.push({
      name,
      harness: inferProbeHarnessFromName(name),
      model: canonicalModel,
      canonicalModel,
      mode,
      effort,
    });
    if (out.length >= 32) break;
  }
  return out;
}

export async function discoverLocalModelCatalog(options = {}) {
  const nowMs = Date.now();
  if (!options.force && !options.fetchImpl && localModelCatalogCache.expiresAt > nowMs && localModelCatalogCache.data) {
    return localModelCatalogCache.data;
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Math.max(300, Math.min(5000, Number(options.timeoutMs))) : 1200;
  const nodeId = sanitizeProbeModelText(options.nodeId || os.hostname().toLowerCase(), 48);
  const endpoints = [
    {
      id: `${nodeId}-magpie`,
      kind: 'magpie',
      name: 'Magpie Gateway',
      url: options.magpieUrl || 'http://127.0.0.1:3426/v1/models',
    },
    {
      id: `${nodeId}-ollama`,
      kind: 'ollama',
      name: 'Ollama Local',
      url: options.ollamaUrl || 'http://127.0.0.1:11434/api/tags',
    },
    {
      id: `${nodeId}-mlx`,
      kind: 'mlx',
      name: 'MLX Local Server',
      url: options.mlxUrl || 'http://127.0.0.1:8080/v1/models',
    },
    ...(Array.isArray(options.customSources)
      ? options.customSources
          .filter((src) => src && typeof src === 'object' && isLoopbackModelEndpoint(src.url))
          .slice(0, 6)
          .map((src, idx) => ({
            id: sanitizeProbeModelText(src.id || `${nodeId}-custom-${idx + 1}`, 48),
            kind: ['magpie', 'ollama', 'mlx', 'openai-compatible'].includes(src.kind) ? src.kind : 'openai-compatible',
            name: sanitizeProbeModelText(src.name || `Local Source ${idx + 1}`, 48),
            url: String(src.url),
          }))
      : []),
  ];

  const modelSources = [];
  const models = [];
  const seenModelKeys = new Set();

  const probeResults = await Promise.all(
    endpoints.map(async (ep) => {
      const res = await fetchLoopbackModelJson(ep.url, timeoutMs, fetchImpl);
      return { ep, res };
    }),
  );

  for (const { ep, res } of probeResults) {
    if (!res.ok || !res.data) continue;
    const rawItems = ep.kind === 'ollama'
      ? (Array.isArray(res.data?.models) ? res.data.models : [])
      : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.models) ? res.data.models : []));
    let countForSource = 0;
    for (const item of rawItems) {
      if (models.length >= 128) break;
      const rawId = typeof item === 'string' ? item : String(item?.id || item?.name || item?.model || '').trim();
      if (!rawId) continue;
      PROBE_EMAIL_RE.lastIndex = 0;
      PROBE_SECRET_RE.lastIndex = 0;
      if (PROBE_EMAIL_RE.test(rawId) || PROBE_SECRET_RE.test(rawId)) continue;
      const dedupeKey = `${ep.kind}:${rawId}`;
      if (seenModelKeys.has(dedupeKey)) continue;
      seenModelKeys.add(dedupeKey);
      const isRoutingGroup = ep.kind === 'magpie' && (rawId.startsWith('auto/') || Boolean(item?.is_routing_group || item?.isRoutingGroup));
      const provider = ep.kind === 'ollama'
        ? 'ollama'
        : (ep.kind === 'mlx' ? 'mlx' : sanitizeProbeModelText(item?.owned_by || item?.provider || (rawId.includes('/') ? rawId.split('/')[0] : ep.kind), 40));
      const displayName = sanitizeProbeModelText(item?.display_name || item?.displayName || item?.name || rawId, 80);
      const rawLevels = Array.isArray(item?.reasoning_levels) ? item.reasoning_levels : (Array.isArray(item?.reasoningLevels) ? item.reasoningLevels : []);
      const reasoningLevels = rawLevels
        .map((lvl) => String(lvl || '').trim().toLowerCase())
        .filter((lvl) => ['off', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(lvl));
      models.push({
        id: rawId.slice(0, 140),
        displayName,
        provider,
        sourceKind: ep.kind,
        sourceId: ep.id,
        isRoutingGroup,
        reasoning: Boolean(item?.reasoning || reasoningLevels.length > 0),
        reasoningLevels,
        contextWindow: Number.isFinite(Number(item?.context_window || item?.contextWindow))
          ? Math.round(Number(item?.context_window || item?.contextWindow))
          : null,
        maxOutputTokens: Number.isFinite(Number(item?.max_output_tokens || item?.maxOutputTokens))
          ? Math.round(Number(item?.max_output_tokens || item?.maxOutputTokens))
          : null,
        toolCall: item?.tool_call !== false && item?.toolCall !== false,
      });
      countForSource += 1;
    }
    modelSources.push({
      id: ep.id,
      kind: ep.kind,
      name: ep.name,
      reachable: true,
      latencyMs: res.latencyMs,
      modelsCount: countForSource,
      endpointScope: 'loopback',
    });
  }

  let agentBindings = [];
  if (options.collectBindings !== false && !options.fetchImpl) {
    const env = buildExpandedEnv(options.env || process.env);
    const lsRes = await runExecFile('magpie', ['ls'], { timeout: 2000, env });
    if (lsRes.ok && lsRes.stdout) {
      agentBindings = parseProbeMagpieBindings(lsRes.stdout);
    }
  }

  const result = { modelSources, models, agentBindings };
  if (!options.fetchImpl) {
    localModelCatalogCache = {
      expiresAt: nowMs + LOCAL_MODEL_CACHE_TTL_MS,
      data: result,
    };
  }
  return result;
}

function extractTextFromA2AMessage(message) {
  if (!message || typeof message !== 'object') return '';
  if (typeof message.text === 'string' && message.text.trim()) return message.text.trim();
  if (Array.isArray(message.parts)) {
    const texts = [];
    for (const part of message.parts) {
      if (part && typeof part === 'object' && typeof part.text === 'string' && part.text.trim()) {
        texts.push(part.text.trim());
      }
    }
    return texts.join('\n').trim();
  }
  return '';
}

function readHttpRawBody(req, maxBytes = A2A_MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        const err = new Error('Request body exceeds maximum allowed size');
        err.statusCode = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function sendPeerJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function collectWorkspaceGitStatus(workspaceRoot) {
  if (!workspaceRoot || typeof workspaceRoot !== 'string') return null;
  const resolved = path.resolve(workspaceRoot);
  try {
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }
  const gitRes = await runExecFile('git', ['-C', resolved, 'status', '--short', '--branch'], {
    timeout: 3000,
    maxBuffer: 256 * 1024,
  });
  if (!gitRes.ok) {
    return { available: false, error: (gitRes.stderr || 'Not a git repository').trim().slice(0, 160) };
  }
  const lines = gitRes.stdout.split('\n').map((line) => line.trimEnd()).filter(Boolean);
  const branchLine = lines[0]?.startsWith('## ') ? lines[0].slice(3).trim() : null;
  const changes = lines.slice(branchLine ? 1 : 0).slice(0, 40);
  return {
    available: true,
    branch: branchLine,
    dirtyCount: changes.length,
    changes,
  };
}

function buildPeerAgentCard({ nodeId, hostname, baseUrl, rpcUrl, tailscaleIp, execMode, workspaceRoot, discoveredClis }) {
  const skills = [
    {
      id: 'node-diagnostics',
      name: 'Node Diagnostics',
      description: 'Collect real-time CPU, memory, disk, Tailscale, and watched service telemetry on this node.',
      tags: ['diagnostics', 'telemetry', process.platform],
      inputModes: ['text/plain', 'application/json'],
      outputModes: ['text/plain', 'application/json'],
    },
    {
      id: 'workspace-inspect',
      name: 'Workspace Inspect',
      description: 'Read-only Git branch and working tree inspection for the configured workspace root.',
      tags: ['git', 'workspace', 'readonly'],
      inputModes: ['text/plain', 'application/json'],
      outputModes: ['text/plain', 'application/json'],
    },
    {
      id: 'agent-relay',
      name: 'Agent Relay',
      description: 'Accept signed Google A2A v0.3 JSON-RPC 2.0 tasks and report local CLI harness readiness.',
      tags: ['a2a', 'relay', nodeId],
      inputModes: ['text/plain', 'application/json'],
      outputModes: ['text/plain', 'application/json'],
    },
    ...discoveredClis.map((cli) => ({
      id: `cli-${cli.id}`,
      name: cli.label,
      description: `Local ${cli.label} (${cli.version}) detected on ${nodeId}.`,
      tags: ['cli', cli.harness, nodeId],
      inputModes: ['text/plain', 'application/json'],
      outputModes: ['text/plain', 'application/json'],
    })),
  ];

  return {
    protocolVersion: A2A_PROTOCOL_VERSION,
    name: `Ops Probe · ${nodeId}`,
    description: `Ops Console A2A v0.3 peer node on ${hostname} (${process.platform}/${process.arch})`,
    url: rpcUrl,
    version: PROBE_VERSION,
    provider: {
      organization: 'Ops Console',
      url: baseUrl,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Per-node probe Bearer token or A2A shared secret',
      },
      hmacSignature: {
        type: 'apiKey',
        in: 'header',
        name: 'X-A2A-Signature',
        description: 'HMAC-SHA256 over "<X-A2A-Timestamp>.<rawBody>" with ±300s replay guard',
      },
    },
    security: [{ hmacSignature: [] }, { bearerAuth: [] }],
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],
    skills,
    metadata: {
      nodeId,
      hostname,
      platform: process.platform,
      arch: process.arch,
      tailscaleIp,
      execMode,
      workspaceConfigured: Boolean(workspaceRoot),
      discoveredClis: discoveredClis.map((cli) => ({
        id: cli.id,
        label: cli.label,
        harness: cli.harness,
        version: cli.version,
      })),
    },
  };
}

export async function startA2APeerServer(config = {}, options = {}) {
  const a2aCfg = config.a2a && typeof config.a2a === 'object' ? config.a2a : {};
  const allowAny = Boolean(options.allowAny ?? a2aCfg.allowAny);
  const detectedTsIp = detectLocalTailscaleIp();
  const rawHost = options.host ?? a2aCfg.host;
  const bindHost = String(rawHost || detectedTsIp || '127.0.0.1').trim();

  if (isWildcardBindHost(bindHost) && !allowAny) {
    throw new Error(`Refusing to bind A2A peer server to wildcard host "${bindHost}" without --a2a-allow-any`);
  }

  const rawPort = options.port ?? a2aCfg.port ?? DEFAULT_A2A_PORT;
  const bindPort = Number.isInteger(rawPort) && rawPort >= 0 && rawPort <= 65535
    ? rawPort
    : DEFAULT_A2A_PORT;
  const sharedSecret = String(options.sharedSecret ?? a2aCfg.sharedSecret ?? '').trim();
  const token = String(options.token ?? config.token ?? '').trim();
  const execMode = (options.execMode ?? a2aCfg.execMode) === 'cli' ? 'cli' : 'safe';
  const workspaceRoot = options.workspaceRoot ?? a2aCfg.workspaceRoot ?? null;
  const nodeId = String(config.nodeId || os.hostname().toLowerCase());
  const hostname = os.hostname();

  const tasks = new Map();
  const peerMetricsState = { prevCpu: null, prevNet: null, lastHubRttMs: null };
  const initialClis = await discoverLocalCliHarnesses();

  let boundHost = bindHost;
  let boundPort = bindPort;
  let baseUrl = '';
  let agentCardUrl = '';
  let rpcUrl = '';

  const recordTask = (task) => {
    tasks.set(task.id, task);
    while (tasks.size > A2A_MAX_STORED_TASKS) {
      const oldestKey = tasks.keys().next().value;
      tasks.delete(oldestKey);
    }
  };

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || '/', baseUrl || 'http://127.0.0.1');
      const pathname = reqUrl.pathname;
      const method = String(req.method || 'GET').toUpperCase();

      if (method === 'GET' && (pathname === '/.well-known/agent-card.json' || pathname === '/.well-known/agent.json')) {
        const discoveredClis = await discoverLocalCliHarnesses();
        const card = buildPeerAgentCard({
          nodeId,
          hostname,
          baseUrl,
          rpcUrl,
          tailscaleIp: detectedTsIp,
          execMode,
          workspaceRoot,
          discoveredClis,
        });
        sendPeerJson(res, 200, card);
        return;
      }

      if (method === 'POST' && pathname === '/a2a') {
        let rawBody;
        try {
          rawBody = await readHttpRawBody(req, A2A_MAX_BODY_BYTES);
        } catch (err) {
          sendPeerJson(res, err.statusCode || 400, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32600, message: err.message || 'Invalid request body' },
          });
          return;
        }

        const authCheck = verifyPeerRequestAuth(req, rawBody, { sharedSecret, token });
        if (!authCheck.authorized) {
          sendPeerJson(res, 401, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32000, message: authCheck.reason },
          });
          return;
        }

        let payload;
        try {
          payload = JSON.parse(rawBody || '{}');
        } catch {
          sendPeerJson(res, 400, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error: invalid JSON body' },
          });
          return;
        }

        const reqId = payload?.id ?? null;
        if (!payload || typeof payload !== 'object' || payload.jsonrpc !== '2.0' || typeof payload.method !== 'string') {
          sendPeerJson(res, 400, {
            jsonrpc: '2.0',
            id: reqId,
            error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' },
          });
          return;
        }

        const rpcMethod = payload.method;
        const params = payload.params && typeof payload.params === 'object' ? payload.params : {};

        if (rpcMethod === 'agent/card' || rpcMethod === 'agent/authenticatedExtendedCard') {
          const discoveredClis = await discoverLocalCliHarnesses();
          const card = buildPeerAgentCard({
            nodeId,
            hostname,
            baseUrl,
            rpcUrl,
            tailscaleIp: detectedTsIp,
            execMode,
            workspaceRoot,
            discoveredClis,
          });
          sendPeerJson(res, 200, { jsonrpc: '2.0', id: reqId, result: card });
          return;
        }

        if (rpcMethod === 'agent/ping') {
          const discoveredClis = await discoverLocalCliHarnesses();
          sendPeerJson(res, 200, {
            jsonrpc: '2.0',
            id: reqId,
            result: {
              pong: true,
              protocolVersion: A2A_PROTOCOL_VERSION,
              nodeId,
              hostname,
              platform: process.platform,
              arch: process.arch,
              probeVersion: PROBE_VERSION,
              discoveredClis: discoveredClis.length,
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        if (rpcMethod === 'message/send' || rpcMethod === 'tasks/send') {
          const prompt = extractTextFromA2AMessage(params.message) || String(params.prompt || '').trim();
          if (!prompt) {
            sendPeerJson(res, 400, {
              jsonrpc: '2.0',
              id: reqId,
              error: { code: -32602, message: 'Missing message text in params.message.parts' },
            });
            return;
          }

          const startedMs = Date.now();
          const createdAt = new Date(startedMs).toISOString();
          const taskId = typeof params.id === 'string' && params.id.trim()
            ? params.id.trim().slice(0, 64)
            : `peer-task-${crypto.randomBytes(4).toString('hex')}`;
          const contextId = typeof params.contextId === 'string' && params.contextId.trim()
            ? params.contextId.trim().slice(0, 64)
            : `ctx-${crypto.randomBytes(4).toString('hex')}`;

          const [telemetry, discoveredClis, gitStatus] = await Promise.all([
            collectProbeMetrics({ ...config, cpuSampleDelayMs: 0 }, peerMetricsState),
            discoverLocalCliHarnesses(),
            collectWorkspaceGitStatus(workspaceRoot),
          ]);

          const completedAt = new Date().toISOString();
          const cliNames = discoveredClis.length > 0
            ? discoveredClis.map((cli) => cli.id).join(', ')
            : 'none';
          const memPct = telemetry.memory?.usedPct ?? 'n/a';
          const cpuPct = telemetry.cpu?.usagePct ?? 'n/a';
          const gitSummary = gitStatus?.available
            ? `git=${gitStatus.branch || 'detached'} (dirty=${gitStatus.dirtyCount})`
            : 'git=unconfigured';
          const summaryText = `[A2A Peer ${nodeId} · ${execMode}] Processed "${prompt.slice(0, 120)}" · CPU ${cpuPct}% · Mem ${memPct}% · CLIs: ${cliNames} · ${gitSummary}`;

          const task = {
            kind: 'task',
            id: taskId,
            contextId,
            status: {
              state: 'completed',
              timestamp: completedAt,
              message: {
                kind: 'message',
                role: 'agent',
                parts: [{ kind: 'text', text: summaryText }],
              },
            },
            history: [
              { state: 'submitted', timestamp: createdAt },
              { state: 'working', timestamp: createdAt },
              { state: 'completed', timestamp: completedAt },
            ],
            artifacts: [
              {
                artifactId: `art-${taskId}`,
                name: 'peer-diagnostics-report',
                parts: [
                  { kind: 'text', text: summaryText },
                  {
                    kind: 'data',
                    data: {
                      nodeId,
                      hostname,
                      platform: process.platform,
                      arch: process.arch,
                      cpu: telemetry.cpu,
                      memory: telemetry.memory,
                      tailscale: telemetry.tailscale,
                      discoveredClis,
                      gitStatus,
                    },
                  },
                ],
              },
            ],
            metadata: {
              nodeId,
              hostname,
              execMode,
              prompt: prompt.slice(0, 240),
              delegatorAgentId: params.metadata?.delegatorAgentId || null,
              worktreeBranch: params.metadata?.worktreeBranch || null,
              durationMs: Math.max(1, Date.now() - startedMs),
            },
          };

          recordTask(task);
          sendPeerJson(res, 200, { jsonrpc: '2.0', id: reqId, result: task });
          return;
        }

        if (rpcMethod === 'tasks/get') {
          const taskId = String(params.id || params.taskId || '').trim();
          const task = taskId ? tasks.get(taskId) : null;
          if (!task) {
            sendPeerJson(res, 404, {
              jsonrpc: '2.0',
              id: reqId,
              error: { code: -32004, message: 'Task not found' },
            });
            return;
          }
          sendPeerJson(res, 200, { jsonrpc: '2.0', id: reqId, result: task });
          return;
        }

        if (rpcMethod === 'tasks/cancel') {
          const taskId = String(params.id || params.taskId || '').trim();
          const task = taskId ? tasks.get(taskId) : null;
          if (!task) {
            sendPeerJson(res, 404, {
              jsonrpc: '2.0',
              id: reqId,
              error: { code: -32004, message: 'Task not found' },
            });
            return;
          }
          const nowIso = new Date().toISOString();
          task.status = {
            state: 'canceled',
            timestamp: nowIso,
            message: {
              kind: 'message',
              role: 'agent',
              parts: [{ kind: 'text', text: `Task ${task.id} canceled on ${nodeId}` }],
            },
          };
          task.history.push({ state: 'canceled', timestamp: nowIso });
          sendPeerJson(res, 200, { jsonrpc: '2.0', id: reqId, result: task });
          return;
        }

        sendPeerJson(res, 404, {
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32601, message: `Method not found: ${rpcMethod}` },
        });
        return;
      }

      sendPeerJson(res, 404, { ok: false, error: 'Not Found' });
    } catch (error) {
      sendPeerJson(res, 500, {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: error?.message || 'Internal peer error' },
      });
    }
  });

  await new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        boundHost = addr.address || bindHost;
        boundPort = addr.port;
      }
      const urlHost = boundHost.includes(':') ? `[${boundHost}]` : boundHost;
      baseUrl = `http://${urlHost}:${boundPort}`;
      agentCardUrl = `${baseUrl}/.well-known/agent-card.json`;
      rpcUrl = `${baseUrl}/a2a`;
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(bindPort, bindHost);
  });

  const close = () => new Promise((resolve) => {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    server.close(() => resolve());
  });

  return {
    server,
    host: boundHost,
    port: boundPort,
    baseUrl,
    agentCardUrl,
    rpcUrl,
    nodeId,
    discoveredClis: initialClis,
    close,
  };
}

export async function collectProbeMetrics(config = {}, state = {}) {
  const sampleDelayMs = Number.isFinite(config.cpuSampleDelayMs)
    ? Math.max(0, config.cpuSampleDelayMs)
    : DEFAULT_CPU_SAMPLE_MS;

  const needDualCpuSample = !state.prevCpu;
  const initialCpu = needDualCpuSample ? snapshotCpuTimes() : state.prevCpu;
  const startedAtMs = Date.now();

  const [memory, disks, netCounters, battery, tailscale, services, agents] = await Promise.all([
    collectMemory(),
    collectDisks(config.mounts),
    collectNetworkCounters(),
    collectBattery(),
    collectTailscale(),
    collectServices(config.watchServices),
    collectAgents(config.detectAgents),
  ]);

  if (needDualCpuSample && sampleDelayMs > 0) {
    const elapsedMs = Date.now() - startedAtMs;
    const remainingMs = sampleDelayMs - elapsedMs;
    if (remainingMs > 0) {
      await sleep(remainingMs);
    }
  }

  const currentCpu = snapshotCpuTimes();
  const cpuUsagePct = computeCpuUsagePct(initialCpu, currentCpu);
  state.prevCpu = currentCpu;

  const nowMs = Date.now();
  let network = { rxBytesPerSec: null, txBytesPerSec: null };
  if (netCounters) {
    if (state.prevNet && nowMs > state.prevNet.timestampMs) {
      const elapsedSec = (nowMs - state.prevNet.timestampMs) / 1000;
      network = {
        rxBytesPerSec: Math.max(0, Math.round((netCounters.rxBytes - state.prevNet.rxBytes) / elapsedSec)),
        txBytesPerSec: Math.max(0, Math.round((netCounters.txBytes - state.prevNet.txBytes) / elapsedSec)),
      };
    }
    state.prevNet = {
      rxBytes: netCounters.rxBytes,
      txBytes: netCounters.txBytes,
      timestampMs: nowMs,
    };
  }

  const loadAvg = os.loadavg();
  const configuredDeviceType = typeof config.deviceType === 'string' && DEVICE_TYPES.has(config.deviceType)
    ? config.deviceType
    : 'auto';
  const resolvedDeviceType = configuredDeviceType !== 'auto'
    ? configuredDeviceType
    : (battery !== null ? 'laptop' : 'server');

  const hubRttMs = Number.isFinite(state.lastHubRttMs)
    ? Math.max(0, Math.round(state.lastHubRttMs))
    : null;

  const resolvedNodeId = String(config.nodeId || os.hostname().toLowerCase());
  const configuredHarnesses = Array.isArray(config.harnesses) ? config.harnesses : [];
  let mergedHarnesses = configuredHarnesses.slice(0, 16);

  if (state.a2aPeer && state.a2aPeer.agentCardUrl && state.a2aPeer.rpcUrl) {
    const peerClis = Array.isArray(state.a2aPeer.discoveredClis)
      ? state.a2aPeer.discoveredClis
      : await discoverLocalCliHarnesses();
    const peerHarnesses = [
      {
        id: `a2a-peer-${resolvedNodeId}`,
        name: `Ops Probe A2A (${resolvedNodeId})`,
        harness: 'custom-a2a',
        version: PROBE_VERSION,
        status: 'healthy',
        agentCardUrl: state.a2aPeer.agentCardUrl,
        rpcUrl: state.a2aPeer.rpcUrl,
        skills: [
          { id: 'node-diagnostics', name: 'Node Diagnostics' },
          { id: 'workspace-inspect', name: 'Workspace Inspect' },
          { id: 'agent-relay', name: 'Agent Relay' },
        ],
      },
      ...peerClis.map((cli) => ({
        id: `${resolvedNodeId}-${cli.id}`,
        name: `${cli.label} (${resolvedNodeId})`,
        harness: cli.harness,
        version: cli.version,
        status: 'healthy',
        agentCardUrl: state.a2aPeer.agentCardUrl,
        rpcUrl: state.a2aPeer.rpcUrl,
        skills: [
          { id: `cli-${cli.id}`, name: cli.label },
          { id: 'node-diagnostics', name: 'Node Diagnostics' },
        ],
      })),
    ];
    const seenIds = new Set(peerHarnesses.map((item) => item.id));
    const extras = configuredHarnesses.filter((item) => item && !seenIds.has(item.id));
    mergedHarnesses = [...peerHarnesses, ...extras].slice(0, 16);
  }

  const modelDiscovery = config.collectModels === false
    ? { modelSources: [], models: [], agentBindings: [] }
    : await discoverLocalModelCatalog({
        ...(config.modelSources && typeof config.modelSources === 'object' ? config.modelSources : {}),
        nodeId: resolvedNodeId,
      });

  return {
    schemaVersion: SCHEMA_VERSION,
    probeVersion: PROBE_VERSION,
    nodeId: resolvedNodeId,
    sentAt: new Date(nowMs).toISOString(),
    deviceType: resolvedDeviceType,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    kernel: os.release(),
    uptimeSec: Math.floor(os.uptime()),
    cpu: {
      cores: os.cpus().length,
      usagePct: cpuUsagePct,
      load1: roundDecimal(loadAvg[0], 2),
      load5: roundDecimal(loadAvg[1], 2),
      load15: roundDecimal(loadAvg[2], 2),
    },
    memory,
    disks,
    network,
    battery,
    tailscale,
    services,
    agents,
    mcps: Array.isArray(config.mcps) ? config.mcps.slice(0, 32) : [],
    harnesses: mergedHarnesses,
    modelSources: modelDiscovery.modelSources,
    models: modelDiscovery.models,
    agentBindings: modelDiscovery.agentBindings,
    hubRttMs,
  };
}

export function parseCliArgs(argv = []) {
  const parsed = {
    configPath: null,
    once: false,
    dryRun: false,
    intervalSec: null,
    showVersion: false,
    showHelp: false,
    hubUrl: null,
    nodeId: null,
    deviceType: null,
    a2aEnabled: false,
    a2aHost: null,
    a2aPort: null,
    a2aSecret: null,
    a2aAllowAny: false,
    a2aWorkspace: null,
    a2aExecMode: null,
  };

  const readValue = (flag, index) => {
    if (index + 1 >= argv.length) {
      throw new Error(`Missing value for ${flag}`);
    }
    return argv[index + 1];
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--config' || arg === '-c') {
      parsed.configPath = readValue(arg, index);
      index += 1;
    } else if (arg.startsWith('--config=')) {
      parsed.configPath = arg.slice('--config='.length);
    } else if (arg === '--once') {
      parsed.once = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--interval') {
      parsed.intervalSec = Number(readValue(arg, index));
      index += 1;
    } else if (arg.startsWith('--interval=')) {
      parsed.intervalSec = Number(arg.slice('--interval='.length));
    } else if (arg === '--hub-url') {
      parsed.hubUrl = readValue(arg, index);
      index += 1;
    } else if (arg.startsWith('--hub-url=')) {
      parsed.hubUrl = arg.slice('--hub-url='.length);
    } else if (arg === '--node-id') {
      parsed.nodeId = readValue(arg, index);
      index += 1;
    } else if (arg.startsWith('--node-id=')) {
      parsed.nodeId = arg.slice('--node-id='.length);
    } else if (arg === '--device-type') {
      parsed.deviceType = readValue(arg, index);
      index += 1;
    } else if (arg.startsWith('--device-type=')) {
      parsed.deviceType = arg.slice('--device-type='.length);
    } else if (arg === '--a2a' || arg === '--a2a-enabled') {
      parsed.a2aEnabled = true;
    } else if (arg === '--a2a-port') {
      parsed.a2aPort = Number(readValue(arg, index));
      index += 1;
    } else if (arg.startsWith('--a2a-port=')) {
      parsed.a2aPort = Number(arg.slice('--a2a-port='.length));
    } else if (arg === '--a2a-host') {
      parsed.a2aHost = readValue(arg, index);
      index += 1;
    } else if (arg.startsWith('--a2a-host=')) {
      parsed.a2aHost = arg.slice('--a2a-host='.length);
    } else if (arg === '--a2a-secret') {
      parsed.a2aSecret = readValue(arg, index);
      index += 1;
    } else if (arg.startsWith('--a2a-secret=')) {
      parsed.a2aSecret = arg.slice('--a2a-secret='.length);
    } else if (arg === '--a2a-allow-any') {
      parsed.a2aAllowAny = true;
    } else if (arg === '--a2a-workspace') {
      parsed.a2aWorkspace = readValue(arg, index);
      index += 1;
    } else if (arg.startsWith('--a2a-workspace=')) {
      parsed.a2aWorkspace = arg.slice('--a2a-workspace='.length);
    } else if (arg === '--a2a-exec-mode') {
      parsed.a2aExecMode = readValue(arg, index);
      index += 1;
    } else if (arg.startsWith('--a2a-exec-mode=')) {
      parsed.a2aExecMode = arg.slice('--a2a-exec-mode='.length);
    } else if (arg === '--version' || arg === '-v') {
      parsed.showVersion = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.showHelp = true;
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(`ops-probe v${PROBE_VERSION} — Lightweight push-only telemetry probe for Ops Console

Usage:
  ops-probe [options]

Options:
  -c, --config <path>         Path to JSON configuration file
  --hub-url <url>             Hub base URL override
  --node-id <id>              Node identifier override
  --device-type <type>        Device type (hub|server|edge|laptop|mobile|auto)
  --interval <sec>            Push interval in seconds (${MIN_INTERVAL_SEC}-${MAX_INTERVAL_SEC}, default ${DEFAULT_INTERVAL_SEC})
  --a2a-enabled               Start Google A2A v0.3 peer HTTP server
  --a2a-host <host>           A2A peer bind host (defaults to Tailscale IP or 127.0.0.1)
  --a2a-port <port>           A2A peer bind port (default ${DEFAULT_A2A_PORT})
  --a2a-secret <secret>       A2A HMAC-SHA256 shared secret (falls back to probe token)
  --a2a-workspace <dir>       Read-only Git workspace root for workspace-inspect skill
  --a2a-exec-mode <safe|cli>  A2A peer execution mode (default safe)
  --a2a-allow-any             Explicitly allow binding A2A peer to 0.0.0.0 or ::
  --once                      Collect and send one snapshot, then exit
  --dry-run                   Print JSON payload to stdout without contacting the hub
  --version                   Print probe version
  -h, --help                  Show this help message

Environment variables:
  OPS_PROBE_CONFIG            Config file path
  OPS_PROBE_HUB_URL           Hub base URL (e.g. https://hub.example.ts.net)
  OPS_PROBE_NODE_ID           Node identifier (e.g. edge-node-01)
  OPS_PROBE_TOKEN             Per-node Bearer token
  OPS_PROBE_INTERVAL          Push interval in seconds
  OPS_PROBE_A2A_ENABLED       Enable A2A peer server (true/false)
  OPS_PROBE_A2A_HOST          A2A peer bind host
  OPS_PROBE_A2A_PORT          A2A peer port (default ${DEFAULT_A2A_PORT})
  OPS_PROBE_A2A_SECRET        A2A HMAC-SHA256 shared secret
  OPS_PROBE_A2A_WORKSPACE     Workspace root for Git inspection
`);
}

async function resolveDefaultConfigPath() {
  const candidates = [
    '/etc/ops-probe/config.json',
    path.join(os.homedir(), '.config', 'ops-probe', 'config.json'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate, fsSync.constants.R_OK);
      return candidate;
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

export async function loadProbeConfig(options = {}) {
  const normalizedOptions = typeof options === 'string'
    ? { configPath: options }
    : (options || {});

  const env = normalizedOptions.env ?? process.env;
  const warn = normalizedOptions.warn ?? ((message) => process.stderr.write(`${message}\n`));
  const cli = normalizedOptions.cli ?? (Array.isArray(normalizedOptions.argv) ? parseCliArgs(normalizedOptions.argv) : {});

  const explicitPath = normalizedOptions.configPath || cli.configPath || env.OPS_PROBE_CONFIG || null;
  const resolvedConfigPath = explicitPath ? path.resolve(explicitPath) : await resolveDefaultConfigPath();

  let fileConfig = {};
  if (resolvedConfigPath) {
    try {
      const stat = await fs.stat(resolvedConfigPath);
      if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0) {
        const modeOctal = (stat.mode & 0o777).toString(8).padStart(3, '0');
        warn(`[ops-probe] WARNING: Config file ${resolvedConfigPath} has overly permissive mode ${modeOctal}; run "chmod 600 ${resolvedConfigPath}" to protect your token.`);
      }
      const rawContent = await fs.readFile(resolvedConfigPath, 'utf8');
      const parsedJson = JSON.parse(rawContent);
      if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
        throw new Error('Config file root must be a JSON object');
      }
      fileConfig = parsedJson;
    } catch (error) {
      if (explicitPath) {
        throw new Error(`Failed to load config from ${resolvedConfigPath}: ${error.message}`);
      }
    }
  }

  const rawInterval = cli.intervalSec ?? (env.OPS_PROBE_INTERVAL ? Number(env.OPS_PROBE_INTERVAL) : undefined) ?? fileConfig.intervalSec ?? DEFAULT_INTERVAL_SEC;
  const intervalSec = Number.isFinite(rawInterval)
    ? Math.max(MIN_INTERVAL_SEC, Math.min(MAX_INTERVAL_SEC, Math.round(rawInterval)))
    : DEFAULT_INTERVAL_SEC;

  const hubUrl = String(cli.hubUrl || env.OPS_PROBE_HUB_URL || fileConfig.hubUrl || '').trim();
  const defaultNodeId = os.hostname().toLowerCase();
  const nodeId = String(cli.nodeId || env.OPS_PROBE_NODE_ID || fileConfig.nodeId || defaultNodeId).trim() || defaultNodeId;
  const token = String(env.OPS_PROBE_TOKEN || fileConfig.token || '').trim();
  const rawDeviceType = String(cli.deviceType || fileConfig.deviceType || 'auto').trim().toLowerCase();
  const deviceType = DEVICE_TYPES.has(rawDeviceType) ? rawDeviceType : 'auto';
  const mounts = Array.isArray(fileConfig.mounts) && fileConfig.mounts.length > 0
    ? fileConfig.mounts.filter((mount) => typeof mount === 'string' && mount.startsWith('/') && !mount.includes('\0'))
    : ['/'];
  const watchServices = normalizeWatchServices(fileConfig.watchServices);
  const detectAgents = fileConfig.detectAgents !== false;
  const mcps = Array.isArray(fileConfig.mcps) ? fileConfig.mcps.slice(0, 32) : [];
  const harnesses = Array.isArray(fileConfig.harnesses) ? fileConfig.harnesses.slice(0, 16) : [];

  const fileA2A = fileConfig.a2a && typeof fileConfig.a2a === 'object' ? fileConfig.a2a : {};
  const envA2AEnabled = parseOptionalBool(env.OPS_PROBE_A2A_ENABLED);
  const cliA2AImplied = Boolean(
    cli.a2aEnabled
    || cli.a2aHost
    || (cli.a2aPort !== null && cli.a2aPort !== undefined)
    || cli.a2aSecret
    || cli.a2aWorkspace
    || cli.a2aExecMode
    || cli.a2aAllowAny,
  );
  const a2aEnabled = cliA2AImplied
    ? true
    : (envA2AEnabled !== null ? envA2AEnabled : Boolean(fileA2A.enabled));
  const envA2APort = env.OPS_PROBE_A2A_PORT !== undefined && String(env.OPS_PROBE_A2A_PORT).trim() !== ''
    ? Number(env.OPS_PROBE_A2A_PORT)
    : undefined;
  const rawA2APort = cli.a2aPort ?? envA2APort ?? fileA2A.port ?? DEFAULT_A2A_PORT;
  const a2aPort = Number.isInteger(rawA2APort) && rawA2APort >= 0 && rawA2APort <= 65535
    ? rawA2APort
    : DEFAULT_A2A_PORT;
  const a2aHost = String(cli.a2aHost || env.OPS_PROBE_A2A_HOST || fileA2A.host || '').trim() || null;
  const a2aSharedSecret = String(
    cli.a2aSecret || env.OPS_PROBE_A2A_SECRET || env.OPS_A2A_SHARED_SECRET || fileA2A.sharedSecret || '',
  ).trim();
  const rawExecMode = String(cli.a2aExecMode || fileA2A.execMode || 'safe').trim().toLowerCase();
  const a2aExecMode = rawExecMode === 'cli' ? 'cli' : 'safe';
  const rawWorkspace = String(cli.a2aWorkspace || env.OPS_PROBE_A2A_WORKSPACE || fileA2A.workspaceRoot || '').trim();
  const a2aWorkspaceRoot = rawWorkspace ? path.resolve(rawWorkspace) : null;
  const a2aAllowAny = Boolean(cli.a2aAllowAny || fileA2A.allowAny);

  return {
    configPath: resolvedConfigPath,
    hubUrl,
    nodeId,
    token,
    deviceType,
    intervalSec,
    mounts: mounts.length > 0 ? mounts : ['/'],
    watchServices,
    detectAgents,
    mcps,
    harnesses,
    a2a: {
      enabled: a2aEnabled,
      host: a2aHost,
      port: a2aPort,
      sharedSecret: a2aSharedSecret,
      execMode: a2aExecMode,
      workspaceRoot: a2aWorkspaceRoot,
      allowAny: a2aAllowAny,
    },
    once: Boolean(cli.once),
    dryRun: Boolean(cli.dryRun),
  };
}

export async function pushTelemetry(config, payload, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;

  if (!config?.hubUrl) {
    return { ok: false, status: 0, rttMs: null, error: 'Missing hubUrl' };
  }
  if (!config?.token) {
    return { ok: false, status: 0, rttMs: null, error: 'Missing token' };
  }

  let endpoint;
  try {
    const parsedUrl = new URL(config.hubUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { ok: false, status: 0, rttMs: null, error: `Unsupported hubUrl protocol: ${parsedUrl.protocol}` };
    }
    const cleanPath = parsedUrl.pathname.replace(/\/+$/, '');
    endpoint = `${parsedUrl.origin}${cleanPath}/api/probes/ingest`;
  } catch {
    return { ok: false, status: 0, rttMs: null, error: 'Invalid hubUrl' };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = options.signal || null;

  function onExternalAbort() {
    controller.abort();
  }
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutHandle);
      return { ok: false, status: 0, rttMs: null, error: 'Aborted' };
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const startedAt = performance.now();
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`,
        'X-Ops-Probe-Id': String(config.nodeId || payload?.nodeId || ''),
        'User-Agent': `ops-probe/${PROBE_VERSION}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rttMs = Math.max(0, Math.round(performance.now() - startedAt));
    if (!response.ok) {
      let detail = '';
      try {
        // Never execute or evaluate response data; read a bounded snippet for diagnostics only.
        detail = (await response.text()).slice(0, 200).replace(/\s+/g, ' ').trim();
      } catch {
        detail = '';
      }
      return {
        ok: false,
        status: response.status,
        rttMs,
        error: `HTTP ${response.status}${detail ? `: ${detail}` : ''}`,
      };
    }

    // Drain response body without evaluating it (strictly push-only protocol).
    try {
      await response.body?.cancel();
    } catch {
      // Ignore cancel errors
    }

    return { ok: true, status: response.status, rttMs, error: null };
  } catch (error) {
    const rttMs = Math.max(0, Math.round(performance.now() - startedAt));
    const message = error?.name === 'AbortError'
      ? `Request timed out after ${timeoutMs}ms`
      : (error?.message || 'Network request failed');
    return { ok: false, status: 0, rttMs, error: message };
  } finally {
    clearTimeout(timeoutHandle);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

function computeBackoffMs(intervalSec, consecutiveFailures) {
  const baseMs = Math.max(intervalSec * 1000, MIN_INTERVAL_SEC * 1000);
  const exponent = Math.min(consecutiveFailures - 1, 10);
  return Math.min(MAX_BACKOFF_MS, baseMs * (2 ** exponent));
}

async function runCli(argv) {
  let cli;
  try {
    cli = parseCliArgs(argv);
  } catch (error) {
    process.stderr.write(`[ops-probe] ${error.message}\n`);
    process.exitCode = 2;
    return;
  }

  if (cli.showVersion) {
    process.stdout.write(`${PROBE_VERSION}\n`);
    return;
  }
  if (cli.showHelp) {
    printHelp();
    return;
  }

  let config;
  try {
    config = await loadProbeConfig({ cli });
  } catch (error) {
    process.stderr.write(`[ops-probe] ${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  if (!config.dryRun) {
    if (!config.hubUrl) {
      process.stderr.write('[ops-probe] Missing hubUrl. Set hubUrl in config or OPS_PROBE_HUB_URL (or pass --dry-run).\n');
      process.exitCode = 2;
      return;
    }
    if (!config.token) {
      process.stderr.write('[ops-probe] Missing token. Set token in config or OPS_PROBE_TOKEN (or pass --dry-run).\n');
      process.exitCode = 2;
      return;
    }
  }

  const shutdownController = new AbortController();
  const onShutdown = (signalName) => {
    if (!shutdownController.signal.aborted) {
      process.stderr.write(`[ops-probe] Received ${signalName}, shutting down cleanly.\n`);
      shutdownController.abort();
    }
  };
  process.once('SIGTERM', () => onShutdown('SIGTERM'));
  process.once('SIGINT', () => onShutdown('SIGINT'));

  const state = {
    prevCpu: null,
    prevNet: null,
    lastHubRttMs: null,
    a2aPeer: null,
  };

  if (config.a2a?.enabled) {
    try {
      state.a2aPeer = await startA2APeerServer(config);
      process.stderr.write(
        `[ops-probe] A2A v${A2A_PROTOCOL_VERSION} peer listening on ${state.a2aPeer.baseUrl} (card: ${state.a2aPeer.agentCardUrl})\n`,
      );
    } catch (error) {
      process.stderr.write(`[ops-probe] Failed to start A2A peer server: ${error.message}\n`);
      process.exitCode = 1;
      return;
    }
  }

  let consecutiveFailures = 0;

  try {
    while (!shutdownController.signal.aborted) {
      if (!config.dryRun && state.lastHubRttMs === null) {
        state.lastHubRttMs = await probeHubTcpRtt(config.hubUrl);
      }

      const payload = await collectProbeMetrics(config, state);

      if (config.dryRun) {
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        if (config.once) return;
        await sleep(config.intervalSec * 1000, shutdownController.signal);
        continue;
      }

      const result = await pushTelemetry(config, payload, {
        signal: shutdownController.signal,
      });

      if (result.ok) {
        consecutiveFailures = 0;
        state.lastHubRttMs = result.rttMs;
        if (config.once) return;
        await sleep(config.intervalSec * 1000, shutdownController.signal);
      } else {
        consecutiveFailures += 1;
        process.stderr.write(`[ops-probe] Push failed (attempt ${consecutiveFailures}): ${result.error}\n`);
        if (config.once) {
          process.exitCode = 1;
          return;
        }
        const backoffMs = computeBackoffMs(config.intervalSec, consecutiveFailures);
        process.stderr.write(`[ops-probe] Retrying in ${Math.round(backoffMs / 1000)}s.\n`);
        await sleep(backoffMs, shutdownController.signal);
      }
    }
  } finally {
    if (state.a2aPeer) {
      await state.a2aPeer.close();
    }
  }
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    const invokedPath = fsSync.realpathSync(process.argv[1]);
    const modulePath = fsSync.realpathSync(fileURLToPath(import.meta.url));
    return invokedPath === modulePath;
  } catch {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  }
}

if (isMainModule()) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`[ops-probe] Fatal error: ${error?.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
