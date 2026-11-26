import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import { collectAgentRuntime } from '../src/plugins/builtin/agent-runtime.mjs';
import { collectMcpServer, parseMcpRpcResponse } from '../src/plugins/builtin/mcp-server.mjs';
import { collectOpenAiGateway } from '../src/plugins/builtin/openai-gateway.mjs';
import { buildScaffoldPluginSource, PluginManager } from '../src/plugins/manager.mjs';
import {
  redactPluginConfig,
  resolvePluginConfigSecrets,
  validateCliBin,
  validateHttpUrl,
  validatePluginId,
} from '../src/plugins/sdk.mjs';
import { createOpsConsole } from '../src/server.mjs';

function startLocalHttpServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

test('Plugin SDK validators enforce safe IDs, HTTP(S) URLs, CLI bins, and secret redaction', () => {
  assert.equal(validatePluginId('mcp-server'), true);
  assert.equal(validatePluginId('custom-local-ollama'), true);
  assert.equal(validatePluginId('../escape'), false);
  assert.equal(validatePluginId('UPPER_CASE'), false);

  assert.equal(validateHttpUrl('http://127.0.0.1:8000/mcp').ok, true);
  assert.equal(validateHttpUrl('https://api.example.com/v1').ok, true);
  assert.equal(validateHttpUrl('javascript:alert(1)').ok, false);
  assert.equal(validateHttpUrl('file:///etc/passwd').ok, false);

  assert.equal(validateCliBin('tailscale').ok, true);
  assert.equal(validateCliBin('/usr/local/bin/nmem').ok, true);
  assert.equal(validateCliBin('nmem; rm -rf /').ok, false);
  assert.equal(validateCliBin('nmem && id').ok, false);

  const schema = [
    { key: 'apiUrl', type: 'url' },
    { key: 'authToken', type: 'secret' },
    { key: 'apiKey', type: 'secret' },
  ];
  const redacted = redactPluginConfig(schema, {
    apiUrl: 'http://127.0.0.1:8000',
    authToken: 'raw-super-secret-token-value',
    apiKey: 'env://TEST_PLUGIN_API_KEY',
  });
  assert.equal(redacted.apiUrl, 'http://127.0.0.1:8000');
  assert.equal(redacted.authToken, '••••••••');
  assert.ok(!redacted.authToken.includes('super-secret'));
  assert.equal(redacted.apiKey, 'env://TEST_PLUGIN_API_KEY');

  process.env.TEST_PLUGIN_API_KEY = 'resolved-secret-123';
  try {
    const resolved = resolvePluginConfigSecrets(schema, {
      apiUrl: 'http://127.0.0.1:8000',
      apiKey: 'env://TEST_PLUGIN_API_KEY',
    });
    assert.equal(resolved.apiKey, 'resolved-secret-123');
  } finally {
    delete process.env.TEST_PLUGIN_API_KEY;
  }
});

test('Official MCP 2025-03-26 Streamable HTTP plugin executes JSON-RPC handshake and parses SSE frames', async () => {
  // Pure SSE parser check
  const sseFrame = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-03-26"}}\n\n';
  const parsedSse = parseMcpRpcResponse(sseFrame, 'text/event-stream');
  assert.equal(parsedSse?.result?.protocolVersion, '2025-03-26');

  let receivedSessionHeader = '';
  const mockMcp = await startLocalHttpServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const rpc = JSON.parse(body || '{}');
      if (rpc.method === 'initialize') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Mcp-Session-Id': 'sess-demo-42',
        });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: rpc.id,
          result: {
            protocolVersion: '2025-03-26',
            serverInfo: { name: 'mock-mcp', version: '1.2.3' },
            capabilities: { tools: {}, resources: {} },
          },
        }));
        return;
      }
      receivedSessionHeader = String(req.headers['mcp-session-id'] || '');
      if (rpc.method === 'tools/list') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.end(`event: message\ndata: ${JSON.stringify({
          jsonrpc: '2.0',
          id: rpc.id,
          result: {
            tools: [
              { name: 'search_docs', description: 'Search docs' },
              { name: 'query_metrics', description: 'Query metrics' },
            ],
          },
        })}\n\n`);
        return;
      }
      if (rpc.method === 'resources/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: rpc.id,
          result: { resources: [{ uri: 'file:///runbooks/sla.md', name: 'sla.md' }] },
        }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: { prompts: [] } }));
    });
  });

  try {
    const result = await collectMcpServer({
      enabled: true,
      apiUrl: `${mockMcp.baseUrl}/mcp`,
      displayName: 'Local MCP Test',
    });
    assert.equal(result.reachable, true);
    assert.equal(result.status, 'healthy');
    assert.equal(result.protocolVersion, '2025-03-26');
    assert.equal(result.toolsCount, 2);
    assert.equal(result.resourcesCount, 1);
    assert.equal(receivedSessionHeader, 'sess-demo-42');
    assert.ok(Array.isArray(result.steps) && result.steps.length >= 2);
  } finally {
    await mockMcp.close();
  }
});

test('Official OpenAI /v1/models and A2A Agent Card plugins probe standard endpoints', async () => {
  const mockGateway = await startLocalHttpServer((req, res) => {
    if (req.url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        data: [
          { id: 'llama3.3:70b', owned_by: 'ollama' },
          { id: 'qwen2.5-coder:32b', owned_by: 'ollama' },
          { id: 'gpt-4.1-mini', owned_by: 'openai' },
        ],
      }));
      return;
    }
    if (req.url === '/.well-known/agent.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'Triage Agent',
        version: '2.0.0',
        capabilities: { streaming: true },
        skills: [
          { id: 'incident-triage', name: 'Incident Triage', description: 'Triage service alerts' },
        ],
      }));
      return;
    }
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  try {
    const gw = await collectOpenAiGateway({ enabled: true, apiUrl: mockGateway.baseUrl });
    assert.equal(gw.reachable, true);
    assert.equal(gw.totalModels, 3);
    assert.equal(gw.providers[0].name, 'ollama');

    const agent = await collectAgentRuntime({ enabled: true, apiUrl: mockGateway.baseUrl, healthPath: '/health' });
    assert.equal(agent.reachable, true);
    assert.equal(agent.skillsCount, 1);
    assert.equal(agent.agentVersion, '2.0.0');
  } finally {
    await mockGateway.close();
  }
});

test('PluginManager persists state with 0600 permissions and loads external plugins safely', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-plugins-test-'));
  const dataDir = path.join(tmpDir, 'data');
  const pluginsDir = path.join(tmpDir, 'plugins');
  await fs.mkdir(path.join(pluginsDir, 'sample-ext'), { recursive: true });

  // Build external plugin using absolute import path to sdk.mjs so temp dir resolves cleanly
  const sdkUrl = new URL('../src/plugins/sdk.mjs', import.meta.url).href;
  await fs.writeFile(
    path.join(pluginsDir, 'sample-ext', 'index.mjs'),
    `import { definePlugin } from '${sdkUrl}';
export default definePlugin({
  id: 'sample-ext',
  name: 'Sample External Plugin',
  version: '1.0.0',
  category: 'custom',
  description: 'Temp external plugin for unit test',
  officialSpec: { protocol: 'HTTP JSON', endpoints: ['GET /health'] },
  defaultConfig: { enabled: true },
  async collect() { return { id: 'sample-ext', name: 'Sample External Plugin', enabled: true, reachable: true, status: 'healthy', latencyMs: 5 }; },
  summarize() { return 'External OK'; },
});
`,
    'utf8',
  );

  // Also test scaffold helper syntax string
  const scaffoldSrc = buildScaffoldPluginSource({ id: 'my-mcp', name: 'My MCP', category: 'mcp' });
  assert.ok(scaffoldSrc.includes("id: 'my-mcp'"));
  assert.ok(scaffoldSrc.includes("category: 'mcp'"));

  const config = loadConfig({ cli: { demo: false }, env: { OPS_CONSOLE_DATA_DIR: dataDir } });
  const pm = new PluginManager({ config, pluginsDir });
  const loadRes = await pm.loadExternalPlugins();
  assert.deepEqual(loadRes.loaded, ['sample-ext']);
  assert.equal(loadRes.errors.length, 0);

  const toggleRes = await pm.togglePlugin('mcp-server', true);
  assert.equal(toggleRes.ok, true);

  const stateStat = await fs.stat(path.join(dataDir, 'plugins.json'));
  assert.equal(stateStat.mode & 0o777, 0o600);

  const list = pm.listPlugins();
  assert.ok(list.items.some((i) => i.id === 'sample-ext' && i.source === 'external'));
  assert.ok(list.items.some((i) => i.id === 'mcp-server' && i.enabled === true));

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('HTTP API /api/plugins supports catalog, toggle, config, test, custom lifecycle, and readOnly guard', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-plugins-api-'));
  const config = loadConfig({
    cli: { demo: true, hosts: '127.0.0.1', port: 4320 },
    env: { OPS_CONSOLE_DATA_DIR: tmpDir },
  });
  config.console.port = 0;
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;
  const originHeaders = { Origin: baseUrl, 'Content-Type': 'application/json' };

  try {
    // 1. GET /api/plugins
    const listRes = await fetch(`${baseUrl}/api/plugins`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.ok, true);
    assert.ok(listJson.items.some((p) => p.id === 'mcp-server'));
    assert.ok(listJson.items.some((p) => p.id === 'agent-runtime'));
    assert.ok(listJson.items.some((p) => p.id === 'openai-gateway'));

    // 2. POST /api/plugins/:id/test
    const testRes = await fetch(`${baseUrl}/api/plugins/mcp-server/test`, {
      method: 'POST',
      headers: originHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(testRes.status, 200);
    const testJson = await testRes.json();
    assert.equal(testJson.ok, true);
    assert.ok(Array.isArray(testJson.steps) && testJson.steps.length > 0);

    // 3. POST /api/plugins/:id/config (verify secret redaction on response)
    const cfgRes = await fetch(`${baseUrl}/api/plugins/mcp-server/config`, {
      method: 'POST',
      headers: originHeaders,
      body: JSON.stringify({ apiUrl: 'http://127.0.0.1:8123/mcp', authToken: 'secret-token-xyz123' }),
    });
    assert.equal(cfgRes.status, 200);
    const cfgJson = await cfgRes.json();
    assert.equal(cfgJson.config.apiUrl, 'http://127.0.0.1:8123/mcp');
    assert.equal(cfgJson.config.authToken, '••••••••');

    // 4. POST /api/plugins/custom -> appears -> DELETE /api/plugins/custom/:id
    const addRes = await fetch(`${baseUrl}/api/plugins/custom`, {
      method: 'POST',
      headers: originHeaders,
      body: JSON.stringify({
        name: 'Team Ollama',
        kind: 'gateway',
        apiUrl: 'http://127.0.0.1:11434',
      }),
    });
    assert.equal(addRes.status, 201);
    const addJson = await addRes.json();
    assert.equal(addJson.ok, true);
    assert.ok(addJson.id.startsWith('custom-'));

    // Snapshot should include the custom plugin
    const snapRes = await fetch(`${baseUrl}/api/snapshot?refresh=1`);
    const snapJson = await snapRes.json();
    assert.ok(Array.isArray(snapJson.plugins) && snapJson.plugins.some((p) => p.id === addJson.id));

    const delRes = await fetch(`${baseUrl}/api/plugins/custom/${addJson.id}`, {
      method: 'DELETE',
      headers: originHeaders,
    });
    assert.equal(delRes.status, 200);

    // 5. Read-only mode guard check
    config.console.readOnly = true;
    const roRes = await fetch(`${baseUrl}/api/plugins/mcp-server/toggle`, {
      method: 'POST',
      headers: originHeaders,
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(roRes.status, 403);
  } finally {
    await app.stop();
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('Repository example config and docs contain zero personal identifiers', async () => {
  const filesToCheck = [
    'ops-console.config.example.json',
    'package.json',
    'README.md',
    'README.zh-CN.md',
    'src/probes.mjs',
  ];
  for (const rel of filesToCheck) {
    const content = await fs.readFile(path.resolve(rel), 'utf8');
    assert.equal(/\bveritaswiki\b/i.test(content), false, `Found personal handle in ${rel}`);
    assert.equal(/\bvolcbj\b/i.test(content), false, `Found personal DERP code in ${rel}`);
  }
});
