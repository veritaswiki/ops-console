import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { SingleFlightCache } from '../src/cache.mjs';
import { SlidingWindowRateLimiter } from '../src/security.mjs';
import { validateHttpUrl } from '../src/plugins/sdk.mjs';
import { ProbeRegistry } from '../src/probes.mjs';
import { createOpsConsole } from '../src/server.mjs';
import { loadConfig } from '../src/config.mjs';

test('SingleFlightCache enforces bounded LRU maxEntries and records eviction metrics', async () => {
  const cache = new SingleFlightCache({ maxEntries: 8 });
  for (let i = 0; i < 8; i++) {
    await cache.getOrLoad(`k${i}`, 60_000, async () => i);
  }
  // Touch k0 so k1 becomes LRU
  const hit0 = await cache.getOrLoad('k0', 60_000, async () => 999);
  assert.equal(hit0, 0);

  await cache.getOrLoad('k8', 60_000, async () => 8);
  const st = cache.stats();
  assert.equal(st.cachedKeys, 8);
  assert.equal(st.hits, 1);
  assert.equal(st.misses, 9);
  assert.equal(st.evictions, 1);
  assert.equal(cache.entries.has('k1'), false);
  assert.equal(cache.entries.has('k0'), true);
});

test('SlidingWindowRateLimiter enforces O(1) window expiry and maxBuckets LRU cap', async () => {
  const limiter = new SlidingWindowRateLimiter({
    windowMs: 50,
    maxRequests: 2,
    maxBuckets: 64,
  });

  assert.equal(limiter.allow('ip-1').allowed, true);
  assert.equal(limiter.allow('ip-1').allowed, true);
  assert.equal(limiter.allow('ip-1').allowed, false);
  // After window expires, requests are allowed again
  await new Promise((r) => setTimeout(r, 65));
  assert.equal(limiter.allow('ip-1').allowed, true);

  // Flood unique keys beyond maxBuckets
  for (let i = 0; i < 90; i++) {
    limiter.allow(`flood-${i}`);
  }
  assert.ok(limiter.buckets.size <= 64, `expected <= 64 buckets, got ${limiter.buckets.size}`);
});

test('validateHttpUrl rejects cloud metadata SSRF endpoints while allowing local & HTTPS endpoints', () => {
  assert.equal(validateHttpUrl('http://127.0.0.1:8080/health').ok, true);
  assert.equal(validateHttpUrl('https://api.example.com/v1').ok, true);
  assert.equal(validateHttpUrl('http://169.254.169.254/latest/meta-data/').ok, false);
  assert.equal(validateHttpUrl('http://metadata.google.internal/computeMetadata/v1/').ok, false);
  assert.equal(validateHttpUrl('http://metadata.goog/').ok, false);
  assert.equal(validateHttpUrl('http://169.254.10.20/').ok, false);
  assert.equal(validateHttpUrl('ftp://example.com').ok, false);
});

test('ProbeRegistry.enroll provides snippets alias and buildFleetView matches peers in O(1)', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-hardening-probes-'));
  try {
    const config = loadConfig({
      cli: { hosts: '127.0.0.1', port: 4320, demo: false },
      env: { OPS_CONSOLE_DATA_DIR: tmpDir },
    });
    const reg = new ProbeRegistry({ config });

    const enrolled = await reg.enroll({
      id: 'edge-osaka-01',
      name: 'Osaka Edge',
      deviceType: 'server',
      region: 'Osaka, JP',
      lat: 34.6937,
      lon: 135.5023,
    });
    assert.ok(enrolled.token);
    assert.ok(enrolled.snippets?.linux);
    assert.ok(enrolled.snippets?.macos);
    assert.ok(enrolled.snippets?.curl);
    assert.equal(enrolled.snippets.linux, enrolled.installHints.linuxSystemd);

    await reg.flush();
    const fleet = reg.buildFleetView({
      snapshot: {
        host: { hostname: 'hub-main', platform: 'linux', arch: 'x64', memory: { usedPct: 42 } },
        tailscale: {
          self: { name: 'hub-main', ip: '100.64.0.1', online: true },
          devices: [
            {
              id: 'ts-osaka',
              name: 'edge-osaka-01',
              dnsName: 'edge-osaka-01.tailnet.ts.net',
              ip: '100.64.0.22',
              online: true,
              direct: true,
              os: 'linux',
            },
          ],
        },
      },
    });
    const matched = fleet.nodes.find((n) => n.id === 'edge-osaka-01');
    assert.ok(matched);
    assert.equal(matched.tailscaleIp, '100.64.0.22');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('HTTP server normalizes source=service logs, guards readOnly checkin/runbooks, and serves immutable assets', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-hardening-srv-'));
  const config = loadConfig({
    cli: {
      hosts: '127.0.0.1',
      port: 4320,
      demo: true,
      readOnly: true,
    },
    env: { OPS_CONSOLE_DATA_DIR: tmpDir },
  });
  config.console.port = 0;
  const srv = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await srv.start();
  const base = addresses[0].url;

  try {
    // Frontend logs query uses source=service&target=<unit>
    const logsRes = await fetch(`${base}/api/logs?source=service&target=magpie.service&lines=20`);
    assert.equal(logsRes.status, 200);
    const logsBody = await logsRes.json();
    assert.equal(logsBody.ok, true);
    assert.ok(Array.isArray(logsBody.entries));
    assert.ok(logsBody.entries.length > 0);

    // Read-only guard blocks mobile checkin and runbook execution
    const checkinRes = await fetch(`${base}/api/probes/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: 'mobile-test', name: 'Test Phone', lat: 35.6, lon: 139.6 }),
    });
    assert.equal(checkinRes.status, 403);

    const runbookRes = await fetch(`${base}/api/runbooks/gateway-recovery/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(runbookRes.status, 403);

    // Hashed JS asset receives immutable cache header
    const indexHtml = await (await fetch(`${base}/`)).text();
    const assetMatch = indexHtml.match(/\/assets\/app-[^"']+\.js/);
    assert.ok(assetMatch, 'index.html should reference hashed app bundle');
    const assetRes = await fetch(`${base}${assetMatch[0]}`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    assert.equal(assetRes.status, 200);
    assert.match(assetRes.headers.get('cache-control') || '', /immutable/);
  } finally {
    await srv.stop();
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
