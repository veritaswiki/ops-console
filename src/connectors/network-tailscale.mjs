import { runCmd } from '../exec.mjs';

const SAFE_TARGET_RE = /^[a-zA-Z0-9._:-]{1,128}$/;
const SAFE_BIN_RE = /^[a-zA-Z0-9._/-]{1,128}$/;

function sanitizeBin(raw, fallback) {
  const val = String(raw || fallback).trim();
  return SAFE_BIN_RE.test(val) ? val : fallback;
}

export function parseTailscaleServeJson(rawJson) {
  const serves = [];
  if (!rawJson || typeof rawJson !== 'object') return serves;
  const web = rawJson.Web || {};
  for (const [hostPort, cfg] of Object.entries(web)) {
    const handlers = cfg?.Handlers || {};
    const url = hostPort.endsWith(':443')
      ? `https://${hostPort.slice(0, -4)}`
      : `https://${hostPort}`;
    for (const [mountPath, handler] of Object.entries(handlers)) {
      const target = handler?.Proxy || handler?.Path || handler?.Text || 'handler';
      serves.push({
        url,
        path: mountPath,
        target: String(target),
        scope: 'tailnet only',
      });
    }
  }
  return serves;
}

export function parseTailscaleServeText(serveText) {
  const serves = [];
  let currentHost = '';
  for (const line of String(serveText || '').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('https://')) {
      currentHost = trimmed.split(/\s+/)[0];
    } else if (trimmed.startsWith('|--') && currentHost) {
      const match = trimmed.match(/^\|--\s+(\S+)\s+proxy\s+(\S+)/);
      if (match) {
        serves.push({ url: currentHost, path: match[1], target: match[2], scope: 'tailnet only' });
      }
    }
  }
  return serves;
}

export function parseTailscaleFunnelJson(rawJson) {
  const funnels = [];
  if (!rawJson || typeof rawJson !== 'object') return funnels;
  const web = rawJson.Web || {};
  const allowFunnel = rawJson.AllowFunnel || {};
  for (const [hostPort, cfg] of Object.entries(web)) {
    if (allowFunnel && Object.keys(allowFunnel).length > 0 && !allowFunnel[hostPort]) continue;
    const handlers = cfg?.Handlers || {};
    const url = hostPort.endsWith(':443')
      ? `https://${hostPort.slice(0, -4)}`
      : `https://${hostPort}`;
    for (const [mountPath, handler] of Object.entries(handlers)) {
      const target = handler?.Proxy || handler?.Path || handler?.Text || 'handler';
      funnels.push({
        url,
        path: mountPath,
        target: String(target),
        scope: 'public funnel',
      });
    }
  }
  return funnels;
}

export function parseTailscalePingOutput(stdout) {
  const text = String(stdout || '').trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const pongLine = lines.find((line) => /^pong from/i.test(line)) || lines[0] || '';
  const latencyMatch = pongLine.match(/in\s+([0-9.]+)\s*(ms|µs|us|s)\b/i);
  let latencyMs = null;
  if (latencyMatch) {
    const val = Number(latencyMatch[1]);
    const unit = latencyMatch[2].toLowerCase();
    if (Number.isFinite(val)) {
      if (unit === 's') latencyMs = Math.round(val * 1000 * 10) / 10;
      else if (unit === 'us' || unit === 'µs') latencyMs = Math.round((val / 1000) * 100) / 100;
      else latencyMs = Math.round(val * 10) / 10;
    }
  }
  const derpMatch = pongLine.match(/via DERP\(([^)]+)\)/i);
  const directMatch = pongLine.match(/via\s+([0-9a-fA-F.:[\]]+:\d+)/i);
  return {
    ok: Boolean(pongLine && /^pong from/i.test(pongLine)),
    latencyMs,
    direct: Boolean(directMatch && !derpMatch),
    relay: derpMatch ? derpMatch[1] : '',
    via: derpMatch ? `DERP(${derpMatch[1]})` : directMatch ? directMatch[1] : '',
    raw: pongLine || text,
  };
}

export function parseTailscaleNetcheckJson(rawJson) {
  if (!rawJson || typeof rawJson !== 'object') {
    return { ok: false, error: 'netcheck 无有效返回', derpRegions: [] };
  }
  const regionLatency = rawJson.RegionLatency || {};
  const derpRegions = Object.entries(regionLatency)
    .map(([regionId, ns]) => {
      const num = Number(ns);
      const ms = Number.isFinite(num) ? Math.round((num / 1e6) * 10) / 10 : null;
      return { regionId: String(regionId), latencyMs: ms };
    })
    .filter((entry) => entry.latencyMs !== null)
    .sort((a, b) => (a.latencyMs ?? 99999) - (b.latencyMs ?? 99999))
    .slice(0, 10);

  return {
    ok: true,
    udp: Boolean(rawJson.UDP),
    ipv4: Boolean(rawJson.IPv4),
    ipv6: Boolean(rawJson.IPv6),
    mappingVariesByDestIp: Boolean(rawJson.MappingVariesByDestIP),
    preferredDerp: rawJson.PreferredDERP ? String(rawJson.PreferredDERP) : '',
    captivePortal: Boolean(rawJson.CaptivePortal),
    derpRegions,
    checkedAt: new Date().toISOString(),
  };
}

export async function collectTailscale(cfg) {
  const adminConsoleUrl = String(cfg?.adminConsoleUrl || 'https://login.tailscale.com/admin/machines').trim();
  if (cfg?.enabled === false) {
    return {
      id: 'tailscale',
      enabled: false,
      protocol: 'Official tailscale status/serve --json',
      devices: [],
      serves: [],
      funnels: [],
      derpSummary: [],
      health: [],
      onlineCount: 0,
      adminConsoleUrl,
    };
  }

  const cliBin = sanitizeBin(cfg?.cliBin, 'tailscale');
  let statusJson = null;
  let serves = [];
  let funnels = [];

  try {
    const { stdout } = await runCmd(cliBin, ['status', '--json'], { timeout: 3000 });
    statusJson = JSON.parse(stdout);
  } catch {
    statusJson = null;
  }

  try {
    const { stdout } = await runCmd(cliBin, ['serve', 'status', '--json'], { timeout: 2500 });
    serves = parseTailscaleServeJson(JSON.parse(stdout));
  } catch {
    try {
      const { stdout } = await runCmd(cliBin, ['serve', 'status'], { timeout: 2500 });
      serves = parseTailscaleServeText(stdout);
    } catch {
      serves = [];
    }
  }

  try {
    const { stdout } = await runCmd(cliBin, ['funnel', 'status', '--json'], { timeout: 2000 });
    funnels = parseTailscaleFunnelJson(JSON.parse(stdout));
  } catch {
    funnels = [];
  }

  const devices = [];
  let selfName = '';
  let selfIp = '';
  let selfIps = [];
  let selfDnsName = '';
  if (statusJson?.Self) {
    const s = statusJson.Self;
    selfName = s.HostName || 'self';
    selfIps = Array.isArray(s.TailscaleIPs) ? s.TailscaleIPs : [];
    selfIp = selfIps[0] || '';
    selfDnsName = (s.DNSName || '').replace(/\.$/, '');
    devices.push({
      id: s.ID,
      name: selfName,
      dnsName: selfDnsName,
      ip: selfIp,
      tailscaleIps: selfIps,
      os: s.OS || 'linux',
      online: true,
      isSelf: true,
      direct: true,
      relay: s.Relay || '',
      curAddr: s.CurAddr || 'local',
      rxBytes: s.RxBytes || 0,
      txBytes: s.TxBytes || 0,
      lastSeen: null,
      exitNode: Boolean(s.ExitNode),
      exitNodeOption: Boolean(s.ExitNodeOption),
      primaryRoutes: Array.isArray(s.PrimaryRoutes) ? s.PrimaryRoutes : [],
    });
  }

  if (statusJson?.Peer) {
    for (const peer of Object.values(statusJson.Peer)) {
      const ips = Array.isArray(peer.TailscaleIPs) ? peer.TailscaleIPs : [];
      const curAddr = peer.CurAddr || '';
      const direct = Boolean(peer.Online && curAddr);
      devices.push({
        id: peer.ID,
        name: peer.HostName || 'peer',
        dnsName: (peer.DNSName || '').replace(/\.$/, ''),
        ip: ips[0] || '',
        tailscaleIps: ips,
        os: peer.OS || '',
        online: Boolean(peer.Online),
        isSelf: false,
        direct,
        relay: peer.Relay || '',
        curAddr,
        rxBytes: peer.RxBytes || 0,
        txBytes: peer.TxBytes || 0,
        lastSeen: peer.LastSeen && !String(peer.LastSeen).startsWith('0001-') ? peer.LastSeen : null,
        expired: Boolean(peer.Expired),
        keyExpiry: peer.KeyExpiry && !String(peer.KeyExpiry).startsWith('0001-') ? peer.KeyExpiry : null,
        exitNode: Boolean(peer.ExitNode),
        exitNodeOption: Boolean(peer.ExitNodeOption),
        primaryRoutes: Array.isArray(peer.PrimaryRoutes) ? peer.PrimaryRoutes : [],
      });
    }
  }

  devices.sort((a, b) => {
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    if (a.online !== b.online) return a.online ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const derpMap = new Map();
  let directCount = 0;
  let relayCount = 0;
  for (const dev of devices) {
    if (!dev.isSelf && dev.online) {
      if (dev.direct) directCount += 1;
      else if (dev.relay) relayCount += 1;
    }
    if (dev.relay) {
      const cur = derpMap.get(dev.relay) || { region: dev.relay, count: 0, onlineCount: 0 };
      cur.count += 1;
      if (dev.online) cur.onlineCount += 1;
      derpMap.set(dev.relay, cur);
    }
  }
  const derpSummary = [...derpMap.values()].sort((a, b) => b.onlineCount - a.onlineCount || b.count - a.count);

  const capMap = statusJson?.Self?.CapMap || {};
  const exitNodeStatus = statusJson?.ExitNodeStatus
    ? {
        id: String(statusJson.ExitNodeStatus.ID || ''),
        online: Boolean(statusJson.ExitNodeStatus.Online),
        tailscaleIps: Array.isArray(statusJson.ExitNodeStatus.TailscaleIPs) ? statusJson.ExitNodeStatus.TailscaleIPs : [],
      }
    : null;

  const reachable = Boolean(statusJson);
  return {
    id: 'tailscale',
    enabled: true,
    protocol: 'Official tailscale status --json + serve status --json',
    reachable,
    status: !reachable ? 'offline' : statusJson.BackendState === 'Running' ? 'healthy' : 'degraded',
    backendState: statusJson?.BackendState || 'Unavailable',
    version: statusJson?.Version || '',
    tailnet: statusJson?.CurrentTailnet?.Name || '',
    magicDnsSuffix: statusJson?.MagicDNSSuffix || statusJson?.CurrentTailnet?.MagicDNSSuffix || '',
    selfName,
    selfIp,
    selfIps,
    selfDnsName,
    health: Array.isArray(statusJson?.Health) ? statusJson.Health.map(String) : [],
    funnelCapable: Boolean(capMap.funnel),
    exitNodeStatus,
    directCount,
    relayCount,
    derpSummary,
    devices,
    onlineCount: devices.filter((d) => d.online).length,
    serves,
    funnels,
    adminConsoleUrl,
  };
}

export async function runTailscalePing(cfg, rawTarget) {
  const target = String(rawTarget || '').trim();
  if (!target || target.startsWith('-') || !SAFE_TARGET_RE.test(target)) {
    throw new Error('无效的 Tailscale 目标节点地址或主机名');
  }
  const cliBin = sanitizeBin(cfg?.cliBin, 'tailscale');
  try {
    const { stdout, stderr } = await runCmd(cliBin, ['ping', '--c=1', '--timeout=3s', target], { timeout: 4500 });
    const parsed = parseTailscalePingOutput(stdout || stderr);
    return { target, ...parsed };
  } catch (err) {
    const combined = String(err?.stdout || err?.stderr || err?.message || 'ping failed').trim();
    const parsed = parseTailscalePingOutput(combined);
    return {
      target,
      ...parsed,
      ok: false,
      error: combined.split(/\r?\n/)[0] || 'Tailscale ping 失败',
    };
  }
}

export async function runTailscaleNetcheck(cfg) {
  const cliBin = sanitizeBin(cfg?.cliBin, 'tailscale');
  try {
    const { stdout } = await runCmd(cliBin, ['netcheck', '--format=json'], { timeout: 5500 });
    return parseTailscaleNetcheckJson(JSON.parse(stdout));
  } catch (err) {
    return {
      ok: false,
      error: String(err?.stderr || err?.message || 'tailscale netcheck 执行失败').split(/\r?\n/)[0],
      derpRegions: [],
    };
  }
}
