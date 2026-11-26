import { httpProbe } from '../../exec.mjs';
import { definePlugin } from '../sdk.mjs';

export async function collectAgentRuntime(cfg) {
  if (!cfg?.enabled) {
    return {
      id: 'agent-runtime',
      name: cfg?.displayName || 'Agent Runtime (A2A)',
      enabled: false,
      protocol: 'Official A2A Agent Card (/.well-known/agent.json) + HTTP /health',
    };
  }

  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:3773').replace(/\/+$/, '');
  const headers = cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {};
  const healthPath = String(cfg.healthPath || '/health').startsWith('/') ? cfg.healthPath : `/${cfg.healthPath || 'health'}`;

  const [cardProbe, healthProbe] = await Promise.all([
    httpProbe(`${baseUrl}/.well-known/agent.json`, { timeoutMs: 2500, headers }),
    httpProbe(`${baseUrl}${healthPath}`, { timeoutMs: 2500, headers }),
  ]);

  const card = cardProbe.ok && cardProbe.json && typeof cardProbe.json === 'object' ? cardProbe.json : null;
  const reachable = Boolean(card || healthProbe.ok);
  const skills = Array.isArray(card?.skills)
    ? card.skills.slice(0, 16).map((s) => ({
        id: String(s.id || s.name || ''),
        name: String(s.name || s.id || ''),
        description: String(s.description || '').slice(0, 140),
      }))
    : [];

  const steps = [
    {
      step: 'GET /.well-known/agent.json (A2A Agent Card)',
      ok: Boolean(card),
      status: cardProbe.status,
      latencyMs: cardProbe.latencyMs,
      detail: card ? `${card.name || 'Agent'} v${card.version || '1.0'} (${skills.length} skills)` : (cardProbe.error || 'No Agent Card'),
    },
    {
      step: `GET ${healthPath}`,
      ok: healthProbe.ok,
      status: healthProbe.status,
      latencyMs: healthProbe.latencyMs,
      detail: healthProbe.ok ? 'Health probe OK' : (healthProbe.error || 'Health probe failed'),
    },
  ];

  return {
    id: 'agent-runtime',
    name: cfg.displayName || card?.name || 'Agent Runtime (A2A)',
    enabled: true,
    protocol: card ? 'Official A2A Agent Card (/.well-known/agent.json)' : `HTTP Health (${healthPath})`,
    apiUrl: baseUrl,
    reachable,
    status: reachable ? 'healthy' : 'offline',
    latencyMs: card ? cardProbe.latencyMs : healthProbe.latencyMs,
    agentVersion: card?.version || '',
    capabilities: card?.capabilities || null,
    skillsCount: skills.length,
    skills,
    steps,
    error: reachable ? null : (cardProbe.error || healthProbe.error || 'Agent runtime unreachable'),
  };
}

export const agentRuntimePlugin = definePlugin({
  id: 'agent-runtime',
  name: 'AI Agent Runtime (A2A / Orchestrator)',
  version: '1.0.0',
  category: 'agent',
  slot: 'agent',
  description: '通过官方 Agent2Agent (A2A) Agent Card 规范 (/.well-known/agent.json) 与 HTTP 健康探针接入任意自托管 Agent 编排器（LangGraph、CrewAI、AutoGen、Claude/Codex Worker 等）。',
  officialSpec: {
    protocol: 'A2A Agent Card (/.well-known/agent.json) + HTTP /health',
    docsUrl: 'https://google.github.io/A2A/specification/',
    endpoints: ['GET /.well-known/agent.json', 'GET /health'],
    auth: '可选 Authorization: Bearer <token> (支持 env:// / file://)',
  },
  capabilities: ['health', 'inventory', 'skills'],
  configSchema: [
    { key: 'displayName', label: 'Agent 名称', type: 'string', default: 'Coding Agent Orchestrator', placeholder: '例如: LangGraph Worker' },
    { key: 'apiUrl', label: '服务根地址', type: 'url', default: 'http://127.0.0.1:3773', placeholder: 'http://127.0.0.1:3773' },
    { key: 'healthPath', label: '健康检查路径', type: 'string', default: '/health', placeholder: '/health' },
    { key: 'authToken', label: 'Bearer Token (可选)', type: 'secret', default: '', placeholder: 'env://AGENT_API_TOKEN' },
  ],
  defaultConfig: {
    enabled: false,
    displayName: 'Coding Agent Orchestrator',
    apiUrl: 'http://127.0.0.1:3773',
    healthPath: '/health',
    authToken: '',
  },
  agentMatchers: [
    { category: 'orchestrator', label: 'Orchestrator', pattern: 'agent-orchestrator|langgraph|autogen|crewai' },
    { category: 'agent-runtime', label: 'Agent Runtime', pattern: '(^|/)codex(\\s|$)|(^|/)claude(\\s|$)|aider|opencode|goose' },
  ],
  collect: (cfg) => collectAgentRuntime(cfg),
  testConnection: async (cfg) => collectAgentRuntime({ ...cfg, enabled: true }),
  summarize: (data) => {
    if (!data?.enabled) return '未启用';
    if (!data.reachable) return data.error || '不可达';
    return data.skillsCount > 0 ? `A2A 就绪 · ${data.skillsCount} Skills` : 'HTTP 健康检查通过';
  },
  demoSample: (cfg) => ({
    id: 'agent-runtime',
    name: cfg?.displayName || 'Coding Agent Orchestrator',
    enabled: true,
    protocol: 'Official A2A Agent Card (/.well-known/agent.json)',
    apiUrl: cfg?.apiUrl || 'http://127.0.0.1:3773',
    reachable: true,
    status: 'healthy',
    latencyMs: 7,
    agentVersion: '2.1.0',
    capabilities: { streaming: true, pushNotifications: false },
    skillsCount: 4,
    skills: [
      { id: 'code-review', name: 'Code Review', description: 'Automated PR diff audit and regression detection' },
      { id: 'incident-triage', name: 'Incident Triage', description: 'Correlate journald logs and recent metric spikes' },
      { id: 'test-runner', name: 'Test Runner', description: 'Run isolated test suites in ephemeral containers' },
    ],
    steps: [
      { step: 'GET /.well-known/agent.json (A2A Agent Card)', ok: true, status: 200, latencyMs: 4, detail: 'Coding Agent Orchestrator v2.1.0 (4 skills)' },
      { step: 'GET /health', ok: true, status: 200, latencyMs: 3, detail: 'Health probe OK' },
    ],
    error: null,
  }),
});
