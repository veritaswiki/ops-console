import { getUserEnv, httpProbe, runCmd } from '../exec.mjs';

function stripAnsi(str) {
  return String(str || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function redactSecrets(str) {
  return String(str || '')
    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|gh[pous]_[A-Za-z0-9_-]{8,}|k=[A-Za-z0-9._~-]{8,})\b/g, '[REDACTED]');
}

export function parseMagpieAgentsText(stdout) {
  const clean = redactSecrets(stripAnsi(stdout));
  const agents = [];
  for (const rawLine of clean.split('\n')) {
    const line = rawLine.trim();
    if (!line || /^[-─=]+$/.test(line) || /^(NAME|AGENT)\s+/i.test(line) || line.startsWith('No ')) continue;
    const parts = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      agents.push({
        name: parts[0],
        model: parts[1],
        detail: parts.slice(2).join(' · '),
      });
    }
  }
  return agents;
}

export function parseMagpieLibraryText(stdout) {
  const clean = redactSecrets(stripAnsi(stdout));
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    summaryLines: lines.slice(0, 18),
  };
}

export async function collectMagpie(cfg) {
  if (!cfg?.enabled) {
    return { id: 'magpie', name: 'Magpie Gateway', enabled: false, protocol: 'Official OpenAI /v1/models + magpie CLI' };
  }

  const apiUrl = String(cfg.apiUrl || 'http://127.0.0.1:3426').replace(/\/+$/, '');
  const cliBin = cfg.cliBin || 'magpie';
  const cliEnv = getUserEnv({
    ...(cfg.configHome ? { XDG_CONFIG_HOME: cfg.configHome } : {}),
    ...(cfg.addr ? { MAGPIE_ADDR: cfg.addr } : {}),
  });

  const [modelsProbe, lsRes, libRes] = await Promise.all([
    httpProbe(`${apiUrl}/v1/models`, { timeoutMs: 2500 }),
    runCmd(cliBin, ['ls'], { timeout: 3500, env: cliEnv }).catch(() => null),
    runCmd(cliBin, ['library'], { timeout: 3500, env: cliEnv }).catch(() => null),
  ]);

  const modelsList = Array.isArray(modelsProbe.json?.data) ? modelsProbe.json.data : [];
  const providerMap = new Map();
  let reasoningCount = 0;
  for (const m of modelsList) {
    const id = String(m.id || '');
    const provider = m.owned_by || (id.includes('/') ? id.split('/')[0] : 'default');
    providerMap.set(provider, (providerMap.get(provider) || 0) + 1);
    if (m.reasoning) reasoningCount += 1;
  }

  const providers = [...providerMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const agents = lsRes ? parseMagpieAgentsText(lsRes.stdout) : [];
  const library = libRes ? parseMagpieLibraryText(libRes.stdout) : { summaryLines: [] };
  const reachable = Boolean(modelsProbe.ok);

  return {
    id: 'magpie',
    name: 'Magpie Gateway',
    enabled: true,
    protocol: 'Official OpenAI /v1/models + magpie CLI',
    apiUrl,
    webUrl: cfg.webUrl || '',
    reachable,
    status: reachable ? 'healthy' : 'offline',
    latencyMs: modelsProbe.latencyMs,
    totalModels: modelsList.length,
    reasoningModels: reasoningCount,
    providers,
    agents,
    library,
    error: reachable ? null : (modelsProbe.error || 'Magpie gateway unreachable'),
  };
}
