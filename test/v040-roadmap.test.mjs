import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  AlertEngine,
  compareThreshold,
  computeSlaSummary,
  extractMetricValue,
  validateWebhookUrl,
} from '../src/alerts.mjs';
import { loadConfig } from '../src/config.mjs';
import { ProbeRegistry } from '../src/probes.mjs';
import { RunbookEngine } from '../src/runbooks.mjs';
import { createOpsConsole } from '../src/server.mjs';
import { TelemetryStore } from '../src/store.mjs';

async function startTestServer(overrides = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-console-v040-'));
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

test('validateWebhookUrl enforces HTTPS and blocks SSRF loopback/private/metadata targets', () => {
  assert.equal(validateWebhookUrl('https://hooks.example.com/ops-alerts').valid, true);
  assert.equal(validateWebhookUrl('').valid, true);
  assert.equal(validateWebhookUrl('http://hooks.example.com/ops-alerts').valid, false);
  assert.equal(validateWebhookUrl('https://127.0.0.1/hook').valid, false);
  assert.equal(validateWebhookUrl('https://localhost:8443/hook').valid, false);
  assert.equal(validateWebhookUrl('https://169.254.169.254/latest/meta-data').valid, false);
  assert.equal(validateWebhookUrl('https://10.0.0.1/internal').valid, false);
  assert.equal(validateWebhookUrl('https://192.168.1.50/hook').valid, false);
  assert.equal(validateWebhookUrl('not-a-url').valid, false);
});

test('AlertEngine evaluates metrics, manages silence/ack/CRUD, and calculates 30d SLA', () => {
  const engine = new AlertEngine();
  assert.equal(compareThreshold(92, 'gte', 85), true);
  assert.equal(compareThreshold(80, 'gte', 85), false);
  assert.equal(compareThreshold(1, 'gt', 0), true);
  assert.equal(compareThreshold(4, 'lt', 5), true);
  assert.equal(compareThreshold(2, 'eq', 2), true);

  const sampleSnapshot = {
    host: {
      load1: 1.45,
      memory: { usedPercent: 91 },
      disks: [{ mount: '/', usePercent: 63 }],
    },
    magpie: { latencyMs: 120 },
    services: {
      items: [
        { id: 'svc-a', name: 'Service A', layer: 'core', status: 'healthy' },
        { id: 'svc-b', name: 'Service B', layer: 'memory', status: 'failed' },
      ],
    },
    memory: {
      nmem: { enabled: true, reachable: true },
      rerank: { enabled: true, reachable: false },
    },
    fleet: {
      nodes: [
        { id: 'n1', status: 'healthy', network: { rttMs: 32 } },
        { id: 'n2', status: 'offline', network: { rttMs: 140 } },
      ],
    },
  };

  assert.equal(extractMetricValue('host.memory.usedPercent', sampleSnapshot), 91);
  assert.equal(extractMetricValue('services.failedCount', sampleSnapshot), 1);
  assert.equal(extractMetricValue('memory.offlineEngines', sampleSnapshot), 1);
  assert.equal(extractMetricValue('fleet.offlineCount', sampleSnapshot), 1);

  const fired = engine.evaluateSnapshot(sampleSnapshot);
  assert.ok(fired.length >= 2);
  const firstAlert = fired[0];
  const acked = engine.ackAlert(firstAlert.id, 'sre-test');
  assert.equal(acked.status, 'acked');
  assert.equal(acked.ackedBy, 'sre-test');

  const rule = engine.createRule({
    name: 'Disk 80% Alert',
    metric: 'host.disk.maxPercent',
    operator: 'gte',
    threshold: 80,
    severity: 'warning',
    channel: 'webhook',
  });
  assert.ok(rule.id);
  const toggled = engine.updateRule(rule.id, { enabled: false });
  assert.equal(toggled.enabled, false);
  assert.equal(engine.deleteRule(rule.id).id, rule.id);

  const sil = engine.setSilence(15);
  assert.equal(sil.silenced, true);
  assert.ok(sil.silenceUntil);
  assert.equal(engine.setSilence(0).silenced, false);

  const sla = computeSlaSummary({
    services: sampleSnapshot.services.items,
    incidents: [
      { id: 1, entityKey: 'svc-b', toState: 'failed', ts: new Date().toISOString() },
    ],
  });
  assert.equal(sla.windowDays, 30);
  assert.ok(sla.overallUptimePct <= 100 && sla.overallUptimePct > 90);
  assert.equal(sla.services.length, 2);
});

test('RunbookEngine executes steps, enforces read-only guard, and trips hourly circuit breaker', async () => {
  const engine = new RunbookEngine({
    config: { console: { readOnly: false }, demo: true, security: {} },
    connectors: {
      collectSnapshot: async () => ({
        magpie: { reachable: true, latencyMs: 18, totalModels: 42 },
        services: {
          items: [
            { id: 'rerank', name: 'Rerank Gateway', status: 'healthy', probe: { latencyMs: 14 } },
          ],
        },
        memory: {
          rerank: { reachable: true, latencyMs: 14 },
          nmem: { enabled: true, reachable: true },
          openviking: { enabled: true, reachable: true },
        },
      }),
      runMemoryDoctor: async () => ({ ok: true }),
    },
    actions: {
      controlService: async (unit, action) => ({ ok: true, message: `${action} ${unit}` }),
    },
    logs: {
      query: async () => ({ items: [{ level: 'info', message: 'ok' }] }),
    },
    logger: {
      appendAudit: async () => ({ ok: true }),
    },
  });

  const list = engine.list();
  assert.ok(list.runbooks.length >= 3);

  const res1 = await engine.execute('rb-rerank-recovery', { actor: 'test' });
  assert.equal(res1.ok, true);
  assert.equal(res1.run.steps.length, 4);

  const res2 = await engine.execute('rb-rerank-recovery', { actor: 'test' });
  assert.equal(res2.ok, true);

  // 3rd run within 1h hits maxAutoRunsPerHour = 2 circuit breaker
  await assert.rejects(
    () => engine.execute('rb-rerank-recovery', { actor: 'test' }),
    (err) => err.statusCode === 429,
  );

  const roEngine = new RunbookEngine({
    config: { console: { readOnly: true }, demo: true },
  });
  await assert.rejects(
    () => roEngine.execute('rb-rerank-recovery', { actor: 'test' }),
    (err) => err.statusCode === 403,
  );
});

test('TelemetryStore querySeries and updateIncidentNote persist and query cleanly', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-store-v040-'));
  const store = new TelemetryStore({ dataDir, rawRetentionDays: 7 });
  await store.init();
  try {
    const now = Date.now();
    store.recordSample('fleet', {
      ts: now - 120_000,
      cpuPct: 24,
      memPct: 52,
      diskPct: 40,
      load1: 0.9,
      rttMs: 18,
    });
    store.recordSample('fleet', {
      ts: now - 60_000,
      cpuPct: 31,
      memPct: 55,
      diskPct: 41,
      load1: 1.2,
      rttMs: 22,
    });

    const rawSeries = store.querySeries({ series: 'fleet', range: '1h' });
    assert.equal(rawSeries.source, 'raw');
    assert.equal(rawSeries.points.length, 2);
    assert.equal(rawSeries.points[1].cpuPct, 31);

    // Seed initial healthy state, then transition to degraded to record an incident
    store.recordStateTransition({
      entityKey: 'rerank.service',
      node: 'Rerank Gateway',
      kind: 'service',
      toState: 'healthy',
    });
    const inc = store.recordStateTransition({
      entityKey: 'rerank.service',
      node: 'Rerank Gateway',
      kind: 'service',
      toState: 'degraded',
      detail: 'High inference latency',
    });
    assert.ok(inc && inc.id);

    const updated = store.updateIncidentNote(inc.id, 'Root cause: cold model reload');
    assert.equal(updated.id, inc.id);
    assert.equal(updated.note, 'Root cause: cold model reload');

    const recent = store.listIncidents({ limit: 10 });
    const match = recent.find((item) => item.id === inc.id);
    assert.equal(match?.note, 'Root cause: cold model reload');
  } finally {
    await store.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('ProbeRegistry pull-only command queue enforces allowlist and drains on ingest', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-probe-cmd-'));
  try {
    const config = loadConfig({
      cli: { demo: false },
      env: { OPS_CONSOLE_DATA_DIR: dataDir },
    });
    const reg = new ProbeRegistry({ config });

    const queued = reg.enqueueCommand('tokyo-edge', 'health-check', 'sre');
    assert.equal(queued.status, 'queued');
    assert.equal(reg.listCommands('tokyo-edge').length, 1);

    assert.throws(
      () => reg.enqueueCommand('tokyo-edge', 'rm -rf /', 'sre'),
      (err) => err.statusCode === 400,
    );

    const drained = reg.drainPendingCommands('tokyo-edge');
    assert.equal(drained.length, 1);
    assert.equal(drained[0].command, 'health-check');
    assert.equal(reg.drainPendingCommands('tokyo-edge').length, 0);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('HTTP APIs cover Phase 0-4 endpoints, confirmToken handshake, SSRF rejection, and SSE stream', async () => {
  const { baseUrl, cleanup } = await startTestServer();
  try {
    // 1. Historical multi-range metrics & Prometheus exporter
    const m24 = await fetch(`${baseUrl}/api/metrics/series?series=fleet&range=24h`);
    assert.equal(m24.status, 200);
    const m24Json = await m24.json();
    assert.equal(m24Json.ok, true);
    assert.ok(m24Json.points.length >= 20);

    const promRes = await fetch(`${baseUrl}/api/metrics`);
    assert.equal(promRes.status, 200);
    const promBody = await promRes.text();
    assert.ok(promBody.includes('ops_console_host_memory_used_percent'));
    assert.ok(promBody.includes('ops_console_services_healthy'));

    // 2. Alerts CRUD + SSRF rejection + Silence + Ack
    const alertsRes = await fetch(`${baseUrl}/api/alerts`);
    assert.equal(alertsRes.status, 200);
    const alertsJson = await alertsRes.json();
    assert.equal(alertsJson.ok, true);
    assert.ok(Array.isArray(alertsJson.rules));
    assert.ok(alertsJson.sla.windowDays === 30);

    const ssrfRes = await fetch(`${baseUrl}/api/alerts/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad SSRF Webhook',
        metric: 'host.memory.usedPercent',
        operator: 'gte',
        threshold: 80,
        severity: 'warning',
        channel: 'webhook',
        channelTarget: 'http://169.254.169.254/latest/meta-data',
      }),
    });
    assert.equal(ssrfRes.status, 400);

    const goodRuleRes = await fetch(`${baseUrl}/api/alerts/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Memory Guard 88',
        metric: 'host.memory.usedPercent',
        operator: 'gte',
        threshold: 88,
        severity: 'warning',
        channel: 'webhook',
      }),
    });
    assert.equal(goodRuleRes.status, 201);

    // 3. Gateway Telemetry & Cross-Engine Memory Compare
    const gwRes = await fetch(`${baseUrl}/api/gateway/telemetry`);
    assert.equal(gwRes.status, 200);
    const gwJson = await gwRes.json();
    assert.equal(gwJson.ok, true);
    assert.ok(gwJson.hourly.length >= 12);
    assert.ok(gwJson.providers.length >= 2);

    const cmpRes = await fetch(`${baseUrl}/api/memory/compare?q=gateway`);
    assert.equal(cmpRes.status, 200);
    const cmpJson = await cmpRes.json();
    assert.equal(cmpJson.ok, true);
    assert.ok(cmpJson.items.length >= 1);

    // 4. Runbooks list + execution
    const rbRes = await fetch(`${baseUrl}/api/runbooks`);
    assert.equal(rbRes.status, 200);
    const rbJson = await rbRes.json();
    assert.ok(rbJson.runbooks.length >= 3);

    const rbRunRes = await fetch(`${baseUrl}/api/runbooks/rb-rerank-recovery/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(rbRunRes.status, 200);
    const rbRunJson = await rbRunRes.json();
    assert.equal(rbRunJson.run.ok, true);

    // 5. Probe pull-only command queue
    const cmdPost = await fetch(`${baseUrl}/api/probes/node-tokyo/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'health-check' }),
    });
    assert.equal(cmdPost.status, 201);
    const cmdGet = await fetch(`${baseUrl}/api/probes/node-tokyo/commands`);
    const cmdGetJson = await cmdGet.json();
    assert.equal(cmdGetJson.items.length, 1);

    // 6. Config Studio & Validation
    const studioRes = await fetch(`${baseUrl}/api/config/studio`);
    assert.equal(studioRes.status, 200);
    const studioJson = await studioRes.json();
    assert.ok(studioJson.config.rbacPosture);

    const validDraft = structuredClone(studioJson.config);
    validDraft.console.port = 3000;
    const valOk = await fetch(`${baseUrl}/api/config/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawJson: JSON.stringify(validDraft) }),
    });
    const valOkJson = await valOk.json();
    assert.equal(valOkJson.valid, true);

    const valBad = await fetch(`${baseUrl}/api/config/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawJson: '{"console":{"port":99999}}' }),
    });
    const valBadJson = await valBad.json();
    assert.equal(valBadJson.valid, false);

    // 7. Critical service confirmToken handshake
    const snapRes = await fetch(`${baseUrl}/api/snapshot`);
    const snapJson = await snapRes.json();
    const critSvc = (snapJson.services?.items || []).find((s) => s.risk === 'critical');
    assert.ok(critSvc, 'Demo snapshot must include a critical service');

    const noTokenRes = await fetch(`${baseUrl}/api/services/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: critSvc.id, unit: critSvc.unit, action: 'restart' }),
    });
    assert.equal(noTokenRes.status, 409);

    const tokRes = await fetch(`${baseUrl}/api/actions/confirm-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: critSvc.unit, action: 'restart' }),
    });
    assert.equal(tokRes.status, 200);
    const tokJson = await tokRes.json();
    assert.ok(tokJson.confirmToken);

    const withTokenRes = await fetch(`${baseUrl}/api/services/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: critSvc.id,
        unit: critSvc.unit,
        action: 'restart',
        confirmToken: tokJson.confirmToken,
      }),
    });
    assert.equal(withTokenRes.status, 200);

    // 8. Real-time SSE events stream handshake
    const sseHeader = await new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}/api/events/stream`, (res) => {
        const ct = res.headers['content-type'] || '';
        res.destroy();
        resolve({ status: res.statusCode, contentType: ct });
      });
      req.on('error', reject);
    });
    assert.equal(sseHeader.status, 200);
    assert.ok(sseHeader.contentType.includes('text/event-stream'));
  } finally {
    await cleanup();
  }
});
