#!/usr/bin/env node
import { execFile } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROBE_VERSION = '0.3.0';
export const SCHEMA_VERSION = 1;

const DEFAULT_INTERVAL_SEC = 30;
const MIN_INTERVAL_SEC = 5;
const MAX_INTERVAL_SEC = 3600;
const HTTP_TIMEOUT_MS = 8000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const DEFAULT_CPU_SAMPLE_MS = 250;
const WATCH_SERVICE_RE = /^[A-Za-z0-9@._:-]{1,128}$/;
const DEVICE_TYPES = new Set(['hub', 'server', 'edge', 'laptop', 'mobile', 'auto']);

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
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { timeout, maxBuffer, windowsHide: true },
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

  return {
    schemaVersion: SCHEMA_VERSION,
    probeVersion: PROBE_VERSION,
    nodeId: String(config.nodeId || os.hostname().toLowerCase()),
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
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--config' || arg === '-c') {
      if (index + 1 >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      parsed.configPath = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--config=')) {
      parsed.configPath = arg.slice('--config='.length);
    } else if (arg === '--once') {
      parsed.once = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--interval') {
      if (index + 1 >= argv.length) {
        throw new Error('Missing value for --interval');
      }
      parsed.intervalSec = Number(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('--interval=')) {
      parsed.intervalSec = Number(arg.slice('--interval='.length));
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
  -c, --config <path>   Path to JSON configuration file
  --interval <sec>      Push interval in seconds (${MIN_INTERVAL_SEC}-${MAX_INTERVAL_SEC}, default ${DEFAULT_INTERVAL_SEC})
  --once                Collect and send one snapshot, then exit
  --dry-run             Print JSON payload to stdout without contacting the hub
  --version             Print probe version
  -h, --help            Show this help message

Environment variables:
  OPS_PROBE_CONFIG      Config file path
  OPS_PROBE_HUB_URL     Hub base URL (e.g. https://hub.example.ts.net)
  OPS_PROBE_NODE_ID     Node identifier (e.g. edge-node-01)
  OPS_PROBE_TOKEN       Per-node Bearer token
  OPS_PROBE_INTERVAL    Push interval in seconds
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

  const hubUrl = String(env.OPS_PROBE_HUB_URL || fileConfig.hubUrl || '').trim();
  const defaultNodeId = os.hostname().toLowerCase();
  const nodeId = String(env.OPS_PROBE_NODE_ID || fileConfig.nodeId || defaultNodeId).trim() || defaultNodeId;
  const token = String(env.OPS_PROBE_TOKEN || fileConfig.token || '').trim();
  const rawDeviceType = String(fileConfig.deviceType || 'auto').trim().toLowerCase();
  const deviceType = DEVICE_TYPES.has(rawDeviceType) ? rawDeviceType : 'auto';
  const mounts = Array.isArray(fileConfig.mounts) && fileConfig.mounts.length > 0
    ? fileConfig.mounts.filter((mount) => typeof mount === 'string' && mount.startsWith('/') && !mount.includes('\0'))
    : ['/'];
  const watchServices = normalizeWatchServices(fileConfig.watchServices);
  const detectAgents = fileConfig.detectAgents !== false;

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
  };

  let consecutiveFailures = 0;

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
