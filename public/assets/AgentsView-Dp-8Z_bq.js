import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { Ot as GitBranch, R as Square, rt as Plus, tn as ArrowUp } from "./vendor-ui-DUVxOpTN.js";
import { I as FOCUS_RING, L as cn, V as cancelA2ATask, _ as StatusIndicator, dt as fetchA2AState, it as dispatchA2ATask, k as formatDateTime, l as Button } from "./app-nZGM7CNZ.js";
import { r as shortAgentName } from "./agent-console-CqfDRRqZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/AgentsView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function taskStatusTone(state) {
	if (state === "completed") return "healthy";
	if (state === "working" || state === "submitted") return "degraded";
	if (state === "failed" || state === "canceled") return "failed";
	return "standby";
}
function taskStatusLabel(state) {
	switch (state) {
		case "submitted": return "排队中";
		case "working": return "执行中";
		case "completed": return "已完成";
		case "failed": return "失败";
		case "canceled": return "已取消";
		default: return state;
	}
}
function formatDurationMs(ms) {
	if (ms == null || ms <= 0) return "-";
	if (ms < 1e3) return `${ms}ms`;
	return `${(ms / 1e3).toFixed(1)}s`;
}
function AgentsView({ readOnly = false, activeTaskId = null, onSelectTask, onTasksUpdated, onToast }) {
	const [a2aState, setA2aState] = import_react.useState(null);
	const [selectedTarget, setSelectedTarget] = import_react.useState("auto");
	const [prompt, setPrompt] = import_react.useState("");
	const [submitting, setSubmitting] = import_react.useState(false);
	const [canceling, setCanceling] = import_react.useState(false);
	const textareaRef = import_react.useRef(null);
	const loadState = import_react.useCallback(async () => {
		try {
			const res = await fetchA2AState();
			setA2aState(res);
		} catch {}
	}, []);
	import_react.useEffect(() => {
		loadState();
	}, [loadState, activeTaskId]);
	const agents = a2aState?.agents || [];
	const tasks = a2aState?.tasks || [];
	const leadAgent = import_react.useMemo(() => agents.find((a) => a.id === a2aState?.leadAgentId) || agents.find((a) => a.role === "lead") || agents[0] || null, [agents, a2aState?.leadAgentId]);
	const activeTask = import_react.useMemo(() => activeTaskId ? tasks.find((t) => t.id === activeTaskId) || null : null, [tasks, activeTaskId]);
	const isRunning = activeTask?.state === "working" || activeTask?.state === "submitted";
	import_react.useEffect(() => {
		if (!isRunning) return;
		const timer = window.setInterval(() => {
			if (document.visibilityState === "visible") loadState();
		}, 2500);
		return () => window.clearInterval(timer);
	}, [isRunning, loadState]);
	const handleSubmit = async (e) => {
		e?.preventDefault();
		const text = prompt.trim();
		if (readOnly || !text || submitting) return;
		setSubmitting(true);
		try {
			const res = await dispatchA2ATask({
				prompt: text,
				targetAgentId: selectedTarget === "auto" ? void 0 : selectedTarget
			});
			setPrompt("");
			await loadState();
			onTasksUpdated?.();
			if (res.task?.id) onSelectTask?.(res.task.id);
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "指令发送失败", "err");
		} finally {
			setSubmitting(false);
		}
	};
	const handleCancel = async () => {
		if (readOnly || !activeTask || canceling) return;
		setCanceling(true);
		try {
			await cancelA2ATask(activeTask.id);
			await loadState();
			onTasksUpdated?.();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "取消失败", "err");
		} finally {
			setCanceling(false);
		}
	};
	const renderComposer = (compact = false) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit,
		"data-testid": "agent-console-composer",
		className: cn("w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-within:border-[var(--accent)] transition-colors duration-150", compact ? "p-3" : "p-4"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
			ref: textareaRef,
			rows: compact ? 2 : 3,
			disabled: readOnly || submitting,
			value: prompt,
			onChange: (e) => setPrompt(e.target.value),
			onKeyDown: (e) => {
				if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
					e.preventDefault();
					handleSubmit();
				}
			},
			placeholder: "输入任务或问题，按 Enter 发送...",
			"aria-label": "输入 Agent 指令",
			"data-testid": "agent-console-input",
			className: "w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]/70 flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				"aria-label": "选择模型与 Harness",
				"data-testid": "agent-model-select",
				disabled: readOnly || submitting,
				value: selectedTarget,
				onChange: (e) => setSelectedTarget(e.target.value),
				className: cn("ui-select h-8 max-w-[260px] rounded-lg border border-transparent hover:border-[var(--border)] bg-[var(--surface-subtle)]/70 pl-2.5 pr-7 text-[12.5px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer transition-colors truncate", FOCUS_RING),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
					value: "auto",
					children: ["自动调度 · ", leadAgent ? shortAgentName(leadAgent.name) : "总指挥"]
				}), agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
					value: a.id,
					children: [
						shortAgentName(a.name),
						" · ",
						a.modelHint || a.harness
					]
				}, a.id))]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "submit",
				disabled: readOnly || submitting || !prompt.trim(),
				"aria-label": "发送指令",
				"data-testid": "agent-console-run-btn",
				className: cn("h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 transition-[background-color,opacity,transform] duration-150 cursor-pointer active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed", "bg-[var(--accent)] text-white hover:opacity-90", FOCUS_RING),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, {
					className: "size-4",
					strokeWidth: 2.2
				})
			})]
		})]
	});
	if (!activeTask) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		"data-testid": "view-agent-console",
		className: "min-h-[calc(100dvh-10rem)] flex flex-col items-center justify-center w-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-[680px] mx-auto space-y-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-center text-[26px] sm:text-[32px] font-semibold tracking-tight text-[var(--ink)] text-balance",
				children: "今天想让 Agent 完成什么？"
			}), renderComposer(false)]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"data-testid": "view-agent-console",
		className: "min-h-[calc(100dvh-9rem)] max-w-[740px] w-full mx-auto flex flex-col justify-between gap-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5 min-w-0 text-[12.5px] text-[var(--ink-subtle)] font-mono tabular-nums",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
								status: taskStatusTone(activeTask.state),
								label: taskStatusLabel(activeTask.state)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: "·"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate text-[var(--ink-muted)]",
								children: shortAgentName(activeTask.workerAgentName || activeTask.leadAgentName)
							}),
							activeTask.appliedModel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: "·"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: activeTask.appliedModel
							})] })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 shrink-0",
						children: [isRunning && !readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "ghost",
							size: "sm",
							disabled: canceling,
							onClick: () => void handleCancel(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3 text-[var(--err)]" }), "停止"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							"data-testid": "agent-new-thread-btn",
							onClick: () => {
								onSelectTask?.(null);
								window.setTimeout(() => textareaRef.current?.focus(), 40);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "新对话"]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-w-[85%] rounded-2xl bg-[var(--surface-active)] border border-[var(--border)] px-4 py-3 text-[14px] leading-relaxed text-[var(--ink)] break-words",
						children: activeTask.prompt
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4 text-[14px] leading-relaxed text-[var(--ink)]",
					"data-testid": "agent-thread-response",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink-muted)]",
									children: shortAgentName(activeTask.workerAgentName || activeTask.leadAgentName)
								}),
								activeTask.worktreeBranch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "size-3" }), activeTask.worktreeBranch]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDurationMs(activeTask.durationMs) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDateTime(activeTask.createdAt) })
							]
						}),
						activeTask.steps && activeTask.steps.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "space-y-1.5 pl-0.5 text-[13px] text-[var(--ink-muted)]",
							children: activeTask.steps.map((step, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-baseline gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums shrink-0",
									children: String(idx + 1).padStart(2, "0")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "break-words",
									children: step.detail || step.state
								})]
							}, `${activeTask.id}-step-${idx}`))
						}),
						activeTask.artifact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 font-mono text-[12.5px] leading-relaxed text-[var(--ink)] whitespace-pre-wrap break-words overflow-x-auto",
							children: activeTask.artifact
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pt-2",
			children: renderComposer(true)
		})]
	});
}
export { AgentsView, AgentsView as default };
