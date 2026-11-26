import crypto from 'node:crypto';
import os from 'node:os';
import { safeEqualString } from './security.mjs';

const A2A_SPEC_VERSION = '0.3.0';
const MAX_REPLAY_SKEW_SEC = 300;
const EPHEMERAL_A2A_SECRET = crypto.randomBytes(32).toString('hex');

export function getA2ASigningSecret() {
  const envSecret = String(process.env.OPS_A2A_SHARED_SECRET || '').trim();
  return {
    secret: envSecret || EPHEMERAL_A2A_SECRET,
    configuredViaEnv: Boolean(envSecret),
  };
}

/**
 * Generates an HMAC-SHA256 signature over "<timestampSec>.<rawBody>" for
 * tamper-evident cross-device A2A JSON-RPC messaging.
 */
export function signA2APayload(rawBody, timestampSec, secret) {
  const ts = String(timestampSec);
  const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody ?? {});
  const digest = crypto
    .createHmac('sha256', String(secret))
    .update(`${ts}.${body}`)
    .digest('hex');
  return `sha256=${digest}`;
}

export function verifyA2ASignature({
  rawBody,
  signature,
  timestampSec,
  secret,
  nowSec = Math.floor(Date.now() / 1000),
  maxSkewSec = MAX_REPLAY_SKEW_SEC,
}) {
  const sig = String(signature || '').trim();
  const tsNum = Number(timestampSec);
  if (!sig || !Number.isFinite(tsNum) || tsNum <= 0) {
    return { valid: false, reason: 'Missing X-A2A-Signature or X-A2A-Timestamp header' };
  }
  if (Math.abs(nowSec - tsNum) > maxSkewSec) {
    return { valid: false, reason: `Timestamp outside allowed replay window (±${maxSkewSec}s)` };
  }
  const expected = signA2APayload(rawBody, tsNum, secret);
  if (!safeEqualString(sig, expected)) {
    return { valid: false, reason: 'Invalid HMAC-SHA256 signature' };
  }
  return { valid: true };
}

/**
 * Builds a Google A2A v0.3 spec-compliant AgentCard served at /.well-known/agent-card.json
 * without exposing any internal secrets or private filesystem paths.
 */
export function buildHubAgentCard({
  origin = 'http://localhost:3000',
  appName = 'Ops Console Hub',
  version = '0.4.0',
  agents = [],
  leadAgentId = null,
}) {
  const normalizedOrigin = String(origin || 'http://localhost:3000').replace(/\/+$/, '');
  const onlineAgents = (agents || []).filter((a) => a.status === 'healthy' || a.status === 'online');
  const lead = (agents || []).find((a) => a.id === leadAgentId) || onlineAgents[0] || null;

  const aggregatedSkills = [];
  const seenSkillIds = new Set();
  for (const agent of agents || []) {
    for (const sk of agent.skills || []) {
      const sid = String(sk.id || '').trim();
      if (!sid || seenSkillIds.has(sid)) continue;
      seenSkillIds.add(sid);
      aggregatedSkills.push({
        id: sid,
        name: String(sk.name || sid),
        description: String(sk.description || `${agent.name} skill`),
        tags: [String(agent.harness || 'agent'), String(agent.nodeId || 'hub')],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['text/plain', 'application/json'],
      });
    }
  }

  return {
    protocolVersion: A2A_SPEC_VERSION,
    name: appName,
    description:
      'Self-hostable multi-device Agent Hub implementing Google A2A (Agent2Agent) JSON-RPC 2.0 discovery, signed cross-node task delegation, and isolated Git worktree execution.',
    url: `${normalizedOrigin}/a2a`,
    version,
    provider: {
      organization: appName,
      url: normalizedOrigin,
    },
    capabilities: {
      streaming: true,
      pushNotifications: true,
      stateTransitionHistory: true,
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Per-node or operator Bearer token',
      },
      hmacSignature: {
        type: 'apiKey',
        in: 'header',
        name: 'X-A2A-Signature',
        description: 'HMAC-SHA256 over "<X-A2A-Timestamp>.<rawBody>" with ±300s replay guard',
      },
    },
    security: [{ bearerAuth: [] }, { hmacSignature: [] }],
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],
    skills: aggregatedSkills.slice(0, 32),
    metadata: {
      leadAgentId: lead?.id || null,
      leadHarness: lead?.harness || null,
      registeredAgents: (agents || []).length,
      onlineAgents: onlineAgents.length,
    },
  };
}

function mapTaskToA2AResponse(task) {
  const stateMap = {
    submitted: 'submitted',
    working: 'working',
    completed: 'completed',
    failed: 'failed',
    canceled: 'canceled',
  };
  return {
    kind: 'task',
    id: task.id,
    contextId: task.contextId || task.id,
    status: {
      state: stateMap[task.state] || 'completed',
      timestamp: task.updatedAt || task.createdAt || new Date().toISOString(),
      message: {
        kind: 'message',
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: task.artifact || task.steps?.[task.steps.length - 1]?.detail || 'Task processed',
          },
        ],
      },
    },
    artifacts: task.artifact
      ? [
          {
            artifactId: `art-${task.id}`,
            name: 'execution-summary',
            parts: [{ kind: 'text', text: task.artifact }],
          },
        ]
      : [],
    metadata: {
      leadAgentId: task.leadAgentId,
      workerAgentId: task.workerAgentId,
      workerAgentName: task.workerAgentName,
      appliedModel: task.appliedModel,
      worktreeBranch: task.worktreeBranch || null,
      durationMs: task.durationMs ?? null,
    },
  };
}

function extractTextFromA2AMessage(message) {
  if (!message || typeof message !== 'object') return '';
  if (typeof message.text === 'string' && message.text.trim()) return message.text.trim();
  if (Array.isArray(message.parts)) {
    const texts = [];
    for (const part of message.parts) {
      if (part && typeof part === 'object' && typeof part.text === 'string') {
        texts.push(part.text.trim());
      }
    }
    return texts.filter(Boolean).join('\n').trim();
  }
  return '';
}

/**
 * Handles Google A2A v0.3 JSON-RPC 2.0 requests at POST /a2a.
 */
export async function handleA2AJsonRpc({
  payload,
  orchestrator,
  card,
  readOnly = false,
  actor = 'a2a-rpc',
}) {
  const reqId = payload?.id ?? null;
  if (!payload || typeof payload !== 'object' || payload.jsonrpc !== '2.0' || typeof payload.method !== 'string') {
    return {
      status: 400,
      body: {
        jsonrpc: '2.0',
        id: reqId,
        error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' },
      },
    };
  }

  const method = payload.method;
  const params = payload.params && typeof payload.params === 'object' ? payload.params : {};

  if (method === 'agent/authenticatedExtendedCard' || method === 'agent/card') {
    return {
      status: 200,
      body: { jsonrpc: '2.0', id: reqId, result: card },
    };
  }

  if (method === 'tasks/get') {
    const taskId = String(params.id || '').trim();
    const state = orchestrator.getState([]);
    const found = (state.tasks || []).find((t) => t.id === taskId);
    if (!found) {
      return {
        status: 404,
        body: {
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32001, message: `Task not found: ${taskId}` },
        },
      };
    }
    return {
      status: 200,
      body: { jsonrpc: '2.0', id: reqId, result: mapTaskToA2AResponse(found) },
    };
  }

  if (method === 'tasks/cancel') {
    if (readOnly) {
      return {
        status: 403,
        body: {
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32003, message: 'Server is in read-only mode' },
        },
      };
    }
    const taskId = String(params.id || '').trim();
    try {
      const canceled = await orchestrator.cancelTask(taskId);
      return {
        status: 200,
        body: { jsonrpc: '2.0', id: reqId, result: mapTaskToA2AResponse(canceled) },
      };
    } catch (err) {
      return {
        status: err.statusCode || 404,
        body: {
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32001, message: err.message },
        },
      };
    }
  }

  if (method === 'message/send' || method === 'tasks/send') {
    if (readOnly) {
      return {
        status: 403,
        body: {
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32003, message: 'Server is in read-only mode' },
        },
      };
    }
    const prompt = extractTextFromA2AMessage(params.message) || String(params.prompt || '').trim();
    if (!prompt) {
      return {
        status: 400,
        body: {
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32602, message: 'Missing text part in params.message' },
        },
      };
    }
    const task = await orchestrator.dispatchTask(
      {
        prompt: prompt.slice(0, 2000),
        targetAgentId: typeof params.metadata?.targetAgentId === 'string' ? params.metadata.targetAgentId : undefined,
        contextId: typeof params.message?.contextId === 'string' ? params.message.contextId : undefined,
      },
      { actor },
    );
    return {
      status: 200,
      body: { jsonrpc: '2.0', id: reqId, result: mapTaskToA2AResponse(task) },
    };
  }

  return {
    status: 404,
    body: {
      jsonrpc: '2.0',
      id: reqId,
      error: { code: -32601, message: `Method not found: ${method}` },
    },
  };
}

export function detectLocalLanIp() {
  try {
    const nets = os.networkInterfaces();
    for (const ifaces of Object.values(nets)) {
      for (const info of ifaces || []) {
        if (!info || info.internal || info.family !== 'IPv4') continue;
        if (
          info.address.startsWith('192.168.') ||
          info.address.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(info.address)
        ) {
          return info.address;
        }
      }
    }
  } catch {
    // ignore
  }
  return '192.168.1.10';
}

function shellQuote(val) {
  return `'${String(val || '').replace(/'/g, "'\\''")}'`;
}

/**
 * Generates copy-ready, security-hardened node onboarding commands for
 * Tailscale, Cloudflare Tunnel, and Direct LAN transports.
 */
export function buildNodeConnectProfiles({
  origin = 'http://localhost:3000',
  lanIp = detectLocalLanIp(),
  tailscaleHost = 'ops-hub.tailnet.ts.net',
  cloudflareDomain = 'ops-hub.example.com',
  nodeId = 'edge-node-01',
  token = 'REPLACE_WITH_ENROLLED_TOKEN',
  deviceType = 'server',
}) {
  const safeNodeId = String(nodeId || 'edge-node-01').replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 48) || 'edge-node-01';
  const safeDeviceType = ['hub', 'server', 'edge', 'laptop', 'mobile'].includes(deviceType) ? deviceType : 'server';
  const port = (() => {
    try {
      const u = new URL(origin);
      return u.port || (u.protocol === 'https:' ? '443' : '3000');
    } catch {
      return '3000';
    }
  })();

  const tsUrl = `https://${String(tailscaleHost || 'ops-hub.tailnet.ts.net').replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  const cfUrl = `https://${String(cloudflareDomain || 'ops-hub.example.com').replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  const lanUrl = `http://${lanIp}:${port}`;

  return [
    {
      id: 'tailscale',
      name: 'Tailscale 组网',
      recommended: true,
      badge: '推荐 · 跨网点对点 WireGuard',
      hubUrl: tsUrl,
      securitySummary: '零公网端口暴露 + WireGuard 端到端加密 + Tailscale CIDR 白名单 + 每节点独立 Bearer 令牌',
      whenToUse: '多台云服务器 / 家里 Mac / 办公室设备跨公网互联，免公网 IP 与防火墙配置。',
      hubPrepCmd: `tailscale serve --bg https / http://127.0.0.1:${port}`,
      linuxInstallCmd: `printf '%s' ${shellQuote(token)} | sudo ./deploy/probe/install-probe.sh --hub-url ${shellQuote(tsUrl)} --node-id ${shellQuote(safeNodeId)} --device-type ${shellQuote(safeDeviceType)} --token-file -`,
      macosInstallCmd: `printf '%s' ${shellQuote(token)} | ./deploy/probe/install-probe.sh --hub-url ${shellQuote(tsUrl)} --node-id ${shellQuote(safeNodeId)} --device-type laptop --token-file -`,
      dockerCmd: `docker run -d --name ops-probe --restart unless-stopped -e OPS_PROBE_TOKEN=${shellQuote(token)} ghcr.io/ops-console/ops-probe:latest --hub-url ${shellQuote(tsUrl)} --node-id ${shellQuote(safeNodeId)}`,
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Tunnel',
      recommended: false,
      badge: '公网零开放端口 · Zero Trust',
      hubUrl: cfUrl,
      securitySummary: '仅出站连接 + TLS 1.3 + Cloudflare Access Service Token + A2A HMAC-SHA256 请求签名',
      whenToUse: '目标服务器受限无法装 Tailscale、或位于严格 NAT/企业内网，仅允许 443 出站。',
      hubPrepCmd: `cloudflared tunnel route dns ops-hub ${String(cloudflareDomain || 'ops-hub.example.com').replace(/^https?:\/\//, '')} && cloudflared tunnel run --url http://127.0.0.1:${port} ops-hub`,
      linuxInstallCmd: `printf '%s' ${shellQuote(token)} | sudo ./deploy/probe/install-probe.sh --hub-url ${shellQuote(cfUrl)} --node-id ${shellQuote(safeNodeId)} --device-type ${shellQuote(safeDeviceType)} --token-file -`,
      macosInstallCmd: `printf '%s' ${shellQuote(token)} | ./deploy/probe/install-probe.sh --hub-url ${shellQuote(cfUrl)} --node-id ${shellQuote(safeNodeId)} --device-type laptop --token-file -`,
      dockerCmd: `docker run -d --name ops-probe --restart unless-stopped -e OPS_PROBE_TOKEN=${shellQuote(token)} ghcr.io/ops-console/ops-probe:latest --hub-url ${shellQuote(cfUrl)} --node-id ${shellQuote(safeNodeId)}`,
    },
    {
      id: 'lan',
      name: '局域网直连 (LAN)',
      recommended: false,
      badge: '内网极速 · 零中转延迟',
      hubUrl: lanUrl,
      securitySummary: '仅限 RFC1918 私网 + 强制每节点 Bearer 令牌 + A2A HMAC-SHA256 防重放签名 (±300s)',
      whenToUse: '同机房 VPC 内网服务器、或家中 Mac Studio / NAS / 开发机在同一局域网直连。',
      hubPrepCmd: `# 确保控制面监听私网地址并配置 HMAC 密钥\nexport OPS_A2A_SHARED_SECRET="$(openssl rand -hex 32)"`,
      linuxInstallCmd: `printf '%s' ${shellQuote(token)} | sudo ./deploy/probe/install-probe.sh --hub-url ${shellQuote(lanUrl)} --node-id ${shellQuote(safeNodeId)} --device-type ${shellQuote(safeDeviceType)} --token-file -`,
      macosInstallCmd: `printf '%s' ${shellQuote(token)} | ./deploy/probe/install-probe.sh --hub-url ${shellQuote(lanUrl)} --node-id ${shellQuote(safeNodeId)} --device-type laptop --token-file -`,
      dockerCmd: `docker run -d --name ops-probe --restart unless-stopped -e OPS_PROBE_TOKEN=${shellQuote(token)} ghcr.io/ops-console/ops-probe:latest --hub-url ${shellQuote(lanUrl)} --node-id ${shellQuote(safeNodeId)}`,
    },
  ];
}
