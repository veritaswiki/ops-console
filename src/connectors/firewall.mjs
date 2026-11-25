import { runCmd } from '../exec.mjs';

export function parseIptablesSave(stdout, family = 'ipv4') {
  const rules = [];
  const policies = {};
  let currentTable = 'filter';

  for (const rawLine of String(stdout || '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line === 'COMMIT') continue;

    if (line.startsWith('*')) {
      currentTable = line.slice(1).trim();
      continue;
    }

    const policyMatch = line.match(/^:(\S+)\s+(\S+)(?:\s+\[(\d+):(\d+)\])?/);
    if (policyMatch) {
      const [, chain, policy, packets, bytes] = policyMatch;
      if (policy !== '-') {
        policies[`${currentTable}:${chain}`] = {
          table: currentTable,
          chain,
          policy,
          packets: Number(packets || 0),
          bytes: Number(bytes || 0),
        };
      }
      continue;
    }

    const ruleMatch = line.match(/^(?:\[(\d+):(\d+)\]\s+)?-A\s+(\S+)\s+(.*)$/);
    if (!ruleMatch) continue;
    const packets = Number(ruleMatch[1] || 0);
    const bytes = Number(ruleMatch[2] || 0);
    const chain = ruleMatch[3];
    const body = ruleMatch[4];

    const ifaceMatch = body.match(/(?:^|\s)(!\s*)?-i\s+(\S+)/);
    const protoMatch = body.match(/(?:^|\s)-p\s+(\S+)/);
    const dportMatch = body.match(/(?:^|\s)--dports?\s+(\S+)/);
    const sourceMatch = body.match(/(?:^|\s)-s\s+(\S+)/);
    const targetMatch = body.match(/(?:^|\s)-j\s+(\S+)/);
    const commentMatch = body.match(/--comment\s+"([^"]+)"|--comment\s+(\S+)/);

    rules.push({
      family,
      table: currentTable,
      chain,
      inIface: ifaceMatch ? `${ifaceMatch[1] ? '!' : ''}${ifaceMatch[2]}` : '*',
      proto: protoMatch ? protoMatch[1] : 'all',
      dport: dportMatch ? dportMatch[1] : '*',
      source: sourceMatch ? sourceMatch[1] : '*',
      target: targetMatch ? targetMatch[1] : '',
      packets,
      bytes,
      comment: commentMatch ? (commentMatch[1] || commentMatch[2] || '') : '',
    });
  }

  return { family, policies, rules };
}

export function parseListeningSockets(stdout, proto = 'tcp') {
  const sockets = [];
  for (const rawLine of String(stdout || '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;
    const localAddr = parts[3] || '';
    const lastColon = localAddr.lastIndexOf(':');
    if (lastColon === -1) continue;
    const hostRaw = localAddr.slice(0, lastColon).replace(/^\[|\]$/g, '');
    const port = Number(localAddr.slice(lastColon + 1));
    if (!Number.isInteger(port)) continue;

    const procMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
    const bindScope = classifyBindAddress(hostRaw);

    sockets.push({
      proto,
      bind: hostRaw || '*',
      port,
      scope: bindScope,
      process: procMatch ? procMatch[1] : '',
      pid: procMatch ? Number(procMatch[2]) : null,
    });
  }
  return sockets;
}

export function classifyBindAddress(addr) {
  const clean = String(addr || '').trim().replace(/%.+$/, '');
  if (!clean || clean === '0.0.0.0' || clean === '*' || clean === '::') return 'public-wildcard';
  if (clean === '127.0.0.1' || clean === '::1' || clean.startsWith('127.')) return 'loopback';
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(clean) || /^fd7a:115c:a1e0:/i.test(clean)) return 'tailnet';
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(clean)) return 'lan';
  return 'other';
}

export function evaluatePortExposure(sockets, rules) {
  const guardedPorts = new Set();
  const droppedPackets = rules
    .filter((r) => ['DROP', 'REJECT'].includes(r.target))
    .reduce((sum, r) => sum + (r.packets || 0), 0);

  for (const rule of rules) {
    if (!['DROP', 'REJECT'].includes(rule.target)) continue;
    if (rule.dport === '*') continue;
    for (const part of String(rule.dport).split(',')) {
      const port = Number(part.trim());
      if (Number.isInteger(port)) guardedPorts.add(port);
    }
  }

  const dedup = new Map();
  for (const sock of sockets) {
    const key = `${sock.proto}:${sock.bind}:${sock.port}`;
    if (dedup.has(key)) continue;
    const guarded = sock.scope === 'public-wildcard' && guardedPorts.has(sock.port);
    const posture = sock.scope === 'loopback'
      ? 'loopback'
      : sock.scope === 'tailnet'
        ? 'tailnet'
        : guarded
          ? 'tailnet-guarded'
          : sock.scope === 'public-wildcard'
            ? 'public'
            : sock.scope;
    dedup.set(key, {
      ...sock,
      guarded,
      posture,
    });
  }

  const items = [...dedup.values()].sort((a, b) => a.port - b.port || a.bind.localeCompare(b.bind));
  return {
    items,
    summary: {
      totalListeners: items.length,
      loopback: items.filter((s) => s.posture === 'loopback').length,
      tailnet: items.filter((s) => s.posture === 'tailnet' || s.posture === 'tailnet-guarded').length,
      publicUnfiltered: items.filter((s) => s.posture === 'public').length,
      guardedPorts: [...guardedPorts].sort((a, b) => a - b),
      droppedPackets,
    },
  };
}

async function tryReadCommand(bin, args, timeout = 3000) {
  try {
    const res = await runCmd(bin, args, { timeout });
    return { ok: true, stdout: res.stdout };
  } catch (err) {
    return { ok: false, stdout: '', error: err.message };
  }
}

export async function collectFirewall(cfg = {}) {
  if (cfg.enabled === false) {
    return { id: 'firewall', name: 'Host Firewall', enabled: false, mode: 'disabled', rules: [], listeners: [], summary: {} };
  }

  const [v4Res, v6Res, tcpRes, udpRes] = await Promise.all([
    tryReadCommand('sudo', ['-n', 'iptables-save', '-c'], 3000).then((r) => (r.ok ? r : tryReadCommand('iptables-save', ['-c'], 2500))),
    tryReadCommand('sudo', ['-n', 'ip6tables-save', '-c'], 3000).then((r) => (r.ok ? r : tryReadCommand('ip6tables-save', ['-c'], 2500))),
    tryReadCommand('ss', ['-Htlpn'], 2500),
    tryReadCommand('ss', ['-Hulpn'], 2500),
  ]);

  const v4 = v4Res.ok ? parseIptablesSave(v4Res.stdout, 'ipv4') : { family: 'ipv4', policies: {}, rules: [] };
  const v6 = v6Res.ok ? parseIptablesSave(v6Res.stdout, 'ipv6') : { family: 'ipv6', policies: {}, rules: [] };
  const inputRules = [...v4.rules, ...v6.rules].filter((r) => r.table === 'filter' && (r.chain === 'INPUT' || r.chain === 'DOCKER-USER' || r.chain.startsWith('ts-')));

  const sockets = [
    ...(tcpRes.ok ? parseListeningSockets(tcpRes.stdout, 'tcp') : []),
    ...(udpRes.ok ? parseListeningSockets(udpRes.stdout, 'udp') : []),
  ];
  const exposure = evaluatePortExposure(sockets, inputRules);
  const backend = v4Res.ok || v6Res.ok ? 'iptables' : 'sockets-only';

  return {
    id: 'firewall',
    name: 'Host Firewall & Port Posture',
    enabled: true,
    readOnly: true,
    backend,
    protocol: 'Read-only iptables-save -c / ip6tables-save -c + ss -Htlpn',
    status: backend === 'iptables' ? 'healthy' : (tcpRes.ok ? 'degraded' : 'offline'),
    policies: { ...v4.policies, ...v6.policies },
    rules: inputRules.slice(0, 80),
    totalRules: inputRules.length,
    listeners: exposure.items.slice(0, 80),
    summary: {
      ...exposure.summary,
      ipv4Rules: v4.rules.filter((r) => r.table === 'filter').length,
      ipv6Rules: v6.rules.filter((r) => r.table === 'filter').length,
    },
    permissionHint: backend === 'sockets-only'
      ? 'Install read-only sudoers for iptables-save -c / ip6tables-save -c to inspect packet counters and drop rules.'
      : null,
  };
}
