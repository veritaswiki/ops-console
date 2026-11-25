import React from 'react';
import { Download, Play, Radio, Search, Square } from 'lucide-react';
import type { LogEntry, MetaResponse, SnapshotResponse } from '../types';
import { buildLogStreamUrl, fetchLogs } from '../api';
import { countLogLevels, formatClock } from '../utils/format';
import {
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
  const [entries, setEntries] = React.useState<LogEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [streaming, setStreaming] = React.useState(false);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--ink)] leading-tight">
            结构化日志中心
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--ink-muted)]">
            支持 journald、白名单文件与记忆引擎日志查询、正则高亮及 SSE 实时流式追踪。
          </p>
        </div>
        <div className="font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums">
          总计 {counts.total} · 错误 {counts.error} · 警告 {counts.warn} · 信息 {counts.info}
        </div>
      </div>

      <Panel
        actions={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
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
              <ToggleSwitch checked={autoScroll} onCheckedChange={setAutoScroll} label="自动滚底" />
              <button
                type="button"
                onClick={exportJsonl}
                disabled={entries.length === 0}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                导出 JSONL
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
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
              className="h-9 min-w-[200px] px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
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
              className="h-9 px-2.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
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
              className="h-9 px-2.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">全部级别</option>
              <option value="error">ERROR</option>
              <option value="warn">WARN</option>
              <option value="info">INFO</option>
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={regex ? '输入正则表达式过滤...' : '输入关键词过滤日志...'}
                aria-label="过滤日志关键词"
                className="w-full h-9 pl-8 pr-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[7px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-45"
            >
              <Play className="h-3.5 w-3.5" />
              {loading ? '查询中...' : '查询'}
            </button>

            <button
              type="button"
              onClick={toggleStream}
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[7px] border text-[13px] font-medium transition-colors cursor-pointer ${
                streaming
                  ? 'border-[var(--err-dot)] bg-[var(--err-dot)] text-white'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {streaming ? <Square className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5 text-[var(--accent)]" />}
              {streaming ? '停止实时流' : '实时流 (SSE)'}
            </button>
          </form>

          <div
            ref={viewportRef}
            className="rounded-[8px] bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-[var(--border)] h-[460px] overflow-auto p-3.5 font-mono text-[12.5px] leading-[1.6]"
            role="log"
            aria-label="日志输出终端"
          >
            {entries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                {loading ? '正在采集日志...' : '当前筛选条件下暂无日志输出。'}
              </div>
            ) : (
              entries.map((entry, idx) => {
                const lv = String(entry.level || entry.severity || 'INFO').toUpperCase();
                const lvClass =
                  lv.includes('ERR') || lv.includes('CRIT') || lv.includes('FATAL')
                    ? 'text-rose-400'
                    : lv.includes('WARN')
                      ? 'text-amber-300'
                      : lv.includes('DEBUG')
                        ? 'text-slate-400'
                        : 'text-sky-400';
                return (
                  <div
                    key={`${entry.ts || entry.timestamp || idx}-${idx}`}
                    className="grid grid-cols-[72px_54px_1fr] gap-2.5 py-0.5 border-b border-white/[0.04] last:border-0"
                  >
                    <span className="text-slate-500 select-none">
                      {formatClock(entry.ts || entry.timestamp)}
                    </span>
                    <span className={`font-semibold select-none ${lvClass}`}>
                      {lv.slice(0, 5)}
                    </span>
                    <span className="whitespace-pre-wrap break-all text-slate-200">
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
