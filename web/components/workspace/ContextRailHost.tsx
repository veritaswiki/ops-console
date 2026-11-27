import React from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  GitBranch,
  GripVertical,
  Link2,
  MessageSquare,
  Monitor,
  PanelRight,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import type { A2ATaskRecord, LinearIssueItem } from '../../types';
import { fetchA2ATaskSpill } from '../../api';
import { useUiSlots } from '../../modules/registry';
import {
  clampContextRailWidth,
  CONTEXT_RAIL_DEFAULT_WIDTH,
} from '../../lib/workspace-controls';
import { cn, FOCUS_RING } from '../../lib/cn';
import { formatDateTime, formatRelativeAge } from '../../utils/format';
import { Button } from '../ui';

const RAIL_WIDTH_KEY = 'ops-console:context-rail-width';

export interface ContextRailContext {
  sessionId?: string | null;
  taskId?: string | null;
  ticketId?: string | null;
  workerId?: string | null;
  nodeId?: string | null;
  task?: A2ATaskRecord | null;
  linkedIssue?: LinearIssueItem | null;
}

export interface ContextRailHostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ContextRailContext;
  readOnly?: boolean;
  busyAction?: string | null;
  onCompactTask?: (taskId: string) => void;
  onSettleTask?: (taskId: string) => void;
  onSnoozeTask?: (taskId: string, minutes: number) => void;
  onOpenProjectIssue?: (issueId: string) => void;
  onOpenBtw?: (taskId: string) => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}

interface SpillState {
  status: 'loading' | 'loaded' | 'error';
  content?: string;
  error?: string;
}

const UPCOMING_PANELS = [
  { id: 'worktree-diff', label: 'Worktree / Diff', icon: GitBranch, note: '分支、补丁与提交差异' },
  { id: 'execution-trace', label: 'Execution Trace', icon: Activity, note: '逐步执行轨迹与耗时' },
  { id: 'cdp-bridge', label: 'CDP Bridge', icon: Monitor, note: '浏览器调试桥与页面快照' },
  { id: 'codex-bridge', label: 'Codex Bridge', icon: Terminal, note: 'Codex 会话与命令回放' },
  { id: 'memory-provenance', label: 'Memory Provenance', icon: Database, note: '记忆来源与召回证据' },
] as const;

function readStoredRailWidth(): number {
  if (typeof window === 'undefined') return CONTEXT_RAIL_DEFAULT_WIDTH;
  try {
    const raw = window.localStorage.getItem(RAIL_WIDTH_KEY);
    if (raw == null) return CONTEXT_RAIL_DEFAULT_WIDTH;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clampContextRailWidth(parsed) : CONTEXT_RAIL_DEFAULT_WIDTH;
  } catch {
    return CONTEXT_RAIL_DEFAULT_WIDTH;
  }
}

function persistRailWidth(width: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RAIL_WIDTH_KEY, String(Math.round(width)));
  } catch {
    return;
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable === true
  );
}

function formatBytes(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relationLabel(relation?: string | null): string {
  if (relation === 'side_thread') return 'BTW 侧线程';
  if (relation === 'btw') return 'BTW 分支';
  if (relation === 'subtask') return '子任务';
  if (relation === 'continuation') return '续接线程';
  return relation || '主线程';
}

function contextBudgetPercent(task?: A2ATaskRecord | null): number {
  const budget = task?.contextBudget;
  if (!budget) return 0;
  if (Number.isFinite(budget.usagePct)) {
    return Math.max(0, Math.min(100, budget.usagePct));
  }
  if (budget.maxTokens > 0 && Number.isFinite(budget.estimatedTokens)) {
    return Math.max(0, Math.min(100, (budget.estimatedTokens / budget.maxTokens) * 100));
  }
  return 0;
}

function budgetToneClass(pct: number): string {
  if (pct >= 88) return 'bg-[var(--err-dot)]';
  if (pct >= 72) return 'bg-[var(--warn-dot)]';
  return 'bg-[var(--accent)]';
}

function ContextValue({ value }: { value?: string | null }) {
  const text = (value || '').trim();
  return text ? (
    <span className="font-mono text-[11.5px] text-[var(--ink)] break-all tabular-nums" title={text}>
      {text}
    </span>
  ) : (
    <span className="text-[11.5px] text-[var(--ink-subtle)]">—</span>
  );
}

function OverviewSection({
  context,
  readOnly,
  busyAction,
  onCompactTask,
  onSettleTask,
  onSnoozeTask,
  onOpenProjectIssue,
  onOpenBtw,
  onToast,
  upcomingPanels,
}: {
  context: ContextRailContext;
  readOnly: boolean;
  busyAction?: string | null;
  onCompactTask?: (taskId: string) => void;
  onSettleTask?: (taskId: string) => void;
  onSnoozeTask?: (taskId: string, minutes: number) => void;
  onOpenProjectIssue?: (issueId: string) => void;
  onOpenBtw?: (taskId: string) => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  upcomingPanels: ReadonlyArray<(typeof UPCOMING_PANELS)[number]>;
}) {
  const task = context.task || null;
  const [openSpills, setOpenSpills] = React.useState<Record<string, boolean>>({});
  const [spillState, setSpillState] = React.useState<Record<string, SpillState>>({});

  const queuedTurns = task?.queuedTurns || [];
  const steeringNotes = task?.steeringNotes || [];
  const queuedCount = queuedTurns.filter((turn) => turn.status !== 'canceled').length;
  const spills = task?.outputSpills || [];
  const budgetPct = contextBudgetPercent(task);
  const budget = task?.contextBudget;

  const compactBusy =
    Boolean(busyAction) &&
    (busyAction === 'compact' ||
      busyAction === `compact:${task?.id}` ||
      (Boolean(task?.id) && busyAction === task?.id));

  const resolveSpill = React.useCallback(
    async (spillId: string) => {
      if (!task?.id) return;
      const existing = spillState[spillId];
      if (existing?.status === 'loading' || existing?.status === 'loaded') return;
      setSpillState((prev) => ({ ...prev, [spillId]: { status: 'loading' } }));
      try {
        const response = await fetchA2ATaskSpill(task.id, spillId);
        const content = response.spill?.content || '';
        setSpillState((prev) => ({
          ...prev,
          [spillId]: { status: 'loaded', content },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : '输出溢写加载失败';
        setSpillState((prev) => ({
          ...prev,
          [spillId]: { status: 'error', error: message },
        }));
        onToast?.(`输出溢写加载失败：${message}`, 'err');
      }
    },
    [onToast, spillState, task?.id],
  );

  const toggleSpill = (spillId: string) => {
    const nextOpen = !openSpills[spillId];
    setOpenSpills((prev) => ({ ...prev, [spillId]: nextOpen }));
    if (nextOpen && spillState[spillId]?.status !== 'loaded') {
      void resolveSpill(spillId);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2" aria-label="活动上下文标识">
        <h3 className="text-[11px] font-semibold tracking-wide text-[var(--ink-subtle)]">
          活动上下文
        </h3>
        <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
          <dt className="text-[var(--ink-subtle)]">Session</dt>
          <dd className="min-w-0">
            <ContextValue value={context.sessionId} />
          </dd>
          <dt className="text-[var(--ink-subtle)]">Task</dt>
          <dd className="min-w-0">
            <ContextValue value={context.taskId || task?.id} />
          </dd>
          <dt className="text-[var(--ink-subtle)]">Ticket</dt>
          <dd className="min-w-0">
            <ContextValue value={context.ticketId || task?.matchedRuleId} />
          </dd>
          <dt className="text-[var(--ink-subtle)]">Worker</dt>
          <dd className="min-w-0">
            <ContextValue value={context.workerId || task?.workerAgentId} />
          </dd>
          <dt className="text-[var(--ink-subtle)]">Node</dt>
          <dd className="min-w-0">
            <ContextValue value={context.nodeId || task?.workerNodeId} />
          </dd>
        </dl>
        {task ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[var(--ink-subtle)]">
            <span className="text-[var(--ink-muted)]">{task.state}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatRelativeAge(task.updatedAt)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{task.durationMs}ms</span>
          </div>
        ) : null}
      </section>

      <section className="space-y-2" aria-label="线程血缘">
        <h3 className="text-[11px] font-semibold tracking-wide text-[var(--ink-subtle)]">线程血缘</h3>
        <div className="space-y-1.5 text-[11.5px] text-[var(--ink-subtle)]">
          <div className="flex items-center justify-between gap-2">
            <span>关系</span>
            <span className="text-[var(--ink-muted)]">{relationLabel(task?.relation)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>父线程</span>
            <ContextValue value={task?.parentThreadId} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>根线程</span>
            <ContextValue value={task?.rootThreadId} />
          </div>
        </div>
      </section>

      <section className="space-y-2" aria-label="上下文预算">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-semibold tracking-wide text-[var(--ink-subtle)]">上下文预算</h3>
          <span className="font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums">
            {budget
              ? `${budget.estimatedTokens.toLocaleString()} / ${budget.maxTokens.toLocaleString()}`
              : '暂无计量'}
            {budget ? <span className="ml-1.5 text-[var(--ink-subtle)]">{Math.round(budgetPct)}%</span> : null}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]"
          role="meter"
          aria-label="上下文窗口占用"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(budgetPct)}
        >
          <div
            className={cn('h-full w-full origin-left rounded-full', budgetToneClass(budgetPct))}
            style={{ transform: `scaleX(${budgetPct / 100})` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[var(--ink-subtle)]">
          <span className="font-mono tabular-nums">{queuedCount} 排队</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{steeringNotes.length} 纠偏</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{budget?.compactedCount ?? task?.compactions?.length ?? 0} 次压缩</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Button
            variant="secondary"
            size="sm"
            data-testid="context-rail-compact-btn"
            disabled={!task || readOnly || compactBusy}
            onClick={() => {
              if (task && !readOnly) onCompactTask?.(task.id);
            }}
            className="touch-manipulation"
          >
            <Sparkles className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
            {compactBusy ? '压缩中…' : '/compact'}
          </Button>
          {onOpenBtw && task ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenBtw(task.id)}
              className="touch-manipulation"
            >
              <MessageSquare className="size-3.5" strokeWidth={1.75} />
              BTW 侧聊
            </Button>
          ) : null}
          {!readOnly && task && onSettleTask ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={Boolean(task.settledAt)}
              onClick={() => onSettleTask(task.id)}
              className="touch-manipulation"
            >
              归档
            </Button>
          ) : null}
          {!readOnly && task && onSnoozeTask ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSnoozeTask(task.id, 30)}
              className="touch-manipulation"
            >
              稍后 30m
            </Button>
          ) : null}
        </div>
      </section>

      {context.linkedIssue ? (
        <section className="space-y-2" aria-label="关联 Linear 事务">
          <h3 className="text-[11px] font-semibold tracking-wide text-[var(--ink-subtle)]">关联事务</h3>
          <button
            type="button"
            disabled={!onOpenProjectIssue}
            onClick={() => {
              if (context.linkedIssue) onOpenProjectIssue?.(context.linkedIssue.id);
            }}
            className={cn(
              'group flex w-full items-start gap-2 rounded-lg border border-[var(--border-subtle)] px-2.5 py-2 text-left transition-colors duration-150 ease-out',
              onOpenProjectIssue
                ? 'hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] cursor-pointer'
                : 'opacity-70 cursor-default',
              FOCUS_RING,
            )}
          >
            <Link2 className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[11.5px] text-[var(--ink)] tabular-nums">
                {context.linkedIssue.identifier}
              </span>
              <span className="block truncate text-[12px] text-[var(--ink-muted)]">
                {context.linkedIssue.title}
              </span>
              <span className="mt-0.5 block text-[11px] text-[var(--ink-subtle)]">
                {context.linkedIssue.status} · {context.linkedIssue.assigneeName || '未分配'}
              </span>
            </span>
            {onOpenProjectIssue ? (
              <ExternalLink
                className="mt-0.5 size-3.5 shrink-0 text-[var(--ink-subtle)] group-hover:text-[var(--ink)]"
                strokeWidth={1.75}
              />
            ) : null}
          </button>
        </section>
      ) : null}

      <section className="space-y-2" aria-label="输出溢写">
        <h3 className="text-[11px] font-semibold tracking-wide text-[var(--ink-subtle)]">
          输出溢写 <span className="font-mono tabular-nums">{spills.length}</span>
        </h3>
        {spills.length === 0 ? (
          <p className="text-[12px] text-[var(--ink-subtle)]">当前线程没有大块输出溢写。</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {spills.map((spill) => {
              const open = openSpills[spill.id] === true;
              const state = spillState[spill.id];
              return (
                <li key={spill.id} className="py-1.5 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => toggleSpill(spill.id)}
                    aria-expanded={open}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)] cursor-pointer',
                      FOCUS_RING,
                    )}
                  >
                    {open ? (
                      <ChevronDown className="size-3.5 shrink-0 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-[var(--ink)]">{spill.label}</span>
                      <span className="block text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
                        {formatBytes(spill.bytes)} · {formatDateTime(spill.createdAt)}
                        {spill.truncated ? ' · 已截断' : ''}
                      </span>
                    </span>
                  </button>
                  {open ? (
                    <div className="mt-1.5 space-y-1.5 pl-5">
                      {state?.status === 'loading' ? (
                        <p className="text-[11.5px] text-[var(--ink-subtle)]">正在加载完整溢写…</p>
                      ) : state?.status === 'error' ? (
                        <p className="text-[11.5px] text-[var(--err)]">{state.error}</p>
                      ) : state?.status === 'loaded' ? (
                        <pre className="max-h-56 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--terminal-bg)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--terminal-ink)] whitespace-pre-wrap break-words">
                          {state.content || spill.preview || '（空）'}
                        </pre>
                      ) : (
                        <p className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[var(--ink-muted)]">
                          {spill.preview || '（无预览）'}
                        </p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {upcomingPanels.length > 0 ? (
        <section className="space-y-2" aria-label="即将接入的槽位面板">
          <h3 className="text-[11px] font-semibold tracking-wide text-[var(--ink-subtle)]">
            PR 9b 插槽就绪
          </h3>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {upcomingPanels.map((panel) => {
              const Icon = panel.icon;
              return (
                <li key={panel.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                  <Icon className="size-3.5 shrink-0 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] text-[var(--ink-muted)]">{panel.label}</span>
                    <span className="block truncate text-[10.5px] text-[var(--ink-subtle)]">{panel.note}</span>
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink-subtle)]">slot</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function ContextRailHost({
  open,
  onOpenChange,
  context,
  readOnly = false,
  busyAction = null,
  onCompactTask,
  onSettleTask,
  onSnoozeTask,
  onOpenProjectIssue,
  onOpenBtw,
  onToast,
}: ContextRailHostProps) {
  const [width, setWidth] = React.useState<number>(() => readStoredRailWidth());
  const [activePanelId, setActivePanelId] = React.useState<string>('overview');
  const draggingRef = React.useRef(false);
  const dynamicPanels = useUiSlots<ContextRailContext>('rail.panel', { viewId: 'agents' });

  React.useEffect(() => {
    persistRailWidth(width);
  }, [width]);

  React.useEffect(() => {
    if (activePanelId === 'overview') return;
    if (!dynamicPanels.some((panel) => panel.id === activePanelId)) {
      setActivePanelId('overview');
    }
  }, [activePanelId, dynamicPanels]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== ']') return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      onOpenChange(!open);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange, open]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      setWidth(clampContextRailWidth(window.innerWidth - event.clientX));
    };
    const onPointerUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="打开会话上下文侧栏 (Cmd/Ctrl + ])"
        title="打开上下文侧栏 (⌘])"
        data-testid="context-rail-toggle"
        className={cn(
          'fixed right-0 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 border-[var(--border)] bg-[var(--surface-elevated)] py-2 pl-2 pr-1.5 text-[11.5px] font-medium text-[var(--ink-muted)] shadow-[var(--shadow-card)] transition-colors duration-150 ease-out hover:text-[var(--ink)]',
          FOCUS_RING,
        )}
      >
        <PanelRight className="size-3.5" strokeWidth={1.75} />
        上下文
      </button>
    );
  }

  const activeSlot = dynamicPanels.find((panel) => panel.id === activePanelId) || null;
  const upcomingPanels = UPCOMING_PANELS.filter(
    (panel) => !dynamicPanels.some((slot) => slot.id === panel.id),
  );

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-zinc-950/25 sm:hidden"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <aside
        data-testid="context-rail-host"
        aria-label="会话上下文侧栏"
        className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-modal)] sm:w-[var(--rail-width)]"
        style={{ '--rail-width': `${width}px` } as React.CSSProperties}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="调整上下文侧栏宽度"
          data-testid="context-rail-resize-handle"
          onPointerDown={(event) => {
            event.preventDefault();
            draggingRef.current = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
          }}
          className="absolute inset-y-0 left-0 hidden w-2 -translate-x-1 cursor-col-resize touch-none items-center justify-center sm:flex"
        >
          <span className="flex h-10 w-1 items-center justify-center rounded-full bg-[var(--border-strong)]">
            <GripVertical className="size-2.5 text-[var(--ink-subtle)]" strokeWidth={2} />
          </span>
        </div>

        <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-semibold tracking-tight text-[var(--ink)] text-balance">
              会话上下文
            </h2>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--ink-subtle)]">
              {context.taskId || context.sessionId || '未选择线程'}
              <span className="mx-1.5">·</span>
              Cmd/Ctrl + ] 切换
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="关闭上下文侧栏"
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-md text-[var(--ink-subtle)] transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] cursor-pointer',
                FOCUS_RING,
              )}
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <nav
          aria-label="上下文面板切换"
          className="flex shrink-0 items-center gap-4 overflow-x-auto border-b border-[var(--border-subtle)] px-4"
        >
          <button
            type="button"
            onClick={() => setActivePanelId('overview')}
            aria-current={activePanelId === 'overview' ? 'page' : undefined}
            className={cn(
              '-mb-px shrink-0 border-b-2 py-2 text-[12px] font-medium transition-colors duration-150 ease-out cursor-pointer',
              activePanelId === 'overview'
                ? 'border-[var(--accent)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)]',
              FOCUS_RING,
            )}
          >
            会话概览
          </button>
          {dynamicPanels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              data-slot-id={panel.id}
              onClick={() => setActivePanelId(panel.id)}
              aria-current={activePanelId === panel.id ? 'page' : undefined}
              title={panel.description}
              className={cn(
                '-mb-px shrink-0 border-b-2 py-2 text-[12px] font-medium transition-colors duration-150 ease-out cursor-pointer',
                activePanelId === panel.id
                  ? 'border-[var(--accent)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)]',
                FOCUS_RING,
              )}
            >
              {panel.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {activeSlot ? (
            <div data-slot-id={activeSlot.id} className="min-w-0">
              {activeSlot.render ? (
                activeSlot.render(context)
              ) : (
                <div className="space-y-2">
                  <h3 className="text-[13px] font-semibold text-[var(--ink)]">{activeSlot.label}</h3>
                  <p className="text-[12px] leading-relaxed text-[var(--ink-muted)] text-pretty">
                    {activeSlot.description || '该面板由动态 UI 插槽注册。'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <OverviewSection
              context={context}
              readOnly={readOnly}
              busyAction={busyAction}
              onCompactTask={onCompactTask}
              onSettleTask={onSettleTask}
              onSnoozeTask={onSnoozeTask}
              onOpenProjectIssue={onOpenProjectIssue}
              onOpenBtw={onOpenBtw}
              onToast={onToast}
              upcomingPanels={upcomingPanels}
            />
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2 text-[10.5px] text-[var(--ink-subtle)]">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="size-3" strokeWidth={1.75} />
            {readOnly ? '只读模式' : '可交互'}
          </span>
          <span className="font-mono tabular-nums">{Math.round(width)}px</span>
        </footer>
      </aside>
    </>
  );
}

export default ContextRailHost;
