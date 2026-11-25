import { httpProbe, runCmd } from '../exec.mjs';

export function parseOvJsonOutput(str) {
  const text = String(str || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const starts = [firstBrace, firstBracket].filter((i) => i >= 0);
    if (starts.length === 0) return null;
    const start = Math.min(...starts);
    try {
      return JSON.parse(text.slice(start));
    } catch {
      return null;
    }
  }
}

const safeJsonParse = parseOvJsonOutput;

export function parseOvQueueTable(statusText) {
  const rows = [];
  let total = null;
  for (const line of String(statusText || '').split('\n')) {
    if (!line.startsWith('|')) continue;
    const cols = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cols.length < 7 || cols[0] === 'Queue') continue;
    const row = {
      queue: cols[0],
      pending: Number(cols[1]) || 0,
      inProgress: Number(cols[2]) || 0,
      processed: Number(cols[3]) || 0,
      requeued: Number(cols[4]) || 0,
      errors: Number(cols[5]) || 0,
      total: Number(cols[6]) || 0,
    };
    if (row.queue === 'TOTAL') total = row;
    else rows.push(row);
  }
  return { rows, total };
}

export function parseOvVikingDb(statusText) {
  const info = {};
  for (const line of String(statusText || '').split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
    const val = line.slice(idx + 1).trim();
    info[key] = /^\d+$/.test(val) ? Number(val) : val;
  }
  return {
    account: info.account || '',
    backend: info.backend || '',
    collection: info.collection || '',
    dimension: info.dimension || null,
    vectorCount: info.vector_count ?? null,
  };
}

export function parseOvModels(statusText) {
  const models = [];
  let section = '';
  for (const line of String(statusText || '').split('\n')) {
    if (line.includes('VLM Models')) section = 'vlm';
    else if (line.includes('Embedding Models')) section = 'embedding';
    if (!line.startsWith('|')) continue;
    const cols = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cols.length < 6 || cols[0] === 'Model') continue;
    models.push({
      kind: section || 'model',
      model: cols[0],
      provider: cols[1],
      calls: Number(cols[2]) || 0,
      promptTokens: Number(cols[3]) || 0,
      completionTokens: Number(cols[4]) || 0,
      totalTokens: Number(cols[5]) || 0,
      lastUpdated: cols[6] || '',
    });
  }
  return models;
}

export function parseOvLocks(statusText) {
  const info = {};
  for (const line of String(statusText || '').split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
    info[key] = Number(line.slice(idx + 1).trim()) || 0;
  }
  return {
    active: info.active_locks ?? 0,
    waiting: info.waiting_locks ?? 0,
    staleRemoved: info.stale_locks_removed ?? 0,
    conflicts: info.conflicts ?? 0,
  };
}

export async function collectOpenViking(cfg) {
  if (!cfg?.enabled) {
    return { id: 'openviking', name: 'OpenViking', enabled: false, protocol: 'Official HTTP (/health,/ready) + ov -o json' };
  }

  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:1933').replace(/\/+$/, '');
  const cliBin = cfg.cliBin || 'ov';

  const [healthProbe, readyProbe, cliHealthRes, cliStatusRes, skillsRes] = await Promise.all([
    httpProbe(`${baseUrl}/health`, { timeoutMs: 2000 }),
    httpProbe(`${baseUrl}/ready`, { timeoutMs: 4500 }),
    runCmd(cliBin, ['-o', 'json', 'health'], { timeout: 4500 }).catch(() => null),
    runCmd(cliBin, ['-o', 'json', 'status'], { timeout: 5500 }).catch(() => null),
    runCmd(cliBin, ['-o', 'json', 'skills', 'list'], { timeout: 5000 }).catch(() => null),
  ]);

  const cliHealth = cliHealthRes ? safeJsonParse(cliHealthRes.stdout) : null;
  const cliStatus = cliStatusRes ? safeJsonParse(cliStatusRes.stdout) : null;
  const cliSkills = skillsRes ? safeJsonParse(skillsRes.stdout) : null;

  const components = cliStatus?.result?.components || {};
  const queue = parseOvQueueTable(components.queue?.status || '');
  const vikingdb = parseOvVikingDb(components.vikingdb?.status || '');
  const models = parseOvModels(components.models?.status || '');
  const locks = parseOvLocks(components.lock?.status || '');

  let skills = [];
  const rawSkills = cliSkills?.result?.skills || cliSkills?.result || cliSkills?.skills || [];
  if (Array.isArray(rawSkills)) {
    skills = rawSkills.map((sk) => ({
      name: sk.name || sk.id || String(sk),
      uri: sk.uri || '',
      description: String(sk.description || sk.abstract || '').slice(0, 140),
      scope: sk.scope || '',
    }));
  }

  const reachable = Boolean(healthProbe.ok || cliHealth?.ok);
  const readyOk = readyProbe.ok && readyProbe.json?.status === 'ready';
  const degraded = reachable && (!readyOk || cliStatus?.result?.is_healthy === false);

  return {
    id: 'openviking',
    name: 'OpenViking',
    enabled: true,
    protocol: 'Official HTTP (/health, /ready) + ov -o json CLI',
    apiUrl: baseUrl,
    reachable,
    status: !reachable ? 'offline' : degraded ? 'degraded' : 'healthy',
    latencyMs: healthProbe.latencyMs,
    version: healthProbe.json?.version || cliHealth?.result?.version || '',
    authMode: healthProbe.json?.auth_mode || cliHealth?.result?.auth_mode || '',
    account: cliHealth?.result?.account_id || vikingdb.account || '',
    role: cliHealth?.result?.role || '',
    readyChecks: readyProbe.json?.checks || null,
    vikingdb,
    queue,
    models,
    locks,
    skillsCount: skills.length,
    skills: skills.slice(0, 20),
    errors: Array.isArray(cliStatus?.result?.errors) ? cliStatus.result.errors : [],
    error: reachable ? null : (healthProbe.error || 'OpenViking unreachable'),
  };
}

export async function searchOpenViking(cfg, query, limit = 10) {
  if (!cfg?.enabled) return { ok: false, provider: 'openviking', error: 'OpenViking connector disabled', items: [] };
  const q = String(query || '').trim();
  if (!q) return { ok: true, provider: 'openviking', items: [] };
  const cliBin = cfg.cliBin || 'ov';
  const n = Math.min(30, Math.max(1, Number(limit) || 10));
  try {
    const { stdout } = await runCmd(cliBin, ['-o', 'json', 'find', q, '-n', String(n)], { timeout: 8000 });
    const parsed = safeJsonParse(stdout);
    const res = parsed?.result || parsed || {};
    const buckets = [
      ...(Array.isArray(res.memories) ? res.memories.map((x) => ({ ...x, _kind: 'memory' })) : []),
      ...(Array.isArray(res.resources) ? res.resources.map((x) => ({ ...x, _kind: 'resource' })) : []),
      ...(Array.isArray(res.skills) ? res.skills.map((x) => ({ ...x, _kind: 'skill' })) : []),
      ...(Array.isArray(res.results) ? res.results : []),
      ...(Array.isArray(res) ? res : []),
    ];
    const items = buckets.slice(0, n).map((item, idx) => ({
      id: item.uri || `ov-${idx}`,
      provider: 'openviking',
      title: item.uri || item.name || '(context node)',
      snippet: String(item.abstract || item.overview || item.content || '').slice(0, 260),
      score: item.score ?? null,
      unitType: item._kind || item.context_type || 'context',
      labels: [],
      source: 'openviking',
      createdAt: '',
    }));
    return { ok: true, provider: 'openviking', total: items.length, mode: 'semantic', items };
  } catch (err) {
    return { ok: false, provider: 'openviking', error: (err.stderr || err.message || 'Search failed').trim().slice(0, 200), items: [] };
  }
}

export async function doctorOpenViking(cfg) {
  if (!cfg?.enabled) return { ok: false, provider: 'openviking', error: 'OpenViking connector disabled' };
  const baseUrl = String(cfg.apiUrl || 'http://127.0.0.1:1933').replace(/\/+$/, '');
  const cliBin = cfg.cliBin || 'ov';
  const [readyProbe, cliRes] = await Promise.all([
    httpProbe(`${baseUrl}/ready`, { timeoutMs: 3000 }),
    runCmd(cliBin, ['-o', 'json', 'health'], { timeout: 5000 }).catch((e) => ({ error: e.message })),
  ]);
  return {
    ok: Boolean(readyProbe.ok),
    provider: 'openviking',
    data: {
      ready: readyProbe.json || { status: readyProbe.status, error: readyProbe.error },
      cli: cliRes.stdout ? safeJsonParse(cliRes.stdout) : cliRes,
    },
  };
}
