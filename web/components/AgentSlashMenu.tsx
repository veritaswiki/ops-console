import React from 'react';
import { AtSign, CornerDownLeft, Terminal, X } from 'lucide-react';
import type { A2AAgentPeer } from '../types';
import {
  isAgentOnline,
  shortAgentName,
  type SlashCommandCategory,
  type SlashCommandDef,
} from '../lib/agent-console';
import { cn, FOCUS_RING } from '../lib/cn';

const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  dispatch: '调度',
  control: '控制',
  context: '上下文',
  inspect: '诊断',
};

export interface AgentSlashMenuProps {
  open: boolean;
  mode: 'slash' | 'mention';
  commands: SlashCommandDef[];
  agents: A2AAgentPeer[];
  activeIndex: number;
  query: string;
  onHoverIndex: (index: number) => void;
  onSelectCommand: (command: SlashCommandDef) => void;
  onSelectAgent: (agent: A2AAgentPeer) => void;
  onClose: () => void;
}

export function AgentSlashMenu({
  open,
  mode,
  commands,
  agents,
  activeIndex,
  query,
  onHoverIndex,
  onSelectCommand,
  onSelectAgent,
  onClose,
}: AgentSlashMenuProps) {
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex, mode]);

  if (!open) return null;

  const itemCount = mode === 'slash' ? commands.length : agents.length;

  return (
    <div
      role="listbox"
      aria-label={mode === 'slash' ? '斜杠命令列表' : '可路由的 Agent 列表'}
      data-testid="agent-slash-menu"
      onMouseDown={(event) => event.preventDefault()}
      className="absolute bottom-full left-0 right-0 mb-2 z-30 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] shadow-[var(--shadow-modal)] overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/60">
        <div className="flex items-center gap-2 min-w-0 text-[12px] text-[var(--ink-muted)]">
          {mode === 'slash' ? (
            <Terminal className="size-3.5 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
          ) : (
            <AtSign className="size-3.5 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
          )}
          <span className="font-medium text-[var(--ink)]">
            {mode === 'slash' ? '斜杠命令' : '指定执行 Agent / 节点'}
          </span>
          {query && (
            <>
              <span aria-hidden="true" className="text-[var(--ink-subtle)]">
                ·
              </span>
              <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                {mode === 'slash' ? `/${query.replace(/^\/+/, '')}` : `@${query}`}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
            {itemCount} 项
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭命令菜单"
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
              FOCUS_RING,
            )}
          >
            <X className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div ref={listRef} className="max-h-[292px] overflow-y-auto p-1.5">
        {itemCount === 0 ? (
          <div className="px-3 py-5 text-center text-[12.5px] text-[var(--ink-subtle)]">
            {mode === 'slash'
              ? '没有匹配的斜杠命令，按 Esc 关闭或输入 /help 查看全部用法'
              : '没有匹配的 Agent 或设备节点'}
          </div>
        ) : mode === 'slash' ? (
          commands.map((command, idx) => {
            const isActive = idx === activeIndex;
            const argsPart = command.usage.slice(command.name.length).trim();
            const cmdSlug = command.name.slice(1);
            return (
              <button
                key={command.name}
                type="button"
                role="option"
                aria-selected={isActive}
                data-active={isActive ? 'true' : 'false'}
                data-testid={`agent-slash-item-${cmdSlug}`}
                onMouseEnter={() => onHoverIndex(idx)}
                onClick={() => onSelectCommand(command)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left cursor-pointer',
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span
                      className={cn(
                        'font-mono text-[12.5px] font-medium shrink-0',
                        isActive ? 'text-[var(--accent)]' : 'text-[var(--ink)]',
                      )}
                    >
                      {command.name}
                    </span>
                    {argsPart && (
                      <span className="font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                        {argsPart}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-[var(--ink-muted)] truncate">
                    {command.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-[var(--ink-subtle)]">
                  <span className="hidden sm:inline">{CATEGORY_LABELS[command.category]}</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-[10.5px] text-[var(--ink-muted)]">
                    {command.shortcutHint === 'Enter' && (
                      <CornerDownLeft className="size-2.5" strokeWidth={1.75} />
                    )}
                    {command.shortcutHint}
                  </kbd>
                </div>
              </button>
            );
          })
        ) : (
          agents.map((agent, idx) => {
            const isActive = idx === activeIndex;
            const online = isAgentOnline(agent.status);
            return (
              <button
                key={agent.id}
                type="button"
                role="option"
                aria-selected={isActive}
                data-active={isActive ? 'true' : 'false'}
                data-testid={`agent-mention-item-${agent.id}`}
                onMouseEnter={() => onHoverIndex(idx)}
                onClick={() => onSelectAgent(agent)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left cursor-pointer',
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      online ? 'bg-[var(--ok-dot)]' : 'bg-[var(--muted-dot)]',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-[13px] font-medium text-[var(--ink)] truncate">
                        {shortAgentName(agent.name)}
                      </span>
                      <span className="font-mono text-[11.5px] text-[var(--accent)] truncate">
                        @{agent.id}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-subtle)] truncate">
                      <span>{agent.nodeName || agent.nodeId}</span>
                      <span aria-hidden="true">·</span>
                      <span>{agent.modelHint || agent.harness}</span>
                      {agent.role === 'lead' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>主控</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'font-mono text-[11px] shrink-0',
                    online ? 'text-[var(--ok)]' : 'text-[var(--ink-subtle)]',
                  )}
                >
                  {online ? '在线' : '离线'}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 font-mono text-[11px] text-[var(--ink-subtle)]">
        <span>↑↓ 选择 · Tab / Enter 确认 · Esc 关闭</span>
        <span className="hidden sm:inline">
          {mode === 'slash' ? '支持 @agent 快捷路由' : '自动切换目标执行节点'}
        </span>
      </div>
    </div>
  );
}

export default AgentSlashMenu;
