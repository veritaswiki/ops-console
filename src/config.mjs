import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(__dirname, '..');

let pkgVersion = '2.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  if (pkg.version) pkgVersion = pkg.version;
} catch {
  // keep default
}
export const APP_VERSION = pkgVersion;

const DEFAULT_LAYERS = [
  { id: 'entry', label: '入口与编排', desc: 'Gateways, orchestrators, and control planes' },
  { id: 'memory', label: '记忆与智能', desc: 'Memory engines, context databases, and vector services' },
  { id: 'network', label: '组网与隧道', desc: 'Mesh networking, proxies, tunnels, and firewalls' },
  { id: 'infra', label: '基础设施', desc: 'Databases, sync daemons, containers, and utilities' },
];

const DEFAULT_AGENT_MATCHERS = [
  { category: 'orchestrator', label: 'Orchestrator', pattern: '(^|/)t3(\\s|$)|t3-code' },
  { category: 'gateway', label: 'Model Gateway', pattern: '(^|/)magpie(\\s|$)|magpie-.*bridge' },
  { category: 'memory', label: 'Memory Engine', pattern: 'nmem-server|openviking|symbiote|rerank|embedding' },
  { category: 'agent-runtime', label: 'Agent Runtime', pattern: '(^|/)codex(\\s|$)|(^|/)claude(\\s|$)|(^|/)pi(\\s|$)|(^|/)agy(\\s|$)|herdr|dsh' },
];

const VALID_SCOPES = new Set(['user', 'system']);
const VALID_RISKS = new Set(['standard', 'critical']);
const UNIT_RE = /^[A-Za-z0-9@._:-]{1,128}$/;

export function parseCliArgs(argv = process.argv.slice(2)) {
  const out = {
    configPath: '',
    hosts: null,
    port: null,
    webKey: null,
    readOnly: null,
    demo: null,
    checkConfig: false,
    showHelp: false,
    showVersion: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') out.showHelp = true;
    else if (arg === '--version' || arg === '-v') out.showVersion = true;
    else if (arg === '--check-config') out.checkConfig = true;
    else if (arg === '--read-only') out.readOnly = true;
    else if (arg === '--demo') out.demo = true;
    else if ((arg === '--config' || arg === '-c') && argv[i + 1]) {
      out.configPath = argv[++i];
    } else if (arg.startsWith('--config=')) {
      out.configPath = arg.slice('--config='.length);
    } else if ((arg === '--host' || arg === '--hosts') && argv[i + 1]) {
      out.hosts = argv[++i];
    } else if (arg.startsWith('--host=')) {
      out.hosts = arg.slice('--host='.length);
    } else if (arg.startsWith('--hosts=')) {
      out.hosts = arg.slice('--hosts='.length);
    } else if ((arg === '--port' || arg === '-p') && argv[i + 1]) {
      out.port = Number(argv[++i]);
    } else if (arg.startsWith('--port=')) {
      out.port = Number(arg.slice('--port='.length));
    } else if (arg === '--web-key' && argv[i + 1]) {
      out.webKey = argv[++i];
    } else if (arg.startsWith('--web-key=')) {
      out.webKey = arg.slice('--web-key='.length);
    }
  }
  return out;
}

function parseHostsList(raw) {
  if (Array.isArray(raw)) {
    const cleaned = raw.map((h) => String(h || '').trim()).filter(Boolean);
    return cleaned.length > 0 ? [...new Set(cleaned)] : ['127.0.0.1'];
  }
  if (typeof raw === 'string' && raw.trim()) {
    const cleaned = raw.split(',').map((h) => h.trim()).filter(Boolean);
    return cleaned.length > 0 ? [...new Set(cleaned)] : ['127.0.0.1'];
  }
  return ['127.0.0.1'];
}

function parseBoolEnv(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

function resolveConfigFilePath(cliPath, envPath, cwd = process.cwd()) {
  if (cliPath) return path.resolve(cliPath);
  if (envPath) return path.resolve(envPath);
  const candidates = [
    path.join(cwd, 'config.local.json'),
    path.join(PACKAGE_ROOT, 'config.local.json'),
    path.join(os.homedir(), '.config', 'ops-console', 'config.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return '';
}

export function validateConfig(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['Config root must be a JSON object'] };
  }

  const port = raw.console?.port ?? 4320;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`Invalid console.port: ${port}`);
  }

  const webKey = raw.auth?.webKey ?? '';
  if (webKey && (typeof webKey !== 'string' || webKey.length < 16)) {
    errors.push('auth.webKey must be empty or a string with at least 16 characters');
  }

  if (raw.services !== undefined) {
    if (!Array.isArray(raw.services)) {
      errors.push('services must be an array');
    } else {
      const ids = new Set();
      for (const svc of raw.services) {
        if (!svc || typeof svc !== 'object') {
          errors.push('Each service entry must be an object');
          continue;
        }
        if (!svc.id || typeof svc.id !== 'string') errors.push('Service missing string id');
        if (ids.has(svc.id)) errors.push(`Duplicate service id: ${svc.id}`);
        ids.add(svc.id);
        if (!svc.unit || !UNIT_RE.test(svc.unit)) {
          errors.push(`Invalid systemd unit name for ${svc.id}: ${svc.unit}`);
        }
        if (svc.scope && !VALID_SCOPES.has(svc.scope)) {
          errors.push(`Invalid scope for ${svc.id}: ${svc.scope}`);
        }
        if (svc.risk && !VALID_RISKS.has(svc.risk)) {
          errors.push(`Invalid risk for ${svc.id}: ${svc.risk}`);
        }
      }
    }
  }

  if (raw.timers !== undefined) {
    if (!Array.isArray(raw.timers)) {
      errors.push('timers must be an array');
    } else {
      for (const timer of raw.timers) {
        if (!timer?.id || !timer?.unit || !UNIT_RE.test(timer.unit)) {
          errors.push(`Invalid timer entry: ${JSON.stringify(timer?.id || timer)}`);
        }
      }
    }
  }

  if (raw.logFiles !== undefined && !Array.isArray(raw.logFiles)) {
    errors.push('logFiles must be an array');
  }
  if (raw.remotes !== undefined && !Array.isArray(raw.remotes)) {
    errors.push('remotes must be an array');
  }

  return { valid: errors.length === 0, errors };
}

export function loadConfig(options = {}) {
  const cli = options.cli || parseCliArgs([]);
  const env = options.env || process.env;
  const cwd = options.cwd || process.cwd();

  const demoMode = cli.demo ?? parseBoolEnv(env.OPS_CONSOLE_DEMO) ?? false;
  const resolvedPath = options.rawConfig
    ? '(inline)'
    : resolveConfigFilePath(cli.configPath, env.OPS_CONSOLE_CONFIG || '', cwd);

  let raw = options.rawConfig || {};
  if (!options.rawConfig && resolvedPath) {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    raw = JSON.parse(content);
  }

  const portOverride = cli.port ?? (env.OPS_CONSOLE_PORT ? Number(env.OPS_CONSOLE_PORT) : null);
  const hostsOverride = cli.hosts ?? env.OPS_CONSOLE_HOSTS ?? env.OPS_CONSOLE_HOST ?? null;
  const webKeyOverride = cli.webKey ?? (env.OPS_CONSOLE_WEB_KEY !== undefined ? env.OPS_CONSOLE_WEB_KEY : null);
  const readOnlyOverride = cli.readOnly ?? parseBoolEnv(env.OPS_CONSOLE_READ_ONLY);
  const dataDirOverride = env.OPS_CONSOLE_DATA_DIR || null;

  const merged = {
    configPath: resolvedPath || null,
    demo: Boolean(demoMode),
    console: {
      title: raw.console?.title || 'Ops Console',
      subtitle: raw.console?.subtitle || (demoMode ? 'Interactive Demo Mode' : 'Architecture Control Plane'),
      hosts: parseHostsList(hostsOverride ?? raw.console?.hosts ?? raw.console?.host ?? ['127.0.0.1']),
      port: portOverride ?? raw.console?.port ?? 4320,
      readOnly: Boolean(readOnlyOverride ?? raw.console?.readOnly ?? false),
      dataDir: path.resolve(
        dataDirOverride || raw.console?.dataDir || path.join(PACKAGE_ROOT, 'data'),
      ),
    },
    auth: {
      webKey: String(webKeyOverride ?? raw.auth?.webKey ?? '').trim(),
    },
    security: {
      allowedOrigins: Array.isArray(raw.security?.allowedOrigins) ? raw.security.allowedOrigins : [],
      rateLimitPerMinute: Math.max(30, Number(raw.security?.rateLimitPerMinute || 240)),
      mutatingRateLimitPerMinute: Math.max(5, Number(raw.security?.mutatingRateLimitPerMinute || 30)),
      maxSseStreams: Math.min(32, Math.max(1, Number(raw.security?.maxSseStreams || 8))),
      trustProxy: Boolean(parseBoolEnv(env.OPS_CONSOLE_TRUST_PROXY) ?? raw.security?.trustProxy ?? false),
    },
    logging: {
      level: String(env.OPS_CONSOLE_LOG_LEVEL || raw.logging?.level || 'info').toLowerCase(),
      maxBytes: Math.max(64 * 1024, Number(raw.logging?.maxBytes || 5 * 1024 * 1024)),
      maxFiles: Math.min(20, Math.max(1, Number(raw.logging?.maxFiles || 5))),
    },
    host: {
      mounts: Array.isArray(raw.host?.mounts) && raw.host.mounts.length > 0 ? raw.host.mounts : ['/'],
    },
    layers: Array.isArray(raw.layers) && raw.layers.length > 0 ? raw.layers : DEFAULT_LAYERS,
    services: Array.isArray(raw.services) ? raw.services.map((s) => ({
      id: String(s.id),
      name: String(s.name || s.id),
      unit: String(s.unit),
      scope: s.scope === 'system' ? 'system' : 'user',
      layer: String(s.layer || 'infra'),
      role: String(s.role || ''),
      ports: Array.isArray(s.ports) ? s.ports.map(String) : [],
      healthUrl: s.healthUrl ? String(s.healthUrl) : null,
      tailnetUrl: s.tailnetUrl ? String(s.tailnetUrl) : null,
      optional: Boolean(s.optional),
      risk: s.risk === 'critical' ? 'critical' : 'standard',
      riskNote: s.riskNote ? String(s.riskNote) : '',
    })) : [],
    timers: Array.isArray(raw.timers) ? raw.timers.map((t) => ({
      id: String(t.id),
      name: String(t.name || t.id),
      unit: String(t.unit),
      scope: t.scope === 'system' ? 'system' : 'user',
      schedule: String(t.schedule || ''),
      targetService: String(t.targetService || ''),
    })) : [],
    connectors: {
      magpie: {
        enabled: Boolean(raw.connectors?.magpie?.enabled),
        apiUrl: raw.connectors?.magpie?.apiUrl || 'http://127.0.0.1:3426',
        webUrl: raw.connectors?.magpie?.webUrl || '',
        cliBin: raw.connectors?.magpie?.cliBin || 'magpie',
        configHome: raw.connectors?.magpie?.configHome || '',
        addr: raw.connectors?.magpie?.addr || '127.0.0.1:3426',
      },
      nmem: {
        enabled: Boolean(raw.connectors?.nmem?.enabled),
        apiUrl: raw.connectors?.nmem?.apiUrl || 'http://127.0.0.1:14242',
        cliBin: raw.connectors?.nmem?.cliBin || 'nmem',
      },
      openviking: {
        enabled: Boolean(raw.connectors?.openviking?.enabled),
        apiUrl: raw.connectors?.openviking?.apiUrl || 'http://127.0.0.1:1933',
        cliBin: raw.connectors?.openviking?.cliBin || 'ov',
      },
      symbiote: {
        enabled: Boolean(raw.connectors?.symbiote?.enabled),
        apiUrl: raw.connectors?.symbiote?.apiUrl || 'http://127.0.0.1:4318',
      },
      rerank: {
        enabled: Boolean(raw.connectors?.rerank?.enabled),
        apiUrl: raw.connectors?.rerank?.apiUrl || 'http://127.0.0.1:8893',
      },
      tailscale: {
        enabled: raw.connectors?.tailscale?.enabled !== undefined ? Boolean(raw.connectors.tailscale.enabled) : true,
        cliBin: raw.connectors?.tailscale?.cliBin || 'tailscale',
      },
      mihomo: {
        enabled: Boolean(raw.connectors?.mihomo?.enabled),
        apiUrl: raw.connectors?.mihomo?.apiUrl || 'http://127.0.0.1:19090',
        secret: raw.connectors?.mihomo?.secret || env.MIHOMO_API_SECRET || '',
      },
      syncthing: {
        enabled: Boolean(raw.connectors?.syncthing?.enabled),
        apiUrl: raw.connectors?.syncthing?.apiUrl || 'http://127.0.0.1:8384',
        apiKey: raw.connectors?.syncthing?.apiKey || env.SYNCTHING_API_KEY || '',
      },
      customHttp: Array.isArray(raw.connectors?.customHttp) ? raw.connectors.customHttp : [],
    },
    logFiles: Array.isArray(raw.logFiles) ? raw.logFiles.map((f) => ({
      id: String(f.id),
      name: String(f.name || f.id),
      path: path.resolve(String(f.path)),
    })) : [],
    remotes: Array.isArray(raw.remotes) ? raw.remotes.map((r) => ({
      id: String(r.id),
      name: String(r.name || r.id),
      ip: String(r.ip || ''),
      sshTarget: String(r.sshTarget),
      role: String(r.role || ''),
      backupPath: r.backupPath ? String(r.backupPath) : '',
      sshKey: r.sshKey ? String(r.sshKey) : '',
      strictHostKeyChecking: r.strictHostKeyChecking === 'accept-new' ? 'accept-new' : 'yes',
    })) : [],
    ops: {
      healthScript: raw.ops?.healthScript ? path.resolve(String(raw.ops.healthScript)) : '',
      backupScript: raw.ops?.backupScript ? path.resolve(String(raw.ops.backupScript)) : '',
      healthLatestPath: raw.ops?.healthLatestPath ? path.resolve(String(raw.ops.healthLatestPath)) : '',
      backupLastRunPath: raw.ops?.backupLastRunPath ? path.resolve(String(raw.ops.backupLastRunPath)) : '',
      alertsLogPath: raw.ops?.alertsLogPath ? path.resolve(String(raw.ops.alertsLogPath)) : '',
    },
    agentMatchers: Array.isArray(raw.agentMatchers) && raw.agentMatchers.length > 0
      ? raw.agentMatchers
      : DEFAULT_AGENT_MATCHERS,
  };

  const validation = validateConfig(merged);
  if (!validation.valid) {
    throw new Error(`Invalid configuration:\n- ${validation.errors.join('\n- ')}`);
  }

  return merged;
}

export function findService(config, unitOrId) {
  if (!unitOrId) return null;
  return config.services.find((s) => s.unit === unitOrId || s.id === unitOrId) || null;
}

export function findTimer(config, unitOrId) {
  if (!unitOrId) return null;
  return config.timers.find((t) => t.unit === unitOrId || t.id === unitOrId) || null;
}

export function findLogFile(config, id) {
  if (!id) return null;
  return config.logFiles.find((f) => f.id === id) || null;
}
