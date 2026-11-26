import type { FleetNode, LogEntry, ServiceItem, StatusTone } from '../types';

export function statusTone(status?: string | null): StatusTone {
  const s = String(status || 'standby').toLowerCase();
  if (s === 'healthy' || s === 'active' || s === 'ok' || s === 'online' || s === 'running' || s === 'ready') {
    return 'ok';
  }
  if (s === 'degraded' || s === 'warning' || s === 'warn' || s === 'stale' || s === 'activating' || s === 'reloading') {
    return 'warn';
  }
  if (s === 'failed' || s === 'error' || s === 'offline' || s === 'critical' || s === 'down') {
    return 'err';
  }
  return 'muted';
}

export function statusLabel(status?: string | null): string {
  const s = String(status || 'standby').toLowerCase();
  if (s === 'healthy' || s === 'active' || s === 'ok' || s === 'running' || s === 'ready') return '健康';
  if (s === 'online') return '在线';
  if (s === 'degraded' || s === 'warning' || s === 'warn') return '降级';
  if (s === 'stale') return '延迟';
  if (s === 'activating' || s === 'reloading') return '启动中';
  if (s === 'standby' || s === 'inactive' || s === 'disabled' || s === 'idle') return '待机';
  if (s === 'offline' || s === 'down') return '离线';
  return '故障';
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(Number(bytes))) return '-';
  const num = Number(bytes);
  if (num < 1024) return `${Math.round(num)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let val = num / 1024;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

export function formatInteger(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  return Math.round(Number(value)).toLocaleString('en-US');
}

export function formatCompactNumber(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return '-';
  const num = Number(value);
  const abs = Math.abs(num);
  if (abs < 10_000) return Math.round(num).toLocaleString('en-US');
  if (abs < 1_000_000) return `${(num / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  if (abs < 1_000_000_000) return `${(num / 1_000_000).toFixed(abs >= 100_000_000 ? 0 : 2)}M`;
  return `${(num / 1_000_000_000).toFixed(2)}B`;
}

export function formatUptime(sec?: number | null): string {
  if (sec == null || !Number.isFinite(Number(sec))) return '-';
  const total = Math.max(0, Math.floor(Number(sec)));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatRelativeAge(ts?: string | number | null, ageSec?: number | null): string {
  let diff = typeof ageSec === 'number' && Number.isFinite(ageSec) ? ageSec : NaN;
  if (!Number.isFinite(diff) && ts) {
    const parsed = typeof ts === 'number' ? ts : Date.parse(ts);
    if (Number.isFinite(parsed)) {
      diff = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
    }
  }
  if (!Number.isFinite(diff)) return '-';
  if (diff < 15) return '刚刚';
  if (diff < 60) return `${Math.round(diff)}s 前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m 前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h 前`;
  return `${Math.floor(diff / 86400)}d 前`;
}

export function formatClock(ts?: string | number | null): string {
  if (!ts) return '-';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

export function formatDateTime(ts?: string | number | null): string {
  if (!ts) return '-';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export function deviceTypeLabel(type?: string | null): string {
  const t = String(type || 'server').toLowerCase();
  if (t === 'hub') return '控制中枢';
  if (t === 'laptop') return '笔记本';
  if (t === 'mobile') return '移动端';
  return '服务器';
}

export function layerLabel(layer?: string | null): string {
  const l = String(layer || '').toLowerCase();
  if (l === 'core' || l === 'app' || l === 'entry') return '核心';
  if (l === 'memory') return '记忆';
  if (l === 'gateway' || l === 'agents' || l === 'agent') return '网关与 Agent';
  if (l === 'network' || l === 'infra') return '网络';
  return layer || '服务';
}

export function filterServices(
  items: ServiceItem[],
  opts: { layer: string; status: string; query: string },
): ServiceItem[] {
  const q = opts.query.trim().toLowerCase();
  return items.filter((svc) => {
    if (opts.layer && opts.layer !== 'all') {
      const l = String(svc.layer || '').toLowerCase();
      if (opts.layer === 'core' && !['core', 'app', 'entry'].includes(l)) return false;
      if (opts.layer === 'memory' && l !== 'memory') return false;
      if (opts.layer === 'agents' && !['agents', 'agent', 'gateway'].includes(l)) return false;
      if (opts.layer === 'network' && !['network', 'infra'].includes(l)) return false;
    }
    if (opts.status && opts.status !== 'all') {
      const tone = statusTone(svc.status);
      if (opts.status === 'healthy' && tone !== 'ok') return false;
      if (opts.status === 'degraded' && tone !== 'warn') return false;
      if (opts.status === 'failed' && tone !== 'err') return false;
      if (opts.status === 'standby' && tone !== 'muted') return false;
    }
    if (q) {
      const hay = [svc.id, svc.name, svc.unit, svc.role, ...(svc.ports || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function filterFleetNodes(nodes: FleetNode[], typeFilter: string): FleetNode[] {
  if (!typeFilter || typeFilter === 'all') return nodes;
  return nodes.filter((n) => {
    const dt = String(n.deviceType || 'server').toLowerCase();
    if (typeFilter === 'server') return dt === 'server' || dt === 'hub';
    return dt === typeFilter;
  });
}

export function countLogLevels(entries: LogEntry[]): {
  total: number;
  error: number;
  warn: number;
  info: number;
  debug: number;
} {
  let error = 0;
  let warn = 0;
  let info = 0;
  let debug = 0;
  for (const e of entries) {
    const lv = String(e.level || e.severity || 'info').toLowerCase();
    if (lv.includes('err') || lv.includes('crit') || lv.includes('fatal') || lv.includes('alert')) {
      error += 1;
    } else if (lv.includes('warn')) {
      warn += 1;
    } else if (lv.includes('debug') || lv.includes('trace')) {
      debug += 1;
    } else {
      info += 1;
    }
  }
  return { total: entries.length, error, warn, info, debug };
}

export function clampPercent(val?: number | null): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type LatencyTier = 'fast' | 'good' | 'moderate' | 'slow' | 'critical';

export interface LatencyScaleInfo {
  tier: LatencyTier;
  label: string;
  pct: number;
  ms: number;
}

/**
 * Maps service probe response latency (ms) to a perceptually calibrated
 * logarithmic percentage (8%..100%) and 5-tier color intensity scale so
 * sub-15ms local probes and slower upstream bottlenecks both read clearly.
 */
export function classifyLatency(latencyMs?: number | null): LatencyScaleInfo | null {
  if (latencyMs == null || !Number.isFinite(Number(latencyMs))) return null;
  const ms = Math.max(0, Number(latencyMs));
  // Log-calibrated visual bar: 0ms -> 8%, 5ms -> 34%, 15ms -> 53%, 50ms -> 77%, 150ms+ -> 100%
  const rawPct = 8 + (Math.log1p(ms) / Math.log1p(150)) * 92;
  const pct = Math.max(8, Math.min(100, Math.round(rawPct)));

  if (ms <= 5) {
    return { tier: 'fast', label: '极快', pct, ms };
  }
  if (ms <= 12) {
    return { tier: 'good', label: '流畅', pct, ms };
  }
  if (ms <= 30) {
    return { tier: 'moderate', label: '适中', pct, ms };
  }
  if (ms <= 80) {
    return { tier: 'slow', label: '偏慢', pct, ms };
  }
  return { tier: 'critical', label: '瓶颈', pct, ms };
}

