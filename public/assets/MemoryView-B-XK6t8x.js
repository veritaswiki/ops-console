const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ArchitectureGraph-Bi6KwZoe.js","assets/rolldown-runtime-Bl4WtXjF.js","assets/vendor-charts-Cc1dpEBz.js","assets/vendor-flow-aUB-QjJm.js","assets/vendor-ui-DUVxOpTN.js","assets/vendor-motion-BAjclsVr.js","assets/app-nZGM7CNZ.js","assets/vendor-react-D8TP-cyN.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { At as FlaskConical, Bt as Copy, L as Stethoscope, T as __vitePreload, Y as Search } from "./vendor-ui-DUVxOpTN.js";
import { A as formatInteger, H as compareMemoryRetrieval, Ht as searchMemory, I as FOCUS_RING, It as runMemoryDoctor, L as cn, O as formatCompactNumber, U as copyToClipboard, _ as StatusIndicator, b as WidgetSkeleton, g as SegmentedFilter, l as Button, m as Panel, t as ModuleFrame, u as EmptyState, x as inputBaseClass } from "./app-nZGM7CNZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/MemoryView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var COMPARE_PRESETS = [
	"gateway circuit breaker",
	"tailnet binding policy",
	"structured logging"
];
var ArchitectureGraph = import_react.lazy(() => __vitePreload(() => import("./ArchitectureGraph-Bi6KwZoe.js").then((m) => ({ default: m.ArchitectureGraph })), __vite__mapDeps([0,1,2,3,4,5,6,7])));
var PROVIDERS = [
	{
		value: "all",
		label: "联合检索"
	},
	{
		value: "nmem",
		label: "Nowledge Mem"
	},
	{
		value: "openviking",
		label: "OpenViking"
	}
];
function MemoryView({ snapshot, readOnly, onToast }) {
	const [provider, setProvider] = import_react.useState("all");
	const [query, setQuery] = import_react.useState("");
	const [searching, setSearching] = import_react.useState(false);
	const [results, setResults] = import_react.useState(null);
	const [doctorBusy, setDoctorBusy] = import_react.useState(false);
	const [doctorOutput, setDoctorOutput] = import_react.useState("");
	const [compareQuery, setCompareQuery] = import_react.useState("gateway circuit breaker");
	const [comparing, setComparing] = import_react.useState(false);
	const [compareRes, setCompareRes] = import_react.useState(null);
	const mem = snapshot?.memory;
	const handleSearch = async (e) => {
		e.preventDefault();
		const q = query.trim();
		if (!q) return;
		setSearching(true);
		try {
			const res = await searchMemory(q, provider);
			setResults(res.results || res.items || []);
		} catch (err) {
			onToast(`检索失败：${err.message}`, "err");
		} finally {
			setSearching(false);
		}
	};
	const runCompareQuery = async (rawQuery) => {
		const q = rawQuery.trim();
		if (!q) return;
		setCompareQuery(q);
		setComparing(true);
		try {
			const res = await compareMemoryRetrieval(q);
			setCompareRes(res);
		} catch (err) {
			onToast(`召回对比失败：${err.message}`, "err");
		} finally {
			setComparing(false);
		}
	};
	const handleCompare = async (e) => {
		e.preventDefault();
		await runCompareQuery(compareQuery);
	};
	const handleCopyCompareJson = async () => {
		if (!compareRes) return;
		if (await copyToClipboard(JSON.stringify(compareRes, null, 2))) onToast("已复制召回评测 JSON 报告", "ok");
	};
	const handleDoctor = async () => {
		if (readOnly) {
			onToast("只读模式已禁用官方自检命令", "err");
			return;
		}
		setDoctorBusy(true);
		try {
			const res = await runMemoryDoctor();
			const text = res.output || res.raw || (res.results ? JSON.stringify(res.results, null, 2) : "已完成官方接口诊断。");
			setDoctorOutput(text);
			onToast("记忆引擎官方自检已完成", "ok");
		} catch (err) {
			onToast(`自检失败：${err.message}`, "err");
		} finally {
			setDoctorBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ModuleFrame, {
		title: "记忆与上下文引擎",
		description: "按需启用可选记忆引擎插件（Nowledge Mem、OpenViking、Symbiote、Rerank），通过官方 REST API 与 CLI 采集并进行跨引擎召回质量对照评估。",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			variant: "secondary",
			size: "md",
			onClick: handleDoctor,
			disabled: doctorBusy || readOnly,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stethoscope, {
				className: "size-4 text-[var(--accent)]",
				strokeWidth: 1.75
			}), doctorBusy ? "诊断中..." : "运行官方自检"]
		}),
		children: [
			doctorOutput && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "官方诊断报告",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: () => setDoctorOutput(""),
					children: "收起"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "m-0 rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-4 font-mono text-[12px] overflow-x-auto whitespace-pre-wrap max-h-[260px]",
					children: doctorOutput
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "跨引擎召回与 Rerank 重排对比实验室",
				description: "并行向 Nowledge Mem 与 OpenViking 发起相同查询，量化重排模型 (Rerank) 带来的排序增益与端到端耗时。",
				actions: compareRes ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums",
						children: [
							"nmem ",
							compareRes.timingsMs.nmem,
							"ms · ov ",
							compareRes.timingsMs.openviking,
							"ms · rerank ",
							compareRes.timingsMs.rerank,
							"ms"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: handleCopyCompareJson,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
							className: "size-3.5",
							strokeWidth: 1.75
						}), "复制 JSON"]
					})]
				}) : void 0,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleCompare,
						className: "flex flex-wrap items-center gap-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative flex-1 min-w-[220px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlaskConical, {
								className: "size-4 text-[var(--accent)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
								strokeWidth: 1.75
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "search",
								value: compareQuery,
								onChange: (e) => setCompareQuery(e.target.value),
								placeholder: "输入测试 Query，对比两路召回与 Rerank 重排得分...",
								"aria-label": "跨引擎召回对比查询",
								"data-testid": "memory-compare-input",
								className: cn("w-full h-10 pl-9 pr-3", inputBaseClass)
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							variant: "primary",
							size: "lg",
							disabled: comparing || !compareQuery.trim(),
							"data-testid": "memory-compare-submit",
							children: comparing ? "评测中..." : "运行召回对比"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2.5 flex flex-wrap items-center gap-2 text-[12px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[var(--ink-subtle)]",
							children: "快速评测集："
						}), COMPARE_PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: comparing,
							onClick: () => void runCompareQuery(preset),
							className: cn("px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] font-mono text-[11.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-colors cursor-pointer whitespace-nowrap", FOCUS_RING),
							children: preset
						}, preset))]
					}),
					compareRes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 pt-4 border-t border-[var(--border-subtle)] overflow-x-auto",
						"data-testid": "memory-compare-results",
						children: compareRes.items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "未检索到可供重排对比的候选项。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-left border-collapse",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 pr-3",
										children: "候选片段"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-3",
										children: "来源"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-3 text-right",
										children: "Nmem"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-3 text-right",
										children: "OpenViking"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 px-3 text-right",
										children: "Rerank 终分"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2 pl-3 text-right",
										children: "重排增益"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-[var(--border-subtle)] text-[13px]",
								children: compareRes.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2.5 pr-3 max-w-[340px]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-medium text-[var(--ink)] truncate",
												title: item.title,
												children: item.title
											}), item.snippet && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[12px] text-[var(--ink-subtle)] truncate",
												title: item.snippet,
												children: item.snippet
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] whitespace-nowrap",
											children: item.source
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums",
											children: item.nmemScore.toFixed(3)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums",
											children: item.ovScore.toFixed(3)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 text-right font-mono text-[12.5px] font-semibold text-[var(--ink)] tabular-nums",
											children: item.rerankScore.toFixed(3)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: cn("py-2.5 pl-3 text-right font-mono text-[12px] font-medium tabular-nums whitespace-nowrap", item.delta >= 0 ? "text-[var(--ok)]" : "text-[var(--err)]"),
											children: item.delta >= 0 ? `+${item.delta.toFixed(3)}` : item.delta.toFixed(3)
										})
									]
								}, item.id))
							})]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "跨引擎联合记忆检索",
				description: "实时调用 nmem 与 OpenViking 原生检索接口，返回相关度排序结果。",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
					value: provider,
					onChange: setProvider,
					options: PROVIDERS,
					ariaLabel: "记忆检索来源"
				}),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSearch,
					className: "flex flex-wrap items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex-1 min-w-[220px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							className: "size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
							strokeWidth: 1.75
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "search",
							value: query,
							onChange: (e) => setQuery(e.target.value),
							placeholder: "输入关键词语义检索记忆库、对话历史或技能上下文...",
							"aria-label": "记忆关键词检索",
							className: cn("w-full h-10 pl-9 pr-3", inputBaseClass)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "primary",
						size: "lg",
						disabled: searching || !query.trim(),
						children: searching ? "检索中..." : "执行检索"
					})]
				}), results !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 pt-4 border-t border-[var(--border-subtle)]",
					children: results.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						title: "未检索到匹配条目",
						message: "可以尝试更换关键词或切换到「联合检索」扩大范围。",
						action: {
							label: "清空检索词",
							onClick: () => {
								setQuery("");
								setResults(null);
							}
						}
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "divide-y divide-[var(--border-subtle)]",
						children: results.map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "py-3 first:pt-0 last:pb-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-baseline justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium text-[13.5px] text-[var(--ink)] truncate max-w-full",
									children: item.title || item.uri || item.path || `结果 #${idx + 1}`
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0",
									children: [
										item.provider || item.engine,
										item.space,
										item.score != null ? `score ${Number(item.score).toFixed(3)}` : null
									].filter(Boolean).join(" · ")
								})]
							}), (item.snippet || item.content) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[13px] text-[var(--ink-muted)] line-clamp-3 text-pretty",
								children: item.snippet || item.content
							})]
						}, `${item.uri || item.title}-${idx}`))
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "记忆链路与底层索引拓扑",
				description: "展示活跃 Agent 到记忆引擎、向量索引、文档库与重排服务的调用关系。",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
						heightClass: "h-[400px]",
						label: "正在加载记忆链路拓扑"
					}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArchitectureGraph, {
						snapshot,
						mode: "memory"
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "Nowledge Mem",
						description: mem?.nmem?.protocol || "REST API + nmem CLI",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: mem?.nmem?.status || (mem?.nmem?.reachable ? "healthy" : "offline") }),
						children: !mem?.nmem?.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "Nowledge Mem 连接器未启用。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "grid grid-cols-3 gap-4 pb-4 border-b border-[var(--border-subtle)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[12px] text-[var(--ink-subtle)]",
											children: "长期记忆"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate",
											title: formatInteger(mem.nmem.stats?.memories),
											children: formatCompactNumber(mem.nmem.stats?.memories)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[12px] text-[var(--ink-subtle)]",
											children: "对话线程"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate",
											children: formatCompactNumber(mem.nmem.stats?.threads)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[12px] text-[var(--ink-subtle)]",
											children: "知识空间"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate",
											children: formatCompactNumber(mem.nmem.spaces?.length ?? mem.nmem.stats?.spaces)
										})]
									})
								]
							}), mem.nmem.spaces && mem.nmem.spaces.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-[12.5px] font-semibold text-[var(--ink-muted)] mb-2",
								children: "空间分布"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "divide-y divide-[var(--border-subtle)] text-[13px]",
								children: mem.nmem.spaces.slice(0, 6).map((sp, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "py-2 flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink)] font-medium truncate",
										children: sp.name || sp.id
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums shrink-0",
										children: [formatInteger(sp.count ?? sp.memoryCount ?? 0), " 条"]
									})]
								}, sp.id || sp.name || i))
							})] })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "OpenViking",
						description: mem?.openviking?.protocol || "HTTP API + ov CLI",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: mem?.openviking?.status || (mem?.openviking?.reachable ? "healthy" : "offline") }),
						children: !mem?.openviking?.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "OpenViking 连接器未启用。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "grid grid-cols-3 gap-4 pb-4 border-b border-[var(--border-subtle)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[12px] text-[var(--ink-subtle)]",
											children: "VikingDB 向量"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate",
											title: formatInteger(mem.openviking.vikingdb?.vectorCount),
											children: formatCompactNumber(mem.openviking.vikingdb?.vectorCount)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[12px] text-[var(--ink-subtle)]",
											children: "已载入技能"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate",
											children: formatCompactNumber(mem.openviking.skillsCount ?? 0)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[12px] text-[var(--ink-subtle)]",
											children: "待处理队列"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate",
											children: formatCompactNumber(mem.openviking.queue?.pending ?? 0)
										})]
									})
								]
							}), mem.openviking.skills && mem.openviking.skills.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-[12.5px] font-semibold text-[var(--ink-muted)] mb-2",
								children: "技能索引"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "divide-y divide-[var(--border-subtle)] text-[13px]",
								children: mem.openviking.skills.slice(0, 6).map((sk, idx) => {
									const name = typeof sk === "string" ? sk : sk.name || sk.id || `Skill ${idx + 1}`;
									const desc = typeof sk === "string" ? "" : sk.description || "";
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "py-2 flex items-baseline justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[12.5px] text-[var(--ink)] shrink-0",
											children: name
										}), desc && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[12.5px] text-[var(--ink-subtle)] truncate",
											title: desc,
											children: desc
										})]
									}, name);
								})
							})] })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "Symbiote",
						description: mem?.symbiote?.protocol || "HTTP /api/health",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: mem?.symbiote?.status || (mem?.symbiote?.reachable ? "healthy" : "offline") }),
						children: !mem?.symbiote?.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "Symbiote 连接器未启用。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "grid grid-cols-3 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-[12px] text-[var(--ink-subtle)]",
										children: "Vault 文档数"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate",
										title: formatInteger(mem.symbiote.vaultFileCount),
										children: formatCompactNumber(mem.symbiote.vaultFileCount)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-[12px] text-[var(--ink-subtle)]",
										children: "运行模式"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] truncate",
										children: mem.symbiote.mode || "-"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-[12px] text-[var(--ink-subtle)]",
										children: "接口延迟"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] tabular-nums truncate",
										children: mem.symbiote.latencyMs != null ? `${mem.symbiote.latencyMs}ms` : "-"
									})]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "Rerank 语义重排",
						description: mem?.rerank?.protocol || "HTTP /health",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: mem?.rerank?.status || (mem?.rerank?.reachable ? "healthy" : "offline") }),
						children: !mem?.rerank?.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "Rerank 重排服务未启用。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "grid grid-cols-3 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "col-span-2 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-[12px] text-[var(--ink-subtle)]",
									children: "重排模型"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] truncate",
									title: mem.rerank.model || "Ready",
									children: mem.rerank.model || "Ready"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-[12px] text-[var(--ink-subtle)]",
									children: "推理延迟"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: "mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] tabular-nums truncate",
									children: mem.rerank.latencyMs != null ? `${mem.rerank.latencyMs}ms` : "-"
								})]
							})]
						})
					})
				]
			})
		]
	});
}
export { MemoryView };
