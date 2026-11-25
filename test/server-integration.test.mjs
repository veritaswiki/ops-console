import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';
import { loadConfig } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';

function rawHttpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('error', reject);
  });
}

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
    assert.equal(ping.version, '0.3.0');
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

    const [meta, snap, memSearch, doctor, remotes, logsRes, firewallRes, incidentsRes] = await Promise.all([
      fetch(`${baseUrl}/api/meta`).then((r) => r.json()),
      fetch(`${baseUrl}/api/snapshot`).then((r) => r.json()),
      fetch(`${baseUrl}/api/memory/search?provider=all&q=tailscale`).then((r) => r.json()),
      fetch(`${baseUrl}/api/memory/doctor`).then((r) => r.json()),
      fetch(`${baseUrl}/api/remotes`).then((r) => r.json()),
      fetch(`${baseUrl}/api/logs?source=journald&level=all&lines=50`).then((r) => r.json()),
      fetch(`${baseUrl}/api/firewall`).then((r) => r.json()),
      fetch(`${baseUrl}/api/incidents`).then((r) => r.json()),
    ]);
    assert.equal(meta.ok, true);
    assert.ok(Array.isArray(snap.services.items) && snap.services.items.length > 0);
    assert.equal(memSearch.ok, true);
    assert.equal(doctor.ok, true);
    assert.equal(remotes.ok, true);
    assert.equal(logsRes.ok, true);
    assert.ok(logsRes.entries.length > 0);
    assert.equal(firewallRes.ok, true);
    assert.equal(firewallRes.firewall.enabled, true);
    assert.equal(firewallRes.firewall.readOnly, true);
    assert.ok(Array.isArray(firewallRes.firewall.rules) && firewallRes.firewall.rules.length > 0);
    assert.ok(Array.isArray(firewallRes.firewall.listeners) && firewallRes.firewall.listeners.length > 0);
    assert.equal(firewallRes.firewall.summary.publicUnfiltered, 0);
    assert.equal(incidentsRes.ok, true);
    assert.ok(incidentsRes.storage && typeof incidentsRes.storage.driver === 'string');
    assert.ok(Array.isArray(incidentsRes.items) && incidentsRes.items.length > 0);
    assert.ok(incidentsRes.items.every((item) => item.entityKey && item.fromState && item.toState));

    const gzipSnapRes = await rawHttpGet(`${baseUrl}/api/snapshot`, { 'Accept-Encoding': 'gzip' });
    assert.equal(gzipSnapRes.statusCode, 200);
    assert.equal(gzipSnapRes.headers['content-encoding'], 'gzip');
    assert.ok(String(gzipSnapRes.headers.vary || '').toLowerCase().includes('accept-encoding'));
    const gunzippedSnap = JSON.parse(zlib.gunzipSync(gzipSnapRes.body).toString('utf8'));
    assert.ok(Array.isArray(gunzippedSnap.services.items) && gunzippedSnap.services.items.length > 0);

    const cssRes = await rawHttpGet(`${baseUrl}/styles.css`, { 'Accept-Encoding': 'gzip' });
    assert.equal(cssRes.statusCode, 200);
    assert.equal(cssRes.headers['content-encoding'], 'gzip');
    assert.ok(typeof cssRes.headers.etag === 'string' && cssRes.headers.etag.length > 0);
    const gunzippedCss = zlib.gunzipSync(cssRes.body);
    assert.ok(gunzippedCss.length > cssRes.body.length);
    assert.ok(gunzippedCss.toString('utf8').includes(':root'));

    const cssNotModified = await rawHttpGet(`${baseUrl}/styles.css`, {
      'If-None-Match': cssRes.headers.etag,
      'Accept-Encoding': 'gzip',
    });
    assert.equal(cssNotModified.statusCode, 304);
    assert.equal(cssNotModified.body.length, 0);

    const exportRes = await fetch(`${baseUrl}/api/logs/export?source=journald&format=jsonl`);
    assert.equal(exportRes.status, 200);
    assert.ok(exportRes.headers.get('content-disposition').includes('.jsonl'));

    const criticalSvc = snap.services.items.find((svc) => svc.risk === 'critical') || snap.services.items[0];
    const firstUnit = criticalSvc.unit;
    assert.equal(criticalSvc.risk, 'critical');
    const csrfBlocked = await fetch(`${baseUrl}/api/services/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
      body: JSON.stringify({ unit: firstUnit, action: 'restart' }),
    });
    assert.equal(csrfBlocked.status, 403);

    const unconfirmedRes = await fetch(`${baseUrl}/api/services/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: firstUnit, action: 'restart' }),
    });
    assert.equal(unconfirmedRes.status, 409);
    const unconfirmedBody = await unconfirmedRes.json();
    assert.equal(unconfirmedBody.ok, false);
    assert.equal(unconfirmedBody.requiresConfirm, true);

    const tokenRes = await fetch(`${baseUrl}/api/actions/confirm-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: firstUnit, action: 'restart' }),
    });
    assert.equal(tokenRes.status, 200);
    const tokenBody = await tokenRes.json();
    assert.equal(tokenBody.ok, true);
    assert.equal(tokenBody.unit, firstUnit);
    assert.equal(tokenBody.action, 'restart');
    assert.ok(typeof tokenBody.confirmToken === 'string' && tokenBody.confirmToken.length >= 16);

    const ctrlRes = await fetch(`${baseUrl}/api/services/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: firstUnit, action: 'restart', confirmToken: tokenBody.confirmToken }),
    });
    assert.equal(ctrlRes.status, 200);
    const ctrlBody = await ctrlRes.json();
    assert.equal(ctrlBody.ok, true);

    const replayRes = await fetch(`${baseUrl}/api/services/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: firstUnit, action: 'restart', confirmToken: tokenBody.confirmToken }),
    });
    assert.equal(replayRes.status, 409);
    const replayBody = await replayRes.json();
    assert.equal(replayBody.ok, false);
    assert.equal(replayBody.requiresConfirm, true);

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
