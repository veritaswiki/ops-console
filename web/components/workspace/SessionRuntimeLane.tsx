import React from 'react';
import {
  ArrowUpRight,
  GitBranch,
  Link2,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { A2AAgentPeer, A2ATaskRecord, LinearIssueItem } from '../../types';
import { formatInlineOutputPreview } from '../../lib/workspace-controls';
import { cn, FOCUS_RING } from '../../lib/cn';
import { formatRelativeAge } from '../../utils/format';
import { Button } from '../ui';

const PAGE_SIZE = 15;

type RuntimeFilter = 'all' | 'active' | 'attention' | 'done';

const FILTERS: ReadonlyArray<{ id: RuntimeFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '执行中' },
  { id: 'attention', label: '待关注' },
  { id: 'done', label: '已完成' },
];

export interface SessionRuntimeLaneProps {
  tasks: A2ATaskRecord[];
  agents: A2AAgentPeer[];
  activeTaskId: string | null;
  issueByTaskId: Map<string, LinearIssueItem>;
  readOnly?: boolean;
  busyTaskId?: string | null;
  onSelectTask: (taskId: string) => void;
  onOpenBtw: (taskId: string) => void;
  onOpenProjectIssue?: (issueId: string) => void;
  onQueueTurn: (taskId: string, prompt: string) => Promise<void>;
  onSteerTask: (taskId: string, instruction: string) => Promise<void>;
  onRestartTask: (taskId: string, freshContext: boolean) => Promise<void>;
  onSettleTask: (taskId: string) => Promise<void>;
  onSnoozeTask: (taskId: string, minutes: number) => Promise<void>;
  onCompactTask: (taskId: string) => Promise<void>;
  onOpenProjectsBoard?: () => void;
}

function isDoneTask(task: A2ATaskRecord): boolean {
  return (
    Boolean(task.settledAt) ||
    task.state === 'completed' ||
    task.state === 'canceled'
  );
}

function isActiveTask(task: A2ATaskRecord): boolean {
  if (isDoneTask(task)) return false;
  return (
    task.state === 'submitted' ||
    task.state === 'working' ||
    task.state === 'reviewing' ||
    task.state === 'queued'
  );
}

function needsAttention(task: A2ATaskRecord): boolean {
  if (task.state === 'failed' && !task.settledAt) return true;
  if (task.attention?.needsAttention === true) return true;
  if (task.attention?.unread === true && task.attention.snoozed !== true) return true;
  if (task.attention?.snoozeWokenEarly === true) return true;
  return false;
}

function matchesFilter(task: A2ATaskRecord, filter: RuntimeFilter): boolean {
  if (filter === 'active') return isActiveTask(task);
  if (filter === 'attention') return needsAttention(task);
  if (filter === 'done') return isDoneTask(task);
  return true;
}

function taskStateLabel(state: string): string {
  if (state === 'submitted') return '已提交';
  if (state === 'working') return '执行中';
  if (state === 'reviewing') return '会审中';
  if (state === 'completed') return '已完成';
  if (state === 'failed') return '失败';
  if (state === 'canceled') return '已取消';
  if (state === 'queued') return '排队中';
  return state;
}

function taskStateTone(state: string): 'ok' | 'warn' | 'err' | 'muted' {
  if (state === 'completed') return 'ok';
  if (state === 'failed') return 'err';
  if (state === 'working' || state === 'reviewing' || state === 'submitted' || state === 'queued') {
    return 'warn';
  }
  return 'muted';
}

function toneDotClass(tone: 'ok' | 'warn' | 'err' | 'muted'): string {
  if (tone === 'ok') return 'bg-[var(--ok-dot)]';
  if (tone === 'warn') return 'bg-[var(--warn-dot)]';
  if (tone === 'err') return 'bg-[var(--err-dot)]';
  return 'bg-[var(--muted-dot)]';
}

function toneTextClass(tone: 'ok' | 'warn' | 'err' | 'muted'): string {
  if (tone === 'ok') return 'text-[var(--ok)]';
  if (tone === 'warn') return 'text-[var(--warn)]';
  if (tone === 'err') return 'text-[var(--err)]';
  return 'text-[var(--ink-muted)]';
}

function contextPercent(task: A2ATaskRecord): number {
  const budget = task.contextBudget;
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

function activeQueueCount(task: A2ATaskRecord): number {
  return (task.queuedTurns || []).filter((turn) => turn.status !== 'canceled').length;
}

function ThreadControlBar({
  task,
  readOnly,
  busyTaskId,
  onQueueTurn,
  onSteerTask,
  onRestartTask,
  onSettleTask,
  onSnoozeTask,
  onCompactTask,
}: {
  task: A2ATaskRecord;
  readOnly: boolean;
  busyTaskId?: string | null;
  onQueueTurn: (taskId: string, prompt: string) => Promise<void>;
  onSteerTask: (taskId: string, instruction: string) => Promise<void>;
  onRestartTask: (taskId: string, freshContext: boolean) => Promise<void>;
  onSettleTask: (taskId: string) => Promise<void>;
  onSnoozeTask: (taskId: string, minutes: number) => Promise<void>;
  onCompactTask: (taskId: string) => Promise<void>;
}) {
  const [queueText, setQueueText] = React.useState('');
  const [steerText, setSteerText] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setQueueText('');
    setSteerText('');
    setActionError(null);
    setPendingAction(null);
  }, [task.id]);

  const busy = Boolean(busyTaskId) || pendingAction !== null;
  const locked = readOnly;
  const pct = contextPercent(task);
  const budget = task.contextBudget;
  const stateTone = taskStateTone(task.state);

  const runAction = async (key: string, action: () => Promise<void>) => {
    if (locked || busy) return;
    setPendingAction(key);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '操作失败');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section
      aria-label="当前线程控制"
      className="space-y-2.5 border-y border-[var(--border-subtle)] bg-[var(--surface-subtle)]/35 px-3 py-3 sm:px-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[12px]">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', toneDotClass(stateTone))} />
            <span className={cn('font-medium', toneTextClass(stateTone))}>{taskStateLabel(task.state)}</span>
            <span aria-hidden="true" className="text-[var(--ink-subtle)]">·</span>
            <span className="truncate font-mono text-[11px] text-[var(--ink-subtle)]">{task.id}</span>
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--ink-muted)]" title={task.prompt}>
            {formatInlineOutputPreview(task.prompt, 140).preview || '（无提示词）'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
          <span>{activeQueueCount(task)} 排队</span>
          <span aria-hidden="true">·</span>
          <span>{(task.steeringNotes || []).length} 纠偏</span>
          <span aria-hidden="true">·</span>
          <span>{(task.outputSpills || []).length} 溢写</span>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const prompt = queueText.trim();
            if (!prompt) return;
            void runAction('queue', async () => {
              await onQueueTurn(task.id, prompt);
              setQueueText('');
            });
          }}
          className="flex min-w-0 items-center gap-1.5"
        >
          <input
            type="text"
            value={queueText}
            disabled={locked || busy}
            onChange={(event) => setQueueText(event.target.value)}
            placeholder="排队下一轮提示词…"
            aria-label="排队下一轮提示词"
            className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] transition-colors duration-150 ease-out focus:border-[var(--accent)] disabled:opacity-50 sm:h-8 sm:text-[12.5px]"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={locked || busy || !queueText.trim()}
            className="touch-manipulation"
          >
            排队
          </Button>
        </form>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const instruction = steerText.trim();
            if (!instruction) return;
            void runAction('steer', async () => {
              await onSteerTask(task.id, instruction);
              setSteerText('');
            });
          }}
          className="flex min-w-0 items-center gap-1.5"
        >
          <input
            type="text"
            value={steerText}
            disabled={locked || busy}
            onChange={(event) => setSteerText(event.target.value)}
            placeholder="插入纠偏指令…"
            aria-label="插入纠偏指令"
            className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] transition-colors duration-150 ease-out focus:border-[var(--accent)] disabled:opacity-50 sm:h-8 sm:text-[12.5px]"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={locked || busy || !steerText.trim()}
            className="touch-manipulation"
          >
            纠偏
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          disabled={locked || busy}
          onClick={() => void runAction('restart', () => onRestartTask(task.id, false))}
          className="touch-manipulation"
        >
          <RefreshCw className="size-3.5" strokeWidth={1.75} />
          重启
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={locked || busy}
          onClick={() => void runAction('fresh', () => onRestartTask(task.id, true))}
          className="touch-manipulation"
        >
          全新上下文
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={locked || busy || Boolean(task.settledAt)}
          onClick={() => void runAction('settle', () => onSettleTask(task.id))}
          className="touch-manipulation"
        >
          归档
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={locked || busy}
          onClick={() => void runAction('snooze-30', () => onSnoozeTask(task.id, 30))}
          className="touch-manipulation"
        >
          稍后 30m
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={locked || busy}
          onClick={() => void runAction('snooze-120', () => onSnoozeTask(task.id, 120))}
          className="touch-manipulation"
        >
          2h
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={locked || busy}
          onClick={() => void runAction('compact', () => onCompactTask(task.id))}
          className="touch-manipulation"
        >
          <Sparkles className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
          /compact
        </Button>
        {pendingAction ? (
          <span className="ml-1 text-[11.5px] text-[var(--ink-subtle)]">执行中…</span>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2 text-[11px] text-[var(--ink-subtle)]">
          <span>Context Window</span>
          <span className="font-mono tabular-nums">
            {budget
              ? `${budget.estimatedTokens.toLocaleString()} / ${budget.maxTokens.toLocaleString()} · ${Math.round(pct)}%`
              : '暂无计量'}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]"
          role="meter"
          aria-label="当前线程上下文窗口占用"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div
            className={cn('h-full w-full origin-left rounded-full', budgetToneClass(pct))}
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
      </div>

      {actionError ? (
        <p role="alert" className="text-[11.5px] text-[var(--err)]">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}

export function SessionRuntimeLane({
  tasks,
  agents,
  activeTaskId,
  issueByTaskId,
  readOnly = false,
  busyTaskId = null,
  onSelectTask,
  onOpenBtw,
  onOpenProjectIssue,
  onQueueTurn,
  onSteerTask,
  onRestartTask,
  onSettleTask,
  onSnoozeTask,
  onCompactTask,
  onOpenProjectsBoard,
}: SessionRuntimeLaneProps) {
  const [filter, setFilter] = React.useState<RuntimeFilter>('all');
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  const nodeNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      if (agent.nodeId && agent.nodeName) map.set(agent.nodeId, agent.nodeName);
    }
    return map;
  }, [agents]);

  const counts = React.useMemo(() => {
    const result: Record<RuntimeFilter, number> = {
      all: tasks.length,
      active: 0,
      attention: 0,
      done: 0,
    };
    for (const task of tasks) {
      if (isActiveTask(task)) result.active += 1;
      if (needsAttention(task)) result.attention += 1;
      if (isDoneTask(task)) result.done += 1;
    }
    return result;
  }, [tasks]);

  const filteredTasks = React.useMemo(
    () => tasks.filter((task) => matchesFilter(task, filter)),
    [filter, tasks],
  );

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  const visibleTasks = filteredTasks.slice(0, visibleCount);
  const focusTask =
    tasks.find((task) => task.id === activeTaskId) ||
    filteredTasks.find((task) => task.id === activeTaskId) ||
    filteredTasks[0] ||
    null;

  return (
    <section
      data-testid="session-runtime-lane"
      aria-label="会话运行时泳道"
      className="min-w-0 space-y-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold tracking-tight text-[var(--ink)]">
            会话运行时
          </h3>
          <p className="mt-0.5 text-[11.5px] text-[var(--ink-subtle)]">
            轻量队列与线程控制 · 完整拖拽看板已收敛至 Projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
            {filteredTasks.length} / {tasks.length}
          </span>
          {onOpenProjectsBoard ? (
            <button
              type="button"
              onClick={onOpenProjectsBoard}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-[var(--ink-subtle)] transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--accent)] cursor-pointer touch-manipulation',
                FOCUS_RING,
              )}
            >
              完整 Projects 看板
              <ArrowUpRight className="size-3" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="会话运行时过滤器"
        className="flex items-center gap-4 overflow-x-auto border-b border-[var(--border-subtle)]"
      >
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-filter={item.id}
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 py-1.5 text-[12px] font-medium transition-colors duration-150 ease-out cursor-pointer touch-manipulation',
              filter === item.id
                ? 'border-[var(--accent)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)]',
              FOCUS_RING,
            )}
          >
            {item.label}
            <span className="font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
              {counts[item.id]}
            </span>
          </button>
        ))}
      </div>

      {focusTask ? (
        <ThreadControlBar
          task={focusTask}
          readOnly={readOnly}
          busyTaskId={busyTaskId}
          onQueueTurn={onQueueTurn}
          onSteerTask={onSteerTask}
          onRestartTask={onRestartTask}
          onSettleTask={onSettleTask}
          onSnoozeTask={onSnoozeTask}
          onCompactTask={onCompactTask}
        />
      ) : null}

      {filteredTasks.length === 0 ? (
        <p className="py-8 text-center text-[12.5px] text-[var(--ink-subtle)]">
          当前过滤条件下没有会话线程。
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {visibleTasks.map((task) => {
            const isActive = task.id === activeTaskId;
            const tone = taskStateTone(task.state);
            const preview = formatInlineOutputPreview(task.prompt, 180);
            const linkedIssue = issueByTaskId.get(task.id) || null;
            const nodeName = nodeNameById.get(task.workerNodeId) || task.workerNodeId || '未知节点';
            const modelLabel = task.appliedModel || task.selectedModel || '默认模型';
            const spillCount = (task.outputSpills || []).length;
            const steerCount = (task.steeringNotes || []).length;
            const queueCount = activeQueueCount(task);
            return (
              <li
                key={task.id}
                data-testid={`session-runtime-task-${task.id}`}
                className={cn(
                  'relative px-2.5 py-2.5 transition-colors duration-150 ease-out sm:px-3',
                  isActive ? 'bg-[var(--accent-soft)]/35' : 'hover:bg-[var(--surface-hover)]/50',
                )}
              >
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[var(--accent)]"
                  />
                ) : null}
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', toneDotClass(tone))}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                    className={cn(
                      'min-w-0 flex-1 rounded-md text-left cursor-pointer touch-manipulation',
                      FOCUS_RING,
                    )}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <div className="flex min-h-[28px] items-center gap-1.5 sm:min-h-0">
                      <span className={cn('text-[12px] font-medium whitespace-nowrap', toneTextClass(tone))}>
                        {taskStateLabel(task.state)}
                      </span>
                      <span aria-hidden="true" className="text-[11px] text-[var(--ink-subtle)]">·</span>
                      <span
                        className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ink)]"
                        title={task.prompt}
                      >
                        {preview.preview || '（无提示词）'}
                        {preview.truncated ? '…' : ''}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
                      <span className="truncate max-w-[150px]">{nodeName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[150px]">{task.workerAgentName || task.leadAgentName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[160px]">{modelLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeAge(task.updatedAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{queueCount} 排队</span>
                      <span aria-hidden="true">·</span>
                      <span>{steerCount} 纠偏</span>
                      <span aria-hidden="true">·</span>
                      <span>{spillCount} 溢写</span>
                      {task.contextBudget ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{Math.round(contextPercent(task))}% ctx</span>
                        </>
                      ) : null}
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    {linkedIssue ? (
                      <button
                        type="button"
                        disabled={!onOpenProjectIssue}
                        onClick={() => {
                          if (linkedIssue) onOpenProjectIssue?.(linkedIssue.id);
                        }}
                        title={`${linkedIssue.identifier} · ${linkedIssue.title}`}
                        className={cn(
                          'inline-flex min-h-[32px] items-center gap-1 rounded-md px-1.5 text-[10.5px] text-[var(--ink-subtle)] transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] sm:min-h-0',
                          onOpenProjectIssue ? 'cursor-pointer' : 'opacity-60 cursor-default',
                          FOCUS_RING,
                        )}
                      >
                        <Link2 className="size-3" strokeWidth={1.75} />
                        <span className="font-mono tabular-nums">{linkedIssue.identifier}</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      data-testid={`task-open-btw-${task.id}`}
                      onClick={() => onOpenBtw(task.id)}
                      aria-label={`打开 ${task.id} 的 BTW 侧聊`}
                      className={cn(
                        'inline-flex min-h-[32px] items-center gap-1 rounded-md px-1.5 text-[10.5px] text-[var(--ink-subtle)] transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] cursor-pointer sm:min-h-0 touch-manipulation',
                        FOCUS_RING,
                      )}
                    >
                      <GitBranch className="size-3" strokeWidth={1.75} />
                      BTW
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {visibleCount < filteredTasks.length ? (
        <div className="flex justify-center pt-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="touch-manipulation"
          >
            显示更多
            <span className="font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums">
              {Math.min(PAGE_SIZE, filteredTasks.length - visibleCount)}
            </span>
          </Button>
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <p className="flex items-center justify-center gap-1.5 py-2 text-center text-[11px] text-[var(--ink-subtle)]">
          <MessageSquare className="size-3.5" strokeWidth={1.75} />
          选择或创建一个线程后，这里会显示队列、纠偏与上下文预算。
        </p>
      ) : null}
    </section>
  );
}

export default SessionRuntimeLane;
