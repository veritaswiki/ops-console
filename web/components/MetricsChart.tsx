import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchMetricsSeries } from '../api';
import type { MetricsRange, MetricsSeriesPoint } from '../types';
import { EmptyState, ErrorState, Panel, SegmentedFilter } from './ui';

const RANGE_OPTIONS = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
] as const;

const METRIC_OPTIONS = [
  { value: 'resources', label: 'CPU & 内存' },
  { value: 'latency', label: '探针延迟' },
] as const;

type MetricView = (typeof METRIC_OPTIONS)[number]['value'];

function formatAxisTick(ts: number, range: MetricsRange): string {
  const d = new Date(ts);
  if (range === '7d' || range === '30d') {
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function MetricsChart({
  series = 'fleet',
  title = '历史指标趋势',
  description = '展示主机 CPU、内存与服务响应延迟的历史趋势，支持按时间范围切换查看。',
}: {
  series?: string;
  title?: string;
  description?: string;
}) {
  const [range, setRange] = React.useState<MetricsRange>('24h');
  const [metricView, setMetricView] = React.useState<MetricView>('resources');
  const [points, setPoints] = React.useState<MetricsSeriesPoint[]>([]);
  const [sourceLabel, setSourceLabel] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [retryNonce, setRetryNonce] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrorMsg('');
    fetchMetricsSeries(series, range, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setPoints(res.points || []);
        setSourceLabel(res.source || 'raw');
      })
      .catch((err) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
        setPoints([]);
        setErrorMsg((err as Error)?.message || '时序指标加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [series, range, retryNonce]);

  const chartData = React.useMemo(
    () =>
      points.map((pt) => ({
        ...pt,
        label: formatAxisTick(pt.ts, range),
      })),
    [points, range],
  );

  const summaryStats = React.useMemo(() => {
    if (!points.length) return null;
    const cpus = points.map((p) => p.cpuPct).filter((v): v is number => typeof v === 'number');
    const mems = points.map((p) => p.memPct).filter((v): v is number => typeof v === 'number');
    const rtts = points.map((p) => p.rttMs).filter((v): v is number => typeof v === 'number');
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    const max = (arr: number[]) => (arr.length ? Math.max(...arr) : null);
    return {
      avgCpu: avg(cpus),
      maxCpu: max(cpus),
      avgMem: avg(mems),
      maxMem: max(mems),
      avgRtt: avg(rtts),
      maxRtt: max(rtts),
    };
  }, [points]);

  return (
    <Panel
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedFilter
            value={metricView}
            onChange={setMetricView}
            options={METRIC_OPTIONS}
            ariaLabel="指标维度切换"
          />
          <SegmentedFilter
            value={range}
            onChange={setRange}
            options={RANGE_OPTIONS}
            ariaLabel="历史时间尺度"
          />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--ink-subtle)]">
          <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
            {metricView === 'resources' && summaryStats ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-[var(--ink-muted)]">
                  <i className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                  内存均值 {summaryStats.avgMem != null ? `${summaryStats.avgMem.toFixed(1)}%` : '-'}
                  {summaryStats.maxMem != null ? ` · 峰值 ${summaryStats.maxMem.toFixed(1)}%` : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[var(--ink-muted)]">
                  <i className="h-2 w-2 rounded-full bg-[var(--ok-dot)]" aria-hidden="true" />
                  CPU 均值 {summaryStats.avgCpu != null ? `${summaryStats.avgCpu.toFixed(1)}%` : '-'}
                  {summaryStats.maxCpu != null ? ` · 峰值 ${summaryStats.maxCpu.toFixed(1)}%` : ''}
                </span>
              </>
            ) : summaryStats ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--ink-muted)]">
                <i className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                探针平均延迟 {summaryStats.avgRtt != null ? `${Math.round(summaryStats.avgRtt)} ms` : '-'}
                {summaryStats.maxRtt != null ? ` · P95 峰值 ${Math.round(summaryStats.maxRtt)} ms` : ''}
              </span>
            ) : null}
          </div>
          <span className="font-mono text-[11.5px] tabular-nums">
            数据源 {sourceLabel || 'sqlite'} · {points.length} 采样点
          </span>
        </div>

        <div
          data-testid="historical-metrics-chart"
          className="h-[248px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)]/60 px-2 pt-3 pb-1"
        >
          {loading ? (
            <div
              className="ui-skeleton h-full w-full flex flex-col justify-between p-4 rounded-lg"
              role="status"
              aria-label="正在加载历史指标趋势"
            >
              <div className="h-3 w-40 rounded bg-[var(--surface-subtle)]" />
              <div className="h-32 w-full rounded-lg bg-[var(--surface-subtle)]/70" />
              <div className="flex justify-between">
                <div className="h-2.5 w-12 rounded bg-[var(--surface-subtle)]" />
                <div className="h-2.5 w-12 rounded bg-[var(--surface-subtle)]" />
                <div className="h-2.5 w-12 rounded bg-[var(--surface-subtle)]" />
              </div>
            </div>
          ) : errorMsg ? (
            <ErrorState
              title="历史趋势加载失败"
              message={errorMsg}
              onRetry={() => setRetryNonce((n) => n + 1)}
              retrying={loading}
            />
          ) : chartData.length === 0 ? (
            <EmptyState
              title="暂无该时间窗历史采样"
              message="系统正在后台持续写入 SQLite 时序表，请稍候或切换时间尺度。"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 24, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="opsGradAccent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="opsGradOk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ok-dot)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--ok-dot)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--ink-subtle)', fontSize: 11, fontFamily: 'JetBrains Mono Variable, monospace' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: 'var(--ink-subtle)', fontSize: 11, fontFamily: 'JetBrains Mono Variable, monospace' }}
                  tickLine={false}
                  axisLine={false}
                  domain={metricView === 'resources' ? [0, 100] : ['auto', 'auto']}
                  unit={metricView === 'resources' ? '%' : 'ms'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono Variable, monospace',
                    boxShadow: 'var(--shadow-card)',
                    color: 'var(--ink)',
                  }}
                  labelStyle={{ color: 'var(--ink-muted)', marginBottom: 4 }}
                />
                {metricView === 'resources' ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="memPct"
                      name="内存 (%)"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      fill="url(#opsGradAccent)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpuPct"
                      name="CPU (%)"
                      stroke="var(--ok-dot)"
                      strokeWidth={1.75}
                      fill="url(#opsGradOk)"
                      isAnimationActive={false}
                    />
                  </>
                ) : (
                  <Area
                    type="monotone"
                    dataKey="rttMs"
                    name="探针延迟 (ms)"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#opsGradAccent)"
                    isAnimationActive={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Panel>
  );
}
