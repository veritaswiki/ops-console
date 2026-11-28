import React from 'react';
import {
  Archive,
  Check,
  ChevronUp,
  GitBranch,
  GitMerge,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import type {
  A2AAgentPeer,
  A2ABtwMergeTarget,
  A2ABtwMessage,
  A2ABtwMode,
  A2ABtwThread,
  A2ASessionRecord,
  A2ATaskRecord,
  ToastHandler,
} from '../types';
import {
  archiveA2ABtwThread,
  issueA2ABtwConfirm,
  mergeA2ABtwThread,
  openA2ABtwThread,
  postA2ABtwMessage,
  proposeA2ABtwMerge,
  reviewA2ABtwMerge,
} from '../api';
import {
  BTW_MERGE_TARGET_OPTIONS,
  canExecuteBtwMerge,
  canProposeBtwMerge,
  canReviewBtwMerge,
  countBtwAttention,
  defaultProposalSummary,
  filterBtwThreads,
  getBtwStatusMeta,
  type BtwTone,
} from '../lib/btw';
import { cn, FOCUS_RING } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import { formatDateTime } from '../utils/format';
import { Button, EmptyState, inputBaseClass, ToggleSwitch } from './ui';

export interface AgentBtwDrawerProps {
  open: boolean;
  onClose: () => void;
  threads: A2ABtwThread[];
  agents: A2AAgentPeer[];
  sessions: A2ASessionRecord[];
  activeSession?: A2ASessionRecord | null;
  activeTask?: A2ATaskRecord | null;
  initialThreadId?: string | null;
  readOnly?: boolean;
  onRefresh: () => Promise<void> | void;
  onToast?: ToastHandler;
}

type BtwScopeMode = 'current' | 'all';
type BtwReviewDecision = 'approve' | 'reject';

interface MergeConfirmState {
  token: string;
  expiresAt: string;
  expiresInSec: number;
}

interface ApiErrorShape extends Error {
  status?: number;
  payload?: unknown;
}

interface RiskMeta {
  label: string;
  tone: BtwTone;
}

const BTW_MODE_OPTIONS: ReadonlyArray<{
  value: A2ABtwMode;
  label: string;
  hint: string;
}> = [
  {
    value: 'btw',
    label: '纯讨论',
    hint: '复用当前对话背景进行推演和验证，不会修改主线或代码。',
  },
  {
    value: 'fork',
    label: '独立分支验证',
    hint: '自动开辟独立工作副本验证代码改动，审批确认后再合入主线。',
  },
];

const TONE_DOT_CLASS: Record<BtwTone, string> = {
  neutral: 'bg-[var(--muted-dot)]',
  warn: 'bg-[var(--warn-dot)]',
  accent: 'bg-[var(--accent)]',
  ok: 'bg-[var(--ok-dot)]',
  err: 'bg-[var(--err-dot)]',
  muted: 'bg-[var(--muted-dot)]',
};

const TONE_TEXT_CLASS: Record<BtwTone, string> = {
  neutral: 'text-[var(--ink-muted)]',
  warn: 'text-[var(--warn)]',
  accent: 'text-[var(--accent)]',
  ok: 'text-[var(--ok)]',
  err: 'text-[var(--err)]',
  muted: 'text-[var(--ink-subtle)]',
};

function normalizeStatus(status?: string | null): string {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

function formatTimestamp(value?: string | null): string {
  return formatDateTime(value);
}

function describeApiError(error: unknown): string {
  return extractErrorMessage(error, '请求失败，请稍后重试');
}

function isConfirmTokenRequired(error: unknown): boolean {
  const apiError = error as ApiErrorShape | null;
  if (apiError?.status === 409) return true;
  if (
    typeof apiError?.message === 'string' &&
    apiError.message.toLowerCase().includes('confirmtoken')
  ) {
    return true;
  }
  const payload = apiError?.payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (record.requiresConfirm === true || record.confirmTokenRequired === true) return true;
  }
  return false;
}

function getMergeTargetLabel(targetType?: string | null): string {
  const option = BTW_MERGE_TARGET_OPTIONS.find((item) => item.id === targetType);
  return option?.label || targetType || '未指定';
}

function getMergeTargetHint(targetType?: string | null): string {
  const option = BTW_MERGE_TARGET_OPTIONS.find((item) => item.id === targetType);
  return option?.hint || '选择结论进入主线的方式。';
}

function getRiskMeta(riskLevel?: string | null): RiskMeta {
  const normalized = normalizeStatus(riskLevel);
  if (normalized === 'high') return { label: '高风险', tone: 'err' };
  if (normalized === 'medium') return { label: '中风险', tone: 'warn' };
  if (normalized === 'low') return { label: '低风险', tone: 'ok' };
  return { label: '未评级', tone: 'neutral' };
}

function getProposalStatusLabel(status?: string | null): string {
  const normalized = normalizeStatus(status);
  if (normalized === 'pending') return '待审批';
  if (normalized === 'approved') return '已批准';
  if (normalized === 'rejected') return '已驳回';
  if (normalized === 'merged') return '已并入';
  return status || '未知';
}

function getIsolationLabel(isolation?: string | null): string {
  const normalized = normalizeStatus(isolation);
  if (normalized === 'worktree') return '独立代码副本';
  if (normalized === 'ephemeral') return '隔离会话';
  return isolation || '默认隔离';
}

function getModeLabel(mode?: string | null): string {
  const normalized = normalizeStatus(mode);
  if (normalized === 'fork') return '独立分支验证';
  if (normalized === 'btw') return '纯讨论';
  return mode || '纯讨论';
}

function canFollowUp(thread?: A2ABtwThread | null): boolean {
  if (!thread) return false;
  const status = normalizeStatus(thread.status);
  return status === 'open' || status === 'rejected';
}

function canArchiveThread(thread?: A2ABtwThread | null): boolean {
  if (!thread) return false;
  const status = normalizeStatus(thread.status);
  return status !== 'archived' && status !== 'merged';
}

function buildThreadPreview(thread: A2ABtwThread): string {
  const lastMessage = thread.messages[thread.messages.length - 1];
  const source = lastMessage?.content || thread.mergeProposal?.summary || thread.title;
  const collapsed = source.replace(/\s+/g, ' ').trim();
  const characters = Array.from(collapsed);
  return characters.length > 88
    ? `${characters.slice(0, 87).join('').trimEnd()}…`
    : collapsed;
}

function getMessageAuthor(message: A2ABtwMessage): string {
  if (message.role === 'user') return '你';
  if (message.role === 'system') return '系统';
  return message.agentName || '助手';
}

function getSessionLabel(
  sessions: A2ASessionRecord[],
  thread?: A2ABtwThread | null,
): string | null {
  if (!thread?.sessionId) return thread?.taskId ? `任务 ${thread.taskId}` : null;
  const session = sessions.find((item) => item.id === thread.sessionId);
  return session?.title || thread.sessionId;
}

function segmentedTabClass(active: boolean): string {
  return cn(
    'h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors duration-150 ease-out cursor-pointer',
    'disabled:opacity-45 disabled:pointer-events-none',
    active
      ? 'bg-[var(--surface-elevated)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
      : 'text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
    FOCUS_RING,
  );
}

export function AgentBtwDrawer({
  open,
  onClose,
  threads,
  agents,
  sessions,
  activeSession,
  activeTask,
  initialThreadId,
  readOnly = false,
  onRefresh,
  onToast,
}: AgentBtwDrawerProps): React.ReactElement | null {
  const [scopeMode, setScopeMode] = React.useState<BtwScopeMode>('current');
  const [onlyAttention, setOnlyAttention] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
    initialThreadId ?? null,
  );
  const [newPrompt, setNewPrompt] = React.useState('');
  const [newMode, setNewMode] = React.useState<A2ABtwMode>('btw');
  const [newAgentId, setNewAgentId] = React.useState('');
  const [openingThread, setOpeningThread] = React.useState(false);
  const [followUpPrompt, setFollowUpPrompt] = React.useState('');
  const [sendingFollowUp, setSendingFollowUp] = React.useState(false);
  const [proposalSummary, setProposalSummary] = React.useState('');
  const [proposalRationale, setProposalRationale] = React.useState('');
  const [proposalTarget, setProposalTarget] =
    React.useState<A2ABtwMergeTarget>('session_context');
  const [submittingProposal, setSubmittingProposal] = React.useState(false);
  const [reviewComment, setReviewComment] = React.useState('');
  const [reviewingDecision, setReviewingDecision] =
    React.useState<BtwReviewDecision | null>(null);
  const [archiving, setArchiving] = React.useState(false);
  const [merging, setMerging] = React.useState(false);
  const [mergeConfirm, setMergeConfirm] = React.useState<MergeConfirmState | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [composerOpen, setComposerOpen] = React.useState(threads.length === 0);
  const lastInitialThreadRef = React.useRef<string | null>(initialThreadId ?? null);

  React.useEffect(() => {
    if (open && threads.length === 0) {
      setComposerOpen(true);
    }
  }, [open, threads.length]);

  const notify: ToastHandler = (message, tone = 'ok', options) => {
    onToast?.(message, tone, options);
  };

  const reportError = (message: string) => {
    setErrorMessage(message);
    notify(message, 'err');
  };

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) {
      lastInitialThreadRef.current = null;
      return;
    }
    const nextInitialThread = initialThreadId ?? null;
    if (nextInitialThread && nextInitialThread !== lastInitialThreadRef.current) {
      setSelectedThreadId(nextInitialThread);
    }
    lastInitialThreadRef.current = nextInitialThread;
  }, [open, initialThreadId]);

  const currentScope = React.useMemo(
    () => ({
      sessionId: activeSession?.id ?? null,
      taskId: activeSession?.id ? null : activeTask?.id ?? null,
    }),
    [activeSession?.id, activeTask?.id],
  );
  const hasCurrentScope = Boolean(currentScope.sessionId || currentScope.taskId);
  const effectiveScopeMode: BtwScopeMode = hasCurrentScope ? scopeMode : 'all';
  const scopeFilters = React.useMemo(
    () => (effectiveScopeMode === 'current' ? currentScope : {}),
    [effectiveScopeMode, currentScope],
  );
  const scopeCounts = React.useMemo(
    () => countBtwAttention(threads, scopeFilters),
    [threads, scopeFilters],
  );
  const visibleThreads = React.useMemo(
    () =>
      filterBtwThreads(threads, {
        ...scopeFilters,
        onlyAttention,
        query,
      }),
    [threads, scopeFilters, onlyAttention, query],
  );
  const selectedThread = React.useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  React.useEffect(() => {
    if (!open || selectedThreadId) return;
    const firstVisibleThread = visibleThreads[0];
    if (firstVisibleThread) setSelectedThreadId(firstVisibleThread.id);
  }, [open, selectedThreadId, visibleThreads]);

  React.useEffect(() => {
    if (!selectedThread) {
      setProposalSummary('');
      setProposalRationale('');
      setProposalTarget('session_context');
      setReviewComment('');
      setFollowUpPrompt('');
      setMergeConfirm(null);
      return;
    }
    setProposalSummary(
      canProposeBtwMerge(selectedThread) ? defaultProposalSummary(selectedThread) : '',
    );
    setProposalRationale('');
    setProposalTarget('session_context');
    setReviewComment('');
    setFollowUpPrompt('');
    setMergeConfirm(null);
    setErrorMessage('');
  }, [selectedThread?.id]);

  React.useEffect(() => {
    if (!selectedThread || !canProposeBtwMerge(selectedThread)) return;
    setProposalSummary((current) =>
      current.trim() ? current : defaultProposalSummary(selectedThread),
    );
  }, [selectedThread?.id, selectedThread?.status, selectedThread?.messages.length]);

  React.useEffect(() => {
    if (!mergeConfirm) return;
    if (!selectedThread || !canExecuteBtwMerge(selectedThread)) {
      setMergeConfirm(null);
    }
  }, [mergeConfirm, selectedThread]);

  const refreshDrawerData = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      reportError(`刷新支线讨论失败：${describeApiError(error)}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenThread = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guardReadOnly(readOnly, notify, '发起新支线讨论')) return;
    const prompt = newPrompt.trim();
    if (!prompt) {
      reportError('请输入要讨论的问题后再发起。');
      return;
    }
    if (openingThread) return;

    setOpeningThread(true);
    setErrorMessage('');
    try {
      const response = await openA2ABtwThread({
        ...(activeSession?.id ? { sessionId: activeSession.id } : {}),
        ...(activeTask?.id ? { taskId: activeTask.id } : {}),
        prompt,
        mode: newMode,
        ...(newAgentId ? { targetAgentId: newAgentId } : {}),
      });
      setNewPrompt('');
      setComposerOpen(false);
      if (response?.thread?.id) setSelectedThreadId(response.thread.id);
      notify('支线讨论已创建。', 'ok');
      await refreshDrawerData();
    } catch (error) {
      reportError(`发起支线失败：${describeApiError(error)}`);
    } finally {
      setOpeningThread(false);
    }
  };

  const handleFollowUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guardReadOnly(readOnly, notify, '在支线中继续追问')) return;
    if (!selectedThread || !canFollowUp(selectedThread)) return;
    const prompt = followUpPrompt.trim();
    if (!prompt) {
      reportError('请输入追问内容。');
      return;
    }
    if (sendingFollowUp) return;

    setSendingFollowUp(true);
    setErrorMessage('');
    try {
      await postA2ABtwMessage(selectedThread.id, { prompt });
      setFollowUpPrompt('');
      notify('追问已发送到支线。', 'ok');
      await refreshDrawerData();
    } catch (error) {
      reportError(`发送追问失败：${describeApiError(error)}`);
    } finally {
      setSendingFollowUp(false);
    }
  };

  const handleProposeMerge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guardReadOnly(readOnly, notify, '提交合并提案')) return;
    if (!selectedThread || !canProposeBtwMerge(selectedThread)) return;
    const summary = proposalSummary.trim();
    if (!summary) {
      reportError('请先填写合并摘要。');
      return;
    }
    if (submittingProposal) return;

    setSubmittingProposal(true);
    setErrorMessage('');
    try {
      await proposeA2ABtwMerge(selectedThread.id, {
        summary,
        targetType: proposalTarget,
        ...(proposalRationale.trim() ? { rationale: proposalRationale.trim() } : {}),
      });
      notify('合并提案已提交，等待确认审批。', 'ok');
      await refreshDrawerData();
    } catch (error) {
      reportError(`提交合并提案失败：${describeApiError(error)}`);
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleReview = async (decision: BtwReviewDecision) => {
    if (guardReadOnly(readOnly, notify, decision === 'approve' ? '批准提案' : '驳回提案')) return;
    if (!selectedThread || !canReviewBtwMerge(selectedThread)) return;
    if (reviewingDecision) return;

    setReviewingDecision(decision);
    setErrorMessage('');
    try {
      await reviewA2ABtwMerge(selectedThread.id, {
        decision,
        ...(reviewComment.trim() ? { comment: reviewComment.trim() } : {}),
      });
      setReviewComment('');
      notify(
        decision === 'approve'
          ? '提案已批准，现在可以并入主线。'
          : '提案已驳回，可在支线继续补充后重提。',
        'ok',
      );
      await refreshDrawerData();
    } catch (error) {
      reportError(
        `${decision === 'approve' ? '批准提案' : '驳回提案'}失败：${describeApiError(error)}`,
      );
    } finally {
      setReviewingDecision(null);
    }
  };

  const handleMerge = async (confirmToken?: string) => {
    if (guardReadOnly(readOnly, notify, '将支线并入主线')) return;
    const thread = selectedThread;
    if (!thread || !canExecuteBtwMerge(thread)) return;
    if (merging) return;

    setMerging(true);
    setErrorMessage('');
    try {
      const response = confirmToken
        ? await mergeA2ABtwThread(thread.id, { confirmToken })
        : await mergeA2ABtwThread(thread.id);
      setMergeConfirm(null);
      const mergedRevision = response?.thread?.mergeProposal?.mergedRevision;
      notify(
        mergedRevision != null
          ? `已并入主线（第 ${mergedRevision} 版）。`
          : '已并入主线。',
        'ok',
      );
      await refreshDrawerData();
    } catch (error) {
      if (!confirmToken && isConfirmTokenRequired(error)) {
        try {
          const issued = await issueA2ABtwConfirm({
            threadId: thread.id,
            action: 'merge',
          });
          setMergeConfirm({
            token: issued.confirmToken,
            expiresAt: issued.expiresAt,
            expiresInSec: issued.expiresInSec,
          });
        } catch (confirmError) {
          reportError(`获取一次性确认失败：${describeApiError(confirmError)}`);
        }
      } else if (confirmToken && isConfirmTokenRequired(error)) {
        setMergeConfirm(null);
        reportError('本次确认已过期，请重新点击「并入主线」获取新确认。');
      } else {
        reportError(`并入主线失败：${describeApiError(error)}`);
      }
    } finally {
      setMerging(false);
    }
  };

  const handleArchive = async () => {
    if (guardReadOnly(readOnly, notify, '归档支线讨论')) return;
    if (!selectedThread || !canArchiveThread(selectedThread)) return;
    if (archiving) return;

    setArchiving(true);
    setErrorMessage('');
    try {
      await archiveA2ABtwThread(selectedThread.id);
      notify('支线讨论已归档。', 'ok');
      await refreshDrawerData();
    } catch (error) {
      reportError(`归档失败：${describeApiError(error)}`);
    } finally {
      setArchiving(false);
    }
  };

  if (!open) return null;

  const currentScopeLabel = activeSession?.id
    ? '当前会话'
    : activeTask?.id
      ? '当前任务'
      : '当前会话';
  const currentScopeTitle = activeSession?.title || activeTask?.prompt || '未绑定活跃会话或任务';
  const selectedStatusMeta = selectedThread ? getBtwStatusMeta(selectedThread.status) : null;
  const selectedProposal = selectedThread?.mergeProposal ?? null;
  const selectedRiskMeta = selectedProposal ? getRiskMeta(selectedProposal.riskLevel) : null;
  const selectedTargetHint = getMergeTargetHint(proposalTarget);
  const newModeHint =
    BTW_MODE_OPTIONS.find((option) => option.value === newMode)?.hint || '';
  const selectedSessionLabel = getSessionLabel(sessions, selectedThread);
  const hasFilters = Boolean(query.trim() || onlyAttention);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        data-testid="agent-btw-drawer-overlay"
        aria-hidden="true"
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] transition-opacity duration-150 ease-out"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="支线讨论与审批"
        data-testid="agent-btw-drawer"
        className="relative z-10 flex h-full w-full max-w-[1080px] flex-col border-l border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-modal)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--accent)]">
              <GitBranch className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold tracking-tight text-[var(--ink)] text-balance">
                支线讨论与审批
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-muted)] text-pretty">
                在不打断主对话的前提下单独讨论或验证方案，审批确认后再并入主线。
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!readOnly && (
              <Button
                variant={composerOpen ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setComposerOpen((prev) => !prev)}
              >
                {composerOpen ? (
                  <>
                    <ChevronUp className="size-3.5" strokeWidth={1.75} />
                    收起新建
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" strokeWidth={1.75} />
                    发起新支线
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refreshDrawerData()}
              disabled={refreshing}
              aria-label="刷新支线讨论"
            >
              <RefreshCw
                className={cn('size-4', refreshing && 'animate-spin')}
                strokeWidth={1.75}
              />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭抽屉">
              <X className="size-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>

        {readOnly && (
          <div className="flex shrink-0 items-start gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-5 py-2.5 sm:px-6">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" strokeWidth={1.75} />
            <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
              当前为只读模式，可查看支线讨论与审核记录，暂不可新建、审批或并入。
            </p>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex shrink-0 items-start gap-2 border-b border-[var(--err)]/25 bg-[var(--err)]/10 px-5 py-2.5 sm:px-6"
          >
            <ShieldAlert
              className="mt-0.5 size-3.5 shrink-0 text-[var(--err)]"
              strokeWidth={1.75}
            />
            <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[var(--err)]">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              aria-label="关闭错误提示"
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--err)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out cursor-pointer',
                FOCUS_RING,
              )}
            >
              <X className="size-3" strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface)] lg:overflow-hidden">
          <div className="shrink-0 space-y-3 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ink-subtle)]">
                <span>
                  共{' '}
                  <strong className="font-mono font-semibold text-[var(--ink)] tabular-nums">
                    {scopeCounts.total}
                  </strong>{' '}
                  条
                </span>
                <span>
                  进行中{' '}
                  <strong className="font-mono font-semibold text-[var(--ink)] tabular-nums">
                    {scopeCounts.open}
                  </strong>
                </span>
                <span className="text-[var(--warn)]">
                  待审批{' '}
                  <strong className="font-mono font-semibold tabular-nums">
                    {scopeCounts.pendingApproval}
                  </strong>
                </span>
                <span className="text-[var(--ok)]">
                  待并入{' '}
                  <strong className="font-mono font-semibold tabular-nums">
                    {scopeCounts.approved}
                  </strong>
                </span>
                <span className="text-[var(--accent)]">
                  待处理{' '}
                  <strong className="font-mono font-semibold tabular-nums">
                    {scopeCounts.attentionCount}
                  </strong>
                </span>
              </div>

              <div
                role="group"
                aria-label="支线范围"
                className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5"
              >
                <button
                  type="button"
                  aria-pressed={effectiveScopeMode === 'current'}
                  disabled={!hasCurrentScope}
                  title={hasCurrentScope ? currentScopeTitle : '当前未选中具体对话'}
                  onClick={() => setScopeMode('current')}
                  className={segmentedTabClass(effectiveScopeMode === 'current')}
                >
                  {currentScopeLabel}
                </button>
                <button
                  type="button"
                  aria-pressed={effectiveScopeMode === 'all'}
                  onClick={() => setScopeMode('all')}
                  className={segmentedTabClass(effectiveScopeMode === 'all')}
                >
                  全部会话
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div title="只显示待审批和待并入的支线">
                <ToggleSwitch
                  checked={onlyAttention}
                  onCheckedChange={setOnlyAttention}
                  label="仅看待处理"
                />
              </div>
              <div className="relative min-w-[200px] flex-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-subtle)]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索标题、助手、讨论内容或提案…"
                  aria-label="搜索支线讨论"
                  className={cn('h-8 w-full rounded-lg pl-8 pr-3 text-[16px] sm:text-[13px]', inputBaseClass)}
                />
              </div>
            </div>
          </div>

          {composerOpen && (
            <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/45 px-5 py-4 sm:px-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-[var(--ink)]">发起新支线讨论</h3>
                <span className="text-[11.5px] text-[var(--ink-subtle)]">
                  支线内容默认与主线隔离，审批确认后才会并入
                </span>
              </div>
              <form onSubmit={handleOpenThread} className="space-y-3">
                <textarea
                  rows={2}
                  value={newPrompt}
                  onChange={(event) => setNewPrompt(event.target.value)}
                  placeholder="输入要单独讨论的问题，例如：先评估这个改动对线上探针的影响…"
                  aria-label="支线讨论问题"
                  disabled={readOnly}
                  className={cn('w-full resize-y px-3 py-2 leading-relaxed text-[16px] sm:text-[13px]', inputBaseClass)}
                />
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <span className="block text-[11.5px] font-medium text-[var(--ink-muted)]">
                      方式
                    </span>
                    <div
                      role="group"
                      aria-label="支线方式"
                      className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-0.5"
                    >
                      {BTW_MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={newMode === option.value}
                          disabled={readOnly}
                          onClick={() => setNewMode(option.value)}
                          className={segmentedTabClass(newMode === option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block min-w-[180px] flex-1 space-y-1.5 text-[12px]">
                    <span className="font-medium text-[var(--ink-muted)]">执行助手（可选）</span>
                    <select
                      value={newAgentId}
                      onChange={(event) => setNewAgentId(event.target.value)}
                      disabled={readOnly}
                      aria-label="执行助手"
                      className={cn(
                        'ui-select h-9 w-full cursor-pointer pl-3 pr-8 text-[16px] sm:text-[13px]',
                        inputBaseClass,
                      )}
                    >
                      <option value="">自动选择</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={readOnly || openingThread || !newPrompt.trim()}
                    className="shrink-0"
                  >
                    {openingThread ? '创建中…' : '发起支线'}
                  </Button>
                </div>
                <p className="text-[11.5px] leading-relaxed text-[var(--ink-subtle)]">{newModeHint}</p>
              </form>
            </div>
          )}

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="min-h-0 border-b border-[var(--border-subtle)] lg:border-b-0 lg:overflow-y-auto">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <h3 className="text-[12.5px] font-semibold text-[var(--ink)]">支线列表</h3>
                <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                  {visibleThreads.length}
                </span>
              </div>
              {visibleThreads.length === 0 ? (
                <EmptyState
                  title="没有匹配的支线"
                  message={
                    hasFilters
                      ? '调整关键词或关闭「仅看待处理」后重试。'
                      : effectiveScopeMode === 'current'
                        ? '当前会话还没有支线讨论。'
                        : '还没有任何支线讨论，点击右上角即可发起。'
                  }
                  action={
                    hasFilters
                      ? {
                          label: '清除筛选',
                          onClick: () => {
                            setOnlyAttention(false);
                            setQuery('');
                          },
                        }
                      : undefined
                  }
                />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {visibleThreads.map((thread) => {
                    const statusMeta = getBtwStatusMeta(thread.status);
                    const isSelected = thread.id === selectedThreadId;
                    return (
                      <li key={thread.id}>
                        <button
                          type="button"
                          aria-current={isSelected ? 'true' : undefined}
                          onClick={() => setSelectedThreadId(thread.id)}
                          className={cn(
                            'w-full px-4 py-3 text-left transition-colors duration-150 ease-out cursor-pointer',
                            isSelected
                              ? 'bg-[var(--accent-soft)]'
                              : 'hover:bg-[var(--surface-hover)]',
                            FOCUS_RING,
                          )}
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <span
                              className={cn(
                                'mt-1.5 size-1.5 shrink-0 rounded-full',
                                TONE_DOT_CLASS[statusMeta.tone],
                              )}
                              title={statusMeta.description}
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[12.5px] font-medium text-[var(--ink)]">
                                  {thread.title}
                                </span>
                                <span
                                  className={cn(
                                    'shrink-0 text-[11px] font-medium',
                                    TONE_TEXT_CLASS[statusMeta.tone],
                                  )}
                                >
                                  {statusMeta.label}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-subtle)]">
                                {buildThreadPreview(thread)}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-[var(--ink-subtle)]">
                                <span>{getModeLabel(thread.mode)}</span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate max-w-[120px]">
                                  {thread.targetAgentName || thread.targetAgentId}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">
                                  基于第 {thread.mainlineRevisionAtOpen} 版
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>

            <section className="min-h-0 lg:overflow-y-auto">
              {!selectedThread ? (
                <div className="flex min-h-[280px] items-center justify-center p-6">
                  <EmptyState
                    title={threads.length > 0 ? '选择一条支线查看详情' : '还没有支线讨论'}
                    message={
                      threads.length > 0
                        ? '从左侧列表点选任意支线，即可查看讨论过程、合并提案与审批进度。'
                        : '发起支线后，可在这里继续追问并提交并入主线的提案。'
                    }
                  />
                </div>
              ) : (
                <div className="space-y-6 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[12px] font-medium',
                            selectedStatusMeta
                              ? TONE_TEXT_CLASS[selectedStatusMeta.tone]
                              : 'text-[var(--ink-muted)]',
                          )}
                          title={selectedStatusMeta?.description}
                        >
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              selectedStatusMeta
                                ? TONE_DOT_CLASS[selectedStatusMeta.tone]
                                : 'bg-[var(--muted-dot)]',
                            )}
                            aria-hidden="true"
                          />
                          {selectedStatusMeta?.label || selectedThread.status}
                        </span>
                      </div>
                      <h3
                        className="mt-2 text-[17px] font-semibold tracking-tight text-[var(--ink)] text-balance"
                        title={selectedThread.id}
                      >
                        {selectedThread.title}
                      </h3>
                      <p className="mt-1 text-[12px] text-[var(--ink-subtle)]">
                        由 {selectedThread.createdBy || '系统'} 发起 ·{' '}
                        {formatTimestamp(selectedThread.createdAt)}
                      </p>
                    </div>
                    {canArchiveThread(selectedThread) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleArchive()}
                        disabled={readOnly || archiving}
                        title="归档后不再参与审批与并入"
                      >
                        <Archive className="size-3.5" strokeWidth={1.75} />
                        {archiving ? '归档中…' : '归档'}
                      </Button>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--border-subtle)] py-3 sm:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-[10.5px] font-medium tracking-wider text-[var(--ink-subtle)]">
                        隔离方式
                      </dt>
                      <dd className="mt-1 min-w-0 text-[12px] text-[var(--ink)]">
                        <div>{getIsolationLabel(selectedThread.isolation)}</div>
                        {selectedThread.worktreeBranch ? (
                          <div className="mt-1 flex items-center gap-1 font-mono text-[10.5px] text-[var(--ink-muted)]">
                            <GitBranch className="size-3 shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{selectedThread.worktreeBranch}</span>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10.5px] text-[var(--ink-subtle)]">
                            不创建独立分支
                          </div>
                        )}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[10.5px] font-medium tracking-wider text-[var(--ink-subtle)]">
                        主线基线
                      </dt>
                      <dd className="mt-1 text-[12.5px] font-medium text-[var(--ink)] tabular-nums">
                        第 {selectedThread.mainlineRevisionAtOpen} 版
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[10.5px] font-medium tracking-wider text-[var(--ink-subtle)]">
                        支线方式
                      </dt>
                      <dd className="mt-1 text-[12px] text-[var(--ink)]">
                        {getModeLabel(selectedThread.mode)}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[10.5px] font-medium tracking-wider text-[var(--ink-subtle)]">
                        执行助手
                      </dt>
                      <dd className="mt-1 min-w-0 text-[12px] text-[var(--ink)]">
                        <div className="truncate">
                          {selectedThread.targetAgentName || selectedThread.targetAgentId}
                        </div>
                        <div className="truncate font-mono text-[10.5px] text-[var(--ink-subtle)]">
                          {selectedThread.model || '默认模型'}
                        </div>
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[10.5px] font-medium tracking-wider text-[var(--ink-subtle)]">
                        来源会话
                      </dt>
                      <dd className="mt-1 truncate text-[12px] text-[var(--ink)]">
                        {selectedSessionLabel || '—'}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--ink-subtle)]">
                        最后更新
                      </dt>
                      <dd className="mt-1 font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                        {formatTimestamp(selectedThread.updatedAt)}
                      </dd>
                    </div>
                  </dl>

                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
                        <MessageSquare className="size-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                        独立消息流
                      </h4>
                      <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                        {selectedThread.messages.length} 条
                      </span>
                    </div>

                    {selectedThread.messages.length === 0 ? (
                      <p className="py-4 text-center text-[12px] text-[var(--ink-subtle)]">
                        暂无消息，继续追问以推进旁支结论。
                      </p>
                    ) : (
                      <div className="max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
                        {selectedThread.messages.map((message) => {
                          const isUserMessage = message.role === 'user';
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                'flex',
                                isUserMessage ? 'justify-end' : 'justify-start',
                              )}
                            >
                              <div
                                className={cn(
                                  'max-w-[88%] rounded-lg border px-3 py-2',
                                  isUserMessage
                                    ? 'border-[var(--accent)]/20 bg-[var(--accent-soft)]'
                                    : 'border-[var(--border-subtle)] bg-[var(--surface-subtle)]',
                                )}
                              >
                                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-[var(--ink-subtle)]">
                                  <span className="font-medium text-[var(--ink-muted)]">
                                    {getMessageAuthor(message)}
                                  </span>
                                  {message.model && (
                                    <span className="font-mono">{message.model}</span>
                                  )}
                                  <span className="font-mono tabular-nums">
                                    {formatTimestamp(message.ts)}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-[var(--ink)]">
                                  {message.content}
                                </p>
                                {message.spillRefId && (
                                  <p
                                    className="mt-1.5 text-[10.5px] text-[var(--ink-subtle)]"
                                    title={message.spillRefId}
                                  >
                                    完整内容已单独存档
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {canFollowUp(selectedThread) ? (
                      <form onSubmit={handleFollowUp} className="flex items-end gap-2">
                        <textarea
                          rows={2}
                          value={followUpPrompt}
                          onChange={(event) => setFollowUpPrompt(event.target.value)}
                          placeholder="继续追问旁支，补充证据或收敛结论..."
                          aria-label="继续追问"
                          disabled={readOnly}
                          className={cn('min-w-0 flex-1 resize-y px-3 py-2 leading-relaxed', inputBaseClass)}
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || sendingFollowUp || !followUpPrompt.trim()}
                          className="shrink-0"
                        >
                          <Send className="size-3.5" strokeWidth={1.75} />
                          {sendingFollowUp ? '发送中...' : '发送追问'}
                        </Button>
                      </form>
                    ) : (
                      <p className="text-[11.5px] text-[var(--ink-subtle)]">
                        当前状态不可继续追问，可在驳回后重新开启旁支讨论。
                      </p>
                    )}
                  </section>

                  {canProposeBtwMerge(selectedThread) && (
                    <section className="space-y-3 border-t border-[var(--border-subtle)] pt-5">
                      <div>
                        <h4 className="text-[13px] font-semibold text-[var(--ink)]">
                          提交合并提案
                        </h4>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--ink-subtle)]">
                          将旁支结论提交主线审批，提案不会自动写入主线。
                        </p>
                      </div>
                      <form onSubmit={handleProposeMerge} className="space-y-3">
                        <label className="block space-y-1.5 text-[12px]">
                          <span className="font-medium text-[var(--ink-muted)]">合并摘要</span>
                          <textarea
                            rows={3}
                            value={proposalSummary}
                            onChange={(event) => setProposalSummary(event.target.value)}
                            placeholder="概括旁支结论与预期变更..."
                            aria-label="合并摘要"
                            disabled={readOnly}
                            className={cn('w-full resize-y px-3 py-2 leading-relaxed', inputBaseClass)}
                          />
                        </label>

                        <label className="block space-y-1.5 text-[12px]">
                          <span className="font-medium text-[var(--ink-muted)]">合并理由</span>
                          <textarea
                            rows={2}
                            value={proposalRationale}
                            onChange={(event) => setProposalRationale(event.target.value)}
                            placeholder="说明验证依据、风险边界与回滚路径（可选）..."
                            aria-label="合并理由"
                            disabled={readOnly}
                            className={cn('w-full resize-y px-3 py-2 leading-relaxed', inputBaseClass)}
                          />
                        </label>

                        <div className="flex flex-wrap items-end gap-3">
                          <label className="block min-w-[200px] flex-1 space-y-1.5 text-[12px]">
                            <span className="font-medium text-[var(--ink-muted)]">目标类型</span>
                            <select
                              value={proposalTarget}
                              onChange={(event) =>
                                setProposalTarget(event.target.value as A2ABtwMergeTarget)
                              }
                              disabled={readOnly}
                              aria-label="合并目标类型"
                              className={cn(
                                'ui-select h-9 w-full cursor-pointer pl-3 pr-8',
                                inputBaseClass,
                              )}
                            >
                              {BTW_MERGE_TARGET_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={
                              readOnly || submittingProposal || !proposalSummary.trim()
                            }
                            className="shrink-0"
                          >
                            {submittingProposal ? '提交中...' : '提交合并提案'}
                          </Button>
                        </div>
                        <p className="text-[11.5px] leading-relaxed text-[var(--ink-subtle)]">
                          {selectedTargetHint}
                        </p>
                      </form>
                    </section>
                  )}

                  {selectedProposal && (
                    <section className="space-y-4 border-t border-[var(--border-subtle)] pt-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-semibold text-[var(--ink)]">
                            审批与并入主线
                          </h4>
                          <p className="mt-1 text-[11.5px] text-[var(--ink-subtle)]" title={selectedProposal.id}>
                            提交于 {formatTimestamp(selectedProposal.proposedAt)} · {selectedProposal.proposedBy}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[12px] font-medium',
                              selectedRiskMeta
                                ? TONE_TEXT_CLASS[selectedRiskMeta.tone]
                                : 'text-[var(--ink-muted)]',
                            )}
                          >
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                selectedRiskMeta
                                  ? TONE_DOT_CLASS[selectedRiskMeta.tone]
                                  : 'bg-[var(--muted-dot)]',
                              )}
                              aria-hidden="true"
                            />
                            {selectedRiskMeta?.label || '未评级'}
                          </span>
                          <span className="text-[11.5px] text-[var(--ink-subtle)]">
                            {getProposalStatusLabel(selectedProposal.status)}
                          </span>
                        </div>
                      </div>

                      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <dt className="text-[10.5px] font-medium tracking-wider text-[var(--ink-subtle)]">
                            风险等级
                          </dt>
                          <dd className="mt-1 text-[12px]">
                            <span
                              className={cn(
                                'font-medium',
                                selectedRiskMeta
                                  ? TONE_TEXT_CLASS[selectedRiskMeta.tone]
                                  : 'text-[var(--ink-muted)]',
                              )}
                            >
                              {selectedRiskMeta?.label || '未评级'}
                            </span>
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[10.5px] font-medium tracking-wider text-[var(--ink-subtle)]">
                            并入方式
                          </dt>
                          <dd className="mt-1 text-[12px] text-[var(--ink)]">
                            {getMergeTargetLabel(selectedProposal.targetType)}
                          </dd>
                        </div>
                      </dl>

                      <div className="space-y-2">
                        <h5 className="text-[11.5px] font-medium text-[var(--ink-muted)]">摘要</h5>
                        <p className="text-[12.5px] leading-relaxed text-[var(--ink)] text-pretty">
                          {selectedProposal.summary}
                        </p>
                        {selectedProposal.rationale && (
                          <>
                            <h5 className="pt-1 text-[11.5px] font-medium text-[var(--ink-muted)]">
                              理由
                            </h5>
                            <p className="text-[12px] leading-relaxed text-[var(--ink-muted)] text-pretty">
                              {selectedProposal.rationale}
                            </p>
                          </>
                        )}
                      </div>

                      {selectedProposal.patchPreview && (
                        <div className="space-y-2">
                          <h5 className="text-[11.5px] font-medium text-[var(--ink-muted)]">
                            变更预览
                          </h5>
                          <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[var(--ink-muted)]">
                            {selectedProposal.patchPreview}
                          </pre>
                        </div>
                      )}

                      {selectedProposal.prDraftSpec && (
                        <div className="space-y-2 border-l-2 border-[var(--accent)]/30 pl-3">
                          <h5 className="text-[11.5px] font-medium text-[var(--ink-muted)]">
                            PR 草稿
                          </h5>
                          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div className="min-w-0">
                              <dt className="text-[10px] text-[var(--ink-subtle)]">分支</dt>
                              <dd className="mt-0.5 truncate font-mono text-[11px] text-[var(--ink)]">
                                {selectedProposal.prDraftSpec.branch}
                              </dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-[10px] text-[var(--ink-subtle)]">基线分支</dt>
                              <dd className="mt-0.5 truncate font-mono text-[11px] text-[var(--ink)]">
                                {selectedProposal.prDraftSpec.baseBranch}
                              </dd>
                            </div>
                            <div className="min-w-0 sm:col-span-1">
                              <dt className="text-[10px] text-[var(--ink-subtle)]">PR 标题</dt>
                              <dd className="mt-0.5 text-[11.5px] text-[var(--ink)] text-pretty">
                                {selectedProposal.prDraftSpec.title}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      )}

                      {(selectedProposal.reviewedAt ||
                        selectedProposal.reviewedBy ||
                        selectedProposal.reviewComment) && (
                        <div className="space-y-1 border-l-2 border-[var(--border)] pl-3">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <h5 className="text-[11.5px] font-medium text-[var(--ink-muted)]">
                              审核记录
                            </h5>
                            <span className="text-[10.5px] text-[var(--ink-subtle)]">
                              {selectedProposal.reviewedBy || '审核人'} ·{' '}
                              {formatTimestamp(selectedProposal.reviewedAt)}
                            </span>
                          </div>
                          {selectedProposal.reviewComment && (
                            <p className="text-[12px] leading-relaxed text-[var(--ink-muted)] text-pretty">
                              {selectedProposal.reviewComment}
                            </p>
                          )}
                        </div>
                      )}

                      {(selectedProposal.mergedRevision != null ||
                        selectedProposal.spillRefId) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-l-2 border-[var(--ok)]/40 pl-3 text-[11.5px]">
                          {selectedProposal.mergedRevision != null && (
                            <span className="text-[var(--ink-muted)]">
                              已并入至主线{' '}
                              <span className="font-semibold text-[var(--ok)] tabular-nums">
                                第 {selectedProposal.mergedRevision} 版
                              </span>
                            </span>
                          )}
                          {selectedProposal.spillRefId && (
                            <span className="min-w-0 text-[var(--ink-subtle)]" title={selectedProposal.spillRefId}>
                              完整变更记录已存档
                            </span>
                          )}
                        </div>
                      )}

                      {canReviewBtwMerge(selectedThread) && (
                        <div className="space-y-2.5 border-t border-[var(--border-subtle)] pt-4">
                          <label className="block space-y-1.5 text-[12px]">
                            <span className="font-medium text-[var(--ink-muted)]">审核意见</span>
                            <textarea
                              rows={2}
                              value={reviewComment}
                              onChange={(event) => setReviewComment(event.target.value)}
                              placeholder="说明批准或驳回的依据（可选）..."
                              aria-label="审核意见"
                              disabled={readOnly}
                              className={cn(
                                'w-full resize-y px-3 py-2 leading-relaxed',
                                inputBaseClass,
                              )}
                            />
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => void handleReview('approve')}
                              disabled={readOnly || reviewingDecision !== null}
                            >
                              <Check className="size-3.5" strokeWidth={1.75} />
                              {reviewingDecision === 'approve' ? '批准中...' : '批准提案'}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => void handleReview('reject')}
                              disabled={readOnly || reviewingDecision !== null}
                            >
                              <XCircle className="size-3.5" strokeWidth={1.75} />
                              {reviewingDecision === 'reject' ? '驳回中...' : '驳回退回'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {canExecuteBtwMerge(selectedThread) && (
                        <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="max-w-[520px] text-[11.5px] leading-relaxed text-[var(--ink-subtle)]">
                              提案已批准，可一次性并入主线。高危并入需要一次性确认，操作会保留审计记录。
                            </p>
                            {!mergeConfirm && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => void handleMerge()}
                                disabled={readOnly || merging}
                              >
                                <GitMerge className="size-3.5" strokeWidth={1.75} />
                                {merging ? '并入中...' : '并入主线'}
                              </Button>
                            )}
                          </div>

                          {mergeConfirm && (
                            <div
                              role="alert"
                              className="space-y-2.5 rounded-lg border border-[var(--warn)]/35 bg-[var(--warn)]/10 px-3 py-3"
                            >
                              <div className="flex items-start gap-2">
                                <ShieldAlert
                                  className="mt-0.5 size-3.5 shrink-0 text-[var(--warn)]"
                                  strokeWidth={1.75}
                                />
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-[var(--warn)]">
                                    需要二次确认
                                  </p>
                                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
                                    一次性确认令牌已签发，{mergeConfirm.expiresInSec} 秒内有效。再次点击将把旁支结论并入主线。
                                  </p>
                                  <p className="mt-1 font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
                                    到期 {formatTimestamp(mergeConfirm.expiresAt)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => void handleMerge(mergeConfirm.token)}
                                disabled={readOnly || merging}
                              >
                                <GitMerge className="size-3.5" strokeWidth={1.75} />
                                {merging ? '并入中...' : '二次确认并入主线'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
