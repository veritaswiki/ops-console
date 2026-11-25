import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SingleFlightCache } from '../src/cache.mjs';
import { parseMagpieAgentsText, parseMagpieLibraryText } from '../src/connectors/gateway-magpie.mjs';
import {
  parseOvLocks,
  parseOvModels,
  parseOvQueueTable,
  parseOvJsonOutput,
  parseOvVikingDb,
} from '../src/connectors/memory-openviking.mjs';
import { parseTailscaleServeJson, parseTailscaleServeText } from '../src/connectors/network-tailscale.mjs';
import { parseSystemctlShowBlocks } from '../src/connectors/systemd.mjs';
import { StructuredLogger } from '../src/logger.mjs';
import { inferLevelFromText, parseJournalJsonLine, priorityToLevel } from '../src/logs.mjs';

test('SingleFlightCache coalesces concurrent loads and returns stale data on error', async () => {
  const cache = new SingleFlightCache();
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 25));
    return { value: calls };
  };
  const [a, b, c] = await Promise.all([
    cache.getOrLoad('k1', 1000, loader),
    cache.getOrLoad('k1', 1000, loader),
    cache.getOrLoad('k1', 1000, loader),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(a, { value: 1 });
  assert.deepEqual(b, { value: 1 });
  assert.deepEqual(c, { value: 1 });

  const stale = await cache.getOrLoad(
    'k1',
    1000,
    async () => {
      throw new Error('upstream down');
    },
    { force: true, staleOnError: true },
  );
  assert.deepEqual(stale, { value: 1 });
});

test('StructuredLogger persists JSONL, rotates files, emits events, and reads audit trail', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-console-log-'));
  try {
    const logger = new StructuredLogger({
      dataDir: tmpDir,
      level: 'info',
      maxBytes: 256,
      maxFiles: 3,
      ringLimit: 5,
      silentStdout: true,
    });
    const emitted = [];
    logger.on('log', (entry) => emitted.push(entry));

    for (let i = 0; i < 8; i += 1) {
      logger.info(`event-${i}`, { seq: i, padding: 'x'.repeat(40) });
    }
    await logger.appendAudit({
      category: 'service',
      action: 'restart',
      target: 'magpie.service',
      ok: true,
      durationMs: 95,
      actor: 'test',
      output: 'OK',
    });
    await logger.flush();

    assert.equal(logger.getRecent(10).length, 5);
    assert.equal(emitted.length, 9);

    const files = await fs.readdir(tmpDir);
    assert.ok(files.includes('ops-console.jsonl'));
    assert.ok(files.includes('ops-console.jsonl.1'));
    assert.ok(files.includes('audit.jsonl'));

    const audit = await logger.readAudit(10);
    assert.equal(audit.length, 1);
    assert.equal(audit[0].target, 'magpie.service');
    assert.equal(audit[0].ok, true);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('journald log line parser handles string and byte-array MESSAGE payloads', () => {
  const parsed1 = parseJournalJsonLine(JSON.stringify({
    __REALTIME_TIMESTAMP: '1700000000000000',
    PRIORITY: '3',
    _SYSTEMD_USER_UNIT: 'magpie.service',
    _PID: '4242',
    MESSAGE: 'Upstream timeout on model route',
  }));
  assert.equal(parsed1.level, 'error');
  assert.equal(parsed1.unit, 'magpie.service');
  assert.equal(parsed1.pid, '4242');
  assert.equal(parsed1.message, 'Upstream timeout on model route');

  const parsed2 = parseJournalJsonLine(JSON.stringify({
    PRIORITY: '4',
    SYSLOG_IDENTIFIER: 'worker',
    MESSAGE: Array.from(Buffer.from('retry backoff')),
  }));
  assert.equal(parsed2.level, 'warn');
  assert.equal(parsed2.message, 'retry backoff');
  assert.equal(priorityToLevel(6), 'info');
  assert.equal(inferLevelFromText('FATAL crash detected'), 'error');
});

test('OpenViking official status parsers extract queue, db, models, and locks', () => {
  const queueText = [
    '| Queue | Pending | InProgress | Processed | Requeued | Errors | Total |',
    '| semantic | 2 | 1 | 150 | 0 | 1 | 154 |',
    '| TOTAL | 2 | 1 | 150 | 0 | 1 | 154 |',
  ].join('\n');
  const queue = parseOvQueueTable(queueText);
  assert.equal(queue.rows.length, 1);
  assert.equal(queue.rows[0].queue, 'semantic');
  assert.equal(queue.total.processed, 150);

  const db = parseOvVikingDb('Account: default\nBackend: local\nCollection: ctx\nDimension: 1024\nVector Count: 4820');
  assert.equal(db.vectorCount, 4820);
  assert.equal(db.dimension, 1024);

  const models = parseOvModels('VLM Models\n| gemini-4 | proxy | 12 | 1000 | 400 | 1400 | 2026-11-25 |');
  assert.equal(models.length, 1);
  assert.equal(models[0].kind, 'vlm');
  assert.equal(models[0].totalTokens, 1400);

  const locks = parseOvLocks('Active Locks: 1\nWaiting Locks: 0\nStale Locks Removed: 2\nConflicts: 0');
  assert.equal(locks.active, 1);
  assert.equal(locks.staleRemoved, 2);

  const prefixed = parseOvJsonOutput('cmd: ov find -n 2 "test"\n{"ok":true,"result":{"total":2}}');
  assert.equal(prefixed.ok, true);
  assert.equal(prefixed.result.total, 2);
});

test('Tailscale Serve and Magpie parsers handle structured outputs and redact secrets', () => {
  const servesJson = parseTailscaleServeJson({
    Web: {
      'node.example.ts.net:443': {
        Handlers: {
          '/': { Proxy: 'http://127.0.0.1:4320' },
        },
      },
    },
  });
  assert.equal(servesJson.length, 1);
  assert.equal(servesJson[0].url, 'https://node.example.ts.net');
  assert.equal(servesJson[0].target, 'http://127.0.0.1:4320');

  const servesText = parseTailscaleServeText('https://node.example.ts.net (tailnet only)\n|-- / proxy http://127.0.0.1:3426');
  assert.equal(servesText.length, 1);
  assert.equal(servesText[0].target, 'http://127.0.0.1:3426');

  const agents = parseMagpieAgentsText('NAME   MODEL   STATUS\ncodex  auto/gemini-4  active');
  assert.equal(agents.length, 1);
  assert.equal(agents[0].name, 'codex');

  const sampleToken = ["sk", "unit", "test", "placeholder", "0123456789"].join("-");
  const lib = parseMagpieLibraryText(`MCP hub: active\nAuthorization: Bearer ${sampleToken}`);
  assert.ok(!lib.summaryLines.join("\n").includes(sampleToken));

  const units = parseSystemctlShowBlocks('Id=a.service\nActiveState=active\n\nId=b.service\nActiveState=failed\n');
  assert.equal(units.get('a.service').ActiveState, 'active');
  assert.equal(units.get('b.service').ActiveState, 'failed');
});
