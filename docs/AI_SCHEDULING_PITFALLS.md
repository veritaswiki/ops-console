# X / GitHub 热门 AI 调度项目踩坑记录与 Ops Console v0.4.0 架构防线

本文档系统复盘 **T3 Code**、**Orca**、**Alma (MCP Providers)**、**Claude Code** 与 **OpenAI Codex CLI / Desktop** 在 2025–2026 公开更新日志、GitHub Issue 与社区实战中暴露的核心踩坑点，并记录 **Ops Console v0.4.0** 对应的内置工程防线。

---

## 1. T3 Code (`pingdotgg/t3code`)

T3 Code 主打面向 Codex / Claude Code 的极简桌面编排 GUI 与多 Worktree 线程工作流，但在多会话、热配置与上下文引用上暴露了多类经典边界问题：

| 踩坑编号 | 问题现象与根因 | Ops Console v0.4.0 应对防线 |
| :--- | :--- | :--- |
| **T3-01** | **Worktree 绑定漂移**：Agent 在 Shell 内动态创建新 Git Worktree 时，GUI 线程绑定的 `cwd`、Diff 视图与状态栏不会自动跟随，导致后续指令错打回旧分支。 | A2A 会话与工单强制记录 `worktreeBranch` / `worktreePath` 单一真源；`POST /api/ai/preflight` 校验分支冲突并拦截裸 `main`/`master` 直改。 |
| **T3-02** | **回合中途 MCP 热变更中断**：在 Agent 推理 Turn 进行中添加/重载 MCP Server 会触发底层 Provider 重启，把正在执行的工具调用误报为 `User rejected tool use`。 | `mcp-sync` 走 Pull-only 队列 + 预检门禁检查当前是否存在运行中任务（`activeTasks > 0` 时发出警告，建议回合边界再同步）。 |
| **T3-03** | **Reasoning Block 二次注入拒答**：将助手内部思考块（Reasoning）文本原样引用回下一轮 Prompt，容易触发模型侧 `reasoning_extraction` 安全策略拒答。 | SuperAgent 采用 **Inline / Spill (Chain of Recall)** 仅传递结构化决策摘要与引用句柄，避免将原始冗长思维链反复灌入下游 Prompt。 |
| **T3-04** | **脏主工作区创建线程失败**：本地存在未提交改动时从“当前 Checkout”新建线程，底层 `GitVcsDriver` 报错模糊且容易污染主分支。 | Preflight `worktree-dispatch` 检查项显式核验 `dirtyMainCheckout` 状态，强制要求先提交/Stash 或基于干净 `HEAD` 创建隔离 Worktree。 |
| **T3-05** | **绝对路径越界与默认遥测争议**：默认外发遥测引发隐私反弹；Agent 使用绝对路径绕过 Worktree 沙箱直接修改主仓库文件。 | 控制面默认零外部遥测、全本地脱敏审计；`AGENTS.md` + Preflight 明确禁止绝对路径越界写入主检出目录。 |

---

## 2. Orca (`stablyai/orca` / Agent Orchestrator)

Orca 致力于用多并行 Worktree + PTY Daemon 编排多个编码 Agent，实战中踩中了分布式控制面最典型的“多账本分裂”与终端竞态坑：

| 踩坑编号 | 问题现象与根因 | Ops Console v0.4.0 应对防线 |
| :--- | :--- | :--- |
| **ORCA-01** | **多账本状态撕裂（Multi-Ledger Drift）**：任务卡片、Git Worktree、后台 PTY 进程分属不同存储账本；UI 标记完成后残留孤儿 Worktree 与僵尸终端进程。 | 控制面以 `a2a-orchestrator` + `store` 统一任务生命周期，并结合外部 **Watchdog Sweep** 自动巡检卡滞与孤儿工单。 |
| **ORCA-02** | **TUI 就绪竞态（Premature Prompt Injection）**：在 Worker CLI 的 PTY/TUI 尚未初始化稳定前就注入任务指令，导致首条指令被吞或误判为成功结束。 | Ops Console 坚持 **Harness-Free A2A JSON-RPC + Agent Card 探活**，先验证 `/discover` 协议握手与健康度，不依赖脆弱的 PTY 屏幕刮取注入。 |
| **ORCA-03** | **底层 CLI 升级/条款弹窗静默卡死**：如 `codex-update-prompt` 类交互式更新提示阻塞子进程，只向上抛出不透明的 `agent_readiness` 失败。 | Agent 目录内置版本漂移观测（`version` vs `latestVersion`）与 Watchdog 停滞告警，并在 Preflight 提示非交互/固定版本运行。 |
| **ORCA-04** | **编排提醒刷屏打断主会话**：后台 Worker 的状态轮询提醒直接注入主调度器输入栏，打断正在进行的上下文并触发误操作命令。 | 引入 **SuperAgent Attention Budget（注意力预算上限）** 与 **Fast-Path 确定性代码直滤**，把心跳与噪音事件在到达 LLM 前静默消化。 |
| **ORCA-05** | **脱离编排协议即兴跑 Shell**：主 Agent 未加载对应版本的编排 Skill，直接执行原生命令启动无法被控制面追踪的野终端（`consumer_fenced` 异常）。 | 统一 Skill 版本目录与路由规则校验，所有派发动作沉淀到可追踪的 `A2ACollaborationLog` SSE 日志流与审计日志。 |

---

## 3. Alma (`yetone/alma` / MCP Provider 生态)

Alma 与主流多 Provider / MCP 客户端在接入大量外部 MCP 工具与个人 Workspace 时，集中暴露了工具膨胀与供应链投毒问题：

| 踩坑编号 | 问题现象与根因 | Ops Console v0.4.0 应对防线 |
| :--- | :--- | :--- |
| **ALMA-01** | **“MCPhantom” 废弃包供应链风险**：Agent 凭陈旧训练记忆推荐早已归档或被抢注的 `npx` MCP 包，结合 Prompt 注入可直接形成本地 RCE。 | `mcp-fleet` 统一纳管核准的 MCP 清单与 `envRefs`；Preflight 拦截未登记/临时 `npx -y` 不可信命令来源。 |
| **ALMA-02** | **MCP 工具数过载（>40~50 工具）**：单个会话挂载过多语义重叠的 MCP 工具，导致模型工具选择准确率断崖式下降与静默错参。 | `GET /api/ai/context` 与 `POST /api/ai/preflight` 内置 **40 工具上限护栏**：超出阈值自动预警并建议按 Agent 角色分片绑定 `boundMcpIds`。 |
| **ALMA-03** | **工具描述漂移（Description Drift）**：上游 MCP Server 的 `tools/list` 描述在无锁文件情况下静默变更，可能诱导模型偏离预期写操作。 | 全节点 MCP 面板记录 `toolsCount` 与协议握手快照，变更同步前要求走预检并审阅暴露工具面。 |
| **ALMA-04** | **宽泛终端/仓库权限授权**：一次性授予全局 GitHub/Shell 写权限后，读取外部 Issue 或 README 中的恶意文本即可触发越权推送。 | 后端强制 `readOnly` 开关、高危服务一次性 `confirmToken` 与 `execFile` 参数白名单，严禁通配符 Shell 放行。 |

---

## 4. Claude Code (Anthropic, 2025–2026)

Claude Code 在高频工程自治中演进出了 Worktree、Subagent、Compaction 与 Hooks 机制，同时社区也踩出了最细致的上下文与仓库污染坑：

| 踩坑编号 | 问题现象与根因 | Ops Console v0.4.0 应对防线 |
| :--- | :--- | :--- |
| **CC-01** | **未忽略 `.claude/worktrees/` 导致 Gitlink 污染**：执行 `git add -A` 时将残留子 Worktree 当作嵌套 Git Submodule/Gitlink 提交进主仓库，破坏协作历史。 | `.gitignore` 显式忽略 `.worktrees/` 与 `.claude/worktrees/`；Preflight 对命中此类路径的补丁直接返回 `block`。 |
| **CC-02** | **自动压缩失忆（Lossy Auto-Compaction）**：接近 95% 上下文触发自动压缩后，容易丢失“为何放弃某方案”、精确文件路径与报错堆栈。 | SuperAgent 面板内置 **Inline / Spill (Chain of Recall)** 结构化外溢节点，按需精准回溯句柄，不靠盲目摘要抹除关键诊断证据。 |
| **CC-03** | **压缩后 MCP 鉴权静默失效**：上下文压缩完成后部分 MCP 连接器看似在线却在调用时静默鉴权失败，必须重新握手。 | MCP 舰队支持一键协议握手拨测（`POST /api/mcps/:id/test`），长会话恢复前可自动复验可达性。 |
| **CC-04** | **子 Agent 上下文污染与缺省工具收口**：只读调研型子 Agent 误配 `Write`/`Bash` 或未隔离上下文，导致主线程 Token 爆炸。 | A2A 路由规则按任务类别绑定最小 `boundMcpIds` 与独立 `reasoningEffort`，主子模型明确分层。 |
| **CC-05** | **Hook 退出码与 HTTP 529 级联过载**：生命周期 Hook 未消费 `stdin` 或返回非 `0/2` 码造成误拦截；常规小改叠满 Thinking + 庞大 MCP 目录引发 529 雪崩。 | 常规改动默认路由轻量模型/低思考强度，高风险架构变更再触发 `high`/`xhigh` 与 DSH 专家评审门禁。 |

---

## 5. OpenAI Codex CLI & Desktop App (2025–2026)

Codex CLI 与桌面版在沙箱隔离、跨端审批与 `AGENTS.md` 契约体系上引领了标准，同时也暴露了信任边界与陈旧文档反噬问题：

| 踩坑编号 | 问题现象与根因 | Ops Console v0.4.0 应对防线 |
| :--- | :--- | :--- |
| **CDX-01** | **未信任仓库沙箱逃逸（*Heapjack* / *Overpatch*, 2026-09）**：恶意本地仓库配置在工作区信任校验完成前利用共享 REPL 堆或 `apply_patch` 越权路径逃逸。 | `src/security.mjs` 强制 `resolveSafePath` 根目录防穿越；Preflight 拦截包含 `..`、绝对路径或 `.git/` 篡改的补丁清单。 |
| **CDX-02** | **僵尸 Worktree 与死 SSHFS 挂载卡死**：Daemon 异常退出遗留过期 Worktree（需 `git worktree prune`），无响应网络挂载点让线程无限期挂起。 | Watchdog 定时巡检停滞工单并自动回收；所有外部探测均设严格超时预算与单飞缓存（`SingleFlightCache`），永不拖死主循环。 |
| **CDX-03** | **`AGENTS.md` 膨胀与规则漂移**：不断堆砌临时补丁说明导致 `AGENTS.md` 冗长矛盾，AI 把过期临时方案当成永久硬约束。 | 根目录 `AGENTS.md` 保持精简四层表结构，与运行时真源 `GET /api/ai/context` 联动，避免手工复制过时状态。 |
| **CDX-04** | **并发审批拥堵与未固定 CLI 版本**：多 Agent 并行弹出审批队列阻塞吞吐；CI 中未锁定 `@openai/codex` 版本导致参数废弃直接构建失败。 | 引入 `confirm_required` 分级审批（仅高危/关键服务需 Token），并在版本管理中显式追踪各 Harness 版本与升级差异。 |

---

## 总结：从“自由改代码”升级为“契约驱动 + 预检门禁”

Ops Console **v0.4.0** 将上述 5 大项目的实战教训直接沉淀为三件套：
1. **静态契约**：`/AGENTS.md`（清晰拆分 `Logic / Data / Config / UI` 与耦合文件清单）。
2. **动态上下文**：`GET /api/ai/context`（实时聚合系统状态、四层边界与防线规则，供任意 AI 一键读取）。
3. **变更预检门禁**：`POST /api/ai/preflight`（在真正修改服务、配置、代码或 Worktree 之前，确定性输出 `allow / confirm_required / block` 判定、耦合文件提醒与回滚路径）。
