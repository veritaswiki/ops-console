import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKAGE_ROOT } from './config.mjs';
import { validateSafeEndpointUrl } from './mcp-fleet.mjs';
import { redactText } from './redact.mjs';

export const MODULE_ID_RE = /^[a-z0-9][a-z0-9._-]{1,63}$/i;
const MAX_MODULE_HISTORY = 12;
const DEFAULT_INVOKE_TIMEOUT_MS = 10_000;

function cleanText(value, maxLen = 240) {
  return redactText(String(value ?? '').trim()).slice(0, maxLen);
}

function normalizeRelPath(repoDir, targetPath) {
  return path.relative(repoDir, targetPath).replace(/\\/g, '/');
}

export function validateModuleExport(rawMod, fallbackId = '') {
  const mod = rawMod?.default && typeof rawMod.default === 'object'
    ? { ...rawMod.default, ...rawMod }
    : rawMod;
  if (!mod || typeof mod !== 'object') {
    const err = new Error('Hot-swap module must export an object or named manifest');
    err.statusCode = 400;
    throw err;
  }
  const rawManifest = mod.manifest && typeof mod.manifest === 'object' ? mod.manifest : mod;
  const id = String(rawManifest.id || fallbackId || '').trim();
  if (!MODULE_ID_RE.test(id)) {
    const err = new Error(`Invalid hot-swap module id: "${id || '(empty)'}"`);
    err.statusCode = 400;
    throw err;
  }
  const name = cleanText(rawManifest.name || id, 120);
  const version = cleanText(rawManifest.version || '0.1.0', 32);
  const description = cleanText(rawManifest.description || '', 300);
  const capabilities = Array.isArray(rawManifest.capabilities)
    ? [...new Set(rawManifest.capabilities.map((item) => cleanText(item, 48)).filter(Boolean))].slice(0, 16)
    : [];

  const init = typeof mod.init === 'function' ? mod.init : null;
  const health = typeof mod.health === 'function' ? mod.health : null;
  const handle = typeof mod.handle === 'function' ? mod.handle : null;
  const dispose = typeof mod.dispose === 'function' ? mod.dispose : null;

  return {
    manifest: {
      id,
      name,
      version,
      description,
      capabilities,
      layer: 'module-hot-swap',
    },
    instance: { init, health, handle, dispose },
  };
}

export function parseSkillFrontmatter(markdown, fallbackName = '') {
  const text = String(markdown || '');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields = {};
  if (match) {
    const lines = match[1].split(/\r?\n/);
    for (const line of lines) {
      const kv = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1].trim().toLowerCase();
      const val = kv[2].trim().replace(/^['"]|['"]$/g, '');
      if (val) fields[key] = val;
    }
  }
  const name = cleanText(fields.name || fallbackName || 'unnamed-skill', 80);
  const description = cleanText(fields.description || '', 200);
  const version = cleanText(fields.version || '1.0.0', 24);
  return { name, description, version };
}

export function validateDeclarativeAgentManifest(raw, fallbackId = '') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const err = new Error('Declarative agent manifest must be a JSON object');
    err.statusCode = 400;
    throw err;
  }
  const id = String(raw.id || fallbackId || '').trim();
  if (!MODULE_ID_RE.test(id)) {
    const err = new Error(`Invalid declarative agent id: "${id || '(empty)'}"`);
    err.statusCode = 400;
    throw err;
  }
  const name = cleanText(raw.name || id, 80);
  const harness = cleanText(raw.harness || 'custom-a2a', 32).toLowerCase();
  const nodeId = cleanText(raw.nodeId || 'hub-primary', 64);
  const rawCardUrl = String(raw.agentCardUrl || 'http://127.0.0.1:9109/.well-known/agent-card.json').trim();
  const cardCheck = validateSafeEndpointUrl(rawCardUrl);
  if (!cardCheck.ok) {
    const err = new Error(`Invalid declarative agentCardUrl: ${cardCheck.error}`);
    err.statusCode = 400;
    throw err;
  }
  let rpcUrl = raw.rpcUrl ? String(raw.rpcUrl).trim() : '';
  if (rpcUrl) {
    const rpcCheck = validateSafeEndpointUrl(rpcUrl);
    if (!rpcCheck.ok) {
      const err = new Error(`Invalid declarative rpcUrl: ${rpcCheck.error}`);
      err.statusCode = 400;
      throw err;
    }
    rpcUrl = rpcCheck.url;
  } else {
    rpcUrl = `${new URL(cardCheck.url).origin}/a2a`;
  }
  const skills = Array.isArray(raw.skills)
    ? [...new Set(raw.skills.map((item) => cleanText(item, 48)).filter(Boolean))].slice(0, 16)
    : [];
  const reasoningEffort = ['low', 'medium', 'high', 'xhigh', 'max'].includes(String(raw.reasoningEffort || '').toLowerCase())
    ? String(raw.reasoningEffort).toLowerCase()
    : 'medium';
  return {
    id,
    name,
    harness,
    nodeId,
    agentCardUrl: cardCheck.url,
    rpcUrl,
    modelHint: cleanText(raw.modelHint || 'gpt-5-mini', 80),
    reasoningEffort,
    skills,
    description: cleanText(raw.description || '', 240),
    enabled: raw.enabled !== false,
  };
}

async function hashFile(filePath) {
  const buf = await fsp.readFile(filePath);
  return {
    hash: crypto.createHash('sha256').update(buf).digest('hex'),
    text: buf.toString('utf8'),
  };
}

async function runWithTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`${label} timed out after ${timeoutMs}ms`);
          err.statusCode = 504;
          reject(err);
        }, timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class AgentModuleHost {
  constructor({
    config = null,
    repoDir = PACKAGE_ROOT,
    modulesDirs = null,
    declarativeDirs = null,
    a2aOrchestrator = null,
    logger = null,
    eventBus = null,
  } = {}) {
    this.config = config;
    this.repoDir = path.resolve(repoDir || PACKAGE_ROOT);
    this.modulesDirs = Array.isArray(modulesDirs) && modulesDirs.length > 0
      ? modulesDirs.map((dir) => path.resolve(dir))
      : [
          path.join(this.repoDir, 'src', 'agent-modules'),
          path.join(this.repoDir, 'src', 'modules'),
        ];
    this.declarativeDirs = Array.isArray(declarativeDirs) && declarativeDirs.length > 0
      ? declarativeDirs.map((dir) => path.resolve(dir))
      : [
          path.join(this.repoDir, 'agents'),
          path.join(this.repoDir, 'config', 'agents'),
          path.join(this.repoDir, 'skills'),
        ];
    this.a2aOrchestrator = a2aOrchestrator;
    this.logger = logger;
    this.eventBus = eventBus;

    this.modules = new Map();
    this.declarativeItems = new Map();
    this.loadErrors = [];
    this.generation = 0;
    this.declarativeRevision = 0;
    this.lastModuleSwap = null;
    this.lastDeclarativeSync = null;
  }

  async init() {
    await this.reloadAllModules({ force: false, reason: 'startup', actor: 'system', emitEvent: false });
    await this.syncDeclarativeAgents({ force: false, reason: 'startup', actor: 'system', emitEvent: false });
    return this.getState();
  }

  _guardWritable() {
    if (this.config?.console?.readOnly) {
      const err = new Error('Console is running in read-only mode');
      err.statusCode = 403;
      throw err;
    }
  }

  async _discoverModuleFiles() {
    const found = [];
    const seen = new Set();
    for (const dir of this.modulesDirs) {
      if (!fs.existsSync(dir)) continue;
      let entries = [];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith('.mjs')) continue;
        if (entry.name.endsWith('.test.mjs')) continue;
        const fullPath = path.join(dir, entry.name);
        if (seen.has(fullPath)) continue;
        seen.add(fullPath);
        found.push({
          filePath: fullPath,
          relPath: normalizeRelPath(this.repoDir, fullPath),
          fallbackId: path.basename(entry.name, '.mjs'),
        });
      }
    }
    return found;
  }

  _serializeSlot(slotState) {
    if (!slotState) return null;
    return {
      slot: slotState.slot,
      revision: slotState.revision,
      version: slotState.manifest.version,
      hash: slotState.hash.slice(0, 12),
      loadedAt: slotState.loadedAt,
      healthy: Boolean(slotState.health?.ok),
      healthDetail: slotState.health?.detail || '',
    };
  }

  _serializeModule(entry) {
    const active = entry.slots[entry.activeSlot];
    const standbySlot = entry.activeSlot === 'A' ? 'B' : 'A';
    const standby = entry.slots[standbySlot];
    return {
      id: entry.id,
      name: active?.manifest?.name || entry.id,
      version: active?.manifest?.version || '0.0.0',
      description: active?.manifest?.description || '',
      capabilities: active?.manifest?.capabilities || [],
      relPath: entry.relPath,
      activeSlot: entry.activeSlot,
      standbySlot,
      canRollback: Boolean(standby),
      revision: active?.revision || '',
      hash: active?.hash?.slice(0, 12) || '',
      healthy: Boolean(active?.health?.ok),
      healthDetail: active?.health?.detail || '',
      hasHandler: Boolean(active?.instance?.handle),
      swapCount: entry.swapCount,
      failedSwaps: entry.failedSwaps,
      invocations: entry.invocations,
      lastError: entry.lastError,
      lastSwappedAt: entry.lastSwappedAt,
      slots: {
        A: this._serializeSlot(entry.slots.A),
        B: this._serializeSlot(entry.slots.B),
      },
      history: entry.history.slice(0, 8),
    };
  }

  async _loadSlotInstance(filePath, fallbackId, slot, revision, hash) {
    const fileUrl = `${pathToFileURL(filePath).href}?rev=${encodeURIComponent(revision)}`;
    const rawMod = await import(fileUrl);
    const { manifest, instance } = validateModuleExport(rawMod, fallbackId);
    const ctx = {
      moduleId: manifest.id,
      slot,
      revision,
      repoDir: this.repoDir,
    };
    if (instance.init) {
      await runWithTimeout(instance.init(ctx), DEFAULT_INVOKE_TIMEOUT_MS, `module ${manifest.id} init`);
    }
    let healthRes = { ok: true, detail: 'ok' };
    if (instance.health) {
      const rawHealth = await runWithTimeout(instance.health(ctx), DEFAULT_INVOKE_TIMEOUT_MS, `module ${manifest.id} health`);
      if (rawHealth === false || (rawHealth && typeof rawHealth === 'object' && rawHealth.ok === false)) {
        const reason = typeof rawHealth === 'object' && rawHealth.detail
          ? cleanText(rawHealth.detail, 240)
          : 'health check returned ok=false';
        const err = new Error(`Hot-swap healthcheck failed for module "${manifest.id}": ${reason}`);
        err.statusCode = 422;
        throw err;
      }
      healthRes = typeof rawHealth === 'object' && rawHealth !== null
        ? { ok: true, detail: cleanText(rawHealth.detail || 'healthy', 200) }
        : { ok: true, detail: 'healthy' };
    }
    return {
      slot,
      revision,
      hash,
      loadedAt: new Date().toISOString(),
      manifest,
      instance,
      health: healthRes,
    };
  }

  async swapModuleFile(filePath, {
    fallbackId = '',
    force = false,
    reason = 'hot-swap',
    actor = 'web',
    prMeta = null,
    emitEvent = true,
  } = {}) {
    const resolvedPath = path.resolve(filePath);
    const relPath = normalizeRelPath(this.repoDir, resolvedPath);
    const { hash } = await hashFile(resolvedPath);

    let existingEntry = null;
    for (const candidate of this.modules.values()) {
      if (candidate.filePath === resolvedPath || candidate.id === fallbackId) {
        existingEntry = candidate;
        break;
      }
    }

    const currentActive = existingEntry ? existingEntry.slots[existingEntry.activeSlot] : null;
    if (existingEntry && currentActive && currentActive.hash === hash && !force) {
      return {
        ok: true,
        changed: false,
        added: false,
        module: this._serializeModule(existingEntry),
        moduleId: existingEntry.id,
        slot: existingEntry.activeSlot,
        revision: currentActive.revision,
        prevRevision: currentActive.revision,
      };
    }

    this.generation += 1;
    const targetSlot = existingEntry
      ? (existingEntry.activeSlot === 'A' ? 'B' : 'A')
      : 'A';
    const revision = `r${this.generation}-${hash.slice(0, 8)}`;

    let candidateSlot;
    try {
      candidateSlot = await this._loadSlotInstance(
        resolvedPath,
        existingEntry?.id || fallbackId || path.basename(resolvedPath, '.mjs'),
        targetSlot,
        revision,
        hash,
      );
    } catch (err) {
      if (existingEntry) {
        existingEntry.failedSwaps += 1;
        existingEntry.lastError = cleanText(err.message, 280);
        existingEntry.history.unshift({
          ts: new Date().toISOString(),
          action: 'swap_failed_preserved',
          fromSlot: existingEntry.activeSlot,
          toSlot: targetSlot,
          revision,
          reason,
          actor,
          error: existingEntry.lastError,
        });
        if (existingEntry.history.length > MAX_MODULE_HISTORY) {
          existingEntry.history.length = MAX_MODULE_HISTORY;
        }
        err.preservedSlot = existingEntry.activeSlot;
        err.activeRevision = currentActive?.revision || null;
        err.rolledBack = true;
      }
      if (!err.statusCode) err.statusCode = 422;
      throw err;
    }

    const moduleId = candidateSlot.manifest.id;
    const isNew = !existingEntry;
    if (!existingEntry) {
      existingEntry = {
        id: moduleId,
        filePath: resolvedPath,
        relPath,
        activeSlot: 'A',
        slots: { A: null, B: null },
        swapCount: 0,
        failedSwaps: 0,
        invocations: 0,
        lastError: null,
        lastSwappedAt: null,
        history: [],
      };
      this.modules.set(moduleId, existingEntry);
    }

    const prevOverwritten = existingEntry.slots[targetSlot];
    if (prevOverwritten?.instance?.dispose) {
      try {
        await runWithTimeout(prevOverwritten.instance.dispose(), 3000, `module ${moduleId} dispose`);
      } catch (disposeErr) {
        this.logger?.warn('module_slot_dispose_failed', {
          moduleId,
          slot: targetSlot,
          error: cleanText(disposeErr.message, 200),
        });
      }
    }

    const prevSlot = existingEntry.activeSlot;
    const prevRevision = existingEntry.slots[prevSlot]?.revision || null;
    existingEntry.filePath = resolvedPath;
    existingEntry.relPath = relPath;
    existingEntry.slots[targetSlot] = candidateSlot;
    existingEntry.activeSlot = targetSlot;
    existingEntry.swapCount += 1;
    existingEntry.lastError = null;
    existingEntry.lastSwappedAt = candidateSlot.loadedAt;
    existingEntry.history.unshift({
      ts: candidateSlot.loadedAt,
      action: isNew ? 'loaded' : 'swapped',
      fromSlot: isNew ? null : prevSlot,
      toSlot: targetSlot,
      revision,
      prevRevision,
      version: candidateSlot.manifest.version,
      reason,
      actor,
      prNumber: prMeta?.prNumber ?? null,
    });
    if (existingEntry.history.length > MAX_MODULE_HISTORY) {
      existingEntry.history.length = MAX_MODULE_HISTORY;
    }

    const swapPayload = {
      moduleId,
      revision,
      prevRevision,
      slot: targetSlot,
      version: candidateSlot.manifest.version,
      prNumber: prMeta?.prNumber ?? null,
      prUrl: prMeta?.prUrl ?? null,
      reason,
      ts: candidateSlot.loadedAt,
    };
    this.lastModuleSwap = swapPayload;
    this.logger?.info('agent_module_swapped', swapPayload);
    if (emitEvent) {
      this.eventBus?.emit('module_reloaded', swapPayload);
    }

    return {
      ok: true,
      changed: true,
      added: isNew,
      module: this._serializeModule(existingEntry),
      moduleId,
      slot: targetSlot,
      revision,
      prevRevision,
    };
  }

  async reloadAllModules({
    moduleId = null,
    force = false,
    reason = 'hot-swap',
    actor = 'web',
    prMeta = null,
    emitEvent = true,
    strict = false,
  } = {}) {
    const files = await this._discoverModuleFiles();
    const added = [];
    const updated = [];
    const unchanged = [];
    const errors = [];
    const seenIds = new Set();

    let targetFiles = files;
    if (moduleId) {
      const existing = this.modules.get(moduleId);
      targetFiles = files.filter((item) => item.fallbackId === moduleId || (existing && item.filePath === existing.filePath));
      if (targetFiles.length === 0) {
        const err = new Error(`Hot-swap module not found: ${moduleId}`);
        err.statusCode = 404;
        throw err;
      }
    }

    let lastResult = null;
    for (const file of targetFiles) {
      try {
        const res = await this.swapModuleFile(file.filePath, {
          fallbackId: file.fallbackId,
          force,
          reason,
          actor,
          prMeta,
          emitEvent,
        });
        seenIds.add(res.moduleId);
        lastResult = res;
        if (res.added) added.push(res.moduleId);
        else if (res.changed) updated.push(res.moduleId);
        else unchanged.push(res.moduleId);
      } catch (err) {
        if (strict) throw err;
        errors.push({
          file: file.relPath,
          error: cleanText(err.message, 260),
          preservedSlot: err.preservedSlot || null,
          rolledBack: Boolean(err.rolledBack),
        });
      }
    }

    const removed = [];
    if (!moduleId) {
      for (const [id, entry] of [...this.modules.entries()]) {
        if (seenIds.has(id) || fs.existsSync(entry.filePath)) continue;
        for (const slotKey of ['A', 'B']) {
          const slotObj = entry.slots[slotKey];
          if (slotObj?.instance?.dispose) {
            await Promise.resolve(slotObj.instance.dispose()).catch(() => {});
          }
        }
        this.modules.delete(id);
        removed.push(id);
      }
      this.loadErrors = errors;
    }

    return {
      ok: errors.length === 0,
      hookBound: true,
      moduleId: lastResult?.moduleId || moduleId || 'agent-core',
      slot: lastResult?.slot || null,
      revision: lastResult?.revision || `g${this.generation}`,
      prevRevision: lastResult?.prevRevision || null,
      added,
      updated,
      unchanged,
      removed,
      errors,
      modules: [...this.modules.values()].map((entry) => this._serializeModule(entry)),
    };
  }

  async reloadModule(moduleId, options = {}) {
    this._guardWritable();
    const res = await this.reloadAllModules({
      ...options,
      moduleId,
      strict: true,
      emitEvent: options.emitEvent !== false,
    });
    const entry = this.modules.get(moduleId);
    return {
      ok: true,
      module: entry ? this._serializeModule(entry) : null,
      ...res,
    };
  }

  async rollbackModule(moduleId, { actor = 'web', reason = 'manual-rollback' } = {}) {
    this._guardWritable();
    const entry = this.modules.get(moduleId);
    if (!entry) {
      const err = new Error(`Hot-swap module not found: ${moduleId}`);
      err.statusCode = 404;
      throw err;
    }
    const prevSlot = entry.activeSlot;
    const standbySlot = prevSlot === 'A' ? 'B' : 'A';
    const standby = entry.slots[standbySlot];
    if (!standby) {
      const err = new Error(`Module "${moduleId}" has no standby revision in slot ${standbySlot} to roll back to`);
      err.statusCode = 409;
      throw err;
    }
    if (standby.instance?.health) {
      const rawHealth = await runWithTimeout(
        standby.instance.health({ moduleId, slot: standbySlot, revision: standby.revision }),
        DEFAULT_INVOKE_TIMEOUT_MS,
        `module ${moduleId} rollback health`,
      );
      if (rawHealth === false || (rawHealth && typeof rawHealth === 'object' && rawHealth.ok === false)) {
        const err = new Error(`Standby slot ${standbySlot} of module "${moduleId}" failed health verification`);
        err.statusCode = 422;
        throw err;
      }
    }

    const prevRevision = entry.slots[prevSlot]?.revision || null;
    entry.activeSlot = standbySlot;
    entry.swapCount += 1;
    entry.lastSwappedAt = new Date().toISOString();
    entry.lastError = null;
    entry.history.unshift({
      ts: entry.lastSwappedAt,
      action: 'rolled_back',
      fromSlot: prevSlot,
      toSlot: standbySlot,
      revision: standby.revision,
      prevRevision,
      version: standby.manifest.version,
      reason,
      actor,
    });
    if (entry.history.length > MAX_MODULE_HISTORY) {
      entry.history.length = MAX_MODULE_HISTORY;
    }

    const payload = {
      moduleId,
      revision: standby.revision,
      prevRevision,
      slot: standbySlot,
      version: standby.manifest.version,
      reason,
      ts: entry.lastSwappedAt,
    };
    this.lastModuleSwap = payload;
    this.eventBus?.emit('module_reloaded', payload);
    this.logger?.info('agent_module_rolled_back', payload);

    return {
      ok: true,
      module: this._serializeModule(entry),
      rolledBackFromSlot: prevSlot,
      activeSlot: standbySlot,
      revision: standby.revision,
    };
  }

  async invokeModule(moduleId, input = {}, { actor = 'web' } = {}) {
    const entry = this.modules.get(moduleId);
    if (!entry) {
      const err = new Error(`Hot-swap module not found: ${moduleId}`);
      err.statusCode = 404;
      throw err;
    }
    const active = entry.slots[entry.activeSlot];
    if (!active?.instance?.handle) {
      const err = new Error(`Module "${moduleId}" does not export a handle(input, ctx) function`);
      err.statusCode = 400;
      throw err;
    }
    const startedAt = Date.now();
    const result = await runWithTimeout(
      active.instance.handle(input, {
        moduleId: entry.id,
        slot: active.slot,
        revision: active.revision,
        actor,
      }),
      DEFAULT_INVOKE_TIMEOUT_MS,
      `module ${moduleId} invoke`,
    );
    entry.invocations += 1;
    return {
      ok: true,
      moduleId: entry.id,
      slot: active.slot,
      revision: active.revision,
      version: active.manifest.version,
      durationMs: Date.now() - startedAt,
      result,
    };
  }

  async _discoverDeclarativeFiles() {
    const items = [];
    for (const dir of this.declarativeDirs) {
      if (!fs.existsSync(dir)) continue;
      let entries = [];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.isFile() && /\.agent\.json$/i.test(entry.name)) {
          const filePath = path.join(dir, entry.name);
          items.push({
            kind: 'agent',
            filePath,
            relPath: normalizeRelPath(this.repoDir, filePath),
            fallbackId: entry.name.replace(/\.agent\.json$/i, ''),
          });
        } else if (entry.isDirectory()) {
          const skillMd = path.join(dir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            items.push({
              kind: 'skill',
              filePath: skillMd,
              relPath: normalizeRelPath(this.repoDir, skillMd),
              fallbackId: entry.name,
            });
          }
        }
      }
    }
    return items;
  }

  async _syncDeclarativeAgentToA2A(manifest) {
    if (!this.a2aOrchestrator) return false;
    const existing = this.a2aOrchestrator.agents?.get(manifest.id);
    const now = new Date().toISOString();
    const normalizedSkills = manifest.skills.length > 0
      ? manifest.skills.map((skill) => ({
          id: skill,
          name: skill,
          description: `Declared by ${manifest.name}`,
        }))
      : [{ id: 'general-ops', name: '通用节点任务执行', description: `Declared by ${manifest.name}` }];
    if (existing) {
      existing.name = manifest.name;
      existing.harness = manifest.harness;
      existing.nodeId = manifest.nodeId;
      existing.agentCardUrl = manifest.agentCardUrl;
      existing.rpcUrl = manifest.rpcUrl;
      existing.modelHint = manifest.modelHint;
      existing.reasoningEffort = manifest.reasoningEffort;
      existing.skills = normalizedSkills;
      existing.description = manifest.description;
      existing.status = manifest.enabled ? (existing.status === 'offline' ? 'healthy' : existing.status) : 'offline';
      existing.source = 'declarative';
      existing.lastVerifiedAt = now;
      if (!this.config?.console?.readOnly) {
        await this.a2aOrchestrator.persist();
      }
      return true;
    }
    if (this.a2aOrchestrator.agents) {
      this.a2aOrchestrator.agents.set(manifest.id, {
        id: manifest.id,
        name: manifest.name,
        harness: manifest.harness,
        nodeId: manifest.nodeId,
        nodeName: manifest.nodeId,
        role: 'worker',
        delegatable: true,
        status: manifest.enabled ? 'healthy' : 'offline',
        protocolVersion: '0.3',
        version: 'declarative',
        latestVersion: 'declarative',
        updateAvailable: false,
        installPath: null,
        autoDetected: false,
        pluginKind: 'harness',
        modelHint: manifest.modelHint,
        reasoningEffort: manifest.reasoningEffort,
        agentCardUrl: manifest.agentCardUrl,
        rpcUrl: manifest.rpcUrl,
        position: {
          x: 375,
          y: 30 + (this.a2aOrchestrator.agents.size % 5) * 145,
        },
        capabilities: {
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: true,
        },
        skills: normalizedSkills,
        boundMcpIds: [],
        latencyMs: null,
        lastVerifiedAt: now,
        description: manifest.description,
        source: 'declarative',
      });
      if (!this.config?.console?.readOnly) {
        await this.a2aOrchestrator.persist();
      }
      return true;
    }
    return false;
  }

  async syncDeclarativeAgents({
    force = false,
    reason = 'manual',
    actor = 'web',
    prMeta = null,
    emitEvent = false,
  } = {}) {
    const discovered = await this._discoverDeclarativeFiles();
    const seenRel = new Set();
    const added = [];
    const updated = [];
    const unchanged = [];
    const errors = [];

    for (const item of discovered) {
      seenRel.add(item.relPath);
      try {
        const { hash, text } = await hashFile(item.filePath);
        const existing = this.declarativeItems.get(item.relPath);
        if (existing && existing.hash === hash && !force) {
          unchanged.push(existing.id);
          continue;
        }
        let manifest;
        let syncedToA2A = false;
        if (item.kind === 'agent') {
          const parsed = JSON.parse(text);
          manifest = validateDeclarativeAgentManifest(parsed, item.fallbackId);
          syncedToA2A = await this._syncDeclarativeAgentToA2A(manifest);
        } else {
          const parsed = parseSkillFrontmatter(text, item.fallbackId);
          manifest = {
            id: `skill-${item.fallbackId.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`,
            ...parsed,
          };
          if (this.a2aOrchestrator?.upsertSkill) {
            await this.a2aOrchestrator.upsertSkill({
              id: manifest.id,
              name: manifest.name,
              version: manifest.version,
              provider: 'pi-skill',
              description: manifest.description,
              enabled: true,
            });
            syncedToA2A = true;
          }
        }
        const record = {
          id: manifest.id,
          kind: item.kind,
          relPath: item.relPath,
          hash,
          manifest,
          syncedToA2A,
          syncedAt: new Date().toISOString(),
        };
        this.declarativeItems.set(item.relPath, record);
        if (!existing) added.push(record.id);
        else updated.push(record.id);
      } catch (err) {
        errors.push({
          file: item.relPath,
          error: cleanText(err.message, 240),
        });
      }
    }

    const removed = [];
    let removedDeclarativeA2A = false;
    for (const [relPath, existing] of [...this.declarativeItems.entries()]) {
      if (seenRel.has(relPath)) continue;
      this.declarativeItems.delete(relPath);
      removed.push(existing.id);
      if (existing.kind === 'agent' && this.a2aOrchestrator?.agents?.get(existing.id)?.source === 'declarative') {
        this.a2aOrchestrator.agents.delete(existing.id);
        removedDeclarativeA2A = true;
      }
    }
    if (removedDeclarativeA2A && this.a2aOrchestrator?.persist && !this.config?.console?.readOnly) {
      await this.a2aOrchestrator.persist();
    }

    if (added.length > 0 || updated.length > 0 || removed.length > 0 || force) {
      this.declarativeRevision += 1;
    }
    const summary = {
      ok: errors.length === 0,
      reloaded: true,
      hookBound: true,
      revision: this.declarativeRevision,
      reason,
      actor,
      prNumber: prMeta?.prNumber ?? null,
      added,
      updated,
      removed,
      unchanged,
      errors,
      agentCount: [...this.declarativeItems.values()].filter((item) => item.kind === 'agent').length,
      skillCount: [...this.declarativeItems.values()].filter((item) => item.kind === 'skill').length,
      ts: new Date().toISOString(),
    };
    this.lastDeclarativeSync = summary;
    if (emitEvent) {
      this.eventBus?.emit('agent_declarative_reloaded', summary);
    }
    return summary;
  }

  getState() {
    const modules = [...this.modules.values()]
      .map((entry) => this._serializeModule(entry))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const declarativeItems = [...this.declarativeItems.values()].map((item) => ({
      id: item.id,
      kind: item.kind,
      relPath: item.relPath,
      hash: item.hash.slice(0, 12),
      name: item.manifest.name,
      version: item.manifest.version || item.manifest.modelHint || '1.0.0',
      description: item.manifest.description || '',
      skills: item.manifest.skills || [],
      syncedToA2A: item.syncedToA2A,
      syncedAt: item.syncedAt,
    })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return {
      ok: true,
      generation: this.generation,
      declarativeRevision: this.declarativeRevision,
      modulesDirs: this.modulesDirs.map((dir) => normalizeRelPath(this.repoDir, dir)),
      declarativeDirs: this.declarativeDirs.map((dir) => normalizeRelPath(this.repoDir, dir)),
      modules,
      declarativeItems,
      loadErrors: this.loadErrors,
      lastModuleSwap: this.lastModuleSwap,
      lastDeclarativeSync: this.lastDeclarativeSync,
      summary: {
        totalModules: modules.length,
        healthyModules: modules.filter((m) => m.healthy).length,
        totalSwaps: modules.reduce((acc, m) => acc + m.swapCount, 0),
        failedSwaps: modules.reduce((acc, m) => acc + m.failedSwaps, 0),
        totalDeclarativeAgents: declarativeItems.filter((item) => item.kind === 'agent').length,
        totalDeclarativeSkills: declarativeItems.filter((item) => item.kind === 'skill').length,
      },
    };
  }

  async dispose() {
    for (const entry of this.modules.values()) {
      for (const slotKey of ['A', 'B']) {
        const slotObj = entry.slots[slotKey];
        if (slotObj?.instance?.dispose) {
          await Promise.resolve(slotObj.instance.dispose()).catch(() => {});
        }
      }
    }
    this.modules.clear();
  }
}
