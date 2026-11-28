import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Command as Cmdk } from 'cmdk';
import NumberFlow from '@number-flow/react';
import {
  SegmentedControl as UiSegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@ui-sdk/react/alert-dialog';
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@ui-sdk/react/dialog';
import { Switch as UiSwitch, SwitchThumb } from '@ui-sdk/react/switch';
import { Meter, MeterIndicator, MeterTrack } from '@ui-sdk/react/meter';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Inbox, RefreshCw, Search, X } from 'lucide-react';
import type { StatusTone } from '../types';
import { cn, FOCUS_RING } from '../lib/cn';
import { clampPercent, classifyLatency, statusLabel, statusTone } from '../utils/format';

export const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium select-none whitespace-nowrap shrink-0 cursor-pointer',
    'transition-[color,background-color,border-color,transform,opacity] duration-150 ease-out',
    'active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none',
    FOCUS_RING,
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(0,0,0,0.14)]',
        secondary:
          'border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        ghost:
          'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
        danger:
          'bg-[var(--err-dot)] text-white hover:bg-[var(--err)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.18)]',
      },
      size: {
        sm: 'h-8 px-2.5 text-[12.5px]',
        md: 'h-9 px-3.5 text-[13px]',
        lg: 'h-10 px-4 text-[13.5px]',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export const inputBaseClass = cn(
  'rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[16px] sm:text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)]',
  'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
  'hover:border-[var(--border-strong)] focus:border-[var(--accent)]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  FOCUS_RING,
);

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, mono = false, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-10 sm:h-9 px-3',
        mono && 'font-mono sm:text-[12.5px]',
        inputBaseClass,
        className,
      )}
      {...props}
    />
  ),
);
TextInput.displayName = 'TextInput';

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  mono?: boolean;
  compact?: boolean;
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, mono = false, compact = false, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'ui-select',
        compact ? 'h-8 pl-2.5 text-[12px]' : 'w-full h-10 sm:h-9 pl-3 text-[16px] sm:text-[13px]',
        mono && 'font-mono sm:text-[12.5px]',
        inputBaseClass,
        className,
      )}
      {...props}
    />
  ),
);
NativeSelect.displayName = 'NativeSelect';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
  testId?: string;
  icon?: React.ReactNode;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
  className = '',
  testId,
}: {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <UiSegmentedControl
      value={value}
      onValueChange={(v) => {
        if (!disabled && v) onChange(v as T);
      }}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn('ui-seg-root', disabled && 'opacity-55 pointer-events-none', className)}
    >
      <SegmentedControlIndicator className="ui-seg-indicator" />
      {options.map((opt) => (
        <SegmentedControlItem
          key={opt.value}
          value={opt.value}
          disabled={disabled || opt.disabled}
          data-testid={opt.testId}
          className="ui-seg-item inline-flex items-center gap-1.5"
        >
          {opt.icon}
          <span>{opt.label}</span>
        </SegmentedControlItem>
      ))}
    </UiSegmentedControl>
  );
}

export function SegmentedFilter<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
}: {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}

export function StatusIndicator({
  status,
  label,
}: {
  status?: string | null;
  label?: string;
}) {
  const tone = statusTone(status);
  const text = label || statusLabel(status);
  const dotColor =
    tone === 'ok'
      ? 'bg-[var(--ok-dot)]'
      : tone === 'warn'
        ? 'bg-[var(--warn-dot)]'
        : tone === 'err'
          ? 'bg-[var(--err-dot)]'
          : 'bg-[var(--muted-dot)]';
  const textColor =
    tone === 'ok'
      ? 'text-[var(--ok)]'
      : tone === 'warn'
        ? 'text-[var(--warn)]'
        : tone === 'err'
          ? 'text-[var(--err)]'
          : 'text-[var(--ink-muted)]';

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap select-none', textColor)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

export function ResourceMeter({
  value,
  label,
  valueText,
  tone,
}: {
  value?: number | null;
  label?: string;
  valueText?: string;
  tone?: StatusTone;
}) {
  const pct = clampPercent(value);
  const resolvedTone: StatusTone =
    tone || (pct >= 88 ? 'err' : pct >= 72 ? 'warn' : 'ok');

  return (
    <Meter value={pct} min={0} max={100} aria-label={label || '利用率'} className="w-full space-y-1.5">
      {(label || valueText) && (
        <div className="flex items-baseline justify-between gap-2 text-[13px]">
          <span className="truncate font-medium text-[var(--ink)] min-w-0" title={label}>
            {label}
          </span>
          <span className="font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap shrink-0">
            {valueText ?? `${pct}%`}
          </span>
        </div>
      )}
      <MeterTrack className="ui-meter-track">
        <MeterIndicator
          className="ui-meter-indicator"
          data-tone={resolvedTone}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </MeterTrack>
    </Meter>
  );
}

export function LatencyMeter({
  latencyMs,
  statusCode,
  ok = true,
  error,
}: {
  latencyMs?: number | null;
  statusCode?: number | null;
  ok?: boolean;
  error?: string;
}) {
  if (!ok) {
    return (
      <div className="min-w-[140px] max-w-[192px]">
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="font-mono font-medium text-[var(--err)] truncate" title={error || '探针异常'}>
            {error || '探针异常'}
          </span>
        </div>
        <div className="mt-1.5 ui-latency-track">
          <div className="ui-latency-indicator" data-tier="critical" style={{ transform: 'scaleX(1)' }} />
        </div>
      </div>
    );
  }

  const info = classifyLatency(latencyMs);
  if (!info) {
    return <span className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums">-</span>;
  }

  const tierTextColor =
    info.tier === 'critical'
      ? 'text-[var(--err)]'
      : info.tier === 'slow' || info.tier === 'moderate'
        ? 'text-[var(--warn)]'
        : 'text-[var(--ok)]';

  return (
    <Meter
      value={info.pct}
      min={0}
      max={100}
      aria-label={`探针延迟 ${info.ms}ms (${info.label})`}
      data-testid="latency-meter"
      data-latency-tier={info.tier}
      className="min-w-[124px] max-w-[156px]"
    >
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-mono font-medium text-[var(--ink)] tabular-nums">
          {info.ms}ms
          {statusCode ? (
            <span className="ml-1.5 font-normal text-[11px] text-[var(--ink-subtle)]">
              {statusCode}
            </span>
          ) : null}
        </span>
        <span className={cn('text-[11px] font-medium whitespace-nowrap', tierTextColor)}>
          {info.label}
        </span>
      </div>
      <MeterTrack className="mt-1.5 ui-latency-track">
        <MeterIndicator
          className="ui-latency-indicator"
          data-tier={info.tier}
          style={{ transform: `scaleX(${info.pct / 100})` }}
        />
      </MeterTrack>
    </Meter>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  ariaLabel,
  testId,
  className = '',
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  ariaLabel?: string;
  testId?: string;
  className?: string;
}) {
  const control = (
    <UiSwitch
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange(Boolean(next))}
      aria-label={ariaLabel || label || '切换开关'}
      data-testid={testId}
      className={cn('ui-switch-root', !label && className)}
    >
      <SwitchThumb className="ui-switch-thumb" />
    </UiSwitch>
  );

  if (!label) return control;

  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 select-none text-[13px] text-[var(--ink-muted)] transition-colors duration-150 ease-out',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:text-[var(--ink)]',
        className,
      )}
    >
      {control}
      <span>{label}</span>
    </label>
  );
}

export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  ariaLabel,
  testId,
  className = '',
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  ariaLabel?: string;
  testId?: string;
  className?: string;
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      label={label}
      disabled={disabled}
      ariaLabel={ariaLabel}
      testId={testId}
      className={className}
    />
  );
}

export function SettingGroup({
  title,
  description,
  meta,
  actions,
  children,
  className = '',
  bodyClassName = '',
  testId,
}: {
  title?: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={cn(
        'min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden',
        className,
      )}
    >
      {(title || actions || meta) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="min-w-[min(100%,220px)] flex-1">
            {title && (
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="text-[15px] font-semibold tracking-tight text-[var(--ink)] leading-snug text-balance">
                  {title}
                </h2>
                {meta && (
                  <span className="text-[12px] text-[var(--ink-subtle)] font-mono tabular-nums">
                    {meta}
                  </span>
                )}
              </div>
            )}
            {description && (
              <p className="mt-1 text-[13px] text-[var(--ink-muted)] leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">{actions}</div>
          )}
        </div>
      )}
      <div className={cn('divide-y divide-[var(--border-subtle)]', bodyClassName)}>{children}</div>
    </section>
  );
}

export function SettingRow({
  title,
  description,
  meta,
  control,
  stacked = false,
  onClick,
  disabled = false,
  className = '',
  testId,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  control?: React.ReactNode;
  stacked?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[13.5px] font-medium text-[var(--ink)] leading-snug">{title}</span>
          {meta && (
            <span className="text-[12px] text-[var(--ink-subtle)] font-mono tabular-nums">
              {meta}
            </span>
          )}
        </div>
        {description && (
          <div className="mt-0.5 text-[12.5px] text-[var(--ink-muted)] leading-relaxed text-pretty">
            {description}
          </div>
        )}
      </div>
      {(control || onClick) && (
        <div
          className={cn(
            stacked ? 'w-full' : 'shrink-0 max-w-full flex items-center gap-2',
          )}
        >
          {control}
          {onClick && (
            <ChevronRight
              className="size-4 text-[var(--ink-subtle)] shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        data-testid={testId}
        className={cn(
          'w-full text-left flex items-center justify-between gap-4 px-5 sm:px-6 py-4 cursor-pointer',
          'transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed',
          FOCUS_RING,
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      data-testid={testId}
      className={cn(
        stacked
          ? 'flex flex-col gap-3 px-5 sm:px-6 py-4'
          : 'flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 px-5 sm:px-6 py-4',
        className,
      )}
    >
      {content}
    </div>
  );
}

export function InspectorDrawer({
  open,
  onOpenChange,
  title,
  description,
  meta,
  size = 'md',
  footer,
  testId,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogBackdrop className="ui-dialog-backdrop" />
      <DialogContent
        data-size={size}
        data-testid={testId}
        className="ui-drawer-content"
      >
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <DialogTitle className="text-[15.5px] font-semibold tracking-tight text-[var(--ink)] leading-snug text-balance">
                {title}
              </DialogTitle>
              {meta && (
                <span className="text-[12px] text-[var(--ink-subtle)] font-mono tabular-nums">
                  {meta}
                </span>
              )}
            </div>
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
            aria-label="关闭抽屉"
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out cursor-pointer shrink-0',
              FOCUS_RING,
            )}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">{children}</div>
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface)]/95 flex flex-wrap items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export interface CommandComboboxOption {
  value: string;
  label: string;
  group?: string;
  description?: string;
  meta?: string;
  keywords?: string[];
  disabled?: boolean;
}

export function CommandCombobox({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  searchPlaceholder = '搜索选项...',
  emptyText = '未匹配到可选项',
  disabled = false,
  allowCustomValue = false,
  headerSlot,
  ariaLabel,
  testId,
  compact = false,
  className = '',
  triggerClassName = '',
}: {
  value: string;
  onChange: (nextValue: string) => void;
  options: ReadonlyArray<CommandComboboxOption>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
  headerSlot?: React.ReactNode;
  ariaLabel?: string;
  testId?: string;
  compact?: boolean;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value],
  );

  const filteredOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((opt) => {
      const haystack = [
        opt.value,
        opt.label,
        opt.group || '',
        opt.description || '',
        opt.meta || '',
        ...(opt.keywords || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  const groupedOptions = React.useMemo(() => {
    const map = new Map<string, CommandComboboxOption[]>();
    for (const opt of filteredOptions) {
      const group = opt.group || '默认';
      const list = map.get(group);
      if (list) list.push(opt);
      else map.set(group, [opt]);
    }
    return [...map.entries()];
  }, [filteredOptions]);

  const selectableItems = React.useMemo(
    () => filteredOptions.filter((opt) => !opt.disabled),
    [filteredOptions],
  );

  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const commitValue = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  const trimmedQuery = query.trim();
  const showCustomEntry =
    allowCustomValue &&
    trimmedQuery.length > 0 &&
    !options.some((opt) => opt.value === trimmedQuery);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (selectableItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % selectableItems.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (selectableItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + selectableItems.length) % selectableItems.length);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (selectableItems[activeIndex]) {
        commitValue(selectableItems[activeIndex].value);
      } else if (showCustomEntry) {
        commitValue(trimmedQuery);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  const activeValue = selectableItems[activeIndex]?.value;

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        data-testid={testId}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={cn(
          'w-full inline-flex items-center justify-between gap-2 text-left cursor-pointer',
          compact ? 'h-8 px-2.5 text-[12px]' : 'h-10 sm:h-9 px-3 text-[13px]',
          inputBaseClass,
          triggerClassName,
        )}
      >
        <span
          className={cn(
            'truncate font-mono text-[12.5px]',
            selectedOption || value ? 'text-[var(--ink)]' : 'text-[var(--ink-subtle)] font-sans',
          )}
          title={selectedOption?.label || value || placeholder}
        >
          {selectedOption?.label || value || placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOption?.meta && !compact && (
            <span className="text-[11px] text-[var(--ink-subtle)] font-mono max-w-[110px] truncate hidden sm:inline">
              {selectedOption.meta}
            </span>
          )}
          <ChevronDown
            className={cn(
              'size-3.5 text-[var(--ink-subtle)] transition-transform duration-150 ease-out',
              open && 'rotate-180',
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 min-w-[260px] rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-modal)] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 border-b border-[var(--border-subtle)]">
            <Search className="size-3.5 text-[var(--ink-subtle)] shrink-0" strokeWidth={1.75} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="清空搜索"
                className="text-[var(--ink-subtle)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>

          {headerSlot && (
            <div className="px-2.5 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40">
              {headerSlot}
            </div>
          )}

          <div className="max-h-[260px] overflow-y-auto p-1.5 space-y-1.5">
            {showCustomEntry && (
              <button
                type="button"
                onClick={() => commitValue(trimmedQuery)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-[12.5px] text-[var(--accent)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors duration-150 ease-out"
              >
                <span className="truncate font-mono">使用自定义值: {trimmedQuery}</span>
                <span className="text-[11px] text-[var(--ink-subtle)] shrink-0">Enter</span>
              </button>
            )}

            {groupedOptions.length === 0 && !showCustomEntry ? (
              <div className="py-6 text-center text-[12.5px] text-[var(--ink-subtle)]">
                {emptyText}
              </div>
            ) : (
              groupedOptions.map(([groupName, items]) => (
                <div key={groupName} className="space-y-0.5">
                  {groupedOptions.length > 1 || groupName !== '默认' ? (
                    <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-[var(--ink-subtle)] select-none">
                      {groupName}
                    </div>
                  ) : null}
                  {items.map((opt) => {
                    const isSelected = opt.value === value;
                    const isActive = opt.value === activeValue;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={opt.disabled}
                        onClick={() => {
                          if (!opt.disabled) commitValue(opt.value);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors duration-150 ease-out',
                          opt.disabled
                            ? 'opacity-45 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-[var(--surface-hover)]',
                          isActive && !opt.disabled && 'bg-[var(--surface-hover)]',
                          isSelected && 'bg-[var(--surface-active)]',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-mono text-[var(--ink)] truncate">
                            {opt.label}
                          </div>
                          {opt.description && (
                            <div className="text-[11.5px] text-[var(--ink-subtle)] truncate">
                              {opt.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {opt.meta && (
                            <span className="text-[11px] font-mono text-[var(--ink-subtle)] truncate max-w-[110px]">
                              {opt.meta}
                            </span>
                          )}
                          {isSelected && (
                            <Check
                              className="size-3.5 text-[var(--accent)] shrink-0"
                              strokeWidth={2}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="min-w-[min(100%,220px)] flex-1">
            {title && (
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--ink)] leading-snug text-balance">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[13px] text-[var(--ink-muted)] leading-relaxed text-pretty">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={cn('p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}

export interface KpiNumericValue {
  primary: number;
  suffix?: string;
  prefix?: string;
  denominator?: number;
}

export interface KpiCellData {
  label: string;
  meta?: string;
  value: string;
  numeric?: KpiNumericValue;
  sub?: string;
  tone?: StatusTone;
  ratioPct?: number;
}

function KpiValueDisplay({ cell, large = false }: { cell: KpiCellData; large?: boolean }) {
  const valColor =
    cell.tone === 'err'
      ? 'text-[var(--err)]'
      : cell.tone === 'warn'
        ? 'text-[var(--warn)]'
        : 'text-[var(--ink)]';

  const sizeClass = large ? 'text-[30px]' : 'text-[24px]';

  if (cell.numeric && Number.isFinite(cell.numeric.primary)) {
    return (
      <div
        className={cn(
          'font-mono font-semibold tracking-tight leading-none tabular-nums flex items-baseline gap-0.5',
          sizeClass,
          valColor,
        )}
      >
        {cell.numeric.prefix && <span className="text-[0.72em] text-[var(--ink-muted)]">{cell.numeric.prefix}</span>}
        <NumberFlow value={cell.numeric.primary} />
        {cell.numeric.denominator != null && (
          <span className="text-[0.65em] font-medium text-[var(--ink-subtle)] ml-0.5">
            /{cell.numeric.denominator}
          </span>
        )}
        {cell.numeric.suffix && (
          <span className="text-[0.62em] font-medium text-[var(--ink-muted)] ml-0.5">
            {cell.numeric.suffix}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'font-mono font-semibold tracking-tight leading-none tabular-nums truncate',
        sizeClass,
        valColor,
      )}
      title={cell.value}
    >
      {cell.value}
    </div>
  );
}

/**
 * Asymmetric Bento KPI strip: leads with a slightly wider primary anchor cell
 * with an inline health proportion bar, paired with compact telemetry tiles.
 */
export function KpiStrip({ cells, asymmetric = false }: { cells: KpiCellData[]; asymmetric?: boolean }) {
  if (asymmetric && cells.length === 4) {
    const [lead, ...rest] = cells;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-[var(--ink-muted)] truncate">
              {lead.label}
            </span>
            {lead.meta && (
              <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                {lead.meta}
              </span>
            )}
          </div>
          <div className="mt-3">
            <KpiValueDisplay cell={lead} large />
          </div>
          <div className="mt-4 space-y-2">
            {lead.ratioPct != null && (
              <div className="h-1.5 w-full rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                <div
                  className={cn(
                    'h-full w-full rounded-full origin-left transition-transform duration-200 ease-out',
                    lead.tone === 'err'
                      ? 'bg-[var(--err-dot)]'
                      : lead.tone === 'warn'
                        ? 'bg-[var(--warn-dot)]'
                        : 'bg-[var(--ok-dot)]',
                  )}
                  style={{ transform: `scaleX(${clampPercent(lead.ratioPct) / 100})` }}
                />
              </div>
            )}
            {lead.sub && (
              <div className="text-[12.5px] text-[var(--ink-subtle)] leading-snug truncate" title={lead.sub}>
                {lead.sub}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden">
          {rest.map((cell) => (
            <div
              key={cell.label}
              className="px-5 py-5 flex flex-col justify-between min-w-0 transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[var(--ink-muted)] truncate">
                  {cell.label}
                </span>
              </div>
              <div className="mt-3">
                <KpiValueDisplay cell={cell} />
              </div>
              {cell.sub && (
                <div
                  className="mt-3 text-[12px] text-[var(--ink-subtle)] leading-snug truncate"
                  title={cell.sub}
                >
                  {cell.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="px-5 sm:px-6 py-5 min-w-0 transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-medium text-[var(--ink-muted)] truncate">
              {cell.label}
            </span>
            {cell.meta && (
              <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums shrink-0">
                {cell.meta}
              </span>
            )}
          </div>
          <div className="mt-2.5">
            <KpiValueDisplay cell={cell} />
          </div>
          {cell.sub && (
            <div
              className="mt-2.5 text-[12.5px] text-[var(--ink-subtle)] leading-snug truncate"
              title={cell.sub}
            >
              {cell.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title = '数据加载失败',
  message,
  onRetry,
  retrying = false,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3"
    >
      <div className="h-10 w-10 rounded-xl border border-[var(--err)]/25 bg-[var(--err)]/5 flex items-center justify-center text-[var(--err)]">
        <AlertTriangle className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="text-[14px] font-medium text-[var(--ink)] text-balance">{title}</p>
        <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed text-pretty">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} disabled={retrying} className="mt-1">
          <RefreshCw className={cn('size-3.5', retrying && 'animate-spin')} strokeWidth={1.75} />
          {retrying ? '重试中...' : '重新加载'}
        </Button>
      )}
    </div>
  );
}

export function WidgetSkeleton({
  heightClass = 'h-[320px]',
  label = '正在加载视图模块',
}: {
  heightClass?: string;
  label?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cn(
        'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)]/50 p-4 flex flex-col justify-between animate-pulse',
        heightClass,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="h-3.5 w-36 rounded bg-[var(--surface-subtle)]" />
        <div className="h-3.5 w-24 rounded bg-[var(--surface-subtle)]" />
      </div>
      <div className="flex-1 my-4 rounded-lg bg-[var(--surface-subtle)]/60" />
      <div className="flex items-center justify-between gap-4">
        <div className="h-3 w-20 rounded bg-[var(--surface-subtle)]" />
        <div className="h-3 w-28 rounded bg-[var(--surface-subtle)]" />
      </div>
    </div>
  );
}

export function ViewSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="正在加载遥测视图">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-[var(--surface-subtle)] animate-pulse" />
          <div className="h-4 w-72 max-w-[75vw] rounded-md bg-[var(--surface-subtle)] animate-pulse" />
        </div>
        <div className="hidden sm:block h-4 w-44 rounded-md bg-[var(--surface-subtle)] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
        <div className="lg:col-span-7 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
      </div>
      <div className="h-[420px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
      <div className="h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--ink-subtle)]">
        <Inbox className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-sm">
        {title && (
          <p className="text-[14px] font-medium text-[var(--ink)] text-balance">{title}</p>
        )}
        <p className="text-[13px] text-[var(--ink-subtle)] leading-relaxed text-pretty">
          {message}
        </p>
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export interface ConfirmModalState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  requireToken?: string;
  requireTokenLabel?: string;
  onConfirm: (token?: string) => Promise<void> | void;
}

export function ConfirmAlertDialog({
  state,
  onClose,
}: {
  state: ConfirmModalState | null;
  onClose: () => void;
}) {
  const [tokenInput, setTokenInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setTokenInput('');
    setBusy(false);
  }, [state?.open, state?.title, state?.requireToken]);

  const tokenRequired = Boolean(state?.requireToken);
  const canSubmit = !busy && (!tokenRequired || tokenInput.trim() === state?.requireToken);

  const handleConfirm = async () => {
    if (!state || !canSubmit) return;
    setBusy(true);
    try {
      await state.onConfirm(tokenRequired ? tokenInput.trim() : undefined);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog
      open={Boolean(state?.open)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogBackdrop className="ui-dialog-backdrop" />
      <AlertDialogContent className="ui-alert-content">
        <AlertDialogTitle className="text-[16px] font-semibold tracking-tight text-[var(--ink)] text-balance">
          {state?.title || '确认操作'}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-[13.5px] text-[var(--ink-muted)] leading-relaxed text-pretty">
          {state?.description || ''}
        </AlertDialogDescription>

        {tokenRequired && (
          <div className="mt-4 space-y-2">
            <label className="block text-[13px] text-[var(--ink-muted)]">
              {state?.requireTokenLabel || '高危操作二次确认'}：请输入{' '}
              <code className="px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--ink)] font-semibold">
                {state?.requireToken}
              </code>
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) {
                  e.preventDefault();
                  void handleConfirm();
                }
              }}
              placeholder={`输入 ${state?.requireToken} 以确认`}
              autoComplete="off"
              autoFocus
              className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <AlertDialogClose
            type="button"
            disabled={busy}
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
          >
            取消
          </AlertDialogClose>
          <Button
            variant={state?.danger ? 'danger' : 'primary'}
            size="md"
            disabled={!canSubmit}
            onClick={handleConfirm}
          >
            {busy ? '执行中...' : state?.confirmLabel || '确认执行'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface CommandEntry {
  id: string;
  label: string;
  group: string;
  keywords?: string[];
  shortcut?: string;
  meta?: string;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  entries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: CommandEntry[];
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, CommandEntry[]>();
    for (const item of entries) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogBackdrop className="ui-dialog-backdrop" />
      <DialogContent className="ui-dialog-content">
        <DialogTitle className="sr-only">快速命令面板</DialogTitle>
        <DialogDescription className="sr-only">
          搜索并跳转视图、受管服务、全球节点或执行快捷运维命令
        </DialogDescription>
        <Cmdk label="全局命令菜单" loop>
          <div className="flex items-center gap-2.5 px-4 border-b border-[var(--border)]">
            <Search className="size-4 text-[var(--ink-subtle)] shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <Cmdk.Input
              autoFocus
              aria-label="搜索视图、服务、日志、进程或快捷操作"
              placeholder="搜索视图、服务、错误日志、节点或快捷操作..."
              className="h-12 w-full bg-transparent text-[16px] sm:text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="关闭命令面板"
              className={cn(
                'h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out cursor-pointer shrink-0',
                FOCUS_RING,
              )}
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          <Cmdk.List className="max-h-[380px] overflow-y-auto p-2">
            <Cmdk.Empty className="py-10 text-center text-[13px] text-[var(--ink-subtle)]">
              未匹配到相关视图、节点或运维操作
            </Cmdk.Empty>
            {groups.map(([groupName, items], idx) => (
              <React.Fragment key={groupName}>
                {idx > 0 && <Cmdk.Separator className="my-1.5 h-px bg-[var(--border-subtle)]" />}
                <Cmdk.Group heading={groupName}>
                  {items.map((item) => (
                    <Cmdk.Item
                      key={item.id}
                      value={`${item.label} ${item.meta || ''} ${(item.keywords || []).join(' ')}`}
                      onSelect={() => {
                        onOpenChange(false);
                        item.onSelect();
                      }}
                    >
                      <span className="truncate font-medium text-[var(--ink)]">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                        {item.meta && (
                          <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate max-w-[180px]">
                            {item.meta}
                          </span>
                        )}
                        {item.shortcut && (
                          <kbd className="font-mono text-[11px] text-[var(--ink-muted)] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)] tabular-nums">
                            {item.shortcut}
                          </kbd>
                        )}
                      </div>
                    </Cmdk.Item>
                  ))}
                </Cmdk.Group>
              </React.Fragment>
            ))}
          </Cmdk.List>
          <div className="hidden sm:flex items-center justify-between px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 text-[11.5px] text-[var(--ink-subtle)] select-none">
            <span>↑ ↓ 切换条目 · Enter 确认执行</span>
            <span className="font-mono">ESC 关闭</span>
          </div>
        </Cmdk>
      </DialogContent>
    </Dialog>
  );
}
