import { httpProbe } from '../exec.mjs';

export async function collectMihomo(cfg) {
  if (!cfg?.enabled) {
    return { id: 'mihomo', name: 'Mihomo Proxy', enabled: false, protocol: 'Official Mihomo REST API' };
  }

  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:19090').replace(/\/+$/, '');
  const headers = cfg.secret ? { Authorization: `Bearer ${cfg.secret}` } : {};

  const [verProbe, connProbe, proxyProbe] = await Promise.all([
    httpProbe(`${baseUrl}/version`, { timeoutMs: 2000, headers }),
    httpProbe(`${baseUrl}/connections`, { timeoutMs: 2000, headers }),
    httpProbe(`${baseUrl}/proxies`, { timeoutMs: 2000, headers }),
  ]);

  const reachable = Boolean(verProbe.ok);
  const selectors = [];
  const proxiesObj = proxyProbe.json?.proxies || {};
  for (const [name, p] of Object.entries(proxiesObj)) {
    if (p && ['Selector', 'URLTest', 'Fallback', 'LoadBalance'].includes(p.type)) {
      selectors.push({
        name,
        type: p.type,
        now: p.now || '',
        candidates: Array.isArray(p.all) ? p.all.length : 0,
      });
    }
  }

  return {
    id: 'mihomo',
    name: 'Mihomo Proxy',
    enabled: true,
    protocol: 'Official REST (/version, /connections, /proxies)',
    apiUrl: baseUrl,
    reachable,
    status: reachable ? 'healthy' : 'offline',
    latencyMs: verProbe.latencyMs,
    version: verProbe.json?.version || '',
    meta: Boolean(verProbe.json?.meta),
    activeConnections: Array.isArray(connProbe.json?.connections) ? connProbe.json.connections.length : 0,
    downloadTotal: connProbe.json?.downloadTotal ?? 0,
    uploadTotal: connProbe.json?.uploadTotal ?? 0,
    selectors: selectors.slice(0, 12),
    error: reachable ? null : (verProbe.error || 'Mihomo controller unreachable'),
  };
}
