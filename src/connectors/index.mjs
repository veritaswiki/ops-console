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
import { collectFirewall } from './firewall.mjs';

async function collectOpsStateFiles(config) {
  const [health, backup, alerts, activeOpsJobs] = await Promise.all([
    config.ops.healthLatestPath
      ? fs.readFile(config.ops.healthLatestPath, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null)
      : Promise.resolve(null),
    config.ops.backupLastRunPath
      ? fs.readFile(config.ops.backupLastRunPath, 'utf8').then((raw) => JSON.parse(raw)).catch(() => null)
      : Promise.resolve(null),
    config.ops.alertsLogPath
      ? fs.readFile(config.ops.alertsLogPath, 'utf8')
          .then((raw) => raw.trim().split('\n').filter(Boolean).slice(-25).reverse())
          .catch(() => [])
      : Promise.resolve([]),
    runCmd(
      'systemctl',
      ['--user', 'list-units', '--type=service', '--state=running', '--no-legend', '--no-pager', 'ops-*'],
      { timeout: 2000 },
    )
      .then(({ stdout }) =>
        stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((l) => l.trim().split(/\s+/)[0])
          .filter((u) => u !== 'ops-console.service'),
      )
      .catch(() => []),
  ]);

  return { health, backup, alerts, activeOpsJobs };
}

export class ConnectorHub {
  constructor({ config, cache, demoProvider = null, probeRegistry = null, store = null, pluginManager = null }) {
    this.config = config;
    this.cache = cache;
    this.demoProvider = demoProvider;
    this.probeRegistry = probeRegistry;
    this.store = store;
    this.pluginManager = pluginManager;
  }

  _isLegacyEnabled(pluginId, fallbackBool) {
    if (!this.pluginManager) return fallbackBool;
    const cfg = this.pluginManager.getEffectiveConfig(pluginId);
    return cfg ? Boolean(cfg.enabled) : fallbackBool;
  }

  warmUp() {
    if (this.config.demo) return;
    if (this._isLegacyEnabled('gateway-magpie', Boolean(this.config.connectors.magpie?.enabled))) {
      this.collectMagpieGateway(false).catch(() => {});
    }
    if (this.config.remotes?.length > 0) {
      collectRemoteNodes(this.config, this.cache, false).catch(() => {});
    }
    if (this._isLegacyEnabled('security-firewall', this.config.connectors.firewall?.enabled !== false)) {
      this.collectFirewall(false).catch(() => {});
    }
  }

  async collectFirewall(force = false) {
    if (this.config.demo && this.demoProvider) {
      const enabled = this._isLegacyEnabled('security-firewall', true);
      if (!enabled) return { enabled: false, listening: [], rules: [], summary: { listening: 0, exposed: 0 } };
      return this.demoProvider.getFirewall();
    }
    return this.cache.getOrLoad(
      'firewall',
      15_000,
      () => (this.pluginManager
        ? this.pluginManager.collectPlugin('security-firewall')
        : collectFirewall(this.config.connectors.firewall)),
      { force, staleOnError: true },
    );
  }

  _trackTransitions(snapshot) {
    if (!this.store || !snapshot) return;
    for (const svc of snapshot.services?.items || []) {
      if (svc.optional && svc.status === 'standby') continue;
      this.store.recordStateTransition({
        entityKey: `service:${svc.id}`,
        node: svc.name || svc.unit,
        kind: 'service',
        toState: svc.status || 'unknown',
        detail: svc.probe?.error || svc.subState || '',
      });
    }
    for (const engineKey of ['nmem', 'openviking', 'symbiote', 'rerank']) {
      const eng = snapshot.memory?.[engineKey];
      if (!eng?.enabled) continue;
      this.store.recordStateTransition({
        entityKey: `engine:${engineKey}`,
        node: eng.name || engineKey,
        kind: 'engine',
        toState: eng.status || 'unknown',
        detail: eng.error || '',
      });
    }
    for (const node of snapshot.fleet?.nodes || []) {
      this.store.recordStateTransition({
        entityKey: `node:${node.id}`,
        node: node.name || node.id,
        kind: 'node',
        toState: node.status || 'unknown',
        detail: node.transport || '',
      });
    }
  }

  async collectMemory(force = false) {
    if (this.config.demo && this.demoProvider) {
      const demoMem = this.demoProvider.getMemory();
      return {
        nmem: this._isLegacyEnabled('memory-nmem', true) ? demoMem.nmem : { ...demoMem.nmem, enabled: false, reachable: false, status: 'disabled' },
        openviking: this._isLegacyEnabled('memory-openviking', true) ? demoMem.openviking : { ...demoMem.openviking, enabled: false, reachable: false, status: 'disabled' },
        symbiote: this._isLegacyEnabled('memory-symbiote', true) ? demoMem.symbiote : { ...demoMem.symbiote, enabled: false, reachable: false, status: 'disabled' },
        rerank: this._isLegacyEnabled('memory-rerank', true) ? demoMem.rerank : { ...demoMem.rerank, enabled: false, reachable: false, status: 'disabled' },
      };
    }
    return this.cache.getOrLoad(
      'memory',
      15_000,
      async () => {
        if (this.pluginManager) {
          const [nmem, openviking, symbiote, rerank] = await Promise.all([
            this.pluginManager.collectPlugin('memory-nmem'),
            this.pluginManager.collectPlugin('memory-openviking'),
            this.pluginManager.collectPlugin('memory-symbiote'),
            this.pluginManager.collectPlugin('memory-rerank'),
          ]);
          return { nmem, openviking, symbiote, rerank };
        }
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
      () => (this.pluginManager
        ? this.pluginManager.collectPlugin('gateway-magpie')
        : collectMagpie(this.config.connectors.magpie)),
      { force, staleOnError: true },
    );
  }

  async collectNetwork(force = false) {
    return this.cache.getOrLoad(
      'network',
      12_000,
      async () => {
        if (this.pluginManager) {
          const [tailscale, mihomo, syncthing, firewall] = await Promise.all([
            this.pluginManager.collectPlugin('network-tailscale'),
            this.pluginManager.collectPlugin('network-mihomo'),
            this.pluginManager.collectPlugin('service-syncthing'),
            this.collectFirewall(force),
          ]);
          return { tailscale, mihomo, syncthing, firewall };
        }
        const [tailscale, mihomo, syncthing, firewall] = await Promise.all([
          collectTailscale(this.config.connectors.tailscale),
          collectMihomo(this.config.connectors.mihomo),
          collectSyncthing(this.config.connectors.syncthing),
          this.collectFirewall(force),
        ]);
        return { tailscale, mihomo, syncthing, firewall };
      },
      { force, staleOnError: true },
    );
  }

  async collectExtraPlugins(force = false) {
    if (!this.pluginManager) return [];
    return this.cache.getOrLoad(
      'extra-plugins',
      10_000,
      () => this.pluginManager.collectExtraEnabledPlugins(),
      { force, staleOnError: true },
    );
  }

  async collectSnapshot(force = false) {
    const extraPlugins = await this.collectExtraPlugins(force);

    if (this.config.demo && this.demoProvider) {
      const baseDemo = this.demoProvider.getSnapshot(this.config);
      const filteredMemory = await this.collectMemory(force);
      const magpieEnabled = this._isLegacyEnabled('gateway-magpie', true);
      const tailscaleEnabled = this._isLegacyEnabled('network-tailscale', true);
      const mihomoEnabled = this._isLegacyEnabled('network-mihomo', true);
      const syncthingEnabled = this._isLegacyEnabled('service-syncthing', true);
      const patchedDemo = {
        ...baseDemo,
        memory: filteredMemory,
        magpie: magpieEnabled ? baseDemo.magpie : { ...baseDemo.magpie, enabled: false, reachable: false, status: 'disabled' },
        network: {
          ...baseDemo.network,
          tailscale: tailscaleEnabled ? baseDemo.network.tailscale : { ...baseDemo.network.tailscale, enabled: false, reachable: false, status: 'disabled' },
          mihomo: mihomoEnabled ? baseDemo.network.mihomo : { ...baseDemo.network.mihomo, enabled: false, reachable: false, status: 'disabled' },
          syncthing: syncthingEnabled ? baseDemo.network.syncthing : { ...baseDemo.network.syncthing, enabled: false, reachable: false, status: 'disabled' },
        },
        plugins: extraPlugins,
      };
      if (this.probeRegistry && this.probeRegistry.telemetry.size > 0) {
        const mergedFleet = this.probeRegistry.buildFleetView({
          snapshot: patchedDemo,
          remotes: this.demoProvider.getRemotes(),
        });
        const demoById = new Map((patchedDemo.fleet?.nodes || []).map((node) => [node.id, node]));
        for (const liveNode of mergedFleet.nodes) {
          if (liveNode.probeLive || !demoById.has(liveNode.id)) {
            demoById.set(liveNode.id, liveNode);
          }
        }
        const nodes = [...demoById.values()];
        let online = 0;
        let reachable = 0;
        let meshOnly = 0;
        let probed = 0;
        let servers = 0;
        let laptops = 0;
        let mobiles = 0;
        for (const node of nodes) {
          const isOnline = node.status === 'healthy' || node.status === 'degraded';
          const isMeshOnly = node.status === 'standby' && node.transport !== 'offline';
          if (isOnline) online += 1;
          if (isMeshOnly) meshOnly += 1;
          if (isOnline || isMeshOnly) reachable += 1;
          if (node.probeMode === 'local' || node.probeLive) probed += 1;
          if (node.deviceType === 'hub' || node.deviceType === 'server' || node.deviceType === 'edge') servers += 1;
          else if (node.deviceType === 'laptop') laptops += 1;
          else if (node.deviceType === 'mobile') mobiles += 1;
        }
        return {
          ...patchedDemo,
          fleet: {
            ...patchedDemo.fleet,
            nodes,
            summary: {
              total: nodes.length,
              online,
              reachable,
              meshOnly,
              probed,
              servers,
              laptops,
              mobiles,
            },
          },
        };
      }
      return {
        ...patchedDemo,
        incidents: this.store ? this.store.listIncidents({ limit: 15 }) : (patchedDemo.incidents || []),
      };
    }

    const baseSnapshot = await this.cache.getOrLoad(
      'snapshot',
      5_000,
      async () => {
        const effectiveConfig = this.pluginManager
          ? {
              ...this.config,
              agentMatchers: [
                ...(this.config.agentMatchers || []),
                ...this.pluginManager.getContributedAgentMatchers(),
              ],
            }
          : this.config;
        const [host, services, agents, magpie, memory, network, opsState, timers] = await Promise.all([
          collectHostMetrics(this.config),
          collectSystemdServices(this.config),
          collectAgentProcesses(effectiveConfig),
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
          firewall: network.firewall,
          health: opsState.health,
          backup: opsState.backup,
          alerts: opsState.alerts,
          activeOpsJobs: opsState.activeOpsJobs,
          timers,
          plugins: extraPlugins,
        };
      },
      { force, staleOnError: true },
    );

    let finalSnapshot = { ...baseSnapshot, plugins: extraPlugins };
    if (this.probeRegistry) {
      if (this.config.remotes?.length > 0 && !this.cache.entries?.has('remotes')) {
        collectRemoteNodes(this.config, this.cache, false).catch(() => {});
      }
      const cachedRemotesEntry = this.cache.entries?.get('remotes');
      const cachedRemotes = Array.isArray(cachedRemotesEntry?.value) ? cachedRemotesEntry.value : [];
      const fleet = this.probeRegistry.buildFleetView({
        snapshot: finalSnapshot,
        remotes: cachedRemotes,
      });
      finalSnapshot = { ...finalSnapshot, fleet };
    }
    this._trackTransitions(finalSnapshot);
    return {
      ...finalSnapshot,
      incidents: this.store ? this.store.listIncidents({ limit: 15 }) : [],
    };
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
    const nmemCfg = this.pluginManager ? this.pluginManager.getEffectiveConfig('memory-nmem', { resolveSecrets: true }) : this.config.connectors.nmem;
    const ovCfg = this.pluginManager ? this.pluginManager.getEffectiveConfig('memory-openviking', { resolveSecrets: true }) : this.config.connectors.openviking;
    if ((p === 'all' || p === 'nmem') && nmemCfg?.enabled) {
      tasks.push(searchNmem(nmemCfg, query, limit));
    }
    if ((p === 'all' || p === 'openviking') && ovCfg?.enabled) {
      tasks.push(searchOpenViking(ovCfg, query, limit));
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
    const nmemCfg = this.pluginManager ? this.pluginManager.getEffectiveConfig('memory-nmem', { resolveSecrets: true }) : this.config.connectors.nmem;
    const ovCfg = this.pluginManager ? this.pluginManager.getEffectiveConfig('memory-openviking', { resolveSecrets: true }) : this.config.connectors.openviking;
    if ((p === 'all' || p === 'nmem') && nmemCfg?.enabled) {
      tasks.push(doctorNmem(nmemCfg));
    }
    if ((p === 'all' || p === 'openviking') && ovCfg?.enabled) {
      tasks.push(doctorOpenViking(ovCfg));
    }
    const results = await Promise.all(tasks);
    return { ok: results.every((r) => r.ok), results };
  }
}
