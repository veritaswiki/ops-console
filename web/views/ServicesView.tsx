import React from 'react';
import { FileText, Search } from 'lucide-react';
import type { ServiceItem, SnapshotResponse } from '../types';
import { executeServiceAction } from '../api';
import {
  filterServices,
  formatBytes,
  layerLabel,
  statusTone,
} from '../utils/format';
import {
  EmptyState,
  LatencyMeter,
  Panel,
  SegmentedFilter,
  StatusIndicator,
  type ConfirmModalState,
} from '../components/ui';

const LAYER_FILTERS = [
  { value: 'all', label: '全部层级' },
  { value: 'core', label: '核心服务' },
  { value: 'memory', label: '记忆引擎' },
  { value: 'agents', label: '网关与 Agent' },
  { value: 'network', label: '网络底座' },
] as const;

type LayerFilter = (typeof LAYER_FILTERS)[number]['value'];

const ACTION_LABELS: Record<string, string> = {
  start: '启动',
  stop: '停止',
  restart: '重启',
  reload: '重载配置',
};

export function ServicesView({
  snapshot,
  readOnly,
  onRefresh,
  onOpenLogs,
  onToast,
  onConfirm,
}: {
  snapshot: SnapshotResponse | null;
  readOnly: boolean;
  onRefresh: () => Promise<void>;
  onOpenLogs: (unit: string) => void;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const [layer, setLayer] = React.useState<LayerFilter>('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');

  const allServices = snapshot?.services?.items || [];
  const filtered = React.useMemo(
    () => filterServices(allServices, { layer, status: statusFilter, query }),
    [allServices, layer, statusFilter, query],
  );

  const healthyCount = allServices.filter((s) => statusTone(s.status) === 'ok').length;

  const triggerAction = (svc: ServiceItem, action: string) => {
    if (!action) return;
    if (readOnly) {
      onToast('当前处于只读模式，已拦截写操作', 'err');
      return;
    }
    const isCritical = svc.risk === 'critical' || svc.critical;
    const isDestructive = action === 'stop' || (isCritical && action === 'restart');
    const requireToken = isCritical && (action === 'stop' || action === 'restart')
      ? `CONFIRM:${svc.id}`
      : undefined;

    onConfirm({
      open: true,
      title: `${ACTION_LABELS[action] || action}服务：${svc.name || svc.id}`,
      description: `将对单元 ${svc.unit}（${svc.scope || 'user'}）执行 ${action} 操作，操作结果会写入不可变审计日志。`,
      confirmLabel: `确认${ACTION_LABELS[action] || action}`,
      danger: isDestructive,
      requireToken,
      onConfirm: async (token) => {
        try {
          await executeServiceAction(svc.id, action, token);
          onToast(`服务 ${svc.name || svc.id} 已执行 ${ACTION_LABELS[action] || action}`, 'ok');
          await onRefresh();
        } catch (err) {
          onToast(`操作失败：${(err as Error).message}`, 'err');
        }
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--ink)] leading-tight">
            受管服务
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed">
            systemd 单元状态、监听端口、HTTP 探针延迟与白名单生命周期控制。
          </p>
        </div>
        <div className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">
          健康 {healthyCount}/{allServices.length} · 当前显示 {filtered.length} 项
        </div>
      </div>

      <Panel bodyClassName="p-0">
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
          <SegmentedFilter
            value={layer}
            onChange={setLayer}
            options={LAYER_FILTERS}
            ariaLabel="按服务层级筛选"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="w-4 h-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索服务、单元或端口..."
                aria-label="搜索受管服务"
                className="h-8 w-52 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus:border-[var(--accent)]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="按健康状态筛选"
              className="ui-select h-8 pl-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--ink)] transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus:border-[var(--accent)] cursor-pointer"
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
          <EmptyState message="没有匹配筛选条件的受管服务。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 pr-2">服务与单元</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">层级</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">状态</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">监听端口</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">探针延迟</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">内存</th>
                  <th className="py-2.5 pl-2 pr-5 text-right whitespace-nowrap">控制与日志</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {filtered.map((svc) => {
                  const actions = svc.allowedActions || svc.actions || ['restart', 'start', 'stop'];
                  const memVal = svc.memoryBytes ?? svc.memoryCurrent;
                  const portText = (svc.ports || []).slice(0, 2).join(', ') || '-';
                  return (
                    <tr
                      key={svc.id}
                      className="hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
                    >
                      <td className="py-3 pl-5 pr-2 max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--ink)] truncate">
                            {svc.name || svc.id}
                          </span>
                          {(svc.risk === 'critical' || svc.critical) && (
                            <span className="font-mono text-[11px] font-medium text-[var(--warn)] shrink-0">
                              关键
                            </span>
                          )}
                        </div>
                        <div
                          className="mt-0.5 font-mono text-[11.5px] text-[var(--ink-subtle)] truncate"
                          title={`${svc.unit} · ${svc.scope || 'user'}`}
                        >
                          {svc.unit} · {svc.scope || 'user'}
                          {svc.pid ? ` · PID ${svc.pid}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-[12.5px] text-[var(--ink-muted)] whitespace-nowrap">
                        {layerLabel(svc.layer)}
                      </td>
                      <td className="py-3 px-2.5 whitespace-nowrap">
                        <StatusIndicator status={svc.status} />
                      </td>
                      <td
                        className="py-3 px-2.5 font-mono text-[12px] text-[var(--ink-muted)] max-w-[155px] truncate whitespace-nowrap"
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
                      <td className="py-3 pl-2 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenLogs(svc.unit)}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--ink-subtle)] transition-colors duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
                          >
                            <FileText className="w-3.5 h-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                            日志
                          </button>
                          <select
                            defaultValue=""
                            disabled={readOnly}
                            aria-label={`操作服务 ${svc.name || svc.id}`}
                            onChange={(e) => {
                              const val = e.target.value;
                              e.target.value = '';
                              if (val) triggerAction(svc, val);
                            }}
                            className="ui-select h-8 pl-2.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[12px] text-[var(--ink)] transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus:border-[var(--accent)] disabled:opacity-45 cursor-pointer"
                          >
                            <option value="" disabled>
                              操作
                            </option>
                            {actions.map((act) => (
                              <option key={act} value={act}>
                                {ACTION_LABELS[act] || act}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--ink-subtle)]">
              <span>探针延迟色阶</span>
              <div className="flex flex-wrap items-center gap-3 font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2 w-4 rounded-[2px] bg-[var(--lat-fast)]" />
                  ≤5ms 极快
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2 w-4 rounded-[2px] bg-[var(--lat-good)]" />
                  ≤12ms 流畅
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2 w-4 rounded-[2px] bg-[var(--lat-moderate)]" />
                  ≤30ms 适中
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2 w-4 rounded-[2px] bg-[var(--lat-slow)]" />
                  ≤80ms 偏慢
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="h-2 w-4 rounded-[2px] bg-[var(--lat-critical)]" />
                  &gt;80ms 瓶颈
                </span>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
