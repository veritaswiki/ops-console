# Ops Console 模块化架构与同类标杆迁移蓝图

本文档固化 Ops Console 的 **4 大业务域 × 16 个独立板块** 契约（对应源码真源 `web/modules/registry.ts`），左侧栏支持桌面端一键折叠，并按 4 大业务域直接展开分组（**`Harness`**、**`监控与观测`**、**`基础设施`**、**`运维与审计`**），各分组可独立折叠展开并持久化状态；**设置 (`agent-settings`)** 收纳在侧栏底部固定入口。

---

## 一、板块固化规范（Module Contract）

所有界面功能按职责收口到 4 个业务域、16 个解耦板块中，通过 `CONSOLE_MODULES` 注册表统一声明：

- **强契约元数据**：`id`、`domain`（`agent | observe | infra | operate`）、`label`、`shortDesc`、`chord`（Linear 风格 `G + 键` 导航和弦）、`keywords`（命令面板检索）、`dataDeps`（按需数据依赖声明 `snapshot | probes | ops`）、`badgeKey`、`loader`（按需代码分割与悬停预加载）。
- **现代 Agent 工作台与分类可折叠侧栏**：默认进入 `#agents`（**Agent**），支持对话流与 **Pending / Working / Done / Failed 四列拖拽生命周期看板** 双视图切换、14 条 `/` 斜杠命令与 `@agent` 多机路由；侧栏 `Agent` 分栏内置按任务 ID/提示词过滤搜索框；四大业务域全部默认展开并可分别折叠。
- **故障隔离边界**：每个板块由 `<ModuleBoundary>` 独立包裹，单板块异常不会导致整个控制面崩溃，并支持局部一键恢复。
- **可分享深度链接**：统一接入 URL Hash 路由（如 `#agents`、`#projects`、`#graph`、`#bots`、`#github`、`#agent-settings`、`#services`、`#logs`），支持刷新保活与浏览器前进/后退。

---

## 二、十六大板块梳理与同类标杆优点分析

| 域 | 板块 ID | 板块名称 | 快捷键 | 同类标杆项目 | 核心标杆优点拆解 | 迁移状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Harness** | `agents` | Agent | `G G` | **Claude Code / Codex / T3 Code** | 对话流 + 四列拖拽生命周期看板（Pending/Working/Done/Failed）、14 条 `/` 命令与 `@agent` 路由、折叠执行轨迹、多机 Google A2A v0.3 委派与侧栏任务检索 | **Wave 11 全面升级**：对话流 + 拖拽看板 + A2A v0.3 |
| **Harness** | `projects` | 任务看板 | `G J` | **Linear** | 还原 Linear 4 列看板 + 分组列表视角，单行顶部工具栏，极简无噪卡片，点击任务右侧滑出 Linear 属性详情抽屉进行状态/优先级/Agent 改派与总指挥派发 | **Wave 10 还原完成**：纯粹 Linear 看板 + 列表 + 右侧详情抽屉 |
| **Harness** | `graph` | 分配图谱 | `G D` | **n8n Workflow Canvas** | 全画布点阵工作流编排器：圆角方形图标节点 + 左右圆形连线端口 + 角标执行状态 + 平滑贝塞尔连线 + 底部悬浮缩放条 + 点击节点按需滑出右侧参数抽屉 | **Wave 10 还原完成**：n8n 风格全画布分配工作流 |
| **Harness** | `bots` | Bot | `G B` | **GitHub / Slack / Telegram Bot** | 独立自动化 Bot 管理视图：创建、启停、一键测试触发 Webhook 建单与自动派发 | **Wave 10 独立解耦**：与 GitHub 彻底拆分 |
| **Harness** | `github` | GitHub | `G H` | **Orca / T3 Code GitHub** | 聚焦当前仓库的 PR / Issue / Actions CI / 本地分支与 Worktree 一体化视图，支持从任意 PR、Issue 或失败 CI 一键派发 Agent 修复/评审 | **Wave 11 Orca/T3 重构**：仓内 PR/Issue/CI/Worktree 联动 |
| **底部入口** | `agent-settings` | 设置 | `G E` | **Linear / Codex Settings** | 两栏式清爽设置中心（常规与外观 / 多机 Agent 与 A2A v0.3 互联 / 编排与拓扑 / 蜂群护栏与日志 / 网关与进程），附带 Tailscale/Cloudflare/LAN 一键接入脚本 | **Wave 11 两栏重构**：侧栏底部收纳 + 多机 A2A 互联 |
| **监控与观测** | `overview` | 系统总览 | `G O` | **Grafana / Datadog / Netdata** | 全局状态一目了然（KPI 比例条 + 聚合趋势 + 依赖拓扑）、工作台面板自定义持久化 | **Wave 2 已迁移** |
| **监控与观测** | `alerts` | 告警与事件 | `G A` | **PagerDuty / Alertmanager / Sentry** | 多档维护静默窗口与倒计时进度、告警队列按状态筛选与批量 Ack、30 天 SLA 复盘 | **Wave 2 已迁移** |
| **监控与观测** | `fleet` | 全球节点 | `G F` | **Tailscale Admin / Teleport / Uptime Kuma** | 世界地图 + 每台 VPS/节点完整规格（CPU/内存/全磁盘/服务/MCP/外部 Harness）与 Pull-only 指令队列 | **Wave 3 已升级** |
| **基础设施** | `services` | 受管服务 | `G S` | **Cockpit / Portainer / Supervisor** | 多维排序 + 行内快捷重启 + 异常快速过滤 + 单元展开详情 + **内置管理后台窗口**（反向代理 NMEM / OpenViking / Symbiote / Syncthing / T3 Code 等后台） | **Wave 11 升级**：内置受管服务管理窗口 |
| **基础设施** | `plugins` | 插件与接入 | `G P` | **Grafana Plugins / Backstage / Raycast** | 官方协议（MCP / A2A / OpenAI）目录化管理、批量并发巡检与脱敏清单导出 | **Wave 2 已迁移** |
| **基础设施** | `mcp` | 全节点 MCP | `G C` | **MCP Inspector / Smithery / Teleport** | 跨设备统一纳管 MCP Server、握手拨测、工具清单检视与跨节点同步 | **Wave 3 新增固化** |
| **基础设施** | `memory` | 记忆引擎 | `G M` | **Qdrant Dashboard / Milvus Attu / LangSmith Eval** | 跨引擎召回对照实验室、快捷评测 Query 预设与重排增益对比 | **Wave 1 已迁移** |
| **基础设施** | `network` | 网络与防火墙 | `G N` | **Tailscale Admin / Metacubexd / OPNsense** | 节点搜索、直连/DERP 筛选、一键复制 IP 与防火墙暴露面收敛过滤 | **Wave 1 已迁移** |
| **运维与审计** | `logs` | 统一日志 | `G L` | **Grafana Loki / Datadog Logs / Dozzle** | 日志频次直方图 + 单元/级别快筛 + 虚拟滚动与 SSE 实时流 | **Wave 1 已迁移** |
| **运维与审计** | `ops` | 运维与审计 | `G W` | **Rundeck / Ansible AWX / Cockpit** | Runbook 执行回溯、Systemd Timer、Config Studio 校验与审计 CSV 导出 | **Wave 2 已迁移** |

---

## 三、渐进式迁移完成记录

1. **Wave 1–6（已完成）**：完成全站板块注册表固化、高频板块迁移、全球节点/全节点 MCP 管理、A2A 主从调度中心、React Flow 集群拓扑以及 DeepSeek SuperAgent 引擎与实时协作日志。
2. **Wave 7（v0.4.0 已完成）**：上线 **AI 契约与护栏（AI Ops Governance）**、四层边界 `AGENTS.md` 与 `POST /api/ai/preflight` 预检门禁。
3. **Wave 8（已完成）**：完整迁移 Linear 项目管理体系（分诊、迭代、路线图、依赖图谱、GitHub 双向同步）与多渠道自动化 Bot 体系。
4. **Wave 9–10（已完成）**：全面收敛信息密度与视觉保真度——桌面侧栏可折叠，顶层双折叠组 `Harness` + 扁平 `系统与运维`；`Agent` 首页重构为 Antigravity/Codex 极简对话输入框（历史线程归入侧栏）；`Bot` 与 `GitHub` 彻底独立拆栏；`任务看板` 还原纯粹 Linear 看板/列表 + 详情抽屉；`分配图谱` 重构为 n8n 风格全画布节点工作流。
5. **Wave 11（已完成）**：落地标准 **Google A2A v0.3** Hub/Peer 跨设备协议（含 `ops-probe` A2A Peer HTTP 服务与 Tailscale/Cloudflare/LAN 接入配置）、Agents 工作区四列拖拽生命周期看板 + 14 条 `/` 命令 + 侧栏任务检索、Orca/T3 风格 GitHub PR/Issue/CI/Worktree 联动中心、受管服务内置反向代理管理窗口（NMEM / OpenViking / Symbiote / Syncthing / T3 Code 等）、四大业务域可独立折叠侧栏以及 Linear/Codex 两栏式设置中心。


