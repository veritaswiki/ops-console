import fs from 'node:fs/promises';
import { runCmd } from '../exec.mjs';
import { collectHostMetrics } from './host.mjs';
import { collectAgentProcesses, collectSystemdServices, collectSystemdTimers } from './systemd.mjs';
import { collectNmem, doctorNmem, searchNmem } from './memory-nmem.mjs';
import { collectOpenViking, doctorOpenViking, searchOpenViking } from './memory-openviking.mjs';
import { collectSymbiote } from './memory-symbiote.mjs';
import { collectRerank } from './memory-rerank.mjs';
import { collectMagpie } from './gateway-magpie.mjs';
import { collectTailscale } from './network-tailscale.mjs';
import { collectMihomo } from './network-mihomo.mjs';
import { collectSyncthing } from './service-syncthing.mjs';
import { collectRemoteNodes } from './remote-ssh.mjs';

async function collectOpsStateFiles(config) {
  let health = null;
  let backup = null;
  let alerts = [];
  let activeOpsJobs = [];

  if (config.ops.healthLatestPath) {
    try {
      health = JSON.parse(await fs.readFile(config.ops.healthLatestPath, 'utf8'));
    } catch {
      health = null;
    }
  }
  if (config.ops.backupLastRunPath) {
    try {
      backup = JSON.parse(await fs.readFile(config.ops.backupLastRunPath, 'utf8'));
    } catch {
      backup = null;
    }
  }
  if (config.ops.alertsLogPath) {
    try {
      const raw = await fs.readFile(config.ops.alertsLogPath, 'utf8');
      alerts = raw.trim().split('\n').filter(Boolean).slice(-25).reverse();
    } catch {
      alerts = [];
    }
  }
  try {
    const { stdout } = await runCmd(
      'systemctl',
      ['--user', 'list-units', '--type=service', '--state=running', '--no-legend', '--no-pager', 'ops-*'],
      { timeout: 2000 },
    );
    activeOpsJobs = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => l.trim().split(/\s+/)[0])
      .filter((u) => u !== 'ops-console.service');
  } catch {
    activeOpsJobs = [];
  }

  return { health, backup, alerts, activeOpsJobs };
}

export class ConnectorHub {
  constructor({ config, cache, demoProvider = null, probeRegistry = null }) {
    this.config = config;
    this.cache = cache;
    this.demoProvider = demoProvider;
    this.probeRegistry = probeRegistry;
  }

  async collectMemory(force = false) {
    if (this.config.demo && this.demoProvider) {
      return this.demoProvider.getMemory();
    }
    return this.cache.getOrLoad(
      'memory',
      15_000,
      async () => {
        const [nmem, openviking, symbiote, rerank] = await Promise.all([
          collectNmem(this.config.connectors.nmem),
          collectOpenViking(this.config.connectors.openviking),
          collectSymbiote(this.config.connectors.symbiote),
          collectRerank(this.config.connectors.rerank),
        ]);
        return { nmem, openviking, symbiote, rerank };
      },
      { force, staleOnError: true },
    );
  }

  async collectMagpieGateway(force = false) {
    return this.cache.getOrLoad(
      'magpie',
      20_000,
      () => collectMagpie(this.config.connectors.magpie),
      { force, staleOnError: true },
    );
  }

  async collectNetwork(force = false) {
    return this.cache.getOrLoad(
      'network',
      12_000,
      async () => {
        const [tailscale, mihomo, syncthing] = await Promise.all([
          collectTailscale(this.config.connectors.tailscale),
          collectMihomo(this.config.connectors.mihomo),
          collectSyncthing(this.config.connectors.syncthing),
        ]);
        return { tailscale, mihomo, syncthing };
      },
      { force, staleOnError: true },
    );
  }

  async collectSnapshot(force = false) {
    if (this.config.demo && this.demoProvider) {
      const baseDemo = this.demoProvider.getSnapshot(this.config);
      if (this.probeRegistry && this.probeRegistry.telemetry.size > 0) {
        const mergedFleet = this.probeRegistry.buildFleetView({
          snapshot: baseDemo,
          remotes: this.demoProvider.getRemotes(),
        });
        const demoById = new Map((baseDemo.fleet?.nodes || []).map((node) => [node.id, node]));
        for (const liveNode of mergedFleet.nodes) {
          if (liveNode.probeLive || !demoById.has(liveNode.id)) {
            demoById.set(liveNode.id, liveNode);
          }
        }
        const nodes = [...demoById.values()];
        return {
          ...baseDemo,
          fleet: {
            ...baseDemo.fleet,
            nodes,
            summary: {
              total: nodes.length,
              online: nodes.filter((node) => node.status === 'healthy' || node.status === 'degraded').length,
              probed: nodes.filter((node) => node.probeMode === 'local' || node.probeLive).length,
              servers: nodes.filter((node) => node.deviceType === 'hub' || node.deviceType === 'server' || node.deviceType === 'edge').length,
              laptops: nodes.filter((node) => node.deviceType === 'laptop').length,
              mobiles: nodes.filter((node) => node.deviceType === 'mobile').length,
            },
          },
        };
      }
      return baseDemo;
    }

    const baseSnapshot = await this.cache.getOrLoad(
      'snapshot',
      5_000,
      async () => {
        const [host, services, agents, magpie, memory, network, opsState, timers] = await Promise.all([
          collectHostMetrics(this.config),
          collectSystemdServices(this.config),
          collectAgentProcesses(this.config),
          this.collectMagpieGateway(force),
          this.collectMemory(force),
          this.collectNetwork(force),
          collectOpsStateFiles(this.config),
          collectSystemdTimers(this.config),
        ]);

        return {
          collectedAt: new Date().toISOString(),
          demo: false,
          host,
          services,
          agents,
          magpie,
          memory,
          network,
          tailscale: network.tailscale,
          health: opsState.health,
          backup: opsState.backup,
          alerts: opsState.alerts,
          activeOpsJobs: opsState.activeOpsJobs,
          timers,
        };
      },
      { force, staleOnError: true },
    );

    if (!this.probeRegistry) return baseSnapshot;
    if (this.config.remotes?.length > 0 && !this.cache.entries?.has('remotes')) {
      collectRemoteNodes(this.config, this.cache, false).catch(() => {});
    }
    const cachedRemotesEntry = this.cache.entries?.get('remotes');
    const cachedRemotes = Array.isArray(cachedRemotesEntry?.value) ? cachedRemotesEntry.value : [];
    const fleet = this.probeRegistry.buildFleetView({
      snapshot: baseSnapshot,
      remotes: cachedRemotes,
    });
    return { ...baseSnapshot, fleet };
  }

  async collectRemotes(force = false) {
    if (this.config.demo && this.demoProvider) {
      return this.demoProvider.getRemotes();
    }
    return collectRemoteNodes(this.config, this.cache, force);
  }

  async searchMemory(provider = 'all', query = '', limit = 10) {
    if (this.config.demo && this.demoProvider) {
      return this.demoProvider.searchMemory(provider, query);
    }
    const p = String(provider || 'all').toLowerCase();
    const tasks = [];
    if ((p === 'all' || p === 'nmem') && this.config.connectors.nmem.enabled) {
      tasks.push(searchNmem(this.config.connectors.nmem, query, limit));
    }
    if ((p === 'all' || p === 'openviking') && this.config.connectors.openviking.enabled) {
      tasks.push(searchOpenViking(this.config.connectors.openviking, query, limit));
    }
    const results = await Promise.all(tasks);
    const items = [];
    const resultsByProvider = {};
    for (const r of results) {
      resultsByProvider[r.provider] = { ok: r.ok, total: r.total ?? r.items.length, mode: r.mode || '', error: r.error || null };
      items.push(...r.items);
    }
    items.sort((a, b) => (Number(b.score ?? -1) - Number(a.score ?? -1)));
    return { ok: true, query, provider: p, items, resultsByProvider };
  }

  async runMemoryDoctor(provider = 'all') {
    if (this.config.demo) {
      return {
        ok: true,
        results: [
          { ok: true, provider: 'nmem', data: { status: 'healthy', database: true, graph: 'ok' } },
          { ok: true, provider: 'openviking', data: { ready: { status: 'ready' } } },
        ],
      };
    }
    const p = String(provider || 'all').toLowerCase();
    const tasks = [];
    if ((p === 'all' || p === 'nmem') && this.config.connectors.nmem.enabled) {
      tasks.push(doctorNmem(this.config.connectors.nmem));
    }
    if ((p === 'all' || p === 'openviking') && this.config.connectors.openviking.enabled) {
      tasks.push(doctorOpenViking(this.config.connectors.openviking));
    }
    const results = await Promise.all(tasks);
    return { ok: results.every((r) => r.ok), results };
  }
}
