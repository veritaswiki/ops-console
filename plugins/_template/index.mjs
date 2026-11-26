import { httpProbe } from '../../src/exec.mjs';
import { definePlugin } from '../../src/plugins/sdk.mjs';

/**
 * Starter template for custom Ops Console plugins.
 * Copy this directory to plugins/<your-plugin-id>/index.mjs (directories starting with "_" are ignored).
 */
export default definePlugin({
  id: 'example-service',
  name: 'Example Self-Hosted Service',
  version: '1.0.0',
  category: 'custom',
  description: 'Template plugin probing a standard HTTP /health endpoint.',
  officialSpec: {
    protocol: 'HTTP GET /health',
    docsUrl: 'https://datatracker.ietf.org/doc/html/rfc9110',
    endpoints: ['GET /health'],
    auth: 'Optional Bearer token via env://EXAMPLE_SERVICE_TOKEN',
  },
  capabilities: ['health'],
  configSchema: [
    { key: 'apiUrl', label: 'Service URL', type: 'url', default: 'http://127.0.0.1:8080' },
    { key: 'authToken', label: 'Bearer Token', type: 'secret', default: '', placeholder: 'env://EXAMPLE_SERVICE_TOKEN' },
  ],
  defaultConfig: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:8080',
    authToken: '',
  },
  async collect(cfg) {
    const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:8080').replace(/\/+$/, '');
    const headers = cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {};
    const probe = await httpProbe(`${baseUrl}/health`, { timeoutMs: 2500, headers });
    return {
      id: 'example-service',
      name: cfg.displayName || 'Example Self-Hosted Service',
      enabled: true,
      reachable: probe.ok,
      status: probe.ok ? 'healthy' : 'offline',
      latencyMs: probe.latencyMs,
      error: probe.ok ? null : (probe.error || 'Service unreachable'),
    };
  },
  summarize(data) {
    if (!data?.enabled) return 'Disabled';
    return data.reachable ? `HTTP OK · ${data.latencyMs ?? 0}ms` : (data.error || 'Offline');
  },
});
