import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { $ as RefreshCw, J as Send, Kt as ChevronRight, O as Zap, P as Trash, Y as Search, k as X, qt as ChevronDown, rt as Plus, sn as Drawer } from "./vendor-ui-DUVxOpTN.js";
import { I as FOCUS_RING, Jt as syncMcpToNodes, L as cn, Qt as toggleMcp, Yt as testMcp, _ as StatusIndicator, f as KpiStrip, g as SegmentedFilter, j as formatRelativeAge, jt as registerMcp, l as Button, m as Panel, t as ModuleFrame, tt as deleteMcp, u as EmptyState, x as inputBaseClass, yt as fetchMcps } from "./app-nZGM7CNZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/McpView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var TRANSPORT_FILTERS = [
	{
		value: "all",
		label: "全部传输"
	},
	{
		value: "streamable-http",
		label: "Streamable HTTP"
	},
	{
		value: "stdio",
		label: "stdio"
	},
	{
		value: "sse",
		label: "SSE"
	}
];
function McpView({ snapshot, readOnly, initialNodeId = "", onSnapshotChanged, onToast, onConfirm }) {
	const fleetNodes = snapshot?.fleet?.nodes || [];
	const [data, setData] = import_react.useState(null);
	const [loading, setLoading] = import_react.useState(true);
	const [nodeFilter, setNodeFilter] = import_react.useState(initialNodeId || "all");
	const [transportFilter, setTransportFilter] = import_react.useState("all");
	const [query, setQuery] = import_react.useState("");
	const [expandedIds, setExpandedIds] = import_react.useState({});
	const [busyId, setBusyId] = import_react.useState("");
	const [registerOpen, setRegisterOpen] = import_react.useState(false);
	const [registerBusy, setRegisterBusy] = import_react.useState(false);
	const [regForm, setRegForm] = import_react.useState({
		name: "",
		transport: "streamable-http",
		endpoint: "http://100.64.0.35:8788/mcp",
		command: "npx",
		args: "-y @modelcontextprotocol/server-filesystem /srv/workspace",
		envRefs: "",
		scope: "infra",
		description: "",
		nodeIds: ["hub-primary"]
	});
	const [syncTarget, setSyncTarget] = import_react.useState(null);
	const [syncNodeIds, setSyncNodeIds] = import_react.useState([]);
	const [syncBusy, setSyncBusy] = import_react.useState(false);
	import_react.useEffect(() => {
		if (initialNodeId) setNodeFilter(initialNodeId);
	}, [initialNodeId]);
	const loadData = import_react.useCallback(async (signal) => {
		try {
			const res = await fetchMcps("", signal);
			if (!signal?.aborted) setData(res);
		} catch (err) {
			if (!signal?.aborted) onToast(`加载 MCP 清单失败：${err.message}`, "err");
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, [onToast]);
	import_react.useEffect(() => {
		const controller = new AbortController();
		loadData(controller.signal);
		return () => controller.abort();
	}, [loadData]);
	const items = data?.items || [];
	const summary = data?.summary;
	const filteredItems = import_react.useMemo(() => {
		const q = query.trim().toLowerCase();
		return items.filter((item) => {
			if (nodeFilter !== "all" && item.nodeId !== nodeFilter) return false;
			if (transportFilter !== "all" && item.transport !== transportFilter) return false;
			if (!q) return true;
			const toolNames = (item.tools || []).map((t) => t.name).join(" ");
			return `${item.name} ${item.nodeName} ${item.nodeId} ${item.endpoint || ""} ${item.command || ""} ${item.scope || ""} ${toolNames}`.toLowerCase().includes(q);
		});
	}, [
		items,
		nodeFilter,
		transportFilter,
		query
	]);
	const toggleExpand = (id) => {
		setExpandedIds((prev) => ({
			...prev,
			[id]: !prev[id]
		}));
	};
	const handleTest = async (item) => {
		setBusyId(`test:${item.id}`);
		try {
			const res = await testMcp(item.id);
			if (res.ok) onToast(`${item.name} (${item.nodeName})：${res.summary || "握手通过"}`, "ok");
			else onToast(`${item.name} 拨测失败：${res.error || "不可达"}`, "err");
			await loadData();
			onSnapshotChanged();
		} catch (err) {
			onToast(`拨测失败：${err.message}`, "err");
		} finally {
			setBusyId("");
		}
	};
	const handleToggle = async (item) => {
		if (readOnly) {
			onToast("只读模式已禁用 MCP 启停", "err");
			return;
		}
		setBusyId(`toggle:${item.id}`);
		try {
			const nextEnabled = !item.enabled;
			const res = await toggleMcp(item.id, nextEnabled);
			onToast(`${item.name} 已${nextEnabled ? "启用" : "停用"}${res.queuedCommand ? "，已入队 mcp-sync 下发至节点" : ""}`, "ok");
			await loadData();
			onSnapshotChanged();
		} catch (err) {
			onToast(`切换失败：${err.message}`, "err");
		} finally {
			setBusyId("");
		}
	};
	const handleDelete = (item) => {
		onConfirm({
			open: true,
			title: `移除 MCP 服务：${item.name}`,
			description: `将从 ${item.nodeName} (${item.nodeId}) 的控制面清单中移除该 MCP 配置。`,
			confirmLabel: "确认移除",
			danger: true,
			onConfirm: async () => {
				try {
					await deleteMcp(item.id);
					onToast(`已移除 ${item.name}`, "ok");
					await loadData();
					onSnapshotChanged();
				} catch (err) {
					onToast(`移除失败：${err.message}`, "err");
				}
			}
		});
	};
	const handleOpenSync = (item) => {
		setSyncTarget(item);
		const otherNodes = fleetNodes.filter((n) => n.id !== item.nodeId && n.deviceType !== "mobile").map((n) => n.id);
		setSyncNodeIds(otherNodes.slice(0, 1));
	};
	const handleSyncSubmit = async (e) => {
		e.preventDefault();
		if (!syncTarget || syncNodeIds.length === 0) return;
		setSyncBusy(true);
		try {
			const res = await syncMcpToNodes(syncTarget.id, syncNodeIds);
			onToast(`已同步 ${syncTarget.name} 至 ${res.synced.length} 台设备（已入队 ${res.queuedCommands.length} 条 Pull-only 同步指令）`, "ok");
			setSyncTarget(null);
			await loadData();
			onSnapshotChanged();
		} catch (err) {
			onToast(`跨节点同步失败：${err.message}`, "err");
		} finally {
			setSyncBusy(false);
		}
	};
	const handleRegisterSubmit = async (e) => {
		e.preventDefault();
		if (readOnly) {
			onToast("只读模式已禁用新增 MCP", "err");
			return;
		}
		if (regForm.nodeIds.length === 0) {
			onToast("请至少选择一个目标设备节点", "err");
			return;
		}
		setRegisterBusy(true);
		try {
			const envRefs = regForm.envRefs.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
			const res = await registerMcp({
				name: regForm.name.trim(),
				transport: regForm.transport,
				endpoint: regForm.transport === "stdio" ? void 0 : regForm.endpoint.trim(),
				command: regForm.transport === "stdio" ? regForm.command.trim() : void 0,
				args: regForm.transport === "stdio" ? regForm.args.trim() : void 0,
				nodeIds: regForm.nodeIds,
				envRefs,
				scope: regForm.scope.trim() || "custom",
				description: regForm.description.trim()
			});
			onToast(`已在 ${res.created.length} 个节点注册 MCP${res.queuedCommands.length > 0 ? `，并向远程探针入队 ${res.queuedCommands.length} 条同步指令` : ""}`, "ok");
			setRegisterOpen(false);
			setRegForm((prev) => ({
				...prev,
				name: "",
				description: "",
				envRefs: ""
			}));
			await loadData();
			onSnapshotChanged();
		} catch (err) {
			onToast(`注册失败：${err.message}`, "err");
		} finally {
			setRegisterBusy(false);
		}
	};
	const toggleNodeSelection = (nodeId, list, setter) => {
		if (list.includes(nodeId)) setter(list.filter((id) => id !== nodeId));
		else setter([...list, nodeId]);
	};
	const onlinePct = summary && summary.total > 0 ? Math.round(summary.online / summary.total * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ModuleFrame, {
		title: "全节点 MCP 管理",
		description: "统一管理主控节点、云端 VPS 与本地开发机上的所有 MCP Server，支持协议握手拨测、启停与跨设备一键同步下发。",
		meta: summary ? `${summary.online}/${summary.total} 在线 · 覆盖 ${summary.nodesCovered} 台设备 · ${summary.totalTools} 个工具` : "正在加载 MCP 拓扑",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "secondary",
				size: "sm",
				onClick: () => void loadData(),
				disabled: loading,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
					className: cn("size-3.5", loading && "animate-spin"),
					strokeWidth: 1.75
				}), "刷新清单"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "primary",
				size: "sm",
				disabled: readOnly,
				onClick: () => setRegisterOpen(true),
				"data-testid": "mcp-register-btn",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
					className: "size-3.5",
					strokeWidth: 2
				}), "部署 / 注册 MCP"]
			})]
		}),
		children: [
			summary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiStrip, {
				asymmetric: true,
				cells: [
					{
						label: "全网 MCP 健康度",
						meta: `已启用 ${summary.enabled} 个`,
						value: `${summary.online}/${summary.total}`,
						ratioPct: onlinePct,
						sub: summary.degraded > 0 ? `${summary.degraded} 个节点 MCP 处于降级状态` : "全部已启用 MCP 协议握手正常",
						tone: summary.degraded > 0 ? "warn" : "ok"
					},
					{
						label: "纳管设备覆盖",
						value: String(summary.nodesCovered),
						numeric: { primary: summary.nodesCovered },
						sub: `共 ${fleetNodes.length} 台 Fleet 节点可下发同步`
					},
					{
						label: "可用 MCP Tools 总数",
						value: String(summary.totalTools),
						numeric: { primary: summary.totalTools },
						sub: "可按需绑定给主 Agent 与 Worker"
					},
					{
						label: "协议传输分布",
						value: `${summary.byTransport["streamable-http"] || 0} / ${summary.byTransport.stdio || 0} / ${summary.byTransport.sse || 0}`,
						sub: "Streamable HTTP · stdio · SSE"
					}
				]
			}),
			data && data.byNode.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "按设备节点分布",
				description: "点击任意设备节点卡片行即可聚焦筛选该设备上的全部 MCP 服务。",
				bodyClassName: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]",
					children: data.byNode.map((nodeEntry) => {
						const active = nodeFilter === nodeEntry.nodeId;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setNodeFilter(active ? "all" : nodeEntry.nodeId),
							className: cn("text-left px-5 py-4 transition-colors duration-150 cursor-pointer", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0", active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-hover)]"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[13.5px] font-medium text-[var(--ink)] truncate",
									children: nodeEntry.nodeName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums shrink-0",
									children: [
										nodeEntry.online,
										"/",
										nodeEntry.total
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums truncate",
								children: [
									nodeEntry.nodeId,
									" · ",
									nodeEntry.toolsCount,
									" tools"
								]
							})]
						}, nodeEntry.nodeId);
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "全节点 MCP 服务目录",
				description: "支持按设备节点、传输协议与工具名称过滤；远程节点变更自动经由 Pull-only 探针队列同步。",
				bodyClassName: "p-0",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative w-44 sm:w-52",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
								className: "size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
								strokeWidth: 1.75
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "search",
								value: query,
								onChange: (e) => setQuery(e.target.value),
								placeholder: "搜索 MCP、节点或工具...",
								"aria-label": "搜索 MCP 服务",
								"data-testid": "mcp-search-input",
								className: cn("w-full h-8 pl-8 pr-2.5 sm:text-[12.5px]", inputBaseClass)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: nodeFilter,
							onChange: (e) => setNodeFilter(e.target.value),
							"aria-label": "按节点筛选 MCP",
							"data-testid": "mcp-node-filter",
							className: cn("ui-select h-8 pl-2.5 sm:text-[12.5px] max-w-full min-w-0 cursor-pointer", inputBaseClass),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: "all",
								children: [
									"全部设备 (",
									items.length,
									")"
								]
							}), fleetNodes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: n.id,
								children: n.name
							}, n.id))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
							value: transportFilter,
							onChange: setTransportFilter,
							options: TRANSPORT_FILTERS,
							ariaLabel: "按 MCP 传输协议筛选"
						})
					]
				}),
				children: filteredItems.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					title: "未匹配到 MCP 服务",
					message: "当前筛选条件下暂无已纳管的 MCP Server，可清除筛选或直接向节点部署新 MCP。",
					action: nodeFilter !== "all" || transportFilter !== "all" || query ? {
						label: "显示全部 MCP",
						onClick: () => {
							setNodeFilter("all");
							setTransportFilter("all");
							setQuery("");
						}
					} : void 0
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-[var(--border-subtle)]",
					"data-testid": "mcp-list",
					children: filteredItems.map((item) => {
						const expanded = Boolean(expandedIds[item.id]);
						const isTesting = busyId === `test:${item.id}`;
						const isToggling = busyId === `toggle:${item.id}`;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "px-5 sm:px-6 py-4 hover:bg-[var(--surface-hover)]/60 transition-colors",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col lg:flex-row lg:items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1 space-y-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => toggleExpand(item.id),
												className: cn("inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer rounded", FOCUS_RING),
												children: [expanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
													className: "size-4 text-[var(--ink-subtle)]",
													strokeWidth: 1.75
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
													className: "size-4 text-[var(--ink-subtle)]",
													strokeWidth: 1.75
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.name })]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: item.enabled ? item.status : "standby" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "pl-5.5 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[var(--ink-muted)]",
													children: item.nodeName
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.transport }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [item.toolsCount, " tools"] }),
												item.latencyMs != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [item.latencyMs, "ms"] })] }),
												item.syncState && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: item.syncState === "queued-sync" ? "text-[var(--warn)]" : "",
													children: item.syncState === "queued-sync" ? "待节点拉取同步" : item.syncState === "probe-reported" ? "探针自动上报" : "配置已同步"
												})] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "pl-5.5 font-mono text-[11.5px] text-[var(--ink-subtle)] truncate",
											title: item.endpoint || `${item.command || ""} ${(item.args || []).join(" ")}`,
											children: item.endpoint || `${item.command || ""} ${(item.args || []).join(" ")}`.trim()
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pl-5.5 lg:pl-0 flex flex-wrap items-center gap-1.5 shrink-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											variant: "secondary",
											size: "sm",
											disabled: isTesting,
											onClick: () => void handleTest(item),
											"data-testid": `mcp-test-${item.id}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
												className: "size-3.5 text-[var(--accent)]",
												strokeWidth: 1.75
											}), isTesting ? "拨测中..." : "握手测试"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											variant: "secondary",
											size: "sm",
											disabled: readOnly,
											onClick: () => handleOpenSync(item),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {
												className: "size-3.5",
												strokeWidth: 1.75
											}), "跨节点同步"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "sm",
											disabled: readOnly || isToggling,
											onClick: () => void handleToggle(item),
											children: item.enabled ? "停用" : "启用"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											disabled: readOnly,
											"aria-label": `移除 ${item.name}`,
											title: "移除该 MCP",
											onClick: () => handleDelete(item),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, {
												className: "size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]",
												strokeWidth: 1.75
											})
										})
									]
								})]
							}), expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 pl-5.5 pt-3 border-t border-[var(--border-subtle)] space-y-2.5 text-[12.5px]",
								children: [
									item.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[var(--ink-muted)]",
										children: item.description
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["协议版本：", item.protocolVersion || "2025-03-26"] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["作用域：", item.scope || "general"] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["最近检测：", formatRelativeAge(item.lastCheckedAt)] }),
											item.envRefs && item.envRefs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["密钥引用：", item.envRefs.join(", ")] })
										]
									}),
									item.tools && item.tools.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[11.5px] font-medium text-[var(--ink-subtle)]",
											children: [
												"已发现工具清单 (",
												item.tools.length,
												")"
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
											className: "divide-y divide-[var(--border-subtle)]/70",
											children: item.tools.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
												className: "py-1.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono text-[12px] text-[var(--ink)]",
													children: tool.name
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[12px] text-[var(--ink-subtle)]",
													children: tool.description || "-"
												})]
											}, tool.name))
										})]
									})
								]
							})]
						}, item.id);
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Root, {
				open: registerOpen,
				onOpenChange: setRegisterOpen,
				direction: "right",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Portal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Overlay, { className: "fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Content, {
					className: "fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Title, {
							className: "text-[15px] font-semibold text-[var(--ink)]",
							children: "部署 / 注册全节点 MCP"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Description, {
							className: "text-[12px] text-[var(--ink-subtle)] mt-0.5",
							children: "可一次下发到多台 VPS 或本地设备，敏感变量仅记录 env:// 引用名。"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => setRegisterOpen(false),
							"aria-label": "关闭抽屉",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleRegisterSubmit,
						className: "flex-1 overflow-y-auto px-6 py-5 space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1.5 text-[13px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink-muted)]",
									children: "MCP 名称"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									required: true,
									value: regForm.name,
									onChange: (e) => setRegForm((s) => ({
										...s,
										name: e.target.value
									})),
									placeholder: "例如：Postgres Read-Only MCP",
									className: cn("w-full h-9 px-3", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "传输协议"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: regForm.transport,
										onChange: (e) => setRegForm((s) => ({
											...s,
											transport: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 cursor-pointer", inputBaseClass),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "streamable-http",
												children: "Streamable HTTP"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "stdio",
												children: "stdio (本地进程声明)"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "sse",
												children: "SSE"
											})
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "作用域标签"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: regForm.scope,
										onChange: (e) => setRegForm((s) => ({
											...s,
											scope: e.target.value
										})),
										placeholder: "infra / dev / memory",
										className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
									})]
								})]
							}),
							regForm.transport === "stdio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "可执行命令 (仅声明下发，不在控制面执行)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										required: true,
										value: regForm.command,
										onChange: (e) => setRegForm((s) => ({
											...s,
											command: e.target.value
										})),
										placeholder: "npx / uvx / node",
										className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "启动参数"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: regForm.args,
										onChange: (e) => setRegForm((s) => ({
											...s,
											args: e.target.value
										})),
										placeholder: "-y @modelcontextprotocol/server-git",
										className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
									})]
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1.5 text-[13px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink-muted)]",
									children: "MCP Endpoint URL (仅限 http/https)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "url",
									required: true,
									value: regForm.endpoint,
									onChange: (e) => setRegForm((s) => ({
										...s,
										endpoint: e.target.value
									})),
									placeholder: "http://100.64.0.35:8788/mcp",
									className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2 text-[13px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink-muted)]",
									children: "目标部署设备 (可多选)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]",
									children: fleetNodes.map((node) => {
										const checked = regForm.nodeIds.includes(node.id);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "py-2 flex items-center justify-between gap-2 cursor-pointer",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-2.5 min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "checkbox",
													checked,
													onChange: () => toggleNodeSelection(node.id, regForm.nodeIds, (next) => setRegForm((s) => ({
														...s,
														nodeIds: next
													}))),
													className: "accent-[var(--accent)]"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[var(--ink)] truncate",
													children: node.name
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-[11.5px] text-[var(--ink-subtle)] shrink-0",
												children: node.region || node.id
											})]
										}, node.id);
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1.5 text-[13px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink-muted)]",
									children: "环境变量引用名 (逗号分隔，不存明文密钥)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: regForm.envRefs,
									onChange: (e) => setRegForm((s) => ({
										...s,
										envRefs: e.target.value
									})),
									placeholder: "GITHUB_TOKEN, DB_RO_URL",
									className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1.5 text-[13px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink-muted)]",
									children: "用途说明"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: regForm.description,
									onChange: (e) => setRegForm((s) => ({
										...s,
										description: e.target.value
									})),
									placeholder: "例如：供主 Agent 查询边缘节点只读指标",
									className: cn("w-full h-9 px-3", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pt-3 flex items-center justify-end gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "secondary",
									size: "md",
									onClick: () => setRegisterOpen(false),
									children: "取消"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									variant: "primary",
									size: "md",
									disabled: registerBusy || readOnly,
									children: registerBusy ? "正在下发..." : `部署到 ${regForm.nodeIds.length} 台设备`
								})]
							})
						]
					})]
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Root, {
				open: Boolean(syncTarget),
				onOpenChange: (open) => !open && setSyncTarget(null),
				direction: "right",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Portal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Overlay, { className: "fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Content, {
					className: "fixed inset-y-0 right-0 z-50 w-full max-w-[440px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Title, {
							className: "text-[15px] font-semibold text-[var(--ink)]",
							children: "跨设备同步 MCP 配置"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Description, {
							className: "text-[12px] text-[var(--ink-subtle)] mt-0.5",
							children: [
								"将 ",
								syncTarget?.name,
								" 的声明复制至其他节点，并自动下发 Pull-only mcp-sync 指令。"
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => setSyncTarget(null),
							"aria-label": "关闭同步抽屉",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleSyncSubmit,
						className: "flex-1 overflow-y-auto px-6 py-5 space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[12.5px] text-[var(--ink-muted)] font-mono",
								children: [
									"源节点：",
									syncTarget?.nodeName,
									" (",
									syncTarget?.nodeId,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]",
								children: fleetNodes.filter((n) => n.id !== syncTarget?.nodeId).map((node) => {
									const checked = syncNodeIds.includes(node.id);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "py-2.5 flex items-center justify-between gap-2 text-[13px] cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-2.5 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked,
												onChange: () => toggleNodeSelection(node.id, syncNodeIds, setSyncNodeIds),
												className: "accent-[var(--accent)]"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[var(--ink)] truncate",
												children: node.name
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[11.5px] text-[var(--ink-subtle)] shrink-0",
											children: node.tailscaleIp || node.id
										})]
									}, node.id);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pt-3 flex items-center justify-end gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "secondary",
									size: "md",
									onClick: () => setSyncTarget(null),
									children: "取消"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									variant: "primary",
									size: "md",
									disabled: syncBusy || syncNodeIds.length === 0,
									children: syncBusy ? "正在同步..." : `同步至 ${syncNodeIds.length} 台节点`
								})]
							})
						]
					})]
				})] })
			})
		]
	});
}
export { McpView };
