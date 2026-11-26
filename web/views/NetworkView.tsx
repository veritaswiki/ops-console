import React from 'react';
import { Check, Copy, RefreshCw, Search } from 'lucide-react';
import type { MetaResponse, RemoteHostStatus, SnapshotResponse } from '../types';
import { copyToClipboard, probeRemotes } from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { formatBytes, formatCompactNumber } from '../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  Panel,
  SegmentedFilter,
  StatusIndicator,
} from '../components/ui';
import { ModuleFrame } from '../modules/ModuleFrame';

const TS_FILTERS = [
  { value: 'all', label: '全部设备' },
  { value: 'online', label: '仅在线' },
  { value: 'relay', label: 'DERP 中继' },
] as const;

type TsFilter = (typeof TS_FILTERS)[number]['value'];

const FW_FILTERS = [
  { value: 'all', label: '全部监听' },
  { value: 'exposed', label: '仅非回环暴露' },
] as const;

type FwFilter = (typeof FW_FILTERS)[number]['value'];

export function NetworkView({
  snapshot,
  meta,
  onToast,
}: {
  snapshot: SnapshotResponse | null;
  meta: MetaResponse | null;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [remotes, setRemotes] = React.useState<RemoteHostStatus[]>([]);
  const [probing, setProbing] = React.useState(false);
  const [tsFilter, setTsFilter] = React.useState<TsFilter>('all');
  const [tsQuery, setTsQuery] = React.useState('');
  const [copiedIp, setCopiedIp] = React.useState('');
  const [fwFilter, setFwFilter] = React.useState<FwFilter>('all');

  const net = snapshot?.network;
  const ts = net?.tailscale;
  const mihomo = net?.mihomo;
  const syncthing = net?.syncthing;
  const fw = snapshot?.firewall || net?.firewall;

  const handleCopyIp = async (ip: string) => {
    if (!ip || ip === '-') return;
    const ok = await copyToClipboard(ip);
    if (ok) {
      setCopiedIp(ip);
      onToast(`已复制节点 IP：${ip}`, 'ok');
      window.setTimeout(() => setCopiedIp((cur) => (cur === ip ? '' : cur)), 1600);
    }
  };

  const handleProbeRemotes = async () => {
    setProbing(true);
    try {
      const res = await probeRemotes();
      setRemotes(res.items || res.remotes || []);
      onToast('远程 SSH 节点探针已完成采集', 'ok');
    } catch (err) {
      onToast(`远程探针失败：${(err as Error).message}`, 'err');
    } finally {
      setProbing(false);
    }
  };

  const configuredRemotes = meta?.remotes || [];
  const fwSummary = fw?.summary;

  const filteredDevices = React.useMemo(() => {
    const list = ts?.devices || [];
    const q = tsQuery.trim().toLowerCase();
    return list.filter((dev) => {
      if (tsFilter === 'online' && !dev.online) return false;
      if (tsFilter === 'relay' && (dev.isSelf || dev.direct || !dev.relay)) return false;
      if (q) {
        const ip = dev.ip || dev.tailscaleIps?.[0] || '';
        const hay = `${dev.name || ''} ${dev.hostName || ''} ${ip} ${dev.os || ''} ${dev.relay || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ts?.devices, tsFilter, tsQuery]);

  const filteredListeners = React.useMemo(() => {
    const list = fw?.listeners || [];
    if (fwFilter === 'all') return list;
    return list.filter((l) => {
      const rawScope = String(l.scope || l.exposure || '').toLowerCase();
      return rawScope !== 'loopback';
    });
  }, [fw?.listeners, fwFilter]);

  return (
    <ModuleFrame
      title="网络、组网与防火墙"
      description="Tailscale Mesh 节点连通性、IP 快捷复制、Mihomo 代理流量、Syncthing 同步与只读端口暴露面审计。"
      meta={ts?.tailnet ? `Tailnet ${ts.tailnet}` : '本地网络视图'}
    >
      <Panel
        title="Tailscale Mesh 组网"
        description={
          ts?.selfName
            ? `本机 ${ts.selfName} (${ts.selfIp || '-'}) · 在线 ${ts.onlineCount ?? 0}/${ts.devices?.length ?? 0}`
            : 'WireGuard 点对点加密组网设备表（点击任意 IP 可一键复制）'
        }
        bodyClassName="p-0"
        actions={<StatusIndicator status={ts?.status || (ts?.reachable ? 'healthy' : 'offline')} />}
      >
        {!ts?.devices?.length ? (
          <EmptyState message={ts?.error || '未采集到 Tailscale 节点列表。'} />
        ) : (
          <>
            <div className="px-5 sm:px-6 py-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5">
              <SegmentedFilter
                value={tsFilter}
                onChange={setTsFilter}
                options={TS_FILTERS}
                ariaLabel="筛选 Tailscale 节点"
              />
              <div className="relative w-full sm:w-56">
                <Search
                  className="size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={1.75}
                />
                <input
                  type="search"
                  value={tsQuery}
                  onChange={(e) => setTsQuery(e.target.value)}
                  placeholder="搜索节点名、IP 或系统..."
                  aria-label="搜索 Tailscale 节点"
                  className={cn('h-9 sm:h-8 w-full pl-9 pr-3', inputBaseClass)}
                />
              </div>
            </div>
            {filteredDevices.length === 0 ? (
              <EmptyState
                title="没有匹配的 Tailscale 节点"
                message="当前过滤条件下无在线或中继设备。"
                action={{
                  label: '重置筛选',
                  onClick: () => {
                    setTsFilter('all');
                    setTsQuery('');
                  },
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                      <th className="py-2.5 pl-5 sm:pl-6 pr-3">节点名称</th>
                      <th className="py-2.5 px-3">系统</th>
                      <th className="py-2.5 px-3">Tailscale IP</th>
                      <th className="py-2.5 px-3">状态</th>
                      <th className="py-2.5 px-3">连接路径</th>
                      <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">流量 (RX / TX)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {filteredDevices.map((dev, idx) => {
                      const ip = dev.ip || dev.tailscaleIps?.[0] || '-';
                      const isCopied = copiedIp === ip;
                      const pathText = dev.isSelf
                        ? '本机控制面'
                        : dev.direct
                          ? `直连${dev.curAddr ? ` (${dev.curAddr})` : ''}`
                          : dev.relay
                            ? `DERP ${dev.relay}`
                            : '-';
                      return (
                        <tr key={dev.id || dev.name || idx} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out">
                          <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)] max-w-[200px] truncate">
                            {dev.name || dev.hostName}
                            {dev.isSelf && (
                              <span className="ml-2 font-mono text-[11.5px] text-[var(--accent)]">本机</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--ink-muted)] whitespace-nowrap">
                            {dev.os || '-'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {ip !== '-' ? (
                              <button
                                type="button"
                                onClick={() => void handleCopyIp(ip)}
                                title="点击复制 Tailscale IP"
                                className={cn(
                                  'group inline-flex items-center gap-1.5 font-mono text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] tabular-nums rounded px-1 -mx-1 py-0.5 hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer',
                                  FOCUS_RING,
                                )}
                              >
                                <span>{ip}</span>
                                {isCopied ? (
                                  <Check className="size-3 text-[var(--ok)]" strokeWidth={2} />
                                ) : (
                                  <Copy className="size-3 opacity-0 group-hover:opacity-80 transition-opacity" strokeWidth={1.75} />
                                )}
                              </button>
                            ) : (
                              <span className="font-mono text-[12.5px] text-[var(--ink-subtle)]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <StatusIndicator status={dev.online ? 'online' : 'offline'} />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] max-w-[220px] truncate" title={pathText}>
                            {pathText}
                          </td>
                          <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                            {dev.rxBytes != null || dev.txBytes != null
                              ? `${formatBytes(dev.rxBytes)} / ${formatBytes(dev.txBytes)}`
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Panel
          title="Mihomo 代理引擎"
          description={mihomo?.protocol || 'Mihomo REST Controller'}
          actions={<StatusIndicator status={mihomo?.status || (mihomo?.reachable ? 'healthy' : 'offline')} />}
        >
          {!mihomo?.enabled ? (
            <EmptyState message="Mihomo 连接器未启用。" />
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-3 gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">活跃连接</dt>
                  <dd className="mt-1 font-mono text-[18px] font-semibold text-[var(--ink)] tabular-nums truncate">
                    {formatCompactNumber(mihomo.activeConnections ?? 0)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">运行模式</dt>
                  <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] truncate">
                    {mihomo.mode || 'Rule'}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12px] text-[var(--ink-subtle)]">累计下行</dt>
                  <dd className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink)] tabular-nums truncate">
                    {formatBytes(mihomo.downloadTotal)}
                  </dd>
                </div>
              </dl>
              {mihomo.proxyGroups && mihomo.proxyGroups.length > 0 && (
                <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {mihomo.proxyGroups.slice(0, 5).map((grp) => (
                    <li key={grp.name} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--ink)] truncate">{grp.name}</span>
                      <span className="font-mono text-[12.5px] text-[var(--ink-muted)] truncate">
                        {grp.now || '-'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title="Syncthing 与按需 SSH 远程节点"
          description="零常驻代理的按需 SSH 健康采集，与本地文件同步状态。"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={handleProbeRemotes}
              disabled={probing}
            >
              <RefreshCw className={cn('size-4', probing && 'animate-spin')} strokeWidth={1.75} />
              {probing ? '探测中...' : '按需探测远程主机'}
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-[var(--ink)]">Syncthing 文件同步</div>
                <div className="text-[12.5px] text-[var(--ink-muted)] font-mono tabular-nums truncate">
                  {syncthing?.reachable
                    ? syncthing.folders != null || syncthing.devices != null
                      ? `${syncthing.folders ?? 0} 文件夹 · ${syncthing.devices ?? 0} 对端 · ${syncthing.latencyMs ?? 0}ms`
                      : `REST 健康检查通过 · ${syncthing.latencyMs ?? 0}ms`
                    : syncthing?.error || '未启用或离线'}
                </div>
              </div>
              <StatusIndicator status={syncthing?.status || (syncthing?.reachable ? 'healthy' : 'standby')} />
            </div>

            {remotes.length > 0 ? (
              <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {remotes.map((r) => (
                  <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--ink)] truncate">{r.name || r.id}</div>
                      <div className="font-mono text-[12px] text-[var(--ink-subtle)] truncate tabular-nums">
                        {[r.host, r.load ? `负载 ${r.load}` : null, r.memory, r.error]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <StatusIndicator status={r.ok || r.reachable ? 'healthy' : 'offline'} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-[var(--ink-subtle)] text-pretty">
                {configuredRemotes.length > 0
                  ? `已配置 ${configuredRemotes.length} 台远程 SSH 主机，点击右上角按钮执行按需只读探测。`
                  : '未配置按需 SSH 远程主机，可在配置文件 remotes 字段添加。'}
              </p>
            )}
          </div>
        </Panel>
      </div>

      {fw?.enabled && (
        <Panel
          title="只读防火墙与套接字暴露面审计"
          description={
            fwSummary
              ? `总监听 ${fwSummary.totalListeners ?? 0} · 仅回环 ${fwSummary.loopback ?? fwSummary.loopbackListeners ?? 0} · Tailnet ${fwSummary.tailnet ?? fwSummary.tailnetListeners ?? 0} · 公网直露 ${fwSummary.publicUnfiltered ?? 0} · 丢弃 ${formatCompactNumber(fwSummary.droppedPackets ?? 0)} 包`
              : '实时套接字监听与入站包过滤策略审计'
          }
          bodyClassName="p-0"
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <SegmentedFilter
                value={fwFilter}
                onChange={setFwFilter}
                options={FW_FILTERS}
                ariaLabel="按暴露范围筛选监听端口"
              />
              <StatusIndicator
                status={(fwSummary?.publicUnfiltered ?? 0) > 0 ? 'degraded' : fw.status || 'healthy'}
                label={(fwSummary?.publicUnfiltered ?? 0) > 0 ? `${fwSummary?.publicUnfiltered} 公网暴露` : '入站收敛'}
              />
            </div>
          }
        >
          {filteredListeners.length === 0 ? (
            <EmptyState
              message={
                fwFilter === 'exposed'
                  ? '所有监听套接字均仅绑定本地回环，无非回环暴露端口。'
                  : '未采集到监听套接字数据。'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                    <th className="py-2.5 pl-5 sm:pl-6 pr-3">监听地址</th>
                    <th className="py-2.5 px-3">协议</th>
                    <th className="py-2.5 px-3">进程</th>
                    <th className="py-2.5 px-3">暴露范围</th>
                    <th className="py-2.5 pl-3 pr-5 sm:pr-6">策略结论</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {filteredListeners.slice(0, 14).map((l, idx) => {
                    const addr = l.bind || l.address || '*';
                    const rawScope = l.scope || l.exposure || '';
                    const scopeLabel =
                      rawScope === 'loopback'
                        ? '仅本地回环'
                        : rawScope === 'tailnet'
                          ? 'Tailnet 内网'
                          : rawScope === 'public-wildcard'
                            ? '通配绑定 (0.0.0.0)'
                            : rawScope || '-';
                    const rawPosture = l.posture || l.policy || l.note || '';
                    const isRisk =
                      rawPosture.toLowerCase().includes('public-unfiltered') ||
                      rawPosture.toLowerCase() === 'public';
                    const postureLabel =
                      rawPosture === 'loopback'
                        ? '回环隔离'
                        : rawPosture === 'tailnet'
                          ? 'Tailnet 受控'
                          : rawPosture === 'tailnet-guarded'
                            ? '防火墙收敛'
                            : rawPosture === 'public-unfiltered'
                              ? '公网未过滤'
                              : rawPosture || '受控';
                    return (
                      <tr key={`${addr}:${l.port}:${idx}`} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out">
                        <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12.5px] text-[var(--ink)] tabular-nums whitespace-nowrap">
                          {addr}:{l.port}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] uppercase">
                          {l.proto || 'tcp'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[12.5px] text-[var(--ink-muted)] truncate max-w-[160px]">
                          {l.process || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--ink-muted)] whitespace-nowrap">
                          {scopeLabel}
                        </td>
                        <td className="py-2.5 pl-3 pr-5 sm:pr-6 whitespace-nowrap">
                          <StatusIndicator
                            status={isRisk ? 'degraded' : 'healthy'}
                            label={postureLabel}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </ModuleFrame>
  );
}
