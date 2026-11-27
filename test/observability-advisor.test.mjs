import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  normalizeLogFingerprint,
  queryRemoteProbeLogs,
  scanDockerAdapter,
  scanFileAdapter,
  scanHttpJsonAdapter,
  scanJournaldAdapter,
  scrubSensitiveText,
  validateDockerContainerName,
  validateHttpJsonLogUrl,
} from '../src/log-adapters.mjs';
import { LogIndexer, utcDayFromMs } from '../src/log-indexer.mjs';
import { ObservabilityAdvisor } from '../src/observability-advisor.mjs';
import { DecisionAdvisor } from '../src/decision-advisor.mjs';
import { loadConfig, validateConfig } from '../src/config.mjs';
import { sanitizeProbeLogs, sanitizeProbePayload } from '../src/probes.mjs';
import { redactConfig, redactHeaders } from '../src/redact.mjs';
import { createOpsConsole } from '../src/server.mjs';
import { collectLocalLogTelemetry, startA2APeerServer } from '../probe/ops-probe.mjs';

const tempDirs = [];

async function makeTempDir(prefix) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function cleanupTempDirs() {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
}

test.after(async () => {
  await cleanupTempDirs();
});

test('log-adapters: fingerprint normalization collapses dynamic tokens and scrubs secrets/emails', () => {
  const fakeSecret = ['sk', 'proj', 'abcdefghijklmnopqrstuvwx'].join('-');
  const msgA = `2026-11-27T10:00:01Z ERROR req=abc12345 pid=4120 upstream 100.64.1.12:8080 failed for alice@example.com with token Bearer ${fakeSecret} in 420ms at /var/log/app/worker.log`;
  const msgB = `2026-11-27T10:05:19Z ERROR req=zzz99999 pid=9981 upstream 100.64.9.99:9090 failed for bob@example.com with token Bearer ${fakeSecret} in 915ms at /var/log/app/worker.log`;

  const scrubbed = scrubSensitiveText(msgA);
  assert.ok(!scrubbed.includes(fakeSecret), 'API key must be redacted');
  assert.ok(!scrubbed.includes('alice@example.com'), 'embedded email must be redacted');

  const unitPreserved = scrubSensitiveText('Failed unit ops-console@main.service on worker');
  assert.ok(unitPreserved.includes('ops-console@main.service'), 'systemd template unit should remain readable');

  const fpA = normalizeLogFingerprint(msgA);
  const fpB = normalizeLogFingerprint(msgB);
  assert.match(fpA.fingerprint, /^fp-[a-f0-9]{16}$/);
  assert.equal(fpA.fingerprint, fpB.fingerprint, 'equivalent error messages with different IDs/IPs/timings should share one fingerprint');
  assert.ok(!fpA.template.includes(fakeSecret));
});

test('log-adapters: docker container validation and http-json SSRF / metadata protection', () => {
  assert.equal(validateDockerContainerName('nginx-edge_1.0').ok, true);
  assert.equal(validateDockerContainerName('bad; rm -rf /').ok, false);
  assert.equal(validateDockerContainerName('$(whoami)').ok, false);
  assert.equal(validateDockerContainerName('../escape').ok, false);

  assert.equal(validateHttpJsonLogUrl('http://169.254.169.254/latest/meta-data/').ok, false);
  const alibabaMetaIp = [100, 100, 100, 200].join('.');
  assert.equal(validateHttpJsonLogUrl(`http://${alibabaMetaIp}/latest/meta-data/`).ok, false);
  assert.equal(validateHttpJsonLogUrl('http://metadata.google.internal/computeMetadata/v1/').ok, false);
  assert.equal(validateHttpJsonLogUrl('http://admin:secret@127.0.0.1:8080/logs').ok, false);
  assert.equal(validateHttpJsonLogUrl('http://127.0.0.1:8080/logs', { allowPrivate: false }).ok, false);
  assert.equal(
    validateHttpJsonLogUrl('http://127.0.0.1:8080/logs', { allowPrivate: true, allowlistedHosts: ['127.0.0.1'] }).ok,
    true,
  );
  assert.equal(
    validateHttpJsonLogUrl('http://127.0.0.1:8080/logs', { allowPrivate: true, allowlistedHosts: ['other.local'] }).ok,
    false,
  );
});

test('log-adapters: file adapter tracks inode/offset cursor incrementally and recovers from truncation', async () => {
  const dir = await makeTempDir('obs-file-adapter-');
  const logPath = path.join(dir, 'service.log');
  const fakeBearer = ['Bearer', 'tok_secret_value_1234567890'].join(' ');
  await fs.writeFile(
    logPath,
    [
      '2026-11-27T10:00:00Z INFO startup complete',
      `2026-11-27T10:00:02Z ERROR upstream timeout ${fakeBearer} HTTP/1.1 503`,
    ].join('\n') + '\n',
    'utf8',
  );

  const first = await scanFileAdapter({
    id: 'file:demo',
    name: 'Demo File',
    filePath: logPath,
    serviceId: 'demo-api',
    nodeId: 'local',
  });
  assert.equal(first.ok, true);
  assert.equal(first.entries.length, 2);
  assert.ok(first.nextCursor);
  assert.equal(first.entries[1].sourceRef.sourceKind, 'file');
  assert.equal(first.entries[1].isHttp5xx, true);
  assert.ok(!first.entries[1].message.includes('tok_secret_value_1234567890'));

  // No new data -> 0 entries
  const idle = await scanFileAdapter({
    id: 'file:demo',
    name: 'Demo File',
    filePath: logPath,
    serviceId: 'demo-api',
    cursor: first.nextCursor,
  });
  assert.equal(idle.ok, true);
  assert.equal(idle.entries.length, 0);

  // Append one new error line -> only new line read
  await fs.appendFile(logPath, '2026-11-27T10:01:00Z ERROR database connection refused\n', 'utf8');
  const delta = await scanFileAdapter({
    id: 'file:demo',
    name: 'Demo File',
    filePath: logPath,
    serviceId: 'demo-api',
    cursor: first.nextCursor,
  });
  assert.equal(delta.ok, true);
  assert.equal(delta.entries.length, 1);
  assert.match(delta.entries[0].message, /database connection refused/);

  // Truncate & write smaller file -> offset resets safely
  await fs.writeFile(logPath, '2026-11-27T10:02:00Z WARN rotated fresh file\n', 'utf8');
  const rotated = await scanFileAdapter({
    id: 'file:demo',
    name: 'Demo File',
    filePath: logPath,
    serviceId: 'demo-api',
    cursor: delta.nextCursor,
  });
  assert.equal(rotated.ok, true);
  assert.equal(rotated.entries.length, 1);
  assert.match(rotated.entries[0].message, /rotated fresh file/);
});

test('log-adapters: journald, docker, http-json, and remote probe adapters normalize entries safely', async () => {
  const seenCmds = [];
  const mockRunCmd = async (bin, args) => {
    seenCmds.push({ bin, args });
    if (bin === 'journalctl') {
      const line = JSON.stringify({
        __REALTIME_TIMESTAMP: String(Date.now() * 1000),
        __CURSOR: 's=abc;i=42',
        PRIORITY: '3',
        _SYSTEMD_UNIT: 'magpie.service',
        MESSAGE: 'Main process exited with code 1; scheduled restart job',
      });
      return { ok: true, stdout: `${line}\n`, stderr: '' };
    }
    if (bin === 'docker') {
      return {
        ok: true,
        stdout: '2026-11-27T10:00:05Z ERROR HTTP/1.1 502 Bad Gateway from upstream\n',
        stderr: '',
      };
    }
    return { ok: false, stdout: '', stderr: 'unexpected' };
  };

  const jRes = await scanJournaldAdapter({
    unit: 'magpie.service',
    serviceId: 'magpie',
    user: true,
    runCmdFn: mockRunCmd,
  });
  assert.equal(jRes.ok, true);
  assert.equal(jRes.nextCursor, 's=abc;i=42');
  assert.equal(jRes.entries.length, 1);
  assert.equal(jRes.entries[0].isRestart, true);
  assert.equal(jRes.entries[0].sourceRef.sourceKind, 'journald');
  assert.equal(seenCmds[0].bin, 'journalctl');

  const dRes = await scanDockerAdapter({
    id: 'docker:edge',
    container: 'edge-proxy',
    serviceId: 'edge-proxy',
    runCmdFn: mockRunCmd,
  });
  assert.equal(dRes.ok, true);
  assert.equal(dRes.entries.length, 1);
  assert.equal(dRes.entries[0].isHttp5xx, true);
  assert.equal(dRes.entries[0].sourceRef.sourceKind, 'docker');

  const hRes = await scanHttpJsonAdapter({
    id: 'http:gateway',
    url: 'http://127.0.0.1:3426/api/logs',
    allowPrivate: true,
    allowlistedHosts: ['127.0.0.1'],
    serviceId: 'gateway',
    fetchImpl: async (reqUrl, init) => {
      assert.equal(init.redirect, 'error');
      assert.ok(reqUrl.startsWith('http://127.0.0.1:3426/api/logs'));
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          entries: [
            { ts: '2026-11-27T10:00:10Z', level: 'error', message: 'Upstream status=503 retry exhausted' },
          ],
        }),
      };
    },
  });
  assert.equal(hRes.ok, true);
  assert.equal(hRes.entries.length, 1);
  assert.equal(hRes.entries[0].sourceRef.sourceKind, 'http-json');
  assert.equal(hRes.entries[0].isHttp5xx, true);

  const badRemote = await queryRemoteProbeLogs({ rpcUrl: '', nodeId: 'node-b' });
  assert.equal(badRemote.ok, false);

  let signedHeaders = null;
  const rRes = await queryRemoteProbeLogs({
    rpcUrl: 'http://100.64.0.2:4321/a2a',
    nodeId: 'node-b',
    sourceKind: 'journald',
    target: 'worker.service',
    sharedSecret: 'test-hmac-secret',
    fetchImpl: async (_u, init) => {
      signedHeaders = init.headers;
      const parsed = JSON.parse(init.body);
      assert.equal(parsed.method, 'logs/read');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          id: parsed.id,
          result: {
            entries: [
              { ts: '2026-11-27T10:00:20Z', level: 'err', unit: 'worker.service', message: 'Remote ECONNREFUSED' },
            ],
            truncated: false,
          },
        }),
      };
    },
  });
  assert.equal(rRes.ok, true);
  assert.equal(rRes.entries.length, 1);
  assert.equal(rRes.entries[0].sourceRef.sourceKind, 'remote');
  assert.ok(signedHeaders['X-A2A-Signature']?.startsWith('sha256='));
});

test('log-indexer: daily rotating SQLite shards, 0600 perms, remote telemetry merge, and retention/disk pruning', async () => {
  const dir = await makeTempDir('obs-indexer-');
  let nowMs = Date.parse('2026-11-27T12:00:00.000Z');
  const indexer = new LogIndexer({
    dataDir: dir,
    retentionDays: 7,
    maxDiskMb: 64,
    nowFn: () => nowMs,
  });
  const driver = await indexer.init();
  assert.equal(driver, 'sqlite-daily');

  // Seed 4 distinct days to verify daily sharding & retention pruning
  const dayOffsets = [4, 2, 1, 0];
  for (const d of dayOffsets) {
    const tsMs = nowMs - d * 24 * 60 * 60 * 1000;
    await indexer.ingestEntries([
      {
        tsMs,
        ts: new Date(tsMs).toISOString(),
        level: 'err',
        priority: 3,
        unit: 'api.service',
        serviceId: 'api',
        nodeId: 'local',
        message: `Connection refused to db-${d}`,
        fingerprint: `fp-day-${d}`,
        template: `Connection refused to db-${d}`,
        isRestart: d === 0,
        isHttp5xx: d === 0,
        sourceRef: { sourceKind: 'journald', sourceId: 'api.service', nodeId: 'local', ts: new Date(tsMs).toISOString(), cursor: null },
      },
    ]);
  }

  // Verify 0600 shard file permissions
  const todayShard = indexer.shardPathForDay(utcDayFromMs(nowMs));
  const stat = await fs.stat(todayShard);
  assert.equal(stat.mode & 0o777, 0o600);

  // Verify remote telemetry ingestion
  const remoteRes = await indexer.ingestRemoteTelemetry('node-edge-1', {
    collectedAt: new Date(nowMs).toISOString(),
    services: [{ serviceId: 'caddy', errorCount: 7, warnCount: 2, newFingerprintCount: 1, restartCount: 0, http5xxCount: 3, totalScanned: 40 }],
    fingerprints: [{ fingerprint: 'fp-remote-1', serviceId: 'caddy', sourceId: 'caddy.service', level: 'err', template: 'upstream 502', sampleRedacted: 'upstream 502', count: 7 }],
  });
  assert.equal(remoteRes.scanned, 40);
  assert.equal(remoteRes.newFingerprints.length, 1);

  // Verify deterministic metrics series + fingerprint query
  const series = await indexer.queryMetricsSeries({ range: '24h' });
  assert.equal(series.deterministic, true);
  assert.ok(series.points.length >= 1);
  assert.ok(series.totals.errorCount >= 8);
  assert.ok(series.totals.http5xxCount >= 4);

  const fps = await indexer.queryFingerprints({ range: '24h' });
  assert.ok(fps.some((f) => f.fingerprint === 'fp-remote-1' && f.sourceKind === 'remote'));

  const beforePrune = await indexer.getStorageStats();
  assert.equal(beforePrune.shardCount, 4);

  // Tighten retentionDays=3 and prune -> day offset 4 should be removed
  indexer.updateLimits({ retentionDays: 3 });
  const pruneRetention = await indexer.pruneShards({ nowMs });
  assert.ok(pruneRetention.removedShards.some((r) => r.reason === 'retention_days'));
  assert.equal(pruneRetention.shardCount, 3);

  // Prune by tiny disk cap -> oldest shards dropped until 1 shard remains
  const pruneCap = await indexer.pruneShards({ nowMs, maxDiskBytesOverride: 1024 });
  assert.ok(pruneCap.removedShards.some((r) => r.reason === 'disk_cap'));
  assert.equal(pruneCap.shardCount, 1);

  const stats = await indexer.getStorageStats();
  assert.equal(stats.shardCount, 1);
  assert.ok(stats.totalBytes > 0);

  await indexer.close();
});

test('observability-advisor: registers logs/telemetry domains, triages anomalies with LLM/fallback, and silent-skips nominal digests', async () => {
  const dir = await makeTempDir('obs-advisor-');
  const logPath = path.join(dir, 'app.log');
  await fs.writeFile(logPath, '', 'utf8');

  let nowMs = Date.parse('2026-11-27T12:00:00.000Z');
  let llmCalls = 0;
  let lastPromptBody = '';

  const mockFetch = async (_url, init) => {
    llmCalls += 1;
    const body = JSON.parse(init.body);
    lastPromptBody = body.messages?.[1]?.content || '';
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              severity: 'critical',
              summary: 'Detected upstream connection failure spike on api-svc',
              rootCauses: [{ category: 'upstream_failure', confidence: 0.9, evidence: 'ECONNREFUSED spike', explanation: 'Backend socket down' }],
              affectedScopes: ['local:api-svc'],
              chartAnnotation: { label: 'api-svc 上游断连', severity: 'critical', detail: '连续出现连接拒绝与 503' },
              suggestedActions: [{ title: 'Check backend listener', commandHint: 'ss -tlnp', risk: 'low', requiresApproval: false }],
              confidence: 0.9,
            }),
          },
        }],
        usage: { prompt_tokens: 180, completion_tokens: 90, total_tokens: 270 },
      }),
    };
  };

  const config = {
    console: { dataDir: dir },
    connectors: { magpie: { apiUrl: 'http://127.0.0.1:3426' } },
    logFiles: [{ id: 'app-log', name: 'App Log', serviceId: 'api-svc', path: logPath }],
    observability: {
      enabled: true,
      digestIntervalMinutes: 15,
      silentSkip: true,
      heartbeatDigestHours: 6,
    },
    cacheMonitor: { advisorEnabled: true, decisionModel: 'auto/deepseek-v4.1-flash' },
  };

  const indexer = new LogIndexer({ dataDir: dir, nowFn: () => nowMs });
  const advisor = new DecisionAdvisor({ config, dataDir: dir, fetchImpl: mockFetch, nowFn: () => nowMs });
  const obs = new ObservabilityAdvisor({
    config,
    indexer,
    advisor,
    dataDir: dir,
    nowFn: () => nowMs,
  });
  await obs.ensureLoaded();

  // Confirm shared DecisionAdvisor registered both PR 8 domains
  const domainIds = advisor.listDomains().map((d) => d.id);
  assert.ok(domainIds.includes('logs'));
  assert.ok(domainIds.includes('telemetry'));

  // 1) Nominal periodic digest -> SILENT SKIP (0 LLM calls, 0 tokens!)
  const nominalDigest = await obs.runPeriodicDigest();
  assert.equal(nominalDigest.ok, true);
  assert.equal(nominalDigest.skipped, true);
  assert.equal(nominalDigest.skipReason, 'silent_skip_nominal');
  assert.equal(nominalDigest.annotation.mode, 'silent_skip');
  assert.equal(llmCalls, 0);

  // 2) Append error + restart lines -> fast scan detects anomalies -> flush triage calls LLM
  await fs.writeFile(
    logPath,
    [
      '2026-11-27T12:00:05Z ERROR ECONNREFUSED upstream 100.64.2.10:8080 HTTP/1.1 503',
      '2026-11-27T12:00:06Z ERROR Main process exited with code 1; scheduled restart job',
    ].join('\n') + '\n',
    'utf8',
  );

  const scan = await obs.runFastScan({ skipTriageSchedule: true });
  assert.equal(scan.ok, true);
  assert.ok(scan.anomalies.length >= 1);
  obs._pendingAnomalies.push(...scan.anomalies);

  const triage = await obs.flushPendingTriage({ force: true });
  assert.equal(triage.ok, true);
  assert.equal(llmCalls, 1);
  assert.ok(lastPromptBody.includes('<untrusted_telemetry_data>'), 'prompt must fence untrusted log data');
  const firstDiag = triage.diagnoses[0]?.diagnosis;
  assert.equal(firstDiag.mode, 'llm');
  // ZERO WRITE rule: even if LLM returned requiresApproval: false, advisor MUST force true
  assert.ok(firstDiag.suggestedActions.every((a) => a.requiresApproval === true));

  // 3) Drift present -> periodic digest invokes LLM and records tokensUsed > 0
  nowMs += 60_000;
  const driftDigest = await obs.runPeriodicDigest();
  assert.equal(driftDigest.ok, true);
  assert.equal(driftDigest.skipped, false);
  assert.equal(llmCalls, 2);

  const status = await obs.getStatus();
  assert.equal(status.ok, true);
  assert.ok(status.advisor && Array.isArray(status.advisor.domains), 'getStatus must await advisor.getStatus()');
  assert.equal(status.recentDigests[0].tokensUsed, 270);
  assert.equal(status.cadence.silentSkipCount, 1);

  // 4) Update config & verify readAdapterLogs rejects unconfigured path
  const updated = await obs.updateConfig({ digestIntervalMinutes: 5, advisorEnabled: false });
  assert.equal(updated.digestIntervalMinutes, 5);
  assert.equal(updated.advisorEnabled, false);

  const allowedRead = await obs.readAdapterLogs({ sourceKind: 'file', target: 'api-svc' });
  assert.equal(allowedRead.ok, true);
  assert.equal(allowedRead.entries.length, 2);

  const deniedRead = await obs.readAdapterLogs({ sourceKind: 'file', target: '/etc/passwd' });
  assert.equal(deniedRead.ok, false);

  // 5) With advisor disabled, manual triage falls back deterministically (0 LLM calls)
  const fallbackRes = await obs.triggerManual({ mode: 'triage', force: true, serviceId: 'api-svc' });
  assert.equal(fallbackRes.ok, true);
  assert.equal(fallbackRes.diagnosis.mode, 'deterministic');
  assert.equal(llmCalls, 2);

  obs.stop();
  await indexer.close();
});

test('server HTTP API: /api/observability/* routes work end-to-end and enforce readOnly 403', async () => {
  const dir = await makeTempDir('obs-server-');
  const logPath = path.join(dir, 'service.log');
  await fs.writeFile(logPath, '2026-11-27T12:10:00Z ERROR synthetic failure status=502\n', 'utf8');

  const baseCfg = loadConfig({ env: {}, cli: { demo: false, host: '127.0.0.1' } });
  const app = createOpsConsole({
    disableBackgroundTimers: true,
    config: {
      ...baseCfg,
      demo: false,
      console: {
        ...baseCfg.console,
        host: '127.0.0.1',
        port: 0,
        dataDir: dir,
        readOnly: false,
        auth: { ...baseCfg.console.auth, enabled: false },
      },
      services: [],
      logFiles: [{ id: 'srv-log', name: 'Service Log', serviceId: 'srv-api', path: logPath }],
      cacheMonitor: { ...baseCfg.cacheMonitor, advisorEnabled: false },
      observability: { enabled: true, digestIntervalMinutes: 15, silentSkip: true, adapters: [] },
    },
  });
  await app.start();
  const baseUrl = app.addresses[0].url;

  try {
    // Scan -> populates rollup + fingerprint
    const scanResp = await fetch(`${baseUrl}/api/observability/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(scanResp.status, 200);
    const scanJson = await scanResp.json();
    assert.equal(scanJson.ok, true);
    assert.ok(scanJson.scanned >= 1);

    // Status
    const statusResp = await fetch(`${baseUrl}/api/observability/status`);
    assert.equal(statusResp.status, 200);
    const statusJson = await statusResp.json();
    assert.equal(statusJson.ok, true);
    assert.ok(statusJson.advisor.domains.some((d) => d.id === 'cache'));
    assert.ok(statusJson.advisor.domains.some((d) => d.id === 'logs'));
    assert.ok(statusJson.advisor.domains.some((d) => d.id === 'telemetry'));

    // Metrics / Fingerprints / Adapters / Logs Read
    const metricsJson = await (await fetch(`${baseUrl}/api/observability/metrics?range=6h`)).json();
    assert.equal(metricsJson.ok, true);
    assert.equal(metricsJson.deterministic, true);

    const fpJson = await (await fetch(`${baseUrl}/api/observability/fingerprints?range=24h`)).json();
    assert.equal(fpJson.ok, true);
    assert.ok(fpJson.items.length >= 1);

    const adaptersJson = await (await fetch(`${baseUrl}/api/observability/adapters`)).json();
    assert.equal(adaptersJson.ok, true);
    assert.ok(adaptersJson.adapters.some((a) => a.serviceId === 'srv-api'));

    const readJson = await (await fetch(`${baseUrl}/api/observability/logs/read?sourceKind=file&target=srv-api`)).json();
    assert.equal(readJson.ok, true);
    assert.equal(readJson.entries.length, 1);

    // Analyze & Annotations
    const analyzeJson = await (await fetch(`${baseUrl}/api/observability/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'triage', force: true, serviceId: 'srv-api' }),
    })).json();
    assert.equal(analyzeJson.ok, true);
    assert.ok(analyzeJson.annotation);

    const annJson = await (await fetch(`${baseUrl}/api/observability/annotations?range=24h`)).json();
    assert.equal(annJson.ok, true);
    assert.ok(annJson.items.length >= 1);

    // Config update & Prune
    const cfgJson = await (await fetch(`${baseUrl}/api/observability/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digestIntervalMinutes: 30, fastScanSec: 20 }),
    })).json();
    assert.equal(cfgJson.ok, true);
    assert.equal(cfgJson.config.digestIntervalMinutes, 30);
    assert.equal(cfgJson.config.fastScanSec, 20);

    const pruneJson = await (await fetch(`${baseUrl}/api/observability/prune`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })).json();
    assert.equal(pruneJson.ok, true);
    assert.ok(pruneJson.storage);
  } finally {
    await app.stop();
  }

  // Read-only mode -> 403 on all mutations/triggers
  const roDir = await makeTempDir('obs-server-ro-');
  const roBase = loadConfig({ env: {}, cli: { demo: false, host: '127.0.0.1' } });
  const roApp = createOpsConsole({
    disableBackgroundTimers: true,
    config: {
      ...roBase,
      demo: false,
      console: {
        ...roBase.console,
        host: '127.0.0.1',
        port: 0,
        dataDir: roDir,
        readOnly: true,
        auth: { ...roBase.console.auth, enabled: false },
      },
      services: [],
    },
  });
  await roApp.start();
  const roUrl = roApp.addresses[0].url;
  try {
    assert.equal((await fetch(`${roUrl}/api/observability/status`)).status, 200);
    assert.equal(
      (await fetch(`${roUrl}/api/observability/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status,
      403,
    );
    assert.equal(
      (await fetch(`${roUrl}/api/observability/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status,
      403,
    );
    assert.equal(
      (await fetch(`${roUrl}/api/observability/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status,
      403,
    );
    assert.equal(
      (await fetch(`${roUrl}/api/observability/prune`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status,
      403,
    );
  } finally {
    await roApp.stop();
  }
});

test('probe: collectLocalLogTelemetry aggregates journald + file counts, dedupes fingerprints, and scrubs secrets', async () => {
  const dir = await makeTempDir('obs-probe-telemetry-');
  const logPath = path.join(dir, 'worker.log');
  const fakeSecret = ['sk', 'probe', 'secretvalue1234567890'].join('-');
  await fs.writeFile(
    logPath,
    [
      `2026-11-27T12:00:01Z ERROR upstream 100.64.0.9:8080 HTTP/1.1 503 for user@example.com key=${fakeSecret}`,
      '2026-11-27T12:00:02Z WARN retrying upstream connection',
      '2026-11-27T12:00:03Z ERROR Main process exited with code 1 restarting service',
    ].join('\n') + '\n',
    'utf8',
  );

  const journalLine = JSON.stringify({
    __REALTIME_TIMESTAMP: String(Date.parse('2026-11-27T12:00:05.000Z') * 1000),
    PRIORITY: '3',
    _SYSTEMD_UNIT: 'edge-api.service',
    MESSAGE: `Upstream failed HTTP/1.1 502 with token Bearer ${fakeSecret}`,
  });
  const seenFingerprints = new Set();
  const runExecFile = async (bin) => {
    assert.equal(bin, 'journalctl');
    return { ok: true, stdout: `${journalLine}\n`, stderr: '' };
  };

  const cfg = {
    collectLogs: true,
    watchServices: ['edge-api.service'],
    logFiles: [{ id: 'worker-file', name: 'Worker Log', serviceId: 'worker-svc', path: logPath }],
  };

  const first = await collectLocalLogTelemetry(cfg, {
    platform: 'linux',
    runExecFile,
    seenFingerprints,
    nowFn: () => Date.parse('2026-11-27T12:01:00.000Z'),
  });
  assert.ok(first);
  assert.equal(first.windowMinutes, 5);
  const workerSvc = first.services.find((s) => s.serviceId === 'worker-svc');
  const edgeSvc = first.services.find((s) => s.serviceId === 'edge-api.service');
  assert.ok(workerSvc);
  assert.equal(workerSvc.errorCount, 2);
  assert.equal(workerSvc.warnCount, 1);
  assert.equal(workerSvc.http5xxCount, 1);
  assert.equal(workerSvc.restartCount, 1);
  assert.equal(workerSvc.newFingerprintCount, 2);
  assert.ok(edgeSvc);
  assert.equal(edgeSvc.errorCount, 1);
  assert.equal(edgeSvc.http5xxCount, 1);
  assert.ok(first.fingerprints.length >= 2);
  assert.ok(!JSON.stringify(first).includes(fakeSecret), 'probe log telemetry must redact secrets');
  assert.ok(!JSON.stringify(first).includes('user@example.com'), 'probe log telemetry must redact emails');

  // Second pass with shared seenFingerprints should report 0 newFingerprintCount
  const second = await collectLocalLogTelemetry(cfg, {
    platform: 'linux',
    runExecFile,
    seenFingerprints,
    nowFn: () => Date.parse('2026-11-27T12:02:00.000Z'),
  });
  assert.equal(second.services.find((s) => s.serviceId === 'worker-svc').newFingerprintCount, 0);
});

test('probe A2A RPC logs/read enforces allowlists, validates inputs, and redacts returned lines', async () => {
  const dir = await makeTempDir('obs-probe-rpc-');
  const allowedPath = path.join(dir, 'allowed.log');
  const forbiddenPath = path.join(dir, 'secret.log');
  const fakeSecret = ['sk', 'rpc', 'abcdefghijklmnopqrstuv'].join('-');
  await fs.writeFile(
    allowedPath,
    `2026-11-27T12:05:00Z ERROR failed auth Bearer ${fakeSecret} for admin@example.com\n2026-11-27T12:05:01Z INFO healthy\n`,
    'utf8',
  );
  await fs.writeFile(forbiddenPath, 'TOP SECRET SHOULD NOT BE READ\n', 'utf8');

  const sharedSecret = 'probe-rpc-test-secret-0123456789';
  const peer = await startA2APeerServer(
    {
      nodeId: 'edge-rpc-test',
      watchServices: ['demo-edge.service'],
      logFiles: [{ id: 'allowed-file', name: 'Allowed', serviceId: 'svc-allowed', path: allowedPath }],
      a2a: {
        enabled: true,
        host: '127.0.0.1',
        port: 0,
        sharedSecret,
      },
    },
    {
      runExecFile: async (bin, args) => {
        if (bin === 'journalctl') {
          return {
            ok: true,
            stdout: `${JSON.stringify({
              __REALTIME_TIMESTAMP: String(Date.parse('2026-11-27T12:05:10.000Z') * 1000),
              PRIORITY: '3',
              _SYSTEMD_UNIT: 'demo-edge.service',
              MESSAGE: `journal error token=${fakeSecret}`,
            })}\n`,
            stderr: '',
          };
        }
        if (bin === 'docker') {
          assert.equal(args[0], 'logs');
          return {
            ok: true,
            stdout: '2026-11-27T12:05:12Z ERROR container upstream 502\n',
            stderr: '',
          };
        }
        return { ok: false, stdout: '', stderr: 'unexpected binary' };
      },
    },
  );

  try {
    // 1. Declared file succeeds end-to-end via Hub queryRemoteProbeLogs (HMAC-SHA256) & redacts secrets/emails
    const fileRes = await queryRemoteProbeLogs({
      rpcUrl: peer.rpcUrl,
      nodeId: 'edge-rpc-test',
      sourceKind: 'file',
      target: 'allowed-file',
      since: '15m',
      level: 'err',
      limit: 50,
      sharedSecret,
    });
    assert.equal(fileRes.ok, true, fileRes.error);
    assert.equal(fileRes.entries.length, 1);
    assert.ok(!fileRes.entries[0].message.includes(fakeSecret));
    assert.ok(!fileRes.entries[0].message.includes('admin@example.com'));

    // 2. Wrong secret is rejected with 401
    const badAuth = await queryRemoteProbeLogs({
      rpcUrl: peer.rpcUrl,
      nodeId: 'edge-rpc-test',
      sourceKind: 'file',
      target: 'allowed-file',
      sharedSecret: 'wrong-secret',
    });
    assert.equal(badAuth.ok, false);

    // 3. Undeclared file path, invalid since, invalid sourceKind, and invalid docker target are rejected
    const badFile = await queryRemoteProbeLogs({
      rpcUrl: peer.rpcUrl,
      nodeId: 'edge-rpc-test',
      sourceKind: 'file',
      target: forbiddenPath,
      since: '15m',
      sharedSecret,
    });
    assert.equal(badFile.ok, false);

    const badSince = await queryRemoteProbeLogs({
      rpcUrl: peer.rpcUrl,
      nodeId: 'edge-rpc-test',
      sourceKind: 'file',
      target: 'allowed-file',
      since: '99d',
      sharedSecret,
    });
    assert.equal(badSince.ok, false);

    const badKind = await queryRemoteProbeLogs({
      rpcUrl: peer.rpcUrl,
      nodeId: 'edge-rpc-test',
      sourceKind: 'shell',
      target: 'demo-edge.service',
      sharedSecret,
    });
    assert.equal(badKind.ok, false);

    // 4. journald & docker allowlisted reads succeed
    const jRes = await queryRemoteProbeLogs({
      rpcUrl: peer.rpcUrl,
      nodeId: 'edge-rpc-test',
      sourceKind: 'journald',
      target: 'demo-edge.service',
      since: '15m',
      sharedSecret,
    });
    assert.equal(jRes.ok, true, jRes.error);
    assert.equal(jRes.entries.length, 1);
    assert.ok(!jRes.entries[0].message.includes(fakeSecret));

    const dRes = await queryRemoteProbeLogs({
      rpcUrl: peer.rpcUrl,
      nodeId: 'edge-rpc-test',
      sourceKind: 'docker',
      target: 'edge-proxy',
      since: '15m',
      sharedSecret,
    });
    assert.equal(dRes.ok, true, dRes.error);
    assert.equal(dRes.entries.length, 1);

    const badDocker = await queryRemoteProbeLogs({
      rpcUrl: peer.rpcUrl,
      nodeId: 'edge-rpc-test',
      sourceKind: 'docker',
      target: 'bad;id',
      since: '15m',
      sharedSecret,
    });
    assert.equal(badDocker.ok, false);
  } finally {
    await peer.close();
  }
});

test('probes, config validation, and redact helpers enforce observability schema and secret redaction', () => {
  const fakeTok = ['sk', 'cfg', '1234567890abcdefghijkl'].join('-');
  const sanitizedLogs = sanitizeProbeLogs({
    collectedAt: '2026-11-27T12:00:00Z',
    windowMinutes: 5,
    services: [{ serviceId: 'edge-api', errorCount: 9, warnCount: 2, http5xxCount: 3, totalScanned: 40 }],
    fingerprints: [
      {
        fingerprint: 'fp-1234567890abcdef',
        serviceId: 'edge-api',
        level: 'error',
        template: `Fail for bob@example.com token=${fakeTok}`,
        sampleRedacted: `Bearer ${fakeTok} alice@example.com`,
        count: 9,
      },
    ],
  });
  assert.ok(sanitizedLogs);
  assert.equal(sanitizedLogs.fingerprints[0].level, 'err');
  assert.ok(!sanitizedLogs.fingerprints[0].template.includes(fakeTok));
  assert.ok(!sanitizedLogs.fingerprints[0].template.includes('bob@example.com'));
  assert.ok(!sanitizedLogs.fingerprints[0].sampleRedacted.includes('alice@example.com'));

  const payload = sanitizeProbePayload({ nodeId: 'node-alpha', logs: sanitizedLogs }, 'node-alpha');
  assert.ok(payload.logs);
  assert.equal(payload.logs.services.length, 1);

  // Valid observability config passes
  const validCfg = loadConfig({ env: {}, cli: { demo: false, host: '127.0.0.1' } });
  assert.equal(validCfg.observability.digestIntervalMinutes, 15);
  assert.equal(validCfg.observability.retentionDays, 7);

  const validCheck = validateConfig({
    ...validCfg,
    observability: {
      enabled: true,
      retentionDays: 14,
      maxDiskMb: 512,
      fastScanSec: 20,
      triageDebounceSec: 30,
      triageEnabled: true,
      digestIntervalMinutes: 30,
      silentSkip: true,
      heartbeatDigestHours: 6,
      adapters: [
        { id: 'docker-api', kind: 'docker', container: 'api-edge_1' },
        { id: 'json-hook', kind: 'http-json', url: 'https://logs.example.com/v1/entries', headers: { Authorization: `Bearer ${fakeTok}` } },
      ],
    },
  });
  assert.equal(validCheck.valid, true, validCheck.errors.join('; '));

  // Invalid observability config fields are rejected
  const invalidCheck = validateConfig({
    ...validCfg,
    observability: {
      retentionDays: 120,
      maxDiskMb: 4,
      digestIntervalMinutes: 12,
      adapters: [
        { id: 'dup', kind: 'docker', container: 'bad;rm -rf /' },
        { id: 'dup', kind: 'http-json', url: 'http://169.254.169.254/latest/meta-data/' },
        { id: 'cred-url', kind: 'http-json', url: 'https://user:pass@example.com/entries' },
      ],
    },
  });
  assert.equal(invalidCheck.valid, false);
  assert.ok(invalidCheck.errors.some((e) => e.includes('retentionDays')));
  assert.ok(invalidCheck.errors.some((e) => e.includes('maxDiskMb')));
  assert.ok(invalidCheck.errors.some((e) => e.includes('digestIntervalMinutes')));
  assert.ok(invalidCheck.errors.some((e) => e.includes('docker container')));
  assert.ok(invalidCheck.errors.some((e) => e.includes('Duplicate observability adapter id')));
  assert.ok(invalidCheck.errors.some((e) => e.includes('http-json url')));

  // redactHeaders & redactConfig mask sensitive adapter headers
  const maskedHeaders = redactHeaders({
    Authorization: `Bearer ${fakeTok}`,
    'X-API-Key': 'super-secret-key',
    Accept: 'application/json',
  });
  assert.equal(maskedHeaders.Authorization, '[REDACTED]');
  assert.equal(maskedHeaders['X-API-Key'], '[REDACTED]');
  assert.equal(maskedHeaders.Accept, 'application/json');

  const maskedCfg = redactConfig({
    observability: {
      adapters: [
        { id: 'json-1', kind: 'http-json', url: 'https://logs.example.com/feed', headers: { Authorization: `Bearer ${fakeTok}`, Accept: 'application/json' } },
      ],
    },
  });
  assert.equal(maskedCfg.observability.adapters[0].headers.Authorization, '[REDACTED]');
  assert.equal(maskedCfg.observability.adapters[0].headers.Accept, 'application/json');
});
