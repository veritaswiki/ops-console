import React from 'react';
import { GitPullRequest, RefreshCw } from 'lucide-react';
import {
  dispatchLinearCommander,
  fetchA2AState,
  fetchGithubOverview,
  fetchLinearState,
  syncLinearGithub,
  updateLinearIssue,
} from '../api';
import type {
  A2ATaskRecord,
  GithubPullRequestItem,
  LinearIssuePriority,
  LinearIssueStatus,
  LinearStateResponse,
  ToastHandler,
} from '../types';
import { shortAgentName } from '../lib/agent-console';
import { cn } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import {
  Button,
  ErrorState,
  ViewSkeleton,
  WidgetSkeleton,
} from '../components/ui';

const LazyLinearGraphCanvas = React.lazy(() =>
  import('../components/LinearGraphCanvas').then((m) => ({ default: m.LinearGraphCanvas })),
);

export function AgentGraphView({
  readOnly = false,
  onToast,
}: {
  readOnly?: boolean;
  onToast?: ToastHandler;
}) {
  const [linearState, setLinearState] = React.useState<LinearStateResponse | null>(null);
  const [liveA2ATasks, setLiveA2ATasks] = React.useState<A2ATaskRecord[]>([]);
  const [liveGithubPrs, setLiveGithubPrs] = React.useState<GithubPullRequestItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [syncingGithub, setSyncingGithub] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = React.useState<string | null>(null);

  const loadState = React.useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [linRes, a2aRes, ghRes] = await Promise.allSettled([
        fetchLinearState(),
        fetchA2AState(),
        fetchGithubOverview(),
      ]);
      if (linRes.status === 'fulfilled') {
        setLinearState(linRes.value);
      } else {
        throw linRes.reason;
      }
      if (a2aRes.status === 'fulfilled') {
        setLiveA2ATasks(a2aRes.value.tasks || []);
      }
      if (ghRes.status === 'fulfilled') {
        setLiveGithubPrs(ghRes.value.pullRequests || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载分配图谱失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleSyncGithub = async () => {
    if (guardReadOnly(readOnly, onToast, '同步 GitHub 任务')) return;
    setSyncingGithub(true);
    try {
      const res = await syncLinearGithub('pull');
      onToast?.(res.summary || `已同步 GitHub（新增 ${res.importedCount} / 更新 ${res.updatedCount}）`, 'ok');
      await loadState();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '同步 GitHub 失败'), 'err');
    } finally {
      setSyncingGithub(false);
    }
  };

  React.useEffect(() => {
    void loadState();
  }, [loadState]);

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
      await loadState();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '更新任务失败'), 'err');
    }
  };

  const handleDispatchCommander = async (issueId: string) => {
    if (guardReadOnly(readOnly, onToast, '派发任务给助手')) return;
    setDispatchingId(issueId);
    try {
      const res = await dispatchLinearCommander(issueId);
      onToast?.(
        `主控助手 ${shortAgentName(res.commander.name)} 已拆解 ${res.createdSubIssues?.length || 0} 个子任务`,
        'ok',
      );
      await loadState();
    } catch (err) {
      onToast?.(extractErrorMessage(err, '派发任务失败'), 'err');
    } finally {
      setDispatchingId(null);
    }
  };

  if (loading && !linearState) {
    return <ViewSkeleton />;
  }

  if (error && !linearState) {
    return <ErrorState title="分配图谱加载失败" message={error} onRetry={() => void loadState()} />;
  }

  const availableAgents = linearState?.availableAgents || [];
  const commanderAgent =
    availableAgents.find((a) => a.id === linearState?.commander.leadAgentId) ||
    availableAgents.find((a) => a.role === 'lead') ||
    availableAgents[0] ||
    null;

  return (
    <div className="space-y-4" data-testid="view-agent-graph">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--ink)] whitespace-nowrap">
            分配图谱
          </h1>
          <span className="hidden sm:inline text-[12.5px] text-[var(--ink-subtle)] truncate">
            点击任意节点查看参数、改派执行 Agent 或触发总指挥拆解
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!readOnly && (
            <Button
              variant="secondary"
              size="sm"
              disabled={syncingGithub}
              onClick={() => void handleSyncGithub()}
            >
              <GitPullRequest className={cn('size-3.5', syncingGithub && 'animate-pulse')} />
              {syncingGithub ? '同步中...' : '同步 GitHub PR/Issue'}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={refreshing}
            onClick={() => void loadState()}
          >
            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </div>

      <React.Suspense fallback={<WidgetSkeleton heightClass="h-[560px]" label="正在加载工作流画布" />}>
        <LazyLinearGraphCanvas
          commanderName={commanderAgent?.name || '总指挥 Agent'}
          commanderId={commanderAgent?.id || linearState?.commander.leadAgentId || 'lead'}
          issues={linearState?.issues || []}
          projects={linearState?.projects || []}
          liveA2ATasks={liveA2ATasks}
          liveGithubPrs={liveGithubPrs}
          availableAgents={availableAgents}
          availableBots={linearState?.availableBots || []}
          readOnly={readOnly}
          dispatchingId={dispatchingId}
          onUpdateIssue={handleUpdateIssue}
          onDispatchCommander={handleDispatchCommander}
        />
      </React.Suspense>
    </div>
  );
}

export default AgentGraphView;
