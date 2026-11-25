import React from 'react';
import { X } from 'lucide-react';
import type { SnapshotResponse } from '../types';
import { formatBytes } from '../utils/format';
import {
  EmptyState,
  Panel,
  ResourceMeter,
  StatusIndicator,
} from '../components/ui';
import { ArchitectureGraph } from '../components/ArchitectureGraph';

export function AgentsView({
  snapshot,
  selectedCategory,
  selectedPid = null,
  onSelectCategory,
  onSelectPid,
}: {
  snapshot: SnapshotResponse | null;
  selectedCategory: string;
  selectedPid?: number | null;
  onSelectCategory: (category: string) => void;
  onSelectPid?: (pid: number | null) => void;
}) {
  const magpie = snapshot?.magpie;
  const processes = snapshot?.agents?.processes || [];
  const rowRefs = React.useRef<Record<number, HTMLTableRowElement | null>>({});

  React.useEffect(() => {
    if (selectedPid != null && rowRefs.current[selectedPid]) {
      rowRefs.current[selectedPid]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPid]);

  const filteredProcesses = React.useMemo(() => {
    if (selectedPid != null) {
      const pidMatches = processes.filter((p) => p.pid === selectedPid);
      if (pidMatches.length > 0) return pidMatches;
    }
    if (!selectedCategory) return processes;
    return processes.filter(
      (p) => (p.categoryLabel || p.category || 'Agent') === selectedCategory,
    );
  }, [processes, selectedCategory, selectedPid]);

  const providers = magpie?.providers || [];
  const totalModels = magpie?.totalModels || providers.reduce((sum, p) => sum + p.count, 0) || 1;
  const agents = magpie?.agents || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--ink)] leading-tight">
            网关与 Agent 运行时
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed">
            Magpie 模型网关、上游渠道目录、共享 MCP 桥接与本地活跃 Agent 进程监控。
          </p>
        </div>
        <div className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
          {magpie?.reachable
            ? `${magpie.totalModels ?? 0} 模型 · ${providers.length} 渠道 · ${processes.length} 活跃进程`
            : `${processes.length} 活跃进程`}
        </div>
      </div>

      <Panel
        title="Agent 路由与模型分发图谱"
        description="点击左侧任意 Agent 运行时进程组即可快速筛选下方进程列表。"
      >
        <ArchitectureGraph
          snapshot={snapshot}
          mode="agents"
          onSelectAgentCategory={onSelectCategory}
        />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel
          className="lg:col-span-6"
          title="Magpie 模型供给分布"
          description={magpie?.protocol || 'OpenAI Compatible /v1/models'}
          actions={<StatusIndicator status={magpie?.status || (magpie?.reachable ? 'healthy' : 'offline')} />}
        >
          {providers.length === 0 ? (
            <EmptyState message="暂无可用的模型渠道目录。" />
          ) : (
            <div className="space-y-3.5">
              {providers.map((p) => (
                <ResourceMeter
                  key={p.name}
                  label={p.name}
                  value={(p.count / totalModels) * 100}
                  valueText={`${p.count} 模型`}
                  tone="ok"
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          className="lg:col-span-6"
          title="注册 Agent 与共享 MCP 库"
          description="异步采集自 Magpie 网关注册表与 MCP Hub，不阻塞主快照采集。"
        >
          <div className="space-y-4">
            {agents.length > 0 ? (
              <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {agents.slice(0, 6).map((a, i) => (
                  <li key={a.id || a.name || i} className="py-2 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-medium text-[var(--ink)]">{a.name || a.id}</span>
                      {a.model && (
                        <span className="ml-2 font-mono text-[12px] text-[var(--ink-subtle)]">
                          {a.model}
                        </span>
                      )}
                    </div>
                    <StatusIndicator status={a.status || (a.active === false ? 'standby' : 'healthy')} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-[var(--ink-subtle)]">未发现已注册的 Magpie Agent 桥接。</p>
            )}

            {magpie?.library && (
              <div className="pt-3 border-t border-[var(--border-subtle)] text-[13px]">
                <div className="flex items-baseline justify-between gap-2 text-[var(--ink-muted)]">
                  <span>共享 MCP 服务</span>
                  <span className="font-mono font-semibold text-[var(--ink)] tabular-nums">
                    {magpie.library.mcpCount ?? magpie.library.mcps?.length ?? 0} 个
                  </span>
                </div>
                {Array.isArray(magpie.library.mcps) && magpie.library.mcps.length > 0 && (
                  <p className="mt-1.5 font-mono text-[12px] text-[var(--ink-subtle)]">
                    {magpie.library.mcps
                      .map((m) => (typeof m === 'string' ? m : m.name))
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="本地活跃 Agent 进程"
        description="按配置的进程匹配规则实时发现正在运行的编码与编排 Agent。"
        bodyClassName="p-0"
        actions={
          selectedPid != null || selectedCategory ? (
            <div className="flex flex-wrap items-center gap-2">
              {selectedPid != null && onSelectPid && (
                <button
                  type="button"
                  data-testid="clear-pid-filter"
                  onClick={() => onSelectPid(null)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] border border-[var(--accent)] bg-[var(--accent-soft)] text-[12.5px] font-mono font-medium text-[var(--accent)] hover:opacity-85 transition-opacity cursor-pointer"
                >
                  <span>PID {selectedPid}</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => onSelectCategory('')}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-subtle)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <span>筛选：{selectedCategory}</span>
                  <X className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {filteredProcesses.length === 0 ? (
          <EmptyState message="当前主机没有匹配到活跃 Agent 进程。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 pr-3">PID</th>
                  <th className="py-2.5 px-3">分类</th>
                  <th className="py-2.5 px-3 text-right">CPU</th>
                  <th className="py-2.5 px-3 text-right">内存</th>
                  <th className="py-2.5 pl-3 pr-5">命令行</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {filteredProcesses.map((proc) => {
                  const isPidSelected = selectedPid === proc.pid;
                  return (
                    <tr
                      key={proc.pid}
                      ref={(el) => {
                        rowRefs.current[proc.pid] = el;
                      }}
                      data-pid={proc.pid}
                      data-selected-pid={isPidSelected ? 'true' : undefined}
                      className={`transition-colors ${
                        isPidSelected
                          ? 'bg-[var(--accent-soft)]'
                          : 'hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <td className="py-2.5 pl-5 pr-3 font-mono text-[12.5px] font-medium text-[var(--ink)] tabular-nums">
                        {proc.pid}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[var(--ink)] whitespace-nowrap">
                        {proc.categoryLabel || proc.category || 'Agent'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[12.5px] text-[var(--ink)] tabular-nums whitespace-nowrap">
                        {proc.cpu != null ? `${Number(proc.cpu).toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                        {formatBytes(proc.memoryBytes ?? proc.rssBytes)}
                      </td>
                      <td className="py-2.5 pl-3 pr-5 font-mono text-[12px] text-[var(--ink-muted)] max-w-[460px] truncate" title={proc.cmd || proc.command}>
                        {proc.cmd || proc.command || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
