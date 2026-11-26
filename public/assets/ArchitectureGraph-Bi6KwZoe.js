import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { a as Ta, c as fr, d as MarkerType, f as Position, i as Sn, l as pa, n as Co, o as Ua, p as require_jsx_runtime, r as Ra, s as _a, t as Ca, u as wa } from "./vendor-flow-aUB-QjJm.js";
import { It as Database, K as Server, Q as RotateCcw, Tt as Globe, U as Shield, Xt as Bot, bt as Layers, ft as Minus, jt as FileText, k as X, kt as Funnel, lt as Orbit, rn as ArrowRight, rt as Plus, ut as Network, zt as Cpu } from "./vendor-ui-DUVxOpTN.js";
import { F as statusTone, P as statusLabel, _ as StatusIndicator, g as SegmentedFilter, u as EmptyState } from "./app-nZGM7CNZ.js";
// web/lib/graph-layout.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function compactPortLabel(ports, fallback = "") {
	const list = Array.isArray(ports) ? ports : [];
	if (!list.length) return fallback;
	const clean = String(list[0] || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
	const m = clean.match(/:(\d+(?:\/\d+)?)$/);
	const first = m ? `:${m[1]}` : clean;
	return list.length > 1 ? `${first} +${list.length - 1}` : first;
}
function extractPorts(ports) {
	const out = [];
	for (const raw of ports || []) {
		const m = String(raw || "").match(/:(\d{2,5})(?:\/\d+)?/);
		if (m) out.push(m[1]);
	}
	return out;
}
function addEdgeUnique(edges, seen, edge) {
	if (!edge.from || !edge.to || edge.from === edge.to) return;
	const key = `${edge.from}->${edge.to}:${edge.kind || "dep"}`;
	if (seen.has(key)) return;
	seen.add(key);
	edges.push({
		id: key,
		...edge
	});
}
function serviceMetricText(svc, snap) {
	const id = String(svc.id || "").toLowerCase();
	const magpie = snap?.magpie;
	const mem = snap?.memory;
	const net = snap?.network;
	if ((id === "magpie" || id === "magpie-gateway") && magpie?.reachable) return `${magpie.totalModels || 0} 模型 · ${magpie.providers?.length || 0} 渠道`;
	if (id.includes("nmem") && mem?.nmem?.reachable) return `${mem.nmem.stats?.memories ?? 0} 记忆 · ${mem.nmem.spaces?.length ?? 0} 空间`;
	if (id.includes("openviking") && mem?.openviking?.reachable) return `向量 ${mem.openviking.vikingdb?.vectorCount ?? "-"} · 技能 ${mem.openviking.skillsCount ?? 0}`;
	if (id.includes("symbiote") && mem?.symbiote?.reachable) return `Vault ${mem.symbiote.vaultFileCount ?? "-"} 文件`;
	if (id.includes("rerank") && mem?.rerank?.reachable) return mem.rerank.model || "Ready";
	if (id.includes("tailscale") && net?.tailscale?.reachable) return `${net.tailscale.onlineCount ?? 0}/${net.tailscale.devices?.length || 0} 设备在线`;
	if (id.includes("mihomo") && net?.mihomo?.reachable) return `${net.mihomo.activeConnections ?? 0} 连接`;
	if (id.includes("syncthing") && net?.syncthing?.reachable) return net.syncthing.latencyMs != null ? `延迟 ${net.syncthing.latencyMs}ms` : "同步正常";
	if (svc.probe?.ok) return `${compactPortLabel(svc.ports, svc.scope || "")} · ${svc.probe.latencyMs}ms`;
	return compactPortLabel(svc.ports, svc.scope || "service");
}
function mapServiceLane(svc) {
	const id = String(svc.id || "").toLowerCase();
	const layer = String(svc.layer || "").toLowerCase();
	if (id.includes("firewall") || id.includes("tunnel") || layer === "network" || layer === "infra" || id.includes("tailscale") || id.includes("mihomo") || id.includes("sync") || id.includes("postgres") || id.includes("redis")) return "network";
	if (layer === "memory" || id.includes("nmem") || id.includes("openviking") || id.includes("symbiote") || id.includes("rerank") || id.includes("embed")) return "memory";
	if (id === "magpie" || id.includes("gateway") || id.includes("bridge")) return "gateway";
	return "entry";
}
function buildFullGraph(snap, filter = "all") {
	const services = snap?.services?.items || [];
	const mem = snap?.memory || {};
	const magpie = snap?.magpie || {};
	const agents = snap?.agents?.processes || [];
	const net = snap?.network || {};
	const fw = snap?.firewall || net.firewall || null;
	const fleet = snap?.fleet || null;
	const lanes = [
		{
			id: "entry",
			title: "入口与 Agent",
			subtitle: "控制台 · 编排器 · 会话"
		},
		{
			id: "gateway",
			title: "网关与路由",
			subtitle: "模型分发 · 渠道桥接"
		},
		{
			id: "memory",
			title: "记忆与上下文",
			subtitle: "知识库 · 向量 · 重排"
		},
		{
			id: "network",
			title: "网络与底座",
			subtitle: "组网 · 防火墙 · 节点"
		}
	];
	const nodes = [];
	const nodeById = /* @__PURE__ */ new Map();
	const svcNodeById = /* @__PURE__ */ new Map();
	const svcByPort = /* @__PURE__ */ new Map();
	const addNode = (node) => {
		const existing = nodeById.get(node.id);
		if (existing) return existing;
		nodeById.set(node.id, node);
		nodes.push(node);
		return node;
	};
	for (const svc of services) {
		const lane = mapServiceLane(svc);
		const node = addNode({
			id: `svc:${svc.id}`,
			lane,
			kind: "service",
			label: svc.name || svc.id,
			status: svc.status || "standby",
			meta: serviceMetricText(svc, snap),
			detail: svc.role || `${svc.unit} (${svc.scope || "user"})`,
			unit: svc.unit || "",
			ports: svc.ports || [],
			dependsOn: Array.isArray(svc.dependsOn) ? svc.dependsOn : [],
			risk: svc.risk || "normal"
		});
		svcNodeById.set(svc.id, node);
		svcNodeById.set(svc.unit, node);
		for (const port of extractPorts(svc.ports)) svcByPort.set(port, node);
	}
	const agentGroups = /* @__PURE__ */ new Map();
	for (const proc of agents) {
		const key = proc.categoryLabel || proc.category || "Agent";
		if (!agentGroups.has(key)) agentGroups.set(key, {
			label: key,
			count: 0,
			cpu: 0,
			cmds: []
		});
		const grp = agentGroups.get(key);
		grp.count += 1;
		grp.cpu += Number(proc.cpu || 0);
		if (proc.cmd || proc.command) grp.cmds.push(proc.cmd || proc.command || "");
	}
	const agentNodeIds = [];
	for (const grp of [...agentGroups.values()].slice(0, 4)) {
		const id = `agent:${grp.label}`;
		addNode({
			id,
			lane: "entry",
			kind: "agent",
			label: grp.label,
			status: "healthy",
			meta: `${grp.count} 进程 · CPU ${grp.cpu.toFixed(1)}%`,
			detail: `活跃运行时进程组 (${grp.count} 个匹配进程)`,
			agentCategory: grp.label,
			cmds: grp.cmds
		});
		agentNodeIds.push(id);
	}
	let gatewayNode = [...nodeById.values()].find((n) => n.lane === "gateway" && n.id.includes("magpie"));
	if (!gatewayNode && magpie.enabled) gatewayNode = addNode({
		id: "connector:magpie",
		lane: "gateway",
		kind: "gateway",
		label: "Magpie 网关",
		status: magpie.status || "standby",
		meta: magpie.reachable ? `${magpie.totalModels || 0} 模型 · ${magpie.providers?.length || 0} 渠道` : magpie.error || "离线",
		detail: magpie.protocol || "OpenAI /v1/models"
	});
	if (magpie.reachable && Array.isArray(magpie.providers) && magpie.providers.length > 0) for (const prov of magpie.providers.slice(0, 3)) addNode({
		id: `provider:${prov.name}`,
		lane: "gateway",
		kind: "provider",
		label: prov.name,
		status: "healthy",
		meta: `${prov.count} 模型渠道`,
		detail: `通过 Magpie 模型网关统一路由 (${prov.count} 个可用模型)`
	});
	const ensureMemoryConnector = (key, title, eng, metric) => {
		if (!eng?.enabled) return null;
		const existing = [...nodeById.values()].find((n) => n.lane === "memory" && n.id.toLowerCase().includes(key));
		if (existing) return existing;
		return addNode({
			id: `connector:${key}`,
			lane: "memory",
			kind: "memory",
			label: title,
			status: eng.status || "standby",
			meta: metric,
			detail: eng.protocol || title
		});
	};
	const nmemNode = ensureMemoryConnector("nmem", "Nowledge Mem", mem.nmem, mem.nmem?.reachable ? `${mem.nmem.stats?.memories ?? 0} 记忆 · ${mem.nmem.spaces?.length ?? 0} 空间` : "离线");
	const ovNode = ensureMemoryConnector("openviking", "OpenViking", mem.openviking, mem.openviking?.reachable ? `向量 ${mem.openviking.vikingdb?.vectorCount ?? "-"} · 技能 ${mem.openviking.skillsCount ?? 0}` : "离线");
	const symNode = ensureMemoryConnector("symbiote", "Symbiote", mem.symbiote, mem.symbiote?.reachable ? `Vault ${mem.symbiote.vaultFileCount ?? "-"} 文件` : "离线");
	const rerankNode = ensureMemoryConnector("rerank", "Rerank", mem.rerank, mem.rerank?.reachable ? mem.rerank.model || "Ready" : "离线");
	let firewallNode = null;
	if (fw?.enabled) {
		const fwSum = fw.summary || {};
		firewallNode = addNode({
			id: "connector:firewall",
			lane: "network",
			kind: "firewall",
			label: "防火墙与监听端口",
			status: (fwSum.publicUnfiltered ?? 0) > 0 ? "degraded" : fw.status || "healthy",
			meta: `${fwSum.totalListeners ?? 0} 监听 · 丢弃 ${fwSum.droppedPackets ?? 0}`,
			detail: fw.backend === "iptables" ? `只读 iptables-save (${fw.totalRules ?? 0} 条规则)，公网直露 ${fwSum.publicUnfiltered ?? 0} 个` : "仅套接字监听视图 (未授权只读 iptables-save)"
		});
	}
	let fleetNode = null;
	if (fleet?.summary) {
		const fs = fleet.summary;
		fleetNode = addNode({
			id: "connector:fleet",
			lane: "network",
			kind: "fleet",
			label: "全球多端节点",
			status: (fs.online ?? 0) > 0 ? "healthy" : "degraded",
			meta: `在线 ${fs.online ?? 0}/${fs.total ?? 0} · 探针 ${fs.probed ?? 0}`,
			detail: `服务器 ${fs.servers ?? 0} · 笔记本 ${fs.laptops ?? 0} · 移动端 ${fs.mobiles ?? 0}`
		});
	}
	const tailscaleNode = [...nodeById.values()].find((n) => n.id.toLowerCase().includes("tailscale")) || (net.tailscale?.enabled ? addNode({
		id: "connector:tailscale",
		lane: "network",
		kind: "network",
		label: "Tailscale Mesh",
		status: net.tailscale.status || "standby",
		meta: net.tailscale.reachable ? `${net.tailscale.onlineCount ?? 0}/${net.tailscale.devices?.length || 0} 设备在线` : "不可达",
		detail: net.tailscale.protocol || "tailscale status --json"
	}) : null);
	const edges = [];
	const edgeSeen = /* @__PURE__ */ new Set();
	for (const node of nodes) {
		if (!Array.isArray(node.dependsOn)) continue;
		for (const depRef of node.dependsOn) {
			const target = svcNodeById.get(depRef);
			if (target) addEdgeUnique(edges, edgeSeen, {
				from: node.id,
				to: target.id,
				kind: "dep",
				label: "配置依赖"
			});
		}
	}
	for (const aId of agentNodeIds) {
		const aNode = nodeById.get(aId);
		let matchedExplicitPort = false;
		for (const cmd of aNode?.cmds || []) {
			const matches = String(cmd).matchAll(/(?:127\.0\.0\.1|localhost):(\d{2,5})/g);
			for (const m of matches) {
				const target = svcByPort.get(m[1]);
				if (target && target.id !== aId) {
					matchedExplicitPort = true;
					addEdgeUnique(edges, edgeSeen, {
						from: aId,
						to: target.id,
						kind: "rpc",
						label: `:${m[1]}`
					});
				}
			}
		}
		if (gatewayNode) addEdgeUnique(edges, edgeSeen, {
			from: aId,
			to: gatewayNode.id,
			kind: "route",
			label: "模型路由"
		});
		if (!matchedExplicitPort && nmemNode) addEdgeUnique(edges, edgeSeen, {
			from: aId,
			to: nmemNode.id,
			kind: "memory",
			label: "长期记忆"
		});
		if (!matchedExplicitPort && ovNode) addEdgeUnique(edges, edgeSeen, {
			from: aId,
			to: ovNode.id,
			kind: "memory",
			label: "上下文检索"
		});
	}
	const entryServices = nodes.filter((n) => n.lane === "entry" && n.kind === "service");
	for (const es of entryServices) {
		if (gatewayNode && es.id !== gatewayNode.id && !es.id.includes("ops-console")) addEdgeUnique(edges, edgeSeen, {
			from: es.id,
			to: gatewayNode.id,
			kind: "route",
			label: "调用网关"
		});
		if (tailscaleNode) addEdgeUnique(edges, edgeSeen, {
			from: es.id,
			to: tailscaleNode.id,
			kind: "mesh",
			label: "Tailnet 接入"
		});
	}
	if (gatewayNode) {
		for (const n of nodes) if (n.kind === "provider") addEdgeUnique(edges, edgeSeen, {
			from: gatewayNode.id,
			to: n.id,
			kind: "provider",
			label: "上游模型"
		});
		if (ovNode) addEdgeUnique(edges, edgeSeen, {
			from: gatewayNode.id,
			to: ovNode.id,
			kind: "memory",
			label: "技能/上下文"
		});
		if (firewallNode) addEdgeUnique(edges, edgeSeen, {
			from: gatewayNode.id,
			to: firewallNode.id,
			kind: "guard",
			label: "端口防护"
		});
	}
	if (ovNode && rerankNode) addEdgeUnique(edges, edgeSeen, {
		from: ovNode.id,
		to: rerankNode.id,
		kind: "memory",
		label: "语义重排"
	});
	if (symNode && ovNode) addEdgeUnique(edges, edgeSeen, {
		from: symNode.id,
		to: ovNode.id,
		kind: "memory",
		label: "文档索引"
	});
	if (nmemNode && firewallNode) addEdgeUnique(edges, edgeSeen, {
		from: nmemNode.id,
		to: firewallNode.id,
		kind: "guard",
		label: "仅本地回环"
	});
	if (tailscaleNode && fleetNode) addEdgeUnique(edges, edgeSeen, {
		from: tailscaleNode.id,
		to: fleetNode.id,
		kind: "mesh",
		label: "WireGuard 组网"
	});
	if (tailscaleNode && firewallNode) addEdgeUnique(edges, edgeSeen, {
		from: tailscaleNode.id,
		to: firewallNode.id,
		kind: "guard",
		label: "入站策略"
	});
	let visibleNodes = nodes;
	if (filter === "services") visibleNodes = nodes.filter((n) => n.kind === "service");
	else if (filter === "memory") visibleNodes = nodes.filter((n) => n.lane === "memory" || n.kind === "agent" || n.id === gatewayNode?.id);
	else if (filter === "agents") visibleNodes = nodes.filter((n) => n.lane === "entry" || n.lane === "gateway" || n.id === nmemNode?.id || n.id === ovNode?.id);
	else if (filter === "network") visibleNodes = nodes.filter((n) => n.lane === "network" || n.id === gatewayNode?.id || n.id.includes("ops-console"));
	const visibleSet = new Set(visibleNodes.map((n) => n.id));
	const visibleEdges = edges.filter((e) => visibleSet.has(e.from) && visibleSet.has(e.to));
	const activeLanes = lanes.filter((l) => visibleNodes.some((n) => n.lane === l.id));
	return {
		lanes: activeLanes.length ? activeLanes : lanes,
		nodes: visibleNodes,
		edges: visibleEdges
	};
}
function buildMemoryMiniGraph(snap) {
	const mem = snap?.memory || {};
	const agents = snap?.agents?.processes || [];
	const lanes = [
		{
			id: "consumers",
			title: "调用方与入口",
			subtitle: "Agent · MCP · 检索"
		},
		{
			id: "engines",
			title: "记忆与上下文引擎",
			subtitle: "官方 REST / CLI 接口"
		},
		{
			id: "backing",
			title: "底层索引与存储",
			subtitle: "向量库 · 文档库 · 重排"
		}
	];
	const nodes = [];
	const edges = [];
	const edgeSeen = /* @__PURE__ */ new Set();
	const add = (n) => {
		nodes.push(n);
		return n;
	};
	const agentCount = agents.length;
	const callerAgent = add({
		id: "mem-caller:agents",
		lane: "consumers",
		kind: "agent",
		label: "活跃 Agent 运行时",
		status: agentCount > 0 ? "healthy" : "standby",
		meta: `${agentCount} 个活跃进程`,
		detail: "通过 MCP 与本地 HTTP 读写长期记忆和上下文"
	});
	const callerConsole = add({
		id: "mem-caller:console",
		lane: "consumers",
		kind: "service",
		label: "跨库联合检索",
		status: "healthy",
		meta: "nmem + ov 官方协议",
		detail: "统一检索 Nowledge Mem 与 OpenViking"
	});
	if (mem.nmem?.enabled) {
		const n = mem.nmem;
		add({
			id: "mem-eng:nmem",
			lane: "engines",
			kind: "memory",
			label: "Nowledge Mem",
			status: n.status || "standby",
			meta: n.reachable ? `${n.stats?.memories ?? 0} 记忆 · ${n.latencyMs ?? 0}ms` : n.error || "离线",
			detail: n.protocol || "REST + nmem CLI"
		});
		add({
			id: "mem-back:nmem-db",
			lane: "backing",
			kind: "storage",
			label: "知识图谱与空间",
			status: n.reachable ? "healthy" : "offline",
			meta: `${n.spaces?.length ?? 0} 空间 · ${n.stats?.threads ?? 0} 对话`,
			detail: "结构化跨工具长期记忆数据库"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: callerAgent.id,
			to: "mem-eng:nmem",
			kind: "memory",
			label: "MCP 读写"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: callerConsole.id,
			to: "mem-eng:nmem",
			kind: "rpc",
			label: "nmem search"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: "mem-eng:nmem",
			to: "mem-back:nmem-db",
			kind: "storage",
			label: "本地图谱"
		});
	}
	if (mem.openviking?.enabled) {
		const ov = mem.openviking;
		add({
			id: "mem-eng:openviking",
			lane: "engines",
			kind: "memory",
			label: "OpenViking",
			status: ov.status || "standby",
			meta: ov.reachable ? `技能 ${ov.skillsCount ?? 0} · ${ov.latencyMs ?? 0}ms` : ov.error || "离线",
			detail: ov.protocol || "HTTP + ov CLI"
		});
		add({
			id: "mem-back:vikingdb",
			lane: "backing",
			kind: "storage",
			label: "VikingDB 向量索引",
			status: ov.reachable ? "healthy" : "offline",
			meta: `向量 ${ov.vikingdb?.vectorCount ?? "-"} · 队列 ${ov.queue?.pending ?? 0}`,
			detail: "上下文检索、经验记忆与跨端 Skill 仓库"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: callerAgent.id,
			to: "mem-eng:openviking",
			kind: "memory",
			label: "上下文召回"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: callerConsole.id,
			to: "mem-eng:openviking",
			kind: "rpc",
			label: "ov find"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: "mem-eng:openviking",
			to: "mem-back:vikingdb",
			kind: "storage",
			label: "向量检索"
		});
	}
	if (mem.symbiote?.enabled) {
		const sym = mem.symbiote;
		add({
			id: "mem-eng:symbiote",
			lane: "engines",
			kind: "memory",
			label: "Symbiote",
			status: sym.status || "standby",
			meta: sym.reachable ? `模式 ${sym.mode || "-"} · ${sym.latencyMs ?? 0}ms` : sym.error || "离线",
			detail: sym.protocol || "HTTP /api/health"
		});
		add({
			id: "mem-back:vault",
			lane: "backing",
			kind: "storage",
			label: "Markdown Vault",
			status: sym.reachable ? "healthy" : "offline",
			meta: `${sym.vaultFileCount ?? "-"} 个文档文件`,
			detail: "本地笔记与阅读台文档库"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: callerAgent.id,
			to: "mem-eng:symbiote",
			kind: "memory",
			label: "文档阅读"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: "mem-eng:symbiote",
			to: "mem-back:vault",
			kind: "storage",
			label: "本地 Vault"
		});
	}
	if (mem.rerank?.enabled) {
		const rr = mem.rerank;
		add({
			id: "mem-back:rerank",
			lane: "backing",
			kind: "memory",
			label: "Rerank 重排服务",
			status: rr.status || "standby",
			meta: rr.reachable ? rr.model || "Ready" : rr.error || "离线",
			detail: rr.protocol || "HTTP /health"
		});
		if (mem.openviking?.enabled) addEdgeUnique(edges, edgeSeen, {
			from: "mem-eng:openviking",
			to: "mem-back:rerank",
			kind: "rpc",
			label: "结果精排"
		});
		if (mem.nmem?.enabled) addEdgeUnique(edges, edgeSeen, {
			from: "mem-eng:nmem",
			to: "mem-back:rerank",
			kind: "rpc",
			label: "语义排序"
		});
	}
	return {
		lanes,
		nodes,
		edges
	};
}
function buildAgentsMiniGraph(snap) {
	const agents = snap?.agents?.processes || [];
	const magpie = snap?.magpie || {};
	const mem = snap?.memory || {};
	const lanes = [
		{
			id: "runtimes",
			title: "活跃 Agent 进程组",
			subtitle: "点击可按类别筛选"
		},
		{
			id: "router",
			title: "网关与共享能力",
			subtitle: "Magpie · MCP Hub · 记忆"
		},
		{
			id: "providers",
			title: "模型供给渠道",
			subtitle: "实时目录统计"
		}
	];
	const nodes = [];
	const edges = [];
	const edgeSeen = /* @__PURE__ */ new Set();
	const add = (n) => {
		nodes.push(n);
		return n;
	};
	const groups = /* @__PURE__ */ new Map();
	for (const proc of agents) {
		const key = proc.categoryLabel || proc.category || "Agent";
		if (!groups.has(key)) groups.set(key, {
			label: key,
			count: 0,
			cpu: 0
		});
		const g = groups.get(key);
		g.count += 1;
		g.cpu += Number(proc.cpu || 0);
	}
	const runtimeNodes = [];
	for (const grp of [...groups.values()].slice(0, 5)) runtimeNodes.push(add({
		id: `ag-proc:${grp.label}`,
		lane: "runtimes",
		kind: "agent",
		label: grp.label,
		status: "healthy",
		meta: `${grp.count} 进程 · CPU ${grp.cpu.toFixed(1)}%`,
		detail: `点击下钻筛选「${grp.label}」进程明细`,
		agentCategory: grp.label
	}));
	if (runtimeNodes.length === 0) runtimeNodes.push(add({
		id: "ag-proc:idle",
		lane: "runtimes",
		kind: "agent",
		label: "当前无活跃 Agent",
		status: "standby",
		meta: "等待会话启动",
		detail: "按配置的进程匹配规则自动发现运行时"
	}));
	const gwNode = add({
		id: "ag-router:magpie",
		lane: "router",
		kind: "gateway",
		label: "Magpie 模型网关",
		status: magpie.enabled ? magpie.status || "standby" : "standby",
		meta: magpie.reachable ? `${magpie.totalModels || 0} 模型 · ${magpie.latencyMs ?? 0}ms` : magpie.error || "离线",
		detail: magpie.protocol || "OpenAI /v1/models"
	});
	const activeBridges = Array.isArray(magpie.agents) ? magpie.agents.length : Array.isArray(magpie.bridges) ? magpie.bridges.filter((b) => b.active).length : 0;
	const mcpCount = typeof magpie.library?.mcpCount === "number" ? magpie.library.mcpCount : Array.isArray(magpie.library?.mcps) ? magpie.library.mcps.length : 0;
	const bridgeNode = add({
		id: "ag-router:hub",
		lane: "router",
		kind: "gateway",
		label: "桥接与共享 MCP",
		status: activeBridges > 0 || mcpCount > 0 ? "healthy" : "standby",
		meta: `${activeBridges} 桥接 · ${mcpCount} MCP`,
		detail: "通过 Magpie CLI 后台异步采集，不阻塞主快照"
	});
	const memOk = [
		"nmem",
		"openviking",
		"symbiote"
	].filter((k) => mem[k]?.reachable).length;
	const memNode = add({
		id: "ag-router:memory",
		lane: "router",
		kind: "memory",
		label: "跨工具记忆总线",
		status: memOk > 0 ? "healthy" : "standby",
		meta: `${memOk} 个引擎在线`,
		detail: "Nowledge Mem + OpenViking 原生记忆上下文"
	});
	for (const rn of runtimeNodes) {
		addEdgeUnique(edges, edgeSeen, {
			from: rn.id,
			to: gwNode.id,
			kind: "route",
			label: "推理调用"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: rn.id,
			to: memNode.id,
			kind: "memory",
			label: "记忆读写"
		});
	}
	addEdgeUnique(edges, edgeSeen, {
		from: gwNode.id,
		to: bridgeNode.id,
		kind: "dep",
		label: "桥接调度"
	});
	const providers = Array.isArray(magpie.providers) ? magpie.providers.slice(0, 5) : [];
	for (const prov of providers) {
		const pNode = add({
			id: `ag-prov:${prov.name}`,
			lane: "providers",
			kind: "provider",
			label: prov.name,
			status: "healthy",
			meta: `${prov.count} 个模型`,
			detail: `Magpie 已注册渠道：${prov.name}`
		});
		addEdgeUnique(edges, edgeSeen, {
			from: gwNode.id,
			to: pNode.id,
			kind: "provider",
			label: "路由转发"
		});
	}
	if (providers.length === 0) {
		const emptyProv = add({
			id: "ag-prov:none",
			lane: "providers",
			kind: "provider",
			label: "未发现模型渠道",
			status: "standby",
			meta: "检查 Magpie /v1/models",
			detail: "确认 Magpie 网关已配置模型提供方"
		});
		addEdgeUnique(edges, edgeSeen, {
			from: gwNode.id,
			to: emptyProv.id,
			kind: "provider",
			label: "待配置"
		});
	}
	return {
		lanes,
		nodes,
		edges
	};
}
function layoutGraph(data, compact = false) {
	const { lanes, nodes, edges } = data;
	const laneCount = Math.max(1, lanes.length);
	const width = compact ? 980 : 1160;
	const padX = 16;
	const colGap = compact ? 44 : 36;
	const laneW = Math.floor((width - 32 - colGap * (laneCount - 1)) / laneCount);
	const nodePadX = 12;
	const nodeW = laneW - 24;
	const nodeH = compact ? 76 : 80;
	const nodeGapY = 14;
	const headerH = 62;
	const bottomPad = 16;
	const byLane = new Map(lanes.map((l) => [l.id, []]));
	for (const node of nodes) {
		const bucket = byLane.get(node.lane) || byLane.get(lanes[0]?.id);
		if (bucket) bucket.push(node);
	}
	let maxNodes = 1;
	for (const list of byLane.values()) if (list.length > maxNodes) maxNodes = list.length;
	const laneH = headerH + maxNodes * nodeH + Math.max(0, maxNodes - 1) * nodeGapY + bottomPad;
	const totalH = laneH + 20;
	const laneBoxes = [];
	const placedNodes = [];
	const nodePosById = /* @__PURE__ */ new Map();
	lanes.forEach((lane, idx) => {
		const x = padX + idx * (laneW + colGap);
		const y = 10;
		const list = byLane.get(lane.id) || [];
		const okCount = list.filter((n) => statusTone(n.status) === "ok").length;
		laneBoxes.push({
			...lane,
			x,
			y,
			w: laneW,
			h: laneH,
			count: list.length,
			okCount
		});
		list.forEach((node, rowIdx) => {
			const nx = x + nodePadX;
			const ny = 72 + rowIdx * (nodeH + nodeGapY);
			const placed = {
				...node,
				x: nx,
				y: ny,
				w: nodeW,
				h: nodeH,
				colIdx: idx
			};
			placedNodes.push(placed);
			nodePosById.set(node.id, placed);
		});
	});
	const placedEdges = [];
	for (const edge of edges) {
		const a = nodePosById.get(edge.from);
		const b = nodePosById.get(edge.to);
		if (!a || !b) continue;
		let d = "";
		if (a.colIdx === b.colIdx) {
			const sx = a.x + a.w;
			const sy = a.y + a.h / 2;
			const ex = b.x + b.w;
			const ey = b.y + b.h / 2;
			const bend = Math.min(26, Math.max(16, Math.abs(ey - sy) * .25));
			d = `M${sx.toFixed(1)} ${sy.toFixed(1)} C${(sx + bend).toFixed(1)} ${sy.toFixed(1)}, ${(ex + bend).toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
		} else if (a.colIdx < b.colIdx) {
			const sx = a.x + a.w;
			const sy = a.y + a.h / 2;
			const ex = b.x;
			const ey = b.y + b.h / 2;
			const span = Math.max(24, (ex - sx) * .48);
			d = `M${sx.toFixed(1)} ${sy.toFixed(1)} C${(sx + span).toFixed(1)} ${sy.toFixed(1)}, ${(ex - span).toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
		} else {
			const sx = a.x;
			const sy = a.y + a.h / 2;
			const ex = b.x + b.w;
			const ey = b.y + b.h / 2;
			const span = Math.max(24, (sx - ex) * .48);
			d = `M${sx.toFixed(1)} ${sy.toFixed(1)} C${(sx - span).toFixed(1)} ${sy.toFixed(1)}, ${(ex + span).toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
		}
		placedEdges.push({
			...edge,
			d
		});
	}
	return {
		width,
		height: totalH,
		lanes: laneBoxes,
		nodes: placedNodes,
		edges: placedEdges
	};
}
function computeNodeDegrees(nodes, edges) {
	const map = /* @__PURE__ */ new Map();
	for (const n of nodes) map.set(n.id, {
		inDegree: 0,
		outDegree: 0,
		total: 0
	});
	for (const e of edges) {
		const src = map.get(e.from);
		const dst = map.get(e.to);
		if (src && dst && e.from !== e.to) {
			src.outDegree += 1;
			src.total += 1;
			dst.inDegree += 1;
			dst.total += 1;
		}
	}
	return map;
}
function healthBandRank(status) {
	const tone = statusTone(status);
	if (tone === "err") return 0;
	if (tone === "warn") return 1;
	if (tone === "muted") return 2;
	return 3;
}
/**
* Deterministic spring-embedder force-directed layout with strict AABB collision
* resolution so node cards never overlap even at high density.
*
* - 'force-degree': high-degree hubs gravitate to the central focal core;
*   lower-degree satellites radiate outward along spring edges.
* - 'force-health': stratifies nodes vertically by health severity (failed ->
*   degraded -> standby -> healthy) while relaxing horizontal dependencies.
*/
function layoutForceGraph(raw, strategy, compact = false, iterationSeed = 0) {
	const { nodes, edges } = raw;
	const nodeW = compact ? 236 : 224;
	const nodeH = 74;
	const minSepX = nodeW + 52;
	const minSepY = 114;
	if (!nodes.length) return {
		width: 800,
		height: 360,
		lanes: [],
		nodes: [],
		edges: []
	};
	const degrees = computeNodeDegrees(nodes, edges);
	const maxDegree = Math.max(1, ...nodes.map((n) => degrees.get(n.id)?.total ?? 0));
	const ordered = [...nodes].sort((a, b) => {
		if (strategy === "force-health") {
			const ha = healthBandRank(a.status);
			const hb = healthBandRank(b.status);
			if (ha !== hb) return ha - hb;
		}
		const da = degrees.get(a.id)?.total ?? 0;
		const db = degrees.get(b.id)?.total ?? 0;
		if (db !== da) return db - da;
		return a.id.localeCompare(b.id);
	});
	const nCount = ordered.length;
	const angleOffset = iterationSeed % 8 * (Math.PI / 16);
	const pos = /* @__PURE__ */ new Map();
	if (strategy === "force-degree") {
		const cx = 640;
		const cy = 360;
		ordered.forEach((node, idx) => {
			const deg = degrees.get(node.id)?.total ?? 0;
			let rx = 0;
			let ry = 0;
			let angle = angleOffset;
			if (idx === 0) {
				rx = 0;
				ry = 0;
			} else if (idx <= 5) {
				rx = minSepX * 1.12;
				ry = minSepY * 1.25;
				angle = angleOffset + (idx - 1) / Math.min(5, nCount - 1) * Math.PI * 2;
			} else {
				const outerIdx = idx - 6;
				const outerTotal = Math.max(1, nCount - 6);
				rx = minSepX * 2.15;
				ry = minSepY * 2.35;
				angle = angleOffset + outerIdx / outerTotal * Math.PI * 2 + .35;
			}
			pos.set(node.id, {
				x: cx + Math.cos(angle) * rx,
				y: cy + Math.sin(angle) * ry,
				vx: 0,
				vy: 0,
				band: 0,
				degree: deg
			});
		});
	} else {
		const activeRanks = [...new Set(ordered.map((n) => healthBandRank(n.status)))].sort((a, b) => a - b);
		const rankToRow = new Map(activeRanks.map((r, i) => [r, i]));
		const byRow = /* @__PURE__ */ new Map();
		for (const node of ordered) {
			const row = rankToRow.get(healthBandRank(node.status)) ?? 0;
			if (!byRow.has(row)) byRow.set(row, []);
			byRow.get(row).push(node);
		}
		let cursorY = 120;
		for (let row = 0; row < activeRanks.length; row += 1) {
			const group = byRow.get(row) || [];
			const maxPerRow = compact ? Math.max(2, Math.min(3, Math.ceil(Math.sqrt(group.length * 1.1)))) : Math.max(3, Math.min(4, Math.ceil(Math.sqrt(group.length * 1.25))));
			group.forEach((node, i) => {
				const subRow = Math.floor(i / maxPerRow);
				const col = i % maxPerRow;
				const x = 640 - (Math.min(maxPerRow, group.length - subRow * maxPerRow) - 1) * minSepX / 2 + col * minSepX + (iterationSeed % 2 === 1 ? 14 : 0);
				const y = cursorY + subRow * 132;
				pos.set(node.id, {
					x,
					y,
					vx: 0,
					vy: 0,
					band: y,
					degree: degrees.get(node.id)?.total ?? 0
				});
			});
			const subRows = Math.max(1, Math.ceil(group.length / maxPerRow));
			cursorY += subRows * 132 + 64;
		}
	}
	const iterations = 110;
	const springK = .045;
	const idealEdgeLen = strategy === "force-degree" ? minSepX * 1.18 : minSepX * 1.05;
	const repulseStrength = 26e3;
	const centerX = 640;
	const centerY = 360;
	for (let iter = 0; iter < iterations; iter += 1) {
		const cooling = Math.max(.12, 1 - iter / iterations);
		for (let i = 0; i < ordered.length; i += 1) {
			const a = pos.get(ordered[i].id);
			for (let j = i + 1; j < ordered.length; j += 1) {
				const b = pos.get(ordered[j].id);
				let dx = b.x - a.x;
				let dy = b.y - a.y;
				if (Math.abs(dx) < .01 && Math.abs(dy) < .01) {
					dx = (i % 2 === 0 ? 1 : -1) * 1.5;
					dy = (j % 2 === 0 ? 1 : -1) * 1.5;
				}
				const distSq = dx * dx + dy * dy + 25;
				const dist = Math.sqrt(distSq);
				const fRep = repulseStrength / distSq * cooling;
				const fx = dx / dist * fRep;
				const fy = dy / dist * fRep;
				a.vx -= fx;
				a.vy -= fy;
				b.vx += fx;
				b.vy += fy;
				const overlapX = minSepX - Math.abs(dx);
				const overlapY = minSepY - Math.abs(dy);
				if (overlapX > 0 && overlapY > 0) {
					if (overlapX / minSepX < overlapY / minSepY) {
						const push = overlapX * .52 * (dx >= 0 ? 1 : -1);
						a.x -= push;
						b.x += push;
					} else {
						const push = overlapY * .52 * (dy >= 0 ? 1 : -1);
						a.y -= push;
						b.y += push;
					}
				}
			}
		}
		for (const e of edges) {
			const a = pos.get(e.from);
			const b = pos.get(e.to);
			if (!a || !b || e.from === e.to) continue;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const dist = Math.max(1, Math.hypot(dx, dy));
			const force = springK * (dist - idealEdgeLen) * cooling;
			const fx = dx / dist * force;
			const fy = dy / dist * force;
			a.vx += fx;
			a.vy += fy;
			b.vx -= fx;
			b.vy -= fy;
		}
		for (const node of ordered) {
			const p = pos.get(node.id);
			if (strategy === "force-degree") {
				const hubWeight = .015 + .055 * (p.degree / maxDegree);
				p.vx += (centerX - p.x) * hubWeight * cooling;
				p.vy += (centerY - p.y) * hubWeight * cooling;
			} else {
				p.vx += (centerX - p.x) * .024 * cooling;
				p.vy += (p.band - p.y) * .14 * cooling;
			}
			p.vx = Math.max(-42, Math.min(42, p.vx * .65));
			p.vy = Math.max(-42, Math.min(42, p.vy * .65));
			p.x += p.vx;
			p.y += p.vy;
		}
	}
	for (let pass = 0; pass < 18; pass += 1) {
		let anyOverlap = false;
		for (let i = 0; i < ordered.length; i += 1) {
			const a = pos.get(ordered[i].id);
			for (let j = i + 1; j < ordered.length; j += 1) {
				const b = pos.get(ordered[j].id);
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const overlapX = minSepX - Math.abs(dx);
				const overlapY = minSepY - Math.abs(dy);
				if (overlapX > 0 && overlapY > 0) {
					anyOverlap = true;
					if (overlapX / minSepX <= overlapY / minSepY) {
						const push = (overlapX / 2 + 2) * (dx >= 0 ? 1 : -1);
						a.x -= push;
						b.x += push;
					} else {
						const push = (overlapY / 2 + 2) * (dy >= 0 ? 1 : -1);
						a.y -= push;
						b.y += push;
					}
				}
			}
		}
		if (!anyOverlap) break;
	}
	let minX = 1e400;
	let minY = 1e400;
	let maxX = -1e400;
	let maxY = -1e400;
	for (const p of pos.values()) {
		minX = Math.min(minX, p.x);
		minY = Math.min(minY, p.y);
		maxX = Math.max(maxX, p.x + nodeW);
		maxY = Math.max(maxY, p.y + nodeH);
	}
	const pad = 44;
	const shiftX = pad - minX;
	const shiftY = pad - minY;
	const width = Math.max(820, Math.round(maxX - minX + 88));
	const height = Math.max(420, Math.round(maxY - minY + 88));
	const placedNodes = ordered.map((node, idx) => {
		const p = pos.get(node.id);
		return {
			...node,
			x: Math.round(p.x + shiftX),
			y: Math.round(p.y + shiftY),
			w: nodeW,
			h: nodeH,
			colIdx: idx
		};
	});
	const nodePosById = new Map(placedNodes.map((n) => [n.id, n]));
	const placedEdges = [];
	for (const edge of edges) {
		const a = nodePosById.get(edge.from);
		const b = nodePosById.get(edge.to);
		if (!a || !b) continue;
		const sx = a.x + a.w / 2;
		const sy = a.y + a.h / 2;
		const ex = b.x + b.w / 2;
		const ey = b.y + b.h / 2;
		const mx = (sx + ex) / 2;
		const my = (sy + ey) / 2 - 22;
		const d = `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
		placedEdges.push({
			...edge,
			d
		});
	}
	return {
		width,
		height,
		lanes: [],
		nodes: placedNodes,
		edges: placedEdges
	};
}
function layoutGraphByMode(raw, layoutMode, compact = false, seed = 0) {
	if (layoutMode === "force-degree" || layoutMode === "force-health") return layoutForceGraph(raw, layoutMode, compact, seed);
	return layoutGraph(raw, compact);
}
// web/components/ArchitectureGraph.tsx
var import_jsx_runtime = require_jsx_runtime();
var LAYOUT_OPTIONS = [
	{
		value: "lanes",
		label: "泳道架构"
	},
	{
		value: "force-degree",
		label: "连接度力导向"
	},
	{
		value: "force-health",
		label: "健康度力导向"
	}
];
function kindIcon(kind, lane) {
	const k = String(kind || "").toLowerCase();
	if (k === "agent" || lane === "entry") return Bot;
	if (k === "gateway" || k === "provider" || lane === "gateway") return Cpu;
	if (k === "memory" || lane === "memory") return Database;
	if (k === "firewall") return Shield;
	if (k === "fleet") return Globe;
	if (k === "network" || lane === "network") return Network;
	if (k === "service") return Server;
	return Layers;
}
var NODE_TYPES = {
	topologyNode: import_react.memo(function TopologyNode({ data }) {
		const { node, tone, degree, layoutMode, isSelected, isConnected, isDimmed } = data;
		const Icon = kindIcon(node.kind, node.lane);
		const dotClass = tone === "ok" ? "bg-[var(--ok-dot)]" : tone === "warn" ? "bg-[var(--warn-dot)]" : tone === "err" ? "bg-[var(--err-dot)]" : "bg-[var(--muted-dot)]";
		const statusTextClass = tone === "ok" ? "text-[var(--ok)]" : tone === "warn" ? "text-[var(--warn)]" : tone === "err" ? "text-[var(--err)]" : "text-[var(--ink-subtle)]";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			"data-graph-node-id": node.id,
			style: {
				width: node.w,
				minHeight: node.h
			},
			className: `group relative rounded-lg border bg-[var(--graph-node)] px-3.5 py-2.5 transition-[border-color,box-shadow,opacity] duration-150 ease-out select-none ${isSelected ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25 shadow-[0_0_0_1px_var(--accent),0_6px_20px_rgba(99,102,241,0.16)]" : isConnected ? "border-[var(--accent)]/60 shadow-xs" : "border-[var(--graph-node-stroke)] hover:border-[var(--ink-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"} ${isDimmed ? "opacity-25" : "opacity-100"}`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
					type: "target",
					position: Position.Left,
					id: "l"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
					type: "source",
					position: Position.Right,
					id: "r"
				}),
				layoutMode !== "lanes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
					type: "target",
					position: Position.Top,
					id: "t"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
					type: "source",
					position: Position.Bottom,
					id: "b"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-150 ease-out ${isSelected ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--ink-muted)] group-hover:text-[var(--ink)]"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "w-4 h-4",
							strokeWidth: 1.75
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate text-[13px] font-semibold tracking-tight text-[var(--ink)] leading-snug",
									title: node.label,
									children: node.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `h-2 w-2 rounded-full shrink-0 ${dotClass}`,
									title: statusLabel(node.status)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-0.5 truncate font-mono text-[11.5px] text-[var(--ink-muted)] leading-snug tabular-nums",
								title: node.meta || node.detail || "",
								children: node.meta || node.detail || "-"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1.5 flex items-center justify-between gap-2 text-[11px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `font-medium ${statusTextClass}`,
									children: statusLabel(node.status)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[var(--ink-subtle)] tabular-nums",
									children: degree > 0 ? `${degree} 连接` : "独立"
								})]
							})
						]
					})]
				})
			]
		});
	}),
	laneBackdrop: import_react.memo(function LaneBackdropNode({ data }) {
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				width: data.width,
				height: data.height
			},
			className: "rounded-xl border border-dashed border-[var(--graph-lane-stroke)] bg-[var(--graph-lane)] pointer-events-none select-none px-4 py-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[12px] font-semibold tracking-tight text-[var(--ink)]",
					children: data.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-mono text-[11.5px] font-medium text-[var(--ink-subtle)] tabular-nums",
					children: [
						data.okCount,
						"/",
						data.count
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[11px] text-[var(--ink-subtle)] mt-0.5",
				children: data.subtitle
			})]
		});
	})
};
function statusHexColor(tone) {
	if (tone === "ok") return "#16a34a";
	if (tone === "warn") return "#d97706";
	if (tone === "err") return "#dc2626";
	return "#94a3b8";
}
function FlowCanvasInner({ snapshot, mode, filter, enableAutoLayout, onOpenLogs, onSelectAgentCategory }) {
	const compact = mode !== "full";
	const [layoutMode, setLayoutMode] = import_react.useState("lanes");
	const [layoutSeed, setLayoutSeed] = import_react.useState(0);
	const [selectedId, setSelectedId] = import_react.useState("");
	const { zoomIn, zoomOut, fitView } = Sn();
	const { zoom } = Ca();
	const rawGraph = import_react.useMemo(() => {
		if (mode === "memory") return buildMemoryMiniGraph(snapshot);
		if (mode === "agents") return buildAgentsMiniGraph(snapshot);
		return buildFullGraph(snapshot, filter);
	}, [
		snapshot,
		mode,
		filter
	]);
	const degreeMap = import_react.useMemo(() => computeNodeDegrees(rawGraph.nodes, rawGraph.edges), [rawGraph]);
	const layout = import_react.useMemo(() => {
		if (!rawGraph.nodes.length) return null;
		return layoutGraphByMode(rawGraph, layoutMode, compact, layoutSeed);
	}, [
		rawGraph,
		layoutMode,
		compact,
		layoutSeed
	]);
	import_react.useEffect(() => {
		if (selectedId && layout && !layout.nodes.some((n) => n.id === selectedId)) setSelectedId("");
	}, [selectedId, layout]);
	const { activeNodeIds, activeEdgeIds, hasSelection } = import_react.useMemo(() => {
		const aNodes = /* @__PURE__ */ new Set();
		const aEdges = /* @__PURE__ */ new Set();
		const valid = Boolean(selectedId) && Boolean(layout?.nodes.some((n) => n.id === selectedId));
		if (valid && layout) {
			aNodes.add(selectedId);
			for (const edge of layout.edges) if (edge.from === selectedId || edge.to === selectedId) {
				aEdges.add(edge.id);
				aNodes.add(edge.from);
				aNodes.add(edge.to);
			}
		}
		return {
			activeNodeIds: aNodes,
			activeEdgeIds: aEdges,
			hasSelection: valid
		};
	}, [selectedId, layout]);
	const computedFlowNodes = import_react.useMemo(() => {
		if (!layout) return [];
		const list = [];
		if (layoutMode === "lanes") for (const lane of layout.lanes) list.push({
			id: `lane-bg:${lane.id}`,
			type: "laneBackdrop",
			position: {
				x: lane.x,
				y: lane.y
			},
			draggable: false,
			selectable: false,
			focusable: false,
			zIndex: -10,
			data: {
				title: lane.title,
				subtitle: lane.subtitle,
				okCount: lane.okCount,
				count: lane.count,
				width: lane.w,
				height: lane.h
			}
		});
		for (const node of layout.nodes) {
			const tone = statusTone(node.status);
			const isSelected = hasSelection && node.id === selectedId;
			const isConnected = hasSelection && activeNodeIds.has(node.id) && !isSelected;
			const isDimmed = hasSelection && !activeNodeIds.has(node.id);
			list.push({
				id: node.id,
				type: "topologyNode",
				position: {
					x: node.x,
					y: node.y
				},
				zIndex: isSelected ? 20 : isConnected ? 10 : 5,
				data: {
					node,
					tone,
					degree: degreeMap.get(node.id)?.total ?? 0,
					layoutMode,
					isSelected,
					isConnected,
					isDimmed
				}
			});
		}
		return list;
	}, [
		layout,
		layoutMode,
		degreeMap,
		hasSelection,
		selectedId,
		activeNodeIds
	]);
	const computedFlowEdges = import_react.useMemo(() => {
		if (!layout) return [];
		const posById = new Map(layout.nodes.map((n) => [n.id, n]));
		return layout.edges.map((edge) => {
			const isHighlight = hasSelection && activeEdgeIds.has(edge.id);
			const isDimmed = hasSelection && !isHighlight;
			const src = posById.get(edge.from);
			const dst = posById.get(edge.to);
			let sourceHandle = "r";
			let targetHandle = "l";
			if (layoutMode !== "lanes" && src && dst) {
				const dx = dst.x - src.x;
				const dy = dst.y - src.y;
				if (Math.abs(dy) > Math.abs(dx) * 1.15) {
					sourceHandle = dy >= 0 ? "b" : "r";
					targetHandle = dy >= 0 ? "t" : "l";
				}
			}
			const strokeColor = isHighlight ? "var(--accent)" : "var(--graph-edge)";
			return {
				id: edge.id,
				source: edge.from,
				target: edge.to,
				sourceHandle,
				targetHandle,
				type: "default",
				animated: isHighlight,
				label: isHighlight && edge.label ? edge.label : void 0,
				labelStyle: {
					fontSize: 10.5,
					fontFamily: "'JetBrains Mono Variable', monospace",
					fill: "var(--ink)",
					fontWeight: 500
				},
				labelBgStyle: {
					fill: "var(--surface)",
					fillOpacity: .92,
					stroke: "var(--border)",
					strokeWidth: .8
				},
				labelBgPadding: [5, 2],
				labelBgBorderRadius: 4,
				style: {
					stroke: strokeColor,
					strokeWidth: isHighlight ? 2.1 : 1.25,
					opacity: isDimmed ? .16 : isHighlight ? 1 : .82
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
					width: isHighlight ? 15 : 13,
					height: isHighlight ? 15 : 13,
					color: strokeColor
				}
			};
		});
	}, [
		layout,
		layoutMode,
		hasSelection,
		activeEdgeIds
	]);
	const [rfNodes, setRfNodes, onNodesChange] = wa(computedFlowNodes);
	const [rfEdges, setRfEdges, onEdgesChange] = Ta(computedFlowEdges);
	const layoutSignature = import_react.useMemo(() => `${mode}|${filter}|${layoutMode}|${layoutSeed}|${rawGraph.nodes.map((n) => n.id).join(",")}`, [
		mode,
		filter,
		layoutMode,
		layoutSeed,
		rawGraph.nodes
	]);
	const prevSigRef = import_react.useRef("");
	import_react.useEffect(() => {
		const structuralChange = prevSigRef.current !== layoutSignature;
		prevSigRef.current = layoutSignature;
		if (structuralChange) {
			setRfNodes(computedFlowNodes);
			window.requestAnimationFrame(() => {
				fitView({
					padding: .08,
					duration: 240
				});
			});
		} else setRfNodes((prev) => {
			const posMap = new Map(prev.map((n) => [n.id, n.position]));
			return computedFlowNodes.map((n) => ({
				...n,
				position: n.type === "laneBackdrop" ? n.position : posMap.get(n.id) || n.position
			}));
		});
	}, [
		computedFlowNodes,
		layoutSignature,
		setRfNodes,
		fitView
	]);
	import_react.useEffect(() => {
		setRfEdges(computedFlowEdges);
	}, [computedFlowEdges, setRfEdges]);
	const handleAutoLayoutClick = () => {
		if (layoutMode === "lanes") {
			setLayoutMode("force-degree");
			setLayoutSeed((s) => s + 1);
		} else setLayoutSeed((s) => s + 1);
	};
	if (!layout) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "当前视图暂无可绘制的关系节点。" });
	const selectedNode = hasSelection ? layout.nodes.find((n) => n.id === selectedId) || null : null;
	const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));
	const incoming = selectedNode ? layout.edges.filter((e) => e.to === selectedNode.id).map((e) => ({
		edge: e,
		peer: nodeMap.get(e.from)
	})).filter((x) => Boolean(x.peer)) : [];
	const outgoing = selectedNode ? layout.edges.filter((e) => e.from === selectedNode.id).map((e) => ({
		edge: e,
		peer: nodeMap.get(e.to)
	})).filter((x) => Boolean(x.peer)) : [];
	const zoomPct = Math.round(zoom * 100);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap items-center gap-2.5 min-w-0 max-w-full",
					children: enableAutoLayout ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
						value: layoutMode,
						onChange: (next) => {
							setLayoutMode(next);
							setLayoutSeed((s) => s + 1);
						},
						options: LAYOUT_OPTIONS,
						ariaLabel: "拓扑自动布局模式"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[12px] text-[var(--ink-subtle)]",
						children: "滚轮缩放 · 拖拽画布平移 · 点击节点高亮上下游"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [enableAutoLayout && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"data-testid": "graph-auto-layout",
						onClick: handleAutoLayoutClick,
						title: "按当前力导向策略重新计算无重叠布局",
						className: "h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-out inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Orbit, {
							className: "size-4 text-[var(--accent)]",
							strokeWidth: 1.75
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "自动布局" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] divide-x divide-[var(--border-subtle)] overflow-hidden",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"data-testid": "graph-zoom-out",
								onClick: () => void zoomOut({ duration: 180 }),
								"aria-label": "缩小图谱",
								title: "缩小图谱",
								className: "h-8 w-8 inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {
									className: "size-4",
									strokeWidth: 1.75
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								"data-testid": "graph-zoom-level",
								className: "px-2.5 font-mono text-[11.5px] font-medium text-[var(--ink-muted)] tabular-nums select-none min-w-[48px] text-center",
								children: [zoomPct, "%"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"data-testid": "graph-zoom-in",
								onClick: () => void zoomIn({ duration: 180 }),
								"aria-label": "放大图谱",
								title: "放大图谱",
								className: "h-8 w-8 inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
									className: "size-4",
									strokeWidth: 1.75
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"data-testid": "graph-zoom-reset",
								onClick: () => void fitView({
									padding: .1,
									duration: 220
								}),
								"aria-label": "适配画布",
								title: "适配全图",
								className: "h-8 px-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.97] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
									className: "size-3.5",
									strokeWidth: 1.75
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hidden sm:inline",
									children: "适配"
								})]
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-testid": "graph-viewport",
				"data-layout-mode": layoutMode,
				className: `ops-flow relative w-full ${mode === "full" ? "h-[560px]" : mode === "agents" ? "h-[400px]" : "h-[340px]"} rounded-xl border border-[var(--border-subtle)] overflow-hidden`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(_a, {
					nodes: rfNodes,
					edges: rfEdges,
					nodeTypes: NODE_TYPES,
					onNodesChange,
					onEdgesChange,
					onNodeClick: (_, node) => {
						if (node.type === "laneBackdrop") return;
						setSelectedId((prev) => prev === node.id ? "" : node.id);
					},
					onPaneClick: () => {
						if (selectedId) setSelectedId("");
					},
					fitView: true,
					fitViewOptions: { padding: .08 },
					minZoom: .35,
					maxZoom: 2.4,
					nodesConnectable: false,
					elementsSelectable: false,
					proOptions: { hideAttribution: true },
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ua, {
							variant: Ra.Dots,
							gap: 20,
							size: 1.2,
							color: "var(--flow-dot)"
						}),
						mode === "full" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pointer-events-none absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/92 backdrop-blur-sm text-[11.5px] text-[var(--ink-muted)] select-none",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										className: "h-1.5 w-1.5 rounded-full bg-[var(--ok-dot)]",
										"aria-hidden": "true"
									}), "健康"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										className: "h-1.5 w-1.5 rounded-full bg-[var(--warn-dot)]",
										"aria-hidden": "true"
									}), "降级"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										className: "h-1.5 w-1.5 rounded-full bg-[var(--err-dot)]",
										"aria-hidden": "true"
									}), "故障"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										className: "h-1.5 w-1.5 rounded-full bg-[var(--muted-dot)]",
										"aria-hidden": "true"
									}), "待机"]
								})
							]
						}),
						mode === "full" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Co, {
							pannable: true,
							zoomable: true,
							className: "hidden sm:block",
							style: {
								width: 148,
								height: 92
							},
							nodeColor: (n) => {
								if (n.type === "laneBackdrop") return "transparent";
								return statusHexColor(n.data?.tone || "muted");
							},
							nodeStrokeWidth: 2
						})
					]
				})
			}),
			selectedNode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5",
				"data-testid": "graph-inspector",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-3 min-w-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[14px] font-semibold text-[var(--ink)] truncate max-w-[260px]",
									children: selectedNode.label
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: selectedNode.status }),
								selectedNode.meta && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums truncate max-w-[240px]",
									children: selectedNode.meta
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 shrink-0",
							children: [
								selectedNode.unit && onOpenLogs && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => onOpenLogs(selectedNode.unit),
									className: "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, {
										className: "size-4 text-[var(--ink-muted)]",
										strokeWidth: 1.75
									}), "查看日志"]
								}),
								selectedNode.agentCategory && onSelectAgentCategory && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => onSelectAgentCategory(selectedNode.agentCategory),
									className: "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, {
										className: "size-4 text-[var(--ink-muted)]",
										strokeWidth: 1.75
									}), "筛选进程"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setSelectedId(""),
									"aria-label": "收起节点详情",
									className: "inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] active:scale-[0.95] transition-[color,background-color,transform] duration-150 ease-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
										className: "size-4",
										strokeWidth: 1.75
									})
								})
							]
						})]
					}),
					selectedNode.detail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-[13px] text-[var(--ink-muted)] text-pretty",
						children: selectedNode.detail
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-x-3 gap-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-subtle)] font-medium",
								children: "上游调用"
							}), incoming.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-subtle)]",
								children: "无上游连线"
							}) : incoming.map(({ edge, peer }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSelectedId(peer.id),
								className: "inline-flex items-center gap-1 rounded-md px-1 font-medium text-[var(--accent)] hover:underline cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: peer.label }), edge.label && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-[11.5px] text-[var(--ink-subtle)]",
									children: [
										"(",
										edge.label,
										")"
									]
								})]
							}, `${edge.id}-in`))]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-x-3 gap-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-subtle)] font-medium",
								children: "下游依赖"
							}), outgoing.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-subtle)]",
								children: "无下游连线"
							}) : outgoing.map(({ edge, peer }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSelectedId(peer.id),
								className: "inline-flex items-center gap-1 rounded-md px-1 font-medium text-[var(--accent)] hover:underline cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
										className: "size-3.5 text-[var(--ink-subtle)]",
										strokeWidth: 1.75
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: peer.label }),
									edge.label && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono text-[11.5px] text-[var(--ink-subtle)]",
										children: [
											"(",
											edge.label,
											")"
										]
									})
								]
							}, `${edge.id}-out`))]
						})]
					})
				]
			})
		]
	});
}
function ArchitectureGraph({ snapshot, mode = "full", filter = "all", interactiveZoom, onOpenLogs, onSelectAgentCategory }) {
	if (!snapshot) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "当前视图暂无可绘制的关系节点。" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(pa, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlowCanvasInner, {
		snapshot,
		mode,
		filter,
		enableAutoLayout: interactiveZoom ?? (mode === "full" || mode === "agents"),
		onOpenLogs,
		onSelectAgentCategory
	}) });
}
export { ArchitectureGraph };
