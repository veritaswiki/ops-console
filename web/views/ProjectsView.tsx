import React from 'react';
import {
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  Crown,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  createLinearIssue,
  deleteLinearIssue,
  dispatchLinearCommander,
  fetchA2AState,
  fetchLinearState,
  syncLinearGithub,
  updateLinearIssue,
} from '../api';
import type {
  A2AStateResponse,
  LinearIssueItem,
  LinearIssuePriority,
  LinearIssueStatus,
  LinearStateResponse,
} from '../types';
import {
  filterLinearIssues,
  getIssueStatusMeta,
  getPriorityMeta,
} from '../lib/linear-projects';
import {
  groupIssuesForSimpleBoard,
  shortAgentName,
  SIMPLE_BOARD_COLUMNS,
  type SimpleBoardColumnId,
} from '../lib/agent-console';
import { cn, FOCUS_RING } from '../lib/cn';
import {
  Button,
  EmptyState,
  ErrorState,
  inputBaseClass,
  StatusIndicator,
  ViewSkeleton,
} from '../components/ui';

type DisplayMode = 'board' | 'list';

function safeGithubHref(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(\/.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function ColumnStatusIcon({ colId }: { colId: SimpleBoardColumnId }) {
  if (colId === 'done') return <CheckCircle2 className="size-3.5 text-[var(--ok)] shrink-0" strokeWidth={2} />;
  if (colId === 'in_progress') return <CircleDot className="size-3.5 text-[var(--warn)] shrink-0" strokeWidth={2} />;
  if (colId === 'in_review') return <CircleDashed className="size-3.5 text-[var(--accent)] shrink-0" strokeWidth={2} />;
  return <Circle className="size-3.5 text-[var(--ink-subtle)] shrink-0" strokeWidth={2} />;
}

function priorityDotClass(priority: LinearIssuePriority | string): string {
  const tone = getPriorityMeta(priority).tone;
  if (tone === 'failed') return 'bg-[var(--err-dot)]';
  if (tone === 'degraded') return 'bg-[var(--warn-dot)]';
  if (tone === 'healthy') return 'bg-[var(--ok-dot)]';
  return 'bg-[var(--muted-dot)]';
}

export function ProjectsView({
  readOnly = false,
  onToast,
}: {
  readOnly?: boolean;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [mode, setMode] = React.useState<DisplayMode>('board');
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [a2aState, setA2aState] = React.useState<A2AStateResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [assigneeFilter, setAssigneeFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [dispatchingId, setDispatchingId] = React.useState<string | null>(null);
  const [syncingGithub, setSyncingGithub] = React.useState(false);

  const [form, setForm] = React.useState({
    title: '',
    description: '',
    priority: 'high' as LinearIssuePriority,
    status: 'todo' as LinearIssueStatus,
    assigneeId: '',
  });

  const loadData = React.useCallback(async () => {
    setError(null);
    try {
      const [lin, a2a] = await Promise.all([fetchLinearState(), fetchA2AState()]);
      setLinearState(lin);
      setA2aState(a2a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载任务看板失败');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const issues = linearState?.issues || [];
  const projects = linearState?.projects || [];
  const agents =
    a2aState?.agents ||
    linearState?.availableAgents.map((a) => ({
      ...a,
      status: 'healthy' as const,
      modelHint: a.modelHint || 'auto',
    })) ||
    [];

  const filteredIssues = React.useMemo(() => {
    const base = filterLinearIssues(issues, { query: searchQuery });
    if (assigneeFilter === 'all') return base;
    return base.filter((i) => i.assigneeId === assigneeFilter);
  }, [issues, searchQuery, assigneeFilter]);

  const groupedBoard = React.useMemo(
    () => groupIssuesForSimpleBoard(filteredIssues),
    [filteredIssues],
  );

  const selectedIssue = React.useMemo<LinearIssueItem | null>(
    () => (selectedIssueId ? issues.find((i) => i.id === selectedIssueId) || null : null),
    [issues, selectedIssueId],
  );

  const openCreateWithStatus = (status: LinearIssueStatus = 'todo') => {
    setForm((prev) => ({ ...prev, status }));
    setShowCreate(true);
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !form.title.trim()) return;
    setCreating(true);
    try {
      const chosenAgent = agents.find((a) => a.id === form.assigneeId);
      const created = await createLinearIssue({
        title: form.title.trim(),
        description: form.description.trim(),
        projectId: projects[0]?.id,
        priority: form.priority,
        status: form.status,
        assigneeType: chosenAgent ? 'agent' : undefined,
        assigneeId: chosenAgent?.id,
        assigneeName: chosenAgent?.name,
      });
      onToast?.(`已创建 ${created.issue.identifier}`, 'ok');
      setForm({ title: '', description: '', priority: 'high', status: 'todo', assigneeId: '' });
      setShowCreate(false);
      await loadData();
      setSelectedIssueId(created.issue.id);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '创建任务失败', 'err');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateIssue = async (
    issueId: string,
    patch: Partial<{
      status: LinearIssueStatus;
      priority: LinearIssuePriority;
      assigneeId: string;
      assigneeName: string;
      assigneeType: string;
    }>,
  ) => {
    if (readOnly) return;
    try {
      const res = await updateLinearIssue(issueId, patch);
      onToast?.(`已更新 ${res.issue.identifier}`, 'ok');
      await loadData();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '更新任务失败', 'err');
    }
  };

  const handleDispatch = async (issueId: string) => {
    if (readOnly) return;
    setDispatchingId(issueId);
    try {
      const res = await dispatchLinearCommander(issueId);
      onToast?.(
        `总指挥 ${shortAgentName(res.commander.name)} 已拆解 ${res.createdSubIssues?.length || 0} 个子任务`,
        'ok',
      );
      await loadData();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '派发失败', 'err');
    } finally {
      setDispatchingId(null);
    }
  };

  const handleDelete = async (issue: LinearIssueItem) => {
    if (readOnly) return;
    try {
      await deleteLinearIssue(issue.id);
      if (selectedIssueId === issue.id) setSelectedIssueId(null);
      onToast?.(`已删除 ${issue.identifier}`, 'info');
      await loadData();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '删除失败', 'err');
    }
  };

  const handleSyncGithub = async () => {
    if (readOnly) return;
    setSyncingGithub(true);
    try {
      const res = await syncLinearGithub('pull');
      onToast?.(res.summary || `已同步 GitHub (${res.importedCount} 新增 / ${res.updatedCount} 更新)`, 'ok');
      await loadData();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '同步 GitHub 失败', 'err');
    } finally {
      setSyncingGithub(false);
    }
  };

  if (loading && !linearState) {
    return <ViewSkeleton />;
  }

  if (error && !linearState) {
    return <ErrorState title="任务看板加载失败" message={error} onRetry={() => void loadData()} />;
  }

  return (
    <div className="space-y-5" data-testid="view-task-board">
      {/* Crisp Linear-style Single-Row Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--ink)] whitespace-nowrap">
            任务看板
          </h1>
          <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
            {filteredIssues.length}
          </span>

          {/* Linear Board / List toggle */}
          <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              onClick={() => setMode('board')}
              className={cn(
                'h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap',
                mode === 'board'
                  ? 'bg-[var(--surface-active)] text-[var(--ink)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
              )}
            >
              <LayoutGrid className="size-3.5" />
              看板
            </button>
            <button
              type="button"
              onClick={() => setMode('list')}
              className={cn(
                'h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap',
                mode === 'list'
                  ? 'bg-[var(--surface-active)] text-[var(--ink)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
              )}
            >
              <List className="size-3.5" />
              列表
            </button>
          </div>

          {/* Inline Assignee Filter */}
          <select
            aria-label="按执行者筛选"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className={cn('ui-select h-8 pl-2.5 pr-7 text-[12px] cursor-pointer', inputBaseClass)}
          >
            <option value="all">全部 Agent</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {shortAgentName(a.name)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-40 sm:w-52">
            <Search className="size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="筛选任务..."
              aria-label="筛选任务"
              className={cn('w-full h-8 pl-8 pr-2.5 text-[12.5px]', inputBaseClass)}
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled={readOnly || syncingGithub}
            data-testid="sync-github-issues-btn"
            onClick={() => void handleSyncGithub()}
          >
            <GitPullRequest className={cn('size-3.5', syncingGithub && 'animate-pulse')} />
            {syncingGithub ? '同步中...' : '同步 GitHub'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={readOnly}
            data-testid="toggle-create-issue-btn"
            onClick={() => openCreateWithStatus('todo')}
          >
            <Plus className="size-3.5" />
            新建
          </Button>
        </div>
      </div>

      {/* Slim Inline Linear Quick-Create Bar */}
      {showCreate && (
        <form
          onSubmit={handleCreateIssue}
          data-testid="create-linear-issue-form"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
        >
          <input
            type="text"
            required
            autoFocus
            disabled={readOnly || creating}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="任务标题..."
            data-testid="linear-issue-title-input"
            className="w-full bg-transparent text-[14.5px] font-medium text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
          />
          <input
            type="text"
            disabled={readOnly || creating}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="添加描述（可选）..."
            className="w-full bg-transparent text-[13px] text-[var(--ink-muted)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
          />
          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="初始状态"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as LinearIssueStatus }))}
                className={cn('ui-select h-7 pl-2 pr-6 text-[12px] cursor-pointer', inputBaseClass)}
              >
                {SIMPLE_BOARD_COLUMNS.map((c) => (
                  <option key={c.id} value={c.targetStatus}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="优先级"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as LinearIssuePriority }))}
                className={cn('ui-select h-7 pl-2 pr-6 text-[12px] cursor-pointer', inputBaseClass)}
              >
                <option value="urgent">P0 紧急</option>
                <option value="high">P1 高</option>
                <option value="medium">P2 中</option>
                <option value="low">P3 低</option>
              </select>

              <select
                aria-label="指派 Agent"
                value={form.assigneeId}
                onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className={cn('ui-select h-7 pl-2 pr-6 text-[12px] cursor-pointer', inputBaseClass)}
              >
                <option value="">自动指派</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {shortAgentName(a.name)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={readOnly || creating || !form.title.trim()}
                data-testid="linear-issue-submit-btn"
              >
                {creating ? '创建中...' : '创建任务'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Main Linear Board or Grouped List */}
      {filteredIssues.length === 0 ? (
        <EmptyState
          title="暂无任务"
          message={
            (linearState?.issues?.length || 0) === 0
              ? '当前为实时数据源，尚未同步或创建任务。点击「同步 GitHub」可直接拉取本仓库真实 PR / Issue，或点击「新建」手动添加。'
              : '当前筛选条件下无匹配任务，可清空搜索词或切换执行者筛选。'
          }
        />
      ) : mode === 'board' ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start"
          data-testid="linear-kanban-board"
        >
          {SIMPLE_BOARD_COLUMNS.map((col) => {
            const colItems = groupedBoard[col.id] || [];
            return (
              <section key={col.id} data-testid={`kanban-col-${col.id}`} className="min-w-0 space-y-2.5">
                {/* Whisper-quiet Linear Column Header */}
                <div className="px-1 py-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ColumnStatusIcon colId={col.id} />
                    <span className="text-[13px] font-medium text-[var(--ink)] truncate">{col.label}</span>
                    <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                      {colItems.length}
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`在${col.label}中新建任务`}
                      onClick={() => openCreateWithStatus(col.targetStatus)}
                      className={cn(
                        'h-6 w-6 rounded-md inline-flex items-center justify-center text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors',
                        FOCUS_RING,
                      )}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Clean Linear Cards */}
                <div className="space-y-2">
                  {colItems.map((issue) => {
                    const isSelected = selectedIssueId === issue.id;
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        data-testid={`issue-card-${issue.id}`}
                        onClick={() => setSelectedIssueId(issue.id)}
                        className={cn(
                          'w-full text-left rounded-xl border p-3.5 space-y-2 cursor-pointer transition-[border-color,background-color] duration-150',
                          FOCUS_RING,
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50'
                            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                            {issue.identifier}
                          </span>
                          <span
                            className={cn('h-1.5 w-1.5 rounded-full shrink-0', priorityDotClass(issue.priority))}
                            title={getPriorityMeta(issue.priority).label}
                          />
                        </div>

                        <div className="text-[13px] font-medium text-[var(--ink)] leading-snug line-clamp-2">
                          {issue.title}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11.5px] text-[var(--ink-subtle)] pt-0.5">
                          <span className="truncate">{shortAgentName(issue.assigneeName)}</span>
                          {issue.github?.prNumber && (
                            <span className="inline-flex items-center gap-0.5 font-mono text-[var(--accent)] shrink-0 tabular-nums">
                              <GitPullRequest className="size-3" />#{issue.github.prNumber}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* Signature Linear Grouped List */
        <div className="space-y-5" data-testid="linear-list-view">
          {SIMPLE_BOARD_COLUMNS.map((col) => {
            const colItems = groupedBoard[col.id] || [];
            if (colItems.length === 0) return null;
            return (
              <section key={col.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--surface-subtle)]/60 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ColumnStatusIcon colId={col.id} />
                    <span className="text-[12.5px] font-medium text-[var(--ink)]">{col.label}</span>
                    <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                      {colItems.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {colItems.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => setSelectedIssueId(issue.id)}
                      className={cn(
                        'w-full px-4 h-11 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors hover:bg-[var(--surface-hover)]',
                        selectedIssueId === issue.id && 'bg-[var(--accent-soft)]/40',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={cn('h-1.5 w-1.5 rounded-full shrink-0', priorityDotClass(issue.priority))}
                          title={getPriorityMeta(issue.priority).label}
                        />
                        <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap shrink-0 w-[68px]">
                          {issue.identifier}
                        </span>
                        <span className="text-[13px] font-medium text-[var(--ink)] truncate">
                          {issue.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[12px] text-[var(--ink-subtle)] shrink-0">
                        {issue.github?.prNumber && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[var(--accent)] tabular-nums">
                            <GitPullRequest className="size-3" />#{issue.github.prNumber}
                          </span>
                        )}
                        <span className="max-w-[120px] truncate">{shortAgentName(issue.assigneeName)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Linear Right-Side Issue Inspector Slide-Over */}
      {selectedIssue && (
        <aside
          aria-label="任务详情检查器"
          data-testid="linear-issue-drawer"
          className="fixed inset-y-0 right-0 z-40 w-full max-w-[400px] border-l border-[var(--border)] bg-[var(--surface-elevated)] shadow-2xl flex flex-col"
        >
          <div className="h-14 px-5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
            <span className="font-mono text-[13px] font-semibold text-[var(--ink-muted)] tabular-nums">
              {selectedIssue.identifier}
            </span>
            <div className="flex items-center gap-1">
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`删除 ${selectedIssue.identifier}`}
                  onClick={() => void handleDelete(selectedIssue)}
                  className={cn(
                    'h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-subtle)] hover:text-[var(--err)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors',
                    FOCUS_RING,
                  )}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              <button
                type="button"
                aria-label="关闭详情"
                onClick={() => setSelectedIssueId(null)}
                className={cn(
                  'h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors',
                  FOCUS_RING,
                )}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="space-y-2">
              <h2 className="text-[16px] font-semibold text-[var(--ink)] leading-snug">
                {selectedIssue.title}
              </h2>
              {selectedIssue.description && (
                <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
                  {selectedIssue.description}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)] text-[12.5px]">
              <label className="grid grid-cols-3 items-center gap-2">
                <span className="text-[var(--ink-subtle)]">状态</span>
                <select
                  disabled={readOnly}
                  value={selectedIssue.status}
                  onChange={(e) =>
                    void handleUpdateIssue(selectedIssue.id, {
                      status: e.target.value as LinearIssueStatus,
                    })
                  }
                  className={cn('col-span-2 ui-select h-8 pl-2.5 pr-7 text-[12.5px] cursor-pointer', inputBaseClass)}
                >
                  <option value="triage">待分诊</option>
                  <option value="todo">待执行</option>
                  <option value="in_progress">执行中</option>
                  <option value="in_review">待评审</option>
                  <option value="done">已完成</option>
                </select>
              </label>

              <label className="grid grid-cols-3 items-center gap-2">
                <span className="text-[var(--ink-subtle)]">优先级</span>
                <select
                  disabled={readOnly}
                  value={selectedIssue.priority}
                  onChange={(e) =>
                    void handleUpdateIssue(selectedIssue.id, {
                      priority: e.target.value as LinearIssuePriority,
                    })
                  }
                  className={cn('col-span-2 ui-select h-8 pl-2.5 pr-7 text-[12.5px] cursor-pointer', inputBaseClass)}
                >
                  <option value="urgent">P0 紧急</option>
                  <option value="high">P1 高</option>
                  <option value="medium">P2 中</option>
                  <option value="low">P3 低</option>
                </select>
              </label>

              <label className="grid grid-cols-3 items-center gap-2">
                <span className="text-[var(--ink-subtle)]">指派 Agent</span>
                <select
                  disabled={readOnly}
                  value={selectedIssue.assigneeId || ''}
                  onChange={(e) => {
                    const next = agents.find((a) => a.id === e.target.value);
                    if (!next) return;
                    void handleUpdateIssue(selectedIssue.id, {
                      assigneeType: 'agent',
                      assigneeId: next.id,
                      assigneeName: next.name,
                    });
                  }}
                  className={cn('col-span-2 ui-select h-8 pl-2.5 pr-7 text-[12.5px] cursor-pointer', inputBaseClass)}
                >
                  {!agents.some((a) => a.id === selectedIssue.assigneeId) && (
                    <option value={selectedIssue.assigneeId}>{selectedIssue.assigneeName}</option>
                  )}
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {shortAgentName(a.name)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 items-center gap-2 pt-1">
                <span className="text-[var(--ink-subtle)]">当前状态</span>
                <div className="col-span-2">
                  <StatusIndicator
                    status={getIssueStatusMeta(selectedIssue.status).tone}
                    label={getIssueStatusMeta(selectedIssue.status).label}
                  />
                </div>
              </div>

              {selectedIssue.worktreeBranch && (
                <div className="grid grid-cols-3 items-center gap-2">
                  <span className="text-[var(--ink-subtle)]">分支</span>
                  <span className="col-span-2 inline-flex items-center gap-1 font-mono text-[12px] text-[var(--ink-muted)] truncate">
                    <GitBranch className="size-3 shrink-0" />
                    <span className="truncate">{selectedIssue.worktreeBranch}</span>
                  </span>
                </div>
              )}

              {selectedIssue.github?.prNumber && safeGithubHref(selectedIssue.github.url) && (
                <div className="grid grid-cols-3 items-center gap-2">
                  <span className="text-[var(--ink-subtle)]">GitHub PR</span>
                  <a
                    href={safeGithubHref(selectedIssue.github.url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-2 inline-flex items-center gap-1 font-mono text-[12px] text-[var(--accent)] hover:underline"
                  >
                    PR #{selectedIssue.github.prNumber}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>

            {!selectedIssue.parentId && (
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  disabled={readOnly || dispatchingId === selectedIssue.id}
                  onClick={() => void handleDispatch(selectedIssue.id)}
                >
                  <Crown className="size-4" />
                  {dispatchingId === selectedIssue.id ? '总指挥拆解派发中...' : '交由总指挥拆解并派发'}
                </Button>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

export default ProjectsView;
