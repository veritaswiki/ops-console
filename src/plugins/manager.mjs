import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKAGE_ROOT } from '../config.mjs';
import { resolveSafePath } from '../security.mjs';
import { agentRuntimePlugin, collectAgentRuntime } from './builtin/agent-runtime.mjs';
import { collectCustomHttp, customHttpPlugin } from './builtin/custom-http.mjs';
import { collectMcpServer, mcpServerPlugin } from './builtin/mcp-server.mjs';
import { OFFICIAL_CONNECTOR_PLUGINS } from './builtin/official-connectors.mjs';
import { collectOpenAiGateway, openaiGatewayPlugin } from './builtin/openai-gateway.mjs';
import {
  definePlugin,
  PLUGIN_CATEGORIES,
  redactPluginConfig,
  resolvePluginConfigSecrets,
  validateHttpUrl,
  validatePluginConfig,
  validatePluginId,
} from './sdk.mjs';

const BUILTIN_PLUGINS = [
  mcpServerPlugin,
  agentRuntimePlugin,
  openaiGatewayPlugin,
  ...OFFICIAL_CONNECTOR_PLUGINS,
  customHttpPlugin,
];

const CUSTOM_KIND_META = {
  mcp: {
    category: 'mcp',
    slot: 'mcp',
    protocol: 'MCP 2025-03-26 Streamable HTTP (JSON-RPC 2.0)',
    docsUrl: 'https://modelcontextprotocol.io/specification',
    endpoints: ['POST <apiUrl> → initialize', 'POST <apiUrl> → tools/list', 'POST <apiUrl> → resources/list'],
    auth: '可选 Authorization: Bearer <token>',
    capabilities: ['health', 'inventory', 'tools', 'resources'],
    collectFn: collectMcpServer,
    summarizeFn: (d) => (!d?.enabled ? '未启用' : d.reachable ? `${d.toolsCount ?? 0} Tools · ${d.resourcesCount ?? 0} Resources` : d.error || '不可达'),
  },
  agent: {
    category: 'agent',
    slot: 'agent',
    protocol: 'A2A Agent Card (/.well-known/agent.json) + HTTP /health',
    docsUrl: 'https://google.github.io/A2A/specification/',
    endpoints: ['GET /.well-known/agent.json', 'GET <healthPath>'],
    auth: '可选 Authorization: Bearer <token>',
    capabilities: ['health', 'inventory', 'skills'],
    collectFn: collectAgentRuntime,
    summarizeFn: (d) => (!d?.enabled ? '未启用' : d.reachable ? (d.skillsCount > 0 ? `A2A · ${d.skillsCount} Skills` : 'HTTP 健康检查通过') : d.error || '不可达'),
  },
  gateway: {
    category: 'gateway',
    slot: 'gateway',
    protocol: 'OpenAI REST API (GET /v1/models)',
    docsUrl: 'https://platform.openai.com/docs/api-reference/models/list',
    endpoints: ['GET /v1/models'],
    auth: '可选 Authorization: Bearer <apiKey>',
    capabilities: ['health', 'inventory', 'models'],
    collectFn: collectOpenAiGateway,
    summarizeFn: (d) => (!d?.enabled ? '未启用' : d.reachable ? `${d.totalModels ?? 0} 模型` : d.error || '不可达'),
  },
  custom: {
    category: 'custom',
    slot: 'custom',
    protocol: 'HTTP/HTTPS Health Probe',
    docsUrl: 'https://datatracker.ietf.org/doc/html/rfc9110',
    endpoints: ['GET <apiUrl><healthPath>'],
    auth: '可选 Authorization: Bearer <token>',
    capabilities: ['health'],
    collectFn: collectCustomHttp,
    summarizeFn: (d) => (!d?.enabled ? '未启用' : d.reachable ? `HTTP ${d.httpStatus || 200} · ${d.latencyMs ?? 0}ms` : d.error || '不可达'),
  },
};

function buildCustomInstancePlugin(entry) {
  const kind = CUSTOM_KIND_META[entry.kind] ? entry.kind : 'custom';
  const meta = CUSTOM_KIND_META[kind];
  const configSchema = [
    { key: 'displayName', label: '显示名称', type: 'string', default: entry.name || entry.id },
    { key: 'apiUrl', label: '服务地址', type: 'url', default: entry.apiUrl || '' },
    ...(kind === 'agent' || kind === 'custom'
      ? [{ key: 'healthPath', label: '健康检查路径', type: 'string', default: entry.healthPath || '/health' }]
      : []),
    ...(kind === 'gateway'
      ? [{ key: 'apiKey', label: 'API Key (可选)', type: 'secret', default: entry.authToken || '', placeholder: 'env://GATEWAY_API_KEY' }]
      : [{ key: 'authToken', label: 'Bearer Token (可选)', type: 'secret', default: entry.authToken || '', placeholder: 'env://SERVICE_TOKEN' }]),
  ];

  const defaultConfig = {
    enabled: entry.enabled !== false,
    id: entry.id,
    displayName: entry.name || entry.id,
    apiUrl: entry.apiUrl || '',
    healthPath: entry.healthPath || (kind === 'custom' ? '/health' : '/health'),
    authToken: entry.authToken || '',
    apiKey: entry.authToken || '',
  };

  return definePlugin({
    id: entry.id,
    name: entry.name || entry.id,
    version: '1.0.0',
    category: meta.category,
    slot: meta.slot,
    source: 'user-custom',
    description: entry.description || `用户通过 ${meta.protocol} 接入的自定义服务实例。`,
    officialSpec: {
      protocol: meta.protocol,
      docsUrl: meta.docsUrl,
      endpoints: meta.endpoints,
      auth: meta.auth,
    },
    capabilities: meta.capabilities,
    configSchema,
    defaultConfig,
    collect: async (cfg) => {
      const res = await meta.collectFn({ ...cfg, id: entry.id, displayName: cfg.displayName || entry.name });
      return { ...res, id: entry.id, name: cfg.displayName || entry.name || res.name };
    },
    testConnection: async (cfg) => {
      const res = await meta.collectFn({ ...cfg, id: entry.id, displayName: cfg.displayName || entry.name, enabled: true });
      return { ...res, id: entry.id, name: cfg.displayName || entry.name || res.name };
    },
    summarize: meta.summarizeFn,
    demoSample: (cfg) => ({
      id: entry.id,
      name: cfg?.displayName || entry.name || entry.id,
      enabled: true,
      protocol: meta.protocol,
      apiUrl: cfg?.apiUrl || entry.apiUrl,
      reachable: true,
      status: 'healthy',
      latencyMs: 11,
      toolsCount: kind === 'mcp' ? 4 : undefined,
      resourcesCount: kind === 'mcp' ? 2 : undefined,
      skillsCount: kind === 'agent' ? 3 : undefined,
      totalModels: kind === 'gateway' ? 6 : undefined,
      httpStatus: 200,
      steps: [
        { step: `${meta.endpoints[0]} (${cfg?.apiUrl || entry.apiUrl})`, ok: true, status: 200, latencyMs: 11, detail: 'Handshake OK (demo)' },
      ],
      error: null,
    }),
  });
}

export class PluginManager {
  constructor({ config, logger = null, pluginsDir = null } = {}) {
    this.config = config;
    this.logger = logger;
    this.pluginsDir = path.resolve(pluginsDir || config?.plugins?.dir || path.join(PACKAGE_ROOT, 'plugins'));
    this.statePath = path.join(config?.console?.dataDir || path.join(PACKAGE_ROOT, 'data'), 'plugins.json');
    this.plugins = new Map();
    this.state = {
      overrides: {},
      customInstances: [],
    };
    this.lastTelemetry = new Map();
    this.externalLoadErrors = [];
    this.externalMeta = new Map();
    this.configDeclaredCustomIds = new Set();
    this.reloadGeneration = 0;

    for (const plugin of BUILTIN_PLUGINS) {
      this.plugins.set(plugin.id, plugin);
    }
    this._loadStateSync();
    this._hydrateCustomInstances();
  }

  _loadStateSync() {
    try {
      if (!fs.existsSync(this.statePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      if (raw && typeof raw === 'object') {
        this.state = {
          overrides: raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {},
          customInstances: Array.isArray(raw.customInstances) ? raw.customInstances : [],
        };
      }
    } catch {
      this.state = { overrides: {}, customInstances: [] };
    }
  }

  async _persistState() {
    await fsp.mkdir(path.dirname(this.statePath), { recursive: true });
    const tmp = `${this.statePath}.tmp`;
    await fsp.writeFile(tmp, `${JSON.stringify(this.state, null, 2)}\n`, { mode: 0o600 });
    await fsp.rename(tmp, this.statePath);
    try {
      await fsp.chmod(this.statePath, 0o600);
    } catch {
      // ignore on platforms without POSIX chmod
    }
  }

  _hydrateCustomInstances() {
    for (const id of this.configDeclaredCustomIds) {
      const existing = this.plugins.get(id);
      if (existing?.source === 'user-custom') {
        this.plugins.delete(id);
      }
    }
    this.configDeclaredCustomIds.clear();
    for (const entry of this.state.customInstances) {
      if (!entry || !validatePluginId(entry.id) || this.plugins.has(entry.id)) continue;
      try {
        this.plugins.set(entry.id, buildCustomInstancePlugin(entry));
      } catch {
        // skip invalid persisted entry
      }
    }
    // Also hydrate declarative customHttp entries from config.connectors.customHttp
    const declaredHttp = Array.isArray(this.config?.connectors?.customHttp) ? this.config.connectors.customHttp : [];
    for (const item of declaredHttp) {
      const id = String(item?.id || '').trim().toLowerCase();
      if (!validatePluginId(id) || this.plugins.has(id)) continue;
      this.configDeclaredCustomIds.add(id);
      this.plugins.set(id, buildCustomInstancePlugin({
        id,
        name: item.name || id,
        kind: 'custom',
        apiUrl: item.url || item.apiUrl || '',
        healthPath: item.healthPath || '',
        enabled: item.enabled !== false,
        description: item.description || 'Config-declared HTTP service probe',
      }));
    }
  }

  syncConfig(nextConfig) {
    if (nextConfig) {
      this.config = nextConfig;
    }
    const nextDir = path.resolve(this.config?.plugins?.dir || path.join(PACKAGE_ROOT, 'plugins'));
    const dirChanged = nextDir !== this.pluginsDir;
    this.pluginsDir = nextDir;
    this._hydrateCustomInstances();
    this.lastTelemetry.clear();
    return { dirChanged, pluginsDir: this.pluginsDir };
  }

  async loadExternalPlugins({ force = false } = {}) {
    this.externalLoadErrors = [];
    const loaded = [];
    const added = [];
    const updated = [];
    const removed = [];
    const unchanged = [];

    if (!fs.existsSync(this.pluginsDir)) {
      for (const [dirName, meta] of [...this.externalMeta.entries()]) {
        if (this.plugins.get(meta.pluginId)?.source === 'external') this.plugins.delete(meta.pluginId);
        this.externalMeta.delete(dirName);
        this.lastTelemetry.delete(meta.pluginId);
        removed.push(meta.pluginId || dirName);
      }
      return { loaded, added, updated, removed, unchanged, errors: this.externalLoadErrors, revision: this.reloadGeneration };
    }

    let entries = [];
    try {
      entries = await fsp.readdir(this.pluginsDir, { withFileTypes: true });
    } catch {
      return { loaded, added, updated, removed, unchanged, errors: this.externalLoadErrors, revision: this.reloadGeneration };
    }

    const seenDirs = new Set();
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      if (!validatePluginId(entry.name)) {
        this.externalLoadErrors.push({ id: entry.name, error: 'Directory name must match plugin id format' });
        continue;
      }
      const resolvedEntry = await resolveSafePath(this.pluginsDir, path.join(entry.name, 'index.mjs'));
      if (!resolvedEntry) continue;
      let content;
      let stat;
      try {
        [content, stat] = await Promise.all([
          fsp.readFile(resolvedEntry),
          fsp.stat(resolvedEntry),
        ]);
      } catch {
        continue;
      }

      seenDirs.add(entry.name);
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');
      const prevMeta = this.externalMeta.get(entry.name);

      if (!force && prevMeta && prevMeta.contentHash === contentHash && this.plugins.has(prevMeta.pluginId)) {
        loaded.push(prevMeta.pluginId);
        unchanged.push(prevMeta.pluginId);
        continue;
      }

      this.reloadGeneration += 1;
      const moduleUrl = `${pathToFileURL(resolvedEntry).href}?reload=${this.reloadGeneration}&h=${contentHash.slice(0, 12)}&m=${Math.floor(stat.mtimeMs)}`;
      try {
        const mod = await import(moduleUrl);
        const rawSpec = mod.default || mod.plugin;
        const plugin = definePlugin({ ...rawSpec, source: 'external' });
        if (prevMeta && prevMeta.pluginId !== plugin.id && this.plugins.get(prevMeta.pluginId)?.source === 'external') {
          this.plugins.delete(prevMeta.pluginId);
          this.lastTelemetry.delete(prevMeta.pluginId);
        }
        this.plugins.set(plugin.id, plugin);
        this.externalMeta.set(entry.name, {
          dirName: entry.name,
          pluginId: plugin.id,
          filePath: resolvedEntry,
          contentHash,
          mtimeMs: stat.mtimeMs,
          loadedAt: new Date().toISOString(),
        });
        this.lastTelemetry.delete(plugin.id);
        loaded.push(plugin.id);
        if (prevMeta) updated.push(plugin.id);
        else added.push(plugin.id);
        this.logger?.info('external_plugin_loaded', { id: plugin.id, version: plugin.version, category: plugin.category });
      } catch (err) {
        this.externalLoadErrors.push({ id: entry.name, error: err.message });
        this.logger?.warn('external_plugin_failed', { id: entry.name, error: err.message });
      }
    }

    for (const [dirName, meta] of [...this.externalMeta.entries()]) {
      if (seenDirs.has(dirName)) continue;
      if (this.plugins.get(meta.pluginId)?.source === 'external') {
        this.plugins.delete(meta.pluginId);
      }
      this.externalMeta.delete(dirName);
      this.lastTelemetry.delete(meta.pluginId);
      removed.push(meta.pluginId);
      this.logger?.info('external_plugin_removed', { id: meta.pluginId, dirName });
    }

    return { loaded, added, updated, removed, unchanged, errors: this.externalLoadErrors, revision: this.reloadGeneration };
  }

  async reloadExternalPlugins(opts = {}) {
    return this.loadExternalPlugins(opts);
  }

  registerPlugin(spec) {
    const plugin = definePlugin(spec);
    this.plugins.set(plugin.id, plugin);
    return plugin;
  }

  getPlugin(id) {
    return this.plugins.get(id) || null;
  }

  getEffectiveConfig(id, { resolveSecrets = false } = {}) {
    const plugin = this.plugins.get(id);
    if (!plugin) return null;
    const legacyCfg = plugin.legacyKey ? (this.config?.connectors?.[plugin.legacyKey] || {}) : {};
    const declaredPluginCfg = this.config?.plugins?.configs?.[id] || {};
    const overrideCfg = this.state.overrides?.[id] || {};

    // In demo mode, default-enable mcp-server, agent-runtime, openai-gateway, and official stack unless explicitly toggled off
    const demoDefaultEnabled = this.config?.demo && plugin.source === 'builtin' && plugin.id !== 'custom-http'
      ? { enabled: true }
      : {};

    const merged = {
      ...plugin.defaultConfig,
      ...demoDefaultEnabled,
      ...legacyCfg,
      ...declaredPluginCfg,
      ...overrideCfg,
    };

    return resolveSecrets
      ? resolvePluginConfigSecrets(plugin.configSchema, merged)
      : merged;
  }

  getByLegacyKey(legacyKey) {
    for (const plugin of this.plugins.values()) {
      if (plugin.legacyKey === legacyKey) return plugin;
    }
    return null;
  }

  getContributedAgentMatchers() {
    const out = [];
    for (const plugin of this.plugins.values()) {
      const cfg = this.getEffectiveConfig(plugin.id);
      if (!cfg?.enabled) continue;
      for (const matcher of plugin.agentMatchers || []) {
        out.push(matcher);
      }
    }
    return out;
  }

  async collectPlugin(id, ctx = {}) {
    const plugin = this.plugins.get(id);
    if (!plugin) return null;
    const rawCfg = this.getEffectiveConfig(id, { resolveSecrets: true });
    if (!rawCfg?.enabled) {
      const disabled = {
        id: plugin.id,
        name: rawCfg?.displayName || plugin.name,
        enabled: false,
        reachable: false,
        status: 'disabled',
        protocol: plugin.officialSpec.protocol,
      };
      this.lastTelemetry.set(id, disabled);
      return disabled;
    }

    if (this.config?.demo && plugin.demoSample) {
      const sample = plugin.demoSample(rawCfg);
      this.lastTelemetry.set(id, sample);
      return sample;
    }

    try {
      const result = await plugin.collect(rawCfg, ctx);
      this.lastTelemetry.set(id, result);
      return result;
    } catch (err) {
      const failed = {
        id: plugin.id,
        name: rawCfg?.displayName || plugin.name,
        enabled: true,
        reachable: false,
        status: 'offline',
        protocol: plugin.officialSpec.protocol,
        error: err.message || 'Plugin collector error',
      };
      this.lastTelemetry.set(id, failed);
      return failed;
    }
  }

  async collectExtraEnabledPlugins() {
    const extras = [...this.plugins.values()].filter((p) => !p.legacyKey);
    const results = await Promise.all(
      extras.map(async (plugin) => {
        const cfg = this.getEffectiveConfig(plugin.id);
        if (!cfg?.enabled) return null;
        const telemetry = await this.collectPlugin(plugin.id);
        if (!telemetry) return null;
        return {
          id: plugin.id,
          name: telemetry.name || cfg.displayName || plugin.name,
          category: plugin.category,
          source: plugin.source,
          protocol: telemetry.protocol || plugin.officialSpec.protocol,
          status: telemetry.status || (telemetry.reachable ? 'healthy' : 'offline'),
          reachable: Boolean(telemetry.reachable),
          latencyMs: telemetry.latencyMs ?? null,
          summary: plugin.summarize ? plugin.summarize(telemetry) : (telemetry.reachable ? 'Healthy' : (telemetry.error || 'Offline')),
          details: telemetry,
        };
      }),
    );
    return results.filter(Boolean);
  }

  async togglePlugin(id, enabled) {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return { ok: false, statusCode: 404, error: `Unknown plugin: ${id}` };
    }
    const nextEnabled = Boolean(enabled);
    this.state.overrides[id] = {
      ...(this.state.overrides[id] || {}),
      enabled: nextEnabled,
    };
    const customIdx = this.state.customInstances.findIndex((c) => c.id === id);
    if (customIdx >= 0) {
      this.state.customInstances[customIdx] = {
        ...this.state.customInstances[customIdx],
        enabled: nextEnabled,
      };
    }
    if (plugin.legacyKey && this.config?.connectors?.[plugin.legacyKey]) {
      this.config.connectors[plugin.legacyKey].enabled = nextEnabled;
    }
    await this._persistState();
    return { ok: true, id, enabled: nextEnabled };
  }

  async updatePluginConfig(id, patch = {}) {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return { ok: false, statusCode: 404, error: `Unknown plugin: ${id}` };
    }
    const validation = validatePluginConfig(plugin.configSchema, patch);
    if (!validation.ok) {
      return { ok: false, statusCode: 400, error: validation.errors.join('; '), errors: validation.errors };
    }
    this.state.overrides[id] = {
      ...(this.state.overrides[id] || {}),
      ...validation.sanitized,
    };
    if (plugin.legacyKey && this.config?.connectors?.[plugin.legacyKey]) {
      Object.assign(this.config.connectors[plugin.legacyKey], validation.sanitized);
    }
    const customIdx = this.state.customInstances.findIndex((c) => c.id === id);
    if (customIdx >= 0) {
      this.state.customInstances[customIdx] = {
        ...this.state.customInstances[customIdx],
        ...(validation.sanitized.displayName ? { name: validation.sanitized.displayName } : {}),
        ...(validation.sanitized.apiUrl ? { apiUrl: validation.sanitized.apiUrl } : {}),
        ...(validation.sanitized.healthPath ? { healthPath: validation.sanitized.healthPath } : {}),
        ...(validation.sanitized.enabled !== undefined ? { enabled: validation.sanitized.enabled } : {}),
      };
    }
    await this._persistState();
    const effective = this.getEffectiveConfig(id);
    return {
      ok: true,
      id,
      config: redactPluginConfig(plugin.configSchema, effective),
    };
  }

  async addCustomPlugin(input = {}) {
    const name = String(input.name || '').trim().slice(0, 64);
    const kind = CUSTOM_KIND_META[input.kind] ? input.kind : 'custom';
    const rawId = String(input.id || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const id = rawId.startsWith('custom-') ? rawId : `custom-${rawId || Date.now().toString(36)}`;

    if (!name) {
      return { ok: false, statusCode: 400, error: '请填写服务名称' };
    }
    if (!validatePluginId(id)) {
      return { ok: false, statusCode: 400, error: `无效的插件 ID: ${id}` };
    }
    if (this.plugins.has(id)) {
      return { ok: false, statusCode: 409, error: `插件 ID 已存在: ${id}` };
    }
    const urlCheck = validateHttpUrl(input.apiUrl);
    if (!urlCheck.ok || !urlCheck.value) {
      return { ok: false, statusCode: 400, error: urlCheck.error || '请填写有效的 http:// 或 https:// 地址' };
    }

    const entry = {
      id,
      name,
      kind,
      apiUrl: urlCheck.value,
      healthPath: String(input.healthPath || (kind === 'custom' ? '/health' : '')).trim().slice(0, 128),
      authToken: String(input.authToken || '').trim().slice(0, 256),
      description: String(input.description || '').trim().slice(0, 220),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const plugin = buildCustomInstancePlugin(entry);
    this.plugins.set(id, plugin);
    this.state.customInstances.push(entry);
    this.state.overrides[id] = {
      enabled: true,
      displayName: entry.name,
      apiUrl: entry.apiUrl,
      healthPath: entry.healthPath,
      authToken: entry.authToken,
      apiKey: entry.authToken,
    };
    await this._persistState();
    return {
      ok: true,
      id,
      plugin: this._serializePlugin(plugin),
    };
  }

  async removeCustomPlugin(id) {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return { ok: false, statusCode: 404, error: `Unknown plugin: ${id}` };
    }
    if (plugin.source !== 'user-custom') {
      return { ok: false, statusCode: 400, error: '只能删除用户自定义接入的插件实例（内置插件请使用禁用开关）' };
    }
    this.plugins.delete(id);
    this.lastTelemetry.delete(id);
    delete this.state.overrides[id];
    this.state.customInstances = this.state.customInstances.filter((c) => c.id !== id);
    await this._persistState();
    return { ok: true, id };
  }

  async testPlugin(id, overrideConfig = null) {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return { ok: false, statusCode: 404, error: `Unknown plugin: ${id}` };
    }
    const baseCfg = this.getEffectiveConfig(id, { resolveSecrets: true }) || {};
    let mergedCfg = { ...baseCfg, enabled: true };
    if (overrideConfig && typeof overrideConfig === 'object') {
      const validation = validatePluginConfig(plugin.configSchema, overrideConfig);
      if (!validation.ok) {
        return { ok: false, statusCode: 400, error: validation.errors.join('; ') };
      }
      mergedCfg = resolvePluginConfigSecrets(plugin.configSchema, { ...mergedCfg, ...validation.sanitized });
    }

    if (this.config?.demo) {
      const sample = plugin.demoSample
        ? plugin.demoSample(mergedCfg)
        : {
            id: plugin.id,
            name: mergedCfg.displayName || plugin.name,
            enabled: true,
            reachable: true,
            status: 'healthy',
            latencyMs: 8,
            protocol: plugin.officialSpec.protocol,
            steps: (plugin.officialSpec.endpoints || []).slice(0, 3).map((ep, idx) => ({
              step: ep,
              ok: true,
              status: 200,
              latencyMs: 3 + idx * 2,
              detail: 'Verified (demo sandbox)',
            })),
          };
      return {
        ok: true,
        id: plugin.id,
        reachable: Boolean(sample.reachable),
        status: sample.status || 'healthy',
        latencyMs: sample.latencyMs ?? 8,
        protocol: sample.protocol || plugin.officialSpec.protocol,
        summary: plugin.summarize ? plugin.summarize(sample) : 'Connected',
        steps: sample.steps || [],
        error: sample.error || null,
        testedAt: new Date().toISOString(),
      };
    }

    const runner = plugin.testConnection || plugin.collect;
    try {
      const res = await runner(mergedCfg, { awaitCli: true });
      return {
        ok: Boolean(res?.reachable),
        id: plugin.id,
        reachable: Boolean(res?.reachable),
        status: res?.status || (res?.reachable ? 'healthy' : 'offline'),
        latencyMs: res?.latencyMs ?? null,
        protocol: res?.protocol || plugin.officialSpec.protocol,
        summary: plugin.summarize ? plugin.summarize(res) : (res?.reachable ? 'Healthy' : (res?.error || 'Unreachable')),
        steps: Array.isArray(res?.steps) ? res.steps : [
          {
            step: plugin.officialSpec.endpoints[0] || plugin.officialSpec.protocol,
            ok: Boolean(res?.reachable),
            status: res?.reachable ? 200 : 0,
            latencyMs: res?.latencyMs ?? null,
            detail: res?.reachable ? (plugin.summarize ? plugin.summarize(res) : 'OK') : (res?.error || 'Unreachable'),
          },
        ],
        error: res?.error || null,
        testedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        ok: false,
        id: plugin.id,
        reachable: false,
        status: 'offline',
        latencyMs: null,
        protocol: plugin.officialSpec.protocol,
        summary: err.message,
        steps: [],
        error: err.message,
        testedAt: new Date().toISOString(),
      };
    }
  }

  _extractLegacyTelemetry(plugin, snapshot) {
    if (!snapshot || !plugin.legacyKey) return null;
    const k = plugin.legacyKey;
    if (k === 'magpie') return snapshot.magpie || null;
    if (k === 'nmem' || k === 'openviking' || k === 'symbiote' || k === 'rerank') return snapshot.memory?.[k] || null;
    if (k === 'tailscale') return snapshot.network?.tailscale || snapshot.tailscale || null;
    if (k === 'mihomo') return snapshot.network?.mihomo || null;
    if (k === 'syncthing') return snapshot.network?.syncthing || null;
    if (k === 'firewall') return snapshot.firewall || snapshot.network?.firewall || null;
    return null;
  }

  _serializePlugin(plugin, snapshot = null, snapshotPluginMap = null) {
    const cfg = this.getEffectiveConfig(plugin.id) || {};
    const enabled = Boolean(cfg.enabled);
    const extraDetails = snapshotPluginMap
      ? snapshotPluginMap.get(plugin.id)?.details
      : snapshot?.plugins?.find((p) => p.id === plugin.id)?.details;
    const live = this._extractLegacyTelemetry(plugin, snapshot)
      || extraDetails
      || this.lastTelemetry.get(plugin.id)
      || null;

    const status = !enabled
      ? 'disabled'
      : (live?.status || (live?.reachable ? 'healthy' : 'standby'));
    const summary = !enabled
      ? '未启用'
      : live && plugin.summarize
        ? plugin.summarize({ ...live, enabled: true })
        : (live?.reachable ? '运行中' : '等待采集');

    return {
      id: plugin.id,
      name: cfg.displayName || plugin.name,
      version: plugin.version,
      category: plugin.category,
      slot: plugin.slot,
      source: plugin.source,
      legacyKey: plugin.legacyKey,
      description: plugin.description,
      officialSpec: plugin.officialSpec,
      capabilities: plugin.capabilities,
      configSchema: plugin.configSchema,
      config: redactPluginConfig(plugin.configSchema, cfg),
      enabled,
      status,
      reachable: enabled && Boolean(live?.reachable),
      latencyMs: enabled ? (live?.latencyMs ?? null) : null,
      summary,
      details: enabled && live ? {
        protocolVersion: live.protocolVersion || null,
        toolsCount: live.toolsCount ?? null,
        resourcesCount: live.resourcesCount ?? null,
        skillsCount: live.skillsCount ?? null,
        totalModels: live.totalModels ?? null,
        tools: Array.isArray(live.tools) ? live.tools.slice(0, 8) : undefined,
        skills: Array.isArray(live.skills) ? live.skills.slice(0, 8) : undefined,
      } : null,
      error: enabled ? (live?.error || null) : null,
    };
  }

  listPlugins(snapshot = null) {
    let snapshotPluginMap = null;
    if (Array.isArray(snapshot?.plugins) && snapshot.plugins.length > 0) {
      snapshotPluginMap = new Map();
      for (const p of snapshot.plugins) {
        if (p?.id) snapshotPluginMap.set(p.id, p);
      }
    }
    const items = [];
    let enabled = 0;
    let healthy = 0;
    let custom = 0;
    for (const p of this.plugins.values()) {
      const item = this._serializePlugin(p, snapshot, snapshotPluginMap);
      items.push(item);
      if (item.enabled) {
        enabled += 1;
        if (item.status === 'healthy') healthy += 1;
      }
      if (item.source === 'user-custom' || item.source === 'external') custom += 1;
    }
    return {
      ok: true,
      categories: PLUGIN_CATEGORIES,
      pluginsDir: this.pluginsDir,
      externalLoadErrors: this.externalLoadErrors,
      summary: {
        total: items.length,
        enabled,
        healthy,
        custom,
      },
      items,
    };
  }
}

export function buildScaffoldPluginSource({ id, name, category = 'custom' }) {
  const safeId = String(id).replace(/[^a-z0-9-]/g, '-');
  const safeName = String(name || safeId).replace(/['"\\]/g, '');
  const safeCat = PLUGIN_CATEGORIES.some((c) => c.id === category) ? category : 'custom';
  return `import { definePlugin } from '../../src/plugins/sdk.mjs';
import { httpProbe } from '../../src/exec.mjs';

export default definePlugin({
  id: '${safeId}',
  name: '${safeName}',
  version: '1.0.0',
  category: '${safeCat}',
  description: 'Custom Ops Console plugin implementing an official service health/inventory protocol.',
  officialSpec: {
    protocol: 'HTTP / JSON',
    docsUrl: 'https://datatracker.ietf.org/doc/html/rfc9110',
    endpoints: ['GET /health'],
    auth: 'Optional Bearer token (env://MY_SERVICE_TOKEN)',
  },
  capabilities: ['health'],
  configSchema: [
    { key: 'apiUrl', label: 'Service URL', type: 'url', default: 'http://127.0.0.1:8080' },
    { key: 'authToken', label: 'Bearer Token', type: 'secret', default: '', placeholder: 'env://MY_SERVICE_TOKEN' },
  ],
  defaultConfig: {
    enabled: true,
    apiUrl: 'http://127.0.0.1:8080',
    authToken: '',
  },
  async collect(cfg) {
    const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:8080').replace(/\\/+$/, '');
    const headers = cfg.authToken ? { Authorization: \`Bearer \${cfg.authToken}\` } : {};
    const probe = await httpProbe(\`\${baseUrl}/health\`, { timeoutMs: 2500, headers });
    return {
      id: '${safeId}',
      name: '${safeName}',
      enabled: true,
      reachable: probe.ok,
      status: probe.ok ? 'healthy' : 'offline',
      latencyMs: probe.latencyMs,
      error: probe.ok ? null : (probe.error || 'Unreachable'),
    };
  },
  summarize(data) {
    return data?.reachable ? \`HTTP OK · \${data.latencyMs ?? 0}ms\` : (data?.error || 'Offline');
  },
});
`;
}
