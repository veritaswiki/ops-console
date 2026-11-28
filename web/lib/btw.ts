import type {
  A2ABtwMergeTarget,
  A2ABtwStatus,
  A2ABtwSummary,
  A2ABtwThread,
} from '../types';

export type BtwTone = 'neutral' | 'warn' | 'accent' | 'ok' | 'err' | 'muted';

export interface BtwStatusMeta {
  label: string;
  tone: BtwTone;
  description: string;
}

export const BTW_STATUS_META: Record<A2ABtwStatus, BtwStatusMeta> = {
  open: {
    label: '进行中',
    tone: 'accent',
    description: '旁支仍在隔离上下文中讨论，尚未提出并入申请。',
  },
  pending_approval: {
    label: '待审批',
    tone: 'warn',
    description: '并入申请已提交，等待主线负责人审批。',
  },
  approved: {
    label: '已批准待并入',
    tone: 'ok',
    description: '审批已通过，可由主线执行并入动作。',
  },
  merged: {
    label: '已并入主线',
    tone: 'neutral',
    description: '结论已写入主线，旁支保留为只读记录。',
  },
  rejected: {
    label: '已驳回',
    tone: 'err',
    description: '并入申请被驳回，可补充依据后重新提交。',
  },
  archived: {
    label: '已归档',
    tone: 'muted',
    description: '旁支已归档，不再参与审批与并入。',
  },
};

export interface BtwMergeTargetOption {
  id: A2ABtwMergeTarget;
  label: string;
  hint: string;
}

export const BTW_MERGE_TARGET_OPTIONS: readonly BtwMergeTargetOption[] = [
  {
    id: 'session_context',
    label: '会话上下文',
    hint: '把结论写入主线会话记忆，后续轮次可直接引用。',
  },
  {
    id: 'task_step',
    label: '任务步骤',
    hint: '作为执行步骤追加到主线任务时间线，保留先后顺序。',
  },
  {
    id: 'pr_draft',
    label: 'PR 草稿',
    hint: '生成独立分支与 PR 草稿，先走代码评审再合入。',
  },
];

export interface BtwThreadFilters {
  sessionId?: string | null;
  taskId?: string | null;
  status?: string | null;
  onlyAttention?: boolean;
  query?: string;
}

export type BtwAttentionCounts = Pick<
  A2ABtwSummary,
  'total' | 'open' | 'pendingApproval' | 'approved' | 'merged' | 'attentionCount'
>;

const SUMMARY_MAX_LENGTH = 160;
const SORT_PRIORITY: Record<string, number> = {
  pending_approval: 0,
  approved: 1,
};

function normalizeStatus(status?: string | null): string {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

function normalizeId(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isBtwStatus(value: string): value is A2ABtwStatus {
  return Object.prototype.hasOwnProperty.call(BTW_STATUS_META, value);
}

function isAttentionStatus(status?: string | null): boolean {
  const normalized = normalizeStatus(status);
  return normalized === 'pending_approval' || normalized === 'approved';
}

function parseTimestamp(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortPriority(status?: string | null): number {
  return SORT_PRIORITY[normalizeStatus(status)] ?? 2;
}

function compareBtwThreads(left: A2ABtwThread, right: A2ABtwThread): number {
  const priorityDelta = sortPriority(left.status) - sortPriority(right.status);
  if (priorityDelta !== 0) return priorityDelta;
  const timeDelta = parseTimestamp(right.updatedAt) - parseTimestamp(left.updatedAt);
  if (timeDelta !== 0) return timeDelta;
  return right.id.localeCompare(left.id);
}

function buildSearchText(thread: A2ABtwThread): string {
  const fields: Array<string | null | undefined> = [
    thread.id,
    thread.title,
    thread.sessionId,
    thread.taskId,
    thread.targetAgentId,
    thread.targetAgentName,
    thread.worktreeBranch,
    thread.createdBy,
    thread.mergeProposal?.summary,
    thread.mergeProposal?.rationale,
    ...thread.messages.map((message) => message.content),
  ];
  return fields
    .filter((field): field is string => typeof field === 'string' && field.length > 0)
    .join(' ')
    .toLowerCase();
}

function sanitizeSummary(raw?: string | null): string {
  if (typeof raw !== 'string' || raw.length === 0) return '';
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, ' ')
    .replace(/[*_~]/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSummary(text: string): string {
  const characters = Array.from(text);
  if (characters.length <= SUMMARY_MAX_LENGTH) return text;
  return `${characters.slice(0, SUMMARY_MAX_LENGTH - 1).join('').trimEnd()}…`;
}

export function getBtwStatusMeta(status?: string | null): BtwStatusMeta {
  const normalized = normalizeStatus(status);
  if (isBtwStatus(normalized)) return BTW_STATUS_META[normalized];
  return BTW_STATUS_META.open;
}

export function filterBtwThreads(
  threads: A2ABtwThread[],
  filters: BtwThreadFilters = {},
): A2ABtwThread[] {
  const sessionId = normalizeId(filters.sessionId);
  const taskId = normalizeId(filters.taskId);
  const status = normalizeStatus(filters.status);
  const query = typeof filters.query === 'string' ? filters.query.trim().toLowerCase() : '';

  return [...threads]
    .filter((thread) => {
      if (sessionId && thread.sessionId !== sessionId) return false;
      if (taskId && thread.taskId !== taskId) return false;
      if (status && status !== 'all' && normalizeStatus(thread.status) !== status) return false;
      if (filters.onlyAttention && !isAttentionStatus(thread.status)) return false;
      if (!query) return true;
      return buildSearchText(thread).includes(query);
    })
    .sort(compareBtwThreads);
}

export function countBtwAttention(
  threads: A2ABtwThread[],
  scope: { sessionId?: string | null; taskId?: string | null } = {},
): BtwAttentionCounts {
  const sessionId = normalizeId(scope.sessionId);
  const taskId = normalizeId(scope.taskId);
  const counts: BtwAttentionCounts = {
    total: 0,
    open: 0,
    pendingApproval: 0,
    approved: 0,
    merged: 0,
    attentionCount: 0,
  };

  for (const thread of threads) {
    if (sessionId && thread.sessionId !== sessionId) continue;
    if (taskId && thread.taskId !== taskId) continue;
    counts.total += 1;
    const status = normalizeStatus(thread.status);
    if (status === 'open') counts.open += 1;
    else if (status === 'pending_approval') counts.pendingApproval += 1;
    else if (status === 'approved') counts.approved += 1;
    else if (status === 'merged') counts.merged += 1;
  }

  counts.attentionCount = counts.pendingApproval + counts.approved;
  return counts;
}

export function canProposeBtwMerge(thread?: A2ABtwThread | null): boolean {
  if (!thread) return false;
  const status = normalizeStatus(thread.status);
  if (status !== 'open' && status !== 'rejected') return false;
  return Array.isArray(thread.messages) && thread.messages.length > 0;
}

export function canReviewBtwMerge(thread?: A2ABtwThread | null): boolean {
  if (!thread) return false;
  return normalizeStatus(thread.status) === 'pending_approval' && Boolean(thread.mergeProposal);
}

export function canExecuteBtwMerge(thread?: A2ABtwThread | null): boolean {
  if (!thread) return false;
  return normalizeStatus(thread.status) === 'approved' && Boolean(thread.mergeProposal);
}

export function defaultProposalSummary(thread?: A2ABtwThread | null): string {
  if (!thread) return '';
  const messages = Array.isArray(thread.messages) ? thread.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'assistant') continue;
    const summary = sanitizeSummary(message.content);
    if (summary) return truncateSummary(summary);
  }
  return truncateSummary(sanitizeSummary(thread.title));
}
