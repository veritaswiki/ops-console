import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';

async function startTestServer(overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-console-srv-'));
  const config = loadConfig({
    cli: {
      hosts: '127.0.0.1',
      port: 4320,
      demo: true,
      readOnly: overrides.readOnly ?? false,
      webKey: overrides.webKey ?? '',
    },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  return {
    app,
    baseUrl: addresses[0].url,
    cleanup: async () => {
      await app.stop();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

test('demo server serves UI, security headers, APIs, actions, export, and live SSE stream', async () => {
  const { app, baseUrl, cleanup } = await startTestServer();
  try {
    const pingRes = await fetch(`${baseUrl}/api/ping`);
    assert.equal(pingRes.status, 200);
    const ping = await pingRes.json();
    assert.equal(ping.ok, true);
    assert.equal(ping.demo, true);

    const indexRes = await fetch(`${baseUrl}/`);
    assert.equal(indexRes.status, 200);
    assert.ok(indexRes.headers.get('content-security-policy').includes("script-src 'self'"));
    assert.equal(indexRes.headers.get('x-frame-options'), 'DENY');
    assert.equal(indexRes.headers.get('x-content-type-options'), 'nosniff');
    const html = await indexRes.text();
    assert.ok(html.includes('Ops Console'));

    const traversalRes = await fetch(`${baseUrl}/%2e%2e/package.json`);
    assert.equal(traversalRes.status, 404);

    const [meta, snap, memSearch, doctor, remotes, logsRes] = await Promise.all([
      fetch(`${baseUrl}/api/meta`).then((r) => r.json()),
      fetch(`${baseUrl}/api/snapshot`).then((r) => r.json()),
      fetch(`${baseUrl}/api/memory/search?provider=all&q=tailscale`).then((r) => r.json()),
      fetch(`${baseUrl}/api/memory/doctor`).then((r) => r.json()),
      fetch(`${baseUrl}/api/remotes`).then((r) => r.json()),
      fetch(`${baseUrl}/api/logs?source=journald&level=all&lines=50`).then((r) => r.json()),
    ]);
    assert.equal(meta.ok, true);
    assert.ok(Array.isArray(snap.services.items) && snap.services.items.length > 0);
    assert.equal(memSearch.ok, true);
    assert.equal(doctor.ok, true);
    assert.equal(remotes.ok, true);
    assert.equal(logsRes.ok, true);
    assert.ok(logsRes.entries.length > 0);

    const exportRes = await fetch(`${baseUrl}/api/logs/export?source=journald&format=jsonl`);
    assert.equal(exportRes.status, 200);
    assert.ok(exportRes.headers.get('content-disposition').includes('.jsonl'));

    const firstUnit = snap.services.items[0].unit;
    const csrfBlocked = await fetch(`${baseUrl}/api/services/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
      body: JSON.stringify({ unit: firstUnit, action: 'restart' }),
    });
    assert.equal(csrfBlocked.status, 403);

    const ctrlRes = await fetch(`${baseUrl}/api/services/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: firstUnit, action: 'restart' }),
    });
    assert.equal(ctrlRes.status, 200);
    const ctrlBody = await ctrlRes.json();
    assert.equal(ctrlBody.ok, true);

    const audit = await fetch(`${baseUrl}/api/audit`).then((r) => r.json());
    assert.equal(audit.ok, true);
    assert.ok(audit.items.some((a) => a.target === firstUnit && a.action === 'restart'));

    const ac = new AbortController();
    const sseRes = await fetch(`${baseUrl}/api/logs/stream?source=journald`, { signal: ac.signal });
    assert.equal(sseRes.status, 200);
    assert.ok(sseRes.headers.get('content-type').includes('text/event-stream'));
    const reader = sseRes.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (!buf.includes('event: log')) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    assert.ok(buf.includes('event: ready'));
    assert.ok(buf.includes('event: log'));
    ac.abort();
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(app.logs.activeStreams.size, 0);
  } finally {
    await cleanup();
  }
});

test('read-only mode blocks all mutating service, timer, and ops endpoints', async () => {
  const { baseUrl, cleanup } = await startTestServer({ readOnly: true });
  try {
    for (const [endpoint, body] of [
      ['/api/services/control', { unit: 'magpie.service', action: 'restart' }],
      ['/api/timers/control', { unit: 'ops-backup.timer', action: 'start' }],
      ['/api/ops/health', {}],
      ['/api/ops/backup', {}],
    ]) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.equal(res.status, 403, `Expected 403 on ${endpoint}`);
    }
  } finally {
    await cleanup();
  }
});

test('web-key auth enforces login gate, ?k= bootstrap cookie, Bearer token, and logout', async () => {
  const webKey = 'test-web-key-0123456789abcdef';
  const { baseUrl, cleanup } = await startTestServer({ webKey });
  try {
    const ping = await fetch(`${baseUrl}/api/ping`);
    assert.equal(ping.status, 200);

    const unauthApi = await fetch(`${baseUrl}/api/snapshot`);
    assert.equal(unauthApi.status, 401);

    const unauthHtml = await fetch(`${baseUrl}/`);
    assert.equal(unauthHtml.status, 401);
    const gateHtml = await unauthHtml.text();
    assert.ok(gateHtml.includes('id="loginForm"'));

    const bootstrap = await fetch(`${baseUrl}/?k=${encodeURIComponent(webKey)}`, { redirect: 'manual' });
    assert.equal(bootstrap.status, 302);
    assert.equal(bootstrap.headers.get('location'), '/');
    const setCookie = bootstrap.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('ops_console_session='));

    const cookiePair = setCookie.split(';')[0];
    const authedByCookie = await fetch(`${baseUrl}/api/meta`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(authedByCookie.status, 200);

    const authedByBearer = await fetch(`${baseUrl}/api/meta`, {
      headers: { Authorization: `Bearer ${webKey}` },
    });
    assert.equal(authedByBearer.status, 200);

    const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'wrong-key' }),
    });
    assert.equal(badLogin.status, 401);

    const goodLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: webKey }),
    });
    assert.equal(goodLogin.status, 200);
    assert.ok(goodLogin.headers.get('set-cookie').includes('ops_console_session='));

    const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    assert.equal(logout.status, 200);
    assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
  } finally {
    await cleanup();
  }
});
