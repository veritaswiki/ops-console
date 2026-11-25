import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampPercent,
  classifyLatency,
  countLogLevels,
  filterFleetNodes,
  filterServices,
  formatBytes,
  formatUptime,
  statusLabel,
  statusTone,
} from './format.ts';
import {
  buildFullGraph,
  clampGraphViewBox,
  computeNodeDegrees,
  graphZoomPercent,
  layoutForceGraph,
  layoutGraph,
  panGraphViewBox,
  zoomGraphViewBox,
} from '../lib/graph-layout.ts';
import {
  buildSparklineGeometry,
  clampViewBox,
  computeFitViewBox,
  projectLatLon,
} from '../lib/world-map-data.ts';

test('statusTone and statusLabel classify all operational states cleanly', () => {
  assert.equal(statusTone('healthy'), 'ok');
  assert.equal(statusTone('active'), 'ok');
  assert.equal(statusTone('degraded'), 'warn');
  assert.equal(statusTone('failed'), 'err');
  assert.equal(statusTone('offline'), 'err');
  assert.equal(statusTone('standby'), 'muted');

  assert.equal(statusLabel('healthy'), '健康');
  assert.equal(statusLabel('degraded'), '降级');
  assert.equal(statusLabel('offline'), '离线');
  assert.equal(statusLabel('standby'), '待机');
});

test('formatBytes, formatUptime, and clampPercent handle boundary values', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1024 * 1024 * 12.5), '12.5 MB');
  assert.equal(formatBytes(null), '-');
  assert.equal(formatUptime(90061), '1d 1h');
  assert.equal(formatUptime(3660), '1h 1m');
  assert.equal(clampPercent(128), 100);
  assert.equal(clampPercent(-5), 0);
  assert.equal(clampPercent(42.6), 43);
});

test('filterServices filters by layer, status, and keyword query', () => {
  const list = [
    { id: 'nmem', name: 'Nowledge Mem', unit: 'nmem.service', layer: 'memory', status: 'healthy', ports: ['127.0.0.1:14242'] },
    { id: 'magpie', name: 'Magpie Gateway', unit: 'magpie.service', layer: 'gateway', status: 'degraded', ports: ['127.0.0.1:8787'] },
    { id: 'tailscaled', name: 'Tailscale', unit: 'tailscaled.service', layer: 'network', status: 'failed', ports: [] },
  ];
  assert.equal(filterServices(list, { layer: 'memory', status: 'all', query: '' }).length, 1);
  assert.equal(filterServices(list, { layer: 'all', status: 'degraded', query: '' })[0].id, 'magpie');
  assert.equal(filterServices(list, { layer: 'all', status: 'all', query: '14242' })[0].id, 'nmem');
  assert.equal(filterServices(list, { layer: 'agents', status: 'all', query: '' })[0].id, 'magpie');
});

test('filterFleetNodes groups hubs with servers and separates laptops/mobiles', () => {
  const nodes = [
    { id: 'hub-1', name: 'Hub', deviceType: 'hub' },
    { id: 'srv-1', name: 'Tokyo', deviceType: 'server' },
    { id: 'mac-1', name: 'MacBook', deviceType: 'laptop' },
    { id: 'ios-1', name: 'iPhone', deviceType: 'mobile' },
  ];
  assert.equal(filterFleetNodes(nodes, 'all').length, 4);
  assert.equal(filterFleetNodes(nodes, 'server').length, 2);
  assert.equal(filterFleetNodes(nodes, 'laptop').length, 1);
  assert.equal(filterFleetNodes(nodes, 'mobile').length, 1);
});

test('countLogLevels tallies severity buckets accurately', () => {
  const counts = countLogLevels([
    { level: 'ERROR', message: 'fail' },
    { level: 'warn', message: 'slow' },
    { level: 'info', message: 'ok' },
    { level: 'debug', message: 'trace' },
  ]);
  assert.deepEqual(counts, { total: 4, error: 1, warn: 1, info: 1, debug: 1 });
});

test('world map projection, viewBox clamping, and sparkline geometry are deterministic', () => {
  const tokyo = projectLatLon(35.68, 139.77);
  assert.ok(tokyo.x > 800 && tokyo.x < 920);
  assert.ok(tokyo.y > 100 && tokyo.y < 200);

  const clamped = clampViewBox({ x: -100, y: -50, w: 50, h: 20 });
  assert.equal(clamped.x, 0);
  assert.equal(clamped.y, 0);
  assert.equal(clamped.w, 140);

  const fit = computeFitViewBox([
    { id: 'a', name: 'Tokyo', lat: 35.68, lon: 139.77, status: 'healthy' },
    { id: 'b', name: 'Singapore', lat: 1.35, lon: 103.82, status: 'healthy' },
  ]);
  assert.ok(fit.w >= 220 && fit.w <= 1000);

  const spark = buildSparklineGeometry([10, 40, 25, 60], 200, 50);
  assert.ok(spark);
  if (spark) {
    assert.equal(spark.lastValue, 60);
    assert.equal(spark.lastX, 200);
  }
});

test('buildFullGraph and layoutGraph generate valid lanes, nodes, and bezier edges', () => {
  const graph = buildFullGraph({
    services: {
      items: [
        { id: 'ops-console', name: 'Ops Console', unit: 'ops.service', layer: 'core', status: 'healthy', ports: [':4320'] },
        { id: 'magpie', name: 'Magpie', unit: 'magpie.service', layer: 'gateway', status: 'healthy', ports: [':8787'] },
        { id: 'nmem', name: 'Nowledge Mem', unit: 'nmem.service', layer: 'memory', status: 'healthy', ports: [':14242'] },
        { id: 'tailscaled', name: 'Tailscale', unit: 'tailscaled.service', layer: 'network', status: 'healthy' },
      ],
    },
    magpie: { enabled: true, reachable: true, status: 'healthy', totalModels: 18, providers: [{ name: 'OpenAI', count: 6 }] },
    memory: { nmem: { enabled: true, reachable: true, status: 'healthy', stats: { memories: 120 } } },
    network: { tailscale: { enabled: true, reachable: true, status: 'healthy', onlineCount: 4, devices: [{}, {}, {}, {}] } },
    agents: { processes: [{ pid: 1001, categoryLabel: 'Claude Code', cpu: 2.1 }] },
  });
  const layout = layoutGraph(graph);
  assert.equal(layout.lanes.length, 4);
  assert.ok(layout.nodes.length >= 5);
  assert.ok(layout.edges.length >= 3);
  assert.ok(layout.edges.every((e) => e.d.startsWith('M')));
});

test('graph zoom and pan viewBox math clamps bounds and preserves cursor focus', () => {
  const baseW = 1000;
  const baseH = 500;
  const initial = { x: 0, y: 0, w: baseW, h: baseH };

  assert.equal(graphZoomPercent(initial, baseW), 100);

  // Zoom in around center
  const zoomedIn = zoomGraphViewBox(initial, baseW, baseH, 0.5);
  assert.equal(graphZoomPercent(zoomedIn, baseW), 200);
  assert.equal(zoomedIn.w, 500);
  assert.equal(zoomedIn.h, 250);
  assert.equal(zoomedIn.x, 250);
  assert.equal(zoomedIn.y, 125);

  // Over-zooming clamps cleanly to max zoom (300%)
  const maxZoomed = zoomGraphViewBox(zoomedIn, baseW, baseH, 0.1);
  assert.equal(graphZoomPercent(maxZoomed, baseW), 300);

  // Panning shifts viewBox and clamps within padding bounds
  const panned = panGraphViewBox(zoomedIn, baseW, baseH, 100, -50);
  assert.equal(panned.x, 150);
  assert.equal(panned.y, 175);

  const clampedFar = clampGraphViewBox({ x: -9999, y: 9999, w: 500, h: 250 }, baseW, baseH);
  assert.equal(clampedFar.x, -250);
  assert.equal(clampedFar.y, 375);
});

test('classifyLatency produces monotonic percentages and accurate performance tiers', () => {
  assert.equal(classifyLatency(null), null);
  const fast = classifyLatency(3);
  const good = classifyLatency(11);
  const moderate = classifyLatency(24);
  const slow = classifyLatency(55);
  const critical = classifyLatency(160);

  assert.equal(fast?.tier, 'fast');
  assert.equal(good?.tier, 'good');
  assert.equal(moderate?.tier, 'moderate');
  assert.equal(slow?.tier, 'slow');
  assert.equal(critical?.tier, 'critical');
  assert.ok((fast?.pct ?? 0) < (good?.pct ?? 0));
  assert.ok((good?.pct ?? 0) < (moderate?.pct ?? 0));
  assert.ok((moderate?.pct ?? 0) < (slow?.pct ?? 0));
  assert.ok((slow?.pct ?? 0) <= (critical?.pct ?? 0));
  assert.equal(critical?.pct, 100);
});

test('force-directed auto-layout by degree and health avoids overlaps and prioritizes targets', () => {
  const raw = {
    lanes: [{ id: 'a', title: 'A', subtitle: 'A' }],
    nodes: [
      { id: 'hub', lane: 'a', kind: 'gateway', label: 'Hub', status: 'healthy' },
      { id: 'err-svc', lane: 'a', kind: 'service', label: 'Err', status: 'failed' },
      { id: 'warn-svc', lane: 'a', kind: 'service', label: 'Warn', status: 'degraded' },
      { id: 'ok-1', lane: 'a', kind: 'memory', label: 'Mem1', status: 'healthy' },
      { id: 'ok-2', lane: 'a', kind: 'memory', label: 'Mem2', status: 'healthy' },
      { id: 'ok-3', lane: 'a', kind: 'network', label: 'Net', status: 'standby' },
    ],
    edges: [
      { id: 'e1', from: 'err-svc', to: 'hub' },
      { id: 'e2', from: 'warn-svc', to: 'hub' },
      { id: 'e3', from: 'hub', to: 'ok-1' },
      { id: 'e4', from: 'hub', to: 'ok-2' },
      { id: 'e5', from: 'hub', to: 'ok-3' },
    ],
  };

  const degrees = computeNodeDegrees(raw.nodes, raw.edges);
  assert.equal(degrees.get('hub')?.total, 5);
  assert.equal(degrees.get('ok-1')?.total, 1);

  for (const mode of ['force-degree', 'force-health'] as const) {
    const laid = layoutForceGraph(raw, mode, false, 0);
    assert.equal(laid.nodes.length, raw.nodes.length);
    // Strict zero-overlap check between every pair of placed node cards
    for (let i = 0; i < laid.nodes.length; i += 1) {
      for (let j = i + 1; j < laid.nodes.length; j += 1) {
        const a = laid.nodes[i];
        const b = laid.nodes[j];
        const overlapsX = a.x < b.x + b.w && a.x + a.w > b.x;
        const overlapsY = a.y < b.y + b.h && a.y + a.h > b.y;
        assert.equal(overlapsX && overlapsY, false, `${mode}: ${a.id} overlapped ${b.id}`);
      }
    }
  }

  // Health mode places failed node above healthy base nodes
  const healthLayout = layoutForceGraph(raw, 'force-health', false, 0);
  const errNode = healthLayout.nodes.find((n) => n.id === 'err-svc')!;
  const okNode = healthLayout.nodes.find((n) => n.id === 'ok-1')!;
  assert.ok(errNode.y < okNode.y, 'failed node should be positioned above healthy nodes');
});


