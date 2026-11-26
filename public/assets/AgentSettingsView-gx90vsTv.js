const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ArchitectureGraph-Bi6KwZoe.js","assets/rolldown-runtime-Bl4WtXjF.js","assets/vendor-charts-Cc1dpEBz.js","assets/vendor-flow-aUB-QjJm.js","assets/vendor-ui-DUVxOpTN.js","assets/vendor-motion-BAjclsVr.js","assets/app-nZGM7CNZ.js","assets/vendor-react-D8TP-cyN.js"])))=>i.map(i=>d[i]);
import { n as __exportAll, r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { a as Bar, c as Cell, i as XAxis, l as Tooltip, n as BarChart, o as Area, r as YAxis, s as CartesianGrid, t as AreaChart, u as ResponsiveContainer, x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { $ as RefreshCw, B as Sparkles, Bt as Copy, Ct as HardDriveUpload, F as Terminal, G as ShieldCheck, Gt as CircleCheck, H as SlidersHorizontal, It as Database, J as Send, K as Server, Kt as ChevronRight, Lt as Crown, M as Users, N as TriangleExclamationPoint, Nt as FileCodeCorner, O as Zap, Ot as GitBranch, P as Trash, Q as RotateCcw, T as __vitePreload, V as Smartphone, W as ShieldExclamationPoint, X as Save, Xt as Bot, Y as Search, at as Play, bt as Layers, ft as Minus, gt as Map$1, ht as Maximize2, in as ArrowDown, k as X, nn as ArrowUpDown, on as Activity, ot as Pause, qt as ChevronDown, rn as ArrowRight, rt as Plus, sn as Drawer, tn as ArrowUp, tt as Radar, ut as Network, wt as HardDriveDownload, xt as Laptop, zt as Cpu } from "./vendor-ui-DUVxOpTN.js";
import { At as registerA2AAgent, Bt as saveA2ATopologyPositions, E as formatBytes, Et as ingestSuperAgentTrigger, F as statusTone, Ft as runDshTeamCollaboration, I as FOCUS_RING, J as createLinearProject, Kt as syncA2ASession, L as cn, M as formatUptime, O as formatCompactNumber, Ot as openA2ALogStream, P as statusLabel, Pt as runAiPreflight, Tt as handoffA2ASession, U as copyToClipboard, V as cancelA2ATask, W as createA2ASession, Wt as setLeadA2AAgent, X as deleteA2ARoutingRule, Y as deleteA2AAgent, Z as deleteA2ASkill, _ as StatusIndicator, _t as fetchLinearState, b as WidgetSkeleton, dn as upsertA2ARoutingRule, dt as fetchA2AState, en as toggleSuperAgentContextSpill, f as KpiStrip, fn as upsertA2ASkill, ft as fetchAiOpsContext, g as SegmentedFilter, gt as fetchGatewayTelemetry, h as ResourceMeter, in as updateA2ASkill, it as dispatchA2ATask, j as formatRelativeAge, l as Button, m as Panel, nn as updateA2AAgent, nt as discoverA2AAgent, on as updateLinearCommander, rn as updateA2AOrchestrationConfig, rt as discoverLocalA2AAgents, t as ModuleFrame, u as EmptyState, un as updateSuperAgentConfig, ut as fetchA2ALogs, x as inputBaseClass, yt as fetchMcps, zt as runSuperAgentWatchdogSweep } from "./app-nZGM7CNZ.js";
import { a as Ta, c as fr, d as MarkerType, f as Position, i as Sn, l as pa, n as Co, o as Ua, p as require_jsx_runtime, r as Ra, s as _a, u as wa } from "./vendor-flow-aUB-QjJm.js";
// web/lib/agent-topology.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function compareSemver(a, b) {
	const pa = String(a || "0.0.0").replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
	const pb = String(b || "0.0.0").replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
	for (let i = 0; i < 3; i += 1) {
		const diff = (pa[i] || 0) - (pb[i] || 0);
		if (diff !== 0) return diff;
	}
	return 0;
}
/**
* Combines an agent's embedded A2A skills with assigned entries from the unified
* cross-agent skillCatalog so every interactive node displays accurate Skill + Version info.
*/
function resolveAgentSkillsWithVersions(agent, skillCatalog = []) {
	const result = [];
	const seenKeys = /* @__PURE__ */ new Set();
	for (const item of skillCatalog) {
		if (!Array.isArray(item.assignedAgentIds) || !item.assignedAgentIds.includes(agent.id)) continue;
		const key = item.name.trim().toLowerCase();
		if (!key || seenKeys.has(key)) continue;
		seenKeys.add(key);
		seenKeys.add(item.id.trim().toLowerCase());
		result.push({
			id: item.id,
			name: item.name,
			version: item.version || "1.0.0",
			latestVersion: item.latestVersion || item.version || "1.0.0",
			updateAvailable: compareSemver(item.latestVersion, item.version) > 0,
			provider: item.provider || "a2a-card",
			enabled: item.enabled !== false,
			description: item.description,
			catalogItemId: item.id
		});
	}
	for (const nativeSkill of agent.skills || []) {
		const nameKey = String(nativeSkill.name || "").trim().toLowerCase();
		const idKey = String(nativeSkill.id || "").trim().toLowerCase();
		if (!nameKey && !idKey || seenKeys.has(nameKey) || seenKeys.has(idKey)) continue;
		if (nameKey) seenKeys.add(nameKey);
		if (idKey) seenKeys.add(idKey);
		result.push({
			id: nativeSkill.id || nativeSkill.name,
			name: nativeSkill.name || nativeSkill.id,
			version: agent.version || "1.0.0",
			latestVersion: agent.latestVersion || agent.version || "1.0.0",
			updateAvailable: false,
			provider: agent.pluginKind === "dsh-review-plugin" ? "dsh-plugin" : `${agent.harness}-card`,
			enabled: true,
			description: nativeSkill.description
		});
	}
	return result;
}
function buildHostTelemetryMap(fleetNodes = [], agents = []) {
	const map = /* @__PURE__ */ new Map();
	for (const node of fleetNodes) {
		const agentCount = agents.filter((a) => a.nodeId === node.id).length;
		map.set(node.id, {
			id: node.id,
			name: node.name || node.id,
			status: node.status || "healthy",
			deviceType: node.deviceType || "server",
			region: node.region,
			city: node.city,
			os: node.os,
			tailscaleIp: node.tailscaleIp,
			rttMs: typeof node.rttMs === "number" && Number.isFinite(node.rttMs) ? node.rttMs : null,
			cpuPct: typeof node.cpu?.usagePct === "number" && Number.isFinite(node.cpu.usagePct) ? Math.round(node.cpu.usagePct) : null,
			memPct: typeof node.memory?.usedPct === "number" && Number.isFinite(node.memory.usedPct) ? Math.round(node.memory.usedPct) : null,
			agentCount
		});
	}
	for (const agent of agents) {
		if (!agent.nodeId || map.has(agent.nodeId)) continue;
		const hosted = agents.filter((a) => a.nodeId === agent.nodeId);
		map.set(agent.nodeId, {
			id: agent.nodeId,
			name: agent.nodeName || agent.nodeId,
			status: agent.status || "healthy",
			deviceType: agent.nodeId.includes("mac") || agent.nodeId.includes("laptop") ? "laptop" : "server",
			rttMs: typeof agent.latencyMs === "number" ? agent.latencyMs : null,
			cpuPct: null,
			memPct: null,
			agentCount: hosted.length
		});
	}
	return map;
}
function computeClusterConnectivityStats(agents, fleetNodes, rules, skillCatalog = []) {
	let onlineAgents = 0;
	let degradedAgents = 0;
	let offlineAgents = 0;
	let outdatedAgents = 0;
	let latencySum = 0;
	let latencyCount = 0;
	let totalMountedSkills = 0;
	for (const agent of agents) {
		const st = String(agent.status || "").toLowerCase();
		if (st === "healthy" || st === "online" || st === "ok" || st === "active") onlineAgents += 1;
		else if (st === "degraded" || st === "warn" || st === "warning" || st === "standby") degradedAgents += 1;
		else offlineAgents += 1;
		if (agent.updateAvailable) outdatedAgents += 1;
		if (typeof agent.latencyMs === "number" && Number.isFinite(agent.latencyMs) && agent.latencyMs >= 0) {
			latencySum += agent.latencyMs;
			latencyCount += 1;
		}
		totalMountedSkills += resolveAgentSkillsWithVersions(agent, skillCatalog).filter((s) => s.enabled).length;
	}
	const hostMap = buildHostTelemetryMap(fleetNodes, agents);
	const hosts = Array.from(hostMap.values()).filter((h) => h.agentCount > 0 || fleetNodes.some((f) => f.id === h.id));
	const onlineHosts = hosts.filter((h) => {
		const st = String(h.status || "").toLowerCase();
		return st !== "offline" && st !== "failed" && st !== "down" && st !== "error";
	}).length;
	const activeLinks = rules.filter((r) => r.enabled).length;
	return {
		totalAgents: agents.length,
		onlineAgents,
		degradedAgents,
		offlineAgents,
		totalHosts: hosts.length,
		onlineHosts,
		activeLinks,
		totalLinks: rules.length,
		avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
		outdatedAgents,
		totalMountedSkills
	};
}
function buildRoutingNodes(agents, fleetNodes, rules, skillCatalog, leadAgentId, selectedNodeId) {
	const hostMap = buildHostTelemetryMap(fleetNodes, agents);
	let workerIdx = 0;
	return agents.map((agent) => {
		const isLead = agent.id === leadAgentId;
		const isDshExpert = agent.harness === "dsh-expert" || agent.pluginKind === "dsh-review-plugin";
		const inCount = rules.filter((r) => r.targetAgentId === agent.id && r.enabled).length;
		const outCount = rules.filter((r) => r.sourceAgentId === agent.id && r.enabled).length;
		let defaultPos;
		if (isLead) defaultPos = {
			x: 20,
			y: 260
		};
		else if (isDshExpert) defaultPos = {
			x: 820,
			y: 260
		};
		else {
			defaultPos = {
				x: 415,
				y: 12 + workerIdx * 172
			};
			workerIdx += 1;
		}
		return {
			id: agent.id,
			type: "agentNode",
			position: agent.position && Number.isFinite(agent.position.x) && Number.isFinite(agent.position.y) ? {
				x: agent.position.x,
				y: agent.position.y
			} : defaultPos,
			data: {
				agent,
				isLead,
				isSelected: selectedNodeId === agent.id,
				isDshExpert,
				inCount,
				outCount,
				skills: resolveAgentSkillsWithVersions(agent, skillCatalog),
				hostTelemetry: hostMap.get(agent.nodeId) || null,
				lens: "routing"
			}
		};
	});
}
function buildRoutingEdges(rules, selectedRuleId, mode) {
	return rules.map((rule) => {
		const isSelected = selectedRuleId === rule.id;
		const shortKeywords = rule.matchKeywords.slice(0, 2).join("/");
		const effortTag = rule.reasoningEffort === "xhigh" ? "极高" : rule.reasoningEffort === "high" ? "高" : rule.reasoningEffort === "low" ? "低" : "中";
		const label = `${shortKeywords || rule.taskCategory} · ${effortTag}${rule.requireDshReview ? " · DSH" : ""}`;
		const stroke = !rule.enabled ? "var(--ink-subtle)" : isSelected ? "var(--accent)" : rule.requireDshReview ? "var(--ok-dot)" : mode === "swarm" ? "var(--accent)" : "var(--graph-edge)";
		return {
			id: rule.id,
			source: rule.sourceAgentId,
			target: rule.targetAgentId,
			sourceHandle: "out",
			targetHandle: "in",
			animated: rule.enabled,
			label,
			labelStyle: {
				fill: isSelected ? "var(--accent)" : "var(--ink)",
				fontSize: 11,
				fontFamily: "\"JetBrains Mono Variable\", monospace",
				fontWeight: isSelected ? 600 : 500
			},
			labelBgStyle: {
				fill: "var(--surface-elevated)",
				fillOpacity: .94,
				stroke: isSelected ? "var(--accent)" : "var(--border)",
				strokeWidth: 1
			},
			labelBgPadding: [6, 3],
			labelBgBorderRadius: 6,
			style: {
				stroke,
				strokeWidth: isSelected ? 2.4 : rule.enabled ? 1.75 : 1.2,
				strokeDasharray: rule.enabled ? void 0 : "5 4",
				opacity: rule.enabled ? 1 : .45
			},
			markerEnd: {
				type: MarkerType.ArrowClosed,
				width: 14,
				height: 14,
				color: stroke
			}
		};
	});
}
/**
* Builds the Agent Cluster Connectivity Topology graph using existing fleetNodes + agents + routingRules:
* - Left column: Fleet Host Nodes (`host:<nodeId>`) carrying live RTT, Tailscale IP, CPU/Mem telemetry
* - Middle column: Hosted Lead & Worker Agents with Skill + Version + Connection State
* - Right column: DSH Expert Reviewer / External Gateways
* - Edges: Host-to-Agent deployment links (showing local/Tailscale RTT) + Agent-to-Agent A2A routing links
*/
function buildClusterTopologyGraph(agents, fleetNodes, rules, skillCatalog, leadAgentId, selectedNodeId, selectedRuleId, mode, customHostPositions = {}) {
	const hostMap = buildHostTelemetryMap(fleetNodes, agents);
	const relevantHosts = Array.from(hostMap.values()).filter((h) => h.agentCount > 0 || h.deviceType === "hub" || h.deviceType === "server");
	const leadAgent = agents.find((a) => a.id === leadAgentId) || null;
	relevantHosts.sort((a, b) => {
		const aLead = leadAgent && a.id === leadAgent.nodeId ? 1 : 0;
		const bLead = leadAgent && b.id === leadAgent.nodeId ? 1 : 0;
		if (aLead !== bLead) return bLead - aLead;
		return b.agentCount - a.agentCount;
	});
	const nodes = [];
	const edges = [];
	const hostYStep = 166;
	relevantHosts.forEach((host, idx) => {
		const hostNodeId = `host:${host.id}`;
		const hostedAgents = agents.filter((a) => a.nodeId === host.id);
		const savedPos = customHostPositions[hostNodeId];
		nodes.push({
			id: hostNodeId,
			type: "clusterHostNode",
			position: savedPos ? {
				x: savedPos.x,
				y: savedPos.y
			} : {
				x: 16,
				y: 16 + idx * hostYStep
			},
			data: {
				host,
				isSelected: selectedNodeId === hostNodeId,
				hostedAgentIds: hostedAgents.map((a) => a.id),
				hostedAgentNames: hostedAgents.map((a) => a.name),
				hasLead: hostedAgents.some((a) => a.id === leadAgentId)
			}
		});
	});
	let workerRow = 0;
	let rightRow = 0;
	const hostOrder = new Map(relevantHosts.map((h, i) => [h.id, i]));
	const orderedAgents = [...agents].sort((a, b) => {
		const ha = hostOrder.get(a.nodeId) ?? 99;
		const hb = hostOrder.get(b.nodeId) ?? 99;
		if (ha !== hb) return ha - hb;
		if (a.id === leadAgentId) return -1;
		if (b.id === leadAgentId) return 1;
		return 0;
	});
	const workerCount = orderedAgents.filter((a) => a.id !== leadAgentId && a.harness !== "dsh-expert" && a.pluginKind !== "dsh-review-plugin").length;
	const centerY = Math.max(180, Math.round((Math.max(1, workerCount) - 1) * 172 / 2));
	for (const agent of orderedAgents) {
		const isLead = agent.id === leadAgentId;
		const isDshExpert = agent.harness === "dsh-expert" || agent.pluginKind === "dsh-review-plugin";
		const inCount = rules.filter((r) => r.targetAgentId === agent.id && r.enabled).length;
		const outCount = rules.filter((r) => r.sourceAgentId === agent.id && r.enabled).length;
		const host = hostMap.get(agent.nodeId) || null;
		let pos;
		if (customHostPositions[agent.id]) pos = customHostPositions[agent.id];
		else if (isLead) pos = {
			x: 355,
			y: centerY
		};
		else if (isDshExpert) {
			pos = {
				x: 1145,
				y: centerY + rightRow * 172
			};
			rightRow += 1;
		} else {
			pos = {
				x: 745,
				y: 12 + workerRow * 172
			};
			workerRow += 1;
		}
		nodes.push({
			id: agent.id,
			type: "agentNode",
			position: pos,
			data: {
				agent,
				isLead,
				isSelected: selectedNodeId === agent.id,
				isDshExpert,
				inCount,
				outCount,
				skills: resolveAgentSkillsWithVersions(agent, skillCatalog),
				hostTelemetry: host,
				lens: "cluster"
			}
		});
		const hostNodeId = `host:${agent.nodeId}`;
		if (relevantHosts.some((h) => h.id === agent.nodeId)) {
			const hostOffline = String(host?.status || "").toLowerCase() === "offline";
			const agentOffline = String(agent.status || "").toLowerCase() === "offline";
			const linkColor = hostOffline || agentOffline ? "var(--err-dot)" : "var(--border)";
			const rttLabel = typeof agent.latencyMs === "number" ? `${agent.latencyMs}ms` : typeof host?.rttMs === "number" ? `${host.rttMs}ms` : "local";
			edges.push({
				id: `host-link:${agent.nodeId}->${agent.id}`,
				source: hostNodeId,
				target: agent.id,
				sourceHandle: "host-out",
				targetHandle: "in",
				animated: false,
				selectable: false,
				label: rttLabel,
				labelStyle: {
					fill: "var(--ink-subtle)",
					fontSize: 10,
					fontFamily: "\"JetBrains Mono Variable\", monospace"
				},
				labelBgStyle: {
					fill: "var(--surface-elevated)",
					fillOpacity: .88,
					stroke: "var(--border-subtle)",
					strokeWidth: 1
				},
				labelBgPadding: [4, 2],
				labelBgBorderRadius: 4,
				style: {
					stroke: linkColor,
					strokeWidth: 1.35,
					strokeDasharray: "4 3",
					opacity: .8
				}
			});
		}
	}
	const routingEdges = buildRoutingEdges(rules, selectedRuleId, mode);
	edges.push(...routingEdges);
	return {
		nodes,
		edges
	};
}
function computeResetPositions(agents, leadAgentId) {
	const positions = {};
	let workerRow = 0;
	for (const a of agents) if (a.id === leadAgentId) positions[a.id] = {
		x: 20,
		y: 260
	};
	else if (a.harness === "dsh-expert" || a.pluginKind === "dsh-review-plugin") positions[a.id] = {
		x: 820,
		y: 260
	};
	else {
		positions[a.id] = {
			x: 415,
			y: 12 + workerRow * 172
		};
		workerRow += 1;
	}
	return positions;
}
// web/components/AgentOrchestrationCanvas.tsx
var import_jsx_runtime = require_jsx_runtime();
var MODE_OPTIONS = [
	{
		value: "lead-router",
		label: "主控路由"
	},
	{
		value: "swarm",
		label: "自动蜂群 Swarm"
	},
	{
		value: "main-sub",
		label: "主子模型分层"
	}
];
var LENS_OPTIONS = [{
	value: "routing",
	label: "路由编排"
}, {
	value: "cluster",
	label: "集群连接拓扑"
}];
var EFFORT_OPTIONS = [
	{
		value: "low",
		label: "低 (极速低成本)",
		short: "low"
	},
	{
		value: "medium",
		label: "中 (均衡推理)",
		short: "med"
	},
	{
		value: "high",
		label: "高 (深度规划)",
		short: "high"
	},
	{
		value: "xhigh",
		label: "极高 (专家审校)",
		short: "xhigh"
	}
];
var MODEL_PRESETS = [
	"gpt-5-codex",
	"claude-opus-4-6",
	"claude-sonnet-4-6",
	"gemini-2.5-pro",
	"gemini-2.5-flash",
	"deepseek-r1-edge"
];
function effortLabel(effort) {
	if (effort === "xhigh") return "思考: 极高";
	if (effort === "high") return "思考: 高";
	if (effort === "low") return "思考: 低";
	return "思考: 中";
}
function toneDotClass(status) {
	const tone = statusTone(status);
	if (tone === "ok") return "bg-[var(--ok-dot)]";
	if (tone === "warn") return "bg-[var(--warn-dot)]";
	if (tone === "err") return "bg-[var(--err-dot)]";
	return "bg-[var(--muted-dot)]";
}
function toneTextClass(status) {
	const tone = statusTone(status);
	if (tone === "ok") return "text-[var(--ok)]";
	if (tone === "warn") return "text-[var(--warn)]";
	if (tone === "err") return "text-[var(--err)]";
	return "text-[var(--ink-subtle)]";
}
var NODE_TYPES = {
	agentNode: import_react.memo(function AgentGraphNode({ data }) {
		const { agent, isLead, isSelected, isDshExpert, inCount, outCount, skills, hostTelemetry } = data;
		const Icon = isLead ? Crown : isDshExpert ? ShieldCheck : Bot;
		const activeSkills = skills.filter((s) => s.enabled);
		const visibleSkills = activeSkills.slice(0, 2);
		const extraSkills = Math.max(0, activeSkills.length - visibleSkills.length);
		const latencyText = typeof agent.latencyMs === "number" ? `${agent.latencyMs}ms` : typeof hostTelemetry?.rttMs === "number" ? `${hostTelemetry.rttMs}ms` : null;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			"data-testid": `canvas-agent-node-${agent.id}`,
			className: cn("w-[262px] rounded-xl border bg-[var(--graph-node)] px-3.5 py-3 transition-[border-color,box-shadow] duration-150 ease-out select-none cursor-grab active:cursor-grabbing", isSelected ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25 shadow-[0_6px_22px_rgba(99,102,241,0.18)]" : isLead ? "border-[var(--accent)]/70 shadow-[0_2px_10px_rgba(99,102,241,0.12)]" : "border-[var(--graph-node-stroke)] hover:border-[var(--ink-subtle)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
					type: "target",
					position: Position.Left,
					id: "in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
					type: "source",
					position: Position.Right,
					id: "out"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0", isLead ? "bg-[var(--accent-soft)] text-[var(--accent)]" : isDshExpert ? "bg-[var(--surface-subtle)] text-[var(--ok)]" : "bg-[var(--surface-subtle)] text-[var(--ink-muted)]"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "w-4 h-4",
							strokeWidth: 1.8
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-[13px] font-semibold tracking-tight text-[var(--ink)]",
									title: agent.name,
									children: agent.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: cn("inline-flex items-center gap-1 shrink-0 font-mono text-[10.5px]", toneTextClass(agent.status)),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("h-1.5 w-1.5 rounded-full", toneDotClass(agent.status)) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: statusLabel(agent.status) })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-0.5 flex items-center gap-1 font-mono text-[11px] text-[var(--ink-subtle)] truncate tabular-nums",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "truncate",
									children: [
										isLead ? "Lead 主控" : isDshExpert ? "DSH 专家" : "Worker",
										" · ",
										agent.harness,
										" · v",
										agent.version || "1.0"
									]
								}), agent.updateAvailable && agent.latestVersion && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "shrink-0 text-[var(--warn)] font-medium",
									title: `最新版本 v${agent.latestVersion}`,
									children: ["↑v", agent.latestVersion]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--ink-muted)]",
								title: activeSkills.map((s) => `${s.name} (v${s.version})`).join(" · "),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "truncate",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[var(--ink-subtle)] mr-1",
											children: "Skill:"
										}), visibleSkills.length > 0 ? visibleSkills.map((s) => s.name).join(" · ") : "未挂载技能"]
									}), extraSkills > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "shrink-0 font-mono text-[10.5px] text-[var(--accent)] tabular-nums",
										children: ["+", extraSkills]
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1.5 pt-1.5 border-t border-[var(--border-subtle)]/70 flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-[var(--ink-muted)]",
									title: agent.modelHint || "",
									children: agent.modelHint || "auto-model"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "shrink-0 text-[var(--accent)] font-medium",
									children: effortLabel(agent.reasoningEffort)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 flex items-center justify-between gap-2 font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "truncate",
									children: [agent.nodeId, latencyText ? ` · ${latencyText}` : ""]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "shrink-0",
									children: [
										"入 ",
										inCount,
										" / 出 ",
										outCount
									]
								})]
							})
						]
					})]
				})
			]
		});
	}),
	clusterHostNode: import_react.memo(function ClusterHostGraphNode({ data }) {
		const { host, isSelected, hostedAgentIds, hasLead } = data;
		const DeviceIcon = host.deviceType === "laptop" ? Laptop : host.deviceType === "mobile" ? Smartphone : Server;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			"data-testid": `canvas-host-node-${host.id}`,
			className: cn("w-[238px] rounded-xl border bg-[var(--surface-elevated)] px-3.5 py-3 transition-[border-color,box-shadow] duration-150 ease-out select-none cursor-grab active:cursor-grabbing", isSelected ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25 shadow-[0_6px_20px_rgba(99,102,241,0.16)]" : "border-[var(--border)] hover:border-[var(--ink-subtle)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
				type: "source",
				position: Position.Right,
				id: "host-out"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0", hasLead ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-subtle)] text-[var(--ink-muted)]"),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeviceIcon, {
						className: "w-4 h-4",
						strokeWidth: 1.75
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate text-[12.5px] font-semibold text-[var(--ink)]",
								title: host.name,
								children: host.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: cn("inline-flex items-center gap-1 shrink-0 font-mono text-[10.5px]", toneTextClass(host.status)),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("h-1.5 w-1.5 rounded-full", toneDotClass(host.status)) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: statusLabel(host.status) })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-0.5 font-mono text-[11px] text-[var(--ink-subtle)] truncate tabular-nums",
							children: [host.tailscaleIp || host.id, host.region ? ` · ${host.region}` : ""]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 font-mono text-[11px] text-[var(--ink-muted)] tabular-nums",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [host.cpuPct != null ? `CPU ${host.cpuPct}%` : "宿主机", host.memPct != null ? ` · MEM ${host.memPct}%` : ""] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "shrink-0 text-[var(--ink-subtle)]",
								children: host.rttMs != null ? `${host.rttMs}ms` : "本地"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums",
							children: [
								"承载 ",
								hostedAgentIds.length,
								" 个 Agent",
								hasLead ? " · 含主控" : ""
							]
						})
					]
				})]
			})]
		});
	})
};
function CanvasInner({ agents, fleetNodes = [], skillCatalog = [], routingRules, leadAgentId, orchestrationConfig, readOnly, initialLens = "routing", canvasHeightClass = "h-[530px]", onUpdateConfig, onSavePositions, onUpsertRule, onDeleteRule, onUpdateAgent, onSetLead, onDiscoverAgent, onToggleSkillAgent, onInspectLogs }) {
	const { zoomIn, zoomOut, fitView } = Sn();
	const [lens, setLens] = import_react.useState(initialLens);
	const [showMiniMap, setShowMiniMap] = import_react.useState(initialLens === "cluster");
	const [selectedRuleId, setSelectedRuleId] = import_react.useState(initialLens === "routing" ? routingRules[0]?.id || null : null);
	const [selectedNodeId, setSelectedNodeId] = import_react.useState(initialLens === "cluster" ? leadAgentId || agents[0]?.id || null : null);
	const [clusterPositions, setClusterPositions] = import_react.useState({});
	const [saving, setSaving] = import_react.useState(false);
	const clusterStats = import_react.useMemo(() => computeClusterConnectivityStats(agents, fleetNodes, routingRules, skillCatalog), [
		agents,
		fleetNodes,
		routingRules,
		skillCatalog
	]);
	const computeGraph = import_react.useCallback(() => {
		if (lens === "cluster") return buildClusterTopologyGraph(agents, fleetNodes, routingRules, skillCatalog, leadAgentId, selectedNodeId, selectedRuleId, orchestrationConfig.mode, clusterPositions);
		return {
			nodes: buildRoutingNodes(agents, fleetNodes, routingRules, skillCatalog, leadAgentId, selectedNodeId),
			edges: buildRoutingEdges(routingRules, selectedRuleId, orchestrationConfig.mode)
		};
	}, [
		lens,
		agents,
		fleetNodes,
		routingRules,
		skillCatalog,
		leadAgentId,
		selectedNodeId,
		selectedRuleId,
		orchestrationConfig.mode,
		clusterPositions
	]);
	const initialGraph = import_react.useMemo(() => computeGraph(), []);
	const [nodes, setNodes, onNodesChange] = wa(initialGraph.nodes);
	const [edges, setEdges, onEdgesChange] = Ta(initialGraph.edges);
	const fittedKeyRef = import_react.useRef("");
	import_react.useEffect(() => {
		const next = computeGraph();
		setNodes(next.nodes);
		setEdges(next.edges);
	}, [
		computeGraph,
		setNodes,
		setEdges
	]);
	import_react.useEffect(() => {
		const fitKey = `${lens}:${agents.length}:${fleetNodes.length}`;
		if (agents.length > 0 && fittedKeyRef.current !== fitKey) {
			fittedKeyRef.current = fitKey;
			const timer = window.setTimeout(() => {
				fitView({
					padding: .14,
					duration: 200
				});
			}, 90);
			return () => window.clearTimeout(timer);
		}
	}, [
		lens,
		agents.length,
		fleetNodes.length,
		fitView
	]);
	const selectedRule = import_react.useMemo(() => routingRules.find((r) => r.id === selectedRuleId) || null, [routingRules, selectedRuleId]);
	const selectedAgent = import_react.useMemo(() => agents.find((a) => a.id === selectedNodeId) || null, [agents, selectedNodeId]);
	const selectedHostData = import_react.useMemo(() => {
		if (!selectedNodeId || !selectedNodeId.startsWith("host:")) return null;
		return nodes.find((n) => n.id === selectedNodeId)?.data || null;
	}, [nodes, selectedNodeId]);
	const selectedAgentNodeData = import_react.useMemo(() => {
		if (!selectedNodeId || selectedNodeId.startsWith("host:")) return null;
		return nodes.find((n) => n.id === selectedNodeId)?.data || null;
	}, [nodes, selectedNodeId]);
	const [ruleDraft, setRuleDraft] = import_react.useState({
		name: "",
		keywords: "",
		targetModel: "",
		reasoningEffort: "medium",
		priority: 10,
		enabled: true,
		requireDshReview: false
	});
	import_react.useEffect(() => {
		if (!selectedRule) return;
		setRuleDraft({
			name: selectedRule.name,
			keywords: selectedRule.matchKeywords.join(", "),
			targetModel: selectedRule.targetModel,
			reasoningEffort: selectedRule.reasoningEffort,
			priority: selectedRule.priority,
			enabled: selectedRule.enabled,
			requireDshReview: selectedRule.requireDshReview
		});
	}, [selectedRule]);
	const [agentDraft, setAgentDraft] = import_react.useState({
		modelHint: "",
		reasoningEffort: "medium"
	});
	import_react.useEffect(() => {
		if (!selectedAgent) return;
		setAgentDraft({
			modelHint: selectedAgent.modelHint || "",
			reasoningEffort: selectedAgent.reasoningEffort || "medium"
		});
	}, [selectedAgent]);
	const handleNodeDragStop = import_react.useCallback((_evt, draggedNode) => {
		const pos = {
			x: Math.round(draggedNode.position.x),
			y: Math.round(draggedNode.position.y)
		};
		if (lens === "cluster") {
			setClusterPositions((prev) => ({
				...prev,
				[draggedNode.id]: pos
			}));
			return;
		}
		if (readOnly || draggedNode.id.startsWith("host:")) return;
		onSavePositions({ [draggedNode.id]: pos });
	}, [
		lens,
		onSavePositions,
		readOnly
	]);
	const handleConnect = import_react.useCallback(async (connection) => {
		if (readOnly || !connection.source || !connection.target || connection.source === connection.target || connection.source.startsWith("host:") || connection.target.startsWith("host:")) return;
		const target = agents.find((a) => a.id === connection.target);
		const source = agents.find((a) => a.id === connection.source);
		if (!target || !source) return;
		setSaving(true);
		try {
			await onUpsertRule({
				name: `${source.harness} -> ${target.name}`,
				sourceAgentId: connection.source,
				targetAgentId: connection.target,
				matchKeywords: [target.harness, target.nodeId],
				targetModel: target.modelHint || orchestrationConfig.subModel,
				reasoningEffort: target.reasoningEffort || "medium",
				enabled: true,
				requireDshReview: target.harness === "dsh-expert"
			});
		} finally {
			setSaving(false);
		}
	}, [
		agents,
		onUpsertRule,
		orchestrationConfig.subModel,
		readOnly
	]);
	const handleSaveRule = async (e) => {
		e.preventDefault();
		if (!selectedRule || readOnly) return;
		setSaving(true);
		try {
			await onUpsertRule({
				id: selectedRule.id,
				name: ruleDraft.name,
				sourceAgentId: selectedRule.sourceAgentId,
				targetAgentId: selectedRule.targetAgentId,
				matchKeywords: ruleDraft.keywords,
				targetModel: ruleDraft.targetModel,
				reasoningEffort: ruleDraft.reasoningEffort,
				priority: ruleDraft.priority,
				enabled: ruleDraft.enabled,
				requireDshReview: ruleDraft.requireDshReview
			});
		} finally {
			setSaving(false);
		}
	};
	const handleSaveAgent = async (e) => {
		e.preventDefault();
		if (!selectedAgent || readOnly) return;
		setSaving(true);
		try {
			await onUpdateAgent(selectedAgent.id, {
				modelHint: agentDraft.modelHint,
				reasoningEffort: agentDraft.reasoningEffort
			});
		} finally {
			setSaving(false);
		}
	};
	const handleResetLayout = async () => {
		if (lens === "cluster") {
			setClusterPositions({});
			setTimeout(() => void fitView({
				padding: .14,
				duration: 220
			}), 80);
			return;
		}
		if (readOnly) return;
		await onSavePositions(computeResetPositions(agents, leadAgentId));
		setTimeout(() => void fitView({
			padding: .14,
			duration: 220
		}), 80);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		"data-testid": "agent-orchestration-canvas",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2.5 pb-3 border-b border-[var(--border-subtle)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
						value: lens,
						onChange: (next) => {
							setLens(next);
							if (next === "cluster") {
								setSelectedRuleId(null);
								if (!selectedNodeId && (leadAgentId || agents[0]?.id)) setSelectedNodeId(leadAgentId || agents[0]?.id || null);
							}
						},
						options: LENS_OPTIONS,
						ariaLabel: "切换画布视图维度"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
						value: orchestrationConfig.mode,
						onChange: (next) => {
							if (!readOnly) onUpdateConfig({ mode: next });
						},
						options: MODE_OPTIONS,
						ariaLabel: "切换 Agent 协同调度模式"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink-muted)] cursor-pointer select-none whitespace-nowrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								disabled: readOnly,
								checked: orchestrationConfig.worktreeIsolation,
								onChange: (e) => void onUpdateConfig({ worktreeIsolation: e.target.checked }),
								className: "accent-[var(--accent)]"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "size-3.5 text-[var(--ink-subtle)]" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Git Worktree 隔离" })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "inline-flex items-center gap-1.5 text-[12.5px] text-[var(--ink-muted)] cursor-pointer select-none whitespace-nowrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								disabled: readOnly,
								checked: orchestrationConfig.dshReviewGate.enabled,
								onChange: (e) => void onUpdateConfig({ dshReviewGate: {
									...orchestrationConfig.dshReviewGate,
									enabled: e.target.checked
								} }),
								className: "accent-[var(--accent)]"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-3.5 text-[var(--ok)]" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"DSH 专家门禁 (≥",
								orchestrationConfig.dshReviewGate.minScore,
								"分)"
							] })
						]
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-x-5 gap-y-2 pt-2.5 border-t border-[var(--border-subtle)]/70 text-[12px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-x-5 gap-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-subtle)] font-medium whitespace-nowrap",
								children: "主模型"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								disabled: readOnly,
								"aria-label": "主模型选择",
								value: orchestrationConfig.mainModel,
								onChange: (e) => void onUpdateConfig({ mainModel: e.target.value }),
								className: cn("ui-select h-8 pl-2.5 text-[12px] font-mono cursor-pointer min-w-0 w-[180px]", inputBaseClass),
								children: MODEL_PRESETS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: m,
									children: m
								}, m))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								disabled: readOnly,
								"aria-label": "主模型思考强度",
								value: orchestrationConfig.mainEffort,
								onChange: (e) => void onUpdateConfig({ mainEffort: e.target.value }),
								className: cn("ui-select h-8 pl-2 text-[12px] font-mono cursor-pointer min-w-0", inputBaseClass),
								children: EFFORT_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: opt.value,
									children: opt.short
								}, opt.value))
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-subtle)] font-medium whitespace-nowrap",
								children: "子模型"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								disabled: readOnly,
								"aria-label": "子模型选择",
								value: orchestrationConfig.subModel,
								onChange: (e) => void onUpdateConfig({ subModel: e.target.value }),
								className: cn("ui-select h-8 pl-2.5 text-[12px] font-mono cursor-pointer min-w-0 w-[180px]", inputBaseClass),
								children: MODEL_PRESETS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: m,
									children: m
								}, m))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								disabled: readOnly,
								"aria-label": "子模型思考强度",
								value: orchestrationConfig.subEffort,
								onChange: (e) => void onUpdateConfig({ subEffort: e.target.value }),
								className: cn("ui-select h-8 pl-2 text-[12px] font-mono cursor-pointer min-w-0", inputBaseClass),
								children: EFFORT_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: opt.value,
									children: opt.short
								}, opt.value))
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
					"data-testid": "cluster-connectivity-summary",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[var(--ink-muted)]",
							children: [
								"Agent ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
									className: "text-[var(--ink)]",
									children: [
										clusterStats.onlineAgents,
										"/",
										clusterStats.totalAgents
									]
								}),
								" 在线"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: "·"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["宿主机 ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
							className: "text-[var(--ink)]",
							children: [
								clusterStats.onlineHosts,
								"/",
								clusterStats.totalHosts
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: "·"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["路由 ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
							className: "text-[var(--ink)]",
							children: [
								clusterStats.activeLinks,
								"/",
								clusterStats.totalLinks
							]
						})] }),
						clusterStats.avgLatencyMs != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: "·"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"平均 ",
							clusterStats.avgLatencyMs,
							"ms"
						] })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: "·"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Skill ", clusterStats.totalMountedSkills] })
					]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("xl:col-span-8 min-w-0 relative rounded-xl border border-[var(--border)] bg-[var(--flow-bg)] overflow-hidden ops-flow", canvasHeightClass),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_a, {
						nodes,
						edges,
						nodeTypes: NODE_TYPES,
						onNodesChange,
						onEdgesChange,
						onNodeDragStop: handleNodeDragStop,
						onConnect: (conn) => void handleConnect(conn),
						onNodeClick: (_e, node) => {
							setSelectedNodeId(node.id);
							setSelectedRuleId(null);
						},
						onEdgeClick: (_e, edge) => {
							if (edge.id.startsWith("host-link:")) return;
							setSelectedRuleId(edge.id);
							setSelectedNodeId(null);
						},
						onPaneClick: () => {
							setSelectedNodeId(null);
							setSelectedRuleId(null);
						},
						fitView: true,
						fitViewOptions: { padding: .14 },
						minZoom: .35,
						maxZoom: 1.6,
						proOptions: { hideAttribution: true },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ua, {
							variant: Ra.Dots,
							gap: 18,
							size: 1,
							color: "var(--flow-dot)"
						}), showMiniMap && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Co, {
							pannable: true,
							zoomable: true,
							position: "top-right",
							style: {
								width: 148,
								height: 92,
								backgroundColor: "var(--surface-elevated)",
								border: "1px solid var(--border)",
								borderRadius: 10
							},
							maskColor: "rgba(15, 23, 42, 0.25)",
							nodeColor: (node) => {
								if (node.type === "clusterHostNode") return "var(--ink-subtle)";
								const data = node.data;
								if (data?.isLead) return "var(--accent)";
								if (data?.isDshExpert) return "var(--ok-dot)";
								return "var(--ink-muted)";
							}
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-2 pointer-events-none",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)]/92 border border-[var(--border)] font-mono text-[11px] text-[var(--ink-muted)] backdrop-blur-sm",
							children: lens === "cluster" ? "宿主机 → Agent 集群连接状态 · 点击节点查看 Skill、版本与实时延迟 · 拖拽自定义布局" : "拖拽节点排版 · 从右侧圆点拉线新增路由 · 点击节点查看 Skill 与版本 · 点击连线调优模型"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/92 p-1 backdrop-blur-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowMiniMap((prev) => !prev),
								"aria-label": "切换鹰眼缩略图",
								title: "切换缩略图",
								className: cn("h-7 w-7 rounded flex items-center justify-center cursor-pointer transition-colors", showMiniMap ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]", FOCUS_RING),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Map$1, { className: "size-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void fitView({
									padding: .14,
									duration: 200
								}),
								"aria-label": "自适应居中视图",
								title: "自适应居中",
								className: cn("h-7 w-7 rounded flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer", FOCUS_RING),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize2, { className: "size-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void zoomIn({ duration: 150 }),
								"aria-label": "放大画布",
								className: cn("h-7 w-7 rounded flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer", FOCUS_RING),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void zoomOut({ duration: 150 }),
								"aria-label": "缩小画布",
								className: cn("h-7 w-7 rounded flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer", FOCUS_RING),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void handleResetLayout(),
								"aria-label": "重置节点排版",
								title: "重置默认拓扑排版",
								className: cn("h-7 w-7 rounded flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer", FOCUS_RING),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3.5" })
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("xl:col-span-4 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 p-4 flex flex-col overflow-hidden", canvasHeightClass),
				"data-testid": "canvas-inspector",
				children: [selectedRule ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSaveRule,
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[13.5px] font-semibold text-[var(--ink)]",
									children: "路由规则配置"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11px] text-[var(--ink-subtle)] truncate mt-0.5",
									children: [
										agents.find((a) => a.id === selectedRule.sourceAgentId)?.harness || selectedRule.sourceAgentId,
										" -> ",
										agents.find((a) => a.id === selectedRule.targetAgentId)?.name || selectedRule.targetAgentId
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								variant: "ghost",
								size: "icon",
								disabled: readOnly || saving,
								"aria-label": "删除路由规则",
								onClick: () => {
									onDeleteRule(selectedRule.id).then(() => setSelectedRuleId(null));
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, { className: "size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]" })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-1 text-[12px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "规则名称"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								disabled: readOnly,
								value: ruleDraft.name,
								onChange: (e) => setRuleDraft((d) => ({
									...d,
									name: e.target.value
								})),
								className: cn("w-full h-8 px-2.5 text-[12.5px]", inputBaseClass)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-1 text-[12px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "任务触发关键词 (逗号分隔)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								disabled: readOnly,
								value: ruleDraft.keywords,
								onChange: (e) => setRuleDraft((d) => ({
									...d,
									keywords: e.target.value
								})),
								placeholder: "pi, 脚本, 快速, lint",
								"data-testid": "rule-keywords-input",
								className: cn("w-full h-8 px-2.5 font-mono text-[12px]", inputBaseClass)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "指定执行模型"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									list: "ops-model-presets",
									disabled: readOnly,
									value: ruleDraft.targetModel,
									onChange: (e) => setRuleDraft((d) => ({
										...d,
										targetModel: e.target.value
									})),
									className: cn("w-full h-8 px-2.5 font-mono text-[12px]", inputBaseClass)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "思考强度 (Effort)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									disabled: readOnly,
									value: ruleDraft.reasoningEffort,
									onChange: (e) => setRuleDraft((d) => ({
										...d,
										reasoningEffort: e.target.value
									})),
									"data-testid": "rule-effort-select",
									className: cn("ui-select w-full h-8 pl-2.5 text-[12px] cursor-pointer min-w-0", inputBaseClass),
									children: EFFORT_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: opt.value,
										children: opt.label
									}, opt.value))
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2.5 items-center pt-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "优先级 (越小越先匹配)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									max: 999,
									disabled: readOnly,
									value: ruleDraft.priority,
									onChange: (e) => setRuleDraft((d) => ({
										...d,
										priority: Number(e.target.value) || 10
									})),
									className: cn("w-full h-8 px-2.5 font-mono text-[12px]", inputBaseClass)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5 pt-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-2 text-[12px] text-[var(--ink)] cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										disabled: readOnly,
										checked: ruleDraft.enabled,
										onChange: (e) => setRuleDraft((d) => ({
											...d,
											enabled: e.target.checked
										})),
										className: "accent-[var(--accent)]"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "启用该路由边" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-2 text-[12px] text-[var(--ink)] cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										disabled: readOnly,
										checked: ruleDraft.requireDshReview,
										onChange: (e) => setRuleDraft((d) => ({
											...d,
											requireDshReview: e.target.checked
										})),
										className: "accent-[var(--accent)]"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "完成后过 DSH 评审" })]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-2 flex items-center justify-end gap-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "submit",
								variant: "primary",
								size: "sm",
								disabled: readOnly || saving,
								"data-testid": "save-rule-btn",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-3.5" }), saving ? "保存中..." : "保存路由策略"]
							})
						})
					]
				}) : selectedAgent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSaveAgent,
					className: "flex flex-col h-full min-h-0 gap-3",
					"data-testid": "inspector-agent-panel",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pb-2.5 border-b border-[var(--border-subtle)] space-y-1 shrink-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[14px] font-semibold text-[var(--ink)] truncate",
										children: selectedAgent.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: selectedAgent.status })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
									children: [
										selectedAgent.harness,
										" · 当前 v",
										selectedAgent.version || "1.0",
										selectedAgent.updateAvailable && selectedAgent.latestVersion ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[var(--warn)] font-medium",
											children: [
												" (最新 v",
												selectedAgent.latestVersion,
												")"
											]
										}) : " (已最新)",
										" · ",
										"A2A v",
										selectedAgent.protocolVersion || "0.3"
									]
								}),
								selectedAgent.installPath && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11px] text-[var(--ink-subtle)] truncate",
									title: selectedAgent.installPath,
									children: ["路径：", selectedAgent.installPath]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pb-2.5 border-b border-[var(--border-subtle)] text-[12px] space-y-1 shrink-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2 text-[var(--ink-muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-medium text-[var(--ink)] inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Network, { className: "size-3.5 text-[var(--accent)]" }), "集群节点连接"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[11.5px] tabular-nums",
									children: selectedAgent.latencyMs != null ? `A2A ${selectedAgent.latencyMs}ms` : selectedAgentNodeData?.hostTelemetry?.rttMs != null ? `RTT ${selectedAgentNodeData.hostTelemetry.rttMs}ms` : "本地直连"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums",
								children: [
									selectedAgentNodeData?.hostTelemetry?.name || selectedAgent.nodeName,
									selectedAgentNodeData?.hostTelemetry?.tailscaleIp ? ` · ${selectedAgentNodeData.hostTelemetry.tailscaleIp}` : "",
									selectedAgentNodeData?.hostTelemetry?.cpuPct != null ? ` · CPU ${selectedAgentNodeData.hostTelemetry.cpuPct}%` : ""
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-h-0 flex flex-col pb-2.5 border-b border-[var(--border-subtle)]",
							"data-testid": "inspector-agent-skills",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center justify-between text-[12px] shrink-0 mb-1.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-medium text-[var(--ink)] inline-flex items-center gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "size-3.5 text-[var(--accent)]" }),
										"当前 Skill 与版本 (",
										selectedAgentNodeData?.skills.length || 0,
										")"
									]
								})
							}), (selectedAgentNodeData?.skills.length || 0) === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[12px] text-[var(--ink-subtle)]",
								children: "尚未装载 Skill。"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "flex-1 min-h-0 overflow-y-auto pr-1 divide-y divide-[var(--border-subtle)]/70 text-[12px]",
								children: (selectedAgentNodeData?.skills || []).map((sk) => {
									const catalogMatch = sk.catalogItemId ? skillCatalog.find((c) => c.id === sk.catalogItemId) : null;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "py-1.5 first:pt-0 last:pb-0 flex items-start justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-medium text-[var(--ink)] truncate",
												children: sk.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums",
												children: [
													"v",
													sk.version,
													" · ",
													sk.provider,
													sk.updateAvailable && sk.latestVersion && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-[var(--warn)] ml-1",
														children: ["→ v", sk.latestVersion]
													})
												]
											})]
										}), catalogMatch && onToggleSkillAgent && !readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => void onToggleSkillAgent(catalogMatch, selectedAgent.id),
											className: cn("shrink-0 text-[11px] font-medium text-[var(--ink-subtle)] hover:text-[var(--err)] transition-colors cursor-pointer", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
											title: "从当前 Agent 卸载该 Skill",
											children: "卸载"
										})]
									}, sk.id);
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "shrink-0 space-y-2.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1 text-[12px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[var(--ink-muted)]",
											children: "默认模型"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											list: "ops-model-presets",
											disabled: readOnly,
											value: agentDraft.modelHint,
											onChange: (e) => setAgentDraft((d) => ({
												...d,
												modelHint: e.target.value
											})),
											className: cn("w-full h-8 px-2.5 font-mono text-[12px]", inputBaseClass)
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1 text-[12px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[var(--ink-muted)]",
											children: "思考强度"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											disabled: readOnly,
											value: agentDraft.reasoningEffort,
											onChange: (e) => setAgentDraft((d) => ({
												...d,
												reasoningEffort: e.target.value
											})),
											className: cn("ui-select w-full h-8 pl-2 text-[12px] cursor-pointer min-w-0", inputBaseClass),
											children: EFFORT_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: opt.value,
												children: opt.label
											}, opt.value))
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11px] text-[var(--ink-subtle)] truncate",
									children: [
										"绑定 MCP (",
										selectedAgent.boundMcpIds.length,
										")：",
										selectedAgent.boundMcpIds.join(", ") || "未绑定"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2 pt-0.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											type: "submit",
											variant: "primary",
											size: "sm",
											disabled: readOnly || saving,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-3.5" }), "保存参数"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											type: "button",
											variant: "secondary",
											size: "sm",
											onClick: () => void onDiscoverAgent(selectedAgent),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "size-3.5 text-[var(--accent)]" }), "探活"]
										}),
										selectedAgent.id !== leadAgentId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											type: "button",
											variant: "secondary",
											size: "sm",
											disabled: readOnly,
											onClick: () => void onSetLead(selectedAgent.id),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "size-3.5 text-[var(--accent)]" }), "设为主 Agent"]
										}),
										onInspectLogs && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "secondary",
											size: "sm",
											onClick: () => onInspectLogs(selectedAgent.id),
											"data-testid": "inspector-open-logs-btn",
											children: "实时日志"
										})
									]
								})
							]
						})
					]
				}) : selectedHostData ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3.5",
					"data-testid": "inspector-host-panel",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pb-2.5 border-b border-[var(--border-subtle)] space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[14px] font-semibold text-[var(--ink)] truncate",
									children: selectedHostData.host.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: selectedHostData.host.status })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
								children: [
									selectedHostData.host.id,
									selectedHostData.host.region ? ` · ${selectedHostData.host.region}` : "",
									selectedHostData.host.os ? ` · ${selectedHostData.host.os}` : ""
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3 text-[12px] font-mono tabular-nums",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-[var(--ink-subtle)]",
									children: "Tailscale / 内网地址"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-0.5 text-[var(--ink)]",
									children: selectedHostData.host.tailscaleIp || "127.0.0.1"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-[var(--ink-subtle)]",
									children: "节点延迟 (RTT)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-0.5 text-[var(--ink)]",
									children: selectedHostData.host.rttMs != null ? `${selectedHostData.host.rttMs}ms` : "本地直连"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-[var(--ink-subtle)]",
									children: "CPU 使用率"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-0.5 text-[var(--ink)]",
									children: selectedHostData.host.cpuPct != null ? `${selectedHostData.host.cpuPct}%` : "-"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-[var(--ink-subtle)]",
									children: "内存水位"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-0.5 text-[var(--ink)]",
									children: selectedHostData.host.memPct != null ? `${selectedHostData.host.memPct}%` : "-"
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pt-2.5 border-t border-[var(--border-subtle)] space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[12px] font-medium text-[var(--ink)]",
								children: [
									"运行于此节点的 Agent (",
									selectedHostData.hostedAgentIds.length,
									")"
								]
							}), selectedHostData.hostedAgentIds.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[12px] text-[var(--ink-subtle)]",
								children: "该节点暂未接入外部 Agent Harness。"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "divide-y divide-[var(--border-subtle)] text-[12.5px]",
								children: selectedHostData.hostedAgentIds.map((aid) => {
									const peer = agents.find((a) => a.id === aid);
									if (!peer) return null;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
										className: "py-2 first:pt-0",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setSelectedNodeId(peer.id),
											className: cn("w-full text-left flex items-center justify-between gap-2 hover:text-[var(--accent)] transition-colors cursor-pointer", FOCUS_RING),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "font-medium text-[var(--ink)] truncate",
													children: peer.name
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums",
													children: [
														peer.harness,
														" · v",
														peer.version || "1.0",
														" · ",
														peer.skills.length,
														" Skills"
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: peer.status })]
										})
									}, aid);
								})
							})]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 text-[12.5px] text-[var(--ink-muted)] my-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-4 text-[var(--accent)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Agent 编排与集群拓扑指南" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "space-y-2 leading-relaxed",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "1. 点击任意 Agent 节点，即可查看当前装载的 Skill 清单、版本升级状态及宿主机连接延迟。" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "2. 切换至「集群连接拓扑」可直观查看每台宿主机 / VPS 节点承载的 Agent 与跨节点协作链路。" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "3. 在「路由编排」中拖动节点调整布局，或从节点右侧手柄拉线创建自定义模型与思考强度路由。" })
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
					id: "ops-model-presets",
					children: MODEL_PRESETS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: m }, m))
				})]
			})]
		})]
	});
}
function AgentOrchestrationCanvas$2(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(pa, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CanvasInner, { ...props }) });
}
// web/components/A2AOrchestratorSection.tsx
var AgentOrchestrationCanvas$1 = import_react.lazy(() => __vitePreload(() => import("./AgentOrchestrationCanvas-9t9HPMaW.js").then((m) => ({ default: m.AgentOrchestrationCanvas })), []));
var STUDIO_TABS = [
	{
		value: "canvas",
		label: "可视化编排与调度"
	},
	{
		value: "agents",
		label: "Agent 与自动发现"
	},
	{
		value: "skills",
		label: "Skill 与 DSH 专家"
	},
	{
		value: "sessions",
		label: "多端会话同步"
	}
];
var HARNESS_OPTIONS = [
	{
		value: "codex-cli",
		label: "Codex CLI"
	},
	{
		value: "pi-agent",
		label: "Pi Coding Agent"
	},
	{
		value: "claude-code",
		label: "Claude Code"
	},
	{
		value: "gemini-cli",
		label: "Gemini CLI / Antigravity"
	},
	{
		value: "opencode",
		label: "OpenCode"
	},
	{
		value: "dsh-expert",
		label: "DSH 专家评审插件"
	},
	{
		value: "langgraph",
		label: "LangGraph"
	},
	{
		value: "crewai",
		label: "CrewAI"
	},
	{
		value: "custom-a2a",
		label: "Custom A2A Agent"
	}
];
var SKILL_PROVIDERS = [
	{
		value: "dsh-plugin",
		label: "DSH 插件"
	},
	{
		value: "pi-skill",
		label: "Pi Skill"
	},
	{
		value: "codex-skill",
		label: "Codex Skill"
	},
	{
		value: "claude-skill",
		label: "Claude Skill"
	},
	{
		value: "a2a-card",
		label: "A2A Card Skill"
	}
];
var SYNC_MODE_OPTIONS = [
	{
		value: "a2a-context-bus",
		label: "A2A Context Bus (contextId 实时广播)"
	},
	{
		value: "nmem-shared",
		label: "NMEM 共享语义记忆桥"
	},
	{
		value: "git-worktree",
		label: "Git Worktree 分支镜像同步"
	}
];
var TASK_PRESETS = [
	{
		label: "Pi 极速脚本修缮",
		mode: "lead-router",
		prompt: "请路由给 Pi 快速修复本地 lint 脚本并整理格式化配置（低思考强度即可）。",
		requireDshReview: false
	},
	{
		label: "Swarm 蜂群重构 + DSH 会审",
		mode: "swarm",
		prompt: "使用自动蜂群拆分前端组件与后端接口重构，在独立 Worktree 并行执行并通过 DSH 专家评审门禁。",
		requireDshReview: true
	},
	{
		label: "法兰克福安全与 TLS 审计",
		mode: "lead-router",
		prompt: "委派法兰克福中继 VPS 审计 nftables 公网端口与欧洲 DERP 延迟并输出安全结论。",
		requireDshReview: true
	}
];
function modeLabel(mode) {
	if (mode === "swarm") return "自动蜂群 Swarm";
	if (mode === "main-sub") return "主子模型分层";
	return "主控路由";
}
function taskStateStatus(state) {
	if (state === "completed") return "healthy";
	if (state === "working" || state === "submitted" || state === "reviewing") return "degraded";
	if (state === "failed") return "failed";
	return "standby";
}
function taskStateLabel(state) {
	if (state === "completed") return "已完成";
	if (state === "working") return "执行中";
	if (state === "reviewing") return "DSH 会审中";
	if (state === "submitted") return "已提交";
	if (state === "failed") return "失败";
	if (state === "canceled") return "已取消";
	return state;
}
function A2AOrchestratorSection({ snapshot, readOnly, onSnapshotChanged, onToast, onConfirm }) {
	const fleetNodes = snapshot?.fleet?.nodes || [];
	const [studioTab, setStudioTab] = import_react.useState("canvas");
	const [state, setState] = import_react.useState(null);
	const [fleetMcps, setFleetMcps] = import_react.useState([]);
	const [loading, setLoading] = import_react.useState(true);
	const [busyKey, setBusyKey] = import_react.useState("");
	const [selectedLeadDraft, setSelectedLeadDraft] = import_react.useState("");
	const [prompt, setPrompt] = import_react.useState("");
	const [targetAgentId, setTargetAgentId] = import_react.useState("auto");
	const [dispatchMode, setDispatchMode] = import_react.useState("inherit");
	const [effortOverride, setEffortOverride] = import_react.useState("auto");
	const [sessionId, setSessionId] = import_react.useState("");
	const [requireDshReview, setRequireDshReview] = import_react.useState(false);
	const [dispatchBusy, setDispatchBusy] = import_react.useState(false);
	const [expandedTaskIds, setExpandedTaskIds] = import_react.useState({});
	const [editingMcpAgentId, setEditingMcpAgentId] = import_react.useState("");
	const [handoffDrafts, setHandoffDrafts] = import_react.useState({});
	const [regOpen, setRegOpen] = import_react.useState(false);
	const [regBusy, setRegBusy] = import_react.useState(false);
	const [regForm, setRegForm] = import_react.useState({
		name: "",
		harness: "pi-agent",
		nodeId: "workstation-mac",
		agentCardUrl: "http://100.64.0.45:9106/.well-known/agent-card.json",
		rpcUrl: "",
		modelHint: "claude-sonnet-4-6",
		reasoningEffort: "medium",
		skills: "fast-edit, terminal-ops",
		setAsLead: false,
		description: ""
	});
	const [skillOpen, setSkillOpen] = import_react.useState(false);
	const [skillForm, setSkillForm] = import_react.useState({
		name: "",
		version: "1.0.0",
		provider: "dsh-plugin",
		description: ""
	});
	const [sessionOpen, setSessionOpen] = import_react.useState(false);
	const [sessionForm, setSessionForm] = import_react.useState({
		title: "",
		syncMode: "a2a-context-bus",
		gitBranch: "",
		primaryAgentId: ""
	});
	const loadAll = import_react.useCallback(async (signal) => {
		try {
			const [a2aRes, mcpRes] = await Promise.all([fetchA2AState(signal), fetchMcps("", signal).catch(() => null)]);
			if (!signal?.aborted) {
				setState(a2aRes);
				setSelectedLeadDraft(a2aRes.leadAgentId || "");
				if (mcpRes?.items) setFleetMcps(mcpRes.items);
			}
		} catch (err) {
			if (!signal?.aborted) onToast(`加载 Agent 编排状态失败：${err.message}`, "err");
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, [onToast]);
	import_react.useEffect(() => {
		const controller = new AbortController();
		loadAll(controller.signal);
		return () => controller.abort();
	}, [loadAll]);
	const handleSetLead = async (agentId) => {
		if (!agentId) return;
		if (readOnly) {
			onToast("只读模式已禁用切换主 Agent", "err");
			return;
		}
		setBusyKey(`lead:${agentId}`);
		try {
			onToast(`已选举「${(await setLeadA2AAgent(agentId)).leadAgent?.name || agentId}」为当前主 Agent (Lead Harness)`, "ok");
			await loadAll();
			onSnapshotChanged();
		} catch (err) {
			onToast(`切换主 Agent 失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const handleUpdateConfig = async (patch) => {
		if (readOnly) return;
		try {
			await updateA2AOrchestrationConfig(patch);
			await loadAll();
			onToast("编排调度策略已更新并持久化", "ok");
		} catch (err) {
			onToast(`更新策略失败：${err.message}`, "err");
		}
	};
	const handleSavePositions = async (positions) => {
		if (readOnly) return;
		try {
			await saveA2ATopologyPositions(positions);
			await loadAll();
		} catch (err) {
			onToast(`保存画布布局失败：${err.message}`, "err");
		}
	};
	const handleUpsertRule = async (payload) => {
		if (readOnly) return;
		try {
			const res = await upsertA2ARoutingRule(payload);
			onToast(`已保存路由策略「${res.rule.name}」(${res.rule.targetModel} · ${res.rule.reasoningEffort})`, "ok");
			await loadAll();
		} catch (err) {
			onToast(`保存路由失败：${err.message}`, "err");
		}
	};
	const handleDeleteRule = async (ruleId) => {
		if (readOnly) return;
		try {
			await deleteA2ARoutingRule(ruleId);
			onToast("已移除该可视化路由边", "ok");
			await loadAll();
		} catch (err) {
			onToast(`删除路由失败：${err.message}`, "err");
		}
	};
	const handleDiscoverLocal = async () => {
		setBusyKey("discover-local");
		try {
			const res = await discoverLocalA2AAgents();
			const outdated = res.items.filter((i) => i.updateAvailable).length;
			onToast(`扫描完成：共识别 ${res.discoveredCount} 个已安装 Harness（新纳入 ${res.newlyRegistered} 个${outdated > 0 ? `，${outdated} 个有新版本` : ""}）`, "ok");
			await loadAll();
			onSnapshotChanged();
		} catch (err) {
			onToast(`自动发现失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const handleDiscover = async (agent) => {
		setBusyKey(`discover:${agent.id}`);
		try {
			const res = await discoverA2AAgent(agent.id);
			if (res.ok) onToast(`${agent.name}：${res.summary || "Agent Card 验证通过"}`, "ok");
			else onToast(`${agent.name} Agent Card 探活失败：${res.error || "不可达"}`, "err");
			await loadAll();
			onSnapshotChanged();
		} catch (err) {
			onToast(`Agent Card 探活失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const handleUpdateAgent = async (agentId, patch) => {
		if (readOnly) {
			onToast("只读模式已禁用修改 Agent 配置", "err");
			return;
		}
		setBusyKey(`agent:${agentId}`);
		try {
			await updateA2AAgent(agentId, patch);
			await loadAll();
			onSnapshotChanged();
			onToast("Agent 参数已更新", "ok");
		} catch (err) {
			onToast(`更新失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const handleToggleBoundMcp = async (agent, mcpId) => {
		if (readOnly) return;
		const next = agent.boundMcpIds.includes(mcpId) ? agent.boundMcpIds.filter((id) => id !== mcpId) : [...agent.boundMcpIds, mcpId];
		await handleUpdateAgent(agent.id, { boundMcpIds: next });
	};
	const handleDeleteAgent = (agent) => {
		onConfirm({
			open: true,
			title: `移除外部 A2A Agent：${agent.name}`,
			description: `将从调度网络移除 ${agent.nodeName} 上的 ${agent.harness} 接入点，不会停止该节点本地进程。`,
			confirmLabel: "确认移除",
			danger: true,
			onConfirm: async () => {
				try {
					await deleteA2AAgent(agent.id);
					onToast(`已移除 ${agent.name}`, "ok");
					await loadAll();
					onSnapshotChanged();
				} catch (err) {
					onToast(`移除失败：${err.message}`, "err");
				}
			}
		});
	};
	const handleDispatchSubmit = async (e) => {
		e.preventDefault();
		if (readOnly) {
			onToast("只读模式已禁用派发任务", "err");
			return;
		}
		if (!prompt.trim()) {
			onToast("请输入需要主 Agent 编排或委派的任务指令", "err");
			return;
		}
		setDispatchBusy(true);
		try {
			const t = (await dispatchA2ATask({
				prompt: prompt.trim(),
				targetAgentId,
				executionMode: dispatchMode === "inherit" ? void 0 : dispatchMode,
				reasoningEffort: effortOverride === "auto" ? void 0 : effortOverride,
				requireDshReview: requireDshReview || void 0,
				sessionId: sessionId || void 0
			})).task;
			onToast(`任务 ${t.id} 已路由至 ${t.workerAgentName} (${t.appliedModel || "auto"} · ${t.appliedEffort || "med"})${t.dshReview ? ` · DSH ${t.dshReview.score}分` : ""}`, t.state === "failed" ? "err" : "ok");
			setPrompt("");
			setExpandedTaskIds((prev) => ({
				...prev,
				[t.id]: true
			}));
			await loadAll();
		} catch (err) {
			onToast(`任务派发失败：${err.message}`, "err");
		} finally {
			setDispatchBusy(false);
		}
	};
	const handleTriggerDshReview = async () => {
		if (readOnly) return;
		setBusyKey("dsh-trial");
		try {
			const dshAgent = agents.find((a) => a.harness === "dsh-expert");
			const res = await dispatchA2ATask({
				prompt: "对当前跨节点编排变更执行 DSH 多专家评审（架构一致性、安全边界、性能与测试覆盖）。",
				targetAgentId: dshAgent?.id || "auto",
				executionMode: "lead-router",
				reasoningEffort: "xhigh",
				requireDshReview: true
			});
			onToast(`DSH 专家评审完成：${res.task.dshReview?.score ?? 92}/100 (${res.task.dshReview?.verdict || "approve"})`, "ok");
			setStudioTab("canvas");
			setExpandedTaskIds((prev) => ({
				...prev,
				[res.task.id]: true
			}));
			await loadAll();
		} catch (err) {
			onToast(`DSH 评审触发失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const handleCancelTask = async (taskId) => {
		if (readOnly) return;
		try {
			await cancelA2ATask(taskId);
			onToast(`已取消任务 ${taskId}`, "ok");
			await loadAll();
		} catch (err) {
			onToast(`取消失败：${err.message}`, "err");
		}
	};
	const handleRegisterSubmit = async (e) => {
		e.preventDefault();
		if (readOnly) return;
		setRegBusy(true);
		try {
			onToast(`已注册外部 Harness「${(await registerA2AAgent({
				name: regForm.name.trim(),
				harness: regForm.harness,
				nodeId: regForm.nodeId,
				agentCardUrl: regForm.agentCardUrl.trim(),
				rpcUrl: regForm.rpcUrl.trim() || void 0,
				modelHint: regForm.modelHint.trim() || void 0,
				skills: regForm.skills,
				setAsLead: regForm.setAsLead,
				description: regForm.description.trim() || void 0
			})).agent.name}」至 A2A 编排网`, "ok");
			setRegOpen(false);
			setRegForm((prev) => ({
				...prev,
				name: "",
				rpcUrl: "",
				description: "",
				setAsLead: false
			}));
			await loadAll();
			onSnapshotChanged();
		} catch (err) {
			onToast(`注册失败：${err.message}`, "err");
		} finally {
			setRegBusy(false);
		}
	};
	const handleAddSkillSubmit = async (e) => {
		e.preventDefault();
		if (readOnly || !skillForm.name.trim()) return;
		setBusyKey("add-skill");
		try {
			const res = await upsertA2ASkill({
				name: skillForm.name.trim(),
				version: skillForm.version.trim() || "1.0.0",
				provider: skillForm.provider,
				description: skillForm.description.trim(),
				assignedAgentIds: state?.leadAgentId ? [state.leadAgentId] : []
			});
			onToast(`已安装 Skill「${res.skill.name}」v${res.skill.version}`, "ok");
			setSkillOpen(false);
			setSkillForm({
				name: "",
				version: "1.0.0",
				provider: "dsh-plugin",
				description: ""
			});
			await loadAll();
		} catch (err) {
			onToast(`新增 Skill 失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const handleToggleSkillAgent = async (skill, agentId) => {
		if (readOnly) return;
		try {
			await updateA2ASkill(skill.id, { toggleAgentId: agentId });
			await loadAll();
		} catch (err) {
			onToast(`更新 Skill 挂载失败：${err.message}`, "err");
		}
	};
	const handleToggleSkillEnabled = async (skill) => {
		if (readOnly) return;
		try {
			await updateA2ASkill(skill.id, { enabled: !skill.enabled });
			await loadAll();
		} catch (err) {
			onToast(`切换 Skill 状态失败：${err.message}`, "err");
		}
	};
	const handleDeleteSkill = async (skill) => {
		if (readOnly) return;
		try {
			await deleteA2ASkill(skill.id);
			onToast(`已移除 Skill「${skill.name}」`, "ok");
			await loadAll();
		} catch (err) {
			onToast(`删除 Skill 失败：${err.message}`, "err");
		}
	};
	const handleCreateSession = async (e) => {
		e.preventDefault();
		if (readOnly || !sessionForm.title.trim()) return;
		setBusyKey("add-session");
		try {
			onToast(`已创建跨端对齐会话 ${(await createA2ASession({
				title: sessionForm.title.trim(),
				syncMode: sessionForm.syncMode,
				gitBranch: sessionForm.gitBranch.trim() || void 0,
				primaryAgentId: sessionForm.primaryAgentId || state?.leadAgentId || void 0,
				syncedNodes: fleetNodes.filter((n) => n.status !== "offline").slice(0, 3).map((n) => n.id)
			})).session.contextId}`, "ok");
			setSessionOpen(false);
			setSessionForm({
				title: "",
				syncMode: "a2a-context-bus",
				gitBranch: "",
				primaryAgentId: ""
			});
			await loadAll();
		} catch (err) {
			onToast(`创建会话失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const handleSyncSession = async (sess) => {
		if (readOnly) return;
		setBusyKey(`sync:${sess.id}`);
		try {
			const res = await syncA2ASession(sess.id);
			onToast(`会话 ${res.session.contextId} 已完成全端同步 (rev.${res.session.revision})`, "ok");
			await loadAll();
		} catch (err) {
			onToast(`同步失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const handleHandoffSession = async (sess) => {
		if (readOnly) return;
		const targetId = handoffDrafts[sess.id];
		if (!targetId || targetId === sess.primaryAgentId) return;
		setBusyKey(`handoff:${sess.id}`);
		try {
			const res = await handoffA2ASession(sess.id, targetId);
			const nextAgent = agents.find((a) => a.id === res.session.primaryAgentId);
			onToast(`会话 ${res.session.contextId} 已无损接力至 ${nextAgent?.name || targetId}`, "ok");
			await loadAll();
		} catch (err) {
			onToast(`接力失败：${err.message}`, "err");
		} finally {
			setBusyKey("");
		}
	};
	const agents = state?.agents || [];
	const routingRules = state?.routingRules || [];
	const skillCatalog = state?.skillCatalog || [];
	const sessions = state?.sessions || [];
	const tasks = state?.tasks || [];
	const leadAgent = state?.leadAgent || null;
	const workers = agents.filter((a) => a.id !== state?.leadAgentId);
	const cfg = state?.orchestrationConfig;
	const summary = state?.summary;
	const onlinePct = summary && summary.totalAgents > 0 ? Math.round(summary.onlineAgents / summary.totalAgents * 100) : 100;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		"data-testid": "a2a-orchestrator-section",
		children: [
			summary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiStrip, {
				asymmetric: true,
				cells: [
					{
						label: "主 Agent (Lead Harness)",
						meta: `${modeLabel(cfg?.mode)} · ${leadAgent?.harness || "未指定"}`,
						value: leadAgent ? leadAgent.name : "待选举",
						ratioPct: onlinePct,
						sub: `无内置自有 Harness · 主模型 ${cfg?.mainModel || "gpt-5-codex"} (${cfg?.mainEffort || "high"})`,
						tone: leadAgent ? "ok" : "warn"
					},
					{
						label: "纳管外部 Agent",
						value: `${summary.onlineAgents}/${summary.totalAgents}`,
						numeric: {
							primary: summary.onlineAgents,
							denominator: summary.totalAgents
						},
						sub: summary.outdatedAgents ? `${summary.outdatedAgents} 个 Harness 有新版本可升级` : `覆盖 ${summary.nodesWithAgents} 台节点与 DSH 插件`,
						tone: summary.outdatedAgents ? "warn" : "ok"
					},
					{
						label: "可视化路由与门禁",
						value: `${summary.enabledRules ?? routingRules.filter((r) => r.enabled).length}/${summary.totalRules ?? routingRules.length}`,
						numeric: {
							primary: summary.enabledRules ?? routingRules.filter((r) => r.enabled).length,
							denominator: summary.totalRules ?? routingRules.length
						},
						sub: cfg?.dshReviewGate?.enabled ? `DSH 专家门禁已开启 (≥${cfg.dshReviewGate.minScore}分)` : "DSH 专家门禁按规则触发"
					},
					{
						label: "多端同步会话",
						value: `${summary.syncedSessions ?? 0}/${summary.totalSessions ?? sessions.length}`,
						numeric: {
							primary: summary.syncedSessions ?? 0,
							denominator: summary.totalSessions ?? sessions.length
						},
						sub: `累计 ${summary.completedTasks}/${summary.totalTasks} 次 A2A/蜂群委派`
					}
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
					value: studioTab,
					onChange: setStudioTab,
					options: STUDIO_TABS,
					ariaLabel: "切换 Agent 编排工作台"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							disabled: busyKey === "discover-local",
							onClick: () => void handleDiscoverLocal(),
							"data-testid": "a2a-discover-local-btn",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radar, { className: cn("size-3.5 text-[var(--accent)]", busyKey === "discover-local" && "animate-spin") }), busyKey === "discover-local" ? "扫描中..." : "自动发现已安装 Agent"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							onClick: () => void loadAll(),
							disabled: loading,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
								className: cn("size-3.5", loading && "animate-spin"),
								strokeWidth: 1.75
							}), "刷新"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "primary",
							size: "sm",
							disabled: readOnly,
							onClick: () => setRegOpen(true),
							"data-testid": "a2a-register-btn",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
								className: "size-3.5",
								strokeWidth: 2
							}), "接入外部 Agent"]
						})
					]
				})]
			}),
			studioTab === "canvas" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "可视化拖拽编排画布",
					description: "自由拖动调整各节点与外部 Harness 拓扑，从节点连线自定义任务路由、目标模型与思考强度（low / medium / high / xhigh），并支持自动蜂群与主子模型分层。",
					children: cfg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
						fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
							heightClass: "h-[530px]",
							label: "正在加载 Agent 可视化编排画布"
						}),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentOrchestrationCanvas$1, {
							agents,
							fleetNodes,
							skillCatalog,
							routingRules,
							leadAgentId: state?.leadAgentId || null,
							orchestrationConfig: cfg,
							readOnly,
							onUpdateConfig: handleUpdateConfig,
							onSavePositions: handleSavePositions,
							onUpsertRule: handleUpsertRule,
							onDeleteRule: handleDeleteRule,
							onUpdateAgent: (id, patch) => handleUpdateAgent(id, patch),
							onSetLead: handleSetLead,
							onDiscoverAgent: handleDiscover,
							onToggleSkillAgent: handleToggleSkillAgent
						})
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
						heightClass: "h-[530px]",
						label: "正在加载拓扑编排"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						className: "lg:col-span-5 min-w-0",
						title: "主控任务与蜂群派发",
						description: "按画布路由规则自动匹配目标 Agent、模型与思考强度，或一键以 Swarm 自动蜂群并行拆解并过 DSH 专家评审。",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: handleDispatchSubmit,
							className: "space-y-3.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-subtle)]",
										children: "快捷场景："
									}), TASK_PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setPrompt(preset.prompt);
											setDispatchMode(preset.mode);
											setRequireDshReview(preset.requireDshReview);
										},
										className: cn("text-[var(--accent)] hover:underline cursor-pointer rounded", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
										children: preset.label
									}, preset.label))]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									rows: 3,
									value: prompt,
									onChange: (e) => setPrompt(e.target.value),
									placeholder: "输入任务目标（例如：交给 Pi 快速修脚本，或用 Swarm 蜂群重构并由 DSH 专家评审）...",
									"aria-label": "A2A 委派任务描述",
									"data-testid": "a2a-task-prompt",
									className: cn("w-full p-3 text-[13px] resize-none", inputBaseClass)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1 text-[12px] min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[var(--ink-muted)]",
											children: "目标路由"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: targetAgentId,
											onChange: (e) => setTargetAgentId(e.target.value),
											"aria-label": "目标 Worker Agent",
											className: cn("ui-select w-full min-w-0 h-8 pl-2.5 text-[12px] cursor-pointer truncate", inputBaseClass),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "auto",
												children: "按画布路由表自动匹配"
											}), agents.filter((a) => a.delegatable || a.id === state?.leadAgentId).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
												value: a.id,
												children: ["指定：", a.name]
											}, a.id))]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1 text-[12px] min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[var(--ink-muted)]",
											children: "执行模式"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: dispatchMode,
											onChange: (e) => setDispatchMode(e.target.value),
											"aria-label": "执行模式",
											"data-testid": "a2a-dispatch-mode",
											className: cn("ui-select w-full min-w-0 h-8 pl-2.5 text-[12px] cursor-pointer", inputBaseClass),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
													value: "inherit",
													children: [
														"跟随画布 (",
														modeLabel(cfg?.mode),
														")"
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "lead-router",
													children: "主控路由 (单点精准委派)"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "swarm",
													children: "自动蜂群 Swarm (并行拆解)"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "main-sub",
													children: "主子模型分层 (规划/执行分离)"
												})
											]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1 text-[12px] min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[var(--ink-muted)]",
											children: "思考强度覆盖"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: effortOverride,
											onChange: (e) => setEffortOverride(e.target.value),
											"aria-label": "思考强度覆盖",
											className: cn("ui-select w-full min-w-0 h-8 pl-2.5 text-[12px] cursor-pointer", inputBaseClass),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "auto",
												children: "跟随路由规则默认强度"
											}), EFFORT_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: opt.value,
												children: opt.label
											}, opt.value))]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1 text-[12px] min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[var(--ink-muted)]",
											children: "关联多端会话 (contextId)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: sessionId,
											onChange: (e) => setSessionId(e.target.value),
											"aria-label": "关联多端同步会话",
											className: cn("ui-select w-full min-w-0 h-8 pl-2.5 text-[12px] cursor-pointer truncate", inputBaseClass),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "",
												children: "新建独立上下文"
											}), sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
												value: s.id,
												children: [
													s.title,
													" (",
													s.contextId,
													")"
												]
											}, s.id))]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center justify-between gap-2 pt-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "inline-flex items-center gap-2 text-[12.5px] text-[var(--ink)] cursor-pointer select-none",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: requireDshReview,
											onChange: (e) => setRequireDshReview(e.target.checked),
											className: "accent-[var(--accent)]"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "强制附加 DSH 专家评审门禁" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										type: "submit",
										variant: "primary",
										size: "md",
										className: "shrink-0",
										disabled: readOnly || dispatchBusy || !leadAgent,
										"data-testid": "a2a-dispatch-btn",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {
											className: "size-3.5",
											strokeWidth: 1.75
										}), dispatchBusy ? "编排执行中..." : "按策略派发"]
									})]
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						className: "lg:col-span-7 min-w-0",
						title: "多任务队列、蜂群子任务与 DSH 评审回溯",
						description: "实时追踪主控路由命中规则、实际下发的模型与思考强度、并行 Worktree 子任务及 DSH 专家会审结论。",
						children: tasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "暂无调度记录，请在左侧输入任务测试可视化路由与蜂群协同。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "divide-y divide-[var(--border-subtle)]",
							"data-testid": "a2a-task-list",
							children: tasks.slice(0, 8).map((task) => {
								const expanded = Boolean(expandedTaskIds[task.id]);
								const canCancel = task.state === "submitted" || task.state === "working";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "py-3.5 first:pt-0 space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => setExpandedTaskIds((prev) => ({
													...prev,
													[task.id]: !prev[task.id]
												})),
												className: cn("min-w-0 flex-1 text-left flex items-start gap-1.5 cursor-pointer rounded", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
												children: [expanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5 mt-0.5 text-[var(--ink-subtle)] shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-3.5 mt-0.5 text-[var(--ink-subtle)] shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[13.5px] font-medium text-[var(--ink)] line-clamp-2",
													children: task.prompt
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
												status: taskStateStatus(task.state),
												label: taskStateLabel(task.state)
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "pl-5 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[var(--accent)] font-medium",
													children: modeLabel(task.executionMode)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[var(--ink-muted)]",
													children: task.leadAgentName
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-3 inline" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[var(--ink-muted)]",
													children: task.workerAgentName
												}),
												task.appliedModel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													task.appliedModel,
													" (",
													task.appliedEffort || "med",
													")"
												] })] }),
												task.dshReview && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: task.dshReview.verdict === "approve" ? "text-[var(--ok)] font-semibold" : "text-[var(--warn)] font-semibold",
													children: [
														"DSH ",
														task.dshReview.score,
														"/100"
													]
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [task.durationMs, "ms"] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatRelativeAge(task.createdAt) }),
												canCancel && !readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => void handleCancelTask(task.id),
													className: "ml-1 text-[var(--err)] hover:underline cursor-pointer",
													children: "取消"
												})
											]
										}),
										expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "pl-5 pt-2 space-y-3 text-[12px]",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "font-mono text-[11px] text-[var(--ink-subtle)] flex flex-wrap gap-x-2 gap-y-0.5",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: task.id }),
														task.contextId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· contextId: ", task.contextId] }),
														task.matchedRuleName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· 命中规则: ", task.matchedRuleName] }),
														task.worktreeBranch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· Worktree: ", task.worktreeBranch] })
													]
												}),
												Array.isArray(task.subtasks) && task.subtasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "space-y-1.5 pt-1 border-t border-[var(--border-subtle)]",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "text-[11.5px] font-semibold text-[var(--ink-muted)]",
														children: [
															"蜂群 / 分层并行子任务 (",
															task.subtasks.length,
															")"
														]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "space-y-1",
														children: task.subtasks.map((sub) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex flex-wrap items-baseline justify-between gap-2 text-[12px]",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																className: "min-w-0",
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																		className: "font-medium text-[var(--ink)]",
																		children: sub.role
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																		className: "mx-1.5 text-[var(--ink-subtle)]",
																		children: "·"
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																		className: "text-[var(--ink-muted)]",
																		children: sub.agentName
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																		className: "mx-1.5 text-[var(--ink-subtle)]",
																		children: "—"
																	}),
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																		className: "text-[var(--ink-muted)]",
																		children: sub.summary
																	})
																]
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "font-mono text-[11px] text-[var(--ink-subtle)] shrink-0",
																children: [
																	sub.model,
																	" · ",
																	sub.effort
																]
															})]
														}, sub.id))
													})]
												}),
												task.dshReview && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "space-y-1.5 pt-2 border-t border-[var(--border-subtle)]",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex flex-wrap items-center justify-between gap-2",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]",
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-3.5 text-[var(--ok)]" }), task.dshReview.reviewerName]
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "font-mono text-[12px] font-semibold text-[var(--ok)] tabular-nums",
																children: [
																	"综合评分 ",
																	task.dshReview.score,
																	"/100 · ",
																	task.dshReview.verdict.toUpperCase()
																]
															})]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums",
															children: task.dshReview.dimensions.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																d.name,
																": ",
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
																	className: "text-[var(--ink)]",
																	children: d.score
																})
															] }, d.name))
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
															className: "space-y-0.5 text-[var(--ink-muted)]",
															children: task.dshReview.findings.map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["• ", f] }, i))
														})
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
													className: "space-y-1 pt-1 border-t border-[var(--border-subtle)] text-[var(--ink-muted)]",
													children: task.steps.map((step, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
														className: "flex items-baseline gap-2",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "font-mono text-[11px] text-[var(--accent)] shrink-0",
															children: [
																"[",
																step.state,
																"]"
															]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: step.detail })]
													}, `${task.id}-s-${idx}`))
												}),
												task.artifact && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "pt-1.5 border-t border-[var(--border-subtle)] font-mono text-[11.5px] text-[var(--ink)] leading-relaxed",
													children: ["Artifact：", task.artifact]
												})
											]
										})
									]
								}, task.id);
							})
						})
					})]
				})]
			}),
			studioTab === "agents" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "主 Agent (Lead Harness) 选举控制面",
					description: "无内置自有 Harness：可随时将 Codex CLI / Pi / Claude Code / Gemini CLI 等任意节点外部 Harness 切换为主 Agent，并自动重锚定路由拓扑。",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col lg:flex-row lg:items-center justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1 space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, {
										className: "size-4 text-[var(--accent)] shrink-0",
										strokeWidth: 1.75
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[14.5px] font-semibold text-[var(--ink)]",
										children: leadAgent ? leadAgent.name : "尚未选定主 Agent"
									}),
									leadAgent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: leadAgent.status })
								]
							}), leadAgent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: leadAgent.nodeName
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										leadAgent.harness,
										" v",
										leadAgent.version || "1.0"
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										leadAgent.modelHint || "auto",
										" (",
										leadAgent.reasoningEffort || "high",
										")"
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										"A2A v",
										leadAgent.protocolVersion,
										" (Apache-2.0)"
									] })
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2 shrink-0 max-w-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: selectedLeadDraft,
								onChange: (e) => setSelectedLeadDraft(e.target.value),
								"aria-label": "选择主 Agent Harness",
								"data-testid": "a2a-lead-select",
								className: cn("ui-select h-9 pl-3 sm:text-[13px] min-w-0 max-w-full sm:min-w-[230px] cursor-pointer", inputBaseClass),
								children: agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: a.id,
									children: [
										a.name,
										" (",
										a.nodeId,
										")"
									]
								}, a.id))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "secondary",
								size: "md",
								disabled: readOnly || !selectedLeadDraft || selectedLeadDraft === state?.leadAgentId || busyKey.startsWith("lead:"),
								onClick: () => void handleSetLead(selectedLeadDraft),
								"data-testid": "a2a-elect-lead-btn",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, {
									className: "size-3.5 text-[var(--accent)]",
									strokeWidth: 1.75
								}), "设为主 Agent"]
							})]
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "已安装与纳管的外部 Agent 清单（含版本与思考强度）",
					description: "支持自动识别本机与探针节点已安装的 Codex / Pi / Claude Code / Gemini CLI / OpenCode 及 DSH 专家评审插件，可按 Agent 独立调节默认模型、思考强度与 MCP 权限。",
					bodyClassName: "p-0",
					children: agents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "尚未发现任何外部 Agent Harness，请点击上方「自动发现已安装 Agent」。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "divide-y divide-[var(--border-subtle)]",
						"data-testid": "a2a-agents-list",
						children: agents.map((agent) => {
							const isLead = agent.id === state?.leadAgentId;
							const editingMcps = editingMcpAgentId === agent.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: cn("px-5 sm:px-6 py-4 transition-colors", isLead ? "bg-[var(--accent-soft)]/45" : "hover:bg-[var(--surface-hover)]/60"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col xl:flex-row xl:items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1 space-y-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-center gap-2",
												children: [
													isLead && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, {
														className: "size-3.5 text-[var(--accent)] shrink-0",
														strokeWidth: 2
													}),
													agent.harness === "dsh-expert" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, {
														className: "size-3.5 text-[var(--ok)] shrink-0",
														strokeWidth: 2
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[14px] font-medium text-[var(--ink)]",
														children: agent.name
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: agent.status }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: cn("font-mono text-[11.5px]", isLead ? "text-[var(--accent)] font-semibold" : "text-[var(--ink-subtle)]"),
														children: isLead ? "主 Agent" : agent.delegatable ? "可调度 Worker" : "已暂停委派"
													}),
													agent.updateAvailable && agent.latestVersion && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-mono text-[11.5px] text-[var(--warn)]",
														children: [
															"可更新 v",
															agent.version,
															" -> v",
															agent.latestVersion
														]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[var(--ink-muted)]",
														children: agent.nodeName
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
														agent.harness,
														" v",
														agent.version || "1.0"
													] }),
													agent.installPath && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "truncate max-w-[220px]",
														title: agent.installPath,
														children: agent.installPath
													})] }),
													agent.latencyMs != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [agent.latencyMs, "ms"] })] })
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[12px] text-[var(--ink-muted)] truncate",
												children: ["技能：", agent.skills.map((s) => s.name).join(" · ") || "通用"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-mono text-[11.5px] text-[var(--ink-subtle)] truncate",
												children: [
													"绑定 MCP (",
													agent.boundMcpIds.length,
													")：",
													agent.boundMcpIds.length > 0 ? agent.boundMcpIds.join(" · ") : "未绑定"
												]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-2 shrink-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												disabled: readOnly,
												"aria-label": `${agent.name} 默认模型`,
												value: agent.modelHint || "",
												onChange: (e) => void handleUpdateAgent(agent.id, { modelHint: e.target.value }),
												className: cn("ui-select h-8 pl-2.5 text-[12px] font-mono cursor-pointer max-w-[165px]", inputBaseClass),
												children: [!MODEL_PRESETS.includes(agent.modelHint) && agent.modelHint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: agent.modelHint,
													children: agent.modelHint
												}), MODEL_PRESETS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: m,
													children: m
												}, m))]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												disabled: readOnly,
												"aria-label": `${agent.name} 思考强度`,
												value: agent.reasoningEffort || "medium",
												onChange: (e) => void handleUpdateAgent(agent.id, { reasoningEffort: e.target.value }),
												className: cn("ui-select h-8 pl-2 text-[12px] font-mono cursor-pointer", inputBaseClass),
												children: EFFORT_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
													value: opt.value,
													children: ["思考:", opt.short]
												}, opt.value))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												variant: "secondary",
												size: "sm",
												disabled: busyKey === `discover:${agent.id}`,
												onClick: () => void handleDiscover(agent),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, {
													className: "size-3.5 text-[var(--accent)]",
													strokeWidth: 1.75
												}), "探活"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => setEditingMcpAgentId(editingMcps ? "" : agent.id),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, {
													className: "size-3.5",
													strokeWidth: 1.75
												}), "MCP"]
											}),
											!isLead && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												variant: "ghost",
												size: "sm",
												disabled: readOnly || busyKey === `lead:${agent.id}`,
												onClick: () => void handleSetLead(agent.id),
												children: "设为主"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												variant: "ghost",
												size: "sm",
												disabled: readOnly,
												onClick: () => void handleUpdateAgent(agent.id, { delegatable: !agent.delegatable }),
												children: agent.delegatable ? "暂停委派" : "允许委派"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												variant: "ghost",
												size: "icon",
												disabled: readOnly,
												"aria-label": `移除 ${agent.name}`,
												onClick: () => handleDeleteAgent(agent),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, {
													className: "size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]",
													strokeWidth: 1.75
												})
											})
										]
									})]
								}), editingMcps && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[12px] font-medium text-[var(--ink-muted)]",
										children: [
											"为 ",
											agent.name,
											" 授权可调用的全节点 MCP 服务"
										]
									}), fleetMcps.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[12px] text-[var(--ink-subtle)]",
										children: "暂无可绑定的 MCP 服务"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5",
										children: fleetMcps.map((mcp) => {
											const bound = agent.boundMcpIds.includes(mcp.id);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 py-1 text-[12px] text-[var(--ink)] cursor-pointer",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "checkbox",
														disabled: readOnly,
														checked: bound,
														onChange: () => void handleToggleBoundMcp(agent, mcp.id),
														className: "accent-[var(--accent)]"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "truncate",
														children: mcp.name
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-mono text-[11px] text-[var(--ink-subtle)] shrink-0",
														children: [
															"(",
															mcp.nodeId,
															")"
														]
													})
												]
											}, mcp.id);
										})
									})]
								})]
							}, agent.id);
						})
					})
				})]
			}),
			studioTab === "skills" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "DSH 专家评审插件（融合专家代理与发布门禁）",
					description: "参考并融合你的 DSH 专家评审插件设计：将多视角专家会审作为独立插件化 Agent 嵌入调度链路，任何主从或蜂群产出均可自动过会审打分与阻断。",
					actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "primary",
						size: "sm",
						disabled: readOnly || busyKey === "dsh-trial",
						onClick: () => void handleTriggerDshReview(),
						"data-testid": "dsh-trial-review-btn",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-3.5" }), busyKey === "dsh-trial" ? "专家会审中..." : "试跑 DSH 专家会审"]
					}),
					children: cfg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 lg:grid-cols-12 gap-5 items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "lg:col-span-7 space-y-2 text-[13px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-2 text-[var(--ink)] cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										disabled: readOnly,
										checked: cfg.dshReviewGate.enabled,
										onChange: (e) => void handleUpdateConfig({ dshReviewGate: {
											...cfg.dshReviewGate,
											enabled: e.target.checked
										} }),
										className: "accent-[var(--accent)]"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "在蜂群与高风险路由上启用 DSH 自动门禁" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-2 text-[var(--ink)] cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										disabled: readOnly,
										checked: cfg.dshReviewGate.autoGateHighRisk,
										onChange: (e) => void handleUpdateConfig({ dshReviewGate: {
											...cfg.dshReviewGate,
											autoGateHighRisk: e.target.checked
										} }),
										className: "accent-[var(--accent)]"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "低于阈值自动退回主 Agent 重做" })]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-mono text-[12px] text-[var(--ink-muted)]",
								children: ["评审维度：", cfg.dshReviewGate.dimensions.join(" · ")]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "lg:col-span-5 flex flex-wrap items-center lg:justify-end gap-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "inline-flex items-center gap-2 text-[12.5px] text-[var(--ink-muted)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "最低放行分数" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: 50,
										max: 99,
										disabled: readOnly,
										value: cfg.dshReviewGate.minScore,
										onChange: (e) => void handleUpdateConfig({ dshReviewGate: {
											...cfg.dshReviewGate,
											minScore: Number(e.target.value) || 85
										} }),
										className: cn("w-20 h-8 px-2.5 font-mono text-center", inputBaseClass)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[12px]",
										children: "/ 100"
									})
								]
							})
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "跨 Agent Skill 与插件版本目录",
					description: "统一管理 DSH 插件、Pi Skill、Codex/Claude Skill 与 A2A Card 能力，勾选即可分发挂载给不同节点上的外部 Agent。",
					bodyClassName: "p-0",
					actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						disabled: readOnly,
						onClick: () => setSkillOpen((v) => !v),
						"data-testid": "a2a-add-skill-toggle",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "安装 / 注册 Skill"]
					}),
					children: [skillOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleAddSkillSubmit,
						className: "px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "sm:col-span-4 space-y-1 text-[12px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "Skill / 插件名称"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									required: true,
									value: skillForm.name,
									onChange: (e) => setSkillForm((s) => ({
										...s,
										name: e.target.value
									})),
									placeholder: "例如：DSH 安全合规审查",
									className: cn("w-full h-8 px-2.5", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "sm:col-span-2 space-y-1 text-[12px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "版本"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: skillForm.version,
									onChange: (e) => setSkillForm((s) => ({
										...s,
										version: e.target.value
									})),
									placeholder: "1.0.0",
									className: cn("w-full h-8 px-2.5 font-mono", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "sm:col-span-2 space-y-1 text-[12px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "生态来源"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: skillForm.provider,
									onChange: (e) => setSkillForm((s) => ({
										...s,
										provider: e.target.value
									})),
									className: cn("ui-select w-full h-8 pl-2.5 text-[12px] cursor-pointer", inputBaseClass),
									children: SKILL_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: p.value,
										children: p.label
									}, p.value))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "sm:col-span-3 space-y-1 text-[12px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "用途说明"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: skillForm.description,
									onChange: (e) => setSkillForm((s) => ({
										...s,
										description: e.target.value
									})),
									placeholder: "简述该 Skill 能力",
									className: cn("w-full h-8 px-2.5", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "sm:col-span-1 flex justify-end",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									variant: "primary",
									size: "sm",
									disabled: busyKey === "add-skill",
									children: "保存"
								})
							})
						]
					}), skillCatalog.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "尚未注册任何跨 Agent Skill。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "divide-y divide-[var(--border-subtle)]",
						"data-testid": "a2a-skills-list",
						children: skillCatalog.map((skill) => {
							const hasUpdate = skill.latestVersion && skill.latestVersion !== skill.version;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "px-5 sm:px-6 py-4 space-y-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col sm:flex-row sm:items-start justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 space-y-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "size-3.5 text-[var(--accent)] shrink-0" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[14px] font-medium text-[var(--ink)]",
													children: skill.name
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono text-[11.5px] text-[var(--ink-subtle)]",
													children: [
														"v",
														skill.version,
														" · ",
														skill.provider
													]
												}),
												hasUpdate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono text-[11.5px] text-[var(--warn)]",
													children: ["最新 v", skill.latestVersion]
												})
											]
										}), skill.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[12.5px] text-[var(--ink-muted)]",
											children: skill.description
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 shrink-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "sm",
											disabled: readOnly,
											onClick: () => void handleToggleSkillEnabled(skill),
											children: skill.enabled ? "停用" : "启用"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											disabled: readOnly,
											"aria-label": `移除 ${skill.name}`,
											onClick: () => void handleDeleteSkill(skill),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, { className: "size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]" })
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-subtle)]",
										children: "挂载至 Agent："
									}), agents.map((a) => {
										const checked = skill.assignedAgentIds.includes(a.id);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "inline-flex items-center gap-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												disabled: readOnly,
												checked,
												onChange: () => void handleToggleSkillAgent(skill, a.id),
												className: "accent-[var(--accent)]"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: a.name.split(" (")[0] })]
										}, a.id);
									})]
								})]
							}, skill.id);
						})
					})]
				})]
			}),
			studioTab === "sessions" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
				title: "多端 Agent 会话同步与跨设备接力（A2A contextId 对齐）",
				description: "借鉴 A2A contextId 协议与 Paseo / MultiAgents 跨端对齐机制：在 Mac、主控 Hub、云端 VPS 与手机间实时同步对话上下文、NMEM 摘要与隔离 Git Worktree，并支持无损切换主导 Agent。",
				bodyClassName: "p-0",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "primary",
					size: "sm",
					disabled: readOnly,
					onClick: () => setSessionOpen((v) => !v),
					"data-testid": "a2a-new-session-btn",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "新建跨端对齐会话"]
				}),
				children: [sessionOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleCreateSession,
					className: "px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "sm:col-span-4 space-y-1 text-[12px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "会话主题"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								required: true,
								value: sessionForm.title,
								onChange: (e) => setSessionForm((s) => ({
									...s,
									title: e.target.value
								})),
								placeholder: "例如：移动端与 Codex 联合排障",
								className: cn("w-full h-8 px-2.5", inputBaseClass)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "sm:col-span-3 space-y-1 text-[12px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "同步协议模式"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: sessionForm.syncMode,
								onChange: (e) => setSessionForm((s) => ({
									...s,
									syncMode: e.target.value
								})),
								className: cn("ui-select w-full h-8 pl-2.5 text-[12px] cursor-pointer", inputBaseClass),
								children: SYNC_MODE_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: opt.value,
									children: opt.label
								}, opt.value))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "sm:col-span-2 space-y-1 text-[12px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "Git 分支 (Worktree)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								value: sessionForm.gitBranch,
								onChange: (e) => setSessionForm((s) => ({
									...s,
									gitBranch: e.target.value
								})),
								placeholder: "feat/multi-sync",
								className: cn("w-full h-8 px-2.5 font-mono", inputBaseClass)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "sm:col-span-2 space-y-1 text-[12px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "初始主导 Agent"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: sessionForm.primaryAgentId || state?.leadAgentId || "",
								onChange: (e) => setSessionForm((s) => ({
									...s,
									primaryAgentId: e.target.value
								})),
								className: cn("ui-select w-full h-8 pl-2.5 text-[12px] cursor-pointer", inputBaseClass),
								children: agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: a.id,
									children: a.name
								}, a.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "sm:col-span-1 flex justify-end",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								variant: "primary",
								size: "sm",
								disabled: busyKey === "add-session",
								children: "创建"
							})
						})
					]
				}), sessions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "暂无跨端对齐会话。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-[var(--border-subtle)]",
					"data-testid": "a2a-sessions-list",
					children: sessions.map((sess) => {
						const primaryAgent = agents.find((a) => a.id === sess.primaryAgentId);
						const handoffTarget = handoffDrafts[sess.id] ?? (workers[0]?.id || "");
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "px-5 sm:px-6 py-4 space-y-2.5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col xl:flex-row xl:items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1 space-y-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5 text-[var(--accent)] shrink-0" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[14px] font-semibold text-[var(--ink)]",
													children: sess.title
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
													status: sess.state === "synced" ? "healthy" : "degraded",
													label: sess.state === "synced" ? "全端已对齐" : "存在增量漂移"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
													children: [
														sess.contextId,
														" · rev.",
														sess.revision,
														" · ",
														sess.messageCount,
														" turns"
													]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-mono text-[12px] text-[var(--ink-muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["主导：", primaryAgent?.name || sess.primaryAgentId] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["对齐设备：", sess.syncedNodes.join(" / ")] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["同步模式：", sess.syncMode] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-mono text-[11.5px] text-[var(--ink-subtle)] flex flex-wrap items-center gap-x-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "size-3 inline" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: sess.gitBranch }),
												sess.worktreePath && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"(",
													sess.worktreePath,
													")"
												] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["· 最近同步 ", formatRelativeAge(sess.lastSyncedAt)] })
											]
										}),
										sess.summary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[12.5px] text-[var(--ink-muted)] pt-0.5",
											children: sess.summary
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2 shrink-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											variant: "secondary",
											size: "sm",
											disabled: readOnly || busyKey === `sync:${sess.id}`,
											onClick: () => void handleSyncSession(sess),
											"data-testid": `sync-session-${sess.id}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-3.5", busyKey === `sync:${sess.id}` && "animate-spin") }), "全端同步"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											disabled: readOnly,
											"aria-label": `选择接力目标 Agent (${sess.title})`,
											value: handoffTarget,
											onChange: (e) => setHandoffDrafts((prev) => ({
												...prev,
												[sess.id]: e.target.value
											})),
											className: cn("ui-select h-8 pl-2.5 text-[12px] cursor-pointer max-w-[180px]", inputBaseClass),
											children: agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
												value: a.id,
												children: ["接力至：", a.name.split(" (")[0]]
											}, a.id))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "sm",
											disabled: readOnly || !handoffTarget || handoffTarget === sess.primaryAgentId || busyKey === `handoff:${sess.id}`,
											onClick: () => void handleHandoffSession(sess),
											children: "接力 Handoff"
										})
									]
								})]
							})
						}, sess.id);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Root, {
				open: regOpen,
				onOpenChange: setRegOpen,
				direction: "right",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Portal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Overlay, { className: "fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Drawer.Content, {
					className: "fixed inset-y-0 right-0 z-50 w-full max-w-[460px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Title, {
							className: "text-[15px] font-semibold text-[var(--ink)]",
							children: "接入外部 A2A Agent / 插件专家"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Drawer.Description, {
							className: "text-[12px] text-[var(--ink-subtle)] mt-0.5",
							children: "通过标准 /.well-known/agent-card.json 接入任意节点上的 Codex / Pi / Claude / DSH 专家插件。"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => setRegOpen(false),
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
									children: "显示名称"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									required: true,
									value: regForm.name,
									onChange: (e) => setRegForm((s) => ({
										...s,
										name: e.target.value
									})),
									placeholder: "例如：Pi Worker (Singapore VPS)",
									className: cn("w-full h-9 px-3", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "外部 Harness / 插件类型"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: regForm.harness,
										onChange: (e) => setRegForm((s) => ({
											...s,
											harness: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 cursor-pointer", inputBaseClass),
										children: HARNESS_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: opt.value,
											children: opt.label
										}, opt.value))
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "所在节点 / VPS"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: regForm.nodeId,
										onChange: (e) => setRegForm((s) => ({
											...s,
											nodeId: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 cursor-pointer", inputBaseClass),
										children: fleetNodes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: n.id,
											children: n.name
										}, n.id))
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1.5 text-[13px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink-muted)]",
									children: "A2A Agent Card URL"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "url",
									required: true,
									value: regForm.agentCardUrl,
									onChange: (e) => setRegForm((s) => ({
										...s,
										agentCardUrl: e.target.value
									})),
									placeholder: "http://100.64.0.35:9105/.well-known/agent-card.json",
									className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "默认模型"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: regForm.modelHint,
										onChange: (e) => setRegForm((s) => ({
											...s,
											modelHint: e.target.value
										})),
										placeholder: "claude-sonnet-4-6",
										className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "默认思考强度"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: regForm.reasoningEffort,
										onChange: (e) => setRegForm((s) => ({
											...s,
											reasoningEffort: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 cursor-pointer", inputBaseClass),
										children: EFFORT_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: opt.value,
											children: opt.label
										}, opt.value))
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1.5 text-[13px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-[var(--ink-muted)]",
									children: "声明技能 (逗号分隔)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: regForm.skills,
									onChange: (e) => setRegForm((s) => ({
										...s,
										skills: e.target.value
									})),
									placeholder: "fast-edit, edge-ops, dsh-review",
									className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2 text-[13px] text-[var(--ink)] cursor-pointer pt-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: regForm.setAsLead,
									onChange: (e) => setRegForm((s) => ({
										...s,
										setAsLead: e.target.checked
									})),
									className: "accent-[var(--accent)]"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "接入后立即选举为当前主 Agent (Lead Harness)" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pt-3 flex items-center justify-end gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "secondary",
									size: "md",
									onClick: () => setRegOpen(false),
									children: "取消"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									variant: "primary",
									size: "md",
									disabled: regBusy || readOnly,
									children: regBusy ? "正在接入..." : "注册 A2A Peer"
								})]
							})
						]
					})]
				})] })
			})
		]
	});
}
// web/lib/swarm-memory-engine.ts
/**
* Aggregates Fast/Slow Path trigger routing outcomes into chart-ready buckets
* so operators can track deterministic code offload vs thin-router LLM spawns.
*/
function buildTriggerPathBreakdown(events) {
	const counts = {
		fast_drop: {
			count: 0,
			tokensSaved: 0
		},
		fast_passthrough: {
			count: 0,
			tokensSaved: 0
		},
		slow_spawn: {
			count: 0,
			tokensSaved: 0
		}
	};
	for (const ev of events || []) {
		const key = ev.decision === "fast_drop" ? "fast_drop" : ev.decision === "fast_passthrough" ? "fast_passthrough" : "slow_spawn";
		counts[key].count += 1;
		counts[key].tokensSaved += Math.max(0, Number(ev.tokensSaved) || 0);
	}
	const total = counts.fast_drop.count + counts.fast_passthrough.count + counts.slow_spawn.count;
	const pctOf = (n) => total > 0 ? Math.round(n / total * 100) : 0;
	const items = [
		{
			key: "fast_drop",
			label: "Fast Drop 直滤",
			count: counts.fast_drop.count,
			pct: pctOf(counts.fast_drop.count),
			tokensSaved: counts.fast_drop.tokensSaved
		},
		{
			key: "fast_passthrough",
			label: "订阅直通 Worker",
			count: counts.fast_passthrough.count,
			pct: pctOf(counts.fast_passthrough.count),
			tokensSaved: counts.fast_passthrough.tokensSaved
		},
		{
			key: "slow_spawn",
			label: "薄 Router 派单",
			count: counts.slow_spawn.count,
			pct: pctOf(counts.slow_spawn.count),
			tokensSaved: counts.slow_spawn.tokensSaved
		}
	];
	const offloadCount = counts.fast_drop.count + counts.fast_passthrough.count;
	const totalTokensSaved = counts.fast_drop.tokensSaved + counts.fast_passthrough.tokensSaved + counts.slow_spawn.tokensSaved;
	return {
		items,
		total,
		offloadPct: pctOf(offloadCount),
		totalTokensSaved
	};
}
/**
* Computes Inline vs Spilled context window budget usage across Chain of Recall nodes.
*/
function computeContextSpillStats(nodes, inlineBudgetKb = 32) {
	let inlineBytes = 0;
	let spilledBytes = 0;
	let totalRecalls = 0;
	let spilledCount = 0;
	let inlineCount = 0;
	for (const node of nodes || []) {
		const bytes = Math.max(0, Number(node.bytes) || 0);
		totalRecalls += Math.max(0, Number(node.recallCount) || 0);
		if (node.state === "inline") {
			inlineBytes += bytes;
			inlineCount += 1;
		} else {
			spilledBytes += bytes;
			spilledCount += 1;
		}
	}
	const totalBytes = inlineBytes + spilledBytes;
	const inlineKb = Math.round(inlineBytes / 1024 * 10) / 10;
	const spilledKb = Math.round(spilledBytes / 1024 * 10) / 10;
	const totalKb = Math.round(totalBytes / 1024 * 10) / 10;
	const offloadPct = totalBytes > 0 ? Math.round(spilledBytes / totalBytes * 100) : 0;
	const safeBudgetKb = Math.max(1, Number(inlineBudgetKb) || 32);
	return {
		inlineBytes,
		spilledBytes,
		inlineKb,
		spilledKb,
		totalKb,
		offloadPct,
		overBudget: inlineKb > safeBudgetKb,
		totalRecalls,
		spilledCount,
		inlineCount
	};
}
/**
* Summarizes SuperAgent isolated tickets against the operator attention budget limit.
*/
function computeAttentionBudgetState(tickets, limit = 4) {
	const safeLimit = Math.max(1, Math.round(Number(limit) || 4));
	let active = 0;
	let stalled = 0;
	let reviewGate = 0;
	let needsAttention = 0;
	for (const t of tickets || []) {
		if (t.status !== "completed") active += 1;
		const isStalled = t.status === "stalled" || t.watchdogState === "stalled";
		if (isStalled) stalled += 1;
		if (t.status === "review_gate") reviewGate += 1;
		if (isStalled || t.status === "needs_attention" || t.status === "review_gate") needsAttention += 1;
	}
	const utilizationPct = Math.min(100, Math.round(needsAttention / safeLimit * 100));
	return {
		active,
		stalled,
		reviewGate,
		needsAttention,
		limit: safeLimit,
		utilizationPct,
		tone: stalled > 0 || needsAttention > safeLimit ? "err" : needsAttention >= safeLimit ? "warn" : "ok"
	};
}
function formatBytesKb(bytes) {
	const safe = Math.max(0, Number(bytes) || 0);
	if (safe < 1024) return `${Math.round(safe)} B`;
	const kb = safe / 1024;
	return kb >= 100 ? `${Math.round(kb)} KB` : `${Math.round(kb * 10) / 10} KB`;
}
/**
* Filters real-time collaboration log events on the client cleanly so SSE frames
* stay consistent with active Agent / Event Type / Level / Search controls.
*/
function filterCollaborationLogs(logs, filters) {
	const agentId = (filters.agentId || "").trim();
	const eventType = (filters.eventType || "").trim();
	const level = (filters.level || "").trim().toLowerCase();
	const q = (filters.q || "").trim().toLowerCase();
	return logs.filter((entry) => {
		if (agentId && agentId !== "all") {
			if (entry.sourceAgentId !== agentId && entry.targetAgentId !== agentId) return false;
		}
		if (eventType && eventType !== "all") {
			if (entry.eventType !== eventType && !entry.eventType.startsWith(`${eventType}.`)) return false;
		}
		if (level && level !== "all" && entry.level !== level) return false;
		if (q) {
			if (!`${entry.sourceAgentName} ${entry.targetAgentName} ${entry.eventType} ${entry.summary} ${entry.detail} ${entry.contextId || ""} ${entry.worktreeBranch || ""} ${entry.spillRefId || ""}`.toLowerCase().includes(q)) return false;
		}
		return true;
	});
}
function getLogEventMeta(eventType) {
	switch (eventType) {
		case "superagent.fast_path": return {
			label: "Fast Path 直滤",
			group: "superagent",
			toneClass: "text-emerald-600 dark:text-emerald-400"
		};
		case "superagent.route": return {
			label: "薄 Router 派单",
			group: "superagent",
			toneClass: "text-indigo-500 dark:text-indigo-400"
		};
		case "context.spill": return {
			label: "上下文 Spill",
			group: "context",
			toneClass: "text-amber-600 dark:text-amber-400"
		};
		case "context.recall": return {
			label: "Chain of Recall",
			group: "context",
			toneClass: "text-teal-600 dark:text-teal-400"
		};
		case "watchdog.check": return {
			label: "Watchdog 巡检",
			group: "watchdog",
			toneClass: "text-rose-600 dark:text-rose-400"
		};
		case "swarm.fanout": return {
			label: "蜂群扇出",
			group: "swarm",
			toneClass: "text-indigo-500 dark:text-indigo-400"
		};
		case "a2a.delegate": return {
			label: "A2A 委派",
			group: "a2a",
			toneClass: "text-sky-600 dark:text-sky-400"
		};
		case "dsh.review_vote": return {
			label: "DSH 团队投票",
			group: "dsh",
			toneClass: "text-violet-600 dark:text-violet-400"
		};
		case "dsh.gate_verdict": return {
			label: "DSH 门禁裁决",
			group: "dsh",
			toneClass: "text-emerald-600 dark:text-emerald-400"
		};
		case "session.sync":
		case "session.handoff": return {
			label: "跨端同步",
			group: "session",
			toneClass: "text-slate-600 dark:text-slate-400"
		};
		default: return {
			label: eventType || "协作事件",
			group: "other",
			toneClass: "text-[var(--ink-subtle)]"
		};
	}
}
// web/components/AgentLogsSection.tsx
var LOG_CATEGORY_OPTIONS = [
	{
		value: "all",
		label: "全部事件"
	},
	{
		value: "superagent",
		label: "Fast/Slow Path"
	},
	{
		value: "context",
		label: "Inline/Spill"
	},
	{
		value: "watchdog",
		label: "Watchdog"
	},
	{
		value: "swarm",
		label: "蜂群扇出"
	},
	{
		value: "dsh",
		label: "DSH 评审"
	},
	{
		value: "a2a",
		label: "A2A 委派"
	},
	{
		value: "session",
		label: "跨端同步"
	}
];
function formatLogTime(iso) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleTimeString("zh-CN", { hour12: false });
}
function AgentLogsSection({ agents, initialAgentId = "all", readOnly = false, onToast, onDataMutated }) {
	const [selectedAgentId, setSelectedAgentId] = import_react.useState(initialAgentId || "all");
	const [eventType, setEventType] = import_react.useState("all");
	const [level, setLevel] = import_react.useState("all");
	const [query, setQuery] = import_react.useState("");
	const [paused, setPaused] = import_react.useState(false);
	const [streamState, setStreamState] = import_react.useState("connecting");
	const [logs, setLogs] = import_react.useState([]);
	const [selectedLogId, setSelectedLogId] = import_react.useState(null);
	const [loading, setLoading] = import_react.useState(false);
	const [simulating, setSimulating] = import_react.useState(false);
	const pausedRef = import_react.useRef(paused);
	pausedRef.current = paused;
	import_react.useEffect(() => {
		if (initialAgentId && initialAgentId !== selectedAgentId) setSelectedAgentId(initialAgentId);
	}, [initialAgentId]);
	const loadSnapshotLogs = import_react.useCallback(async (signal) => {
		setLoading(true);
		try {
			const res = await fetchA2ALogs({
				agentId: selectedAgentId,
				eventType,
				level,
				limit: 120
			}, signal);
			if (!signal?.aborted) {
				setLogs(res.items || []);
				setSelectedLogId((prev) => prev || res.items?.[0]?.id || null);
			}
		} catch (err) {
			if (!signal?.aborted) onToast?.(`拉取 Agent 协作日志失败：${err.message}`, "err");
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, [
		selectedAgentId,
		eventType,
		level,
		onToast
	]);
	import_react.useEffect(() => {
		const controller = new AbortController();
		loadSnapshotLogs(controller.signal);
		const closeStream = openA2ALogStream({
			agentId: selectedAgentId,
			eventType,
			level
		}, {
			onStateChange: (st) => setStreamState(st),
			onInit: (items) => {
				if (pausedRef.current) return;
				setLogs(items);
				setSelectedLogId((prev) => prev || items[0]?.id || null);
			},
			onLog: (entry) => {
				if (pausedRef.current) return;
				setLogs((prev) => {
					if (prev.some((item) => item.id === entry.id)) return prev;
					return [entry, ...prev].slice(0, 180);
				});
			}
		});
		return () => {
			controller.abort();
			closeStream();
		};
	}, [
		selectedAgentId,
		eventType,
		level,
		loadSnapshotLogs
	]);
	const visibleLogs = import_react.useMemo(() => filterCollaborationLogs(logs, {
		agentId: selectedAgentId,
		eventType,
		level,
		q: query
	}), [
		logs,
		selectedAgentId,
		eventType,
		level,
		query
	]);
	const activeLog = import_react.useMemo(() => visibleLogs.find((item) => item.id === selectedLogId) || visibleLogs[0] || null, [visibleLogs, selectedLogId]);
	const selectedAgent = import_react.useMemo(() => agents.find((a) => a.id === selectedAgentId) || null, [agents, selectedAgentId]);
	const handleTriggerLiveDrill = async () => {
		if (readOnly || simulating) return;
		setSimulating(true);
		try {
			const targetHint = selectedAgent ? `（聚焦 ${selectedAgent.name}）` : "";
			const res = await runDshTeamCollaboration({
				prompt: `实时协作链路演练${targetHint}：检查 auth 安全边界、执行隔离 Worktree 蜂群回归并触发 DSH 团队投票`,
				channel: "github",
				consensusPolicy: "weighted",
				enableAutoSpill: true
			});
			onToast?.(`已触发一次 DSH 团队协同演练：工单 ${res.ticket.id}${res.spilledNode ? ` · Spill ${res.spilledNode.spillId}` : ""}，协作日志已实时推送`, "ok");
			onDataMutated?.();
		} catch (err) {
			onToast?.(`触发协同演练失败：${err.message}`, "err");
		} finally {
			setSimulating(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "实时 Agent 协作日志流 (SSE)",
			description: "按指定 Agent 节点实时订阅薄 Router、Fast/Slow Path 触发直滤、Inline/Spill Chain of Recall、Watchdog 巡检、Swarm 蜂群扇出与 DSH 评审裁决事件。",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: cn("inline-flex items-center gap-1.5 text-xs font-mono whitespace-nowrap", paused ? "text-[var(--warn)]" : streamState === "live" ? "text-[var(--ok)]" : streamState === "error" ? "text-[var(--err)]" : "text-[var(--ink-subtle)]"),
						"data-testid": "agent-logs-stream-status",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full", paused ? "bg-[var(--warn-dot)]" : streamState === "live" ? "bg-[var(--ok-dot)] animate-pulse" : streamState === "error" ? "bg-[var(--err-dot)]" : "bg-[var(--muted-dot)]") }), paused ? "已暂停追踪" : streamState === "live" ? "SSE 实时流已连接" : streamState === "error" ? "流重连中" : "正在握手…"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: () => setPaused((p) => !p),
						"data-testid": "agent-logs-pause-btn",
						children: [paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-3.5" }), paused ? "恢复实时流" : "暂停"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						disabled: loading,
						onClick: () => void loadSnapshotLogs(),
						"data-testid": "agent-logs-refresh-btn",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-3.5", loading && "animate-spin") }), "刷新"]
					}),
					!readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "primary",
						size: "sm",
						disabled: simulating,
						onClick: () => void handleTriggerLiveDrill(),
						"data-testid": "agent-logs-drill-btn",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5" }), simulating ? "协作推送中…" : "触发实时协同事件"]
					})
				]
			}),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,260px)_minmax(0,140px)_minmax(0,1fr)]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
								children: "按 Agent 节点过滤"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: selectedAgentId,
								onChange: (e) => setSelectedAgentId(e.target.value),
								className: cn("ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer", inputBaseClass),
								"data-testid": "agent-logs-agent-select",
								"aria-label": "选择要查看实时日志的 Agent 节点",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "all",
									children: "全部 Agent 节点（全协作链路）"
								}), agents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: a.id,
									children: [
										a.role === "lead" ? "★ 主控 · " : "• ",
										a.name,
										" (",
										a.nodeName || a.nodeId,
										")"
									]
								}, a.id))]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
								children: "日志级别"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: level,
								onChange: (e) => setLevel(e.target.value),
								className: cn("ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer", inputBaseClass),
								"data-testid": "agent-logs-level-select",
								"aria-label": "过滤日志级别",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "all",
										children: "全部级别"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "info",
										children: "Info"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "warn",
										children: "Warn"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "error",
										children: "Error"
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
								children: "关键词 / ContextId / Spill 句柄检索"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-subtle)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "search",
									value: query,
									onChange: (e) => setQuery(e.target.value),
									placeholder: "搜索摘要、ContextId、Worktree 分支或 Spill ID…",
									className: cn(inputBaseClass, "w-full h-8 pl-8 pr-2.5 text-xs"),
									"data-testid": "agent-logs-search-input"
								})]
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-w-full overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
							value: eventType,
							onChange: setEventType,
							options: LOG_CATEGORY_OPTIONS,
							ariaLabel: "按协作事件分类过滤"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs font-mono tabular-nums text-[var(--ink-subtle)]",
						children: [
							"当前匹配 ",
							visibleLogs.length,
							" 条 · 总缓冲 ",
							logs.length,
							" 条",
							selectedAgent ? ` · 节点 ${selectedAgent.nodeId}` : ""
						]
					})]
				})]
			}), visibleLogs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "当前过滤条件下暂无协作日志",
				message: "尝试切换至「全部 Agent 节点」，或点击右上角「触发实时协同事件」观察主控与子 Agent 的实时 SSE 交互。"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-h-[540px] min-w-0 overflow-y-auto divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-md bg-[var(--surface)]",
					"data-testid": "agent-logs-list",
					children: visibleLogs.map((entry) => {
						const meta = getLogEventMeta(entry.eventType);
						const isSelected = activeLog?.id === entry.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setSelectedLogId(entry.id),
							"data-testid": `agent-log-row-${entry.id}`,
							className: cn("w-full text-left px-3.5 py-2.5 transition-colors block cursor-pointer", FOCUS_RING, isSelected ? "bg-[var(--surface-active)]" : "hover:bg-[var(--surface-hover)]"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-2 text-[11px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono tabular-nums text-[var(--ink-subtle)] shrink-0",
											children: formatLogTime(entry.ts)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: cn("font-mono font-semibold shrink-0", entry.level === "error" ? "text-[var(--err)]" : entry.level === "warn" ? "text-[var(--warn)]" : meta.toneClass),
											children: meta.label
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "truncate text-[var(--ink-muted)]",
											children: [
												entry.sourceAgentName.replace(/\s*\(.*?\)\s*/g, ""),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "mx-1 inline size-3 text-[var(--ink-subtle)]" }),
												entry.targetAgentName.replace(/\s*\(.*?\)\s*/g, "")
											]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 font-mono tabular-nums text-[var(--ink-subtle)] shrink-0",
									children: [entry.model && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate max-w-[130px]",
										children: entry.model
									}), entry.latencyMs != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [entry.latencyMs, "ms"] })]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs font-medium text-[var(--ink)] line-clamp-2",
								children: entry.summary
							})]
						}, entry.id);
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-w-0 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 flex flex-col justify-between gap-4",
					"data-testid": "agent-log-inspector",
					children: activeLog ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3.5 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "size-3.5 text-[var(--accent)] shrink-0" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: cn("font-mono font-semibold", getLogEventMeta(activeLog.eventType).toneClass),
												children: activeLog.eventType
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-[11px] uppercase text-[var(--ink-subtle)]",
												children: ["· ", activeLog.level]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
										className: "mt-1 text-sm font-semibold text-[var(--ink)] leading-snug",
										children: activeLog.summary
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[11px] tabular-nums text-[var(--ink-subtle)] shrink-0",
									children: formatLogTime(activeLog.ts)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] font-medium text-[var(--ink-subtle)]",
									children: "主从协作链路"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-1.5 font-medium text-[var(--ink)]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate",
											children: activeLog.sourceAgentName
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-3.5 text-[var(--accent)] shrink-0" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate",
											children: activeLog.targetAgentName
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
								className: "grid grid-cols-2 gap-x-3 gap-y-2.5 border-y border-[var(--border-subtle)] py-3 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[11px] text-[var(--ink-subtle)]",
											children: "执行模型 / 思考强度"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
											className: "mt-0.5 font-mono truncate text-[var(--ink)]",
											children: [activeLog.model || "—", activeLog.effort ? ` (${activeLog.effort})` : ""]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[11px] text-[var(--ink-subtle)]",
											children: "协作耗时"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-0.5 font-mono tabular-nums text-[var(--ink)]",
											children: activeLog.latencyMs != null ? `${activeLog.latencyMs} ms` : "—"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[11px] text-[var(--ink-subtle)]",
											children: "A2A Context / Task"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-0.5 font-mono truncate text-[var(--ink)]",
											children: activeLog.contextId || activeLog.taskId || "—"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[11px] text-[var(--ink-subtle)]",
											children: "Worktree 分支"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-0.5 flex items-center gap-1 font-mono truncate text-[var(--ink)]",
											children: activeLog.worktreeBranch ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "size-3 shrink-0 text-[var(--ink-subtle)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate",
												children: activeLog.worktreeBranch
											})] }) : "—"
										})]
									}),
									activeLog.spillRefId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "col-span-2 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
											className: "text-[11px] text-[var(--ink-subtle)]",
											children: "关联 Spill / Chain of Recall 句柄"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
											className: "mt-0.5 font-mono text-[var(--warn)] truncate",
											children: activeLog.spillRefId
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] font-medium text-[var(--ink-subtle)] mb-1",
									children: "事件协作详情与上下文摘要"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs leading-relaxed text-[var(--ink-muted)] whitespace-pre-wrap break-words font-mono bg-[var(--surface-elevated)] rounded border border-[var(--border-subtle)] p-2.5",
									children: activeLog.detail || activeLog.summary
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-2 pt-1",
								children: [activeLog.targetAgentId && activeLog.targetAgentId !== selectedAgentId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "secondary",
									size: "sm",
									onClick: () => setSelectedAgentId(activeLog.targetAgentId),
									children: "聚焦目标 Agent 日志"
								}), selectedAgentId !== "all" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => setSelectedAgentId("all"),
									children: "返回全链路日志"
								})]
							})
						]
					}) : null
				})]
			})]
		})
	});
}
// web/lib/ai-governance.ts
var AI_PREFLIGHT_PRESETS = [
	{
		id: "safe-worktree-patch",
		label: "安全 Worktree 补丁",
		description: "隔离分支改动逻辑与单测，验证全部护栏放行。",
		payload: {
			actionType: "code-patch",
			target: "web/lib/ai-governance.ts",
			summary: "在独立 Worktree 分支补充纯函数过滤逻辑并配套单元测试",
			worktreeBranch: "feat/ai-preflight-polish",
			files: ["web/lib/ai-governance.ts", "web/lib/ai-governance.test.ts"]
		}
	},
	{
		id: "critical-service-restart",
		label: "关键服务重启 (需二次确认)",
		description: "演示未携带 confirmToken 重启核心网关时的 confirm_required 拦截。",
		payload: {
			actionType: "service-action",
			target: "magpie-gateway.service",
			summary: "重启核心模型网关以刷新上游超时配置",
			worktreeBranch: "",
			files: []
		}
	},
	{
		id: "mcp-overload-sync",
		label: "MCP 工具膨胀与版本联动",
		description: "触发 >40 工具上限预警（Alma 教训）与 SemVer 耦合文件同步提醒。",
		payload: {
			actionType: "mcp-sync",
			target: "node-tokyo-edge",
			summary: "向东京边缘节点批量同步 48 个 MCP 工具并升级版本",
			worktreeBranch: "feat/mcp-sync-batch",
			files: ["package.json"],
			mcpToolsCount: 48
		}
	},
	{
		id: "unsafe-worktree-gitlink",
		label: "高危 Gitlink 与未锁定 npx 拦截",
		description: "触发 Claude Code .claude/worktrees 污染、Codex 越界路径与 Alma MCPhantom 拦截。",
		payload: {
			actionType: "mcp-sync",
			target: "local-hub",
			summary: "在主分支直接提交残留 worktree 并拉取未固定版本 npx 包",
			worktreeBranch: "main",
			files: [".claude/worktrees/exp-01/README.md", "../outside.env"],
			command: "npx -y legacy-unmaintained-mcp-server",
			dirtyMainCheckout: true
		}
	}
];
function filterPitfallsByProject(pitfalls, projectFilter, query = "") {
	const normalizedProject = projectFilter.trim().toLowerCase();
	const normalizedQuery = query.trim().toLowerCase();
	return pitfalls.filter((item) => {
		if (normalizedProject && normalizedProject !== "all") {
			if (item.project.toLowerCase() !== normalizedProject) return false;
		}
		if (!normalizedQuery) return true;
		return `${item.id} ${item.project} ${item.title} ${item.pitfall} ${item.mitigation} ${item.enforcedBy}`.toLowerCase().includes(normalizedQuery);
	});
}
function filterBoundariesByLayer(boundaries, layerFilter) {
	const normalized = layerFilter.trim().toLowerCase();
	if (!normalized || normalized === "all") return boundaries;
	return boundaries.filter((item) => item.id.toLowerCase() === normalized || item.layer.toLowerCase() === normalized);
}
function getVerdictMeta(verdict) {
	if (verdict === "block") return {
		label: "拦截阻止 (Block)",
		tone: "failed",
		summary: "命中硬性安全或仓库污染红线，必须按下方整改项修复后才可继续。"
	};
	if (verdict === "confirm_required") return {
		label: "需二次确认 (Confirm)",
		tone: "degraded",
		summary: "涉及关键基础设施或高影响配置，需签发一次性 confirmToken 并确认回滚路径。"
	};
	return {
		label: "允许放行 (Allow)",
		tone: "healthy",
		summary: "已通过沙箱路径、密钥脱敏与隔离策略校验，可按建议命令完成验证。"
	};
}
function formatAiContextClipboardPayload(context) {
	const compact = {
		schemaVersion: context.schemaVersion,
		version: context.version,
		mode: context.mode,
		liveSummary: context.liveSummary,
		boundaries: context.boundaries.map((b) => ({
			layer: b.layer,
			riskLevel: b.riskLevel,
			paths: b.paths,
			rules: b.rules
		})),
		coupledRules: context.coupledRules.map((r) => ({
			label: r.label,
			mustSync: r.mustSync,
			verifyCommand: r.verifyCommand
		})),
		invariants: context.invariants,
		worktreePolicy: context.worktreePolicy,
		verificationCommands: context.verificationCommands
	};
	return JSON.stringify(compact, null, 2);
}
// web/components/AiGovernanceSection.tsx
var LAYER_OPTIONS = [
	{
		value: "all",
		label: "全部层级"
	},
	{
		value: "config",
		label: "Config 配置"
	},
	{
		value: "logic",
		label: "Logic 逻辑"
	},
	{
		value: "data",
		label: "Data 数据"
	},
	{
		value: "ui",
		label: "UI 视图"
	}
];
var PROJECT_OPTIONS = [
	{
		value: "all",
		label: "全部项目"
	},
	{
		value: "T3 Code",
		label: "T3 Code"
	},
	{
		value: "Orca",
		label: "Orca"
	},
	{
		value: "Alma",
		label: "Alma"
	},
	{
		value: "Claude Code",
		label: "Claude Code"
	},
	{
		value: "Codex",
		label: "Codex"
	}
];
var ACTION_TYPE_OPTIONS = [
	{
		value: "code-patch",
		label: "代码补丁 (code-patch)"
	},
	{
		value: "worktree-dispatch",
		label: "Worktree 派发 (worktree-dispatch)"
	},
	{
		value: "service-action",
		label: "服务控制 (service-action)"
	},
	{
		value: "config-edit",
		label: "配置变更 (config-edit)"
	},
	{
		value: "mcp-sync",
		label: "MCP 同步 (mcp-sync)"
	}
];
function checkStatusTone(status) {
	if (status === "block") return "failed";
	if (status === "confirm_required" || status === "warn") return "degraded";
	return "healthy";
}
function checkStatusLabel(status) {
	if (status === "block") return "拦截";
	if (status === "confirm_required") return "需确认";
	if (status === "warn") return "预警";
	return "通过";
}
function AiGovernanceSection({ readOnly = false, onToast }) {
	const [context, setContext] = import_react.useState(null);
	const [loading, setLoading] = import_react.useState(true);
	const [layerFilter, setLayerFilter] = import_react.useState("all");
	const [projectFilter, setProjectFilter] = import_react.useState("all");
	const [pitfallQuery, setPitfallQuery] = import_react.useState("");
	const [activePresetId, setActivePresetId] = import_react.useState("safe-worktree-patch");
	const [actionType, setActionType] = import_react.useState("code-patch");
	const [target, setTarget] = import_react.useState("web/lib/ai-governance.ts");
	const [worktreeBranch, setWorktreeBranch] = import_react.useState("feat/ai-preflight-polish");
	const [filesInput, setFilesInput] = import_react.useState("web/lib/ai-governance.ts, web/lib/ai-governance.test.ts");
	const [commandInput, setCommandInput] = import_react.useState("");
	const [summaryInput, setSummaryInput] = import_react.useState("在独立 Worktree 分支补充纯函数过滤逻辑并配套单元测试");
	const [mcpToolsInput, setMcpToolsInput] = import_react.useState("");
	const [dirtyMainCheckout, setDirtyMainCheckout] = import_react.useState(false);
	const [preflightBusy, setPreflightBusy] = import_react.useState(false);
	const [preflightResult, setPreflightResult] = import_react.useState(null);
	const loadContext = import_react.useCallback(async (signal) => {
		setLoading(true);
		try {
			const data = await fetchAiOpsContext(signal);
			if (!signal?.aborted) setContext(data);
		} catch (err) {
			if (!signal?.aborted) onToast?.(`加载 AI 契约上下文失败：${err.message}`, "err");
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, [onToast]);
	import_react.useEffect(() => {
		const controller = new AbortController();
		loadContext(controller.signal);
		return () => controller.abort();
	}, [loadContext]);
	const executePreflight = import_react.useCallback(async (override) => {
		setPreflightBusy(true);
		try {
			const files = override ? override.files : filesInput.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
			const parsedTools = override?.mcpToolsCount !== void 0 ? override.mcpToolsCount : mcpToolsInput.trim() ? Number(mcpToolsInput.trim()) : void 0;
			const res = await runAiPreflight({
				actionType: override ? override.actionType : actionType,
				target: override ? override.target : target,
				summary: override ? override.summary : summaryInput,
				worktreeBranch: override ? override.worktreeBranch : worktreeBranch,
				files,
				command: override ? override.command || "" : commandInput,
				mcpToolsCount: Number.isFinite(parsedTools) ? parsedTools : void 0,
				dirtyMainCheckout: override ? Boolean(override.dirtyMainCheckout) : dirtyMainCheckout
			});
			setPreflightResult(res);
		} catch (err) {
			onToast?.(`预检执行失败：${err.message}`, "err");
		} finally {
			setPreflightBusy(false);
		}
	}, [
		actionType,
		commandInput,
		dirtyMainCheckout,
		filesInput,
		mcpToolsInput,
		onToast,
		summaryInput,
		target,
		worktreeBranch
	]);
	const applyPreset = (presetId) => {
		const preset = AI_PREFLIGHT_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setActivePresetId(preset.id);
		setActionType(preset.payload.actionType);
		setTarget(preset.payload.target);
		setSummaryInput(preset.payload.summary);
		setWorktreeBranch(preset.payload.worktreeBranch);
		setFilesInput(preset.payload.files.join(", "));
		setCommandInput(preset.payload.command || "");
		setMcpToolsInput(preset.payload.mcpToolsCount != null ? String(preset.payload.mcpToolsCount) : "");
		setDirtyMainCheckout(Boolean(preset.payload.dirtyMainCheckout));
		executePreflight(preset.payload);
	};
	const handleCopyContext = async () => {
		if (!context) return;
		const text = formatAiContextClipboardPayload(context);
		const ok = await copyToClipboard(text);
		onToast?.(ok ? "已复制压缩版 AI 运维上下文 JSON（可直接贴给 Codex / Claude / T3 / Orca）" : "复制失败，请检查剪贴板权限", ok ? "ok" : "err");
	};
	const filteredBoundaries = import_react.useMemo(() => filterBoundariesByLayer(context?.boundaries || [], layerFilter), [context?.boundaries, layerFilter]);
	const filteredPitfalls = import_react.useMemo(() => filterPitfallsByProject(context?.pitfalls || [], projectFilter, pitfallQuery), [
		context?.pitfalls,
		projectFilter,
		pitfallQuery
	]);
	if (loading && !context) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
		heightClass: "h-[520px]",
		label: "正在加载 AI 运维契约与踩坑防线数据"
	});
	if (!context) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "AI 契约与护栏",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
			title: "未能获取 AI 运维上下文",
			message: "请检查控制面 /api/ai/context 接口是否可达。",
			action: {
				label: "重新加载",
				onClick: () => void loadContext()
			}
		})
	});
	const live = context.liveSummary;
	const mcpRatioPct = live.mcpToolCeiling > 0 ? Math.min(100, Math.round(live.mcpToolsTotal / live.mcpToolCeiling * 100)) : 0;
	const verdictMeta = preflightResult ? getVerdictMeta(preflightResult.verdict) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		"data-testid": "ai-governance-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiStrip, {
				asymmetric: true,
				cells: [
					{
						label: "控制面契约版本与安全姿态",
						meta: context.schemaVersion,
						value: `v${context.version}`,
						sub: `${context.mode.readOnly || readOnly ? "只读拦截开启" : "受控读写模式"} · ${live.criticalServices.length} 个关键服务受 Token 保护`,
						tone: context.mode.readOnly ? "warn" : "ok"
					},
					{
						label: "已固化行业调度防线",
						value: `${context.pitfalls.length} 项`,
						numeric: {
							primary: context.pitfalls.length,
							suffix: " 项"
						},
						sub: "T3 / Orca / Alma / Claude / Codex",
						tone: "ok"
					},
					{
						label: "活跃 MCP 工具水位",
						meta: `建议上限 ${live.mcpToolCeiling}`,
						value: `${live.mcpToolsTotal} / ${live.mcpToolCeiling}`,
						ratioPct: mcpRatioPct,
						sub: live.mcpToolCeilingExceeded ? "超 40 工具上限，建议按角色分片" : "处于高准确率工具曝光区间",
						tone: live.mcpToolCeilingExceeded ? "warn" : "ok"
					},
					{
						label: "活跃 Worktree 与停滞工单",
						value: `${live.activeWorktrees.length} 分支`,
						numeric: {
							primary: live.activeWorktrees.length,
							suffix: " 分支"
						},
						sub: live.stalledTickets > 0 ? `${live.stalledTickets} 个停滞工单待 Watchdog 回收` : `${live.a2aAgentsTotal} 个 A2A 节点正常协同`,
						tone: live.stalledTickets > 0 ? "warn" : "ok"
					}
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "AI 变更预检门禁 (Preflight Dry-Run)",
				description: "让外部 AI 在修改服务、配置、代码或同步 MCP 前先调用 POST /api/ai/preflight：确定性输出放行/确认/拦截判定、耦合文件提醒与回滚路径，防止改乱。",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: () => void handleCopyContext(),
						"data-testid": "copy-ai-context-btn",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
							className: "size-3.5",
							strokeWidth: 1.75
						}), "复制 AI 运维上下文 JSON"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => void loadContext(),
						"aria-label": "刷新 AI 契约上下文",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
							className: cn("size-3.5", loading && "animate-spin"),
							strokeWidth: 1.75
						}), "刷新"]
					})]
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[12px] font-medium text-[var(--ink-subtle)]",
							children: "典型实战场景一键压测（点击即向后端执行真实预检）"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5",
							children: AI_PREFLIGHT_PRESETS.map((preset) => {
								const isSelected = activePresetId === preset.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"data-testid": `preflight-preset-${preset.id}`,
									"aria-pressed": isSelected,
									onClick: () => applyPreset(preset.id),
									className: cn("text-left p-3 rounded-lg border transition-[background-color,border-color] duration-150 ease-out cursor-pointer", isSelected ? "border-[var(--accent)]/60 bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]", FOCUS_RING),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[13px] font-medium text-[var(--ink)]",
										children: preset.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-[12px] text-[var(--ink-subtle)] leading-relaxed",
										children: preset.description
									})]
								}, preset.id);
							})
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 lg:grid-cols-12 gap-5 items-start",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "lg:col-span-6 space-y-3.5 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/60",
							onSubmit: (e) => {
								e.preventDefault();
								executePreflight();
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[12px] font-medium text-[var(--ink-muted)]",
											children: "变更类型 (actionType)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: actionType,
											onChange: (e) => setActionType(e.target.value),
											"aria-label": "变更类型",
											className: cn("h-9 w-full px-2.5", inputBaseClass),
											children: ACTION_TYPE_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: opt.value,
												children: opt.label
											}, opt.value))
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[12px] font-medium text-[var(--ink-muted)]",
											children: "目标对象 (target)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: target,
											onChange: (e) => setTarget(e.target.value),
											placeholder: "如 magpie-gateway.service 或 src/server.mjs",
											className: cn("h-9 w-full px-2.5 font-mono text-[12.5px]", inputBaseClass)
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[12px] font-medium text-[var(--ink-muted)]",
											children: "Worktree 隔离分支"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: worktreeBranch,
											onChange: (e) => setWorktreeBranch(e.target.value),
											placeholder: "如 feat/ops-guard",
											className: cn("h-9 w-full px-2.5 font-mono text-[12.5px]", inputBaseClass)
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[12px] font-medium text-[var(--ink-muted)]",
											children: "MCP 工具总数（可选覆盖）"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: 0,
											max: 500,
											value: mcpToolsInput,
											onChange: (e) => setMcpToolsInput(e.target.value),
											placeholder: `默认实时值 (${live.mcpToolsTotal})`,
											className: cn("h-9 w-full px-2.5 font-mono text-[12.5px] tabular-nums", inputBaseClass)
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[12px] font-medium text-[var(--ink-muted)]",
										children: "涉及文件清单（逗号或换行分隔）"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: filesInput,
										onChange: (e) => setFilesInput(e.target.value),
										placeholder: "package.json, src/server.mjs",
										className: cn("h-9 w-full px-2.5 font-mono text-[12.5px]", inputBaseClass)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[12px] font-medium text-[var(--ink-muted)]",
										children: "变更摘要 (summary)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: summaryInput,
										onChange: (e) => setSummaryInput(e.target.value),
										placeholder: "描述本次 AI 变更意图",
										className: cn("h-9 w-full px-2.5 text-[13px]", inputBaseClass)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[12px] font-medium text-[var(--ink-muted)]",
										children: "附带命令（可选，用于检测未锁定 npx 与凭据）"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: commandInput,
										onChange: (e) => setCommandInput(e.target.value),
										placeholder: "如 npx -y <mcp-package> 或留空",
										className: cn("h-9 w-full px-2.5 font-mono text-[12.5px]", inputBaseClass)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center justify-between gap-3 pt-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "inline-flex items-center gap-2 text-[12.5px] text-[var(--ink-muted)] cursor-pointer select-none",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: dirtyMainCheckout,
											onChange: (e) => setDirtyMainCheckout(e.target.checked),
											className: "rounded border-[var(--border-strong)] accent-[var(--accent)]"
										}), "模拟主工作区存在未提交改动 (Dirty Checkout)"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										type: "submit",
										variant: "primary",
										size: "sm",
										disabled: preflightBusy,
										"data-testid": "run-preflight-btn",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
											className: "size-3.5",
											strokeWidth: 1.75
										}), preflightBusy ? "预检评估中..." : "执行 AI 变更预检"]
									})]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "lg:col-span-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4 min-h-[280px]",
							"data-testid": "preflight-result-card",
							children: !preflightResult || !verdictMeta ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "h-full flex flex-col items-center justify-center text-center py-10 space-y-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, {
										className: "size-7 text-[var(--ink-subtle)]",
										strokeWidth: 1.5
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[13.5px] font-medium text-[var(--ink)]",
										children: "等待执行 AI 预检门禁"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[12.5px] text-[var(--ink-subtle)] max-w-sm",
										children: "选择上方任意实战场景或填写表单后点击「执行 AI 变更预检」，查看确定性风险判定、耦合文件提醒与回滚策略。"
									})
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
												status: verdictMeta.tone,
												label: verdictMeta.label
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums",
												children: ["爆炸半径：", preflightResult.blastRadius.toUpperCase()]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[12.5px] text-[var(--ink-muted)]",
											children: verdictMeta.summary
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-right font-mono tabular-nums",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-[var(--ink-subtle)]",
											children: "安全分"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[20px] font-semibold leading-tight text-[var(--ink)]",
											children: preflightResult.safetyScore
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "divide-y divide-[var(--border-subtle)] text-[12.5px]",
									children: preflightResult.checks.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "py-2 first:pt-0 flex items-start justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 space-y-0.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5 font-medium text-[var(--ink)]",
												children: [
													item.status === "block" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldExclamationPoint, {
														className: "size-3.5 text-[var(--err)] shrink-0",
														strokeWidth: 1.75
													}) : item.status === "warn" || item.status === "confirm_required" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleExclamationPoint, {
														className: "size-3.5 text-[var(--warn)] shrink-0",
														strokeWidth: 1.75
													}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
														className: "size-3.5 text-[var(--ok)] shrink-0",
														strokeWidth: 1.75
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.title }),
													item.pitfallRef && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-mono text-[11px] text-[var(--ink-subtle)]",
														children: [
															"[",
															item.pitfallRef,
															"]"
														]
													})
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[12px] text-[var(--ink-muted)] leading-relaxed",
												children: item.detail
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "shrink-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
												status: checkStatusTone(item.status),
												label: checkStatusLabel(item.status)
											})
										})]
									}, item.id))
								}),
								preflightResult.coupledFiles.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-3 border-t border-[var(--border-subtle)] space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink)]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCodeCorner, {
											className: "size-3.5 text-[var(--accent)]",
											strokeWidth: 1.75
										}), "必须同步核对的耦合文件（防改乱）"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-mono text-[11.5px] text-[var(--ink-muted)] leading-relaxed break-all",
										children: preflightResult.coupledFiles.join(" · ")
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5 font-medium text-[var(--ink)]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, {
												className: "size-3.5 text-[var(--ink-subtle)]",
												strokeWidth: 1.75
											}), "回滚预案"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[var(--ink-muted)] leading-relaxed",
											children: preflightResult.rollbackPlan
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5 font-medium text-[var(--ink)]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, {
												className: "size-3.5 text-[var(--ink-subtle)]",
												strokeWidth: 1.75
											}), "必跑校验命令"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-mono text-[11.5px] text-[var(--ink-muted)] space-y-0.5",
											children: preflightResult.recommendedCommands.map((cmd) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "truncate",
												title: cmd,
												children: ["$ ", cmd]
											}, cmd))
										})]
									})]
								})
							] })
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: "lg:col-span-7",
					title: "Logic / Data / Config / UI 四层职责边界",
					description: "与根 AGENTS.md 强一致：清晰划分配置真源、逻辑引擎、数据持久化与前端视图，让 AI 精准定位改动范围不越界。",
					actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
						value: layerFilter,
						onChange: setLayerFilter,
						options: LAYER_OPTIONS,
						ariaLabel: "按架构分层筛选边界规范"
					}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "divide-y divide-[var(--border-subtle)]",
						children: filteredBoundaries.map((layer) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "py-4 first:pt-0 last:pb-0 space-y-2.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-baseline justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {
												className: "size-4 text-[var(--accent)] shrink-0",
												strokeWidth: 1.75
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-[13px] font-semibold text-[var(--ink)]",
												children: layer.layer
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[13px] font-medium text-[var(--ink-muted)]",
												children: layer.label
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
										status: layer.riskLevel === "high" ? "degraded" : "healthy",
										label: layer.riskLevel === "high" ? "高影响层级" : "标准受控层"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[12.5px] text-[var(--ink-muted)]",
									children: layer.summary
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11.5px] text-[var(--ink-subtle)] leading-relaxed",
									children: ["核心目录：", layer.paths.join(" · ")]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "space-y-1 text-[12.5px] text-[var(--ink-muted)] list-disc pl-4",
									children: layer.rules.map((rule) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: rule }, rule))
								})
							]
						}, layer.id))
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: "lg:col-span-5",
					title: "强耦合文件矩阵与硬性红线",
					description: "改动左侧触发域时必须同步校验右侧文件，避免版本漂移、类型失配或安全回归。",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "divide-y divide-[var(--border-subtle)]",
							children: context.coupledRules.map((rule) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "py-3 first:pt-0 space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[13px] font-medium text-[var(--ink)]",
										children: rule.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[11px] text-[var(--accent)]",
										children: rule.verifyCommand
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11.5px] text-[var(--ink-subtle)] leading-relaxed break-all",
									children: ["同步清单：", rule.mustSync.join(" · ")]
								})]
							}, rule.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pt-3 border-t border-[var(--border-subtle)] space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[12.5px] font-medium text-[var(--ink)]",
								children: "硬性工程红线（Hard Invariants）"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "space-y-1.5 text-[12px] text-[var(--ink-muted)] list-disc pl-4",
								children: context.invariants.map((inv) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: inv }, inv))
							})]
						})]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "X / GitHub 热门 AI 调度项目踩坑记录与 v0.4.0 内置防线",
				description: "复盘 T3 Code、Orca、Alma、Claude Code 与 OpenAI Codex 真实更新日志及社区高发踩坑，全部沉淀为可执行门禁。",
				bodyClassName: "p-0",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
						value: projectFilter,
						onChange: setProjectFilter,
						options: PROJECT_OPTIONS,
						ariaLabel: "按 AI 调度项目筛选踩坑记录"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative w-full sm:w-48",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							className: "size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
							strokeWidth: 1.75
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "search",
							value: pitfallQuery,
							onChange: (e) => setPitfallQuery(e.target.value),
							placeholder: "搜索踩坑或防线...",
							"aria-label": "搜索 AI 调度踩坑记录",
							className: cn("h-9 sm:h-8 w-full pl-8 pr-2.5", inputBaseClass)
						})]
					})]
				}),
				children: filteredPitfalls.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					title: "未匹配到踩坑记录",
					message: "请调整项目筛选条件或清空关键词。",
					action: {
						label: "重置筛选",
						onClick: () => {
							setProjectFilter("all");
							setPitfallQuery("");
						}
					}
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left border-collapse",
						"data-testid": "pitfalls-table",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-5 sm:pl-6 pr-3 whitespace-nowrap",
									children: "编号 / 项目"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "真实踩坑与根因"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "Ops Console v0.4.0 应对防线"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-3 pr-5 sm:pr-6 whitespace-nowrap",
									children: "落点校验"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-[var(--border-subtle)] text-[12.5px]",
							children: filteredPitfalls.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out align-top",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-3 pl-5 sm:pl-6 pr-3 whitespace-nowrap",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-mono text-[12px] font-semibold text-[var(--ink)]",
												children: item.id
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[12px] text-[var(--ink-muted)]",
												children: item.project
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-1",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
													status: item.severity === "high" ? "failed" : "degraded",
													label: item.severity === "high" ? "高危" : "中危"
												})
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-3 px-3 min-w-[260px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium text-[var(--ink)]",
											children: item.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-0.5 text-[var(--ink-muted)] leading-relaxed",
											children: item.pitfall
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-3 min-w-[260px] text-[var(--ink-muted)] leading-relaxed",
										children: item.mitigation
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 pl-3 pr-5 sm:pr-6 font-mono text-[11.5px] text-[var(--ink-subtle)] whitespace-nowrap",
										children: item.enforcedBy
									})
								]
							}, item.id))
						})]
					})
				})
			})
		]
	});
}
// web/components/SwarmMemorySection.tsx
var TRIGGER_PRESETS = [
	{
		id: "drop",
		label: "自回声 (Fast Drop)",
		channel: "github",
		actor: "dsh-bot",
		threadKey: "gh:ops-console#pr-142",
		summary: "GitHub PR 状态标签自动回写（Agent 自触发回声）"
	},
	{
		id: "passthrough",
		label: "已订阅线程 (Passthrough)",
		channel: "ci",
		actor: "github-actions",
		threadKey: "ci:main#run-8812",
		summary: "CI #8812 追加失败日志片段，直推已认领 Worker"
	},
	{
		id: "spawn",
		label: "新工单 (Slow Spawn)",
		channel: "feishu",
		actor: "ops-lead",
		threadKey: "feishu:ops-console#inc-209",
		summary: "排查亚太边缘节点 TLS 握手抖动并生成隔离修复工单"
	}
];
function getTicketStatusMeta(ticket) {
	if (ticket.status === "stalled" || ticket.watchdogState === "stalled") return {
		status: "failed",
		label: "疑似阻塞"
	};
	if (ticket.status === "review_gate") return {
		status: "degraded",
		label: "DSH 评审门禁"
	};
	if (ticket.status === "completed") return {
		status: "healthy",
		label: "已完成"
	};
	if (ticket.watchdogState === "recovered") return {
		status: "healthy",
		label: "已巡检恢复"
	};
	return {
		status: "healthy",
		label: "隔离运行中"
	};
}
function getDecisionMeta(decision) {
	if (decision === "fast_drop") return {
		label: "FAST DROP",
		colorClass: "text-emerald-600 dark:text-emerald-400"
	};
	if (decision === "fast_passthrough") return {
		label: "PASSTHROUGH",
		colorClass: "text-sky-600 dark:text-sky-400"
	};
	return {
		label: "SLOW SPAWN",
		colorClass: "text-[var(--accent)]"
	};
}
function formatShortTime(iso) {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleTimeString("zh-CN", { hour12: false });
}
function SwarmMemorySection({ agents, swarmMetrics, superAgentConfig, superAgentTickets, contextSpillNodes, triggerEvents, readOnly = false, onReload, onOpenAgentLogs, onToast }) {
	const [routerThinMode, setRouterThinMode] = import_react.useState(superAgentConfig.routerThinMode !== false);
	const [fastPathEnabled, setFastPathEnabled] = import_react.useState(superAgentConfig.fastPathEnabled !== false);
	const [subscriptionPassthrough, setSubscriptionPassthrough] = import_react.useState(superAgentConfig.subscriptionPassthrough !== false);
	const [inlineBudgetKb, setInlineBudgetKb] = import_react.useState(superAgentConfig.inlineBudgetKb || 32);
	const [watchdogStallSec, setWatchdogStallSec] = import_react.useState(superAgentConfig.watchdogStallSec || 180);
	const [attentionBudgetLimit, setAttentionBudgetLimit] = import_react.useState(superAgentConfig.attentionBudgetLimit || 4);
	const [consensusPolicy, setConsensusPolicy] = import_react.useState(superAgentConfig.consensusPolicy || "weighted");
	const [maxReworkRounds, setMaxReworkRounds] = import_react.useState(superAgentConfig.maxReworkRounds || 2);
	const [savingConfig, setSavingConfig] = import_react.useState(false);
	const [sweepingWatchdog, setSweepingWatchdog] = import_react.useState(false);
	const [togglingSpillId, setTogglingSpillId] = import_react.useState(null);
	const [triggerChannel, setTriggerChannel] = import_react.useState("github");
	const [triggerActor, setTriggerActor] = import_react.useState("dsh-bot");
	const [triggerThreadKey, setTriggerThreadKey] = import_react.useState("gh:ops-console#pr-142");
	const [triggerSummary, setTriggerSummary] = import_react.useState("GitHub PR 状态标签自动回写（Agent 自触发回声）");
	const [sendingTrigger, setSendingTrigger] = import_react.useState(false);
	const [teamPrompt, setTeamPrompt] = import_react.useState("使用隔离 Worktree 蜂群重构 auth 安全路由并由 DSH 专家团队执行多维评审门禁");
	const [teamChannel, setTeamChannel] = import_react.useState("github");
	const [enableAutoSpill, setEnableAutoSpill] = import_react.useState(true);
	const [runningTeam, setRunningTeam] = import_react.useState(false);
	const [lastRun, setLastRun] = import_react.useState(null);
	import_react.useEffect(() => {
		setRouterThinMode(superAgentConfig.routerThinMode !== false);
		setFastPathEnabled(superAgentConfig.fastPathEnabled !== false);
		setSubscriptionPassthrough(superAgentConfig.subscriptionPassthrough !== false);
		setInlineBudgetKb(superAgentConfig.inlineBudgetKb || 32);
		setWatchdogStallSec(superAgentConfig.watchdogStallSec || 180);
		setAttentionBudgetLimit(superAgentConfig.attentionBudgetLimit || 4);
		setConsensusPolicy(superAgentConfig.consensusPolicy || "weighted");
		setMaxReworkRounds(superAgentConfig.maxReworkRounds || 2);
	}, [
		superAgentConfig.routerThinMode,
		superAgentConfig.fastPathEnabled,
		superAgentConfig.subscriptionPassthrough,
		superAgentConfig.inlineBudgetKb,
		superAgentConfig.watchdogStallSec,
		superAgentConfig.attentionBudgetLimit,
		superAgentConfig.consensusPolicy,
		superAgentConfig.maxReworkRounds
	]);
	const triggerBreakdown = import_react.useMemo(() => buildTriggerPathBreakdown(triggerEvents), [triggerEvents]);
	const spillStats = import_react.useMemo(() => computeContextSpillStats(contextSpillNodes, inlineBudgetKb), [contextSpillNodes, inlineBudgetKb]);
	const attentionState = import_react.useMemo(() => computeAttentionBudgetState(superAgentTickets, attentionBudgetLimit), [superAgentTickets, attentionBudgetLimit]);
	const agentNameById = import_react.useMemo(() => new Map(agents.map((a) => [a.id, a.name])), [agents]);
	const inlineBudgetPct = Math.min(100, Math.round(spillStats.inlineKb / Math.max(1, inlineBudgetKb) * 100));
	const handleSaveConfig = async () => {
		if (readOnly || savingConfig) return;
		setSavingConfig(true);
		try {
			const res = await updateSuperAgentConfig({
				routerThinMode,
				fastPathEnabled,
				subscriptionPassthrough,
				inlineBudgetKb,
				watchdogStallSec,
				attentionBudgetLimit,
				consensusPolicy,
				maxReworkRounds
			});
			onToast?.(`SuperAgent 策略已保存：Inline 预算 ${res.superAgentConfig.inlineBudgetKb}KB · Watchdog ${res.superAgentConfig.watchdogStallSec}s`, "ok");
			await onReload();
		} catch (err) {
			onToast?.(`保存 SuperAgent 策略失败：${err.message}`, "err");
		} finally {
			setSavingConfig(false);
		}
	};
	const handleWatchdogSweep = async () => {
		if (readOnly || sweepingWatchdog) return;
		setSweepingWatchdog(true);
		try {
			const res = await runSuperAgentWatchdogSweep();
			onToast?.(res.recoveredCount > 0 ? `Watchdog 巡检完成：检测 ${res.checkedCount} 个工单，已自动恢复 ${res.recoveredCount} 个阻塞会话` : `Watchdog 巡检完成：${res.checkedCount} 个活跃隔离工单全部心跳正常`, "ok");
			await onReload();
		} catch (err) {
			onToast?.(`执行 Watchdog 巡检失败：${err.message}`, "err");
		} finally {
			setSweepingWatchdog(false);
		}
	};
	const handleIngestTrigger = async (e) => {
		e.preventDefault();
		if (readOnly || sendingTrigger) return;
		if (!triggerSummary.trim()) {
			onToast?.("请填写触发事件摘要", "err");
			return;
		}
		setSendingTrigger(true);
		try {
			const res = await ingestSuperAgentTrigger({
				channel: triggerChannel,
				actor: triggerActor.trim() || "webhook",
				threadKey: triggerThreadKey.trim() || void 0,
				summary: triggerSummary.trim()
			});
			const meta = getDecisionMeta(res.trigger.decision);
			onToast?.(`触发器分流完成 [${meta.label}]${res.ticket ? ` -> 工单 ${res.ticket.id}` : ""}${res.trigger.tokensSaved > 0 ? ` · 节省 ${res.trigger.tokensSaved} Token` : ""}`, "ok");
			await onReload();
		} catch (err) {
			onToast?.(`提交触发事件失败：${err.message}`, "err");
		} finally {
			setSendingTrigger(false);
		}
	};
	const handleToggleSpill = async (node) => {
		if (readOnly || togglingSpillId) return;
		setTogglingSpillId(node.spillId);
		try {
			const res = await toggleSuperAgentContextSpill(node.spillId);
			onToast?.(res.node.state === "inline" ? `Chain of Recall 已按需回溯 ${res.node.spillId}（累计回溯 ${res.node.recallCount} 次）` : `已将 ${res.node.spillId} 溢出降载，释放 ${formatBytesKb(res.node.bytes)} 活动窗口`, "ok");
			await onReload();
		} catch (err) {
			onToast?.(`切换上下文状态失败：${err.message}`, "err");
		} finally {
			setTogglingSpillId(null);
		}
	};
	const handleRunDshTeam = async (e) => {
		e.preventDefault();
		if (readOnly || runningTeam) return;
		if (!teamPrompt.trim()) {
			onToast?.("请输入团队协同任务描述", "err");
			return;
		}
		setRunningTeam(true);
		try {
			const res = await runDshTeamCollaboration({
				prompt: teamPrompt.trim(),
				channel: teamChannel,
				consensusPolicy,
				enableAutoSpill
			});
			setLastRun({
				task: res.task,
				ticket: res.ticket,
				policy: res.policy,
				approved: res.approved,
				spilledNode: res.spilledNode
			});
			onToast?.(`DSH 智能体团队协同完成：工单 ${res.ticket.id} · 评分 ${res.task.dshReview?.score ?? 92}/100 (${res.approved ? "共识放行" : "待返工"})`, "ok");
			await onReload();
		} catch (err) {
			onToast?.(`执行 DSH 团队协同失败：${err.message}`, "err");
		} finally {
			setRunningTeam(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiStrip, {
				asymmetric: true,
				cells: [
					{
						label: "任务 / Agent 吞吐比",
						meta: `${swarmMetrics.activeAgents} 在线节点`,
						value: `${swarmMetrics.taskToAgentThroughputRatio.toFixed(2)}x`,
						sub: `${swarmMetrics.totalWorkUnits} 单元 · 并行加速 ${swarmMetrics.parallelSpeedup.toFixed(2)}x`,
						tone: "ok"
					},
					{
						label: "Fast Path 代码直滤卸载",
						meta: `节省 ~${formatCompactNumber(swarmMetrics.routerTokensSaved)} Token`,
						value: `${swarmMetrics.fastPathOffloadPct}%`,
						ratioPct: swarmMetrics.fastPathOffloadPct,
						sub: `直滤 ${swarmMetrics.fastDropCount} · 订阅直通 ${swarmMetrics.fastPassthroughCount} · Router ${swarmMetrics.slowSpawnCount}`,
						tone: swarmMetrics.fastPathOffloadPct >= 50 ? "ok" : void 0
					},
					{
						label: "Inline / Spill 上下文降载",
						meta: `预算 ${inlineBudgetKb} KB`,
						value: `${spillStats.spilledKb} KB`,
						ratioPct: spillStats.offloadPct,
						sub: `活动窗口 ${spillStats.inlineKb} KB · ${spillStats.spilledCount}/${contextSpillNodes.length} 节点已溢出`,
						tone: spillStats.overBudget ? "warn" : "ok"
					},
					{
						label: "Watchdog 与注意力预算",
						meta: `DSH 共识 ${swarmMetrics.dshConsensusRate}%`,
						value: `${attentionState.needsAttention}/${attentionState.limit}`,
						sub: attentionState.stalled > 0 ? `${attentionState.stalled} 个阻塞工单待巡检恢复` : `${attentionState.active} 个活跃工单全部心跳正常`,
						tone: attentionState.tone
					}
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "蜂群节点任务吞吐与协作负载",
					description: "统计各 Agent 节点承接的隔离工单、主控拆解与子任务工作单元及跨节点协作事件密度。",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-[224px] w-full min-w-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
								data: swarmMetrics.perAgentStats,
								margin: {
									top: 8,
									right: 12,
									left: -16,
									bottom: 4
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										strokeDasharray: "3 3",
										stroke: "var(--border-subtle)",
										vertical: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "name",
										tickFormatter: (v) => {
											const s = String(v || "");
											return s.length > 8 ? `${s.slice(0, 7)}…` : s;
										},
										tick: {
											fontSize: 11,
											fill: "var(--ink-subtle)"
										},
										axisLine: { stroke: "var(--border-subtle)" },
										tickLine: false,
										interval: 0,
										height: 28
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										tick: {
											fontSize: 11,
											fill: "var(--ink-subtle)"
										},
										axisLine: false,
										tickLine: false,
										allowDecimals: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
										backgroundColor: "var(--surface-elevated)",
										borderColor: "var(--border)",
										color: "var(--ink)",
										borderRadius: "8px",
										fontSize: "12px"
									} }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "handledUnits",
										name: "处理工作单元",
										fill: "var(--accent)",
										radius: [
											3,
											3,
											0,
											0
										],
										maxBarSize: 26,
										isAnimationActive: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "collabEvents",
										name: "协作事件数",
										fill: "#0ea5e9",
										radius: [
											3,
											3,
											0,
											0
										],
										maxBarSize: 26,
										isAnimationActive: false
									})
								]
							})
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Fast / Slow Path 事件分流与 Router 卸载",
					description: "借鉴 DeepSeek SuperAgent：优先在纯代码 Fast Path 拦截自回声/噪音与已订阅线程直通，仅将新任务升至薄 Router。",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-[192px] w-full min-w-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
								data: triggerBreakdown.items,
								margin: {
									top: 8,
									right: 12,
									left: -16,
									bottom: 4
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										strokeDasharray: "3 3",
										stroke: "var(--border-subtle)",
										vertical: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "label",
										tick: {
											fontSize: 11,
											fill: "var(--ink-subtle)"
										},
										axisLine: { stroke: "var(--border-subtle)" },
										tickLine: false,
										interval: 0
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										tick: {
											fontSize: 11,
											fill: "var(--ink-subtle)"
										},
										axisLine: false,
										tickLine: false,
										allowDecimals: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
										formatter: (value, name) => [String(value), String(name)],
										contentStyle: {
											backgroundColor: "var(--surface-elevated)",
											borderColor: "var(--border)",
											color: "var(--ink)",
											borderRadius: "8px",
											fontSize: "12px"
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "count",
										name: "事件数",
										radius: [
											4,
											4,
											0,
											0
										],
										maxBarSize: 38,
										isAnimationActive: false,
										children: triggerBreakdown.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: item.key === "fast_drop" ? "#10b981" : item.key === "fast_passthrough" ? "#0ea5e9" : "var(--accent)" }, item.key))
									})
								]
							})
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5 text-[11px] font-mono tabular-nums text-[var(--ink-subtle)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"代码层卸载率 ",
							triggerBreakdown.offloadPct,
							"%（共 ",
							triggerBreakdown.total,
							" 条触发记录）"
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[var(--ok)]",
							children: [
								"累计节省 ~",
								formatCompactNumber(triggerBreakdown.totalTokensSaved),
								" Router Token"
							]
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "薄 Router 策略与隔离工单 (Watchdog)",
					description: "全局薄 Router 仅做路由受理而不执行本地 Bash；外部 Watchdog 监控各独立 Git Worktree 进展并自动恢复阻塞工单。",
					actions: !readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							disabled: savingConfig,
							onClick: () => void handleSaveConfig(),
							"data-testid": "superagent-config-save-btn",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-3.5" }), savingConfig ? "保存中…" : "保存策略"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "primary",
							size: "sm",
							disabled: sweepingWatchdog,
							onClick: () => void handleWatchdogSweep(),
							"data-testid": "superagent-watchdog-sweep-btn",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-3.5", sweepingWatchdog && "animate-spin") }), sweepingWatchdog ? "巡检恢复中…" : "运行 Watchdog 巡检恢复"]
						})]
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-4 space-y-3 border-b border-[var(--border-subtle)] pb-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--ink-muted)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-1.5 cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: routerThinMode,
										disabled: readOnly,
										onChange: (e) => setRouterThinMode(e.target.checked),
										className: "rounded border-[var(--border-subtle)] accent-[var(--accent)]"
									}), "薄 Router 零执行模式"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-1.5 cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: fastPathEnabled,
										disabled: readOnly,
										onChange: (e) => setFastPathEnabled(e.target.checked),
										className: "rounded border-[var(--border-subtle)] accent-[var(--accent)]"
									}), "Fast Path 确定性直滤"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-1.5 cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: subscriptionPassthrough,
										disabled: readOnly,
										onChange: (e) => setSubscriptionPassthrough(e.target.checked),
										className: "rounded border-[var(--border-subtle)] accent-[var(--accent)]"
									}), "Subscription Passthrough 线程直通"]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2.5 sm:grid-cols-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
										children: "Inline 阈值 (KB)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: inlineBudgetKb,
										disabled: readOnly,
										onChange: (e) => setInlineBudgetKb(Number(e.target.value)),
										className: cn("ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer", inputBaseClass),
										"data-testid": "superagent-inline-budget-select",
										children: [
											16,
											24,
											32,
											48,
											64
										].map((kb) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: kb,
											children: [kb, " KB"]
										}, kb))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
										children: "Watchdog 超时"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: watchdogStallSec,
										disabled: readOnly,
										onChange: (e) => setWatchdogStallSec(Number(e.target.value)),
										className: cn("ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer", inputBaseClass),
										children: [
											60,
											120,
											180,
											300,
											600
										].map((sec) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: sec,
											children: [sec, "s"]
										}, sec))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
										children: "注意力上限"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: attentionBudgetLimit,
										disabled: readOnly,
										onChange: (e) => setAttentionBudgetLimit(Number(e.target.value)),
										className: cn("ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer", inputBaseClass),
										children: [
											2,
											4,
											6,
											8
										].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: n,
											children: [
												"最多 ",
												n,
												" 项"
											]
										}, n))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
										children: "DSH 共识策略"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: consensusPolicy,
										disabled: readOnly,
										onChange: (e) => setConsensusPolicy(e.target.value),
										className: cn("ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer", inputBaseClass),
										"data-testid": "dsh-consensus-select",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "weighted",
												children: "加权专家共识"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "unanimous",
												children: "全员一致门禁"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "lead-override",
												children: "主控最终裁决"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
										children: "最大返工轮次"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: maxReworkRounds,
										disabled: readOnly,
										onChange: (e) => setMaxReworkRounds(Number(e.target.value)),
										className: cn("ui-select w-full h-8 pl-2.5 text-xs min-w-0 cursor-pointer", inputBaseClass),
										children: [
											1,
											2,
											3,
											4
										].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: n,
											children: [n, " 轮"]
										}, n))
									})]
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "divide-y divide-[var(--border-subtle)]",
						"data-testid": "superagent-tickets-list",
						children: superAgentTickets.map((ticket) => {
							const statusMeta = getTicketStatusMeta(ticket);
							const isStalled = ticket.status === "stalled" || ticket.watchdogState === "stalled";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								"data-testid": `superagent-ticket-${ticket.id}`,
								className: "py-3 first:pt-0 last:pb-0 space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-start justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [
												isStalled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldExclamationPoint, { className: "size-3.5 text-[var(--err)] shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-3.5 text-[var(--accent)] shrink-0" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono text-xs font-semibold text-[var(--ink)]",
													children: ticket.id
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono text-[11px] text-[var(--ink-subtle)]",
													children: [
														"[",
														ticket.channel,
														"] ",
														ticket.threadKey
													]
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-xs font-medium text-[var(--ink)] leading-snug",
											children: ticket.title
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
										status: statusMeta.status,
										label: statusMeta.label
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[var(--ink-subtle)]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[var(--ink-muted)] truncate",
											children: ["Worker: ", ticket.workerAgentName.replace(/\s*\(.*?\)\s*/g, "")]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1 truncate",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "size-3 shrink-0" }), ticket.worktreeBranch]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Inline ", formatBytesKb(ticket.inlineBytes)] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Spill ", ticket.spilledCount] }),
											ticket.dshScore != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-[var(--ok)] font-semibold",
												children: [
													"DSH ",
													ticket.dshScore,
													"/100"
												]
											}),
											onOpenAgentLogs && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => onOpenAgentLogs(ticket.workerAgentId),
												className: "text-[var(--accent)] hover:underline cursor-pointer",
												children: "追踪日志"
											})
										]
									})]
								})]
							}, ticket.id);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Fast / Slow Path 触发器入口",
					description: "模拟外部 GitHub / CI / 飞书 / 告警事件流入，验证零 Token 代码直滤、已订阅直通与薄 Router 派单。",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-3 flex flex-wrap items-center gap-1.5",
							children: TRIGGER_PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "secondary",
								size: "sm",
								type: "button",
								disabled: readOnly,
								"data-testid": `trigger-preset-${preset.id}`,
								onClick: () => {
									setTriggerChannel(preset.channel);
									setTriggerActor(preset.actor);
									setTriggerThreadKey(preset.threadKey);
									setTriggerSummary(preset.summary);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "size-3 text-[var(--accent)]" }), preset.label]
							}, preset.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (e) => void handleIngestTrigger(e),
							className: "space-y-2.5 border-b border-[var(--border-subtle)] pb-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
											children: "来源通道"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: triggerChannel,
											disabled: readOnly,
											onChange: (e) => setTriggerChannel(e.target.value),
											className: cn("ui-select w-full h-8 pl-2.5 text-xs cursor-pointer", inputBaseClass),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "github",
													children: "github"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "ci",
													children: "ci"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "feishu",
													children: "feishu"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "alert",
													children: "alert"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "webhook",
													children: "webhook"
												})
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
											children: "触发者 Actor"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: triggerActor,
											disabled: readOnly,
											onChange: (e) => setTriggerActor(e.target.value),
											placeholder: "dsh-bot / maintainer",
											className: cn(inputBaseClass, "w-full h-8 px-2.5 text-xs font-mono")
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
										children: "线程键 ThreadKey"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: triggerThreadKey,
										disabled: readOnly,
										onChange: (e) => setTriggerThreadKey(e.target.value),
										placeholder: "gh:ops-console#pr-142",
										className: cn(inputBaseClass, "w-full h-8 px-2.5 text-xs font-mono")
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
										children: "事件内容摘要"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: triggerSummary,
										disabled: readOnly,
										onChange: (e) => setTriggerSummary(e.target.value),
										placeholder: "描述触发事件…",
										className: cn(inputBaseClass, "w-full h-8 px-2.5 text-xs"),
										"data-testid": "superagent-trigger-summary-input"
									})]
								}),
								!readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex justify-end",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "primary",
										size: "sm",
										type: "submit",
										disabled: sendingTrigger,
										"data-testid": "superagent-trigger-submit-btn",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-3.5" }), sendingTrigger ? "分流中…" : "模拟触发分流"]
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 divide-y divide-[var(--border-subtle)] max-h-[250px] overflow-y-auto",
							"data-testid": "superagent-triggers-list",
							children: triggerEvents.slice(0, 8).map((ev) => {
								const meta = getDecisionMeta(ev.decision);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: cn("font-semibold shrink-0", meta.colorClass),
													children: meta.label
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[var(--ink-subtle)] truncate",
													children: [
														ev.channel,
														"/",
														ev.actor,
														" · ",
														ev.threadKey
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[var(--ink-subtle)] shrink-0",
												children: ev.tokensSaved > 0 ? `-${ev.tokensSaved} tok` : ev.ticketId || formatShortTime(ev.ts)
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-[var(--ink)] leading-snug line-clamp-1",
											children: ev.summary
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-[var(--ink-subtle)] leading-snug line-clamp-2",
											children: ev.reason
										})
									]
								}, ev.id);
							})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Inline / Spill 上下文缓存 (Chain of Recall)",
					description: "遵循编译器缓存分层理念：大体积 Diff 与 CI 输出自动溢出为外部句柄，保持活动上下文低于预算阈值，按需一键回溯。",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-4 space-y-1.5 border-b border-[var(--border-subtle)] pb-3.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[var(--ink-muted)]",
								children: [
									"活动窗口 Inline：",
									spillStats.inlineKb,
									" KB / ",
									inlineBudgetKb,
									" KB 预算"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: spillStats.overBudget ? "text-[var(--warn)] font-semibold" : "text-[var(--ok)]",
								children: [
									"已溢出释放 ",
									spillStats.spilledKb,
									" KB（降载率 ",
									spillStats.offloadPct,
									"% · 累计回溯 ",
									spillStats.totalRecalls,
									" 次）"
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: cn("h-full rounded-full transition-[width] duration-200 ease-out", spillStats.overBudget ? "bg-[var(--warn-dot)]" : "bg-[var(--accent)]"),
								style: { width: `${Math.max(4, inlineBudgetPct)}%` }
							})
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "divide-y divide-[var(--border-subtle)]",
						"data-testid": "superagent-spill-list",
						children: contextSpillNodes.map((node) => {
							const isInline = node.state === "inline";
							const isBusy = togglingSpillId === node.spillId;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								"data-testid": `spill-node-${node.spillId}`,
								className: "py-3 first:pt-0 last:pb-0 space-y-1.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-start justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-center gap-2 text-xs",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "size-3.5 text-[var(--accent)] shrink-0" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-mono font-semibold text-[var(--ink)]",
														children: node.spillId
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-mono text-[11px] text-[var(--ink-subtle)] truncate",
														children: node.parentRef
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 text-xs font-medium text-[var(--ink)]",
												children: node.label
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-0.5 font-mono text-[11px] text-[var(--ink-subtle)] break-all line-clamp-2",
												children: node.preview
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-end gap-1.5 shrink-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 font-mono text-[11px] tabular-nums",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: isInline ? "text-[var(--warn)] font-semibold" : "text-[var(--ok)] font-semibold",
												children: isInline ? "INLINE 活动" : "SPILLED 溢出"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-[var(--ink-subtle)]",
												children: [
													formatBytesKb(node.bytes),
													" · 回溯 ",
													node.recallCount,
													" 次"
												]
											})]
										}), !readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "secondary",
											size: "sm",
											disabled: isBusy,
											onClick: () => void handleToggleSpill(node),
											"data-testid": `spill-toggle-${node.spillId}`,
											children: isInline ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HardDriveUpload, { className: "size-3 text-[var(--ok)]" }), "溢出降载"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HardDriveDownload, { className: "size-3 text-[var(--accent)]" }), "Chain of Recall 回溯"] })
										})]
									})]
								})
							}, node.spillId);
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "DSH 智能体团队协同编排 (Team Runner)",
					description: "由薄 Router 统筹隔离 Worker 蜂群并行拆解执行，自动将大体积 Diff 溢出至 Chain of Recall，并经 DSH 专家团加权门禁放行。",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-4 divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-2 flex items-center justify-between text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5 font-medium text-[var(--ink)]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-3.5 text-[var(--accent)]" }), "SuperAgent × DSH 角色编组与投票权重"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-[11px] text-[var(--ink-subtle)]",
									children: ["策略: ", consensusPolicy]
								})]
							}), (superAgentConfig.roles || []).map((role) => {
								const assignedName = agentNameById.get(role.agentId) || role.agentId;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2 py-2 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium text-[var(--ink)] truncate",
											children: role.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-[var(--ink-subtle)] truncate",
											children: assignedName
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 shrink-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono tabular-nums text-[11px] text-[var(--ink-muted)]",
											children: [
												"权重 ",
												Math.round(role.weight * 100),
												"%"
											]
										}), onOpenAgentLogs && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "sm",
											onClick: () => onOpenAgentLogs(role.agentId),
											children: "实时日志"
										})]
									})]
								}, role.id);
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (e) => void handleRunDshTeam(e),
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block text-[11px] font-medium text-[var(--ink-subtle)]",
									children: "团队协同任务指令（创建独立 Git Worktree 工单并触发 DSH 专家多维评审）"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									rows: 3,
									value: teamPrompt,
									disabled: readOnly,
									onChange: (e) => setTeamPrompt(e.target.value),
									className: cn(inputBaseClass, "w-full px-2.5 py-2 text-xs leading-relaxed"),
									"data-testid": "dsh-team-prompt-input"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: teamChannel,
										disabled: readOnly,
										onChange: (e) => setTeamChannel(e.target.value),
										"aria-label": "选择任务来源通道",
										className: cn("ui-select h-8 pl-2.5 text-xs cursor-pointer", inputBaseClass),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "github",
												children: "github"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "ci",
												children: "ci"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "feishu",
												children: "feishu"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "alert",
												children: "alert"
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "inline-flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: enableAutoSpill,
											disabled: readOnly,
											onChange: (e) => setEnableAutoSpill(e.target.checked),
											className: "rounded border-[var(--border-subtle)] accent-[var(--accent)]"
										}), "自动 Spill 溢出证据链"]
									})]
								}), !readOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "primary",
									size: "sm",
									type: "submit",
									disabled: runningTeam,
									"data-testid": "dsh-team-run-btn",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5" }), runningTeam ? "团队蜂群协同中…" : "启动 DSH 团队协同"]
								})]
							})]
						}),
						lastRun && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 space-y-2.5 border-t border-[var(--border-subtle)] pt-4",
							"data-testid": "dsh-team-run-result",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-3.5 text-[var(--ok)]" }), "最近一次 DSH 团队协同结果"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: cn("font-mono text-xs font-semibold", lastRun.approved ? "text-[var(--ok)]" : "text-[var(--warn)]"),
										children: [
											lastRun.task.dshReview?.score ?? 92,
											"/100 · ",
											lastRun.approved ? "共识放行" : "打回返工"
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11px] text-[var(--ink-subtle)]",
									children: [
										"工单 ",
										lastRun.ticket.id,
										" · 分支 ",
										lastRun.ticket.worktreeBranch,
										lastRun.spilledNode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "ml-2 text-[var(--warn)]",
											children: [
												"· Spill 句柄 ",
												lastRun.spilledNode.spillId,
												" (",
												formatBytesKb(lastRun.spilledNode.bytes),
												")"
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-[var(--ink-muted)] leading-relaxed",
									children: lastRun.task.artifact
								}),
								lastRun.task.subtasks && lastRun.task.subtasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "divide-y divide-[var(--border-subtle)] rounded border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-2.5",
									children: lastRun.task.subtasks.map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2 py-1.5 text-[11px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium text-[var(--ink)] truncate",
											children: [
												"[",
												st.role,
												"] ",
												st.agentName.replace(/\s*\(.*?\)\s*/g, "")
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-[var(--ink-subtle)] shrink-0",
											children: [
												st.model,
												" · ",
												st.effort
											]
										})]
									}, st.id))
								}),
								onOpenAgentLogs && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "pt-1",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "secondary",
										size: "sm",
										onClick: () => onOpenAgentLogs("all"),
										children: "在实时 Agent 协作日志中查看完整追踪"
									})
								})
							]
						})
					]
				})]
			})
		]
	});
}
// web/views/AgentSettingsView.tsx
var AgentSettingsView_exports = /* @__PURE__ */ __exportAll({
	AgentSettingsView: () => AgentSettingsView,
	default: () => AgentSettingsView
});
var ArchitectureGraph = import_react.lazy(() => __vitePreload(() => import("./ArchitectureGraph-Bi6KwZoe.js").then((m) => ({ default: m.ArchitectureGraph })), __vite__mapDeps([0,1,2,3,4,5,6,7])));
var AgentOrchestrationCanvas = import_react.lazy(() => __vitePreload(() => import("./AgentOrchestrationCanvas-9t9HPMaW.js").then((m) => ({ default: m.AgentOrchestrationCanvas })), []));
var SETTINGS_TABS = [
	{
		value: "roles",
		label: "分工与迭代"
	},
	{
		value: "a2a",
		label: "A2A 路由"
	},
	{
		value: "topology",
		label: "集群拓扑"
	},
	{
		value: "swarm",
		label: "蜂群引擎"
	},
	{
		value: "governance",
		label: "安全护栏"
	},
	{
		value: "logs",
		label: "协作日志"
	},
	{
		value: "gateway",
		label: "网关与进程"
	}
];
var TELEMETRY_MODES = [{
	value: "tokens",
	label: "Token 吞吐 (K)"
}, {
	value: "latency",
	label: "TTFT / P95 延迟 (ms)"
}];
function formatHourLabel(ts) {
	const d = new Date(ts);
	return `${String(d.getHours()).padStart(2, "0")}:00`;
}
function AgentSettingsView({ snapshot, readOnly = false, selectedCategory = "", selectedPid = null, onSelectCategory, onSelectPid, onSnapshotChanged, onToast, onConfirm }) {
	const magpie = snapshot?.magpie;
	const processes = snapshot?.agents?.processes || [];
	const rowRefs = import_react.useRef({});
	const [activeTab, setActiveTab] = import_react.useState(selectedPid != null || Boolean(selectedCategory) ? "gateway" : "roles");
	const [telemetry, setTelemetry] = import_react.useState(null);
	const [topologyState, setTopologyState] = import_react.useState(null);
	const [linearState, setLinearState] = import_react.useState(null);
	const [topologyLoading, setTopologyLoading] = import_react.useState(false);
	const [focusedLogAgentId, setFocusedLogAgentId] = import_react.useState("all");
	const [chartMode, setChartMode] = import_react.useState("tokens");
	const [procQuery, setProcQuery] = import_react.useState("");
	const [procSort, setProcSort] = import_react.useState("cpu");
	const [procSortDir, setProcSortDir] = import_react.useState("desc");
	const [savingCommander, setSavingCommander] = import_react.useState(false);
	const [commanderDraft, setCommanderDraft] = import_react.useState({
		leadAgentId: "",
		worktreePrefix: "feat/linear-",
		autoDecompose: true,
		autoAssignWorkers: true,
		autoSyncGithub: true,
		requireDshReview: true
	});
	const [creatingProject, setCreatingProject] = import_react.useState(false);
	const [projectForm, setProjectForm] = import_react.useState({
		name: "",
		key: "",
		summary: "",
		githubRepo: "",
		targetDate: "2026-12-31"
	});
	import_react.useEffect(() => {
		if (selectedPid != null || selectedCategory) setActiveTab("gateway");
	}, [selectedPid, selectedCategory]);
	const loadLinear = import_react.useCallback(async () => {
		try {
			const lin = await fetchLinearState();
			setLinearState(lin);
			setCommanderDraft({
				leadAgentId: lin.commander.leadAgentId || lin.availableAgents[0]?.id || "",
				worktreePrefix: lin.commander.worktreePrefix || "feat/linear-",
				autoDecompose: lin.commander.autoDecompose,
				autoAssignWorkers: lin.commander.autoAssignWorkers,
				autoSyncGithub: lin.commander.autoSyncGithub,
				requireDshReview: lin.commander.requireDshReview
			});
		} catch {}
	}, []);
	const loadTopologyState = import_react.useCallback(async (signal) => {
		setTopologyLoading(true);
		try {
			const res = await fetchA2AState(signal);
			if (!signal?.aborted) setTopologyState(res);
		} catch (err) {
			if (!signal?.aborted) onToast?.(`加载 Agent 状态失败：${err.message}`, "err");
		} finally {
			if (!signal?.aborted) setTopologyLoading(false);
		}
	}, [onToast]);
	import_react.useEffect(() => {
		if (activeTab === "roles") loadLinear();
		if (activeTab === "topology" || activeTab === "swarm" || activeTab === "logs") {
			const controller = new AbortController();
			loadTopologyState(controller.signal);
			return () => controller.abort();
		}
	}, [
		activeTab,
		loadLinear,
		loadTopologyState
	]);
	import_react.useEffect(() => {
		if (activeTab !== "gateway") return;
		const controller = new AbortController();
		fetchGatewayTelemetry(controller.signal).then((res) => {
			if (!controller.signal.aborted) setTelemetry(res);
		}).catch(() => {});
		return () => controller.abort();
	}, [activeTab]);
	import_react.useEffect(() => {
		if (selectedPid != null && rowRefs.current[selectedPid]) rowRefs.current[selectedPid]?.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}, [selectedPid]);
	const handleSaveCommander = async (e) => {
		e.preventDefault();
		if (readOnly) return;
		setSavingCommander(true);
		try {
			await Promise.all([commanderDraft.leadAgentId ? setLeadA2AAgent(commanderDraft.leadAgentId) : Promise.resolve(), updateLinearCommander({
				leadAgentId: commanderDraft.leadAgentId || null,
				worktreePrefix: commanderDraft.worktreePrefix,
				autoDecompose: commanderDraft.autoDecompose,
				autoAssignWorkers: commanderDraft.autoAssignWorkers,
				autoSyncGithub: commanderDraft.autoSyncGithub,
				requireDshReview: commanderDraft.requireDshReview
			})]);
			onToast?.("总指挥与分工策略已保存", "ok");
			await loadLinear();
			onSnapshotChanged?.();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "保存总指挥策略失败", "err");
		} finally {
			setSavingCommander(false);
		}
	};
	const handleCreateProject = async (e) => {
		e.preventDefault();
		if (readOnly || !projectForm.name.trim()) return;
		setCreatingProject(true);
		try {
			const res = await createLinearProject({
				name: projectForm.name.trim(),
				key: projectForm.key.trim() || void 0,
				summary: projectForm.summary.trim(),
				githubRepo: projectForm.githubRepo.trim() || void 0,
				targetDate: projectForm.targetDate
			});
			onToast?.(`已新增项目：${res.project.key} · ${res.project.name}`, "ok");
			setProjectForm({
				name: "",
				key: "",
				summary: "",
				githubRepo: "",
				targetDate: "2026-12-31"
			});
			await loadLinear();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "新增项目失败", "err");
		} finally {
			setCreatingProject(false);
		}
	};
	const handleJumpToAgentLogs = import_react.useCallback((agentId) => {
		setFocusedLogAgentId(agentId || "all");
		setActiveTab("logs");
	}, []);
	const toggleProcSort = (field) => {
		if (procSort === field) setProcSortDir((prev) => prev === "asc" ? "desc" : "asc");
		else {
			setProcSort(field);
			setProcSortDir(field === "pid" ? "asc" : "desc");
		}
	};
	const renderProcSortIcon = (field) => {
		if (procSort !== field) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpDown, {
			className: "size-3 text-[var(--ink-subtle)]/70",
			strokeWidth: 1.75
		});
		return procSortDir === "asc" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, {
			className: "size-3 text-[var(--accent)]",
			strokeWidth: 2
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, {
			className: "size-3 text-[var(--accent)]",
			strokeWidth: 2
		});
	};
	const filteredProcesses = import_react.useMemo(() => {
		let base = processes;
		if (selectedPid != null) {
			const pidMatches = processes.filter((p) => p.pid === selectedPid);
			if (pidMatches.length > 0) base = pidMatches;
		} else if (selectedCategory) base = processes.filter((p) => (p.categoryLabel || p.category || "Agent") === selectedCategory);
		const q = procQuery.trim().toLowerCase();
		if (q) base = base.filter((p) => {
			return `${p.pid} ${p.categoryLabel || p.category || ""} ${p.cmd || p.command || ""}`.toLowerCase().includes(q);
		});
		const dir = procSortDir === "asc" ? 1 : -1;
		return [...base].sort((a, b) => {
			if (procSort === "cpu") return ((a.cpu ?? 0) - (b.cpu ?? 0)) * dir;
			if (procSort === "mem") return ((a.memoryBytes ?? a.rssBytes ?? 0) - (b.memoryBytes ?? b.rssBytes ?? 0)) * dir;
			return (a.pid - b.pid) * dir;
		});
	}, [
		processes,
		selectedCategory,
		selectedPid,
		procQuery,
		procSort,
		procSortDir
	]);
	const totalProviderCost = import_react.useMemo(() => (telemetry?.providers || []).reduce((sum, p) => sum + (p.costUsd || 0), 0), [telemetry?.providers]);
	const providers = magpie?.providers || [];
	const totalModels = magpie?.totalModels || providers.reduce((sum, p) => sum + p.count, 0) || 1;
	const agents = magpie?.agents || [];
	const summary = telemetry?.summary;
	const budgetPct = summary && summary.dailyBudgetUsd > 0 ? Math.min(100, Math.round(summary.estimatedCostUsd24h / summary.dailyBudgetUsd * 100)) : 0;
	const noopToast = import_react.useCallback(() => {}, []);
	const noopConfirm = import_react.useCallback(() => {}, []);
	const noopRefresh = import_react.useCallback(() => {}, []);
	const fleetNodes = snapshot?.fleet?.nodes || [];
	const handleTopologyUpdateConfig = async (patch) => {
		if (readOnly) return;
		try {
			await updateA2AOrchestrationConfig(patch);
			await loadTopologyState();
			onToast?.("编排调度策略已更新并持久化", "ok");
		} catch (err) {
			onToast?.(`更新策略失败：${err.message}`, "err");
		}
	};
	const handleTopologySavePositions = async (positions) => {
		if (readOnly) return;
		try {
			await saveA2ATopologyPositions(positions);
			await loadTopologyState();
		} catch (err) {
			onToast?.(`保存节点排版失败：${err.message}`, "err");
		}
	};
	const handleTopologyUpsertRule = async (payload) => {
		if (readOnly) return;
		try {
			const res = await upsertA2ARoutingRule(payload);
			onToast?.(`已保存路由策略「${res.rule.name}」`, "ok");
			await loadTopologyState();
		} catch (err) {
			onToast?.(`保存路由失败：${err.message}`, "err");
		}
	};
	const handleTopologyDeleteRule = async (ruleId) => {
		if (readOnly) return;
		try {
			await deleteA2ARoutingRule(ruleId);
			onToast?.("已移除路由边", "ok");
			await loadTopologyState();
		} catch (err) {
			onToast?.(`删除路由失败：${err.message}`, "err");
		}
	};
	const handleTopologyUpdateAgent = async (agentId, patch) => {
		if (readOnly) return;
		try {
			await updateA2AAgent(agentId, patch);
			onToast?.("Agent 参数已更新", "ok");
			await loadTopologyState();
		} catch (err) {
			onToast?.(`更新 Agent 参数失败：${err.message}`, "err");
		}
	};
	const handleTopologySetLead = async (agentId) => {
		if (readOnly) return;
		try {
			const res = await setLeadA2AAgent(agentId);
			onToast?.(`已选举「${res.leadAgent?.name || agentId}」为当前总指挥`, "ok");
			await loadTopologyState();
			onSnapshotChanged?.();
		} catch (err) {
			onToast?.(`切换总指挥失败：${err.message}`, "err");
		}
	};
	const handleTopologyDiscover = async (agent) => {
		try {
			const res = await discoverA2AAgent(agent.id);
			onToast?.(res.ok ? `${agent.name} 探活成功 (${res.latencyMs ?? 0}ms)` : `${agent.name} 暂不可达${res.error ? `：${res.error}` : ""}`, res.ok ? "ok" : "err");
			await loadTopologyState();
		} catch (err) {
			onToast?.(`探活失败：${err.message}`, "err");
		}
	};
	const handleTopologyToggleSkill = async (skill, agentId) => {
		if (readOnly) return;
		try {
			await updateA2ASkill(skill.id, { toggleAgentId: agentId });
			await loadTopologyState();
		} catch (err) {
			onToast?.(`更新 Skill 挂载失败：${err.message}`, "err");
		}
	};
	const cycles = linearState?.cycles || [];
	const projects = linearState?.projects || [];
	const availableAgents = linearState?.availableAgents || [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModuleFrame, {
		title: "Agent 设置与高级编排",
		description: "集中管理总指挥分工、迭代路线图、A2A 路由规则、集群拓扑、蜂群引擎、AI 安全护栏及模型网关。",
		meta: magpie?.reachable ? `${formatCompactNumber(magpie.totalModels ?? 0)} 模型 · ${processes.length} 活跃进程` : `${processes.length} 活跃进程`,
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
			value: activeTab,
			onChange: setActiveTab,
			options: SETTINGS_TABS,
			ariaLabel: "切换 Agent 高级设置分组"
		}),
		testId: "view-agent-settings",
		children: activeTab === "roles" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "总指挥分工与编排策略",
					description: "配置谁作为总指挥 Agent、Worktree 隔离分支前缀及自动拆解/审校门禁。",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleSaveCommander,
						className: "space-y-3.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12.5px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "总指挥 Agent (Lead)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									disabled: readOnly || savingCommander,
									value: commanderDraft.leadAgentId,
									onChange: (e) => setCommanderDraft((d) => ({
										...d,
										leadAgentId: e.target.value
									})),
									className: cn("ui-select w-full h-10 sm:h-9 pl-3 text-[13px] cursor-pointer", inputBaseClass),
									children: availableAgents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
										value: a.id,
										children: [
											a.name,
											" (",
											a.harness,
											" · ",
											a.modelHint || "auto",
											")"
										]
									}, a.id))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12.5px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "Git Worktree 分支前缀"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									disabled: readOnly || savingCommander,
									value: commanderDraft.worktreePrefix,
									onChange: (e) => setCommanderDraft((d) => ({
										...d,
										worktreePrefix: e.target.value
									})),
									className: cn("w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[12.5px] text-[var(--ink-muted)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "inline-flex items-center gap-2 cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											disabled: readOnly,
											checked: commanderDraft.autoDecompose,
											onChange: (e) => setCommanderDraft((d) => ({
												...d,
												autoDecompose: e.target.checked
											})),
											className: "accent-[var(--accent)]"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "接单自动拆解子任务" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "inline-flex items-center gap-2 cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											disabled: readOnly,
											checked: commanderDraft.autoAssignWorkers,
											onChange: (e) => setCommanderDraft((d) => ({
												...d,
												autoAssignWorkers: e.target.checked
											})),
											className: "accent-[var(--accent)]"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "自动分配 Worker Agent" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "inline-flex items-center gap-2 cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											disabled: readOnly,
											checked: commanderDraft.autoSyncGithub,
											onChange: (e) => setCommanderDraft((d) => ({
												...d,
												autoSyncGithub: e.target.checked
											})),
											className: "accent-[var(--accent)]"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "派发时自动关联 PR" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "inline-flex items-center gap-2 cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											disabled: readOnly,
											checked: commanderDraft.requireDshReview,
											onChange: (e) => setCommanderDraft((d) => ({
												...d,
												requireDshReview: e.target.checked
											})),
											className: "accent-[var(--accent)]"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "交付前强制专家评审" })]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "submit",
								variant: "primary",
								size: "sm",
								disabled: readOnly || savingCommander,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-3.5" }), savingCommander ? "保存中..." : "保存策略"]
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "迭代周期 (Cycles)",
					description: "按故事点追踪当前迭代交付进度。",
					children: cycles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "暂无迭代周期数据。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-4",
						children: cycles.map((cycle) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2 pb-4 border-b border-[var(--border-subtle)] last:border-b-0 last:pb-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[14px] font-semibold text-[var(--ink)]",
									children: cycle.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
									children: [
										cycle.startsAt,
										" → ",
										cycle.endsAt,
										" · ",
										cycle.doneCount,
										"/",
										cycle.issueCount,
										" 任务"
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
									status: cycle.status === "active" ? "healthy" : "standby",
									label: cycle.status === "active" ? "进行中" : "即将开始"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceMeter, {
								value: cycle.progressPct,
								label: `已完成 ${cycle.completedPoints}pt / 总计 ${cycle.scopePoints}pt`,
								valueText: `${cycle.progressPct}%`,
								tone: cycle.progressPct >= 50 ? "ok" : "warn"
							})]
						}, cycle.id))
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: `项目路线图 (${projects.length})`,
					className: "lg:col-span-7",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-3.5",
						children: projects.map((proj) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[13.5px] font-semibold text-[var(--ink)]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[var(--accent)] mr-1.5",
										children: proj.key
									}), proj.name]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
									children: [
										"仓库 ",
										proj.githubRepo || "未绑定",
										" · 目标 ",
										proj.targetDate
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
									status: proj.status === "in_progress" ? "healthy" : "standby",
									label: `${proj.progressPct}%`
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceMeter, {
								value: proj.progressPct,
								label: `已完成 ${proj.doneCount} / 总计 ${proj.issueCount}`,
								valueText: `${proj.progressPct}%`
							})]
						}, proj.id))
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "新增项目",
					className: "lg:col-span-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleCreateProject,
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-3 gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "col-span-2 block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "项目名称 *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										required: true,
										disabled: readOnly || creatingProject,
										value: projectForm.name,
										onChange: (e) => setProjectForm((f) => ({
											...f,
											name: e.target.value
										})),
										placeholder: "例如：边缘节点自动扩缩容",
										className: cn("w-full h-10 sm:h-9 px-3 text-[13px]", inputBaseClass)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "Key"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										disabled: readOnly || creatingProject,
										value: projectForm.key,
										onChange: (e) => setProjectForm((f) => ({
											...f,
											key: e.target.value.toUpperCase()
										})),
										placeholder: "EDGE",
										className: cn("w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]", inputBaseClass)
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12.5px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "GitHub 仓库 (owner/repo)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									disabled: readOnly || creatingProject,
									value: projectForm.githubRepo,
									onChange: (e) => setProjectForm((f) => ({
										...f,
										githubRepo: e.target.value
									})),
									placeholder: "example-org/ops-console",
									className: cn("w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12.5px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "目标说明"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									disabled: readOnly || creatingProject,
									value: projectForm.summary,
									onChange: (e) => setProjectForm((f) => ({
										...f,
										summary: e.target.value
									})),
									placeholder: "描述该项目下 Agent 的交付目标...",
									className: cn("w-full h-10 sm:h-9 px-3 text-[13px]", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "submit",
								variant: "primary",
								size: "sm",
								disabled: readOnly || creatingProject || !projectForm.name.trim(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), creatingProject ? "创建中..." : "新增项目"]
							})
						]
					})
				})]
			})]
		}) : activeTab === "a2a" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(A2AOrchestratorSection, {
			snapshot,
			readOnly,
			onSnapshotChanged: onSnapshotChanged || noopRefresh,
			onToast: onToast || noopToast,
			onConfirm: onConfirm || noopConfirm
		}) : activeTab === "topology" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Agent 集群连接拓扑与节点编排",
			description: "融合全节点探针状态与 A2A 路由链路，可视化展示宿主机与主/子 Agent 连接延迟、健康度及 Skill 清单。",
			actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "secondary",
				size: "sm",
				disabled: topologyLoading,
				onClick: () => void loadTopologyState(),
				"data-testid": "topology-refresh-btn",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
					className: cn("size-3.5", topologyLoading && "animate-spin"),
					strokeWidth: 1.75
				}), "刷新拓扑"]
			}),
			children: topologyState?.orchestrationConfig ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
					heightClass: "h-[580px]",
					label: "正在加载集群拓扑视图"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentOrchestrationCanvas, {
					agents: topologyState.agents,
					fleetNodes,
					skillCatalog: topologyState.skillCatalog,
					routingRules: topologyState.routingRules,
					leadAgentId: topologyState.leadAgentId,
					orchestrationConfig: topologyState.orchestrationConfig,
					readOnly,
					initialLens: "cluster",
					canvasHeightClass: "h-[580px]",
					onUpdateConfig: handleTopologyUpdateConfig,
					onSavePositions: handleTopologySavePositions,
					onUpsertRule: handleTopologyUpsertRule,
					onDeleteRule: handleTopologyDeleteRule,
					onUpdateAgent: handleTopologyUpdateAgent,
					onSetLead: handleTopologySetLead,
					onDiscoverAgent: handleTopologyDiscover,
					onToggleSkillAgent: handleTopologyToggleSkill,
					onInspectLogs: handleJumpToAgentLogs
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
				heightClass: "h-[580px]",
				label: "正在采集 Agent 集群节点与路由拓扑"
			})
		}) : activeTab === "swarm" ? topologyState?.swarmMetrics && topologyState?.superAgentConfig ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwarmMemorySection, {
			agents: topologyState.agents,
			swarmMetrics: topologyState.swarmMetrics,
			superAgentConfig: topologyState.superAgentConfig,
			superAgentTickets: topologyState.superAgentTickets || [],
			contextSpillNodes: topologyState.contextSpillNodes || [],
			triggerEvents: topologyState.triggerEvents || [],
			readOnly,
			onReload: loadTopologyState,
			onOpenAgentLogs: handleJumpToAgentLogs,
			onToast
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
			heightClass: "h-[460px]",
			label: "正在加载蜂群协同引擎"
		}) : activeTab === "governance" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiGovernanceSection, {
			readOnly,
			onToast
		}) : activeTab === "logs" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentLogsSection, {
			agents: topologyState?.agents || [],
			initialAgentId: focusedLogAgentId,
			readOnly,
			onToast,
			onDataMutated: () => void loadTopologyState()
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			summary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiStrip, {
				asymmetric: true,
				cells: [
					{
						label: "24h 估算成本与预算水位",
						meta: `日预算 $${summary.dailyBudgetUsd.toFixed(0)}`,
						value: `$${summary.estimatedCostUsd24h.toFixed(2)}`,
						ratioPct: budgetPct,
						sub: `累计 ${formatCompactNumber(summary.totalTokens)} Tokens · 缓存命中 ${summary.cacheHitPct}%`,
						tone: budgetPct >= 85 ? "warn" : "ok"
					},
					{
						label: "24h 网关请求量",
						value: formatCompactNumber(summary.totalRequests),
						numeric: { primary: summary.totalRequests },
						sub: `异常率 ${summary.errorRatePct}% (429/5xx)`,
						tone: summary.errorRatePct > 2 ? "warn" : "ok"
					},
					{
						label: "平均 TTFT 首字延迟",
						value: `${summary.avgTtftMs}ms`,
						numeric: {
							primary: summary.avgTtftMs,
							suffix: "ms"
						},
						sub: `P95 端到端 ${summary.p95LatencyMs}ms`
					},
					{
						label: "活跃 Agent 会话",
						value: String(telemetry?.sessions?.length ?? 0),
						numeric: { primary: telemetry?.sessions?.length ?? 0 },
						sub: `${processes.length} 个宿主机进程在线`
					}
				]
			}),
			telemetry && telemetry.hourly.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "模型网关 24h 吞吐与延迟遥测",
				description: "追踪 Prompt / Completion Token 消耗趋势及 TTFT / P95 尾延迟。",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
					value: chartMode,
					onChange: setChartMode,
					options: TELEMETRY_MODES,
					ariaLabel: "切换网关图表维度"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-[220px] w-full",
					"data-testid": "gateway-telemetry-chart",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
						width: "100%",
						height: "100%",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
							data: telemetry.hourly,
							margin: {
								top: 8,
								right: 8,
								left: -16,
								bottom: 0
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
									id: "gwPrimaryFill",
									x1: "0",
									y1: "0",
									x2: "0",
									y2: "1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
										offset: "5%",
										stopColor: "var(--accent)",
										stopOpacity: .22
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
										offset: "95%",
										stopColor: "var(--accent)",
										stopOpacity: .01
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
									id: "gwSecondaryFill",
									x1: "0",
									y1: "0",
									x2: "0",
									y2: "1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
										offset: "5%",
										stopColor: "var(--ok-dot)",
										stopOpacity: .18
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
										offset: "95%",
										stopColor: "var(--ok-dot)",
										stopOpacity: .01
									})]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
									stroke: "var(--border-subtle)",
									strokeDasharray: "3 3",
									vertical: false
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
									dataKey: "ts",
									tickFormatter: (v) => formatHourLabel(Number(v)),
									tick: {
										fill: "var(--ink-subtle)",
										fontSize: 11
									},
									axisLine: false,
									tickLine: false,
									minTickGap: 28
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
									tick: {
										fill: "var(--ink-subtle)",
										fontSize: 11
									},
									axisLine: false,
									tickLine: false,
									tickFormatter: (v) => chartMode === "tokens" ? `${v}K` : `${v}ms`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
									contentStyle: {
										backgroundColor: "var(--surface-elevated)",
										border: "1px solid var(--border)",
										borderRadius: "10px",
										fontSize: "12px",
										color: "var(--ink)"
									},
									labelFormatter: (label) => formatHourLabel(Number(label))
								}),
								chartMode === "tokens" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
									type: "monotone",
									dataKey: "promptK",
									name: "Prompt (K)",
									stroke: "var(--accent)",
									strokeWidth: 1.75,
									fill: "url(#gwPrimaryFill)",
									isAnimationActive: false
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
									type: "monotone",
									dataKey: "completionK",
									name: "Completion (K)",
									stroke: "var(--ok-dot)",
									strokeWidth: 1.75,
									fill: "url(#gwSecondaryFill)",
									isAnimationActive: false
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
									type: "monotone",
									dataKey: "p95Ms",
									name: "P95 延迟 (ms)",
									stroke: "var(--warn-dot)",
									strokeWidth: 1.75,
									fill: "url(#gwPrimaryFill)",
									isAnimationActive: false
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
									type: "monotone",
									dataKey: "ttftMs",
									name: "TTFT 首字 (ms)",
									stroke: "var(--accent)",
									strokeWidth: 1.75,
									fill: "url(#gwSecondaryFill)",
									isAnimationActive: false
								})] })
							]
						})
					})
				})
			}),
			telemetry && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: "lg:col-span-7",
					bodyClassName: "p-0",
					title: "上游 Provider 成本与熔断状态",
					description: "监控各模型供应商的请求占比、平均 TTFT 与熔断器状态。",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-left border-collapse",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 pl-5 sm:pl-6 pr-3",
										children: "Provider"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3",
										children: "熔断器"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3 text-right",
										children: "请求 / Token"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3 text-right",
										children: "TTFT"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right",
										children: "24h 成本"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-[var(--border-subtle)] text-[13px]",
								children: telemetry.providers.map((p) => {
									const sharePct = totalProviderCost > 0 ? Math.round((p.costUsd || 0) / totalProviderCost * 100) : 0;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2.5 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)]",
												children: p.name
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2.5 px-3 whitespace-nowrap",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
													status: p.circuitState === "closed" ? "healthy" : p.circuitState === "half-open" ? "degraded" : "failed",
													label: p.circuitState === "closed" ? "闭合正常" : p.circuitState === "half-open" ? "半开探活" : "已熔断"
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
												className: "py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
												children: [
													formatCompactNumber(p.requests),
													" · ",
													p.tokensK,
													"K"
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
												className: "py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
												children: [p.avgTtftMs, "ms"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12.5px] font-medium text-[var(--ink)] tabular-nums whitespace-nowrap",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "inline-flex flex-col items-end gap-1 min-w-[82px]",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
														"$",
														p.costUsd.toFixed(2),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "ml-1 text-[11px] font-normal text-[var(--ink-subtle)]",
															children: [sharePct, "%"]
														})
													] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "w-16 h-[2px] rounded-full bg-[var(--border-subtle)] overflow-hidden",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "block h-full bg-[var(--accent)]",
															style: { width: `${Math.min(100, sharePct)}%` }
														})
													})]
												})
											})
										]
									}, p.name);
								})
							})]
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: "lg:col-span-5",
					title: "本地推理加速器 (MLX / GPU)",
					description: "监控统一内存 / 显存水位、温度及常驻本地模型。",
					children: telemetry.accelerators.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "未检测到本地推理加速器。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-4",
						children: telemetry.accelerators.map((acc) => {
							const vramPct = acc.vramTotalGb > 0 ? Math.round(acc.vramUsedGb / acc.vramTotalGb * 100) : 0;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5 font-medium text-[13.5px] text-[var(--ink)]",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, {
													className: "size-4 text-[var(--accent)] shrink-0",
													strokeWidth: 1.75
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "truncate",
													children: acc.name
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-0.5 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
												children: [
													acc.backend,
													" · ",
													acc.tempC,
													"°C"
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-[12px] font-medium text-[var(--ink)] tabular-nums shrink-0",
											children: [
												"计算 ",
												acc.utilizationPct,
												"%"
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceMeter, {
										label: "显存 / 统一内存",
										value: vramPct,
										valueText: `${acc.vramUsedGb} / ${acc.vramTotalGb} GB (${vramPct}%)`
									}),
									acc.activeModels.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "font-mono text-[11.5px] text-[var(--ink-muted)] truncate",
										title: acc.activeModels.join(", "),
										children: ["常驻模型：", acc.activeModels.join(" · ")]
									})
								]
							}, acc.id);
						})
					})
				})]
			}),
			telemetry && telemetry.sessions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "活跃 Agent 会话与上下文水位",
				description: "追踪自主代理会话、工具调用成功率与上下文窗口占用。",
				bodyClassName: "p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left border-collapse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-5 sm:pl-6 pr-3",
									children: "会话 / Agent"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "当前模型"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "状态"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "上下文水位"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3 text-right",
									children: "工具调用"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right",
									children: "时长 / 内存"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-[var(--border-subtle)] text-[13px]",
							children: telemetry.sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-2.5 pl-5 sm:pl-6 pr-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium text-[var(--ink)]",
											children: s.agent
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-mono text-[11.5px] text-[var(--ink-subtle)]",
											children: s.id
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]",
										children: s.model
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-3 whitespace-nowrap",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
											status: s.state === "running" ? "healthy" : "standby",
											label: s.state === "running" ? "推理中" : "待机"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-3 min-w-[140px]",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceMeter, {
											value: s.contextPct,
											valueText: `${s.contextPct}%`,
											tone: s.contextPct >= 80 ? "warn" : "ok"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
										children: [
											s.toolCalls,
											" 次",
											s.failedTools > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "ml-1 text-[var(--err)]",
												children: [
													"(",
													s.failedTools,
													" 失败)"
												]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap",
										children: [
											formatUptime(s.uptimeSec),
											" · ",
											s.memoryMb,
											"MB"
										]
									})
								]
							}, s.id))
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Agent 路由与模型分发图谱",
				description: "点击任意 Agent 运行时进程组即可快速筛选下方进程列表。",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetSkeleton, {
						heightClass: "h-[400px]",
						label: "正在加载 Agent 分发图谱"
					}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArchitectureGraph, {
						snapshot,
						mode: "agents",
						onSelectAgentCategory: onSelectCategory
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: "lg:col-span-6",
					title: "Magpie 模型供给分布",
					description: magpie?.protocol || "OpenAI Compatible /v1/models",
					actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: magpie?.status || (magpie?.reachable ? "healthy" : "offline") }),
					children: providers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "暂无可用的模型渠道目录。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-3.5",
						children: providers.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceMeter, {
							label: p.name,
							value: p.count / totalModels * 100,
							valueText: `${formatCompactNumber(p.count)} 模型`,
							tone: "ok"
						}, p.name))
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: "lg:col-span-6",
					title: "注册 Agent 与共享 MCP 库",
					description: "异步采集自 Magpie 网关注册表与 MCP Hub。",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-4",
						children: agents.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "divide-y divide-[var(--border-subtle)] text-[13px]",
							children: agents.slice(0, 6).map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "py-2.5 first:pt-0 flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1 flex items-baseline gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink)] truncate",
										title: a.name || a.id,
										children: a.name || a.id
									}), a.model && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[12px] text-[var(--ink-subtle)] truncate",
										title: a.model,
										children: a.model
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: a.status || (a.active === false ? "standby" : "healthy") })]
							}, a.id || a.name || i))
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[13px] text-[var(--ink-subtle)]",
							children: "未发现已注册的 Magpie Agent 桥接。"
						})
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "本地活跃 Agent 进程",
				description: "实时发现宿主机正在运行的编码与编排 Agent 进程。",
				bodyClassName: "p-0",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative w-full sm:w-52",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
								className: "size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
								strokeWidth: 1.75
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "search",
								value: procQuery,
								onChange: (e) => setProcQuery(e.target.value),
								placeholder: "过滤 PID 或命令行...",
								"aria-label": "过滤 Agent 进程",
								className: cn("h-9 sm:h-8 w-full pl-8 pr-2.5", inputBaseClass)
							})]
						}),
						selectedPid != null && onSelectPid && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							"data-testid": "clear-pid-filter",
							onClick: () => onSelectPid(null),
							className: cn("inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[12.5px] font-mono font-medium text-[var(--accent)] cursor-pointer select-none", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "tabular-nums",
								children: ["PID ", selectedPid]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
								className: "size-3.5",
								strokeWidth: 1.75
							})]
						}),
						selectedCategory && onSelectCategory && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => onSelectCategory(""),
							className: cn("inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[12.5px] font-medium text-[var(--ink)] cursor-pointer select-none", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["筛选：", selectedCategory] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
								className: "size-3.5 text-[var(--ink-muted)]",
								strokeWidth: 1.75
							})]
						})
					]
				}),
				children: filteredProcesses.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					title: "未匹配到活跃进程",
					message: "当前主机没有匹配到活跃 Agent 进程。",
					action: selectedCategory || selectedPid != null || procQuery.trim() ? {
						label: "清除筛选",
						onClick: () => {
							setProcQuery("");
							onSelectCategory?.("");
							onSelectPid?.(null);
						}
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
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => toggleProcSort("pid"),
										className: cn("inline-flex items-center gap-1 hover:text-[var(--ink)] cursor-pointer", FOCUS_RING),
										children: ["PID", renderProcSortIcon("pid")]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "分类"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3 text-right",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => toggleProcSort("cpu"),
										className: cn("inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] cursor-pointer", FOCUS_RING),
										children: ["CPU", renderProcSortIcon("cpu")]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3 text-right",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => toggleProcSort("mem"),
										className: cn("inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] cursor-pointer", FOCUS_RING),
										children: ["内存", renderProcSortIcon("mem")]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-3 pr-5 sm:pr-6",
									children: "命令行"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-[var(--border-subtle)] text-[13px]",
							children: filteredProcesses.map((proc) => {
								const isPidSelected = selectedPid === proc.pid;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									ref: (el) => {
										rowRefs.current[proc.pid] = el;
									},
									"data-pid": proc.pid,
									"data-selected-pid": isPidSelected ? "true" : void 0,
									className: cn("transition-colors duration-150 ease-out", isPidSelected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-hover)]"),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12.5px] font-medium text-[var(--ink)] tabular-nums",
											children: proc.pid
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 font-medium text-[var(--ink)] whitespace-nowrap",
											children: proc.categoryLabel || proc.category || "Agent"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 text-right font-mono text-[12.5px] text-[var(--ink)] tabular-nums whitespace-nowrap",
											children: proc.cpu != null ? `${Number(proc.cpu).toFixed(1)}%` : "-"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 px-3 text-right font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
											children: formatBytes(proc.memoryBytes ?? proc.rssBytes)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2.5 pl-3 pr-5 sm:pr-6 font-mono text-[12px] text-[var(--ink-muted)] max-w-[460px] truncate",
											title: proc.cmd || proc.command,
											children: proc.cmd || proc.command || "-"
										})
									]
								}, proc.pid);
							})
						})]
					})
				})
			})
		] })
	});
}
export { AgentSettingsView, AgentSettingsView as default, MODEL_PRESETS as i, AgentOrchestrationCanvas$2 as n, EFFORT_OPTIONS as r, AgentSettingsView_exports as t };
