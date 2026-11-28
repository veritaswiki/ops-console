import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  GitBranch,
  Layers,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type { AiOpsContextResponse, AiPreflightResponse } from '../types';
import { fetchAiOpsContext, runAiPreflight } from '../api';
import {
  AI_PREFLIGHT_PRESETS,
  filterBoundariesByLayer,
  filterPitfallsByProject,
  formatAiContextClipboardPayload,
  getVerdictMeta,
} from '../lib/ai-governance';
import { cn, FOCUS_RING } from '../lib/cn';
import {
  Button,
  CopyAction,
  EmptyState,
  inputBaseClass,
  KpiStrip,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  WidgetSkeleton,
} from './ui';

const LAYER_OPTIONS = [
  { value: 'all', label: '全部层级' },
  { value: 'config', label: 'Config 配置' },
  { value: 'logic', label: 'Logic 逻辑' },
  { value: 'data', label: 'Data 数据' },
  { value: 'ui', label: 'UI 视图' },
] as const;

const PROJECT_OPTIONS = [
  { value: 'all', label: '全部项目' },
  { value: 'T3 Code', label: 'T3 Code' },
  { value: 'Orca', label: 'Orca' },
  { value: 'Alma', label: 'Alma' },
  { value: 'Claude Code', label: 'Claude Code' },
  { value: 'Codex', label: 'Codex' },
] as const;

const ACTION_TYPE_OPTIONS = [
  { value: 'code-patch', label: '代码补丁 (code-patch)' },
  { value: 'worktree-dispatch', label: 'Worktree 派发 (worktree-dispatch)' },
  { value: 'service-action', label: '服务控制 (service-action)' },
  { value: 'config-edit', label: '配置变更 (config-edit)' },
  { value: 'mcp-sync', label: 'MCP 同步 (mcp-sync)' },
] as const;

function checkStatusTone(status: string): 'healthy' | 'degraded' | 'failed' {
  if (status === 'block') return 'failed';
  if (status === 'confirm_required' || status === 'warn') return 'degraded';
  return 'healthy';
}

function checkStatusLabel(status: string): string {
  if (status === 'block') return '拦截';
  if (status === 'confirm_required') return '需确认';
  if (status === 'warn') return '预警';
  return '通过';
}

export function AiGovernanceSection({
  readOnly = false,
  onToast,
}: {
  readOnly?: boolean;
  onToast?: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [context, setContext] = React.useState<AiOpsContextResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [layerFilter, setLayerFilter] = React.useState<string>('all');
  const [projectFilter, setProjectFilter] = React.useState<string>('all');
  const [pitfallQuery, setPitfallQuery] = React.useState('');

  // Preflight form state
  const [activePresetId, setActivePresetId] = React.useState<string>('safe-worktree-patch');
  const [actionType, setActionType] = React.useState<string>('code-patch');
  const [target, setTarget] = React.useState('web/lib/ai-governance.ts');
  const [worktreeBranch, setWorktreeBranch] = React.useState('feat/ai-preflight-polish');
  const [filesInput, setFilesInput] = React.useState('web/lib/ai-governance.ts, web/lib/ai-governance.test.ts');
  const [commandInput, setCommandInput] = React.useState('');
  const [summaryInput, setSummaryInput] = React.useState('在独立 Worktree 分支补充纯函数过滤逻辑并配套单元测试');
  const [mcpToolsInput, setMcpToolsInput] = React.useState<string>('');
  const [dirtyMainCheckout, setDirtyMainCheckout] = React.useState(false);
  const [preflightBusy, setPreflightBusy] = React.useState(false);
  const [preflightResult, setPreflightResult] = React.useState<AiPreflightResponse | null>(null);

  const loadContext = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await fetchAiOpsContext(signal);
      if (!signal?.aborted) setContext(data);
    } catch (err) {
      if (!signal?.aborted) {
        onToast?.(`加载 AI 契约上下文失败：${(err as Error).message}`, 'err');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onToast]);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadContext(controller.signal);
    return () => controller.abort();
  }, [loadContext]);

  const executePreflight = React.useCallback(async (override?: {
    actionType: string;
    target: string;
    summary: string;
    worktreeBranch: string;
    files: string[];
    command?: string;
    mcpToolsCount?: number;
    dirtyMainCheckout?: boolean;
  }) => {
    setPreflightBusy(true);
    try {
      const files = override
        ? override.files
        : filesInput.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const parsedTools = override?.mcpToolsCount !== undefined
        ? override.mcpToolsCount
        : (mcpToolsInput.trim() ? Number(mcpToolsInput.trim()) : undefined);

      const res = await runAiPreflight({
        actionType: override ? override.actionType : actionType,
        target: override ? override.target : target,
        summary: override ? override.summary : summaryInput,
        worktreeBranch: override ? override.worktreeBranch : worktreeBranch,
        files,
        command: override ? (override.command || '') : commandInput,
        mcpToolsCount: Number.isFinite(parsedTools) ? parsedTools : undefined,
        dirtyMainCheckout: override ? Boolean(override.dirtyMainCheckout) : dirtyMainCheckout,
      });
      setPreflightResult(res);
    } catch (err) {
      onToast?.(`预检执行失败：${(err as Error).message}`, 'err');
    } finally {
      setPreflightBusy(false);
    }
  }, [actionType, commandInput, dirtyMainCheckout, filesInput, mcpToolsInput, onToast, summaryInput, target, worktreeBranch]);

  const applyPreset = (presetId: string) => {
    const preset = AI_PREFLIGHT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setActionType(preset.payload.actionType);
    setTarget(preset.payload.target);
    setSummaryInput(preset.payload.summary);
    setWorktreeBranch(preset.payload.worktreeBranch);
    setFilesInput(preset.payload.files.join(', '));
    setCommandInput(preset.payload.command || '');
    setMcpToolsInput(preset.payload.mcpToolsCount != null ? String(preset.payload.mcpToolsCount) : '');
    setDirtyMainCheckout(Boolean(preset.payload.dirtyMainCheckout));
    void executePreflight(preset.payload);
  };

  const filteredBoundaries = React.useMemo(
    () => filterBoundariesByLayer(context?.boundaries || [], layerFilter),
    [context?.boundaries, layerFilter],
  );

  const filteredPitfalls = React.useMemo(
    () => filterPitfallsByProject(context?.pitfalls || [], projectFilter, pitfallQuery),
    [context?.pitfalls, projectFilter, pitfallQuery],
  );

  if (loading && !context) {
    return <WidgetSkeleton heightClass="h-[520px]" label="正在加载 AI 运维契约与踩坑防线数据" />;
  }

  if (!context) {
    return (
      <Panel title="AI 契约与护栏">
        <EmptyState
          title="未能获取 AI 运维上下文"
          message="请检查控制面 /api/ai/context 接口是否可达。"
          action={{ label: '重新加载', onClick: () => void loadContext() }}
        />
      </Panel>
    );
  }

  const live = context.liveSummary;
  const mcpRatioPct = live.mcpToolCeiling > 0
    ? Math.min(100, Math.round((live.mcpToolsTotal / live.mcpToolCeiling) * 100))
    : 0;
  const verdictMeta = preflightResult ? getVerdictMeta(preflightResult.verdict) : null;

  return (
    <div className="space-y-6" data-testid="ai-governance-section">
      <KpiStrip
        asymmetric
        cells={[
          {
            label: '控制面契约版本与安全姿态',
            meta: context.schemaVersion,
            value: `v${context.version}`,
            sub: `${context.mode.readOnly || readOnly ? '只读拦截开启' : '受控读写模式'} · ${live.criticalServices.length} 个关键服务受 Token 保护`,
            tone: context.mode.readOnly ? 'warn' : 'ok',
          },
          {
            label: '已固化行业调度防线',
            value: `${context.pitfalls.length} 项`,
            numeric: { primary: context.pitfalls.length, suffix: ' 项' },
            sub: 'T3 / Orca / Alma / Claude / Codex',
            tone: 'ok',
          },
          {
            label: '活跃 MCP 工具水位',
            meta: `建议上限 ${live.mcpToolCeiling}`,
            value: `${live.mcpToolsTotal} / ${live.mcpToolCeiling}`,
            ratioPct: mcpRatioPct,
            sub: live.mcpToolCeilingExceeded ? '超 40 工具上限，建议按角色分片' : '处于高准确率工具曝光区间',
            tone: live.mcpToolCeilingExceeded ? 'warn' : 'ok',
          },
          {
            label: '活跃 Worktree 与停滞工单',
            value: `${live.activeWorktrees.length} 分支`,
            numeric: { primary: live.activeWorktrees.length, suffix: ' 分支' },
            sub: live.stalledTickets > 0
              ? `${live.stalledTickets} 个停滞工单待 Watchdog 回收`
              : `${live.a2aAgentsTotal} 个 A2A 节点正常协同`,
            tone: live.stalledTickets > 0 ? 'warn' : 'ok',
          },
        ]}
      />

      {/* Interactive Preflight Dry-Run Gate */}
      <Panel
        title="AI 变更预检门禁 (Preflight Dry-Run)"
        description="让外部 AI 在修改服务、配置、代码或同步 MCP 前先调用 POST /api/ai/preflight：确定性输出放行/确认/拦截判定、耦合文件提醒与回滚路径，防止改乱。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CopyAction
              testId="copy-ai-context-btn"
              variant="button"
              size="sm"
              text={() => formatAiContextClipboardPayload(context)}
              label="复制 AI 运维上下文 JSON"
              copiedLabel="已复制 JSON"
              onCopied={() =>
                onToast?.('已复制压缩版 AI 运维上下文 JSON（可直接贴给 Codex / Claude / T3 / Orca）', 'ok')
              }
              onError={() => onToast?.('复制失败，请检查剪贴板权限', 'err')}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadContext()}
              aria-label="刷新 AI 契约上下文"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} strokeWidth={1.75} />
              刷新
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Scenario Presets */}
          <div className="space-y-2">
            <div className="text-[12px] font-medium text-[var(--ink-subtle)]">
              典型实战场景一键压测（点击即向后端执行真实预检）
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {AI_PREFLIGHT_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`preflight-preset-${preset.id}`}
                    aria-pressed={isSelected}
                    onClick={() => applyPreset(preset.id)}
                    className={cn(
                      'text-left p-3 rounded-lg border transition-[background-color,border-color] duration-150 ease-out cursor-pointer',
                      isSelected
                        ? 'border-[var(--accent)]/60 bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]',
                      FOCUS_RING,
                    )}
                  >
                    <div className="text-[13px] font-medium text-[var(--ink)]">{preset.label}</div>
                    <p className="mt-1 text-[12px] text-[var(--ink-subtle)] leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Preflight Input Form */}
            <form
              className="lg:col-span-6 space-y-3.5 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/60"
              onSubmit={(e) => {
                e.preventDefault();
                void executePreflight();
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[12px] font-medium text-[var(--ink-muted)]">变更类型 (actionType)</span>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    aria-label="变更类型"
                    className={cn('h-9 w-full px-2.5', inputBaseClass)}
                  >
                    {ACTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[12px] font-medium text-[var(--ink-muted)]">目标对象 (target)</span>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="如 magpie-gateway.service 或 src/server.mjs"
                    className={cn('h-9 w-full px-2.5 font-mono text-[12.5px]', inputBaseClass)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[12px] font-medium text-[var(--ink-muted)]">Worktree 隔离分支</span>
                  <input
                    type="text"
                    value={worktreeBranch}
                    onChange={(e) => setWorktreeBranch(e.target.value)}
                    placeholder="如 feat/ops-guard"
                    className={cn('h-9 w-full px-2.5 font-mono text-[12.5px]', inputBaseClass)}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[12px] font-medium text-[var(--ink-muted)]">MCP 工具总数（可选覆盖）</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={mcpToolsInput}
                    onChange={(e) => setMcpToolsInput(e.target.value)}
                    placeholder={`默认实时值 (${live.mcpToolsTotal})`}
                    className={cn('h-9 w-full px-2.5 font-mono text-[12.5px] tabular-nums', inputBaseClass)}
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-[var(--ink-muted)]">涉及文件清单（逗号或换行分隔）</span>
                <input
                  type="text"
                  value={filesInput}
                  onChange={(e) => setFilesInput(e.target.value)}
                  placeholder="package.json, src/server.mjs"
                  className={cn('h-9 w-full px-2.5 font-mono text-[12.5px]', inputBaseClass)}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-[var(--ink-muted)]">变更摘要 (summary)</span>
                <input
                  type="text"
                  value={summaryInput}
                  onChange={(e) => setSummaryInput(e.target.value)}
                  placeholder="描述本次 AI 变更意图"
                  className={cn('h-9 w-full px-2.5 text-[13px]', inputBaseClass)}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-[var(--ink-muted)]">附带命令（可选，用于检测未锁定 npx 与凭据）</span>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="如 npx -y <mcp-package> 或留空"
                  className={cn('h-9 w-full px-2.5 font-mono text-[12.5px]', inputBaseClass)}
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-[12.5px] text-[var(--ink-muted)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dirtyMainCheckout}
                    onChange={(e) => setDirtyMainCheckout(e.target.checked)}
                    className="rounded border-[var(--border-strong)] accent-[var(--accent)]"
                  />
                  模拟主工作区存在未提交改动 (Dirty Checkout)
                </label>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={preflightBusy}
                  data-testid="run-preflight-btn"
                >
                  <Play className="size-3.5" strokeWidth={1.75} />
                  {preflightBusy ? '预检评估中...' : '执行 AI 变更预检'}
                </Button>
              </div>
            </form>

            {/* Preflight Result Panel */}
            <div
              className="lg:col-span-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4 min-h-[280px]"
              data-testid="preflight-result-card"
            >
              {!preflightResult || !verdictMeta ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-2">
                  <ShieldCheck className="size-7 text-[var(--ink-subtle)]" strokeWidth={1.5} />
                  <div className="text-[13.5px] font-medium text-[var(--ink)]">
                    等待执行 AI 预检门禁
                  </div>
                  <p className="text-[12.5px] text-[var(--ink-subtle)] max-w-sm">
                    选择上方任意实战场景或填写表单后点击「执行 AI 变更预检」，查看确定性风险判定、耦合文件提醒与回滚策略。
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusIndicator status={verdictMeta.tone} label={verdictMeta.label} />
                        <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
                          爆炸半径：{preflightResult.blastRadius.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-[var(--ink-muted)]">{verdictMeta.summary}</p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-[11px] text-[var(--ink-subtle)]">安全分</div>
                      <div className="text-[20px] font-semibold leading-tight text-[var(--ink)]">
                        {preflightResult.safetyScore}
                      </div>
                    </div>
                  </div>

                  <ul className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
                    {preflightResult.checks.map((item) => (
                      <li key={item.id} className="py-2 first:pt-0 flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-[var(--ink)]">
                            {item.status === 'block' ? (
                              <ShieldAlert className="size-3.5 text-[var(--err)] shrink-0" strokeWidth={1.75} />
                            ) : item.status === 'warn' || item.status === 'confirm_required' ? (
                              <AlertTriangle className="size-3.5 text-[var(--warn)] shrink-0" strokeWidth={1.75} />
                            ) : (
                              <CheckCircle2 className="size-3.5 text-[var(--ok)] shrink-0" strokeWidth={1.75} />
                            )}
                            <span>{item.title}</span>
                            {item.pitfallRef && (
                              <span className="font-mono text-[11px] text-[var(--ink-subtle)]">
                                [{item.pitfallRef}]
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[var(--ink-muted)] leading-relaxed">{item.detail}</p>
                        </div>
                        <div className="shrink-0">
                          <StatusIndicator status={checkStatusTone(item.status)} label={checkStatusLabel(item.status)} />
                        </div>
                      </li>
                    ))}
                  </ul>

                  {preflightResult.coupledFiles.length > 0 && (
                    <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink)]">
                        <FileCode2 className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                        必须同步核对的耦合文件（防改乱）
                      </div>
                      <div className="font-mono text-[11.5px] text-[var(--ink-muted)] leading-relaxed break-all">
                        {preflightResult.coupledFiles.join(' · ')}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-[var(--ink)]">
                        <GitBranch className="size-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                        回滚预案
                      </div>
                      <p className="text-[var(--ink-muted)] leading-relaxed">{preflightResult.rollbackPlan}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-[var(--ink)]">
                        <Terminal className="size-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                        必跑校验命令
                      </div>
                      <div className="font-mono text-[11.5px] text-[var(--ink-muted)] space-y-0.5">
                        {preflightResult.recommendedCommands.map((cmd) => (
                          <div key={cmd} className="truncate" title={cmd}>
                            $ {cmd}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Logic / Data / Config / UI 4-Layer Architecture & Coupled Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Panel
          className="lg:col-span-7"
          title="Logic / Data / Config / UI 四层职责边界"
          description="与根 AGENTS.md 强一致：清晰划分配置真源、逻辑引擎、数据持久化与前端视图，让 AI 精准定位改动范围不越界。"
          actions={
            <SegmentedFilter
              value={layerFilter}
              onChange={setLayerFilter}
              options={LAYER_OPTIONS}
              ariaLabel="按架构分层筛选边界规范"
            />
          }
        >
          <div className="divide-y divide-[var(--border-subtle)]">
            {filteredBoundaries.map((layer) => (
              <div key={layer.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
                    <span className="font-mono text-[13px] font-semibold text-[var(--ink)]">
                      {layer.layer}
                    </span>
                    <span className="text-[13px] font-medium text-[var(--ink-muted)]">{layer.label}</span>
                  </div>
                  <StatusIndicator
                    status={layer.riskLevel === 'high' ? 'degraded' : 'healthy'}
                    label={layer.riskLevel === 'high' ? '高影响层级' : '标准受控层'}
                  />
                </div>
                <p className="text-[12.5px] text-[var(--ink-muted)]">{layer.summary}</p>
                <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] leading-relaxed">
                  核心目录：{layer.paths.join(' · ')}
                </div>
                <ul className="space-y-1 text-[12.5px] text-[var(--ink-muted)] list-disc pl-4">
                  {layer.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          className="lg:col-span-5"
          title="强耦合文件矩阵与硬性红线"
          description="改动左侧触发域时必须同步校验右侧文件，避免版本漂移、类型失配或安全回归。"
        >
          <div className="space-y-4">
            <div className="divide-y divide-[var(--border-subtle)]">
              {context.coupledRules.map((rule) => (
                <div key={rule.id} className="py-3 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-[var(--ink)]">{rule.label}</span>
                    <span className="font-mono text-[11px] text-[var(--accent)]">{rule.verifyCommand}</span>
                  </div>
                  <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] leading-relaxed break-all">
                    同步清单：{rule.mustSync.join(' · ')}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
              <div className="text-[12.5px] font-medium text-[var(--ink)]">硬性工程红线（Hard Invariants）</div>
              <ul className="space-y-1.5 text-[12px] text-[var(--ink-muted)] list-disc pl-4">
                {context.invariants.map((inv) => (
                  <li key={inv}>{inv}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </div>

      {/* X & GitHub AI Scheduling Pitfalls Library */}
      <Panel
        title="X / GitHub 热门 AI 调度项目踩坑记录与 v0.4.0 内置防线"
        description="复盘 T3 Code、Orca、Alma、Claude Code 与 OpenAI Codex 真实更新日志及社区高发踩坑，全部沉淀为可执行门禁。"
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedFilter
              value={projectFilter}
              onChange={setProjectFilter}
              options={PROJECT_OPTIONS}
              ariaLabel="按 AI 调度项目筛选踩坑记录"
            />
            <div className="relative w-full sm:w-48">
              <Search
                className="size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={pitfallQuery}
                onChange={(e) => setPitfallQuery(e.target.value)}
                placeholder="搜索踩坑或防线..."
                aria-label="搜索 AI 调度踩坑记录"
                className={cn('h-9 sm:h-8 w-full pl-8 pr-2.5', inputBaseClass)}
              />
            </div>
          </div>
        }
      >
        {filteredPitfalls.length === 0 ? (
          <EmptyState
            title="未匹配到踩坑记录"
            message="请调整项目筛选条件或清空关键词。"
            action={{
              label: '重置筛选',
              onClick: () => {
                setProjectFilter('all');
                setPitfallQuery('');
              },
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="pitfalls-table">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 sm:pl-6 pr-3 whitespace-nowrap">编号 / 项目</th>
                  <th className="py-2.5 px-3">真实踩坑与根因</th>
                  <th className="py-2.5 px-3">Ops Console v0.4.0 应对防线</th>
                  <th className="py-2.5 pl-3 pr-5 sm:pr-6 whitespace-nowrap">落点校验</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
                {filteredPitfalls.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out align-top"
                  >
                    <td className="py-3 pl-5 sm:pl-6 pr-3 whitespace-nowrap">
                      <div className="font-mono text-[12px] font-semibold text-[var(--ink)]">{item.id}</div>
                      <div className="text-[12px] text-[var(--ink-muted)]">{item.project}</div>
                      <div className="mt-1">
                        <StatusIndicator
                          status={item.severity === 'high' ? 'failed' : 'degraded'}
                          label={item.severity === 'high' ? '高危' : '中危'}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 min-w-[260px]">
                      <div className="font-medium text-[var(--ink)]">{item.title}</div>
                      <p className="mt-0.5 text-[var(--ink-muted)] leading-relaxed">{item.pitfall}</p>
                    </td>
                    <td className="py-3 px-3 min-w-[260px] text-[var(--ink-muted)] leading-relaxed">
                      {item.mitigation}
                    </td>
                    <td className="py-3 pl-3 pr-5 sm:pr-6 font-mono text-[11.5px] text-[var(--ink-subtle)] whitespace-nowrap">
                      {item.enforcedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
