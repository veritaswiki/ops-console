import fs from 'node:fs/promises';
import os from 'node:os';
import { runCmd } from '../exec.mjs';

export async function collectHostMetrics(config) {
  const cpus = os.cpus();
  const load = os.loadavg();
  const totalMem = os.totalmem();
  let availMem = os.freemem();

  try {
    const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
    const match = meminfo.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    if (match) availMem = Number(match[1]) * 1024;
  } catch {
    // non-Linux fallback uses os.freemem()
  }

  const disks = [];
  const mounts = config.host?.mounts || ['/'];
  try {
    const { stdout } = await runCmd('df', ['-B1', '--output=target,size,used,avail,pcent', ...mounts], {
      timeout: 2500,
    });
    const seen = new Set();
    for (const line of stdout.trim().split('\n').slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && !seen.has(parts[0])) {
        seen.add(parts[0]);
        disks.push({
          mount: parts[0],
          sizeBytes: Number(parts[1]),
          usedBytes: Number(parts[2]),
          availBytes: Number(parts[3]),
          usePercent: Number(parts[4].replace('%', '')),
        });
      }
    }
  } catch {
    try {
      const { stdout } = await runCmd('df', ['-k', '/'], { timeout: 2500 });
      const line = stdout.trim().split('\n')[1];
      if (line) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const sizeBytes = Number(parts[1]) * 1024;
          const usedBytes = Number(parts[2]) * 1024;
          const availBytes = Number(parts[3]) * 1024;
          const usePercent = Number(String(parts[4]).replace('%', '')) || 0;
          disks.push({ mount: '/', sizeBytes, usedBytes, availBytes, usePercent });
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    nodeVersion: process.version,
    cpuCores: cpus.length,
    load1: Number(load[0].toFixed(2)),
    load5: Number(load[1].toFixed(2)),
    load15: Number(load[2].toFixed(2)),
    uptimeSeconds: Math.floor(os.uptime()),
    memory: {
      totalBytes: totalMem,
      availBytes: availMem,
      usedBytes: Math.max(0, totalMem - availMem),
      usedPercent: totalMem > 0 ? Number((((totalMem - availMem) / totalMem) * 100).toFixed(1)) : 0,
    },
    disks,
  };
}
