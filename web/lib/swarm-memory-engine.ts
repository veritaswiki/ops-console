import type {
  A2ACollaborationLog,
  A2AContextSpillNode,
  A2ASuperAgentTicket,
  A2ATriggerEvent,
} from '../types';

export interface TriggerPathBucket {
  key: 'fast_drop' | 'fast_passthrough' | 'slow_spawn';
  label: string;
  count: number;
  pct: number;
  tokensSaved: number;
}

export interface TriggerPathBreakdown {
  items: TriggerPathBucket[];
  total: number;
  offloadPct: number;
  totalTokensSaved: number;
}

export interface ContextSpillStats {
  inlineBytes: number;
  spilledBytes: number;
  inlineKb: number;
  spilledKb: number;
  totalKb: number;
  offloadPct: number;
  overBudget: boolean;
  totalRecalls: number;
  spilledCount: number;
  inlineCount: number;
}

export interface AttentionBudgetState {
  active: number;
  stalled: number;
  reviewGate: number;
  needsAttention: number;
  limit: number;
  utilizationPct: number;
  tone: 'ok' | 'warn' | 'err';
}

export interface CollaborationLogFilters {
  agentId?: string;
  eventType?: string;
  level?: string;
  q?: string;
}

/**
 * Aggregates Fast/Slow Path trigger routing outcomes into chart-ready buckets
 * so operators can track deterministic code offload vs thin-router LLM spawns.
 */
export function buildTriggerPathBreakdown(events: A2ATriggerEvent[]): TriggerPathBreakdown {
  const counts: Record<TriggerPathBucket['key'], { count: number; tokensSaved: number }> = {
    fast_drop: { count: 0, tokensSaved: 0 },
    fast_passthrough: { count: 0, tokensSaved: 0 },
    slow_spawn: { count: 0, tokensSaved: 0 },
  };

  for (const ev of events || []) {
    const key: TriggerPathBucket['key'] =
      ev.decision === 'fast_drop'
        ? 'fast_drop'
        : ev.decision === 'fast_passthrough'
          ? 'fast_passthrough'
          : 'slow_spawn';
    counts[key].count += 1;
    counts[key].tokensSaved += Math.max(0, Number(ev.tokensSaved) || 0);
  }

  const total = counts.fast_drop.count + counts.fast_passthrough.count + counts.slow_spawn.count;
  const pctOf = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const items: TriggerPathBucket[] = [
    {
      key: 'fast_drop',
      label: 'Fast Drop 直滤',
      count: counts.fast_drop.count,
      pct: pctOf(counts.fast_drop.count),
      tokensSaved: counts.fast_drop.tokensSaved,
    },
    {
      key: 'fast_passthrough',
      label: '订阅直通 Worker',
      count: counts.fast_passthrough.count,
      pct: pctOf(counts.fast_passthrough.count),
      tokensSaved: counts.fast_passthrough.tokensSaved,
    },
    {
      key: 'slow_spawn',
      label: '薄 Router 派单',
      count: counts.slow_spawn.count,
      pct: pctOf(counts.slow_spawn.count),
      tokensSaved: counts.slow_spawn.tokensSaved,
    },
  ];

  const offloadCount = counts.fast_drop.count + counts.fast_passthrough.count;
  const totalTokensSaved =
    counts.fast_drop.tokensSaved + counts.fast_passthrough.tokensSaved + counts.slow_spawn.tokensSaved;

  return {
    items,
    total,
    offloadPct: pctOf(offloadCount),
    totalTokensSaved,
  };
}

/**
 * Computes Inline vs Spilled context window budget usage across Chain of Recall nodes.
 */
export function computeContextSpillStats(
  nodes: A2AContextSpillNode[],
  inlineBudgetKb = 32,
): ContextSpillStats {
  let inlineBytes = 0;
  let spilledBytes = 0;
  let totalRecalls = 0;
  let spilledCount = 0;
  let inlineCount = 0;

  for (const node of nodes || []) {
    const bytes = Math.max(0, Number(node.bytes) || 0);
    totalRecalls += Math.max(0, Number(node.recallCount) || 0);
    if (node.state === 'inline') {
      inlineBytes += bytes;
      inlineCount += 1;
    } else {
      spilledBytes += bytes;
      spilledCount += 1;
    }
  }

  const totalBytes = inlineBytes + spilledBytes;
  const inlineKb = Math.round((inlineBytes / 1024) * 10) / 10;
  const spilledKb = Math.round((spilledBytes / 1024) * 10) / 10;
  const totalKb = Math.round((totalBytes / 1024) * 10) / 10;
  const offloadPct = totalBytes > 0 ? Math.round((spilledBytes / totalBytes) * 100) : 0;
  const safeBudgetKb = Math.max(1, Number(inlineBudgetKb) || 32);

  return {
    inlineBytes,
    spilledBytes,
    inlineKb,
    spilledKb,
    totalKb,
    offloadPct,
    overBudget: inlineKb > safeBudgetKb,
    totalRecalls,
    spilledCount,
    inlineCount,
  };
}

/**
 * Summarizes SuperAgent isolated tickets against the operator attention budget limit.
 */
export function computeAttentionBudgetState(
  tickets: A2ASuperAgentTicket[],
  limit = 4,
): AttentionBudgetState {
  const safeLimit = Math.max(1, Math.round(Number(limit) || 4));
  let active = 0;
  let stalled = 0;
  let reviewGate = 0;
  let needsAttention = 0;

  for (const t of tickets || []) {
    if (t.status !== 'completed') active += 1;
    const isStalled = t.status === 'stalled' || t.watchdogState === 'stalled';
    if (isStalled) stalled += 1;
    if (t.status === 'review_gate') reviewGate += 1;
    if (isStalled || t.status === 'needs_attention' || t.status === 'review_gate') {
      needsAttention += 1;
    }
  }

  const utilizationPct = Math.min(100, Math.round((needsAttention / safeLimit) * 100));
  const tone: 'ok' | 'warn' | 'err' =
    stalled > 0 || needsAttention > safeLimit
      ? 'err'
      : needsAttention >= safeLimit
        ? 'warn'
        : 'ok';

  return {
    active,
    stalled,
    reviewGate,
    needsAttention,
    limit: safeLimit,
    utilizationPct,
    tone,
  };
}

export function formatBytesKb(bytes: number): string {
  const safe = Math.max(0, Number(bytes) || 0);
  if (safe < 1024) return `${Math.round(safe)} B`;
  const kb = safe / 1024;
  return kb >= 100 ? `${Math.round(kb)} KB` : `${Math.round(kb * 10) / 10} KB`;
}

/**
 * Filters real-time collaboration log events on the client cleanly so SSE frames
 * stay consistent with active Agent / Event Type / Level / Search controls.
 */
export function filterCollaborationLogs(
  logs: A2ACollaborationLog[],
  filters: CollaborationLogFilters,
): A2ACollaborationLog[] {
  const agentId = (filters.agentId || '').trim();
  const eventType = (filters.eventType || '').trim();
  const level = (filters.level || '').trim().toLowerCase();
  const q = (filters.q || '').trim().toLowerCase();

  return logs.filter((entry) => {
    if (agentId && agentId !== 'all') {
      if (entry.sourceAgentId !== agentId && entry.targetAgentId !== agentId) return false;
    }
    if (eventType && eventType !== 'all') {
      if (entry.eventType !== eventType && !entry.eventType.startsWith(`${eventType}.`)) return false;
    }
    if (level && level !== 'all' && entry.level !== level) return false;
    if (q) {
      const hay = `${entry.sourceAgentName} ${entry.targetAgentName} ${entry.eventType} ${entry.summary} ${entry.detail} ${entry.contextId || ''} ${entry.worktreeBranch || ''} ${entry.spillRefId || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getLogEventMeta(eventType: string): { label: string; group: string; toneClass: string } {
  switch (eventType) {
    case 'superagent.fast_path':
      return { label: 'Fast Path 直滤', group: 'superagent', toneClass: 'text-emerald-600 dark:text-emerald-400' };
    case 'superagent.route':
      return { label: '薄 Router 派单', group: 'superagent', toneClass: 'text-indigo-500 dark:text-indigo-400' };
    case 'context.spill':
      return { label: '上下文 Spill', group: 'context', toneClass: 'text-amber-600 dark:text-amber-400' };
    case 'context.recall':
      return { label: 'Chain of Recall', group: 'context', toneClass: 'text-teal-600 dark:text-teal-400' };
    case 'watchdog.check':
      return { label: 'Watchdog 巡检', group: 'watchdog', toneClass: 'text-rose-600 dark:text-rose-400' };
    case 'swarm.fanout':
      return { label: '蜂群扇出', group: 'swarm', toneClass: 'text-indigo-500 dark:text-indigo-400' };
    case 'a2a.delegate':
      return { label: 'A2A 委派', group: 'a2a', toneClass: 'text-sky-600 dark:text-sky-400' };
    case 'dsh.review_vote':
      return { label: 'DSH 团队投票', group: 'dsh', toneClass: 'text-violet-600 dark:text-violet-400' };
    case 'dsh.gate_verdict':
      return { label: 'DSH 门禁裁决', group: 'dsh', toneClass: 'text-emerald-600 dark:text-emerald-400' };
    case 'session.sync':
    case 'session.handoff':
      return { label: '跨端同步', group: 'session', toneClass: 'text-slate-600 dark:text-slate-400' };
    default:
      return { label: eventType || '协作事件', group: 'other', toneClass: 'text-[var(--ink-subtle)]' };
  }
}
