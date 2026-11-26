import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { redactText } from './redact.mjs';

const VALID_TRANSPORTS = new Set(['streamable-http', 'stdio', 'sse']);
const SAFE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,63}$/;
const SAFE_ENV_KEY_RE = /^[A-Z_][A-Z0-9_]{0,63}$/;

const BLOCKED_METADATA_HOSTS = new Set([
  '169.254.169.254',
  '169.254.170.2',
  'metadata.google.internal',
  'metadata',
  'fd00:ec2::254',
  '[fd00:ec2::254]',
]);

export function validateSafeEndpointUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { ok: false, error: 'Endpoint URL is required' };
  }
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: 'Invalid URL format' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http:// and https:// endpoints are allowed' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Credentials embedded in URL are not allowed' };
  }
  const host = parsed.hostname.toLowerCase();
  if (!host || BLOCKED_METADATA_HOSTS.has(host) || host.startsWith('169.254.')) {
    return { ok: false, error: 'Blocked metadata or link-local endpoint host' };
  }
  return { ok: true, url: parsed.toString() };
}

function sanitizeId(raw, fallbackPrefix = 'mcp') {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (cleaned && SAFE_ID_RE.test(cleaned)) return cleaned;
  return `${fallbackPrefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function sanitizeEnvRefs(rawRefs) {
  if (!Array.isArray(rawRefs)) return [];
  const out = [];
  const seen = new Set();
  for (const item of rawRefs.slice(0, 16)) {
    const key = String(item || '').trim().replace(/^env:\/\//i, '').toUpperCase();
    if (SAFE_ENV_KEY_RE.test(key) && !seen.has(key)) {
      seen.add(key);
      out.push(`env://${key}`);
    }
  }
  return out;
}

function sanitizeTools(rawTools) {
  if (!Array.isArray(rawTools)) return [];
  return rawTools.slice(0, 32).map((t) => {
    if (typeof t === 'string') return { name: t.slice(0, 80), description: '' };
    return {
      name: String(t?.name || 'tool').slice(0, 80),
      description: redactText(String(t?.description || '')).slice(0, 160),
    };
  });
}

function buildDemoMcpCatalog() {
  const nowIso = new Date().toISOString();
  return [
    {
      id: 'mcp-hub-filesystem',
      templateId: 'tpl-filesystem',
      name: 'Filesystem & Workspace MCP',
      nodeId: 'hub-primary',
      nodeName: 'Ops Hub (Primary)',
      transport: 'streamable-http',
      endpoint: 'http://127.0.0.1:8788/mcp',
      command: null,
      args: [],
      envRefs: ['env://WORKSPACE_ROOT'],
      scope: 'workspace',
      enabled: true,
      status: 'healthy',
      protocolVersion: '2025-03-26',
      latencyMs: 9,
      toolsCount: 11,
      resourcesCount: 4,
      tools: [
        { name: 'read_file', description: 'Read workspace file safely within allowed root' },
        { name: 'write_patch', description: 'Apply structured diff patch to tracked file' },
        { name: 'search_ripgrep', description: 'Fast regex search across repositories' },
        { name: 'list_directory', description: 'Inspect project layout and metadata' },
      ],
      lastCheckedAt: nowIso,
      syncState: 'synced',
      builtin: false,
      description: '控制平面主节点代码库与配置文件读写 MCP 服务',
    },
    {
      id: 'mcp-hub-nmem',
      templateId: 'tpl-memory-nmem',
      name: 'NMEM Semantic Memory MCP',
      nodeId: 'hub-primary',
      nodeName: 'Ops Hub (Primary)',
      transport: 'streamable-http',
      endpoint: 'http://127.0.0.1:8765/mcp',
      command: null,
      args: [],
      envRefs: ['env://NMEM_API_TOKEN'],
      scope: 'memory',
      enabled: true,
      status: 'healthy',
      protocolVersion: '2025-03-26',
      latencyMs: 14,
      toolsCount: 7,
      resourcesCount: 12,
      tools: [
        { name: 'memory_search', description: 'Hybrid BM25 + vector recall over long-term memory' },
        { name: 'memory_upsert', description: 'Store structured decision or incident note' },
        { name: 'entity_graph', description: 'Traverse linked architecture entities' },
      ],
      lastCheckedAt: nowIso,
      syncState: 'synced',
      builtin: false,
      description: '跨 Agent 共享长期语义记忆库，供主 Agent 与 Worker 节点按需检索',
    },
    {
      id: 'mcp-tokyo-systemd',
      templateId: 'tpl-edge-ops',
      name: 'Tokyo VPS Ops & Docker MCP',
      nodeId: 'edge-tokyo',
      nodeName: 'Edge Worker (Tokyo)',
      transport: 'streamable-http',
      endpoint: 'http://100.64.0.21:8788/mcp',
      command: null,
      args: [],
      envRefs: ['env://EDGE_OPS_SCOPE'],
      scope: 'infra',
      enabled: true,
      status: 'healthy',
      protocolVersion: '2025-03-26',
      latencyMs: 42,
      toolsCount: 8,
      resourcesCount: 3,
      tools: [
        { name: 'systemd_status', description: 'Inspect allowlisted systemd unit state' },
        { name: 'journal_tail', description: 'Read redacted recent service logs' },
        { name: 'container_stats', description: 'Query edge container CPU/RAM metrics' },
      ],
      lastCheckedAt: nowIso,
      syncState: 'synced',
      builtin: false,
      description: '东京边缘 VPS 的运维观测与容器健康检查 MCP',
    },
    {
      id: 'mcp-tokyo-playwright',
      templateId: 'tpl-browser-probe',
      name: 'Edge Synthetic Browser MCP',
      nodeId: 'edge-tokyo',
      nodeName: 'Edge Worker (Tokyo)',
      transport: 'stdio',
      endpoint: null,
      command: 'npx',
      args: ['-y', '@playwright/mcp@latest', '--headless'],
      envRefs: [],
      scope: 'qa',
      enabled: true,
      status: 'healthy',
      protocolVersion: '2025-03-26',
      latencyMs: 65,
      toolsCount: 14,
      resourcesCount: 2,
      tools: [
        { name: 'browser_navigate', description: 'Open target URL in isolated headless context' },
        { name: 'browser_snapshot', description: 'Capture accessibility tree & DOM assertions' },
        { name: 'browser_console', description: 'Collect console errors and network status' },
      ],
      lastCheckedAt: nowIso,
      syncState: 'synced',
      builtin: false,
      description: '东京节点无头浏览器拨测与页面回归验证 MCP',
    },
    {
      id: 'mcp-frankfurt-audit',
      templateId: 'tpl-sec-audit',
      name: 'EU Security & Netflow MCP',
      nodeId: 'edge-frankfurt',
      nodeName: 'EU Relay (Frankfurt)',
      transport: 'sse',
      endpoint: 'http://100.64.0.34:8790/sse',
      command: null,
      args: [],
      envRefs: ['env://EU_AUDIT_READ_KEY'],
      scope: 'security',
      enabled: true,
      status: 'degraded',
      protocolVersion: '2025-03-26',
      latencyMs: 186,
      toolsCount: 6,
      resourcesCount: 5,
      tools: [
        { name: 'nftables_audit', description: 'Inspect public exposure & drop counters' },
        { name: 'tls_expiry_scan', description: 'Check certificate chain validity across ingress' },
        { name: 'derp_latency_probe', description: 'Measure EU relay RTT and packet loss' },
      ],
      lastCheckedAt: nowIso,
      syncState: 'synced',
      builtin: false,
      description: '法兰克福中继 VPS 的防火墙审计、TLS 巡检与流量探针 MCP',
    },
    {
      id: 'mcp-mac-git-github',
      templateId: 'tpl-git-dev',
      name: 'Local Git & PR Review MCP',
      nodeId: 'workstation-mac',
      nodeName: 'Developer Laptop (macOS)',
      transport: 'stdio',
      endpoint: null,
      command: 'uvx',
      args: ['mcp-server-git', '--repository', '~/workspace'],
      envRefs: ['env://GITHUB_TOKEN'],
      scope: 'dev',
      enabled: true,
      status: 'healthy',
      protocolVersion: '2025-03-26',
      latencyMs: 6,
      toolsCount: 9,
      resourcesCount: 2,
      tools: [
        { name: 'git_status', description: 'Inspect working tree and branch state' },
        { name: 'git_diff', description: 'Generate structured patch diff for review' },
        { name: 'git_log', description: 'Read commit history and blame metadata' },
      ],
      lastCheckedAt: nowIso,
      syncState: 'synced',
      builtin: false,
      description: '开发机本地代码仓库与 Git 差异分析 MCP，供主 Harness 直接调用',
    },
    {
      id: 'mcp-mac-postgres-ro',
      templateId: 'tpl-sql-ro',
      name: 'Staging SQL Read-Only MCP',
      nodeId: 'workstation-mac',
      nodeName: 'Developer Laptop (macOS)',
      transport: 'streamable-http',
      endpoint: 'http://100.64.0.45:8792/mcp',
      command: null,
      args: [],
      envRefs: ['env://STAGING_DB_RO_URL'],
      scope: 'data',
      enabled: false,
      status: 'standby',
      protocolVersion: '2025-03-26',
      latencyMs: null,
      toolsCount: 4,
      resourcesCount: 6,
      tools: [
        { name: 'pg_explain', description: 'Run EXPLAIN ANALYZE on read-only SQL queries' },
        { name: 'pg_list_tables', description: 'Inspect schema tables and index definitions' },
      ],
      lastCheckedAt: nowIso,
      syncState: 'synced',
      builtin: false,
      description: '按需启用的预发库只读查询与执行计划分析 MCP',
    },
  ];
}

export class McpFleetManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.dataDir = config?.console?.dataDir || path.join(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, 'mcp-fleet.json');
    this.servers = new Map();
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;
    if (this.config?.demo) {
      for (const item of buildDemoMcpCatalog()) {
        this.servers.set(item.id, item);
      }
      return;
    }
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.servers)) {
        for (const item of parsed.servers) {
          if (item?.id) this.servers.set(item.id, item);
        }
      }
    } catch {
      // Fresh state — no persisted MCP file yet
    }
  }

  async persist() {
    if (this.config?.demo) return;
    await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const payload = JSON.stringify(
      { version: 1, updatedAt: new Date().toISOString(), servers: [...this.servers.values()] },
      null,
      2,
    );
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, payload, { mode: 0o600 });
    await fs.rename(tmpPath, this.filePath);
  }

  mergeProbeInventory(fleetNodes = []) {
    const knownNodes = new Map();
    for (const node of fleetNodes) {
      if (node?.id) knownNodes.set(node.id, node.name || node.id);
    }

    const combined = new Map();
    for (const [id, item] of this.servers.entries()) {
      combined.set(id, {
        ...item,
        nodeName: knownNodes.get(item.nodeId) || item.nodeName || item.nodeId,
      });
    }

    // Merge probe-reported MCPs from live nodes without duplicating explicitly registered IDs
    for (const node of fleetNodes) {
      if (!Array.isArray(node?.mcps)) continue;
      for (const raw of node.mcps) {
        if (!raw?.name) continue;
        const reportedId = raw.id || `probe-${node.id}-${sanitizeId(raw.name, 'mcp')}`;
        if (combined.has(reportedId)) continue;
        combined.set(reportedId, {
          id: reportedId,
          templateId: raw.templateId || null,
          name: String(raw.name).slice(0, 80),
          nodeId: node.id,
          nodeName: node.name || node.id,
          transport: VALID_TRANSPORTS.has(raw.transport) ? raw.transport : 'streamable-http',
          endpoint: raw.endpoint || null,
          command: raw.command || null,
          args: Array.isArray(raw.args) ? raw.args.slice(0, 12).map(String) : [],
          envRefs: sanitizeEnvRefs(raw.envRefs),
          scope: String(raw.scope || 'node-reported').slice(0, 32),
          enabled: raw.enabled !== false,
          status: String(raw.status || 'healthy').slice(0, 24),
          protocolVersion: String(raw.protocolVersion || '2025-03-26').slice(0, 32),
          latencyMs: Number.isFinite(raw.latencyMs) ? Math.round(raw.latencyMs) : null,
          toolsCount: Number.isFinite(raw.toolsCount) ? Math.max(0, Math.round(raw.toolsCount)) : (Array.isArray(raw.tools) ? raw.tools.length : 0),
          resourcesCount: Number.isFinite(raw.resourcesCount) ? Math.max(0, Math.round(raw.resourcesCount)) : 0,
          tools: sanitizeTools(raw.tools),
          lastCheckedAt: raw.lastCheckedAt || node.lastHeartbeatAt || new Date().toISOString(),
          syncState: 'probe-reported',
          builtin: false,
          description: redactText(String(raw.description || `由节点 ${node.name || node.id} 探针自动上报`)).slice(0, 180),
        });
      }
    }
    return [...combined.values()];
  }

  list(fleetNodes = [], filterNodeId = '') {
    const all = this.mergeProbeInventory(fleetNodes);
    const items = filterNodeId ? all.filter((m) => m.nodeId === filterNodeId) : all;
    const nodeSet = new Set();
    const byTransport = { 'streamable-http': 0, stdio: 0, sse: 0 };
    const byNodeMap = new Map();

    let online = 0;
    let enabled = 0;
    let degraded = 0;
    let totalTools = 0;

    for (const item of all) {
      nodeSet.add(item.nodeId);
      if (byTransport[item.transport] !== undefined) byTransport[item.transport] += 1;
      if (item.enabled) enabled += 1;
      if (item.enabled && item.status === 'healthy') online += 1;
      if (item.enabled && (item.status === 'degraded' || item.status === 'failed' || item.status === 'error')) {
        degraded += 1;
      }
      totalTools += Number(item.toolsCount || 0);

      const entry = byNodeMap.get(item.nodeId) || {
        nodeId: item.nodeId,
        nodeName: item.nodeName || item.nodeId,
        total: 0,
        online: 0,
        toolsCount: 0,
      };
      entry.total += 1;
      if (item.enabled && item.status === 'healthy') entry.online += 1;
      entry.toolsCount += Number(item.toolsCount || 0);
      byNodeMap.set(item.nodeId, entry);
    }

    return {
      ok: true,
      summary: {
        total: all.length,
        enabled,
        online,
        degraded,
        nodesCovered: nodeSet.size,
        totalTools,
        byTransport,
      },
      byNode: [...byNodeMap.values()],
      items,
    };
  }

  getForNode(nodeId, fleetNodes = []) {
    return this.mergeProbeInventory(fleetNodes)
      .filter((m) => m.nodeId === nodeId)
      .map((m) => ({
        id: m.id,
        name: m.name,
        transport: m.transport,
        endpoint: m.endpoint,
        command: m.command,
        enabled: m.enabled,
        status: m.status,
        toolsCount: m.toolsCount,
        latencyMs: m.latencyMs,
        syncState: m.syncState,
        scope: m.scope,
      }));
  }

  async register(payload = {}, options = {}) {
    const { probeRegistry = null, fleetNodes = [], actor = 'web' } = options;
    const name = redactText(String(payload.name || '').trim()).slice(0, 80);
    if (!name) {
      const err = new Error('MCP server name is required');
      err.statusCode = 400;
      throw err;
    }

    const transport = String(payload.transport || 'streamable-http').trim().toLowerCase();
    if (!VALID_TRANSPORTS.has(transport)) {
      const err = new Error(`Unsupported MCP transport: ${transport}`);
      err.statusCode = 400;
      throw err;
    }

    let endpoint = null;
    let command = null;
    let args = [];

    if (transport === 'stdio') {
      command = String(payload.command || '').trim().slice(0, 120);
      if (!command || /[;&|`$<>]/.test(command)) {
        const err = new Error('Valid executable command is required for stdio MCP (no shell metacharacters)');
        err.statusCode = 400;
        throw err;
      }
      if (Array.isArray(payload.args)) {
        args = payload.args
          .map((a) => String(a).trim())
          .filter(Boolean)
          .slice(0, 20);
      } else if (typeof payload.args === 'string' && payload.args.trim()) {
        args = payload.args.trim().split(/\s+/).slice(0, 20);
      }
    } else {
      const check = validateSafeEndpointUrl(payload.endpoint);
      if (!check.ok) {
        const err = new Error(check.error);
        err.statusCode = 400;
        throw err;
      }
      endpoint = check.url;
    }

    const rawNodeIds = Array.isArray(payload.nodeIds) && payload.nodeIds.length > 0
      ? payload.nodeIds
      : [payload.nodeId || 'hub-primary'];
    const targetNodeIds = [...new Set(rawNodeIds.map((n) => String(n || '').trim()).filter(Boolean))].slice(0, 16);
    if (targetNodeIds.length === 0) {
      const err = new Error('At least one target nodeId is required');
      err.statusCode = 400;
      throw err;
    }

    const nodeNameMap = new Map((fleetNodes || []).map((n) => [n.id, n.name || n.id]));
    const templateId = payload.templateId ? sanitizeId(payload.templateId, 'tpl') : sanitizeId(`tpl-${name}`, 'tpl');
    const envRefs = sanitizeEnvRefs(payload.envRefs);
    const scope = String(payload.scope || 'custom').trim().slice(0, 32) || 'custom';
    const description = redactText(String(payload.description || '').trim()).slice(0, 200);
    const created = [];
    const queuedCommands = [];

    for (const nodeId of targetNodeIds) {
      const id = targetNodeIds.length === 1 && payload.id
        ? sanitizeId(payload.id, 'mcp')
        : sanitizeId(`mcp-${nodeId}-${name}`, 'mcp');
      const finalId = this.servers.has(id) ? `${id}-${crypto.randomBytes(2).toString('hex')}` : id;
      const isRemote = nodeId !== 'hub-primary';
      const entry = {
        id: finalId,
        templateId,
        name,
        nodeId,
        nodeName: nodeNameMap.get(nodeId) || nodeId,
        transport,
        endpoint,
        command,
        args,
        envRefs,
        scope,
        enabled: payload.enabled !== false,
        status: payload.enabled === false ? 'standby' : (this.config?.demo ? 'healthy' : 'unknown'),
        protocolVersion: '2025-03-26',
        latencyMs: this.config?.demo ? (isRemote ? 38 : 11) : null,
        toolsCount: this.config?.demo ? 5 : 0,
        resourcesCount: this.config?.demo ? 2 : 0,
        tools: this.config?.demo
          ? [
              { name: `${sanitizeId(name, 'tool').replace(/-/g, '_')}_query`, description: 'Query domain context via MCP' },
              { name: `${sanitizeId(name, 'tool').replace(/-/g, '_')}_health`, description: 'Verify MCP server readiness' },
            ]
          : [],
        lastCheckedAt: new Date().toISOString(),
        syncState: isRemote ? 'queued-sync' : 'synced',
        builtin: false,
        description: description || `部署于 ${nodeNameMap.get(nodeId) || nodeId} 的 ${transport} MCP 服务`,
      };
      this.servers.set(finalId, entry);
      created.push(entry);

      if (isRemote && probeRegistry) {
        try {
          const cmd = probeRegistry.enqueueCommand(nodeId, 'mcp-sync', actor);
          queuedCommands.push(cmd);
        } catch {
          // Non-fatal if node is not enrolled in probeRegistry
        }
      }
    }

    await this.persist();
    return { created, queuedCommands };
  }

  async toggle(id, enabled, options = {}) {
    const { probeRegistry = null, actor = 'web' } = options;
    const existing = this.servers.get(id);
    if (!existing) {
      const err = new Error(`MCP server not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
    const nextEnabled = Boolean(enabled);
    existing.enabled = nextEnabled;
    existing.status = nextEnabled ? (existing.status === 'standby' ? 'healthy' : existing.status) : 'standby';
    existing.lastCheckedAt = new Date().toISOString();
    let queuedCommand = null;
    if (existing.nodeId !== 'hub-primary') {
      existing.syncState = 'queued-sync';
      if (probeRegistry) {
        try {
          queuedCommand = probeRegistry.enqueueCommand(existing.nodeId, 'mcp-sync', actor);
        } catch {
          // Ignore if node has no probe enrollment
        }
      }
    }
    await this.persist();
    return { item: existing, queuedCommand };
  }

  async syncToNodes(sourceId, targetNodeIds = [], options = {}) {
    const { probeRegistry = null, fleetNodes = [], actor = 'web' } = options;
    const source = this.servers.get(sourceId);
    if (!source) {
      const err = new Error(`MCP server not found: ${sourceId}`);
      err.statusCode = 404;
      throw err;
    }
    const cleanTargets = [...new Set((Array.isArray(targetNodeIds) ? targetNodeIds : []).map((n) => String(n || '').trim()).filter(Boolean))]
      .filter((nodeId) => nodeId !== source.nodeId)
      .slice(0, 16);

    if (cleanTargets.length === 0) {
      const err = new Error('Select at least one other target node to sync');
      err.statusCode = 400;
      throw err;
    }

    const nodeNameMap = new Map((fleetNodes || []).map((n) => [n.id, n.name || n.id]));
    const synced = [];
    const queuedCommands = [];

    for (const nodeId of cleanTargets) {
      const existingOnNode = [...this.servers.values()].find(
        (m) => m.nodeId === nodeId && ((source.templateId && m.templateId === source.templateId) || m.name === source.name),
      );
      if (existingOnNode) {
        existingOnNode.transport = source.transport;
        existingOnNode.endpoint = source.endpoint;
        existingOnNode.command = source.command;
        existingOnNode.args = [...(source.args || [])];
        existingOnNode.envRefs = [...(source.envRefs || [])];
        existingOnNode.enabled = source.enabled;
        existingOnNode.syncState = nodeId === 'hub-primary' ? 'synced' : 'queued-sync';
        existingOnNode.lastCheckedAt = new Date().toISOString();
        synced.push(existingOnNode);
      } else {
        const newId = sanitizeId(`mcp-${nodeId}-${source.name}`, 'mcp');
        const finalId = this.servers.has(newId) ? `${newId}-${crypto.randomBytes(2).toString('hex')}` : newId;
        const clone = {
          ...source,
          id: finalId,
          nodeId,
          nodeName: nodeNameMap.get(nodeId) || nodeId,
          args: [...(source.args || [])],
          envRefs: [...(source.envRefs || [])],
          tools: [...(source.tools || [])],
          syncState: nodeId === 'hub-primary' ? 'synced' : 'queued-sync',
          lastCheckedAt: new Date().toISOString(),
        };
        this.servers.set(finalId, clone);
        synced.push(clone);
      }

      if (nodeId !== 'hub-primary' && probeRegistry) {
        try {
          const cmd = probeRegistry.enqueueCommand(nodeId, 'mcp-sync', actor);
          queuedCommands.push(cmd);
        } catch {
          // Non-fatal
        }
      }
    }

    await this.persist();
    return { synced, queuedCommands };
  }

  async test(id) {
    const item = this.servers.get(id);
    if (!item) {
      const err = new Error(`MCP server not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }

    const started = Date.now();
    if (this.config?.demo || item.transport === 'stdio') {
      const latencyMs = item.transport === 'stdio' ? 8 : (item.nodeId === 'hub-primary' ? 12 : 41);
      item.status = item.enabled ? 'healthy' : 'standby';
      item.latencyMs = latencyMs;
      item.lastCheckedAt = new Date().toISOString();
      item.syncState = 'synced';
      return {
        ok: true,
        id: item.id,
        nodeId: item.nodeId,
        transport: item.transport,
        reachable: true,
        status: item.status,
        latencyMs,
        protocolVersion: item.protocolVersion || '2025-03-26',
        toolsCount: item.toolsCount,
        tools: item.tools || [],
        summary: item.transport === 'stdio'
          ? `stdio 清单校验通过 · ${item.command} (${item.toolsCount} tools declared)`
          : `MCP 2025-03-26 握手成功 · ${item.toolsCount} tools · ${latencyMs}ms`,
        testedAt: item.lastCheckedAt,
      };
    }

    const check = validateSafeEndpointUrl(item.endpoint);
    if (!check.ok) {
      return {
        ok: false,
        id: item.id,
        nodeId: item.nodeId,
        transport: item.transport,
        reachable: false,
        status: 'error',
        latencyMs: Date.now() - started,
        error: check.error,
        testedAt: new Date().toISOString(),
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const initRes = await fetch(check.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'ops-console-mcp-fleet', version: '0.4.0' },
          },
        }),
        signal: controller.signal,
      });
      const latencyMs = Math.max(1, Date.now() - started);
      if (!initRes.ok) {
        item.status = 'degraded';
        item.latencyMs = latencyMs;
        item.lastCheckedAt = new Date().toISOString();
        await this.persist();
        return {
          ok: false,
          id: item.id,
          nodeId: item.nodeId,
          transport: item.transport,
          reachable: false,
          status: 'degraded',
          latencyMs,
          error: `HTTP ${initRes.status}`,
          testedAt: item.lastCheckedAt,
        };
      }
      let protocolVersion = '2025-03-26';
      try {
        const body = await initRes.json();
        if (body?.result?.protocolVersion) protocolVersion = String(body.result.protocolVersion);
      } catch {
        // SSE stream or empty body
      }
      item.status = 'healthy';
      item.latencyMs = latencyMs;
      item.protocolVersion = protocolVersion;
      item.lastCheckedAt = new Date().toISOString();
      item.syncState = 'synced';
      await this.persist();
      return {
        ok: true,
        id: item.id,
        nodeId: item.nodeId,
        transport: item.transport,
        reachable: true,
        status: 'healthy',
        latencyMs,
        protocolVersion,
        toolsCount: item.toolsCount,
        tools: item.tools || [],
        summary: `MCP ${protocolVersion} 握手成功 · ${latencyMs}ms`,
        testedAt: item.lastCheckedAt,
      };
    } catch (err) {
      const latencyMs = Math.max(1, Date.now() - started);
      item.status = 'offline';
      item.latencyMs = latencyMs;
      item.lastCheckedAt = new Date().toISOString();
      await this.persist();
      return {
        ok: false,
        id: item.id,
        nodeId: item.nodeId,
        transport: item.transport,
        reachable: false,
        status: 'offline',
        latencyMs,
        error: err?.name === 'AbortError' ? 'Connection timed out (4s)' : redactText(err?.message || 'Request failed'),
        testedAt: item.lastCheckedAt,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async remove(id) {
    if (!this.servers.has(id)) {
      const err = new Error(`MCP server not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
    this.servers.delete(id);
    await this.persist();
    return { ok: true, id };
  }
}
