export type ViewId =
  | 'agents'
  | 'projects'
  | 'graph'
  | 'bots'
  | 'github'
  | 'agent-settings'
  | 'overview'
  | 'alerts'
  | 'fleet'
  | 'services'
  | 'plugins'
  | 'mcp'
  | 'memory'
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
    units?: Array<{
      id: string;
      name?: string;
      unit: string;
      scope?: string;
      layer?: string;
      hasLogFile?: boolean;
      logFileId?: string | null;
    }>;
    services?: Array<{
      id: string;
      name?: string;
      unit: string;
      scope?: string;
      layer?: string;
      hasLogFile?: boolean;
      logFileId?: string | null;
    }>;
    files?: Array<{ id: string; name?: string; path?: string; serviceId?: string; unit?: string }>;
    memory?: Array<{ id: string; name?: string; unit?: string }>;
    builtin?: Array<{ id: string; name: string }>;
    limits?: {
      maxLines: number;
      defaultMaxBytesPerFile: number;
      maxBytesPerFile: number;
      maxSseStreams: number;
    };
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
  healthUrl?: string | null;
  tailnetUrl?: string | null;
  adminUrl?: string | null;
  adminLabel?: string | null;
  embedUrl?: string | null;
  hasAdminUi?: boolean;
  hasLogFile?: boolean;
  logFileId?: string | null;
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
  exitNodeOption?: boolean;
  expired?: boolean;
  keyExpiry?: string | null;
  primaryRoutes?: string[];
  isSelf?: boolean;
}

export interface TailscaleServeRule {
  url?: string;
  path?: string;
  target?: string;
  scope?: string;
}

export interface TailscaleNetcheckResult {
  ok: boolean;
  udp?: boolean;
  ipv4?: boolean;
  ipv6?: boolean;
  mappingVariesByDestIp?: boolean;
  preferredDerp?: string;
  captivePortal?: boolean;
  derpRegions?: Array<{ regionId: string; latencyMs: number | null }>;
  checkedAt?: string;
  error?: string;
}

export interface TailscalePingResult {
  target: string;
  ok: boolean;
  latencyMs?: number | null;
  direct?: boolean;
  relay?: string;
  via?: string;
  raw?: string;
  error?: string;
}

export interface CloudflareTunnelItem {
  id: string;
  name: string;
  createdAt?: string | null;
  connectionsCount: number;
  edgeColos?: string[];
  status: string;
}

export interface CloudflareIngressRule {
  hostname: string;
  path?: string;
  service: string;
  scope?: string;
}

export interface CloudflareLanRoute {
  id?: string;
  name: string;
  cidr?: string;
  hostname?: string;
  target?: string;
  comment?: string;
  scope?: string;
}

export interface CloudflareSnapshot {
  id?: string;
  name?: string;
  enabled?: boolean;
  protocol?: string;
  reachable?: boolean;
  status?: string;
  cloudflared?: {
    installed?: boolean;
    version?: string;
    serviceActive?: boolean;
    serviceScope?: string;
    serviceState?: string;
    configDetected?: boolean;
  };
  warp?: {
    installed?: boolean;
    version?: string;
    connected?: boolean;
    state?: string;
    reason?: string;
  };
  warpRouting?: boolean;
  tunnelName?: string;
  tunnels?: CloudflareTunnelItem[];
  activeTunnelsCount?: number;
  ingress?: CloudflareIngressRule[];
  lanRoutes?: CloudflareLanRoute[];
  dashboardUrl?: string;
  setupHints?: Array<{ id: string; title: string; command: string; note?: string }>;
  error?: string;
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
    version?: string;
    selfName?: string;
    selfIp?: string;
    selfIps?: string[];
    selfDnsName?: string;
    tailnet?: string;
    magicDnsSuffix?: string;
    health?: string[];
    funnelCapable?: boolean;
    exitNodeStatus?: { id?: string; online?: boolean; tailscaleIps?: string[] } | null;
    directCount?: number;
    relayCount?: number;
    derpSummary?: Array<{ region: string; count: number; onlineCount: number }>;
    onlineCount?: number;
    devices?: TailscaleDevice[];
    serves?: TailscaleServeRule[];
    funnels?: TailscaleServeRule[];
    serve?: Array<{ path?: string; target?: string; port?: string | number; raw?: string }> | string[];
    serveRules?: Array<{ source?: string; target?: string; protocol?: string }>;
    adminConsoleUrl?: string;
    error?: string;
  };
  cloudflare?: CloudflareSnapshot;
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
  kernel?: string;
  provider?: string;
  tailscaleIp?: string;
  tailscaleDns?: string;
  probeMode?: string;
  probeVersion?: string;
  lastSeenAt?: string;
  lastHeartbeatAt?: string;
  ageSec?: number | null;
  probeAgeSec?: number | null;
  uptimeSec?: number | null;
  rttMs?: number | null;
  statusReason?: string | null;
  offlineReason?: string | null;
  offlineCategory?: string | null;
  externalProbe?: {
    port?: number | null;
    protocol?: string;
    reachable?: boolean;
    rttMs?: number | null;
    errorCode?: string | null;
    error?: string | null;
    checkedAt?: string | null;
  } | null;
  cpu?: {
    usagePct?: number | null;
    cores?: number | null;
    load1?: number | null;
    load5?: number | null;
    load15?: number | null;
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
  disks?: Array<{
    mount: string;
    totalBytes?: number | null;
    usedBytes?: number | null;
    usedPct?: number | null;
    summary?: string;
  }>;
  battery?: {
    percent?: number | null;
    charging?: boolean;
    state?: string;
    source?: string;
  };
  network?: {
    rttMs?: number | null;
    relay?: string;
    direct?: boolean;
    rxBytesPerSec?: number | null;
    txBytesPerSec?: number | null;
    type?: string;
    ssid?: string;
    carrier?: string;
  };
  tags?: string[];
  services?: Array<{ name: string; status: string; unit?: string; role?: string; memoryMb?: number | null }>;
  watchedServices?: Array<{ name: string; status: string; unit?: string; role?: string; memoryMb?: number | null }>;
  mcps?: Array<{
    id: string;
    name: string;
    transport: string;
    endpoint?: string | null;
    command?: string | null;
    enabled: boolean;
    status: string;
    toolsCount?: number;
    latencyMs?: number | null;
    syncState?: string;
    scope?: string;
  }>;
  harnesses?: Array<{
    id: string;
    name: string;
    harness: string;
    role: 'lead' | 'worker' | string;
    status: string;
    delegatable?: boolean;
    protocolVersion?: string;
    modelHint?: string | null;
    skillsCount?: number;
    boundMcpIds?: string[];
    latencyMs?: number | null;
  }>;
  agentsCount?: number;
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
  cloudflare?: CloudflareSnapshot;
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

export type LogSourceKind = 'unified' | 'service' | 'file' | 'self' | 'audit';

export interface LogFilterState {
  source: LogSourceKind;
  target: string;
  targets: string[];
  since: string;
  level: string;
  query: string;
  regex: boolean;
}

export type LogNavigationRequest = Partial<LogFilterState> & {
  unit?: string;
};

export interface LogEntry {
  ts?: string;
  timestamp?: string;
  level?: string;
  severity?: string;
  source?: string;
  sourceKind?: 'journald' | 'file' | 'self' | 'audit' | string;
  sourceId?: string;
  sourceLabel?: string;
  serviceId?: string;
  serviceName?: string;
  unit?: string;
  pid?: string;
  message?: string;
  raw?: string;
}

export interface LogSourceStats {
  id: string;
  name: string;
  unit?: string;
  serviceId?: string;
  sourceKind: 'journald' | 'file' | 'self' | 'audit' | string;
  count: number;
  readBytes: number;
  fileSizeBytes: number;
  truncated: boolean;
  elapsedMs: number;
  warning?: string;
}

export interface LogQueryStats {
  directRead: boolean;
  elapsedMs: number;
  totalReadBytes: number;
  sourcesQueried: number;
  truncatedSources: number;
  maxBytesPerFile: number;
  maxLines: number;
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
  targets?: string[];
  sources?: LogSourceStats[];
  stats?: LogQueryStats;
  warning?: string;
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

export interface FleetMcpTool {
  name: string;
  description?: string;
}

export interface FleetMcpServer {
  id: string;
  templateId?: string | null;
  name: string;
  nodeId: string;
  nodeName: string;
  transport: 'streamable-http' | 'stdio' | 'sse' | string;
  endpoint?: string | null;
  command?: string | null;
  args?: string[];
  envRefs?: string[];
  scope?: string;
  enabled: boolean;
  status: string;
  protocolVersion?: string;
  latencyMs?: number | null;
  toolsCount: number;
  resourcesCount?: number;
  tools?: FleetMcpTool[];
  lastCheckedAt?: string;
  syncState?: string;
  description?: string;
}

export interface McpFleetResponse {
  ok?: boolean;
  summary: {
    total: number;
    enabled: number;
    online: number;
    degraded: number;
    nodesCovered: number;
    totalTools: number;
    byTransport: Record<string, number>;
  };
  byNode: Array<{
    nodeId: string;
    nodeName: string;
    total: number;
    online: number;
    toolsCount: number;
  }>;
  items: FleetMcpServer[];
}

export interface McpTestResult {
  ok: boolean;
  id: string;
  nodeId: string;
  transport: string;
  reachable: boolean;
  status: string;
  latencyMs: number | null;
  protocolVersion?: string;
  toolsCount?: number;
  summary?: string;
  error?: string;
  testedAt: string;
}

export type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh';
export type OrchestrationMode = 'lead-router' | 'swarm' | 'main-sub';

export interface A2AAgentSkill {
  id: string;
  name: string;
  description?: string;
}

export interface A2AAgentPeer {
  id: string;
  name: string;
  harness: string;
  nodeId: string;
  nodeName: string;
  role: 'lead' | 'worker' | string;
  delegatable: boolean;
  status: string;
  protocolVersion: string;
  version?: string;
  latestVersion?: string;
  updateAvailable?: boolean;
  installPath?: string | null;
  autoDetected?: boolean;
  pluginKind?: 'harness' | 'dsh-review-plugin' | string;
  agentCardUrl?: string | null;
  rpcUrl?: string | null;
  modelHint?: string | null;
  reasoningEffort?: ReasoningEffort;
  position?: { x: number; y: number };
  capabilities?: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
  skills: A2AAgentSkill[];
  boundMcpIds: string[];
  latencyMs?: number | null;
  lastVerifiedAt?: string;
  description?: string;
}

export interface A2ARoutingRule {
  id: string;
  name: string;
  sourceAgentId: string;
  targetAgentId: string;
  taskCategory: string;
  matchKeywords: string[];
  targetModel: string;
  reasoningEffort: ReasoningEffort;
  priority: number;
  enabled: boolean;
  requireDshReview: boolean;
}

export interface A2AOrchestrationConfig {
  mode: OrchestrationMode;
  mainModel: string;
  mainEffort: ReasoningEffort;
  subModel: string;
  subEffort: ReasoningEffort;
  worktreeIsolation: boolean;
  dshReviewGate: {
    enabled: boolean;
    minScore: number;
    autoGateHighRisk: boolean;
    dimensions: string[];
  };
}

export interface A2ASkillCatalogItem {
  id: string;
  name: string;
  version: string;
  latestVersion: string;
  provider: 'dsh-plugin' | 'pi-skill' | 'claude-skill' | 'codex-skill' | 'a2a-card' | string;
  description?: string;
  enabled: boolean;
  assignedAgentIds: string[];
}

export interface A2ASessionRecord {
  id: string;
  contextId: string;
  title: string;
  primaryAgentId: string;
  participatingAgentIds: string[];
  syncedNodes: string[];
  syncMode: 'a2a-context-bus' | 'nmem-shared' | 'git-worktree' | string;
  gitBranch: string;
  worktreePath?: string;
  revision: number;
  state: 'synced' | 'syncing' | 'drift' | string;
  lastSyncedAt: string;
  messageCount: number;
  summary?: string;
}

export interface A2ATaskSubtask {
  id: string;
  agentId: string;
  agentName: string;
  role: string;
  model: string;
  effort: ReasoningEffort | string;
  state: string;
  worktree?: string | null;
  summary: string;
}

export interface A2ADshReviewVerdict {
  reviewerId: string;
  reviewerName: string;
  model: string;
  effort: ReasoningEffort | string;
  score: number;
  verdict: 'approve' | 'changes_requested' | 'block' | string;
  dimensions: Array<{ name: string; score: number }>;
  findings: string[];
}

export interface A2ATaskStep {
  ts: string;
  state: string;
  detail: string;
}

export interface A2ATaskRecord {
  id: string;
  contextId?: string;
  parentTaskId?: string | null;
  slashCommand?: string | null;
  protocolMethod: string;
  executionMode?: OrchestrationMode | string;
  state: 'submitted' | 'working' | 'completed' | 'failed' | 'canceled' | string;
  prompt: string;
  leadAgentId: string;
  leadAgentName: string;
  leadNodeId: string;
  workerAgentId: string;
  workerAgentName: string;
  workerNodeId: string;
  matchedRuleId?: string | null;
  matchedRuleName?: string | null;
  matchedSkill?: string;
  appliedModel?: string;
  appliedEffort?: ReasoningEffort | string;
  worktreeBranch?: string | null;
  mcpScope?: string[];
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  actor?: string;
  subtasks?: A2ATaskSubtask[];
  dshReview?: A2ADshReviewVerdict | null;
  steps: A2ATaskStep[];
  artifact?: string;
}

export interface A2ACollaborationLog {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error' | 'debug' | string;
  eventType:
    | 'a2a.delegate'
    | 'swarm.fanout'
    | 'dsh.review_vote'
    | 'dsh.gate_verdict'
    | 'superagent.fast_path'
    | 'superagent.route'
    | 'context.spill'
    | 'context.recall'
    | 'watchdog.check'
    | 'session.sync'
    | 'session.handoff'
    | string;
  sourceAgentId: string;
  sourceAgentName: string;
  targetAgentId: string;
  targetAgentName: string;
  taskId?: string | null;
  contextId?: string | null;
  worktreeBranch?: string | null;
  model?: string | null;
  effort?: ReasoningEffort | string | null;
  latencyMs?: number | null;
  spillRefId?: string | null;
  summary: string;
  detail: string;
}

export interface A2ASuperAgentRole {
  id: string;
  title: string;
  agentId: string;
  weight: number;
}

export interface A2ASuperAgentConfig {
  routerThinMode: boolean;
  fastPathEnabled: boolean;
  subscriptionPassthrough: boolean;
  inlineBudgetKb: number;
  watchdogStallSec: number;
  attentionBudgetLimit: number;
  consensusPolicy: 'weighted' | 'unanimous' | 'lead-override' | string;
  maxReworkRounds: number;
  roles: A2ASuperAgentRole[];
}

export interface A2ASuperAgentTicket {
  id: string;
  threadKey: string;
  channel: 'github' | 'ci' | 'feishu' | 'alert' | 'webhook' | string;
  title: string;
  status: 'running' | 'review_gate' | 'stalled' | 'completed' | 'needs_attention' | string;
  pathTaken: 'slow_spawn' | 'fast_passthrough' | string;
  workerAgentId: string;
  workerAgentName: string;
  worktreeBranch: string;
  subscribed: boolean;
  inlineBytes: number;
  spilledCount: number;
  lastProgressAt: string;
  watchdogState: 'healthy' | 'stalled' | 'recovered' | string;
  dshScore?: number | null;
  updatedAt: string;
}

export interface A2AContextSpillNode {
  spillId: string;
  ticketId: string;
  threadKey: string;
  parentRef: string;
  label: string;
  state: 'spilled' | 'inline' | string;
  bytes: number;
  preview: string;
  recallCount: number;
  updatedAt: string;
}

export interface A2ATriggerEvent {
  id: string;
  ts: string;
  channel: 'github' | 'ci' | 'feishu' | 'alert' | 'webhook' | string;
  actor: string;
  threadKey: string;
  summary: string;
  decision: 'fast_drop' | 'fast_passthrough' | 'slow_spawn' | string;
  reason: string;
  ticketId?: string | null;
  tokensSaved: number;
}

export interface A2ASwarmPerAgentStat {
  agentId: string;
  name: string;
  harness: string;
  role: 'lead' | 'worker' | string;
  handledUnits: number;
  subtasks: number;
  collabEvents: number;
  latencyMs: number;
}

export interface A2ASwarmMetrics {
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  totalSubtasks: number;
  totalWorkUnits: number;
  taskToAgentThroughputRatio: number;
  parallelSpeedup: number;
  avgDurationMs: number;
  fastPathOffloadPct: number;
  fastDropCount: number;
  fastPassthroughCount: number;
  slowSpawnCount: number;
  routerTokensSaved: number;
  contextSavedKb: number;
  inlineContextKb: number;
  spilledNodesCount: number;
  totalSpillNodes: number;
  activeTickets: number;
  stalledTickets: number;
  needsAttentionCount: number;
  attentionBudgetLimit: number;
  dshConsensusRate: number;
  perAgentStats: A2ASwarmPerAgentStat[];
}

export interface A2AStateResponse {
  ok?: boolean;
  architecture: {
    harnessFree: boolean;
    protocol: string;
    protocolVersion: string;
    license: string;
    governance: string;
    summary: string;
  };
  leadAgentId: string | null;
  leadAgent: A2AAgentPeer | null;
  orchestrationConfig: A2AOrchestrationConfig;
  summary: {
    totalAgents: number;
    onlineAgents: number;
    delegatableWorkers: number;
    nodesWithAgents: number;
    activeTasks: number;
    completedTasks: number;
    totalTasks: number;
    enabledRules?: number;
    totalRules?: number;
    totalSkills?: number;
    syncedSessions?: number;
    totalSessions?: number;
    outdatedAgents?: number;
  };
  agents: A2AAgentPeer[];
  routingRules: A2ARoutingRule[];
  skillCatalog: A2ASkillCatalogItem[];
  sessions: A2ASessionRecord[];
  tasks: A2ATaskRecord[];
  superAgentConfig?: A2ASuperAgentConfig;
  superAgentTickets?: A2ASuperAgentTicket[];
  contextSpillNodes?: A2AContextSpillNode[];
  triggerEvents?: A2ATriggerEvent[];
  swarmMetrics?: A2ASwarmMetrics;
  recentLogsCount?: number;
}

export interface AiPitfallRecord {
  id: string;
  project: string;
  repo: string;
  category: string;
  severity: 'high' | 'medium' | 'low' | string;
  title: string;
  pitfall: string;
  mitigation: string;
  enforcedBy: string;
}

export interface AiLayerBoundary {
  id: string;
  layer: string;
  label: string;
  riskLevel: 'high' | 'medium' | 'low' | string;
  summary: string;
  paths: string[];
  rules: string[];
}

export interface AiCoupledRule {
  id: string;
  label: string;
  triggers: string[];
  mustSync: string[];
  verifyCommand: string;
}

export interface AiOpsContextResponse {
  ok?: boolean;
  schemaVersion: string;
  generatedAt: string;
  version: string;
  mode: {
    demo: boolean;
    readOnly: boolean;
    authEnabled: boolean;
  };
  liveSummary: {
    servicesTotal: number;
    servicesHealthy: number;
    criticalServices: string[];
    fleetNodesTotal: number;
    fleetNodesOnline: number;
    activeAlerts: number;
    mcpServersTotal: number;
    mcpToolsTotal: number;
    mcpToolCeiling: number;
    mcpToolCeilingExceeded: boolean;
    a2aLeadAgentId: string | null;
    a2aAgentsTotal: number;
    a2aActiveTasks: number;
    stalledTickets: number;
    activeWorktrees: string[];
  };
  boundaries: AiLayerBoundary[];
  coupledRules: AiCoupledRule[];
  invariants: string[];
  pitfalls: AiPitfallRecord[];
  worktreePolicy: {
    isolatedBranchRequired: boolean;
    protectedBranches: string[];
    ignoredWorktreeDirs: string[];
    pruneCommand: string;
  };
  verificationCommands: string[];
}

export type AiPreflightVerdict = 'allow' | 'confirm_required' | 'block';

export interface AiPreflightCheck {
  id: string;
  status: 'pass' | 'warn' | 'confirm_required' | 'block' | string;
  title: string;
  detail: string;
  pitfallRef?: string;
}

export interface AiPreflightRequest {
  actionType: 'code-patch' | 'service-action' | 'config-edit' | 'worktree-dispatch' | 'mcp-sync' | string;
  target?: string;
  summary?: string;
  worktreeBranch?: string;
  files?: string[] | string;
  command?: string;
  mcpToolsCount?: number;
  dirtyMainCheckout?: boolean;
  confirmToken?: string;
  rawConfigJson?: string;
}

export interface AiPreflightResponse {
  ok?: boolean;
  checkedAt: string;
  actionType: string;
  target: string | null;
  verdict: AiPreflightVerdict;
  blastRadius: 'low' | 'medium' | 'high' | string;
  safetyScore: number;
  checks: AiPreflightCheck[];
  coupledFiles: string[];
  rollbackPlan: string;
  recommendedCommands: string[];
}

export type LinearIssueStatus =
  | 'triage'
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'canceled';

export type LinearIssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface LinearGithubLink {
  repo: string;
  issueNumber?: number | null;
  prNumber?: number | null;
  prState?: 'open' | 'merged' | 'closed' | string | null;
  branch?: string | null;
  url?: string | null;
  syncedAt?: string | null;
}

export interface LinearProjectItem {
  id: string;
  key: string;
  name: string;
  summary: string;
  status: 'planned' | 'in_progress' | 'completed' | 'paused' | string;
  leadAgentId: string;
  targetDate: string;
  githubRepo: string;
  createdAt?: string;
  issueCount: number;
  doneCount: number;
  inProgressCount: number;
  progressPct: number;
}

export interface LinearCycleItem {
  id: string;
  number: number;
  name: string;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'upcoming' | 'completed' | string;
  issueCount: number;
  doneCount: number;
  scopePoints: number;
  completedPoints: number;
  activePoints: number;
  progressPct: number;
}

export interface LinearIssueItem {
  id: string;
  identifier: string;
  title: string;
  description: string;
  status: LinearIssueStatus;
  priority: LinearIssuePriority;
  projectId: string;
  cycleId: string | null;
  parentId: string | null;
  blockedBy: string[];
  assigneeType: 'agent' | 'bot' | 'human' | string;
  assigneeId: string;
  assigneeName: string;
  commanderId: string;
  labels: string[];
  estimate: number;
  worktreeBranch: string | null;
  linkedTaskId: string | null;
  github: LinearGithubLink | null;
  sourceBotId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinearCommanderConfig {
  leadAgentId: string | null;
  autoDecompose: boolean;
  autoAssignWorkers: boolean;
  autoSyncGithub: boolean;
  requireDshReview: boolean;
  worktreePrefix: string;
}

export interface LinearGithubConfig {
  enabled: boolean;
  owner: string;
  repo: string;
  defaultBranch: string;
  autoCreatePr: boolean;
  syncDirection: 'bidirectional' | 'pull' | 'push' | string;
  tokenEnvVar: string;
  hasServerToken: boolean;
  lastSyncedAt?: string | null;
  lastSyncMode?: string | null;
  lastSyncSummary?: string | null;
}

export interface LinearCommanderLogItem {
  id: string;
  ts: string;
  kind: string;
  issueId: string | null;
  identifier: string | null;
  actor: string;
  summary: string;
}

export interface LinearStateResponse {
  ok?: boolean;
  mode?: 'demo' | 'live';
  commander: LinearCommanderConfig;
  githubConfig: LinearGithubConfig;
  summary: {
    totalProjects: number;
    totalIssues: number;
    triageCount: number;
    inProgressCount: number;
    doneCount: number;
    blockedCount: number;
    githubLinkedCount: number;
    openPrCount: number;
    activeCycleName: string;
    activeCycleProgressPct: number;
  };
  projects: LinearProjectItem[];
  cycles: LinearCycleItem[];
  issues: LinearIssueItem[];
  commanderLogs: LinearCommanderLogItem[];
  availableAgents: Array<{
    id: string;
    name: string;
    role: string;
    harness: string;
    status: string;
    modelHint?: string | null;
  }>;
  availableBots: Array<{
    id: string;
    name: string;
    handle: string;
    channel: string;
    enabled: boolean;
    status: string;
  }>;
}

export type BotChannel = 'github' | 'feishu' | 'telegram' | 'discord' | 'slack' | 'webhook';
export type BotRole = 'commander-bridge' | 'triage-intake' | 'pr-reviewer' | 'ops-alerter' | 'custom';

export interface BotItem {
  id: string;
  name: string;
  handle: string;
  channel: BotChannel | string;
  role: BotRole | string;
  description: string;
  enabled: boolean;
  status: 'online' | 'standby' | 'degraded' | string;
  boundAgentId: string;
  defaultProjectId: string;
  webhookEnvVar: string;
  hasServerSecret?: boolean;
  triggerKeywords: string[];
  commands: string[];
  autoCreateIssue: boolean;
  autoDispatchCommander: boolean;
  stats: {
    eventsReceived: number;
    issuesCreated: number;
    tasksDispatched: number;
    lastActiveAt: string | null;
  };
  createdAt: string;
}

export interface BotActivityItem {
  id: string;
  ts: string;
  botId: string;
  botName: string;
  channel: string;
  actor: string;
  message: string;
  createdIssueIdentifier: string | null;
  dispatched: boolean;
}

export interface BotLiveWorkflowItem {
  file: string;
  name: string;
  triggers: string[];
}

export interface BotLiveEnvStatus {
  name: string;
  channel: string;
  label: string;
  configured: boolean;
}

export interface BotLiveIntegrations {
  ghAuthenticated: boolean;
  ghAccount: string | null;
  repoFullName: string | null;
  workflows: BotLiveWorkflowItem[];
  envStatus: BotLiveEnvStatus[];
}

export interface BotFleetResponse {
  ok?: boolean;
  mode?: 'demo' | 'live';
  summary: {
    total: number;
    enabled: number;
    online: number;
    totalEvents: number;
    totalIssuesCreated: number;
    totalTasksDispatched: number;
    byChannel: Record<string, number>;
  };
  bots: BotItem[];
  activities: BotActivityItem[];
  liveIntegrations?: BotLiveIntegrations;
}

export interface A2AConnectProfile {
  id: 'tailscale' | 'cloudflare' | 'lan' | string;
  name: string;
  recommended: boolean;
  badge: string;
  hubUrl: string;
  securitySummary: string;
  whenToUse: string;
  hubPrepCmd: string;
  linuxInstallCmd: string;
  macosInstallCmd: string;
  dockerCmd: string;
  a2aPeerCmd?: string;
}

export interface A2AConnectProfilesResponse {
  ok?: boolean;
  protocol: string;
  specVersion: string;
  hubAgentCardUrl: string;
  hubRpcUrl: string;
  signingConfigured: boolean;
  profiles: A2AConnectProfile[];
}

export interface A2APingResponse {
  ok: boolean;
  agentId: string;
  agentName?: string;
  nodeId?: string;
  protocol?: string;
  latencyMs?: number;
  reachable: boolean;
  card?: Record<string, unknown> | null;
  pong?: Record<string, unknown> | null;
  error?: string | null;
  checkedAt: string;
}

export interface GithubPullRequestItem {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED' | string;
  isDraft?: boolean;
  headRefName: string;
  baseRefName: string;
  author: string;
  updatedAt: string;
  url: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  reviewDecision?: string | null;
  checksStatus?: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'UNKNOWN' | string;
  checksSummary?: string;
  labels?: string[];
}

export interface GithubIssueItem {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | string;
  author: string;
  updatedAt: string;
  url: string;
  labels?: string[];
  assignees?: string[];
  commentsCount?: number;
}

export interface GithubWorkflowRunItem {
  id: number | string;
  name: string;
  displayTitle?: string;
  status: string;
  conclusion?: string | null;
  headBranch: string;
  event?: string;
  createdAt: string;
  url: string;
}

export interface GithubWorktreeItem {
  path: string;
  branch: string;
  head: string;
  isMain?: boolean;
  bare?: boolean;
}

export interface GithubOverviewResponse {
  ok?: boolean;
  mode: 'gh-cli' | 'token-api' | 'demo' | 'offline' | string;
  ghAvailable: boolean;
  ghAuthenticated: boolean;
  ghAccount?: string | null;
  repo: {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    currentBranch: string;
    remoteUrl?: string | null;
    webUrl?: string | null;
  };
  summary: {
    openPrs: number;
    draftPrs: number;
    openIssues: number;
    failingChecks: number;
    worktreeCount: number;
  };
  pullRequests: GithubPullRequestItem[];
  issues: GithubIssueItem[];
  workflowRuns: GithubWorkflowRunItem[];
  worktrees: GithubWorktreeItem[];
  fetchedAt: string;
  warning?: string | null;
}



