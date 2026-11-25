import React from 'react';
import {
  SegmentedControl,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandItemText,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@ui-sdk/react/command';
import { Switch, SwitchThumb } from '@ui-sdk/react/switch';
import { Meter, MeterIndicator, MeterTrack } from '@ui-sdk/react/meter';
import { Inbox, Search, X } from 'lucide-react';
import type { StatusTone } from '../types';
import { clampPercent, classifyLatency, statusLabel, statusTone } from '../utils/format';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
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
      onValueChange={(v) => {
        if (v) onChange(v as T);
      }}
      aria-label={ariaLabel}
      className={`ui-seg-root ${className}`}
    >
      <SegmentedControlIndicator className="ui-seg-indicator" />
      {options.map((opt) => (
        <SegmentedControlItem key={opt.value} value={opt.value} className="ui-seg-item">
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
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
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap ${textColor}`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
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
          <span className="truncate font-medium text-[var(--ink)]">{label}</span>
          <span className="font-mono text-[12.5px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
            {valueText ?? `${pct}%`}
          </span>
        </div>
      )}
      <MeterTrack className="ui-meter-track">
        <MeterIndicator
          className="ui-meter-indicator"
          data-tone={resolvedTone}
          style={{ width: `${pct}%` }}
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
      <div className="min-w-[144px] max-w-[196px]">
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="font-mono font-medium text-[var(--err)] truncate" title={error || '探针异常'}>
            {error || '探针异常'}
          </span>
        </div>
        <div className="mt-1.5 ui-latency-track">
          <div className="ui-latency-indicator" data-tier="critical" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  const info = classifyLatency(latencyMs);
  if (!info) {
    return <span className="font-mono text-[12px] text-[var(--ink-subtle)]">-</span>;
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
        <span className="font-mono font-semibold text-[var(--ink)] tabular-nums">
          {info.ms}ms
          {statusCode ? (
            <span className="ml-1.5 font-normal text-[11px] text-[var(--ink-subtle)]">
              {statusCode}
            </span>
          ) : null}
        </span>
        <span className={`text-[11px] font-medium whitespace-nowrap ${tierTextColor}`}>
          {info.label}
        </span>
      </div>
      <MeterTrack className="mt-1.5 ui-latency-track">
        <MeterIndicator
          className="ui-latency-indicator"
          data-tier={info.tier}
          style={{ width: `${info.pct}%` }}
        />
      </MeterTrack>
    </Meter>
  );
}

export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors">
      <Switch
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(Boolean(next))}
        aria-label={label}
        className="ui-switch-root"
      >
        <SwitchThumb className="ui-switch-thumb" />
      </Switch>
      <span>{label}</span>
    </label>
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
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] ${className}`}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--ink)] leading-snug">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[13px] text-[var(--ink-muted)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">{actions}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export interface KpiCellData {
  label: string;
  kicker?: string;
  value: string;
  sub?: string;
  tone?: StatusTone;
}

export function KpiStrip({ cells }: { cells: KpiCellData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden">
      {cells.map((cell, idx) => {
        const valColor =
          cell.tone === 'err'
            ? 'text-[var(--err)]'
            : cell.tone === 'warn'
              ? 'text-[var(--warn)]'
              : 'text-[var(--ink)]';
        return (
          <div
            key={cell.label}
            className={`px-6 py-5 min-w-0 transition-colors duration-150 ease-out hover:bg-[var(--surface-hover)] ${
              idx === 0 ? 'bg-[var(--surface-hover)]/40' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-[var(--ink-muted)]">
                {cell.label}
              </span>
              {cell.kicker && (
                <span className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--ink-subtle)]">
                  {cell.kicker}
                </span>
              )}
            </div>
            <div
              className={`mt-2.5 font-mono text-[26px] font-semibold tracking-tight leading-none tabular-nums ${valColor}`}
            >
              {cell.value}
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
        );
      })}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-2.5">
      <div className="h-9 w-9 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--ink-subtle)]">
        <Inbox className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <p className="text-[13px] text-[var(--ink-subtle)] max-w-sm leading-relaxed">{message}</p>
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
        <AlertDialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
          {state?.title || '确认操作'}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-[13.5px] text-[var(--ink-muted)] leading-relaxed">
          {state?.description || ''}
        </AlertDialogDescription>

        {tokenRequired && (
          <div className="mt-4 space-y-2">
            <label className="block text-[13px] text-[var(--ink-muted)]">
              关键基础设施二次确认：请输入{' '}
              <code className="px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--ink)] font-semibold">
                {state?.requireToken}
              </code>
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={state?.requireToken}
              autoComplete="off"
              className="w-full h-9 px-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg)] text-[13.5px] font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <AlertDialogClose
            type="button"
            disabled={busy}
            className="h-9 px-3.5 rounded-[7px] border border-[var(--border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            取消
          </AlertDialogClose>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleConfirm}
            className={`h-9 px-4 rounded-[7px] text-[13px] font-medium text-white transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              state?.danger
                ? 'bg-[var(--err-dot)] hover:bg-[var(--err)]'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
            }`}
          >
            {busy ? '执行中...' : state?.confirmLabel || '确认执行'}
          </button>
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
        <Command
          onAction={(val) => {
            const match = entries.find((e) => e.id === val);
            if (match) {
              onOpenChange(false);
              match.onSelect();
            }
          }}
        >
          <div className="flex items-center gap-2.5 px-4 border-b border-[var(--border)]">
            <Search className="h-4 w-4 text-[var(--ink-subtle)] shrink-0" aria-hidden="true" />
            <CommandInput
              aria-label="搜索视图、服务、日志级别、PID 进程或快捷操作"
              placeholder="搜索视图、Error/Warn 日志、输入 PID 查找 Agent 进程..."
              className="h-12 w-full bg-transparent text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="关闭命令面板"
              className="p-1 rounded text-[var(--ink-subtle)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <CommandList className="max-h-[360px] overflow-y-auto p-2">
            {groups.map(([groupName, items], idx) => (
              <React.Fragment key={groupName}>
                {idx > 0 && <CommandSeparator className="my-1.5 h-px bg-[var(--border-subtle)]" />}
                <CommandGroup>
                  <CommandGroupLabel className="px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink-subtle)]">
                    {groupName}
                  </CommandGroupLabel>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      label={item.label}
                      keywords={item.keywords}
                      shortcut={item.shortcut}
                      className="ui-cmd-item flex items-center justify-between gap-3 px-2.5 py-2 rounded-[6px] text-[13.5px] text-[var(--ink-muted)] cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CommandItemText className="truncate font-medium text-[var(--ink)]">
                          {item.label}
                        </CommandItemText>
                        {item.meta && (
                          <span className="font-mono text-[12px] text-[var(--ink-subtle)] truncate">
                            {item.meta}
                          </span>
                        )}
                      </div>
                      {item.shortcut && (
                        <CommandShortcut className="font-mono text-[11.5px] text-[var(--ink-subtle)] shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
          <CommandEmpty className="py-10 text-center text-[13px] text-[var(--ink-subtle)]">
            未匹配到相关视图、节点或运维操作
          </CommandEmpty>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'ok' | 'err';
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-[360px]"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const dot =
          t.tone === 'ok'
            ? 'bg-[var(--ok-dot)]'
            : t.tone === 'err'
              ? 'bg-[var(--err-dot)]'
              : 'bg-[var(--accent)]';
        return (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] shadow-lg text-[13px] text-[var(--ink)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
              <span className="truncate">{t.text}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="关闭通知"
              className="text-[var(--ink-subtle)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
