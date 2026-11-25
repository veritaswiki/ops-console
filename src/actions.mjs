import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { findService, findTimer } from './config.mjs';
import { getUserEnv, runCmd } from './exec.mjs';
import { maskClientIp, redactText } from './redact.mjs';

const ALLOWED_SVC_ACTIONS = new Set(['start', 'stop', 'restart', 'reload']);
const ALLOWED_TIMER_ACTIONS = new Set(['start', 'stop', 'enable', 'disable']);

export class ActionController {
  constructor({ config, logger, cache, demoProvider = null }) {
    this.config = config;
    this.logger = logger;
    this.cache = cache;
    this.demoProvider = demoProvider;
    this.runningJobs = new Map();
    this.confirmTokens = new Map();
  }

  _maskIp(ip) {
    return maskClientIp(ip, { expose: Boolean(this.config.security?.exposeClientIps) });
  }

  _pruneExpiredTokens() {
    const now = Date.now();
    for (const [token, meta] of this.confirmTokens.entries()) {
      if (meta.expiresAt <= now) this.confirmTokens.delete(token);
    }
  }

  issueConfirmToken(unitId, action) {
    this._guardWritable();
    if (!ALLOWED_SVC_ACTIONS.has(action)) {
      const err = new Error(`Unsupported service action: ${action}`);
      err.statusCode = 400;
      throw err;
    }
    let unitName = String(unitId || '');
    if (!this.config.demo) {
      const svc = findService(this.config, unitId);
      if (!svc) {
        const err = new Error(`Service not in allowlist: ${unitId}`);
        err.statusCode = 400;
        throw err;
      }
      unitName = svc.unit;
    }
    this._pruneExpiredTokens();
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 30_000;
    this.confirmTokens.set(token, { unitId: String(unitId), unitName, action, expiresAt });
    return {
      ok: true,
      confirmToken: token,
      unit: unitName,
      action,
      expiresInSec: 30,
    };
  }

  _consumeConfirmToken(token, unitId, unitName, action) {
    if (!token || typeof token !== 'string') return false;
    this._pruneExpiredTokens();
    const meta = this.confirmTokens.get(token);
    if (!meta) return false;
    if (meta.action !== action) return false;
    if (meta.unitId !== String(unitId) && meta.unitName !== String(unitName)) return false;
    this.confirmTokens.delete(token);
    return true;
  }

  _guardWritable() {
    if (this.config.console.readOnly) {
      const err = new Error('Console is running in read-only mode');
      err.statusCode = 403;
      throw err;
    }
  }

  async controlService(unitId, action, ctx = {}) {
    this._guardWritable();
    if (!ALLOWED_SVC_ACTIONS.has(action)) {
      const err = new Error(`Unsupported service action: ${action}`);
      err.statusCode = 400;
      throw err;
    }

    if (this.config.demo && this.demoProvider) {
      const demoSnap = this.demoProvider.getSnapshot(this.config);
      const demoSvc = demoSnap.services?.items?.find((s) => s.id === unitId || s.unit === unitId);
      if (demoSvc?.risk === 'critical' && this.config.security?.requireCriticalConfirm) {
        if (!this._consumeConfirmToken(ctx.confirmToken, unitId, demoSvc.unit, action)) {
          const err = new Error(`Critical service ${demoSvc.unit} requires a single-use confirmToken`);
          err.statusCode = 409;
          err.requiresConfirm = true;
          throw err;
        }
      }
      const result = this.demoProvider.controlService(unitId, action);
      const audit = await this.logger.appendAudit({
        category: 'service',
        target: result.unit || unitId,
        scope: 'demo',
        action,
        ok: result.ok,
        durationMs: 42,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: redactText(result.message || 'Demo action executed'),
      });
      return { ...result, audit };
    }

    const svc = findService(this.config, unitId);
    if (!svc) {
      const err = new Error(`Service not in allowlist: ${unitId}`);
      err.statusCode = 400;
      throw err;
    }
    if (Array.isArray(svc.allowedActions) && !svc.allowedActions.includes(action)) {
      const err = new Error(`Action "${action}" is not permitted for ${svc.unit} (allowed: ${svc.allowedActions.join(', ') || 'none'})`);
      err.statusCode = 403;
      throw err;
    }
    if (svc.risk === 'critical' && this.config.security?.requireCriticalConfirm) {
      if (!this._consumeConfirmToken(ctx.confirmToken, unitId, svc.unit, action)) {
        const err = new Error(`Critical service ${svc.unit} requires a single-use confirmToken`);
        err.statusCode = 409;
        err.requiresConfirm = true;
        throw err;
      }
    }

    const started = Date.now();
    const bin = svc.scope === 'user' ? 'systemctl' : 'sudo';
    const args = svc.scope === 'user'
      ? ['--user', action, svc.unit]
      : ['-n', 'systemctl', action, svc.unit];

    try {
      const { stdout, stderr } = await runCmd(bin, args, { timeout: 20_000 });
      const durationMs = Date.now() - started;
      this.cache?.invalidate('snapshot');
      const audit = await this.logger.appendAudit({
        category: 'service',
        target: svc.unit,
        scope: svc.scope,
        action,
        ok: true,
        durationMs,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: redactText((stdout || stderr || 'OK').trim()).slice(0, 400),
      });
      return { ok: true, audit };
    } catch (err) {
      const durationMs = Date.now() - started;
      const detail = redactText((err.stderr || err.stdout || err.message || 'Execution failed').trim()).slice(0, 400);
      const audit = await this.logger.appendAudit({
        category: 'service',
        target: svc.unit,
        scope: svc.scope,
        action,
        ok: false,
        durationMs,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: detail,
      });
      return { ok: false, error: detail, audit };
    }
  }

  async controlTimer(timerId, action, ctx = {}) {
    this._guardWritable();
    if (!ALLOWED_TIMER_ACTIONS.has(action)) {
      const err = new Error(`Unsupported timer action: ${action}`);
      err.statusCode = 400;
      throw err;
    }

    if (this.config.demo && this.demoProvider) {
      const result = this.demoProvider.controlTimer(timerId, action);
      const audit = await this.logger.appendAudit({
        category: 'timer',
        target: result.unit || timerId,
        scope: 'demo',
        action,
        ok: result.ok,
        durationMs: 28,
        actor: ctx.actor || 'web',
        ip: ctx.ip || '',
        requestId: ctx.requestId || '',
        output: result.message || 'Demo timer updated',
      });
      return { ...result, audit };
    }

    const timer = findTimer(this.config, timerId);
    if (!timer) {
      const err = new Error(`Timer not in allowlist: ${timerId}`);
      err.statusCode = 400;
      throw err;
    }

    const started = Date.now();
    const cmdArgs = action === 'enable'
      ? ['enable', '--now', timer.unit]
      : action === 'disable'
        ? ['disable', '--now', timer.unit]
        : [action, timer.unit];
    const bin = timer.scope === 'user' ? 'systemctl' : 'sudo';
    const args = timer.scope === 'user' ? ['--user', ...cmdArgs] : ['-n', 'systemctl', ...cmdArgs];

    try {
      const { stdout, stderr } = await runCmd(bin, args, { timeout: 15_000 });
      this.cache?.invalidate('snapshot');
      const audit = await this.logger.appendAudit({
        category: 'timer',
        target: timer.unit,
        scope: timer.scope,
        action,
        ok: true,
        durationMs: Date.now() - started,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: redactText((stdout || stderr || 'OK').trim()).slice(0, 400),
      });
      return { ok: true, audit };
    } catch (err) {
      const detail = redactText((err.stderr || err.stdout || err.message || 'Execution failed').trim()).slice(0, 400);
      const audit = await this.logger.appendAudit({
        category: 'timer',
        target: timer.unit,
        scope: timer.scope,
        action,
        ok: false,
        durationMs: Date.now() - started,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: detail,
      });
      return { ok: false, error: detail, audit };
    }
  }

  async runHealthCheck(ctx = {}) {
    this._guardWritable();
    if (this.config.demo && this.demoProvider) {
      const audit = await this.logger.appendAudit({
        category: 'ops',
        target: 'health-check',
        action: 'run',
        ok: true,
        durationMs: 185,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: 'Demo health check passed (6/6 green)',
      });
      return { ok: true, output: 'Demo health check passed: 6/6 groups green.', audit };
    }

    const script = this.config.ops.healthScript;
    if (!script) {
      const err = new Error('No ops.healthScript configured');
      err.statusCode = 400;
      throw err;
    }
    await fs.access(script);
    const started = Date.now();
    try {
      const { stdout } = await runCmd(script, [], { timeout: 35_000 });
      this.cache?.invalidate('snapshot');
      const audit = await this.logger.appendAudit({
        category: 'ops',
        target: script,
        action: 'health-check',
        ok: true,
        durationMs: Date.now() - started,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: 'Health check completed (exit 0)',
      });
      return { ok: true, output: stdout, audit };
    } catch (err) {
      this.cache?.invalidate('snapshot');
      const audit = await this.logger.appendAudit({
        category: 'ops',
        target: script,
        action: 'health-check',
        ok: false,
        durationMs: Date.now() - started,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: `Health check exited non-zero (code=${err.code})`,
      });
      return { ok: false, output: err.stdout || err.stderr || err.message, audit };
    }
  }

  async triggerBackup(ctx = {}) {
    this._guardWritable();
    if (this.runningJobs.has('backup')) {
      return { ok: false, statusCode: 409, error: 'Backup job is already running' };
    }

    if (this.config.demo && this.demoProvider) {
      const audit = await this.logger.appendAudit({
        category: 'ops',
        target: 'backup',
        action: 'trigger',
        ok: true,
        durationMs: 12,
        actor: ctx.actor || 'web',
        ip: this._maskIp(ctx.ip || ''),
        requestId: ctx.requestId || '',
        output: 'Demo backup snapshot simulated',
      });
      return { ok: true, pid: 0, message: 'Demo backup simulated', audit };
    }

    const script = this.config.ops.backupScript;
    if (!script) {
      const err = new Error('No ops.backupScript configured');
      err.statusCode = 400;
      throw err;
    }
    await fs.access(script);

    const started = Date.now();
    const child = spawn(script, [], { env: getUserEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
    const job = { startedAt: new Date().toISOString(), pid: child.pid, log: '' };
    this.runningJobs.set('backup', job);

    child.stdout.on('data', (chunk) => {
      job.log = (job.log + chunk.toString('utf8')).slice(-8000);
    });
    child.stderr.on('data', (chunk) => {
      job.log = (job.log + chunk.toString('utf8')).slice(-8000);
    });
    child.on('close', async (code) => {
      this.runningJobs.delete('backup');
      this.cache?.invalidate('snapshot');
      await this.logger.appendAudit({
        category: 'ops',
        target: script,
        action: 'backup-complete',
        ok: code === 0,
        durationMs: Date.now() - started,
        actor: ctx.actor || 'web',
        ip: ctx.ip || '',
        requestId: ctx.requestId || '',
        output: `Backup exited with code ${code}`,
      });
    });

    const audit = await this.logger.appendAudit({
      category: 'ops',
      target: script,
      action: 'backup-trigger',
      ok: true,
      durationMs: 0,
      actor: ctx.actor || 'web',
      ip: ctx.ip || '',
      requestId: ctx.requestId || '',
      output: `Backup started in background (PID ${child.pid})`,
    });

    return { ok: true, pid: child.pid, message: 'Backup started in background', audit };
  }

  getRunningJobs() {
    const list = [];
    for (const [name, job] of this.runningJobs.entries()) {
      list.push({ name, pid: job.pid, startedAt: job.startedAt, logTail: job.log.slice(-1500) });
    }
    return list;
  }
}
