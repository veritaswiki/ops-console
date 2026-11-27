#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { APP_VERSION, loadConfig, parseCliArgs } from '../src/config.mjs';
import { StructuredLogger } from '../src/logger.mjs';
import { buildScaffoldPluginSource, PluginManager } from '../src/plugins/manager.mjs';
import { validatePluginId } from '../src/plugins/sdk.mjs';
import { ProbeRegistry } from '../src/probes.mjs';
import { createOpsConsole } from '../src/server.mjs';
import { IncrementalUpdater } from '../src/updater.mjs';

const RESTART_EXIT_CODE = 75;

function printHelp() {
  process.stdout.write(`ops-console v${APP_VERSION}
Self-hostable, zero-dependency operational control plane for services, AI memory engines, networks, and structured logs.

Usage:
  ops-console [options]
  ops-console plugin <list|enable|disable|scaffold> [options]
  ops-console probe <enroll|list|revoke> [options]
  ops-console update <status|check|apply|rollback> [options]

Options:
  -c, --config <path>     Path to JSON configuration file
      --host <ip>         Bind host or comma-separated hosts (default: 127.0.0.1)
      --hosts <list>      Alias for --host (e.g. 127.0.0.1,100.64.0.10)
  -p, --port <number>     Listen port (default: 4320)
      --web-key <secret>  Require web key auth (cookie / ?k= / Bearer, min 16 chars)
      --read-only         Disable all mutating service, timer, and ops actions
      --demo              Run in full sandbox mode with synthetic telemetry and SSE logs
      --allow-iframe      Allow embedding the UI in an iframe (preview / portal mode)
      --hot-reload        Enable file watchers for config/plugins/public hot reload (default: on)
      --no-hot-reload     Disable file watchers for hot reload
      --supervised        Run with lightweight auto-restart supervisor for graceful core updates
      --check-config      Validate resolved configuration and exit
  -v, --version           Show version number
  -h, --help              Show this help message

Plugin subcommands:
  ops-console plugin list [--json]
  ops-console plugin enable <plugin-id>
  ops-console plugin disable <plugin-id>
  ops-console plugin scaffold <plugin-id> [--category mcp|agent|gateway|memory|network|infra|custom] [--name <label>]

Probe subcommands:
  ops-console probe enroll --id <id> [--name <name>] [--type server|laptop|mobile]
                           [--region <label>] [--lat <deg>] [--lon <deg>] [--tailscale-ip <ip>] [--json]
  ops-console probe list   [--json]
  ops-console probe revoke --id <id>

Update subcommands:
  ops-console update status [--json]
  ops-console update check  [--remote <name>] [--branch <ref>] [--no-fetch] [--json]
  ops-console update apply  [--remote <name>] [--branch <ref>] [--rebuild] [--json]
  ops-console update rollback --commit <sha> [--json]

Environment variables:
  OPS_CONSOLE_CONFIG      Config file path
  OPS_CONSOLE_HOSTS       Comma-separated bind hosts
  OPS_CONSOLE_PORT        Listen port
  OPS_CONSOLE_WEB_KEY     Web key secret (>= 16 characters, supports env:// and file://)
  OPS_CONSOLE_WEB_KEY_FILE Path to 0600 file containing web key (preferred over argv/env)
  OPS_CONSOLE_READ_ONLY   1 / true to enable read-only mode
  OPS_CONSOLE_DEMO        1 / true to enable demo sandbox mode
  OPS_CONSOLE_ALLOW_IFRAME 1 / true to allow embedding in an iframe
  OPS_CONSOLE_DATA_DIR    Directory for rotating logs, audit, probes, and telemetry store
  OPS_CONSOLE_LOG_LEVEL   debug | info | warn | error
  OPS_CONSOLE_STORAGE_DRIVER auto | sqlite | jsonl | memory
  OPS_CONSOLE_HOT_RELOAD  1 / true / false to override config/plugins/public file watchers
  OPS_CONSOLE_UPDATES_ENABLED 1 / true / false to enable or disable incremental updates
  OPS_CONSOLE_UPDATE_REMOTE Git remote name for incremental checks (default: origin)
  OPS_CONSOLE_UPDATE_BRANCH Git branch name for incremental checks (default: main)
`);
}

async function handleUpdateSubcommand(args) {
  const action = args[0] || 'status';
  const rest = args.slice(1);
  const opts = {
    configPath: '',
    remote: '',
    branch: '',
    commit: '',
    fetchRemote: true,
    rebuildFrontend: false,
    json: false,
  };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--no-fetch') opts.fetchRemote = false;
    else if (arg === '--rebuild') opts.rebuildFrontend = true;
    else if ((arg === '-c' || arg === '--config') && rest[i + 1]) opts.configPath = rest[++i];
    else if (arg === '--remote' && rest[i + 1]) opts.remote = rest[++i];
    else if (arg === '--branch' && rest[i + 1]) opts.branch = rest[++i];
    else if (arg === '--commit' && rest[i + 1]) opts.commit = rest[++i];
  }

  const config = loadConfig({ cli: { configPath: opts.configPath, hotReload: false } });
  const logger = new StructuredLogger({ dataDir: config.console.dataDir, silentStdout: true });
  const pluginManager = new PluginManager({ config, logger });
  await pluginManager.loadExternalPlugins();
  const updater = new IncrementalUpdater({ config, logger, pluginManager });
  await updater.init();
  updater.stopWatchers();

  try {
    if (action === 'status') {
      const status = await updater.getStatus();
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
      } else {
        process.stdout.write(
          `ops-console v${status.version} | commit=${status.git.shortCommit || 'n/a'} | branch=${status.git.branch || status.branch} | assets=${status.assetsRevision} | dirty=${status.git.dirtyCount}\n`,
        );
      }
      process.exit(0);
    }

    if (action === 'check') {
      const result = await updater.checkForUpdates({
        remote: opts.remote || undefined,
        branch: opts.branch || undefined,
        fetchRemote: opts.fetchRemote,
      });
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(
          `remote=${result.remote}/${result.branch} | behind=${result.behind} | ahead=${result.ahead} | strategy=${result.plan.strategy} | ${result.plan.summary}\n`,
        );
      }
      process.exit(0);
    }

    if (action === 'apply') {
      const token = config.security?.requireCriticalConfirm ? updater.issueConfirmToken('apply').confirmToken : '';
      const result = await updater.applyIncrementalUpdate({
        remote: opts.remote || undefined,
        branch: opts.branch || undefined,
        confirmToken: token,
        rebuildFrontend: opts.rebuildFrontend,
        autoRestart: false,
        actor: 'cli',
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(0);
    }

    if (action === 'rollback') {
      if (!opts.commit) {
        process.stderr.write('Missing required --commit <sha>\n');
        process.exit(1);
      }
      const token = config.security?.requireCriticalConfirm ? updater.issueConfirmToken('rollback').confirmToken : '';
      const result = await updater.rollbackToCommit({
        commit: opts.commit,
        confirmToken: token,
        autoRestart: false,
        actor: 'cli',
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(0);
    }

    process.stderr.write(`Unknown update subcommand: ${action}. Use status, check, apply, or rollback.\n`);
    process.exit(1);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}

function runSupervisedLoop(rawArgs) {
  const childArgs = [process.argv[1], ...rawArgs.filter((arg) => arg !== '--supervised')];
  let child = null;
  let stopping = false;

  const spawnChild = () => {
    child = spawn(process.execPath, childArgs, {
      stdio: 'inherit',
      env: { ...process.env, OPS_CONSOLE_SUPERVISED: '1' },
    });
    child.on('exit', (code, signal) => {
      if (stopping) {
        process.exit(code ?? 0);
      }
      if (code === RESTART_EXIT_CODE) {
        setTimeout(spawnChild, 250);
        return;
      }
      if (signal) {
        process.exit(128);
      }
      process.exit(code ?? 0);
    });
  };

  const forwardStop = (signal) => {
    stopping = true;
    if (child && !child.killed) {
      child.kill(signal);
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => forwardStop('SIGTERM'));
  process.on('SIGINT', () => forwardStop('SIGINT'));
  process.on('SIGHUP', () => {
    if (child && !child.killed) child.kill('SIGHUP');
  });
  spawnChild();
}

async function handleProbeSubcommand(args) {
  const action = args[0] || '';
  const rest = args.slice(1);
  const opts = {
    configPath: '',
    id: '',
    name: '',
    type: 'server',
    mode: '',
    role: '',
    region: '',
    provider: '',
    lat: null,
    lon: null,
    tailscaleIp: '',
    json: false,
  };
  for (let idx = 0; idx < rest.length; idx += 1) {
    const arg = rest[idx];
    if (arg === '--json') opts.json = true;
    else if ((arg === '-c' || arg === '--config') && rest[idx + 1]) opts.configPath = rest[++idx];
    else if (arg === '--id' && rest[idx + 1]) opts.id = rest[++idx];
    else if (arg === '--name' && rest[idx + 1]) opts.name = rest[++idx];
    else if (arg === '--type' && rest[idx + 1]) opts.type = rest[++idx];
    else if (arg === '--mode' && rest[idx + 1]) opts.mode = rest[++idx];
    else if (arg === '--role' && rest[idx + 1]) opts.role = rest[++idx];
    else if (arg === '--region' && rest[idx + 1]) opts.region = rest[++idx];
    else if (arg === '--provider' && rest[idx + 1]) opts.provider = rest[++idx];
    else if (arg === '--lat' && rest[idx + 1]) opts.lat = Number(rest[++idx]);
    else if (arg === '--lon' && rest[idx + 1]) opts.lon = Number(rest[++idx]);
    else if (arg === '--tailscale-ip' && rest[idx + 1]) opts.tailscaleIp = rest[++idx];
  }

  const config = loadConfig({ cli: { configPath: opts.configPath } });
  const logger = new StructuredLogger({ dataDir: config.console.dataDir, silentStdout: true });
  const registry = new ProbeRegistry({ config, logger });

  if (action === 'list') {
    const list = registry.listEnrolled();
    if (opts.json) {
      process.stdout.write(`${JSON.stringify({ ok: true, probes: list }, null, 2)}\n`);
    } else if (list.length === 0) {
      process.stdout.write('No probes enrolled.\n');
    } else {
      for (const item of list) {
        process.stdout.write(`${item.id}\t${item.deviceType}\t${item.probeMode}\t${item.region}\t${item.tailscaleIp || '-'}\tlastSeen=${item.lastSeenAt || 'never'}\n`);
      }
    }
    process.exit(0);
  }

  if (action === 'enroll') {
    if (!opts.id) {
      process.stderr.write('Missing required --id <node-id>\n');
      process.exit(1);
    }
    const result = await registry.enroll({
      id: opts.id,
      name: opts.name || opts.id,
      deviceType: opts.type,
      probeMode: opts.mode || (opts.type === 'mobile' ? 'checkin' : 'push'),
      role: opts.role,
      region: opts.region,
      provider: opts.provider,
      lat: opts.lat,
      lon: opts.lon,
      tailscaleIp: opts.tailscaleIp,
    });
    await logger.appendAudit({ category: 'probe', action: 'probe_enroll', target: result.node.id, actor: 'cli', ip: '127.0.0.1', ok: true, output: `deviceType=${result.node.deviceType}` });
    if (opts.json) {
      process.stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
    } else {
      process.stdout.write(`Enrolled probe: ${result.node.id} (${result.node.deviceType})\n`);
      process.stdout.write(`Token (shown once): ${result.token}\n`);
      process.stdout.write(`Hub URL: ${result.hubUrl}\n`);
    }
    process.exit(0);
  }

  if (action === 'revoke') {
    if (!opts.id) {
      process.stderr.write('Missing required --id <node-id>\n');
      process.exit(1);
    }
    const res = await registry.revoke(opts.id);
    if (!res.ok) {
      process.stderr.write(`${res.error}\n`);
      process.exit(1);
    }
    await logger.appendAudit({ category: 'probe', action: 'probe_revoke', target: opts.id, actor: 'cli', ip: '127.0.0.1', ok: true, output: 'revoked via cli' });
    process.stdout.write(`Revoked probe: ${opts.id}\n`);
    process.exit(0);
  }

  process.stderr.write(`Unknown probe subcommand: ${action || '(empty)'}. Use enroll, list, or revoke.\n`);
  process.exit(1);
}

async function handlePluginSubcommand(args) {
  const action = args[0] || '';
  const rest = args.slice(1);
  let targetId = '';
  let configPath = '';
  let category = 'custom';
  let name = '';
  let json = false;
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--json') json = true;
    else if ((arg === '-c' || arg === '--config') && rest[i + 1]) configPath = rest[++i];
    else if (arg === '--category' && rest[i + 1]) category = rest[++i];
    else if (arg === '--name' && rest[i + 1]) name = rest[++i];
    else if (!arg.startsWith('-') && !targetId) targetId = arg;
  }

  const config = loadConfig({ cli: { configPath } });
  const logger = new StructuredLogger({ dataDir: config.console.dataDir, silentStdout: true });
  const pm = new PluginManager({ config, logger });
  await pm.loadExternalPlugins();

  if (action === 'list') {
    const catalog = pm.listPlugins();
    if (json) {
      process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`);
    } else {
      for (const item of catalog.items) {
        process.stdout.write(`${item.id}\t${item.category}\t${item.enabled ? 'enabled' : 'disabled'}\t${item.source}\t${item.officialSpec.protocol}\n`);
      }
    }
    process.exit(0);
  }

  if (action === 'enable' || action === 'disable') {
    if (!targetId) {
      process.stderr.write(`Missing plugin ID: ops-console plugin ${action} <plugin-id>\n`);
      process.exit(1);
    }
    const res = await pm.togglePlugin(targetId, action === 'enable');
    if (!res.ok) {
      process.stderr.write(`${res.error}\n`);
      process.exit(1);
    }
    process.stdout.write(`Plugin ${res.id} ${res.enabled ? 'enabled' : 'disabled'}.\n`);
    process.exit(0);
  }

  if (action === 'scaffold') {
    if (!targetId || !validatePluginId(targetId)) {
      process.stderr.write('Invalid plugin ID. Use lowercase letters, digits, and hyphens (e.g. my-mcp-server).\n');
      process.exit(1);
    }
    const dir = path.join(pm.pluginsDir, targetId);
    const entryFile = path.join(dir, 'index.mjs');
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(entryFile, buildScaffoldPluginSource({ id: targetId, name: name || targetId, category }), 'utf8');
    process.stdout.write(`Scaffolded plugin at ${entryFile}\n`);
    process.exit(0);
  }

  process.stderr.write(`Unknown plugin subcommand: ${action || '(empty)'}. Use list, enable, disable, or scaffold.\n`);
  process.exit(1);
}

async function main() {
  if (process.argv[2] === 'plugin') {
    await handlePluginSubcommand(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === 'probe') {
    await handleProbeSubcommand(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === 'update') {
    await handleUpdateSubcommand(process.argv.slice(3));
    return;
  }
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.showHelp) {
    printHelp();
    process.exit(0);
  }
  if (cli.showVersion) {
    process.stdout.write(`ops-console v${APP_VERSION}\n`);
    process.exit(0);
  }
  if (cli.supervised && process.env.OPS_CONSOLE_SUPERVISED !== '1') {
    runSupervisedLoop(process.argv.slice(2));
    return;
  }

  let config;
  try {
    config = loadConfig({ cli });
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }

  if (cli.checkConfig) {
    const enabledConnectors = Object.entries(config.connectors)
      .filter(([key, val]) => key !== 'customHttp' && val?.enabled)
      .map(([key]) => key);
    const summary = {
      ok: true,
      version: APP_VERSION,
      configPath: config.configPath || '(defaults)',
      hosts: config.console.hosts,
      port: config.console.port,
      demo: config.demo,
      readOnly: config.console.readOnly,
      authEnabled: Boolean(config.auth.webKey),
      requireCriticalConfirm: Boolean(config.security?.requireCriticalConfirm),
      storageDriver: config.storage?.driver || 'auto',
      services: config.services.length,
      timers: config.timers.length,
      logFiles: config.logFiles.length,
      remotes: config.remotes.length,
      enabledConnectors,
      warnings: config.warnings || [],
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exit(0);
  }

  const isSupervisedChild = process.env.OPS_CONSOLE_SUPERVISED === '1';
  let shuttingDown = false;
  let instance = null;

  const shutdown = async (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const forceTimer = setTimeout(() => process.exit(exitCode === 0 ? 1 : exitCode), 5000);
    forceTimer.unref();
    instance?.logger?.info('shutdown_signal', { signal, exitCode });
    try {
      if (instance) await instance.stop();
      process.exit(exitCode);
    } catch (err) {
      process.stderr.write(`Shutdown error: ${err.message}\n`);
      process.exit(exitCode === 0 ? 1 : exitCode);
    }
  };

  instance = createOpsConsole({
    config,
    supervised: isSupervisedChild,
    onRestartRequested: async () => {
      await shutdown('GRACEFUL_RESTART', isSupervisedChild ? RESTART_EXIT_CODE : 0);
    },
  });

  process.on('SIGTERM', () => shutdown('SIGTERM', 0));
  process.on('SIGINT', () => shutdown('SIGINT', 0));
  process.on('SIGHUP', () => {
    instance.updater
      .hotReload({ scopes: ['config', 'plugins', 'assets'], force: false, reason: 'sighup', actor: 'signal', bypassReadOnly: true })
      .catch((err) => {
        instance.logger.warn('sighup_hot_reload_failed', { error: err.message });
      });
  });
  process.on('uncaughtException', (err) => {
    instance.logger.error('uncaught_exception', { error: err.message, stack: String(err.stack || '').slice(0, 600) });
  });
  process.on('unhandledRejection', (reason) => {
    instance.logger.error('unhandled_rejection', { error: String(reason).slice(0, 600) });
  });

  try {
    await instance.start();
  } catch (err) {
    process.stderr.write(`Failed to start ops-console: ${err.message}\n`);
    process.exit(1);
  }
}

main();
