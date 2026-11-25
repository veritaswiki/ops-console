import type { ServiceItem, SnapshotResponse } from '../types';
import { statusTone } from '../utils/format.ts';

export interface GraphLane {
  id: string;
  title: string;
  subtitle: string;
}

export interface GraphNode {
  id: string;
  lane: string;
  kind: string;
  label: string;
  status: string;
  meta: string;
  detail: string;
  unit?: string;
  ports?: string[];
  dependsOn?: string[];
  risk?: string;
  agentCategory?: string;
  cmds?: string[];
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  label: string;
}

export interface PlacedLane extends GraphLane {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  okCount: number;
}

export interface PlacedNode extends GraphNode {
  x: number;
  y: number;
  w: number;
  h: number;
  colIdx: number;
}

export interface PlacedEdge extends GraphEdge {
  d: string;
}

export interface GraphLayout {
  width: number;
  height: number;
  lanes: PlacedLane[];
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}

export function truncateSvgText(text: string, maxUnits: number): string {
  const str = String(text ?? '');
  let units = 0;
  let cutIdx = 0;
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    const w = code > 255 ? 1.65 : code === 32 ? 0.55 : 0.95;
    if (units + w > maxUnits) {
      return `${str.slice(0, Math.max(1, cutIdx)).trimEnd()}…`;
    }
    units += w;
    if (units + 1.2 <= maxUnits) cutIdx = i + 1;
  }
  return str;
}

function compactPortLabel(ports?: string[], fallback = ''): string {
  const list = Array.isArray(ports) ? ports : [];
  if (!list.length) return fallback;
  const clean = String(list[0] || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  const m = clean.match(/:(\d+(?:\/\d+)?)$/);
  const first = m ? `:${m[1]}` : clean;
  return list.length > 1 ? `${first} +${list.length - 1}` : first;
}

function extractPorts(ports?: string[]): string[] {
  const out: string[] = [];
  for (const raw of ports || []) {
    const m = String(raw || '').match(/:(\d{2,5})(?:\/\d+)?/);
    if (m) out.push(m[1]);
  }
  return out;
}

function addEdgeUnique(
  edges: GraphEdge[],
  seen: Set<string>,
  edge: Omit<GraphEdge, 'id'>,
): void {
  if (!edge.from || !edge.to || edge.from === edge.to) return;
  const key = `${edge.from}->${edge.to}:${edge.kind || 'dep'}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ id: key, ...edge });
}

function serviceMetricText(svc: ServiceItem, snap: SnapshotResponse): string {
  const id = String(svc.id || '').toLowerCase();
  const magpie = snap?.magpie;
  const mem = snap?.memory;
  const net = snap?.network;
  if ((id === 'magpie' || id === 'magpie-gateway') && magpie?.reachable) {
    return `${magpie.totalModels || 0} 模型 · ${magpie.providers?.length || 0} 渠道`;
  }
  if (id.includes('nmem') && mem?.nmem?.reachable) {
    return `${mem.nmem.stats?.memories ?? 0} 记忆 · ${mem.nmem.spaces?.length ?? 0} 空间`;
  }
  if (id.includes('openviking') && mem?.openviking?.reachable) {
    return `向量 ${mem.openviking.vikingdb?.vectorCount ?? '-'} · 技能 ${mem.openviking.skillsCount ?? 0}`;
  }
  if (id.includes('symbiote') && mem?.symbiote?.reachable) {
    return `Vault ${mem.symbiote.vaultFileCount ?? '-'} 文件`;
  }
  if (id.includes('rerank') && mem?.rerank?.reachable) {
    return mem.rerank.model || 'Ready';
  }
  if (id.includes('tailscale') && net?.tailscale?.reachable) {
    return `${net.tailscale.onlineCount ?? 0}/${net.tailscale.devices?.length || 0} 设备在线`;
  }
  if (id.includes('mihomo') && net?.mihomo?.reachable) {
    return `${net.mihomo.activeConnections ?? 0} 连接`;
  }
  if (id.includes('syncthing') && net?.syncthing?.reachable) {
    return net.syncthing.latencyMs != null ? `延迟 ${net.syncthing.latencyMs}ms` : '同步正常';
  }
  if (svc.probe?.ok) {
    return `${compactPortLabel(svc.ports, svc.scope || '')} · ${svc.probe.latencyMs}ms`;
  }
  return compactPortLabel(svc.ports, svc.scope || 'service');
}

function mapServiceLane(svc: ServiceItem): string {
  const id = String(svc.id || '').toLowerCase();
  const layer = String(svc.layer || '').toLowerCase();
  if (
    id.includes('firewall') ||
    id.includes('tunnel') ||
    layer === 'network' ||
    layer === 'infra' ||
    id.includes('tailscale') ||
    id.includes('mihomo') ||
    id.includes('sync') ||
    id.includes('postgres') ||
    id.includes('redis')
  ) {
    return 'network';
  }
  if (
    layer === 'memory' ||
    id.includes('nmem') ||
    id.includes('openviking') ||
    id.includes('symbiote') ||
    id.includes('rerank') ||
    id.includes('embed')
  ) {
    return 'memory';
  }
  if (id === 'magpie' || id.includes('gateway') || id.includes('bridge')) return 'gateway';
  return 'entry';
}

export function buildFullGraph(
  snap: SnapshotResponse,
  filter = 'all',
): { lanes: GraphLane[]; nodes: GraphNode[]; edges: GraphEdge[] } {
  const services = snap?.services?.items || [];
  const mem = snap?.memory || {};
  const magpie = snap?.magpie || {};
  const agents = snap?.agents?.processes || [];
  const net = snap?.network || {};
  const fw = snap?.firewall || net.firewall || null;
  const fleet = snap?.fleet || null;

  const lanes: GraphLane[] = [
    { id: 'entry', title: '入口与 Agent', subtitle: '控制台 · 编排器 · 会话' },
    { id: 'gateway', title: '网关与路由', subtitle: '模型分发 · 渠道桥接' },
    { id: 'memory', title: '记忆与上下文', subtitle: '知识库 · 向量 · 重排' },
    { id: 'network', title: '网络与底座', subtitle: '组网 · 防火墙 · 节点' },
  ];

  const nodes: GraphNode[] = [];
  const nodeById = new Map<string, GraphNode>();
  const svcNodeById = new Map<string, GraphNode>();
  const svcByPort = new Map<string, GraphNode>();

  const addNode = (node: GraphNode): GraphNode => {
    const existing = nodeById.get(node.id);
    if (existing) return existing;
    nodeById.set(node.id, node);
    nodes.push(node);
    return node;
  };

  for (const svc of services) {
    const lane = mapServiceLane(svc);
    const id = `svc:${svc.id}`;
    const node = addNode({
      id,
      lane,
      kind: 'service',
      label: svc.name || svc.id,
      status: svc.status || 'standby',
      meta: serviceMetricText(svc, snap),
      detail: svc.role || `${svc.unit} (${svc.scope || 'user'})`,
      unit: svc.unit || '',
      ports: svc.ports || [],
      dependsOn: Array.isArray(svc.dependsOn) ? svc.dependsOn : [],
      risk: svc.risk || 'normal',
    });
    svcNodeById.set(svc.id, node);
    svcNodeById.set(svc.unit, node);
    for (const port of extractPorts(svc.ports)) {
      svcByPort.set(port, node);
    }
  }

  const agentGroups = new Map<string, { label: string; count: number; cpu: number; cmds: string[] }>();
  for (const proc of agents) {
    const key = proc.categoryLabel || proc.category || 'Agent';
    if (!agentGroups.has(key)) {
      agentGroups.set(key, { label: key, count: 0, cpu: 0, cmds: [] });
    }
    const grp = agentGroups.get(key)!;
    grp.count += 1;
    grp.cpu += Number(proc.cpu || 0);
    if (proc.cmd || proc.command) grp.cmds.push(proc.cmd || proc.command || '');
  }

  const agentNodeIds: string[] = [];
  for (const grp of [...agentGroups.values()].slice(0, 4)) {
    const id = `agent:${grp.label}`;
    addNode({
      id,
      lane: 'entry',
      kind: 'agent',
      label: grp.label,
      status: 'healthy',
      meta: `${grp.count} 进程 · CPU ${grp.cpu.toFixed(1)}%`,
      detail: `活跃运行时进程组 (${grp.count} 个匹配进程)`,
      agentCategory: grp.label,
      cmds: grp.cmds,
    });
    agentNodeIds.push(id);
  }

  let gatewayNode = [...nodeById.values()].find((n) => n.lane === 'gateway' && n.id.includes('magpie'));
  if (!gatewayNode && magpie.enabled) {
    gatewayNode = addNode({
      id: 'connector:magpie',
      lane: 'gateway',
      kind: 'gateway',
      label: 'Magpie 网关',
      status: magpie.status || 'standby',
      meta: magpie.reachable
        ? `${magpie.totalModels || 0} 模型 · ${magpie.providers?.length || 0} 渠道`
        : magpie.error || '离线',
      detail: magpie.protocol || 'OpenAI /v1/models',
    });
  }
  if (magpie.reachable && Array.isArray(magpie.providers) && magpie.providers.length > 0) {
    for (const prov of magpie.providers.slice(0, 3)) {
      addNode({
        id: `provider:${prov.name}`,
        lane: 'gateway',
        kind: 'provider',
        label: prov.name,
        status: 'healthy',
        meta: `${prov.count} 模型渠道`,
        detail: `通过 Magpie 模型网关统一路由 (${prov.count} 个可用模型)`,
      });
    }
  }

  const ensureMemoryConnector = (
    key: string,
    title: string,
    eng: { enabled?: boolean; status?: string; protocol?: string } | undefined,
    metric: string,
  ): GraphNode | null => {
    if (!eng?.enabled) return null;
    const existing = [...nodeById.values()].find(
      (n) => n.lane === 'memory' && n.id.toLowerCase().includes(key),
    );
    if (existing) return existing;
    return addNode({
      id: `connector:${key}`,
      lane: 'memory',
      kind: 'memory',
      label: title,
      status: eng.status || 'standby',
      meta: metric,
      detail: eng.protocol || title,
    });
  };

  const nmemNode = ensureMemoryConnector(
    'nmem',
    'Nowledge Mem',
    mem.nmem,
    mem.nmem?.reachable ? `${mem.nmem.stats?.memories ?? 0} 记忆 · ${mem.nmem.spaces?.length ?? 0} 空间` : '离线',
  );
  const ovNode = ensureMemoryConnector(
    'openviking',
    'OpenViking',
    mem.openviking,
    mem.openviking?.reachable
      ? `向量 ${mem.openviking.vikingdb?.vectorCount ?? '-'} · 技能 ${mem.openviking.skillsCount ?? 0}`
      : '离线',
  );
  const symNode = ensureMemoryConnector(
    'symbiote',
    'Symbiote',
    mem.symbiote,
    mem.symbiote?.reachable ? `Vault ${mem.symbiote.vaultFileCount ?? '-'} 文件` : '离线',
  );
  const rerankNode = ensureMemoryConnector(
    'rerank',
    'Rerank',
    mem.rerank,
    mem.rerank?.reachable ? mem.rerank.model || 'Ready' : '离线',
  );

  let firewallNode: GraphNode | null = null;
  if (fw?.enabled) {
    const fwSum = fw.summary || {};
    firewallNode = addNode({
      id: 'connector:firewall',
      lane: 'network',
      kind: 'firewall',
      label: '防火墙与监听端口',
      status: (fwSum.publicUnfiltered ?? 0) > 0 ? 'degraded' : fw.status || 'healthy',
      meta: `${fwSum.totalListeners ?? 0} 监听 · 丢弃 ${fwSum.droppedPackets ?? 0}`,
      detail:
        fw.backend === 'iptables'
          ? `只读 iptables-save (${fw.totalRules ?? 0} 条规则)，公网直露 ${fwSum.publicUnfiltered ?? 0} 个`
          : '仅套接字监听视图 (未授权只读 iptables-save)',
    });
  }

  let fleetNode: GraphNode | null = null;
  if (fleet?.summary) {
    const fs = fleet.summary;
    fleetNode = addNode({
      id: 'connector:fleet',
      lane: 'network',
      kind: 'fleet',
      label: '全球多端节点',
      status: (fs.online ?? 0) > 0 ? 'healthy' : 'degraded',
      meta: `在线 ${fs.online ?? 0}/${fs.total ?? 0} · 探针 ${fs.probed ?? 0}`,
      detail: `服务器 ${fs.servers ?? 0} · 笔记本 ${fs.laptops ?? 0} · 移动端 ${fs.mobiles ?? 0}`,
    });
  }

  const tailscaleNode =
    [...nodeById.values()].find((n) => n.id.toLowerCase().includes('tailscale')) ||
    (net.tailscale?.enabled
      ? addNode({
          id: 'connector:tailscale',
          lane: 'network',
          kind: 'network',
          label: 'Tailscale Mesh',
          status: net.tailscale.status || 'standby',
          meta: net.tailscale.reachable
            ? `${net.tailscale.onlineCount ?? 0}/${net.tailscale.devices?.length || 0} 设备在线`
            : '不可达',
          detail: net.tailscale.protocol || 'tailscale status --json',
        })
      : null);

  const edges: GraphEdge[] = [];
  const edgeSeen = new Set<string>();

  for (const node of nodes) {
    if (!Array.isArray(node.dependsOn)) continue;
    for (const depRef of node.dependsOn) {
      const target = svcNodeById.get(depRef);
      if (target) {
        addEdgeUnique(edges, edgeSeen, {
          from: node.id,
          to: target.id,
          kind: 'dep',
          label: '配置依赖',
        });
      }
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
          addEdgeUnique(edges, edgeSeen, { from: aId, to: target.id, kind: 'rpc', label: `:${m[1]}` });
        }
      }
    }
    if (gatewayNode) {
      addEdgeUnique(edges, edgeSeen, { from: aId, to: gatewayNode.id, kind: 'route', label: '模型路由' });
    }
    if (!matchedExplicitPort && nmemNode) {
      addEdgeUnique(edges, edgeSeen, { from: aId, to: nmemNode.id, kind: 'memory', label: '长期记忆' });
    }
    if (!matchedExplicitPort && ovNode) {
      addEdgeUnique(edges, edgeSeen, { from: aId, to: ovNode.id, kind: 'memory', label: '上下文检索' });
    }
  }

  const entryServices = nodes.filter((n) => n.lane === 'entry' && n.kind === 'service');
  for (const es of entryServices) {
    if (gatewayNode && es.id !== gatewayNode.id && !es.id.includes('ops-console')) {
      addEdgeUnique(edges, edgeSeen, { from: es.id, to: gatewayNode.id, kind: 'route', label: '调用网关' });
    }
    if (tailscaleNode) {
      addEdgeUnique(edges, edgeSeen, { from: es.id, to: tailscaleNode.id, kind: 'mesh', label: 'Tailnet 接入' });
    }
  }

  if (gatewayNode) {
    for (const n of nodes) {
      if (n.kind === 'provider') {
        addEdgeUnique(edges, edgeSeen, { from: gatewayNode.id, to: n.id, kind: 'provider', label: '上游模型' });
      }
    }
    if (ovNode) {
      addEdgeUnique(edges, edgeSeen, { from: gatewayNode.id, to: ovNode.id, kind: 'memory', label: '技能/上下文' });
    }
    if (firewallNode) {
      addEdgeUnique(edges, edgeSeen, { from: gatewayNode.id, to: firewallNode.id, kind: 'guard', label: '端口防护' });
    }
  }

  if (ovNode && rerankNode) {
    addEdgeUnique(edges, edgeSeen, { from: ovNode.id, to: rerankNode.id, kind: 'memory', label: '语义重排' });
  }
  if (symNode && ovNode) {
    addEdgeUnique(edges, edgeSeen, { from: symNode.id, to: ovNode.id, kind: 'memory', label: '文档索引' });
  }
  if (nmemNode && firewallNode) {
    addEdgeUnique(edges, edgeSeen, { from: nmemNode.id, to: firewallNode.id, kind: 'guard', label: '仅本地回环' });
  }
  if (tailscaleNode && fleetNode) {
    addEdgeUnique(edges, edgeSeen, { from: tailscaleNode.id, to: fleetNode.id, kind: 'mesh', label: 'WireGuard 组网' });
  }
  if (tailscaleNode && firewallNode) {
    addEdgeUnique(edges, edgeSeen, { from: tailscaleNode.id, to: firewallNode.id, kind: 'guard', label: '入站策略' });
  }

  let visibleNodes = nodes;
  if (filter === 'services') {
    visibleNodes = nodes.filter((n) => n.kind === 'service');
  } else if (filter === 'memory') {
    visibleNodes = nodes.filter(
      (n) => n.lane === 'memory' || n.kind === 'agent' || n.id === gatewayNode?.id,
    );
  } else if (filter === 'agents') {
    visibleNodes = nodes.filter(
      (n) =>
        n.lane === 'entry' ||
        n.lane === 'gateway' ||
        n.id === nmemNode?.id ||
        n.id === ovNode?.id,
    );
  } else if (filter === 'network') {
    visibleNodes = nodes.filter(
      (n) => n.lane === 'network' || n.id === gatewayNode?.id || n.id.includes('ops-console'),
    );
  }

  const visibleSet = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter((e) => visibleSet.has(e.from) && visibleSet.has(e.to));
  const activeLanes = lanes.filter((l) => visibleNodes.some((n) => n.lane === l.id));

  return { lanes: activeLanes.length ? activeLanes : lanes, nodes: visibleNodes, edges: visibleEdges };
}

export function buildMemoryMiniGraph(
  snap: SnapshotResponse,
): { lanes: GraphLane[]; nodes: GraphNode[]; edges: GraphEdge[] } {
  const mem = snap?.memory || {};
  const agents = snap?.agents?.processes || [];
  const lanes: GraphLane[] = [
    { id: 'consumers', title: '调用方与入口', subtitle: 'Agent · MCP · 检索' },
    { id: 'engines', title: '记忆与上下文引擎', subtitle: '官方 REST / CLI 接口' },
    { id: 'backing', title: '底层索引与存储', subtitle: '向量库 · 文档库 · 重排' },
  ];

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSeen = new Set<string>();
  const add = (n: GraphNode) => {
    nodes.push(n);
    return n;
  };

  const agentCount = agents.length;
  const callerAgent = add({
    id: 'mem-caller:agents',
    lane: 'consumers',
    kind: 'agent',
    label: '活跃 Agent 运行时',
    status: agentCount > 0 ? 'healthy' : 'standby',
    meta: `${agentCount} 个活跃进程`,
    detail: '通过 MCP 与本地 HTTP 读写长期记忆和上下文',
  });
  const callerConsole = add({
    id: 'mem-caller:console',
    lane: 'consumers',
    kind: 'service',
    label: '跨库联合检索',
    status: 'healthy',
    meta: 'nmem + ov 官方协议',
    detail: '统一检索 Nowledge Mem 与 OpenViking',
  });

  if (mem.nmem?.enabled) {
    const n = mem.nmem;
    add({
      id: 'mem-eng:nmem',
      lane: 'engines',
      kind: 'memory',
      label: 'Nowledge Mem',
      status: n.status || 'standby',
      meta: n.reachable ? `${n.stats?.memories ?? 0} 记忆 · ${n.latencyMs ?? 0}ms` : n.error || '离线',
      detail: n.protocol || 'REST + nmem CLI',
    });
    add({
      id: 'mem-back:nmem-db',
      lane: 'backing',
      kind: 'storage',
      label: '知识图谱与空间',
      status: n.reachable ? 'healthy' : 'offline',
      meta: `${n.spaces?.length ?? 0} 空间 · ${n.stats?.threads ?? 0} 对话`,
      detail: '结构化跨工具长期记忆数据库',
    });
    addEdgeUnique(edges, edgeSeen, { from: callerAgent.id, to: 'mem-eng:nmem', kind: 'memory', label: 'MCP 读写' });
    addEdgeUnique(edges, edgeSeen, { from: callerConsole.id, to: 'mem-eng:nmem', kind: 'rpc', label: 'nmem search' });
    addEdgeUnique(edges, edgeSeen, { from: 'mem-eng:nmem', to: 'mem-back:nmem-db', kind: 'storage', label: '本地图谱' });
  }

  if (mem.openviking?.enabled) {
    const ov = mem.openviking;
    add({
      id: 'mem-eng:openviking',
      lane: 'engines',
      kind: 'memory',
      label: 'OpenViking',
      status: ov.status || 'standby',
      meta: ov.reachable ? `技能 ${ov.skillsCount ?? 0} · ${ov.latencyMs ?? 0}ms` : ov.error || '离线',
      detail: ov.protocol || 'HTTP + ov CLI',
    });
    add({
      id: 'mem-back:vikingdb',
      lane: 'backing',
      kind: 'storage',
      label: 'VikingDB 向量索引',
      status: ov.reachable ? 'healthy' : 'offline',
      meta: `向量 ${ov.vikingdb?.vectorCount ?? '-'} · 队列 ${ov.queue?.pending ?? 0}`,
      detail: '上下文检索、经验记忆与跨端 Skill 仓库',
    });
    addEdgeUnique(edges, edgeSeen, { from: callerAgent.id, to: 'mem-eng:openviking', kind: 'memory', label: '上下文召回' });
    addEdgeUnique(edges, edgeSeen, { from: callerConsole.id, to: 'mem-eng:openviking', kind: 'rpc', label: 'ov find' });
    addEdgeUnique(edges, edgeSeen, { from: 'mem-eng:openviking', to: 'mem-back:vikingdb', kind: 'storage', label: '向量检索' });
  }

  if (mem.symbiote?.enabled) {
    const sym = mem.symbiote;
    add({
      id: 'mem-eng:symbiote',
      lane: 'engines',
      kind: 'memory',
      label: 'Symbiote',
      status: sym.status || 'standby',
      meta: sym.reachable ? `模式 ${sym.mode || '-'} · ${sym.latencyMs ?? 0}ms` : sym.error || '离线',
      detail: sym.protocol || 'HTTP /api/health',
    });
    add({
      id: 'mem-back:vault',
      lane: 'backing',
      kind: 'storage',
      label: 'Markdown Vault',
      status: sym.reachable ? 'healthy' : 'offline',
      meta: `${sym.vaultFileCount ?? '-'} 个文档文件`,
      detail: '本地笔记与阅读台文档库',
    });
    addEdgeUnique(edges, edgeSeen, { from: callerAgent.id, to: 'mem-eng:symbiote', kind: 'memory', label: '文档阅读' });
    addEdgeUnique(edges, edgeSeen, { from: 'mem-eng:symbiote', to: 'mem-back:vault', kind: 'storage', label: '本地 Vault' });
  }

  if (mem.rerank?.enabled) {
    const rr = mem.rerank;
    add({
      id: 'mem-back:rerank',
      lane: 'backing',
      kind: 'memory',
      label: 'Rerank 重排服务',
      status: rr.status || 'standby',
      meta: rr.reachable ? rr.model || 'Ready' : rr.error || '离线',
      detail: rr.protocol || 'HTTP /health',
    });
    if (mem.openviking?.enabled) {
      addEdgeUnique(edges, edgeSeen, { from: 'mem-eng:openviking', to: 'mem-back:rerank', kind: 'rpc', label: '结果精排' });
    }
    if (mem.nmem?.enabled) {
      addEdgeUnique(edges, edgeSeen, { from: 'mem-eng:nmem', to: 'mem-back:rerank', kind: 'rpc', label: '语义排序' });
    }
  }

  return { lanes, nodes, edges };
}

export function buildAgentsMiniGraph(
  snap: SnapshotResponse,
): { lanes: GraphLane[]; nodes: GraphNode[]; edges: GraphEdge[] } {
  const agents = snap?.agents?.processes || [];
  const magpie = snap?.magpie || {};
  const mem = snap?.memory || {};

  const lanes: GraphLane[] = [
    { id: 'runtimes', title: '活跃 Agent 进程组', subtitle: '点击可按类别筛选' },
    { id: 'router', title: '网关与共享能力', subtitle: 'Magpie · MCP Hub · 记忆' },
    { id: 'providers', title: '模型供给渠道', subtitle: '实时目录统计' },
  ];

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSeen = new Set<string>();
  const add = (n: GraphNode) => {
    nodes.push(n);
    return n;
  };

  const groups = new Map<string, { label: string; count: number; cpu: number }>();
  for (const proc of agents) {
    const key = proc.categoryLabel || proc.category || 'Agent';
    if (!groups.has(key)) groups.set(key, { label: key, count: 0, cpu: 0 });
    const g = groups.get(key)!;
    g.count += 1;
    g.cpu += Number(proc.cpu || 0);
  }

  const runtimeNodes: GraphNode[] = [];
  for (const grp of [...groups.values()].slice(0, 5)) {
    runtimeNodes.push(
      add({
        id: `ag-proc:${grp.label}`,
        lane: 'runtimes',
        kind: 'agent',
        label: grp.label,
        status: 'healthy',
        meta: `${grp.count} 进程 · CPU ${grp.cpu.toFixed(1)}%`,
        detail: `点击下钻筛选「${grp.label}」进程明细`,
        agentCategory: grp.label,
      }),
    );
  }
  if (runtimeNodes.length === 0) {
    runtimeNodes.push(
      add({
        id: 'ag-proc:idle',
        lane: 'runtimes',
        kind: 'agent',
        label: '当前无活跃 Agent',
        status: 'standby',
        meta: '等待会话启动',
        detail: '按配置的进程匹配规则自动发现运行时',
      }),
    );
  }

  const gwNode = add({
    id: 'ag-router:magpie',
    lane: 'router',
    kind: 'gateway',
    label: 'Magpie 模型网关',
    status: magpie.enabled ? magpie.status || 'standby' : 'standby',
    meta: magpie.reachable ? `${magpie.totalModels || 0} 模型 · ${magpie.latencyMs ?? 0}ms` : magpie.error || '离线',
    detail: magpie.protocol || 'OpenAI /v1/models',
  });

  const activeBridges = Array.isArray(magpie.agents)
    ? magpie.agents.length
    : Array.isArray(magpie.bridges)
      ? magpie.bridges.filter((b) => b.active).length
      : 0;
  const mcpCount =
    typeof magpie.library?.mcpCount === 'number'
      ? magpie.library.mcpCount
      : Array.isArray(magpie.library?.mcps)
        ? magpie.library.mcps.length
        : 0;

  const bridgeNode = add({
    id: 'ag-router:hub',
    lane: 'router',
    kind: 'gateway',
    label: '桥接与共享 MCP',
    status: activeBridges > 0 || mcpCount > 0 ? 'healthy' : 'standby',
    meta: `${activeBridges} 桥接 · ${mcpCount} MCP`,
    detail: '通过 Magpie CLI 后台异步采集，不阻塞主快照',
  });

  const memOk = (['nmem', 'openviking', 'symbiote'] as const).filter((k) => mem[k]?.reachable).length;
  const memNode = add({
    id: 'ag-router:memory',
    lane: 'router',
    kind: 'memory',
    label: '跨工具记忆总线',
    status: memOk > 0 ? 'healthy' : 'standby',
    meta: `${memOk} 个引擎在线`,
    detail: 'Nowledge Mem + OpenViking 原生记忆上下文',
  });

  for (const rn of runtimeNodes) {
    addEdgeUnique(edges, edgeSeen, { from: rn.id, to: gwNode.id, kind: 'route', label: '推理调用' });
    addEdgeUnique(edges, edgeSeen, { from: rn.id, to: memNode.id, kind: 'memory', label: '记忆读写' });
  }
  addEdgeUnique(edges, edgeSeen, { from: gwNode.id, to: bridgeNode.id, kind: 'dep', label: '桥接调度' });

  const providers = Array.isArray(magpie.providers) ? magpie.providers.slice(0, 5) : [];
  for (const prov of providers) {
    const pNode = add({
      id: `ag-prov:${prov.name}`,
      lane: 'providers',
      kind: 'provider',
      label: prov.name,
      status: 'healthy',
      meta: `${prov.count} 个模型`,
      detail: `Magpie 已注册渠道：${prov.name}`,
    });
    addEdgeUnique(edges, edgeSeen, { from: gwNode.id, to: pNode.id, kind: 'provider', label: '路由转发' });
  }
  if (providers.length === 0) {
    const emptyProv = add({
      id: 'ag-prov:none',
      lane: 'providers',
      kind: 'provider',
      label: '未发现模型渠道',
      status: 'standby',
      meta: '检查 Magpie /v1/models',
      detail: '确认 Magpie 网关已配置模型提供方',
    });
    addEdgeUnique(edges, edgeSeen, { from: gwNode.id, to: emptyProv.id, kind: 'provider', label: '待配置' });
  }

  return { lanes, nodes, edges };
}

export function layoutGraph(
  data: { lanes: GraphLane[]; nodes: GraphNode[]; edges: GraphEdge[] },
  compact = false,
): GraphLayout {
  const { lanes, nodes, edges } = data;
  const laneCount = Math.max(1, lanes.length);
  const width = compact ? 980 : 1160;
  const padX = 16;
  const colGap = compact ? 44 : 36;
  const laneW = Math.floor((width - padX * 2 - colGap * (laneCount - 1)) / laneCount);
  const nodePadX = 12;
  const nodeW = laneW - nodePadX * 2;
  const nodeH = compact ? 76 : 80;
  const nodeGapY = 14;
  const headerH = 62;
  const bottomPad = 16;

  const byLane = new Map<string, GraphNode[]>(lanes.map((l) => [l.id, []]));
  for (const node of nodes) {
    const bucket = byLane.get(node.lane) || byLane.get(lanes[0]?.id);
    if (bucket) bucket.push(node);
  }

  let maxNodes = 1;
  for (const list of byLane.values()) {
    if (list.length > maxNodes) maxNodes = list.length;
  }
  const laneH = headerH + maxNodes * nodeH + Math.max(0, maxNodes - 1) * nodeGapY + bottomPad;
  const totalH = laneH + 20;

  const laneBoxes: PlacedLane[] = [];
  const placedNodes: PlacedNode[] = [];
  const nodePosById = new Map<string, PlacedNode>();

  lanes.forEach((lane, idx) => {
    const x = padX + idx * (laneW + colGap);
    const y = 10;
    const list = byLane.get(lane.id) || [];
    const okCount = list.filter((n) => statusTone(n.status) === 'ok').length;
    laneBoxes.push({ ...lane, x, y, w: laneW, h: laneH, count: list.length, okCount });
    list.forEach((node, rowIdx) => {
      const nx = x + nodePadX;
      const ny = y + headerH + rowIdx * (nodeH + nodeGapY);
      const placed: PlacedNode = { ...node, x: nx, y: ny, w: nodeW, h: nodeH, colIdx: idx };
      placedNodes.push(placed);
      nodePosById.set(node.id, placed);
    });
  });

  const placedEdges: PlacedEdge[] = [];
  for (const edge of edges) {
    const a = nodePosById.get(edge.from);
    const b = nodePosById.get(edge.to);
    if (!a || !b) continue;

    let d = '';
    if (a.colIdx === b.colIdx) {
      const sx = a.x + a.w;
      const sy = a.y + a.h / 2;
      const ex = b.x + b.w;
      const ey = b.y + b.h / 2;
      const bend = Math.min(26, Math.max(16, Math.abs(ey - sy) * 0.25));
      d = `M${sx.toFixed(1)} ${sy.toFixed(1)} C${(sx + bend).toFixed(1)} ${sy.toFixed(1)}, ${(ex + bend).toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    } else if (a.colIdx < b.colIdx) {
      const sx = a.x + a.w;
      const sy = a.y + a.h / 2;
      const ex = b.x;
      const ey = b.y + b.h / 2;
      const span = Math.max(24, (ex - sx) * 0.48);
      d = `M${sx.toFixed(1)} ${sy.toFixed(1)} C${(sx + span).toFixed(1)} ${sy.toFixed(1)}, ${(ex - span).toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    } else {
      const sx = a.x;
      const sy = a.y + a.h / 2;
      const ex = b.x + b.w;
      const ey = b.y + b.h / 2;
      const span = Math.max(24, (sx - ex) * 0.48);
      d = `M${sx.toFixed(1)} ${sy.toFixed(1)} C${(sx - span).toFixed(1)} ${sy.toFixed(1)}, ${(ex + span).toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    }
    placedEdges.push({ ...edge, d });
  }

  return { width, height: totalH, lanes: laneBoxes, nodes: placedNodes, edges: placedEdges };
}

export interface GraphViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const GRAPH_MIN_ZOOM = 0.75;
export const GRAPH_MAX_ZOOM = 3.0;

export function clampGraphViewBox(
  vb: GraphViewBox,
  baseWidth: number,
  baseHeight: number,
): GraphViewBox {
  const safeBaseW = Math.max(100, baseWidth);
  const safeBaseH = Math.max(100, baseHeight);
  const aspect = safeBaseH / safeBaseW;
  const minW = safeBaseW / GRAPH_MAX_ZOOM;
  const maxW = safeBaseW / GRAPH_MIN_ZOOM;
  const w = Math.max(minW, Math.min(maxW, vb.w));
  const h = w * aspect;

  const padX = safeBaseW * 0.25;
  const padY = safeBaseH * 0.25;
  const minX = -padX;
  const maxX = Math.max(minX, safeBaseW + padX - w);
  const minY = -padY;
  const maxY = Math.max(minY, safeBaseH + padY - h);

  const x = Math.max(minX, Math.min(maxX, vb.x));
  const y = Math.max(minY, Math.min(maxY, vb.y));
  return { x, y, w, h };
}

export function zoomGraphViewBox(
  vb: GraphViewBox,
  baseWidth: number,
  baseHeight: number,
  factor: number,
  focusX?: number,
  focusY?: number,
): GraphViewBox {
  const fx = focusX ?? vb.x + vb.w / 2;
  const fy = focusY ?? vb.y + vb.h / 2;
  const ratioX = vb.w > 0 ? (fx - vb.x) / vb.w : 0.5;
  const ratioY = vb.h > 0 ? (fy - vb.y) / vb.h : 0.5;
  const nextW = vb.w * factor;
  const nextH = nextW * (baseHeight / Math.max(1, baseWidth));
  return clampGraphViewBox(
    {
      x: fx - ratioX * nextW,
      y: fy - ratioY * nextH,
      w: nextW,
      h: nextH,
    },
    baseWidth,
    baseHeight,
  );
}

export function panGraphViewBox(
  vb: GraphViewBox,
  baseWidth: number,
  baseHeight: number,
  deltaSvgX: number,
  deltaSvgY: number,
): GraphViewBox {
  return clampGraphViewBox(
    {
      x: vb.x - deltaSvgX,
      y: vb.y - deltaSvgY,
      w: vb.w,
      h: vb.h,
    },
    baseWidth,
    baseHeight,
  );
}

export function graphZoomPercent(vb: GraphViewBox, baseWidth: number): number {
  if (!vb.w || !baseWidth) return 100;
  return Math.round((baseWidth / vb.w) * 100);
}

export type GraphLayoutMode = 'lanes' | 'force-degree' | 'force-health';

export function computeNodeDegrees(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, { inDegree: number; outDegree: number; total: number }> {
  const map = new Map<string, { inDegree: number; outDegree: number; total: number }>();
  for (const n of nodes) {
    map.set(n.id, { inDegree: 0, outDegree: 0, total: 0 });
  }
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

function healthBandRank(status?: string): number {
  const tone = statusTone(status);
  if (tone === 'err') return 0; // Failed/offline surfaces to top priority band
  if (tone === 'warn') return 1; // Degraded/warning second
  if (tone === 'muted') return 2; // Standby third
  return 3; // Healthy stable base
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
export function layoutForceGraph(
  raw: { lanes: GraphLane[]; nodes: GraphNode[]; edges: GraphEdge[] },
  strategy: 'force-degree' | 'force-health',
  compact = false,
  iterationSeed = 0,
): GraphLayout {
  const { nodes, edges } = raw;
  const nodeW = compact ? 236 : 224;
  const nodeH = 74;
  const gapX = 52;
  const gapY = 40;
  const minSepX = nodeW + gapX;
  const minSepY = nodeH + gapY;

  if (!nodes.length) {
    return { width: 800, height: 360, lanes: [], nodes: [], edges: [] };
  }

  const degrees = computeNodeDegrees(nodes, edges);
  const maxDegree = Math.max(
    1,
    ...nodes.map((n) => degrees.get(n.id)?.total ?? 0),
  );

  // Deterministic ordering before initial placement
  const ordered = [...nodes].sort((a, b) => {
    if (strategy === 'force-health') {
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
  const angleOffset = (iterationSeed % 8) * (Math.PI / 16);

  const pos = new Map<string, { x: number; y: number; vx: number; vy: number; band: number; degree: number }>();

  if (strategy === 'force-degree') {
    // Concentric rings by connection degree (highest degree hubs near center)
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
        angle = angleOffset + ((idx - 1) / Math.min(5, nCount - 1)) * Math.PI * 2;
      } else {
        const outerIdx = idx - 6;
        const outerTotal = Math.max(1, nCount - 6);
        rx = minSepX * 2.15;
        ry = minSepY * 2.35;
        angle = angleOffset + (outerIdx / outerTotal) * Math.PI * 2 + 0.35;
      }
      pos.set(node.id, {
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        vx: 0,
        vy: 0,
        band: 0,
        degree: deg,
      });
    });
  } else {
    // Health-stratified rows: group present health ranks cleanly
    const activeRanks = [...new Set(ordered.map((n) => healthBandRank(n.status)))].sort(
      (a, b) => a - b,
    );
    const rankToRow = new Map(activeRanks.map((r, i) => [r, i]));
    const byRow = new Map<number, GraphNode[]>();
    for (const node of ordered) {
      const row = rankToRow.get(healthBandRank(node.status)) ?? 0;
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row)!.push(node);
    }

    let cursorY = 120;
    for (let row = 0; row < activeRanks.length; row += 1) {
      const group = byRow.get(row) || [];
      const maxPerRow = compact
        ? Math.max(2, Math.min(3, Math.ceil(Math.sqrt(group.length * 1.1))))
        : Math.max(3, Math.min(4, Math.ceil(Math.sqrt(group.length * 1.25))));
      group.forEach((node, i) => {
        const subRow = Math.floor(i / maxPerRow);
        const col = i % maxPerRow;
        const colsInThisSubRow = Math.min(maxPerRow, group.length - subRow * maxPerRow);
        const totalRowW = (colsInThisSubRow - 1) * minSepX;
        const x = 640 - totalRowW / 2 + col * minSepX + (iterationSeed % 2 === 1 ? 14 : 0);
        const y = cursorY + subRow * (minSepY + 18);
        pos.set(node.id, {
          x,
          y,
          vx: 0,
          vy: 0,
          band: y,
          degree: degrees.get(node.id)?.total ?? 0,
        });
      });
      const subRows = Math.max(1, Math.ceil(group.length / maxPerRow));
      cursorY += subRows * (minSepY + 18) + 64;
    }
  }

  // Force-directed relaxation + rectangular AABB collision resolution
  const iterations = 110;
  const springK = 0.045;
  const idealEdgeLen = strategy === 'force-degree' ? minSepX * 1.18 : minSepX * 1.05;
  const repulseStrength = 26000;
  const centerX = 640;
  const centerY = 360;

  for (let iter = 0; iter < iterations; iter += 1) {
    const cooling = Math.max(0.12, 1 - iter / iterations);

    // 1. Pairwise repulsion + AABB anti-overlap
    for (let i = 0; i < ordered.length; i += 1) {
      const a = pos.get(ordered[i].id)!;
      for (let j = i + 1; j < ordered.length; j += 1) {
        const b = pos.get(ordered[j].id)!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
          dx = (i % 2 === 0 ? 1 : -1) * 1.5;
          dy = (j % 2 === 0 ? 1 : -1) * 1.5;
        }
        const distSq = dx * dx + dy * dy + 25;
        const dist = Math.sqrt(distSq);
        const fRep = (repulseStrength / distSq) * cooling;
        const fx = (dx / dist) * fRep;
        const fy = (dy / dist) * fRep;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;

        // Soft rectangular collision push
        const overlapX = minSepX - Math.abs(dx);
        const overlapY = minSepY - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX / minSepX < overlapY / minSepY) {
            const push = (overlapX * 0.52) * (dx >= 0 ? 1 : -1);
            a.x -= push;
            b.x += push;
          } else {
            const push = (overlapY * 0.52) * (dy >= 0 ? 1 : -1);
            a.y -= push;
            b.y += push;
          }
        }
      }
    }

    // 2. Spring attraction along dependency edges
    for (const e of edges) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b || e.from === e.to) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const displacement = dist - idealEdgeLen;
      const force = springK * displacement * cooling;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // 3. Gravity (hub centrality for degree mode; vertical band anchor for health mode)
    for (const node of ordered) {
      const p = pos.get(node.id)!;
      if (strategy === 'force-degree') {
        const hubWeight = 0.015 + 0.055 * (p.degree / maxDegree);
        p.vx += (centerX - p.x) * hubWeight * cooling;
        p.vy += (centerY - p.y) * hubWeight * cooling;
      } else {
        p.vx += (centerX - p.x) * 0.024 * cooling;
        p.vy += (p.band - p.y) * 0.14 * cooling;
      }
      // Velocity damping & clamp
      p.vx = Math.max(-42, Math.min(42, p.vx * 0.65));
      p.vy = Math.max(-42, Math.min(42, p.vy * 0.65));
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  // Final deterministic hard AABB overlap sweep (guarantees 0 overlaps)
  for (let pass = 0; pass < 18; pass += 1) {
    let anyOverlap = false;
    for (let i = 0; i < ordered.length; i += 1) {
      const a = pos.get(ordered[i].id)!;
      for (let j = i + 1; j < ordered.length; j += 1) {
        const b = pos.get(ordered[j].id)!;
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

  // Normalize coordinates into positive bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + nodeW);
    maxY = Math.max(maxY, p.y + nodeH);
  }
  const pad = 44;
  const shiftX = pad - minX;
  const shiftY = pad - minY;
  const width = Math.max(820, Math.round(maxX - minX + pad * 2));
  const height = Math.max(420, Math.round(maxY - minY + pad * 2));

  const placedNodes: PlacedNode[] = ordered.map((node, idx) => {
    const p = pos.get(node.id)!;
    return {
      ...node,
      x: Math.round(p.x + shiftX),
      y: Math.round(p.y + shiftY),
      w: nodeW,
      h: nodeH,
      colIdx: idx,
    };
  });

  const nodePosById = new Map(placedNodes.map((n) => [n.id, n]));
  const placedEdges: PlacedEdge[] = [];
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
    placedEdges.push({ ...edge, d });
  }

  return { width, height, lanes: [], nodes: placedNodes, edges: placedEdges };
}

export function layoutGraphByMode(
  raw: { lanes: GraphLane[]; nodes: GraphNode[]; edges: GraphEdge[] },
  layoutMode: GraphLayoutMode,
  compact = false,
  seed = 0,
): GraphLayout {
  if (layoutMode === 'force-degree' || layoutMode === 'force-health') {
    return layoutForceGraph(raw, layoutMode, compact, seed);
  }
  return layoutGraph(raw, compact);
}


