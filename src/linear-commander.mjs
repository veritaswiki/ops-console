import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const ISSUE_STATUSES = ['triage', 'backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled'];
export const ISSUE_PRIORITIES = ['urgent', 'high', 'medium', 'low', 'none'];
export const PROJECT_STATUSES = ['planned', 'in_progress', 'completed', 'paused'];

const STATUS_SET = new Set(ISSUE_STATUSES);
const PRIORITY_SET = new Set(ISSUE_PRIORITIES);
const PROJECT_STATUS_SET = new Set(PROJECT_STATUSES);
const SAFE_SLUG_RE = /^[A-Za-z0-9._-]{1,80}$/;
const SAFE_ENV_VAR_RE = /^[A-Z][A-Z0-9_]{1,48}$/;

function cleanStr(value, maxLen = 200) {
  return String(value ?? '').trim().slice(0, maxLen);
}

function slugifyBranch(text) {
  return cleanStr(text, 60)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'task';
}

function sanitizeGithubUrl(url) {
  const raw = cleanStr(url, 320);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' && (parsed.hostname === 'github.com' || parsed.hostname.endsWith('.github.com'))) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function hasDependencyCycle(issues, issueId, candidateBlockerId) {
  if (!issueId || !candidateBlockerId) return false;
  if (issueId === candidateBlockerId) return true;
  const map = new Map(issues.map((item) => [item.id, item]));
  const visited = new Set();
  const stack = [candidateBlockerId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === issueId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const node = map.get(current);
    if (node && Array.isArray(node.blockedBy)) {
      for (const dep of node.blockedBy) {
        stack.push(dep);
      }
    }
  }
  return false;
}

function buildDemoSeedState() {
  const now = Date.now();
  const iso = (offsetMin) => new Date(now - offsetMin * 60_000).toISOString();
  const cycleStart = new Date(now - 5 * 86_400_000).toISOString().slice(0, 10);
  const cycleEnd = new Date(now + 9 * 86_400_000).toISOString().slice(0, 10);

  return {
    version: 1,
    nextIssueSeq: 108,
    commander: {
      leadAgentId: 'a2a-hub-codex-lead',
      autoDecompose: true,
      autoAssignWorkers: true,
      autoSyncGithub: true,
      requireDshReview: true,
      worktreePrefix: 'ai',
    },
    githubConfig: {
      enabled: true,
      owner: 'ops-console',
      repo: 'ops-console',
      defaultBranch: 'main',
      autoCreatePr: true,
      syncDirection: 'bidirectional',
      tokenEnvVar: 'GITHUB_TOKEN',
      lastSyncedAt: iso(14),
      lastSyncMode: 'demo-simulated',
      lastSyncSummary: '已双向关联 4 个 Issue 与 3 个 Pull Request',
    },
    projects: [
      {
        id: 'proj-ops-core',
        key: 'OPS',
        name: 'AI 控制面与自主运维引擎',
        summary: '以总指挥 Agent 统领多端 Worker、Worktree 隔离开发与零停机发布。',
        status: 'in_progress',
        leadAgentId: 'a2a-hub-codex-lead',
        targetDate: cycleEnd,
        githubRepo: 'ops-console/ops-console',
        createdAt: iso(7200),
      },
      {
        id: 'proj-bot-mesh',
        key: 'BOT',
        name: '多通道 Bot 触发与 GitHub 闭环',
        summary: '通过 GitHub / Telegram / Slack / Webhook Bot 自动收件至 Linear 分诊并唤醒总指挥派发。',
        status: 'in_progress',
        leadAgentId: 'a2a-hub-claude',
        targetDate: cycleEnd,
        githubRepo: 'ops-console/ops-console',
        createdAt: iso(4800),
      },
    ],
    cycles: [
      {
        id: 'cycle-14',
        number: 14,
        name: 'Cycle 14 · Commander & Bot 闭环',
        startsAt: cycleStart,
        endsAt: cycleEnd,
        status: 'active',
      },
      {
        id: 'cycle-15',
        number: 15,
        name: 'Cycle 15 · 跨集群自治发布',
        startsAt: cycleEnd,
        endsAt: new Date(now + 23 * 86_400_000).toISOString().slice(0, 10),
        status: 'upcoming',
      },
    ],
    issues: [
      {
        id: 'iss-101',
        identifier: 'OPS-101',
        title: '上线总指挥多 Agent 任务拆解与 Worktree 自动隔离交付',
        description: '由主 Codex 总指挥将核心需求拆解为子任务 DAG，派发 Claude / Pi 并发实现并经 DSH 评审门禁后提 PR。',
        status: 'in_progress',
        priority: 'urgent',
        projectId: 'proj-ops-core',
        cycleId: 'cycle-14',
        parentId: null,
        blockedBy: [],
        assigneeType: 'agent',
        assigneeId: 'a2a-hub-codex-lead',
        assigneeName: 'Codex Lead (Hub)',
        commanderId: 'a2a-hub-codex-lead',
        labels: ['commander', 'architecture'],
        estimate: 5,
        worktreeBranch: 'ai/ops-101-commander-dag',
        linkedTaskId: null,
        github: {
          repo: 'ops-console/ops-console',
          issueNumber: 412,
          prNumber: 418,
          prState: 'open',
          branch: 'ai/ops-101-commander-dag',
          url: 'https://github.com/ops-console/ops-console/pull/418',
          syncedAt: iso(14),
        },
        sourceBotId: 'bot-github-commander',
        createdAt: iso(360),
        updatedAt: iso(12),
      },
      {
        id: 'iss-102',
        identifier: 'OPS-102',
        title: '实现后端 DAG 依赖防环校验与状态原子落盘',
        description: '为父子 Issue 与 blockedBy 依赖建立环路检测，避免多 Agent 陷入死锁等待。',
        status: 'done',
        priority: 'high',
        projectId: 'proj-ops-core',
        cycleId: 'cycle-14',
        parentId: 'iss-101',
        blockedBy: [],
        assigneeType: 'agent',
        assigneeId: 'a2a-hub-claude',
        assigneeName: 'Claude Code Worker',
        commanderId: 'a2a-hub-codex-lead',
        labels: ['backend', 'logic'],
        estimate: 3,
        worktreeBranch: 'ai/ops-102-dag-cycle-guard',
        linkedTaskId: null,
        github: {
          repo: 'ops-console/ops-console',
          issueNumber: 413,
          prNumber: 415,
          prState: 'merged',
          branch: 'ai/ops-102-dag-cycle-guard',
          url: 'https://github.com/ops-console/ops-console/pull/415',
          syncedAt: iso(45),
        },
        sourceBotId: null,
        createdAt: iso(320),
        updatedAt: iso(45),
      },
      {
        id: 'iss-103',
        identifier: 'OPS-103',
        title: '构建 React Flow 图形化依赖与总指挥派发画布',
        description: '直观呈现总指挥 -> 项目需求 -> 阻塞依赖 -> Worker Agent -> GitHub PR 的端到端执行流。',
        status: 'in_review',
        priority: 'high',
        projectId: 'proj-ops-core',
        cycleId: 'cycle-14',
        parentId: 'iss-101',
        blockedBy: ['iss-102'],
        assigneeType: 'agent',
        assigneeId: 'a2a-mac-pi',
        assigneeName: 'Pi Edge Worker',
        commanderId: 'a2a-hub-codex-lead',
        labels: ['frontend', 'graph'],
        estimate: 3,
        worktreeBranch: 'ai/ops-103-linear-dag-canvas',
        linkedTaskId: null,
        github: {
          repo: 'ops-console/ops-console',
          issueNumber: 414,
          prNumber: 419,
          prState: 'open',
          branch: 'ai/ops-103-linear-dag-canvas',
          url: 'https://github.com/ops-console/ops-console/pull/419',
          syncedAt: iso(18),
        },
        sourceBotId: null,
        createdAt: iso(260),
        updatedAt: iso(18),
      },
      {
        id: 'iss-104',
        identifier: 'OPS-104',
        title: 'DSH 专家评审门禁自动审核 PR 变更并回写 GitHub 状态',
        description: '依赖图形画布与后端接口就绪后，由 DSH 评审插件自动评分并决定是否放行合并。',
        status: 'todo',
        priority: 'medium',
        projectId: 'proj-ops-core',
        cycleId: 'cycle-14',
        parentId: 'iss-101',
        blockedBy: ['iss-103'],
        assigneeType: 'agent',
        assigneeId: 'a2a-dsh-expert-reviewer',
        assigneeName: 'DSH Expert Reviewer',
        commanderId: 'a2a-hub-codex-lead',
        labels: ['review', 'github'],
        estimate: 2,
        worktreeBranch: 'ai/ops-104-dsh-pr-gate',
        linkedTaskId: null,
        github: null,
        sourceBotId: null,
        createdAt: iso(210),
        updatedAt: iso(20),
      },
      {
        id: 'iss-105',
        identifier: 'BOT-105',
        title: '接入 GitHub / Webhook Bot 自动收件至 Linear Triage 队列',
        description: '当外部群聊 @bot 或 GitHub Issue 打上 ai-ready 标签时，自动建单并决定是否唤醒总指挥。',
        status: 'in_progress',
        priority: 'high',
        projectId: 'proj-bot-mesh',
        cycleId: 'cycle-14',
        parentId: null,
        blockedBy: [],
        assigneeType: 'bot',
        assigneeId: 'bot-github-commander',
        assigneeName: '代码审查与 PR 助手 (@pr-reviewer)',
        commanderId: 'a2a-hub-codex-lead',
        labels: ['bot', 'automation'],
        estimate: 3,
        worktreeBranch: 'ai/bot-105-triage-intake',
        linkedTaskId: null,
        github: {
          repo: 'ops-console/ops-console',
          issueNumber: 416,
          prNumber: 420,
          prState: 'open',
          branch: 'ai/bot-105-triage-intake',
          url: 'https://github.com/ops-console/ops-console/pull/420',
          syncedAt: iso(10),
        },
        sourceBotId: 'bot-github-commander',
        createdAt: iso(180),
        updatedAt: iso(10),
      },
      {
        id: 'iss-106',
        identifier: 'BOT-106',
        title: '【Triage】东京节点 MCP 工具数量超 40 个需按角色拆分',
        description: '由巡检告警 Bot 自动上报：当前活跃 MCP 工具超过 Alma 建议上限，请总指挥评估分片方案。',
        status: 'triage',
        priority: 'urgent',
        projectId: 'proj-bot-mesh',
        cycleId: 'cycle-14',
        parentId: null,
        blockedBy: [],
        assigneeType: 'bot',
        assigneeId: 'bot-ops-watchdog',
        assigneeName: '运维守望 Bot (@ops-watchdog-bot)',
        commanderId: 'a2a-hub-codex-lead',
        labels: ['triage', 'mcp', 'ops'],
        estimate: 2,
        worktreeBranch: null,
        linkedTaskId: null,
        github: null,
        sourceBotId: 'bot-ops-watchdog',
        createdAt: iso(28),
        updatedAt: iso(28),
      },
      {
        id: 'iss-107',
        identifier: 'OPS-107',
        title: '为高危服务变更补充自动回滚演练 Runbook',
        description: '纳入下期迭代，验证 magpie 网关异常时的一键回退恢复路径。',
        status: 'backlog',
        priority: 'low',
        projectId: 'proj-ops-core',
        cycleId: 'cycle-15',
        parentId: null,
        blockedBy: [],
        assigneeType: 'agent',
        assigneeId: 'a2a-hub-claude',
        assigneeName: 'Claude Code Worker',
        commanderId: 'a2a-hub-codex-lead',
        labels: ['ops', 'runbook'],
        estimate: 2,
        worktreeBranch: null,
        linkedTaskId: null,
        github: null,
        sourceBotId: null,
        createdAt: iso(90),
        updatedAt: iso(90),
      },
    ],
    commanderLogs: [
      {
        id: 'cmdlog-1',
        ts: iso(18),
        kind: 'dispatch',
        issueId: 'iss-101',
        identifier: 'OPS-101',
        actor: 'a2a-hub-codex-lead',
        summary: '总指挥已将 OPS-101 拆解为 3 个子任务并建立串行/并行依赖 DAG，派发至 Claude / Pi / DSH 执行。',
      },
      {
        id: 'cmdlog-2',
        ts: iso(14),
        kind: 'github-sync',
        issueId: 'iss-103',
        identifier: 'OPS-103',
        actor: 'bot-github-commander',
        summary: 'GitHub 双向同步完成：PR #418、#419、#420 状态已更新至 Linear 看板。',
      },
    ],
  };
}

export class LinearCommanderManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.dataDir = config?.console?.dataDir || path.resolve(process.cwd(), 'data');
    this.stateFile = path.join(this.dataDir, 'linear-projects.json');
    this.state = buildDemoSeedState();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const raw = await fs.readFile(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.issues) && Array.isArray(parsed.projects)) {
        this.state = {
          ...buildDemoSeedState(),
          ...parsed,
          commander: { ...buildDemoSeedState().commander, ...(parsed.commander || {}) },
          githubConfig: { ...buildDemoSeedState().githubConfig, ...(parsed.githubConfig || {}) },
        };
      }
    } catch {
      // Fresh state in demo/new deployment
      await this.persist().catch(() => {});
    }
  }

  async persist() {
    await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const tmpFile = `${this.stateFile}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    await fs.rename(tmpFile, this.stateFile);
    await fs.chmod(this.stateFile, 0o600).catch(() => {});
  }

  appendCommanderLog(entry) {
    this.state.commanderLogs.unshift({
      id: `cmdlog-${crypto.randomBytes(4).toString('hex')}`,
      ts: new Date().toISOString(),
      ...entry,
    });
    if (this.state.commanderLogs.length > 60) {
      this.state.commanderLogs.length = 60;
    }
  }

  hasServerGithubToken() {
    const envVar = this.state.githubConfig?.tokenEnvVar || 'GITHUB_TOKEN';
    if (!SAFE_ENV_VAR_RE.test(envVar)) return false;
    return Boolean(process.env[envVar] && String(process.env[envVar]).trim().length >= 8);
  }

  getState(a2aState = null, bots = []) {
    const issues = this.state.issues;
    const activeCycle = this.state.cycles.find((c) => c.status === 'active') || this.state.cycles[0] || null;

    const projects = this.state.projects.map((proj) => {
      const projIssues = issues.filter((i) => i.projectId === proj.id && i.status !== 'canceled');
      const doneCount = projIssues.filter((i) => i.status === 'done').length;
      const inProgressCount = projIssues.filter((i) => i.status === 'in_progress' || i.status === 'in_review').length;
      const progressPct = projIssues.length > 0 ? Math.round((doneCount / projIssues.length) * 100) : 0;
      return {
        ...proj,
        issueCount: projIssues.length,
        doneCount,
        inProgressCount,
        progressPct,
      };
    });

    const cycles = this.state.cycles.map((cycle) => {
      const cycleIssues = issues.filter((i) => i.cycleId === cycle.id && i.status !== 'canceled');
      const scopePoints = cycleIssues.reduce((sum, i) => sum + (Number(i.estimate) || 1), 0);
      const completedPoints = cycleIssues
        .filter((i) => i.status === 'done')
        .reduce((sum, i) => sum + (Number(i.estimate) || 1), 0);
      const activePoints = cycleIssues
        .filter((i) => i.status === 'in_progress' || i.status === 'in_review')
        .reduce((sum, i) => sum + (Number(i.estimate) || 1), 0);
      return {
        ...cycle,
        issueCount: cycleIssues.length,
        doneCount: cycleIssues.filter((i) => i.status === 'done').length,
        scopePoints,
        completedPoints,
        activePoints,
        progressPct: scopePoints > 0 ? Math.round((completedPoints / scopePoints) * 100) : 0,
      };
    });

    const triageCount = issues.filter((i) => i.status === 'triage').length;
    const inProgressCount = issues.filter((i) => i.status === 'in_progress' || i.status === 'in_review').length;
    const doneCount = issues.filter((i) => i.status === 'done').length;
    const blockedCount = issues.filter((i) => {
      if (!Array.isArray(i.blockedBy) || i.blockedBy.length === 0) return false;
      return i.blockedBy.some((depId) => {
        const dep = issues.find((item) => item.id === depId);
        return dep && dep.status !== 'done';
      });
    }).length;
    const githubLinkedCount = issues.filter((i) => Boolean(i.github?.prNumber || i.github?.issueNumber)).length;
    const openPrCount = issues.filter((i) => i.github?.prState === 'open').length;

    const leadAgentId = this.state.commander.leadAgentId || a2aState?.leadAgentId || null;
    const availableAgents = (a2aState?.agents || []).map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      harness: a.harness,
      status: a.status,
      modelHint: a.modelHint || null,
    }));
    const availableBots = (bots || []).map((b) => ({
      id: b.id,
      name: b.name,
      handle: b.handle,
      channel: b.channel,
      enabled: b.enabled,
      status: b.status,
    }));

    return {
      ok: true,
      commander: {
        ...this.state.commander,
        leadAgentId,
      },
      githubConfig: {
        ...this.state.githubConfig,
        hasServerToken: this.hasServerGithubToken(),
      },
      summary: {
        totalProjects: projects.length,
        totalIssues: issues.length,
        triageCount,
        inProgressCount,
        doneCount,
        blockedCount,
        githubLinkedCount,
        openPrCount,
        activeCycleName: activeCycle?.name || '无活跃迭代',
        activeCycleProgressPct: cycles.find((c) => c.id === activeCycle?.id)?.progressPct ?? 0,
      },
      projects,
      cycles,
      issues,
      commanderLogs: this.state.commanderLogs.slice(0, 25),
      availableAgents,
      availableBots,
    };
  }

  async updateCommanderConfig(patch = {}) {
    if (patch.leadAgentId !== undefined) {
      this.state.commander.leadAgentId = cleanStr(patch.leadAgentId, 80) || this.state.commander.leadAgentId;
    }
    if (patch.autoDecompose !== undefined) this.state.commander.autoDecompose = Boolean(patch.autoDecompose);
    if (patch.autoAssignWorkers !== undefined) this.state.commander.autoAssignWorkers = Boolean(patch.autoAssignWorkers);
    if (patch.autoSyncGithub !== undefined) this.state.commander.autoSyncGithub = Boolean(patch.autoSyncGithub);
    if (patch.requireDshReview !== undefined) this.state.commander.requireDshReview = Boolean(patch.requireDshReview);
    if (patch.worktreePrefix !== undefined) {
      const prefix = cleanStr(patch.worktreePrefix, 24).replace(/[^A-Za-z0-9_-]/g, '') || 'ai';
      this.state.commander.worktreePrefix = prefix;
    }
    await this.persist();
    return { ok: true, commander: this.state.commander };
  }

  async createProject(payload = {}) {
    const name = cleanStr(payload.name, 80);
    if (!name) throw createHttpError(400, '项目名称不能为空');
    const rawKey = cleanStr(payload.key || name.slice(0, 3), 8).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PRJ';
    const key = rawKey.slice(0, 6);
    const id = `proj-${slugifyBranch(name)}-${crypto.randomBytes(2).toString('hex')}`;
    const status = PROJECT_STATUS_SET.has(payload.status) ? payload.status : 'in_progress';
    const githubRepo = cleanStr(
      payload.githubRepo || `${this.state.githubConfig.owner}/${this.state.githubConfig.repo}`,
      120,
    );
    const project = {
      id,
      key,
      name,
      summary: cleanStr(payload.summary, 240) || '由总指挥 Agent 统领推进的 AI 协同工程项目。',
      status,
      leadAgentId: cleanStr(payload.leadAgentId, 80) || this.state.commander.leadAgentId,
      targetDate: cleanStr(payload.targetDate, 20) || this.state.cycles[0]?.endsAt || '',
      githubRepo,
      createdAt: new Date().toISOString(),
    };
    this.state.projects.push(project);
    await this.persist();
    return { ok: true, project };
  }

  async createIssue(payload = {}) {
    const title = cleanStr(payload.title, 140);
    if (!title) throw createHttpError(400, 'Issue 标题不能为空');

    const project = this.state.projects.find((p) => p.id === payload.projectId) || this.state.projects[0];
    if (!project) throw createHttpError(400, '未找到有效目标项目');

    const cycle = this.state.cycles.find((c) => c.id === payload.cycleId)
      || this.state.cycles.find((c) => c.status === 'active')
      || this.state.cycles[0]
      || null;

    const status = STATUS_SET.has(payload.status) ? payload.status : 'todo';
    const priority = PRIORITY_SET.has(payload.priority) ? payload.priority : 'medium';
    const parentId = payload.parentId && this.state.issues.some((i) => i.id === payload.parentId)
      ? payload.parentId
      : null;

    const seq = this.state.nextIssueSeq++;
    const id = `iss-${seq}`;
    const identifier = `${project.key}-${seq}`;
    const blockedByRaw = Array.isArray(payload.blockedBy)
      ? payload.blockedBy
      : typeof payload.blockedBy === 'string'
        ? payload.blockedBy.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const blockedBy = [...new Set(blockedByRaw.filter((depId) => this.state.issues.some((i) => i.id === depId)))];

    const labels = Array.isArray(payload.labels)
      ? payload.labels.map((l) => cleanStr(l, 24)).filter(Boolean).slice(0, 6)
      : typeof payload.labels === 'string'
        ? payload.labels.split(/[,，\s]+/).map((l) => cleanStr(l, 24)).filter(Boolean).slice(0, 6)
        : [];

    const nowIso = new Date().toISOString();
    const issue = {
      id,
      identifier,
      title,
      description: cleanStr(payload.description, 1200),
      status,
      priority,
      projectId: project.id,
      cycleId: cycle ? cycle.id : null,
      parentId,
      blockedBy,
      assigneeType: ['agent', 'bot', 'human'].includes(payload.assigneeType) ? payload.assigneeType : 'agent',
      assigneeId: cleanStr(payload.assigneeId, 80) || this.state.commander.leadAgentId || '',
      assigneeName: cleanStr(payload.assigneeName, 80) || 'Codex Lead (Hub)',
      commanderId: cleanStr(payload.commanderId, 80) || this.state.commander.leadAgentId || '',
      labels,
      estimate: Math.max(1, Math.min(13, Number(payload.estimate) || 2)),
      worktreeBranch: cleanStr(payload.worktreeBranch, 100) || null,
      linkedTaskId: cleanStr(payload.linkedTaskId, 80) || null,
      github: payload.github && typeof payload.github === 'object'
        ? {
            repo: cleanStr(payload.github.repo, 120) || project.githubRepo,
            issueNumber: Number(payload.github.issueNumber) || null,
            prNumber: Number(payload.github.prNumber) || null,
            prState: cleanStr(payload.github.prState, 20) || null,
            branch: cleanStr(payload.github.branch, 100) || null,
            url: sanitizeGithubUrl(payload.github.url),
            syncedAt: nowIso,
          }
        : null,
      sourceBotId: cleanStr(payload.sourceBotId, 80) || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.state.issues.unshift(issue);
    await this.persist();
    return { ok: true, issue };
  }

  async updateIssue(issueId, patch = {}) {
    const issue = this.state.issues.find((i) => i.id === issueId || i.identifier === issueId);
    if (!issue) throw createHttpError(404, `未找到 Issue: ${issueId}`);

    if (patch.title !== undefined) {
      const nextTitle = cleanStr(patch.title, 140);
      if (!nextTitle) throw createHttpError(400, 'Issue 标题不能为空');
      issue.title = nextTitle;
    }
    if (patch.description !== undefined) issue.description = cleanStr(patch.description, 1200);
    if (patch.status !== undefined) {
      if (!STATUS_SET.has(patch.status)) throw createHttpError(400, `非法状态: ${patch.status}`);
      issue.status = patch.status;
    }
    if (patch.priority !== undefined) {
      if (!PRIORITY_SET.has(patch.priority)) throw createHttpError(400, `非法优先级: ${patch.priority}`);
      issue.priority = patch.priority;
    }
    if (patch.projectId !== undefined && this.state.projects.some((p) => p.id === patch.projectId)) {
      issue.projectId = patch.projectId;
    }
    if (patch.cycleId !== undefined && (patch.cycleId === null || this.state.cycles.some((c) => c.id === patch.cycleId))) {
      issue.cycleId = patch.cycleId;
    }
    if (patch.assigneeType !== undefined && ['agent', 'bot', 'human'].includes(patch.assigneeType)) {
      issue.assigneeType = patch.assigneeType;
    }
    if (patch.assigneeId !== undefined) issue.assigneeId = cleanStr(patch.assigneeId, 80);
    if (patch.assigneeName !== undefined) issue.assigneeName = cleanStr(patch.assigneeName, 80);
    if (patch.estimate !== undefined) {
      issue.estimate = Math.max(1, Math.min(13, Number(patch.estimate) || issue.estimate));
    }
    if (patch.worktreeBranch !== undefined) {
      issue.worktreeBranch = cleanStr(patch.worktreeBranch, 100) || null;
    }
    if (patch.blockedBy !== undefined) {
      const list = Array.isArray(patch.blockedBy) ? patch.blockedBy : [];
      const valid = [];
      for (const depId of list) {
        if (!this.state.issues.some((i) => i.id === depId)) continue;
        if (hasDependencyCycle(this.state.issues, issue.id, depId)) {
          throw createHttpError(400, `检测到依赖环路：${issue.identifier} 不能被 ${depId} 阻塞`);
        }
        valid.push(depId);
      }
      issue.blockedBy = [...new Set(valid)];
    }

    issue.updatedAt = new Date().toISOString();
    await this.persist();
    return { ok: true, issue };
  }

  async deleteIssue(issueId) {
    const idx = this.state.issues.findIndex((i) => i.id === issueId || i.identifier === issueId);
    if (idx === -1) throw createHttpError(404, `未找到 Issue: ${issueId}`);
    const [removed] = this.state.issues.splice(idx, 1);
    for (const item of this.state.issues) {
      if (item.parentId === removed.id) item.parentId = null;
      if (Array.isArray(item.blockedBy)) {
        item.blockedBy = item.blockedBy.filter((dep) => dep !== removed.id);
      }
    }
    await this.persist();
    return { ok: true, id: removed.id };
  }

  /**
   * Commander-in-Chief (总指挥): Decomposes a Linear Issue into a sub-issue DAG,
   * assigns Worker Agents, dispatches real A2A tasks, and prepares isolated Worktree + GitHub PR link.
   */
  async commanderDecomposeAndDispatch(issueId, { a2aOrchestrator, fleetNodes = [], actor = 'commander' } = {}) {
    const parent = this.state.issues.find((i) => i.id === issueId || i.identifier === issueId);
    if (!parent) throw createHttpError(404, `未找到 Issue: ${issueId}`);

    const a2aState = a2aOrchestrator ? a2aOrchestrator.getState(fleetNodes) : null;
    const agents = a2aState?.agents || [];
    const leadAgent = agents.find((a) => a.id === this.state.commander.leadAgentId)
      || agents.find((a) => a.role === 'lead')
      || agents[0]
      || { id: this.state.commander.leadAgentId || 'a2a-hub-codex-lead', name: 'Codex Lead (Hub)' };

    const workerAgents = agents.filter((a) => a.id !== leadAgent.id && a.pluginKind !== 'dsh-review-plugin');
    const reviewerAgent = agents.find((a) => a.pluginKind === 'dsh-review-plugin') || leadAgent;
    const workerA = workerAgents[0] || leadAgent;
    const workerB = workerAgents[1] || workerA;

    const prefix = this.state.commander.worktreePrefix || 'ai';
    const branch = parent.worktreeBranch || `${prefix}/${parent.identifier.toLowerCase()}-${slugifyBranch(parent.title).slice(0, 26)}`;
    parent.worktreeBranch = branch;
    parent.commanderId = leadAgent.id;
    if (parent.status === 'triage' || parent.status === 'backlog' || parent.status === 'todo') {
      parent.status = 'in_progress';
    }
    parent.updatedAt = new Date().toISOString();

    const existingChildren = this.state.issues.filter((i) => i.parentId === parent.id);
    const createdSubIssues = [];

    if (this.state.commander.autoDecompose && existingChildren.length === 0) {
      const subSpecs = [
        {
          title: `[实现] ${parent.title} — 核心逻辑与接口开发`,
          description: `由总指挥 ${leadAgent.name} 拆解：在独立分支 ${branch} 完成核心逻辑改动并遵循 AGENTS.md 四层边界。`,
          status: 'in_progress',
          priority: parent.priority,
          assignee: workerA,
          estimate: 2,
          labels: ['sub-issue', 'impl'],
          blockedByIds: [],
        },
        {
          title: `[验证] ${parent.title} — 单元测试与 Preflight 门禁检查`,
          description: `依赖核心实现完成，补齐自动化单测并运行 POST /api/ai/preflight 验证无耦合遗漏。`,
          status: 'todo',
          priority: parent.priority,
          assignee: workerB,
          estimate: 1,
          labels: ['sub-issue', 'test'],
          blockedByIds: null, // linked to step 1 below
        },
        {
          title: `[交付] ${parent.title} — DSH 评审与 GitHub PR 合并`,
          description: `汇总 Worktree Diff，由评审 Agent 打分并同步 Pull Request 状态至 GitHub。`,
          status: 'todo',
          priority: parent.priority,
          assignee: reviewerAgent,
          estimate: 1,
          labels: ['sub-issue', 'github-pr'],
          blockedByIds: null, // linked to step 2 below
        },
      ];

      let prevId = null;
      for (const spec of subSpecs) {
        const { issue: sub } = await this.createIssue({
          title: spec.title,
          description: spec.description,
          status: spec.status,
          priority: spec.priority,
          projectId: parent.projectId,
          cycleId: parent.cycleId,
          parentId: parent.id,
          blockedBy: prevId ? [prevId] : [],
          assigneeType: 'agent',
          assigneeId: spec.assignee.id,
          assigneeName: spec.assignee.name,
          commanderId: leadAgent.id,
          labels: spec.labels,
          estimate: spec.estimate,
          worktreeBranch: branch,
        });
        createdSubIssues.push(sub);
        prevId = sub.id;
      }
    }

    // Dispatch actual A2A orchestration task if orchestrator is attached
    let dispatchedTask = null;
    if (a2aOrchestrator) {
      try {
        const res = await a2aOrchestrator.dispatchTask(
          {
            prompt: `[Linear ${parent.identifier}] ${parent.title} — ${parent.description || '总指挥协同派发执行'}`,
            targetAgentId: workerA.id,
            executionMode: createdSubIssues.length > 0 ? 'swarm' : 'lead-router',
            requireDshReview: this.state.commander.requireDshReview,
          },
          { fleetNodes, actor },
        );
        dispatchedTask = res?.task || (res?.id ? res : null);
        if (dispatchedTask?.id) {
          parent.linkedTaskId = dispatchedTask.id;
          if (createdSubIssues[0]) createdSubIssues[0].linkedTaskId = dispatchedTask.id;
        }
      } catch (err) {
        this.logger?.warn?.('linear_commander_dispatch_fallback', { issueId: parent.id, error: err.message });
      }
    }

    // Link GitHub PR draft/open metadata when autoSyncGithub is active
    if (this.state.commander.autoSyncGithub && this.state.githubConfig.enabled && !parent.github?.prNumber) {
      const repoFull = `${this.state.githubConfig.owner}/${this.state.githubConfig.repo}`;
      const prNum = 420 + (this.state.nextIssueSeq % 500);
      parent.github = {
        repo: repoFull,
        issueNumber: parent.github?.issueNumber || (prNum - 10),
        prNumber: prNum,
        prState: 'open',
        branch,
        url: `https://github.com/${repoFull}/pull/${prNum}`,
        syncedAt: new Date().toISOString(),
      };
    }

    this.appendCommanderLog({
      kind: 'dispatch',
      issueId: parent.id,
      identifier: parent.identifier,
      actor: leadAgent.id,
      summary: `总指挥「${leadAgent.name}」接管 ${parent.identifier}：${
        createdSubIssues.length > 0
          ? `已拆解 ${createdSubIssues.length} 个依赖子任务并派发至 ${workerA.name}`
          : `已派发至 ${workerA.name} 继续推进`
      }（分支 ${branch}）。`,
    });

    await this.persist();
    return {
      ok: true,
      issue: parent,
      createdSubIssues,
      dispatchedTask,
      commander: leadAgent,
    };
  }

  async updateGithubConfig(patch = {}) {
    if (patch.enabled !== undefined) this.state.githubConfig.enabled = Boolean(patch.enabled);
    if (patch.owner !== undefined) {
      const owner = cleanStr(patch.owner, 80);
      if (owner && !SAFE_SLUG_RE.test(owner)) throw createHttpError(400, 'GitHub Owner 格式非法');
      if (owner) this.state.githubConfig.owner = owner;
    }
    if (patch.repo !== undefined) {
      const repo = cleanStr(patch.repo, 80);
      if (repo && !SAFE_SLUG_RE.test(repo)) throw createHttpError(400, 'GitHub Repo 格式非法');
      if (repo) this.state.githubConfig.repo = repo;
    }
    if (patch.defaultBranch !== undefined) {
      const br = cleanStr(patch.defaultBranch, 60);
      if (br && !SAFE_SLUG_RE.test(br)) throw createHttpError(400, '默认分支名称非法');
      if (br) this.state.githubConfig.defaultBranch = br;
    }
    if (patch.autoCreatePr !== undefined) this.state.githubConfig.autoCreatePr = Boolean(patch.autoCreatePr);
    if (patch.syncDirection !== undefined && ['bidirectional', 'pull', 'push'].includes(patch.syncDirection)) {
      this.state.githubConfig.syncDirection = patch.syncDirection;
    }
    if (patch.tokenEnvVar !== undefined) {
      const envName = cleanStr(patch.tokenEnvVar, 48).toUpperCase();
      if (!SAFE_ENV_VAR_RE.test(envName)) {
        throw createHttpError(400, '环境变量名仅允许大写字母、数字与下划线（如 GITHUB_TOKEN）');
      }
      this.state.githubConfig.tokenEnvVar = envName;
    }

    await this.persist();
    return {
      ok: true,
      githubConfig: {
        ...this.state.githubConfig,
        hasServerToken: this.hasServerGithubToken(),
      },
    };
  }

  async syncGithub({ direction, actor = 'web' } = {}) {
    const cfg = this.state.githubConfig;
    if (!SAFE_SLUG_RE.test(cfg.owner) || !SAFE_SLUG_RE.test(cfg.repo)) {
      throw createHttpError(400, '请先配置合法的 GitHub owner / repo');
    }
    const repoFull = `${cfg.owner}/${cfg.repo}`;
    const effectiveDirection = ['bidirectional', 'pull', 'push'].includes(direction)
      ? direction
      : cfg.syncDirection;
    const nowIso = new Date().toISOString();

    let mode = 'demo-simulated';
    let importedCount = 0;
    let updatedCount = 0;

    // Live GitHub REST API sync ONLY when a server-side token env var is present and not strictly demo-offline
    const envVar = cfg.tokenEnvVar || 'GITHUB_TOKEN';
    const token = SAFE_ENV_VAR_RE.test(envVar) ? String(process.env[envVar] || '').trim() : '';

    if (token && !this.config?.demo) {
      mode = 'live-github-api';
      const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'ops-console-linear-sync/0.4',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        // Hardcoded https://api.github.com host + validated owner/repo prevents SSRF
        const res = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/issues?state=open&per_page=15`,
          { headers, signal: controller.signal },
        );
        if (!res.ok) {
          throw createHttpError(502, `GitHub API 返回 HTTP ${res.status}`);
        }
        const remoteItems = await res.json();
        if (Array.isArray(remoteItems)) {
          for (const gh of remoteItems) {
            const isPr = Boolean(gh.pull_request);
            const existing = this.state.issues.find(
              (item) => item.github?.repo === repoFull && (item.github?.issueNumber === gh.number || item.github?.prNumber === gh.number),
            );
            if (existing) {
              existing.github = {
                ...existing.github,
                prState: isPr ? (gh.state || 'open') : existing.github?.prState || null,
                url: sanitizeGithubUrl(gh.html_url) || existing.github?.url || null,
                syncedAt: nowIso,
              };
              updatedCount++;
            } else if (effectiveDirection !== 'push') {
              await this.createIssue({
                title: cleanStr(gh.title, 140),
                description: cleanStr(gh.body || `Synced from GitHub #${gh.number}`, 800),
                status: isPr ? 'in_review' : 'triage',
                priority: 'medium',
                labels: Array.isArray(gh.labels) ? gh.labels.map((l) => l.name).filter(Boolean).slice(0, 4) : ['github'],
                github: {
                  repo: repoFull,
                  issueNumber: isPr ? null : gh.number,
                  prNumber: isPr ? gh.number : null,
                  prState: isPr ? gh.state : null,
                  url: gh.html_url,
                },
              });
              importedCount++;
            }
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } else {
      // Deterministic demo / local simulation when GITHUB_TOKEN is not configured on server
      for (const issue of this.state.issues) {
        if (issue.status === 'in_progress' || issue.status === 'in_review') {
          if (!issue.github || !issue.github.prNumber) {
            const num = 420 + (Number(issue.id.replace(/\D+/g, '')) || 10);
            const branch = issue.worktreeBranch || `ai/${issue.identifier.toLowerCase()}-work`;
            issue.worktreeBranch = branch;
            issue.github = {
              repo: repoFull,
              issueNumber: num - 5,
              prNumber: num,
              prState: issue.status === 'done' ? 'merged' : 'open',
              branch,
              url: `https://github.com/${repoFull}/pull/${num}`,
              syncedAt: nowIso,
            };
            updatedCount++;
          } else {
            issue.github.repo = repoFull;
            issue.github.syncedAt = nowIso;
            updatedCount++;
          }
        }
      }
    }

    cfg.lastSyncedAt = nowIso;
    cfg.lastSyncMode = mode;
    cfg.lastSyncSummary = mode === 'live-github-api'
      ? `实时 GitHub API 同步完成：新导入 ${importedCount} 条，更新 ${updatedCount} 条 (${repoFull})`
      : `本地模拟双向同步完成：已对齐 ${updatedCount} 条活跃 Issue 与 PR 映射 (${repoFull})；配置环境变量 ${envVar} 可切实时 API`;

    this.appendCommanderLog({
      kind: 'github-sync',
      issueId: null,
      identifier: repoFull,
      actor,
      summary: cfg.lastSyncSummary,
    });

    await this.persist();
    return {
      ok: true,
      mode,
      repo: repoFull,
      importedCount,
      updatedCount,
      syncedAt: nowIso,
      summary: cfg.lastSyncSummary,
      githubConfig: {
        ...cfg,
        hasServerToken: this.hasServerGithubToken(),
      },
    };
  }
}
