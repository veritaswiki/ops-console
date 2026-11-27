import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const SESSION_COOKIE_NAME = 'ops_console_session';
const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function safeEqualString(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function deriveSessionToken(webKey) {
  return crypto.createHmac('sha256', webKey).update('ops-console:session:v2').digest('hex');
}

export function parseCookies(cookieHeader = '') {
  const map = {};
  if (!cookieHeader) return map;
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      try {
        map[k] = decodeURIComponent(v);
      } catch {
        map[k] = v;
      }
    }
  }
  return map;
}

export function buildSessionCookie(token, isHttps = false) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
  ];
  if (isHttps) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function checkRequestAuth(req, url, webKey) {
  if (!webKey) return { authorized: true, method: 'none' };

  const expectedToken = deriveSessionToken(webKey);

  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    const candidate = authHeader.slice(7).trim();
    if (safeEqualString(candidate, webKey)) {
      return { authorized: true, method: 'bearer' };
    }
  }

  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies[SESSION_COOKIE_NAME] && safeEqualString(cookies[SESSION_COOKIE_NAME], expectedToken)) {
    return { authorized: true, method: 'cookie' };
  }

  const queryKey = url.searchParams.get('k');
  if (queryKey && safeEqualString(queryKey, webKey)) {
    return { authorized: true, method: 'query-bootstrap', setCookieToken: expectedToken };
  }

  return { authorized: false, method: 'denied' };
}

export function verifySameOrigin(req, allowedOrigins = [], opts = {}) {
  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) return true;

  const host = String(req.headers.host || '').toLowerCase();
  const forwardedHost = opts.trustProxy
    ? String(req.headers['x-forwarded-host'] || '').split(',')[0].trim().toLowerCase()
    : '';
  const origin = req.headers.origin ? String(req.headers.origin) : '';
  const referer = req.headers.referer ? String(req.headers.referer) : '';

  if (!origin && !referer) return true;

  const checkHeaderUrl = (raw) => {
    try {
      const parsed = new URL(raw);
      const parsedHost = parsed.host.toLowerCase();
      if (parsedHost === host) return true;
      if (forwardedHost && parsedHost === forwardedHost) return true;
      if (allowedOrigins.includes(parsed.origin)) return true;
      return false;
    } catch {
      return false;
    }
  };

  if (origin) return checkHeaderUrl(origin);
  if (referer) return checkHeaderUrl(referer);
  return false;
}

export function getSecurityHeaders(opts = {}) {
  const isHtml = Boolean(opts.isHtml);
  const allowIframe = Boolean(opts.allowIframe);
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  if (!allowIframe) {
    headers['X-Frame-Options'] = 'DENY';
  }
  if (isHtml) {
    const directives = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data:",
      "connect-src 'self'",
      "base-uri 'self'",
      "frame-src 'self' https: http:",
    ];
    if (!allowIframe) {
      directives.push("frame-ancestors 'none'");
    }
    headers['Content-Security-Policy'] = directives.join('; ');
  }
  return headers;
}

export async function resolveSafePath(baseDir, requestedRelPath) {
  const baseReal = await fs.realpath(baseDir);
  const cleanRel = String(requestedRelPath || '').replace(/^\/+/, '');
  const joined = path.resolve(baseReal, cleanRel);
  if (joined !== baseReal && !joined.startsWith(baseReal + path.sep)) {
    return null;
  }
  try {
    const targetReal = await fs.realpath(joined);
    if (targetReal !== baseReal && !targetReal.startsWith(baseReal + path.sep)) {
      return null;
    }
    return targetReal;
  } catch {
    return null;
  }
}

export class SlidingWindowRateLimiter {
  constructor({ windowMs = 60_000, maxRequests = 240, maxBuckets = 4096 } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.maxBuckets = Math.max(64, Number(maxBuckets) || 4096);
    this.buckets = new Map();
    this.lastSweep = Date.now();
  }

  allow(key) {
    const now = Date.now();
    if (now - this.lastSweep > this.windowMs) {
      this._sweep(now);
    }
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.maxBuckets) {
        const oldestKey = this.buckets.keys().next().value;
        if (oldestKey !== undefined) this.buckets.delete(oldestKey);
      }
      bucket = { list: [], head: 0 };
      this.buckets.set(key, bucket);
    } else {
      // Refresh LRU position so active clients aren't evicted before idle IPs
      this.buckets.delete(key);
      this.buckets.set(key, bucket);
    }
    const { list } = bucket;
    let { head } = bucket;
    const cutoff = now - this.windowMs;
    while (head < list.length && list[head] <= cutoff) {
      head += 1;
    }
    if (head > 64 && head * 2 >= list.length) {
      bucket.list = list.slice(head);
      bucket.head = 0;
    } else {
      bucket.head = head;
    }
    const activeLen = bucket.list.length - bucket.head;
    if (activeLen >= this.maxRequests) {
      const oldestTs = bucket.list[bucket.head];
      const retryAfterSec = Math.max(1, Math.ceil((oldestTs + this.windowMs - now) / 1000));
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    bucket.list.push(now);
    return { allowed: true, remaining: this.maxRequests - (activeLen + 1), retryAfterSec: 0 };
  }

  _sweep(now) {
    const cutoff = now - this.windowMs;
    for (const [key, bucket] of this.buckets.entries()) {
      const { list } = bucket;
      let { head } = bucket;
      while (head < list.length && list[head] <= cutoff) head += 1;
      if (head >= list.length) {
        this.buckets.delete(key);
      } else if (head > 64 && head * 2 >= list.length) {
        bucket.list = list.slice(head);
        bucket.head = 0;
      } else {
        bucket.head = head;
      }
    }
    this.lastSweep = now;
  }
}

export function renderLoginPage(title = 'Ops Console', errorMsg = '') {
  const safeTitle = String(title).replace(/[<>&"]/g, '');
  const safeErr = String(errorMsg).replace(/[<>&"]/g, '');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} · Sign in</title>
  <style>
    :root { --bg:#f4f5f7; --surface:#ffffff; --border:#dde2ea; --ink:#11161f; --muted:#526071; --accent:#0f766e; --danger:#dc2626; }
    @media (prefers-color-scheme: dark) {
      :root { --bg:#0b0f14; --surface:#111720; --border:#232f3e; --ink:#f1f5f9; --muted:#94a3b8; --accent:#14b8a6; --danger:#f87171; }
    }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--bg); color:var(--ink); font-family:system-ui,-apple-system,sans-serif; padding:24px; }
    .gate { width:100%; max-width:400px; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:28px; }
    h1 { margin:0 0 8px; font-size:20px; font-weight:650; letter-spacing:-0.02em; }
    p { margin:0 0 20px; font-size:14px; line-height:1.5; color:var(--muted); }
    label { display:block; font-size:13px; font-weight:500; margin-bottom:6px; }
    input { width:100%; padding:10px 12px; font-size:14px; border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--ink); margin-bottom:14px; font-family:ui-monospace,monospace; }
    button { width:100%; padding:10px 16px; font-size:14px; font-weight:600; border:0; border-radius:8px; background:var(--accent); color:#fff; cursor:pointer; }
    .err { color:var(--danger); font-size:13px; margin-bottom:12px; }
  </style>
</head>
<body>
  <main class="gate">
    <h1>${safeTitle}</h1>
    <p>Enter the console web key to establish a signed browser session, or open the link containing <code>?k=...</code>.</p>
    ${safeErr ? `<div class="err">${safeErr}</div>` : ''}
    <form id="loginForm" method="post" action="/api/auth/login">
      <label for="key">Web Key</label>
      <input id="key" name="key" type="password" autocomplete="current-password" required autofocus placeholder="Enter web key" />
      <button type="submit">Sign in</button>
    </form>
  </main>
</body>
</html>`;
}
