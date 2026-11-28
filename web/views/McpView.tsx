import React from 'react';
import { Drawer } from 'vaul';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type {
  FleetMcpServer,
  McpFleetResponse,
  SnapshotResponse,
  ToastHandler,
} from '../types';
import {
  deleteMcp,
  fetchMcps,
  registerMcp,
  syncMcpToNodes,
  testMcp,
  toggleMcp,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import { formatRelativeAge } from '../utils/format';
import {
  Button,
  EmptyState,
  inputBaseClass,
  KpiStrip,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  type ConfirmModalState,
} from '../components/ui';
import { ModuleFrame } from '../modules/ModuleFrame';

const TRANSPORT_FILTERS = [
  { value: 'all', label: '全部传输' },
  { value: 'streamable-http', label: 'Streamable HTTP' },
  { value: 'stdio', label: 'stdio' },
  { value: 'sse', label: 'SSE' },
] as const;

type TransportFilter = (typeof TRANSPORT_FILTERS)[number]['value'];

export function McpView({
  snapshot,
  readOnly,
  initialNodeId = '',
  onSnapshotChanged,
  onToast,
  onConfirm,
}: {
  snapshot: SnapshotResponse | null;
  readOnly: boolean;
  initialNodeId?: string;
  onSnapshotChanged: () => void;
  onToast: ToastHandler;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const fleetNodes = snapshot?.fleet?.nodes || [];

  const [data, setData] = React.useState<McpFleetResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [nodeFilter, setNodeFilter] = React.useState<string>(initialNodeId || 'all');
  const [transportFilter, setTransportFilter] = React.useState<TransportFilter>('all');
  const [query, setQuery] = React.useState('');
  const [expandedIds, setExpandedIds] = React.useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = React.useState<string>('');

  // Register drawer state
  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [registerBusy, setRegisterBusy] = React.useState(false);
  const [regForm, setRegForm] = React.useState({
    name: '',
    transport: 'streamable-http' as 'streamable-http' | 'stdio' | 'sse',
    endpoint: 'http://100.64.0.35:8788/mcp',
    command: 'npx',
    args: '-y @modelcontextprotocol/server-filesystem /srv/workspace',
    envRefs: '',
    scope: 'infra',
    description: '',
    nodeIds: ['hub-primary'] as string[],
  });

  // Sync drawer state
  const [syncTarget, setSyncTarget] = React.useState<FleetMcpServer | null>(null);
  const [syncNodeIds, setSyncNodeIds] = React.useState<string[]>([]);
  const [syncBusy, setSyncBusy] = React.useState(false);

  React.useEffect(() => {
    if (initialNodeId) {
      setNodeFilter(initialNodeId);
    }
  }, [initialNodeId]);

  const loadData = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetchMcps('', signal);
      if (!signal?.aborted) {
        setData(res);
      }
    } catch (err) {
      if (!signal?.aborted) {
        onToast(`加载 MCP 清单失败：${(err as Error).message}`, 'err');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onToast]);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const items = data?.items || [];
  const summary = data?.summary;

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (nodeFilter !== 'all' && item.nodeId !== nodeFilter) return false;
      if (transportFilter !== 'all' && item.transport !== transportFilter) return false;
      if (!q) return true;
      const toolNames = (item.tools || []).map((t) => t.name).join(' ');
      const hay = `${item.name} ${item.nodeName} ${item.nodeId} ${item.endpoint || ''} ${item.command || ''} ${item.scope || ''} ${toolNames}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, nodeFilter, transportFilter, query]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTest = async (item: FleetMcpServer) => {
    setBusyId(`test:${item.id}`);
    try {
      const res = await testMcp(item.id);
      if (res.ok) {
        onToast(`${item.name} (${item.nodeName})：${res.summary || '握手通过'}`, 'ok');
      } else {
        onToast(`${item.name} 拨测失败：${res.error || '不可达'}`, 'err');
      }
      await loadData();
      onSnapshotChanged();
    } catch (err) {
      onToast(`拨测失败：${(err as Error).message}`, 'err');
    } finally {
      setBusyId('');
    }
  };

  const handleToggle = async (item: FleetMcpServer) => {
    if (guardReadOnly(readOnly, onToast, item.enabled ? '停用 MCP 服务' : '启用 MCP 服务')) return;
    setBusyId(`toggle:${item.id}`);
    const prevEnabled = item.enabled;
    const nextEnabled = !prevEnabled;
    try {
      const res = await toggleMcp(item.id, nextEnabled);
      await loadData();
      onSnapshotChanged();
      onToast(
        `${item.name} 已${nextEnabled ? '启用' : '停用'}${res.queuedCommand ? '，已排入节点同步队列' : ''}`,
        'ok',
        {
          action: {
            label: '撤销',
            onClick: async () => {
              try {
                await toggleMcp(item.id, prevEnabled);
                await loadData();
                onSnapshotChanged();
                onToast(`已恢复 ${item.name} 为${prevEnabled ? '启用' : '停用'}`, 'info');
              } catch (undoErr) {
                onToast(extractErrorMessage(undoErr, '撤销失败'), 'err');
              }
            },
          },
        },
      );
    } catch (err) {
      onToast(extractErrorMessage(err, '切换 MCP 状态失败'), 'err');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = (item: FleetMcpServer) => {
    if (guardReadOnly(readOnly, onToast, '移除 MCP 服务')) return;
    onConfirm({
      open: true,
      title: `移除 MCP 服务：${item.name}`,
      description: `将从 ${item.nodeName} 的服务清单中移除该 MCP 配置。`,
      confirmLabel: '确认移除',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteMcp(item.id);
          onToast(`已移除 ${item.name}`, 'ok');
          await loadData();
          onSnapshotChanged();
        } catch (err) {
          onToast(extractErrorMessage(err, '移除 MCP 服务失败'), 'err');
        }
      },
    });
  };

  const handleOpenSync = (item: FleetMcpServer) => {
    setSyncTarget(item);
    const otherNodes = fleetNodes
      .filter((n) => n.id !== item.nodeId && n.deviceType !== 'mobile')
      .map((n) => n.id);
    setSyncNodeIds(otherNodes.slice(0, 1));
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '同步 MCP 配置')) return;
    if (!syncTarget || syncNodeIds.length === 0) return;
    setSyncBusy(true);
    try {
      const res = await syncMcpToNodes(syncTarget.id, syncNodeIds);
      onToast(
        `已同步 ${syncTarget.name} 至 ${res.synced.length} 台设备（已排入 ${res.queuedCommands.length} 条节点同步任务）`,
        'ok',
      );
      setSyncTarget(null);
      await loadData();
      onSnapshotChanged();
    } catch (err) {
      onToast(extractErrorMessage(err, '跨节点同步失败'), 'err');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardReadOnly(readOnly, onToast, '新增 MCP 服务')) return;
    if (regForm.nodeIds.length === 0) {
      onToast('请至少选择一个目标设备节点', 'err');
      return;
    }
    setRegisterBusy(true);
    try {
      const envRefs = regForm.envRefs
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await registerMcp({
        name: regForm.name.trim(),
        transport: regForm.transport,
        endpoint: regForm.transport === 'stdio' ? undefined : regForm.endpoint.trim(),
        command: regForm.transport === 'stdio' ? regForm.command.trim() : undefined,
        args: regForm.transport === 'stdio' ? regForm.args.trim() : undefined,
        nodeIds: regForm.nodeIds,
        envRefs,
        scope: regForm.scope.trim() || 'custom',
        description: regForm.description.trim(),
      });
      onToast(
        `已在 ${res.created.length} 个节点注册 MCP${res.queuedCommands.length > 0 ? `，并向远程探针入队 ${res.queuedCommands.length} 条同步指令` : ''}`,
        'ok',
      );
      setRegisterOpen(false);
      setRegForm((prev) => ({ ...prev, name: '', description: '', envRefs: '' }));
      await loadData();
      onSnapshotChanged();
    } catch (err) {
      onToast(`注册失败：${(err as Error).message}`, 'err');
    } finally {
      setRegisterBusy(false);
    }
  };

  const toggleNodeSelection = (nodeId: string, list: string[], setter: (next: string[]) => void) => {
    if (list.includes(nodeId)) {
      setter(list.filter((id) => id !== nodeId));
    } else {
      setter([...list, nodeId]);
    }
  };

  const onlinePct = summary && summary.total > 0
    ? Math.round((summary.online / summary.total) * 100)
    : 0;

  return (
    <ModuleFrame
      title="全节点 MCP 管理"
      description="统一管理主控节点、云端 VPS 与本地开发机上的所有 MCP Server，支持协议握手拨测、启停与跨设备一键同步下发。"
      meta={
        summary
          ? `${summary.online}/${summary.total} 在线 · 覆盖 ${summary.nodesCovered} 台设备 · ${summary.totalTools} 个工具`
          : '正在加载 MCP 拓扑'
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} strokeWidth={1.75} />
            刷新清单
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={readOnly}
            onClick={() => setRegisterOpen(true)}
            data-testid="mcp-register-btn"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            部署 / 注册 MCP
          </Button>
        </div>
      }
    >
      {summary && (
        <KpiStrip
          asymmetric
          cells={[
            {
              label: '全网 MCP 健康度',
              meta: `已启用 ${summary.enabled} 个`,
              value: `${summary.online}/${summary.total}`,
              ratioPct: onlinePct,
              sub: summary.degraded > 0 ? `${summary.degraded} 个节点 MCP 处于降级状态` : '全部已启用 MCP 协议握手正常',
              tone: summary.degraded > 0 ? 'warn' : 'ok',
            },
            {
              label: '纳管设备覆盖',
              value: String(summary.nodesCovered),
              numeric: { primary: summary.nodesCovered },
              sub: `共 ${fleetNodes.length} 台 Fleet 节点可下发同步`,
            },
            {
              label: '可用 MCP Tools 总数',
              value: String(summary.totalTools),
              numeric: { primary: summary.totalTools },
              sub: '可按需绑定给主 Agent 与 Worker',
            },
            {
              label: '协议传输分布',
              value: `${summary.byTransport['streamable-http'] || 0} / ${summary.byTransport.stdio || 0} / ${summary.byTransport.sse || 0}`,
              sub: 'Streamable HTTP · stdio · SSE',
            },
          ]}
        />
      )}

      {data && data.byNode.length > 0 && (
        <Panel
          title="按设备节点分布"
          description="点击任意设备节点卡片行即可聚焦筛选该设备上的全部 MCP 服务。"
          bodyClassName="p-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
            {data.byNode.map((nodeEntry) => {
              const active = nodeFilter === nodeEntry.nodeId;
              return (
                <button
                  key={nodeEntry.nodeId}
                  type="button"
                  onClick={() => setNodeFilter(active ? 'all' : nodeEntry.nodeId)}
                  className={cn(
                    'text-left px-5 py-4 transition-colors duration-150 cursor-pointer',
                    FOCUS_RING,
                    active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-hover)]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-medium text-[var(--ink)] truncate">
                      {nodeEntry.nodeName}
                    </span>
                    <span className="font-mono text-[12px] font-semibold text-[var(--accent)] tabular-nums shrink-0">
                      {nodeEntry.online}/{nodeEntry.total}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums truncate">
                    {nodeEntry.nodeId} · {nodeEntry.toolsCount} tools
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel
        title="全节点 MCP 服务目录"
        description="支持按设备节点、传输协议与工具名称过滤；远程节点变更自动经由 Pull-only 探针队列同步。"
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索 MCP、节点或工具..."
                aria-label="搜索 MCP 服务"
                data-testid="mcp-search-input"
                className={cn('w-full h-8 pl-8 pr-2.5 sm:text-[12.5px]', inputBaseClass)}
              />
            </div>
            <select
              value={nodeFilter}
              onChange={(e) => setNodeFilter(e.target.value)}
              aria-label="按节点筛选 MCP"
              data-testid="mcp-node-filter"
              className={cn('ui-select h-8 pl-2.5 sm:text-[12.5px] max-w-full min-w-0 cursor-pointer', inputBaseClass)}
            >
              <option value="all">全部设备 ({items.length})</option>
              {fleetNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
            <SegmentedFilter
              value={transportFilter}
              onChange={setTransportFilter}
              options={TRANSPORT_FILTERS}
              ariaLabel="按 MCP 传输协议筛选"
            />
          </div>
        }
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            title="未匹配到 MCP 服务"
            message="当前筛选条件下暂无已纳管的 MCP Server，可清除筛选或直接向节点部署新 MCP。"
            action={
              nodeFilter !== 'all' || transportFilter !== 'all' || query
                ? {
                    label: '显示全部 MCP',
                    onClick: () => {
                      setNodeFilter('all');
                      setTransportFilter('all');
                      setQuery('');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]" data-testid="mcp-list">
            {filteredItems.map((item) => {
              const expanded = Boolean(expandedIds[item.id]);
              const isTesting = busyId === `test:${item.id}`;
              const isToggling = busyId === `toggle:${item.id}`;
              return (
                <li key={item.id} className="px-5 sm:px-6 py-4 hover:bg-[var(--surface-hover)]/60 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer rounded',
                            FOCUS_RING,
                          )}
                        >
                          {expanded ? (
                            <ChevronDown className="size-4 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                          ) : (
                            <ChevronRight className="size-4 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                          )}
                          <span>{item.name}</span>
                        </button>
                        <StatusIndicator status={item.enabled ? item.status : 'standby'} />
                      </div>
                      <div className="pl-5.5 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[var(--ink-muted)]">{item.nodeName}</span>
                        <span>·</span>
                        <span>{item.transport}</span>
                        <span>·</span>
                        <span>{item.toolsCount} tools</span>
                        {item.latencyMs != null && (
                          <>
                            <span>·</span>
                            <span>{item.latencyMs}ms</span>
                          </>
                        )}
                        {item.syncState && (
                          <>
                            <span>·</span>
                            <span className={item.syncState === 'queued-sync' ? 'text-[var(--warn)]' : ''}>
                              {item.syncState === 'queued-sync' ? '待节点拉取同步' : item.syncState === 'probe-reported' ? '探针自动上报' : '配置已同步'}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="pl-5.5 font-mono text-[11.5px] text-[var(--ink-subtle)] truncate" title={item.endpoint || `${item.command || ''} ${(item.args || []).join(' ')}`}>
                        {item.endpoint || `${item.command || ''} ${(item.args || []).join(' ')}`.trim()}
                      </div>
                    </div>

                    <div className="pl-5.5 lg:pl-0 flex flex-wrap items-center gap-1.5 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isTesting}
                        onClick={() => void handleTest(item)}
                        data-testid={`mcp-test-${item.id}`}
                      >
                        <Zap className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                        {isTesting ? '拨测中...' : '握手测试'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={readOnly}
                        onClick={() => handleOpenSync(item)}
                      >
                        <Send className="size-3.5" strokeWidth={1.75} />
                        跨节点同步
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={readOnly || isToggling}
                        onClick={() => void handleToggle(item)}
                      >
                        {item.enabled ? '停用' : '启用'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={readOnly}
                        aria-label={`移除 ${item.name}`}
                        title="移除该 MCP"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 pl-5.5 pt-3 border-t border-[var(--border-subtle)] space-y-2.5 text-[12.5px]">
                      {item.description && (
                        <p className="text-[var(--ink-muted)]">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
                        <span>协议版本：{item.protocolVersion || '2025-03-26'}</span>
                        <span>作用域：{item.scope || 'general'}</span>
                        <span>最近检测：{formatRelativeAge(item.lastCheckedAt)}</span>
                        {item.envRefs && item.envRefs.length > 0 && (
                          <span>密钥引用：{item.envRefs.join(', ')}</span>
                        )}
                      </div>
                      {item.tools && item.tools.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[11.5px] font-medium text-[var(--ink-subtle)]">
                            已发现工具清单 ({item.tools.length})
                          </div>
                          <ul className="divide-y divide-[var(--border-subtle)]/70">
                            {item.tools.map((tool) => (
                              <li key={tool.name} className="py-1.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                <span className="font-mono text-[12px] text-[var(--ink)]">{tool.name}</span>
                                <span className="text-[12px] text-[var(--ink-subtle)]">{tool.description || '-'}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Register / Deploy MCP Vaul Drawer */}
      <Drawer.Root open={registerOpen} onOpenChange={setRegisterOpen} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px]" />
          <Drawer.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
              <div>
                <Drawer.Title className="text-[15px] font-semibold text-[var(--ink)]">
                  部署 / 注册全节点 MCP
                </Drawer.Title>
                <Drawer.Description className="text-[12px] text-[var(--ink-subtle)] mt-0.5">
                  可一次下发到多台 VPS 或本地设备，敏感变量仅记录 env:// 引用名。
                </Drawer.Description>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setRegisterOpen(false)} aria-label="关闭抽屉">
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <label className="block space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">MCP 名称</span>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="例如：Postgres Read-Only MCP"
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5 text-[13px]">
                  <span className="font-medium text-[var(--ink-muted)]">传输协议</span>
                  <select
                    value={regForm.transport}
                    onChange={(e) =>
                      setRegForm((s) => ({
                        ...s,
                        transport: e.target.value as 'streamable-http' | 'stdio' | 'sse',
                      }))
                    }
                    className={cn('ui-select w-full h-9 pl-3 cursor-pointer', inputBaseClass)}
                  >
                    <option value="streamable-http">Streamable HTTP</option>
                    <option value="stdio">stdio (本地进程声明)</option>
                    <option value="sse">SSE</option>
                  </select>
                </label>
                <label className="block space-y-1.5 text-[13px]">
                  <span className="font-medium text-[var(--ink-muted)]">作用域标签</span>
                  <input
                    type="text"
                    value={regForm.scope}
                    onChange={(e) => setRegForm((s) => ({ ...s, scope: e.target.value }))}
                    placeholder="infra / dev / memory"
                    className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                  />
                </label>
              </div>

              {regForm.transport === 'stdio' ? (
                <div className="space-y-3">
                  <label className="block space-y-1.5 text-[13px]">
                    <span className="font-medium text-[var(--ink-muted)]">可执行命令 (仅声明下发，不在控制面执行)</span>
                    <input
                      type="text"
                      required
                      value={regForm.command}
                      onChange={(e) => setRegForm((s) => ({ ...s, command: e.target.value }))}
                      placeholder="npx / uvx / node"
                      className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                    />
                  </label>
                  <label className="block space-y-1.5 text-[13px]">
                    <span className="font-medium text-[var(--ink-muted)]">启动参数</span>
                    <input
                      type="text"
                      value={regForm.args}
                      onChange={(e) => setRegForm((s) => ({ ...s, args: e.target.value }))}
                      placeholder="-y @modelcontextprotocol/server-git"
                      className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                    />
                  </label>
                </div>
              ) : (
                <label className="block space-y-1.5 text-[13px]">
                  <span className="font-medium text-[var(--ink-muted)]">MCP Endpoint URL (仅限 http/https)</span>
                  <input
                    type="url"
                    required
                    value={regForm.endpoint}
                    onChange={(e) => setRegForm((s) => ({ ...s, endpoint: e.target.value }))}
                    placeholder="http://100.64.0.35:8788/mcp"
                    className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                  />
                </label>
              )}

              <div className="space-y-2 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">目标部署设备 (可多选)</span>
                <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                  {fleetNodes.map((node) => {
                    const checked = regForm.nodeIds.includes(node.id);
                    return (
                      <label
                        key={node.id}
                        className="py-2 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleNodeSelection(node.id, regForm.nodeIds, (next) =>
                                setRegForm((s) => ({ ...s, nodeIds: next })),
                              )
                            }
                            className="accent-[var(--accent)]"
                          />
                          <span className="text-[var(--ink)] truncate">{node.name}</span>
                        </span>
                        <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] shrink-0">
                          {node.region || node.id}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">环境变量引用名 (逗号分隔，不存明文密钥)</span>
                <input
                  type="text"
                  value={regForm.envRefs}
                  onChange={(e) => setRegForm((s) => ({ ...s, envRefs: e.target.value }))}
                  placeholder="GITHUB_TOKEN, DB_RO_URL"
                  className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                />
              </label>

              <label className="block space-y-1.5 text-[13px]">
                <span className="font-medium text-[var(--ink-muted)]">用途说明</span>
                <input
                  type="text"
                  value={regForm.description}
                  onChange={(e) => setRegForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="例如：供主 Agent 查询边缘节点只读指标"
                  className={cn('w-full h-9 px-3', inputBaseClass)}
                />
              </label>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="md" onClick={() => setRegisterOpen(false)}>
                  取消
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={registerBusy || readOnly}>
                  {registerBusy ? '正在下发...' : `部署到 ${regForm.nodeIds.length} 台设备`}
                </Button>
              </div>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Cross-Node Sync Vaul Drawer */}
      <Drawer.Root open={Boolean(syncTarget)} onOpenChange={(open) => !open && setSyncTarget(null)} direction="right">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px]" />
          <Drawer.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-[440px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
              <div>
                <Drawer.Title className="text-[15px] font-semibold text-[var(--ink)]">
                  跨设备同步 MCP 配置
                </Drawer.Title>
                <Drawer.Description className="text-[12px] text-[var(--ink-subtle)] mt-0.5">
                  将 {syncTarget?.name} 的声明复制至其他节点，并自动下发 Pull-only mcp-sync 指令。
                </Drawer.Description>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSyncTarget(null)} aria-label="关闭同步抽屉">
                <X className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleSyncSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="text-[12.5px] text-[var(--ink-muted)] font-mono">
                源节点：{syncTarget?.nodeName} ({syncTarget?.nodeId})
              </div>
              <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                {fleetNodes
                  .filter((n) => n.id !== syncTarget?.nodeId)
                  .map((node) => {
                    const checked = syncNodeIds.includes(node.id);
                    return (
                      <label
                        key={node.id}
                        className="py-2.5 flex items-center justify-between gap-2 text-[13px] cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleNodeSelection(node.id, syncNodeIds, setSyncNodeIds)}
                            className="accent-[var(--accent)]"
                          />
                          <span className="text-[var(--ink)] truncate">{node.name}</span>
                        </span>
                        <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] shrink-0">
                          {node.tailscaleIp || node.id}
                        </span>
                      </label>
                    );
                  })}
              </div>
              <div className="pt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="md" onClick={() => setSyncTarget(null)}>
                  取消
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={syncBusy || syncNodeIds.length === 0}>
                  {syncBusy ? '正在同步...' : `同步至 ${syncNodeIds.length} 台节点`}
                </Button>
              </div>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </ModuleFrame>
  );
}
