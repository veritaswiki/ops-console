import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { $ as RefreshCw, Bt as Copy, Jt as Check, Y as Search } from "./vendor-ui-DUVxOpTN.js";
import { E as formatBytes, I as FOCUS_RING, L as cn, O as formatCompactNumber, U as copyToClipboard, _ as StatusIndicator, g as SegmentedFilter, kt as probeRemotes, l as Button, m as Panel, t as ModuleFrame, u as EmptyState, x as inputBaseClass } from "./app-nZGM7CNZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/NetworkView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var TS_FILTERS = [
	{
		value: "all",
		label: "全部设备"
	},
	{
		value: "online",
		label: "仅在线"
	},
	{
		value: "relay",
		label: "DERP 中继"
	}
];
var FW_FILTERS = [{
	value: "all",
	label: "全部监听"
}, {
	value: "exposed",
	label: "仅非回环暴露"
}];
function NetworkView({ snapshot, meta, onToast }) {
	const [remotes, setRemotes] = import_react.useState([]);
	const [probing, setProbing] = import_react.useState(false);
	const [tsFilter, setTsFilter] = import_react.useState("all");
	const [tsQuery, setTsQuery] = import_react.useState("");
	const [copiedIp, setCopiedIp] = import_react.useState("");
	const [fwFilter, setFwFilter] = import_react.useState("all");
	const net = snapshot?.network;
	const ts = net?.tailscale;
	const mihomo = net?.mihomo;
	const syncthing = net?.syncthing;
	const fw = snapshot?.firewall || net?.firewall;
	const handleCopyIp = async (ip) => {
		if (!ip || ip === "-") return;
		if (await copyToClipboard(ip)) {
			setCopiedIp(ip);
			onToast(`已复制节点 IP：${ip}`, "ok");
			window.setTimeout(() => setCopiedIp((cur) => cur === ip ? "" : cur), 1600);
		}
	};
	const handleProbeRemotes = async () => {
		setProbing(true);
		try {
			const res = await probeRemotes();
			setRemotes(res.items || res.remotes || []);
			onToast("远程 SSH 节点探针已完成采集", "ok");
		} catch (err) {
			onToast(`远程探针失败：${err.message}`, "err");
		} finally {
			setProbing(false);
		}
	};
	const configuredRemotes = meta?.remotes || [];
	const fwSummary = fw?.summary;
	const filteredDevices = import_react.useMemo(() => {
		const list = ts?.devices || [];
		const q = tsQuery.trim().toLowerCase();
		return list.filter((dev) => {
			if (tsFilter === "online" && !dev.online) return false;
			if (tsFilter === "relay" && (dev.isSelf || dev.direct || !dev.relay)) return false;
			if (q) {
				const ip = dev.ip || dev.tailscaleIps?.[0] || "";
				if (!`${dev.name || ""} ${dev.hostName || ""} ${ip} ${dev.os || ""} ${dev.relay || ""}`.toLowerCase().includes(q)) return false;
			}
			return true;
		});
	}, [
		ts?.devices,
		tsFilter,
		tsQuery
	]);
	const filteredListeners = import_react.useMemo(() => {
		const list = fw?.listeners || [];
		if (fwFilter === "all") return list;
		return list.filter((l) => {
			return String(l.scope || l.exposure || "").toLowerCase() !== "loopback";
		});
	}, [fw?.listeners, fwFilter]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ModuleFrame, {
		title: "网络、组网与防火墙",
		description: "Tailscale Mesh 节点连通性、IP 快捷复制、Mihomo 代理流量、Syncthing 同步与只读端口暴露面审计。",
		meta: ts?.tailnet ? `Tailnet ${ts.tailnet}` : "本地网络视图",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Tailscale Mesh 组网",
				description: ts?.selfName ? `本机 ${ts.selfName} (${ts.selfIp || "-"}) · 在线 ${ts.onlineCount ?? 0}/${ts.devices?.length ?? 0}` : "WireGuard 点对点加密组网设备表（点击任意 IP 可一键复制）",
				bodyClassName: "p-0",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: ts?.status || (ts?.reachable ? "healthy" : "offline") }),
				children: !ts?.devices?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: ts?.error || "未采集到 Tailscale 节点列表。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 sm:px-6 py-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
						value: tsFilter,
						onChange: setTsFilter,
						options: TS_FILTERS,
						ariaLabel: "筛选 Tailscale 节点"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative w-full sm:w-56",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							className: "size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none",
							strokeWidth: 1.75
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "search",
							value: tsQuery,
							onChange: (e) => setTsQuery(e.target.value),
							placeholder: "搜索节点名、IP 或系统...",
							"aria-label": "搜索 Tailscale 节点",
							className: cn("h-9 sm:h-8 w-full pl-9 pr-3", inputBaseClass)
						})]
					})]
				}), filteredDevices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					title: "没有匹配的 Tailscale 节点",
					message: "当前过滤条件下无在线或中继设备。",
					action: {
						label: "重置筛选",
						onClick: () => {
							setTsFilter("all");
							setTsQuery("");
						}
					}
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left border-collapse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-5 sm:pl-6 pr-3",
									children: "节点名称"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "系统"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "Tailscale IP"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "状态"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "连接路径"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right",
									children: "流量 (RX / TX)"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-[var(--border-subtle)] text-[13px]",
							children: filteredDevices.map((dev, idx) => {
								const ip = dev.ip || dev.tailscaleIps?.[0] || "-";
								const isCopied = copiedIp === ip;
								const pathText = dev.isSelf ? "本机控制面" : dev.direct ? `直连${dev.curAddr ? ` (${dev.curAddr})` : ""}` : dev.relay ? `DERP ${dev.relay}` : "-";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2.5 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)] max-w-[200px] truncate",
											children: [dev.name || dev.hostName, dev.isSelf && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "ml-2 font-mono text-[11.5px] text-[var(--accent)]",
												children: "本机"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 text-[var(--ink-muted)] whitespace-nowrap",
											children: dev.os || "-"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 whitespace-nowrap",
											children: ip !== "-" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => void handleCopyIp(ip),
												title: "点击复制 Tailscale IP",
												className: cn("group inline-flex items-center gap-1.5 font-mono text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] tabular-nums rounded px-1 -mx-1 py-0.5 hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer", FOCUS_RING),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ip }), isCopied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
													className: "size-3 text-[var(--ok)]",
													strokeWidth: 2
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
													className: "size-3 opacity-0 group-hover:opacity-80 transition-opacity",
													strokeWidth: 1.75
												})]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-[12.5px] text-[var(--ink-subtle)]",
												children: "-"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 whitespace-nowrap",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: dev.online ? "online" : "offline" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] max-w-[220px] truncate",
											title: pathText,
											children: pathText
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
											children: dev.rxBytes != null || dev.txBytes != null ? `${formatBytes(dev.rxBytes)} / ${formatBytes(dev.txBytes)}` : "-"
										})
									]
								}, dev.id || dev.name || idx);
							})
						})]
					})
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Mihomo 代理引擎",
					description: mihomo?.protocol || "Mihomo REST Controller",
					actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: mihomo?.status || (mihomo?.reachable ? "healthy" : "offline") }),
					children: !mihomo?.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "Mihomo 连接器未启用。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "grid grid-cols-3 gap-4 pb-4 border-b border-[var(--border-subtle)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-[12px] text-[var(--ink-subtle)]",
										children: "活跃连接"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate",
										children: formatCompactNumber(mihomo.activeConnections ?? 0)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-[12px] text-[var(--ink-subtle)]",
										children: "运行模式"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] truncate",
										children: mihomo.mode || "Rule"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
										className: "text-[12px] text-[var(--ink-subtle)]",
										children: "累计下行"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
										className: "mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] tabular-nums truncate",
										children: formatBytes(mihomo.downloadTotal)
									})]
								})
							]
						}), mihomo.proxyGroups && mihomo.proxyGroups.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "divide-y divide-[var(--border-subtle)] text-[13px]",
							children: mihomo.proxyGroups.slice(0, 5).map((grp) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "py-2 flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink)] truncate",
									children: grp.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[12.5px] text-[var(--ink-muted)] truncate",
									children: grp.now || "-"
								})]
							}, grp.name))
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Syncthing 与按需 SSH 远程节点",
					description: "零常驻代理的按需 SSH 健康采集，与本地文件同步状态。",
					actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: handleProbeRemotes,
						disabled: probing,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
							className: cn("size-4", probing && "animate-spin"),
							strokeWidth: 1.75
						}), probing ? "探测中..." : "按需探测远程主机"]
					}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[13.5px] font-medium text-[var(--ink)]",
									children: "Syncthing 文件同步"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[12.5px] text-[var(--ink-muted)] font-mono tabular-nums truncate",
									children: syncthing?.reachable ? syncthing.folders != null || syncthing.devices != null ? `${syncthing.folders ?? 0} 文件夹 · ${syncthing.devices ?? 0} 对端 · ${syncthing.latencyMs ?? 0}ms` : `REST 健康检查通过 · ${syncthing.latencyMs ?? 0}ms` : syncthing?.error || "未启用或离线"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: syncthing?.status || (syncthing?.reachable ? "healthy" : "standby") })]
						}), remotes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "divide-y divide-[var(--border-subtle)] text-[13px]",
							children: remotes.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "py-2.5 flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium text-[var(--ink)] truncate",
										children: r.name || r.id
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-mono text-[12px] text-[var(--ink-subtle)] truncate tabular-nums",
										children: [
											r.host,
											r.load ? `负载 ${r.load}` : null,
											r.memory,
											r.error
										].filter(Boolean).join(" · ")
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: r.ok || r.reachable ? "healthy" : "offline" })]
							}, r.id))
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[13px] text-[var(--ink-subtle)] text-pretty",
							children: configuredRemotes.length > 0 ? `已配置 ${configuredRemotes.length} 台远程 SSH 主机，点击右上角按钮执行按需只读探测。` : "未配置按需 SSH 远程主机，可在配置文件 remotes 字段添加。"
						})]
					})
				})]
			}),
			fw?.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "只读防火墙与套接字暴露面审计",
				description: fwSummary ? `总监听 ${fwSummary.totalListeners ?? 0} · 仅回环 ${fwSummary.loopback ?? fwSummary.loopbackListeners ?? 0} · Tailnet ${fwSummary.tailnet ?? fwSummary.tailnetListeners ?? 0} · 公网直露 ${fwSummary.publicUnfiltered ?? 0} · 丢弃 ${formatCompactNumber(fwSummary.droppedPackets ?? 0)} 包` : "实时套接字监听与入站包过滤策略审计",
				bodyClassName: "p-0",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
						value: fwFilter,
						onChange: setFwFilter,
						options: FW_FILTERS,
						ariaLabel: "按暴露范围筛选监听端口"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
						status: (fwSummary?.publicUnfiltered ?? 0) > 0 ? "degraded" : fw.status || "healthy",
						label: (fwSummary?.publicUnfiltered ?? 0) > 0 ? `${fwSummary?.publicUnfiltered} 公网暴露` : "入站收敛"
					})]
				}),
				children: filteredListeners.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: fwFilter === "exposed" ? "所有监听套接字均仅绑定本地回环，无非回环暴露端口。" : "未采集到监听套接字数据。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left border-collapse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-5 sm:pl-6 pr-3",
									children: "监听地址"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "协议"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "进程"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "暴露范围"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-3 pr-5 sm:pr-6",
									children: "策略结论"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-[var(--border-subtle)] text-[13px]",
							children: filteredListeners.slice(0, 14).map((l, idx) => {
								const addr = l.bind || l.address || "*";
								const rawScope = l.scope || l.exposure || "";
								const scopeLabel = rawScope === "loopback" ? "仅本地回环" : rawScope === "tailnet" ? "Tailnet 内网" : rawScope === "public-wildcard" ? "通配绑定 (0.0.0.0)" : rawScope || "-";
								const rawPosture = l.posture || l.policy || l.note || "";
								const isRisk = rawPosture.toLowerCase().includes("public-unfiltered") || rawPosture.toLowerCase() === "public";
								const postureLabel = rawPosture === "loopback" ? "回环隔离" : rawPosture === "tailnet" ? "Tailnet 受控" : rawPosture === "tailnet-guarded" ? "防火墙收敛" : rawPosture === "public-unfiltered" ? "公网未过滤" : rawPosture || "受控";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12.5px] text-[var(--ink)] tabular-nums whitespace-nowrap",
											children: [
												addr,
												":",
												l.port
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] uppercase",
											children: l.proto || "tcp"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 font-mono text-[12.5px] text-[var(--ink-muted)] truncate max-w-[160px]",
											children: l.process || "-"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 text-[var(--ink-muted)] whitespace-nowrap",
											children: scopeLabel
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 pl-3 pr-5 sm:pr-6 whitespace-nowrap",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
												status: isRisk ? "degraded" : "healthy",
												label: postureLabel
											})
										})
									]
								}, `${addr}:${l.port}:${idx}`);
							})
						})]
					})
				})
			})
		]
	});
}
export { NetworkView };
