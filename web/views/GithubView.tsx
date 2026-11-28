import React from 'react';
import {
  AlertCircle,
  Bot,
  CircleDot,
  ExternalLink,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Wrench,
  X,
} from 'lucide-react';
import {
  dispatchGithubAgent,
  fetchGithubOverview,
  fetchLinearState,
  syncLinearGithub,
  updateLinearGithubConfig,
} from '../api';
import type {
  GithubIssueItem,
  GithubOverviewResponse,
  GithubPullRequestItem,
  GithubWorkflowRunItem,
  LinearStateResponse,
  ToastHandler,
} from '../types';
import { getIssueStatusMeta } from '../lib/linear-projects';
import { cn, FOCUS_RING } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import { formatDateTime, formatRelativeAge } from '../utils/format';
import { ModuleFrame } from '../modules/ModuleFrame';
import {
  Button,
  EmptyState,
  ErrorState,
  inputBaseClass,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  ViewSkeleton,
} from '../components/ui';

type GithubTab = 'prs' | 'issues' | 'ci' | 'worktrees';

function safeGithubHref(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(\/.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function prChecksMeta(status?: string | null): { tone: string; label: string } {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SUCCESS') return { tone: 'healthy', label: 'Checks 通过' };
  if (normalized === 'FAILURE' || normalized === 'ERROR') return { tone: 'failed', label: 'Checks 失败' };
  if (normalized === 'PENDING' || normalized === 'EXPECTED') return { tone: 'degraded', label: 'Checks 运行中' };
  return { tone: 'standby', label: '无检查' };
}

function prStateMeta(pr: GithubPullRequestItem): { tone: string; label: string } {
  if (pr.isDraft) return { tone: 'standby', label: 'Draft' };
  const state = String(pr.state || 'OPEN').toUpperCase();
  if (state === 'MERGED') return { tone: 'healthy', label: 'Merged' };
  if (state === 'CLOSED') return { tone: 'failed', label: 'Closed' };
  return { tone: 'healthy', label: 'Open' };
}

function ciRunMeta(run: GithubWorkflowRunItem): { tone: string; label: string; failed: boolean } {
  const status = String(run.status || '').toLowerCase();
  const conclusion = String(run.conclusion || '').toLowerCase();
  if (status === 'in_progress' || status === 'queued' || status === 'waiting' || status === 'pending') {
    return { tone: 'degraded', label: '运行中', failed: false };
  }
  if (conclusion === 'success') {
    return { tone: 'healthy', label: '通过', failed: false };
  }
  if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'startup_failure') {
    return { tone: 'failed', label: '失败', failed: true };
  }
  if (conclusion === 'cancelled' || conclusion === 'skipped') {
    return { tone: 'standby', label: conclusion === 'cancelled' ? '已取消' : '已跳过', failed: false };
  }
  return { tone: 'standby', label: conclusion || status || '未知', failed: false };
}

function connectionModeMeta(overview: GithubOverviewResponse | null, hasLinearToken?: boolean): {
  tone: string;
  label: string;
} {
  if (overview?.mode === 'gh-cli' && overview.ghAuthenticated) {
    return {
      tone: 'healthy',
      label: overview.ghAccount ? `gh CLI 已连接 @${overview.ghAccount}` : 'gh CLI 已连接',
    };
  }
  if (overview?.mode === 'token-api' || hasLinearToken) {
    return { tone: 'healthy', label: 'Token API' };
  }
  if (overview?.mode === 'demo') {
    return { tone: 'standby', label: '演示模式' };
  }
  return { tone: 'degraded', label: '离线模式' };
}

export function GithubView({
  readOnly = false,
  onOpenAgentTask,
  onToast,
}: {
  readOnly?: boolean;
  onOpenAgentTask?: (taskId: string) => void;
  onToast?: ToastHandler;
}) {
  const [overview, setOverview] = React.useState<GithubOverviewResponse | null>(null);
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<GithubTab>('prs');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [configOpen, setConfigOpen] = React.useState(false);
  const [savingGithub, setSavingGithub] = React.useState(false);
  const [syncingGithub, setSyncingGithub] = React.useState(false);
  const [dispatchingKey, setDispatchingKey] = React.useState<string | null>(null);

  const [githubDraft, setGithubDraft] = React.useState({
    enabled: true,
    owner: '',
    repo: '',
    defaultBranch: 'main',
    syncDirection: 'bidirectional',
    tokenEnvVar: 'GITHUB_TOKEN',
    autoCreatePr: true,
  });

  const loadState = React.useCallback(async (isRefresh = false) => {
    setError(null);
    if (isRefresh) setRefreshing(true);
    try {
      const [ovResult, linResult] = await Promise.allSettled([
        fetchGithubOverview(),
        fetchLinearState(),
      ]);

      if (ovResult.status === 'fulfilled') {
        setOverview(ovResult.value);
      }
      if (linResult.status === 'fulfilled') {
        const lin = linResult.value;
        const detectedRepo = ovResult.status === 'fulfilled' ? ovResult.value.repo : null;
        setLinearState(lin);
        setGithubDraft({
          enabled: lin.githubConfig.enabled,
          owner: lin.githubConfig.owner || detectedRepo?.owner || '',
          repo: lin.githubConfig.repo || detectedRepo?.name || '',
          defaultBranch: lin.githubConfig.defaultBranch || detectedRepo?.defaultBranch || 'main',
          syncDirection: lin.githubConfig.syncDirection || 'bidirectional',
          tokenEnvVar: lin.githubConfig.tokenEnvVar || 'GITHUB_TOKEN',
          autoCreatePr: lin.githubConfig.autoCreatePr,
        });
      }

      if (ovResult.status === 'rejected' && linResult.status === 'rejected') {
        const reason = ovResult.reason instanceof Error ? ovResult.reason.message : '加载 GitHub 数据失败';
        setError(reason);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '保存 GitHub 同步配置')) return;
    setSavingGithub(true);
    try {
      await updateLinearGithubConfig({
        enabled: githubDraft.enabled,
        owner: githubDraft.owner.trim(),
        repo: githubDraft.repo.trim(),
        defaultBranch: githubDraft.defaultBranch.trim() || 'main',
        syncDirection: githubDraft.syncDirection,
        tokenEnvVar: githubDraft.tokenEnvVar.trim() || 'GITHUB_TOKEN',
        autoCreatePr: githubDraft.autoCreatePr,
      });
      onToast?.('GitHub 同步配置已保存', 'ok');
      setConfigOpen(false);
      await loadState(true);
    } catch (err) {
      onToast?.(extractErrorMessage(err, '保存 GitHub 配置失败'), 'err');
    } finally {
      setSavingGithub(false);
    }
  };

  const handleSyncGithub = async () => {
    if (guardReadOnly(readOnly, onToast, '同步 GitHub 数据')) return;
    setSyncingGithub(true);
    try {
      const res = await syncLinearGithub(githubDraft.syncDirection);
      onToast?.(res.summary || 'GitHub 同步完成', 'ok');
      await loadState(true);
    } catch (err) {
      onToast?.(extractErrorMessage(err, 'GitHub 同步失败'), 'err');
    } finally {
      setSyncingGithub(false);
    }
  };

  const handleDispatchAgent = async (
    key: string,
    payload: Parameters<typeof dispatchGithubAgent>[0],
    successLabel: string,
  ) => {
    if (guardReadOnly(readOnly, onToast, '派发助手任务')) return;
    setDispatchingKey(key);
    try {
      const res = await dispatchGithubAgent(payload);
      onToast?.(`${successLabel}：已开启对话`, 'ok');
      onOpenAgentTask?.(res.task.id);
    } catch (err) {
      onToast?.(extractErrorMessage(err, '派发助手失败'), 'err');
    } finally {
      setDispatchingKey(null);
    }
  };

  const pullRequests = overview?.pullRequests || [];
  const issues = overview?.issues || [];
  const workflowRuns = overview?.workflowRuns || [];
  const worktrees = overview?.worktrees || [];
  const githubLinkedIssues = (linearState?.issues || []).filter((item) => Boolean(item.github));

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPrs = React.useMemo(() => {
    if (!normalizedQuery) return pullRequests;
    return pullRequests.filter((pr) =>
      [
        `#${pr.number}`,
        String(pr.number),
        pr.title,
        pr.headRefName,
        pr.baseRefName,
        pr.author,
        ...(pr.labels || []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [pullRequests, normalizedQuery]);

  const filteredIssues = React.useMemo(() => {
    if (!normalizedQuery) return issues;
    return issues.filter((issue) =>
      [`#${issue.number}`, String(issue.number), issue.title, issue.author, ...(issue.labels || [])]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [issues, normalizedQuery]);

  const filteredRuns = React.useMemo(() => {
    if (!normalizedQuery) return workflowRuns;
    return workflowRuns.filter((run) =>
      [run.name, run.displayTitle, run.headBranch, run.event, run.conclusion, run.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [workflowRuns, normalizedQuery]);

  const filteredWorktrees = React.useMemo(() => {
    if (!normalizedQuery) return worktrees;
    return worktrees.filter((wt) =>
      [wt.path, wt.branch, wt.head].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery),
    );
  }, [worktrees, normalizedQuery]);

  if (loading && !overview && !linearState) {
    return <ViewSkeleton />;
  }

  if (error && !overview && !linearState) {
    return <ErrorState title="GitHub 加载失败" message={error} onRetry={() => void loadState()} />;
  }

  const repoFullName =
    overview?.repo?.fullName ||
    (linearState?.githubConfig?.owner && linearState?.githubConfig?.repo
      ? `${linearState.githubConfig.owner}/${linearState.githubConfig.repo}`
      : 'example-org/ops-console');
  const repoWebUrl = safeGithubHref(overview?.repo?.webUrl || `https://github.com/${repoFullName}`);
  const currentBranch = overview?.repo?.currentBranch || overview?.repo?.defaultBranch || 'main';
  const defaultBranch = overview?.repo?.defaultBranch || linearState?.githubConfig?.defaultBranch || 'main';
  const connMeta = connectionModeMeta(overview, linearState?.githubConfig?.hasServerToken);

  const tabOptions: ReadonlyArray<{ value: GithubTab; label: string }> = [
    { value: 'prs', label: `Pull Requests (${pullRequests.length})` },
    { value: 'issues', label: `Issues (${issues.length})` },
    { value: 'ci', label: `CI & Checks (${workflowRuns.length})` },
    { value: 'worktrees', label: `Worktrees (${worktrees.length})` },
  ];

  return (
    <ModuleFrame
      title="GitHub"
      description="直接检视 Pull Requests、Issues、CI 检查与本地 Git Worktree，并一键派发 Agent 执行审查、修 CI 或实现需求。"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={refreshing}
            onClick={() => void loadState(true)}
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} strokeWidth={1.75} />
            刷新
          </Button>
          <Button
            variant="secondary"
            size="sm"
            data-testid="github-config-toggle"
            aria-expanded={configOpen}
            onClick={() => setConfigOpen((open) => !open)}
          >
            <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
            仓库配置
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={readOnly || syncingGithub}
            data-testid="github-sync-now-btn"
            onClick={() => void handleSyncGithub()}
          >
            <RefreshCw className={cn('size-3.5', syncingGithub && 'animate-spin')} strokeWidth={1.75} />
            {syncingGithub ? '同步中...' : '立即同步'}
          </Button>
        </div>
      }
      testId="view-github"
    >
      {/* Orca / T3 Repo Strip */}
      <div
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-3.5 shadow-[var(--shadow-card)] flex flex-wrap items-center justify-between gap-4"
        data-testid="github-repo-strip"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <FolderGit2 className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
            {repoWebUrl ? (
              <a
                href={repoWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'font-mono text-[13.5px] font-semibold text-[var(--ink)] hover:text-[var(--accent)] inline-flex items-center gap-1 truncate rounded',
                  FOCUS_RING,
                )}
              >
                <span className="truncate">{repoFullName}</span>
                <ExternalLink className="size-3 text-[var(--ink-subtle)] shrink-0" strokeWidth={1.75} />
              </a>
            ) : (
              <span className="font-mono text-[13.5px] font-semibold text-[var(--ink)] truncate">
                {repoFullName}
              </span>
            )}
          </div>

          <span className="text-[var(--border-strong)] select-none" aria-hidden="true">/</span>

          <div className="inline-flex items-center gap-1.5 font-mono text-[12.5px] text-[var(--ink-muted)]">
            <GitBranch className="size-3.5 text-[var(--ink-subtle)] shrink-0" strokeWidth={1.75} />
            <span className="text-[var(--ink)]">{currentBranch}</span>
            {currentBranch !== defaultBranch && (
              <span className="text-[var(--ink-subtle)]">→ {defaultBranch}</span>
            )}
          </div>

          <span className="text-[var(--border-strong)] select-none hidden sm:inline" aria-hidden="true">·</span>

          <StatusIndicator status={connMeta.tone} label={connMeta.label} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
          <span>PR {overview?.summary?.openPrs ?? pullRequests.length}</span>
          <span aria-hidden="true">·</span>
          <span>Issues {overview?.summary?.openIssues ?? issues.length}</span>
          {(overview?.summary?.failingChecks ?? 0) > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--err)] font-medium">
                CI 失败 {overview?.summary?.failingChecks}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>Worktrees {overview?.summary?.worktreeCount ?? worktrees.length}</span>
        </div>
      </div>

      {overview?.warning && (
        <div className="rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/8 px-4 py-2.5 flex items-center gap-2.5 text-[12.5px] text-[var(--warn)]">
          <AlertCircle className="size-4 shrink-0" strokeWidth={1.75} />
          <span>{overview.warning}</span>
        </div>
      )}

      {/* Collapsible Repo Sync Config Panel (tucked away unless toggled) */}
      {configOpen && (
        <Panel
          title="仓库同步配置"
          description="仅在需要自定义同步目标或 Token 环境变量名时修改；访问令牌仅从服务端环境变量读取。"
          actions={
            <Button variant="ghost" size="icon" onClick={() => setConfigOpen(false)} aria-label="收起仓库配置">
              <X className="size-4" strokeWidth={1.75} />
            </Button>
          }
        >
          <form onSubmit={handleSaveGithub} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">Owner / Org</span>
                <input
                  type="text"
                  disabled={readOnly || savingGithub}
                  value={githubDraft.owner}
                  onChange={(e) => setGithubDraft((g) => ({ ...g, owner: e.target.value }))}
                  placeholder="example-org"
                  className={cn('w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                />
              </label>
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">Repository</span>
                <input
                  type="text"
                  disabled={readOnly || savingGithub}
                  value={githubDraft.repo}
                  onChange={(e) => setGithubDraft((g) => ({ ...g, repo: e.target.value }))}
                  placeholder="ops-console"
                  className={cn('w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                />
              </label>
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">默认分支</span>
                <input
                  type="text"
                  disabled={readOnly || savingGithub}
                  value={githubDraft.defaultBranch}
                  onChange={(e) => setGithubDraft((g) => ({ ...g, defaultBranch: e.target.value }))}
                  className={cn('w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                />
              </label>
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">同步方向</span>
                <select
                  disabled={readOnly || savingGithub}
                  value={githubDraft.syncDirection}
                  onChange={(e) => setGithubDraft((g) => ({ ...g, syncDirection: e.target.value }))}
                  className={cn('ui-select w-full h-10 sm:h-9 pl-3 text-[12.5px] cursor-pointer', inputBaseClass)}
                >
                  <option value="bidirectional">双向同步 (Issues + PR)</option>
                  <option value="pull">仅拉取 Issues</option>
                  <option value="push">仅推送 PR 状态</option>
                </select>
              </label>
              <label className="block space-y-1 text-[12.5px]">
                <span className="text-[var(--ink-muted)]">Token 环境变量</span>
                <input
                  type="text"
                  disabled={readOnly || savingGithub}
                  value={githubDraft.tokenEnvVar}
                  onChange={(e) => setGithubDraft((g) => ({ ...g, tokenEnvVar: e.target.value.toUpperCase() }))}
                  className={cn('w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]', inputBaseClass)}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-5 text-[12.5px] text-[var(--ink-muted)]">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={githubDraft.enabled}
                    onChange={(e) => setGithubDraft((g) => ({ ...g, enabled: e.target.checked }))}
                    className="accent-[var(--accent)]"
                  />
                  <span>启用双向同步</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={githubDraft.autoCreatePr}
                    onChange={(e) => setGithubDraft((g) => ({ ...g, autoCreatePr: e.target.checked }))}
                    className="accent-[var(--accent)]"
                  />
                  <span>派发时自动关联 PR</span>
                </label>
                {linearState?.githubConfig?.lastSyncedAt && (
                  <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                    最近同步：{formatDateTime(linearState.githubConfig.lastSyncedAt)}
                  </span>
                )}
              </div>
              <Button type="submit" variant="primary" size="sm" disabled={readOnly || savingGithub}>
                <Save className="size-3.5" strokeWidth={1.75} />
                {savingGithub ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {/* Main Orca / T3 Tabbed Workspace */}
      <Panel bodyClassName="p-0">
        <div className="px-5 sm:px-6 py-3.5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
          <SegmentedFilter
            value={activeTab}
            onChange={setActiveTab}
            options={tabOptions}
            ariaLabel="切换 GitHub 工作台标签页"
          />
          <div className="relative w-full sm:w-60">
            <Search
              className="size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="过滤编号、标题、分支或作者..."
              aria-label="过滤 GitHub 条目"
              className={cn('h-9 sm:h-8 w-full pl-8 pr-3', inputBaseClass)}
            />
          </div>
        </div>

        {/* Tab 1: Pull Requests */}
        {activeTab === 'prs' && (
          filteredPrs.length === 0 ? (
            <EmptyState
              title="暂无 Pull Requests"
              message={
                normalizedQuery
                  ? '当前过滤关键词没有命中任何 PR。'
                  : '当前仓库暂无打开的 Pull Request，或尚未连接 GitHub CLI / Token。'
              }
              action={
                normalizedQuery
                  ? { label: '清空筛选', onClick: () => setSearchQuery('') }
                  : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]" data-testid="github-pr-list">
              {filteredPrs.map((pr) => {
                const stateInfo = prStateMeta(pr);
                const checksInfo = prChecksMeta(pr.checksStatus);
                const safeUrl = safeGithubHref(pr.url);
                const reviewKey = `pr-review-${pr.number}`;
                const fixKey = `pr-fix-${pr.number}`;
                const isFailedChecks = String(pr.checksStatus || '').toUpperCase() === 'FAILURE';
                return (
                  <li
                    key={pr.number}
                    className="px-5 sm:px-6 py-4 hover:bg-[var(--surface-hover)]/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <GitPullRequest
                          className={cn(
                            'size-4 shrink-0',
                            pr.isDraft
                              ? 'text-[var(--ink-subtle)]'
                              : String(pr.state).toUpperCase() === 'MERGED'
                                ? 'text-[var(--accent)]'
                                : String(pr.state).toUpperCase() === 'CLOSED'
                                  ? 'text-[var(--err)]'
                                  : 'text-[var(--ok)]',
                          )}
                          strokeWidth={1.75}
                        />
                        <span className="font-mono text-[12.5px] font-semibold text-[var(--ink-subtle)] tabular-nums shrink-0">
                          #{pr.number}
                        </span>
                        <span className="text-[14px] font-medium text-[var(--ink)] truncate">
                          {pr.title}
                        </span>
                        <StatusIndicator status={stateInfo.tone} label={stateInfo.label} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ink-muted)] pl-6">
                        <span className="font-mono text-[11.5px] text-[var(--ink-muted)]">
                          {pr.headRefName} → {pr.baseRefName}
                        </span>
                        {(pr.additions != null || pr.deletions != null) && (
                          <>
                            <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                            <span className="font-mono text-[11.5px] tabular-nums">
                              <span className="text-[var(--ok)]">+{pr.additions ?? 0}</span>
                              {' / '}
                              <span className="text-[var(--err)]">-{pr.deletions ?? 0}</span>
                              {pr.changedFiles != null ? ` (${pr.changedFiles} 文件)` : ''}
                            </span>
                          </>
                        )}
                        <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                        <StatusIndicator
                          status={checksInfo.tone}
                          label={pr.checksSummary || checksInfo.label}
                        />
                        <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                        <span className="text-[var(--ink-subtle)]">
                          @{pr.author} · {formatRelativeAge(pr.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-6 lg:pl-0">
                      {isFailedChecks && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || dispatchingKey !== null}
                          onClick={() =>
                            void handleDispatchAgent(
                              fixKey,
                              {
                                kind: 'pr',
                                number: pr.number,
                                title: pr.title,
                                branch: pr.headRefName,
                                url: pr.url,
                                action: 'fix-ci',
                              },
                              `PR #${pr.number} CI 修复已派发`,
                            )
                          }
                        >
                          <Wrench className="size-3.5 text-[var(--err)]" strokeWidth={1.75} />
                          {dispatchingKey === fixKey ? '派发中...' : '修 CI'}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={readOnly || dispatchingKey !== null}
                        data-testid={`github-pr-review-${pr.number}`}
                        onClick={() =>
                          void handleDispatchAgent(
                            reviewKey,
                            {
                              kind: 'pr',
                              number: pr.number,
                              title: pr.title,
                              branch: pr.headRefName,
                              url: pr.url,
                              action: 'review',
                            },
                            `PR #${pr.number} 审查已派发`,
                          )
                        }
                      >
                        <Bot className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                        {dispatchingKey === reviewKey ? '派发中...' : 'Agent 审查'}
                      </Button>
                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`在 GitHub 打开 PR #${pr.number}`}
                          title="在 GitHub 查看"
                          className={cn(
                            'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors',
                            FOCUS_RING,
                          )}
                        >
                          <ExternalLink className="size-3.5" strokeWidth={1.75} />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {/* Tab 2: Issues */}
        {activeTab === 'issues' && (
          filteredIssues.length === 0 ? (
            <EmptyState
              title="暂无 Issues"
              message={
                normalizedQuery
                  ? '当前过滤关键词没有命中任何 Issue。'
                  : '当前仓库暂无打开的 Issue。'
              }
              action={
                normalizedQuery
                  ? { label: '清空筛选', onClick: () => setSearchQuery('') }
                  : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]" data-testid="github-issue-list">
              {filteredIssues.map((issue: GithubIssueItem) => {
                const safeUrl = safeGithubHref(issue.url);
                const dispatchKey = `issue-${issue.number}`;
                return (
                  <li
                    key={issue.number}
                    className="px-5 sm:px-6 py-4 hover:bg-[var(--surface-hover)]/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <CircleDot
                          className={cn(
                            'size-4 shrink-0',
                            String(issue.state).toUpperCase() === 'CLOSED'
                              ? 'text-[var(--ink-subtle)]'
                              : 'text-[var(--ok)]',
                          )}
                          strokeWidth={1.75}
                        />
                        <span className="font-mono text-[12.5px] font-semibold text-[var(--ink-subtle)] tabular-nums shrink-0">
                          #{issue.number}
                        </span>
                        <span className="text-[14px] font-medium text-[var(--ink)] truncate">
                          {issue.title}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ink-subtle)] pl-6">
                        {issue.labels && issue.labels.length > 0 && (
                          <>
                            <span className="font-mono text-[11.5px] text-[var(--ink-muted)]">
                              {issue.labels.join(' · ')}
                            </span>
                            <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                          </>
                        )}
                        <span>@{issue.author}</span>
                        <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <MessageSquare className="size-3" strokeWidth={1.75} />
                          {issue.commentsCount ?? 0}
                        </span>
                        <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                        <span>{formatRelativeAge(issue.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-6 lg:pl-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={readOnly || dispatchingKey !== null}
                        data-testid={`github-issue-dispatch-${issue.number}`}
                        onClick={() =>
                          void handleDispatchAgent(
                            dispatchKey,
                            {
                              kind: 'issue',
                              number: issue.number,
                              title: issue.title,
                              url: issue.url,
                              action: 'implement',
                            },
                            `Issue #${issue.number} 已交给 Agent`,
                          )
                        }
                      >
                        <Bot className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                        {dispatchingKey === dispatchKey ? '派发中...' : '交给 Agent'}
                      </Button>
                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`在 GitHub 打开 Issue #${issue.number}`}
                          title="在 GitHub 查看"
                          className={cn(
                            'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors',
                            FOCUS_RING,
                          )}
                        >
                          <ExternalLink className="size-3.5" strokeWidth={1.75} />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {/* Tab 3: CI & Checks */}
        {activeTab === 'ci' && (
          filteredRuns.length === 0 ? (
            <EmptyState
              title="暂无 CI 运行记录"
              message={
                normalizedQuery
                  ? '当前过滤关键词没有命中任何工作流记录。'
                  : '尚未采集到最近的 GitHub Actions 工作流运行记录。'
              }
              action={
                normalizedQuery
                  ? { label: '清空筛选', onClick: () => setSearchQuery('') }
                  : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]" data-testid="github-ci-list">
              {filteredRuns.map((run) => {
                const meta = ciRunMeta(run);
                const safeUrl = safeGithubHref(run.url);
                const dispatchKey = `ci-${run.id}`;
                return (
                  <li
                    key={String(run.id)}
                    className="px-5 sm:px-6 py-4 hover:bg-[var(--surface-hover)]/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                        <PlayCircle className="size-4 text-[var(--ink-subtle)] shrink-0" strokeWidth={1.75} />
                        <span className="text-[14px] font-medium text-[var(--ink)] truncate">
                          {run.displayTitle || run.name}
                        </span>
                        <StatusIndicator status={meta.tone} label={meta.label} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ink-subtle)] pl-6">
                        <span className="text-[var(--ink-muted)]">{run.name}</span>
                        <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                        <span className="font-mono text-[11.5px] text-[var(--ink-muted)]">
                          {run.headBranch}
                        </span>
                        {run.event && (
                          <>
                            <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                            <span className="font-mono text-[11.5px]">{run.event}</span>
                          </>
                        )}
                        <span className="text-[var(--border-strong)]" aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatRelativeAge(run.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-6 lg:pl-0">
                      {meta.failed && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || dispatchingKey !== null}
                          onClick={() =>
                            void handleDispatchAgent(
                              dispatchKey,
                              {
                                kind: 'ci',
                                title: run.displayTitle || run.name,
                                branch: run.headBranch,
                                url: run.url,
                                action: 'fix-ci',
                              },
                              `CI「${run.name}」排查任务已派发`,
                            )
                          }
                        >
                          <Wrench className="size-3.5 text-[var(--err)]" strokeWidth={1.75} />
                          {dispatchingKey === dispatchKey ? '派发中...' : 'Agent 排查'}
                        </Button>
                      )}
                      {safeUrl && (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`查看工作流 ${run.name}`}
                          title="在 GitHub Actions 查看"
                          className={cn(
                            'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors',
                            FOCUS_RING,
                          )}
                        >
                          <ExternalLink className="size-3.5" strokeWidth={1.75} />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {/* Tab 4: Local Worktrees */}
        {activeTab === 'worktrees' && (
          filteredWorktrees.length === 0 ? (
            <EmptyState
              title="未检测到 Git Worktree"
              message={
                normalizedQuery
                  ? '当前过滤关键词没有命中任何本地 Worktree。'
                  : '当前工作区暂无额外 Git Worktree 隔离检出目录。'
              }
              action={
                normalizedQuery
                  ? { label: '清空筛选', onClick: () => setSearchQuery('') }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto" data-testid="github-worktree-list">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11.5px] text-[var(--ink-subtle)]">
                    <th className="py-2.5 pl-5 sm:pl-6 pr-4 font-medium whitespace-nowrap">分支</th>
                    <th className="py-2.5 px-4 font-medium">检出路径</th>
                    <th className="py-2.5 px-4 font-medium whitespace-nowrap">HEAD</th>
                    <th className="py-2.5 pl-4 pr-5 sm:pr-6 font-medium whitespace-nowrap text-right">类型</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredWorktrees.map((wt) => (
                    <tr key={`${wt.path}-${wt.head}`} className="hover:bg-[var(--surface-hover)]/50 transition-colors">
                      <td className="py-3 pl-5 sm:pl-6 pr-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] font-medium text-[var(--ink)]">
                          <GitBranch className="size-3.5 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
                          {wt.branch || '(detached)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[12px] text-[var(--ink-muted)] max-w-[440px] truncate" title={wt.path}>
                        {wt.path}
                      </td>
                      <td className="py-3 px-4 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
                        {wt.head ? wt.head.slice(0, 8) : '-'}
                      </td>
                      <td className="py-3 pl-4 pr-5 sm:pr-6 whitespace-nowrap text-right">
                        <StatusIndicator
                          status={wt.isMain ? 'healthy' : 'standby'}
                          label={wt.isMain ? '主工作区' : wt.bare ? 'Bare' : 'Worktree'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Panel>

      {/* Secondary Linked Linear-GitHub Items (kept accessible without cluttering top view) */}
      {githubLinkedIssues.length > 0 && (
        <Panel
          title={`已关联看板任务 (${githubLinkedIssues.length})`}
          description="与当前仓库双向同步关联的 Linear 任务及隔离分支追踪。"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11.5px] text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 sm:pl-6 pr-4 font-medium whitespace-nowrap">编号</th>
                  <th className="py-2.5 px-4 font-medium">任务标题</th>
                  <th className="py-2.5 px-4 font-medium whitespace-nowrap">PR / Issue</th>
                  <th className="py-2.5 px-4 font-medium whitespace-nowrap">Worktree 分支</th>
                  <th className="py-2.5 pl-4 pr-5 sm:pr-6 font-medium whitespace-nowrap text-right">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {githubLinkedIssues.map((item) => {
                  const safeUrl = safeGithubHref(item.github?.url);
                  return (
                    <tr key={item.id} className="hover:bg-[var(--surface-hover)]/50 transition-colors">
                      <td className="py-3 pl-5 sm:pl-6 pr-4 font-mono text-[12px] font-semibold text-[var(--accent)] whitespace-nowrap">
                        {item.identifier}
                      </td>
                      <td className="py-3 px-4 text-[var(--ink)] font-medium">{item.title}</td>
                      <td className="py-3 px-4 font-mono text-[12px] whitespace-nowrap tabular-nums">
                        {safeUrl ? (
                          <a
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                          >
                            {item.github?.repo}
                            {item.github?.prNumber
                              ? ` #${item.github.prNumber}`
                              : item.github?.issueNumber
                                ? ` #${item.github.issueNumber}`
                                : ''}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span>{item.github?.repo}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[12px] text-[var(--ink-muted)] whitespace-nowrap">
                        {item.github?.branch || item.worktreeBranch || '-'}
                      </td>
                      <td className="py-3 pl-4 pr-5 sm:pr-6 whitespace-nowrap text-right">
                        <StatusIndicator
                          status={getIssueStatusMeta(item.status).tone}
                          label={getIssueStatusMeta(item.status).label}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </ModuleFrame>
  );
}

export default GithubView;
