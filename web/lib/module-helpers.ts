import type { AuditEntry, FleetNode, PluginCatalogItem } from '../types';
import { statusTone } from '../utils/format';

export interface SilenceCountdown {
  expired: boolean;
  remainingMs: number;
  label: string;
  progressPct: number;
}

export function formatRemainingSilence(
  silenceUntilIso: string | null | undefined,
  nowMs: number = Date.now(),
  windowMinutes: number = 30,
): SilenceCountdown {
  if (!silenceUntilIso) {
    return { expired: true, remainingMs: 0, label: '已结束', progressPct: 0 };
  }
  const targetMs = Date.parse(silenceUntilIso);
  if (!Number.isFinite(targetMs)) {
    return { expired: true, remainingMs: 0, label: '已结束', progressPct: 0 };
  }
  const remainingMs = Math.max(0, targetMs - nowMs);
  if (remainingMs <= 0) {
    return { expired: true, remainingMs: 0, label: '已结束', progressPct: 0 };
  }
  const totalSec = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  let label = '';
  if (hours > 0) {
    label = `${hours}h ${String(mins).padStart(2, '0')}m`;
  } else if (mins > 0) {
    label = `${mins}m ${String(secs).padStart(2, '0')}s`;
  } else {
    label = `${secs}s`;
  }
  const denomMs = Math.max(60_000, windowMinutes * 60_000);
  const progressPct = Math.min(100, Math.max(2, Math.round((remainingMs / denomMs) * 100)));
  return { expired: false, remainingMs, label, progressPct };
}

export type FleetSortField = 'status' | 'rtt' | 'cpu' | 'mem' | 'name';
export type SortDir = 'asc' | 'desc';

const FLEET_STATUS_RANK: Record<string, number> = {
  err: 0,
  warn: 1,
  muted: 2,
  ok: 3,
};

export function searchFleetNodes(nodes: FleetNode[], query: string): FleetNode[] {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return nodes;
  return nodes.filter((n) => {
    const haystack = [
      n.id,
      n.name,
      n.region,
      n.city,
      n.role,
      n.tailscaleIp,
      n.os,
      n.arch,
      n.probeMode,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortFleetNodes(
  nodes: FleetNode[],
  field: FleetSortField,
  dir: SortDir,
): FleetNode[] {
  const mult = dir === 'asc' ? 1 : -1;
  return [...nodes].sort((a, b) => {
    if (field === 'name') {
      return a.name.localeCompare(b.name, 'zh-CN') * mult;
    }
    if (field === 'status') {
      const ra = FLEET_STATUS_RANK[statusTone(a.status)] ?? 2;
      const rb = FLEET_STATUS_RANK[statusTone(b.status)] ?? 2;
      if (ra !== rb) return (ra - rb) * mult;
      return a.name.localeCompare(b.name, 'zh-CN');
    }
    if (field === 'rtt') {
      const va = a.network?.rttMs;
      const vb = b.network?.rttMs;
      if (va == null && vb == null) return a.name.localeCompare(b.name, 'zh-CN');
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * mult;
    }
    if (field === 'cpu') {
      const va = a.cpu?.usagePct ?? a.battery?.percent;
      const vb = b.cpu?.usagePct ?? b.battery?.percent;
      if (va == null && vb == null) return a.name.localeCompare(b.name, 'zh-CN');
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * mult;
    }
    if (field === 'mem') {
      const va = a.memory?.usedPct;
      const vb = b.memory?.usedPct;
      if (va == null && vb == null) return a.name.localeCompare(b.name, 'zh-CN');
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * mult;
    }
    return 0;
  });
}

export function latencyTierVar(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return 'var(--muted-dot)';
  if (ms <= 20) return 'var(--lat-fast)';
  if (ms <= 60) return 'var(--lat-good)';
  if (ms <= 140) return 'var(--lat-moderate)';
  if (ms <= 260) return 'var(--lat-slow)';
  return 'var(--lat-critical)';
}

export interface SanitizedPluginManifest {
  exportedAt: string;
  count: number;
  plugins: Array<{
    id: string;
    name: string;
    version: string;
    category: string;
    source: string;
    enabled: boolean;
    protocol: string;
    config: Record<string, unknown>;
  }>;
}

const SECRET_KEY_RE = /(token|secret|password|passwd|apikey|api_key|key|credential|auth)/i;

export function buildPluginsExportPayload(
  items: PluginCatalogItem[],
  nowIso: string = new Date().toISOString(),
): SanitizedPluginManifest {
  return {
    exportedAt: nowIso,
    count: items.length,
    plugins: items.map((item) => {
      const secretKeys = new Set(
        (item.configSchema || []).filter((f) => f.type === 'secret').map((f) => f.key),
      );
      const cleanConfig: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(item.config || {})) {
        if (secretKeys.has(k) || SECRET_KEY_RE.test(k)) {
          cleanConfig[k] = v ? '<REDACTED>' : '';
        } else {
          cleanConfig[k] = v;
        }
      }
      return {
        id: item.id,
        name: item.name,
        version: item.version,
        category: item.category,
        source: item.source,
        enabled: item.enabled,
        protocol: item.officialSpec?.protocol || '',
        config: cleanConfig,
      };
    }),
  };
}

export type AuditOutcomeFilter = 'all' | 'ok' | 'fail';

export function isAuditEntryFailed(entry: AuditEntry): boolean {
  return entry.ok === false || entry.status === 'error';
}

export function filterAuditEntries(
  entries: AuditEntry[],
  opts: { query?: string; outcome?: AuditOutcomeFilter },
): AuditEntry[] {
  const q = String(opts.query || '').trim().toLowerCase();
  const outcome = opts.outcome || 'all';
  return entries.filter((item) => {
    const failed = isAuditEntryFailed(item);
    if (outcome === 'ok' && failed) return false;
    if (outcome === 'fail' && !failed) return false;
    if (!q) return true;
    const haystack = [
      item.action,
      item.target,
      item.actor,
      item.result,
      item.detail,
      item.ip,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

function escapeCsvCell(raw: unknown): string {
  const s = raw == null ? '' : String(raw);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function auditEntriesToCsv(entries: AuditEntry[]): string {
  const header = ['timestamp', 'actor', 'action', 'target', 'outcome', 'durationMs', 'detail'];
  const rows = entries.map((item) =>
    [
      item.ts || item.timestamp || '',
      item.actor || '',
      item.action || '',
      item.target || '',
      isAuditEntryFailed(item) ? 'failed' : item.result || 'ok',
      item.durationMs != null ? String(item.durationMs) : '',
      item.detail || '',
    ]
      .map(escapeCsvCell)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

export interface OverviewPanelPrefs {
  metrics: boolean;
  cache: boolean;
  graph: boolean;
  connectors: boolean;
  storageEvents: boolean;
}

export const DEFAULT_OVERVIEW_PREFS: OverviewPanelPrefs = {
  metrics: true,
  cache: true,
  graph: true,
  connectors: true,
  storageEvents: true,
};

export function parseOverviewPrefs(raw: string | null | undefined): OverviewPanelPrefs {
  if (!raw) return { ...DEFAULT_OVERVIEW_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<OverviewPanelPrefs>;
    return {
      metrics: typeof parsed.metrics === 'boolean' ? parsed.metrics : true,
      cache: typeof parsed.cache === 'boolean' ? parsed.cache : true,
      graph: typeof parsed.graph === 'boolean' ? parsed.graph : true,
      connectors: typeof parsed.connectors === 'boolean' ? parsed.connectors : true,
      storageEvents: typeof parsed.storageEvents === 'boolean' ? parsed.storageEvents : true,
    };
  } catch {
    return { ...DEFAULT_OVERVIEW_PREFS };
  }
}
