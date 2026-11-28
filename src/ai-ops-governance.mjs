import { validateConfig } from './config.mjs';

export const MCP_TOOL_RECOMMENDED_CEILING = 40;

export const AI_SCHEDULING_PITFALLS = [
  {
    id: 'T3-01',
    project: 'T3 Code',
    repo: 'pingdotgg/t3code',
    category: 'worktree',
    severity: 'high',
    title: '动态 Worktree 绑定漂移',
    pitfall: 'Agent 在 Shell 中动态新建 Git Worktree 后，UI 线程绑定的 cwd 与 Diff 视图未同步更新，后续命令错发回旧分支。',
    mitigation: 'A2A 会话强制持久化 worktreeBranch 单一真源，Preflight 校验目标分支并阻止直接写 main/master。',
    enforcedBy: 'POST /api/ai/preflight (worktree-branch-guard)',
  },
  {
    id: 'T3-02',
    project: 'T3 Code',
    repo: 'pingdotgg/t3code',
    category: 'mcp',
    severity: 'high',
    title: '推理回合中途热改 MCP 导致误拒',
    pitfall: '回合进行中添加或重载 MCP Server 会重启 Provider，正在执行的工具被误报为 User rejected tool use。',
    mitigation: 'MCP 同步采用 Pull-only 队列，Preflight 检测存在 activeTasks 时提示在回合边界再同步。',
    enforcedBy: 'POST /api/ai/preflight (mcp-midturn-guard)',
  },
  {
    id: 'T3-03',
    project: 'T3 Code',
    repo: 'pingdotgg/t3code',
    category: 'context',
    severity: 'medium',
    title: '思维链文本回灌触发模型拒答',
    pitfall: '直接引用助手内部 reasoning 块进入下一轮 Prompt，会触发 reasoning_extraction 安全策略误拒。',
    mitigation: 'SuperAgent Inline/Spill 仅传递结构化结论与句柄引用，不回灌冗长原始思考过程。',
    enforcedBy: 'src/a2a-orchestrator.mjs (Chain of Recall)',
  },
  {
    id: 'T3-04',
    project: 'T3 Code',
    repo: 'pingdotgg/t3code',
    category: 'worktree',
    severity: 'medium',
    title: '脏主工作区新建线程失败与绝对路径越界',
    pitfall: '主仓库存在未提交改动时新建 Worktree 线程失败；硬编码绝对路径让 Agent 绕过沙箱修改主仓库。',
    mitigation: 'Preflight 拦截绝对路径与脏主分支直接派发，强制在干净 HEAD 隔离分支作业。',
    enforcedBy: 'POST /api/ai/preflight (path-sandbox-guard)',
  },
  {
    id: 'ORCA-01',
    project: 'Orca',
    repo: 'stablyai/orca',
    category: 'orchestration',
    severity: 'high',
    title: '任务卡片 / Worktree / PTY 多账本状态撕裂',
    pitfall: 'UI 完成任务后未回收底层 Git Worktree 与后台 PTY 守护进程，长期堆积僵尸进程与脏目录。',
    mitigation: '统一由控制面维护任务状态，并通过 Watchdog Sweep 巡检停滞工单与异常节点。',
    enforcedBy: 'POST /api/a2a/superagent/watchdog/sweep',
  },
  {
    id: 'ORCA-02',
    project: 'Orca',
    repo: 'stablyai/orca',
    category: 'orchestration',
    severity: 'high',
    title: 'TUI 就绪竞态吞掉首条任务指令',
    pitfall: '在底层 CLI 的 PTY 界面稳定前注入 Prompt，导致指令丢失或被错误判定为成功完成。',
    mitigation: '采用无内置 Harness 的 A2A JSON-RPC + Agent Card 探活握手，彻底摆脱脆弱 PTY 注入。',
    enforcedBy: 'POST /api/a2a/agents/:id/discover',
  },
  {
    id: 'ORCA-03',
    project: 'Orca',
    repo: 'stablyai/orca',
    category: 'orchestration',
    severity: 'medium',
    title: 'CLI 交互式更新提示静默卡死',
    pitfall: '底层编码 CLI 弹出更新或协议确认（如 update-prompt）时阻塞无头子进程，仅报不透明就绪失败。',
    mitigation: '记录各 Agent 当前版本与最新版本漂移，结合 Watchdog 及时告警并建议固定版本非交互启动。',
    enforcedBy: 'GET /api/a2a/state (updateAvailable)',
  },
  {
    id: 'ORCA-04',
    project: 'Orca',
    repo: 'stablyai/orca',
    category: 'context',
    severity: 'medium',
    title: '后台状态提醒刷屏打断主调度会话',
    pitfall: 'Worker 进度提醒直接灌入主调度器输入框，打断多步思考甚至触发误执行。',
    mitigation: '启用 SuperAgent Fast-Path 确定性代码直滤与 Attention Budget 上限，拦截噪音事件。',
    enforcedBy: 'POST /api/a2a/superagent/triggers',
  },
  {
    id: 'ALMA-01',
    project: 'Alma',
    repo: 'yetone/alma',
    category: 'security',
    severity: 'high',
    title: 'MCPhantom 废弃 npx MCP 包供应链投毒',
    pitfall: 'Agent 凭旧训练数据拉取已归档或被抢注的 npx MCP 包，结合 Prompt 注入造成本地 RCE。',
    mitigation: 'MCP 舰队仅允许核准清单与显式 envRefs；Preflight 对未登记的临时 npx -y 命令直接拦截。',
    enforcedBy: 'POST /api/ai/preflight (mcp-supply-chain-guard)',
  },
  {
    id: 'ALMA-02',
    project: 'Alma',
    repo: 'yetone/alma',
    category: 'mcp',
    severity: 'high',
    title: 'MCP 工具数膨胀 (>40) 导致选型准确率崩塌',
    pitfall: '单会话挂载 40–50+ 语义重叠的工具 Schema，导致模型频繁误选工具或传入错误参数。',
    mitigation: '控制面持续核算活跃 MCP 工具总数，超 40 个时预警并提示按 Agent 角色拆分 boundMcpIds。',
    enforcedBy: 'POST /api/ai/preflight (mcp-tool-ceiling)',
  },
  {
    id: 'ALMA-03',
    project: 'Alma',
    repo: 'yetone/alma',
    category: 'mcp',
    severity: 'medium',
    title: '动态 tools/list 描述漂移引发非预期写入',
    pitfall: '上游 MCP 工具描述在无版本锁情况下被修改，诱导模型在只读查询中执行写操作。',
    mitigation: '结合 MCP 握手快照与 readOnly / confirmToken 双层防线，阻断未授权写扩散。',
    enforcedBy: 'src/mcp-fleet.mjs + src/actions.mjs',
  },
  {
    id: 'CC-01',
    project: 'Claude Code',
    repo: 'anthropics/claude-code',
    category: 'worktree',
    severity: 'high',
    title: '未忽略 .claude/worktrees/ 导致 Gitlink 污染仓库',
    pitfall: '执行 git add -A 意外把残留 Worktree 作为嵌套 Gitlink 提交进主仓库，破坏协作历史。',
    mitigation: '.gitignore 已锁定忽略 .worktrees/ 与 .claude/worktrees/；Preflight 命中相关路径直接拦截。',
    enforcedBy: '.gitignore + POST /api/ai/preflight (gitlink-guard)',
  },
  {
    id: 'CC-02',
    project: 'Claude Code',
    repo: 'anthropics/claude-code',
    category: 'context',
    severity: 'high',
    title: '95% 自动压缩失忆与压缩后 MCP 鉴权掉落',
    pitfall: '盲目自动压缩会抹掉排除路径、精确行号与堆栈；压缩后部分 MCP 连接器看似在线却静默鉴权失败。',
    mitigation: '采用 Chain of Recall 结构化外溢保存精确句柄，并在长任务恢复前调用 MCP 握手拨测复验。',
    enforcedBy: 'POST /api/a2a/superagent/context/:id/toggle',
  },
  {
    id: 'CC-03',
    project: 'Claude Code',
    repo: 'anthropics/claude-code',
    category: 'orchestration',
    severity: 'medium',
    title: '子 Agent 工具未收口与 HTTP 529 级联过载',
    pitfall: '只读调研子 Agent 拥有 Write/Bash 权限污染主线程；日常小改叠满 Thinking 触发 529 雪崩。',
    mitigation: '通过 A2A 路由规则按任务分层分配模型、reasoningEffort 与最小 MCP 集合，高危变更再进 DSH 评审。',
    enforcedBy: 'src/a2a-orchestrator.mjs (routingRules)',
  },
  {
    id: 'CDX-01',
    project: 'Codex',
    repo: 'openai/codex',
    category: 'security',
    severity: 'high',
    title: '未信任仓库沙箱逃逸 (Heapjack / Overpatch)',
    pitfall: '恶意本地配置在工作区信任校验前借助 REPL 堆共享或越权补丁路径逃出项目根目录。',
    mitigation: '服务端所有路径走 resolveSafePath 防穿越；Preflight 阻断 .. 穿越、绝对路径与 .git/ 篡改。',
    enforcedBy: 'src/security.mjs + POST /api/ai/preflight',
  },
  {
    id: 'CDX-02',
    project: 'Codex',
    repo: 'openai/codex',
    category: 'worktree',
    severity: 'medium',
    title: '过期 Worktree 残留与死 SSHFS 挂载挂起线程',
    pitfall: '异常退出遗留过期 Worktree 需 prune；无响应远程挂载导致 Agent 线程无限期卡死。',
    mitigation: '所有外部探针/SSH 采集均带严格超时预算与单飞缓存，Watchdog 及时标红并恢复停滞任务。',
    enforcedBy: 'src/cache.mjs + src/exec.mjs',
  },
  {
    id: 'CDX-03',
    project: 'Codex',
    repo: 'openai/codex',
    category: 'governance',
    severity: 'medium',
    title: 'AGENTS.md 规则膨胀导致旧补丁被当成硬需求',
    pitfall: '长期向 AGENTS.md 追加临时规避措施，导致后续 AI 被过时规则误导改坏正常架构。',
    mitigation: '保持根 AGENTS.md 精炼四层边界表，实时状态由 GET /api/ai/context 动态下发而非写死文档。',
    enforcedBy: 'AGENTS.md + GET /api/ai/context',
  },
];

export const ARCHITECTURE_LAYERS = [
  {
    id: 'config',
    layer: 'Config',
    label: '配置与声明真源层',
    riskLevel: 'high',
    summary: '所有运行参数、白名单、版本号与部署模板的唯一真源，必须先校验后生效。',
    paths: [
      'src/config.mjs',
      'ops-console.config.example.json',
      'package.json',
      'probe/package.json',
      'Dockerfile',
      'docker-compose.yml',
      'deploy/**/*.sh',
      '.gitignore',
    ],
    rules: [
      '禁止写入真实密钥、个人邮箱、192.168.x.x 私网 IP 或个人主目录路径',
      '修改配置 JSON 前必须通过 validateConfig() 校验',
      '升级版本号必须同步全部 7 处 SemVer 校验文件并通过 node scripts/check.mjs',
    ],
  },
  {
    id: 'logic',
    layer: 'Logic',
    label: '控制面与纯逻辑引擎层',
    riskLevel: 'high',
    summary: 'HTTP API、A2A/SuperAgent 编排、AI 预检门禁、鉴权与前端纯计算逻辑。',
    paths: [
      'src/server.mjs',
      'src/a2a-orchestrator.mjs',
      'src/ai-ops-governance.mjs',
      'src/mcp-fleet.mjs',
      'src/actions.mjs',
      'src/alerts.mjs',
      'src/security.mjs',
      'src/exec.mjs',
      'web/lib/*.ts',
      'web/utils/*.ts',
    ],
    rules: [
      '严禁使用 shell 拼接执行命令，仅允许 execFile + 白名单参数数组',
      '高危服务动作必须要求一次性 confirmToken；readOnly 模式必须返回 403',
      '复杂计算下沉为无副作用纯函数，并配套 node:test 单元测试',
    ],
  },
  {
    id: 'data',
    layer: 'Data',
    label: '采集连接器与持久化数据层',
    riskLevel: 'medium',
    summary: 'SQLite/JSONL 存储、探针心跳、日志流、只读外部连接器与敏感信息脱敏。',
    paths: [
      'src/store.mjs',
      'src/timeseries.mjs',
      'src/probes.mjs',
      'src/logs.mjs',
      'src/redact.mjs',
      'src/connectors/*.mjs',
      'src/plugins/**/*.mjs',
    ],
    rules: [
      '运行时 data/ 目录严禁提交到 Git，文件权限保持 0600/0700',
      '外部探测 URL 必须走 SSRF 校验并携带严格超时与单飞缓存',
      '面向 UI/AI 的日志与配置输出必须经过 src/redact.mjs 脱敏',
    ],
  },
  {
    id: 'ui',
    layer: 'UI',
    label: '前端视图与模块化界面层',
    riskLevel: 'medium',
    summary: 'React 19 + Tailwind v4 控制面、11 大业务板块注册表、类型与 API 客户端。',
    paths: [
      'web/App.tsx',
      'web/types.ts',
      'web/api.ts',
      'web/modules/registry.ts',
      'web/views/*.tsx',
      'web/components/*.tsx',
      'web/styles.css',
    ],
    rules: [
      '遵循 DESIGN.md：Pure Zinc 90/10、无静态圆角药丸、严禁使用 transition-all',
      '新增或修改后端接口字段必须同步更新 web/types.ts 与 web/api.ts',
      '修改前端后必须清理 public/assets/*.js 并运行 npm run build 与 npm run lint',
    ],
  },
];

export const COUPLED_FILE_RULES = [
  {
    id: 'semver-sync',
    label: '版本号七端一致 (SemVer)',
    triggers: ['package.json', 'probe/package.json', 'probe/ops-probe.mjs', 'Dockerfile', 'docker-compose.yml', 'deploy/install.sh', 'deploy/probe/install-probe.sh'],
    mustSync: [
      'package.json',
      'probe/package.json',
      'probe/ops-probe.mjs',
      'Dockerfile',
      'docker-compose.yml',
      'deploy/install.sh',
      'deploy/probe/install-probe.sh',
      'CHANGELOG.md',
      'src/config.mjs',
      'src/probes.mjs',
      'web/App.tsx',
      'test/server-integration.test.mjs',
    ],
    verifyCommand: 'node scripts/check.mjs',
  },
  {
    id: 'api-contract-sync',
    label: '前后端 API 契约同步',
    triggers: ['src/server.mjs', 'src/a2a-orchestrator.mjs', 'src/ai-ops-governance.mjs', 'src/mcp-fleet.mjs'],
    mustSync: ['src/server.mjs', 'web/types.ts', 'web/api.ts'],
    verifyCommand: 'npm run lint && npm test',
  },
  {
    id: 'module-registry-sync',
    label: '导航板块注册契约同步',
    triggers: ['web/modules/registry.ts', 'web/views/'],
    mustSync: ['web/modules/registry.ts', 'web/types.ts', 'MODULES.md'],
    verifyCommand: 'npx --yes tsx --test web/modules/registry.test.ts',
  },
  {
    id: 'config-schema-sync',
    label: '配置项与脱敏规则同步',
    triggers: ['src/config.mjs', 'ops-console.config.example.json'],
    mustSync: ['src/config.mjs', 'ops-console.config.example.json', 'src/redact.mjs'],
    verifyCommand: 'node --test test/config-security.test.mjs',
  },
];

export const HARD_INVARIANTS = [
  '后端系统调用仅允许 execFile 白名单数组，禁止 shell 拼接',
  'readOnly 模式下所有变更接口强制返回 403',
  'critical 级服务操作必须提供一次性 confirmToken（缺失返回 409）',
  '禁止在代码/配置/文档中出现真实密钥、个人邮箱或未脱敏私网 IP',
  '禁止使用 Tailwind transition-all（CSS 门禁拦截 transition: all）',
  '禁止提交 .worktrees/ 或 .claude/worktrees/ 嵌套 Gitlink',
];

export const VERIFICATION_COMMANDS = [
  'rm -f public/assets/*.js && npm run build',
  'npm run lint',
  'npm test',
  'npx --yes tsx --test web/lib/*.test.ts web/modules/*.test.ts web/utils/*.test.ts',
];

const SECRET_LEAK_PATTERNS = [
  { label: 'API Key / Token 前缀', re: /\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|ops_prb_[a-f0-9]{16,})\b/ },
  { label: '私钥 PEM 块', re: /-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/ },
  { label: '硬编码敏感赋值', re: /(?:api[_-]?key|auth[_-]?token|secret|password)\s*["']?\s*[:=]\s*["'][A-Za-z0-9._-]{14,}["']/i },
];

const UNSAFE_PATH_RE = /(?:^|\/)\.\.(?:\/|$)|^\/|^[A-Za-z]:\\|^\.git(?:\/|$)|\/\.git(?:\/|$)/;
const GITLINK_WORKTREE_RE = /(?:^|\/)\.claude\/worktrees(?:\/|$)|(?:^|\/)\.worktrees(?:\/|$)/;
const PROTECTED_BRANCH_RE = /^(?:main|master|production|release)$/i;
const UNPINNED_NPX_RE = /\bnpx\s+(?:-y\s+)?(?!@modelcontextprotocol\/server-[a-z0-9-]+@[0-9])[^\s]+/i;

function cleanString(value, maxLen = 240) {
  return String(value ?? '').trim().slice(0, maxLen);
}

function normalizeFileList(files) {
  if (Array.isArray(files)) {
    return [...new Set(files.map((item) => cleanString(item, 200)).filter(Boolean))].slice(0, 40);
  }
  if (typeof files === 'string') {
    return [...new Set(files.split(/[\n,]+/).map((item) => cleanString(item, 200)).filter(Boolean))].slice(0, 40);
  }
  return [];
}

function findCoupledFiles(files) {
  const matchedRules = [];
  const syncSet = new Set();
  const verifySet = new Set();

  for (const rule of COUPLED_FILE_RULES) {
    const hit = files.some((file) =>
      rule.triggers.some((trigger) =>
        trigger.endsWith('/') ? file.startsWith(trigger) : file === trigger || file.endsWith(`/${trigger}`),
      ),
    );
    if (hit) {
      matchedRules.push(rule);
      for (const target of rule.mustSync) {
        if (!files.includes(target)) syncSet.add(target);
      }
      verifySet.add(rule.verifyCommand);
    }
  }

  return {
    matchedRules,
    missingCoupledFiles: [...syncSet],
    verifyCommands: [...verifySet],
  };
}

export function buildAiOpsContext({
  version = '0.4.0',
  config = {},
  snapshot = null,
  a2aState = null,
  mcpFleetSummary = null,
  alertsCount = 0,
} = {}) {
  const services = snapshot?.services?.items || [];
  const criticalServices = services.filter((s) => s.risk === 'critical' || s.critical).map((s) => s.id || s.unit);
  const fleetNodes = snapshot?.fleet?.nodes || [];
  const activeTools = Number(mcpFleetSummary?.totalTools ?? 0);
  const activeWorktrees = (a2aState?.sessions || [])
    .map((s) => s.gitBranch)
    .filter(Boolean);

  return {
    ok: true,
    schemaVersion: 'ops-console.ai-context/v1',
    generatedAt: new Date().toISOString(),
    version,
    mode: {
      demo: Boolean(config?.demo),
      readOnly: Boolean(config?.console?.readOnly),
      authEnabled: Boolean(config?.auth?.enabled),
    },
    liveSummary: {
      servicesTotal: services.length,
      servicesHealthy: Number(snapshot?.services?.summary?.healthy ?? 0),
      criticalServices,
      fleetNodesTotal: fleetNodes.length,
      fleetNodesOnline: Number(snapshot?.fleet?.summary?.online ?? fleetNodes.filter((n) => n.status === 'online' || n.status === 'healthy').length),
      activeAlerts: Number(alertsCount || 0),
      mcpServersTotal: Number(mcpFleetSummary?.total ?? 0),
      mcpToolsTotal: activeTools,
      mcpToolCeiling: MCP_TOOL_RECOMMENDED_CEILING,
      mcpToolCeilingExceeded: activeTools > MCP_TOOL_RECOMMENDED_CEILING,
      a2aLeadAgentId: a2aState?.leadAgentId || null,
      a2aAgentsTotal: Number(a2aState?.summary?.totalAgents ?? (a2aState?.agents?.length || 0)),
      a2aActiveTasks: Number(a2aState?.summary?.activeTasks ?? 0),
      stalledTickets: Number(a2aState?.swarmMetrics?.stalledTickets ?? 0),
      activeWorktrees,
    },
    boundaries: ARCHITECTURE_LAYERS,
    coupledRules: COUPLED_FILE_RULES,
    invariants: HARD_INVARIANTS,
    pitfalls: AI_SCHEDULING_PITFALLS,
    worktreePolicy: {
      isolatedBranchRequired: true,
      protectedBranches: ['main', 'master', 'production', 'release'],
      ignoredWorktreeDirs: ['.worktrees/', '.claude/worktrees/'],
      pruneCommand: 'git worktree prune',
    },
    verificationCommands: VERIFICATION_COMMANDS,
  };
}

export function evaluateAiPreflight(
  payload = {},
  {
    config = {},
    snapshot = null,
    a2aState = null,
    mcpFleetSummary = null,
  } = {},
) {
  const actionType = cleanString(payload.actionType || 'code-patch', 40);
  const target = cleanString(payload.target || '', 160);
  const summary = cleanString(payload.summary || '', 400);
  const worktreeBranch = cleanString(payload.worktreeBranch || '', 120);
  const command = cleanString(payload.command || '', 300);
  const rawConfigJson = typeof payload.rawConfigJson === 'string' ? payload.rawConfigJson : '';
  const files = normalizeFileList(payload.files);
  const dirtyMainCheckout = Boolean(payload.dirtyMainCheckout);
  const hasConfirmToken = Boolean(payload.confirmToken);
  const mcpToolsCount = payload.mcpToolsCount != null && Number.isFinite(Number(payload.mcpToolsCount))
    ? Number(payload.mcpToolsCount)
    : Number(mcpFleetSummary?.totalTools ?? 0);

  const checks = [];
  let blastRadius = 'low';
  const elevateBlast = (level) => {
    if (level === 'high' || (level === 'medium' && blastRadius === 'low')) {
      blastRadius = level;
    }
  };

  // 1. Read-Only control plane posture
  const isMutatingAction = actionType !== 'read-only-inspect';
  if (config?.console?.readOnly && isMutatingAction) {
    elevateBlast('high');
    checks.push({
      id: 'read-only-guard',
      status: 'block',
      title: '只读模式拦截变更操作',
      detail: '控制面当前处于 readOnly=true 只读保护模式，所有写入/控制请求将被服务端返回 403。',
      pitfallRef: 'ALMA-04',
    });
  } else {
    checks.push({
      id: 'read-only-guard',
      status: 'pass',
      title: '写权限状态校验通过',
      detail: '当前控制面允许在预检通过后执行受控变更。',
    });
  }

  // 2. Secret / PII leak inspection across summary, command, and rawConfigJson
  const inspectionText = `${summary}\n${command}\n${rawConfigJson}`;
  const secretHit = SECRET_LEAK_PATTERNS.find((entry) => entry.re.test(inspectionText));
  if (secretHit) {
    elevateBlast('high');
    checks.push({
      id: 'secret-leak-guard',
      status: 'block',
      title: `检测到疑似敏感凭据 (${secretHit.label})`,
      detail: '请立即移除明文密钥/Token，改用环境变量或 0600 权限密钥文件引用（envRefs / tokenFile）。',
      pitfallRef: 'ALMA-04',
    });
  } else {
    checks.push({
      id: 'secret-leak-guard',
      status: 'pass',
      title: '未检测到明文密钥或私钥泄漏',
      detail: '提交摘要、命令与配置片段均未命中高危密钥正则。',
    });
  }

  // 3. Path traversal, absolute path escape, and .claude/worktrees gitlink guard
  if (files.length > 0) {
    const gitlinkFiles = files.filter((file) => GITLINK_WORKTREE_RE.test(file));
    const unsafePaths = files.filter((file) => UNSAFE_PATH_RE.test(file));

    if (gitlinkFiles.length > 0) {
      elevateBlast('high');
      checks.push({
        id: 'gitlink-guard',
        status: 'block',
        title: '拦截嵌套 Worktree Gitlink 污染风险',
        detail: `检测到受禁止路径：${gitlinkFiles.join(', ')}。切勿将 .claude/worktrees/ 或 .worktrees/ 提交进仓库。`,
        pitfallRef: 'CC-01',
      });
    }

    if (unsafePaths.length > 0) {
      elevateBlast('high');
      checks.push({
        id: 'path-sandbox-guard',
        status: 'block',
        title: '拦截绝对路径或目录穿越越界写入',
        detail: `检测到不安全路径：${unsafePaths.join(', ')}。所有补丁路径必须为当前 Worktree 内的相对路径且不可篡改 .git/。`,
        pitfallRef: 'CDX-01',
      });
    }

    if (gitlinkFiles.length === 0 && unsafePaths.length === 0) {
      checks.push({
        id: 'path-sandbox-guard',
        status: 'pass',
        title: `文件路径沙箱校验通过 (${files.length} 个文件)`,
        detail: '全部目标文件均为项目相对路径，未命中 .git/ 或嵌套 worktree 目录。',
      });
    }
  }

  // 4. Worktree isolation, branch protection, and active branch collision
  if (
    actionType === 'worktree-dispatch'
    || actionType === 'code-patch'
    || actionType === 'self-evolution'
    || actionType === 'module-hot-swap'
  ) {
    if (!worktreeBranch) {
      elevateBlast('medium');
      checks.push({
        id: 'worktree-branch-guard',
        status: 'warn',
        title: '未声明隔离 Worktree 分支',
        detail: '建议显式绑定独立工作分支（如 feat/... 或 fix/...），避免与主检出工作区绑定漂移。',
        pitfallRef: 'T3-01',
      });
    } else if (PROTECTED_BRANCH_RE.test(worktreeBranch)) {
      elevateBlast('high');
      checks.push({
        id: 'worktree-branch-guard',
        status: 'block',
        title: `禁止在受保护分支「${worktreeBranch}」直接写入`,
        detail: '请创建独立 Worktree 隔离分支完成改动并跑完验证后，再由人工评审合并。',
        pitfallRef: 'T3-01',
      });
    } else {
      const existingBranches = new Set((a2aState?.sessions || []).map((s) => s.gitBranch).filter(Boolean));
      if (existingBranches.has(worktreeBranch)) {
        elevateBlast('medium');
        checks.push({
          id: 'worktree-branch-guard',
          status: 'warn',
          title: `分支「${worktreeBranch}」已被活跃会话占用`,
          detail: '多个 Agent 共用同一 Worktree 分支易造成多账本撕裂与文件覆盖，建议派生新分支。',
          pitfallRef: 'ORCA-01',
        });
      } else {
        checks.push({
          id: 'worktree-branch-guard',
          status: 'pass',
          title: `Worktree 分支「${worktreeBranch}」隔离就绪`,
          detail: '分支名符合非受保护隔离规范且未与现有活跃会话冲突。',
        });
      }
    }

    if (dirtyMainCheckout) {
      elevateBlast('medium');
      checks.push({
        id: 'dirty-checkout-guard',
        status: 'warn',
        title: '主工作区存在未提交改动',
        detail: '从脏工作区派生 Worktree 线程易触发 GitVcsDriver 异常或夹带无关变更，建议先 git stash / commit。',
        pitfallRef: 'T3-04',
      });
    }
  }

  // 5. Critical service confirmToken gate
  if (actionType === 'service-action') {
    const services = snapshot?.services?.items || [];
    const matched = services.find((s) => s.id === target || s.unit === target);
    const isCritical = Boolean(
      matched?.risk === 'critical' ||
      matched?.critical ||
      /tailscale|mihomo|firewall|ssh|postgres|sqlite|magpie/i.test(target),
    );
    if (isCritical) {
      elevateBlast('high');
      if (!hasConfirmToken) {
        checks.push({
          id: 'critical-service-confirm',
          status: 'confirm_required',
          title: `关键服务「${target || 'unknown'}」需要二次确认 Token`,
          detail: '必须先调用 POST /api/actions/confirm-token 签发一次性确认令牌，并在执行前核对回滚命令。',
          pitfallRef: 'ALMA-04',
        });
      } else {
        checks.push({
          id: 'critical-service-confirm',
          status: 'pass',
          title: `关键服务「${target}」已携带确认 Token`,
          detail: '已通过高危动作二次确认前置条件。',
        });
      }
    } else {
      elevateBlast('medium');
      checks.push({
        id: 'service-action-scope',
        status: 'pass',
        title: `标准服务控制动作 (${target || '未指定目标'})`,
        detail: '目标不在关键基础设施列表内，但仍会写入审计日志。',
      });
    }
  }

  // 6. Config JSON validation gate
  if (actionType === 'config-edit') {
    elevateBlast('high');
    if (!rawConfigJson.trim()) {
      checks.push({
        id: 'config-schema-guard',
        status: 'warn',
        title: '未提供待校验配置 JSON 原文',
        detail: '修改配置前建议传入完整 JSON，由 validateConfig() 执行字段与类型核验。',
      });
    } else {
      try {
        const parsed = JSON.parse(rawConfigJson);
        const validation = validateConfig(parsed);
        if (!validation.ok) {
          checks.push({
            id: 'config-schema-guard',
            status: 'block',
            title: `配置 Schema 校验失败 (${validation.errors.length} 处错误)`,
            detail: validation.errors.slice(0, 3).join('；'),
          });
        } else {
          checks.push({
            id: 'config-schema-guard',
            status: 'pass',
            title: '配置 Schema 校验通过',
            detail: 'JSON 结构、服务白名单及安全字段均满足 config.mjs 规范。',
          });
        }
      } catch (err) {
        checks.push({
          id: 'config-schema-guard',
          status: 'block',
          title: '配置 JSON 语法非法',
          detail: (err && err.message) || 'JSON 解析失败',
        });
      }
    }
  }

  // 7. MCP tool bloat, mid-turn mutation, and supply-chain guard
  if (actionType === 'mcp-sync' || mcpToolsCount > MCP_TOOL_RECOMMENDED_CEILING) {
    if (mcpToolsCount > MCP_TOOL_RECOMMENDED_CEILING) {
      elevateBlast('medium');
      checks.push({
        id: 'mcp-tool-ceiling',
        status: 'warn',
        title: `MCP 工具数量超推荐上限 (${mcpToolsCount} / ${MCP_TOOL_RECOMMENDED_CEILING})`,
        detail: '超过 40 个工具将显著降低 LLM 工具选型准确率并放大 Token 消耗，请按 Agent 角色分片绑定 boundMcpIds。',
        pitfallRef: 'ALMA-02',
      });
    } else if (actionType === 'mcp-sync') {
      checks.push({
        id: 'mcp-tool-ceiling',
        status: 'pass',
        title: `MCP 工具规模健康 (${mcpToolsCount} / ${MCP_TOOL_RECOMMENDED_CEILING})`,
        detail: '当前工具暴露面处于高准确率区间。',
      });
    }

    if (actionType === 'mcp-sync') {
      const activeTasks = Number(a2aState?.summary?.activeTasks ?? 0);
      if (activeTasks > 0) {
        elevateBlast('medium');
        checks.push({
          id: 'mcp-midturn-guard',
          status: 'warn',
          title: `当前存在 ${activeTasks} 个运行中 A2A 任务`,
          detail: '在推理回合中途热改 MCP 目录可能导致底层 Provider 重启并误报工具被拒，建议在回合结束后下发同步。',
          pitfallRef: 'T3-02',
        });
      }
      if (command && UNPINNED_NPX_RE.test(command)) {
        elevateBlast('high');
        checks.push({
          id: 'mcp-supply-chain-guard',
          status: 'block',
          title: '拦截未锁定版本的临时 npx MCP 包',
          detail: '严禁直接运行未固定版本号或未审查的 npx MCP 包，防范 MCPhantom 废弃包投毒风险。',
          pitfallRef: 'ALMA-01',
        });
      }
    }
  }

  // 8. Coupled-file impact analysis (prevents "改乱")
  const coupled = findCoupledFiles(files);
  if (coupled.missingCoupledFiles.length > 0) {
    elevateBlast('medium');
    checks.push({
      id: 'coupled-files-guard',
      status: 'warn',
      title: `存在 ${coupled.missingCoupledFiles.length} 个关联耦合文件待同步检查`,
      detail: `命中契约：${coupled.matchedRules.map((r) => r.label).join('、')}。请确认是否需要同步更新关联文件。`,
      pitfallRef: 'CDX-03',
    });
  }

  // 9. Watchdog / Stalled ticket health check
  const stalledTickets = Number(a2aState?.swarmMetrics?.stalledTickets ?? 0);
  if (stalledTickets > 0 && (actionType === 'worktree-dispatch' || actionType === 'service-action')) {
    checks.push({
      id: 'watchdog-health',
      status: 'warn',
      title: `当前存在 ${stalledTickets} 个停滞工单`,
      detail: '建议先运行 Watchdog 巡检清理僵尸任务，再派发新任务以防并发堆积。',
      pitfallRef: 'ORCA-01',
    });
  }

  // 10. Incremental update & hot-reload safety check
  if (
    actionType === 'incremental-update'
    || actionType === 'hot-reload'
    || actionType === 'self-evolution'
    || actionType === 'module-hot-swap'
  ) {
    if (config?.updates?.enabled === false) {
      checks.push({
        id: 'updates-disabled',
        status: 'block',
        title: '增量更新引擎已关闭',
        detail: '当前配置 updates.enabled=false，禁止执行增量拉取或热更新。',
      });
    } else if (actionType === 'module-hot-swap') {
      checks.push({
        id: 'module-hot-swap-gate',
        status: 'pass',
        title: '双槽位零停机热切预检通过',
        detail: '变更限定在可热切模块/声明式 Agent 层，将在隔离 Worktree 校验后双槽位平滑切换并保留旧槽回滚。',
      });
    } else if (actionType === 'self-evolution') {
      const touchesCore = files.some((f) => f === 'server.mjs' || (f.startsWith('src/') && !f.startsWith('src/agent-modules/') && !f.startsWith('src/modules/')) || f.startsWith('bin/'));
      checks.push({
        id: 'self-evolution-pr-gate',
        status: touchesCore ? 'confirm_required' : 'pass',
        title: touchesCore ? '自进化变更触及控制面核心，必须走 PR 合并与平滑重启' : '自进化提案符合隔离 Worktree + PR 规范',
        detail: touchesCore
          ? '沙箱验证通过后需经二次确认提交 PR，待合并后通过增量拉取与平滑重启生效。'
          : '沙箱验证通过后可发布 PR 或按分层热更新策略生效。',
      });
    } else if (actionType === 'incremental-update') {
      const touchesCore = files.some((f) => f === 'server.mjs' || f.startsWith('src/') || f.startsWith('bin/'));
      checks.push({
        id: 'incremental-update-gate',
        status: touchesCore || config?.security?.requireCriticalConfirm ? 'confirm_required' : 'pass',
        title: touchesCore ? '增量更新涉及后端核心，需确认平滑重启窗口' : '增量更新满足热生效条件',
        detail: touchesCore
          ? '拉取完成后需触发 POST /api/updates/restart 或由 supervisor 平滑重启。'
          : '仅影响前端资产/插件/声明式配置，可无停机热重载生效。',
      });
    } else {
      checks.push({
        id: 'hot-reload-ready',
        status: 'pass',
        title: '热重载预检通过',
        detail: '将按作用域增量重载配置/插件/静态资源并推送 SSE 刷新事件，无需重启进程。',
      });
    }
  }

  // Aggregate final verdict
  const hasBlock = checks.some((c) => c.status === 'block');
  const hasConfirm = checks.some((c) => c.status === 'confirm_required');
  const warnCount = checks.filter((c) => c.status === 'warn').length;

  let verdict = 'allow';
  if (hasBlock) verdict = 'block';
  else if (hasConfirm || (actionType === 'config-edit' && warnCount > 0)) verdict = 'confirm_required';

  const penalty = checks.reduce((sum, item) => {
    if (item.status === 'block') return sum + 45;
    if (item.status === 'confirm_required') return sum + 25;
    if (item.status === 'warn') return sum + 12;
    return sum;
  }, 0);
  const safetyScore = Math.max(0, 100 - penalty);

  const rollbackPlan = actionType === 'service-action'
    ? `若服务「${target || 'target'}」状态异常，立即查看 #logs 对应 Unit 日志并执行 systemctl restart / 回滚上一次配置快照。`
    : actionType === 'config-edit'
      ? '保留变更前配置备份（config.json.bak），校验失败时原子回退并重载控制面。'
      : actionType === 'mcp-sync'
        ? '在 #mcp 页面关闭或回滚目标节点的同步记录，并执行握手拨测确认剩余 MCP 可用。'
        : actionType === 'incremental-update'
          ? '若增量更新后出现异常，调用 POST /api/updates/rollback（传入更新前的 fromCommit SHA 与一次性 confirmToken）原子回滚并热重载。'
          : actionType === 'hot-reload'
            ? '热重载异常时可恢复原配置/插件文件并再次调用 POST /api/updates/reload。'
            : actionType === 'module-hot-swap'
              ? '双槽位热切失败将自动保留活跃槽位；若切换后业务异常可调用 POST /api/agents/modules/:id/rollback 毫秒级切回旧槽。'
              : actionType === 'self-evolution'
                ? `基于独立 Worktree 分支「${worktreeBranch || 'evolve/isolated'}」沙箱演进；可调用 POST /api/evolution/proposals/:id/rollback 原子回退。`
        : `基于独立 Worktree 分支「${worktreeBranch || 'feat/isolated'}」作业；若验证不通过直接 git worktree remove + git worktree prune 无损回退。`;

  const recommendedCommands = coupled.verifyCommands.length > 0
    ? [...new Set([...coupled.verifyCommands, 'npm run lint'])]
    : ['npm run lint', 'npm test'];

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    actionType,
    target: target || null,
    verdict,
    blastRadius,
    safetyScore,
    checks,
    coupledFiles: coupled.missingCoupledFiles,
    rollbackPlan,
    recommendedCommands,
  };
}
