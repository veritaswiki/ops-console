import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_PREFLIGHT_PRESETS,
  filterBoundariesByLayer,
  filterPitfallsByProject,
  formatAiContextClipboardPayload,
  getVerdictMeta,
} from './ai-governance';
import type { AiLayerBoundary, AiOpsContextResponse, AiPitfallRecord } from '../types';

const SAMPLE_PITFALLS: AiPitfallRecord[] = [
  {
    id: 'T3-01',
    project: 'T3 Code',
    repo: 'pingdotgg/t3code',
    category: 'worktree',
    severity: 'high',
    title: 'Worktree 漂移',
    pitfall: '动态新建 worktree 后 UI 绑定未跟随',
    mitigation: '单一真源分支校验',
    enforcedBy: 'POST /api/ai/preflight',
  },
  {
    id: 'ALMA-02',
    project: 'Alma',
    repo: 'yetone/alma',
    category: 'mcp',
    severity: 'high',
    title: 'MCP 工具过载',
    pitfall: '超过 40 工具准确率下降',
    mitigation: '分片绑定 boundMcpIds',
    enforcedBy: 'mcp-tool-ceiling',
  },
];

const SAMPLE_BOUNDARIES: AiLayerBoundary[] = [
  {
    id: 'config',
    layer: 'Config',
    label: '配置层',
    riskLevel: 'high',
    summary: '真源配置',
    paths: ['src/config.mjs'],
    rules: ['先校验'],
  },
  {
    id: 'logic',
    layer: 'Logic',
    label: '逻辑层',
    riskLevel: 'high',
    summary: '控制面逻辑',
    paths: ['src/server.mjs'],
    rules: ['禁 shell 拼接'],
  },
];

test('filterPitfallsByProject filters by project name and search query', () => {
  assert.equal(filterPitfallsByProject(SAMPLE_PITFALLS, 'all').length, 2);
  assert.equal(filterPitfallsByProject(SAMPLE_PITFALLS, 'T3 Code').length, 1);
  assert.equal(filterPitfallsByProject(SAMPLE_PITFALLS, 'all', '40 工具')[0]?.id, 'ALMA-02');
  assert.equal(filterPitfallsByProject(SAMPLE_PITFALLS, 'Codex').length, 0);
});

test('filterBoundariesByLayer filters by layer id or returns all', () => {
  assert.equal(filterBoundariesByLayer(SAMPLE_BOUNDARIES, 'all').length, 2);
  assert.equal(filterBoundariesByLayer(SAMPLE_BOUNDARIES, 'config')[0]?.layer, 'Config');
  assert.equal(filterBoundariesByLayer(SAMPLE_BOUNDARIES, 'Logic')[0]?.id, 'logic');
});

test('getVerdictMeta maps preflight verdicts to semantic statuses', () => {
  assert.equal(getVerdictMeta('allow').tone, 'healthy');
  assert.equal(getVerdictMeta('confirm_required').tone, 'degraded');
  assert.equal(getVerdictMeta('block').tone, 'failed');
});

test('formatAiContextClipboardPayload produces valid compact JSON and presets exist', () => {
  assert.ok(AI_PREFLIGHT_PRESETS.length >= 4);
  const ctx: AiOpsContextResponse = {
    ok: true,
    schemaVersion: 'ops-console.ai-context/v1',
    generatedAt: '2026-11-26T00:00:00.000Z',
    version: '0.4.0',
    mode: { demo: true, readOnly: false, authEnabled: false },
    liveSummary: {
      servicesTotal: 5,
      servicesHealthy: 5,
      criticalServices: ['magpie'],
      fleetNodesTotal: 3,
      fleetNodesOnline: 3,
      activeAlerts: 0,
      mcpServersTotal: 4,
      mcpToolsTotal: 18,
      mcpToolCeiling: 40,
      mcpToolCeilingExceeded: false,
      a2aLeadAgentId: 'codex-lead',
      a2aAgentsTotal: 4,
      a2aActiveTasks: 0,
      stalledTickets: 0,
      activeWorktrees: ['feat/test'],
    },
    boundaries: SAMPLE_BOUNDARIES,
    coupledRules: [
      {
        id: 'api-contract-sync',
        label: 'API 契约同步',
        triggers: ['src/server.mjs'],
        mustSync: ['web/types.ts'],
        verifyCommand: 'npm run lint',
      },
    ],
    invariants: ['execFile only'],
    pitfalls: SAMPLE_PITFALLS,
    worktreePolicy: {
      isolatedBranchRequired: true,
      protectedBranches: ['main'],
      ignoredWorktreeDirs: ['.worktrees/'],
      pruneCommand: 'git worktree prune',
    },
    verificationCommands: ['npm run lint'],
  };
  const serialized = formatAiContextClipboardPayload(ctx);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.version, '0.4.0');
  assert.equal(parsed.boundaries.length, 2);
  assert.equal(parsed.coupledRules[0].verifyCommand, 'npm run lint');
});
