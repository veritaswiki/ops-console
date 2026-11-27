import React from 'react';
import { MotionConfig } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Drawer } from 'vaul';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Sun,
  X,
} from 'lucide-react';
import type {
  A2ATaskRecord,
  AuditEntry,
  IncidentItem,
  LogFilterState,
  LogNavigationRequest,
  MetaResponse,
  ProbesResponse,
  SnapshotResponse,
  ViewId,
} from './types';
import { normalizeLogNavigation } from './lib/logs';
import { parseHotUpdateSseEvent, type HotUpdateNotice } from './lib/updates';
import {
  fetchA2AState,
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
  NativeSelect,
  ViewSkeleton,
  type CommandEntry,
  type ConfirmModalState,
} from './components/ui';
import { OverviewView } from './views/OverviewView';
import { OfflineIndicator, PWAInstallButton } from './hooks/usePWA';
import {
  CONSOLE_MODULES,
  getFooterModules,
  getModuleByChord,
  getModuleById,
  getModulesGroupedByDomain,
  getRailPanelSlots,
  groupWorkspaceActionSlots,
  loadAgentGraphView,
  loadAgentSettingsView,
  loadAgentsView,
  loadAlertsView,
  loadBotsView,
  loadFleetView,
  loadGithubView,
  loadLogsView,
  loadMcpView,
  loadMemoryView,
  loadNetworkView,
  loadOpsView,
  loadPluginsView,
  loadProjectsView,
  loadServicesView,
  MODULE_DOMAINS,
  type ModuleDomainId,
  parseSubTabFromHash,
  parseViewFromHash,
  prefetchModule,
  type WorkspaceActionSlot,
} from './modules/registry';
import { ModuleBoundary } from './modules/ModuleBoundary';

const AlertsView = React.lazy(() => loadAlertsView().then((m) => ({ default: m.AlertsView })));
const FleetView = React.lazy(() => loadFleetView().then((m) => ({ default: m.FleetView })));
const ServicesView = React.lazy(() => loadServicesView().then((m) => ({ default: m.ServicesView })));
const PluginsView = React.lazy(() => loadPluginsView().then((m) => ({ default: m.PluginsView })));
const McpView = React.lazy(() => loadMcpView().then((m) => ({ default: m.McpView })));
const MemoryView = React.lazy(() => loadMemoryView().then((m) => ({ default: m.MemoryView })));
const AgentsView = React.lazy(() => loadAgentsView().then((m) => ({ default: m.AgentsView })));
const ProjectsView = React.lazy(() => loadProjectsView().then((m) => ({ default: m.ProjectsView })));
const AgentGraphView = React.lazy(() => loadAgentGraphView().then((m) => ({ default: m.AgentGraphView })));
const BotsView = React.lazy(() => loadBotsView().then((m) => ({ default: m.BotsView })));
const GithubView = React.lazy(() => loadGithubView().then((m) => ({ default: m.GithubView })));
const AgentSettingsView = React.lazy(() => loadAgentSettingsView().then((m) => ({ default: m.AgentSettingsView })));
const NetworkView = React.lazy(() => loadNetworkView().then((m) => ({ default: m.NetworkView })));
const LogsView = React.lazy(() => loadLogsView().then((m) => ({ default: m.LogsView })));
const OpsView = React.lazy(() => loadOpsView().then((m) => ({ default: m.OpsView })));

const DOMAIN_TITLE_MAP = new Map(MODULE_DOMAINS.map((d) => [d.id, d.title]));
const GROUPED_MODULES = getModulesGroupedByDomain();
const FOOTER_MODULES = getFooterModules();

const THEME_STORAGE_KEY = 'ops-console-theme';
const SIDEBAR_STORAGE_KEY = 'ops-console-sidebar-collapsed';
const NAV_GROUPS_STORAGE_KEY = 'ops-console-nav-groups';
const NAV_SUBMENUS_STORAGE_KEY = 'ops-console-nav-submenus';

const DEFAULT_NAV_GROUPS: Record<ModuleDomainId, boolean> = {
  agent: true,
  observe: true,
  infra: true,
  operate: true,
};

const DEFAULT_NAV_SUBMENUS: Record<string, boolean> = {
  network: true,
  services: true,
};

function readInitialNavGroups(): Record<ModuleDomainId, boolean> {
  try {
    const raw = window.localStorage.getItem(NAV_GROUPS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NAV_GROUPS };
    const parsed = JSON.parse(raw) as Partial<Record<ModuleDomainId, unknown>>;
    return {
      agent: typeof parsed.agent === 'boolean' ? parsed.agent : true,
      observe: typeof parsed.observe === 'boolean' ? parsed.observe : true,
      infra: typeof parsed.infra === 'boolean' ? parsed.infra : true,
      operate: typeof parsed.operate === 'boolean' ? parsed.operate : true,
    };
  } catch {
    return { ...DEFAULT_NAV_GROUPS };
  }
}

function readInitialNavSubMenus(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(NAV_SUBMENUS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NAV_SUBMENUS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const merged: Record<string, boolean> = { ...DEFAULT_NAV_SUBMENUS };
    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'boolean') {
          merged[key] = value;
        }
      }
    }
    return merged;
  } catch {
    return { ...DEFAULT_NAV_SUBMENUS };
  }
}

function sidebarTaskStateLabel(state: string): string {
  switch (state) {
    case 'submitted':
      return '排队中';
    case 'working':
      return '执行中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'canceled':
      return '已取消';
    default:
      return state;
  }
}

function readInitialSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

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
  const [view, setView] = React.useState<ViewId>(() => parseViewFromHash(window.location.hash) || 'agents');
  const [viewSubTabs, setViewSubTabs] = React.useState<Partial<Record<ViewId, string>>>(() => {
    const initialView = parseViewFromHash(window.location.hash) || 'agents';
    const initialSub = parseSubTabFromHash(window.location.hash);
    return initialSub ? { [initialView]: initialSub } : {};
  });
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => readInitialSidebarCollapsed());
  const [navGroups, setNavGroups] = React.useState<Record<ModuleDomainId, boolean>>(() =>
    readInitialNavGroups(),
  );
  const [navSubMenus, setNavSubMenus] = React.useState<Record<string, boolean>>(() =>
    readInitialNavSubMenus(),
  );
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => readInitialTheme());
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  const [meta, setMeta] = React.useState<MetaResponse | null>(null);
  const [hotUpdateNotice, setHotUpdateNotice] = React.useState<HotUpdateNotice | null>(null);
  const assetsRevisionRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (meta?.updates?.assetsRevision && !assetsRevisionRef.current) {
      assetsRevisionRef.current = meta.updates.assetsRevision;
    }
  }, [meta?.updates?.assetsRevision]);
  const [snapshot, setSnapshot] = React.useState<SnapshotResponse | null>(null);
  const [probes, setProbes] = React.useState<ProbesResponse | null>(null);
  const [incidents, setIncidents] = React.useState<IncidentItem[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  const [recentAgentTasks, setRecentAgentTasks] = React.useState<A2ATaskRecord[]>([]);
  const [activeAgentTaskId, setActiveAgentTaskId] = React.useState<string | null>(null);
  const [agentSearchQuery, setAgentSearchQuery] = React.useState<string>('');
  const [agentSearchOpen, setAgentSearchOpen] = React.useState<boolean>(false);
  const [a2aRevision, setA2aRevision] = React.useState<number>(0);
  const [catalogRevision, setCatalogRevision] = React.useState<number>(0);
  const [focusedProjectIssueId, setFocusedProjectIssueId] = React.useState<string | null>(null);
  const sidebarAgentSearchRef = React.useRef<HTMLInputElement>(null);

  const [pollMs, setPollMs] = React.useState<number>(10000);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [syncError, setSyncError] = React.useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = React.useState<string>('');

  const [logsInitialUnit, setLogsInitialUnit] = React.useState<string>('');
  const [logsInitialLevel, setLogsInitialLevel] = React.useState<string>('all');
  const [logsInitialFilter, setLogsInitialFilter] = React.useState<Partial<LogFilterState> | null>(null);
  const [logsRequestNonce, setLogsRequestNonce] = React.useState<number>(0);
  const [recentServiceUnits, setRecentServiceUnits] = React.useState<string[]>([]);
  const [agentCategory, setAgentCategory] = React.useState<string>('');
  const [agentPid, setAgentPid] = React.useState<number | null>(null);
  const [mcpInitialNode, setMcpInitialNode] = React.useState<string>('');
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

  React.useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      // Ignore storage access errors
    }
  }, [sidebarCollapsed]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(NAV_GROUPS_STORAGE_KEY, JSON.stringify(navGroups));
    } catch {
      // Ignore storage access errors
    }
  }, [navGroups]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(NAV_SUBMENUS_STORAGE_KEY, JSON.stringify(navSubMenus));
    } catch {
      // Ignore storage access errors
    }
  }, [navSubMenus]);

  const toggleNavGroup = React.useCallback((domainId: ModuleDomainId) => {
    setNavGroups((prev) => ({ ...prev, [domainId]: !prev[domainId] }));
  }, []);

  const toggleNavSubMenu = React.useCallback((moduleId: ViewId) => {
    setNavSubMenus((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }, []);

  const setViewSubTab = React.useCallback((targetView: ViewId, subTab: string) => {
    setViewSubTabs((prev) => (prev[targetView] === subTab ? prev : { ...prev, [targetView]: subTab }));
  }, []);

  const loadRecentAgentTasks = React.useCallback(async () => {
    try {
      const res = await fetchA2AState();
      setRecentAgentTasks((res.tasks || []).slice(0, 60));
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

  // Parallel initial bootstrap: fetchMeta + loadSnapshot + loadRecentAgentTasks concurrently
  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const metaTask = fetchMeta(controller.signal)
      .then((m) => {
        if (!active) return;
        setMeta(m);
        if (m.appName) {
          document.title = m.appName;
        }
      })
      .catch(() => {
        // Proceed even if meta temporarily fails
      });
    void Promise.all([metaTask, loadSnapshot(false), loadRecentAgentTasks()]);
    return () => {
      active = false;
      controller.abort();
    };
  }, [loadSnapshot, loadRecentAgentTasks]);

  // Refresh secondary views on-demand using module dataDeps manifest
  React.useEffect(() => {
    const mod = getModuleById(view);
    if (mod.dataDeps.includes('probes')) {
      void loadProbes();
    }
    if (mod.dataDeps.includes('ops')) {
      void loadOpsData();
    }
  }, [view, loadProbes, loadOpsData]);

  // URL Hash deep-link sync (Grafana / Tailscale Admin style shareable routes)
  React.useEffect(() => {
    const mod = getModuleById(view);
    const activeSub = viewSubTabs[view];
    const defaultSub = mod.children?.[0]?.subTab;
    const hasValidNonDefaultSub =
      Boolean(activeSub) &&
      Boolean(mod.children?.some((child) => child.subTab === activeSub)) &&
      activeSub !== defaultSub;
    const nextHash = hasValidNonDefaultSub ? `#${view}/${activeSub}` : `#${view}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [view, viewSubTabs]);

  React.useEffect(() => {
    const onHashChange = () => {
      const parsed = parseViewFromHash(window.location.hash);
      const parsedSub = parseSubTabFromHash(window.location.hash);
      if (parsed) {
        setView(parsed);
        if (parsedSub) {
          setViewSubTabs((prev) => ({ ...prev, [parsed]: parsedSub }));
          setNavSubMenus((prev) => (prev[parsed] ? prev : { ...prev, [parsed]: true }));
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Real-time SSE delta event bus subscription (aligned with backend event names)
  const viewRef = React.useRef<ViewId>(view);
  viewRef.current = view;
  const pendingEventsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    let timer: number | null = null;
    const scheduleDeltaSync = () => {
      if (timer != null) return;
      timer = window.setTimeout(() => {
        timer = null;
        const fired = pendingEventsRef.current;
        const bumpA2aRevision = [
          'a2a_updated',
          'evolution_updated',
          'agent_declarative_reloaded',
          'module_reloaded',
          'pr_applied',
        ].some((type) => fired.has(type));
        const bumpCatalogRevision = [
          'model_catalog_updated',
          'probe_heartbeat',
          'a2a_updated',
        ].some((type) => fired.has(type));
        fired.clear();
        if (bumpA2aRevision) setA2aRevision((revision) => revision + 1);
        if (bumpCatalogRevision) setCatalogRevision((revision) => revision + 1);
        if (document.visibilityState === 'visible') {
          void loadSnapshot(false);
          void loadRecentAgentTasks();
          const activeMod = getModuleById(viewRef.current);
          if (activeMod.dataDeps.includes('ops')) {
            void loadOpsData();
          }
          if (activeMod.dataDeps.includes('probes')) {
            void loadProbes();
          }
        }
      }, 600);
    };

    const es = new EventSource('/api/events/stream');
    let readyPollTimer: number | null = null;
    const eventTypes = [
      'probe_heartbeat',
      'alert_fired',
      'alert_acked',
      'alert_rule_created',
      'alert_rule_updated',
      'alert_rule_deleted',
      'alert_silence_updated',
      'service_action',
      'timer_action',
      'incident_updated',
      'probe_command',
      'runbook_step',
      'ops_health',
      'ops_backup',
      'plugins_updated',
      'mcps_updated',
      'a2a_updated',
      'model_catalog_updated',
      'config_reloaded',
      'plugins_reloaded',
      'agent_declarative_reloaded',
      'evolution_updated',
      'update_applied',
      'update_rolled_back',
    ];
    const handleDeltaEvent = (eventType: string) => () => {
      pendingEventsRef.current.add(eventType);
      scheduleDeltaSync();
    };
    for (const type of eventTypes) {
      es.addEventListener(type, handleDeltaEvent(type));
    }

    const handleHotNotice = (eventType: string) => (evt: MessageEvent) => {
      const notice = parseHotUpdateSseEvent(eventType, String(evt.data || ''), assetsRevisionRef.current);
      if (!notice) return;
      setHotUpdateNotice(notice);
      if (eventType === 'module_reloaded' || eventType === 'pr_applied') {
        pendingEventsRef.current.add(eventType);
        scheduleDeltaSync();
      }
      if (eventType === 'server_restarting') {
        if (readyPollTimer != null) window.clearInterval(readyPollTimer);
        readyPollTimer = window.setInterval(() => {
          fetch('/api/ready', { cache: 'no-store' })
            .then((res) => {
              if (res.ok) {
                if (readyPollTimer != null) {
                  window.clearInterval(readyPollTimer);
                  readyPollTimer = null;
                }
                setHotUpdateNotice(null);
                void loadSnapshot(true);
                fetchMeta().then(setMeta).catch(() => {});
                toast.success('控制面后端已完成平滑重启并恢复连接');
              }
            })
            .catch(() => {
              // keep waiting while restarting
            });
        }, 1200);
      }
    };

    const hotEventTypes = ['assets_updated', 'server_restarting', 'module_reloaded', 'pr_applied'];
    const hotHandlers = hotEventTypes.map((type) => {
      const handler = handleHotNotice(type);
      es.addEventListener(type, handler as EventListener);
      return { type, handler };
    });

    return () => {
      if (timer != null) window.clearTimeout(timer);
      if (readyPollTimer != null) window.clearInterval(readyPollTimer);
      pendingEventsRef.current.clear();
      for (const { type, handler } of hotHandlers) {
        es.removeEventListener(type, handler as EventListener);
      }
      es.close();
    };
  }, [loadSnapshot, loadOpsData, loadProbes, loadRecentAgentTasks]);

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

  // Global Cmd+K / Ctrl+K + Linear-style G+<key> chord navigation
  React.useEffect(() => {
    let chordArmed = false;
    let chordTimer: number | null = null;

    const clearChord = () => {
      chordArmed = false;
      if (chordTimer != null) {
        window.clearTimeout(chordTimer);
        chordTimer = null;
      }
    };

    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        clearChord();
        setCommandOpen((prev) => !prev);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || commandOpen || confirmState?.open) {
        clearChord();
        return;
      }
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();
      if (chordArmed) {
        const targetView = getModuleByChord(key);
        clearChord();
        if (targetView) {
          e.preventDefault();
          setView(targetView);
          setMobileNavOpen(false);
          window.scrollTo({ top: 0 });
        }
        return;
      }

      if (key === 'g') {
        chordArmed = true;
        chordTimer = window.setTimeout(clearChord, 900);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearChord();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [commandOpen, confirmState?.open]);

  const handleOpenLogs = React.useCallback(
    (unitOrRequest: string | LogNavigationRequest, level: 'all' | 'error' | 'warn' = 'all') => {
      const normalized = normalizeLogNavigation(unitOrRequest, level);
      setLogsInitialFilter(normalized);
      setLogsInitialUnit(normalized.source === 'service' ? normalized.target : '');
      setLogsInitialLevel(normalized.level);
      setLogsRequestNonce((n) => n + 1);
      const trackUnit = typeof unitOrRequest === 'string'
        ? unitOrRequest
        : (unitOrRequest.unit || (normalized.source === 'service' ? normalized.target : ''));
      if (trackUnit && trackUnit !== 'all') {
        setRecentServiceUnits((prev) => [trackUnit, ...prev.filter((u) => u !== trackUnit)].slice(0, 5));
      }
      setView('logs');
      setMobileNavOpen(false);
    },
    [],
  );

  const handleSelectAgentCategory = React.useCallback((category: string) => {
    setAgentPid(null);
    setAgentCategory(category);
    setView('agent-settings');
    setMobileNavOpen(false);
  }, []);

  const handleSelectAgentPid = React.useCallback((pid: number) => {
    setAgentCategory('');
    setAgentPid(pid);
    setView('agent-settings');
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

  const handleSelectView = React.useCallback((next: ViewId, subTab?: string) => {
    setView(next);
    const mod = getModuleById(next);
    if (next === 'agents') {
      setActiveAgentTaskId(null);
    }
    if (subTab) {
      setViewSubTabs((prev) => ({ ...prev, [next]: subTab }));
      setNavSubMenus((prev) => (prev[next] ? prev : { ...prev, [next]: true }));
    }
    if (mod.placement !== 'footer') {
      setNavGroups((prev) => (prev[mod.domain] ? prev : { ...prev, [mod.domain]: true }));
    }
    setMobileNavOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const handleOpenAgentThread = (taskId: string) => {
    setActiveAgentTaskId(taskId);
    setView('agents');
    setNavGroups((prev) => (prev.agent ? prev : { ...prev, agent: true }));
    setMobileNavOpen(false);
    window.scrollTo({ top: 0 });
  };

  const handleOpenProjectIssue = React.useCallback(
    (issueId?: string) => {
      setFocusedProjectIssueId(issueId || null);
      handleSelectView('projects');
    },
    [handleSelectView],
  );

  const commandEntries = React.useMemo<CommandEntry[]>(() => {
    const list: CommandEntry[] = [];

    for (const mod of CONSOLE_MODULES) {
      list.push({
        id: `nav:${mod.id}`,
        label: mod.label,
        group: '视图导航',
        keywords: [...mod.keywords, `g ${mod.chord}`],
        meta: DOMAIN_TITLE_MAP.get(mod.domain) || mod.domain,
        shortcut: `G ${mod.chord.toUpperCase()}`,
        onSelect: () => handleSelectView(mod.id),
      });
      if (mod.children && mod.children.length > 0) {
        for (const child of mod.children) {
          list.push({
            id: `nav:${child.id}`,
            label: `${mod.label} · ${child.label}`,
            group: '子视图导航',
            keywords: [...mod.keywords, ...child.keywords, child.subTab],
            meta: mod.label,
            onSelect: () => handleSelectView(mod.id, child.subTab),
          });
        }
      }
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
    handleSelectView,
  ]);

  const readOnly = Boolean(meta?.readOnly);
  const demoMode = Boolean(meta?.demo);
  const brandTitle = meta?.appName || 'Ops Console';
  const activeModule = getModuleById(view);
  const activeDomainTitle = DOMAIN_TITLE_MAP.get(activeModule.domain) || activeModule.domain;

  const failedSvcCount = React.useMemo(() => {
    return (snapshot?.services?.items || []).filter(
      (s) => s.status === 'failed' || s.status === 'error' || s.status === 'down',
    ).length;
  }, [snapshot]);

  const activeAlertsCount = snapshot?.activeAlertsCount ?? 0;

  const isHarnessView = activeModule.domain === 'agent';

  const filteredSidebarAgentTasks = React.useMemo(() => {
    const query = agentSearchQuery.trim().toLowerCase();
    if (!query) {
      return recentAgentTasks.slice(0, 8);
    }
    return recentAgentTasks
      .filter((task) => {
        const haystack = [
          task.id,
          task.contextId,
          task.prompt,
          task.workerAgentName,
          task.workerNodeId,
          task.state,
          sidebarTaskStateLabel(task.state),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 15);
  }, [recentAgentTasks, agentSearchQuery]);

  const renderNavItem = (mod: (typeof CONSOLE_MODULES)[number]) => {
    const Icon = mod.icon;
    const isAgentHome = mod.id === 'agents';
    const isActive = isAgentHome ? view === 'agents' && !activeAgentTaskId : view === mod.id;
    const hasChildren = Boolean(mod.children && mod.children.length > 0);
    const subMenuExpanded = Boolean(navSubMenus[mod.id]);
    const activeSubTab = viewSubTabs[mod.id] || mod.children?.[0]?.subTab || '';
    return (
      <div key={mod.id} className="space-y-0.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            data-view={mod.id}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => handleSelectView(mod.id)}
            onMouseEnter={() => prefetchModule(mod.id)}
            onFocus={() => prefetchModule(mod.id)}
            className={cn(
              'flex-1 min-w-0 flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium select-none cursor-pointer whitespace-nowrap',
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
              <span className="truncate">{mod.label}</span>
            </span>
            {mod.badgeKey === 'failedServices' && failedSvcCount > 0 && (
              <span className="font-mono text-[11.5px] font-semibold text-[var(--err)] tabular-nums shrink-0">
                {failedSvcCount}
              </span>
            )}
            {mod.badgeKey === 'alerts' && activeAlertsCount > 0 && (
              <span className="font-mono text-[11.5px] font-semibold text-[var(--warn)] tabular-nums shrink-0">
                {activeAlertsCount}
              </span>
            )}
          </button>
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleNavSubMenu(mod.id)}
              title={subMenuExpanded ? `收起${mod.label}子菜单` : `展开${mod.label}子菜单`}
              aria-label={subMenuExpanded ? `收起${mod.label}子菜单` : `展开${mod.label}子菜单`}
              aria-expanded={subMenuExpanded}
              data-testid={`sidebar-submenu-toggle-${mod.id}`}
              className={cn(
                'h-8 w-7 shrink-0 inline-flex items-center justify-center rounded-lg text-[var(--ink-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors duration-150 ease-out cursor-pointer',
                FOCUS_RING,
              )}
            >
              {subMenuExpanded ? (
                <ChevronDown className="size-3.5" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="size-3.5" strokeWidth={1.75} />
              )}
            </button>
          )}
          {isAgentHome && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAgentSearchOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      window.requestAnimationFrame(() => sidebarAgentSearchRef.current?.focus());
                    }
                    return next;
                  });
                }}
                title={agentSearchOpen ? '收起任务搜索' : '搜索 Agent 任务'}
                aria-label={agentSearchOpen ? '收起任务搜索' : '搜索 Agent 任务'}
                aria-expanded={agentSearchOpen}
                data-testid="sidebar-agent-search-toggle"
                className={cn(
                  'relative h-8 w-7 shrink-0 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer',
                  agentSearchOpen || agentSearchQuery.trim().length > 0
                    ? 'bg-[var(--surface-active)] text-[var(--accent)]'
                    : 'text-[var(--ink-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                  FOCUS_RING,
                )}
              >
                <Search className="size-3.5" strokeWidth={1.75} />
                {!agentSearchOpen && agentSearchQuery.trim().length > 0 && (
                  <span
                    className="absolute top-1.5 right-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                    aria-hidden="true"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSelectView('agents')}
                title="新建 Agent 对话"
                aria-label="新建 Agent 对话"
                data-testid="sidebar-new-agent-btn"
                className={cn(
                  'h-8 w-7 shrink-0 inline-flex items-center justify-center rounded-lg text-[var(--ink-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors cursor-pointer',
                  FOCUS_RING,
                )}
              >
                <Plus className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>

        {/* Agent task search (hidden behind icon toggle) + recent / filtered threads directly under Agent */}
        {isAgentHome && sidebarThreadsSlot && (agentSearchOpen || agentSearchQuery.trim().length > 0 || filteredSidebarAgentTasks.length > 0) && (
          <div
            className="ml-3.5 pl-2.5 border-l border-[var(--border-subtle)] py-1 space-y-1.5"
            data-testid="sidebar-agent-threads"
            data-slot-id={sidebarThreadsSlot.id}
          >
            {(agentSearchOpen || agentSearchQuery.trim().length > 0) && (
              <div className="relative">
                <Search
                  className="size-3.5 text-[var(--ink-subtle)] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={1.75}
                />
                <input
                  ref={sidebarAgentSearchRef}
                  type="text"
                  value={agentSearchQuery}
                  onChange={(e) => setAgentSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      if (agentSearchQuery.length > 0) {
                        setAgentSearchQuery('');
                      } else {
                        setAgentSearchOpen(false);
                      }
                    }
                  }}
                  placeholder="搜索任务 ID / 提示词..."
                  aria-label="搜索 Agent 任务 ID 或提示词"
                  data-testid="sidebar-agent-search"
                  className={cn(
                    'h-7 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] pl-7 pr-6 text-[16px] sm:text-[11.5px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)]',
                    'transition-[border-color,background-color] duration-150 ease-out hover:border-[var(--border-strong)] focus:border-[var(--accent)]',
                    FOCUS_RING,
                  )}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (agentSearchQuery.length > 0) {
                      setAgentSearchQuery('');
                    } else {
                      setAgentSearchOpen(false);
                    }
                  }}
                  aria-label={agentSearchQuery.length > 0 ? '清空任务搜索' : '收起任务搜索'}
                  data-testid="sidebar-agent-search-clear"
                  className={cn(
                    'h-5 w-5 absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer',
                    FOCUS_RING,
                  )}
                >
                  <X className="size-3" strokeWidth={1.75} />
                </button>
              </div>
            )}

            {filteredSidebarAgentTasks.length > 0 ? (
              <div className="space-y-0.5">
                {filteredSidebarAgentTasks.map((task) => {
                  const threadActive = view === 'agents' && activeAgentTaskId === task.id;
                  const dotClass =
                    task.state === 'completed'
                      ? 'bg-[var(--ok-dot)]'
                      : task.state === 'working' || task.state === 'submitted'
                        ? 'bg-[var(--warn-dot)]'
                        : task.state === 'failed' || task.state === 'canceled'
                          ? 'bg-[var(--err-dot)]'
                          : 'bg-[var(--muted-dot)]';
                  const shortId = task.id.length > 14 ? task.id.slice(-10) : task.id;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleOpenAgentThread(task.id)}
                      title={`${task.id} · ${task.prompt || ''}`}
                      className={cn(
                        'w-full flex flex-col gap-0.5 px-2 py-1.5 rounded-md text-left cursor-pointer transition-colors min-w-0',
                        FOCUS_RING,
                        threadActive
                          ? 'bg-[var(--surface-active)] text-[var(--ink)]'
                          : 'text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                      )}
                    >
                      <span className="flex items-center gap-1.5 min-w-0 text-[12px] leading-snug">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass)} aria-hidden="true" />
                        <span className="truncate">{task.prompt || task.id}</span>
                      </span>
                      <span className="flex items-center gap-1.5 pl-3 text-[10.5px] font-mono text-[var(--ink-subtle)] tabular-nums min-w-0">
                        <span className="truncate">{shortId}</span>
                        <span aria-hidden="true">·</span>
                        <span className="shrink-0">{sidebarTaskStateLabel(task.state)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : agentSearchQuery.trim().length > 0 ? (
              <div className="px-2 py-1.5 text-[11.5px] text-[var(--ink-subtle)]">
                无匹配任务
              </div>
            ) : null}
          </div>
        )}
        {hasChildren && subMenuExpanded && mod.children && (
          <div
            data-testid={`sidebar-submenu-${mod.id}`}
            className="ml-3.5 pl-2.5 border-l border-[var(--border-subtle)] space-y-0.5 py-0.5"
          >
            {mod.children.map((child) => {
              const childActive = view === mod.id && activeSubTab === child.subTab;
              return (
                <button
                  key={child.id}
                  type="button"
                  data-testid={`sidebar-subitem-${child.id}`}
                  aria-current={childActive ? 'page' : undefined}
                  onClick={() => handleSelectView(mod.id, child.subTab)}
                  onMouseEnter={() => prefetchModule(mod.id)}
                  onFocus={() => prefetchModule(mod.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[12.5px] font-medium text-left cursor-pointer select-none whitespace-nowrap transition-colors duration-150 ease-out',
                    FOCUS_RING,
                    childActive
                      ? 'bg-[var(--surface-active)] text-[var(--ink)]'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]',
                  )}
                >
                  <span className="truncate">{child.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-3.5 border-b border-[var(--border-subtle)] shrink-0">
        <button
          type="button"
          onClick={() => handleSelectView('agents')}
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
          <span className="text-[14.5px] font-semibold tracking-tight text-[var(--ink)] truncate">
            {brandTitle}
          </span>
        </button>
        {isMobile ? (
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
        ) : (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="折叠侧边栏"
            title="折叠侧边栏"
            data-testid="sidebar-collapse-btn"
            className={cn(
              'h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors duration-150 ease-out cursor-pointer',
              FOCUS_RING,
            )}
          >
            <PanelLeftClose className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Categorized Collapsible Navigation across 4 operational domains */}
      <nav
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2.5"
        aria-label="主导航"
        data-slot-id={sidebarNavSlot?.id}
      >
        {GROUPED_MODULES.map((group, groupIdx) => {
          const expanded = navGroups[group.domain.id];
          const groupFailedCount = group.modules.some((m) => m.badgeKey === 'failedServices')
            ? failedSvcCount
            : 0;
          const groupAlertCount = group.modules.some((m) => m.badgeKey === 'alerts')
            ? activeAlertsCount
            : 0;
          const collapsedBadgeCount = groupFailedCount + groupAlertCount;
          return (
            <div
              key={group.domain.id}
              data-testid={`sidebar-domain-${group.domain.id}`}
              className={cn(groupIdx > 0 && 'pt-2.5 border-t border-[var(--border-subtle)]')}
            >
              <button
                type="button"
                data-testid={`sidebar-toggle-${group.domain.id}`}
                aria-expanded={expanded}
                onClick={() => toggleNavGroup(group.domain.id)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold tracking-wide text-[var(--ink-subtle)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none',
                  FOCUS_RING,
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {expanded ? (
                    <ChevronDown className="size-3.5" strokeWidth={1.75} />
                  ) : (
                    <ChevronRight className="size-3.5" strokeWidth={1.75} />
                  )}
                  <span>{group.domain.title}</span>
                </span>
                {!expanded && collapsedBadgeCount > 0 && (
                  <span
                    className={cn(
                      'font-mono text-[11px] font-semibold tabular-nums',
                      groupFailedCount > 0 ? 'text-[var(--err)]' : 'text-[var(--warn)]',
                    )}
                  >
                    {collapsedBadgeCount}
                  </span>
                )}
              </button>
              {expanded && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {group.modules.map((mod) => renderNavItem(mod))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Pinned Footer Settings Action */}
      {FOOTER_MODULES.length > 0 && (
        <div className="px-2.5 py-2 border-t border-[var(--border-subtle)] shrink-0 space-y-0.5">
          {FOOTER_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = view === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                data-view={mod.id}
                data-testid="sidebar-footer-settings"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleSelectView(mod.id)}
                onMouseEnter={() => prefetchModule(mod.id)}
                onFocus={() => prefetchModule(mod.id)}
                className={cn(
                  'w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium select-none cursor-pointer whitespace-nowrap',
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
                  <span className="truncate">{mod.label}</span>
                </span>
                <kbd className="font-mono text-[10.5px] text-[var(--ink-subtle)] px-1 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)] leading-none">
                  G {mod.chord.toUpperCase()}
                </kbd>
              </button>
            );
          })}
        </div>
      )}

      <div
        className="px-4 py-3 border-t border-[var(--border-subtle)] text-[11.5px] text-[var(--ink-subtle)] shrink-0 space-y-1"
        data-slot-id={sidebarFooterSlot?.id}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate font-mono text-[var(--ink-muted)]"
            title={snapshot?.host?.hostname || 'control-plane'}
          >
            {snapshot?.host?.hostname || 'control-plane'}
          </span>
          <span className="font-mono tabular-nums shrink-0">v{meta?.version || '0.4.0'}</span>
        </div>
        {(demoMode || readOnly) && (
          <div className="text-[11px] text-[var(--ink-subtle)] truncate">
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

  const mainContainerClass =
    view === 'graph'
      ? 'flex-1 w-full px-4 sm:px-6 py-4'
      : view === 'projects'
        ? 'flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-5'
        : view === 'agents'
          ? 'flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-4 flex flex-col'
          : view === 'agent-settings'
            ? 'flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-8 py-6 sm:py-7'
            : 'flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-6 sm:py-8';

  const sidebarNavSlot = React.useMemo(
    () => getRailPanelSlots({ region: 'sidebar-nav' })[0] ?? null,
    [],
  );
  const sidebarThreadsSlot = React.useMemo(
    () => getRailPanelSlots({ region: 'sidebar-threads', viewId: 'agents' })[0] ?? null,
    [],
  );
  const sidebarFooterSlot = React.useMemo(
    () => getRailPanelSlots({ region: 'sidebar-footer' })[0] ?? null,
    [],
  );
  const workspaceActionGroups = React.useMemo(
    () =>
      groupWorkspaceActionSlots({
        isHarnessView,
        authEnabled: Boolean(meta?.authEnabled),
      }),
    [isHarnessView, meta?.authEnabled],
  );

  const renderWorkspaceActionSlot = (slot: WorkspaceActionSlot) => {
    switch (slot.id) {
      case 'command-palette':
        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="打开命令面板"
            data-testid="command-trigger"
            data-slot-id={slot.id}
            className={cn(
              'h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)] transition-[color,border-color,transform] duration-150 ease-out active:scale-[0.97] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap select-none',
              FOCUS_RING,
            )}
          >
            <Search className="size-3.5 text-[var(--ink-subtle)]" strokeWidth={1.75} />
            <span className="hidden md:inline">搜索或跳转</span>
            {slot.shortcut && (
              <kbd className="hidden sm:inline-block font-mono text-[11px] text-[var(--ink-subtle)] px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] leading-none">
                {slot.shortcut}
              </kbd>
            )}
          </button>
        );
      case 'telemetry-sync-clock':
        return (
          <span
            key={slot.id}
            data-slot-id={slot.id}
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
        );
      case 'telemetry-poll-interval':
        return (
          <NativeSelect
            key={slot.id}
            compact
            aria-label={slot.label}
            data-slot-id={slot.id}
            value={String(pollMs)}
            onChange={(e) => setPollMs(Number(e.target.value))}
            className="hidden sm:block bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            <option value="0">手动</option>
            <option value="10000">10s</option>
            <option value="30000">30s</option>
          </NativeSelect>
        );
      case 'telemetry-manual-refresh':
        return (
          <Button
            key={slot.id}
            variant="secondary"
            size="sm"
            disabled={refreshing}
            aria-label="手动刷新数据"
            title="立即同步遥测快照"
            data-slot-id={slot.id}
            onClick={() => {
              loadSnapshot(true);
              if (activeModule.dataDeps.includes('probes')) loadProbes();
              if (activeModule.dataDeps.includes('ops')) loadOpsData();
            }}
          >
            <RefreshCw
              className={cn('size-4 text-[var(--ink-muted)]', refreshing && 'animate-spin')}
              strokeWidth={1.75}
            />
            <span className="hidden sm:inline">刷新</span>
          </Button>
        );
      case 'theme-toggle':
        return (
          <Button
            key={slot.id}
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
            title={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
            data-testid="theme-toggle"
            data-slot-id={slot.id}
          >
            {theme === 'dark' ? (
              <Sun className="size-4" strokeWidth={1.75} />
            ) : (
              <Moon className="size-4" strokeWidth={1.75} />
            )}
          </Button>
        );
      case 'session-logout':
        return (
          <Button
            key={slot.id}
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="退出登录"
            title="退出登录"
            data-slot-id={slot.id}
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            <span className="hidden md:inline">退出</span>
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)] flex">
        {/* Collapsible Desktop Sidebar */}
        {!sidebarCollapsed && (
          <aside
            data-testid="desktop-sidebar"
            className="hidden lg:flex lg:w-[244px] lg:shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[var(--surface-elevated)] border-r border-[var(--border)] z-30"
          >
            {renderSidebarContent(false)}
          </aside>
        )}

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
                在跨机 Agent 控制平面与系统基础设施视图间切换
              </Drawer.Description>
              {renderSidebarContent(true)}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {/* Main Content Column */}
        <div
          className={cn(
            'flex-1 min-w-0 flex flex-col min-h-dvh',
            sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-[244px]',
          )}
        >
          {/* Minimal Sticky Topbar */}
          <header className="sticky top-0 z-20 h-14 bg-[var(--bg)]/85 backdrop-blur-md border-b border-[var(--border-subtle)] shrink-0">
            <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="打开导航菜单"
                  className="lg:hidden"
                >
                  <Menu className="size-4" strokeWidth={1.75} />
                </Button>
                {sidebarCollapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarCollapsed(false)}
                    aria-label="展开侧边栏"
                    title="展开侧边栏"
                    data-testid="sidebar-expand-btn"
                    className="hidden lg:inline-flex"
                  >
                    <PanelLeftOpen className="size-4" strokeWidth={1.75} />
                  </Button>
                )}
                <div className="flex items-center gap-2 min-w-0 text-[13px] select-none">
                  <span className="hidden sm:inline text-[var(--ink-subtle)] whitespace-nowrap">
                    {activeDomainTitle}
                  </span>
                  <span className="hidden sm:inline text-[var(--ink-subtle)]/50" aria-hidden="true">/</span>
                  <span className="font-medium text-[var(--ink)] truncate whitespace-nowrap">
                    {activeModule.label}
                  </span>
                </div>
              </div>

              <div
                className="flex items-center gap-1.5 sm:gap-2 shrink-0"
                data-testid="workspace-action-bar"
              >
                {workspaceActionGroups.map((entry, idx) => (
                  <React.Fragment key={entry.group}>
                    {idx > 0 && (
                      <span
                        className="hidden sm:block h-4 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className="flex items-center gap-1.5 sm:gap-2"
                      data-action-group={entry.group}
                    >
                      {entry.slots.map((slot) => renderWorkspaceActionSlot(slot))}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </header>

          {/* Inline Error Notice only when sync actually fails */}
          {syncError && !isHarnessView && (
            <div className="border-b border-[var(--err)]/20 bg-[var(--err)]/5">
              <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-2 text-[12.5px] text-[var(--err)]">
                <span className="truncate">快照同步异常：{syncError}</span>
              </div>
            </div>
          )}

          {hotUpdateNotice && (
            <div
              data-testid="hot-update-banner"
              className="border-b border-[var(--accent)]/25 bg-[var(--accent)]/[0.06]"
            >
              <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[var(--ink)]">
                <span className="truncate font-medium">{hotUpdateNotice.message}</span>
                <div className="flex items-center gap-2">
                  {hotUpdateNotice.canReloadPage && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="size-3.5" strokeWidth={1.75} />
                      立即无感刷新
                    </Button>
                  )}
                  {hotUpdateNotice.kind !== 'restarting' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHotUpdateNotice(null)}
                    >
                      稍后
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active View Shell with per-module fault boundary */}
          <main className={mainContainerClass}>
            {loading && !snapshot && !isHarnessView ? (
              <ViewSkeleton />
            ) : (
              <ModuleBoundary moduleId={activeModule.id} moduleLabel={activeModule.label}>
                <React.Suspense fallback={<ViewSkeleton />}>
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
                      activeFilter={viewSubTabs.fleet}
                      onFilterChange={(next) => setViewSubTab('fleet', next)}
                      onRefresh={() => loadSnapshot(true)}
                      onRefreshProbes={loadProbes}
                      onOpenNodeMcps={(nodeId) => {
                        setMcpInitialNode(nodeId);
                        handleSelectView('mcp');
                      }}
                      onOpenA2A={() => handleSelectView('agents')}
                      onToast={pushToast}
                      onConfirm={setConfirmState}
                    />
                  )}
                  {view === 'services' && (
                    <ServicesView
                      snapshot={snapshot}
                      meta={meta}
                      readOnly={readOnly}
                      activeLayer={viewSubTabs.services}
                      onLayerChange={(next) => setViewSubTab('services', next)}
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
                  {view === 'mcp' && (
                    <McpView
                      snapshot={snapshot}
                      readOnly={readOnly}
                      initialNodeId={mcpInitialNode}
                      onSnapshotChanged={() => void loadSnapshot(true)}
                      onToast={pushToast}
                      onConfirm={setConfirmState}
                    />
                  )}
                  {view === 'memory' && (
                    <MemoryView
                      snapshot={snapshot}
                      readOnly={readOnly}
                      activeProvider={viewSubTabs.memory}
                      onProviderChange={(next) => setViewSubTab('memory', next)}
                      onToast={pushToast}
                    />
                  )}
                  {view === 'agents' && (
                    <AgentsView
                      readOnly={readOnly}
                      activeTaskId={activeAgentTaskId}
                      onSelectTask={setActiveAgentTaskId}
                      searchQuery={agentSearchQuery}
                      onSearchQueryChange={setAgentSearchQuery}
                      a2aRevision={a2aRevision}
                      catalogRevision={catalogRevision}
                      onTasksUpdated={() => void loadRecentAgentTasks()}
                      onOpenSettings={() => handleSelectView('agent-settings')}
                      onOpenProjectIssue={handleOpenProjectIssue}
                      onOpenSelfEvolution={() => {
                        setViewSubTab('ops', 'updates');
                        handleSelectView('ops');
                      }}
                      onToast={pushToast}
                    />
                  )}
                  {view === 'projects' && (
                    <ProjectsView
                      readOnly={readOnly}
                      a2aRevision={a2aRevision}
                      focusedIssueId={focusedProjectIssueId}
                      onClearFocusedIssue={() => setFocusedProjectIssueId(null)}
                      onOpenAgentTask={handleOpenAgentThread}
                      onToast={pushToast}
                    />
                  )}
                  {view === 'graph' && (
                    <AgentGraphView
                      readOnly={readOnly}
                      onToast={pushToast}
                    />
                  )}
                  {view === 'bots' && (
                    <BotsView
                      readOnly={readOnly}
                      onToast={pushToast}
                    />
                  )}
                  {view === 'github' && (
                    <GithubView
                      readOnly={readOnly}
                      onOpenAgentTask={handleOpenAgentThread}
                      onToast={pushToast}
                    />
                  )}
                  {view === 'agent-settings' && (
                    <AgentSettingsView
                      snapshot={snapshot}
                      readOnly={readOnly}
                      theme={theme}
                      onToggleTheme={toggleTheme}
                      selectedCategory={agentCategory}
                      selectedPid={agentPid}
                      onSelectCategory={(cat) => {
                        setAgentPid(null);
                        setAgentCategory(cat);
                      }}
                      onSelectPid={setAgentPid}
                      onSnapshotChanged={() => void loadSnapshot(true)}
                      onToast={pushToast}
                      onConfirm={setConfirmState}
                    />
                  )}
                  {view === 'network' && (
                    <NetworkView
                      snapshot={snapshot}
                      meta={meta}
                      activeTab={viewSubTabs.network}
                      onTabChange={(next) => setViewSubTab('network', next)}
                      onToast={pushToast}
                    />
                  )}
                  {view === 'logs' && (
                    <LogsView
                      snapshot={snapshot}
                      meta={meta}
                      initialUnit={logsInitialUnit}
                      initialLevel={logsInitialLevel}
                      initialFilter={logsInitialFilter}
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
                      activeTab={viewSubTabs.ops}
                      onTabChange={(next) => setViewSubTab('ops', next)}
                      onRefresh={() => loadSnapshot(true)}
                      onRefreshOps={loadOpsData}
                      onToast={pushToast}
                      onConfirm={setConfirmState}
                    />
                  )}
                </React.Suspense>
              </ModuleBoundary>
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
