import React from 'react';
import {
  Activity,
  Cloud,
  ExternalLink,
  Network,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Terminal,
} from 'lucide-react';
import type {
  CloudflareSnapshot,
  MetaResponse,
  RemoteHostStatus,
  SnapshotResponse,
  TailscaleNetcheckResult,
  TailscalePingResult,
} from '../types';
import {
  fetchCloudflareStatus,
  fetchTailscaleNetcheck,
  pingTailscalePeer,
  probeRemotes,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { formatBytes, formatCompactNumber, formatRelativeAge } from '../utils/format';
import {
  Button,
  CopyAction,
  EmptyState,
  inputBaseClass,
  KpiStrip,
  Panel,
  SegmentedFilter,
  StatusIndicator,
} from '../components/ui';
import { ModuleFrame } from '../modules/ModuleFrame';

export type NetworkSubTab = 'overview' | 'tailscale' | 'cloudflare' | 'firewall';

const NETWORK_TABS = [
  { value: 'overview', label: '网络总览' },
  { value: 'tailscale', label: 'Tailscale 控制台' },
  { value: 'cloudflare', label: 'Cloudflare 局域网' },
  { value: 'firewall', label: '防火墙与端口' },
] as const;

const TS_FILTERS = [
  { value: 'all', label: '全部设备' },
  { value: 'online', label: '仅在线' },
  { value: 'offline', label: '仅离线' },
  { value: 'relay', label: 'DERP 中继' },
  { value: 'exit', label: '出口节点' },
] as const;

type TsFilter = (typeof TS_FILTERS)[number]['value'];

const FW_FILTERS = [
  { value: 'all', label: '全部监听' },
  { value: 'exposed', label: '仅非回环暴露' },
] as const;

type FwFilter = (typeof FW_FILTERS)[number]['value'];

function normalizeNetworkTab(raw?: string | null): NetworkSubTab {
  if (raw === 'tailscale' || raw === 'cloudflare' || raw === 'firewall' || raw === 'overview') {
    return raw;
  }
  return 'overview';
}

export function NetworkView({
  snapshot,
  meta,
  activeTab,
  onTabChange,
  onToast,
}: {
  snapshot: SnapshotResponse | null;
  meta: MetaResponse | null;
  activeTab?: string | null;
  onTabChange?: (tab: NetworkSubTab) => void;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [tab, setTab] = React.useState<NetworkSubTab>(() => normalizeNetworkTab(activeTab));
  const [remotes, setRemotes] = React.useState<RemoteHostStatus[]>([]);
  const [probing, setProbing] = React.useState(false);
  const [tsFilter, setTsFilter] = React.useState<TsFilter>('all');
  const [tsQuery, setTsQuery] = React.useState('');
  const [fwFilter, setFwFilter] = React.useState<FwFilter>('all');

  const [netcheck, setNetcheck] = React.useState<TailscaleNetcheckResult | null>(null);
  const [netcheckBusy, setNetcheckBusy] = React.useState(false);
  const [pingingIp, setPingingIp] = React.useState<string | null>(null);
  const [pingResults, setPingResults] = React.useState<Record<string, TailscalePingResult>>({});

  const [cfLive, setCfLive] = React.useState<CloudflareSnapshot | null>(null);
  const [cfRefreshing, setCfRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (activeTab) {
      setTab(normalizeNetworkTab(activeTab));
    }
  }, [activeTab]);

  const selectTab = (next: NetworkSubTab) => {
    setTab(next);
    onTabChange?.(next);
  };

  const net = snapshot?.network;
  const ts = net?.tailscale;
  const cf = cfLive || net?.cloudflare || snapshot?.cloudflare;
  const mihomo = net?.mihomo;
  const syncthing = net?.syncthing;
  const fw = snapshot?.firewall || net?.firewall;

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

  const handleRunNetcheck = async () => {
    setNetcheckBusy(true);
    try {
      const res = await fetchTailscaleNetcheck();
      if (res.netcheck) {
        setNetcheck(res.netcheck);
        if (res.netcheck.ok) {
          onToast(`Netcheck 完成 · 首选 DERP ${res.netcheck.preferredDerp || '-'}`, 'ok');
        } else {
          onToast(`Netcheck 异常：${res.netcheck.error || '无返回'}`, 'err');
        }
      }
    } catch (err) {
      onToast(`Netcheck 失败：${(err as Error).message}`, 'err');
    } finally {
      setNetcheckBusy(false);
    }
  };

  const handlePingPeer = async (target: string) => {
    if (!target || target === '-') return;
    setPingingIp(target);
    try {
      const res = await pingTailscalePeer(target);
      if (res.ping) {
        setPingResults((prev) => ({ ...prev, [target]: res.ping! }));
        if (res.ping.ok) {
          onToast(
            `Ping ${target} 成功：${res.ping.latencyMs ?? '-'}ms (${res.ping.direct ? '直连' : res.ping.via || '中继'})`,
            'ok',
          );
        } else {
          onToast(`Ping ${target} 失败：${res.ping.error || '超时或不可达'}`, 'err');
        }
      }
    } catch (err) {
      onToast(`Ping 失败：${(err as Error).message}`, 'err');
    } finally {
      setPingingIp((cur) => (cur === target ? null : cur));
    }
  };

  const handleRefreshCloudflare = async () => {
    setCfRefreshing(true);
    try {
      const res = await fetchCloudflareStatus();
      if (res.cloudflare) {
        setCfLive(res.cloudflare);
        onToast('Cloudflare 局域网与隧道状态已刷新', 'ok');
      }
    } catch (err) {
      onToast(`刷新 Cloudflare 状态失败：${(err as Error).message}`, 'err');
    } finally {
      setCfRefreshing(false);
    }
  };

  const configuredRemotes = meta?.remotes || [];
  const fwSummary = fw?.summary;
  const tsServes = ts?.serves || [];
  const tsFunnels = ts?.funnels || [];
  const tsDevices = ts?.devices || [];
  const tsOnlineCount = ts?.onlineCount ?? tsDevices.filter((d) => d.online).length;
  const tsOfflineCount = Math.max(0, tsDevices.length - tsOnlineCount);

  const filteredDevices = React.useMemo(() => {
    const list = tsDevices;
    const q = tsQuery.trim().toLowerCase();
    return list.filter((dev) => {
      if (tsFilter === 'online' && !dev.online) return false;
      if (tsFilter === 'offline' && dev.online) return false;
      if (tsFilter === 'relay' && (dev.isSelf || dev.direct || !dev.relay)) return false;
      if (tsFilter === 'exit' && !dev.exitNode && !dev.exitNodeOption) return false;
      if (q) {
        const ip = dev.ip || dev.tailscaleIps?.[0] || '';
        const hay = `${dev.name || ''} ${dev.hostName || ''} ${dev.dnsName || ''} ${ip} ${dev.os || ''} ${dev.relay || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tsDevices, tsFilter, tsQuery]);

  const filteredListeners = React.useMemo(() => {
    const list = fw?.listeners || [];
    if (fwFilter === 'all') return list;
    return list.filter((l) => {
      const rawScope = String(l.scope || l.exposure || '').toLowerCase();
      return rawScope !== 'loopback';
    });
  }, [fw?.listeners, fwFilter]);

  const headerTitle =
    tab === 'tailscale'
      ? 'Tailscale 内置控制台'
      : tab === 'cloudflare'
        ? 'Cloudflare 局域网与隧道控制台'
        : tab === 'firewall'
          ? '防火墙与端口暴露面审计'
          : '网络、组网与防火墙';

  const headerDesc =
    tab === 'tailscale'
      ? 'Tailnet 节点连通性、Peer 实时 Ping、DERP Netcheck 测速、Exit Node 与 Serve / Funnel 入口管理。'
      : tab === 'cloudflare'
        ? 'Cloudflare Tunnel (cloudflared)、Zero Trust WARP 私有局域网路由与 Ingress 服务暴露审计。'
        : tab === 'firewall'
          ? 'Linux iproute2 套接字监听范围与入站过滤策略只读核查。'
          : '统一总览 Tailscale Mesh、Cloudflare 局域网隧道、Mihomo 代理引擎、Syncthing 与防火墙暴露面。';

  const renderFirewallPanel = () => (
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
            status={(fwSummary?.publicUnfiltered ?? 0) > 0 ? 'degraded' : fw?.status || 'healthy'}
            label={(fwSummary?.publicUnfiltered ?? 0) > 0 ? `${fwSummary?.publicUnfiltered} 公网暴露` : '入站收敛'}
          />
        </div>
      }
    >
      {!fw?.enabled ? (
        <EmptyState message="防火墙连接器未启用。" />
      ) : filteredListeners.length === 0 ? (
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
              {filteredListeners.slice(0, tab === 'firewall' ? 50 : 14).map((l, idx) => {
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
  );

  return (
    <ModuleFrame
      title={headerTitle}
      description={headerDesc}
      meta={ts?.tailnet ? `Tailnet ${ts.tailnet}` : '本地网络视图'}
      actions={
        <SegmentedFilter
          value={tab}
          onChange={selectTab}
          options={NETWORK_TABS}
          ariaLabel="切换网络控制台子视图"
        />
      }
    >
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => selectTab('tailscale')}
              data-testid="network-card-tailscale"
              className={cn(
                'text-left rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer space-y-2',
                FOCUS_RING,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
                  <Network className="size-4 text-[var(--accent)]" strokeWidth={1.75} />
                  Tailscale 控制台
                </span>
                <StatusIndicator status={ts?.status || (ts?.reachable ? 'healthy' : 'offline')} />
              </div>
              <div className="font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums">
                在线 {tsOnlineCount}/{tsDevices.length} 节点 · {ts?.directCount ?? 0} 直连 · {tsServes.length} Serve
              </div>
              <div className="text-[12px] text-[var(--ink-subtle)] truncate">
                {ts?.selfName ? `${ts.selfName} (${ts.selfIp || '-'})` : '进入查看 Peer Ping、Netcheck 与 DERP'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectTab('cloudflare')}
              data-testid="network-card-cloudflare"
              className={cn(
                'text-left rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer space-y-2',
                FOCUS_RING,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
                  <Cloud className="size-4 text-[var(--accent)]" strokeWidth={1.75} />
                  Cloudflare 局域网
                </span>
                <StatusIndicator status={cf?.status || 'standby'} />
              </div>
              <div className="font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums">
                {cf?.activeTunnelsCount ?? 0} 活跃隧道 · {(cf?.lanRoutes?.length ?? 0) + (cf?.ingress?.length ?? 0)} 条路由
              </div>
              <div className="text-[12px] text-[var(--ink-subtle)] truncate">
                {cf?.warp?.connected
                  ? 'WARP Zero Trust 私有网络已接入'
                  : cf?.cloudflared?.installed
                    ? 'cloudflared 已安装，点击配置私有局域网'
                    : '点击查看 Zero Trust Tunnel / WARP 局域网控制台'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectTab('firewall')}
              data-testid="network-card-firewall"
              className={cn(
                'text-left rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer space-y-2',
                FOCUS_RING,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
                  <Shield className="size-4 text-[var(--accent)]" strokeWidth={1.75} />
                  防火墙与端口
                </span>
                <StatusIndicator
                  status={(fwSummary?.publicUnfiltered ?? 0) > 0 ? 'degraded' : fw?.status || 'healthy'}
                />
              </div>
              <div className="font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums">
                监听 {fwSummary?.totalListeners ?? 0} · Tailnet {fwSummary?.tailnet ?? fwSummary?.tailnetListeners ?? 0} · 公网直露 {fwSummary?.publicUnfiltered ?? 0}
              </div>
              <div className="text-[12px] text-[var(--ink-subtle)] truncate">
                丢弃 {formatCompactNumber(fwSummary?.droppedPackets ?? 0)} 入站包 · 点击进入端口审计
              </div>
            </button>
          </div>

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

          {fw?.enabled && renderFirewallPanel()}
        </>
      )}

      {tab === 'tailscale' && (
        <div className="space-y-6" data-testid="tailscale-console">
          <KpiStrip
            cells={[
              {
                label: 'Tailnet 状态',
                value: ts?.backendState || (ts?.reachable ? 'Running' : 'Offline'),
                sub: ts?.version ? `v${ts.version}` : 'CLI 只读采集',
                tone: ts?.reachable ? 'ok' : 'err',
              },
              {
                label: '节点在线 / 离线',
                value: `${tsOnlineCount} / ${tsOfflineCount}`,
                sub: `共 ${tsDevices.length} 台设备`,
              },
              {
                label: '直连 / DERP 中继',
                value: `${ts?.directCount ?? 0} / ${ts?.relayCount ?? 0}`,
                sub: ts?.magicDnsSuffix ? `MagicDNS · ${ts.magicDnsSuffix}` : 'WireGuard Mesh',
              },
              {
                label: 'Serve / Funnel 入口',
                value: `${tsServes.length} / ${tsFunnels.length}`,
                sub: ts?.funnelCapable ? '支持公网 Funnel' : '仅 Tailnet 内网',
              },
            ]}
          />

          {ts?.health && ts.health.length > 0 && (
            <div className="rounded-xl border border-[var(--warn)]/40 bg-[var(--surface-elevated)] px-5 py-3.5 text-[13px] text-[var(--ink)] space-y-1">
              <div className="font-semibold text-[var(--warn)]">Tailscale 健康告警</div>
              {ts.health.map((msg, idx) => (
                <div key={idx} className="font-mono text-[12px] text-[var(--ink-muted)]">
                  {msg}
                </div>
              ))}
            </div>
          )}

          <Panel
            title="Tailscale 节点与实时连通性"
            description={
              ts?.selfName
                ? `本机 ${ts.selfName} (${ts.selfIp || '-'})${ts.selfDnsName ? ` · ${ts.selfDnsName}` : ''}`
                : 'WireGuard 点对点加密组网设备表（支持复制 IP 与单节点 Ping 诊断）'
            }
            bodyClassName="p-0"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRunNetcheck}
                  disabled={netcheckBusy}
                  data-testid="tailscale-netcheck-btn"
                >
                  <Activity className={cn('size-3.5', netcheckBusy && 'animate-spin')} strokeWidth={1.75} />
                  {netcheckBusy ? '测速中...' : 'DERP Netcheck'}
                </Button>
                {ts?.adminConsoleUrl && (
                  <a
                    href={ts.adminConsoleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors',
                      FOCUS_RING,
                    )}
                  >
                    <span>官方 Admin</span>
                    <ExternalLink className="size-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                  </a>
                )}
                <StatusIndicator status={ts?.status || (ts?.reachable ? 'healthy' : 'offline')} />
              </div>
            }
          >
            {!tsDevices.length ? (
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
                  <div className="relative w-full sm:w-60">
                    <Search
                      className="size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      strokeWidth={1.75}
                    />
                    <input
                      type="search"
                      value={tsQuery}
                      onChange={(e) => setTsQuery(e.target.value)}
                      placeholder="搜索节点名、MagicDNS 或 IP..."
                      aria-label="搜索 Tailscale 节点"
                      className={cn('h-9 sm:h-8 w-full pl-9 pr-3', inputBaseClass)}
                    />
                  </div>
                </div>
                {filteredDevices.length === 0 ? (
                  <EmptyState
                    title="没有匹配的 Tailscale 节点"
                    message="当前过滤条件下无设备记录。"
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
                          <th className="py-2.5 px-3 text-right">流量 (RX / TX)</th>
                          <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">诊断</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                        {filteredDevices.map((dev, idx) => {
                          const ip = dev.ip || dev.tailscaleIps?.[0] || '-';
                          const pingRes = ip !== '-' ? pingResults[ip] : undefined;
                          const pathText = dev.isSelf
                            ? '本机控制面'
                            : dev.direct
                              ? `直连${dev.curAddr ? ` (${dev.curAddr})` : ''}`
                              : dev.relay
                                ? `DERP ${dev.relay}`
                                : dev.lastSeen
                                  ? `离线 (${formatRelativeAge(dev.lastSeen)})`
                                  : '-';
                          return (
                            <tr key={dev.id || dev.name || idx} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out">
                              <td className="py-2.5 pl-5 sm:pl-6 pr-3 max-w-[220px]">
                                <div className="font-medium text-[var(--ink)] truncate">
                                  {dev.name || dev.hostName}
                                  {dev.isSelf && (
                                    <span className="ml-1.5 font-mono text-[11px] text-[var(--accent)]">本机</span>
                                  )}
                                  {dev.expired && (
                                    <span className="ml-1.5 font-mono text-[11px] text-[var(--err)]">密钥过期</span>
                                  )}
                                  {(dev.exitNode || dev.exitNodeOption) && (
                                    <span className="ml-1.5 font-mono text-[11px] text-[var(--ink-subtle)]">Exit</span>
                                  )}
                                </div>
                                {dev.dnsName && (
                                  <div className="font-mono text-[11px] text-[var(--ink-subtle)] truncate">
                                    {dev.dnsName}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--ink-muted)] whitespace-nowrap">
                                {dev.os || '-'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {ip !== '-' ? (
                                  <CopyAction
                                    variant="inline"
                                    size="xs"
                                    text={ip}
                                    label={ip}
                                    copiedLabel={ip}
                                    title="点击复制 Tailscale IP"
                                    ariaLabel={`复制 Tailscale IP ${ip}`}
                                    className="font-mono text-[12.5px] tabular-nums -mx-1"
                                    onCopied={() => onToast(`已复制 Tailscale IP：${ip}`, 'ok')}
                                    onError={() => onToast('复制失败，请检查剪贴板权限', 'err')}
                                  />
                                ) : (
                                  <span className="font-mono text-[12.5px] text-[var(--ink-subtle)]">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <StatusIndicator status={dev.online ? 'online' : 'offline'} />
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] max-w-[220px] truncate" title={pathText}>
                                {pathText}
                                {pingRes && (
                                  <div className={cn('text-[11px] tabular-nums', pingRes.ok ? 'text-[var(--ok)]' : 'text-[var(--err)]')}>
                                    {pingRes.ok
                                      ? `Ping ${pingRes.latencyMs ?? '-'}ms · ${pingRes.direct ? '直连' : pingRes.via || 'DERP'}`
                                      : `Ping 失败: ${pingRes.error || '不可达'}`}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                                {dev.rxBytes != null || dev.txBytes != null
                                  ? `${formatBytes(dev.rxBytes)} / ${formatBytes(dev.txBytes)}`
                                  : '-'}
                              </td>
                              <td className="py-2.5 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap">
                                {!dev.isSelf && ip !== '-' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void handlePingPeer(ip)}
                                    disabled={pingingIp === ip}
                                  >
                                    <Radio className={cn('size-3.5', pingingIp === ip && 'animate-spin')} strokeWidth={1.75} />
                                    {pingingIp === ip ? 'Ping...' : 'Ping'}
                                  </Button>
                                ) : (
                                  <span className="font-mono text-[11.5px] text-[var(--ink-subtle)]">—</span>
                                )}
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
              title="DERP 中继与 Netcheck 测速"
              description="检测 UDP / NAT 穿透能力及各 DERP 区域实时延迟。"
              actions={
                <Button variant="secondary" size="sm" onClick={handleRunNetcheck} disabled={netcheckBusy}>
                  <RefreshCw className={cn('size-3.5', netcheckBusy && 'animate-spin')} strokeWidth={1.75} />
                  {netcheckBusy ? '检测中...' : '运行 Netcheck'}
                </Button>
              }
            >
              {netcheck ? (
                <div className="space-y-4">
                  <dl className="grid grid-cols-4 gap-3 pb-3 border-b border-[var(--border-subtle)] text-[12px]">
                    <div>
                      <dt className="text-[var(--ink-subtle)]">UDP</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-[var(--ink)]">{netcheck.udp ? 'OK' : 'Blocked'}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--ink-subtle)]">IPv4 / v6</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-[var(--ink)]">
                        {netcheck.ipv4 ? 'v4' : '-'} / {netcheck.ipv6 ? 'v6' : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--ink-subtle)]">首选 DERP</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-[var(--accent)]">{netcheck.preferredDerp || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--ink-subtle)]">NAT 类型</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-[var(--ink)]">
                        {netcheck.mappingVariesByDestIp ? '对称 NAT' : '宽松 NAT'}
                      </dd>
                    </div>
                  </dl>
                  {netcheck.derpRegions && netcheck.derpRegions.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
                      {netcheck.derpRegions.slice(0, 6).map((reg) => (
                        <li key={reg.regionId} className="py-1.5 flex items-center justify-between gap-2 font-mono tabular-nums">
                          <span className="text-[var(--ink)]">Region {reg.regionId}</span>
                          <span className="text-[var(--ink-muted)]">{reg.latencyMs != null ? `${reg.latencyMs} ms` : '-'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12.5px] text-[var(--ink-subtle)]">{netcheck.error || '无 DERP 延迟数据'}</p>
                  )}
                </div>
              ) : ts?.derpSummary && ts.derpSummary.length > 0 ? (
                <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {ts.derpSummary.map((entry) => (
                    <li key={entry.region} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-mono font-medium text-[var(--ink)] uppercase">DERP · {entry.region}</span>
                      <span className="font-mono text-[12px] text-[var(--ink-muted)] tabular-nums">
                        {entry.onlineCount} 在线 / 共 {entry.count} 节点
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="点击右上角「运行 Netcheck」获取当前主机到全球 DERP 中继节点的实时延迟。" />
              )}
            </Panel>

            <Panel
              title="Tailscale Serve & Funnel 入口"
              description="本机通过 Tailscale HTTPS Serve（内网）或 Funnel（公网）暴露的反向代理服务。"
            >
              {tsServes.length === 0 && tsFunnels.length === 0 ? (
                <EmptyState message="当前主机未配置 Tailscale Serve 或 Funnel 路由。" />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {[...tsServes, ...tsFunnels].map((rule, idx) => (
                    <li key={`${rule.url}:${rule.path}:${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[12.5px] font-medium text-[var(--ink)] truncate">
                          {rule.url}{rule.path && rule.path !== '/' ? rule.path : ''}
                        </div>
                        <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                          → {rule.target || '-'} · {rule.scope || 'tailnet only'}
                        </div>
                      </div>
                      {rule.url && (
                        <CopyAction
                          variant="icon"
                          size="sm"
                          text={rule.url}
                          ariaLabel={`复制 Serve URL ${rule.url}`}
                          onCopied={() => onToast(`已复制 Serve URL：${rule.url}`, 'ok')}
                          onError={() => onToast('复制失败，请检查剪贴板权限', 'err')}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === 'cloudflare' && (
        <div className="space-y-6" data-testid="cloudflare-console">
          <KpiStrip
            cells={[
              {
                label: 'cloudflared 客户端',
                value: cf?.cloudflared?.installed ? (cf.cloudflared.serviceActive ? '运行中' : '已安装') : '未安装',
                sub: cf?.cloudflared?.version || '支持 Tunnel & 私有局域网路由',
                tone: cf?.cloudflared?.serviceActive ? 'ok' : undefined,
              },
              {
                label: '活跃隧道',
                value: `${cf?.activeTunnelsCount ?? 0} / ${cf?.tunnels?.length ?? 0}`,
                numeric: { primary: cf?.activeTunnelsCount ?? 0, denominator: cf?.tunnels?.length ?? 0 },
                sub: cf?.tunnelName ? `隧道 ${cf.tunnelName}` : '按需检测本地隧道列表',
              },
              {
                label: 'WARP 私有局域网',
                value: cf?.warp?.connected ? '已接入' : cf?.warp?.installed ? cf.warp.state || '未连接' : '未安装',
                sub: cf?.warpRouting ? 'warp-routing 已启用' : 'Zero Trust Private LAN',
                tone: cf?.warp?.connected ? 'ok' : undefined,
              },
              {
                label: '局域网 / Ingress 路由',
                value: `${cf?.lanRoutes?.length ?? 0} / ${cf?.ingress?.length ?? 0}`,
                numeric: { primary: cf?.lanRoutes?.length ?? 0, denominator: cf?.ingress?.length ?? 0 },
                sub: cf?.cloudflared?.configDetected ? '已发现 config.yml' : '支持 config.json 声明 CIDR',
              },
            ]}
          />

          <Panel
            title="Cloudflare Tunnel 隧道与边缘节点"
            description="通过只读 cloudflared tunnel list 检测隧道在线状态、边缘 PoP 接入与私有局域网转发。"
            bodyClassName="p-0"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRefreshCloudflare}
                  disabled={cfRefreshing}
                  data-testid="cloudflare-refresh-btn"
                >
                  <RefreshCw className={cn('size-3.5', cfRefreshing && 'animate-spin')} strokeWidth={1.75} />
                  {cfRefreshing ? '检测中...' : '刷新状态'}
                </Button>
                <a
                  href={cf?.dashboardUrl || 'https://one.dash.cloudflare.com/'}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors',
                    FOCUS_RING,
                  )}
                >
                  <span>Zero Trust 控制台</span>
                  <ExternalLink className="size-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                </a>
                <StatusIndicator status={cf?.status || 'standby'} />
              </div>
            }
          >
            {!cf?.tunnels?.length ? (
              <EmptyState
                title="未检测到本地活跃的 Cloudflare Tunnel"
                message={
                  cf?.cloudflared?.installed
                    ? '本机已安装 cloudflared，但尚未登录或创建隧道；可在下方按步骤一键接入 Zero Trust 私有局域网。'
                    : '本机尚未安装 cloudflared 或 warp-cli；安装并完成 tunnel login 后此面板会自动接管隧道与路由视图。'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                      <th className="py-2.5 pl-5 sm:pl-6 pr-3">隧道名称</th>
                      <th className="py-2.5 px-3">Tunnel ID</th>
                      <th className="py-2.5 px-3">状态</th>
                      <th className="py-2.5 px-3">活跃连接</th>
                      <th className="py-2.5 pl-3 pr-5 sm:pr-6">边缘 PoP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {cf.tunnels.map((tun) => (
                      <tr key={tun.id || tun.name} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="py-2.5 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)]">{tun.name}</td>
                        <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]">{tun.id || '-'}</td>
                        <td className="py-2.5 px-3">
                          <StatusIndicator status={tun.status} />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[12.5px] text-[var(--ink)] tabular-nums">
                          {tun.connectionsCount}
                        </td>
                        <td className="py-2.5 pl-3 pr-5 sm:pr-6 font-mono text-[12px] text-[var(--ink-muted)] uppercase">
                          {tun.edgeColos && tun.edgeColos.length > 0 ? tun.edgeColos.join(', ') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Panel
              title="私有局域网 CIDR 与 Ingress 路由"
              description="展示 Zero Trust Private Network CIDR 路由段及 cloudflared Ingress 映射规则。"
            >
              {(!cf?.lanRoutes?.length && !cf?.ingress?.length) ? (
                <EmptyState message="尚未配置私有 CIDR 或 Ingress 规则，可在 ops-console 配置文件 connectors.cloudflare.lanRoutes 或 /etc/cloudflared/config.yml 中声明。" />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {(cf?.lanRoutes || []).map((route, idx) => (
                    <li key={`lan:${route.id || idx}`} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-[var(--ink)] truncate">{route.name}</div>
                        <div className="font-mono text-[12px] text-[var(--ink-muted)] truncate">
                          {route.cidr || route.hostname} {route.target ? `→ ${route.target}` : ''}
                        </div>
                        {route.comment && (
                          <div className="text-[11.5px] text-[var(--ink-subtle)] truncate">{route.comment}</div>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-[var(--accent)] shrink-0">Private LAN</span>
                    </li>
                  ))}
                  {(cf?.ingress || []).map((rule, idx) => (
                    <li key={`ing:${rule.hostname}:${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[12.5px] font-medium text-[var(--ink)] truncate">
                          {rule.hostname}{rule.path || ''}
                        </div>
                        <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                          → {rule.service}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--ink-subtle)] shrink-0">Ingress</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Zero Trust 局域网快速部署指引"
              description="与 Tailscale 互补的 Cloudflare Tunnel + WARP 私有网络接入步骤（点击一键复制命令）。"
            >
              <div className="space-y-3">
                {(cf?.setupHints && cf.setupHints.length > 0
                  ? cf.setupHints
                  : [
                      {
                        id: 'cf-verify',
                        title: '查看当前隧道与私有 CIDR 路由',
                        command: 'cloudflared tunnel list && cloudflared tunnel route ip show',
                        note: '验证 WARP 局域网路由是否已发布至 Cloudflare Edge',
                      },
                    ]
                ).map((hint) => (
                  <div
                    key={hint.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--ink)]">
                        <Terminal className="size-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                        {hint.title}
                      </span>
                      <CopyAction
                        variant="icon"
                        size="sm"
                        text={hint.command}
                        ariaLabel={`复制部署命令：${hint.title}`}
                        onCopied={() => onToast(`已复制部署命令：${hint.title}`, 'ok')}
                        onError={() => onToast('复制失败，请检查剪贴板权限', 'err')}
                      />
                    </div>
                    <pre className="font-mono text-[11.5px] text-[var(--ink-muted)] whitespace-pre-wrap break-all select-all">
                      {hint.command}
                    </pre>
                    {hint.note && (
                      <p className="text-[11.5px] text-[var(--ink-subtle)]">{hint.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'firewall' && renderFirewallPanel()}
    </ModuleFrame>
  );
}
