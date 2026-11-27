import React from 'react';
import {
  ArrowUpRight,
  GitBranch,
  GripVertical,
  Plus,
  Search,
  Server,
  X,
} from 'lucide-react';
import type { A2AAgentPeer, A2ATaskRecord } from '../types';
import {
  filterAgentTasks,
  groupTasksByLifecycle,
  KANBAN_LIFECYCLE_COLUMNS,
  kanbanColumnToTaskState,
  shortAgentName,
  taskStateToKanbanColumn,
  type KanbanCanonicalTaskState,
  type KanbanLifecycleColumnId,
} from '../lib/agent-console';
import { cn, FOCUS_RING } from '../lib/cn';
import { formatDateTime } from '../utils/format';
import { Button, inputBaseClass } from './ui';

function formatDurationMs(ms?: number | null): string {
  if (ms == null || ms <= 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m${secs}s`;
}

function formatShortRelative(ts?: string | null): string {
  if (!ts) return '-';
  const parsed = Date.parse(ts);
  if (!Number.isFinite(parsed)) return formatDateTime(ts);
  const diffSec = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSec < 60) return `${diffSec}s 前`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m 前`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h 前`;
  return formatDateTime(ts);
}

function columnAccentClasses(tone: 'muted' | 'warn' | 'ok' | 'err'): {
  topBar: string;
  dot: string;
  countText: string;
} {
  switch (tone) {
    case 'warn':
      return {
        topBar: 'bg-[var(--warn-dot)]/75',
        dot: 'bg-[var(--warn-dot)]',
        countText: 'text-[var(--warn)]',
      };
    case 'ok':
      return {
        topBar: 'bg-[var(--ok-dot)]/75',
        dot: 'bg-[var(--ok-dot)]',
        countText: 'text-[var(--ok)]',
      };
    case 'err':
      return {
        topBar: 'bg-[var(--err-dot)]/75',
        dot: 'bg-[var(--err-dot)]',
        countText: 'text-[var(--err)]',
      };
    case 'muted':
    default:
      return {
        topBar: 'bg-[var(--muted-dot)]/60',
        dot: 'bg-[var(--muted-dot)]',
        countText: 'text-[var(--ink-muted)]',
      };
  }
}

export interface AgentTaskKanbanProps {
  tasks: A2ATaskRecord[];
  agents?: A2AAgentPeer[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  activeTaskId?: string | null;
  readOnly?: boolean;
  movingTaskId?: string | null;
  onOpenTask: (taskId: string) => void;
  onMoveTaskState: (
    taskId: string,
    targetState: KanbanCanonicalTaskState,
  ) => void | Promise<void>;
  onCreateNewTask: () => void;
}

export function AgentTaskKanban({
  tasks,
  agents = [],
  searchQuery,
  onSearchQueryChange,
  activeTaskId = null,
  readOnly = false,
  movingTaskId = null,
  onOpenTask,
  onMoveTaskState,
  onCreateNewTask,
}: AgentTaskKanbanProps) {
  const [draggingTaskId, setDraggingTaskId] = React.useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = React.useState<KanbanLifecycleColumnId | null>(null);

  const nodeNameById = React.useMemo(() => {
    const lookup = new Map<string, string>();
    for (const agent of agents) {
      if (agent.nodeId && agent.nodeName) {
        lookup.set(agent.nodeId, agent.nodeName);
      }
    }
    return lookup;
  }, [agents]);

  const filteredTasks = React.useMemo(
    () => filterAgentTasks(tasks, searchQuery),
    [tasks, searchQuery],
  );

  const grouped = React.useMemo(
    () => groupTasksByLifecycle(filteredTasks),
    [filteredTasks],
  );

  const hasQuery = searchQuery.trim().length > 0;

  const handleColumnDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    columnId: KanbanLifecycleColumnId,
  ) => {
    if (readOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleColumnDragLeave = (
    event: React.DragEvent<HTMLDivElement>,
    columnId: KanbanLifecycleColumnId,
  ) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleColumnDrop = (
    event: React.DragEvent<HTMLDivElement>,
    columnId: KanbanLifecycleColumnId,
  ) => {
    event.preventDefault();
    setDragOverColumn(null);
    if (readOnly) return;

    const droppedId = event.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);
    if (!droppedId) return;

    const task = tasks.find((item) => item.id === droppedId);
    if (!task) return;

    const currentCol = taskStateToKanbanColumn(task.state);
    if (currentCol === columnId) return;

    void onMoveTaskState(task.id, kanbanColumnToTaskState(columnId));
  };

  return (
    <section
      aria-label="任务生命周期拖拽看板"
      data-testid="agent-task-kanban"
      className="w-full space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
          <div className="relative w-full sm:max-w-[340px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--ink-subtle)]"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="按任务 ID、提示词、Agent、节点或分支过滤..."
              aria-label="搜索看板任务"
              data-testid="kanban-search-input"
              className={cn(inputBaseClass, 'h-8 w-full pl-8 pr-7')}
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                aria-label="清空搜索"
                className={cn(
                  'absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
                  FOCUS_RING,
                )}
              >
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
            <span>
              显示 {filteredTasks.length} / {tasks.length} 项任务
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {readOnly ? '只读模式（仅浏览）' : '拖拽卡片跨列变更状态'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasQuery && (
            <Button variant="ghost" size="sm" onClick={() => onSearchQueryChange('')}>
              重置过滤
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            data-testid="kanban-new-task-btn"
            onClick={onCreateNewTask}
          >
            <Plus className="size-3.5" strokeWidth={1.75} />
            新建任务
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/60 px-6 py-14 text-center space-y-3">
          <p className="text-[14.5px] font-semibold tracking-tight text-[var(--ink)] text-balance">
            暂无 Agent 执行任务
          </p>
          <p className="text-[13px] text-[var(--ink-muted)] text-pretty max-w-md mx-auto">
            在对话流中输入自然语言、/plan 或 /worktree 下发首个任务，任务将自动同步到此 4 列生命周期看板。
          </p>
          <div className="pt-1">
            <Button variant="primary" size="sm" onClick={onCreateNewTask}>
              <Plus className="size-3.5" strokeWidth={1.75} />
              新建任务
            </Button>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/60 px-6 py-12 text-center space-y-3">
          <p className="text-[14px] font-semibold tracking-tight text-[var(--ink)]">
            没有匹配「{searchQuery.trim()}」的任务
          </p>
          <p className="text-[12.5px] text-[var(--ink-muted)]">
            可尝试搜索任务 ID、模型名、Worktree 分支或目标节点 ID。
          </p>
          <div className="pt-1">
            <Button variant="secondary" size="sm" onClick={() => onSearchQueryChange('')}>
              清空过滤条件
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          {KANBAN_LIFECYCLE_COLUMNS.map((column) => {
            const items = grouped[column.id];
            const accent = columnAccentClasses(column.accentTone);
            const isDropTarget = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                data-testid={`kanban-column-${column.id}`}
                onDragOver={(event) => handleColumnDragOver(event, column.id)}
                onDragEnter={(event) => handleColumnDragOver(event, column.id)}
                onDragLeave={(event) => handleColumnDragLeave(event, column.id)}
                onDrop={(event) => handleColumnDrop(event, column.id)}
                className={cn(
                  'rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/55 overflow-hidden flex flex-col min-h-[340px]',
                  'transition-[background-color,border-color,box-shadow] duration-150 ease-out',
                  isDropTarget && 'ring-1 ring-[var(--accent)] bg-[var(--accent)]/5 border-[var(--accent)]/50',
                )}
              >
                <div className={cn('h-[2px] w-full', accent.topBar)} aria-hidden="true" />

                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn('h-2 w-2 rounded-full shrink-0', accent.dot)}
                      aria-hidden="true"
                    />
                    <span className="text-[13px] font-semibold tracking-tight text-[var(--ink)]">
                      {column.label}
                    </span>
                    <span className="text-[11.5px] text-[var(--ink-subtle)] truncate">
                      {column.subtitle}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'font-mono text-[12px] font-medium tabular-nums shrink-0',
                      accent.countText,
                    )}
                  >
                    {items.length}
                  </span>
                </div>

                <div className="p-2.5 space-y-2.5 flex-1">
                  {items.length === 0 ? (
                    <div
                      className={cn(
                        'rounded-xl border border-dashed px-3 py-8 text-center text-[12px] text-[var(--ink-subtle)]',
                        isDropTarget
                          ? 'border-[var(--accent)]/60 text-[var(--accent)]'
                          : 'border-[var(--border)]',
                      )}
                    >
                      {isDropTarget
                        ? `松开即可移动至 ${column.label}`
                        : readOnly
                          ? '暂无任务'
                          : '拖拽任务卡片至此'}
                    </div>
                  ) : (
                    items.map((task) => {
                      const isSelected = task.id === activeTaskId;
                      const isDragging = draggingTaskId === task.id;
                      const isMoving = movingTaskId === task.id;
                      const currentColId = taskStateToKanbanColumn(task.state);
                      const nodeDisplay =
                        nodeNameById.get(task.workerNodeId) || task.workerNodeId || 'hub';

                      return (
                        <article
                          key={task.id}
                          draggable={!readOnly}
                          data-testid={`kanban-card-${task.id}`}
                          onDragStart={(event) => {
                            if (readOnly) {
                              event.preventDefault();
                              return;
                            }
                            event.dataTransfer.setData('text/plain', task.id);
                            event.dataTransfer.effectAllowed = 'move';
                            setDraggingTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggingTaskId(null);
                            setDragOverColumn(null);
                          }}
                          className={cn(
                            'group rounded-xl border bg-[var(--surface-elevated)] p-3 space-y-2',
                            'transition-[border-color,opacity,transform] duration-150 ease-out',
                            !readOnly && 'cursor-grab active:cursor-grabbing',
                            isSelected
                              ? 'border-[var(--accent)]/70 ring-1 ring-[var(--accent)]/25'
                              : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                            (isDragging || isMoving) && 'opacity-55',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--ink-subtle)] tabular-nums">
                            <div className="flex items-center gap-1 min-w-0">
                              {!readOnly && (
                                <GripVertical
                                  className="size-3 text-[var(--ink-subtle)]/70 shrink-0"
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                />
                              )}
                              <span className="truncate text-[var(--ink-muted)]">{task.id}</span>
                              {task.slashCommand && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[var(--accent)] shrink-0">
                                    {task.slashCommand}
                                  </span>
                                </>
                              )}
                            </div>
                            <span
                              title={formatDateTime(task.updatedAt || task.createdAt)}
                              className="shrink-0"
                            >
                              {formatShortRelative(task.updatedAt || task.createdAt)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenTask(task.id)}
                            className={cn(
                              'block w-full text-left text-[13px] font-medium leading-snug text-[var(--ink)] hover:text-[var(--accent)] line-clamp-2 break-words transition-colors cursor-pointer rounded-md',
                              FOCUS_RING,
                            )}
                          >
                            {task.prompt}
                          </button>

                          <div className="space-y-1 font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[var(--ink-muted)] truncate">
                                {shortAgentName(task.workerAgentName || task.leadAgentName)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 truncate">
                                <Server className="size-2.5 shrink-0" strokeWidth={1.75} />
                                {task.workerNodeId || nodeDisplay}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              {task.appliedModel && (
                                <span className="truncate max-w-[140px]">{task.appliedModel}</span>
                              )}
                              {task.appliedEffort && (
                                <>
                                  {task.appliedModel && <span aria-hidden="true">/</span>}
                                  <span>{task.appliedEffort}</span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span>{formatDurationMs(task.durationMs)}</span>
                              {task.state === 'canceled' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[var(--err)]">已取消</span>
                                </>
                              )}
                            </div>

                            {task.worktreeBranch && (
                              <div className="flex items-center gap-1 text-[var(--ink-subtle)] truncate">
                                <GitBranch className="size-3 shrink-0" strokeWidth={1.75} />
                                <span className="truncate">{task.worktreeBranch}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenTask(task.id)}
                              className={cn(
                                'inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer rounded-md',
                                FOCUS_RING,
                              )}
                            >
                              查看对话
                              <ArrowUpRight className="size-3" strokeWidth={1.75} />
                            </button>

                            <select
                              aria-label={`修改任务 ${task.id} 的生命周期状态`}
                              data-testid={`kanban-quick-move-${task.id}`}
                              disabled={readOnly || isMoving}
                              value={currentColId}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => {
                                const nextCol = event.target.value as KanbanLifecycleColumnId;
                                if (nextCol !== currentColId) {
                                  void onMoveTaskState(task.id, kanbanColumnToTaskState(nextCol));
                                }
                              }}
                              className={cn(
                                'h-6 rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 font-mono text-[11px] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink)] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-colors',
                                FOCUS_RING,
                              )}
                            >
                              {KANBAN_LIFECYCLE_COLUMNS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AgentTaskKanban;
