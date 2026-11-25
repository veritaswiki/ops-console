import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ActionController } from '../src/actions.mjs';
import { loadConfig, resolveSecretRef, validateConfig } from '../src/config.mjs';
import { createDemoProvider } from '../src/connectors/demo.mjs';
import {
  classifyBindAddress,
  evaluatePortExposure,
  parseIptablesSave,
  parseListeningSockets,
} from '../src/connectors/firewall.mjs';
import { StructuredLogger } from '../src/logger.mjs';
import { ProbeRegistry } from '../src/probes.mjs';
import { maskClientIp, redactCommand, redactLogEntry, redactText } from '../src/redact.mjs';
import { TelemetryStore } from '../src/store.mjs';
import { TimeSeriesStore } from '../src/timeseries.mjs';

const DAY_MS = 86_400_000;

test('redactText, redactCommand, redactLogEntry, and StructuredLogger scrub sensitive values', async () => {
  const bearerSecret = ['test', 'bearer', 'token0123456789'].join('-');
  const apiSecret = ['sk', 'proj', 'exampleKey0123456789abcd'].join('-');
  const ghSecret = ['ghp', 'exampleToken0123456789ab'].join('_');
  const tsSecret = ['tskey', 'auth', 'example0123456789'].join('-');
  const probeSecret = ['ops', 'prb', '0123456789abcdef0123456789abcdef'].join('_');
  const hexSecret = 'a1b2c3d4'.repeat(6);
  const pemHeader = ['-----BEGIN', 'RSA PRIVATE KEY-----'].join(' ');
  const pemFooter = ['-----END', 'RSA PRIVATE KEY-----'].join(' ');
  const pemBlock = `${pemHeader}\nMIIEexampleSyntheticBodyLine\n${pemFooter}`;

  assert.equal(redactText(null), '');
  assert.equal(redactText(undefined), '');
  assert.equal(redactText(`Bearer ${bearerSecret}`), 'Bearer [REDACTED]');
  assert.equal(redactText(`key=${apiSecret}`), 'key=[REDACTED_API_KEY]');
  assert.equal(redactText(`pat=${ghSecret}`), 'pat=[REDACTED_GH_TOKEN]');
  assert.equal(redactText(`ts=${tsSecret}`), 'ts=[REDACTED_TS_KEY]');
  assert.equal(
    redactText('https://node.example.ts.net/?k=test-web-key-999&view=services'),
    'https://node.example.ts.net/?k=[REDACTED]&view=services',
  );

  const headersSample = [
    'Cookie: ops_console_session=test-cookie-value-123',
    'X-Api-Key: test-api-header-value',
    'X-Auth-Token: test-auth-header-value',
    `X-Ops-Key: ${hexSecret}`,
    `X-Probe-Token: ${probeSecret}`,
  ].join('\n');
  const scrubbedHeaders = redactText(headersSample);
  assert.ok(scrubbedHeaders.includes('Cookie: [REDACTED]'));
  assert.ok(scrubbedHeaders.includes('X-Api-Key: [REDACTED]'));
  assert.ok(scrubbedHeaders.includes('X-Auth-Token: [REDACTED]'));
  assert.ok(scrubbedHeaders.includes('X-Ops-Key: [REDACTED_HEX]'));
  assert.ok(scrubbedHeaders.includes('X-Probe-Token: [REDACTED_PROBE_TOKEN]'));
  assert.ok(!scrubbedHeaders.includes('test-cookie-value-123'));
  assert.ok(!scrubbedHeaders.includes(hexSecret));
  assert.ok(!scrubbedHeaders.includes(probeSecret));

  const scrubbedPem = redactText(`loaded ${pemBlock} ok`);
  assert.equal(scrubbedPem, 'loaded [REDACTED_PRIVATE_KEY] ok');
  assert.ok(!scrubbedPem.includes('MIIEexampleSyntheticBodyLine'));

  const scrubbedFlags = redactText('tool --password=test-pass-1 --web-key "test-key-2" --token=\'test-tok-3\'');
  assert.ok(!scrubbedFlags.includes('test-pass-1'));
  assert.ok(!scrubbedFlags.includes('test-key-2'));
  assert.ok(!scrubbedFlags.includes('test-tok-3'));
  assert.equal(scrubbedFlags.match(/\[REDACTED\]/g)?.length, 3);

  const longCmd = `node bin/ops-console.mjs --password=super-secret-value ${'a'.repeat(180)}`;
  const scrubbedCmd = redactCommand(longCmd, 64);
  assert.ok(scrubbedCmd.length <= 64);
  assert.ok(!scrubbedCmd.includes('super-secret-value'));
  assert.ok(scrubbedCmd.includes('--password=[REDACTED]'));

  const rawEntry = {
    unit: 'ops-console',
    message: `token=${apiSecret}`,
    output: `Cookie: session=abc123456789`,
    error: `Authorization: Bearer ${bearerSecret}`,
  };
  const scrubbedEntry = redactLogEntry(rawEntry);
  assert.notEqual(scrubbedEntry, rawEntry);
  assert.ok(rawEntry.message.includes(apiSecret));
  assert.equal(scrubbedEntry.message, 'token=[REDACTED_API_KEY]');
  assert.equal(scrubbedEntry.output, 'Cookie: [REDACTED]');
  assert.equal(scrubbedEntry.error, 'Authorization: [REDACTED]');
  assert.equal(redactLogEntry(null), null);

  const logger = new StructuredLogger({ silentStdout: true });
  const logged = logger.warn(`auth failed for Bearer ${bearerSecret}`, {
    error: `key=${apiSecret}`,
    output: `X-Probe-Token: ${probeSecret}`,
  });
  assert.ok(!logged.message.includes(bearerSecret));
  assert.ok(!logged.error.includes(apiSecret));
  assert.ok(!logged.output.includes(probeSecret));
  const auditRec = await logger.appendAudit({
    category: 'service',
    action: 'restart',
    target: 'demo.service',
    ok: true,
    output: `failed with ${tsSecret}`,
  });
  assert.ok(!auditRec.output.includes(tsSecret));
  assert.ok(auditRec.output.includes('[REDACTED_TS_KEY]'));
});

test('maskClientIp masks IPv4 and IPv6 addresses while preserving loopback and expose mode', () => {
  assert.equal(maskClientIp(''), '');
  assert.equal(maskClientIp(null), '');
  assert.equal(maskClientIp('127.0.0.1'), '127.0.0.1');
  assert.equal(maskClientIp('::ffff:127.0.0.1'), '127.0.0.1');
  assert.equal(maskClientIp('::1'), '::1');

  const maskedTailnet = maskClientIp('100.64.0.10');
  assert.match(maskedTailnet, /^100\.64\.x\.x#[0-9a-f]{6}$/);
  assert.equal(maskedTailnet, maskClientIp('::ffff:100.64.0.10'));

  const maskedPublic = maskClientIp('203.0.113.42');
  assert.match(maskedPublic, /^203\.0\.x\.x#[0-9a-f]{6}$/);
  assert.ok(!maskedPublic.includes('113'));
  assert.ok(!maskedPublic.includes('42'));
  assert.notEqual(
    maskClientIp('203.0.113.42', { salt: 'salt-a' }),
    maskClientIp('203.0.113.42', { salt: 'salt-b' }),
  );

  const maskedV6 = maskClientIp('fd7a:115c:a1e0::10');
  assert.match(maskedV6, /^ip#[0-9a-f]{12}$/);
  assert.ok(!maskedV6.includes('fd7a'));

  assert.equal(maskClientIp('::ffff:100.64.0.10', { expose: true }), '100.64.0.10');
  assert.equal(maskClientIp('2001:db8::42', { expose: true }), '2001:db8::42');
});

test('TelemetryStore sqlite driver persists samples, hydrates series, tracks incidents, prunes, and sets 0600 permissions', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-store-sqlite-'));
  let store;
  let reopened;
  try {
    const now = Date.now();
    store = new TelemetryStore({
      dataDir,
      driver: 'sqlite',
      rawRetentionDays: 2,
      incidentRetentionDays: 7,
    });
    const activeDriver = await store.init();
    assert.equal(activeDriver, 'sqlite');

    if (process.platform !== 'win32') {
      const dbStat = await fs.stat(path.join(dataDir, 'ops-console.db'));
      assert.equal(dbStat.mode & 0o777, 0o600);
    }

    store.recordSample('node:hub-primary', { ts: now - 120_000, cpuPct: 18.5, memPct: 41.2, diskPct: 33, load1: 0.4, rttMs: 4 });
    store.recordSample('node:hub-primary', { ts: now - 60_000, cpuPct: 24.0, memPct: 43.0, diskPct: 33, load1: 0.6, rttMs: 5 });
    store.recordSample('fleet', { ts: now - 30_000, avgCpuPct: 22.1, avgMemPct: 45.0, onlineNodes: 3, totalNodes: 4, servicesOkPct: 100 });
    store.recordSample('node:hub-primary', { ts: now - 5 * DAY_MS, cpuPct: 99, memPct: 90 });

    assert.equal(store.recordStateTransition({ entityKey: 'service:magpie', node: 'Magpie', kind: 'service', toState: 'healthy' }), null);
    assert.equal(store.recordStateTransition({ entityKey: 'service:magpie', node: 'Magpie', kind: 'service', toState: 'healthy' }), null);
    const inc1 = store.recordStateTransition({
      entityKey: 'service:magpie',
      node: 'Magpie',
      kind: 'service',
      toState: 'degraded',
      detail: 'Health probe timeout',
    });
    assert.equal(inc1.fromState, 'healthy');
    assert.equal(inc1.toState, 'degraded');
    assert.equal(inc1.resolvedAt, null);

    assert.equal(store.recordStateTransition({ entityKey: 'node:edge-01', node: 'Edge 01', kind: 'node', toState: 'healthy' }), null);
    const inc2 = store.recordStateTransition({
      entityKey: 'node:edge-01',
      node: 'Edge 01',
      kind: 'node',
      toState: 'offline',
      detail: 'Probe missed heartbeat',
    });
    assert.equal(inc2.resolvedAt, null);
    assert.equal(store.listIncidents({ openOnly: true }).length, 2);

    const recovery = store.recordStateTransition({
      entityKey: 'service:magpie',
      node: 'Magpie',
      kind: 'service',
      toState: 'healthy',
      detail: 'Probe healthy',
    });
    assert.ok(recovery.resolvedAt);
    assert.equal(store.listIncidents({ openOnly: true }).length, 1);
    assert.equal(store.listIncidents({ limit: 10 }).length, 3);

    const statsBeforePrune = await store.getStats();
    assert.equal(statsBeforePrune.driver, 'sqlite');
    assert.ok(statsBeforePrune.bytes > 0);
    assert.equal(statsBeforePrune.samples, 4);
    assert.equal(statsBeforePrune.openIncidents, 1);

    await store.prune(now);
    const statsAfterPrune = await store.getStats();
    assert.equal(statsAfterPrune.samples, 3);

    await store.close();
    assert.equal(store.recordStateTransition({ entityKey: 'node:edge-01', node: 'Edge 01', kind: 'node', toState: 'healthy' }), null);

    reopened = new TelemetryStore({
      dataDir,
      driver: 'sqlite',
      rawRetentionDays: 2,
      incidentRetentionDays: 7,
    });
    assert.equal(await reopened.init(), 'sqlite');

    const series = new TimeSeriesStore({ maxPoints: 30, minIntervalMs: 0 });
    const loaded = await reopened.hydrateTimeSeries(series, { limitPerSeries: 20, windowMs: 3_600_000 });
    assert.equal(loaded, 3);
    const hubPts = series.get('node:hub-primary');
    assert.equal(hubPts.length, 2);
    assert.equal(hubPts[0].cpuPct, 18.5);
    assert.equal(hubPts[1].cpuPct, 24.0);
    assert.equal(series.get('fleet')[0].onlineNodes, 3);

    const edgeRecovery = reopened.recordStateTransition({
      entityKey: 'node:edge-01',
      node: 'Edge 01',
      kind: 'node',
      toState: 'healthy',
      detail: 'Probe back online',
    });
    assert.equal(edgeRecovery.fromState, 'offline');
    assert.equal(edgeRecovery.toState, 'healthy');
    assert.equal((await reopened.getStats()).openIncidents, 0);

    await reopened.prune(now + 30 * DAY_MS);
    assert.equal(reopened.listIncidents({ limit: 10 }).length, 0);
  } finally {
    if (store) await store.close();
    if (reopened) await reopened.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('TelemetryStore jsonl fallback persists samples, hydrates series, prunes old files, and sets 0600 permissions', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-store-jsonl-'));
  let store;
  let reopened;
  try {
    const now = Date.now();
    const oldTs = now - 5 * DAY_MS;
    const todayDayKey = new Date(now).toISOString().slice(0, 10);
    const oldDayKey = new Date(oldTs).toISOString().slice(0, 10);

    store = new TelemetryStore({
      dataDir,
      driver: 'jsonl',
      rawRetentionDays: 2,
    });
    assert.equal(await store.init(), 'jsonl');

    store.recordSample('node:hub-primary', { ts: now - 40_000, cpuPct: 12.5, memPct: 36.0 });
    store.recordSample('node:hub-primary', { ts: now - 10_000, cpuPct: 15.0, memPct: 37.5 });
    store.recordSample('node:hub-primary', { ts: oldTs, cpuPct: 88, memPct: 77 });

    store.recordStateTransition({ entityKey: 'service:nmem', node: 'Nowledge Mem', kind: 'service', toState: 'healthy' });
    store.recordStateTransition({ entityKey: 'service:nmem', node: 'Nowledge Mem', kind: 'service', toState: 'degraded', detail: 'High latency' });
    store.recordStateTransition({ entityKey: 'service:nmem', node: 'Nowledge Mem', kind: 'service', toState: 'healthy', detail: 'Recovered' });
    store.recordStateTransition({ entityKey: 'node:laptop-01', node: 'Laptop 01', kind: 'node', toState: 'healthy' });
    store.recordStateTransition({ entityKey: 'node:laptop-01', node: 'Laptop 01', kind: 'node', toState: 'offline', detail: 'Sleep' });
    await store.flush();

    const todayMetricFile = path.join(dataDir, 'metrics', `${todayDayKey}.jsonl`);
    const oldMetricFile = path.join(dataDir, 'metrics', `${oldDayKey}.jsonl`);
    const incidentsFile = path.join(dataDir, 'incidents.jsonl');

    if (process.platform !== 'win32') {
      assert.equal((await fs.stat(todayMetricFile)).mode & 0o777, 0o600);
      assert.equal((await fs.stat(incidentsFile)).mode & 0o777, 0o600);
    }
    await fs.access(oldMetricFile);

    assert.equal(store.listIncidents({ openOnly: true }).length, 1);
    assert.equal(store.listIncidents({ limit: 10 }).length, 3);
    const stats = await store.getStats();
    assert.equal(stats.driver, 'jsonl');
    assert.equal(stats.openIncidents, 1);

    await store.prune(now);
    const remainingFiles = await fs.readdir(path.join(dataDir, 'metrics'));
    assert.ok(remainingFiles.includes(`${todayDayKey}.jsonl`));
    assert.ok(!remainingFiles.includes(`${oldDayKey}.jsonl`));

    await store.close();

    reopened = new TelemetryStore({ dataDir, driver: 'jsonl', rawRetentionDays: 2 });
    assert.equal(await reopened.init(), 'jsonl');
    const series = new TimeSeriesStore({ maxPoints: 30, minIntervalMs: 0 });
    const loaded = await reopened.hydrateTimeSeries(series, { limitPerSeries: 20, windowMs: 3_600_000 });
    assert.equal(loaded, 2);
    assert.equal(series.get('node:hub-primary')[0].cpuPct, 12.5);
    assert.equal(series.get('node:hub-primary')[1].cpuPct, 15.0);
    assert.equal(reopened.listIncidents({ limit: 10 }).length, 3);
    assert.equal(reopened.listIncidents({ openOnly: true }).length, 1);
  } finally {
    if (store) await store.close();
    if (reopened) await reopened.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('firewall parsers classify bind addresses, parse iptables/ss outputs, and evaluate port exposure', () => {
  assert.equal(classifyBindAddress('127.0.0.1'), 'loopback');
  assert.equal(classifyBindAddress('127.0.0.53'), 'loopback');
  assert.equal(classifyBindAddress('::1'), 'loopback');
  assert.equal(classifyBindAddress('100.64.0.10'), 'tailnet');
  assert.equal(classifyBindAddress('fd7a:115c:a1e0::10%tailscale0'), 'tailnet');
  assert.equal(classifyBindAddress('0.0.0.0'), 'public-wildcard');
  assert.equal(classifyBindAddress('*'), 'public-wildcard');
  assert.equal(classifyBindAddress('::'), 'public-wildcard');
  assert.equal(classifyBindAddress('192.168.1.25'), 'lan');
  assert.equal(classifyBindAddress('10.0.0.5'), 'lan');
  assert.equal(classifyBindAddress('172.16.4.8'), 'lan');
  assert.equal(classifyBindAddress('203.0.113.9'), 'other');

  const iptablesFixture = [
    '# Generated test ruleset',
    '*filter',
    ':INPUT ACCEPT [100:6400]',
    ':CUSTOM_CHAIN - [0:0]',
    '[50:3200] -A INPUT -i tailscale0 -p tcp --dport 4320 -j ACCEPT -m comment --comment "allow tailnet"',
    '[15:900] -A INPUT ! -i tailscale0 -p tcp --dports 3426,3773 -s 198.51.100.0/24 -j DROP -m comment --comment block_public',
    '[5:300] -A INPUT -p tcp --dport 9090 -j REJECT',
    'COMMIT',
  ].join('\n');

  const parsedRules = parseIptablesSave(iptablesFixture, 'ipv4');
  assert.equal(parsedRules.family, 'ipv4');
  assert.deepEqual(parsedRules.policies['filter:INPUT'], {
    table: 'filter',
    chain: 'INPUT',
    policy: 'ACCEPT',
    packets: 100,
    bytes: 6400,
  });
  assert.equal(parsedRules.policies['filter:CUSTOM_CHAIN'], undefined);
  assert.equal(parsedRules.rules.length, 3);
  assert.equal(parsedRules.rules[0].comment, 'allow tailnet');
  assert.equal(parsedRules.rules[1].inIface, '!tailscale0');
  assert.equal(parsedRules.rules[1].dport, '3426,3773');
  assert.equal(parsedRules.rules[1].source, '198.51.100.0/24');
  assert.equal(parsedRules.rules[1].target, 'DROP');
  assert.equal(parsedRules.rules[1].comment, 'block_public');

  const ssFixture = [
    'LISTEN 0 4096 127.0.0.1:4320 0.0.0.0:* users:(("node",pid=1001,fd=18))',
    'LISTEN 0 128 [::1]:1933 [::]:* users:(("openviking",pid=1002,fd=12))',
    'LISTEN 0 128 100.64.0.10:3430 0.0.0.0:* users:(("magpie",pid=1003,fd=11))',
    'LISTEN 0 128 0.0.0.0:3773 0.0.0.0:* users:(("orchestrator",pid=1004,fd=9))',
    'LISTEN 0 128 0.0.0.0:3773 0.0.0.0:* users:(("orchestrator",pid=1004,fd=9))',
    'LISTEN 0 128 [::]:8080 [::]:* users:(("nginx",pid=1005,fd=7))',
  ].join('\n');

  const sockets = parseListeningSockets(ssFixture, 'tcp');
  assert.equal(sockets.length, 6);
  assert.equal(sockets[0].process, 'node');
  assert.equal(sockets[0].pid, 1001);
  assert.equal(sockets[1].scope, 'loopback');
  assert.equal(sockets[2].scope, 'tailnet');

  const exposure = evaluatePortExposure(sockets, parsedRules.rules);
  assert.equal(exposure.items.length, 5);
  const byPort = new Map(exposure.items.map((item) => [item.port, item]));
  assert.equal(byPort.get(1933).posture, 'loopback');
  assert.equal(byPort.get(4320).posture, 'loopback');
  assert.equal(byPort.get(3430).posture, 'tailnet');
  assert.equal(byPort.get(3773).posture, 'tailnet-guarded');
  assert.equal(byPort.get(3773).guarded, true);
  assert.equal(byPort.get(8080).posture, 'public');
  assert.equal(byPort.get(8080).guarded, false);

  assert.deepEqual(exposure.summary, {
    totalListeners: 5,
    loopback: 2,
    tailnet: 2,
    publicUnfiltered: 1,
    guardedPorts: [3426, 3773, 9090],
    droppedPackets: 20,
  });
});

test('config secret indirection, OPS_CONSOLE_WEB_KEY_FILE permissions, and service allowedActions/dependsOn', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-config-v030-'));
  try {
    assert.equal(
      resolveSecretRef('env://OPS_TEST_SECRET', { env: { OPS_TEST_SECRET: '  test-env-secret-123  ' } }),
      'test-env-secret-123',
    );
    assert.equal(resolveSecretRef('env://OPS_UNSET_SECRET', { env: {} }), '');
    assert.throws(() => resolveSecretRef('env://invalid-var-name!'), /Invalid env:\/\//);
    assert.throws(() => resolveSecretRef('file://'), /Empty file:\/\//);

    const warnings = [];
    assert.equal(
      resolveSecretRef('literal-config-secret-1234', { warnings, fieldName: 'auth.webKey', fromConfig: true }),
      'literal-config-secret-1234',
    );
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].includes('auth.webKey'));

    const keyFile = path.join(tmpDir, 'web-key.secret');
    const exampleKey = 'example-web-key-0123456789';
    await fs.writeFile(keyFile, `${exampleKey}\n`, { mode: 0o600 });
    await fs.chmod(keyFile, 0o600);

    assert.equal(resolveSecretRef(`file://${keyFile}`, { fieldName: 'auth.webKey' }), exampleKey);

    const cfgFromFile = loadConfig({
      rawConfig: {
        services: [
          { id: 'db', unit: 'db.service', scope: 'system' },
          { id: 'app', unit: 'app.service', scope: 'user', allowedActions: ['reload', 'restart'], dependsOn: ['db'] },
        ],
      },
      env: { OPS_CONSOLE_WEB_KEY_FILE: keyFile },
    });
    assert.equal(cfgFromFile.auth.webKey, exampleKey);
    assert.deepEqual(cfgFromFile.services[0].allowedActions, null);
    assert.deepEqual(cfgFromFile.services[0].dependsOn, []);
    assert.deepEqual(cfgFromFile.services[1].allowedActions, ['reload', 'restart']);
    assert.deepEqual(cfgFromFile.services[1].dependsOn, ['db']);

    if (process.platform !== 'win32') {
      await fs.chmod(keyFile, 0o644);
      assert.throws(
        () => resolveSecretRef(`file://${keyFile}`, { fieldName: 'auth.webKey' }),
        /unsafe permissions \(644\)/,
      );
      assert.throws(
        () => loadConfig({ rawConfig: {}, env: { OPS_CONSOLE_WEB_KEY_FILE: keyFile } }),
        /unsafe permissions \(644\)/,
      );
    }

    const invalidActions = validateConfig({
      services: [
        { id: 'svc1', unit: 'svc1.service', allowedActions: ['restart', 'kill'], dependsOn: 'not-an-array' },
      ],
    });
    assert.equal(invalidActions.valid, false);
    assert.ok(invalidActions.errors.some((e) => e.includes('Invalid allowedActions')));
    assert.ok(invalidActions.errors.some((e) => e.includes('Invalid dependsOn')));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('ActionController enforces allowedActions and single-use expiring confirmTokens', async () => {
  const logger = new StructuredLogger({ silentStdout: true });

  const restrictedCfg = loadConfig({
    rawConfig: {
      console: { readOnly: false },
      services: [
        { id: 'gw', unit: 'gw.service', scope: 'user', risk: 'standard', allowedActions: ['reload'] },
        { id: 'locked', unit: 'locked.service', scope: 'user', risk: 'standard', allowedActions: [] },
      ],
    },
    env: {},
  });
  const restrictedActions = new ActionController({ config: restrictedCfg, logger, cache: null });
  await assert.rejects(
    () => restrictedActions.controlService('gw', 'stop'),
    (err) => err.statusCode === 403 && /not permitted/.test(err.message),
  );
  await assert.rejects(
    () => restrictedActions.controlService('gw', 'restart'),
    (err) => err.statusCode === 403 && /not permitted/.test(err.message),
  );
  await assert.rejects(
    () => restrictedActions.controlService('locked', 'reload'),
    (err) => err.statusCode === 403 && /not permitted/.test(err.message),
  );

  const demoCfg = loadConfig({
    cli: { demo: true, readOnly: false },
    env: {},
  });
  const demoProvider = createDemoProvider();
  const demoActions = new ActionController({ config: demoCfg, logger, cache: null, demoProvider });

  await assert.rejects(
    () => demoActions.controlService('orchestrator.service', 'restart'),
    (err) => err.statusCode === 409 && err.requiresConfirm === true,
  );

  const issued = demoActions.issueConfirmToken('orchestrator.service', 'restart');
  assert.equal(issued.ok, true);
  assert.equal(issued.unit, 'orchestrator.service');
  assert.equal(issued.action, 'restart');
  assert.equal(issued.expiresInSec, 30);

  await assert.rejects(
    () => demoActions.controlService('orchestrator.service', 'stop', { confirmToken: issued.confirmToken }),
    (err) => err.statusCode === 409 && err.requiresConfirm === true,
  );
  await assert.rejects(
    () => demoActions.controlService('magpie.service', 'restart', { confirmToken: issued.confirmToken }),
    (err) => err.statusCode === 409 && err.requiresConfirm === true,
  );

  const okRes = await demoActions.controlService('orchestrator.service', 'restart', {
    confirmToken: issued.confirmToken,
    ip: '100.64.0.10',
  });
  assert.equal(okRes.ok, true);
  assert.match(okRes.audit.ip, /^100\.64\.x\.x#[0-9a-f]{6}$/);

  await assert.rejects(
    () => demoActions.controlService('orchestrator.service', 'restart', { confirmToken: issued.confirmToken }),
    (err) => err.statusCode === 409 && err.requiresConfirm === true,
  );

  const realNow = Date.now;
  const baseTime = realNow();
  try {
    Date.now = () => baseTime;
    const expiring = demoActions.issueConfirmToken('orchestrator.service', 'stop');
    Date.now = () => baseTime + 31_000;
    await assert.rejects(
      () => demoActions.controlService('orchestrator.service', 'stop', { confirmToken: expiring.confirmToken }),
      (err) => err.statusCode === 409 && err.requiresConfirm === true,
    );
    assert.equal(demoActions.confirmTokens.size, 0);
  } finally {
    Date.now = realNow;
  }
});

test('ProbeRegistry debounces state persistence with flush(), enforces maxProbes cap, and masks sourceIp', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-probes-v030-'));
  let registry;
  try {
    const logger = new StructuredLogger({ silentStdout: true });
    const config = loadConfig({
      rawConfig: {
        fleet: { maxProbes: 8 },
        security: { exposeClientIps: false },
      },
      env: { OPS_CONSOLE_DATA_DIR: dataDir },
    });
    const timeseries = new TimeSeriesStore({ maxPoints: 30, minIntervalMs: 0 });
    registry = new ProbeRegistry({ config, logger, timeseries });

    await registry.enroll({ id: 'node-01', name: 'Node 01', deviceType: 'server' });
    await registry.enroll({ id: 'node-02', name: 'Node 02', deviceType: 'server' });

    await registry.ingest({
      nodeId: 'node-01',
      payload: { nodeId: 'node-01', cpu: { cores: 4, usagePct: 14.2, load1: 0.3 } },
      sourceIp: '100.64.0.42',
    });
    await registry.ingest({
      nodeId: 'node-01',
      payload: { nodeId: 'node-01', cpu: { cores: 4, usagePct: 28.6, load1: 0.7 } },
      sourceIp: '100.64.0.42',
    });
    await registry.ingest({
      nodeId: 'node-02',
      payload: { nodeId: 'node-02', cpu: { cores: 2, usagePct: 9.0, load1: 0.1 } },
      sourceIp: '127.0.0.1',
    });

    assert.equal(registry._persistDirty, true);
    await registry.flush();
    assert.equal(registry._persistDirty, false);
    assert.equal(registry._persistTimer, null);

    const statePath = path.join(dataDir, 'probes-state.json');
    const persistedState = JSON.parse(await fs.readFile(statePath, 'utf8'));
    assert.equal(persistedState.telemetry['node-01'].data.cpu.usagePct, 28.6);
    if (process.platform !== 'win32') {
      assert.equal((await fs.stat(statePath)).mode & 0o777, 0o600);
    }

    const enrolledMasked = registry.listEnrolled();
    const node01Masked = enrolledMasked.find((item) => item.id === 'node-01');
    const node02Masked = enrolledMasked.find((item) => item.id === 'node-02');
    assert.match(node01Masked.lastSourceIp, /^100\.64\.x\.x#[0-9a-f]{6}$/);
    assert.notEqual(node01Masked.lastSourceIp, '100.64.0.42');
    assert.equal(node02Masked.lastSourceIp, '127.0.0.1');

    const exposedConfig = loadConfig({
      rawConfig: {
        fleet: { maxProbes: 8 },
        security: { exposeClientIps: true },
      },
      env: { OPS_CONSOLE_DATA_DIR: dataDir },
    });
    const reloadedRegistry = new ProbeRegistry({ config: exposedConfig, logger, timeseries });
    assert.equal(reloadedRegistry.telemetry.get('node-01').data.cpu.usagePct, 28.6);
    const node01Exposed = reloadedRegistry.listEnrolled().find((item) => item.id === 'node-01');
    assert.equal(node01Exposed.lastSourceIp, '100.64.0.42');

    for (let idx = 3; idx <= 8; idx += 1) {
      await registry.enroll({ id: `node-0${idx}`, name: `Node 0${idx}`, deviceType: 'server' });
    }
    assert.equal(registry.records.size, 8);

    const rotated = await registry.enroll({ id: 'node-01', name: 'Node 01 Rotated', deviceType: 'server' });
    assert.ok(rotated.token.startsWith('ops_prb_'));
    assert.equal(registry.records.size, 8);

    await assert.rejects(
      () => registry.enroll({ id: 'node-09', name: 'Node 09 Overflow', deviceType: 'server' }),
      /Probe registry limit reached \(maxProbes=8\)/,
    );
  } finally {
    if (registry) await registry.flush();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
