# Ops Console 模块化架构与同类标杆迁移蓝图

本文档固化 Ops Console 的 **3 大业务域 × 10 个独立板块** 契约（对应源码真源 `web/modules/registry.ts`），系统梳理各板块同类标杆项目的核心优点，并明确分阶段迁移清单。

---

## 一、板块固化规范（Module Contract）

所有界面功能按职责收口到 3 个业务域、10 个解耦板块中，通过 `CONSOLE_MODULES` 注册表统一声明：

- **强契约元数据**：`id`、`domain`（`observe | infra | operate`）、`label`、`shortDesc`、`chord`（Linear 风格 `G + 键` 导航和弦）、`keywords`（命令面板检索）、`dataDeps`（按需数据依赖声明 `snapshot | probes | ops`）、`badgeKey`、`loader`（按需代码分割与悬停预加载）。
- **故障隔离边界**：每个板块由 `<ModuleBoundary>` 独立包裹，单板块异常不会导致整个控制面崩溃，并支持局部一键恢复。
- **可分享深度链接**：统一接入 URL Hash 路由（如 `#services`、`#logs`、`#network`），支持刷新保活与浏览器前进/后退。

---

## 二、十大板块梳理与同类标杆优点分析

| 域 | 板块 ID | 板块名称 | 快捷键 | 同类标杆项目 | 核心标杆优点拆解 | 迁移状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **观测域** | `overview` | 系统总览 | `G O` | **Grafana / Datadog / Netdata** | 全局状态一目了然（KPI 比例条 + 聚合趋势 + 依赖拓扑）、最小点击跳达详情、工作台面板自定义持久化 | **Wave 2 已迁移**：持久化自定义面板显示偏好 + 自适应栅格 + 全局 `G+键` / Hash 路由 |
| **观测域** | `alerts` | 告警与事件 | `G A` | **PagerDuty / Alertmanager / Sentry** | 多档维护静默窗口与倒计时进度、告警队列按状态筛选与批量 Ack、规则搜索与状态快筛、30 天 SLA 与复盘闭环 | **Wave 2 已迁移**：多档静默倒计时条 + 队列筛选与批量确认 + 规则库搜索/状态快筛 |
| **观测域** | `fleet` | 全球节点 | `G F` | **Tailscale Admin / Teleport / Uptime Kuma** | 世界地图 + 节点侧栏下钻、多节点状态/CPU/内存/RTT 排序对比矩阵、延迟可视化色条、点击 IP 复制与 Pull-only 指令队列 | **Wave 2 已迁移**：多节点排序对比矩阵 + RTT 延迟色条 + 节点检索 + IP 一键复制 |
| **基础设施域** | `services` | 受管服务 | `G S` | **Cockpit / Portainer / Supervisor** | 列头按状态/延迟/内存一键排序、高频动作（重启/日志）行内直达无需二次下拉、单元依赖/端口展开详情、异常置顶筛选 | **Wave 1 已迁移**：多维度排序 + 行内快捷重启 + 异常快速过滤 + 单元展开详情 |
| **基础设施域** | `plugins` | 插件与接入 | `G P` | **Grafana Plugins / Backstage / Raycast** | 官方协议（MCP / A2A / OpenAI）目录化管理、全量已启用插件并发批量巡检、脱敏清单 JSON 导出、状态/协议双维过滤 | **Wave 2 已迁移**：批量并发协议巡检 + 脱敏清单 JSON 导出 + 运行状态快筛 |
| **基础设施域** | `memory` | 记忆引擎 | `G M` | **Qdrant Dashboard / Milvus Attu / LangSmith Eval** | 跨引擎召回对照实验室、快捷评测 Query 预设、重排增益量化对比、评测结果 JSON 一键导出 | **Wave 1 已迁移**：快捷评测 Query 预设按钮 + 对比结果一键复制 JSON |
| **基础设施域** | `agents` | 网关与 Agent | `G G` | **Langfuse / LiteLLM Proxy / Helicone** | 24h 成本与预算水位、Provider 成本占比直觉可视化、熔断器状态、进程表按 CPU/内存排序与命令行检索 | **Wave 1 已迁移**：Provider 成本占比条 + 进程表 CPU/内存排序与关键词检索 |
| **基础设施域** | `network` | 网络与防火墙 | `G N` | **Tailscale Admin / Metacubexd / OPNsense** | 节点搜索、直连/DERP 中继筛选、点击 IP 一键复制、防火墙非回环暴露端口一键收敛过滤 | **Wave 1 已迁移**：Tailscale 搜索与路径筛选 + 点击 IP 一键复制 + 防火墙暴露面过滤 |
| **运维域** | `logs` | 统一日志 | `G L` | **Grafana Loki / Datadog Logs / Dozzle** | 顶部按时间桶分色的日志频次直方图（一眼定位报错峰值）、点击 Unit/级别快速 Facet 过滤、悬停单行一键复制、虚拟滚动与 SSE 实时流 | **Wave 1 已迁移**：日志频次分布直方图 + 单元/级别点击快筛 + 单行一键复制 |
| **运维域** | `ops` | 运维与审计 | `G W` | **Rundeck / Ansible AWX / Cockpit** | 标准化 Runbook 执行与历史逐步回溯、Systemd Timer 管理、Config Studio 校验、多维审计过滤与 CSV 导出 | **Wave 2 已迁移**：审计多维过滤与 RFC-4180 CSV 导出 + Runbook 历史逐步回溯 |

---

## 三、渐进式迁移完成记录

1. **Wave 1（已完成）**：完成全站 10 板块注册表固化（`web/modules/registry.ts` + `ModuleBoundary` + `ModuleFrame`）、URL Hash 深度路由与 `G+键` 键盘和弦；同步将 **Services / Logs / Network / Agents / Memory** 五大高频板块的标杆能力完整迁移落地。
2. **Wave 2（已完成）**：完成全部剩余五大板块（**Alerts / Fleet / Plugins / Ops / Overview**）的 `<ModuleFrame>` 契约统一与同类标杆能力迁移，并抽离纯函数模块 `web/lib/module-helpers.ts` 配套单元测试，至此 **3 大业务域 × 10 个独立板块 100% 完成固化与标杆迁移**。
