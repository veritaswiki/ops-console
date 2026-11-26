import React from 'react';
import { ExternalLink, RefreshCw, Save } from 'lucide-react';
import {
  fetchLinearState,
  syncLinearGithub,
  updateLinearGithubConfig,
} from '../api';
import type { LinearStateResponse } from '../types';
import { getIssueStatusMeta } from '../lib/linear-projects';
import { cn } from '../lib/cn';
import { formatDateTime } from '../utils/format';
import { ModuleFrame } from '../modules/ModuleFrame';
import {
  Button,
  EmptyState,
  ErrorState,
  inputBaseClass,
  Panel,
  StatusIndicator,
  ViewSkeleton,
} from '../components/ui';

function safeGithubHref(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(\/.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function GithubView({
  readOnly = false,
  onToast,
}: {
  readOnly?: boolean;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [savingGithub, setSavingGithub] = React.useState(false);
  const [syncingGithub, setSyncingGithub] = React.useState(false);

  const [githubDraft, setGithubDraft] = React.useState({
    enabled: true,
    owner: '',
    repo: '',
    defaultBranch: 'main',
    syncDirection: 'bidirectional',
    tokenEnvVar: 'GITHUB_TOKEN',
    autoCreatePr: true,
  });

  const loadState = React.useCallback(async () => {
    setError(null);
    try {
      const lin = await fetchLinearState();
      setLinearState(lin);
      setGithubDraft({
        enabled: lin.githubConfig.enabled,
        owner: lin.githubConfig.owner || '',
        repo: lin.githubConfig.repo || '',
        defaultBranch: lin.githubConfig.defaultBranch || 'main',
        syncDirection: lin.githubConfig.syncDirection || 'bidirectional',
        tokenEnvVar: lin.githubConfig.tokenEnvVar || 'GITHUB_TOKEN',
        autoCreatePr: lin.githubConfig.autoCreatePr,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 GitHub 同步状态失败');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
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
      await loadState();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '保存 GitHub 配置失败', 'err');
    } finally {
      setSavingGithub(false);
    }
  };

  const handleSyncGithub = async () => {
    if (readOnly) return;
    setSyncingGithub(true);
    try {
      const res = await syncLinearGithub(githubDraft.syncDirection);
      onToast?.(res.summary || `GitHub 同步完成 (${res.mode})`, 'ok');
      await loadState();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : 'GitHub 同步失败', 'err');
    } finally {
      setSyncingGithub(false);
    }
  };

  if (loading && !linearState) {
    return <ViewSkeleton />;
  }

  if (error && !linearState) {
    return <ErrorState title="GitHub 加载失败" message={error} onRetry={() => void loadState()} />;
  }

  const githubLinkedIssues = (linearState?.issues || []).filter((i) => Boolean(i.github));

  return (
    <ModuleFrame
      title="GitHub"
      description="配置目标仓库并执行 Issue / Pull Request 双向同步，追踪 Agent 隔离 Worktree 的代码交付。"
      meta={`${linearState?.githubConfig.owner || 'example-org'}/${linearState?.githubConfig.repo || 'ops-console'} · ${githubLinkedIssues.length} 项已关联`}
      actions={
        <Button
          variant="primary"
          size="sm"
          disabled={readOnly || syncingGithub}
          data-testid="github-sync-now-btn"
          onClick={() => void handleSyncGithub()}
        >
          <RefreshCw className={cn('size-3.5', syncingGithub && 'animate-spin')} />
          {syncingGithub ? '同步中...' : '立即同步 GitHub'}
        </Button>
      }
      testId="view-github"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Panel
          title="仓库连接配置"
          description="访问令牌仅从服务端环境变量读取，绝不明文落盘或暴露给浏览器。"
          className="lg:col-span-7"
        >
          <form onSubmit={handleSaveGithub} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <div className="flex flex-wrap items-center gap-5 pt-1 text-[12.5px] text-[var(--ink-muted)]">
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
            </div>

            <Button type="submit" variant="secondary" size="sm" disabled={readOnly || savingGithub}>
              <Save className="size-3.5" />
              {savingGithub ? '保存中...' : '保存配置'}
            </Button>
          </form>
        </Panel>

        <Panel
          title="同步状态"
          description="配置服务端 Token 时直连 GitHub REST API；未配置时在本地安全模拟闭环。"
          className="lg:col-span-5"
        >
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--ink-muted)]">目标仓库</span>
              <span className="font-mono text-[12.5px] text-[var(--ink)] truncate">
                {linearState?.githubConfig.owner}/{linearState?.githubConfig.repo}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--ink-muted)]">连接模式</span>
              <StatusIndicator
                status={linearState?.githubConfig.hasServerToken ? 'healthy' : 'standby'}
                label={linearState?.githubConfig.hasServerToken ? 'Live API' : '本地模拟'}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--ink-muted)]">最近同步</span>
              <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
                {linearState?.githubConfig.lastSyncedAt
                  ? formatDateTime(linearState.githubConfig.lastSyncedAt)
                  : '尚未同步'}
              </span>
            </div>
            {linearState?.githubConfig.lastSyncSummary && (
              <p className="pt-2 border-t border-[var(--border-subtle)] text-[12.5px] text-[var(--ink-muted)]">
                {linearState.githubConfig.lastSyncSummary}
              </p>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title={`关联交付项 (${githubLinkedIssues.length})`}
        description="所有与 GitHub Issue 或 Pull Request 绑定的任务及对应隔离分支。"
        bodyClassName="p-0"
      >
        {githubLinkedIssues.length === 0 ? (
          <EmptyState title="暂无关联项" message="点击右上角「立即同步 GitHub」拉取或关联仓库交付项。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11.5px] text-[var(--ink-subtle)]">
                  <th className="py-2.5 px-5 font-medium whitespace-nowrap">编号</th>
                  <th className="py-2.5 px-4 font-medium">任务标题</th>
                  <th className="py-2.5 px-4 font-medium whitespace-nowrap">PR / Issue</th>
                  <th className="py-2.5 px-4 font-medium whitespace-nowrap">Worktree 分支</th>
                  <th className="py-2.5 px-5 font-medium whitespace-nowrap text-right">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {githubLinkedIssues.map((item) => {
                  const safeUrl = safeGithubHref(item.github?.url);
                  return (
                    <tr key={item.id} className="hover:bg-[var(--surface-hover)]/50 transition-colors">
                      <td className="py-3 px-5 font-mono text-[12px] font-semibold text-[var(--accent)] whitespace-nowrap">
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
                      <td className="py-3 px-5 whitespace-nowrap text-right">
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
        )}
      </Panel>
    </ModuleFrame>
  );
}

export default GithubView;
