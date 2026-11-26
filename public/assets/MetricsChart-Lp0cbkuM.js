import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { i as XAxis, l as Tooltip, o as Area, r as YAxis, s as CartesianGrid, t as AreaChart, u as ResponsiveContainer, x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { bt as fetchMetricsSeries, d as ErrorState, g as SegmentedFilter, m as Panel, u as EmptyState } from "./app-nZGM7CNZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/components/MetricsChart.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var RANGE_OPTIONS = [
	{
		value: "1h",
		label: "1h"
	},
	{
		value: "6h",
		label: "6h"
	},
	{
		value: "24h",
		label: "24h"
	},
	{
		value: "7d",
		label: "7d"
	},
	{
		value: "30d",
		label: "30d"
	}
];
var METRIC_OPTIONS = [{
	value: "resources",
	label: "CPU & 内存"
}, {
	value: "latency",
	label: "探针延迟"
}];
function formatAxisTick(ts, range) {
	const d = new Date(ts);
	if (range === "7d" || range === "30d") return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	return d.toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	});
}
function MetricsChart({ series = "fleet", title = "历史指标与聚合趋势", description = "直连 SQLite WAL 原始样本与 1m / 5m 聚合表，支持跨尺度回溯资源水位与探针延迟。" }) {
	const [range, setRange] = import_react.useState("24h");
	const [metricView, setMetricView] = import_react.useState("resources");
	const [points, setPoints] = import_react.useState([]);
	const [sourceLabel, setSourceLabel] = import_react.useState("");
	const [loading, setLoading] = import_react.useState(true);
	const [errorMsg, setErrorMsg] = import_react.useState("");
	const [retryNonce, setRetryNonce] = import_react.useState(0);
	import_react.useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setErrorMsg("");
		fetchMetricsSeries(series, range, controller.signal).then((res) => {
			if (controller.signal.aborted) return;
			setPoints(res.points || []);
			setSourceLabel(res.source || "raw");
		}).catch((err) => {
			if (controller.signal.aborted || err?.name === "AbortError") return;
			setPoints([]);
			setErrorMsg(err?.message || "时序指标加载失败");
		}).finally(() => {
			if (!controller.signal.aborted) setLoading(false);
		});
		return () => {
			controller.abort();
		};
	}, [
		series,
		range,
		retryNonce
	]);
	const chartData = import_react.useMemo(() => points.map((pt) => ({
		...pt,
		label: formatAxisTick(pt.ts, range)
	})), [points, range]);
	const summaryStats = import_react.useMemo(() => {
		if (!points.length) return null;
		const cpus = points.map((p) => p.cpuPct).filter((v) => typeof v === "number");
		const mems = points.map((p) => p.memPct).filter((v) => typeof v === "number");
		const rtts = points.map((p) => p.rttMs).filter((v) => typeof v === "number");
		const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
		const max = (arr) => arr.length ? Math.max(...arr) : null;
		return {
			avgCpu: avg(cpus),
			maxCpu: max(cpus),
			avgMem: avg(mems),
			maxMem: max(mems),
			avgRtt: avg(rtts),
			maxRtt: max(rtts)
		};
	}, [points]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title,
		description,
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
				value: metricView,
				onChange: setMetricView,
				options: METRIC_OPTIONS,
				ariaLabel: "指标维度切换"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
				value: range,
				onChange: setRange,
				options: RANGE_OPTIONS,
				ariaLabel: "历史时间尺度"
			})]
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--ink-subtle)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap items-center gap-4 font-mono tabular-nums",
					children: metricView === "resources" && summaryStats ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1.5 text-[var(--ink-muted)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
								className: "h-2 w-2 rounded-full bg-[var(--accent)]",
								"aria-hidden": "true"
							}),
							"内存均值 ",
							summaryStats.avgMem != null ? `${summaryStats.avgMem.toFixed(1)}%` : "-",
							summaryStats.maxMem != null ? ` · 峰值 ${summaryStats.maxMem.toFixed(1)}%` : ""
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1.5 text-[var(--ink-muted)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
								className: "h-2 w-2 rounded-full bg-[var(--ok-dot)]",
								"aria-hidden": "true"
							}),
							"CPU 均值 ",
							summaryStats.avgCpu != null ? `${summaryStats.avgCpu.toFixed(1)}%` : "-",
							summaryStats.maxCpu != null ? ` · 峰值 ${summaryStats.maxCpu.toFixed(1)}%` : ""
						]
					})] }) : summaryStats ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1.5 text-[var(--ink-muted)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
								className: "h-2 w-2 rounded-full bg-[var(--accent)]",
								"aria-hidden": "true"
							}),
							"探针平均延迟 ",
							summaryStats.avgRtt != null ? `${Math.round(summaryStats.avgRtt)} ms` : "-",
							summaryStats.maxRtt != null ? ` · P95 峰值 ${Math.round(summaryStats.maxRtt)} ms` : ""
						]
					}) : null
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-mono text-[11.5px] tabular-nums",
					children: [
						"数据源 ",
						sourceLabel || "sqlite",
						" · ",
						points.length,
						" 采样点"
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-testid": "historical-metrics-chart",
				className: "h-[248px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)]/60 px-2 pt-3 pb-1",
				children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "h-full w-full flex flex-col justify-between p-4 animate-pulse",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-40 rounded bg-[var(--surface-subtle)]" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-32 w-full rounded-lg bg-[var(--surface-subtle)]/70" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-12 rounded bg-[var(--surface-subtle)]" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-12 rounded bg-[var(--surface-subtle)]" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-12 rounded bg-[var(--surface-subtle)]" })
							]
						})
					]
				}) : errorMsg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
					title: "历史趋势加载失败",
					message: errorMsg,
					onRetry: () => setRetryNonce((n) => n + 1),
					retrying: loading
				}) : chartData.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					title: "暂无该时间窗历史采样",
					message: "系统正在后台持续写入 SQLite 时序表，请稍候或切换时间尺度。"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
						data: chartData,
						margin: {
							top: 8,
							right: 24,
							left: -12,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
								id: "opsGradAccent",
								x1: "0",
								y1: "0",
								x2: "0",
								y2: "1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "5%",
									stopColor: "var(--accent)",
									stopOpacity: .22
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "95%",
									stopColor: "var(--accent)",
									stopOpacity: .01
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
								id: "opsGradOk",
								x1: "0",
								y1: "0",
								x2: "0",
								y2: "1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "5%",
									stopColor: "var(--ok-dot)",
									stopOpacity: .18
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "95%",
									stopColor: "var(--ok-dot)",
									stopOpacity: .01
								})]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								stroke: "var(--border-subtle)",
								strokeDasharray: "3 3",
								vertical: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "label",
								tick: {
									fill: "var(--ink-subtle)",
									fontSize: 11,
									fontFamily: "JetBrains Mono Variable, monospace"
								},
								tickLine: false,
								axisLine: false,
								minTickGap: 28
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tick: {
									fill: "var(--ink-subtle)",
									fontSize: 11,
									fontFamily: "JetBrains Mono Variable, monospace"
								},
								tickLine: false,
								axisLine: false,
								domain: metricView === "resources" ? [0, 100] : ["auto", "auto"],
								unit: metricView === "resources" ? "%" : "ms"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								contentStyle: {
									backgroundColor: "var(--surface-elevated)",
									borderColor: "var(--border)",
									borderRadius: "10px",
									fontSize: "12px",
									fontFamily: "JetBrains Mono Variable, monospace",
									boxShadow: "var(--shadow-card)",
									color: "var(--ink)"
								},
								labelStyle: {
									color: "var(--ink-muted)",
									marginBottom: 4
								}
							}),
							metricView === "resources" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: "memPct",
								name: "内存 (%)",
								stroke: "var(--accent)",
								strokeWidth: 2,
								fill: "url(#opsGradAccent)",
								isAnimationActive: false
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: "cpuPct",
								name: "CPU (%)",
								stroke: "var(--ok-dot)",
								strokeWidth: 1.75,
								fill: "url(#opsGradOk)",
								isAnimationActive: false
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: "rttMs",
								name: "探针延迟 (ms)",
								stroke: "var(--accent)",
								strokeWidth: 2,
								fill: "url(#opsGradAccent)",
								isAnimationActive: false
							})
						]
					})
				})
			})]
		})
	});
}
export { MetricsChart };
