import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function killGroup(pid, signal = 'SIGTERM') {
  if (!pid || process.platform === 'win32') return;
  try {
    process.kill(-pid, signal);
  } catch {
    // ESRCH: process group already exited
  }
}

function runCmdIsolatedGroup(bin, args, { timeout, env, maxBuffer, cwd }) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      env,
      cwd,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const outChunks = [];
    const errChunks = [];
    let outLen = 0;
    let errLen = 0;
    let settled = false;
    let timedOut = false;

    const cleanupGroup = () => {
      const pid = child.pid;
      if (!pid) return;
      killGroup(pid, 'SIGTERM');
      const forceKill = setTimeout(() => killGroup(pid, 'SIGKILL'), 400);
      forceKill.unref();
    };

    const timer = timeout > 0 ? setTimeout(() => {
      timedOut = true;
      cleanupGroup();
      if (!settled) {
        settled = true;
        const err = new Error(`Command timed out after ${timeout}ms: ${bin}`);
        err.code = 'ETIMEDOUT';
        err.stdout = Buffer.concat(outChunks).toString('utf8');
        err.stderr = Buffer.concat(errChunks).toString('utf8');
        reject(err);
      }
    }, timeout) : null;
    if (timer) timer.unref();

    child.stdout?.on('data', (chunk) => {
      if (outLen < maxBuffer) {
        outChunks.push(chunk);
        outLen += chunk.length;
      }
    });
    child.stderr?.on('data', (chunk) => {
      if (errLen < maxBuffer) {
        errChunks.push(chunk);
        errLen += chunk.length;
      }
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      cleanupGroup();
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    child.on('exit', (code, signal) => {
      if (timer) clearTimeout(timer);
      cleanupGroup();
      // Allow any buffered pipe data from the exiting leader to flush before resolving
      setTimeout(() => {
        if (settled) return;
        settled = true;
        const stdout = Buffer.concat(outChunks).toString('utf8');
        const stderr = Buffer.concat(errChunks).toString('utf8');
        if (timedOut || (code !== 0 && code !== null)) {
          const err = new Error(`Command failed (${code ?? signal}): ${bin}`);
          err.code = code;
          err.signal = signal;
          err.stdout = stdout;
          err.stderr = stderr;
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      }, 30).unref();
    });
  });
}

export function getUserEnv(extra = {}) {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
  return {
    ...process.env,
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${uid}`,
    ...extra,
  };
}

export async function runCmd(bin, args = [], opts = {}) {
  const {
    timeout = 5000,
    env = getUserEnv(),
    maxBuffer = 4 * 1024 * 1024,
    cwd,
    killProcessGroup = false,
  } = opts;
  if (killProcessGroup && process.platform !== 'win32') {
    return runCmdIsolatedGroup(bin, args, { timeout, env, maxBuffer, cwd });
  }
  const { stdout, stderr } = await execFileAsync(bin, args, {
    timeout,
    env,
    maxBuffer,
    cwd,
    windowsHide: true,
  });
  return { stdout: String(stdout ?? ''), stderr: String(stderr ?? '') };
}

export async function httpProbe(url, opts = {}) {
  const {
    timeoutMs = 2000,
    method = 'GET',
    headers = {},
    parseJson = true,
    maxBytes = 2 * 1024 * 1024,
  } = opts;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });
    const latencyMs = Date.now() - started;
    let json = null;
    let text = '';
    const ctype = (res.headers.get('content-type') || '').toLowerCase();
    if (method !== 'HEAD') {
      const buf = Buffer.from(await res.arrayBuffer());
      const sliced = buf.length > maxBytes ? buf.subarray(0, maxBytes) : buf;
      text = sliced.toString('utf8');
      if (parseJson && (ctype.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('['))) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
    }
    return { ok: res.ok, status: res.status, latencyMs, json, text };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      json: null,
      text: '',
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message || err),
    };
  } finally {
    clearTimeout(timer);
  }
}
