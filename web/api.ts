import type {
  AuditEntry,
  IncidentItem,
  LogsResponse,
  MemorySearchResultItem,
  MetaResponse,
  ProbesResponse,
  RemoteHostStatus,
  SnapshotResponse,
} from './types';

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
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
  return data as T;
}

export const fetchMeta = () => apiRequest<MetaResponse>('/api/meta');

export const fetchSnapshot = (force = false) =>
  apiRequest<SnapshotResponse>(force ? '/api/snapshot?force=1' : '/api/snapshot');

export const fetchProbes = () => apiRequest<ProbesResponse>('/api/probes');

export const fetchIncidents = (limit = 30) =>
  apiRequest<{ items?: IncidentItem[]; incidents?: IncidentItem[]; stats?: { count?: number; retentionDays?: number } }>(
    `/api/incidents?limit=${limit}`,
  );

export const fetchAudit = (limit = 40) =>
  apiRequest<{ items?: AuditEntry[]; entries?: AuditEntry[] }>(`/api/audit?limit=${limit}`);

export const fetchLogs = (params: {
  source: string;
  target: string;
  since: string;
  level: string;
  q: string;
  regex: boolean;
  lines?: number;
}) => {
  const qs = new URLSearchParams();
  qs.set('source', params.source);
  if (params.target) qs.set('target', params.target);
  if (params.since) qs.set('since', params.since);
  if (params.level && params.level !== 'all') qs.set('level', params.level);
  if (params.q.trim()) qs.set('q', params.q.trim());
  if (params.regex) qs.set('regex', '1');
  qs.set('lines', String(params.lines ?? 200));
  return apiRequest<LogsResponse>(`/api/logs?${qs.toString()}`);
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

export const executeServiceAction = (
  serviceId: string,
  action: string,
  confirmToken?: string,
) =>
  apiRequest<{ ok?: boolean; message?: string; output?: string }>(
    `/api/services/${encodeURIComponent(serviceId)}/action`,
    {
      method: 'POST',
      body: JSON.stringify(confirmToken ? { action, confirmToken } : { action }),
    },
  );

export const executeTimerAction = (unit: string, action: string) =>
  apiRequest<{ ok?: boolean; message?: string; output?: string }>(
    `/api/timers/${encodeURIComponent(unit)}/action`,
    {
      method: 'POST',
      body: JSON.stringify({ action }),
    },
  );

export const runOpsAction = (action: 'health-check' | 'backup') =>
  apiRequest<{ ok?: boolean; output?: string; message?: string }>(`/api/ops/${action}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const probeRemotes = () =>
  apiRequest<{ items?: RemoteHostStatus[]; remotes?: RemoteHostStatus[] }>('/api/remotes/probe', {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const submitMobileCheckin = (payload: {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  batteryPct?: number | null;
  note?: string;
}) =>
  apiRequest<{ ok?: boolean; node?: unknown }>('/api/nodes/checkin', {
    method: 'POST',
    body: JSON.stringify(payload),
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
