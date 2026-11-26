import React from 'react';
import {
  ArrowUp,
  GitBranch,
  Plus,
  Square,
} from 'lucide-react';
import type {
  A2AAgentPeer,
  A2AStateResponse,
  A2ATaskRecord,
} from '../types';
import {
  cancelA2ATask,
  dispatchA2ATask,
  fetchA2AState,
} from '../api';
import { shortAgentName } from '../lib/agent-console';
import { cn, FOCUS_RING } from '../lib/cn';
import { formatDateTime } from '../utils/format';
import { Button, StatusIndicator } from '../components/ui';

function taskStatusTone(state: string): 'healthy' | 'degraded' | 'failed' | 'standby' {
  if (state === 'completed') return 'healthy';
  if (state === 'working' || state === 'submitted') return 'degraded';
  if (state === 'failed' || state === 'canceled') return 'failed';
  return 'standby';
}

function taskStatusLabel(state: string): string {
  switch (state) {
    case 'submitted':
      return '排队中';
    case 'working':
      return '执行中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'canceled':
      return '已取消';
    default:
      return state;
  }
}

function formatDurationMs(ms?: number | null): string {
  if (ms == null || ms <= 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function AgentsView({
  readOnly = false,
  activeTaskId = null,
  onSelectTask,
  onTasksUpdated,
  onToast,
}: {
  readOnly?: boolean;
  activeTaskId?: string | null;
  onSelectTask?: (taskId: string | null) => void;
  onTasksUpdated?: () => void;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [a2aState, setA2aState] = React.useState<A2AStateResponse | null>(null);
  const [selectedTarget, setSelectedTarget] = React.useState<string>('auto');
  const [prompt, setPrompt] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [canceling, setCanceling] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const loadState = React.useCallback(async () => {
    try {
      const res = await fetchA2AState();
      setA2aState(res);
    } catch {
      // Non-blocking background sync
    }
  }, []);

  React.useEffect(() => {
    void loadState();
  }, [loadState, activeTaskId]);

  const agents: A2AAgentPeer[] = a2aState?.agents || [];
  const tasks: A2ATaskRecord[] = a2aState?.tasks || [];

  const leadAgent = React.useMemo(
    () =>
      agents.find((a) => a.id === a2aState?.leadAgentId) ||
      agents.find((a) => a.role === 'lead') ||
      agents[0] ||
      null,
    [agents, a2aState?.leadAgentId],
  );

  const activeTask = React.useMemo(
    () => (activeTaskId ? tasks.find((t) => t.id === activeTaskId) || null : null),
    [tasks, activeTaskId],
  );

  const isRunning = activeTask?.state === 'working' || activeTask?.state === 'submitted';

  React.useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadState();
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [isRunning, loadState]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = prompt.trim();
    if (readOnly || !text || submitting) return;

    setSubmitting(true);
    try {
      const res = await dispatchA2ATask({
        prompt: text,
        targetAgentId: selectedTarget === 'auto' ? undefined : selectedTarget,
      });
      setPrompt('');
      await loadState();
      onTasksUpdated?.();
      if (res.task?.id) {
        onSelectTask?.(res.task.id);
      }
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '指令发送失败', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (readOnly || !activeTask || canceling) return;
    setCanceling(true);
    try {
      await cancelA2ATask(activeTask.id);
      await loadState();
      onTasksUpdated?.();
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : '取消失败', 'err');
    } finally {
      setCanceling(false);
    }
  };

  const renderComposer = (compact = false) => (
    <form
      onSubmit={handleSubmit}
      data-testid="agent-console-composer"
      className={cn(
        'w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-within:border-[var(--accent)] transition-colors duration-150',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <textarea
        ref={textareaRef}
        rows={compact ? 2 : 3}
        disabled={readOnly || submitting}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder="输入任务或问题，按 Enter 发送..."
        aria-label="输入 Agent 指令"
        data-testid="agent-console-input"
        className="w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
      />

      <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]/70 flex items-center justify-between gap-3">
        <select
          aria-label="选择模型与 Harness"
          data-testid="agent-model-select"
          disabled={readOnly || submitting}
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value)}
          className={cn(
            'ui-select h-8 max-w-[260px] rounded-lg border border-transparent hover:border-[var(--border)] bg-[var(--surface-subtle)]/70 pl-2.5 pr-7 text-[12.5px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer transition-colors truncate',
            FOCUS_RING,
          )}
        >
          <option value="auto">
            自动调度 · {leadAgent ? shortAgentName(leadAgent.name) : '总指挥'}
          </option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {shortAgentName(a.name)} · {a.modelHint || a.harness}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={readOnly || submitting || !prompt.trim()}
          aria-label="发送指令"
          data-testid="agent-console-run-btn"
          className={cn(
            'h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 transition-[background-color,opacity,transform] duration-150 cursor-pointer active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed',
            'bg-[var(--accent)] text-white hover:opacity-90',
            FOCUS_RING,
          )}
        >
          <ArrowUp className="size-4" strokeWidth={2.2} />
        </button>
      </div>
    </form>
  );

  // ── Pure Antigravity / Codex Ultra-Minimal Blank Landing ──
  if (!activeTask) {
    return (
      <div
        data-testid="view-agent-console"
        className="min-h-[calc(100dvh-10rem)] flex flex-col items-center justify-center w-full"
      >
        <div className="w-full max-w-[680px] mx-auto space-y-6">
          <h1 className="text-center text-[26px] sm:text-[32px] font-semibold tracking-tight text-[var(--ink)] text-balance">
            今天想让 Agent 完成什么？
          </h1>
          {renderComposer(false)}
        </div>
      </div>
    );
  }

  // ── Clean Single-Column Active Thread View ──
  return (
    <div
      data-testid="view-agent-console"
      className="min-h-[calc(100dvh-9rem)] max-w-[740px] w-full mx-auto flex flex-col justify-between gap-6"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5 min-w-0 text-[12.5px] text-[var(--ink-subtle)] font-mono tabular-nums">
            <StatusIndicator
              status={taskStatusTone(activeTask.state)}
              label={taskStatusLabel(activeTask.state)}
            />
            <span aria-hidden="true">·</span>
            <span className="truncate text-[var(--ink-muted)]">
              {shortAgentName(activeTask.workerAgentName || activeTask.leadAgentName)}
            </span>
            {activeTask.appliedModel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{activeTask.appliedModel}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isRunning && !readOnly && (
              <Button variant="ghost" size="sm" disabled={canceling} onClick={() => void handleCancel()}>
                <Square className="size-3 text-[var(--err)]" />
                停止
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              data-testid="agent-new-thread-btn"
              onClick={() => {
                onSelectTask?.(null);
                window.setTimeout(() => textareaRef.current?.focus(), 40);
              }}
            >
              <Plus className="size-3.5" />
              新对话
            </Button>
          </div>
        </div>

        {/* User Message */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl bg-[var(--surface-active)] border border-[var(--border)] px-4 py-3 text-[14px] leading-relaxed text-[var(--ink)] break-words">
            {activeTask.prompt}
          </div>
        </div>

        {/* Agent Execution Response */}
        <div className="space-y-4 text-[14px] leading-relaxed text-[var(--ink)]" data-testid="agent-thread-response">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
            <span className="font-medium text-[var(--ink-muted)]">
              {shortAgentName(activeTask.workerAgentName || activeTask.leadAgentName)}
            </span>
            {activeTask.worktreeBranch && (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3" />
                {activeTask.worktreeBranch}
              </span>
            )}
            <span>{formatDurationMs(activeTask.durationMs)}</span>
            <span>{formatDateTime(activeTask.createdAt)}</span>
          </div>

          {activeTask.steps && activeTask.steps.length > 0 && (
            <ol className="space-y-1.5 pl-0.5 text-[13px] text-[var(--ink-muted)]">
              {activeTask.steps.map((step, idx) => (
                <li key={`${activeTask.id}-step-${idx}`} className="flex items-baseline gap-2.5">
                  <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="break-words">{step.detail || step.state}</span>
                </li>
              ))}
            </ol>
          )}

          {activeTask.artifact && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 font-mono text-[12.5px] leading-relaxed text-[var(--ink)] whitespace-pre-wrap break-words overflow-x-auto">
              {activeTask.artifact}
            </div>
          )}
        </div>
      </div>

      {/* Follow-up Input */}
      <div className="pt-2">{renderComposer(true)}</div>
    </div>
  );
}

export default AgentsView;
