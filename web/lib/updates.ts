import type {
  UpdateHistoryRecord,
  UpdateLayer,
  UpdatePlan,
  UpdateStrategy,
} from '../types';

export const UPDATE_LAYER_LABELS: Record<UpdateLayer, string> = {
  frontend: '前端资源',
  backend: '后端核心',
  plugins: '外部插件',
  deps: '运行依赖',
  config: '配置与部署',
  probe: '边缘探针',
  docs: '文档与测试',
  'agent-declarative': '声明式 Agent',
  'module-hot-swap': '热切模块',
};

export const UPDATE_STRATEGY_META: Record<
  UpdateStrategy,
  { label: string; tone: 'ok' | 'warn' | 'idle'; detail: string }
> = {
  noop: {
    label: '已是最新',
    tone: 'idle',
    detail: '当前工作副本与远端分支保持一致，无需拉取。',
  },
  'hot-reload': {
    label: '零停机热重载',
    tone: 'ok',
    detail: '仅含前端静态资产、插件或声明式配置变更，拉取后即时热生效，不中断后端连接。',
  },
  'hot-reload-with-build': {
    label: '增量构建 + 热重载',
    tone: 'ok',
    detail: '按需增量编译前端或同步依赖，随后清空静态缓存并热推送客户端刷新。',
  },
  'module-hot-swap': {
    label: '独立模块热切换',
    tone: 'ok',
    detail: '仅变更独立可热切模块，由模块宿主双槽位热切换，微内核无需重启。',
  },
  'rolling-restart': {
    label: '增量拉取 + 平滑重启',
    tone: 'warn',
    detail: '包含后端核心逻辑变更，增量拉取后需通过平滑重启或 supervisor 接管生效。',
  },
};

export interface ActiveLayerCount {
  layer: UpdateLayer;
  label: string;
  count: number;
}

export function listActiveLayers(plan: UpdatePlan | null | undefined): ActiveLayerCount[] {
  if (!plan || !plan.counts) return [];
  const order: UpdateLayer[] = [
    'frontend',
    'plugins',
    'agent-declarative',
    'module-hot-swap',
    'config',
    'deps',
    'backend',
    'probe',
    'docs',
  ];
  return order
    .filter((layer) => Number(plan.counts[layer] || 0) > 0)
    .map((layer) => ({
      layer,
      label: UPDATE_LAYER_LABELS[layer],
      count: Number(plan.counts[layer] || 0),
    }));
}

export interface RollbackCandidate {
  commit: string;
  shortCommit: string;
  ts: string;
  kind: string;
  label: string;
}

export function extractRollbackCandidates(
  history: UpdateHistoryRecord[],
  currentCommit: string | null | undefined,
): RollbackCandidate[] {
  const seen = new Set<string>();
  if (currentCommit) seen.add(currentCommit);
  const out: RollbackCandidate[] = [];

  for (const item of history) {
    const candidates = [
      item.fromCommit ? { commit: item.fromCommit, label: `${item.kind} 前版本` } : null,
      item.toCommit ? { commit: item.toCommit, label: `${item.kind} 目标版本` } : null,
    ];
    for (const candidate of candidates) {
      if (!candidate || !candidate.commit || seen.has(candidate.commit)) continue;
      seen.add(candidate.commit);
      out.push({
        commit: candidate.commit,
        shortCommit: candidate.commit.slice(0, 8),
        ts: item.ts,
        kind: item.kind,
        label: candidate.label,
      });
    }
  }
  return out.slice(0, 8);
}

export interface HotUpdateNotice {
  kind: 'assets' | 'restarting' | 'module' | 'pr';
  message: string;
  revision?: string;
  canReloadPage: boolean;
}

export function parseHotUpdateSseEvent(
  eventType: string,
  rawData: string,
  currentAssetsRevision: string | null | undefined,
): HotUpdateNotice | null {
  let parsed: Record<string, unknown> = {};
  try {
    const envelope = JSON.parse(rawData || '{}') as Record<string, unknown>;
    parsed = (envelope.payload && typeof envelope.payload === 'object'
      ? envelope.payload
      : envelope) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  if (eventType === 'assets_updated') {
    const rev = String(parsed.revision || '');
    if (!rev || (currentAssetsRevision && rev === currentAssetsRevision)) return null;
    return {
      kind: 'assets',
      revision: rev,
      message: `前端构建资源已热更新（rev ${rev.slice(0, 8)}），点击立即无感刷新。`,
      canReloadPage: true,
    };
  }

  if (eventType === 'server_restarting') {
    const commit = parsed.commit ? ` (${String(parsed.commit)})` : '';
    return {
      kind: 'restarting',
      message: `控制面后端正在平滑重启${commit}，等待重新就绪后自动恢复连接…`,
      canReloadPage: false,
    };
  }

  if (eventType === 'module_reloaded') {
    const moduleId = String(parsed.moduleId || 'module');
    const rev = parsed.revision ? ` · ${String(parsed.revision).slice(0, 8)}` : '';
    return {
      kind: 'module',
      revision: parsed.revision ? String(parsed.revision) : undefined,
      message: `模块「${moduleId}」已完成热切换${rev}。`,
      canReloadPage: false,
    };
  }

  if (eventType === 'pr_applied') {
    const prNum = parsed.prNumber ? `PR #${String(parsed.prNumber)}` : 'PR 增量更新';
    const restart = Boolean(parsed.restartRequired);
    return {
      kind: 'pr',
      message: restart
        ? `${prNum} 已增量拉取，待平滑重启后端生效。`
        : `${prNum} 已通过热更新实时生效。`,
      canReloadPage: !restart,
    };
  }

  return null;
}
