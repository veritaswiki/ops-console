import { httpProbe } from '../exec.mjs';

export async function collectSyncthing(cfg) {
  if (!cfg?.enabled) {
    return { id: 'syncthing', name: 'Syncthing', enabled: false, protocol: 'Official REST (/rest/noauth/health)' };
  }

  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:8384').replace(/\/+$/, '');
  const healthProbe = await httpProbe(`${baseUrl}/rest/noauth/health`, { timeoutMs: 2000 });
  let systemStatus = null;
  if (cfg.apiKey && healthProbe.ok) {
    const sysProbe = await httpProbe(`${baseUrl}/rest/system/status`, {
      timeoutMs: 2000,
      headers: { 'X-API-Key': cfg.apiKey },
    });
    if (sysProbe.ok && sysProbe.json) systemStatus = sysProbe.json;
  }

  const reachable = Boolean(healthProbe.ok && healthProbe.json?.status === 'OK');
  return {
    id: 'syncthing',
    name: 'Syncthing',
    enabled: true,
    protocol: cfg.apiKey ? 'Official REST (/rest/noauth/health + /rest/system/status)' : 'Official REST (/rest/noauth/health)',
    apiUrl: baseUrl,
    reachable,
    status: reachable ? 'healthy' : 'offline',
    latencyMs: healthProbe.latencyMs,
    uptime: systemStatus?.uptime ?? null,
    myId: systemStatus?.myID ? `${String(systemStatus.myID).slice(0, 11)}...` : null,
    error: reachable ? null : (healthProbe.error || 'Syncthing unreachable'),
  };
}
