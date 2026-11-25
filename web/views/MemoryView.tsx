import React from 'react';
import { Search, Stethoscope } from 'lucide-react';
import type { MemorySearchResultItem, SnapshotResponse } from '../types';
import { runMemoryDoctor, searchMemory } from '../api';
import {
  EmptyState,
  Panel,
  SegmentedFilter,
  StatusIndicator,
} from '../components/ui';
import { ArchitectureGraph } from '../components/ArchitectureGraph';

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--ink)] leading-tight">
            记忆与上下文引擎
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--ink-muted)]">
            通过官方 REST API 与 CLI 直连 Nowledge Mem、OpenViking、Symbiote 与 Rerank 重排服务。
          </p>
        </div>
        <button
          type="button"
          onClick={handleDoctor}
          disabled={doctorBusy || readOnly}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[7px] border border-[var(--border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-45"
        >
          <Stethoscope className="h-4 w-4 text-[var(--accent)]" />
          {doctorBusy ? '诊断中...' : '运行官方自检'}
        </button>
      </div>

      {doctorOutput && (
        <Panel
          title="官方诊断报告"
          actions={
            <button
              type="button"
              onClick={() => setDoctorOutput('')}
              className="text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              收起
            </button>
          }
        >
          <pre className="m-0 rounded-[8px] bg-[var(--terminal-bg)] text-[var(--terminal-ink)] p-4 font-mono text-[12px] overflow-x-auto whitespace-pre-wrap max-h-[260px]">
            {doctorOutput}
          </pre>
        </Panel>
      )}

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
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词语义检索记忆库、对话历史或技能上下文..."
              aria-label="记忆关键词检索"
              className="w-full h-10 pl-9 pr-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13.5px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="h-10 px-4 rounded-[7px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-45"
          >
            {searching ? '检索中...' : '执行检索'}
          </button>
        </form>

        {results !== null && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            {results.length === 0 ? (
              <EmptyState message="未检索到匹配的记忆条目。" />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {results.map((item, idx) => (
                  <li key={`${item.uri || item.title}-${idx}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-medium text-[13.5px] text-[var(--ink)]">
                        {item.title || item.uri || item.path || `结果 #${idx + 1}`}
                      </div>
                      <div className="font-mono text-[12px] text-[var(--ink-subtle)]">
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
                      <p className="mt-1 text-[13px] text-[var(--ink-muted)] line-clamp-3">
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
        <ArchitectureGraph snapshot={snapshot} mode="memory" />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">长期记忆</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums">
                    {mem.nmem.stats?.memories ?? '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">对话线程</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums">
                    {mem.nmem.stats?.threads ?? '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">知识空间</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums">
                    {mem.nmem.spaces?.length ?? mem.nmem.stats?.spaces ?? '-'}
                  </dd>
                </div>
              </dl>
              {mem.nmem.spaces && mem.nmem.spaces.length > 0 && (
                <div>
                  <h3 className="text-[12.5px] font-semibold text-[var(--ink-muted)] mb-2">空间分布</h3>
                  <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {mem.nmem.spaces.slice(0, 6).map((sp, i) => (
                      <li key={sp.id || sp.name || i} className="py-2 flex justify-between gap-2">
                        <span className="text-[var(--ink)] font-medium">{sp.name || sp.id}</span>
                        <span className="font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums">
                          {sp.count ?? sp.memoryCount ?? 0} 条
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
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">VikingDB 向量</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums">
                    {mem.openviking.vikingdb?.vectorCount ?? '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">已载入技能</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums">
                    {mem.openviking.skillsCount ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">待处理队列</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums">
                    {mem.openviking.queue?.pending ?? 0}
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
                          <span className="font-mono text-[12.5px] text-[var(--ink)]">{name}</span>
                          {desc && (
                            <span className="text-[12.5px] text-[var(--ink-subtle)] truncate">
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
              <div>
                <dt className="text-[12px] text-[var(--ink-subtle)]">Vault 文档数</dt>
                <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums">
                  {mem.symbiote.vaultFileCount ?? '-'}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ink-subtle)]">运行模式</dt>
                <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)]">
                  {mem.symbiote.mode || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ink-subtle)]">接口延迟</dt>
                <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] tabular-nums">
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
              <div className="col-span-2">
                <dt className="text-[12px] text-[var(--ink-subtle)]">重排模型</dt>
                <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] truncate">
                  {mem.rerank.model || 'Ready'}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ink-subtle)]">推理延迟</dt>
                <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] tabular-nums">
                  {mem.rerank.latencyMs != null ? `${mem.rerank.latencyMs}ms` : '-'}
                </dd>
              </div>
            </dl>
          )}
        </Panel>
      </div>
    </div>
  );
}
