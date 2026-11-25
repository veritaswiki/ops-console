export type ViewId =
  | 'overview'
  | 'fleet'
  | 'services'
  | 'memory'
  | 'agents'
  | 'network'
  | 'logs'
  | 'ops';

export type StatusTone = 'ok' | 'warn' | 'err' | 'muted';

export interface MetaResponse {
  appName?: string;
  version?: string;
  demo?: boolean;
  readOnly?: boolean;
  authenticated?: boolean;
  authEnabled?: boolean;
  features?: {
    actions?: boolean;
    remoteSsh?: boolean;
    probes?: boolean;
  };
  capabilities?: {
    actions?: boolean;
    remotes?: boolean;
    probes?: boolean;
  };
  logSources?: {
    services?: Array<{ id: string; name?: string; unit: string; scope?: string }>;
    files?: Array<{ id: string; name?: string; path?: string }>;
    memory?: Array<{ id: string; name?: string }>;
  };
  remotes?: Array<{
    id: string;
    name?: string;
    host?: string;
    role?: string;
    region?: string;
  }>;
}

export interface HostDisk {
  mount: string;
  fs?: string;
  usedPct?: number | null;
  usePercent?: number | null;
  usedBytes?: number | null;
  totalBytes?: number | null;
  sizeBytes?: number | null;
  availBytes?: number | null;
  used?: string;
  size?: string;
  avail?: string;
}

export interface HostSnapshot {
  hostname?: string;
  os?: string;
  platform?: string;
  kernel?: string;
  arch?: string;
  uptimeSec?: number;
  uptimeSeconds?: number;
  cpuCores?: number;
  load1?: number | null;
  load5?: number | null;
  load15?: number | null;
  cpu?: {
    cores?: number;
    usagePct?: number | null;
    load1?: number | null;
    load5?: number | null;
    load15?: number | null;
  };
  loadAvg?: number[];
  memory?: {
    usedPct?: number | null;
    usedPercent?: number | null;
    usedBytes?: number | null;
    totalBytes?: number | null;
    availBytes?: number | null;
  };
  disks?: HostDisk[];
}

export interface ServiceProbe {
  ok?: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
  url?: string;
}

export interface ServiceItem {
  id: string;
  name?: string;
  unit: string;
  scope?: string;
  layer?: string;
  role?: string;
  status?: string;
  activeState?: string;
  subState?: string;
  pid?: number | null;
  memoryBytes?: number | null;
  memoryCurrent?: number | null;
  ports?: string[];
  dependsOn?: string[];
  risk?: 'normal' | 'critical' | string;
  critical?: boolean;
  actions?: string[];
  allowedActions?: string[];
  probe?: ServiceProbe | null;
}

export interface TimerItem {
  id?: string;
  name?: string;
  unit: string;
  scope?: string;
  status?: string;
  activeState?: string;
  nextElapse?: string;
  lastTrigger?: string;
  serviceUnit?: string;
  actions?: string[];
}

export interface ConnectorSummary {
  id?: string;
  name: string;
  status?: string;
  reachable?: boolean;
  enabled?: boolean;
  latencyMs?: number | null;
  protocol?: string;
  summary?: string;
  detail?: string;
  error?: string;
}

export interface MemorySnapshot {
  nmem?: {
    enabled?: boolean;
    reachable?: boolean;
    status?: string;
    latencyMs?: number | null;
    protocol?: string;
    baseUrl?: string;
    version?: string;
    error?: string;
    stats?: {
      memories?: number;
      threads?: number;
      entities?: number;
      edges?: number;
      spaces?: number;
    };
    spaces?: Array<{ name?: string; id?: string; count?: number; memoryCount?: number }>;
    recentMemories?: Array<{ id?: string; title?: string; content?: string; space?: string; updatedAt?: string; createdAt?: string }>;
  };
  openviking?: {
    enabled?: boolean;
    reachable?: boolean;
    status?: string;
    latencyMs?: number | null;
    protocol?: string;
    baseUrl?: string;
    version?: string;
    error?: string;
    skillsCount?: number;
    skills?: Array<string | { name?: string; id?: string; description?: string }>;
    vikingdb?: {
      vectorCount?: number;
      collectionCount?: number;
      status?: string;
    };
    queue?: {
      pending?: number;
      processing?: number;
      failed?: number;
    };
  };
  symbiote?: {
    enabled?: boolean;
    reachable?: boolean;
    status?: string;
    latencyMs?: number | null;
    protocol?: string;
    baseUrl?: string;
    mode?: string;
    vaultPath?: string;
    vaultFileCount?: number;
    error?: string;
  };
  rerank?: {
    enabled?: boolean;
    reachable?: boolean;
    status?: string;
    latencyMs?: number | null;
    protocol?: string;
    baseUrl?: string;
    model?: string;
    device?: string;
    error?: string;
  };
}

export interface MagpieSnapshot {
  enabled?: boolean;
  reachable?: boolean;
  status?: string;
  latencyMs?: number | null;
  protocol?: string;
  baseUrl?: string;
  totalModels?: number;
  error?: string;
  providers?: Array<{ name: string; count: number; models?: string[] }>;
  agents?: Array<{
    name?: string;
    id?: string;
    type?: string;
    status?: string;
    model?: string;
    bridge?: string;
    active?: boolean;
  }>;
  bridges?: Array<{ name?: string; active?: boolean; target?: string; status?: string }>;
  library?: {
    mcpCount?: number;
    skillCount?: number;
    mcps?: Array<string | { name?: string; status?: string }>;
    summaryLines?: string[];
  };
}

export interface AgentProcess {
  pid: number;
  ppid?: number;
  user?: string;
  comm?: string;
  category?: string;
  categoryLabel?: string;
  cpu?: number;
  mem?: number;
  memoryBytes?: number;
  rssBytes?: number;
  elapsed?: string;
  cmd?: string;
  command?: string;
}

export interface TailscaleDevice {
  id?: string;
  name?: string;
  hostName?: string;
  dnsName?: string;
  os?: string;
  ip?: string;
  tailscaleIps?: string[];
  online?: boolean;
  active?: boolean;
  direct?: boolean;
  relay?: string;
  curAddr?: string;
  lastSeen?: string;
  rxBytes?: number;
  txBytes?: number;
  exitNode?: boolean;
  isSelf?: boolean;
}

export interface FirewallSnapshot {
  enabled?: boolean;
  status?: string;
  backend?: string;
  totalRules?: number;
  defaultPolicy?: Record<string, string>;
  summary?: {
    totalListeners?: number;
    publicListeners?: number;
    publicUnfiltered?: number;
    loopback?: number;
    tailnet?: number;
    loopbackListeners?: number;
    tailnetListeners?: number;
    droppedPackets?: number;
    droppedBytes?: number;
  };
  listeners?: Array<{
    proto?: string;
    bind?: string;
    address?: string;
    port?: number | string;
    process?: string;
    pid?: number;
    scope?: string;
    exposure?: string;
    posture?: string;
    guarded?: boolean;
    policy?: string;
    note?: string;
  }>;
  rules?: Array<{
    chain?: string;
    target?: string;
    proto?: string;
    source?: string;
    dest?: string;
    dport?: string;
    inIface?: string;
    packets?: number;
    bytes?: number;
    comment?: string;
    raw?: string;
  }>;
}

export interface NetworkSnapshot {
  tailscale?: {
    enabled?: boolean;
    reachable?: boolean;
    status?: string;
    latencyMs?: number | null;
    protocol?: string;
    backendState?: string;
    selfName?: string;
    selfIp?: string;
    tailnet?: string;
    onlineCount?: number;
    devices?: TailscaleDevice[];
    serve?: Array<{ path?: string; target?: string; port?: string | number; raw?: string }> | string[];
    serveRules?: Array<{ source?: string; target?: string; protocol?: string }>;
    error?: string;
  };
  mihomo?: {
    enabled?: boolean;
    reachable?: boolean;
    status?: string;
    latencyMs?: number | null;
    protocol?: string;
    version?: string;
    mode?: string;
    activeConnections?: number;
    uploadTotal?: number;
    downloadTotal?: number;
    memoryBytes?: number;
    proxyGroups?: Array<{ name: string; now?: string; type?: string; count?: number }>;
    error?: string;
  };
  syncthing?: {
    enabled?: boolean;
    reachable?: boolean;
    status?: string;
    latencyMs?: number | null;
    protocol?: string;
    version?: string;
    myId?: string;
    folders?: number;
    devices?: number;
    error?: string;
  };
  firewall?: FirewallSnapshot;
}

export interface FleetNode {
  id: string;
  name: string;
  deviceType?: 'hub' | 'server' | 'laptop' | 'mobile' | string;
  role?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  status?: string;
  os?: string;
  arch?: string;
  tailscaleIp?: string;
  probeMode?: string;
  probeVersion?: string;
  lastSeenAt?: string;
  lastHeartbeatAt?: string;
  ageSec?: number | null;
  uptimeSec?: number | null;
  cpu?: {
    usagePct?: number | null;
    cores?: number | null;
    load1?: number | null;
  };
  memory?: {
    usedPct?: number | null;
    usedBytes?: number | null;
    totalBytes?: number | null;
  };
  disk?: {
    usedPct?: number | null;
    mount?: string;
  };
  battery?: {
    percent?: number | null;
    charging?: boolean;
    state?: string;
  };
  network?: {
    rttMs?: number | null;
    relay?: string;
    direct?: boolean;
    ssid?: string;
    carrier?: string;
  };
  tags?: string[];
  services?: Array<{ name: string; status: string }>;
  note?: string;
  history?: Array<{
    ts?: number | string;
    cpuPct?: number;
    memPct?: number;
    rttMs?: number;
    batteryPct?: number;
  }>;
}

export interface FleetLink {
  from: string;
  to: string;
  kind?: string;
  active?: boolean;
  rttMs?: number | null;
}

export interface FleetSnapshot {
  summary?: {
    total?: number;
    online?: number;
    healthy?: number;
    degraded?: number;
    offline?: number;
    probed?: number;
    servers?: number;
    laptops?: number;
    mobiles?: number;
  };
  nodes?: FleetNode[];
  links?: FleetLink[];
}

export interface IncidentItem {
  id?: string | number;
  ts?: string;
  timestamp?: string;
  entityKey?: string;
  node?: string;
  kind?: string;
  component?: string;
  target?: string;
  severity?: string;
  fromState?: string;
  toState?: string;
  fromStatus?: string;
  toStatus?: string;
  from?: string;
  to?: string;
  detail?: string;
  message?: string;
  summary?: string;
}

export interface AlertItem {
  id?: string;
  severity?: string;
  level?: string;
  component?: string;
  title?: string;
  message?: string;
  ts?: string;
}

export interface SnapshotResponse {
  ts?: string;
  generatedAt?: string;
  demo?: boolean;
  host?: HostSnapshot;
  services?: {
    summary?: {
      total?: number;
      healthy?: number;
      degraded?: number;
      failed?: number;
      standby?: number;
    };
    items?: ServiceItem[];
    timers?: TimerItem[];
  };
  timers?: TimerItem[];
  connectors?: ConnectorSummary[];
  memory?: MemorySnapshot;
  magpie?: MagpieSnapshot;
  agents?: {
    processes?: AgentProcess[];
    total?: number;
  };
  network?: NetworkSnapshot;
  firewall?: FirewallSnapshot;
  fleet?: FleetSnapshot;
  incidents?: IncidentItem[];
  alerts?: AlertItem[];
  jobs?: Array<{ id?: string; name?: string; status?: string; startedAt?: string; summary?: string }>;
}

export interface ProbesResponse {
  probes?: Array<{
    id: string;
    name?: string;
    deviceType?: string;
    region?: string;
    role?: string;
    status?: string;
    createdAt?: string;
    lastSeenAt?: string;
    tokenPrefix?: string;
  }>;
}

export interface LogEntry {
  ts?: string;
  timestamp?: string;
  level?: string;
  severity?: string;
  source?: string;
  unit?: string;
  message?: string;
  raw?: string;
}

export interface LogsResponse {
  entries?: LogEntry[];
  items?: LogEntry[];
  lines?: LogEntry[];
  counts?: {
    error?: number;
    warn?: number;
    info?: number;
    debug?: number;
    total?: number;
  };
  source?: string;
  target?: string;
}

export interface AuditEntry {
  ts?: string;
  timestamp?: string;
  actor?: string;
  action?: string;
  target?: string;
  ok?: boolean;
  status?: string;
  result?: string;
  durationMs?: number;
  detail?: string;
  ip?: string;
}

export interface RemoteHostStatus {
  id: string;
  name?: string;
  host?: string;
  region?: string;
  role?: string;
  ok?: boolean;
  reachable?: boolean;
  status?: string;
  latencyMs?: number;
  uptime?: string;
  load?: string;
  memory?: string;
  disk?: string;
  error?: string;
}

export interface MemorySearchResultItem {
  provider?: string;
  engine?: string;
  title?: string;
  uri?: string;
  path?: string;
  space?: string;
  score?: number | null;
  snippet?: string;
  content?: string;
  updatedAt?: string;
}
