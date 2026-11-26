import { APP_VERSION } from '../../config.mjs';
import { httpProbe } from '../../exec.mjs';
import { definePlugin } from '../sdk.mjs';

const MCP_PROTOCOL_VERSION = '2025-03-26';

export function parseMcpRpcResponse(rawText, contentType = '') {
  const text = String(rawText || '').trim();
  if (!text) return null;
  if (contentType.includes('text/event-stream') || text.startsWith('event:') || text.startsWith('data:')) {
    const dataLines = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    for (let i = dataLines.length - 1; i >= 0; i -= 1) {
      try {
        return JSON.parse(dataLines[i]);
      } catch {
        // continue scanning SSE frames
      }
    }
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function mcpJsonRpcCall(endpoint, method, params, { id = 1, headers = {}, sessionId = '', timeoutMs = 3000 } = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const reqHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    };
    if (sessionId) {
      reqHeaders['Mcp-Session-Id'] = sessionId;
    }
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params: params || {},
      }),
      signal: controller.signal,
    });
    const text = await res.text();
    const parsed = parseMcpRpcResponse(text, res.headers.get('content-type') || '');
    return {
      ok: res.ok && !parsed?.error,
      status: res.status,
      latencyMs: Date.now() - started,
      sessionId: res.headers.get('mcp-session-id') || sessionId,
      result: parsed?.result ?? null,
      rpcError: parsed?.error?.message || null,
      error: res.ok ? (parsed?.error?.message || null) : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      sessionId,
      result: null,
      rpcError: null,
      error: err.name === 'AbortError' ? `Timeout (${timeoutMs}ms)` : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function collectMcpServer(cfg) {
  if (!cfg?.enabled) {
    return {
      id: 'mcp-server',
      name: cfg?.displayName || 'MCP Server',
      enabled: false,
      protocol: `Official MCP ${MCP_PROTOCOL_VERSION} (Streamable HTTP / JSON-RPC 2.0)`,
    };
  }

  const endpoint = String(cfg.apiUrl || 'http://127.0.0.1:8080/mcp').replace(/\/+$/, '');
  const authHeaders = cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {};
  const steps = [];

  const initRes = await mcpJsonRpcCall(
    endpoint,
    'initialize',
    {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'ops-console', version: APP_VERSION },
    },
    { id: 1, headers: authHeaders, timeoutMs: 3000 },
  );
  steps.push({
    step: 'POST initialize (JSON-RPC 2.0)',
    ok: initRes.ok,
    status: initRes.status,
    latencyMs: initRes.latencyMs,
    detail: initRes.ok
      ? `${initRes.result?.serverInfo?.name || 'mcp-server'} (${initRes.result?.protocolVersion || MCP_PROTOCOL_VERSION})`
      : initRes.error,
  });

  if (!initRes.ok) {
    // Graceful fallback to optional /health endpoint on the same origin
    let healthProbe = null;
    try {
      const origin = new URL(endpoint).origin;
      healthProbe = await httpProbe(`${origin}/health`, { timeoutMs: 2000, headers: authHeaders });
      steps.push({
        step: 'GET /health (fallback)',
        ok: healthProbe.ok,
        status: healthProbe.status,
        latencyMs: healthProbe.latencyMs,
        detail: healthProbe.ok ? 'Liveness OK (MCP JSON-RPC endpoint unavailable)' : healthProbe.error,
      });
    } catch {
      healthProbe = null;
    }
    const reachable = Boolean(healthProbe?.ok);
    return {
      id: 'mcp-server',
      name: cfg.displayName || 'MCP Server',
      enabled: true,
      protocol: `Official MCP ${MCP_PROTOCOL_VERSION} (Streamable HTTP / JSON-RPC 2.0)`,
      apiUrl: endpoint,
      reachable,
      status: reachable ? 'degraded' : 'offline',
      latencyMs: healthProbe?.latencyMs ?? initRes.latencyMs,
      protocolVersion: '',
      serverInfo: null,
      toolsCount: 0,
      resourcesCount: 0,
      promptsCount: 0,
      tools: [],
      resources: [],
      steps,
      error: initRes.error || 'MCP server unreachable',
    };
  }

  const sessionId = initRes.sessionId || '';
  const [toolsRes, resourcesRes, promptsRes] = await Promise.all([
    mcpJsonRpcCall(endpoint, 'tools/list', {}, { id: 2, headers: authHeaders, sessionId, timeoutMs: 3000 }),
    mcpJsonRpcCall(endpoint, 'resources/list', {}, { id: 3, headers: authHeaders, sessionId, timeoutMs: 3000 }),
    mcpJsonRpcCall(endpoint, 'prompts/list', {}, { id: 4, headers: authHeaders, sessionId, timeoutMs: 3000 }),
  ]);

  const tools = Array.isArray(toolsRes.result?.tools)
    ? toolsRes.result.tools.slice(0, 24).map((t) => ({
        name: String(t.name || ''),
        description: String(t.description || '').slice(0, 140),
      }))
    : [];
  const resources = Array.isArray(resourcesRes.result?.resources)
    ? resourcesRes.result.resources.slice(0, 24).map((r) => ({
        uri: String(r.uri || ''),
        name: String(r.name || r.uri || ''),
        mimeType: String(r.mimeType || ''),
      }))
    : [];
  const prompts = Array.isArray(promptsRes.result?.prompts) ? promptsRes.result.prompts : [];

  steps.push(
    { step: 'POST tools/list', ok: toolsRes.ok, status: toolsRes.status, latencyMs: toolsRes.latencyMs, detail: `${tools.length} tools` },
    { step: 'POST resources/list', ok: resourcesRes.ok, status: resourcesRes.status, latencyMs: resourcesRes.latencyMs, detail: `${resources.length} resources` },
    { step: 'POST prompts/list', ok: promptsRes.ok, status: promptsRes.status, latencyMs: promptsRes.latencyMs, detail: `${prompts.length} prompts` },
  );

  return {
    id: 'mcp-server',
    name: cfg.displayName || initRes.result?.serverInfo?.name || 'MCP Server',
    enabled: true,
    protocol: `Official MCP ${initRes.result?.protocolVersion || MCP_PROTOCOL_VERSION} (Streamable HTTP / JSON-RPC 2.0)`,
    apiUrl: endpoint,
    reachable: true,
    status: 'healthy',
    latencyMs: initRes.latencyMs,
    protocolVersion: initRes.result?.protocolVersion || MCP_PROTOCOL_VERSION,
    serverInfo: initRes.result?.serverInfo || null,
    capabilities: initRes.result?.capabilities || {},
    toolsCount: tools.length,
    resourcesCount: resources.length,
    promptsCount: prompts.length,
    tools,
    resources,
    steps,
    error: null,
  };
}

export const mcpServerPlugin = definePlugin({
  id: 'mcp-server',
  name: 'MCP Server (Official JSON-RPC)',
  version: '1.0.0',
  category: 'mcp',
  slot: 'mcp',
  description: '通过 Model Context Protocol (MCP 2025-03-26 Streamable HTTP / JSON-RPC 2.0) 官方规范直连任意 MCP 工具与上下文服务器，自动发现 Tools、Resources 与 Prompts。',
  officialSpec: {
    protocol: 'MCP 2025-03-26 Streamable HTTP (JSON-RPC 2.0)',
    docsUrl: 'https://modelcontextprotocol.io/specification',
    endpoints: [
      'POST /mcp → initialize (protocolVersion: 2025-03-26)',
      'POST /mcp → tools/list',
      'POST /mcp → resources/list',
      'POST /mcp → prompts/list',
    ],
    auth: '可选 Authorization: Bearer <token> (支持 env:// / file://)',
  },
  capabilities: ['health', 'inventory', 'tools', 'resources'],
  configSchema: [
    { key: 'displayName', label: '显示名称', type: 'string', default: 'Local MCP Hub', placeholder: '例如: FastMCP Tools Server' },
    { key: 'apiUrl', label: 'MCP Streamable HTTP 端点', type: 'url', default: 'http://127.0.0.1:8080/mcp', placeholder: 'http://127.0.0.1:8080/mcp' },
    { key: 'authToken', label: 'Bearer Token (可选)', type: 'secret', default: '', placeholder: 'env://MCP_AUTH_TOKEN' },
  ],
  defaultConfig: {
    enabled: false,
    displayName: 'Local MCP Hub',
    apiUrl: 'http://127.0.0.1:8080/mcp',
    authToken: '',
  },
  agentMatchers: [
    { category: 'mcp', label: 'MCP Server', pattern: 'mcp-server|modelcontextprotocol|fastmcp' },
  ],
  collect: (cfg) => collectMcpServer(cfg),
  testConnection: async (cfg) => collectMcpServer({ ...cfg, enabled: true }),
  summarize: (data) => {
    if (!data?.enabled) return '未启用';
    if (!data.reachable) return data.error || '不可达';
    return `${data.toolsCount ?? 0} Tools · ${data.resourcesCount ?? 0} Resources · ${data.promptsCount ?? 0} Prompts`;
  },
  demoSample: (cfg) => ({
    id: 'mcp-server',
    name: cfg?.displayName || 'Local MCP Hub',
    enabled: true,
    protocol: `Official MCP ${MCP_PROTOCOL_VERSION} (Streamable HTTP / JSON-RPC 2.0)`,
    apiUrl: cfg?.apiUrl || 'http://127.0.0.1:8080/mcp',
    reachable: true,
    status: 'healthy',
    latencyMs: 12,
    protocolVersion: MCP_PROTOCOL_VERSION,
    serverInfo: { name: 'demo-mcp-hub', version: '1.4.0' },
    toolsCount: 6,
    resourcesCount: 3,
    promptsCount: 2,
    tools: [
      { name: 'filesystem.read', description: 'Read workspace files within allowed root paths' },
      { name: 'git.status', description: 'Inspect repository working tree and branch status' },
      { name: 'postgres.query_ro', description: 'Execute read-only parameterized SQL queries' },
      { name: 'docs.search', description: 'Semantic search across indexed engineering runbooks' },
    ],
    resources: [
      { uri: 'mcp://cluster/topology', name: 'Cluster Topology', mimeType: 'application/json' },
      { uri: 'mcp://runbooks/catalog', name: 'Operations Runbooks', mimeType: 'text/markdown' },
    ],
    steps: [
      { step: 'POST initialize (JSON-RPC 2.0)', ok: true, status: 200, latencyMs: 5, detail: `demo-mcp-hub (${MCP_PROTOCOL_VERSION})` },
      { step: 'POST tools/list', ok: true, status: 200, latencyMs: 4, detail: '6 tools' },
      { step: 'POST resources/list', ok: true, status: 200, latencyMs: 3, detail: '3 resources' },
    ],
    error: null,
  }),
});
