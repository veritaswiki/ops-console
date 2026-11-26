const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/LinearGraphCanvas-D4S29YWW.js","assets/rolldown-runtime-Bl4WtXjF.js","assets/vendor-charts-Cc1dpEBz.js","assets/vendor-flow-aUB-QjJm.js","assets/vendor-ui-DUVxOpTN.js","assets/vendor-motion-BAjclsVr.js","assets/linear-projects-LAF1L5Uq.js","assets/agent-console-CqfDRRqZ.js","assets/app-nZGM7CNZ.js","assets/vendor-react-D8TP-cyN.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { $ as RefreshCw, T as __vitePreload } from "./vendor-ui-DUVxOpTN.js";
import { L as cn, _t as fetchLinearState, at as dispatchLinearCommander, b as WidgetSkeleton, cn as updateLinearIssue, d as ErrorState, l as Button, y as ViewSkeleton } from "./app-nZGM7CNZ.js";
import { r as shortAgentName } from "./agent-console-CqfDRRqZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/AgentGraphView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var LazyLinearGraphCanvas = import_react.lazy(() => __vitePreload(() => import("./LinearGraphCanvas-D4S29YWW.js").then((m) => ({ default: m.LinearGraphCanvas })), __vite__mapDeps([0,1,2,3,4,5,6,7,8,9])));
function AgentGraphView({ readOnly = false, onToast }) {
	const [linearState, setLinearState] = import_react.useState(null);
	const [loading, setLoading] = import_react.useState(true);
	const [refreshing, setRefreshing] = import_react.useState(false);
	const [error, setError] = import_react.useState(null);
	const [dispatchingId, setDispatchingId] = import_react.useState(null);
	const loadState = import_react.useCallback(async () => {
		setRefreshing(true);
		setError(null);
		try {
			const data = await fetchLinearState();
			setLinearState(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载分配图谱失败");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);
	import_react.useEffect(() => {
		loadState();
	}, [loadState]);
	const handleUpdateIssue = async (issueId, patch) => {
		if (readOnly) return;
		try {
			const res = await updateLinearIssue(issueId, patch);
			onToast?.(`已更新 ${res.issue.identifier}`, "ok");
			await loadState();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "更新任务失败", "err");
		}
	};
	const handleDispatchCommander = async (issueId) => {
		if (readOnly) return;
		setDispatchingId(issueId);
		try {
			const res = await dispatchLinearCommander(issueId);
			onToast?.(`总指挥 ${shortAgentName(res.commander.name)} 已拆解 ${res.createdSubIssues?.length || 0} 个子任务`, "ok");
			await loadState();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "总指挥派发失败", "err");
		} finally {
			setDispatchingId(null);
		}
	};
	if (loading && !linearState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewSkeleton, {});
	if (error && !linearState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
		title: "分配图谱加载失败",
		message: error,
		onRetry: () => void loadState()
	});
	const availableAgents = linearState?.availableAgents || [];
	const commanderAgent = availableAgents.find((a) => a.id === linearState?.commander.leadAgentId) || availableAgents.find((a) => a.role === "lead") || availableAgents[0] || null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		"data-testid": "view-agent-graph",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline gap-3 min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-[18px] font-semibold tracking-tight text-[var(--ink)] whitespace-nowrap",
					children: "分配图谱"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden sm:inline text-[12.5px] text-[var(--ink-subtle)] truncate",
					children: "点击任意节点查看参数、改派执行 Agent 或触发总指挥拆解"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "secondary",
				size: "sm",
				disabled: refreshing,
				onClick: () => void loadState(),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-3.5", refreshing && "animate-spin") }), "刷新"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
				heightClass: "h-[560px]",
				label: "正在加载工作流画布"
			}),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LazyLinearGraphCanvas, {
				commanderName: commanderAgent?.name || "总指挥 Agent",
				commanderId: commanderAgent?.id || linearState?.commander.leadAgentId || "lead",
				issues: linearState?.issues || [],
				projects: linearState?.projects || [],
				availableAgents,
				availableBots: linearState?.availableBots || [],
				readOnly,
				dispatchingId,
				onUpdateIssue: handleUpdateIssue,
				onDispatchCommander: handleDispatchCommander
			})
		})]
	});
}
export { AgentGraphView, AgentGraphView as default };
