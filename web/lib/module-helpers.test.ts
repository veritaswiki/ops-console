import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  auditEntriesToCsv,
  buildPluginsExportPayload,
  DEFAULT_OVERVIEW_PREFS,
  filterAuditEntries,
  formatRemainingSilence,
  latencyTierVar,
  parseOverviewPrefs,
  searchFleetNodes,
  sortFleetNodes,
} from './module-helpers';
import type { AuditEntry, FleetNode, PluginCatalogItem } from '../types';

describe('Wave 2 module helpers', () => {
  it('computes silence window countdown and progress percentage', () => {
    const now = Date.parse('2026-11-25T10:00:00.000Z');
    const in15m = '2026-11-25T10:15:00.000Z';
    const res = formatRemainingSilence(in15m, now, 30);
    assert.equal(res.expired, false);
    assert.equal(res.label, '15m 00s');
    assert.equal(res.progressPct, 50);

    const expired = formatRemainingSilence('2026-11-25T09:59:00.000Z', now, 30);
    assert.equal(expired.expired, true);
    assert.equal(expired.progressPct, 0);

    const in2h5m = '2026-11-25T12:05:00.000Z';
    const longRes = formatRemainingSilence(in2h5m, now, 120);
    assert.equal(longRes.label, '2h 05m');
    assert.equal(longRes.progressPct, 100);
  });

  it('sorts and filters fleet nodes across status, rtt, cpu, mem, and query', () => {
    const nodes: FleetNode[] = [
      {
        id: 'n1',
        name: 'Tokyo Edge',
        region: 'Tokyo, JP',
        status: 'healthy',
        tailscaleIp: '100.64.0.10',
        cpu: { usagePct: 22 },
        memory: { usedPct: 48 },
        network: { rttMs: 42 },
      },
      {
        id: 'n2',
        name: 'Frankfurt Core',
        region: 'Frankfurt, DE',
        status: 'offline',
        tailscaleIp: '100.64.0.20',
        cpu: { usagePct: 88 },
        memory: { usedPct: 79 },
        network: { rttMs: 185 },
      },
      {
        id: 'n3',
        name: 'Hub Primary',
        region: 'Singapore, SG',
        status: 'degraded',
        tailscaleIp: '100.64.0.1',
        cpu: { usagePct: 61 },
        memory: { usedPct: 65 },
        network: { rttMs: 12 },
      },
    ];

    const byStatus = sortFleetNodes(nodes, 'status', 'asc');
    assert.deepEqual(
      byStatus.map((n) => n.id),
      ['n2', 'n3', 'n1'],
    );

    const byRttDesc = sortFleetNodes(nodes, 'rtt', 'desc');
    assert.deepEqual(
      byRttDesc.map((n) => n.id),
      ['n2', 'n1', 'n3'],
    );

    const byMemDesc = sortFleetNodes(nodes, 'mem', 'desc');
    assert.deepEqual(
      byMemDesc.map((n) => n.id),
      ['n2', 'n3', 'n1'],
    );

    assert.equal(searchFleetNodes(nodes, '100.64.0.20').length, 1);
    assert.equal(searchFleetNodes(nodes, 'tokyo').length, 1);
    assert.equal(latencyTierVar(15), 'var(--lat-fast)');
    assert.equal(latencyTierVar(300), 'var(--lat-critical)');
  });

  it('redacts secrets when exporting sanitized plugin manifest JSON', () => {
    const items: PluginCatalogItem[] = [
      {
        id: 'mcp-server',
        name: 'MCP Server',
        version: '1.0.0',
        category: 'mcp',
        source: 'builtin',
        description: 'MCP',
        officialSpec: { protocol: 'MCP 2025-03-26' },
        capabilities: [],
        configSchema: [
          { key: 'apiUrl', label: 'URL', type: 'url' },
          { key: 'authToken', label: 'Token', type: 'secret' },
        ],
        config: {
          apiUrl: 'http://127.0.0.1:8000/mcp',
          authToken: 'super-secret-value',
          customApiKey: 'another-secret',
        },
        enabled: true,
        status: 'healthy',
        reachable: true,
        latencyMs: 12,
        summary: 'ok',
      },
    ];

    const manifest = buildPluginsExportPayload(items, '2026-11-25T10:00:00.000Z');
    assert.equal(manifest.count, 1);
    assert.equal(manifest.plugins[0].config.apiUrl, 'http://127.0.0.1:8000/mcp');
    assert.equal(manifest.plugins[0].config.authToken, '<REDACTED>');
    assert.equal(manifest.plugins[0].config.customApiKey, '<REDACTED>');
  });

  it('filters audit entries and escapes CSV fields per RFC 4180', () => {
    const entries: AuditEntry[] = [
      {
        ts: '2026-11-25T09:00:00Z',
        actor: 'admin',
        action: 'service.restart',
        target: 'magpie.service',
        ok: true,
        durationMs: 120,
        detail: 'restarted cleanly',
      },
      {
        ts: '2026-11-25T09:05:00Z',
        actor: 'ops',
        action: 'runbook.run',
        target: 'rb-memory, "cache"',
        ok: false,
        durationMs: 45,
        detail: 'timeout, retry later',
      },
    ];

    assert.equal(filterAuditEntries(entries, { outcome: 'fail' }).length, 1);
    assert.equal(filterAuditEntries(entries, { outcome: 'ok', query: 'magpie' }).length, 1);
    assert.equal(filterAuditEntries(entries, { outcome: 'ok', query: 'runbook' }).length, 0);

    const csv = auditEntriesToCsv(entries);
    const lines = csv.split('\n');
    assert.equal(lines.length, 3);
    assert.ok(lines[2].includes('"rb-memory, ""cache"""'));
    assert.ok(lines[2].includes('"timeout, retry later"'));
  });

  it('parses overview workspace preferences safely with fallbacks', () => {
    assert.deepEqual(parseOverviewPrefs(null), DEFAULT_OVERVIEW_PREFS);
    assert.deepEqual(parseOverviewPrefs('{invalid json'), DEFAULT_OVERVIEW_PREFS);
    assert.deepEqual(parseOverviewPrefs(JSON.stringify({ graph: false, metrics: false })), {
      metrics: false,
      graph: false,
      connectors: true,
      storageEvents: true,
    });
  });
});
