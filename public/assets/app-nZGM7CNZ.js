const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ArchitectureGraph-Bi6KwZoe.js","assets/rolldown-runtime-Bl4WtXjF.js","assets/vendor-charts-Cc1dpEBz.js","assets/vendor-flow-aUB-QjJm.js","assets/vendor-ui-DUVxOpTN.js","assets/vendor-motion-BAjclsVr.js","assets/MetricsChart-Lp0cbkuM.js","assets/AlertsView-CUqQT4RG.js","assets/FleetView-rxinj4LL.js","assets/ServicesView-DAVz6-aw.js","assets/PluginsView-DjLdrkoi.js","assets/McpView-BmtPmIMP.js","assets/MemoryView-B-XK6t8x.js","assets/AgentsView-Dp-8Z_bq.js","assets/agent-console-CqfDRRqZ.js","assets/linear-projects-LAF1L5Uq.js","assets/ProjectsView-C3l76A5f.js","assets/AgentGraphView-A92nb9b5.js","assets/BotsView-CQcC6AL-.js","assets/GithubView-BzoexH7-.js","assets/AgentSettingsView-gx90vsTv.js","assets/NetworkView-Br3mE_l3.js","assets/LogsView-C88UZipJ.js","assets/OpsView-BkW4P3bO.js"])))=>i.map(i=>d[i]);
import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react, y as clsx } from "./vendor-charts-Cc1dpEBz.js";
import { t as require_client } from "./vendor-react-D8TP-cyN.js";
import { at as MotionConfig } from "./vendor-motion-BAjclsVr.js";
import { $ as RefreshCw, $t as Bell, A as Wrench, C as SegmentedControlIndicator, D as _e, Dt as GitFork, E as NumberFlow, F as Terminal, Ft as Download, H as SlidersHorizontal, I as Sun, It as Database, Jt as Check, Kt as ChevronRight, N as TriangleExclamationPoint, Ot as GitBranch, Q as RotateCcw, Qt as Blocks, S as SegmentedControl, St as Inbox, T as __vitePreload, Tt as Globe, Xt as Bot, Y as Search, _ as AlertDialogBackdrop, _t as LogOut, b as AlertDialogDescription, bt as Layers, c as MeterTrack, cn as Toaster, ct as PanelLeftClose, d as Dialog, dt as Moon, f as DialogBackdrop, g as AlertDialog, h as DialogTitle, it as Plug, j as WifiOff, k as X, l as Switch, ln as toast, m as DialogDescription, mt as Menu, o as Meter, p as DialogContent, pt as MessageSquare, qt as ChevronDown, rt as Plus, s as MeterIndicator, sn as Drawer, st as PanelLeftOpen, u as SwitchThumb, ut as Network, v as AlertDialogClose, w as SegmentedControlItem, x as AlertDialogTitle, y as AlertDialogContent, yt as LayoutGrid, z as SquareKanban } from "./vendor-ui-DUVxOpTN.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
// web/styles.css
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_client = require_client();
// web/api.ts
var MAX_API_CACHE_ENTRIES = 64;
var responseCache = /* @__PURE__ */ new Map();
var inflightGets = /* @__PURE__ */ new Map();
function clearApiCache(prefix) {
	if (!prefix) {
		responseCache.clear();
		return;
	}
	for (const key of responseCache.keys()) if (key.startsWith(prefix)) responseCache.delete(key);
}
function setCachedResponse(key, data, ttlMs) {
	if (ttlMs <= 0) return;
	if (responseCache.has(key)) responseCache.delete(key);
	responseCache.set(key, {
		data,
		expiresAt: Date.now() + ttlMs
	});
	while (responseCache.size > MAX_API_CACHE_ENTRIES) {
		const oldest = responseCache.keys().next().value;
		if (oldest === void 0) break;
		responseCache.delete(oldest);
	}
}
async function apiRequest(url, options = {}) {
	const { cacheTtlMs = 0, dedupe = true, ...fetchOptions } = options;
	const isGet = (fetchOptions.method || "GET").toUpperCase() === "GET";
	if (!isGet) clearApiCache();
	if (isGet && cacheTtlMs > 0 && !fetchOptions.signal) {
		const cached = responseCache.get(url);
		if (cached && cached.expiresAt > Date.now()) return cached.data;
		if (cached) responseCache.delete(url);
	}
	if (isGet && dedupe && !fetchOptions.signal && inflightGets.has(url)) return inflightGets.get(url);
	const runFetch = async () => {
		const headers = {
			Accept: "application/json",
			...fetchOptions.headers || {}
		};
		if (fetchOptions.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
		const res = await fetch(url, {
			credentials: "same-origin",
			...fetchOptions,
			headers
		});
		const text = await res.text();
		let data = null;
		try {
			data = text ? JSON.parse(text) : null;
		} catch {
			data = { raw: text };
		}
		if (!res.ok) {
			const errObj = data;
			const msg = errObj?.error || errObj?.message || `HTTP ${res.status}`;
			const err = new Error(msg);
			err.status = res.status;
			err.payload = data;
			throw err;
		}
		if (isGet && cacheTtlMs > 0) setCachedResponse(url, data, cacheTtlMs);
		return data;
	};
	if (isGet && dedupe && !fetchOptions.signal) {
		const promise = runFetch().finally(() => {
			inflightGets.delete(url);
		});
		inflightGets.set(url, promise);
		return promise;
	}
	return runFetch();
}
var fetchMeta = (signal) => apiRequest("/api/meta", {
	cacheTtlMs: 3e4,
	signal
});
var fetchSnapshot = (force = false, signal) => apiRequest(force ? "/api/snapshot?refresh=1" : "/api/snapshot", {
	cacheTtlMs: force ? 0 : 2500,
	dedupe: !force,
	signal
});
var fetchProbes = (signal) => apiRequest("/api/probes", {
	cacheTtlMs: 4e3,
	signal
});
var fetchIncidents = (limit = 30, signal) => apiRequest(`/api/incidents?limit=${limit}`, {
	cacheTtlMs: 4e3,
	signal
});
var saveIncidentNote = (incidentId, note) => apiRequest(`/api/incidents/${encodeURIComponent(String(incidentId))}/note`, {
	method: "POST",
	body: JSON.stringify({ note })
});
var fetchMetricsSeries = (series = "fleet", range = "24h", signal) => {
	return apiRequest(`/api/metrics/series?${new URLSearchParams({
		series,
		range
	}).toString()}`, {
		cacheTtlMs: 8e3,
		signal
	});
};
var fetchPrometheusMetrics = async (signal) => {
	const res = await fetch("/api/metrics", {
		credentials: "same-origin",
		signal
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.text();
};
var fetchAlerts = (signal) => apiRequest("/api/alerts", {
	cacheTtlMs: 3e3,
	signal
});
var createAlertRule = (payload) => apiRequest("/api/alerts/rules", {
	method: "POST",
	body: JSON.stringify(payload)
});
var toggleAlertRule = (ruleId, enabled) => apiRequest(`/api/alerts/rules/${encodeURIComponent(ruleId)}`, {
	method: "PATCH",
	body: JSON.stringify({ enabled })
});
var deleteAlertRule = (ruleId) => apiRequest(`/api/alerts/rules/${encodeURIComponent(ruleId)}`, { method: "DELETE" });
var ackAlert = (alertId) => apiRequest(`/api/alerts/${encodeURIComponent(alertId)}/ack`, {
	method: "POST",
	body: JSON.stringify({})
});
var setAlertSilence = (minutes) => apiRequest("/api/alerts/silence", {
	method: "POST",
	body: JSON.stringify({ minutes })
});
var fetchGatewayTelemetry = (signal) => apiRequest("/api/gateway/telemetry", {
	cacheTtlMs: 5e3,
	signal
});
var compareMemoryRetrieval = (q, signal) => {
	return apiRequest(`/api/memory/compare?${new URLSearchParams({ q }).toString()}`, { signal });
};
var fetchRunbooks = (signal) => apiRequest("/api/runbooks", {
	cacheTtlMs: 5e3,
	signal
});
var runRunbook = (runbookId) => apiRequest(`/api/runbooks/${encodeURIComponent(runbookId)}/run`, {
	method: "POST",
	body: JSON.stringify({})
});
var fetchProbeCommands = (nodeId, signal) => apiRequest(`/api/probes/${encodeURIComponent(nodeId)}/commands`, { signal });
var enqueueProbeCommand = (nodeId, command) => apiRequest(`/api/probes/${encodeURIComponent(nodeId)}/commands`, {
	method: "POST",
	body: JSON.stringify({ command })
});
var fetchConfigStudio = (signal) => apiRequest("/api/config/studio", {
	cacheTtlMs: 5e3,
	signal
});
var validateConfigStudio = (rawJson) => apiRequest("/api/config/validate", {
	method: "POST",
	body: JSON.stringify({ rawJson })
});
var fetchAudit = (limit = 40, signal) => apiRequest(`/api/audit?limit=${limit}`, {
	cacheTtlMs: 4e3,
	signal
});
var fetchLogs = (params, signal) => {
	const qs = new URLSearchParams();
	qs.set("source", params.source);
	if (params.target) qs.set("target", params.target);
	if (params.since) qs.set("since", params.since);
	if (params.level && params.level !== "all") qs.set("level", params.level);
	if (params.q.trim()) qs.set("q", params.q.trim());
	if (params.regex) qs.set("regex", "1");
	qs.set("lines", String(params.lines ?? 200));
	return apiRequest(`/api/logs?${qs.toString()}`, {
		signal,
		dedupe: false
	});
};
var buildLogStreamUrl = (params) => {
	const qs = new URLSearchParams();
	qs.set("source", params.source);
	if (params.target) qs.set("target", params.target);
	if (params.level && params.level !== "all") qs.set("level", params.level);
	if (params.q.trim()) qs.set("q", params.q.trim());
	if (params.regex) qs.set("regex", "1");
	return `/api/logs/stream?${qs.toString()}`;
};
var searchMemory = (q, provider) => {
	return apiRequest(`/api/memory/search?${new URLSearchParams({
		q,
		provider
	}).toString()}`);
};
var runMemoryDoctor = () => apiRequest("/api/memory/doctor", {
	method: "POST",
	body: JSON.stringify({})
});
var issueConfirmToken = (unit, action) => apiRequest("/api/actions/confirm-token", {
	method: "POST",
	body: JSON.stringify({
		unit,
		action
	})
});
var executeServiceAction = (serviceId, action, confirmToken) => apiRequest("/api/services/control", {
	method: "POST",
	body: JSON.stringify(confirmToken ? {
		id: serviceId,
		unit: serviceId,
		action,
		confirmToken
	} : {
		id: serviceId,
		unit: serviceId,
		action
	})
});
var executeTimerAction = (unit, action) => apiRequest("/api/timers/control", {
	method: "POST",
	body: JSON.stringify({
		unit,
		action
	})
});
var runOpsAction = (action) => apiRequest(`/api/ops/${action}`, {
	method: "POST",
	body: JSON.stringify({})
});
var probeRemotes = () => apiRequest("/api/remotes?refresh=1");
var submitMobileCheckin = (payload) => apiRequest("/api/probes/checkin", {
	method: "POST",
	body: JSON.stringify({
		nodeId: payload.id,
		name: payload.name,
		region: payload.region,
		lat: payload.lat,
		lon: payload.lon,
		battery: payload.batteryPct != null && Number.isFinite(payload.batteryPct) ? { percent: payload.batteryPct } : null,
		note: payload.note
	})
});
var enrollProbe = (payload) => apiRequest("/api/probes/enroll", {
	method: "POST",
	body: JSON.stringify(payload)
});
var revokeProbe = (probeId) => apiRequest(`/api/probes/${encodeURIComponent(probeId)}`, { method: "DELETE" });
var fetchPlugins = (refresh = false, signal) => apiRequest(refresh ? "/api/plugins?refresh=1" : "/api/plugins", {
	cacheTtlMs: refresh ? 0 : 4e3,
	dedupe: !refresh,
	signal
});
var togglePlugin = (pluginId, enabled) => apiRequest(`/api/plugins/${encodeURIComponent(pluginId)}/toggle`, {
	method: "POST",
	body: JSON.stringify({ enabled })
});
var updatePluginConfig = (pluginId, config) => apiRequest(`/api/plugins/${encodeURIComponent(pluginId)}/config`, {
	method: "POST",
	body: JSON.stringify(config)
});
var testPlugin = (pluginId, config) => apiRequest(`/api/plugins/${encodeURIComponent(pluginId)}/test`, {
	method: "POST",
	body: JSON.stringify(config ? { config } : {})
});
var addCustomPlugin = (payload) => apiRequest("/api/plugins/custom", {
	method: "POST",
	body: JSON.stringify(payload)
});
var removeCustomPlugin = (pluginId) => apiRequest(`/api/plugins/custom/${encodeURIComponent(pluginId)}`, { method: "DELETE" });
var fetchMcps = (nodeId = "", signal) => {
	return apiRequest(`/api/mcps${nodeId ? `?nodeId=${encodeURIComponent(nodeId)}` : ""}`, {
		cacheTtlMs: 3e3,
		signal
	});
};
var registerMcp = (payload) => apiRequest("/api/mcps", {
	method: "POST",
	body: JSON.stringify(payload)
});
var toggleMcp = (mcpId, enabled) => apiRequest(`/api/mcps/${encodeURIComponent(mcpId)}/toggle`, {
	method: "POST",
	body: JSON.stringify({ enabled })
});
var testMcp = (mcpId) => apiRequest(`/api/mcps/${encodeURIComponent(mcpId)}/test`, {
	method: "POST",
	body: JSON.stringify({})
});
var syncMcpToNodes = (mcpId, targetNodeIds) => apiRequest(`/api/mcps/${encodeURIComponent(mcpId)}/sync`, {
	method: "POST",
	body: JSON.stringify({ targetNodeIds })
});
var deleteMcp = (mcpId) => apiRequest(`/api/mcps/${encodeURIComponent(mcpId)}`, { method: "DELETE" });
var fetchA2AState = (signal) => apiRequest("/api/a2a/state", {
	cacheTtlMs: 3e3,
	signal
});
var setLeadA2AAgent = (agentId) => apiRequest("/api/a2a/lead", {
	method: "POST",
	body: JSON.stringify({ agentId })
});
var registerA2AAgent = (payload) => apiRequest("/api/a2a/agents", {
	method: "POST",
	body: JSON.stringify(payload)
});
var updateA2AAgent = (agentId, patch) => apiRequest(`/api/a2a/agents/${encodeURIComponent(agentId)}`, {
	method: "PATCH",
	body: JSON.stringify(patch)
});
var deleteA2AAgent = (agentId) => apiRequest(`/api/a2a/agents/${encodeURIComponent(agentId)}`, { method: "DELETE" });
var discoverA2AAgent = (agentId) => apiRequest(`/api/a2a/agents/${encodeURIComponent(agentId)}/discover`, {
	method: "POST",
	body: JSON.stringify({})
});
var discoverLocalA2AAgents = () => apiRequest("/api/a2a/discover-local", {
	method: "POST",
	body: JSON.stringify({})
});
var updateA2AOrchestrationConfig = (patch) => apiRequest("/api/a2a/config", {
	method: "PUT",
	body: JSON.stringify(patch)
});
var saveA2ATopologyPositions = (positions) => apiRequest("/api/a2a/topology", {
	method: "PUT",
	body: JSON.stringify({ positions })
});
var upsertA2ARoutingRule = (payload) => apiRequest("/api/a2a/routes", {
	method: "POST",
	body: JSON.stringify(payload)
});
var deleteA2ARoutingRule = (ruleId) => apiRequest(`/api/a2a/routes/${encodeURIComponent(ruleId)}`, { method: "DELETE" });
var upsertA2ASkill = (payload) => apiRequest("/api/a2a/skills", {
	method: "POST",
	body: JSON.stringify(payload)
});
var updateA2ASkill = (skillId, patch) => apiRequest(`/api/a2a/skills/${encodeURIComponent(skillId)}`, {
	method: "PATCH",
	body: JSON.stringify(patch)
});
var deleteA2ASkill = (skillId) => apiRequest(`/api/a2a/skills/${encodeURIComponent(skillId)}`, { method: "DELETE" });
var createA2ASession = (payload) => apiRequest("/api/a2a/sessions", {
	method: "POST",
	body: JSON.stringify(payload)
});
var syncA2ASession = (sessionId, extraNodes) => apiRequest(`/api/a2a/sessions/${encodeURIComponent(sessionId)}/sync`, {
	method: "POST",
	body: JSON.stringify({ extraNodes })
});
var handoffA2ASession = (sessionId, targetAgentId) => apiRequest(`/api/a2a/sessions/${encodeURIComponent(sessionId)}/handoff`, {
	method: "POST",
	body: JSON.stringify({ targetAgentId })
});
var dispatchA2ATask = (payload) => apiRequest("/api/a2a/tasks", {
	method: "POST",
	body: JSON.stringify(payload)
});
var cancelA2ATask = (taskId) => apiRequest(`/api/a2a/tasks/${encodeURIComponent(taskId)}/cancel`, {
	method: "POST",
	body: JSON.stringify({})
});
var fetchA2ALogs = (params = {}, signal) => {
	const sp = new URLSearchParams();
	if (params.agentId && params.agentId !== "all") sp.set("agentId", params.agentId);
	if (params.eventType && params.eventType !== "all") sp.set("eventType", params.eventType);
	if (params.level && params.level !== "all") sp.set("level", params.level);
	if (params.q) sp.set("q", params.q);
	if (params.limit) sp.set("limit", String(params.limit));
	const qs = sp.toString();
	return apiRequest(`/api/a2a/logs${qs ? `?${qs}` : ""}`, {
		cacheTtlMs: 0,
		signal
	});
};
var updateSuperAgentConfig = (payload) => apiRequest("/api/a2a/superagent/config", {
	method: "PUT",
	body: JSON.stringify(payload)
});
var ingestSuperAgentTrigger = (payload) => apiRequest("/api/a2a/superagent/triggers", {
	method: "POST",
	body: JSON.stringify(payload)
});
var toggleSuperAgentContextSpill = (spillId, state) => apiRequest(`/api/a2a/superagent/context/${encodeURIComponent(spillId)}/toggle`, {
	method: "POST",
	body: JSON.stringify(state ? { state } : {})
});
var runSuperAgentWatchdogSweep = () => apiRequest("/api/a2a/superagent/watchdog/sweep", {
	method: "POST",
	body: JSON.stringify({})
});
var runDshTeamCollaboration = (payload) => apiRequest("/api/a2a/dsh-team/run", {
	method: "POST",
	body: JSON.stringify(payload)
});
function openA2ALogStream(params, handlers) {
	const sp = new URLSearchParams();
	if (params.agentId && params.agentId !== "all") sp.set("agentId", params.agentId);
	if (params.eventType && params.eventType !== "all") sp.set("eventType", params.eventType);
	if (params.level && params.level !== "all") sp.set("level", params.level);
	const qs = sp.toString();
	const url = `/api/a2a/logs/stream${qs ? `?${qs}` : ""}`;
	handlers.onStateChange?.("connecting");
	const es = new EventSource(url, { withCredentials: true });
	es.addEventListener("init", (ev) => {
		handlers.onStateChange?.("live");
		try {
			const parsed = JSON.parse(ev.data);
			if (Array.isArray(parsed?.items)) handlers.onInit?.(parsed.items);
		} catch {}
	});
	es.addEventListener("a2a_log", (ev) => {
		handlers.onStateChange?.("live");
		try {
			const entry = JSON.parse(ev.data);
			if (entry?.id) handlers.onLog?.(entry);
		} catch {}
	});
	es.onerror = () => {
		handlers.onStateChange?.("error");
	};
	return () => {
		es.close();
	};
}
var fetchAiOpsContext = (signal) => apiRequest("/api/ai/context", {
	cacheTtlMs: 4e3,
	signal
});
var runAiPreflight = (payload) => apiRequest("/api/ai/preflight", {
	method: "POST",
	body: JSON.stringify(payload)
});
var fetchLinearState = (signal) => apiRequest("/api/linear/state", {
	cacheTtlMs: 2500,
	signal
});
var updateLinearCommander = (patch) => apiRequest("/api/linear/commander", {
	method: "PUT",
	body: JSON.stringify(patch)
});
var createLinearProject = (payload) => apiRequest("/api/linear/projects", {
	method: "POST",
	body: JSON.stringify(payload)
});
var createLinearIssue = (payload) => apiRequest("/api/linear/issues", {
	method: "POST",
	body: JSON.stringify(payload)
});
var updateLinearIssue = (issueId, patch) => apiRequest(`/api/linear/issues/${encodeURIComponent(issueId)}`, {
	method: "PATCH",
	body: JSON.stringify(patch)
});
var deleteLinearIssue = (issueId) => apiRequest(`/api/linear/issues/${encodeURIComponent(issueId)}`, { method: "DELETE" });
var dispatchLinearCommander = (issueId) => apiRequest(`/api/linear/issues/${encodeURIComponent(issueId)}/dispatch`, {
	method: "POST",
	body: JSON.stringify({})
});
var updateLinearGithubConfig = (patch) => apiRequest("/api/linear/github/config", {
	method: "PUT",
	body: JSON.stringify(patch)
});
var syncLinearGithub = (direction) => apiRequest("/api/linear/github/sync", {
	method: "POST",
	body: JSON.stringify(direction ? { direction } : {})
});
var fetchBots = (signal) => apiRequest("/api/bots", {
	cacheTtlMs: 2500,
	signal
});
var createBot = (payload) => apiRequest("/api/bots", {
	method: "POST",
	body: JSON.stringify(payload)
});
var updateBot = (botId, patch) => apiRequest(`/api/bots/${encodeURIComponent(botId)}`, {
	method: "PATCH",
	body: JSON.stringify(patch)
});
var deleteBot = (botId) => apiRequest(`/api/bots/${encodeURIComponent(botId)}`, { method: "DELETE" });
var triggerBotEvent = (botId, payload) => apiRequest(`/api/bots/${encodeURIComponent(botId)}/trigger`, {
	method: "POST",
	body: JSON.stringify(payload)
});
var logoutSession = () => apiRequest("/api/auth/logout", {
	method: "POST",
	body: JSON.stringify({})
});
async function copyToClipboard(text) {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {}
	try {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand("copy");
		ta.remove();
		return ok;
	} catch {
		return false;
	}
}
// node_modules/tailwind-merge/dist/bundle-mjs.mjs
/**
* Concatenates two arrays faster than the array spread operator.
*/
var concatArrays = (array1, array2) => {
	const combinedArray = new Array(array1.length + array2.length);
	for (let i = 0; i < array1.length; i++) combinedArray[i] = array1[i];
	for (let i = 0; i < array2.length; i++) combinedArray[array1.length + i] = array2[i];
	return combinedArray;
};
var createClassValidatorObject = (classGroupId, validator) => ({
	classGroupId,
	validator
});
var createClassPartObject = (nextPart = /* @__PURE__ */ new Map(), validators = null, classGroupId) => ({
	nextPart,
	validators,
	classGroupId
});
var CLASS_PART_SEPARATOR = "-";
var EMPTY_CONFLICTS = [];
var ARBITRARY_PROPERTY_PREFIX = "arbitrary..";
var createClassGroupUtils = (config) => {
	const classMap = createClassMap(config);
	const { conflictingClassGroups, conflictingClassGroupModifiers } = config;
	const getClassGroupId = (className) => {
		if (className.startsWith("[") && className.endsWith("]")) return getGroupIdForArbitraryProperty(className);
		const classParts = className.split(CLASS_PART_SEPARATOR);
		return getGroupRecursive(classParts, classParts[0] === "" && classParts.length > 1 ? 1 : 0, classMap);
	};
	const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
		if (hasPostfixModifier) {
			const modifierConflicts = conflictingClassGroupModifiers[classGroupId];
			const baseConflicts = conflictingClassGroups[classGroupId];
			if (modifierConflicts) {
				if (baseConflicts) return concatArrays(baseConflicts, modifierConflicts);
				return modifierConflicts;
			}
			return baseConflicts || EMPTY_CONFLICTS;
		}
		return conflictingClassGroups[classGroupId] || EMPTY_CONFLICTS;
	};
	return {
		getClassGroupId,
		getConflictingClassGroupIds
	};
};
var getGroupRecursive = (classParts, startIndex, classPartObject) => {
	if (classParts.length - startIndex === 0) return classPartObject.classGroupId;
	const currentClassPart = classParts[startIndex];
	const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
	if (nextClassPartObject) {
		const result = getGroupRecursive(classParts, startIndex + 1, nextClassPartObject);
		if (result) return result;
	}
	const validators = classPartObject.validators;
	if (validators === null) return;
	const classRest = startIndex === 0 ? classParts.join(CLASS_PART_SEPARATOR) : classParts.slice(startIndex).join(CLASS_PART_SEPARATOR);
	const validatorsLength = validators.length;
	for (let i = 0; i < validatorsLength; i++) {
		const validatorObj = validators[i];
		if (validatorObj.validator(classRest)) return validatorObj.classGroupId;
	}
};
/**
* Get the class group ID for an arbitrary property.
*
* @param className - The class name to get the group ID for. Is expected to be string starting with `[` and ending with `]`.
*/
var getGroupIdForArbitraryProperty = (className) => className.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
	const content = className.slice(1, -1);
	const colonIndex = content.indexOf(":");
	const property = content.slice(0, colonIndex);
	return property ? ARBITRARY_PROPERTY_PREFIX + property : void 0;
})();
/**
* Exported for testing only
*/
var createClassMap = (config) => {
	const { theme, classGroups } = config;
	return processClassGroups(classGroups, theme);
};
var processClassGroups = (classGroups, theme) => {
	const classMap = createClassPartObject();
	for (const classGroupId in classGroups) processClassesRecursively(classGroups[classGroupId], classMap, classGroupId, theme);
	return classMap;
};
var processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
	const len = classGroup.length;
	for (let i = 0; i < len; i++) processClassDefinition(classGroup[i], classPartObject, classGroupId, theme);
};
var processClassDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
	if (typeof classDefinition === "string") {
		processStringDefinition(classDefinition, classPartObject, classGroupId);
		return;
	}
	if (typeof classDefinition === "function") {
		processFunctionDefinition(classDefinition, classPartObject, classGroupId, theme);
		return;
	}
	processObjectDefinition(classDefinition, classPartObject, classGroupId, theme);
};
var processStringDefinition = (classDefinition, classPartObject, classGroupId) => {
	const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
	classPartObjectToEdit.classGroupId = classGroupId;
};
var processFunctionDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
	if (isThemeGetter(classDefinition)) {
		processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
		return;
	}
	if (classPartObject.validators === null) classPartObject.validators = [];
	classPartObject.validators.push(createClassValidatorObject(classGroupId, classDefinition));
};
var processObjectDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
	const entries = Object.entries(classDefinition);
	const len = entries.length;
	for (let i = 0; i < len; i++) {
		const [key, value] = entries[i];
		processClassesRecursively(value, getPart(classPartObject, key), classGroupId, theme);
	}
};
var getPart = (classPartObject, path) => {
	let current = classPartObject;
	const parts = path.split(CLASS_PART_SEPARATOR);
	const len = parts.length;
	for (let i = 0; i < len; i++) {
		const part = parts[i];
		let next = current.nextPart.get(part);
		if (!next) {
			next = createClassPartObject();
			current.nextPart.set(part, next);
		}
		current = next;
	}
	return current;
};
var isThemeGetter = (func) => "isThemeGetter" in func && func.isThemeGetter === true;
var createLruCache = (maxCacheSize) => {
	if (maxCacheSize < 1) return {
		get: () => void 0,
		set: () => {}
	};
	let cacheSize = 0;
	let cache = Object.create(null);
	let previousCache = Object.create(null);
	const update = (key, value) => {
		cache[key] = value;
		cacheSize++;
		if (cacheSize > maxCacheSize) {
			cacheSize = 0;
			previousCache = cache;
			cache = Object.create(null);
		}
	};
	return {
		get(key) {
			let value = cache[key];
			if (value !== void 0) return value;
			if ((value = previousCache[key]) !== void 0) {
				update(key, value);
				return value;
			}
		},
		set(key, value) {
			if (key in cache) cache[key] = value;
			else update(key, value);
		}
	};
};
var IMPORTANT_MODIFIER = "!";
var MODIFIER_SEPARATOR = ":";
var EMPTY_MODIFIERS = [];
var createResultObject = (modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition, isExternal) => ({
	modifiers,
	hasImportantModifier,
	baseClassName,
	maybePostfixModifierPosition,
	isExternal
});
var createParseClassName = (config) => {
	const { prefix, experimentalParseClassName } = config;
	/**
	* Parse class name into parts.
	*
	* Inspired by `splitAtTopLevelOnly` used in Tailwind CSS
	* @see https://github.com/tailwindlabs/tailwindcss/blob/v3.2.2/src/util/splitAtTopLevelOnly.js
	*/
	let parseClassName = (className) => {
		const modifiers = [];
		let bracketDepth = 0;
		let parenDepth = 0;
		let modifierStart = 0;
		let postfixModifierPosition;
		const len = className.length;
		for (let index = 0; index < len; index++) {
			const currentCharacter = className[index];
			if (bracketDepth === 0 && parenDepth === 0) {
				if (currentCharacter === MODIFIER_SEPARATOR) {
					modifiers.push(className.slice(modifierStart, index));
					modifierStart = index + 1;
					continue;
				}
				if (currentCharacter === "/") {
					postfixModifierPosition = index;
					continue;
				}
			}
			if (currentCharacter === "[") bracketDepth++;
			else if (currentCharacter === "]") bracketDepth--;
			else if (currentCharacter === "(") parenDepth++;
			else if (currentCharacter === ")") parenDepth--;
			else if (currentCharacter === "\\") index++;
			else if (currentCharacter === "\"" || currentCharacter === "'") while (++index < len) {
				const quotedCharacter = className[index];
				if (quotedCharacter === "\\") index++;
				else if (quotedCharacter === currentCharacter) break;
			}
		}
		const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.slice(modifierStart);
		let baseClassName = baseClassNameWithImportantModifier;
		let hasImportantModifier = false;
		if (baseClassNameWithImportantModifier.endsWith(IMPORTANT_MODIFIER)) {
			baseClassName = baseClassNameWithImportantModifier.slice(0, -1);
			hasImportantModifier = true;
		} else if (baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)) {
			baseClassName = baseClassNameWithImportantModifier.slice(1);
			hasImportantModifier = true;
		}
		const importantModifierOffset = hasImportantModifier && baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER) ? 1 : 0;
		const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart - importantModifierOffset : void 0;
		return createResultObject(modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition);
	};
	if (prefix) {
		const fullPrefix = prefix + MODIFIER_SEPARATOR;
		const parseClassNameOriginal = parseClassName;
		parseClassName = (className) => className.startsWith(fullPrefix) ? parseClassNameOriginal(className.slice(fullPrefix.length)) : createResultObject(EMPTY_MODIFIERS, false, className, void 0, true);
	}
	if (experimentalParseClassName) {
		const parseClassNameOriginal = parseClassName;
		parseClassName = (className) => experimentalParseClassName({
			className,
			parseClassName: parseClassNameOriginal
		});
	}
	return parseClassName;
};
/**
* Sorts modifiers according to following schema:
* - Predefined modifiers are sorted alphabetically
* - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
*/
var createSortModifiers = (config) => {
	const modifierWeights = /* @__PURE__ */ new Map();
	config.orderSensitiveModifiers.forEach((mod, index) => {
		modifierWeights.set(mod, 1e6 + index);
	});
	return (modifiers) => {
		const result = [];
		let currentSegment = [];
		for (let i = 0; i < modifiers.length; i++) {
			const modifier = modifiers[i];
			const isArbitrary = modifier[0] === "[";
			const isOrderSensitive = modifierWeights.has(modifier);
			if (isArbitrary || isOrderSensitive) {
				if (currentSegment.length > 0) {
					currentSegment.sort();
					result.push(...currentSegment);
					currentSegment = [];
				}
				result.push(modifier);
			} else currentSegment.push(modifier);
		}
		if (currentSegment.length > 0) {
			currentSegment.sort();
			result.push(...currentSegment);
		}
		return result;
	};
};
var createConfigUtils = (config) => ({
	cache: createLruCache(config.cacheSize),
	parseClassName: createParseClassName(config),
	sortModifiers: createSortModifiers(config),
	postfixLookupClassGroupIds: createPostfixLookupClassGroupIds(config),
	...createClassGroupUtils(config)
});
var createPostfixLookupClassGroupIds = (config) => {
	const lookup = Object.create(null);
	const classGroupIds = config.postfixLookupClassGroups;
	if (classGroupIds) for (let i = 0; i < classGroupIds.length; i++) lookup[classGroupIds[i]] = true;
	return lookup;
};
var SPLIT_CLASSES_REGEX = /\s+/;
var mergeClassList = (classList, configUtils) => {
	const { parseClassName, getClassGroupId, getConflictingClassGroupIds, sortModifiers, postfixLookupClassGroupIds } = configUtils;
	/**
	* Set of classGroupIds in following format:
	* `{importantModifier}{variantModifiers}{classGroupId}`
	* @example 'float'
	* @example 'hover:focus:bg-color'
	* @example 'md:!pr'
	*/
	const classGroupsInConflict = [];
	const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
	let result = "";
	for (let index = classNames.length - 1; index >= 0; index -= 1) {
		const originalClassName = classNames[index];
		const { isExternal, modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition } = parseClassName(originalClassName);
		if (isExternal) {
			result = originalClassName + (result.length > 0 ? " " + result : result);
			continue;
		}
		let hasPostfixModifier = !!maybePostfixModifierPosition;
		let classGroupId;
		if (hasPostfixModifier) {
			classGroupId = getClassGroupId(baseClassName.substring(0, maybePostfixModifierPosition));
			const classGroupIdWithPostfix = classGroupId && postfixLookupClassGroupIds[classGroupId] ? getClassGroupId(baseClassName) : void 0;
			if (classGroupIdWithPostfix && classGroupIdWithPostfix !== classGroupId) {
				classGroupId = classGroupIdWithPostfix;
				hasPostfixModifier = false;
			}
		} else classGroupId = getClassGroupId(baseClassName);
		if (!classGroupId) {
			if (!hasPostfixModifier) {
				result = originalClassName + (result.length > 0 ? " " + result : result);
				continue;
			}
			classGroupId = getClassGroupId(baseClassName);
			if (!classGroupId) {
				result = originalClassName + (result.length > 0 ? " " + result : result);
				continue;
			}
			hasPostfixModifier = false;
		}
		const variantModifier = modifiers.length === 0 ? "" : modifiers.length === 1 ? modifiers[0] : sortModifiers(modifiers).join(":");
		const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
		const classId = modifierId + classGroupId;
		if (classGroupsInConflict.indexOf(classId) > -1) continue;
		classGroupsInConflict.push(classId);
		const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
		for (let i = 0; i < conflictGroups.length; ++i) {
			const group = conflictGroups[i];
			classGroupsInConflict.push(modifierId + group);
		}
		result = originalClassName + (result.length > 0 ? " " + result : result);
	}
	return result;
};
/**
* The code in this file is copied from https://github.com/lukeed/clsx and modified to suit the needs of tailwind-merge better.
*
* Specifically:
* - Runtime code from https://github.com/lukeed/clsx/blob/v1.2.1/src/index.js
* - TypeScript types from https://github.com/lukeed/clsx/blob/v1.2.1/clsx.d.ts
*
* Original code has MIT license: Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
*/
var twJoin = (...classLists) => {
	let index = 0;
	let argument;
	let resolvedValue;
	let string = "";
	while (index < classLists.length) if (argument = classLists[index++]) {
		if (resolvedValue = toValue(argument)) {
			string && (string += " ");
			string += resolvedValue;
		}
	}
	return string;
};
var toValue = (mix) => {
	if (typeof mix === "string") return mix;
	let resolvedValue;
	let string = "";
	for (let k = 0; k < mix.length; k++) if (mix[k]) {
		if (resolvedValue = toValue(mix[k])) {
			string && (string += " ");
			string += resolvedValue;
		}
	}
	return string;
};
var createTailwindMerge = (createConfigFirst, ...createConfigRest) => {
	let configUtils;
	let cacheGet;
	let cacheSet;
	let functionToCall;
	const initTailwindMerge = (classList) => {
		configUtils = createConfigUtils(createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst()));
		cacheGet = configUtils.cache.get;
		cacheSet = configUtils.cache.set;
		functionToCall = tailwindMerge;
		return tailwindMerge(classList);
	};
	const tailwindMerge = (classList) => {
		const cachedResult = cacheGet(classList);
		if (cachedResult) return cachedResult;
		const result = mergeClassList(classList, configUtils);
		cacheSet(classList, result);
		return result;
	};
	functionToCall = initTailwindMerge;
	return (...args) => functionToCall(twJoin(...args));
};
var fallbackThemeArr = [];
var fromTheme = (key) => {
	const themeGetter = (theme) => theme[key] || fallbackThemeArr;
	themeGetter.isThemeGetter = true;
	themeGetter.themeKey = key;
	return themeGetter;
};
var arbitraryValueRegex = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
var arbitraryVariableRegex = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
var fractionRegex = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
var lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|Q|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^--spacing\(.+\)|^0$/;
var colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix|color|light-dark|contrast-color|device-cmyk|--alpha)\(.+\)$/i;
var maskPositionRegex = /^(?:_*[+-]?(?:\d|\.\d)|[\w-]+\(|_*(?:inherit|initial|revert(?:-layer)?|unset)_*$)/i;
var shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
var imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
var isFraction = (value) => fractionRegex.test(value);
var isNumber = (value) => !!value && !Number.isNaN(Number(value));
var isInteger = (value) => !!value && Number.isInteger(Number(value));
var isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
var isTshirtSize = (value) => tshirtUnitRegex.test(value);
var isAny = () => true;
var isLengthOnly = (value) => lengthUnitRegex.test(value) && !colorFunctionRegex.test(value);
var isMaskPosition = (value) => maskPositionRegex.test(value) && !colorFunctionRegex.test(value);
var isNever = () => false;
var isShadow = (value) => shadowRegex.test(value);
var isImage = (value) => imageRegex.test(value);
var isAnyNonArbitrary = (value) => !isArbitraryValue(value) && !isArbitraryVariable(value);
var isNamedContainerQuery = (value) => value.startsWith("@container") && (value[10] === "/" && value[11] !== void 0 || value[11] === "s" && value[16] !== void 0 && value.startsWith("-size/", 10) || value[11] === "n" && value[18] !== void 0 && value.startsWith("-normal/", 10));
var isArbitrarySize = (value) => getIsArbitraryValue(value, isLabelSize, isNever);
var isArbitraryValue = (value) => arbitraryValueRegex.test(value);
var isArbitraryLength = (value) => getIsArbitraryValue(value, isLabelLength, isLengthOnly);
var isArbitraryMaskPosition = (value) => getIsArbitraryValue(value, isLabelMaskPosition, isMaskPosition);
var isArbitraryNumber = (value) => getIsArbitraryValue(value, isLabelNumber, isNumber);
var isArbitraryWeight = (value) => getIsArbitraryValue(value, isLabelWeight, isAny);
var isArbitraryFamilyName = (value) => getIsArbitraryValue(value, isLabelFamilyName, isNever);
var isArbitraryPosition = (value) => getIsArbitraryValue(value, isLabelPosition, isNever);
var isArbitraryImage = (value) => getIsArbitraryValue(value, isLabelImage, isImage);
var isArbitraryShadow = (value) => getIsArbitraryValue(value, isLabelShadow, isShadow);
var isArbitraryVariable = (value) => arbitraryVariableRegex.test(value);
var isArbitraryVariableLength = (value) => getIsArbitraryVariable(value, isLabelLength);
var isArbitraryVariableMaskPosition = (value) => getIsArbitraryVariable(value, isLabelMaskPosition, true);
var isArbitraryVariableFamilyName = (value) => getIsArbitraryVariable(value, isLabelFamilyName);
var isArbitraryVariablePosition = (value) => getIsArbitraryVariable(value, isLabelPosition);
var isArbitraryVariableSize = (value) => getIsArbitraryVariable(value, isLabelSize);
var isArbitraryVariableImage = (value) => getIsArbitraryVariable(value, isLabelImage);
var isArbitraryVariableShadow = (value) => getIsArbitraryVariable(value, isLabelShadow, true);
var isArbitraryVariableWeight = (value) => getIsArbitraryVariable(value, isLabelWeight, true);
var getIsArbitraryValue = (value, testLabel, testValue) => {
	const result = arbitraryValueRegex.exec(value);
	if (result) {
		if (result[1]) return testLabel(result[1]);
		return testValue(result[2]);
	}
	return false;
};
var getIsArbitraryVariable = (value, testLabel, shouldMatchNoLabel = false) => {
	const result = arbitraryVariableRegex.exec(value);
	if (result) {
		if (result[1]) return testLabel(result[1]);
		return shouldMatchNoLabel;
	}
	return false;
};
var isLabelPosition = (label) => label === "position" || label === "percentage";
var isLabelImage = (label) => label === "image" || label === "url";
var isLabelSize = (label) => label === "length" || label === "size" || label === "bg-size";
var isLabelLength = (label) => label === "length";
var isLabelMaskPosition = (label) => label !== "color";
var isLabelNumber = (label) => label === "number";
var isLabelFamilyName = (label) => label === "family-name";
var isLabelWeight = (label) => label === "number" || label === "weight";
var isLabelShadow = (label) => label === "shadow";
var getDefaultConfig = () => {
	/**
	* Theme getters for theme variable namespaces
	* @see https://tailwindcss.com/docs/theme#theme-variable-namespaces
	*/
	const themeColor = fromTheme("color");
	const themeFont = fromTheme("font");
	const themeText = fromTheme("text");
	const themeFontWeight = fromTheme("font-weight");
	const themeTracking = fromTheme("tracking");
	const themeLeading = fromTheme("leading");
	const themeBreakpoint = fromTheme("breakpoint");
	const themeContainer = fromTheme("container");
	const themeSpacing = fromTheme("spacing");
	const themeRadius = fromTheme("radius");
	const themeShadow = fromTheme("shadow");
	const themeInsetShadow = fromTheme("inset-shadow");
	const themeTextShadow = fromTheme("text-shadow");
	const themeDropShadow = fromTheme("drop-shadow");
	const themeBlur = fromTheme("blur");
	const themePerspective = fromTheme("perspective");
	const themeAspect = fromTheme("aspect");
	const themeEase = fromTheme("ease");
	const themeAnimate = fromTheme("animate");
	/**
	* Helpers to avoid repeating the same scales
	*
	* We use functions that create a new array every time they're called instead of static arrays.
	* This ensures that users who modify any scale by mutating the array (e.g. with `array.push(element)`) don't accidentally mutate arrays in other parts of the config.
	*/
	const scaleBreak = () => [
		"auto",
		"avoid",
		"all",
		"avoid-page",
		"page",
		"left",
		"right",
		"column"
	];
	const scalePosition = () => [
		"center",
		"top",
		"bottom",
		"left",
		"right",
		"top-left",
		"left-top",
		"top-right",
		"right-top",
		"bottom-right",
		"right-bottom",
		"bottom-left",
		"left-bottom"
	];
	const scalePositionWithArbitrary = () => [
		...scalePosition(),
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleOverflow = () => [
		"auto",
		"hidden",
		"clip",
		"visible",
		"scroll"
	];
	const scaleOverscroll = () => [
		"auto",
		"contain",
		"none"
	];
	const scaleUnambiguousSpacing = () => [
		isArbitraryVariable,
		isArbitraryValue,
		themeSpacing
	];
	const scaleInset = () => [
		isFraction,
		"full",
		"auto",
		...scaleUnambiguousSpacing()
	];
	const scaleGridTemplateColsRows = () => [
		isInteger,
		"none",
		"subgrid",
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleGridColRowStartAndEnd = () => [
		"auto",
		{ span: [
			"full",
			isInteger,
			isArbitraryVariable,
			isArbitraryValue
		] },
		isInteger,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleGridColRowStartOrEnd = () => [
		isInteger,
		"auto",
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleGridAutoColsRows = () => [
		"auto",
		"min",
		"max",
		"fr",
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleAlignPrimaryAxis = () => [
		"start",
		"end",
		"center",
		"between",
		"around",
		"evenly",
		"stretch",
		"baseline",
		"center-safe",
		"end-safe"
	];
	const scaleAlignSecondaryAxis = () => [
		"start",
		"end",
		"center",
		"stretch",
		"center-safe",
		"end-safe"
	];
	const scaleMargin = () => ["auto", ...scaleUnambiguousSpacing()];
	const scaleSizing = () => [
		isFraction,
		"auto",
		"full",
		"dvw",
		"dvh",
		"lvw",
		"lvh",
		"svw",
		"svh",
		"min",
		"max",
		"fit",
		...scaleUnambiguousSpacing()
	];
	const scaleSizingInline = () => [
		themeContainer,
		isFraction,
		"screen",
		"full",
		"dvw",
		"lvw",
		"svw",
		"min",
		"max",
		"fit",
		...scaleUnambiguousSpacing()
	];
	const scaleSizingBlock = () => [
		isFraction,
		"screen",
		"full",
		"lh",
		"dvh",
		"lvh",
		"svh",
		"min",
		"max",
		"fit",
		...scaleUnambiguousSpacing()
	];
	const scaleColor = () => [
		themeColor,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleBgPosition = () => [
		...scalePosition(),
		isArbitraryVariablePosition,
		isArbitraryPosition,
		{ position: [isArbitraryVariable, isArbitraryValue] }
	];
	const scaleBgRepeat = () => ["no-repeat", { repeat: [
		"",
		"x",
		"y",
		"space",
		"round"
	] }];
	const scaleBgSize = () => [
		"auto",
		"cover",
		"contain",
		isArbitraryVariableSize,
		isArbitrarySize,
		{ size: [isArbitraryVariable, isArbitraryValue] }
	];
	const scaleGradientStopPosition = () => [
		isPercent,
		isArbitraryVariableLength,
		isArbitraryLength
	];
	const scaleRadius = () => [
		"",
		"none",
		"full",
		themeRadius,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleBorderWidth = () => [
		"",
		isNumber,
		isArbitraryVariableLength,
		isArbitraryLength
	];
	const scaleLineStyle = () => [
		"solid",
		"dashed",
		"dotted",
		"double"
	];
	const scaleBlendMode = () => [
		"normal",
		"multiply",
		"screen",
		"overlay",
		"darken",
		"lighten",
		"color-dodge",
		"color-burn",
		"hard-light",
		"soft-light",
		"difference",
		"exclusion",
		"hue",
		"saturation",
		"color",
		"luminosity"
	];
	const scaleMaskImagePosition = () => [
		isNumber,
		isPercent,
		isArbitraryVariableMaskPosition,
		isArbitraryMaskPosition
	];
	const scaleBlur = () => [
		"",
		"none",
		themeBlur,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleRotate = () => [
		"none",
		isNumber,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleScale = () => [
		"none",
		isNumber,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleSkew = () => [
		isNumber,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleTranslate = () => [
		isFraction,
		"full",
		...scaleUnambiguousSpacing()
	];
	return {
		cacheSize: 500,
		theme: {
			animate: [
				"spin",
				"ping",
				"pulse",
				"bounce"
			],
			aspect: ["video"],
			blur: [isTshirtSize],
			breakpoint: [isTshirtSize],
			color: [isAny],
			container: [isTshirtSize],
			"drop-shadow": [isTshirtSize],
			ease: [
				"in",
				"out",
				"in-out"
			],
			font: [isAnyNonArbitrary],
			"font-weight": [
				"thin",
				"extralight",
				"light",
				"normal",
				"medium",
				"semibold",
				"bold",
				"extrabold",
				"black"
			],
			"inset-shadow": [isTshirtSize],
			leading: [
				"none",
				"tight",
				"snug",
				"normal",
				"relaxed",
				"loose"
			],
			perspective: [
				"dramatic",
				"near",
				"normal",
				"midrange",
				"distant",
				"none"
			],
			radius: [isTshirtSize],
			shadow: [isTshirtSize],
			spacing: ["px", isNumber],
			text: [isTshirtSize],
			"text-shadow": [isTshirtSize],
			tracking: [
				"tighter",
				"tight",
				"normal",
				"wide",
				"wider",
				"widest"
			]
		},
		classGroups: {
			/**
			* Aspect Ratio
			* @see https://tailwindcss.com/docs/aspect-ratio
			*/
			aspect: [{ aspect: [
				"auto",
				"square",
				isFraction,
				isArbitraryValue,
				isArbitraryVariable,
				themeAspect
			] }],
			/**
			* Container
			* @see https://tailwindcss.com/docs/container
			* @deprecated since Tailwind CSS v4.0.0
			*/
			container: ["container"],
			/**
			* Container Type
			* @see https://tailwindcss.com/docs/responsive-design#container-queries
			*/
			"container-type": [{ "@container": [
				"",
				"normal",
				"size",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Container Name
			* @see https://tailwindcss.com/docs/responsive-design#named-containers
			*/
			"container-named": [isNamedContainerQuery],
			/**
			* Columns
			* @see https://tailwindcss.com/docs/columns
			*/
			columns: [{ columns: [
				isNumber,
				"auto",
				isArbitraryValue,
				isArbitraryVariable,
				themeContainer
			] }],
			/**
			* Break After
			* @see https://tailwindcss.com/docs/break-after
			*/
			"break-after": [{ "break-after": scaleBreak() }],
			/**
			* Break Before
			* @see https://tailwindcss.com/docs/break-before
			*/
			"break-before": [{ "break-before": scaleBreak() }],
			/**
			* Break Inside
			* @see https://tailwindcss.com/docs/break-inside
			*/
			"break-inside": [{ "break-inside": [
				"auto",
				"avoid",
				"avoid-page",
				"avoid-column"
			] }],
			/**
			* Box Decoration Break
			* @see https://tailwindcss.com/docs/box-decoration-break
			*/
			"box-decoration": [{ "box-decoration": ["slice", "clone"] }],
			/**
			* Box Sizing
			* @see https://tailwindcss.com/docs/box-sizing
			*/
			box: [{ box: ["border", "content"] }],
			/**
			* Display
			* @see https://tailwindcss.com/docs/display
			*/
			display: [
				"block",
				"inline-block",
				"inline",
				"flex",
				"inline-flex",
				"table",
				"inline-table",
				"table-caption",
				"table-cell",
				"table-column",
				"table-column-group",
				"table-footer-group",
				"table-header-group",
				"table-row-group",
				"table-row",
				"flow-root",
				"grid",
				"inline-grid",
				"contents",
				"list-item",
				"hidden"
			],
			/**
			* Screen Reader Only
			* @see https://tailwindcss.com/docs/display#screen-reader-only
			*/
			sr: ["sr-only"],
			/**
			* Not Screen Reader Only
			* @see https://tailwindcss.com/docs/display#screen-reader-only
			*/
			"not-sr": ["not-sr-only"],
			/**
			* Floats
			* @see https://tailwindcss.com/docs/float
			*/
			float: [{ float: [
				"right",
				"left",
				"none",
				"start",
				"end"
			] }],
			/**
			* Clear
			* @see https://tailwindcss.com/docs/clear
			*/
			clear: [{ clear: [
				"left",
				"right",
				"both",
				"none",
				"start",
				"end"
			] }],
			/**
			* Isolation
			* @see https://tailwindcss.com/docs/isolation
			*/
			isolation: ["isolate", "isolation-auto"],
			/**
			* Object Fit
			* @see https://tailwindcss.com/docs/object-fit
			*/
			"object-fit": [{ object: [
				"contain",
				"cover",
				"fill",
				"none",
				"scale-down"
			] }],
			/**
			* Object Position
			* @see https://tailwindcss.com/docs/object-position
			*/
			"object-position": [{ object: scalePositionWithArbitrary() }],
			/**
			* Overflow
			* @see https://tailwindcss.com/docs/overflow
			*/
			overflow: [{ overflow: scaleOverflow() }],
			/**
			* Overflow X
			* @see https://tailwindcss.com/docs/overflow
			*/
			"overflow-x": [{ "overflow-x": scaleOverflow() }],
			/**
			* Overflow Y
			* @see https://tailwindcss.com/docs/overflow
			*/
			"overflow-y": [{ "overflow-y": scaleOverflow() }],
			/**
			* Overscroll Behavior
			* @see https://tailwindcss.com/docs/overscroll-behavior
			*/
			overscroll: [{ overscroll: scaleOverscroll() }],
			/**
			* Overscroll Behavior X
			* @see https://tailwindcss.com/docs/overscroll-behavior
			*/
			"overscroll-x": [{ "overscroll-x": scaleOverscroll() }],
			/**
			* Overscroll Behavior Y
			* @see https://tailwindcss.com/docs/overscroll-behavior
			*/
			"overscroll-y": [{ "overscroll-y": scaleOverscroll() }],
			/**
			* Position
			* @see https://tailwindcss.com/docs/position
			*/
			position: [
				"static",
				"fixed",
				"absolute",
				"relative",
				"sticky"
			],
			/**
			* Inset
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			inset: [{ inset: scaleInset() }],
			/**
			* Inset Inline
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			"inset-x": [{ "inset-x": scaleInset() }],
			/**
			* Inset Block
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			"inset-y": [{ "inset-y": scaleInset() }],
			/**
			* Inset Inline Start
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			* @todo class group will be renamed to `inset-s` in next major release
			*/
			start: [{
				"inset-s": scaleInset(),
				/**
				* @deprecated since Tailwind CSS v4.2.0 in favor of `inset-s-*` utilities.
				* @see https://github.com/tailwindlabs/tailwindcss/pull/19613
				*/
				start: scaleInset()
			}],
			/**
			* Inset Inline End
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			* @todo class group will be renamed to `inset-e` in next major release
			*/
			end: [{
				"inset-e": scaleInset(),
				/**
				* @deprecated since Tailwind CSS v4.2.0 in favor of `inset-e-*` utilities.
				* @see https://github.com/tailwindlabs/tailwindcss/pull/19613
				*/
				end: scaleInset()
			}],
			/**
			* Inset Block Start
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			"inset-bs": [{ "inset-bs": scaleInset() }],
			/**
			* Inset Block End
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			"inset-be": [{ "inset-be": scaleInset() }],
			/**
			* Top
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			top: [{ top: scaleInset() }],
			/**
			* Right
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			right: [{ right: scaleInset() }],
			/**
			* Bottom
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			bottom: [{ bottom: scaleInset() }],
			/**
			* Left
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			left: [{ left: scaleInset() }],
			/**
			* Visibility
			* @see https://tailwindcss.com/docs/visibility
			*/
			visibility: [
				"visible",
				"invisible",
				"collapse"
			],
			/**
			* Z-Index
			* @see https://tailwindcss.com/docs/z-index
			*/
			z: [{ z: [
				isInteger,
				"auto",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Flex Basis
			* @see https://tailwindcss.com/docs/flex-basis
			*/
			basis: [{ basis: [
				isFraction,
				"full",
				"auto",
				themeContainer,
				...scaleUnambiguousSpacing()
			] }],
			/**
			* Flex Direction
			* @see https://tailwindcss.com/docs/flex-direction
			*/
			"flex-direction": [{ flex: [
				"row",
				"row-reverse",
				"col",
				"col-reverse"
			] }],
			/**
			* Flex Wrap
			* @see https://tailwindcss.com/docs/flex-wrap
			*/
			"flex-wrap": [{ flex: [
				"nowrap",
				"wrap",
				"wrap-reverse"
			] }],
			/**
			* Flex
			* @see https://tailwindcss.com/docs/flex
			*/
			flex: [{ flex: [
				isNumber,
				isFraction,
				"auto",
				"initial",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Flex Grow
			* @see https://tailwindcss.com/docs/flex-grow
			*/
			grow: [{ grow: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Flex Shrink
			* @see https://tailwindcss.com/docs/flex-shrink
			*/
			shrink: [{ shrink: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Order
			* @see https://tailwindcss.com/docs/order
			*/
			order: [{ order: [
				isInteger,
				"first",
				"last",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Grid Template Columns
			* @see https://tailwindcss.com/docs/grid-template-columns
			*/
			"grid-cols": [{ "grid-cols": scaleGridTemplateColsRows() }],
			/**
			* Grid Column Start / End
			* @see https://tailwindcss.com/docs/grid-column
			*/
			"col-start-end": [{ col: scaleGridColRowStartAndEnd() }],
			/**
			* Grid Column Start
			* @see https://tailwindcss.com/docs/grid-column
			*/
			"col-start": [{ "col-start": scaleGridColRowStartOrEnd() }],
			/**
			* Grid Column End
			* @see https://tailwindcss.com/docs/grid-column
			*/
			"col-end": [{ "col-end": scaleGridColRowStartOrEnd() }],
			/**
			* Grid Template Rows
			* @see https://tailwindcss.com/docs/grid-template-rows
			*/
			"grid-rows": [{ "grid-rows": scaleGridTemplateColsRows() }],
			/**
			* Grid Row Start / End
			* @see https://tailwindcss.com/docs/grid-row
			*/
			"row-start-end": [{ row: scaleGridColRowStartAndEnd() }],
			/**
			* Grid Row Start
			* @see https://tailwindcss.com/docs/grid-row
			*/
			"row-start": [{ "row-start": scaleGridColRowStartOrEnd() }],
			/**
			* Grid Row End
			* @see https://tailwindcss.com/docs/grid-row
			*/
			"row-end": [{ "row-end": scaleGridColRowStartOrEnd() }],
			/**
			* Grid Auto Flow
			* @see https://tailwindcss.com/docs/grid-auto-flow
			*/
			"grid-flow": [{ "grid-flow": [
				"row",
				"col",
				"dense",
				"row-dense",
				"col-dense"
			] }],
			/**
			* Grid Auto Columns
			* @see https://tailwindcss.com/docs/grid-auto-columns
			*/
			"auto-cols": [{ "auto-cols": scaleGridAutoColsRows() }],
			/**
			* Grid Auto Rows
			* @see https://tailwindcss.com/docs/grid-auto-rows
			*/
			"auto-rows": [{ "auto-rows": scaleGridAutoColsRows() }],
			/**
			* Gap
			* @see https://tailwindcss.com/docs/gap
			*/
			gap: [{ gap: scaleUnambiguousSpacing() }],
			/**
			* Gap X
			* @see https://tailwindcss.com/docs/gap
			*/
			"gap-x": [{ "gap-x": scaleUnambiguousSpacing() }],
			/**
			* Gap Y
			* @see https://tailwindcss.com/docs/gap
			*/
			"gap-y": [{ "gap-y": scaleUnambiguousSpacing() }],
			/**
			* Justify Content
			* @see https://tailwindcss.com/docs/justify-content
			*/
			"justify-content": [{ justify: [...scaleAlignPrimaryAxis(), "normal"] }],
			/**
			* Justify Items
			* @see https://tailwindcss.com/docs/justify-items
			*/
			"justify-items": [{ "justify-items": [...scaleAlignSecondaryAxis(), "normal"] }],
			/**
			* Justify Self
			* @see https://tailwindcss.com/docs/justify-self
			*/
			"justify-self": [{ "justify-self": ["auto", ...scaleAlignSecondaryAxis()] }],
			/**
			* Align Content
			* @see https://tailwindcss.com/docs/align-content
			*/
			"align-content": [{ content: ["normal", ...scaleAlignPrimaryAxis()] }],
			/**
			* Align Items
			* @see https://tailwindcss.com/docs/align-items
			*/
			"align-items": [{ items: [...scaleAlignSecondaryAxis(), { baseline: ["", "last"] }] }],
			/**
			* Align Self
			* @see https://tailwindcss.com/docs/align-self
			*/
			"align-self": [{ self: [
				"auto",
				...scaleAlignSecondaryAxis(),
				{ baseline: ["", "last"] }
			] }],
			/**
			* Place Content
			* @see https://tailwindcss.com/docs/place-content
			*/
			"place-content": [{ "place-content": scaleAlignPrimaryAxis() }],
			/**
			* Place Items
			* @see https://tailwindcss.com/docs/place-items
			*/
			"place-items": [{ "place-items": [...scaleAlignSecondaryAxis(), "baseline"] }],
			/**
			* Place Self
			* @see https://tailwindcss.com/docs/place-self
			*/
			"place-self": [{ "place-self": ["auto", ...scaleAlignSecondaryAxis()] }],
			/**
			* Padding
			* @see https://tailwindcss.com/docs/padding
			*/
			p: [{ p: scaleUnambiguousSpacing() }],
			/**
			* Padding Inline
			* @see https://tailwindcss.com/docs/padding
			*/
			px: [{ px: scaleUnambiguousSpacing() }],
			/**
			* Padding Block
			* @see https://tailwindcss.com/docs/padding
			*/
			py: [{ py: scaleUnambiguousSpacing() }],
			/**
			* Padding Inline Start
			* @see https://tailwindcss.com/docs/padding
			*/
			ps: [{ ps: scaleUnambiguousSpacing() }],
			/**
			* Padding Inline End
			* @see https://tailwindcss.com/docs/padding
			*/
			pe: [{ pe: scaleUnambiguousSpacing() }],
			/**
			* Padding Block Start
			* @see https://tailwindcss.com/docs/padding
			*/
			pbs: [{ pbs: scaleUnambiguousSpacing() }],
			/**
			* Padding Block End
			* @see https://tailwindcss.com/docs/padding
			*/
			pbe: [{ pbe: scaleUnambiguousSpacing() }],
			/**
			* Padding Top
			* @see https://tailwindcss.com/docs/padding
			*/
			pt: [{ pt: scaleUnambiguousSpacing() }],
			/**
			* Padding Right
			* @see https://tailwindcss.com/docs/padding
			*/
			pr: [{ pr: scaleUnambiguousSpacing() }],
			/**
			* Padding Bottom
			* @see https://tailwindcss.com/docs/padding
			*/
			pb: [{ pb: scaleUnambiguousSpacing() }],
			/**
			* Padding Left
			* @see https://tailwindcss.com/docs/padding
			*/
			pl: [{ pl: scaleUnambiguousSpacing() }],
			/**
			* Margin
			* @see https://tailwindcss.com/docs/margin
			*/
			m: [{ m: scaleMargin() }],
			/**
			* Margin Inline
			* @see https://tailwindcss.com/docs/margin
			*/
			mx: [{ mx: scaleMargin() }],
			/**
			* Margin Block
			* @see https://tailwindcss.com/docs/margin
			*/
			my: [{ my: scaleMargin() }],
			/**
			* Margin Inline Start
			* @see https://tailwindcss.com/docs/margin
			*/
			ms: [{ ms: scaleMargin() }],
			/**
			* Margin Inline End
			* @see https://tailwindcss.com/docs/margin
			*/
			me: [{ me: scaleMargin() }],
			/**
			* Margin Block Start
			* @see https://tailwindcss.com/docs/margin
			*/
			mbs: [{ mbs: scaleMargin() }],
			/**
			* Margin Block End
			* @see https://tailwindcss.com/docs/margin
			*/
			mbe: [{ mbe: scaleMargin() }],
			/**
			* Margin Top
			* @see https://tailwindcss.com/docs/margin
			*/
			mt: [{ mt: scaleMargin() }],
			/**
			* Margin Right
			* @see https://tailwindcss.com/docs/margin
			*/
			mr: [{ mr: scaleMargin() }],
			/**
			* Margin Bottom
			* @see https://tailwindcss.com/docs/margin
			*/
			mb: [{ mb: scaleMargin() }],
			/**
			* Margin Left
			* @see https://tailwindcss.com/docs/margin
			*/
			ml: [{ ml: scaleMargin() }],
			/**
			* Space Between X
			* @see https://tailwindcss.com/docs/margin#adding-space-between-children
			*/
			"space-x": [{ "space-x": scaleUnambiguousSpacing() }],
			/**
			* Space Between X Reverse
			* @see https://tailwindcss.com/docs/margin#adding-space-between-children
			*/
			"space-x-reverse": ["space-x-reverse"],
			/**
			* Space Between Y
			* @see https://tailwindcss.com/docs/margin#adding-space-between-children
			*/
			"space-y": [{ "space-y": scaleUnambiguousSpacing() }],
			/**
			* Space Between Y Reverse
			* @see https://tailwindcss.com/docs/margin#adding-space-between-children
			*/
			"space-y-reverse": ["space-y-reverse"],
			/**
			* Size
			* @see https://tailwindcss.com/docs/width#setting-both-width-and-height
			*/
			size: [{ size: scaleSizing() }],
			/**
			* Inline Size
			* @see https://tailwindcss.com/docs/inline-size
			*/
			"inline-size": [{ inline: ["auto", ...scaleSizingInline()] }],
			/**
			* Min-Inline Size
			* @see https://tailwindcss.com/docs/min-inline-size
			*/
			"min-inline-size": [{ "min-inline": ["auto", ...scaleSizingInline()] }],
			/**
			* Max-Inline Size
			* @see https://tailwindcss.com/docs/max-inline-size
			*/
			"max-inline-size": [{ "max-inline": ["none", ...scaleSizingInline()] }],
			/**
			* Block Size
			* @see https://tailwindcss.com/docs/block-size
			*/
			"block-size": [{ block: ["auto", ...scaleSizingBlock()] }],
			/**
			* Min-Block Size
			* @see https://tailwindcss.com/docs/min-block-size
			*/
			"min-block-size": [{ "min-block": ["auto", ...scaleSizingBlock()] }],
			/**
			* Max-Block Size
			* @see https://tailwindcss.com/docs/max-block-size
			*/
			"max-block-size": [{ "max-block": ["none", ...scaleSizingBlock()] }],
			/**
			* Width
			* @see https://tailwindcss.com/docs/width
			*/
			w: [{ w: [
				themeContainer,
				"screen",
				...scaleSizing()
			] }],
			/**
			* Min-Width
			* @see https://tailwindcss.com/docs/min-width
			*/
			"min-w": [{ "min-w": [
				themeContainer,
				"screen",
				"none",
				...scaleSizing()
			] }],
			/**
			* Max-Width
			* @see https://tailwindcss.com/docs/max-width
			*/
			"max-w": [{ "max-w": [
				themeContainer,
				"screen",
				"none",
				"prose",
				{ screen: [themeBreakpoint] },
				...scaleSizing()
			] }],
			/**
			* Height
			* @see https://tailwindcss.com/docs/height
			*/
			h: [{ h: [
				"screen",
				"lh",
				...scaleSizing()
			] }],
			/**
			* Min-Height
			* @see https://tailwindcss.com/docs/min-height
			*/
			"min-h": [{ "min-h": [
				"screen",
				"lh",
				"none",
				...scaleSizing()
			] }],
			/**
			* Max-Height
			* @see https://tailwindcss.com/docs/max-height
			*/
			"max-h": [{ "max-h": [
				"screen",
				"lh",
				"none",
				...scaleSizing()
			] }],
			/**
			* Font Size
			* @see https://tailwindcss.com/docs/font-size
			*/
			"font-size": [{ text: [
				"base",
				themeText,
				isArbitraryVariableLength,
				isArbitraryLength
			] }],
			/**
			* Font Smoothing
			* @see https://tailwindcss.com/docs/font-smoothing
			*/
			"font-smoothing": ["antialiased", "subpixel-antialiased"],
			/**
			* Font Style
			* @see https://tailwindcss.com/docs/font-style
			*/
			"font-style": ["italic", "not-italic"],
			/**
			* Font Weight
			* @see https://tailwindcss.com/docs/font-weight
			*/
			"font-weight": [{ font: [
				themeFontWeight,
				isArbitraryVariableWeight,
				isArbitraryWeight
			] }],
			/**
			* Font Stretch
			* @see https://tailwindcss.com/docs/font-stretch
			*/
			"font-stretch": [{ "font-stretch": [
				"ultra-condensed",
				"extra-condensed",
				"condensed",
				"semi-condensed",
				"normal",
				"semi-expanded",
				"expanded",
				"extra-expanded",
				"ultra-expanded",
				isPercent,
				isArbitraryValue
			] }],
			/**
			* Font Family
			* @see https://tailwindcss.com/docs/font-family
			*/
			"font-family": [{ font: [
				isArbitraryVariableFamilyName,
				isArbitraryFamilyName,
				themeFont
			] }],
			/**
			* Font Feature Settings
			* @see https://tailwindcss.com/docs/font-feature-settings
			*/
			"font-features": [{ "font-features": [isArbitraryValue] }],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-normal": ["normal-nums"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-ordinal": ["ordinal"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-slashed-zero": ["slashed-zero"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-figure": ["lining-nums", "oldstyle-nums"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-spacing": ["proportional-nums", "tabular-nums"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
			/**
			* Letter Spacing
			* @see https://tailwindcss.com/docs/letter-spacing
			*/
			tracking: [{ tracking: [
				themeTracking,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Line Clamp
			* @see https://tailwindcss.com/docs/line-clamp
			*/
			"line-clamp": [{ "line-clamp": [
				isNumber,
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Line Height
			* @see https://tailwindcss.com/docs/line-height
			*/
			leading: [{ leading: [
				"none",
				themeLeading,
				...scaleUnambiguousSpacing()
			] }],
			/**
			* List Style Image
			* @see https://tailwindcss.com/docs/list-style-image
			*/
			"list-image": [{ "list-image": [
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* List Style Position
			* @see https://tailwindcss.com/docs/list-style-position
			*/
			"list-style-position": [{ list: ["inside", "outside"] }],
			/**
			* List Style Type
			* @see https://tailwindcss.com/docs/list-style-type
			*/
			"list-style-type": [{ list: [
				"disc",
				"decimal",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Text Alignment
			* @see https://tailwindcss.com/docs/text-align
			*/
			"text-alignment": [{ text: [
				"left",
				"center",
				"right",
				"justify",
				"start",
				"end"
			] }],
			/**
			* Placeholder Color
			* @deprecated since Tailwind CSS v3.0.0
			* @see https://v3.tailwindcss.com/docs/placeholder-color
			*/
			"placeholder-color": [{ placeholder: scaleColor() }],
			/**
			* Text Color
			* @see https://tailwindcss.com/docs/text-color
			*/
			"text-color": [{ text: scaleColor() }],
			/**
			* Text Decoration
			* @see https://tailwindcss.com/docs/text-decoration
			*/
			"text-decoration": [
				"underline",
				"overline",
				"line-through",
				"no-underline"
			],
			/**
			* Text Decoration Style
			* @see https://tailwindcss.com/docs/text-decoration-style
			*/
			"text-decoration-style": [{ decoration: [...scaleLineStyle(), "wavy"] }],
			/**
			* Text Decoration Thickness
			* @see https://tailwindcss.com/docs/text-decoration-thickness
			*/
			"text-decoration-thickness": [{ decoration: [
				isNumber,
				"from-font",
				"auto",
				isArbitraryVariableLength,
				isArbitraryVariablePosition,
				isArbitraryLength
			] }],
			/**
			* Text Decoration Color
			* @see https://tailwindcss.com/docs/text-decoration-color
			*/
			"text-decoration-color": [{ decoration: scaleColor() }],
			/**
			* Text Underline Offset
			* @see https://tailwindcss.com/docs/text-underline-offset
			*/
			"underline-offset": [{ "underline-offset": [
				isNumber,
				"auto",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Text Transform
			* @see https://tailwindcss.com/docs/text-transform
			*/
			"text-transform": [
				"uppercase",
				"lowercase",
				"capitalize",
				"normal-case"
			],
			/**
			* Text Overflow
			* @see https://tailwindcss.com/docs/text-overflow
			*/
			"text-overflow": [
				"truncate",
				"text-ellipsis",
				"text-clip"
			],
			/**
			* Text Wrap
			* @see https://tailwindcss.com/docs/text-wrap
			*/
			"text-wrap": [{ text: [
				"wrap",
				"nowrap",
				"balance",
				"pretty"
			] }],
			/**
			* Text Indent
			* @see https://tailwindcss.com/docs/text-indent
			*/
			indent: [{ indent: scaleUnambiguousSpacing() }],
			/**
			* Tab Size
			* @see https://tailwindcss.com/docs/tab-size
			*/
			"tab-size": [{ tab: [
				isInteger,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Vertical Alignment
			* @see https://tailwindcss.com/docs/vertical-align
			*/
			"vertical-align": [{ align: [
				"baseline",
				"top",
				"middle",
				"bottom",
				"text-top",
				"text-bottom",
				"sub",
				"super",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Whitespace
			* @see https://tailwindcss.com/docs/whitespace
			*/
			whitespace: [{ whitespace: [
				"normal",
				"nowrap",
				"pre",
				"pre-line",
				"pre-wrap",
				"break-spaces"
			] }],
			/**
			* Word Break
			* @see https://tailwindcss.com/docs/word-break
			*/
			break: [{ break: [
				"normal",
				"words",
				"all",
				"keep"
			] }],
			/**
			* Overflow Wrap
			* @see https://tailwindcss.com/docs/overflow-wrap
			*/
			wrap: [{ wrap: [
				"break-word",
				"anywhere",
				"normal"
			] }],
			/**
			* Hyphens
			* @see https://tailwindcss.com/docs/hyphens
			*/
			hyphens: [{ hyphens: [
				"none",
				"manual",
				"auto"
			] }],
			/**
			* Content
			* @see https://tailwindcss.com/docs/content
			*/
			content: [{ content: [
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Background Attachment
			* @see https://tailwindcss.com/docs/background-attachment
			*/
			"bg-attachment": [{ bg: [
				"fixed",
				"local",
				"scroll"
			] }],
			/**
			* Background Clip
			* @see https://tailwindcss.com/docs/background-clip
			*/
			"bg-clip": [{ "bg-clip": [
				"border",
				"padding",
				"content",
				"text"
			] }],
			/**
			* Background Origin
			* @see https://tailwindcss.com/docs/background-origin
			*/
			"bg-origin": [{ "bg-origin": [
				"border",
				"padding",
				"content"
			] }],
			/**
			* Background Position
			* @see https://tailwindcss.com/docs/background-position
			*/
			"bg-position": [{ bg: scaleBgPosition() }],
			/**
			* Background Repeat
			* @see https://tailwindcss.com/docs/background-repeat
			*/
			"bg-repeat": [{ bg: scaleBgRepeat() }],
			/**
			* Background Size
			* @see https://tailwindcss.com/docs/background-size
			*/
			"bg-size": [{ bg: scaleBgSize() }],
			/**
			* Background Image
			* @see https://tailwindcss.com/docs/background-image
			*/
			"bg-image": [{ bg: [
				"none",
				{
					linear: [
						{ to: [
							"t",
							"tr",
							"r",
							"br",
							"b",
							"bl",
							"l",
							"tl"
						] },
						isInteger,
						isArbitraryVariable,
						isArbitraryValue
					],
					radial: [
						"",
						isArbitraryVariable,
						isArbitraryValue
					],
					conic: [
						"",
						isInteger,
						isArbitraryVariable,
						isArbitraryValue
					]
				},
				isArbitraryVariableImage,
				isArbitraryImage
			] }],
			/**
			* Background Color
			* @see https://tailwindcss.com/docs/background-color
			*/
			"bg-color": [{ bg: scaleColor() }],
			/**
			* Gradient Color Stops From Position
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-from-pos": [{ from: scaleGradientStopPosition() }],
			/**
			* Gradient Color Stops Via Position
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-via-pos": [{ via: scaleGradientStopPosition() }],
			/**
			* Gradient Color Stops To Position
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-to-pos": [{ to: scaleGradientStopPosition() }],
			/**
			* Gradient Color Stops From
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-from": [{ from: scaleColor() }],
			/**
			* Gradient Color Stops Via
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-via": [{ via: scaleColor() }],
			/**
			* Gradient Color Stops To
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-to": [{ to: scaleColor() }],
			/**
			* Border Radius
			* @see https://tailwindcss.com/docs/border-radius
			*/
			rounded: [{ rounded: scaleRadius() }],
			/**
			* Border Radius Start
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-s": [{ "rounded-s": scaleRadius() }],
			/**
			* Border Radius End
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-e": [{ "rounded-e": scaleRadius() }],
			/**
			* Border Radius Top
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-t": [{ "rounded-t": scaleRadius() }],
			/**
			* Border Radius Right
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-r": [{ "rounded-r": scaleRadius() }],
			/**
			* Border Radius Bottom
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-b": [{ "rounded-b": scaleRadius() }],
			/**
			* Border Radius Left
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-l": [{ "rounded-l": scaleRadius() }],
			/**
			* Border Radius Start Start
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-ss": [{ "rounded-ss": scaleRadius() }],
			/**
			* Border Radius Start End
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-se": [{ "rounded-se": scaleRadius() }],
			/**
			* Border Radius End End
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-ee": [{ "rounded-ee": scaleRadius() }],
			/**
			* Border Radius End Start
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-es": [{ "rounded-es": scaleRadius() }],
			/**
			* Border Radius Top Left
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-tl": [{ "rounded-tl": scaleRadius() }],
			/**
			* Border Radius Top Right
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-tr": [{ "rounded-tr": scaleRadius() }],
			/**
			* Border Radius Bottom Right
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-br": [{ "rounded-br": scaleRadius() }],
			/**
			* Border Radius Bottom Left
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-bl": [{ "rounded-bl": scaleRadius() }],
			/**
			* Border Width
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w": [{ border: scaleBorderWidth() }],
			/**
			* Border Width Inline
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-x": [{ "border-x": scaleBorderWidth() }],
			/**
			* Border Width Block
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-y": [{ "border-y": scaleBorderWidth() }],
			/**
			* Border Width Inline Start
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-s": [{ "border-s": scaleBorderWidth() }],
			/**
			* Border Width Inline End
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-e": [{ "border-e": scaleBorderWidth() }],
			/**
			* Border Width Block Start
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-bs": [{ "border-bs": scaleBorderWidth() }],
			/**
			* Border Width Block End
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-be": [{ "border-be": scaleBorderWidth() }],
			/**
			* Border Width Top
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-t": [{ "border-t": scaleBorderWidth() }],
			/**
			* Border Width Right
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-r": [{ "border-r": scaleBorderWidth() }],
			/**
			* Border Width Bottom
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-b": [{ "border-b": scaleBorderWidth() }],
			/**
			* Border Width Left
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-l": [{ "border-l": scaleBorderWidth() }],
			/**
			* Divide Width X
			* @see https://tailwindcss.com/docs/border-width#between-children
			*/
			"divide-x": [{ "divide-x": scaleBorderWidth() }],
			/**
			* Divide Width X Reverse
			* @see https://tailwindcss.com/docs/border-width#between-children
			*/
			"divide-x-reverse": ["divide-x-reverse"],
			/**
			* Divide Width Y
			* @see https://tailwindcss.com/docs/border-width#between-children
			*/
			"divide-y": [{ "divide-y": scaleBorderWidth() }],
			/**
			* Divide Width Y Reverse
			* @see https://tailwindcss.com/docs/border-width#between-children
			*/
			"divide-y-reverse": ["divide-y-reverse"],
			/**
			* Border Style
			* @see https://tailwindcss.com/docs/border-style
			*/
			"border-style": [{ border: [
				...scaleLineStyle(),
				"hidden",
				"none"
			] }],
			/**
			* Divide Style
			* @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
			*/
			"divide-style": [{ divide: [
				...scaleLineStyle(),
				"hidden",
				"none"
			] }],
			/**
			* Border Color
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color": [{ border: scaleColor() }],
			/**
			* Border Color Inline
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-x": [{ "border-x": scaleColor() }],
			/**
			* Border Color Block
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-y": [{ "border-y": scaleColor() }],
			/**
			* Border Color Inline Start
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-s": [{ "border-s": scaleColor() }],
			/**
			* Border Color Inline End
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-e": [{ "border-e": scaleColor() }],
			/**
			* Border Color Block Start
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-bs": [{ "border-bs": scaleColor() }],
			/**
			* Border Color Block End
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-be": [{ "border-be": scaleColor() }],
			/**
			* Border Color Top
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-t": [{ "border-t": scaleColor() }],
			/**
			* Border Color Right
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-r": [{ "border-r": scaleColor() }],
			/**
			* Border Color Bottom
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-b": [{ "border-b": scaleColor() }],
			/**
			* Border Color Left
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-l": [{ "border-l": scaleColor() }],
			/**
			* Divide Color
			* @see https://tailwindcss.com/docs/divide-color
			*/
			"divide-color": [{ divide: scaleColor() }],
			/**
			* Outline Style
			* @see https://tailwindcss.com/docs/outline-style
			*/
			"outline-style": [{ outline: [
				...scaleLineStyle(),
				"none",
				"hidden"
			] }],
			/**
			* Outline Offset
			* @see https://tailwindcss.com/docs/outline-offset
			*/
			"outline-offset": [{ "outline-offset": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Outline Width
			* @see https://tailwindcss.com/docs/outline-width
			*/
			"outline-w": [{ outline: [
				"",
				isNumber,
				isArbitraryVariableLength,
				isArbitraryLength
			] }],
			/**
			* Outline Color
			* @see https://tailwindcss.com/docs/outline-color
			*/
			"outline-color": [{ outline: scaleColor() }],
			/**
			* Box Shadow
			* @see https://tailwindcss.com/docs/box-shadow
			*/
			shadow: [{ shadow: [
				"",
				"inner",
				"none",
				themeShadow,
				isArbitraryVariableShadow,
				isArbitraryShadow
			] }],
			/**
			* Box Shadow Color
			* @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
			*/
			"shadow-color": [{ shadow: scaleColor() }],
			/**
			* Inset Box Shadow
			* @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
			*/
			"inset-shadow": [{ "inset-shadow": [
				"none",
				themeInsetShadow,
				isArbitraryVariableShadow,
				isArbitraryShadow
			] }],
			/**
			* Inset Box Shadow Color
			* @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
			*/
			"inset-shadow-color": [{ "inset-shadow": scaleColor() }],
			/**
			* Ring Width
			* @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
			*/
			"ring-w": [{ ring: scaleBorderWidth() }],
			/**
			* Ring Width Inset
			* @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
			* @deprecated since Tailwind CSS v4.0.0
			* @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
			*/
			"ring-w-inset": ["ring-inset"],
			/**
			* Ring Color
			* @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
			*/
			"ring-color": [{ ring: scaleColor() }],
			/**
			* Ring Offset Width
			* @see https://v3.tailwindcss.com/docs/ring-offset-width
			* @deprecated since Tailwind CSS v4.0.0
			* @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
			*/
			"ring-offset-w": [{ "ring-offset": [isNumber, isArbitraryLength] }],
			/**
			* Ring Offset Color
			* @see https://v3.tailwindcss.com/docs/ring-offset-color
			* @deprecated since Tailwind CSS v4.0.0
			* @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
			*/
			"ring-offset-color": [{ "ring-offset": scaleColor() }],
			/**
			* Inset Ring Width
			* @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
			*/
			"inset-ring-w": [{ "inset-ring": scaleBorderWidth() }],
			/**
			* Inset Ring Color
			* @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
			*/
			"inset-ring-color": [{ "inset-ring": scaleColor() }],
			/**
			* Text Shadow
			* @see https://tailwindcss.com/docs/text-shadow
			*/
			"text-shadow": [{ "text-shadow": [
				"none",
				themeTextShadow,
				isArbitraryVariableShadow,
				isArbitraryShadow
			] }],
			/**
			* Text Shadow Color
			* @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
			*/
			"text-shadow-color": [{ "text-shadow": scaleColor() }],
			/**
			* Opacity
			* @see https://tailwindcss.com/docs/opacity
			*/
			opacity: [{ opacity: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Mix Blend Mode
			* @see https://tailwindcss.com/docs/mix-blend-mode
			*/
			"mix-blend": [{ "mix-blend": [
				...scaleBlendMode(),
				"plus-darker",
				"plus-lighter"
			] }],
			/**
			* Background Blend Mode
			* @see https://tailwindcss.com/docs/background-blend-mode
			*/
			"bg-blend": [{ "bg-blend": scaleBlendMode() }],
			/**
			* Mask Clip
			* @see https://tailwindcss.com/docs/mask-clip
			*/
			"mask-clip": [{ "mask-clip": [
				"border",
				"padding",
				"content",
				"fill",
				"stroke",
				"view"
			] }, "mask-no-clip"],
			/**
			* Mask Composite
			* @see https://tailwindcss.com/docs/mask-composite
			*/
			"mask-composite": [{ mask: [
				"add",
				"subtract",
				"intersect",
				"exclude"
			] }],
			/**
			* Mask Image
			* @see https://tailwindcss.com/docs/mask-image
			*/
			"mask-image-linear-pos": [{ "mask-linear": [isNumber] }],
			"mask-image-linear-from-pos": [{ "mask-linear-from": scaleMaskImagePosition() }],
			"mask-image-linear-to-pos": [{ "mask-linear-to": scaleMaskImagePosition() }],
			"mask-image-linear-from-color": [{ "mask-linear-from": scaleColor() }],
			"mask-image-linear-to-color": [{ "mask-linear-to": scaleColor() }],
			"mask-image-t-from-pos": [{ "mask-t-from": scaleMaskImagePosition() }],
			"mask-image-t-to-pos": [{ "mask-t-to": scaleMaskImagePosition() }],
			"mask-image-t-from-color": [{ "mask-t-from": scaleColor() }],
			"mask-image-t-to-color": [{ "mask-t-to": scaleColor() }],
			"mask-image-r-from-pos": [{ "mask-r-from": scaleMaskImagePosition() }],
			"mask-image-r-to-pos": [{ "mask-r-to": scaleMaskImagePosition() }],
			"mask-image-r-from-color": [{ "mask-r-from": scaleColor() }],
			"mask-image-r-to-color": [{ "mask-r-to": scaleColor() }],
			"mask-image-b-from-pos": [{ "mask-b-from": scaleMaskImagePosition() }],
			"mask-image-b-to-pos": [{ "mask-b-to": scaleMaskImagePosition() }],
			"mask-image-b-from-color": [{ "mask-b-from": scaleColor() }],
			"mask-image-b-to-color": [{ "mask-b-to": scaleColor() }],
			"mask-image-l-from-pos": [{ "mask-l-from": scaleMaskImagePosition() }],
			"mask-image-l-to-pos": [{ "mask-l-to": scaleMaskImagePosition() }],
			"mask-image-l-from-color": [{ "mask-l-from": scaleColor() }],
			"mask-image-l-to-color": [{ "mask-l-to": scaleColor() }],
			"mask-image-x-from-pos": [{ "mask-x-from": scaleMaskImagePosition() }],
			"mask-image-x-to-pos": [{ "mask-x-to": scaleMaskImagePosition() }],
			"mask-image-x-from-color": [{ "mask-x-from": scaleColor() }],
			"mask-image-x-to-color": [{ "mask-x-to": scaleColor() }],
			"mask-image-y-from-pos": [{ "mask-y-from": scaleMaskImagePosition() }],
			"mask-image-y-to-pos": [{ "mask-y-to": scaleMaskImagePosition() }],
			"mask-image-y-from-color": [{ "mask-y-from": scaleColor() }],
			"mask-image-y-to-color": [{ "mask-y-to": scaleColor() }],
			"mask-image-radial": [{ "mask-radial": [isArbitraryVariable, isArbitraryValue] }],
			"mask-image-radial-from-pos": [{ "mask-radial-from": scaleMaskImagePosition() }],
			"mask-image-radial-to-pos": [{ "mask-radial-to": scaleMaskImagePosition() }],
			"mask-image-radial-from-color": [{ "mask-radial-from": scaleColor() }],
			"mask-image-radial-to-color": [{ "mask-radial-to": scaleColor() }],
			"mask-image-radial-shape": [{ mask: ["circle", "ellipse"] }],
			"mask-image-radial-size": [{ "mask-radial": [{
				closest: ["side", "corner"],
				farthest: ["side", "corner"]
			}] }],
			"mask-image-radial-pos": [{ "mask-radial-at": scalePosition() }],
			"mask-image-conic-pos": [{ "mask-conic": [isNumber] }],
			"mask-image-conic-from-pos": [{ "mask-conic-from": scaleMaskImagePosition() }],
			"mask-image-conic-to-pos": [{ "mask-conic-to": scaleMaskImagePosition() }],
			"mask-image-conic-from-color": [{ "mask-conic-from": scaleColor() }],
			"mask-image-conic-to-color": [{ "mask-conic-to": scaleColor() }],
			/**
			* Mask Mode
			* @see https://tailwindcss.com/docs/mask-mode
			*/
			"mask-mode": [{ mask: [
				"alpha",
				"luminance",
				"match"
			] }],
			/**
			* Mask Origin
			* @see https://tailwindcss.com/docs/mask-origin
			*/
			"mask-origin": [{ "mask-origin": [
				"border",
				"padding",
				"content",
				"fill",
				"stroke",
				"view"
			] }],
			/**
			* Mask Position
			* @see https://tailwindcss.com/docs/mask-position
			*/
			"mask-position": [{ mask: scaleBgPosition() }],
			/**
			* Mask Repeat
			* @see https://tailwindcss.com/docs/mask-repeat
			*/
			"mask-repeat": [{ mask: scaleBgRepeat() }],
			/**
			* Mask Size
			* @see https://tailwindcss.com/docs/mask-size
			*/
			"mask-size": [{ mask: scaleBgSize() }],
			/**
			* Mask Type
			* @see https://tailwindcss.com/docs/mask-type
			*/
			"mask-type": [{ "mask-type": ["alpha", "luminance"] }],
			/**
			* Mask Image
			* @see https://tailwindcss.com/docs/mask-image
			*/
			"mask-image": [{ mask: [
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Filter
			* @see https://tailwindcss.com/docs/filter
			*/
			filter: [{ filter: [
				"",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Blur
			* @see https://tailwindcss.com/docs/blur
			*/
			blur: [{ blur: scaleBlur() }],
			/**
			* Brightness
			* @see https://tailwindcss.com/docs/brightness
			*/
			brightness: [{ brightness: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Contrast
			* @see https://tailwindcss.com/docs/contrast
			*/
			contrast: [{ contrast: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Drop Shadow
			* @see https://tailwindcss.com/docs/drop-shadow
			*/
			"drop-shadow": [{ "drop-shadow": [
				"",
				"none",
				themeDropShadow,
				isArbitraryVariableShadow,
				isArbitraryShadow
			] }],
			/**
			* Drop Shadow Color
			* @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
			*/
			"drop-shadow-color": [{ "drop-shadow": scaleColor() }],
			/**
			* Grayscale
			* @see https://tailwindcss.com/docs/grayscale
			*/
			grayscale: [{ grayscale: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Hue Rotate
			* @see https://tailwindcss.com/docs/hue-rotate
			*/
			"hue-rotate": [{ "hue-rotate": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Invert
			* @see https://tailwindcss.com/docs/invert
			*/
			invert: [{ invert: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Saturate
			* @see https://tailwindcss.com/docs/saturate
			*/
			saturate: [{ saturate: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Sepia
			* @see https://tailwindcss.com/docs/sepia
			*/
			sepia: [{ sepia: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Filter
			* @see https://tailwindcss.com/docs/backdrop-filter
			*/
			"backdrop-filter": [{ "backdrop-filter": [
				"",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Blur
			* @see https://tailwindcss.com/docs/backdrop-blur
			*/
			"backdrop-blur": [{ "backdrop-blur": scaleBlur() }],
			/**
			* Backdrop Brightness
			* @see https://tailwindcss.com/docs/backdrop-brightness
			*/
			"backdrop-brightness": [{ "backdrop-brightness": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Contrast
			* @see https://tailwindcss.com/docs/backdrop-contrast
			*/
			"backdrop-contrast": [{ "backdrop-contrast": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Grayscale
			* @see https://tailwindcss.com/docs/backdrop-grayscale
			*/
			"backdrop-grayscale": [{ "backdrop-grayscale": [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Hue Rotate
			* @see https://tailwindcss.com/docs/backdrop-hue-rotate
			*/
			"backdrop-hue-rotate": [{ "backdrop-hue-rotate": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Invert
			* @see https://tailwindcss.com/docs/backdrop-invert
			*/
			"backdrop-invert": [{ "backdrop-invert": [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Opacity
			* @see https://tailwindcss.com/docs/backdrop-opacity
			*/
			"backdrop-opacity": [{ "backdrop-opacity": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Saturate
			* @see https://tailwindcss.com/docs/backdrop-saturate
			*/
			"backdrop-saturate": [{ "backdrop-saturate": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Sepia
			* @see https://tailwindcss.com/docs/backdrop-sepia
			*/
			"backdrop-sepia": [{ "backdrop-sepia": [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Border Collapse
			* @see https://tailwindcss.com/docs/border-collapse
			*/
			"border-collapse": [{ border: ["collapse", "separate"] }],
			/**
			* Border Spacing
			* @see https://tailwindcss.com/docs/border-spacing
			*/
			"border-spacing": [{ "border-spacing": scaleUnambiguousSpacing() }],
			/**
			* Border Spacing X
			* @see https://tailwindcss.com/docs/border-spacing
			*/
			"border-spacing-x": [{ "border-spacing-x": scaleUnambiguousSpacing() }],
			/**
			* Border Spacing Y
			* @see https://tailwindcss.com/docs/border-spacing
			*/
			"border-spacing-y": [{ "border-spacing-y": scaleUnambiguousSpacing() }],
			/**
			* Table Layout
			* @see https://tailwindcss.com/docs/table-layout
			*/
			"table-layout": [{ table: ["auto", "fixed"] }],
			/**
			* Caption Side
			* @see https://tailwindcss.com/docs/caption-side
			*/
			caption: [{ caption: ["top", "bottom"] }],
			/**
			* Transition Property
			* @see https://tailwindcss.com/docs/transition-property
			*/
			transition: [{ transition: [
				"",
				"all",
				"colors",
				"opacity",
				"shadow",
				"transform",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Transition Behavior
			* @see https://tailwindcss.com/docs/transition-behavior
			*/
			"transition-behavior": [{ transition: ["normal", "discrete"] }],
			/**
			* Transition Duration
			* @see https://tailwindcss.com/docs/transition-duration
			*/
			duration: [{ duration: [
				isNumber,
				"initial",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Transition Timing Function
			* @see https://tailwindcss.com/docs/transition-timing-function
			*/
			ease: [{ ease: [
				"linear",
				"initial",
				themeEase,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Transition Delay
			* @see https://tailwindcss.com/docs/transition-delay
			*/
			delay: [{ delay: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Animation
			* @see https://tailwindcss.com/docs/animation
			*/
			animate: [{ animate: [
				"none",
				themeAnimate,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backface Visibility
			* @see https://tailwindcss.com/docs/backface-visibility
			*/
			backface: [{ backface: ["hidden", "visible"] }],
			/**
			* Perspective
			* @see https://tailwindcss.com/docs/perspective
			*/
			perspective: [{ perspective: [
				themePerspective,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Perspective Origin
			* @see https://tailwindcss.com/docs/perspective-origin
			*/
			"perspective-origin": [{ "perspective-origin": scalePositionWithArbitrary() }],
			/**
			* Rotate
			* @see https://tailwindcss.com/docs/rotate
			*/
			rotate: [{ rotate: scaleRotate() }],
			/**
			* Rotate X
			* @see https://tailwindcss.com/docs/rotate
			*/
			"rotate-x": [{ "rotate-x": scaleRotate() }],
			/**
			* Rotate Y
			* @see https://tailwindcss.com/docs/rotate
			*/
			"rotate-y": [{ "rotate-y": scaleRotate() }],
			/**
			* Rotate Z
			* @see https://tailwindcss.com/docs/rotate
			*/
			"rotate-z": [{ "rotate-z": scaleRotate() }],
			/**
			* Scale
			* @see https://tailwindcss.com/docs/scale
			*/
			scale: [{ scale: scaleScale() }],
			/**
			* Scale X
			* @see https://tailwindcss.com/docs/scale
			*/
			"scale-x": [{ "scale-x": scaleScale() }],
			/**
			* Scale Y
			* @see https://tailwindcss.com/docs/scale
			*/
			"scale-y": [{ "scale-y": scaleScale() }],
			/**
			* Scale Z
			* @see https://tailwindcss.com/docs/scale
			*/
			"scale-z": [{ "scale-z": scaleScale() }],
			/**
			* Scale 3D
			* @see https://tailwindcss.com/docs/scale
			*/
			"scale-3d": ["scale-3d"],
			/**
			* Skew
			* @see https://tailwindcss.com/docs/skew
			*/
			skew: [{ skew: scaleSkew() }],
			/**
			* Skew X
			* @see https://tailwindcss.com/docs/skew
			*/
			"skew-x": [{ "skew-x": scaleSkew() }],
			/**
			* Skew Y
			* @see https://tailwindcss.com/docs/skew
			*/
			"skew-y": [{ "skew-y": scaleSkew() }],
			/**
			* Transform
			* @see https://tailwindcss.com/docs/transform
			*/
			transform: [{ transform: [
				isArbitraryVariable,
				isArbitraryValue,
				"",
				"none",
				"gpu",
				"cpu"
			] }],
			/**
			* Transform Origin
			* @see https://tailwindcss.com/docs/transform-origin
			*/
			"transform-origin": [{ origin: scalePositionWithArbitrary() }],
			/**
			* Transform Style
			* @see https://tailwindcss.com/docs/transform-style
			*/
			"transform-style": [{ transform: ["3d", "flat"] }],
			/**
			* Translate
			* @see https://tailwindcss.com/docs/translate
			*/
			translate: [{ translate: scaleTranslate() }],
			/**
			* Translate X
			* @see https://tailwindcss.com/docs/translate
			*/
			"translate-x": [{ "translate-x": scaleTranslate() }],
			/**
			* Translate Y
			* @see https://tailwindcss.com/docs/translate
			*/
			"translate-y": [{ "translate-y": scaleTranslate() }],
			/**
			* Translate Z
			* @see https://tailwindcss.com/docs/translate
			*/
			"translate-z": [{ "translate-z": scaleTranslate() }],
			/**
			* Translate None
			* @see https://tailwindcss.com/docs/translate
			*/
			"translate-none": ["translate-none"],
			/**
			* Zoom
			* @see https://tailwindcss.com/docs/zoom
			*/
			zoom: [{ zoom: [
				isInteger,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Accent Color
			* @see https://tailwindcss.com/docs/accent-color
			*/
			accent: [{ accent: scaleColor() }],
			/**
			* Appearance
			* @see https://tailwindcss.com/docs/appearance
			*/
			appearance: [{ appearance: ["none", "auto"] }],
			/**
			* Caret Color
			* @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
			*/
			"caret-color": [{ caret: scaleColor() }],
			/**
			* Color Scheme
			* @see https://tailwindcss.com/docs/color-scheme
			*/
			"color-scheme": [{ scheme: [
				"normal",
				"dark",
				"light",
				"light-dark",
				"only-dark",
				"only-light"
			] }],
			/**
			* Cursor
			* @see https://tailwindcss.com/docs/cursor
			*/
			cursor: [{ cursor: [
				"auto",
				"default",
				"pointer",
				"wait",
				"text",
				"move",
				"help",
				"not-allowed",
				"none",
				"context-menu",
				"progress",
				"cell",
				"crosshair",
				"vertical-text",
				"alias",
				"copy",
				"no-drop",
				"grab",
				"grabbing",
				"all-scroll",
				"col-resize",
				"row-resize",
				"n-resize",
				"e-resize",
				"s-resize",
				"w-resize",
				"ne-resize",
				"nw-resize",
				"se-resize",
				"sw-resize",
				"ew-resize",
				"ns-resize",
				"nesw-resize",
				"nwse-resize",
				"zoom-in",
				"zoom-out",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Field Sizing
			* @see https://tailwindcss.com/docs/field-sizing
			*/
			"field-sizing": [{ "field-sizing": ["fixed", "content"] }],
			/**
			* Pointer Events
			* @see https://tailwindcss.com/docs/pointer-events
			*/
			"pointer-events": [{ "pointer-events": ["auto", "none"] }],
			/**
			* Resize
			* @see https://tailwindcss.com/docs/resize
			*/
			resize: [{ resize: [
				"none",
				"",
				"y",
				"x"
			] }],
			/**
			* Scroll Behavior
			* @see https://tailwindcss.com/docs/scroll-behavior
			*/
			"scroll-behavior": [{ scroll: ["auto", "smooth"] }],
			/**
			* Scrollbar Thumb Color
			* @see https://tailwindcss.com/docs/scrollbar-color
			*/
			"scrollbar-thumb-color": [{ "scrollbar-thumb": scaleColor() }],
			/**
			* Scrollbar Track Color
			* @see https://tailwindcss.com/docs/scrollbar-color
			*/
			"scrollbar-track-color": [{ "scrollbar-track": scaleColor() }],
			/**
			* Scrollbar Gutter
			* @see https://tailwindcss.com/docs/scrollbar-gutter
			*/
			"scrollbar-gutter": [{ "scrollbar-gutter": [
				"auto",
				"stable",
				"both"
			] }],
			/**
			* Scrollbar Width
			* @see https://tailwindcss.com/docs/scrollbar-width
			*/
			"scrollbar-w": [{ scrollbar: [
				"auto",
				"thin",
				"none"
			] }],
			/**
			* Scroll Margin
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-m": [{ "scroll-m": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Inline
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mx": [{ "scroll-mx": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Block
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-my": [{ "scroll-my": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Inline Start
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-ms": [{ "scroll-ms": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Inline End
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-me": [{ "scroll-me": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Block Start
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mbs": [{ "scroll-mbs": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Block End
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mbe": [{ "scroll-mbe": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Top
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mt": [{ "scroll-mt": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Right
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mr": [{ "scroll-mr": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Bottom
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mb": [{ "scroll-mb": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Left
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-ml": [{ "scroll-ml": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-p": [{ "scroll-p": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Inline
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-px": [{ "scroll-px": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Block
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-py": [{ "scroll-py": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Inline Start
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-ps": [{ "scroll-ps": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Inline End
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pe": [{ "scroll-pe": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Block Start
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pbs": [{ "scroll-pbs": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Block End
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pbe": [{ "scroll-pbe": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Top
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pt": [{ "scroll-pt": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Right
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pr": [{ "scroll-pr": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Bottom
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pb": [{ "scroll-pb": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Left
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pl": [{ "scroll-pl": scaleUnambiguousSpacing() }],
			/**
			* Scroll Snap Align
			* @see https://tailwindcss.com/docs/scroll-snap-align
			*/
			"snap-align": [{ snap: [
				"start",
				"end",
				"center",
				"align-none"
			] }],
			/**
			* Scroll Snap Stop
			* @see https://tailwindcss.com/docs/scroll-snap-stop
			*/
			"snap-stop": [{ snap: ["normal", "always"] }],
			/**
			* Scroll Snap Type
			* @see https://tailwindcss.com/docs/scroll-snap-type
			*/
			"snap-type": [{ snap: [
				"none",
				"x",
				"y",
				"both"
			] }],
			/**
			* Scroll Snap Type Strictness
			* @see https://tailwindcss.com/docs/scroll-snap-type
			*/
			"snap-strictness": [{ snap: ["mandatory", "proximity"] }],
			/**
			* Touch Action
			* @see https://tailwindcss.com/docs/touch-action
			*/
			touch: [{ touch: [
				"auto",
				"none",
				"manipulation"
			] }],
			/**
			* Touch Action X
			* @see https://tailwindcss.com/docs/touch-action
			*/
			"touch-x": [{ "touch-pan": [
				"x",
				"left",
				"right"
			] }],
			/**
			* Touch Action Y
			* @see https://tailwindcss.com/docs/touch-action
			*/
			"touch-y": [{ "touch-pan": [
				"y",
				"up",
				"down"
			] }],
			/**
			* Touch Action Pinch Zoom
			* @see https://tailwindcss.com/docs/touch-action
			*/
			"touch-pz": ["touch-pinch-zoom"],
			/**
			* User Select
			* @see https://tailwindcss.com/docs/user-select
			*/
			select: [{ select: [
				"none",
				"text",
				"all",
				"auto"
			] }],
			/**
			* Will Change
			* @see https://tailwindcss.com/docs/will-change
			*/
			"will-change": [{ "will-change": [
				"auto",
				"scroll",
				"contents",
				"transform",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Fill
			* @see https://tailwindcss.com/docs/fill
			*/
			fill: [{ fill: ["none", ...scaleColor()] }],
			/**
			* Stroke Width
			* @see https://tailwindcss.com/docs/stroke-width
			*/
			"stroke-w": [{ stroke: [
				isNumber,
				isArbitraryVariableLength,
				isArbitraryLength,
				isArbitraryNumber
			] }],
			/**
			* Stroke
			* @see https://tailwindcss.com/docs/stroke
			*/
			stroke: [{ stroke: ["none", ...scaleColor()] }],
			/**
			* Forced Color Adjust
			* @see https://tailwindcss.com/docs/forced-color-adjust
			*/
			"forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }]
		},
		conflictingClassGroups: {
			"container-named": ["container-type"],
			overflow: ["overflow-x", "overflow-y"],
			overscroll: ["overscroll-x", "overscroll-y"],
			inset: [
				"inset-x",
				"inset-y",
				"inset-bs",
				"inset-be",
				"start",
				"end",
				"top",
				"right",
				"bottom",
				"left"
			],
			"inset-x": [
				"start",
				"end",
				"right",
				"left"
			],
			"inset-y": [
				"inset-bs",
				"inset-be",
				"top",
				"bottom"
			],
			flex: [
				"basis",
				"grow",
				"shrink"
			],
			gap: ["gap-x", "gap-y"],
			"place-content": ["align-content", "justify-content"],
			"place-items": ["align-items", "justify-items"],
			"place-self": ["align-self", "justify-self"],
			p: [
				"px",
				"py",
				"ps",
				"pe",
				"pbs",
				"pbe",
				"pt",
				"pr",
				"pb",
				"pl"
			],
			px: [
				"ps",
				"pe",
				"pr",
				"pl"
			],
			py: [
				"pbs",
				"pbe",
				"pt",
				"pb"
			],
			m: [
				"mx",
				"my",
				"ms",
				"me",
				"mbs",
				"mbe",
				"mt",
				"mr",
				"mb",
				"ml"
			],
			mx: [
				"ms",
				"me",
				"mr",
				"ml"
			],
			my: [
				"mbs",
				"mbe",
				"mt",
				"mb"
			],
			size: ["w", "h"],
			"fvn-normal": [
				"fvn-ordinal",
				"fvn-slashed-zero",
				"fvn-figure",
				"fvn-spacing",
				"fvn-fraction"
			],
			"fvn-ordinal": ["fvn-normal"],
			"fvn-slashed-zero": ["fvn-normal"],
			"fvn-figure": ["fvn-normal"],
			"fvn-spacing": ["fvn-normal"],
			"fvn-fraction": ["fvn-normal"],
			"line-clamp": ["display", "overflow"],
			sr: [
				"not-sr",
				"position",
				"size",
				"w",
				"h",
				"p",
				"px",
				"py",
				"ps",
				"pe",
				"pbs",
				"pbe",
				"pt",
				"pr",
				"pb",
				"pl",
				"m",
				"mx",
				"my",
				"ms",
				"me",
				"mbs",
				"mbe",
				"mt",
				"mr",
				"mb",
				"ml",
				"overflow",
				"overflow-x",
				"overflow-y",
				"whitespace"
			],
			"not-sr": ["sr"],
			rounded: [
				"rounded-s",
				"rounded-e",
				"rounded-t",
				"rounded-r",
				"rounded-b",
				"rounded-l",
				"rounded-ss",
				"rounded-se",
				"rounded-ee",
				"rounded-es",
				"rounded-tl",
				"rounded-tr",
				"rounded-br",
				"rounded-bl"
			],
			"rounded-s": ["rounded-ss", "rounded-es"],
			"rounded-e": ["rounded-se", "rounded-ee"],
			"rounded-t": ["rounded-tl", "rounded-tr"],
			"rounded-r": ["rounded-tr", "rounded-br"],
			"rounded-b": ["rounded-br", "rounded-bl"],
			"rounded-l": ["rounded-tl", "rounded-bl"],
			"border-spacing": ["border-spacing-x", "border-spacing-y"],
			"border-w": [
				"border-w-x",
				"border-w-y",
				"border-w-s",
				"border-w-e",
				"border-w-bs",
				"border-w-be",
				"border-w-t",
				"border-w-r",
				"border-w-b",
				"border-w-l"
			],
			"border-w-x": [
				"border-w-s",
				"border-w-e",
				"border-w-r",
				"border-w-l"
			],
			"border-w-y": [
				"border-w-bs",
				"border-w-be",
				"border-w-t",
				"border-w-b"
			],
			"border-color": [
				"border-color-x",
				"border-color-y",
				"border-color-s",
				"border-color-e",
				"border-color-bs",
				"border-color-be",
				"border-color-t",
				"border-color-r",
				"border-color-b",
				"border-color-l"
			],
			"border-color-x": [
				"border-color-s",
				"border-color-e",
				"border-color-r",
				"border-color-l"
			],
			"border-color-y": [
				"border-color-bs",
				"border-color-be",
				"border-color-t",
				"border-color-b"
			],
			"mask-image-x-from-pos": ["mask-image-r-from-pos", "mask-image-l-from-pos"],
			"mask-image-x-to-pos": ["mask-image-r-to-pos", "mask-image-l-to-pos"],
			"mask-image-x-from-color": ["mask-image-r-from-color", "mask-image-l-from-color"],
			"mask-image-x-to-color": ["mask-image-r-to-color", "mask-image-l-to-color"],
			"mask-image-y-from-pos": ["mask-image-t-from-pos", "mask-image-b-from-pos"],
			"mask-image-y-to-pos": ["mask-image-t-to-pos", "mask-image-b-to-pos"],
			"mask-image-y-from-color": ["mask-image-t-from-color", "mask-image-b-from-color"],
			"mask-image-y-to-color": ["mask-image-t-to-color", "mask-image-b-to-color"],
			translate: [
				"translate-x",
				"translate-y",
				"translate-none"
			],
			"translate-none": [
				"translate",
				"translate-x",
				"translate-y",
				"translate-z"
			],
			"scroll-m": [
				"scroll-mx",
				"scroll-my",
				"scroll-ms",
				"scroll-me",
				"scroll-mbs",
				"scroll-mbe",
				"scroll-mt",
				"scroll-mr",
				"scroll-mb",
				"scroll-ml"
			],
			"scroll-mx": [
				"scroll-ms",
				"scroll-me",
				"scroll-mr",
				"scroll-ml"
			],
			"scroll-my": [
				"scroll-mbs",
				"scroll-mbe",
				"scroll-mt",
				"scroll-mb"
			],
			"scroll-p": [
				"scroll-px",
				"scroll-py",
				"scroll-ps",
				"scroll-pe",
				"scroll-pbs",
				"scroll-pbe",
				"scroll-pt",
				"scroll-pr",
				"scroll-pb",
				"scroll-pl"
			],
			"scroll-px": [
				"scroll-ps",
				"scroll-pe",
				"scroll-pr",
				"scroll-pl"
			],
			"scroll-py": [
				"scroll-pbs",
				"scroll-pbe",
				"scroll-pt",
				"scroll-pb"
			],
			touch: [
				"touch-x",
				"touch-y",
				"touch-pz"
			],
			"touch-x": ["touch"],
			"touch-y": ["touch"],
			"touch-pz": ["touch"]
		},
		conflictingClassGroupModifiers: { "font-size": ["leading"] },
		postfixLookupClassGroups: ["container-type"],
		orderSensitiveModifiers: [
			"*",
			"**",
			"after",
			"backdrop",
			"before",
			"details-content",
			"file",
			"first-letter",
			"first-line",
			"marker",
			"placeholder",
			"selection"
		]
	};
};
var twMerge = /*#__PURE__*/ createTailwindMerge(getDefaultConfig);
// web/lib/cn.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0";
// web/utils/format.ts
function statusTone(status) {
	const s = String(status || "standby").toLowerCase();
	if (s === "healthy" || s === "active" || s === "ok" || s === "online" || s === "running" || s === "ready") return "ok";
	if (s === "degraded" || s === "warning" || s === "warn" || s === "stale" || s === "activating" || s === "reloading") return "warn";
	if (s === "failed" || s === "error" || s === "offline" || s === "critical" || s === "down") return "err";
	return "muted";
}
function statusLabel(status) {
	const s = String(status || "standby").toLowerCase();
	if (s === "healthy" || s === "active" || s === "ok" || s === "running" || s === "ready") return "健康";
	if (s === "online") return "在线";
	if (s === "degraded" || s === "warning" || s === "warn") return "降级";
	if (s === "stale") return "延迟";
	if (s === "activating" || s === "reloading") return "启动中";
	if (s === "standby" || s === "inactive" || s === "disabled" || s === "idle") return "待机";
	if (s === "offline" || s === "down") return "离线";
	return "故障";
}
function formatBytes(bytes) {
	if (bytes == null || !Number.isFinite(Number(bytes))) return "-";
	const num = Number(bytes);
	if (num < 1024) return `${Math.round(num)} B`;
	const units = [
		"KB",
		"MB",
		"GB",
		"TB"
	];
	let val = num / 1024;
	let idx = 0;
	while (val >= 1024 && idx < units.length - 1) {
		val /= 1024;
		idx += 1;
	}
	return `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}
function formatInteger(value) {
	if (value == null || !Number.isFinite(Number(value))) return "-";
	return Math.round(Number(value)).toLocaleString("en-US");
}
function formatCompactNumber(value) {
	if (value == null || !Number.isFinite(Number(value))) return "-";
	const num = Number(value);
	const abs = Math.abs(num);
	if (abs < 1e4) return Math.round(num).toLocaleString("en-US");
	if (abs < 1e6) return `${(num / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}K`;
	if (abs < 1e9) return `${(num / 1e6).toFixed(abs >= 1e8 ? 0 : 2)}M`;
	return `${(num / 1e9).toFixed(2)}B`;
}
function formatUptime(sec) {
	if (sec == null || !Number.isFinite(Number(sec))) return "-";
	const total = Math.max(0, Math.floor(Number(sec)));
	const days = Math.floor(total / 86400);
	const hours = Math.floor(total % 86400 / 3600);
	const mins = Math.floor(total % 3600 / 60);
	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${mins}m`;
	return `${mins}m`;
}
function formatRelativeAge(ts, ageSec) {
	let diff = typeof ageSec === "number" && Number.isFinite(ageSec) ? ageSec : NaN;
	if (!Number.isFinite(diff) && ts) {
		const parsed = typeof ts === "number" ? ts : Date.parse(ts);
		if (Number.isFinite(parsed)) diff = Math.max(0, Math.floor((Date.now() - parsed) / 1e3));
	}
	if (!Number.isFinite(diff)) return "-";
	if (diff < 15) return "刚刚";
	if (diff < 60) return `${Math.round(diff)}s 前`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m 前`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h 前`;
	return `${Math.floor(diff / 86400)}d 前`;
}
function formatClock(ts) {
	if (!ts) return "-";
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return String(ts);
	return d.toLocaleTimeString("zh-CN", { hour12: false });
}
function formatDateTime(ts) {
	if (!ts) return "-";
	const d = new Date(ts);
	if (Number.isNaN(d.getTime())) return String(ts);
	return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
function deviceTypeLabel(type) {
	const t = String(type || "server").toLowerCase();
	if (t === "hub") return "控制中枢";
	if (t === "laptop") return "笔记本";
	if (t === "mobile") return "移动端";
	return "服务器";
}
function layerLabel(layer) {
	const l = String(layer || "").toLowerCase();
	if (l === "core" || l === "app" || l === "entry") return "核心";
	if (l === "memory") return "记忆";
	if (l === "gateway" || l === "agents" || l === "agent") return "网关与 Agent";
	if (l === "network" || l === "infra") return "网络";
	return layer || "服务";
}
function filterServices(items, opts) {
	const q = opts.query.trim().toLowerCase();
	return items.filter((svc) => {
		if (opts.layer && opts.layer !== "all") {
			const l = String(svc.layer || "").toLowerCase();
			if (opts.layer === "core" && ![
				"core",
				"app",
				"entry"
			].includes(l)) return false;
			if (opts.layer === "memory" && l !== "memory") return false;
			if (opts.layer === "agents" && ![
				"agents",
				"agent",
				"gateway"
			].includes(l)) return false;
			if (opts.layer === "network" && !["network", "infra"].includes(l)) return false;
		}
		if (opts.status && opts.status !== "all") {
			const tone = statusTone(svc.status);
			if (opts.status === "healthy" && tone !== "ok") return false;
			if (opts.status === "degraded" && tone !== "warn") return false;
			if (opts.status === "failed" && tone !== "err") return false;
			if (opts.status === "standby" && tone !== "muted") return false;
		}
		if (q) {
			if (![
				svc.id,
				svc.name,
				svc.unit,
				svc.role,
				...svc.ports || []
			].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
		}
		return true;
	});
}
function filterFleetNodes(nodes, typeFilter) {
	if (!typeFilter || typeFilter === "all") return nodes;
	return nodes.filter((n) => {
		const dt = String(n.deviceType || "server").toLowerCase();
		if (typeFilter === "server") return dt === "server" || dt === "hub";
		return dt === typeFilter;
	});
}
function countLogLevels(entries) {
	let error = 0;
	let warn = 0;
	let info = 0;
	let debug = 0;
	for (const e of entries) {
		const lv = String(e.level || e.severity || "info").toLowerCase();
		if (lv.includes("err") || lv.includes("crit") || lv.includes("fatal") || lv.includes("alert")) error += 1;
		else if (lv.includes("warn")) warn += 1;
		else if (lv.includes("debug") || lv.includes("trace")) debug += 1;
		else info += 1;
	}
	return {
		total: entries.length,
		error,
		warn,
		info,
		debug
	};
}
function clampPercent(val) {
	const n = Number(val);
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(100, Math.round(n)));
}
/**
* Maps service probe response latency (ms) to a perceptually calibrated
* logarithmic percentage (8%..100%) and 5-tier color intensity scale so
* sub-15ms local probes and slower upstream bottlenecks both read clearly.
*/
function classifyLatency(latencyMs) {
	if (latencyMs == null || !Number.isFinite(Number(latencyMs))) return null;
	const ms = Math.max(0, Number(latencyMs));
	const rawPct = 8 + Math.log1p(ms) / Math.log1p(150) * 92;
	const pct = Math.max(8, Math.min(100, Math.round(rawPct)));
	if (ms <= 5) return {
		tier: "fast",
		label: "极快",
		pct,
		ms
	};
	if (ms <= 12) return {
		tier: "good",
		label: "流畅",
		pct,
		ms
	};
	if (ms <= 30) return {
		tier: "moderate",
		label: "适中",
		pct,
		ms
	};
	if (ms <= 80) return {
		tier: "slow",
		label: "偏慢",
		pct,
		ms
	};
	return {
		tier: "critical",
		label: "瓶颈",
		pct,
		ms
	};
}
// node_modules/class-variance-authority/dist/index.mjs
/**
* Copyright 2022 Joe Bell. All rights reserved.
*
* This file is licensed to you under the Apache License, Version 2.0
* (the "License"); you may not use this file except in compliance with the
* License. You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations under
* the License.
*/ var falsyToString = (value) => typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
var cx = clsx;
var cva = (base, config) => (props) => {
	var _config_compoundVariants;
	if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
	const { variants, defaultVariants } = config;
	const getVariantClassNames = Object.keys(variants).map((variant) => {
		const variantProp = props === null || props === void 0 ? void 0 : props[variant];
		const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
		if (variantProp === null) return null;
		const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
		return variants[variant][variantKey];
	});
	const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param) => {
		let [key, value] = param;
		if (value === void 0) return acc;
		acc[key] = value;
		return acc;
	}, {});
	return cx(base, getVariantClassNames, config === null || config === void 0 ? void 0 : (_config_compoundVariants = config.compoundVariants) === null || _config_compoundVariants === void 0 ? void 0 : _config_compoundVariants.reduce((acc, param) => {
		let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param;
		return Object.entries(compoundVariantOptions).every((param) => {
			let [key, value] = param;
			return Array.isArray(value) ? value.includes({
				...defaultVariants,
				...propsWithoutUndefined
			}[key]) : {
				...defaultVariants,
				...propsWithoutUndefined
			}[key] === value;
		}) ? [
			...acc,
			cvClass,
			cvClassName
		] : acc;
	}, []), props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
};
// web/components/ui.tsx
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva(cn("inline-flex items-center justify-center gap-1.5 rounded-lg font-medium select-none whitespace-nowrap shrink-0 cursor-pointer", "transition-[color,background-color,border-color,transform,opacity] duration-150 ease-out", "active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none", FOCUS_RING), {
	variants: {
		variant: {
			primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(0,0,0,0.14)]",
			secondary: "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
			ghost: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]",
			danger: "bg-[var(--err-dot)] text-white hover:bg-[var(--err)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.18)]"
		},
		size: {
			sm: "h-8 px-2.5 text-[12.5px]",
			md: "h-9 px-3.5 text-[13px]",
			lg: "h-10 px-4 text-[13.5px]",
			icon: "h-8 w-8 p-0"
		}
	},
	defaultVariants: {
		variant: "secondary",
		size: "md"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, type = "button", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
	ref,
	type,
	className: cn(buttonVariants({
		variant,
		size
	}), className),
	...props
}));
Button.displayName = "Button";
var inputBaseClass = cn("rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[16px] sm:text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)]", "transition-[border-color,box-shadow,background-color] duration-150 ease-out", "hover:border-[var(--border-strong)] focus:border-[var(--accent)]", FOCUS_RING);
function SegmentedFilter({ value, onChange, options, ariaLabel, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SegmentedControl, {
		value,
		onValueChange: (v) => {
			if (v) onChange(v);
		},
		"aria-label": ariaLabel,
		className: cn("ui-seg-root", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedControlIndicator, { className: "ui-seg-indicator" }), options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedControlItem, {
			value: opt.value,
			className: "ui-seg-item",
			children: opt.label
		}, opt.value))]
	});
}
function StatusIndicator({ status, label }) {
	const tone = statusTone(status);
	const text = label || statusLabel(status);
	const dotColor = tone === "ok" ? "bg-[var(--ok-dot)]" : tone === "warn" ? "bg-[var(--warn-dot)]" : tone === "err" ? "bg-[var(--err-dot)]" : "bg-[var(--muted-dot)]";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap select-none", tone === "ok" ? "text-[var(--ok)]" : tone === "warn" ? "text-[var(--warn)]" : tone === "err" ? "text-[var(--err)]" : "text-[var(--ink-muted)]"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor),
			"aria-hidden": "true"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: text })]
	});
}
function ResourceMeter({ value, label, valueText, tone }) {
	const pct = clampPercent(value);
	const resolvedTone = tone || (pct >= 88 ? "err" : pct >= 72 ? "warn" : "ok");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Meter, {
		value: pct,
		min: 0,
		max: 100,
		"aria-label": label || "利用率",
		className: "w-full space-y-1.5",
		children: [(label || valueText) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline justify-between gap-2 text-[13px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate font-medium text-[var(--ink)] min-w-0",
				title: label,
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap shrink-0",
				children: valueText ?? `${pct}%`
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeterTrack, {
			className: "ui-meter-track",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeterIndicator, {
				className: "ui-meter-indicator",
				"data-tone": resolvedTone,
				style: { transform: `scaleX(${pct / 100})` }
			})
		})]
	});
}
function LatencyMeter({ latencyMs, statusCode, ok = true, error }) {
	if (!ok) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-[140px] max-w-[192px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-between gap-2 text-[12px]",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono font-medium text-[var(--err)] truncate",
				title: error || "探针异常",
				children: error || "探针异常"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1.5 ui-latency-track",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ui-latency-indicator",
				"data-tier": "critical",
				style: { transform: "scaleX(1)" }
			})
		})]
	});
	const info = classifyLatency(latencyMs);
	if (!info) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums",
		children: "-"
	});
	const tierTextColor = info.tier === "critical" ? "text-[var(--err)]" : info.tier === "slow" || info.tier === "moderate" ? "text-[var(--warn)]" : "text-[var(--ok)]";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Meter, {
		value: info.pct,
		min: 0,
		max: 100,
		"aria-label": `探针延迟 ${info.ms}ms (${info.label})`,
		"data-testid": "latency-meter",
		"data-latency-tier": info.tier,
		className: "min-w-[124px] max-w-[156px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline justify-between gap-2 text-[12px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "font-mono font-medium text-[var(--ink)] tabular-nums",
				children: [
					info.ms,
					"ms",
					statusCode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-1.5 font-normal text-[11px] text-[var(--ink-subtle)]",
						children: statusCode
					}) : null
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("text-[11px] font-medium whitespace-nowrap", tierTextColor),
				children: info.label
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeterTrack, {
			className: "mt-1.5 ui-latency-track",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeterIndicator, {
				className: "ui-latency-indicator",
				"data-tier": info.tier,
				style: { transform: `scaleX(${info.pct / 100})` }
			})
		})]
	});
}
function ToggleSwitch({ checked, onCheckedChange, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "inline-flex items-center gap-2 cursor-pointer select-none text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors duration-150 ease-out",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
			checked,
			onCheckedChange: (next) => onCheckedChange(Boolean(next)),
			"aria-label": label,
			className: "ui-switch-root",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: "ui-switch-thumb" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
	});
}
function Panel({ title, description, actions, children, className = "", bodyClassName = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden", className),
		children: [(title || actions) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-[min(100%,220px)] flex-1",
				children: [title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-[15px] font-semibold tracking-tight text-[var(--ink)] leading-snug text-balance",
					children: title
				}), description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-[13px] text-[var(--ink-muted)] leading-relaxed text-pretty",
					children: description
				})]
			}), actions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap items-center gap-2.5 min-w-0 max-w-full",
				children: actions
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("p-5 sm:p-6", bodyClassName),
			children
		})]
	});
}
function KpiValueDisplay({ cell, large = false }) {
	const valColor = cell.tone === "err" ? "text-[var(--err)]" : cell.tone === "warn" ? "text-[var(--warn)]" : "text-[var(--ink)]";
	const sizeClass = large ? "text-[30px]" : "text-[24px]";
	if (cell.numeric && Number.isFinite(cell.numeric.primary)) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("font-mono font-semibold tracking-tight leading-none tabular-nums flex items-baseline gap-0.5", sizeClass, valColor),
		children: [
			cell.numeric.prefix && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[0.72em] text-[var(--ink-muted)]",
				children: cell.numeric.prefix
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberFlow, { value: cell.numeric.primary }),
			cell.numeric.denominator != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-[0.65em] font-medium text-[var(--ink-subtle)] ml-0.5",
				children: ["/", cell.numeric.denominator]
			}),
			cell.numeric.suffix && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-[0.62em] font-medium text-[var(--ink-muted)] ml-0.5",
				children: cell.numeric.suffix
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("font-mono font-semibold tracking-tight leading-none tabular-nums truncate", sizeClass, valColor),
		title: cell.value,
		children: cell.value
	});
}
/**
* Asymmetric Bento KPI strip: leads with a slightly wider primary anchor cell
* with an inline health proportion bar, paired with compact telemetry tiles.
*/
function KpiStrip({ cells, asymmetric = false }) {
	if (asymmetric && cells.length === 4) {
		const [lead, ...rest] = cells;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 lg:grid-cols-12 gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "lg:col-span-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] p-5 sm:p-6 flex flex-col justify-between min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[12.5px] font-medium text-[var(--ink-muted)] truncate",
							children: lead.label
						}), lead.meta && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums shrink-0",
							children: lead.meta
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiValueDisplay, {
							cell: lead,
							large: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-2",
						children: [lead.ratioPct != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-1.5 w-full rounded-full bg-[var(--surface-subtle)] overflow-hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: cn("h-full w-full rounded-full origin-left transition-transform duration-200 ease-out", lead.tone === "err" ? "bg-[var(--err-dot)]" : lead.tone === "warn" ? "bg-[var(--warn-dot)]" : "bg-[var(--ok-dot)]"),
								style: { transform: `scaleX(${clampPercent(lead.ratioPct) / 100})` }
							})
						}), lead.sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[12.5px] text-[var(--ink-subtle)] leading-snug truncate",
							title: lead.sub,
							children: lead.sub
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden",
				children: rest.map((cell) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 py-5 flex flex-col justify-between min-w-0 transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center justify-between gap-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[12.5px] font-medium text-[var(--ink-muted)] truncate",
								children: cell.label
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiValueDisplay, { cell })
						}),
						cell.sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 text-[12px] text-[var(--ink-subtle)] leading-snug truncate",
							title: cell.sub,
							children: cell.sub
						})
					]
				}, cell.label))
			})]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden",
		children: cells.map((cell) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-5 sm:px-6 py-5 min-w-0 transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[12.5px] font-medium text-[var(--ink-muted)] truncate",
						children: cell.label
					}), cell.meta && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums shrink-0",
						children: cell.meta
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2.5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiValueDisplay, { cell })
				}),
				cell.sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2.5 text-[12.5px] text-[var(--ink-subtle)] leading-snug truncate",
					title: cell.sub,
					children: cell.sub
				})
			]
		}, cell.label))
	});
}
function ErrorState({ title = "数据加载失败", message, onRetry, retrying = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "alert",
		className: "py-12 px-6 flex flex-col items-center justify-center text-center gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-10 w-10 rounded-xl border border-[var(--err)]/25 bg-[var(--err)]/5 flex items-center justify-center text-[var(--err)]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleExclamationPoint, {
					className: "size-4",
					strokeWidth: 1.75,
					"aria-hidden": "true"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1 max-w-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[14px] font-medium text-[var(--ink)] text-balance",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[13px] text-[var(--ink-muted)] leading-relaxed text-pretty",
					children: message
				})]
			}),
			onRetry && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "secondary",
				size: "sm",
				onClick: onRetry,
				disabled: retrying,
				className: "mt-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
					className: cn("size-3.5", retrying && "animate-spin"),
					strokeWidth: 1.75
				}), retrying ? "重试中..." : "重新加载"]
			})
		]
	});
}
function WidgetSkeleton({ heightClass = "h-[320px]", label = "正在加载视图模块" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"aria-busy": "true",
		"aria-label": label,
		className: cn("w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)]/50 p-4 flex flex-col justify-between animate-pulse", heightClass),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3.5 w-36 rounded bg-[var(--surface-subtle)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3.5 w-24 rounded bg-[var(--surface-subtle)]" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 my-4 rounded-lg bg-[var(--surface-subtle)]/60" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-20 rounded bg-[var(--surface-subtle)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-28 rounded bg-[var(--surface-subtle)]" })]
			})
		]
	});
}
function ViewSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		"aria-busy": "true",
		"aria-label": "正在加载遥测视图",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-7 w-36 rounded-lg bg-[var(--surface-subtle)] animate-pulse" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-72 max-w-[75vw] rounded-md bg-[var(--surface-subtle)] animate-pulse" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hidden sm:block h-4 w-44 rounded-md bg-[var(--surface-subtle)] animate-pulse" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lg:col-span-5 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lg:col-span-7 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-[420px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" })
		]
	});
}
function EmptyState({ title, message, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-12 px-6 flex flex-col items-center justify-center text-center gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--ink-subtle)]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inbox, {
					className: "size-4",
					strokeWidth: 1.75,
					"aria-hidden": "true"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1 max-w-sm",
				children: [title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[14px] font-medium text-[var(--ink)] text-balance",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[13px] text-[var(--ink-subtle)] leading-relaxed text-pretty",
					children: message
				})]
			}),
			action && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "secondary",
				size: "sm",
				onClick: action.onClick,
				className: "mt-1",
				children: action.label
			})
		]
	});
}
function ConfirmAlertDialog({ state, onClose }) {
	const [tokenInput, setTokenInput] = import_react.useState("");
	const [busy, setBusy] = import_react.useState(false);
	import_react.useEffect(() => {
		setTokenInput("");
		setBusy(false);
	}, [
		state?.open,
		state?.title,
		state?.requireToken
	]);
	const tokenRequired = Boolean(state?.requireToken);
	const canSubmit = !busy && (!tokenRequired || tokenInput.trim() === state?.requireToken);
	const handleConfirm = async () => {
		if (!state || !canSubmit) return;
		setBusy(true);
		try {
			await state.onConfirm(tokenRequired ? tokenInput.trim() : void 0);
			onClose();
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialog, {
		open: Boolean(state?.open),
		onOpenChange: (open) => {
			if (!open && !busy) onClose();
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogBackdrop, { className: "ui-dialog-backdrop" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, {
			className: "ui-alert-content",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, {
					className: "text-[16px] font-semibold tracking-tight text-[var(--ink)] text-balance",
					children: state?.title || "确认操作"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, {
					className: "mt-2 text-[13.5px] text-[var(--ink-muted)] leading-relaxed text-pretty",
					children: state?.description || ""
				}),
				tokenRequired && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-[13px] text-[var(--ink-muted)]",
						children: [
							"关键基础设施二次确认：请输入",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--ink)] font-semibold",
								children: state?.requireToken
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						value: tokenInput,
						onChange: (e) => setTokenInput(e.target.value),
						placeholder: state?.requireToken,
						autoComplete: "off",
						className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex items-center justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogClose, {
						type: "button",
						disabled: busy,
						className: buttonVariants({
							variant: "secondary",
							size: "md"
						}),
						children: "取消"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: state?.danger ? "danger" : "primary",
						size: "md",
						disabled: !canSubmit,
						onClick: handleConfirm,
						children: busy ? "执行中..." : state?.confirmLabel || "确认执行"
					})]
				})
			]
		})]
	});
}
function CommandPalette({ open, onOpenChange, entries }) {
	const groups = import_react.useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		for (const item of entries) {
			if (!map.has(item.group)) map.set(item.group, []);
			map.get(item.group).push(item);
		}
		return [...map.entries()];
	}, [entries]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: (next) => onOpenChange(next),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogBackdrop, { className: "ui-dialog-backdrop" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "ui-dialog-content",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "sr-only",
					children: "快速命令面板"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "sr-only",
					children: "搜索并跳转视图、受管服务、全球节点或执行快捷运维命令"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_e, {
					label: "全局命令菜单",
					loop: true,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2.5 px-4 border-b border-[var(--border)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
									className: "size-4 text-[var(--ink-subtle)] shrink-0",
									strokeWidth: 1.75,
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Input, {
									autoFocus: true,
									"aria-label": "搜索视图、服务、日志级别、PID 进程或快捷操作",
									placeholder: "搜索视图、Error/Warn 日志、输入 PID 查找 Agent 进程...",
									className: "h-12 w-full bg-transparent text-[16px] sm:text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => onOpenChange(false),
									"aria-label": "关闭命令面板",
									className: cn("h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out cursor-pointer shrink-0", FOCUS_RING),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
										className: "size-4",
										strokeWidth: 1.75
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_e.List, {
							className: "max-h-[380px] overflow-y-auto p-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Empty, {
								className: "py-10 text-center text-[13px] text-[var(--ink-subtle)]",
								children: "未匹配到相关视图、节点或运维操作"
							}), groups.map(([groupName, items], idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [idx > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Separator, { className: "my-1.5 h-px bg-[var(--border-subtle)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Group, {
								heading: groupName,
								children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_e.Item, {
									value: `${item.label} ${item.meta || ""} ${(item.keywords || []).join(" ")}`,
									onSelect: () => {
										onOpenChange(false);
										item.onSelect();
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate font-medium text-[var(--ink)]",
										children: item.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2.5 shrink-0 ml-auto",
										children: [item.meta && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[11.5px] text-[var(--ink-subtle)] truncate max-w-[180px]",
											children: item.meta
										}), item.shortcut && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
											className: "font-mono text-[11px] text-[var(--ink-muted)] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)] tabular-nums",
											children: item.shortcut
										})]
									})]
								}, item.id))
							})] }, groupName))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden sm:flex items-center justify-between px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 text-[11.5px] text-[var(--ink-subtle)] select-none",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "↑ ↓ 切换条目 · Enter 确认执行" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono",
								children: "ESC 关闭"
							})]
						})
					]
				})
			]
		})]
	});
}
// web/lib/module-helpers.ts
function formatRemainingSilence(silenceUntilIso, nowMs = Date.now(), windowMinutes = 30) {
	if (!silenceUntilIso) return {
		expired: true,
		remainingMs: 0,
		label: "已结束",
		progressPct: 0
	};
	const targetMs = Date.parse(silenceUntilIso);
	if (!Number.isFinite(targetMs)) return {
		expired: true,
		remainingMs: 0,
		label: "已结束",
		progressPct: 0
	};
	const remainingMs = Math.max(0, targetMs - nowMs);
	if (remainingMs <= 0) return {
		expired: true,
		remainingMs: 0,
		label: "已结束",
		progressPct: 0
	};
	const totalSec = Math.ceil(remainingMs / 1e3);
	const hours = Math.floor(totalSec / 3600);
	const mins = Math.floor(totalSec % 3600 / 60);
	const secs = totalSec % 60;
	let label = "";
	if (hours > 0) label = `${hours}h ${String(mins).padStart(2, "0")}m`;
	else if (mins > 0) label = `${mins}m ${String(secs).padStart(2, "0")}s`;
	else label = `${secs}s`;
	const denomMs = Math.max(6e4, windowMinutes * 6e4);
	const progressPct = Math.min(100, Math.max(2, Math.round(remainingMs / denomMs * 100)));
	return {
		expired: false,
		remainingMs,
		label,
		progressPct
	};
}
var FLEET_STATUS_RANK = {
	err: 0,
	warn: 1,
	muted: 2,
	ok: 3
};
function searchFleetNodes(nodes, query) {
	const q = String(query || "").trim().toLowerCase();
	if (!q) return nodes;
	return nodes.filter((n) => {
		return [
			n.id,
			n.name,
			n.region,
			n.city,
			n.role,
			n.tailscaleIp,
			n.os,
			n.arch,
			n.probeMode
		].filter(Boolean).join(" ").toLowerCase().includes(q);
	});
}
function sortFleetNodes(nodes, field, dir) {
	const mult = dir === "asc" ? 1 : -1;
	return [...nodes].sort((a, b) => {
		if (field === "name") return a.name.localeCompare(b.name, "zh-CN") * mult;
		if (field === "status") {
			const ra = FLEET_STATUS_RANK[statusTone(a.status)] ?? 2;
			const rb = FLEET_STATUS_RANK[statusTone(b.status)] ?? 2;
			if (ra !== rb) return (ra - rb) * mult;
			return a.name.localeCompare(b.name, "zh-CN");
		}
		if (field === "rtt") {
			const va = a.network?.rttMs;
			const vb = b.network?.rttMs;
			if (va == null && vb == null) return a.name.localeCompare(b.name, "zh-CN");
			if (va == null) return 1;
			if (vb == null) return -1;
			return (va - vb) * mult;
		}
		if (field === "cpu") {
			const va = a.cpu?.usagePct ?? a.battery?.percent;
			const vb = b.cpu?.usagePct ?? b.battery?.percent;
			if (va == null && vb == null) return a.name.localeCompare(b.name, "zh-CN");
			if (va == null) return 1;
			if (vb == null) return -1;
			return (va - vb) * mult;
		}
		if (field === "mem") {
			const va = a.memory?.usedPct;
			const vb = b.memory?.usedPct;
			if (va == null && vb == null) return a.name.localeCompare(b.name, "zh-CN");
			if (va == null) return 1;
			if (vb == null) return -1;
			return (va - vb) * mult;
		}
		return 0;
	});
}
function latencyTierVar(ms) {
	if (ms == null || !Number.isFinite(ms)) return "var(--muted-dot)";
	if (ms <= 20) return "var(--lat-fast)";
	if (ms <= 60) return "var(--lat-good)";
	if (ms <= 140) return "var(--lat-moderate)";
	if (ms <= 260) return "var(--lat-slow)";
	return "var(--lat-critical)";
}
var SECRET_KEY_RE = /(token|secret|password|passwd|apikey|api_key|key|credential|auth)/i;
function buildPluginsExportPayload(items, nowIso = (/* @__PURE__ */ new Date()).toISOString()) {
	return {
		exportedAt: nowIso,
		count: items.length,
		plugins: items.map((item) => {
			const secretKeys = new Set((item.configSchema || []).filter((f) => f.type === "secret").map((f) => f.key));
			const cleanConfig = {};
			for (const [k, v] of Object.entries(item.config || {})) if (secretKeys.has(k) || SECRET_KEY_RE.test(k)) cleanConfig[k] = v ? "<REDACTED>" : "";
			else cleanConfig[k] = v;
			return {
				id: item.id,
				name: item.name,
				version: item.version,
				category: item.category,
				source: item.source,
				enabled: item.enabled,
				protocol: item.officialSpec?.protocol || "",
				config: cleanConfig
			};
		})
	};
}
function isAuditEntryFailed(entry) {
	return entry.ok === false || entry.status === "error";
}
function filterAuditEntries(entries, opts) {
	const q = String(opts.query || "").trim().toLowerCase();
	const outcome = opts.outcome || "all";
	return entries.filter((item) => {
		const failed = isAuditEntryFailed(item);
		if (outcome === "ok" && failed) return false;
		if (outcome === "fail" && !failed) return false;
		if (!q) return true;
		return [
			item.action,
			item.target,
			item.actor,
			item.result,
			item.detail,
			item.ip
		].filter(Boolean).join(" ").toLowerCase().includes(q);
	});
}
function escapeCsvCell(raw) {
	const s = raw == null ? "" : String(raw);
	if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
	return s;
}
function auditEntriesToCsv(entries) {
	const header = [
		"timestamp",
		"actor",
		"action",
		"target",
		"outcome",
		"durationMs",
		"detail"
	];
	const rows = entries.map((item) => [
		item.ts || item.timestamp || "",
		item.actor || "",
		item.action || "",
		item.target || "",
		isAuditEntryFailed(item) ? "failed" : item.result || "ok",
		item.durationMs != null ? String(item.durationMs) : "",
		item.detail || ""
	].map(escapeCsvCell).join(","));
	return [header.join(","), ...rows].join("\n");
}
var DEFAULT_OVERVIEW_PREFS = {
	metrics: true,
	graph: true,
	connectors: true,
	storageEvents: true
};
function parseOverviewPrefs(raw) {
	if (!raw) return { ...DEFAULT_OVERVIEW_PREFS };
	try {
		const parsed = JSON.parse(raw);
		return {
			metrics: typeof parsed.metrics === "boolean" ? parsed.metrics : true,
			graph: typeof parsed.graph === "boolean" ? parsed.graph : true,
			connectors: typeof parsed.connectors === "boolean" ? parsed.connectors : true,
			storageEvents: typeof parsed.storageEvents === "boolean" ? parsed.storageEvents : true
		};
	} catch {
		return { ...DEFAULT_OVERVIEW_PREFS };
	}
}
// web/modules/ModuleFrame.tsx
function ModuleFrame({ title, description, meta, actions, testId, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8 min-w-0",
		"data-testid": testId,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-end justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-[24px] font-semibold tracking-tight text-[var(--ink)] leading-tight text-balance",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed text-pretty",
					children: description
				})]
			}), (meta || actions) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-3 shrink-0 max-w-full",
				children: [meta && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums truncate max-w-full",
					children: meta
				}), actions]
			})]
		}), children]
	});
}
// web/views/OverviewView.tsx
var OVERVIEW_PREFS_KEY = "ops-console-overview-prefs-v1";
var PANEL_TOGGLE_ITEMS = [
	{
		key: "metrics",
		label: "历史指标趋势"
	},
	{
		key: "graph",
		label: "架构依赖图谱"
	},
	{
		key: "connectors",
		label: "插件与连接器"
	},
	{
		key: "storageEvents",
		label: "存储与事件"
	}
];
var ArchitectureGraph = import_react.lazy(() => __vitePreload(() => import("./ArchitectureGraph-Bi6KwZoe.js").then((m) => ({ default: m.ArchitectureGraph })), __vite__mapDeps([0,1,2,3,4,5])));
var MetricsChart = import_react.lazy(() => __vitePreload(() => import("./MetricsChart-Lp0cbkuM.js").then((m) => ({ default: m.MetricsChart })), __vite__mapDeps([6,1,2,3])));
var GRAPH_FILTERS = [
	{
		value: "all",
		label: "全部"
	},
	{
		value: "services",
		label: "核心服务"
	},
	{
		value: "memory",
		label: "记忆链路"
	},
	{
		value: "agents",
		label: "Agent 与网关"
	},
	{
		value: "network",
		label: "网络与底座"
	}
];
function OverviewView({ snapshot, incidents: persistedIncidents = [], onOpenLogs, onSelectAgentCategory, onOpenPlugins }) {
	const [graphFilter, setGraphFilter] = import_react.useState("all");
	const [customizeOpen, setCustomizeOpen] = import_react.useState(false);
	const [panelPrefs, setPanelPrefs] = import_react.useState(() => {
		try {
			return parseOverviewPrefs(window.localStorage.getItem(OVERVIEW_PREFS_KEY));
		} catch {
			return { ...DEFAULT_OVERVIEW_PREFS };
		}
	});
	const updatePanelPref = (key) => {
		setPanelPrefs((prev) => {
			const next = {
				...prev,
				[key]: !prev[key]
			};
			try {
				window.localStorage.setItem(OVERVIEW_PREFS_KEY, JSON.stringify(next));
			} catch {}
			return next;
		});
	};
	const resetPanelPrefs = () => {
		setPanelPrefs({ ...DEFAULT_OVERVIEW_PREFS });
		try {
			window.localStorage.removeItem(OVERVIEW_PREFS_KEY);
		} catch {}
	};
	const hiddenPanelsCount = PANEL_TOGGLE_ITEMS.filter((p) => !panelPrefs[p.key]).length;
	const host = snapshot?.host;
	const services = snapshot?.services?.items || [];
	const healthySvcs = services.filter((s) => statusTone(s.status) === "ok").length;
	const failedSvcs = services.filter((s) => statusTone(s.status) === "err").length;
	const degradedSvcs = services.filter((s) => statusTone(s.status) === "warn").length;
	const standbySvcs = Math.max(0, services.length - healthySvcs - failedSvcs - degradedSvcs);
	const memEngines = [
		snapshot?.memory?.nmem,
		snapshot?.memory?.openviking,
		snapshot?.memory?.symbiote,
		snapshot?.memory?.rerank
	].filter((m) => m?.enabled);
	const memOk = memEngines.filter((m) => m?.reachable).length;
	const fleetSum = snapshot?.fleet?.summary;
	const tsOnline = snapshot?.network?.tailscale?.onlineCount ?? 0;
	const tsTotal = snapshot?.network?.tailscale?.devices?.length ?? 0;
	const modelsCount = snapshot?.magpie?.totalModels ?? 0;
	const load1 = host?.load1 ?? host?.cpu?.load1 ?? host?.loadAvg?.[0];
	const memPct = host?.memory?.usedPercent ?? host?.memory?.usedPct;
	const uptimeSec = host?.uptimeSeconds ?? host?.uptimeSec;
	const hostMeta = host ? [
		host.hostname,
		host.os || host.platform,
		uptimeSec != null ? `运行 ${formatUptime(uptimeSec)}` : null
	].filter(Boolean).join(" · ") : "等待采集";
	const svcTone = failedSvcs > 0 ? "err" : degradedSvcs > 0 ? "warn" : "ok";
	const svcRatioPct = services.length > 0 ? Math.round(healthySvcs / services.length * 100) : 0;
	const connectors = import_react.useMemo(() => {
		const list = [];
		if (Array.isArray(snapshot?.connectors) && snapshot.connectors.length > 0) for (const c of snapshot.connectors) list.push({
			id: c.id || c.name,
			name: c.name,
			status: c.status,
			latencyMs: c.latencyMs,
			metric: c.summary || c.detail || c.error || "-"
		});
		else {
			if (snapshot?.magpie?.enabled) list.push({
				id: "gateway-magpie",
				name: "Magpie 模型网关",
				status: snapshot.magpie.status || (snapshot.magpie.reachable ? "healthy" : "offline"),
				latencyMs: snapshot.magpie.latencyMs,
				metric: snapshot.magpie.reachable ? `${formatCompactNumber(snapshot.magpie.totalModels ?? 0)} 模型 · ${snapshot.magpie.providers?.length ?? 0} 渠道` : snapshot.magpie.error || "不可达"
			});
			if (snapshot?.memory?.nmem?.enabled) {
				const n = snapshot.memory.nmem;
				list.push({
					id: "memory-nmem",
					name: "Nowledge Mem",
					status: n.status || (n.reachable ? "healthy" : "offline"),
					latencyMs: n.latencyMs,
					metric: n.reachable ? `${formatCompactNumber(n.stats?.memories ?? 0)} 记忆 · ${n.spaces?.length ?? 0} 空间` : n.error || "不可达"
				});
			}
			if (snapshot?.memory?.openviking?.enabled) {
				const ov = snapshot.memory.openviking;
				list.push({
					id: "memory-openviking",
					name: "OpenViking",
					status: ov.status || (ov.reachable ? "healthy" : "offline"),
					latencyMs: ov.latencyMs,
					metric: ov.reachable ? `向量 ${formatCompactNumber(ov.vikingdb?.vectorCount)} · 技能 ${ov.skillsCount ?? 0}` : ov.error || "不可达"
				});
			}
			if (snapshot?.memory?.symbiote?.enabled) {
				const s = snapshot.memory.symbiote;
				list.push({
					id: "memory-symbiote",
					name: "Symbiote",
					status: s.status || (s.reachable ? "healthy" : "offline"),
					latencyMs: s.latencyMs,
					metric: s.reachable ? `Vault ${formatCompactNumber(s.vaultFileCount)} 文档` : s.error || "不可达"
				});
			}
			if (snapshot?.memory?.rerank?.enabled) {
				const r = snapshot.memory.rerank;
				list.push({
					id: "memory-rerank",
					name: "Rerank 重排",
					status: r.status || (r.reachable ? "healthy" : "offline"),
					latencyMs: r.latencyMs,
					metric: r.reachable ? r.model || "Ready" : r.error || "不可达"
				});
			}
			if (snapshot?.network?.tailscale?.enabled) {
				const t = snapshot.network.tailscale;
				list.push({
					id: "network-tailscale",
					name: "Tailscale Mesh",
					status: t.status || (t.reachable ? "healthy" : "offline"),
					latencyMs: t.latencyMs,
					metric: t.reachable ? `${t.onlineCount ?? 0}/${t.devices?.length ?? 0} 设备在线` : t.error || "不可达"
				});
			}
			if (snapshot?.network?.mihomo?.enabled) {
				const m = snapshot.network.mihomo;
				list.push({
					id: "network-mihomo",
					name: "Mihomo 代理",
					status: m.status || (m.reachable ? "healthy" : "offline"),
					latencyMs: m.latencyMs,
					metric: m.reachable ? `${formatCompactNumber(m.activeConnections ?? 0)} 活跃连接` : m.error || "不可达"
				});
			}
			if (snapshot?.network?.syncthing?.enabled) {
				const st = snapshot.network.syncthing;
				list.push({
					id: "service-syncthing",
					name: "Syncthing 同步",
					status: st.status || (st.reachable ? "healthy" : "offline"),
					latencyMs: st.latencyMs,
					metric: st.reachable ? st.folders != null || st.devices != null ? `${st.folders ?? 0} 文件夹 · ${st.devices ?? 0} 设备` : "REST 健康检查通过" : st.error || "不可达"
				});
			}
		}
		const existingKeys = new Set(list.map((x) => x.id || x.name));
		for (const p of snapshot?.plugins || []) {
			if (existingKeys.has(p.id) || existingKeys.has(p.name)) continue;
			list.push({
				id: p.id,
				name: p.name,
				status: p.status || (p.reachable ? "healthy" : "offline"),
				latencyMs: p.latencyMs,
				metric: p.summary || p.protocol || "-"
			});
		}
		return list;
	}, [snapshot]);
	const disks = host?.disks || [];
	const incidents = persistedIncidents.length > 0 ? persistedIncidents : snapshot?.incidents || [];
	const alerts = snapshot?.alerts || [];
	const fleetOnlineNum = fleetSum ? fleetSum.online ?? 0 : tsOnline;
	const fleetTotalNum = fleetSum ? fleetSum.total ?? 0 : tsTotal;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ModuleFrame, {
		title: "系统总览",
		description: "全栈服务健康度、主机负载、记忆引擎与组网连接状态。",
		meta: hostMeta,
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			variant: "secondary",
			size: "sm",
			onClick: () => setCustomizeOpen((v) => !v),
			"data-testid": "overview-customize-btn",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, {
					className: "size-3.5 text-[var(--ink-muted)]",
					strokeWidth: 1.75
				}),
				"自定义面板",
				hiddenPanelsCount > 0 ? ` (${4 - hiddenPanelsCount}/4)` : ""
			]
		}),
		children: [
			customizeOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				"data-testid": "overview-customize-bar",
				className: "rounded-xl bg-[var(--surface-subtle)]/75 px-4 py-3 flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[12px] font-medium text-[var(--ink-muted)] mr-1",
						children: "显示工作台面板"
					}), PANEL_TOGGLE_ITEMS.map((item) => {
						const active = panelPrefs[item.key];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => updatePanelPref(item.key),
							"data-testid": `overview-toggle-${item.key}`,
							className: cn("inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[12px] font-medium border transition-colors duration-150 cursor-pointer select-none", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0", active ? "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)]" : "border-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
								className: cn("size-3", active ? "text-[var(--accent)] opacity-100" : "opacity-20"),
								strokeWidth: 2
							}), item.label]
						}, item.key);
					})]
				}), hiddenPanelsCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: resetPanelPrefs,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
						className: "size-3.5",
						strokeWidth: 1.75
					}), "恢复默认"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiStrip, {
				asymmetric: true,
				cells: [
					{
						label: "受管服务健康度",
						meta: services.length ? `${svcRatioPct}% 可用` : void 0,
						value: services.length ? `${healthySvcs}/${services.length}` : "-",
						numeric: services.length ? {
							primary: healthySvcs,
							denominator: services.length
						} : void 0,
						ratioPct: services.length ? svcRatioPct : void 0,
						sub: failedSvcs > 0 ? `${failedSvcs} 项故障 · ${degradedSvcs} 项降级` : degradedSvcs > 0 ? `${degradedSvcs} 项降级运行` : standbySvcs > 0 ? `${healthySvcs} 项运行中 · ${standbySvcs} 项待机` : "全部受管服务运行平稳",
						tone: svcTone
					},
					{
						label: "主机内存占用",
						value: memPct != null ? `${Math.round(memPct)}%` : "-",
						numeric: memPct != null ? {
							primary: Math.round(memPct),
							suffix: "%"
						} : void 0,
						sub: load1 != null ? `负载 ${Number(load1).toFixed(2)} · ${formatBytes(host?.memory?.usedBytes)} / ${formatBytes(host?.memory?.totalBytes)}` : "CPU 负载与内存占用",
						tone: memPct != null && memPct > 85 ? "warn" : "ok"
					},
					{
						label: "记忆引擎",
						value: memEngines.length ? `${memOk}/${memEngines.length}` : "待启用",
						numeric: memEngines.length ? {
							primary: memOk,
							denominator: memEngines.length
						} : void 0,
						sub: memEngines.length ? `${formatCompactNumber(snapshot?.memory?.nmem?.stats?.memories ?? 0)} 记忆 · ${snapshot?.memory?.openviking?.skillsCount ?? 0} 技能` : "可在「插件与接入」按需开启",
						tone: memEngines.length === 0 ? "muted" : memOk < memEngines.length ? "warn" : "ok"
					},
					{
						label: "全球节点",
						value: `${fleetOnlineNum}/${fleetTotalNum}`,
						numeric: {
							primary: fleetOnlineNum,
							denominator: fleetTotalNum
						},
						sub: `Tailnet ${tsOnline}/${tsTotal} · ${formatCompactNumber(modelsCount)} 模型`
					}
				]
			}),
			panelPrefs.metrics && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "历史指标与聚合趋势",
					description: "直连 SQLite WAL 原始样本与 1m / 5m 聚合表，支持跨尺度回溯资源水位与探针延迟。",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
						heightClass: "h-[248px]",
						label: "正在加载历史趋势图表"
					})
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MetricsChart, {})
			}),
			panelPrefs.graph && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "统一架构与依赖图谱",
				description: "按入口 Agent、模型网关、记忆上下文与网络底座实时映射依赖关系，点击节点高亮上下游并下钻日志。",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
					value: graphFilter,
					onChange: setGraphFilter,
					options: GRAPH_FILTERS,
					ariaLabel: "架构图谱筛选"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
						heightClass: "h-[520px]",
						label: "正在加载架构依赖图谱"
					}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArchitectureGraph, {
						snapshot,
						mode: "full",
						filter: graphFilter,
						onOpenLogs,
						onSelectAgentCategory
					})
				})
			}),
			(panelPrefs.connectors || panelPrefs.storageEvents) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
				children: [panelPrefs.connectors && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: panelPrefs.storageEvents ? "lg:col-span-7" : "lg:col-span-12",
					bodyClassName: "p-0",
					title: "已启用插件与连接器状态",
					description: "通过各组件官方协议（MCP / A2A / OpenAI / REST API / 结构化 CLI）实时采集。",
					actions: onOpenPlugins ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: onOpenPlugins,
						children: "管理插件"
					}) : void 0,
					children: connectors.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						message: "尚未配置已启用的插件或连接器。",
						action: onOpenPlugins ? {
							label: "前往插件目录",
							onClick: onOpenPlugins
						} : void 0
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-left border-collapse",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 pl-5 sm:pl-6 pr-3",
										children: "组件 / 插件"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3",
										children: "状态"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3 text-right",
										children: "延迟"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 pl-3 pr-5 sm:pr-6",
										children: "核心指标"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-[var(--border-subtle)] text-[13.5px]",
								children: connectors.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)] max-w-[180px] truncate",
											title: c.name,
											children: c.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-3 whitespace-nowrap",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: c.status })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-3 text-right font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
											children: c.latencyMs != null ? `${c.latencyMs}ms` : "-"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 pl-3 pr-5 sm:pr-6 font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums max-w-[260px] truncate",
											title: c.metric,
											children: c.metric
										})
									]
								}, c.id || c.name))
							})]
						})
					})
				}), panelPrefs.storageEvents && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: panelPrefs.connectors ? "lg:col-span-5" : "lg:col-span-12",
					title: "主机存储与近期事件",
					description: "挂载点容量使用率、持久化状态变更时间线与近期告警。",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-5",
						children: [
							disks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[13px] text-[var(--ink-subtle)]",
								children: "暂无磁盘挂载点采集数据。"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-3.5",
								children: disks.slice(0, 4).map((d) => {
									const pct = d.usePercent ?? d.usedPct ?? 0;
									const totalBytes = d.sizeBytes ?? d.totalBytes;
									const detail = d.used && d.size ? `${d.used} / ${d.size} (${Math.round(pct)}%)` : d.usedBytes != null && totalBytes != null ? `${formatBytes(d.usedBytes)} / ${formatBytes(totalBytes)} (${Math.round(pct)}%)` : `${Math.round(pct)}%`;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceMeter, {
										label: d.mount,
										value: pct,
										valueText: detail
									}, d.mount);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pt-4 border-t border-[var(--border-subtle)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-[13px] font-semibold tracking-tight text-[var(--ink)] mb-2.5",
									children: "状态变更事件时间线"
								}), incidents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[13px] text-[var(--ink-subtle)]",
									children: "近期无组件状态漂移事件。"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "divide-y divide-[var(--border-subtle)]",
									children: incidents.slice(0, 5).map((inc, idx) => {
										const actor = inc.node || inc.component || inc.target || inc.entityKey || "系统";
										const fromS = inc.fromState || inc.fromStatus || inc.from;
										const toS = inc.toState || inc.toStatus || inc.to;
										const transition = fromS || toS ? `${statusLabel(fromS)} → ${statusLabel(toS)}` : "";
										const detail = inc.detail || inc.message || inc.summary || "";
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-[13px]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0 flex-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex flex-wrap items-baseline gap-1.5 min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-medium text-[var(--ink)] truncate max-w-[180px]",
														title: actor,
														children: actor
													}), transition && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-mono text-[12px] text-[var(--ink-muted)] whitespace-nowrap",
														children: transition
													})]
												}), detail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "mt-0.5 text-[12px] text-[var(--ink-subtle)] truncate",
													title: detail,
													children: detail
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0",
												children: formatDateTime(inc.ts || inc.timestamp)
											})]
										}, inc.id || `${inc.ts}-${idx}`);
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pt-4 border-t border-[var(--border-subtle)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-[13px] font-semibold tracking-tight text-[var(--ink)] mb-2.5",
									children: "最近告警与活跃任务"
								}), alerts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[13px] text-[var(--ink-subtle)]",
									children: "当前无未处理告警。"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "space-y-2.5",
									children: alerts.slice(0, 4).map((al, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "flex items-start justify-between gap-3 text-[13px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
												status: al.severity || al.level || "warn",
												label: al.title || al.component || "告警"
											}), al.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-0.5 text-[12.5px] text-[var(--ink-muted)] line-clamp-2 text-pretty",
												children: al.message
											})]
										}), al.ts && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0",
											children: formatDateTime(al.ts)
										})]
									}, al.id || idx))
								})]
							})
						]
					})
				})]
			})
		]
	});
}
// web/hooks/usePWA.tsx
function registerServiceWorker() {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {});
	});
}
function usePWAInstall() {
	const [deferredPrompt, setDeferredPrompt] = import_react.useState(null);
	const [isInstalled, setIsInstalled] = import_react.useState(false);
	const [isIOS, setIsIOS] = import_react.useState(false);
	import_react.useEffect(() => {
		const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
		setIsInstalled(isStandalone);
		const ua = window.navigator.userAgent.toLowerCase();
		setIsIOS(/iphone|ipad|ipod/.test(ua));
		const onBeforeInstall = (e) => {
			e.preventDefault();
			setDeferredPrompt(e);
		};
		const onInstalled = () => {
			setIsInstalled(true);
			setDeferredPrompt(null);
		};
		window.addEventListener("beforeinstallprompt", onBeforeInstall);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstall);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);
	const install = async () => {
		if (!deferredPrompt) return false;
		await deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === "accepted") {
			setIsInstalled(true);
			setDeferredPrompt(null);
			return true;
		}
		return false;
	};
	return {
		isInstallable: Boolean(deferredPrompt),
		isInstalled,
		isIOS,
		install
	};
}
function useOnlineStatus() {
	const [isOnline, setIsOnline] = import_react.useState(typeof navigator !== "undefined" ? navigator.onLine : true);
	import_react.useEffect(() => {
		const onOnline = () => setIsOnline(true);
		const onOffline = () => setIsOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, []);
	return isOnline;
}
function PWAInstallButton() {
	const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
	const [showIOSGuide, setShowIOSGuide] = import_react.useState(false);
	if (isInstalled) return null;
	if (isInstallable) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		variant: "secondary",
		size: "sm",
		onClick: () => void install(),
		className: "w-full justify-center mt-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
			className: "size-3.5 text-[var(--accent)]",
			strokeWidth: 1.75
		}), "安装桌面 / 移动值班台"]
	});
	if (isIOS) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		variant: "secondary",
		size: "sm",
		onClick: () => setShowIOSGuide(true),
		className: "w-full justify-center mt-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
			className: "size-3.5 text-[var(--accent)]",
			strokeWidth: 1.75
		}), "添加到主屏幕 (iOS)"]
	}), showIOSGuide && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-modal)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-[15px] font-semibold tracking-tight text-[var(--ink)] text-balance",
						children: "安装到 iPhone / iPad 主屏幕"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setShowIOSGuide(false),
						"aria-label": "关闭安装指引",
						className: "h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
							className: "size-4",
							strokeWidth: 1.75
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "mt-3 space-y-2 text-[13px] text-[var(--ink-muted)] leading-relaxed list-decimal pl-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "点击 Safari 底部工具栏的「分享」图标。" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "向下滑动并选择「添加到主屏幕」。" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "点击右上角「添加」，即可独立全屏运行 Ops Console。" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						size: "md",
						onClick: () => setShowIOSGuide(false),
						children: "知道了"
					})
				})
			]
		})
	})] });
	return null;
}
function OfflineIndicator() {
	if (useOnlineStatus()) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "status",
		className: "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-[var(--warn)]/35 bg-[var(--surface-elevated)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--warn)] shadow-[var(--shadow-modal)] select-none",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WifiOff, {
			className: "size-4 shrink-0",
			strokeWidth: 1.75
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "离线模式 · 正在展示缓存的界面外壳" })]
	});
}
// web/modules/registry.ts
var MODULE_DOMAINS = [
	{
		id: "agent",
		title: "Harness",
		description: "极简 Agent 入口、Linear 任务看板、n8n 分配图谱、Bot、GitHub 与设置",
		primary: true
	},
	{
		id: "observe",
		title: "监控与节点",
		description: "全栈态势、告警事件与全球节点"
	},
	{
		id: "infra",
		title: "基础设施",
		description: "受管服务、插件接入、全节点 MCP、记忆引擎与网络"
	},
	{
		id: "operate",
		title: "运维",
		description: "结构化日志追踪、定时任务、Runbook 与审计"
	}
];
var loadAlertsView = () => __vitePreload(() => import("./AlertsView-CUqQT4RG.js"), __vite__mapDeps([7,1,2,4,3,5]));
var loadFleetView = () => __vitePreload(() => import("./FleetView-rxinj4LL.js"), __vite__mapDeps([8,1,2,4,3,5]));
var loadServicesView = () => __vitePreload(() => import("./ServicesView-DAVz6-aw.js"), __vite__mapDeps([9,1,2,4,3,5]));
var loadPluginsView = () => __vitePreload(() => import("./PluginsView-DjLdrkoi.js"), __vite__mapDeps([10,1,2,4,3,5]));
var loadMcpView = () => __vitePreload(() => import("./McpView-BmtPmIMP.js"), __vite__mapDeps([11,1,2,4,3,5]));
var loadMemoryView = () => __vitePreload(() => import("./MemoryView-B-XK6t8x.js"), __vite__mapDeps([12,1,2,4,3,5]));
var loadAgentsView = () => __vitePreload(() => import("./AgentsView-Dp-8Z_bq.js"), __vite__mapDeps([13,1,2,4,3,5,14,15]));
var loadProjectsView = () => __vitePreload(() => import("./ProjectsView-C3l76A5f.js"), __vite__mapDeps([16,1,2,4,3,5,15,14]));
var loadAgentGraphView = () => __vitePreload(() => import("./AgentGraphView-A92nb9b5.js"), __vite__mapDeps([17,1,2,4,3,5,14,15]));
var loadBotsView = () => __vitePreload(() => import("./BotsView-CQcC6AL-.js"), __vite__mapDeps([18,1,2,4,3,5]));
var loadGithubView = () => __vitePreload(() => import("./GithubView-BzoexH7-.js"), __vite__mapDeps([19,1,2,4,3,5,15]));
var loadAgentSettingsView = () => __vitePreload(() => import("./AgentSettingsView-gx90vsTv.js").then((n) => n.t), __vite__mapDeps([20,1,2,4,3,5]));
var loadNetworkView = () => __vitePreload(() => import("./NetworkView-Br3mE_l3.js"), __vite__mapDeps([21,1,2,4,3,5]));
var loadLogsView = () => __vitePreload(() => import("./LogsView-C88UZipJ.js"), __vite__mapDeps([22,1,2,4,3,5]));
var loadOpsView = () => __vitePreload(() => import("./OpsView-BkW4P3bO.js"), __vite__mapDeps([23,1,2,4,3,5]));
var CONSOLE_MODULES = [
	{
		id: "agents",
		domain: "agent",
		label: "Agent",
		shortDesc: "极简 Agent 对话与执行入口：居中输入框搭配模型/Harness 选择，即刻下发任务",
		chord: "g",
		keywords: [
			"agent",
			"agents",
			"harness",
			"codex",
			"claude",
			"pi",
			"antigravity",
			"对话",
			"执行",
			"调度"
		],
		icon: MessageSquare,
		dataDeps: ["snapshot"],
		eager: true,
		prefetch: loadAgentsView,
		benchmarks: {
			references: [
				"Codex App",
				"Antigravity",
				"Claude Code"
			],
			migratedCapabilities: ["极简居中输入框与行内模型/Harness 选择", "左侧栏可折叠历史任务线程"]
		}
	},
	{
		id: "projects",
		domain: "agent",
		label: "任务看板",
		shortDesc: "Linear 原生风格任务列表与看板：清爽状态分组、行内详情抽屉与总指挥拆解",
		chord: "j",
		keywords: [
			"tasks",
			"board",
			"linear",
			"projects",
			"issues",
			"kanban",
			"任务",
			"看板",
			"项目"
		],
		icon: SquareKanban,
		dataDeps: ["snapshot"],
		prefetch: loadProjectsView,
		benchmarks: {
			references: ["Linear"],
			migratedCapabilities: ["Linear 分组列表与极简 4 列看板", "右侧任务详情抽屉与一键总指挥拆解"]
		}
	},
	{
		id: "graph",
		domain: "agent",
		label: "分配图谱",
		shortDesc: "n8n 风格节点工作流画布：直观查看总指挥、任务拆解与执行 Agent 连接链路",
		chord: "d",
		keywords: [
			"graph",
			"n8n",
			"workflow",
			"dag",
			"map",
			"图谱",
			"工作流",
			"依赖",
			"分配"
		],
		icon: GitFork,
		dataDeps: ["snapshot"],
		prefetch: loadAgentGraphView,
		benchmarks: {
			references: ["n8n", "React Flow"],
			migratedCapabilities: ["全画布点阵工作流视图与端口连线", "点击节点浮出参数检查面板"]
		}
	},
	{
		id: "bots",
		domain: "agent",
		label: "Bot",
		shortDesc: "创建与管理飞书、Telegram、Discord、Slack 等多渠道自动化 Bot",
		chord: "b",
		keywords: [
			"bots",
			"bot",
			"feishu",
			"telegram",
			"discord",
			"slack",
			"webhook",
			"机器人"
		],
		icon: Bot,
		dataDeps: ["snapshot"],
		prefetch: loadBotsView,
		benchmarks: {
			references: ["Linear Agents & Bots", "Slack Apps"],
			migratedCapabilities: ["独立多渠道 Bot 编排与事件模拟触发"]
		}
	},
	{
		id: "github",
		domain: "agent",
		label: "GitHub",
		shortDesc: "配置 GitHub 仓库双向同步，追踪 Agent 自动创建的 Worktree 分支与 Pull Request",
		chord: "h",
		keywords: [
			"github",
			"git",
			"pr",
			"pull request",
			"repo",
			"sync",
			"仓库",
			"同步"
		],
		icon: GitBranch,
		dataDeps: ["snapshot"],
		prefetch: loadGithubView,
		benchmarks: {
			references: ["GitHub Projects", "Linear GitHub Sync"],
			migratedCapabilities: ["独立 GitHub 仓库配置、双向同步与 PR 交付追踪"]
		}
	},
	{
		id: "agent-settings",
		domain: "agent",
		label: "设置",
		shortDesc: "Harness 高级设置：总指挥分工、迭代路线图、A2A 路由、集群拓扑、蜂群引擎、安全护栏与网关",
		chord: "e",
		keywords: [
			"settings",
			"config",
			"a2a",
			"swarm",
			"governance",
			"gateway",
			"设置",
			"分工",
			"高级",
			"护栏"
		],
		icon: SlidersHorizontal,
		dataDeps: ["snapshot"],
		prefetch: loadAgentSettingsView,
		benchmarks: {
			references: ["Codex Settings", "Google A2A Protocol"],
			migratedCapabilities: ["高阶编排、蜂群与网关遥测统一收口于设置页"]
		}
	},
	{
		id: "overview",
		domain: "observe",
		label: "系统总览",
		shortDesc: "全栈服务健康度、主机负载、聚合趋势与依赖拓扑",
		chord: "o",
		keywords: [
			"overview",
			"dashboard",
			"总览",
			"架构",
			"拓扑",
			"主界面"
		],
		icon: LayoutGrid,
		dataDeps: ["snapshot"],
		eager: true,
		benchmarks: {
			references: [
				"Grafana",
				"Datadog",
				"Netdata"
			],
			migratedCapabilities: [
				"非对称 KPI 比例条",
				"跨尺度 SQLite WAL 趋势图",
				"上下游依赖拓扑下钻",
				"持久化工作台面板自定义"
			]
		}
	},
	{
		id: "alerts",
		domain: "observe",
		label: "告警与事件",
		shortDesc: "多档静默倒计时、批量 Ack、规则搜索过滤、30 天 SLA 与复盘",
		chord: "a",
		keywords: [
			"alerts",
			"sla",
			"incident",
			"postmortem",
			"告警",
			"事件",
			"复盘",
			"规则"
		],
		icon: Bell,
		dataDeps: ["snapshot", "ops"],
		badgeKey: "alerts",
		prefetch: loadAlertsView,
		benchmarks: {
			references: [
				"PagerDuty",
				"Alertmanager",
				"Sentry"
			],
			migratedCapabilities: [
				"多档维护静默与实时倒计时条",
				"告警队列筛选与批量确认",
				"声明式规则搜索与状态快筛"
			]
		}
	},
	{
		id: "fleet",
		domain: "observe",
		label: "全球节点",
		shortDesc: "世界地图拓扑、多维排序对比矩阵、RTT 延迟条与远程指令队列",
		chord: "f",
		keywords: [
			"fleet",
			"map",
			"probe",
			"节点",
			"地图",
			"探针",
			"手机"
		],
		icon: Globe,
		dataDeps: ["snapshot", "probes"],
		prefetch: loadFleetView,
		benchmarks: {
			references: [
				"Tailscale Admin",
				"Teleport",
				"Uptime Kuma"
			],
			migratedCapabilities: [
				"多节点状态/CPU/内存/RTT 排序对比矩阵",
				"行内延迟可视化色条与 IP 快复制",
				"一次性令牌注册与 Pull-only 指令队列"
			]
		}
	},
	{
		id: "services",
		domain: "infra",
		label: "受管服务",
		shortDesc: "systemd 单元排序、行内快捷控制、延迟分级与依赖展开",
		chord: "s",
		keywords: [
			"services",
			"systemd",
			"service",
			"服务",
			"重启",
			"进程"
		],
		icon: Layers,
		dataDeps: ["snapshot"],
		badgeKey: "failedServices",
		prefetch: loadServicesView,
		benchmarks: {
			references: [
				"Cockpit",
				"Portainer",
				"Supervisor"
			],
			migratedCapabilities: [
				"按异常/延迟/内存列头排序",
				"行内高频重启直达",
				"可展开单元依赖与探针详情"
			]
		}
	},
	{
		id: "plugins",
		domain: "infra",
		label: "插件与接入",
		shortDesc: "MCP / A2A / OpenAI 协议目录、批量巡检、脱敏清单导出与启停",
		chord: "p",
		keywords: [
			"plugins",
			"mcp",
			"a2a",
			"agent",
			"openai",
			"ollama",
			"connector",
			"插件",
			"接入",
			"协议"
		],
		icon: Blocks,
		dataDeps: ["snapshot"],
		prefetch: loadPluginsView,
		benchmarks: {
			references: [
				"Grafana Plugins",
				"Backstage",
				"Raycast"
			],
			migratedCapabilities: [
				"全量已启用插件并发批量巡检",
				"脱敏 JSON 配置清单导出",
				"状态/协议双维过滤与热启停"
			]
		}
	},
	{
		id: "mcp",
		domain: "infra",
		label: "全节点 MCP",
		shortDesc: "跨 VPS、开发机与主节点的 MCP 统一纳管、协议握手拨测与一键同步下发",
		chord: "c",
		keywords: [
			"mcp",
			"tools",
			"stdio",
			"streamable-http",
			"sse",
			"全节点",
			"工具"
		],
		icon: Plug,
		dataDeps: ["snapshot"],
		prefetch: loadMcpView,
		benchmarks: {
			references: [
				"MCP Inspector",
				"Smithery",
				"Docker MCP Toolkit"
			],
			migratedCapabilities: [
				"按设备节点分面管理全部 MCP",
				"Streamable HTTP / SSE / stdio 协议握手拨测",
				"跨设备一键同步与 Pull-only 下发"
			]
		}
	},
	{
		id: "memory",
		domain: "infra",
		label: "记忆引擎",
		shortDesc: "跨引擎联合语义检索、Rerank 对比实验室与评测导出",
		chord: "m",
		keywords: [
			"memory",
			"nmem",
			"openviking",
			"symbiote",
			"rerank",
			"记忆",
			"检索"
		],
		icon: Database,
		dataDeps: ["snapshot"],
		prefetch: loadMemoryView,
		benchmarks: {
			references: [
				"Qdrant Dashboard",
				"Milvus Attu",
				"LangSmith Eval"
			],
			migratedCapabilities: [
				"跨引擎 Rerank 增益对照表",
				"快捷评测 Query 预设",
				"评测结果 JSON 一键导出"
			]
		}
	},
	{
		id: "network",
		domain: "infra",
		label: "网络与防火墙",
		shortDesc: "Tailscale 设备搜索与 IP 快复制、Mihomo 代理与端口暴露面收敛",
		chord: "n",
		keywords: [
			"network",
			"tailscale",
			"mihomo",
			"syncthing",
			"ssh",
			"网络",
			"防火墙"
		],
		icon: Network,
		dataDeps: ["snapshot"],
		prefetch: loadNetworkView,
		benchmarks: {
			references: [
				"Tailscale Admin",
				"Metacubexd",
				"OPNsense"
			],
			migratedCapabilities: [
				"点击 IP 一键复制",
				"DERP 中继/在线状态筛选",
				"防火墙非回环端口暴露面快筛"
			]
		}
	},
	{
		id: "logs",
		domain: "operate",
		label: "统一日志",
		shortDesc: "日志频次直方图、点击单元快筛、虚拟滚动与 SSE 实时追踪",
		chord: "l",
		keywords: [
			"logs",
			"journald",
			"tail",
			"stream",
			"日志",
			"实时流"
		],
		icon: Terminal,
		dataDeps: ["snapshot"],
		prefetch: loadLogsView,
		benchmarks: {
			references: [
				"Grafana Loki",
				"Datadog Logs",
				"Dozzle"
			],
			migratedCapabilities: [
				"时间桶级别频次直方图",
				"单元/级别 Facet 点击过滤",
				"单行一键复制与虚拟滚动"
			]
		}
	},
	{
		id: "ops",
		domain: "operate",
		label: "运维与审计",
		shortDesc: "定时任务、Runbook 历史回溯、配置校验与多维审计 CSV 导出",
		chord: "w",
		keywords: [
			"ops",
			"timers",
			"backup",
			"audit",
			"incidents",
			"运维",
			"备份",
			"审计"
		],
		icon: Wrench,
		dataDeps: ["snapshot", "ops"],
		prefetch: loadOpsView,
		benchmarks: {
			references: [
				"Rundeck",
				"Ansible AWX",
				"Cockpit"
			],
			migratedCapabilities: [
				"审计日志关键词/结果多维过滤与 CSV 导出",
				"Runbook 历史执行逐步回溯",
				"Config Studio 语法校验"
			]
		}
	}
];
var MODULE_MAP = new Map(CONSOLE_MODULES.map((m) => [m.id, m]));
var CHORD_MAP = new Map(CONSOLE_MODULES.map((m) => [m.chord.toLowerCase(), m.id]));
function isValidViewId(raw) {
	return MODULE_MAP.has(raw);
}
function getModuleById(id) {
	return MODULE_MAP.get(id) || CONSOLE_MODULES[0];
}
function getModuleByChord(key) {
	return CHORD_MAP.get(String(key || "").toLowerCase()) || null;
}
function getModulesGroupedByDomain() {
	return MODULE_DOMAINS.map((domain) => ({
		domain,
		modules: CONSOLE_MODULES.filter((m) => m.domain === domain.id)
	}));
}
function prefetchModule(id) {
	const mod = MODULE_MAP.get(id);
	if (mod?.prefetch) mod.prefetch();
}
function parseViewFromHash(hash) {
	const cleaned = String(hash || "").replace(/^#\/?/, "").split(/[?&/]/)[0].trim().toLowerCase();
	if (cleaned === "tasks") return "projects";
	return isValidViewId(cleaned) ? cleaned : null;
}
// web/modules/ModuleBoundary.tsx
/**
* Per-module fault isolation boundary so a runtime error in one domain module
* never crashes the entire control plane shell.
*/
var ModuleBoundary = class extends import_react.Component {
	state = {
		hasError: false,
		errorMessage: ""
	};
	static getDerivedStateFromError(error) {
		return {
			hasError: true,
			errorMessage: error?.message || "模块渲染发生未预期错误"
		};
	}
	componentDidUpdate(prevProps) {
		if (prevProps.moduleId !== this.props.moduleId && this.state.hasError) this.setState({
			hasError: false,
			errorMessage: ""
		});
	}
	handleReset = () => {
		this.setState({
			hasError: false,
			errorMessage: ""
		});
	};
	render() {
		if (this.state.hasError) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: `${this.props.moduleLabel} · 模块异常隔离`,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
				title: `板块「${this.props.moduleLabel}」渲染异常`,
				message: this.state.errorMessage,
				onRetry: this.handleReset
			})
		});
		return this.props.children;
	}
};
// web/App.tsx
var AlertsView = import_react.lazy(() => loadAlertsView().then((m) => ({ default: m.AlertsView })));
var FleetView = import_react.lazy(() => loadFleetView().then((m) => ({ default: m.FleetView })));
var ServicesView = import_react.lazy(() => loadServicesView().then((m) => ({ default: m.ServicesView })));
var PluginsView = import_react.lazy(() => loadPluginsView().then((m) => ({ default: m.PluginsView })));
var McpView = import_react.lazy(() => loadMcpView().then((m) => ({ default: m.McpView })));
var MemoryView = import_react.lazy(() => loadMemoryView().then((m) => ({ default: m.MemoryView })));
var AgentsView = import_react.lazy(() => loadAgentsView().then((m) => ({ default: m.AgentsView })));
var ProjectsView = import_react.lazy(() => loadProjectsView().then((m) => ({ default: m.ProjectsView })));
var AgentGraphView = import_react.lazy(() => loadAgentGraphView().then((m) => ({ default: m.AgentGraphView })));
var BotsView = import_react.lazy(() => loadBotsView().then((m) => ({ default: m.BotsView })));
var GithubView = import_react.lazy(() => loadGithubView().then((m) => ({ default: m.GithubView })));
var AgentSettingsView = import_react.lazy(() => loadAgentSettingsView().then((m) => ({ default: m.AgentSettingsView })));
var NetworkView = import_react.lazy(() => loadNetworkView().then((m) => ({ default: m.NetworkView })));
var LogsView = import_react.lazy(() => loadLogsView().then((m) => ({ default: m.LogsView })));
var OpsView = import_react.lazy(() => loadOpsView().then((m) => ({ default: m.OpsView })));
var DOMAIN_TITLE_MAP = new Map(MODULE_DOMAINS.map((d) => [d.id, d.title]));
var GROUPED_MODULES = getModulesGroupedByDomain();
var THEME_STORAGE_KEY = "ops-console-theme";
var SIDEBAR_STORAGE_KEY = "ops-console-sidebar-collapsed";
function readInitialSidebarCollapsed() {
	try {
		return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}
function readInitialTheme() {
	try {
		const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
		if (saved === "dark" || saved === "light") return saved;
	} catch {}
	return "dark";
}
function applyTheme(theme) {
	const root = document.documentElement;
	if (theme === "dark") {
		root.classList.add("dark");
		root.setAttribute("data-theme", "dark");
	} else {
		root.classList.remove("dark");
		root.removeAttribute("data-theme");
	}
	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {}
}
function App() {
	const [view, setView] = import_react.useState(() => parseViewFromHash(window.location.hash) || "agents");
	const [sidebarCollapsed, setSidebarCollapsed] = import_react.useState(() => readInitialSidebarCollapsed());
	const [harnessNavExpanded, setHarnessNavExpanded] = import_react.useState(true);
	const [opsNavExpanded, setOpsNavExpanded] = import_react.useState(() => {
		return getModuleById(parseViewFromHash(window.location.hash) || "agents").domain !== "agent";
	});
	const [theme, setTheme] = import_react.useState(() => readInitialTheme());
	const [mobileNavOpen, setMobileNavOpen] = import_react.useState(false);
	const [commandOpen, setCommandOpen] = import_react.useState(false);
	const [meta, setMeta] = import_react.useState(null);
	const [snapshot, setSnapshot] = import_react.useState(null);
	const [probes, setProbes] = import_react.useState(null);
	const [incidents, setIncidents] = import_react.useState([]);
	const [audit, setAudit] = import_react.useState([]);
	const [recentAgentTasks, setRecentAgentTasks] = import_react.useState([]);
	const [activeAgentTaskId, setActiveAgentTaskId] = import_react.useState(null);
	const [pollMs, setPollMs] = import_react.useState(1e4);
	const [loading, setLoading] = import_react.useState(true);
	const [refreshing, setRefreshing] = import_react.useState(false);
	const [syncError, setSyncError] = import_react.useState("");
	const [lastSyncedAt, setLastSyncedAt] = import_react.useState("");
	const [logsInitialUnit, setLogsInitialUnit] = import_react.useState("");
	const [logsInitialLevel, setLogsInitialLevel] = import_react.useState("all");
	const [logsRequestNonce, setLogsRequestNonce] = import_react.useState(0);
	const [recentServiceUnits, setRecentServiceUnits] = import_react.useState([]);
	const [agentCategory, setAgentCategory] = import_react.useState("");
	const [agentPid, setAgentPid] = import_react.useState(null);
	const [mcpInitialNode, setMcpInitialNode] = import_react.useState("");
	const [confirmState, setConfirmState] = import_react.useState(null);
	const pushToast = import_react.useCallback((text, tone = "info") => {
		if (tone === "ok") toast.success(text);
		else if (tone === "err") toast.error(text);
		else toast(text);
	}, []);
	import_react.useEffect(() => {
		applyTheme(theme);
	}, [theme]);
	const toggleTheme = import_react.useCallback(() => {
		setTheme((prev) => prev === "dark" ? "light" : "dark");
	}, []);
	const loadSnapshot = import_react.useCallback(async (force = false) => {
		setRefreshing(true);
		try {
			const data = await fetchSnapshot(force);
			setSnapshot(data);
			setSyncError("");
			setLastSyncedAt(data.generatedAt || data.ts || (/* @__PURE__ */ new Date()).toISOString());
		} catch (err) {
			const msg = err.message || "数据采集失败";
			setSyncError(msg);
			if (force) pushToast(`同步失败：${msg}`, "err");
		} finally {
			setRefreshing(false);
			setLoading(false);
		}
	}, [pushToast]);
	const loadProbes = import_react.useCallback(async () => {
		try {
			const res = await fetchProbes();
			setProbes(res);
		} catch {}
	}, []);
	import_react.useEffect(() => {
		try {
			window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
		} catch {}
	}, [sidebarCollapsed]);
	const loadRecentAgentTasks = import_react.useCallback(async () => {
		try {
			const res = await fetchA2AState();
			setRecentAgentTasks((res.tasks || []).slice(0, 6));
		} catch {}
	}, []);
	const loadOpsData = import_react.useCallback(async () => {
		try {
			const [incRes, audRes] = await Promise.all([fetchIncidents(30), fetchAudit(40)]);
			setIncidents(incRes.items || incRes.incidents || []);
			setAudit(audRes.items || audRes.entries || []);
		} catch {}
	}, []);
	import_react.useEffect(() => {
		const controller = new AbortController();
		let active = true;
		const metaTask = fetchMeta(controller.signal).then((m) => {
			if (!active) return;
			setMeta(m);
			if (m.appName) document.title = m.appName;
		}).catch(() => {});
		Promise.all([
			metaTask,
			loadSnapshot(false),
			loadRecentAgentTasks()
		]);
		return () => {
			active = false;
			controller.abort();
		};
	}, [loadSnapshot, loadRecentAgentTasks]);
	import_react.useEffect(() => {
		const mod = getModuleById(view);
		if (mod.dataDeps.includes("probes")) loadProbes();
		if (mod.dataDeps.includes("ops")) loadOpsData();
	}, [
		view,
		loadProbes,
		loadOpsData
	]);
	import_react.useEffect(() => {
		const nextHash = `#${view}`;
		if (window.location.hash !== nextHash) window.history.replaceState(null, "", nextHash);
	}, [view]);
	import_react.useEffect(() => {
		const onHashChange = () => {
			const parsed = parseViewFromHash(window.location.hash);
			if (parsed) setView(parsed);
		};
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);
	const viewRef = import_react.useRef(view);
	viewRef.current = view;
	import_react.useEffect(() => {
		if (typeof EventSource === "undefined") return;
		let timer = null;
		const scheduleDeltaSync = () => {
			if (timer != null) return;
			timer = window.setTimeout(() => {
				timer = null;
				if (document.visibilityState === "visible") {
					loadSnapshot(false);
					loadRecentAgentTasks();
					const activeMod = getModuleById(viewRef.current);
					if (activeMod.dataDeps.includes("ops")) loadOpsData();
					if (activeMod.dataDeps.includes("probes")) loadProbes();
				}
			}, 600);
		};
		const es = new EventSource("/api/events/stream");
		for (const type of [
			"probe_heartbeat",
			"alert_fired",
			"alert_acked",
			"alert_rule_created",
			"alert_rule_updated",
			"alert_rule_deleted",
			"alert_silence_updated",
			"service_action",
			"timer_action",
			"incident_updated",
			"probe_command",
			"runbook_step",
			"ops_health",
			"ops_backup",
			"plugins_updated",
			"mcps_updated",
			"a2a_updated"
		]) es.addEventListener(type, scheduleDeltaSync);
		return () => {
			if (timer != null) window.clearTimeout(timer);
			es.close();
		};
	}, [
		loadSnapshot,
		loadOpsData,
		loadProbes,
		loadRecentAgentTasks
	]);
	import_react.useEffect(() => {
		if (!pollMs || pollMs <= 0) return;
		const timer = window.setInterval(() => {
			if (document.visibilityState === "visible") loadSnapshot(false);
		}, pollMs);
		return () => window.clearInterval(timer);
	}, [pollMs, loadSnapshot]);
	import_react.useEffect(() => {
		let chordArmed = false;
		let chordTimer = null;
		const clearChord = () => {
			chordArmed = false;
			if (chordTimer != null) {
				window.clearTimeout(chordTimer);
				chordTimer = null;
			}
		};
		const isEditableTarget = (target) => {
			if (!(target instanceof HTMLElement)) return false;
			const tag = target.tagName;
			return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
		};
		const onKeyDown = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				clearChord();
				setCommandOpen((prev) => !prev);
				return;
			}
			if (e.metaKey || e.ctrlKey || e.altKey || commandOpen || confirmState?.open) {
				clearChord();
				return;
			}
			if (isEditableTarget(e.target)) return;
			const key = e.key.toLowerCase();
			if (chordArmed) {
				const targetView = getModuleByChord(key);
				clearChord();
				if (targetView) {
					e.preventDefault();
					setView(targetView);
					setMobileNavOpen(false);
					window.scrollTo({ top: 0 });
				}
				return;
			}
			if (key === "g") {
				chordArmed = true;
				chordTimer = window.setTimeout(clearChord, 900);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => {
			clearChord();
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [commandOpen, confirmState?.open]);
	const handleOpenLogs = import_react.useCallback((unit, level = "all") => {
		setLogsInitialUnit(unit);
		setLogsInitialLevel(level);
		setLogsRequestNonce((n) => n + 1);
		if (unit) setRecentServiceUnits((prev) => [unit, ...prev.filter((u) => u !== unit)].slice(0, 5));
		setView("logs");
		setMobileNavOpen(false);
	}, []);
	const handleSelectAgentCategory = import_react.useCallback((category) => {
		setAgentPid(null);
		setAgentCategory(category);
		setView("agent-settings");
		setMobileNavOpen(false);
	}, []);
	const handleSelectAgentPid = import_react.useCallback((pid) => {
		setAgentCategory("");
		setAgentPid(pid);
		setView("agent-settings");
		setMobileNavOpen(false);
	}, []);
	const handleLogout = async () => {
		try {
			await logoutSession();
			window.location.reload();
		} catch (err) {
			pushToast(`退出失败：${err.message}`, "err");
		}
	};
	const handleSelectView = (next) => {
		setView(next);
		if (next === "agents") {
			setActiveAgentTaskId(null);
			setHarnessNavExpanded(true);
		} else if (getModuleById(next).domain === "agent") setHarnessNavExpanded(true);
		else setOpsNavExpanded(true);
		setMobileNavOpen(false);
		window.scrollTo({ top: 0 });
	};
	const handleOpenAgentThread = (taskId) => {
		setActiveAgentTaskId(taskId);
		setView("agents");
		setHarnessNavExpanded(true);
		setMobileNavOpen(false);
		window.scrollTo({ top: 0 });
	};
	const commandEntries = import_react.useMemo(() => {
		const list = [];
		for (const mod of CONSOLE_MODULES) list.push({
			id: `nav:${mod.id}`,
			label: mod.label,
			group: "视图导航",
			keywords: [...mod.keywords, `g ${mod.chord}`],
			meta: DOMAIN_TITLE_MAP.get(mod.domain) || mod.domain,
			shortcut: `G ${mod.chord.toUpperCase()}`,
			onSelect: () => handleSelectView(mod.id)
		});
		const services = snapshot?.services?.items || [];
		const recentServices = (() => {
			const byUnit = new Map(services.map((s) => [s.unit || s.id, s]));
			const ordered = recentServiceUnits.map((u) => byUnit.get(u)).filter((s) => Boolean(s));
			for (const s of services) {
				if (ordered.length >= 4) break;
				if (!ordered.some((o) => o.id === s.id)) ordered.push(s);
			}
			return ordered;
		})();
		for (const svc of recentServices) {
			const unit = svc.unit || svc.id;
			const name = svc.name || svc.id;
			list.push({
				id: `log-err:${svc.id}`,
				label: `${name} · Error 日志`,
				group: "日志级别快筛",
				keywords: [
					"error",
					"err",
					"错误",
					"故障",
					"异常",
					"log",
					"logs",
					"日志",
					svc.id,
					unit,
					name
				],
				meta: unit,
				shortcut: "ERROR",
				onSelect: () => handleOpenLogs(unit, "error")
			}, {
				id: `log-warn:${svc.id}`,
				label: `${name} · Warn 日志`,
				group: "日志级别快筛",
				keywords: [
					"warn",
					"warning",
					"警告",
					"告警",
					"降级",
					"log",
					"logs",
					"日志",
					svc.id,
					unit,
					name
				],
				meta: unit,
				shortcut: "WARN",
				onSelect: () => handleOpenLogs(unit, "warn")
			});
		}
		const agentProcesses = snapshot?.agents?.processes || [];
		for (const proc of agentProcesses) {
			const cat = proc.categoryLabel || proc.category || "Agent";
			const cmdText = proc.cmd || proc.command || proc.comm || "";
			list.push({
				id: `agent-pid:${proc.pid}`,
				label: `PID ${proc.pid} · ${cat}`,
				group: "Agent 运行时进程",
				keywords: [
					String(proc.pid),
					`pid ${proc.pid}`,
					`pid:${proc.pid}`,
					"pid",
					"agent",
					"process",
					"进程",
					cat,
					proc.comm || "",
					cmdText
				],
				meta: cmdText,
				shortcut: proc.cpu != null ? `CPU ${Number(proc.cpu).toFixed(1)}%` : void 0,
				onSelect: () => handleSelectAgentPid(proc.pid)
			});
		}
		list.push({
			id: "action:refresh",
			label: "立即刷新全栈快照",
			group: "快捷操作",
			keywords: [
				"refresh",
				"reload",
				"sync",
				"刷新",
				"同步"
			],
			shortcut: "Sync",
			onSelect: () => {
				loadSnapshot(true);
				loadProbes();
				loadOpsData();
			}
		}, {
			id: "action:theme",
			label: theme === "dark" ? "切换为浅色主题" : "切换为深色主题",
			group: "快捷操作",
			keywords: [
				"theme",
				"dark",
				"light",
				"主题",
				"暗色",
				"亮色"
			],
			onSelect: () => toggleTheme()
		});
		for (const svc of services.slice(0, 12)) list.push({
			id: `svc:${svc.id}`,
			label: `${svc.name || svc.id} 日志`,
			group: "受管服务",
			keywords: [
				svc.id,
				svc.unit || "",
				svc.layer || "",
				statusLabel(svc.status)
			],
			meta: svc.unit || svc.id,
			onSelect: () => handleOpenLogs(svc.unit || svc.id, "all")
		});
		const fleetNodes = snapshot?.fleet?.nodes || [];
		for (const node of fleetNodes.slice(0, 10)) {
			const nodeIp = node.tailscaleIp || "";
			list.push({
				id: `node:${node.id}`,
				label: node.name || node.id,
				group: "全球节点",
				keywords: [
					node.id,
					node.region || "",
					nodeIp,
					node.deviceType || ""
				],
				meta: node.region || nodeIp,
				onSelect: () => handleSelectView("fleet")
			});
		}
		return list;
	}, [
		snapshot,
		theme,
		recentServiceUnits,
		loadSnapshot,
		loadProbes,
		loadOpsData,
		toggleTheme,
		handleOpenLogs,
		handleSelectAgentPid
	]);
	const readOnly = Boolean(meta?.readOnly);
	const demoMode = Boolean(meta?.demo);
	const brandTitle = meta?.appName || "Ops Console";
	const activeModule = getModuleById(view);
	const activeDomainTitle = DOMAIN_TITLE_MAP.get(activeModule.domain) || activeModule.domain;
	const failedSvcCount = import_react.useMemo(() => {
		return (snapshot?.services?.items || []).filter((s) => s.status === "failed" || s.status === "error" || s.status === "down").length;
	}, [snapshot]);
	const activeAlertsCount = snapshot?.activeAlertsCount ?? 0;
	const agentGroup = GROUPED_MODULES.find((g) => g.domain.id === "agent");
	const secondaryModules = import_react.useMemo(() => CONSOLE_MODULES.filter((m) => m.domain !== "agent"), []);
	const secondaryAlertBadge = failedSvcCount + activeAlertsCount;
	const isHarnessView = activeModule.domain === "agent";
	const renderNavItem = (mod) => {
		const Icon = mod.icon;
		const isAgentHome = mod.id === "agents";
		const isActive = isAgentHome ? view === "agents" && !activeAgentTaskId : view === mod.id;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-0.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-0.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"data-view": mod.id,
					"aria-current": isActive ? "page" : void 0,
					onClick: () => handleSelectView(mod.id),
					onMouseEnter: () => prefetchModule(mod.id),
					onFocus: () => prefetchModule(mod.id),
					className: cn("flex-1 min-w-0 flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium select-none cursor-pointer whitespace-nowrap", "transition-colors duration-150 ease-out", FOCUS_RING, isActive ? "bg-[var(--surface-active)] text-[var(--ink)]" : "text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-2.5 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: cn("size-4 shrink-0", isActive ? "text-[var(--accent)]" : "text-[var(--ink-subtle)]"),
								strokeWidth: 1.75
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: mod.label
							})]
						}),
						mod.badgeKey === "failedServices" && failedSvcCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[11.5px] font-semibold text-[var(--err)] tabular-nums shrink-0",
							children: failedSvcCount
						}),
						mod.badgeKey === "alerts" && activeAlertsCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[11.5px] font-semibold text-[var(--warn)] tabular-nums shrink-0",
							children: activeAlertsCount
						})
					]
				}), isAgentHome && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => handleSelectView("agents"),
					title: "新建 Agent 对话",
					"aria-label": "新建 Agent 对话",
					"data-testid": "sidebar-new-agent-btn",
					className: cn("h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg text-[var(--ink-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors cursor-pointer", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
						className: "size-3.5",
						strokeWidth: 1.75
					})
				})]
			}), isAgentHome && recentAgentTasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "ml-4 pl-2.5 border-l border-[var(--border-subtle)] py-0.5 space-y-0.5",
				"data-testid": "sidebar-agent-threads",
				children: recentAgentTasks.slice(0, 5).map((task) => {
					const threadActive = view === "agents" && activeAgentTaskId === task.id;
					const dotClass = task.state === "completed" ? "bg-[var(--ok-dot)]" : task.state === "working" || task.state === "submitted" ? "bg-[var(--warn-dot)]" : task.state === "failed" || task.state === "canceled" ? "bg-[var(--err-dot)]" : "bg-[var(--muted-dot)]";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => handleOpenAgentThread(task.id),
						title: task.prompt || task.id,
						className: cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-left cursor-pointer transition-colors min-w-0", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0", threadActive ? "bg-[var(--surface-active)] text-[var(--ink)] font-medium" : "text-[var(--ink-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass),
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: task.prompt || task.id
						})]
					}, task.id);
				})
			})]
		}, mod.id);
	};
	const renderSidebarContent = (isMobile = false) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-14 items-center justify-between px-3.5 border-b border-[var(--border-subtle)] shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => handleSelectView("agents"),
					className: cn("flex items-center gap-2.5 min-w-0 text-left cursor-pointer rounded-lg py-1 pr-1 select-none", FOCUS_RING),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "h-6 w-6 rounded-md overflow-hidden shrink-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 bg-[var(--surface-subtle)]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: "/favicon.svg",
							width: 24,
							height: 24,
							alt: "",
							className: "h-6 w-6 block"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[14.5px] font-semibold tracking-tight text-[var(--ink)] truncate",
						children: brandTitle
					})]
				}), isMobile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setMobileNavOpen(false),
					"aria-label": "关闭导航菜单",
					className: cn("h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors duration-150 ease-out cursor-pointer", FOCUS_RING),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
						className: "size-4",
						strokeWidth: 1.75
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setSidebarCollapsed(true),
					"aria-label": "折叠侧边栏",
					title: "折叠侧边栏",
					"data-testid": "sidebar-collapse-btn",
					className: cn("h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors duration-150 ease-out cursor-pointer", FOCUS_RING),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeftClose, {
						className: "size-4",
						strokeWidth: 1.75
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "flex-1 overflow-y-auto px-2.5 py-3.5 space-y-3",
				"aria-label": "主导航",
				children: [agentGroup && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					"data-testid": "sidebar-domain-harness",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"data-testid": "sidebar-harness-toggle",
						"aria-expanded": harnessNavExpanded,
						onClick: () => setHarnessNavExpanded((prev) => !prev),
						className: cn("w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold tracking-wide text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1.5",
							children: [harnessNavExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
								className: "size-3.5",
								strokeWidth: 1.75
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
								className: "size-3.5",
								strokeWidth: 1.75
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: agentGroup.domain.title })]
						})
					}), harnessNavExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 flex flex-col gap-0.5",
						children: agentGroup.modules.map((mod) => renderNavItem(mod))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pt-2.5 border-t border-[var(--border-subtle)]",
					"data-testid": "sidebar-domain-ops",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"data-testid": "sidebar-ops-toggle",
						"aria-expanded": opsNavExpanded,
						onClick: () => setOpsNavExpanded((prev) => !prev),
						className: cn("w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold tracking-wide text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none", FOCUS_RING),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1.5",
							children: [opsNavExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
								className: "size-3.5",
								strokeWidth: 1.75
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {
								className: "size-3.5",
								strokeWidth: 1.75
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "系统与运维" })]
						}), !opsNavExpanded && secondaryAlertBadge > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-[11px] font-semibold text-[var(--warn)] tabular-nums",
							children: secondaryAlertBadge
						})]
					}), opsNavExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 flex flex-col gap-0.5",
						children: secondaryModules.map((mod) => renderNavItem(mod))
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-4 py-3 border-t border-[var(--border-subtle)] text-[11.5px] text-[var(--ink-subtle)] shrink-0 space-y-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate font-mono text-[var(--ink-muted)]",
							title: snapshot?.host?.hostname || "control-plane",
							children: snapshot?.host?.hostname || "control-plane"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono tabular-nums shrink-0",
							children: ["v", meta?.version || "0.4.0"]
						})]
					}),
					(demoMode || readOnly) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[11px] text-[var(--ink-subtle)] truncate",
						children: demoMode && readOnly ? "演示模式 · 只读保护" : demoMode ? "演示模式 · 仿真连接器" : "只读观测模式"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PWAInstallButton, {})
				]
			})
		]
	});
	const mainContainerClass = view === "graph" ? "flex-1 w-full px-4 sm:px-6 py-4" : view === "projects" ? "flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-5" : view === "agents" ? "flex-1 w-full max-w-[960px] mx-auto px-4 sm:px-6 py-4 flex flex-col" : "flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-8";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MotionConfig, {
		reducedMotion: "user",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-h-dvh bg-[var(--bg)] text-[var(--ink)] flex",
			children: [
				!sidebarCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
					"data-testid": "desktop-sidebar",
					className: "hidden lg:flex lg:w-[244px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[var(--surface-elevated)] border-r border-[var(--border)] z-30",
					children: renderSidebarContent(false)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Root, {
					open: mobileNavOpen,
					onOpenChange: setMobileNavOpen,
					direction: "left",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Portal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Overlay, { className: "fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] lg:hidden" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Content, {
						"aria-label": "移动端主导航抽屉",
						className: "fixed inset-y-0 left-0 z-50 w-[272px] max-w-[84vw] bg-[var(--surface-elevated)] border-r border-[var(--border)] shadow-2xl flex flex-col lg:hidden focus:outline-none",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Title, {
								className: "sr-only",
								children: [brandTitle, " 导航菜单"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Description, {
								className: "sr-only",
								children: "在 Harness 与系统运维视图间切换"
							}),
							renderSidebarContent(true)
						]
					})] })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("flex-1 min-w-0 flex flex-col min-h-dvh", sidebarCollapsed ? "lg:pl-0" : "lg:pl-[244px]"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
							className: "sticky top-0 z-20 h-14 bg-[var(--bg)]/85 backdrop-blur-md border-b border-[var(--border-subtle)] shrink-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "h-full px-4 sm:px-6 flex items-center justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											onClick: () => setMobileNavOpen(true),
											"aria-label": "打开导航菜单",
											className: "lg:hidden",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {
												className: "size-4",
												strokeWidth: 1.75
											})
										}),
										sidebarCollapsed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											onClick: () => setSidebarCollapsed(false),
											"aria-label": "展开侧边栏",
											title: "展开侧边栏",
											"data-testid": "sidebar-expand-btn",
											className: "hidden lg:inline-flex",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeftOpen, {
												className: "size-4",
												strokeWidth: 1.75
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 min-w-0 text-[13px] select-none",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "hidden sm:inline text-[var(--ink-subtle)] whitespace-nowrap",
													children: isHarnessView ? activeDomainTitle : "系统与运维"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "hidden sm:inline text-[var(--ink-subtle)]/50",
													"aria-hidden": "true",
													children: "/"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-medium text-[var(--ink)] truncate whitespace-nowrap",
													children: activeModule.label
												})
											]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 shrink-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setCommandOpen(true),
											"aria-label": "打开命令面板",
											"data-testid": "command-trigger",
											className: cn("h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-[color,border-color,transform] duration-150 ease-out active:scale-[0.97] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap select-none", FOCUS_RING),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
													className: "size-3.5 text-[var(--ink-subtle)]",
													strokeWidth: 1.75
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "hidden md:inline",
													children: "搜索或跳转"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
													className: "hidden sm:inline-block font-mono text-[11px] text-[var(--ink-subtle)] px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] leading-none",
													children: "⌘K"
												})
											]
										}),
										!isHarnessView && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: cn("hidden xl:inline-block font-mono text-[11.5px] tabular-nums whitespace-nowrap px-1.5 select-none", syncError ? "text-[var(--err)]" : "text-[var(--ink-subtle)]"),
												title: syncError || lastSyncedAt,
												children: syncError ? "同步异常" : lastSyncedAt ? formatClock(lastSyncedAt) : "同步中..."
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												"aria-label": "自动刷新周期",
												value: String(pollMs),
												onChange: (e) => setPollMs(Number(e.target.value)),
												className: cn("ui-select hidden sm:block h-8 pl-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-colors duration-150 ease-out cursor-pointer", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "0",
														children: "手动"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "10000",
														children: "10s"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "30000",
														children: "30s"
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												variant: "secondary",
												size: "sm",
												disabled: refreshing,
												"aria-label": "手动刷新数据",
												title: "立即同步遥测快照",
												onClick: () => {
													loadSnapshot(true);
													if (activeModule.dataDeps.includes("probes")) loadProbes();
													if (activeModule.dataDeps.includes("ops")) loadOpsData();
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
													className: cn("size-4 text-[var(--ink-muted)]", refreshing && "animate-spin"),
													strokeWidth: 1.75
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "hidden sm:inline",
													children: "刷新"
												})]
											})
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											onClick: toggleTheme,
											"aria-label": theme === "dark" ? "切换为浅色模式" : "切换为深色模式",
											title: theme === "dark" ? "切换为浅色模式" : "切换为深色模式",
											"data-testid": "theme-toggle",
											children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, {
												className: "size-4",
												strokeWidth: 1.75
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, {
												className: "size-4",
												strokeWidth: 1.75
											})
										}),
										meta?.authEnabled && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											variant: "ghost",
											size: "sm",
											onClick: handleLogout,
											"aria-label": "退出登录",
											title: "退出登录",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, {
												className: "size-4",
												strokeWidth: 1.75
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "hidden md:inline",
												children: "退出"
											})]
										})
									]
								})]
							})
						}),
						syncError && !isHarnessView && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "border-b border-[var(--err)]/20 bg-[var(--err)]/5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "max-w-[1200px] mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-2 text-[12.5px] text-[var(--err)]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "truncate",
									children: ["快照同步异常：", syncError]
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
							className: mainContainerClass,
							children: loading && !snapshot && !isHarnessView ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewSkeleton, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModuleBoundary, {
								moduleId: activeModule.id,
								moduleLabel: activeModule.label,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Suspense, {
									fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewSkeleton, {}),
									children: [
										view === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverviewView, {
											snapshot,
											incidents,
											onOpenLogs: handleOpenLogs,
											onSelectAgentCategory: handleSelectAgentCategory,
											onOpenPlugins: () => handleSelectView("plugins")
										}),
										view === "alerts" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertsView, {
											incidents,
											readOnly,
											onRefreshIncidents: loadOpsData,
											onToast: pushToast,
											onConfirm: setConfirmState
										}),
										view === "fleet" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FleetView, {
											snapshot,
											probes,
											readOnly,
											onRefresh: () => loadSnapshot(true),
											onRefreshProbes: loadProbes,
											onOpenNodeMcps: (nodeId) => {
												setMcpInitialNode(nodeId);
												handleSelectView("mcp");
											},
											onOpenA2A: () => handleSelectView("agents"),
											onToast: pushToast,
											onConfirm: setConfirmState
										}),
										view === "services" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServicesView, {
											snapshot,
											readOnly,
											onRefresh: () => loadSnapshot(true),
											onOpenLogs: handleOpenLogs,
											onToast: pushToast,
											onConfirm: setConfirmState
										}),
										view === "plugins" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginsView, {
											readOnly,
											onSnapshotChanged: () => void loadSnapshot(true),
											onToast: pushToast,
											onConfirm: setConfirmState
										}),
										view === "mcp" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(McpView, {
											snapshot,
											readOnly,
											initialNodeId: mcpInitialNode,
											onSnapshotChanged: () => void loadSnapshot(true),
											onToast: pushToast,
											onConfirm: setConfirmState
										}),
										view === "memory" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MemoryView, {
											snapshot,
											readOnly,
											onToast: pushToast
										}),
										view === "agents" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentsView, {
											readOnly,
											activeTaskId: activeAgentTaskId,
											onSelectTask: setActiveAgentTaskId,
											onTasksUpdated: () => void loadRecentAgentTasks(),
											onToast: pushToast
										}),
										view === "projects" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProjectsView, {
											readOnly,
											onToast: pushToast
										}),
										view === "graph" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentGraphView, {
											readOnly,
											onToast: pushToast
										}),
										view === "bots" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BotsView, {
											readOnly,
											onToast: pushToast
										}),
										view === "github" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GithubView, {
											readOnly,
											onToast: pushToast
										}),
										view === "agent-settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentSettingsView, {
											snapshot,
											readOnly,
											selectedCategory: agentCategory,
											selectedPid: agentPid,
											onSelectCategory: (cat) => {
												setAgentPid(null);
												setAgentCategory(cat);
											},
											onSelectPid: setAgentPid,
											onSnapshotChanged: () => void loadSnapshot(true),
											onToast: pushToast,
											onConfirm: setConfirmState
										}),
										view === "network" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NetworkView, {
											snapshot,
											meta,
											onToast: pushToast
										}),
										view === "logs" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogsView, {
											snapshot,
											meta,
											initialUnit: logsInitialUnit,
											initialLevel: logsInitialLevel,
											requestNonce: logsRequestNonce,
											onToast: pushToast
										}),
										view === "ops" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpsView, {
											snapshot,
											incidents,
											audit,
											readOnly,
											onRefresh: () => loadSnapshot(true),
											onRefreshOps: loadOpsData,
											onToast: pushToast,
											onConfirm: setConfirmState
										})
									]
								})
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandPalette, {
					open: commandOpen,
					onOpenChange: setCommandOpen,
					entries: commandEntries
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmAlertDialog, {
					state: confirmState,
					onClose: () => setConfirmState(null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OfflineIndicator, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
					theme,
					position: "bottom-right",
					closeButton: true,
					toastOptions: { style: {
						background: "var(--surface-elevated)",
						border: "1px solid var(--border)",
						color: "var(--ink)",
						borderRadius: "12px",
						boxShadow: "var(--shadow-card)",
						fontSize: "13px"
					} }
				})
			]
		})
	});
}
// web/main.tsx
registerServiceWorker();
var rootEl = document.getElementById("root");
if (rootEl) (0, import_client.createRoot)(rootEl).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.StrictMode, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(App, {}) }));
export { deleteBot as $, togglePlugin as $t, formatInteger as A, registerA2AAgent as At, buildLogStreamUrl as B, saveA2ATopologyPositions as Bt, deviceTypeLabel as C, fetchPrometheusMetrics as Ct, formatClock as D, issueConfirmToken as Dt, formatBytes as E, ingestSuperAgentTrigger as Et, statusTone as F, runDshTeamCollaboration as Ft, createAlertRule as G, submitMobileCheckin as Gt, compareMemoryRetrieval as H, searchMemory as Ht, FOCUS_RING as I, runMemoryDoctor as It, createLinearProject as J, syncMcpToNodes as Jt, createBot as K, syncA2ASession as Kt, cn as L, runOpsAction as Lt, formatUptime as M, removeCustomPlugin as Mt, layerLabel as N, revokeProbe as Nt, formatCompactNumber as O, openA2ALogStream as Ot, statusLabel as P, runAiPreflight as Pt, deleteAlertRule as Q, toggleMcp as Qt, ackAlert as R, runRunbook as Rt, countLogLevels as S, fetchProbeCommands as St, filterServices as T, handoffA2ASession as Tt, copyToClipboard as U, setAlertSilence as Ut, cancelA2ATask as V, saveIncidentNote as Vt, createA2ASession as W, setLeadA2AAgent as Wt, deleteA2ARoutingRule as X, testPlugin as Xt, deleteA2AAgent as Y, testMcp as Yt, deleteA2ASkill as Z, toggleAlertRule as Zt, StatusIndicator as _, fetchLinearState as _t, formatRemainingSilence as a, updateBot as an, dispatchLinearCommander as at, WidgetSkeleton as b, fetchMetricsSeries as bt, sortFleetNodes as c, updateLinearIssue as cn, executeServiceAction as ct, ErrorState as d, upsertA2ARoutingRule as dn, fetchA2AState as dt, toggleSuperAgentContextSpill as en, deleteLinearIssue as et, KpiStrip as f, upsertA2ASkill as fn, fetchAiOpsContext as ft, SegmentedFilter as g, fetchGatewayTelemetry as gt, ResourceMeter as h, fetchConfigStudio as ht, filterAuditEntries as i, updateA2ASkill as in, dispatchA2ATask as it, formatRelativeAge as j, registerMcp as jt, formatDateTime as k, probeRemotes as kt, Button as l, updatePluginConfig as ln, executeTimerAction as lt, Panel as m, fetchBots as mt, auditEntriesToCsv as n, updateA2AAgent as nn, discoverA2AAgent as nt, latencyTierVar as o, updateLinearCommander as on, enqueueProbeCommand as ot, LatencyMeter as p, validateConfigStudio as pn, fetchAlerts as pt, createLinearIssue as q, syncLinearGithub as qt, buildPluginsExportPayload as r, updateA2AOrchestrationConfig as rn, discoverLocalA2AAgents as rt, searchFleetNodes as s, updateLinearGithubConfig as sn, enrollProbe as st, ModuleFrame as t, triggerBotEvent as tn, deleteMcp as tt, EmptyState as u, updateSuperAgentConfig as un, fetchA2ALogs as ut, ToggleSwitch as v, fetchLogs as vt, filterFleetNodes as w, fetchRunbooks as wt, inputBaseClass as x, fetchPlugins as xt, ViewSkeleton as y, fetchMcps as yt, addCustomPlugin as z, runSuperAgentWatchdogSweep as zt };
