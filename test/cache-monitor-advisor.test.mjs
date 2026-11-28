import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig, validateConfig } from '../src/config.mjs';
import {
  computeCacheHitPct,
  parseSanitizedUsageLine,
  RuntimeCacheMonitor,
} from '../src/cache-monitor.mjs';
import {
  DecisionAdvisor,
  MAX_ADVISOR_INPUT_TOKENS,
  normalizeAdvisorDiagnosisOutput,
  sanitizeAdvisorPayload,
  truncateToTokenBudget,
} from '../src/decision-advisor.mjs';
import { collectLocalCacheTelemetry } from '../probe/ops-probe.mjs';
import { sanitizeProbePayload } from '../src/probes.mjs';
import { createOpsConsole } from '../src/server.mjs';

const NOW = Date.now();
const PII_MARKERS = {
  account: 'acct-should-not-leak',
  host: 'host-should-not-leak',
  ip: '100.64.12.34',
  keyId: 'keyid-should-not-leak',
  prompt: 'RAW_PROMPT_SHOULD_NOT_LEAK',
  session: 'RAW_SESSION_SHOULD_NOT_LEAK',
  nativeSession: 'NATIVE_SESSION_SHOULD_NOT_LEAK',
  responseId: 'RESPONSE_ID_SHOULD_NOT_LEAK',
  email: 'pii-should-not-leak@example.com',
};

const tempDirs = [];

async function makeTempDir(prefix) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function cleanupTempDirs() {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
}

function usageLine({
  tsMs,
  agent = 'codex',
  provider = 'provider-a',
  model = 'model-a',
  served = null,
  ep = 'chat',
  inputTokens = 100,
  outputTokens = 50,
  cacheRead = 300,
  cacheWrite = 50,
  ttftMs = 120,
  durationMs = 900,
  status = 200,
  system = 1000,
  tools = 500,
  session = 'synthetic-session-alpha',
  extra = {},
} = {}) {
  return JSON.stringify({
    t: new Date(tsMs).toISOString(),
    agent,
    provider,
    model,
    req: model,
    served: served || model,
    ep,
    in: inputTokens,
    out: outputTokens,
    cache_read: cacheRead,
    cache_write: cacheWrite,
    ttft_ms: ttftMs,
    ms: durationMs,
    status,
    up_parts: { system, tools },
    session,
    ...extra,
  });
}

function piiExtra() {
  return {
    providerAccount: PII_MARKERS.account,
    host: PII_MARKERS.host,
    client_ip: PII_MARKERS.ip,
    providerKeyId: PII_MARKERS.keyId,
    prompt: PII_MARKERS.prompt,
    native_session: PII_MARKERS.nativeSession,
    response_id: PII_MARKERS.responseId,
    email: PII_MARKERS.email,
  };
}

function assertNoPii(serialized, label) {
  for (const [name, marker] of Object.entries(PII_MARKERS)) {
    assert.equal(serialized.includes(marker), false, `${label} leaked ${name}`);
  }
}

function advisorConfig(dataDir, cacheMonitor = {}) {
  return {
    connectors: { magpie: { apiUrl: 'https://magpie.example.com' } },
    console: { dataDir },
    cacheMonitor: {
      advisorEnabled: true,
      decisionModel: 'auto/deepseek-v4.1-flash',
      maxCallsPerHour: 12,
      dailyTokenBudget: 120_000,
      cooldownMinutes: 15,
      advisorTimeoutMs: 5000,
      ...cacheMonitor,
    },
  };
}

function deterministicCacheFallback() {
  return {
    severity: 'warn',
    summary: 'deterministic cache fallback',
    rootCauses: [{
      category: 'cold_start_or_short_turns',
      confidence: 0.55,
      evidence: 'fallback evidence',
      explanation: 'fallback explanation',
    }],
    affectedScopes: ['hub-local:codex:model-a'],
    suggestedActions: [{
      title: 'Inspect prompt prefix stability',
      risk: 'low',
      requiresApproval: true,
    }],
    confidence: 0.55,
  };
}

function llmContent({
  severity = 'critical',
  summary = 'Cache hit rate collapsed after tools schema drift',
} = {}) {
  return JSON.stringify({
    severity,
    summary,
    rootCauses: [{
      category: 'tools_schema_drift',
      confidence: 0.91,
      evidence: 'up_parts.tools changed between turns',
      explanation: 'Tool schema churn invalidates the cached tool prefix block.',
    }],
    affectedScopes: ['hub-local:codex:model-a'],
    chartAnnotation: { label: 'Cache collapse', severity, detail: 'hit rate dropped sharply' },
    suggestedActions: [{
      title: 'Pin tool schema ordering within a session',
      commandHint: 'magpie route show --group test-group',
      risk: 'medium',
      requiresApproval: true,
    }],
    confidence: 0.89,
  });
}

function fenced(content) {
  return `\`\`\`json\n${content}\n\`\`\``;
}

function mockAdvisorFetch(calls, {
  content = fenced(llmContent()),
  usage = { total_tokens: 420, prompt_tokens: 120, completion_tokens: 80 },
  status = 200,
  failure = null,
  severityByCall = null,
} = {}) {
  return async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    if (failure) throw new Error(failure);
    const bodyContent = severityByCall
      ? fenced(llmContent({ severity: severityByCall[Math.min(calls.length - 1, severityByCall.length - 1)] }))
      : content;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: bodyContent } }],
        usage,
      }),
    };
  };
}

function registerCacheDomain(advisor, fallbackAnalyze = deterministicCacheFallback) {
  advisor.registerDomain('cache', {
    description: 'Runtime prompt cache hit-rate drop & drift attribution',
    systemPrompt: 'Focus on prompt cache prefix stability.',
    buildPrompt: (payload) => JSON.stringify(payload, null, 2),
    fallbackAnalyze,
  });
  return advisor;
}

function monitorConfig(dataDir, cacheMonitor = {}) {
  return {
    console: { dataDir },
    fleet: { localNode: { id: 'hub-local' } },
    cacheMonitor: {
      enabled: true,
      thresholdPct: 90,
      dropDeltaPct: 15,
      windowMinutes: 60,
      minSamples: 5,
      pollIntervalSec: 3600,
      analysisIntervalMinutes: 0,
      ...cacheMonitor,
    },
  };
}

function createMonitor({ dataDir, usageFile, nowMs = NOW, cacheMonitor = {}, advisor = null, probeRegistry = null }) {
  return new RuntimeCacheMonitor({
    config: monitorConfig(dataDir, cacheMonitor),
    usageFile,
    dataDir,
    advisor,
    probeRegistry,
    nowFn: () => nowMs,
  });
}

async function writeUsageFile(dir, records) {
  const file = path.join(dir, 'usage.jsonl');
  await fs.writeFile(file, `${records.join('\n')}\n`, { mode: 0o600 });
  return file;
}

async function startIntegrationServer({ readOnly = false, usageFile, advisorFetchImpl = null } = {}) {
  const dataDir = await makeTempDir('cache-srv-');
  const config = loadConfig({
    cli: {
      hosts: '127.0.0.1',
      port: 4320,
      demo: false,
      readOnly,
      webKey: '',
    },
    env: { OPS_CONSOLE_DATA_DIR: dataDir },
  });
  config.console.port = 0;
  config.connectors.magpie.apiUrl = 'https://magpie.example.com';
  config.cacheMonitor = {
    ...config.cacheMonitor,
    advisorEnabled: true,
    decisionModel: 'auto/deepseek-v4.1-flash',
    thresholdPct: 60,
    dropDeltaPct: 15,
    windowMinutes: 60,
    minSamples: 5,
    pollIntervalSec: 3600,
    analysisIntervalMinutes: 0,
    cooldownMinutes: 15,
    maxCallsPerHour: 12,
    dailyTokenBudget: 120_000,
  };
  const hub = {
    warmUp() {},
    async collectSnapshot() {
      return {
        collectedAt: new Date().toISOString(),
        magpie: { providers: [], latencyMs: 1 },
      };
    },
  };
  const app = createOpsConsole({
    config,
    hub,
    usageFile,
    advisorFetchImpl,
    silentStdout: true,
    disableBackgroundTimers: true,
  });
  const { addresses } = await app.start();
  return {
    app,
    baseUrl: addresses[0].url,
    dataDir,
    cleanup: async () => {
      await app.stop();
      await fs.rm(dataDir, { recursive: true, force: true });
    },
  };
}

test.after(cleanupTempDirs);

test('DecisionAdvisor registers cache and logs domains and analyzes each independently', async () => {
  const dataDir = await makeTempDir('advisor-domains-');
  const calls = [];
  const advisor = new DecisionAdvisor({
    config: advisorConfig(dataDir),
    dataDir,
    fetchImpl: mockAdvisorFetch(calls),
  });
  registerCacheDomain(advisor);
  advisor.registerDomain('logs', {
    description: 'Log stream anomaly attribution',
    systemPrompt: 'Focus on error bursts.',
    fallbackAnalyze: () => ({
      severity: 'info',
      summary: 'deterministic logs fallback',
      rootCauses: [],
      affectedScopes: ['logs:journald'],
      suggestedActions: [],
      confidence: 0.4,
    }),
  });

  assert.deepEqual(advisor.listDomains().map((domain) => domain.id), ['cache', 'logs']);
  assert.equal(advisor.listDomains()[0].description.includes('prompt cache'), true);

  const cacheResult = await advisor.analyze({
    domainId: 'cache',
    key: 'hub-local:codex:model-a',
    payload: { bucket: { cacheHitPct: 12 } },
    force: true,
  });
  assert.equal(cacheResult.ok, true);
  assert.equal(cacheResult.skipped, false);
  assert.equal(cacheResult.diagnosis.domain, 'cache');
  assert.equal(cacheResult.diagnosis.mode, 'llm');

  const logsResult = await advisor.analyze({
    domainId: 'logs',
    key: 'journald:error-rate',
    payload: { errorRatePct: 42 },
    force: true,
  });
  assert.equal(logsResult.diagnosis.domain, 'logs');
  assert.equal(logsResult.diagnosis.mode, 'llm');
  assert.equal(calls.length, 2);
  assert.equal(calls.every((call) => call.url === 'https://magpie.example.com/v1/chat/completions'), true);

  await assert.rejects(
    () => advisor.analyze({ domainId: 'metrics', payload: {} }),
    /Unknown advisor domain/,
  );
});

test('sanitizeAdvisorPayload drops forbidden identity keys and redacts embedded secrets', () => {
  const syntheticApiKey = ['sk', 'proj', 'syntheticTestKey1234567890'].join('-');
  const payload = {
    providerAccount: 'acct-value',
    provider_account: 'acct-value-2',
    host: 'host-value',
    client_ip: PII_MARKERS.ip,
    providerKeyId: 'key-id-value',
    email: 'operator@example.com',
    user_email: 'operator2@example.com',
    token: 'token-value',
    access_token: 'access-token-value',
    refresh_token: 'refresh-token-value',
    apiKey: 'api-key-value',
    secret: 'secret-value',
    password: 'password-value',
    authorization: 'Bearer abcdefghijklmnop',
    cookie: 'session-cookie',
    prompt: 'raw prompt value',
    messages: [{ role: 'user', content: 'raw message body' }],
    native_session: 'native-session-value',
    response_id: 'response-id-value',
    safe: {
      agent: 'codex',
      apiKey: 'nested-api-key',
      nested: { secret: 'nested-secret', value: 3, hostname_account: 'nested-account' },
    },
    note: `upstream key ${syntheticApiKey} must never survive`,
    contact: 'notify operator@example.com about unit agent@node1.service',
  };

  const clean = sanitizeAdvisorPayload(payload);
  const serialized = JSON.stringify(clean);
  for (const forbidden of [
    'providerAccount',
    'provider_account',
    'client_ip',
    'providerKeyId',
    'user_email',
    'access_token',
    'refresh_token',
    'apiKey',
    'password',
    'authorization',
    'cookie',
    'prompt',
    'messages',
    'native_session',
    'response_id',
    'hostname_account',
  ]) {
    assert.equal(serialized.includes(forbidden), false, `forbidden key ${forbidden} survived sanitization`);
  }
  assert.equal(Object.hasOwn(clean, 'host'), false);
  assert.equal(Object.hasOwn(clean, 'email'), false);
  assert.equal(Object.hasOwn(clean, 'token'), false);
  assert.equal(Object.hasOwn(clean, 'secret'), false);
  assert.equal(clean.safe.agent, 'codex');
  assert.equal(clean.safe.nested.value, 3);
  assert.equal(clean.note.includes(syntheticApiKey), false);
  assert.equal(clean.note.includes('[REDACTED_API_KEY]'), true);
  assert.equal(clean.contact.includes('operator@example.com'), false);
  assert.equal(clean.contact.includes('[REDACTED_EMAIL]'), true);
  assert.equal(clean.contact.includes('agent@node1.service'), true);
});

test('normalizeAdvisorDiagnosisOutput enforces requiresApproval=true and redacts embedded emails', () => {
  const normalized = normalizeAdvisorDiagnosisOutput({
    severity: 'warn',
    summary: 'Ping owner@example.com after cache drop',
    suggestedActions: [
      { title: 'Email owner@example.com to restart', risk: 'high', requiresApproval: false },
    ],
  });
  assert.equal(normalized.summary.includes('owner@example.com'), false);
  assert.equal(normalized.summary.includes('[REDACTED_EMAIL]'), true);
  assert.equal(normalized.suggestedActions.length, 1);
  assert.equal(normalized.suggestedActions[0].requiresApproval, true);
  assert.equal(normalized.suggestedActions[0].title.includes('owner@example.com'), false);
});

test('token truncation respects MAX_ADVISOR_INPUT_TOKENS', () => {
  assert.equal(MAX_ADVISOR_INPUT_TOKENS, 3000);
  const oversized = 'A'.repeat(200_000);
  const truncated = truncateToTokenBudget(oversized);
  assert.equal(truncated.truncated, true);
  assert.ok(truncated.estimatedTokens <= MAX_ADVISOR_INPUT_TOKENS);
  assert.ok(truncated.text.length < oversized.length);
  assert.equal(truncated.text.includes('...[truncated'), true);

  const small = truncateToTokenBudget('short telemetry');
  assert.equal(small.truncated, false);
  assert.equal(small.text, 'short telemetry');
});

test('disabled advisor makes zero fetch calls and uses deterministic fallback', async () => {
  const dataDir = await makeTempDir('advisor-disabled-');
  let fetchCalls = 0;
  const advisor = new DecisionAdvisor({
    config: advisorConfig(dataDir, { advisorEnabled: false }),
    dataDir,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('fetch must not be called while advisor is disabled');
    },
  });
  registerCacheDomain(advisor);

  const result = await advisor.analyze({
    domainId: 'cache',
    key: 'hub-local:codex:model-a',
    payload: { bucket: { cacheHitPct: 5 } },
  });

  assert.equal(fetchCalls, 0);
  assert.equal(result.ok, true);
  assert.equal(result.diagnosis.mode, 'deterministic');
  assert.equal(result.diagnosis.llmSkippedReason, 'advisor_disabled');
  assert.equal(result.diagnosis.model, null);
  assert.equal(result.diagnosis.summary, 'deterministic cache fallback');
  assert.equal(result.diagnosis.suggestedActions.every((action) => action.requiresApproval === true), true);
});

test('enabled advisor posts OpenAI-compatible fenced telemetry and parses structured JSON', async () => {
  const dataDir = await makeTempDir('advisor-fence-');
  const calls = [];
  const advisor = new DecisionAdvisor({
    config: advisorConfig(dataDir),
    dataDir,
    fetchImpl: mockAdvisorFetch(calls, { content: fenced(llmContent()) }),
  });
  registerCacheDomain(advisor);

  const result = await advisor.analyze({
    domainId: 'cache',
    key: 'hub-local:codex:model-a',
    trigger: 'manual',
    payload: {
      thresholdPct: 90,
      bucket: {
        cacheHitPct: 12,
        providerAccount: 'acct-should-not-reach-llm',
        host: 'host-should-not-reach-llm',
      },
    },
    force: true,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://magpie.example.com/v1/chat/completions');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].body.model, 'auto/deepseek-v4.1-flash');
  assert.equal(calls[0].body.temperature, 0.1);
  assert.deepEqual(calls[0].body.response_format, { type: 'json_object' });
  const userMessage = calls[0].body.messages[1].content;
  assert.equal(userMessage.includes('<untrusted_telemetry_data>'), true);
  assert.equal(userMessage.includes('</untrusted_telemetry_data>'), true);
  assert.equal(userMessage.includes('acct-should-not-reach-llm'), false);
  assert.equal(userMessage.includes('host-should-not-reach-llm'), false);
  assert.equal(calls[0].body.messages[0].content.includes('STRICT JSON ONLY'), true);

  assert.equal(result.diagnosis.mode, 'llm');
  assert.equal(result.diagnosis.model, 'auto/deepseek-v4.1-flash');
  assert.equal(result.diagnosis.severity, 'critical');
  assert.equal(result.diagnosis.summary, 'Cache hit rate collapsed after tools schema drift');
  assert.equal(result.diagnosis.rootCauses[0].category, 'tools_schema_drift');
  assert.equal(result.diagnosis.chartAnnotation.label, 'Cache collapse');
  assert.equal(result.diagnosis.suggestedActions.length, 1);
  assert.equal(result.diagnosis.suggestedActions[0].requiresApproval, true);
  assert.equal(result.diagnosis.inputTokens, 120);
  assert.equal(result.diagnosis.outputTokens, 80);

  const budget = advisor.getBudgetStatus();
  assert.equal(budget.callsLastHour, 1);
  assert.equal(budget.tokensToday, 420);
  assert.equal(budget.tokensRemaining, 120_000 - 420);
});

test('advisor enforces hourly call cap and daily token budget', async () => {
  const cappedDir = await makeTempDir('advisor-hourly-cap-');
  const cappedCalls = [];
  const cappedAdvisor = new DecisionAdvisor({
    config: advisorConfig(cappedDir, { maxCallsPerHour: 1 }),
    dataDir: cappedDir,
    fetchImpl: mockAdvisorFetch(cappedCalls),
  });
  registerCacheDomain(cappedAdvisor);

  const first = await cappedAdvisor.analyze({
    domainId: 'cache',
    key: 'cap-key-1',
    payload: { bucket: { cacheHitPct: 10 } },
    force: true,
  });
  assert.equal(first.diagnosis.mode, 'llm');

  const second = await cappedAdvisor.analyze({
    domainId: 'cache',
    key: 'cap-key-2',
    payload: { bucket: { cacheHitPct: 10 } },
    force: true,
  });
  assert.equal(cappedCalls.length, 1);
  assert.equal(second.diagnosis.mode, 'deterministic');
  assert.equal(second.diagnosis.llmSkippedReason, 'budget_exhausted');
  assert.equal(cappedAdvisor.getBudgetStatus().callsRemaining, 0);
  assert.equal(cappedAdvisor.getBudgetStatus().exhausted, true);

  const budgetDir = await makeTempDir('advisor-token-budget-');
  const budgetCalls = [];
  const budgetAdvisor = new DecisionAdvisor({
    config: advisorConfig(budgetDir, { dailyTokenBudget: 1000, maxCallsPerHour: 12 }),
    dataDir: budgetDir,
    fetchImpl: mockAdvisorFetch(budgetCalls, {
      usage: { total_tokens: 400, prompt_tokens: 300, completion_tokens: 100 },
    }),
  });
  registerCacheDomain(budgetAdvisor);

  for (const key of ['budget-1', 'budget-2', 'budget-3']) {
    const result = await budgetAdvisor.analyze({
      domainId: 'cache',
      key,
      payload: { bucket: { cacheHitPct: 10 } },
      force: true,
    });
    assert.equal(result.diagnosis.mode, 'llm');
  }
  assert.equal(budgetCalls.length, 3);
  const spent = budgetAdvisor.getBudgetStatus();
  assert.equal(spent.tokensToday, 1200);
  assert.equal(spent.tokensRemaining, 0);
  assert.equal(spent.exhausted, true);

  const overBudget = await budgetAdvisor.analyze({
    domainId: 'cache',
    key: 'budget-4',
    payload: { bucket: { cacheHitPct: 10 } },
    force: true,
  });
  assert.equal(budgetCalls.length, 3);
  assert.equal(overBudget.diagnosis.mode, 'deterministic');
  assert.equal(overBudget.diagnosis.llmSkippedReason, 'budget_exhausted');
});

test('advisor cooldown suppresses repeats but breaks on severity escalation or doubled magnitude', async () => {
  const dataDir = await makeTempDir('advisor-cooldown-');
  const nowMs = 1_800_000_000_000;
  const calls = [];
  const advisor = new DecisionAdvisor({
    config: advisorConfig(dataDir),
    dataDir,
    nowFn: () => nowMs,
    fetchImpl: mockAdvisorFetch(calls, { severityByCall: ['warn', 'critical', 'critical'] }),
  });
  registerCacheDomain(advisor);

  advisor.cooldowns.set('cache:direct-key', { ts: nowMs, severity: 'warn' });
  const suppressed = advisor.shouldSuppressByCooldown('cache', 'direct-key', {
    nowMs: nowMs + 1000,
    severity: 'warn',
  });
  assert.equal(suppressed.suppressed, true);
  assert.ok(suppressed.remainingSec > 0);
  const severityBreak = advisor.shouldSuppressByCooldown('cache', 'direct-key', {
    nowMs: nowMs + 1000,
    severity: 'critical',
  });
  assert.equal(severityBreak.suppressed, false);
  assert.equal(severityBreak.brokenBy, 'severity_escalation');
  const magnitudeBreak = advisor.shouldSuppressByCooldown('cache', 'direct-key', {
    nowMs: nowMs + 1000,
    severity: 'warn',
    escalationFactor: 2,
  });
  assert.equal(magnitudeBreak.suppressed, false);
  assert.equal(magnitudeBreak.brokenBy, 'magnitude_doubled');

  const first = await advisor.analyze({
    domainId: 'cache',
    key: 'analysis-key',
    payload: { bucket: { cacheHitPct: 12 } },
    severity: 'warn',
  });
  assert.equal(first.diagnosis.mode, 'llm');
  assert.equal(first.diagnosis.severity, 'warn');

  const repeated = await advisor.analyze({
    domainId: 'cache',
    key: 'analysis-key',
    payload: { bucket: { cacheHitPct: 12 } },
    severity: 'warn',
  });
  assert.equal(repeated.skipped, true);
  assert.equal(repeated.skipReason, 'cooldown_active');
  assert.equal(repeated.diagnosis, null);
  assert.equal(calls.length, 1);

  const escalated = await advisor.analyze({
    domainId: 'cache',
    key: 'analysis-key',
    payload: { bucket: { cacheHitPct: 5 } },
    severity: 'critical',
  });
  assert.equal(escalated.skipped, false);
  assert.equal(escalated.diagnosis.severity, 'critical');
  assert.equal(calls.length, 2);

  const doubled = await advisor.analyze({
    domainId: 'cache',
    key: 'analysis-key',
    payload: { bucket: { cacheHitPct: 1 } },
    severity: 'critical',
    escalationFactor: 2,
  });
  assert.equal(doubled.skipped, false);
  assert.equal(calls.length, 3);

  const status = await advisor.getStatus();
  assert.ok(status.activeCooldowns.some((entry) => entry.key === 'cache:analysis-key'));
});

test('advisor falls back deterministically on fetch failure and invalid JSON', async () => {
  const failureDir = await makeTempDir('advisor-fetch-failure-');
  const failureAdvisor = new DecisionAdvisor({
    config: advisorConfig(failureDir),
    dataDir: failureDir,
    fetchImpl: mockAdvisorFetch([], { failure: 'network down' }),
  });
  registerCacheDomain(failureAdvisor);

  const failed = await failureAdvisor.analyze({
    domainId: 'cache',
    key: 'failure-key',
    payload: { bucket: { cacheHitPct: 3 } },
    force: true,
  });
  assert.equal(failed.ok, true);
  assert.equal(failed.diagnosis.mode, 'deterministic');
  assert.ok(failed.diagnosis.llmError.includes('network down'));
  assert.equal(failed.diagnosis.summary, 'deterministic cache fallback');

  const jsonDir = await makeTempDir('advisor-invalid-json-');
  const jsonCalls = [];
  const jsonAdvisor = new DecisionAdvisor({
    config: advisorConfig(jsonDir),
    dataDir: jsonDir,
    fetchImpl: mockAdvisorFetch(jsonCalls, { content: 'I cannot produce JSON for this request.' }),
  });
  registerCacheDomain(jsonAdvisor);

  const invalid = await jsonAdvisor.analyze({
    domainId: 'cache',
    key: 'invalid-json-key',
    payload: { bucket: { cacheHitPct: 3 } },
    force: true,
  });
  assert.equal(jsonCalls.length, 1);
  assert.equal(invalid.diagnosis.mode, 'deterministic');
  assert.ok(invalid.diagnosis.llmError.includes('valid JSON'));
  assert.equal(invalid.diagnosis.summary, 'deterministic cache fallback');
  assert.equal(invalid.diagnosis.suggestedActions.every((action) => action.requiresApproval === true), true);
});

test('RuntimeCacheMonitor reads usage.jsonl incrementally and resets cursor on truncation', async () => {
  const dataDir = await makeTempDir('monitor-incremental-');
  const lines = [
    usageLine({ tsMs: NOW - 120_000 }),
    usageLine({ tsMs: NOW - 60_000 }),
  ];
  const file = await writeUsageFile(dataDir, lines);
  const monitor = createMonitor({ dataDir, usageFile: file });

  const initial = await monitor.readUsageIncremental();
  assert.equal(initial.added, 2);
  assert.equal(monitor.records.length, 2);
  assert.equal(monitor.cursor.initialized, true);
  assert.equal(monitor.cursor.offset, (await fs.stat(file)).size);

  await fs.appendFile(file, `${usageLine({ tsMs: NOW - 30_000, model: 'model-b' })}\n`);
  const appended = await monitor.readUsageIncremental();
  assert.equal(appended.added, 1);
  assert.equal(monitor.records.length, 3);
  assert.equal(monitor.cursor.offset, (await fs.stat(file)).size);

  const rotatedLine = usageLine({ tsMs: NOW - 5_000, model: 'model-c' });
  const offsetBeforeRotation = monitor.cursor.offset;
  await fs.writeFile(file, `${rotatedLine}\n`);
  const afterRotation = await monitor.readUsageIncremental();
  assert.equal(afterRotation.added, 1);
  assert.equal(monitor.cursor.offset, (await fs.stat(file)).size);
  assert.equal(monitor.cursor.offset < offsetBeforeRotation, true);
  assert.equal(monitor.records[monitor.records.length - 1].model, 'model-c');
});

test('RuntimeCacheMonitor status and telemetry overlay never expose raw identity or prompt fields', async () => {
  const dataDir = await makeTempDir('monitor-pii-');
  const records = Array.from({ length: 6 }, (_, index) => usageLine({
    tsMs: NOW - (6 - index) * 30_000,
    extra: piiExtra(),
  }));
  const file = await writeUsageFile(dataDir, records);
  const monitor = createMonitor({ dataDir, usageFile: file, cacheMonitor: { minSamples: 5, thresholdPct: 90 } });

  const parsed = parseSanitizedUsageLine(records[0]);
  assert.ok(parsed);
  for (const forbidden of ['providerAccount', 'host', 'client_ip', 'providerKeyId', 'prompt', 'native_session', 'response_id', 'email', 'session']) {
    assert.equal(Object.hasOwn(parsed, forbidden), false, `parsed record kept ${forbidden}`);
  }
  assert.match(parsed.sessionHash, /^[0-9a-f]{10}$/);

  const status = await monitor.getStatus();
  const overlay = await monitor.getTelemetryOverlay();
  assertNoPii(JSON.stringify(status), 'cache monitor status');
  assertNoPii(JSON.stringify(overlay), 'telemetry overlay');
  assert.equal(JSON.stringify(status).includes('synthetic-session-alpha'), false);
  assert.equal(status.summary.totalRequests, 6);
  assert.equal(overlay.summary.totalRequests, 6);
  assert.equal(overlay.source, 'usage-jsonl');
  assert.equal(status.source.available, true);
  assert.equal(status.source.inMemoryRecords, 6);
});

test('RuntimeCacheMonitor computes cache hit rate and detects sustained low and sudden drop', async () => {
  assert.equal(computeCacheHitPct(100, 300, 100), 60);
  assert.equal(computeCacheHitPct(0, 0, 0), null);
  assert.equal(computeCacheHitPct(100, 0, 0), 0);

  const lowDir = await makeTempDir('monitor-sustained-low-');
  const lowFile = await writeUsageFile(
    lowDir,
    Array.from({ length: 6 }, (_, index) => usageLine({
      tsMs: NOW - (6 - index) * 20_000,
      inputTokens: 100,
      cacheRead: 10,
      cacheWrite: 10,
    })),
  );
  const lowMonitor = createMonitor({
    dataDir: lowDir,
    usageFile: lowFile,
    cacheMonitor: { thresholdPct: 90, minSamples: 5 },
  });
  const lowStatus = await lowMonitor.getStatus();
  assert.equal(lowStatus.buckets.length, 1);
  assert.equal(lowStatus.buckets[0].cacheHitPct, 8.33);
  assert.equal(lowStatus.anomalies.length, 1);
  assert.equal(lowStatus.anomalies[0].anomalyType, 'sustained_low');
  assert.equal(lowStatus.anomalies[0].severity, 'critical');

  const dropDir = await makeTempDir('monitor-sudden-drop-');
  const baseline = Array.from({ length: 6 }, (_, index) => usageLine({
    tsMs: NOW - 90_000 + index * 5_000,
    inputTokens: 10,
    cacheRead: 90,
    cacheWrite: 0,
  }));
  const recent = Array.from({ length: 4 }, (_, index) => usageLine({
    tsMs: NOW - 35_000 + index * 5_000,
    inputTokens: 100,
    cacheRead: 0,
    cacheWrite: 0,
  }));
  const dropFile = await writeUsageFile(dropDir, [...baseline, ...recent]);
  const dropMonitor = createMonitor({
    dataDir: dropDir,
    usageFile: dropFile,
    cacheMonitor: { thresholdPct: 20, dropDeltaPct: 15, minSamples: 5 },
  });
  const dropStatus = await dropMonitor.getStatus();
  assert.equal(dropStatus.buckets.length, 1);
  assert.equal(dropStatus.buckets[0].baselineHitPct, 90);
  assert.equal(dropStatus.buckets[0].recentHitPct, 0);
  assert.equal(dropStatus.buckets[0].dropPct, 90);
  assert.equal(dropStatus.anomalies[0].anomalyType, 'sudden_drop');
  assert.equal(dropStatus.anomalies[0].severity, 'critical');
});

test('RuntimeCacheMonitor extracts system, tools, route, endpoint, and session-gap drift clues', async () => {
  const dataDir = await makeTempDir('monitor-drift-');
  const base = NOW - 10 * 60_000;
  const records = [
    usageLine({
      tsMs: base,
      provider: 'provider-a',
      served: 'model-a',
      ep: 'chat',
      system: 1000,
      tools: 500,
      session: 'drift-session',
    }),
    usageLine({
      tsMs: base + 10_000,
      provider: 'provider-b',
      served: 'model-b',
      ep: 'responses',
      system: 1200,
      tools: 600,
      session: 'drift-session',
    }),
    usageLine({
      tsMs: base + 400_000,
      provider: 'provider-b',
      served: 'model-b',
      ep: 'responses',
      system: 1100,
      tools: 700,
      session: 'drift-session',
    }),
    usageLine({
      tsMs: base + 410_000,
      provider: 'provider-a',
      served: 'model-a',
      ep: 'chat',
      system: 1200,
      tools: 600,
      session: 'drift-session',
    }),
  ];
  const file = await writeUsageFile(dataDir, records);
  const monitor = createMonitor({
    dataDir,
    usageFile: file,
    cacheMonitor: { thresholdPct: 10, dropDeltaPct: 50, minSamples: 4 },
  });

  const status = await monitor.getStatus();
  assert.equal(status.buckets.length, 1);
  const bucket = status.buckets[0];
  assert.equal(bucket.systemDriftCount, 3);
  assert.equal(bucket.systemDeltaBytes, 200);
  assert.equal(bucket.toolsDriftCount, 3);
  assert.equal(bucket.toolsDeltaBytes, 100);
  assert.equal(bucket.routeSwitchCount, 2);
  assert.equal(bucket.epSwitchCount, 2);
  assert.equal(bucket.longGapCount, 1);
  assert.equal(bucket.avgSessionGapSec, 137);
  assert.deepEqual(bucket.uniqueServedModels.sort(), ['model-a', 'model-b']);
  assert.deepEqual(bucket.endpoints.sort(), ['chat', 'responses']);
});

test('RuntimeCacheMonitor merges online remote probe buckets without double-counting local cache', async () => {
  const dataDir = await makeTempDir('monitor-remote-merge-');
  const file = await writeUsageFile(
    dataDir,
    Array.from({ length: 6 }, (_, index) => usageLine({
      tsMs: NOW - (6 - index) * 20_000,
      agent: 'codex',
      model: 'model-local',
      inputTokens: 100,
      cacheRead: 300,
      cacheWrite: 50,
    })),
  );
  const remoteBucket = (agent, model, requests, hitPct) => ({
    agent,
    model,
    requests,
    tokensIn: 100,
    tokensOut: 50,
    cacheRead: 300,
    cacheWrite: 50,
    cacheHitPct: hitPct,
    dropPct: 0,
  });
  const probeRegistry = {
    buildFleetView() {
      return {
        nodes: [
          {
            id: 'hub-local',
            name: 'Hub Local',
            isLocal: true,
            probeMode: 'local',
            status: 'healthy',
            cache: {
              collectedAt: new Date(NOW).toISOString(),
              requests: 99,
              cacheHitPct: 1,
              buckets: [remoteBucket('codex', 'model-local', 99, 1)],
            },
          },
          {
            id: 'edge-online',
            name: 'Edge Online',
            probeMode: 'push',
            status: 'healthy',
            lastSeenAt: new Date(NOW).toISOString(),
            cache: {
              collectedAt: new Date(NOW).toISOString(),
              requests: 8,
              cacheHitPct: 80,
              buckets: [remoteBucket('codex', 'model-edge', 8, 80)],
            },
          },
          {
            id: 'edge-degraded',
            name: 'Edge Degraded',
            probeMode: 'push',
            status: 'degraded',
            lastSeenAt: new Date(NOW).toISOString(),
            cache: {
              collectedAt: new Date(NOW).toISOString(),
              requests: 6,
              cacheHitPct: 70,
              buckets: [remoteBucket('claude', 'model-degraded', 6, 70)],
            },
          },
          {
            id: 'edge-offline',
            name: 'Edge Offline',
            probeMode: 'push',
            status: 'offline',
            cache: {
              collectedAt: new Date(NOW).toISOString(),
              requests: 6,
              cacheHitPct: 10,
              buckets: [remoteBucket('offline-agent', 'model-offline', 6, 10)],
            },
          },
        ],
      };
    },
  };
  const monitor = createMonitor({
    dataDir,
    usageFile: file,
    probeRegistry,
    cacheMonitor: { thresholdPct: 90, minSamples: 5 },
  });

  const status = await monitor.getStatus();
  const nodeIds = status.buckets.map((bucket) => bucket.nodeId).sort();
  assert.deepEqual(nodeIds, ['edge-degraded', 'edge-online', 'hub-local']);
  assert.equal(status.buckets.filter((bucket) => bucket.nodeId === 'hub-local').length, 1);
  const localBucket = status.buckets.find((bucket) => bucket.nodeId === 'hub-local');
  assert.equal(localBucket.source, 'local');
  assert.equal(localBucket.cacheHitPct, 66.67);
  assert.equal(status.buckets.find((bucket) => bucket.nodeId === 'edge-online').source, 'probe');
  assert.equal(status.summary.remoteNodeCount, 2);
  assert.deepEqual(status.remoteNodes.map((node) => node.nodeId).sort(), ['edge-degraded', 'edge-online']);
  assert.equal(status.buckets.some((bucket) => bucket.agent === 'offline-agent'), false);
});

test('probe collectLocalCacheTelemetry aggregates buckets without leaking identity fields', async () => {
  const dataDir = await makeTempDir('probe-cache-');
  const file = await writeUsageFile(
    dataDir,
    Array.from({ length: 6 }, (_, index) => usageLine({
      tsMs: NOW - (6 - index) * 20_000,
      extra: piiExtra(),
    })),
  );
  const telemetry = await collectLocalCacheTelemetry(
    { magpieUsageFile: file, cacheWindowMinutes: 60, collectCache: true },
    { nowFn: () => NOW },
  );

  assert.ok(telemetry);
  assert.equal(telemetry.requests, 6);
  assert.equal(telemetry.buckets.length, 1);
  assert.equal(telemetry.buckets[0].agent, 'codex');
  assert.equal(telemetry.buckets[0].requests, 6);
  assert.equal(telemetry.cacheHitPct, 66.67);
  assert.equal(telemetry.buckets[0].cacheHitPct, 66.67);
  assertNoPii(JSON.stringify(telemetry), 'probe cache telemetry');
  assert.equal(JSON.stringify(telemetry).includes('synthetic-session-alpha'), false);
  assert.equal(Object.hasOwn(telemetry.buckets[0], 'session'), false);
});

test('sanitizeProbePayload keeps valid cache stats and strips unknown or PII keys', () => {
  const sanitized = sanitizeProbePayload({
    nodeId: 'edge-synthetic-01',
    hostname: 'edge-synthetic-01',
    providerAccount: 'acct-should-not-survive',
    host: 'host-should-not-survive',
    client_ip: '100.64.99.99',
    providerKeyId: 'keyid-should-not-survive',
    email: 'ops-should-not-survive@example.com',
    prompt: 'prompt-should-not-survive',
    unknownField: 'unknown-should-not-survive',
    cache: {
      collectedAt: new Date(NOW).toISOString(),
      windowMinutes: 60,
      requests: 6,
      tokensIn: 600,
      tokensOut: 300,
      cacheRead: 1800,
      cacheWrite: 300,
      cacheHitPct: 66.67,
      avgTtftMs: 120,
      providerAccount: 'nested-account',
      buckets: [{
        agent: 'codex',
        model: 'model-a',
        requests: 6,
        errorCount: 0,
        tokensIn: 600,
        tokensOut: 300,
        cacheRead: 1800,
        cacheWrite: 300,
        cacheHitPct: 66.67,
        providerAccount: 'nested-account',
        host: 'nested-host',
        client_ip: '100.64.98.98',
        providerKeyId: 'nested-key-id',
        session: 'nested-session',
        prompt: 'nested-prompt',
        extraUnknown: 'nested-extra',
      }],
    },
  }, 'edge-synthetic-01');

  assert.ok(sanitized.cache);
  assert.equal(sanitized.cache.requests, 6);
  assert.equal(sanitized.cache.tokensIn, 600);
  assert.equal(sanitized.cache.cacheRead, 1800);
  assert.equal(sanitized.cache.cacheWrite, 300);
  assert.equal(sanitized.cache.cacheHitPct, 66.67);
  assert.equal(sanitized.cache.buckets.length, 1);
  const bucket = sanitized.cache.buckets[0];
  assert.equal(bucket.agent, 'codex');
  assert.equal(bucket.requests, 6);
  assert.equal(bucket.cacheHitPct, 66.67);

  const serialized = JSON.stringify(sanitized);
  for (const forbidden of [
    'providerAccount',
    'client_ip',
    'providerKeyId',
    'unknownField',
    'host-should-not-survive',
    'prompt-should-not-survive',
    'ops-should-not-survive@example.com',
    'nested-account',
    'nested-host',
    'nested-session',
    'nested-prompt',
    'nested-extra',
  ]) {
    assert.equal(serialized.includes(forbidden), false, `sanitized payload kept ${forbidden}`);
  }
  assert.equal(Object.hasOwn(bucket, 'session'), false);
  assert.equal(Object.hasOwn(bucket, 'extraUnknown'), false);
  assert.equal(Object.hasOwn(sanitized, 'host'), false);
  assert.equal(Object.hasOwn(sanitized, 'email'), false);
});

test('validateConfig accepts a valid cacheMonitor block and rejects invalid ranges or model ids', () => {
  const valid = validateConfig({
    cacheMonitor: {
      enabled: true,
      advisorEnabled: true,
      decisionModel: 'auto/deepseek-v4.1-flash',
      thresholdPct: 90,
      dropDeltaPct: 15,
      windowMinutes: 60,
      minSamples: 5,
      pollIntervalSec: 60,
      analysisIntervalMinutes: 30,
      cooldownMinutes: 15,
      maxCallsPerHour: 12,
      dailyTokenBudget: 120_000,
    },
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, []);

  const invalid = validateConfig({
    cacheMonitor: {
      thresholdPct: 0,
      dropDeltaPct: 101,
      windowMinutes: 4,
      minSamples: 0,
      pollIntervalSec: 5,
      analysisIntervalMinutes: -1,
      cooldownMinutes: 0,
      maxCallsPerHour: 0,
      dailyTokenBudget: 500,
      decisionModel: 'bad model',
    },
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.thresholdPct')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.dropDeltaPct')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.windowMinutes')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.minSamples')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.pollIntervalSec')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.analysisIntervalMinutes')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.cooldownMinutes')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.maxCallsPerHour')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.dailyTokenBudget')));
  assert.ok(invalid.errors.some((error) => error.includes('cacheMonitor.decisionModel')));
});

test('HTTP: non-demo server serves real cache telemetry and cache monitor / advisor routes', async () => {
  const usageDir = await makeTempDir('cache-http-usage-');
  const usageFile = await writeUsageFile(
    usageDir,
    Array.from({ length: 6 }, (_, index) => usageLine({
      tsMs: NOW - (6 - index) * 20_000,
      agent: 'codex',
      model: 'model-a',
      inputTokens: 100,
      outputTokens: 50,
      cacheRead: 300,
      cacheWrite: 50,
    })),
  );
  const calls = [];
  const server = await startIntegrationServer({
    usageFile,
    advisorFetchImpl: mockAdvisorFetch(calls, { content: fenced(llmContent()) }),
  });
  try {
    const telemetryRes = await fetch(`${server.baseUrl}/api/gateway/telemetry`);
    assert.equal(telemetryRes.status, 200);
    const telemetry = await telemetryRes.json();
    assert.equal(telemetry.ok, true);
    assert.equal(telemetry.source, 'usage-jsonl');
    assert.equal(telemetry.summary.totalRequests, 6);
    assert.ok(telemetry.summary.cacheHitPct > 0);
    assert.equal(telemetry.summary.cacheHitPct, 66.67);
    const provider = telemetry.providers.find((entry) => entry.name === 'provider-a');
    assert.ok(provider);
    assert.ok(provider.tokensK > 0);
    assert.equal(provider.tokensK, 3);
    assert.ok(telemetry.hourly.some((slot) => slot.tokensK > 0));

    const monitorRes = await fetch(`${server.baseUrl}/api/cache-monitor`);
    assert.equal(monitorRes.status, 200);
    const monitor = await monitorRes.json();
    assert.equal(monitor.ok, true);
    assert.equal(monitor.source.available, true);
    assert.equal(monitor.summary.totalRequests, 6);
    assert.ok(monitor.summary.overallHitPct > 0);
    assert.equal(monitor.buckets.length, 1);
    assert.equal(monitor.buckets[0].cacheHitPct, 66.67);
    assert.equal(monitor.advisor.enabled, true);
    assert.ok(monitor.advisor.domains.some((domain) => domain.id === 'cache'));

    const configRes = await fetch(`${server.baseUrl}/api/cache-monitor/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thresholdPct: 55, windowMinutes: 30 }),
    });
    assert.equal(configRes.status, 200);
    const updated = await configRes.json();
    assert.equal(updated.ok, true);
    assert.equal(updated.config.thresholdPct, 55);
    assert.equal(updated.config.windowMinutes, 30);
    assert.equal(updated.config.advisorEnabled, true);
    assert.equal(updated.advisor.domains.some((domain) => domain.id === 'cache'), true);

    const analyzeRes = await fetch(`${server.baseUrl}/api/cache-monitor/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'llm' }),
    });
    assert.equal(analyzeRes.status, 200);
    const analyzed = await analyzeRes.json();
    assert.equal(analyzed.ok, true);
    assert.equal(analyzed.skipped, false);
    assert.equal(analyzed.diagnosis.mode, 'llm');
    assert.equal(analyzed.diagnosis.domain, 'cache');
    assert.equal(analyzed.diagnosis.suggestedActions.every((action) => action.requiresApproval === true), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://magpie.example.com/v1/chat/completions');

    const statusRes = await fetch(`${server.baseUrl}/api/decision-advisor/status`);
    assert.equal(statusRes.status, 200);
    const advisorStatus = await statusRes.json();
    assert.equal(advisorStatus.ok, true);
    assert.equal(advisorStatus.enabled, true);
    assert.ok(advisorStatus.domains.some((domain) => domain.id === 'cache'));
    assert.equal(advisorStatus.budget.callsLastHour, 1);
    assert.ok(advisorStatus.diagnosisCount >= 1);

    const diagnosesRes = await fetch(`${server.baseUrl}/api/decision-advisor/diagnoses?domainId=cache&limit=5`);
    assert.equal(diagnosesRes.status, 200);
    const diagnoses = await diagnosesRes.json();
    assert.equal(diagnoses.ok, true);
    assert.ok(diagnoses.items.length >= 1);
    assert.equal(diagnoses.items[0].domain, 'cache');
    assert.equal(diagnoses.items[0].mode, 'llm');

    const advisorConfigRes = await fetch(`${server.baseUrl}/api/decision-advisor/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxCallsPerHour: 9, cooldownMinutes: 5 }),
    });
    assert.equal(advisorConfigRes.status, 200);
    const advisorConfig = await advisorConfigRes.json();
    assert.equal(advisorConfig.ok, true);
    assert.equal(advisorConfig.config.maxCallsPerHour, 9);
    assert.equal(advisorConfig.config.cooldownMinutes, 5);
    assert.equal(advisorConfig.status.config.maxCallsPerHour, 9);
  } finally {
    await server.cleanup();
    await fs.rm(usageDir, { recursive: true, force: true });
  }
});

test('HTTP: read-only server rejects cache monitor and advisor mutations with 403', async () => {
  const usageDir = await makeTempDir('cache-http-readonly-');
  const usageFile = await writeUsageFile(usageDir, [usageLine({ tsMs: NOW - 10_000 })]);
  const server = await startIntegrationServer({ readOnly: true, usageFile });
  try {
    const cacheConfigRes = await fetch(`${server.baseUrl}/api/cache-monitor/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thresholdPct: 80 }),
    });
    assert.equal(cacheConfigRes.status, 403);
    const cacheConfigBody = await cacheConfigRes.json();
    assert.equal(cacheConfigBody.ok, false);

    const analyzeRes = await fetch(`${server.baseUrl}/api/cache-monitor/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'llm' }),
    });
    assert.equal(analyzeRes.status, 403);
    const analyzeBody = await analyzeRes.json();
    assert.equal(analyzeBody.ok, false);

    const advisorConfigRes = await fetch(`${server.baseUrl}/api/decision-advisor/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxCallsPerHour: 5 }),
    });
    assert.equal(advisorConfigRes.status, 403);
    const advisorConfigBody = await advisorConfigRes.json();
    assert.equal(advisorConfigBody.ok, false);
  } finally {
    await server.cleanup();
    await fs.rm(usageDir, { recursive: true, force: true });
  }
});
