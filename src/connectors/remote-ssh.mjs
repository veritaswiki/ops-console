import os from 'node:os';
import path from 'node:path';
import { runCmd } from '../exec.mjs';

async function probeSingleRemote(node) {
  const started = Date.now();
  const sshKey = node.sshKey || path.join(os.homedir(), '.ssh', 'id_ed25519');
  const safeBackupPath = node.backupPath && /^[A-Za-z0-9/._-]+$/.test(node.backupPath) ? node.backupPath : '';

  const remoteCmd = [
    'echo "HOST=$(hostname)"',
    'echo "UPTIME=$(uptime -p 2>/dev/null || uptime)"',
    'echo "LOAD=$(cut -d" " -f1-3 /proc/loadavg 2>/dev/null || echo n/a)"',
    'echo "MEM=$(free -m 2>/dev/null | awk \'/Mem:/ {printf "%d/%dMB", $3, $2}\')"',
    'echo "DISK=$(df -h / 2>/dev/null | awk \'NR==2 {printf "%s/%s (%s)", $3, $2, $5}\')"',
    'echo "FAILED=$(systemctl --failed --no-legend --no-pager 2>/dev/null | wc -l)"',
    safeBackupPath
      ? `echo "BACKUP=$(du -sh ${safeBackupPath}/latest 2>/dev/null | awk '{print $1}' || echo none):$(readlink ${safeBackupPath}/latest 2>/dev/null || echo none)"`
      : 'echo "BACKUP=n/a"',
  ].join('; ');

  const sshArgs = [
    '-i',
    sshKey,
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=4',
    '-o',
    `StrictHostKeyChecking=${node.strictHostKeyChecking || 'yes'}`,
    node.sshTarget,
    remoteCmd,
  ];

  try {
    const { stdout } = await runCmd('ssh', sshArgs, { timeout: 6500 });
    const map = {};
    for (const line of stdout.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0) map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return {
      id: node.id,
      name: node.name,
      ip: node.ip,
      role: node.role,
      reachable: true,
      rttMs: Date.now() - started,
      hostname: map.HOST || node.id,
      uptime: map.UPTIME || '',
      load: map.LOAD || '',
      memory: map.MEM || '',
      disk: map.DISK || '',
      failedUnits: Number(map.FAILED || 0),
      backup: map.BACKUP || 'n/a',
      probedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      id: node.id,
      name: node.name,
      ip: node.ip,
      role: node.role,
      reachable: false,
      rttMs: Date.now() - started,
      error: err.killed ? 'SSH probe timed out' : (err.stderr || err.message || 'SSH unreachable').trim().slice(0, 160),
      probedAt: new Date().toISOString(),
    };
  }
}

export async function collectRemoteNodes(config, cache, force = false) {
  const nodes = config.remotes || [];
  if (nodes.length === 0) return [];
  return cache.getOrLoad(
    'remotes',
    60_000,
    () => Promise.all(nodes.map((n) => probeSingleRemote(n))),
    { force, staleOnError: true },
  );
}
