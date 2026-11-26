import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { Et as GitPullRequest, Gt as CircleCheck, Lt as Crown, Ot as GitBranch, P as Trash, Pt as ExternalLink, Ut as CircleDot, Vt as Circle, Wt as CircleDashed, Y as Search, k as X, rt as Plus, vt as List, yt as LayoutGrid } from "./vendor-ui-DUVxOpTN.js";
import { I as FOCUS_RING, L as cn, _ as StatusIndicator, _t as fetchLinearState, at as dispatchLinearCommander, cn as updateLinearIssue, d as ErrorState, dt as fetchA2AState, et as deleteLinearIssue, l as Button, q as createLinearIssue, u as EmptyState, x as inputBaseClass, y as ViewSkeleton } from "./app-nZGM7CNZ.js";
import { a as getPriorityMeta, i as getIssueStatusMeta, r as filterLinearIssues } from "./linear-projects-LAF1L5Uq.js";
import { n as groupIssuesForSimpleBoard, r as shortAgentName, t as SIMPLE_BOARD_COLUMNS } from "./agent-console-CqfDRRqZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/ProjectsView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function safeGithubHref(url) {
	if (!url) return null;
	const trimmed = String(url).trim();
	if (/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(\/.*)?$/i.test(trimmed)) return trimmed;
	return null;
}
function ColumnStatusIcon({ colId }) {
	if (colId === "done") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
		className: "size-3.5 text-[var(--ok)] shrink-0",
		strokeWidth: 2
	});
	if (colId === "in_progress") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDot, {
		className: "size-3.5 text-[var(--warn)] shrink-0",
		strokeWidth: 2
	});
	if (colId === "in_review") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDashed, {
		className: "size-3.5 text-[var(--accent)] shrink-0",
		strokeWidth: 2
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, {
		className: "size-3.5 text-[var(--ink-subtle)] shrink-0",
		strokeWidth: 2
	});
}
function priorityDotClass(priority) {
	const tone = getPriorityMeta(priority).tone;
	if (tone === "failed") return "bg-[var(--err-dot)]";
	if (tone === "degraded") return "bg-[var(--warn-dot)]";
	if (tone === "healthy") return "bg-[var(--ok-dot)]";
	return "bg-[var(--muted-dot)]";
}
function ProjectsView({ readOnly = false, onToast }) {
	const [mode, setMode] = import_react.useState("board");
	const [linearState, setLinearState] = import_react.useState(null);
	const [a2aState, setA2aState] = import_react.useState(null);
	const [loading, setLoading] = import_react.useState(true);
	const [error, setError] = import_react.useState(null);
	const [assigneeFilter, setAssigneeFilter] = import_react.useState("all");
	const [searchQuery, setSearchQuery] = import_react.useState("");
	const [selectedIssueId, setSelectedIssueId] = import_react.useState(null);
	const [showCreate, setShowCreate] = import_react.useState(false);
	const [creating, setCreating] = import_react.useState(false);
	const [dispatchingId, setDispatchingId] = import_react.useState(null);
	const [form, setForm] = import_react.useState({
		title: "",
		description: "",
		priority: "high",
		status: "todo",
		assigneeId: ""
	});
	const loadData = import_react.useCallback(async () => {
		setError(null);
		try {
			const [lin, a2a] = await Promise.all([fetchLinearState(), fetchA2AState()]);
			setLinearState(lin);
			setA2aState(a2a);
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载任务看板失败");
		} finally {
			setLoading(false);
		}
	}, []);
	import_react.useEffect(() => {
		loadData();
	}, [loadData]);
	const issues = linearState?.issues || [];
	const projects = linearState?.projects || [];
	const agents = a2aState?.agents || linearState?.availableAgents.map((a) => ({
		...a,
		status: "healthy",
		modelHint: a.modelHint || "auto"
	})) || [];
	const filteredIssues = import_react.useMemo(() => {
		const base = filterLinearIssues(issues, { query: searchQuery });
		if (assigneeFilter === "all") return base;
		return base.filter((i) => i.assigneeId === assigneeFilter);
	}, [
		issues,
		searchQuery,
		assigneeFilter
	]);
	const groupedBoard = import_react.useMemo(() => groupIssuesForSimpleBoard(filteredIssues), [filteredIssues]);
	const selectedIssue = import_react.useMemo(() => selectedIssueId ? issues.find((i) => i.id === selectedIssueId) || null : null, [issues, selectedIssueId]);
	const openCreateWithStatus = (status = "todo") => {
		setForm((prev) => ({
			...prev,
			status
		}));
		setShowCreate(true);
	};
	const handleCreateIssue = async (e) => {
		e.preventDefault();
		if (readOnly || !form.title.trim()) return;
		setCreating(true);
		try {
			const chosenAgent = agents.find((a) => a.id === form.assigneeId);
			const created = await createLinearIssue({
				title: form.title.trim(),
				description: form.description.trim(),
				projectId: projects[0]?.id,
				priority: form.priority,
				status: form.status,
				assigneeType: chosenAgent ? "agent" : void 0,
				assigneeId: chosenAgent?.id,
				assigneeName: chosenAgent?.name
			});
			onToast?.(`已创建 ${created.issue.identifier}`, "ok");
			setForm({
				title: "",
				description: "",
				priority: "high",
				status: "todo",
				assigneeId: ""
			});
			setShowCreate(false);
			await loadData();
			setSelectedIssueId(created.issue.id);
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "创建任务失败", "err");
		} finally {
			setCreating(false);
		}
	};
	const handleUpdateIssue = async (issueId, patch) => {
		if (readOnly) return;
		try {
			const res = await updateLinearIssue(issueId, patch);
			onToast?.(`已更新 ${res.issue.identifier}`, "ok");
			await loadData();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "更新任务失败", "err");
		}
	};
	const handleDispatch = async (issueId) => {
		if (readOnly) return;
		setDispatchingId(issueId);
		try {
			const res = await dispatchLinearCommander(issueId);
			onToast?.(`总指挥 ${shortAgentName(res.commander.name)} 已拆解 ${res.createdSubIssues?.length || 0} 个子任务`, "ok");
			await loadData();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "派发失败", "err");
		} finally {
			setDispatchingId(null);
		}
	};
	const handleDelete = async (issue) => {
		if (readOnly) return;
		try {
			await deleteLinearIssue(issue.id);
			if (selectedIssueId === issue.id) setSelectedIssueId(null);
			onToast?.(`已删除 ${issue.identifier}`, "info");
			await loadData();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "删除失败", "err");
		}
	};
	if (loading && !linearState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewSkeleton, {});
	if (error && !linearState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
		title: "任务看板加载失败",
		message: error,
		onRetry: () => void loadData()
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		"data-testid": "view-task-board",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3 min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-[18px] font-semibold tracking-tight text-[var(--ink)] whitespace-nowrap",
							children: "任务看板"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums",
							children: filteredIssues.length
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setMode("board"),
								className: cn("h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap", mode === "board" ? "bg-[var(--surface-active)] text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutGrid, { className: "size-3.5" }), "看板"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setMode("list"),
								className: cn("h-7 px-2.5 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap", mode === "list" ? "bg-[var(--surface-active)] text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, { className: "size-3.5" }), "列表"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							"aria-label": "按执行者筛选",
							value: assigneeFilter,
							onChange: (e) => setAssigneeFilter(e.target.value),
							className: cn("ui-select h-8 pl-2.5 pr-7 text-[12px] cursor-pointer", inputBaseClass),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "全部 Agent"
							}), agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: a.id,
								children: shortAgentName(a.name)
							}, a.id))]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative w-40 sm:w-52",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "search",
							value: searchQuery,
							onChange: (e) => setSearchQuery(e.target.value),
							placeholder: "筛选任务...",
							"aria-label": "筛选任务",
							className: cn("w-full h-8 pl-8 pr-2.5 text-[12.5px]", inputBaseClass)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "primary",
						size: "sm",
						disabled: readOnly,
						"data-testid": "toggle-create-issue-btn",
						onClick: () => openCreateWithStatus("todo"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "新建"]
					})]
				})]
			}),
			showCreate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleCreateIssue,
				"data-testid": "create-linear-issue-form",
				className: "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						required: true,
						autoFocus: true,
						disabled: readOnly || creating,
						value: form.title,
						onChange: (e) => setForm((f) => ({
							...f,
							title: e.target.value
						})),
						placeholder: "任务标题...",
						"data-testid": "linear-issue-title-input",
						className: "w-full bg-transparent text-[14.5px] font-medium text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						disabled: readOnly || creating,
						value: form.description,
						onChange: (e) => setForm((f) => ({
							...f,
							description: e.target.value
						})),
						placeholder: "添加描述（可选）...",
						className: "w-full bg-transparent text-[13px] text-[var(--ink-muted)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									"aria-label": "初始状态",
									value: form.status,
									onChange: (e) => setForm((f) => ({
										...f,
										status: e.target.value
									})),
									className: cn("ui-select h-7 pl-2 pr-6 text-[12px] cursor-pointer", inputBaseClass),
									children: SIMPLE_BOARD_COLUMNS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: c.targetStatus,
										children: c.label
									}, c.id))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									"aria-label": "优先级",
									value: form.priority,
									onChange: (e) => setForm((f) => ({
										...f,
										priority: e.target.value
									})),
									className: cn("ui-select h-7 pl-2 pr-6 text-[12px] cursor-pointer", inputBaseClass),
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
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									"aria-label": "指派 Agent",
									value: form.assigneeId,
									onChange: (e) => setForm((f) => ({
										...f,
										assigneeId: e.target.value
									})),
									className: cn("ui-select h-7 pl-2 pr-6 text-[12px] cursor-pointer", inputBaseClass),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "自动指派"
									}), agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: a.id,
										children: shortAgentName(a.name)
									}, a.id))]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 ml-auto",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => setShowCreate(false),
								children: "取消"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								variant: "primary",
								size: "sm",
								disabled: readOnly || creating || !form.title.trim(),
								"data-testid": "linear-issue-submit-btn",
								children: creating ? "创建中..." : "创建任务"
							})]
						})]
					})
				]
			}),
			filteredIssues.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "暂无任务",
				message: "调整筛选条件，或点击右上角「新建」添加任务。"
			}) : mode === "board" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start",
				"data-testid": "linear-kanban-board",
				children: SIMPLE_BOARD_COLUMNS.map((col) => {
					const colItems = groupedBoard[col.id] || [];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						"data-testid": `kanban-col-${col.id}`,
						className: "min-w-0 space-y-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-1 py-1 flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColumnStatusIcon, { colId: col.id }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[13px] font-medium text-[var(--ink)] truncate",
										children: col.label
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
										children: colItems.length
									})
								]
							}), !readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": `在${col.label}中新建任务`,
								onClick: () => openCreateWithStatus(col.targetStatus),
								className: cn("h-6 w-6 rounded-md inline-flex items-center justify-center text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: colItems.map((issue) => {
								const isSelected = selectedIssueId === issue.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"data-testid": `issue-card-${issue.id}`,
									onClick: () => setSelectedIssueId(issue.id),
									className: cn("w-full text-left rounded-xl border p-3.5 space-y-2 cursor-pointer transition-[border-color,background-color] duration-150", FOCUS_RING, isSelected ? "border-[var(--accent)] bg-[var(--accent-soft)]/50" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
												children: issue.identifier
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: cn("h-1.5 w-1.5 rounded-full shrink-0", priorityDotClass(issue.priority)),
												title: getPriorityMeta(issue.priority).label
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[13px] font-medium text-[var(--ink)] leading-snug line-clamp-2",
											children: issue.title
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2 text-[11.5px] text-[var(--ink-subtle)] pt-0.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate",
												children: shortAgentName(issue.assigneeName)
											}), issue.github?.prNumber && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "inline-flex items-center gap-0.5 font-mono text-[var(--accent)] shrink-0 tabular-nums",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitPullRequest, { className: "size-3" }),
													"#",
													issue.github.prNumber
												]
											})]
										})
									]
								}, issue.id);
							})
						})]
					}, col.id);
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-5",
				"data-testid": "linear-list-view",
				children: SIMPLE_BOARD_COLUMNS.map((col) => {
					const colItems = groupedBoard[col.id] || [];
					if (colItems.length === 0) return null;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "px-4 py-2.5 bg-[var(--surface-subtle)]/60 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColumnStatusIcon, { colId: col.id }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[12.5px] font-medium text-[var(--ink)]",
										children: col.label
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
										children: colItems.length
									})
								]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "divide-y divide-[var(--border-subtle)]",
							children: colItems.map((issue) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSelectedIssueId(issue.id),
								className: cn("w-full px-4 h-11 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors hover:bg-[var(--surface-hover)]", selectedIssueId === issue.id && "bg-[var(--accent-soft)]/40"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3 min-w-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: cn("h-1.5 w-1.5 rounded-full shrink-0", priorityDotClass(issue.priority)),
											title: getPriorityMeta(issue.priority).label
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap shrink-0 w-[68px]",
											children: issue.identifier
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[13px] font-medium text-[var(--ink)] truncate",
											children: issue.title
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3 text-[12px] text-[var(--ink-subtle)] shrink-0",
									children: [issue.github?.prNumber && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "hidden sm:inline-flex items-center gap-0.5 font-mono text-[var(--accent)] tabular-nums",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitPullRequest, { className: "size-3" }),
											"#",
											issue.github.prNumber
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "max-w-[120px] truncate",
										children: shortAgentName(issue.assigneeName)
									})]
								})]
							}, issue.id))
						})]
					}, col.id);
				})
			}),
			selectedIssue && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				"aria-label": "任务详情检查器",
				"data-testid": "linear-issue-drawer",
				className: "fixed inset-y-0 right-0 z-40 w-full max-w-[400px] border-l border-[var(--border)] bg-[var(--surface-elevated)] shadow-2xl flex flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "h-14 px-5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[13px] font-semibold text-[var(--ink-muted)] tabular-nums",
						children: selectedIssue.identifier
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [!readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": `删除 ${selectedIssue.identifier}`,
							onClick: () => void handleDelete(selectedIssue),
							className: cn("h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-subtle)] hover:text-[var(--err)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, { className: "size-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "关闭详情",
							onClick: () => setSelectedIssueId(null),
							className: cn("h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 overflow-y-auto p-5 space-y-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-[16px] font-semibold text-[var(--ink)] leading-snug",
								children: selectedIssue.title
							}), selectedIssue.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[13px] text-[var(--ink-muted)] leading-relaxed",
								children: selectedIssue.description
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 pt-4 border-t border-[var(--border-subtle)] text-[12.5px]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "grid grid-cols-3 items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-subtle)]",
										children: "状态"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										disabled: readOnly,
										value: selectedIssue.status,
										onChange: (e) => void handleUpdateIssue(selectedIssue.id, { status: e.target.value }),
										className: cn("col-span-2 ui-select h-8 pl-2.5 pr-7 text-[12.5px] cursor-pointer", inputBaseClass),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "triage",
												children: "待分诊"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "todo",
												children: "待执行"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "in_progress",
												children: "执行中"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "in_review",
												children: "待评审"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "done",
												children: "已完成"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "grid grid-cols-3 items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-subtle)]",
										children: "优先级"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										disabled: readOnly,
										value: selectedIssue.priority,
										onChange: (e) => void handleUpdateIssue(selectedIssue.id, { priority: e.target.value }),
										className: cn("col-span-2 ui-select h-8 pl-2.5 pr-7 text-[12.5px] cursor-pointer", inputBaseClass),
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
									className: "grid grid-cols-3 items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-subtle)]",
										children: "指派 Agent"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										disabled: readOnly,
										value: selectedIssue.assigneeId || "",
										onChange: (e) => {
											const next = agents.find((a) => a.id === e.target.value);
											if (!next) return;
											handleUpdateIssue(selectedIssue.id, {
												assigneeType: "agent",
												assigneeId: next.id,
												assigneeName: next.name
											});
										},
										className: cn("col-span-2 ui-select h-8 pl-2.5 pr-7 text-[12.5px] cursor-pointer", inputBaseClass),
										children: [!agents.some((a) => a.id === selectedIssue.assigneeId) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: selectedIssue.assigneeId,
											children: selectedIssue.assigneeName
										}), agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: a.id,
											children: shortAgentName(a.name)
										}, a.id))]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-3 items-center gap-2 pt-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-subtle)]",
										children: "当前状态"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "col-span-2",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
											status: getIssueStatusMeta(selectedIssue.status).tone,
											label: getIssueStatusMeta(selectedIssue.status).label
										})
									})]
								}),
								selectedIssue.worktreeBranch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-3 items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-subtle)]",
										children: "分支"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "col-span-2 inline-flex items-center gap-1 font-mono text-[12px] text-[var(--ink-muted)] truncate",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "size-3 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate",
											children: selectedIssue.worktreeBranch
										})]
									})]
								}),
								selectedIssue.github?.prNumber && safeGithubHref(selectedIssue.github.url) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-3 items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-subtle)]",
										children: "GitHub PR"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: safeGithubHref(selectedIssue.github.url),
										target: "_blank",
										rel: "noopener noreferrer",
										className: "col-span-2 inline-flex items-center gap-1 font-mono text-[12px] text-[var(--accent)] hover:underline",
										children: [
											"PR #",
											selectedIssue.github.prNumber,
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })
										]
									})]
								})
							]
						}),
						!selectedIssue.parentId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-4 border-t border-[var(--border-subtle)]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "primary",
								size: "md",
								className: "w-full",
								disabled: readOnly || dispatchingId === selectedIssue.id,
								onClick: () => void handleDispatch(selectedIssue.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "size-4" }), dispatchingId === selectedIssue.id ? "总指挥拆解派发中..." : "交由总指挥拆解并派发"]
							})
						})
					]
				})]
			})
		]
	});
}
export { ProjectsView, ProjectsView as default };
