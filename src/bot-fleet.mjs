import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PACKAGE_ROOT } from './config.mjs';

export const BOT_CHANNELS = ['github', 'feishu', 'telegram', 'discord', 'slack', 'webhook'];
export const BOT_ROLES = ['commander-bridge', 'triage-intake', 'pr-reviewer', 'ops-alerter', 'custom'];

const CHANNEL_SET = new Set(BOT_CHANNELS);
const ROLE_SET = new Set(BOT_ROLES);
const SAFE_ENV_VAR_RE = /^[A-Z][A-Z0-9_]{1,48}$/;

function cleanStr(value, maxLen = 160) {
  return String(value ?? '').trim().slice(0, maxLen);
}

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function buildSeedBots() {
  const now = Date.now();
  const iso = (offsetMin) => new Date(now - offsetMin * 60_000).toISOString();

  return {
    version: 1,
    bots: [
      {
        id: 'bot-github-commander',
        name: '代码审查与 PR 助手',
        handle: '@pr-reviewer',
        channel: 'github',
        role: 'pr-reviewer',
        description: '聚焦代码安全边界、架构一致性与回归测试覆盖，输出可执行修改建议。',
        instructions: '你是严格的高级代码审查助手。审查任何改动时：1) 先检查鉴权、输入校验与只读保护；2) 指出潜在竞态或性能回退；3) 给出最小可运行修改建议，不输出空泛评价。',
        enabled: true,
        status: 'online',
        boundAgentId: 'a2a-hub-codex-lead',
        defaultProjectId: 'proj-ops-core',
        webhookEnvVar: 'GITHUB_WEBHOOK_SECRET',
        triggerKeywords: ['/review', '/plan', '/fix'],
        commands: ['/review', '/fix', '/plan'],
        autoCreateIssue: true,
        autoDispatchCommander: true,
        stats: {
          eventsReceived: 24,
          issuesCreated: 9,
          tasksDispatched: 8,
          lastActiveAt: iso(14),
        },
        createdAt: iso(4320),
      },
      {
        id: 'bot-ops-watchdog',
        name: '运维巡检与故障排查员',
        handle: '@ops-watchdog',
        channel: 'webhook',
        role: 'ops-alerter',
        description: '定期巡检多节点延迟、服务健康与日志错误，异常时给出根因与回滚命令。',
        instructions: '排查故障时先读取只读快照与错误日志，严禁未经确认直接重启高危服务。优先定位根因并附带最小影响面的回滚步骤。',
        enabled: true,
        status: 'online',
        boundAgentId: 'a2a-hub-claude',
        defaultProjectId: 'proj-bot-mesh',
        webhookEnvVar: 'OPS_WATCHDOG_TOKEN',
        triggerKeywords: ['alert', '巡检', '/sweep'],
        commands: ['/sweep', '/preflight', '/rollback'],
        autoCreateIssue: true,
        autoDispatchCommander: false,
        stats: {
          eventsReceived: 18,
          issuesCreated: 5,
          tasksDispatched: 3,
          lastActiveAt: iso(28),
        },
        createdAt: iso(1440),
      },
    ],
    activities: [
      {
        id: 'botact-1',
        ts: iso(14),
        botId: 'bot-github-commander',
        botName: 'GitHub 指挥官桥接 Bot',
        channel: 'github',
        actor: 'github-pr-hook',
        message: 'PR #418 收到 /plan 指令，已同步至 OPS-101 并唤醒总指挥编排。',
        createdIssueIdentifier: 'OPS-101',
        dispatched: true,
      },
      {
        id: 'botact-2',
        ts: iso(28),
        botId: 'bot-ops-watchdog',
        botName: '运维守望 Bot',
        channel: 'webhook',
        actor: 'watchdog-cron',
        message: '检测到活跃 MCP 工具数超 40 个，已自动创建 Triage 工单 BOT-106。',
        createdIssueIdentifier: 'BOT-106',
        dispatched: false,
      },
    ],
  };
}

function buildLiveInitialBots() {
  return {
    version: 1,
    bots: [],
    activities: [],
  };
}

function isLegacyDemoBotSeed(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  const bots = Array.isArray(parsed.bots) ? parsed.bots : [];
  const activities = Array.isArray(parsed.activities) ? parsed.activities : [];
  const hasFakeActivity = activities.some((act) =>
    /PR #418|BOT-106|OPS-101/.test(String(act?.message || ''))
    || String(act?.id || '') === 'botact-1',
  );
  const onlySeedIds =
    bots.length > 0 &&
    bots.every((bot) => ['bot-github-commander', 'bot-ops-watchdog', 'bot-feishu-intake', 'bot-feishu-triage'].includes(String(bot?.id || '')));
  return hasFakeActivity && onlySeedIds;
}

const CHECKED_BOT_ENV_VARS = [
  { name: 'GITHUB_TOKEN', channel: 'github', label: 'GitHub API Token' },
  { name: 'TELEGRAM_BOT_TOKEN', channel: 'telegram', label: 'Telegram Bot Token' },
  { name: 'SLACK_BOT_TOKEN', channel: 'slack', label: 'Slack Bot Token' },
  { name: 'DISCORD_BOT_TOKEN', channel: 'discord', label: 'Discord Bot Token' },
  { name: 'OPS_WATCHDOG_TOKEN', channel: 'webhook', label: 'Ops Watchdog Webhook Token' },
];

export function parseGithubWorkflowMeta(fileName, content) {
  const text = String(content || '');
  const nameMatch = text.match(/^\s*name\s*:\s*["']?([^"'\n#]+)["']?/m);
  const triggers = [];
  const inlineOn = text.match(/^\s*on\s*:\s*\[([^\]]+)\]/m);
  if (inlineOn) {
    for (const part of inlineOn[1].split(',')) {
      const clean = part.trim().replace(/^["']|["']$/g, '');
      if (clean) triggers.push(clean);
    }
  } else {
    const singleOn = text.match(/^\s*on\s*:\s*([a-zA-Z0-9_-]+)\s*$/m);
    if (singleOn) {
      triggers.push(singleOn[1]);
    } else {
      const blockMatch = text.match(/^\s*on\s*:\s*\n((?:[ \t]+.+\n?)+)/m);
      if (blockMatch) {
        for (const line of blockMatch[1].split('\n')) {
          const keyMatch = line.match(/^[ \t]{2}([a-zA-Z0-9_-]+)\s*:/);
          if (keyMatch) triggers.push(keyMatch[1]);
        }
      }
    }
  }
  return {
    file: path.basename(String(fileName || '')),
    name: nameMatch ? nameMatch[1].trim().slice(0, 80) : path.basename(String(fileName || '')),
    triggers: [...new Set(triggers)].slice(0, 6),
  };
}

export class BotFleetManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.dataDir = config?.console?.dataDir || path.resolve(process.cwd(), 'data');
    this.repoDir = config?.github?.repoDir || PACKAGE_ROOT;
    this.stateFile = path.join(this.dataDir, 'bots.json');
    this.state = config?.demo ? buildSeedBots() : buildLiveInitialBots();
    this.initialized = false;
    this._workflowsCache = { expiresAt: 0, items: [] };
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    const baseState = this.config?.demo ? buildSeedBots() : buildLiveInitialBots();
    try {
      const raw = await fs.readFile(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (!this.config?.demo && isLegacyDemoBotSeed(parsed)) {
        this.state = buildLiveInitialBots();
        await this.persist().catch(() => {});
      } else if (parsed && Array.isArray(parsed.bots)) {
        this.state = {
          ...baseState,
          ...parsed,
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
        };
      }
    } catch {
      this.state = baseState;
      if (!this.config?.demo) {
        await this.persist().catch(() => {});
      }
    }
  }

  async _discoverGithubWorkflows() {
    if (this._workflowsCache.expiresAt > Date.now()) {
      return this._workflowsCache.items;
    }
    const wfDir = path.join(this.repoDir, '.github', 'workflows');
    const items = [];
    try {
      const entries = await fs.readdir(wfDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !/\.(ya?ml)$/i.test(entry.name)) continue;
        try {
          const content = await fs.readFile(path.join(wfDir, entry.name), 'utf8');
          items.push(parseGithubWorkflowMeta(entry.name, content));
        } catch {
          // Skip unreadable workflow
        }
      }
    } catch {
      // No .github/workflows directory
    }
    this._workflowsCache = { expiresAt: Date.now() + 30_000, items };
    return items;
  }

  async persist() {
    await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const tmpFile = `${this.stateFile}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    await fs.rename(tmpFile, this.stateFile);
    await fs.chmod(this.stateFile, 0o600).catch(() => {});
  }

  list(liveIntegrations = null) {
    const bots = this.state.bots.map((bot) => ({
      ...bot,
      hasServerSecret: Boolean(
        bot.webhookEnvVar && SAFE_ENV_VAR_RE.test(bot.webhookEnvVar) && process.env[bot.webhookEnvVar],
      ),
    }));
    const byChannel = {};
    for (const bot of bots) {
      byChannel[bot.channel] = (byChannel[bot.channel] || 0) + 1;
    }
    return {
      ok: true,
      mode: this.config?.demo ? 'demo' : 'live',
      summary: {
        total: bots.length,
        enabled: bots.filter((b) => b.enabled).length,
        online: bots.filter((b) => b.enabled && b.status === 'online').length,
        totalEvents: bots.reduce((sum, b) => sum + (b.stats?.eventsReceived || 0), 0),
        totalIssuesCreated: bots.reduce((sum, b) => sum + (b.stats?.issuesCreated || 0), 0),
        totalTasksDispatched: bots.reduce((sum, b) => sum + (b.stats?.tasksDispatched || 0), 0),
        byChannel,
      },
      bots,
      activities: this.state.activities.slice(0, 30),
      ...(liveIntegrations ? { liveIntegrations } : {}),
    };
  }

  async listWithIntegrations({ githubOverview = null } = {}) {
    const workflows = this.config?.demo ? [] : await this._discoverGithubWorkflows();
    const envStatus = CHECKED_BOT_ENV_VARS.map((item) => ({
      name: item.name,
      channel: item.channel,
      label: item.label,
      configured: Boolean(process.env[item.name] && String(process.env[item.name]).trim().length > 0),
    }));
    return this.list({
      ghAuthenticated: Boolean(githubOverview?.ghAuthenticated),
      ghAccount: githubOverview?.ghAccount || null,
      repoFullName: githubOverview?.repo?.fullName || null,
      workflows,
      envStatus,
    });
  }

  async createBot(payload = {}) {
    const name = cleanStr(payload.name, 64);
    if (!name) throw createHttpError(400, 'Bot 名称不能为空');

    const channel = CHANNEL_SET.has(payload.channel) ? payload.channel : 'webhook';
    const role = ROLE_SET.has(payload.role) ? payload.role : 'triage-intake';
    const rawHandle = cleanStr(payload.handle || `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-bot`, 48);
    const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    const webhookEnvVar = cleanStr(payload.webhookEnvVar, 48).toUpperCase();
    if (webhookEnvVar && !SAFE_ENV_VAR_RE.test(webhookEnvVar)) {
      throw createHttpError(400, '凭据环境变量名仅允许大写字母、数字与下划线');
    }

    const parseTags = (input, fallback) => {
      if (Array.isArray(input)) {
        return [...new Set(input.map((v) => cleanStr(v, 32)).filter(Boolean))].slice(0, 8);
      }
      if (typeof input === 'string' && input.trim()) {
        return [...new Set(input.split(/[,，\s]+/).map((v) => cleanStr(v, 32)).filter(Boolean))].slice(0, 8);
      }
      return fallback;
    };

    const bot = {
      id: `bot-${crypto.randomBytes(4).toString('hex')}`,
      name,
      handle,
      channel,
      role,
      description: cleanStr(payload.description, 240) || `专注于「${name}」职责的自动化 Agent 预设。`,
      instructions: cleanStr(payload.instructions, 2000) || '',
      enabled: payload.enabled !== false,
      status: payload.enabled === false ? 'standby' : 'online',
      boundAgentId: cleanStr(payload.boundAgentId, 80) || 'a2a-hub-codex-lead',
      defaultProjectId: cleanStr(payload.defaultProjectId, 80) || 'proj-ops-core',
      webhookEnvVar: webhookEnvVar || `${channel.toUpperCase()}_BOT_TOKEN`,
      triggerKeywords: parseTags(payload.triggerKeywords, ['/plan', '/triage']),
      commands: parseTags(payload.commands, ['/run', '/review']),
      autoCreateIssue: payload.autoCreateIssue !== false,
      autoDispatchCommander: Boolean(payload.autoDispatchCommander),
      stats: {
        eventsReceived: 0,
        issuesCreated: 0,
        tasksDispatched: 0,
        lastActiveAt: null,
      },
      createdAt: new Date().toISOString(),
    };

    this.state.bots.unshift(bot);
    await this.persist();
    return { ok: true, bot };
  }

  async updateBot(botId, patch = {}) {
    const bot = this.state.bots.find((b) => b.id === botId);
    if (!bot) throw createHttpError(404, `未找到 Bot: ${botId}`);

    if (patch.name !== undefined) {
      const n = cleanStr(patch.name, 64);
      if (!n) throw createHttpError(400, 'Bot 名称不能为空');
      bot.name = n;
    }
    if (patch.enabled !== undefined) {
      bot.enabled = Boolean(patch.enabled);
      bot.status = bot.enabled ? 'online' : 'standby';
    }
    if (patch.boundAgentId !== undefined) bot.boundAgentId = cleanStr(patch.boundAgentId, 80);
    if (patch.defaultProjectId !== undefined) bot.defaultProjectId = cleanStr(patch.defaultProjectId, 80);
    if (patch.autoCreateIssue !== undefined) bot.autoCreateIssue = Boolean(patch.autoCreateIssue);
    if (patch.autoDispatchCommander !== undefined) bot.autoDispatchCommander = Boolean(patch.autoDispatchCommander);
    if (patch.description !== undefined) bot.description = cleanStr(patch.description, 240);
    if (patch.instructions !== undefined) bot.instructions = cleanStr(patch.instructions, 2000);
    if (patch.commands !== undefined) {
      const list = Array.isArray(patch.commands)
        ? patch.commands
        : typeof patch.commands === 'string'
          ? patch.commands.split(/[,，\s]+/)
          : [];
      bot.commands = [...new Set(list.map((v) => cleanStr(v, 32)).filter(Boolean))].slice(0, 8);
    }

    await this.persist();
    return { ok: true, bot };
  }

  async deleteBot(botId) {
    const idx = this.state.bots.findIndex((b) => b.id === botId);
    if (idx === -1) throw createHttpError(404, `未找到 Bot: ${botId}`);
    const [removed] = this.state.bots.splice(idx, 1);
    await this.persist();
    return { ok: true, id: removed.id };
  }

  async triggerBotEvent(
    botId,
    payload = {},
    { linearManager, a2aOrchestrator, fleetNodes = [], actor = 'web' } = {},
  ) {
    const bot = this.state.bots.find((b) => b.id === botId);
    if (!bot) throw createHttpError(404, `未找到 Bot: ${botId}`);
    if (!bot.enabled) throw createHttpError(409, `Bot「${bot.name}」当前处于停用状态，请先启用后再触发`);

    const message = cleanStr(payload.message || payload.summary, 300);
    if (!message) throw createHttpError(400, '触发事件内容不能为空');

    const nowIso = new Date().toISOString();
    bot.stats.eventsReceived = (bot.stats.eventsReceived || 0) + 1;
    bot.stats.lastActiveAt = nowIso;

    let createdIssue = null;
    let dispatchResult = null;

    if (bot.autoCreateIssue && linearManager) {
      const shouldDispatch = Boolean(payload.dispatchCommander ?? bot.autoDispatchCommander);
      const created = await linearManager.createIssue({
        title: cleanStr(payload.title || `[${bot.handle}] ${message}`, 140),
        description: `由 ${bot.name} (${bot.channel}) 自动触发入队：${message}`,
        status: shouldDispatch ? 'todo' : 'triage',
        priority: ['urgent', 'high', 'medium', 'low'].includes(payload.priority) ? payload.priority : 'high',
        projectId: bot.defaultProjectId,
        assigneeType: 'bot',
        assigneeId: bot.id,
        assigneeName: `${bot.name} (${bot.handle})`,
        commanderId: bot.boundAgentId,
        labels: ['bot', bot.channel],
        sourceBotId: bot.id,
      });
      createdIssue = created.issue;
      bot.stats.issuesCreated = (bot.stats.issuesCreated || 0) + 1;

      if (shouldDispatch && createdIssue) {
        dispatchResult = await linearManager.commanderDecomposeAndDispatch(createdIssue.id, {
          a2aOrchestrator,
          fleetNodes,
          actor: bot.id,
        });
        bot.stats.tasksDispatched = (bot.stats.tasksDispatched || 0) + 1;
      }
    }

    const activity = {
      id: `botact-${crypto.randomBytes(4).toString('hex')}`,
      ts: nowIso,
      botId: bot.id,
      botName: bot.name,
      channel: bot.channel,
      actor: cleanStr(payload.actor || actor, 48),
      message,
      createdIssueIdentifier: createdIssue?.identifier || null,
      dispatched: Boolean(dispatchResult?.ok),
    };
    this.state.activities.unshift(activity);
    if (this.state.activities.length > 50) this.state.activities.length = 50;

    await this.persist();
    return {
      ok: true,
      bot,
      activity,
      createdIssue,
      dispatchResult,
    };
  }
}
