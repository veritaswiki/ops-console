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
import { cn } from '../lib/cn';
import { Button, StatusIndicator } from './ui';
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

  React.useEffect(() => {
    if (!service) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [service, onClose]);

  const handleFilterChange = React.useCallback((nextState: LogFilterState) => {
    latestFilterRef.current = nextState;
  }, []);

  if (!service) return null;

  const displayName = service.name || service.id;

  const handleExpand = () => {
    const current = latestFilterRef.current || {
      source: 'service' as const,
      target: service.unit || service.id,
      targets: [service.id],
      since: '1h',
      level: initialLevel || 'all',
      query: '',
      regex: false,
    };
    onClose();
    onExpandToLogs(current);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 backdrop-blur-[2px] p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName} 实时日志小窗`}
      data-testid="service-log-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          'bg-[var(--surface-elevated)] border border-[var(--border)] shadow-[var(--shadow-modal)] flex flex-col overflow-hidden',
          'transition-[opacity,transform] duration-150 ease-out',
          maximized
            ? 'fixed inset-2 w-auto h-auto rounded-xl'
            : 'w-[92vw] h-[82vh] max-w-[1480px] rounded-2xl',
        )}
      >
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-subtle)]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <ScrollText className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
            <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <span className="text-[13.5px] font-semibold text-[var(--ink)] truncate">
                {displayName} · 实时日志
              </span>
              <StatusIndicator status={service.status} />
              <span className="hidden md:inline font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                {service.unit}
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
              size="sm"
              onClick={() => setMaximized((prev) => !prev)}
              title={maximized ? '还原窗口尺寸' : '最大化日志窗口'}
              aria-label={maximized ? '还原窗口尺寸' : '最大化日志窗口'}
              data-testid="service-log-maximize"
            >
              {maximized ? (
                <Minimize2 className="size-4" strokeWidth={1.75} />
              ) : (
                <Maximize2 className="size-4" strokeWidth={1.75} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
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
            key={`${service.id}:${initialLevel}`}
            mode="compact"
            snapshot={snapshot}
            meta={meta}
            service={service}
            initialFilter={{
              source: 'service',
              target: service.unit || service.id,
              targets: [service.id],
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
      </div>
    </div>
  );
}

export default ServiceLogModal;
