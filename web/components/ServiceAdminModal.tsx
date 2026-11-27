import React from 'react';
import {
  AppWindow,
  ExternalLink,
  Globe,
  Maximize2,
  Minimize2,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';
import type { ServiceItem } from '../types';
import { cn, FOCUS_RING } from '../lib/cn';
import { Button, EmptyState, StatusIndicator } from './ui';

type AdminViewMode = 'embed' | 'direct';

function safeAdminHref(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) return trimmed;
  return null;
}

export function ServiceAdminModal({
  service,
  onClose,
}: {
  service: ServiceItem | null;
  onClose: () => void;
}) {
  const embedUrl = safeAdminHref(service?.embedUrl);
  const directUrl = safeAdminHref(service?.tailnetUrl || service?.adminUrl);
  const hasBothModes = Boolean(embedUrl && directUrl);

  const [mode, setMode] = React.useState<AdminViewMode>(embedUrl ? 'embed' : 'direct');
  const [maximized, setMaximized] = React.useState(false);
  const [iframeLoading, setIframeLoading] = React.useState(true);
  const [reloadNonce, setReloadNonce] = React.useState(0);

  React.useEffect(() => {
    if (!service) return;
    setMode(safeAdminHref(service.embedUrl) ? 'embed' : 'direct');
    setIframeLoading(true);
    setReloadNonce(0);
  }, [service?.id, service?.embedUrl]);

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

  if (!service) return null;

  const activeUrl = mode === 'embed' ? embedUrl || directUrl : directUrl || embedUrl;
  const externalHref = directUrl || embedUrl;
  const displayName = service.name || service.id;

  const handleSwitchMode = (nextMode: AdminViewMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setIframeLoading(true);
  };

  const handleReload = () => {
    setIframeLoading(true);
    setReloadNonce((n) => n + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/65 backdrop-blur-[2px] p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName} 管理后台内置窗口`}
      data-testid="service-admin-modal"
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
            : 'w-[92vw] h-[86vh] max-w-[1600px] rounded-2xl',
        )}
      >
        {/* Window Chrome Bar */}
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-subtle)]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <AppWindow className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
            <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <span className="text-[13.5px] font-semibold text-[var(--ink)] truncate">
                {displayName}
              </span>
              <StatusIndicator status={service.status} />
              <span className="hidden md:inline font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                {service.unit}
              </span>
              {activeUrl && (
                <span
                  className="hidden lg:inline font-mono text-[11px] text-[var(--ink-muted)] truncate max-w-[340px]"
                  title={activeUrl}
                >
                  · {activeUrl}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {hasBothModes && (
              <div
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5 text-[11.5px]"
                role="group"
                aria-label="切换管理后台连接方式"
              >
                <button
                  type="button"
                  onClick={() => handleSwitchMode('embed')}
                  data-testid="service-admin-mode-embed"
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors select-none',
                    FOCUS_RING,
                    mode === 'embed'
                      ? 'bg-[var(--surface-active)] text-[var(--ink)]'
                      : 'text-[var(--ink-subtle)] hover:text-[var(--ink)]',
                  )}
                >
                  <Shield className="size-3" strokeWidth={1.75} />
                  内置代理
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('direct')}
                  data-testid="service-admin-mode-direct"
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors select-none',
                    FOCUS_RING,
                    mode === 'direct'
                      ? 'bg-[var(--surface-active)] text-[var(--ink)]'
                      : 'text-[var(--ink-subtle)] hover:text-[var(--ink)]',
                  )}
                >
                  <Globe className="size-3" strokeWidth={1.75} />
                  直连地址
                </button>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleReload}
              title="重新加载管理页"
              aria-label="重新加载管理页"
            >
              <RefreshCw
                className={cn('size-3.5 text-[var(--ink-muted)]', iframeLoading && 'animate-spin')}
                strokeWidth={1.75}
              />
              <span className="hidden sm:inline">刷新</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMaximized((prev) => !prev)}
              title={maximized ? '还原窗口' : '最大化窗口'}
              aria-label={maximized ? '还原窗口' : '最大化窗口'}
              data-testid="service-admin-maximize"
            >
              {maximized ? (
                <Minimize2 className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
              ) : (
                <Maximize2 className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
              )}
              <span className="hidden sm:inline">{maximized ? '还原' : '最大化'}</span>
            </Button>

            {externalHref && (
              <a
                href={externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-colors select-none whitespace-nowrap',
                  FOCUS_RING,
                )}
                title="在新标签页打开管理页"
              >
                <ExternalLink className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                <span className="hidden sm:inline">新标签页</span>
              </a>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="关闭窗口 (Esc)"
              aria-label="关闭内置窗口"
              data-testid="service-admin-close"
            >
              <X className="size-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>

        {/* Embedded Viewport */}
        <div className="relative flex-1 min-h-0 bg-[var(--bg)]">
          {activeUrl ? (
            <>
              {iframeLoading && (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--bg)]/90 pointer-events-none"
                  aria-live="polite"
                >
                  <div className="h-8 w-8 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
                  <div className="text-[12.5px] text-[var(--ink-muted)] font-mono">
                    正在加载 {displayName} 管理页面...
                  </div>
                </div>
              )}
              <iframe
                key={`${service.id}:${mode}:${reloadNonce}`}
                title={`${displayName} 管理后台`}
                src={activeUrl}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals"
                onLoad={() => setIframeLoading(false)}
                className="w-full h-full border-0 bg-white dark:bg-zinc-950"
              />
            </>
          ) : (
            <EmptyState
              title="未配置管理后台地址"
              message="当前受管服务未声明内置代理路径或直连管理 URL。"
            />
          )}
        </div>

        {/* Non-intrusive Footer Hint */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/60 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--ink-subtle)] select-none shrink-0">
          <span>
            若目标后台开启独立登录校验或 WebSocket 需直连，可点击右上角切换直连或新标签页打开
          </span>
          <span className="font-mono">ESC 关闭</span>
        </div>
      </div>
    </div>
  );
}

export default ServiceAdminModal;
