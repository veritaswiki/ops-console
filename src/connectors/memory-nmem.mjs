import { httpProbe, runCmd } from '../exec.mjs';

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export async function collectNmem(cfg) {
  if (!cfg?.enabled) {
    return { id: 'nmem', name: 'Nowledge Mem', enabled: false, protocol: 'Official REST + nmem CLI (--json)' };
  }

  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:14242').replace(/\/+$/, '');
  const cliBin = cfg.cliBin || 'nmem';

  const [healthProbe, statusRes, statsRes, spacesRes, feedRes] = await Promise.all([
    httpProbe(`${baseUrl}/health`, { timeoutMs: 2000 }),
    runCmd(cliBin, ['--json', 'status'], { timeout: 4500 }).catch(() => null),
    runCmd(cliBin, ['--json', 'stats'], { timeout: 4500 }).catch(() => null),
    runCmd(cliBin, ['--json', 'spaces', 'list'], { timeout: 4500 }).catch(() => null),
    runCmd(cliBin, ['--json', 'feed', '--limit', '8'], { timeout: 4500 }).catch(() => null),
  ]);

  const status = statusRes ? safeJsonParse(statusRes.stdout) : null;
  const stats = statsRes ? safeJsonParse(statsRes.stdout) : null;
  const spacesRaw = spacesRes ? safeJsonParse(spacesRes.stdout) : null;
  const feedRaw = feedRes ? safeJsonParse(feedRes.stdout) : null;

  const spaces = Array.isArray(spacesRaw?.spaces)
    ? spacesRaw.spaces.map((sp) => ({
        id: sp.id,
        name: sp.name,
        kind: sp.kind || 'personal',
        memories: sp.usage?.memories ?? 0,
        archived: sp.usage?.archivedMemories ?? 0,
        threads: sp.usage?.threads ?? 0,
        sources: sp.usage?.sources ?? 0,
        crystals: sp.usage?.crystalCount ?? 0,
        hasWorkingMemory: Boolean(sp.usage?.hasWorkingMemory),
      }))
    : [];

  const feed = Array.isArray(feedRaw?.events)
    ? feedRaw.events.slice(0, 8).map((ev) => ({
        id: ev.id,
        type: ev.event_type || 'event',
        severity: ev.severity || 'info',
        title: ev.title || '',
        description: String(ev.description || '').slice(0, 180),
        createdAt: ev.created_at || ev.timestamp || '',
      }))
    : [];

  const reachable = Boolean(healthProbe.ok || status?.status === 'ok');
  const degraded = reachable && (
    status?.graph_store?.status !== 'healthy'
    || Boolean(status?.embedding?.degraded)
    || status?.database === false
  );

  return {
    id: 'nmem',
    name: 'Nowledge Mem',
    enabled: true,
    protocol: 'Official REST (/health) + nmem --json CLI',
    apiUrl: baseUrl,
    reachable,
    status: !reachable ? 'offline' : degraded ? 'degraded' : 'healthy',
    latencyMs: healthProbe.latencyMs,
    version: status?.server_version || status?.version || '',
    mode: status?.mode || '',
    database: status?.database ?? null,
    graphStore: status?.graph_store || null,
    embedding: status?.embedding
      ? {
          mode: status.embedding.mode,
          degraded: Boolean(status.embedding.degraded),
          state: status.embedding.process_runtime?.state || '',
          model: status.embedding.process_runtime?.model_identity || '',
        }
      : null,
    pendingReviews: Boolean(status?.attention?.has_pending_reviews),
    stats: stats
      ? {
          memories: stats.memories ?? 0,
          activeMemories: stats.memory_breakdown?.active ?? stats.memories ?? 0,
          archivedMemories: stats.memory_breakdown?.archived ?? 0,
          storedMemories: stats.memory_breakdown?.stored ?? stats.memories ?? 0,
          threads: stats.threads ?? 0,
          entities: stats.entities ?? 0,
          labels: stats.labels ?? 0,
          communities: stats.communities ?? 0,
        }
      : null,
    spaces,
    feed,
    error: reachable ? null : (healthProbe.error || 'Nowledge Mem unreachable'),
  };
}

export async function searchNmem(cfg, query, limit = 10) {
  if (!cfg?.enabled) return { ok: false, provider: 'nmem', error: 'Nowledge Mem connector disabled', items: [] };
  const q = String(query || '').trim();
  if (!q) return { ok: true, provider: 'nmem', items: [] };
  const cliBin = cfg.cliBin || 'nmem';
  const n = Math.min(30, Math.max(1, Number(limit) || 10));
  try {
    const { stdout } = await runCmd(cliBin, ['--json', 'm', 'search', q, '--limit', String(n)], { timeout: 8000 });
    const data = safeJsonParse(stdout);
    const list = Array.isArray(data?.memories) ? data.memories : [];
    return {
      ok: true,
      provider: 'nmem',
      total: data?.total ?? list.length,
      mode: data?.search_mode || 'official',
      items: list.map((m) => ({
        id: m.id,
        provider: 'nmem',
        title: m.title || '(untitled)',
        snippet: String(m.content || '').slice(0, 260),
        score: m.score ?? null,
        unitType: m.unit_type || 'memory',
        labels: Array.isArray(m.labels) ? m.labels.slice(0, 5) : [],
        source: m.source || '',
        createdAt: m.created_at || '',
      })),
    };
  } catch (err) {
    return { ok: false, provider: 'nmem', error: (err.stderr || err.message || 'Search failed').trim().slice(0, 200), items: [] };
  }
}

export async function doctorNmem(cfg) {
  if (!cfg?.enabled) return { ok: false, provider: 'nmem', error: 'Nowledge Mem connector disabled' };
  const cliBin = cfg.cliBin || 'nmem';
  try {
    const { stdout } = await runCmd(cliBin, ['--json', 'doctor'], { timeout: 8000 });
    return { ok: true, provider: 'nmem', data: safeJsonParse(stdout) || { raw: stdout.trim().slice(0, 1200) } };
  } catch (err) {
    return { ok: false, provider: 'nmem', error: (err.stderr || err.stdout || err.message).trim().slice(0, 400) };
  }
}
