import { runCmd } from '../exec.mjs';

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

export async function collectTailscale(cfg) {
  if (cfg?.enabled === false) {
    return { id: 'tailscale', enabled: false, protocol: 'Official tailscale status/serve --json', devices: [], serves: [], onlineCount: 0 };
  }

  const cliBin = cfg?.cliBin || 'tailscale';
  let statusJson = null;
  let serves = [];

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

  const devices = [];
  if (statusJson?.Self) {
    const s = statusJson.Self;
    devices.push({
      id: s.ID,
      name: s.HostName || 'self',
      dnsName: (s.DNSName || '').replace(/\.$/, ''),
      ip: (s.TailscaleIPs || [])[0] || '',
      os: s.OS || 'linux',
      online: true,
      isSelf: true,
      relay: s.Relay || '',
      curAddr: s.CurAddr || 'local',
      rxBytes: s.RxBytes || 0,
      txBytes: s.TxBytes || 0,
      lastSeen: null,
    });
  }

  if (statusJson?.Peer) {
    for (const peer of Object.values(statusJson.Peer)) {
      devices.push({
        id: peer.ID,
        name: peer.HostName || 'peer',
        dnsName: (peer.DNSName || '').replace(/\.$/, ''),
        ip: (peer.TailscaleIPs || [])[0] || '',
        os: peer.OS || '',
        online: Boolean(peer.Online),
        isSelf: false,
        relay: peer.Relay || '',
        curAddr: peer.CurAddr || '',
        rxBytes: peer.RxBytes || 0,
        txBytes: peer.TxBytes || 0,
        lastSeen: peer.LastSeen && !String(peer.LastSeen).startsWith('0001-') ? peer.LastSeen : null,
        expired: Boolean(peer.Expired),
        keyExpiry: peer.KeyExpiry && !String(peer.KeyExpiry).startsWith('0001-') ? peer.KeyExpiry : null,
        exitNode: Boolean(peer.ExitNode),
        exitNodeOption: Boolean(peer.ExitNodeOption),
      });
    }
  }

  devices.sort((a, b) => {
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    if (a.online !== b.online) return a.online ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const reachable = Boolean(statusJson);
  return {
    id: 'tailscale',
    enabled: true,
    protocol: 'Official tailscale status --json + serve status --json',
    reachable,
    status: !reachable ? 'offline' : statusJson.BackendState === 'Running' ? 'healthy' : 'degraded',
    backendState: statusJson?.BackendState || 'Unavailable',
    version: statusJson?.Version || '',
    devices,
    onlineCount: devices.filter((d) => d.online).length,
    serves,
  };
}
