import { httpProbe } from '../../exec.mjs';
import { definePlugin } from '../sdk.mjs';

export async function collectOpenAiGateway(cfg) {
  if (!cfg?.enabled) {
    return {
      id: 'openai-gateway',
      name: cfg?.displayName || 'OpenAI-Compatible Gateway',
      enabled: false,
      protocol: 'Official OpenAI API (GET /v1/models)',
    };
  }

  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const modelsUrl = baseUrl.endsWith('/v1/models')
    ? baseUrl
    : baseUrl.endsWith('/v1')
      ? `${baseUrl}/models`
      : `${baseUrl}/v1/models`;
  const headers = cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {};

  const probe = await httpProbe(modelsUrl, { timeoutMs: 3000, headers });
  const rawModels = Array.isArray(probe.json?.data)
    ? probe.json.data
    : Array.isArray(probe.json?.models)
      ? probe.json.models
      : [];

  const providerCounts = new Map();
  for (const m of rawModels) {
    const id = String(m.id || m.name || '');
    const owner = String(m.owned_by || (id.includes('/') ? id.split('/')[0] : 'local'));
    providerCounts.set(owner, (providerCounts.get(owner) || 0) + 1);
  }
  const providers = [...providerCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const reachable = Boolean(probe.ok);
  return {
    id: 'openai-gateway',
    name: cfg.displayName || 'OpenAI-Compatible Gateway',
    enabled: true,
    protocol: 'Official OpenAI API (GET /v1/models)',
    apiUrl: baseUrl,
    reachable,
    status: reachable ? 'healthy' : 'offline',
    latencyMs: probe.latencyMs,
    totalModels: rawModels.length,
    providers,
    models: rawModels.slice(0, 20).map((m) => String(m.id || m.name || '')),
    steps: [
      {
        step: `GET ${modelsUrl}`,
        ok: reachable,
        status: probe.status,
        latencyMs: probe.latencyMs,
        detail: reachable ? `${rawModels.length} models discovered` : (probe.error || 'Unreachable'),
      },
    ],
    error: reachable ? null : (probe.error || 'OpenAI-compatible endpoint unreachable'),
  };
}

export const openaiGatewayPlugin = definePlugin({
  id: 'openai-gateway',
  name: 'OpenAI 兼容模型网关 (Ollama / vLLM / LiteLLM)',
  version: '1.0.0',
  category: 'gateway',
  slot: 'gateway',
  description: '遵循标准 OpenAI REST API (/v1/models) 协议，即插即用接入 Ollama、vLLM、LiteLLM、LM Studio、llama.cpp 或任意 OpenAI 兼容模型代理。',
  officialSpec: {
    protocol: 'OpenAI REST API (GET /v1/models)',
    docsUrl: 'https://platform.openai.com/docs/api-reference/models/list',
    endpoints: ['GET /v1/models'],
    auth: '可选 Authorization: Bearer <apiKey> (支持 env:// / file://)',
  },
  capabilities: ['health', 'inventory', 'models'],
  configSchema: [
    { key: 'displayName', label: '网关名称', type: 'string', default: 'Ollama / LiteLLM Gateway', placeholder: '例如: Local Ollama' },
    { key: 'apiUrl', label: '网关根地址', type: 'url', default: 'http://127.0.0.1:11434', placeholder: 'http://127.0.0.1:11434' },
    { key: 'apiKey', label: 'API Key (可选)', type: 'secret', default: '', placeholder: 'env://OPENAI_GATEWAY_KEY' },
  ],
  defaultConfig: {
    enabled: false,
    displayName: 'Ollama / LiteLLM Gateway',
    apiUrl: 'http://127.0.0.1:11434',
    apiKey: '',
  },
  agentMatchers: [
    { category: 'gateway', label: 'Model Gateway', pattern: 'litellm|ollama|vllm|llama-server' },
  ],
  collect: (cfg) => collectOpenAiGateway(cfg),
  testConnection: async (cfg) => collectOpenAiGateway({ ...cfg, enabled: true }),
  summarize: (data) => {
    if (!data?.enabled) return '未启用';
    if (!data.reachable) return data.error || '不可达';
    return `${data.totalModels ?? 0} 模型 · ${data.providers?.length ?? 0} 供应方`;
  },
  demoSample: (cfg) => ({
    id: 'openai-gateway',
    name: cfg?.displayName || 'Ollama / LiteLLM Gateway',
    enabled: true,
    protocol: 'Official OpenAI API (GET /v1/models)',
    apiUrl: cfg?.apiUrl || 'http://127.0.0.1:11434',
    reachable: true,
    status: 'healthy',
    latencyMs: 9,
    totalModels: 8,
    providers: [
      { name: 'local-ollama', count: 5 },
      { name: 'upstream-router', count: 3 },
    ],
    models: ['qwen3:32b', 'deepseek-r1:14b', 'nomic-embed-text'],
    steps: [
      { step: 'GET /v1/models', ok: true, status: 200, latencyMs: 9, detail: '8 models discovered' },
    ],
    error: null,
  }),
});
