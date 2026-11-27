import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  parseCloudflaredIngressYaml,
  parseCloudflaredTunnelsJson,
  parseWarpStatusText,
} from '../src/connectors/network-cloudflare.mjs';
import {
  parseTailscaleFunnelJson,
  parseTailscaleNetcheckJson,
  parseTailscalePingOutput,
  runTailscalePing,
} from '../src/connectors/network-tailscale.mjs';
import { loadConfig } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';

test('Cloudflare YAML ingress, tunnel JSON, and WARP status parsers extract safe LAN metadata only', () => {
  const yaml = `
tunnel: ops-lan-hub
credentials-file: /etc/cloudflared/secret-should-not-leak.json
warp-routing:
  enabled: true
ingress:
  - hostname: ops.example.com
    service: http://127.0.0.1:8788
  - hostname: a2a.example.com
    path: /a2a
    service: http://127.0.0.1:8788
  - service: http_status:404
`;
  const parsed = parseCloudflaredIngressYaml(yaml);
  assert.equal(parsed.tunnel, 'ops-lan-hub');
  assert.equal(parsed.warpRouting, true);
  assert.equal(parsed.ingress.length, 3);
  assert.equal(parsed.ingress[0].hostname, 'ops.example.com');
  assert.equal(parsed.ingress[1].path, '/a2a');
  assert.equal(JSON.stringify(parsed).includes('secret-should-not-leak'), false);

  const tunnels = parseCloudflaredTunnelsJson([
    {
      id: 'tun-1',
      name: 'ops-lan-hub',
      created_at: '2026-11-01T00:00:00Z',
      connections: [{ colo_name: 'hkg' }, { colo_name: 'sin' }],
    },
    { id: 'tun-2', name: 'idle-tun', connections: [] },
  ]);
  assert.equal(tunnels.length, 2);
  assert.equal(tunnels[0].status, 'healthy');
  assert.equal(tunnels[0].connectionsCount, 2);
  assert.deepEqual(tunnels[0].edgeColos, ['hkg', 'sin']);
  assert.equal(tunnels[1].status, 'offline');

  const warpOk = parseWarpStatusText('Status update: Connected\nSuccess');
  assert.equal(warpOk.connected, true);
  const warpOff = parseWarpStatusText('Status update: Disconnected\nReason: Manual');
  assert.equal(warpOff.connected, false);
  assert.equal(warpOff.reason, 'Manual');
});

test('Tailscale ping, netcheck, and funnel parsers handle structured outputs and reject invalid ping targets', async () => {
  const pingDirect = parseTailscalePingOutput('pong from peer-a (100.64.0.21) via 198.51.100.21:41641 in 12.4ms');
  assert.equal(pingDirect.ok, true);
  assert.equal(pingDirect.direct, true);
  assert.equal(pingDirect.latencyMs, 12.4);

  const pingDerp = parseTailscalePingOutput('pong from peer-b (100.64.0.35) via DERP(hkg) in 41.8ms');
  assert.equal(pingDerp.ok, true);
  assert.equal(pingDerp.direct, false);
  assert.equal(pingDerp.relay, 'hkg');

  const netcheck = parseTailscaleNetcheckJson({
    UDP: true,
    IPv4: true,
    IPv6: false,
    PreferredDERP: 19,
    RegionLatency: { '19': 28400000, '3': 62100000 },
  });
  assert.equal(netcheck.ok, true);
  assert.equal(netcheck.preferredDerp, '19');
  assert.equal(netcheck.derpRegions[0].regionId, '19');
  assert.equal(netcheck.derpRegions[0].latencyMs, 28.4);

  const funnels = parseTailscaleFunnelJson({
    AllowFunnel: { 'demo-hub.example.ts.net:443': true },
    Web: { 'demo-hub.example.ts.net:443': { Handlers: { '/': { Proxy: 'http://127.0.0.1:8788' } } } },
  });
  assert.equal(funnels.length, 1);
  assert.equal(funnels[0].scope, 'public funnel');

  await assert.rejects(() => runTailscalePing({}, '; rm -rf /'), /无效/);
  await assert.rejects(() => runTailscalePing({}, '--bad-flag'), /无效/);
});

test('HTTP endpoints /api/network/cloudflare, /api/network/tailscale/netcheck, and /api/network/tailscale/ping work end-to-end', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-console-net-'));
  const config = loadConfig({
    cli: {
      hosts: '127.0.0.1',
      port: 4320,
      demo: true,
      readOnly: false,
      webKey: '',
    },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;
  try {
    const cfRes = await fetch(`${baseUrl}/api/network/cloudflare`).then((r) => r.json());
    assert.equal(cfRes.ok, true);
    assert.equal(cfRes.cloudflare.status, 'healthy');
    assert.ok(cfRes.cloudflare.tunnels.length >= 1);

    const ncRes = await fetch(`${baseUrl}/api/network/tailscale/netcheck`).then((r) => r.json());
    assert.equal(ncRes.ok, true);
    assert.equal(ncRes.netcheck.ok, true);
    assert.ok(ncRes.netcheck.derpRegions.length >= 1);

    const pingRes = await fetch(`${baseUrl}/api/network/tailscale/ping`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: '100.64.0.21' }),
    }).then((r) => r.json());
    assert.equal(pingRes.ok, true);
    assert.equal(pingRes.ping.ok, true);
    assert.equal(pingRes.ping.target, '100.64.0.21');
  } finally {
    await app.stop();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
