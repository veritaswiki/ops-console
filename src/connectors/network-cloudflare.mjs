import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runCmd } from '../exec.mjs';

const SAFE_BIN_RE = /^[a-zA-Z0-9._/-]{1,128}$/;

function sanitizeBin(raw, fallback) {
  const val = String(raw || fallback).trim();
  return SAFE_BIN_RE.test(val) ? val : fallback;
}

function stripYamlQuotes(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseCloudflaredIngressYaml(yamlText) {
  const result = {
    tunnel: '',
    warpRouting: false,
    ingress: [],
  };
  const lines = String(yamlText || '').split(/\r?\n/);
  let inIngress = false;
  let inWarpRouting = false;
  let currentRule = null;

  const flushRule = () => {
    if (!currentRule) return;
    if (currentRule.hostname || currentRule.service || currentRule.path) {
      result.ingress.push({
        hostname: currentRule.hostname || '*',
        path: currentRule.path || '',
        service: currentRule.service || 'unknown',
        scope: currentRule.hostname ? 'public-hostname' : 'fallback',
      });
    }
    currentRule = null;
  };

  for (const rawLine of lines) {
    const cleaned = rawLine.replace(/\s+#.*$/, '');
    const trimmed = cleaned.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = cleaned.length - cleaned.trimStart().length;
    if (indent === 0) {
      flushRule();
      inIngress = false;
      inWarpRouting = false;
      const tunnelMatch = trimmed.match(/^tunnel\s*:\s*(.+)$/);
      if (tunnelMatch) {
        result.tunnel = stripYamlQuotes(tunnelMatch[1]);
        continue;
      }
      if (/^warp-routing\s*:/.test(trimmed)) {
        inWarpRouting = true;
        continue;
      }
      if (/^ingress\s*:/.test(trimmed)) {
        inIngress = true;
        continue;
      }
      continue;
    }

    if (inWarpRouting) {
      const enabledMatch = trimmed.match(/^enabled\s*:\s*(true|false)$/i);
      if (enabledMatch) {
        result.warpRouting = enabledMatch[1].toLowerCase() === 'true';
      }
      continue;
    }

    if (inIngress) {
      const itemStart = trimmed.match(/^-\s*(.*)$/);
      if (itemStart) {
        flushRule();
        currentRule = {};
        const rest = itemStart[1].trim();
        if (rest) {
          const kv = rest.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
          if (kv) {
            const key = kv[1].toLowerCase();
            if (key === 'hostname' || key === 'service' || key === 'path') {
              currentRule[key] = stripYamlQuotes(kv[2]);
            }
          }
        }
        continue;
      }
      if (currentRule) {
        const kv = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
        if (kv) {
          const key = kv[1].toLowerCase();
          if (key === 'hostname' || key === 'service' || key === 'path') {
            currentRule[key] = stripYamlQuotes(kv[2]);
          }
        }
      }
    }
  }
  flushRule();
  return result;
}

export function parseCloudflaredTunnelsJson(raw) {
  let list = [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    list = raw;
  }

  return list.slice(0, 64).map((item) => {
    const connections = Array.isArray(item?.connections) ? item.connections : [];
    const activeEdges = connections.map((c) => c?.colo_name || c?.origin_ip || 'edge').filter(Boolean);
    const activeCount = connections.length;
    return {
      id: String(item?.id || ''),
      name: String(item?.name || item?.id || 'unnamed-tunnel'),
      createdAt: item?.created_at || item?.createdAt || null,
      connectionsCount: activeCount,
      edgeColos: [...new Set(activeEdges)].slice(0, 8),
      status: activeCount > 0 ? 'healthy' : 'offline',
    };
  });
}

export function parseWarpStatusText(stdout) {
  const text = String(stdout || '');
  const statusMatch = text.match(/Status update:\s*([^\r\n]+)/i);
  const rawState = statusMatch ? statusMatch[1].trim() : text.trim().split(/\r?\n/)[0] || '';
  const lower = rawState.toLowerCase();
  const connected = lower.includes('connected') && !lower.includes('disconnected');
  const reasonMatch = text.match(/Reason:\s*([^\r\n]+)/i);
  return {
    connected,
    state: rawState || 'Unavailable',
    reason: reasonMatch ? reasonMatch[1].trim() : '',
  };
}

async function detectServiceActive(unitName) {
  for (const args of [
    ['is-active', unitName],
    ['--user', 'is-active', unitName],
  ]) {
    try {
      const { stdout } = await runCmd('systemctl', args, { timeout: 1500 });
      const val = String(stdout || '').trim();
      if (val === 'active' || val === 'activating') {
        return { active: true, scope: args[0] === '--user' ? 'user' : 'system', state: val };
      }
    } catch {
      // unit not active or missing
    }
  }
  return { active: false, scope: 'none', state: 'inactive' };
}

async function readFirstExistingConfig(configPath) {
  const candidates = [];
  if (configPath) {
    candidates.push(path.resolve(String(configPath)));
  } else {
    candidates.push('/etc/cloudflared/config.yml');
    candidates.push('/etc/cloudflared/config.yaml');
    candidates.push(path.join(os.homedir(), '.cloudflared', 'config.yml'));
    candidates.push(path.join(os.homedir(), '.cloudflared', 'config.yaml'));
  }

  for (const filePath of candidates) {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile() || stat.size > 256 * 1024) continue;
      const raw = await fs.readFile(filePath, 'utf8');
      return { found: true, parsed: parseCloudflaredIngressYaml(raw) };
    } catch {
      // ignore inaccessible or absent config file
    }
  }
  return { found: false, parsed: { tunnel: '', warpRouting: false, ingress: [] } };
}

export async function collectCloudflare(cfg = {}) {
  if (cfg?.enabled === false) {
    return {
      id: 'cloudflare',
      name: 'Cloudflare LAN & Tunnel',
      enabled: false,
      protocol: 'Official cloudflared CLI + warp-cli (Zero Trust Private LAN)',
      reachable: false,
      status: 'disabled',
      cloudflared: { installed: false, version: '', serviceActive: false, serviceScope: 'none', serviceState: 'inactive', configDetected: false },
      warp: { installed: false, version: '', connected: false, state: 'Unavailable', reason: '' },
      warpRouting: false,
      tunnelName: '',
      tunnels: [],
      activeTunnelsCount: 0,
      ingress: [],
      lanRoutes: [],
      dashboardUrl: 'https://one.dash.cloudflare.com/',
      setupHints: [],
    };
  }

  const cliBin = sanitizeBin(cfg?.cliBin, 'cloudflared');
  const warpBin = sanitizeBin(cfg?.warpBin, 'warp-cli');
  const dashboardUrl = String(cfg?.dashboardUrl || 'https://one.dash.cloudflare.com/').trim();
  const configuredLanRoutes = Array.isArray(cfg?.lanRoutes)
    ? cfg.lanRoutes
        .filter((route) => route && typeof route === 'object' && (route.cidr || route.hostname || route.target))
        .map((route) => ({
          id: String(route.id || route.cidr || route.hostname || ''),
          name: String(route.name || route.cidr || route.hostname || 'LAN Route'),
          cidr: String(route.cidr || ''),
          hostname: String(route.hostname || ''),
          target: String(route.target || ''),
          comment: String(route.comment || ''),
          scope: route.cidr ? 'private-cidr' : 'ingress',
        }))
    : [];

  const [cfVersionRes, warpVersionRes, serviceInfo, configInfo] = await Promise.all([
    runCmd(cliBin, ['--version'], { timeout: 2500 }).then((r) => ({ ok: true, out: String(r.stdout || r.stderr || '').trim() })).catch(() => ({ ok: false, out: '' })),
    runCmd(warpBin, ['--version'], { timeout: 2000 }).then((r) => ({ ok: true, out: String(r.stdout || r.stderr || '').trim() })).catch(() => ({ ok: false, out: '' })),
    detectServiceActive('cloudflared.service'),
    readFirstExistingConfig(cfg?.configPath || ''),
  ]);

  let tunnels = [];
  if (cfVersionRes.ok) {
    try {
      const { stdout } = await runCmd(cliBin, ['tunnel', 'list', '--output', 'json'], { timeout: 3500 });
      tunnels = parseCloudflaredTunnelsJson(stdout);
    } catch {
      tunnels = [];
    }
  }

  let warpStatus = { connected: false, state: warpVersionRes.ok ? 'Unknown' : 'Not Installed', reason: '' };
  if (warpVersionRes.ok) {
    try {
      const { stdout } = await runCmd(warpBin, ['status'], { timeout: 2500 });
      warpStatus = parseWarpStatusText(stdout);
    } catch {
      warpStatus = { connected: false, state: 'Unavailable', reason: 'warp-svc 未运行或未注册' };
    }
  }

  const activeTunnelsCount = tunnels.filter((t) => t.connectionsCount > 0).length;
  const tunnelName = String(cfg?.tunnelName || configInfo.parsed.tunnel || tunnels[0]?.name || '').trim();
  const warpRouting = Boolean(configInfo.parsed.warpRouting || configuredLanRoutes.some((r) => Boolean(r.cidr)));
  const ingress = configInfo.parsed.ingress || [];

  const hasActiveRuntime = serviceInfo.active || activeTunnelsCount > 0 || warpStatus.connected;
  const hasAnySetup = cfVersionRes.ok || warpVersionRes.ok || configInfo.found || configuredLanRoutes.length > 0;

  let status = 'unconfigured';
  if (hasActiveRuntime) {
    status = 'healthy';
  } else if (hasAnySetup) {
    status = 'standby';
  }

  const setupHints = [
    {
      id: 'install-cloudflared',
      title: '1. 安装 cloudflared 隧道客户端',
      command: 'curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null && sudo apt-get install -y cloudflared',
      note: 'macOS 可使用 brew install cloudflared',
    },
    {
      id: 'create-lan-tunnel',
      title: '2. 创建私有局域网路由（Zero Trust Private Network）',
      command: 'cloudflared tunnel login && cloudflared tunnel create ops-lan-hub && cloudflared tunnel route ip add 100.64.0.0/16 ops-lan-hub',
      note: '启用 warp-routing 后，所有登录同一 Zero Trust 组织的 WARP 设备可直连内网服务',
    },
    {
      id: 'connect-warp-client',
      title: '3. 在终端连接 Cloudflare WARP 局域网',
      command: 'warp-cli registration new <your-team-name> && warp-cli connect && warp-cli status',
      note: '连接后无需公网暴露端口，即可访问私有 CIDR 内的受管服务与 A2A Peer',
    },
  ];

  return {
    id: 'cloudflare',
    name: 'Cloudflare LAN & Tunnel',
    enabled: true,
    protocol: 'Official cloudflared CLI + warp-cli (Zero Trust Private LAN)',
    reachable: hasActiveRuntime,
    status,
    cloudflared: {
      installed: cfVersionRes.ok,
      version: cfVersionRes.out.split(/\r?\n/)[0] || '',
      serviceActive: serviceInfo.active,
      serviceScope: serviceInfo.scope,
      serviceState: serviceInfo.state,
      configDetected: configInfo.found,
    },
    warp: {
      installed: warpVersionRes.ok,
      version: warpVersionRes.out.split(/\r?\n/)[0] || '',
      connected: warpStatus.connected,
      state: warpStatus.state,
      reason: warpStatus.reason,
    },
    warpRouting,
    tunnelName,
    tunnels,
    activeTunnelsCount,
    ingress,
    lanRoutes: configuredLanRoutes,
    dashboardUrl,
    setupHints,
  };
}
