import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(__dirname, '..');

let pkgVersion = '0.4.0';
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
  { category: 'orchestrator', label: 'Orchestrator', pattern: 'agent-orchestrator|langgraph|autogen|crewai' },
  { category: 'mcp', label: 'MCP Server', pattern: 'mcp-server|modelcontextprotocol|fastmcp' },
  { category: 'gateway', label: 'Model Gateway', pattern: 'litellm|ollama|vllm|(^|/)magpie(\\s|$)|magpie-.*bridge' },
  { category: 'memory', label: 'Memory Engine', pattern: 'nmem-server|openviking|qdrant|milvus|rerank|embedding' },
  { category: 'agent-runtime', label: 'Agent Runtime', pattern: '(^|/)codex(\\s|$)|(^|/)claude(\\s|$)|aider|opencode|goose' },
];

const VALID_SCOPES = new Set(['user', 'system']);
const VALID_RISKS = new Set(['standard', 'critical']);
const VALID_SVC_ACTIONS = new Set(['start', 'stop', 'restart', 'reload']);
const VALID_STORAGE_DRIVERS = new Set(['auto', 'sqlite', 'jsonl', 'memory']);
const UNIT_RE = /^[A-Za-z0-9@._:-]{1,128}$/;
export const GIT_REMOTE_RE = /^[A-Za-z0-9._-]{1,64}$/;
export const GIT_REF_RE = /^(?!-)(?!.*\.\.)(?!.*[\s~^:?*[\]\\])[A-Za-z0-9._/-]{1,128}$/;

function readSecretFileStrict(filePath, fieldName) {
  const expanded = filePath.startsWith('~/')
    ? path.join(os.homedir(), filePath.slice(2))
    : path.resolve(filePath);
  const stat = fs.statSync(expanded);
  if (!stat.isFile()) {
    throw new Error(`Secret path for ${fieldName} is not a regular file: ${expanded}`);
  }
  if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0) {
    const octal = (stat.mode & 0o777).toString(8).padStart(3, '0');
    throw new Error(`Secret file for ${fieldName} has unsafe permissions (${octal}); run chmod 600 ${expanded}`);
  }
  return fs.readFileSync(expanded, 'utf8').trim();
}

export function resolveSecretRef(rawValue, { env = process.env, warnings = null, fieldName = 'secret', fromConfig = false } = {}) {
  const str = String(rawValue ?? '').trim();
  if (!str) return '';
  if (str.startsWith('env://')) {
    const varName = str.slice('env://'.length).trim();
    if (!/^[A-Z0-9_]+$/i.test(varName)) {
      throw new Error(`Invalid env:// secret reference for ${fieldName}: ${str}`);
    }
    return String(env[varName] || '').trim();
  }
  if (str.startsWith('file://')) {
    const filePath = str.slice('file://'.length).trim();
    if (!filePath) {
      throw new Error(`Empty file:// secret reference for ${fieldName}`);
    }
    return readSecretFileStrict(filePath, fieldName);
  }
  if (fromConfig && Array.isArray(warnings)) {
    warnings.push(`Literal secret configured in ${fieldName}; prefer env:// or file:// (0600) indirection.`);
  }
  return str;
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  const out = {
    configPath: '',
    hosts: null,
    port: null,
    webKey: null,
    readOnly: null,
    demo: null,
    allowIframe: null,
    hotReload: null,
    supervised: false,
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
    else if (arg === '--allow-iframe') out.allowIframe = true;
    else if (arg === '--hot' || arg === '--hot-reload') out.hotReload = true;
    else if (arg === '--no-hot-reload') out.hotReload = false;
    else if (arg === '--supervised') out.supervised = true;
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

  const a2aSecret = raw.a2a?.sharedSecret ?? '';
  if (a2aSecret && (typeof a2aSecret !== 'string' || a2aSecret.length < 16)) {
    errors.push('a2a.sharedSecret must be empty or a string with at least 16 characters');
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
        if (svc.allowedActions !== undefined && svc.allowedActions !== null) {
          if (!Array.isArray(svc.allowedActions) || svc.allowedActions.some((a) => !VALID_SVC_ACTIONS.has(a))) {
            errors.push(`Invalid allowedActions for ${svc.id}`);
          }
        }
        if (svc.dependsOn !== undefined && !Array.isArray(svc.dependsOn)) {
          errors.push(`Invalid dependsOn for ${svc.id}: must be an array`);
        }
        if (svc.adminUrl !== undefined && svc.adminUrl !== null && svc.adminUrl !== '') {
          if (typeof svc.adminUrl !== 'string') {
            errors.push(`Invalid adminUrl for ${svc.id}: must be a string`);
          } else {
            try {
              const parsedAdmin = new URL(svc.adminUrl.trim());
              if (parsedAdmin.protocol !== 'http:' && parsedAdmin.protocol !== 'https:') {
                errors.push(`Invalid adminUrl protocol for ${svc.id}: only http/https allowed`);
              }
            } catch {
              errors.push(`Invalid adminUrl for ${svc.id}: must be a valid http/https URL`);
            }
          }
        }
        if (svc.adminLabel !== undefined && svc.adminLabel !== null && typeof svc.adminLabel !== 'string') {
          errors.push(`Invalid adminLabel for ${svc.id}: must be a string`);
        }
        if (svc.logFile !== undefined && svc.logFile !== null && svc.logFile !== '') {
          if (typeof svc.logFile !== 'string' || svc.logFile.includes('\0')) {
            errors.push(`Invalid logFile for ${svc.id}: must be a valid file path string`);
          }
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
  if (raw.fleet?.declaredNodes !== undefined && !Array.isArray(raw.fleet.declaredNodes)) {
    errors.push('fleet.declaredNodes must be an array');
  }
  if (raw.fleet?.meshLinks !== undefined && !Array.isArray(raw.fleet.meshLinks)) {
    errors.push('fleet.meshLinks must be an array');
  }
  if (raw.storage?.driver !== undefined && !VALID_STORAGE_DRIVERS.has(raw.storage.driver)) {
    errors.push(`Invalid storage.driver: ${raw.storage.driver}`);
  }
  if (raw.updates !== undefined) {
    if (!raw.updates || typeof raw.updates !== 'object' || Array.isArray(raw.updates)) {
      errors.push('updates must be an object');
    } else {
      if (raw.updates.remote !== undefined && raw.updates.remote !== '' && !GIT_REMOTE_RE.test(String(raw.updates.remote))) {
        errors.push(`Invalid updates.remote: ${raw.updates.remote}`);
      }
      if (raw.updates.branch !== undefined && raw.updates.branch !== '' && !GIT_REF_RE.test(String(raw.updates.branch))) {
        errors.push(`Invalid updates.branch: ${raw.updates.branch}`);
      }
      if (raw.updates.watchDebounceMs !== undefined) {
        const debounce = Number(raw.updates.watchDebounceMs);
        if (!Number.isFinite(debounce) || debounce < 50 || debounce > 30_000) {
          errors.push(`Invalid updates.watchDebounceMs: ${raw.updates.watchDebounceMs}`);
        }
      }
      if (raw.updates.autoCheckIntervalSec !== undefined) {
        const interval = Number(raw.updates.autoCheckIntervalSec);
        if (!Number.isFinite(interval) || interval < 0 || interval > 86_400) {
          errors.push(`Invalid updates.autoCheckIntervalSec: ${raw.updates.autoCheckIntervalSec}`);
        }
      }
    }
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
  const warnings = [];
  let webKeyOverride = null;
  if (cli.webKey !== null && cli.webKey !== undefined) {
    warnings.push('Passing --web-key on the CLI leaks the secret to process listings; use OPS_CONSOLE_WEB_KEY_FILE or LoadCredential.');
    webKeyOverride = resolveSecretRef(cli.webKey, { env, warnings, fieldName: '--web-key' });
  } else if (env.OPS_CONSOLE_WEB_KEY_FILE) {
    webKeyOverride = readSecretFileStrict(env.OPS_CONSOLE_WEB_KEY_FILE, 'OPS_CONSOLE_WEB_KEY_FILE');
  } else if (env.OPS_CONSOLE_WEB_KEY !== undefined) {
    webKeyOverride = resolveSecretRef(env.OPS_CONSOLE_WEB_KEY, { env, warnings, fieldName: 'OPS_CONSOLE_WEB_KEY' });
  }
  const readOnlyOverride = cli.readOnly ?? parseBoolEnv(env.OPS_CONSOLE_READ_ONLY);
  const dataDirOverride = env.OPS_CONSOLE_DATA_DIR || null;
  const resolvedWebKey = webKeyOverride !== null
    ? webKeyOverride
    : resolveSecretRef(raw.auth?.webKey ?? '', { env, warnings, fieldName: 'auth.webKey', fromConfig: true });
  const resolvedMihomoSecret = raw.connectors?.mihomo?.secret
    ? resolveSecretRef(raw.connectors.mihomo.secret, { env, warnings, fieldName: 'connectors.mihomo.secret', fromConfig: true })
    : String(env.MIHOMO_API_SECRET || '').trim();
  const resolvedSyncthingKey = raw.connectors?.syncthing?.apiKey
    ? resolveSecretRef(raw.connectors.syncthing.apiKey, { env, warnings, fieldName: 'connectors.syncthing.apiKey', fromConfig: true })
    : String(env.SYNCTHING_API_KEY || '').trim();

  let resolvedA2ASecret = '';
  let resolvedA2ASecretSource = 'ephemeral';
  if (env.OPS_A2A_SHARED_SECRET_FILE) {
    resolvedA2ASecret = readSecretFileStrict(env.OPS_A2A_SHARED_SECRET_FILE, 'OPS_A2A_SHARED_SECRET_FILE');
    resolvedA2ASecretSource = resolvedA2ASecret ? 'file' : 'ephemeral';
  } else if (env.OPS_A2A_SHARED_SECRET !== undefined && String(env.OPS_A2A_SHARED_SECRET).trim()) {
    const rawEnvA2A = String(env.OPS_A2A_SHARED_SECRET).trim();
    resolvedA2ASecret = resolveSecretRef(rawEnvA2A, { env, warnings, fieldName: 'OPS_A2A_SHARED_SECRET' });
    resolvedA2ASecretSource = resolvedA2ASecret
      ? (rawEnvA2A.startsWith('file://') ? 'file' : 'env')
      : 'ephemeral';
  } else if (raw.a2a?.sharedSecret) {
    const rawCfgA2A = String(raw.a2a.sharedSecret).trim();
    resolvedA2ASecret = resolveSecretRef(rawCfgA2A, { env, warnings, fieldName: 'a2a.sharedSecret', fromConfig: true });
    resolvedA2ASecretSource = resolvedA2ASecret
      ? (rawCfgA2A.startsWith('file://') ? 'file' : (rawCfgA2A.startsWith('env://') ? 'env' : 'config'))
      : 'ephemeral';
  }

  const merged = {
    configPath: resolvedPath || null,
    demo: Boolean(demoMode),
    warnings,
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
      webKey: String(resolvedWebKey || '').trim(),
    },
    a2a: {
      sharedSecret: String(resolvedA2ASecret || '').trim(),
      secretSource: resolvedA2ASecret ? resolvedA2ASecretSource : 'ephemeral',
    },
    security: {
      allowedOrigins: Array.isArray(raw.security?.allowedOrigins) ? raw.security.allowedOrigins : [],
      rateLimitPerMinute: Math.max(30, Number(raw.security?.rateLimitPerMinute || 240)),
      mutatingRateLimitPerMinute: Math.max(5, Number(raw.security?.mutatingRateLimitPerMinute || 30)),
      maxSseStreams: Math.min(32, Math.max(1, Number(raw.security?.maxSseStreams || 8))),
      trustProxy: Boolean(parseBoolEnv(env.OPS_CONSOLE_TRUST_PROXY) ?? raw.security?.trustProxy ?? false),
      allowIframe: Boolean(cli.allowIframe ?? parseBoolEnv(env.OPS_CONSOLE_ALLOW_IFRAME) ?? raw.security?.allowIframe ?? false),
      exposeClientIps: Boolean(raw.security?.exposeClientIps ?? false),
      requireCriticalConfirm: raw.security?.requireCriticalConfirm !== undefined
        ? Boolean(raw.security.requireCriticalConfirm)
        : true,
    },
    storage: {
      driver: String(env.OPS_CONSOLE_STORAGE_DRIVER || raw.storage?.driver || 'auto').toLowerCase(),
      rawRetentionDays: Math.max(1, Number(raw.storage?.rawRetentionDays || 7)),
      rollup1mDays: Math.max(1, Number(raw.storage?.rollup1mDays || 30)),
      rollup5mDays: Math.max(7, Number(raw.storage?.rollup5mDays || 365)),
      incidentRetentionDays: Math.max(7, Number(raw.storage?.incidentRetentionDays || 90)),
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
      adminUrl: s.adminUrl ? String(s.adminUrl).trim() : null,
      adminLabel: s.adminLabel ? String(s.adminLabel).trim() : null,
      logFile: s.logFile && String(s.logFile).trim() ? path.resolve(String(s.logFile).trim()) : null,
      optional: Boolean(s.optional),
      risk: s.risk === 'critical' ? 'critical' : 'standard',
      riskNote: s.riskNote ? String(s.riskNote) : '',
      allowedActions: Array.isArray(s.allowedActions) ? s.allowedActions.map(String) : null,
      dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn.map(String) : [],
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
        adminConsoleUrl: String(raw.connectors?.tailscale?.adminConsoleUrl || 'https://login.tailscale.com/admin/machines'),
      },
      cloudflare: {
        enabled: raw.connectors?.cloudflare?.enabled !== undefined ? Boolean(raw.connectors.cloudflare.enabled) : true,
        cliBin: raw.connectors?.cloudflare?.cliBin || 'cloudflared',
        warpBin: raw.connectors?.cloudflare?.warpBin || 'warp-cli',
        configPath: String(raw.connectors?.cloudflare?.configPath || ''),
        tunnelName: String(raw.connectors?.cloudflare?.tunnelName || ''),
        dashboardUrl: String(raw.connectors?.cloudflare?.dashboardUrl || 'https://one.dash.cloudflare.com/'),
        lanRoutes: Array.isArray(raw.connectors?.cloudflare?.lanRoutes)
          ? raw.connectors.cloudflare.lanRoutes
              .filter((r) => r && typeof r === 'object')
              .map((r) => ({
                id: String(r.id || r.cidr || r.hostname || ''),
                name: String(r.name || r.cidr || r.hostname || 'LAN Route'),
                cidr: String(r.cidr || ''),
                hostname: String(r.hostname || ''),
                target: String(r.target || ''),
                comment: String(r.comment || ''),
              }))
          : [],
      },
      mihomo: {
        enabled: Boolean(raw.connectors?.mihomo?.enabled),
        apiUrl: raw.connectors?.mihomo?.apiUrl || 'http://127.0.0.1:19090',
        secret: resolvedMihomoSecret,
      },
      syncthing: {
        enabled: Boolean(raw.connectors?.syncthing?.enabled),
        apiUrl: raw.connectors?.syncthing?.apiUrl || 'http://127.0.0.1:8384',
        apiKey: resolvedSyncthingKey,
      },
      firewall: {
        enabled: raw.connectors?.firewall?.enabled !== undefined ? Boolean(raw.connectors.firewall.enabled) : true,
      },
      customHttp: Array.isArray(raw.connectors?.customHttp) ? raw.connectors.customHttp : [],
    },
    logFiles: Array.isArray(raw.logFiles) ? raw.logFiles.map((f) => ({
      id: String(f.id),
      name: String(f.name || f.id),
      path: path.resolve(String(f.path)),
      serviceId: f.serviceId ? String(f.serviceId).trim() : '',
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
    fleet: {
      localNode: {
        id: String(raw.fleet?.localNode?.id || 'hub-primary'),
        name: String(raw.fleet?.localNode?.name || raw.console?.title || 'Hub Primary'),
        role: String(raw.fleet?.localNode?.role || 'Primary Control Plane'),
        region: String(raw.fleet?.localNode?.region || 'Primary Region'),
        provider: String(raw.fleet?.localNode?.provider || 'Self-Hosted'),
        tailscaleIp: String(raw.fleet?.localNode?.tailscaleIp || ''),
        lat: Number.isFinite(Number(raw.fleet?.localNode?.lat)) ? Number(raw.fleet.localNode.lat) : 31.23,
        lon: Number.isFinite(Number(raw.fleet?.localNode?.lon)) ? Number(raw.fleet.localNode.lon) : 121.47,
      },
      probeStaleSec: Math.max(20, Number(raw.fleet?.probeStaleSec || 90)),
      probeOfflineSec: Math.max(45, Number(raw.fleet?.probeOfflineSec || 180)),
      requireTailscaleCidr: raw.fleet?.requireTailscaleCidr !== undefined
        ? Boolean(raw.fleet.requireTailscaleCidr)
        : true,
      historyPoints: Math.min(180, Math.max(15, Number(raw.fleet?.historyPoints || 60))),
      maxProbes: Math.min(512, Math.max(8, Number(raw.fleet?.maxProbes || 128))),
      declaredNodes: Array.isArray(raw.fleet?.declaredNodes) ? raw.fleet.declaredNodes.map((node) => ({
        id: String(node.id || '').toLowerCase(),
        name: String(node.name || node.id || ''),
        deviceType: String(node.deviceType || 'server'),
        probeMode: String(node.probeMode || (node.deviceType === 'mobile' ? 'checkin' : 'push')),
        role: String(node.role || ''),
        region: String(node.region || ''),
        provider: String(node.provider || ''),
        tailscaleIp: String(node.tailscaleIp || ''),
        probeHost: String(node.probeHost || '').trim(),
        probePort: Number.isInteger(Number(node.probePort)) && Number(node.probePort) >= 1 && Number(node.probePort) <= 65535
          ? Number(node.probePort)
          : null,
        probeProtocol: String(node.probeProtocol || 'tcp').toLowerCase() === 'tcp' ? 'tcp' : 'tcp',
        probeTimeoutMs: Number.isFinite(Number(node.probeTimeoutMs))
          ? Math.min(5000, Math.max(500, Math.round(Number(node.probeTimeoutMs))))
          : 2200,
        knownStatus: ['offline', 'degraded', 'standby', 'healthy'].includes(String(node.knownStatus || '').toLowerCase())
          ? String(node.knownStatus).toLowerCase()
          : '',
        expectedOfflineReason: String(node.expectedOfflineReason || '').trim().slice(0, 240),
        lat: Number.isFinite(Number(node.lat)) ? Number(node.lat) : null,
        lon: Number.isFinite(Number(node.lon)) ? Number(node.lon) : null,
        note: String(node.note || ''),
      })).filter((node) => node.id) : [],
      meshLinks: Array.isArray(raw.fleet?.meshLinks) ? raw.fleet.meshLinks.map((link) => ({
        from: String(link.from || ''),
        to: String(link.to || ''),
        kind: String(link.kind || 'direct'),
        label: String(link.label || ''),
      })).filter((link) => link.from && link.to) : [],
    },
    ops: {
      healthScript: raw.ops?.healthScript ? path.resolve(String(raw.ops.healthScript)) : '',
      backupScript: raw.ops?.backupScript ? path.resolve(String(raw.ops.backupScript)) : '',
      healthLatestPath: raw.ops?.healthLatestPath ? path.resolve(String(raw.ops.healthLatestPath)) : '',
      backupLastRunPath: raw.ops?.backupLastRunPath ? path.resolve(String(raw.ops.backupLastRunPath)) : '',
      alertsLogPath: raw.ops?.alertsLogPath ? path.resolve(String(raw.ops.alertsLogPath)) : '',
    },
    plugins: {
      dir: raw.plugins?.dir ? path.resolve(String(raw.plugins.dir)) : path.join(PACKAGE_ROOT, 'plugins'),
      configs: raw.plugins?.configs && typeof raw.plugins.configs === 'object' && !Array.isArray(raw.plugins.configs)
        ? raw.plugins.configs
        : {},
    },
    updates: {
      enabled: parseBoolEnv(env.OPS_CONSOLE_UPDATES_ENABLED)
        ?? (raw.updates?.enabled !== undefined ? Boolean(raw.updates.enabled) : true),
      remote: String(env.OPS_CONSOLE_UPDATE_REMOTE || raw.updates?.remote || 'origin').trim() || 'origin',
      branch: String(env.OPS_CONSOLE_UPDATE_BRANCH || raw.updates?.branch || 'main').trim() || 'main',
      watchConfig: cli.hotReload
        ?? parseBoolEnv(env.OPS_CONSOLE_HOT_RELOAD)
        ?? (raw.updates?.watchConfig !== undefined ? Boolean(raw.updates.watchConfig) : true),
      watchPlugins: cli.hotReload
        ?? parseBoolEnv(env.OPS_CONSOLE_HOT_RELOAD)
        ?? (raw.updates?.watchPlugins !== undefined ? Boolean(raw.updates.watchPlugins) : true),
      watchPublic: cli.hotReload
        ?? parseBoolEnv(env.OPS_CONSOLE_HOT_RELOAD)
        ?? (raw.updates?.watchPublic !== undefined ? Boolean(raw.updates.watchPublic) : true),
      watchDebounceMs: Math.min(30_000, Math.max(50, Number(raw.updates?.watchDebounceMs || 500))),
      autoCheckIntervalSec: Math.min(86_400, Math.max(0, Number(raw.updates?.autoCheckIntervalSec || 0))),
      allowSelfRestart: raw.updates?.allowSelfRestart !== undefined
        ? Boolean(raw.updates.allowSelfRestart)
        : true,
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

function stableEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function applyHotConfigUpdate(targetConfig, nextConfig) {
  if (!targetConfig || !nextConfig) {
    throw new Error('Both targetConfig and nextConfig are required');
  }

  const restartRequiredFields = [];
  if (!stableEqual(targetConfig.console?.hosts, nextConfig.console?.hosts)) {
    restartRequiredFields.push('console.hosts');
  }
  if (targetConfig.console?.port !== nextConfig.console?.port) {
    restartRequiredFields.push('console.port');
  }
  if (targetConfig.console?.dataDir !== nextConfig.console?.dataDir) {
    restartRequiredFields.push('console.dataDir');
  }
  if (targetConfig.storage?.driver !== nextConfig.storage?.driver) {
    restartRequiredFields.push('storage.driver');
  }
  if (Boolean(targetConfig.demo) !== Boolean(nextConfig.demo)) {
    restartRequiredFields.push('demo');
  }

  const changedSections = [];
  const consoleHotFields = ['title', 'subtitle', 'readOnly'];
  let consoleChanged = false;
  for (const field of consoleHotFields) {
    if (!stableEqual(targetConfig.console?.[field], nextConfig.console?.[field])) {
      targetConfig.console[field] = nextConfig.console[field];
      consoleChanged = true;
    }
  }
  if (consoleChanged) changedSections.push('console');

  const storageHotFields = ['rawRetentionDays', 'rollup1mDays', 'rollup5mDays', 'incidentRetentionDays'];
  let storageChanged = false;
  for (const field of storageHotFields) {
    if (!stableEqual(targetConfig.storage?.[field], nextConfig.storage?.[field])) {
      targetConfig.storage[field] = nextConfig.storage[field];
      storageChanged = true;
    }
  }
  if (storageChanged) changedSections.push('storage');

  const hotSections = [
    'auth',
    'a2a',
    'security',
    'logging',
    'host',
    'layers',
    'services',
    'timers',
    'connectors',
    'logFiles',
    'remotes',
    'fleet',
    'ops',
    'plugins',
    'updates',
    'agentMatchers',
  ];
  for (const section of hotSections) {
    if (!stableEqual(targetConfig[section], nextConfig[section])) {
      targetConfig[section] = nextConfig[section];
      changedSections.push(section);
    }
  }
  targetConfig.warnings = Array.isArray(nextConfig.warnings) ? [...nextConfig.warnings] : [];

  return {
    changed: changedSections.length > 0 || restartRequiredFields.length > 0,
    changedSections,
    restartRequiredFields,
  };
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
  const direct = config.logFiles.find((f) => f.id === id);
  if (direct) return direct;
  if (String(id).startsWith('svc-file:')) {
    const svcId = String(id).slice('svc-file:'.length);
    const svc = config.services.find((s) => s.id === svcId && s.logFile);
    if (svc) {
      return {
        id: `svc-file:${svc.id}`,
        name: `${svc.name} 原生日志`,
        path: svc.logFile,
        serviceId: svc.id,
        unit: svc.unit,
      };
    }
  }
  return null;
}
