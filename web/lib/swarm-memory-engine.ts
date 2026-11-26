import type { A2ACollaborationLog, A2AEngramEntry } from '../types';

export interface EngramUCurvePoint {
  memoryPct: number;
  computePct: number;
  efficiencyPct: number;
  tokenSavingsPct: number;
  isOptimal: boolean;
  isCurrent: boolean;
}

export interface Sm2ReviewPreview {
  nextIntervalHours: number;
  nextEaseFactor: number;
  nextRepetitions: number;
  label: string;
}

export interface CollaborationLogFilters {
  agentId?: string;
  eventType?: string;
  level?: string;
  q?: string;
}

/**
 * Generates DeepSeek Engram's U-shaped scaling efficiency curve across
 * Conditional Memory (10%–50%) vs Dynamic Compute (90%–50%), peaking at 25%/75%.
 */
export function buildEngramUCurveSeries(currentMemoryRatioPct: number): EngramUCurvePoint[] {
  const clampedCurrent = Math.max(10, Math.min(50, Math.round(currentMemoryRatioPct / 5) * 5));
  const points: EngramUCurvePoint[] = [];
  for (let memoryPct = 10; memoryPct <= 50; memoryPct += 5) {
    const computePct = 100 - memoryPct;
    const dist = Math.abs(memoryPct - 25);
    // U-shaped loss -> inverted bell efficiency peaking cleanly at 25% memory / 75% compute
    const penalty = dist * 0.65 + Math.pow(dist / 10, 2) * 2.2;
    const efficiencyPct = Math.max(72, Math.min(98, Math.round(97 - penalty)));
    const tokenSavingsPct = Math.min(40, Math.round(memoryPct * 1.15 - Math.max(0, memoryPct - 30) * 0.7));
    points.push({
      memoryPct,
      computePct,
      efficiencyPct,
      tokenSavingsPct,
      isOptimal: memoryPct === 25,
      isCurrent: memoryPct === clampedCurrent,
    });
  }
  return points;
}

/**
 * Pure SuperMemo SM-2 preview helper so operators see the projected next
 * review interval and ease factor before clicking Reinforce / Good / Retrain.
 */
export function computeSm2Preview(
  entry: Pick<A2AEngramEntry, 'easeFactor' | 'intervalHours' | 'repetitions'>,
  quality: number,
): Sm2ReviewPreview {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let ef = Number(entry.easeFactor) || 2.5;
  let reps = Number(entry.repetitions) || 0;
  let intervalHours = Number(entry.intervalHours) || 24;

  if (q < 3) {
    reps = 0;
    intervalHours = 6;
    ef = Math.max(1.3, Number((ef - 0.2).toFixed(2)));
  } else {
    ef = Math.max(1.3, Number((ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))).toFixed(2)));
    reps += 1;
    if (reps === 1) intervalHours = 12;
    else if (reps === 2) intervalHours = 36;
    else intervalHours = Math.min(24 * 30, Math.round(intervalHours * ef));
  }

  return {
    nextIntervalHours: intervalHours,
    nextEaseFactor: ef,
    nextRepetitions: reps,
    label: intervalHours >= 24 ? `${Math.round((intervalHours / 24) * 10) / 10}d` : `${intervalHours}h`,
  };
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
      const hay = `${entry.sourceAgentName} ${entry.targetAgentName} ${entry.eventType} ${entry.summary} ${entry.detail} ${entry.contextId || ''} ${entry.engramHitKey || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function formatIntervalHuman(hours: number): string {
  const safe = Math.max(1, Math.round(hours || 0));
  if (safe >= 48) return `${Math.round((safe / 24) * 10) / 10} 天`;
  return `${safe} 小时`;
}

export function getLogEventMeta(eventType: string): { label: string; group: string; toneClass: string } {
  switch (eventType) {
    case 'swarm.fanout':
      return { label: '蜂群扇出', group: 'swarm', toneClass: 'text-indigo-500 dark:text-indigo-400' };
    case 'a2a.delegate':
      return { label: 'A2A 委派', group: 'a2a', toneClass: 'text-sky-600 dark:text-sky-400' };
    case 'dsh.review_vote':
      return { label: 'DSH 团队投票', group: 'dsh', toneClass: 'text-violet-600 dark:text-violet-400' };
    case 'dsh.gate_verdict':
      return { label: 'DSH 门禁裁决', group: 'dsh', toneClass: 'text-emerald-600 dark:text-emerald-400' };
    case 'memory.engram_hit':
      return { label: 'Engram 命中', group: 'memory', toneClass: 'text-amber-600 dark:text-amber-400' };
    case 'memory.sm_consolidate':
      return { label: 'SM-2 巩固', group: 'memory', toneClass: 'text-teal-600 dark:text-teal-400' };
    case 'session.sync':
    case 'session.handoff':
      return { label: '跨端同步', group: 'session', toneClass: 'text-slate-600 dark:text-slate-400' };
    default:
      return { label: eventType || '协作事件', group: 'other', toneClass: 'text-[var(--ink-subtle)]' };
  }
}
