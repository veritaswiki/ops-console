import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type {
  A2AAgentPeer,
  A2ARoutingRule,
  A2ASkillCatalogItem,
  FleetNode,
  OrchestrationMode,
} from '../types';

export type CanvasViewLens = 'routing' | 'cluster';

export interface ResolvedAgentSkill {
  id: string;
  name: string;
  version: string;
  latestVersion?: string;
  updateAvailable: boolean;
  provider: string;
  enabled: boolean;
  description?: string;
  catalogItemId?: string;
}

export interface HostTelemetrySummary {
  id: string;
  name: string;
  status: string;
  deviceType: string;
  region?: string;
  city?: string;
  os?: string;
  tailscaleIp?: string;
  rttMs: number | null;
  cpuPct: number | null;
  memPct: number | null;
  agentCount: number;
}

export interface AgentCanvasNodeData extends Record<string, unknown> {
  agent: A2AAgentPeer;
  isLead: boolean;
  isSelected: boolean;
  isDshExpert: boolean;
  inCount: number;
  outCount: number;
  skills: ResolvedAgentSkill[];
  hostTelemetry: HostTelemetrySummary | null;
  lens: CanvasViewLens;
}

export interface ClusterHostNodeData extends Record<string, unknown> {
  host: HostTelemetrySummary;
  isSelected: boolean;
  hostedAgentIds: string[];
  hostedAgentNames: string[];
  hasLead: boolean;
}

export interface ClusterConnectivityStats {
  totalAgents: number;
  onlineAgents: number;
  degradedAgents: number;
  offlineAgents: number;
  totalHosts: number;
  onlineHosts: number;
  activeLinks: number;
  totalLinks: number;
  avgLatencyMs: number | null;
  outdatedAgents: number;
  totalMountedSkills: number;
}

function compareSemver(a?: string, b?: string): number {
  const pa = String(a || '0.0.0')
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0.0.0')
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
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
export function resolveAgentSkillsWithVersions(
  agent: A2AAgentPeer,
  skillCatalog: A2ASkillCatalogItem[] = [],
): ResolvedAgentSkill[] {
  const result: ResolvedAgentSkill[] = [];
  const seenKeys = new Set<string>();

  // 1. Assigned catalog skills carry explicit version, provider, and enabled state
  for (const item of skillCatalog) {
    if (!Array.isArray(item.assignedAgentIds) || !item.assignedAgentIds.includes(agent.id)) {
      continue;
    }
    const key = item.name.trim().toLowerCase();
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    seenKeys.add(item.id.trim().toLowerCase());
    result.push({
      id: item.id,
      name: item.name,
      version: item.version || '1.0.0',
      latestVersion: item.latestVersion || item.version || '1.0.0',
      updateAvailable: compareSemver(item.latestVersion, item.version) > 0,
      provider: item.provider || 'a2a-card',
      enabled: item.enabled !== false,
      description: item.description,
      catalogItemId: item.id,
    });
  }

  // 2. Native agent card skills not already represented in the catalog
  for (const nativeSkill of agent.skills || []) {
    const nameKey = String(nativeSkill.name || '').trim().toLowerCase();
    const idKey = String(nativeSkill.id || '').trim().toLowerCase();
    if ((!nameKey && !idKey) || seenKeys.has(nameKey) || seenKeys.has(idKey)) {
      continue;
    }
    if (nameKey) seenKeys.add(nameKey);
    if (idKey) seenKeys.add(idKey);
    result.push({
      id: nativeSkill.id || nativeSkill.name,
      name: nativeSkill.name || nativeSkill.id,
      version: agent.version || '1.0.0',
      latestVersion: agent.latestVersion || agent.version || '1.0.0',
      updateAvailable: false,
      provider: agent.pluginKind === 'dsh-review-plugin' ? 'dsh-plugin' : `${agent.harness}-card`,
      enabled: true,
      description: nativeSkill.description,
    });
  }

  return result;
}

export function buildHostTelemetryMap(
  fleetNodes: FleetNode[] = [],
  agents: A2AAgentPeer[] = [],
): Map<string, HostTelemetrySummary> {
  const map = new Map<string, HostTelemetrySummary>();

  for (const node of fleetNodes) {
    const agentCount = agents.filter((a) => a.nodeId === node.id).length;
    map.set(node.id, {
      id: node.id,
      name: node.name || node.id,
      status: node.status || 'healthy',
      deviceType: node.deviceType || 'server',
      region: node.region,
      city: node.city,
      os: node.os,
      tailscaleIp: node.tailscaleIp,
      rttMs: typeof node.rttMs === 'number' && Number.isFinite(node.rttMs) ? node.rttMs : null,
      cpuPct:
        typeof node.cpu?.usagePct === 'number' && Number.isFinite(node.cpu.usagePct)
          ? Math.round(node.cpu.usagePct)
          : null,
      memPct:
        typeof node.memory?.usedPct === 'number' && Number.isFinite(node.memory.usedPct)
          ? Math.round(node.memory.usedPct)
          : null,
      agentCount,
    });
  }

  // Synthesize host summaries for agents whose nodeId is not in fleetNodes
  for (const agent of agents) {
    if (!agent.nodeId || map.has(agent.nodeId)) continue;
    const hosted = agents.filter((a) => a.nodeId === agent.nodeId);
    map.set(agent.nodeId, {
      id: agent.nodeId,
      name: agent.nodeName || agent.nodeId,
      status: agent.status || 'healthy',
      deviceType: agent.nodeId.includes('mac') || agent.nodeId.includes('laptop') ? 'laptop' : 'server',
      rttMs: typeof agent.latencyMs === 'number' ? agent.latencyMs : null,
      cpuPct: null,
      memPct: null,
      agentCount: hosted.length,
    });
  }

  return map;
}

export function computeClusterConnectivityStats(
  agents: A2AAgentPeer[],
  fleetNodes: FleetNode[],
  rules: A2ARoutingRule[],
  skillCatalog: A2ASkillCatalogItem[] = [],
): ClusterConnectivityStats {
  let onlineAgents = 0;
  let degradedAgents = 0;
  let offlineAgents = 0;
  let outdatedAgents = 0;
  let latencySum = 0;
  let latencyCount = 0;
  let totalMountedSkills = 0;

  for (const agent of agents) {
    const st = String(agent.status || '').toLowerCase();
    if (st === 'healthy' || st === 'online' || st === 'ok' || st === 'active') {
      onlineAgents += 1;
    } else if (st === 'degraded' || st === 'warn' || st === 'warning' || st === 'standby') {
      degradedAgents += 1;
    } else {
      offlineAgents += 1;
    }
    if (agent.updateAvailable) outdatedAgents += 1;
    if (typeof agent.latencyMs === 'number' && Number.isFinite(agent.latencyMs) && agent.latencyMs >= 0) {
      latencySum += agent.latencyMs;
      latencyCount += 1;
    }
    totalMountedSkills += resolveAgentSkillsWithVersions(agent, skillCatalog).filter((s) => s.enabled).length;
  }

  const hostMap = buildHostTelemetryMap(fleetNodes, agents);
  const hosts = Array.from(hostMap.values()).filter((h) => h.agentCount > 0 || fleetNodes.some((f) => f.id === h.id));
  const onlineHosts = hosts.filter((h) => {
    const st = String(h.status || '').toLowerCase();
    return st !== 'offline' && st !== 'failed' && st !== 'down' && st !== 'error';
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
    totalMountedSkills,
  };
}

export function buildRoutingNodes(
  agents: A2AAgentPeer[],
  fleetNodes: FleetNode[],
  rules: A2ARoutingRule[],
  skillCatalog: A2ASkillCatalogItem[],
  leadAgentId: string | null,
  selectedNodeId: string | null,
): Node<AgentCanvasNodeData>[] {
  const hostMap = buildHostTelemetryMap(fleetNodes, agents);
  let workerIdx = 0;

  return agents.map((agent) => {
    const isLead = agent.id === leadAgentId;
    const isDshExpert = agent.harness === 'dsh-expert' || agent.pluginKind === 'dsh-review-plugin';
    const inCount = rules.filter((r) => r.targetAgentId === agent.id && r.enabled).length;
    const outCount = rules.filter((r) => r.sourceAgentId === agent.id && r.enabled).length;

    let defaultPos: { x: number; y: number };
    if (isLead) {
      defaultPos = { x: 20, y: 260 };
    } else if (isDshExpert) {
      defaultPos = { x: 820, y: 260 };
    } else {
      defaultPos = { x: 415, y: 12 + workerIdx * 172 };
      workerIdx += 1;
    }

    return {
      id: agent.id,
      type: 'agentNode',
      position:
        agent.position && Number.isFinite(agent.position.x) && Number.isFinite(agent.position.y)
          ? { x: agent.position.x, y: agent.position.y }
          : defaultPos,
      data: {
        agent,
        isLead,
        isSelected: selectedNodeId === agent.id,
        isDshExpert,
        inCount,
        outCount,
        skills: resolveAgentSkillsWithVersions(agent, skillCatalog),
        hostTelemetry: hostMap.get(agent.nodeId) || null,
        lens: 'routing',
      },
    };
  });
}

export function buildRoutingEdges(
  rules: A2ARoutingRule[],
  selectedRuleId: string | null,
  mode: OrchestrationMode,
): Edge[] {
  return rules.map((rule) => {
    const isSelected = selectedRuleId === rule.id;
    const shortKeywords = rule.matchKeywords.slice(0, 2).join('/');
    const effortTag =
      rule.reasoningEffort === 'xhigh'
        ? '极高'
        : rule.reasoningEffort === 'high'
          ? '高'
          : rule.reasoningEffort === 'low'
            ? '低'
            : '中';
    const label = `${shortKeywords || rule.taskCategory} · ${effortTag}${rule.requireDshReview ? ' · DSH' : ''}`;
    const stroke = !rule.enabled
      ? 'var(--ink-subtle)'
      : isSelected
        ? 'var(--accent)'
        : rule.requireDshReview
          ? 'var(--ok-dot)'
          : mode === 'swarm'
            ? 'var(--accent)'
            : 'var(--graph-edge)';

    return {
      id: rule.id,
      source: rule.sourceAgentId,
      target: rule.targetAgentId,
      sourceHandle: 'out',
      targetHandle: 'in',
      animated: rule.enabled,
      label,
      labelStyle: {
        fill: isSelected ? 'var(--accent)' : 'var(--ink)',
        fontSize: 11,
        fontFamily: '"JetBrains Mono Variable", monospace',
        fontWeight: isSelected ? 600 : 500,
      },
      labelBgStyle: {
        fill: 'var(--surface-elevated)',
        fillOpacity: 0.94,
        stroke: isSelected ? 'var(--accent)' : 'var(--border)',
        strokeWidth: 1,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
      style: {
        stroke,
        strokeWidth: isSelected ? 2.4 : rule.enabled ? 1.75 : 1.2,
        strokeDasharray: rule.enabled ? undefined : '5 4',
        opacity: rule.enabled ? 1 : 0.45,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: stroke,
      },
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
export function buildClusterTopologyGraph(
  agents: A2AAgentPeer[],
  fleetNodes: FleetNode[],
  rules: A2ARoutingRule[],
  skillCatalog: A2ASkillCatalogItem[],
  leadAgentId: string | null,
  selectedNodeId: string | null,
  selectedRuleId: string | null,
  mode: OrchestrationMode,
  customHostPositions: Record<string, { x: number; y: number }> = {},
): { nodes: Node[]; edges: Edge[] } {
  const hostMap = buildHostTelemetryMap(fleetNodes, agents);
  const relevantHosts = Array.from(hostMap.values()).filter(
    (h) => h.agentCount > 0 || h.deviceType === 'hub' || h.deviceType === 'server',
  );

  // Sort hosts so lead's host and hub appear near the top
  const leadAgent = agents.find((a) => a.id === leadAgentId) || null;
  relevantHosts.sort((a, b) => {
    const aLead = leadAgent && a.id === leadAgent.nodeId ? 1 : 0;
    const bLead = leadAgent && b.id === leadAgent.nodeId ? 1 : 0;
    if (aLead !== bLead) return bLead - aLead;
    return b.agentCount - a.agentCount;
  });

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Place Host Cluster Nodes on Column 1 (x = 16)
  const hostYStep = 166;
  relevantHosts.forEach((host, idx) => {
    const hostNodeId = `host:${host.id}`;
    const hostedAgents = agents.filter((a) => a.nodeId === host.id);
    const savedPos = customHostPositions[hostNodeId];
    nodes.push({
      id: hostNodeId,
      type: 'clusterHostNode',
      position: savedPos ? { x: savedPos.x, y: savedPos.y } : { x: 16, y: 16 + idx * hostYStep },
      data: {
        host,
        isSelected: selectedNodeId === hostNodeId,
        hostedAgentIds: hostedAgents.map((a) => a.id),
        hostedAgentNames: hostedAgents.map((a) => a.name),
        hasLead: hostedAgents.some((a) => a.id === leadAgentId),
      } satisfies ClusterHostNodeData,
    });
  });

  // 2. Clean 4-column left-to-right cluster DAG:
  //    Col 1 (x=16): Fleet Host Nodes
  //    Col 2 (x=355): Lead Agent (Master Harness)
  //    Col 3 (x=745): Worker Sub-Agents (spaced at 172px pitch so cards & edge labels never collide)
  //    Col 4 (x=1145): DSH Expert Reviewer / Gateways
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

  const workerCount = orderedAgents.filter(
    (a) => a.id !== leadAgentId && a.harness !== 'dsh-expert' && a.pluginKind !== 'dsh-review-plugin',
  ).length;
  const centerY = Math.max(180, Math.round(((Math.max(1, workerCount) - 1) * 172) / 2));

  for (const agent of orderedAgents) {
    const isLead = agent.id === leadAgentId;
    const isDshExpert = agent.harness === 'dsh-expert' || agent.pluginKind === 'dsh-review-plugin';
    const inCount = rules.filter((r) => r.targetAgentId === agent.id && r.enabled).length;
    const outCount = rules.filter((r) => r.sourceAgentId === agent.id && r.enabled).length;
    const host = hostMap.get(agent.nodeId) || null;

    let pos: { x: number; y: number };
    if (customHostPositions[agent.id]) {
      pos = customHostPositions[agent.id];
    } else if (isLead) {
      pos = { x: 355, y: centerY };
    } else if (isDshExpert) {
      pos = { x: 1145, y: centerY + rightRow * 172 };
      rightRow += 1;
    } else {
      pos = { x: 745, y: 12 + workerRow * 172 };
      workerRow += 1;
    }

    nodes.push({
      id: agent.id,
      type: 'agentNode',
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
        lens: 'cluster',
      } satisfies AgentCanvasNodeData,
    });

    // Connect Host Node -> Agent Node (represents physical/Tailscale hosting link)
    const hostNodeId = `host:${agent.nodeId}`;
    if (relevantHosts.some((h) => h.id === agent.nodeId)) {
      const hostOffline = String(host?.status || '').toLowerCase() === 'offline';
      const agentOffline = String(agent.status || '').toLowerCase() === 'offline';
      const linkColor = hostOffline || agentOffline ? 'var(--err-dot)' : 'var(--border)';
      const rttLabel =
        typeof agent.latencyMs === 'number'
          ? `${agent.latencyMs}ms`
          : typeof host?.rttMs === 'number'
            ? `${host.rttMs}ms`
            : 'local';

      edges.push({
        id: `host-link:${agent.nodeId}->${agent.id}`,
        source: hostNodeId,
        target: agent.id,
        sourceHandle: 'host-out',
        targetHandle: 'in',
        animated: false,
        selectable: false,
        label: rttLabel,
        labelStyle: {
          fill: 'var(--ink-subtle)',
          fontSize: 10,
          fontFamily: '"JetBrains Mono Variable", monospace',
        },
        labelBgStyle: {
          fill: 'var(--surface-elevated)',
          fillOpacity: 0.88,
          stroke: 'var(--border-subtle)',
          strokeWidth: 1,
        },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        style: {
          stroke: linkColor,
          strokeWidth: 1.35,
          strokeDasharray: '4 3',
          opacity: 0.8,
        },
      });
    }
  }

  // 3. Overlay A2A Collaboration / Routing edges between Agents
  const routingEdges = buildRoutingEdges(rules, selectedRuleId, mode);
  edges.push(...routingEdges);

  return { nodes, edges };
}

export function computeResetPositions(
  agents: A2AAgentPeer[],
  leadAgentId: string | null,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  let workerRow = 0;
  for (const a of agents) {
    if (a.id === leadAgentId) {
      positions[a.id] = { x: 20, y: 260 };
    } else if (a.harness === 'dsh-expert' || a.pluginKind === 'dsh-review-plugin') {
      positions[a.id] = { x: 820, y: 260 };
    } else {
      positions[a.id] = { x: 415, y: 12 + workerRow * 172 };
      workerRow += 1;
    }
  }
  return positions;
}
