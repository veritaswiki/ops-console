import React from 'react';
import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  FileText,
  RotateCw,
  Search,
} from 'lucide-react';
import type {
  LogNavigationRequest,
  MetaResponse,
  ServiceItem,
  SnapshotResponse,
  ToastHandler,
} from '../types';
import { executeServiceAction, issueConfirmToken } from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import {
  filterServices,
  formatBytes,
  layerLabel,
  statusTone,
} from '../utils/format';
import {
  AnimatedCollapse,
  Button,
  DisclosureChevron,
  EmptyState,
  inputBaseClass,
  LatencyMeter,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  type ConfirmModalState,
} from '../components/ui';
import { ServiceAdminModal } from '../components/ServiceAdminModal';
import { ServiceLogModal } from '../components/ServiceLogModal';
import { ModuleFrame } from '../modules/ModuleFrame';

const LAYER_FILTERS = [
  { value: 'all', label: '全部层级' },
  { value: 'core', label: '核心服务' },
  { value: 'memory', label: '记忆引擎' },
  { value: 'agents', label: '网关与 Agent' },
  { value: 'network', label: '网络底座' },
] as const;

type LayerFilter = (typeof LAYER_FILTERS)[number]['value'];
type SortField = 'status' | 'name' | 'latency' | 'memory';
type SortDir = 'asc' | 'desc';

const ACTION_LABELS: Record<string, string> = {
  start: '启动',
  stop: '停止',
  restart: '重启',
  reload: '重载配置',
};

const STATUS_SEVERITY_RANK: Record<string, number> = {
  err: 0,
  warn: 1,
  muted: 2,
  ok: 3,
};

function hasServiceAdminUi(svc: ServiceItem): boolean {
  return Boolean(svc.hasAdminUi || svc.embedUrl || svc.adminUrl || svc.tailnetUrl);
}

function safeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) return trimmed;
  return null;
}

export function ServicesView({
  snapshot,
  meta,
  readOnly,
  activeLayer,
  onLayerChange,
  onRefresh,
  onOpenLogs,
  onToast,
  onConfirm,
}: {
  snapshot: SnapshotResponse | null;
  meta: MetaResponse | null;
  readOnly: boolean;
  activeLayer?: string | null;
  onLayerChange?: (layer: LayerFilter) => void;
  onRefresh: () => Promise<void>;
  onOpenLogs: (unitOrRequest: string | LogNavigationRequest, level?: 'all' | 'error' | 'warn') => void;
  onToast: ToastHandler;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const normalizeLayer = (raw?: string | null): LayerFilter =>
    raw === 'core' || raw === 'memory' || raw === 'agents' || raw === 'network' ? raw : 'all';
  const [layer, setLayerState] = React.useState<LayerFilter>(() => normalizeLayer(activeLayer));
  React.useEffect(() => {
    if (activeLayer) {
      setLayerState(normalizeLayer(activeLayer));
    }
  }, [activeLayer]);
  const setLayer = (next: LayerFilter) => {
    setLayerState(next);
    onLayerChange?.(next);
  };
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [sortField, setSortField] = React.useState<SortField>('status');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [adminService, setAdminService] = React.useState<ServiceItem | null>(null);
  const [logModalState, setLogModalState] = React.useState<{
    service: ServiceItem;
    level: 'all' | 'error' | 'warn';
  } | null>(null);

  const allServices = snapshot?.services?.items || [];
  const adminServices = React.useMemo(
    () => allServices.filter(hasServiceAdminUi),
    [allServices],
  );
  const filtered = React.useMemo(() => {
    const base = filterServices(allServices, { layer, status: statusFilter, query });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      if (sortField === 'status') {
        const ra = STATUS_SEVERITY_RANK[statusTone(a.status)] ?? 4;
        const rb = STATUS_SEVERITY_RANK[statusTone(b.status)] ?? 4;
        if (ra !== rb) return (ra - rb) * dir;
        return (a.name || a.id).localeCompare(b.name || b.id);
      }
      if (sortField === 'latency') {
        const la = a.probe?.latencyMs ?? -1;
        const lb = b.probe?.latencyMs ?? -1;
        return (la - lb) * dir;
      }
      if (sortField === 'memory') {
        const ma = a.memoryBytes ?? a.memoryCurrent ?? -1;
        const mb = b.memoryBytes ?? b.memoryCurrent ?? -1;
        return (ma - mb) * dir;
      }
      return (a.name || a.id).localeCompare(b.name || b.id) * dir;
    });
  }, [allServices, layer, statusFilter, query, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'latency' || field === 'memory' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="size-3 text-[var(--ink-subtle)]/70" strokeWidth={1.75} />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="size-3 text-[var(--accent)]" strokeWidth={2} />
    ) : (
      <ArrowDown className="size-3 text-[var(--accent)]" strokeWidth={2} />
    );
  };

  const hasActiveFilters = layer !== 'all' || statusFilter !== 'all' || query.trim().length > 0;
  const resetFilters = () => {
    setLayer('all');
    setStatusFilter('all');
    setQuery('');
  };

  const healthyCount = allServices.filter((s) => statusTone(s.status) === 'ok').length;
  const issueCount = allServices.filter((s) => {
    const t = statusTone(s.status);
    return t === 'err' || t === 'warn';
  }).length;

  const runServiceAction = async (svc: ServiceItem, action: string, isCritical: boolean) => {
    try {
      let serverToken: string | undefined;
      if (isCritical) {
        const issued = await issueConfirmToken(svc.unit || svc.id, action);
        serverToken = issued.confirmToken;
      }
      await executeServiceAction(svc.id, action, serverToken);
      onToast(`服务「${svc.name || svc.id}」已完成${ACTION_LABELS[action] || action}`, 'ok');
      await onRefresh();
    } catch (err) {
      onToast(extractErrorMessage(err, `执行${ACTION_LABELS[action] || action}失败`), 'err');
    }
  };

  const triggerAction = (svc: ServiceItem, action: string) => {
    if (!action) return;
    if (guardReadOnly(readOnly, onToast, `${ACTION_LABELS[action] || action}服务`)) {
      return;
    }
    const isCritical = Boolean(svc.risk === 'critical' || svc.critical);
    const isDestructive = action === 'stop' || (isCritical && action === 'restart');

    // Tier 0: non-critical start/reload executes immediately without blocking modal
    if (!isCritical && (action === 'start' || action === 'reload')) {
      void runServiceAction(svc, action, false);
      return;
    }

    const requireToken =
      isCritical && (action === 'stop' || action === 'restart')
        ? `CONFIRM:${svc.id}`
        : undefined;

    onConfirm({
      open: true,
      title: `${ACTION_LABELS[action] || action}服务：${svc.name || svc.id}`,
      description: isCritical
        ? `「${svc.name || svc.id}」属于核心关键服务，${ACTION_LABELS[action] || action}期间可能短暂影响关联功能，操作会写入审计记录。`
        : `将对服务「${svc.name || svc.id}」（${svc.unit}）执行${ACTION_LABELS[action] || action}操作，并记录到审计日志。`,
      confirmLabel: `确认${ACTION_LABELS[action] || action}`,
      danger: isDestructive,
      requireToken,
      requireTokenLabel: requireToken ? '此为关键服务，请输入下方确认口令以防误操作' : undefined,
      onConfirm: () => runServiceAction(svc, action, isCritical),
    });
  };

  return (
    <ModuleFrame
      title="受管服务"
      description="查看各服务运行状态、响应延迟与资源占用，支持快速查阅日志和安全的启停控制。"
      meta={`健康 ${healthyCount}/${allServices.length} · 异常 ${issueCount} · 显示 ${filtered.length} 项`}
    >
      {adminServices.length > 0 && (
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-3.5 shadow-[var(--shadow-card)] space-y-2.5"
          data-testid="services-admin-strip"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
              <AppWindow className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
              <span>受管服务管理后台快捷窗口</span>
            </div>
            <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums">
              {adminServices.length} 个服务已接入内置后台
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {adminServices.map((svc) => {
              const tone = statusTone(svc.status);
              const dotClass =
                tone === 'ok'
                  ? 'bg-[var(--ok-dot)]'
                  : tone === 'warn'
                    ? 'bg-[var(--warn-dot)]'
                    : tone === 'err'
                      ? 'bg-[var(--err-dot)]'
                      : 'bg-[var(--muted-dot)]';
              return (
                <button
                  key={svc.id}
                  type="button"
                  data-testid={`quick-admin-${svc.id}`}
                  onClick={() => setAdminService(svc)}
                  title={`打开 ${svc.name || svc.id} 管理后台`}
                  className={cn(
                    'h-8 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] inline-flex items-center gap-2 text-[12.5px] font-medium text-[var(--ink)] transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] cursor-pointer select-none',
                    FOCUS_RING,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass)} aria-hidden="true" />
                  <AppWindow className="size-3.5 text-[var(--ink-subtle)] shrink-0" strokeWidth={1.75} />
                  <span>{svc.adminLabel || svc.name || svc.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Panel bodyClassName="p-0">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
          <SegmentedFilter
            value={layer}
            onChange={setLayer}
            options={LAYER_FILTERS}
            ariaLabel="按服务层级筛选"
          />
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search
                className="size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索服务、单元或端口..."
                aria-label="搜索受管服务"
                className={cn('h-9 sm:h-8 w-full sm:w-56 pl-9 pr-3', inputBaseClass)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="按健康状态筛选"
              className={cn(
                'ui-select h-9 sm:h-8 pl-3 cursor-pointer',
                inputBaseClass,
              )}
            >
              <option value="all">全部状态</option>
              <option value="healthy">健康</option>
              <option value="degraded">降级</option>
              <option value="failed">故障</option>
              <option value="standby">待机</option>
            </select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="未找到匹配的受管服务"
            message={
              hasActiveFilters
                ? '当前层级、健康状态或关键词组合没有命中任何单元。'
                : '尚未在控制面配置中登记受管的 systemd 服务。'
            }
            action={
              hasActiveFilters
                ? { label: '重置筛选条件', onClick: resetFilters }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 sm:pl-6 pr-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer select-none',
                        FOCUS_RING,
                      )}
                    >
                      服务与单元
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">层级</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer select-none',
                        FOCUS_RING,
                      )}
                    >
                      状态
                      {renderSortIcon('status')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">监听端口</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('latency')}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer select-none',
                        FOCUS_RING,
                      )}
                    >
                      探针延迟
                      {renderSortIcon('latency')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('memory')}
                      className={cn(
                        'inline-flex items-center gap-1 ml-auto hover:text-[var(--ink)] transition-colors cursor-pointer select-none',
                        FOCUS_RING,
                      )}
                    >
                      内存
                      {renderSortIcon('memory')}
                    </button>
                  </th>
                  <th className="py-2.5 pl-2 pr-5 sm:pr-6 text-right whitespace-nowrap">控制与日志</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {filtered.map((svc, idx) => {
                  const actions = svc.allowedActions || svc.actions || ['restart', 'start', 'stop'];
                  const secondaryActions = actions.filter((a) => a !== 'restart');
                  const canRestart = actions.includes('restart');
                  const hasAdmin = hasServiceAdminUi(svc);
                  const externalAdminUrl = safeExternalUrl(svc.tailnetUrl || svc.adminUrl);
                  const memVal = svc.memoryBytes ?? svc.memoryCurrent;
                  const portText = (svc.ports || []).slice(0, 2).join(', ') || '-';
                  const isExpanded = expandedId === svc.id;
                  return (
                    <React.Fragment key={svc.id}>
                      <tr
                        className={cn(
                          'hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out',
                          idx > 0 && 'border-t border-[var(--border-subtle)]',
                        )}
                      >
                        <td className="py-3 pl-5 sm:pl-6 pr-2 max-w-[250px]">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : svc.id)}
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? '收起' : '展开'} ${svc.name || svc.id} 详情`}
                              className={cn(
                                'ui-press-icon mt-0.5 p-0.5 rounded text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer shrink-0',
                                FOCUS_RING,
                              )}
                            >
                              <DisclosureChevron open={isExpanded} />
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-[var(--ink)] truncate" title={svc.name || svc.id}>
                                  {svc.name || svc.id}
                                </span>
                                {(svc.risk === 'critical' || svc.critical) && (
                                  <span className="font-mono text-[11px] font-medium text-[var(--warn)] shrink-0 select-none">
                                    关键
                                  </span>
                                )}
                              </div>
                              <div
                                className="mt-0.5 font-mono text-[11.5px] text-[var(--ink-subtle)] truncate tabular-nums"
                                title={`${svc.unit} · ${svc.scope || 'user'}`}
                              >
                                {svc.unit} · {svc.scope || 'user'}
                                {svc.pid ? ` · PID ${svc.pid}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2.5 text-[12.5px] text-[var(--ink-muted)] whitespace-nowrap">
                          {layerLabel(svc.layer)}
                        </td>
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <StatusIndicator status={svc.status} />
                        </td>
                        <td
                          className="py-3 px-2.5 font-mono text-[12px] text-[var(--ink-muted)] max-w-[155px] truncate whitespace-nowrap tabular-nums"
                          title={portText}
                        >
                          {portText}
                        </td>
                        <td className="py-3 px-2.5">
                          {svc.probe ? (
                            <LatencyMeter
                              latencyMs={svc.probe.latencyMs}
                              statusCode={svc.probe.statusCode}
                              ok={svc.probe.ok !== false}
                              error={svc.probe.error}
                            />
                          ) : (
                            <span className="font-mono text-[12px] text-[var(--ink-subtle)]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                          {formatBytes(memVal)}
                        </td>
                        <td className="py-3 pl-2 pr-5 sm:pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {hasAdmin && (
                              <Button
                                variant="secondary"
                                size="sm"
                                data-testid={`open-admin-${svc.id}`}
                                onClick={() => setAdminService(svc)}
                                title={`内置窗口打开 ${svc.name || svc.id} 管理后台`}
                              >
                                <AppWindow className="size-3.5 text-[var(--accent)]" strokeWidth={1.75} />
                                管理页
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              data-testid={`open-logs-${svc.id}`}
                              onClick={() => setLogModalState({ service: svc, level: 'all' })}
                              title={`在页内小窗查看 ${svc.name || svc.id} 实时日志`}
                            >
                              <FileText className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                              日志
                            </Button>
                            {canRestart && (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={readOnly}
                                onClick={() => triggerAction(svc, 'restart')}
                                title={`重启 ${svc.name || svc.id}`}
                              >
                                <RotateCw className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                                重启
                              </Button>
                            )}
                            {secondaryActions.length > 0 && (
                              <select
                                defaultValue=""
                                disabled={readOnly}
                                aria-label={`更多操作 ${svc.name || svc.id}`}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  e.target.value = '';
                                  if (val) triggerAction(svc, val);
                                }}
                                className={cn(
                                  'ui-select h-8 pl-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[12px] text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--border-strong)] focus:border-[var(--accent)] disabled:opacity-45 cursor-pointer',
                                  FOCUS_RING,
                                )}
                              >
                                <option value="" disabled>
                                  更多
                                </option>
                                {secondaryActions.map((act) => (
                                  <option key={act} value={act}>
                                    {ACTION_LABELS[act] || act}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                      <tr className="border-0">
                        <td colSpan={7} className="p-0 border-0">
                          <AnimatedCollapse open={isExpanded}>
                            <div className="px-5 sm:px-6 py-3.5 bg-[var(--surface-subtle)]/55 border-t border-[var(--border-subtle)] flex flex-wrap items-start justify-between gap-4">
                              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5 text-[12px] flex-1 min-w-[260px]">
                                <div>
                                  <dt className="text-[var(--ink-subtle)]">Systemd 状态</dt>
                                  <dd className="mt-0.5 font-mono text-[var(--ink)] tabular-nums">
                                    {[svc.activeState, svc.subState].filter(Boolean).join(' / ') || svc.status || '-'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[var(--ink-subtle)]">角色职责</dt>
                                  <dd className="mt-0.5 text-[var(--ink-muted)]">
                                    {svc.role || layerLabel(svc.layer)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[var(--ink-subtle)]">全部监听端口</dt>
                                  <dd className="mt-0.5 font-mono text-[var(--ink)] tabular-nums">
                                    {svc.ports && svc.ports.length > 0 ? svc.ports.join(', ') : '-'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[var(--ink-subtle)]">上游依赖</dt>
                                  <dd className="mt-0.5 font-mono text-[var(--ink-muted)]">
                                    {svc.dependsOn && svc.dependsOn.length > 0 ? svc.dependsOn.join(' · ') : '无显式依赖'}
                                  </dd>
                                </div>
                                {hasAdmin && (
                                  <div className="col-span-2 sm:col-span-4 pt-1 border-t border-[var(--border-subtle)]/70">
                                    <dt className="text-[var(--ink-subtle)]">管理后台</dt>
                                    <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[12px]">
                                      {externalAdminUrl ? (
                                        <a
                                          href={externalAdminUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline truncate max-w-full"
                                        >
                                          <span className="truncate">{externalAdminUrl}</span>
                                          <ExternalLink className="size-3 shrink-0" strokeWidth={1.75} />
                                        </a>
                                      ) : (
                                        <span className="text-[var(--ink)]">{svc.embedUrl || svc.adminUrl}</span>
                                      )}
                                    </dd>
                                  </div>
                                )}
                              </dl>
                              <div className="flex items-center gap-2 shrink-0">
                                {hasAdmin && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setAdminService(svc)}
                                  >
                                    <AppWindow className="size-3.5" strokeWidth={1.75} />
                                    内置窗口打开
                                  </Button>
                                )}
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setLogModalState({ service: svc, level: 'error' })}
                                >
                                  查看 Error 日志
                                </Button>
                              </div>
                            </div>
                          </AnimatedCollapse>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 sm:px-6 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--ink-subtle)] select-none">
              <span>探针延迟色阶</span>
              <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-1.5 w-4 rounded-full bg-[var(--lat-fast)]" aria-hidden="true" />
                  ≤5ms 极快
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-1.5 w-4 rounded-full bg-[var(--lat-good)]" aria-hidden="true" />
                  ≤12ms 流畅
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-1.5 w-4 rounded-full bg-[var(--lat-moderate)]" aria-hidden="true" />
                  ≤30ms 适中
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-1.5 w-4 rounded-full bg-[var(--lat-slow)]" aria-hidden="true" />
                  ≤80ms 偏慢
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-1.5 w-4 rounded-full bg-[var(--lat-critical)]" aria-hidden="true" />
                  &gt;80ms 瓶颈
                </span>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <ServiceAdminModal service={adminService} onClose={() => setAdminService(null)} />
      <ServiceLogModal
        service={logModalState?.service || null}
        initialLevel={logModalState?.level || 'all'}
        snapshot={snapshot}
        meta={meta}
        onClose={() => setLogModalState(null)}
        onExpandToLogs={(filterState) => {
          setLogModalState(null);
          onOpenLogs(filterState);
        }}
        onToast={onToast}
      />
    </ModuleFrame>
  );
}
