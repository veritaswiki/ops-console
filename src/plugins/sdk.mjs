import { resolveSecretRef } from '../config.mjs';

export const PLUGIN_CATEGORIES = [
  { id: 'mcp', label: 'MCP 协议服务', desc: 'Model Context Protocol (JSON-RPC 2.0) 工具与上下文服务' },
  { id: 'agent', label: 'Agent 运行态', desc: 'AI Agent 编排器、A2A Agent Card 与本地运行时' },
  { id: 'gateway', label: '模型网关', desc: 'OpenAI 兼容推理网关、Ollama、vLLM、LiteLLM 与路由器' },
  { id: 'memory', label: '记忆与检索', desc: '长期记忆库、向量检索、知识工作台与重排服务' },
  { id: 'network', label: '网络与安全', desc: 'Tailscale Mesh、代理内核与主机监听防火墙审计' },
  { id: 'infra', label: '基础设施', desc: '文件同步、存储与后台守护进程' },
  { id: 'custom', label: '自定义接入', desc: '任意自托管 HTTP/HTTPS 健康检查与业务服务' },
];

const VALID_CATEGORIES = new Set(PLUGIN_CATEGORIES.map((c) => c.id));
const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]{1,47}$/;
const CLI_BIN_RE = /^[A-Za-z0-9._/-]{1,128}$/;

export function validatePluginId(id) {
  return typeof id === 'string' && PLUGIN_ID_RE.test(id);
}

export function validateHttpUrl(rawUrl) {
  const str = String(rawUrl || '').trim();
  if (!str) return { ok: true, value: '' };
  try {
    const parsed = new URL(str);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'URL must use http:// or https:// scheme' };
    }
    return { ok: true, value: str.replace(/\/+$/, '') };
  } catch {
    return { ok: false, error: `Invalid URL: ${str}` };
  }
}

export function validateCliBin(rawBin) {
  const str = String(rawBin || '').trim();
  if (!str) return { ok: true, value: '' };
  if (!CLI_BIN_RE.test(str) || str.includes('..')) {
    return { ok: false, error: 'CLI binary name contains invalid characters' };
  }
  return { ok: true, value: str };
}

export function validatePluginConfig(schema = [], input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Plugin configuration must be a JSON object'], sanitized: {} };
  }
  const errors = [];
  const sanitized = {};
  const allowedKeys = new Set(schema.map((f) => f.key));
  allowedKeys.add('enabled');

  for (const field of schema) {
    if (!(field.key in input)) continue;
    const raw = input[field.key];
    if (field.type === 'boolean') {
      sanitized[field.key] = Boolean(raw);
    } else if (field.type === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        errors.push(`${field.label || field.key} must be a valid number`);
      } else {
        const min = field.min ?? -Infinity;
        const max = field.max ?? Infinity;
        sanitized[field.key] = Math.min(max, Math.max(min, n));
      }
    } else if (field.type === 'url') {
      const check = validateHttpUrl(raw);
      if (!check.ok) errors.push(`${field.label || field.key}: ${check.error}`);
      else sanitized[field.key] = check.value;
    } else if (field.type === 'cli') {
      const check = validateCliBin(raw);
      if (!check.ok) errors.push(`${field.label || field.key}: ${check.error}`);
      else sanitized[field.key] = check.value;
    } else if (field.type === 'secret') {
      const val = String(raw ?? '').trim();
      // Preserve sentinel if user didn't overwrite an existing masked secret
      if (val !== '••••••••') {
        sanitized[field.key] = val;
      }
    } else if (field.type === 'select') {
      const val = String(raw ?? '').trim();
      const options = Array.isArray(field.options) ? field.options.map((o) => (typeof o === 'string' ? o : o.value)) : [];
      if (options.length > 0 && !options.includes(val)) {
        errors.push(`${field.label || field.key} has unsupported option: ${val}`);
      } else {
        sanitized[field.key] = val;
      }
    } else {
      sanitized[field.key] = String(raw ?? '').trim().slice(0, 512);
    }
  }

  if ('enabled' in input) {
    sanitized.enabled = Boolean(input.enabled);
  }

  return { ok: errors.length === 0, errors, sanitized };
}

export function redactPluginConfig(schema = [], cfg = {}) {
  const secretKeys = new Set(schema.filter((f) => f.type === 'secret').map((f) => f.key));
  const out = {};
  for (const [key, value] of Object.entries(cfg || {})) {
    if (secretKeys.has(key)) {
      const str = String(value || '').trim();
      if (!str) {
        out[key] = '';
      } else if (str.startsWith('env://') || str.startsWith('file://')) {
        out[key] = str;
      } else {
        out[key] = '••••••••';
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function resolvePluginConfigSecrets(schema = [], cfg = {}, env = process.env) {
  const secretKeys = new Set(schema.filter((f) => f.type === 'secret').map((f) => f.key));
  const out = { ...(cfg || {}) };
  for (const key of secretKeys) {
    const raw = String(out[key] || '').trim();
    if (!raw || raw === '••••••••') {
      out[key] = '';
      continue;
    }
    try {
      out[key] = resolveSecretRef(raw, { env, fieldName: `plugin.${key}` });
    } catch {
      out[key] = '';
    }
  }
  return out;
}

export function definePlugin(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('definePlugin requires a plugin specification object');
  }
  if (!validatePluginId(spec.id)) {
    throw new Error(`Invalid plugin id: "${spec.id}" (must match /^[a-z0-9][a-z0-9-]{1,47}$/)`);
  }
  const category = VALID_CATEGORIES.has(spec.category) ? spec.category : 'custom';
  if (typeof spec.collect !== 'function') {
    throw new Error(`Plugin "${spec.id}" must implement an async collect(cfg, ctx) function`);
  }

  return Object.freeze({
    id: spec.id,
    name: String(spec.name || spec.id),
    version: String(spec.version || '1.0.0'),
    category,
    slot: String(spec.slot || category),
    legacyKey: spec.legacyKey ? String(spec.legacyKey) : null,
    source: String(spec.source || 'builtin'),
    description: String(spec.description || ''),
    officialSpec: {
      protocol: String(spec.officialSpec?.protocol || 'HTTP / JSON'),
      docsUrl: String(spec.officialSpec?.docsUrl || ''),
      endpoints: Array.isArray(spec.officialSpec?.endpoints) ? spec.officialSpec.endpoints.map(String) : [],
      auth: String(spec.officialSpec?.auth || 'None'),
    },
    capabilities: Array.isArray(spec.capabilities) ? spec.capabilities.map(String) : ['health'],
    configSchema: Array.isArray(spec.configSchema) ? spec.configSchema : [],
    defaultConfig: { enabled: false, ...(spec.defaultConfig || {}) },
    agentMatchers: Array.isArray(spec.agentMatchers) ? spec.agentMatchers : [],
    collect: spec.collect,
    testConnection: typeof spec.testConnection === 'function' ? spec.testConnection : null,
    search: typeof spec.search === 'function' ? spec.search : null,
    doctor: typeof spec.doctor === 'function' ? spec.doctor : null,
    summarize: typeof spec.summarize === 'function' ? spec.summarize : null,
    demoSample: typeof spec.demoSample === 'function' ? spec.demoSample : null,
  });
}
