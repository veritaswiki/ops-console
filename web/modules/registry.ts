import React from 'react';
import {
  Bell,
  Blocks,
  Bot,
  Database,
  Globe,
  Layers,
  LayoutGrid,
  Network,
  Terminal,
  Wrench,
} from 'lucide-react';
import type { ViewId } from '../types';

export type ModuleDomainId = 'observe' | 'infra' | 'operate';

export type ModuleDataDep = 'snapshot' | 'probes' | 'ops';

export interface ModuleDomainConfig {
  id: ModuleDomainId;
  title: string;
  description: string;
}

export interface ModuleBenchmarkSpec {
  references: string[];
  migratedCapabilities: string[];
}

export interface ConsoleModule {
  id: ViewId;
  domain: ModuleDomainId;
  label: string;
  shortDesc: string;
  chord: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  dataDeps: ModuleDataDep[];
  badgeKey?: 'alerts' | 'failedServices';
  eager?: boolean;
  prefetch?: () => Promise<unknown>;
  benchmarks: ModuleBenchmarkSpec;
}

export const MODULE_DOMAINS: readonly ModuleDomainConfig[] = [
  { id: 'observe', title: '观测', description: '全栈态势、告警事件与全球节点分布' },
  { id: 'infra', title: '基础设施', description: '受管服务、插件接入、记忆引擎、网关与网络' },
  { id: 'operate', title: '运维', description: '结构化日志追踪、定时任务、Runbook 与审计' },
] as const;

export const loadAlertsView = () => import('../views/AlertsView');
export const loadFleetView = () => import('../views/FleetView');
export const loadServicesView = () => import('../views/ServicesView');
export const loadPluginsView = () => import('../views/PluginsView');
export const loadMemoryView = () => import('../views/MemoryView');
export const loadAgentsView = () => import('../views/AgentsView');
export const loadNetworkView = () => import('../views/NetworkView');
export const loadLogsView = () => import('../views/LogsView');
export const loadOpsView = () => import('../views/OpsView');

export const CONSOLE_MODULES: readonly ConsoleModule[] = [
  {
    id: 'overview',
    domain: 'observe',
    label: '系统总览',
    shortDesc: '全栈服务健康度、主机负载、聚合趋势与依赖拓扑',
    chord: 'o',
    keywords: ['overview', 'dashboard', '总览', '架构', '拓扑', '主界面'],
    icon: LayoutGrid,
    dataDeps: ['snapshot'],
    eager: true,
    benchmarks: {
      references: ['Grafana', 'Datadog', 'Netdata'],
      migratedCapabilities: ['非对称 KPI 比例条', '跨尺度 SQLite WAL 趋势图', '上下游依赖拓扑下钻', '持久化工作台面板自定义'],
    },
  },
  {
    id: 'alerts',
    domain: 'observe',
    label: '告警与事件',
    shortDesc: '多档静默倒计时、批量 Ack、规则搜索过滤、30 天 SLA 与复盘',
    chord: 'a',
    keywords: ['alerts', 'sla', 'incident', 'postmortem', '告警', '事件', '复盘', '规则'],
    icon: Bell,
    dataDeps: ['snapshot', 'ops'],
    badgeKey: 'alerts',
    prefetch: loadAlertsView,
    benchmarks: {
      references: ['PagerDuty', 'Alertmanager', 'Sentry'],
      migratedCapabilities: ['多档维护静默与实时倒计时条', '告警队列筛选与批量确认', '声明式规则搜索与状态快筛'],
    },
  },
  {
    id: 'fleet',
    domain: 'observe',
    label: '全球节点',
    shortDesc: '世界地图拓扑、多维排序对比矩阵、RTT 延迟条与远程指令队列',
    chord: 'f',
    keywords: ['fleet', 'map', 'probe', '节点', '地图', '探针', '手机'],
    icon: Globe,
    dataDeps: ['snapshot', 'probes'],
    prefetch: loadFleetView,
    benchmarks: {
      references: ['Tailscale Admin', 'Teleport', 'Uptime Kuma'],
      migratedCapabilities: ['多节点状态/CPU/内存/RTT 排序对比矩阵', '行内延迟可视化色条与 IP 快复制', '一次性令牌注册与 Pull-only 指令队列'],
    },
  },
  {
    id: 'services',
    domain: 'infra',
    label: '受管服务',
    shortDesc: 'systemd 单元排序、行内快捷控制、延迟分级与依赖展开',
    chord: 's',
    keywords: ['services', 'systemd', 'service', '服务', '重启', '进程'],
    icon: Layers,
    dataDeps: ['snapshot'],
    badgeKey: 'failedServices',
    prefetch: loadServicesView,
    benchmarks: {
      references: ['Cockpit', 'Portainer', 'Supervisor'],
      migratedCapabilities: ['按异常/延迟/内存列头排序', '行内高频重启直达', '可展开单元依赖与探针详情'],
    },
  },
  {
    id: 'plugins',
    domain: 'infra',
    label: '插件与接入',
    shortDesc: 'MCP / A2A / OpenAI 协议目录、批量巡检、脱敏清单导出与启停',
    chord: 'p',
    keywords: ['plugins', 'mcp', 'a2a', 'agent', 'openai', 'ollama', 'connector', '插件', '接入', '协议'],
    icon: Blocks,
    dataDeps: ['snapshot'],
    prefetch: loadPluginsView,
    benchmarks: {
      references: ['Grafana Plugins', 'Backstage', 'Raycast'],
      migratedCapabilities: ['全量已启用插件并发批量巡检', '脱敏 JSON 配置清单导出', '状态/协议双维过滤与热启停'],
    },
  },
  {
    id: 'memory',
    domain: 'infra',
    label: '记忆引擎',
    shortDesc: '跨引擎联合语义检索、Rerank 对比实验室与评测导出',
    chord: 'm',
    keywords: ['memory', 'nmem', 'openviking', 'symbiote', 'rerank', '记忆', '检索'],
    icon: Database,
    dataDeps: ['snapshot'],
    prefetch: loadMemoryView,
    benchmarks: {
      references: ['Qdrant Dashboard', 'Milvus Attu', 'LangSmith Eval'],
      migratedCapabilities: ['跨引擎 Rerank 增益对照表', '快捷评测 Query 预设', '评测结果 JSON 一键导出'],
    },
  },
  {
    id: 'agents',
    domain: 'infra',
    label: '网关与 Agent',
    shortDesc: '模型网关成本占比、熔断状态、会话水位与可排序进程表',
    chord: 'g',
    keywords: ['agents', 'magpie', 'gateway', 'mcp', '模型', '网关'],
    icon: Bot,
    dataDeps: ['snapshot'],
    prefetch: loadAgentsView,
    benchmarks: {
      references: ['Langfuse', 'LiteLLM Proxy', 'Helicone'],
      migratedCapabilities: ['Provider 成本占比与熔断观测', 'Token/TTFT 24h 趋势', '进程 CPU/内存排序与过滤'],
    },
  },
  {
    id: 'network',
    domain: 'infra',
    label: '网络与防火墙',
    shortDesc: 'Tailscale 设备搜索与 IP 快复制、Mihomo 代理与端口暴露面收敛',
    chord: 'n',
    keywords: ['network', 'tailscale', 'mihomo', 'syncthing', 'ssh', '网络', '防火墙'],
    icon: Network,
    dataDeps: ['snapshot'],
    prefetch: loadNetworkView,
    benchmarks: {
      references: ['Tailscale Admin', 'Metacubexd', 'OPNsense'],
      migratedCapabilities: ['点击 IP 一键复制', 'DERP 中继/在线状态筛选', '防火墙非回环端口暴露面快筛'],
    },
  },
  {
    id: 'logs',
    domain: 'operate',
    label: '统一日志',
    shortDesc: '日志频次直方图、点击单元快筛、虚拟滚动与 SSE 实时追踪',
    chord: 'l',
    keywords: ['logs', 'journald', 'tail', 'stream', '日志', '实时流'],
    icon: Terminal,
    dataDeps: ['snapshot'],
    prefetch: loadLogsView,
    benchmarks: {
      references: ['Grafana Loki', 'Datadog Logs', 'Dozzle'],
      migratedCapabilities: ['时间桶级别频次直方图', '单元/级别 Facet 点击过滤', '单行一键复制与虚拟滚动'],
    },
  },
  {
    id: 'ops',
    domain: 'operate',
    label: '运维与审计',
    shortDesc: '定时任务、Runbook 历史回溯、配置校验与多维审计 CSV 导出',
    chord: 'w',
    keywords: ['ops', 'timers', 'backup', 'audit', 'incidents', '运维', '备份', '审计'],
    icon: Wrench,
    dataDeps: ['snapshot', 'ops'],
    prefetch: loadOpsView,
    benchmarks: {
      references: ['Rundeck', 'Ansible AWX', 'Cockpit'],
      migratedCapabilities: ['审计日志关键词/结果多维过滤与 CSV 导出', 'Runbook 历史执行逐步回溯', 'Config Studio 语法校验'],
    },
  },
] as const;

const MODULE_MAP = new Map<ViewId, ConsoleModule>(CONSOLE_MODULES.map((m) => [m.id, m]));
const CHORD_MAP = new Map<string, ViewId>(CONSOLE_MODULES.map((m) => [m.chord.toLowerCase(), m.id]));

export function isValidViewId(raw: string): raw is ViewId {
  return MODULE_MAP.has(raw as ViewId);
}

export function getModuleById(id: ViewId): ConsoleModule {
  return MODULE_MAP.get(id) || CONSOLE_MODULES[0];
}

export function getModuleByChord(key: string): ViewId | null {
  return CHORD_MAP.get(String(key || '').toLowerCase()) || null;
}

export function getModulesGroupedByDomain(): Array<{
  domain: ModuleDomainConfig;
  modules: ConsoleModule[];
}> {
  return MODULE_DOMAINS.map((domain) => ({
    domain,
    modules: CONSOLE_MODULES.filter((m) => m.domain === domain.id),
  }));
}

export function prefetchModule(id: ViewId): void {
  const mod = MODULE_MAP.get(id);
  if (mod?.prefetch) {
    void mod.prefetch();
  }
}

export function parseViewFromHash(hash: string): ViewId | null {
  const cleaned = String(hash || '').replace(/^#\/?/, '').split(/[?&/]/)[0].trim().toLowerCase();
  return isValidViewId(cleaned) ? cleaned : null;
}
