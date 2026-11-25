import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { ActionController } from './actions.mjs';
import { SingleFlightCache } from './cache.mjs';
import { APP_VERSION, PACKAGE_ROOT } from './config.mjs';
import { createDemoProvider } from './connectors/demo.mjs';
import { ConnectorHub } from './connectors/index.mjs';
import { StructuredLogger } from './logger.mjs';
import { LogService } from './logs.mjs';
import { isTailscaleOrLoopbackIp, ProbeRegistry, validateNodeId } from './probes.mjs';
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
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_PROBE_BODY_BYTES = 32 * 1024;

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

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...getSecurityHeaders({ isHtml: false }),
    ...extraHeaders,
  });
  res.end(body);
}

function sendHtml(res, statusCode, html, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...getSecurityHeaders({ isHtml: true }),
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
  const source = searchParams.get('source') || 'journald';
  const unit = searchParams.get('unit') || '';
  const file = searchParams.get('file') || '';
  const since = searchParams.get('since') || '1h';
  const level = searchParams.get('level') || searchParams.get('severity') || 'all';
  const lines = Number(searchParams.get('lines') || searchParams.get('limit') || 150);
  let q = searchParams.get('q') || '';
  const regexFlag = searchParams.get('regex');
  if ((regexFlag === '1' || regexFlag === 'true') && q && !(q.startsWith('/') && q.endsWith('/'))) {
    q = `/${q}/`;
  }
  return { source, unit, file, since, level, lines, q };
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
  const timeseries = options.timeseries || new TimeSeriesStore({
    maxPoints: config.fleet?.historyPoints || 60,
    minIntervalMs: 3000,
  });
  const probeRegistry = options.probeRegistry || new ProbeRegistry({ config, logger, timeseries });
  const hub = options.hub || new ConnectorHub({ config, cache, demoProvider, probeRegistry });
  const logs = options.logs || new LogService({ config, logger, demoProvider });
  const actions = options.actions || new ActionController({ config, logger, cache, demoProvider });

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
        ...getSecurityHeaders({ isHtml: false }),
      });
      res.end('Not Found');
      return;
    }

    let stat;
    try {
      stat = await fs.stat(resolved);
      if (!stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders() });
        res.end('Not Found');
        return;
      }
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders() });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';
    const content = await fs.readFile(resolved);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=60',
      ...getSecurityHeaders({ isHtml }),
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(content);
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
        });
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
          sendJson(res, 200, ingestResult);
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
        if (!verifySameOrigin(req, config.security.allowedOrigins)) {
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
            res.writeHead(303, { Location: '/', ...getSecurityHeaders() });
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
            ...getSecurityHeaders(),
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
            ...getSecurityHeaders(),
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
          requireTailscaleCidr: config.fleet?.requireTailscaleCidr !== false,
          localNodeId: config.fleet?.localNode?.id || 'hub-primary',
          enrolledProbesCount: probeRegistry.records.size,
          hosts: config.console.hosts,
          port: config.console.port,
          layers: config.layers,
          logSources: logs.listSources(),
          opsConfigured: {
            health: Boolean(config.ops.healthScript || config.demo),
            backup: Boolean(config.ops.backupScript || config.demo),
          },
        });
        return;
      }

      if (method === 'GET' && (pathname === '/api/nodes' || pathname === '/api/fleet')) {
        const force = url.searchParams.get('refresh') === '1';
        const snapshot = await hub.collectSnapshot(force);
        sendJson(res, 200, { ok: true, fleet: snapshot.fleet || null });
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
        sendJson(res, 200, { ok: true, node, history: fullHistory.length ? fullHistory : (node.history || []) });
        return;
      }

      if (method === 'GET' && pathname === '/api/probes') {
        sendJson(res, 200, {
          ok: true,
          probes: probeRegistry.listEnrolled(),
          requireTailscaleCidr: config.fleet?.requireTailscaleCidr !== false,
        });
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
            ip: clientIp,
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
            ip: clientIp,
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
          ip: clientIp,
          requestId,
          ok: revoked.ok,
          output: revoked.ok ? 'revoked' : revoked.error,
        });
        sendJson(res, revoked.ok ? 200 : 404, revoked);
        return;
      }

      if (method === 'GET' && pathname === '/api/snapshot') {
        const force = url.searchParams.get('refresh') === '1';
        const snapshot = await hub.collectSnapshot(force);
        sendJson(res, 200, {
          ...snapshot,
          runningJobs: actions.getRunningJobs(),
        });
        return;
      }

      if (method === 'GET' && pathname === '/api/memory') {
        const force = url.searchParams.get('refresh') === '1';
        const memory = await hub.collectMemory(force);
        sendJson(res, 200, { ok: true, ...memory });
        return;
      }

      if (method === 'GET' && pathname === '/api/memory/search') {
        const provider = url.searchParams.get('provider') || 'all';
        const q = url.searchParams.get('q') || '';
        const limit = Number(url.searchParams.get('limit') || 10);
        const result = await hub.searchMemory(provider, q, limit);
        sendJson(res, 200, result);
        return;
      }

      if ((method === 'GET' || method === 'POST') && pathname === '/api/memory/doctor') {
        let provider = url.searchParams.get('provider') || 'all';
        if (method === 'POST') {
          const { data } = await readBody(req);
          if (data.provider) provider = String(data.provider);
        }
        const result = await hub.runMemoryDoctor(provider);
        sendJson(res, 200, result);
        return;
      }

      if (method === 'GET' && pathname === '/api/remotes') {
        const force = url.searchParams.get('refresh') === '1';
        const nodes = await hub.collectRemotes(force);
        sendJson(res, 200, { ok: true, nodes });
        return;
      }

      if (method === 'GET' && pathname === '/api/logs/sources') {
        sendJson(res, 200, { ok: true, ...logs.listSources() });
        return;
      }

      if (method === 'GET' && pathname === '/api/logs') {
        const queryParams = normalizeLogQuery(url.searchParams);
        const result = await logs.query(queryParams);
        sendJson(res, result.ok ? 200 : 400, result);
        return;
      }

      if (method === 'GET' && pathname === '/api/logs/stream') {
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
        const exported = logs.formatExport(result, format);
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const targetLabel = sanitizeDownloadName(queryParams.unit || queryParams.file || queryParams.source);
        res.writeHead(200, {
          'Content-Type': exported.contentType,
          'Content-Disposition': `attachment; filename="ops-console-${targetLabel}-${stamp}.${exported.ext}"`,
          'Cache-Control': 'no-store',
          ...getSecurityHeaders({ isHtml: false }),
        });
        res.end(exported.body);
        return;
      }

      if (method === 'GET' && pathname === '/api/audit') {
        const limit = Number(url.searchParams.get('limit') || 80);
        const items = await logger.readAudit(limit);
        sendJson(res, 200, { ok: true, items });
        return;
      }

      if (method === 'POST' && pathname === '/api/services/control') {
        const { data } = await readBody(req);
        const result = await actions.controlService(String(data.unit || data.id || ''), String(data.action || ''), {
          actor: 'web',
          ip: clientIp,
          requestId,
        });
        sendJson(res, result.ok ? 200 : 500, result);
        return;
      }

      if (method === 'POST' && pathname === '/api/timers/control') {
        const { data } = await readBody(req);
        const result = await actions.controlTimer(String(data.unit || data.id || ''), String(data.action || ''), {
          actor: 'web',
          ip: clientIp,
          requestId,
        });
        sendJson(res, result.ok ? 200 : 500, result);
        return;
      }

      if (method === 'POST' && (pathname === '/api/ops/health' || pathname === '/api/ops/health-check')) {
        const result = await actions.runHealthCheck({
          actor: 'web',
          ip: clientIp,
          requestId,
        });
        sendJson(res, result.ok ? 200 : 500, result);
        return;
      }

      if (method === 'POST' && pathname === '/api/ops/backup') {
        const result = await actions.triggerBackup({
          actor: 'web',
          ip: clientIp,
          requestId,
        });
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
        sendJson(res, statusCode, { ok: false, error: err.message || 'Internal server error' });
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
      for (const host of hosts) {
        const srv = http.createServer(handleRequest);
        srv.requestTimeout = 0;
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
      logger.info('server_started', {
        version: APP_VERSION,
        demo: config.demo,
        readOnly: config.console.readOnly,
        authEnabled: Boolean(config.auth.webKey),
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
    logger.info('server_stopped');
    await logger.flush();
  }

  return {
    config,
    logger,
    cache,
    timeseries,
    probeRegistry,
    hub,
    logs,
    actions,
    servers,
    addresses,
    start,
    stop,
  };
}
