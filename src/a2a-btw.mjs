import { redactText } from './redact.mjs';

export const VALID_BTW_MODES = new Set(['btw', 'fork']);
export const VALID_BTW_STATUSES = new Set(['open', 'pending_approval', 'approved', 'merged', 'rejected', 'archived']);
export const VALID_MERGE_TARGETS = new Set(['session_context', 'task_step', 'pr_draft']);
export const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high']);
export const MAX_BTW_THREADS = 120;
export const MAX_BTW_MESSAGES = 40;

const VALID_MESSAGE_ROLES = new Set(['user', 'assistant', 'system']);
const VALID_PROPOSAL_STATUSES = new Set(['pending', 'approved', 'rejected', 'merged']);
const STATUS_TRANSITIONS = {
  open: ['pending_approval', 'archived'],
  pending_approval: ['approved', 'rejected', 'open', 'archived'],
  approved: ['merged', 'rejected', 'archived'],
  rejected: ['open', 'pending_approval', 'archived'],
  archived: ['open'],
  merged: [],
};

function cleanString(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function cleanNullableString(value) {
  const text = cleanString(value);
  return text || null;
}

function redactAndLimit(value, maxLength) {
  return redactText(cleanString(value)).slice(0, maxLength);
}

function normalizeTimestamp(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  const text = cleanString(value);
  if (!text) return fallback;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? fallback : text;
}

function normalizeNullableTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  const text = cleanString(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : text;
}

function normalizeNonNegativeInteger(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.floor(numericValue));
}

function normalizeNullableInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return Math.max(0, Math.floor(numericValue));
}

function normalizePrDraftSpec(rawSpec) {
  if (!rawSpec || typeof rawSpec !== 'object' || Array.isArray(rawSpec)) return null;
  return {
    branch: cleanString(rawSpec.branch),
    baseBranch: cleanString(rawSpec.baseBranch) || 'main',
    title: redactAndLimit(rawSpec.title, 120),
    body: redactAndLimit(rawSpec.body, 2400),
  };
}

function normalizeBtwMessage(rawMessage, messageIndex, fallbackTimestamp, threadDefaults) {
  if (!rawMessage || typeof rawMessage !== 'object' || Array.isArray(rawMessage)) return null;
  const roleText = cleanString(rawMessage.role);
  return {
    id: cleanString(rawMessage.id) || `btw-msg-${messageIndex + 1}`,
    ts: normalizeTimestamp(rawMessage.ts, fallbackTimestamp),
    role: VALID_MESSAGE_ROLES.has(roleText) ? roleText : 'assistant',
    content: redactAndLimit(rawMessage.content ?? rawMessage.text, 2000),
    agentId: cleanNullableString(rawMessage.agentId) || threadDefaults.targetAgentId,
    agentName: cleanNullableString(rawMessage.agentName) || threadDefaults.targetAgentName,
    model: cleanNullableString(rawMessage.model) || threadDefaults.model,
    spillRefId: cleanNullableString(rawMessage.spillRefId),
  };
}

function normalizeBtwMergeProposal(rawProposal, threadDefaults) {
  if (!rawProposal || typeof rawProposal !== 'object' || Array.isArray(rawProposal)) return null;

  const targetType = VALID_MERGE_TARGETS.has(cleanString(rawProposal.targetType))
    ? cleanString(rawProposal.targetType)
    : 'session_context';
  const summary = redactAndLimit(rawProposal.summary, 400);
  const rationale = redactAndLimit(rawProposal.rationale, 1200);
  const riskLevel = VALID_RISK_LEVELS.has(cleanString(rawProposal.riskLevel))
    ? cleanString(rawProposal.riskLevel)
    : classifyBtwMergeRisk({ targetType, summary, rationale });
  const status = VALID_PROPOSAL_STATUSES.has(cleanString(rawProposal.status))
    ? cleanString(rawProposal.status)
    : 'pending';

  return {
    id: cleanString(rawProposal.id) || `btw-merge-${threadDefaults.id}`,
    proposedAt: normalizeTimestamp(rawProposal.proposedAt, threadDefaults.updatedAt),
    proposedBy: cleanString(rawProposal.proposedBy) || threadDefaults.createdBy,
    summary,
    rationale,
    targetType,
    targetSessionId: cleanNullableString(rawProposal.targetSessionId) || threadDefaults.sessionId,
    targetTaskId: cleanNullableString(rawProposal.targetTaskId) || threadDefaults.taskId,
    targetBranch: cleanNullableString(rawProposal.targetBranch) || threadDefaults.worktreeBranch,
    patchPreview: redactAndLimit(rawProposal.patchPreview, 2400),
    prDraftSpec: normalizePrDraftSpec(rawProposal.prDraftSpec),
    riskLevel,
    status,
    reviewedAt: normalizeNullableTimestamp(rawProposal.reviewedAt),
    reviewedBy: cleanNullableString(rawProposal.reviewedBy),
    reviewComment: redactAndLimit(rawProposal.reviewComment, 800) || null,
    mergedAt: normalizeNullableTimestamp(rawProposal.mergedAt),
    mergedRevision: normalizeNullableInteger(rawProposal.mergedRevision),
    mergedStepTs: normalizeNullableTimestamp(rawProposal.mergedStepTs),
    spillRefId: cleanNullableString(rawProposal.spillRefId),
  };
}

export function canTransitionBtwStatus(fromStatus, toStatus) {
  const allowedTransitions = STATUS_TRANSITIONS[cleanString(fromStatus)];
  if (!Array.isArray(allowedTransitions)) return false;
  return allowedTransitions.includes(cleanString(toStatus));
}

export function normalizeBtwThread(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;

  const threadId = cleanString(raw.id);
  const sessionId = cleanNullableString(raw.sessionId);
  const taskId = cleanNullableString(raw.taskId);
  const nowIso = new Date().toISOString();
  const createdAt = normalizeTimestamp(raw.createdAt, nowIso);
  const updatedAt = normalizeTimestamp(raw.updatedAt, createdAt);
  const mode = raw.mode === 'fork' ? 'fork' : 'btw';
  const status = VALID_BTW_STATUSES.has(cleanString(raw.status)) ? cleanString(raw.status) : 'open';
  const isolation = mode === 'fork' || raw.isolation === 'worktree' ? 'worktree' : 'ephemeral';
  const targetAgentId = cleanString(raw.targetAgentId) || 'agent-primary';
  const targetAgentName = cleanString(raw.targetAgentName) || '主 Agent';
  const model = cleanString(raw.model) || 'auto';
  const createdBy = cleanString(raw.createdBy) || 'system';
  const threadDefaults = {
    id: threadId,
    sessionId,
    taskId,
    targetAgentId,
    targetAgentName,
    model,
    worktreeBranch: cleanNullableString(raw.worktreeBranch),
    createdAt,
    updatedAt,
    createdBy,
  };

  const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];
  const messages = rawMessages
    .map((rawMessage, messageIndex) => normalizeBtwMessage(rawMessage, messageIndex, updatedAt, threadDefaults))
    .filter(Boolean)
    .slice(-MAX_BTW_MESSAGES);

  return {
    id: threadId,
    sessionId,
    taskId,
    contextId: cleanString(raw.contextId) || sessionId || taskId || threadId,
    title: redactAndLimit(raw.title, 120) || 'BTW 旁支会话',
    mode,
    status,
    isolation,
    worktreeBranch: threadDefaults.worktreeBranch,
    forkedTaskId: cleanNullableString(raw.forkedTaskId),
    targetAgentId,
    targetAgentName,
    model,
    mainlineRevisionAtOpen: normalizeNonNegativeInteger(raw.mainlineRevisionAtOpen),
    messages,
    mergeProposal: normalizeBtwMergeProposal(raw.mergeProposal, threadDefaults),
    createdAt,
    updatedAt,
    createdBy,
  };
}

export function classifyBtwMergeRisk({ targetType = 'session_context', thread = null, summary = '', rationale = '' } = {}) {
  const searchableText = `${cleanString(summary)} ${cleanString(rationale)}`;
  if (/(auth|token|secret|password|systemd|deploy|production|security|firewall|tailscale|config\.mjs|server\.mjs)/i.test(searchableText)) {
    return 'high';
  }
  if (targetType === 'pr_draft' || thread?.mode === 'fork' || thread?.isolation === 'worktree') {
    return 'medium';
  }
  return 'low';
}

export function buildBtwReply({ prompt = '', session = null, task = null, agent = null, mode = 'btw', turnCount = 1 } = {}) {
  const cleanPrompt = redactAndLimit(prompt, 400) || '（未提供具体问题）';
  const anchor = cleanString(
    session?.gitBranch || task?.worktreeBranch || session?.contextId || task?.contextId || 'mainline',
  ) || 'mainline';
  const revision = session?.revision ?? 1;
  const cleanMode = VALID_BTW_MODES.has(cleanString(mode)) ? cleanString(mode) : 'btw';
  const agentName = cleanString(agent?.name || task?.workerAgentName) || '主 Agent';
  const agentModel = cleanString(agent?.model || agent?.modelHint || task?.appliedModel) || 'auto';
  const safeTurnCount = normalizeNonNegativeInteger(turnCount) || 1;
  const isolationText = cleanMode === 'fork'
    ? '独立 worktree 与旁支分支承载，未污染主线上下文，也未改动主线文件'
    : '临时旁支会话只读引用主线锚点，未污染主线上下文，也未改动主线文件';

  const reply = [
    '**旁支速答（BTW）**',
    `- 主线锚点：\`${anchor}\`（rev.${revision}，只读）`,
    `- 隔离状态：${isolationText}`,
    `- 旁支轮次：${safeTurnCount} 轮；处理 Agent：${agentName}（${agentModel}）`,
    `- 你的问题：${cleanPrompt}`,
    '- 下一步：可在旁支内继续验证；结论就绪后提交合并审批，经人工批准后才会写回目标上下文。',
  ].join('\n');

  return redactText(reply);
}

export function buildBtwMergePatchPreview({ thread, session = null, task = null, targetType = 'session_context', summary = '', rationale = '' } = {}) {
  const cleanTargetType = VALID_MERGE_TARGETS.has(cleanString(targetType))
    ? cleanString(targetType)
    : 'session_context';
  const targetBranch = thread?.worktreeBranch || session?.gitBranch || task?.worktreeBranch || null;
  const anchor = cleanString(
    session?.gitBranch || task?.worktreeBranch || session?.contextId || task?.contextId || 'mainline',
  ) || 'mainline';
  const revision = session?.revision ?? 1;
  const threadId = cleanString(thread?.id) || 'side';
  const messageCount = Array.isArray(thread?.messages) ? thread.messages.length : 0;
  const cleanSummary = redactAndLimit(summary, 400) || '（未填写）';
  const cleanRationale = redactAndLimit(rationale, 1200) || '（未填写）';
  const patchPreview = redactText([
    '```diff',
    '--- a/mainline',
    `+++ b/${cleanTargetType}`,
    `@@ btw ${threadId} @@`,
    `# target: ${cleanTargetType}`,
    `# mainline: ${anchor} (rev.${revision}, read-only)`,
    `# side-chat turns: ${messageCount}`,
    `+ summary: ${cleanSummary}`,
    `+ rationale: ${cleanRationale}`,
    '+ 未写入主线，等待人工合并审批',
    '```',
  ].join('\n')).slice(0, 2400);

  const prDraftSpec = cleanTargetType === 'pr_draft'
    ? {
        branch: thread?.worktreeBranch || `btw/${threadId.replace(/[^a-zA-Z0-9._-]/g, '-')}`,
        baseBranch: session?.gitBranch || 'main',
        title: `btw: ${redactText(String(summary || '')).slice(0, 72)}`,
        body: patchPreview,
      }
    : null;

  return { patchPreview, targetBranch, prDraftSpec };
}

export function summarizeBtwStats(threads = []) {
  const stats = {
    total: 0,
    open: 0,
    pendingApproval: 0,
    approved: 0,
    merged: 0,
    rejected: 0,
    archived: 0,
    attentionCount: 0,
  };
  const threadList = Array.isArray(threads) ? threads : [];
  stats.total = threadList.length;

  for (const thread of threadList) {
    const status = cleanString(thread?.status);
    if (status === 'open') stats.open += 1;
    else if (status === 'pending_approval') stats.pendingApproval += 1;
    else if (status === 'approved') stats.approved += 1;
    else if (status === 'merged') stats.merged += 1;
    else if (status === 'rejected') stats.rejected += 1;
    else if (status === 'archived') stats.archived += 1;
  }

  stats.attentionCount = stats.pendingApproval + stats.approved;
  return stats;
}

export function buildDemoBtwThreads({ session = null, task = null, agent = null } = {}) {
  const createdAt = '2026-11-26T08:30:00.000Z';
  const updatedAt = '2026-11-26T08:36:00.000Z';
  const sessionId = cleanString(session?.id) || 'session-demo-mainline';
  const taskId = cleanNullableString(task?.id);
  const contextId = cleanString(session?.contextId || task?.contextId) || 'ctx-demo-btw';
  const targetAgentId = cleanString(agent?.id) || 'agent-demo-primary';
  const targetAgentName = cleanString(agent?.name) || 'Ops Console Agent';
  const model = cleanString(agent?.model || agent?.modelHint) || 'auto';
  const summary = '将旁支验证过的发布前健康检查口径合并回主会话上下文';
  const rationale = '旁支已验证检查项与只读探针边界，主线程无需中断；合并仅补充上下文，不触发任何生产变更。';

  const thread = {
    id: 'btw-demo-approval',
    sessionId,
    taskId,
    contextId,
    title: '旁支审批：发布前健康检查口径',
    mode: 'btw',
    status: 'pending_approval',
    isolation: 'ephemeral',
    worktreeBranch: null,
    forkedTaskId: null,
    targetAgentId,
    targetAgentName,
    model,
    mainlineRevisionAtOpen: normalizeNonNegativeInteger(session?.revision ?? 7),
    messages: [
      {
        id: 'btw-msg-demo-1',
        ts: createdAt,
        role: 'user',
        content: '在不打断主线的前提下，旁支能否先确认发布前健康检查应覆盖哪些只读项？',
        agentId: targetAgentId,
        agentName: targetAgentName,
        model,
        spillRefId: null,
      },
      {
        id: 'btw-msg-demo-2',
        ts: updatedAt,
        role: 'assistant',
        content: '建议先按只读检查清单确认：探针心跳、服务健康、最近告警与部署版本一致性。旁支未污染主线，结论可提交合并审批后再写回主会话上下文。',
        agentId: targetAgentId,
        agentName: targetAgentName,
        model,
        spillRefId: null,
      },
    ],
    mergeProposal: null,
    createdAt,
    updatedAt,
    createdBy: 'demo-operator',
  };

  const preview = buildBtwMergePatchPreview({
    thread,
    session,
    task,
    targetType: 'session_context',
    summary,
    rationale,
  });

  thread.mergeProposal = {
    id: 'btw-merge-demo-1',
    proposedAt: updatedAt,
    proposedBy: 'demo-operator',
    summary,
    rationale,
    targetType: 'session_context',
    targetSessionId: sessionId,
    targetTaskId: taskId,
    targetBranch: preview.targetBranch,
    patchPreview: preview.patchPreview,
    prDraftSpec: null,
    riskLevel: classifyBtwMergeRisk({ targetType: 'session_context', thread, summary, rationale }),
    status: 'pending',
    reviewedAt: null,
    reviewedBy: null,
    reviewComment: null,
    mergedAt: null,
    mergedRevision: null,
    mergedStepTs: null,
    spillRefId: null,
  };

  return [thread];
}
