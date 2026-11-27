import React from 'react';

export function ModuleFrame({
  title,
  description,
  meta,
  actions,
  testId,
  spacing = 'default',
  children,
}: {
  title: string;
  description: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  testId?: string;
  spacing?: 'default' | 'compact';
  children: React.ReactNode;
}) {
  const spacingClass = spacing === 'compact' ? 'space-y-6' : 'space-y-8';
  return (
    <div className={`${spacingClass} min-w-0`} data-testid={testId}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--ink)] leading-tight text-balance">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed text-pretty">
            {description}
          </p>
        </div>
        {(meta || actions) && (
          <div className="flex flex-wrap items-center gap-3 shrink-0 max-w-full">
            {meta && (
              <div className="font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums truncate max-w-full">
                {meta}
              </div>
            )}
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
