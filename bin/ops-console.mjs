#!/usr/bin/env node
import { APP_VERSION, loadConfig, parseCliArgs } from '../src/config.mjs';
import { createOpsConsole } from '../src/server.mjs';

function printHelp() {
  process.stdout.write(`ops-console v${APP_VERSION}
Self-hostable, zero-dependency operational control plane for services, AI memory engines, networks, and structured logs.

Usage:
  ops-console [options]

Options:
  -c, --config <path>     Path to JSON configuration file
      --host <ip>         Bind host or comma-separated hosts (default: 127.0.0.1)
      --hosts <list>      Alias for --host (e.g. 127.0.0.1,100.64.0.10)
  -p, --port <number>     Listen port (default: 4320)
      --web-key <secret>  Require web key auth (cookie / ?k= / Bearer, min 16 chars)
      --read-only         Disable all mutating service, timer, and ops actions
      --demo              Run in full sandbox mode with synthetic telemetry and SSE logs
      --check-config      Validate resolved configuration and exit
  -v, --version           Show version number
  -h, --help              Show this help message

Environment variables:
  OPS_CONSOLE_CONFIG      Config file path
  OPS_CONSOLE_HOSTS       Comma-separated bind hosts
  OPS_CONSOLE_PORT        Listen port
  OPS_CONSOLE_WEB_KEY     Web key secret (>= 16 characters)
  OPS_CONSOLE_READ_ONLY   1 / true to enable read-only mode
  OPS_CONSOLE_DEMO        1 / true to enable demo sandbox mode
  OPS_CONSOLE_DATA_DIR    Directory for rotating ops-console.jsonl and audit.jsonl
  OPS_CONSOLE_LOG_LEVEL   debug | info | warn | error
`);
}

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.showHelp) {
    printHelp();
    process.exit(0);
  }
  if (cli.showVersion) {
    process.stdout.write(`ops-console v${APP_VERSION}\n`);
    process.exit(0);
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
      services: config.services.length,
      timers: config.timers.length,
      logFiles: config.logFiles.length,
      remotes: config.remotes.length,
      enabledConnectors,
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.exit(0);
  }

  const instance = createOpsConsole({ config });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const forceTimer = setTimeout(() => process.exit(1), 5000);
    forceTimer.unref();
    instance.logger.info('shutdown_signal', { signal });
    try {
      await instance.stop();
      process.exit(0);
    } catch (err) {
      process.stderr.write(`Shutdown error: ${err.message}\n`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
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
