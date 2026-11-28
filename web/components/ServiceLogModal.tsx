import React from 'react';
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  ScrollText,
  X,
} from 'lucide-react';
import type {
  LogFilterState,
  MetaResponse,
  ServiceItem,
  SnapshotResponse,
  ToastHandler,
} from '../types';
import { Button, IconSwap, ModalShell, StatusIndicator } from './ui';
import { LogStreamPanel } from './LogStreamPanel';

export function ServiceLogModal({
  service,
  initialLevel = 'all',
  snapshot,
  meta,
  onClose,
  onExpandToLogs,
  onToast,
}: {
  service: ServiceItem | null;
  initialLevel?: string;
  snapshot: SnapshotResponse | null;
  meta: MetaResponse | null;
  onClose: () => void;
  onExpandToLogs: (filterState: LogFilterState) => void;
  onToast: ToastHandler;
}) {
  const lastServiceRef = React.useRef<ServiceItem | null>(service);
  if (service) {
    lastServiceRef.current = service;
  }
  const activeService = service ?? lastServiceRef.current;

  const [maximized, setMaximized] = React.useState(false);
  const latestFilterRef = React.useRef<LogFilterState | null>(null);

  React.useEffect(() => {
    if (!service) return;
    setMaximized(false);
    latestFilterRef.current = {
      source: 'service',
      target: service.unit || service.id,
      targets: [service.id],
      since: '1h',
      level: initialLevel || 'all',
      query: '',
      regex: false,
    };
  }, [service?.id, initialLevel]);

  const handleFilterChange = React.useCallback((nextState: LogFilterState) => {
    latestFilterRef.current = nextState;
  }, []);

  const displayName = activeService?.name || activeService?.id || '服务';

  const handleExpand = () => {
    if (!activeService) return;
    const current = latestFilterRef.current || {
      source: 'service' as const,
      target: activeService.unit || activeService.id,
      targets: [activeService.id],
      since: '1h',
      level: initialLevel || 'all',
      query: '',
      regex: false,
    };
    onClose();
    onExpandToLogs(current);
  };

  return (
    <ModalShell
      open={Boolean(service)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={`${displayName} 实时日志小窗`}
      srOnlyHeader
      size="window"
      maximized={maximized}
      contentTestId="service-log-modal"
    >
      {activeService && (
        <>
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-subtle)]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <ScrollText className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
              <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span className="text-[13.5px] font-semibold text-[var(--ink)] truncate">
                  {displayName} · 实时日志
                </span>
                <StatusIndicator status={activeService.status} />
                <span className="hidden md:inline font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                  {activeService.unit}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExpand}
                data-testid="service-log-expand"
              >
                <ExternalLink className="size-3.5" strokeWidth={1.75} />
                在日志中心展开
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMaximized((prev) => !prev)}
                title={maximized ? '还原窗口尺寸' : '最大化日志窗口'}
                aria-label={maximized ? '还原窗口尺寸' : '最大化日志窗口'}
                data-testid="service-log-maximize"
              >
                <IconSwap iconKey={maximized ? 'min' : 'max'}>
                  {maximized ? (
                    <Minimize2 className="size-4" strokeWidth={1.75} />
                  ) : (
                    <Maximize2 className="size-4" strokeWidth={1.75} />
                  )}
                </IconSwap>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                title="关闭日志小窗 (Esc)"
                aria-label="关闭日志小窗"
                data-testid="service-log-close"
              >
                <X className="size-4" strokeWidth={1.75} />
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg)]">
            <LogStreamPanel
              key={`${activeService.id}:${initialLevel}`}
              mode="compact"
              snapshot={snapshot}
              meta={meta}
              service={activeService}
              initialFilter={{
                source: 'service',
                target: activeService.unit || activeService.id,
                targets: [activeService.id],
                since: '1h',
                level: initialLevel || 'all',
                query: '',
                regex: false,
              }}
              onFilterChange={handleFilterChange}
              onToast={onToast}
            />
          </div>

          <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/60 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--ink-subtle)] select-none shrink-0">
            <span>与日志中心共用统一原位直读后端与 SSE 流；关闭浮窗会自动断开流并中止未完成请求</span>
            <span className="font-mono">ESC 关闭</span>
          </div>
        </>
      )}
    </ModalShell>
  );
}

export default ServiceLogModal;
