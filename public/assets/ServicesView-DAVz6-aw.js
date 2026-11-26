import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { Kt as ChevronRight, Y as Search, Z as RotateCw, in as ArrowDown, jt as FileText, nn as ArrowUpDown, qt as ChevronDown, tn as ArrowUp } from "./vendor-ui-DUVxOpTN.js";
import { Dt as issueConfirmToken, E as formatBytes, F as statusTone, I as FOCUS_RING, L as cn, N as layerLabel, T as filterServices, _ as StatusIndicator, ct as executeServiceAction, g as SegmentedFilter, l as Button, m as Panel, p as LatencyMeter, t as ModuleFrame, u as EmptyState, x as inputBaseClass } from "./app-nZGM7CNZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/ServicesView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var LAYER_FILTERS = [
	{
		value: "all",
		label: "全部层级"
	},
	{
		value: "core",
		label: "核心服务"
	},
	{
		value: "memory",
		label: "记忆引擎"
	},
	{
		value: "agents",
		label: "网关与 Agent"
	},
	{
		value: "network",
		label: "网络底座"
	}
];
var ACTION_LABELS = {
	start: "启动",
	stop: "停止",
	restart: "重启",
	reload: "重载配置"
};
var STATUS_SEVERITY_RANK = {
	err: 0,
	warn: 1,
	muted: 2,
	ok: 3
};
function ServicesView({ snapshot, readOnly, onRefresh, onOpenLogs, onToast, onConfirm }) {
	const [layer, setLayer] = import_react.useState("all");
	const [statusFilter, setStatusFilter] = import_react.useState("all");
	const [query, setQuery] = import_react.useState("");
	const [sortField, setSortField] = import_react.useState("status");
	const [sortDir, setSortDir] = import_react.useState("asc");
	const [expandedId, setExpandedId] = import_react.useState(null);
	const allServices = snapshot?.services?.items || [];
	const filtered = import_react.useMemo(() => {
		const base = filterServices(allServices, {
			layer,
			status: statusFilter,
			query
		});
		const dir = sortDir === "asc" ? 1 : -1;
		return [...base].sort((a, b) => {
			if (sortField === "status") {
				const ra = STATUS_SEVERITY_RANK[statusTone(a.status)] ?? 4;
				const rb = STATUS_SEVERITY_RANK[statusTone(b.status)] ?? 4;
				if (ra !== rb) return (ra - rb) * dir;
				return (a.name || a.id).localeCompare(b.name || b.id);
			}
			if (sortField === "latency") return ((a.probe?.latencyMs ?? -1) - (b.probe?.latencyMs ?? -1)) * dir;
			if (sortField === "memory") return ((a.memoryBytes ?? a.memoryCurrent ?? -1) - (b.memoryBytes ?? b.memoryCurrent ?? -1)) * dir;
			return (a.name || a.id).localeCompare(b.name || b.id) * dir;
		});
	}, [
		allServices,
		layer,
		statusFilter,
		query,
		sortField,
		sortDir
	]);
	const toggleSort = (field) => {
		if (sortField === field) setSortDir((prev) => prev === "asc" ? "desc" : "asc");
		else {
			setSortField(field);
			setSortDir(field === "latency" || field === "memory" ? "desc" : "asc");
		}
	};
	const renderSortIcon = (field) => {
		if (sortField !== field) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpDown, {
			className: "size-3 text-[var(--ink-subtle)]/70",
			strokeWidth: 1.75
		});
		return sortDir === "asc" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, {
			className: "size-3 text-[var(--accent)]",
			strokeWidth: 2
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, {
			className: "size-3 text-[var(--accent)]",
			strokeWidth: 2
		});
	};
	const hasActiveFilters = layer !== "all" || statusFilter !== "all" || query.trim().length > 0;
	const resetFilters = () => {
		setLayer("all");
		setStatusFilter("all");
		setQuery("");
	};
	const healthyCount = allServices.filter((s) => statusTone(s.status) === "ok").length;
	const issueCount = allServices.filter((s) => {
		const t = statusTone(s.status);
		return t === "err" || t === "warn";
	}).length;
	const triggerAction = (svc, action) => {
		if (!action) return;
		if (readOnly) {
			onToast("当前处于只读模式，已拦截写操作", "err");
			return;
		}
		const isCritical = svc.risk === "critical" || svc.critical;
		const isDestructive = action === "stop" || isCritical && action === "restart";
		const requireToken = isCritical && (action === "stop" || action === "restart") ? `CONFIRM:${svc.id}` : void 0;
		onConfirm({
			open: true,
			title: `${ACTION_LABELS[action] || action}服务：${svc.name || svc.id}`,
			description: `将对单元 ${svc.unit}（${svc.scope || "user"}）执行 ${action} 操作，操作结果会写入不可变审计日志。`,
			confirmLabel: `确认${ACTION_LABELS[action] || action}`,
			danger: isDestructive,
			requireToken,
			onConfirm: async () => {
				try {
					let serverToken;
					if (isCritical) serverToken = (await issueConfirmToken(svc.unit || svc.id, action)).confirmToken;
					await executeServiceAction(svc.id, action, serverToken);
					onToast(`服务 ${svc.name || svc.id} 已执行 ${ACTION_LABELS[action] || action}`, "ok");
					await onRefresh();
				} catch (err) {
					onToast(`操作失败：${err.message}`, "err");
				}
			}
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModuleFrame, {
		title: "受管服务",
		description: "systemd 单元状态、监听端口、HTTP 探针延迟与白名单生命周期控制，支持多维排序与单元详情展开。",
		meta: `健康 ${healthyCount}/${allServices.length} · 异常 ${issueCount} · 显示 ${filtered.length} 项`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			bodyClassName: "p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
					value: layer,
					onChange: setLayer,
					options: LAYER_FILTERS,
					ariaLabel: "按服务层级筛选"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2 w-full sm:w-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex-1 sm:flex-initial",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							className: "size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
							strokeWidth: 1.75
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "search",
							value: query,
							onChange: (e) => setQuery(e.target.value),
							placeholder: "搜索服务、单元或端口...",
							"aria-label": "搜索受管服务",
							className: cn("h-9 sm:h-8 w-full sm:w-56 pl-9 pr-3", inputBaseClass)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: statusFilter,
						onChange: (e) => setStatusFilter(e.target.value),
						"aria-label": "按健康状态筛选",
						className: cn("ui-select h-9 sm:h-8 pl-3 cursor-pointer", inputBaseClass),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "全部状态"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "healthy",
								children: "健康"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "degraded",
								children: "降级"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "failed",
								children: "故障"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "standby",
								children: "待机"
							})
						]
					})]
				})]
			}), filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "未找到匹配的受管服务",
				message: hasActiveFilters ? "当前层级、健康状态或关键词组合没有命中任何单元。" : "尚未在控制面配置中登记受管的 systemd 服务。",
				action: hasActiveFilters ? {
					label: "重置筛选条件",
					onClick: resetFilters
				} : void 0
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "overflow-x-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left border-collapse",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 pl-5 sm:pl-6 pr-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => toggleSort("name"),
									className: cn("inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer select-none", FOCUS_RING),
									children: ["服务与单元", renderSortIcon("name")]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-2.5 whitespace-nowrap",
								children: "层级"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-2.5 whitespace-nowrap",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => toggleSort("status"),
									className: cn("inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer select-none", FOCUS_RING),
									children: ["状态", renderSortIcon("status")]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-2.5 whitespace-nowrap",
								children: "监听端口"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-2.5 whitespace-nowrap",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => toggleSort("latency"),
									className: cn("inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer select-none", FOCUS_RING),
									children: ["探针延迟", renderSortIcon("latency")]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-2.5 text-right whitespace-nowrap",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => toggleSort("memory"),
									className: cn("inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] transition-colors cursor-pointer select-none", FOCUS_RING),
									children: ["内存", renderSortIcon("memory")]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 pl-2 pr-5 sm:pr-6 text-right whitespace-nowrap",
								children: "控制与日志"
							})
						]
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
						className: "divide-y divide-[var(--border-subtle)] text-[13px]",
						children: filtered.map((svc) => {
							const actions = svc.allowedActions || svc.actions || [
								"restart",
								"start",
								"stop"
							];
							const secondaryActions = actions.filter((a) => a !== "restart");
							const canRestart = actions.includes("restart");
							const memVal = svc.memoryBytes ?? svc.memoryCurrent;
							const portText = (svc.ports || []).slice(0, 2).join(", ") || "-";
							const isExpanded = expandedId === svc.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 pl-5 sm:pl-6 pr-2 max-w-[250px]",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-1.5 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setExpandedId(isExpanded ? null : svc.id),
												"aria-expanded": isExpanded,
												"aria-label": `${isExpanded ? "收起" : "展开"} ${svc.name || svc.id} 详情`,
												className: cn("mt-0.5 p-0.5 rounded text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer shrink-0", FOCUS_RING),
												children: isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
													className: "size-3.5",
													strokeWidth: 1.75
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
													className: "size-3.5",
													strokeWidth: 1.75
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2 min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-medium text-[var(--ink)] truncate",
														title: svc.name || svc.id,
														children: svc.name || svc.id
													}), (svc.risk === "critical" || svc.critical) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-mono text-[11px] font-medium text-[var(--warn)] shrink-0 select-none",
														children: "关键"
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "mt-0.5 font-mono text-[11.5px] text-[var(--ink-subtle)] truncate tabular-nums",
													title: `${svc.unit} · ${svc.scope || "user"}`,
													children: [
														svc.unit,
														" · ",
														svc.scope || "user",
														svc.pid ? ` · PID ${svc.pid}` : ""
													]
												})]
											})]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-2.5 text-[12.5px] text-[var(--ink-muted)] whitespace-nowrap",
										children: layerLabel(svc.layer)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-2.5 whitespace-nowrap",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: svc.status })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-2.5 font-mono text-[12px] text-[var(--ink-muted)] max-w-[155px] truncate whitespace-nowrap tabular-nums",
										title: portText,
										children: portText
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-2.5",
										children: svc.probe ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LatencyMeter, {
											latencyMs: svc.probe.latencyMs,
											statusCode: svc.probe.statusCode,
											ok: svc.probe.ok !== false,
											error: svc.probe.error
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[12px] text-[var(--ink-subtle)]",
											children: "-"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-2.5 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
										children: formatBytes(memVal)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 pl-2 pr-5 sm:pr-6 text-right whitespace-nowrap",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "inline-flex items-center justify-end gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													variant: "secondary",
													size: "sm",
													onClick: () => onOpenLogs(svc.unit),
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
														className: "size-3.5 text-[var(--ink-muted)]",
														strokeWidth: 1.75
													}), "日志"]
												}),
												canRestart && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
													variant: "secondary",
													size: "sm",
													disabled: readOnly,
													onClick: () => triggerAction(svc, "restart"),
													title: `重启 ${svc.name || svc.id}`,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCw, {
														className: "size-3.5 text-[var(--ink-muted)]",
														strokeWidth: 1.75
													}), "重启"]
												}),
												secondaryActions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
													defaultValue: "",
													disabled: readOnly,
													"aria-label": `更多操作 ${svc.name || svc.id}`,
													onChange: (e) => {
														const val = e.target.value;
														e.target.value = "";
														if (val) triggerAction(svc, val);
													},
													className: cn("ui-select h-8 pl-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[12px] text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--border-strong)] focus:border-[var(--accent)] disabled:opacity-45 cursor-pointer", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "",
														disabled: true,
														children: "更多"
													}), secondaryActions.map((act) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: act,
														children: ACTION_LABELS[act] || act
													}, act))]
												})
											]
										})
									})
								]
							}), isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
								className: "bg-[var(--surface-subtle)]/55",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									colSpan: 7,
									className: "px-5 sm:px-6 py-3.5",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-start justify-between gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
											className: "grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5 text-[12px] flex-1 min-w-[260px]",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
													className: "text-[var(--ink-subtle)]",
													children: "Systemd 状态"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
													className: "mt-0.5 font-mono text-[var(--ink)] tabular-nums",
													children: [svc.activeState, svc.subState].filter(Boolean).join(" / ") || svc.status || "-"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
													className: "text-[var(--ink-subtle)]",
													children: "角色职责"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
													className: "mt-0.5 text-[var(--ink-muted)]",
													children: svc.role || layerLabel(svc.layer)
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
													className: "text-[var(--ink-subtle)]",
													children: "全部监听端口"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
													className: "mt-0.5 font-mono text-[var(--ink)] tabular-nums",
													children: svc.ports && svc.ports.length > 0 ? svc.ports.join(", ") : "-"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
													className: "text-[var(--ink-subtle)]",
													children: "上游依赖"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
													className: "mt-0.5 font-mono text-[var(--ink-muted)]",
													children: svc.dependsOn && svc.dependsOn.length > 0 ? svc.dependsOn.join(" · ") : "无显式依赖"
												})] })
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex items-center gap-2 shrink-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												variant: "secondary",
												size: "sm",
												onClick: () => onOpenLogs(svc.unit, "error"),
												children: "查看 Error 日志"
											})
										})]
									})
								})
							})] }, svc.id);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 sm:px-6 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--ink-subtle)] select-none",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "探针延迟色阶" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-3 font-mono tabular-nums",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									className: "h-1.5 w-4 rounded-full bg-[var(--lat-fast)]",
									"aria-hidden": "true"
								}), "≤5ms 极快"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									className: "h-1.5 w-4 rounded-full bg-[var(--lat-good)]",
									"aria-hidden": "true"
								}), "≤12ms 流畅"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									className: "h-1.5 w-4 rounded-full bg-[var(--lat-moderate)]",
									"aria-hidden": "true"
								}), "≤30ms 适中"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									className: "h-1.5 w-4 rounded-full bg-[var(--lat-slow)]",
									"aria-hidden": "true"
								}), "≤80ms 偏慢"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									className: "h-1.5 w-4 rounded-full bg-[var(--lat-critical)]",
									"aria-hidden": "true"
								}), ">80ms 瓶颈"]
							})
						]
					})]
				})]
			})]
		})
	});
}
export { ServicesView };
