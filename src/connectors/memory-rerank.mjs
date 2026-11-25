import { httpProbe } from '../exec.mjs';

export async function collectRerank(cfg) {
  if (!cfg?.enabled) {
    return { id: 'rerank', name: 'Rerank Gateway', enabled: false, protocol: 'Official HTTP (/health)' };
  }

  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:8893').replace(/\/+$/, '');
  const probe = await httpProbe(`${baseUrl}/health`, { timeoutMs: 2000 });
  const j = probe.json || null;
  const reachable = Boolean(probe.ok && (j?.status === 'ok' || probe.status === 200));

  return {
    id: 'rerank',
    name: 'Rerank Gateway',
    enabled: true,
    protocol: 'Official HTTP (/health)',
    apiUrl: baseUrl,
    reachable,
    status: reachable ? 'healthy' : 'offline',
    latencyMs: probe.latencyMs,
    model: j?.model || '',
    maxTokens: j?.max_tokens ?? null,
    batch: j?.batch ?? null,
    maxBatchTokens: j?.max_batch_tokens ?? null,
    error: reachable ? null : (probe.error || 'Rerank gateway unreachable'),
  };
}
