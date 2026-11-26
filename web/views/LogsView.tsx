import React from 'react';
import { BookmarkPlus, Check, Copy, Download, Play, Radio, Search, Square, Trash2 } from 'lucide-react';
import type { LogEntry, MetaResponse, SnapshotResponse } from '../types';
import { buildLogStreamUrl, copyToClipboard, fetchLogs } from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { computeVisibleRange } from '../lib/virtual-list';
import { countLogLevels, formatClock } from '../utils/format';
import {
  Button,
  ErrorState,
  inputBaseClass,
  Panel,
  SegmentedFilter,
  ToggleSwitch,
} from '../components/ui';
import { ModuleFrame } from '../modules/ModuleFrame';

const VIRTUAL_THRESHOLD = 50;
const LOG_ROW_HEIGHT = 26;
const LOG_VIEWPORT_HEIGHT = 460;

interface HistogramBucket {
  label: string;
  total: number;
  error: number;
  warn: number;
  info: number;
}

function buildLogHistogram(entries: LogEntry[], bucketCount = 16): HistogramBucket[] {
  if (entries.length === 0) return [];
  const parsed = entries.map((e, idx) => {
    const raw = e.ts || e.timestamp;
    const ms = raw ? Date.parse(raw) : Number.NaN;
    const lv = String(e.level || e.severity || 'info').toLowerCase();
    const kind = lv.includes('err') || lv.includes('crit') || lv.includes('fatal')
      ? 'error'
      : lv.includes('warn')
        ? 'warn'
        : 'info';
    return { ms, idx, kind };
  });
  const validMs = parsed.filter((p) => Number.isFinite(p.ms)).map((p) => p.ms);
  const useTime = validMs.length >= 2 && Math.max(...validMs) > Math.min(...validMs);
  const minVal = useTime ? Math.min(...validMs) : 0;
  const maxVal = useTime ? Math.max(...validMs) : Math.max(1, entries.length - 1);
  const span = Math.max(1, maxVal - minVal);

  const buckets: HistogramBucket[] = Array.from({ length: bucketCount }, (_, i) => {
    const startMs = useTime ? minVal + (span * i) / bucketCount : 0;
    return {
      label: useTime ? formatClock(new Date(startMs).toISOString()) : `#${i + 1}`,
      total: 0,
      error: 0,
      warn: 0,
      info: 0,
    };
  });

  for (const item of parsed) {
    const pos = useTime && Number.isFinite(item.ms)
      ? (item.ms - minVal) / span
      : item.idx / Math.max(1, entries.length - 1);
    const bi = Math.min(bucketCount - 1, Math.max(0, Math.floor(pos * bucketCount)));
    const b = buckets[bi];
    b.total += 1;
    if (item.kind === 'error') b.error += 1;
    else if (item.kind === 'warn') b.warn += 1;
    else b.info += 1;
  }
  return buckets;
}

const LOG_SOURCES = [
  { value: 'service', label: '服务日志 (journald)' },
  { value: 'file', label: '日志文件' },
  { value: 'memory', label: '记忆引擎' },
] as const;

type LogSource = (typeof LOG_SOURCES)[number]['value'];

interface SavedLogPreset {
  id: string;
  name: string;
  source: LogSource;
  target: string;
  since: string;
  level: string;
  query: string;
  regex: boolean;
}

const PRESETS_STORAGE_KEY = 'ops-console-log-presets-v1';

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

export function LogsView({
  snapshot,
  meta,
  initialUnit,
  initialLevel = 'all',
  requestNonce = 0,
  onToast,
}: {
  snapshot: SnapshotResponse | null;
  meta: MetaResponse | null;
  initialUnit: string;
  initialLevel?: string;
  requestNonce?: number;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [source, setSource] = React.useState<LogSource>('service');
  const [target, setTarget] = React.useState(initialUnit || '');
  const [since, setSince] = React.useState('30m');
  const [level, setLevel] = React.useState(initialLevel || 'all');
  const [query, setQuery] = React.useState('');
  const [regex, setRegex] = React.useState(false);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [correlationMode, setCorrelationMode] = React.useState(false);
  const [entries, setEntries] = React.useState<LogEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [queryError, setQueryError] = React.useState('');
  const [streaming, setStreaming] = React.useState(false);
  const [scrollTop, setScrollTop] = React.useState(0);

  const [presets, setPresets] = React.useState<SavedLogPreset[]>(() => loadSavedPresets());
  const [presetName, setPresetName] = React.useState('');
  const [copiedRowKey, setCopiedRowKey] = React.useState('');

  const esRef = React.useRef<EventSource | null>(null);
  const queryAbortRef = React.useRef<AbortController | null>(null);
  const scrollRafRef = React.useRef<number | null>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);

  const targetOptions = React.useMemo(() => {
    if (source === 'file') {
      const files = meta?.logSources?.files || [];
      return files.map((f) => ({ value: f.id, label: f.name || f.id }));
    }
    if (source === 'memory') {
      const mems = meta?.logSources?.memory || [
        { id: 'nmem', name: 'Nowledge Mem' },
        { id: 'openviking', name: 'OpenViking' },
      ];
      return mems.map((m) => ({ value: m.id, label: m.name || m.id }));
    }
    const svcs = meta?.logSources?.services || snapshot?.services?.items || [];
    return [
      { value: 'all', label: '全部受管服务 (all)' },
      ...svcs.map((s) => ({
        value: s.unit || s.id,
        label: s.name ? `${s.name} (${s.unit || s.id})` : s.unit || s.id,
      })),
    ];
  }, [source, meta, snapshot]);

  React.useEffect(() => {
    if (initialUnit) {
      setSource('service');
      setTarget(initialUnit);
    }
    if (initialLevel) {
      setLevel(initialLevel);
    }
  }, [initialUnit, initialLevel, requestNonce]);

  React.useEffect(() => {
    if (!targetOptions.length) return;
    if (!target || !targetOptions.some((o) => o.value === target)) {
      setTarget(targetOptions[0].value);
    }
  }, [targetOptions, target]);

  const stopStream = React.useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStreaming(false);
  }, []);

  React.useEffect(() => {
    return () => {
      stopStream();
      queryAbortRef.current?.abort();
      if (scrollRafRef.current != null) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, [stopStream]);

  const runQuery = React.useCallback(async () => {
    if (!target) return;
    stopStream();
    queryAbortRef.current?.abort();
    const controller = new AbortController();
    queryAbortRef.current = controller;
    setLoading(true);
    setQueryError('');
    try {
      const res = await fetchLogs(
        { source, target, since, level, q: query, regex, lines: 200 },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setEntries(res.entries || res.items || res.lines || []);
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
  }, [source, target, since, level, query, regex, stopStream, onToast]);

  React.useEffect(() => {
    if (target) {
      void runQuery();
    }
  }, [source, target, since, level]);

  const handleViewportScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const nextTop = e.currentTarget.scrollTop;
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      setScrollTop(nextTop);
    });
  }, []);

  React.useEffect(() => {
    if (autoScroll && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      setScrollTop(viewportRef.current.scrollTop);
    }
  }, [entries, autoScroll]);

  const toggleStream = () => {
    if (streaming) {
      stopStream();
      return;
    }
    if (!target) return;
    const url = buildLogStreamUrl({ source, target, level, q: query, regex });
    const es = new EventSource(url);
    esRef.current = es;
    setStreaming(true);

    const onLine = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as LogEntry;
        setEntries((prev) => [...prev.slice(-400), parsed]);
      } catch {
        setEntries((prev) => [...prev.slice(-400), { message: String(ev.data), level: 'info' }]);
      }
    };
    es.addEventListener('log', onLine);
    es.onmessage = onLine;
    es.onerror = () => {
      stopStream();
      onToast('实时日志流已断开', 'info');
    };
  };

  const handleSavePreset = () => {
    const label = presetName.trim() || `${target || source} · ${level.toUpperCase()}`;
    const next: SavedLogPreset = {
      id: `preset-${Date.now()}`,
      name: label,
      source,
      target,
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
    setSince(preset.since);
    setLevel(preset.level);
    setQuery(preset.query);
    setRegex(preset.regex);
    onToast(`已应用筛选视图「${preset.name}」`, 'info');
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    persistSavedPresets(updated);
  };

  const exportJsonl = () => {
    const content = entries.map((e) => JSON.stringify(e)).join('\n');
    const blob = new Blob([content], { type: 'application/x-ndjson;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ops-logs-${target || source}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`已导出 ${entries.length} 条日志`, 'ok');
  };

  const counts = React.useMemo(() => countLogLevels(entries), [entries]);
  const histogram = React.useMemo(() => buildLogHistogram(entries, 16), [entries]);
  const maxBucketTotal = React.useMemo(
    () => Math.max(1, ...histogram.map((b) => b.total)),
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

  const handleFilterUnitFacet = (unit?: string) => {
    if (!unit || source !== 'service') return;
    if (targetOptions.some((o) => o.value === unit)) {
      setTarget(unit);
    } else {
      setQuery(unit);
    }
  };

  return (
    <ModuleFrame
      title="结构化日志中心"
      description="支持 journald、白名单文件与记忆引擎日志查询、频次直方图、点击单元快筛、常用视图保存及 SSE 实时追踪。"
      meta={`总计 ${counts.total} · 错误 ${counts.error} · 警告 ${counts.warn} · 信息 ${counts.info}`}
    >

      <Panel bodyClassName="p-0">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
          <SegmentedFilter
            value={source}
            onChange={(next) => {
              stopStream();
              setSource(next);
            }}
            options={LOG_SOURCES}
            ariaLabel="日志源切换"
          />
          <div className="flex flex-wrap items-center gap-3">
            <ToggleSwitch checked={regex} onCheckedChange={setRegex} label="正则匹配" />
            <ToggleSwitch checked={correlationMode} onCheckedChange={setCorrelationMode} label="异常关联高亮" />
            <ToggleSwitch checked={autoScroll} onCheckedChange={setAutoScroll} label="自动滚底" />
            <Button
              variant="secondary"
              size="sm"
              onClick={exportJsonl}
              disabled={entries.length === 0}
            >
              <Download className="size-4" strokeWidth={1.75} />
              导出 JSONL
            </Button>
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runQuery();
            }}
            className="flex flex-wrap items-center gap-2.5"
          >
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="日志目标单元"
              className={cn('ui-select h-9 min-w-[200px] pl-3 cursor-pointer', inputBaseClass)}
            >
              {targetOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={since}
              onChange={(e) => setSince(e.target.value)}
              aria-label="时间范围"
              className={cn('ui-select h-9 pl-2.5 cursor-pointer', inputBaseClass)}
            >
              <option value="15m">近 15 分钟</option>
              <option value="30m">近 30 分钟</option>
              <option value="2h">近 2 小时</option>
              <option value="24h">近 24 小时</option>
            </select>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              aria-label="日志级别"
              className={cn('ui-select h-9 pl-2.5 cursor-pointer', inputBaseClass)}
            >
              <option value="all">全部级别</option>
              <option value="error">ERROR</option>
              <option value="warn">WARN</option>
              <option value="info">INFO</option>
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={regex ? '输入正则表达式过滤...' : '输入关键词过滤日志...'}
                aria-label="过滤日志关键词"
                className={cn('w-full h-9 pl-9 pr-3', inputBaseClass)}
              />
            </div>

            <Button type="submit" variant="primary" size="md" disabled={loading}>
              <Play className="size-3.5 translate-x-[1px]" strokeWidth={1.75} />
              {loading ? '查询中...' : '查询'}
            </Button>

            <Button
              variant={streaming ? 'danger' : 'secondary'}
              size="md"
              onClick={toggleStream}
            >
              {streaming ? (
                <Square className="size-3.5" strokeWidth={1.75} />
              ) : (
                <Radio className="size-4 text-[var(--accent)]" strokeWidth={1.75} />
              )}
              {streaming ? '停止实时流' : '实时流 (SSE)'}
            </Button>
          </form>

          {/* Saved Filter Presets Bar */}
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
                presets.map((p) => (
                  <div
                    key={p.id}
                    className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] overflow-hidden text-[12px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={cn(
                        'px-2.5 py-1 text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors duration-150 cursor-pointer',
                        FOCUS_RING,
                      )}
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(p.id)}
                      aria-label={`删除视图 ${p.name}`}
                      className="px-1.5 py-1 text-[var(--ink-subtle)] hover:text-[var(--err)] transition-colors duration-150 cursor-pointer border-l border-[var(--border-subtle)]"
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
                onChange={(e) => setPresetName(e.target.value)}
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

          {/* Datadog / Loki style Log Volume Histogram */}
          {histogram.length > 0 && (
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
                {histogram.map((b, i) => {
                  const totalH = b.total > 0 ? Math.max(12, Math.round((b.total / maxBucketTotal) * 100)) : 0;
                  const errPct = b.total > 0 ? Math.round((b.error / b.total) * 100) : 0;
                  const warnPct = b.total > 0 ? Math.round((b.warn / b.total) * 100) : 0;
                  const infoPct = Math.max(0, 100 - errPct - warnPct);
                  return (
                    <div
                      key={`${b.label}-${i}`}
                      className="h-full flex items-end"
                      title={`${b.label} · 共 ${b.total} 条（错误 ${b.error} / 警告 ${b.warn} / 信息 ${b.info}）`}
                    >
                      {b.total > 0 ? (
                        <div
                          className="w-full rounded-[2px] overflow-hidden flex flex-col justify-end transition-opacity hover:opacity-85"
                          style={{ height: `${totalH}%` }}
                        >
                          {errPct > 0 && <span className="w-full bg-rose-500/85" style={{ height: `${errPct}%` }} />}
                          {warnPct > 0 && <span className="w-full bg-amber-400/80" style={{ height: `${warnPct}%` }} />}
                          {infoPct > 0 && <span className="w-full bg-sky-400/55" style={{ height: `${infoPct}%` }} />}
                        </div>
                      ) : (
                        <div className="w-full h-[2px] rounded-full bg-[var(--border-subtle)]/70" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            ref={viewportRef}
            onScroll={handleViewportScroll}
            className="rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-[var(--border)] h-[460px] overflow-auto p-4 font-mono text-[12.5px] leading-[1.6]"
            role="log"
            aria-label="日志输出终端"
          >
            {queryError ? (
              <div className="h-full flex items-center justify-center">
                <ErrorState
                  title="日志查询失败"
                  message={queryError}
                  onRetry={() => void runQuery()}
                  retrying={loading}
                />
              </div>
            ) : entries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400">
                {loading ? '正在采集日志...' : '当前筛选条件下暂无日志输出。'}
              </div>
            ) : entries.length > VIRTUAL_THRESHOLD ? (
              (() => {
                const { startIndex, endIndex, offsetTop, totalHeight } = computeVisibleRange({
                  scrollTop,
                  viewportHeight: LOG_VIEWPORT_HEIGHT,
                  itemCount: entries.length,
                  itemHeight: LOG_ROW_HEIGHT,
                  overscan: 12,
                });
                const slice = entries.slice(startIndex, endIndex);
                const showUnitCol = source === 'service' && target === 'all';
                return (
                  <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                    <div
                      style={{
                        transform: `translate3d(0, ${offsetTop}px, 0)`,
                        willChange: 'transform',
                      }}
                    >
                      {slice.map((entry, offset) => {
                        const idx = startIndex + offset;
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
                        const msg = entry.message || entry.raw || '';
                        return (
                          <div
                            key={rowKey}
                            style={{ height: `${LOG_ROW_HEIGHT}px` }}
                            className={cn(
                              'group grid items-center gap-2.5 border-b border-white/[0.04]',
                              showUnitCol
                                ? 'grid-cols-[68px_48px_132px_1fr_24px]'
                                : 'grid-cols-[68px_48px_1fr_24px]',
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
                                onClick={() => handleFilterUnitFacet(entry.unit)}
                                title={`点击仅看 ${entry.unit || '该服务'} 日志`}
                                className="text-left text-zinc-400 hover:text-zinc-100 truncate cursor-pointer"
                              >
                                {entry.unit || '-'}
                              </button>
                            )}
                            <span className="truncate text-zinc-200" title={msg}>
                              {msg}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleCopyLogRow(rowKey, entry)}
                              aria-label="复制该行日志"
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-opacity cursor-pointer"
                            >
                              {copiedRowKey === rowKey ? (
                                <Check className="size-3.5 text-emerald-400" strokeWidth={2} />
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
              (() => {
                const showUnitCol = source === 'service' && target === 'all';
                return entries.map((entry, idx) => {
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
                        'group grid items-start gap-2.5 py-0.5 border-b border-white/[0.04] last:border-0',
                        showUnitCol
                          ? 'grid-cols-[68px_48px_132px_1fr_24px]'
                          : 'grid-cols-[68px_48px_1fr_24px]',
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
                          onClick={() => handleFilterUnitFacet(entry.unit)}
                          title={`点击仅看 ${entry.unit || '该服务'} 日志`}
                          className="text-left text-zinc-400 hover:text-zinc-100 truncate cursor-pointer"
                        >
                          {entry.unit || '-'}
                        </button>
                      )}
                      <span className="whitespace-pre-wrap break-all text-zinc-200">
                        {entry.message || entry.raw || ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopyLogRow(rowKey, entry)}
                        aria-label="复制该行日志"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-opacity cursor-pointer mt-0.5"
                      >
                        {copiedRowKey === rowKey ? (
                          <Check className="size-3.5 text-emerald-400" strokeWidth={2} />
                        ) : (
                          <Copy className="size-3.5" strokeWidth={1.75} />
                        )}
                      </button>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>
      </Panel>
    </ModuleFrame>
  );
}
