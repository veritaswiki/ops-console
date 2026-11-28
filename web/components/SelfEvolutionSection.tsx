import React from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileCode2,
  FlaskConical,
  GitBranch,
  GitPullRequest,
  Layers,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import type {
  A2ABtwThread,
  AgentModuleInvokeResponse,
  AgentModulesStateResponse,
  EvolutionConfirmAction,
  EvolutionFilePatchInput,
  EvolutionProposal,
  EvolutionStateResponse,
  HotSwapModuleEntry,
  ToastHandler,
} from '../types';
import {
  applyEvolutionProposal,
  cleanupEvolutionSandbox,
  createEvolutionProposal,
  fetchA2AState,
  fetchAgentModules,
  fetchEvolutionProposals,
  invokeAgentModule,
  issueEvolutionConfirmToken,
  prepareEvolutionSandbox,
  publishEvolutionProposalPr,
  reloadAgentModules,
  reloadSingleAgentModule,
  rollbackEvolutionProposal,
  rollbackSingleAgentModule,
  syncDeclarativeAgents,
  verifyEvolutionProposal,
} from '../api';
import { cn } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import {
  buildSampleEvolutionTemplates,
  EVOLUTION_PIPELINE_STAGES,
  EVOLUTION_STATUS_META,
  formatModuleSlotLabel,
  getAvailableProposalActions,
  getProposalStageIndex,
  summarizeModuleHost,
  type EvolutionSampleTemplate,
  type EvolutionTone,
} from '../lib/self-evolution';
import { UPDATE_LAYER_LABELS, UPDATE_STRATEGY_META } from '../lib/updates';
import { formatDateTime } from '../utils/format';
import {
  Button,
  ConfirmAlertDialog,
  EmptyState,
  inputBaseClass,
  Panel,
  StatusIndicator,
  type ConfirmModalState,
} from './ui';

export interface SelfEvolutionSectionProps {
  readOnly: boolean;
  onToast: ToastHandler;
}

interface PatchDraftRow {
  key: string;
  path: string;
  op: 'write' | 'delete';
  content: string;
}

function EvolutionStatusBadge({ tone, label }: { tone: EvolutionTone; label: string }) {
  const dotClass =
    tone === 'ok'
      ? 'bg-[var(--ok-dot)]'
      : tone === 'warn'
        ? 'bg-[var(--warn-dot)]'
        : tone === 'err'
          ? 'bg-[var(--err-dot)]'
          : tone === 'info'
            ? 'bg-[var(--accent)]'
            : 'bg-[var(--muted-dot)]';
  const textClass =
    tone === 'ok'
      ? 'text-[var(--ok)]'
      : tone === 'warn'
        ? 'text-[var(--warn)]'
        : tone === 'err'
          ? 'text-[var(--err)]'
          : tone === 'info'
            ? 'text-[var(--accent)]'
            : 'text-[var(--ink-muted)]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap select-none',
        textClass,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass)} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function createPatchRow(seed?: Partial<EvolutionFilePatchInput>): PatchDraftRow {
  return {
    key: `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    path: seed?.path || '',
    op: seed?.op === 'delete' ? 'delete' : 'write',
    content: seed?.content || '',
  };
}

export function SelfEvolutionSection({ readOnly, onToast }: SelfEvolutionSectionProps) {
  const templates = React.useMemo(() => buildSampleEvolutionTemplates(), []);
  const [moduleState, setModuleState] = React.useState<AgentModulesStateResponse | null>(null);
  const [evolutionState, setEvolutionState] = React.useState<EvolutionStateResponse | null>(null);
  const [btwThreads, setBtwThreads] = React.useState<A2ABtwThread[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [invokeResults, setInvokeResults] = React.useState<Record<string, AgentModuleInvokeResponse>>({});
  const [confirmState, setConfirmState] = React.useState<ConfirmModalState | null>(null);

  const [composerOpen, setComposerOpen] = React.useState(false);
  const [selectedBtwId, setSelectedBtwId] = React.useState('');
  const [selectedSessionId, setSelectedSessionId] = React.useState('');
  const [selectedTaskId, setSelectedTaskId] = React.useState('');
  const [titleInput, setTitleInput] = React.useState('');
  const [branchInput, setBranchInput] = React.useState('');
  const [baseBranchInput, setBaseBranchInput] = React.useState('main');
  const [goalInput, setGoalInput] = React.useState('');
  const [patchRows, setPatchRows] = React.useState<PatchDraftRow[]>(() => [
    createPatchRow({ path: 'src/agent-modules/ops-diagnostics.mjs', op: 'write', content: '' }),
  ]);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [modulesRes, proposalsRes, a2aRes] = await Promise.all([
        fetchAgentModules(),
        fetchEvolutionProposals(),
        fetchA2AState().catch(() => null),
      ]);
      setModuleState(modulesRes);
      setEvolutionState(proposalsRes);
      if (a2aRes && Array.isArray(a2aRes.btwThreads)) {
        setBtwThreads(a2aRes.btwThreads);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : '加载自进化与模块宿主状态失败', 'err');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const moduleSummary = React.useMemo(() => summarizeModuleHost(moduleState), [moduleState]);

  const promotableBtwThreads = React.useMemo(
    () =>
      btwThreads.filter(
        (thread) =>
          Boolean(thread.mergeProposal?.prDraftSpec)
          || thread.mode === 'pr_draft'
          || thread.mergeProposal?.targetType === 'pr_draft',
      ),
    [btwThreads],
  );

  const applyTemplateToComposer = (tpl: EvolutionSampleTemplate) => {
    setSelectedBtwId('');
    setSelectedSessionId('');
    setSelectedTaskId('');
    setTitleInput(tpl.title);
    setBranchInput(tpl.branch);
    setBaseBranchInput(tpl.baseBranch);
    setGoalInput(tpl.goal);
    setPatchRows(tpl.filePatches.map((patch) => createPatchRow(patch)));
    setComposerOpen(true);
  };

  const handleSelectBtwThread = (threadId: string) => {
    setSelectedBtwId(threadId);
    if (!threadId) {
      setSelectedSessionId('');
      setSelectedTaskId('');
      return;
    }
    const matched = promotableBtwThreads.find((thread) => thread.id === threadId);
    if (!matched) return;
    const prDraft = matched.mergeProposal?.prDraftSpec;
    setSelectedSessionId(matched.sessionId || '');
    setSelectedTaskId(matched.taskId || '');
    setTitleInput(prDraft?.title || matched.title || '');
    setBranchInput(prDraft?.branch || matched.worktreeBranch || `feat/btw-${matched.id.slice(0, 12)}`);
    setBaseBranchInput(prDraft?.baseBranch || 'main');
    setGoalInput(matched.mergeProposal?.summary || prDraft?.body || matched.title || '');
  };

  const handleSyncDeclarative = async () => {
    if (guardReadOnly(readOnly, onToast, '同步助手清单')) return;
    setBusyKey('sync-declarative');
    try {
      const res = await syncDeclarativeAgents({ force: true, reason: 'manual-ui' });
      if (res.state) {
        setModuleState(res.state);
      } else {
        await loadAll();
      }
      onToast('配置化助手与技能清单已无中断同步', 'ok');
    } catch (err) {
      onToast(extractErrorMessage(err, '同步助手清单失败'), 'err');
    } finally {
      setBusyKey(null);
    }
  };

  const handleReloadAllModules = async () => {
    if (guardReadOnly(readOnly, onToast, '热更新全部模块')) return;
    setBusyKey('reload-all-modules');
    try {
      const res = await reloadAgentModules({
        force: true,
        syncDeclarative: true,
        reason: 'manual-ui',
      });
      if (res.state) {
        setModuleState(res.state);
      } else {
        await loadAll();
      }
      onToast('全部扩展模块已完成无中断热更新', 'ok');
    } catch (err) {
      onToast(extractErrorMessage(err, '热更新模块失败'), 'err');
    } finally {
      setBusyKey(null);
    }
  };

  const handleReloadSingleModule = async (mod: HotSwapModuleEntry) => {
    if (guardReadOnly(readOnly, onToast, `热更新模块 ${mod.id}`)) return;
    setBusyKey(`mod-reload:${mod.id}`);
    try {
      const res = await reloadSingleAgentModule(mod.id, { force: true, reason: 'manual-ui' });
      await loadAll();
      const revText = res.revision ? `（${res.revision}）` : '';
      onToast(`模块 ${mod.id} 已完成无中断热更新${revText}`, 'ok');
    } catch (err) {
      onToast(extractErrorMessage(err, `模块 ${mod.id} 热更新失败`), 'err');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRollbackSingleModule = (mod: HotSwapModuleEntry) => {
    if (guardReadOnly(readOnly, onToast, `回滚模块 ${mod.id}`)) return;
    if (!mod.canRollback) return;
    setConfirmState({
      open: true,
      title: `回滚模块「${mod.id}」到上一版本？`,
      description: '将切换回该模块上一次可用的运行版本，过程中不会中断其他模块服务。',
      confirmLabel: '确认回滚',
      danger: true,
      onConfirm: async () => {
        setBusyKey(`mod-rollback:${mod.id}`);
        try {
          const res = await rollbackSingleAgentModule(mod.id, { reason: 'manual-ui' });
          await loadAll();
          onToast(`模块 ${mod.id} 已回滚至上一版本（${res.revision}）`, 'ok');
        } catch (err) {
          onToast(extractErrorMessage(err, `模块 ${mod.id} 回滚失败`), 'err');
        } finally {
          setBusyKey(null);
        }
      },
    });
  };

  const handleInvokeModule = async (mod: HotSwapModuleEntry) => {
    setBusyKey(`mod-invoke:${mod.id}`);
    try {
      const res = await invokeAgentModule(mod.id, { mode: 'summary' });
      setInvokeResults((prev) => ({ ...prev, [mod.id]: res }));
      await loadAll();
      onToast(`模块 ${mod.id} 探测调用成功 (${res.durationMs}ms · Slot ${res.slot})`, 'ok');
    } catch (err) {
      onToast(err instanceof Error ? err.message : `模块 ${mod.id} 探测调用失败`, 'err');
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateProposal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guardReadOnly(readOnly, onToast, '创建自进化提案')) return;
    const cleanPatches: EvolutionFilePatchInput[] = patchRows
      .map((row) => ({
        path: row.path.trim(),
        op: row.op,
        content: row.op === 'delete' ? undefined : row.content,
      }))
      .filter((row) => row.path.length > 0);

    if (!titleInput.trim()) {
      onToast('请填写提案标题', 'err');
      return;
    }
    if (cleanPatches.length === 0) {
      onToast('请至少填写一个补丁文件路径', 'err');
      return;
    }

    setBusyKey('create-proposal');
    try {
      const res = await createEvolutionProposal({
        title: titleInput.trim(),
        goal: goalInput.trim() || titleInput.trim(),
        branch: branchInput.trim() || undefined,
        baseBranch: baseBranchInput.trim() || 'main',
        btwThreadId: selectedBtwId || undefined,
        sessionId: selectedSessionId || undefined,
        taskId: selectedTaskId || undefined,
        filePatches: cleanPatches,
      });
      await loadAll();
      setComposerOpen(false);
      const verdict = res.proposal.preflight?.verdict || 'allow';
      const strategyLabel =
        UPDATE_STRATEGY_META[res.proposal.plan.strategy]?.label || res.proposal.plan.strategy;
      onToast(
        `提案已创建（预检：${verdict === 'allow' ? '通过' : verdict === 'block' ? '拦截' : '需确认'} · 策略：${strategyLabel}）`,
        verdict === 'block' ? 'err' : 'ok',
      );
    } catch (err) {
      onToast(extractErrorMessage(err, '创建提案失败'), 'err');
    } finally {
      setBusyKey(null);
    }
  };

  const handlePrepareSandbox = async (proposal: EvolutionProposal) => {
    if (guardReadOnly(readOnly, onToast, '准备隔离沙箱')) return;
    setBusyKey(`sandbox:${proposal.id}`);
    try {
      await prepareEvolutionSandbox(proposal.id);
      await loadAll();
      onToast('独立沙箱分支已就绪', 'ok');
    } catch (err) {
      onToast(extractErrorMessage(err, '准备沙箱失败'), 'err');
    } finally {
      setBusyKey(null);
    }
  };

  const handleVerifyProposal = async (proposal: EvolutionProposal) => {
    if (guardReadOnly(readOnly, onToast, '运行沙箱校验')) return;
    setBusyKey(`verify:${proposal.id}`);
    try {
      const res = await verifyEvolutionProposal(proposal.id);
      await loadAll();
      onToast(
        res.verified
          ? '沙箱校验全部通过'
          : '沙箱校验未通过，请查看下方明细',
        res.verified ? 'ok' : 'err',
      );
    } catch (err) {
      onToast(extractErrorMessage(err, '沙箱验证失败'), 'err');
    } finally {
      setBusyKey(null);
    }
  };

  const handleCleanupSandbox = async (proposal: EvolutionProposal) => {
    if (guardReadOnly(readOnly, onToast, '清理隔离沙箱')) return;
    setBusyKey(`cleanup:${proposal.id}`);
    try {
      await cleanupEvolutionSandbox(proposal.id);
      await loadAll();
      onToast('隔离沙箱已清理', 'info');
    } catch (err) {
      onToast(extractErrorMessage(err, '清理沙箱失败'), 'err');
    } finally {
      setBusyKey(null);
    }
  };

  const openConfirmedProposalAction = (
    action: EvolutionConfirmAction,
    proposal: EvolutionProposal,
  ) => {
    if (guardReadOnly(readOnly, onToast, '执行提案变更')) return;
    const isPublish = action === 'publish-pr';
    const isApply = action === 'apply';
    const title = isPublish
      ? `发布 Pull Request · ${proposal.branch}`
      : isApply
        ? `${proposal.hotSwappable ? '应用热更新' : '应用增量更新'} · ${proposal.title}`
        : `回滚变更 · ${proposal.title}`;
    const description = isPublish
      ? `将在独立沙箱中提交分支 ${proposal.branch} 并创建合入 ${proposal.baseBranch} 的 PR（自动完成安全校验）。`
      : isApply
        ? proposal.hotSwappable
          ? `将写入 ${proposal.filePatches.length} 个模块补丁并执行无中断热更新，服务不重启且自动保留回滚快照。`
          : `该提案涉及核心分层变更，将按增量更新策略从 ${proposal.baseBranch} 拉取生效。`
        : '将把本次提案回滚至更新前版本，并重新同步受影响的模块与配置清单。';
    const confirmLabel = isPublish
      ? '确认发布 PR'
      : isApply
        ? proposal.hotSwappable
          ? '确认无中断更新'
          : '确认应用更新'
        : '确认回滚';

    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      danger: action === 'rollback' || (isApply && !proposal.hotSwappable),
      onConfirm: async () => {
        setBusyKey(`${action}:${proposal.id}`);
        try {
          const issued = await issueEvolutionConfirmToken(action);
          const confirmToken = issued.confirmToken;
          if (isPublish) {
            const res = await publishEvolutionProposalPr(proposal.id, { confirmToken });
            await loadAll();
            const prRef = res.proposal.pr?.number ? `PR #${res.proposal.pr.number}` : res.proposal.branch;
            onToast(`已发布 ${prRef}`, 'ok');
          } else if (isApply) {
            const res = await applyEvolutionProposal(proposal.id, {
              confirmToken,
              applyMode: 'auto',
            });
            await loadAll();
            onToast(
              res.mode === 'hot-swap'
                ? '变更已通过无中断热更新生效'
                : '变更已通过增量拉取生效',
              'ok',
            );
          } else {
            await rollbackEvolutionProposal(proposal.id, { confirmToken });
            await loadAll();
            onToast('提案已回滚并恢复运行状态', 'ok');
          }
        } catch (err) {
          onToast(extractErrorMessage(err, '执行提案操作失败'), 'err');
        } finally {
          setBusyKey(null);
        }
      },
    });
  };

  const updatePatchRow = (rowKey: string, patch: Partial<PatchDraftRow>) => {
    setPatchRows((prev) =>
      prev.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)),
    );
  };

  const removePatchRow = (rowKey: string) => {
    setPatchRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== rowKey)));
  };

  const proposals = evolutionState?.proposals || [];
  const proposalSummary = evolutionState?.summary;

  return (
    <div className="space-y-6" data-testid="self-evolution-section">
      <Panel
        title="扩展模块热更新与清单同步"
        description="支持模块无中断更新并在故障时自动保留旧版本；配置化助手与技能修改后可即时同步生效。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || busyKey !== null}
              onClick={() => void loadAll()}
            >
              <RefreshCw
                className={cn('size-3.5', loading && 'animate-spin')}
                strokeWidth={1.75}
              />
              刷新状态
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={readOnly || busyKey !== null}
              onClick={() => void handleSyncDeclarative()}
            >
              <Sparkles className="size-3.5" strokeWidth={1.75} />
              同步声明式 Agent
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={readOnly || busyKey !== null}
              onClick={() => void handleReloadAllModules()}
            >
              <Zap className="size-3.5" strokeWidth={1.75} />
              全量热切模块
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-[var(--border)] text-[12.5px]">
            <div className="space-y-1">
              <div className="text-[var(--ink-muted)]">活跃热切模块</div>
              <div className="font-mono font-medium tabular-nums text-[var(--ink)]">
                {moduleSummary.healthyModules}/{moduleSummary.totalModules} 健康
              </div>
              <div className="text-[11.5px] font-mono tabular-nums text-[var(--ink-muted)]">
                可回滚 {moduleSummary.rollbackReadyCount} · 代际 g{moduleState?.generation ?? 0}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[var(--ink-muted)]">无中断热更新次数</div>
              <div className="font-mono font-medium tabular-nums text-[var(--ink)]">
                成功 {moduleSummary.totalSwaps} · 失败保护 {moduleSummary.failedSwaps}
              </div>
              <div className="text-[11.5px] text-[var(--ink-muted)]">
                异常模块自动保留上一稳定版本
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[var(--ink-muted)]">声明式 Agent / Skills</div>
              <div className="font-mono font-medium tabular-nums text-[var(--ink)]">
                {moduleSummary.declarativeCount} 项
              </div>
              <div className="text-[11.5px] font-mono tabular-nums text-[var(--ink-muted)]">
                Agent {moduleState?.summary.totalDeclarativeAgents ?? 0} · Skill{' '}
                {moduleState?.summary.totalDeclarativeSkills ?? 0} · rev{' '}
                {moduleState?.declarativeRevision ?? 0}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[var(--ink-muted)]">宿主扫描路径</div>
              <div className="font-mono text-[12px] text-[var(--ink)] truncate">
                {(moduleState?.modulesDirs || []).join(', ') || 'src/agent-modules'}
              </div>
              <div className="text-[11.5px] font-mono text-[var(--ink-muted)] truncate">
                {(moduleState?.declarativeDirs || []).join(', ') || 'agents'}
              </div>
            </div>
          </div>

          {moduleState && moduleState.loadErrors.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3 space-y-1.5 text-[12px]">
              <div className="font-medium text-[var(--err)] flex items-center gap-1.5">
                <XCircle className="size-3.5 shrink-0" strokeWidth={1.75} />
                <span>最近模块加载错误（已保留旧槽）</span>
              </div>
              <div className="divide-y divide-[var(--border)] font-mono text-[11.5px]">
                {moduleState.loadErrors.map((loadErr, errIdx) => (
                  <div
                    key={`${loadErr.file}-${errIdx}`}
                    className="py-1.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="text-[var(--ink)]">{loadErr.file}</span>
                    <span className="text-[var(--err)]">{loadErr.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!moduleState?.modules.length ? (
            <EmptyState
              title="尚未发现扩展模块"
              message="在 src/agent-modules/ 目录添加标准扩展模块后，可在此查看运行状态并执行无中断热更新。"
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {moduleState.modules.map((mod) => {
                const standbyState = mod.slots?.[mod.standbySlot] || null;
                const invokeOutput = invokeResults[mod.id];
                return (
                  <div key={mod.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <StatusIndicator
                            status={mod.healthy ? 'healthy' : 'failed'}
                            label={mod.healthy ? '健康' : '异常'}
                          />
                          <span className="text-[13.5px] font-semibold text-[var(--ink)]">
                            {mod.name}
                          </span>
                          <span className="font-mono text-[12px] text-[var(--ink-muted)]">
                            {mod.id} · v{mod.version}
                          </span>
                          <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                            {mod.relPath}
                          </span>
                        </div>
                        {mod.description && (
                          <p className="m-0 text-[12.5px] text-[var(--ink-muted)]">
                            {mod.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!mod.hasHandler || busyKey !== null}
                          onClick={() => void handleInvokeModule(mod)}
                        >
                          <Play className="size-3.5 translate-x-[1px]" strokeWidth={1.75} />
                          探测调用
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || busyKey !== null}
                          onClick={() => void handleReloadSingleModule(mod)}
                        >
                          <Zap className="size-3.5" strokeWidth={1.75} />
                          热更新
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || !mod.canRollback || busyKey !== null}
                          onClick={() => handleRollbackSingleModule(mod)}
                        >
                          <RotateCcw className="size-3.5" strokeWidth={1.75} />
                          回滚版本
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-mono tabular-nums text-[var(--ink-muted)]">
                      <span className="text-[var(--ink)]">{formatModuleSlotLabel(mod)}</span>
                      <span>
                        备槽 {mod.standbySlot}：
                        {standbyState
                          ? `${standbyState.revision} (v${standbyState.version})`
                          : '空'}
                      </span>
                      <span>hash #{(mod.hash || '').slice(0, 8) || 'n/a'}</span>
                      <span>
                        热切 {mod.swapCount} · 失败 {mod.failedSwaps} · 调用 {mod.invocations}
                      </span>
                      {mod.lastSwappedAt && (
                        <span>最近切换 {formatDateTime(mod.lastSwappedAt)}</span>
                      )}
                    </div>

                    {mod.capabilities.length > 0 && (
                      <div className="text-[11.5px] font-mono text-[var(--ink-subtle)]">
                        能力：{mod.capabilities.join(' · ')}
                      </div>
                    )}

                    {mod.lastError && (
                      <div className="text-[12px] font-mono text-[var(--err)]">
                        最近错误：{mod.lastError}
                      </div>
                    )}

                    {invokeOutput && (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[11.5px] font-mono tabular-nums text-[var(--ink-muted)]">
                          <span>
                            探测结果 · Slot {invokeOutput.slot} · {invokeOutput.revision} ·{' '}
                            {invokeOutput.durationMs}ms
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setInvokeResults((prev) => {
                                const next = { ...prev };
                                delete next[mod.id];
                                return next;
                              })
                            }
                            className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                          >
                            收起
                          </button>
                        </div>
                        <pre className="m-0 max-h-[180px] overflow-auto font-mono text-[11.5px] leading-relaxed text-[var(--ink)]">
                          {JSON.stringify(invokeOutput.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border)] space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="font-medium text-[var(--ink)] inline-flex items-center gap-1.5">
                <Layers className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                声明式 Agent 与 Skill 清单
              </span>
              <span className="font-mono text-[11.5px] tabular-nums text-[var(--ink-muted)]">
                {moduleState?.declarativeItems.length ?? 0} 项
              </span>
            </div>

            {!moduleState?.declarativeItems.length ? (
              <p className="m-0 text-[12px] text-[var(--ink-muted)]">
                暂无声明式文件，可在 agents/*.agent.json 或 skills/*/SKILL.md 添加并热同步。
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)] text-[12px]">
                {moduleState.declarativeItems.map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="py-2 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                      <StatusIndicator
                        status={item.syncedToA2A ? 'healthy' : 'idle'}
                        label={item.syncedToA2A ? '已同步' : '待同步'}
                      />
                      <span className="font-medium text-[var(--ink)]">{item.name}</span>
                      <span className="font-mono text-[var(--ink-muted)]">
                        {item.kind} · {item.id} · v{item.version}
                      </span>
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                        {item.relPath}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] tabular-nums text-[var(--ink-muted)]">
                      {item.skills.length > 0 && (
                        <span>技能：{item.skills.join(' · ')}</span>
                      )}
                      <span>{formatDateTime(item.syncedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title="PR 驱动自进化流水线"
        description="所有模块与声明式演进先经 AI 安全预检，再进入独立 Git Worktree 沙箱验证与 PR 留痕，热切分层可零停机生效并原子回滚。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || busyKey !== null}
              onClick={() => void loadAll()}
            >
              <RefreshCw
                className={cn('size-3.5', loading && 'animate-spin')}
                strokeWidth={1.75}
              />
              刷新提案
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={readOnly}
              onClick={() => setComposerOpen((prev) => !prev)}
            >
              <Plus className="size-3.5" strokeWidth={1.75} />
              {composerOpen ? '收起提案编辑' : '新建自进化提案'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {proposalSummary && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-3 border-b border-[var(--border)] font-mono text-[12px] tabular-nums text-[var(--ink-muted)]">
              <span className="text-[var(--ink)]">总提案 {proposalSummary.total}</span>
              <span>可热切 {proposalSummary.hotSwappableCount}</span>
              <span>沙箱就绪 {proposalSummary.sandboxReady}</span>
              <span>验证通过 {proposalSummary.verified}</span>
              <span>PR 已发布 {proposalSummary.prOpened}</span>
              <span>已生效 {proposalSummary.applied}</span>
              <span>已回滚 {proposalSummary.rolledBack}</span>
              {proposalSummary.failed > 0 && (
                <span className="text-[var(--err)]">失败 {proposalSummary.failed}</span>
              )}
            </div>
          )}

          {composerOpen && (
            <form
              onSubmit={handleCreateProposal}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                <div className="text-[13px] font-medium text-[var(--ink)]">
                  创建自进化提案（自动执行 AI 预检与分层判定）
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {templates.map((tpl) => (
                    <Button
                      key={tpl.id}
                      variant="secondary"
                      size="sm"
                      onClick={() => applyTemplateToComposer(tpl)}
                    >
                      <FileCode2 className="size-3.5" strokeWidth={1.75} />
                      {tpl.label}
                    </Button>
                  ))}
                </div>
              </div>

              {promotableBtwThreads.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[12px] text-[var(--ink-muted)]">
                    从 BTW PR 草案线程晋升（可选）
                  </label>
                  <select
                    value={selectedBtwId}
                    onChange={(event) => handleSelectBtwThread(event.target.value)}
                    className={cn('w-full h-9 px-3', inputBaseClass)}
                  >
                    <option value="">不关联 BTW 线程（手工填写提案）</option>
                    {promotableBtwThreads.map((thread) => (
                      <option key={thread.id} value={thread.id}>
                        {thread.title} · {thread.mergeProposal?.prDraftSpec?.branch || thread.worktreeBranch || thread.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[12px] text-[var(--ink-muted)]">提案标题</label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(event) => setTitleInput(event.target.value)}
                    placeholder="例如：Upgrade ops-diagnostics hot module"
                    className={cn('w-full h-9 px-3', inputBaseClass)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] text-[var(--ink-muted)]">
                    特性分支（禁止 main/master）
                  </label>
                  <input
                    type="text"
                    value={branchInput}
                    onChange={(event) => setBranchInput(event.target.value)}
                    placeholder="feat/evolve-ops-diagnostics"
                    className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] text-[var(--ink-muted)]">基线分支</label>
                  <input
                    type="text"
                    value={baseBranchInput}
                    onChange={(event) => setBaseBranchInput(event.target.value)}
                    placeholder="main"
                    className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[12px] text-[var(--ink-muted)]">演进目标与影响范围</label>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(event) => setGoalInput(event.target.value)}
                  placeholder="简述本次热切或声明式变更目标"
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[var(--ink)]">
                    文件补丁列表（相对仓库根目录路径）
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPatchRows((prev) => [...prev, createPatchRow()])}
                  >
                    <Plus className="size-3.5" strokeWidth={1.75} />
                    添加补丁文件
                  </Button>
                </div>

                <div className="space-y-3">
                  {patchRows.map((row, rowIdx) => (
                    <div
                      key={row.key}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={row.path}
                          onChange={(event) =>
                            updatePatchRow(row.key, { path: event.target.value })
                          }
                          placeholder={`文件 #${rowIdx + 1}，例如 src/agent-modules/ops-diagnostics.mjs`}
                          className={cn('flex-1 min-w-[220px] h-8 px-2.5 font-mono', inputBaseClass)}
                        />
                        <select
                          value={row.op}
                          onChange={(event) =>
                            updatePatchRow(row.key, {
                              op: event.target.value === 'delete' ? 'delete' : 'write',
                            })
                          }
                          className={cn('h-8 px-2.5 font-mono', inputBaseClass)}
                        >
                          <option value="write">write</option>
                          <option value="delete">delete</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={patchRows.length <= 1}
                          onClick={() => removePatchRow(row.key)}
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.75} />
                          移除
                        </Button>
                      </div>

                      {row.op === 'write' && (
                        <textarea
                          rows={6}
                          value={row.content}
                          onChange={(event) =>
                            updatePatchRow(row.key, { content: event.target.value })
                          }
                          placeholder="粘贴完整目标文件内容（支持 ESM 热切模块或 JSON 声明式清单）"
                          className={cn(
                            'w-full p-2.5 font-mono text-[12px] leading-relaxed resize-y',
                            inputBaseClass,
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setComposerOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={readOnly || busyKey !== null}
                >
                  <ShieldCheck className="size-3.5" strokeWidth={1.75} />
                  {busyKey === 'create-proposal' ? '预检创建中...' : '创建并执行 AI 预检'}
                </Button>
              </div>
            </form>
          )}

          {proposals.length === 0 ? (
            <EmptyState
              title="暂无自进化提案"
              message="点击右上角「新建自进化提案」或选用安全模板，完成隔离 Worktree 沙箱校验与零停机热切。"
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {proposals.map((proposal) => {
                const actions = getAvailableProposalActions(proposal);
                const statusMeta = EVOLUTION_STATUS_META[proposal.status];
                const stageIndex = getProposalStageIndex(proposal.status);
                const strategyMeta = UPDATE_STRATEGY_META[proposal.plan.strategy];
                const preflightVerdict = proposal.preflight?.verdict || 'allow';
                const preflightTone: EvolutionTone =
                  preflightVerdict === 'block'
                    ? 'err'
                    : preflightVerdict === 'confirm_required'
                      ? 'warn'
                      : 'ok';

                return (
                  <div key={proposal.id} className="py-5 first:pt-0 last:pb-0 space-y-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <EvolutionStatusBadge
                            tone={statusMeta.tone}
                            label={statusMeta.label}
                          />
                          <span className="text-[14px] font-semibold text-[var(--ink)]">
                            {proposal.title}
                          </span>
                          <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">
                            {proposal.id}
                          </span>
                          <span className="text-[var(--ink-subtle)]">·</span>
                          <span
                            className={cn(
                              'text-[12px] font-medium',
                              proposal.hotSwappable
                                ? 'text-[var(--ok)]'
                                : 'text-[var(--warn)]',
                            )}
                          >
                            {proposal.hotSwappable ? '零停机可热切' : '需 PR 合并增量生效'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] tabular-nums text-[var(--ink-muted)]">
                          <span className="inline-flex items-center gap-1">
                            <GitBranch className="size-3" strokeWidth={1.75} />
                            {proposal.branch} → {proposal.baseBranch}
                          </span>
                          <span>分层 {UPDATE_LAYER_LABELS[proposal.primaryLayer] || proposal.primaryLayer}</span>
                          <span>策略 {strategyMeta?.label || proposal.plan.strategy}</span>
                          {proposal.btwThreadId && <span>BTW {proposal.btwThreadId}</span>}
                          <span>更新于 {formatDateTime(proposal.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 font-mono text-[12px] tabular-nums shrink-0">
                        <EvolutionStatusBadge
                          tone={preflightTone}
                          label={`预检 ${preflightVerdict}`}
                        />
                        <span className="text-[var(--ink-subtle)]">·</span>
                        <span className="text-[var(--ink)]">
                          安全分 {proposal.preflight?.safetyScore ?? 0}/100
                        </span>
                      </div>
                    </div>

                    {proposal.goal && (
                      <p className="m-0 text-[12.5px] text-[var(--ink-muted)]">{proposal.goal}</p>
                    )}

                    <div className="grid grid-cols-5 gap-2 py-2 border-y border-[var(--border-subtle)]">
                      {EVOLUTION_PIPELINE_STAGES.map((stage, idx) => {
                        const isCurrent = idx === stageIndex;
                        const isFailedStage = proposal.status === 'failed' && isCurrent;
                        const isRolledBackStage = proposal.status === 'rolled_back' && isCurrent;
                        const isDone =
                          idx < stageIndex
                          || (isCurrent
                            && (proposal.status === 'applied' || proposal.status === 'verified'));

                        const dotColor = isFailedStage
                          ? 'bg-[var(--err-dot)]'
                          : isRolledBackStage
                            ? 'bg-[var(--warn-dot)]'
                            : isDone
                              ? 'bg-[var(--ok-dot)]'
                              : isCurrent
                                ? 'bg-[var(--accent)]'
                                : 'bg-[var(--border-strong)]';
                        const labelColor = isFailedStage
                          ? 'text-[var(--err)]'
                          : isRolledBackStage
                            ? 'text-[var(--warn)]'
                            : isDone
                              ? 'text-[var(--ok)]'
                              : isCurrent
                                ? 'text-[var(--ink)]'
                                : 'text-[var(--ink-subtle)]';

                        return (
                          <div key={stage.key} className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)}
                              aria-hidden="true"
                            />
                            <span className={cn('text-[12px] font-mono truncate', labelColor)}>
                              {idx + 1}.{stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[12px]">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 p-3 space-y-1.5">
                        <div className="font-medium text-[var(--ink)] flex items-center justify-between">
                          <span>目标文件补丁</span>
                          <span className="font-mono text-[11.5px] tabular-nums text-[var(--ink-muted)]">
                            {proposal.filePatches.length || proposal.targetFiles.length} 个文件
                          </span>
                        </div>
                        <div className="divide-y divide-[var(--border)] font-mono text-[11.5px]">
                          {proposal.filePatches.length > 0
                            ? proposal.filePatches.map((patch) => (
                                <div
                                  key={`${patch.op}-${patch.path}`}
                                  className="py-1 flex items-center justify-between gap-2"
                                >
                                  <span className="truncate text-[var(--ink)]">
                                    <span className="text-[var(--ink-muted)] mr-1.5">
                                      {patch.op}
                                    </span>
                                    {patch.path}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-[var(--ink-muted)]">
                                    {UPDATE_LAYER_LABELS[patch.layer] || patch.layer} · {patch.bytes}B
                                  </span>
                                </div>
                              ))
                            : proposal.targetFiles.map((filePath) => (
                                <div key={filePath} className="py-1 truncate text-[var(--ink)]">
                                  {filePath}
                                </div>
                              ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]/50 p-3 space-y-2">
                        <div className="font-medium text-[var(--ink)]">沙箱 / 验证 / PR / 生效状态</div>
                        <div className="space-y-1.5 text-[11.5px] font-mono text-[var(--ink-muted)]">
                          {proposal.sandbox ? (
                            <div>
                              <span className="text-[var(--ink)]">沙箱：</span>
                              {proposal.sandbox.relPath} ·{' '}
                              {proposal.sandbox.cleanedAt ? '已清理' : '活跃'}
                              {proposal.sandbox.diffStat ? ` · ${proposal.sandbox.diffStat}` : ''}
                            </div>
                          ) : (
                            <div>沙箱：未准备</div>
                          )}

                          {proposal.verification && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                {proposal.verification.ok ? (
                                  <CheckCircle2
                                    className="size-3.5 text-[var(--ok)] shrink-0"
                                    strokeWidth={1.75}
                                  />
                                ) : (
                                  <XCircle
                                    className="size-3.5 text-[var(--err)] shrink-0"
                                    strokeWidth={1.75}
                                  />
                                )}
                                <span className="text-[var(--ink)] tabular-nums">
                                  校验 {proposal.verification.ok ? '通过' : '失败'} (
                                  {proposal.verification.checks.length} 项 ·{' '}
                                  {proposal.verification.durationMs}ms)
                                </span>
                              </div>
                              <div className="pl-5 space-y-0.5">
                                {proposal.verification.checks.map((check) => (
                                  <div
                                    key={check.name}
                                    className={cn(
                                      'truncate',
                                      check.ok ? 'text-[var(--ink-muted)]' : 'text-[var(--err)]',
                                    )}
                                    title={`${check.command}: ${check.output}`}
                                  >
                                    {check.ok ? 'PASS' : 'FAIL'} {check.name} · {check.output}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {proposal.pr && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[var(--ink)]">PR：</span>
                              {proposal.pr.url ? (
                                <a
                                  href={proposal.pr.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                                >
                                  <span>
                                    {proposal.pr.number ? `#${proposal.pr.number}` : proposal.pr.branch}
                                  </span>
                                  <ExternalLink className="size-3" strokeWidth={1.75} />
                                </a>
                              ) : (
                                <span>{proposal.pr.branch}</span>
                              )}
                              <span>· {proposal.pr.shortSha}</span>
                              <span>· {proposal.pr.pushed ? '已推送' : '本地提交'}</span>
                              {proposal.pr.draft && <span>· Draft</span>}
                            </div>
                          )}

                          {proposal.applyResult && (
                            <div>
                              <span className="text-[var(--ink)]">生效：</span>
                              {proposal.applyResult.mode === 'hot-swap'
                                ? 'hot-swap 零停机热切'
                                : 'git-pull 增量拉取'}
                              {proposal.applyResult.scopes && proposal.applyResult.scopes.length > 0
                                ? ` (${proposal.applyResult.scopes.join(', ')})`
                                : ''}
                              {proposal.applyResult.restartRequired ? ' · 待平滑重启' : ' · 无需重启'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {proposal.lastError && (
                      <div className="text-[12px] font-mono text-[var(--err)]">
                        错误详情：{proposal.lastError}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={readOnly || !actions.canSandbox || busyKey !== null}
                        onClick={() => void handlePrepareSandbox(proposal)}
                      >
                        <FlaskConical className="size-3.5" strokeWidth={1.75} />
                        准备沙箱
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={readOnly || !actions.canVerify || busyKey !== null}
                        onClick={() => void handleVerifyProposal(proposal)}
                      >
                        <ShieldCheck className="size-3.5" strokeWidth={1.75} />
                        沙箱验证
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={readOnly || !actions.canPublishPr || busyKey !== null}
                        onClick={() => openConfirmedProposalAction('publish-pr', proposal)}
                      >
                        <GitPullRequest className="size-3.5" strokeWidth={1.75} />
                        发布 PR
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={readOnly || !actions.canApply || busyKey !== null}
                        onClick={() => openConfirmedProposalAction('apply', proposal)}
                      >
                        <Zap className="size-3.5" strokeWidth={1.75} />
                        热切/增量生效
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={readOnly || !actions.canRollback || busyKey !== null}
                        onClick={() => openConfirmedProposalAction('rollback', proposal)}
                      >
                        <RotateCcw className="size-3.5" strokeWidth={1.75} />
                        原子回滚
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={readOnly || !actions.canCleanup || busyKey !== null}
                        onClick={() => void handleCleanupSandbox(proposal)}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                        清理沙箱
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>

      <ConfirmAlertDialog
        state={confirmState}
        onClose={() => setConfirmState(null)}
      />
    </div>
  );
}
