import React from 'react';
import {
  BookmarkPlus,
  Check,
  Copy,
  Download,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import type {
  LogEntry,
  LogFilterState,
  LogQueryStats,
  LogSourceKind,
  LogSourceStats,
  MetaResponse,
  ServiceItem,
  SnapshotResponse,
  ToastHandler,
} from '../types';
import { buildLogStreamUrl, copyToClipboard, fetchLogs } from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { computeVisibleRange } from '../lib/virtual-list';
import {
  buildLogHistogram,
  formatDirectReadSummary,
  formatLogBytes,
  FULL_LOG_SOURCES,
  LOG_LEVEL_OPTIONS,
  LOG_SINCE_OPTIONS,
  resolveServiceLogSources,
  sourceKindLabel,
  toggleUnifiedTarget,
} from '../lib/logs';
import { countLogLevels, formatClock } from '../utils/format';
import {
  Button,
  ClearInputButton,
  ErrorState,
  IconSwap,
  inputBaseClass,
  SegmentedFilter,
  ToggleSwitch,
} from './ui';

const VIRTUAL_THRESHOLD = 50;
const LOG_ROW_HEIGHT = 26;
const FULL_VIEWPORT_HEIGHT = 460;
const PRESETS_STORAGE_KEY = 'ops-console:log-presets:v2';

interface SavedLogPreset extends LogFilterState {
  id: string;
  name: string;
}

function loadSavedPresets(): SavedLogPreset[] {
  try {
    const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function persistSavedPresets(presets: SavedLogPreset[]) {
  try {
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.slice(0, 12)));
  } catch {
    // Ignore quota errors
  }
}

export interface LogStreamPanelProps {
  mode: 'full' | 'compact';
  snapshot: SnapshotResponse | null;
  meta: MetaResponse | null;
  service?: ServiceItem | null;
  initialFilter?: Partial<LogFilterState>;
  requestNonce?: number;
  onFilterChange?: (state: LogFilterState) => void;
  onCountsChange?: (counts: { total: number; error: number; warn: number; info: number }) => void;
  onToast: ToastHandler;
}

export function LogStreamPanel({
  mode,
  snapshot,
  meta,
  service = null,
  initialFilter,
  requestNonce = 0,
  onFilterChange,
  onCountsChange,
  onToast,
}: LogStreamPanelProps) {
  const isCompact = mode === 'compact';

  const serviceSourceOptions = React.useMemo(
    () => (service ? resolveServiceLogSources(service, meta?.logSources) : []),
    [service, meta?.logSources],
  );

  const defaultSource: LogSourceKind = initialFilter?.source
    || (service ? 'service' : 'unified');
  const defaultTarget = initialFilter?.target
    || (service ? (service.unit || service.id) : 'all');
  const defaultTargets = initialFilter?.targets && initialFilter.targets.length > 0
    ? initialFilter.targets
    : (service ? [service.id] : ['all']);

  const [source, setSource] = React.useState<LogSourceKind>(defaultSource);
  const [target, setTarget] = React.useState<string>(defaultTarget);
  const [targets, setTargets] = React.useState<string[]>(defaultTargets);
  const [since, setSince] = React.useState<string>(initialFilter?.since || '1h');
  const [level, setLevel] = React.useState<string>(initialFilter?.level || 'all');
  const [query, setQuery] = React.useState<string>(initialFilter?.query || '');
  const [regex, setRegex] = React.useState<boolean>(Boolean(initialFilter?.regex));
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [correlationMode, setCorrelationMode] = React.useState(false);

  const [entries, setEntries] = React.useState<LogEntry[]>([]);
  const [stats, setStats] = React.useState<LogQueryStats | null>(null);
  const [sourceStats, setSourceStats] = React.useState<LogSourceStats[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [queryError, setQueryError] = React.useState('');
  const [streaming, setStreaming] = React.useState(false);
  const [streamPaused, setStreamPaused] = React.useState(false);
  const [pausedBufferCount, setPausedBufferCount] = React.useState(0);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(FULL_VIEWPORT_HEIGHT);

  const [presets, setPresets] = React.useState<SavedLogPreset[]>(() => (isCompact ? [] : loadSavedPresets()));
  const [presetName, setPresetName] = React.useState('');
  const [copiedRowKey, setCopiedRowKey] = React.useState('');

  const esRef = React.useRef<EventSource | null>(null);
  const queryAbortRef = React.useRef<AbortController | null>(null);
  const scrollRafRef = React.useRef<number | null>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const streamPausedRef = React.useRef(false);
  const pausedQueueRef = React.useRef<LogEntry[]>([]);

  React.useEffect(() => {
    streamPausedRef.current = streamPaused;
  }, [streamPaused]);

  React.useEffect(() => {
    if (!initialFilter) return;
    if (initialFilter.source) setSource(initialFilter.source);
    if (initialFilter.target !== undefined) setTarget(initialFilter.target);
    if (initialFilter.targets && initialFilter.targets.length > 0) setTargets(initialFilter.targets);
    if (initialFilter.since) setSince(initialFilter.since);
    if (initialFilter.level) setLevel(initialFilter.level);
    if (initialFilter.query !== undefined) setQuery(initialFilter.query);
    if (initialFilter.regex !== undefined) setRegex(Boolean(initialFilter.regex));
  }, [
    initialFilter?.source,
    initialFilter?.target,
    initialFilter?.since,
    initialFilter?.level,
    initialFilter?.query,
    initialFilter?.regex,
    requestNonce,
    service?.id,
  ]);

  React.useEffect(() => {
    onFilterChange?.({
      source,
      target,
      targets,
      since,
      level,
      query,
      regex,
    });
  }, [source, target, targets, since, level, query, regex, onFilterChange]);

  React.useEffect(() => {
    if (!isCompact || !viewportRef.current || typeof ResizeObserver === 'undefined') return;
    const element = viewportRef.current;
    const observer = new ResizeObserver((items) => {
      const nextHeight = Math.round(items[0]?.contentRect?.height || FULL_VIEWPORT_HEIGHT);
      if (nextHeight >= 140) {
        setViewportHeight(nextHeight);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [isCompact]);

  const availableServices = React.useMemo(() => {
    const fromMeta = meta?.logSources?.services || meta?.logSources?.units || [];
    if (fromMeta.length > 0) return fromMeta;
    return (snapshot?.services?.items || []).map((svc) => ({
      id: svc.id,
      name: svc.name || svc.id,
      unit: svc.unit || svc.id,
      scope: svc.scope,
      layer: svc.layer,
      hasLogFile: svc.hasLogFile,
      logFileId: svc.logFileId,
    }));
  }, [meta?.logSources, snapshot?.services?.items]);

  const availableFiles = React.useMemo(
    () => meta?.logSources?.files || [],
    [meta?.logSources?.files],
  );

  const targetOptions = React.useMemo(() => {
    if (source === 'file') {
      return availableFiles.map((fileItem) => ({
        value: fileItem.id,
        label: fileItem.name || fileItem.id,
      }));
    }
    if (source === 'self') {
      return [{ value: 'self', label: 'Ops Console 结构化日志' }];
    }
    if (source === 'audit') {
      return [{ value: 'audit', label: '操作审计轨迹 (audit.jsonl)' }];
    }
    if (source === 'unified') {
      return [{ value: 'all', label: '全部受管服务与原生日志源' }];
    }
    return [
      { value: 'all', label: '全部受管服务 (all)' },
      ...availableServices.map((svc) => ({
        value: svc.unit || svc.id,
        label: svc.name ? `${svc.name} (${svc.unit || svc.id})` : svc.unit || svc.id,
      })),
    ];
  }, [source, availableFiles, availableServices]);

  React.useEffect(() => {
    if (isCompact || source === 'unified') return;
    if (!targetOptions.length) return;
    if (!target || !targetOptions.some((opt) => opt.value === target)) {
      setTarget(targetOptions[0].value);
    }
  }, [isCompact, source, targetOptions, target]);

  const stopStream = React.useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    pausedQueueRef.current = [];
    setPausedBufferCount(0);
    setStreamPaused(false);
    setStreaming(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (queryAbortRef.current) {
        queryAbortRef.current.abort();
        queryAbortRef.current = null;
      }
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  const effectiveTarget = source === 'unified'
    ? (targets.length > 0 ? targets.join(',') : 'all')
    : target;

  const runQuery = React.useCallback(async () => {
    if (source !== 'unified' && source !== 'self' && source !== 'audit' && !target) return;
    stopStream();
    queryAbortRef.current?.abort();
    const controller = new AbortController();
    queryAbortRef.current = controller;
    setLoading(true);
    setQueryError('');
    try {
      const res = await fetchLogs(
        {
          source,
          target: effectiveTarget,
          targets: source === 'unified' ? targets : undefined,
          since,
          level,
          q: query,
          regex,
          lines: isCompact ? 180 : 240,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setEntries(res.entries || res.items || res.lines || []);
        setStats(res.stats || null);
        setSourceStats(res.sources || []);
      }
    } catch (err) {
      if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
      const msg = (err as Error).message || '日志接口异常';
      setQueryError(msg);
      onToast(`日志查询失败：${msg}`, 'err');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [source, target, effectiveTarget, targets, since, level, query, regex, isCompact, stopStream, onToast]);

  const targetsKey = targets.join(',');
  React.useEffect(() => {
    if (source === 'unified' || source === 'self' || source === 'audit' || target) {
      void runQuery();
    }
  }, [source, target, targetsKey, since, level]);

  const handleViewportScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const nextTop = event.currentTarget.scrollTop;
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      setScrollTop(nextTop);
    });
  }, []);

  React.useEffect(() => {
    if (autoScroll && !streamPaused && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      setScrollTop(viewportRef.current.scrollTop);
    }
  }, [entries, autoScroll, streamPaused]);

  const toggleStream = () => {
    if (streaming) {
      stopStream();
      return;
    }
    if (source === 'audit') {
      onToast('审计日志暂仅支持查询刷新，不提供实时 SSE 追踪', 'info');
      return;
    }
    if (source !== 'unified' && source !== 'self' && !target) return;
    const url = buildLogStreamUrl({
      source,
      target: effectiveTarget,
      targets: source === 'unified' ? targets : undefined,
      level,
      q: query,
      regex,
    });
    const eventSource = new EventSource(url);
    esRef.current = eventSource;
    setStreaming(true);
    setStreamPaused(false);
    pausedQueueRef.current = [];
    setPausedBufferCount(0);

    const onLine = (ev: MessageEvent) => {
      let parsed: LogEntry;
      try {
        parsed = JSON.parse(ev.data) as LogEntry;
      } catch {
        parsed = { message: String(ev.data), level: 'info' };
      }
      if (streamPausedRef.current) {
        pausedQueueRef.current = [...pausedQueueRef.current.slice(-200), parsed];
        setPausedBufferCount(pausedQueueRef.current.length);
        return;
      }
      setEntries((prev) => [...prev.slice(-450), parsed]);
    };
    eventSource.addEventListener('log', onLine);
    eventSource.onmessage = onLine;
    eventSource.onerror = () => {
      stopStream();
      onToast('实时日志流已断开', 'info');
    };
  };

  const handleTogglePauseStream = () => {
    if (!streaming) return;
    if (streamPaused) {
      const buffered = pausedQueueRef.current;
      pausedQueueRef.current = [];
      setPausedBufferCount(0);
      setStreamPaused(false);
      if (buffered.length > 0) {
        setEntries((prev) => [...prev, ...buffered].slice(-450));
      }
    } else {
      setStreamPaused(true);
    }
  };

  const handleSavePreset = () => {
    const label = presetName.trim() || `${source === 'unified' ? '统一日志' : target || source} · ${level.toUpperCase()}`;
    const next: SavedLogPreset = {
      id: `preset-${Date.now()}`,
      name: label,
      source,
      target,
      targets,
      since,
      level,
      query,
      regex,
    };
    const updated = [next, ...presets].slice(0, 8);
    setPresets(updated);
    persistSavedPresets(updated);
    setPresetName('');
    onToast(`已保存常用筛选视图「${label}」`, 'ok');
  };

  const handleApplyPreset = (preset: SavedLogPreset) => {
    stopStream();
    setSource(preset.source);
    setTarget(preset.target);
    setTargets(preset.targets && preset.targets.length > 0 ? preset.targets : ['all']);
    setSince(preset.since);
    setLevel(preset.level);
    setQuery(preset.query);
    setRegex(preset.regex);
    onToast(`已应用筛选视图「${preset.name}」`, 'info');
  };

  const handleDeletePreset = (id: string) => {
    const removedIndex = presets.findIndex((item) => item.id === id);
    if (removedIndex < 0) return;
    const removed = presets[removedIndex];
    const updated = presets.filter((item) => item.id !== id);
    setPresets(updated);
    persistSavedPresets(updated);
    onToast(`已删除筛选视图「${removed.name}」`, 'info', {
      action: {
        label: '撤销',
        onClick: () => {
          setPresets((current) => {
            if (current.some((item) => item.id === removed.id)) return current;
            const restored = [...current];
            restored.splice(Math.min(removedIndex, restored.length), 0, removed);
            const bounded = restored.slice(0, 8);
            persistSavedPresets(bounded);
            return bounded;
          });
        },
      },
    });
  };

  const exportJsonl = () => {
    const content = entries.map((entry) => JSON.stringify(entry)).join('\n');
    const blob = new Blob([content], { type: 'application/x-ndjson;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ops-logs-${service?.id || target || source}.jsonl`;
    anchor.click();
    URL.revokeObjectURL(url);
    onToast(`已导出 ${entries.length} 条日志`, 'ok');
  };

  const counts = React.useMemo(() => countLogLevels(entries), [entries]);
  React.useEffect(() => {
    onCountsChange?.(counts);
  }, [counts, onCountsChange]);

  const histogram = React.useMemo(
    () => (isCompact ? [] : buildLogHistogram(entries, 16)),
    [isCompact, entries],
  );
  const maxBucketTotal = React.useMemo(
    () => Math.max(1, ...histogram.map((bucket) => bucket.total)),
    [histogram],
  );

  const handleCopyLogRow = async (rowKey: string, entry: LogEntry) => {
    const line = `${entry.ts || entry.timestamp || ''} [${String(entry.level || 'info').toUpperCase()}] ${entry.unit ? `${entry.unit}: ` : ''}${entry.message || entry.raw || ''}`.trim();
    const ok = await copyToClipboard(line);
    if (ok) {
      setCopiedRowKey(rowKey);
      onToast('已复制该条结构化日志', 'ok');
      window.setTimeout(() => setCopiedRowKey((cur) => (cur === rowKey ? '' : cur)), 1400);
    }
  };

  const handleToggleLevelFacet = (clickedLevel: string) => {
    const normalized = clickedLevel.toLowerCase();
    const mapped = normalized.includes('err') || normalized.includes('crit') || normalized.includes('fatal')
      ? 'error'
      : normalized.includes('warn')
        ? 'warn'
        : 'info';
    setLevel((prev) => (prev === mapped ? 'all' : mapped));
  };

  const handleFilterUnitFacet = (entry: LogEntry) => {
    if (isCompact) return;
    const unit = entry.unit || entry.serviceId;
    if (!unit) return;
    if (source === 'unified') {
      const token = entry.serviceId || entry.unit || '';
      if (token) setTargets([token]);
      return;
    }
    if (source === 'service') {
      if (targetOptions.some((opt) => opt.value === unit)) {
        setTarget(unit);
      } else {
        setQuery(unit);
      }
    }
  };

  const showUnitCol = source === 'unified' || (source === 'service' && target === 'all');
  const activeViewportHeight = isCompact ? viewportHeight : FULL_VIEWPORT_HEIGHT;
  const directReadText = formatDirectReadSummary(stats);

  return (
    <div
      className={cn(
        'flex flex-col min-h-0',
        isCompact ? 'h-full' : '',
      )}
      data-testid={isCompact ? 'log-stream-panel-compact' : 'log-stream-panel-full'}
    >
      <div
        className={cn(
          'border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5 shrink-0',
          isCompact ? 'px-4 py-2.5 bg-[var(--surface-subtle)]/40' : 'px-5 sm:px-6 py-4',
        )}
      >
        {isCompact && service ? (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="服务日志源切换">
            {serviceSourceOptions.map((opt) => {
              const active = source === opt.source && (opt.source === 'unified' || target === opt.target);
              return (
                <button
                  key={`${opt.source}:${opt.target}`}
                  type="button"
                  onClick={() => {
                    stopStream();
                    setSource(opt.source);
                    setTarget(opt.target);
                    setTargets(opt.targets);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium border transition-colors duration-150 cursor-pointer',
                    FOCUS_RING,
                    active
                      ? 'bg-[var(--surface-active)] border-[var(--border-strong)] text-[var(--ink)]'
                      : 'bg-transparent border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                  )}
                >
                  <span>{opt.label}</span>
                  <span className="font-mono text-[10.5px] text-[var(--ink-subtle)]">{opt.kindBadge}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <SegmentedFilter
            value={source}
            onChange={(next) => {
              stopStream();
              setSource(next);
              if (next === 'unified' && targets.length === 0) {
                setTargets(['all']);
              }
            }}
            options={FULL_LOG_SOURCES}
            ariaLabel="日志源切换"
          />
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <ToggleSwitch checked={regex} onCheckedChange={setRegex} label="正则" />
          {!isCompact && (
            <ToggleSwitch checked={correlationMode} onCheckedChange={setCorrelationMode} label="异常高亮" />
          )}
          <ToggleSwitch checked={autoScroll} onCheckedChange={setAutoScroll} label="跟随滚底" />
          <Button
            variant="secondary"
            size="sm"
            onClick={exportJsonl}
            disabled={entries.length === 0}
          >
            <Download className="size-3.5" strokeWidth={1.75} />
            导出
          </Button>
        </div>
      </div>

      <div className={cn('space-y-3 shrink-0', isCompact ? 'px-4 py-3 border-b border-[var(--border-subtle)]' : 'p-5 sm:p-6 pb-4')}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runQuery();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          {!isCompact && source !== 'unified' && (
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              aria-label="日志目标单元"
              className={cn('ui-select h-9 min-w-[200px] pl-3 cursor-pointer', inputBaseClass)}
            >
              {targetOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={since}
            onChange={(event) => setSince(event.target.value)}
            aria-label="时间范围"
            className={cn('ui-select h-9 pl-2.5 cursor-pointer', inputBaseClass)}
          >
            {LOG_SINCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            aria-label="日志级别"
            className={cn('ui-select h-9 pl-2.5 cursor-pointer', inputBaseClass)}
          >
            {LOG_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[180px]">
            <Search
              className="size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={regex ? '输入正则表达式过滤...' : '按关键词 / 服务 / 错误码过滤...'}
              aria-label="日志关键词搜索"
              className={cn('h-9 w-full pl-9 pr-8', inputBaseClass)}
            />
            <ClearInputButton
              visible={Boolean(query)}
              onClear={() => setQuery('')}
              ariaLabel="清空日志搜索"
              placement="overlay"
            />
          </div>

          <Button type="submit" variant="secondary" size="sm" disabled={loading}>
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} strokeWidth={1.75} />
            {loading ? '查询中' : '查询'}
          </Button>

          {source !== 'audit' && (
            <Button
              type="button"
              variant={streaming ? 'danger' : 'primary'}
              size="sm"
              onClick={toggleStream}
              data-testid="log-stream-toggle"
            >
              <IconSwap iconKey={streaming ? 'stop' : 'live'}>
                {streaming ? (
                  <Square className="size-3.5" strokeWidth={1.75} />
                ) : (
                  <Radio className="size-3.5" strokeWidth={1.75} />
                )}
              </IconSwap>
              <span>{streaming ? '停止追踪' : '实时追踪'}</span>
            </Button>
          )}

          {streaming && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleTogglePauseStream}
              data-testid="log-stream-pause"
            >
              <IconSwap iconKey={streamPaused ? 'resume' : 'pause'}>
                {streamPaused ? (
                  <Play className="size-3.5" strokeWidth={1.75} />
                ) : (
                  <Pause className="size-3.5" strokeWidth={1.75} />
                )}
              </IconSwap>
              <span className="tabular-nums">
                {streamPaused
                  ? `恢复${pausedBufferCount > 0 ? ` (+${pausedBufferCount})` : ''}`
                  : '暂停'}
              </span>
            </Button>
          )}
        </form>

        {!isCompact && source === 'unified' && (
          <div
            className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)]"
            role="group"
            aria-label="大一统多服务筛选"
            data-testid="unified-service-chips"
          >
            <span className="text-[11.5px] font-medium text-[var(--ink-subtle)] mr-1 select-none">
              直读范围
            </span>
            <button
              type="button"
              onClick={() => setTargets(['all'])}
              className={cn(
                'ui-press px-2.5 py-1 rounded-md text-[12px] font-medium border cursor-pointer',
                FOCUS_RING,
                targets.includes('all')
                  ? 'bg-[var(--surface-active)] border-[var(--border-strong)] text-[var(--ink)]'
                  : 'bg-transparent border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
              )}
            >
              全部服务 ({availableServices.length})
            </button>
            {availableServices.map((svc) => {
              const token = svc.id;
              const selected = !targets.includes('all') && (targets.includes(token) || targets.includes(svc.unit));
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setTargets((prev) => toggleUnifiedTarget(prev, token))}
                  title={`${svc.name || svc.id} (${svc.unit})${svc.hasLogFile ? ' · 含原生日志文件' : ''}`}
                  className={cn(
                    'ui-press inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] border cursor-pointer',
                    FOCUS_RING,
                    selected
                      ? 'bg-[var(--accent-subtle)] border-[var(--accent)]/40 text-[var(--ink)] font-medium'
                      : 'bg-transparent border-[var(--border-subtle)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                  )}
                >
                  <span>{svc.name || svc.id}</span>
                  {svc.hasLogFile && (
                    <span className="font-mono text-[10px] text-[var(--ink-subtle)]">+file</span>
                  )}
                </button>
              );
            })}
            {availableFiles
              .filter((fileItem) => !fileItem.serviceId)
              .map((fileItem) => {
                const selected = !targets.includes('all') && targets.includes(fileItem.id);
                return (
                  <button
                    key={fileItem.id}
                    type="button"
                    onClick={() => setTargets((prev) => toggleUnifiedTarget(prev, fileItem.id))}
                    className={cn(
                      'ui-press inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] border cursor-pointer',
                      FOCUS_RING,
                      selected
                        ? 'bg-[var(--accent-subtle)] border-[var(--accent)]/40 text-[var(--ink)] font-medium'
                        : 'bg-transparent border-[var(--border-subtle)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                    )}
                  >
                    <span>{fileItem.name || fileItem.id}</span>
                    <span className="font-mono text-[10px] text-[var(--ink-subtle)]">file</span>
                  </button>
                );
              })}
            {(['self', 'audit'] as const).map((builtinId) => {
              const selected = !targets.includes('all') && targets.includes(builtinId);
              return (
                <button
                  key={builtinId}
                  type="button"
                  onClick={() => setTargets((prev) => toggleUnifiedTarget(prev, builtinId))}
                  className={cn(
                    'ui-press px-2.5 py-1 rounded-md text-[12px] border cursor-pointer',
                    FOCUS_RING,
                    selected
                      ? 'bg-[var(--accent-subtle)] border-[var(--accent)]/40 text-[var(--ink)] font-medium'
                      : 'bg-transparent border-[var(--border-subtle)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                  )}
                >
                  {builtinId === 'self' ? '控制台日志' : '审计日志'}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] font-mono text-[var(--ink-subtle)] tabular-nums">
          <div className="flex flex-wrap items-center gap-3">
            <span>共 {counts.total} 条</span>
            <span className={counts.error > 0 ? 'text-[var(--err)] font-medium' : ''}>
              ERR {counts.error}
            </span>
            <span className={counts.warn > 0 ? 'text-[var(--warn)] font-medium' : ''}>
              WARN {counts.warn}
            </span>
            <span>INFO {counts.info}</span>
            {streaming && (
              <span className="inline-flex items-center gap-1 text-[var(--ok)]">
                <span className="size-1.5 rounded-full bg-[var(--ok-dot)] animate-pulse" />
                {streamPaused ? 'SSE 已暂停' : 'SSE 实时流'}
              </span>
            )}
          </div>
          {directReadText && (
            <span
              className={cn(
                'truncate',
                stats && stats.truncatedSources > 0 && 'text-[var(--warn)]',
              )}
              title={directReadText}
              data-testid="log-direct-read-stats"
            >
              {directReadText}
            </span>
          )}
        </div>

        {!isCompact && source === 'unified' && sourceStats.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[var(--ink-subtle)]">
            {sourceStats.slice(0, 12).map((src) => (
              <span
                key={`${src.sourceKind}:${src.id}`}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/60',
                  src.truncated && 'border-[var(--warn)]/40 text-[var(--warn)]',
                )}
                title={
                  src.warning
                    ? `${src.name}: ${src.warning}`
                    : `${src.name} (${src.sourceKind}) · ${src.count} 条 · ${formatLogBytes(src.readBytes)} / ${src.elapsedMs}ms`
                }
              >
                <span className="text-[var(--ink-muted)] truncate max-w-[120px]">{src.name}</span>
                <span>{sourceKindLabel(src.sourceKind)}</span>
                <span>{src.count}</span>
                {src.truncated && <span>尾读截断</span>}
              </span>
            ))}
          </div>
        )}

        {!isCompact && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-[12px] font-medium text-[var(--ink-subtle)] shrink-0">
                常用视图
              </span>
              {presets.length === 0 ? (
                <span className="text-[12px] text-[var(--ink-subtle)]">
                  可将当前过滤条件存为快捷视图
                </span>
              ) : (
                presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] overflow-hidden text-[12px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={cn(
                        'ui-press px-2.5 py-1 text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer',
                        FOCUS_RING,
                      )}
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      aria-label={`删除视图 ${preset.name}`}
                      className="ui-press-icon px-1.5 py-1 text-[var(--ink-subtle)] hover:text-[var(--err)] cursor-pointer border-l border-[var(--border-subtle)]"
                    >
                      <Trash2 className="size-3" strokeWidth={1.75} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="text"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="视图名称（可选）"
                aria-label="保存筛选视图名称"
                data-testid="log-preset-name"
                className={cn('h-8 w-36 px-2.5 sm:text-[12px]', inputBaseClass)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSavePreset}
                data-testid="save-log-preset"
              >
                <BookmarkPlus className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                保存当前视图
              </Button>
            </div>
          </div>
        )}

        {!isCompact && histogram.length > 0 && (
          <div
            className="rounded-lg bg-[var(--surface-subtle)]/70 px-3.5 py-2.5 space-y-1.5"
            aria-label="日志时段频次直方图"
            data-testid="log-volume-histogram"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--ink-subtle)] tabular-nums select-none">
              <span>时段日志分布（点击下方日志级别或服务单元可快速过滤）</span>
              <span>
                {histogram[0]?.label} — {histogram[histogram.length - 1]?.label}
              </span>
            </div>
            <div className="grid grid-cols-16 items-end gap-1 h-8">
              {histogram.map((bucket, idx) => {
                const totalH = bucket.total > 0 ? Math.max(12, Math.round((bucket.total / maxBucketTotal) * 100)) : 0;
                const errPct = bucket.total > 0 ? Math.round((bucket.error / bucket.total) * 100) : 0;
                const warnPct = bucket.total > 0 ? Math.round((bucket.warn / bucket.total) * 100) : 0;
                const infoPct = Math.max(0, 100 - errPct - warnPct);
                return (
                  <div
                    key={`${bucket.label}-${idx}`}
                    className="h-full flex items-end"
                    title={`${bucket.label} · 共 ${bucket.total} 条（错误 ${bucket.error} / 警告 ${bucket.warn} / 信息 ${bucket.info}）`}
                  >
                    {bucket.total > 0 ? (
                      <div
                        className="w-full rounded-t-[2px] overflow-hidden flex flex-col justify-end"
                        style={{ height: `${totalH}%` }}
                      >
                        {errPct > 0 && <div className="w-full bg-rose-500/85" style={{ height: `${errPct}%` }} />}
                        {warnPct > 0 && <div className="w-full bg-amber-400/85" style={{ height: `${warnPct}%` }} />}
                        {infoPct > 0 && <div className="w-full bg-sky-500/65" style={{ height: `${infoPct}%` }} />}
                      </div>
                    ) : (
                      <div className="w-full h-[2px] rounded-full bg-[var(--border-subtle)]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={cn(isCompact ? 'flex-1 min-h-0 px-4 pb-3 pt-2 flex flex-col' : 'px-5 sm:px-6 pb-5 sm:pb-6')}>
        {queryError && (
          <div className="mb-2">
            <ErrorState message={queryError} onRetry={() => void runQuery()} />
          </div>
        )}

        <div
          ref={viewportRef}
          onScroll={handleViewportScroll}
          className={cn(
            'rounded-lg bg-zinc-950 text-zinc-100 border border-zinc-800/90 font-mono text-[12px] leading-[1.6] overflow-auto p-3',
            isCompact ? 'flex-1 min-h-[220px]' : 'h-[460px]',
          )}
          data-testid="log-viewport"
        >
          {entries.length === 0 ? (
            <div className="h-full min-h-[160px] flex items-center justify-center text-zinc-500 text-[12.5px]">
              {loading ? '正在原位直读日志...' : '当前过滤条件下暂无日志条目'}
            </div>
          ) : entries.length >= VIRTUAL_THRESHOLD ? (
            (() => {
              const vRange = computeVisibleRange({
                scrollTop,
                viewportHeight: activeViewportHeight,
                itemCount: entries.length,
                itemHeight: LOG_ROW_HEIGHT,
                overscan: 10,
              });
              return (
                <div style={{ height: `${vRange.totalHeight}px`, position: 'relative' }}>
                  <div style={{ transform: `translateY(${vRange.offsetTop}px)` }}>
                    {entries.slice(vRange.startIndex, vRange.endIndex).map((entry, offset) => {
                      const idx = vRange.startIndex + offset;
                      const rowKey = `${entry.ts || entry.timestamp || idx}-${idx}`;
                      const lv = String(entry.level || entry.severity || 'INFO').toUpperCase();
                      const isErr = lv.includes('ERR') || lv.includes('CRIT') || lv.includes('FATAL');
                      const isWarn = lv.includes('WARN');
                      const lvClass = isErr
                        ? 'text-rose-400'
                        : isWarn
                          ? 'text-amber-300'
                          : lv.includes('DEBUG')
                            ? 'text-zinc-400'
                            : 'text-sky-400';
                      const rowHighlight = correlationMode
                        ? isErr
                          ? 'bg-rose-500/[0.12] rounded-sm px-1.5 -mx-1.5'
                          : isWarn
                            ? 'bg-amber-500/[0.10] rounded-sm px-1.5 -mx-1.5'
                            : 'opacity-55'
                        : '';
                      return (
                        <div
                          key={rowKey}
                          style={{ height: `${LOG_ROW_HEIGHT}px` }}
                          className={cn(
                            'group grid items-center gap-2 border-b border-white/[0.04] overflow-hidden',
                            showUnitCol
                              ? 'grid-cols-[66px_46px_148px_1fr_24px]'
                              : 'grid-cols-[66px_46px_1fr_24px]',
                            rowHighlight,
                          )}
                        >
                          <span className="text-zinc-500 select-none tabular-nums truncate">
                            {formatClock(entry.ts || entry.timestamp)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleLevelFacet(lv)}
                            title="点击按此级别快筛"
                            className={cn('text-left font-semibold select-none hover:underline cursor-pointer truncate', lvClass)}
                          >
                            {lv.slice(0, 5)}
                          </button>
                          {showUnitCol && (
                            <button
                              type="button"
                              onClick={() => handleFilterUnitFacet(entry)}
                              title={`${entry.serviceName || entry.unit || '-'} (${sourceKindLabel(entry.sourceKind)})`}
                              className="text-left text-zinc-400 hover:text-zinc-100 truncate cursor-pointer flex items-center gap-1"
                            >
                              <span className="truncate">{entry.serviceName || entry.unit || '-'}</span>
                              {entry.sourceKind && (
                                <span className="text-[10px] text-zinc-500 shrink-0">
                                  [{sourceKindLabel(entry.sourceKind)}]
                                </span>
                              )}
                            </button>
                          )}
                          <span
                            className="truncate text-zinc-200"
                            title={entry.message || entry.raw || ''}
                          >
                            {entry.message || entry.raw || ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopyLogRow(rowKey, entry)}
                            aria-label={copiedRowKey === rowKey ? '已复制该行日志' : '复制该行日志'}
                            className={cn(
                              'ui-press-icon inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-opacity duration-150 cursor-pointer',
                              copiedRowKey === rowKey
                                ? 'opacity-100 text-emerald-400'
                                : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
                            )}
                          >
                            {copiedRowKey === rowKey ? (
                              <Check className="size-3.5 text-emerald-400" strokeWidth={2.2} />
                            ) : (
                              <Copy className="size-3.5" strokeWidth={1.75} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            entries.map((entry, idx) => {
              const rowKey = `${entry.ts || entry.timestamp || idx}-${idx}`;
              const lv = String(entry.level || entry.severity || 'INFO').toUpperCase();
              const isErr = lv.includes('ERR') || lv.includes('CRIT') || lv.includes('FATAL');
              const isWarn = lv.includes('WARN');
              const lvClass = isErr
                ? 'text-rose-400'
                : isWarn
                  ? 'text-amber-300'
                  : lv.includes('DEBUG')
                    ? 'text-zinc-400'
                    : 'text-sky-400';
              const rowHighlight = correlationMode
                ? isErr
                  ? 'bg-rose-500/[0.12] rounded-sm px-1.5 -mx-1.5'
                  : isWarn
                    ? 'bg-amber-500/[0.10] rounded-sm px-1.5 -mx-1.5'
                    : 'opacity-55'
                : '';
              return (
                <div
                  key={rowKey}
                  className={cn(
                    'group grid items-start gap-2 py-0.5 border-b border-white/[0.04] last:border-0',
                    showUnitCol
                      ? 'grid-cols-[66px_46px_148px_1fr_24px]'
                      : 'grid-cols-[66px_46px_1fr_24px]',
                    rowHighlight,
                  )}
                >
                  <span className="text-zinc-500 select-none tabular-nums">
                    {formatClock(entry.ts || entry.timestamp)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleLevelFacet(lv)}
                    title="点击按此级别快筛"
                    className={cn('text-left font-semibold select-none hover:underline cursor-pointer', lvClass)}
                  >
                    {lv.slice(0, 5)}
                  </button>
                  {showUnitCol && (
                    <button
                      type="button"
                      onClick={() => handleFilterUnitFacet(entry)}
                      title={`${entry.serviceName || entry.unit || '-'} (${sourceKindLabel(entry.sourceKind)})`}
                      className="text-left text-zinc-400 hover:text-zinc-100 truncate cursor-pointer flex items-center gap-1"
                    >
                      <span className="truncate">{entry.serviceName || entry.unit || '-'}</span>
                      {entry.sourceKind && (
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          [{sourceKindLabel(entry.sourceKind)}]
                        </span>
                      )}
                    </button>
                  )}
                  <span className="whitespace-pre-wrap break-all text-zinc-200">
                    {entry.message || entry.raw || ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyLogRow(rowKey, entry)}
                    aria-label={copiedRowKey === rowKey ? '已复制该行日志' : '复制该行日志'}
                    className={cn(
                      'ui-press-icon inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-opacity duration-150 cursor-pointer mt-0.5',
                      copiedRowKey === rowKey
                        ? 'opacity-100 text-emerald-400'
                        : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
                    )}
                  >
                    {copiedRowKey === rowKey ? (
                      <Check className="size-3.5 text-emerald-400" strokeWidth={2.2} />
                    ) : (
                      <Copy className="size-3.5" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default LogStreamPanel;
