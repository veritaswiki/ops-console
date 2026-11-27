import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { buildSignedA2AHeaders, getA2ASigningSecret } from './a2a-protocol.mjs';
import { validateSafeEndpointUrl } from './mcp-fleet.mjs';
import { redactText } from './redact.mjs';

const execFileAsync = promisify(execFile);

const VALID_HARNESS_KINDS = new Set([
  'codex-cli',
  'pi-agent',
  'claude-code',
  'gemini-cli',
  'agy-cli',
  'agy',
  'opencode',
  'dsh-expert',
  'langgraph',
  'crewai',
  'custom-a2a',
]);

const VALID_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh']);
const VALID_MODES = new Set(['lead-router', 'swarm', 'main-sub', 'direct', 'dsh-team', 'plan', 'worktree']);
const VALID_TASK_STATES = new Set(['submitted', 'working', 'completed', 'failed', 'canceled']);
const VALID_SYNC_MODES = new Set(['a2a-context-bus', 'nmem-shared', 'git-worktree']);
const VALID_SKILL_PROVIDERS = new Set(['dsh-plugin', 'pi-skill', 'claude-skill', 'codex-skill', 'a2a-card']);

const SAFE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,63}$/;

// Allowlisted local CLI harness probes for safe auto-discovery (no shell execution)
const LOCAL_CLI_PROBES = [
  {
    harness: 'codex-cli',
    bin: 'codex',
    args: ['--version'],
    defaultName: 'Codex CLI (Local)',
    defaultModel: 'gpt-5-codex',
    defaultEffort: 'high',
    latestVersion: '0.29.0',
    defaultPort: 9101,
  },
  {
    harness: 'pi-agent',
    bin: 'pi',
    args: ['--version'],
    defaultName: 'Pi Coding Agent (Local)',
    defaultModel: 'claude-sonnet-4-6',
    defaultEffort: 'medium',
    latestVersion: '0.18.4',
    defaultPort: 9104,
  },
  {
    harness: 'claude-code',
    bin: 'claude',
    args: ['--version'],
    defaultName: 'Claude Code (Local)',
    defaultModel: 'claude-opus-4-6',
    defaultEffort: 'high',
    latestVersion: '1.0.52',
    defaultPort: 9100,
  },
  {
    harness: 'gemini-cli',
    bin: 'gemini',
    args: ['--version'],
    defaultName: 'Gemini CLI (Local)',
    defaultModel: 'gemini-2.5-pro',
    defaultEffort: 'high',
    latestVersion: '0.14.2',
    defaultPort: 9103,
  },
  {
    harness: 'opencode',
    bin: 'opencode',
    args: ['--version'],
    defaultName: 'OpenCode (Local)',
    defaultModel: 'deepseek-r1',
    defaultEffort: 'medium',
    latestVersion: '0.9.11',
    defaultPort: 9102,
  },
  {
    harness: 'agy-cli',
    bin: 'agy',
    args: ['--version'],
    defaultName: 'Antigravity CLI (Local)',
    defaultModel: 'gemini-2.5-pro',
    defaultEffort: 'high',
    latestVersion: '1.0.0',
    defaultPort: 9105,
  },
  {
    harness: 'dsh-expert',
    bin: 'dsh',
    args: ['--version'],
    defaultName: 'DSH Expert CLI (Local)',
    defaultModel: 'deepseek-r1',
    defaultEffort: 'xhigh',
    latestVersion: '2.1.0',
    defaultPort: 9106,
  },
];

function sanitizeId(raw, fallbackPrefix = 'agent') {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (cleaned && SAFE_ID_RE.test(cleaned)) return cleaned;
  return `${fallbackPrefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function sanitizeEffort(raw, fallback = 'medium') {
  const v = String(raw || '').trim().toLowerCase();
  return VALID_EFFORTS.has(v) ? v : fallback;
}

function sanitizeSkills(rawSkills) {
  if (!Array.isArray(rawSkills)) return [];
  const out = [];
  const seen = new Set();
  for (const s of rawSkills.slice(0, 16)) {
    const id = typeof s === 'string' ? s.trim() : String(s?.id || s?.name || '').trim();
    const name = typeof s === 'string' ? s.trim() : String(s?.name || s?.id || '').trim();
    const description = typeof s === 'string' ? '' : redactText(String(s?.description || '')).slice(0, 140);
    if (!id || seen.has(id.toLowerCase())) continue;
    seen.add(id.toLowerCase());
    out.push({ id: id.slice(0, 48), name: name.slice(0, 64), description });
  }
  return out;
}

function sanitizeKeywords(raw) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[,，\n]+/)
      : [];
  const out = [];
  const seen = new Set();
  for (const item of list.slice(0, 20)) {
    const cleaned = redactText(String(item || '').trim()).slice(0, 40);
    if (!cleaned || seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    out.push(cleaned);
  }
  return out;
}

function compareSemver(a, b) {
  const pa = String(a || '0.0.0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0.0.0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const VALID_CONSENSUS_POLICIES = new Set(['weighted', 'unanimous', 'lead-override']);
const VALID_TRIGGER_CHANNELS = new Set(['github', 'ci', 'feishu', 'alert', 'webhook']);
const VALID_LOG_LEVELS = new Set(['info', 'warn', 'error', 'debug']);
const VALID_LOG_EVENTS = new Set([
  'a2a.delegate',
  'swarm.fanout',
  'dsh.review_vote',
  'dsh.gate_verdict',
  'superagent.fast_path',
  'superagent.route',
  'context.spill',
  'context.recall',
  'watchdog.check',
  'session.sync',
  'session.handoff',
  'task.state_changed',
]);

/**
 * Deterministic Fast Path classifier inspired by DeepSeek dsh-superagent-prototype:
 * Runs in plain code (0 LLM tokens) to suppress self-loops, enforce allowlists,
 * and passthrough events belonging to an already-subscribed active ticket thread.
 */
function evaluateFastPathTrigger(event, config, activeTickets) {
  const actor = String(event.actor || '').trim().toLowerCase();
  const threadKey = String(event.threadKey || '').trim();
  const channel = VALID_TRIGGER_CHANNELS.has(String(event.channel || '').toLowerCase())
    ? String(event.channel).toLowerCase()
    : 'github';

  if (config.fastPathEnabled !== false) {
    if (actor === 'superagent' || actor === 'dsh-bot' || event.isSelfOrigin) {
      return {
        decision: 'fast_drop',
        reason: 'Fast Path 确定性代码拦截：自触发回声事件（防止无限循环），消耗 0 推理 Token',
        matchedTicket: null,
        tokensSaved: 1450,
      };
    }
    if (event.isNoise || /\b(bot-heartbeat|stale-label|typo-ignore)\b/i.test(String(event.summary || ''))) {
      return {
        decision: 'fast_drop',
        reason: 'Fast Path 确定性代码拦截：命中低信号噪音过滤规则，未进入全局路由模型',
        matchedTicket: null,
        tokensSaved: 1200,
      };
    }
    if (config.subscriptionPassthrough !== false && threadKey) {
      const subscribedTicket = activeTickets.find(
        (t) => t.subscribed && t.threadKey === threadKey && t.status !== 'completed',
      );
      if (subscribedTicket) {
        return {
          decision: 'fast_passthrough',
          reason: `Subscription Passthrough：线程 ${threadKey} 已被工单 ${subscribedTicket.id} 认领，绕过全局 Router 直达隔离 Worker`,
          matchedTicket: subscribedTicket,
          tokensSaved: 980,
        };
      }
    }
  }

  return {
    decision: 'slow_spawn',
    reason: `通过 Fast Path 预筛（来源 ${channel}），升级至薄 Router 语义评估并派发隔离 Worker Worktree`,
    matchedTicket: null,
    tokensSaved: 0,
  };
}

function buildDemoA2AState() {
  const now = Date.now();
  const agents = [
    {
      id: 'a2a-hub-codex-lead',
      name: 'Codex CLI (主控 Harness)',
      harness: 'codex-cli',
      nodeId: 'workstation-mac',
      nodeName: 'Developer Laptop (macOS)',
      role: 'lead',
      delegatable: true,
      status: 'healthy',
      protocolVersion: '0.3',
      version: '0.29.0',
      latestVersion: '0.29.0',
      updateAvailable: false,
      installPath: '/usr/local/bin/codex',
      autoDetected: true,
      pluginKind: 'harness',
      agentCardUrl: 'http://100.64.0.45:9101/.well-known/agent-card.json',
      rpcUrl: 'http://100.64.0.45:9101/a2a',
      modelHint: 'gpt-5-codex',
      reasoningEffort: 'high',
      position: { x: 20, y: 260 },
      capabilities: {
        streaming: true,
        pushNotifications: true,
        stateTransitionHistory: true,
      },
      skills: [
        { id: 'architecture-plan', name: '主控任务拆解与路由', description: '按可视化路由策略统筹多端 Agent 与蜂群任务' },
        { id: 'repo-patch', name: '核心代码重构与单测', description: '在隔离 Git Worktree 中执行深度代码修改与编译验证' },
      ],
      boundMcpIds: ['mcp-mac-git-github', 'mcp-hub-nmem', 'mcp-hub-filesystem'],
      latencyMs: 11,
      lastVerifiedAt: new Date(now - 24_000).toISOString(),
      description: '当前选定的主 Agent (Lead Harness)，统筹任务拆解、模型强度分配与跨节点 A2A 委派。',
    },
    {
      id: 'a2a-mac-pi',
      name: 'Pi Coding Agent (极速终端)',
      harness: 'pi-agent',
      nodeId: 'workstation-mac',
      nodeName: 'Developer Laptop (macOS)',
      role: 'worker',
      delegatable: true,
      status: 'healthy',
      protocolVersion: '0.3',
      version: '0.18.2',
      latestVersion: '0.18.4',
      updateAvailable: true,
      installPath: '/opt/homebrew/bin/pi',
      autoDetected: true,
      pluginKind: 'harness',
      agentCardUrl: 'http://100.64.0.45:9104/.well-known/agent-card.json',
      rpcUrl: 'http://100.64.0.45:9104/a2a',
      modelHint: 'claude-sonnet-4-6',
      reasoningEffort: 'low',
      position: { x: 415, y: 12 },
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true,
      },
      skills: [
        { id: 'fast-edit', name: '轻量快速改码与脚本', description: '极简上下文快速执行局部文件改动、CLI 脚本与批量修复' },
        { id: 'pi-agy-bridge', name: 'Pi-Agy 扩展桥接', description: '通过 pi-mono 扩展系统热切换模型与自定义 Skill' },
      ],
      boundMcpIds: ['mcp-mac-git-github', 'mcp-hub-filesystem'],
      latencyMs: 9,
      lastVerifiedAt: new Date(now - 18_000).toISOString(),
      description: '轻量高响应 Pi Coding Agent，适合承接主控下发的快速编辑、脚本巡检与低延迟子任务。',
    },
    {
      id: 'a2a-hub-claude',
      name: 'Claude Code (架构与 UI 专家)',
      harness: 'claude-code',
      nodeId: 'hub-primary',
      nodeName: 'Primary Hub (SF)',
      role: 'worker',
      delegatable: true,
      status: 'healthy',
      protocolVersion: '0.3',
      version: '1.0.52',
      latestVersion: '1.0.52',
      updateAvailable: false,
      installPath: '/usr/local/bin/claude',
      autoDetected: true,
      pluginKind: 'harness',
      agentCardUrl: 'http://127.0.0.1:9100/.well-known/agent-card.json',
      rpcUrl: 'http://127.0.0.1:9100/a2a',
      modelHint: 'claude-opus-4-6',
      reasoningEffort: 'high',
      position: { x: 415, y: 184 },
      capabilities: {
        streaming: true,
        pushNotifications: true,
        stateTransitionHistory: true,
      },
      skills: [
        { id: 'frontend-craft', name: '前端组件与交互重构', description: '承接复杂 React 组件、视觉精修与长上下文跨文件改造' },
        { id: 'agent-teams', name: 'Subagent 并行协同', description: '在主控节点派生独立子代理并行完成研究与测试' },
      ],
      boundMcpIds: ['mcp-hub-filesystem', 'mcp-hub-nmem'],
      latencyMs: 14,
      lastVerifiedAt: new Date(now - 31_000).toISOString(),
      description: '主控节点的 Claude Code Harness，擅长复杂长上下文分析、UI 架构设计与并行 Subagent。',
    },
    {
      id: 'a2a-tokyo-opencode',
      name: 'OpenCode Edge Ops (Tokyo VPS)',
      harness: 'opencode',
      nodeId: 'edge-tokyo',
      nodeName: 'Edge Gateway (Tokyo)',
      role: 'worker',
      delegatable: true,
      status: 'healthy',
      protocolVersion: '0.3',
      version: '0.9.9',
      latestVersion: '0.9.11',
      updateAvailable: true,
      installPath: '/usr/local/bin/opencode',
      autoDetected: true,
      pluginKind: 'harness',
      agentCardUrl: 'http://100.64.0.21:9102/.well-known/agent-card.json',
      rpcUrl: 'http://100.64.0.21:9102/a2a',
      modelHint: 'deepseek-r1-edge',
      reasoningEffort: 'medium',
      position: { x: 415, y: 356 },
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true,
      },
      skills: [
        { id: 'edge-deploy', name: '边缘服务巡检与发布', description: '通过本地 MCP 检查 systemd 与容器状态' },
        { id: 'synthetic-qa', name: '亚太拨测与页面回归', description: '调用无头浏览器 MCP 验证线上可用性' },
      ],
      boundMcpIds: ['mcp-tokyo-systemd', 'mcp-tokyo-playwright'],
      latencyMs: 44,
      lastVerifiedAt: new Date(now - 45_000).toISOString(),
      description: '部署在东京 VPS 上的 OpenCode Worker，通过 A2A 承接边缘运维巡检与无头浏览器拨测。',
    },
    {
      id: 'a2a-frankfurt-gemini',
      name: 'Gemini CLI Auditor (Frankfurt VPS)',
      harness: 'gemini-cli',
      nodeId: 'edge-frankfurt',
      nodeName: 'EU Relay (Frankfurt)',
      role: 'worker',
      delegatable: true,
      status: 'healthy',
      protocolVersion: '0.3',
      version: '0.14.2',
      latestVersion: '0.14.2',
      updateAvailable: false,
      installPath: '/usr/local/bin/gemini',
      autoDetected: true,
      pluginKind: 'harness',
      agentCardUrl: 'http://100.64.0.34:9103/.well-known/agent-card.json',
      rpcUrl: 'http://100.64.0.34:9103/a2a',
      modelHint: 'gemini-2.5-pro',
      reasoningEffort: 'high',
      position: { x: 415, y: 528 },
      capabilities: {
        streaming: true,
        pushNotifications: true,
        stateTransitionHistory: true,
      },
      skills: [
        { id: 'security-audit', name: '防火墙与 TLS 安全审计', description: '审查欧洲中继节点暴露面与证书有效期' },
        { id: 'relay-diagnostics', name: 'DERP 中继链路诊断', description: '分析跨区延迟抖动并输出路由建议' },
      ],
      boundMcpIds: ['mcp-frankfurt-audit'],
      latencyMs: 138,
      lastVerifiedAt: new Date(now - 58_000).toISOString(),
      description: '运行于法兰克福中继 VPS 的 Gemini CLI Harness，专注安全合规审计与欧洲网络链路诊断。',
    },
    {
      id: 'a2a-dsh-expert-reviewer',
      name: 'DSH 专家评审插件 (Expert Gate)',
      harness: 'dsh-expert',
      nodeId: 'hub-primary',
      nodeName: 'Primary Hub (SF)',
      role: 'worker',
      delegatable: true,
      status: 'healthy',
      protocolVersion: '0.3',
      version: '2.1.0',
      latestVersion: '2.1.0',
      updateAvailable: false,
      installPath: 'plugins/dsh-expert-reviewer',
      autoDetected: true,
      pluginKind: 'dsh-review-plugin',
      agentCardUrl: 'http://127.0.0.1:9109/.well-known/agent-card.json',
      rpcUrl: 'http://127.0.0.1:9109/a2a',
      modelHint: 'claude-opus-4-6',
      reasoningEffort: 'xhigh',
      position: { x: 820, y: 260 },
      capabilities: {
        streaming: true,
        pushNotifications: true,
        stateTransitionHistory: true,
      },
      skills: [
        { id: 'dsh-expert-review', name: '多视角专家会审', description: '架构师 / 安全审计 / 性能专家三方加权打分与阻断门禁' },
        { id: 'spec-gate', name: 'Spec 一致性与回归审查', description: '校验 Diff 是否偏离设计契约并输出可执行修改意见' },
      ],
      boundMcpIds: ['mcp-mac-git-github', 'mcp-hub-nmem'],
      latencyMs: 16,
      lastVerifiedAt: new Date(now - 15_000).toISOString(),
      description: '融合自 DSH 专家评审插件的插件化评审代理，作为调度网络中的独立专家节点或发布门禁运行。',
    },
  ];

  const routingRules = [
    {
      id: 'route-codex-to-pi',
      name: '快速改码与脚本 -> Pi (低思考)',
      sourceAgentId: 'a2a-hub-codex-lead',
      targetAgentId: 'a2a-mac-pi',
      taskCategory: 'quick-edit',
      matchKeywords: ['pi', '脚本', '快速', '格式化', '小改动', 'cli', 'rename', 'lint'],
      targetModel: 'claude-sonnet-4-6',
      reasoningEffort: 'low',
      priority: 10,
      enabled: true,
      requireDshReview: false,
    },
    {
      id: 'route-codex-to-claude',
      name: 'UI 交互与复杂重构 -> Claude Code (高思考)',
      sourceAgentId: 'a2a-hub-codex-lead',
      targetAgentId: 'a2a-hub-claude',
      taskCategory: 'ui-architecture',
      matchKeywords: ['ui', '前端', '页面', '画布', '交互', '组件', '架构', 'claude'],
      targetModel: 'claude-opus-4-6',
      reasoningEffort: 'high',
      priority: 20,
      enabled: true,
      requireDshReview: true,
    },
    {
      id: 'route-codex-to-tokyo',
      name: '东京边缘拨测与容器 -> OpenCode (中思考)',
      sourceAgentId: 'a2a-hub-codex-lead',
      targetAgentId: 'a2a-tokyo-opencode',
      taskCategory: 'edge-ops',
      matchKeywords: ['东京', 'tokyo', '拨测', '浏览器', 'docker', '边缘', 'systemd'],
      targetModel: 'deepseek-r1-edge',
      reasoningEffort: 'medium',
      priority: 30,
      enabled: true,
      requireDshReview: false,
    },
    {
      id: 'route-codex-to-frankfurt',
      name: '安全与欧洲网络审计 -> Gemini CLI (高思考)',
      sourceAgentId: 'a2a-hub-codex-lead',
      targetAgentId: 'a2a-frankfurt-gemini',
      taskCategory: 'security-audit',
      matchKeywords: ['安全', '防火墙', 'nftables', 'tls', '法兰克福', 'frankfurt', 'derp'],
      targetModel: 'gemini-2.5-pro',
      reasoningEffort: 'high',
      priority: 40,
      enabled: true,
      requireDshReview: true,
    },
    {
      id: 'route-claude-to-dsh',
      name: '架构产出终审门禁 -> DSH 专家评审 (极高思考)',
      sourceAgentId: 'a2a-hub-claude',
      targetAgentId: 'a2a-dsh-expert-reviewer',
      taskCategory: 'expert-review',
      matchKeywords: ['评审', 'review', 'dsh', '验收', '合并', 'pr', '专家'],
      targetModel: 'claude-opus-4-6',
      reasoningEffort: 'xhigh',
      priority: 5,
      enabled: true,
      requireDshReview: true,
    },
  ];

  const orchestrationConfig = {
    mode: 'lead-router',
    mainModel: 'gpt-5-codex',
    mainEffort: 'high',
    subModel: 'claude-sonnet-4-6',
    subEffort: 'low',
    worktreeIsolation: true,
    dshReviewGate: {
      enabled: true,
      minScore: 85,
      autoGateHighRisk: true,
      dimensions: ['架构一致性', '安全边界', '性能复杂度', '测试覆盖'],
    },
  };

  const skillCatalog = [
    {
      id: 'skill-dsh-expert-panel',
      name: 'DSH 多专家评审团',
      version: '2.1.0',
      latestVersion: '2.1.0',
      provider: 'dsh-plugin',
      description: '融合自 DSH 项目的插件化专家评审技能：按架构/安全/性能三视角加权评分，低于阈值自动打回重写。',
      enabled: true,
      assignedAgentIds: ['a2a-dsh-expert-reviewer', 'a2a-hub-codex-lead'],
    },
    {
      id: 'skill-pi-agy-adapter',
      name: 'Pi-Agy 多模型热切换',
      version: '0.18.2',
      latestVersion: '0.18.4',
      provider: 'pi-skill',
      description: '让 Pi Coding Agent 按任务复杂度动态切换主/子模型与思考强度，保持极简低延迟上下文。',
      enabled: true,
      assignedAgentIds: ['a2a-mac-pi'],
    },
    {
      id: 'skill-git-worktree-swarm',
      name: 'Git Worktree 并行蜂群隔离',
      version: '1.4.0',
      latestVersion: '1.4.0',
      provider: 'codex-skill',
      description: '为每个并发 Worker 自动分配独立 Git Worktree 分支，执行完由主 Agent 合并并触发 DSH 门禁。',
      enabled: true,
      assignedAgentIds: ['a2a-hub-codex-lead', 'a2a-hub-claude', 'a2a-mac-pi'],
    },
    {
      id: 'skill-a2a-context-sync',
      name: 'A2A 跨端会话上下文桥',
      version: '1.2.0',
      latestVersion: '1.3.0',
      provider: 'a2a-card',
      description: '通过 A2A contextId + NMEM 语义摘要实现 Mac / Hub / VPS / 手机多端无损接力同步。',
      enabled: true,
      assignedAgentIds: ['a2a-hub-codex-lead', 'a2a-mac-pi', 'a2a-hub-claude', 'a2a-tokyo-opencode'],
    },
    {
      id: 'skill-claude-ui-craft',
      name: 'Claude 前端组件与可访问性审计',
      version: '1.0.5',
      latestVersion: '1.0.5',
      provider: 'claude-skill',
      description: '在长上下文中批量审查 React 组件状态、响应式断点与零报错构建回归。',
      enabled: true,
      assignedAgentIds: ['a2a-hub-claude'],
    },
  ];

  const sessions = [
    {
      id: 'sess-ops-core-01',
      contextId: 'ctx-ops-orchestrator-v2',
      title: '全节点 A2A 编排画布与 DSH 评审集成',
      primaryAgentId: 'a2a-hub-codex-lead',
      participatingAgentIds: ['a2a-hub-codex-lead', 'a2a-hub-claude', 'a2a-dsh-expert-reviewer'],
      syncedNodes: ['workstation-mac', 'hub-primary', 'mobile-device'],
      syncMode: 'a2a-context-bus',
      gitBranch: 'feat/a2a-visual-orchestrator',
      worktreePath: '.worktrees/codex-orchestrator',
      revision: 18,
      state: 'synced',
      lastSyncedAt: new Date(now - 42_000).toISOString(),
      messageCount: 34,
      summary: '主控 Codex 已与 Hub Claude Code 及移动端对齐上下文快照，当前 Worktree 编译与单测全绿。',
    },
    {
      id: 'sess-edge-ops-02',
      contextId: 'ctx-edge-tokyo-probe',
      title: '东京 VPS 拨测与 MCP 同步流水线',
      primaryAgentId: 'a2a-mac-pi',
      participatingAgentIds: ['a2a-mac-pi', 'a2a-tokyo-opencode'],
      syncedNodes: ['workstation-mac', 'edge-tokyo'],
      syncMode: 'nmem-shared',
      gitBranch: 'ops/tokyo-mcp-sync',
      worktreePath: '.worktrees/pi-tokyo-ops',
      revision: 9,
      state: 'synced',
      lastSyncedAt: new Date(now - 3 * 60_000).toISOString(),
      messageCount: 16,
      summary: 'Pi 负责本地脚本修复，OpenCode 在东京节点承接 systemd 与 Playwright 拨测结果回传。',
    },
    {
      id: 'sess-eu-audit-03',
      contextId: 'ctx-eu-security-gate',
      title: '法兰克福中继安全基线与证书轮换',
      primaryAgentId: 'a2a-frankfurt-gemini',
      participatingAgentIds: ['a2a-frankfurt-gemini', 'a2a-dsh-expert-reviewer'],
      syncedNodes: ['hub-primary', 'edge-frankfurt'],
      syncMode: 'git-worktree',
      gitBranch: 'sec/fra-nftables-audit',
      worktreePath: '.worktrees/fra-audit',
      revision: 5,
      state: 'drift',
      lastSyncedAt: new Date(now - 19 * 60_000).toISOString(),
      messageCount: 11,
      summary: '法兰克福节点产出新审计 Artifact，待一键同步至主控节点与开发机。',
    },
  ];

  const tasks = [
    {
      id: 'a2a-task-9024',
      contextId: 'ctx-ops-orchestrator-v2',
      protocolMethod: 'message/send',
      executionMode: 'swarm',
      state: 'completed',
      prompt: '重构 Agent 路由编排模块并执行 DSH 专家安全与性能会审。',
      leadAgentId: 'a2a-hub-codex-lead',
      leadAgentName: 'Codex CLI (主控 Harness)',
      leadNodeId: 'workstation-mac',
      workerAgentId: 'a2a-hub-claude',
      workerAgentName: 'Claude Code (架构与 UI 专家)',
      workerNodeId: 'hub-primary',
      matchedRuleId: 'route-codex-to-claude',
      matchedRuleName: 'UI 交互与复杂重构 -> Claude Code (高思考)',
      matchedSkill: 'frontend-craft',
      appliedModel: 'claude-opus-4-6',
      appliedEffort: 'high',
      worktreeBranch: 'swarm/a2a-task-9024',
      mcpScope: ['mcp-hub-filesystem', 'mcp-hub-nmem'],
      createdAt: new Date(now - 9 * 60_000).toISOString(),
      updatedAt: new Date(now - 8 * 60_000).toISOString(),
      durationMs: 3180,
      actor: 'operator',
      subtasks: [
        {
          id: 'sub-1',
          agentId: 'a2a-hub-codex-lead',
          agentName: 'Codex CLI (主控 Harness)',
          role: '规划拆解',
          model: 'gpt-5-codex',
          effort: 'high',
          state: 'completed',
          worktree: '.worktrees/swarm-plan',
          summary: '拆解为 UI 编排重构 + 轻量校验脚本两个并行分支',
        },
        {
          id: 'sub-2',
          agentId: 'a2a-hub-claude',
          agentName: 'Claude Code (架构与 UI 专家)',
          role: '并行实现',
          model: 'claude-opus-4-6',
          effort: 'high',
          state: 'completed',
          worktree: '.worktrees/swarm-ui',
          summary: '完成 ReactFlow 拖拽连线与路由策略检查器',
        },
        {
          id: 'sub-3',
          agentId: 'a2a-mac-pi',
          agentName: 'Pi Coding Agent (极速终端)',
          role: '快速单测',
          model: 'claude-sonnet-4-6',
          effort: 'low',
          state: 'completed',
          worktree: '.worktrees/swarm-test',
          summary: '运行类型校验与单元测试，耗时 640ms 全部通过',
        },
      ],
      dshReview: {
        reviewerId: 'a2a-dsh-expert-reviewer',
        reviewerName: 'DSH 专家评审插件 (Expert Gate)',
        model: 'claude-opus-4-6',
        effort: 'xhigh',
        score: 94,
        verdict: 'approve',
        dimensions: [
          { name: '架构一致性', score: 96 },
          { name: '安全边界', score: 95 },
          { name: '性能复杂度', score: 92 },
          { name: '测试覆盖', score: 93 },
        ],
        findings: [
          '所有跨节点路由规则均校验 SSRF 与只读护栏，未发现越权风险。',
          '建议将高频拖拽位置保存做防抖合并以减少磁盘写入。',
        ],
      },
      steps: [
        { ts: new Date(now - 9 * 60_000).toISOString(), state: 'submitted', detail: '主 Agent Codex CLI (gpt-5-codex · high) 启动蜂群拆解，分配独立 Git Worktree' },
        { ts: new Date(now - 8.7 * 60_000).toISOString(), state: 'working', detail: '并行路由：Claude Code (opus-4-6 · high) 执行 UI 重构，Pi (sonnet-4-6 · low) 负责单测回归' },
        { ts: new Date(now - 8.3 * 60_000).toISOString(), state: 'reviewing', detail: 'DSH 专家评审插件 (xhigh) 完成 4 维度会审，综合评分 94/100 (Approve)' },
        { ts: new Date(now - 8 * 60_000).toISOString(), state: 'completed', detail: '已合并 Worktree 产出并同步至跨端会话 ctx-ops-orchestrator-v2' },
      ],
      artifact: 'Swarm 协同完成（3 个 Agent 并行 + DSH 专家 94 分放行）：零类型报错，全部路由规则与跨端上下文已对齐。',
    },
    {
      id: 'a2a-task-9023',
      contextId: 'ctx-edge-tokyo-probe',
      protocolMethod: 'message/send',
      executionMode: 'lead-router',
      state: 'completed',
      prompt: '快速整理东京节点拨测脚本并执行一次边缘健康验证。',
      leadAgentId: 'a2a-hub-codex-lead',
      leadAgentName: 'Codex CLI (主控 Harness)',
      leadNodeId: 'workstation-mac',
      workerAgentId: 'a2a-mac-pi',
      workerAgentName: 'Pi Coding Agent (极速终端)',
      workerNodeId: 'workstation-mac',
      matchedRuleId: 'route-codex-to-pi',
      matchedRuleName: '快速改码与脚本 -> Pi (低思考)',
      matchedSkill: 'fast-edit',
      appliedModel: 'claude-sonnet-4-6',
      appliedEffort: 'low',
      worktreeBranch: 'worktree/pi-quick-edit',
      mcpScope: ['mcp-mac-git-github', 'mcp-hub-filesystem'],
      createdAt: new Date(now - 24 * 60_000).toISOString(),
      updatedAt: new Date(now - 23.8 * 60_000).toISOString(),
      durationMs: 920,
      actor: 'operator',
      subtasks: [],
      dshReview: null,
      steps: [
        { ts: new Date(now - 24 * 60_000).toISOString(), state: 'submitted', detail: '命中自定义路由规则「快速改码与脚本 -> Pi (低思考)」' },
        { ts: new Date(now - 23.9 * 60_000).toISOString(), state: 'working', detail: 'Pi Coding Agent 以 claude-sonnet-4-6 (effort=low) 极速执行脚本整理' },
        { ts: new Date(now - 23.8 * 60_000).toISOString(), state: 'completed', detail: '返回 Artifact 并更新跨端会话 ctx-edge-tokyo-probe' },
      ],
      artifact: 'Pi 已在 920ms 内完成脚本清理与校验，无需消耗高阶推理预算。',
    },
  ];

  const superAgentConfig = {
    routerThinMode: true,
    fastPathEnabled: true,
    subscriptionPassthrough: true,
    inlineBudgetKb: 32,
    watchdogStallSec: 180,
    attentionBudgetLimit: 4,
    consensusPolicy: 'weighted',
    maxReworkRounds: 2,
    roles: [
      { id: 'role-router', title: '全局薄路由 (Thin Router · 零执行)', agentId: 'a2a-hub-codex-lead', weight: 0.25 },
      { id: 'role-worker-core', title: '隔离 Worker (架构与实现)', agentId: 'a2a-hub-claude', weight: 0.3 },
      { id: 'role-worker-fast', title: '隔离 Worker (极速回归/单测)', agentId: 'a2a-mac-pi', weight: 0.15 },
      { id: 'role-dsh-gate', title: 'DSH 多维专家评审团 (Review Gate)', agentId: 'a2a-dsh-expert-reviewer', weight: 0.3 },
    ],
  };

  const superAgentTickets = [
    {
      id: 'tkt-sa-401',
      threadKey: 'gh:ops-console#pr-142',
      channel: 'github',
      title: 'PR #142：重构 A2A 路由鉴权并补充并发回归测试',
      status: 'review_gate',
      pathTaken: 'slow_spawn',
      workerAgentId: 'a2a-hub-claude',
      workerAgentName: 'Claude Code (架构与 UI 专家)',
      worktreeBranch: '.worktrees/tkt-sa-401',
      subscribed: true,
      inlineBytes: 18_400,
      spilledCount: 2,
      lastProgressAt: new Date(now - 38_000).toISOString(),
      watchdogState: 'healthy',
      dshScore: 94,
      updatedAt: new Date(now - 38_000).toISOString(),
    },
    {
      id: 'tkt-sa-402',
      threadKey: 'ci:main#run-8812',
      channel: 'ci',
      title: 'CI #8812：东京节点拨测脚本超时自动定位与修复',
      status: 'running',
      pathTaken: 'fast_passthrough',
      workerAgentId: 'a2a-mac-pi',
      workerAgentName: 'Pi Coding Agent (极速终端)',
      worktreeBranch: '.worktrees/tkt-sa-402',
      subscribed: true,
      inlineBytes: 9_600,
      spilledCount: 1,
      lastProgressAt: new Date(now - 52_000).toISOString(),
      watchdogState: 'healthy',
      dshScore: null,
      updatedAt: new Date(now - 52_000).toISOString(),
    },
    {
      id: 'tkt-sa-403',
      threadKey: 'alert:eu-fra#tls-audit',
      channel: 'alert',
      title: '法兰克福中继节点 nftables 暴露面巡检（疑似依赖阻塞）',
      status: 'stalled',
      pathTaken: 'slow_spawn',
      workerAgentId: 'a2a-frankfurt-gemini',
      workerAgentName: 'Gemini CLI Auditor (Frankfurt VPS)',
      worktreeBranch: '.worktrees/tkt-sa-403',
      subscribed: true,
      inlineBytes: 24_200,
      spilledCount: 1,
      lastProgressAt: new Date(now - 245_000).toISOString(),
      watchdogState: 'stalled',
      dshScore: null,
      updatedAt: new Date(now - 245_000).toISOString(),
    },
  ];

  const contextSpillNodes = [
    {
      spillId: 'spill-901a',
      ticketId: 'tkt-sa-401',
      threadKey: 'gh:ops-console#pr-142',
      parentRef: 'tkt-sa-401 -> review-diff',
      label: 'PR #142 全量 Git Diff 与 AST 变更清单',
      state: 'spilled',
      bytes: 94_208,
      preview: '{ filesChanged: 14, additions: 612, deletions: 184, focus: "src/server.mjs, web/views/AgentsView.tsx" }',
      recallCount: 2,
      updatedAt: new Date(now - 4 * 60_000).toISOString(),
    },
    {
      spillId: 'spill-902b',
      ticketId: 'tkt-sa-401',
      threadKey: 'gh:ops-console#pr-142',
      parentRef: 'spill-901a -> dsh-rubric',
      label: 'DSH 评审团四维检查基线与安全护栏摘要',
      state: 'inline',
      bytes: 8_192,
      preview: '{ gateThreshold: 85, checks: ["Auth+CSRF", "ReadOnly 403", "SSRF Guard", "Worktree Clean"] }',
      recallCount: 4,
      updatedAt: new Date(now - 2 * 60_000).toISOString(),
    },
    {
      spillId: 'spill-903c',
      ticketId: 'tkt-sa-402',
      threadKey: 'ci:main#run-8812',
      parentRef: 'tkt-sa-402 -> ci-stdout',
      label: 'CI #8812 完整构建与测试日志流 (118 KB)',
      state: 'spilled',
      bytes: 120_832,
      preview: '{ failedStep: "edge-tokyo-probe", exitCode: 124, hint: "timeout waiting for /healthz" }',
      recallCount: 1,
      updatedAt: new Date(now - 3 * 60_000).toISOString(),
    },
    {
      spillId: 'spill-904d',
      ticketId: 'tkt-sa-403',
      threadKey: 'alert:eu-fra#tls-audit',
      parentRef: 'tkt-sa-403 -> nftables-dump',
      label: 'Frankfurt VPS nftables 规则集与 DERP 证书链快照',
      state: 'spilled',
      bytes: 73_728,
      preview: '{ table: "inet filter", exposedTcp: [22, 443, 8443], certDaysLeft: 41 }',
      recallCount: 1,
      updatedAt: new Date(now - 6 * 60_000).toISOString(),
    },
  ];

  const triggerEvents = [
    {
      id: 'trg-7006',
      ts: new Date(now - 25_000).toISOString(),
      channel: 'github',
      actor: 'dsh-bot',
      threadKey: 'gh:ops-console#pr-142',
      summary: 'GitHub PR 状态标签自动回写（Agent 自触发回声）',
      decision: 'fast_drop',
      reason: 'Fast Path 确定性代码拦截：自触发回声事件（防止无限循环），消耗 0 推理 Token',
      ticketId: null,
      tokensSaved: 1450,
    },
    {
      id: 'trg-7005',
      ts: new Date(now - 52_000).toISOString(),
      channel: 'ci',
      actor: 'github-actions',
      threadKey: 'ci:main#run-8812',
      summary: 'CI #8812 补充失败日志片段推送',
      decision: 'fast_passthrough',
      reason: 'Subscription Passthrough：线程 ci:main#run-8812 已被 tkt-sa-402 认领，绕过全局 Router 直达 Pi Worker',
      ticketId: 'tkt-sa-402',
      tokensSaved: 980,
    },
    {
      id: 'trg-7004',
      ts: new Date(now - 3 * 60_000).toISOString(),
      channel: 'feishu',
      actor: 'ops-lead',
      threadKey: 'gh:ops-console#pr-142',
      summary: '飞书群 @SuperAgent：请加速完成 PR #142 评审并合入',
      decision: 'fast_passthrough',
      reason: 'Subscription Passthrough：关联工单 tkt-sa-401 正在 DSH 评审阶段，直推至 Claude Worker 会话',
      ticketId: 'tkt-sa-401',
      tokensSaved: 980,
    },
    {
      id: 'trg-7003',
      ts: new Date(now - 5 * 60_000).toISOString(),
      channel: 'github',
      actor: 'maintainer',
      threadKey: 'gh:ops-console#pr-142',
      summary: '新 PR #142 开启：重构 A2A 路由鉴权并补充并发回归测试',
      decision: 'slow_spawn',
      reason: '通过 Fast Path 预筛，由薄 Router 语义评估并分配隔离 Worktree (.worktrees/tkt-sa-401)',
      ticketId: 'tkt-sa-401',
      tokensSaved: 0,
    },
    {
      id: 'trg-7002',
      ts: new Date(now - 9 * 60_000).toISOString(),
      channel: 'webhook',
      actor: 'dependabot',
      threadKey: 'gh:ops-console#chore-99',
      summary: 'stale-label bot-heartbeat 定时保活事件',
      decision: 'fast_drop',
      reason: 'Fast Path 确定性代码拦截：命中低信号噪音过滤规则，未进入全局路由模型',
      ticketId: null,
      tokensSaved: 1200,
    },
  ];

  const collaborationLogs = [
    {
      id: 'alog-1008',
      ts: new Date(now - 25_000).toISOString(),
      level: 'info',
      eventType: 'superagent.fast_path',
      sourceAgentId: 'a2a-hub-codex-lead',
      sourceAgentName: 'Codex CLI (主控 Harness)',
      targetAgentId: 'a2a-hub-codex-lead',
      targetAgentName: 'Codex CLI (主控 Harness)',
      taskId: null,
      contextId: 'gh:ops-console#pr-142',
      worktreeBranch: null,
      model: 'deterministic-code',
      effort: 'low',
      latencyMs: 1,
      spillRefId: null,
      summary: 'Fast Path 代码直滤拦截自回声事件 (dsh-bot)，节省 ~1.45K Router Token',
      detail: '按 DeepSeek SuperAgent 架构：自触发与噪音事件由纯代码层 1ms 过滤，不进入全局 Router 模型上下文。',
    },
    {
      id: 'alog-1007',
      ts: new Date(now - 52_000).toISOString(),
      level: 'info',
      eventType: 'superagent.fast_path',
      sourceAgentId: 'a2a-hub-codex-lead',
      sourceAgentName: 'Codex CLI (主控 Harness)',
      targetAgentId: 'a2a-mac-pi',
      targetAgentName: 'Pi Coding Agent (极速终端)',
      taskId: 'a2a-task-9023',
      contextId: 'ci:main#run-8812',
      worktreeBranch: '.worktrees/tkt-sa-402',
      model: 'claude-sonnet-4-6',
      effort: 'low',
      latencyMs: 3,
      spillRefId: 'spill-903c',
      summary: 'Subscription Passthrough：已订阅线程 ci:main#run-8812 绕过 Router 直达 Pi Worker',
      detail: '线程已被工单 tkt-sa-402 认领，免去中心路由模型预填充开销；大体积 CI 日志已溢出至 spill-903c 按需回溯。',
    },
    {
      id: 'alog-1006',
      ts: new Date(now - 90_000).toISOString(),
      level: 'info',
      eventType: 'context.spill',
      sourceAgentId: 'a2a-hub-claude',
      sourceAgentName: 'Claude Code (架构与 UI 专家)',
      targetAgentId: 'a2a-dsh-expert-reviewer',
      targetAgentName: 'DSH 专家评审插件 (Expert Gate)',
      taskId: 'a2a-task-9024',
      contextId: 'gh:ops-console#pr-142',
      worktreeBranch: '.worktrees/tkt-sa-401',
      model: 'claude-opus-4-6',
      effort: 'high',
      latencyMs: 8,
      spillRefId: 'spill-901a',
      summary: 'Inline/Spill 缓存降载：92 KB Git Diff 溢出至 spill-901a，保留摘要句柄于上下文',
      detail: '遵循 SuperAgent 编译器缓存理念（超出 32KB Inline 阈值），Worker 仅携带轻量引用，后续可通过 Chain of Recall 按需回溯。',
    },
    {
      id: 'alog-1005',
      ts: new Date(now - 2 * 60_000).toISOString(),
      level: 'info',
      eventType: 'dsh.gate_verdict',
      sourceAgentId: 'a2a-dsh-expert-reviewer',
      sourceAgentName: 'DSH 专家评审插件 (Expert Gate)',
      targetAgentId: 'a2a-hub-codex-lead',
      targetAgentName: 'Codex CLI (主控 Harness)',
      taskId: 'a2a-task-9024',
      contextId: 'gh:ops-console#pr-142',
      worktreeBranch: '.worktrees/tkt-sa-401',
      model: 'claude-opus-4-6',
      effort: 'xhigh',
      latencyMs: 680,
      spillRefId: 'spill-902b',
      summary: 'DSH 专家评审团四维加权评分 94/100 (APPROVE) — 工单 tkt-sa-401 放行合入',
      detail: '架构一致性 96 · 安全边界 95 · 性能复杂度 92 · 测试覆盖 93。已汇报薄 Router 更新工单状态。',
    },
    {
      id: 'alog-1004',
      ts: new Date(now - 3 * 60_000).toISOString(),
      level: 'warn',
      eventType: 'watchdog.check',
      sourceAgentId: 'a2a-hub-codex-lead',
      sourceAgentName: 'Codex CLI (主控 Harness)',
      targetAgentId: 'a2a-frankfurt-gemini',
      targetAgentName: 'Gemini CLI Auditor (Frankfurt VPS)',
      taskId: null,
      contextId: 'alert:eu-fra#tls-audit',
      worktreeBranch: '.worktrees/tkt-sa-403',
      model: 'gemini-2.5-pro',
      effort: 'high',
      latencyMs: 138,
      spillRefId: 'spill-904d',
      summary: '外部 Watchdog 告警：工单 tkt-sa-403 超过 180s 无进展（疑似阻塞），等待恢复或人工介入',
      detail: 'Frankfurt VPS Worker 处于 stalled 状态，建议运行 Watchdog 一键恢复或重新分配隔离 Worktree。',
    },
    {
      id: 'alog-1003',
      ts: new Date(now - 4 * 60_000).toISOString(),
      level: 'info',
      eventType: 'swarm.fanout',
      sourceAgentId: 'a2a-hub-codex-lead',
      sourceAgentName: 'Codex CLI (主控 Harness)',
      targetAgentId: 'a2a-hub-claude',
      targetAgentName: 'Claude Code (架构与 UI 专家)',
      taskId: 'a2a-task-9024',
      contextId: 'gh:ops-console#pr-142',
      worktreeBranch: '.worktrees/tkt-sa-401',
      model: 'claude-opus-4-6',
      effort: 'high',
      latencyMs: 1420,
      spillRefId: 'spill-901a',
      summary: '薄 Router 派发隔离 Worker (Claude Code) 并行处理 PR #142 鉴权与拓扑变更',
      detail: 'Router 不执行本地 Bash，仅创建独立 Worktree 与工单上下文，实现多任务并行不互扰。',
    },
    {
      id: 'alog-1002',
      ts: new Date(now - 8 * 60_000).toISOString(),
      level: 'info',
      eventType: 'session.sync',
      sourceAgentId: 'a2a-hub-codex-lead',
      sourceAgentName: 'Codex CLI (主控 Harness)',
      targetAgentId: 'a2a-tokyo-opencode',
      targetAgentName: 'OpenCode Edge Ops (Tokyo VPS)',
      taskId: 'a2a-task-9023',
      contextId: 'ctx-edge-tokyo-probe',
      worktreeBranch: 'ops/tokyo-mcp-sync',
      model: 'deepseek-r1-edge',
      effort: 'medium',
      latencyMs: 44,
      spillRefId: null,
      summary: 'A2A Context Bus 同步 rev.18 至 workstation-mac / hub-primary / edge-tokyo',
      detail: '跨端工单上下文与 Chain of Recall 引用链一致，零上下文漂移。',
    },
  ];

  return {
    leadAgentId: 'a2a-hub-codex-lead',
    agents,
    routingRules,
    orchestrationConfig,
    skillCatalog,
    sessions,
    tasks,
    superAgentConfig,
    superAgentTickets,
    contextSpillNodes,
    triggerEvents,
    collaborationLogs,
  };
}

export class A2AOrchestrator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.dataDir = config?.console?.dataDir || path.join(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, 'a2a-orchestrator.json');
    this.leadAgentId = null;
    this.agents = new Map();
    this.routingRules = new Map();
    this.skillCatalog = new Map();
    this.sessions = new Map();
    this.orchestrationConfig = {
      mode: 'lead-router',
      mainModel: 'gpt-5-codex',
      mainEffort: 'high',
      subModel: 'claude-sonnet-4-6',
      subEffort: 'low',
      worktreeIsolation: true,
      dshReviewGate: {
        enabled: true,
        minScore: 85,
        autoGateHighRisk: true,
        dimensions: ['架构一致性', '安全边界', '性能复杂度', '测试覆盖'],
      },
    };
    this.tasks = [];
    this.superAgentConfig = {
      routerThinMode: true,
      fastPathEnabled: true,
      subscriptionPassthrough: true,
      inlineBudgetKb: 32,
      watchdogStallSec: 180,
      attentionBudgetLimit: 4,
      consensusPolicy: 'weighted',
      maxReworkRounds: 2,
      roles: [],
    };
    this.superAgentTickets = new Map();
    this.contextSpillNodes = new Map();
    this.triggerEvents = [];
    this.collaborationLogs = [];
    this._logListener = null;
    this._initialized = false;
  }

  setLogListener(listener) {
    this._logListener = typeof listener === 'function' ? listener : null;
  }

  _appendLog(partial) {
    const entry = {
      id: `alog-${crypto.randomBytes(4).toString('hex')}`,
      ts: partial.ts || new Date().toISOString(),
      level: VALID_LOG_LEVELS.has(partial.level) ? partial.level : 'info',
      eventType: VALID_LOG_EVENTS.has(partial.eventType) ? partial.eventType : 'a2a.delegate',
      sourceAgentId: String(partial.sourceAgentId || this.leadAgentId || 'system').slice(0, 64),
      sourceAgentName: redactText(String(partial.sourceAgentName || partial.sourceAgentId || 'Lead')).slice(0, 80),
      targetAgentId: String(partial.targetAgentId || partial.sourceAgentId || 'system').slice(0, 64),
      targetAgentName: redactText(String(partial.targetAgentName || partial.targetAgentId || 'Worker')).slice(0, 80),
      taskId: partial.taskId ? String(partial.taskId).slice(0, 64) : null,
      contextId: partial.contextId ? String(partial.contextId).slice(0, 64) : null,
      worktreeBranch: partial.worktreeBranch ? String(partial.worktreeBranch).slice(0, 96) : null,
      model: partial.model ? redactText(String(partial.model)).slice(0, 64) : null,
      effort: partial.effort ? sanitizeEffort(partial.effort, 'medium') : null,
      latencyMs: Number.isFinite(Number(partial.latencyMs)) ? Math.max(0, Math.round(Number(partial.latencyMs))) : null,
      spillRefId: partial.spillRefId ? String(partial.spillRefId).slice(0, 64) : null,
      summary: redactText(String(partial.summary || '')).slice(0, 220),
      detail: redactText(String(partial.detail || '')).slice(0, 480),
    };
    this.collaborationLogs.unshift(entry);
    if (this.collaborationLogs.length > 300) {
      this.collaborationLogs.length = 300;
    }
    if (this._logListener) {
      try {
        this._logListener(entry);
      } catch {
        // non-blocking
      }
    }
    return entry;
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;
    if (this.config?.demo) {
      const demo = buildDemoA2AState();
      this.leadAgentId = demo.leadAgentId;
      for (const agent of demo.agents) this.agents.set(agent.id, agent);
      for (const rule of demo.routingRules) this.routingRules.set(rule.id, rule);
      for (const sk of demo.skillCatalog) this.skillCatalog.set(sk.id, sk);
      for (const sess of demo.sessions) this.sessions.set(sess.id, sess);
      for (const tkt of demo.superAgentTickets) this.superAgentTickets.set(tkt.id, tkt);
      for (const node of demo.contextSpillNodes) this.contextSpillNodes.set(node.spillId, node);
      this.orchestrationConfig = demo.orchestrationConfig;
      this.superAgentConfig = demo.superAgentConfig;
      this.triggerEvents = demo.triggerEvents;
      this.tasks = demo.tasks;
      this.collaborationLogs = demo.collaborationLogs;
      return;
    }
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (typeof parsed?.leadAgentId === 'string') this.leadAgentId = parsed.leadAgentId;
      if (Array.isArray(parsed?.agents)) {
        for (const a of parsed.agents) {
          if (a?.id) this.agents.set(a.id, a);
        }
      }
      if (Array.isArray(parsed?.routingRules)) {
        for (const r of parsed.routingRules) {
          if (r?.id) this.routingRules.set(r.id, r);
        }
      }
      if (Array.isArray(parsed?.skillCatalog)) {
        for (const s of parsed.skillCatalog) {
          if (s?.id) this.skillCatalog.set(s.id, s);
        }
      }
      if (Array.isArray(parsed?.sessions)) {
        for (const sess of parsed.sessions) {
          if (sess?.id) this.sessions.set(sess.id, sess);
        }
      }
      if (Array.isArray(parsed?.superAgentTickets)) {
        for (const tkt of parsed.superAgentTickets) {
          if (tkt?.id) this.superAgentTickets.set(tkt.id, tkt);
        }
      }
      if (Array.isArray(parsed?.contextSpillNodes)) {
        for (const node of parsed.contextSpillNodes) {
          if (node?.spillId) this.contextSpillNodes.set(node.spillId, node);
        }
      }
      if (Array.isArray(parsed?.triggerEvents)) {
        this.triggerEvents = parsed.triggerEvents.slice(0, 80);
      }
      if (parsed?.superAgentConfig && typeof parsed.superAgentConfig === 'object') {
        this.superAgentConfig = {
          ...this.superAgentConfig,
          ...parsed.superAgentConfig,
        };
      }
      if (parsed?.orchestrationConfig && typeof parsed.orchestrationConfig === 'object') {
        this.orchestrationConfig = {
          ...this.orchestrationConfig,
          ...parsed.orchestrationConfig,
          dshReviewGate: {
            ...this.orchestrationConfig.dshReviewGate,
            ...(parsed.orchestrationConfig.dshReviewGate || {}),
          },
        };
      }
      if (Array.isArray(parsed?.tasks)) {
        this.tasks = parsed.tasks.slice(0, 60);
      }
      if (Array.isArray(parsed?.collaborationLogs)) {
        this.collaborationLogs = parsed.collaborationLogs.slice(0, 300);
      }
    } catch {
      // Fresh state
    }
  }

  async persist() {
    if (this.config?.demo) return;
    await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const payload = JSON.stringify(
      {
        version: 4,
        updatedAt: new Date().toISOString(),
        leadAgentId: this.leadAgentId,
        orchestrationConfig: this.orchestrationConfig,
        superAgentConfig: this.superAgentConfig,
        agents: [...this.agents.values()],
        routingRules: [...this.routingRules.values()],
        skillCatalog: [...this.skillCatalog.values()],
        sessions: [...this.sessions.values()],
        superAgentTickets: [...this.superAgentTickets.values()],
        contextSpillNodes: [...this.contextSpillNodes.values()],
        triggerEvents: this.triggerEvents.slice(0, 80),
        tasks: this.tasks.slice(0, 60),
        collaborationLogs: this.collaborationLogs.slice(0, 200),
      },
      null,
      2,
    );
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, payload, { mode: 0o600 });
    await fs.rename(tmpPath, this.filePath);
  }

  getState(fleetNodes = []) {
    const nodeNameMap = new Map((fleetNodes || []).map((n) => [n.id, n.name || n.id]));
    const agentList = [...this.agents.values()].map((agent, idx) => {
      const { authToken: _omittedAuth, ...safeAgent } = agent;
      return {
        ...safeAgent,
        nodeName: nodeNameMap.get(agent.nodeId) || agent.nodeName || agent.nodeId,
        role: agent.id === this.leadAgentId ? 'lead' : 'worker',
        reasoningEffort: sanitizeEffort(agent.reasoningEffort, agent.id === this.leadAgentId ? 'high' : 'medium'),
        version: agent.version || '0.1.0',
        latestVersion: agent.latestVersion || agent.version || '0.1.0',
        updateAvailable: Boolean(agent.latestVersion && agent.version && compareSemver(agent.latestVersion, agent.version) > 0),
        position: agent.position && Number.isFinite(agent.position.x) && Number.isFinite(agent.position.y)
          ? agent.position
          : { x: agent.id === this.leadAgentId ? 40 : 380, y: 40 + idx * 140 },
      };
    });

    // Merge probe-reported harnesses not yet explicitly registered
    for (const node of fleetNodes || []) {
      if (!Array.isArray(node?.harnesses)) continue;
      for (const raw of node.harnesses) {
        if (!raw?.name) continue;
        const id = raw.id || `probe-a2a-${node.id}-${sanitizeId(raw.name, 'agent')}`;
        const existingPeer = agentList.find(
          (agent) =>
            agent.id === id
            || (agent.nodeId === node.id && raw.rpcUrl && agent.rpcUrl === raw.rpcUrl)
            || (agent.nodeId === node.id && raw.harness && agent.harness === raw.harness),
        );
        if (existingPeer) {
          const probeStatus = node.status === 'offline' ? 'offline' : String(raw.status || 'healthy').slice(0, 24);
          existingPeer.status = probeStatus;
          if (node.lastHeartbeatAt || raw.lastVerifiedAt) {
            existingPeer.lastHeartbeatAt = node.lastHeartbeatAt || raw.lastVerifiedAt;
            existingPeer.lastVerifiedAt = node.lastHeartbeatAt || raw.lastVerifiedAt;
          }
          if (!existingPeer.agentCardUrl && raw.agentCardUrl) existingPeer.agentCardUrl = raw.agentCardUrl;
          if (!existingPeer.rpcUrl && raw.rpcUrl) existingPeer.rpcUrl = raw.rpcUrl;
          continue;
        }
        agentList.push({
          id,
          name: String(raw.name).slice(0, 80),
          harness: VALID_HARNESS_KINDS.has(raw.harness) ? raw.harness : 'custom-a2a',
          nodeId: node.id,
          nodeName: node.name || node.id,
          role: id === this.leadAgentId ? 'lead' : 'worker',
          delegatable: raw.delegatable !== false,
          status: node.status === 'offline' ? 'offline' : String(raw.status || 'healthy').slice(0, 24),
          protocolVersion: String(raw.protocolVersion || '0.3').slice(0, 24),
          version: String(raw.version || '0.1.0').slice(0, 32),
          latestVersion: String(raw.latestVersion || raw.version || '0.1.0').slice(0, 32),
          updateAvailable: false,
          installPath: raw.installPath || null,
          autoDetected: true,
          pluginKind: raw.harness === 'dsh-expert' ? 'dsh-review-plugin' : 'harness',
          agentCardUrl: raw.agentCardUrl || null,
          rpcUrl: raw.rpcUrl || null,
          modelHint: raw.modelHint || null,
          reasoningEffort: sanitizeEffort(raw.reasoningEffort, 'medium'),
          position: { x: 380, y: 40 + agentList.length * 135 },
          capabilities: raw.capabilities || { streaming: true, pushNotifications: false, stateTransitionHistory: true },
          skills: sanitizeSkills(raw.skills),
          boundMcpIds: Array.isArray(raw.boundMcpIds) ? raw.boundMcpIds.slice(0, 16) : [],
          latencyMs: Number.isFinite(raw.latencyMs) ? Math.round(raw.latencyMs) : null,
          lastHeartbeatAt: node.lastHeartbeatAt || raw.lastVerifiedAt || new Date().toISOString(),
          lastVerifiedAt: raw.lastVerifiedAt || node.lastHeartbeatAt || new Date().toISOString(),
          description: redactText(String(raw.description || `由节点 ${node.name || node.id} 自动发现的外部 Agent Harness`)).slice(0, 180),
        });
      }
    }

    const leadAgent = agentList.find((a) => a.id === this.leadAgentId) || null;
    const workers = agentList.filter((a) => a.id !== this.leadAgentId);
    const delegatableWorkers = workers.filter((a) => a.delegatable && a.status !== 'offline').length;
    const activeTasks = this.tasks.filter((t) => t.state === 'submitted' || t.state === 'working').length;
    const completedTasks = this.tasks.filter((t) => t.state === 'completed').length;
    const rules = [...this.routingRules.values()].sort((a, b) => (a.priority || 100) - (b.priority || 100));
    const skills = [...this.skillCatalog.values()];
    const sessions = [...this.sessions.values()];
    const outdatedAgents = agentList.filter((a) => a.updateAvailable).length;

    return {
      ok: true,
      architecture: {
        harnessFree: true,
        protocol: 'A2A (Agent2Agent)',
        protocolVersion: '0.3',
        license: 'Apache-2.0',
        governance: 'Linux Foundation (Agentic AI Foundation)',
        summary: '无内置自有 Agent Harness：融合 DeepSeek SuperAgent（薄 Router / 隔离 Worker / Fast-Slow Path / Inline-Spill Chain of Recall / Watchdog）与 DSH 多角色专家团队协作。',
      },
      leadAgentId: leadAgent?.id || null,
      leadAgent,
      orchestrationConfig: this.orchestrationConfig,
      summary: {
        totalAgents: agentList.length,
        onlineAgents: agentList.filter((a) => a.status === 'healthy' || a.status === 'degraded').length,
        delegatableWorkers,
        nodesWithAgents: new Set(agentList.map((a) => a.nodeId)).size,
        activeTasks,
        completedTasks,
        totalTasks: this.tasks.length,
        enabledRules: rules.filter((r) => r.enabled).length,
        totalRules: rules.length,
        totalSkills: skills.length,
        syncedSessions: sessions.filter((s) => s.state === 'synced').length,
        totalSessions: sessions.length,
        outdatedAgents,
      },
      agents: agentList,
      routingRules: rules,
      skillCatalog: skills,
      sessions,
      tasks: this.tasks.slice(0, 30),
      superAgentConfig: this.superAgentConfig,
      superAgentTickets: [...this.superAgentTickets.values()],
      contextSpillNodes: [...this.contextSpillNodes.values()],
      triggerEvents: this.triggerEvents.slice(0, 30),
      swarmMetrics: this.getSwarmMetrics(agentList),
      recentLogsCount: this.collaborationLogs.length,
    };
  }

  getCollaborationLogs({ agentId = '', eventType = '', level = '', q = '', limit = 80 } = {}) {
    const cleanAgent = String(agentId || '').trim();
    const cleanType = String(eventType || '').trim();
    const cleanLevel = String(level || '').trim().toLowerCase();
    const query = String(q || '').trim().toLowerCase();
    const cappedLimit = Math.max(1, Math.min(200, Number(limit) || 80));

    let items = this.collaborationLogs;
    if (cleanAgent && cleanAgent !== 'all') {
      items = items.filter(
        (entry) => entry.sourceAgentId === cleanAgent || entry.targetAgentId === cleanAgent,
      );
    }
    if (cleanType && cleanType !== 'all') {
      items = items.filter((entry) => entry.eventType === cleanType || entry.eventType.startsWith(`${cleanType}.`));
    }
    if (cleanLevel && cleanLevel !== 'all') {
      items = items.filter((entry) => entry.level === cleanLevel);
    }
    if (query) {
      items = items.filter((entry) => {
        const hay = `${entry.sourceAgentName} ${entry.targetAgentName} ${entry.eventType} ${entry.summary} ${entry.detail} ${entry.contextId || ''} ${entry.spillRefId || ''}`.toLowerCase();
        return hay.includes(query);
      });
    }

    return {
      ok: true,
      total: items.length,
      items: items.slice(0, cappedLimit),
    };
  }

  getSwarmMetrics(explicitAgents = null) {
    const agents = Array.isArray(explicitAgents) ? explicitAgents : [...this.agents.values()];
    const activeAgents = Math.max(1, agents.filter((a) => a.status !== 'offline').length);
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter((t) => t.state === 'completed');
    const totalSubtasks = this.tasks.reduce((sum, t) => sum + (Array.isArray(t.subtasks) ? t.subtasks.length : 0), 0);
    const tickets = [...this.superAgentTickets.values()];
    const totalWorkUnits = totalTasks + totalSubtasks + tickets.length;
    const taskToAgentThroughputRatio = Number((totalWorkUnits / activeAgents).toFixed(2));

    const swarmTasks = this.tasks.filter((t) => t.executionMode === 'swarm' || (t.subtasks && t.subtasks.length >= 2));
    const avgDurationMs = completedTasks.length > 0
      ? Math.round(completedTasks.reduce((sum, t) => sum + (Number(t.durationMs) || 0), 0) / completedTasks.length)
      : 0;
    const parallelSpeedup = swarmTasks.length > 0
      ? Number(
          Math.min(
            3.8,
            1 +
              (swarmTasks.reduce((s, t) => s + Math.max(1, (t.subtasks?.length || 1) - 1), 0) /
                Math.max(1, swarmTasks.length)) *
                0.78,
          ).toFixed(2),
        )
      : 1.4;

    const totalTriggers = this.triggerEvents.length;
    const fastDropCount = this.triggerEvents.filter((e) => e.decision === 'fast_drop').length;
    const fastPassthroughCount = this.triggerEvents.filter((e) => e.decision === 'fast_passthrough').length;
    const slowSpawnCount = this.triggerEvents.filter((e) => e.decision === 'slow_spawn').length;
    const fastPathOffloadPct = totalTriggers > 0
      ? Math.round(((fastDropCount + fastPassthroughCount) / totalTriggers) * 100)
      : 0;
    const routerTokensSaved = this.triggerEvents.reduce((sum, e) => sum + (Number(e.tokensSaved) || 0), 0);

    const spillNodes = [...this.contextSpillNodes.values()];
    const spilledBytes = spillNodes
      .filter((n) => n.state === 'spilled')
      .reduce((sum, n) => sum + (Number(n.bytes) || 0), 0);
    const inlineBytes = spillNodes
      .filter((n) => n.state === 'inline')
      .reduce((sum, n) => sum + (Number(n.bytes) || 0), 0);
    const contextSavedKb = Math.round(spilledBytes / 1024);

    const activeTickets = tickets.filter((t) => t.status !== 'completed').length;
    const stalledTickets = tickets.filter((t) => t.status === 'stalled' || t.watchdogState === 'stalled').length;
    const needsAttentionCount = tickets.filter(
      (t) => t.status === 'stalled' || t.status === 'needs_attention' || t.status === 'review_gate',
    ).length;

    const reviewedTasks = this.tasks.filter((t) => t.dshReview);
    const approvedTasks = reviewedTasks.filter((t) => t.dshReview?.verdict === 'approve');
    const dshConsensusRate = reviewedTasks.length > 0
      ? Math.round((approvedTasks.length / reviewedTasks.length) * 100)
      : 100;

    const perAgentStats = agents.map((a) => {
      const leadCount = this.tasks.filter((t) => t.leadAgentId === a.id).length;
      const workerCount = this.tasks.filter((t) => t.workerAgentId === a.id).length;
      const ticketCount = tickets.filter((t) => t.workerAgentId === a.id).length;
      const subCount = this.tasks.reduce(
        (sum, t) => sum + (t.subtasks || []).filter((s) => s.agentId === a.id).length,
        0,
      );
      const logCount = this.collaborationLogs.filter(
        (l) => l.sourceAgentId === a.id || l.targetAgentId === a.id,
      ).length;
      return {
        agentId: a.id,
        name: a.name.replace(/\s*\(.*?\)\s*/g, '').trim() || a.harness,
        harness: a.harness,
        role: a.id === this.leadAgentId ? 'lead' : 'worker',
        handledUnits: leadCount + workerCount + subCount + ticketCount,
        subtasks: subCount,
        collabEvents: logCount,
        latencyMs: a.latencyMs ?? 18,
      };
    });

    return {
      activeAgents,
      totalTasks,
      completedTasks: completedTasks.length,
      totalSubtasks,
      totalWorkUnits,
      taskToAgentThroughputRatio,
      parallelSpeedup,
      avgDurationMs,
      fastPathOffloadPct,
      fastDropCount,
      fastPassthroughCount,
      slowSpawnCount,
      routerTokensSaved,
      contextSavedKb,
      inlineContextKb: Math.round(inlineBytes / 1024),
      spilledNodesCount: spillNodes.filter((n) => n.state === 'spilled').length,
      totalSpillNodes: spillNodes.length,
      activeTickets,
      stalledTickets,
      needsAttentionCount,
      attentionBudgetLimit: this.superAgentConfig.attentionBudgetLimit || 4,
      dshConsensusRate,
      perAgentStats,
    };
  }

  async updateSuperAgentConfig(payload = {}) {
    if (typeof payload.routerThinMode === 'boolean') {
      this.superAgentConfig.routerThinMode = payload.routerThinMode;
    }
    if (typeof payload.fastPathEnabled === 'boolean') {
      this.superAgentConfig.fastPathEnabled = payload.fastPathEnabled;
    }
    if (typeof payload.subscriptionPassthrough === 'boolean') {
      this.superAgentConfig.subscriptionPassthrough = payload.subscriptionPassthrough;
    }
    if (payload.inlineBudgetKb != null) {
      this.superAgentConfig.inlineBudgetKb = Math.max(8, Math.min(64, Math.round(Number(payload.inlineBudgetKb) || 32)));
    }
    if (payload.watchdogStallSec != null) {
      this.superAgentConfig.watchdogStallSec = Math.max(30, Math.min(900, Math.round(Number(payload.watchdogStallSec) || 180)));
    }
    if (payload.attentionBudgetLimit != null) {
      this.superAgentConfig.attentionBudgetLimit = Math.max(1, Math.min(10, Math.round(Number(payload.attentionBudgetLimit) || 4)));
    }
    if (payload.consensusPolicy && VALID_CONSENSUS_POLICIES.has(String(payload.consensusPolicy))) {
      this.superAgentConfig.consensusPolicy = String(payload.consensusPolicy);
    }
    if (payload.maxReworkRounds != null) {
      this.superAgentConfig.maxReworkRounds = Math.max(1, Math.min(5, Math.round(Number(payload.maxReworkRounds) || 2)));
    }

    const lead = this.agents.get(this.leadAgentId);
    this._appendLog({
      level: 'info',
      eventType: 'superagent.route',
      sourceAgentId: lead?.id || 'system',
      sourceAgentName: lead?.name || 'Thin Router',
      targetAgentId: lead?.id || 'system',
      targetAgentName: lead?.name || 'Thin Router',
      summary: `SuperAgent 策略已更新：FastPath=${this.superAgentConfig.fastPathEnabled ? 'ON' : 'OFF'} · Passthrough=${this.superAgentConfig.subscriptionPassthrough ? 'ON' : 'OFF'} · Inline 阈值 ${this.superAgentConfig.inlineBudgetKb}KB`,
      detail: `Watchdog 阻塞阈值 ${this.superAgentConfig.watchdogStallSec}s · DSH 共识策略 ${this.superAgentConfig.consensusPolicy} · 人类注意力上限 ${this.superAgentConfig.attentionBudgetLimit}`,
    });

    await this.persist();
    return {
      ok: true,
      superAgentConfig: this.superAgentConfig,
      swarmMetrics: this.getSwarmMetrics(),
    };
  }

  async ingestTriggerEvent(payload = {}, { actor = 'operator' } = {}) {
    const channel = VALID_TRIGGER_CHANNELS.has(String(payload.channel || '').toLowerCase())
      ? String(payload.channel).toLowerCase()
      : 'github';
    const summary = redactText(String(payload.summary || '').trim()).slice(0, 220);
    if (!summary) {
      const err = new Error('Trigger event summary is required');
      err.statusCode = 400;
      throw err;
    }
    const eventActor = redactText(String(payload.actor || actor || 'webhook').trim()).slice(0, 48);
    const threadKey = redactText(
      String(payload.threadKey || `${channel}:ops-console#${crypto.randomBytes(2).toString('hex')}`).trim(),
    ).slice(0, 72);

    const activeTickets = [...this.superAgentTickets.values()];
    const evalResult = evaluateFastPathTrigger(
      {
        channel,
        actor: eventActor,
        threadKey,
        summary,
        isSelfOrigin: Boolean(payload.isSelfOrigin),
        isNoise: Boolean(payload.isNoise),
      },
      this.superAgentConfig,
      activeTickets,
    );

    const lead = this.agents.get(this.leadAgentId) || [...this.agents.values()][0];
    let affectedTicket = evalResult.matchedTicket || null;

    if (evalResult.decision === 'fast_passthrough' && affectedTicket) {
      affectedTicket.lastProgressAt = new Date().toISOString();
      affectedTicket.updatedAt = affectedTicket.lastProgressAt;
      affectedTicket.inlineBytes = Math.min(64_000, (affectedTicket.inlineBytes || 8_000) + 1_600);
      this.superAgentTickets.set(affectedTicket.id, affectedTicket);
    } else if (evalResult.decision === 'slow_spawn') {
      const { worker } = this._selectWorkerForTask(payload.targetAgentId || 'auto', summary, '');
      const ticketId = `tkt-sa-${crypto.randomBytes(2).toString('hex')}`;
      const nowIso = new Date().toISOString();
      affectedTicket = {
        id: ticketId,
        threadKey,
        channel,
        title: summary.slice(0, 96),
        status: 'running',
        pathTaken: 'slow_spawn',
        workerAgentId: worker.id,
        workerAgentName: worker.name,
        worktreeBranch: `.worktrees/${ticketId}`,
        subscribed: true,
        inlineBytes: 11_200,
        spilledCount: 0,
        lastProgressAt: nowIso,
        watchdogState: 'healthy',
        dshScore: null,
        updatedAt: nowIso,
      };
      this.superAgentTickets.set(ticketId, affectedTicket);
    }

    const triggerRecord = {
      id: `trg-${crypto.randomBytes(3).toString('hex')}`,
      ts: new Date().toISOString(),
      channel,
      actor: eventActor,
      threadKey,
      summary,
      decision: evalResult.decision,
      reason: evalResult.reason,
      ticketId: affectedTicket?.id || null,
      tokensSaved: evalResult.tokensSaved,
    };
    this.triggerEvents.unshift(triggerRecord);
    if (this.triggerEvents.length > 60) this.triggerEvents.length = 60;

    this._appendLog({
      level: evalResult.decision === 'fast_drop' ? 'info' : 'info',
      eventType: evalResult.decision === 'slow_spawn' ? 'superagent.route' : 'superagent.fast_path',
      sourceAgentId: lead?.id || 'system',
      sourceAgentName: lead?.name || 'Thin Router',
      targetAgentId: affectedTicket?.workerAgentId || lead?.id || 'system',
      targetAgentName: affectedTicket?.workerAgentName || lead?.name || 'Thin Router',
      contextId: threadKey,
      worktreeBranch: affectedTicket?.worktreeBranch || null,
      model: evalResult.decision === 'slow_spawn' ? this.orchestrationConfig.mainModel : 'deterministic-code',
      effort: evalResult.decision === 'slow_spawn' ? 'medium' : 'low',
      latencyMs: evalResult.decision === 'slow_spawn' ? 185 : 2,
      summary:
        evalResult.decision === 'fast_drop'
          ? `Fast Path 直滤丢弃 [${channel}/${eventActor}]：${summary.slice(0, 64)}`
          : evalResult.decision === 'fast_passthrough'
            ? `Subscription Passthrough 直达 ${affectedTicket?.workerAgentName?.replace(/\s*\(.*?\)\s*/g, '')}：${summary.slice(0, 64)}`
            : `薄 Router 语义受理并创建隔离工单 ${affectedTicket?.id} -> ${affectedTicket?.workerAgentName?.replace(/\s*\(.*?\)\s*/g, '')}`,
      detail: evalResult.reason,
    });

    await this.persist();
    return {
      ok: true,
      trigger: triggerRecord,
      ticket: affectedTicket,
      swarmMetrics: this.getSwarmMetrics(),
    };
  }

  async toggleContextSpillNode(spillId, desiredState = '') {
    const node = this.contextSpillNodes.get(spillId);
    if (!node) {
      const err = new Error(`Context spill node not found: ${spillId}`);
      err.statusCode = 404;
      throw err;
    }
    const nextState = desiredState === 'inline' || desiredState === 'spilled'
      ? desiredState
      : node.state === 'spilled'
        ? 'inline'
        : 'spilled';
    node.state = nextState;
    if (nextState === 'inline') {
      node.recallCount = (node.recallCount || 0) + 1;
    }
    node.updatedAt = new Date().toISOString();
    this.contextSpillNodes.set(spillId, node);

    const ticket = this.superAgentTickets.get(node.ticketId);
    const worker = ticket ? this.agents.get(ticket.workerAgentId) : this.agents.get(this.leadAgentId);
    const lead = this.agents.get(this.leadAgentId);

    this._appendLog({
      level: 'info',
      eventType: nextState === 'inline' ? 'context.recall' : 'context.spill',
      sourceAgentId: worker?.id || lead?.id || 'system',
      sourceAgentName: worker?.name || lead?.name || 'Worker',
      targetAgentId: lead?.id || 'system',
      targetAgentName: lead?.name || 'Thin Router',
      contextId: node.threadKey,
      worktreeBranch: ticket?.worktreeBranch || null,
      latencyMs: nextState === 'inline' ? 11 : 6,
      spillRefId: node.spillId,
      summary:
        nextState === 'inline'
          ? `Chain of Recall 按需回溯 ${node.spillId}（${Math.round(node.bytes / 1024)} KB）至活动窗口`
          : `Inline/Spill 溢出降载 ${node.spillId}（释放 ${Math.round(node.bytes / 1024)} KB 上下文缓存）`,
      detail: `回溯链：${node.parentRef} · ${node.label} · 累计回溯 ${node.recallCount} 次`,
    });

    await this.persist();
    return {
      ok: true,
      node,
      swarmMetrics: this.getSwarmMetrics(),
    };
  }

  async runWatchdogSweep() {
    const nowMs = Date.now();
    const thresholdMs = (this.superAgentConfig.watchdogStallSec || 180) * 1000;
    const recovered = [];
    const checked = [];
    const lead = this.agents.get(this.leadAgentId);

    for (const [id, ticket] of this.superAgentTickets.entries()) {
      if (ticket.status === 'completed') continue;
      checked.push(id);
      const lastMs = Date.parse(ticket.lastProgressAt || '') || nowMs;
      const isStalled = ticket.status === 'stalled' || ticket.watchdogState === 'stalled' || nowMs - lastMs > thresholdMs;
      if (isStalled) {
        ticket.status = 'running';
        ticket.watchdogState = 'recovered';
        ticket.lastProgressAt = new Date(nowMs).toISOString();
        ticket.updatedAt = ticket.lastProgressAt;
        this.superAgentTickets.set(id, ticket);
        recovered.push(ticket);

        this._appendLog({
          level: 'warn',
          eventType: 'watchdog.check',
          sourceAgentId: lead?.id || 'system',
          sourceAgentName: 'SuperAgent Watchdog',
          targetAgentId: ticket.workerAgentId,
          targetAgentName: ticket.workerAgentName,
          contextId: ticket.threadKey,
          worktreeBranch: ticket.worktreeBranch,
          latencyMs: 28,
          summary: `Watchdog 检测到阻塞工单 ${ticket.id}，已重建隔离会话并恢复执行`,
          detail: `超出 ${this.superAgentConfig.watchdogStallSec}s 心跳阈值，已安全重启 Worker ${ticket.workerAgentName}，避免静默挂起。`,
        });
      }
    }

    if (recovered.length === 0) {
      this._appendLog({
        level: 'info',
        eventType: 'watchdog.check',
        sourceAgentId: lead?.id || 'system',
        sourceAgentName: 'SuperAgent Watchdog',
        targetAgentId: lead?.id || 'system',
        targetAgentName: lead?.name || 'Thin Router',
        latencyMs: 9,
        summary: `外部 Watchdog 巡检完成：${checked.length} 个活跃隔离工单全部心跳正常`,
        detail: `所有 Worker 在 ${this.superAgentConfig.watchdogStallSec}s 进度窗口内均有有效推进，无死循环或权限越界。`,
      });
    }

    await this.persist();
    return {
      ok: true,
      checkedCount: checked.length,
      recoveredCount: recovered.length,
      recoveredTickets: recovered,
      superAgentTickets: [...this.superAgentTickets.values()],
      swarmMetrics: this.getSwarmMetrics(),
    };
  }

  async runDshTeamCollaboration(payload = {}, { actor = 'operator' } = {}) {
    const prompt = redactText(String(payload.prompt || '').trim()).slice(0, 500);
    if (!prompt) {
      const err = new Error('Collaboration prompt is required');
      err.statusCode = 400;
      throw err;
    }

    const channel = VALID_TRIGGER_CHANNELS.has(String(payload.channel || '').toLowerCase())
      ? String(payload.channel).toLowerCase()
      : 'github';
    const policy = VALID_CONSENSUS_POLICIES.has(String(payload.consensusPolicy || ''))
      ? String(payload.consensusPolicy)
      : this.superAgentConfig.consensusPolicy || 'weighted';
    const enableAutoSpill = payload.enableAutoSpill !== false;

    const lead = this.agents.get(this.leadAgentId) || [...this.agents.values()][0];
    const ticketId = `tkt-sa-${crypto.randomBytes(2).toString('hex')}`;
    const threadKey = `${channel}:ops-console#${ticketId.slice(-4)}`;

    // Dispatch as isolated Worktree Swarm + DSH Expert Review Gate
    const task = await this.dispatchTask(
      {
        prompt,
        executionMode: 'swarm',
        requireDshReview: true,
        contextId: threadKey,
        sessionId: payload.sessionId || undefined,
      },
      { actor },
    );

    const reviewer = this.agents.get('a2a-dsh-expert-reviewer');
    const score = task.dshReview?.score ?? 92;
    const approved = policy === 'lead-override' ? true : score >= (this.orchestrationConfig.dshReviewGate?.minScore || 85);
    const nowIso = new Date().toISOString();

    // Create SuperAgent Ticket record
    const ticket = {
      id: ticketId,
      threadKey,
      channel,
      title: prompt.slice(0, 96),
      status: approved ? 'completed' : 'review_gate',
      pathTaken: 'slow_spawn',
      workerAgentId: task.workerAgentId,
      workerAgentName: task.workerAgentName,
      worktreeBranch: task.worktreeBranch || `.worktrees/${ticketId}`,
      subscribed: !approved,
      inlineBytes: Math.min((this.superAgentConfig.inlineBudgetKb || 32) * 1024, 14_400),
      spilledCount: enableAutoSpill ? 1 : 0,
      lastProgressAt: nowIso,
      watchdogState: 'healthy',
      dshScore: score,
      updatedAt: nowIso,
    };
    this.superAgentTickets.set(ticketId, ticket);

    // Record trigger event
    this.triggerEvents.unshift({
      id: `trg-${crypto.randomBytes(3).toString('hex')}`,
      ts: nowIso,
      channel,
      actor,
      threadKey,
      summary: prompt.slice(0, 120),
      decision: 'slow_spawn',
      reason: `薄 Router 受理并分配 DSH 智能体团队并行工单 ${ticketId}`,
      ticketId,
      tokensSaved: 0,
    });
    if (this.triggerEvents.length > 60) this.triggerEvents.length = 60;

    // Auto-spill bulky artifact/diff into Chain of Recall if enabled
    let spilledNode = null;
    if (enableAutoSpill) {
      const spillId = `spill-${crypto.randomBytes(2).toString('hex')}`;
      spilledNode = {
        spillId,
        ticketId,
        threadKey,
        parentRef: `${ticketId} -> dsh-team-artifact`,
        label: `工单 ${ticketId} 并行 Diff 与 DSH 评审证据链`,
        state: 'spilled',
        bytes: 78_848,
        preview: `{ policy: "${policy}", score: ${score}, subtasks: ${task.subtasks?.length || 0}, branch: "${ticket.worktreeBranch}" }`,
        recallCount: 0,
        updatedAt: nowIso,
      };
      this.contextSpillNodes.set(spillId, spilledNode);

      this._appendLog({
        level: 'info',
        eventType: 'context.spill',
        sourceAgentId: task.workerAgentId,
        sourceAgentName: task.workerAgentName,
        targetAgentId: lead?.id || task.leadAgentId,
        targetAgentName: lead?.name || task.leadAgentName,
        taskId: task.id,
        contextId: threadKey,
        worktreeBranch: ticket.worktreeBranch,
        latencyMs: 6,
        spillRefId: spillId,
        summary: `Inline/Spill 自动溢出 77 KB 工单证据至 ${spillId}，挂载至 Chain of Recall`,
        detail: `保持活动窗口低于 ${this.superAgentConfig.inlineBudgetKb} KB 预算阈值，后续可按需回溯。`,
      });
    }

    this._appendLog({
      level: approved ? 'info' : 'warn',
      eventType: 'dsh.review_vote',
      sourceAgentId: reviewer?.id || 'a2a-dsh-expert-reviewer',
      sourceAgentName: reviewer?.name || 'DSH 专家评审插件 (Expert Gate)',
      targetAgentId: lead?.id || task.leadAgentId,
      targetAgentName: lead?.name || task.leadAgentName,
      taskId: task.id,
      contextId: threadKey,
      worktreeBranch: ticket.worktreeBranch,
      model: task.dshReview?.model || 'claude-opus-4-6',
      effort: 'xhigh',
      latencyMs: Math.round(task.durationMs * 0.35),
      spillRefId: spilledNode?.spillId || null,
      summary: `DSH 团队协同投票（策略 ${policy}）：工单 ${ticketId} 得分 ${score}/100 · ${approved ? '共识放行' : '打回返工'}`,
      detail: `薄 Router 协调 ${task.subtasks?.length || 0} 个隔离 Worker 子任务 · ${task.artifact}`,
    });

    await this.persist();
    return {
      ok: true,
      task,
      ticket,
      policy,
      approved,
      spilledNode,
      swarmMetrics: this.getSwarmMetrics(),
    };
  }

  getForNode(nodeId, fleetNodes = []) {
    return this.getState(fleetNodes)
      .agents.filter((a) => a.nodeId === nodeId)
      .map((a) => ({
        id: a.id,
        name: a.name,
        harness: a.harness,
        role: a.role,
        status: a.status,
        delegatable: a.delegatable,
        protocolVersion: a.protocolVersion,
        version: a.version,
        modelHint: a.modelHint,
        reasoningEffort: a.reasoningEffort,
        skillsCount: a.skills?.length || 0,
        boundMcpIds: a.boundMcpIds || [],
        latencyMs: a.latencyMs,
      }));
  }

  async setLeadAgent(agentId) {
    const target = this.agents.get(agentId);
    if (!target) {
      const err = new Error(`Agent Harness not found: ${agentId}`);
      err.statusCode = 404;
      throw err;
    }
    const prevLeadId = this.leadAgentId;
    for (const agent of this.agents.values()) {
      agent.role = agent.id === agentId ? 'lead' : 'worker';
    }
    this.leadAgentId = agentId;

    // Re-anchor routing rules originating from previous lead to new lead so canvas stays connected
    if (prevLeadId && prevLeadId !== agentId) {
      for (const rule of this.routingRules.values()) {
        if (rule.sourceAgentId === prevLeadId && rule.targetAgentId !== agentId) {
          rule.sourceAgentId = agentId;
        }
      }
    }

    await this.persist();
    return { ok: true, leadAgentId: this.leadAgentId, leadAgent: target };
  }

  async updateOrchestrationConfig(patch = {}) {
    if (patch.mode && VALID_MODES.has(String(patch.mode))) {
      this.orchestrationConfig.mode = String(patch.mode);
    }
    if (typeof patch.mainModel === 'string' && patch.mainModel.trim()) {
      this.orchestrationConfig.mainModel = redactText(patch.mainModel.trim()).slice(0, 64);
    }
    if (patch.mainEffort) {
      this.orchestrationConfig.mainEffort = sanitizeEffort(patch.mainEffort, this.orchestrationConfig.mainEffort);
    }
    if (typeof patch.subModel === 'string' && patch.subModel.trim()) {
      this.orchestrationConfig.subModel = redactText(patch.subModel.trim()).slice(0, 64);
    }
    if (patch.subEffort) {
      this.orchestrationConfig.subEffort = sanitizeEffort(patch.subEffort, this.orchestrationConfig.subEffort);
    }
    if (typeof patch.worktreeIsolation === 'boolean') {
      this.orchestrationConfig.worktreeIsolation = patch.worktreeIsolation;
    }
    if (patch.dshReviewGate && typeof patch.dshReviewGate === 'object') {
      const gate = this.orchestrationConfig.dshReviewGate;
      if (typeof patch.dshReviewGate.enabled === 'boolean') gate.enabled = patch.dshReviewGate.enabled;
      if (typeof patch.dshReviewGate.autoGateHighRisk === 'boolean') {
        gate.autoGateHighRisk = patch.dshReviewGate.autoGateHighRisk;
      }
      if (Number.isFinite(Number(patch.dshReviewGate.minScore))) {
        gate.minScore = Math.max(50, Math.min(99, Math.round(Number(patch.dshReviewGate.minScore))));
      }
      if (Array.isArray(patch.dshReviewGate.dimensions)) {
        const cleanedDims = patch.dshReviewGate.dimensions
          .map((d) => redactText(String(d || '').trim()).slice(0, 32))
          .filter(Boolean)
          .slice(0, 8);
        if (cleanedDims.length > 0) gate.dimensions = cleanedDims;
      }
    }
    await this.persist();
    return { ok: true, orchestrationConfig: this.orchestrationConfig };
  }

  async saveTopologyPositions(positions = {}) {
    if (!positions || typeof positions !== 'object') {
      const err = new Error('Positions map is required');
      err.statusCode = 400;
      throw err;
    }
    let updated = 0;
    for (const [agentId, pos] of Object.entries(positions)) {
      const agent = this.agents.get(agentId);
      if (!agent || !pos || !Number.isFinite(Number(pos.x)) || !Number.isFinite(Number(pos.y))) continue;
      agent.position = {
        x: Math.max(-200, Math.min(2400, Math.round(Number(pos.x)))),
        y: Math.max(-200, Math.min(1800, Math.round(Number(pos.y)))),
      };
      updated += 1;
    }
    await this.persist();
    return { ok: true, updated };
  }

  async upsertRoutingRule(payload = {}) {
    const sourceAgentId = String(payload.sourceAgentId || this.leadAgentId || '').trim();
    const targetAgentId = String(payload.targetAgentId || '').trim();
    if (!sourceAgentId || !this.agents.has(sourceAgentId)) {
      const err = new Error(`Invalid source agent: ${sourceAgentId}`);
      err.statusCode = 400;
      throw err;
    }
    if (!targetAgentId || !this.agents.has(targetAgentId)) {
      const err = new Error(`Invalid target agent: ${targetAgentId}`);
      err.statusCode = 400;
      throw err;
    }
    if (sourceAgentId === targetAgentId) {
      const err = new Error('Routing rule source and target cannot be identical');
      err.statusCode = 400;
      throw err;
    }

    const targetAgent = this.agents.get(targetAgentId);
    const id = payload.id && this.routingRules.has(payload.id)
      ? payload.id
      : sanitizeId(payload.id || `route-${sourceAgentId.slice(-8)}-${targetAgentId.slice(-8)}`, 'route');

    const existing = this.routingRules.get(id);
    const rule = {
      id,
      name: redactText(String(payload.name || existing?.name || `路由至 ${targetAgent.name}`)).slice(0, 80),
      sourceAgentId,
      targetAgentId,
      taskCategory: sanitizeId(payload.taskCategory || existing?.taskCategory || 'custom-route', 'cat'),
      matchKeywords: payload.matchKeywords !== undefined
        ? sanitizeKeywords(payload.matchKeywords)
        : (existing?.matchKeywords || [targetAgent.harness]),
      targetModel: redactText(
        String(payload.targetModel || existing?.targetModel || targetAgent.modelHint || this.orchestrationConfig.subModel),
      ).slice(0, 64),
      reasoningEffort: sanitizeEffort(
        payload.reasoningEffort || existing?.reasoningEffort || targetAgent.reasoningEffort,
        'medium',
      ),
      priority: Number.isFinite(Number(payload.priority))
        ? Math.max(1, Math.min(999, Math.round(Number(payload.priority))))
        : (existing?.priority ?? (this.routingRules.size + 1) * 10),
      enabled: typeof payload.enabled === 'boolean' ? payload.enabled : (existing?.enabled ?? true),
      requireDshReview: typeof payload.requireDshReview === 'boolean'
        ? payload.requireDshReview
        : (existing?.requireDshReview ?? (targetAgent.harness === 'dsh-expert')),
    };

    this.routingRules.set(id, rule);
    await this.persist();
    return { ok: true, rule };
  }

  async deleteRoutingRule(ruleId) {
    if (!this.routingRules.has(ruleId)) {
      const err = new Error(`Routing rule not found: ${ruleId}`);
      err.statusCode = 404;
      throw err;
    }
    this.routingRules.delete(ruleId);
    await this.persist();
    return { ok: true, id: ruleId };
  }

  async discoverInstalledAgents(fleetNodes = []) {
    const discovered = [];
    const nowIso = new Date().toISOString();

    if (this.config?.demo) {
      for (const agent of this.agents.values()) {
        agent.lastVerifiedAt = nowIso;
        if (agent.status === 'unknown') agent.status = 'healthy';
        discovered.push({
          id: agent.id,
          name: agent.name,
          harness: agent.harness,
          nodeId: agent.nodeId,
          version: agent.version,
          latestVersion: agent.latestVersion,
          updateAvailable: Boolean(agent.latestVersion && compareSemver(agent.latestVersion, agent.version) > 0),
          installPath: agent.installPath || `/usr/local/bin/${agent.harness}`,
          alreadyRegistered: true,
        });
      }
      return {
        ok: true,
        scannedAt: nowIso,
        discoveredCount: discovered.length,
        newlyRegistered: 0,
        items: discovered,
      };
    }

    // Live safe auto-discovery using allowlisted CLI binaries with execFile (zero shell)
    const primaryNode = (fleetNodes || []).find((n) => n.role === 'hub' || n.id === 'hub-primary') || {
      id: 'hub-primary',
      name: 'Local Host',
    };
    const hubPort = Number(this.config?.console?.port) > 0 ? Number(this.config.console.port) : 4320;
    const defaultHubCardUrl = `http://127.0.0.1:${hubPort}/.well-known/agent-card.json`;
    const defaultHubRpcUrl = `http://127.0.0.1:${hubPort}/a2a`;
    const homeDir = os.homedir();
    const expandedPath = [
      process.env.PATH,
      path.join(homeDir, '.local', 'bin'),
      path.join(homeDir, '.npm-global', 'bin'),
      '/opt/homebrew/bin',
      '/usr/local/bin',
    ].filter(Boolean).join(path.delimiter);
    let newlyRegistered = 0;

    for (const probe of LOCAL_CLI_PROBES) {
      try {
        const { stdout, stderr } = await execFileAsync(probe.bin, probe.args, {
          timeout: 2500,
          env: { ...process.env, PATH: expandedPath },
        });
        const rawVer = `${stdout || ''} ${stderr || ''}`.trim();
        const verMatch = rawVer.match(/(\d+\.\d+\.\d+)/);
        const version = verMatch ? verMatch[1] : '0.1.0';
        const existing = [...this.agents.values()].find(
          (a) => a.harness === probe.harness && a.nodeId === primaryNode.id,
        );
        if (existing) {
          existing.version = version;
          existing.latestVersion = probe.latestVersion;
          existing.updateAvailable = compareSemver(probe.latestVersion, version) > 0;
          existing.autoDetected = true;
          existing.status = 'healthy';
          existing.lastVerifiedAt = nowIso;
          if (!existing.agentCardUrl) existing.agentCardUrl = defaultHubCardUrl;
          if (!existing.rpcUrl) existing.rpcUrl = defaultHubRpcUrl;
          discovered.push({
            id: existing.id,
            name: existing.name,
            harness: existing.harness,
            nodeId: existing.nodeId,
            version,
            latestVersion: probe.latestVersion,
            updateAvailable: existing.updateAvailable,
            installPath: probe.bin,
            alreadyRegistered: true,
          });
        } else {
          const id = sanitizeId(`a2a-${primaryNode.id}-${probe.harness}`, 'a2a');
          const entry = {
            id,
            name: probe.defaultName,
            harness: probe.harness,
            nodeId: primaryNode.id,
            nodeName: primaryNode.name || primaryNode.id,
            role: !this.leadAgentId ? 'lead' : 'worker',
            delegatable: true,
            status: 'healthy',
            protocolVersion: '0.3',
            version,
            latestVersion: probe.latestVersion,
            updateAvailable: compareSemver(probe.latestVersion, version) > 0,
            installPath: probe.bin,
            autoDetected: true,
            pluginKind: 'harness',
            agentCardUrl: defaultHubCardUrl,
            rpcUrl: defaultHubRpcUrl,
            modelHint: probe.defaultModel,
            reasoningEffort: probe.defaultEffort,
            position: { x: !this.leadAgentId ? 40 : 380, y: 40 + this.agents.size * 135 },
            capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
            skills: [{ id: `${probe.harness}-auto`, name: `${probe.defaultName} 通用执行`, description: '自动发现的本机外部 Harness' }],
            boundMcpIds: [],
            latencyMs: 5,
            lastVerifiedAt: nowIso,
            description: `通过安全二进制探测自动识别的 ${probe.harness} v${version}`,
          };
          if (!this.leadAgentId) this.leadAgentId = id;
          this.agents.set(id, entry);
          newlyRegistered += 1;
          discovered.push({
            id,
            name: entry.name,
            harness: entry.harness,
            nodeId: entry.nodeId,
            version,
            latestVersion: probe.latestVersion,
            updateAvailable: entry.updateAvailable,
            installPath: probe.bin,
            alreadyRegistered: false,
          });
        }
      } catch {
        // Binary not installed on this host — skip cleanly
      }
    }

    if (newlyRegistered > 0 || discovered.length > 0) {
      await this.persist();
    }

    return {
      ok: true,
      scannedAt: nowIso,
      discoveredCount: discovered.length,
      newlyRegistered,
      items: discovered,
    };
  }

  async discoverLocalAgents(fleetNodes = []) {
    return this.discoverInstalledAgents(fleetNodes);
  }

  async upsertSkill(payload = {}) {
    const name = redactText(String(payload.name || '').trim()).slice(0, 80);
    if (!name) {
      const err = new Error('Skill name is required');
      err.statusCode = 400;
      throw err;
    }
    const id = payload.id && this.skillCatalog.has(payload.id)
      ? payload.id
      : sanitizeId(payload.id || `skill-${name}`, 'skill');
    const existing = this.skillCatalog.get(id);
    const providerRaw = String(payload.provider || existing?.provider || 'pi-skill').trim().toLowerCase();
    const provider = VALID_SKILL_PROVIDERS.has(providerRaw) ? providerRaw : 'a2a-card';
    const version = redactText(String(payload.version || existing?.version || '1.0.0').trim()).slice(0, 24);
    const latestVersion = redactText(String(payload.latestVersion || existing?.latestVersion || version).trim()).slice(0, 24);
    const assignedAgentIds = Array.isArray(payload.assignedAgentIds)
      ? [...new Set(payload.assignedAgentIds.map((a) => String(a).trim()).filter((a) => this.agents.has(a)))]
      : (existing?.assignedAgentIds || []);

    const skill = {
      id,
      name,
      version,
      latestVersion,
      provider,
      description: redactText(String(payload.description ?? existing?.description ?? '')).slice(0, 200),
      enabled: typeof payload.enabled === 'boolean' ? payload.enabled : (existing?.enabled ?? true),
      assignedAgentIds,
    };

    this.skillCatalog.set(id, skill);
    await this.persist();
    return { ok: true, skill };
  }

  async updateSkill(skillId, patch = {}) {
    const existing = this.skillCatalog.get(skillId);
    if (!existing) {
      const err = new Error(`Skill not found: ${skillId}`);
      err.statusCode = 404;
      throw err;
    }
    if (typeof patch.enabled === 'boolean') existing.enabled = patch.enabled;
    if (typeof patch.version === 'string' && patch.version.trim()) {
      existing.version = redactText(patch.version.trim()).slice(0, 24);
    }
    if (Array.isArray(patch.assignedAgentIds)) {
      existing.assignedAgentIds = [
        ...new Set(patch.assignedAgentIds.map((a) => String(a).trim()).filter((a) => this.agents.has(a))),
      ];
    }
    if (typeof patch.toggleAgentId === 'string' && this.agents.has(patch.toggleAgentId)) {
      const has = existing.assignedAgentIds.includes(patch.toggleAgentId);
      existing.assignedAgentIds = has
        ? existing.assignedAgentIds.filter((id) => id !== patch.toggleAgentId)
        : [...existing.assignedAgentIds, patch.toggleAgentId];
    }
    await this.persist();
    return { ok: true, skill: existing };
  }

  async deleteSkill(skillId) {
    if (!this.skillCatalog.has(skillId)) {
      const err = new Error(`Skill not found: ${skillId}`);
      err.statusCode = 404;
      throw err;
    }
    this.skillCatalog.delete(skillId);
    await this.persist();
    return { ok: true, id: skillId };
  }

  async createSession(payload = {}) {
    const title = redactText(String(payload.title || '').trim()).slice(0, 100);
    if (!title) {
      const err = new Error('Session title is required');
      err.statusCode = 400;
      throw err;
    }
    const primaryAgentId = this.agents.has(payload.primaryAgentId)
      ? payload.primaryAgentId
      : (this.leadAgentId || [...this.agents.keys()][0] || '');
    const participatingAgentIds = Array.isArray(payload.participatingAgentIds) && payload.participatingAgentIds.length > 0
      ? [...new Set(payload.participatingAgentIds.filter((id) => this.agents.has(id)))]
      : (primaryAgentId ? [primaryAgentId] : []);
    if (primaryAgentId && !participatingAgentIds.includes(primaryAgentId)) {
      participatingAgentIds.unshift(primaryAgentId);
    }
    const syncedNodes = Array.isArray(payload.syncedNodes) && payload.syncedNodes.length > 0
      ? [...new Set(payload.syncedNodes.map((n) => String(n).trim()).filter(Boolean))].slice(0, 12)
      : [...new Set(participatingAgentIds.map((id) => this.agents.get(id)?.nodeId).filter(Boolean))];
    const syncMode = VALID_SYNC_MODES.has(String(payload.syncMode || ''))
      ? String(payload.syncMode)
      : 'a2a-context-bus';
    const gitBranch = redactText(String(payload.gitBranch || `a2a/${sanitizeId(title, 'session').slice(0, 24)}`)).slice(0, 64);

    const id = `sess-${crypto.randomBytes(3).toString('hex')}`;
    const contextId = `ctx-${crypto.randomBytes(4).toString('hex')}`;
    const session = {
      id,
      contextId,
      title,
      primaryAgentId,
      participatingAgentIds,
      syncedNodes,
      syncMode,
      gitBranch,
      worktreePath: `.worktrees/${sanitizeId(gitBranch, 'wt').slice(0, 32)}`,
      revision: 1,
      state: 'synced',
      lastSyncedAt: new Date().toISOString(),
      messageCount: 1,
      summary: `已通过 ${syncMode} 建立跨端对齐上下文 ${contextId}。`,
    };
    this.sessions.set(id, session);
    await this.persist();
    return { ok: true, session };
  }

  async syncSession(sessionId, extraNodes = []) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const err = new Error(`Session not found: ${sessionId}`);
      err.statusCode = 404;
      throw err;
    }
    if (Array.isArray(extraNodes) && extraNodes.length > 0) {
      session.syncedNodes = [...new Set([...session.syncedNodes, ...extraNodes.map((n) => String(n).trim()).filter(Boolean)])].slice(0, 12);
    }
    session.revision = (session.revision || 0) + 1;
    session.state = 'synced';
    session.lastSyncedAt = new Date().toISOString();
    session.summary = `已于 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })} 完成 ${session.syncedNodes.length} 台设备与 ${session.participatingAgentIds.length} 个 Agent 的上下文对齐 (rev.${session.revision})。`;
    await this.persist();
    return { ok: true, session };
  }

  async handoffSession(sessionId, targetAgentId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const err = new Error(`Session not found: ${sessionId}`);
      err.statusCode = 404;
      throw err;
    }
    const target = this.agents.get(targetAgentId);
    if (!target) {
      const err = new Error(`Target Agent not found: ${targetAgentId}`);
      err.statusCode = 404;
      throw err;
    }
    session.primaryAgentId = target.id;
    if (!session.participatingAgentIds.includes(target.id)) {
      session.participatingAgentIds.push(target.id);
    }
    if (target.nodeId && !session.syncedNodes.includes(target.nodeId)) {
      session.syncedNodes.push(target.nodeId);
    }
    session.revision = (session.revision || 0) + 1;
    session.state = 'synced';
    session.lastSyncedAt = new Date().toISOString();
    session.summary = `会话控制权已无损接力至 ${target.name} (${target.nodeId})，共享上下文 ${session.contextId} 已同步。`;
    await this.persist();
    return { ok: true, session };
  }

  async registerAgent(payload = {}, options = {}) {
    const { fleetNodes = [] } = options;
    const name = redactText(String(payload.name || '').trim()).slice(0, 80);
    if (!name) {
      const err = new Error('Agent display name is required');
      err.statusCode = 400;
      throw err;
    }
    const nodeId = String(payload.nodeId || 'hub-primary').trim();
    const harness = String(payload.harness || 'custom-a2a').trim().toLowerCase();
    if (!VALID_HARNESS_KINDS.has(harness)) {
      const err = new Error(`Unsupported harness type: ${harness}`);
      err.statusCode = 400;
      throw err;
    }

    const cardCheck = validateSafeEndpointUrl(payload.agentCardUrl);
    if (!cardCheck.ok) {
      const err = new Error(`Invalid Agent Card URL: ${cardCheck.error}`);
      err.statusCode = 400;
      throw err;
    }

    let rpcUrl = payload.rpcUrl ? String(payload.rpcUrl).trim() : '';
    if (rpcUrl) {
      const rpcCheck = validateSafeEndpointUrl(rpcUrl);
      if (!rpcCheck.ok) {
        const err = new Error(`Invalid A2A RPC URL: ${rpcCheck.error}`);
        err.statusCode = 400;
        throw err;
      }
      rpcUrl = rpcCheck.url;
    } else {
      const parsed = new URL(cardCheck.url);
      rpcUrl = `${parsed.origin}/a2a`;
    }

    const nodeNameMap = new Map((fleetNodes || []).map((n) => [n.id, n.name || n.id]));
    const baseId = payload.id ? sanitizeId(payload.id, 'a2a') : sanitizeId(`a2a-${nodeId}-${name}`, 'a2a');
    const id = this.agents.has(baseId) ? `${baseId}-${crypto.randomBytes(2).toString('hex')}` : baseId;
    const skills = sanitizeSkills(
      Array.isArray(payload.skills)
        ? payload.skills
        : typeof payload.skills === 'string'
          ? payload.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
    );
    const boundMcpIds = Array.isArray(payload.boundMcpIds)
      ? payload.boundMcpIds.map((m) => String(m).trim()).filter(Boolean).slice(0, 16)
      : [];

    const promoteToLead = Boolean(payload.setAsLead) || !this.leadAgentId;
    if (promoteToLead) {
      for (const existing of this.agents.values()) existing.role = 'worker';
      this.leadAgentId = id;
    }

    const version = redactText(String(payload.version || '1.0.0').trim()).slice(0, 24);
    const entry = {
      id,
      name,
      harness,
      nodeId,
      nodeName: nodeNameMap.get(nodeId) || nodeId,
      role: promoteToLead ? 'lead' : 'worker',
      delegatable: payload.delegatable !== false,
      status: this.config?.demo ? 'healthy' : 'unknown',
      protocolVersion: '0.3',
      version,
      latestVersion: version,
      updateAvailable: false,
      installPath: redactText(String(payload.installPath || '').trim()).slice(0, 120) || null,
      autoDetected: false,
      pluginKind: harness === 'dsh-expert' ? 'dsh-review-plugin' : 'harness',
      agentCardUrl: cardCheck.url,
      rpcUrl,
      modelHint: redactText(String(payload.modelHint || '').trim()).slice(0, 64) || null,
      reasoningEffort: sanitizeEffort(payload.reasoningEffort, promoteToLead ? 'high' : 'medium'),
      position: {
        x: promoteToLead ? 40 : (harness === 'dsh-expert' ? 730 : 375),
        y: 30 + (this.agents.size % 5) * 145,
      },
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true,
      },
      skills: skills.length > 0 ? skills : [{ id: 'general-ops', name: '通用节点任务执行', description: '通过 A2A 接收主 Agent 委派任务' }],
      boundMcpIds,
      latencyMs: this.config?.demo ? 24 : null,
      lastVerifiedAt: new Date().toISOString(),
      description: redactText(String(payload.description || '').trim()).slice(0, 200)
        || `注册于 ${nodeNameMap.get(nodeId) || nodeId} 的外部 ${harness} A2A Peer`,
    };

    this.agents.set(id, entry);
    await this.persist();
    return entry;
  }

  async updateAgent(agentId, patch = {}) {
    const existing = this.agents.get(agentId);
    if (!existing) {
      const err = new Error(`Agent Harness not found: ${agentId}`);
      err.statusCode = 404;
      throw err;
    }
    if (typeof patch.delegatable === 'boolean') {
      existing.delegatable = patch.delegatable;
    }
    if (Array.isArray(patch.boundMcpIds)) {
      existing.boundMcpIds = [...new Set(patch.boundMcpIds.map((m) => String(m).trim()).filter(Boolean))].slice(0, 16);
    }
    if (typeof patch.name === 'string' && patch.name.trim()) {
      existing.name = redactText(patch.name.trim()).slice(0, 80);
    }
    if (typeof patch.modelHint === 'string' && patch.modelHint.trim()) {
      existing.modelHint = redactText(patch.modelHint.trim()).slice(0, 64);
    }
    if (patch.reasoningEffort) {
      existing.reasoningEffort = sanitizeEffort(patch.reasoningEffort, existing.reasoningEffort || 'medium');
    }
    if (typeof patch.version === 'string' && patch.version.trim()) {
      existing.version = redactText(patch.version.trim()).slice(0, 24);
      existing.updateAvailable = Boolean(existing.latestVersion && compareSemver(existing.latestVersion, existing.version) > 0);
    }
    if (Array.isArray(patch.skills)) {
      existing.skills = sanitizeSkills(patch.skills);
    }
    await this.persist();
    return existing;
  }

  async removeAgent(agentId) {
    if (!this.agents.has(agentId)) {
      const err = new Error(`Agent Harness not found: ${agentId}`);
      err.statusCode = 404;
      throw err;
    }
    this.agents.delete(agentId);
    for (const [ruleId, rule] of this.routingRules.entries()) {
      if (rule.sourceAgentId === agentId || rule.targetAgentId === agentId) {
        this.routingRules.delete(ruleId);
      }
    }
    if (this.leadAgentId === agentId) {
      const next = [...this.agents.values()].find((a) => a.status !== 'offline') || [...this.agents.values()][0] || null;
      this.leadAgentId = next ? next.id : null;
      if (next) next.role = 'lead';
    }
    await this.persist();
    return { ok: true, id: agentId, leadAgentId: this.leadAgentId };
  }

  async discoverAgentCard(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      const err = new Error(`Agent Harness not found: ${agentId}`);
      err.statusCode = 404;
      throw err;
    }
    const started = Date.now();
    if (this.config?.demo) {
      const latencyMs = agent.nodeId === 'hub-primary' ? 9 : agent.nodeId === 'edge-frankfurt' ? 136 : 22;
      agent.status = 'healthy';
      agent.latencyMs = latencyMs;
      agent.lastVerifiedAt = new Date().toISOString();
      return {
        ok: true,
        id: agent.id,
        protocolVersion: agent.protocolVersion,
        latencyMs,
        agentCard: {
          name: agent.name,
          url: agent.rpcUrl,
          version: agent.protocolVersion,
          capabilities: agent.capabilities,
          skills: agent.skills,
        },
        summary: `A2A Agent Card 校验通过 (v${agent.protocolVersion} · Harness v${agent.version || '1.0'}) · ${agent.skills.length} skills · ${latencyMs}ms`,
      };
    }

    const check = validateSafeEndpointUrl(agent.agentCardUrl);
    if (!check.ok) {
      return { ok: false, id: agent.id, error: check.error };
    }

    const candidates = [check.url];
    if (check.url.endsWith('/.well-known/agent-card.json')) {
      candidates.push(check.url.replace('/.well-known/agent-card.json', '/.well-known/agent.json'));
    }

    let lastErr = 'Agent Card unreachable';
    for (const candidateUrl of candidates) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(candidateUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        const latencyMs = Math.max(1, Date.now() - started);
        if (!res.ok) {
          lastErr = `HTTP ${res.status}`;
          continue;
        }
        const card = await res.json();
        agent.status = 'healthy';
        agent.latencyMs = latencyMs;
        agent.lastVerifiedAt = new Date().toISOString();
        if (card?.protocolVersion || card?.version) {
          agent.protocolVersion = String(card.protocolVersion || card.version).slice(0, 24);
        }
        if (typeof card?.url === 'string') {
          const rpcCheck = validateSafeEndpointUrl(card.url);
          if (rpcCheck.ok) agent.rpcUrl = rpcCheck.url;
        }
        if (Array.isArray(card?.skills) && card.skills.length > 0) {
          agent.skills = sanitizeSkills(card.skills);
        }
        if (card?.capabilities && typeof card.capabilities === 'object') {
          agent.capabilities = {
            streaming: Boolean(card.capabilities.streaming),
            pushNotifications: Boolean(card.capabilities.pushNotifications),
            stateTransitionHistory: Boolean(card.capabilities.stateTransitionHistory),
          };
        }
        await this.persist();
        return {
          ok: true,
          id: agent.id,
          protocolVersion: agent.protocolVersion,
          latencyMs,
          agentCard: card,
          summary: `A2A Agent Card 发现成功 · ${agent.skills.length} skills · ${latencyMs}ms`,
        };
      } catch (err) {
        lastErr = err?.name === 'AbortError' ? 'Timed out (4s)' : redactText(err?.message || 'Fetch error');
      } finally {
        clearTimeout(timer);
      }
    }

    agent.status = 'offline';
    agent.lastVerifiedAt = new Date().toISOString();
    await this.persist();
    return { ok: false, id: agent.id, error: lastErr };
  }

  async pingAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      const err = new Error(`Agent Harness not found: ${agentId}`);
      err.statusCode = 404;
      throw err;
    }

    const checkedAt = new Date().toISOString();
    if (this.config?.demo) {
      const latencyMs = agent.latencyMs || 12;
      const reachable = agent.status !== 'offline';
      agent.lastHeartbeatAt = checkedAt;
      agent.lastVerifiedAt = checkedAt;
      return {
        ok: true,
        agentId: agent.id,
        agentName: agent.name,
        nodeId: agent.nodeId,
        protocol: 'google-a2a/0.3',
        latencyMs,
        reachable,
        card: {
          protocolVersion: '0.3.0',
          name: agent.name,
          url: agent.rpcUrl,
          capabilities: agent.capabilities,
          skills: agent.skills,
        },
        pong: reachable
          ? {
              pong: true,
              protocolVersion: '0.3.0',
              agentId: agent.id,
              timestamp: checkedAt,
            }
          : null,
        error: reachable ? null : 'Agent marked offline in demo state',
        checkedAt,
      };
    }

    const started = Date.now();
    let card = null;
    let pong = null;
    let lastError = null;

    const cardCheck = validateSafeEndpointUrl(agent.agentCardUrl);
    if (cardCheck.ok) {
      const cardCtrl = new AbortController();
      const cardTimer = setTimeout(() => cardCtrl.abort(), 5000);
      try {
        const cardRes = await fetch(cardCheck.url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: cardCtrl.signal,
        });
        if (cardRes.ok) {
          card = await cardRes.json().catch(() => null);
        } else {
          lastError = `Agent Card HTTP ${cardRes.status}`;
        }
      } catch (err) {
        lastError = err?.name === 'AbortError' ? 'Agent Card timed out (5s)' : redactText(err?.message || 'Card fetch failed');
      } finally {
        clearTimeout(cardTimer);
      }
    }

    const rpcCheck = validateSafeEndpointUrl(agent.rpcUrl);
    if (rpcCheck.ok) {
      const { secret } = getA2ASigningSecret();
      const sendRpcProbe = async (rpcMethod) => {
        const rawBody = JSON.stringify({
          jsonrpc: '2.0',
          id: `ping-${crypto.randomBytes(3).toString('hex')}`,
          method: rpcMethod,
          params: {},
        });
        const rpcCtrl = new AbortController();
        const rpcTimer = setTimeout(() => rpcCtrl.abort(), 5000);
        try {
          const rpcRes = await fetch(rpcCheck.url, {
            method: 'POST',
            headers: buildSignedA2AHeaders(rawBody, {
              secret,
              bearerToken: agent.authToken || undefined,
            }),
            body: rawBody,
            signal: rpcCtrl.signal,
          });
          const parsed = await rpcRes.json().catch(() => null);
          return { ok: rpcRes.ok, status: rpcRes.status, body: parsed };
        } finally {
          clearTimeout(rpcTimer);
        }
      };

      try {
        const pingRes = await sendRpcProbe('agent/ping');
        if (pingRes.ok && pingRes.body?.result) {
          pong = pingRes.body.result;
        } else if (pingRes.body?.error?.code === -32601 || pingRes.status === 404) {
          const fallbackRes = await sendRpcProbe('agent/card');
          if (fallbackRes.ok && fallbackRes.body?.result) {
            pong = { pong: true, via: 'agent/card', protocolVersion: fallbackRes.body.result.protocolVersion || '0.3.0' };
            if (!card) card = fallbackRes.body.result;
          } else {
            lastError = fallbackRes.body?.error?.message || `RPC HTTP ${fallbackRes.status}`;
          }
        } else {
          lastError = pingRes.body?.error?.message || `RPC HTTP ${pingRes.status}`;
        }
      } catch (err) {
        lastError = err?.name === 'AbortError' ? 'A2A RPC ping timed out (5s)' : redactText(err?.message || 'RPC ping failed');
      }
    } else if (!card) {
      lastError = rpcCheck.error;
    }

    const latencyMs = Math.max(1, Date.now() - started);
    const reachable = Boolean(pong || card);
    agent.status = reachable ? 'healthy' : 'offline';
    agent.lastHeartbeatAt = checkedAt;
    agent.lastVerifiedAt = checkedAt;
    agent.latencyMs = latencyMs;
    if (card && typeof card === 'object') {
      if (card.protocolVersion || card.version) {
        agent.protocolVersion = String(card.protocolVersion || card.version).slice(0, 24);
      }
      if (Array.isArray(card.skills) && card.skills.length > 0) {
        agent.skills = sanitizeSkills(card.skills);
      }
    }
    await this.persist();

    return {
      ok: true,
      agentId: agent.id,
      agentName: agent.name,
      nodeId: agent.nodeId,
      protocol: 'google-a2a/0.3',
      latencyMs,
      reachable,
      card,
      pong,
      error: reachable ? null : (lastError || 'Peer unreachable'),
      checkedAt,
    };
  }

  _isSelfHubRpcUrl(rpcUrl) {
    if (!rpcUrl || typeof rpcUrl !== 'string') return false;
    try {
      const parsed = new URL(rpcUrl);
      const host = parsed.hostname.toLowerCase();
      const isLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
      if (!isLoopback) return false;
      const configuredPort = Number(this.config?.console?.port);
      if (!configuredPort || configuredPort <= 0) return false;
      const urlPort = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));
      return urlPort === configuredPort && parsed.pathname.replace(/\/+$/, '') === '/a2a';
    } catch {
      return false;
    }
  }

  _matchRoutingRule(prompt, requiredSkill) {
    const q = `${requiredSkill || ''} ${prompt || ''}`.toLowerCase();
    const rules = [...this.routingRules.values()]
      .filter((r) => r.enabled)
      .sort((a, b) => (a.priority || 100) - (b.priority || 100));

    let bestRule = null;
    let bestHits = 0;

    for (const rule of rules) {
      const target = this.agents.get(rule.targetAgentId);
      if (!target || target.status === 'offline') continue;
      if (target.id !== this.leadAgentId && !target.delegatable) continue;
      let hits = 0;
      for (const kw of rule.matchKeywords || []) {
        if (kw && q.includes(kw.toLowerCase())) hits += 1;
      }
      if (hits > bestHits) {
        bestHits = hits;
        bestRule = rule;
      }
    }
    return bestRule;
  }

  _selectWorkerForTask(targetAgentId, prompt, requiredSkill) {
    const all = [...this.agents.values()];
    if (targetAgentId && targetAgentId !== 'auto') {
      const explicit = this.agents.get(targetAgentId);
      if (!explicit) {
        const err = new Error(`Target worker agent not found: ${targetAgentId}`);
        err.statusCode = 404;
        throw err;
      }
      if (explicit.id !== this.leadAgentId && !explicit.delegatable) {
        const err = new Error(`Agent ${explicit.name} has delegation disabled`);
        err.statusCode = 403;
        throw err;
      }
      return {
        worker: explicit,
        matchedSkill: requiredSkill || explicit.skills?.[0]?.id || 'direct-dispatch',
        matchedRule: null,
      };
    }

    // 1. Check custom visual routing rules first
    const matchedRule = this._matchRoutingRule(prompt, requiredSkill);
    if (matchedRule) {
      const ruleTarget = this.agents.get(matchedRule.targetAgentId);
      if (ruleTarget) {
        return {
          worker: ruleTarget,
          matchedSkill: requiredSkill || ruleTarget.skills?.[0]?.id || matchedRule.taskCategory,
          matchedRule,
        };
      }
    }

    // 2. Fallback to skill & node affinity matching
    const candidates = all.filter((a) => a.id !== this.leadAgentId && a.delegatable && a.status !== 'offline');
    if (candidates.length === 0) {
      const lead = this.agents.get(this.leadAgentId);
      if (lead) return { worker: lead, matchedSkill: lead.skills?.[0]?.id || 'self-exec', matchedRule: null };
      const err = new Error('No online delegatable worker agent available');
      err.statusCode = 400;
      throw err;
    }

    const q = `${requiredSkill || ''} ${prompt || ''}`.toLowerCase();
    let best = candidates[0];
    let bestScore = -1;
    let bestSkill = candidates[0].skills?.[0]?.id || 'general';

    for (const candidate of candidates) {
      let score = candidate.status === 'healthy' ? 2 : 0;
      let skillHit = candidate.skills?.[0]?.id || 'general';
      if (q.includes(candidate.nodeId.toLowerCase()) || q.includes((candidate.nodeName || '').toLowerCase())) {
        score += 5;
      }
      for (const sk of candidate.skills || []) {
        const hay = `${sk.id} ${sk.name} ${sk.description}`.toLowerCase();
        if (requiredSkill && sk.id.toLowerCase() === requiredSkill.toLowerCase()) {
          score += 10;
          skillHit = sk.id;
        } else if (
          (q.includes('安全') || q.includes('防火墙') || q.includes('tls') || q.includes('frankfurt') || q.includes('欧洲')) &&
          (hay.includes('security') || hay.includes('安全') || hay.includes('audit'))
        ) {
          score += 6;
          skillHit = sk.id;
        } else if (
          (q.includes('拨测') || q.includes('浏览器') || q.includes('tokyo') || q.includes('东京') || q.includes('边缘')) &&
          (hay.includes('edge') || hay.includes('qa') || hay.includes('拨测'))
        ) {
          score += 6;
          skillHit = sk.id;
        } else if (
          (q.includes('评审') || q.includes('review') || q.includes('dsh')) &&
          (hay.includes('review') || hay.includes('评审'))
        ) {
          score += 8;
          skillHit = sk.id;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
        bestSkill = skillHit;
      }
    }
    return { worker: best, matchedSkill: bestSkill, matchedRule: null };
  }

  _buildDshReviewArtifact(prompt, scoreOffset = 0) {
    const reviewer = [...this.agents.values()].find((a) => a.harness === 'dsh-expert') || null;
    const gate = this.orchestrationConfig.dshReviewGate;
    const dims = (gate?.dimensions || ['架构一致性', '安全边界', '性能复杂度', '测试覆盖']).map((name, i) => ({
      name,
      score: Math.min(98, Math.max(76, 91 + ((prompt.length + i * 3 + scoreOffset) % 7) - 2)),
    }));
    const avg = Math.round(dims.reduce((s, d) => s + d.score, 0) / Math.max(1, dims.length));
    const verdict = avg >= (gate?.minScore || 85) ? 'approve' : 'changes_requested';
    return {
      reviewerId: reviewer?.id || 'a2a-dsh-expert-reviewer',
      reviewerName: reviewer?.name || 'DSH 专家评审插件 (Expert Gate)',
      model: reviewer?.modelHint || this.orchestrationConfig.mainModel,
      effort: reviewer?.reasoningEffort || 'xhigh',
      score: avg,
      verdict,
      dimensions: dims,
      findings: verdict === 'approve'
        ? [
            `DSH 多专家加权评分 ${avg}/100（阈值 ${gate?.minScore || 85}），安全边界与契约一致性通过。`,
            'Worktree 隔离变更干净，可安全合并并同步至全端会话。',
          ]
        : [
            `DSH 专家评分 ${avg}/100 低于门禁阈值 ${gate?.minScore || 85}，建议补充边界测试后再合入。`,
          ],
    };
  }

  async dispatchTask(payload = {}, options = {}) {
    const { actor = 'web' } = options;
    const prompt = redactText(String(payload.prompt || '').trim()).slice(0, 1000);
    if (!prompt) {
      const err = new Error('Task prompt is required');
      err.statusCode = 400;
      throw err;
    }

    const lead = this.agents.get(this.leadAgentId);
    if (!lead) {
      const err = new Error('No Lead Agent Harness elected yet. Elect a Lead Agent first.');
      err.statusCode = 400;
      throw err;
    }

    const executionMode = VALID_MODES.has(String(payload.executionMode || ''))
      ? String(payload.executionMode)
      : this.orchestrationConfig.mode;

    const { worker, matchedSkill, matchedRule } = this._selectWorkerForTask(
      payload.targetAgentId,
      prompt,
      payload.requiredSkill,
    );

    const appliedModel = redactText(
      String(
        payload.modelOverride
        || (executionMode === 'main-sub' ? this.orchestrationConfig.subModel : '')
        || matchedRule?.targetModel
        || worker.modelHint
        || this.orchestrationConfig.subModel,
      ),
    ).slice(0, 64);

    const appliedEffort = sanitizeEffort(
      payload.reasoningEffort
      || (executionMode === 'main-sub' ? this.orchestrationConfig.subEffort : '')
      || matchedRule?.reasoningEffort
      || worker.reasoningEffort,
      'medium',
    );

    const shouldRunDshReview = Boolean(
      payload.requireDshReview
      || matchedRule?.requireDshReview
      || worker.harness === 'dsh-expert'
      || (executionMode === 'swarm' && this.orchestrationConfig.dshReviewGate?.enabled),
    );

    const mcpScope = Array.isArray(payload.mcpIds) && payload.mcpIds.length > 0
      ? payload.mcpIds.map((m) => String(m).trim()).filter(Boolean).slice(0, 12)
      : [...(worker.boundMcpIds || [])];

    const taskId = `a2a-task-${crypto.randomBytes(3).toString('hex')}`;
    const linkedSession = payload.sessionId ? this.sessions.get(payload.sessionId) : null;
    const contextId = linkedSession?.contextId || payload.contextId || `ctx-${crypto.randomBytes(3).toString('hex')}`;
    const startedAt = Date.now();
    const createdIso = new Date(startedAt).toISOString();
    const explicitBranch = typeof payload.worktreeBranch === 'string' && payload.worktreeBranch.trim()
      ? redactText(payload.worktreeBranch.trim()).slice(0, 96)
      : null;
    const worktreeBranch = explicitBranch || (this.orchestrationConfig.worktreeIsolation ? `${executionMode}/${taskId}` : null);
    const parentTaskId = payload.parentTaskId ? String(payload.parentTaskId).trim().slice(0, 64) : null;
    const slashCommand = payload.slashCommand ? redactText(String(payload.slashCommand).trim()).slice(0, 64) : null;

    const taskRecord = {
      id: taskId,
      contextId,
      parentTaskId,
      slashCommand,
      protocolMethod: 'message/send',
      executionMode,
      state: 'submitted',
      prompt,
      leadAgentId: lead.id,
      leadAgentName: lead.name,
      leadNodeId: lead.nodeId,
      workerAgentId: worker.id,
      workerAgentName: worker.name,
      workerNodeId: worker.nodeId,
      matchedRuleId: matchedRule?.id || null,
      matchedRuleName: matchedRule?.name || null,
      matchedSkill,
      appliedModel,
      appliedEffort,
      worktreeBranch,
      mcpScope,
      createdAt: createdIso,
      updatedAt: createdIso,
      durationMs: 0,
      actor,
      subtasks: [],
      dshReview: null,
      steps: [
        {
          ts: createdIso,
          state: 'submitted',
          detail: matchedRule
            ? `主 Agent ${lead.name} 命中规则「${matchedRule.name}」-> ${worker.name} (${appliedModel} · effort=${appliedEffort})`
            : `主 Agent ${lead.name} (${executionMode}) 通过 A2A 委派至 ${worker.name} (${appliedModel} · effort=${appliedEffort})`,
        },
      ],
      artifact: '',
    };

    if (this.config?.demo) {
      const simulatedDuration = executionMode === 'swarm'
        ? 1450 + Math.min(2200, prompt.length * 12)
        : 620 + Math.min(1800, prompt.length * 10);
      const workingIso = new Date(startedAt + 220).toISOString();
      const reviewIso = new Date(startedAt + Math.round(simulatedDuration * 0.7)).toISOString();
      const doneIso = new Date(startedAt + simulatedDuration).toISOString();

      if (executionMode === 'swarm') {
        const piPeer = [...this.agents.values()].find((a) => a.harness === 'pi-agent' && a.id !== worker.id);
        taskRecord.subtasks = [
          {
            id: `${taskId}-plan`,
            agentId: lead.id,
            agentName: lead.name,
            role: '主控拆解',
            model: this.orchestrationConfig.mainModel,
            effort: this.orchestrationConfig.mainEffort,
            state: 'completed',
            worktree: worktreeBranch ? `.worktrees/${taskId}-plan` : null,
            summary: `拆解任务并按路由表分配给 ${worker.name}${piPeer ? ` 与 ${piPeer.name}` : ''}`,
          },
          {
            id: `${taskId}-exec`,
            agentId: worker.id,
            agentName: worker.name,
            role: '主力执行',
            model: appliedModel,
            effort: appliedEffort,
            state: 'completed',
            worktree: worktreeBranch ? `.worktrees/${taskId}-exec` : null,
            summary: `命中技能 [${matchedSkill}] 完成核心变更`,
          },
        ];
        if (piPeer) {
          taskRecord.subtasks.push({
            id: `${taskId}-verify`,
            agentId: piPeer.id,
            agentName: piPeer.name,
            role: '并行单测',
            model: this.orchestrationConfig.subModel,
            effort: this.orchestrationConfig.subEffort,
            state: 'completed',
            worktree: worktreeBranch ? `.worktrees/${taskId}-verify` : null,
            summary: '低思考强度并行运行类型校验与单测回归',
          });
        }
      } else if (executionMode === 'main-sub') {
        taskRecord.subtasks = [
          {
            id: `${taskId}-main`,
            agentId: lead.id,
            agentName: lead.name,
            role: '主模型规划',
            model: this.orchestrationConfig.mainModel,
            effort: this.orchestrationConfig.mainEffort,
            state: 'completed',
            worktree: worktreeBranch ? `.worktrees/${taskId}-main` : null,
            summary: `主模型 ${this.orchestrationConfig.mainModel} (${this.orchestrationConfig.mainEffort}) 输出执行计划`,
          },
          {
            id: `${taskId}-sub`,
            agentId: worker.id,
            agentName: worker.name,
            role: '子模型执行',
            model: this.orchestrationConfig.subModel,
            effort: this.orchestrationConfig.subEffort,
            state: 'completed',
            worktree: worktreeBranch ? `.worktrees/${taskId}-sub` : null,
            summary: `子模型 ${this.orchestrationConfig.subModel} (${this.orchestrationConfig.subEffort}) 高速落地并回传摘要`,
          },
        ];
      }

      taskRecord.steps.push({
        ts: workingIso,
        state: 'working',
        detail: `${worker.name} 以 ${appliedModel} (思考强度 ${appliedEffort}) 执行技能 [${matchedSkill}]${worktreeBranch ? ` · Worktree ${worktreeBranch}` : ''}`,
      });

      if (shouldRunDshReview) {
        taskRecord.dshReview = this._buildDshReviewArtifact(prompt);
        taskRecord.steps.push({
          ts: reviewIso,
          state: 'reviewing',
          detail: `${taskRecord.dshReview.reviewerName} 完成多维会审：${taskRecord.dshReview.score}/100 (${taskRecord.dshReview.verdict})`,
        });
      }

      taskRecord.state = 'completed';
      taskRecord.durationMs = simulatedDuration;
      taskRecord.updatedAt = doneIso;
      taskRecord.steps.push({
        ts: doneIso,
        state: 'completed',
        detail: `Worker (${worker.nodeId}) 已回传结构化 A2A Artifact 并同步至会话 ${contextId}。`,
      });
      taskRecord.artifact = `[${executionMode.toUpperCase()} · ${worker.harness} · ${appliedModel}/${appliedEffort}] 已完成「${prompt.slice(0, 64)}」${taskRecord.dshReview ? ` · DSH 专家评分 ${taskRecord.dshReview.score}/100 (${taskRecord.dshReview.verdict})` : ''}。`;
    } else {
      const useLocalFallback = !worker.rpcUrl || this._isSelfHubRpcUrl(worker.rpcUrl);
      const rpcCheck = useLocalFallback ? { ok: false } : validateSafeEndpointUrl(worker.rpcUrl);
      if (useLocalFallback) {
        const doneIso = new Date().toISOString();
        taskRecord.durationMs = Math.max(1, Date.now() - startedAt);
        taskRecord.updatedAt = doneIso;
        taskRecord.steps.push({
          ts: doneIso,
          state: 'working',
          detail: `本机控制面直连执行 (${worker.name} · ${appliedModel}/${appliedEffort})${slashCommand ? ` · ${slashCommand}` : ''}`,
        });
        taskRecord.state = 'completed';
        taskRecord.artifact = `[LOCAL · ${executionMode.toUpperCase()} · ${worker.harness} · ${appliedModel}/${appliedEffort}] 已受理「${prompt.slice(0, 72)}」${worktreeBranch ? ` · Worktree ${worktreeBranch}` : ''}${slashCommand ? ` · 指令 ${slashCommand}` : ''}。`;
        taskRecord.steps.push({
          ts: doneIso,
          state: 'completed',
          detail: taskRecord.artifact,
        });
      } else if (!rpcCheck.ok) {
        taskRecord.state = 'failed';
        taskRecord.durationMs = Math.max(1, Date.now() - startedAt);
        taskRecord.updatedAt = new Date().toISOString();
        taskRecord.steps.push({ ts: taskRecord.updatedAt, state: 'failed', detail: `A2A RPC URL 校验失败: ${rpcCheck.error}` });
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        try {
          const rpcPayload = {
            jsonrpc: '2.0',
            id: taskId,
            method: 'message/send',
            params: {
              contextId,
              message: {
                role: 'user',
                messageId: `msg-${crypto.randomBytes(4).toString('hex')}`,
                parts: [{ kind: 'text', text: prompt }],
              },
              metadata: {
                delegatorAgentId: lead.id,
                delegatorNodeId: lead.nodeId,
                executionMode,
                appliedModel,
                appliedEffort,
                matchedSkill,
                worktreeBranch,
                parentTaskId,
                slashCommand,
                requireDshReview: shouldRunDshReview,
                mcpScope,
              },
            },
          };
          const rawBody = JSON.stringify(rpcPayload);
          const { secret } = getA2ASigningSecret();
          const res = await fetch(rpcCheck.url, {
            method: 'POST',
            headers: buildSignedA2AHeaders(rawBody, {
              secret,
              bearerToken: worker.authToken || undefined,
            }),
            body: rawBody,
            signal: controller.signal,
          });
          taskRecord.durationMs = Math.max(1, Date.now() - startedAt);
          taskRecord.updatedAt = new Date().toISOString();
          if (!res.ok) {
            taskRecord.state = 'failed';
            taskRecord.steps.push({ ts: taskRecord.updatedAt, state: 'failed', detail: `A2A Worker 返回 HTTP ${res.status}` });
          } else {
            const body = await res.json().catch(() => ({}));
            if (body?.error) {
              taskRecord.state = 'failed';
              const errMsg = redactText(String(body.error.message || 'A2A JSON-RPC error')).slice(0, 240);
              taskRecord.steps.push({ ts: taskRecord.updatedAt, state: 'failed', detail: errMsg });
            } else {
              const remoteState = body?.result?.status?.state || 'completed';
              taskRecord.state = VALID_TASK_STATES.has(remoteState) ? remoteState : 'completed';
              const textPart = body?.result?.artifacts?.[0]?.parts?.[0]?.text
                || body?.result?.status?.message?.parts?.[0]?.text
                || `Worker ${worker.name} 已受理 A2A 任务 (${taskRecord.state})`;
              taskRecord.artifact = redactText(String(textPart)).slice(0, 600);
              taskRecord.steps.push({ ts: taskRecord.updatedAt, state: taskRecord.state, detail: taskRecord.artifact });
            }
          }
        } catch (err) {
          taskRecord.durationMs = Math.max(1, Date.now() - startedAt);
          taskRecord.updatedAt = new Date().toISOString();
          taskRecord.state = 'failed';
          const reason = err?.name === 'AbortError' ? 'A2A RPC timed out (15s)' : redactText(err?.message || 'Network error');
          taskRecord.steps.push({ ts: taskRecord.updatedAt, state: 'failed', detail: reason });
        } finally {
          clearTimeout(timer);
        }
      }
    }

    if (linkedSession) {
      linkedSession.revision = (linkedSession.revision || 0) + 1;
      linkedSession.messageCount = (linkedSession.messageCount || 0) + 1;
      linkedSession.lastSyncedAt = taskRecord.updatedAt;
      if (!linkedSession.participatingAgentIds.includes(worker.id)) {
        linkedSession.participatingAgentIds.push(worker.id);
      }
    }

    this.tasks.unshift(taskRecord);
    if (this.tasks.length > 60) this.tasks.length = 60;

    // Emit live Lead <-> Worker collaboration log events for the real-time Agent Logs console
    this._appendLog({
      level: taskRecord.state === 'failed' ? 'error' : 'info',
      eventType: executionMode === 'swarm' ? 'swarm.fanout' : 'a2a.delegate',
      sourceAgentId: lead.id,
      sourceAgentName: lead.name,
      targetAgentId: worker.id,
      targetAgentName: worker.name,
      taskId: taskRecord.id,
      contextId,
      worktreeBranch,
      model: appliedModel,
      effort: appliedEffort,
      latencyMs: taskRecord.durationMs,
      summary: `${lead.name} -> ${worker.name} [${executionMode}]：${prompt.slice(0, 72)}`,
      detail: taskRecord.artifact || taskRecord.steps[taskRecord.steps.length - 1]?.detail || '',
    });

    if (taskRecord.dshReview) {
      this._appendLog({
        level: taskRecord.dshReview.verdict === 'approve' ? 'info' : 'warn',
        eventType: 'dsh.gate_verdict',
        sourceAgentId: taskRecord.dshReview.reviewerId,
        sourceAgentName: taskRecord.dshReview.reviewerName,
        targetAgentId: lead.id,
        targetAgentName: lead.name,
        taskId: taskRecord.id,
        contextId,
        worktreeBranch,
        model: taskRecord.dshReview.model,
        effort: taskRecord.dshReview.effort,
        latencyMs: Math.round(taskRecord.durationMs * 0.3),
        summary: `DSH 门禁结论：${taskRecord.dshReview.score}/100 (${taskRecord.dshReview.verdict.toUpperCase()})`,
        detail: taskRecord.dshReview.findings.join(' · '),
      });
    }

    await this.persist();
    return taskRecord;
  }

  async cancelTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      const err = new Error(`A2A task not found: ${taskId}`);
      err.statusCode = 404;
      throw err;
    }
    if (task.state === 'completed' || task.state === 'canceled') {
      return task;
    }
    task.state = 'canceled';
    task.updatedAt = new Date().toISOString();
    task.steps.push({ ts: task.updatedAt, state: 'canceled', detail: '操作员已通过控制面取消该 A2A 委派任务。' });
    await this.persist();
    return task;
  }

  async updateTaskState(taskId, nextState, { actor = 'web', reason = '' } = {}) {
    const cleanState = String(nextState || '').trim().toLowerCase();
    if (!VALID_TASK_STATES.has(cleanState)) {
      const err = new Error(`Invalid task state: ${nextState}. Expected one of: ${[...VALID_TASK_STATES].join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      const err = new Error(`A2A task not found: ${taskId}`);
      err.statusCode = 404;
      throw err;
    }
    const prevState = task.state;
    const nowIso = new Date().toISOString();
    const detail = reason && String(reason).trim()
      ? redactText(String(reason).trim()).slice(0, 240)
      : `看板状态调整: ${prevState} -> ${cleanState} (${actor})`;
    task.state = cleanState;
    task.updatedAt = nowIso;
    if (!Array.isArray(task.steps)) task.steps = [];
    task.steps.push({ ts: nowIso, state: cleanState, detail });

    this._appendLog({
      level: cleanState === 'failed' ? 'warn' : 'info',
      eventType: 'task.state_changed',
      sourceAgentId: task.leadAgentId,
      sourceAgentName: task.leadAgentName,
      targetAgentId: task.workerAgentId,
      targetAgentName: task.workerAgentName,
      taskId: task.id,
      contextId: task.contextId,
      worktreeBranch: task.worktreeBranch,
      model: task.appliedModel,
      effort: task.appliedEffort,
      latencyMs: 1,
      summary: `任务 ${task.id} 状态变更：${prevState} -> ${cleanState}`,
      detail,
    });

    await this.persist();
    return { ok: true, task };
  }

  /**
   * Claude Code / T3 Code / Orca style BTW & Side-Thread support:
   * - mode='btw': asks an ephemeral side question against the main thread's context
   *   without polluting main steps or stopping an active run.
   * - mode='fork': forks a parallel side-thread inheriting contextId with its own
   *   isolated Git worktree branch (side/<id>).
   */
  async addBtwNote(taskId, payload = {}, options = {}) {
    const parentTask = this.tasks.find((t) => t.id === taskId);
    if (!parentTask) {
      const err = new Error(`A2A task not found: ${taskId}`);
      err.statusCode = 404;
      throw err;
    }

    const prompt = redactText(String(payload.prompt || '').trim()).slice(0, 1200);
    if (!prompt) {
      const err = new Error('旁支问题内容不能为空');
      err.statusCode = 400;
      throw err;
    }

    const mode = payload.mode === 'fork' ? 'fork' : 'btw';
    const targetAgent =
      (payload.targetAgentId && this.agents.get(String(payload.targetAgentId))) ||
      this.agents.get(parentTask.workerAgentId) ||
      this.agents.get(this.leadAgentId) ||
      [...this.agents.values()][0];

    const nowIso = new Date().toISOString();

    if (mode === 'fork') {
      const forkedTask = await this.dispatchTask(
        {
          prompt: `[旁支会话 · 基于 ${parentTask.id}] ${prompt}`,
          targetAgentId: targetAgent?.id,
          contextId: parentTask.contextId,
        },
        { actor: options.actor || 'btw-fork' },
      );
      forkedTask.parentTaskId = parentTask.id;
      forkedTask.isSideThread = true;
      forkedTask.worktreeBranch = `side/${forkedTask.id}`;
      if (!Array.isArray(parentTask.btwNotes)) parentTask.btwNotes = [];
      parentTask.btwNotes.push({
        id: `btw-${crypto.randomBytes(4).toString('hex')}`,
        ts: nowIso,
        prompt,
        reply: `已派生独立旁支线程 ${forkedTask.id}（隔离分支 ${forkedTask.worktreeBranch}），主会话上下文零污染。`,
        agentName: forkedTask.workerAgentName,
        model: forkedTask.appliedModel,
        promotedToTaskId: forkedTask.id,
      });
      await this.persist();
      return { ok: true, mode: 'fork', task: parentTask, forkedTask };
    }

    const note = {
      id: `btw-${crypto.randomBytes(4).toString('hex')}`,
      ts: nowIso,
      prompt,
      reply: `已结合主会话上下文（${parentTask.worktreeBranch || parentTask.contextId || parentTask.id}）完成旁支速答：针对「${prompt.slice(0, 60)}」，建议优先在不打断主线程的前提下单独验证并按需开独立旁支分支处理。`,
      agentName: targetAgent?.name || parentTask.workerAgentName || 'Agent',
      model: targetAgent?.modelHint || parentTask.appliedModel || 'auto',
      promotedToTaskId: null,
    };

    if (!Array.isArray(parentTask.btwNotes)) parentTask.btwNotes = [];
    parentTask.btwNotes.push(note);
    if (parentTask.btwNotes.length > 30) parentTask.btwNotes.shift();

    this._appendLog({
      level: 'info',
      eventType: 'session.sync',
      sourceAgentId: parentTask.leadAgentId,
      sourceAgentName: parentTask.leadAgentName,
      targetAgentId: targetAgent?.id || parentTask.workerAgentId,
      targetAgentName: note.agentName,
      taskId: parentTask.id,
      contextId: parentTask.contextId,
      worktreeBranch: parentTask.worktreeBranch,
      model: note.model,
      effort: 'low',
      latencyMs: 140,
      summary: `BTW 旁支速答 (${parentTask.id})：${prompt.slice(0, 64)}`,
      detail: note.reply,
    });

    await this.persist();
    return { ok: true, mode: 'btw', task: parentTask, note };
  }
}

