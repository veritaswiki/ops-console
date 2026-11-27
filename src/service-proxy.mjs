import { SESSION_COOKIE_NAME } from './security.mjs';

const ALLOWED_PROXY_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const MAX_PROXY_BODY_BYTES = 4 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 15_000;

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'accept-encoding',
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'transfer-encoding',
  'content-encoding',
  'content-length',
  'connection',
  'keep-alive',
  'set-cookie',
  'location',
]);

const EXCLUDED_SERVICE_IDS = new Set([
  'ops-console',
  'tailscaled',
  'postgresql',
  'docker',
  'rerank-gateway',
  'rerank',
  'emb-gateway',
  'embedding',
  'herdr',
]);

const EXCLUDED_UNIT_RE = /(?:^|[-_.])(ops-console|tailscaled|postgresql|docker|rerank|emb-gateway|herdr|firewall|ufw|nftables|iptables|tunnel|cloudflared|frpc|frps)(?:[-_.]|@|\.service|$)/i;

const DEFAULT_ADMIN_LABELS = {
  nmem: 'Nowledge Mem Web',
  openviking: 'OpenViking Studio',
  symbiote: 'Symbiote Workbench',
  syncthing: 'Syncthing GUI',
  t3code: 'T3 Code',
  orchestrator: 'Agent Orchestrator',
  magpie: 'Magpie Gateway UI',
  'kline-board': 'Kline Board',
  'ctyun-dashboard': 'Dashboard UI',
};

function parseHttpUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeOrigin(raw) {
  const parsed = parseHttpUrl(raw);
  return parsed ? parsed.origin : null;
}

function isExcludedService(svc) {
  const id = String(svc?.id || '').trim().toLowerCase();
  const unit = String(svc?.unit || '').trim().toLowerCase();
  if (EXCLUDED_SERVICE_IDS.has(id)) return true;
  if (unit && EXCLUDED_UNIT_RE.test(unit)) return true;
  if (id && EXCLUDED_UNIT_RE.test(id)) return true;
  return false;
}

export function resolveServiceAdminUrl(svc) {
  if (!svc || typeof svc !== 'object') return null;

  if (svc.adminUrl !== undefined && svc.adminUrl !== null && String(svc.adminUrl).trim() !== '') {
    const explicit = parseHttpUrl(String(svc.adminUrl));
    return explicit ? explicit.href : null;
  }

  if (isExcludedService(svc)) return null;

  const id = String(svc.id || '').trim().toLowerCase();
  const healthOrigin = safeOrigin(svc.healthUrl);
  const tailnetParsed = parseHttpUrl(svc.tailnetUrl);
  const healthParsed = parseHttpUrl(svc.healthUrl);

  if (id === 'nmem') {
    return `${healthOrigin || 'http://127.0.0.1:14242'}/app`;
  }
  if (id === 'openviking') {
    return `${healthOrigin || 'http://127.0.0.1:1933'}/studio/`;
  }
  if (id === 'symbiote') {
    return `${healthOrigin || 'http://127.0.0.1:4318'}/`;
  }
  if (id === 'syncthing') {
    return `${healthOrigin || 'http://127.0.0.1:8384'}/`;
  }
  if (id === 't3code' || id === 'orchestrator') {
    return `${healthOrigin || 'http://127.0.0.1:3773'}/`;
  }
  if (id === 'magpie') {
    return tailnetParsed ? tailnetParsed.href : 'http://127.0.0.1:3430/';
  }
  if (id === 'kline-board' || id === 'ctyun-dashboard') {
    return healthParsed ? healthParsed.href : null;
  }
  if (tailnetParsed) {
    return tailnetParsed.href;
  }
  return null;
}

export function enrichServiceAdminMeta(svc) {
  const adminUrl = resolveServiceAdminUrl(svc);
  const hasAdminUi = Boolean(adminUrl);
  const id = String(svc?.id || '').trim();
  const lowerId = id.toLowerCase();
  const adminLabel = svc?.adminLabel
    ? String(svc.adminLabel).trim()
    : (hasAdminUi ? (DEFAULT_ADMIN_LABELS[lowerId] || `${svc?.name || id} UI`) : null);

  return {
    healthUrl: svc?.healthUrl || null,
    tailnetUrl: svc?.tailnetUrl || null,
    adminUrl,
    adminLabel,
    embedUrl: hasAdminUi && id ? `/embed/${encodeURIComponent(id)}/` : null,
    hasAdminUi,
  };
}

function normalizeEmbedBase(embedBase) {
  const raw = String(embedBase || '/embed/').trim();
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export function rewriteLocationHeader(location, embedBase, targetOrigin = '') {
  if (!location || typeof location !== 'string') return location;
  const trimmed = location.trim();
  if (!trimmed) return trimmed;

  const base = normalizeEmbedBase(embedBase);
  const prefix = base.slice(0, -1);

  if (trimmed === prefix || trimmed.startsWith(base) || trimmed.startsWith('/embed/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${prefix}${trimmed}`;
  }
  if (targetOrigin) {
    try {
      const parsed = new URL(trimmed);
      const originNorm = new URL(targetOrigin).origin;
      if (parsed.origin === originNorm) {
        return `${prefix}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // Relative or malformed location; return untouched
    }
  }
  return trimmed;
}

export function rewriteUpstreamReferer(rawReferer, embedBase, targetOrigin) {
  if (!rawReferer || !targetOrigin) return '';
  const prefix = normalizeEmbedBase(embedBase).slice(0, -1);
  try {
    const parsed = new URL(String(rawReferer).trim());
    const originNorm = new URL(targetOrigin).origin;
    let pathname = parsed.pathname || '/';
    if (pathname === prefix) {
      pathname = '/';
    } else if (pathname.startsWith(`${prefix}/`)) {
      pathname = pathname.slice(prefix.length) || '/';
    }
    return `${originNorm}${pathname}${parsed.search || ''}`;
  } catch {
    return '';
  }
}

export function buildEmbedRuntimeShim(prefix) {
  const serializedPrefix = JSON.stringify(prefix).replace(/</g, '\\u003c');
  return (
    '<script data-ops-embed-shim="1">(function(){'
    + `var p=${serializedPrefix};`
    + 'function rw(u){'
    + 'if(typeof u!=="string"||!u)return u;'
    + 'if(u===p||u.indexOf(p+"/")===0||u.indexOf("/embed/")===0)return u;'
    + 'if(u.charAt(0)==="/"&&u.charAt(1)!=="/")return p+u;'
    + 'try{var o=window.location.origin;if(o&&u.indexOf(o+"/")===0){var r=u.slice(o.length);if(r!==p&&r.indexOf(p+"/")!==0&&r.indexOf("/embed/")!==0)return o+p+r;}}catch(_){}'
    + 'return u;}'
    + 'if(typeof window.fetch==="function"){'
    + 'var _f=window.fetch.bind(window);'
    + 'window.fetch=function(i,n){'
    + 'if(typeof i==="string")return _f(rw(i),n);'
    + 'if(i&&typeof i==="object"&&typeof i.url==="string"){var nu=rw(i.url);if(nu!==i.url){try{return _f(new Request(nu,i),n);}catch(_){}}}'
    + 'return _f(i,n);};}'
    + 'if(window.XMLHttpRequest&&window.XMLHttpRequest.prototype){'
    + 'var _o=window.XMLHttpRequest.prototype.open;'
    + 'window.XMLHttpRequest.prototype.open=function(m,u){'
    + 'var a=Array.prototype.slice.call(arguments);if(typeof u==="string")a[1]=rw(u);return _o.apply(this,a);};}'
    + 'if(typeof window.EventSource==="function"){'
    + 'var _E=window.EventSource;'
    + 'window.EventSource=function(u,c){return new _E(typeof u==="string"?rw(u):u,c);};'
    + 'window.EventSource.prototype=_E.prototype;}'
    + 'function patchProp(C,prop){try{if(!C||!C.prototype)return;var d=Object.getOwnPropertyDescriptor(C.prototype,prop);if(d&&d.set&&d.configurable){Object.defineProperty(C.prototype,prop,{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){return d.set.call(this,typeof v==="string"?rw(v):v);}});}}catch(_){}}'
    + 'patchProp(window.HTMLLinkElement,"href");'
    + 'patchProp(window.HTMLScriptElement,"src");'
    + 'try{if(window.Element&&window.Element.prototype&&typeof window.Element.prototype.setAttribute==="function"){'
    + 'var _sa=window.Element.prototype.setAttribute;'
    + 'window.Element.prototype.setAttribute=function(k,v){'
    + 'if(typeof k==="string"&&typeof v==="string"){'
    + 'var lk=k.toLowerCase();var tn=this&&this.tagName?String(this.tagName).toUpperCase():"";'
    + 'if((tn==="LINK"&&lk==="href")||(tn==="SCRIPT"&&lk==="src")){v=rw(v);}}'
    + 'return _sa.call(this,k,v);};}}catch(_){}'
    + '})();</script>'
  );
}

export function rewriteEmbeddedHtml(html, embedBase, targetOrigin = '') {
  if (typeof html !== 'string' || !html) return html;
  const base = normalizeEmbedBase(embedBase);
  const prefix = base.slice(0, -1);
  const originNorm = (() => {
    if (!targetOrigin) return '';
    try {
      return new URL(targetOrigin).origin;
    } catch {
      return '';
    }
  })();

  let out = html;
  const safeBaseHref = base.replace(/"/g, '&quot;');
  const runtimeShim = buildEmbedRuntimeShim(prefix);
  if (!/<base\b/i.test(out)) {
    if (/<head\b[^>]*>/i.test(out)) {
      out = out.replace(/<head\b[^>]*>/i, (match) => `${match}<base href="${safeBaseHref}">${runtimeShim}`);
    } else if (/<html\b[^>]*>/i.test(out)) {
      out = out.replace(/<html\b[^>]*>/i, (match) => `${match}<head><base href="${safeBaseHref}">${runtimeShim}</head>`);
    } else {
      out = `<base href="${safeBaseHref}">${runtimeShim}${out}`;
    }
  } else if (!out.includes('data-ops-embed-shim=')) {
    out = out.replace(/<base\b[^>]*>/i, (match) => `${match}${runtimeShim}`);
  }

  out = out.replace(/(\b(?:href|src|action)\s*=\s*)(["'])([^"']*)\2/gi, (full, attrPrefix, quote, rawVal) => {
    const val = rawVal.trim();
    if (
      !val ||
      val.startsWith('#') ||
      val.startsWith('//') ||
      val.startsWith('/embed/') ||
      val === prefix ||
      val.startsWith(base) ||
      /^(?:data|javascript|mailto|tel|blob|about):/i.test(val)
    ) {
      return full;
    }

    if (val.startsWith('/')) {
      return `${attrPrefix}${quote}${prefix}${val}${quote}`;
    }

    if (originNorm && val.startsWith(originNorm)) {
      const rest = val.slice(originNorm.length);
      if (!rest) {
        return `${attrPrefix}${quote}${base}${quote}`;
      }
      if (rest.startsWith('/')) {
        return `${attrPrefix}${quote}${prefix}${rest}${quote}`;
      }
      if (rest.startsWith('?') || rest.startsWith('#')) {
        return `${attrPrefix}${quote}${base}${rest}${quote}`;
      }
    }

    return full;
  });

  return out;
}

function rewriteSetCookieLine(cookieLine) {
  const parts = String(cookieLine || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';

  const nameVal = parts[0];
  const attrs = [];
  let hasPath = false;
  for (const attr of parts.slice(1)) {
    const lower = attr.toLowerCase();
    if (lower.startsWith('domain=')) {
      continue;
    }
    if (lower.startsWith('path=')) {
      attrs.push('Path=/');
      hasPath = true;
      continue;
    }
    if (lower === 'samesite=strict') {
      attrs.push('SameSite=Lax');
      continue;
    }
    attrs.push(attr);
  }
  if (!hasPath) {
    attrs.push('Path=/');
  }
  return [nameVal, ...attrs].join('; ');
}

function filterOutgoingCookies(cookieHeader) {
  if (!cookieHeader) return '';
  const kept = String(cookieHeader)
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      const idx = part.indexOf('=');
      if (idx <= 0) return false;
      const name = part.slice(0, idx).trim();
      return name !== SESSION_COOKIE_NAME;
    });
  return kept.join('; ');
}

function readRawRequestBuffer(req, maxBytes = MAX_PROXY_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        const err = new Error('Proxied request body too large');
        err.statusCode = 413;
        req.destroy(err);
        reject(err);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendProxyJson(res, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(body.length),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

export async function handleServiceEmbedProxy({ req, res, pathname, search = '', config, authChecked = false }) {
  if (!authChecked) {
    sendProxyJson(res, 401, { ok: false, error: 'Authentication required for embedded service proxy' });
    return;
  }

  const match = String(pathname || '').match(/^\/embed\/([^/]+)(\/.*)?$/);
  if (!match) {
    sendProxyJson(res, 404, { ok: false, error: 'Embedded service not found' });
    return;
  }

  let serviceId;
  try {
    serviceId = decodeURIComponent(match[1]);
  } catch {
    sendProxyJson(res, 400, { ok: false, error: 'Malformed service identifier' });
    return;
  }

  const restPath = match[2] || '';
  const services = Array.isArray(config?.services) ? config.services : [];
  const svc = services.find((item) => item && item.id === serviceId);
  if (!svc) {
    sendProxyJson(res, 404, { ok: false, error: `Unknown managed service: ${serviceId}` });
    return;
  }

  if (svc.adminUrl !== undefined && svc.adminUrl !== null && String(svc.adminUrl).trim() !== '') {
    if (!parseHttpUrl(String(svc.adminUrl))) {
      sendProxyJson(res, 400, { ok: false, error: 'Invalid upstream adminUrl protocol (only http/https allowed)' });
      return;
    }
  }

  const resolvedAdminUrl = resolveServiceAdminUrl(svc);
  if (!resolvedAdminUrl) {
    sendProxyJson(res, 404, { ok: false, error: `Service "${serviceId}" does not expose an embedded admin UI` });
    return;
  }

  const baseTarget = parseHttpUrl(resolvedAdminUrl);
  if (!baseTarget) {
    sendProxyJson(res, 400, { ok: false, error: 'Invalid upstream adminUrl protocol (only http/https allowed)' });
    return;
  }

  const embedBase = `/embed/${encodeURIComponent(serviceId)}/`;
  if (!restPath) {
    res.writeHead(302, {
      Location: `${embedBase}${search || ''}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end();
    return;
  }

  if (restPath.startsWith('//')) {
    sendProxyJson(res, 400, { ok: false, error: 'Invalid proxy path' });
    return;
  }

  const method = String(req.method || 'GET').toUpperCase();
  if (!ALLOWED_PROXY_METHODS.has(method)) {
    sendProxyJson(res, 405, { ok: false, error: `Method not allowed: ${method}` });
    return;
  }

  let upstreamUrl;
  try {
    if (restPath === '/') {
      upstreamUrl = new URL(baseTarget.href);
      if (search) {
        const incomingParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
        for (const [key, val] of incomingParams.entries()) {
          upstreamUrl.searchParams.set(key, val);
        }
      }
    } else {
      upstreamUrl = new URL(`${restPath}${search || ''}`, baseTarget.origin);
      if (upstreamUrl.origin !== baseTarget.origin) {
        sendProxyJson(res, 400, { ok: false, error: 'Upstream origin mismatch' });
        return;
      }
    }
  } catch {
    sendProxyJson(res, 400, { ok: false, error: 'Invalid upstream target URL' });
    return;
  }

  const outHeaders = new Headers();
  for (const [key, rawVal] of Object.entries(req.headers || {})) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_REQUEST_HEADERS.has(lower)) continue;
    if (rawVal === undefined) continue;
    const strVal = Array.isArray(rawVal) ? rawVal.join(', ') : String(rawVal);
    if (lower === 'cookie') {
      const filtered = filterOutgoingCookies(Array.isArray(rawVal) ? rawVal.join('; ') : String(rawVal));
      if (filtered) outHeaders.set('cookie', filtered);
      continue;
    }
    if (lower === 'origin') {
      if (strVal.trim()) outHeaders.set('origin', baseTarget.origin);
      continue;
    }
    if (lower === 'referer') {
      const rewrittenRef = rewriteUpstreamReferer(strVal, embedBase, baseTarget.origin);
      if (rewrittenRef) outHeaders.set('referer', rewrittenRef);
      continue;
    }
    outHeaders.set(lower, strVal);
  }
  outHeaders.set('accept-encoding', 'identity');
  outHeaders.set('x-forwarded-prefix', embedBase.slice(0, -1));

  let bodyBuffer;
  if (method !== 'GET' && method !== 'HEAD') {
    bodyBuffer = await readRawRequestBuffer(req, MAX_PROXY_BODY_BYTES);
    if (bodyBuffer.length === 0) {
      bodyBuffer = undefined;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const upstreamRes = await fetch(upstreamUrl.href, {
      method,
      headers: outHeaders,
      body: bodyBuffer,
      redirect: 'manual',
      signal: controller.signal,
    });

    const respHeaders = {};
    for (const [key, val] of upstreamRes.headers.entries()) {
      const lower = key.toLowerCase();
      if (STRIPPED_RESPONSE_HEADERS.has(lower)) continue;
      respHeaders[key] = val;
    }

    const location = upstreamRes.headers.get('location');
    if (location) {
      respHeaders.location = rewriteLocationHeader(location, embedBase, baseTarget.origin);
    }

    const setCookies = typeof upstreamRes.headers.getSetCookie === 'function'
      ? upstreamRes.headers.getSetCookie()
      : [];
    if (setCookies.length > 0) {
      const rewrittenCookies = setCookies.map(rewriteSetCookieLine).filter(Boolean);
      if (rewrittenCookies.length > 0) {
        respHeaders['set-cookie'] = rewrittenCookies;
      }
    }

    const contentType = String(upstreamRes.headers.get('content-type') || '');
    const isHtml = /\btext\/html\b/i.test(contentType);

    if (method === 'HEAD') {
      res.writeHead(upstreamRes.status, respHeaders);
      res.end();
      return;
    }

    let finalBody;
    if (isHtml) {
      const rawHtml = await upstreamRes.text();
      const rewrittenHtml = rewriteEmbeddedHtml(rawHtml, embedBase, baseTarget.origin);
      finalBody = Buffer.from(rewrittenHtml, 'utf8');
    } else {
      finalBody = Buffer.from(await upstreamRes.arrayBuffer());
    }

    respHeaders['content-length'] = String(finalBody.length);
    res.writeHead(upstreamRes.status, respHeaders);
    res.end(finalBody);
  } catch (err) {
    const timedOut = err?.name === 'AbortError';
    sendProxyJson(res, timedOut ? 504 : 502, {
      ok: false,
      error: timedOut
        ? `Upstream service "${serviceId}" timed out`
        : `Failed to reach upstream service "${serviceId}": ${err?.message || 'connection error'}`,
    });
  } finally {
    clearTimeout(timer);
  }
}
