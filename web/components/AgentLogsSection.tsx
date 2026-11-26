import React from 'react';
import {
  Activity,
  ArrowRight,
  GitBranch,
  Pause,
  Play,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { A2AAgentPeer, A2ACollaborationLog } from '../types';
import { fetchA2ALogs, openA2ALogStream, runDshTeamCollaboration } from '../api';
import { filterCollaborationLogs, getLogEventMeta } from '../lib/swarm-memory-engine';
import { cn, FOCUS_RING } from '../lib/cn';
import { Button, EmptyState, inputBaseClass, Panel, SegmentedFilter } from './ui';

const LOG_CATEGORY_OPTIONS = [
  { value: 'all', label: '全部事件' },
  { value: 'superagent', label: 'Fast/Slow Path' },
  { value: 'context', label: 'Inline/Spill' },
  { value: 'watchdog', label: 'Watchdog' },
  { value: 'swarm', label: '蜂群扇出' },
  { value: 'dsh', label: 'DSH 评审' },
  { value: 'a2a', label: 'A2A 委派' },
  { value: 'session', label: '跨端同步' },
] as const;

function formatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

export function AgentLogsSection({
  agents,
  initialAgentId = 'all',
  readOnly = false,
  onToast,
  onDataMutated,
}: {
  agents: A2AAgentPeer[];
  initialAgentId?: string;
  readOnly?: boolean;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onDataMutated?: () => void;
}) {
  const [selectedAgentId, setSelectedAgentId] = React.useState<string>(initialAgentId || 'all');
  const [eventType, setEventType] = React.useState<string>('all');
  const [level, setLevel] = React.useState<string>('all');
  const [query, setQuery] = React.useState<string>('');
  const [paused, setPaused] = React.useState<boolean>(false);
  const [streamState, setStreamState] = React.useState<'connecting' | 'live' | 'error'>('connecting');
  const [logs, setLogs] = React.useState<A2ACollaborationLog[]>([]);
  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [simulating, setSimulating] = React.useState<boolean>(false);

  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;

  React.useEffect(() => {
    if (initialAgentId && initialAgentId !== selectedAgentId) {
      setSelectedAgentId(initialAgentId);
    }
  }, [initialAgentId]);

  const loadSnapshotLogs = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetchA2ALogs(
        {
          agentId: selectedAgentId,
          eventType,
          level,
          limit: 120,
        },
        signal,
      );
      if (!signal?.aborted) {
        setLogs(res.items || []);
        setSelectedLogId((prev) => prev || res.items?.[0]?.id || null);
      }
    } catch (err) {
      if (!signal?.aborted) {
        onToast?.(`拉取 Agent 协作日志失败：${(err as Error).message}`, 'err');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [selectedAgentId, eventType, level, onToast]);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadSnapshotLogs(controller.signal);

    const closeStream = openA2ALogStream(
      { agentId: selectedAgentId, eventType, level },
      {
        onStateChange: (st) => setStreamState(st),
        onInit: (items) => {
          if (pausedRef.current) return;
          setLogs(items);
          setSelectedLogId((prev) => prev || items[0]?.id || null);
        },
        onLog: (entry) => {
          if (pausedRef.current) return;
          setLogs((prev) => {
            if (prev.some((item) => item.id === entry.id)) return prev;
            return [entry, ...prev].slice(0, 180);
          });
        },
      },
    );

    return () => {
      controller.abort();
      closeStream();
    };
  }, [selectedAgentId, eventType, level, loadSnapshotLogs]);

  const visibleLogs = React.useMemo(
    () =>
      filterCollaborationLogs(logs, {
        agentId: selectedAgentId,
        eventType,
        level,
        q: query,
      }),
    [logs, selectedAgentId, eventType, level, query],
  );

  const activeLog = React.useMemo(
    () => visibleLogs.find((item) => item.id === selectedLogId) || visibleLogs[0] || null,
    [visibleLogs, selectedLogId],
  );

  const selectedAgent = React.useMemo(
    () => agents.find((a) => a.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  );

  const handleTriggerLiveDrill = async () => {
    if (readOnly || simulating) return;
    setSimulating(true);
    try {
      const targetHint = selectedAgent ? `（聚焦 ${selectedAgent.name}）` : '';
      const res = await runDshTeamCollaboration({
        prompt: `实时协作链路演练${targetHint}：检查 auth 安全边界、执行隔离 Worktree 蜂群回归并触发 DSH 团队投票`,
        channel: 'github',
        consensusPolicy: 'weighted',
        enableAutoSpill: true,
      });
      onToast?.(
        `已触发一次 DSH 团队协同演练：工单 ${res.ticket.id}${res.spilledNode ? ` · Spill ${res.spilledNode.spillId}` : ''}，协作日志已实时推送`,
        'ok',
      );
      onDataMutated?.();
    } catch (err) {
      onToast?.(`触发协同演练失败：${(err as Error).message}`, 'err');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title="实时 Agent 协作日志流 (SSE)"
        description="按指定 Agent 节点实时订阅薄 Router、Fast/Slow Path 触发直滤、Inline/Spill Chain of Recall、Watchdog 巡检、Swarm 蜂群扇出与 DSH 评审裁决事件。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-mono whitespace-nowrap',
                paused
                  ? 'text-[var(--warn)]'
                  : streamState === 'live'
                    ? 'text-[var(--ok)]'
                    : streamState === 'error'
                      ? 'text-[var(--err)]'
                      : 'text-[var(--ink-subtle)]',
              )}
              data-testid="agent-logs-stream-status"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  paused
                    ? 'bg-[var(--warn-dot)]'
                    : streamState === 'live'
                      ? 'bg-[var(--ok-dot)] animate-pulse'
                      : streamState === 'error'
                        ? 'bg-[var(--err-dot)]'
                        : 'bg-[var(--muted-dot)]',
                )}
              />
              {paused
                ? '已暂停追踪'
                : streamState === 'live'
                  ? 'SSE 实时流已连接'
                  : streamState === 'error'
                    ? '流重连中'
                    : '正在握手…'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPaused((p) => !p)}
              data-testid="agent-logs-pause-btn"
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              {paused ? '恢复实时流' : '暂停'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void loadSnapshotLogs()}
              data-testid="agent-logs-refresh-btn"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              刷新
            </Button>
            {!readOnly && (
              <Button
                variant="primary"
                size="sm"
                disabled={simulating}
                onClick={() => void handleTriggerLiveDrill()}
                data-testid="agent-logs-drill-btn"
              >
                <Sparkles className="size-3.5" />
                {simulating ? '协作推送中…' : '触发实时协同事件'}
              </Button>
            )}
          </div>
        }
      >
        {/* Filter Bar */}
        <div className="mb-4 flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,260px)_minmax(0,140px)_minmax(0,1fr)]">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                按 Agent 节点过滤
              </span>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
                data-testid="agent-logs-agent-select"
                aria-label="选择要查看实时日志的 Agent 节点"
              >
                <option value="all">全部 Agent 节点（全协作链路）</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.role === 'lead' ? '★ 主控 · ' : '• '}
                    {a.name} ({a.nodeName || a.nodeId})
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                日志级别
              </span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className={cn('ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer', inputBaseClass)}
                data-testid="agent-logs-level-select"
                aria-label="过滤日志级别"
              >
                <option value="all">全部级别</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]">
                关键词 / ContextId / Spill 句柄检索
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-subtle)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索摘要、ContextId、Worktree 分支或 Spill ID…"
                  className={cn(inputBaseClass, 'w-full h-8 pl-8 pr-2.5 text-xs')}
                  data-testid="agent-logs-search-input"
                />
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="max-w-full overflow-x-auto">
              <SegmentedFilter
                value={eventType}
                onChange={setEventType}
                options={LOG_CATEGORY_OPTIONS}
                ariaLabel="按协作事件分类过滤"
              />
            </div>
            <span className="text-xs font-mono tabular-nums text-[var(--ink-subtle)]">
              当前匹配 {visibleLogs.length} 条 · 总缓冲 {logs.length} 条
              {selectedAgent ? ` · 节点 ${selectedAgent.nodeId}` : ''}
            </span>
          </div>
        </div>

        {/* Master-Detail Log Stream & Collaboration Drill-Down */}
        {visibleLogs.length === 0 ? (
          <EmptyState
            title="当前过滤条件下暂无协作日志"
            message="尝试切换至「全部 Agent 节点」，或点击右上角「触发实时协同事件」观察主控与子 Agent 的实时 SSE 交互。"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
            {/* Left: Real-Time Stream List */}
            <div
              className="max-h-[540px] min-w-0 overflow-y-auto divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-md bg-[var(--surface)]"
              data-testid="agent-logs-list"
            >
              {visibleLogs.map((entry) => {
                const meta = getLogEventMeta(entry.eventType);
                const isSelected = activeLog?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedLogId(entry.id)}
                    data-testid={`agent-log-row-${entry.id}`}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 transition-colors block cursor-pointer',
                      FOCUS_RING,
                      isSelected
                        ? 'bg-[var(--surface-active)]'
                        : 'hover:bg-[var(--surface-hover)]',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono tabular-nums text-[var(--ink-subtle)] shrink-0">
                          {formatLogTime(entry.ts)}
                        </span>
                        <span
                          className={cn(
                            'font-mono font-semibold shrink-0',
                            entry.level === 'error'
                              ? 'text-[var(--err)]'
                              : entry.level === 'warn'
                                ? 'text-[var(--warn)]'
                                : meta.toneClass,
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="truncate text-[var(--ink-muted)]">
                          {entry.sourceAgentName.replace(/\s*\(.*?\)\s*/g, '')}
                          <ArrowRight className="mx-1 inline size-3 text-[var(--ink-subtle)]" />
                          {entry.targetAgentName.replace(/\s*\(.*?\)\s*/g, '')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums text-[var(--ink-subtle)] shrink-0">
                        {entry.model && <span className="truncate max-w-[130px]">{entry.model}</span>}
                        {entry.latencyMs != null && <span>{entry.latencyMs}ms</span>}
                      </div>
                    </div>
                    <p className="mt-1 text-xs font-medium text-[var(--ink)] line-clamp-2">
                      {entry.summary}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Right: Collaboration Event Drill-Down Inspector */}
            <div
              className="min-w-0 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 flex flex-col justify-between gap-4"
              data-testid="agent-log-inspector"
            >
              {activeLog ? (
                <div className="space-y-3.5 min-w-0">
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <Activity className="size-3.5 text-[var(--accent)] shrink-0" />
                        <span className={cn('font-mono font-semibold', getLogEventMeta(activeLog.eventType).toneClass)}>
                          {activeLog.eventType}
                        </span>
                        <span className="font-mono text-[11px] uppercase text-[var(--ink-subtle)]">
                          · {activeLog.level}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-semibold text-[var(--ink)] leading-snug">
                        {activeLog.summary}
                      </h4>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-[var(--ink-subtle)] shrink-0">
                      {formatLogTime(activeLog.ts)}
                    </span>
                  </div>

                  {/* Lead <-> Sub-Agent Handoff Path */}
                  <div className="space-y-1 text-xs">
                    <div className="text-[11px] font-medium text-[var(--ink-subtle)]">主从协作链路</div>
                    <div className="flex flex-wrap items-center gap-1.5 font-medium text-[var(--ink)]">
                      <span className="truncate">{activeLog.sourceAgentName}</span>
                      <ArrowRight className="size-3.5 text-[var(--accent)] shrink-0" />
                      <span className="truncate">{activeLog.targetAgentName}</span>
                    </div>
                  </div>

                  {/* Structured Telemetry Metadata Grid */}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-y border-[var(--border-subtle)] py-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-[11px] text-[var(--ink-subtle)]">执行模型 / 思考强度</dt>
                      <dd className="mt-0.5 font-mono truncate text-[var(--ink)]">
                        {activeLog.model || '—'}
                        {activeLog.effort ? ` (${activeLog.effort})` : ''}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] text-[var(--ink-subtle)]">协作耗时</dt>
                      <dd className="mt-0.5 font-mono tabular-nums text-[var(--ink)]">
                        {activeLog.latencyMs != null ? `${activeLog.latencyMs} ms` : '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] text-[var(--ink-subtle)]">A2A Context / Task</dt>
                      <dd className="mt-0.5 font-mono truncate text-[var(--ink)]">
                        {activeLog.contextId || activeLog.taskId || '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] text-[var(--ink-subtle)]">Worktree 分支</dt>
                      <dd className="mt-0.5 flex items-center gap-1 font-mono truncate text-[var(--ink)]">
                        {activeLog.worktreeBranch ? (
                          <>
                            <GitBranch className="size-3 shrink-0 text-[var(--ink-subtle)]" />
                            <span className="truncate">{activeLog.worktreeBranch}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                    {activeLog.spillRefId && (
                      <div className="col-span-2 min-w-0">
                        <dt className="text-[11px] text-[var(--ink-subtle)]">关联 Spill / Chain of Recall 句柄</dt>
                        <dd className="mt-0.5 font-mono text-[var(--warn)] truncate">
                          {activeLog.spillRefId}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Detailed Payload */}
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-[var(--ink-subtle)] mb-1">
                      事件协作详情与上下文摘要
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--ink-muted)] whitespace-pre-wrap break-words font-mono bg-[var(--surface-elevated)] rounded border border-[var(--border-subtle)] p-2.5">
                      {activeLog.detail || activeLog.summary}
                    </p>
                  </div>

                  {/* Quick Scope Jump */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {activeLog.targetAgentId && activeLog.targetAgentId !== selectedAgentId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedAgentId(activeLog.targetAgentId)}
                      >
                        聚焦目标 Agent 日志
                      </Button>
                    )}
                    {selectedAgentId !== 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAgentId('all')}
                      >
                        返回全链路日志
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
