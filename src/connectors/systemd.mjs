import { httpProbe, runCmd } from '../exec.mjs';
import { redactCommand } from '../redact.mjs';
import { enrichServiceAdminMeta } from '../service-proxy.mjs';

export function parseSystemctlShowBlocks(stdout) {
  const map = new Map();
  const blocks = String(stdout || '').trim().split(/\n\n+/);
  for (const block of blocks) {
    const props = {};
    for (const line of block.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0) {
        props[line.slice(0, idx)] = line.slice(idx + 1);
      }
    }
    if (props.Id) {
      map.set(props.Id, props);
    }
  }
  return map;
}

async function batchSystemctlShow(units, scope, properties) {
  if (units.length === 0) return new Map();
  const args = [];
  if (scope === 'user') args.push('--user');
  args.push('show', ...units, `--property=${properties.join(',')}`);
  try {
    const { stdout } = await runCmd('systemctl', args, { timeout: 3500 });
    return parseSystemctlShowBlocks(stdout);
  } catch {
    return new Map();
  }
}

export async function collectSystemdServices(config) {
  const props = [
    'Id',
    'LoadState',
    'ActiveState',
    'SubState',
    'UnitFileState',
    'MainPID',
    'MemoryCurrent',
    'ActiveEnterTimestamp',
    'NRestarts',
  ];
  const userUnits = config.services.filter((s) => s.scope === 'user').map((s) => s.unit);
  const sysUnits = config.services.filter((s) => s.scope === 'system').map((s) => s.unit);

  const [userMap, sysMap] = await Promise.all([
    batchSystemctlShow(userUnits, 'user', props),
    batchSystemctlShow(sysUnits, 'system', props),
  ]);

  const items = await Promise.all(
    config.services.map(async (svc) => {
      const raw = (svc.scope === 'user' ? userMap : sysMap).get(svc.unit) || {};
      const activeState = raw.ActiveState || 'unknown';
      const subState = raw.SubState || 'unknown';
      const memRaw = raw.MemoryCurrent;
      const memoryBytes = memRaw && /^\d+$/.test(memRaw) && Number(memRaw) < 1e15 ? Number(memRaw) : null;

      let probe = null;
      if (svc.healthUrl && (activeState === 'active' || activeState === 'unknown')) {
        probe = await httpProbe(svc.healthUrl, { timeoutMs: 1600, parseJson: true });
      }

      let status = 'inactive';
      if (activeState === 'active') {
        status = probe && !probe.ok ? 'degraded' : 'healthy';
      } else if (activeState === 'failed') {
        status = 'failed';
      } else if (activeState === 'activating' || activeState === 'reloading') {
        status = 'degraded';
      } else if (activeState === 'unknown' && probe?.ok) {
        status = 'healthy';
      } else if (svc.optional) {
        status = 'standby';
      }

      const adminMeta = enrichServiceAdminMeta(svc);
      const linkedLogFile = (config.logFiles || []).find((f) => f.serviceId && f.serviceId === svc.id) || null;
      const { logFile: nativeLogFile, ...publicSvc } = svc;
      const resolvedLogFileId = nativeLogFile
        ? `svc-file:${svc.id}`
        : (linkedLogFile ? linkedLogFile.id : null);
      return {
        ...publicSvc,
        ...adminMeta,
        hasLogFile: Boolean(resolvedLogFileId),
        logFileId: resolvedLogFileId,
        loadState: raw.LoadState || 'unknown',
        activeState,
        subState,
        enabledState: raw.UnitFileState || 'unknown',
        mainPid: raw.MainPID && raw.MainPID !== '0' ? Number(raw.MainPID) : null,
        memoryBytes,
        activeSince: raw.ActiveEnterTimestamp || '',
        restarts: Number(raw.NRestarts || 0),
        status,
        probe: probe
          ? { ok: probe.ok, status: probe.status, latencyMs: probe.latencyMs, error: probe.error || null }
          : null,
      };
    }),
  );

  const summary = {
    total: items.length,
    active: items.filter((i) => i.activeState === 'active' || i.status === 'healthy').length,
    healthy: items.filter((i) => i.status === 'healthy').length,
    degraded: items.filter((i) => i.status === 'degraded').length,
    failed: items.filter((i) => i.status === 'failed' || (!i.optional && i.status === 'inactive')).length,
    optionalInactive: items.filter((i) => i.optional && i.status === 'standby').length,
  };

  return { layers: config.layers, items, summary };
}

export async function collectSystemdTimers(config) {
  const props = ['Id', 'ActiveState', 'SubState', 'UnitFileState', 'NextElapseUSecRealtime', 'LastTriggerUSec'];
  const userUnits = config.timers.filter((t) => t.scope === 'user').map((t) => t.unit);
  const sysUnits = config.timers.filter((t) => t.scope === 'system').map((t) => t.unit);
  const [userMap, sysMap] = await Promise.all([
    batchSystemctlShow(userUnits, 'user', props),
    batchSystemctlShow(sysUnits, 'system', props),
  ]);

  return config.timers.map((timer) => {
    const raw = (timer.scope === 'user' ? userMap : sysMap).get(timer.unit) || {};
    return {
      ...timer,
      activeState: raw.ActiveState || 'unknown',
      subState: raw.SubState || 'unknown',
      enabledState: raw.UnitFileState || 'unknown',
      nextElapse: raw.NextElapseUSecRealtime || '',
      lastTrigger: raw.LastTriggerUSec || '',
    };
  });
}

export async function collectAgentProcesses(config) {
  const matchers = (config.agentMatchers || []).map((m) => {
    try {
      return { ...m, re: new RegExp(m.pattern, 'i') };
    } catch {
      return null;
    }
  }).filter(Boolean);

  const processes = [];
  const counts = {};

  try {
    const { stdout } = await runCmd('ps', ['-eo', 'pid,ppid,%cpu,rss,etime,comm,args', '--no-headers'], {
      timeout: 3000,
    });
    for (const line of stdout.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.*)$/);
      if (!match) continue;
      const pid = Number(match[1]);
      const ppid = Number(match[2]);
      const cpu = Number(match[3]);
      const rssKb = Number(match[4]);
      const elapsed = match[5];
      const comm = match[6];
      const args = match[7];
      if (pid === process.pid) continue;
      if (args.includes('ps -eo')) continue;

      let matched = null;
      for (const rule of matchers) {
        if (rule.re.test(args) || rule.re.test(comm)) {
          matched = rule;
          break;
        }
      }
      if (!matched) continue;

      const sanitizedCmd = redactCommand(args, 140);

      counts[matched.category] = (counts[matched.category] || 0) + 1;
      processes.push({
        pid,
        ppid,
        cpu,
        memoryBytes: rssKb * 1024,
        elapsed,
        comm,
        category: matched.category,
        categoryLabel: matched.label,
        cmd: sanitizedCmd,
      });
    }
  } catch {
    // ignore on platforms without GNU ps --no-headers
  }

  processes.sort((a, b) => b.memoryBytes - a.memoryBytes);
  return {
    totalProcesses: processes.length,
    counts,
    processes: processes.slice(0, 60),
  };
}
