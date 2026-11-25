import React from 'react';
import { Archive, ShieldCheck } from 'lucide-react';
import type { AuditEntry, IncidentItem, SnapshotResponse, TimerItem } from '../types';
import { executeTimerAction, runOpsAction } from '../api';
import { formatDateTime, statusLabel } from '../utils/format';
import {
  EmptyState,
  Panel,
  StatusIndicator,
  type ConfirmModalState,
} from '../components/ui';

export function OpsView({
  snapshot,
  incidents,
  audit,
  readOnly,
  onRefresh,
  onRefreshOps,
  onToast,
  onConfirm,
}: {
  snapshot: SnapshotResponse | null;
  incidents: IncidentItem[];
  audit: AuditEntry[];
  readOnly: boolean;
  onRefresh: () => Promise<void>;
  onRefreshOps: () => Promise<void>;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
  onConfirm: (modal: ConfirmModalState) => void;
}) {
  const [opsBusy, setOpsBusy] = React.useState<'health-check' | 'backup' | null>(null);
  const [opsOutput, setOpsOutput] = React.useState('');

  const timers: TimerItem[] = snapshot?.services?.timers || snapshot?.timers || [];

  const handleRunOps = (action: 'health-check' | 'backup') => {
    if (readOnly) {
      onToast('只读模式已禁用运维命令执行', 'err');
      return;
    }
    const label = action === 'health-check' ? '全栈健康巡检' : '配置与状态快照备份';
    onConfirm({
      open: true,
      title: `执行运维任务：${label}`,
      description: `确认在控制面主机执行受限白名单任务「${label}」？执行记录将记入审计日志。`,
      confirmLabel: '确认执行',
      onConfirm: async () => {
        setOpsBusy(action);
        try {
          const res = await runOpsAction(action);
          setOpsOutput(res.output || res.message || `${label} 已完成。`);
          onToast(`${label} 执行完成`, 'ok');
          await Promise.all([onRefresh(), onRefreshOps()]);
        } catch (err) {
          onToast(`${label} 失败：${(err as Error).message}`, 'err');
        } finally {
          setOpsBusy(null);
        }
      },
    });
  };

  const handleTimerAction = (timer: TimerItem, action: string) => {
    if (!action) return;
    if (readOnly) {
      onToast('只读模式已禁用定时器操作', 'err');
      return;
    }
    onConfirm({
      open: true,
      title: `定时器操作：${timer.name || timer.unit}`,
      description: `确认对定时任务 ${timer.unit} 执行 ${action} 操作？`,
      confirmLabel: '确认执行',
      danger: action === 'stop' || action === 'disable',
      onConfirm: async () => {
        try {
          await executeTimerAction(timer.unit, action);
          onToast(`定时器 ${timer.unit} 已执行 ${action}`, 'ok');
          await Promise.all([onRefresh(), onRefreshOps()]);
        } catch (err) {
          onToast(`操作失败：${(err as Error).message}`, 'err');
        }
      },
    });
  };

  const allIncidents = incidents.length > 0 ? incidents : snapshot?.incidents || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--ink)] leading-tight">
            运维、定时任务与审计
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--ink-muted)]">
            白名单巡检与备份任务、systemd 定时器控制、持久化事件与操作审计轨迹。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={opsBusy !== null || readOnly}
            onClick={() => handleRunOps('health-check')}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[7px] border border-[var(--border)] bg-[var(--surface)] text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-45"
          >
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            {opsBusy === 'health-check' ? '巡检中...' : '执行全栈健康巡检'}
          </button>
          <button
            type="button"
            disabled={opsBusy !== null || readOnly}
            onClick={() => handleRunOps('backup')}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[7px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-45"
          >
            <Archive className="h-4 w-4" />
            {opsBusy === 'backup' ? '备份中...' : '触发配置备份'}
          </button>
        </div>
      </div>

      {opsOutput && (
        <Panel
          title="运维命令输出"
          actions={
            <button
              type="button"
              onClick={() => setOpsOutput('')}
              className="text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              收起
            </button>
          }
        >
          <pre className="m-0 rounded-[8px] bg-[var(--terminal-bg)] text-[var(--terminal-ink)] p-4 font-mono text-[12px] overflow-x-auto whitespace-pre-wrap max-h-[260px]">
            {opsOutput}
          </pre>
        </Panel>
      )}

      <Panel
        title="systemd 定时任务"
        description="自动化备份、索引维护与健康检查计划任务状态。"
        bodyClassName="p-0"
      >
        {timers.length === 0 ? (
          <EmptyState message="尚未配置受管 systemd 定时任务。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                  <th className="py-2.5 pl-5 pr-3">定时单元</th>
                  <th className="py-2.5 px-3">状态</th>
                  <th className="py-2.5 px-3">下次触发</th>
                  <th className="py-2.5 px-3">上次运行</th>
                  <th className="py-2.5 pl-3 pr-5 text-right">控制</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                {timers.map((t) => (
                  <tr key={t.unit} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-2.5 pl-5 pr-3">
                      <div className="font-medium text-[var(--ink)]">{t.name || t.unit}</div>
                      <div className="font-mono text-[12px] text-[var(--ink-subtle)]">{t.unit}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusIndicator status={t.status || t.activeState} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]">
                      {t.nextElapse || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)]">
                      {t.lastTrigger || '-'}
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-right">
                      <select
                        defaultValue=""
                        disabled={readOnly}
                        aria-label={`操作定时器 ${t.unit}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          e.target.value = '';
                          if (val) handleTimerAction(t, val);
                        }}
                        className="h-8 px-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] text-[12.5px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-45 cursor-pointer"
                      >
                        <option value="" disabled>
                          操作...
                        </option>
                        <option value="trigger">立即触发</option>
                        <option value="start">启动</option>
                        <option value="stop">停止</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="持久化状态变更事件"
          description="记录全栈服务与连接器的健康度漂移历史。"
        >
          {allIncidents.length === 0 ? (
            <EmptyState message="暂无持久化状态变更记录。" />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {allIncidents.slice(0, 12).map((inc, idx) => {
                const actor = inc.node || inc.component || inc.target || inc.entityKey || '系统';
                const fromS = inc.fromState || inc.fromStatus || inc.from;
                const toS = inc.toState || inc.toStatus || inc.to;
                const transition = fromS || toS ? `${statusLabel(fromS)} → ${statusLabel(toS)}` : '';
                const detail = inc.detail || inc.message || inc.summary || '';
                return (
                  <li
                    key={inc.id || `${inc.ts}-${idx}`}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-[13px]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-medium text-[var(--ink)]">{actor}</span>
                        {transition && (
                          <span className="font-mono text-[12px] text-[var(--ink-muted)]">
                            {transition}
                          </span>
                        )}
                      </div>
                      {detail && (
                        <p className="mt-0.5 text-[12px] text-[var(--ink-subtle)] truncate" title={detail}>
                          {detail}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[12px] text-[var(--ink-subtle)] shrink-0">
                      {formatDateTime(inc.ts || inc.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="不可变操作审计轨迹"
          description="所有写操作、探针登记与命令触发均留痕可溯。"
          bodyClassName="p-0"
        >
          {audit.length === 0 ? (
            <EmptyState message="暂无操作审计记录。" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]">
                    <th className="py-2.5 pl-5 pr-3">时间</th>
                    <th className="py-2.5 px-3">操作与目标</th>
                    <th className="py-2.5 pl-3 pr-5 text-right">结果</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                  {audit.slice(0, 15).map((item, idx) => (
                    <tr key={`${item.ts || idx}-${idx}`} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="py-2.5 pl-5 pr-3 font-mono text-[12px] text-[var(--ink-subtle)] whitespace-nowrap">
                        {formatDateTime(item.ts || item.timestamp)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[var(--ink)]">{item.action || '-'}</span>
                        {item.target && (
                          <span className="ml-1.5 font-mono text-[12px] text-[var(--ink-muted)]">
                            {item.target}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <StatusIndicator
                          status={item.ok === false || item.status === 'error' ? 'failed' : 'healthy'}
                          label={item.ok === false ? '失败' : item.result || '成功'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
