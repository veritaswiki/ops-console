import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildSignedA2AHeaders,
  computeA2AKeyId,
  getA2ASigningMetadata,
  verifyA2ASignature,
} from '../src/a2a-protocol.mjs';
import { loadConfig } from '../src/config.mjs';
import {
  collectMagpieCatalog,
  inferMagpieHarness,
  normalizeMagpieModelId,
  normalizeMagpieModels,
  parseMagpieAgentsText,
} from '../src/connectors/gateway-magpie.mjs';
import { createOpsConsole } from '../src/server.mjs';

async function startMockMagpieServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          object: 'list',
          data: [
            {
              id: 'auto/gemini-4-argon',
              name: 'Gemini 4 Argon',
              owned_by: 'auto',
              reasoning: true,
              reasoning_levels: ['low', 'medium', 'high'],
              context_window: 1048576,
            },
            {
              id: 'opencode-go/claude-sonnet-5-5',
              display_name: 'Claude Sonnet 5.5',
              owned_by: 'opencode-go',
              reasoning: true,
              context_window: 200000,
            },
            {
              id: 'opencode-go/gpt-6-luna',
              owned_by: 'opencode-go',
              reasoning: false,
            },
          ],
        }),
      );
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  return {
    server,
    url: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('gateway-magpie helpers parse agent bindings and normalize models', () => {
  assert.equal(inferMagpieHarness('Codex CLI'), 'codex');
  assert.equal(inferMagpieHarness('Claude Code'), 'claude-code');
  assert.equal(inferMagpieHarness('Pi Coding Agent'), 'pi');
  assert.equal(normalizeMagpieModelId('magpie/auto/gemini-4-argon'), 'auto/gemini-4-argon');

  const sampleLs = [
    '  Codex          auto/gemini-4-argon                ~/.codex/config.toml    effort high',
    '  Claude Code    opencode-go/claude-sonnet-5-5      ~/.claude/settings.json mcp=hub',
    '  Pi             magpie/opencode-go/gpt-6-luna      ~/.pi/agent/settings.json',
  ].join('\n');
  const bindings = parseMagpieAgentsText(sampleLs);
  assert.ok(bindings.length >= 2);
  const codexBinding = bindings.find((item) => item.harness === 'codex');
  assert.ok(codexBinding);
  assert.equal(codexBinding.canonicalModel, 'auto/gemini-4-argon');
  assert.equal(codexBinding.effort, 'high');

  const normalized = normalizeMagpieModels([
    { id: 'auto/gemini-4-argon', name: 'Gemini 4 Argon', reasoning: true },
    { id: 'opencode-go/gpt-6-luna', owned_by: 'opencode-go' },
  ]);
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].isRoutingGroup, true);
  assert.equal(normalized[0].reasoning, true);
  assert.equal(normalized[1].provider, 'opencode-go');
});

test('collectMagpieCatalog fetches OpenAI-compatible /v1/models and handles unreachable endpoint', async () => {
  const mock = await startMockMagpieServer();
  try {
    const okCatalog = await collectMagpieCatalog(
      { enabled: true, apiUrl: mock.url, cliBin: '/nonexistent-magpie-bin' },
      { awaitCli: false },
    );
    assert.equal(okCatalog.reachable, true);
    assert.equal(okCatalog.totalModels, 3);
    assert.equal(okCatalog.reasoningModels, 2);
    assert.ok(okCatalog.models.some((item) => item.id === 'auto/gemini-4-argon'));

    const deadCatalog = await collectMagpieCatalog(
      { enabled: true, apiUrl: 'http://127.0.0.1:1', cliBin: '/nonexistent-magpie-bin' },
      { awaitCli: false },
    );
    assert.equal(deadCatalog.reachable, false);
    assert.equal(deadCatalog.models.length, 0);
  } finally {
    await mock.close();
  }
});

test('Ops Console wires file-backed A2A HMAC signing, /api/magpie/models, and model-aware task dispatch', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-console-magpie-sign-'));
  const dataDir = path.join(tmpDir, 'data');
  const secretFile = path.join(tmpDir, 'a2a-hmac.key');
  const testSecret = 'ops-console-a2a-signing-secret-2026-test-only';
  await fs.writeFile(secretFile, `${testSecret}\n`, { mode: 0o600 });
  await fs.chmod(secretFile, 0o600);

  const mockMagpie = await startMockMagpieServer();
  const capturedOutboundRpcs = [];
  const mockPeerServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const sigCheck = verifyA2ASignature({
        rawBody,
        signature: req.headers['x-a2a-signature'],
        timestampSec: req.headers['x-a2a-timestamp'],
        secret: testSecret,
      });
      let parsed = null;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        parsed = null;
      }
      capturedOutboundRpcs.push({ sigCheck, parsed });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: parsed?.id || '1',
          result: {
            id: 'peer-task-ok',
            status: { state: 'completed', message: 'peer accepted signed model dispatch' },
          },
        }),
      );
    });
  });
  await new Promise((resolve) => mockPeerServer.listen(0, '127.0.0.1', resolve));
  const mockPeerUrl = `http://127.0.0.1:${mockPeerServer.address().port}`;
  let app = null;

  try {
    const config = loadConfig({
      rawConfig: {
        console: {
          host: '127.0.0.1',
          port: 4320,
          dataDir,
          readOnly: false,
        },
        a2a: {
          sharedSecret: `file://${secretFile}`,
        },
        connectors: {
          magpie: {
            enabled: true,
            apiUrl: mockMagpie.url,
            cliBin: '/nonexistent-magpie-bin',
          },
          systemd: { enabled: false },
          tailscale: { enabled: false },
          cloudflare: { enabled: false },
          mihomo: { enabled: false },
          syncthing: { enabled: false },
          memory: { enabled: false },
        },
        services: [],
        fleet: { nodes: [] },
      },
      env: {},
    });
    config.console.port = 0;

    const signingMeta = getA2ASigningMetadata(config);
    assert.equal(signingMeta.configured, true);
    assert.equal(signingMeta.keySource, 'file');
    assert.equal(signingMeta.algorithm, 'HMAC-SHA256');
    assert.equal(signingMeta.keyId, computeA2AKeyId(testSecret));

    app = createOpsConsole({ config });
    await app.start();
    const baseUrl = `http://127.0.0.1:${app.servers[0].address().port}`;

    const modelsRes = await fetch(`${baseUrl}/api/magpie/models`);
    assert.equal(modelsRes.status, 200);
    const modelsBody = await modelsRes.json();
    assert.equal(modelsBody.reachable, true);
    assert.equal(modelsBody.totalModels, 3);

    const stateRes = await fetch(`${baseUrl}/api/a2a/state`);
    assert.equal(stateRes.status, 200);
    const stateText = await stateRes.text();
    assert.equal(stateText.includes(testSecret), false, 'A2A state must never leak signing secret');
    const stateBody = JSON.parse(stateText);
    assert.equal(stateBody.signing.configured, true);
    assert.equal(stateBody.signing.keySource, 'file');
    assert.equal(stateBody.signing.keyId, signingMeta.keyId);

    const profilesRes = await fetch(`${baseUrl}/api/a2a/connect-profiles`);
    assert.equal(profilesRes.status, 200);
    const profilesBody = await profilesRes.json();
    assert.equal(profilesBody.signingConfigured, true);
    assert.equal(profilesBody.signingKeySource, 'file');
    assert.equal(profilesBody.signingKeyId, signingMeta.keyId);

    const selfVerifyRes = await fetch(`${baseUrl}/api/a2a/signing/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(selfVerifyRes.status, 200);
    const selfVerify = await selfVerifyRes.json();
    assert.equal(selfVerify.mode, 'self-test');
    assert.equal(selfVerify.valid, true);
    assert.ok(selfVerify.sampleSignaturePrefix.startsWith('sha256='));

    const rawPayload = JSON.stringify({ jsonrpc: '2.0', id: 'manual-1', method: 'agent/ping' });
    const tsSec = Math.floor(Date.now() / 1000);
    const signedHeaders = buildSignedA2AHeaders(rawPayload, {
      secret: testSecret,
      timestampSec: tsSec,
    });

    const validVerifyRes = await fetch(`${baseUrl}/api/a2a/signing/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawBody: rawPayload,
        signature: signedHeaders['X-A2A-Signature'],
        timestampSec: tsSec,
      }),
    });
    const validVerify = await validVerifyRes.json();
    assert.equal(validVerify.mode, 'verify');
    assert.equal(validVerify.valid, true);

    const badVerifyRes = await fetch(`${baseUrl}/api/a2a/signing/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawBody: rawPayload,
        signature: 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        timestampSec: tsSec,
      }),
    });
    const badVerify = await badVerifyRes.json();
    assert.equal(badVerify.valid, false);

    const registerRes = await fetch(`${baseUrl}/api/a2a/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'codex-test-lead',
        name: 'Codex Test Lead',
        harness: 'codex-cli',
        nodeId: 'test-node',
        role: 'lead',
        status: 'online',
        agentCardUrl: `${mockPeerUrl}/.well-known/agent-card.json`,
        rpcUrl: `${mockPeerUrl}/a2a`,
      }),
    });
    assert.equal(registerRes.status, 201);
    const registered = await registerRes.json();
    const targetAgentId = registered.agent?.id || 'codex-test-lead';

    const leadRes = await fetch(`${baseUrl}/api/a2a/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: targetAgentId }),
    });
    assert.equal(leadRes.status, 200);

    const dispatchRes = await fetch(`${baseUrl}/api/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '检查 Magpie 模型路由状态',
        targetAgentId,
        model: 'auto/gemini-4-argon',
        reasoningEffort: 'high',
      }),
    });
    assert.equal(dispatchRes.status, 201);
    const dispatchBody = await dispatchRes.json();
    assert.equal(dispatchBody.task.appliedModel, 'auto/gemini-4-argon');
    assert.equal(dispatchBody.task.selectedModel, 'auto/gemini-4-argon');
    assert.equal(dispatchBody.task.modelSource, 'manual');
    assert.equal(dispatchBody.task.signed, true);
    assert.equal(dispatchBody.task.signatureKeyId, signingMeta.keyId);
    assert.ok(capturedOutboundRpcs.length >= 1, 'expected signed outbound A2A JSON-RPC');
    assert.equal(capturedOutboundRpcs[0].sigCheck.valid, true);
    assert.equal(capturedOutboundRpcs[0].parsed?.params?.metadata?.model, 'auto/gemini-4-argon');

    const rpcBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 'rpc-model-1',
      method: 'message/send',
      params: {
        message: {
          role: 'user',
          parts: [{ kind: 'text', text: '通过签名 JSON-RPC 派发指定模型任务' }],
        },
        metadata: {
          targetAgentId,
          model: 'opencode-go/claude-sonnet-5-5',
          reasoningEffort: 'medium',
        },
      },
    });
    const rpcBadRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-A2A-Signature': 'sha256=deadbeef',
        'X-A2A-Timestamp': String(tsSec),
      },
      body: rpcBody,
    });
    assert.equal(rpcBadRes.status, 401);

    const rpcGoodHeaders = buildSignedA2AHeaders(rpcBody, { secret: testSecret });
    const rpcGoodRes = await fetch(`${baseUrl}/a2a`, {
      method: 'POST',
      headers: rpcGoodHeaders,
      body: rpcBody,
    });
    assert.equal(rpcGoodRes.status, 200);
    const rpcGood = await rpcGoodRes.json();
    assert.equal(rpcGood.result?.metadata?.appliedModel, 'opencode-go/claude-sonnet-5-5');
  } finally {
    if (app) await app.stop();
    await new Promise((resolve) => mockPeerServer.close(resolve));
    await mockMagpie.close();
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
