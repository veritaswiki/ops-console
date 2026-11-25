import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig, PACKAGE_ROOT, parseCliArgs, validateConfig } from '../src/config.mjs';
import {
  buildSessionCookie,
  checkRequestAuth,
  deriveSessionToken,
  parseCookies,
  resolveSafePath,
  safeEqualString,
  SlidingWindowRateLimiter,
  verifySameOrigin,
} from '../src/security.mjs';

test('parseCliArgs parses all supported flags', () => {
  const cli = parseCliArgs([
    '--config', '/tmp/ops.json',
    '--hosts', '127.0.0.1,100.64.0.10',
    '--port=4500',
    '--web-key=super-secret-web-key-1234',
    '--read-only',
    '--demo',
    '--check-config',
  ]);
  assert.equal(cli.configPath, '/tmp/ops.json');
  assert.equal(cli.hosts, '127.0.0.1,100.64.0.10');
  assert.equal(cli.port, 4500);
  assert.equal(cli.webKey, 'super-secret-web-key-1234');
  assert.equal(cli.readOnly, true);
  assert.equal(cli.demo, true);
  assert.equal(cli.checkConfig, true);
});

test('validateConfig rejects invalid port, short webKey, duplicate ids, and shell-injection unit names', () => {
  const bad = validateConfig({
    console: { port: 99999 },
    auth: { webKey: 'short' },
    services: [
      { id: 'dup', unit: 'ok.service', scope: 'user' },
      { id: 'dup', unit: 'bad;rm -rf /.service', scope: 'invalid' },
    ],
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some((e) => e.includes('console.port')));
  assert.ok(bad.errors.some((e) => e.includes('auth.webKey')));
  assert.ok(bad.errors.some((e) => e.includes('Duplicate service id')));
  assert.ok(bad.errors.some((e) => e.includes('Invalid systemd unit')));
  assert.ok(bad.errors.some((e) => e.includes('Invalid scope')));
});

test('loadConfig loads example config and applies CLI/env overrides cleanly', () => {
  const examplePath = path.join(PACKAGE_ROOT, 'ops-console.config.example.json');
  const cfg = loadConfig({
    cli: parseCliArgs(['--config', examplePath, '--port', '4999', '--read-only']),
    env: { OPS_CONSOLE_HOSTS: '127.0.0.1,100.64.0.10' },
  });
  assert.equal(cfg.console.port, 4999);
  assert.equal(cfg.console.readOnly, true);
  assert.deepEqual(cfg.console.hosts, ['127.0.0.1', '100.64.0.10']);
  assert.ok(cfg.services.length > 0);
});

test('security auth helpers handle constant-time checks, cookies, query bootstrap, and bearer', () => {
  const key = 'example-web-key-0123456789';
  assert.equal(safeEqualString(key, key), true);
  assert.equal(safeEqualString(key, `${key}x`), false);
  assert.equal(safeEqualString('', ''), false);

  const token = deriveSessionToken(key);
  const cookieStr = buildSessionCookie(token, true);
  assert.ok(cookieStr.includes('HttpOnly'));
  assert.ok(cookieStr.includes('SameSite=Lax'));
  assert.ok(cookieStr.includes('Secure'));

  const parsed = parseCookies(cookieStr.split(';')[0]);
  assert.equal(parsed.ops_console_session, token);

  const byQuery = checkRequestAuth(
    { headers: {} },
    new URL(`http://127.0.0.1:4320/?k=${encodeURIComponent(key)}`),
    key,
  );
  assert.equal(byQuery.authorized, true);
  assert.equal(byQuery.method, 'query-bootstrap');
  assert.equal(byQuery.setCookieToken, token);

  const byCookie = checkRequestAuth(
    { headers: { cookie: `ops_console_session=${token}` } },
    new URL('http://127.0.0.1:4320/api/snapshot'),
    key,
  );
  assert.equal(byCookie.authorized, true);
  assert.equal(byCookie.method, 'cookie');

  const byBearer = checkRequestAuth(
    { headers: { authorization: `Bearer ${key}` } },
    new URL('http://127.0.0.1:4320/api/snapshot'),
    key,
  );
  assert.equal(byBearer.authorized, true);
  assert.equal(byBearer.method, 'bearer');

  const denied = checkRequestAuth(
    { headers: {} },
    new URL('http://127.0.0.1:4320/api/snapshot'),
    key,
  );
  assert.equal(denied.authorized, false);
});

test('verifySameOrigin enforces same-origin CSRF protection', () => {
  assert.equal(verifySameOrigin({ headers: { host: '127.0.0.1:4320', origin: 'http://127.0.0.1:4320' } }), true);
  assert.equal(verifySameOrigin({ headers: { host: '127.0.0.1:4320', origin: 'https://evil.example' } }), false);
  assert.equal(
    verifySameOrigin({ headers: { host: '127.0.0.1:4320', origin: 'https://ops.example.ts.net' } }, ['https://ops.example.ts.net']),
    true,
  );
  assert.equal(verifySameOrigin({ headers: { host: '127.0.0.1:4320', authorization: 'Bearer abc', origin: 'https://evil.example' } }), true);
});

test('SlidingWindowRateLimiter enforces per-key request quota', () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 60_000, maxRequests: 3 });
  assert.equal(limiter.allow('10.0.0.1').allowed, true);
  assert.equal(limiter.allow('10.0.0.1').allowed, true);
  assert.equal(limiter.allow('10.0.0.1').allowed, true);
  const blocked = limiter.allow('10.0.0.1');
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(limiter.allow('10.0.0.2').allowed, true);
});

test('resolveSafePath blocks path traversal and symlink escapes', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-console-safe-'));
  const pubDir = path.join(tmpRoot, 'public');
  const outsideFile = path.join(tmpRoot, 'secret.txt');
  await fs.mkdir(pubDir);
  await fs.writeFile(path.join(pubDir, 'index.html'), '<h1>ok</h1>');
  await fs.writeFile(outsideFile, 'top-secret');
  await fs.symlink(outsideFile, path.join(pubDir, 'escape.txt'));

  try {
    const okPath = await resolveSafePath(pubDir, 'index.html');
    assert.ok(okPath && okPath.endsWith('index.html'));
    assert.equal(await resolveSafePath(pubDir, '../secret.txt'), null);
    assert.equal(await resolveSafePath(pubDir, 'escape.txt'), null);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});
