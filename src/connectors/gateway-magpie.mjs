import { getUserEnv, httpProbe, runCmd } from '../exec.mjs';
import { redactText } from '../redact.mjs';

function stripAnsi(str) {
  return String(str || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function redactSecrets(str) {
  return redactText(str);
}

const CLI_LS_TTL_MS = 600_000;
const CLI_LIB_TTL_MS = 60_000;
const cliStateByKey = new Map();

function refreshMagpieCliBackground(cacheKey, cliBin, cliEnv) {
  let entry = cliStateByKey.get(cacheKey);
  if (!entry) {
    entry = {
      agents: [],
      library: { summaryLines: [] },
      lsRefreshedAt: 0,
      libRefreshedAt: 0,
      lsInflight: null,
      libInflight: null,
      inflight: null,
    };
    cliStateByKey.set(cacheKey, entry);
  }
  const now = Date.now();
  const needLs = !entry.lsInflight && (entry.lsRefreshedAt === 0 || now - entry.lsRefreshedAt >= CLI_LS_TTL_MS);
  const needLib = !entry.libInflight && (entry.libRefreshedAt === 0 || now - entry.libRefreshedAt >= CLI_LIB_TTL_MS);
  if (!needLs && !needLib) return entry;

  const tasks = [];
  if (needLs) {
    entry.lsInflight = runCmd(cliBin, ['ls'], { timeout: 6000, env: cliEnv, killProcessGroup: true })
      .then((lsRes) => {
        if (lsRes) entry.agents = parseMagpieAgentsText(lsRes.stdout);
        entry.lsRefreshedAt = Date.now();
      })
      .catch(() => null)
      .finally(() => {
        entry.lsInflight = null;
      });
    tasks.push(entry.lsInflight);
  }
  if (needLib) {
    entry.libInflight = runCmd(cliBin, ['library'], { timeout: 4000, env: cliEnv, killProcessGroup: true })
      .then((libRes) => {
        if (libRes) entry.library = parseMagpieLibraryText(libRes.stdout);
        entry.libRefreshedAt = Date.now();
      })
      .catch(() => null)
      .finally(() => {
        entry.libInflight = null;
      });
    tasks.push(entry.libInflight);
  }
  if (tasks.length > 0) {
    entry.inflight = Promise.all(tasks).finally(() => {
      entry.inflight = null;
    });
  }
  return entry;
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
  let inMcpSection = false;
  let mcpCount = 0;
  for (const line of lines) {
    if (/^MCP servers$/i.test(line)) {
      inMcpSection = true;
      continue;
    }
    if (/^(Skills|Instructions)$/i.test(line)) {
      inMcpSection = false;
      continue;
    }
    if (
      inMcpSection &&
      line.includes('→') &&
      !/^magpie\s*\(one server/i.test(line) &&
      !/^in your agents/i.test(line)
    ) {
      mcpCount += 1;
    }
  }
  return {
    summaryLines: lines.slice(0, 18),
    mcpCount,
  };
}

export async function collectMagpie(cfg, { awaitCli = false } = {}) {
  if (!cfg?.enabled) {
    return { id: 'magpie', name: 'Magpie Gateway', enabled: false, protocol: 'Official OpenAI /v1/models + magpie CLI' };
  }

  const apiUrl = String(cfg.apiUrl || 'http://127.0.0.1:3426').replace(/\/+$/, '');
  const cliBin = cfg.cliBin || 'magpie';
  const cliEnv = getUserEnv({
    ...(cfg.configHome ? { XDG_CONFIG_HOME: cfg.configHome } : {}),
    ...(cfg.addr ? { MAGPIE_ADDR: cfg.addr } : {}),
  });
  const cacheKey = `${cliBin}|${cfg.configHome || ''}|${cfg.addr || ''}`;
  const cliEntry = refreshMagpieCliBackground(cacheKey, cliBin, cliEnv);

  const modelsProbe = await httpProbe(`${apiUrl}/v1/models`, { timeoutMs: 2500 });
  if (awaitCli && cliEntry.inflight) {
    await Promise.race([cliEntry.inflight, new Promise((resolve) => setTimeout(resolve, 600))]);
  }

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

  const agents = cliEntry.agents;
  const library = cliEntry.library;
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
    cliCachedAt: (cliEntry.lsRefreshedAt || cliEntry.libRefreshedAt)
      ? new Date(Math.max(cliEntry.lsRefreshedAt, cliEntry.libRefreshedAt)).toISOString()
      : null,
    error: reachable ? null : (modelsProbe.error || 'Magpie gateway unreachable'),
  };
}
