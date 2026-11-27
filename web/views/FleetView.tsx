import React from 'react';
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  Crown,
  ExternalLink,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import type { FleetNode, ProbeCommandItem, ProbesResponse, SnapshotResponse } from '../types';
import {
  copyToClipboard,
  enqueueProbeCommand,
  enrollProbe,
  fetchProbeCommands,
  revokeProbe,
  setLeadA2AAgent,
  submitMobileCheckin,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import {
  latencyTierVar,
  searchFleetNodes,
  sortFleetNodes,
  type FleetSortField,
  type SortDir,
} from '../lib/module-helpers';
import { ModuleFrame } from '../modules/ModuleFrame';
import {
  deviceTypeLabel,
  filterFleetNodes,
  formatBytes,
  formatRelativeAge,
  formatUptime,
  statusTone,
} from '../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  KpiStrip,
  Panel,
  ResourceMeter,
  SegmentedFilter,
  StatusIndicator,
  type ConfirmModalState,
} from '../components/ui';
import { SparklineChart, WorldMap } from '../components/WorldMap';

const DEVICE_TYPE_FILTERS = [
  { value: 'all', label: '全部设备' },
  { value: 'server', label: '服务器' },
  { value: 'laptop', label: '笔记本' },
  { value: 'mobile', label: '移动端' },
] as const;

type DeviceFilter = (typeof DEVICE_TYPE_FILTERS)[number]['value'];

export function FleetView({
  snapshot,
  probes,
  readOnly,
  activeFilter,
  onFilterChange,
  onRefresh,
  onRefreshProbes,
  onOpenNodeMcps,
  onOpenA2A,
  onToast,
  onConfirm,
}: {
  snapshot: SnapshotResponse | null;
  probes: ProbesResponse | null;
  readOnly: boolean;
  activeFilter?: string | null;
  onFilterChange?: (filter: DeviceFilter) => void;
  onRefresh: () => Promise<void>;
  onRefreshProbes: () => Promise<void>;
  onOpenNodeMcps?: (nodeId: string) => void;
  onOpenA2A?: () => void;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const nodes = snapshot?.fleet?.nodes || [];
  const links = snapshot?.fleet?.links || [];
  const summary = snapshot?.fleet?.summary;

  const [selectedId, setSelectedId] = React.useState('');
  const normalizeDeviceFilter = (raw?: string | null): DeviceFilter =>
    raw === 'server' || raw === 'laptop' || raw === 'mobile' ? raw : 'all';
  const [typeFilter, setTypeFilterState] = React.useState<DeviceFilter>(() => normalizeDeviceFilter(activeFilter));
  React.useEffect(() => {
    if (activeFilter) {
      setTypeFilterState(normalizeDeviceFilter(activeFilter));
    }
  }, [activeFilter]);
  const setTypeFilter = (next: DeviceFilter) => {
    setTypeFilterState(next);
    onFilterChange?.(next);
  };
  const [nodeQuery, setNodeQuery] = React.useState('');
  const [sortField, setSortField] = React.useState<FleetSortField>('status');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const [copiedKey, setCopiedKey] = React.useState('');
  const [nodeCommands, setNodeCommands] = React.useState<ProbeCommandItem[]>([]);
  const [cmdBusy, setCmdBusy] = React.useState<string | null>(null);

  // Mobile check-in state
  const [checkinForm, setCheckinForm] = React.useState({
    id: 'mobile-oncall',
    name: '移动值班终端',
    region: 'Tokyo, JP',
    lat: '35.6762',
    lon: '139.6503',
    batteryPct: '84',
    note: '移动巡检签到',
  });
  const [checkinBusy, setCheckinBusy] = React.useState(false);

  // Probe enroll state
  const [enrollForm, setEnrollForm] = React.useState({
    id: '',
    name: '',
    deviceType: 'server',
    region: 'Tokyo, JP',
    role: 'Edge Worker',
    lat: '35.6762',
    lon: '139.6503',
  });
  const [enrollBusy, setEnrollBusy] = React.useState(false);
  const [enrollResult, setEnrollResult] = React.useState<{
    token?: string;
    snippets?: { linux?: string; macos?: string; curl?: string };
  } | null>(null);

  React.useEffect(() => {
    if (!selectedId && nodes.length > 0) {
      const hub = nodes.find((n) => n.deviceType === 'hub') || nodes[0];
      setSelectedId(hub.id);
    } else if (selectedId && nodes.length > 0 && !nodes.some((n) => n.id === selectedId)) {
      setSelectedId(nodes[0].id);
    }
  }, [nodes, selectedId]);

  const selectedNode: FleetNode | null =
    nodes.find((n) => n.id === selectedId) || nodes[0] || null;

  const cmdAbortRef = React.useRef<AbortController | null>(null);

  const loadNodeCommands = React.useCallback(async (nodeId: string) => {
    cmdAbortRef.current?.abort();
    if (!nodeId) {
      setNodeCommands([]);
      return;
    }
    const controller = new AbortController();
    cmdAbortRef.current = controller;
    try {
      const res = await fetchProbeCommands(nodeId, controller.signal);
      if (!controller.signal.aborted) {
        setNodeCommands(res.items || []);
      }
    } catch {
      if (!controller.signal.aborted) {
        setNodeCommands([]);
      }
    }
  }, []);

  React.useEffect(() => {
    if (selectedNode?.id) {
      void loadNodeCommands(selectedNode.id);
    } else {
      setNodeCommands([]);
    }
    return () => {
      cmdAbortRef.current?.abort();
    };
  }, [selectedNode?.id, loadNodeCommands]);

  const handleEnqueueCommand = async (
    command: 'health-check' | 'collect-diag' | 'rotate-heartbeat' | 'mcp-sync',
  ) => {
    if (!selectedNode) return;
    if (readOnly) {
      onToast('只读模式已禁用探针指令下发', 'err');
      return;
    }
    setCmdBusy(command);
    try {
      await enqueueProbeCommand(selectedNode.id, command);
      onToast(`指令 ${command} 已入队，将在节点下次心跳拉取执行`, 'ok');
      await loadNodeCommands(selectedNode.id);
    } catch (err) {
      onToast(`指令入队失败：${(err as Error).message}`, 'err');
    } finally {
      setCmdBusy(null);
    }
  };

  const handleElectNodeHarnessAsLead = async (agentId: string, name: string) => {
    if (readOnly) {
      onToast('只读模式已禁用切换主 Agent', 'err');
      return;
    }
    try {
      await setLeadA2AAgent(agentId);
      onToast(`已将 ${name} 设为当前全网主 Agent (Lead Harness)`, 'ok');
      await onRefresh();
    } catch (err) {
      onToast(`切换主 Agent 失败：${(err as Error).message}`, 'err');
    }
  };

  const toggleSort = (field: FleetSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'status' || field === 'name' ? 'asc' : 'desc');
    }
  };

  const enrichedNodes = React.useMemo(() => {
    const linkRttByNode = new Map<string, number>();
    for (const l of links) {
      if (l.rttMs == null || !Number.isFinite(l.rttMs)) continue;
      if (l.to && !linkRttByNode.has(l.to)) linkRttByNode.set(l.to, l.rttMs);
    }
    return nodes.map((n) => {
      if (n.network?.rttMs != null) return n;
      const fallbackRtt = linkRttByNode.get(n.id);
      if (fallbackRtt == null) return n;
      return {
        ...n,
        network: {
          ...n.network,
          rttMs: fallbackRtt,
        },
      };
    });
  }, [nodes, links]);

  const filteredNodes = React.useMemo(() => {
    const byType = filterFleetNodes(enrichedNodes, typeFilter);
    const bySearch = searchFleetNodes(byType, nodeQuery);
    return sortFleetNodes(bySearch, sortField, sortDir);
  }, [enrichedNodes, typeFilter, nodeQuery, sortField, sortDir]);

  const maxRttMs = React.useMemo(() => {
    let max = 100;
    for (const n of enrichedNodes) {
      if (n.network?.rttMs != null && n.network.rttMs > max) {
        max = n.network.rttMs;
      }
    }
    return max;
  }, [enrichedNodes]);

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      onToast('已复制到剪贴板', 'ok');
      window.setTimeout(() => setCopiedKey(''), 1800);
    }
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      onToast('只读模式已禁用移动端签到', 'err');
      return;
    }
    setCheckinBusy(true);
    try {
      await submitMobileCheckin({
        id: checkinForm.id.trim(),
        name: checkinForm.name.trim(),
        region: checkinForm.region.trim(),
        lat: Number(checkinForm.lat),
        lon: Number(checkinForm.lon),
        batteryPct: checkinForm.batteryPct ? Number(checkinForm.batteryPct) : null,
        note: checkinForm.note.trim(),
      });
      onToast(`终端 ${checkinForm.name} 签到成功`, 'ok');
      await onRefresh();
    } catch (err) {
      onToast(`签到失败：${(err as Error).message}`, 'err');
    } finally {
      setCheckinBusy(false);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      onToast('只读模式已禁用探针注册', 'err');
      return;
    }
    if (!enrollForm.id.trim() || !enrollForm.name.trim()) {
      onToast('请填写探针 ID 与设备名称', 'err');
      return;
    }
    setEnrollBusy(true);
    try {
      const res = await enrollProbe({
        id: enrollForm.id.trim(),
        name: enrollForm.name.trim(),
        deviceType: enrollForm.deviceType,
        region: enrollForm.region.trim(),
        role: enrollForm.role.trim(),
        lat: Number(enrollForm.lat),
        lon: Number(enrollForm.lon),
      });
      setEnrollResult({
        token: res.token,
        snippets: res.snippets || res.install,
      });
      onToast(`探针 ${enrollForm.name} 已注册，请保存一次性令牌`, 'ok');
      await Promise.all([onRefresh(), onRefreshProbes()]);
    } catch (err) {
      onToast(`注册失败：${(err as Error).message}`, 'err');
    } finally {
      setEnrollBusy(false);
    }
  };

  const handleRevokeProbe = (probeId: string, name?: string) => {
    onConfirm({
      open: true,
      title: `吊销探针令牌：${name || probeId}`,
      description: '吊销后该节点将无法继续上报心跳，如需重新纳管需要重新生成令牌。',
      confirmLabel: '确认吊销',
      danger: true,
      onConfirm: async () => {
        try {
          await revokeProbe(probeId);
          onToast(`已吊销探针 ${name || probeId}`, 'ok');
          await Promise.all([onRefresh(), onRefreshProbes()]);
        } catch (err) {
          onToast(`吊销失败：${(err as Error).message}`, 'err');
        }
      },
    });
  };

  const cpuSeries = (selectedNode?.history || [])
    .map((h) => Number(h.cpuPct))
    .filter((v) => Number.isFinite(v));
  const memSeries = (selectedNode?.history || [])
    .map((h) => Number(h.memPct))
    .filter((v) => Number.isFinite(v));
  const rttSeries = (selectedNode?.history || [])
    .map((h) => Number(h.rttMs))
    .filter((v) => Number.isFinite(v));

  const enrolledList = probes?.probes || [];
  const totalCount = summary?.total ?? nodes.length;
  const healthyCount =
    summary?.healthy ?? nodes.filter((n) => statusTone(n.status) === 'ok').length;
  const onlineCount = summary?.online ?? healthyCount;
  const degradedCount =
    summary?.degraded ?? nodes.filter((n) => statusTone(n.status) === 'warn').length;
  const offlineCount =
    summary?.offline ?? nodes.filter((n) => statusTone(n.status) === 'err').length;
  const probedCount = summary?.probed ?? enrolledList.length;

  return (
    <ModuleFrame
      title="全球节点与探针"
      description="融合 Tailscale 组网、只推送探针与移动端签到，实时观测跨地域服务器、笔记本与手机状态。"
      meta={
        summary
          ? `总计 ${totalCount} 台 · 在线 ${onlineCount} · 活跃链路 ${links.filter((l) => l.active).length}`
          : '等待采集'
      }
    >

      <KpiStrip
        cells={[
          {
            label: '纳管设备总数',
            value: String(totalCount),
            numeric: { primary: totalCount },
            sub: `服务器 ${summary?.servers ?? 0} · 笔记本 ${summary?.laptops ?? 0} · 移动端 ${summary?.mobiles ?? 0}`,
          },
          {
            label: '在线与健康节点',
            value: `${onlineCount}/${totalCount}`,
            numeric: { primary: onlineCount, denominator: totalCount },
            sub: `健康 ${healthyCount} · 降级 ${degradedCount} · 离线 ${offlineCount}`,
            tone: offlineCount > 0 ? 'warn' : 'ok',
          },
          {
            label: '主动推送探针',
            value: String(probedCount),
            numeric: { primary: probedCount },
            sub: '零开放入站端口 · Push-only 心跳',
          },
          {
            label: '已登记凭证',
            value: String(enrolledList.length),
            numeric: { primary: enrolledList.length },
            sub: 'SHA-256 令牌摘要存储',
          },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <Panel
          className="xl:col-span-8"
          title="全球拓扑分布"
          description="支持缩放与拖拽平移，点击任意节点在右侧检视实时指标与历史趋势。"
        >
          <WorldMap
            nodes={nodes}
            links={links}
            selectedNodeId={selectedNode?.id || ''}
            onSelectNode={setSelectedId}
          />
        </Panel>

        <Panel
          className="xl:col-span-4"
          title={selectedNode ? selectedNode.name : '节点全维检视器'}
          description={
            selectedNode
              ? `${deviceTypeLabel(selectedNode.deviceType)} · ${selectedNode.region || 'Tailnet'}${selectedNode.role ? ` · ${selectedNode.role}` : ''}`
              : '从左侧地图或下方设备列表选择一个节点。'
          }
          actions={selectedNode ? <StatusIndicator status={selectedNode.status} /> : undefined}
        >
          {!selectedNode ? (
            <EmptyState message="未选中任何节点。" />
          ) : (() => {
            const nodeServices = selectedNode.watchedServices || selectedNode.services || [];
            const nodeDisks = Array.isArray(selectedNode.disks) && selectedNode.disks.length > 0
              ? selectedNode.disks
              : (selectedNode.disk?.usedPct != null
                ? [{ mount: selectedNode.disk.mount || '/', usedPct: selectedNode.disk.usedPct }]
                : []);
            const nodeMcps = selectedNode.mcps || [];
            const nodeHarnesses = selectedNode.harnesses || [];
            const diagnosticReason = selectedNode.offlineReason || (selectedNode.status !== 'healthy' ? selectedNode.statusReason : null);
            return (
              <div className="space-y-3">
                {diagnosticReason && (
                  <div
                    data-testid="node-offline-reason-banner"
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed',
                      statusTone(selectedNode.status) === 'err'
                        ? 'border-[var(--err-border)] bg-[var(--err-soft)] text-[var(--err)]'
                        : statusTone(selectedNode.status) === 'warn'
                          ? 'border-[var(--warn-border)] bg-[var(--warn-soft)] text-[var(--warn)]'
                          : 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--ink-muted)]',
                    )}
                  >
                    <div className="font-medium text-[12px] mb-0.5">
                      {statusTone(selectedNode.status) === 'err'
                        ? '离线诊断原因'
                        : statusTone(selectedNode.status) === 'warn'
                          ? '降级原因'
                          : '状态说明'}
                    </div>
                    <div>{diagnosticReason}</div>
                    {selectedNode.note && selectedNode.note !== diagnosticReason && (
                      <div className="mt-1 text-[11.5px] opacity-80">{selectedNode.note}</div>
                    )}
                  </div>
                )}
              <Tabs defaultValue="hardware" key={selectedNode.id}>
                <TabsList className="ui-tabs-list mb-4" data-testid="node-inspector-tabs">
                  <TabsTab value="hardware" className="ui-tabs-tab">
                    硬件与磁盘
                  </TabsTab>
                  <TabsTab value="services" className="ui-tabs-tab">
                    服务 ({nodeServices.length})
                  </TabsTab>
                  <TabsTab value="mcps" className="ui-tabs-tab">
                    MCP ({nodeMcps.length})
                  </TabsTab>
                  <TabsTab value="harnesses" className="ui-tabs-tab">
                    Agent ({nodeHarnesses.length})
                  </TabsTab>
                  <TabsIndicator className="ui-tabs-indicator" />
                </TabsList>

                <TabsPanel value="hardware" className="space-y-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] pb-4 border-b border-[var(--border-subtle)]">
                    <div className="min-w-0">
                      <dt className="text-[12px] text-[var(--ink-subtle)]">Tailscale IP</dt>
                      <dd className="mt-0.5 font-mono text-[var(--ink)] tabular-nums truncate">
                        {selectedNode.tailscaleIp ? (
                          <button
                            type="button"
                            onClick={() => void handleCopy(`inspector-ip-${selectedNode.id}`, selectedNode.tailscaleIp!)}
                            className={cn(
                              'inline-flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors duration-150 cursor-pointer rounded',
                              FOCUS_RING,
                            )}
                            title="点击复制 Tailscale IP"
                          >
                            <span>{selectedNode.tailscaleIp}</span>
                            {copiedKey === `inspector-ip-${selectedNode.id}` ? (
                              <Check className="size-3.5 text-[var(--ok)] shrink-0" strokeWidth={1.75} />
                            ) : (
                              <Copy className="size-3 text-[var(--ink-subtle)] shrink-0" strokeWidth={1.75} />
                            )}
                          </button>
                        ) : (
                          '-'
                        )}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[12px] text-[var(--ink-subtle)]">系统 / 内核</dt>
                      <dd
                        className="mt-0.5 font-mono text-[var(--ink)] truncate"
                        title={[selectedNode.os, selectedNode.arch, selectedNode.kernel].filter(Boolean).join(' / ')}
                      >
                        {[selectedNode.os, selectedNode.arch, selectedNode.kernel].filter(Boolean).join(' / ') || '-'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[12px] text-[var(--ink-subtle)]">最近心跳</dt>
                      <dd className="mt-0.5 font-mono text-[var(--ink)] tabular-nums truncate">
                        {formatRelativeAge(selectedNode.lastHeartbeatAt || selectedNode.lastSeenAt, selectedNode.ageSec ?? selectedNode.probeAgeSec)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[12px] text-[var(--ink-subtle)]">运行时长</dt>
                      <dd className="mt-0.5 font-mono text-[var(--ink)] tabular-nums truncate">
                        {formatUptime(selectedNode.uptimeSec)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[12px] text-[var(--ink-subtle)]">延迟 / 吞吐</dt>
                      <dd className="mt-0.5 font-mono text-[var(--ink)] tabular-nums truncate">
                        {selectedNode.network?.rttMs != null || selectedNode.rttMs != null
                          ? `${Math.round(selectedNode.network?.rttMs ?? selectedNode.rttMs ?? 0)}ms`
                          : '-'}
                        {selectedNode.network?.rxBytesPerSec != null
                          ? ` · ↓${formatBytes(selectedNode.network.rxBytesPerSec)}/s`
                          : (selectedNode.network?.relay ? ` (${selectedNode.network.relay})` : '')}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[12px] text-[var(--ink-subtle)]">采集模式</dt>
                      <dd className="mt-0.5 font-mono text-[var(--ink)] truncate">
                        {selectedNode.probeMode || 'tailscale'}
                        {selectedNode.cpu?.cores ? ` · ${selectedNode.cpu.cores}C` : ''}
                      </dd>
                    </div>
                  </dl>

                  <div className="space-y-3 pb-3 border-b border-[var(--border-subtle)]">
                    {selectedNode.cpu?.usagePct != null && (
                      <ResourceMeter
                        label={`CPU${selectedNode.cpu.load1 != null ? ` (Load ${selectedNode.cpu.load1.toFixed(2)})` : ''}`}
                        value={selectedNode.cpu.usagePct}
                        valueText={`${Math.round(selectedNode.cpu.usagePct)}%`}
                      />
                    )}
                    {selectedNode.memory?.usedPct != null && (
                      <ResourceMeter
                        label="内存占用"
                        value={selectedNode.memory.usedPct}
                        valueText={
                          selectedNode.memory.usedBytes && selectedNode.memory.totalBytes
                            ? `${formatBytes(selectedNode.memory.usedBytes)} / ${formatBytes(selectedNode.memory.totalBytes)}`
                            : `${Math.round(selectedNode.memory.usedPct)}%`
                        }
                      />
                    )}
                    {nodeDisks.map((disk) => (
                      <ResourceMeter
                        key={disk.mount}
                        label={`磁盘 (${disk.mount})`}
                        value={disk.usedPct ?? 0}
                        valueText={
                          disk.usedBytes && disk.totalBytes
                            ? `${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)} (${Math.round(disk.usedPct ?? 0)}%)`
                            : `${Math.round(disk.usedPct ?? 0)}%`
                        }
                      />
                    ))}
                    {selectedNode.battery?.percent != null && (
                      <ResourceMeter
                        label="电池电量"
                        value={selectedNode.battery.percent}
                        valueText={`${Math.round(selectedNode.battery.percent)}%${selectedNode.battery.charging ? ' · 充电中' : ''}`}
                        tone={selectedNode.battery.percent < 20 ? 'err' : 'ok'}
                      />
                    )}
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]">
                    <SparklineChart label="CPU 趋势" values={cpuSeries} unit="%" min={0} max={100} />
                    <SparklineChart label="内存趋势" values={memSeries} unit="%" tone="ok" min={0} max={100} />
                    {rttSeries.length > 0 && (
                      <SparklineChart label="RTT 延迟" values={rttSeries} unit="ms" tone="warn" min={0} />
                    )}
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[var(--ink)]">
                        零入站端口指令队列 (Pull-only)
                      </span>
                      <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                        {nodeCommands.filter((c) => c.status === 'queued').length} 待拉取
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        { id: 'health-check', label: '健康自检' },
                        { id: 'collect-diag', label: '采集诊断' },
                        { id: 'mcp-sync', label: '同步 MCP' },
                        { id: 'rotate-heartbeat', label: '立即心跳' },
                      ] as const).map((item) => (
                        <Button
                          key={item.id}
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || cmdBusy !== null}
                          onClick={() => void handleEnqueueCommand(item.id)}
                        >
                          <Send className="size-3 text-[var(--accent)]" strokeWidth={1.75} />
                          {cmdBusy === item.id ? '入队中...' : item.label}
                        </Button>
                      ))}
                    </div>
                    {nodeCommands.length > 0 && (
                      <ul className="divide-y divide-[var(--border-subtle)] text-[12px] pt-1">
                        {nodeCommands.slice(0, 3).map((cmd) => (
                          <li key={cmd.id} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="font-mono text-[var(--ink)] truncate">{cmd.command}</span>
                            <span
                              className={cn(
                                'font-mono text-[11px] shrink-0',
                                cmd.status === 'delivered' ? 'text-[var(--ok)]' : 'text-[var(--warn)]',
                              )}
                            >
                              {cmd.status === 'delivered' ? '已下发' : '等待心跳'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </TabsPanel>

                <TabsPanel value="services" className="space-y-3">
                  {nodeServices.length === 0 ? (
                    <EmptyState message="该节点尚未上报受管服务列表。" />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                      {nodeServices.map((svc, idx) => (
                        <li key={`${svc.name}-${idx}`} className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[12.5px] font-medium text-[var(--ink)] truncate">
                              {svc.name}
                            </div>
                            {(svc.role || svc.memoryMb != null) && (
                              <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums truncate">
                                {[svc.role, svc.memoryMb != null ? `${svc.memoryMb} MB` : ''].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                          <StatusIndicator status={svc.status === 'active' ? 'healthy' : svc.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsPanel>

                <TabsPanel value="mcps" className="space-y-3">
                  {nodeMcps.length === 0 ? (
                    <EmptyState
                      message="该节点暂未部署 MCP Server。"
                      action={
                        onOpenNodeMcps
                          ? { label: '部署 MCP 到此节点', onClick: () => onOpenNodeMcps(selectedNode.id) }
                          : undefined
                      }
                    />
                  ) : (
                    <>
                      <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                        {nodeMcps.map((mcp) => (
                          <li key={mcp.id} className="py-2.5 first:pt-0 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-[var(--ink)] truncate">{mcp.name}</div>
                              <div className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums truncate">
                                {mcp.transport} · {mcp.toolsCount ?? 0} tools
                                {mcp.latencyMs != null ? ` · ${mcp.latencyMs}ms` : ''}
                              </div>
                            </div>
                            <StatusIndicator status={mcp.enabled ? mcp.status : 'standby'} />
                          </li>
                        ))}
                      </ul>
                      {onOpenNodeMcps && (
                        <div className="pt-2 border-t border-[var(--border-subtle)]">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenNodeMcps(selectedNode.id)}
                          >
                            <ExternalLink className="size-3.5" strokeWidth={1.75} />
                            在全节点 MCP 控制台管理
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsPanel>

                <TabsPanel value="harnesses" className="space-y-3">
                  {nodeHarnesses.length === 0 ? (
                    <EmptyState
                      message="该节点尚未注册外部 A2A Agent Harness。"
                      action={
                        onOpenA2A
                          ? { label: '前往接入外部 Harness', onClick: onOpenA2A }
                          : undefined
                      }
                    />
                  ) : (
                    <>
                      <ul className="divide-y divide-[var(--border-subtle)] text-[13px]">
                        {nodeHarnesses.map((h) => {
                          const isLead = h.role === 'lead';
                          return (
                            <li key={h.id} className="py-2.5 first:pt-0 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex items-center gap-1.5">
                                  {isLead && <Crown className="size-3.5 text-[var(--accent)] shrink-0" />}
                                  <span className="font-medium text-[var(--ink)] truncate">{h.name}</span>
                                </div>
                                <StatusIndicator status={h.status} />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums truncate">
                                  {h.harness} · {isLead ? '主 Agent' : 'Worker'} · {h.skillsCount ?? 0} skills · {(h.boundMcpIds || []).length} MCP
                                </span>
                                {!isLead && !readOnly && (
                                  <button
                                    type="button"
                                    onClick={() => void handleElectNodeHarnessAsLead(h.id, h.name)}
                                    className="font-mono text-[11.5px] text-[var(--accent)] hover:underline cursor-pointer shrink-0"
                                  >
                                    设为主 Agent
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {onOpenA2A && (
                        <div className="pt-2 border-t border-[var(--border-subtle)]">
                          <Button variant="secondary" size="sm" onClick={onOpenA2A}>
                            <ExternalLink className="size-3.5" strokeWidth={1.75} />
                            打开 A2A 主从调度中心
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsPanel>
              </Tabs>
              </div>
            );
          })()}
        </Panel>
      </div>

      <Panel
        title="全量纳管设备对比矩阵"
        description="支持按状态、CPU、内存与 RTT 延迟多维排序对比，点击 IP 一键复制，点击行同步聚焦地图。"
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-44 sm:w-52">
              <Search
                className="size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={nodeQuery}
                onChange={(e) => setNodeQuery(e.target.value)}
                placeholder="搜索节点、地域或 IP..."
                aria-label="搜索纳管节点"
                data-testid="fleet-search-input"
                className={cn('w-full h-8 pl-8 pr-2.5 sm:text-[12.5px]', inputBaseClass)}
              />
            </div>
            <SegmentedFilter
              value={typeFilter}
              onChange={setTypeFilter}
              options={DEVICE_TYPE_FILTERS}
              ariaLabel="设备类型筛选"
            />
          </div>
        }
      >
        {filteredNodes.length === 0 ? (
          <EmptyState
            title="当前筛选下暂无节点"
            message="未找到符合条件的纳管设备，可重置筛选或搜索关键词。"
            action={
              typeFilter !== 'all' || nodeQuery
                ? {
                    label: '显示全部设备',
                    onClick: () => {
                      setTypeFilter('all');
                      setNodeQuery('');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="fleet-comparison-table">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 sm:pl-6 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer rounded',
                        FOCUS_RING,
                      )}
                    >
                      设备名称
                      {sortField === 'name' ? (
                        sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">类型与地域</th>
                  <th className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      data-testid="fleet-sort-status"
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer rounded',
                        FOCUS_RING,
                      )}
                    >
                      状态
                      {sortField === 'status' ? (
                        sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Tailscale IP</th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('cpu')}
                      data-testid="fleet-sort-cpu"
                      className={cn(
                        'inline-flex items-center justify-end gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer rounded',
                        FOCUS_RING,
                      )}
                    >
                      CPU / 电量
                      {sortField === 'cpu' ? (
                        sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('mem')}
                      data-testid="fleet-sort-mem"
                      className={cn(
                        'inline-flex items-center justify-end gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer rounded',
                        FOCUS_RING,
                      )}
                    >
                      内存
                      {sortField === 'mem' ? (
                        sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('rtt')}
                      data-testid="fleet-sort-rtt"
                      className={cn(
                        'inline-flex items-center justify-end gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer rounded',
                        FOCUS_RING,
                      )}
                    >
                      RTT 延迟
                      {sortField === 'rtt' ? (
                        sortDir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">服务 / MCP / A2A</th>
                  <th className="py-2.5 pl-3 pr-5 sm:pr-6 text-right">最近上报</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13.5px]">
                {filteredNodes.map((n) => {
                  const isSel = n.id === selectedNode?.id;
                  const metric =
                    n.battery?.percent != null
                      ? `电量 ${Math.round(n.battery.percent)}%`
                      : n.cpu?.usagePct != null
                        ? `${Math.round(n.cpu.usagePct)}%`
                        : '-';
                  const memPct = n.memory?.usedPct;
                  const rtt = n.network?.rttMs ?? n.rttMs ?? null;
                  const rttRatio = rtt != null ? Math.min(100, Math.max(8, Math.round((rtt / maxRttMs) * 100))) : 0;
                  const ipCopyKey = `row-ip-${n.id}`;
                  return (
                    <tr
                      key={n.id}
                      onClick={() => setSelectedId(n.id)}
                      className={cn(
                        'cursor-pointer transition-colors duration-150 ease-out',
                        isSel ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)]',
                      )}
                    >
                      <td className="py-3 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)] max-w-[200px] truncate" title={n.name}>
                        {n.name}
                      </td>
                      <td className="py-3 px-3 text-[var(--ink-muted)] whitespace-nowrap">
                        {deviceTypeLabel(n.deviceType)} · {n.region || 'Tailnet'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5 min-w-0 max-w-[260px]">
                          <StatusIndicator status={n.status} />
                          {(n.offlineReason || (n.status !== 'healthy' && n.statusReason)) && (
                            <span
                              data-testid="node-offline-reason"
                              title={n.offlineReason || n.statusReason || ''}
                              className={cn(
                                'text-[11.5px] leading-snug truncate',
                                statusTone(n.status) === 'err'
                                  ? 'text-[var(--err)]'
                                  : 'text-[var(--ink-subtle)]',
                              )}
                            >
                              {n.offlineReason || n.statusReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                        {n.tailscaleIp ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCopy(ipCopyKey, n.tailscaleIp!);
                            }}
                            title="点击复制 Tailscale IP"
                            className={cn(
                              'inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors cursor-pointer rounded',
                              FOCUS_RING,
                            )}
                          >
                            <span>{n.tailscaleIp}</span>
                            {copiedKey === ipCopyKey ? (
                              <Check className="size-3 text-[var(--ok)]" strokeWidth={2} />
                            ) : (
                              <Copy className="size-3 opacity-45" strokeWidth={1.75} />
                            )}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[12.5px] text-[var(--ink)] tabular-nums whitespace-nowrap">
                        {metric}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-3 text-right font-mono text-[12.5px] tabular-nums whitespace-nowrap',
                          memPct != null && memPct >= 85
                            ? 'text-[var(--warn)] font-medium'
                            : 'text-[var(--ink-muted)]',
                        )}
                      >
                        {memPct != null ? `${Math.round(memPct)}%` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[12.5px] tabular-nums whitespace-nowrap">
                        {rtt != null ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className="hidden sm:inline-block w-14 h-1.5 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                              <span
                                className="block h-full rounded-full"
                                style={{
                                  width: `${rttRatio}%`,
                                  backgroundColor: latencyTierVar(rtt),
                                }}
                              />
                            </span>
                            <span style={{ color: latencyTierVar(rtt) }}>
                              {Math.round(rtt)}ms
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--ink-subtle)]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                        {(n.watchedServices || n.services || []).length} svc · {(n.mcps || []).length} MCP · {(n.harnesses || []).length} A2A
                      </td>
                      <td className="py-3 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12.5px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap">
                        {formatRelativeAge(n.lastHeartbeatAt || n.lastSeenAt, n.ageSec ?? n.probeAgeSec)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="节点接入与探针凭证管理"
        description="注册零开放入站端口的 Push-only 探针，或通过移动端快速上报位置与电量。"
      >
        <Tabs defaultValue="enroll">
          <TabsList className="ui-tabs-list mb-5">
            <TabsTab value="enroll" className="ui-tabs-tab">
              注册新探针
            </TabsTab>
            <TabsTab value="checkin" className="ui-tabs-tab">
              移动端签到
            </TabsTab>
            <TabsTab value="credentials" className="ui-tabs-tab">
              已注册凭证 ({enrolledList.length})
            </TabsTab>
            <TabsIndicator className="ui-tabs-indicator" />
          </TabsList>

          <TabsPanel value="enroll" className="space-y-5">
            <form onSubmit={handleEnrollSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">节点 ID</span>
                <input
                  type="text"
                  required
                  value={enrollForm.id}
                  onChange={(e) => setEnrollForm((s) => ({ ...s, id: e.target.value }))}
                  placeholder="edge-tokyo-01"
                  className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">显示名称</span>
                <input
                  type="text"
                  required
                  value={enrollForm.name}
                  onChange={(e) => setEnrollForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Tokyo Edge Node"
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">设备类型</span>
                <select
                  value={enrollForm.deviceType}
                  onChange={(e) => setEnrollForm((s) => ({ ...s, deviceType: e.target.value }))}
                  className={cn('ui-select w-full h-9 pl-3 cursor-pointer', inputBaseClass)}
                >
                  <option value="server">服务器</option>
                  <option value="laptop">笔记本</option>
                  <option value="mobile">移动端</option>
                </select>
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">地域标签</span>
                <input
                  type="text"
                  value={enrollForm.region}
                  onChange={(e) => setEnrollForm((s) => ({ ...s, region: e.target.value }))}
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">纬度 / 经度</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={enrollForm.lat}
                    onChange={(e) => setEnrollForm((s) => ({ ...s, lat: e.target.value }))}
                    aria-label="探针纬度"
                    className={cn('w-full h-9 px-2.5 font-mono tabular-nums', inputBaseClass)}
                  />
                  <input
                    type="number"
                    step="any"
                    value={enrollForm.lon}
                    onChange={(e) => setEnrollForm((s) => ({ ...s, lon: e.target.value }))}
                    aria-label="探针经度"
                    className={cn('w-full h-9 px-2.5 font-mono tabular-nums', inputBaseClass)}
                  />
                </div>
              </label>
              <div className="flex items-end">
                <Button type="submit" variant="primary" size="md" disabled={enrollBusy || readOnly}>
                  {enrollBusy ? '正在签发...' : '签发探针令牌'}
                </Button>
              </div>
            </form>

            {enrollResult?.token && (
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[var(--ink)]">
                      一次性探针令牌（仅此显示一次）
                    </div>
                    <code className="mt-1 block font-mono text-[12.5px] text-[var(--accent)] break-all">
                      {enrollResult.token}
                    </code>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy('token', enrollResult.token!)}
                  >
                    {copiedKey === 'token' ? (
                      <Check className="size-4 text-[var(--ok)]" strokeWidth={1.75} />
                    ) : (
                      <Copy className="size-4" strokeWidth={1.75} />
                    )}
                    复制令牌
                  </Button>
                </div>

                {enrollResult.snippets && (
                  <Tabs defaultValue="linux">
                    <TabsList className="ui-tabs-list mb-3">
                      <TabsTab value="linux" className="ui-tabs-tab">Linux (systemd)</TabsTab>
                      <TabsTab value="macos" className="ui-tabs-tab">macOS (launchd)</TabsTab>
                      <TabsTab value="curl" className="ui-tabs-tab">cURL 心跳</TabsTab>
                      <TabsIndicator className="ui-tabs-indicator" />
                    </TabsList>
                    {(['linux', 'macos', 'curl'] as const).map((k) => {
                      const snippet = enrollResult.snippets?.[k] || '暂无安装脚本';
                      return (
                        <TabsPanel key={k} value={k}>
                          <div className="relative rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-4 font-mono text-[12px] overflow-x-auto">
                            <button
                              type="button"
                              onClick={() => handleCopy(k, snippet)}
                              className={cn(
                                'absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] bg-white/10 hover:bg-white/15 text-white transition-colors duration-150 ease-out active:scale-[0.97] cursor-pointer select-none',
                                FOCUS_RING,
                              )}
                            >
                              {copiedKey === k ? (
                                <Check className="size-3.5 text-emerald-400" strokeWidth={1.75} />
                              ) : (
                                <Copy className="size-3.5" strokeWidth={1.75} />
                              )}
                              复制
                            </button>
                            <pre className="m-0 pr-16 whitespace-pre-wrap">{snippet}</pre>
                          </div>
                        </TabsPanel>
                      );
                    })}
                  </Tabs>
                )}
              </div>
            )}
          </TabsPanel>

          <TabsPanel value="checkin">
            <form onSubmit={handleCheckinSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">终端 ID</span>
                <input
                  type="text"
                  required
                  value={checkinForm.id}
                  onChange={(e) => setCheckinForm((s) => ({ ...s, id: e.target.value }))}
                  className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">终端名称</span>
                <input
                  type="text"
                  required
                  value={checkinForm.name}
                  onChange={(e) => setCheckinForm((s) => ({ ...s, name: e.target.value }))}
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">所在城市 / 地域</span>
                <input
                  type="text"
                  value={checkinForm.region}
                  onChange={(e) => setCheckinForm((s) => ({ ...s, region: e.target.value }))}
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">纬度 / 经度</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={checkinForm.lat}
                    onChange={(e) => setCheckinForm((s) => ({ ...s, lat: e.target.value }))}
                    aria-label="签到纬度"
                    className={cn('w-full h-9 px-2.5 font-mono tabular-nums', inputBaseClass)}
                  />
                  <input
                    type="number"
                    step="any"
                    value={checkinForm.lon}
                    onChange={(e) => setCheckinForm((s) => ({ ...s, lon: e.target.value }))}
                    aria-label="签到经度"
                    className={cn('w-full h-9 px-2.5 font-mono tabular-nums', inputBaseClass)}
                  />
                </div>
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">电量 (%) 与备注</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={checkinForm.batteryPct}
                    onChange={(e) => setCheckinForm((s) => ({ ...s, batteryPct: e.target.value }))}
                    aria-label="电量百分比"
                    className={cn('h-9 px-2.5 font-mono tabular-nums', inputBaseClass)}
                  />
                  <input
                    type="text"
                    value={checkinForm.note}
                    onChange={(e) => setCheckinForm((s) => ({ ...s, note: e.target.value }))}
                    placeholder="备注"
                    className={cn('col-span-2 h-9 px-3', inputBaseClass)}
                  />
                </div>
              </label>
              <div className="flex items-end">
                <Button type="submit" variant="primary" size="md" disabled={checkinBusy || readOnly}>
                  {checkinBusy ? '正在上报...' : '立即签到上报'}
                </Button>
              </div>
            </form>
          </TabsPanel>

          <TabsPanel value="credentials">
            {enrolledList.length === 0 ? (
              <EmptyState message="尚未注册任何外部推送探针。" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                      <th className="py-2 pr-3">节点</th>
                      <th className="py-2 px-3">类型与地域</th>
                      <th className="py-2 px-3">最近心跳</th>
                      <th className="py-2 pl-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {enrolledList.map((p) => (
                      <tr key={p.id} className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out">
                        <td className="py-2.5 pr-3 font-medium text-[var(--ink)] max-w-[260px] truncate">
                          {p.name || p.id}{' '}
                          <span className="font-mono text-[12px] text-[var(--ink-subtle)]">
                            ({p.id})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--ink-muted)] whitespace-nowrap">
                          {deviceTypeLabel(p.deviceType)} · {p.region || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                          {formatRelativeAge(p.lastSeenAt)}
                        </td>
                        <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => handleRevokeProbe(p.id, p.name)}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12.5px] font-medium text-[var(--err)] hover:bg-[var(--err)]/10 transition-colors duration-150 ease-out cursor-pointer disabled:opacity-40 select-none',
                              FOCUS_RING,
                            )}
                          >
                            <Trash2 className="size-4" strokeWidth={1.75} />
                            吊销
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsPanel>
        </Tabs>
      </Panel>
    </ModuleFrame>
  );
}
