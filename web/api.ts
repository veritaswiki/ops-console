import type {
  AlertEvent,
  AlertRule,
  AlertsStateResponse,
  AuditEntry,
  ConfigStudioResponse,
  GatewayTelemetryResponse,
  IncidentItem,
  LogsResponse,
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
