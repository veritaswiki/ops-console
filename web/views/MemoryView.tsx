import React from 'react';
import { Copy, FlaskConical, Search, Stethoscope } from 'lucide-react';
import type { MemoryCompareResponse, MemorySearchResultItem, SnapshotResponse } from '../types';
import { compareMemoryRetrieval, copyToClipboard, runMemoryDoctor, searchMemory } from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { formatCompactNumber, formatInteger } from '../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  WidgetSkeleton,
} from '../components/ui';
import { ModuleFrame } from '../modules/ModuleFrame';

const COMPARE_PRESETS = [
  'gateway circuit breaker',
  'tailnet binding policy',
  'structured logging',
] as const;

const ArchitectureGraph = React.lazy(() =>
  import('../components/ArchitectureGraph').then((m) => ({ default: m.ArchitectureGraph })),
);

const PROVIDERS = [
  { value: 'all', label: '联合检索' },
  { value: 'nmem', label: 'Nowledge Mem' },
  { value: 'openviking', label: 'OpenViking' },
] as const;

type ProviderKey = (typeof PROVIDERS)[number]['value'];

export function MemoryView({
  snapshot,
  readOnly,
  onToast,
}: {
  snapshot: SnapshotResponse | null;
  readOnly: boolean;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [provider, setProvider] = React.useState<ProviderKey>('all');
  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<MemorySearchResultItem[] | null>(null);
  const [doctorBusy, setDoctorBusy] = React.useState(false);
  const [doctorOutput, setDoctorOutput] = React.useState('');

  // Cross-engine Rerank Comparison Lab
  const [compareQuery, setCompareQuery] = React.useState('gateway circuit breaker');
  const [comparing, setComparing] = React.useState(false);
  const [compareRes, setCompareRes] = React.useState<MemoryCompareResponse | null>(null);

  const mem = snapshot?.memory;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await searchMemory(q, provider);
      setResults(res.results || res.items || []);
    } catch (err) {
      onToast(`检索失败：${(err as Error).message}`, 'err');
    } finally {
      setSearching(false);
    }
  };

  const runCompareQuery = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) return;
    setCompareQuery(q);
    setComparing(true);
    try {
      const res = await compareMemoryRetrieval(q);
      setCompareRes(res);
    } catch (err) {
      onToast(`召回对比失败：${(err as Error).message}`, 'err');
    } finally {
      setComparing(false);
    }
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    await runCompareQuery(compareQuery);
  };

  const handleCopyCompareJson = async () => {
    if (!compareRes) return;
    const ok = await copyToClipboard(JSON.stringify(compareRes, null, 2));
    if (ok) onToast('已复制召回评测 JSON 报告', 'ok');
  };

  const handleDoctor = async () => {
    if (readOnly) {
      onToast('只读模式已禁用官方自检命令', 'err');
      return;
    }
    setDoctorBusy(true);
    try {
      const res = await runMemoryDoctor();
      const text =
        res.output ||
        res.raw ||
        (res.results ? JSON.stringify(res.results, null, 2) : '已完成官方接口诊断。');
      setDoctorOutput(text);
      onToast('记忆引擎官方自检已完成', 'ok');
    } catch (err) {
      onToast(`自检失败：${(err as Error).message}`, 'err');
    } finally {
      setDoctorBusy(false);
    }
  };

  return (
    <ModuleFrame
      title="记忆与上下文引擎"
      description="按需启用可选记忆引擎插件（Nowledge Mem、OpenViking、Symbiote、Rerank），通过官方 REST API 与 CLI 采集并进行跨引擎召回质量对照评估。"
      actions={
        <Button
          variant="secondary"
          size="md"
          onClick={handleDoctor}
          disabled={doctorBusy || readOnly}
        >
          <Stethoscope className="size-4 text-[var(--accent)]" strokeWidth={1.75} />
          {doctorBusy ? '诊断中...' : '运行官方自检'}
        </Button>
      }
    >

      {doctorOutput && (
        <Panel
          title="官方诊断报告"
          actions={
            <Button variant="ghost" size="sm" onClick={() => setDoctorOutput('')}>
              收起
            </Button>
          }
        >
          <pre className="m-0 rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-4 font-mono text-[12px] overflow-x-auto whitespace-pre-wrap max-h-[260px]">
            {doctorOutput}
          </pre>
        </Panel>
      )}

      <Panel
        title="跨引擎召回与 Rerank 重排对比实验室"
        description="并行向 Nowledge Mem 与 OpenViking 发起相同查询，量化重排模型 (Rerank) 带来的排序增益与端到端耗时。"
        actions={
          compareRes ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
                nmem {compareRes.timingsMs.nmem}ms · ov {compareRes.timingsMs.openviking}ms · rerank {compareRes.timingsMs.rerank}ms
              </span>
              <Button variant="secondary" size="sm" onClick={handleCopyCompareJson}>
                <Copy className="size-3.5" strokeWidth={1.75} />
                复制 JSON
              </Button>
            </div>
          ) : undefined
        }
      >
        <form onSubmit={handleCompare} className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <FlaskConical
              className="size-4 text-[var(--accent)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={compareQuery}
              onChange={(e) => setCompareQuery(e.target.value)}
              placeholder="输入测试 Query，对比两路召回与 Rerank 重排得分..."
              aria-label="跨引擎召回对比查询"
              data-testid="memory-compare-input"
              className={cn('w-full h-10 pl-9 pr-3', inputBaseClass)}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={comparing || !compareQuery.trim()}
            data-testid="memory-compare-submit"
          >
            {comparing ? '评测中...' : '运行召回对比'}
          </Button>
        </form>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-[var(--ink-subtle)]">快速评测集：</span>
          {COMPARE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={comparing}
              onClick={() => void runCompareQuery(preset)}
              className={cn(
                'px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] font-mono text-[11.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-colors cursor-pointer whitespace-nowrap',
                FOCUS_RING,
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        {compareRes && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] overflow-x-auto" data-testid="memory-compare-results">
            {compareRes.items.length === 0 ? (
              <EmptyState message="未检索到可供重排对比的候选项。" />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                    <th className="py-2 pr-3">候选片段</th>
                    <th className="py-2 px-3">来源</th>
                    <th className="py-2 px-3 text-right">Nmem</th>
                    <th className="py-2 px-3 text-right">OpenViking</th>
                    <th className="py-2 px-3 text-right">Rerank 终分</th>
                    <th className="py-2 pl-3 text-right">重排增益</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {compareRes.items.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out">
                      <td className="py-2.5 pr-3 max-w-[340px]">
                        <div className="font-medium text-[var(--ink)] truncate" title={item.title}>
                          {item.title}
                        </div>
                        {item.snippet && (
                          <div className="text-[12px] text-[var(--ink-subtle)] truncate" title={item.snippet}>
                            {item.snippet}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] whitespace-nowrap">
                        {item.source}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums">
                        {item.nmemScore.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums">
                        {item.ovScore.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[12.5px] font-semibold text-[var(--ink)] tabular-nums">
                        {item.rerankScore.toFixed(3)}
                      </td>
                      <td
                        className={cn(
                          'py-2.5 pl-3 text-right font-mono text-[12px] font-medium tabular-nums whitespace-nowrap',
                          item.delta >= 0 ? 'text-[var(--ok)]' : 'text-[var(--err)]',
                        )}
                      >
                        {item.delta >= 0 ? `+${item.delta.toFixed(3)}` : item.delta.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="跨引擎联合记忆检索"
        description="实时调用 nmem 与 OpenViking 原生检索接口，返回相关度排序结果。"
        actions={
          <SegmentedFilter
            value={provider}
            onChange={setProvider}
            options={PROVIDERS}
            ariaLabel="记忆检索来源"
          />
        }
      >
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词语义检索记忆库、对话历史或技能上下文..."
              aria-label="记忆关键词检索"
              className={cn('w-full h-10 pl-9 pr-3', inputBaseClass)}
            />
          </div>
          <Button type="submit" variant="primary" size="lg" disabled={searching || !query.trim()}>
            {searching ? '检索中...' : '执行检索'}
          </Button>
        </form>

        {results !== null && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            {results.length === 0 ? (
              <EmptyState
                title="未检索到匹配条目"
                message="可以尝试更换关键词或切换到「联合检索」扩大范围。"
                action={{
                  label: '清空检索词',
                  onClick: () => {
                    setQuery('');
                    setResults(null);
                  },
                }}
              />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {results.map((item, idx) => (
                  <li key={`${item.uri || item.title}-${idx}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-medium text-[13.5px] text-[var(--ink)] truncate max-w-full">
                        {item.title || item.uri || item.path || `结果 #${idx + 1}`}
                      </div>
                      <div className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                        {[
                          item.provider || item.engine,
                          item.space,
                          item.score != null ? `score ${Number(item.score).toFixed(3)}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    {(item.snippet || item.content) && (
                      <p className="mt-1 text-[13px] text-[var(--ink-muted)] line-clamp-3 text-pretty">
                        {item.snippet || item.content}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="记忆链路与底层索引拓扑"
        description="展示活跃 Agent 到记忆引擎、向量索引、文档库与重排服务的调用关系。"
      >
        <React.Suspense fallback={<WidgetSkeleton heightClass="h-[400px]" label="正在加载记忆链路拓扑" />}>
          <ArchitectureGraph snapshot={snapshot} mode="memory" />
        </React.Suspense>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Panel
          title="Nowledge Mem"
          description={mem?.nmem?.protocol || 'REST API + nmem CLI'}
          actions={<StatusIndicator status={mem?.nmem?.status || (mem?.nmem?.reachable ? 'healthy' : 'offline')} />}
        >
          {!mem?.nmem?.enabled ? (
            <EmptyState message="Nowledge Mem 连接器未启用。" />
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-3 gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">长期记忆</dt>
                  <dd
                    className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate"
                    title={formatInteger(mem.nmem.stats?.memories)}
                  >
                    {formatCompactNumber(mem.nmem.stats?.memories)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">对话线程</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate">
                    {formatCompactNumber(mem.nmem.stats?.threads)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">知识空间</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate">
                    {formatCompactNumber(mem.nmem.spaces?.length ?? mem.nmem.stats?.spaces)}
                  </dd>
                </div>
              </dl>
              {mem.nmem.spaces && mem.nmem.spaces.length > 0 && (
                <div>
                  <h3 className="text-[12.5px] font-semibold text-[var(--ink-muted)] mb-2">空间分布</h3>
                  <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {mem.nmem.spaces.slice(0, 6).map((sp, i) => (
                      <li key={sp.id || sp.name || i} className="py-2 flex items-center justify-between gap-2">
                        <span className="text-[var(--ink)] font-medium truncate">{sp.name || sp.id}</span>
                        <span className="font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums shrink-0">
                          {formatInteger(sp.count ?? sp.memoryCount ?? 0)} 条
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title="OpenViking"
          description={mem?.openviking?.protocol || 'HTTP API + ov CLI'}
          actions={<StatusIndicator status={mem?.openviking?.status || (mem?.openviking?.reachable ? 'healthy' : 'offline')} />}
        >
          {!mem?.openviking?.enabled ? (
            <EmptyState message="OpenViking 连接器未启用。" />
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-3 gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">VikingDB 向量</dt>
                  <dd
                    className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate"
                    title={formatInteger(mem.openviking.vikingdb?.vectorCount)}
                  >
                    {formatCompactNumber(mem.openviking.vikingdb?.vectorCount)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">已载入技能</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate">
                    {formatCompactNumber(mem.openviking.skillsCount ?? 0)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">待处理队列</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate">
                    {formatCompactNumber(mem.openviking.queue?.pending ?? 0)}
                  </dd>
                </div>
              </dl>
              {mem.openviking.skills && mem.openviking.skills.length > 0 && (
                <div>
                  <h3 className="text-[12.5px] font-semibold text-[var(--ink-muted)] mb-2">技能索引</h3>
                  <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {mem.openviking.skills.slice(0, 6).map((sk, idx) => {
                      const name = typeof sk === 'string' ? sk : sk.name || sk.id || `Skill ${idx + 1}`;
                      const desc = typeof sk === 'string' ? '' : sk.description || '';
                      return (
                        <li key={name} className="py-2 flex items-baseline justify-between gap-3">
                          <span className="font-mono text-[12.5px] text-[var(--ink)] shrink-0">{name}</span>
                          {desc && (
                            <span className="text-[12.5px] text-[var(--ink-subtle)] truncate" title={desc}>
                              {desc}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title="Symbiote"
          description={mem?.symbiote?.protocol || 'HTTP /api/health'}
          actions={<StatusIndicator status={mem?.symbiote?.status || (mem?.symbiote?.reachable ? 'healthy' : 'offline')} />}
        >
          {!mem?.symbiote?.enabled ? (
            <EmptyState message="Symbiote 连接器未启用。" />
          ) : (
            <dl className="grid grid-cols-3 gap-4">
              <div className="min-w-0">
                <dt className="text-[12px] text-[var(--ink-subtle)]">Vault 文档数</dt>
                <dd
                  className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate"
                  title={formatInteger(mem.symbiote.vaultFileCount)}
                >
                  {formatCompactNumber(mem.symbiote.vaultFileCount)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12px] text-[var(--ink-subtle)]">运行模式</dt>
                <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] truncate">
                  {mem.symbiote.mode || '-'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12px] text-[var(--ink-subtle)]">接口延迟</dt>
                <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] tabular-nums truncate">
                  {mem.symbiote.latencyMs != null ? `${mem.symbiote.latencyMs}ms` : '-'}
                </dd>
              </div>
            </dl>
          )}
        </Panel>

        <Panel
          title="Rerank 语义重排"
          description={mem?.rerank?.protocol || 'HTTP /health'}
          actions={<StatusIndicator status={mem?.rerank?.status || (mem?.rerank?.reachable ? 'healthy' : 'offline')} />}
        >
          {!mem?.rerank?.enabled ? (
            <EmptyState message="Rerank 重排服务未启用。" />
          ) : (
            <dl className="grid grid-cols-3 gap-4">
              <div className="col-span-2 min-w-0">
                <dt className="text-[12px] text-[var(--ink-subtle)]">重排模型</dt>
                <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] truncate" title={mem.rerank.model || 'Ready'}>
                  {mem.rerank.model || 'Ready'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12px] text-[var(--ink-subtle)]">推理延迟</dt>
                <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] tabular-nums truncate">
                  {mem.rerank.latencyMs != null ? `${mem.rerank.latencyMs}ms` : '-'}
                </dd>
              </div>
            </dl>
          )}
        </Panel>
      </div>
    </ModuleFrame>
  );
}
