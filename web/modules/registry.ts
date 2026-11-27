import React from 'react';
import {
  Bell,
  Blocks,
  Bot,
  Database,
  GitBranch,
  GitFork,
  Globe,
  KanbanSquare,
  Layers,
  LayoutGrid,
  MessageSquare,
  Network,
  Plug,
  SlidersHorizontal,
  Terminal,
  Wrench,
} from 'lucide-react';
import type { ViewId } from '../types';

export type ModuleDomainId = 'agent' | 'observe' | 'infra' | 'operate';

export type ModuleDataDep = 'snapshot' | 'probes' | 'ops';

export interface ModuleDomainConfig {
  id: ModuleDomainId;
  title: string;
  description: string;
  primary?: boolean;
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
  placement?: 'nav' | 'footer';
  eager?: boolean;
  prefetch?: () => Promise<unknown>;
  benchmarks: ModuleBenchmarkSpec;
}

export const MODULE_DOMAINS: readonly ModuleDomainConfig[] = [
  { id: 'agent', title: 'Harness', description: 'Agent 对话与执行、任务看板、分配图谱、GitHub 与 Bot', primary: true },
  { id: 'observe', title: '监控与观测', description: '系统总览、节点与探针及告警中心' },
  { id: 'infra', title: '基础设施', description: '受管服务、插件接入、全节点 MCP、记忆引擎与网络' },
  { id: 'operate', title: '运维与审计', description: '统一日志追踪、定时任务、Runbook 与操作审计' },
] as const;

export const loadAlertsView = () => import('../views/AlertsView');
export const loadFleetView = () => import('../views/FleetView');
export const loadServicesView = () => import('../views/ServicesView');
export const loadPluginsView = () => import('../views/PluginsView');
export const loadMcpView = () => import('../views/McpView');
export const loadMemoryView = () => import('../views/MemoryView');
export const loadAgentsView = () => import('../views/AgentsView');
export const loadProjectsView = () => import('../views/ProjectsView');
export const loadAgentGraphView = () => import('../views/AgentGraphView');
export const loadBotsView = () => import('../views/BotsView');
export const loadGithubView = () => import('../views/GithubView');
export const loadAgentSettingsView = () => import('../views/AgentSettingsView');
export const loadNetworkView = () => import('../views/NetworkView');
export const loadLogsView = () => import('../views/LogsView');
export const loadOpsView = () => import('../views/OpsView');

export const CONSOLE_MODULES: readonly ConsoleModule[] = [
  // ─── Harness Workspace (Top Primary Sidebar Group) ─────────────────────────
  {
    id: 'agents',
    domain: 'agent',
    label: 'Agent',
    shortDesc: '极简 Agent 对话与执行入口：居中输入框搭配模型/Harness 选择，即刻下发任务',
    chord: 'g',
    keywords: ['agent', 'agents', 'harness', 'codex', 'claude', 'pi', 'antigravity', '对话', '执行', '调度'],
    icon: MessageSquare,
    dataDeps: ['snapshot'],
    eager: true,
    prefetch: loadAgentsView,
    benchmarks: {
      references: ['Codex App', 'Antigravity', 'Claude Code'],
      migratedCapabilities: ['极简居中输入框与行内模型/Harness 选择', '左侧栏可折叠历史任务线程'],
    },
  },
  {
    id: 'projects',
    domain: 'agent',
    label: '任务看板',
    shortDesc: 'Linear 原生风格任务列表与看板：清爽状态分组、行内详情抽屉与总指挥拆解',
    chord: 'j',
    keywords: ['tasks', 'board', 'linear', 'projects', 'issues', 'kanban', '任务', '看板', '项目'],
    icon: KanbanSquare,
    dataDeps: ['snapshot'],
    prefetch: loadProjectsView,
    benchmarks: {
      references: ['Linear'],
      migratedCapabilities: ['Linear 分组列表与极简 4 列看板', '右侧任务详情抽屉与一键总指挥拆解'],
    },
  },
  {
    id: 'graph',
    domain: 'agent',
    label: '分配图谱',
    shortDesc: 'n8n 风格节点工作流画布：直观查看总指挥、任务拆解与执行 Agent 连接链路',
    chord: 'd',
    keywords: ['graph', 'n8n', 'workflow', 'dag', 'map', '图谱', '工作流', '依赖', '分配'],
    icon: GitFork,
    dataDeps: ['snapshot'],
    prefetch: loadAgentGraphView,
    benchmarks: {
      references: ['n8n', 'React Flow'],
      migratedCapabilities: ['全画布点阵工作流视图与端口连线', '点击节点浮出参数检查面板'],
    },
  },
  {
    id: 'github',
    domain: 'agent',
    label: 'GitHub',
    shortDesc: '配置 GitHub 仓库双向同步，追踪 Agent 自动创建的 Worktree 分支与 Pull Request',
    chord: 'h',
    keywords: ['github', 'git', 'pr', 'pull request', 'repo', 'sync', '仓库', '同步'],
    icon: GitBranch,
    dataDeps: ['snapshot'],
    prefetch: loadGithubView,
    benchmarks: {
      references: ['GitHub Projects', 'Linear GitHub Sync'],
      migratedCapabilities: ['独立 GitHub 仓库配置、双向同步与 PR 交付追踪'],
    },
  },
  {
    id: 'bots',
    domain: 'agent',
    label: 'Bot',
    shortDesc: '创建与管理 GitHub、Telegram、Discord、Slack 等多渠道自动化 Bot',
    chord: 'b',
    keywords: ['bots', 'bot', 'github', 'telegram', 'discord', 'slack', 'webhook', '机器人'],
    icon: Bot,
    dataDeps: ['snapshot'],
    prefetch: loadBotsView,
    benchmarks: {
      references: ['Linear Agents & Bots', 'Slack Apps'],
      migratedCapabilities: ['独立多渠道 Bot 编排与事件模拟触发'],
    },
  },
  {
    id: 'agent-settings',
    domain: 'agent',
    label: '设置',
    shortDesc: '外观偏好、多机 Agent 与 A2A 互联、编排拓扑、安全护栏及网关设置',
    chord: 'e',
    keywords: ['settings', 'config', 'a2a', 'swarm', 'governance', 'gateway', '设置', '分工', '高级', '护栏'],
    icon: SlidersHorizontal,
    dataDeps: ['snapshot'],
    placement: 'footer',
    prefetch: loadAgentSettingsView,
    benchmarks: {
      references: ['Codex Settings', 'Google A2A Protocol'],
      migratedCapabilities: ['高阶编排、蜂群与网关遥测统一收口于设置页'],
    },
  },

  // ─── Monitoring & Nodes ────────────────────────────────────────────────────
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
    id: 'fleet',
    domain: 'observe',
    label: '节点与探针',
    shortDesc: '世界地图拓扑、多维排序对比矩阵、RTT 延迟条与远程指令队列',
    chord: 'f',
    keywords: ['fleet', 'map', 'probe', '节点', '全球节点', '地图', '探针', '手机'],
    icon: Globe,
    dataDeps: ['snapshot', 'probes'],
    prefetch: loadFleetView,
    benchmarks: {
      references: ['Tailscale Admin', 'Teleport', 'Uptime Kuma'],
      migratedCapabilities: ['多节点状态/CPU/内存/RTT 排序对比矩阵', '行内延迟可视化色条与 IP 快复制', '一次性令牌注册与 Pull-only 指令队列'],
    },
  },
  {
    id: 'alerts',
    domain: 'observe',
    label: '告警中心',
    shortDesc: '多档静默倒计时、批量 Ack、规则搜索过滤、30 天 SLA 与复盘',
    chord: 'a',
    keywords: ['alerts', 'sla', 'incident', 'postmortem', '告警', '告警与事件', '事件', '复盘', '规则'],
    icon: Bell,
    dataDeps: ['snapshot', 'ops'],
    badgeKey: 'alerts',
    prefetch: loadAlertsView,
    benchmarks: {
      references: ['PagerDuty', 'Alertmanager', 'Sentry'],
      migratedCapabilities: ['多档维护静默与实时倒计时条', '告警队列筛选与批量确认', '声明式规则搜索与状态快筛'],
    },
  },

  // ─── Infrastructure ────────────────────────────────────────────────────────
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
    id: 'mcp',
    domain: 'infra',
    label: '全节点 MCP',
    shortDesc: '跨 VPS、开发机与主节点的 MCP 统一纳管、协议握手拨测与一键同步下发',
    chord: 'c',
    keywords: ['mcp', 'tools', 'stdio', 'streamable-http', 'sse', '全节点', '工具'],
    icon: Plug,
    dataDeps: ['snapshot'],
    prefetch: loadMcpView,
    benchmarks: {
      references: ['MCP Inspector', 'Smithery', 'Docker MCP Toolkit'],
      migratedCapabilities: ['按设备节点分面管理全部 MCP', 'Streamable HTTP / SSE / stdio 协议握手拨测', '跨设备一键同步与 Pull-only 下发'],
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

  // ─── Operations ────────────────────────────────────────────────────────────
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

export function getModulesGroupedByDomain(options?: { includeFooter?: boolean }): Array<{
  domain: ModuleDomainConfig;
  modules: ConsoleModule[];
}> {
  const includeFooter = Boolean(options?.includeFooter);
  return MODULE_DOMAINS.map((domain) => ({
    domain,
    modules: CONSOLE_MODULES.filter(
      (m) => m.domain === domain.id && (includeFooter || m.placement !== 'footer'),
    ),
  }));
}

export function getFooterModules(): ConsoleModule[] {
  return CONSOLE_MODULES.filter((m) => m.placement === 'footer');
}

export function prefetchModule(id: ViewId): void {
  const mod = MODULE_MAP.get(id);
  if (mod?.prefetch) {
    void mod.prefetch();
  }
}

export function parseViewFromHash(hash: string): ViewId | null {
  const cleaned = String(hash || '').replace(/^#\/?/, '').split(/[?&/]/)[0].trim().toLowerCase();
  if (cleaned === 'tasks') return 'projects';
  return isValidViewId(cleaned) ? cleaned : null;
}
