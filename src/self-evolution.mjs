import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GIT_REF_RE, GIT_REMOTE_RE, PACKAGE_ROOT } from './config.mjs';
import { runCmd } from './exec.mjs';
import { evaluateAiPreflight } from './ai-ops-governance.mjs';
import { validateDeclarativeAgentManifest, validateModuleExport } from './agent-module-host.mjs';
import { redactText } from './redact.mjs';
import { buildIncrementalPlan, classifyChangedFile } from './updater.mjs';

export const VALID_EVOLUTION_STATUSES = Object.freeze([
  'preflight_checked',
  'sandbox_ready',
  'verified',
  'pr_opened',
  'applied',
  'failed',
  'rolled_back',
]);

export const ALLOWED_EVOLUTION_CONFIRM_ACTIONS = new Set(['publish-pr', 'apply', 'rollback']);
const FORBIDDEN_BRANCHES = new Set(['main', 'master', 'head']);
const MAX_PROPOSALS = 60;
const MAX_PATCHES_PER_PROPOSAL = 24;
const MAX_PATCH_CONTENT_BYTES = 256 * 1024;

const FORBIDDEN_PATH_PREFIXES = [
  '.git/',
  '.worktrees/',
  '.claude/',
  'node_modules/',
  'data/',
];

const FORBIDDEN_EXACT_PATHS = new Set([
  '.git',
  '.env',
  '.env.local',
  'config.local.json',
  'ops-console.config.json',
]);

const SECRET_SCAN_RULES = [
  { name: 'private-key', re: new RegExp('-----BEGIN [A-Z0-9 ]*' + 'PRIVATE KEY-----') },
  { name: 'github-pat', re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: 'api-secret', re: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'aws-key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
];

function cleanText(value, maxLen = 280) {
  return redactText(String(value ?? '').trim()).slice(0, maxLen);
}

function slugify(value, fallback = 'change') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  return slug || fallback;
}

export function validateEvolutionPatchPath(rawPath, repoDir = PACKAGE_ROOT) {
  const normalized = String(rawPath || '').trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized) {
    const err = new Error('Patch path is required');
    err.statusCode = 400;
    throw err;
  }
  if (normalized.startsWith('/') || normalized.includes('\0') || /^[A-Za-z]:/.test(normalized)) {
    const err = new Error(`Patch path must be repository-relative: ${normalized}`);
    err.statusCode = 400;
    throw err;
  }
  const segments = normalized.split('/');
  if (segments.some((seg) => !seg || seg === '.' || seg === '..')) {
    const err = new Error(`Invalid path traversal segment in patch path: ${normalized}`);
    err.statusCode = 400;
    throw err;
  }
  const lower = normalized.toLowerCase();
  if (FORBIDDEN_EXACT_PATHS.has(lower) || FORBIDDEN_PATH_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    const err = new Error(`Protected path cannot be modified by self-evolution: ${normalized}`);
    err.statusCode = 400;
    throw err;
  }
  if (/\.(?:pem|key|p12|pfx|crt)$/i.test(lower) || /(?:^|\/)\.env(?:\.|$)/i.test(lower)) {
    const err = new Error(`Sensitive credential/key file cannot be modified: ${normalized}`);
    err.statusCode = 400;
    throw err;
  }
  const resolvedRepo = path.resolve(repoDir);
  const resolvedTarget = path.resolve(resolvedRepo, normalized);
  if (!resolvedTarget.startsWith(`${resolvedRepo}${path.sep}`)) {
    const err = new Error(`Resolved path escapes repository root: ${normalized}`);
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

export function scanPatchContentForSecrets(content) {
  const text = String(content ?? '');
  const findings = [];
  for (const rule of SECRET_SCAN_RULES) {
    if (rule.re.test(text)) findings.push(rule.name);
  }
  return findings;
}

export function validateEvolutionBranch(rawBranch) {
  const clean = String(rawBranch || '').trim();
  if (!clean || !GIT_REF_RE.test(clean) || clean.includes('..') || clean.startsWith('/')) {
    const err = new Error(`Invalid evolution branch name: "${clean || '(empty)'}"`);
    err.statusCode = 400;
    throw err;
  }
  if (FORBIDDEN_BRANCHES.has(clean.toLowerCase())) {
    const err = new Error(`Self-evolution cannot target protected branch "${clean}"; use an isolated feature/evolve branch`);
    err.statusCode = 400;
    throw err;
  }
  return clean;
}

function parsePrUrl(stdout) {
  const text = String(stdout || '');
  const match = text.match(/https?:\/\/[^\s]+\/pull\/(\d+)/);
  if (!match) return { url: null, number: null };
  return { url: match[0], number: Number(match[1]) };
}

export class SelfEvolutionEngine {
  constructor({
    config = null,
    repoDir = PACKAGE_ROOT,
    dataDir = null,
    worktreesDir = null,
    updater = null,
    moduleHost = null,
    a2aOrchestrator = null,
    logger = null,
    eventBus = null,
    gitRunner = null,
    verifyRunner = null,
    prPublisher = null,
  } = {}) {
    this.config = config;
    this.repoDir = path.resolve(repoDir || PACKAGE_ROOT);
    this.dataDir = path.resolve(dataDir || config?.console?.dataDir || config?.storage?.dir || path.join(this.repoDir, 'data'));
    this.worktreesDir = path.resolve(worktreesDir || path.join(this.repoDir, '.worktrees'));
    this.statePath = path.join(this.dataDir, 'self-evolution.json');
    this.updater = updater;
    this.moduleHost = moduleHost;
    this.a2aOrchestrator = a2aOrchestrator;
    this.logger = logger;
    this.eventBus = eventBus;
    this.gitRunner = typeof gitRunner === 'function' ? gitRunner : null;
    this.verifyRunner = typeof verifyRunner === 'function' ? verifyRunner : null;
    this.prPublisher = typeof prPublisher === 'function' ? prPublisher : null;

    this.proposals = new Map();
    this.confirmTokens = new Map();
  }

  async init() {
    await this._loadState();
    return this.getState();
  }

  _guardWritable() {
    if (this.config?.console?.readOnly) {
      const err = new Error('Console is running in read-only mode');
      err.statusCode = 403;
      throw err;
    }
  }

  _pruneExpiredTokens() {
    const now = Date.now();
    for (const [token, meta] of this.confirmTokens.entries()) {
      if (meta.expiresAt <= now) this.confirmTokens.delete(token);
    }
  }

  issueConfirmToken(action = 'apply') {
    this._guardWritable();
    const cleanAction = String(action || '').trim().toLowerCase();
    if (!ALLOWED_EVOLUTION_CONFIRM_ACTIONS.has(cleanAction)) {
      const err = new Error(`Unsupported self-evolution confirm action: ${action}`);
      err.statusCode = 400;
      throw err;
    }
    this._pruneExpiredTokens();
    const token = crypto.randomBytes(18).toString('hex');
    const expiresAt = Date.now() + 120_000;
    this.confirmTokens.set(token, { action: cleanAction, expiresAt });
    return {
      ok: true,
      action: cleanAction,
      confirmToken: token,
      expiresInSec: 120,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  _consumeConfirmToken(token, action) {
    if (!token || typeof token !== 'string') return false;
    this._pruneExpiredTokens();
    const meta = this.confirmTokens.get(token);
    if (!meta || meta.action !== action) return false;
    this.confirmTokens.delete(token);
    return true;
  }

  _requireConfirmIfNeeded(action, token) {
    if (!this.config?.security?.requireCriticalConfirm) return;
    if (!this._consumeConfirmToken(token, action)) {
      const err = new Error(`Self-evolution action "${action}" requires a single-use confirmToken`);
      err.statusCode = 409;
      err.requiresConfirm = true;
      throw err;
    }
  }

  async _loadState() {
    try {
      const raw = await fsp.readFile(this.statePath, 'utf8');
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed?.proposals) ? parsed.proposals : [];
      this.proposals.clear();
      for (const item of list.slice(0, MAX_PROPOSALS)) {
        if (item?.id) this.proposals.set(item.id, item);
      }
    } catch {
      this.proposals.clear();
    }
  }

  async _persist() {
    await fsp.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const sorted = [...this.proposals.values()]
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, MAX_PROPOSALS);
    const tmp = `${this.statePath}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(
      tmp,
      `${JSON.stringify({ version: 1, savedAt: new Date().toISOString(), proposals: sorted }, null, 2)}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );
    await fsp.rename(tmp, this.statePath);
    await fsp.chmod(this.statePath, 0o600).catch(() => {});
  }

  async _git(args, { cwd = this.repoDir, timeout = 20_000 } = {}) {
    if (this.gitRunner) {
      return this.gitRunner(args, { cwd, timeout });
    }
    return runCmd('git', args, {
      cwd,
      timeout,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
  }

  _serializeProposal(proposal) {
    if (!proposal) return null;
    const { rollbackBackup, ...rest } = proposal;
    return {
      ...rest,
      hasRollbackBackup: Array.isArray(rollbackBackup) && rollbackBackup.length > 0,
      patchCount: Array.isArray(proposal.filePatches) ? proposal.filePatches.length : 0,
    };
  }

  getProposal(id) {
    const proposal = this.proposals.get(String(id || '').trim());
    if (!proposal) {
      const err = new Error(`Evolution proposal not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
    return proposal;
  }

  listProposals({ status = null, targetLayer = null, btwThreadId = null } = {}) {
    let items = [...this.proposals.values()]
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    if (status) items = items.filter((item) => item.status === status);
    if (targetLayer) items = items.filter((item) => item.primaryLayer === targetLayer);
    if (btwThreadId) items = items.filter((item) => item.btwThreadId === btwThreadId);
    return items.map((item) => this._serializeProposal(item));
  }

  getState() {
    const proposals = this.listProposals();
    const summary = {
      total: proposals.length,
      preflightChecked: proposals.filter((p) => p.status === 'preflight_checked').length,
      sandboxReady: proposals.filter((p) => p.status === 'sandbox_ready').length,
      verified: proposals.filter((p) => p.status === 'verified').length,
      prOpened: proposals.filter((p) => p.status === 'pr_opened').length,
      applied: proposals.filter((p) => p.status === 'applied').length,
      failed: proposals.filter((p) => p.status === 'failed').length,
      rolledBack: proposals.filter((p) => p.status === 'rolled_back').length,
      hotSwappableCount: proposals.filter((p) => p.hotSwappable).length,
    };
    return {
      ok: true,
      readOnly: Boolean(this.config?.console?.readOnly),
      requireCriticalConfirm: Boolean(this.config?.security?.requireCriticalConfirm),
      proposals,
      summary,
    };
  }

  _emitUpdated(action, proposal) {
    this.eventBus?.emit('evolution_updated', {
      action,
      proposalId: proposal.id,
      status: proposal.status,
      branch: proposal.branch,
      hotSwappable: proposal.hotSwappable,
      prNumber: proposal.pr?.number ?? null,
      prUrl: proposal.pr?.url ?? null,
      ts: new Date().toISOString(),
    });
  }

  async createProposal(payload = {}, { actor = 'web', snapshot = null, mcpSummary = null } = {}) {
    this._guardWritable();
    let btwThread = null;
    const btwThreadId = payload.btwThreadId ? String(payload.btwThreadId).trim() : null;
    if (btwThreadId) {
      if (!this.a2aOrchestrator) {
        const err = new Error('A2A orchestrator is unavailable for BTW promotion');
        err.statusCode = 400;
        throw err;
      }
      btwThread = typeof this.a2aOrchestrator.getBtwThread === 'function'
        ? (this.a2aOrchestrator.getBtwThread(btwThreadId)?.thread || null)
        : (this.a2aOrchestrator.btwThreads?.get(btwThreadId) || null);
      if (!btwThread) {
        const err = new Error(`BTW thread not found: ${btwThreadId}`);
        err.statusCode = 404;
        throw err;
      }
    }

    const prDraft = btwThread?.mergeProposal?.prDraftSpec || null;
    const title = cleanText(payload.title || prDraft?.title || btwThread?.title || '', 120);
    if (!title) {
      const err = new Error('Proposal title is required');
      err.statusCode = 400;
      throw err;
    }
    const goal = cleanText(
      payload.goal || btwThread?.mergeProposal?.summary || prDraft?.body || title,
      1200,
    );

    const rawPatches = Array.isArray(payload.filePatches) ? payload.filePatches : [];
    if (rawPatches.length > MAX_PATCHES_PER_PROPOSAL) {
      const err = new Error(`Too many filePatches (max ${MAX_PATCHES_PER_PROPOSAL})`);
      err.statusCode = 400;
      throw err;
    }

    const filePatches = [];
    for (const rawPatch of rawPatches) {
      const cleanPath = validateEvolutionPatchPath(rawPatch?.path, this.repoDir);
      const op = String(rawPatch?.op || 'write').trim().toLowerCase() === 'delete' ? 'delete' : 'write';
      let content = '';
      if (op === 'write') {
        content = typeof rawPatch?.content === 'string' ? rawPatch.content : '';
        if (Buffer.byteLength(content, 'utf8') > MAX_PATCH_CONTENT_BYTES) {
          const err = new Error(`Patch content exceeds 256KB limit for ${cleanPath}`);
          err.statusCode = 400;
          throw err;
        }
        const secretHits = scanPatchContentForSecrets(content);
        if (secretHits.length > 0) {
          const err = new Error(`Blocked patch for "${cleanPath}": detected forbidden secret pattern (${secretHits.join(', ')})`);
          err.statusCode = 400;
          throw err;
        }
      }
      filePatches.push({
        path: cleanPath,
        op,
        content,
        layer: classifyChangedFile(cleanPath),
      });
    }

    const rawTargetFiles = Array.isArray(payload.targetFiles) ? payload.targetFiles : [];
    const validatedExtraFiles = rawTargetFiles.map((filePath) => validateEvolutionPatchPath(filePath, this.repoDir));
    const targetFiles = [...new Set([...filePatches.map((p) => p.path), ...validatedExtraFiles])];

    const id = `evo_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const defaultBranch = `evolve/${slugify(title, 'patch')}-${id.slice(-4)}`;
    const branch = validateEvolutionBranch(payload.branch || prDraft?.branch || defaultBranch);
    const rawBaseBranch = String(payload.baseBranch || prDraft?.baseBranch || this.config?.updates?.branch || 'main').trim();
    if (!GIT_REF_RE.test(rawBaseBranch)) {
      const err = new Error(`Invalid base branch: ${rawBaseBranch}`);
      err.statusCode = 400;
      throw err;
    }

    const changedFiles = targetFiles.map((filePath) => ({
      status: 'M',
      path: filePath,
      oldPath: null,
      layer: classifyChangedFile(filePath),
    }));
    const plan = buildIncrementalPlan(changedFiles);
    const hotSwapLayers = new Set(['module-hot-swap', 'agent-declarative']);
    const allPatchesHotLayer = filePatches.length > 0 && filePatches.every((patch) => hotSwapLayers.has(patch.layer));
    const hotSwappable = Boolean(
      allPatchesHotLayer
      || plan.strategy === 'module-hot-swap'
      || (plan.strategy === 'hot-reload' && !plan.requiresRestart && !plan.requiresFrontendBuild),
    );
    const primaryLayer = changedFiles[0]?.layer || (payload.targetLayer ? String(payload.targetLayer) : 'module-hot-swap');

    const preflight = evaluateAiPreflight(
      {
        actionType: hotSwappable ? 'module-hot-swap' : 'self-evolution',
        target: title,
        summary: goal,
        files: targetFiles,
        worktreeBranch: branch,
      },
      {
        config: this.config,
        snapshot,
        a2aState: this.a2aOrchestrator?.getState?.() || null,
        mcpFleetSummary: mcpSummary,
      },
    );

    const nowIso = new Date().toISOString();
    const proposal = {
      id,
      title,
      goal,
      status: 'preflight_checked',
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: actor,
      btwThreadId,
      sessionId: payload.sessionId || btwThread?.sessionId || null,
      taskId: payload.taskId || btwThread?.taskId || null,
      baseBranch: rawBaseBranch,
      branch,
      primaryLayer,
      targetFiles,
      filePatches,
      plan,
      hotSwappable,
      preflight,
      sandbox: null,
      verification: null,
      pr: null,
      applyResult: null,
      rollbackBackup: [],
      lastError: null,
      timeline: [
        {
          ts: nowIso,
          stage: 'preflight_checked',
          actor,
          detail: `verdict=${preflight.verdict}, strategy=${plan.strategy}, hotSwappable=${hotSwappable}`,
        },
      ],
    };

    this.proposals.set(id, proposal);
    await this._persist();
    this._emitUpdated('created', proposal);
    return { ok: true, proposal: this._serializeProposal(proposal) };
  }

  async prepareSandbox(proposalId, { actor = 'web' } = {}) {
    this._guardWritable();
    const proposal = this.getProposal(proposalId);
    if (proposal.preflight?.verdict === 'block') {
      const err = new Error('Proposal is blocked by AI preflight checks and cannot create a sandbox');
      err.statusCode = 409;
      throw err;
    }
    if (!Array.isArray(proposal.filePatches) || proposal.filePatches.length === 0) {
      const err = new Error('Proposal has no filePatches to materialize into a worktree sandbox');
      err.statusCode = 400;
      throw err;
    }

    const sandboxDir = path.join(this.worktreesDir, `evolve-${proposal.id.replace(/[^a-zA-Z0-9._-]/g, '-')}`);
    await fsp.mkdir(this.worktreesDir, { recursive: true, mode: 0o700 });

    if (fs.existsSync(sandboxDir)) {
      await this._git(['worktree', 'remove', '--force', sandboxDir]).catch(() => {});
      await fsp.rm(sandboxDir, { recursive: true, force: true }).catch(() => {});
      await this._git(['worktree', 'prune']).catch(() => {});
    }

    let baseRef = proposal.baseBranch;
    try {
      await this._git(['rev-parse', '--verify', `${baseRef}^{commit}`]);
    } catch {
      baseRef = 'HEAD';
    }

    const branchExists = await this._git(['rev-parse', '--verify', `refs/heads/${proposal.branch}`])
      .then(() => true)
      .catch(() => false);
    if (branchExists) {
      await this._git(['worktree', 'add', sandboxDir, proposal.branch]);
    } else {
      await this._git(['worktree', 'add', '-b', proposal.branch, sandboxDir, baseRef]);
    }

    for (const patch of proposal.filePatches) {
      const cleanPath = validateEvolutionPatchPath(patch.path, sandboxDir);
      const dest = path.resolve(sandboxDir, cleanPath);
      if (patch.op === 'delete') {
        await fsp.rm(dest, { force: true });
      } else {
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.writeFile(dest, patch.content, 'utf8');
      }
    }

    const [statusRes, diffRes] = await Promise.all([
      this._git(['status', '--short'], { cwd: sandboxDir }),
      this._git(['diff', '--stat'], { cwd: sandboxDir }),
    ]);

    const nowIso = new Date().toISOString();
    proposal.sandbox = {
      path: sandboxDir,
      relPath: path.relative(this.repoDir, sandboxDir).replace(/\\/g, '/'),
      branch: proposal.branch,
      baseRef,
      statusShort: cleanText(statusRes.stdout, 1200),
      diffStat: cleanText(diffRes.stdout, 1200),
      preparedAt: nowIso,
    };
    proposal.status = 'sandbox_ready';
    proposal.updatedAt = nowIso;
    proposal.lastError = null;
    proposal.timeline.unshift({
      ts: nowIso,
      stage: 'sandbox_ready',
      actor,
      detail: `worktree=${proposal.sandbox.relPath}, patches=${proposal.filePatches.length}`,
    });

    await this._persist();
    this._emitUpdated('sandbox_ready', proposal);
    return { ok: true, proposal: this._serializeProposal(proposal) };
  }

  async verifyProposal(proposalId, { actor = 'web', runRepoCheck = false } = {}) {
    this._guardWritable();
    const proposal = this.getProposal(proposalId);
    if (!proposal.sandbox?.path || !fs.existsSync(proposal.sandbox.path)) {
      const err = new Error('Sandbox worktree is not ready; run sandbox preparation first');
      err.statusCode = 409;
      throw err;
    }

    const startedAt = Date.now();
    let checks = [];
    let allPassed = true;

    if (this.verifyRunner) {
      const custom = await this.verifyRunner(proposal);
      checks = Array.isArray(custom?.checks) ? custom.checks : [];
      allPassed = Boolean(custom?.ok);
    } else {
      const sandboxDir = proposal.sandbox.path;
      for (const patch of proposal.filePatches) {
        if (patch.op === 'delete') continue;
        const targetFile = path.resolve(sandboxDir, patch.path);
        if (patch.path.endsWith('.mjs') || patch.path.endsWith('.js')) {
          try {
            await runCmd(process.execPath, ['--check', targetFile], { cwd: sandboxDir, timeout: 15_000 });
            checks.push({ name: `syntax:${patch.path}`, command: `node --check ${patch.path}`, ok: true, output: 'syntax ok' });
            if (patch.layer === 'module-hot-swap' && patch.path.endsWith('.mjs')) {
              const verifyUrl = `${pathToFileURL(targetFile).href}?verify=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              const rawMod = await import(verifyUrl);
              const { manifest, instance } = validateModuleExport(rawMod, path.basename(patch.path, '.mjs'));
              if (instance.init) await instance.init({ moduleId: manifest.id, slot: 'verify', revision: 'sandbox' });
              if (instance.health) {
                const healthRes = await instance.health({ moduleId: manifest.id, slot: 'verify', revision: 'sandbox' });
                if (healthRes === false || (healthRes && typeof healthRes === 'object' && healthRes.ok === false)) {
                  throw new Error(`Module healthcheck failed: ${healthRes?.detail || 'ok=false'}`);
                }
              }
              if (instance.dispose) await Promise.resolve(instance.dispose()).catch(() => {});
              checks.push({
                name: `module-contract:${patch.path}`,
                command: `validateModuleExport(${manifest.id}@${manifest.version})`,
                ok: true,
                output: `manifest & health ok (${manifest.id}@${manifest.version})`,
              });
            }
          } catch (err) {
            allPassed = false;
            checks.push({
              name: `syntax:${patch.path}`,
              command: `node --check ${patch.path}`,
              ok: false,
              output: cleanText(err.stderr || err.message, 400),
            });
          }
        } else if (patch.path.endsWith('.json')) {
          try {
            const raw = await fsp.readFile(targetFile, 'utf8');
            const parsedJson = JSON.parse(raw);
            if (/\.agent\.json$/i.test(patch.path)) {
              const manifest = validateDeclarativeAgentManifest(parsedJson, path.basename(patch.path).replace(/\.agent\.json$/i, ''));
              checks.push({
                name: `agent-manifest:${patch.path}`,
                command: `validateDeclarativeAgentManifest(${manifest.id})`,
                ok: true,
                output: `declarative agent valid (${manifest.id})`,
              });
            } else {
              checks.push({ name: `json:${patch.path}`, command: `JSON.parse(${patch.path})`, ok: true, output: 'valid json' });
            }
          } catch (err) {
            allPassed = false;
            checks.push({
              name: `json:${patch.path}`,
              command: `JSON.parse(${patch.path})`,
              ok: false,
              output: cleanText(err.message, 400),
            });
          }
        }
      }

      if (runRepoCheck && fs.existsSync(path.join(sandboxDir, 'scripts', 'check.mjs'))) {
        try {
          const checkRes = await runCmd(process.execPath, ['scripts/check.mjs'], { cwd: sandboxDir, timeout: 60_000 });
          checks.push({
            name: 'repo-check',
            command: 'node scripts/check.mjs',
            ok: true,
            output: cleanText(checkRes.stdout, 400),
          });
        } catch (err) {
          allPassed = false;
          checks.push({
            name: 'repo-check',
            command: 'node scripts/check.mjs',
            ok: false,
            output: cleanText(err.stderr || err.stdout || err.message, 400),
          });
        }
      }

      if (checks.length === 0) {
        checks.push({
          name: 'patch-integrity',
          command: 'internal',
          ok: true,
          output: `verified ${proposal.filePatches.length} file patch(es)`,
        });
      }
    }

    const nowIso = new Date().toISOString();
    proposal.verification = {
      ok: allPassed,
      checkedAt: nowIso,
      durationMs: Date.now() - startedAt,
      checks,
    };
    proposal.status = allPassed ? 'verified' : 'failed';
    proposal.updatedAt = nowIso;
    proposal.lastError = allPassed ? null : (checks.find((c) => !c.ok)?.output || 'Verification failed');
    proposal.timeline.unshift({
      ts: nowIso,
      stage: proposal.status,
      actor,
      detail: allPassed ? `${checks.length} check(s) passed` : `failed: ${proposal.lastError}`,
    });

    await this._persist();
    this._emitUpdated('verified', proposal);
    return { ok: true, verified: allPassed, proposal: this._serializeProposal(proposal) };
  }

  async publishProposalPr(proposalId, {
    confirmToken = '',
    pushRemote = true,
    createPr = true,
    draft = false,
    remote = null,
    actor = 'web',
  } = {}) {
    this._guardWritable();
    const proposal = this.getProposal(proposalId);
    if (proposal.status !== 'verified' && proposal.status !== 'pr_opened') {
      const err = new Error(`Proposal must pass verification before publishing a PR (current: ${proposal.status})`);
      err.statusCode = 409;
      throw err;
    }
    if (!proposal.sandbox?.path || !fs.existsSync(proposal.sandbox.path)) {
      const err = new Error('Sandbox worktree is missing; re-prepare and verify first');
      err.statusCode = 409;
      throw err;
    }
    this._requireConfirmIfNeeded('publish-pr', confirmToken);

    const sandboxDir = proposal.sandbox.path;
    const cleanRemote = String(remote || this.config?.updates?.remote || 'origin').trim();
    if (!GIT_REMOTE_RE.test(cleanRemote)) {
      const err = new Error(`Invalid git remote name: ${cleanRemote}`);
      err.statusCode = 400;
      throw err;
    }
    const pathsToStage = proposal.filePatches.map((patch) => patch.path);
    await this._git(['add', '--', ...pathsToStage], { cwd: sandboxDir });

    let commitSha;
    const stagedStatus = await this._git(['status', '--porcelain'], { cwd: sandboxDir });
    if (stagedStatus.stdout.trim()) {
      const commitMsg = `evolve: ${proposal.title}`;
      await this._git(
        ['-c', 'user.name=Ops Console Evolution', '-c', 'user.email=ops-evolution@example.com', 'commit', '-m', commitMsg],
        { cwd: sandboxDir },
      );
    }
    const shaRes = await this._git(['rev-parse', 'HEAD'], { cwd: sandboxDir });
    commitSha = shaRes.stdout.trim();

    let prNumber = null;
    let prUrl = null;
    let pushed = false;
    if (this.prPublisher) {
      const published = await this.prPublisher({
        proposal,
        sandboxDir,
        commitSha,
        remote: cleanRemote,
        pushRemote,
        createPr,
        draft,
      });
      prNumber = published?.number ?? null;
      prUrl = published?.url || null;
      pushed = Boolean(published?.pushed ?? pushRemote);
    } else {
      if (pushRemote) {
        await this._git(['push', '-u', cleanRemote, proposal.branch], { cwd: sandboxDir, timeout: 45_000 });
        pushed = true;
      }
      if (createPr && pushed) {
        const body = [
          '## Self-Evolution Proposal',
          `- Proposal ID: \`${proposal.id}\``,
          `- Strategy: \`${proposal.plan.strategy}\` (hotSwappable: \`${proposal.hotSwappable}\`)`,
          `- Goal: ${proposal.goal}`,
          ...(proposal.btwThreadId ? [`- Source BTW Thread: \`${proposal.btwThreadId}\``] : []),
          '',
          '## Target Files',
          ...proposal.targetFiles.map((f) => `- \`${f}\``),
        ].join('\n');
        const ghArgs = [
          'pr',
          'create',
          '--base',
          proposal.baseBranch,
          '--head',
          proposal.branch,
          '--title',
          proposal.title,
          '--body',
          body,
        ];
        if (draft) ghArgs.push('--draft');
        const prRes = await runCmd('gh', ghArgs, { cwd: sandboxDir, timeout: 45_000 });
        const parsed = parsePrUrl(prRes.stdout);
        prNumber = parsed.number;
        prUrl = parsed.url;
      }
    }

    const nowIso = new Date().toISOString();
    proposal.pr = {
      number: prNumber,
      url: prUrl,
      branch: proposal.branch,
      baseBranch: proposal.baseBranch,
      commitSha,
      shortSha: commitSha.slice(0, 8),
      pushed,
      draft: Boolean(draft),
      publishedAt: nowIso,
    };
    proposal.status = 'pr_opened';
    proposal.updatedAt = nowIso;
    proposal.lastError = null;
    proposal.timeline.unshift({
      ts: nowIso,
      stage: 'pr_opened',
      actor,
      detail: prUrl ? `PR #${prNumber || '?'} ${prUrl}` : `committed ${commitSha.slice(0, 8)} on ${proposal.branch}`,
    });

    await this._persist();
    this._emitUpdated('pr_opened', proposal);
    return { ok: true, proposal: this._serializeProposal(proposal) };
  }

  async _restoreHotSwapBackup(backupList = []) {
    for (const item of backupList) {
      const dest = path.resolve(this.repoDir, item.path);
      if (item.existed) {
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.writeFile(dest, item.content, 'utf8');
      } else {
        await fsp.rm(dest, { force: true }).catch(() => {});
      }
    }
  }

  async applyProposal(proposalId, {
    confirmToken = '',
    applyMode = 'auto',
    autoRestart = false,
    actor = 'web',
  } = {}) {
    this._guardWritable();
    const proposal = this.getProposal(proposalId);
    if (proposal.status !== 'verified' && proposal.status !== 'pr_opened') {
      const err = new Error(`Proposal must be verified or pr_opened before apply (current: ${proposal.status})`);
      err.statusCode = 409;
      throw err;
    }
    this._requireConfirmIfNeeded('apply', confirmToken);

    const hotLayers = new Set(['module-hot-swap', 'agent-declarative']);
    const canHotSwapFiles = proposal.filePatches.length > 0
      && proposal.filePatches.every((patch) => hotLayers.has(patch.layer));
    const resolvedMode = applyMode === 'git-pull'
      ? 'git-pull'
      : (applyMode === 'hot-swap' || (applyMode === 'auto' && canHotSwapFiles))
        ? 'hot-swap'
        : 'git-pull';

    const prMeta = {
      prNumber: proposal.pr?.number ?? null,
      prUrl: proposal.pr?.url ?? null,
      branch: proposal.branch,
    };

    if (resolvedMode === 'hot-swap') {
      if (!canHotSwapFiles) {
        const err = new Error('Hot-swap apply only permits module-hot-swap and agent-declarative patches; core changes require PR merge + git-pull');
        err.statusCode = 409;
        throw err;
      }
      const backup = [];
      for (const patch of proposal.filePatches) {
        const cleanPath = validateEvolutionPatchPath(patch.path, this.repoDir);
        const dest = path.resolve(this.repoDir, cleanPath);
        if (fs.existsSync(dest)) {
          backup.push({ path: cleanPath, existed: true, content: await fsp.readFile(dest, 'utf8') });
        } else {
          backup.push({ path: cleanPath, existed: false, content: '' });
        }
      }

      for (const patch of proposal.filePatches) {
        const cleanPath = validateEvolutionPatchPath(patch.path, this.repoDir);
        const dest = path.resolve(this.repoDir, cleanPath);
        if (patch.op === 'delete') {
          await fsp.rm(dest, { force: true });
        } else {
          await fsp.mkdir(path.dirname(dest), { recursive: true });
          const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
          await fsp.writeFile(tmp, patch.content, 'utf8');
          await fsp.rename(tmp, dest);
        }
      }

      const scopes = [];
      if (proposal.filePatches.some((patch) => patch.layer === 'module-hot-swap')) scopes.push('module-hot-swap');
      if (proposal.filePatches.some((patch) => patch.layer === 'agent-declarative')) scopes.push('agent-declarative');

      let reloadResult = null;
      try {
        if (this.updater) {
          reloadResult = await this.updater.hotReload({
            scopes,
            force: true,
            reason: `self-evolution:${proposal.id}`,
            actor,
            bypassReadOnly: true,
            prMeta,
          });
          const modErrors = reloadResult?.results?.['module-hot-swap']?.errors || [];
          const declErrors = reloadResult?.results?.['agent-declarative']?.errors || [];
          if (modErrors.length > 0 || declErrors.length > 0) {
            const firstErr = modErrors[0]?.error || declErrors[0]?.error || 'Hot-swap reload failed';
            const err = new Error(firstErr);
            err.statusCode = 422;
            throw err;
          }
        } else if (this.moduleHost) {
          if (scopes.includes('module-hot-swap')) {
            reloadResult = await this.moduleHost.reloadAllModules({ force: true, strict: true, reason: 'self-evolution', actor, prMeta });
          }
          if (scopes.includes('agent-declarative')) {
            await this.moduleHost.syncDeclarativeAgents({ force: true, reason: 'self-evolution', actor, prMeta });
          }
        }
      } catch (err) {
        await this._restoreHotSwapBackup(backup);
        if (this.updater) {
          await this.updater.hotReload({ scopes, force: true, reason: 'self-evolution-auto-rollback', actor, bypassReadOnly: true }).catch(() => {});
        }
        proposal.lastError = cleanText(err.message, 280);
        proposal.updatedAt = new Date().toISOString();
        proposal.timeline.unshift({
          ts: proposal.updatedAt,
          stage: 'apply_auto_rolled_back',
          actor,
          detail: proposal.lastError,
        });
        await this._persist();
        err.autoRolledBack = true;
        throw err;
      }

      this.updater?.emitPrApplied({
        prNumber: proposal.pr?.number ?? null,
        prUrl: proposal.pr?.url ?? null,
        branch: proposal.branch,
        toCommit: proposal.pr?.commitSha || null,
        strategy: 'module-hot-swap',
        hotReloadScopes: scopes,
        restartRequired: false,
      });

      const nowIso = new Date().toISOString();
      proposal.rollbackBackup = backup;
      proposal.applyResult = {
        mode: 'hot-swap',
        scopes,
        restartRequired: false,
        appliedAt: nowIso,
        reloadSummary: reloadResult?.results || null,
      };
      proposal.status = 'applied';
      proposal.updatedAt = nowIso;
      proposal.lastError = null;
      proposal.timeline.unshift({
        ts: nowIso,
        stage: 'applied',
        actor,
        detail: `hot-swap zero-downtime (${scopes.join(', ')})`,
      });
      await this._persist();
      this._emitUpdated('applied', proposal);
      return { ok: true, mode: 'hot-swap', proposal: this._serializeProposal(proposal), reload: reloadResult };
    }

    if (!this.updater) {
      const err = new Error('IncrementalUpdater is required for git-pull apply mode');
      err.statusCode = 500;
      throw err;
    }
    const applyRes = await this.updater.applyIncrementalUpdate({
      branch: proposal.baseBranch,
      bypassConfirm: true,
      autoRestart,
      actor,
      prMeta,
    });
    const nowIso = new Date().toISOString();
    proposal.applyResult = {
      mode: 'git-pull',
      fromCommit: applyRes.fromCommit || null,
      toCommit: applyRes.toCommit || null,
      restartRequired: Boolean(applyRes.restartRequired),
      appliedAt: nowIso,
    };
    proposal.status = 'applied';
    proposal.updatedAt = nowIso;
    proposal.lastError = null;
    proposal.timeline.unshift({
      ts: nowIso,
      stage: 'applied',
      actor,
      detail: `git-pull ${String(applyRes.toCommit || '').slice(0, 8)}`,
    });
    await this._persist();
    this._emitUpdated('applied', proposal);
    return { ok: true, mode: 'git-pull', proposal: this._serializeProposal(proposal), update: applyRes };
  }

  async rollbackProposal(proposalId, { confirmToken = '', actor = 'web' } = {}) {
    this._guardWritable();
    const proposal = this.getProposal(proposalId);
    if (proposal.status !== 'applied') {
      const err = new Error(`Only applied proposals can be rolled back (current: ${proposal.status})`);
      err.statusCode = 409;
      throw err;
    }
    this._requireConfirmIfNeeded('rollback', confirmToken);

    if (proposal.applyResult?.mode === 'hot-swap') {
      await this._restoreHotSwapBackup(proposal.rollbackBackup || []);
      const scopes = Array.isArray(proposal.applyResult.scopes) && proposal.applyResult.scopes.length > 0
        ? proposal.applyResult.scopes
        : ['module-hot-swap', 'agent-declarative'];
      if (this.updater) {
        await this.updater.hotReload({
          scopes,
          force: true,
          reason: `evolution-rollback:${proposal.id}`,
          actor,
          bypassReadOnly: true,
        });
      } else if (this.moduleHost) {
        if (scopes.includes('module-hot-swap')) await this.moduleHost.reloadAllModules({ force: true, reason: 'rollback', actor });
        if (scopes.includes('agent-declarative')) await this.moduleHost.syncDeclarativeAgents({ force: true, reason: 'rollback', actor });
      }
    } else if (proposal.applyResult?.fromCommit && this.updater) {
      await this.updater.rollbackToCommit({
        commit: proposal.applyResult.fromCommit,
        bypassConfirm: true,
        actor,
      });
    } else {
      const err = new Error('No rollback state available for this proposal');
      err.statusCode = 409;
      throw err;
    }

    const nowIso = new Date().toISOString();
    proposal.status = 'rolled_back';
    proposal.updatedAt = nowIso;
    proposal.timeline.unshift({
      ts: nowIso,
      stage: 'rolled_back',
      actor,
      detail: `rolled back (${proposal.applyResult?.mode || 'unknown'})`,
    });
    await this._persist();
    this._emitUpdated('rolled_back', proposal);
    return { ok: true, proposal: this._serializeProposal(proposal) };
  }

  async cleanupSandbox(proposalId, { actor = 'web' } = {}) {
    this._guardWritable();
    const proposal = this.getProposal(proposalId);
    const sandboxDir = proposal.sandbox?.path;
    if (sandboxDir) {
      await this._git(['worktree', 'remove', '--force', sandboxDir]).catch(() => {});
      await fsp.rm(sandboxDir, { recursive: true, force: true }).catch(() => {});
      await this._git(['worktree', 'prune']).catch(() => {});
    }
    const nowIso = new Date().toISOString();
    if (proposal.sandbox) {
      proposal.sandbox = {
        ...proposal.sandbox,
        cleanedAt: nowIso,
      };
    }
    proposal.updatedAt = nowIso;
    proposal.timeline.unshift({
      ts: nowIso,
      stage: 'sandbox_cleaned',
      actor,
      detail: 'isolated worktree removed',
    });
    await this._persist();
    this._emitUpdated('sandbox_cleaned', proposal);
    return { ok: true, proposal: this._serializeProposal(proposal) };
  }
}
