import test from 'node:test';
import assert from 'node:assert/strict';
import type { A2AAgentPeer, A2ATaskRecord, LinearIssueItem } from '../types';
import {
  buildCompactThreadSummary,
  buildConversationThread,
  computeAgentWorkloads,
  describeAgentRole,
  extractAtMention,
  filterAgentTasks,
  filterSlashCommands,
  groupAgentsByNode,
  groupIssuesForSimpleBoard,
  groupTasksByLifecycle,
  isAgentOnline,
  KANBAN_LIFECYCLE_COLUMNS,
  kanbanColumnToTaskState,
  mapStatusToSimpleColumn,
  parseSlashInput,
  pickUpcomingTasks,
  resolveAgentByToken,
  shortAgentName,
  SIMPLE_BOARD_COLUMNS,
  SLASH_COMMANDS,
  taskStateToKanbanColumn,
} from './agent-console';

function makeIssue(overrides: Partial<LinearIssueItem>): LinearIssueItem {
  return {
    id: overrides.id || 'iss-1',
    identifier: overrides.identifier || 'OPS-1',
    title: overrides.title || 'Sample Task',
    description: '',
    status: overrides.status || 'todo',
    priority: overrides.priority || 'medium',
    projectId: 'proj-1',
    cycleId: 'cycle-1',
    parentId: null,
    blockedBy: [],
    assigneeType: 'agent',
    assigneeId: overrides.assigneeId || 'a2a-hub-codex-lead',
    assigneeName: overrides.assigneeName || 'Codex',
    commanderId: 'a2a-hub-codex-lead',
    labels: [],
    estimate: 2,
    worktreeBranch: null,
    linkedTaskId: null,
    github: null,
    sourceBotId: null,
    createdAt: '2026-11-26T00:00:00Z',
    updatedAt: '2026-11-26T00:00:00Z',
  };
}

test('mapStatusToSimpleColumn collapses 6 Linear statuses into 4 crisp workflow columns', () => {
  assert.equal(SIMPLE_BOARD_COLUMNS.length, 4);
  assert.equal(mapStatusToSimpleColumn('triage'), 'queued');
  assert.equal(mapStatusToSimpleColumn('backlog'), 'queued');
  assert.equal(mapStatusToSimpleColumn('todo'), 'queued');
  assert.equal(mapStatusToSimpleColumn('in_progress'), 'in_progress');
  assert.equal(mapStatusToSimpleColumn('in_review'), 'in_review');
  assert.equal(mapStatusToSimpleColumn('done'), 'done');
  assert.equal(mapStatusToSimpleColumn('canceled'), null);
});

test('groupIssuesForSimpleBoard bubbles triage first and sorts by priority weight', () => {
  const issues: LinearIssueItem[] = [
    makeIssue({ id: '1', status: 'backlog', priority: 'urgent' }),
    makeIssue({ id: '2', status: 'triage', priority: 'low' }),
    makeIssue({ id: '3', status: 'todo', priority: 'high' }),
    makeIssue({ id: '4', status: 'in_progress', priority: 'medium' }),
    makeIssue({ id: '5', status: 'done', priority: 'high' }),
    makeIssue({ id: '6', status: 'canceled', priority: 'urgent' }),
  ];

  const grouped = groupIssuesForSimpleBoard(issues);
  assert.deepEqual(
    grouped.queued.map((i) => i.id),
    ['2', '1', '3'],
  );
  assert.equal(grouped.in_progress.length, 1);
  assert.equal(grouped.done.length, 1);
});

test('computeAgentWorkloads tracks current, next, review, and done tasks per Agent', () => {
  const agents = [
    { id: 'a1', name: 'Codex Lead', harness: 'codex-cli', role: 'lead', status: 'online', modelHint: 'gpt-5-codex' },
    { id: 'a2', name: 'Claude Worker', harness: 'claude-code', role: 'worker', status: 'online', modelHint: 'claude-sonnet-4-6' },
  ];
  const issues = [
    makeIssue({ id: 'i1', assigneeId: 'a1', status: 'in_progress', priority: 'urgent' }),
    makeIssue({ id: 'i2', assigneeId: 'a1', status: 'todo', priority: 'high' }),
    makeIssue({ id: 'i3', assigneeId: 'a2', status: 'in_review', priority: 'medium' }),
    makeIssue({ id: 'i4', assigneeId: 'a2', status: 'done', priority: 'low' }),
  ];

  const workloads = computeAgentWorkloads(agents, issues);
  assert.equal(workloads[0].currentIssues.length, 1);
  assert.equal(workloads[0].nextIssues.length, 1);
  assert.equal(workloads[1].reviewIssues.length, 1);
  assert.equal(workloads[1].doneCount, 1);

  const upcoming = pickUpcomingTasks(issues, 3);
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].id, 'i2');

  assert.match(describeAgentRole({ role: 'lead', harness: 'codex-cli' }), /总指挥/);
  assert.match(describeAgentRole({ role: 'worker', harness: 'claude-code' }), /主力开发/);
});

test('isAgentOnline and shortAgentName normalize agent status and display labels', () => {
  assert.equal(isAgentOnline('healthy'), true);
  assert.equal(isAgentOnline('online'), true);
  assert.equal(isAgentOnline('offline'), false);
  assert.equal(shortAgentName('Codex CLI (主控 Harness)'), 'Codex CLI');
  assert.equal(shortAgentName('Claude Code（架构与 UI 专家）'), 'Claude Code');
  assert.equal(shortAgentName(''), 'Agent');
});

function makePeer(overrides: Partial<A2AAgentPeer>): A2AAgentPeer {
  return {
    id: overrides.id || 'a2a-hub-codex',
    name: overrides.name || 'Codex CLI (主控)',
    harness: overrides.harness || 'codex-cli',
    nodeId: overrides.nodeId || 'hub-primary',
    nodeName: overrides.nodeName || 'Hub Primary',
    role: overrides.role || 'worker',
    delegatable: overrides.delegatable ?? true,
    status: overrides.status || 'online',
    protocolVersion: overrides.protocolVersion || '0.3',
    modelHint: overrides.modelHint ?? 'gpt-5-codex',
    skills: overrides.skills || [],
    boundMcpIds: overrides.boundMcpIds || [],
  };
}

function makeTask(overrides: Partial<A2ATaskRecord>): A2ATaskRecord {
  return {
    id: overrides.id || 'a2a-task-1',
    contextId: overrides.contextId,
    parentTaskId: overrides.parentTaskId ?? null,
    slashCommand: overrides.slashCommand ?? null,
    protocolMethod: overrides.protocolMethod || 'message/send',
    executionMode: overrides.executionMode || 'lead-router',
    state: overrides.state || 'completed',
    prompt: overrides.prompt || '检查探针状态',
    leadAgentId: overrides.leadAgentId || 'a2a-hub-codex',
    leadAgentName: overrides.leadAgentName || 'Codex CLI',
    leadNodeId: overrides.leadNodeId || 'hub-primary',
    workerAgentId: overrides.workerAgentId || 'a2a-hub-claude',
    workerAgentName: overrides.workerAgentName || 'Claude Code',
    workerNodeId: overrides.workerNodeId || 'hub-primary',
    appliedModel: overrides.appliedModel || 'claude-sonnet-4-6',
    appliedEffort: overrides.appliedEffort || 'high',
    worktreeBranch: overrides.worktreeBranch ?? null,
    createdAt: overrides.createdAt || '2026-11-27T01:00:00Z',
    updatedAt: overrides.updatedAt || '2026-11-27T01:01:00Z',
    durationMs: overrides.durationMs ?? 1200,
    steps: overrides.steps || [],
    artifact: overrides.artifact,
  };
}

test('SLASH_COMMANDS exposes all 15 required commands with valid metadata', () => {
  const expectedNames = [
    '/help',
    '/agent',
    '/model',
    '/effort',
    '/mode',
    '/plan',
    '/worktree',
    '/board',
    '/tasks',
    '/status',
    '/ping',
    '/handoff',
    '/btw',
    '/compact',
    '/clear',
  ];
  assert.equal(SLASH_COMMANDS.length, expectedNames.length);
  assert.deepEqual(
    SLASH_COMMANDS.map((cmd) => cmd.name),
    expectedNames,
  );
  for (const cmd of SLASH_COMMANDS) {
    assert.ok(cmd.usage.startsWith(cmd.name));
    assert.ok(cmd.description.length > 0);
    assert.ok(cmd.shortcutHint.length > 0);
  }
});

test('parseSlashInput parses commands, args, rest, and ignores plain text or filesystem paths', () => {
  assert.deepEqual(parseSlashInput('检查服务状态'), {
    isSlash: false,
    command: null,
    args: [],
    rest: '检查服务状态',
    raw: '检查服务状态',
  });

  assert.deepEqual(parseSlashInput('/'), {
    isSlash: true,
    command: null,
    args: [],
    rest: '',
    raw: '/',
  });

  const worktreeParsed = parseSlashInput('  /Worktree feat/kanban-ui  优化拖拽看板体验 ');
  assert.equal(worktreeParsed.isSlash, true);
  assert.equal(worktreeParsed.command, '/worktree');
  assert.deepEqual(worktreeParsed.args, ['feat/kanban-ui', '优化拖拽看板体验']);
  assert.equal(worktreeParsed.rest, 'feat/kanban-ui  优化拖拽看板体验');

  const pathParsed = parseSlashInput('/usr/local/bin/node --version');
  assert.equal(pathParsed.isSlash, false);
  assert.equal(pathParsed.command, null);
});

test('filterSlashCommands ranks exact, prefix, and description matches cleanly', () => {
  assert.equal(filterSlashCommands('').length, SLASH_COMMANDS.length);

  const exactPing = filterSlashCommands('/ping');
  assert.equal(exactPing[0]?.name, '/ping');

  const prefixMo = filterSlashCommands('mo');
  assert.deepEqual(
    prefixMo.slice(0, 2).map((cmd) => cmd.name),
    ['/model', '/mode'],
  );

  const byDescription = filterSlashCommands('worktree');
  assert.equal(byDescription[0]?.name, '/worktree');
});

test('extractAtMention and resolveAgentByToken support autocomplete and automatic target routing', () => {
  const peers: A2AAgentPeer[] = [
    makePeer({
      id: 'a2a-hub-codex',
      name: 'Codex CLI (主控)',
      nodeId: 'hub-primary',
      nodeName: 'Hub Primary',
      role: 'lead',
      status: 'online',
      modelHint: 'gpt-5-codex',
    }),
    makePeer({
      id: 'a2a-mac-pi',
      name: 'Pi Agent (终端)',
      harness: 'pi-agent',
      nodeId: 'workstation-mac',
      nodeName: 'MacBook Air',
      status: 'online',
      modelHint: 'claude-sonnet-4-6',
    }),
    makePeer({
      id: 'a2a-edge-gemini',
      name: 'Gemini Auditor',
      harness: 'gemini-cli',
      nodeId: 'edge-tokyo',
      nodeName: 'Tokyo Edge',
      status: 'offline',
      modelHint: 'gemini-4-neon',
    }),
  ];

  const bareAt = extractAtMention('@', peers);
  assert.equal(bareAt.hasMention, true);
  assert.equal(bareAt.activeQuery, '');
  assert.equal(bareAt.activeStartIndex, 0);
  assert.equal(bareAt.candidates.length, 3);
  assert.equal(bareAt.candidates[0]?.id, 'a2a-hub-codex');

  const nodeAutocomplete = extractAtMention('检查 @mac', peers);
  assert.equal(nodeAutocomplete.hasMention, true);
  assert.equal(nodeAutocomplete.activeQuery, 'mac');
  assert.equal(nodeAutocomplete.activeStartIndex, 3);
  assert.equal(nodeAutocomplete.candidates[0]?.id, 'a2a-mac-pi');

  const prefixRoute = extractAtMention('@a2a-mac-pi 运行前端单元测试', peers);
  assert.equal(prefixRoute.matchedAgent?.id, 'a2a-mac-pi');
  assert.equal(prefixRoute.matchedToken, '@a2a-mac-pi');
  assert.equal(prefixRoute.cleanedPrompt, '运行前端单元测试');

  const nodeRoute = extractAtMention('@edge-tokyo 审计防火墙', peers);
  assert.equal(nodeRoute.matchedAgent?.id, 'a2a-edge-gemini');
  assert.equal(nodeRoute.cleanedPrompt, '审计防火墙');

  const inlineRoute = extractAtMention('让 @workstation-mac 复核构建结果', peers);
  assert.equal(inlineRoute.matchedAgent?.id, 'a2a-mac-pi');
  assert.equal(inlineRoute.cleanedPrompt, '让 @workstation-mac 复核构建结果');

  const emailText = extractAtMention('通知 ops@example.com 查看报告', peers);
  assert.equal(emailText.hasMention, false);
  assert.equal(emailText.matchedAgent, null);

  assert.equal(resolveAgentByToken('pi-agent', peers)?.id, 'a2a-mac-pi');
});

test('filterAgentTasks supports multi-term case-insensitive filtering across task metadata', () => {
  const tasks: A2ATaskRecord[] = [
    makeTask({
      id: 'a2a-task-101',
      contextId: 'ctx-ui-kanban',
      prompt: '优化拖拽看板交互与键盘导航',
      workerAgentName: 'Claude Code',
      workerNodeId: 'hub-primary',
      appliedModel: 'claude-opus-4-6',
      worktreeBranch: 'feat/kanban-dnd',
      state: 'working',
    }),
    makeTask({
      id: 'a2a-task-102',
      contextId: 'ctx-probe-sync',
      prompt: '检查东京节点心跳延迟',
      workerAgentName: 'Pi Agent',
      workerNodeId: 'workstation-mac',
      appliedModel: 'gpt-5-codex',
      worktreeBranch: 'ops/probe-fix',
      state: 'completed',
    }),
  ];

  assert.equal(filterAgentTasks(tasks, '').length, 2);
  assert.deepEqual(
    filterAgentTasks(tasks, 'a2a-task-101').map((task) => task.id),
    ['a2a-task-101'],
  );
  assert.deepEqual(
    filterAgentTasks(tasks, 'workstation-mac codex').map((task) => task.id),
    ['a2a-task-102'],
  );
  assert.deepEqual(
    filterAgentTasks(tasks, 'feat/kanban-dnd WORKING').map((task) => task.id),
    ['a2a-task-101'],
  );
  assert.equal(filterAgentTasks(tasks, 'nonexistent-term').length, 0);
});

test('Kanban lifecycle grouping maps states into 4 columns and sorts by updatedAt descending', () => {
  assert.deepEqual(
    KANBAN_LIFECYCLE_COLUMNS.map((col) => col.id),
    ['pending', 'working', 'done', 'failed'],
  );
  assert.equal(kanbanColumnToTaskState('pending'), 'submitted');
  assert.equal(kanbanColumnToTaskState('working'), 'working');
  assert.equal(kanbanColumnToTaskState('done'), 'completed');
  assert.equal(kanbanColumnToTaskState('failed'), 'failed');
  assert.equal(taskStateToKanbanColumn('canceled'), 'failed');

  const tasks: A2ATaskRecord[] = [
    makeTask({ id: 't-sub-old', state: 'submitted', updatedAt: '2026-11-27T01:00:00Z' }),
    makeTask({ id: 't-sub-new', state: 'submitted', updatedAt: '2026-11-27T02:00:00Z' }),
    makeTask({ id: 't-work', state: 'working', updatedAt: '2026-11-27T03:00:00Z' }),
    makeTask({ id: 't-done', state: 'completed', updatedAt: '2026-11-27T04:00:00Z' }),
    makeTask({ id: 't-fail', state: 'failed', updatedAt: '2026-11-27T05:00:00Z' }),
    makeTask({ id: 't-cancel', state: 'canceled', updatedAt: '2026-11-27T06:00:00Z' }),
  ];

  const grouped = groupTasksByLifecycle(tasks);
  assert.deepEqual(
    grouped.pending.map((task) => task.id),
    ['t-sub-new', 't-sub-old'],
  );
  assert.deepEqual(
    grouped.working.map((task) => task.id),
    ['t-work'],
  );
  assert.deepEqual(
    grouped.done.map((task) => task.id),
    ['t-done'],
  );
  assert.deepEqual(
    grouped.failed.map((task) => task.id),
    ['t-cancel', 't-fail'],
  );
});

test('buildConversationThread groups shared contextId chronologically and handles parent chains', () => {
  const tasks: A2ATaskRecord[] = [
    makeTask({ id: 't-2', contextId: 'ctx-alpha', createdAt: '2026-11-27T01:05:00Z' }),
    makeTask({ id: 't-1', contextId: 'ctx-alpha', createdAt: '2026-11-27T01:00:00Z' }),
    makeTask({ id: 't-other', contextId: 'ctx-beta', createdAt: '2026-11-27T01:02:00Z' }),
    makeTask({ id: 't-3', contextId: 'ctx-alpha', createdAt: '2026-11-27T01:10:00Z' }),
    makeTask({ id: 'p-1', createdAt: '2026-11-27T02:00:00Z' }),
    makeTask({ id: 'p-2', parentTaskId: 'p-1', createdAt: '2026-11-27T02:05:00Z' }),
  ];

  assert.deepEqual(buildConversationThread(tasks, null), []);
  assert.deepEqual(buildConversationThread(tasks, 'missing-id'), []);

  const alphaThread = buildConversationThread(tasks, 't-2');
  assert.deepEqual(
    alphaThread.map((task) => task.id),
    ['t-1', 't-2', 't-3'],
  );

  const parentChain = buildConversationThread(tasks, 'p-2');
  assert.deepEqual(
    parentChain.map((task) => task.id),
    ['p-1', 'p-2'],
  );

  const summary = buildCompactThreadSummary(alphaThread);
  assert.equal(summary.turnCount, 3);
  assert.equal(summary.contextId, 'ctx-alpha');
  assert.equal(summary.completedCount, 3);
});

test('groupAgentsByNode aggregates agents and online counts per node', () => {
  const groups = groupAgentsByNode([
    makePeer({ id: 'a1', nodeId: 'hub-primary', nodeName: 'Hub Primary', status: 'online' }),
    makePeer({ id: 'a2', nodeId: 'hub-primary', nodeName: 'Hub Primary', status: 'offline' }),
    makePeer({ id: 'a3', nodeId: 'workstation-mac', nodeName: 'MacBook Air', status: 'healthy' }),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.nodeId, 'hub-primary');
  assert.equal(groups[0]?.onlineCount, 1);
  assert.equal(groups[0]?.agents.length, 2);
  assert.equal(groups[1]?.nodeId, 'workstation-mac');
  assert.equal(groups[1]?.onlineCount, 1);
});

