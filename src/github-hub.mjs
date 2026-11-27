import { execFile } from 'node:child_process';
import path from 'node:path';
import { PACKAGE_ROOT } from './config.mjs';
import { redactText } from './redact.mjs';

const CMD_TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 15_000;
const MAX_CMD_BUFFER = 2 * 1024 * 1024;

const VALID_DISPATCH_KINDS = new Set(['pr', 'issue', 'ci']);
const VALID_DISPATCH_ACTIONS = new Set(['review', 'fix-ci', 'implement', 'triage']);

function runSafeCmd(command, args = [], { cwd = PACKAGE_ROOT, timeout = CMD_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { cwd, timeout, maxBuffer: MAX_CMD_BUFFER, windowsHide: true },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          errorCode: error && typeof error.code === 'string' ? error.code : null,
          message: error ? redactText(String(error.message || '')) : null,
        });
      },
    );
  });
}

export function parseGithubRemoteUrl(rawUrl) {
  const text = String(rawUrl || '').trim();
  if (!text) return null;

  const sshMatch = text.match(/^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    const host = sshMatch[1];
    const owner = sshMatch[2];
    const name = sshMatch[3];
    return {
      owner,
      name,
      fullName: `${owner}/${name}`,
      remoteUrl: `git@${host}:${owner}/${name}.git`,
      webUrl: `https://${host}/${owner}/${name}`,
    };
  }

  try {
    const parsed = new URL(text);
    const parts = parsed.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '').split('/');
    if (parts.length >= 2) {
      const owner = parts[0];
      const name = parts[1];
      const cleanHost = parsed.host;
      return {
        owner,
        name,
        fullName: `${owner}/${name}`,
        remoteUrl: `${parsed.protocol}//${cleanHost}/${owner}/${name}.git`,
        webUrl: `https://${cleanHost}/${owner}/${name}`,
      };
    }
  } catch {
    // Not a standard URL
  }
  return null;
}

export function parseGitWorktreePorcelain(stdout) {
  const blocks = String(stdout || '').trim().split(/\n\n+/).filter(Boolean);
  const items = [];
  for (let idx = 0; idx < blocks.length; idx += 1) {
    const lines = blocks[idx].split('\n');
    let wtPath = '';
    let head = '';
    let branch = 'detached';
    let bare = false;
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        wtPath = line.slice('worktree '.length).trim();
      } else if (line.startsWith('HEAD ')) {
        head = line.slice('HEAD '.length).trim().slice(0, 12);
      } else if (line.startsWith('branch ')) {
        branch = line.slice('branch '.length).trim().replace(/^refs\/heads\//, '');
      } else if (line.trim() === 'bare') {
        bare = true;
      }
    }
    if (wtPath) {
      items.push({
        path: redactText(wtPath),
        branch,
        head,
        isMain: idx === 0,
        bare,
      });
    }
  }
  return items;
}

export function summarizeChecksRollup(rollup) {
  if (!Array.isArray(rollup) || rollup.length === 0) {
    return { checksStatus: 'UNKNOWN', checksSummary: 'No checks' };
  }
  let passed = 0;
  let failed = 0;
  let pending = 0;
  for (const item of rollup) {
    if (!item || typeof item !== 'object') continue;
    const conclusion = String(item.conclusion || '').toUpperCase();
    const status = String(item.status || '').toUpperCase();
    const state = String(item.state || '').toUpperCase();

    if (
      conclusion === 'FAILURE'
      || conclusion === 'TIMED_OUT'
      || conclusion === 'CANCELLED'
      || conclusion === 'ACTION_REQUIRED'
      || conclusion === 'STARTUP_FAILURE'
      || state === 'FAILURE'
      || state === 'ERROR'
    ) {
      failed += 1;
    } else if (
      status === 'IN_PROGRESS'
      || status === 'QUEUED'
      || status === 'PENDING'
      || status === 'WAITING'
      || state === 'PENDING'
      || (!conclusion && status && status !== 'COMPLETED')
    ) {
      pending += 1;
    } else if (
      conclusion === 'SUCCESS'
      || conclusion === 'NEUTRAL'
      || conclusion === 'SKIPPED'
      || state === 'SUCCESS'
    ) {
      passed += 1;
    } else {
      pending += 1;
    }
  }
  const total = passed + failed + pending;
  if (total === 0) {
    return { checksStatus: 'UNKNOWN', checksSummary: 'No checks' };
  }
  if (failed > 0) {
    return { checksStatus: 'FAILURE', checksSummary: `${failed} failed / ${total} checks` };
  }
  if (pending > 0) {
    return { checksStatus: 'PENDING', checksSummary: `${pending} pending / ${total} checks` };
  }
  return { checksStatus: 'SUCCESS', checksSummary: `${passed}/${total} passed` };
}

function mapPullRequest(raw) {
  const rollup = summarizeChecksRollup(raw?.statusCheckRollup);
  const labels = Array.isArray(raw?.labels)
    ? raw.labels.map((lbl) => (typeof lbl === 'string' ? lbl : String(lbl?.name || ''))).filter(Boolean)
    : [];
  return {
    number: Number(raw?.number || 0),
    title: redactText(String(raw?.title || '')).slice(0, 200),
    state: String(raw?.state || 'OPEN').toUpperCase(),
    isDraft: Boolean(raw?.isDraft),
    headRefName: String(raw?.headRefName || ''),
    baseRefName: String(raw?.baseRefName || 'main'),
    author: typeof raw?.author === 'string'
      ? raw.author
      : String(raw?.author?.login || raw?.author?.name || 'unknown'),
    updatedAt: String(raw?.updatedAt || new Date().toISOString()),
    url: String(raw?.url || ''),
    additions: Number.isFinite(Number(raw?.additions)) ? Number(raw.additions) : 0,
    deletions: Number.isFinite(Number(raw?.deletions)) ? Number(raw.deletions) : 0,
    changedFiles: Number.isFinite(Number(raw?.changedFiles)) ? Number(raw.changedFiles) : 0,
    reviewDecision: raw?.reviewDecision ? String(raw.reviewDecision) : null,
    checksStatus: rollup.checksStatus,
    checksSummary: rollup.checksSummary,
    labels,
  };
}

function mapIssue(raw) {
  const labels = Array.isArray(raw?.labels)
    ? raw.labels.map((lbl) => (typeof lbl === 'string' ? lbl : String(lbl?.name || ''))).filter(Boolean)
    : [];
  const assignees = Array.isArray(raw?.assignees)
    ? raw.assignees.map((asg) => (typeof asg === 'string' ? asg : String(asg?.login || ''))).filter(Boolean)
    : [];
  const commentsCount = Array.isArray(raw?.comments)
    ? raw.comments.length
    : Number(raw?.commentsCount || 0);
  return {
    number: Number(raw?.number || 0),
    title: redactText(String(raw?.title || '')).slice(0, 200),
    state: String(raw?.state || 'OPEN').toUpperCase(),
    author: typeof raw?.author === 'string'
      ? raw.author
      : String(raw?.author?.login || raw?.author?.name || 'unknown'),
    updatedAt: String(raw?.updatedAt || new Date().toISOString()),
    url: String(raw?.url || ''),
    labels,
    assignees,
    commentsCount,
  };
}

function mapWorkflowRun(raw) {
  return {
    id: raw?.databaseId ?? raw?.id ?? '',
    name: redactText(String(raw?.name || 'Workflow')).slice(0, 120),
    displayTitle: redactText(String(raw?.displayTitle || raw?.name || '')).slice(0, 180),
    status: String(raw?.status || 'completed'),
    conclusion: raw?.conclusion ? String(raw.conclusion) : null,
    headBranch: String(raw?.headBranch || 'main'),
    event: String(raw?.event || 'push'),
    createdAt: String(raw?.createdAt || new Date().toISOString()),
    url: String(raw?.url || ''),
  };
}

function computeSummary(pullRequests, issues, workflowRuns, worktrees) {
  const openPrs = pullRequests.filter((pr) => pr.state === 'OPEN').length;
  const draftPrs = pullRequests.filter((pr) => pr.state === 'OPEN' && pr.isDraft).length;
  const openIssues = issues.filter((iss) => iss.state === 'OPEN').length;
  const failingPrChecks = pullRequests.filter((pr) => pr.state === 'OPEN' && pr.checksStatus === 'FAILURE').length;
  const failingRuns = workflowRuns.filter(
    (run) => String(run.conclusion || '').toLowerCase() === 'failure',
  ).length;
  return {
    openPrs,
    draftPrs,
    openIssues,
    failingChecks: Math.max(failingPrChecks, failingRuns),
    worktreeCount: worktrees.length,
  };
}

export class GithubHub {
  constructor({ config, linearCommander = null, logger = null, repoDir = PACKAGE_ROOT } = {}) {
    this.config = config;
    this.linearCommander = linearCommander;
    this.logger = logger;
    this.repoDir = repoDir;
    this._cache = null;
  }

  _getConfiguredRepoFallback() {
    const ghCfg = this.linearCommander?.state?.githubConfig || {};
    const owner = String(ghCfg.owner || 'example-org').trim() || 'example-org';
    const name = String(ghCfg.repo || path.basename(this.repoDir) || 'ops-console').trim() || 'ops-console';
    const defaultBranch = String(ghCfg.defaultBranch || 'main').trim() || 'main';
    return {
      owner,
      name,
      fullName: `${owner}/${name}`,
      defaultBranch,
      currentBranch: defaultBranch,
      remoteUrl: `https://github.com/${owner}/${name}.git`,
      webUrl: `https://github.com/${owner}/${name}`,
    };
  }

  _buildDemoOverview() {
    const now = Date.now();
    const repo = this._getConfiguredRepoFallback();
    const webBase = repo.webUrl || `https://github.com/${repo.fullName}`;
    const pullRequests = [
      {
        number: 142,
        title: 'feat(a2a): signed Google A2A v0.3 peer discovery & embedded service proxy',
        state: 'OPEN',
        isDraft: false,
        headRefName: 'feat/agent-workspace-a2a-v04',
        baseRefName: repo.defaultBranch,
        author: 'ops-user',
        updatedAt: new Date(now - 14 * 60_000).toISOString(),
        url: `${webBase}/pull/142`,
        additions: 648,
        deletions: 84,
        changedFiles: 12,
        reviewDecision: 'REVIEW_REQUIRED',
        checksStatus: 'SUCCESS',
        checksSummary: '4/4 passed',
        labels: ['a2a', 'backend', 'security'],
      },
      {
        number: 139,
        title: 'fix(probe): enforce HMAC-SHA256 replay guard on remote A2A peer RPC',
        state: 'OPEN',
        isDraft: false,
        headRefName: 'fix/probe-a2a-hmac',
        baseRefName: repo.defaultBranch,
        author: 'maintainer',
        updatedAt: new Date(now - 52 * 60_000).toISOString(),
        url: `${webBase}/pull/139`,
        additions: 215,
        deletions: 31,
        changedFiles: 4,
        reviewDecision: 'CHANGES_REQUESTED',
        checksStatus: 'FAILURE',
        checksSummary: '1 failed / 4 checks',
        labels: ['probe', 'ci'],
      },
      {
        number: 145,
        title: 'wip(ui): add Orca-style worktree branch switcher in workspace header',
        state: 'OPEN',
        isDraft: true,
        headRefName: 'feat/ui-worktree-switcher',
        baseRefName: repo.defaultBranch,
        author: 'ops-user',
        updatedAt: new Date(now - 4 * 60_000).toISOString(),
        url: `${webBase}/pull/145`,
        additions: 142,
        deletions: 19,
        changedFiles: 5,
        reviewDecision: null,
        checksStatus: 'PENDING',
        checksSummary: '1 pending / 3 checks',
        labels: ['ui', 'draft'],
      },
    ];

    const issues = [
      {
        number: 208,
        title: 'Support one-click embedded admin UI reverse proxy for NMEM and OpenViking Studio',
        state: 'OPEN',
        author: 'ops-user',
        updatedAt: new Date(now - 35 * 60_000).toISOString(),
        url: `${webBase}/issues/208`,
        labels: ['enhancement', 'proxy'],
        assignees: ['ops-user'],
        commentsCount: 4,
      },
      {
        number: 211,
        title: 'Add Tailscale A2A peer onboarding snippets for Linux/macOS/Docker',
        state: 'OPEN',
        author: 'maintainer',
        updatedAt: new Date(now - 90 * 60_000).toISOString(),
        url: `${webBase}/issues/211`,
        labels: ['a2a', 'docs'],
        assignees: ['maintainer'],
        commentsCount: 2,
      },
    ];

    const workflowRuns = [
      {
        id: 882401,
        name: 'CI / Test & Privacy Gate',
        displayTitle: 'feat(a2a): signed Google A2A v0.3 peer discovery & embedded service proxy',
        status: 'completed',
        conclusion: 'success',
        headBranch: 'feat/agent-workspace-a2a-v04',
        event: 'pull_request',
        createdAt: new Date(now - 12 * 60_000).toISOString(),
        url: `${webBase}/actions/runs/882401`,
      },
      {
        id: 882394,
        name: 'CI / Probe Integration',
        displayTitle: 'fix(probe): enforce HMAC-SHA256 replay guard on remote A2A peer RPC',
        status: 'completed',
        conclusion: 'failure',
        headBranch: 'fix/probe-a2a-hmac',
        event: 'pull_request',
        createdAt: new Date(now - 48 * 60_000).toISOString(),
        url: `${webBase}/actions/runs/882394`,
      },
      {
        id: 882410,
        name: 'CI / Web Typecheck & Build',
        displayTitle: 'wip(ui): add Orca-style worktree branch switcher in workspace header',
        status: 'in_progress',
        conclusion: null,
        headBranch: 'feat/ui-worktree-switcher',
        event: 'push',
        createdAt: new Date(now - 2 * 60_000).toISOString(),
        url: `${webBase}/actions/runs/882410`,
      },
    ];

    const worktrees = [
      {
        path: '/srv/workspaces/ops-console',
        branch: 'feat/agent-workspace-a2a-v04',
        head: 'a1b2c3d4',
        isMain: true,
        bare: false,
      },
      {
        path: '/srv/workspaces/ops-console/.worktrees/fix-probe-hmac',
        branch: 'fix/probe-a2a-hmac',
        head: 'e5f6a7b8',
        isMain: false,
        bare: false,
      },
    ];

    return {
      ok: true,
      mode: 'demo',
      ghAvailable: true,
      ghAuthenticated: true,
      ghAccount: 'ops-user',
      repo: {
        ...repo,
        currentBranch: 'feat/agent-workspace-a2a-v04',
      },
      summary: computeSummary(pullRequests, issues, workflowRuns, worktrees),
      pullRequests,
      issues,
      workflowRuns,
      worktrees,
      fetchedAt: new Date(now).toISOString(),
      warning: null,
    };
  }

  async _inspectLocalGit() {
    const fallback = this._getConfiguredRepoFallback();
    const [branchRes, remoteRes, worktreeRes] = await Promise.all([
      runSafeCmd('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: this.repoDir }),
      runSafeCmd('git', ['remote', 'get-url', 'origin'], { cwd: this.repoDir }),
      runSafeCmd('git', ['worktree', 'list', '--porcelain'], { cwd: this.repoDir }),
    ]);

    const currentBranch = branchRes.ok && branchRes.stdout.trim()
      ? branchRes.stdout.trim()
      : fallback.currentBranch;
    const parsedRemote = remoteRes.ok ? parseGithubRemoteUrl(remoteRes.stdout.trim()) : null;
    const worktrees = worktreeRes.ok ? parseGitWorktreePorcelain(worktreeRes.stdout) : [];

    return {
      repo: {
        owner: parsedRemote?.owner || fallback.owner,
        name: parsedRemote?.name || fallback.name,
        fullName: parsedRemote?.fullName || fallback.fullName,
        defaultBranch: fallback.defaultBranch,
        currentBranch,
        remoteUrl: parsedRemote?.remoteUrl || fallback.remoteUrl,
        webUrl: parsedRemote?.webUrl || fallback.webUrl,
      },
      worktrees,
    };
  }

  async _checkGhAuth() {
    const res = await runSafeCmd('gh', ['auth', 'status'], { cwd: this.repoDir });
    if (res.errorCode === 'ENOENT') {
      return { available: false, authenticated: false, account: null, warning: 'gh CLI is not installed on this host' };
    }
    const combined = redactText(`${res.stdout}\n${res.stderr}`);
    const acctMatch = combined.match(/Logged in to [^\s]+ account ([A-Za-z0-9._-]+)/i)
      || combined.match(/account\s+([A-Za-z0-9._-]+)\s+\(/i);
    if (res.ok) {
      return {
        available: true,
        authenticated: true,
        account: acctMatch ? acctMatch[1] : null,
        warning: null,
      };
    }
    return {
      available: true,
      authenticated: false,
      account: null,
      warning: 'gh CLI is installed but not authenticated; run "gh auth login" to enable live PR/CI sync.',
    };
  }

  _buildLinearFallbackIssues(repo) {
    const rawIssues = Array.isArray(this.linearCommander?.state?.issues)
      ? this.linearCommander.state.issues
      : [];
    const webBase = repo.webUrl || `https://github.com/${repo.fullName}`;
    return rawIssues.slice(0, 12).map((item, idx) => ({
      number: Number(item?.github?.issueNumber || idx + 1),
      title: redactText(String(item?.title || item?.identifier || 'Issue')).slice(0, 200),
      state: item?.status === 'done' || item?.status === 'canceled' ? 'CLOSED' : 'OPEN',
      author: String(item?.assigneeName || 'ops-user'),
      updatedAt: String(item?.updatedAt || item?.createdAt || new Date().toISOString()),
      url: String(item?.github?.issueUrl || `${webBase}/issues`),
      labels: Array.isArray(item?.labels) ? item.labels.map(String) : [],
      assignees: item?.assigneeName ? [String(item.assigneeName)] : [],
      commentsCount: 0,
    }));
  }

  async getOverview({ force = false } = {}) {
    if (!force && this._cache && this._cache.expiresAt > Date.now()) {
      return this._cache.data;
    }

    if (this.config?.demo) {
      const demoData = this._buildDemoOverview();
      this._cache = { data: demoData, expiresAt: Date.now() + CACHE_TTL_MS };
      return demoData;
    }

    const [{ repo, worktrees }, ghAuth] = await Promise.all([
      this._inspectLocalGit(),
      this._checkGhAuth(),
    ]);

    if (!ghAuth.available || !ghAuth.authenticated) {
      const fallbackIssues = this._buildLinearFallbackIssues(repo);
      const offlineData = {
        ok: true,
        mode: 'offline',
        ghAvailable: ghAuth.available,
        ghAuthenticated: false,
        ghAccount: null,
        repo,
        summary: computeSummary([], fallbackIssues, [], worktrees),
        pullRequests: [],
        issues: fallbackIssues,
        workflowRuns: [],
        worktrees,
        fetchedAt: new Date().toISOString(),
        warning: ghAuth.warning,
      };
      this._cache = { data: offlineData, expiresAt: Date.now() + CACHE_TTL_MS };
      return offlineData;
    }

    const prFields = 'number,title,state,isDraft,headRefName,baseRefName,author,updatedAt,url,additions,deletions,changedFiles,reviewDecision,statusCheckRollup,labels';
    const issueFields = 'number,title,state,author,updatedAt,url,labels,assignees,comments';
    const runFields = 'databaseId,name,displayTitle,status,conclusion,headBranch,event,createdAt,url';

    const [prRes, issueRes, runRes] = await Promise.all([
      runSafeCmd('gh', ['pr', 'list', '--limit', '20', '--json', prFields], { cwd: this.repoDir }),
      runSafeCmd('gh', ['issue', 'list', '--limit', '20', '--json', issueFields], { cwd: this.repoDir }),
      runSafeCmd('gh', ['run', 'list', '--limit', '12', '--json', runFields], { cwd: this.repoDir }),
    ]);

    const warnings = [];
    const parseJsonList = (res, label) => {
      if (!res.ok) {
        warnings.push(`${label}: ${redactText((res.stderr || res.message || 'gh command failed').trim()).slice(0, 120)}`);
        return [];
      }
      try {
        const parsed = JSON.parse(res.stdout || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        warnings.push(`${label}: invalid JSON output`);
        return [];
      }
    };

    const pullRequests = parseJsonList(prRes, 'PRs').map(mapPullRequest);
    const issues = parseJsonList(issueRes, 'Issues').map(mapIssue);
    const workflowRuns = parseJsonList(runRes, 'Actions').map(mapWorkflowRun);

    const result = {
      ok: true,
      mode: 'gh-cli',
      ghAvailable: true,
      ghAuthenticated: true,
      ghAccount: ghAuth.account,
      repo,
      summary: computeSummary(pullRequests, issues, workflowRuns, worktrees),
      pullRequests,
      issues,
      workflowRuns,
      worktrees,
      fetchedAt: new Date().toISOString(),
      warning: warnings.length > 0 ? warnings.join(' · ') : null,
    };

    this._cache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };
    return result;
  }

  buildDispatchPayload(input = {}) {
    const kind = VALID_DISPATCH_KINDS.has(String(input.kind || '').toLowerCase())
      ? String(input.kind).toLowerCase()
      : 'issue';
    const title = redactText(String(input.title || '').trim()).slice(0, 220);
    if (!title) {
      const err = new Error('GitHub dispatch title is required');
      err.statusCode = 400;
      throw err;
    }
    const defaultAction = kind === 'pr' ? 'review' : (kind === 'ci' ? 'fix-ci' : 'implement');
    const action = VALID_DISPATCH_ACTIONS.has(String(input.action || '').toLowerCase())
      ? String(input.action).toLowerCase()
      : defaultAction;
    const number = Number.isFinite(Number(input.number)) && Number(input.number) > 0
      ? Math.floor(Number(input.number))
      : null;
    const branch = input.branch ? redactText(String(input.branch).trim()).slice(0, 96) : '';
    const url = input.url ? redactText(String(input.url).trim()).slice(0, 260) : '';

    const targetLabel = kind === 'pr'
      ? `PR${number ? ` #${number}` : ''}`
      : kind === 'ci'
        ? `CI Run${number ? ` #${number}` : ''}`
        : `Issue${number ? ` #${number}` : ''}`;

    const actionDirective = {
      review: '请执行深度代码评审：检查架构边界、安全风险（无 shell 注入 / SSRF / PII）、边界条件与回归测试覆盖，输出明确修改建议。',
      'fix-ci': '请定位 CI 失败根因，在独立 Git Worktree 中最小化修复代码并补全单测，验证 build / lint / test 全绿。',
      implement: '请先梳理影响文件与契约，在隔离 Git Worktree 中完成实现并补充自动化测试与验证报告。',
      triage: '请完成问题分诊：复现路径分析、影响范围评估、优先级建议与拆分子任务计划。',
    }[action];

    const promptParts = [
      `[GitHub ${targetLabel} · ${action}] ${title}`,
      branch ? `分支: ${branch}` : '',
      url ? `链接: ${url}` : '',
      actionDirective,
    ].filter(Boolean);

    return {
      prompt: promptParts.join('\n'),
      targetAgentId: typeof input.targetAgentId === 'string' && input.targetAgentId.trim()
        ? input.targetAgentId.trim()
        : 'auto',
      executionMode: action === 'implement' || action === 'fix-ci' ? 'worktree' : 'lead-router',
      worktreeBranch: branch || undefined,
      slashCommand: `/${action}`,
      requiredSkill: action === 'review' ? 'review' : undefined,
    };
  }
}
