import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ProbeRegistry, probeExternalDeclaredNodes, probeTcpEndpoint } from '../src/probes.mjs';

async function makeTempConfig(declaredNodes = []) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-fleet-diag-'));
  return {
    dir,
    config: {
      demo: false,
      console: { dataDir: dir, hosts: ['127.0.0.1'], port: 4320 },
      security: { exposeClientIps: false },
      fleet: {
        localNode: { id: 'hub-local', name: 'Hub Local', lat: 31.23, lon: 121.47 },
        probeStaleSec: 90,
        probeOfflineSec: 180,
        declaredNodes,
        meshLinks: [],
      },
    },
  };
}

test('probeTcpEndpoint distinguishes reachable loopback ports from refused ports', async () => {
  const server = net.createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const okRes = await probeTcpEndpoint('127.0.0.1', port, 1500);
    assert.equal(okRes.reachable, true);
    assert.equal(okRes.port, port);
    assert.equal(okRes.errorCode, null);
    assert.ok(okRes.rttMs >= 1);

    const mapRes = await probeExternalDeclaredNodes([
      { id: 'ext-ok', probeHost: '127.0.0.1', probePort: port, probeTimeoutMs: 1500 },
    ]);
    assert.equal(mapRes['ext-ok'].reachable, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  const refusedRes = await probeTcpEndpoint('127.0.0.1', port, 1500);
  assert.equal(refusedRes.reachable, false);
  assert.equal(refusedRes.errorCode, 'ECONNREFUSED');
  assert.match(refusedRes.error, /连接被拒绝/);
});

test('ProbeRegistry.buildFleetView produces explicit offlineReason across Tailscale, probe, SSH, and external nodes', async () => {
  const now = Date.now();
  const { dir, config } = await makeTempConfig([
    {
      id: 'node-mac',
      name: 'Workstation Mac',
      deviceType: 'laptop',
      probeMode: 'push',
      tailscaleIp: '100.64.0.21',
    },
    {
      id: 'node-ext-up',
      name: 'Edge US CN2',
      deviceType: 'edge',
      probeMode: 'external',
      probeHost: '127.0.0.1',
      probePort: 9447,
    },
    {
      id: 'node-ext-down',
      name: 'Edge DE',
      deviceType: 'edge',
      probeMode: 'external',
      probeHost: '127.0.0.1',
      probePort: 9446,
    },
    {
      id: 'node-known-broken',
      name: 'Edge SE Container',
      deviceType: 'edge',
      probeMode: 'external',
      knownStatus: 'offline',
      expectedOfflineReason: '宿主机出站超时，暂不加入自动路由',
    },
    {
      id: 'node-ssh-fail',
      name: 'Remote SSH Box',
      deviceType: 'server',
      probeMode: 'ssh',
    },
  ]);

  try {
    const reg = new ProbeRegistry({ config, logger: null, timeseries: null });
    reg.telemetry.set('node-mac', {
      receivedMs: now - 600_000,
      receivedAt: new Date(now - 600_000).toISOString(),
      sourceIp: '100.64.0.21',
      data: { nodeId: 'node-mac', deviceType: 'laptop' },
    });

    const fleet = reg.buildFleetView({
      snapshot: {
        collectedAt: new Date(now).toISOString(),
        host: { hostname: 'hub-local', cpu: { cores: 4, usagePct: 12 }, memory: { totalBytes: 8e9, usedBytes: 2e9, usedPercent: 25 }, disks: [] },
        services: [],
        network: {
          tailscale: {
            devices: [
              {
                name: 'node-mac',
                ip: '100.64.0.21',
                os: 'macOS',
                online: false,
                relay: 'pek',
                lastSeen: new Date(now - 900_000).toISOString(),
              },
              {
                name: 'legacy-expired-vm',
                ip: '100.64.0.99',
                os: 'linux',
                online: false,
                expired: true,
                relay: 'sha',
                lastSeen: new Date(now - 15 * 86400_000).toISOString(),
              },
            ],
          },
        },
      },
      remotes: [
        { id: 'node-ssh-fail', name: 'Remote SSH Box', reachable: false, error: 'SSH probe timed out' },
      ],
      externalChecks: {
        'node-ext-up': { reachable: true, port: 9447, protocol: 'tcp', rttMs: 42, errorCode: null, error: null, checkedAt: new Date(now).toISOString() },
        'node-ext-down': { reachable: false, port: 9446, protocol: 'tcp', rttMs: 2200, errorCode: 'ETIMEDOUT', error: 'TCP 探测超时（:9446，目标主机无响应或被防火墙丢弃）', checkedAt: new Date(now).toISOString() },
        'node-known-broken': { reachable: true, port: 25289, protocol: 'tcp', rttMs: 196, errorCode: null, error: null, checkedAt: new Date(now).toISOString() },
      },
    });

    const byId = new Map(fleet.nodes.map((n) => [n.id, n]));

    const mac = byId.get('node-mac');
    assert.equal(mac.status, 'offline');
    assert.match(mac.offlineReason, /Tailscale 对等体离线/);
    assert.match(mac.offlineReason, /ops-probe 心跳超时/);

    const extUp = byId.get('node-ext-up');
    assert.equal(extUp.status, 'healthy');
    assert.equal(extUp.rttMs, 42);
    assert.equal(extUp.offlineReason, null);
    assert.match(extUp.statusReason, /TCP :9447 探测可达/);

    const extDown = byId.get('node-ext-down');
    assert.equal(extDown.status, 'offline');
    assert.equal(extDown.offlineCategory, 'tcp_timeout');
    assert.match(extDown.offlineReason, /TCP 探测超时/);

    const knownBroken = byId.get('node-known-broken');
    assert.equal(knownBroken.status, 'offline');
    assert.equal(knownBroken.offlineCategory, 'external_degraded');
    assert.match(knownBroken.offlineReason, /宿主机出站超时/);

    const sshFail = byId.get('node-ssh-fail');
    assert.equal(sshFail.status, 'offline');
    assert.equal(sshFail.offlineCategory, 'ssh_error');
    assert.match(sshFail.offlineReason, /SSH probe timed out/);

    const expiredPeer = byId.get('ts-legacy-expired-vm');
    assert.equal(expiredPeer.status, 'offline');
    assert.equal(expiredPeer.offlineCategory, 'tailscale_expired');
    assert.match(expiredPeer.offlineReason, /密钥已过期/);

    assert.ok(fleet.summary.offline >= 5);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
