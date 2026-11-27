import type {
  A2ATaskRecord,
  GithubPullRequestItem,
  LinearIssueItem,
  LinearIssuePriority,
  LinearIssueStatus,
  LinearProjectItem,
} from '../types';

export interface LinearStatusColumnMeta {
  id: LinearIssueStatus;
  label: string;
  shortLabel: string;
}

export const LINEAR_STATUS_COLUMNS: readonly LinearStatusColumnMeta[] = [
  { id: 'triage', label: '分诊队列 (Triage)', shortLabel: 'Triage' },
  { id: 'backlog', label: '待规划 (Backlog)', shortLabel: 'Backlog' },
  { id: 'todo', label: '待执行 (Todo)', shortLabel: 'Todo' },
  { id: 'in_progress', label: '执行中 (In Progress)', shortLabel: '进行中' },
  { id: 'in_review', label: '评审中 (In Review)', shortLabel: '评审中' },
  { id: 'done', label: '已完成 (Done)', shortLabel: '已完成' },
] as const;

export function getPriorityMeta(priority: LinearIssuePriority | string): {
  label: string;
  weight: number;
  tone: 'failed' | 'degraded' | 'healthy' | 'standby';
} {
  switch (priority) {
    case 'urgent':
      return { label: 'P0 紧急', weight: 4, tone: 'failed' };
    case 'high':
      return { label: 'P1 高', weight: 3, tone: 'degraded' };
    case 'medium':
      return { label: 'P2 中', weight: 2, tone: 'healthy' };
    case 'low':
      return { label: 'P3 低', weight: 1, tone: 'standby' };
    default:
      return { label: '无优先级', weight: 0, tone: 'standby' };
  }
}

export function getIssueStatusMeta(status: LinearIssueStatus | string): {
  label: string;
  tone: 'healthy' | 'degraded' | 'failed' | 'standby';
} {
  switch (status) {
    case 'done':
      return { label: '已完成', tone: 'healthy' };
    case 'in_progress':
      return { label: '执行中', tone: 'degraded' };
    case 'in_review':
      return { label: '评审中', tone: 'degraded' };
    case 'triage':
      return { label: '待分诊', tone: 'failed' };
    case 'canceled':
      return { label: '已取消', tone: 'standby' };
    case 'backlog':
      return { label: '待规划', tone: 'standby' };
    default:
      return { label: '待执行', tone: 'standby' };
  }
}

export function filterLinearIssues(
  issues: LinearIssueItem[],
  filters: {
    projectId?: string;
    cycleId?: string;
    priority?: string;
    status?: string;
    query?: string;
  } = {},
): LinearIssueItem[] {
  const q = (filters.query || '').trim().toLowerCase();
  return issues.filter((item) => {
    if (filters.projectId && filters.projectId !== 'all' && item.projectId !== filters.projectId) {
      return false;
    }
    if (filters.cycleId && filters.cycleId !== 'all' && item.cycleId !== filters.cycleId) {
      return false;
    }
    if (filters.priority && filters.priority !== 'all' && item.priority !== filters.priority) {
      return false;
    }
    if (filters.status && filters.status !== 'all' && item.status !== filters.status) {
      return false;
    }
    if (!q) return true;
    const hay = `${item.identifier} ${item.title} ${item.description} ${item.assigneeName} ${(item.labels || []).join(' ')} ${item.worktreeBranch || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

export function groupIssuesByStatus(
  issues: LinearIssueItem[],
): Record<LinearIssueStatus, LinearIssueItem[]> {
  const grouped: Record<LinearIssueStatus, LinearIssueItem[]> = {
    triage: [],
    backlog: [],
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
    canceled: [],
  };

  for (const item of issues) {
    const bucket = grouped[item.status as LinearIssueStatus] || grouped.todo;
    bucket.push(item);
  }

  for (const key of Object.keys(grouped) as LinearIssueStatus[]) {
    grouped[key].sort((a, b) => getPriorityMeta(b.priority).weight - getPriorityMeta(a.priority).weight);
  }

  return grouped;
}

export interface LinearGraphNodeSpec {
  id: string;
  kind: 'commander' | 'issue' | 'sub-issue' | 'github-pr';
  x: number;
  y: number;
  title: string;
  subtitle: string;
  status: string;
  priority?: string;
  assigneeName?: string;
  identifier?: string;
  issueId?: string;
  url?: string | null;
}

export interface LinearGraphEdgeSpec {
  id: string;
  source: string;
  target: string;
  kind: 'commands' | 'parent' | 'blocks' | 'delivers';
  label: string;
  animated?: boolean;
}

/**
 * Computes deterministic non-overlapping DAG coordinates for React Flow:
 * Col 0 (x=40): Commander-in-Chief
 * Col 1 (x=340): Top-level Epic / Parent Issues
 * Col 2 (x=680): Sub-Issues & Blocked Dependent Tasks
 * Col 3 (x=1020): Linked GitHub PR Delivery Nodes
 */
export function buildLinearDependencyGraph({
  commanderName,
  commanderId,
  issues,
  projects,
  liveA2ATasks = [],
  liveGithubPrs = [],
}: {
  commanderName: string;
  commanderId: string;
  issues: LinearIssueItem[];
  projects: LinearProjectItem[];
  liveA2ATasks?: A2ATaskRecord[];
  liveGithubPrs?: GithubPullRequestItem[];
}): {
  nodes: LinearGraphNodeSpec[];
  edges: LinearGraphEdgeSpec[];
} {
  const nodes: LinearGraphNodeSpec[] = [];
  const edges: LinearGraphEdgeSpec[] = [];
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const visibleIssues = issues.filter((i) => i.status !== 'canceled');
  const rootIssues = visibleIssues.filter((i) => !i.parentId);
  const subIssues = visibleIssues.filter((i) => Boolean(i.parentId));
  const linkedTaskIds = new Set(visibleIssues.map((i) => i.linkedTaskId).filter(Boolean));
  const standaloneA2ATasks = liveA2ATasks
    .filter((task) => task?.id && !linkedTaskIds.has(task.id))
    .slice(0, 12);
  const totalPrimaryLanes = Math.max(rootIssues.length + standaloneA2ATasks.length, 1);

  const commanderNodeId = 'node-commander';
  const centerY = Math.max(140, Math.round(((totalPrimaryLanes - 1) * 185) / 2) + 40);

  nodes.push({
    id: commanderNodeId,
    kind: 'commander',
    x: 40,
    y: centerY,
    title: commanderName || '总指挥 Agent',
    subtitle: `Commander · ${commanderId || 'lead'}`,
    status: 'healthy',
  });

  const issueNodeIdMap = new Map<string, string>();

  rootIssues.forEach((issue, index) => {
    const nodeId = `issue-${issue.id}`;
    issueNodeIdMap.set(issue.id, nodeId);
    nodes.push({
      id: nodeId,
      kind: 'issue',
      x: 380,
      y: 40 + index * 185,
      title: issue.title,
      subtitle: `${projectMap.get(issue.projectId) || issue.projectId} · ${issue.worktreeBranch || '未建分支'}`,
      status: issue.status,
      priority: issue.priority,
      assigneeName: issue.assigneeName,
      identifier: issue.identifier,
      issueId: issue.id,
    });
    edges.push({
      id: `edge-cmd-${issue.id}`,
      source: commanderNodeId,
      target: nodeId,
      kind: 'commands',
      label: issue.status === 'triage' ? '待分诊' : '统领调度',
      animated: issue.status === 'in_progress',
    });
  });

  // Live A2A tasks not already linked to a Linear issue
  standaloneA2ATasks.forEach((task, idx) => {
    const laneIndex = rootIssues.length + idx;
    const nodeId = `a2a-task-${task.id}`;
    const mappedStatus =
      task.state === 'completed'
        ? 'done'
        : task.state === 'working'
          ? 'in_progress'
          : task.state === 'failed' || task.state === 'canceled'
            ? 'canceled'
            : 'todo';
    nodes.push({
      id: nodeId,
      kind: 'sub-issue',
      x: 380,
      y: 40 + laneIndex * 185,
      title: task.prompt || task.id,
      subtitle: `A2A · ${task.workerAgentName || task.workerNodeId || 'Worker'} · ${task.state}`,
      status: mappedStatus,
      assigneeName: task.workerAgentName || task.workerNodeId || 'Agent',
      identifier: task.id.length > 14 ? `${task.id.slice(0, 14)}…` : task.id,
    });
    edges.push({
      id: `edge-cmd-a2a-${task.id}`,
      source: commanderNodeId,
      target: nodeId,
      kind: 'commands',
      label: 'A2A 派发',
      animated: task.state === 'working',
    });
  });

  subIssues.forEach((sub, index) => {
    const nodeId = `issue-${sub.id}`;
    issueNodeIdMap.set(sub.id, nodeId);
    nodes.push({
      id: nodeId,
      kind: 'sub-issue',
      x: 760,
      y: 40 + index * 185,
      title: sub.title,
      subtitle: `${sub.assigneeName || '未指派'} · ${sub.estimate}pt`,
      status: sub.status,
      priority: sub.priority,
      assigneeName: sub.assigneeName,
      identifier: sub.identifier,
      issueId: sub.id,
    });

    if (sub.parentId && issueNodeIdMap.has(sub.parentId)) {
      edges.push({
        id: `edge-parent-${sub.parentId}-${sub.id}`,
        source: issueNodeIdMap.get(sub.parentId)!,
        target: nodeId,
        kind: 'parent',
        label: '拆解派发',
        animated: sub.status === 'in_progress',
      });
    }
  });

  // Blocking dependency edges
  for (const issue of visibleIssues) {
    const targetNodeId = issueNodeIdMap.get(issue.id);
    if (!targetNodeId || !Array.isArray(issue.blockedBy)) continue;
    for (const blockerId of issue.blockedBy) {
      const sourceNodeId = issueNodeIdMap.get(blockerId);
      if (sourceNodeId) {
        edges.push({
          id: `edge-blocks-${blockerId}-${issue.id}`,
          source: sourceNodeId,
          target: targetNodeId,
          kind: 'blocks',
          label: '前置阻塞',
          animated: false,
        });
      }
    }
  }

  // Linked GitHub PR delivery nodes
  const prSeen = new Map<string, string>();
  let prIndex = 0;
  for (const issue of visibleIssues) {
    if (!issue.github?.prNumber) continue;
    const prKey = `${issue.github.repo || 'repo'}#${issue.github.prNumber}`;
    let prNodeId = prSeen.get(prKey);
    if (!prNodeId) {
      prNodeId = `pr-${issue.github.prNumber}-${prIndex}`;
      prSeen.set(prKey, prNodeId);
      nodes.push({
        id: prNodeId,
        kind: 'github-pr',
        x: 1140,
        y: 40 + prIndex * 185,
        title: `GitHub PR #${issue.github.prNumber}`,
        subtitle: `${issue.github.repo || 'github'} · ${issue.github.branch || 'branch'}`,
        status: issue.github.prState === 'merged' ? 'done' : 'in_review',
        identifier: `PR #${issue.github.prNumber}`,
        url: issue.github.url || null,
      });
      prIndex++;
    }
    const sourceIssueNode = issueNodeIdMap.get(issue.id);
    if (sourceIssueNode) {
      edges.push({
        id: `edge-pr-${issue.id}-${prNodeId}`,
        source: sourceIssueNode,
        target: prNodeId,
        kind: 'delivers',
        label: issue.github.prState === 'merged' ? '已合并' : 'PR 交付',
        animated: issue.github.prState === 'open',
      });
    }
  }

  // Live GitHub PRs not yet linked to a Linear issue
  const seenPrNumbers = new Set(visibleIssues.map((i) => i.github?.prNumber).filter(Boolean));
  for (const pr of liveGithubPrs.slice(0, 10)) {
    if (!pr?.number || seenPrNumbers.has(pr.number)) continue;
    seenPrNumbers.add(pr.number);
    const prNodeId = `live-pr-${pr.number}`;
    const normalizedState = String(pr.state || 'OPEN').toLowerCase();
    nodes.push({
      id: prNodeId,
      kind: 'github-pr',
      x: 1140,
      y: 40 + prIndex * 185,
      title: pr.title || `GitHub PR #${pr.number}`,
      subtitle: `${pr.headRefName || 'branch'} → ${pr.baseRefName || 'main'}`,
      status: normalizedState === 'merged' ? 'done' : 'in_review',
      identifier: `PR #${pr.number}`,
      url: pr.url || null,
    });
    edges.push({
      id: `edge-cmd-pr-${pr.number}`,
      source: commanderNodeId,
      target: prNodeId,
      kind: 'delivers',
      label: normalizedState === 'merged' ? '已合并' : '实时 PR',
      animated: normalizedState === 'open',
    });
    prIndex++;
  }

  return { nodes, edges };
}
