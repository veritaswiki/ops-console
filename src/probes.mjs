import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { maskClientIp } from './redact.mjs';
import { safeEqualString } from './security.mjs';

const NODE_ID_RE = /^[a-z0-9][a-z0-9._-]{1,47}$/;
const VALID_DEVICE_TYPES = new Set(['hub', 'server', 'edge', 'laptop', 'mobile']);
const VALID_PROBE_MODES = new Set(['local', 'push', 'checkin', 'tailscale-only', 'ssh', 'external']);

export const DERP_COORDS = {
  pek: { region: 'Beijing', lat: 39.9, lon: 116.4 },
  sha: { region: 'Shanghai', lat: 31.23, lon: 121.47 },
  hkg: { region: 'Hong Kong', lat: 22.32, lon: 114.17 },
  tok: { region: 'Tokyo', lat: 35.68, lon: 139.69 },
  sel: { region: 'Seoul', lat: 37.56, lon: 126.98 },
  sin: { region: 'Singapore', lat: 1.35, lon: 103.82 },
  sjc: { region: 'San Jose, US', lat: 37.34, lon: -121.89 },
  sfo: { region: 'San Francisco, US', lat: 37.77, lon: -122.42 },
  lax: { region: 'Los Angeles, US', lat: 34.05, lon: -118.24 },
  sea: { region: 'Seattle, US', lat: 47.61, lon: -122.33 },
  nyc: { region: 'New York, US', lat: 40.71, lon: -74.01 },
  fra: { region: 'Frankfurt, DE', lat: 50.11, lon: 8.68 },
  lhr: { region: 'London, UK', lat: 51.51, lon: -0.13 },
  syd: { region: 'Sydney, AU', lat: -33.87, lon: 151.21 },
};

export function normalizeIp(rawIp) {
  let ip = String(rawIp || '').trim();
  if (!ip) return '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  const zoneIdx = ip.indexOf('%');
  if (zoneIdx !== -1) ip = ip.slice(0, zoneIdx);
  return ip.toLowerCase();
}

export function isTailscaleOrLoopbackIp(rawIp) {
  const ip = normalizeIp(rawIp);
  if (!ip) return false;
  if (ip === '::1') return true;
  if (ip.startsWith('fd7a:115c:a1e0:')) return true;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((p) => Number(p));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  if (octets[0] === 127) return true;
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  return false;
}

export function hashProbeToken(token, salt = crypto.randomBytes(16).toString('hex')) {
  const digest = crypto.createHash('sha256').update(`${salt}:${token}`).digest('hex');
  return `${salt}:${digest}`;
}

export function verifyProbeToken(token, storedHash) {
  if (!token || !storedHash || typeof storedHash !== 'string') return false;
  const idx = storedHash.indexOf(':');
  if (idx <= 0) return false;
  const salt = storedHash.slice(0, idx);
  const expected = storedHash.slice(idx + 1);
  const actual = crypto.createHash('sha256').update(`${salt}:${token}`).digest('hex');
  return safeEqualString(actual, expected);
}

export function generateProbeToken() {
  return `ops_prb_${crypto.randomBytes(24).toString('hex')}`;
}

export function validateNodeId(nodeId) {
  return typeof nodeId === 'string' && NODE_ID_RE.test(nodeId);
}

function clampNum(value, min, max, fallback = null) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function cleanStr(value, maxLen = 120) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLen);
}

export function formatRelativeDurationZh(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '未知时间';
  const sec = Math.round(seconds);
  if (sec < 60) return `${sec} 秒`;
  if (sec < 3600) return `${Math.round(sec / 60)} 分钟`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1).replace(/\.0$/, '')} 小时`;
  return `${Math.round(sec / 86400)} 天`;
}

function formatLastSeenAgo(isoStr, nowMs) {
  if (!isoStr) return '';
  const ts = Date.parse(isoStr);
  if (!Number.isFinite(ts)) return '';
  const diffSec = Math.max(0, (nowMs - ts) / 1000);
  return `${formatRelativeDurationZh(diffSec)}前`;
}

function mapTcpErrorReason(errCode, port, fallbackMsg = '') {
  switch (errCode) {
    case 'ETIMEDOUT':
      return `TCP 探测超时（:${port}，目标主机无响应或被防火墙丢弃）`;
    case 'ECONNREFUSED':
      return `TCP 连接被拒绝（:${port} 端口未监听或服务已停止）`;
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
      return `网络路由不可达（:${port}）`;
    case 'ENOTFOUND':
      return `DNS 解析失败（:${port}）`;
    case 'ECONNRESET':
      return `TCP 连接被对端重置（:${port}）`;
    default:
      return `TCP 探测失败（:${port}${errCode ? ` · ${errCode}` : fallbackMsg ? ` · ${fallbackMsg}` : ''}）`;
  }
}

export function probeTcpEndpoint(host, port, timeoutMs = 2200) {
  return new Promise((resolve) => {
    const started = Date.now();
    const checkedAt = new Date(started).toISOString();
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      resolve({
        reachable: false,
        port: port || null,
        protocol: 'tcp',
        rttMs: null,
        errorCode: 'EINVAL',
        error: '无效的探测地址或端口',
        checkedAt,
      });
      return;
    }

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore cleanup error
      }
      resolve(result);
    };

    const socket = net.createConnection({ host, port });
    socket.setTimeout(Math.min(5000, Math.max(300, Number(timeoutMs) || 2200)));

    socket.once('connect', () => {
      finish({
        reachable: true,
        port,
        protocol: 'tcp',
        rttMs: Math.max(1, Date.now() - started),
        errorCode: null,
        error: null,
        checkedAt,
      });
    });

    socket.once('timeout', () => {
      finish({
        reachable: false,
        port,
        protocol: 'tcp',
        rttMs: Date.now() - started,
        errorCode: 'ETIMEDOUT',
        error: mapTcpErrorReason('ETIMEDOUT', port),
        checkedAt,
      });
    });

    socket.once('error', (err) => {
      const code = err?.code || 'ERR_TCP';
      finish({
        reachable: false,
        port,
        protocol: 'tcp',
        rttMs: Date.now() - started,
        errorCode: code,
        error: mapTcpErrorReason(code, port, cleanStr(err?.message || '', 80)),
        checkedAt,
      });
    });
  });
}

export async function probeExternalDeclaredNodes(declaredNodes = []) {
  const targets = (Array.isArray(declaredNodes) ? declaredNodes : []).filter(
    (node) => node?.id && node.probeHost && Number.isInteger(Number(node.probePort)),
  );
  if (targets.length === 0) return {};
  const entries = await Promise.all(
    targets.map(async (node) => {
      const res = await probeTcpEndpoint(
        String(node.probeHost).trim(),
        Number(node.probePort),
        Number(node.probeTimeoutMs) || 2200,
      );
      return [node.id, res];
    }),
  );
  return Object.fromEntries(entries);
}

export function diagnoseNodeStatus({
  probeMode,
  probeEnrolled,
  probeLive,
  probeFresh,
  hasTelemetry,
  ageMs,
  staleMs,
  offlineMs,
  peer,
  sshRem,
  extCheck,
  isMobile,
  isExternal,
  decl = {},
  nowMs = Date.now(),
}) {
  const peerHasDirectAddr = Boolean(peer?.curAddr && peer.curAddr !== 'none');
  const peerLastSeenAgo = formatLastSeenAgo(peer?.lastSeen, nowMs);
  const expectedReason = cleanStr(decl?.expectedOfflineReason || '', 240);
  const knownOffline = decl?.knownStatus === 'offline';

  let status = 'offline';
  let transport = 'offline';
  let statusReason = '';
  let offlineReason = null;
  let offlineCategory = null;

  if (probeFresh) {
    status = 'healthy';
    transport = peer?.online
      ? (peerHasDirectAddr ? 'direct' : (peer.relay ? 'relay' : 'direct'))
      : (isMobile ? 'checkin' : 'direct');
    statusReason = isMobile ? '移动端签到在线' : 'ops-probe 实时遥测正常';
  } else if (probeLive) {
    status = 'degraded';
    transport = peer?.online
      ? (peerHasDirectAddr ? 'direct' : (peer.relay ? 'relay' : 'direct'))
      : (isMobile ? 'checkin' : 'direct');
    const ageLabel = formatRelativeDurationZh(ageMs / 1000);
    statusReason = `探针心跳延迟（最近上报 ${ageLabel}前，超过 ${Math.round(staleMs / 1000)}s 预期）`;
    offlineReason = statusReason;
    offlineCategory = 'probe_stale';
  } else if (sshRem?.reachable) {
    status = 'healthy';
    transport = peer?.online ? (peerHasDirectAddr ? 'direct' : (peer.relay ? 'relay' : 'direct')) : 'ssh';
    statusReason = 'SSH 主动巡检可达';
  } else if (isExternal) {
    transport = 'external';
    if (knownOffline) {
      status = 'offline';
      transport = 'offline';
      const probeSuffix = extCheck
        ? (extCheck.reachable ? `（TCP :${extCheck.port} 仅端口可达 ${extCheck.rttMs}ms）` : `（${extCheck.error}）`)
        : '';
      offlineReason = `${expectedReason || '外部出口节点已知故障不可用'}${probeSuffix}`;
      statusReason = offlineReason;
      offlineCategory = 'external_degraded';
    } else if (extCheck?.reachable) {
      status = 'healthy';
      statusReason = `外部节点 TCP :${extCheck.port} 探测可达（${extCheck.rttMs}ms）`;
    } else if (extCheck && !extCheck.reachable) {
      status = 'offline';
      transport = 'offline';
      offlineReason = expectedReason ? `${extCheck.error}；${expectedReason}` : extCheck.error;
      statusReason = offlineReason;
      offlineCategory = extCheck.errorCode === 'ECONNREFUSED' ? 'tcp_refused' : 'tcp_timeout';
    } else {
      status = 'standby';
      statusReason = expectedReason || '外部代理/出口节点（未配置主动 TCP 或 ops-probe 探测）';
      offlineCategory = 'standby_no_probe';
    }
  } else if (peer?.online) {
    status = isMobile ? 'healthy' : 'standby';
    transport = peerHasDirectAddr ? 'direct' : (peer.relay ? 'relay' : 'direct');
    if (hasTelemetry && Number.isFinite(ageMs)) {
      const ageLabel = formatRelativeDurationZh(ageMs / 1000);
      statusReason = `Tailscale 在线（${peerHasDirectAddr ? '直连' : `DERP ${peer.relay}`}），但 ops-probe 已断连 ${ageLabel}（疑似探针进程停止）`;
      offlineReason = statusReason;
      offlineCategory = 'probe_timeout';
    } else if (isMobile) {
      statusReason = 'Tailscale 在线';
    } else {
      statusReason = `Tailscale 在线（${peerHasDirectAddr ? '直连' : `DERP ${peer.relay}`}），尚未部署或上报 ops-probe`;
      offlineCategory = 'standby_no_probe';
    }
  } else if (isMobile) {
    if (hasTelemetry && Number.isFinite(ageMs)) {
      status = 'offline';
      transport = 'offline';
      const ageLabel = formatRelativeDurationZh(ageMs / 1000);
      offlineReason = `移动端签到已超时（最后签到 ${ageLabel}前，超过 ${Math.round(offlineMs / 3600000)} 小时窗口）`;
      statusReason = offlineReason;
      offlineCategory = 'probe_timeout';
    } else {
      status = 'standby';
      transport = 'checkin';
      statusReason = expectedReason || '移动端按需签到模式（尚未收到签到上报，未加入固定 Tailnet）';
      offlineCategory = 'standby_no_probe';
    }
  } else {
    status = 'offline';
    transport = 'offline';
    const parts = [];
    if (expectedReason) parts.push(expectedReason);
    if (sshRem && !sshRem.reachable && sshRem.error) {
      parts.push(`SSH 探测失败：${sshRem.error}`);
      offlineCategory = 'ssh_error';
    }
    if (peer) {
      if (peer.expired) {
        parts.push('Tailscale 节点密钥已过期');
        offlineCategory = offlineCategory || 'tailscale_expired';
      } else {
        const tsDetail = [
          peerLastSeenAgo ? `最后在线 ${peerLastSeenAgo}` : '近期未上线',
          peer.relay ? `relay ${peer.relay}` : '',
        ].filter(Boolean).join(' · ');
        parts.push(`Tailscale 对等体离线（${tsDetail}）`);
        offlineCategory = offlineCategory || 'tailscale_offline';
      }
    }
    if (hasTelemetry && Number.isFinite(ageMs)) {
      parts.push(`ops-probe 心跳超时（最后上报 ${formatRelativeDurationZh(ageMs / 1000)}前，阈值 ${Math.round(offlineMs / 1000)}s）`);
      offlineCategory = offlineCategory || 'probe_timeout';
    } else if (probeMode === 'push' || probeEnrolled) {
      parts.push(probeEnrolled ? '已注册探针但尚未收到心跳上报' : '未部署 ops-probe 遥测');
      offlineCategory = offlineCategory || 'probe_never_seen';
    } else if (!peer && !sshRem) {
      parts.push('未收到探针心跳，且当前 Tailnet 中未发现该节点');
      offlineCategory = offlineCategory || 'probe_never_seen';
    }
    offlineReason = parts.join('；');
    statusReason = offlineReason;
  }

  return { status, transport, statusReason, offlineReason, offlineCategory };
}

export function sanitizeProbePayload(raw, expectedNodeId) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Telemetry payload must be a JSON object');
  }
  const nodeId = cleanStr(raw.nodeId || expectedNodeId, 48).toLowerCase();
  if (!validateNodeId(nodeId)) {
    throw new Error('Invalid nodeId in telemetry payload');
  }
  if (expectedNodeId && nodeId !== expectedNodeId) {
    throw new Error('Payload nodeId does not match authenticated probe token');
  }

  const deviceType = VALID_DEVICE_TYPES.has(raw.deviceType) ? raw.deviceType : 'server';
  const disks = Array.isArray(raw.disks)
    ? raw.disks.slice(0, 8).map((disk) => ({
        mount: cleanStr(disk?.mount || '/', 64),
        totalBytes: clampNum(disk?.totalBytes, 0, 1e16, 0),
        usedBytes: clampNum(disk?.usedBytes, 0, 1e16, 0),
        usedPct: clampNum(disk?.usedPct, 0, 100, 0),
      }))
    : [];

  const services = Array.isArray(raw.services)
    ? raw.services.slice(0, 32).map((svc) => ({
        name: cleanStr(svc?.name || '', 128),
        status: cleanStr(svc?.status || 'unknown', 32),
      })).filter((svc) => svc.name)
    : [];

  let battery = null;
  if (raw.battery && typeof raw.battery === 'object' && !Array.isArray(raw.battery)) {
    const pct = clampNum(raw.battery.percent, 0, 100, null);
    if (pct !== null) {
      battery = {
        percent: Math.round(pct),
        charging: Boolean(raw.battery.charging),
        source: cleanStr(raw.battery.source || '', 48),
      };
    }
  }

  let tailscale = null;
  if (raw.tailscale && typeof raw.tailscale === 'object' && !Array.isArray(raw.tailscale)) {
    tailscale = {
      available: Boolean(raw.tailscale.available),
      online: Boolean(raw.tailscale.online),
      ip: cleanStr(raw.tailscale.ip || '', 64),
      dnsName: cleanStr(raw.tailscale.dnsName || '', 128),
      relay: cleanStr(raw.tailscale.relay || '', 32),
      peersOnline: clampNum(raw.tailscale.peersOnline, 0, 10000, 0),
    };
  }

  let network = null;
  if (raw.network && typeof raw.network === 'object' && !Array.isArray(raw.network)) {
    network = {
      rxBytesPerSec: clampNum(raw.network.rxBytesPerSec, 0, 1e13, null),
      txBytesPerSec: clampNum(raw.network.txBytesPerSec, 0, 1e13, null),
      type: cleanStr(raw.network.type || '', 32),
    };
  }

  const categories = {};
  if (raw.agents?.categories && typeof raw.agents.categories === 'object' && !Array.isArray(raw.agents.categories)) {
    for (const [key, val] of Object.entries(raw.agents.categories).slice(0, 12)) {
      const cleanKey = cleanStr(key, 32);
      if (cleanKey && cleanKey !== '__proto__' && cleanKey !== 'constructor' && cleanKey !== 'prototype') {
        categories[cleanKey] = clampNum(val, 0, 10000, 0);
      }
    }
  }

  return {
    schemaVersion: clampNum(raw.schemaVersion, 1, 10, 1),
    probeVersion: cleanStr(raw.probeVersion || '0.4.0', 24),
    nodeId,
    sentAt: cleanStr(raw.sentAt || new Date().toISOString(), 40),
    deviceType,
    platform: cleanStr(raw.platform || 'unknown', 32),
    arch: cleanStr(raw.arch || '', 32),
    hostname: cleanStr(raw.hostname || nodeId, 96),
    kernel: cleanStr(raw.kernel || '', 64),
    uptimeSec: clampNum(raw.uptimeSec, 0, 1e10, null),
    cpu: raw.cpu && typeof raw.cpu === 'object'
      ? {
          cores: clampNum(raw.cpu.cores, 0, 1024, null),
          usagePct: clampNum(raw.cpu.usagePct, 0, 100, null),
          load1: clampNum(raw.cpu.load1, 0, 2000, null),
          load5: clampNum(raw.cpu.load5, 0, 2000, null),
          load15: clampNum(raw.cpu.load15, 0, 2000, null),
        }
      : null,
    memory: raw.memory && typeof raw.memory === 'object'
      ? {
          totalBytes: clampNum(raw.memory.totalBytes, 0, 1e15, null),
          usedBytes: clampNum(raw.memory.usedBytes, 0, 1e15, null),
          availableBytes: clampNum(raw.memory.availableBytes, 0, 1e15, null),
          usedPct: clampNum(raw.memory.usedPct, 0, 100, null),
        }
      : null,
    disks,
    network,
    battery,
    tailscale,
    services,
    agents: {
      count: clampNum(raw.agents?.count, 0, 10000, 0),
      categories,
    },
    mcps: Array.isArray(raw.mcps)
      ? raw.mcps
          .filter((m) => m && typeof m === 'object' && m.name)
          .slice(0, 32)
          .map((m) => ({
            id: cleanStr(m.id || '', 64) || null,
            name: cleanStr(m.name, 80),
            transport: cleanStr(m.transport || 'streamable-http', 24),
            endpoint: cleanStr(m.endpoint || '', 200) || null,
            command: cleanStr(m.command || '', 120) || null,
            enabled: m.enabled !== false,
            status: cleanStr(m.status || 'healthy', 24),
            toolsCount: clampNum(m.toolsCount, 0, 1000, 0),
            latencyMs: clampNum(m.latencyMs, 0, 60000, null),
            scope: cleanStr(m.scope || 'node-reported', 32),
          }))
      : [],
    harnesses: Array.isArray(raw.harnesses)
      ? raw.harnesses
          .filter((h) => h && typeof h === 'object' && h.name)
          .slice(0, 16)
          .map((h) => ({
            id: cleanStr(h.id || '', 64) || null,
            name: cleanStr(h.name, 80),
            harness: cleanStr(h.harness || 'custom-a2a', 32),
            status: cleanStr(h.status || 'healthy', 24),
            agentCardUrl: cleanStr(h.agentCardUrl || '', 200) || null,
            rpcUrl: cleanStr(h.rpcUrl || '', 200) || null,
            modelHint: cleanStr(h.modelHint || '', 64) || null,
            delegatable: h.delegatable !== false,
            skills: Array.isArray(h.skills) ? h.skills.slice(0, 12) : [],
          }))
      : [],
    regionOverride: cleanStr(raw.region || '', 64),
    note: cleanStr(raw.note || '', 120),
    hubRttMs: clampNum(raw.hubRttMs, 0, 60000, null),
  };
}

function parseSshMemory(raw) {
  const match = String(raw || '').match(/(\d+)\s*\/\s*(\d+)\s*MB/i);
  if (!match) return null;
  const usedMb = Number(match[1]);
  const totalMb = Number(match[2]);
  if (!totalMb) return null;
  return {
    usedBytes: usedMb * 1024 * 1024,
    totalBytes: totalMb * 1024 * 1024,
    usedPct: Math.round((usedMb / totalMb) * 1000) / 10,
  };
}

function parseSshDisk(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  const pctMatch = text.match(/\((\d+(?:\.\d+)?)%\)/);
  return [{
    mount: '/',
    totalBytes: null,
    usedBytes: null,
    usedPct: pctMatch ? Number(pctMatch[1]) : null,
    summary: text,
  }];
}

export class ProbeRegistry {
  constructor({ config, logger, timeseries }) {
    this.config = config;
    this.logger = logger;
    this.timeseries = timeseries;
    this.storePath = path.join(config.console.dataDir, 'probes.json');
    this.statePath = path.join(config.console.dataDir, 'probes-state.json');
    this.records = new Map();
    this.telemetry = new Map();
    this._persistTimer = null;
    this._persistDirty = false;
    this._persistInFlight = null;
    this._loadSync();
  }

  _loadSync() {
    if (this.config.demo) return;
    try {
      if (fs.existsSync(this.storePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
        const list = Array.isArray(parsed?.probes) ? parsed.probes : [];
        for (const rec of list) {
          if (rec?.id && validateNodeId(rec.id)) {
            this.records.set(rec.id, rec);
          }
        }
      }
    } catch (err) {
      this.logger?.warn('probe_registry_load_failed', { error: err.message });
    }
    try {
      if (fs.existsSync(this.statePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
        const map = parsed?.telemetry && typeof parsed.telemetry === 'object' ? parsed.telemetry : {};
        for (const [id, entry] of Object.entries(map)) {
          if (validateNodeId(id) && entry && typeof entry === 'object') {
            this.telemetry.set(id, entry);
          }
        }
      }
    } catch {
      // optional cache
    }
  }

  async _persistRecords() {
    if (this.config.demo) return;
    await fsp.mkdir(path.dirname(this.storePath), { recursive: true, mode: 0o700 });
    const payload = JSON.stringify(
      { version: 1, updatedAt: new Date().toISOString(), probes: [...this.records.values()] },
      null,
      2,
    );
    const tmp = `${this.storePath}.tmp.${process.pid}`;
    await fsp.writeFile(tmp, `${payload}\n`, { mode: 0o600 });
    await fsp.rename(tmp, this.storePath);
  }

  _schedulePersistTelemetryState() {
    if (this.config.demo) return;
    this._persistDirty = true;
    if (this._persistTimer) return;
    this._persistTimer = setTimeout(() => {
      this._persistTimer = null;
      this._persistTelemetryState().catch(() => {});
    }, 500);
    if (typeof this._persistTimer.unref === 'function') {
      this._persistTimer.unref();
    }
  }

  async _persistTelemetryState() {
    if (this.config.demo) return;
    if (this._persistInFlight) {
      this._persistDirty = true;
      return this._persistInFlight;
    }
    this._persistDirty = false;
    const run = (async () => {
      try {
        await fsp.mkdir(path.dirname(this.statePath), { recursive: true, mode: 0o700 });
        const obj = {};
        for (const [id, entry] of this.telemetry.entries()) {
          obj[id] = entry;
        }
        const tmp = `${this.statePath}.tmp.${process.pid}.${Date.now()}`;
        await fsp.writeFile(tmp, JSON.stringify({ updatedAt: new Date().toISOString(), telemetry: obj }), { mode: 0o600 });
        await fsp.rename(tmp, this.statePath);
      } catch {
        // non-fatal state cache
      } finally {
        this._persistInFlight = null;
        if (this._persistDirty) {
          this._schedulePersistTelemetryState();
        }
      }
    })();
    this._persistInFlight = run;
    return run;
  }

  async flush() {
    if (this._persistTimer) {
      clearTimeout(this._persistTimer);
      this._persistTimer = null;
    }
    if (this._persistInFlight) {
      await this._persistInFlight;
    }
    if (this._persistDirty) {
      await this._persistTelemetryState();
    }
  }

  listEnrolled() {
    const exposeIps = Boolean(this.config.security?.exposeClientIps);
    return [...this.records.values()].map((rec) => {
      const rawIp = this.telemetry.get(rec.id)?.sourceIp || null;
      return {
        id: rec.id,
        name: rec.name,
        deviceType: rec.deviceType,
        probeMode: rec.probeMode,
        role: rec.role,
        region: rec.region,
        provider: rec.provider,
        lat: rec.lat,
        lon: rec.lon,
        tailscaleIp: rec.tailscaleIp || '',
        scopes: rec.scopes || ['telemetry:write'],
        createdAt: rec.createdAt,
        rotatedAt: rec.rotatedAt || rec.createdAt,
        lastSeenAt: this.telemetry.get(rec.id)?.receivedAt || null,
        lastSourceIp: rawIp ? (exposeIps ? rawIp : maskClientIp(rawIp)) : null,
      };
    });
  }

  async enroll({ id, name, deviceType = 'server', probeMode = 'push', role = '', region = '', provider = '', lat = null, lon = null, tailscaleIp = '' }) {
    const cleanId = cleanStr(id, 48).toLowerCase();
    if (!validateNodeId(cleanId)) {
      throw new Error('Node ID must be 2-48 lowercase letters, digits, dots, underscores, or hyphens');
    }
    const maxProbes = this.config.fleet?.maxProbes || 128;
    if (!this.records.has(cleanId) && this.records.size >= maxProbes) {
      throw new Error(`Probe registry limit reached (maxProbes=${maxProbes})`);
    }
    const cleanType = VALID_DEVICE_TYPES.has(deviceType) ? deviceType : 'server';
    const cleanMode = VALID_PROBE_MODES.has(probeMode) ? probeMode : (cleanType === 'mobile' ? 'checkin' : 'push');
    const token = generateProbeToken();
    const tokenHash = hashProbeToken(token);
    const now = new Date().toISOString();
    const existing = this.records.get(cleanId);

    const record = {
      id: cleanId,
      name: cleanStr(name || cleanId, 64),
      deviceType: cleanType,
      probeMode: cleanMode,
      role: cleanStr(role || (cleanType === 'mobile' ? 'Mobile Entry' : cleanType === 'laptop' ? 'Workstation' : 'Managed Node'), 80),
      region: cleanStr(region || 'Unassigned', 64),
      provider: cleanStr(provider || '', 48),
      lat: clampNum(lat, -85, 85, existing?.lat ?? null),
      lon: clampNum(lon, -180, 180, existing?.lon ?? null),
      tailscaleIp: cleanStr(tailscaleIp || existing?.tailscaleIp || '', 64),
      scopes: ['telemetry:write'],
      tokenHash,
      createdAt: existing?.createdAt || now,
      rotatedAt: now,
    };

    this.records.set(cleanId, record);
    await this._persistRecords();

    const hubHost = this.config.console.hosts.find((host) => host !== '127.0.0.1' && host !== '::1' && host !== '0.0.0.0')
      || this.config.console.hosts[0]
      || '127.0.0.1';
    const hubUrl = `http://${hubHost}:${this.config.console.port}`;

    const installHints = buildInstallHints({ hubUrl, nodeId: record.id, token, deviceType: record.deviceType, region: record.region });
    return {
      node: {
        id: record.id,
        name: record.name,
        deviceType: record.deviceType,
        probeMode: record.probeMode,
        region: record.region,
        lat: record.lat,
        lon: record.lon,
        scopes: record.scopes,
      },
      token,
      hubUrl,
      installHints,
      snippets: {
        linux: installHints.linuxSystemd,
        macos: installHints.macosLaunchAgent,
        curl: installHints.mobileCheckinCurl,
      },
    };
  }

  async revoke(nodeId) {
    const cleanId = cleanStr(nodeId, 48).toLowerCase();
    if (!this.records.has(cleanId)) {
      return { ok: false, error: `Probe not enrolled: ${cleanId}` };
    }
    this.records.delete(cleanId);
    this.telemetry.delete(cleanId);
    await this._persistRecords();
    await this._persistTelemetryState();
    return { ok: true, id: cleanId };
  }

  authenticateProbe(nodeId, bearerToken) {
    const cleanId = cleanStr(nodeId, 48).toLowerCase();
    if (!validateNodeId(cleanId)) return null;
    const record = this.records.get(cleanId);
    if (!record) return null;
    if (!verifyProbeToken(bearerToken, record.tokenHash)) return null;
    return record;
  }

  async ingest({ nodeId, payload, sourceIp, via = 'probe-token' }) {
    const sanitized = sanitizeProbePayload(payload, nodeId);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const entry = {
      receivedAt: nowIso,
      receivedMs: nowMs,
      sourceIp: normalizeIp(sourceIp),
      via,
      data: sanitized,
    };
    this.telemetry.set(sanitized.nodeId, entry);

    const primaryDisk = sanitized.disks[0] || null;
    this.timeseries?.record(`node:${sanitized.nodeId}`, {
      ts: nowMs,
      cpuPct: sanitized.cpu?.usagePct ?? null,
      memPct: sanitized.memory?.usedPct ?? null,
      diskPct: primaryDisk?.usedPct ?? null,
      load1: sanitized.cpu?.load1 ?? null,
      rttMs: sanitized.hubRttMs ?? null,
      batteryPct: sanitized.battery?.percent ?? null,
    });

    this._schedulePersistTelemetryState();
    return { ok: true, nodeId: sanitized.nodeId, receivedAt: nowIso };
  }

  buildFleetView({ snapshot, remotes = [], externalChecks = {} }) {
    const fleetCfg = this.config.fleet || {};
    const staleMs = (fleetCfg.probeStaleSec || 90) * 1000;
    const offlineMs = (fleetCfg.probeOfflineSec || 180) * 1000;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const tsRaw = snapshot?.tailscale || snapshot?.network?.tailscale || {};
    const tsDevices = Array.isArray(tsRaw.devices) ? tsRaw.devices : [];
    const tsSelf = tsRaw.self || tsDevices.find((d) => d.isSelf) || null;
    const tsPeers = Array.isArray(tsRaw.peers)
      ? tsRaw.peers
      : tsDevices.filter((d) => !d.isSelf);
    const matchedPeerIps = new Set();

    // O(M) pre-indexing replaces O(N*M) linear scan inside candidate loop
    const peerByIp = new Map();
    const peerByName = new Map();
    const peerByDnsPrefix = new Map();
    const peerEntries = [];
    for (const peer of tsPeers) {
      const peerIp = normalizeIp(peer.ip);
      const peerName = String(peer.name || '').toLowerCase();
      const peerDns = String(peer.dnsName || '').toLowerCase();
      const dotIdx = peerDns.indexOf('.');
      const dnsPrefix = dotIdx > 0 ? peerDns.slice(0, dotIdx) : peerDns;
      if (peerIp && !peerByIp.has(peerIp)) peerByIp.set(peerIp, peer);
      if (peerName && !peerByName.has(peerName)) peerByName.set(peerName, peer);
      if (dnsPrefix && !peerByDnsPrefix.has(dnsPrefix)) peerByDnsPrefix.set(dnsPrefix, peer);
      peerEntries.push({ peer, peerIp, peerName });
    }

    const markMatched = (peer) => {
      const ip = normalizeIp(peer.ip);
      if (ip) matchedPeerIps.add(ip);
      return peer;
    };

    const findMatchingPeer = (tailscaleIp, id, name) => {
      const targetIp = normalizeIp(tailscaleIp);
      if (targetIp) {
        const hit = peerByIp.get(targetIp);
        if (hit) return markMatched(hit);
      }
      if (id) {
        const idLower = id.toLowerCase();
        const hit = peerByName.get(idLower) || peerByDnsPrefix.get(idLower);
        if (hit) return markMatched(hit);
      }
      if (name) {
        const nameLower = String(name).toLowerCase();
        const exact = peerByName.get(nameLower);
        if (exact) return markMatched(exact);
        for (const entry of peerEntries) {
          if (entry.peerName && entry.peerName.includes(nameLower)) {
            if (entry.peerIp) matchedPeerIps.add(entry.peerIp);
            return entry.peer;
          }
        }
      }
      return null;
    };

    const nodesById = new Map();

    const localCfg = fleetCfg.localNode || {};
    const localId = localCfg.id || 'hub-primary';
    const host = snapshot?.host || {};
    const hostCpuCores = host.cpuCores ?? host.cpuCount ?? null;
    const hostMemTotal = host.memory?.totalBytes ?? host.memTotalBytes ?? null;
    const hostMemUsed = host.memory?.usedBytes ?? host.memUsedBytes ?? null;
    const hostMemPct = host.memory?.usedPercent ?? host.memPct ?? null;
    const hostUptimeSec = host.uptimeSeconds ?? host.uptimeSec ?? null;
    const hostDisks = (host.disks || []).map((disk) => ({
      mount: disk.mount,
      totalBytes: disk.sizeBytes ?? disk.totalBytes ?? null,
      usedBytes: disk.usedBytes ?? null,
      usedPct: disk.usePercent ?? disk.usedPct ?? null,
    }));
    const primaryDisk = hostDisks[0] || null;
    const svcList = Array.isArray(snapshot?.services)
      ? snapshot.services
      : (Array.isArray(snapshot?.services?.items) ? snapshot.services.items : []);
    const svcHealthy = svcList.filter((svc) => svc.status === 'healthy').length;
    const localCpuPct = hostCpuCores > 0
      ? Math.min(100, Math.round((Number(host.load1 || 0) / hostCpuCores) * 1000) / 10)
      : null;

    this.timeseries?.record(`node:${localId}`, {
      ts: nowMs,
      cpuPct: localCpuPct,
      memPct: hostMemPct,
      diskPct: primaryDisk?.usedPct ?? null,
      load1: host.load1 ?? null,
      rttMs: 0,
      batteryPct: null,
    });

    nodesById.set(localId, {
      id: localId,
      name: localCfg.name || host.hostname || 'Hub Primary',
      deviceType: 'hub',
      role: localCfg.role || 'Primary Control Plane',
      region: localCfg.region || 'Local Hub',
      provider: localCfg.provider || 'Self-Hosted',
      lat: Number.isFinite(Number(localCfg.lat)) ? Number(localCfg.lat) : 31.23,
      lon: Number.isFinite(Number(localCfg.lon)) ? Number(localCfg.lon) : 121.47,
      status: 'healthy',
      probeMode: 'local',
      probeEnrolled: true,
      probeLive: true,
      probeAgeSec: 0,
      transport: 'local',
      tailscaleIp: tsSelf?.ip || localCfg.tailscaleIp || '',
      tailscaleDns: tsSelf?.dnsName || '',
      relay: tsSelf?.relay || '',
      os: host.platform || process.platform,
      arch: host.arch || process.arch,
      kernel: host.kernel || '',
      uptimeSec: hostUptimeSec,
      cpu: { cores: hostCpuCores, usagePct: localCpuPct, load1: host.load1 ?? null, load5: host.load5 ?? null, load15: host.load15 ?? null },
      memory: { totalBytes: hostMemTotal, usedBytes: hostMemUsed, usedPct: hostMemPct },
      disks: hostDisks,
      battery: null,
      network: null,
      servicesSummary: { healthy: svcHealthy, total: svcList.length },
      watchedServices: svcList.slice(0, 12).map((svc) => ({ name: svc.name, status: svc.activeState || svc.status })),
      agentsCount: snapshot?.agents?.totalProcesses ?? snapshot?.agents?.total ?? 0,
      rttMs: 0,
      lastSeenAt: snapshot?.collectedAt || new Date(nowMs).toISOString(),
      statusReason: '主控制面本机在线',
      offlineReason: null,
      offlineCategory: null,
      scopes: ['hub:local'],
      history: this.timeseries?.get(`node:${localId}`, 24) || [],
    });

    const remoteById = new Map((remotes || []).map((rem) => [rem.id, rem]));
    const declaredList = Array.isArray(fleetCfg.declaredNodes) ? fleetCfg.declaredNodes : [];
    const candidateIds = new Set([
      ...declaredList.map((node) => node.id),
      ...this.records.keys(),
      ...this.telemetry.keys(),
      ...remoteById.keys(),
    ]);
    candidateIds.delete(localId);

    const declaredById = new Map(declaredList.map((node) => [node.id, node]));

    for (const id of candidateIds) {
      const decl = declaredById.get(id) || {};
      const rec = this.records.get(id) || null;
      const tele = this.telemetry.get(id) || null;
      const sshRem = remoteById.get(id) || null;

      const knownIp = tele?.data?.tailscale?.ip || rec?.tailscaleIp || decl.tailscaleIp || sshRem?.ip || '';
      const peer = findMatchingPeer(knownIp, id, decl.name || rec?.name);

      const ageMs = tele?.receivedMs ? Math.max(0, nowMs - tele.receivedMs) : Infinity;
      const isMobile = (tele?.data?.deviceType || rec?.deviceType || decl.deviceType) === 'mobile';
      const effectiveOfflineMs = isMobile ? Math.max(offlineMs, 6 * 3600 * 1000) : offlineMs;
      const effectiveStaleMs = isMobile ? Math.max(staleMs, 3600 * 1000) : staleMs;

      const probeLive = Boolean(tele && ageMs <= effectiveOfflineMs);
      const probeFresh = Boolean(tele && ageMs <= effectiveStaleMs);
      const isExternal = (rec?.probeMode || decl.probeMode) === 'external';
      const extCheck = externalChecks?.[id] || null;
      const probeMode = rec?.probeMode || decl.probeMode || (tele ? (isMobile ? 'checkin' : 'push') : (sshRem ? 'ssh' : 'tailscale-only'));

      const diag = diagnoseNodeStatus({
        probeMode,
        probeEnrolled: Boolean(rec),
        probeLive,
        probeFresh,
        hasTelemetry: Boolean(tele),
        ageMs,
        staleMs: effectiveStaleMs,
        offlineMs: effectiveOfflineMs,
        peer,
        sshRem,
        extCheck,
        isMobile,
        isExternal,
        decl,
        nowMs,
      });
      const { status, transport, statusReason, offlineReason, offlineCategory } = diag;

      const data = tele?.data || null;
      const derpFallback = DERP_COORDS[String(peer?.relay || data?.tailscale?.relay || '').toLowerCase()] || null;
      const lat = Number.isFinite(Number(decl.lat)) ? Number(decl.lat)
        : Number.isFinite(Number(rec?.lat)) ? Number(rec.lat)
        : (derpFallback?.lat ?? 35.0);
      const lon = Number.isFinite(Number(decl.lon)) ? Number(decl.lon)
        : Number.isFinite(Number(rec?.lon)) ? Number(rec.lon)
        : (derpFallback?.lon ?? 105.0);

      nodesById.set(id, {
        id,
        name: rec?.name || decl.name || sshRem?.name || data?.hostname || id,
        deviceType: data?.deviceType || rec?.deviceType || decl.deviceType || 'server',
        role: rec?.role || decl.role || sshRem?.role || 'Managed Node',
        region: data?.regionOverride || rec?.region || decl.region || derpFallback?.region || 'Tailnet Node',
        provider: rec?.provider || decl.provider || '',
        lat,
        lon,
        status,
        probeMode,
        probeEnrolled: Boolean(rec),
        probeLive,
        probeAgeSec: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null,
        transport,
        tailscaleIp: knownIp || peer?.ip || '',
        tailscaleDns: peer?.dnsName || data?.tailscale?.dnsName || '',
        relay: peer?.relay || data?.tailscale?.relay || '',
        os: data?.platform || peer?.os || (sshRem ? 'linux' : ''),
        arch: data?.arch || '',
        kernel: data?.kernel || '',
        uptimeSec: data?.uptimeSec ?? null,
        cpu: data?.cpu || (sshRem?.load && Number.isFinite(parseFloat(sshRem.load))
          ? { cores: null, usagePct: null, load1: parseFloat(sshRem.load) }
          : null),
        memory: data?.memory || (sshRem?.memory ? parseSshMemory(sshRem.memory) : null),
        disks: data?.disks?.length ? data.disks : (sshRem?.disk ? parseSshDisk(sshRem.disk) : []),
        battery: data?.battery || null,
        network: data?.network || null,
        watchedServices: data?.services || [],
        mcps: data?.mcps || [],
        harnesses: data?.harnesses || [],
        agentsCount: data?.agents?.count ?? 0,
        backupDisk: sshRem?.backupDisk || (sshRem?.backup && sshRem.backup !== 'n/a' ? sshRem.backup : null),
        rttMs: data?.hubRttMs ?? (sshRem?.reachable ? sshRem.rttMs : (extCheck?.reachable ? extCheck.rttMs : null)),
        lastSeenAt: tele?.receivedAt || (sshRem?.reachable ? (sshRem.checkedAt || snapshot?.collectedAt || nowIso) : null) || (extCheck?.reachable ? extCheck.checkedAt : null) || peer?.lastSeen || null,
        statusReason,
        offlineReason,
        offlineCategory,
        externalProbe: extCheck
          ? {
              port: extCheck.port,
              protocol: extCheck.protocol,
              reachable: extCheck.reachable,
              rttMs: extCheck.rttMs,
              errorCode: extCheck.errorCode,
              error: extCheck.error,
              checkedAt: extCheck.checkedAt,
            }
          : null,
        note: data?.note || decl.note || '',
        scopes: rec?.scopes || (isMobile ? ['telemetry:checkin'] : ['readonly']),
        history: this.timeseries?.get(`node:${id}`, 24) || [],
      });
    }

    for (const peer of tsPeers) {
      const peerIp = normalizeIp(peer.ip);
      if (peerIp && matchedPeerIps.has(peerIp)) continue;
      const autoId = `ts-${String(peer.name || peerIp || 'peer').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)}`;
      if (nodesById.has(autoId)) continue;
      const derp = DERP_COORDS[String(peer.relay || '').toLowerCase()] || { region: 'Tailscale Peer', lat: 37.5, lon: 118.0 };
      const osLower = String(peer.os || '').toLowerCase();
      const deviceType = osLower.includes('ios') || osLower.includes('android')
        ? 'mobile'
        : osLower.includes('mac') || osLower.includes('darwin') || osLower.includes('windows')
          ? 'laptop'
          : 'server';
      const peerDiag = diagnoseNodeStatus({
        probeMode: 'tailscale-only',
        probeEnrolled: false,
        probeLive: false,
        probeFresh: false,
        hasTelemetry: false,
        ageMs: Infinity,
        staleMs,
        offlineMs,
        peer,
        sshRem: null,
        extCheck: null,
        isMobile: deviceType === 'mobile',
        isExternal: false,
        decl: {},
        nowMs,
      });
      nodesById.set(autoId, {
        id: autoId,
        name: peer.name || peer.dnsName || peer.ip,
        deviceType,
        role: 'Tailscale Discovered Peer',
        region: derp.region,
        provider: 'Tailscale',
        lat: derp.lat,
        lon: derp.lon,
        status: peerDiag.status,
        probeMode: 'tailscale-only',
        probeEnrolled: false,
        probeLive: false,
        probeAgeSec: null,
        transport: peerDiag.transport,
        tailscaleIp: peer.ip || '',
        tailscaleDns: peer.dnsName || '',
        relay: peer.relay || '',
        os: peer.os || '',
        arch: '',
        kernel: '',
        uptimeSec: null,
        cpu: null,
        memory: null,
        disks: [],
        battery: null,
        network: null,
        watchedServices: [],
        agentsCount: 0,
        rttMs: null,
        lastSeenAt: peer.lastSeen || null,
        statusReason: peerDiag.statusReason,
        offlineReason: peerDiag.offlineReason,
        offlineCategory: peerDiag.offlineCategory,
        scopes: ['tailscale:peer'],
        history: [],
      });
    }

    const nodes = [...nodesById.values()];
    const links = [];
    const explicitLinks = Array.isArray(fleetCfg.meshLinks) ? fleetCfg.meshLinks : [];
    const seenPair = new Set();

    for (const link of explicitLinks) {
      if (nodesById.has(link.from) && nodesById.has(link.to)) {
        const pairKey = [link.from, link.to].sort().join('::');
        seenPair.add(pairKey);
        const targetNode = link.from === localId ? nodesById.get(link.to) : nodesById.get(link.from);
        links.push({
          from: link.from,
          to: link.to,
          kind: targetNode?.transport && targetNode.transport !== 'offline' ? targetNode.transport : (link.kind || 'relay'),
          label: link.label || '',
          rttMs: targetNode?.rttMs ?? null,
          active: targetNode?.status === 'healthy' || targetNode?.status === 'degraded',
        });
      }
    }

    for (const node of nodes) {
      if (node.id === localId) continue;
      const pairKey = [localId, node.id].sort().join('::');
      if (seenPair.has(pairKey)) continue;
      seenPair.add(pairKey);
      links.push({
        from: localId,
        to: node.id,
        kind: node.transport === 'offline' ? 'ssh' : node.transport,
        label: node.transport === 'direct'
          ? 'Tailnet Direct'
          : (node.transport === 'external'
            ? 'Proxy / Edge'
            : (node.relay ? `DERP ${node.relay}` : (node.transport === 'checkin' ? 'Check-in' : 'Tailnet'))),
        rttMs: node.rttMs ?? null,
        active: node.status === 'healthy' || node.status === 'degraded' || (node.status === 'standby' && node.transport !== 'offline' && node.transport !== 'external'),
      });
    }

    let onlineNodes = 0;
    let meshOnlyNodes = 0;
    let probedNodes = 0;
    let servers = 0;
    let laptops = 0;
    let mobiles = 0;
    let offlineNodes = 0;
    let cpuSum = 0;
    let cpuCount = 0;
    let memSum = 0;
    let memCount = 0;

    for (const node of nodes) {
      if (node.status === 'healthy' || node.status === 'degraded') onlineNodes += 1;
      else if (node.status === 'standby' && (node.transport === 'direct' || node.transport === 'relay')) meshOnlyNodes += 1;
      if (node.status === 'offline') offlineNodes += 1;
      if (node.probeMode === 'local' || node.probeLive) probedNodes += 1;
      if (node.deviceType === 'hub' || node.deviceType === 'server' || node.deviceType === 'edge') servers += 1;
      else if (node.deviceType === 'laptop') laptops += 1;
      else if (node.deviceType === 'mobile') mobiles += 1;
      if (typeof node.cpu?.usagePct === 'number') {
        cpuSum += node.cpu.usagePct;
        cpuCount += 1;
      }
      if (typeof node.memory?.usedPct === 'number') {
        memSum += node.memory.usedPct;
        memCount += 1;
      }
    }
    const reachableNodes = onlineNodes + meshOnlyNodes;

    this.timeseries?.record('fleet', {
      ts: nowMs,
      onlineNodes,
      totalNodes: nodes.length,
      avgCpuPct: cpuCount ? Math.round((cpuSum / cpuCount) * 10) / 10 : null,
      avgMemPct: memCount ? Math.round((memSum / memCount) * 10) / 10 : null,
      servicesOkPct: svcList.length ? Math.round((svcHealthy / svcList.length) * 100) : 100,
    });

    return {
      localNodeId: localId,
      requireTailscaleCidr: fleetCfg.requireTailscaleCidr !== false,
      summary: {
        total: nodes.length,
        online: onlineNodes,
        reachable: reachableNodes,
        meshOnly: meshOnlyNodes,
        probed: probedNodes,
        servers,
        laptops,
        mobiles,
        offline: offlineNodes,
      },
      nodes,
      links,
      fleetHistory: this.timeseries?.get('fleet', 30) || [],
    };
  }

  enqueueCommand(nodeId, command, actor = 'web') {
    const cleanId = cleanStr(nodeId, 48).toLowerCase();
    if (!validateNodeId(cleanId)) {
      const err = new Error(`Invalid probe nodeId: ${nodeId}`);
      err.statusCode = 400;
      throw err;
    }
    const ALLOWED_PROBE_COMMANDS = new Set([
      'health-check',
      'collect-diag',
      'rotate-heartbeat',
      'mcp-sync',
      'mcp-restart',
      'agent-discover',
    ]);
    const cleanCmd = String(command || '').trim().toLowerCase();
    if (!ALLOWED_PROBE_COMMANDS.has(cleanCmd)) {
      const err = new Error(`Command not in probe allowlist: ${command}`);
      err.statusCode = 400;
      throw err;
    }
    if (!this.commandQueues) this.commandQueues = new Map();
    const now = Date.now();
    const list = (this.commandQueues.get(cleanId) || []).filter((c) => c.expiresAtMs > now);
    const entry = {
      id: `cmd-${crypto.randomBytes(4).toString('hex')}`,
      nodeId: cleanId,
      command: cleanCmd,
      status: 'queued',
      actor: cleanStr(actor, 48) || 'web',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 300_000).toISOString(),
      expiresAtMs: now + 300_000,
      nonce: crypto.randomBytes(8).toString('hex'),
    };
    list.unshift(entry);
    this.commandQueues.set(cleanId, list.slice(0, 10));
    return entry;
  }

  listCommands(nodeId) {
    const cleanId = cleanStr(nodeId, 48).toLowerCase();
    if (!this.commandQueues) return [];
    const now = Date.now();
    return (this.commandQueues.get(cleanId) || [])
      .filter((c) => c.expiresAtMs > now || c.status === 'delivered')
      .map(({ expiresAtMs: _ignore, ...rest }) => rest);
  }

  drainPendingCommands(nodeId) {
    const cleanId = cleanStr(nodeId, 48).toLowerCase();
    if (!this.commandQueues) return [];
    const now = Date.now();
    const list = this.commandQueues.get(cleanId) || [];
    const pending = [];
    for (const item of list) {
      if (item.status === 'queued' && item.expiresAtMs > now) {
        item.status = 'delivered';
        item.deliveredAt = new Date(now).toISOString();
        pending.push({
          id: item.id,
          command: item.command,
          nonce: item.nonce,
          expiresAt: item.expiresAt,
        });
      }
    }
    return pending;
  }
}

export function buildInstallHints({ hubUrl, nodeId, token, deviceType, region }) {
  const safeRegion = region || 'Local';
  const linuxCmd = `sudo ./deploy/probe/install-probe.sh --hub-url "${hubUrl}" --node-id "${nodeId}" --device-type "${deviceType}" --token-file - <<'EOF'
${token}
EOF`;
  const macCmd = `./deploy/probe/install-probe.sh --hub-url "${hubUrl}" --node-id "${nodeId}" --device-type "laptop" --token-file - <<'EOF'
${token}
EOF`;
  const mobileCurl = `curl -fsS -X POST "${hubUrl}/api/probes/ingest" \\
  -H "Authorization: Bearer \${OPS_PROBE_TOKEN}" \\
  -H "X-Ops-Probe-Id: ${nodeId}" \\
  -H "Content-Type: application/json" \\
  -d '{"schemaVersion":1,"probeVersion":"0.4.0","nodeId":"${nodeId}","deviceType":"mobile","platform":"android","region":"${safeRegion}","battery":{"percent":85,"charging":false},"network":{"type":"5g"}}'`;

  return {
    linuxSystemd: linuxCmd,
    macosLaunchAgent: macCmd,
    mobileCheckinCurl: mobileCurl,
  };
}
