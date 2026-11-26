import type { A2AAgentPeer, LinearIssueItem, LinearIssueStatus } from '../types';
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

