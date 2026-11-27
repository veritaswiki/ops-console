import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import { StructuredLogger } from '../src/logger.mjs';
import { LogService, readFileTailBounded } from '../src/logs.mjs';
import { createOpsConsole } from '../src/server.mjs';

test('readFileTailBounded reads only bounded tail bytes from large files without full read', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-logs-tail-'));
  const largePath = path.join(tempDir, 'huge-service.log');
  try {
    const lineChunk = '2026-11-27T01:00:00.000Z [INFO] filler-payload-line-0123456789abcdefghijklmnopqrstuvwxyz\n';
    const repeatCount = Math.ceil((2 * 1024 * 1024) / lineChunk.length);
    const handle = await fs.open(largePath, 'w');
    try {
      const block = lineChunk.repeat(500);
      let written = 0;
      while (written < repeatCount) {
        const batch = Math.min(500, repeatCount - written);
        await handle.write(batch === 500 ? block : lineChunk.repeat(batch));
        written += batch;
      }
      await handle.write('2026-11-27T02:00:01.000Z [WARN] tail-sentinel-alpha\n');
      await handle.write('2026-11-27T02:00:02.000Z [ERROR] tail-sentinel-omega\n');
    } finally {
      await handle.close();
    }

    const tail = await readFileTailBounded(largePath, 32 * 1024);
    assert.ok(tail.fileSizeBytes >= 1_900_000, `expected >=1.9MB file, got ${tail.fileSizeBytes}`);
    assert.ok(tail.readBytes <= 32 * 1024, `expected readBytes <= 32KB, got ${tail.readBytes}`);
    assert.equal(tail.truncated, true);
    assert.ok(tail.text.includes('tail-sentinel-alpha'));
    assert.ok(tail.text.includes('tail-sentinel-omega'));
    assert.ok(!tail.text.startsWith('filler-payload-line'), 'first partial line should be trimmed');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('LogService unified direct-read merges files, self, and audit with filters, redaction, and allowlist enforcement', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-logs-unified-'));
  const alphaLog = path.join(tempDir, 'alpha.log');
  const betaLog = path.join(tempDir, 'beta.log');
  const auditFile = path.join(tempDir, 'audit.jsonl');

  try {
    const now = Date.now();
    const tsOld = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    const ts1 = new Date(now - 20 * 60 * 1000).toISOString();
    const ts2 = new Date(now - 15 * 60 * 1000).toISOString();
    const ts3 = new Date(now - 10 * 60 * 1000).toISOString();
    const ts4 = new Date(now - 5 * 60 * 1000).toISOString();
    const syntheticSecret = ['sk', 'demo', '0123456789abcdef012345'].join('-');

    await fs.writeFile(
      alphaLog,
      [
        `${tsOld} [ERROR] stale-entry-outside-window`,
        `${ts1} [INFO] alpha startup complete`,
        `${ts3} [ERROR] alpha request timeout-408 token=${syntheticSecret}`,
      ].join('\n') + '\n',
      'utf8',
    );
    await fs.writeFile(
      betaLog,
      `${ts2} [WARN] beta slow upstream timeout-504\n`,
      'utf8',
    );
    await fs.writeFile(
      auditFile,
      `${JSON.stringify({ ts: ts4, category: 'service', action: 'restart', target: 'alpha', ok: true, output: 'restarted' })}\n`,
      'utf8',
    );

    const logger = new StructuredLogger({ dataDir: tempDir, silentStdout: true });
    logger.warn('self-monitor', { detail: 'self-diagnostic-check' });
    await logger.flush();

    const config = loadConfig({
      cli: { hosts: '127.0.0.1', port: 4320, demo: false },
      env: { OPS_CONSOLE_DATA_DIR: tempDir },
    });
    config.services = [
      {
        id: 'alpha',
        name: 'Alpha Worker',
        unit: 'alpha.service',
        scope: 'user',
        layer: 'apps',
        critical: false,
        logFile: alphaLog,
        actions: ['restart'],
      },
    ];
    config.timers = [];
    config.logFiles = [
      {
        id: 'beta-native',
        name: 'Beta Native Log',
        path: betaLog,
        serviceId: 'beta',
      },
    ];

    const logService = new LogService({ config, logger });
    const sourcesInfo = logService.listSources();
    assert.equal(sourcesInfo.services[0].hasLogFile, true);
    assert.equal(sourcesInfo.services[0].logFileId, 'svc-file:alpha');
    assert.ok(sourcesInfo.files.some((f) => f.id === 'svc-file:alpha'));
    assert.ok(sourcesInfo.files.some((f) => f.id === 'beta-native'));

    const unified = await logService.query({
      source: 'unified',
      targets: ['svc-file:alpha', 'beta-native', 'self', 'audit'],
      since: '1h',
      level: 'all',
      lines: 200,
      maxBytesPerFile: 32 * 1024,
    });
    assert.equal(unified.ok, true);
    assert.equal(unified.stats.directRead, true);
    assert.ok(Array.isArray(unified.sources) && unified.sources.length >= 4);
    assert.ok(!unified.entries.some((entry) => String(entry.message).includes('stale-entry-outside-window')));
    assert.ok(unified.entries.some((entry) => entry.sourceId === 'svc-file:alpha'));
    assert.ok(unified.entries.some((entry) => entry.sourceId === 'beta-native'));
    assert.ok(unified.entries.some((entry) => entry.sourceId === 'audit'));
    assert.ok(unified.entries.some((entry) => entry.sourceId === 'self'));

    // Redaction check
    const alphaErr = unified.entries.find((entry) => String(entry.message).includes('timeout-408'));
    assert.ok(alphaErr);
    assert.ok(!String(alphaErr.message).includes(syntheticSecret));

    // Chronological ordering check
    const parsedTimes = unified.entries.map((entry) => Date.parse(entry.ts)).filter(Number.isFinite);
    for (let idx = 1; idx < parsedTimes.length; idx += 1) {
      assert.ok(parsedTimes[idx] >= parsedTimes[idx - 1], 'unified entries should be chronologically sorted');
    }

    // Regex + level filtering check
    const filtered = await logService.query({
      source: 'unified',
      targets: ['svc-file:alpha', 'beta-native'],
      since: '1h',
      level: 'warn',
      q: '/timeout-\\d{3}/',
      lines: 50,
    });
    assert.equal(filtered.ok, true);
    assert.equal(filtered.entries.length, 2);
    assert.ok(filtered.entries.every((entry) => /timeout-\d{3}/.test(entry.message)));

    // Allowlist & shell-injection rejection
    const badUnified = await logService.query({
      source: 'unified',
      targets: ['$(id);rm -rf /'],
    });
    assert.equal(badUnified.ok, false);
    assert.match(badUnified.error, /not in allowlist/i);

    const badJournal = await logService.query({
      source: 'journald',
      unit: 'evil;cat /etc/passwd',
    });
    assert.equal(badJournal.ok, false);

    const badFile = await logService.query({
      source: 'file',
      file: '../../etc/passwd',
    });
    assert.equal(badFile.ok, false);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('HTTP /api/logs/unified and SSE /api/logs/stream?source=unified work and release streams on disconnect', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-logs-http-'));
  const config = loadConfig({
    cli: { hosts: '127.0.0.1', port: 4320, demo: true },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  const app = createOpsConsole({ config, silentStdout: true });
  const { addresses } = await app.start();
  const baseUrl = addresses[0].url;

  try {
    const srcRes = await fetch(`${baseUrl}/api/logs/sources`);
    assert.equal(srcRes.status, 200);
    const srcJson = await srcRes.json();
    assert.equal(srcJson.ok, true);
    assert.ok(Array.isArray(srcJson.services));
    assert.ok(srcJson.limits?.maxBytesPerFile >= 65536);

    const unifiedRes = await fetch(`${baseUrl}/api/logs/unified?targets=all&level=all&since=1h&lines=50`);
    assert.equal(unifiedRes.status, 200);
    const unifiedJson = await unifiedRes.json();
    assert.equal(unifiedJson.ok, true);
    assert.equal(unifiedJson.source, 'unified');
    assert.equal(unifiedJson.stats?.directRead, true);
    assert.ok(Array.isArray(unifiedJson.entries) && unifiedJson.entries.length > 0);

    // Connect to unified SSE stream, receive initial ready event, then abort cleanly
    await new Promise((resolve, reject) => {
      const req = http.get(`${baseUrl}/api/logs/stream?source=unified&targets=all&level=all`, (res) => {
        assert.equal(res.statusCode, 200);
        assert.match(String(res.headers['content-type'] || ''), /text\/event-stream/);
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
          if (buffer.includes('event: ready')) {
            req.destroy();
            resolve();
          }
        });
      });
      req.on('error', (err) => {
        if (err && err.code === 'ECONNRESET') {
          resolve();
          return;
        }
        reject(err);
      });
    });

    // Give server a brief moment to process close event and verify zero leaked streams
    await new Promise((resolve) => setTimeout(resolve, 120));
    const afterRes = await fetch(`${baseUrl}/api/logs/sources`);
    const afterJson = await afterRes.json();
    assert.equal(afterJson.activeSseStreams, 0);
  } finally {
    await app.stop();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
