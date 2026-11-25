export function createDemoProvider() {
  const state = {
    services: [
      { id: 'orchestrator', name: 'Agent Orchestrator', unit: 'orchestrator.service', scope: 'user', layer: 'entry', role: 'Multi-agent coding orchestrator and workspace server', ports: ['*:3773'], healthUrl: 'http://127.0.0.1:3773/', tailnetUrl: 'https://demo-hub.example.ts.net', risk: 'critical', riskNote: 'Restarting drops active sessions.', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 1421, memoryBytes: 312 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 6, error: null } },
      { id: 'magpie', name: 'Magpie Gateway', unit: 'magpie.service', scope: 'system', layer: 'entry', role: 'Unified OpenAI-compatible model router and MCP Hub', ports: ['127.0.0.1:3426', '100.64.0.10:3430'], healthUrl: 'http://127.0.0.1:3426/v1/models', risk: 'critical', riskNote: 'Interrupts active LLM routing.', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 1580, memoryBytes: 184 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 11, error: null } },
      { id: 'ops-console', name: 'Ops Console', unit: 'ops-console.service', scope: 'user', layer: 'entry', role: 'Architecture, memory, and structured log control plane', ports: ['127.0.0.1:4320'], healthUrl: 'http://127.0.0.1:4320/api/ping', risk: 'standard', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: process.pid, memoryBytes: 68 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 2, error: null } },
      { id: 'nmem', name: 'Nowledge Mem', unit: 'nmem.service', scope: 'system', layer: 'memory', role: 'Cross-tool knowledge graph and long-term memory engine', ports: ['127.0.0.1:14242'], healthUrl: 'http://127.0.0.1:14242/health', risk: 'standard', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 1922, memoryBytes: 420 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 8, error: null } },
      { id: 'openviking', name: 'OpenViking', unit: 'openviking.service', scope: 'user', layer: 'memory', role: 'Agent context database, vector store, and skill registry', ports: ['127.0.0.1:1933'], healthUrl: 'http://127.0.0.1:1933/health', tailnetUrl: 'https://demo-hub.example.ts.net:10000', risk: 'standard', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 2104, memoryBytes: 510 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 14, error: null } },
      { id: 'symbiote', name: 'Symbiote Workbench', unit: 'symbiote.service', scope: 'user', layer: 'memory', role: 'Incremental reading and spaced repetition workbench', ports: ['127.0.0.1:4318'], healthUrl: 'http://127.0.0.1:4318/api/health', risk: 'standard', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 2219, memoryBytes: 245 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 5, error: null } },
      { id: 'rerank', name: 'Rerank Gateway', unit: 'rerank-gateway.service', scope: 'user', layer: 'memory', role: 'ONNX bge-reranker-v2-m3 local reranking service', ports: ['127.0.0.1:8893'], healthUrl: 'http://127.0.0.1:8893/health', risk: 'standard', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 2305, memoryBytes: 640 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 9, error: null } },
      { id: 'tailscaled', name: 'Tailscale Daemon', unit: 'tailscaled.service', scope: 'system', layer: 'network', role: 'Private mesh overlay and Tailscale Serve reverse proxy', ports: ['100.64.0.10'], risk: 'critical', riskNote: 'Disconnects all mesh peers.', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 890, memoryBytes: 74 * 1024 * 1024, restarts: 0, status: 'healthy', probe: null },
      { id: 'mihomo', name: 'Mihomo Proxy', unit: 'mihomo.service', scope: 'user', layer: 'network', role: 'Rule-based egress proxy core and REST controller', ports: ['127.0.0.1:7891', '127.0.0.1:19090'], healthUrl: 'http://127.0.0.1:19090/version', risk: 'standard', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 1120, memoryBytes: 118 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 4, error: null } },
      { id: 'postgresql', name: 'PostgreSQL 16', unit: 'postgresql@16-main.service', scope: 'system', layer: 'infra', role: 'Primary relational database cluster', ports: ['127.0.0.1:5432'], risk: 'standard', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 950, memoryBytes: 290 * 1024 * 1024, restarts: 0, status: 'healthy', probe: null },
      { id: 'syncthing', name: 'Syncthing', unit: 'syncthing.service', scope: 'user', layer: 'infra', role: 'Continuous peer-to-peer file sync', ports: ['127.0.0.1:8384'], healthUrl: 'http://127.0.0.1:8384/rest/noauth/health', risk: 'standard', activeState: 'active', subState: 'running', enabledState: 'enabled', mainPid: 1712, memoryBytes: 96 * 1024 * 1024, restarts: 0, status: 'healthy', probe: { ok: true, status: 200, latencyMs: 7, error: null } },
      { id: 'embedding', name: 'Local Embedding Worker', unit: 'emb-gateway.service', scope: 'user', layer: 'memory', role: 'On-demand local embedding worker', ports: ['127.0.0.1:8892'], optional: true, risk: 'standard', activeState: 'inactive', subState: 'dead', enabledState: 'disabled', mainPid: null, memoryBytes: null, restarts: 0, status: 'standby', probe: null },
    ],
    timers: [
      { id: 'ops-health-check', name: 'Six-Domain Health Check', unit: 'ops-health-check.timer', scope: 'user', schedule: 'Every 5m', targetService: 'ops-health-check.service', activeState: 'active', subState: 'waiting', enabledState: 'enabled', nextElapse: 'in 3m 12s', lastTrigger: '1m 48s ago' },
      { id: 'ops-backup', name: 'Daily Core Backup', unit: 'ops-backup.timer', scope: 'user', schedule: 'Daily 03:30', targetService: 'ops-backup.service', activeState: 'active', subState: 'waiting', enabledState: 'enabled', nextElapse: 'Tomorrow 03:30', lastTrigger: 'Today 03:30' },
      { id: 'symbiote-backup', name: 'Symbiote Snapshot', unit: 'symbiote-backup.timer', scope: 'user', schedule: 'Daily 03:15', targetService: 'symbiote-backup.service', activeState: 'active', subState: 'waiting', enabledState: 'enabled', nextElapse: 'Tomorrow 03:15', lastTrigger: 'Today 03:15' },
    ],
  };

  const demoLogs = [
    { ts: new Date(Date.now() - 180_000).toISOString(), unit: 'magpie.service', priority: 6, level: 'info', pid: '1580', message: 'Model catalog refreshed: 48 models across 6 providers (latency 24ms)' },
    { ts: new Date(Date.now() - 140_000).toISOString(), unit: 'openviking.service', priority: 6, level: 'info', pid: '2104', message: 'SessionCommit queue drained: 1,284 processed, 0 errors' },
    { ts: new Date(Date.now() - 105_000).toISOString(), unit: 'nmem.service', priority: 6, level: 'info', pid: '1922', message: 'Graph checkpoint verified healthy (14,820 entities, 68 communities)' },
    { ts: new Date(Date.now() - 75_000).toISOString(), unit: 'mihomo.service', priority: 4, level: 'warn', pid: '1120', message: 'Upstream proxy probe latency elevated (310ms), keeping MAIN-FAILOVER active' },
    { ts: new Date(Date.now() - 45_000).toISOString(), unit: 'symbiote.service', priority: 6, level: 'info', pid: '2219', message: 'Mirror sync verified: 34 vault files consistent with schema v11' },
    { ts: new Date(Date.now() - 18_000).toISOString(), unit: 'ops-console.service', priority: 6, level: 'info', pid: String(process.pid), message: 'Snapshot collector finished in 62ms (11/12 active, 0 failed)' },
  ];

  function getMemory() {
    return {
      nmem: {
        id: 'nmem',
        name: 'Nowledge Mem',
        enabled: true,
        protocol: 'Official REST (/health) + nmem --json CLI',
        apiUrl: 'http://127.0.0.1:14242',
        reachable: true,
        status: 'healthy',
        latencyMs: 8,
        version: '0.10.123',
        mode: 'local',
        database: true,
        graphStore: { status: 'healthy', repair_required: false, reason: null },
        embedding: { mode: 'remote', degraded: false, state: 'ready', model: 'BAAI/bge-m3' },
        pendingReviews: false,
        stats: { memories: 2480, activeMemories: 2480, archivedMemories: 410, storedMemories: 2890, threads: 3620, entities: 14820, labels: 4950, communities: 68 },
        spaces: [
          { id: 'default', name: 'Default', kind: 'personal', memories: 1940, archived: 310, threads: 2890, sources: 1024, crystals: 29, hasWorkingMemory: true },
          { id: 'infra', name: 'Infrastructure', kind: 'project', memories: 540, archived: 100, threads: 730, sources: 215, crystals: 11, hasWorkingMemory: true },
        ],
        feed: [
          { id: 'evt-demo-1', type: 'memory_created', severity: 'info', title: 'Unified Log Explorer architecture decision', description: 'Adopted structured journalctl --output=json with SSE tailing and bounded stream caps.', createdAt: new Date(Date.now() - 600_000).toISOString() },
          { id: 'evt-demo-2', type: 'memory_created', severity: 'info', title: 'Zero-trust Tailnet multi-host binding policy', description: 'Bind loopback and Tailnet IP explicitly without exposing 0.0.0.0.', createdAt: new Date(Date.now() - 3600_000).toISOString() },
        ],
      },
      openviking: {
        id: 'openviking',
        name: 'OpenViking',
        enabled: true,
        protocol: 'Official HTTP (/health, /ready) + ov -o json CLI',
        apiUrl: 'http://127.0.0.1:1933',
        reachable: true,
        status: 'healthy',
        latencyMs: 14,
        version: '0.5.5',
        authMode: 'api_key',
        account: 'default',
        role: 'admin',
        readyChecks: { agfs: { status: 'ok' }, vectordb: 'ok', api_key_manager: 'ok', embedding: 'ok' },
        vikingdb: { account: 'default', backend: 'local', collection: 'context', dimension: 1024, vectorCount: 8940 },
        queue: {
          rows: [
            { queue: 'Embedding', pending: 0, inProgress: 0, processed: 812, requeued: 0, errors: 0, total: 812 },
            { queue: 'SessionCommit', pending: 0, inProgress: 1, processed: 1284, requeued: 12, errors: 0, total: 1285 },
          ],
          total: { queue: 'TOTAL', pending: 0, inProgress: 1, processed: 2096, requeued: 12, errors: 0, total: 2097 },
        },
        models: [
          { kind: 'vlm', model: 'fast-summary-v4', provider: 'openai', calls: 520, promptTokens: 14200000, completionTokens: 3100000, totalTokens: 17300000, lastUpdated: new Date().toISOString() },
          { kind: 'embedding', model: 'BAAI/bge-m3', provider: 'openai', calls: 1390, promptTokens: 690000, completionTokens: 0, totalTokens: 690000, lastUpdated: new Date().toISOString() },
        ],
        locks: { active: 1, waiting: 0, staleRemoved: 0, conflicts: 0 },
        skillsCount: 5,
        skills: [
          { name: 'gemini-frontend-design', uri: 'viking://user/default/skills/gemini-frontend-design', description: 'Tailored web design system and visual craft guide.' },
          { name: 'ops-runbook', uri: 'viking://user/default/skills/ops-runbook', description: 'Standard operating procedures for backups and incident response.' },
        ],
        errors: [],
      },
      symbiote: {
        id: 'symbiote',
        name: 'Symbiote',
        enabled: true,
        protocol: 'Official HTTP (/api/health)',
        apiUrl: 'http://127.0.0.1:4318',
        reachable: true,
        status: 'healthy',
        latencyMs: 5,
        mode: 'rwkv-v1-5k',
        schemaVersion: 11,
        dbOk: true,
        workerAlive: true,
        mirrorOk: true,
        vaultFileCount: 34,
        mirrorFileCount: 34,
        checkpointCount: 2,
        bootSource: 'checkpoint',
        uptimeMs: 8420000,
      },
      rerank: {
        id: 'rerank',
        name: 'Rerank Gateway',
        enabled: true,
        protocol: 'Official HTTP (/health)',
        apiUrl: 'http://127.0.0.1:8893',
        reachable: true,
        status: 'healthy',
        latencyMs: 9,
        model: 'bge-reranker-v2-m3',
        maxTokens: 64,
        batch: 24,
        maxBatchTokens: 4096,
      },
    };
  }

  function getSnapshot(config) {
    const items = state.services;
    const summary = {
      total: items.length,
      active: items.filter((s) => s.activeState === 'active').length,
      healthy: items.filter((s) => s.status === 'healthy').length,
      degraded: items.filter((s) => s.status === 'degraded').length,
      failed: items.filter((s) => s.status === 'failed' || (!s.optional && s.status === 'inactive')).length,
      optionalInactive: items.filter((s) => s.optional && s.status === 'standby').length,
    };

    return {
      collectedAt: new Date().toISOString(),
      demo: true,
      host: {
        hostname: 'ops-demo-node',
        platform: 'Linux 6.8.0-demo',
        arch: process.arch,
        nodeVersion: process.version,
        cpuCores: 8,
        load1: 0.64,
        load5: 0.58,
        load15: 0.49,
        uptimeSeconds: 412890,
        memory: { totalBytes: 32 * 1024 ** 3, usedBytes: 12.4 * 1024 ** 3, availBytes: 19.6 * 1024 ** 3, usedPercent: 38.8 },
        disks: [
          { mount: '/', sizeBytes: 120 * 1024 ** 3, usedBytes: 44 * 1024 ** 3, availBytes: 76 * 1024 ** 3, usePercent: 37 },
          { mount: '/data', sizeBytes: 500 * 1024 ** 3, usedBytes: 148 * 1024 ** 3, availBytes: 352 * 1024 ** 3, usePercent: 30 },
        ],
      },
      services: { layers: config.layers, items, summary },
      memory: getMemory(),
      magpie: {
        id: 'magpie',
        name: 'Magpie Gateway',
        enabled: true,
        protocol: 'Official OpenAI /v1/models + magpie CLI',
        apiUrl: 'http://127.0.0.1:3426',
        webUrl: '',
        reachable: true,
        status: 'healthy',
        latencyMs: 11,
        totalModels: 48,
        reasoningModels: 18,
        providers: [
          { name: 'routing-group', count: 10 },
          { name: 'openai-compat', count: 14 },
          { name: 'local-mlx', count: 6 },
          { name: 'anthropic', count: 8 },
          { name: 'google', count: 10 },
        ],
        agents: [
          { name: 'codex', model: 'auto/deepseek-v4.1-flash', detail: 'reasoning=high' },
          { name: 'claude', model: 'claude-sonnet-5-5', detail: 'mcp=hub' },
          { name: 'pi', model: 'gemini-4-neon', detail: 'skills=openviking' },
        ],
        library: { summaryLines: ['MCP Router: shared (magpie-hub)', 'Skill Store: OpenViking native'] },
      },
      agents: {
        totalProcesses: 14,
        counts: { orchestrator: 2, gateway: 2, memory: 4, 'agent-runtime': 6 },
        processes: [
          { pid: 1421, ppid: 1, cpu: 1.4, memoryBytes: 312 * 1024 ** 2, elapsed: '4-18:12:04', comm: 't3', category: 'orchestrator', categoryLabel: 'Orchestrator', cmd: 't3 serve --port 3773' },
          { pid: 1580, ppid: 1, cpu: 0.8, memoryBytes: 184 * 1024 ** 2, elapsed: '4-18:11:59', comm: 'magpie', category: 'gateway', categoryLabel: 'Model Gateway', cmd: 'magpie serve --web=127.0.0.1:3430' },
          { pid: 2104, ppid: 1, cpu: 1.9, memoryBytes: 510 * 1024 ** 2, elapsed: '4-18:10:21', comm: 'openviking', category: 'memory', categoryLabel: 'Memory Engine', cmd: 'openviking-server --port 1933' },
          { pid: 1922, ppid: 1, cpu: 0.6, memoryBytes: 420 * 1024 ** 2, elapsed: '4-18:10:19', comm: 'nmem-server', category: 'memory', categoryLabel: 'Memory Engine', cmd: 'nmem-server --host 127.0.0.1 --port 14242' },
        ],
      },
      network: {
        tailscale: {
          id: 'tailscale',
          enabled: true,
          protocol: 'Official tailscale status --json + serve status --json',
          reachable: true,
          status: 'healthy',
          backendState: 'Running',
          version: '1.84.0',
          onlineCount: 3,
          devices: [
            { id: 'self-1', name: 'ops-demo-node', dnsName: 'demo-hub.example.ts.net', ip: '100.64.0.10', os: 'linux', online: true, isSelf: true, relay: '', curAddr: 'local', rxBytes: 428000000, txBytes: 912000000, lastSeen: null },
            { id: 'peer-2', name: 'workstation-mac', dnsName: 'workstation.example.ts.net', ip: '100.64.0.21', os: 'macOS', online: true, isSelf: false, relay: 'sjc', curAddr: 'direct', rxBytes: 184000000, txBytes: 96000000, lastSeen: null },
            { id: 'peer-3', name: 'backup-vps', dnsName: 'backup-vps.example.ts.net', ip: '100.64.0.35', os: 'linux', online: true, isSelf: false, relay: 'tok', curAddr: 'direct', rxBytes: 89000000, txBytes: 210000000, lastSeen: null },
            { id: 'peer-4', name: 'mobile-phone', dnsName: 'phone.example.ts.net', ip: '100.64.0.42', os: 'android', online: false, isSelf: false, relay: 'hkg', curAddr: '', rxBytes: 12000000, txBytes: 8000000, lastSeen: new Date(Date.now() - 7200_000).toISOString() },
          ],
          serves: [
            { url: 'https://demo-hub.example.ts.net', path: '/', target: 'http://127.0.0.1:3773', scope: 'tailnet only' },
            { url: 'https://demo-hub.example.ts.net:10000', path: '/', target: 'http://127.0.0.1:1933', scope: 'tailnet only' },
          ],
        },
        mihomo: {
          id: 'mihomo',
          name: 'Mihomo Proxy',
          enabled: true,
          protocol: 'Official REST (/version, /connections, /proxies)',
          apiUrl: 'http://127.0.0.1:19090',
          reachable: true,
          status: 'healthy',
          latencyMs: 4,
          version: 'v1.19.14',
          meta: true,
          activeConnections: 19,
          downloadTotal: 1508585595,
          uploadTotal: 483887565,
          selectors: [
            { name: 'PROXY', type: 'Selector', now: 'MAIN-FAILOVER', candidates: 8 },
            { name: 'MAIN-FAILOVER', type: 'Fallback', now: 'EDGE-TOKYO', candidates: 4 },
          ],
        },
        syncthing: {
          id: 'syncthing',
          name: 'Syncthing',
          enabled: true,
          protocol: 'Official REST (/rest/noauth/health)',
          apiUrl: 'http://127.0.0.1:8384',
          reachable: true,
          status: 'healthy',
          latencyMs: 7,
        },
      },
      health: {
        generated_at: new Date().toISOString(),
        overall: 'green',
        groups_total: 6,
        groups_green: 6,
        groups_red: 0,
        groups: [
          { id: 'entry', name: 'Entry & Orchestration', status: 'green' },
          { id: 'gateway', name: 'Model Gateway', status: 'green' },
          { id: 'memory', name: 'Memory Engines', status: 'green' },
          { id: 'network', name: 'Mesh & Proxy', status: 'green' },
          { id: 'storage', name: 'DB & Sync', status: 'green' },
          { id: 'backup', name: 'Offsite Backup', status: 'green' },
        ],
      },
      backup: {
        ts: new Date(Date.now() - 18_000_000).toISOString(),
        ok: true,
        sizeHuman: '1.42 GB',
        durationSeconds: 47,
        destination: 'backup-vps:/backups/daily/latest',
      },
      alerts: [],
      activeOpsJobs: [],
      timers: state.timers,
      fleet: buildDemoFleet(state),
    };
  }

  function makeDemoHistory(baseCpu, baseMem, baseRtt, batteryStart = null) {
    const now = Date.now();
    const points = [];
    for (let idx = 19; idx >= 0; idx -= 1) {
      const wave = Math.sin(idx * 0.55) * 4 + Math.cos(idx * 0.3) * 2;
      points.push({
        ts: now - idx * 15_000,
        cpuPct: Math.max(2, Math.min(96, Math.round((baseCpu + wave) * 10) / 10)),
        memPct: Math.max(8, Math.min(95, Math.round((baseMem + wave * 0.4) * 10) / 10)),
        diskPct: 46,
        rttMs: baseRtt === 0 ? 0 : Math.max(4, Math.round(baseRtt + wave * 0.7)),
        batteryPct: batteryStart === null ? null : Math.max(15, Math.min(100, Math.round(batteryStart - idx * 0.2))),
      });
    }
    return points;
  }

  function buildDemoFleet(demoState) {
    const nowIso = new Date().toISOString();
    const svcHealthy = demoState.services.filter((svc) => svc.status === 'healthy').length;
    const nodes = [
      {
        id: 'hub-primary',
        name: 'Primary Hub (SF)',
        deviceType: 'hub',
        role: 'Primary Control Plane & Memory Hub',
        region: 'San Francisco, US',
        provider: 'Cloud VM',
        lat: 37.77,
        lon: -122.42,
        status: 'healthy',
        probeMode: 'local',
        probeEnrolled: true,
        probeLive: true,
        probeAgeSec: 0,
        transport: 'local',
        tailscaleIp: '100.64.0.10',
        tailscaleDns: 'hub-primary.example.ts.net',
        relay: 'sjc',
        os: 'linux',
        arch: 'x64',
        kernel: '6.8.0',
        uptimeSec: 1245600,
        cpu: { cores: 16, usagePct: 18.4, load1: 1.42, load5: 1.28, load15: 1.15 },
        memory: { totalBytes: 34359738368, usedBytes: 14817632256, usedPct: 43.1 },
        disks: [
          { mount: '/', totalBytes: 128849018880, usedBytes: 61847529062, usedPct: 48.0 },
          { mount: '/data', totalBytes: 536870912000, usedBytes: 193273528320, usedPct: 36.0 },
        ],
        battery: null,
        network: { rxBytesPerSec: 184320, txBytesPerSec: 96256 },
        servicesSummary: { healthy: svcHealthy, total: demoState.services.length },
        watchedServices: demoState.services.slice(0, 8).map((svc) => ({ name: svc.name, status: svc.activeState })),
        agentsCount: 6,
        rttMs: 0,
        lastSeenAt: nowIso,
        scopes: ['hub:local'],
        history: makeDemoHistory(18, 43, 0),
      },
      {
        id: 'edge-tokyo',
        name: 'Edge Gateway (Tokyo)',
        deviceType: 'server',
        role: 'APAC Relay & Offsite DR Backup',
        region: 'Tokyo, JP',
        provider: 'Cloud VPS',
        lat: 35.68,
        lon: 139.69,
        status: 'healthy',
        probeMode: 'push',
        probeEnrolled: true,
        probeLive: true,
        probeAgeSec: 6,
        transport: 'direct',
        tailscaleIp: '100.64.0.35',
        tailscaleDns: 'edge-tokyo.example.ts.net',
        relay: 'tok',
        os: 'linux',
        arch: 'x64',
        kernel: '6.8.0',
        uptimeSec: 3672000,
        cpu: { cores: 4, usagePct: 9.2, load1: 0.24, load5: 0.19, load15: 0.17 },
        memory: { totalBytes: 4294967296, usedBytes: 1030792151, usedPct: 24.0 },
        disks: [{ mount: '/', totalBytes: 85899345920, usedBytes: 25769803776, usedPct: 30.0 }],
        battery: null,
        network: { rxBytesPerSec: 62400, txBytesPerSec: 54120 },
        watchedServices: [
          { name: 'tailscaled.service', status: 'active' },
          { name: 'docker.service', status: 'active' },
          { name: 'ops-probe.service', status: 'active' },
        ],
        agentsCount: 1,
        rttMs: 98,
        lastSeenAt: nowIso,
        scopes: ['telemetry:write'],
        history: makeDemoHistory(9, 24, 98),
      },
      {
        id: 'edge-frankfurt',
        name: 'EU Relay (Frankfurt)',
        deviceType: 'edge',
        role: 'European Mesh & Ingress Node',
        region: 'Frankfurt, DE',
        provider: 'Cloud VPS',
        lat: 50.11,
        lon: 8.68,
        status: 'healthy',
        probeMode: 'push',
        probeEnrolled: true,
        probeLive: true,
        probeAgeSec: 11,
        transport: 'direct',
        tailscaleIp: '100.64.0.30',
        tailscaleDns: 'edge-fra.example.ts.net',
        relay: 'fra',
        os: 'linux',
        arch: 'arm64',
        kernel: '6.6.0',
        uptimeSec: 1656000,
        cpu: { cores: 2, usagePct: 6.5, load1: 0.12, load5: 0.10, load15: 0.08 },
        memory: { totalBytes: 2147483648, usedBytes: 450887680, usedPct: 21.0 },
        disks: [{ mount: '/', totalBytes: 42949672960, usedBytes: 9019431321, usedPct: 21.0 }],
        battery: null,
        network: { rxBytesPerSec: 38200, txBytesPerSec: 31800 },
        watchedServices: [
          { name: 'tailscaled.service', status: 'active' },
          { name: 'derper.service', status: 'active' },
        ],
        agentsCount: 0,
        rttMs: 138,
        lastSeenAt: nowIso,
        scopes: ['telemetry:write'],
        history: makeDemoHistory(7, 21, 138),
      },
      {
        id: 'workstation-mac',
        name: 'Developer Laptop (macOS)',
        deviceType: 'laptop',
        role: 'Primary Operator Workstation',
        region: 'Singapore, SG',
        provider: 'Apple Silicon',
        lat: 1.35,
        lon: 103.82,
        status: 'healthy',
        probeMode: 'push',
        probeEnrolled: true,
        probeLive: true,
        probeAgeSec: 8,
        transport: 'relay',
        tailscaleIp: '100.64.0.20',
        tailscaleDns: 'workstation.example.ts.net',
        relay: 'sin',
        os: 'darwin',
        arch: 'arm64',
        kernel: '24.3.0',
        uptimeSec: 412800,
        cpu: { cores: 10, usagePct: 22.8, load1: 2.15, load5: 1.94, load15: 1.80 },
        memory: { totalBytes: 25769803776, usedBytes: 15977278341, usedPct: 62.0 },
        disks: [{ mount: '/', totalBytes: 536870912000, usedBytes: 279172874240, usedPct: 52.0 }],
        battery: { percent: 84, charging: true, source: 'AC Power' },
        network: { rxBytesPerSec: 124800, txBytesPerSec: 42100 },
        watchedServices: [{ name: 'Tailscale', status: 'active' }],
        agentsCount: 2,
        rttMs: 162,
        lastSeenAt: nowIso,
        scopes: ['telemetry:write'],
        history: makeDemoHistory(23, 62, 162, 84),
      },
      {
        id: 'mobile-device',
        name: 'Mobile Client (Android)',
        deviceType: 'mobile',
        role: 'Mobile Command Entry',
        region: 'Singapore, SG',
        provider: 'Android',
        lat: 1.35,
        lon: 103.82,
        status: 'healthy',
        probeMode: 'checkin',
        probeEnrolled: true,
        probeLive: true,
        probeAgeSec: 180,
        transport: 'checkin',
        tailscaleIp: '100.64.0.25',
        tailscaleDns: 'mobile.example.ts.net',
        relay: 'sin',
        os: 'android',
        arch: 'arm64',
        kernel: '',
        uptimeSec: null,
        cpu: null,
        memory: null,
        disks: [],
        battery: { percent: 76, charging: false, source: 'Battery' },
        network: { rxBytesPerSec: null, txBytesPerSec: null, type: '5G' },
        watchedServices: [],
        agentsCount: 0,
        rttMs: 44,
        lastSeenAt: nowIso,
        scopes: ['telemetry:checkin'],
        history: makeDemoHistory(10, 40, 44, 76),
      },
    ];
    const links = [
      { from: 'hub-primary', to: 'edge-tokyo', kind: 'direct', label: 'Tailnet Direct', rttMs: 98, active: true },
      { from: 'hub-primary', to: 'edge-frankfurt', kind: 'direct', label: 'Tailnet Direct', rttMs: 138, active: true },
      { from: 'hub-primary', to: 'workstation-mac', kind: 'relay', label: 'DERP sin', rttMs: 162, active: true },
      { from: 'hub-primary', to: 'mobile-device', kind: 'checkin', label: 'Mobile Check-in', rttMs: 44, active: true },
      { from: 'edge-tokyo', to: 'workstation-mac', kind: 'direct', label: 'APAC Mesh', rttMs: 74, active: true },
    ];
    return {
      localNodeId: 'hub-primary',
      requireTailscaleCidr: true,
      summary: { total: 5, online: 5, probed: 5, servers: 3, laptops: 1, mobiles: 1 },
      nodes,
      links,
      fleetHistory: makeDemoHistory(14, 38, 0).map((pt) => ({
        ts: pt.ts,
        onlineNodes: 5,
        totalNodes: 5,
        avgCpuPct: pt.cpuPct,
        avgMemPct: pt.memPct,
        servicesOkPct: 92,
      })),
    };
  }

  function getRemotes() {
    return [
      { id: 'relay-node', name: 'relay-node (Domestic Jump)', ip: '100.64.0.30', role: 'Relay & jump host', reachable: true, rttMs: 28, hostname: 'relay-node', uptime: 'up 19 days, 4 hours', load: '0.12 0.10 0.08', memory: '412/2048MB', disk: '8.2G/40G (21%)', failedUnits: 0, backup: 'n/a', probedAt: new Date().toISOString() },
      { id: 'backup-vps', name: 'backup-vps (Offsite DR)', ip: '100.64.0.35', role: 'Offsite backup & egress', reachable: true, rttMs: 64, hostname: 'backup-vps', uptime: 'up 42 days, 11 hours', load: '0.24 0.19 0.17', memory: '890/4096MB', disk: '24G/80G (30%)', failedUnits: 0, backup: '1.4G:2026-11-25', probedAt: new Date().toISOString() },
    ];
  }

  function queryLogs({ source, unit, level, q, lines }) {
    let entries = [...demoLogs];
    if (unit && unit !== 'all') {
      const svc = state.services.find((s) => s.id === unit || s.unit === unit);
      const unitName = svc ? svc.unit : unit;
      entries = entries.filter((e) => e.unit === unitName);
    }
    const maxP = level === 'err' || level === 'error' ? 3 : level === 'warn' ? 4 : level === 'info' ? 6 : 7;
    entries = entries.filter((e) => e.priority <= maxP);
    if (q) {
      const needle = q.toLowerCase();
      entries = entries.filter((e) => `${e.unit} ${e.message}`.toLowerCase().includes(needle));
    }
    const sliced = entries.slice(-(lines || 150));
    const counts = { total: sliced.length, error: 0, warn: 0, info: 0, debug: 0 };
    for (const e of sliced) counts[e.level] = (counts[e.level] || 0) + 1;
    return {
      ok: true,
      source: source || 'journald',
      unit: unit || 'all',
      label: unit && unit !== 'all' ? unit : 'Demo Units',
      entries: sliced,
      counts,
      lines: sliced.map((e) => `${e.ts} [${e.level.toUpperCase()}] ${e.unit}: ${e.message}`).join('\n'),
    };
  }

  function startDemoLogStream(emitEntry, { unit } = {}) {
    const templates = [
      { unit: 'magpie.service', level: 'info', priority: 6, message: 'Routed completion request via auto/deepseek-v4.1-flash (ttft=210ms)' },
      { unit: 'openviking.service', level: 'info', priority: 6, message: 'Semantic vector search completed in 14ms (top_k=8)' },
      { unit: 'nmem.service', level: 'info', priority: 6, message: 'Working memory index heartbeat OK (2,480 active memories)' },
      { unit: 'mihomo.service', level: 'warn', priority: 4, message: 'Relay RTT spike detected (268ms); failover watchdog monitoring' },
      { unit: 'ops-console.service', level: 'info', priority: 6, message: 'Health probes green across 11 active services' },
    ];
    let idx = 0;
    const timer = setInterval(() => {
      const tpl = templates[idx % templates.length];
      idx += 1;
      if (unit && unit !== 'all' && !tpl.unit.includes(unit)) return;
      emitEntry({ ts: new Date().toISOString(), pid: String(1500 + idx), ...tpl });
    }, 2500);
    timer.unref();
    return () => clearInterval(timer);
  }

  function searchMemory(provider, query) {
    const q = String(query || '').trim().toLowerCase();
    const all = [
      { id: 'mem-1', provider: 'nmem', title: 'Tailnet Multi-Host Binding Policy', snippet: 'Bind loopback 127.0.0.1 and Tailnet interface explicitly rather than 0.0.0.0.', score: 0.96, unitType: 'decision', labels: ['security', 'tailnet'], source: 'Codex', createdAt: new Date(Date.now() - 86400_000).toISOString() },
      { id: 'mem-2', provider: 'openviking', title: 'viking://user/default/memories/ops_console.md', snippet: 'Ops Console exposes official REST & CLI connectors for Nowledge Mem, OpenViking, Magpie, and Tailscale.', score: 0.92, unitType: 'memory', labels: ['ops-console'], source: 'openviking', createdAt: '' },
      { id: 'mem-3', provider: 'nmem', title: 'Structured Logging & Rotation Baseline', snippet: 'JSONL app logs with 5 MiB x 5 rotation and journalctl --output=json streaming.', score: 0.88, unitType: 'procedure', labels: ['logging', 'observability'], source: 'Codex', createdAt: new Date(Date.now() - 172800_000).toISOString() },
    ];
    const filtered = all.filter((item) => {
      if (provider && provider !== 'all' && item.provider !== provider) return false;
      if (!q) return true;
      return `${item.title} ${item.snippet} ${item.labels.join(' ')}`.toLowerCase().includes(q);
    });
    return { ok: true, query, provider: provider || 'all', items: filtered, resultsByProvider: {} };
  }

  function controlService(unitId, action) {
    const svc = state.services.find((s) => s.id === unitId || s.unit === unitId);
    if (!svc) return { ok: false, error: `Demo service not found: ${unitId}` };
    if (action === 'stop') {
      svc.activeState = 'inactive';
      svc.subState = 'dead';
      svc.status = svc.optional ? 'standby' : 'inactive';
    } else {
      svc.activeState = 'active';
      svc.subState = 'running';
      svc.status = 'healthy';
      if (action === 'restart') svc.restarts += 1;
    }
    return { ok: true, unit: svc.unit, message: `Demo ${action} succeeded for ${svc.unit}` };
  }

  function controlTimer(timerId, action) {
    const t = state.timers.find((item) => item.id === timerId || item.unit === timerId);
    if (!t) return { ok: false, error: `Demo timer not found: ${timerId}` };
    if (action === 'disable' || action === 'stop') {
      t.activeState = 'inactive';
      if (action === 'disable') t.enabledState = 'disabled';
    } else {
      t.activeState = 'active';
      if (action === 'enable') t.enabledState = 'enabled';
    }
    return { ok: true, unit: t.unit, message: `Demo timer ${action} succeeded for ${t.unit}` };
  }

  return { getSnapshot, getMemory, getRemotes, queryLogs, startDemoLogStream, searchMemory, controlService, controlTimer };
}
