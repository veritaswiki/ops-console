import React from 'react';
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import { Copy, Check, Trash2 } from 'lucide-react';
import type { FleetNode, ProbesResponse, SnapshotResponse } from '../types';
import {
  copyToClipboard,
  enrollProbe,
  revokeProbe,
  submitMobileCheckin,
} from '../api';
import {
  deviceTypeLabel,
  filterFleetNodes,
  formatBytes,
  formatRelativeAge,
  formatUptime,
  statusTone,
} from '../utils/format';
import {
  EmptyState,
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
  onRefresh,
  onRefreshProbes,
  onToast,
  onConfirm,
}: {
  snapshot: SnapshotResponse | null;
  probes: ProbesResponse | null;
  readOnly: boolean;
  onRefresh: () => Promise<void>;
  onRefreshProbes: () => Promise<void>;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const nodes = snapshot?.fleet?.nodes || [];
  const links = snapshot?.fleet?.links || [];
  const summary = snapshot?.fleet?.summary;

  const [selectedId, setSelectedId] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<DeviceFilter>('all');
  const [copiedKey, setCopiedKey] = React.useState('');

  // Mobile check-in state
  const [checkinForm, setCheckinForm] = React.useState({
    id: 'iphone-field',
    name: 'iPhone 移动终端',
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

  const filteredNodes = React.useMemo(
    () => filterFleetNodes(nodes, typeFilter),
    [nodes, typeFilter],
  );

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
  const healthyCount =
    summary?.healthy ?? nodes.filter((n) => statusTone(n.status) === 'ok').length;
  const degradedCount =
    summary?.degraded ?? nodes.filter((n) => statusTone(n.status) === 'warn').length;
  const offlineCount =
    summary?.offline ?? nodes.filter((n) => statusTone(n.status) === 'err').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--ink)] leading-tight">
            全球节点与探针
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--ink-muted)]">
            融合 Tailscale 组网、只推送探针与移动端签到，实时观测跨地域服务器、笔记本与手机状态。
          </p>
        </div>
        <div className="font-mono text-[12.5px] text-[var(--ink-muted)]">
          {summary
            ? `总计 ${summary.total ?? nodes.length} 台 · 在线 ${summary.online ?? 0} · 活跃链路 ${links.filter((l) => l.active).length}`
            : '等待采集'}
        </div>
      </div>

      <KpiStrip
        cells={[
          {
            label: '纳管设备总数',
            value: String(summary?.total ?? nodes.length),
            sub: `服务器 ${summary?.servers ?? 0} · 笔记本 ${summary?.laptops ?? 0} · 移动端 ${summary?.mobiles ?? 0}`,
          },
          {
            label: '在线与健康节点',
            value: `${summary?.online ?? healthyCount}/${summary?.total ?? nodes.length}`,
            sub: `健康 ${healthyCount} · 降级 ${degradedCount} · 离线 ${offlineCount}`,
            tone: offlineCount > 0 ? 'warn' : 'ok',
          },
          {
            label: '主动推送探针',
            value: String(summary?.probed ?? enrolledList.length),
            sub: '零开放入站端口 · Push-only 心跳',
          },
          {
            label: '已登记凭证',
            value: String(enrolledList.length),
            sub: 'SHA-256 令牌摘要存储',
          },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
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
          title={selectedNode ? selectedNode.name : '节点检视器'}
          description={
            selectedNode
              ? `${deviceTypeLabel(selectedNode.deviceType)} · ${selectedNode.region || 'Tailnet'}${selectedNode.role ? ` · ${selectedNode.role}` : ''}`
              : '从左侧地图或下方设备列表选择一个节点。'
          }
          actions={selectedNode ? <StatusIndicator status={selectedNode.status} /> : undefined}
        >
          {!selectedNode ? (
            <EmptyState message="未选中任何节点。" />
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px] pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">Tailscale IP</dt>
                  <dd className="mt-0.5 font-mono text-[var(--ink)]">
                    {selectedNode.tailscaleIp || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">系统平台</dt>
                  <dd className="mt-0.5 font-mono text-[var(--ink)] truncate">
                    {[selectedNode.os, selectedNode.arch].filter(Boolean).join(' / ') || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">最近心跳</dt>
                  <dd className="mt-0.5 font-mono text-[var(--ink)]">
                    {formatRelativeAge(selectedNode.lastHeartbeatAt || selectedNode.lastSeenAt, selectedNode.ageSec)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">运行时长</dt>
                  <dd className="mt-0.5 font-mono text-[var(--ink)]">
                    {formatUptime(selectedNode.uptimeSec)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">网络延迟 / 路径</dt>
                  <dd className="mt-0.5 font-mono text-[var(--ink)]">
                    {selectedNode.network?.rttMs != null ? `${Math.round(selectedNode.network.rttMs)}ms` : '-'}
                    {selectedNode.network?.relay ? ` (${selectedNode.network.relay})` : selectedNode.network?.direct ? ' (直连)' : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ink-subtle)]">采集模式</dt>
                  <dd className="mt-0.5 font-mono text-[var(--ink)]">
                    {selectedNode.probeMode || 'tailscale'}
                  </dd>
                </div>
              </dl>

              <div className="space-y-3 pb-3 border-b border-[var(--border-subtle)]">
                {selectedNode.cpu?.usagePct != null && (
                  <ResourceMeter
                    label="CPU 使用率"
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
                {selectedNode.disk?.usedPct != null && (
                  <ResourceMeter
                    label={`磁盘 (${selectedNode.disk.mount || '/'})`}
                    value={selectedNode.disk.usedPct}
                    valueText={`${Math.round(selectedNode.disk.usedPct)}%`}
                  />
                )}
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
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="全量纳管设备清单"
        description="按设备类型筛选，点击任意行同步聚焦至上方地图与节点检视器。"
        bodyClassName="p-0"
        actions={
          <SegmentedFilter
            value={typeFilter}
            onChange={setTypeFilter}
            options={DEVICE_TYPE_FILTERS}
            ariaLabel="设备类型筛选"
          />
        }
      >
        {filteredNodes.length === 0 ? (
          <EmptyState message="当前筛选条件下无纳管设备。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 pr-3">设备名称</th>
                  <th className="py-2.5 px-3">类型与地域</th>
                  <th className="py-2.5 px-3">状态</th>
                  <th className="py-2.5 px-3">Tailscale IP</th>
                  <th className="py-2.5 px-3 text-right">CPU / 电量</th>
                  <th className="py-2.5 px-3 text-right">延迟</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">最近上报</th>
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
                  return (
                    <tr
                      key={n.id}
                      onClick={() => setSelectedId(n.id)}
                      className={`cursor-pointer transition-colors ${
                        isSel ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <td className="py-3 pl-5 pr-3 font-medium text-[var(--ink)] whitespace-nowrap">
                        {n.name}
                      </td>
                      <td className="py-3 px-3 text-[var(--ink-muted)] whitespace-nowrap">
                        {deviceTypeLabel(n.deviceType)} · {n.region || 'Tailnet'}
                      </td>
                      <td className="py-3 px-3">
                        <StatusIndicator status={n.status} />
                      </td>
                      <td className="py-3 px-3 font-mono text-[12.5px] text-[var(--ink-muted)] whitespace-nowrap">
                        {n.tailscaleIp || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[12.5px] text-[var(--ink)] tabular-nums whitespace-nowrap">
                        {metric}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                        {n.network?.rttMs != null ? `${Math.round(n.network.rttMs)}ms` : '-'}
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right font-mono text-[12.5px] text-[var(--ink-subtle)] whitespace-nowrap">
                        {formatRelativeAge(n.lastHeartbeatAt || n.lastSeenAt, n.ageSec)}
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
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] font-mono text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
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
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">设备类型</span>
                <select
                  value={enrollForm.deviceType}
                  onChange={(e) => setEnrollForm((s) => ({ ...s, deviceType: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
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
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
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
                    className="w-full h-9 px-2.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] font-mono text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    step="any"
                    value={enrollForm.lon}
                    onChange={(e) => setEnrollForm((s) => ({ ...s, lon: e.target.value }))}
                    aria-label="探针经度"
                    className="w-full h-9 px-2.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] font-mono text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={enrollBusy || readOnly}
                  className="h-9 px-4 rounded-[7px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-45"
                >
                  {enrollBusy ? '正在签发...' : '签发探针令牌'}
                </button>
              </div>
            </form>

            {enrollResult?.token && (
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--ink)]">
                      一次性探针令牌（仅此显示一次）
                    </div>
                    <code className="mt-1 block font-mono text-[12.5px] text-[var(--accent)] break-all">
                      {enrollResult.token}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('token', enrollResult.token!)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    {copiedKey === 'token' ? <Check className="h-3.5 w-3.5 text-[var(--ok)]" /> : <Copy className="h-3.5 w-3.5" />}
                    复制令牌
                  </button>
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
                          <div className="relative rounded-[8px] bg-[var(--terminal-bg)] text-[var(--terminal-ink)] p-3.5 font-mono text-[12px] overflow-x-auto">
                            <button
                              type="button"
                              onClick={() => handleCopy(k, snippet)}
                              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded text-[11.5px] bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                            >
                              {copiedKey === k ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] font-mono text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">终端名称</span>
                <input
                  type="text"
                  required
                  value={checkinForm.name}
                  onChange={(e) => setCheckinForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">所在城市 / 地域</span>
                <input
                  type="text"
                  value={checkinForm.region}
                  onChange={(e) => setCheckinForm((s) => ({ ...s, region: e.target.value }))}
                  className="w-full h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
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
                    className="w-full h-9 px-2.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] font-mono text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="number"
                    step="any"
                    value={checkinForm.lon}
                    onChange={(e) => setCheckinForm((s) => ({ ...s, lon: e.target.value }))}
                    aria-label="签到经度"
                    className="w-full h-9 px-2.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] font-mono text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
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
                    className="h-9 px-2.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] font-mono text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="text"
                    value={checkinForm.note}
                    onChange={(e) => setCheckinForm((s) => ({ ...s, note: e.target.value }))}
                    placeholder="备注"
                    className="col-span-2 h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={checkinBusy || readOnly}
                  className="h-9 px-4 rounded-[7px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-45"
                >
                  {checkinBusy ? '正在上报...' : '立即签到上报'}
                </button>
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
                      <tr key={p.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="py-2.5 pr-3 font-medium text-[var(--ink)]">
                          {p.name || p.id}{' '}
                          <span className="font-mono text-[12px] text-[var(--ink-subtle)]">
                            ({p.id})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--ink-muted)]">
                          {deviceTypeLabel(p.deviceType)} · {p.region || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]">
                          {formatRelativeAge(p.lastSeenAt)}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => handleRevokeProbe(p.id, p.name)}
                            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--err)] hover:underline cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
