import React from 'react';
import {
  ArrowUpRight,
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
} from 'lucide-react';
import {
  createLinearIssue,
  deleteLinearIssue,
  dispatchLinearCommander,
  fetchA2AState,
  fetchGithubOverview,
  fetchLinearState,
  syncLinearGithub,
  updateLinearIssue,
} from '../api';
import type {
  A2AStateResponse,
  A2ATaskRecord,
  GithubOverviewResponse,
  GithubPullRequestSummary,
  LinearIssueItem,
  LinearIssuePriority,
  LinearIssueStatus,
  LinearStateResponse,
  ToastHandler,
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
import {
  buildTaskIssueLinkIndex,
  type TaskIssueLinkIndex,
} from '../lib/workspace-controls';
import { cn, FOCUS_RING } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import {
  AnimatedCollapse,
  Button,
  ClearInputButton,
  EmptyState,
  ErrorState,
  inputBaseClass,
  InspectorDrawer,
  LiveNumber,
  SegmentedControl,
  StatusIndicator,
  ViewSkeleton,
  type ConfirmModalState,
} from '../components/ui';

type DisplayMode = 'board' | 'list';
type A2ATone = 'ok' | 'warn' | 'err' | 'muted' | 'accent';

export interface ProjectsViewProps {
  readOnly?: boolean;
  a2aRevision?: number;
  focusedIssueId?: string | null;
  onClearFocusedIssue?: () => void;
  onOpenAgentTask?: (taskId: string) => void;
  onToast?: ToastHandler;
  onConfirm?: (modal: ConfirmModalState) => void;
}

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

function a2aStateMeta(state?: string | null): { label: string; tone: A2ATone } {
  const normalized = String(state || '').toLowerCase();
  if (normalized === 'completed' || normalized === 'done') return { label: 'completed', tone: 'ok' };
  if (normalized === 'failed') return { label: 'failed', tone: 'err' };
  if (normalized === 'working' || normalized === 'running') return { label: 'working', tone: 'accent' };
  if (normalized === 'canceled' || normalized === 'cancelled') return { label: 'canceled', tone: 'muted' };
  if (normalized === 'submitted' || normalized === 'queued') return { label: 'queued', tone: 'warn' };
  return { label: normalized || 'queued', tone: 'muted' };
}

function a2aDotClass(tone: A2ATone): string {
  if (tone === 'ok') return 'bg-[var(--ok-dot)]';
  if (tone === 'err') return 'bg-[var(--err-dot)]';
  if (tone === 'warn') return 'bg-[var(--warn-dot)]';
  if (tone === 'accent') return 'bg-[var(--accent)]';
  return 'bg-[var(--muted-dot)]';
}

function prStateHint(pr?: GithubPullRequestSummary | null): string {
  if (!pr) return '';
  const parts: string[] = [pr.state];
  if (pr.isDraft) parts.push('draft');
  if (pr.reviewDecision) parts.push(pr.reviewDecision.replace(/_/g, ' '));
  if (pr.checksStatus && pr.checksStatus !== 'UNKNOWN') {
    parts.push(`checks ${String(pr.checksStatus).toLowerCase()}`);
  }
  return parts.join(' · ');
}

function lookupPrByBranch(
  prByBranch: TaskIssueLinkIndex['prByBranch'],
  branch?: string | null,
): GithubPullRequestSummary | undefined {
  const trimmed = (branch || '').trim();
  if (!trimmed) return undefined;
  return prByBranch.get(trimmed) || prByBranch.get(trimmed.replace(/^refs\/heads\//i, ''));
}

function attentionSummary(task: A2ATaskRecord): string {
  const queued = (task.queuedTurns || []).filter((turn) => turn.status === 'queued').length;
  const parts = [`排队 ${queued}`];
  if (task.attention?.needsAttention) {
    const reasons = (task.attention.reasons || []).join(' · ');
    parts.push(reasons ? `待关注 ${reasons}` : '待关注');
  } else if (task.attention?.unread) {
    parts.push('有未读更新');
  } else {
    parts.push('无需关注');
  }
  return parts.join(' · ');
}

function A2AStatusLine({
  task,
  harness,
  branch,
}: {
  task: A2ATaskRecord;
  harness?: string;
  branch?: string | null;
}) {
  const meta = a2aStateMeta(task.state);
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[var(--ink-subtle)] min-w-0">
      <span
        className={cn('h-1.5 w-1.5 rounded-full shrink-0', a2aDotClass(meta.tone))}
        aria-hidden="true"
      />
      <span className="text-[var(--ink-muted)]">{meta.label}</span>
      <span aria-hidden="true">·</span>
      <span className="font-mono tabular-nums">{task.id.slice(0, 10)}</span>
      {task.workerNodeId && (
        <>
          <span aria-hidden="true">·</span>
          <span className="truncate max-w-[110px]">{task.workerNodeId}</span>
        </>
      )}
      {harness && (
        <>
          <span aria-hidden="true">·</span>
          <span className="truncate max-w-[90px]">{harness}</span>
        </>
      )}
      {branch && (
        <>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <GitBranch className="size-3 shrink-0" />
            <span className="truncate max-w-[140px] font-mono">{branch}</span>
          </span>
        </>
      )}
    </div>
  );
}

function PrMetaLine({
  prNumber,
  pr,
  className,
}: {
  prNumber?: number | null;
  pr?: GithubPullRequestSummary | null;
  className?: string;
}) {
  const number = pr?.number ?? prNumber;
  if (!number) return null;
  const hint = prStateHint(pr);
  return (
    <div className={cn('flex items-center gap-1.5 text-[11px] min-w-0', className)}>
      <GitPullRequest className="size-3 shrink-0 text-[var(--accent)]" />
      <span className="font-mono text-[var(--accent)] tabular-nums shrink-0">#{number}</span>
      {hint && <span className="text-[var(--ink-subtle)] truncate">· {hint}</span>}
    </div>
  );
}

export function ProjectsView({
  readOnly = false,
  a2aRevision = 0,
  focusedIssueId = null,
  onClearFocusedIssue,
  onOpenAgentTask,
  onToast,
  onConfirm,
}: ProjectsViewProps) {
  const [mode, setMode] = React.useState<DisplayMode>('board');
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [a2aState, setA2aState] = React.useState<A2AStateResponse | null>(null);
  const [githubOverview, setGithubOverview] = React.useState<GithubOverviewResponse | null>(null);
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

  const hasLinearRef = React.useRef(false);

  const loadData = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setError(null);
    const [linearResult, a2aResult, githubResult] = await Promise.allSettled([
      fetchLinearState(),
      fetchA2AState(),
      fetchGithubOverview(),
    ]);

    if (linearResult.status === 'fulfilled') {
      hasLinearRef.current = true;
      setLinearState(linearResult.value);
    } else if (!hasLinearRef.current) {
      setError(
        linearResult.reason instanceof Error
          ? linearResult.reason.message
          : '加载任务看板失败',
      );
    }

    if (a2aResult.status === 'fulfilled') {
      setA2aState(a2aResult.value);
    }

    if (githubResult.status === 'fulfilled') {
      setGithubOverview(githubResult.value);
    }

    setLoading(false);
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const lastA2aRevisionRef = React.useRef(a2aRevision);
  React.useEffect(() => {
    if (lastA2aRevisionRef.current === a2aRevision) return;
    lastA2aRevisionRef.current = a2aRevision;
    void loadData({ silent: true });
  }, [a2aRevision, loadData]);

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

  const pullRequests = githubOverview?.pullRequests || [];

  const linkIndex = React.useMemo(
    () => buildTaskIssueLinkIndex(issues, a2aState?.tasks || [], pullRequests),
    [issues, a2aState, pullRequests],
  );

  React.useEffect(() => {
    if (!focusedIssueId) return;
    if (!issues.some((issue) => issue.id === focusedIssueId)) return;
    setSelectedIssueId(focusedIssueId);
    onClearFocusedIssue?.();
  }, [focusedIssueId, issues, onClearFocusedIssue]);

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

  const selectedLinkedTask = selectedIssue
    ? linkIndex.taskByIssueId.get(selectedIssue.id)
    : undefined;
  const selectedBranch =
    selectedIssue?.worktreeBranch || selectedLinkedTask?.worktreeBranch || null;
  const selectedLinkedPr = selectedIssue
    ? linkIndex.prByIssueId.get(selectedIssue.id) ||
      lookupPrByBranch(linkIndex.prByBranch, selectedBranch)
    : undefined;
  const selectedHarness = selectedLinkedTask
    ? a2aState?.agents.find((agent) => agent.id === selectedLinkedTask.workerAgentId)?.harness
    : undefined;

  const harnessForTask = (task?: A2ATaskRecord): string | undefined =>
    task ? a2aState?.agents.find((agent) => agent.id === task.workerAgentId)?.harness : undefined;

  const openCreateWithStatus = (status: LinearIssueStatus = 'todo') => {
    setForm((prev) => ({ ...prev, status }));
    setShowCreate(true);
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '创建任务')) return;
    if (!form.title.trim()) return;
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
      onToast?.(extractErrorMessage(err, '创建任务失败'), 'err');
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
    if (guardReadOnly(readOnly, onToast, '更新任务')) return;
    try {
      const res = await updateLinearIssue(issueId, patch);
      onToast?.(`已更新 ${res.issue.identifier}`, 'ok');
      await loadData();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '更新任务失败'), 'err');
    }
  };

  const handleDispatch = async (issueId: string) => {
    if (guardReadOnly(readOnly, onToast, '派发任务给助手')) return;
    setDispatchingId(issueId);
    try {
      const res = await dispatchLinearCommander(issueId);
      const dispatchedTask = res.dispatchedTask;
      if (dispatchedTask) {
        setLinearState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            issues: prev.issues.map((item) =>
              item.id === issueId
                ? {
                    ...item,
                    linkedTaskId: dispatchedTask.id,
                    worktreeBranch: dispatchedTask.worktreeBranch || item.worktreeBranch,
                  }
                : item,
            ),
          };
        });
        setA2aState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: [dispatchedTask, ...prev.tasks.filter((task) => task.id !== dispatchedTask.id)],
          };
        });
      }
      onToast?.(
        `主控助手 ${shortAgentName(res.commander.name)} 已拆解 ${res.createdSubIssues?.length || 0} 个子任务`,
        'ok',
      );
      await loadData({ silent: true });
    } catch (err) {
      onToast?.(extractErrorMessage(err, '派发失败'), 'err');
    } finally {
      setDispatchingId(null);
    }
  };

  const executeDelete = async (issue: LinearIssueItem) => {
    try {
      await deleteLinearIssue(issue.id);
      if (selectedIssueId === issue.id) setSelectedIssueId(null);
      onToast?.(`已删除任务 ${issue.identifier}`, 'info');
      await loadData();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '删除任务失败'), 'err');
    }
  };

  const handleDelete = (issue: LinearIssueItem) => {
    if (guardReadOnly(readOnly, onToast, '删除任务')) return;
    if (onConfirm) {
      onConfirm({
        open: true,
        title: `删除任务 ${issue.identifier}？`,
        description: `将永久移除「${issue.title}」，该操作无法撤销。`,
        confirmLabel: '确认删除',
        danger: true,
        onConfirm: () => executeDelete(issue),
      });
      return;
    }
    void executeDelete(issue);
  };

  const handleSyncGithub = async () => {
    if (guardReadOnly(readOnly, onToast, '同步 GitHub 任务')) return;
    setSyncingGithub(true);
    try {
      const res = await syncLinearGithub('pull');
      onToast?.(res.summary || `已同步 GitHub（新增 ${res.importedCount} / 更新 ${res.updatedCount}）`, 'ok');
      await loadData();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '同步 GitHub 失败'), 'err');
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
            <LiveNumber value={filteredIssues.length} />
          </span>

          {/* Linear Board / List toggle */}
          <SegmentedControl<'board' | 'list'>
            ariaLabel="任务看板视图模式"
            value={mode}
            onChange={setMode}
            options={[
              {
                value: 'board',
                label: '看板',
                icon: <LayoutGrid className="size-3.5" strokeWidth={1.75} />,
              },
              {
                value: 'list',
                label: '列表',
                icon: <List className="size-3.5" strokeWidth={1.75} />,
              },
            ]}
          />

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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="筛选任务..."
              aria-label="筛选任务"
              className={cn('w-full h-8 pl-8 pr-7 text-[12.5px]', inputBaseClass)}
            />
            <ClearInputButton
              visible={Boolean(searchQuery)}
              onClear={() => setSearchQuery('')}
              ariaLabel="清空任务筛选"
              placement="overlay"
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
      <AnimatedCollapse open={showCreate}>
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
      </AnimatedCollapse>

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
                      <LiveNumber value={colItems.length} />
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`在${col.label}中新建任务`}
                      onClick={() => openCreateWithStatus(col.targetStatus)}
                      className={cn(
                        'ui-press-icon h-6 w-6 rounded-md inline-flex items-center justify-center text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer',
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
                    const linkedTask = linkIndex.taskByIssueId.get(issue.id);
                    const linkedPr =
                      linkIndex.prByIssueId.get(issue.id) ||
                      lookupPrByBranch(linkIndex.prByBranch, issue.worktreeBranch);
                    const branch = issue.worktreeBranch || linkedTask?.worktreeBranch || null;
                    return (
                      <div
                        key={issue.id}
                        role="button"
                        tabIndex={0}
                        data-testid={`issue-card-${issue.id}`}
                        aria-label={`${issue.identifier} ${issue.title}`}
                        onClick={() => setSelectedIssueId(issue.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedIssueId(issue.id);
                          }
                        }}
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

                        {linkedTask && (
                          <A2AStatusLine
                            task={linkedTask}
                            harness={harnessForTask(linkedTask)}
                            branch={branch}
                          />
                        )}

                        {!linkedTask && branch && (
                          <div className="flex items-center gap-1 font-mono text-[10.5px] text-[var(--ink-subtle)] min-w-0">
                            <GitBranch className="size-3 shrink-0" />
                            <span className="truncate">{branch}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 text-[11.5px] text-[var(--ink-subtle)] pt-0.5">
                          <span className="truncate">{shortAgentName(issue.assigneeName)}</span>
                          <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                            <PrMetaLine prNumber={issue.github?.prNumber} pr={linkedPr} />
                            {linkedTask && onOpenAgentTask && (
                              <button
                                type="button"
                                aria-label={`在工作台打开任务 ${linkedTask.id}`}
                                title="在工作台打开任务"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenAgentTask(linkedTask.id);
                                }}
                                className={cn(
                                  'group ui-press-icon h-6 w-6 -mr-1 rounded-md inline-flex items-center justify-center text-[var(--ink-subtle)] hover:text-[var(--accent)] hover:bg-[var(--surface-hover)] cursor-pointer',
                                  FOCUS_RING,
                                )}
                              >
                                <ArrowUpRight className="size-3.5 ui-hover-nudge" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
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
                      <LiveNumber value={colItems.length} />
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {colItems.map((issue) => {
                    const linkedTask = linkIndex.taskByIssueId.get(issue.id);
                    const linkedPr =
                      linkIndex.prByIssueId.get(issue.id) ||
                      lookupPrByBranch(linkIndex.prByBranch, issue.worktreeBranch);
                    const branch = issue.worktreeBranch || linkedTask?.worktreeBranch || null;
                    return (
                      <div
                        key={issue.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedIssueId(issue.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedIssueId(issue.id);
                          }
                        }}
                        className={cn(
                          'w-full px-4 py-2 min-h-11 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors hover:bg-[var(--surface-hover)]',
                          FOCUS_RING,
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
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <span className="text-[13px] font-medium text-[var(--ink)] truncate">
                              {issue.title}
                            </span>
                            {linkedTask ? (
                              <A2AStatusLine
                                task={linkedTask}
                                harness={harnessForTask(linkedTask)}
                                branch={branch}
                              />
                            ) : (
                              branch && (
                                <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--ink-subtle)] min-w-0">
                                  <GitBranch className="size-3 shrink-0" />
                                  <span className="truncate">{branch}</span>
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[12px] text-[var(--ink-subtle)] shrink-0">
                          <PrMetaLine
                            prNumber={issue.github?.prNumber}
                            pr={linkedPr}
                            className="hidden sm:flex"
                          />
                          <span className="max-w-[120px] truncate">{shortAgentName(issue.assigneeName)}</span>
                          {linkedTask && onOpenAgentTask && (
                            <button
                              type="button"
                              aria-label={`在工作台打开任务 ${linkedTask.id}`}
                              title="在工作台打开任务"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAgentTask(linkedTask.id);
                              }}
                              className={cn(
                                'h-6 w-6 -mr-1 rounded-md inline-flex items-center justify-center text-[var(--ink-subtle)] hover:text-[var(--accent)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors',
                                FOCUS_RING,
                              )}
                            >
                              <ArrowUpRight className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Linear Right-Side Issue Inspector Slide-Over */}
      <InspectorDrawer
        open={Boolean(selectedIssue)}
        onOpenChange={(open) => {
          if (!open) setSelectedIssueId(null);
        }}
        title={selectedIssue?.title || '任务详情'}
        meta={selectedIssue?.identifier}
        size="md"
        testId="linear-issue-drawer"
        footer={
          selectedIssue ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={readOnly}
              aria-label={`删除 ${selectedIssue.identifier}`}
              onClick={() => void handleDelete(selectedIssue)}
              className="text-[var(--ink-subtle)] hover:text-[var(--err)]"
            >
              <Trash2 className="size-3.5" />
              删除
            </Button>
          ) : undefined
        }
      >
        {selectedIssue && (
          <>
            {selectedIssue.description && (
              <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed text-pretty">
                {selectedIssue.description}
              </p>
            )}

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

              {selectedBranch && (
                <div className="grid grid-cols-3 items-center gap-2">
                  <span className="text-[var(--ink-subtle)]">分支</span>
                  <span className="col-span-2 inline-flex items-center gap-1 font-mono text-[12px] text-[var(--ink-muted)] truncate">
                    <GitBranch className="size-3 shrink-0" />
                    <span className="truncate">{selectedBranch}</span>
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

            {/* A2A execution + worktree linkage */}
            <section className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[12.5px] font-semibold tracking-tight text-[var(--ink)]">
                  A2A 执行与 Worktree
                </h3>
                {selectedLinkedTask && (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--ink-subtle)]">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        a2aDotClass(a2aStateMeta(selectedLinkedTask.state).tone),
                      )}
                      aria-hidden="true"
                    />
                    {a2aStateMeta(selectedLinkedTask.state).label}
                  </span>
                )}
              </div>

              {selectedLinkedTask ? (
                <>
                  <dl className="space-y-2 text-[12px]">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <dt className="text-[var(--ink-subtle)]">任务</dt>
                      <dd className="col-span-2 font-mono text-[11.5px] text-[var(--ink-muted)] truncate tabular-nums">
                        {selectedLinkedTask.id}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <dt className="text-[var(--ink-subtle)]">执行节点</dt>
                      <dd className="col-span-2 font-mono text-[11.5px] text-[var(--ink-muted)] truncate">
                        {selectedLinkedTask.workerNodeId || '未分配'}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <dt className="text-[var(--ink-subtle)]">Agent</dt>
                      <dd className="col-span-2 text-[var(--ink-muted)] truncate">
                        {selectedLinkedTask.workerAgentName}
                        {selectedHarness ? ` · ${selectedHarness}` : ''}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <dt className="text-[var(--ink-subtle)]">模型</dt>
                      <dd className="col-span-2 font-mono text-[11.5px] text-[var(--ink-muted)] truncate">
                        {selectedLinkedTask.appliedModel || selectedLinkedTask.selectedModel || '自动'}
                        {selectedLinkedTask.appliedEffort ? ` · ${selectedLinkedTask.appliedEffort}` : ''}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <dt className="text-[var(--ink-subtle)]">Worktree</dt>
                      <dd className="col-span-2 font-mono text-[11.5px] text-[var(--ink-muted)] truncate">
                        {selectedLinkedTask.worktreeBranch || '未创建'}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <dt className="text-[var(--ink-subtle)]">DSH 评审</dt>
                      <dd className="col-span-2 text-[var(--ink-muted)] truncate">
                        {selectedLinkedTask.dshReview
                          ? `${selectedLinkedTask.dshReview.verdict} · 评分 ${selectedLinkedTask.dshReview.score}`
                          : '未触发'}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <dt className="text-[var(--ink-subtle)]">排队 / 关注</dt>
                      <dd className="col-span-2 text-[var(--ink-muted)] truncate">
                        {attentionSummary(selectedLinkedTask)}
                      </dd>
                    </div>
                    {selectedLinkedPr && (
                      <div className="grid grid-cols-3 items-start gap-2">
                        <dt className="text-[var(--ink-subtle)]">GitHub PR</dt>
                        <dd className="col-span-2 min-w-0 space-y-0.5">
                          {safeGithubHref(selectedLinkedPr.url) ? (
                            <a
                              href={safeGithubHref(selectedLinkedPr.url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11.5px] text-[var(--accent)] hover:underline truncate max-w-full"
                            >
                              #{selectedLinkedPr.number} {selectedLinkedPr.title}
                              <ExternalLink className="size-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="font-mono text-[11.5px] text-[var(--ink-muted)] truncate">
                              #{selectedLinkedPr.number} {selectedLinkedPr.title}
                            </span>
                          )}
                          <div className="text-[11px] text-[var(--ink-subtle)]">
                            {prStateHint(selectedLinkedPr) || selectedLinkedPr.state}
                          </div>
                        </dd>
                      </div>
                    )}
                  </dl>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    data-testid={`issue-open-task-${selectedIssue.id}`}
                    onClick={() => onOpenAgentTask?.(selectedLinkedTask.id)}
                  >
                    <ArrowUpRight className="size-4" />
                    在工作台打开任务
                  </Button>
                </>
              ) : (
                <p className="text-[12px] text-[var(--ink-subtle)] leading-relaxed text-pretty">
                  尚未关联 A2A 任务。交由总指挥派发后可在此查看执行节点、模型、Worktree 与 PR 链接。
                </p>
              )}
            </section>

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
          </>
        )}
      </InspectorDrawer>
    </div>
  );
}

export default ProjectsView;
