import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { Bt as Copy, Ft as Download, Jt as Check, P as Trash, R as Square, Y as Search, Zt as BookmarkPlus, at as Play, et as Radio } from "./vendor-ui-DUVxOpTN.js";
import { B as buildLogStreamUrl, D as formatClock, I as FOCUS_RING, L as cn, S as countLogLevels, U as copyToClipboard, d as ErrorState, g as SegmentedFilter, l as Button, m as Panel, t as ModuleFrame, v as ToggleSwitch, vt as fetchLogs, x as inputBaseClass } from "./app-nZGM7CNZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/lib/virtual-list.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* Pure virtual list window calculator for high-throughput log & table viewports.
* Returns inclusive [startIndex, endIndex) bounds with overscan clamping.
*/
function computeVisibleRange({ scrollTop, viewportHeight, itemCount, itemHeight, overscan = 10 }) {
	const safeCount = Math.max(0, Math.floor(itemCount));
	const safeItemHeight = Math.max(1, itemHeight);
	const totalHeight = safeCount * safeItemHeight;
	if (safeCount === 0) return {
		startIndex: 0,
		endIndex: 0,
		offsetTop: 0,
		totalHeight: 0
	};
	const safeScrollTop = Math.max(0, Math.min(scrollTop, Math.max(0, totalHeight - viewportHeight)));
	const safeViewport = Math.max(safeItemHeight, viewportHeight);
	const safeOverscan = Math.max(0, Math.floor(overscan));
	const rawStart = Math.floor(safeScrollTop / safeItemHeight);
	const visibleCount = Math.ceil(safeViewport / safeItemHeight);
	const startIndex = Math.max(0, rawStart - safeOverscan);
	return {
		startIndex,
		endIndex: Math.min(safeCount, rawStart + visibleCount + safeOverscan),
		offsetTop: startIndex * safeItemHeight,
		totalHeight
	};
}
// web/views/LogsView.tsx
var import_jsx_runtime = require_jsx_runtime();
var VIRTUAL_THRESHOLD = 50;
var LOG_ROW_HEIGHT = 26;
var LOG_VIEWPORT_HEIGHT = 460;
function buildLogHistogram(entries, bucketCount = 16) {
	if (entries.length === 0) return [];
	const parsed = entries.map((e, idx) => {
		const raw = e.ts || e.timestamp;
		const ms = raw ? Date.parse(raw) : NaN;
		const lv = String(e.level || e.severity || "info").toLowerCase();
		return {
			ms,
			idx,
			kind: lv.includes("err") || lv.includes("crit") || lv.includes("fatal") ? "error" : lv.includes("warn") ? "warn" : "info"
		};
	});
	const validMs = parsed.filter((p) => Number.isFinite(p.ms)).map((p) => p.ms);
	const useTime = validMs.length >= 2 && Math.max(...validMs) > Math.min(...validMs);
	const minVal = useTime ? Math.min(...validMs) : 0;
	const maxVal = useTime ? Math.max(...validMs) : Math.max(1, entries.length - 1);
	const span = Math.max(1, maxVal - minVal);
	const buckets = Array.from({ length: bucketCount }, (_, i) => {
		const startMs = useTime ? minVal + span * i / bucketCount : 0;
		return {
			label: useTime ? formatClock(new Date(startMs).toISOString()) : `#${i + 1}`,
			total: 0,
			error: 0,
			warn: 0,
			info: 0
		};
	});
	for (const item of parsed) {
		const pos = useTime && Number.isFinite(item.ms) ? (item.ms - minVal) / span : item.idx / Math.max(1, entries.length - 1);
		const b = buckets[Math.min(bucketCount - 1, Math.max(0, Math.floor(pos * bucketCount)))];
		b.total += 1;
		if (item.kind === "error") b.error += 1;
		else if (item.kind === "warn") b.warn += 1;
		else b.info += 1;
	}
	return buckets;
}
var LOG_SOURCES = [
	{
		value: "service",
		label: "服务日志 (journald)"
	},
	{
		value: "file",
		label: "日志文件"
	},
	{
		value: "memory",
		label: "记忆引擎"
	}
];
var PRESETS_STORAGE_KEY = "ops-console-log-presets-v1";
function loadSavedPresets() {
	try {
		const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
	} catch {
		return [];
	}
}
function persistSavedPresets(presets) {
	try {
		window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.slice(0, 12)));
	} catch {}
}
function LogsView({ snapshot, meta, initialUnit, initialLevel = "all", requestNonce = 0, onToast }) {
	const [source, setSource] = import_react.useState("service");
	const [target, setTarget] = import_react.useState(initialUnit || "");
	const [since, setSince] = import_react.useState("30m");
	const [level, setLevel] = import_react.useState(initialLevel || "all");
	const [query, setQuery] = import_react.useState("");
	const [regex, setRegex] = import_react.useState(false);
	const [autoScroll, setAutoScroll] = import_react.useState(true);
	const [correlationMode, setCorrelationMode] = import_react.useState(false);
	const [entries, setEntries] = import_react.useState([]);
	const [loading, setLoading] = import_react.useState(false);
	const [queryError, setQueryError] = import_react.useState("");
	const [streaming, setStreaming] = import_react.useState(false);
	const [scrollTop, setScrollTop] = import_react.useState(0);
	const [presets, setPresets] = import_react.useState(() => loadSavedPresets());
	const [presetName, setPresetName] = import_react.useState("");
	const [copiedRowKey, setCopiedRowKey] = import_react.useState("");
	const esRef = import_react.useRef(null);
	const queryAbortRef = import_react.useRef(null);
	const scrollRafRef = import_react.useRef(null);
	const viewportRef = import_react.useRef(null);
	const targetOptions = import_react.useMemo(() => {
		if (source === "file") return (meta?.logSources?.files || []).map((f) => ({
			value: f.id,
			label: f.name || f.id
		}));
		if (source === "memory") return (meta?.logSources?.memory || [{
			id: "nmem",
			name: "Nowledge Mem"
		}, {
			id: "openviking",
			name: "OpenViking"
		}]).map((m) => ({
			value: m.id,
			label: m.name || m.id
		}));
		return [{
			value: "all",
			label: "全部受管服务 (all)"
		}, ...(meta?.logSources?.services || snapshot?.services?.items || []).map((s) => ({
			value: s.unit || s.id,
			label: s.name ? `${s.name} (${s.unit || s.id})` : s.unit || s.id
		}))];
	}, [
		source,
		meta,
		snapshot
	]);
	import_react.useEffect(() => {
		if (initialUnit) {
			setSource("service");
			setTarget(initialUnit);
		}
		if (initialLevel) setLevel(initialLevel);
	}, [
		initialUnit,
		initialLevel,
		requestNonce
	]);
	import_react.useEffect(() => {
		if (!targetOptions.length) return;
		if (!target || !targetOptions.some((o) => o.value === target)) setTarget(targetOptions[0].value);
	}, [targetOptions, target]);
	const stopStream = import_react.useCallback(() => {
		if (esRef.current) {
			esRef.current.close();
			esRef.current = null;
		}
		setStreaming(false);
	}, []);
	import_react.useEffect(() => {
		return () => {
			stopStream();
			queryAbortRef.current?.abort();
			if (scrollRafRef.current != null) window.cancelAnimationFrame(scrollRafRef.current);
		};
	}, [stopStream]);
	const runQuery = import_react.useCallback(async () => {
		if (!target) return;
		stopStream();
		queryAbortRef.current?.abort();
		const controller = new AbortController();
		queryAbortRef.current = controller;
		setLoading(true);
		setQueryError("");
		try {
			const res = await fetchLogs({
				source,
				target,
				since,
				level,
				q: query,
				regex,
				lines: 200
			}, controller.signal);
			if (!controller.signal.aborted) setEntries(res.entries || res.items || res.lines || []);
		} catch (err) {
			if (controller.signal.aborted || err?.name === "AbortError") return;
			const msg = err.message || "日志接口异常";
			setQueryError(msg);
			onToast(`日志查询失败：${msg}`, "err");
		} finally {
			if (!controller.signal.aborted) setLoading(false);
		}
	}, [
		source,
		target,
		since,
		level,
		query,
		regex,
		stopStream,
		onToast
	]);
	import_react.useEffect(() => {
		if (target) runQuery();
	}, [
		source,
		target,
		since,
		level
	]);
	const handleViewportScroll = import_react.useCallback((e) => {
		const nextTop = e.currentTarget.scrollTop;
		if (scrollRafRef.current != null) return;
		scrollRafRef.current = window.requestAnimationFrame(() => {
			scrollRafRef.current = null;
			setScrollTop(nextTop);
		});
	}, []);
	import_react.useEffect(() => {
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
		const url = buildLogStreamUrl({
			source,
			target,
			level,
			q: query,
			regex
		});
		const es = new EventSource(url);
		esRef.current = es;
		setStreaming(true);
		const onLine = (ev) => {
			try {
				const parsed = JSON.parse(ev.data);
				setEntries((prev) => [...prev.slice(-400), parsed]);
			} catch {
				setEntries((prev) => [...prev.slice(-400), {
					message: String(ev.data),
					level: "info"
				}]);
			}
		};
		es.addEventListener("log", onLine);
		es.onmessage = onLine;
		es.onerror = () => {
			stopStream();
			onToast("实时日志流已断开", "info");
		};
	};
	const handleSavePreset = () => {
		const label = presetName.trim() || `${target || source} · ${level.toUpperCase()}`;
		const updated = [{
			id: `preset-${Date.now()}`,
			name: label,
			source,
			target,
			since,
			level,
			query,
			regex
		}, ...presets].slice(0, 8);
		setPresets(updated);
		persistSavedPresets(updated);
		setPresetName("");
		onToast(`已保存常用筛选视图「${label}」`, "ok");
	};
	const handleApplyPreset = (preset) => {
		stopStream();
		setSource(preset.source);
		setTarget(preset.target);
		setSince(preset.since);
		setLevel(preset.level);
		setQuery(preset.query);
		setRegex(preset.regex);
		onToast(`已应用筛选视图「${preset.name}」`, "info");
	};
	const handleDeletePreset = (id) => {
		const updated = presets.filter((p) => p.id !== id);
		setPresets(updated);
		persistSavedPresets(updated);
	};
	const exportJsonl = () => {
		const content = entries.map((e) => JSON.stringify(e)).join("\n");
		const blob = new Blob([content], { type: "application/x-ndjson;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ops-logs-${target || source}.jsonl`;
		a.click();
		URL.revokeObjectURL(url);
		onToast(`已导出 ${entries.length} 条日志`, "ok");
	};
	const counts = import_react.useMemo(() => countLogLevels(entries), [entries]);
	const histogram = import_react.useMemo(() => buildLogHistogram(entries, 16), [entries]);
	const maxBucketTotal = import_react.useMemo(() => Math.max(1, ...histogram.map((b) => b.total)), [histogram]);
	const handleCopyLogRow = async (rowKey, entry) => {
		const line = `${entry.ts || entry.timestamp || ""} [${String(entry.level || "info").toUpperCase()}] ${entry.unit ? `${entry.unit}: ` : ""}${entry.message || entry.raw || ""}`.trim();
		if (await copyToClipboard(line)) {
			setCopiedRowKey(rowKey);
			onToast("已复制该条结构化日志", "ok");
			window.setTimeout(() => setCopiedRowKey((cur) => cur === rowKey ? "" : cur), 1400);
		}
	};
	const handleToggleLevelFacet = (clickedLevel) => {
		const normalized = clickedLevel.toLowerCase();
		const mapped = normalized.includes("err") || normalized.includes("crit") || normalized.includes("fatal") ? "error" : normalized.includes("warn") ? "warn" : "info";
		setLevel((prev) => prev === mapped ? "all" : mapped);
	};
	const handleFilterUnitFacet = (unit) => {
		if (!unit || source !== "service") return;
		if (targetOptions.some((o) => o.value === unit)) setTarget(unit);
		else setQuery(unit);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModuleFrame, {
		title: "结构化日志中心",
		description: "支持 journald、白名单文件与记忆引擎日志查询、频次直方图、点击单元快筛、常用视图保存及 SSE 实时追踪。",
		meta: `总计 ${counts.total} · 错误 ${counts.error} · 警告 ${counts.warn} · 信息 ${counts.info}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			bodyClassName: "p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
					value: source,
					onChange: (next) => {
						stopStream();
						setSource(next);
					},
					options: LOG_SOURCES,
					ariaLabel: "日志源切换"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleSwitch, {
							checked: regex,
							onCheckedChange: setRegex,
							label: "正则匹配"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleSwitch, {
							checked: correlationMode,
							onCheckedChange: setCorrelationMode,
							label: "异常关联高亮"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleSwitch, {
							checked: autoScroll,
							onCheckedChange: setAutoScroll,
							label: "自动滚底"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							onClick: exportJsonl,
							disabled: entries.length === 0,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
								className: "size-4",
								strokeWidth: 1.75
							}), "导出 JSONL"]
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-5 sm:p-6 space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: (e) => {
							e.preventDefault();
							runQuery();
						},
						className: "flex flex-wrap items-center gap-2.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: target,
								onChange: (e) => setTarget(e.target.value),
								"aria-label": "日志目标单元",
								className: cn("ui-select h-9 min-w-[200px] pl-3 cursor-pointer", inputBaseClass),
								children: targetOptions.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: opt.value,
									children: opt.label
								}, opt.value))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: since,
								onChange: (e) => setSince(e.target.value),
								"aria-label": "时间范围",
								className: cn("ui-select h-9 pl-2.5 cursor-pointer", inputBaseClass),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "15m",
										children: "近 15 分钟"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "30m",
										children: "近 30 分钟"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "2h",
										children: "近 2 小时"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "24h",
										children: "近 24 小时"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: level,
								onChange: (e) => setLevel(e.target.value),
								"aria-label": "日志级别",
								className: cn("ui-select h-9 pl-2.5 cursor-pointer", inputBaseClass),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "all",
										children: "全部级别"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "error",
										children: "ERROR"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "warn",
										children: "WARN"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "info",
										children: "INFO"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative flex-1 min-w-[200px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
									className: "size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
									strokeWidth: 1.75
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "search",
									value: query,
									onChange: (e) => setQuery(e.target.value),
									placeholder: regex ? "输入正则表达式过滤..." : "输入关键词过滤日志...",
									"aria-label": "过滤日志关键词",
									className: cn("w-full h-9 pl-9 pr-3", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "submit",
								variant: "primary",
								size: "md",
								disabled: loading,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
									className: "size-3.5 translate-x-[1px]",
									strokeWidth: 1.75
								}), loading ? "查询中..." : "查询"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: streaming ? "danger" : "secondary",
								size: "md",
								onClick: toggleStream,
								children: [streaming ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, {
									className: "size-3.5",
									strokeWidth: 1.75
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, {
									className: "size-4 text-[var(--accent)]",
									strokeWidth: 1.75
								}), streaming ? "停止实时流" : "实时流 (SSE)"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--border-subtle)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[12px] font-medium text-[var(--ink-subtle)] shrink-0",
								children: "常用视图"
							}), presets.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[12px] text-[var(--ink-subtle)]",
								children: "可将当前过滤条件存为快捷视图"
							}) : presets.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] overflow-hidden text-[12px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => handleApplyPreset(p),
									className: cn("px-2.5 py-1 text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors duration-150 cursor-pointer", FOCUS_RING),
									children: p.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => handleDeletePreset(p.id),
									"aria-label": `删除视图 ${p.name}`,
									className: "px-1.5 py-1 text-[var(--ink-subtle)] hover:text-[var(--err)] transition-colors duration-150 cursor-pointer border-l border-[var(--border-subtle)]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, {
										className: "size-3",
										strokeWidth: 1.75
									})
								})]
							}, p.id))]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5 shrink-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								value: presetName,
								onChange: (e) => setPresetName(e.target.value),
								placeholder: "视图名称（可选）",
								"aria-label": "保存筛选视图名称",
								"data-testid": "log-preset-name",
								className: cn("h-8 w-36 px-2.5 sm:text-[12px]", inputBaseClass)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "secondary",
								size: "sm",
								onClick: handleSavePreset,
								"data-testid": "save-log-preset",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookmarkPlus, {
									className: "size-3.5 text-[var(--accent)]",
									strokeWidth: 1.75
								}), "保存当前视图"]
							})]
						})]
					}),
					histogram.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg bg-[var(--surface-subtle)]/70 px-3.5 py-2.5 space-y-1.5",
						"aria-label": "日志时段频次直方图",
						"data-testid": "log-volume-histogram",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--ink-subtle)] tabular-nums select-none",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "时段日志分布（点击下方日志级别或服务单元可快速过滤）" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								histogram[0]?.label,
								" — ",
								histogram[histogram.length - 1]?.label
							] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-16 items-end gap-1 h-8",
							children: histogram.map((b, i) => {
								const totalH = b.total > 0 ? Math.max(12, Math.round(b.total / maxBucketTotal * 100)) : 0;
								const errPct = b.total > 0 ? Math.round(b.error / b.total * 100) : 0;
								const warnPct = b.total > 0 ? Math.round(b.warn / b.total * 100) : 0;
								const infoPct = Math.max(0, 100 - errPct - warnPct);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full flex items-end",
									title: `${b.label} · 共 ${b.total} 条（错误 ${b.error} / 警告 ${b.warn} / 信息 ${b.info}）`,
									children: b.total > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "w-full rounded-[2px] overflow-hidden flex flex-col justify-end transition-opacity hover:opacity-85",
										style: { height: `${totalH}%` },
										children: [
											errPct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "w-full bg-rose-500/85",
												style: { height: `${errPct}%` }
											}),
											warnPct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "w-full bg-amber-400/80",
												style: { height: `${warnPct}%` }
											}),
											infoPct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "w-full bg-sky-400/55",
												style: { height: `${infoPct}%` }
											})
										]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full h-[2px] rounded-full bg-[var(--border-subtle)]/70" })
								}, `${b.label}-${i}`);
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						ref: viewportRef,
						onScroll: handleViewportScroll,
						className: "rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-[var(--border)] h-[460px] overflow-auto p-4 font-mono text-[12.5px] leading-[1.6]",
						role: "log",
						"aria-label": "日志输出终端",
						children: queryError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full flex items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
								title: "日志查询失败",
								message: queryError,
								onRetry: () => void runQuery(),
								retrying: loading
							})
						}) : entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full flex items-center justify-center text-zinc-400",
							children: loading ? "正在采集日志..." : "当前筛选条件下暂无日志输出。"
						}) : entries.length > VIRTUAL_THRESHOLD ? (() => {
							const { startIndex, endIndex, offsetTop, totalHeight } = computeVisibleRange({
								scrollTop,
								viewportHeight: LOG_VIEWPORT_HEIGHT,
								itemCount: entries.length,
								itemHeight: LOG_ROW_HEIGHT,
								overscan: 12
							});
							const slice = entries.slice(startIndex, endIndex);
							const showUnitCol = source === "service" && target === "all";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									height: `${totalHeight}px`,
									position: "relative"
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									style: {
										transform: `translate3d(0, ${offsetTop}px, 0)`,
										willChange: "transform"
									},
									children: slice.map((entry, offset) => {
										const idx = startIndex + offset;
										const rowKey = `${entry.ts || entry.timestamp || idx}-${idx}`;
										const lv = String(entry.level || entry.severity || "INFO").toUpperCase();
										const isErr = lv.includes("ERR") || lv.includes("CRIT") || lv.includes("FATAL");
										const isWarn = lv.includes("WARN");
										const lvClass = isErr ? "text-rose-400" : isWarn ? "text-amber-300" : lv.includes("DEBUG") ? "text-zinc-400" : "text-sky-400";
										const rowHighlight = correlationMode ? isErr ? "bg-rose-500/[0.12] rounded-sm px-1.5 -mx-1.5" : isWarn ? "bg-amber-500/[0.10] rounded-sm px-1.5 -mx-1.5" : "opacity-55" : "";
										const msg = entry.message || entry.raw || "";
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											style: { height: `${LOG_ROW_HEIGHT}px` },
											className: cn("group grid items-center gap-2.5 border-b border-white/[0.04]", showUnitCol ? "grid-cols-[68px_48px_132px_1fr_24px]" : "grid-cols-[68px_48px_1fr_24px]", rowHighlight),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-zinc-500 select-none tabular-nums",
													children: formatClock(entry.ts || entry.timestamp)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => handleToggleLevelFacet(lv),
													title: "点击按此级别快筛",
													className: cn("text-left font-semibold select-none hover:underline cursor-pointer", lvClass),
													children: lv.slice(0, 5)
												}),
												showUnitCol && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => handleFilterUnitFacet(entry.unit),
													title: `点击仅看 ${entry.unit || "该服务"} 日志`,
													className: "text-left text-zinc-400 hover:text-zinc-100 truncate cursor-pointer",
													children: entry.unit || "-"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "truncate text-zinc-200",
													title: msg,
													children: msg
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => void handleCopyLogRow(rowKey, entry),
													"aria-label": "复制该行日志",
													className: "opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-opacity cursor-pointer",
													children: copiedRowKey === rowKey ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
														className: "size-3.5 text-emerald-400",
														strokeWidth: 2
													}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
														className: "size-3.5",
														strokeWidth: 1.75
													})
												})
											]
										}, rowKey);
									})
								})
							});
						})() : (() => {
							const showUnitCol = source === "service" && target === "all";
							return entries.map((entry, idx) => {
								const rowKey = `${entry.ts || entry.timestamp || idx}-${idx}`;
								const lv = String(entry.level || entry.severity || "INFO").toUpperCase();
								const isErr = lv.includes("ERR") || lv.includes("CRIT") || lv.includes("FATAL");
								const isWarn = lv.includes("WARN");
								const lvClass = isErr ? "text-rose-400" : isWarn ? "text-amber-300" : lv.includes("DEBUG") ? "text-zinc-400" : "text-sky-400";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: cn("group grid items-start gap-2.5 py-0.5 border-b border-white/[0.04] last:border-0", showUnitCol ? "grid-cols-[68px_48px_132px_1fr_24px]" : "grid-cols-[68px_48px_1fr_24px]", correlationMode ? isErr ? "bg-rose-500/[0.12] rounded-sm px-1.5 -mx-1.5" : isWarn ? "bg-amber-500/[0.10] rounded-sm px-1.5 -mx-1.5" : "opacity-55" : ""),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-zinc-500 select-none tabular-nums",
											children: formatClock(entry.ts || entry.timestamp)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => handleToggleLevelFacet(lv),
											title: "点击按此级别快筛",
											className: cn("text-left font-semibold select-none hover:underline cursor-pointer", lvClass),
											children: lv.slice(0, 5)
										}),
										showUnitCol && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => handleFilterUnitFacet(entry.unit),
											title: `点击仅看 ${entry.unit || "该服务"} 日志`,
											className: "text-left text-zinc-400 hover:text-zinc-100 truncate cursor-pointer",
											children: entry.unit || "-"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "whitespace-pre-wrap break-all text-zinc-200",
											children: entry.message || entry.raw || ""
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => void handleCopyLogRow(rowKey, entry),
											"aria-label": "复制该行日志",
											className: "opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-opacity cursor-pointer mt-0.5",
											children: copiedRowKey === rowKey ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
												className: "size-3.5 text-emerald-400",
												strokeWidth: 2
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
												className: "size-3.5",
												strokeWidth: 1.75
											})
										})
									]
								}, rowKey);
							});
						})()
					})
				]
			})]
		})
	});
}
export { LogsView };
