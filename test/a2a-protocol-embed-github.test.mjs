import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import { buildSignedA2AHeaders } from '../src/a2a-protocol.mjs';
import { A2AOrchestrator } from '../src/a2a-orchestrator.mjs';
import {
  resolveServiceAdminUrl,
  rewriteEmbeddedHtml,
  rewriteLocationHeader,
} from '../src/service-proxy.mjs';
import { createOpsConsole } from '../src/server.mjs';
import {
  collectProbeMetrics,
  loadProbeConfig,
  parseCliArgs,
  startA2APeerServer,
} from '../probe/ops-probe.mjs';

async function startConsoleServer(overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-a2a-embed-'));
  const config = loadConfig({
    rawConfig: {},
    cli: {
      hosts: '127.0.0.1',
      port: 4320,
      demo: overrides.demo ?? true,
      readOnly: overrides.readOnly ?? false,
      webKey: overrides.webKey ?? '',
    },
    env: {
      OPS_CONSOLE_DATA_DIR: dataDir,
      ...(process.env.OPS_A2A_SHARED_SECRET ? { OPS_A2A_SHARED_SECRET: process.env.OPS_A2A_SHARED_SECRET } : {}),
    },
  });
  config.console.port = 0;
  if (Array.isArray(overrides.services)) {
    config.services = overrides.services;
  }
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  return {
    app,
    config,
    baseUrl: addresses[0].url,
    cleanup: async () => {
      await app.stop();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

async function startMockUpstream() {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
    if (reqUrl.pathname === '/redirect') {
      res.writeHead(302, {
        Location: '/app?from=redirect',
      });
      res.end();
      return;
    }
    if (reqUrl.pathname === '/app') {
      const body = [
        '<!doctype html><html><head><title>Mock Admin</title>',
        '<link rel="stylesheet" href="/static/app.css">',
        '</head><body>',
        '<form action="/submit"><a href="/login">Login</a><a href="#section">Hash</a></form>',
        '<script src="/static/main.js"></script>',
        '</body></html>',
      ].join('');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
        'Set-Cookie': 'upstream_sid=demo123; Domain=127.0.0.1; Path=/app; SameSite=Strict',
        'X-Seen-Cookie': String(req.headers.cookie || ''),
      });
      res.end(body);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    }),
  };
}

test('A2A v0.3 AgentCard discovery, HMAC-SHA256 auth, and JSON-RPC lifecycle', async () => {
  const prevSecret = process.env.OPS_A2A_SHARED_SECRET;
  const sharedSecret = 'test-shared-a2a-hmac-secret-01';
  process.env.OPS_A2A_SHARED_SECRET = sharedSecret;

  const { baseUrl, cleanup } = await startConsoleServer({
    demo: true,
    webKey: 'test-ops-web-key',
  });

  try {
    const cardRes = await fetch(`${baseUrl}/.well-known/agent-card.json`);
    assert.equal(cardRes.status, 200);
    const card = await cardRes.json();
    assert.equal(card.protocolVersion, '0.3.0');
    assert.ok(card.url.endsWith('/a2a'));
    assert.ok(Array.isArray(card.skills) && card.skills.length > 0);
    assert.ok(card.metadata.registeredAgents > 0);

    const aliasCardRes = await fetch(`${baseUrl}/.well-known/agent.json`);
    assert.equal(aliasCardRes.status, 200);

    const pingBody = JSON.stringify({ jsonrpc: '2.0', id: 'req-1', method: 'agent/ping', params: {} });

    const unsignedRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: pingBody,
    });
    assert.equal(unsignedRes.status, 401);

    const badSigRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: buildSignedA2AHeaders(pingBody, { secret: 'wrong-secret' }),
      body: pingBody,
    });
    assert.equal(badSigRes.status, 401);

    const staleRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: buildSignedA2AHeaders(pingBody, {
        secret: sharedSecret,
        timestampSec: Math.floor(Date.now() / 1000) - 600,
      }),
      body: pingBody,
    });
    assert.equal(staleRes.status, 401);

    const signedPingRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: buildSignedA2AHeaders(pingBody, { secret: sharedSecret }),
      body: pingBody,
    });
    assert.equal(signedPingRes.status, 200);
    const signedPing = await signedPingRes.json();
    assert.equal(signedPing.result.pong, true);
    assert.equal(signedPing.result.protocolVersion, '0.3.0');

    const bearerPingRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-ops-web-key',
      },
      body: pingBody,
    });
    assert.equal(bearerPingRes.status, 200);

    const cardRpcBody = JSON.stringify({ jsonrpc: '2.0', id: 'req-2', method: 'agent/card', params: {} });
    const cardRpcRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: buildSignedA2AHeaders(cardRpcBody, { secret: sharedSecret }),
      body: cardRpcBody,
    });
    assert.equal(cardRpcRes.status, 200);
    const cardRpc = await cardRpcRes.json();
    assert.equal(cardRpc.result.protocolVersion, '0.3.0');

    const sendBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 'req-3',
      method: 'message/send',
      params: {
        contextId: 'ctx-integration-1',
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: 'Inspect fleet health and summarize warnings' }],
        },
      },
    });
    const sendRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: buildSignedA2AHeaders(sendBody, { secret: sharedSecret }),
      body: sendBody,
    });
    assert.equal(sendRes.status, 200);
    const sent = await sendRes.json();
    assert.equal(sent.result.kind, 'task');
    assert.equal(sent.result.status.state, 'completed');
    const taskId = sent.result.id;
    assert.ok(taskId);

    const getBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 'req-4',
      method: 'tasks/get',
      params: { id: taskId },
    });
    const getRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: buildSignedA2AHeaders(getBody, { secret: sharedSecret }),
      body: getBody,
    });
    assert.equal(getRes.status, 200);
    const fetchedTask = await getRes.json();
    assert.equal(fetchedTask.result.id, taskId);

    const cancelBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 'req-5',
      method: 'tasks/cancel',
      params: { id: taskId },
    });
    const cancelCompletedRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: buildSignedA2AHeaders(cancelBody, { secret: sharedSecret }),
      body: cancelBody,
    });
    assert.equal(cancelCompletedRes.status, 200);
    const cancelCompleted = await cancelCompletedRes.json();
    assert.equal(cancelCompleted.result.status.state, 'completed');

    const reopenRes = await fetch(`${baseUrl}/api/a2a/tasks/${taskId}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-ops-web-key',
      },
      body: JSON.stringify({ state: 'working', reason: 'reopen before cancel test' }),
    });
    assert.equal(reopenRes.status, 200);

    const cancelWorkingRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: buildSignedA2AHeaders(cancelBody, { secret: sharedSecret }),
      body: cancelBody,
    });
    assert.equal(cancelWorkingRes.status, 200);
    const canceled = await cancelWorkingRes.json();
    assert.equal(canceled.result.status.state, 'canceled');
  } finally {
    if (prevSecret === undefined) {
      delete process.env.OPS_A2A_SHARED_SECRET;
    } else {
      process.env.OPS_A2A_SHARED_SECRET = prevSecret;
    }
    await cleanup();
  }
});

test('PATCH /api/a2a/tasks/:id/state transitions states, rejects invalid state, and enforces readOnly', async () => {
  const writable = await startConsoleServer({ demo: true, readOnly: false });
  try {
    const createRes = await fetch(`${writable.baseUrl}/api/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Verify kanban task state transitions' }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    const taskId = created.task.id;

    for (const nextState of ['submitted', 'working', 'completed', 'failed']) {
      const patchRes = await fetch(`${writable.baseUrl}/api/a2a/tasks/${taskId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: nextState, reason: `move to ${nextState}` }),
      });
      assert.equal(patchRes.status, 200);
      const patched = await patchRes.json();
      assert.equal(patched.ok, true);
      assert.equal(patched.task.state, nextState);
    }

    const invalidRes = await fetch(`${writable.baseUrl}/api/a2a/tasks/${taskId}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'not-a-valid-state' }),
    });
    assert.equal(invalidRes.status, 400);
  } finally {
    await writable.cleanup();
  }

  const ro = await startConsoleServer({ demo: true, readOnly: true });
  try {
    const stateRes = await fetch(`${ro.baseUrl}/api/a2a/state`);
    const state = await stateRes.json();
    const existingId = state.tasks?.[0]?.id || 'a2a-task-demo';
    const patchRes = await fetch(`${ro.baseUrl}/api/a2a/tasks/${existingId}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'working' }),
    });
    assert.equal(patchRes.status, 403);
  } finally {
    await ro.cleanup();
  }
});

test('GET /api/a2a/connect-profiles returns Tailscale, Cloudflare, and LAN profiles with a2aPeerCmd', async () => {
  const { baseUrl, cleanup } = await startConsoleServer({ demo: true });
  try {
    const res = await fetch(
      `${baseUrl}/api/a2a/connect-profiles?nodeId=edge-tokyo&deviceType=server&tailscaleHost=hub.tailnet.ts.net&cloudflareDomain=ops.example.com`,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.specVersion, '0.3.0');
    assert.ok(body.hubAgentCardUrl.endsWith('/.well-known/agent-card.json'));
    assert.ok(body.hubRpcUrl.endsWith('/a2a'));
    assert.deepEqual(
      body.profiles.map((profile) => profile.id),
      ['tailscale', 'cloudflare', 'lan'],
    );
    for (const profile of body.profiles) {
      assert.ok(typeof profile.a2aPeerCmd === 'string' && profile.a2aPeerCmd.includes('--a2a-port 9104'));
      assert.ok(profile.a2aPeerCmd.includes('edge-tokyo'));
    }
  } finally {
    await cleanup();
  }
});

test('POST /api/a2a/agents/:id/ping succeeds in demo mode and live loopback Hub<->Probe peer flow', async () => {
  const demoSrv = await startConsoleServer({ demo: true });
  try {
    const state = await fetch(`${demoSrv.baseUrl}/api/a2a/state`).then((r) => r.json());
    const agent = state.agents.find((item) => item.status !== 'offline') || state.agents[0];
    const pingRes = await fetch(`${demoSrv.baseUrl}/api/a2a/agents/${agent.id}/ping`, { method: 'POST' });
    assert.equal(pingRes.status, 200);
    const ping = await pingRes.json();
    assert.equal(ping.ok, true);
    assert.equal(ping.reachable, true);
    assert.equal(ping.protocol, 'google-a2a/0.3');
    assert.equal(ping.pong.pong, true);
  } finally {
    await demoSrv.cleanup();
  }

  const prevSecret = process.env.OPS_A2A_SHARED_SECRET;
  const peerSecret = 'hub-to-probe-loopback-secret';
  process.env.OPS_A2A_SHARED_SECRET = peerSecret;

  const peer = await startA2APeerServer(
    {
      nodeId: 'edge-loopback',
      token: 'probe-node-token',
      a2a: { enabled: true, host: '127.0.0.1', port: 0, sharedSecret: peerSecret, workspaceRoot: process.cwd() },
    },
  );
  const liveSrv = await startConsoleServer({ demo: false, readOnly: false });

  try {
    const regRes = await fetch(`${liveSrv.baseUrl}/api/a2a/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'peer-edge-loopback',
        name: 'Edge Loopback Probe',
        harness: 'custom-a2a',
        nodeId: 'edge-loopback',
        agentCardUrl: peer.agentCardUrl,
        rpcUrl: peer.rpcUrl,
      }),
    });
    assert.equal(regRes.status, 201);

    const pingRes = await fetch(`${liveSrv.baseUrl}/api/a2a/agents/peer-edge-loopback/ping`, {
      method: 'POST',
    });
    assert.equal(pingRes.status, 200);
    const ping = await pingRes.json();
    assert.equal(ping.ok, true);
    assert.equal(ping.reachable, true);
    assert.equal(ping.card.protocolVersion, '0.3.0');
    assert.equal(ping.pong.pong, true);
    assert.equal(ping.pong.nodeId, 'edge-loopback');

    const leadRes = await fetch(`${liveSrv.baseUrl}/api/a2a/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'peer-edge-loopback' }),
    });
    assert.equal(leadRes.status, 200);

    const taskRes = await fetch(`${liveSrv.baseUrl}/api/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Collect live node diagnostics',
        targetAgentId: 'peer-edge-loopback',
      }),
    });
    assert.equal(taskRes.status, 201);
    const dispatched = await taskRes.json();
    assert.equal(dispatched.task.state, 'completed');
    assert.ok(dispatched.task.artifact.includes('A2A Peer edge-loopback'));
  } finally {
    if (prevSecret === undefined) {
      delete process.env.OPS_A2A_SHARED_SECRET;
    } else {
      process.env.OPS_A2A_SHARED_SECRET = prevSecret;
    }
    await liveSrv.cleanup();
    await peer.close();
  }
});

test('Embedded service proxy URL resolution, HTML/Location rewriting, auth, and end-to-end upstream proxy', async () => {
  assert.equal(resolveServiceAdminUrl({ id: 'nmem', healthUrl: 'http://127.0.0.1:14242/health' }), 'http://127.0.0.1:14242/app');
  assert.equal(resolveServiceAdminUrl({ id: 'openviking', healthUrl: 'http://127.0.0.1:1933/health' }), 'http://127.0.0.1:1933/studio/');
  assert.equal(resolveServiceAdminUrl({ id: 'ops-console', healthUrl: 'http://127.0.0.1:4320/api/ping' }), null);
  assert.equal(resolveServiceAdminUrl({ id: 'tailscaled', unit: 'tailscaled.service' }), null);
  assert.equal(resolveServiceAdminUrl({ id: 'rerank-gateway', healthUrl: 'http://127.0.0.1:8000/health' }), null);
  assert.equal(resolveServiceAdminUrl({ id: 'custom-bad', adminUrl: 'javascript:alert(1)' }), null);

  assert.equal(rewriteLocationHeader('/login?next=1', '/embed/mock-ui/', 'http://127.0.0.1:8888'), '/embed/mock-ui/login?next=1');
  assert.equal(rewriteLocationHeader('http://127.0.0.1:8888/dash', '/embed/mock-ui/', 'http://127.0.0.1:8888'), '/embed/mock-ui/dash');
  assert.equal(rewriteLocationHeader('https://example.com/out', '/embed/mock-ui/', 'http://127.0.0.1:8888'), 'https://example.com/out');

  const rewritten = rewriteEmbeddedHtml(
    '<html><head></head><body><a href="/app">Go</a><script src="http://127.0.0.1:8888/js/a.js"></script><a href="#top">Top</a></body></html>',
    '/embed/mock-ui/',
    'http://127.0.0.1:8888',
  );
  assert.ok(rewritten.includes('<base href="/embed/mock-ui/">'));
  assert.ok(rewritten.includes('data-ops-embed-shim="1"'));
  assert.ok(rewritten.includes('href="/embed/mock-ui/app"'));
  assert.ok(rewritten.includes('src="/embed/mock-ui/js/a.js"'));
  assert.ok(rewritten.includes('href="#top"'));

  const upstream = await startMockUpstream();
  const webKey = 'embed-proxy-auth-key';
  const { baseUrl, cleanup } = await startConsoleServer({
    demo: true,
    webKey,
    services: [
      { id: 'mock-ui', name: 'Mock UI', unit: 'mock-ui.service', adminUrl: `${upstream.baseUrl}/app`, adminLabel: 'Mock Admin' },
      { id: 'bad-proto', name: 'Bad Proto', unit: 'bad-proto.service', adminUrl: 'ftp://example.com/admin' },
      { id: 'tailscaled', name: 'Tailscale', unit: 'tailscaled.service' },
    ],
  });

  try {
    const indexRes = await fetch(`${baseUrl}/`, { headers: { Authorization: `Bearer ${webKey}` } });
    assert.equal(indexRes.status, 200);
    assert.ok(indexRes.headers.get('content-security-policy').includes("frame-src 'self' https: http:"));

    const unauthRes = await fetch(`${baseUrl}/embed/mock-ui/`);
    assert.equal(unauthRes.status, 401);

    const authHeaders = { Authorization: `Bearer ${webKey}` };

    const unknownRes = await fetch(`${baseUrl}/embed/does-not-exist/`, { headers: authHeaders });
    assert.equal(unknownRes.status, 404);

    const excludedRes = await fetch(`${baseUrl}/embed/tailscaled/`, { headers: authHeaders });
    assert.equal(excludedRes.status, 404);

    const badProtoRes = await fetch(`${baseUrl}/embed/bad-proto/`, { headers: authHeaders });
    assert.equal(badProtoRes.status, 400);

    const pathEscapeRes = await fetch(`${baseUrl}/embed/mock-ui//example.com`, { headers: authHeaders });
    assert.equal(pathEscapeRes.status, 400);

    const slashRedirect = await fetch(`${baseUrl}/embed/mock-ui`, {
      headers: authHeaders,
      redirect: 'manual',
    });
    assert.equal(slashRedirect.status, 302);
    assert.equal(slashRedirect.headers.get('location'), '/embed/mock-ui/');

    const proxyRes = await fetch(`${baseUrl}/embed/mock-ui/`, {
      headers: {
        ...authHeaders,
        Cookie: 'ops_console_session=secret-session-cookie; ui_theme=dark',
      },
    });
    assert.equal(proxyRes.status, 200);
    assert.equal(proxyRes.headers.get('x-frame-options'), null);
    assert.equal(proxyRes.headers.get('content-security-policy'), null);
    const seenCookie = proxyRes.headers.get('x-seen-cookie') || '';
    assert.ok(!seenCookie.includes('ops_console_session'));
    assert.ok(seenCookie.includes('ui_theme=dark'));
    const setCookie = proxyRes.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes('Path=/'));
    assert.ok(setCookie.includes('SameSite=Lax'));
    assert.ok(!/domain=/i.test(setCookie));
    const html = await proxyRes.text();
    assert.ok(html.includes('<base href="/embed/mock-ui/">'));
    assert.ok(html.includes('href="/embed/mock-ui/static/app.css"'));
    assert.ok(html.includes('src="/embed/mock-ui/static/main.js"'));
    assert.ok(html.includes('action="/embed/mock-ui/submit"'));
    assert.ok(html.includes('href="/embed/mock-ui/login"'));

    const redirRes = await fetch(`${baseUrl}/embed/mock-ui/redirect`, {
      headers: authHeaders,
      redirect: 'manual',
    });
    assert.equal(redirRes.status, 302);
    assert.equal(redirRes.headers.get('location'), '/embed/mock-ui/app?from=redirect');
  } finally {
    await cleanup();
    await upstream.close();
  }
});

test('GitHub Integration Hub serves overview contract and enforces readOnly on dispatch', async () => {
  const writable = await startConsoleServer({ demo: true, readOnly: false });
  try {
    const ovRes = await fetch(`${writable.baseUrl}/api/github/overview`);
    assert.equal(ovRes.status, 200);
    const ov = await ovRes.json();
    assert.equal(ov.ok, true);
    assert.equal(ov.mode, 'demo');
    assert.ok(ov.repo && typeof ov.repo.fullName === 'string');
    assert.ok(ov.summary && typeof ov.summary.openPrs === 'number');
    assert.ok(Array.isArray(ov.pullRequests) && ov.pullRequests.length > 0);
    assert.ok(Array.isArray(ov.issues) && ov.issues.length > 0);
    assert.ok(Array.isArray(ov.workflowRuns) && ov.workflowRuns.length > 0);
    assert.ok(Array.isArray(ov.worktrees) && ov.worktrees.length > 0);

    const dispatchRes = await fetch(`${writable.baseUrl}/api/github/dispatch-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'pr',
        number: 42,
        title: 'Harden embedded admin proxy',
        action: 'review',
        branch: 'feat/proxy-hardening',
      }),
    });
    assert.equal(dispatchRes.status, 201);
    const dispatched = await dispatchRes.json();
    assert.equal(dispatched.ok, true);
    assert.equal(dispatched.task.slashCommand, '/review');
    assert.equal(dispatched.task.worktreeBranch, 'feat/proxy-hardening');
  } finally {
    await writable.cleanup();
  }

  const ro = await startConsoleServer({ demo: true, readOnly: true });
  try {
    const res = await fetch(`${ro.baseUrl}/api/github/dispatch-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'issue', number: 7, title: 'Read-only check' }),
    });
    assert.equal(res.status, 403);
  } finally {
    await ro.cleanup();
  }
});

test('ops-probe A2A v0.3 peer server enforces bind safety, signed RPC, and telemetry harnesses', async () => {
  const parsedCli = parseCliArgs([
    '--hub-url', 'https://hub.example.ts.net',
    '--node-id', 'edge-cli-01',
    '--a2a-host', '127.0.0.1',
    '--a2a-port', '9105',
    '--a2a-secret', 'cli-secret',
    '--a2a-workspace', process.cwd(),
    '--a2a-exec-mode', 'safe',
  ]);
  const loadedCfg = await loadProbeConfig({ cli: parsedCli, env: {} });
  assert.equal(loadedCfg.hubUrl, 'https://hub.example.ts.net');
  assert.equal(loadedCfg.nodeId, 'edge-cli-01');
  assert.equal(loadedCfg.a2a.enabled, true);
  assert.equal(loadedCfg.a2a.host, '127.0.0.1');
  assert.equal(loadedCfg.a2a.port, 9105);
  assert.equal(loadedCfg.a2a.sharedSecret, 'cli-secret');
  assert.equal(loadedCfg.a2a.execMode, 'safe');

  await assert.rejects(
    () => startA2APeerServer({ nodeId: 'bad-bind', a2a: { host: '0.0.0.0', port: 0, allowAny: false } }),
    /wildcard/i,
  );
  await assert.rejects(
    () => startA2APeerServer({ nodeId: 'bad-bind-v6', a2a: { host: '::', port: 0, allowAny: false } }),
    /wildcard/i,
  );

  const secret = 'probe-peer-test-secret';
  const peer = await startA2APeerServer({
    nodeId: 'probe-unit-01',
    token: 'probe-bearer-fallback',
    a2a: {
      enabled: true,
      host: '127.0.0.1',
      port: 0,
      sharedSecret: secret,
      workspaceRoot: process.cwd(),
    },
  });

  try {
    const cardRes = await fetch(peer.agentCardUrl);
    assert.equal(cardRes.status, 200);
    const card = await cardRes.json();
    assert.equal(card.protocolVersion, '0.3.0');
    assert.equal(card.metadata.nodeId, 'probe-unit-01');
    const skillIds = card.skills.map((skill) => skill.id);
    assert.ok(skillIds.includes('node-diagnostics'));
    assert.ok(skillIds.includes('workspace-inspect'));
    assert.ok(skillIds.includes('agent-relay'));

    const pingBody = JSON.stringify({ jsonrpc: '2.0', id: 'p-1', method: 'agent/ping', params: {} });
    const unsignedRes = await fetch(peer.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: pingBody,
    });
    assert.equal(unsignedRes.status, 401);

    const badSigRes = await fetch(peer.rpcUrl, {
      method: 'POST',
      headers: buildSignedA2AHeaders(pingBody, { secret: 'wrong-key' }),
      body: pingBody,
    });
    assert.equal(badSigRes.status, 401);

    const signedPingRes = await fetch(peer.rpcUrl, {
      method: 'POST',
      headers: buildSignedA2AHeaders(pingBody, { secret }),
      body: pingBody,
    });
    assert.equal(signedPingRes.status, 200);
    const signedPing = await signedPingRes.json();
    assert.equal(signedPing.result.pong, true);
    assert.equal(signedPing.result.nodeId, 'probe-unit-01');

    const bearerRes = await fetch(peer.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer probe-bearer-fallback',
      },
      body: pingBody,
    });
    assert.equal(bearerRes.status, 200);

    const sendBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 'p-2',
      method: 'message/send',
      params: {
        contextId: 'ctx-peer-01',
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: 'Run node diagnostics and inspect git status' }],
        },
      },
    });
    const sendRes = await fetch(peer.rpcUrl, {
      method: 'POST',
      headers: buildSignedA2AHeaders(sendBody, { secret }),
      body: sendBody,
    });
    assert.equal(sendRes.status, 200);
    const sent = await sendRes.json();
    assert.equal(sent.result.kind, 'task');
    assert.equal(sent.result.status.state, 'completed');
    const dataPart = sent.result.artifacts[0].parts.find((part) => part.kind === 'data');
    assert.equal(dataPart.data.nodeId, 'probe-unit-01');
    assert.equal(dataPart.data.gitStatus.available, true);

    const getBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 'p-3',
      method: 'tasks/get',
      params: { id: sent.result.id },
    });
    const getRes = await fetch(peer.rpcUrl, {
      method: 'POST',
      headers: buildSignedA2AHeaders(getBody, { secret }),
      body: getBody,
    });
    assert.equal(getRes.status, 200);
    const fetched = await getRes.json();
    assert.equal(fetched.result.id, sent.result.id);

    const cancelBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 'p-4',
      method: 'tasks/cancel',
      params: { id: sent.result.id },
    });
    const cancelRes = await fetch(peer.rpcUrl, {
      method: 'POST',
      headers: buildSignedA2AHeaders(cancelBody, { secret }),
      body: cancelBody,
    });
    assert.equal(cancelRes.status, 200);
    const canceled = await cancelRes.json();
    assert.equal(canceled.result.status.state, 'canceled');

    const metrics = await collectProbeMetrics(
      { nodeId: 'probe-unit-01', cpuSampleDelayMs: 0 },
      { a2aPeer: peer },
    );
    const primaryHarness = metrics.harnesses.find((item) => item.id === 'a2a-peer-probe-unit-01');
    assert.ok(primaryHarness);
    assert.equal(primaryHarness.agentCardUrl, peer.agentCardUrl);
    assert.equal(primaryHarness.rpcUrl, peer.rpcUrl);
  } finally {
    await peer.close();
  }
});

test('A2AOrchestrator syncProbeHarnesses materializes probe peers for discover, signed ping, and signed message/send dispatch', async () => {
  const secret = 'probe-sync-shared-secret-2026';
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-a2a-probe-sync-'));
  const peer = await startA2APeerServer({
    nodeId: 'probe-sync-mac',
    a2a: {
      enabled: true,
      host: '127.0.0.1',
      port: 0,
      sharedSecret: secret,
      execMode: 'safe',
      workspaceRoot: process.cwd(),
    },
  });
  try {
    const metrics = await collectProbeMetrics(
      { nodeId: 'probe-sync-mac', cpuSampleDelayMs: 0 },
      { a2aPeer: peer },
    );
    const orchestrator = new A2AOrchestrator(
      {
        demo: false,
        console: { dataDir },
        a2a: { sharedSecret: secret },
      },
      null,
    );
    await orchestrator.init();
    await orchestrator.registerAgent({
      id: 'a2a-hub-primary-lead',
      name: 'Hub Lead',
      harness: 'codex-cli',
      nodeId: 'hub-primary',
      agentCardUrl: 'http://127.0.0.1:4320/.well-known/agent-card.json',
      rpcUrl: 'http://127.0.0.1:4320/a2a',
      setAsLead: true,
    });

    const fleetNodes = [
      {
        id: 'probe-sync-mac',
        name: 'MacBook Sync Test',
        status: 'healthy',
        lastHeartbeatAt: new Date().toISOString(),
        harnesses: [
          ...metrics.harnesses,
          {
            id: 'unsafe-meta-peer',
            name: 'Unsafe Peer',
            agentCardUrl: 'http://169.254.169.254/latest/meta-data',
            rpcUrl: 'http://169.254.169.254/a2a',
          },
        ],
      },
    ];
    const state = orchestrator.getState(fleetNodes);
    const peerAgent = state.agents.find((agent) => agent.id === 'a2a-peer-probe-sync-mac');
    assert.ok(peerAgent);
    assert.equal(peerAgent.rpcUrl, peer.rpcUrl);

    const unsafePeer = state.agents.find((agent) => agent.id === 'unsafe-meta-peer');
    assert.ok(unsafePeer);
    assert.equal(unsafePeer.agentCardUrl, null);
    assert.equal(unsafePeer.rpcUrl, null);

    const discovered = await orchestrator.discoverAgentCard('a2a-peer-probe-sync-mac');
    assert.equal(discovered.ok, true);
    assert.equal(discovered.protocolVersion, '0.3.0');
    assert.ok((discovered.agentCard?.skills || []).length >= 3);

    const pinged = await orchestrator.pingAgent('a2a-peer-probe-sync-mac');
    assert.equal(pinged.ok, true);
    assert.equal(pinged.reachable, true);
    assert.equal(pinged.pong?.pong, true);

    const dispatched = await orchestrator.dispatchTask(
      {
        targetAgentId: 'a2a-peer-probe-sync-mac',
        prompt: 'Inspect MacBook diagnostics via signed A2A v0.3',
      },
      { actor: 'test' },
    );
    assert.equal(dispatched.workerAgentId, 'a2a-peer-probe-sync-mac');
    assert.equal(dispatched.state, 'completed');
    assert.match(dispatched.artifact || '', /A2A Peer probe-sync-mac/);

    // Subsequent heartbeat sync preserves richer discovered skills & measured latency
    const skillsBefore = orchestrator.agents.get('a2a-peer-probe-sync-mac').skills.length;
    const latencyBefore = orchestrator.agents.get('a2a-peer-probe-sync-mac').latencyMs;
    orchestrator.syncProbeHarnesses(fleetNodes);
    assert.equal(orchestrator.agents.get('a2a-peer-probe-sync-mac').skills.length, skillsBefore);
    assert.equal(orchestrator.agents.get('a2a-peer-probe-sync-mac').latencyMs, latencyBefore);
  } finally {
    await peer.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
