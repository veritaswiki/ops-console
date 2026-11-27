import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { loadConfig } from '../src/config.mjs';
import { SESSION_COOKIE_NAME } from '../src/security.mjs';
import { createOpsConsole } from '../src/server.mjs';
import {
  buildEmbedRuntimeShim,
  rewriteEmbeddedCss,
  rewriteEmbeddedHtml,
  rewriteUpstreamReferer,
} from '../src/service-proxy.mjs';

async function startStrictOriginViteUpstream() {
  const seenRequests = [];
  let upstreamOrigin = '';
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    seenRequests.push({
      method: req.method,
      url: req.url,
      origin: origin || null,
      referer: req.headers.referer || null,
      cookie: req.headers.cookie || null,
    });

    if (origin && origin !== upstreamOrigin) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          error_code: 'browser_origin_forbidden',
          detail: 'This website is not allowed to access the local Mem server.',
        }),
      );
      return;
    }

    const corsHeaders = origin
      ? {
          'Access-Control-Allow-Origin': upstreamOrigin,
          'Access-Control-Allow-Credentials': 'true',
        }
      : {};

    if (req.url === '/app' || req.url === '/app/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'DENY',
        ...corsHeaders,
      });
      res.end(
        '<!doctype html><html><head>'
          + '<script type="module" crossorigin src="/app/assets/index-web.js"></script>'
          + '<link rel="modulepreload" crossorigin href="/app/assets/preload-helper.js">'
          + '</head><body><div id="root"></div></body></html>',
      );
      return;
    }

    if (req.url?.startsWith('/app/assets/') && req.url.endsWith('.js')) {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        ...corsHeaders,
      });
      res.end(`export const chunk = ${JSON.stringify(req.url)};`);
      return;
    }

    if (req.url?.startsWith('/app/assets/') && req.url.endsWith('.css')) {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        ...corsHeaders,
      });
      res.end('body { color: inherit; }');
      return;
    }

    if (req.url === '/health') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders,
      });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  upstreamOrigin = `http://127.0.0.1:${port}`;
  return {
    origin: upstreamOrigin,
    seenRequests,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('rewriteUpstreamReferer, rewriteEmbeddedCss, and buildEmbedRuntimeShim rewrite dynamic assets and URL objects cleanly', async () => {
  assert.equal(
    rewriteUpstreamReferer('http://ops.example.com:4320/embed/nmem/app/?tab=1', '/embed/nmem/', 'http://127.0.0.1:14242'),
    'http://127.0.0.1:14242/app/?tab=1',
  );
  assert.equal(
    rewriteUpstreamReferer('http://ops.example.com:4320/embed/nmem', '/embed/nmem/', 'http://127.0.0.1:14242'),
    'http://127.0.0.1:14242/',
  );
  assert.equal(
    rewriteUpstreamReferer('not-a-valid-url', '/embed/nmem/', 'http://127.0.0.1:14242'),
    '',
  );

  const html = rewriteEmbeddedHtml(
    '<html><head><script type="module" crossorigin src="/app/assets/index.js"></script></head><body></body></html>',
    '/embed/nmem/',
    'http://127.0.0.1:14242',
  );
  assert.ok(html.includes('src="/embed/nmem/app/assets/index.js"'));
  assert.ok(html.includes('data-ops-embed-shim="1"'));

  const shimTag = buildEmbedRuntimeShim('/embed/nmem');
  const match = shimTag.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(match && match[1], 'expected inline script inside shim');

  class MockElement {
    constructor(tagName) {
      this.tagName = tagName;
      this.attrs = {};
    }
    setAttribute(key, value) {
      this.attrs[key] = value;
    }
  }

  class MockHTMLLinkElement extends MockElement {
    constructor() {
      super('LINK');
      this._href = '';
    }
    get href() {
      return this._href;
    }
    set href(val) {
      this._href = val;
    }
  }

  class MockHTMLScriptElement extends MockElement {
    constructor() {
      super('SCRIPT');
      this._src = '';
    }
    get src() {
      return this._src;
    }
    set src(val) {
      this._src = val;
    }
  }

  class MockHTMLImageElement extends MockElement {
    constructor() {
      super('IMG');
      this._src = '';
    }
    get src() {
      return this._src;
    }
    set src(val) {
      this._src = val;
    }
  }

  const sandbox = {
    window: null,
    location: { origin: 'http://ops.example.com:4320' },
    Element: MockElement,
    HTMLLinkElement: MockHTMLLinkElement,
    HTMLScriptElement: MockHTMLScriptElement,
    HTMLImageElement: MockHTMLImageElement,
    fetch: async (url) => ({ url }),
  };
  sandbox.window = sandbox;

  vm.runInNewContext(match[1], sandbox);

  const link1 = new MockHTMLLinkElement();
  link1.href = '/app/assets/globals-123.css';
  assert.equal(link1.href, '/embed/nmem/app/assets/globals-123.css');

  const link2 = new MockHTMLLinkElement();
  link2.href = 'http://ops.example.com:4320/app/assets/globals-123.css';
  assert.equal(link2.href, 'http://ops.example.com:4320/embed/nmem/app/assets/globals-123.css');

  const link3 = new MockHTMLLinkElement();
  link3.setAttribute('href', '/app/assets/chunk.css');
  assert.equal(link3.attrs.href, '/embed/nmem/app/assets/chunk.css');

  const linkIdempotent = new MockHTMLLinkElement();
  linkIdempotent.href = '/embed/nmem/app/assets/already.css';
  assert.equal(linkIdempotent.href, '/embed/nmem/app/assets/already.css');

  const linkExternal = new MockHTMLLinkElement();
  linkExternal.href = 'https://fonts.googleapis.com/css2?family=Inter';
  assert.equal(linkExternal.href, 'https://fonts.googleapis.com/css2?family=Inter');

  const script1 = new MockHTMLScriptElement();
  script1.src = '/app/assets/lazy-chunk.js';
  assert.equal(script1.src, '/embed/nmem/app/assets/lazy-chunk.js');

  const script2 = new MockHTMLScriptElement();
  script2.setAttribute('src', 'http://ops.example.com:4320/app/assets/worker.js');
  assert.equal(script2.attrs.src, 'http://ops.example.com:4320/embed/nmem/app/assets/worker.js');

  const img1 = new MockHTMLImageElement();
  img1.src = '/studio/ov-logo.png';
  assert.equal(img1.src, '/embed/nmem/studio/ov-logo.png');

  const img2 = new MockHTMLImageElement();
  img2.setAttribute('src', '/studio/banner.png');
  assert.equal(img2.attrs.src, '/embed/nmem/studio/banner.png');

  const fetchUrlRes = await sandbox.fetch(new URL('/api/auth/session', 'http://ops.example.com:4320'));
  assert.equal(fetchUrlRes.url, 'http://ops.example.com:4320/embed/nmem/api/auth/session');

  const fetchExternalUrlRes = await sandbox.fetch(new URL('https://example.com/status'));
  assert.equal(String(fetchExternalUrlRes.url), 'https://example.com/status');

  const rewrittenCss = rewriteEmbeddedCss(
    '@font-face{src:url(/assets/inter.woff2) format("woff2"),url(\'/studio/noto.woff2\'),url("http://127.0.0.1:3773/assets/mono.woff2"),url(data:font/woff2;base64,AAA),url(https://fonts.gstatic.com/a.woff2),url(/embed/t3code/assets/done.woff2);}',
    '/embed/t3code/',
    'http://127.0.0.1:3773',
  );
  assert.ok(rewrittenCss.includes('url(/embed/t3code/assets/inter.woff2)'));
  assert.ok(rewrittenCss.includes("url('/embed/t3code/studio/noto.woff2')"));
  assert.ok(rewrittenCss.includes('url("http://127.0.0.1:3773/assets/mono.woff2")') === false);
  assert.ok(rewrittenCss.includes('url("/embed/t3code/assets/mono.woff2")'));
  assert.ok(rewrittenCss.includes('url(data:font/woff2;base64,AAA)'));
  assert.ok(rewrittenCss.includes('url(https://fonts.gstatic.com/a.woff2)'));
  assert.ok(rewrittenCss.includes('url(/embed/t3code/assets/done.woff2)'));
});

test('Embed proxy rewrites strict Origin/Referer, strips conflicting CORS headers, and avoids 429 on Vite chunk bursts', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-console-embed-vite-'));
  const upstream = await startStrictOriginViteUpstream();
  let app = null;

  try {
    const config = loadConfig({
      rawConfig: {
        console: {
          host: '127.0.0.1',
          port: 4320,
          dataDir: path.join(tmpDir, 'data'),
          readOnly: false,
        },
        security: {
          rateLimitPerMinute: 30,
          mutatingRateLimitPerMinute: 10,
        },
        services: [
          {
            id: 'nmem-mock',
            name: 'Nowledge Mem Mock',
            unit: 'nmem-mock.service',
            scope: 'system',
            adminUrl: `${upstream.origin}/app`,
          },
        ],
        connectors: {
          systemd: { enabled: false },
          tailscale: { enabled: false },
          cloudflare: { enabled: false },
          magpie: { enabled: false },
          mihomo: { enabled: false },
          syncthing: { enabled: false },
          memory: { enabled: false },
        },
        fleet: { nodes: [] },
      },
      env: {},
    });
    config.console.port = 0;

    app = createOpsConsole({ config });
    await app.start();
    const baseUrl = `http://127.0.0.1:${app.servers[0].address().port}`;
    const browserOrigin = baseUrl;

    const entryRes = await fetch(`${baseUrl}/embed/nmem-mock/`, {
      headers: {
        Origin: browserOrigin,
        Referer: `${baseUrl}/`,
        Cookie: `${SESSION_COOKIE_NAME}=secret-session; nmem_pref=dark`,
      },
    });
    assert.equal(entryRes.status, 200);
    assert.equal(entryRes.headers.get('access-control-allow-origin'), null);
    assert.equal(entryRes.headers.get('access-control-allow-credentials'), null);
    const entryHtml = await entryRes.text();
    assert.ok(entryHtml.includes('/embed/nmem-mock/app/assets/index-web.js'));
    assert.ok(entryHtml.includes('data-ops-embed-shim="1"'));

    const jsRes = await fetch(`${baseUrl}/embed/nmem-mock/app/assets/index-web.js`, {
      headers: {
        Origin: browserOrigin,
        Referer: `${baseUrl}/embed/nmem-mock/app/`,
        Cookie: `${SESSION_COOKIE_NAME}=secret-session; nmem_pref=dark`,
      },
    });
    assert.equal(jsRes.status, 200);
    assert.equal(jsRes.headers.get('access-control-allow-origin'), null);
    assert.equal(jsRes.headers.get('access-control-allow-credentials'), null);

    const cssRes = await fetch(`${baseUrl}/embed/nmem-mock/app/assets/globals.css`, {
      headers: {
        Origin: browserOrigin,
        Referer: `${baseUrl}/embed/nmem-mock/app/`,
      },
    });
    assert.equal(cssRes.status, 200);

    const apiRes = await fetch(`${baseUrl}/embed/nmem-mock/health`, {
      headers: {
        Origin: browserOrigin,
        Referer: `${baseUrl}/embed/nmem-mock/app/`,
      },
    });
    assert.equal(apiRes.status, 200);
    assert.deepEqual(await apiRes.json(), { status: 'ok' });

    const jsSeen = upstream.seenRequests.find((item) => item.url === '/app/assets/index-web.js');
    assert.ok(jsSeen);
    assert.equal(jsSeen.origin, upstream.origin);
    assert.equal(jsSeen.referer, `${upstream.origin}/app/`);
    assert.equal(jsSeen.cookie?.includes(SESSION_COOKIE_NAME), false);
    assert.equal(jsSeen.cookie?.includes('nmem_pref=dark'), true);

    // Burst 80 Vite module chunks (> generalLimiter=30/min) and ensure zero 429
    const chunkResults = await Promise.all(
      Array.from({ length: 80 }, (_, idx) =>
        fetch(`${baseUrl}/embed/nmem-mock/app/assets/chunk-${idx}.js`, {
          headers: { Origin: browserOrigin },
        }).then((r) => r.status),
      ),
    );
    assert.ok(
      chunkResults.every((status) => status === 200),
      `expected all 80 Vite chunks to return 200, got statuses: ${[...new Set(chunkResults)].join(',')}`,
    );

    // Confirm /api/* still enforces its own 30/min generalLimiter unaffected by /embed/*
    const apiMetaStatuses = [];
    for (let idx = 0; idx < 31; idx += 1) {
      const res = await fetch(`${baseUrl}/api/meta`);
      apiMetaStatuses.push(res.status);
    }
    assert.equal(apiMetaStatuses[0], 200);
    assert.equal(apiMetaStatuses[29], 200);
    assert.equal(apiMetaStatuses[30], 429);
  } finally {
    if (app) await app.stop();
    await upstream.close();
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
