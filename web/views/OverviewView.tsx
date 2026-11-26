import React from 'react';
import type { IncidentItem, SnapshotResponse, StatusTone } from '../types';
import {
  formatBytes,
  formatCompactNumber,
  formatDateTime,
  formatUptime,
  statusLabel,
  statusTone,
} from '../utils/format';
import {
  Button,
  EmptyState,
  KpiStrip,
  Panel,
  ResourceMeter,
  SegmentedFilter,
  StatusIndicator,
} from '../components/ui';
import { ArchitectureGraph } from '../components/ArchitectureGraph';
import { MetricsChart } from '../components/MetricsChart';

const GRAPH_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'services', label: '核心服务' },
  { value: 'memory', label: '记忆链路' },
  { value: 'agents', label: 'Agent 与网关' },
  { value: 'network', label: '网络与底座' },
] as const;

type GraphFilter = (typeof GRAPH_FILTERS)[number]['value'];

export function OverviewView({
  snapshot,
  incidents: persistedIncidents = [],
  onOpenLogs,
  onSelectAgentCategory,
  onOpenPlugins,
}: {
  snapshot: SnapshotResponse | null;
  incidents?: IncidentItem[];
  onOpenLogs: (unit: string) => void;
  onSelectAgentCategory: (category: string) => void;
  onOpenPlugins?: () => void;
}) {
  const [graphFilter, setGraphFilter] = React.useState<GraphFilter>('all');

  const host = snapshot?.host;
  const services = snapshot?.services?.items || [];
  const healthySvcs = services.filter((s) => statusTone(s.status) === 'ok').length;
  const failedSvcs = services.filter((s) => statusTone(s.status) === 'err').length;
  const degradedSvcs = services.filter((s) => statusTone(s.status) === 'warn').length;
  const standbySvcs = Math.max(0, services.length - healthySvcs - failedSvcs - degradedSvcs);

  const memEngines = [
    snapshot?.memory?.nmem,
    snapshot?.memory?.openviking,
    snapshot?.memory?.symbiote,
    snapshot?.memory?.rerank,
  ].filter((m) => m?.enabled);
  const memOk = memEngines.filter((m) => m?.reachable).length;

  const fleetSum = snapshot?.fleet?.summary;
  const tsOnline = snapshot?.network?.tailscale?.onlineCount ?? 0;
  const tsTotal = snapshot?.network?.tailscale?.devices?.length ?? 0;
  const modelsCount = snapshot?.magpie?.totalModels ?? 0;

  const load1 = host?.load1 ?? host?.cpu?.load1 ?? host?.loadAvg?.[0];
  const memPct = host?.memory?.usedPercent ?? host?.memory?.usedPct;
  const uptimeSec = host?.uptimeSeconds ?? host?.uptimeSec;

  const hostMeta = host
    ? [
        host.hostname,
        host.os || host.platform,
        uptimeSec != null ? `运行 ${formatUptime(uptimeSec)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '等待采集';

  const svcTone: StatusTone = failedSvcs > 0 ? 'err' : degradedSvcs > 0 ? 'warn' : 'ok';
  const svcRatioPct = services.length > 0 ? Math.round((healthySvcs / services.length) * 100) : 0;

  const connectors = React.useMemo(() => {
    const list: Array<{
      id?: string;
      name: string;
      status?: string;
      latencyMs?: number | null;
      metric: string;
    }> = [];

    if (Array.isArray(snapshot?.connectors) && snapshot.connectors.length > 0) {
      for (const c of snapshot.connectors) {
        list.push({
          id: c.id || c.name,
          name: c.name,
          status: c.status,
          latencyMs: c.latencyMs,
          metric: c.summary || c.detail || c.error || '-',
        });
      }
    } else {
      if (snapshot?.magpie?.enabled) {
        list.push({
          id: 'gateway-magpie',
          name: 'Magpie 模型网关',
          status: snapshot.magpie.status || (snapshot.magpie.reachable ? 'healthy' : 'offline'),
          latencyMs: snapshot.magpie.latencyMs,
          metric: snapshot.magpie.reachable
            ? `${formatCompactNumber(snapshot.magpie.totalModels ?? 0)} 模型 · ${snapshot.magpie.providers?.length ?? 0} 渠道`
            : snapshot.magpie.error || '不可达',
        });
      }
      if (snapshot?.memory?.nmem?.enabled) {
        const n = snapshot.memory.nmem;
        list.push({
          id: 'memory-nmem',
          name: 'Nowledge Mem',
          status: n.status || (n.reachable ? 'healthy' : 'offline'),
          latencyMs: n.latencyMs,
          metric: n.reachable
            ? `${formatCompactNumber(n.stats?.memories ?? 0)} 记忆 · ${n.spaces?.length ?? 0} 空间`
            : n.error || '不可达',
        });
      }
      if (snapshot?.memory?.openviking?.enabled) {
        const ov = snapshot.memory.openviking;
        list.push({
          id: 'memory-openviking',
          name: 'OpenViking',
          status: ov.status || (ov.reachable ? 'healthy' : 'offline'),
          latencyMs: ov.latencyMs,
          metric: ov.reachable
            ? `向量 ${formatCompactNumber(ov.vikingdb?.vectorCount)} · 技能 ${ov.skillsCount ?? 0}`
            : ov.error || '不可达',
        });
      }
      if (snapshot?.memory?.symbiote?.enabled) {
        const s = snapshot.memory.symbiote;
        list.push({
          id: 'memory-symbiote',
          name: 'Symbiote',
          status: s.status || (s.reachable ? 'healthy' : 'offline'),
          latencyMs: s.latencyMs,
          metric: s.reachable ? `Vault ${formatCompactNumber(s.vaultFileCount)} 文档` : s.error || '不可达',
        });
      }
      if (snapshot?.memory?.rerank?.enabled) {
        const r = snapshot.memory.rerank;
        list.push({
          id: 'memory-rerank',
          name: 'Rerank 重排',
          status: r.status || (r.reachable ? 'healthy' : 'offline'),
          latencyMs: r.latencyMs,
          metric: r.reachable ? r.model || 'Ready' : r.error || '不可达',
        });
      }
      if (snapshot?.network?.tailscale?.enabled) {
        const t = snapshot.network.tailscale;
        list.push({
          id: 'network-tailscale',
          name: 'Tailscale Mesh',
          status: t.status || (t.reachable ? 'healthy' : 'offline'),
          latencyMs: t.latencyMs,
          metric: t.reachable ? `${t.onlineCount ?? 0}/${t.devices?.length ?? 0} 设备在线` : t.error || '不可达',
        });
      }
      if (snapshot?.network?.mihomo?.enabled) {
        const m = snapshot.network.mihomo;
        list.push({
          id: 'network-mihomo',
          name: 'Mihomo 代理',
          status: m.status || (m.reachable ? 'healthy' : 'offline'),
          latencyMs: m.latencyMs,
          metric: m.reachable ? `${formatCompactNumber(m.activeConnections ?? 0)} 活跃连接` : m.error || '不可达',
        });
      }
      if (snapshot?.network?.syncthing?.enabled) {
        const st = snapshot.network.syncthing;
        list.push({
          id: 'service-syncthing',
          name: 'Syncthing 同步',
          status: st.status || (st.reachable ? 'healthy' : 'offline'),
          latencyMs: st.latencyMs,
          metric: st.reachable
            ? st.folders != null || st.devices != null
              ? `${st.folders ?? 0} 文件夹 · ${st.devices ?? 0} 设备`
              : 'REST 健康检查通过'
            : st.error || '不可达',
        });
      }
    }

    // Merge modular extra plugins (MCP Server, A2A Agent Runtime, OpenAI Gateway, Custom Services)
    const existingKeys = new Set(list.map((x) => x.id || x.name));
    for (const p of snapshot?.plugins || []) {
      if (existingKeys.has(p.id) || existingKeys.has(p.name)) continue;
      list.push({
        id: p.id,
        name: p.name,
        status: p.status || (p.reachable ? 'healthy' : 'offline'),
        latencyMs: p.latencyMs,
        metric: p.summary || p.protocol || '-',
      });
    }

    return list;
  }, [snapshot]);

  const disks = host?.disks || [];
  const incidents = persistedIncidents.length > 0 ? persistedIncidents : snapshot?.incidents || [];
  const alerts = snapshot?.alerts || [];

  const fleetOnlineNum = fleetSum ? (fleetSum.online ?? 0) : tsOnline;
  const fleetTotalNum = fleetSum ? (fleetSum.total ?? 0) : tsTotal;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--ink)] leading-tight text-balance">
            系统总览
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed text-pretty">
            全栈服务健康度、主机负载、记忆引擎与组网连接状态。
          </p>
        </div>
        <div
          className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums truncate max-w-full"
          title={hostMeta}
        >
          {hostMeta}
        </div>
      </div>

      <KpiStrip
        asymmetric
        cells={[
          {
            label: '受管服务健康度',
            meta: services.length ? `${svcRatioPct}% 可用` : undefined,
            value: services.length ? `${healthySvcs}/${services.length}` : '-',
            numeric: services.length
              ? { primary: healthySvcs, denominator: services.length }
              : undefined,
            ratioPct: services.length ? svcRatioPct : undefined,
            sub:
              failedSvcs > 0
                ? `${failedSvcs} 项故障 · ${degradedSvcs} 项降级`
                : degradedSvcs > 0
                  ? `${degradedSvcs} 项降级运行`
                  : standbySvcs > 0
                    ? `${healthySvcs} 项运行中 · ${standbySvcs} 项待机`
                    : '全部受管服务运行平稳',
            tone: svcTone,
          },
          {
            label: '主机内存占用',
            value: memPct != null ? `${Math.round(memPct)}%` : '-',
            numeric: memPct != null ? { primary: Math.round(memPct), suffix: '%' } : undefined,
            sub:
              load1 != null
                ? `负载 ${Number(load1).toFixed(2)} · ${formatBytes(host?.memory?.usedBytes)} / ${formatBytes(host?.memory?.totalBytes)}`
                : 'CPU 负载与内存占用',
            tone: memPct != null && memPct > 85 ? 'warn' : 'ok',
          },
          {
            label: '记忆引擎',
            value: memEngines.length ? `${memOk}/${memEngines.length}` : '-',
            numeric: memEngines.length
              ? { primary: memOk, denominator: memEngines.length }
              : undefined,
            sub: `${formatCompactNumber(snapshot?.memory?.nmem?.stats?.memories ?? 0)} 记忆 · ${snapshot?.memory?.openviking?.skillsCount ?? 0} 技能`,
            tone: memEngines.length > 0 && memOk < memEngines.length ? 'warn' : 'ok',
          },
          {
            label: '全球节点',
            value: `${fleetOnlineNum}/${fleetTotalNum}`,
            numeric: { primary: fleetOnlineNum, denominator: fleetTotalNum },
            sub: `Tailnet ${tsOnline}/${tsTotal} · ${formatCompactNumber(modelsCount)} 模型`,
          },
        ]}
      />

      <MetricsChart />

      <Panel
        title="统一架构与依赖图谱"
        description="按入口 Agent、模型网关、记忆上下文与网络底座实时映射依赖关系，点击节点高亮上下游并下钻日志。"
        actions={
          <SegmentedFilter
            value={graphFilter}
            onChange={setGraphFilter}
            options={GRAPH_FILTERS}
            ariaLabel="架构图谱筛选"
          />
        }
      >
        <ArchitectureGraph
          snapshot={snapshot}
          mode="full"
          filter={graphFilter}
          onOpenLogs={onOpenLogs}
          onSelectAgentCategory={onSelectAgentCategory}
        />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Panel
          className="lg:col-span-7"
          bodyClassName="p-0"
          title="已启用插件与连接器状态"
          description="通过各组件官方协议（MCP / A2A / OpenAI / REST API / 结构化 CLI）实时采集。"
          actions={
            onOpenPlugins ? (
              <Button variant="secondary" size="sm" onClick={onOpenPlugins}>
                管理插件
              </Button>
            ) : undefined
          }
        >
          {connectors.length === 0 ? (
            <EmptyState
              message="尚未配置已启用的插件或连接器。"
              action={onOpenPlugins ? { label: '前往插件目录', onClick: onOpenPlugins } : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                    <th className="py-2.5 pl-5 sm:pl-6 pr-3">组件 / 插件</th>
                    <th className="py-2.5 px-3">状态</th>
                    <th className="py-2.5 px-3 text-right">延迟</th>
                    <th className="py-2.5 pl-3 pr-5 sm:pr-6">核心指标</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[13.5px]">
                  {connectors.map((c) => (
                    <tr
                      key={c.id || c.name}
                      className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                    >
                      <td className="py-3 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)] max-w-[180px] truncate" title={c.name}>
                        {c.name}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusIndicator status={c.status} />
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                        {c.latencyMs != null ? `${c.latencyMs}ms` : '-'}
                      </td>
                      <td
                        className="py-3 pl-3 pr-5 sm:pr-6 font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums max-w-[260px] truncate"
                        title={c.metric}
                      >
                        {c.metric}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          className="lg:col-span-5"
          title="主机存储与近期事件"
          description="挂载点容量使用率、持久化状态变更时间线与近期告警。"
        >
          <div className="space-y-5">
            {disks.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-subtle)]">暂无磁盘挂载点采集数据。</p>
            ) : (
              <div className="space-y-3.5">
                {disks.slice(0, 4).map((d) => {
                  const pct = d.usePercent ?? d.usedPct ?? 0;
                  const totalBytes = d.sizeBytes ?? d.totalBytes;
                  const detail =
                    d.used && d.size
                      ? `${d.used} / ${d.size} (${Math.round(pct)}%)`
                      : d.usedBytes != null && totalBytes != null
                        ? `${formatBytes(d.usedBytes)} / ${formatBytes(totalBytes)} (${Math.round(pct)}%)`
                        : `${Math.round(pct)}%`;
                  return (
                    <ResourceMeter
                      key={d.mount}
                      label={d.mount}
                      value={pct}
                      valueText={detail}
                    />
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <h3 className="text-[13px] font-semibold tracking-tight text-[var(--ink)] mb-2.5">
                状态变更事件时间线
              </h3>
              {incidents.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-subtle)]">近期无组件状态漂移事件。</p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {incidents.slice(0, 5).map((inc, idx) => {
                    const actor = inc.node || inc.component || inc.target || inc.entityKey || '系统';
                    const fromS = inc.fromState || inc.fromStatus || inc.from;
                    const toS = inc.toState || inc.toStatus || inc.to;
                    const transition = fromS || toS ? `${statusLabel(fromS)} → ${statusLabel(toS)}` : '';
                    const detail = inc.detail || inc.message || inc.summary || '';
                    return (
                      <li
                        key={inc.id || `${inc.ts}-${idx}`}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-[13px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                            <span className="font-medium text-[var(--ink)] truncate max-w-[180px]" title={actor}>
                              {actor}
                            </span>
                            {transition && (
                              <span className="font-mono text-[12px] text-[var(--ink-muted)] whitespace-nowrap">
                                {transition}
                              </span>
                            )}
                          </div>
                          {detail && (
                            <p className="mt-0.5 text-[12px] text-[var(--ink-subtle)] truncate" title={detail}>
                              {detail}
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                          {formatDateTime(inc.ts || inc.timestamp)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <h3 className="text-[13px] font-semibold tracking-tight text-[var(--ink)] mb-2.5">
                最近告警与活跃任务
              </h3>
              {alerts.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-subtle)]">当前无未处理告警。</p>
              ) : (
                <ul className="space-y-2.5">
                  {alerts.slice(0, 4).map((al, idx) => (
                    <li
                      key={al.id || idx}
                      className="flex items-start justify-between gap-3 text-[13px]"
                    >
                      <div className="min-w-0 flex-1">
                        <StatusIndicator
                          status={al.severity || al.level || 'warn'}
                          label={al.title || al.component || '告警'}
                        />
                        {al.message && (
                          <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)] line-clamp-2 text-pretty">
                            {al.message}
                          </p>
                        )}
                      </div>
                      {al.ts && (
                        <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                          {formatDateTime(al.ts)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
