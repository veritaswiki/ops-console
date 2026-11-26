# AGENTS.md — Ops Console AI 协作与安全变更契约 (v0.4.0)

> 面向 **Codex / Claude Code / T3 Code / Orca / Alma** 及所有外部 AI Agent 的最小精确操作手册。
> 保持本文件精炼、去重、无历史过期规则（遵循 Codex `AGENTS.md` 防膨胀原则）。

---

## 1. 四层边界地图（Logic / Data / Config / UI）

修改代码前先定位所属层，**禁止跨层写副作用**或绕过真源模块：

| 层级 | 目录与核心文件 | 职责边界 | AI 修改守则 |
| :--- | :--- | :--- | :--- |
| **Config（配置与声明真源）** | `src/config.mjs`, `ops-console.config.example.json`, `package.json`, `probe/package.json`, `Dockerfile`, `docker-compose.yml`, `deploy/**/*.sh`, `.gitignore` | 运行参数、环境变量映射、安全白名单、版本号、部署清单 | 所有配置先经 `validateConfig()`；绝不写入真实密钥/个人域名/私网 IP；修改版本必须同步 7 处 SemVer 文件。 |
| **Logic（控制面与纯逻辑引擎）** | `src/server.mjs`, `src/a2a-orchestrator.mjs`, `src/linear-commander.mjs`, `src/bot-fleet.mjs`, `src/ai-ops-governance.mjs`, `src/mcp-fleet.mjs`, `src/actions.mjs`, `src/alerts.mjs`, `src/security.mjs`, `src/exec.mjs`, `src/redact.mjs`, `web/lib/*.ts`, `web/utils/*.ts` | HTTP API、A2A/SuperAgent 调度、Linear 总指挥编排、Bot 体系、AI 变更预检、安全鉴权、纯函数计算 | 禁止 `exec`/`sh -c`（仅用 `execFile`）；修改状态前先跑 `POST /api/ai/preflight`；纯逻辑下沉至 `web/lib/*.ts` 并配 `*.test.ts`。 |
| **Data（采集与持久化状态）** | `src/store.mjs`, `src/timeseries.mjs`, `src/probes.mjs`, `src/logs.mjs`, `src/connectors/*.mjs`, `src/plugins/**/*.mjs`, `data/*`（gitignored） | SQLite/JSONL 持久化、探针心跳、只读连接器采集、日志流、脱敏输出 | `data/` 目录禁止入库；文件权限强制 `0600`/`0700`；外部 URL 必须过 SSRF 内网校验；日志与配置输出必须经 `src/redact.mjs`。 |
| **UI（前端视图与模块壳）** | `web/App.tsx`, `web/types.ts`, `web/api.ts`, `web/modules/registry.ts`, `web/views/*.tsx`, `web/components/*.tsx`, `web/styles.css` | React 19 + Tailwind v4 控制面 UI、12 大模块化板块 | 遵循 `DESIGN.md`（Pure Zinc 90/10、无静态圆角药丸、禁用 `transition-all`）；修改前端后必须清理 `public/assets/*.js` 并执行 `npm run build`。 |

---

## 2. 强耦合文件矩阵（改 A 必须同步 B，防改乱）

| 触发修改的文件 / 领域 | 必须同步检查与更新的文件 | 自动化校验 |
| :--- | :--- | :--- |
| **版本号升级 (SemVer)** | `package.json`, `probe/package.json`, `probe/ops-probe.mjs`, `Dockerfile`, `docker-compose.yml`, `deploy/install.sh`, `deploy/probe/install-probe.sh`, `CHANGELOG.md`, `src/config.mjs`, `src/probes.mjs`, `web/App.tsx`, `test/server-integration.test.mjs` | `node scripts/check.mjs` |
| **后端 API 响应/请求结构** | `src/server.mjs` ↔ `web/types.ts` ↔ `web/api.ts` ↔ 对应 `web/views/*.tsx` / `web/components/*.tsx` | `npm run lint` (`tsc --noEmit`) |
| **A2A / SuperAgent / Governance 引擎** | `src/a2a-orchestrator.mjs` / `src/ai-ops-governance.mjs` ↔ `src/server.mjs` ↔ `web/types.ts` ↔ `web/api.ts` ↔ `web/views/AgentsView.tsx` | `npm test` + `tsx --test` |
| **新增或调整导航板块** | `web/modules/registry.ts` ↔ `web/types.ts` (`ViewId`) ↔ `web/views/*View.tsx` ↔ `MODULES.md` | `npx --yes tsx --test web/modules/registry.test.ts` |
| **新增配置项或环境变量** | `src/config.mjs` ↔ `ops-console.config.example.json` ↔ `src/redact.mjs`（若含敏感字段） | `node --test test/config-security.test.mjs` |

---

## 3. 硬性安全与工程红线（不可违反）

1. **零 Shell 注入**：后端执行系统命令一律使用 `execFile` + 白名单参数数组，禁止 `exec` / 拼接 shell 字符串。
2. **只读与高危双确认**：`readOnly: true` 必须对所有变更路由返回 `403`；高危服务变更必须校验一次性 `confirmToken`（缺失返回 `409`）。
3. **Worktree 与 Git 安全（吸取 T3 Code / Claude Code / Codex 踩坑教训）**：
   - 多 Agent 并行改动优先使用独立 Git Worktree，严禁硬编码绝对路径回写主仓库。
   - `.worktrees/` 与 `.claude/worktrees/` 已加入 `.gitignore`，禁止 `git add -A` 提交未清理的嵌套 worktree gitlink。
4. **MCP 工具上限与契约固定（吸取 Alma / Claude Code 教训）**：
   - 单个调度上下文挂载的活跃 MCP 工具总数建议 `<= 40`；禁止在推理回合中途热增删 MCP Server；禁止未经人工审查运行废弃 `npx` MCP 包。
5. **UI 与隐私门禁**：
   - 禁用 Tailwind `transition-all`（`scripts/check.mjs` 会拦截 `transition: all`）。
   - 严禁在代码、测试或文档中写入真实邮箱、私网 IP、Token、个人主目录路径（仅限 `example.com`、`100.64.x.x`、占位符）。

---

## 4. AI 辅助运维标准闭环

1. **先读上下文**：调用 `GET /api/ai/context` 获取压缩版控制面健康摘要、四层边界与当前活跃陷阱防线。
2. **变更前预检**：在执行服务控制、配置修改、Worktree 派发、代码补丁或 MCP 同步前，调用 `POST /api/ai/preflight` 获取风险评估（`allow | confirm_required | block`）、影响耦合文件清单与回滚方案。
3. **改后四步验证**（缺一不可）：
   ```bash
   rm -f public/assets/*.js && npm run build
   npm run lint
   npm test
   npx --yes tsx --test web/lib/*.test.ts web/modules/*.test.ts web/utils/*.test.ts
   ```
