import type {
  A2ABtwThread,
  A2ATaskRecord,
  GithubPullRequestSummary,
  LinearIssueItem,
} from '../types';

const DRAFT_KEY_PREFIX = 'ops-console:agent-draft';
const DRAFT_KEY_FALLBACK = 'default';

function safeDraftPart(value?: string | null): string {
  const trimmed = (value || '').trim();
  return trimmed ? encodeURIComponent(trimmed) : DRAFT_KEY_FALLBACK;
}

export function buildNodeDraftKey(nodeId?: string | null, taskId?: string | null): string {
  return `${DRAFT_KEY_PREFIX}:${safeDraftPart(nodeId)}:${safeDraftPart(taskId)}`;
}

export function loadNodeDraft(
  storage: Pick<Storage, 'getItem'> | null | undefined,
  nodeId?: string | null,
  taskId?: string | null,
): string {
  if (!storage) return '';
  try {
    return storage.getItem(buildNodeDraftKey(nodeId, taskId)) || '';
  } catch {
    return '';
  }
}

export function saveNodeDraft(
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined,
  nodeId: string | null | undefined,
  taskId: string | null | undefined,
  text: string,
): void {
  if (!storage) return;
  const key = buildNodeDraftKey(nodeId, taskId);
  try {
    if (!text || !text.trim()) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, text);
    }
  } catch {
    return;
  }
}

export function clearNodeDraft(
  storage: Pick<Storage, 'removeItem'> | null | undefined,
  nodeId?: string | null,
  taskId?: string | null,
): void {
  if (!storage) return;
  try {
    storage.removeItem(buildNodeDraftKey(nodeId, taskId));
  } catch {
    return;
  }
}

export const DEFAULT_INLINE_PREVIEW_CHARS = 1200;

export function formatInlineOutputPreview(
  text: string | null | undefined,
  maxChars: number = DEFAULT_INLINE_PREVIEW_CHARS,
): { preview: string; truncated: boolean; totalChars: number; omittedChars: number } {
  const source = typeof text === 'string' ? text : '';
  const limit = Number.isFinite(maxChars)
    ? Math.max(0, Math.floor(maxChars))
    : DEFAULT_INLINE_PREVIEW_CHARS;
  const totalChars = source.length;
  if (totalChars <= limit) {
    return { preview: source, truncated: false, totalChars, omittedChars: 0 };
  }
  return {
    preview: source.slice(0, limit),
    truncated: true,
    totalChars,
    omittedChars: totalChars - limit,
  };
}

export interface NeedsYouItem {
  id: string;
  kind: 'btw_approval' | 'snooze_woken' | 'task_failed' | 'task_attention';
  taskId: string;
  threadId?: string;
  title: string;
  subtitle: string;
  nodeId?: string;
  severity: 'warn' | 'err' | 'info';
  updatedAt: string;
}

function compactText(value: string | null | undefined, maxChars = 80): string {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function taskTitle(task: A2ATaskRecord): string {
  return compactText(task.prompt, 72) || `任务 ${task.id}`;
}

function taskAgentName(task: A2ATaskRecord): string {
  return task.workerAgentName || task.leadAgentName || '未知 Agent';
}

function isPendingBtwApproval(thread: A2ABtwThread): boolean {
  if (thread.status === 'awaiting_approval' || thread.status === 'pending_approval') return true;
  return thread.mergeProposal?.status === 'pending';
}

function isSnoozeWoken(task: A2ATaskRecord, nowMs: number): boolean {
  if (task.attention?.snoozeWokenEarly === true) return true;
  if (task.attention?.reasons?.includes('snooze_woken')) return true;
  if (!task.snoozedUntil) return false;
  const untilMs = Date.parse(task.snoozedUntil);
  if (!Number.isFinite(untilMs) || untilMs > nowMs) return false;
  if (task.attention && !task.attention.unread && !task.attention.needsAttention) return false;
  return true;
}

const ATTENTION_REASON_LABELS: Record<string, string> = {
  pending_btw: 'BTW 待审批',
  task_failed: '任务失败',
  snooze_woken: '已唤醒',
  unread_update: '有未读更新',
};

function attentionReasonLabel(reason: string): string {
  return ATTENTION_REASON_LABELS[reason] || compactText(reason, 48);
}

function needsYouPriority(kind: NeedsYouItem['kind']): number {
  switch (kind) {
    case 'btw_approval':
      return 0;
    case 'snooze_woken':
      return 1;
    case 'task_failed':
      return 2;
    case 'task_attention':
    default:
      return 3;
  }
}

function timestampValue(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildNeedsYouQueue(
  tasks: readonly A2ATaskRecord[],
  btwThreads: readonly A2ABtwThread[],
  nowMs: number = Date.now(),
): NeedsYouItem[] {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const items: NeedsYouItem[] = [];

  for (const thread of btwThreads) {
    if (!isPendingBtwApproval(thread)) continue;
    const linkedTask = thread.taskId ? taskById.get(thread.taskId) : undefined;
    const proposal = thread.mergeProposal;
    const subtitleParts = ['等待审批'];
    if (proposal?.targetType) subtitleParts.push(proposal.targetType);
    if (proposal?.riskLevel) subtitleParts.push(`风险 ${proposal.riskLevel}`);
    const summary = compactText(proposal?.summary, 120);
    if (summary) subtitleParts.push(summary);
    items.push({
      id: `btw:${thread.id}`,
      kind: 'btw_approval',
      taskId: thread.taskId || '',
      threadId: thread.id,
      title: `BTW 待审批：${compactText(thread.title, 72) || '未命名分支'}`,
      subtitle: subtitleParts.join(' · '),
      nodeId: linkedTask?.workerNodeId || linkedTask?.leadNodeId || undefined,
      severity: 'warn',
      updatedAt: thread.updatedAt,
    });
  }

  for (const task of tasks) {
    const isLive = !task.settledAt && task.state !== 'canceled';
    if (!isLive) continue;

    if (isSnoozeWoken(task, now)) {
      items.push({
        id: `snooze:${task.id}`,
        kind: 'snooze_woken',
        taskId: task.id,
        title: `已唤醒：${taskTitle(task)}`,
        subtitle: `${taskAgentName(task)} · 已到提醒时间`,
        nodeId: task.workerNodeId || task.leadNodeId || undefined,
        severity: 'info',
        updatedAt: task.updatedAt,
      });
    }

    if (task.state === 'failed' && !task.settledAt) {
      const lastStep = task.steps?.[task.steps.length - 1];
      items.push({
        id: `failed:${task.id}`,
        kind: 'task_failed',
        taskId: task.id,
        title: `任务失败：${taskTitle(task)}`,
        subtitle: `${taskAgentName(task)} · ${compactText(lastStep?.detail, 120) || '任务状态为 failed'}`,
        nodeId: task.workerNodeId || task.leadNodeId || undefined,
        severity: 'err',
        updatedAt: task.updatedAt,
      });
    }

    if (task.attention?.unread === true && task.attention.snoozed !== true) {
      const reasons = (task.attention.reasons || [])
        .map((reason) => attentionReasonLabel(reason))
        .filter(Boolean);
      items.push({
        id: `attention:${task.id}`,
        kind: 'task_attention',
        taskId: task.id,
        title: `待关注：${taskTitle(task)}`,
        subtitle: `${taskAgentName(task)} · ${reasons.length ? reasons.join(' · ') : '需要人工关注'}`,
        nodeId: task.workerNodeId || task.leadNodeId || undefined,
        severity: 'warn',
        updatedAt: task.updatedAt,
      });
    }
  }

  items.sort((a, b) => {
    const priorityDiff = needsYouPriority(a.kind) - needsYouPriority(b.kind);
    if (priorityDiff !== 0) return priorityDiff;
    const timeDiff = timestampValue(b.updatedAt) - timestampValue(a.updatedAt);
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  const seenTaskIds = new Set<string>();
  const deduped: NeedsYouItem[] = [];
  for (const item of items) {
    if (item.kind === 'btw_approval') {
      deduped.push(item);
      continue;
    }
    if (seenTaskIds.has(item.taskId)) continue;
    seenTaskIds.add(item.taskId);
    deduped.push(item);
  }
  return deduped;
}

export interface TaskIssueLinkIndex {
  taskByIssueId: Map<string, A2ATaskRecord>;
  issueByTaskId: Map<string, LinearIssueItem>;
  prByIssueId: Map<string, GithubPullRequestSummary>;
  prByBranch: Map<string, GithubPullRequestSummary>;
}

function normalizeRef(value: string | null | undefined): string {
  return (value || '').trim().replace(/^refs\/heads\//i, '');
}

function refMentionsIdentifier(ref: string | null | undefined, identifier: string | null | undefined): boolean {
  const normalizedRef = normalizeRef(ref).toLowerCase();
  const normalizedId = (identifier || '').trim().toLowerCase();
  if (!normalizedRef || !normalizedId) return false;
  let index = normalizedRef.indexOf(normalizedId);
  while (index !== -1) {
    const before = normalizedRef[index - 1] || '';
    const after = normalizedRef[index + normalizedId.length] || '';
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    index = normalizedRef.indexOf(normalizedId, index + 1);
  }
  return false;
}

export function buildTaskIssueLinkIndex(
  issues: readonly LinearIssueItem[],
  tasks: readonly A2ATaskRecord[],
  pullRequests: readonly GithubPullRequestSummary[] = [],
): TaskIssueLinkIndex {
  const taskByIssueId = new Map<string, A2ATaskRecord>();
  const issueByTaskId = new Map<string, LinearIssueItem>();
  const prByIssueId = new Map<string, GithubPullRequestSummary>();
  const prByBranch = new Map<string, GithubPullRequestSummary>();

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const taskByBranch = new Map<string, A2ATaskRecord>();
  for (const task of tasks) {
    const branch = normalizeRef(task.worktreeBranch);
    if (branch) taskByBranch.set(branch, task);
  }

  const prByNumber = new Map<number, GithubPullRequestSummary>();
  const prByNormalizedBranch = new Map<string, GithubPullRequestSummary>();
  for (const pr of pullRequests) {
    const branch = normalizeRef(pr.headRefName);
    if (pr.headRefName?.trim()) prByBranch.set(pr.headRefName.trim(), pr);
    if (branch) prByNormalizedBranch.set(branch, pr);
    if (typeof pr.number === 'number' && Number.isFinite(pr.number)) {
      prByNumber.set(pr.number, pr);
    }
  }

  for (const issue of issues) {
    let linkedTask: A2ATaskRecord | undefined;
    if (issue.linkedTaskId) linkedTask = taskById.get(issue.linkedTaskId);
    if (!linkedTask && issue.worktreeBranch) {
      linkedTask = taskByBranch.get(normalizeRef(issue.worktreeBranch));
    }
    if (!linkedTask && issue.identifier) {
      linkedTask = tasks.find((task) => refMentionsIdentifier(task.worktreeBranch, issue.identifier));
    }
    if (linkedTask) {
      taskByIssueId.set(issue.id, linkedTask);
      if (!issueByTaskId.has(linkedTask.id)) issueByTaskId.set(linkedTask.id, issue);
    }

    let linkedPr: GithubPullRequestSummary | undefined;
    if (issue.github?.prNumber != null) {
      linkedPr = prByNumber.get(Number(issue.github.prNumber));
    }
    if (!linkedPr && issue.github?.branch) {
      const branch = normalizeRef(issue.github.branch);
      linkedPr = prByBranch.get(issue.github.branch.trim()) || prByNormalizedBranch.get(branch);
    }
    if (!linkedPr && issue.identifier) {
      linkedPr = pullRequests.find((pr) => {
        if (pr.linkedIssueId && pr.linkedIssueId === issue.id) return true;
        if (
          pr.linkedIssueIdentifier &&
          pr.linkedIssueIdentifier.toLowerCase() === issue.identifier.toLowerCase()
        ) {
          return true;
        }
        if (
          issue.github?.issueNumber != null &&
          pr.issueNumber != null &&
          Number(pr.issueNumber) === Number(issue.github.issueNumber)
        ) {
          return true;
        }
        return (
          refMentionsIdentifier(pr.headRefName, issue.identifier) ||
          refMentionsIdentifier(pr.title, issue.identifier)
        );
      });
    }
    if (linkedPr) prByIssueId.set(issue.id, linkedPr);
  }

  return { taskByIssueId, issueByTaskId, prByIssueId, prByBranch };
}

export const CONTEXT_RAIL_MIN_WIDTH = 280;
export const CONTEXT_RAIL_MAX_WIDTH = 560;
export const CONTEXT_RAIL_DEFAULT_WIDTH = 360;

export function clampContextRailWidth(width: number): number {
  if (!Number.isFinite(width)) return CONTEXT_RAIL_DEFAULT_WIDTH;
  return Math.min(CONTEXT_RAIL_MAX_WIDTH, Math.max(CONTEXT_RAIL_MIN_WIDTH, width));
}
