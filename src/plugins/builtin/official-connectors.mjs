import { collectFirewall } from '../../connectors/firewall.mjs';
import { collectMagpie } from '../../connectors/gateway-magpie.mjs';
import { collectNmem, doctorNmem, searchNmem } from '../../connectors/memory-nmem.mjs';
import { collectOpenViking, doctorOpenViking, searchOpenViking } from '../../connectors/memory-openviking.mjs';
import { collectRerank } from '../../connectors/memory-rerank.mjs';
import { collectSymbiote } from '../../connectors/memory-symbiote.mjs';
import { collectMihomo } from '../../connectors/network-mihomo.mjs';
import { collectTailscale } from '../../connectors/network-tailscale.mjs';
import { collectSyncthing } from '../../connectors/service-syncthing.mjs';
import { definePlugin } from '../sdk.mjs';

export const magpiePlugin = definePlugin({
  id: 'gateway-magpie',
  name: 'Magpie Gateway',
  version: '1.0.0',
  category: 'gateway',
  slot: 'gateway',
  legacyKey: 'magpie',
  description: '通过官方 OpenAI 兼容 /v1/models 端点与 magpie CLI (ls / library) 采集模型路由目录、运行中桥接与 MCP 库状态。',
  officialSpec: {
    protocol: 'OpenAI /v1/models + magpie CLI (ls, library)',
    docsUrl: 'https://platform.openai.com/docs/api-reference/models',
    endpoints: ['GET /v1/models', 'CLI: magpie ls', 'CLI: magpie library'],
    auth: '本地回环或 MAGPIE_ADDR 环境变量',
  },
  capabilities: ['health', 'inventory', 'models', 'mcp'],
  configSchema: [
    { key: 'apiUrl', label: 'API 地址', type: 'url', default: 'http://127.0.0.1:3426', placeholder: 'http://127.0.0.1:3426' },
    { key: 'webUrl', label: '控制台地址 (可选)', type: 'url', default: '', placeholder: 'http://127.0.0.1:3430' },
    { key: 'cliBin', label: 'CLI 命令名', type: 'cli', default: 'magpie', placeholder: 'magpie' },
    { key: 'addr', label: 'MAGPIE_ADDR', type: 'string', default: '127.0.0.1:3426', placeholder: '127.0.0.1:3426' },
  ],
  defaultConfig: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:3426',
    webUrl: '',
    cliBin: 'magpie',
    configHome: '',
    addr: '127.0.0.1:3426',
  },
  agentMatchers: [
    { category: 'gateway', label: 'Model Gateway', pattern: '(^|/)magpie(\\s|$)|magpie-.*bridge' },
  ],
  collect: (cfg, ctx) => collectMagpie(cfg, { awaitCli: Boolean(ctx?.awaitCli) }),
  testConnection: (cfg) => collectMagpie({ ...cfg, enabled: true }, { awaitCli: true }),
  summarize: (d) => (!d?.enabled ? '未启用' : d.reachable ? `${d.totalModels ?? 0} 模型 · ${d.providers?.length ?? 0} 渠道` : d.error || '不可达'),
});

export const nmemPlugin = definePlugin({
  id: 'memory-nmem',
  name: 'Nowledge Mem',
  version: '1.0.0',
  category: 'memory',
  slot: 'memory',
  legacyKey: 'nmem',
  description: '遵循官方 REST /health 与 nmem --json CLI 规范（status / stats / spaces list / m search / doctor）接入跨工具长期记忆图谱。',
  officialSpec: {
    protocol: 'Nowledge Mem REST (/health) + nmem --json CLI',
    docsUrl: 'https://docs.nowledge.co',
    endpoints: ['GET /health', 'CLI: nmem --json status', 'CLI: nmem --json stats', 'CLI: nmem --json m search', 'CLI: nmem --json doctor'],
    auth: '本地回环监听',
  },
  capabilities: ['health', 'inventory', 'search', 'doctor'],
  configSchema: [
    { key: 'apiUrl', label: '服务地址', type: 'url', default: 'http://127.0.0.1:14242', placeholder: 'http://127.0.0.1:14242' },
    { key: 'cliBin', label: 'CLI 命令名', type: 'cli', default: 'nmem', placeholder: 'nmem' },
  ],
  defaultConfig: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:14242',
    cliBin: 'nmem',
  },
  agentMatchers: [
    { category: 'memory', label: 'Memory Engine', pattern: 'nmem-server' },
  ],
  collect: (cfg) => collectNmem(cfg),
  testConnection: (cfg) => collectNmem({ ...cfg, enabled: true }),
  search: (cfg, query, limit) => searchNmem(cfg, query, limit),
  doctor: (cfg) => doctorNmem(cfg),
  summarize: (d) => (!d?.enabled ? '未启用' : d.reachable ? `${d.stats?.memories ?? 0} 记忆 · ${d.spaces?.length ?? 0} 空间` : d.error || '不可达'),
});

export const openVikingPlugin = definePlugin({
  id: 'memory-openviking',
  name: 'OpenViking',
  version: '1.0.0',
  category: 'memory',
  slot: 'memory',
  legacyKey: 'openviking',
  description: '遵循官方 OpenViking HTTP (/health, /ready) 与 ov -o json CLI 规范采集向量库、处理队列、技能表并支持语义检索。',
  officialSpec: {
    protocol: 'OpenViking HTTP (/health, /ready) + ov -o json CLI',
    docsUrl: 'https://github.com/volcengine/OpenViking',
    endpoints: ['GET /health', 'GET /ready', 'CLI: ov -o json status', 'CLI: ov -o json find', 'CLI: ov -o json skills list'],
    auth: '本地回环或服务端 auth_mode',
  },
  capabilities: ['health', 'inventory', 'search', 'doctor'],
  configSchema: [
    { key: 'apiUrl', label: '服务地址', type: 'url', default: 'http://127.0.0.1:1933', placeholder: 'http://127.0.0.1:1933' },
    { key: 'cliBin', label: 'CLI 命令名', type: 'cli', default: 'ov', placeholder: 'ov' },
  ],
  defaultConfig: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:1933',
    cliBin: 'ov',
  },
  agentMatchers: [
    { category: 'memory', label: 'Memory Engine', pattern: 'openviking' },
  ],
  collect: (cfg) => collectOpenViking(cfg),
  testConnection: (cfg) => collectOpenViking({ ...cfg, enabled: true }),
  search: (cfg, query, limit) => searchOpenViking(cfg, query, limit),
  doctor: (cfg) => doctorOpenViking(cfg),
  summarize: (d) => (!d?.enabled ? '未启用' : d.reachable ? `向量 ${d.vikingdb?.vectorCount ?? 0} · 技能 ${d.skillsCount ?? 0}` : d.error || '不可达'),
});

export const symbiotePlugin = definePlugin({
  id: 'memory-symbiote',
  name: 'Symbiote Workbench',
  version: '1.0.0',
  category: 'memory',
  slot: 'memory',
  legacyKey: 'symbiote',
  description: '遵循官方 HTTP /api/health 接口探测知识工作台存活性、Vault 文档计数、镜像一致性与数据库健康状态。',
  officialSpec: {
    protocol: 'HTTP REST (GET /api/health)',
    docsUrl: 'https://datatracker.ietf.org/doc/html/rfc9110',
    endpoints: ['GET /api/health'],
    auth: '本地回环监听',
  },
  capabilities: ['health', 'inventory'],
  configSchema: [
    { key: 'apiUrl', label: '服务地址', type: 'url', default: 'http://127.0.0.1:4318', placeholder: 'http://127.0.0.1:4318' },
  ],
  defaultConfig: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:4318',
  },
  collect: (cfg) => collectSymbiote(cfg),
  testConnection: (cfg) => collectSymbiote({ ...cfg, enabled: true }),
  summarize: (d) => (!d?.enabled ? '未启用' : d.reachable ? `Vault ${d.vaultFileCount ?? 0} 文档` : d.error || '不可达'),
});

export const rerankPlugin = definePlugin({
  id: 'memory-rerank',
  name: 'Rerank Gateway (TEI / Jina / Cohere 兼容)',
  version: '1.0.0',
  category: 'memory',
  slot: 'memory',
  legacyKey: 'rerank',
  description: '探测本地或远程神经重排网关 (/health)，支持 HuggingFace TEI、Infinity、bge-reranker 等标准重排服务。',
  officialSpec: {
    protocol: 'TEI / Rerank HTTP (GET /health, POST /rerank)',
    docsUrl: 'https://huggingface.github.io/text-embeddings-inference/',
    endpoints: ['GET /health', 'POST /rerank'],
    auth: '可选本地回环监听',
  },
  capabilities: ['health'],
  configSchema: [
    { key: 'apiUrl', label: '重排网关地址', type: 'url', default: 'http://127.0.0.1:8893', placeholder: 'http://127.0.0.1:8893' },
  ],
  defaultConfig: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:8893',
  },
  collect: (cfg) => collectRerank(cfg),
  testConnection: (cfg) => collectRerank({ ...cfg, enabled: true }),
  summarize: (d) => (!d?.enabled ? '未启用' : d.reachable ? (d.model || 'Ready') : d.error || '不可达'),
});

export const tailscalePlugin = definePlugin({
  id: 'network-tailscale',
  name: 'Tailscale Mesh',
  version: '1.0.0',
  category: 'network',
  slot: 'network',
  legacyKey: 'tailscale',
  description: '通过官方 tailscale status --json 与 tailscale serve status --json 结构化命令监控私有 Mesh 节点、DERP 中继与 HTTPS Serve 入口。',
  officialSpec: {
    protocol: 'Official Tailscale CLI (--json)',
    docsUrl: 'https://tailscale.com/kb/1080/cli',
    endpoints: ['CLI: tailscale status --json', 'CLI: tailscale serve status --json'],
    auth: '本机 Tailscale 守护进程套接字',
  },
  capabilities: ['health', 'inventory', 'network'],
  configSchema: [
    { key: 'cliBin', label: 'CLI 命令名', type: 'cli', default: 'tailscale', placeholder: 'tailscale' },
  ],
  defaultConfig: {
    enabled: true,
    cliBin: 'tailscale',
  },
  collect: (cfg) => collectTailscale(cfg),
  testConnection: (cfg) => collectTailscale({ ...cfg, enabled: true }),
  summarize: (d) => (!d?.enabled ? '未启用' : d.reachable ? `${d.onlineCount ?? 0}/${d.devices?.length ?? 0} 设备在线` : d.error || '不可达'),
});

export const mihomoPlugin = definePlugin({
  id: 'network-mihomo',
  name: 'Mihomo Proxy Controller',
  version: '1.0.0',
  category: 'network',
  slot: 'network',
  legacyKey: 'mihomo',
  description: '遵循官方 Mihomo (Clash Meta) External Controller REST API (/version, /connections, /proxies) 实时采集策略组与活跃连接。',
  officialSpec: {
    protocol: 'Official Mihomo External Controller REST API',
    docsUrl: 'https://wiki.metacubex.one/api/',
    endpoints: ['GET /version', 'GET /connections', 'GET /proxies'],
    auth: 'Authorization: Bearer <secret> (支持 env:// / file://)',
  },
  capabilities: ['health', 'inventory', 'network'],
  configSchema: [
    { key: 'apiUrl', label: 'Controller 地址', type: 'url', default: 'http://127.0.0.1:19090', placeholder: 'http://127.0.0.1:19090' },
    { key: 'secret', label: 'Controller Secret (可选)', type: 'secret', default: '', placeholder: 'env://MIHOMO_API_SECRET' },
  ],
  defaultConfig: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:19090',
    secret: '',
  },
  collect: (cfg) => collectMihomo(cfg),
  testConnection: (cfg) => collectMihomo({ ...cfg, enabled: true }),
  summarize: (d) => (!d?.enabled ? '未启用' : d.reachable ? `${d.activeConnections ?? 0} 活跃连接` : d.error || '不可达'),
});

export const syncthingPlugin = definePlugin({
  id: 'service-syncthing',
  name: 'Syncthing File Sync',
  version: '1.0.0',
  category: 'infra',
  slot: 'network',
  legacyKey: 'syncthing',
  description: '遵循官方 Syncthing REST API (/rest/noauth/health 与 /rest/system/status) 监控点对点文件同步状态与设备 ID。',
  officialSpec: {
    protocol: 'Official Syncthing REST API',
    docsUrl: 'https://docs.syncthing.net/dev/rest.html',
    endpoints: ['GET /rest/noauth/health', 'GET /rest/system/status'],
    auth: '可选 X-API-Key Header (支持 env:// / file://)',
  },
  capabilities: ['health', 'inventory'],
  configSchema: [
    { key: 'apiUrl', label: 'Web GUI / REST 地址', type: 'url', default: 'http://127.0.0.1:8384', placeholder: 'http://127.0.0.1:8384' },
    { key: 'apiKey', label: 'X-API-Key (可选)', type: 'secret', default: '', placeholder: 'env://SYNCTHING_API_KEY' },
  ],
  defaultConfig: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:8384',
    apiKey: '',
  },
  collect: (cfg) => collectSyncthing(cfg),
  testConnection: (cfg) => collectSyncthing({ ...cfg, enabled: true }),
  summarize: (d) => (!d?.enabled ? '未启用' : d.reachable ? 'REST 健康检查通过' : d.error || '不可达'),
});

export const firewallPlugin = definePlugin({
  id: 'security-firewall',
  name: 'Linux Firewall & Listening Sockets',
  version: '1.0.0',
  category: 'network',
  slot: 'network',
  legacyKey: 'firewall',
  description: '通过标准 Linux iproute2 (ss -tulpn)、iptables / nftables 只读命令审计主机监听端口暴露面与拦截计数。',
  officialSpec: {
    protocol: 'Linux iproute2 (ss) + iptables / nftables',
    docsUrl: 'https://man7.org/linux/man-pages/man8/ss.8.html',
    endpoints: ['CLI: ss -tulpn', 'CLI: iptables -L -n -v / nft list ruleset'],
    auth: '只读系统命令（可选最小权限 sudoers）',
  },
  capabilities: ['health', 'security'],
  configSchema: [],
  defaultConfig: {
    enabled: true,
  },
  collect: (cfg) => collectFirewall(cfg),
  testConnection: (cfg) => collectFirewall({ ...cfg, enabled: true }),
  summarize: (d) => {
    if (!d?.enabled) return '未启用';
    const listening = d.listening?.length ?? 0;
    const exposed = d.summary?.exposed ?? 0;
    return `${listening} 监听端口 · ${exposed} 公网暴露`;
  },
});

export const OFFICIAL_CONNECTOR_PLUGINS = [
  magpiePlugin,
  nmemPlugin,
  openVikingPlugin,
  symbiotePlugin,
  rerankPlugin,
  tailscalePlugin,
  mihomoPlugin,
  syncthingPlugin,
  firewallPlugin,
];
