import { httpProbe } from '../exec.mjs';

export async function collectSymbiote(cfg) {
  if (!cfg?.enabled) {
    return { id: 'symbiote', name: 'Symbiote', enabled: false, protocol: 'Official HTTP (/api/health)' };
  }

  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:4318').replace(/\/+$/, '');
  const probe = await httpProbe(`${baseUrl}/api/health`, { timeoutMs: 2000 });
  const d = probe.json?.data || null;
  const reachable = Boolean(probe.ok && d?.alive);
  const degraded = reachable && (Boolean(d.engine_degraded) || !d.db_ok || !d.worker_alive || !d.mirror_ok);

  return {
    id: 'symbiote',
    name: 'Symbiote',
    enabled: true,
    protocol: 'Official HTTP (/api/health)',
    apiUrl: baseUrl,
    reachable,
    status: !reachable ? 'offline' : degraded ? 'degraded' : 'healthy',
    latencyMs: probe.latencyMs,
    mode: d?.effective_mode || d?.mode || '',
    schemaVersion: d?.schema_version ?? null,
    dbOk: d?.db_ok ?? null,
    workerAlive: d?.worker_alive ?? null,
    mirrorOk: d?.mirror_ok ?? null,
    vaultFileCount: d?.vault_file_count ?? null,
    mirrorFileCount: d?.mirror_file_count ?? null,
    checkpointCount: d?.checkpoint_count ?? null,
    bootSource: d?.engine_boot_source || '',
    degradedReason: d?.engine_degraded_reason || null,
    uptimeMs: d?.uptime_ms ?? null,
    error: reachable ? null : (probe.error || 'Symbiote unreachable'),
  };
}
