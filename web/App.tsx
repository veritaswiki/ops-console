import React from 'react';
import { MotionConfig } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Drawer } from 'vaul';
import {
  Bell,
  Blocks,
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
import { cn, FOCUS_RING } from './lib/cn';
import { formatClock, statusLabel } from './utils/format';
import {
  Button,
  CommandPalette,
  ConfirmAlertDialog,
  type CommandEntry,
  type ConfirmModalState,
} from './components/ui';
import { OverviewView } from './views/OverviewView';
import { AlertsView } from './views/AlertsView';
import { FleetView } from './views/FleetView';
import { ServicesView } from './views/ServicesView';
import { PluginsView } from './views/PluginsView';
import { MemoryView } from './views/MemoryView';
import { AgentsView } from './views/AgentsView';
import { NetworkView } from './views/NetworkView';
import { LogsView } from './views/LogsView';
import { OpsView } from './views/OpsView';
import { OfflineIndicator, PWAInstallButton } from './hooks/usePWA';

interface NavItemConfig {
  key: ViewId;
  label: string;
  section: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
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
    key: 'alerts',
    label: '告警与事件',
    section: '观测',
    keywords: ['alerts', 'sla', 'incident', 'postmortem', '告警', '事件', '复盘', '规则'],
    icon: Bell,
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
    key: 'plugins',
    label: '插件与接入',
    section: '基础设施',
    keywords: ['plugins', 'mcp', 'a2a', 'agent', 'openai', 'ollama', 'connector', '插件', '接入', '协议'],
    icon: Blocks,
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

  const pushToast = React.useCallback((text: string, tone: 'info' | 'ok' | 'err' = 'info') => {
    if (tone === 'ok') {
      toast.success(text);
    } else if (tone === 'err') {
      toast.error(text);
    } else {
      toast(text);
    }
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
    } else if (view === 'ops' || view === 'alerts') {
      loadOpsData();
    }
  }, [view, loadProbes, loadOpsData]);

  // Real-time SSE delta event bus subscription
  React.useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    let timer: number | null = null;
    const scheduleDeltaSync = () => {
      if (timer != null) return;
      timer = window.setTimeout(() => {
        timer = null;
        if (document.visibilityState === 'visible') {
          void loadSnapshot(false);
          void loadOpsData();
        }
      }, 600);
    };

    const es = new EventSource('/api/events/stream');
    const eventTypes = ['audit', 'alert', 'probe', 'runbook', 'service', 'incident', 'plugins_updated'];
    for (const type of eventTypes) {
      es.addEventListener(type, scheduleDeltaSync);
    }

    return () => {
      if (timer != null) window.clearTimeout(timer);
      es.close();
    };
  }, [loadSnapshot, loadOpsData]);

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

  // Global Cmd+K / Ctrl+K shortcut — instant response (frequency-gated)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
          group: '日志级别快筛',
          keywords: ['error', 'err', '错误', '故障', '异常', 'log', 'logs', '日志', svc.id, unit, name],
          meta: unit,
          shortcut: 'ERROR',
          onSelect: () => handleOpenLogs(unit, 'error'),
        },
        {
          id: `log-warn:${svc.id}`,
          label: `${name} · Warn 日志`,
          group: '日志级别快筛',
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
        group: 'Agent 运行时进程',
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

  const activeAlertsCount = snapshot?.activeAlertsCount ?? 0;

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--border-subtle)] shrink-0">
        <button
          type="button"
          onClick={() => handleSelectView('overview')}
          className={cn(
            'flex items-center gap-2.5 min-w-0 text-left cursor-pointer rounded-lg py-1 pr-1 select-none',
            FOCUS_RING,
          )}
        >
          <span className="h-6 w-6 rounded-md overflow-hidden shrink-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 bg-[var(--surface-subtle)]">
            <img
              src="/favicon.svg"
              width={24}
              height={24}
              alt=""
              className="h-6 w-6 block"
            />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--ink)] truncate">
            {brandTitle}
          </span>
        </button>
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="关闭导航菜单"
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors duration-150 ease-out cursor-pointer',
              FOCUS_RING,
            )}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Zero click dead zones: continuous hit area via internal py-2.5 padding */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="主导航">
        {navSections.map((sec) => (
          <div key={sec.title}>
            <div className="px-2.5 pb-1.5 text-[11.5px] font-medium text-[var(--ink-subtle)] select-none">
              {sec.title}
            </div>
            <div className="flex flex-col">
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
                    className={cn(
                      'w-full flex items-center justify-between gap-2.5 px-2.5 py-2.5 rounded-lg text-[13.5px] font-medium select-none cursor-pointer whitespace-nowrap',
                      'transition-colors duration-150 ease-out',
                      FOCUS_RING,
                      isActive
                        ? 'bg-[var(--surface-active)] text-[var(--ink)]'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'size-4 shrink-0',
                          isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-subtle)]',
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.key === 'services' && failedSvcCount > 0 && (
                      <span className="font-mono text-[11.5px] font-semibold text-[var(--err)] tabular-nums shrink-0">
                        {failedSvcCount}
                      </span>
                    )}
                    {item.key === 'alerts' && activeAlertsCount > 0 && (
                      <span className="font-mono text-[11.5px] font-semibold text-[var(--warn)] tabular-nums shrink-0">
                        {activeAlertsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3.5 border-t border-[var(--border-subtle)] text-[12px] text-[var(--ink-subtle)] shrink-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate font-mono text-[var(--ink-muted)]"
            title={snapshot?.host?.hostname || 'control-plane'}
          >
            {snapshot?.host?.hostname || 'control-plane'}
          </span>
          <span className="font-mono tabular-nums shrink-0">v{meta?.version || '0.3.0'}</span>
        </div>
        {(demoMode || readOnly) && (
          <div className="text-[11.5px] text-[var(--ink-subtle)] truncate">
            {demoMode && readOnly
              ? '演示模式 · 只读保护'
              : demoMode
                ? '演示模式 · 仿真连接器'
                : '只读观测模式'}
          </div>
        )}
        <PWAInstallButton />
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)] flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-[240px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[var(--surface-elevated)] border-r border-[var(--border)] z-30">
          {renderSidebarContent(false)}
        </aside>

        {/* Native Gesture Mobile Drawer via Vaul */}
        <Drawer.Root
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          direction="left"
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] lg:hidden" />
            <Drawer.Content
              aria-label="移动端主导航抽屉"
              className="fixed inset-y-0 left-0 z-50 w-[272px] max-w-[84vw] bg-[var(--surface-elevated)] border-r border-[var(--border)] shadow-2xl flex flex-col lg:hidden focus:outline-none"
            >
              <Drawer.Title className="sr-only">{brandTitle} 导航菜单</Drawer.Title>
              <Drawer.Description className="sr-only">
                在系统总览、全球节点、受管服务、记忆引擎、网关、网络、日志与运维视图间切换
              </Drawer.Description>
              {renderSidebarContent(true)}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {/* Main Content Column */}
        <div className="flex-1 min-w-0 lg:pl-[240px] flex flex-col min-h-dvh">
          {/* Sticky Single-Row Topbar */}
          <header className="sticky top-0 z-20 h-14 bg-[var(--bg)]/85 backdrop-blur-md border-b border-[var(--border-subtle)] shrink-0">
            <div className="h-full max-w-[1200px] mx-auto px-4 sm:px-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="打开导航菜单"
                  className="lg:hidden"
                >
                  <Menu className="size-4" strokeWidth={1.75} />
                </Button>
                <div className="flex items-center gap-2 min-w-0 text-[13px] select-none">
                  <span className="hidden sm:inline text-[var(--ink-subtle)] whitespace-nowrap">
                    {activeNav.section}
                  </span>
                  <span className="hidden sm:inline text-[var(--ink-subtle)]/50" aria-hidden="true">/</span>
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
                  className={cn(
                    'h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-[color,border-color,transform] duration-150 ease-out active:scale-[0.97] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap select-none',
                    FOCUS_RING,
                  )}
                >
                  <Search className="size-4 text-[var(--ink-subtle)]" strokeWidth={1.75} />
                  <span className="hidden md:inline">搜索或跳转</span>
                  <kbd className="hidden sm:inline-block font-mono text-[11px] text-[var(--ink-subtle)] px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] leading-none">
                    ⌘K
                  </kbd>
                </button>

                <span
                  className={cn(
                    'hidden xl:inline-block font-mono text-[11.5px] tabular-nums whitespace-nowrap px-1.5 select-none',
                    syncError ? 'text-[var(--err)]' : 'text-[var(--ink-subtle)]',
                  )}
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
                  className={cn(
                    'ui-select hidden sm:block h-8 pl-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-colors duration-150 ease-out cursor-pointer',
                    FOCUS_RING,
                  )}
                >
                  <option value="0">手动</option>
                  <option value="10000">10s</option>
                  <option value="30000">30s</option>
                </select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
                  title={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
                  data-testid="theme-toggle"
                >
                  {theme === 'dark' ? (
                    <Sun className="size-4" strokeWidth={1.75} />
                  ) : (
                    <Moon className="size-4" strokeWidth={1.75} />
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={refreshing}
                  aria-label="手动刷新数据"
                  title="立即同步遥测快照"
                  onClick={() => {
                    loadSnapshot(true);
                    if (view === 'fleet') loadProbes();
                    if (view === 'ops') loadOpsData();
                  }}
                >
                  <RefreshCw
                    className={cn('size-4 text-[var(--ink-muted)]', refreshing && 'animate-spin')}
                    strokeWidth={1.75}
                  />
                  <span className="hidden sm:inline">刷新</span>
                </Button>

                {meta?.authEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    aria-label="退出登录"
                    title="退出登录"
                  >
                    <LogOut className="size-4" strokeWidth={1.75} />
                    <span className="hidden md:inline">退出</span>
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Inline Error Notice only when sync actually fails */}
          {syncError && (
            <div className="border-b border-[var(--err)]/20 bg-[var(--err)]/5">
              <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-2 text-[12.5px] text-[var(--err)]">
                <span className="truncate">快照同步异常：{syncError}</span>
              </div>
            </div>
          )}

          {/* Active View Shell */}
          <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-9">
            {loading && !snapshot ? (
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
                <div className="h-[540px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" />
              </div>
            ) : (
              <>
                {view === 'overview' && (
                  <OverviewView
                    snapshot={snapshot}
                    incidents={incidents}
                    onOpenLogs={handleOpenLogs}
                    onSelectAgentCategory={handleSelectAgentCategory}
                    onOpenPlugins={() => handleSelectView('plugins')}
                  />
                )}
                {view === 'alerts' && (
                  <AlertsView
                    incidents={incidents}
                    readOnly={readOnly}
                    onRefreshIncidents={loadOpsData}
                    onToast={pushToast}
                    onConfirm={setConfirmState}
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
                {view === 'plugins' && (
                  <PluginsView
                    readOnly={readOnly}
                    onSnapshotChanged={() => void loadSnapshot(true)}
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

        {/* cmdk Command Palette, Confirm AlertDialog & PWA Offline Indicator */}
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} entries={commandEntries} />
        <ConfirmAlertDialog state={confirmState} onClose={() => setConfirmState(null)} />
        <OfflineIndicator />
        <Toaster
          theme={theme}
          position="bottom-right"
          closeButton
          toastOptions={{
            style: {
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-card)',
              fontSize: '13px',
            },
          }}
        />
      </div>
    </MotionConfig>
  );
}
export default App;
