import React from 'react';
import { Check, Copy } from 'lucide-react';
import { cn, FOCUS_RING } from '../../lib/cn';
import { ToggleSwitch } from '../ui';

export function SettingsField({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5 text-[12.5px]', className)}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-[var(--ink-muted)]">{label}</span>
        {hint && <span className="text-[11.5px] text-[var(--ink-subtle)]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function SettingsRow({
  title,
  description,
  control,
  className = '',
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-[var(--ink)] leading-snug">{title}</div>
        {description && (
          <div className="mt-0.5 text-[12.5px] text-[var(--ink-muted)] leading-relaxed text-pretty">
            {description}
          </div>
        )}
      </div>
      <div className="shrink-0 max-w-full">{control}</div>
    </div>
  );
}

export function SettingsToggleItem({
  checked,
  disabled = false,
  label,
  onChange,
  testId,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  testId?: string;
}) {
  return (
    <ToggleSwitch
      checked={checked}
      disabled={disabled}
      label={label}
      onCheckedChange={onChange}
      testId={testId}
    />
  );
}

export function SettingsInsetSurface({
  children,
  className = '',
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'rounded-xl bg-[var(--surface-subtle)]/65 px-3.5 py-3 text-[12.5px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CommandSnippet({
  title,
  command,
  copyKey,
  copiedKey,
  onCopy,
}: {
  title: string;
  command: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string, label: string) => void;
}) {
  const isCopied = copiedKey === copyKey;
  return (
    <div className="rounded-xl bg-[var(--surface-subtle)]/70 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-[var(--border-subtle)]">
        <span className="text-[12px] font-medium text-[var(--ink-muted)]">{title}</span>
        <button
          type="button"
          onClick={() => onCopy(copyKey, command, title)}
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-medium cursor-pointer transition-colors duration-150 ease-out',
            isCopied
              ? 'text-[var(--ok)] bg-[var(--ok-soft)]'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]',
            FOCUS_RING,
          )}
        >
          {isCopied ? <Check className="size-3.5" strokeWidth={2} /> : <Copy className="size-3.5" strokeWidth={1.75} />}
          <span>{isCopied ? '已复制' : '复制'}</span>
        </button>
      </div>
      <pre className="px-3.5 py-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-[var(--ink)] whitespace-pre">
        {command}
      </pre>
    </div>
  );
}
