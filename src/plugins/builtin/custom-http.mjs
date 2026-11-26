import { httpProbe } from '../../exec.mjs';
import { definePlugin } from '../sdk.mjs';

export async function collectCustomHttp(cfg) {
  if (!cfg?.enabled) {
    return {
      id: cfg?.id || 'custom-http',
      name: cfg?.displayName || 'Custom HTTP Service',
      enabled: false,
      protocol: 'HTTP/HTTPS Health Probe',
    };
  }

  const baseUrl = String(cfg.apiUrl || '').replace(/\/+$/, '');
  if (!baseUrl) {
    return {
      id: cfg.id || 'custom-http',
      name: cfg.displayName || 'Custom HTTP Service',
      enabled: true,
      protocol: 'HTTP/HTTPS Health Probe',
      reachable: false,
      status: 'offline',
      latencyMs: null,
      error: 'Missing apiUrl',
      steps: [],
    };
  }
  const healthPath = cfg.healthPath
    ? (String(cfg.healthPath).startsWith('/') ? String(cfg.healthPath) : `/${cfg.healthPath}`)
    : '';
  const targetUrl = `${baseUrl}${healthPath}`;
  const headers = cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {};

  const probe = await httpProbe(targetUrl, { timeoutMs: 2500, headers });
  const expectedStatus = Number(cfg.expectedStatus || 200);
  const statusMatch = probe.status === expectedStatus || (expectedStatus === 200 && probe.ok);

  return {
    id: cfg.id || 'custom-http',
    name: cfg.displayName || 'Custom HTTP Service',
    enabled: true,
    protocol: `HTTP GET (${healthPath || '/'})`,
    apiUrl: targetUrl,
    reachable: statusMatch,
    status: statusMatch ? 'healthy' : 'offline',
    httpStatus: probe.status,
    latencyMs: probe.latencyMs,
    steps: [
      {
        step: `GET ${targetUrl}`,
        ok: statusMatch,
        status: probe.status,
        latencyMs: probe.latencyMs,
        detail: statusMatch ? `HTTP ${probe.status} OK` : (probe.error || `Unexpected HTTP ${probe.status}`),
      },
    ],
    error: statusMatch ? null : (probe.error || `Expected HTTP ${expectedStatus}, got ${probe.status}`),
  };
}

export const customHttpPlugin = definePlugin({
  id: 'custom-http',
  name: '通用 HTTP 健康探针',
  version: '1.0.0',
  category: 'custom',
  slot: 'custom',
  description: '零代码接入任意提供 HTTP/HTTPS 状态接口的自托管服务（如 Prometheus、Grafana、Gitea、MinIO、Qdrant、Redis Exporter 等）。',
  officialSpec: {
    protocol: 'Standard HTTP/HTTPS GET Health Check',
    docsUrl: 'https://datatracker.ietf.org/doc/html/rfc9110',
    endpoints: ['GET <apiUrl><healthPath>'],
    auth: '可选 Authorization: Bearer <token> (支持 env:// / file://)',
  },
  capabilities: ['health'],
  configSchema: [
    { key: 'displayName', label: '服务名称', type: 'string', default: 'Self-Hosted Service', placeholder: '例如: Qdrant Vector DB' },
    { key: 'apiUrl', label: '服务地址', type: 'url', default: 'http://127.0.0.1:6333', placeholder: 'http://127.0.0.1:6333' },
    { key: 'healthPath', label: '健康检查路径', type: 'string', default: '/healthz', placeholder: '/healthz' },
    { key: 'expectedStatus', label: '期望 HTTP 状态码', type: 'number', default: 200, min: 100, max: 599 },
    { key: 'authToken', label: 'Bearer Token (可选)', type: 'secret', default: '', placeholder: 'env://SERVICE_TOKEN' },
  ],
  defaultConfig: {
    enabled: false,
    displayName: 'Self-Hosted Service',
    apiUrl: 'http://127.0.0.1:6333',
    healthPath: '/healthz',
    expectedStatus: 200,
    authToken: '',
  },
  collect: (cfg) => collectCustomHttp(cfg),
  testConnection: async (cfg) => collectCustomHttp({ ...cfg, enabled: true }),
  summarize: (data) => {
    if (!data?.enabled) return '未启用';
    if (!data.reachable) return data.error || '不可达';
    return `HTTP ${data.httpStatus || 200} · ${data.latencyMs ?? 0}ms`;
  },
  demoSample: (cfg) => ({
    id: cfg?.id || 'custom-http',
    name: cfg?.displayName || 'Self-Hosted Service',
    enabled: true,
    protocol: `HTTP GET (${cfg?.healthPath || '/healthz'})`,
    apiUrl: `${cfg?.apiUrl || 'http://127.0.0.1:6333'}${cfg?.healthPath || '/healthz'}`,
    reachable: true,
    status: 'healthy',
    httpStatus: 200,
    latencyMs: 6,
    steps: [
      { step: `GET ${cfg?.apiUrl || 'http://127.0.0.1:6333'}${cfg?.healthPath || '/healthz'}`, ok: true, status: 200, latencyMs: 6, detail: 'HTTP 200 OK' },
    ],
    error: null,
  }),
});
