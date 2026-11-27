import React from 'react';
import type {
  LogFilterState,
  MetaResponse,
  SnapshotResponse,
} from '../types';
import { LogStreamPanel } from '../components/LogStreamPanel';
import { Panel } from '../components/ui';
import { ModuleFrame } from '../modules/ModuleFrame';

export function LogsView({
  snapshot,
  meta,
  initialUnit,
  initialLevel = 'all',
  initialFilter = null,
  requestNonce = 0,
  onToast,
}: {
  snapshot: SnapshotResponse | null;
  meta: MetaResponse | null;
  initialUnit?: string;
  initialLevel?: string;
  initialFilter?: Partial<LogFilterState> | null;
  requestNonce?: number;
  onToast: (text: string, tone?: 'info' | 'ok' | 'err') => void;
}) {
  const [counts, setCounts] = React.useState({ total: 0, error: 0, warn: 0, info: 0 });

  const resolvedInitialFilter = React.useMemo<Partial<LogFilterState>>(() => {
    if (initialFilter) {
      return initialFilter;
    }
    if (initialUnit) {
      return {
        source: 'service',
        target: initialUnit,
        targets: [initialUnit],
        since: '1h',
        level: initialLevel || 'all',
        query: '',
        regex: false,
      };
    }
    return {
      source: 'unified',
      target: 'all',
      targets: ['all'],
      since: '1h',
      level: initialLevel || 'all',
      query: '',
      regex: false,
    };
  }, [initialFilter, initialUnit, initialLevel]);

  return (
    <ModuleFrame
      title="大一统直读日志中心"
      description="原位直读跨服务 journald、白名单原生日志文件、自身运行与审计日志；受限字节尾读防大文件拖慢，支持多源筛选与 SSE 实时追踪。"
      meta={`总计 ${counts.total} · 错误 ${counts.error} · 警告 ${counts.warn} · 信息 ${counts.info}`}
    >
      <Panel bodyClassName="p-0">
        <LogStreamPanel
          mode="full"
          snapshot={snapshot}
          meta={meta}
          initialFilter={resolvedInitialFilter}
          requestNonce={requestNonce}
          onCountsChange={setCounts}
          onToast={onToast}
        />
      </Panel>
    </ModuleFrame>
  );
}
