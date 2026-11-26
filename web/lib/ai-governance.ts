import type {
  AiLayerBoundary,
  AiOpsContextResponse,
  AiPitfallRecord,
  AiPreflightVerdict,
} from '../types';

export interface AiPreflightPreset {
  id: string;
  label: string;
  description: string;
  payload: {
    actionType: 'code-patch' | 'service-action' | 'config-edit' | 'worktree-dispatch' | 'mcp-sync';
    target: string;
    summary: string;
    worktreeBranch: string;
    files: string[];
    command?: string;
    mcpToolsCount?: number;
    dirtyMainCheckout?: boolean;
    rawConfigJson?: string;
  };
}

export const AI_PREFLIGHT_PRESETS: AiPreflightPreset[] = [
  {
    id: 'safe-worktree-patch',
    label: '安全 Worktree 补丁',
    description: '隔离分支改动逻辑与单测，验证全部护栏放行。',
    payload: {
      actionType: 'code-patch',
      target: 'web/lib/ai-governance.ts',
      summary: '在独立 Worktree 分支补充纯函数过滤逻辑并配套单元测试',
      worktreeBranch: 'feat/ai-preflight-polish',
      files: ['web/lib/ai-governance.ts', 'web/lib/ai-governance.test.ts'],
    },
  },
  {
    id: 'critical-service-restart',
    label: '关键服务重启 (需二次确认)',
    description: '演示未携带 confirmToken 重启核心网关时的 confirm_required 拦截。',
    payload: {
      actionType: 'service-action',
      target: 'magpie-gateway.service',
      summary: '重启核心模型网关以刷新上游超时配置',
      worktreeBranch: '',
      files: [],
    },
  },
  {
    id: 'mcp-overload-sync',
    label: 'MCP 工具膨胀与版本联动',
    description: '触发 >40 工具上限预警（Alma 教训）与 SemVer 耦合文件同步提醒。',
    payload: {
      actionType: 'mcp-sync',
      target: 'node-tokyo-edge',
      summary: '向东京边缘节点批量同步 48 个 MCP 工具并升级版本',
      worktreeBranch: 'feat/mcp-sync-batch',
      files: ['package.json'],
      mcpToolsCount: 48,
    },
  },
  {
    id: 'unsafe-worktree-gitlink',
    label: '高危 Gitlink 与未锁定 npx 拦截',
    description: '触发 Claude Code .claude/worktrees 污染、Codex 越界路径与 Alma MCPhantom 拦截。',
    payload: {
      actionType: 'mcp-sync',
      target: 'local-hub',
      summary: '在主分支直接提交残留 worktree 并拉取未固定版本 npx 包',
      worktreeBranch: 'main',
      files: ['.claude/worktrees/exp-01/README.md', '../outside.env'],
      command: 'npx -y legacy-unmaintained-mcp-server',
      dirtyMainCheckout: true,
    },
  },
];

export function filterPitfallsByProject(
  pitfalls: AiPitfallRecord[],
  projectFilter: string,
  query = '',
): AiPitfallRecord[] {
  const normalizedProject = projectFilter.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();

  return pitfalls.filter((item) => {
    if (normalizedProject && normalizedProject !== 'all') {
      if (item.project.toLowerCase() !== normalizedProject) return false;
    }
    if (!normalizedQuery) return true;
    const hay = `${item.id} ${item.project} ${item.title} ${item.pitfall} ${item.mitigation} ${item.enforcedBy}`.toLowerCase();
    return hay.includes(normalizedQuery);
  });
}

export function filterBoundariesByLayer(
  boundaries: AiLayerBoundary[],
  layerFilter: string,
): AiLayerBoundary[] {
  const normalized = layerFilter.trim().toLowerCase();
  if (!normalized || normalized === 'all') return boundaries;
  return boundaries.filter((item) => item.id.toLowerCase() === normalized || item.layer.toLowerCase() === normalized);
}

export function getVerdictMeta(verdict: AiPreflightVerdict): {
  label: string;
  tone: 'healthy' | 'degraded' | 'failed';
  summary: string;
} {
  if (verdict === 'block') {
    return {
      label: '拦截阻止 (Block)',
      tone: 'failed',
      summary: '命中硬性安全或仓库污染红线，必须按下方整改项修复后才可继续。',
    };
  }
  if (verdict === 'confirm_required') {
    return {
      label: '需二次确认 (Confirm)',
      tone: 'degraded',
      summary: '涉及关键基础设施或高影响配置，需签发一次性 confirmToken 并确认回滚路径。',
    };
  }
  return {
    label: '允许放行 (Allow)',
    tone: 'healthy',
    summary: '已通过沙箱路径、密钥脱敏与隔离策略校验，可按建议命令完成验证。',
  };
}

export function formatAiContextClipboardPayload(context: AiOpsContextResponse): string {
  const compact = {
    schemaVersion: context.schemaVersion,
    version: context.version,
    mode: context.mode,
    liveSummary: context.liveSummary,
    boundaries: context.boundaries.map((b) => ({
      layer: b.layer,
      riskLevel: b.riskLevel,
      paths: b.paths,
      rules: b.rules,
    })),
    coupledRules: context.coupledRules.map((r) => ({
      label: r.label,
      mustSync: r.mustSync,
      verifyCommand: r.verifyCommand,
    })),
    invariants: context.invariants,
    worktreePolicy: context.worktreePolicy,
    verificationCommands: context.verificationCommands,
  };
  return JSON.stringify(compact, null, 2);
}
