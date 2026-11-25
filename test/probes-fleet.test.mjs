import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import {
  generateProbeToken,
  hashProbeToken,
  isTailscaleOrLoopbackIp,
  ProbeRegistry,
  sanitizeProbePayload,
  validateNodeId,
  verifyProbeToken,
} from '../src/probes.mjs';
import { createOpsConsole } from '../src/server.mjs';
import { TimeSeriesStore } from '../src/timeseries.mjs';
import {
  parseDfOutput,
  parsePmsetBattery,
  parseProcMeminfo,
  parseProcNetDev,
  parseVmStat,
  pushTelemetry,
  validateWatchServiceName,
} from '../probe/ops-probe.mjs';

test('TimeSeriesStore bounds history and coalesces rapid writes', () => {
  const store = new TimeSeriesStore({ maxPoints: 10, minIntervalMs: 1000 });
  const base = 1_700_000_000_000;
  store.record('node:hub', { ts: base, cpuPct: 10 });
  store.record('node:hub', { ts: base + 400, cpuPct: 15 });
  assert.equal(store.get('node:hub').length, 1);
  assert.equal(store.get('node:hub')[0].cpuPct, 15);

  for (let i = 1; i <= 15; i += 1) {
    store.record('node:hub', { ts: base + i * 2000, cpuPct: i * 5 });
  }
  const pts = store.get('node:hub');
  assert.equal(pts.length, 10);
  assert.equal(pts[0].cpuPct, 30);
  assert.equal(pts[pts.length - 1].cpuPct, 75);
  assert.ok(store.summaryMap(4)['node:hub'].length === 4);
  store.clear('node:hub');
  assert.equal(store.get('node:hub').length, 0);
});

test('isTailscaleOrLoopbackIp validates CGNAT 100.64.0.0/10, fd7a, and loopback only', () => {
  assert.equal(isTailscaleOrLoopbackIp('127.0.0.1'), true);
  assert.equal(isTailscaleOrLoopbackIp('::1'), true);
  assert.equal(isTailscaleOrLoopbackIp('::ffff:100.64.0.10'), true);
  assert.equal(isTailscaleOrLoopbackIp([100, 127, 255, 254].join('.')), true);
  assert.equal(isTailscaleOrLoopbackIp('fd7a:115c:a1e0::1234'), true);

  assert.equal(isTailscaleOrLoopbackIp('100.63.255.255'), false);
  assert.equal(isTailscaleOrLoopbackIp([100, 128, 0, 1].join('.')), false);
  assert.equal(isTailscaleOrLoopbackIp('192.168.1.10'), false);
  assert.equal(isTailscaleOrLoopbackIp('8.8.8.8'), false);
  assert.equal(isTailscaleOrLoopbackIp(''), false);
});

test('probe token hashing, nodeId validation, and payload sanitization harden boundaries', () => {
  assert.equal(validateNodeId('edge-tokyo-01'), true);
  assert.equal(validateNodeId('macbook_pro.local'), true);
  assert.equal(validateNodeId('Bad Upper'), false);
  assert.equal(validateNodeId('../etc/passwd'), false);

  const token = generateProbeToken();
  assert.ok(token.startsWith('ops_prb_'));
  const stored = hashProbeToken(token);
  assert.equal(verifyProbeToken(token, stored), true);
  assert.equal(verifyProbeToken(`${token}x`, stored), false);

  const clean = sanitizeProbePayload({
    nodeId: 'edge-tokyo',
    deviceType: 'server',
    hostname: 'edge-tokyo\u0007\n',
    cpu: { cores: 4, usagePct: 140, load1: -2 },
    battery: { percent: 87.6, charging: true, source: 'AC' },
    agents: { count: 2, categories: { __proto__: 9, orchestrator: 2 } },
  }, 'edge-tokyo');
  assert.equal(clean.hostname, 'edge-tokyo');
  assert.equal(clean.cpu.usagePct, 100);
  assert.equal(clean.cpu.load1, 0);
  assert.equal(clean.battery.percent, 88);
  assert.equal(Object.prototype.hasOwnProperty.call(clean.agents.categories, '__proto__'), false);
  assert.equal(clean.agents.categories.orchestrator, 2);

  assert.throws(
    () => sanitizeProbePayload({ nodeId: 'other-node' }, 'edge-tokyo'),
    /does not match/,
  );
});

test('ops-probe metric parsers handle Linux and macOS outputs accurately', () => {
  const mem = parseProcMeminfo('MemTotal:       16384000 kB\nMemAvailable:    8192000 kB\n');
  assert.equal(mem.totalBytes, 16384000 * 1024);
  assert.equal(mem.usedPct, 50);

  const vm = parseVmStat(
    'Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages active: 200000.\nPages wired down: 100000.\nPages occupied by compressor: 50000.\n',
    16 * 1024 * 1024 * 1024,
  );
  assert.ok(vm.usedBytes > 0 && vm.usedPct > 0 && vm.usedPct < 100);

  const bat = parsePmsetBattery("Now drawing from 'AC Power'\n -InternalBattery-0 (id=1)\t84%; charging; 0:32 remaining\n");
  assert.deepEqual(bat, { percent: 84, charging: true, source: 'AC Power' });

  const disks = parseDfOutput(
    'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 1000000 400000 600000 40% /\n',
    ['/'],
  );
  assert.equal(disks.length, 1);
  assert.equal(disks[0].mount, '/');
  assert.equal(disks[0].usedPct, 40);

  const net = parseProcNetDev('Inter-|\n face |bytes\n lo: 100 1 0 0 0 0 0 0 100 1 0 0 0 0 0 0\n eth0: 5000 10 0 0 0 0 0 0 3000 10 0 0 0 0 0 0\n');
  assert.equal(net.rxBytes, 5000);
  assert.equal(net.txBytes, 3000);

  assert.equal(validateWatchServiceName('tailscaled.service'), true);
  assert.equal(validateWatchServiceName('bad;rm -rf /'), false);
});

const EXAMPLE_CONFIG = path.resolve(process.cwd(), 'ops-console.config.example.json');

test('ProbeRegistry enroll, persist (0600), ingest, fleet fusion, and revoke', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-probe-reg-'));
  try {
    const config = loadConfig({
      cli: { configPath: EXAMPLE_CONFIG, hosts: '127.0.0.1', port: 4320, demo: false },
      env: { OPS_CONSOLE_DATA_DIR: dataDir },
    });
    const timeseries = new TimeSeriesStore({ maxPoints: 30, minIntervalMs: 0 });
    const reg = new ProbeRegistry({ config, timeseries });

    const enrolled = await reg.enroll({
      id: 'macbook-air',
      name: 'Workstation Mac',
      deviceType: 'laptop',
      region: 'Tokyo, JP',
      lat: 35.68,
      lon: 139.69,
      tailscaleIp: '100.64.0.21',
    });
    assert.ok(enrolled.token.startsWith('ops_prb_'));
    assert.ok(enrolled.installHints.macosLaunchAgent.includes('install-probe.sh'));
    assert.ok(enrolled.installHints.linuxSystemd.includes('install-probe.sh'));
    assert.ok(enrolled.installHints.mobileCheckinCurl.includes('/api/probes/ingest'));

    const st = await fs.stat(path.join(dataDir, 'probes.json'));
    assert.equal(st.mode & 0o777, 0o600);

    assert.ok(reg.authenticateProbe('macbook-air', enrolled.token));
    assert.equal(reg.authenticateProbe('macbook-air', 'wrong-token'), null);

    await reg.ingest({
      nodeId: 'macbook-air',
      payload: {
        schemaVersion: 1,
        nodeId: 'macbook-air',
        deviceType: 'laptop',
        platform: 'darwin',
        cpu: { cores: 10, usagePct: 23.5, load1: 1.2 },
        memory: { totalBytes: 17179869184, usedBytes: 8589934592, usedPct: 50 },
        battery: { percent: 91, charging: false, source: 'Battery Power' },
        hubRttMs: 34,
      },
      sourceIp: '100.64.0.21',
    });

    const fleet = reg.buildFleetView({
      snapshot: {
        collectedAt: new Date().toISOString(),
        host: { hostname: 'hub-primary', cpuCount: 8, memPct: 40, load1: 0.8, disks: [] },
        services: { items: [] },
        network: { tailscale: { devices: [] } },
        agents: { total: 2 },
      },
    });
    const mac = fleet.nodes.find((n) => n.id === 'macbook-air');
    assert.ok(mac);
    assert.equal(mac.probeLive, true);
    assert.equal(mac.status, 'healthy');
    assert.equal(mac.battery.percent, 91);
    assert.equal(mac.history.length, 1);

    const revoked = await reg.revoke('macbook-air');
    assert.equal(revoked.ok, true);
    assert.equal(reg.authenticateProbe('macbook-air', enrolled.token), null);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('ProbeRegistry.buildFleetView adapts real connector snapshot shapes (host/services/tailscale.devices/SSH)', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-probes-realshape-'));
  try {
    const config = loadConfig({
      cli: { configPath: EXAMPLE_CONFIG, hosts: '127.0.0.1', port: 4320 },
      env: { OPS_CONSOLE_DATA_DIR: dataDir },
    });
    config.fleet.declaredNodes = [
      { id: 'relay-node', name: 'Relay Node', deviceType: 'server', probeMode: 'ssh', region: 'Beijing, CN', tailscaleIp: '100.64.0.11', lat: 39.9, lon: 116.4 },
    ];
    const ts = new TimeSeriesStore({ maxPoints: 30, minIntervalMs: 0 });
    const reg = new ProbeRegistry({ config, timeseries: ts });
    const fleet = reg.buildFleetView({
      snapshot: {
        collectedAt: new Date().toISOString(),
        host: {
          hostname: 'hub-box',
          platform: 'Linux 6.8',
          arch: 'x64',
          cpuCores: 8,
          load1: 1.6,
          uptimeSeconds: 7200,
          memory: { totalBytes: 16e9, usedBytes: 8e9, availBytes: 8e9, usedPercent: 50 },
          disks: [{ mount: '/', sizeBytes: 100e9, usedBytes: 42e9, availBytes: 58e9, usePercent: 42 }],
        },
        services: { items: [{ name: 'gateway', status: 'healthy', activeState: 'active' }] },
        agents: { totalProcesses: 5 },
        tailscale: {
          devices: [
            { name: 'hub-box', ip: '100.64.0.10', os: 'linux', online: true, isSelf: true, relay: 'sha' },
            { name: 'relay-node', ip: '100.64.0.11', os: 'linux', online: true, isSelf: false, relay: 'pek' },
            { name: 'auto-laptop', ip: '100.64.0.19', os: 'macOS', online: true, isSelf: false, relay: 'sha' },
          ],
        },
      },
      remotes: [
        { id: 'relay-node', name: 'Relay Node', ip: '100.64.0.11', reachable: true, rttMs: 22, load: '0.25 0.20 0.15', memory: '512/2048MB', disk: '12G/40G (30%)', backup: '1.2G:2026-11-25' },
      ],
    });

    const hub = fleet.nodes.find((n) => n.id === 'hub-primary');
    assert.equal(hub.cpu.cores, 8);
    assert.equal(hub.cpu.usagePct, 20);
    assert.equal(hub.memory.usedPct, 50);
    assert.equal(hub.disks[0].usedPct, 42);
    assert.equal(hub.servicesSummary.healthy, 1);
    assert.equal(hub.agentsCount, 5);
    assert.equal(hub.tailscaleIp, '100.64.0.10');

    const relay = fleet.nodes.find((n) => n.id === 'relay-node');
    assert.equal(relay.status, 'healthy');
    assert.equal(relay.memory.usedPct, 25);
    assert.equal(relay.disks[0].usedPct, 30);
    assert.equal(relay.backupDisk, '1.2G:2026-11-25');
    assert.equal(relay.rttMs, 22);

    const discovered = fleet.nodes.find((n) => n.id === 'ts-auto-laptop');
    assert.ok(discovered);
    assert.equal(discovered.deviceType, 'laptop');
    assert.equal(discovered.status, 'standby');
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test('Fleet & Probe HTTP APIs enforce auth, CIDR, read-only, check-in, and zero external CSP', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-fleet-http-'));
  const config = loadConfig({
    cli: { hosts: '127.0.0.1', port: 4320, demo: true },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  config.security.trustProxy = true;
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;

  try {
    const indexRes = await fetch(`${baseUrl}/`);
    const csp = indexRes.headers.get('content-security-policy') || '';
    assert.ok(!csp.includes('fonts.googleapis.com'));
    assert.ok(!csp.includes('fonts.gstatic.com'));

    const fleetRes = await fetch(`${baseUrl}/api/nodes`).then((r) => r.json());
    assert.equal(fleetRes.ok, true);
    assert.ok(Array.isArray(fleetRes.fleet.nodes) && fleetRes.fleet.nodes.length >= 4);
    const fleetAlias = await fetch(`${baseUrl}/api/fleet`).then((r) => r.json());
    assert.equal(fleetAlias.ok, true);
    assert.equal(fleetAlias.fleet.nodes.length, fleetRes.fleet.nodes.length);

    const nodeRes = await fetch(`${baseUrl}/api/nodes/hub-primary`).then((r) => r.json());
    assert.equal(nodeRes.ok, true);
    assert.equal(nodeRes.node.id, 'hub-primary');
    assert.ok(Array.isArray(nodeRes.history) && nodeRes.history.length > 0);

    const badNode = await fetch(`${baseUrl}/api/nodes/..%2fetc`);
    assert.equal(badNode.status, 400);

    const enrollRes = await fetch(`${baseUrl}/api/probes/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'edge-sjc-01',
        name: 'Edge SJC',
        deviceType: 'server',
        region: 'San Jose, US',
        lat: 37.34,
        lon: -121.89,
      }),
    }).then((r) => r.json());
    assert.equal(enrollRes.ok, true);
    assert.ok(enrollRes.token.startsWith('ops_prb_'));

    const publicCidrBlocked = await fetch(`${baseUrl}/api/probes/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '8.8.8.8',
        'X-Ops-Probe-Id': 'edge-sjc-01',
        Authorization: `Bearer ${enrollRes.token}`,
      },
      body: JSON.stringify({ nodeId: 'edge-sjc-01' }),
    });
    assert.equal(publicCidrBlocked.status, 403);

    const badAuth = await fetch(`${baseUrl}/api/probes/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ops-Probe-Id': 'edge-sjc-01',
        Authorization: 'Bearer ops_prb_invalid',
      },
      body: JSON.stringify({ nodeId: 'edge-sjc-01' }),
    });
    assert.equal(badAuth.status, 401);

    const pushRes = await pushTelemetry(
      {
        hubUrl: baseUrl,
        nodeId: 'edge-sjc-01',
        token: enrollRes.token,
      },
      {
        schemaVersion: 1,
        nodeId: 'edge-sjc-01',
        deviceType: 'server',
        platform: 'linux',
        cpu: { cores: 4, usagePct: 19.2, load1: 0.45 },
        memory: { totalBytes: 8589934592, usedBytes: 3221225472, usedPct: 37.5 },
        disks: [{ mount: '/', totalBytes: 85899345920, usedBytes: 25769803776, usedPct: 30 }],
      },
    );
    assert.equal(pushRes.ok, true);

    const afterPush = await fetch(`${baseUrl}/api/fleet`).then((r) => r.json());
    const pushedNode = afterPush.fleet.nodes.find((n) => n.id === 'edge-sjc-01');
    assert.ok(pushedNode);
    assert.equal(pushedNode.probeLive, true);
    assert.equal(pushedNode.cpu.usagePct, 19.2);

    const checkinRes = await fetch(`${baseUrl}/api/probes/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: 'mobile-oncall',
        deviceType: 'mobile',
        region: 'Tokyo, JP',
        battery: { percent: 76, charging: false },
        note: 'Field check-in',
      }),
    }).then((r) => r.json());
    assert.equal(checkinRes.ok, true);

    const revokeRes = await fetch(`${baseUrl}/api/probes/edge-sjc-01`, {
      method: 'DELETE',
    }).then((r) => r.json());
    assert.equal(revokeRes.ok, true);

    const afterRevoke = await fetch(`${baseUrl}/api/probes/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ops-Probe-Id': 'edge-sjc-01',
        Authorization: `Bearer ${enrollRes.token}`,
      },
      body: JSON.stringify({ nodeId: 'edge-sjc-01' }),
    });
    assert.equal(afterRevoke.status, 401);
  } finally {
    await app.stop();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
