import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { ActionController } from './actions.mjs';
import { AlertEngine } from './alerts.mjs';
import { SingleFlightCache } from './cache.mjs';
import { APP_VERSION, PACKAGE_ROOT, validateConfig } from './config.mjs';
import { createDemoProvider } from './connectors/demo.mjs';
import { ConnectorHub } from './connectors/index.mjs';
import { ControlPlaneEventBus } from './events.mjs';
import { StructuredLogger } from './logger.mjs';
import { LogService } from './logs.mjs';
import { isTailscaleOrLoopbackIp, ProbeRegistry, validateNodeId } from './probes.mjs';
import { PluginManager } from './plugins/manager.mjs';
import { maskClientIp } from './redact.mjs';
import { RunbookEngine } from './runbooks.mjs';
import { TelemetryStore } from './store.mjs';
import { TimeSeriesStore } from './timeseries.mjs';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  checkRequestAuth,
  getSecurityHeaders,
  renderLoginPage,
  resolveSafePath,
  safeEqualString,
  SlidingWindowRateLimiter,
  verifySameOrigin,
} from './security.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_PROBE_BODY_BYTES = 32 * 1024;
const COMPRESS_MIN_BYTES = 1024;
const COMPRESSIBLE_MIME = /^(?:text\/|application\/(?:json|javascript)|image\/svg\+xml)/i;

const MAX_STATIC_CACHE_ENTRIES = 64;
const HASHED_ASSET_RE = /\/assets\/.+-[A-Za-z0-9_-]{6,}\.(?:js|css|woff2|svg|png)$/i;

function chooseEncoding(req) {
  const ae = String(req?.headers?.['accept-encoding'] || '').toLowerCase();
  if (!ae) return '';
  if (/\bbr\b/.test(ae)) return 'br';
  if (/\bgzip\b/.test(ae)) return 'gzip';
  return '';
}

function compressBufferAsync(buf, encoding) {
  return new Promise((resolve, reject) => {
    if (encoding === 'br') {
      zlib.brotliCompress(
        buf,
        { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } },
        (err, out) => (err ? reject(err) : resolve(out)),
      );
      return;
    }
    if (encoding === 'gzip') {
      zlib.gzip(buf, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)));
      return;
    }
    resolve(buf);
  });
}

function extractClientIp(req, trustProxy = false) {
  if (trustProxy) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return String(req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

function isHttpsRequest(req, trustProxy = false) {
  if (req.socket?.encrypted) return true;
  if (trustProxy && String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https') {
    return true;
  }
  return false;
}

function sendJsonWithHeaders(res, statusCode, payload, extraHeaders = {}, req = null, securityHeaders = {}) {
  const rawBuf = Buffer.from(JSON.stringify(payload), 'utf8');
  const encoding = rawBuf.length >= COMPRESS_MIN_BYTES ? chooseEncoding(req) : '';
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...securityHeaders,
    ...extraHeaders,
  };

  const writeResponse = (outBuf, appliedEncoding) => {
    if (res.headersSent || res.writableEnded || res.destroyed) return;
    if (appliedEncoding) {
      headers['Content-Encoding'] = appliedEncoding;
      headers.Vary = headers.Vary ? `${headers.Vary}, Accept-Encoding` : 'Accept-Encoding';
    }
    headers['Content-Length'] = outBuf.length;
    res.writeHead(statusCode, headers);
    if (req?.method === 'HEAD') {
      res.end();
    } else {
      res.end(outBuf);
    }
  };

  if (!encoding) {
    writeResponse(rawBuf, '');
    return;
  }

  compressBufferAsync(rawBuf, encoding)
    .then((compressed) => writeResponse(compressed, encoding))
    .catch(() => writeResponse(rawBuf, ''));
}

function sendHtmlWithHeaders(res, statusCode, html, extraHeaders = {}, securityHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...securityHeaders,
    ...extraHeaders,
  });
  res.end(html);
}

async function readBody(req, maxBytes = MAX_BODY_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const err = new Error('Request payload too large');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!raw.trim()) return { data: {}, isForm: contentType.includes('application/x-www-form-urlencoded') };

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw);
    const data = {};
    for (const [k, v] of params.entries()) data[k] = v;
    return { data, isForm: true };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const err = new Error('Request body must be a JSON object');
      err.statusCode = 400;
      throw err;
    }
    return { data: parsed, isForm: false };
  } catch (err) {
    if (err.statusCode) throw err;
    const parseErr = new Error('Invalid JSON body');
    parseErr.statusCode = 400;
    throw parseErr;
  }
}

function normalizeLogQuery(searchParams) {
  const rawSource = searchParams.get('source') || 'journald';
  const source = rawSource === 'service' ? 'journald' : rawSource;
  const target = searchParams.get('target') || '';
  const unit = searchParams.get('unit') || (source === 'journald' ? target : '');
  const file = searchParams.get('file') || (source === 'file' ? target : '');
  const since = searchParams.get('since') || '1h';
  const level = searchParams.get('level') || searchParams.get('severity') || 'all';
  const lines = Number(searchParams.get('lines') || searchParams.get('limit') || 150);
  let q = searchParams.get('q') || '';
  const regexFlag = searchParams.get('regex');
  if ((regexFlag === '1' || regexFlag === 'true') && q && !(q.startsWith('/') && q.endsWith('/'))) {
    q = `/${q}/`;
  }
  const includeLines = searchParams.get('includeLines') === '1' || searchParams.get('includeLines') === 'true';
  return { source, unit, file, since, level, lines, q, includeLines };
}

function sanitizeDownloadName(str) {
  return String(str || 'all').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 48) || 'all';
}

export function createOpsConsole(options = {}) {
  const { config } = options;
  if (!config) {
    throw new Error('createOpsConsole requires a loaded config');
  }

  const publicDir = options.publicDir || path.join(PACKAGE_ROOT, 'public');
  const demoProvider = options.demoProvider ?? (config.demo ? createDemoProvider() : null);
  const logger = options.logger || new StructuredLogger({
    dataDir: config.console.dataDir,
    level: config.logging?.level || 'info',
    maxBytes: config.logging?.maxBytes,
    maxFiles: config.logging?.maxFiles,
    silentStdout: Boolean(options.silentStdout),
  });
  const cache = options.cache || new SingleFlightCache();
  const store = options.store || new TelemetryStore({
    dataDir: config.console.dataDir,
    driver: config.storage?.driver || 'auto',
    demo: config.demo,
    rawRetentionDays: config.storage?.rawRetentionDays,
    rollup1mDays: config.storage?.rollup1mDays,
    rollup5mDays: config.storage?.rollup5mDays,
    incidentRetentionDays: config.storage?.incidentRetentionDays,
    logger,
  });
  const timeseries = options.timeseries || new TimeSeriesStore({
    maxPoints: config.fleet?.historyPoints || 60,
    minIntervalMs: 3000,
    store,
  });
  const probeRegistry = options.probeRegistry || new ProbeRegistry({ config, logger, timeseries });
  const eventBus = options.eventBus || new ControlPlaneEventBus({ maxStreams: config.security?.maxSseStreams || 8 });
  const pluginManager = options.pluginManager || new PluginManager({ config, logger });
  const hub = options.hub || new ConnectorHub({ config, cache, demoProvider, probeRegistry, store, pluginManager });
  const logs = options.logs || new LogService({ config, logger, demoProvider });
  const actions = options.actions || new ActionController({ config, logger, cache, demoProvider });
  const alertEngine = options.alertEngine || new AlertEngine({ eventBus, logger, demo: config.demo });
  const runbookEngine = options.runbookEngine || new RunbookEngine({
    config,
    connectors: hub,
    actions,
    logs,
    logger,
    eventBus,
  });

  const generalLimiter = new SlidingWindowRateLimiter({
    windowMs: 60_000,
    maxRequests: config.security.rateLimitPerMinute || 240,
  });
  const mutatingLimiter = new SlidingWindowRateLimiter({
    windowMs: 60_000,
    maxRequests: config.security.mutatingRateLimitPerMinute || 30,
  });
  const probeLimiter = new SlidingWindowRateLimiter({
    windowMs: 60_000,
    maxRequests: 30,
  });
  const staticCache = new Map();
  const staticInflight = new Map();
  const allowIframe = Boolean(config.security?.allowIframe);
  const secHeaders = (isHtml = false) => getSecurityHeaders({ isHtml, allowIframe });
  const sendJson = (res, statusCode, payload, extraHeaders = {}, req = null) =>
    sendJsonWithHeaders(res, statusCode, payload, extraHeaders, req, secHeaders(false));
  const sendHtml = (res, statusCode, html, extraHeaders = {}) =>
    sendHtmlWithHeaders(res, statusCode, html, extraHeaders, secHeaders(true));

  function auditIp(rawIp) {
    return config.security?.exposeClientIps ? rawIp : maskClientIp(rawIp);
  }

  async function serveStatic(req, res, pathname) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      sendJson(res, 400, { ok: false, error: 'Malformed path' });
      return;
    }

    const relPath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
    const resolved = await resolveSafePath(publicDir, relPath);
    if (!resolved) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...secHeaders(false),
      });
      res.end('Not Found');
      return;
    }

    let stat;
    try {
      stat = await fs.stat(resolved);
      if (!stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...secHeaders(false) });
        res.end('Not Found');
        return;
      }
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...secHeaders(false) });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';
    let cached = staticCache.get(resolved);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      // Touch LRU position
      staticCache.delete(resolved);
      staticCache.set(resolved, cached);
    } else {
      let loader = staticInflight.get(resolved);
      if (!loader) {
        loader = (async () => {
          const content = await fs.readFile(resolved);
          const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
          const compressible = COMPRESSIBLE_MIME.test(contentType) && content.length >= COMPRESS_MIN_BYTES;
          const [gzip, br] = compressible
            ? await Promise.all([compressBufferAsync(content, 'gzip'), compressBufferAsync(content, 'br')])
            : [null, null];
          const entry = {
            mtimeMs: stat.mtimeMs,
            size: stat.size,
            etag,
            content,
            gzip,
            br,
            contentType,
            isHtml,
          };
          if (staticCache.has(resolved)) {
            staticCache.delete(resolved);
          } else if (staticCache.size >= MAX_STATIC_CACHE_ENTRIES) {
            const oldestKey = staticCache.keys().next().value;
            if (oldestKey !== undefined) staticCache.delete(oldestKey);
          }
          staticCache.set(resolved, entry);
          return entry;
        })().finally(() => {
          staticInflight.delete(resolved);
        });
        staticInflight.set(resolved, loader);
      }
      cached = await loader;
    }

    const isServiceWorker = path.basename(resolved) === 'sw.js';
    const isHashedAsset = HASHED_ASSET_RE.test(decodedPath);
    const cacheControl = isHtml || isServiceWorker
      ? 'no-cache, no-store, must-revalidate'
      : isHashedAsset
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=60';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      ETag: cached.etag,
      Vary: 'Accept-Encoding',
      ...secHeaders(isHtml),
    };
    if (String(req.headers['if-none-match'] || '').trim() === cached.etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }

    const encoding = chooseEncoding(req);
    let body = cached.content;
    if (encoding === 'br' && cached.br) {
      body = cached.br;
      headers['Content-Encoding'] = 'br';
    } else if (encoding === 'gzip' && cached.gzip) {
      body = cached.gzip;
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(body);
    }
  }

  async function handleRequest(req, res) {
    const started = Date.now();
    const requestId = crypto.randomUUID().slice(0, 8);
    const clientIp = extractClientIp(req, config.security.trustProxy);
    const isHttps = isHttpsRequest(req, config.security.trustProxy);

    let url;
    try {
      url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    } catch {
      sendJson(res, 400, { ok: false, error: 'Malformed request URL' });
      return;
    }
    const pathname = url.pathname;
    const method = String(req.method || 'GET').toUpperCase();

    try {
      if (method === 'GET' && pathname === '/api/ping') {
        sendJson(res, 200, {
          ok: true,
          service: 'ops-console',
          version: APP_VERSION,
          demo: config.demo,
          uptimeSec: Math.floor(process.uptime()),
          ts: new Date().toISOString(),
        }, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/probes/ingest') {
        if (config.fleet?.requireTailscaleCidr && !isTailscaleOrLoopbackIp(clientIp)) {
          logger.warn('probe_cidr_rejected', { requestId, ip: clientIp });
          sendJson(res, 403, { ok: false, error: 'Probe ingestion restricted to Tailscale or loopback addresses' });
          return;
        }
        const authHeader = String(req.headers.authorization || '');
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const headerNodeId = String(req.headers['x-ops-probe-id'] || '').trim().toLowerCase();
        const pRate = probeLimiter.allow(headerNodeId || clientIp);
        if (!pRate.allowed) {
          sendJson(res, 429, { ok: false, error: 'Probe telemetry rate limit exceeded' }, { 'Retry-After': String(pRate.retryAfterSec) });
          return;
        }
        if (!bearerToken || !headerNodeId) {
          sendJson(res, 401, { ok: false, error: 'Missing Authorization Bearer token or X-Ops-Probe-Id header' });
          return;
        }
        const record = probeRegistry.authenticateProbe(headerNodeId, bearerToken);
        if (!record) {
          logger.warn('probe_auth_failed', { requestId, nodeId: headerNodeId, ip: clientIp });
          sendJson(res, 401, { ok: false, error: 'Invalid or revoked probe token' });
          return;
        }
        const { data } = await readBody(req, MAX_PROBE_BODY_BYTES);
        try {
          const ingestResult = await probeRegistry.ingest({
            nodeId: record.id,
            payload: data,
            sourceIp: clientIp,
            via: 'probe-token',
          });
          const pendingCommands = probeRegistry.drainPendingCommands(record.id);
          eventBus.emit('probe_heartbeat', { nodeId: record.id, pendingCommands: pendingCommands.length });
          sendJson(res, 200, { ...ingestResult, pendingCommands });
        } catch (ingestErr) {
          sendJson(res, 400, { ok: false, error: ingestErr.message });
        }
        return;
      }

      const rate = generalLimiter.allow(clientIp);
      if (!rate.allowed) {
        sendJson(res, 429, { ok: false, error: 'Rate limit exceeded' }, { 'Retry-After': String(rate.retryAfterSec) });
        return;
      }

      if (MUTATING_METHODS.has(method)) {
        if (!verifySameOrigin(req, config.security.allowedOrigins, { trustProxy: Boolean(config.security.trustProxy) })) {
          logger.warn('csrf_rejected', { requestId, ip: clientIp, method, path: pathname });
          sendJson(res, 403, { ok: false, error: 'Cross-origin request rejected' });
          return;
        }
        const mutateRate = mutatingLimiter.allow(clientIp);
        if (!mutateRate.allowed) {
          sendJson(res, 429, { ok: false, error: 'Too many control actions' }, { 'Retry-After': String(mutateRate.retryAfterSec) });
          return;
        }
      }

      if (method === 'POST' && pathname === '/api/auth/login') {
        const { data, isForm } = await readBody(req);
        const candidate = String(data.key ?? data.webKey ?? '');
        if (!config.auth.webKey) {
          if (isForm) {
            res.writeHead(303, { Location: '/', ...secHeaders(false) });
            res.end();
          } else {
            sendJson(res, 200, { ok: true, authEnabled: false });
          }
          return;
        }
        if (!safeEqualString(candidate, config.auth.webKey)) {
          logger.warn('auth_login_failed', { requestId, ip: clientIp });
          if (isForm) {
            sendHtml(res, 401, renderLoginPage(config.console.title, 'Invalid web key. Please try again.'));
          } else {
            sendJson(res, 401, { ok: false, error: 'Invalid web key' });
          }
          return;
        }
        const authCheck = checkRequestAuth(
          { headers: {} },
          new URL(`http://localhost/?k=${encodeURIComponent(config.auth.webKey)}`),
          config.auth.webKey,
        );
        const cookieHeader = buildSessionCookie(authCheck.setCookieToken, isHttps);
        logger.info('auth_login_ok', { requestId, ip: clientIp });
        if (isForm) {
          res.writeHead(303, {
            Location: '/',
            'Set-Cookie': cookieHeader,
            ...secHeaders(false),
          });
          res.end();
        } else {
          sendJson(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader });
        }
        return;
      }

      if (method === 'POST' && pathname === '/api/auth/logout') {
        sendJson(res, 200, { ok: true }, { 'Set-Cookie': buildClearSessionCookie() });
        return;
      }

      if (pathname !== '/favicon.svg') {
        const auth = checkRequestAuth(req, url, config.auth.webKey);
        if (auth.authorized && auth.method === 'query-bootstrap' && auth.setCookieToken) {
          url.searchParams.delete('k');
          const cleanTarget = `${url.pathname}${url.search}` || '/';
          res.writeHead(302, {
            Location: cleanTarget,
            'Set-Cookie': buildSessionCookie(auth.setCookieToken, isHttps),
            ...secHeaders(false),
          });
          res.end();
          return;
        }
        if (!auth.authorized) {
          if (pathname.startsWith('/api/')) {
            sendJson(res, 401, { ok: false, error: 'Authentication required' });
          } else {
            sendHtml(res, 401, renderLoginPage(config.console.title));
          }
          return;
        }
      }

      if (method === 'GET' && pathname === '/api/ready') {
        sendJson(res, 200, {
          ok: true,
          ready: true,
          version: APP_VERSION,
          demo: config.demo,
          readOnly: config.console.readOnly,
          authEnabled: Boolean(config.auth.webKey),
        });
        return;
      }

      if (method === 'GET' && pathname === '/api/meta') {
        sendJson(res, 200, {
          ok: true,
          title: config.console.title,
          subtitle: config.console.subtitle,
          version: APP_VERSION,
          demo: config.demo,
          readOnly: config.console.readOnly,
          authEnabled: Boolean(config.auth.webKey),
          storageDriver: store.driver,
          requireCriticalConfirm: Boolean(config.security?.requireCriticalConfirm),
          warnings: config.warnings || [],
          requireTailscaleCidr: config.fleet?.requireTailscaleCidr !== false,
          localNodeId: config.fleet?.localNode?.id || 'hub-primary',
          enrolledProbesCount: probeRegistry.records.size,
          pluginsCount: pluginManager.plugins.size,
          hosts: config.console.hosts,
          port: config.console.port,
          layers: config.layers,
          logSources: logs.listSources(),
          opsConfigured: {
            health: Boolean(config.ops.healthScript || config.demo),
            backup: Boolean(config.ops.backupScript || config.demo),
          },
        }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/plugins') {
        const force = url.searchParams.get('refresh') === '1';
        const snapshot = await hub.collectSnapshot(force);
        sendJson(res, 200, pluginManager.listPlugins(snapshot), {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/plugins/custom') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Plugin creation is disabled in read-only mode' });
          return;
        }
        const { data } = await readBody(req);
        const created = await pluginManager.addCustomPlugin(data);
        if (created.ok) {
          cache.invalidate?.('snapshot');
          cache.invalidate?.('extra-plugins');
          await logger.appendAudit({
            category: 'plugin',
            action: 'plugin_custom_add',
            target: created.id,
            actor: 'web',
            ip: auditIp(clientIp),
            requestId,
            ok: true,
            output: `kind=${data.kind || 'custom'} url=${data.apiUrl || ''}`,
          });
          eventBus.emit('plugins_updated', { action: 'add', id: created.id });
        }
        sendJson(res, created.statusCode || (created.ok ? 201 : 400), created);
        return;
      }

      if (method === 'DELETE' && pathname.startsWith('/api/plugins/custom/')) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Plugin deletion is disabled in read-only mode' });
          return;
        }
        const pluginId = decodeURIComponent(pathname.slice('/api/plugins/custom/'.length)).trim();
        const removed = await pluginManager.removeCustomPlugin(pluginId);
        if (removed.ok) {
          cache.invalidate?.('snapshot');
          cache.invalidate?.('extra-plugins');
          await logger.appendAudit({
            category: 'plugin',
            action: 'plugin_custom_remove',
            target: pluginId,
            actor: 'web',
            ip: auditIp(clientIp),
            requestId,
            ok: true,
            output: 'removed',
          });
          eventBus.emit('plugins_updated', { action: 'remove', id: pluginId });
        }
        sendJson(res, removed.statusCode || (removed.ok ? 200 : 400), removed);
        return;
      }

      if (method === 'POST' && /^\/api\/plugins\/[a-z0-9-]+\/(toggle|config|test)$/.test(pathname)) {
        const [, , , pluginId, pluginAction] = pathname.split('/');
        if ((pluginAction === 'toggle' || pluginAction === 'config') && config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Plugin changes are disabled in read-only mode' });
          return;
        }
        const { data } = await readBody(req);
        if (pluginAction === 'toggle') {
          const toggled = await pluginManager.togglePlugin(pluginId, data.enabled);
          if (toggled.ok) {
            cache.invalidate?.('snapshot');
            cache.invalidate?.('extra-plugins');
            cache.invalidate?.('memory');
            cache.invalidate?.('network');
            cache.invalidate?.('magpie');
            await logger.appendAudit({
              category: 'plugin',
              action: toggled.enabled ? 'plugin_enable' : 'plugin_disable',
              target: pluginId,
              actor: 'web',
              ip: auditIp(clientIp),
              requestId,
              ok: true,
              output: `enabled=${toggled.enabled}`,
            });
            eventBus.emit('plugins_updated', { action: 'toggle', id: pluginId, enabled: toggled.enabled });
          }
          sendJson(res, toggled.statusCode || (toggled.ok ? 200 : 400), toggled);
          return;
        }
        if (pluginAction === 'config') {
          const updated = await pluginManager.updatePluginConfig(pluginId, data.config || data);
          if (updated.ok) {
            cache.invalidate?.('snapshot');
            cache.invalidate?.('extra-plugins');
            cache.invalidate?.('memory');
            cache.invalidate?.('network');
            cache.invalidate?.('magpie');
            await logger.appendAudit({
              category: 'plugin',
              action: 'plugin_config',
              target: pluginId,
              actor: 'web',
              ip: auditIp(clientIp),
              requestId,
              ok: true,
              output: `keys=${Object.keys(data.config || data).join(',')}`,
            });
            eventBus.emit('plugins_updated', { action: 'config', id: pluginId });
          }
          sendJson(res, updated.statusCode || (updated.ok ? 200 : 400), updated);
          return;
        }
        if (pluginAction === 'test') {
          const tested = await pluginManager.testPlugin(pluginId, data.config || null);
          sendJson(res, tested.statusCode || 200, tested);
          return;
        }
      }

      if (method === 'GET' && (pathname === '/api/nodes' || pathname === '/api/fleet')) {
        const force = url.searchParams.get('refresh') === '1';
        const snapshot = await hub.collectSnapshot(force);
        sendJson(res, 200, { ok: true, fleet: snapshot.fleet || null }, {}, req);
        return;
      }

      if (method === 'GET' && pathname.startsWith('/api/nodes/')) {
        const nodeId = decodeURIComponent(pathname.slice('/api/nodes/'.length)).trim().toLowerCase();
        if (!validateNodeId(nodeId)) {
          sendJson(res, 400, { ok: false, error: 'Invalid node ID' });
          return;
        }
        const snapshot = await hub.collectSnapshot(false);
        const node = (snapshot.fleet?.nodes || []).find((item) => item.id === nodeId);
        if (!node) {
          sendJson(res, 404, { ok: false, error: `Node not found: ${nodeId}` });
          return;
        }
        const fullHistory = timeseries.get(`node:${nodeId}`, config.fleet?.historyPoints || 60);
        sendJson(res, 200, { ok: true, node, history: fullHistory.length ? fullHistory : (node.history || []) }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/probes') {
        sendJson(res, 200, {
          ok: true,
          probes: probeRegistry.listEnrolled(),
          requireTailscaleCidr: config.fleet?.requireTailscaleCidr !== false,
        }, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/probes/enroll') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Probe enrollment disabled in read-only mode' });
          return;
        }
        const { data } = await readBody(req);
        try {
          const enrolled = await probeRegistry.enroll({
            id: data.id,
            name: data.name,
            deviceType: data.deviceType,
            probeMode: data.probeMode,
            role: data.role,
            region: data.region,
            provider: data.provider,
            lat: data.lat,
            lon: data.lon,
            tailscaleIp: data.tailscaleIp,
          });
          await logger.appendAudit({
            category: 'probe',
            action: 'probe_enroll',
            target: enrolled.node.id,
            actor: 'web',
            ip: auditIp(clientIp),
            requestId,
            ok: true,
            output: `deviceType=${enrolled.node.deviceType} scopes=${enrolled.node.scopes.join(',')}`,
          });
          sendJson(res, 200, { ok: true, ...enrolled });
        } catch (enrollErr) {
          sendJson(res, 400, { ok: false, error: enrollErr.message });
        }
        return;
      }

      if (method === 'POST' && pathname === '/api/probes/checkin') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Mobile check-in disabled in read-only mode' });
          return;
        }
        const { data } = await readBody(req, MAX_PROBE_BODY_BYTES);
        const targetId = String(data.nodeId || '').trim().toLowerCase();
        if (!validateNodeId(targetId)) {
          sendJson(res, 400, { ok: false, error: 'Invalid mobile check-in nodeId' });
          return;
        }
        try {
          const result = await probeRegistry.ingest({
            nodeId: targetId,
            payload: {
              schemaVersion: 1,
              probeVersion: APP_VERSION,
              nodeId: targetId,
              deviceType: data.deviceType || 'mobile',
              platform: data.platform || 'mobile-web',
              region: data.region || '',
              battery: data.battery || null,
              network: data.network || null,
              note: data.note || 'Web UI check-in',
              hubRttMs: data.hubRttMs ?? null,
            },
            sourceIp: clientIp,
            via: 'web-checkin',
          });
          await logger.appendAudit({
            category: 'probe',
            action: 'mobile_checkin',
            target: targetId,
            actor: 'web',
            ip: auditIp(clientIp),
            requestId,
            ok: true,
            output: `region=${data.region || 'default'}`,
          });
          sendJson(res, 200, result);
        } catch (errCheckin) {
          sendJson(res, 400, { ok: false, error: errCheckin.message });
        }
        return;
      }

      if (method === 'DELETE' && pathname.startsWith('/api/probes/')) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Probe revocation disabled in read-only mode' });
          return;
        }
        const targetId = decodeURIComponent(pathname.slice('/api/probes/'.length)).trim().toLowerCase();
        const revoked = await probeRegistry.revoke(targetId);
        await logger.appendAudit({
          category: 'probe',
          action: 'probe_revoke',
          target: targetId,
          actor: 'web',
          ip: auditIp(clientIp),
          requestId,
          ok: revoked.ok,
          output: revoked.ok ? 'revoked' : revoked.error,
        });
        sendJson(res, revoked.ok ? 200 : 404, revoked);
        return;
      }

      if (method === 'GET' && pathname === '/api/events/stream') {
        eventBus.attachSse(req, res, secHeaders(false));
        return;
      }

      if (method === 'GET' && pathname === '/api/metrics/series') {
        const series = String(url.searchParams.get('series') || 'fleet').trim();
        const range = String(url.searchParams.get('range') || '24h').trim();
        const stored = store.querySeries({ series, range });
        const result = stored.points.length >= 12 || !config.demo || !demoProvider
          ? stored
          : demoProvider.getHistoricalSeries(series, range);
        sendJson(res, 200, { ok: true, ...result }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/metrics') {
        const snapshot = await hub.collectSnapshot(false);
        const host = snapshot.host || {};
        const svcs = snapshot.services?.items || [];
        const healthyCount = svcs.filter((s) => s.status === 'healthy').length;
        const lines = [
          '# HELP ops_console_host_memory_used_percent Host memory utilization percentage',
          '# TYPE ops_console_host_memory_used_percent gauge',
          `ops_console_host_memory_used_percent ${Number(host.memory?.usedPercent ?? 0).toFixed(2)}`,
          '# HELP ops_console_host_load1 Host 1-minute load average',
          '# TYPE ops_console_host_load1 gauge',
          `ops_console_host_load1 ${Number(host.load1 ?? 0).toFixed(2)}`,
          '# HELP ops_console_services_healthy Number of healthy managed services',
          '# TYPE ops_console_services_healthy gauge',
          `ops_console_services_healthy ${healthyCount}`,
          '# HELP ops_console_services_total Total configured managed services',
          '# TYPE ops_console_services_total gauge',
          `ops_console_services_total ${svcs.length}`,
          '# HELP ops_console_fleet_nodes_online Number of online fleet nodes',
          '# TYPE ops_console_fleet_nodes_online gauge',
          `ops_console_fleet_nodes_online ${Number(snapshot.fleet?.summary?.online ?? 0)}`,
          '# HELP ops_console_alerts_active Active unacknowledged alerts',
          '# TYPE ops_console_alerts_active gauge',
          `ops_console_alerts_active ${alertEngine.alerts.filter((a) => a.status === 'active').length}`,
        ];
        res.writeHead(200, {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Cache-Control': 'no-store',
          ...secHeaders(false),
        });
        res.end(`${lines.join('\n')}\n`);
        return;
      }

      if (method === 'GET' && pathname === '/api/alerts') {
        const snapshot = await hub.collectSnapshot(false);
        const incidents = config.demo && demoProvider
          ? demoProvider.getIncidents()
          : store.listIncidents({ limit: 100 });
        alertEngine.evaluateSnapshot(snapshot);
        sendJson(res, 200, alertEngine.getState({ snapshot, incidents }), {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/alerts/rules') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: '只读模式已禁用新增告警规则' });
          return;
        }
        const { data } = await readBody(req);
        const rule = alertEngine.createRule(data);
        await logger.appendAudit({
          category: 'alerts',
          target: rule.id,
          action: 'create-rule',
          ok: true,
          actor: 'web',
          ip: auditIp(clientIp),
          requestId,
          output: `${rule.name} (${rule.metric} ${rule.operator} ${rule.threshold})`,
        });
        sendJson(res, 201, { ok: true, rule }, {}, req);
        return;
      }

      if (method === 'PATCH' && pathname.startsWith('/api/alerts/rules/')) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: '只读模式已禁用修改告警规则' });
          return;
        }
        const ruleId = decodeURIComponent(pathname.slice('/api/alerts/rules/'.length)).trim();
        const { data } = await readBody(req);
        const rule = alertEngine.updateRule(ruleId, data);
        sendJson(res, 200, { ok: true, rule }, {}, req);
        return;
      }

      if (method === 'DELETE' && pathname.startsWith('/api/alerts/rules/')) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: '只读模式已禁用删除告警规则' });
          return;
        }
        const ruleId = decodeURIComponent(pathname.slice('/api/alerts/rules/'.length)).trim();
        const removed = alertEngine.deleteRule(ruleId);
        sendJson(res, 200, { ok: true, removed }, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/alerts/silence') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: '只读模式已禁用告警静默' });
          return;
        }
        const { data } = await readBody(req);
        const result = alertEngine.setSilence(data.minutes);
        sendJson(res, 200, { ok: true, ...result }, {}, req);
        return;
      }

      if (method === 'POST' && /^\/api\/alerts\/[^/]+\/ack$/.test(pathname)) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: '只读模式已禁用告警认领' });
          return;
        }
        const alertId = decodeURIComponent(pathname.split('/')[3] || '').trim();
        const acked = alertEngine.ackAlert(alertId, 'web');
        sendJson(res, 200, { ok: true, alert: acked }, {}, req);
        return;
      }

      if (method === 'POST' && /^\/api\/incidents\/[^/]+\/note$/.test(pathname)) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: '只读模式已禁用事件复盘备注' });
          return;
        }
        const incId = decodeURIComponent(pathname.split('/')[3] || '').trim();
        const { data } = await readBody(req);
        const updated = config.demo && demoProvider
          ? demoProvider.updateIncidentNote(incId, data.note)
          : store.updateIncidentNote(incId, data.note);
        if (!updated) {
          sendJson(res, 404, { ok: false, error: `未找到事件 ID: ${incId}` });
          return;
        }
        eventBus.emit('incident_updated', updated);
        sendJson(res, 200, { ok: true, ...updated }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/gateway/telemetry') {
        if (config.demo && demoProvider) {
          sendJson(res, 200, demoProvider.getGatewayTelemetry(), {}, req);
          return;
        }
        const snap = await hub.collectSnapshot(false);
        const providers = (snap.magpie?.providers || []).map((p) => ({
          name: p.name,
          requests: p.count || 0,
          tokensK: 0,
          avgTtftMs: snap.magpie?.latencyMs ?? 0,
          errorRatePct: 0,
          costUsd: 0,
          circuitState: 'closed',
        }));
        sendJson(res, 200, {
          ok: true,
          window: '24h',
          summary: {
            totalRequests: providers.reduce((a, b) => a + b.requests, 0),
            totalTokens: 0,
            avgTtftMs: snap.magpie?.latencyMs ?? 0,
            p95LatencyMs: snap.magpie?.latencyMs ?? 0,
            cacheHitPct: 0,
            estimatedCostUsd24h: 0,
            dailyBudgetUsd: 10,
            errorRatePct: 0,
          },
          providers,
          sessions: [],
          accelerators: [],
          hourly: [],
        }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/memory/compare') {
        const q = String(url.searchParams.get('q') || '').trim();
        if (config.demo && demoProvider) {
          sendJson(res, 200, demoProvider.compareMemory(q), {}, req);
          return;
        }
        const resAll = await hub.searchMemory('all', q, 8);
        const items = (resAll.items || []).map((item, idx) => ({
          id: item.id || `cmp-${idx}`,
          title: item.title || item.uri || 'Untitled',
          snippet: item.snippet || '',
          nmemScore: item.provider === 'nmem' ? Number(item.score ?? 0.8) : 0,
          ovScore: item.provider === 'openviking' ? Number(item.score ?? 0.8) : 0,
          rerankScore: Number(item.score ?? 0.8),
          delta: 0,
          source: item.provider || 'memory',
        }));
        sendJson(res, 200, {
          ok: true,
          query: q,
          timingsMs: { nmem: 0, openviking: 0, rerank: 0, total: 0 },
          items,
        }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/runbooks') {
        sendJson(res, 200, runbookEngine.list(), {}, req);
        return;
      }

      if (method === 'POST' && /^\/api\/runbooks\/[^/]+\/run$/.test(pathname)) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: '只读模式下已禁用 Runbook 执行' });
          return;
        }
        const runbookId = decodeURIComponent(pathname.split('/')[3] || '').trim();
        const result = await runbookEngine.execute(runbookId, {
          actor: 'web',
          ip: clientIp,
          requestId,
        });
        sendJson(res, result.ok ? 200 : 500, result, {}, req);
        return;
      }

      if (method === 'GET' && /^\/api\/probes\/[^/]+\/commands$/.test(pathname)) {
        const nodeId = decodeURIComponent(pathname.split('/')[3] || '').trim();
        sendJson(res, 200, { ok: true, nodeId, items: probeRegistry.listCommands(nodeId) }, {}, req);
        return;
      }

      if (method === 'POST' && /^\/api\/probes\/[^/]+\/commands$/.test(pathname)) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: '只读模式已禁用探针指令队列' });
          return;
        }
        const nodeId = decodeURIComponent(pathname.split('/')[3] || '').trim();
        const { data } = await readBody(req);
        const queued = probeRegistry.enqueueCommand(nodeId, data.command, 'web');
        await logger.appendAudit({
          category: 'probe',
          target: nodeId,
          action: `queue:${queued.command}`,
          ok: true,
          actor: 'web',
          ip: auditIp(clientIp),
          requestId,
          output: `Queued pull command ${queued.id} (expires ${queued.expiresAt})`,
        });
        eventBus.emit('probe_command', { nodeId, command: queued.command, id: queued.id });
        sendJson(res, 201, { ok: true, command: queued }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/config/studio') {
        const redactedConfig = {
          console: {
            name: config.console.name,
            hosts: config.console.hosts,
            port: config.console.port,
            readOnly: config.console.readOnly,
            demo: config.demo,
          },
          security: {
            requireCriticalConfirm: Boolean(config.security?.requireCriticalConfirm),
            exposeClientIps: Boolean(config.security?.exposeClientIps),
            rateLimitPerMinute: config.security?.rateLimitPerMinute || 240,
            mutatingRateLimitPerMinute: config.security?.mutatingRateLimitPerMinute || 30,
            maxSseStreams: config.security?.maxSseStreams || 8,
            authMode: config.auth?.webKey ? 'web-key + session-cookie' : 'tailnet-loopback',
          },
          storage: {
            driver: store.driver,
            rawRetentionDays: config.storage?.rawRetentionDays || 7,
            rollup1mDays: config.storage?.rollup1mDays || 30,
            rollup5mDays: config.storage?.rollup5mDays || 365,
          },
          services: (config.services || []).map((s) => ({
            id: s.id,
            unit: s.unit,
            scope: s.scope,
            layer: s.layer,
            risk: s.risk || 'standard',
            allowedActions: s.allowedActions || ['start', 'stop', 'restart', 'reload'],
          })),
          rbacPosture: {
            currentActor: config.console.readOnly ? 'Viewer (Read-Only)' : 'Admin (Local / Web Key)',
            roles: [
              { role: 'Viewer', permissions: ['只读观测', '指标趋势', '日志检索'], active: config.console.readOnly },
              { role: 'Operator', permissions: ['非关键服务启停', '告警认领', 'Runbook 手动执行'], active: !config.console.readOnly },
              { role: 'Admin', permissions: ['关键服务双确认操作', '探针签发/吊销', '配置校验与导出'], active: !config.console.readOnly },
            ],
            ssoAdapters: ['Tailscale-User-Login Header', 'WebAuthn / Passkey (Schema Ready)', 'OIDC Proxy Header'],
          },
        };
        const serviceListForSudoers =
          (config.services && config.services.length > 0)
            ? config.services
            : (config.demo && demoProvider ? demoProvider.getSnapshot(config).services?.items || [] : []);
        const sudoersLines = serviceListForSudoers
          .filter((s) => s.scope === 'system')
          .map((s) => {
            const verbs = (s.allowedActions || ['restart']).join(',');
            return `ops-user ALL=(root) NOPASSWD: /usr/bin/systemctl ${verbs} ${s.unit}`;
          });
        sendJson(res, 200, {
          ok: true,
          config: redactedConfig,
          sudoersPreview: sudoersLines.length
            ? sudoersLines.join('\n')
            : '# 当前无系统级 systemd 服务需要 sudoers 授权',
          prometheusEndpoint: '/api/metrics',
        }, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/config/validate') {
        const { data } = await readBody(req);
        let parsed = data.config;
        if (typeof data.rawJson === 'string') {
          try {
            parsed = JSON.parse(data.rawJson);
          } catch (parseErr) {
            sendJson(res, 200, { ok: false, valid: false, errors: [`JSON 语法错误: ${parseErr.message}`] }, {}, req);
            return;
          }
        }
        const check = validateConfig(parsed || {});
        sendJson(res, 200, { ok: true, valid: check.valid, errors: check.errors || [] }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/snapshot') {
        const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('force') === '1';
        const snapshot = await hub.collectSnapshot(force);
        alertEngine.evaluateSnapshot(snapshot);
        sendJson(res, 200, {
          ...snapshot,
          runningJobs: actions.getRunningJobs(),
          activeAlertsCount: alertEngine.alerts.filter((a) => a.status === 'active').length,
          sseConnectedClients: eventBus.getActiveCount(),
        }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/firewall') {
        const force = url.searchParams.get('refresh') === '1';
        const firewall = await hub.collectFirewall(force);
        sendJson(res, 200, { ok: true, firewall }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/incidents') {
        const limit = Number(url.searchParams.get('limit') || 60);
        const openOnly = url.searchParams.get('openOnly') === '1' || url.searchParams.get('openOnly') === 'true';
        const items = config.demo && demoProvider
          ? demoProvider.getIncidents()
          : store.listIncidents({ limit, openOnly });
        sendJson(res, 200, {
          ok: true,
          storage: await store.getStats(),
          items: openOnly
            ? items.filter((item) => !item.resolvedAt).slice(0, Math.max(1, Math.min(200, limit)))
            : items.slice(0, Math.max(1, Math.min(200, limit))),
        }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/memory') {
        const force = url.searchParams.get('refresh') === '1';
        const memory = await hub.collectMemory(force);
        sendJson(res, 200, { ok: true, ...memory }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/memory/search') {
        const provider = url.searchParams.get('provider') || 'all';
        const q = url.searchParams.get('q') || '';
        const limit = Number(url.searchParams.get('limit') || 10);
        const result = await hub.searchMemory(provider, q, limit);
        sendJson(res, 200, result, {}, req);
        return;
      }

      if ((method === 'GET' || method === 'POST') && pathname === '/api/memory/doctor') {
        let provider = url.searchParams.get('provider') || 'all';
        if (method === 'POST') {
          const { data } = await readBody(req);
          if (data.provider) provider = String(data.provider);
        }
        const result = await hub.runMemoryDoctor(provider);
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/remotes') {
        const force = url.searchParams.get('refresh') === '1';
        const nodes = await hub.collectRemotes(force);
        sendJson(res, 200, { ok: true, nodes }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/logs/sources') {
        sendJson(res, 200, { ok: true, ...logs.listSources() }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/logs') {
        const queryParams = normalizeLogQuery(url.searchParams);
        const result = await logs.query(queryParams);
        sendJson(res, result.ok ? 200 : 400, result, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/logs/stream') {
        req.socket?.setTimeout?.(0);
        const queryParams = normalizeLogQuery(url.searchParams);
        logs.openStream(req, res, queryParams);
        return;
      }

      if (method === 'GET' && pathname === '/api/logs/export') {
        const queryParams = normalizeLogQuery(url.searchParams);
        queryParams.lines = Math.min(1000, Math.max(20, Number(queryParams.lines) || 400));
        const format = String(url.searchParams.get('format') || 'jsonl').toLowerCase();
        const result = await logs.query(queryParams);
        if (!result.ok) {
          sendJson(res, 400, result);
          return;
        }
        const isText = format === 'text' || format === 'log';
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const targetLabel = sanitizeDownloadName(queryParams.unit || queryParams.file || queryParams.source);
        res.writeHead(200, {
          'Content-Type': isText ? 'text/plain; charset=utf-8' : 'application/x-ndjson; charset=utf-8',
          'Content-Disposition': `attachment; filename="ops-console-${targetLabel}-${stamp}.${isText ? 'log' : 'jsonl'}"`,
          'Cache-Control': 'no-store',
          ...secHeaders(false),
        });
        const entries = result.entries || [];
        const CHUNK_SIZE = 100;
        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
          const slice = entries.slice(i, i + CHUNK_SIZE);
          const chunk = logs.formatExport({ entries: slice }, format).body;
          if (chunk) res.write(chunk);
        }
        res.end();
        return;
      }

      if (method === 'GET' && pathname === '/api/audit') {
        const limit = Number(url.searchParams.get('limit') || 80);
        const items = await logger.readAudit(limit);
        sendJson(res, 200, { ok: true, items }, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/actions/confirm-token') {
        const { data } = await readBody(req);
        const issued = actions.issueConfirmToken(String(data.unit || data.id || ''), String(data.action || ''));
        sendJson(res, 200, { ok: true, ...issued }, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/services/control') {
        const { data } = await readBody(req);
        const result = await actions.controlService(String(data.unit || data.id || ''), String(data.action || ''), {
          actor: 'web',
          ip: clientIp,
          requestId,
          confirmToken: String(data.confirmToken || ''),
        });
        if (result.ok) eventBus.emit('service_action', { unit: data.unit || data.id, action: data.action });
        sendJson(res, result.ok ? 200 : 500, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/timers/control') {
        const { data } = await readBody(req);
        const result = await actions.controlTimer(String(data.unit || data.id || ''), String(data.action || ''), {
          actor: 'web',
          ip: clientIp,
          requestId,
        });
        if (result.ok) eventBus.emit('timer_action', { unit: data.unit || data.id, action: data.action });
        sendJson(res, result.ok ? 200 : 500, result);
        return;
      }

      if (method === 'POST' && (pathname === '/api/ops/health' || pathname === '/api/ops/health-check')) {
        const result = await actions.runHealthCheck({
          actor: 'web',
          ip: clientIp,
          requestId,
        });
        eventBus.emit('ops_health', { ok: result.ok });
        sendJson(res, result.ok ? 200 : 500, result);
        return;
      }

      if (method === 'POST' && pathname === '/api/ops/backup') {
        const result = await actions.triggerBackup({
          actor: 'web',
          ip: clientIp,
          requestId,
        });
        eventBus.emit('ops_backup', { ok: result.ok });
        sendJson(res, result.statusCode || (result.ok ? 200 : 500), result);
        return;
      }

      if (pathname.startsWith('/api/')) {
        sendJson(res, 404, { ok: false, error: `Unknown API route: ${method} ${pathname}` });
        return;
      }

      await serveStatic(req, res, pathname);
    } catch (err) {
      const statusCode = Number(err.statusCode) || 500;
      logger.error('request_error', {
        requestId,
        method,
        path: pathname,
        statusCode,
        durationMs: Date.now() - started,
        error: err.message,
      });
      if (!res.headersSent) {
        sendJson(res, statusCode, {
          ok: false,
          error: err.message || 'Internal server error',
          ...(err.requiresConfirm ? { requiresConfirm: true } : {}),
        }, {}, req);
      } else if (!res.writableEnded) {
        res.end();
      }
    } finally {
      const durationMs = Date.now() - started;
      if (durationMs > 2500 && pathname !== '/api/logs/stream') {
        logger.warn('slow_request', { requestId, method, path: pathname, durationMs });
      }
    }
  }

  const servers = [];
  const addresses = [];
  let started = false;

  async function start() {
    if (started) return { addresses };
    const hosts = config.console.hosts;
    const port = config.console.port;
    try {
      await store.init();
      await pluginManager.loadExternalPlugins();
      await store.hydrateTimeSeries(timeseries, { limitPerSeries: config.fleet?.historyPoints || 60 });
      for (const host of hosts) {
        const srv = http.createServer(handleRequest);
        srv.requestTimeout = 30_000;
        srv.maxRequestsPerSocket = 200;
        srv.headersTimeout = 15_000;
        srv.keepAliveTimeout = 65_000;
        await new Promise((resolve, reject) => {
          srv.once('error', reject);
          srv.listen(port, host, () => {
            srv.off('error', reject);
            resolve();
          });
        });
        const addr = srv.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : port;
        servers.push(srv);
        addresses.push({ host, port: actualPort, url: `http://${host}:${actualPort}` });
      }
      started = true;
      hub.warmUp();
      logger.info('server_started', {
        version: APP_VERSION,
        demo: config.demo,
        readOnly: config.console.readOnly,
        authEnabled: Boolean(config.auth.webKey),
        storageDriver: store.driver,
        urls: addresses.map((a) => a.url),
      });
      return { addresses };
    } catch (err) {
      await stop();
      throw err;
    }
  }

  async function stop() {
    logs.closeAllStreams();
    eventBus.closeAll();
    await probeRegistry.flush();
    const closing = servers.splice(0, servers.length).map(
      (srv) =>
        new Promise((resolve) => {
          try {
            srv.closeAllConnections?.();
            srv.close(() => resolve());
          } catch {
            resolve();
          }
        }),
    );
    await Promise.all(closing);
    addresses.length = 0;
    started = false;
    await store.close();
    logger.info('server_stopped');
    await logger.flush();
  }

  return {
    config,
    logger,
    cache,
    store,
    timeseries,
    probeRegistry,
    pluginManager,
    eventBus,
    alertEngine,
    runbookEngine,
    hub,
    logs,
    actions,
    servers,
    addresses,
    start,
    stop,
  };
}
