import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  APP_VERSION,
  applyHotConfigUpdate,
  GIT_REF_RE,
  GIT_REMOTE_RE,
  loadConfig,
  PACKAGE_ROOT,
} from './config.mjs';
import { runCmd } from './exec.mjs';
import { redactText } from './redact.mjs';

const COMMIT_SHA_RE = /^[0-9a-f]{7,40}$/i;
const ALLOWED_CONFIRM_ACTIONS = new Set(['apply', 'rollback', 'restart']);
const ALLOWED_RELOAD_SCOPES = new Set([
  'config',
  'plugins',
  'assets',
  'agent-declarative',
  'module-hot-swap',
]);
const MAX_HISTORY_ENTRIES = 50;
const CONTENT_HASH_FILES = new Set(['index.html', 'styles.css', 'sw.js', 'manifest.webmanifest']);

export const RESERVED_UPDATE_LAYERS = Object.freeze(['agent-declarative', 'module-hot-swap']);
export const RESERVED_UPDATE_SSE_EVENTS = Object.freeze(['module_reloaded', 'pr_applied']);

export function classifyChangedFile(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized) return 'docs';
  if (
    normalized === 'package.json'
    || normalized === 'package-lock.json'
    || normalized === 'bun.lock'
    || normalized === 'probe/package.json'
  ) {
    return 'deps';
  }
  if (
    normalized.startsWith('agents/')
    || normalized.startsWith('config/agents/')
    || /^skills\/[^/]+\/SKILL\.md$/i.test(normalized)
    || /\.(?:agent\.json|agent\.ya?ml|prompt\.md)$/i.test(normalized)
  ) {
    return 'agent-declarative';
  }
  if (
    normalized.startsWith('src/modules/')
    || normalized.startsWith('src/agent-modules/')
    || normalized.startsWith('web/modules/agent-')
  ) {
    return 'module-hot-swap';
  }
  if (normalized === 'server.mjs' || normalized.startsWith('src/') || normalized.startsWith('bin/')) {
    return 'backend';
  }
  if (
    normalized.startsWith('web/')
    || normalized.startsWith('public/')
    || normalized === 'vite.config.ts'
    || normalized === 'tsconfig.json'
  ) {
    return 'frontend';
  }
  if (normalized.startsWith('plugins/')) {
    return 'plugins';
  }
  if (normalized.startsWith('probe/')) {
    return 'probe';
  }
  if (
    normalized === 'ops-console.config.example.json'
    || normalized.startsWith('deploy/')
    || normalized === 'Dockerfile'
    || normalized === 'docker-compose.yml'
  ) {
    return 'config';
  }
  return 'docs';
}

export function parseGitNameStatus(stdout) {
  const lines = String(stdout || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;
    const rawStatus = parts[0].trim();
    const statusCode = rawStatus[0] || 'M';
    if ((statusCode === 'R' || statusCode === 'C') && parts.length >= 3) {
      const oldPath = parts[1].trim();
      const nextPath = parts[2].trim();
      items.push({
        status: statusCode,
        path: nextPath,
        oldPath,
        layer: classifyChangedFile(nextPath),
      });
    } else {
      const targetPath = parts[1].trim();
      items.push({
        status: statusCode,
        path: targetPath,
        oldPath: null,
        layer: classifyChangedFile(targetPath),
      });
    }
  }
  return items;
}

export function buildIncrementalPlan(changedFiles = [], options = {}) {
  const files = Array.isArray(changedFiles) ? changedFiles : [];
  const counts = {
    frontend: 0,
    backend: 0,
    plugins: 0,
    deps: 0,
    config: 0,
    probe: 0,
    docs: 0,
    'agent-declarative': 0,
    'module-hot-swap': 0,
  };

  let frontendSourceChanged = false;
  let publicAssetsIncluded = false;

  for (const item of files) {
    const filePath = typeof item === 'string' ? item : item?.path || '';
    const layer = (typeof item === 'object' && item?.layer) ? item.layer : classifyChangedFile(filePath);
    if (Object.prototype.hasOwnProperty.call(counts, layer)) {
      counts[layer] += 1;
    } else {
      counts.docs += 1;
    }
    const normalized = String(filePath).replace(/\\/g, '/').replace(/^\.\//, '');
    if (normalized.startsWith('web/') || normalized === 'vite.config.ts') {
      frontendSourceChanged = true;
    }
    if (normalized === 'public/index.html' || normalized.startsWith('public/assets/') || normalized === 'public/styles.css') {
      publicAssetsIncluded = true;
    }
  }

  const needsDepsSync = counts.deps > 0;
  const needsFrontendBuild = Boolean(options.rebuildFrontend) || (frontendSourceChanged && !publicAssetsIncluded);
  const requiresRestart = counts.backend > 0;
  const hotReloadScopes = [];

  if (counts.frontend > 0 || needsFrontendBuild) hotReloadScopes.push('assets');
  if (counts.plugins > 0) hotReloadScopes.push('plugins');
  if (counts.config > 0) hotReloadScopes.push('config');
  if (counts['agent-declarative'] > 0) hotReloadScopes.push('agent-declarative');
  if (counts['module-hot-swap'] > 0) hotReloadScopes.push('module-hot-swap');

  let strategy = 'noop';
  if (files.length === 0) {
    strategy = 'noop';
  } else if (requiresRestart) {
    strategy = 'rolling-restart';
  } else if (counts['module-hot-swap'] > 0 && !needsFrontendBuild && !needsDepsSync) {
    strategy = 'module-hot-swap';
  } else if (needsFrontendBuild || needsDepsSync) {
    strategy = 'hot-reload-with-build';
  } else {
    strategy = 'hot-reload';
  }

  const hotReloadOnly = !requiresRestart;
  const summaryParts = [];
  if (files.length === 0) {
    summaryParts.push('无增量变更');
  } else {
    if (counts.frontend > 0) summaryParts.push(`前端 ${counts.frontend}`);
    if (counts.plugins > 0) summaryParts.push(`插件 ${counts.plugins}`);
    if (counts['agent-declarative'] > 0) summaryParts.push(`声明式Agent ${counts['agent-declarative']}`);
    if (counts['module-hot-swap'] > 0) summaryParts.push(`热切模块 ${counts['module-hot-swap']}`);
    if (counts.backend > 0) summaryParts.push(`后端核心 ${counts.backend}`);
    if (counts.deps > 0) summaryParts.push(`依赖 ${counts.deps}`);
    if (counts.config > 0) summaryParts.push(`配置 ${counts.config}`);
    if (counts.probe > 0) summaryParts.push(`探针 ${counts.probe}`);
    if (counts.docs > 0) summaryParts.push(`文档 ${counts.docs}`);
  }

  return {
    totalFiles: files.length,
    counts,
    strategy,
    hotReloadOnly,
    hotReloadScopes,
    needsDepsSync,
    needsFrontendBuild,
    requiresRestart,
    summary: summaryParts.join(' · '),
  };
}

function parseCommitLog(stdout) {
  return String(stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha = '', shortSha = '', date = '', ...rest] = line.split('\t');
      return {
        sha: sha.trim(),
        shortSha: shortSha.trim() || sha.trim().slice(0, 8),
        date: date.trim(),
        subject: redactText(rest.join('\t').trim()).slice(0, 160),
      };
    })
    .filter((entry) => Boolean(entry.sha));
}

export class IncrementalUpdater {
  constructor({
    config,
    logger,
    cache = null,
    pluginManager = null,
    eventBus = null,
    repoDir = PACKAGE_ROOT,
    publicDir = null,
    supervised = false,
    onAssetsInvalidated = null,
    onConfigReloaded = null,
    onDeclarativeReload = null,
    onModuleReload = null,
    onRestartRequested = null,
  } = {}) {
    this.config = config;
    this.logger = logger;
    this.cache = cache;
    this.pluginManager = pluginManager;
    this.eventBus = eventBus;
    this.repoDir = path.resolve(repoDir || PACKAGE_ROOT);
    this.publicDir = path.resolve(publicDir || path.join(this.repoDir, 'public'));
    this.supervised = Boolean(supervised);
    this.onAssetsInvalidated = onAssetsInvalidated;
    this.onConfigReloaded = onConfigReloaded;
    this.onDeclarativeReload = onDeclarativeReload;
    this.onModuleReload = onModuleReload;
    this.onRestartRequested = onRestartRequested;

    this.historyPath = path.join(this.config?.console?.dataDir || path.join(this.repoDir, 'data'), 'update-history.json');
    this.history = [];
    this.confirmTokens = new Map();
    this.watchers = new Map();
    this.debounceTimers = new Map();
    this.autoCheckTimer = null;
    this.inFlight = null;

    this.assetsRevision = 'init';
    this.assetsFileCount = 0;
    this.reloadCount = 0;
    this.lastReload = null;
    this.lastCheck = null;
    this.currentCommit = null;
    this.currentBranch = null;
    this.pendingRestart = false;
    this.pendingRestartReason = '';
    this.lastPrApplied = null;
    this.lastModuleReload = null;
  }

  async init() {
    await this._loadHistory();
    await this.computeAssetsRevision();
    const git = await this.getGitInfo();
    if (git.isGitRepo) {
      this.currentCommit = git.commit;
      this.currentBranch = git.branch;
    }
    if (this.config?.updates?.enabled !== false) {
      this.startWatchers();
      this._configureAutoCheck();
    }
    return this.getStatus();
  }

  _guardWritable(bypassReadOnly = false) {
    if (!bypassReadOnly && this.config?.console?.readOnly) {
      const err = new Error('Console is running in read-only mode');
      err.statusCode = 403;
      throw err;
    }
  }

  _guardEnabled() {
    if (this.config?.updates?.enabled === false) {
      const err = new Error('Incremental updates are disabled by updates.enabled=false');
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
    if (!ALLOWED_CONFIRM_ACTIONS.has(cleanAction)) {
      const err = new Error(`Unsupported update confirm action: ${action}`);
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
      const err = new Error(`Update action "${action}" requires a single-use confirmToken`);
      err.statusCode = 409;
      err.requiresConfirm = true;
      throw err;
    }
  }

  async _loadHistory() {
    try {
      const raw = await fsp.readFile(this.historyPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.history = parsed.slice(0, MAX_HISTORY_ENTRIES);
      }
    } catch {
      this.history = [];
    }
  }

  async _recordHistory(entry) {
    const item = {
      id: `upd_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      ts: new Date().toISOString(),
      ...entry,
    };
    this.history.unshift(item);
    if (this.history.length > MAX_HISTORY_ENTRIES) {
      this.history.length = MAX_HISTORY_ENTRIES;
    }
    try {
      const dir = path.dirname(this.historyPath);
      await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
      await fsp.writeFile(this.historyPath, `${JSON.stringify(this.history, null, 2)}\n`, { mode: 0o600 });
    } catch (err) {
      this.logger?.warn('update_history_persist_failed', { error: redactText(err.message) });
    }
    return item;
  }

  async _git(args, timeout = 15_000) {
    return runCmd('git', args, {
      cwd: this.repoDir,
      timeout,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
  }

  async getGitInfo() {
    try {
      const inside = await this._git(['rev-parse', '--is-inside-work-tree'], 4000);
      if (inside.stdout.trim() !== 'true') {
        return { isGitRepo: false, commit: null, shortCommit: null, branch: null, dirty: false, dirtyCount: 0, dirtyFiles: [] };
      }
      const [headRes, branchRes, statusRes] = await Promise.all([
        this._git(['rev-parse', 'HEAD'], 4000),
        this._git(['rev-parse', '--abbrev-ref', 'HEAD'], 4000),
        this._git(['status', '--porcelain'], 4000),
      ]);
      const commit = headRes.stdout.trim();
      const branch = branchRes.stdout.trim();
      const dirtyLines = statusRes.stdout
        .split('\n')
        .map((line) => line.trimEnd())
        .filter(Boolean);
      return {
        isGitRepo: true,
        commit,
        shortCommit: commit.slice(0, 8),
        branch,
        dirty: dirtyLines.length > 0,
        dirtyCount: dirtyLines.length,
        dirtyFiles: dirtyLines.slice(0, 20),
      };
    } catch {
      return { isGitRepo: false, commit: null, shortCommit: null, branch: null, dirty: false, dirtyCount: 0, dirtyFiles: [] };
    }
  }

  async computeAssetsRevision() {
    const previousRevision = this.assetsRevision;
    const hash = crypto.createHash('sha256');
    let fileCount = 0;

    const scanDir = async (dir, prefix = '') => {
      let entries = [];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await scanDir(full, rel);
        } else if (entry.isFile()) {
          fileCount += 1;
          if (CONTENT_HASH_FILES.has(rel)) {
            try {
              const buf = await fsp.readFile(full);
              hash.update(`file:${rel}:`);
              hash.update(buf);
            } catch {
              // ignore race during build
            }
          } else {
            try {
              const stat = await fsp.stat(full);
              hash.update(`meta:${rel}:${stat.size}:${Math.floor(stat.mtimeMs)}\n`);
            } catch {
              // ignore race
            }
          }
        }
      }
    };

    await scanDir(this.publicDir);
    const revision = fileCount > 0 ? hash.digest('hex').slice(0, 12) : 'empty';
    this.assetsRevision = revision;
    this.assetsFileCount = fileCount;
    return {
      revision,
      previousRevision,
      changed: previousRevision !== 'init' && previousRevision !== revision,
      fileCount,
    };
  }

  async getStatus() {
    const git = await this.getGitInfo();
    if (git.isGitRepo) {
      this.currentCommit = git.commit;
      this.currentBranch = git.branch;
    }
    const updatesCfg = this.config?.updates || {};
    return {
      ok: true,
      version: APP_VERSION,
      demo: Boolean(this.config?.demo),
      readOnly: Boolean(this.config?.console?.readOnly),
      updatesEnabled: updatesCfg.enabled !== false,
      remote: updatesCfg.remote || 'origin',
      branch: updatesCfg.branch || git.branch || 'main',
      configPath: this.config?.configPath || null,
      pluginsDir: this.pluginManager?.pluginsDir || this.config?.plugins?.dir || null,
      publicDir: this.publicDir,
      git,
      assetsRevision: this.assetsRevision,
      assetsFileCount: this.assetsFileCount,
      reloadCount: this.reloadCount,
      hotReloadEnabled: Boolean(updatesCfg.watchConfig || updatesCfg.watchPlugins || updatesCfg.watchPublic),
      watchers: {
        config: this.watchers.has('config'),
        plugins: this.watchers.has('plugins'),
        public: this.watchers.has('public'),
        debounceMs: Number(updatesCfg.watchDebounceMs || 500),
      },
      autoCheckIntervalSec: Number(updatesCfg.autoCheckIntervalSec || 0),
      allowSelfRestart: updatesCfg.allowSelfRestart !== false,
      supervised: this.supervised,
      requireCriticalConfirm: Boolean(this.config?.security?.requireCriticalConfirm),
      pendingRestart: this.pendingRestart,
      pendingRestartReason: this.pendingRestartReason,
      inFlight: this.inFlight,
      lastCheck: this.lastCheck,
      lastReload: this.lastReload,
      lastPrApplied: this.lastPrApplied,
      lastModuleReload: this.lastModuleReload,
      extensionHooks: {
        layers: [...RESERVED_UPDATE_LAYERS],
        sseEvents: [
          ...RESERVED_UPDATE_SSE_EVENTS,
          'assets_updated',
          'config_reloaded',
          'plugins_reloaded',
          'agent_declarative_reloaded',
          'update_applied',
          'update_rolled_back',
          'server_restarting',
        ],
      },
      history: this.history.slice(0, 20),
    };
  }

  _validateGitTarget(remote, branch) {
    const cleanRemote = String(remote || this.config?.updates?.remote || 'origin').trim();
    const cleanBranch = String(branch || this.config?.updates?.branch || this.currentBranch || 'main').trim();
    if (!GIT_REMOTE_RE.test(cleanRemote)) {
      const err = new Error(`Invalid git remote: ${cleanRemote}`);
      err.statusCode = 400;
      throw err;
    }
    if (!GIT_REF_RE.test(cleanBranch)) {
      const err = new Error(`Invalid git branch: ${cleanBranch}`);
      err.statusCode = 400;
      throw err;
    }
    return { remote: cleanRemote, branch: cleanBranch };
  }

  async checkForUpdates({ remote, branch, fetchRemote = true } = {}) {
    this._guardEnabled();
    const target = this._validateGitTarget(remote, branch);
    const checkedAt = new Date().toISOString();

    if (this.config?.demo) {
      const demoResult = {
        ok: true,
        demo: true,
        checkedAt,
        remote: target.remote,
        branch: target.branch,
        isGitRepo: true,
        currentCommit: 'demo0001',
        shortCommit: 'demo0001',
        remoteCommit: 'demo0001',
        shortRemoteCommit: 'demo0001',
        ahead: 0,
        behind: 0,
        hasUpdate: false,
        diverged: false,
        dirty: false,
        dirtyCount: 0,
        dirtyFiles: [],
        commits: [],
        changedFiles: [],
        plan: buildIncrementalPlan([]),
      };
      this.lastCheck = demoResult;
      return demoResult;
    }

    const git = await this.getGitInfo();
    if (!git.isGitRepo) {
      const nonGit = {
        ok: true,
        checkedAt,
        remote: target.remote,
        branch: target.branch,
        isGitRepo: false,
        currentCommit: null,
        shortCommit: null,
        remoteCommit: null,
        shortRemoteCommit: null,
        ahead: 0,
        behind: 0,
        hasUpdate: false,
        diverged: false,
        dirty: false,
        dirtyCount: 0,
        dirtyFiles: [],
        commits: [],
        changedFiles: [],
        plan: buildIncrementalPlan([]),
        note: 'Current directory is not a git checkout; hot-reload still works for config, plugins, and static assets.',
      };
      this.lastCheck = nonGit;
      return nonGit;
    }

    if (fetchRemote) {
      try {
        await this._git(['fetch', '--prune', target.remote, target.branch], 20_000);
      } catch (err) {
        const fetchErr = new Error(`Git fetch failed (${target.remote}/${target.branch}): ${redactText(err.stderr || err.message)}`);
        fetchErr.statusCode = 502;
        throw fetchErr;
      }
    }

    const remoteRef = `${target.remote}/${target.branch}`;
    let remoteCommit = git.commit;
    try {
      const refRes = await this._git(['rev-parse', '--verify', `${remoteRef}^{commit}`], 5000);
      remoteCommit = refRes.stdout.trim();
    } catch {
      const refErr = new Error(`Remote ref not found: ${remoteRef}`);
      refErr.statusCode = 404;
      throw refErr;
    }

    const countRes = await this._git(['rev-list', '--left-right', '--count', `HEAD...${remoteRef}`], 5000);
    const [aheadRaw = '0', behindRaw = '0'] = countRes.stdout.trim().split(/\s+/);
    const ahead = Number(aheadRaw) || 0;
    const behind = Number(behindRaw) || 0;

    let changedFiles = [];
    let commits = [];
    if (behind > 0) {
      const [diffRes, logRes] = await Promise.all([
        this._git(['diff', '--name-status', `HEAD..${remoteRef}`], 10_000),
        this._git(['log', '--format=%H%x09%h%x09%aI%x09%s', '-n', '20', `HEAD..${remoteRef}`], 10_000),
      ]);
      changedFiles = parseGitNameStatus(diffRes.stdout);
      commits = parseCommitLog(logRes.stdout);
    }

    const plan = buildIncrementalPlan(changedFiles);
    const result = {
      ok: true,
      checkedAt,
      remote: target.remote,
      branch: target.branch,
      isGitRepo: true,
      currentCommit: git.commit,
      shortCommit: git.shortCommit,
      remoteCommit,
      shortRemoteCommit: remoteCommit.slice(0, 8),
      ahead,
      behind,
      hasUpdate: behind > 0,
      diverged: ahead > 0 && behind > 0,
      dirty: git.dirty,
      dirtyCount: git.dirtyCount,
      dirtyFiles: git.dirtyFiles,
      commits,
      changedFiles,
      plan,
    };
    this.lastCheck = result;
    return result;
  }

  emitModuleReloaded(detail = {}) {
    const payload = {
      moduleId: String(detail.moduleId || 'unknown'),
      revision: String(detail.revision || ''),
      prevRevision: detail.prevRevision ? String(detail.prevRevision) : null,
      slot: detail.slot ? String(detail.slot) : null,
      prNumber: detail.prNumber ?? null,
      prUrl: detail.prUrl ? String(detail.prUrl) : null,
      reason: String(detail.reason || 'hot-swap'),
      ts: new Date().toISOString(),
    };
    this.lastModuleReload = payload;
    this.eventBus?.emit('module_reloaded', payload);
    return payload;
  }

  emitPrApplied(detail = {}) {
    const payload = {
      prNumber: detail.prNumber ?? null,
      prUrl: detail.prUrl ? String(detail.prUrl) : null,
      branch: detail.branch ? String(detail.branch) : null,
      fromCommit: detail.fromCommit ? String(detail.fromCommit).slice(0, 8) : null,
      toCommit: detail.toCommit ? String(detail.toCommit).slice(0, 8) : null,
      strategy: String(detail.strategy || 'hot-reload'),
      hotReloadScopes: Array.isArray(detail.hotReloadScopes) ? detail.hotReloadScopes : [],
      restartRequired: Boolean(detail.restartRequired),
      ts: new Date().toISOString(),
    };
    this.lastPrApplied = payload;
    this.eventBus?.emit('pr_applied', payload);
    return payload;
  }

  async hotReload({
    scopes = ['config', 'plugins', 'assets'],
    force = false,
    reason = 'manual',
    actor = 'web',
    bypassReadOnly = false,
    moduleId = null,
    prMeta = null,
  } = {}) {
    this._guardWritable(bypassReadOnly);
    const requested = Array.isArray(scopes) && scopes.length > 0
      ? scopes.map((s) => String(s || '').trim().toLowerCase()).filter((s) => ALLOWED_RELOAD_SCOPES.has(s))
      : ['config', 'plugins', 'assets'];

    if (requested.length === 0) {
      const err = new Error('No valid reload scopes requested (use config, plugins, assets, agent-declarative, module-hot-swap)');
      err.statusCode = 400;
      throw err;
    }

    const startedAt = Date.now();
    const results = {};
    const restartRequiredFields = [];

    if (requested.includes('config')) {
      if (this.config?.configPath && fs.existsSync(this.config.configPath)) {
        const nextConfig = loadConfig({
          cli: { configPath: this.config.configPath },
          env: process.env,
        });
        const diff = applyHotConfigUpdate(this.config, nextConfig);
        if (diff.restartRequiredFields.length > 0) {
          restartRequiredFields.push(...diff.restartRequiredFields);
          this.pendingRestart = true;
          this.pendingRestartReason = `配置字段需要重启生效: ${diff.restartRequiredFields.join(', ')}`;
        }
        this.cache?.invalidate();
        if (typeof this.onConfigReloaded === 'function') {
          await this.onConfigReloaded(diff, this.config);
        }
        this._configureAutoCheck();
        if (diff.changedSections.includes('plugins') || diff.changedSections.includes('updates')) {
          this.restartWatchers();
        }
        results.config = {
          reloaded: true,
          changed: diff.changed,
          changedSections: diff.changedSections,
          restartRequiredFields: diff.restartRequiredFields,
        };
        this.eventBus?.emit('config_reloaded', {
          reason,
          changed: diff.changed,
          changedSections: diff.changedSections,
          restartRequiredFields: diff.restartRequiredFields,
        });
      } else {
        results.config = {
          reloaded: false,
          changed: false,
          changedSections: [],
          restartRequiredFields: [],
          note: 'No external config file configured',
        };
      }
    }

    if (requested.includes('plugins')) {
      if (this.pluginManager) {
        const pluginRes = await this.pluginManager.reloadExternalPlugins({ force });
        this.cache?.invalidate();
        results.plugins = pluginRes;
        this.eventBus?.emit('plugins_reloaded', {
          reason,
          added: pluginRes.added,
          updated: pluginRes.updated,
          removed: pluginRes.removed,
          revision: pluginRes.revision,
        });
        if (pluginRes.added.length > 0 || pluginRes.updated.length > 0 || pluginRes.removed.length > 0 || force) {
          this.eventBus?.emit('plugins_updated', {
            action: 'hot_reload',
            added: pluginRes.added.length,
            updated: pluginRes.updated.length,
            removed: pluginRes.removed.length,
          });
        }
      } else {
        results.plugins = { loaded: [], added: [], updated: [], removed: [], unchanged: [], errors: [], revision: 0 };
      }
    }

    if (requested.includes('assets')) {
      if (typeof this.onAssetsInvalidated === 'function') {
        await this.onAssetsInvalidated();
      }
      const assetInfo = await this.computeAssetsRevision();
      results.assets = assetInfo;
      if (assetInfo.changed || force) {
        this.eventBus?.emit('assets_updated', {
          reason,
          revision: assetInfo.revision,
          previousRevision: assetInfo.previousRevision,
          fileCount: assetInfo.fileCount,
          prNumber: prMeta?.prNumber ?? null,
        });
      }
    }

    if (requested.includes('agent-declarative')) {
      const declRes = typeof this.onDeclarativeReload === 'function'
        ? await this.onDeclarativeReload({ force, reason, actor, prMeta })
        : { reloaded: true, hookBound: false };
      results['agent-declarative'] = declRes;
      this.eventBus?.emit('agent_declarative_reloaded', {
        reason,
        ...(declRes && typeof declRes === 'object' ? declRes : {}),
      });
    }

    if (requested.includes('module-hot-swap')) {
      const modRes = typeof this.onModuleReload === 'function'
        ? await this.onModuleReload({ moduleId, force, reason, actor, prMeta })
        : { moduleId: moduleId || 'agent-core', revision: this.assetsRevision, prevRevision: null, hookBound: false };
      results['module-hot-swap'] = modRes;
      this.emitModuleReloaded({
        moduleId: modRes?.moduleId || moduleId || 'agent-core',
        revision: modRes?.revision || this.assetsRevision,
        prevRevision: modRes?.prevRevision || null,
        slot: modRes?.slot || null,
        prNumber: prMeta?.prNumber ?? null,
        prUrl: prMeta?.prUrl ?? null,
        reason,
      });
    }

    this.reloadCount += 1;
    const summary = {
      ok: true,
      scopes: requested,
      reason,
      actor,
      durationMs: Date.now() - startedAt,
      reloadCount: this.reloadCount,
      assetsRevision: this.assetsRevision,
      restartRequiredFields,
      results,
      ts: new Date().toISOString(),
    };
    this.lastReload = summary;
    this.logger?.info('hot_reload_completed', {
      scopes: requested,
      reason,
      actor,
      durationMs: summary.durationMs,
      assetsRevision: this.assetsRevision,
    });

    if (reason === 'manual' || reason === 'sighup' || reason === 'cli') {
      await this._recordHistory({
        kind: 'hot-reload',
        status: 'reloaded',
        scopes: requested,
        reason,
        actor,
        assetsRevision: this.assetsRevision,
      });
    }

    return summary;
  }

  async _clearStalePublicAssets() {
    const assetsDir = path.join(this.publicDir, 'assets');
    try {
      const entries = await fsp.readdir(assetsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.js')) {
          await fsp.unlink(path.join(assetsDir, entry.name)).catch(() => {});
        }
      }
    } catch {
      // directory may not exist yet
    }
  }

  async applyIncrementalUpdate({
    remote,
    branch,
    confirmToken = '',
    rebuildFrontend = false,
    autoRestart = false,
    actor = 'web',
    prMeta = null,
  } = {}) {
    this._guardWritable();
    this._guardEnabled();
    if (this.inFlight) {
      const err = new Error(`Another update operation is already running: ${this.inFlight}`);
      err.statusCode = 409;
      throw err;
    }
    this._requireConfirmIfNeeded('apply', confirmToken);

    const target = this._validateGitTarget(remote, branch);
    if (this.config?.demo) {
      const reload = await this.hotReload({
        scopes: ['assets', 'plugins'],
        force: true,
        reason: 'demo-apply',
        actor,
        prMeta,
      });
      const record = await this._recordHistory({
        kind: 'incremental-apply',
        status: 'demo_applied',
        remote: target.remote,
        branch: target.branch,
        actor,
      });
      return {
        ok: true,
        demo: true,
        status: 'demo_applied',
        strategy: 'hot-reload',
        reload,
        restartRequired: false,
        restartScheduled: false,
        record,
      };
    }

    this.inFlight = 'apply';
    try {
      const check = await this.checkForUpdates({ remote: target.remote, branch: target.branch, fetchRemote: true });
      if (!check.isGitRepo) {
        const err = new Error('Incremental git apply requires a git checkout');
        err.statusCode = 400;
        throw err;
      }
      if (check.dirty) {
        const err = new Error(`Working tree has ${check.dirtyCount} uncommitted file(s); clean worktree required before apply.`);
        err.statusCode = 409;
        err.dirtyFiles = check.dirtyFiles;
        throw err;
      }
      if (!check.hasUpdate) {
        return {
          ok: true,
          status: 'up-to-date',
          fromCommit: check.currentCommit,
          toCommit: check.currentCommit,
          changedFiles: [],
          plan: check.plan,
          restartRequired: false,
          restartScheduled: false,
        };
      }
      if (check.diverged || check.ahead > 0) {
        const err = new Error(`Local branch is ahead by ${check.ahead} commit(s); fast-forward incremental pull refused.`);
        err.statusCode = 409;
        throw err;
      }

      const plan = buildIncrementalPlan(check.changedFiles, { rebuildFrontend });
      const fromCommit = check.currentCommit;
      const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

      await this._git(['pull', '--ff-only', target.remote, target.branch], 30_000);
      const headRes = await this._git(['rev-parse', 'HEAD'], 5000);
      const toCommit = headRes.stdout.trim();
      this.currentCommit = toCommit;

      const steps = [{ step: 'git-pull-ff', ok: true }];

      if (plan.needsDepsSync) {
        const hasLock = fs.existsSync(path.join(this.repoDir, 'package-lock.json'));
        const npmArgs = hasLock ? ['ci', '--omit=dev'] : ['install', '--omit=dev'];
        await runCmd(npmBin, npmArgs, { cwd: this.repoDir, timeout: 180_000 });
        steps.push({ step: 'deps-sync', ok: true, command: `npm ${npmArgs.join(' ')}` });
      }

      if (plan.needsFrontendBuild) {
        await this._clearStalePublicAssets();
        await runCmd(npmBin, ['run', 'build'], { cwd: this.repoDir, timeout: 180_000 });
        steps.push({ step: 'frontend-build', ok: true });
      }

      const reloadScopes = plan.hotReloadScopes.length > 0
        ? plan.hotReloadScopes
        : ['assets', 'plugins', 'config'];
      const reload = await this.hotReload({
        scopes: reloadScopes,
        force: true,
        reason: 'incremental-apply',
        actor,
        bypassReadOnly: true,
        prMeta,
      });
      steps.push({ step: 'hot-reload', ok: true, scopes: reloadScopes });

      if (plan.requiresRestart) {
        this.pendingRestart = true;
        this.pendingRestartReason = `已增量拉取 ${toCommit.slice(0, 8)}（含后端核心变更），需平滑重启生效`;
      } else {
        this.pendingRestart = false;
        this.pendingRestartReason = '';
      }

      const status = plan.requiresRestart ? 'applied_pending_restart' : 'applied_hot';
      const record = await this._recordHistory({
        kind: 'incremental-apply',
        status,
        remote: target.remote,
        branch: target.branch,
        fromCommit,
        toCommit,
        strategy: plan.strategy,
        changedFilesCount: check.changedFiles.length,
        hotReloadScopes: reloadScopes,
        prNumber: prMeta?.prNumber ?? null,
        prUrl: prMeta?.prUrl ?? null,
        actor,
      });

      this.lastCheck = null;
      this.eventBus?.emit('update_applied', {
        status,
        strategy: plan.strategy,
        fromCommit: fromCommit.slice(0, 8),
        toCommit: toCommit.slice(0, 8),
        changedFilesCount: check.changedFiles.length,
        hotReloadScopes: reloadScopes,
        restartRequired: plan.requiresRestart,
        prNumber: prMeta?.prNumber ?? null,
      });

      if (prMeta && (prMeta.prNumber || prMeta.prUrl)) {
        this.emitPrApplied({
          prNumber: prMeta.prNumber ?? null,
          prUrl: prMeta.prUrl ?? null,
          branch: target.branch,
          fromCommit,
          toCommit,
          strategy: plan.strategy,
          hotReloadScopes: reloadScopes,
          restartRequired: plan.requiresRestart,
        });
      }

      let restartScheduled = false;
      if (plan.requiresRestart && autoRestart && this.config?.updates?.allowSelfRestart !== false) {
        await this.triggerGracefulRestart({
          reason: `incremental-apply:${toCommit.slice(0, 8)}`,
          actor,
          bypassConfirm: true,
        });
        restartScheduled = true;
      }

      return {
        ok: true,
        status,
        fromCommit,
        toCommit,
        changedFiles: check.changedFiles,
        commits: check.commits,
        plan,
        steps,
        reload,
        restartRequired: plan.requiresRestart,
        restartScheduled,
        record,
      };
    } finally {
      this.inFlight = null;
    }
  }

  async rollbackToCommit({
    commit,
    confirmToken = '',
    autoRestart = false,
    actor = 'web',
  } = {}) {
    this._guardWritable();
    this._guardEnabled();
    if (this.inFlight) {
      const err = new Error(`Another update operation is already running: ${this.inFlight}`);
      err.statusCode = 409;
      throw err;
    }
    const cleanCommit = String(commit || '').trim();
    if (!COMMIT_SHA_RE.test(cleanCommit)) {
      const err = new Error('Invalid commit SHA for rollback (expected 7-40 hex chars)');
      err.statusCode = 400;
      throw err;
    }
    this._requireConfirmIfNeeded('rollback', confirmToken);

    this.inFlight = 'rollback';
    try {
      const git = await this.getGitInfo();
      if (!git.isGitRepo) {
        const err = new Error('Rollback requires a git checkout');
        err.statusCode = 400;
        throw err;
      }
      if (git.dirty) {
        const err = new Error(`Working tree has ${git.dirtyCount} uncommitted file(s); clean worktree required before rollback.`);
        err.statusCode = 409;
        err.dirtyFiles = git.dirtyFiles;
        throw err;
      }

      let resolvedCommit;
      try {
        const resolvedRes = await this._git(['rev-parse', '--verify', `${cleanCommit}^{commit}`], 5000);
        resolvedCommit = resolvedRes.stdout.trim();
      } catch {
        const err = new Error(`Commit not found: ${cleanCommit}`);
        err.statusCode = 404;
        throw err;
      }

      const fromCommit = git.commit;
      const diffRes = await this._git(['diff', '--name-status', `${fromCommit}..${resolvedCommit}`], 10_000);
      const changedFiles = parseGitNameStatus(diffRes.stdout);
      const plan = buildIncrementalPlan(changedFiles);

      await this._git(['reset', '--hard', resolvedCommit], 20_000);
      this.currentCommit = resolvedCommit;

      const reload = await this.hotReload({
        scopes: ['assets', 'plugins', 'config'],
        force: true,
        reason: 'rollback',
        actor,
        bypassReadOnly: true,
      });

      if (plan.requiresRestart) {
        this.pendingRestart = true;
        this.pendingRestartReason = `已回滚至 ${resolvedCommit.slice(0, 8)}，需平滑重启后端核心进程`;
      } else {
        this.pendingRestart = false;
        this.pendingRestartReason = '';
      }

      const record = await this._recordHistory({
        kind: 'rollback',
        status: plan.requiresRestart ? 'rolled_back_pending_restart' : 'rolled_back',
        fromCommit,
        toCommit: resolvedCommit,
        changedFilesCount: changedFiles.length,
        actor,
      });

      this.lastCheck = null;
      this.eventBus?.emit('update_rolled_back', {
        fromCommit: fromCommit.slice(0, 8),
        toCommit: resolvedCommit.slice(0, 8),
        restartRequired: plan.requiresRestart,
      });

      let restartScheduled = false;
      if (plan.requiresRestart && autoRestart && this.config?.updates?.allowSelfRestart !== false) {
        await this.triggerGracefulRestart({
          reason: `rollback:${resolvedCommit.slice(0, 8)}`,
          actor,
          bypassConfirm: true,
        });
        restartScheduled = true;
      }

      return {
        ok: true,
        status: plan.requiresRestart ? 'rolled_back_pending_restart' : 'rolled_back',
        fromCommit,
        toCommit: resolvedCommit,
        changedFiles,
        plan,
        reload,
        restartRequired: plan.requiresRestart,
        restartScheduled,
        record,
      };
    } finally {
      this.inFlight = null;
    }
  }

  async triggerGracefulRestart({ confirmToken = '', reason = 'manual', actor = 'web', bypassConfirm = false } = {}) {
    this._guardWritable();
    if (this.config?.updates?.allowSelfRestart === false) {
      const err = new Error('Self-restart is disabled by updates.allowSelfRestart=false');
      err.statusCode = 403;
      throw err;
    }
    if (!bypassConfirm) {
      this._requireConfirmIfNeeded('restart', confirmToken);
    }

    const payload = {
      reason,
      actor,
      supervised: this.supervised,
      commit: this.currentCommit ? this.currentCommit.slice(0, 8) : null,
      ts: new Date().toISOString(),
    };
    this.eventBus?.emit('server_restarting', payload);
    this.logger?.info('graceful_restart_scheduled', payload);

    await this._recordHistory({
      kind: 'graceful-restart',
      status: 'scheduled',
      reason,
      actor,
      supervised: this.supervised,
    });

    if (typeof this.onRestartRequested === 'function' && !this.config?.demo) {
      const timer = setTimeout(() => {
        Promise.resolve(this.onRestartRequested(payload)).catch((err) => {
          this.logger?.error('graceful_restart_failed', { error: redactText(err.message) });
        });
      }, 350);
      timer.unref?.();
    }

    return {
      ok: true,
      scheduled: true,
      demo: Boolean(this.config?.demo),
      ...payload,
    };
  }

  _scheduleDebouncedReload(key, scope) {
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    const debounceMs = Math.min(30_000, Math.max(50, Number(this.config?.updates?.watchDebounceMs || 500)));
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.hotReload({
        scopes: [scope],
        force: scope === 'assets',
        reason: `watch:${key}`,
        actor: 'watcher',
        bypassReadOnly: true,
      }).catch((err) => {
        this.logger?.warn('watch_hot_reload_failed', { key, scope, error: redactText(err.message) });
      });
    }, debounceMs);
    timer.unref?.();
    this.debounceTimers.set(key, timer);
  }

  _watchPath(key, targetPath, scope, { filterBasename = null } = {}) {
    if (!targetPath || !fs.existsSync(targetPath)) return;
    try {
      const watcher = fs.watch(targetPath, { persistent: false }, (_eventType, filename) => {
        if (filterBasename && filename && String(filename) !== filterBasename) return;
        this._scheduleDebouncedReload(key, scope);
      });
      watcher.on('error', (err) => {
        this.logger?.warn('watch_error', { key, error: redactText(err.message) });
      });
      this.watchers.set(key, watcher);
    } catch (err) {
      this.logger?.warn('watch_attach_failed', { key, error: redactText(err.message) });
    }
  }

  startWatchers() {
    this.stopWatchers();
    const updatesCfg = this.config?.updates || {};
    if (updatesCfg.enabled === false) return;

    if (updatesCfg.watchConfig && this.config?.configPath) {
      const cfgDir = path.dirname(this.config.configPath);
      const cfgBase = path.basename(this.config.configPath);
      this._watchPath('config', cfgDir, 'config', { filterBasename: cfgBase });
    }
    if (updatesCfg.watchPlugins) {
      const pluginsDir = this.pluginManager?.pluginsDir || this.config?.plugins?.dir;
      if (pluginsDir && fs.existsSync(pluginsDir)) {
        this._watchPath('plugins', pluginsDir, 'plugins');
      }
    }
    if (updatesCfg.watchPublic && fs.existsSync(this.publicDir)) {
      this._watchPath('public', this.publicDir, 'assets');
      const assetsSub = path.join(this.publicDir, 'assets');
      if (fs.existsSync(assetsSub)) {
        this._watchPath('public-assets', assetsSub, 'assets');
      }
    }
  }

  restartWatchers() {
    this.startWatchers();
  }

  _configureAutoCheck() {
    if (this.autoCheckTimer) {
      clearInterval(this.autoCheckTimer);
      this.autoCheckTimer = null;
    }
    const intervalSec = Number(this.config?.updates?.autoCheckIntervalSec || 0);
    if (intervalSec > 0 && this.config?.updates?.enabled !== false && !this.config?.demo) {
      this.autoCheckTimer = setInterval(() => {
        this.checkForUpdates({ fetchRemote: true }).catch((err) => {
          this.logger?.warn('auto_update_check_failed', { error: redactText(err.message) });
        });
      }, intervalSec * 1000);
      this.autoCheckTimer.unref?.();
    }
  }

  stopWatchers() {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    for (const watcher of this.watchers.values()) {
      try {
        watcher.close();
      } catch {
        // ignore
      }
    }
    this.watchers.clear();
    if (this.autoCheckTimer) {
      clearInterval(this.autoCheckTimer);
      this.autoCheckTimer = null;
    }
  }
}
