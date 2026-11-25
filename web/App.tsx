import React from 'react';
import {
  Bot,
  Database,
  Globe,
  Layers,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Network,
  RefreshCw,
  Search,
  Sun,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import type {
  AuditEntry,
  IncidentItem,
  MetaResponse,
  ProbesResponse,
  SnapshotResponse,
  ViewId,
} from './types';
import {
  fetchAudit,
  fetchIncidents,
  fetchMeta,
  fetchProbes,
  fetchSnapshot,
  logoutSession,
} from './api';
import { formatClock, statusLabel } from './utils/format';
import {
  CommandPalette,
  ConfirmAlertDialog,
  ToastStack,
  type CommandEntry,
  type ConfirmModalState,
  type ToastMessage,
} from './components/ui';
import { OverviewView } from './views/OverviewView';
import { FleetView } from './views/FleetView';
import { ServicesView } from './views/ServicesView';
import { MemoryView } from './views/MemoryView';
import { AgentsView } from './views/AgentsView';
import { NetworkView } from './views/NetworkView';
import { LogsView } from './views/LogsView';
import { OpsView } from './views/OpsView';

interface NavItemConfig {
  key: ViewId;
  label: string;
  section: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    key: 'overview',
    label: '系统总览',
    section: '观测',
    keywords: ['overview', 'dashboard', '总览', '架构', '拓扑', '主界面'],
    icon: LayoutGrid,
  },
  {
    key: 'fleet',
    label: '全球节点',
    section: '观测',
    keywords: ['fleet', 'map', 'probe', '节点', '地图', '探针', '手机'],
    icon: Globe,
  },
  {
    key: 'services',
    label: '受管服务',
    section: '基础设施',
    keywords: ['services', 'systemd', 'service', '服务', '重启', '进程'],
    icon: Layers,
  },
  {
    key: 'memory',
    label: '记忆引擎',
    section: '基础设施',
    keywords: ['memory', 'nmem', 'openviking', 'symbiote', 'rerank', '记忆', '检索'],
    icon: Database,
  },
  {
    key: 'agents',
    label: '网关与 Agent',
    section: '基础设施',
    keywords: ['agents', 'magpie', 'gateway', 'mcp', '模型', '网关'],
    icon: Bot,
  },
  {
    key: 'network',
    label: '网络与防火墙',
    section: '基础设施',
    keywords: ['network', 'tailscale', 'mihomo', 'syncthing', 'ssh', '网络', '防火墙'],
    icon: Network,
  },
  {
    key: 'logs',
    label: '统一日志',
    section: '运维',
    keywords: ['logs', 'journald', 'tail', 'stream', '日志', '实时流'],
    icon: Terminal,
  },
  {
    key: 'ops',
    label: '运维与审计',
    section: '运维',
    keywords: ['ops', 'timers', 'backup', 'audit', 'incidents', '运维', '备份', '审计'],
    icon: Wrench,
  },
];

const THEME_STORAGE_KEY = 'ops-console-theme';

function readInitialTheme(): 'light' | 'dark' {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'dark';
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage access errors
  }
}

export function App() {
  const [view, setView] = React.useState<ViewId>('overview');
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => readInitialTheme());
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  const [meta, setMeta] = React.useState<MetaResponse | null>(null);
  const [snapshot, setSnapshot] = React.useState<SnapshotResponse | null>(null);
  const [probes, setProbes] = React.useState<ProbesResponse | null>(null);
  const [incidents, setIncidents] = React.useState<IncidentItem[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);

  const [pollMs, setPollMs] = React.useState<number>(10000);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [syncError, setSyncError] = React.useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = React.useState<string>('');

  const [logsInitialUnit, setLogsInitialUnit] = React.useState<string>('');
  const [logsInitialLevel, setLogsInitialLevel] = React.useState<string>('all');
  const [logsRequestNonce, setLogsRequestNonce] = React.useState<number>(0);
  const [recentServiceUnits, setRecentServiceUnits] = React.useState<string[]>([]);
  const [agentCategory, setAgentCategory] = React.useState<string>('');
  const [agentPid, setAgentPid] = React.useState<number | null>(null);
  const [confirmState, setConfirmState] = React.useState<ConfirmModalState | null>(null);
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const pushToast = React.useCallback((text: string, tone: 'info' | 'ok' | 'err' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  React.useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const loadSnapshot = React.useCallback(async (force = false) => {
    setRefreshing(true);
    try {
      const data = await fetchSnapshot(force);
      setSnapshot(data);
      setSyncError('');
      setLastSyncedAt(data.generatedAt || data.ts || new Date().toISOString());
    } catch (err) {
      const msg = (err as Error).message || '数据采集失败';
      setSyncError(msg);
      if (force) {
        pushToast(`同步失败：${msg}`, 'err');
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [pushToast]);

  const loadProbes = React.useCallback(async () => {
    try {
      const res = await fetchProbes();
      setProbes(res);
    } catch {
      // Non-blocking secondary load
    }
  }, []);

  const loadOpsData = React.useCallback(async () => {
    try {
      const [incRes, audRes] = await Promise.all([fetchIncidents(30), fetchAudit(40)]);
      setIncidents(incRes.items || incRes.incidents || []);
      setAudit(audRes.items || audRes.entries || []);
    } catch {
      // Non-blocking secondary load
    }
  }, []);

  // Initial bootstrap
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const m = await fetchMeta();
        if (active) {
          setMeta(m);
          if (m.appName) {
            document.title = m.appName;
          }
        }
      } catch {
        // Proceed even if meta temporarily fails
      }
      await Promise.all([loadSnapshot(false), loadProbes(), loadOpsData()]);
    })();
    return () => {
      active = false;
    };
  }, [loadSnapshot, loadProbes, loadOpsData]);

  // Refresh secondary views when switching into them
  React.useEffect(() => {
    if (view === 'fleet') {
      loadProbes();
    } else if (view === 'ops') {
      loadOpsData();
    }
  }, [view, loadProbes, loadOpsData]);

  // Polling interval
  React.useEffect(() => {
    if (!pollMs || pollMs <= 0) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadSnapshot(false);
      }
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, loadSnapshot]);

  // Global Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (e.key === 'Escape' && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  const handleOpenLogs = React.useCallback(
    (unit: string, level: 'all' | 'error' | 'warn' = 'all') => {
      setLogsInitialUnit(unit);
      setLogsInitialLevel(level);
      setLogsRequestNonce((n) => n + 1);
      if (unit) {
        setRecentServiceUnits((prev) => [unit, ...prev.filter((u) => u !== unit)].slice(0, 5));
      }
      setView('logs');
      setMobileNavOpen(false);
    },
    [],
  );

  const handleSelectAgentCategory = React.useCallback((category: string) => {
    setAgentPid(null);
    setAgentCategory(category);
    setView('agents');
    setMobileNavOpen(false);
  }, []);

  const handleSelectAgentPid = React.useCallback((pid: number) => {
    setAgentCategory('');
    setAgentPid(pid);
    setView('agents');
    setMobileNavOpen(false);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutSession();
      window.location.reload();
    } catch (err) {
      pushToast(`退出失败：${(err as Error).message}`, 'err');
    }
  };

  const handleSelectView = (next: ViewId) => {
    setView(next);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0 });
  };

  const commandEntries = React.useMemo<CommandEntry[]>(() => {
    const list: CommandEntry[] = [];

    for (const item of NAV_ITEMS) {
      list.push({
        id: `nav:${item.key}`,
        label: item.label,
        group: '视图导航',
        keywords: item.keywords,
        meta: item.section,
        onSelect: () => handleSelectView(item.key),
      });
    }

    const services = snapshot?.services?.items || [];
    const recentServices = (() => {
      const byUnit = new Map(services.map((s) => [s.unit || s.id, s]));
      const ordered = recentServiceUnits
        .map((u) => byUnit.get(u))
        .filter((s): s is NonNullable<typeof s> => Boolean(s));
      for (const s of services) {
        if (ordered.length >= 4) break;
        if (!ordered.some((o) => o.id === s.id)) ordered.push(s);
      }
      return ordered;
    })();

    for (const svc of recentServices) {
      const unit = svc.unit || svc.id;
      const name = svc.name || svc.id;
      list.push(
        {
          id: `log-err:${svc.id}`,
          label: `${name} · Error 日志`,
          group: '日志级别快筛 (Error / Warn)',
          keywords: ['error', 'err', '错误', '故障', '异常', 'log', 'logs', '日志', svc.id, unit, name],
          meta: unit,
          shortcut: 'ERROR',
          onSelect: () => handleOpenLogs(unit, 'error'),
        },
        {
          id: `log-warn:${svc.id}`,
          label: `${name} · Warn 日志`,
          group: '日志级别快筛 (Error / Warn)',
          keywords: ['warn', 'warning', '警告', '告警', '降级', 'log', 'logs', '日志', svc.id, unit, name],
          meta: unit,
          shortcut: 'WARN',
          onSelect: () => handleOpenLogs(unit, 'warn'),
        },
      );
    }

    const agentProcesses = snapshot?.agents?.processes || [];
    for (const proc of agentProcesses) {
      const cat = proc.categoryLabel || proc.category || 'Agent';
      const cmdText = proc.cmd || proc.command || proc.comm || '';
      list.push({
        id: `agent-pid:${proc.pid}`,
        label: `PID ${proc.pid} · ${cat}`,
        group: 'Agent 运行时进程 (PID)',
        keywords: [
          String(proc.pid),
          `pid ${proc.pid}`,
          `pid:${proc.pid}`,
          'pid',
          'agent',
          'process',
          '进程',
          cat,
          proc.comm || '',
          cmdText,
        ],
        meta: cmdText,
        shortcut: proc.cpu != null ? `CPU ${Number(proc.cpu).toFixed(1)}%` : undefined,
        onSelect: () => handleSelectAgentPid(proc.pid),
      });
    }

    list.push(
      {
        id: 'action:refresh',
        label: '立即刷新全栈快照',
        group: '快捷操作',
        keywords: ['refresh', 'reload', 'sync', '刷新', '同步'],
        shortcut: 'Sync',
        onSelect: () => {
          loadSnapshot(true);
          loadProbes();
          loadOpsData();
        },
      },
      {
        id: 'action:theme',
        label: theme === 'dark' ? '切换为浅色主题' : '切换为深色主题',
        group: '快捷操作',
        keywords: ['theme', 'dark', 'light', '主题', '暗色', '亮色'],
        onSelect: () => toggleTheme(),
      },
    );

    for (const svc of services.slice(0, 12)) {
      list.push({
        id: `svc:${svc.id}`,
        label: `${svc.name || svc.id} 日志`,
        group: '受管服务',
        keywords: [svc.id, svc.unit || '', svc.layer || '', statusLabel(svc.status)],
        meta: svc.unit || svc.id,
        onSelect: () => handleOpenLogs(svc.unit || svc.id, 'all'),
      });
    }

    const fleetNodes = snapshot?.fleet?.nodes || [];
    for (const node of fleetNodes.slice(0, 10)) {
      const nodeIp = node.tailscaleIp || '';
      list.push({
        id: `node:${node.id}`,
        label: node.name || node.id,
        group: '全球节点',
        keywords: [node.id, node.region || '', nodeIp, node.deviceType || ''],
        meta: node.region || nodeIp,
        onSelect: () => handleSelectView('fleet'),
      });
    }

    return list;
  }, [
    snapshot,
    theme,
    recentServiceUnits,
    loadSnapshot,
    loadProbes,
    loadOpsData,
    toggleTheme,
    handleOpenLogs,
    handleSelectAgentPid,
  ]);

  const readOnly = Boolean(meta?.readOnly);
  const demoMode = Boolean(meta?.demo);
  const brandTitle = meta?.appName || 'Ops Console';
  const activeNav = NAV_ITEMS.find((n) => n.key === view) || NAV_ITEMS[0];

  const navSections = React.useMemo(() => {
    const order = ['观测', '基础设施', '运维'];
    return order.map((sec) => ({
      title: sec,
      items: NAV_ITEMS.filter((i) => i.section === sec),
    }));
  }, []);

  const failedSvcCount = React.useMemo(() => {
    return (snapshot?.services?.items || []).filter(
      (s) => s.status === 'failed' || s.status === 'error' || s.status === 'down',
    ).length;
  }, [snapshot]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--border-subtle)] shrink-0">
        <button
          type="button"
          onClick={() => handleSelectView('overview')}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer focus:outline-none"
        >
          <img
            src="/favicon.svg"
            width={24}
            height={24}
            alt=""
            className="h-6 w-6 rounded-[6px] shrink-0"
          />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ink)] truncate">
            {brandTitle}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="关闭导航菜单"
          className="lg:hidden p-1.5 rounded-[6px] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" aria-label="主导航">
        {navSections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-subtle)]">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  data-view={item.key}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleSelectView(item.key)}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] transition-colors duration-150 ease-out cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 ${
                    isActive
                      ? 'bg-[var(--surface-active)] text-[var(--ink)] font-medium'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] font-normal'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[var(--ink)]' : 'text-[var(--ink-subtle)]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.key === 'services' && failedSvcCount > 0 && (
                    <span className="font-mono text-[11.5px] font-semibold text-[var(--err)] tabular-nums">
                      {failedSvcCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3.5 border-t border-[var(--border-subtle)] text-[12px] text-[var(--ink-subtle)] shrink-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[var(--ink-muted)]">
            {snapshot?.host?.hostname || 'control-plane'}
          </span>
          <span className="font-mono tabular-nums shrink-0">v{meta?.version || '0.3.0'}</span>
        </div>
        {(demoMode || readOnly) && (
          <div className="text-[11.5px] text-[var(--ink-subtle)]">
            {demoMode && readOnly
              ? '演示模式 · 只读保护'
              : demoMode
                ? '演示模式 · 仿真连接器'
                : '只读观测模式'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[236px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[var(--surface)] border-r border-[var(--border)] z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-[264px] max-w-[82vw] bg-[var(--surface)] border-r border-[var(--border)] shadow-xl z-10 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 lg:pl-[236px] flex flex-col min-h-screen">
        {/* Sticky Single-Row Topbar — Restrained Geist Hierarchy */}
        <header className="sticky top-0 z-20 h-14 bg-[var(--bg)]/85 backdrop-blur-md border-b border-[var(--border-subtle)] shrink-0">
          <div className="h-full max-w-[1200px] mx-auto px-5 sm:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="打开导航菜单"
                className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
              >
                <Menu className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <div className="flex items-center gap-2 min-w-0 text-[13px]">
                <span className="hidden sm:inline text-[var(--ink-subtle)] whitespace-nowrap">
                  {activeNav.section}
                </span>
                <span className="hidden sm:inline text-[var(--ink-subtle)]/50">/</span>
                <span className="font-medium text-[var(--ink)] truncate whitespace-nowrap">
                  {activeNav.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                aria-label="打开命令面板"
                data-testid="command-trigger"
                className="h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--ink-subtle)] transition-colors duration-150 ease-out inline-flex items-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
              >
                <Search className="w-3.5 h-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                <span className="hidden md:inline">搜索或跳转</span>
                <kbd className="hidden sm:inline-block font-mono text-[11px] text-[var(--ink-subtle)] px-1 rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                  ⌘K
                </kbd>
              </button>

              <span
                className={`hidden xl:inline-block font-mono text-[11.5px] tabular-nums whitespace-nowrap px-1.5 ${
                  syncError ? 'text-[var(--err)]' : 'text-[var(--ink-subtle)]'
                }`}
                title={syncError || lastSyncedAt}
              >
                {syncError
                  ? '同步异常'
                  : lastSyncedAt
                    ? formatClock(lastSyncedAt)
                    : '同步中...'}
              </span>

              <select
                aria-label="自动刷新周期"
                value={String(pollMs)}
                onChange={(e) => setPollMs(Number(e.target.value))}
                className="ui-select hidden sm:block h-8 pl-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--ink-subtle)] transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 cursor-pointer"
              >
                <option value="0">手动</option>
                <option value="10000">10s</option>
                <option value="30000">30s</option>
              </select>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
                title={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
                data-testid="theme-toggle"
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" strokeWidth={1.75} />
                ) : (
                  <Moon className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>

              <button
                type="button"
                disabled={refreshing}
                aria-label="手动刷新数据"
                title="立即同步遥测快照"
                onClick={() => {
                  loadSnapshot(true);
                  if (view === 'fleet') loadProbes();
                  if (view === 'ops') loadOpsData();
                }}
                className="h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--ink-subtle)] text-[12.5px] font-medium text-[var(--ink)] transition-colors duration-150 ease-out inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[var(--ink-muted)] ${refreshing ? 'animate-spin' : ''}`}
                  strokeWidth={1.75}
                />
                <span className="hidden sm:inline">刷新</span>
              </button>

              {meta?.authEnabled && (
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="退出登录"
                  title="退出登录"
                  className="h-8 px-2.5 rounded-lg text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.75} />
                  <span className="hidden md:inline">退出</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Inline Error Notice only when sync actually fails */}
        {syncError && (
          <div className="border-b border-[var(--err)]/20 bg-[var(--err)]/5">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-2 flex items-center justify-between gap-2 text-[12.5px] text-[var(--err)]">
              <span>快照同步异常：{syncError}</span>
            </div>
          </div>
        )}

        {/* Active View Shell */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-5 sm:px-8 py-7 sm:py-9">
          {loading && !snapshot ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="h-7 w-40 rounded-lg bg-[var(--surface-subtle)] animate-pulse" />
                <div className="h-4 w-72 rounded-md bg-[var(--surface-subtle)] animate-pulse" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="h-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] animate-pulse"
                  />
                ))}
              </div>
              <div className="h-[360px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
            </div>
          ) : (
            <>
              {view === 'overview' && (
                <OverviewView
                  snapshot={snapshot}
                  incidents={incidents}
                  onOpenLogs={handleOpenLogs}
                  onSelectAgentCategory={handleSelectAgentCategory}
                />
              )}
              {view === 'fleet' && (
                <FleetView
                  snapshot={snapshot}
                  probes={probes}
                  readOnly={readOnly}
                  onRefresh={() => loadSnapshot(true)}
                  onRefreshProbes={loadProbes}
                  onToast={pushToast}
                  onConfirm={setConfirmState}
                />
              )}
              {view === 'services' && (
                <ServicesView
                  snapshot={snapshot}
                  readOnly={readOnly}
                  onRefresh={() => loadSnapshot(true)}
                  onOpenLogs={handleOpenLogs}
                  onToast={pushToast}
                  onConfirm={setConfirmState}
                />
              )}
              {view === 'memory' && (
                <MemoryView snapshot={snapshot} readOnly={readOnly} onToast={pushToast} />
              )}
              {view === 'agents' && (
                <AgentsView
                  snapshot={snapshot}
                  selectedCategory={agentCategory}
                  selectedPid={agentPid}
                  onSelectCategory={(cat) => {
                    setAgentPid(null);
                    setAgentCategory(cat);
                  }}
                  onSelectPid={setAgentPid}
                />
              )}
              {view === 'network' && (
                <NetworkView snapshot={snapshot} meta={meta} onToast={pushToast} />
              )}
              {view === 'logs' && (
                <LogsView
                  snapshot={snapshot}
                  meta={meta}
                  initialUnit={logsInitialUnit}
                  initialLevel={logsInitialLevel}
                  requestNonce={logsRequestNonce}
                  onToast={pushToast}
                />
              )}
              {view === 'ops' && (
                <OpsView
                  snapshot={snapshot}
                  incidents={incidents}
                  audit={audit}
                  readOnly={readOnly}
                  onRefresh={() => loadSnapshot(true)}
                  onRefreshOps={loadOpsData}
                  onToast={pushToast}
                  onConfirm={setConfirmState}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Headless @ui-sdk/react Command Palette & Confirm AlertDialog */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} entries={commandEntries} />
      <ConfirmAlertDialog state={confirmState} onClose={() => setConfirmState(null)} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
export default App;
