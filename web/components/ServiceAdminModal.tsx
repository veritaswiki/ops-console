import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
import { DURATION, EASE_OUT_CRAFT } from '../lib/motion';
import {
  Button,
  EmptyState,
  IconSwap,
  ModalShell,
  SegmentedControl,
  StatusIndicator,
  TopProgressBar,
} from './ui';

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
  const lastServiceRef = React.useRef<ServiceItem | null>(service);
  if (service) {
    lastServiceRef.current = service;
  }
  const activeService = service ?? lastServiceRef.current;

  const embedUrl = safeAdminHref(activeService?.embedUrl);
  const directUrl = safeAdminHref(activeService?.tailnetUrl || activeService?.adminUrl);
  const hasBothModes = Boolean(embedUrl && directUrl);

  const isOpen = Boolean(service);
  const serviceKey = service ? `${service.id}:${service.embedUrl ?? ''}` : null;
  const [trackedOpen, setTrackedOpen] = React.useState(isOpen);
  const [trackedServiceKey, setTrackedServiceKey] = React.useState<string | null>(serviceKey);
  const [mode, setMode] = React.useState<AdminViewMode>(embedUrl ? 'embed' : 'direct');
  const [maximized, setMaximized] = React.useState(false);
  const [iframeLoading, setIframeLoading] = React.useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  const [reloadNonce, setReloadNonce] = React.useState(0);

  // Reset synchronously on open or service switch so frame 1 never shows a previous
  // maximized/mode state or triggers an unintended shrink transition.
  if (isOpen !== trackedOpen) {
    setTrackedOpen(isOpen);
    if (isOpen) {
      setTrackedServiceKey(serviceKey);
      setMode(safeAdminHref(service?.embedUrl) ? 'embed' : 'direct');
      setMaximized(false);
      setIframeLoading(true);
      setHasLoadedOnce(false);
      setReloadNonce(0);
    }
  } else if (isOpen && serviceKey !== trackedServiceKey) {
    setTrackedServiceKey(serviceKey);
    setMode(safeAdminHref(service?.embedUrl) ? 'embed' : 'direct');
    setMaximized(false);
    setIframeLoading(true);
    setHasLoadedOnce(false);
    setReloadNonce(0);
  }

  const activeUrl = mode === 'embed' ? embedUrl || directUrl : directUrl || embedUrl;
  const externalHref = directUrl || embedUrl;
  const displayName = activeService?.name || activeService?.id || '服务';

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
    <ModalShell
      open={Boolean(service)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={`${displayName} 管理后台内置窗口`}
      srOnlyHeader
      size="window"
      maximized={maximized}
      contentTestId="service-admin-modal"
    >
      {activeService && (
        <>
          {/* Window Chrome Bar */}
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-subtle)]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <AppWindow className="size-4 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
              <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span className="text-[13.5px] font-semibold text-[var(--ink)] truncate">
                  {displayName}
                </span>
                <StatusIndicator status={activeService.status} />
                <span className="hidden md:inline font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                  {activeService.unit}
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
                <SegmentedControl<AdminViewMode>
                  value={mode}
                  onChange={handleSwitchMode}
                  ariaLabel="切换管理后台连接方式"
                  options={[
                    {
                      value: 'embed',
                      label: '内置代理',
                      icon: <Shield className="size-3" strokeWidth={1.75} />,
                      testId: 'service-admin-mode-embed',
                    },
                    {
                      value: 'direct',
                      label: '直连地址',
                      icon: <Globe className="size-3" strokeWidth={1.75} />,
                      testId: 'service-admin-mode-direct',
                    },
                  ]}
                />
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
                <IconSwap iconKey={maximized ? 'min' : 'max'}>
                  {maximized ? (
                    <Minimize2 className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                  ) : (
                    <Maximize2 className="size-3.5 text-[var(--ink-muted)]" strokeWidth={1.75} />
                  )}
                </IconSwap>
                <span className="hidden sm:inline">{maximized ? '还原' : '最大化'}</span>
              </Button>

              {externalHref && (
                <a
                  href={externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'ui-press h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] select-none whitespace-nowrap',
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
                <TopProgressBar loading={iframeLoading} />
                <AnimatePresence>
                  {iframeLoading && !hasLoadedOnce && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE_OUT_CRAFT } }}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--bg)]/88 pointer-events-none"
                      aria-live="polite"
                    >
                      <div className="h-7 w-7 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
                      <div className="text-[12.5px] text-[var(--ink-muted)] font-mono">
                        正在加载 {displayName} 管理页面…
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <iframe
                  key={`${activeService.id}:${mode}:${reloadNonce}`}
                  title={`${displayName} 管理后台`}
                  src={activeUrl}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals"
                  onLoad={() => {
                    setIframeLoading(false);
                    setHasLoadedOnce(true);
                  }}
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
        </>
      )}
    </ModalShell>
  );
}

export default ServiceAdminModal;
