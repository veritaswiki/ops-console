import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { ActionController } from './actions.mjs';
import { A2AOrchestrator } from './a2a-orchestrator.mjs';
import {
  buildHubAgentCard,
  buildNodeConnectProfiles,
  buildSignedA2AHeaders,
  getA2ASigningMetadata,
  getA2ASigningSecret,
  handleA2AJsonRpc,
  verifyA2ASignature,
} from './a2a-protocol.mjs';
import { buildAiOpsContext, evaluateAiPreflight } from './ai-ops-governance.mjs';
import { AlertEngine } from './alerts.mjs';
import { BotFleetManager } from './bot-fleet.mjs';
import { SingleFlightCache } from './cache.mjs';
import { APP_VERSION, PACKAGE_ROOT, validateConfig } from './config.mjs';
import { createDemoProvider } from './connectors/demo.mjs';
import {
  collectMagpieCatalog,
  getCachedMagpieAgentBindings,
} from './connectors/gateway-magpie.mjs';
import { ConnectorHub } from './connectors/index.mjs';
import { collectCloudflare } from './connectors/network-cloudflare.mjs';
import { runTailscaleNetcheck, runTailscalePing } from './connectors/network-tailscale.mjs';
import { ControlPlaneEventBus } from './events.mjs';
import { GithubHub } from './github-hub.mjs';
import { LinearCommanderManager } from './linear-commander.mjs';
import { StructuredLogger } from './logger.mjs';
import { LogService } from './logs.mjs';
import { McpFleetManager } from './mcp-fleet.mjs';
import { isTailscaleOrLoopbackIp, ProbeRegistry, validateNodeId } from './probes.mjs';
import { PluginManager } from './plugins/manager.mjs';
import { maskClientIp } from './redact.mjs';
import { RunbookEngine } from './runbooks.mjs';
import { handleServiceEmbedProxy } from './service-proxy.mjs';
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

function computeRequestOrigin(req, isHttps, trustProxy = false) {
  const proto = isHttps ? 'https' : 'http';
  const forwardedHost = trustProxy
    ? String(req.headers['x-forwarded-host'] || '').split(',')[0].trim()
    : '';
  const hostHeader = forwardedHost || String(req.headers.host || '127.0.0.1:4320').trim();
  return `${proto}://${hostHeader}`;
}

async function readRawText(req, maxBytes = MAX_BODY_BYTES) {
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
  return Buffer.concat(chunks).toString('utf8');
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
  const targetsRaw = searchParams.get('targets') || searchParams.get('services') || '';
  const targets = targetsRaw
    ? targetsRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : (source === 'unified' && target ? target.split(',').map((item) => item.trim()).filter(Boolean) : []);
  const unit = searchParams.get('unit') || (source === 'journald' ? target : '');
  const file = searchParams.get('file') || (source === 'file' ? target : '');
  const since = searchParams.get('since') || '1h';
  const level = searchParams.get('level') || searchParams.get('severity') || 'all';
  const lines = Number(searchParams.get('lines') || searchParams.get('limit') || 150);
  const maxBytesPerFile = searchParams.get('maxBytesPerFile') ? Number(searchParams.get('maxBytesPerFile')) : undefined;
  let q = searchParams.get('q') || '';
  const regexFlag = searchParams.get('regex');
  if ((regexFlag === '1' || regexFlag === 'true') && q && !(q.startsWith('/') && q.endsWith('/'))) {
    q = `/${q}/`;
  }
  const includeLines = searchParams.get('includeLines') === '1' || searchParams.get('includeLines') === 'true';
  return { source, target, targets, unit, file, since, level, lines, maxBytesPerFile, q, includeLines };
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
  const mcpFleet = options.mcpFleet || new McpFleetManager(config, logger);
  const a2aOrchestrator = options.a2aOrchestrator || new A2AOrchestrator(config, logger);
  a2aOrchestrator.setLogListener((entry) => {
    eventBus.emit('a2a_log', entry);
  });
  const linearCommander = options.linearCommander || new LinearCommanderManager(config, logger);
  const botFleet = options.botFleet || new BotFleetManager(config, logger);
  const githubHub = options.githubHub || new GithubHub({ config, linearCommander, logger });
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

      if (method === 'GET' && (pathname === '/.well-known/agent-card.json' || pathname === '/.well-known/agent.json')) {
        const state = a2aOrchestrator.getState([]);
        const origin = computeRequestOrigin(req, isHttps, Boolean(config.security.trustProxy));
        const card = buildHubAgentCard({
          origin,
          appName: config.console.title,
          version: APP_VERSION,
          agents: state.agents,
          leadAgentId: state.leadAgentId,
        });
        sendJson(res, 200, card, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/a2a') {
        const a2aRate = generalLimiter.allow(clientIp);
        if (!a2aRate.allowed) {
          sendJson(res, 429, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32029, message: 'Rate limit exceeded' },
          }, { 'Retry-After': String(a2aRate.retryAfterSec) });
          return;
        }
        const rawBody = await readRawText(req, MAX_BODY_BYTES);
        const signing = getA2ASigningSecret(config);
        const hasSigHeaders = Boolean(req.headers['x-a2a-signature'] || req.headers['x-a2a-timestamp']);
        const sigCheck = hasSigHeaders
          ? verifyA2ASignature({
              rawBody,
              signature: req.headers['x-a2a-signature'],
              timestampSec: req.headers['x-a2a-timestamp'],
              secret: signing.secret,
            })
          : { valid: false, reason: 'Missing X-A2A-Signature or X-A2A-Timestamp header' };
        const webAuth = config.auth.webKey
          ? checkRequestAuth(req, url, config.auth.webKey)
          : { authorized: false, method: 'none' };
        const authRequired = Boolean(config.auth.webKey || signing.configured);

        if (hasSigHeaders && !sigCheck.valid) {
          sendJson(res, 401, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32000, message: sigCheck.reason },
          });
          return;
        }
        if (authRequired && !sigCheck.valid && !webAuth.authorized) {
          sendJson(res, 401, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32000, message: 'Unauthorized A2A request: valid HMAC signature or Bearer token required' },
          });
          return;
        }

        let rpcPayload;
        try {
          rpcPayload = JSON.parse(rawBody || '{}');
        } catch {
          sendJson(res, 400, {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error: invalid JSON body' },
          });
          return;
        }

        const state = a2aOrchestrator.getState([]);
        const origin = computeRequestOrigin(req, isHttps, Boolean(config.security.trustProxy));
        const card = buildHubAgentCard({
          origin,
          appName: config.console.title,
          version: APP_VERSION,
          agents: state.agents,
          leadAgentId: state.leadAgentId,
        });
        const rpcResult = await handleA2AJsonRpc({
          payload: rpcPayload,
          orchestrator: a2aOrchestrator,
          card,
          readOnly: Boolean(config.console.readOnly),
          actor: sigCheck.valid ? 'a2a-hmac' : 'a2a-rpc',
        });
        if (rpcResult.status < 400 && (rpcPayload?.method === 'message/send' || rpcPayload?.method === 'tasks/send' || rpcPayload?.method === 'tasks/cancel')) {
          eventBus.emit('a2a_updated', { action: rpcPayload.method, taskId: rpcResult.body?.result?.id || null });
        }
        sendJson(res, rpcResult.status, rpcResult.body, {}, req);
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

      if (pathname === '/embed' || pathname.startsWith('/embed/')) {
        await handleServiceEmbedProxy({
          req,
          res,
          pathname,
          search: url.search,
          config,
          authChecked: true,
        });
        return;
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

      // ─── Fleet-Wide MCP Control Plane (/api/mcps/*) ────────────────────────
      if (method === 'GET' && pathname === '/api/mcps') {
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const nodeId = url.searchParams.get('nodeId') || '';
        const result = mcpFleet.list(fleetNodes, nodeId);
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/mcps') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables MCP modifications' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const result = await mcpFleet.register(data, { probeRegistry, fleetNodes, actor: 'web' });
        await logger.appendAudit({
          action: 'mcp:register',
          target: result.created.map((c) => `${c.nodeId}/${c.name}`).join(', '),
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `Registered ${result.created.length} MCP instance(s)`,
        });
        eventBus.emit('mcps_updated', { action: 'register', count: result.created.length });
        sendJson(res, 201, { ok: true, ...result }, {}, req);
        return;
      }

      const mcpActionMatch = pathname.match(/^\/api\/mcps\/([A-Za-z0-9._:-]+)\/(toggle|test|sync)$/);
      if (method === 'POST' && mcpActionMatch) {
        const mcpId = mcpActionMatch[1];
        const verb = mcpActionMatch[2];
        if (verb !== 'test' && config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables MCP modifications' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        if (verb === 'toggle') {
          const result = await mcpFleet.toggle(mcpId, Boolean(data.enabled), { probeRegistry, actor: 'web' });
          await logger.appendAudit({
            action: 'mcp:toggle',
            target: mcpId,
            actor: 'web',
            ip: auditIp(clientIp),
            ok: true,
            detail: `enabled=${Boolean(data.enabled)}`,
          });
          eventBus.emit('mcps_updated', { action: 'toggle', id: mcpId, enabled: Boolean(data.enabled) });
          sendJson(res, 200, { ok: true, ...result }, {}, req);
          return;
        }
        if (verb === 'test') {
          const result = await mcpFleet.test(mcpId);
          sendJson(res, 200, result, {}, req);
          return;
        }
        if (verb === 'sync') {
          const snapshot = await hub.collectSnapshot(false);
          const fleetNodes = snapshot?.fleet?.nodes || [];
          const result = await mcpFleet.syncToNodes(mcpId, data.targetNodeIds || [], {
            probeRegistry,
            fleetNodes,
            actor: 'web',
          });
          await logger.appendAudit({
            action: 'mcp:sync',
            target: mcpId,
            actor: 'web',
            ip: auditIp(clientIp),
            ok: true,
            detail: `Synced to ${(data.targetNodeIds || []).join(', ')}`,
          });
          eventBus.emit('mcps_updated', { action: 'sync', id: mcpId, count: result.synced.length });
          sendJson(res, 200, { ok: true, ...result }, {}, req);
          return;
        }
      }

      const mcpDeleteMatch = pathname.match(/^\/api\/mcps\/([A-Za-z0-9._:-]+)$/);
      if (method === 'DELETE' && mcpDeleteMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables MCP deletion' }, {}, req);
          return;
        }
        const mcpId = mcpDeleteMatch[1];
        const result = await mcpFleet.remove(mcpId);
        await logger.appendAudit({
          action: 'mcp:delete',
          target: mcpId,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: 'Removed MCP registration',
        });
        eventBus.emit('mcps_updated', { action: 'delete', id: mcpId });
        sendJson(res, 200, result, {}, req);
        return;
      }

      // ─── Harness-Free A2A Lead/Worker Orchestrator (/api/a2a/*) ────────────
      if (method === 'GET' && pathname === '/api/magpie/models') {
        const catalog = config.demo && demoProvider
          ? demoProvider.getMagpieCatalog()
          : await collectMagpieCatalog(config.connectors.magpie, { awaitCli: true });
        sendJson(res, 200, catalog, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/a2a/state') {
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const magpieBindings = config.demo && demoProvider
          ? (snapshot?.magpie?.agents || [])
          : (snapshot?.magpie?.agentBindings || snapshot?.magpie?.agents || getCachedMagpieAgentBindings(config.connectors.magpie));
        const state = a2aOrchestrator.getState(fleetNodes, { magpieBindings });
        sendJson(res, 200, state, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/signing/verify') {
        const { data } = await readBody(req);
        const signing = getA2ASigningSecret(config);
        const signingMeta = getA2ASigningMetadata(config);
        const hasProvided = Boolean(data?.signature && data?.timestampSec !== undefined && data?.rawBody !== undefined);
        if (hasProvided) {
          const verified = verifyA2ASignature({
            rawBody: String(data.rawBody),
            signature: String(data.signature),
            timestampSec: data.timestampSec,
            secret: signing.secret,
          });
          sendJson(res, 200, {
            ok: true,
            mode: 'verify',
            valid: Boolean(verified.valid),
            reason: verified.reason || null,
            signing: signingMeta,
          }, {}, req);
          return;
        }
        const tsSec = Math.floor(Date.now() / 1000);
        const sampleBody = JSON.stringify({
          jsonrpc: '2.0',
          id: `sig-verify-${tsSec}`,
          method: 'agent/ping',
          params: { keyId: signingMeta.keyId },
        });
        const headers = buildSignedA2AHeaders(sampleBody, {
          secret: signing.secret,
          timestampSec: tsSec,
        });
        const verified = verifyA2ASignature({
          rawBody: sampleBody,
          signature: headers['X-A2A-Signature'],
          timestampSec: headers['X-A2A-Timestamp'],
          secret: signing.secret,
          nowSec: tsSec,
        });
        sendJson(res, 200, {
          ok: true,
          mode: 'self-test',
          valid: Boolean(verified.valid),
          reason: verified.reason || null,
          verifiedTimestampSec: tsSec,
          sampleSignaturePrefix: String(headers['X-A2A-Signature'] || '').slice(0, 19),
          signing: signingMeta,
        }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/a2a/connect-profiles') {
        const origin = computeRequestOrigin(req, isHttps, Boolean(config.security.trustProxy));
        const nodeId = url.searchParams.get('nodeId') || 'edge-node-01';
        const deviceType = url.searchParams.get('deviceType') || 'server';
        const tailscaleHost = url.searchParams.get('tailscaleHost')
          || config.fleet?.localNode?.tailscaleIp
          || 'ops-hub.tailnet.ts.net';
        const cloudflareDomain = url.searchParams.get('cloudflareDomain') || 'ops-hub.example.com';
        const profiles = buildNodeConnectProfiles({
          origin,
          nodeId,
          deviceType,
          tailscaleHost,
          cloudflareDomain,
        });
        const signingMeta = getA2ASigningMetadata(config);
        sendJson(res, 200, {
          ok: true,
          protocol: 'Google A2A (Agent2Agent)',
          specVersion: '0.3.0',
          hubAgentCardUrl: `${origin}/.well-known/agent-card.json`,
          hubRpcUrl: `${origin}/a2a`,
          signingConfigured: signingMeta.configured,
          signingKeyId: signingMeta.keyId,
          signingKeySource: signingMeta.keySource,
          signing: signingMeta,
          profiles,
        }, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/lead') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables Lead Agent changes' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.setLeadAgent(String(data.agentId || ''));
        await logger.appendAudit({
          action: 'a2a:set-lead',
          target: result.leadAgentId,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `Elected Lead Harness: ${result.leadAgent?.name || result.leadAgentId}`,
        });
        eventBus.emit('a2a_updated', { action: 'set_lead', leadAgentId: result.leadAgentId });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/agents') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables registering A2A agents' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const agent = await a2aOrchestrator.registerAgent(data, { fleetNodes });
        await logger.appendAudit({
          action: 'a2a:register-agent',
          target: `${agent.nodeId}/${agent.id}`,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `Registered ${agent.harness} (${agent.role})`,
        });
        eventBus.emit('a2a_updated', { action: 'register_agent', id: agent.id });
        sendJson(res, 201, { ok: true, agent }, {}, req);
        return;
      }

      const a2aAgentMatch = pathname.match(/^\/api\/a2a\/agents\/([A-Za-z0-9._:-]+)$/);
      if (method === 'PATCH' && a2aAgentMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables updating A2A agents' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const agent = await a2aOrchestrator.updateAgent(a2aAgentMatch[1], data);
        await logger.appendAudit({
          action: 'a2a:update-agent',
          target: agent.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `delegatable=${agent.delegatable}, mcps=${agent.boundMcpIds.length}`,
        });
        eventBus.emit('a2a_updated', { action: 'update_agent', id: agent.id });
        sendJson(res, 200, { ok: true, agent }, {}, req);
        return;
      }

      if (method === 'DELETE' && a2aAgentMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables deleting A2A agents' }, {}, req);
          return;
        }
        const result = await a2aOrchestrator.removeAgent(a2aAgentMatch[1]);
        await logger.appendAudit({
          action: 'a2a:delete-agent',
          target: a2aAgentMatch[1],
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: 'Removed A2A peer',
        });
        eventBus.emit('a2a_updated', { action: 'delete_agent', id: a2aAgentMatch[1] });
        sendJson(res, 200, result, {}, req);
        return;
      }

      const a2aDiscoverMatch = pathname.match(/^\/api\/a2a\/agents\/([A-Za-z0-9._:-]+)\/discover$/);
      if (method === 'POST' && a2aDiscoverMatch) {
        const result = await a2aOrchestrator.discoverAgentCard(a2aDiscoverMatch[1]);
        sendJson(res, 200, result, {}, req);
        return;
      }

      const a2aPingMatch = pathname.match(/^\/api\/a2a\/agents\/([A-Za-z0-9._:-]+)\/ping$/);
      if (method === 'POST' && a2aPingMatch) {
        const result = await a2aOrchestrator.pingAgent(a2aPingMatch[1]);
        eventBus.emit('a2a_updated', { action: 'ping_agent', id: a2aPingMatch[1], reachable: result.reachable });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/tasks') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables dispatching A2A tasks' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const magpieBindings = config.demo && demoProvider
          ? (demoProvider.getMagpieCatalog().agentBindings || [])
          : getCachedMagpieAgentBindings(config.connectors.magpie);
        const task = await a2aOrchestrator.dispatchTask(data, { actor: 'web', magpieBindings });
        await logger.appendAudit({
          action: 'a2a:dispatch-task',
          target: `${task.leadAgentId}->${task.workerAgentId}`,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: task.state !== 'failed',
          detail: `taskId=${task.id}, state=${task.state}`,
        });
        eventBus.emit('a2a_updated', { action: 'dispatch_task', taskId: task.id, state: task.state });
        sendJson(res, 201, { ok: true, task }, {}, req);
        return;
      }

      const a2aCancelMatch = pathname.match(/^\/api\/a2a\/tasks\/([A-Za-z0-9._:-]+)\/cancel$/);
      if (method === 'POST' && a2aCancelMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables canceling A2A tasks' }, {}, req);
          return;
        }
        const task = await a2aOrchestrator.cancelTask(a2aCancelMatch[1]);
        await logger.appendAudit({
          action: 'a2a:cancel-task',
          target: task.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: 'Canceled A2A task',
        });
        eventBus.emit('a2a_updated', { action: 'cancel_task', taskId: task.id });
        sendJson(res, 200, { ok: true, task }, {}, req);
        return;
      }

      const a2aTaskStateMatch = pathname.match(/^\/api\/a2a\/tasks\/([A-Za-z0-9._:-]+)\/state$/);
      if (method === 'PATCH' && a2aTaskStateMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables updating A2A task state' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.updateTaskState(a2aTaskStateMatch[1], data?.state, {
          actor: 'web',
          reason: data?.reason || '',
        });
        await logger.appendAudit({
          action: 'a2a:update-task-state',
          target: result.task.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `state=${result.task.state}`,
        });
        eventBus.emit('a2a_updated', { action: 'update_task_state', taskId: result.task.id, state: result.task.state });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'PUT' && pathname === '/api/a2a/config') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables orchestration config changes' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.updateOrchestrationConfig(data);
        await logger.appendAudit({
          action: 'a2a:update-config',
          target: result.orchestrationConfig.mode,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `mode=${result.orchestrationConfig.mode}, main=${result.orchestrationConfig.mainModel}/${result.orchestrationConfig.mainEffort}, sub=${result.orchestrationConfig.subModel}/${result.orchestrationConfig.subEffort}`,
        });
        eventBus.emit('a2a_updated', { action: 'update_config', mode: result.orchestrationConfig.mode });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'PUT' && pathname === '/api/a2a/topology') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables saving topology layout' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.saveTopologyPositions(data?.positions || data);
        eventBus.emit('a2a_updated', { action: 'save_topology', updated: result.updated });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/routes') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables editing routing rules' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.upsertRoutingRule(data);
        await logger.appendAudit({
          action: 'a2a:upsert-route',
          target: result.rule.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `${result.rule.sourceAgentId}->${result.rule.targetAgentId} (${result.rule.targetModel}/${result.rule.reasoningEffort})`,
        });
        eventBus.emit('a2a_updated', { action: 'upsert_route', ruleId: result.rule.id });
        sendJson(res, 200, result, {}, req);
        return;
      }

      const a2aRouteMatch = pathname.match(/^\/api\/a2a\/routes\/([A-Za-z0-9._:-]+)$/);
      if (method === 'DELETE' && a2aRouteMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables deleting routing rules' }, {}, req);
          return;
        }
        const result = await a2aOrchestrator.deleteRoutingRule(a2aRouteMatch[1]);
        await logger.appendAudit({
          action: 'a2a:delete-route',
          target: a2aRouteMatch[1],
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: 'Deleted visual routing rule',
        });
        eventBus.emit('a2a_updated', { action: 'delete_route', ruleId: a2aRouteMatch[1] });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/discover-local') {
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const result = await a2aOrchestrator.discoverInstalledAgents(fleetNodes);
        await logger.appendAudit({
          action: 'a2a:discover-local',
          target: 'fleet',
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `discovered=${result.discoveredCount}, newlyRegistered=${result.newlyRegistered}`,
        });
        eventBus.emit('a2a_updated', { action: 'discover_local', count: result.discoveredCount });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/skills') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables managing skills' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.upsertSkill(data);
        await logger.appendAudit({
          action: 'a2a:upsert-skill',
          target: result.skill.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `${result.skill.name} v${result.skill.version}`,
        });
        eventBus.emit('a2a_updated', { action: 'upsert_skill', skillId: result.skill.id });
        sendJson(res, 201, result, {}, req);
        return;
      }

      const a2aSkillMatch = pathname.match(/^\/api\/a2a\/skills\/([A-Za-z0-9._:-]+)$/);
      if (method === 'PATCH' && a2aSkillMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables updating skills' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.updateSkill(a2aSkillMatch[1], data);
        eventBus.emit('a2a_updated', { action: 'update_skill', skillId: a2aSkillMatch[1] });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'DELETE' && a2aSkillMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables deleting skills' }, {}, req);
          return;
        }
        const result = await a2aOrchestrator.deleteSkill(a2aSkillMatch[1]);
        eventBus.emit('a2a_updated', { action: 'delete_skill', skillId: a2aSkillMatch[1] });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/sessions') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables creating aligned sessions' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.createSession(data);
        await logger.appendAudit({
          action: 'a2a:create-session',
          target: result.session.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `${result.session.contextId} (${result.session.syncMode})`,
        });
        eventBus.emit('a2a_updated', { action: 'create_session', sessionId: result.session.id });
        sendJson(res, 201, result, {}, req);
        return;
      }

      const a2aSessionSyncMatch = pathname.match(/^\/api\/a2a\/sessions\/([A-Za-z0-9._:-]+)\/sync$/);
      if (method === 'POST' && a2aSessionSyncMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables syncing sessions' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.syncSession(a2aSessionSyncMatch[1], data?.extraNodes);
        await logger.appendAudit({
          action: 'a2a:sync-session',
          target: result.session.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `rev=${result.session.revision}, nodes=${result.session.syncedNodes.length}`,
        });
        eventBus.emit('a2a_updated', { action: 'sync_session', sessionId: result.session.id });
        sendJson(res, 200, result, {}, req);
        return;
      }

      const a2aSessionHandoffMatch = pathname.match(/^\/api\/a2a\/sessions\/([A-Za-z0-9._:-]+)\/handoff$/);
      if (method === 'POST' && a2aSessionHandoffMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables session handoff' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.handoffSession(a2aSessionHandoffMatch[1], String(data?.targetAgentId || ''));
        await logger.appendAudit({
          action: 'a2a:handoff-session',
          target: result.session.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `handoff->${result.session.primaryAgentId}`,
        });
        eventBus.emit('a2a_updated', { action: 'handoff_session', sessionId: result.session.id });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/a2a/logs') {
        const result = a2aOrchestrator.getCollaborationLogs({
          agentId: url.searchParams.get('agentId') || '',
          eventType: url.searchParams.get('eventType') || '',
          level: url.searchParams.get('level') || '',
          q: url.searchParams.get('q') || '',
          limit: Number(url.searchParams.get('limit') || 80),
        });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/a2a/logs/stream') {
        const agentIdFilter = String(url.searchParams.get('agentId') || '').trim();
        const eventTypeFilter = String(url.searchParams.get('eventType') || '').trim();
        const levelFilter = String(url.searchParams.get('level') || '').trim().toLowerCase();
        const queryFilter = String(url.searchParams.get('q') || '').trim().toLowerCase();

        if (eventBus.activeStreams.size >= eventBus.maxStreams) {
          sendJson(res, 429, { ok: false, error: 'Too many concurrent SSE event streams' }, {}, req);
          return;
        }

        req.socket?.setTimeout?.(0);
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
          ...secHeaders(false),
        });

        let cleaned = false;
        const sendFrame = (eventName, data, id) => {
          if (res.writableEnded || res.destroyed) return;
          try {
            if (id != null) res.write(`id: ${id}\n`);
            res.write(`event: ${eventName}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          } catch {
            cleanup();
          }
        };

        const matchesFilters = (entry) => {
          if (!entry) return false;
          if (agentIdFilter && agentIdFilter !== 'all') {
            if (entry.sourceAgentId !== agentIdFilter && entry.targetAgentId !== agentIdFilter) return false;
          }
          if (eventTypeFilter && eventTypeFilter !== 'all') {
            if (entry.eventType !== eventTypeFilter && !String(entry.eventType || '').startsWith(`${eventTypeFilter}.`)) {
              return false;
            }
          }
          if (levelFilter && levelFilter !== 'all' && entry.level !== levelFilter) return false;
          if (queryFilter) {
            const hay = `${entry.sourceAgentName} ${entry.targetAgentName} ${entry.eventType} ${entry.summary} ${entry.detail} ${entry.contextId || ''} ${entry.spillRefId || ''}`.toLowerCase();
            if (!hay.includes(queryFilter)) return false;
          }
          return true;
        };

        const onBusEvent = (evt) => {
          if (evt?.type !== 'a2a_log' || !matchesFilters(evt.payload)) return;
          sendFrame('a2a_log', evt.payload, evt.id);
        };

        const heartbeat = setInterval(() => {
          if (res.writableEnded || res.destroyed) {
            cleanup();
            return;
          }
          try {
            res.write(`: keepalive ${Date.now()}\n\n`);
          } catch {
            cleanup();
          }
        }, eventBus.heartbeatMs);
        heartbeat.unref?.();

        const streamHandle = {
          close: () => {
            cleanup();
            if (!res.writableEnded) {
              try {
                res.end();
              } catch {
                // ignore
              }
            }
          },
        };

        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          clearInterval(heartbeat);
          eventBus.emitter.off('event', onBusEvent);
          eventBus.activeStreams.delete(streamHandle);
        };

        eventBus.activeStreams.add(streamHandle);
        eventBus.emitter.on('event', onBusEvent);
        req.on('close', cleanup);
        res.on('close', cleanup);
        res.on('error', cleanup);

        const initial = a2aOrchestrator.getCollaborationLogs({
          agentId: agentIdFilter,
          eventType: eventTypeFilter,
          level: levelFilter,
          q: queryFilter,
          limit: 60,
        });
        sendFrame('init', {
          agentId: agentIdFilter || 'all',
          total: initial.total,
          items: initial.items,
          ts: new Date().toISOString(),
        });
        return;
      }

      if (method === 'GET' && pathname === '/api/a2a/swarm/metrics') {
        const snapshot = await hub.collectSnapshot(false);
        const state = a2aOrchestrator.getState(snapshot?.fleet?.nodes || []);
        sendJson(res, 200, {
          ok: true,
          swarmMetrics: state.swarmMetrics,
          superAgentConfig: state.superAgentConfig,
          superAgentTickets: state.superAgentTickets,
          contextSpillNodes: state.contextSpillNodes,
          triggerEvents: state.triggerEvents,
        }, {}, req);
        return;
      }

      if (method === 'PUT' && pathname === '/api/a2a/superagent/config') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables modifying SuperAgent config' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.updateSuperAgentConfig(data);
        await logger.appendAudit({
          action: 'a2a:superagent-config',
          target: 'superagent',
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `fastPath=${result.superAgentConfig.fastPathEnabled}, inlineKb=${result.superAgentConfig.inlineBudgetKb}`,
        });
        eventBus.emit('a2a_updated', { action: 'superagent_config' });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/superagent/triggers') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables ingesting SuperAgent triggers' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.ingestTriggerEvent(data, { actor: 'web' });
        await logger.appendAudit({
          action: 'a2a:superagent-trigger',
          target: result.trigger.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `decision=${result.trigger.decision}, thread=${result.trigger.threadKey}`,
        });
        eventBus.emit('a2a_updated', { action: 'superagent_trigger', triggerId: result.trigger.id });
        sendJson(res, 201, result, {}, req);
        return;
      }

      const superAgentSpillMatch = pathname.match(/^\/api\/a2a\/superagent\/context\/([A-Za-z0-9._:-]+)\/toggle$/);
      if (method === 'POST' && superAgentSpillMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables toggling context spill nodes' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.toggleContextSpillNode(superAgentSpillMatch[1], data?.state || '');
        await logger.appendAudit({
          action: 'a2a:superagent-context-toggle',
          target: result.node.spillId,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `state=${result.node.state}, recalls=${result.node.recallCount}`,
        });
        eventBus.emit('a2a_updated', { action: 'superagent_context_toggle', spillId: result.node.spillId });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/superagent/watchdog/sweep') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables Watchdog recovery sweeps' }, {}, req);
          return;
        }
        const result = await a2aOrchestrator.runWatchdogSweep();
        await logger.appendAudit({
          action: 'a2a:superagent-watchdog',
          target: 'watchdog',
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `checked=${result.checkedCount}, recovered=${result.recoveredCount}`,
        });
        eventBus.emit('a2a_updated', { action: 'superagent_watchdog', recovered: result.recoveredCount });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/a2a/dsh-team/run') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables DSH team collaboration runs' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await a2aOrchestrator.runDshTeamCollaboration(data, { actor: 'web' });
        await logger.appendAudit({
          action: 'a2a:dsh-team-run',
          target: result.task.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `policy=${result.policy}, approved=${result.approved}, ticket=${result.ticket.id}`,
        });
        eventBus.emit('a2a_updated', { action: 'dsh_team_run', taskId: result.task.id });
        sendJson(res, 201, result, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/ai/context') {
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const a2aState = a2aOrchestrator.getState(fleetNodes);
        const mcpState = mcpFleet.list(fleetNodes);
        const context = buildAiOpsContext({
          version: APP_VERSION,
          config,
          snapshot,
          a2aState,
          mcpFleetSummary: mcpState.summary,
          alertsCount: alertEngine.alerts.filter((a) => a.status === 'active').length,
        });
        sendJson(res, 200, context, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/ai/preflight') {
        const { data } = await readBody(req);
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const a2aState = a2aOrchestrator.getState(fleetNodes);
        const mcpState = mcpFleet.list(fleetNodes);
        const result = evaluateAiPreflight(data, {
          config,
          snapshot,
          a2aState,
          mcpFleetSummary: mcpState.summary,
        });
        sendJson(res, 200, result, {}, req);
        return;
      }

      // ─── Linear AI Project Management & Commander-in-Chief Orchestration ─────
      if (method === 'GET' && pathname === '/api/linear/state') {
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const a2aState = a2aOrchestrator.getState(fleetNodes);
        const botsList = botFleet.list().bots;
        const state = linearCommander.getState(a2aState, botsList);
        sendJson(res, 200, state, {}, req);
        return;
      }

      if (method === 'PUT' && pathname === '/api/linear/commander') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables modifying Commander config' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await linearCommander.updateCommanderConfig(data);
        await logger.appendAudit({
          action: 'linear:commander-config',
          target: result.commander.leadAgentId || 'commander',
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `autoDecompose=${result.commander.autoDecompose}`,
        });
        eventBus.emit('linear_updated', { action: 'commander_config' });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/linear/projects') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables creating Linear projects' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await linearCommander.createProject(data);
        await logger.appendAudit({
          action: 'linear:project-create',
          target: result.project.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `${result.project.key} ${result.project.name}`,
        });
        eventBus.emit('linear_updated', { action: 'project_create', projectId: result.project.id });
        sendJson(res, 201, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/linear/issues') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables creating Linear issues' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await linearCommander.createIssue(data);
        await logger.appendAudit({
          action: 'linear:issue-create',
          target: result.issue.identifier,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `${result.issue.status} ${result.issue.title}`,
        });
        eventBus.emit('linear_updated', { action: 'issue_create', issueId: result.issue.id });
        sendJson(res, 201, result, {}, req);
        return;
      }

      const linearIssueDispatchMatch = pathname.match(/^\/api\/linear\/issues\/([A-Za-z0-9._:-]+)\/dispatch$/);
      if (method === 'POST' && linearIssueDispatchMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables Commander dispatch' }, {}, req);
          return;
        }
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const result = await linearCommander.commanderDecomposeAndDispatch(linearIssueDispatchMatch[1], {
          a2aOrchestrator,
          fleetNodes,
          actor: 'web',
        });
        await logger.appendAudit({
          action: 'linear:commander-dispatch',
          target: result.issue.identifier,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `subIssues=${result.createdSubIssues.length}, branch=${result.issue.worktreeBranch || '-'}`,
        });
        eventBus.emit('linear_updated', { action: 'commander_dispatch', issueId: result.issue.id });
        eventBus.emit('a2a_updated', { action: 'linear_dispatch', issueId: result.issue.id });
        sendJson(res, 200, result, {}, req);
        return;
      }

      const linearIssueMatch = pathname.match(/^\/api\/linear\/issues\/([A-Za-z0-9._:-]+)$/);
      if (linearIssueMatch && (method === 'PATCH' || method === 'DELETE')) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables modifying Linear issues' }, {}, req);
          return;
        }
        const issueId = linearIssueMatch[1];
        if (method === 'PATCH') {
          const { data } = await readBody(req);
          const result = await linearCommander.updateIssue(issueId, data);
          await logger.appendAudit({
            action: 'linear:issue-update',
            target: result.issue.identifier,
            actor: 'web',
            ip: auditIp(clientIp),
            ok: true,
            detail: `status=${result.issue.status}`,
          });
          eventBus.emit('linear_updated', { action: 'issue_update', issueId: result.issue.id });
          sendJson(res, 200, result, {}, req);
          return;
        }
        const result = await linearCommander.deleteIssue(issueId);
        await logger.appendAudit({
          action: 'linear:issue-delete',
          target: issueId,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: 'deleted',
        });
        eventBus.emit('linear_updated', { action: 'issue_delete', issueId });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'PUT' && pathname === '/api/linear/github/config') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables modifying GitHub sync config' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await linearCommander.updateGithubConfig(data);
        await logger.appendAudit({
          action: 'linear:github-config',
          target: `${result.githubConfig.owner}/${result.githubConfig.repo}`,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `direction=${result.githubConfig.syncDirection}`,
        });
        eventBus.emit('linear_updated', { action: 'github_config' });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/linear/github/sync') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables GitHub sync' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await linearCommander.syncGithub({ direction: data?.direction, actor: 'web' });
        await logger.appendAudit({
          action: 'linear:github-sync',
          target: result.repo,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `mode=${result.mode}, updated=${result.updatedCount}, imported=${result.importedCount}`,
        });
        eventBus.emit('linear_updated', { action: 'github_sync', repo: result.repo });
        sendJson(res, 200, result, {}, req);
        return;
      }

      // ─── GitHub Integration Hub (Orca / T3-style) ────────────────────────────
      if (method === 'GET' && pathname === '/api/github/overview') {
        const force = url.searchParams.get('refresh') === '1';
        const overview = await githubHub.getOverview({ force });
        sendJson(res, 200, overview, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/github/dispatch-agent') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables dispatching GitHub agent tasks' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const dispatchPayload = githubHub.buildDispatchPayload(data);
        if (!a2aOrchestrator.leadAgentId) {
          const registeredAgents = [...a2aOrchestrator.agents.values()];
          if (registeredAgents.length === 0) {
            sendJson(res, 400, {
              ok: false,
              error: '尚未注册任何 A2A Agent，请先在 Agent 工作台注册或自动发现本机 Agent。',
            }, {}, req);
            return;
          }
          const candidate = registeredAgents.find((agent) => agent.status !== 'offline') || registeredAgents[0];
          await a2aOrchestrator.setLeadAgent(candidate.id);
        }
        const task = await a2aOrchestrator.dispatchTask(dispatchPayload, { actor: 'github-hub' });
        await logger.appendAudit({
          action: 'github:dispatch-agent',
          target: `${data?.kind || 'issue'}#${data?.number || 'new'}`,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: task.state !== 'failed',
          detail: `taskId=${task.id}, action=${dispatchPayload.slashCommand || '/implement'}`,
        });
        eventBus.emit('a2a_updated', { action: 'github_dispatch', taskId: task.id, state: task.state });
        sendJson(res, 201, { ok: true, task }, {}, req);
        return;
      }

      // ─── Bot Fleet & Multi-Channel Automation System ─────────────────────────
      if (method === 'GET' && pathname === '/api/bots') {
        let githubOverview = null;
        if (!config.demo) {
          try {
            githubOverview = await githubHub.getOverview({ force: false });
          } catch {
            githubOverview = null;
          }
        }
        const payload = await botFleet.listWithIntegrations({ githubOverview });
        sendJson(res, 200, payload, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/bots') {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables creating bots' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const result = await botFleet.createBot(data);
        await logger.appendAudit({
          action: 'bot:create',
          target: result.bot.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `${result.bot.channel} ${result.bot.handle}`,
        });
        eventBus.emit('bots_updated', { action: 'create', botId: result.bot.id });
        sendJson(res, 201, result, {}, req);
        return;
      }

      const botTriggerMatch = pathname.match(/^\/api\/bots\/([A-Za-z0-9._:-]+)\/trigger$/);
      if (method === 'POST' && botTriggerMatch) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables triggering bots' }, {}, req);
          return;
        }
        const { data } = await readBody(req);
        const snapshot = await hub.collectSnapshot(false);
        const fleetNodes = snapshot?.fleet?.nodes || [];
        const result = await botFleet.triggerBotEvent(botTriggerMatch[1], data, {
          linearManager: linearCommander,
          a2aOrchestrator,
          fleetNodes,
          actor: 'web',
        });
        await logger.appendAudit({
          action: 'bot:trigger',
          target: result.bot.id,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: `issue=${result.createdIssue?.identifier || 'none'}, dispatched=${Boolean(result.dispatchResult?.ok)}`,
        });
        eventBus.emit('bots_updated', { action: 'trigger', botId: result.bot.id });
        if (result.createdIssue) eventBus.emit('linear_updated', { action: 'bot_issue', issueId: result.createdIssue.id });
        sendJson(res, 200, result, {}, req);
        return;
      }

      const botItemMatch = pathname.match(/^\/api\/bots\/([A-Za-z0-9._:-]+)$/);
      if (botItemMatch && (method === 'PATCH' || method === 'DELETE')) {
        if (config.console.readOnly) {
          sendJson(res, 403, { ok: false, error: 'Read-only mode disables modifying bots' }, {}, req);
          return;
        }
        const botId = botItemMatch[1];
        if (method === 'PATCH') {
          const { data } = await readBody(req);
          const result = await botFleet.updateBot(botId, data);
          await logger.appendAudit({
            action: 'bot:update',
            target: botId,
            actor: 'web',
            ip: auditIp(clientIp),
            ok: true,
            detail: `enabled=${result.bot.enabled}`,
          });
          eventBus.emit('bots_updated', { action: 'update', botId });
          sendJson(res, 200, result, {}, req);
          return;
        }
        const result = await botFleet.deleteBot(botId);
        await logger.appendAudit({
          action: 'bot:delete',
          target: botId,
          actor: 'web',
          ip: auditIp(clientIp),
          ok: true,
          detail: 'deleted',
        });
        eventBus.emit('bots_updated', { action: 'delete', botId });
        sendJson(res, 200, result, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/snapshot') {
        const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('force') === '1';
        const snapshot = await hub.collectSnapshot(force);
        alertEngine.evaluateSnapshot(snapshot);
        const rawFleetNodes = snapshot?.fleet?.nodes || [];
        const enrichedFleet = snapshot?.fleet
          ? {
              ...snapshot.fleet,
              nodes: rawFleetNodes.map((node) => ({
                ...node,
                disk: node.disk || (Array.isArray(node.disks) && node.disks[0] ? { mount: node.disks[0].mount, usedPct: node.disks[0].usedPct } : undefined),
                mcps: mcpFleet.getForNode(node.id, rawFleetNodes),
                harnesses: a2aOrchestrator.getForNode(node.id, rawFleetNodes),
              })),
            }
          : snapshot?.fleet;
        sendJson(res, 200, {
          ...snapshot,
          fleet: enrichedFleet,
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

      if (method === 'GET' && pathname === '/api/network/cloudflare') {
        if (config.demo && demoProvider) {
          const snap = demoProvider.getSnapshot(config);
          sendJson(res, 200, { ok: true, cloudflare: snap.network?.cloudflare || null }, {}, req);
          return;
        }
        const cloudflare = await collectCloudflare(config.connectors?.cloudflare || {});
        sendJson(res, 200, { ok: true, cloudflare }, {}, req);
        return;
      }

      if (method === 'GET' && pathname === '/api/network/tailscale/netcheck') {
        if (config.demo) {
          sendJson(res, 200, {
            ok: true,
            netcheck: {
              ok: true,
              udp: true,
              ipv4: true,
              ipv6: false,
              mappingVariesByDestIp: false,
              preferredDerp: 'hkg',
              captivePortal: false,
              derpRegions: [
                { regionId: 'hkg', latencyMs: 28.4 },
                { regionId: 'tok', latencyMs: 49.2 },
                { regionId: 'sin', latencyMs: 63.7 },
                { regionId: 'sjc', latencyMs: 148.1 },
              ],
              checkedAt: new Date().toISOString(),
            },
          }, {}, req);
          return;
        }
        const netcheck = await runTailscaleNetcheck(config.connectors?.tailscale || {});
        sendJson(res, 200, { ok: true, netcheck }, {}, req);
        return;
      }

      if (method === 'POST' && pathname === '/api/network/tailscale/ping') {
        const { data } = await readBody(req);
        const target = String(data?.target || '').trim();
        if (!target) {
          sendJson(res, 400, { ok: false, error: '缺少目标节点地址 target' }, {}, req);
          return;
        }
        if (config.demo) {
          sendJson(res, 200, {
            ok: true,
            ping: {
              target,
              ok: true,
              latencyMs: 18.4,
              direct: true,
              relay: '',
              via: '198.51.100.21:41641',
              raw: `pong from ${target} via 198.51.100.21:41641 in 18.4ms`,
            },
          }, {}, req);
          return;
        }
        try {
          const ping = await runTailscalePing(config.connectors?.tailscale || {}, target);
          sendJson(res, 200, { ok: true, ping }, {}, req);
        } catch (err) {
          sendJson(res, 400, { ok: false, error: err.message }, {}, req);
        }
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

      if (method === 'GET' && pathname === '/api/logs/unified') {
        const queryParams = normalizeLogQuery(url.searchParams);
        queryParams.source = 'unified';
        if (!queryParams.targets.length && queryParams.target) {
          queryParams.targets = queryParams.target.split(',').map((item) => item.trim()).filter(Boolean);
        }
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
      await mcpFleet.init();
      await a2aOrchestrator.init();
      await linearCommander.init();
      await botFleet.init();
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
    mcpFleet,
    a2aOrchestrator,
    githubHub,
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
