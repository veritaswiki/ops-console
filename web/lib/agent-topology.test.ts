import test from 'node:test';
import assert from 'node:assert/strict';
import type { A2AAgentPeer, A2ARoutingRule, A2ASkillCatalogItem, FleetNode } from '../types';
import {
  buildClusterTopologyGraph,
  buildRoutingNodes,
  computeClusterConnectivityStats,
  computeResetPositions,
  resolveAgentSkillsWithVersions,
} from './agent-topology';

const SAMPLE_FLEET: FleetNode[] = [
  {
    id: 'workstation-mac',
    name: 'Developer Laptop (macOS)',
    deviceType: 'laptop',
    status: 'healthy',
    region: 'US-West',
    os: 'macOS 15.3',
    tailscaleIp: '100.64.0.45',
    rttMs: 2,
    cpu: { usagePct: 24 },
    memory: { usedPct: 58 },
  },
  {
    id: 'hub-primary',
    name: 'Primary Hub (SF)',
    deviceType: 'hub',
    status: 'healthy',
    region: 'US-West',
    os: 'Ubuntu 24.04',
    tailscaleIp: '100.64.0.10',
    rttMs: 8,
    cpu: { usagePct: 31 },
    memory: { usedPct: 62 },
  },
  {
    id: 'edge-tokyo',
    name: 'Edge Gateway (Tokyo)',
    deviceType: 'server',
    status: 'degraded',
    region: 'AP-Northeast',
    os: 'Debian 12',
    tailscaleIp: '100.64.0.21',
    rttMs: 44,
    cpu: { usagePct: 72 },
    memory: { usedPct: 81 },
  },
];

const SAMPLE_AGENTS: A2AAgentPeer[] = [
  {
    id: 'codex-lead',
    name: 'Codex CLI',
    harness: 'codex-cli',
    nodeId: 'workstation-mac',
    nodeName: 'Developer Laptop (macOS)',
    role: 'lead',
    delegatable: true,
    status: 'healthy',
    protocolVersion: '0.3',
    version: '0.29.0',
    latestVersion: '0.29.0',
    updateAvailable: false,
    latencyMs: 11,
    skills: [{ id: 'arch-plan', name: '主控任务拆解与路由' }],
    boundMcpIds: ['mcp-git'],
  },
  {
    id: 'pi-worker',
    name: 'Pi Coding Agent',
    harness: 'pi-agent',
    nodeId: 'workstation-mac',
    nodeName: 'Developer Laptop (macOS)',
    role: 'worker',
    delegatable: true,
    status: 'healthy',
    protocolVersion: '0.3',
    version: '0.18.2',
    latestVersion: '0.18.4',
    updateAvailable: true,
    latencyMs: 9,
    skills: [{ id: 'fast-edit', name: '轻量快速改码与脚本' }],
    boundMcpIds: [],
  },
  {
    id: 'dsh-reviewer',
    name: 'DSH 专家评审插件',
    harness: 'dsh-expert',
    pluginKind: 'dsh-review-plugin',
    nodeId: 'hub-primary',
    nodeName: 'Primary Hub (SF)',
    role: 'worker',
    delegatable: true,
    status: 'healthy',
    protocolVersion: '0.3',
    version: '2.1.0',
    latestVersion: '2.1.0',
    updateAvailable: false,
    latencyMs: 15,
    skills: [{ id: 'dsh-expert-review', name: '多视角专家会审' }],
    boundMcpIds: [],
  },
];

const SAMPLE_SKILLS: A2ASkillCatalogItem[] = [
  {
    id: 'skill-pi-agy',
    name: 'Pi-Agy 多模型热切换',
    version: '0.18.2',
    latestVersion: '0.18.4',
    provider: 'pi-skill',
    enabled: true,
    assignedAgentIds: ['pi-worker'],
  },
  {
    id: 'skill-dsh-gate',
    name: 'DSH 多专家评审团',
    version: '2.1.0',
    latestVersion: '2.1.0',
    provider: 'dsh-plugin',
    enabled: true,
    assignedAgentIds: ['codex-lead', 'dsh-reviewer'],
  },
];

const SAMPLE_RULES: A2ARoutingRule[] = [
  {
    id: 'rule-1',
    name: 'Codex -> Pi',
    sourceAgentId: 'codex-lead',
    targetAgentId: 'pi-worker',
    taskCategory: 'script',
    matchKeywords: ['pi', '脚本'],
    targetModel: 'claude-sonnet-4-6',
    reasoningEffort: 'low',
    priority: 10,
    enabled: true,
    requireDshReview: false,
  },
  {
    id: 'rule-2',
    name: 'Codex -> DSH',
    sourceAgentId: 'codex-lead',
    targetAgentId: 'dsh-reviewer',
    taskCategory: 'review',
    matchKeywords: ['review', 'dsh'],
    targetModel: 'claude-opus-4-6',
    reasoningEffort: 'xhigh',
    priority: 5,
    enabled: true,
    requireDshReview: true,
  },
];

test('resolveAgentSkillsWithVersions merges catalog versions and native skills without duplicates', () => {
  const piSkills = resolveAgentSkillsWithVersions(SAMPLE_AGENTS[1], SAMPLE_SKILLS);
  assert.equal(piSkills.length, 2);
  assert.equal(piSkills[0].name, 'Pi-Agy 多模型热切换');
  assert.equal(piSkills[0].version, '0.18.2');
  assert.equal(piSkills[0].updateAvailable, true);
  assert.equal(piSkills[1].name, '轻量快速改码与脚本');
  assert.equal(piSkills[1].provider, 'pi-agent-card');
});

test('computeClusterConnectivityStats accurately computes online agents, hosts, avg latency, and skills', () => {
  const stats = computeClusterConnectivityStats(SAMPLE_AGENTS, SAMPLE_FLEET, SAMPLE_RULES, SAMPLE_SKILLS);
  assert.equal(stats.totalAgents, 3);
  assert.equal(stats.onlineAgents, 3);
  assert.equal(stats.totalHosts, 3);
  assert.equal(stats.onlineHosts, 3);
  assert.equal(stats.activeLinks, 2);
  assert.equal(stats.outdatedAgents, 1);
  assert.equal(stats.avgLatencyMs, Math.round((11 + 9 + 15) / 3));
  assert.equal(stats.totalMountedSkills, 6);
});

test('buildClusterTopologyGraph creates host nodes, agent nodes with skills, host links, and A2A edges', () => {
  const graph = buildClusterTopologyGraph(
    SAMPLE_AGENTS,
    SAMPLE_FLEET,
    SAMPLE_RULES,
    SAMPLE_SKILLS,
    'codex-lead',
    'pi-worker',
    null,
    'lead-router',
  );

  const hostNodes = graph.nodes.filter((n) => n.type === 'clusterHostNode');
  const agentNodes = graph.nodes.filter((n) => n.type === 'agentNode');
  const hostLinks = graph.edges.filter((e) => e.id.startsWith('host-link:'));
  const a2aLinks = graph.edges.filter((e) => !e.id.startsWith('host-link:'));

  assert.equal(hostNodes.length, 3);
  assert.equal(agentNodes.length, 3);
  assert.equal(hostLinks.length, 3);
  assert.equal(a2aLinks.length, 2);

  const piNode = agentNodes.find((n) => n.id === 'pi-worker');
  assert.ok(piNode);
  assert.equal((piNode.data as { isSelected: boolean }).isSelected, true);
  assert.equal((piNode.data as { skills: unknown[] }).skills.length, 2);
});

test('buildRoutingNodes and computeResetPositions produce deterministic non-overlapping coordinates', () => {
  const nodes = buildRoutingNodes(SAMPLE_AGENTS, SAMPLE_FLEET, SAMPLE_RULES, SAMPLE_SKILLS, 'codex-lead', null);
  assert.equal(nodes.length, 3);
  assert.equal(nodes[0].position.x, 20);
  assert.equal(nodes[1].position.x, 415);
  assert.equal(nodes[2].position.x, 820);

  const reset = computeResetPositions(SAMPLE_AGENTS, 'codex-lead');
  assert.deepEqual(reset['codex-lead'], { x: 20, y: 260 });
  assert.deepEqual(reset['dsh-reviewer'], { x: 820, y: 260 });
});
