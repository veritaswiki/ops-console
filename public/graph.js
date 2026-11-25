// Zero-dependency interactive SVG architecture, memory, and agent relationship graph.
// Uses keyed SVG DOM diffing so periodic polls update in place without rebuilding nodes.

const SVG_NS = 'http://www.w3.org/2000/svg';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusTone(status) {
  const s = String(status || 'standby').toLowerCase();
  if (s === 'healthy' || s === 'active' || s === 'ok' || s === 'online') return 'ok';
  if (s === 'degraded' || s === 'warning' || s === 'activating' || s === 'reloading') return 'warn';
  if (s === 'failed' || s === 'error' || s === 'offline') return 'err';
  return 'muted';
}

function statusLabel(status) {
  const s = String(status || 'standby').toLowerCase();
  if (s === 'healthy' || s === 'active' || s === 'ok' || s === 'online') return '健康';
  if (s === 'degraded' || s === 'warning' || s === 'activating' || s === 'reloading') return '降级';
  if (s === 'standby' || s === 'inactive' || s === 'disabled') return '待机';
  return s === 'offline' ? '离线' : '异常';
}

function truncateText(text, maxUnits) {
  const str = String(text ?? '');
  let units = 0;
  let cutIdx = 0;
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    const w = code > 255 ? 1.65 : (code === 32 ? 0.55 : 0.95);
    if (units + w > maxUnits) {
      return `${str.slice(0, Math.max(1, cutIdx)).trimEnd()}…`;
    }
    units += w;
    if (units + 1.2 <= maxUnits) cutIdx = i + 1;
  }
  return str;
}

function compactPortLabel(ports, fallback = '') {
  const list = Array.isArray(ports) ? ports : [];
  if (!list.length) return fallback;
  const clean = String(list[0] || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  const m = clean.match(/:(\d+(?:\/\d+)?)$/);
  const first = m ? `:${m[1]}` : clean;
  return list.length > 1 ? `${first} +${list.length - 1}` : first;
}

function extractPorts(ports) {
  const out = [];
  for (const raw of ports || []) {
    const m = String(raw || '').match(/:(\d{2,5})(?:\/\d+)?/);
    if (m) out.push(m[1]);
  }
  return out;
}

function addEdgeUnique(edges, seen, edge) {
  if (!edge.from || !edge.to || edge.from === edge.to) return;
  const key = `${edge.from}->${edge.to}:${edge.kind || 'dep'}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ id: key, ...edge });
}

function serviceMetricText(svc, snap) {
  const id = String(svc.id || '').toLowerCase();
  const magpie = snap?.magpie || {};
  const mem = snap?.memory || {};
  const net = snap?.network || {};
  if ((id === 'magpie' || id === 'magpie-gateway') && magpie.reachable) {
    return `${magpie.totalModels || 0} 模型 · ${magpie.providers?.length || 0} 渠道`;
  }
  if (id.includes('nmem') && mem.nmem?.reachable) {
    return `${mem.nmem.stats?.memories ?? 0} 记忆 · ${mem.nmem.spaces?.length ?? 0} 空间`;
  }
  if (id.includes('openviking') && mem.openviking?.reachable) {
    return `向量 ${mem.openviking.vikingdb?.vectorCount ?? '-'} · 技能 ${mem.openviking.skillsCount ?? 0}`;
  }
  if (id.includes('symbiote') && mem.symbiote?.reachable) {
    return `Vault ${mem.symbiote.vaultFileCount ?? '-'} 文件`;
  }
  if (id.includes('rerank') && mem.rerank?.reachable) {
    return mem.rerank.model || 'Ready';
  }
  if (id.includes('tailscale') && net.tailscale?.reachable) {
    return `${net.tailscale.onlineCount}/${net.tailscale.devices?.length || 0} 设备在线`;
  }
  if (id.includes('mihomo') && net.mihomo?.reachable) {
    return `${net.mihomo.activeConnections ?? 0} 连接`;
  }
  if (id.includes('syncthing') && net.syncthing?.reachable) {
    return net.syncthing.latencyMs != null ? `延迟 ${net.syncthing.latencyMs}ms` : '同步正常';
  }
  if (svc.probe?.ok) {
    return `${compactPortLabel(svc.ports, svc.scope)} · ${svc.probe.latencyMs}ms`;
  }
  return compactPortLabel(svc.ports, svc.scope || 'service');
}

function mapServiceLane(svc) {
  const id = String(svc.id || '').toLowerCase();
  const layer = String(svc.layer || '').toLowerCase();
  if (id.includes('firewall') || id.includes('tunnel') || layer === 'network' || layer === 'infra' || id.includes('tailscale') || id.includes('mihomo') || id.includes('sync') || id.includes('postgres') || id.includes('redis')) {
    return 'network';
  }
  if (layer === 'memory' || id.includes('nmem') || id.includes('openviking') || id.includes('symbiote') || id.includes('rerank') || id.includes('embed')) {
    return 'memory';
  }
  if (id === 'magpie' || id.includes('gateway') || id.includes('bridge')) return 'gateway';
  return 'entry';
}

function buildFullGraph(snap, filter = 'all') {
  const services = snap?.services?.items || [];
  const mem = snap?.memory || {};
  const magpie = snap?.magpie || {};
  const agents = snap?.agents?.processes || [];
  const net = snap?.network || {};
  const fw = snap?.firewall || net.firewall || null;
  const fleet = snap?.fleet || null;

  const lanes = [
    { id: 'entry', title: '入口与 Agent', subtitle: '控制台 · 编排器 · 会话' },
    { id: 'gateway', title: '网关与路由', subtitle: '模型分发 · 渠道桥接' },
    { id: 'memory', title: '记忆与上下文', subtitle: '知识库 · 向量 · 重排' },
    { id: 'network', title: '网络与底座', subtitle: '组网 · 防火墙 · 节点' },
  ];

  const nodes = [];
  const nodeById = new Map();
  const svcNodeById = new Map();
  const svcByPort = new Map();

  const addNode = (node) => {
    if (nodeById.has(node.id)) return nodeById.get(node.id);
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
      detail: svc.role || `${svc.unit} (${svc.scope})`,
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

  const agentGroups = new Map();
  for (const proc of agents) {
    const key = proc.categoryLabel || proc.category || 'Agent';
    if (!agentGroups.has(key)) {
      agentGroups.set(key, { label: key, count: 0, cpu: 0, memBytes: 0, cmds: [] });
    }
    const grp = agentGroups.get(key);
    grp.count += 1;
    grp.cpu += Number(proc.cpu || 0);
    grp.memBytes += Number(proc.memoryBytes || 0);
    if (proc.cmd) grp.cmds.push(proc.cmd);
  }

  const agentNodeIds = [];
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
      meta: magpie.reachable ? `${magpie.totalModels || 0} 模型 · ${magpie.providers?.length || 0} 渠道` : (magpie.error || '离线'),
      detail: magpie.protocol || 'OpenAI /v1/models',
    });
  }
  if (magpie.reachable && Array.isArray(magpie.providers) && magpie.providers.length > 0) {
    const topProviders = magpie.providers.slice(0, 3);
    for (const prov of topProviders) {
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

  const ensureMemoryConnector = (key, title, eng, metric) => {
    if (!eng?.enabled) return null;
    const existing = [...nodeById.values()].find((n) => n.lane === 'memory' && n.id.toLowerCase().includes(key));
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
    mem.openviking?.reachable ? `向量 ${mem.openviking.vikingdb?.vectorCount ?? '-'} · 技能 ${mem.openviking.skillsCount ?? 0}` : '离线',
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
    mem.rerank?.reachable ? (mem.rerank.model || 'Ready') : '离线',
  );

  let firewallNode = null;
  if (fw?.enabled) {
    const fwSum = fw.summary || {};
    firewallNode = addNode({
      id: 'connector:firewall',
      lane: 'network',
      kind: 'firewall',
      label: '防火墙与监听端口',
      status: fwSum.publicUnfiltered > 0 ? 'degraded' : (fw.status || 'healthy'),
      meta: `${fwSum.totalListeners ?? 0} 监听 · 丢弃 ${fwSum.droppedPackets ?? 0}`,
      detail: fw.backend === 'iptables'
        ? `只读 iptables-save (${fw.totalRules ?? 0} 条规则)，公网直露 ${fwSum.publicUnfiltered ?? 0} 个`
        : '仅套接字监听视图 (未授权只读 iptables-save)',
    });
  }

  let fleetNode = null;
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

  const tailscaleNode = [...nodeById.values()].find((n) => n.id.toLowerCase().includes('tailscale'))
    || (net.tailscale?.enabled ? addNode({
      id: 'connector:tailscale',
      lane: 'network',
      kind: 'network',
      label: 'Tailscale Mesh',
      status: net.tailscale.status || 'standby',
      meta: net.tailscale.reachable ? `${net.tailscale.onlineCount}/${net.tailscale.devices?.length || 0} 设备在线` : '不可达',
      detail: net.tailscale.protocol || 'tailscale status --json',
    }) : null);

  const edges = [];
  const edgeSeen = new Set();

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
    visibleNodes = nodes.filter((n) => n.lane === 'memory' || n.kind === 'agent' || n.id === gatewayNode?.id);
  } else if (filter === 'agents') {
    visibleNodes = nodes.filter((n) => n.lane === 'entry' || n.lane === 'gateway' || n.id === nmemNode?.id || n.id === ovNode?.id);
  } else if (filter === 'network') {
    visibleNodes = nodes.filter((n) => n.lane === 'network' || n.id === gatewayNode?.id || n.id.includes('ops-console'));
  }

  const visibleSet = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter((e) => visibleSet.has(e.from) && visibleSet.has(e.to));
  const activeLanes = lanes.filter((l) => visibleNodes.some((n) => n.lane === l.id));

  return { lanes: activeLanes.length ? activeLanes : lanes, nodes: visibleNodes, edges: visibleEdges };
}

function buildMemoryMiniGraph(snap) {
  const mem = snap?.memory || {};
  const agents = snap?.agents?.processes || [];
  const lanes = [
    { id: 'consumers', title: '调用方与入口', subtitle: 'Agent · MCP · 检索' },
    { id: 'engines', title: '记忆与上下文引擎', subtitle: '官方 REST / CLI 接口' },
    { id: 'backing', title: '底层索引与存储', subtitle: '向量库 · 文档库 · 重排' },
  ];

  const nodes = [];
  const edges = [];
  const edgeSeen = new Set();
  const add = (n) => { nodes.push(n); return n; };

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
      meta: n.reachable ? `${n.stats?.memories ?? 0} 记忆 · ${n.latencyMs ?? 0}ms` : (n.error || '离线'),
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
      meta: ov.reachable ? `技能 ${ov.skillsCount ?? 0} · ${ov.latencyMs ?? 0}ms` : (ov.error || '离线'),
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
      meta: sym.reachable ? `模式 ${sym.mode || '-'} · ${sym.latencyMs ?? 0}ms` : (sym.error || '离线'),
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
      meta: rr.reachable ? (rr.model || 'Ready') : (rr.error || '离线'),
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

function buildAgentsMiniGraph(snap) {
  const agents = snap?.agents?.processes || [];
  const magpie = snap?.magpie || {};
  const mem = snap?.memory || {};

  const lanes = [
    { id: 'runtimes', title: '活跃 Agent 进程组', subtitle: '点击可按类别筛选' },
    { id: 'router', title: '网关与共享能力', subtitle: 'Magpie · MCP Hub · 记忆' },
    { id: 'providers', title: '模型供给渠道', subtitle: '实时目录统计' },
  ];

  const nodes = [];
  const edges = [];
  const edgeSeen = new Set();
  const add = (n) => { nodes.push(n); return n; };

  const groups = new Map();
  for (const proc of agents) {
    const key = proc.categoryLabel || proc.category || 'Agent';
    if (!groups.has(key)) groups.set(key, { label: key, count: 0, cpu: 0 });
    const g = groups.get(key);
    g.count += 1;
    g.cpu += Number(proc.cpu || 0);
  }

  const runtimeNodes = [];
  for (const grp of [...groups.values()].slice(0, 5)) {
    runtimeNodes.push(add({
      id: `ag-proc:${grp.label}`,
      lane: 'runtimes',
      kind: 'agent',
      label: grp.label,
      status: 'healthy',
      meta: `${grp.count} 进程 · CPU ${grp.cpu.toFixed(1)}%`,
      detail: `点击下钻筛选「${grp.label}」进程明细`,
      agentCategory: grp.label,
    }));
  }
  if (runtimeNodes.length === 0) {
    runtimeNodes.push(add({
      id: 'ag-proc:idle',
      lane: 'runtimes',
      kind: 'agent',
      label: '当前无活跃 Agent',
      status: 'standby',
      meta: '等待会话启动',
      detail: '按配置的进程匹配规则自动发现运行时',
    }));
  }

  const gwNode = add({
    id: 'ag-router:magpie',
    lane: 'router',
    kind: 'gateway',
    label: 'Magpie 模型网关',
    status: magpie.enabled ? (magpie.status || 'standby') : 'standby',
    meta: magpie.reachable ? `${magpie.totalModels || 0} 模型 · ${magpie.latencyMs ?? 0}ms` : (magpie.error || '离线'),
    detail: magpie.protocol || 'OpenAI /v1/models',
  });

  const activeBridges = Array.isArray(magpie.agents)
    ? magpie.agents.length
    : (Array.isArray(magpie.bridges) ? magpie.bridges.filter((b) => b.active).length : 0);
  const mcpCount = typeof magpie.library?.mcpCount === 'number'
    ? magpie.library.mcpCount
    : (Array.isArray(magpie.library?.mcps)
      ? magpie.library.mcps.length
      : (Array.isArray(magpie.library?.summaryLines)
        ? magpie.library.summaryLines.filter((l) => l.includes('→') && !/^\d+\s+lines|one server|in your agents/i.test(l)).length
        : 0));
  const bridgeNode = add({
    id: 'ag-router:hub',
    lane: 'router',
    kind: 'gateway',
    label: '桥接与共享 MCP',
    status: activeBridges > 0 || mcpCount > 0 ? 'healthy' : 'standby',
    meta: `${activeBridges} 桥接 · ${mcpCount} MCP`,
    detail: '通过 Magpie CLI 后台异步采集，不阻塞主快照',
  });

  const memOk = ['nmem', 'openviking', 'symbiote'].filter((k) => mem[k]?.reachable).length;
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

function layoutGraph({ lanes, nodes, edges }, compact = false) {
  const laneCount = Math.max(1, lanes.length);
  const width = compact ? 980 : 1160;
  const padX = 16;
  const colGap = compact ? 42 : 34;
  const laneW = Math.floor((width - padX * 2 - colGap * (laneCount - 1)) / laneCount);
  const nodePadX = 12;
  const nodeW = laneW - nodePadX * 2;
  const nodeH = compact ? 54 : 58;
  const nodeGapY = 10;
  const headerH = 54;
  const bottomPad = 14;

  const byLane = new Map(lanes.map((l) => [l.id, []]));
  for (const node of nodes) {
    const bucket = byLane.get(node.lane) || byLane.get(lanes[0].id);
    if (bucket) bucket.push(node);
  }

  let maxNodes = 1;
  for (const list of byLane.values()) {
    if (list.length > maxNodes) maxNodes = list.length;
  }
  const laneH = headerH + maxNodes * nodeH + Math.max(0, maxNodes - 1) * nodeGapY + bottomPad;
  const totalH = laneH + 20;

  const laneBoxes = [];
  const placedNodes = [];
  const nodePosById = new Map();

  lanes.forEach((lane, idx) => {
    const x = padX + idx * (laneW + colGap);
    const y = 10;
    const list = byLane.get(lane.id) || [];
    const okCount = list.filter((n) => statusTone(n.status) === 'ok').length;
    laneBoxes.push({
      ...lane,
      x,
      y,
      w: laneW,
      h: laneH,
      count: list.length,
      okCount,
    });
    list.forEach((node, rowIdx) => {
      const nx = x + nodePadX;
      const ny = y + headerH + rowIdx * (nodeH + nodeGapY);
      const placed = {
        ...node,
        x: nx,
        y: ny,
        w: nodeW,
        h: nodeH,
        colIdx: idx,
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

function createSvgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    const str = String(v);
    if (el.getAttribute(k) !== str) el.setAttribute(k, str);
  }
}

export function createArchitectureGraph(container, options = {}) {
  const {
    mode = 'full',
    inspectorEl = null,
    onOpenLogs = null,
    onSelectCategory = null,
  } = options;

  let lastSnap = null;
  let currentFilter = 'all';
  let selectedNodeId = '';
  let currentLayout = null;

  let svgEl = null;
  let lanesLayer = null;
  let edgesLayer = null;
  let nodesLayer = null;

  const laneDomMap = new Map();
  const edgeDomMap = new Map();
  const nodeDomMap = new Map();
  const markerSuffix = `${mode}-${Math.random().toString(36).slice(2, 7)}`;

  function ensureSvgMounted() {
    if (!container || svgEl) return;
    container.innerHTML = '';
    svgEl = createSvgEl('svg', {
      class: 'ag-svg',
      role: 'img',
      'aria-label': mode === 'memory'
        ? '记忆与上下文引擎关系图'
        : (mode === 'agents' ? 'Agent 与模型网关路由图' : '系统统一架构与服务依赖图'),
    });

    const defs = createSvgEl('defs');
    const mkDefault = createSvgEl('marker', {
      id: `ag-arrow-${markerSuffix}`,
      viewBox: '0 0 8 8',
      refX: '7',
      refY: '4',
      markerWidth: '6',
      markerHeight: '6',
      orient: 'auto-start-reverse',
    });
    mkDefault.appendChild(createSvgEl('path', { d: 'M0,1 L7,4 L0,7 Z', class: 'ag-arrow-head' }));

    const mkActive = createSvgEl('marker', {
      id: `ag-arrow-hi-${markerSuffix}`,
      viewBox: '0 0 8 8',
      refX: '7',
      refY: '4',
      markerWidth: '6.5',
      markerHeight: '6.5',
      orient: 'auto-start-reverse',
    });
    mkActive.appendChild(createSvgEl('path', { d: 'M0,1 L7,4 L0,7 Z', class: 'ag-arrow-head is-highlight' }));

    defs.appendChild(mkDefault);
    defs.appendChild(mkActive);
    svgEl.appendChild(defs);

    lanesLayer = createSvgEl('g', { class: 'ag-lanes-layer' });
    edgesLayer = createSvgEl('g', { class: 'ag-edges-layer' });
    nodesLayer = createSvgEl('g', { class: 'ag-nodes-layer' });
    svgEl.appendChild(lanesLayer);
    svgEl.appendChild(edgesLayer);
    svgEl.appendChild(nodesLayer);
    container.appendChild(svgEl);
  }

  function renderInspector() {
    if (!inspectorEl) return;
    if (!selectedNodeId || !currentLayout) {
      inspectorEl.hidden = true;
      inspectorEl.innerHTML = '';
      return;
    }
    const node = currentLayout.nodes.find((n) => n.id === selectedNodeId);
    if (!node) {
      inspectorEl.hidden = true;
      inspectorEl.innerHTML = '';
      return;
    }

    const nodeMap = new Map(currentLayout.nodes.map((n) => [n.id, n]));
    const incoming = currentLayout.edges
      .filter((e) => e.to === node.id)
      .map((e) => ({ edge: e, peer: nodeMap.get(e.from) }))
      .filter((x) => x.peer);
    const outgoing = currentLayout.edges
      .filter((e) => e.from === node.id)
      .map((e) => ({ edge: e, peer: nodeMap.get(e.to) }))
      .filter((x) => x.peer);

    const tone = statusTone(node.status);
    const dotCls = tone === 'ok' ? 'dot-ok' : (tone === 'warn' ? 'dot-warn' : (tone === 'err' ? 'dot-err' : 'dot-muted'));

    const chipList = (items, emptyText) => {
      if (!items.length) return `<span class="ag-insp-empty">${esc(emptyText)}</span>`;
      return items.map(({ edge, peer }) => (
        `<button type="button" class="ag-chip" data-ag-jump="${esc(peer.id)}">${esc(peer.label)}${edge.label ? ` <span class="mono">(${esc(edge.label)})</span>` : ''}</button>`
      )).join('');
    };

    inspectorEl.hidden = false;
    inspectorEl.innerHTML = `
      <div class="ag-inspector-head">
        <div class="ag-inspector-title-row">
          <strong>${esc(node.label)}</strong>
          <span class="status-cell status-${tone === 'ok' ? 'healthy' : (tone === 'warn' ? 'degraded' : (tone === 'err' ? 'failed' : 'standby'))}">
            <i class="dot ${dotCls}"></i>${esc(statusLabel(node.status))}
          </span>
          <span class="ag-insp-meta mono">${esc(node.meta || '-')}</span>
        </div>
        <div class="ag-inspector-actions">
          ${node.unit && typeof onOpenLogs === 'function' ? `<button type="button" class="btn-subtle" data-ag-logs="${esc(node.unit)}">查看日志</button>` : ''}
          ${node.agentCategory && typeof onSelectCategory === 'function' ? `<button type="button" class="btn-subtle" data-ag-cat="${esc(node.agentCategory)}">筛选进程</button>` : ''}
          <button type="button" class="btn-subtle" data-ag-clear="1">收起</button>
        </div>
      </div>
      <p class="ag-inspector-desc">${esc(node.detail || '')}</p>
      <div class="ag-inspector-links">
        <div class="ag-link-group">
          <span class="ag-link-label">上游调用方</span>
          <div class="ag-chip-row">${chipList(incoming, '无上游连线')}</div>
        </div>
        <div class="ag-link-group">
          <span class="ag-link-label">下游依赖目标</span>
          <div class="ag-chip-row">${chipList(outgoing, '无下游连线')}</div>
        </div>
      </div>
    `;
  }

  function syncSelectionClasses() {
    if (!currentLayout) return;
    const hasSel = Boolean(selectedNodeId) && currentLayout.nodes.some((n) => n.id === selectedNodeId);
    const activeNodeIds = new Set();
    const activeEdgeIds = new Set();

    if (hasSel) {
      activeNodeIds.add(selectedNodeId);
      for (const edge of currentLayout.edges) {
        if (edge.from === selectedNodeId || edge.to === selectedNodeId) {
          activeEdgeIds.add(edge.id);
          activeNodeIds.add(edge.from);
          activeNodeIds.add(edge.to);
        }
      }
    }

    for (const [id, entry] of nodeDomMap.entries()) {
      const isSelected = hasSel && id === selectedNodeId;
      const isConnected = hasSel && activeNodeIds.has(id);
      const isDimmed = hasSel && !isConnected;
      entry.group.classList.toggle('is-selected', isSelected);
      entry.group.classList.toggle('is-connected', isConnected && !isSelected);
      entry.group.classList.toggle('is-dimmed', isDimmed);
    }

    for (const [id, entry] of edgeDomMap.entries()) {
      const isHighlight = hasSel && activeEdgeIds.has(id);
      const isDimmed = hasSel && !isHighlight;
      entry.path.classList.toggle('is-highlight', isHighlight);
      entry.path.classList.toggle('is-dimmed', isDimmed);
      entry.path.setAttribute(
        'marker-end',
        isHighlight ? `url(#ag-arrow-hi-${markerSuffix})` : `url(#ag-arrow-${markerSuffix})`,
      );
    }

    renderInspector();
  }

  function render() {
    if (!container || !lastSnap) return;
    const compact = mode !== 'full';
    const graphData = mode === 'memory'
      ? buildMemoryMiniGraph(lastSnap)
      : (mode === 'agents' ? buildAgentsMiniGraph(lastSnap) : buildFullGraph(lastSnap, currentFilter));

    if (!graphData.nodes.length) {
      svgEl = null;
      laneDomMap.clear();
      edgeDomMap.clear();
      nodeDomMap.clear();
      container.innerHTML = '<div class="empty-state">当前视图暂无可绘制的关系节点。</div>';
      if (inspectorEl) inspectorEl.hidden = true;
      return;
    }

    ensureSvgMounted();
    const layout = layoutGraph(graphData, compact);
    currentLayout = layout;

    if (selectedNodeId && !layout.nodes.some((n) => n.id === selectedNodeId)) {
      selectedNodeId = '';
    }

    setAttrs(svgEl, { viewBox: `0 0 ${layout.width} ${layout.height}` });

    const nextLaneIds = new Set();
    for (const lane of layout.lanes) {
      nextLaneIds.add(lane.id);
      let entry = laneDomMap.get(lane.id);
      if (!entry) {
        const group = createSvgEl('g', { class: 'ag-lane', 'data-lane-id': lane.id });
        const rect = createSvgEl('rect', { rx: '10', class: 'ag-lane-bg' });
        const titleEl = createSvgEl('text', { class: 'ag-lane-title' });
        const subEl = createSvgEl('text', { class: 'ag-lane-sub' });
        const countEl = createSvgEl('text', { class: 'ag-lane-count', 'text-anchor': 'end' });
        group.appendChild(rect);
        group.appendChild(titleEl);
        group.appendChild(subEl);
        group.appendChild(countEl);
        lanesLayer.appendChild(group);
        entry = { group, rect, titleEl, subEl, countEl };
        laneDomMap.set(lane.id, entry);
      }
      setAttrs(entry.rect, { x: lane.x, y: lane.y, width: lane.w, height: lane.h });
      setAttrs(entry.titleEl, { x: lane.x + 14, y: lane.y + 24 });
      entry.titleEl.textContent = lane.title;
      setAttrs(entry.subEl, { x: lane.x + 14, y: lane.y + 42 });
      entry.subEl.textContent = lane.subtitle;
      setAttrs(entry.countEl, { x: lane.x + lane.w - 14, y: lane.y + 24 });
      entry.countEl.textContent = `${lane.okCount}/${lane.count}`;
    }
    for (const [id, entry] of laneDomMap.entries()) {
      if (!nextLaneIds.has(id)) {
        entry.group.remove();
        laneDomMap.delete(id);
      }
    }

    const nextEdgeIds = new Set();
    for (const edge of layout.edges) {
      nextEdgeIds.add(edge.id);
      let entry = edgeDomMap.get(edge.id);
      if (!entry) {
        const path = createSvgEl('path', {
          class: `ag-edge ag-edge-${edge.kind || 'dep'}`,
          'data-edge-id': edge.id,
          'marker-end': `url(#ag-arrow-${markerSuffix})`,
        });
        const titleEl = createSvgEl('title');
        path.appendChild(titleEl);
        edgesLayer.appendChild(path);
        entry = { path, titleEl };
        edgeDomMap.set(edge.id, entry);
      }
      setAttrs(entry.path, { d: edge.d });
      if (entry.titleEl.textContent !== (edge.label || '')) {
        entry.titleEl.textContent = edge.label || '';
      }
    }
    for (const [id, entry] of edgeDomMap.entries()) {
      if (!nextEdgeIds.has(id)) {
        entry.path.remove();
        edgeDomMap.delete(id);
      }
    }

    const nextNodeIds = new Set();
    for (const node of layout.nodes) {
      nextNodeIds.add(node.id);
      const tone = statusTone(node.status);
      let entry = nodeDomMap.get(node.id);
      if (!entry) {
        const group = createSvgEl('g', {
          class: `ag-node ag-tone-${tone}`,
          'data-graph-node-id': node.id,
          role: 'button',
          tabindex: '0',
        });
        const titleEl = createSvgEl('title');
        const rect = createSvgEl('rect', { rx: '8', class: 'ag-node-box' });
        const stripe = createSvgEl('rect', { rx: '2', class: 'ag-node-stripe' });
        const dot = createSvgEl('circle', { r: '4', class: 'ag-node-dot' });
        const labelEl = createSvgEl('text', { class: 'ag-node-title' });
        const metaEl = createSvgEl('text', { class: 'ag-node-meta' });
        group.appendChild(titleEl);
        group.appendChild(rect);
        group.appendChild(stripe);
        group.appendChild(dot);
        group.appendChild(labelEl);
        group.appendChild(metaEl);
        nodesLayer.appendChild(group);
        entry = { group, titleEl, rect, stripe, dot, labelEl, metaEl, tone };
        nodeDomMap.set(node.id, entry);
      }

      if (entry.tone !== tone) {
        entry.group.classList.remove(`ag-tone-${entry.tone}`);
        entry.group.classList.add(`ag-tone-${tone}`);
        entry.tone = tone;
      }
      setAttrs(entry.group, {
        transform: `translate(${node.x}, ${node.y})`,
        'aria-label': `${node.label} (${statusLabel(node.status)}) ${node.meta || ''}`,
      });
      entry.titleEl.textContent = `${node.label} · ${statusLabel(node.status)}${node.meta ? ` · ${node.meta}` : ''}`;
      setAttrs(entry.rect, { x: 0, y: 0, width: node.w, height: node.h });
      setAttrs(entry.stripe, { x: 0, y: 10, width: 3.5, height: node.h - 20 });
      setAttrs(entry.dot, { cx: node.w - 14, cy: 20 });
      setAttrs(entry.labelEl, { x: 13, y: 24 });
      entry.labelEl.textContent = truncateText(node.label, compact ? 28 : 22.5);
      setAttrs(entry.metaEl, { x: 13, y: 44 });
      entry.metaEl.textContent = truncateText(node.meta || node.detail || '-', compact ? 34 : 27);
    }
    for (const [id, entry] of nodeDomMap.entries()) {
      if (!nextNodeIds.has(id)) {
        entry.group.remove();
        nodeDomMap.delete(id);
      }
    }

    syncSelectionClasses();
  }

  function selectNode(nodeId) {
    selectedNodeId = selectedNodeId === nodeId ? '' : nodeId;
    syncSelectionClasses();
  }

  if (container) {
    container.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-graph-node-id]');
      if (el) {
        selectNode(el.dataset.graphNodeId);
      } else if (selectedNodeId) {
        selectedNodeId = '';
        syncSelectionClasses();
      }
    });
    container.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && selectedNodeId) {
        selectedNodeId = '';
        syncSelectionClasses();
        return;
      }
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const el = ev.target.closest('[data-graph-node-id]');
      if (el) {
        ev.preventDefault();
        selectNode(el.dataset.graphNodeId);
      }
    });
  }

  if (inspectorEl) {
    inspectorEl.addEventListener('click', (ev) => {
      const jump = ev.target.closest('[data-ag-jump]');
      if (jump) {
        selectedNodeId = jump.dataset.agJump;
        syncSelectionClasses();
        return;
      }
      const logBtn = ev.target.closest('[data-ag-logs]');
      if (logBtn && typeof onOpenLogs === 'function') {
        onOpenLogs(logBtn.dataset.agLogs);
        return;
      }
      const catBtn = ev.target.closest('[data-ag-cat]');
      if (catBtn && typeof onSelectCategory === 'function') {
        onSelectCategory(catBtn.dataset.agCat);
        return;
      }
      if (ev.target.closest('[data-ag-clear]')) {
        selectedNodeId = '';
        syncSelectionClasses();
      }
    });
  }

  return {
    setData(snap) {
      lastSnap = snap;
      render();
    },
    setFilter(nextFilter) {
      currentFilter = nextFilter || 'all';
      render();
    },
    clearSelection() {
      selectedNodeId = '';
      syncSelectionClasses();
    },
  };
}
