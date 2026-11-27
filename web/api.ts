import type {
  A2AAgentPeer,
  A2ACollaborationLog,
  A2AConnectProfilesResponse,
  A2AContextSpillNode,
  A2APingResponse,
  A2AStateResponse,
  A2ASuperAgentConfig,
  A2ASuperAgentTicket,
  A2ASwarmMetrics,
  A2ATaskRecord,
  A2ATriggerEvent,
  AiOpsContextResponse,
  AiPreflightRequest,
  AiPreflightResponse,
  AlertEvent,
  AlertRule,
  AlertsStateResponse,
  AuditEntry,
  BotActivityItem,
  BotFleetResponse,
  BotItem,
  CloudflareSnapshot,
  ConfigStudioResponse,
  FleetMcpServer,
  GatewayTelemetryResponse,
  GithubOverviewResponse,
  IncidentItem,
  LinearCommanderConfig,
  LinearGithubConfig,
  LinearIssueItem,
  LinearProjectItem,
  LinearStateResponse,
  LogsResponse,
  McpFleetResponse,
  McpTestResult,
  MemoryCompareResponse,
  MemorySearchResultItem,
  MetaResponse,
  MetricsRange,
  MetricsSeriesResponse,
  PluginCatalogItem,
  PluginsResponse,
  PluginTestResult,
  ProbeCommandItem,
  ProbesResponse,
  RemoteHostStatus,
  RunbookExecution,
  RunbooksResponse,
  SnapshotResponse,
  TailscaleNetcheckResult,
  TailscalePingResult,
} from './types';

interface ApiRequestOptions extends RequestInit {
  /** Optional short-TTL cache duration in ms for idempotent GET requests (default 0 = no cache). */
  cacheTtlMs?: number;
  /** Skip in-flight deduplication when caller supplies an AbortSignal or forces fresh fetch. */
  dedupe?: boolean;
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const MAX_API_CACHE_ENTRIES = 64;
const responseCache = new Map<string, CacheEntry>();
const inflightGets = new Map<string, Promise<unknown>>();

export function clearApiCache(prefix?: string): void {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
  }
}

function setCachedResponse(key: string, data: unknown, ttlMs: number): void {
  if (ttlMs <= 0) return;
  if (responseCache.has(key)) {
    responseCache.delete(key);
  }
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  while (responseCache.size > MAX_API_CACHE_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    if (oldest === undefined) break;
    responseCache.delete(oldest);
  }
}

export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { cacheTtlMs = 0, dedupe = true, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  if (!isGet) {
    // Any mutation invalidates cached read views so subsequent loads stay consistent
    clearApiCache();
  }

  if (isGet && cacheTtlMs > 0 && !fetchOptions.signal) {
    const cached = responseCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    if (cached) responseCache.delete(url);
  }

  if (isGet && dedupe && !fetchOptions.signal && inflightGets.has(url)) {
    return inflightGets.get(url) as Promise<T>;
  }

  const runFetch = async (): Promise<T> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };
    if (fetchOptions.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      credentials: 'same-origin',
      ...fetchOptions,
      headers,
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const errObj = data as { error?: string; message?: string } | null;
      const msg = errObj?.error || errObj?.message || `HTTP ${res.status}`;
      const err = new Error(msg) as Error & { status?: number; payload?: unknown };
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    if (isGet && cacheTtlMs > 0) {
      setCachedResponse(url, data, cacheTtlMs);
    }
    return data as T;
  };

  if (isGet && dedupe && !fetchOptions.signal) {
    const promise = runFetch().finally(() => {
      inflightGets.delete(url);
    });
    inflightGets.set(url, promise);
    return promise;
  }

  return runFetch();
}

export const fetchMeta = (signal?: AbortSignal) =>
  apiRequest<MetaResponse>('/api/meta', { cacheTtlMs: 30000, signal });

export const fetchSnapshot = (force = false, signal?: AbortSignal) =>
  apiRequest<SnapshotResponse>(force ? '/api/snapshot?refresh=1' : '/api/snapshot', {
    cacheTtlMs: force ? 0 : 2500,
    dedupe: !force,
    signal,
  });

export const fetchProbes = (signal?: AbortSignal) =>
  apiRequest<ProbesResponse>('/api/probes', { cacheTtlMs: 4000, signal });

export const fetchIncidents = (limit = 30, signal?: AbortSignal) =>
  apiRequest<{ items?: IncidentItem[]; incidents?: IncidentItem[]; stats?: { count?: number; retentionDays?: number } }>(
    `/api/incidents?limit=${limit}`,
    { cacheTtlMs: 4000, signal },
  );

export const saveIncidentNote = (incidentId: string | number, note: string) =>
  apiRequest<{ ok?: boolean; id?: number; note?: string }>(
    `/api/incidents/${encodeURIComponent(String(incidentId))}/note`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
    },
  );

export const fetchMetricsSeries = (
  series = 'fleet',
  range: MetricsRange = '24h',
  signal?: AbortSignal,
) => {
  const qs = new URLSearchParams({ series, range });
  return apiRequest<MetricsSeriesResponse>(`/api/metrics/series?${qs.toString()}`, {
    cacheTtlMs: 8000,
    signal,
  });
};

export const fetchPrometheusMetrics = async (signal?: AbortSignal): Promise<string> => {
  const res = await fetch('/api/metrics', { credentials: 'same-origin', signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

export const fetchAlerts = (signal?: AbortSignal) =>
  apiRequest<AlertsStateResponse>('/api/alerts', { cacheTtlMs: 3000, signal });

export const createAlertRule = (payload: {
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  channel: string;
  channelTarget?: string;
  forMinutes?: number;
  cooldownMinutes?: number;
}) =>
  apiRequest<{ ok?: boolean; rule: AlertRule }>('/api/alerts/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const toggleAlertRule = (ruleId: string, enabled: boolean) =>
  apiRequest<{ ok?: boolean; rule: AlertRule }>(
    `/api/alerts/rules/${encodeURIComponent(ruleId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    },
  );

export const deleteAlertRule = (ruleId: string) =>
  apiRequest<{ ok?: boolean }>(`/api/alerts/rules/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
  });

export const ackAlert = (alertId: string) =>
  apiRequest<{ ok?: boolean; alert: AlertEvent }>(
    `/api/alerts/${encodeURIComponent(alertId)}/ack`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );

export const setAlertSilence = (minutes: number) =>
  apiRequest<{ ok?: boolean; silenced: boolean; silenceUntil: string | null }>('/api/alerts/silence', {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  });

export const fetchGatewayTelemetry = (signal?: AbortSignal) =>
  apiRequest<GatewayTelemetryResponse>('/api/gateway/telemetry', { cacheTtlMs: 5000, signal });

export const compareMemoryRetrieval = (q: string, signal?: AbortSignal) => {
  const qs = new URLSearchParams({ q });
  return apiRequest<MemoryCompareResponse>(`/api/memory/compare?${qs.toString()}`, { signal });
};

export const fetchRunbooks = (signal?: AbortSignal) =>
  apiRequest<RunbooksResponse>('/api/runbooks', { cacheTtlMs: 5000, signal });

export const runRunbook = (runbookId: string) =>
  apiRequest<{ ok?: boolean; run: RunbookExecution }>(
    `/api/runbooks/${encodeURIComponent(runbookId)}/run`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );

export const fetchProbeCommands = (nodeId: string, signal?: AbortSignal) =>
  apiRequest<{ ok?: boolean; nodeId: string; items: ProbeCommandItem[] }>(
    `/api/probes/${encodeURIComponent(nodeId)}/commands`,
    { signal },
  );

export const enqueueProbeCommand = (nodeId: string, command: string) =>
  apiRequest<{ ok?: boolean; command: ProbeCommandItem }>(
    `/api/probes/${encodeURIComponent(nodeId)}/commands`,
    {
      method: 'POST',
      body: JSON.stringify({ command }),
    },
  );

export const fetchConfigStudio = (signal?: AbortSignal) =>
  apiRequest<ConfigStudioResponse>('/api/config/studio', { cacheTtlMs: 5000, signal });

export const validateConfigStudio = (rawJson: string) =>
  apiRequest<{ ok?: boolean; valid: boolean; errors: string[] }>('/api/config/validate', {
    method: 'POST',
    body: JSON.stringify({ rawJson }),
  });

export const fetchAudit = (limit = 40, signal?: AbortSignal) =>
  apiRequest<{ items?: AuditEntry[]; entries?: AuditEntry[] }>(`/api/audit?limit=${limit}`, {
    cacheTtlMs: 4000,
    signal,
  });

export const fetchLogs = (
  params: {
    source: string;
    target: string;
    since: string;
    level: string;
    q: string;
    regex: boolean;
    lines?: number;
  },
  signal?: AbortSignal,
) => {
  const qs = new URLSearchParams();
  qs.set('source', params.source);
  if (params.target) qs.set('target', params.target);
  if (params.since) qs.set('since', params.since);
  if (params.level && params.level !== 'all') qs.set('level', params.level);
  if (params.q.trim()) qs.set('q', params.q.trim());
  if (params.regex) qs.set('regex', '1');
  qs.set('lines', String(params.lines ?? 200));
  return apiRequest<LogsResponse>(`/api/logs?${qs.toString()}`, { signal, dedupe: false });
};

export const buildLogStreamUrl = (params: {
  source: string;
  target: string;
  level: string;
  q: string;
  regex: boolean;
}) => {
  const qs = new URLSearchParams();
  qs.set('source', params.source);
  if (params.target) qs.set('target', params.target);
  if (params.level && params.level !== 'all') qs.set('level', params.level);
  if (params.q.trim()) qs.set('q', params.q.trim());
  if (params.regex) qs.set('regex', '1');
  return `/api/logs/stream?${qs.toString()}`;
};

export const searchMemory = (q: string, provider: string) => {
  const qs = new URLSearchParams({ q, provider });
  return apiRequest<{
    results?: MemorySearchResultItem[];
    items?: MemorySearchResultItem[];
    errors?: Record<string, string>;
  }>(`/api/memory/search?${qs.toString()}`);
};

export const runMemoryDoctor = () =>
  apiRequest<{ output?: string; raw?: string; results?: unknown }>('/api/memory/doctor', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const issueConfirmToken = (unit: string, action: string) =>
  apiRequest<{ ok?: boolean; confirmToken: string; unit: string; action: string; expiresInSec: number }>(
    '/api/actions/confirm-token',
    {
      method: 'POST',
      body: JSON.stringify({ unit, action }),
    },
  );

export const executeServiceAction = (
  serviceId: string,
  action: string,
  confirmToken?: string,
) =>
  apiRequest<{ ok?: boolean; message?: string; output?: string; error?: string }>(
    '/api/services/control',
    {
      method: 'POST',
      body: JSON.stringify(
        confirmToken
          ? { id: serviceId, unit: serviceId, action, confirmToken }
          : { id: serviceId, unit: serviceId, action },
      ),
    },
  );

export const executeTimerAction = (unit: string, action: string) =>
  apiRequest<{ ok?: boolean; message?: string; output?: string; error?: string }>(
    '/api/timers/control',
    {
      method: 'POST',
      body: JSON.stringify({ unit, action }),
    },
  );

export const runOpsAction = (action: 'health-check' | 'backup') =>
  apiRequest<{ ok?: boolean; output?: string; message?: string }>(`/api/ops/${action}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const probeRemotes = () =>
  apiRequest<{ nodes?: RemoteHostStatus[]; items?: RemoteHostStatus[]; remotes?: RemoteHostStatus[] }>(
    '/api/remotes?refresh=1',
  );

export const fetchTailscaleNetcheck = () =>
  apiRequest<{ ok?: boolean; netcheck?: TailscaleNetcheckResult }>('/api/network/tailscale/netcheck');

export const pingTailscalePeer = (target: string) =>
  apiRequest<{ ok?: boolean; ping?: TailscalePingResult; error?: string }>(
    '/api/network/tailscale/ping',
    {
      method: 'POST',
      body: JSON.stringify({ target }),
    },
  );

export const fetchCloudflareStatus = () =>
  apiRequest<{ ok?: boolean; cloudflare?: CloudflareSnapshot }>('/api/network/cloudflare');

export const submitMobileCheckin = (payload: {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  batteryPct?: number | null;
  note?: string;
}) =>
  apiRequest<{ ok?: boolean; node?: unknown }>('/api/probes/checkin', {
    method: 'POST',
    body: JSON.stringify({
      nodeId: payload.id,
      name: payload.name,
      region: payload.region,
      lat: payload.lat,
      lon: payload.lon,
      battery:
        payload.batteryPct != null && Number.isFinite(payload.batteryPct)
          ? { percent: payload.batteryPct }
          : null,
      note: payload.note,
    }),
  });

export const enrollProbe = (payload: {
  id: string;
  name: string;
  deviceType: string;
  region: string;
  role: string;
  lat: number;
  lon: number;
}) =>
  apiRequest<{
    ok?: boolean;
    token?: string;
    probe?: { id: string; name?: string };
    snippets?: { linux?: string; macos?: string; curl?: string };
    install?: { linux?: string; macos?: string; curl?: string };
  }>('/api/probes/enroll', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const revokeProbe = (probeId: string) =>
  apiRequest<{ ok?: boolean }>(`/api/probes/${encodeURIComponent(probeId)}`, {
    method: 'DELETE',
  });

export const fetchPlugins = (refresh = false, signal?: AbortSignal) =>
  apiRequest<PluginsResponse>(refresh ? '/api/plugins?refresh=1' : '/api/plugins', {
    cacheTtlMs: refresh ? 0 : 4000,
    dedupe: !refresh,
    signal,
  });

export const togglePlugin = (pluginId: string, enabled: boolean) =>
  apiRequest<{ ok?: boolean; id: string; enabled: boolean }>(
    `/api/plugins/${encodeURIComponent(pluginId)}/toggle`,
    {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    },
  );

export const updatePluginConfig = (pluginId: string, config: Record<string, unknown>) =>
  apiRequest<{ ok?: boolean; id: string; config: Record<string, unknown> }>(
    `/api/plugins/${encodeURIComponent(pluginId)}/config`,
    {
      method: 'POST',
      body: JSON.stringify(config),
    },
  );

export const testPlugin = (pluginId: string, config?: Record<string, unknown>) =>
  apiRequest<PluginTestResult>(
    `/api/plugins/${encodeURIComponent(pluginId)}/test`,
    {
      method: 'POST',
      body: JSON.stringify(config ? { config } : {}),
    },
  );

export const addCustomPlugin = (payload: {
  name: string;
  id?: string;
  kind: 'mcp' | 'agent' | 'gateway' | 'custom';
  apiUrl: string;
  healthPath?: string;
  authToken?: string;
  description?: string;
}) =>
  apiRequest<{ ok?: boolean; id: string; plugin: PluginCatalogItem }>('/api/plugins/custom', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const removeCustomPlugin = (pluginId: string) =>
  apiRequest<{ ok?: boolean; id: string }>(
    `/api/plugins/custom/${encodeURIComponent(pluginId)}`,
    {
      method: 'DELETE',
    },
  );

// ─── Fleet-Wide MCP Control Plane ────────────────────────────────────────────
export const fetchMcps = (nodeId = '', signal?: AbortSignal) => {
  const qs = nodeId ? `?nodeId=${encodeURIComponent(nodeId)}` : '';
  return apiRequest<McpFleetResponse>(`/api/mcps${qs}`, { cacheTtlMs: 3000, signal });
};

export const registerMcp = (payload: {
  name: string;
  transport: 'streamable-http' | 'stdio' | 'sse';
  endpoint?: string;
  command?: string;
  args?: string[] | string;
  nodeIds: string[];
  envRefs?: string[];
  scope?: string;
  description?: string;
}) =>
  apiRequest<{ ok?: boolean; created: FleetMcpServer[]; queuedCommands: ProbeCommandItem[] }>(
    '/api/mcps',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

export const toggleMcp = (mcpId: string, enabled: boolean) =>
  apiRequest<{ ok?: boolean; item: FleetMcpServer; queuedCommand?: ProbeCommandItem | null }>(
    `/api/mcps/${encodeURIComponent(mcpId)}/toggle`,
    {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    },
  );

export const testMcp = (mcpId: string) =>
  apiRequest<McpTestResult>(`/api/mcps/${encodeURIComponent(mcpId)}/test`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const syncMcpToNodes = (mcpId: string, targetNodeIds: string[]) =>
  apiRequest<{ ok?: boolean; synced: FleetMcpServer[]; queuedCommands: ProbeCommandItem[] }>(
    `/api/mcps/${encodeURIComponent(mcpId)}/sync`,
    {
      method: 'POST',
      body: JSON.stringify({ targetNodeIds }),
    },
  );

export const deleteMcp = (mcpId: string) =>
  apiRequest<{ ok?: boolean; id: string }>(`/api/mcps/${encodeURIComponent(mcpId)}`, {
    method: 'DELETE',
  });

// ─── Harness-Free A2A Lead/Worker Orchestrator ───────────────────────────────
export const fetchA2AState = (signal?: AbortSignal) =>
  apiRequest<A2AStateResponse>('/api/a2a/state', { cacheTtlMs: 3000, signal });

export const setLeadA2AAgent = (agentId: string) =>
  apiRequest<{ ok?: boolean; leadAgentId: string; leadAgent: A2AAgentPeer }>('/api/a2a/lead', {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  });

export const registerA2AAgent = (payload: {
  name: string;
  harness: string;
  nodeId: string;
  agentCardUrl: string;
  rpcUrl?: string;
  modelHint?: string;
  skills?: string[] | string;
  boundMcpIds?: string[];
  setAsLead?: boolean;
  description?: string;
}) =>
  apiRequest<{ ok?: boolean; agent: A2AAgentPeer }>('/api/a2a/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateA2AAgent = (
  agentId: string,
  patch: {
    delegatable?: boolean;
    boundMcpIds?: string[];
    name?: string;
    modelHint?: string;
    reasoningEffort?: string;
    version?: string;
  },
) =>
  apiRequest<{ ok?: boolean; agent: A2AAgentPeer }>(
    `/api/a2a/agents/${encodeURIComponent(agentId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );

export const deleteA2AAgent = (agentId: string) =>
  apiRequest<{ ok?: boolean; id: string; leadAgentId: string | null }>(
    `/api/a2a/agents/${encodeURIComponent(agentId)}`,
    {
      method: 'DELETE',
    },
  );

export const discoverA2AAgent = (agentId: string) =>
  apiRequest<{ ok: boolean; id: string; summary?: string; error?: string; latencyMs?: number }>(
    `/api/a2a/agents/${encodeURIComponent(agentId)}/discover`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );

export const discoverLocalA2AAgents = () =>
  apiRequest<{
    ok: boolean;
    scannedAt: string;
    discoveredCount: number;
    newlyRegistered: number;
    items: Array<{
      id: string;
      name: string;
      harness: string;
      nodeId: string;
      version: string;
      latestVersion: string;
      updateAvailable: boolean;
      installPath: string;
      alreadyRegistered: boolean;
    }>;
  }>('/api/a2a/discover-local', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const updateA2AOrchestrationConfig = (patch: Record<string, unknown>) =>
  apiRequest<{ ok?: boolean; orchestrationConfig: A2AStateResponse['orchestrationConfig'] }>('/api/a2a/config', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });

export const saveA2ATopologyPositions = (positions: Record<string, { x: number; y: number }>) =>
  apiRequest<{ ok?: boolean; updated: number }>('/api/a2a/topology', {
    method: 'PUT',
    body: JSON.stringify({ positions }),
  });

export const upsertA2ARoutingRule = (payload: {
  id?: string;
  name?: string;
  sourceAgentId: string;
  targetAgentId: string;
  taskCategory?: string;
  matchKeywords?: string[] | string;
  targetModel?: string;
  reasoningEffort?: string;
  priority?: number;
  enabled?: boolean;
  requireDshReview?: boolean;
}) =>
  apiRequest<{ ok?: boolean; rule: A2AStateResponse['routingRules'][number] }>('/api/a2a/routes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteA2ARoutingRule = (ruleId: string) =>
  apiRequest<{ ok?: boolean; id: string }>(`/api/a2a/routes/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
  });

export const upsertA2ASkill = (payload: {
  id?: string;
  name: string;
  version?: string;
  provider?: string;
  description?: string;
  enabled?: boolean;
  assignedAgentIds?: string[];
}) =>
  apiRequest<{ ok?: boolean; skill: A2AStateResponse['skillCatalog'][number] }>('/api/a2a/skills', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateA2ASkill = (
  skillId: string,
  patch: { enabled?: boolean; version?: string; assignedAgentIds?: string[]; toggleAgentId?: string },
) =>
  apiRequest<{ ok?: boolean; skill: A2AStateResponse['skillCatalog'][number] }>(
    `/api/a2a/skills/${encodeURIComponent(skillId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );

export const deleteA2ASkill = (skillId: string) =>
  apiRequest<{ ok?: boolean; id: string }>(`/api/a2a/skills/${encodeURIComponent(skillId)}`, {
    method: 'DELETE',
  });

export const createA2ASession = (payload: {
  title: string;
  primaryAgentId?: string;
  participatingAgentIds?: string[];
  syncedNodes?: string[];
  syncMode?: string;
  gitBranch?: string;
}) =>
  apiRequest<{ ok?: boolean; session: A2AStateResponse['sessions'][number] }>('/api/a2a/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const syncA2ASession = (sessionId: string, extraNodes?: string[]) =>
  apiRequest<{ ok?: boolean; session: A2AStateResponse['sessions'][number] }>(
    `/api/a2a/sessions/${encodeURIComponent(sessionId)}/sync`,
    {
      method: 'POST',
      body: JSON.stringify({ extraNodes }),
    },
  );

export const handoffA2ASession = (sessionId: string, targetAgentId: string) =>
  apiRequest<{ ok?: boolean; session: A2AStateResponse['sessions'][number] }>(
    `/api/a2a/sessions/${encodeURIComponent(sessionId)}/handoff`,
    {
      method: 'POST',
      body: JSON.stringify({ targetAgentId }),
    },
  );

export const dispatchA2ATask = (payload: {
  prompt: string;
  targetAgentId?: string;
  executionMode?: string;
  modelOverride?: string;
  reasoningEffort?: string;
  requireDshReview?: boolean;
  sessionId?: string;
  requiredSkill?: string;
  mcpIds?: string[];
  contextId?: string;
  parentTaskId?: string;
  worktreeBranch?: string;
  slashCommand?: string;
}) =>
  apiRequest<{ ok?: boolean; task: A2ATaskRecord }>('/api/a2a/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateA2ATaskState = (
  taskId: string,
  state: 'submitted' | 'working' | 'completed' | 'failed' | 'canceled',
  reason?: string,
) =>
  apiRequest<{ ok?: boolean; task: A2ATaskRecord }>(
    `/api/a2a/tasks/${encodeURIComponent(taskId)}/state`,
    {
      method: 'PATCH',
      body: JSON.stringify({ state, ...(reason ? { reason } : {}) }),
    },
  );

export const pingA2AAgent = (agentId: string) =>
  apiRequest<A2APingResponse>(
    `/api/a2a/agents/${encodeURIComponent(agentId)}/ping`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );

export const fetchA2AConnectProfiles = (
  params: { nodeId?: string; deviceType?: string; tailscaleHost?: string } = {},
  signal?: AbortSignal,
) => {
  const sp = new URLSearchParams();
  if (params.nodeId) sp.set('nodeId', params.nodeId);
  if (params.deviceType) sp.set('deviceType', params.deviceType);
  if (params.tailscaleHost) sp.set('tailscaleHost', params.tailscaleHost);
  const qs = sp.toString();
  return apiRequest<A2AConnectProfilesResponse>(
    `/api/a2a/connect-profiles${qs ? `?${qs}` : ''}`,
    { cacheTtlMs: 5000, signal },
  );
};

export const fetchGithubOverview = (signal?: AbortSignal) =>
  apiRequest<GithubOverviewResponse>('/api/github/overview', { cacheTtlMs: 8000, signal });

export const dispatchGithubAgent = (payload: {
  kind: 'pr' | 'issue' | 'ci';
  number?: number;
  title: string;
  branch?: string;
  url?: string;
  action?: 'review' | 'fix-ci' | 'implement' | 'triage';
  targetAgentId?: string;
}) =>
  apiRequest<{ ok?: boolean; task: A2ATaskRecord }>('/api/github/dispatch-agent', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const cancelA2ATask = (taskId: string) =>
  apiRequest<{ ok?: boolean; task: A2ATaskRecord }>(
    `/api/a2a/tasks/${encodeURIComponent(taskId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );

export const fetchA2ALogs = (
  params: { agentId?: string; eventType?: string; level?: string; q?: string; limit?: number } = {},
  signal?: AbortSignal,
) => {
  const sp = new URLSearchParams();
  if (params.agentId && params.agentId !== 'all') sp.set('agentId', params.agentId);
  if (params.eventType && params.eventType !== 'all') sp.set('eventType', params.eventType);
  if (params.level && params.level !== 'all') sp.set('level', params.level);
  if (params.q) sp.set('q', params.q);
  if (params.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return apiRequest<{ ok?: boolean; total: number; items: A2ACollaborationLog[] }>(
    `/api/a2a/logs${qs ? `?${qs}` : ''}`,
    { cacheTtlMs: 0, signal },
  );
};

export const fetchA2ASwarmMetrics = (signal?: AbortSignal) =>
  apiRequest<{
    ok?: boolean;
    swarmMetrics: A2ASwarmMetrics;
    superAgentConfig: A2ASuperAgentConfig;
    superAgentTickets: A2ASuperAgentTicket[];
    contextSpillNodes: A2AContextSpillNode[];
    triggerEvents: A2ATriggerEvent[];
  }>('/api/a2a/swarm/metrics', { cacheTtlMs: 2000, signal });

export const updateSuperAgentConfig = (payload: Partial<Omit<A2ASuperAgentConfig, 'roles'>>) =>
  apiRequest<{
    ok?: boolean;
    superAgentConfig: A2ASuperAgentConfig;
    swarmMetrics: A2ASwarmMetrics;
  }>('/api/a2a/superagent/config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const ingestSuperAgentTrigger = (payload: {
  channel?: string;
  actor?: string;
  threadKey?: string;
  summary: string;
  isSelfOrigin?: boolean;
  isNoise?: boolean;
  targetAgentId?: string;
}) =>
  apiRequest<{
    ok?: boolean;
    trigger: A2ATriggerEvent;
    ticket: A2ASuperAgentTicket | null;
    swarmMetrics: A2ASwarmMetrics;
  }>('/api/a2a/superagent/triggers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const toggleSuperAgentContextSpill = (
  spillId: string,
  state?: 'inline' | 'spilled' | '',
) =>
  apiRequest<{
    ok?: boolean;
    node: A2AContextSpillNode;
    swarmMetrics: A2ASwarmMetrics;
  }>(`/api/a2a/superagent/context/${encodeURIComponent(spillId)}/toggle`, {
    method: 'POST',
    body: JSON.stringify(state ? { state } : {}),
  });

export const runSuperAgentWatchdogSweep = () =>
  apiRequest<{
    ok?: boolean;
    checkedCount: number;
    recoveredCount: number;
    recoveredTickets: A2ASuperAgentTicket[];
    superAgentTickets: A2ASuperAgentTicket[];
    swarmMetrics: A2ASwarmMetrics;
  }>('/api/a2a/superagent/watchdog/sweep', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const runDshTeamCollaboration = (payload: {
  prompt: string;
  channel?: string;
  consensusPolicy?: string;
  enableAutoSpill?: boolean;
  sessionId?: string;
}) =>
  apiRequest<{
    ok?: boolean;
    task: A2ATaskRecord;
    ticket: A2ASuperAgentTicket;
    policy: string;
    approved: boolean;
    spilledNode: A2AContextSpillNode | null;
    swarmMetrics: A2ASwarmMetrics;
  }>('/api/a2a/dsh-team/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export function openA2ALogStream(
  params: { agentId?: string; eventType?: string; level?: string },
  handlers: {
    onInit?: (items: A2ACollaborationLog[]) => void;
    onLog?: (entry: A2ACollaborationLog) => void;
    onStateChange?: (state: 'connecting' | 'live' | 'error') => void;
  },
): () => void {
  const sp = new URLSearchParams();
  if (params.agentId && params.agentId !== 'all') sp.set('agentId', params.agentId);
  if (params.eventType && params.eventType !== 'all') sp.set('eventType', params.eventType);
  if (params.level && params.level !== 'all') sp.set('level', params.level);
  const qs = sp.toString();
  const url = `/api/a2a/logs/stream${qs ? `?${qs}` : ''}`;

  handlers.onStateChange?.('connecting');
  const es = new EventSource(url, { withCredentials: true });

  es.addEventListener('init', (ev) => {
    handlers.onStateChange?.('live');
    try {
      const parsed = JSON.parse((ev as MessageEvent).data) as { items?: A2ACollaborationLog[] };
      if (Array.isArray(parsed?.items)) {
        handlers.onInit?.(parsed.items);
      }
    } catch {
      // ignore malformed frame
    }
  });

  es.addEventListener('a2a_log', (ev) => {
    handlers.onStateChange?.('live');
    try {
      const entry = JSON.parse((ev as MessageEvent).data) as A2ACollaborationLog;
      if (entry?.id) {
        handlers.onLog?.(entry);
      }
    } catch {
      // ignore malformed frame
    }
  });

  es.onerror = () => {
    handlers.onStateChange?.('error');
  };

  return () => {
    es.close();
  };
}

export const fetchAiOpsContext = (signal?: AbortSignal) =>
  apiRequest<AiOpsContextResponse>('/api/ai/context', { cacheTtlMs: 4000, signal });

export const runAiPreflight = (payload: AiPreflightRequest) =>
  apiRequest<AiPreflightResponse>('/api/ai/preflight', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ─── Linear AI Project Management & Commander-in-Chief ───────────────────────
export const fetchLinearState = (signal?: AbortSignal) =>
  apiRequest<LinearStateResponse>('/api/linear/state', { cacheTtlMs: 2500, signal });

export const updateLinearCommander = (patch: Partial<LinearCommanderConfig>) =>
  apiRequest<{ ok?: boolean; commander: LinearCommanderConfig }>('/api/linear/commander', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });

export const createLinearProject = (payload: {
  name: string;
  key?: string;
  summary?: string;
  leadAgentId?: string;
  githubRepo?: string;
  targetDate?: string;
}) =>
  apiRequest<{ ok?: boolean; project: LinearProjectItem }>('/api/linear/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createLinearIssue = (payload: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  cycleId?: string;
  parentId?: string | null;
  blockedBy?: string[];
  assigneeType?: string;
  assigneeId?: string;
  assigneeName?: string;
  labels?: string[] | string;
  estimate?: number;
}) =>
  apiRequest<{ ok?: boolean; issue: LinearIssueItem }>('/api/linear/issues', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateLinearIssue = (
  issueId: string,
  patch: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    projectId: string;
    cycleId: string | null;
    assigneeType: string;
    assigneeId: string;
    assigneeName: string;
    estimate: number;
    worktreeBranch: string | null;
    blockedBy: string[];
  }>,
) =>
  apiRequest<{ ok?: boolean; issue: LinearIssueItem }>(
    `/api/linear/issues/${encodeURIComponent(issueId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );

export const deleteLinearIssue = (issueId: string) =>
  apiRequest<{ ok?: boolean; id: string }>(`/api/linear/issues/${encodeURIComponent(issueId)}`, {
    method: 'DELETE',
  });

export const dispatchLinearCommander = (issueId: string) =>
  apiRequest<{
    ok?: boolean;
    issue: LinearIssueItem;
    createdSubIssues: LinearIssueItem[];
    dispatchedTask: A2ATaskRecord | null;
    commander: { id: string; name: string };
  }>(`/api/linear/issues/${encodeURIComponent(issueId)}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const updateLinearGithubConfig = (patch: Partial<LinearGithubConfig>) =>
  apiRequest<{ ok?: boolean; githubConfig: LinearGithubConfig }>('/api/linear/github/config', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });

export const syncLinearGithub = (direction?: string) =>
  apiRequest<{
    ok?: boolean;
    mode: string;
    repo: string;
    importedCount: number;
    updatedCount: number;
    syncedAt: string;
    summary: string;
    githubConfig: LinearGithubConfig;
  }>('/api/linear/github/sync', {
    method: 'POST',
    body: JSON.stringify(direction ? { direction } : {}),
  });

// ─── Bot Fleet & Multi-Channel Automation ────────────────────────────────────
export const fetchBots = (signal?: AbortSignal) =>
  apiRequest<BotFleetResponse>('/api/bots', { cacheTtlMs: 2500, signal });

export const createBot = (payload: {
  name: string;
  handle?: string;
  channel: string;
  role: string;
  description?: string;
  boundAgentId?: string;
  defaultProjectId?: string;
  webhookEnvVar?: string;
  triggerKeywords?: string[] | string;
  commands?: string[] | string;
  autoCreateIssue?: boolean;
  autoDispatchCommander?: boolean;
}) =>
  apiRequest<{ ok?: boolean; bot: BotItem }>('/api/bots', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateBot = (
  botId: string,
  patch: Partial<{
    name: string;
    enabled: boolean;
    boundAgentId: string;
    defaultProjectId: string;
    autoCreateIssue: boolean;
    autoDispatchCommander: boolean;
    description: string;
  }>,
) =>
  apiRequest<{ ok?: boolean; bot: BotItem }>(`/api/bots/${encodeURIComponent(botId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteBot = (botId: string) =>
  apiRequest<{ ok?: boolean; id: string }>(`/api/bots/${encodeURIComponent(botId)}`, {
    method: 'DELETE',
  });

export const triggerBotEvent = (
  botId: string,
  payload: {
    title?: string;
    message: string;
    priority?: string;
    dispatchCommander?: boolean;
  },
) =>
  apiRequest<{
    ok?: boolean;
    bot: BotItem;
    activity: BotActivityItem;
    createdIssue: LinearIssueItem | null;
    dispatchResult: {
      ok?: boolean;
      issue: LinearIssueItem;
      createdSubIssues: LinearIssueItem[];
    } | null;
  }>(`/api/bots/${encodeURIComponent(botId)}/trigger`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const logoutSession = () =>
  apiRequest('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
