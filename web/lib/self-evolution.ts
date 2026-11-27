import type {
  AgentModulesStateResponse,
  EvolutionFilePatchInput,
  EvolutionProposal,
  EvolutionProposalStatus,
  HotSwapModuleEntry,
} from '../types';

export type EvolutionTone = 'ok' | 'warn' | 'err' | 'info' | 'muted';

export interface EvolutionStatusMeta {
  label: string;
  tone: EvolutionTone;
  detail: string;
}

export const EVOLUTION_STATUS_META: Record<EvolutionProposalStatus, EvolutionStatusMeta> = {
  preflight_checked: {
    label: '预检完成',
    tone: 'info',
    detail: '已完成 AI 安全预检与变更分层评估，待创建隔离沙箱。',
  },
  sandbox_ready: {
    label: '沙箱就绪',
    tone: 'info',
    detail: '补丁已写入独立 Git Worktree 沙箱，待执行语法与契约验证。',
  },
  verified: {
    label: '验证通过',
    tone: 'ok',
    detail: '沙箱语法、模块契约与安全校验通过，可发布 PR 或直接热切生效。',
  },
  pr_opened: {
    label: 'PR 已发布',
    tone: 'info',
    detail: '已提交变更分支并生成 PR，可按分层策略热切或增量拉取生效。',
  },
  applied: {
    label: '已生效',
    tone: 'ok',
    detail: '变更已生效至运行态，保留快照以支持一键原子回滚。',
  },
  failed: {
    label: '失败',
    tone: 'err',
    detail: '沙箱验证未通过或执行中断，请查看错误详情后重新准备沙箱。',
  },
  rolled_back: {
    label: '已回滚',
    tone: 'warn',
    detail: '已原子回滚至变更前版本并恢复运行态。',
  },
};

export const EVOLUTION_PIPELINE_STAGES = [
  { key: 'preflight', label: '预检' },
  { key: 'sandbox', label: '沙箱' },
  { key: 'verify', label: '验证' },
  { key: 'pr', label: 'PR' },
  { key: 'apply', label: '生效' },
] as const;

export type EvolutionPipelineStageKey = (typeof EVOLUTION_PIPELINE_STAGES)[number]['key'];

export function getProposalStageIndex(status: EvolutionProposalStatus): number {
  switch (status) {
    case 'preflight_checked':
      return 0;
    case 'sandbox_ready':
      return 1;
    case 'verified':
    case 'failed':
      return 2;
    case 'pr_opened':
      return 3;
    case 'applied':
    case 'rolled_back':
      return 4;
    default:
      return 0;
  }
}

export interface ProposalAvailableActions {
  canSandbox: boolean;
  canVerify: boolean;
  canPublishPr: boolean;
  canApply: boolean;
  canRollback: boolean;
  canCleanup: boolean;
}

export function getAvailableProposalActions(
  proposal: EvolutionProposal,
): ProposalAvailableActions {
  const hasActiveSandbox = Boolean(proposal.sandbox && !proposal.sandbox.cleanedAt);
  const hasFilePatches = Array.isArray(proposal.filePatches) && proposal.filePatches.length > 0;
  const isPreflightBlocked = proposal.preflight?.verdict === 'block';
  const isTerminal = proposal.status === 'applied' || proposal.status === 'rolled_back';
  const isDeliveryReady = proposal.status === 'verified' || proposal.status === 'pr_opened';

  return {
    canSandbox: !isPreflightBlocked && hasFilePatches && !isTerminal,
    canVerify: hasActiveSandbox && !isTerminal,
    canPublishPr: isDeliveryReady && hasActiveSandbox,
    canApply: isDeliveryReady,
    canRollback: proposal.status === 'applied' && Boolean(proposal.canRollback),
    canCleanup: hasActiveSandbox,
  };
}

export interface ModuleHostSummary {
  totalModules: number;
  healthyModules: number;
  rollbackReadyCount: number;
  totalSwaps: number;
  failedSwaps: number;
  declarativeCount: number;
}

export function summarizeModuleHost(
  state: AgentModulesStateResponse | null,
): ModuleHostSummary {
  if (!state) {
    return {
      totalModules: 0,
      healthyModules: 0,
      rollbackReadyCount: 0,
      totalSwaps: 0,
      failedSwaps: 0,
      declarativeCount: 0,
    };
  }

  const modules = Array.isArray(state.modules) ? state.modules : [];
  const declarativeItems = Array.isArray(state.declarativeItems) ? state.declarativeItems : [];
  const summary = state.summary;

  const summaryDeclarative =
    Number(summary?.totalDeclarativeAgents || 0) + Number(summary?.totalDeclarativeSkills || 0);

  return {
    totalModules: summary?.totalModules ?? modules.length,
    healthyModules: summary?.healthyModules ?? modules.filter((mod) => mod.healthy).length,
    rollbackReadyCount: modules.filter((mod) => mod.canRollback).length,
    totalSwaps:
      summary?.totalSwaps
      ?? modules.reduce((total, mod) => total + Number(mod.swapCount || 0), 0),
    failedSwaps:
      summary?.failedSwaps
      ?? modules.reduce((total, mod) => total + Number(mod.failedSwaps || 0), 0),
    declarativeCount: summaryDeclarative > 0 ? summaryDeclarative : declarativeItems.length,
  };
}

export function formatModuleSlotLabel(mod: HotSwapModuleEntry): string {
  const activeSlot = mod.activeSlot || 'A';
  const standbySlot = mod.standbySlot || (activeSlot === 'A' ? 'B' : 'A');
  const normalizedVersion = mod.version
    ? `v${String(mod.version).replace(/^v/i, '')}`
    : 'v0.0.0';
  const revisionText = mod.revision ? String(mod.revision).slice(0, 16) : 'unloaded';
  const standbyText = mod.canRollback
    ? `备槽 ${standbySlot} 可回滚`
    : mod.slots?.[standbySlot]
      ? `备槽 ${standbySlot} 就绪`
      : `备槽 ${standbySlot} 空`;

  return `Slot ${activeSlot} (${normalizedVersion} · ${revisionText}) · ${standbyText}`;
}

export interface EvolutionSampleTemplate {
  id: string;
  label: string;
  description: string;
  title: string;
  branch: string;
  baseBranch: string;
  goal: string;
  filePatches: EvolutionFilePatchInput[];
}

export function buildSampleEvolutionTemplates(): EvolutionSampleTemplate[] {
  const hotModuleContent = [
    'export const manifest = {',
    "  id: 'ops-diagnostics',",
    "  name: 'Ops Diagnostics Hot Module',",
    "  version: '1.1.0',",
    "  description: '零停机双槽位巡检与热切换诊断模块，新增内存与事件循环遥测字段。',",
    "  capabilities: ['diagnostics', 'health-probe', 'hot-swap', 'telemetry'],",
    "  layer: 'module-hot-swap',",
    '};',
    '',
    'let initializedAt = null;',
    'let invocationCount = 0;',
    '',
    'export async function init() {',
    '  initializedAt = new Date().toISOString();',
    '  invocationCount = 0;',
    '  return { ok: true, initializedAt };',
    '}',
    '',
    'export async function health() {',
    '  return {',
    '    ok: true,',
    '    detail: `slot-ready (v${manifest.version}, invocations=${invocationCount})`,',
    '    initializedAt,',
    '  };',
    '}',
    '',
    'export async function handle(input = {}, ctx = {}) {',
    '  invocationCount += 1;',
    "  const mode = String(input?.mode || 'summary').trim().toLowerCase();",
    '  const memUsage = process.memoryUsage();',
    '  return {',
    '    moduleId: manifest.id,',
    '    version: manifest.version,',
    '    mode,',
    '    invocationCount,',
    '    initializedAt,',
    '    slot: ctx.slot || null,',
    '    revision: ctx.revision || null,',
    '    ts: new Date().toISOString(),',
    '    checks: {',
    "      hotSwapHost: 'healthy',",
    '      processUptimeSec: Math.round(process.uptime()),',
    '      heapUsedMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10,',
    '      rssMb: Math.round((memUsage.rss / 1024 / 1024) * 10) / 10,',
    '    },',
    '  };',
    '}',
    '',
    'export async function dispose() {',
    '  return { ok: true, disposedInvocations: invocationCount };',
    '}',
    '',
  ].join('\n');

  const declarativeManifestContent = `${JSON.stringify(
    {
      id: 'decl-ops-triage',
      name: 'Ops Triage Declarative Agent',
      harness: 'custom-a2a',
      nodeId: 'hub-primary',
      agentCardUrl: 'http://127.0.0.1:9109/.well-known/agent-card.json',
      rpcUrl: 'http://127.0.0.1:9109/a2a',
      modelHint: 'gpt-5-mini',
      reasoningEffort: 'medium',
      skills: [
        'ops-triage',
        'log-audit',
        'hot-reload-check',
        'self-evolution-check',
      ],
      description:
        '声明式运维巡检与自进化预检 Agent，修改本 JSON 后可零停机热同步至 A2A 编排器。',
      enabled: true,
    },
    null,
    2,
  )}\n`;

  return [
    {
      id: 'hot-swap-diagnostics',
      label: '热切诊断模块 (v1.1.0)',
      description: '升级 ops-diagnostics.mjs 版本与内存遥测，演示零停机双槽位热切换。',
      title: 'Upgrade ops-diagnostics hot module telemetry to v1.1.0',
      branch: 'feat/evolve-ops-diagnostics-telemetry',
      baseBranch: 'main',
      goal: '在 ops-diagnostics 模块中补充堆内存与 RSS 遥测指标，通过沙箱校验后零停机热切生效。',
      filePatches: [
        {
          path: 'src/agent-modules/ops-diagnostics.mjs',
          op: 'write',
          content: hotModuleContent,
        },
      ],
    },
    {
      id: 'declarative-ops-triage',
      label: '声明式 Agent 技能扩容',
      description: '更新 agents/ops-triage.agent.json 清单并零停机同步至 A2A 编排器。',
      title: 'Extend ops-triage declarative agent skills',
      branch: 'feat/evolve-ops-triage-agent',
      baseBranch: 'main',
      goal: '为声明式巡检 Agent 补充 self-evolution-check 技能并热同步到 A2A 注册表。',
      filePatches: [
        {
          path: 'agents/ops-triage.agent.json',
          op: 'write',
          content: declarativeManifestContent,
        },
      ],
    },
  ];
}
