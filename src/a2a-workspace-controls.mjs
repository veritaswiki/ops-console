import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { redactText } from './redact.mjs';

export const INLINE_OUTPUT_MAX_CHARS = 4000;
export const MAX_QUEUED_TURNS = 20;
export const MAX_STEER_NOTES = 20;
export const THREAD_RELATIONS = ['root', 'fork', 'fresh-context', 'btw', 'subtask'];

export const SPILL_ID_RE = /^[A-Za-z0-9._-]{4,80}$/;
export const DEFAULT_CONTEXT_MAX_TOKENS = 128000;
export const MAX_MEMORY_SPILLS = 120;

const VALID_RELATIONS = new Set(THREAD_RELATIONS);
const ACTIVE_STATES = new Set(['working', 'failed']);
const SETTLED_STATES = new Set(['completed', 'failed']);
const CHARS_PER_TOKEN = 4;

function cleanString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function cleanNullableId(value) {
  const clean = cleanString(value);
  return clean ? clean.slice(0, 80) : null;
}

function timestampMs(value) {
  if (typeof value !== 'string' || !value.trim()) return Number.NaN;
  return Date.parse(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function estimateCharsTokens(text) {
  const chars = typeof text === 'string' ? text.length : 0;
  return chars > 0 ? Math.ceil(chars / CHARS_PER_TOKEN) : 0;
}

export function computeThreadAttention(task = {}, { pendingBtwCount = 0, nowMs = Date.now() } = {}) {
  const safeTask = task && typeof task === 'object' ? task : {};
  const state = cleanString(safeTask.state);
  const lastActivityAt = cleanString(safeTask.lastActivityAt)
    || cleanString(safeTask.updatedAt)
    || cleanString(safeTask.createdAt)
    || null;
  const readWatermarkAt = cleanNullableId(safeTask.readWatermarkAt);
  const snoozedAt = cleanNullableId(safeTask.snoozedAt);
  const snoozedUntil = cleanNullableId(safeTask.snoozedUntil);
  const pending = Number.isFinite(Number(pendingBtwCount)) ? Math.max(0, Math.trunc(Number(pendingBtwCount))) : 0;

  let unread = false;
  if (!cleanString(safeTask.settledAt)) {
    const lastMs = timestampMs(lastActivityAt);
    const watermarkMs = timestampMs(readWatermarkAt);
    if (Number.isFinite(watermarkMs)) {
      unread = Number.isFinite(lastMs) ? lastMs > watermarkMs : false;
    } else {
      unread = ACTIVE_STATES.has(state) || pending > 0;
    }
  }

  const untilMs = timestampMs(snoozedUntil);
  const snoozedAtMs = timestampMs(snoozedAt);
  const lastMs = timestampMs(lastActivityAt);
  const snoozeActive = Number.isFinite(untilMs) && untilMs > nowMs;
  const snoozeWokenEarly = Boolean(
    snoozeActive
      && Number.isFinite(snoozedAtMs)
      && (
        pending > 0
        || (SETTLED_STATES.has(state) && Number.isFinite(lastMs) && lastMs > snoozedAtMs)
      ),
  );
  const snoozed = Boolean(snoozeActive && !snoozeWokenEarly);

  const reasons = [];
  if (pending > 0) reasons.push('pending_btw');
  if (state === 'failed') reasons.push('task_failed');
  if (snoozeWokenEarly) reasons.push('snooze_woken');
  if (unread) reasons.push('unread_update');

  return {
    unread,
    snoozed,
    snoozeWokenEarly,
    needsAttention: !snoozed && reasons.length > 0,
    reasons,
  };
}

export function estimateContextBudget(task = {}) {
  const safeTask = task && typeof task === 'object' ? task : {};
  const compactions = asArray(safeTask.compactions);
  const configuredMax = Number(safeTask.contextBudget?.maxTokens);
  const maxTokens = Number.isFinite(configuredMax) && configuredMax > 0
    ? Math.trunc(configuredMax)
    : DEFAULT_CONTEXT_MAX_TOKENS;

  let compactedUpToStepIndex = -1;
  for (const compaction of compactions) {
    const index = Number(compaction?.compactedUpToStepIndex);
    if (Number.isFinite(index) && index > compactedUpToStepIndex) {
      compactedUpToStepIndex = Math.trunc(index);
    }
  }

  let chars = 0;
  chars += typeof safeTask.prompt === 'string' ? safeTask.prompt.length : 0;
  const steps = asArray(safeTask.steps);
  for (const step of steps.slice(compactedUpToStepIndex + 1)) {
    chars += typeof step?.detail === 'string' ? step.detail.length : 0;
    chars += typeof step?.state === 'string' ? step.state.length : 0;
  }
  for (const compaction of compactions) {
    chars += typeof compaction?.summary === 'string' ? compaction.summary.length : 0;
  }
  chars += typeof safeTask.artifact === 'string' ? safeTask.artifact.slice(0, 240).length : 0;

  const estimatedTokens = Math.ceil(chars / CHARS_PER_TOKEN);
  const usagePct = maxTokens > 0
    ? Math.min(999, Math.round((estimatedTokens / maxTokens) * 1000) / 10)
    : 0;

  return {
    estimatedTokens,
    maxTokens,
    usagePct,
    compactedCount: compactions.length,
  };
}

export function normalizeTaskWorkspaceFields(task, { pendingBtwCount = 0 } = {}) {
  if (!task || typeof task !== 'object') return task;

  const parentThreadId = cleanNullableId(task.parentThreadId)
    || cleanNullableId(task.parentTaskId);
  task.parentThreadId = parentThreadId;
  task.rootThreadId = cleanNullableId(task.rootThreadId)
    || parentThreadId
    || cleanNullableId(task.id);

  const existingRelation = cleanString(task.relation);
  if (task.isSideThread) {
    task.relation = 'btw';
  } else if (VALID_RELATIONS.has(existingRelation)) {
    task.relation = existingRelation;
  } else if (task.parentTaskId) {
    task.relation = 'subtask';
  } else {
    task.relation = 'root';
  }

  task.queuedTurns = asArray(task.queuedTurns);
  task.steeringNotes = asArray(task.steeringNotes);
  task.settledAt = cleanNullableId(task.settledAt);
  task.snoozedAt = cleanNullableId(task.snoozedAt);
  task.snoozedUntil = cleanNullableId(task.snoozedUntil);
  task.readWatermarkAt = cleanNullableId(task.readWatermarkAt);

  task.lastActivityAt = cleanNullableId(task.lastActivityAt)
    || cleanNullableId(task.updatedAt)
    || cleanNullableId(task.createdAt)
    || new Date().toISOString();

  task.compactions = asArray(task.compactions);
  task.outputSpills = asArray(task.outputSpills);
  task.contextBudget = estimateContextBudget(task);
  task.attention = computeThreadAttention(task, { pendingBtwCount });
  return task;
}

async function writeSpillFile({ dataDir, spillId, content }) {
  const spillDir = path.join(dataDir, 'blobs', 'a2a-spills');
  await fs.mkdir(spillDir, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') {
    await fs.chmod(spillDir, 0o700).catch(() => {});
  }
  const filePath = path.join(spillDir, `${spillId}.txt`);
  await fs.writeFile(filePath, content, { mode: 0o600 });
  if (process.platform !== 'win32') {
    await fs.chmod(filePath, 0o600).catch(() => {});
  }
  return filePath;
}

function rememberSpill(memorySpills, spillId, content) {
  if (!(memorySpills instanceof Map)) return;
  memorySpills.set(spillId, content);
  while (memorySpills.size > MAX_MEMORY_SPILLS) {
    const oldest = memorySpills.keys().next();
    if (oldest.done) break;
    memorySpills.delete(oldest.value);
  }
}

export async function truncateInlineWithSpill({
  text,
  taskId,
  label,
  dataDir,
  memorySpills,
  maxChars = INLINE_OUTPUT_MAX_CHARS,
}) {
  const redacted = redactText(text);
  const limit = Number.isFinite(Number(maxChars)) && Number(maxChars) > 0
    ? Math.trunc(Number(maxChars))
    : INLINE_OUTPUT_MAX_CHARS;
  if (redacted.length <= limit) {
    return { text: redacted, truncated: false, spillRef: null };
  }

  const spillId = `spill-${crypto.randomBytes(6).toString('hex')}`;
  if (typeof dataDir === 'string' && dataDir.trim()) {
    await writeSpillFile({ dataDir, spillId, content: redacted });
  }
  rememberSpill(memorySpills, spillId, redacted);

  const spillRef = {
    id: spillId,
    taskId: cleanNullableId(taskId),
    label: redactText(String(label || 'output')).slice(0, 80),
    bytes: Buffer.byteLength(redacted, 'utf8'),
    preview: redacted.slice(0, 240),
    truncated: true,
    createdAt: new Date().toISOString(),
  };

  return {
    text: `${redacted.slice(0, limit)}\n... [truncated, spillRef=${spillId}]`,
    truncated: true,
    spillRef,
  };
}

export async function readSpillPayload({ spillId, taskId, dataDir, memorySpills }) {
  const id = cleanString(spillId);
  if (!SPILL_ID_RE.test(id)) return null;

  if (memorySpills instanceof Map && memorySpills.has(id)) {
    const cached = memorySpills.get(id);
    if (typeof cached === 'string') {
      return { ok: true, content: cached };
    }
    if (cached && typeof cached.content === 'string') {
      if (cached.taskId && taskId && cached.taskId !== taskId) return null;
      return { ok: true, content: cached.content };
    }
  }

  if (typeof dataDir !== 'string' || !dataDir.trim()) return null;
  const spillDir = path.resolve(dataDir, 'blobs', 'a2a-spills');
  const filePath = path.resolve(spillDir, `${id}.txt`);
  if (path.dirname(filePath) !== spillDir) return null;
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { ok: true, content };
  } catch {
    return null;
  }
}

function matchesQuery(task, query) {
  if (!query) return true;
  const haystack = [
    task.id,
    task.prompt,
    task.contextId,
    task.workerAgentName,
    task.leadAgentName,
    task.matchedSkill,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

export function paginateTasks(tasks, {
  limit = 30,
  offset = 0,
  state = '',
  attentionOnly = false,
  q = '',
} = {}) {
  const safeLimitRaw = Number(limit);
  const safeLimit = Number.isFinite(safeLimitRaw) ? Math.min(100, Math.max(1, Math.trunc(safeLimitRaw))) : 30;
  const safeOffsetRaw = Number(offset);
  const safeOffset = Number.isFinite(safeOffsetRaw) && safeOffsetRaw > 0 ? Math.trunc(safeOffsetRaw) : 0;
  const stateFilter = cleanString(state);
  const query = cleanString(q).toLowerCase();

  const filtered = asArray(tasks)
    .filter((task) => {
      if (!task || typeof task !== 'object') return false;
      if (stateFilter && stateFilter !== 'all' && cleanString(task.state) !== stateFilter) return false;
      if (attentionOnly) {
        const attention = task.attention || computeThreadAttention(task);
        if (!attention?.needsAttention) return false;
      }
      return matchesQuery(task, query);
    })
    .sort((first, second) => {
      const firstMs = timestampMs(first.lastActivityAt || first.updatedAt || first.createdAt);
      const secondMs = timestampMs(second.lastActivityAt || second.updatedAt || second.createdAt);
      const safeFirst = Number.isFinite(firstMs) ? firstMs : 0;
      const safeSecond = Number.isFinite(secondMs) ? secondMs : 0;
      if (safeFirst !== safeSecond) return safeSecond - safeFirst;
      return String(second.id || '').localeCompare(String(first.id || ''));
    });

  const items = filtered.slice(safeOffset, safeOffset + safeLimit);
  return {
    items,
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
    hasMore: safeOffset + items.length < filtered.length,
  };
}
