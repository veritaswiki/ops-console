import React from 'react';
import {
  Activity,
  Gauge,
  Globe,
  Radar,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import type { ViewId } from '../types';

export type UiSlotKind = 'rail-panel' | 'settings-section' | 'workspace-action';
export type UiSlotName = 'rail.panel' | 'settings.section' | 'workspace.action';
export type UiSlotIdentifier = UiSlotKind | UiSlotName;

export type AgentSettingsTabId =
  | 'general'
  | 'multi-device'
  | 'orchestration'
  | 'governance'
  | 'gateway'
  | 'cache'
  | 'observability';

export type RailPanelRegion =
  | 'sidebar-nav'
  | 'sidebar-threads'
  | 'sidebar-footer'
  | 'settings-rail';

export type SettingsSectionGroup = 'core' | 'cluster' | 'runtime';

export type WorkspaceActionGroup = 'command' | 'telemetry' | 'preferences';

export interface RailPanelSlot {
  id: string;
  kind: 'rail-panel';
  label: string;
  description: string;
  region: RailPanelRegion;
  order: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
  viewIds?: readonly ViewId[];
}

export interface SettingsSubTabSpec {
  id: string;
  label: string;
}

export interface SettingsSectionSlot {
  id: AgentSettingsTabId;
  kind: 'settings-section';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  order: number;
  group: SettingsSectionGroup;
  subTabs?: readonly SettingsSubTabSpec[];
}

export interface WorkspaceActionSlot {
  id: string;
  kind: 'workspace-action';
  label: string;
  group: WorkspaceActionGroup;
  order: number;
  shortcut?: string;
  hideOnHarness?: boolean;
  requiresAuth?: boolean;
}

export type AnyUiSlot = RailPanelSlot | SettingsSectionSlot | WorkspaceActionSlot;

export interface DynamicUiSlotEntry<TContext = unknown> {
  id: string;
  slot: UiSlotName;
  label: string;
  description?: string;
  order?: number;
  enabled?: boolean;
  group?: string;
  region?: RailPanelRegion;
  viewIds?: readonly ViewId[];
  shortcut?: string;
  badge?: string;
  meta?: Record<string, unknown>;
  render?: (context: TContext) => React.ReactNode;
}

export interface DynamicUiSlotFilter {
  region?: RailPanelRegion;
  viewId?: ViewId;
  group?: string;
  includeDisabled?: boolean;
}

export interface UiSlotRegistry {
  register<TContext = unknown>(entry: DynamicUiSlotEntry<TContext>): () => void;
  unregister(slot: UiSlotIdentifier, id: string): boolean;
  get<TContext = unknown>(
    slot: UiSlotIdentifier,
    id: string,
  ): DynamicUiSlotEntry<TContext> | undefined;
  list<TContext = unknown>(
    slot: UiSlotIdentifier,
    filter?: DynamicUiSlotFilter,
  ): DynamicUiSlotEntry<TContext>[];
  subscribe(listener: () => void): () => void;
  getVersion(): number;
  clear(slot?: UiSlotIdentifier): void;
}

export function normalizeUiSlotName(slot: UiSlotIdentifier): UiSlotName {
  if (slot === 'rail-panel' || slot === 'rail.panel') return 'rail.panel';
  if (slot === 'settings-section' || slot === 'settings.section') return 'settings.section';
  return 'workspace.action';
}

function compareSlotEntries(
  left: { order?: number; id: string },
  right: { order?: number; id: string },
): number {
  const leftOrder = typeof left.order === 'number' && Number.isFinite(left.order) ? left.order : 100;
  const rightOrder =
    typeof right.order === 'number' && Number.isFinite(right.order) ? right.order : 100;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.id.localeCompare(right.id);
}

export function createUiSlotRegistry(): UiSlotRegistry {
  const buckets: Record<UiSlotName, Map<string, DynamicUiSlotEntry<any>>> = {
    'rail.panel': new Map(),
    'settings.section': new Map(),
    'workspace.action': new Map(),
  };
  const listeners = new Set<() => void>();
  let version = 0;

  const notify = () => {
    version += 1;
    for (const listener of [...listeners]) {
      listener();
    }
  };

  return {
    register<TContext = unknown>(entry: DynamicUiSlotEntry<TContext>): () => void {
      const id = String(entry.id || '').trim();
      if (!id) {
        throw new Error('UI slot id must be a non-empty string');
      }
      const slotName = normalizeUiSlotName(entry.slot);
      const normalized: DynamicUiSlotEntry<any> = {
        ...entry,
        id,
        slot: slotName,
        order: typeof entry.order === 'number' && Number.isFinite(entry.order) ? entry.order : 100,
        enabled: entry.enabled !== false,
      };
      buckets[slotName].set(id, normalized);
      notify();

      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        if (buckets[slotName].get(id) === normalized) {
          buckets[slotName].delete(id);
          notify();
        }
      };
    },

    unregister(slot: UiSlotIdentifier, id: string): boolean {
      const slotName = normalizeUiSlotName(slot);
      const removed = buckets[slotName].delete(String(id || '').trim());
      if (removed) notify();
      return removed;
    },

    get<TContext = unknown>(
      slot: UiSlotIdentifier,
      id: string,
    ): DynamicUiSlotEntry<TContext> | undefined {
      const slotName = normalizeUiSlotName(slot);
      return buckets[slotName].get(String(id || '').trim()) as
        | DynamicUiSlotEntry<TContext>
        | undefined;
    },

    list<TContext = unknown>(
      slot: UiSlotIdentifier,
      filter?: DynamicUiSlotFilter,
    ): DynamicUiSlotEntry<TContext>[] {
      const slotName = normalizeUiSlotName(slot);
      const results: DynamicUiSlotEntry<TContext>[] = [];
      for (const entry of buckets[slotName].values()) {
        if (!filter?.includeDisabled && entry.enabled === false) continue;
        if (filter?.region && entry.region && entry.region !== filter.region) continue;
        if (filter?.region && !entry.region) continue;
        if (filter?.group && entry.group !== filter.group) continue;
        if (filter?.viewId && entry.viewIds && !entry.viewIds.includes(filter.viewId)) continue;
        results.push(entry as DynamicUiSlotEntry<TContext>);
      }
      return results.sort(compareSlotEntries);
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getVersion(): number {
      return version;
    },

    clear(slot?: UiSlotIdentifier): void {
      let changed = false;
      if (slot) {
        const slotName = normalizeUiSlotName(slot);
        if (buckets[slotName].size > 0) {
          buckets[slotName].clear();
          changed = true;
        }
      } else {
        for (const key of Object.keys(buckets) as UiSlotName[]) {
          if (buckets[key].size > 0) {
            buckets[key].clear();
            changed = true;
          }
        }
      }
      if (changed) notify();
    },
  };
}

export const uiSlotRegistry = createUiSlotRegistry();

export function registerUiSlot<TContext = unknown>(
  entry: DynamicUiSlotEntry<TContext>,
): () => void {
  return uiSlotRegistry.register(entry);
}

export function useUiSlots<TContext = unknown>(
  slot: UiSlotIdentifier,
  filter?: DynamicUiSlotFilter,
  registry: UiSlotRegistry = uiSlotRegistry,
): DynamicUiSlotEntry<TContext>[] {
  const version = React.useSyncExternalStore(
    (onStoreChange) => registry.subscribe(onStoreChange),
    () => registry.getVersion(),
    () => registry.getVersion(),
  );
  const region = filter?.region;
  const viewId = filter?.viewId;
  const group = filter?.group;
  const includeDisabled = filter?.includeDisabled;
  return React.useMemo(
    () =>
      registry.list<TContext>(slot, {
        region,
        viewId,
        group,
        includeDisabled,
      }),
    [registry, slot, region, viewId, group, includeDisabled, version],
  );
}

export const RAIL_PANEL_SLOTS: readonly RailPanelSlot[] = [
  {
    id: 'sidebar-domain-nav',
    kind: 'rail-panel',
    label: '域级导航树',
    description: '按智能体、监控与观测、基础设施与运维四域组织的折叠导航',
    region: 'sidebar-nav',
    order: 10,
    collapsible: true,
    defaultOpen: true,
  },
  {
    id: 'sidebar-agent-threads',
    kind: 'rail-panel',
    label: 'Agent 最近任务线程',
    description: '在侧边栏快速检索与恢复近期 Agent 会话线程',
    region: 'sidebar-threads',
    order: 20,
    collapsible: true,
    defaultOpen: true,
    viewIds: ['agents'],
  },
  {
    id: 'settings-section-rail',
    kind: 'rail-panel',
    label: '设置分组导航栏',
    description: '系统与 Agent 设置页的左侧粘性锚点导航与控制面摘要',
    region: 'settings-rail',
    order: 30,
    viewIds: ['agent-settings'],
  },
  {
    id: 'sidebar-host-footer',
    kind: 'rail-panel',
    label: '宿主机与设置底栏',
    description: '固定底部设置入口、主机版本标识与 PWA 安装入口',
    region: 'sidebar-footer',
    order: 40,
  },
] as const;

export const SETTINGS_SECTION_SLOTS: readonly SettingsSectionSlot[] = [
  {
    id: 'general',
    kind: 'settings-section',
    label: '常规与外观',
    description: '主题切换、默认路由模型与 GitHub 仓库配置',
    icon: SlidersHorizontal,
    order: 10,
    group: 'core',
  },
  {
    id: 'multi-device',
    kind: 'settings-section',
    label: '多机 Agent 与 A2A 互联',
    description: 'A2A v0.3 Hub 端点、本机扫描、拨测与跨机接入命令',
    icon: Globe,
    order: 20,
    group: 'cluster',
  },
  {
    id: 'orchestration',
    kind: 'settings-section',
    label: '编排与拓扑',
    description: 'A2A 路由规则、集群拓扑画布与 Linear 总指挥',
    icon: Workflow,
    order: 30,
    group: 'cluster',
    subTabs: [
      { id: 'a2a', label: 'A2A 路由与角色分工' },
      { id: 'topology', label: '集群拓扑画布' },
      { id: 'linear', label: 'Linear 总指挥与项目' },
    ],
  },
  {
    id: 'governance',
    kind: 'settings-section',
    label: '蜂群、护栏与日志',
    description: '蜂群协同引擎、AI 安全护栏与协作日志流',
    icon: ShieldCheck,
    order: 40,
    group: 'cluster',
    subTabs: [
      { id: 'swarm', label: '蜂群引擎' },
      { id: 'guardrails', label: '安全护栏' },
      { id: 'logs', label: '协作日志' },
    ],
  },
  {
    id: 'gateway',
    kind: 'settings-section',
    label: '网关与进程',
    description: 'Magpie 24h 遥测、成本熔断、加速器与本地进程',
    icon: Activity,
    order: 50,
    group: 'runtime',
  },
  {
    id: 'cache',
    kind: 'settings-section',
    label: '缓存命中与决策归因',
    description: '多机 Agent × 模型缓存命中率监控、阈值告警与可选决策模型自动归因',
    icon: Gauge,
    order: 60,
    group: 'runtime',
  },
  {
    id: 'observability',
    kind: 'settings-section',
    label: '联邦日志与可观测',
    description: '多源只读日志索引、定时巡检频率档位、磁盘配额与共享决策模型归因',
    icon: Radar,
    order: 70,
    group: 'runtime',
  },
] as const;

export const WORKSPACE_ACTION_SLOTS: readonly WorkspaceActionSlot[] = [
  {
    id: 'command-palette',
    kind: 'workspace-action',
    label: '快速命令面板',
    group: 'command',
    order: 10,
    shortcut: '⌘K',
  },
  {
    id: 'telemetry-sync-clock',
    kind: 'workspace-action',
    label: '最近同步时间',
    group: 'telemetry',
    order: 20,
    hideOnHarness: true,
  },
  {
    id: 'telemetry-poll-interval',
    kind: 'workspace-action',
    label: '自动刷新周期',
    group: 'telemetry',
    order: 25,
    hideOnHarness: true,
  },
  {
    id: 'telemetry-manual-refresh',
    kind: 'workspace-action',
    label: '手动刷新遥测',
    group: 'telemetry',
    order: 30,
    hideOnHarness: true,
  },
  {
    id: 'theme-toggle',
    kind: 'workspace-action',
    label: '明暗主题切换',
    group: 'preferences',
    order: 40,
  },
  {
    id: 'session-logout',
    kind: 'workspace-action',
    label: '退出登录',
    group: 'preferences',
    order: 50,
    requiresAuth: true,
  },
] as const;

export const WORKSPACE_ACTION_GROUP_ORDER: readonly WorkspaceActionGroup[] = [
  'command',
  'telemetry',
  'preferences',
] as const;

function mergeAndSortSlots<T extends { id: string; order: number }>(
  base: readonly T[],
  extra?: readonly T[],
): T[] {
  const merged = new Map<string, T>();
  for (const item of base) {
    merged.set(item.id, item);
  }
  if (extra) {
    for (const item of extra) {
      merged.set(item.id, item);
    }
  }
  return [...merged.values()].sort((left, right) => left.order - right.order);
}

export function getRailPanelSlots(options?: {
  region?: RailPanelRegion;
  viewId?: ViewId;
  extra?: readonly RailPanelSlot[];
}): RailPanelSlot[] {
  const all = mergeAndSortSlots(RAIL_PANEL_SLOTS, options?.extra);
  return all.filter((slot) => {
    if (options?.region && slot.region !== options.region) return false;
    if (options?.viewId && slot.viewIds && !slot.viewIds.includes(options.viewId)) return false;
    return true;
  });
}

export function getSettingsSectionSlots(options?: {
  group?: SettingsSectionGroup;
  extra?: readonly SettingsSectionSlot[];
}): SettingsSectionSlot[] {
  const all = mergeAndSortSlots(SETTINGS_SECTION_SLOTS, options?.extra);
  if (!options?.group) return all;
  return all.filter((slot) => slot.group === options.group);
}

export function getSettingsSectionById(
  id: AgentSettingsTabId,
  extra?: readonly SettingsSectionSlot[],
): SettingsSectionSlot {
  const all = getSettingsSectionSlots({ extra });
  return all.find((slot) => slot.id === id) || all[0];
}

export function getWorkspaceActionSlots(options?: {
  group?: WorkspaceActionGroup;
  isHarnessView?: boolean;
  authEnabled?: boolean;
  extra?: readonly WorkspaceActionSlot[];
}): WorkspaceActionSlot[] {
  const all = mergeAndSortSlots(WORKSPACE_ACTION_SLOTS, options?.extra);
  return all.filter((slot) => {
    if (options?.group && slot.group !== options.group) return false;
    if (options?.isHarnessView && slot.hideOnHarness) return false;
    if (slot.requiresAuth && !options?.authEnabled) return false;
    return true;
  });
}

export function groupWorkspaceActionSlots(options?: {
  isHarnessView?: boolean;
  authEnabled?: boolean;
  extra?: readonly WorkspaceActionSlot[];
}): Array<{ group: WorkspaceActionGroup; slots: WorkspaceActionSlot[] }> {
  const visible = getWorkspaceActionSlots(options);
  return WORKSPACE_ACTION_GROUP_ORDER.map((group) => ({
    group,
    slots: visible.filter((slot) => slot.group === group),
  })).filter((entry) => entry.slots.length > 0);
}

export function getSlotsByKind(kind: 'rail-panel'): readonly RailPanelSlot[];
export function getSlotsByKind(kind: 'settings-section'): readonly SettingsSectionSlot[];
export function getSlotsByKind(kind: 'workspace-action'): readonly WorkspaceActionSlot[];
export function getSlotsByKind(kind: UiSlotKind): readonly AnyUiSlot[] {
  if (kind === 'rail-panel') return RAIL_PANEL_SLOTS;
  if (kind === 'settings-section') return SETTINGS_SECTION_SLOTS;
  return WORKSPACE_ACTION_SLOTS;
}
