import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { a as Ta, c as fr, d as MarkerType, f as Position, i as Sn, l as pa, n as Co, o as Ua, p as require_jsx_runtime, r as Ra, s as _a, u as wa } from "./vendor-flow-aUB-QjJm.js";
import { Et as GitPullRequest, Jt as Check, Lt as Crown, Ot as GitBranch, Pt as ExternalLink, Xt as Bot, at as Play, bt as Layers, ft as Minus, gt as Map, ht as Maximize2, k as X, rt as Plus } from "./vendor-ui-DUVxOpTN.js";
import { i as getIssueStatusMeta, n as buildLinearDependencyGraph, t as LINEAR_STATUS_COLUMNS } from "./linear-projects-LAF1L5Uq.js";
import { r as shortAgentName } from "./agent-console-CqfDRRqZ.js";
import { I as FOCUS_RING, L as cn, _ as StatusIndicator, l as Button, x as inputBaseClass } from "./app-nZGM7CNZ.js";
// web/components/LinearGraphCanvas.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function safeGithubHref(url) {
	if (!url) return null;
	const trimmed = String(url).trim();
	if (/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(\/.*)?$/i.test(trimmed)) return trimmed;
	return null;
}
var NODE_TYPES = { n8nNode: import_react.memo(function N8nWorkflowNode({ data }) {
	const { spec, isSelected } = data;
	const isCommander = spec.kind === "commander";
	const isPr = spec.kind === "github-pr";
	const isSub = spec.kind === "sub-issue";
	const statusMeta = getIssueStatusMeta(spec.status);
	const isDone = spec.status === "done" || spec.status === "merged";
	const isActive = spec.status === "in_progress";
	const Icon = isCommander ? Crown : isPr ? GitPullRequest : isSub ? Bot : Layers;
	const tileBorder = isSelected ? "border-[var(--accent)] ring-4 ring-[var(--accent)]/20" : isCommander ? "border-[var(--accent)]/70" : isPr ? "border-[var(--ok-dot)]/60" : "border-[var(--border-strong)] hover:border-[var(--ink-subtle)]";
	const iconTone = isCommander ? "text-[var(--accent)]" : isPr ? "text-[var(--ok)]" : isSub ? "text-[var(--ink)]" : "text-[var(--ink-muted)]";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"data-testid": `linear-graph-node-${spec.id}`,
		className: "flex flex-col items-center w-[164px] select-none cursor-pointer group",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("relative w-[68px] h-[68px] rounded-2xl border-2 bg-[var(--surface-elevated)] flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.22)] transition-[border-color,box-shadow,transform] duration-150 group-hover:-translate-y-0.5", tileBorder, isCommander && "rounded-l-[28px]"),
			children: [
				!isCommander && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
					type: "target",
					position: Position.Left,
					id: "in",
					className: "!w-3 !h-3 !rounded-full !border-2 !border-[var(--border-strong)] !bg-[var(--surface)] !-left-[7px]"
				}),
				!isPr && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
					type: "source",
					position: Position.Right,
					id: "out",
					className: "!w-3 !h-3 !rounded-full !border-2 !border-[var(--accent)] !bg-[var(--surface)] !-right-[7px]"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					className: cn("size-7", iconTone),
					strokeWidth: 1.75
				}),
				(isDone || isActive) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full border-2 border-[var(--bg)] flex items-center justify-center", isDone ? "bg-[var(--ok-dot)] text-white" : "bg-[var(--accent)] text-white"),
					title: statusMeta.label,
					children: isDone ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
						className: "size-3",
						strokeWidth: 2.5
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-2.5 fill-current" })
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 text-center w-full px-1 space-y-0.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[12px] font-semibold text-[var(--ink)] leading-tight line-clamp-2",
				children: spec.title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "font-mono text-[10.5px] text-[var(--ink-subtle)] truncate tabular-nums",
				children: [spec.identifier ? `${spec.identifier} · ` : "", shortAgentName(spec.assigneeName)]
			})]
		})]
	});
}) };
function N8nCanvasInner({ commanderName, commanderId, issues, projects, availableAgents, availableBots, readOnly, dispatchingId, onUpdateIssue, onDispatchCommander }) {
	const { zoomIn, zoomOut, fitView } = Sn();
	const [selectedNodeId, setSelectedNodeId] = import_react.useState(null);
	const [showMiniMap, setShowMiniMap] = import_react.useState(false);
	const graphSpec = import_react.useMemo(() => buildLinearDependencyGraph({
		commanderName: shortAgentName(commanderName),
		commanderId,
		issues,
		projects
	}), [
		commanderName,
		commanderId,
		issues,
		projects
	]);
	const rfNodes = import_react.useMemo(() => graphSpec.nodes.map((spec) => ({
		id: spec.id,
		type: "n8nNode",
		position: {
			x: spec.x,
			y: spec.y
		},
		data: {
			spec,
			isSelected: selectedNodeId === spec.id
		}
	})), [graphSpec.nodes, selectedNodeId]);
	const rfEdges = import_react.useMemo(() => graphSpec.edges.map((edge) => {
		const isBlocking = edge.kind === "blocks";
		const isCommander = edge.kind === "commands";
		const isPr = edge.kind === "delivers";
		const color = isBlocking ? "var(--warn-dot)" : isCommander ? "var(--accent)" : isPr ? "var(--ok-dot)" : "var(--border-strong)";
		return {
			id: edge.id,
			source: edge.source,
			target: edge.target,
			type: "default",
			animated: Boolean(edge.animated),
			label: isBlocking ? edge.label : void 0,
			labelStyle: isBlocking ? {
				fill: "var(--warn)",
				fontSize: 10,
				fontFamily: "var(--font-mono)"
			} : void 0,
			labelBgStyle: isBlocking ? {
				fill: "var(--bg)",
				fillOpacity: .92
			} : void 0,
			labelBgPadding: [5, 2],
			labelBgBorderRadius: 4,
			style: {
				stroke: color,
				strokeWidth: isCommander ? 2.2 : 1.8,
				strokeDasharray: isBlocking ? "5 4" : void 0
			},
			markerEnd: {
				type: MarkerType.ArrowClosed,
				width: 14,
				height: 14,
				color
			}
		};
	}), [graphSpec.edges]);
	const [nodes, setNodes, onNodesChange] = wa(rfNodes);
	const [edges, setEdges, onEdgesChange] = Ta(rfEdges);
	import_react.useEffect(() => {
		setNodes(rfNodes);
		setEdges(rfEdges);
	}, [
		rfNodes,
		rfEdges,
		setNodes,
		setEdges
	]);
	const selectedSpec = import_react.useMemo(() => graphSpec.nodes.find((n) => n.id === selectedNodeId) || null, [graphSpec.nodes, selectedNodeId]);
	const selectedIssue = import_react.useMemo(() => selectedSpec?.issueId ? issues.find((i) => i.id === selectedSpec.issueId) || null : null, [selectedSpec, issues]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative w-full h-[calc(100dvh-11.5rem)] min-h-[540px] rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden",
		"data-testid": "linear-graph-canvas",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_a, {
				nodes,
				edges,
				nodeTypes: NODE_TYPES,
				onNodesChange,
				onEdgesChange,
				onNodeClick: (_evt, node) => setSelectedNodeId(node.id),
				onPaneClick: () => setSelectedNodeId(null),
				fitView: true,
				fitViewOptions: {
					padding: .16,
					maxZoom: 1
				},
				minZoom: .35,
				maxZoom: 1.6,
				proOptions: { hideAttribution: true },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ua, {
					variant: Ra.Dots,
					gap: 22,
					size: 1.4,
					color: "var(--border-strong)"
				}), showMiniMap && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Co, {
					pannable: true,
					zoomable: true,
					position: "bottom-right",
					nodeColor: "var(--surface-active)",
					maskColor: "rgba(9,9,11,0.45)",
					className: "!bg-[var(--surface-elevated)] !border !border-[var(--border)] !rounded-xl"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute left-4 top-4 flex items-center gap-2 font-mono text-[11.5px] text-[var(--ink-subtle)] bg-[var(--surface-elevated)]/90 backdrop-blur-sm border border-[var(--border)] rounded-lg px-3 py-1.5 tabular-nums",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [graphSpec.nodes.length, " 节点"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						"aria-hidden": "true",
						children: "·"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [graphSpec.edges.length, " 连线"] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute left-4 bottom-4 flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur-sm p-1 shadow-[var(--shadow-card)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => void zoomOut(),
						"aria-label": "缩小画布",
						className: cn("h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors", FOCUS_RING),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => void zoomIn(),
						"aria-label": "放大画布",
						className: cn("h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors", FOCUS_RING),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => void fitView({
							padding: .16,
							duration: 220
						}),
						"aria-label": "自适应画布",
						className: cn("h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors", FOCUS_RING),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize2, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setShowMiniMap((v) => !v),
						"aria-label": "切换缩略图",
						className: cn("h-8 w-8 rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors", showMiniMap ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]", FOCUS_RING),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Map, { className: "size-4" })
					})
				]
			}),
			selectedSpec && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				"aria-label": "节点参数面板",
				"data-testid": "n8n-node-inspector",
				className: "absolute right-4 top-4 bottom-4 w-[320px] max-w-[calc(100%-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/98 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden z-20",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-mono text-[11px] text-[var(--accent)] truncate",
							children: selectedSpec.identifier || (selectedSpec.kind === "commander" ? "TRIGGER · 总指挥" : "NODE")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[13.5px] font-semibold text-[var(--ink)] truncate",
							children: selectedSpec.title
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "关闭节点面板",
						onClick: () => setSelectedNodeId(null),
						className: cn("h-7 w-7 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 overflow-y-auto p-4 space-y-4 text-[12.5px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[var(--ink-subtle)]",
							children: "节点状态"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
							status: getIssueStatusMeta(selectedSpec.status).tone,
							label: getIssueStatusMeta(selectedSpec.status).label
						})]
					}), selectedIssue ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						selectedIssue.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[var(--ink-muted)] leading-relaxed",
							children: selectedIssue.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11.5px] text-[var(--ink-subtle)]",
								children: "工作流状态"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								disabled: readOnly,
								value: selectedIssue.status,
								onChange: (e) => void onUpdateIssue(selectedIssue.id, { status: e.target.value }),
								className: cn("ui-select w-full h-9 pl-2.5 text-[12.5px] cursor-pointer", inputBaseClass),
								children: LINEAR_STATUS_COLUMNS.map((col) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: col.id,
									children: col.label
								}, col.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11.5px] text-[var(--ink-subtle)]",
								children: "优先级"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								disabled: readOnly,
								value: selectedIssue.priority,
								onChange: (e) => void onUpdateIssue(selectedIssue.id, { priority: e.target.value }),
								className: cn("ui-select w-full h-9 pl-2.5 text-[12.5px] cursor-pointer", inputBaseClass),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "urgent",
										children: "P0 紧急"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "high",
										children: "P1 高"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "medium",
										children: "P2 中"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "low",
										children: "P3 低"
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11.5px] text-[var(--ink-subtle)]",
								children: "执行 Agent / Bot"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								disabled: readOnly,
								value: `${selectedIssue.assigneeType}:${selectedIssue.assigneeId}`,
								onChange: (e) => {
									const [aType, aId] = e.target.value.split(":");
									const name = aType === "bot" ? availableBots.find((b) => b.id === aId)?.name || aId : availableAgents.find((a) => a.id === aId)?.name || aId;
									onUpdateIssue(selectedIssue.id, {
										assigneeType: aType,
										assigneeId: aId,
										assigneeName: name
									});
								},
								className: cn("ui-select w-full h-9 pl-2.5 text-[12.5px] cursor-pointer", inputBaseClass),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: `${selectedIssue.assigneeType}:${selectedIssue.assigneeId}`,
										children: shortAgentName(selectedIssue.assigneeName)
									}),
									availableAgents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
										value: `agent:${a.id}`,
										children: ["Agent · ", shortAgentName(a.name)]
									}, `agent:${a.id}`)),
									availableBots.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
										value: `bot:${b.id}`,
										children: ["Bot · ", b.name]
									}, `bot:${b.id}`))
								]
							})]
						}),
						selectedIssue.worktreeBranch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-subtle)] shrink-0",
								children: "Worktree"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 font-mono text-[11.5px] text-[var(--ink-muted)] truncate",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "size-3 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate",
									children: selectedIssue.worktreeBranch
								})]
							})]
						}),
						selectedIssue.github?.prNumber && safeGithubHref(selectedIssue.github.url) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-subtle)]",
								children: "GitHub PR"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: safeGithubHref(selectedIssue.github.url),
								target: "_blank",
								rel: "noopener noreferrer",
								className: "inline-flex items-center gap-1 font-mono text-[12px] text-[var(--accent)] hover:underline",
								children: [
									"PR #",
									selectedIssue.github.prNumber,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })
								]
							})]
						}),
						!selectedIssue.parentId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "primary",
								size: "md",
								className: "w-full",
								disabled: readOnly || dispatchingId === selectedIssue.id,
								onClick: () => void onDispatchCommander(selectedIssue.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5" }), dispatchingId === selectedIssue.id ? "正在派发..." : "执行总指挥拆解"]
							})
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 text-[var(--ink-muted)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: selectedSpec.subtitle }), selectedSpec.url && safeGithubHref(selectedSpec.url) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: safeGithubHref(selectedSpec.url),
							target: "_blank",
							rel: "noopener noreferrer",
							className: "inline-flex items-center gap-1 font-mono text-[12px] text-[var(--accent)] hover:underline",
							children: ["在 GitHub 查看", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })]
						})]
					})]
				})]
			})
		]
	});
}
function LinearGraphCanvas(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(pa, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(N8nCanvasInner, {
		commanderName: props.commanderName,
		commanderId: props.commanderId,
		issues: props.issues,
		projects: props.projects,
		availableAgents: props.availableAgents,
		availableBots: props.availableBots,
		readOnly: Boolean(props.readOnly),
		dispatchingId: props.dispatchingId || null,
		onUpdateIssue: props.onUpdateIssue,
		onDispatchCommander: props.onDispatchCommander
	}) });
}
export { LinearGraphCanvas };
