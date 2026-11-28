import type {
  A2AAgentPeer,
  A2ATaskRecord,
  LinearIssueItem,
  LinearIssueStatus,
} from '../types';
import { getPriorityMeta } from './linear-projects';

export type SimpleBoardColumnId = 'queued' | 'in_progress' | 'in_review' | 'done';

export interface SimpleBoardColumn {
  id: SimpleBoardColumnId;
  label: string;
  targetStatus: LinearIssueStatus;
  hint: string;
}

export const SIMPLE_BOARD_COLUMNS: readonly SimpleBoardColumn[] = [
  { id: 'queued', label: '待执行 / 下一步', targetStatus: 'todo', hint: '待分配、分诊与排期中的任务' },
  { id: 'in_progress', label: '执行中', targetStatus: 'in_progress', hint: 'Agent 正在处理的活跃任务' },
  { id: 'in_review', label: '待评审 / PR', targetStatus: 'in_review', hint: '等待评审或 GitHub PR 合并' },
  { id: 'done', label: '已完成', targetStatus: 'done', hint: '已交付验收的任务' },
] as const;

export function mapStatusToSimpleColumn(status: LinearIssueStatus | string): SimpleBoardColumnId | null {
  switch (status) {
    case 'triage':
    case 'backlog':
    case 'todo':
      return 'queued';
    case 'in_progress':
      return 'in_progress';
    case 'in_review':
      return 'in_review';
    case 'done':
      return 'done';
    default:
      return null;
  }
}

export function groupIssuesForSimpleBoard(
  issues: LinearIssueItem[],
): Record<SimpleBoardColumnId, LinearIssueItem[]> {
  const buckets: Record<SimpleBoardColumnId, LinearIssueItem[]> = {
    queued: [],
    in_progress: [],
    in_review: [],
    done: [],
  };

  for (const item of issues) {
    const col = mapStatusToSimpleColumn(item.status);
    if (!col) continue;
    buckets[col].push(item);
  }

  const sortByUrgency = (a: LinearIssueItem, b: LinearIssueItem) => {
    // Triage items bubble first inside queued so nothing gets missed
    if (a.status === 'triage' && b.status !== 'triage') return -1;
    if (b.status === 'triage' && a.status !== 'triage') return 1;
    return getPriorityMeta(b.priority).weight - getPriorityMeta(a.priority).weight;
  };

  for (const col of Object.keys(buckets) as SimpleBoardColumnId[]) {
    buckets[col].sort(sortByUrgency);
  }

  return buckets;
}

export interface AgentWorkloadSummary {
  agentId: string;
  agentName: string;
  harness: string;
  role: 'lead' | 'worker' | string;
  status: string;
  modelHint: string;
  currentIssues: LinearIssueItem[];
  nextIssues: LinearIssueItem[];
  reviewIssues: LinearIssueItem[];
  doneCount: number;
  totalAssigned: number;
}

export function computeAgentWorkloads(
  agents: Array<Pick<A2AAgentPeer, 'id' | 'name' | 'harness' | 'role' | 'status' | 'modelHint'>>,
  issues: LinearIssueItem[],
): AgentWorkloadSummary[] {
  const activeIssues = issues.filter((i) => i.status !== 'canceled');

  return agents.map((agent) => {
    const mine = activeIssues.filter((issue) => issue.assigneeId === agent.id);
    const currentIssues = mine
      .filter((i) => i.status === 'in_progress')
      .sort((a, b) => getPriorityMeta(b.priority).weight - getPriorityMeta(a.priority).weight);
    const nextIssues = mine
      .filter((i) => i.status === 'triage' || i.status === 'todo' || i.status === 'backlog')
      .sort((a, b) => getPriorityMeta(b.priority).weight - getPriorityMeta(a.priority).weight);
    const reviewIssues = mine.filter((i) => i.status === 'in_review');
    const doneCount = mine.filter((i) => i.status === 'done').length;

    return {
      agentId: agent.id,
      agentName: agent.name,
      harness: agent.harness,
      role: agent.role,
      status: agent.status,
      modelHint: agent.modelHint || 'auto',
      currentIssues,
      nextIssues,
      reviewIssues,
      doneCount,
      totalAssigned: mine.length,
    };
  });
}

export function pickUpcomingTasks(issues: LinearIssueItem[], limit = 5): LinearIssueItem[] {
  return issues
    .filter((i) => i.status === 'triage' || i.status === 'todo' || i.status === 'backlog')
    .sort((a, b) => {
      if (a.status === 'triage' && b.status !== 'triage') return -1;
      if (b.status === 'triage' && a.status !== 'triage') return 1;
      return getPriorityMeta(b.priority).weight - getPriorityMeta(a.priority).weight;
    })
    .slice(0, limit);
}

export function describeAgentRole(agent: Pick<A2AAgentPeer, 'role' | 'harness' | 'pluginKind'>): string {
  if (agent.role === 'lead') return '总指挥 · 任务规划与派发';
  if (agent.pluginKind === 'dsh-review-plugin' || agent.harness === 'dsh-expert') return '专家评审 · PR 与质量把关';
  if (agent.harness === 'claude-code') return '主力开发 · 架构与界面实现';
  if (agent.harness === 'pi' || agent.harness === 'pi-agent') return '极速终端 · 脚本与自动化测试';
  if (agent.harness === 'codex-cli') return '工程代理 · 代码重构与验证';
  return '执行 Worker';
}

export function isAgentOnline(status?: string | null): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'online' || s === 'healthy' || s === 'active' || s === 'ready';
}

export function shortAgentName(name?: string | null): string {
  const raw = String(name || '').trim();
  if (!raw) return 'Agent';
  // Strip verbose parenthetical subtitle for crisp compact cards while keeping full name in tooltip
  const stripped = raw.replace(/\s*[（(][^）)]*[）)]\s*$/u, '').trim();
  return stripped || raw;
}

export type SlashCommandCategory = 'dispatch' | 'control' | 'context' | 'inspect';

export interface SlashCommandDef {
  name: string;
  usage: string;
  description: string;
  category: SlashCommandCategory;
  shortcutHint: string;
  acceptsArgs: boolean;
}

export const SLASH_COMMANDS: readonly SlashCommandDef[] = [
  {
    name: '/help',
    usage: '/help',
    description: '查看所有快捷指令与 @ 助手切换用法',
    category: 'inspect',
    shortcutHint: 'Enter',
    acceptsArgs: false,
  },
  {
    name: '/agent',
    usage: '/agent <id>',
    description: '切换默认执行助手或设备节点',
    category: 'control',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/model',
    usage: '/model <name>',
    description: '指定本次使用的模型，输入 default 恢复默认',
    category: 'control',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/effort',
    usage: '/effort <low|medium|high|xhigh|max>',
    description: '调整思考深度（轻量 / 均衡 / 深入 / 深度 / 最高）',
    category: 'control',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/mode',
    usage: '/mode <lead-router|main-sub|swarm|plan>',
    description: '切换协作方式（自动分配 / 主从拆解 / 多助手并行 / 先规划再执行）',
    category: 'control',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/plan',
    usage: '/plan <任务>',
    description: '先规划方案与风险评估，再决定是否执行',
    category: 'dispatch',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/worktree',
    usage: '/worktree <分支> <任务>',
    description: '在独立代码分支中开发，不影响主分支',
    category: 'dispatch',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/board',
    usage: '/board',
    description: '在对话流与任务运行泳道之间切换',
    category: 'control',
    shortcutHint: 'Enter',
    acceptsArgs: false,
  },
  {
    name: '/tasks',
    usage: '/tasks [关键词]',
    description: '按内容、助手或分支筛选历史任务',
    category: 'inspect',
    shortcutHint: 'Enter',
    acceptsArgs: true,
  },
  {
    name: '/status',
    usage: '/status',
    description: '查看当前在线助手、设备节点与任务概况',
    category: 'inspect',
    shortcutHint: 'Enter',
    acceptsArgs: false,
  },
  {
    name: '/ping',
    usage: '/ping <agentId>',
    description: '检测目标助手的在线状态与响应延迟',
    category: 'inspect',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/handoff',
    usage: '/handoff <agentId>',
    description: '将当前对话交接给另一台设备的助手继续处理',
    category: 'context',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/btw',
    usage: '/btw <问题>',
    description: '开启旁支问答（不影响当前主对话，满意后再合入）',
    category: 'context',
    shortcutHint: 'Tab',
    acceptsArgs: true,
  },
  {
    name: '/compact',
    usage: '/compact',
    description: '整理当前对话摘要，减少冗余上下文（原记录保留）',
    category: 'context',
    shortcutHint: 'Enter',
    acceptsArgs: false,
  },
  {
    name: '/clear',
    usage: '/clear',
    description: '开始一段全新对话',
    category: 'context',
    shortcutHint: 'Enter',
    acceptsArgs: false,
  },
] as const;

export interface ParsedSlashInput {
  isSlash: boolean;
  command: string | null;
  args: string[];
  rest: string;
  raw: string;
}

export function parseSlashInput(raw: string): ParsedSlashInput {
  const source = String(raw || '');
  const trimmedLeft = source.trimStart();
  if (!trimmedLeft.startsWith('/')) {
    return {
      isSlash: false,
      command: null,
      args: [],
      rest: source.trim(),
      raw: source,
    };
  }

  if (trimmedLeft === '/' || /^\/\s+$/.test(trimmedLeft)) {
    return {
      isSlash: true,
      command: null,
      args: [],
      rest: '',
      raw: source,
    };
  }

  const match = /^\/([a-zA-Z][a-zA-Z0-9_-]*)(?:\s+([\s\S]*))?$/.exec(trimmedLeft);
  if (!match) {
    return {
      isSlash: false,
      command: null,
      args: [],
      rest: source.trim(),
      raw: source,
    };
  }

  const command = `/${match[1].toLowerCase()}`;
  const rest = (match[2] || '').trim();
  const args = rest ? rest.split(/\s+/).filter(Boolean) : [];

  return {
    isSlash: true,
    command,
    args,
    rest,
    raw: source,
  };
}

export function filterSlashCommands(query: string): SlashCommandDef[] {
  const normalized = String(query || '')
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase();

  if (!normalized) {
    return [...SLASH_COMMANDS];
  }

  const scored = SLASH_COMMANDS.map((cmd, index) => {
    const cmdKey = cmd.name.slice(1).toLowerCase();
    const usageLower = cmd.usage.toLowerCase();
    const descLower = cmd.description.toLowerCase();
    const categoryLower = cmd.category.toLowerCase();

    let score = 0;
    if (cmdKey === normalized) {
      score = 100;
    } else if (cmdKey.startsWith(normalized)) {
      score = 80;
    } else if (cmdKey.includes(normalized)) {
      score = 60;
    } else if (
      usageLower.includes(normalized) ||
      descLower.includes(normalized) ||
      categoryLower.includes(normalized)
    ) {
      score = 30;
    }

    return { cmd, score, index };
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return scored.map((entry) => entry.cmd);
}

function rankAgentsForQuery(agents: A2AAgentPeer[], query: string): A2AAgentPeer[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...agents].sort((left, right) => {
      const onlineDiff = Number(isAgentOnline(right.status)) - Number(isAgentOnline(left.status));
      if (onlineDiff !== 0) return onlineDiff;
      if (left.role === 'lead' && right.role !== 'lead') return -1;
      if (right.role === 'lead' && left.role !== 'lead') return 1;
      return left.name.localeCompare(right.name);
    });
  }

  const scored = agents
    .map((agent, index) => {
      const idLower = agent.id.toLowerCase();
      const nodeIdLower = String(agent.nodeId || '').toLowerCase();
      const nodeNameLower = String(agent.nodeName || '').toLowerCase();
      const shortNameLower = shortAgentName(agent.name).toLowerCase();
      const shortSlug = shortNameLower.replace(/\s+/g, '-');
      const fullNameLower = String(agent.name || '').toLowerCase();
      const harnessLower = String(agent.harness || '').toLowerCase();
      const modelLower = String(agent.modelHint || '').toLowerCase();

      let score = 0;
      if (idLower === normalized || nodeIdLower === normalized) {
        score = 100;
      } else if (
        shortSlug === normalized ||
        shortNameLower === normalized ||
        harnessLower === normalized
      ) {
        score = 90;
      } else if (idLower.startsWith(normalized) || nodeIdLower.startsWith(normalized)) {
        score = 75;
      } else if (shortSlug.startsWith(normalized) || shortNameLower.startsWith(normalized)) {
        score = 65;
      } else if (
        idLower.includes(normalized) ||
        nodeIdLower.includes(normalized) ||
        nodeNameLower.includes(normalized) ||
        fullNameLower.includes(normalized) ||
        harnessLower.includes(normalized) ||
        modelLower.includes(normalized)
      ) {
        score = 40;
      }

      if (score > 0 && isAgentOnline(agent.status)) {
        score += 5;
      }
      return { agent, score, index };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return scored.map((entry) => entry.agent);
}

export function resolveAgentByToken(token: string, agents: A2AAgentPeer[]): A2AAgentPeer | null {
  const normalized = String(token || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
  if (!normalized || agents.length === 0) return null;

  const exactId = agents.find((agent) => agent.id.toLowerCase() === normalized);
  if (exactId) return exactId;

  const exactNodeMatches = agents.filter(
    (agent) => String(agent.nodeId || '').toLowerCase() === normalized,
  );
  if (exactNodeMatches.length > 0) {
    return (
      exactNodeMatches.find((agent) => isAgentOnline(agent.status) && agent.role === 'lead') ||
      exactNodeMatches.find((agent) => isAgentOnline(agent.status)) ||
      exactNodeMatches[0]
    );
  }

  const exactShortOrHarness = agents.find((agent) => {
    const shortLower = shortAgentName(agent.name).toLowerCase();
    const shortSlug = shortLower.replace(/\s+/g, '-');
    return (
      shortLower === normalized ||
      shortSlug === normalized ||
      String(agent.harness || '').toLowerCase() === normalized
    );
  });
  if (exactShortOrHarness) return exactShortOrHarness;

  if (normalized.length >= 2) {
    const ranked = rankAgentsForQuery(agents, normalized);
    if (ranked.length === 1) {
      return ranked[0];
    }
  }

  return null;
}

export interface AtMentionResult {
  hasMention: boolean;
  activeQuery: string | null;
  activeStartIndex: number;
  matchedAgent: A2AAgentPeer | null;
  matchedToken: string | null;
  cleanedPrompt: string;
  candidates: A2AAgentPeer[];
}

export function extractAtMention(raw: string, agents: A2AAgentPeer[]): AtMentionResult {
  const source = String(raw || '');
  const trailingMatch = /(?:^|\s)@([a-zA-Z0-9._:-]*)$/.exec(source);

  let activeQuery: string | null = null;
  let activeStartIndex = -1;
  let candidates: A2AAgentPeer[] = [];

  if (trailingMatch) {
    activeQuery = trailingMatch[1];
    activeStartIndex = trailingMatch.index + (trailingMatch[0].startsWith('@') ? 0 : 1);
    candidates = rankAgentsForQuery(agents, activeQuery);
  }

  let matchedAgent: A2AAgentPeer | null = null;
  let matchedToken: string | null = null;
  let matchedAtStart = false;

  const mentionRe = /(?:^|\s)(@([a-zA-Z0-9._:-]+))/g;
  let tokenMatch = mentionRe.exec(source);
  while (tokenMatch) {
    const fullToken = tokenMatch[1];
    const bareToken = tokenMatch[2];
    const resolved = resolveAgentByToken(bareToken, agents);
    if (resolved) {
      matchedAgent = resolved;
      matchedToken = fullToken;
      const tokenStart = tokenMatch.index + (tokenMatch[0].startsWith('@') ? 0 : 1);
      matchedAtStart = source.slice(0, tokenStart).trim().length === 0;
      break;
    }
    tokenMatch = mentionRe.exec(source);
  }

  let cleanedPrompt = source.trim();
  if (matchedAgent && matchedToken && matchedAtStart) {
    const afterToken = source.trimStart().slice(matchedToken.length).trim();
    if (afterToken.length > 0) {
      cleanedPrompt = afterToken;
    }
  }

  return {
    hasMention: activeQuery !== null || matchedAgent !== null,
    activeQuery,
    activeStartIndex,
    matchedAgent,
    matchedToken,
    cleanedPrompt,
    candidates,
  };
}

export function filterAgentTasks(tasks: A2ATaskRecord[], query: string): A2ATaskRecord[] {
  const trimmed = String(query || '').trim().toLowerCase();
  if (!trimmed) return [...tasks];

  const terms = trimmed.split(/\s+/).filter(Boolean);
  return tasks.filter((task) => {
    const haystack = [
      task.id,
      task.contextId,
      task.prompt,
      task.workerAgentName,
      task.workerAgentId,
      task.workerNodeId,
      task.leadAgentName,
      task.appliedModel,
      task.appliedEffort,
      task.executionMode,
      task.worktreeBranch,
      task.state,
      task.slashCommand,
      task.matchedSkill,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}

export type KanbanLifecycleColumnId = 'pending' | 'working' | 'done' | 'failed';
export type KanbanCanonicalTaskState = 'submitted' | 'working' | 'completed' | 'failed';

export interface KanbanLifecycleColumn {
  id: KanbanLifecycleColumnId;
  label: string;
  subtitle: string;
  canonicalState: KanbanCanonicalTaskState;
  accentTone: 'muted' | 'warn' | 'ok' | 'err';
}

export const KANBAN_LIFECYCLE_COLUMNS: readonly KanbanLifecycleColumn[] = [
  {
    id: 'pending',
    label: '待执行',
    subtitle: '排队等待',
    canonicalState: 'submitted',
    accentTone: 'muted',
  },
  {
    id: 'working',
    label: '执行中',
    subtitle: '正在运行',
    canonicalState: 'working',
    accentTone: 'warn',
  },
  {
    id: 'done',
    label: '已完成',
    subtitle: '执行结束',
    canonicalState: 'completed',
    accentTone: 'ok',
  },
  {
    id: 'failed',
    label: '失败 / 取消',
    subtitle: '异常终止',
    canonicalState: 'failed',
    accentTone: 'err',
  },
] as const;

export function taskStateToKanbanColumn(state?: string | null): KanbanLifecycleColumnId {
  switch (String(state || '').toLowerCase()) {
    case 'working':
      return 'working';
    case 'completed':
      return 'done';
    case 'failed':
    case 'canceled':
      return 'failed';
    case 'submitted':
    default:
      return 'pending';
  }
}

export function kanbanColumnToTaskState(colId: KanbanLifecycleColumnId): KanbanCanonicalTaskState {
  switch (colId) {
    case 'pending':
      return 'submitted';
    case 'working':
      return 'working';
    case 'done':
      return 'completed';
    case 'failed':
      return 'failed';
  }
}

function parseTaskTimestamp(ts?: string | null): number {
  if (!ts) return 0;
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function groupTasksByLifecycle(
  tasks: A2ATaskRecord[],
): Record<KanbanLifecycleColumnId, A2ATaskRecord[]> {
  const buckets: Record<KanbanLifecycleColumnId, A2ATaskRecord[]> = {
    pending: [],
    working: [],
    done: [],
    failed: [],
  };

  for (const task of tasks) {
    const column = taskStateToKanbanColumn(task.state);
    buckets[column].push(task);
  }

  const sortByUpdatedDesc = (left: A2ATaskRecord, right: A2ATaskRecord) => {
    const rightTime = parseTaskTimestamp(right.updatedAt || right.createdAt);
    const leftTime = parseTaskTimestamp(left.updatedAt || left.createdAt);
    if (rightTime !== leftTime) return rightTime - leftTime;
    return right.id.localeCompare(left.id);
  };

  for (const columnId of Object.keys(buckets) as KanbanLifecycleColumnId[]) {
    buckets[columnId].sort(sortByUpdatedDesc);
  }

  return buckets;
}

export function buildConversationThread(
  tasks: A2ATaskRecord[],
  activeTaskId: string | null,
): A2ATaskRecord[] {
  if (!activeTaskId) return [];
  const activeTask = tasks.find((task) => task.id === activeTaskId);
  if (!activeTask) return [];

  const collected = new Map<string, A2ATaskRecord>();
  if (activeTask.contextId) {
    for (const task of tasks) {
      if (task.contextId === activeTask.contextId) {
        collected.set(task.id, task);
      }
    }
  } else {
    collected.set(activeTask.id, activeTask);
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const task of tasks) {
        if (collected.has(task.id)) continue;
        const parentMatched = Boolean(task.parentTaskId && collected.has(task.parentTaskId));
        const childMatched = [...collected.values()].some(
          (existing) => existing.parentTaskId === task.id,
        );
        if (parentMatched || childMatched) {
          collected.set(task.id, task);
          expanded = true;
        }
      }
    }
  }

  return [...collected.values()].sort((left, right) => {
    const leftCreated = parseTaskTimestamp(left.createdAt);
    const rightCreated = parseTaskTimestamp(right.createdAt);
    if (leftCreated !== rightCreated) return leftCreated - rightCreated;
    const leftUpdated = parseTaskTimestamp(left.updatedAt);
    const rightUpdated = parseTaskTimestamp(right.updatedAt);
    if (leftUpdated !== rightUpdated) return leftUpdated - rightUpdated;
    return left.id.localeCompare(right.id);
  });
}

export interface CompactThreadSummary {
  turnCount: number;
  contextId: string | null;
  agents: string[];
  models: string[];
  branches: string[];
  completedCount: number;
  activeCount: number;
  failedCount: number;
  highlights: string[];
}

export function buildCompactThreadSummary(threadTasks: A2ATaskRecord[]): CompactThreadSummary {
  const agents = new Set<string>();
  const models = new Set<string>();
  const branches = new Set<string>();
  let completedCount = 0;
  let activeCount = 0;
  let failedCount = 0;

  for (const task of threadTasks) {
    agents.add(shortAgentName(task.workerAgentName || task.leadAgentName));
    if (task.appliedModel) models.add(task.appliedModel);
    if (task.worktreeBranch) branches.add(task.worktreeBranch);
    const col = taskStateToKanbanColumn(task.state);
    if (col === 'done') completedCount += 1;
    else if (col === 'failed') failedCount += 1;
    else activeCount += 1;
  }

  const highlights = threadTasks.slice(-4).map((task) => {
    const promptSnippet = task.prompt.replace(/\s+/g, ' ').trim().slice(0, 72);
    return `${task.id} [${task.state}] ${promptSnippet}`;
  });

  return {
    turnCount: threadTasks.length,
    contextId: threadTasks[0]?.contextId || null,
    agents: [...agents],
    models: [...models],
    branches: [...branches],
    completedCount,
    activeCount,
    failedCount,
    highlights,
  };
}

export interface AgentNodeGroup {
  nodeId: string;
  nodeName: string;
  onlineCount: number;
  agents: A2AAgentPeer[];
}

export function groupAgentsByNode(agents: A2AAgentPeer[]): AgentNodeGroup[] {
  const byNode = new Map<string, AgentNodeGroup>();
  for (const agent of agents) {
    const nodeId = agent.nodeId || 'hub-primary';
    const existing = byNode.get(nodeId);
    const online = isAgentOnline(agent.status);
    if (existing) {
      existing.agents.push(agent);
      if (online) existing.onlineCount += 1;
    } else {
      byNode.set(nodeId, {
        nodeId,
        nodeName: agent.nodeName || nodeId,
        onlineCount: online ? 1 : 0,
        agents: [agent],
      });
    }
  }
  return [...byNode.values()];
}

