import React from 'react';
import { BookmarkPlus, Download, Play, Radio, Search, Square, Trash2 } from 'lucide-react';
import type { LogEntry, MetaResponse, SnapshotResponse } from '../types';
import { buildLogStreamUrl, fetchLogs } from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { countLogLevels, formatClock } from '../utils/format';
import {
  Button,
  inputBaseClass,
  Panel,
  SegmentedFilter,
  ToggleSwitch,
} from '../components/ui';

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
  const [streaming, setStreaming] = React.useState(false);

  const [presets, setPresets] = React.useState<SavedLogPreset[]>(() => loadSavedPresets());
  const [presetName, setPresetName] = React.useState('');

  const esRef = React.useRef<EventSource | null>(null);
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
    return svcs.map((s) => ({
      value: s.unit || s.id,
      label: s.name ? `${s.name} (${s.unit || s.id})` : s.unit || s.id,
    }));
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

  React.useEffect(() => () => stopStream(), [stopStream]);

  const runQuery = React.useCallback(async () => {
    if (!target) return;
    stopStream();
    setLoading(true);
    try {
      const res = await fetchLogs({ source, target, since, level, q: query, regex, lines: 200 });
      setEntries(res.entries || res.items || res.lines || []);
    } catch (err) {
      onToast(`日志查询失败：${(err as Error).message}`, 'err');
    } finally {
      setLoading(false);
    }
  }, [source, target, since, level, query, regex, stopStream, onToast]);

  React.useEffect(() => {
    if (target) {
      void runQuery();
    }
  }, [source, target, since, level]);

  React.useEffect(() => {
    if (autoScroll && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--ink)] leading-tight text-balance">
            结构化日志中心
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed text-pretty">
            支持 journald、白名单文件与记忆引擎日志查询、正则过滤、常用视图保存、异常高亮时间线及 SSE 实时追踪。
          </p>
        </div>
        <div className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
          总计 {counts.total} · 错误 {counts.error} · 警告 {counts.warn} · 信息 {counts.info}
        </div>
      </div>

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
                className={cn('h-8 w-36 px-2.5 text-[12px]', inputBaseClass)}
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

          <div
            ref={viewportRef}
            className="rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-[var(--border)] h-[460px] overflow-auto p-4 font-mono text-[12.5px] leading-[1.6]"
            role="log"
            aria-label="日志输出终端"
          >
            {entries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-400">
                {loading ? '正在采集日志...' : '当前筛选条件下暂无日志输出。'}
              </div>
            ) : (
              entries.map((entry, idx) => {
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
                    ? 'bg-rose-500/12 border-l-2 border-l-rose-400 pl-2'
                    : isWarn
                      ? 'bg-amber-500/10 border-l-2 border-l-amber-300 pl-2'
                      : 'opacity-65'
                  : '';
                return (
                  <div
                    key={`${entry.ts || entry.timestamp || idx}-${idx}`}
                    className={cn(
                      'grid grid-cols-[72px_54px_1fr] gap-2.5 py-0.5 border-b border-white/[0.04] last:border-0',
                      rowHighlight,
                    )}
                  >
                    <span className="text-zinc-500 select-none tabular-nums">
                      {formatClock(entry.ts || entry.timestamp)}
                    </span>
                    <span className={cn('font-semibold select-none', lvClass)}>
                      {lv.slice(0, 5)}
                    </span>
                    <span className="whitespace-pre-wrap break-all text-zinc-200">
                      {entry.message || entry.raw || ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
