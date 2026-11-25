import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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
  } = opts;
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
