import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig } from '../src/config.mjs';
import { ControlPlaneEventBus } from '../src/events.mjs';
import { StructuredLogger } from '../src/logger.mjs';
import { PluginManager } from '../src/plugins/manager.mjs';
import { definePlugin, validateHttpUrl, validateModuleSubpath } from '../src/plugins/sdk.mjs';
import { createOpsConsole } from '../src/server.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..');
const SDK_URL = pathToFileURL(path.join(REPO_ROOT, 'src', 'plugins', 'sdk.mjs')).href;

let recorderSeq = 0;

async function mkTmpDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function createRecorder(label) {
  recorderSeq += 1;
  const key = `__opsHotplug_${process.pid}_${Date.now()}_${recorderSeq}_${label}`;
  globalThis[key] = { loads: [], init: [], dispose: [], events: [], routeHits: [] };
  return {
    key,
    get data() {
      return globalThis[key];
    },
    cleanup() {
      delete globalThis[key];
    },
  };
}

function buildExternalModuleSource({ id, version, tag, recorderKey }) {
  return `import { definePlugin } from ${JSON.stringify(SDK_URL)};

const recorder = (globalThis[${JSON.stringify(recorderKey)}] ||= {
  loads: [],
  init: [],
  dispose: [],
  events: [],
  routeHits: [],
});

recorder.loads.push(${JSON.stringify(tag)});

export default definePlugin({
  id: ${JSON.stringify(id)},
  name: ${JSON.stringify(`Hotplug Fixture ${tag}`)},
  version: ${JSON.stringify(version)},
  category: 'custom',
  description: ${JSON.stringify(`External modular hot-reload fixture ${tag}`)},
  capabilities: ['health'],
  defaultConfig: { enabled: true },
  configSchema: [],
  routes: [
    {
      method: 'GET',
      path: '/status/:item',
      description: ${JSON.stringify(`Read status for ${tag}`)},
      handler: async (ctx) => {
        recorder.routeHits.push({
          tag: ${JSON.stringify(tag)},
          method: ctx.method,
          path: ctx.path,
          item: ctx.params.item,
          actor: ctx.actor,
        });
        return {
          ok: true,
          tag: ${JSON.stringify(tag)},
          version: ${JSON.stringify(version)},
          item: ctx.params.item,
          page: ctx.query.page ?? null,
          secret: ctx.query.token ?? null,
          authHeader: 'Authorization: ' + (ctx.query.authorization ?? ''),
          actor: ctx.actor,
        };
      },
    },
    {
      method: 'POST',
      path: '/action',
      requireConfirm: true,
      description: ${JSON.stringify(`Mutating action for ${tag}`)},
      handler: async (ctx) => {
        recorder.routeHits.push({
          tag: ${JSON.stringify(tag)},
          method: ctx.method,
          path: ctx.path,
          action: ctx.body.action ?? null,
        });
        return {
          ok: true,
          tag: ${JSON.stringify(tag)},
          version: ${JSON.stringify(version)},
          action: ctx.body.action ?? null,
          applied: true,
        };
      },
    },
  ],
  subscriptions: [
    {
      type: 'hotplug_ping',
      handler: (evt) => {
        recorder.events.push({ tag: ${JSON.stringify(tag)}, id: evt.id, value: evt.payload.value ?? null });
      },
    },
  ],
  async init(ctx) {
    recorder.init.push({ tag: ${JSON.stringify(tag)}, pluginId: ctx.pluginId, hasEventBus: Boolean(ctx.eventBus) });
  },
  async dispose(ctx) {
    recorder.dispose.push({ tag: ${JSON.stringify(tag)}, reason: ctx.reason, pluginId: ctx.pluginId });
  },
  async collect() {
    return {
      id: ${JSON.stringify(id)},
      name: ${JSON.stringify(`Hotplug Fixture ${tag}`)},
      enabled: true,
      reachable: true,
      status: 'healthy',
      latencyMs: 3,
    };
  },
});
`;
}

async function writeFixturePlugin(pluginDir, { id, version, tag, recorderKey }) {
  await fs.mkdir(pluginDir, { recursive: true });
  await fs.writeFile(
    path.join(pluginDir, 'index.mjs'),
    buildExternalModuleSource({ id, version, tag, recorderKey }),
    'utf8',
  );
}

function buildPluginConfig({ dataDir, pluginsDir, readOnly = false }) {
  const config = loadConfig({
    rawConfig: {
      console: { dataDir },
      plugins: { dir: pluginsDir },
      updates: { enabled: false },
      security: {
        requireCriticalConfirm: true,
        mutatingRateLimitPerMinute: 600,
        rateLimitPerMinute: 1200,
      },
    },
    cli: { demo: true, hotReload: false, hosts: '127.0.0.1', webKey: '', readOnly },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  return config;
}

async function requestJson(baseUrl, pathname, { method = 'GET', body, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json };
}

test('validateModuleSubpath and definePlugin enforce the modular route/lifecycle contract', () => {
  for (const good of ['/', '/status', '/status/:item', '/a/b-c_d:e', '/status/']) {
    assert.equal(validateModuleSubpath(good).ok, true, `expected ${JSON.stringify(good)} to be valid`);
  }
  assert.equal(validateModuleSubpath('/').value, '/');
  assert.equal(validateModuleSubpath('/status/').value, '/status');
  assert.equal(validateModuleSubpath('/status/:item').value, '/status/:item');

  for (const bad of [
    '',
    '   ',
    'status',
    '..',
    '/..',
    '/a/../b',
    '//evil',
    '/a//b',
    '/a b',
    '/a?b=1',
    '/a#frag',
    '/a\\b',
    'javascript:alert(1)',
  ]) {
    assert.equal(validateModuleSubpath(bad).ok, false, `expected ${JSON.stringify(bad)} to be rejected`);
  }

  const baseSpec = () => ({
    id: 'contract-demo',
    name: 'Contract Demo',
    category: 'custom',
    collect: async () => ({ reachable: true }),
  });

  assert.throws(
    () => definePlugin({ ...baseSpec(), routes: [{ method: 'TRACE', path: '/trace', handler: () => ({}) }] }),
    /unsupported method: TRACE/,
  );
  assert.throws(
    () => definePlugin({ ...baseSpec(), routes: [{ method: 'GET', path: '', handler: () => ({}) }] }),
    /must not be empty/,
  );
  assert.throws(
    () => definePlugin({ ...baseSpec(), routes: [{ method: 'GET', path: '/../escape', handler: () => ({}) }] }),
    /Invalid module route path/,
  );
  assert.throws(
    () => definePlugin({ ...baseSpec(), routes: [{ method: 'GET', path: '/ok' }] }),
    /requires a handler function/,
  );
  assert.throws(
    () => definePlugin({ ...baseSpec(), routes: ['not-an-object'] }),
    /route entry must be an object/,
  );
  assert.throws(
    () => definePlugin({ ...baseSpec(), subscriptions: [{ type: 'no-handler' }] }),
    /subscription requires a handler function/,
  );
  assert.throws(
    () => definePlugin({ ...baseSpec(), subscriptions: ['not-an-object'] }),
    /subscription requires a handler function/,
  );

  const longDescription = 'd'.repeat(300);
  const plugin = definePlugin({
    ...baseSpec(),
    defaultConfig: { enabled: true },
    routes: [
      { method: 'get', path: '/status/:item/', description: longDescription, handler: async () => ({ ok: true }) },
      { method: 'POST', path: '/action', requireConfirm: true, handler: async () => ({ ok: true }) },
      { method: 'DELETE', path: '/action', readOnly: true, handler: async () => ({ ok: true }) },
    ],
    subscriptions: [
      { type: 'alpha', handler: () => {} },
      { type: ['beta', 'gamma'], handler: () => {} },
      { handler: () => {} },
    ],
    init: async () => {},
    dispose: async () => {},
    onEvent: () => {},
  });

  assert.equal(plugin.routes.length, 3);
  assert.equal(plugin.routes[0].method, 'GET');
  assert.equal(plugin.routes[0].path, '/status/:item');
  assert.equal(plugin.routes[0].readOnly, true);
  assert.equal(plugin.routes[0].requireConfirm, false);
  assert.equal(plugin.routes[0].description.length, 160);
  assert.equal(plugin.routes[1].readOnly, false);
  assert.equal(plugin.routes[1].requireConfirm, true);
  assert.equal(plugin.routes[2].readOnly, true);
  assert.ok(Object.isFrozen(plugin.routes));
  assert.ok(Object.isFrozen(plugin.routes[0]));

  assert.equal(plugin.subscriptions.length, 4);
  assert.deepEqual(plugin.subscriptions[0].type, ['alpha']);
  assert.deepEqual(plugin.subscriptions[1].type, ['beta', 'gamma']);
  assert.equal(plugin.subscriptions[2].type, '*');
  assert.equal(plugin.subscriptions[3].type, '*');
  assert.ok(plugin.capabilities.includes('routes'));
  assert.ok(plugin.capabilities.includes('events'));
  assert.equal(typeof plugin.init, 'function');
  assert.equal(typeof plugin.dispose, 'function');
  assert.equal(plugin.defaultConfig.enabled, true);

  const bare = definePlugin(baseSpec());
  assert.equal(bare.init, null);
  assert.equal(bare.dispose, null);
  assert.equal(bare.routes.length, 0);
  assert.equal(bare.subscriptions.length, 0);
  assert.equal(bare.capabilities.includes('routes'), false);
  assert.equal(bare.capabilities.includes('events'), false);

  assert.equal(validateHttpUrl('https://api.example.com/v1/').ok, true);
  assert.equal(validateHttpUrl('https://api.example.com/v1/').value, 'https://api.example.com/v1');
  assert.equal(validateHttpUrl('http://127.0.0.1:8080').ok, true);
  const alibabaMetadataHost = [100, 100, 100, 200].join('.');
  for (const blocked of [
    'http://169.254.169.254/latest/meta-data',
    'http://169.254.1.1',
    'http://metadata.google.internal/',
    'http://metadata.goog/',
    `http://${alibabaMetadataHost}/latest/meta-data`,
    'file:///etc/passwd',
    'javascript:alert(1)',
    'ftp://api.example.com',
  ]) {
    assert.equal(validateHttpUrl(blocked).ok, false, `expected ${blocked} to be blocked`);
  }
});

test('ControlPlaneEventBus.subscribe filters types, isolates throwing/rejecting subscribers, and unsubscribes cleanly', () => {
  const bus = new ControlPlaneEventBus();
  const filtered = [];
  const star = [];
  const defaulted = [];

  const unsubscribeFiltered = bus.subscribe(['alpha', 'beta'], (evt) => {
    filtered.push({ type: evt.type, value: evt.payload.value, id: evt.id });
  });
  bus.subscribe('*', (evt) => star.push(evt.type));
  bus.subscribe(undefined, (evt) => defaulted.push(evt.type));
  bus.subscribe('boom', () => {
    throw new Error('synchronous subscriber failure');
  });
  bus.subscribe('boom', () => Promise.reject(new Error('asynchronous subscriber failure')));
  const healthy = [];
  bus.subscribe('boom', (evt) => healthy.push(evt.id));

  let firstEvent;
  assert.doesNotThrow(() => {
    firstEvent = bus.emit('alpha', { value: 1 });
  });
  assert.doesNotThrow(() => bus.emit('gamma', { value: 2 }));
  assert.doesNotThrow(() => bus.emit('boom', { value: 3 }));

  assert.deepEqual(filtered.map((item) => item.type), ['alpha']);
  assert.equal(filtered[0].value, 1);
  assert.equal(typeof filtered[0].id, 'number');
  assert.equal(firstEvent.type, 'alpha');
  assert.equal(firstEvent.payload.value, 1);
  assert.match(firstEvent.ts, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(star, ['alpha', 'gamma', 'boom']);
  assert.deepEqual(defaulted, ['alpha', 'gamma', 'boom']);
  assert.equal(healthy.length, 1);

  unsubscribeFiltered();
  unsubscribeFiltered();
  bus.emit('alpha', { value: 4 });
  assert.equal(filtered.length, 1);
  assert.deepEqual(star, ['alpha', 'gamma', 'boom', 'alpha']);

  bus.emit('beta', { value: 5 });
  assert.equal(filtered.length, 1);
  assert.equal(star.at(-1), 'beta');

  assert.throws(() => bus.subscribe('alpha', 'not-a-function'), /requires a listener function/);
});

test('external plugin hot reload disposes v1, drops its subscription, and activates v2 routes', async () => {
  const tmp = await mkTmpDir('ops-plugin-hotplug-reload-');
  const pluginsDir = path.join(tmp, 'plugins');
  const dataDir = path.join(tmp, 'data');
  const pluginDir = path.join(pluginsDir, 'hotplug-demo');
  const recorder = createRecorder('reload');

  const config = loadConfig({
    rawConfig: { console: { dataDir }, plugins: { dir: pluginsDir } },
    cli: { demo: true, hotReload: false },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  const logger = new StructuredLogger({ dataDir, silentStdout: true });
  const eventBus = new ControlPlaneEventBus();
  const pluginManager = new PluginManager({ config, logger, eventBus, pluginsDir });

  try {
    await writeFixturePlugin(pluginDir, {
      id: 'hotplug-demo',
      version: '1.0.0',
      tag: 'v1',
      recorderKey: recorder.key,
    });

    const firstLoad = await pluginManager.reloadExternalPlugins();
    assert.deepEqual(firstLoad.errors, []);
    assert.ok(firstLoad.added.includes('hotplug-demo'));
    assert.equal(pluginManager.getPlugin('hotplug-demo')?.version, '1.0.0');

    const v1Status = await pluginManager.dispatchModuleRoute('hotplug-demo', 'GET', '/status/alpha', {
      query: { page: '1' },
      actor: 'test',
    });
    assert.equal(v1Status.statusCode, 200);
    assert.equal(v1Status.body.ok, true);
    assert.equal(v1Status.body.tag, 'v1');
    assert.equal(v1Status.body.item, 'alpha');
    assert.equal(v1Status.body.page, '1');
    assert.equal(v1Status.body.actor, 'test');

    eventBus.emit('hotplug_ping', { value: 'first' });
    assert.deepEqual(recorder.data.events.map((item) => item.tag), ['v1']);
    assert.equal(recorder.data.events[0].value, 'first');
    assert.deepEqual(recorder.data.init.map((item) => item.tag), ['v1']);

    await writeFixturePlugin(pluginDir, {
      id: 'hotplug-demo',
      version: '2.0.0',
      tag: 'v2',
      recorderKey: recorder.key,
    });
    const secondLoad = await pluginManager.reloadExternalPlugins();
    assert.deepEqual(secondLoad.errors, []);
    assert.ok(secondLoad.updated.includes('hotplug-demo'));
    assert.ok(!secondLoad.added.includes('hotplug-demo'));
    assert.equal(pluginManager.getPlugin('hotplug-demo')?.version, '2.0.0');

    const v1Disposes = recorder.data.dispose.filter((item) => item.tag === 'v1');
    assert.equal(v1Disposes.length, 1, 'v1 dispose() must run exactly once on reload');
    assert.equal(v1Disposes[0].reason, 'reactivate');
    assert.equal(v1Disposes[0].pluginId, 'hotplug-demo');

    eventBus.emit('hotplug_ping', { value: 'second' });
    assert.equal(
      recorder.data.events.filter((item) => item.tag === 'v1').length,
      1,
      'v1 subscription must be removed after reload',
    );
    assert.equal(
      recorder.data.events.filter((item) => item.tag === 'v2').length,
      1,
      'v2 subscription must fire exactly once (no duplicate listeners)',
    );
    assert.deepEqual(recorder.data.events.map((item) => item.tag), ['v1', 'v2']);

    const v2Status = await pluginManager.dispatchModuleRoute('hotplug-demo', 'GET', '/status/beta', {
      query: { page: '2' },
      actor: 'test',
    });
    assert.equal(v2Status.statusCode, 200);
    assert.equal(v2Status.body.tag, 'v2');
    assert.equal(v2Status.body.version, '2.0.0');
    assert.equal(v2Status.body.item, 'beta');
    assert.equal(recorder.data.init.filter((item) => item.tag === 'v2').length, 1);

    await fs.rm(pluginDir, { recursive: true, force: true });
    const thirdLoad = await pluginManager.reloadExternalPlugins();
    assert.deepEqual(thirdLoad.errors, []);
    assert.ok(thirdLoad.removed.includes('hotplug-demo'));
    assert.equal(pluginManager.getPlugin('hotplug-demo'), null);
    assert.equal(pluginManager.matchModuleRoute('hotplug-demo', 'GET', '/status/beta'), null);

    const v2Disposes = recorder.data.dispose.filter((item) => item.tag === 'v2' && item.reason === 'removed');
    assert.equal(v2Disposes.length, 1, 'v2 dispose() must run when the plugin directory is deleted');

    const gone = await pluginManager.dispatchModuleRoute('hotplug-demo', 'GET', '/status/beta', {});
    assert.equal(gone.statusCode, 404);

    eventBus.emit('hotplug_ping', { value: 'third' });
    assert.deepEqual(recorder.data.events.map((item) => item.tag), ['v1', 'v2']);
  } finally {
    await pluginManager.disposeAll('shutdown');
    recorder.cleanup();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('HTTP /api/modules exposes status with redaction, one-time confirm tokens, and dispose on stop', async () => {
  const tmp = await mkTmpDir('ops-plugin-hotplug-http-');
  const pluginsDir = path.join(tmp, 'plugins');
  const pluginDir = path.join(pluginsDir, 'hotplug-demo');
  const dataDir = path.join(tmp, 'data');
  const repoDir = path.join(tmp, 'repo');
  const recorder = createRecorder('http');
  await fs.mkdir(repoDir, { recursive: true });

  const syntheticApiKey = 'sk-' + 'live_' + '1234567890abcdef1234567890';
  const syntheticBearer = 'Bearer ' + 'tok_' + '{{SECRET_3xk2m9qr}}';

  await writeFixturePlugin(pluginDir, {
    id: 'hotplug-demo',
    version: '1.0.0',
    tag: 'http-v1',
    recorderKey: recorder.key,
  });

  const app = createOpsConsole({
    config: buildPluginConfig({ dataDir, pluginsDir }),
    repoDir,
    silentStdout: true,
  });

  let started = false;
  try {
    const { addresses } = await app.start();
    started = true;
    const baseUrl = addresses[0].url;

    const list = await requestJson(baseUrl, '/api/modules');
    assert.equal(list.status, 200);
    assert.equal(list.body.ok, true);
    assert.ok(Array.isArray(list.body.agentModules));
    const moduleEntry = list.body.pluginModules.find((item) => item.id === 'hotplug-demo');
    assert.ok(moduleEntry, 'GET /api/modules must list the external plugin module');
    assert.equal(moduleEntry.version, '1.0.0');
    assert.equal(moduleEntry.hasDispose, true);
    assert.equal(moduleEntry.subscriptionsCount, 1);
    assert.ok(moduleEntry.routes.some((route) => route.method === 'GET' && route.subPath === '/status/:item' && route.readOnly));
    assert.ok(moduleEntry.routes.some((route) => route.method === 'POST' && route.subPath === '/action' && route.requireConfirm));

    const status = await requestJson(
      baseUrl,
      `/api/modules/hotplug-demo/status/${encodeURIComponent('alpha node')}`
        + `?page=7&token=${encodeURIComponent(syntheticApiKey)}&authorization=${encodeURIComponent(syntheticBearer)}`,
    );
    assert.equal(status.status, 200);
    assert.equal(status.body.ok, true);
    assert.equal(status.body.tag, 'http-v1');
    assert.equal(status.body.item, 'alpha node');
    assert.equal(status.body.page, '7');
    assert.equal(status.body.actor, 'web');
    const serialized = JSON.stringify(status.body);
    assert.equal(serialized.includes(syntheticApiKey), false, 'API key must not leak through module responses');
    assert.equal(serialized.includes('tok_' + '{{SECRET_3xk2m9qr}}'), false, 'Bearer token must not leak through module responses');
    assert.match(status.body.secret, /REDACTED/);
    assert.match(status.body.authHeader, /REDACTED/);

    const missingRoute = await requestJson(baseUrl, '/api/modules/hotplug-demo/does-not-exist');
    assert.equal(missingRoute.status, 404);

    const unconfirmed = await requestJson(baseUrl, '/api/modules/hotplug-demo/action', {
      method: 'POST',
      body: { action: 'restart' },
    });
    assert.equal(unconfirmed.status, 409);
    assert.equal(unconfirmed.body.confirmRequired, true);

    const issued = await requestJson(baseUrl, '/api/modules/hotplug-demo/confirm-token', {
      method: 'POST',
      body: { method: 'POST', path: '/action' },
    });
    assert.equal(issued.status, 200);
    assert.ok(issued.body.confirmToken);
    assert.equal(issued.body.pluginId, 'hotplug-demo');
    assert.equal(issued.body.method, 'POST');
    assert.equal(issued.body.path, '/action');
    assert.equal(issued.body.expiresInSec, 60);

    const applied = await requestJson(baseUrl, '/api/modules/hotplug-demo/action', {
      method: 'POST',
      body: { action: 'restart' },
      headers: { 'x-confirm-token': issued.body.confirmToken },
    });
    assert.equal(applied.status, 200);
    assert.equal(applied.body.ok, true);
    assert.equal(applied.body.action, 'restart');
    assert.equal(applied.body.tag, 'http-v1');

    const replay = await requestJson(baseUrl, '/api/modules/hotplug-demo/action', {
      method: 'POST',
      body: { action: 'restart' },
      headers: { 'x-confirm-token': issued.body.confirmToken },
    });
    assert.equal(replay.status, 409);
    assert.equal(replay.body.confirmRequired, true);

    const issuedAgain = await requestJson(baseUrl, '/api/modules/hotplug-demo/confirm-token', {
      method: 'POST',
      body: { method: 'POST', path: '/action' },
    });
    assert.equal(issuedAgain.status, 200);
    const appliedViaBody = await requestJson(baseUrl, '/api/modules/hotplug-demo/action', {
      method: 'POST',
      body: { action: 'reload', confirmToken: issuedAgain.body.confirmToken },
    });
    assert.equal(appliedViaBody.status, 200);
    assert.equal(appliedViaBody.body.action, 'reload');

    await app.stop();
    started = false;
    assert.ok(
      recorder.data.dispose.some((item) => item.tag === 'http-v1' && item.reason === 'shutdown'),
      'app.stop() must call plugin dispose() with reason "shutdown"',
    );
  } finally {
    if (started) await app.stop();
    recorder.cleanup();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('readOnly console returns 403 for mutating /api/modules routes and confirm-token while GET stays 200', async () => {
  const tmp = await mkTmpDir('ops-plugin-hotplug-readonly-');
  const pluginsDir = path.join(tmp, 'plugins');
  const pluginDir = path.join(pluginsDir, 'hotplug-demo');
  const dataDir = path.join(tmp, 'data');
  const repoDir = path.join(tmp, 'repo');
  const recorder = createRecorder('readonly');
  await fs.mkdir(repoDir, { recursive: true });

  await writeFixturePlugin(pluginDir, {
    id: 'hotplug-demo',
    version: '1.0.0',
    tag: 'ro-v1',
    recorderKey: recorder.key,
  });

  const app = createOpsConsole({
    config: buildPluginConfig({ dataDir, pluginsDir, readOnly: true }),
    repoDir,
    silentStdout: true,
  });

  let started = false;
  try {
    const { addresses } = await app.start();
    started = true;
    const baseUrl = addresses[0].url;

    const list = await requestJson(baseUrl, '/api/modules');
    assert.equal(list.status, 200);
    assert.ok(list.body.pluginModules.some((item) => item.id === 'hotplug-demo'));

    const status = await requestJson(baseUrl, '/api/modules/hotplug-demo/status/alpha');
    assert.equal(status.status, 200);
    assert.equal(status.body.ok, true);
    assert.equal(status.body.item, 'alpha');

    const blockedAction = await requestJson(baseUrl, '/api/modules/hotplug-demo/action', {
      method: 'POST',
      body: { action: 'restart' },
    });
    assert.equal(blockedAction.status, 403);
    assert.equal(blockedAction.body.ok, false);

    const blockedToken = await requestJson(baseUrl, '/api/modules/hotplug-demo/confirm-token', {
      method: 'POST',
      body: { method: 'POST', path: '/action' },
    });
    assert.equal(blockedToken.status, 403);
    assert.equal(blockedToken.body.ok, false);

    assert.equal(
      recorder.data.routeHits.filter((hit) => hit.method === 'POST').length,
      0,
      'mutating module handlers must not run in read-only mode',
    );

    await app.stop();
    started = false;
    assert.ok(recorder.data.dispose.some((item) => item.tag === 'ro-v1' && item.reason === 'shutdown'));
  } finally {
    if (started) await app.stop();
    recorder.cleanup();
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
