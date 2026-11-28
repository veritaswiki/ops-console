import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  GitBranch,
} from 'lucide-react';
import type { NeedsYouItem } from '../../lib/workspace-controls';
import { cn, FOCUS_RING } from '../../lib/cn';
import { formatRelativeAge } from '../../utils/format';
import { AnimatedCollapse, Disclosure, DisclosureChevron } from '../ui';

export interface MobileNeedsYouStreamProps {
  items: NeedsYouItem[];
  readOnly?: boolean;
  onOpenTask: (taskId: string) => void;
  onOpenBtw: (taskId: string, threadId?: string) => void;
  onSettleTask: (taskId: string) => void;
  onSnoozeTask: (taskId: string, minutes: number) => void;
}

function severityRank(severity: NeedsYouItem['severity']): number {
  if (severity === 'err') return 2;
  if (severity === 'warn') return 1;
  return 0;
}

function severityDotClass(severity: NeedsYouItem['severity']): string {
  if (severity === 'err') return 'bg-[var(--err-dot)]';
  if (severity === 'warn') return 'bg-[var(--warn-dot)]';
  return 'bg-[var(--accent)]';
}

function severityTextClass(severity: NeedsYouItem['severity']): string {
  if (severity === 'err') return 'text-[var(--err)]';
  if (severity === 'warn') return 'text-[var(--warn)]';
  return 'text-[var(--accent)]';
}

function kindLabel(kind: NeedsYouItem['kind']): string {
  if (kind === 'btw_approval') return '支线待审批';
  if (kind === 'snooze_woken') return '提醒已到达';
  if (kind === 'task_failed') return '执行失败';
  return '待关注';
}

function triageButtonClass(danger = false): string {
  return cn(
    'ui-press inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md px-2.5 text-[12px] font-medium cursor-pointer touch-manipulation disabled:opacity-45 disabled:pointer-events-none sm:min-h-[32px] sm:text-[11.5px]',
    danger
      ? 'text-[var(--err)] hover:bg-[var(--err-dot)]/10'
      : 'text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
    FOCUS_RING,
  );
}

export function MobileNeedsYouStream({
  items,
  readOnly = false,
  onOpenTask,
  onOpenBtw,
  onSettleTask,
  onSnoozeTask,
}: MobileNeedsYouStreamProps) {
  const [expanded, setExpanded] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.matchMedia?.('(max-width: 767px)').matches === true;
    } catch {
      return false;
    }
  });

  const topSeverity = items.reduce<NeedsYouItem['severity']>(
    (worst, item) =>
      severityRank(item.severity) > severityRank(worst) ? item.severity : worst,
    'info',
  );
  const topItem = items[0];
  const btwPending = items.filter((item) => item.kind === 'btw_approval').length;
  const failed = items.filter((item) => item.kind === 'task_failed').length;

  return (
    <AnimatedCollapse open={items.length > 0}>
    <section
      data-testid="mobile-needs-you-stream"
      aria-label="待你处理"
      className={cn(
        'overflow-hidden rounded-xl border bg-[var(--surface)] transition-colors duration-150 ease-out',
        topSeverity === 'err'
          ? 'border-[var(--err-dot)]/30'
          : topSeverity === 'warn'
            ? 'border-[var(--warn-dot)]/30'
            : 'border-[var(--border)]',
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className={cn(
          'flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-150 ease-out cursor-pointer sm:min-h-[36px]',
          topSeverity === 'err'
            ? 'bg-[var(--err-dot)]/5'
            : topSeverity === 'warn'
              ? 'bg-[var(--warn-dot)]/5'
              : 'bg-[var(--accent-soft)]/40',
          FOCUS_RING,
        )}
      >
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', severityDotClass(topSeverity))}
        />
        <AlertTriangle
          className={cn('size-3.5 shrink-0', severityTextClass(topSeverity))}
          strokeWidth={1.75}
        />
        <span className="shrink-0 text-[12px] font-semibold text-[var(--ink)]">待你处理</span>
        <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
          {items.length}
        </span>
        {!expanded && topItem ? (
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--ink-subtle)]">
            {topItem.title}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <span className="hidden shrink-0 items-center gap-2 font-mono text-[10.5px] text-[var(--ink-subtle)] tabular-nums sm:flex">
          {btwPending > 0 ? <span>{btwPending} 项待审</span> : null}
          {failed > 0 ? <span>{failed} 项失败</span> : null}
        </span>
        <DisclosureChevron open={expanded} className="text-[var(--ink-subtle)]" />
      </button>

      <Disclosure open={expanded}>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {items.map((item) => {
            const hasTask = Boolean(item.taskId);
            const canBtw = Boolean(item.threadId) || item.kind === 'btw_approval';
            return (
              <li key={item.id} className="px-3 py-2.5 sm:py-2">
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', severityDotClass(item.severity))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className={cn('text-[11px] font-medium', severityTextClass(item.severity))}>
                        {kindLabel(item.kind)}
                      </span>
                      <span className="text-[10.5px] text-[var(--ink-subtle)]">
                        {formatRelativeAge(item.updatedAt)}
                      </span>
                      {item.nodeId ? (
                        <span className="font-mono text-[10.5px] text-[var(--ink-subtle)]">
                          {item.nodeId}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] font-medium text-[var(--ink)]" title={item.title}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-0.5 pl-3.5">
                  <button
                    type="button"
                    disabled={!hasTask}
                    onClick={() => {
                      if (hasTask) onOpenTask(item.taskId);
                    }}
                    className={triageButtonClass()}
                  >
                    查看
                    <ArrowRight className="size-3.5" strokeWidth={1.75} />
                  </button>
                  {canBtw ? (
                    <button
                      type="button"
                      disabled={!hasTask && !item.threadId}
                      onClick={() => onOpenBtw(item.taskId, item.threadId)}
                      className={triageButtonClass()}
                    >
                      <GitBranch className="size-3.5" strokeWidth={1.75} />
                      查看支线
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={readOnly || !hasTask}
                    onClick={() => {
                      if (hasTask) onSettleTask(item.taskId);
                    }}
                    className={triageButtonClass()}
                  >
                    <Check className="size-3.5" strokeWidth={1.75} />
                    已处理
                  </button>
                  <button
                    type="button"
                    disabled={readOnly || !hasTask}
                    onClick={() => {
                      if (hasTask) onSnoozeTask(item.taskId, 30);
                    }}
                    className={triageButtonClass()}
                  >
                    <Clock3 className="size-3.5" strokeWidth={1.75} />
                    30 分钟后提醒
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Disclosure>
    </section>
    </AnimatedCollapse>
  );
}

export default MobileNeedsYouStream;
