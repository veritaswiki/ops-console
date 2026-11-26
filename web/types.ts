export type ViewId =
  | 'overview'
  | 'alerts'
  | 'fleet'
  | 'services'
  | 'plugins'
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
  pluginsCount?: number;
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
  note?: string;
  resolvedAt?: string | null;
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
  plugins?: SnapshotPluginItem[];
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
  activeAlertsCount?: number;
  sseConnectedClients?: number;
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

export type MetricsRange = '1h' | '6h' | '24h' | '7d' | '30d';

export interface MetricsSeriesPoint {
  ts: number;
  cpuPct?: number | null;
  memPct?: number | null;
  diskPct?: number | null;
  load1?: number | null;
  rttMs?: number | null;
  servicesOkPct?: number | null;
}

export interface MetricsSeriesResponse {
  ok?: boolean;
  series: string;
  range: MetricsRange | string;
  source: string;
  points: MetricsSeriesPoint[];
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'eq' | string;
  threshold: number;
  forMinutes: number;
  cooldownMinutes: number;
  severity: 'critical' | 'warning' | 'info' | string;
  channel: string;
  channelTarget?: string;
  enabled: boolean;
  builtin?: boolean;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'warning' | 'info' | string;
  metric: string;
  value: number;
  threshold: number;
  channel: string;
  status: 'active' | 'acked' | 'resolved' | string;
  firedAt: string;
  ackedAt?: string | null;
  ackedBy?: string | null;
  summary: string;
}

export interface SlaServiceEntry {
  id: string;
  name: string;
  layer: string;
  uptimePct: number;
  incidents: number;
  downtimeMin: number;
  status: string;
}

export interface SlaSummary {
  windowDays: number;
  overallUptimePct: number;
  mttrMinutes: number;
  totalIncidents: number;
  openIncidents: number;
  totalDowntimeMin: number;
  services: SlaServiceEntry[];
}

export interface AlertsStateResponse {
  ok?: boolean;
  silenced: boolean;
  silenceUntil: string | null;
  rules: AlertRule[];
  alerts: AlertEvent[];
  activeCount: number;
  sla: SlaSummary;
  supportedMetrics: string[];
  supportedChannels: string[];
}

export interface GatewayTelemetryResponse {
  ok?: boolean;
  window: string;
  summary: {
    totalRequests: number;
    totalTokens: number;
    avgTtftMs: number;
    p95LatencyMs: number;
    cacheHitPct: number;
    estimatedCostUsd24h: number;
    dailyBudgetUsd: number;
    errorRatePct: number;
  };
  providers: Array<{
    name: string;
    requests: number;
    tokensK: number;
    avgTtftMs: number;
    errorRatePct: number;
    costUsd: number;
    circuitState: string;
  }>;
  sessions: Array<{
    id: string;
    agent: string;
    model: string;
    state: string;
    contextPct: number;
    toolCalls: number;
    failedTools: number;
    uptimeSec: number;
    memoryMb: number;
  }>;
  accelerators: Array<{
    id: string;
    name: string;
    backend: string;
    vramUsedGb: number;
    vramTotalGb: number;
    utilizationPct: number;
    tempC: number;
    activeModels: string[];
  }>;
  hourly: Array<{
    ts: number;
    rpm: number;
    promptK: number;
    completionK: number;
    cacheHitPct: number;
    ttftMs: number;
    p95Ms: number;
    costUsd: number;
    errors429: number;
    errors5xx: number;
  }>;
}

export interface MemoryCompareResponse {
  ok?: boolean;
  query: string;
  timingsMs: {
    nmem: number;
    openviking: number;
    rerank: number;
    total: number;
  };
  items: Array<{
    id: string;
    title: string;
    snippet: string;
    nmemScore: number;
    ovScore: number;
    rerankScore: number;
    delta: number;
    source: string;
  }>;
}

export interface RunbookStepDef {
  id: string;
  label: string;
  action: string;
  target: string;
}

export interface RunbookDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  approvalMode: 'manual' | 'auto-guarded' | string;
  maxAutoRunsPerHour: number;
  recentRunsLastHour?: number;
  risk: string;
  steps: RunbookStepDef[];
}

export interface RunbookExecution {
  id: string;
  runbookId: string;
  runbookName: string;
  ok: boolean;
  startedAt: string;
  durationMs: number;
  actor: string;
  steps: Array<{
    id: string;
    label: string;
    ok: boolean;
    durationMs: number;
    detail: string;
  }>;
}

export interface RunbooksResponse {
  ok?: boolean;
  runbooks: RunbookDefinition[];
  runs: RunbookExecution[];
}

export interface ProbeCommandItem {
  id: string;
  nodeId: string;
  command: string;
  status: 'queued' | 'delivered' | string;
  actor: string;
  createdAt: string;
  expiresAt: string;
  deliveredAt?: string;
}

export interface ConfigStudioResponse {
  ok?: boolean;
  config: Record<string, unknown> & {
    rbacPosture?: {
      currentActor: string;
      roles: Array<{ role: string; permissions: string[]; active: boolean }>;
      ssoAdapters: string[];
    };
  };
  sudoersPreview: string;
  prometheusEndpoint: string;
}

export interface PluginCategoryMeta {
  id: string;
  label: string;
}

export interface PluginConfigField {
  key: string;
  label: string;
  type: 'string' | 'url' | 'secret' | 'number' | 'boolean' | 'cli' | string;
  default?: unknown;
  placeholder?: string;
  description?: string;
  required?: boolean;
}

export interface PluginOfficialSpec {
  protocol: string;
  docsUrl?: string;
  endpoints?: string[];
  auth?: string;
}

export interface PluginHandshakeStep {
  step: string;
  ok: boolean;
  status?: number;
  latencyMs?: number | null;
  detail?: string;
}

export interface PluginCatalogItem {
  id: string;
  name: string;
  version: string;
  category: string;
  slot?: string;
  source: 'builtin' | 'user-custom' | 'external' | string;
  legacyKey?: string | null;
  description: string;
  officialSpec: PluginOfficialSpec;
  capabilities: string[];
  configSchema: PluginConfigField[];
  config: Record<string, unknown>;
  enabled: boolean;
  status: string;
  reachable: boolean;
  latencyMs: number | null;
  summary: string;
  details?: {
    protocolVersion?: string | null;
    toolsCount?: number | null;
    resourcesCount?: number | null;
    skillsCount?: number | null;
    totalModels?: number | null;
    tools?: Array<{ name?: string; description?: string } | string>;
    skills?: Array<{ name?: string; description?: string } | string>;
  } | null;
  error?: string | null;
}

export interface PluginsResponse {
  ok?: boolean;
  categories: PluginCategoryMeta[];
  pluginsDir?: string;
  externalLoadErrors?: Array<{ id: string; error: string }>;
  summary: {
    total: number;
    enabled: number;
    healthy: number;
    custom: number;
  };
  items: PluginCatalogItem[];
}

export interface PluginTestResult {
  ok: boolean;
  id: string;
  reachable: boolean;
  status: string;
  latencyMs: number | null;
  protocol: string;
  summary: string;
  steps: PluginHandshakeStep[];
  error?: string | null;
  testedAt: string;
}

export interface SnapshotPluginItem {
  id: string;
  name: string;
  category: string;
  source: string;
  protocol: string;
  status: string;
  reachable: boolean;
  latencyMs: number | null;
  summary: string;
  details?: Record<string, unknown>;
}

