import { getUserEnv, httpProbe, runCmd } from '../exec.mjs';
import { redactText } from '../redact.mjs';

function stripAnsi(str) {
  return String(str || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function redactSecrets(str) {
  return redactText(str);
}

export function inferMagpieHarness(agentName) {
  const lower = String(agentName || '').trim().toLowerCase();
  if (!lower) return 'custom-a2a';
  if (lower.includes('codex')) return 'codex';
  if (lower.includes('claude')) return 'claude-code';
  if (lower === 'pi' || lower.startsWith('pi ')) return 'pi';
  if (lower.includes('deepseek harness') || lower === 'dsh' || lower.includes('dsh')) return 'dsh-expert';
  if (lower.includes('antigravity') || lower.includes('gemini')) return 'gemini-cli';
  if (lower.includes('opencode')) return 'opencode';
  if (lower.includes('t3')) return 't3-code';
  if (lower.includes('alma')) return 'alma';
  if (lower.includes('vs code') || lower.includes('vscode')) return 'vscode';
  return 'custom-a2a';
}

export function normalizeMagpieModelId(rawModel) {
  const clean = String(rawModel || '').trim();
  if (!clean || clean === '—' || clean === '-' || /^none$/i.test(clean)) return '';
  if (/^provider\s+/i.test(clean)) return '';
  return clean.replace(/^magpie\//i, '').trim();
}

function sanitizeConfigSource(rawSource) {
  const clean = redactSecrets(String(rawSource || '').trim());
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) {
    try {
      const u = new URL(clean);
      return u.origin;
    } catch {
      return '';
    }
  }
  if (clean.startsWith('~/')) return clean;
  const homeSanitized = clean
    .replace(/^\/home\/[^/\s]+\//, '~/')
    .replace(/^\/Users\/[^/\s]+\//, '~/');
  return homeSanitized.slice(0, 120);
}

function extractEffortFromSegments(segments) {
  for (const seg of segments) {
    const match = String(seg || '').match(/\b(?:effort|thinking|reasoning)\s*[=:]?\s*([a-z0-9_-]+)/i);
    if (match && match[1] && match[1] !== '—' && match[1] !== '-') {
      return match[1].toLowerCase();
    }
  }
  return null;
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
    if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\b/.test(line) || /^plugin:/i.test(line)) continue;
    const parts = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    const name = parts[0];
    const rawModel = parts[1];
    const rest = parts.slice(2).filter((p) => p !== '·');
    let configSource = '';
    const detailParts = [];
    for (const seg of rest) {
      if (
        !configSource
        && (seg.startsWith('~/') || seg.startsWith('/') || /^https?:\/\//i.test(seg))
      ) {
        configSource = sanitizeConfigSource(seg);
      } else {
        detailParts.push(seg);
      }
    }
    const canonicalModel = normalizeMagpieModelId(rawModel);
    const mode = canonicalModel
      ? 'pinned'
      : (/^provider\s+/i.test(rawModel) ? 'provider' : 'default');
    const effort = extractEffortFromSegments([rawModel, ...detailParts]);
    const harness = inferMagpieHarness(name);

    agents.push({
      name,
      harness,
      rawModel,
      model: canonicalModel || rawModel,
      canonicalModel,
      mode,
      effort,
      configSource,
      detail: detailParts.join(' · ') || configSource,
    });
  }
  return agents;
}

export function normalizeMagpieModels(modelsList) {
  if (!Array.isArray(modelsList)) return [];
  const out = [];
  const seen = new Set();
  for (const m of modelsList) {
    const id = String(m?.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const displayName = String(m?.display_name || m?.displayName || id).trim();
    const label = String(m?.magpie_label || displayName || id).trim();
    const prefix = id.includes('/') ? id.split('/')[0] : '';
    const isRoutingGroup =
      prefix === 'auto'
      || prefix === 'group'
      || /routing group/i.test(label);
    const provider = String(m?.owned_by || prefix || 'default').trim();
    const group = isRoutingGroup ? 'routing-group' : (prefix || provider || 'default');
    const reasoningLevels = Array.isArray(m?.reasoning_levels)
      ? m.reasoning_levels.map((lvl) => String(lvl).trim()).filter(Boolean)
      : Array.isArray(m?.supported_reasoning_levels)
        ? m.supported_reasoning_levels.map((item) => String(item?.effort || '').trim()).filter(Boolean)
        : [];
    const contextWindow = Number(m?.context_window || m?.context_length || 0);
    const maxOutputTokens = Number(m?.max_output_tokens || 0);
    out.push({
      id,
      displayName,
      label,
      provider,
      group,
      isRoutingGroup,
      reasoning: Boolean(m?.reasoning || reasoningLevels.length > 0),
      reasoningLevels,
      contextWindow: Number.isFinite(contextWindow) && contextWindow > 0 ? contextWindow : null,
      maxOutputTokens: Number.isFinite(maxOutputTokens) && maxOutputTokens > 0 ? maxOutputTokens : null,
      toolCall: Boolean(m?.tool_call),
    });
  }
  out.sort((a, b) => {
    if (a.isRoutingGroup !== b.isRoutingGroup) return a.isRoutingGroup ? -1 : 1;
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return a.displayName.localeCompare(b.displayName);
  });
  return out;
}

export function getCachedMagpieAgentBindings(cfg) {
  if (!cfg?.enabled) return [];
  const cliBin = cfg.cliBin || 'magpie';
  const cliEnv = getUserEnv({
    ...(cfg.configHome ? { XDG_CONFIG_HOME: cfg.configHome } : {}),
    ...(cfg.addr ? { MAGPIE_ADDR: cfg.addr } : {}),
  });
  const cacheKey = `${cliBin}|${cfg.configHome || ''}|${cfg.addr || ''}`;
  const entry = refreshMagpieCliBackground(cacheKey, cliBin, cliEnv);
  return Array.isArray(entry.agents) ? entry.agents : [];
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
    return {
      id: 'magpie',
      name: 'Magpie Gateway',
      enabled: false,
      protocol: 'Official OpenAI /v1/models + magpie CLI',
      agentBindings: [],
    };
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
  const normalizedModels = normalizeMagpieModels(modelsList);
  const providerMap = new Map();
  let reasoningCount = 0;
  for (const m of normalizedModels) {
    providerMap.set(m.provider, (providerMap.get(m.provider) || 0) + 1);
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
    agentBindings: agents,
    library,
    cliCachedAt: (cliEntry.lsRefreshedAt || cliEntry.libRefreshedAt)
      ? new Date(Math.max(cliEntry.lsRefreshedAt, cliEntry.libRefreshedAt)).toISOString()
      : null,
    error: reachable ? null : (modelsProbe.error || 'Magpie gateway unreachable'),
  };
}

export async function collectMagpieCatalog(cfg, { awaitCli = true } = {}) {
  if (!cfg?.enabled) {
    return {
      ok: true,
      enabled: false,
      reachable: false,
      apiUrl: String(cfg?.apiUrl || 'http://127.0.0.1:3426'),
      webUrl: cfg?.webUrl || '',
      protocol: 'Official OpenAI /v1/models + magpie CLI',
      latencyMs: null,
      totalModels: 0,
      reasoningModels: 0,
      providers: [],
      models: [],
      agentBindings: [],
      cliCachedAt: null,
      error: 'Magpie connector is disabled in config',
    };
  }

  const apiUrl = String(cfg.apiUrl || 'http://127.0.0.1:3426').replace(/\/+$/, '');
  const cliBin = cfg.cliBin || 'magpie';
  const cliEnv = getUserEnv({
    ...(cfg.configHome ? { XDG_CONFIG_HOME: cfg.configHome } : {}),
    ...(cfg.addr ? { MAGPIE_ADDR: cfg.addr } : {}),
  });
  const cacheKey = `${cliBin}|${cfg.configHome || ''}|${cfg.addr || ''}`;
  const cliEntry = refreshMagpieCliBackground(cacheKey, cliBin, cliEnv);

  const modelsProbe = await httpProbe(`${apiUrl}/v1/models`, { timeoutMs: 3000 });
  if (awaitCli && cliEntry.inflight) {
    await Promise.race([cliEntry.inflight, new Promise((resolve) => setTimeout(resolve, 1800))]);
  }

  const rawModels = Array.isArray(modelsProbe.json?.data) ? modelsProbe.json.data : [];
  const models = normalizeMagpieModels(rawModels);
  const providerMap = new Map();
  let reasoningModels = 0;
  for (const m of models) {
    providerMap.set(m.provider, (providerMap.get(m.provider) || 0) + 1);
    if (m.reasoning) reasoningModels += 1;
  }
  const providers = [...providerMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const reachable = Boolean(modelsProbe.ok);

  return {
    ok: true,
    enabled: true,
    reachable,
    apiUrl,
    webUrl: cfg.webUrl || '',
    protocol: 'Official OpenAI /v1/models + magpie CLI',
    latencyMs: modelsProbe.latencyMs ?? null,
    totalModels: models.length,
    reasoningModels,
    providers,
    models,
    agentBindings: Array.isArray(cliEntry.agents) ? cliEntry.agents : [],
    cliCachedAt: (cliEntry.lsRefreshedAt || cliEntry.libRefreshedAt)
      ? new Date(Math.max(cliEntry.lsRefreshedAt, cliEntry.libRefreshedAt)).toISOString()
      : null,
    error: reachable ? null : (modelsProbe.error || 'Magpie gateway unreachable'),
  };
}
