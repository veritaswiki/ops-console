import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import NumberFlow, { type Format } from '@number-flow/react';
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@ui-sdk/react/dialog';
import { AlertCircle, Check, ChevronRight, Copy, Loader2, X } from 'lucide-react';
import { cn, FOCUS_RING } from '../lib/cn';
import {
  COPY_FEEDBACK_MS,
  DELAYED_BUSY_MS,
  DURATION,
  EASE_EXIT,
  EASE_OUT_CRAFT,
  NUMBER_FLOW_TIMING,
  TRANSITION_ENTER,
  TRANSITION_EXIT,
  TRANSITION_VIEW,
} from '../lib/motion';

/**
 * Delays showing a busy indicator so fast (<180ms) operations never flash a spinner or skeleton.
 */
export function useDelayedBusy(busy: boolean, delayMs = DELAYED_BUSY_MS): boolean {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!busy) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [busy, delayMs]);

  return visible;
}

/**
 * Single rotating chevron (0deg -> 90deg) replacing abrupt two-icon ternary swaps.
 */
export function DisclosureChevron({
  open,
  className,
  strokeWidth = 1.75,
}: {
  open: boolean;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <span className="ui-chevron shrink-0" data-open={open ? 'true' : 'false'} aria-hidden="true">
      <ChevronRight className={cn('size-3.5', className)} strokeWidth={strokeWidth} />
    </span>
  );
}

/**
 * Interruptible CSS Grid disclosure (0fr <-> 1fr) for lightweight expandable panels,
 * navigation groups, submenus, and search bars. Zero JS height-measurement jitter.
 */
export function Disclosure({
  open,
  children,
  className,
  innerClassName,
  inertWhenClosed = true,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  inertWhenClosed?: boolean;
}) {
  return (
    <div
      className={cn('ui-disclosure', className)}
      data-open={open ? 'true' : 'false'}
      aria-hidden={inertWhenClosed ? !open : undefined}
    >
      <div
        inert={inertWhenClosed && !open ? true : undefined}
        className={cn('ui-disclosure-inner', innerClassName)}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Unmounting animated collapse for inline creation forms or heavy subtrees whose state
 * should reset once dismissed. Snapshots children while open so nullable callers never blank mid-exit.
 */
export function AnimatedCollapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const lastChildrenRef = React.useRef<React.ReactNode>(children);
  if (open) {
    lastChildrenRef.current = children;
  }
  const displayChildren = open ? children : lastChildrenRef.current;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="animated-collapse-content"
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={
            reduced
              ? { duration: 0.08, ease: 'linear' }
              : {
                  height: { duration: DURATION.standard, ease: EASE_OUT_CRAFT },
                  opacity: { duration: DURATION.fast, ease: EASE_OUT_CRAFT },
                }
          }
          style={{ overflow: 'hidden' }}
          className={className}
        >
          {displayChildren}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Fixed-box micro crossfade + scale/rotation swap between two semantic icon states
 * (e.g., Copy <-> Check, Sun <-> Moon, Maximize2 <-> Minimize2, Play <-> Pause).
 */
export function IconSwap({
  iconKey,
  children,
  rotateDeg = 0,
  className,
}: {
  iconKey: string;
  children: React.ReactNode;
  rotateDeg?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <span className={cn('inline-grid place-items-center shrink-0', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={iconKey}
          className="col-start-1 row-start-1 inline-flex items-center justify-center"
          initial={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.72, rotate: rotateDeg ? -rotateDeg : 0 }
          }
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.72, rotate: rotateDeg ? rotateDeg : 0 }
          }
          transition={
            reduced
              ? { duration: 0.06, ease: 'linear' }
              : { duration: 0.13, ease: EASE_OUT_CRAFT }
          }
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Reliable clipboard writer with execCommand fallback for non-HTTPS local LAN deployments.
 */
async function copyTextSafely(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback below when Clipboard API is blocked by insecure context
    }
  }
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}

/**
 * Unified copy button with IconSwap (Copy <-> Check), --ok-soft / --ok-border feedback,
 * 1800ms auto-reset, zero width jitter, and accessible polite live region.
 */
export function CopyAction({
  text,
  label = '复制',
  copiedLabel = '已复制',
  variant = 'button',
  size = 'sm',
  className,
  title,
  ariaLabel,
  disabled = false,
  testId,
  onCopied,
  onError,
}: {
  text: string | (() => string);
  label?: string;
  copiedLabel?: string;
  variant?: 'icon' | 'inline' | 'button' | 'ghost';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  testId?: string;
  onCopied?: () => void;
  onError?: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (disabled) return;
    const content = typeof text === 'function' ? text() : text;
    if (!content) return;
    const ok = await copyTextSafely(content);
    if (ok) {
      setCopied(true);
      onCopied?.();
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, COPY_FEEDBACK_MS);
    } else {
      onError?.();
    }
  };

  const iconSize = size === 'xs' ? 'size-3' : 'size-3.5';
  const variantClasses =
    variant === 'icon'
      ? cn(
          'ui-press-icon inline-flex items-center justify-center rounded-md cursor-pointer',
          size === 'xs' ? 'h-6 w-6' : size === 'md' ? 'h-8 w-8' : 'h-7 w-7',
          copied
            ? 'bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok-border)]'
            : 'text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] border border-transparent',
        )
      : variant === 'inline'
        ? cn(
            'ui-press inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium cursor-pointer border',
            copied
              ? 'bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok-border)]'
              : 'border-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
          )
        : variant === 'ghost'
          ? cn(
              'ui-press inline-flex items-center gap-1.5 rounded-lg font-medium cursor-pointer border',
              size === 'xs'
                ? 'h-7 px-2 text-[11.5px]'
                : size === 'md'
                  ? 'h-9 px-3 text-[13px]'
                  : 'h-8 px-2.5 text-[12px]',
              copied
                ? 'bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok-border)]'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
            )
          : cn(
              'ui-press inline-flex items-center gap-1.5 rounded-lg font-medium cursor-pointer border shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
              size === 'xs'
                ? 'h-7 px-2 text-[11.5px]'
                : size === 'md'
                  ? 'h-9 px-3 text-[13px]'
                  : 'h-8 px-2.5 text-[12.5px]',
              copied
                ? 'bg-[var(--ok-soft)] text-[var(--ok)] border-[var(--ok-border)]'
                : 'border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]',
            );

  const resolvedTitle = title ?? (copied ? copiedLabel : label);
  const resolvedAriaLabel = ariaLabel ?? (variant === 'icon' ? resolvedTitle : undefined);

  return (
    <>
      <button
        type="button"
        onClick={(e) => void handleCopy(e)}
        disabled={disabled}
        title={resolvedTitle}
        aria-label={resolvedAriaLabel}
        data-testid={testId}
        data-copied={copied ? 'true' : 'false'}
        className={cn(
          'select-none whitespace-nowrap shrink-0 disabled:opacity-45 disabled:pointer-events-none',
          variantClasses,
          FOCUS_RING,
          className,
        )}
      >
        <IconSwap iconKey={copied ? 'copied' : 'copy'}>
          {copied ? (
            <Check className={cn(iconSize, 'text-[var(--ok)]')} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Copy className={iconSize} strokeWidth={1.75} aria-hidden="true" />
          )}
        </IconSwap>
        {variant !== 'icon' && (
          <span className="inline-grid text-left">
            <span className={cn('col-start-1 row-start-1', copied && 'invisible')}>{label}</span>
            <span className={cn('col-start-1 row-start-1', !copied && 'invisible')}>{copiedLabel}</span>
          </span>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ''}
      </span>
    </>
  );
}

/**
 * Unified modal shell backed by @ui-sdk/react/dialog.
 * Provides Escape dismiss, focus trap, scroll lock, and bidirectional interruptible
 * [data-starting-style] / [data-ending-style] CSS transitions.
 */
export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  srOnlyHeader = false,
  size = 'md',
  maximized = false,
  backdropTestId,
  contentTestId,
  className,
  backdropClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  srOnlyHeader?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'window';
  maximized?: boolean;
  backdropTestId?: string;
  contentTestId?: string;
  className?: string;
  backdropClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogBackdrop
        data-testid={backdropTestId}
        className={cn('ui-dialog-backdrop', backdropClassName)}
      />
      <DialogContent
        data-size={size}
        data-maximized={maximized ? 'true' : 'false'}
        data-testid={contentTestId}
        className={cn('ui-modal-content', className)}
      >
        {srOnlyHeader ? (
          <>
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <DialogDescription className="sr-only">{description || title}</DialogDescription>
          </>
        ) : (
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[15px] font-semibold tracking-tight text-[var(--ink)] leading-snug text-balance">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="mt-1 text-[12.5px] text-[var(--ink-muted)] leading-relaxed text-pretty">
                  {description}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{title}</DialogDescription>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="关闭窗口"
              className={cn(
                'ui-press-icon h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer shrink-0',
                FOCUS_RING,
              )}
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Anchored popover / dropdown / slash-menu presence container with directional enter & fast exit.
 */
export function PresencePopover({
  open,
  side = 'bottom',
  className,
  role,
  ariaLabel,
  testId,
  children,
}: {
  open: boolean;
  side?: 'bottom' | 'top';
  className?: string;
  role?: string;
  ariaLabel?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const offsetY = side === 'bottom' ? -4 : 4;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role={role}
          aria-label={ariaLabel}
          data-testid={testId}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: offsetY, scale: 0.975 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: offsetY / 2, scale: 0.985 }}
          transition={{
            duration: reduced ? 0.08 : 0.14,
            ease: EASE_OUT_CRAFT,
          }}
          style={{
            transformOrigin: side === 'bottom' ? 'top center' : 'bottom center',
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Presence banner for top/bottom floating alerts, offline indicators, hot-update bars, and inline notices.
 */
export function PresenceBanner({
  open,
  edge = 'top',
  className,
  role,
  ariaLive,
  testId,
  children,
}: {
  open: boolean;
  edge?: 'top' | 'bottom' | 'inline';
  className?: string;
  role?: string;
  ariaLive?: 'polite' | 'assertive' | 'off';
  testId?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const offsetY = edge === 'bottom' ? 10 : edge === 'top' ? -6 : -4;
  const lastChildrenRef = React.useRef<React.ReactNode>(children);
  if (open) {
    lastChildrenRef.current = children;
  }
  const displayChildren = open ? children : lastChildrenRef.current;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="presence-banner-content"
          role={role}
          aria-live={ariaLive}
          data-testid={testId}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: offsetY }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: offsetY / 2 }}
          transition={
            reduced
              ? { duration: 0.08, ease: 'linear' }
              : {
                  duration: DURATION.fast,
                  ease: EASE_OUT_CRAFT,
                }
          }
          className={className}
        >
          {displayChildren}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Subtle presence clear button (X) inside search inputs.
 * Use `placement="overlay"` inside `<div className="relative">` wrappers (centers via `inset-y-0 my-auto`
 * so `motion.button`'s `scale` transform never collides with CSS translate centering).
 */
export function ClearInputButton({
  visible,
  onClear,
  ariaLabel = '清空搜索',
  placement = 'inline',
  className,
}: {
  visible: boolean;
  onClear: () => void;
  ariaLabel?: string;
  placement?: 'inline' | 'overlay';
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="clear-input-button"
          type="button"
          onClick={onClear}
          aria-label={ariaLabel}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.78 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.78 }}
          transition={{ duration: reduced ? 0.06 : DURATION.micro, ease: EASE_OUT_CRAFT }}
          className={cn(
            'ui-press-icon inline-flex items-center justify-center rounded-md p-0.5 text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer shrink-0',
            placement === 'overlay' && 'absolute inset-y-0 my-auto h-5 w-5 right-1.5',
            FOCUS_RING,
            className,
          )}
        >
          <X className="size-3.5" strokeWidth={1.75} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * Restrained animated number for low-frequency telemetry KPIs, counts, and meters.
 * Never use for high-frequency SSE log line counts, per-second timers, or live drag pixel readouts.
 */
export function LiveNumber({
  value,
  format,
  prefix,
  suffix,
  animated = true,
  className,
}: {
  value: number | null | undefined;
  format?: Format;
  prefix?: string;
  suffix?: string;
  animated?: boolean;
  className?: string;
}) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={cn('font-mono tabular-nums', className)}>—</span>;
  }

  if (!animated) {
    const formatted = format ? new Intl.NumberFormat(undefined, format).format(value) : String(value);
    return (
      <span className={cn('font-mono tabular-nums', className)}>
        {prefix}
        {formatted}
        {suffix}
      </span>
    );
  }

  return (
    <NumberFlow
      value={value}
      format={format}
      prefix={prefix}
      suffix={suffix}
      transformTiming={NUMBER_FLOW_TIMING.transformTiming}
      spinTiming={NUMBER_FLOW_TIMING.spinTiming}
      opacityTiming={NUMBER_FLOW_TIMING.opacityTiming}
      respectMotionPreference
      className={cn('tabular-nums', className)}
    />
  );
}

/**
 * Lightweight enter-only stage wrapper for view transitions.
 * Never uses AnimatePresence mode="wait" so rapid navigation (e.g., G O / G S) stays instant.
 */
export function ViewStage({
  stageKey,
  children,
  className,
}: {
  stageKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      key={stageKey}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0.08, ease: 'linear' } : TRANSITION_VIEW}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Async action button with smooth Loading -> Success (Check) -> Idle closed-loop feedback
 * and optional gentle error shake without horizontal width jitter.
 */
export type ActionButtonStatus = 'idle' | 'loading' | 'success' | 'error';

export function ActionStateButton({
  status = 'idle',
  idleLabel,
  loadingLabel = '处理中…',
  successLabel = '已完成',
  errorLabel = '重试',
  idleIcon,
  successIcon,
  errorIcon,
  variant = 'secondary',
  size = 'sm',
  delayBusy = false,
  className,
  disabled,
  onClick,
  title,
  ariaLabel,
  testId,
  type = 'button',
}: {
  status?: ActionButtonStatus;
  idleLabel?: string;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  idleIcon?: React.ReactNode;
  successIcon?: React.ReactNode;
  errorIcon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  delayBusy?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  ariaLabel?: string;
  testId?: string;
  type?: 'button' | 'submit' | 'reset';
}) {
  const delayedBusy = useDelayedBusy(status === 'loading', DELAYED_BUSY_MS);
  const effectiveStatus: ActionButtonStatus =
    status === 'loading' && delayBusy && !delayedBusy ? 'idle' : status;

  const isIconOnly = size === 'icon' || (!idleLabel && !loadingLabel && !successLabel);
  const iconSize = size === 'lg' ? 'size-4' : 'size-3.5';

  const variantClasses =
    effectiveStatus === 'success'
      ? 'border border-[var(--ok-border)] bg-[var(--ok-soft)] text-[var(--ok)]'
      : effectiveStatus === 'error'
        ? 'border border-[var(--err-border)] bg-[var(--err-soft)] text-[var(--err)] ui-shake'
        : variant === 'primary'
          ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(0,0,0,0.14)]'
          : variant === 'danger'
            ? 'bg-[var(--err-dot)] text-white hover:bg-[var(--err)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.18)]'
            : variant === 'ghost'
              ? 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
              : 'border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

  const sizeClasses =
    size === 'icon'
      ? 'h-8 w-8 p-0'
      : size === 'sm'
        ? 'h-8 px-2.5 text-[12.5px]'
        : size === 'lg'
          ? 'h-10 px-4 text-[13.5px]'
          : 'h-9 px-3.5 text-[13px]';

  const activeIcon =
    effectiveStatus === 'loading' ? (
      <Loader2 className={cn(iconSize, 'animate-spin')} strokeWidth={1.9} aria-hidden="true" />
    ) : effectiveStatus === 'success' ? (
      successIcon ?? <Check className={cn(iconSize, 'text-[var(--ok)]')} strokeWidth={2.2} aria-hidden="true" />
    ) : effectiveStatus === 'error' ? (
      errorIcon ?? <AlertCircle className={cn(iconSize, 'text-[var(--err)]')} strokeWidth={1.9} aria-hidden="true" />
    ) : (
      idleIcon ?? null
    );

  const currentLabel =
    effectiveStatus === 'loading'
      ? loadingLabel
      : effectiveStatus === 'success'
        ? successLabel
        : effectiveStatus === 'error'
          ? errorLabel
          : idleLabel;

  const labelSlots = Array.from(
    new Set(
      [
        idleLabel,
        loadingLabel,
        successLabel,
        effectiveStatus === 'error' ? errorLabel : undefined,
      ].filter((v): v is string => Boolean(v)),
    ),
  );

  return (
    <button
      type={type}
      disabled={disabled || status === 'loading'}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-busy={status === 'loading' ? 'true' : undefined}
      data-testid={testId}
      data-action-status={effectiveStatus}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium select-none whitespace-nowrap shrink-0 cursor-pointer',
        size === 'icon' ? 'ui-press-icon' : 'ui-press',
        'disabled:opacity-45 disabled:pointer-events-none',
        sizeClasses,
        variantClasses,
        FOCUS_RING,
        className,
      )}
    >
      {activeIcon && <IconSwap iconKey={effectiveStatus}>{activeIcon}</IconSwap>}
      {!isIconOnly && currentLabel && (
        <span className="inline-grid text-center">
          {labelSlots.map((slotText, idx) => (
            <span
              key={`${idx}-${slotText}`}
              aria-hidden={slotText !== currentLabel}
              className={cn('col-start-1 row-start-1', slotText !== currentLabel && 'invisible')}
            >
              {slotText}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

/**
 * Thin top 2px progress bar for in-place iframe/modal reloads (replaces full dark blocking overlays).
 */
export function TopProgressBar({ loading }: { loading: boolean }) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: EASE_EXIT } }}
          className="pointer-events-none absolute top-0 left-0 right-0 z-20 h-[2px] overflow-hidden bg-transparent"
        >
          <motion.div
            className="h-full w-full origin-left bg-[var(--accent)]"
            initial={{ scaleX: reduced ? 1 : 0.12 }}
            animate={{ scaleX: reduced ? 1 : 0.84 }}
            exit={{ scaleX: 1, transition: { duration: 0.14, ease: EASE_OUT_CRAFT } }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 1.4, ease: EASE_OUT_CRAFT }
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { TRANSITION_ENTER, TRANSITION_EXIT };
