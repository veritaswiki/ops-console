import { createWorldMapController, renderSparklineSvg } from '/world-map.js';
import { createArchitectureGraph } from '/graph.js';

const state = {
  meta: null,
  snapshot: null,
  remotes: null,
  audit: [],
  incidents: [],
  incidentsStorage: null,
  activeView: 'overview',
  viewSignatures: {},
  graphFilter: 'all',
  graphControllers: {
    overview: null,
    memory: null,
    agents: null,
  },
  fleetTypeFilter: 'all',
  selectedNodeId: '',
  selectedNodeHistory: [],
  enrolledProbes: [],
  lastEnrollResult: null,
  enrollSnippetTab: 'linuxSystemd',
  mapController: null,
  serviceLayer: 'all',
  serviceStatus: 'all',
  serviceQuery: '',
  agentCategory: 'all',
  memoryProvider: 'all',
  logSource: 'journald',
  logTarget: 'all',
  logEntries: [],
  logStream: null,
  logSeverityCounts: { total: 0, error: 0, warn: 0, info: 0, debug: 0 },
  pollTimer: null,
  pendingConfirm: null,
};

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '-';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let val = n;
  let idx = -1;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

function formatUptime(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return '-';
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTimeShort(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19);
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatClock(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

function statusInfo(status) {
  const s = String(status || 'unknown').toLowerCase();
  if (s === 'healthy' || s === 'active' || s === 'ok' || s === 'online') {
    return { cls: 'status-healthy', dot: 'dot-ok', label: '健康' };
  }
  if (s === 'degraded' || s === 'warning' || s === 'activating' || s === 'reloading') {
    return { cls: 'status-degraded', dot: 'dot-warn', label: '降级' };
  }
  if (s === 'standby' || s === 'disabled' || s === 'inactive') {
    return { cls: 'status-standby', dot: 'dot-muted', label: s === 'standby' ? '待机' : '已停用' };
  }
  return { cls: 'status-failed', dot: 'dot-err', label: s === 'offline' ? '离线' : '异常' };
}

function renderStatusCell(status, customLabel = '') {
  const info = statusInfo(status);
  return `<span class="status-cell ${info.cls}"><i class="dot ${info.dot}"></i>${esc(customLabel || info.label)}</span>`;
}

function showToast(message, isError = false) {
  const stack = $('toastStack');
  const el = document.createElement('div');
  el.className = `toast${isError ? ' is-error' : ''}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (res.status === 401) {
    window.location.reload();
    throw new Error('Authentication required');
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { ok: false, error: text || `HTTP ${res.status}` };
  }
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function initTheme() {
  const saved = localStorage.getItem('ops_console_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);

  $('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ops_console_theme', next);
    applyTheme(next);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = $('themeIcon');
  if (theme === 'dark') {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
  }
}

function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll('#mainNav .nav-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach((sec) => {
    sec.hidden = sec.dataset.panel !== viewName;
  });
  if (viewName !== 'logs' && state.logStream) {
    stopLogStream();
  }
  if (viewName === 'network' && state.remotes === null) {
    loadRemotes(false);
  }
  if (viewName === 'ops') {
    loadAudit();
    loadIncidents();
  }
  if (viewName === 'fleet') {
    loadEnrolledProbes();
  }
  if (viewName === 'logs' && state.logEntries.length === 0) {
    runLogQuery();
  }
  if (state.snapshot) {
    renderActiveView(state.snapshot, { force: viewName === 'fleet' });
  }
}

function openServiceLogs(unit) {
  state.logSource = 'journald';
  state.logTarget = unit;
  updateLogSourceButtons();
  populateLogTargets();
  $('logTargetSelect').value = unit;
  switchView('logs');
  runLogQuery();
}

function openConfirm({ title, body, riskNote = '', onConfirm }) {
  const modal = $('confirmModal');
  $('confirmTitle').textContent = title;
  $('confirmBody').textContent = body;
  const riskEl = $('confirmRisk');
  if (riskNote) {
    riskEl.textContent = `高风险提示：${riskNote}`;
    riskEl.hidden = false;
  } else {
    riskEl.hidden = true;
  }
  state.pendingConfirm = onConfirm;
  modal.showModal();
}

function formatCompactPort(ports, fallbackScope = 'user') {
  if (!Array.isArray(ports) || ports.length === 0) return fallbackScope;
  const raw = String(ports[0] || '').trim();
  if (!raw) return fallbackScope;
  const clean = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const colonPort = clean.match(/:(\d+(?:\/\d+)?)$/);
  if (colonPort) return `:${colonPort[1]}`;
  if (/^\d+(?:\/\d+)?$/.test(clean)) return `:${clean}`;
  return clean.length > 16 ? `${clean.slice(0, 15)}...` : clean;
}

function ensureOverviewGraph() {
  if (!state.graphControllers.overview) {
    state.graphControllers.overview = createArchitectureGraph($('topologyWrap'), {
      mode: 'full',
      inspectorEl: $('topologyInspector'),
      onOpenLogs: (unit) => openServiceLogs(unit),
    });
  }
  return state.graphControllers.overview;
}

function ensureMemoryGraph() {
  if (!state.graphControllers.memory) {
    state.graphControllers.memory = createArchitectureGraph($('memoryGraphWrap'), {
      mode: 'memory',
      inspectorEl: $('memoryGraphInspector'),
      onOpenLogs: (unit) => openServiceLogs(unit),
    });
  }
  return state.graphControllers.memory;
}

function ensureAgentsGraph() {
  if (!state.graphControllers.agents) {
    state.graphControllers.agents = createArchitectureGraph($('agentsGraphWrap'), {
      mode: 'agents',
      inspectorEl: $('agentsGraphInspector'),
      onOpenLogs: (unit) => openServiceLogs(unit),
      onSelectCategory: (cat) => {
        state.agentCategory = cat || 'all';
        document.querySelectorAll('#agentCategoryFilter .seg-item').forEach((btn) => {
          btn.classList.toggle('is-active', btn.dataset.cat === state.agentCategory);
        });
        if (state.snapshot) {
          state.viewSignatures.agents = '';
          renderAgents(state.snapshot);
        }
      },
    });
  }
  return state.graphControllers.agents;
}

function computeViewSignature(viewName, snap) {
  if (!snap) return '';
  try {
    switch (viewName) {
      case 'overview':
        return JSON.stringify([
          snap.collectedAt,
          snap.host?.load1,
          snap.host?.memory?.usedBytes,
          snap.services?.summary,
          (snap.services?.items || []).map((s) => [s.id, s.status, s.probe?.latencyMs]),
          snap.fleet?.summary,
          snap.incidents?.length,
          snap.incidents?.[0]?.id,
          snap.incidents?.[0]?.ts,
          state.graphFilter,
        ]);
      case 'fleet':
        return JSON.stringify([
          snap.collectedAt,
          snap.fleet?.summary,
          (snap.fleet?.nodes || []).map((n) => [n.id, n.status, n.probeAgeSec, n.cpu?.usagePct, n.memory?.usedPct]),
          state.fleetTypeFilter,
          state.selectedNodeId,
        ]);
      case 'services':
        return JSON.stringify([
          snap.collectedAt,
          (snap.services?.items || []).map((s) => [s.unit, s.status, s.restarts, s.memoryBytes, s.probe?.latencyMs]),
          state.serviceLayer,
          state.serviceStatus,
          state.serviceQuery,
        ]);
      case 'memory':
        return JSON.stringify([snap.collectedAt, snap.memory]);
      case 'agents':
        return JSON.stringify([snap.collectedAt, snap.magpie, snap.agents, state.agentCategory]);
      case 'network':
        return JSON.stringify([snap.collectedAt, snap.network, snap.firewall]);
      case 'ops':
        return JSON.stringify([snap.collectedAt, snap.health, snap.backup, snap.timers, snap.runningJobs, snap.incidents?.length, snap.incidents?.[0]?.id]);
      default:
        return String(snap.collectedAt || '');
    }
  } catch {
    return String(snap.collectedAt || Date.now());
  }
}

function renderActiveView(snap, { force = false } = {}) {
  if (!snap) return;
  const view = state.activeView;
  if (view === 'logs') return;
  const sig = computeViewSignature(view, snap);
  if (!force && state.viewSignatures[view] === sig) return;
  state.viewSignatures[view] = sig;
  if (view === 'overview') renderOverview(snap);
  else if (view === 'fleet') renderFleet(snap);
  else if (view === 'services') renderServices(snap);
  else if (view === 'memory') renderMemory(snap);
  else if (view === 'agents') renderAgents(snap);
  else if (view === 'network') renderNetwork(snap);
  else if (view === 'ops') renderOps(snap);
}

function renderOverviewIncidents(incidents) {
  const el = $('overviewIncidents');
  if (!el) return;
  const list = Array.isArray(incidents) ? incidents.slice(0, 5) : [];
  if (list.length === 0) {
    el.innerHTML = '<p class="panel-desc">暂无近期健康状态跃迁记录。</p>';
    return;
  }
  el.innerHTML = `<ul class="plain-list">${list.map((inc) => {
    const stateBadge = renderStatusCell(inc.toState, `${inc.fromState || '-'} -> ${inc.toState || '-'}`);
    const resolvedTag = inc.resolvedAt ? '已恢复' : '活跃';
    return `
      <li>
        <div class="incident-item">
          <span><strong>${esc(inc.node || inc.entityKey || '-')}</strong> <span class="incident-transition mono">${esc(formatTimeShort(inc.ts))}</span></span>
          <span>${stateBadge} <span class="cell-sub">(${esc(resolvedTag)})</span></span>
        </div>
      </li>
    `;
  }).join('')}</ul>`;
}

function renderOverview(snap) {
  const host = snap.host || {};
  const summary = snap.services?.summary || {};
  const mem = snap.memory || {};
  const net = snap.network || {};
  const magpie = snap.magpie || {};

  $('hostSummaryMeta').textContent = `${host.hostname || 'host'} · ${host.cpuCores || 0} vCPU · 运行 ${formatUptime(host.uptimeSeconds)}`;

  $('kpiServices').textContent = `${summary.healthy ?? 0} / ${summary.total ?? 0}`;
  const attention = (summary.failed ?? 0) + (summary.degraded ?? 0);
  $('kpiServicesSub').textContent = attention > 0
    ? `${summary.degraded ?? 0} 降级, ${summary.failed ?? 0} 异常, ${summary.optionalInactive ?? 0} 待机`
    : `全部核心服务健康, ${summary.optionalInactive ?? 0} 可选待机`;

  const memPct = host.memory?.usedPercent ?? 0;
  $('kpiHost').textContent = `${host.load1 ?? 0} / ${memPct}%`;
  $('kpiHostSub').textContent = `内存 ${formatBytes(host.memory?.usedBytes)} / ${formatBytes(host.memory?.totalBytes)}`;

  const memEngines = [mem.nmem, mem.openviking, mem.symbiote, mem.rerank].filter((e) => e && e.enabled);
  const memHealthy = memEngines.filter((e) => e.status === 'healthy').length;
  $('kpiMemory').textContent = `${memHealthy} / ${memEngines.length}`;
  const nmemCount = mem.nmem?.stats?.memories ?? 0;
  const ovSkills = mem.openviking?.skillsCount ?? 0;
  $('kpiMemorySub').textContent = `记忆 ${nmemCount} 条 · OpenViking 技能 ${ovSkills} 项`;

  const tsOnline = net.tailscale?.onlineCount ?? 0;
  const tsTotal = net.tailscale?.devices?.length ?? 0;
  const fleetSummary = snap.fleet?.summary || null;
  const modelsTotal = magpie.totalModels ?? 0;
  if (fleetSummary) {
    const reachable = fleetSummary.reachable ?? fleetSummary.online ?? 0;
    const meshOnly = fleetSummary.meshOnly ?? Math.max(0, reachable - (fleetSummary.probed ?? 0));
    $('kpiNetwork').textContent = `${fleetSummary.online}/${fleetSummary.total} 节点`;
    $('kpiNetworkSub').textContent = `探针实采 ${fleetSummary.probed} · 仅组网 ${meshOnly} · ${modelsTotal} 模型`;
  } else {
    $('kpiNetwork').textContent = `${tsOnline}/${tsTotal} · ${modelsTotal}`;
    $('kpiNetworkSub').textContent = 'Tailscale 在线设备 · Magpie 路由模型数';
  }

  const overviewGraph = ensureOverviewGraph();
  overviewGraph.setFilter(state.graphFilter);
  overviewGraph.setData(snap);

  const connectorRows = [
    {
      name: 'Magpie Gateway',
      proto: magpie.protocol || 'OpenAI /v1/models',
      status: magpie.enabled ? magpie.status : 'standby',
      latency: magpie.latencyMs,
      metric: magpie.reachable ? `${magpie.totalModels || 0} 模型 / ${magpie.providers?.length || 0} 渠道` : (magpie.error || '未启用'),
    },
    {
      name: 'Nowledge Mem',
      proto: mem.nmem?.protocol || 'REST + nmem CLI',
      status: mem.nmem?.enabled ? mem.nmem.status : 'standby',
      latency: mem.nmem?.latencyMs,
      metric: mem.nmem?.reachable
        ? `${mem.nmem.stats?.memories ?? 0} 记忆 · ${mem.nmem.spaces?.length ?? 0} 空间`
        : (mem.nmem?.error || '未启用'),
    },
    {
      name: 'OpenViking',
      proto: mem.openviking?.protocol || 'HTTP + ov CLI',
      status: mem.openviking?.enabled ? mem.openviking.status : 'standby',
      latency: mem.openviking?.latencyMs,
      metric: mem.openviking?.reachable
        ? `向量 ${mem.openviking.vikingdb?.vectorCount ?? '-'} · 技能 ${mem.openviking.skillsCount ?? 0}`
        : (mem.openviking?.error || '未启用'),
    },
    {
      name: 'Symbiote',
      proto: mem.symbiote?.protocol || 'HTTP /api/health',
      status: mem.symbiote?.enabled ? mem.symbiote.status : 'standby',
      latency: mem.symbiote?.latencyMs,
      metric: mem.symbiote?.reachable
        ? `Vault ${mem.symbiote.vaultFileCount ?? '-'} 文件 · 模式 ${mem.symbiote.mode || '-'}`
        : (mem.symbiote?.error || '未启用'),
    },
    {
      name: 'Rerank Gateway',
      proto: mem.rerank?.protocol || 'HTTP /health',
      status: mem.rerank?.enabled ? mem.rerank.status : 'standby',
      latency: mem.rerank?.latencyMs,
      metric: mem.rerank?.reachable ? (mem.rerank.model || 'Ready') : (mem.rerank?.error || '未启用'),
    },
    {
      name: 'Tailscale Mesh',
      proto: net.tailscale?.protocol || 'tailscale --json',
      status: net.tailscale?.enabled ? net.tailscale.status : 'standby',
      latency: null,
      metric: net.tailscale?.reachable
        ? `${net.tailscale.onlineCount}/${net.tailscale.devices?.length || 0} 在线 · ${net.tailscale.serves?.length || 0} Serve`
        : '不可达',
    },
    {
      name: 'Mihomo Proxy',
      proto: net.mihomo?.protocol || 'Mihomo REST',
      status: net.mihomo?.enabled ? net.mihomo.status : 'standby',
      latency: net.mihomo?.latencyMs,
      metric: net.mihomo?.reachable
        ? `${net.mihomo.activeConnections ?? 0} 连接 · v${net.mihomo.version || '-'}`
        : (net.mihomo?.error || '未启用'),
    },
    {
      name: 'Syncthing',
      proto: net.syncthing?.protocol || 'REST /rest/noauth/health',
      status: net.syncthing?.enabled ? net.syncthing.status : 'standby',
      latency: net.syncthing?.latencyMs,
      metric: net.syncthing?.reachable ? `运行正常${net.syncthing.myId ? ` (${net.syncthing.myId})` : ''}` : (net.syncthing?.error || '未启用'),
    },
  ];

  $('connectorsTableBody').innerHTML = connectorRows.map((row) => `
    <tr>
      <td><strong>${esc(row.name)}</strong><span class="cell-sub mono">${esc(row.proto)}</span></td>
      <td>${renderStatusCell(row.status)}</td>
      <td class="mono nowrap">${row.latency != null ? `${row.latency} ms` : '-'}</td>
      <td>${esc(row.metric)}</td>
    </tr>
  `).join('');

  const disks = host.disks || [];
  $('overviewDisks').innerHTML = disks.length > 0
    ? disks.map((d) => {
        const pct = Number(d.usePercent || 0);
        const fillCls = pct >= 90 ? 'is-err' : pct >= 78 ? 'is-warn' : '';
        return `
          <div class="disk-row">
            <div class="disk-meta mono">
              <span>${esc(d.mount)}</span>
              <span>${formatBytes(d.usedBytes)} / ${formatBytes(d.sizeBytes)} (${pct}%)</span>
            </div>
            <div class="bar-track"><div class="bar-fill ${fillCls}" style="width:${Math.min(100, pct)}%"></div></div>
          </div>
        `;
      }).join('')
    : '<div class="empty-state">无挂载点数据。</div>';

  renderOverviewIncidents(snap.incidents || state.incidents);

  const alerts = snap.alerts || [];
  const jobs = [...(snap.activeOpsJobs || []), ...(snap.runningJobs || []).map((j) => `${j.name} (PID ${j.pid})`)];
  let alertsHtml = '';
  if (jobs.length > 0) {
    alertsHtml += `<p class="panel-desc" style="margin-bottom:8px;">活跃运维作业：${esc(jobs.join(', '))}</p>`;
  }
  if (alerts.length > 0) {
    alertsHtml += `<ul class="plain-list mono">${alerts.slice(0, 6).map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`;
  } else {
    alertsHtml += '<p class="panel-desc">当前无未处理告警记录。</p>';
  }
  $('overviewAlerts').innerHTML = alertsHtml;
}

function formatAgeSec(ageSec) {
  if (ageSec === null || ageSec === undefined || !Number.isFinite(Number(ageSec))) return '-';
  const s = Math.max(0, Math.round(Number(ageSec)));
  if (s < 10) return '刚刚';
  if (s < 60) return `${s}s 前`;
  if (s < 3600) return `${Math.floor(s / 60)}m 前`;
  if (s < 86400) return `${Math.floor(s / 3600)}h 前`;
  return `${Math.floor(s / 86400)}d 前`;
}

function deviceTypeLabel(type) {
  const map = { hub: '中心 Hub', server: '服务器', edge: '边缘节点', laptop: '笔记本', mobile: '移动端' };
  return map[type] || type || '节点';
}

function probeModeLabel(mode) {
  const map = {
    local: '本地直采',
    push: '推送探针',
    checkin: '移动签到',
    ssh: 'SSH 探测',
    'tailscale-only': '仅 Tailscale',
    external: '外部边缘',
  };
  return map[mode] || mode || '-';
}

function nodeStatusLabel(node) {
  if (node.status === 'healthy') return node.probeMode === 'checkin' ? '已签到' : '在线';
  if (node.status === 'degraded') return '上报延迟';
  if (node.status === 'standby') {
    if (node.deviceType === 'mobile') return '待签到';
    if (node.probeMode === 'external') return '待接探针';
    return node.transport && node.transport !== 'offline' ? '仅组网在线' : '待机';
  }
  return '离线';
}

function ensureMapController() {
  if (!state.mapController) {
    state.mapController = createWorldMapController($('worldMapWrap'), {
      onSelectNode: (nodeId) => selectFleetNode(nodeId),
    });
  }
  return state.mapController;
}

async function selectFleetNode(nodeId, { focusOnMap = false } = {}) {
  state.selectedNodeId = nodeId;
  const nodes = state.snapshot?.fleet?.nodes || [];
  const target = nodes.find((n) => n.id === nodeId);
  state.selectedNodeHistory = target?.history || [];
  if (state.snapshot) {
    renderFleet(state.snapshot);
    if (focusOnMap && target) {
      ensureMapController().focusNode(target);
    }
  }
  try {
    const data = await apiFetch(`/api/nodes/${encodeURIComponent(nodeId)}`);
    if (state.selectedNodeId === nodeId && Array.isArray(data.history)) {
      state.selectedNodeHistory = data.history;
      renderNodeInspector(data.node || target);
    }
  } catch {
    // fall back to snapshot history cleanly
  }
}

function renderProgressBarRow(label, valueText, pct) {
  const n = Number(pct);
  const clamped = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  const tone = clamped >= 90 ? 'is-err' : clamped >= 78 ? 'is-warn' : '';
  return `
    <div class="disk-row">
      <div class="disk-meta">
        <span>${esc(label)}</span>
        <span class="mono">${esc(valueText)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill ${tone}" style="width:${clamped}%"></div></div>
    </div>
  `;
}

function renderNodeInspector(node) {
  const body = $('inspectorBody');
  const titleEl = $('inspectorTitle');
  const subEl = $('inspectorSubtitle');
  const statusSlot = $('inspectorStatusSlot');

  if (!node) {
    titleEl.textContent = '节点实时详情';
    subEl.textContent = '点击左侧地图或下方列表中的任意设备查看遥测趋势。';
    statusSlot.innerHTML = '';
    body.innerHTML = '<div class="empty-state">暂无可展示的节点信息。</div>';
    return;
  }

  titleEl.textContent = node.name || node.id;
  subEl.textContent = [deviceTypeLabel(node.deviceType), node.region, node.provider, node.os && node.arch ? `${node.os}/${node.arch}` : node.os]
    .filter(Boolean)
    .join(' · ');
  statusSlot.innerHTML = renderStatusCell(node.status, nodeStatusLabel(node));

  const history = state.selectedNodeHistory.length ? state.selectedNodeHistory : (node.history || []);
  const primaryDisk = Array.isArray(node.disks) && node.disks[0] ? node.disks[0] : null;

  const bars = [];
  if (node.cpu && (node.cpu.usagePct !== null && node.cpu.usagePct !== undefined || node.cpu.load1 !== null && node.cpu.load1 !== undefined)) {
    const cpuPct = node.cpu.usagePct ?? (node.cpu.cores ? Math.min(100, (node.cpu.load1 / node.cpu.cores) * 100) : 0);
    const cpuText = node.cpu.usagePct != null
      ? `${Number(node.cpu.usagePct).toFixed(1)}%${node.cpu.load1 != null ? ` (load ${node.cpu.load1})` : ''}`
      : `load ${node.cpu.load1}`;
    bars.push(renderProgressBarRow('CPU 占用', cpuText, cpuPct));
  }
  if (node.memory && node.memory.usedPct != null) {
    const memSub = node.memory.totalBytes ? ` (${formatBytes(node.memory.usedBytes)} / ${formatBytes(node.memory.totalBytes)})` : '';
    bars.push(renderProgressBarRow('内存占用', `${Number(node.memory.usedPct).toFixed(1)}%${memSub}`, node.memory.usedPct));
  }
  if (primaryDisk && (primaryDisk.usedPct != null || primaryDisk.summary)) {
    const diskText = primaryDisk.usedPct != null
      ? `${Number(primaryDisk.usedPct).toFixed(0)}%${primaryDisk.totalBytes ? ` (${formatBytes(primaryDisk.usedBytes)} / ${formatBytes(primaryDisk.totalBytes)})` : (primaryDisk.summary ? ` ${primaryDisk.summary}` : '')}`
      : primaryDisk.summary;
    bars.push(renderProgressBarRow(`磁盘 (${primaryDisk.mount || '/'})`, diskText, primaryDisk.usedPct ?? 0));
  }
  if (node.battery && node.battery.percent != null) {
    const chg = node.battery.charging ? '充电中' : (node.battery.source || '电池供电');
    bars.push(renderProgressBarRow('电池电量', `${Math.round(node.battery.percent)}% · ${chg}`, node.battery.percent));
  }

  const sparks = [];
  if (node.deviceType === 'mobile') {
    sparks.push(renderSparklineSvg(history, { field: 'batteryPct', label: '电量趋势', unit: '%', min: 0, max: 100, tone: 'ok' }));
    sparks.push(renderSparklineSvg(history, { field: 'rttMs', label: '往返延迟', unit: 'ms', min: 0, tone: 'info' }));
  } else {
    sparks.push(renderSparklineSvg(history, { field: 'cpuPct', label: 'CPU 趋势', unit: '%', min: 0, max: 100, tone: 'accent' }));
    sparks.push(renderSparklineSvg(history, { field: 'memPct', label: '内存趋势', unit: '%', min: 0, max: 100, tone: 'info' }));
  }

  const transportText = node.transport === 'local'
    ? '本地回环'
    : node.transport === 'relay'
      ? `DERP 中继 (${node.relay || 'auto'})`
      : node.transport === 'direct'
        ? 'Tailnet 直连'
        : node.transport === 'checkin'
          ? 'Web / API 签到'
          : node.transport === 'ssh'
            ? 'SSH 探测'
            : node.transport === 'external'
              ? '外部线路 (未入 Tailnet)'
              : '离线';

  const netText = node.network?.rxBytesPerSec != null
    ? `RX ${formatBytes(node.network.rxBytesPerSec)}/s · TX ${formatBytes(node.network.txBytesPerSec)}/s`
    : (node.network?.type || '-');

  const kvItems = [
    { k: 'Tailscale IP', v: node.tailscaleIp || '-' },
    { k: '连接路径', v: node.rttMs != null && node.rttMs > 0 ? `${transportText} · ${node.rttMs}ms` : transportText },
    { k: '采集方式', v: `${probeModeLabel(node.probeMode)}${node.probeAgeSec != null ? ` · ${formatAgeSec(node.probeAgeSec)}` : ''}` },
    { k: '运行与负载', v: node.uptimeSec != null ? formatUptime(node.uptimeSec) : (node.note || '-') },
  ];
  if (netText !== '-') kvItems.push({ k: '网络吞吐 / 制式', v: netText });
  if (node.agentsCount > 0 || node.servicesSummary) {
    kvItems.push({
      k: '服务与 Agent',
      v: node.servicesSummary
        ? `${node.servicesSummary.healthy}/${node.servicesSummary.total} 服务 · ${node.agentsCount || 0} Agent`
        : `${node.agentsCount} 个活跃 Agent`,
    });
  }
  if (node.backupDisk) {
    kvItems.push({ k: '异机备份快照', v: node.backupDisk });
  }

  const watched = Array.isArray(node.watchedServices) ? node.watchedServices.slice(0, 6) : [];
  const watchedHtml = watched.length
    ? `
      <div>
        <div class="field-label" style="margin-bottom:6px">受观测服务</div>
        <ul class="plain-list">
          ${watched.map((s) => `<li><strong>${esc(s.name)}</strong> <span class="mono" style="color:var(--muted)">· ${esc(s.status)}</span></li>`).join('')}
        </ul>
      </div>
    `
    : '';

  body.innerHTML = `
    <div class="inspector-kv">
      ${kvItems.map((it) => `<div class="kv-item"><div class="kv-key">${esc(it.k)}</div><div class="kv-val mono" title="${esc(it.v)}">${esc(it.v)}</div></div>`).join('')}
    </div>
    ${bars.length ? `<div>${bars.join('')}</div>` : '<div class="form-hint">该节点尚未上报系统资源指标，可在下方签发推送探针获取完整遥测。</div>'}
    <div class="spark-grid-two">${sparks.join('')}</div>
    ${watchedHtml}
  `;
}

function renderFleet(snap) {
  const fleet = snap?.fleet;
  if (!fleet) return;

  const nodes = Array.isArray(fleet.nodes) ? fleet.nodes : [];
  const links = Array.isArray(fleet.links) ? fleet.links : [];
  const sum = fleet.summary || {};

  if (!state.selectedNodeId || !nodes.some((n) => n.id === state.selectedNodeId)) {
    state.selectedNodeId = fleet.localNodeId || nodes[0]?.id || '';
    const defNode = nodes.find((n) => n.id === state.selectedNodeId);
    state.selectedNodeHistory = defNode?.history || [];
  }

  $('fleetSummaryMeta').textContent = `${sum.total ?? nodes.length} 台设备 · ${sum.probed ?? 0} 台实时探针 · ${fleet.requireTailscaleCidr ? 'Tailnet 源白名单已开启' : '内网写入模式'}`;
  $('fleetKpiTotal').textContent = `${sum.total ?? nodes.length}`;
  $('fleetKpiTotalSub').textContent = `服务器 ${sum.servers ?? 0} · 笔记本 ${sum.laptops ?? 0} · 移动端 ${sum.mobiles ?? 0}`;
  $('fleetKpiOnline').textContent = `${sum.online ?? 0} / ${sum.total ?? nodes.length}`;
  const fleetReachable = sum.reachable ?? sum.online ?? 0;
  const fleetMeshOnly = sum.meshOnly ?? Math.max(0, fleetReachable - (sum.probed ?? 0));
  $('fleetKpiOnlineSub').textContent = `可达 ${fleetReachable} · 仅组网 ${fleetMeshOnly} · ${links.filter((l) => l.active).length} 条活跃链路`;
  $('fleetKpiProbed').textContent = `${sum.probed ?? 0} / ${sum.total ?? nodes.length}`;
  $('fleetKpiProbedSub').textContent = '支持 ops-probe 单向推送与移动端签到';
  $('fleetKpiSecurity').textContent = fleet.requireTailscaleCidr ? 'Tailnet 仅限' : '受控内网';
  $('fleetKpiSecuritySub').textContent = '仅允许遥测写入，零反向命令通道';

  const controller = ensureMapController();
  controller.setData({ nodes, links, selectedNodeId: state.selectedNodeId });

  const selectedNode = nodes.find((n) => n.id === state.selectedNodeId) || nodes[0] || null;
  renderNodeInspector(selectedNode);

  // Populate mobile check-in suggestions
  const mobileNodes = nodes.filter((n) => n.deviceType === 'mobile');
  const dl = $('mobileNodeOptions');
  if (dl) {
    dl.innerHTML = mobileNodes.map((n) => `<option value="${esc(n.id)}">${esc(n.name)}</option>`).join('');
  }
  const checkinInput = $('checkinNodeId');
  if (checkinInput && !checkinInput.value) {
    checkinInput.value = mobileNodes[0]?.id || 'mobile-ops';
  }

  // Filter fleet table
  const filtered = nodes.filter((n) => {
    if (state.fleetTypeFilter === 'all') return true;
    if (state.fleetTypeFilter === 'server') {
      return n.deviceType === 'hub' || n.deviceType === 'server' || n.deviceType === 'edge';
    }
    return n.deviceType === state.fleetTypeFilter;
  });

  const readOnly = Boolean(state.meta?.readOnly);
  const tbody = $('fleetTableBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">当前类型下暂无节点。</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((n) => {
    const isSel = n.id === state.selectedNodeId;
    const metricParts = [];
    if (n.cpu?.usagePct != null) metricParts.push(`CPU ${Math.round(n.cpu.usagePct)}%`);
    else if (n.cpu?.load1 != null) metricParts.push(`Load ${n.cpu.load1}`);
    if (n.memory?.usedPct != null) metricParts.push(`Mem ${Math.round(n.memory.usedPct)}%`);
    if (n.battery?.percent != null) metricParts.push(`电量 ${Math.round(n.battery.percent)}%${n.battery.charging ? '+' : ''}`);
    const metricText = metricParts.length ? metricParts.join(' · ') : '-';
    const netSub = n.transport === 'direct'
      ? 'P2P 直连'
      : (n.transport === 'external'
        ? '外部线路'
        : (n.relay ? `DERP ${n.relay}` : (n.transport || '-')));
    const canRevoke = !readOnly && n.probeEnrolled && n.probeMode !== 'local';
    return `
      <tr class="${isSel ? 'fleet-row-selected' : ''}">
        <td>
          <strong>${esc(n.name)}</strong>
          <span class="cell-sub mono">${esc(n.id)}</span>
        </td>
        <td>
          ${esc(deviceTypeLabel(n.deviceType))}
          <span class="cell-sub">${esc(n.region || '-')}</span>
        </td>
        <td>${renderStatusCell(n.status, nodeStatusLabel(n))}</td>
        <td class="mono">${esc(probeModeLabel(n.probeMode))}</td>
        <td class="mono">${esc(metricText)}</td>
        <td>
          <span class="mono">${esc(n.tailscaleIp || '-')}</span>
          <span class="cell-sub mono">${esc(netSub)}${n.rttMs ? ` · ${n.rttMs}ms` : ''}</span>
        </td>
        <td class="mono">${esc(n.probeMode === 'local' ? '实时' : (n.probeAgeSec != null ? formatAgeSec(n.probeAgeSec) : (n.probeMode === 'ssh' && n.status === 'healthy' ? 'SSH 实时' : '-')))}</td>
        <td class="col-actions">
          <div class="cell-actions">
            <button type="button" class="link-action" data-inspect-node="${esc(n.id)}">详情</button>
            ${canRevoke ? `<button type="button" class="link-action" data-revoke-probe="${esc(n.id)}" data-revoke-name="${esc(n.name)}">吊销</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadEnrolledProbes() {
  try {
    const data = await apiFetch('/api/probes');
    state.enrolledProbes = Array.isArray(data.probes) ? data.probes : [];
    renderEnrolledProbes();
  } catch {
    // ignore non-critical error
  }
}

function renderEnrolledProbes() {
  const container = $('enrolledProbesList');
  if (!container) return;
  const readOnly = Boolean(state.meta?.readOnly);
  const enrollBtn = $('enrollProbeBtn');
  if (enrollBtn) {
    enrollBtn.disabled = readOnly;
    $('enrollProbeHint').textContent = readOnly
      ? '当前为只读模式，探针签发与吊销功能已禁用。'
      : '令牌仅显示一次，服务端只保存加盐 SHA-256 哈希。';
  }
  if (!state.enrolledProbes.length) {
    container.innerHTML = '<div class="empty-state">尚未通过控制台签发独立探针令牌。</div>';
    return;
  }
  container.innerHTML = state.enrolledProbes.map((p) => `
    <div class="probe-row">
      <div class="probe-row-meta">
        <div class="probe-row-title">${esc(p.name || p.id)} <span class="mono" style="font-size:13px;color:var(--muted)">(${esc(p.id)})</span></div>
        <div class="probe-row-sub mono">${esc(deviceTypeLabel(p.deviceType))} · ${esc(p.region || 'Tailnet')} · 权限 ${(p.scopes || []).join(', ')}</div>
      </div>
      <div>
        ${readOnly
          ? '<span class="form-hint">只读</span>'
          : `<button type="button" class="btn-subtle" data-revoke-probe="${esc(p.id)}" data-revoke-name="${esc(p.name || p.id)}">吊销令牌</button>`}
      </div>
    </div>
  `).join('');
}

function renderEnrollSnippet() {
  const res = state.lastEnrollResult;
  const box = $('enrollResultBox');
  if (!res || !box) return;
  box.hidden = false;
  $('enrollResultTitle').textContent = `节点 ${res.node?.id || ''} 探针凭据已签发`;
  $('enrollTokenValue').textContent = `Token: ${res.token || ''}`;
  const hints = res.installHints || {};
  const snippet = hints[state.enrollSnippetTab] || hints.linuxSystemd || '';
  $('enrollSnippetCode').textContent = snippet;
  document.querySelectorAll('#enrollSnippetTabs .seg-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.snippet === state.enrollSnippetTab);
  });
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

function renderServices(snap) {
  const layers = snap.services?.layers || [];
  const items = snap.services?.items || [];
  const readOnly = Boolean(state.meta?.readOnly);

  const layerContainer = $('serviceLayerFilter');
  if (!layerContainer.dataset.ready) {
    const buttons = [{ id: 'all', label: '全部层级' }, ...layers];
    layerContainer.innerHTML = buttons
      .map((l) => `<button type="button" class="seg-item${state.serviceLayer === l.id ? ' is-active' : ''}" data-layer="${esc(l.id)}">${esc(l.label)}</button>`)
      .join('');
    layerContainer.dataset.ready = '1';
  }

  const q = state.serviceQuery.trim().toLowerCase();
  const filtered = items.filter((svc) => {
    if (state.serviceLayer !== 'all' && svc.layer !== state.serviceLayer) return false;
    if (state.serviceStatus === 'healthy' && svc.status !== 'healthy') return false;
    if (state.serviceStatus === 'attention' && !['degraded', 'failed', 'inactive'].includes(svc.status)) return false;
    if (state.serviceStatus === 'standby' && svc.status !== 'standby') return false;
    if (q) {
      const hay = `${svc.name} ${svc.unit} ${svc.role} ${(svc.ports || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  $('servicesCountMeta').textContent = `显示 ${filtered.length} / ${items.length} 项`;

  if (filtered.length === 0) {
    $('servicesTableBody').innerHTML = '<tr><td colspan="7" class="empty-state">没有符合当前筛选条件的服务。</td></tr>';
    return;
  }

  $('servicesTableBody').innerHTML = filtered.map((svc) => {
    const probeText = svc.probe
      ? (svc.probe.ok ? `HTTP ${svc.probe.status} · ${svc.probe.latencyMs}ms` : (svc.probe.error || `HTTP ${svc.probe.status}`))
      : (svc.ports?.length ? `端口 ${svc.ports.join(', ')}` : '无 HTTP 探针');
    const memPid = svc.memoryBytes != null
      ? `${formatBytes(svc.memoryBytes)}${svc.mainPid ? ` · #${svc.mainPid}` : ''}`
      : (svc.mainPid ? `PID ${svc.mainPid}` : '-');

    const actionLabels = { restart: '重启', start: '启动', stop: '停止', reload: '重载' };
    const allowedList = Array.isArray(svc.allowedActions)
      ? svc.allowedActions.filter((a) => actionLabels[a])
      : ['restart', 'start', 'stop', 'reload'];

    const actionCtrl = readOnly || allowedList.length === 0
      ? '<span class="cell-sub">只读</span>'
      : `<select class="action-select" data-svc-action="${esc(svc.unit)}" data-svc-name="${esc(svc.name)}" data-svc-risk="${esc(svc.riskNote || '')}" data-svc-critical="${svc.risk === 'critical' ? '1' : '0'}" aria-label="控制 ${esc(svc.name)}">
          <option value="">控制...</option>
          ${allowedList.map((act) => `<option value="${esc(act)}">${esc(actionLabels[act])}</option>`).join('')}
        </select>`;

    return `
      <tr>
        <td>
          <strong>${esc(svc.name)}</strong>
          <span class="cell-sub">${esc(svc.role || svc.layer)}</span>
        </td>
        <td class="mono">
          ${esc(svc.unit)}
          <span class="cell-sub">${esc(svc.scope)} · ${esc(svc.enabledState)}</span>
        </td>
        <td>${renderStatusCell(svc.status)}</td>
        <td class="mono">${esc(probeText)}</td>
        <td class="mono">${esc(memPid)}</td>
        <td class="mono">${svc.restarts ?? 0}</td>
        <td class="col-actions">
          <div class="cell-actions">
            <button type="button" class="link-action" data-jump-log="${esc(svc.unit)}">日志</button>
            ${actionCtrl}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderMemory(snap) {
  const mem = snap.memory || {};
  const cards = [];

  ensureMemoryGraph().setData(snap);

  if (mem.nmem) {
    const n = mem.nmem;
    const stats = n.stats || {};
    const spacesHtml = Array.isArray(n.spaces) && n.spaces.length > 0
      ? `<div class="divider"></div><div class="subsection"><h3 class="sub-title">知识空间 (${n.spaces.length})</h3>
          <table class="data-table"><thead><tr><th>空间</th><th>类型</th><th>记忆</th><th>对话</th></tr></thead><tbody>
          ${n.spaces.slice(0, 6).map((sp) => `<tr><td>${esc(sp.name)}</td><td>${esc(sp.kind)}</td><td class="mono">${sp.memories}</td><td class="mono">${sp.threads}</td></tr>`).join('')}
          </tbody></table></div>`
      : '';
    const feedHtml = Array.isArray(n.feed) && n.feed.length > 0
      ? `<div class="divider"></div><div class="subsection"><h3 class="sub-title">最近记忆动态</h3>
          <ul class="plain-list">${n.feed.slice(0, 4).map((f) => `<li><strong>${esc(f.title || f.type)}</strong><span class="cell-sub">${esc(f.description || formatTimeShort(f.createdAt))}</span></li>`).join('')}</ul></div>`
      : '';
    cards.push(`
      <div class="panel">
        <div class="panel-head">
          <div><h2>Nowledge Mem</h2><p class="panel-desc mono">${esc(n.protocol || '')}</p></div>
          ${renderStatusCell(n.enabled ? n.status : 'standby')}
        </div>
        <div class="kv-grid">
          <div class="kv-item"><div class="kv-key">版本与延迟</div><div class="kv-val mono">${esc(n.version || '-')} · ${n.latencyMs != null ? `${n.latencyMs}ms` : '-'}</div></div>
          <div class="kv-item"><div class="kv-key">图存储与向量</div><div class="kv-val">${esc(n.graphStore?.status || '-')} / ${esc(n.embedding?.mode || '-')}</div></div>
          <div class="kv-item"><div class="kv-key">记忆总数 (活跃)</div><div class="kv-val mono">${stats.memories ?? 0} (${stats.activeMemories ?? 0})</div></div>
          <div class="kv-item"><div class="kv-key">对话 / 实体 / 标签</div><div class="kv-val mono">${stats.threads ?? 0} / ${stats.entities ?? 0} / ${stats.labels ?? 0}</div></div>
        </div>
        ${n.error ? `<div class="subsection"><p class="panel-desc">${esc(n.error)}</p></div>` : ''}
        ${spacesHtml}
        ${feedHtml}
      </div>
    `);
  }

  if (mem.openviking) {
    const ov = mem.openviking;
    const queueRows = ov.queue?.rows || [];
    const queueHtml = queueRows.length > 0
      ? `<div class="divider"></div><div class="subsection"><h3 class="sub-title">处理队列</h3>
          <table class="data-table"><thead><tr><th>队列</th><th>待处理</th><th>已处理</th><th>错误</th></tr></thead><tbody>
          ${queueRows.slice(0, 6).map((q) => `<tr><td class="mono">${esc(q.queue)}</td><td class="mono">${q.pending}</td><td class="mono">${q.processed}</td><td class="mono">${q.errors}</td></tr>`).join('')}
          </tbody></table></div>`
      : '';
    const skillsHtml = Array.isArray(ov.skills) && ov.skills.length > 0
      ? `<div class="divider"></div><div class="subsection"><h3 class="sub-title">托管技能 (${ov.skillsCount})</h3>
          <ul class="plain-list">${ov.skills.slice(0, 5).map((sk) => `<li><strong class="mono">${esc(sk.name)}</strong><span class="cell-sub">${esc(sk.description || sk.uri)}</span></li>`).join('')}</ul></div>`
      : '';
    cards.push(`
      <div class="panel">
        <div class="panel-head">
          <div><h2>OpenViking</h2><p class="panel-desc mono">${esc(ov.protocol || '')}</p></div>
          ${renderStatusCell(ov.enabled ? ov.status : 'standby')}
        </div>
        <div class="kv-grid">
          <div class="kv-item"><div class="kv-key">版本与延迟</div><div class="kv-val mono">${esc(ov.version || '-')} · ${ov.latencyMs != null ? `${ov.latencyMs}ms` : '-'}</div></div>
          <div class="kv-item"><div class="kv-key">鉴权与账户</div><div class="kv-val mono">${esc(ov.authMode || '-')} · ${esc(ov.account || '-')}</div></div>
          <div class="kv-item"><div class="kv-key">VikingDB 向量数</div><div class="kv-val mono">${ov.vikingdb?.vectorCount ?? '-'} (${esc(ov.vikingdb?.backend || '-')})</div></div>
          <div class="kv-item"><div class="kv-key">分布式锁</div><div class="kv-val mono">活跃 ${ov.locks?.active ?? 0} · 冲突 ${ov.locks?.conflicts ?? 0}</div></div>
        </div>
        ${ov.error ? `<div class="subsection"><p class="panel-desc">${esc(ov.error)}</p></div>` : ''}
        ${queueHtml}
        ${skillsHtml}
      </div>
    `);
  }

  if (mem.symbiote) {
    const sym = mem.symbiote;
    cards.push(`
      <div class="panel">
        <div class="panel-head">
          <div><h2>Symbiote 阅读台</h2><p class="panel-desc mono">${esc(sym.protocol || '')}</p></div>
          ${renderStatusCell(sym.enabled ? sym.status : 'standby')}
        </div>
        <div class="kv-grid">
          <div class="kv-item"><div class="kv-key">运行模式</div><div class="kv-val mono">${esc(sym.mode || '-')} (schema v${sym.schemaVersion ?? '-'})</div></div>
          <div class="kv-item"><div class="kv-key">探测延迟</div><div class="kv-val mono">${sym.latencyMs != null ? `${sym.latencyMs} ms` : '-'}</div></div>
          <div class="kv-item"><div class="kv-key">Vault / Mirror 文件</div><div class="kv-val mono">${sym.vaultFileCount ?? '-'} / ${sym.mirrorFileCount ?? '-'}</div></div>
          <div class="kv-item"><div class="kv-key">组件健康</div><div class="kv-val">DB ${sym.dbOk ? '正常' : '异常'} · Worker ${sym.workerAlive ? '在线' : '离线'} · Mirror ${sym.mirrorOk ? '正常' : '异常'}</div></div>
        </div>
        ${sym.degradedReason ? `<div class="subsection"><p class="panel-desc">降级原因：${esc(sym.degradedReason)}</p></div>` : ''}
      </div>
    `);
  }

  if (mem.rerank) {
    const rr = mem.rerank;
    cards.push(`
      <div class="panel">
        <div class="panel-head">
          <div><h2>Rerank Gateway</h2><p class="panel-desc mono">${esc(rr.protocol || '')}</p></div>
          ${renderStatusCell(rr.enabled ? rr.status : 'standby')}
        </div>
        <div class="kv-grid">
          <div class="kv-item"><div class="kv-key">重排模型</div><div class="kv-val mono">${esc(rr.model || '-')}</div></div>
          <div class="kv-item"><div class="kv-key">探测延迟</div><div class="kv-val mono">${rr.latencyMs != null ? `${rr.latencyMs} ms` : '-'}</div></div>
          <div class="kv-item"><div class="kv-key">最大 Token / Batch</div><div class="kv-val mono">${rr.maxTokens ?? '-'} / ${rr.batch ?? '-'}</div></div>
          <div class="kv-item"><div class="kv-key">单批 Token 上限</div><div class="kv-val mono">${rr.maxBatchTokens ?? '-'}</div></div>
        </div>
      </div>
    `);
  }

  $('memoryEnginesGrid').innerHTML = cards.join('');
}

function renderAgents(snap) {
  const magpie = snap.magpie || {};
  const agentsData = snap.agents || { totalProcesses: 0, processes: [], counts: {} };

  ensureAgentsGraph().setData(snap);

  $('agentsCountMeta').textContent = `活跃进程 ${agentsData.totalProcesses || 0} · 模型路由 ${magpie.totalModels || 0}`;

  const webLink = $('magpieWebLink');
  if (magpie.webUrl) {
    webLink.href = magpie.webUrl;
    webLink.hidden = false;
  } else {
    webLink.hidden = true;
  }

  $('magpieMetaDesc').textContent = magpie.reachable
    ? `${magpie.totalModels} 个可用模型（${magpie.reasoningModels} 个推理模型） · ${magpie.providers?.length || 0} 个上游渠道 · ${magpie.latencyMs ?? 0}ms`
    : (magpie.error || 'Magpie 网关未启用或暂不可达');

  const maxProvider = Math.max(1, ...(magpie.providers || []).map((p) => p.count));
  const providersHtml = (magpie.providers || []).length > 0
    ? (magpie.providers || []).slice(0, 10).map((p) => `
        <div class="provider-row">
          <span class="provider-name mono" title="${esc(p.name)}">${esc(p.name)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, Math.round((p.count / maxProvider) * 100))}%"></div></div>
          <span class="provider-count mono">${p.count}</span>
        </div>
      `).join('')
    : '<p class="panel-desc">暂无模型渠道数据。</p>';

  const agentsList = magpie.agents || [];
  const libLines = magpie.library?.summaryLines || [];
  const rightColHtml = `
    <h3 class="sub-title">已注册 Agent (${agentsList.length})</h3>
    ${agentsList.length > 0
      ? `<ul class="plain-list">${agentsList.slice(0, 8).map((a) => `<li><strong class="mono">${esc(a.name)}</strong><span class="cell-sub mono">${esc(a.model)}${a.detail ? ` · ${esc(a.detail)}` : ''}</span></li>`).join('')}</ul>`
      : '<p class="panel-desc">未检测到 magpie ls 注册项。</p>'}
    ${libLines.length > 0 ? `<div class="divider" style="margin:14px 0;"></div><h3 class="sub-title">Library 摘要</h3><ul class="plain-list mono">${libLines.slice(0, 6).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
  `;

  $('magpieContent').innerHTML = `
    <div class="magpie-col">
      <h3 class="sub-title">上游渠道模型分布</h3>
      ${providersHtml}
    </div>
    <div class="magpie-col">${rightColHtml}</div>
  `;

  const catSelect = $('agentCategoryFilter');
  const categories = [...new Set((agentsData.processes || []).map((p) => p.categoryLabel || p.category))];
  const prevVal = state.agentCategory;
  catSelect.innerHTML = `<option value="all">全部类别 (${agentsData.totalProcesses || 0})</option>`
    + categories.map((c) => `<option value="${esc(c)}"${prevVal === c ? ' selected' : ''}>${esc(c)}</option>`).join('');

  const list = (agentsData.processes || []).filter((p) => {
    if (state.agentCategory === 'all') return true;
    return (p.categoryLabel || p.category) === state.agentCategory;
  });

  $('agentsTableBody').innerHTML = list.length > 0
    ? list.map((p) => `
        <tr>
          <td class="mono">${p.pid}</td>
          <td>${esc(p.categoryLabel || p.category)}</td>
          <td class="mono">${esc(p.comm)}</td>
          <td class="mono">${Number(p.cpu || 0).toFixed(1)}%</td>
          <td class="mono">${formatBytes(p.memoryBytes)}</td>
          <td class="mono">${esc(p.elapsed || '-')}</td>
          <td class="mono" style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(p.cmd)}">${esc(p.cmd)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="7" class="empty-state">未匹配到活跃的 Agent 或运行时进程。</td></tr>';
}

function renderNetwork(snap) {
  const ts = snap.network?.tailscale || {};
  const mh = snap.network?.mihomo || {};
  const st = snap.network?.syncthing || {};
  const fw = snap.firewall || snap.network?.firewall || null;

  $('tailscaleMetaDesc').textContent = ts.reachable
    ? `状态 ${ts.backendState} · v${ts.version || '-'} · ${ts.onlineCount}/${ts.devices?.length || 0} 设备在线`
    : 'Tailscale CLI 不可达或未启用';

  const devices = ts.devices || [];
  $('tailscaleDevicesBody').innerHTML = devices.length > 0
    ? devices.map((d) => `
        <tr>
          <td><strong>${esc(d.name)}${d.isSelf ? ' (本机)' : ''}</strong><span class="cell-sub mono">${esc(d.dnsName || '')}</span></td>
          <td class="mono">${esc(d.ip || '-')}</td>
          <td>${esc(d.os || '-')}</td>
          <td>${renderStatusCell(d.online ? 'healthy' : 'standby', d.online ? '在线' : '离线')}</td>
          <td class="mono">${esc(d.curAddr || (d.relay ? `DERP ${d.relay}` : '-'))}</td>
          <td class="mono">${formatBytes(d.rxBytes)} / ${formatBytes(d.txBytes)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="6" class="empty-state">无 Tailscale 节点数据。</td></tr>';

  const serves = ts.serves || [];
  $('tailscaleServesList').innerHTML = serves.length > 0
    ? `<table class="data-table"><thead><tr><th>对外入口</th><th>路径</th><th>代理目标</th><th>范围</th></tr></thead><tbody>
        ${serves.map((s) => `<tr><td class="mono">${esc(s.url)}</td><td class="mono">${esc(s.path)}</td><td class="mono">${esc(s.target)}</td><td>${esc(s.scope || 'tailnet')}</td></tr>`).join('')}
      </tbody></table>`
    : '<p class="panel-desc">当前未配置 Tailscale Serve 规则。</p>';

  $('mihomoMetaDesc').textContent = mh.reachable
    ? `版本 ${mh.version || '-'}${mh.meta ? ' (Meta)' : ''} · 延迟 ${mh.latencyMs ?? 0}ms`
    : (mh.error || 'Mihomo 未启用或不可达');

  if (mh.reachable) {
    const selHtml = (mh.selectors || []).length > 0
      ? `<div class="divider"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>策略组</th><th>类型</th><th>当前节点</th><th>候选</th></tr></thead><tbody>
          ${mh.selectors.map((s) => `<tr><td>${esc(s.name)}</td><td class="mono">${esc(s.type)}</td><td class="mono">${esc(s.now)}</td><td class="mono">${s.candidates}</td></tr>`).join('')}
        </tbody></table></div>`
      : '';
    $('mihomoContent').innerHTML = `
      <div class="kv-grid">
        <div class="kv-item"><div class="kv-key">活跃连接数</div><div class="kv-val mono">${mh.activeConnections ?? 0}</div></div>
        <div class="kv-item"><div class="kv-key">累计下载 / 上传</div><div class="kv-val mono">${formatBytes(mh.downloadTotal)} / ${formatBytes(mh.uploadTotal)}</div></div>
      </div>
      ${selHtml}
    `;
  } else {
    $('mihomoContent').innerHTML = `<div class="empty-state">${esc(mh.error || 'Mihomo 控制器离线')}</div>`;
  }

  $('syncthingContent').innerHTML = st.enabled
    ? `<div class="kv-grid">
        <div class="kv-item"><div class="kv-key">Syncthing 状态</div><div class="kv-val">${renderStatusCell(st.status)}</div></div>
        <div class="kv-item"><div class="kv-key">延迟 / Node ID</div><div class="kv-val mono">${st.latencyMs != null ? `${st.latencyMs}ms` : '-'} · ${esc(st.myId || '健康接口')}</div></div>
      </div>`
    : '<div class="empty-state">Syncthing 连接器未启用。</div>';

  renderFirewall(fw);
  renderRemotesSection();
}

function postureBadge(posture) {
  if (posture === 'loopback') return renderStatusCell('healthy', '仅回环');
  if (posture === 'tailnet') return renderStatusCell('healthy', '仅 Tailnet');
  if (posture === 'tailnet-guarded') return renderStatusCell('healthy', '防火墙放行 Tailnet');
  if (posture === 'private') return renderStatusCell('healthy', '仅内网');
  if (posture === 'public' || posture === 'public-unfiltered') return renderStatusCell('failed', '公网监听');
  return renderStatusCell('standby', posture || '未知');
}

function renderFirewall(fw) {
  const panel = $('firewallPanel');
  if (!panel) return;
  if (!fw || fw.enabled === false) {
    $('firewallBadge').textContent = '未启用';
    $('firewallSummaryBar').innerHTML = '';
    $('firewallHint').hidden = true;
    $('firewallListenersBody').innerHTML = '<tr><td colspan="5" class="empty-state">防火墙只读采集未启用。</td></tr>';
    $('firewallRulesBody').innerHTML = '<tr><td colspan="6" class="empty-state">无规则数据。</td></tr>';
    return;
  }

  const sum = fw.summary || {};
  const filterPolicies = Object.entries(fw.policies || {})
    .filter(([k]) => k.startsWith('filter:'))
    .map(([k, v]) => `${k.replace(/^filter:/, '')}:${typeof v === 'object' && v ? (v.policy || '-') : v}`)
    .join(' / ');
  $('firewallMetaDesc').textContent = `${fw.protocol || '只读 iptables-save + ss'} · filter 默认策略 ${filterPolicies || '只读套接字模式'}`;
  $('firewallBadge').textContent = `${fw.backend || 'readonly'} · ${fw.totalRules ?? 0} 条规则`;

  const publicCount = Number(sum.publicUnfiltered || 0);
  $('firewallSummaryBar').innerHTML = `
    <div class="fw-stat"><div class="fw-stat-label">监听套接字</div><div class="fw-stat-val mono">${sum.totalListeners ?? 0}</div></div>
    <div class="fw-stat"><div class="fw-stat-label">仅回环</div><div class="fw-stat-val mono is-ok">${sum.loopback ?? 0}</div></div>
    <div class="fw-stat"><div class="fw-stat-label">Tailnet / 受保护</div><div class="fw-stat-val mono is-ok">${sum.tailnet ?? 0}</div></div>
    <div class="fw-stat"><div class="fw-stat-label">公网未防护</div><div class="fw-stat-val mono ${publicCount > 0 ? 'is-warn' : 'is-ok'}">${publicCount}</div></div>
    <div class="fw-stat"><div class="fw-stat-label">累计拦截包数</div><div class="fw-stat-val mono">${sum.droppedPackets ?? 0}</div></div>
  `;

  const hintEl = $('firewallHint');
  if (fw.permissionHint) {
    hintEl.textContent = fw.permissionHint;
    hintEl.hidden = false;
  } else {
    hintEl.hidden = true;
  }

  const postureRank = { public: 0, 'public-unfiltered': 0, 'tailnet-guarded': 1, tailnet: 2, private: 3, loopback: 4 };
  const listeners = Array.isArray(fw.listeners)
    ? [...fw.listeners].sort((a, b) => (postureRank[a.posture] ?? 5) - (postureRank[b.posture] ?? 5) || (a.port ?? 0) - (b.port ?? 0))
    : [];
  $('firewallListenersBody').innerHTML = listeners.length > 0
    ? listeners.slice(0, 45).map((l) => `
        <tr>
          <td class="mono">${esc(String(l.proto || 'tcp').toUpperCase())}</td>
          <td class="mono">${esc(l.bind || '-')}</td>
          <td class="mono">${esc(l.port ?? '-')}</td>
          <td class="mono">${esc(l.process || '-')}${l.pid ? ` (#${l.pid})` : ''}</td>
          <td>${postureBadge(l.posture)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" class="empty-state">未采集到监听套接字。</td></tr>';

  const rules = Array.isArray(fw.rules) ? fw.rules : [];
  $('firewallRulesBody').innerHTML = rules.length > 0
    ? rules.map((r) => {
        const target = String(r.target || '-').toUpperCase();
        const targetTone = target === 'DROP' || target === 'REJECT' ? 'degraded' : (target === 'ACCEPT' ? 'healthy' : 'standby');
        return `
          <tr>
            <td class="mono">${esc(r.family || 'ipv4')} / ${esc(r.chain || '-')}</td>
            <td class="mono">${esc(r.inIface || '*')}</td>
            <td class="mono">${esc(r.proto || 'all')}${r.dport ? ` :${esc(r.dport)}` : ''}</td>
            <td>${renderStatusCell(targetTone, target)}</td>
            <td class="mono">${esc(r.packets ?? 0)}</td>
            <td>${esc(r.comment || r.source || '-')}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="6" class="empty-state">暂无可读取的入站过滤规则（可按提示配置只读 sudoers）。</td></tr>';
}

function renderRemotesSection() {
  const box = $('remotesContent');
  if (state.remotes === null) {
    box.innerHTML = '<p class="panel-desc">点击右上角“探测远程节点”发起按需 SSH 巡检。</p>';
    return;
  }
  if (state.remotes.length === 0) {
    box.innerHTML = '<p class="panel-desc">未配置远程 SSH 节点。</p>';
    return;
  }
  box.innerHTML = `<ul class="plain-list">${state.remotes.map((r) => `
    <li>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <strong>${esc(r.name)} <span class="mono" style="font-weight:400;color:var(--muted);">(${esc(r.ip || r.id)})</span></strong>
        ${renderStatusCell(r.reachable ? 'healthy' : 'offline', r.reachable ? `在线 · ${r.rttMs}ms` : '离线')}
      </div>
      <span class="cell-sub mono">${r.reachable
        ? `负载 ${esc(r.load)} · 内存 ${esc(r.memory)} · 磁盘 ${esc(r.disk)} · 备份 ${esc(r.backup)}`
        : esc(r.error || '连接失败')}</span>
    </li>
  `).join('')}</ul>`;
}

function renderOps(snap) {
  const readOnly = Boolean(state.meta?.readOnly);
  const opsCfg = state.meta?.opsConfigured || {};
  const health = snap.health;
  const backup = snap.backup;
  const running = snap.runningJobs || [];

  const healthSummary = health
    ? `最近结果：${health.overall || health.status || '已记录'} · ${formatTimeShort(health.timestamp || health.ts)}`
    : '尚未读取到最近一次健康巡检记录';
  const backupSummary = backup
    ? `最近备份：${backup.status || (backup.ok ? '成功' : '已记录')} · ${formatTimeShort(backup.finished_at || backup.timestamp || backup.ts)}`
    : '尚未读取到最近一次备份记录';
  const runningNote = running.length > 0
    ? `运行中：${running.map((j) => `${j.name} (PID ${j.pid})`).join(', ')}`
    : '';

  $('opsActionPanel').innerHTML = `
    <div class="ops-action-row">
      <div>
        <div class="ops-action-title">全栈健康巡检</div>
        <div class="ops-action-meta">${esc(healthSummary)}</div>
      </div>
      <button type="button" class="btn-subtle" id="runHealthBtn"${readOnly || !opsCfg.health ? ' disabled' : ''}>执行巡检</button>
    </div>
    <div class="ops-action-row">
      <div>
        <div class="ops-action-title">触发数据备份</div>
        <div class="ops-action-meta">${esc(runningNote || backupSummary)}</div>
      </div>
      <button type="button" class="btn-primary" id="runBackupBtn"${readOnly || !opsCfg.backup ? ' disabled' : ''}>触发备份</button>
    </div>
  `;

  const timers = snap.timers || [];
  $('timersTableBody').innerHTML = timers.length > 0
    ? timers.map((t) => {
        const active = t.activeState === 'active';
        const nextStr = t.nextElapse && t.nextElapse !== 'n/a' ? t.nextElapse : '-';
        const actionCtrl = readOnly
          ? '<span class="cell-sub">只读</span>'
          : `<select class="action-select" data-timer-action="${esc(t.unit)}" data-timer-name="${esc(t.name)}" aria-label="控制定时任务 ${esc(t.name)}">
              <option value="">控制...</option>
              <option value="start">启动</option>
              <option value="stop">停止</option>
              <option value="enable">启用</option>
              <option value="disable">禁用</option>
            </select>`;
        return `
          <tr>
            <td><strong>${esc(t.name)}</strong><span class="cell-sub mono">${esc(t.unit)} · ${esc(t.schedule || t.scope)}</span></td>
            <td>${renderStatusCell(active ? 'healthy' : 'standby', active ? '活跃' : t.activeState)}</td>
            <td class="mono">${esc(nextStr)}</td>
            <td class="col-actions">${actionCtrl}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="4" class="empty-state">未配置受管定时任务。</td></tr>';

  renderIncidents();
}

function renderIncidents() {
  const body = $('incidentsTableBody');
  if (!body) return;
  const storageEl = $('incidentsStorageMeta');
  if (storageEl && state.incidentsStorage) {
    const st = state.incidentsStorage;
    storageEl.textContent = `持久化驱动 ${st.driver || '-'} · 样本 ${st.samples ?? 0} 条 · 活跃事件 ${st.openIncidents ?? 0} 条 · 磁盘占用 ${formatBytes(st.bytes)}`;
  }
  const items = Array.isArray(state.incidents) ? state.incidents : [];
  if (items.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty-state">暂无状态变更事件记录。</td></tr>';
    return;
  }
  body.innerHTML = items.map((inc) => `
    <tr>
      <td class="mono nowrap">${esc(formatTimeShort(inc.ts))}</td>
      <td class="mono">${esc(inc.kind || '-')}</td>
      <td><strong>${esc(inc.node || inc.entityKey || '-')}</strong><span class="cell-sub mono">${esc(inc.entityKey || '')}</span></td>
      <td>${renderStatusCell(inc.toState, `${inc.fromState || '-'} -> ${inc.toState || '-'}`)}</td>
      <td>${inc.resolvedAt ? renderStatusCell('healthy', `已恢复 ${formatTimeShort(inc.resolvedAt)}`) : renderStatusCell('degraded', '持续中')}</td>
      <td>${esc(inc.detail || '-')}</td>
    </tr>
  `).join('');
}

function renderAudit() {
  const body = $('auditTableBody');
  if (!state.audit || state.audit.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="empty-state">暂无操作审计记录。</td></tr>';
    return;
  }
  body.innerHTML = state.audit.map((a) => `
    <tr>
      <td class="mono">${esc(formatTimeShort(a.ts))}</td>
      <td class="mono">${esc(a.category || 'ops')}:${esc(a.action || '-')}</td>
      <td class="mono">${esc(a.target || '-')}</td>
      <td>${renderStatusCell(a.ok !== false ? 'healthy' : 'failed', a.ok !== false ? '成功' : '失败')}</td>
      <td class="mono">${a.durationMs != null ? `${a.durationMs}ms` : '-'}</td>
      <td class="mono">${esc(a.actor || 'web')}${a.ip ? ` · ${esc(a.ip)}` : ''}</td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(a.output || '')}">${esc(a.output || '-')}</td>
    </tr>
  `).join('');
}

function updateLogSourceButtons() {
  document.querySelectorAll('#logSourceSegment .seg-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.source === state.logSource);
  });
  const targetSel = $('logTargetSelect');
  const sinceSel = $('logSinceSelect');
  const streamBtn = $('logStreamBtn');
  targetSel.hidden = state.logSource === 'self' || state.logSource === 'audit';
  sinceSel.hidden = state.logSource !== 'journald';
  streamBtn.disabled = state.logSource === 'file' || state.logSource === 'audit';
}

function populateLogTargets() {
  const sel = $('logTargetSelect');
  const sources = state.meta?.logSources || { journald: [], files: [] };
  if (state.logSource === 'journald') {
    const opts = [
      '<option value="all">全部受管服务</option>',
      ...(sources.journald || []).map((u) => `<option value="${esc(u.unit)}">${esc(u.name)} (${esc(u.unit)})</option>`),
    ];
    sel.innerHTML = opts.join('');
    sel.value = [...sel.options].some((o) => o.value === state.logTarget) ? state.logTarget : 'all';
    state.logTarget = sel.value;
  } else if (state.logSource === 'file') {
    const files = sources.files || [];
    sel.innerHTML = files.length > 0
      ? files.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('')
      : '<option value="">无已配置日志文件</option>';
    state.logTarget = sel.value;
  }
}

function buildLogParams() {
  const params = new URLSearchParams();
  params.set('source', state.logSource);
  if (state.logSource === 'journald' && $('logTargetSelect').value) {
    params.set('unit', $('logTargetSelect').value);
    params.set('since', $('logSinceSelect').value);
  } else if (state.logSource === 'file' && $('logTargetSelect').value) {
    params.set('file', $('logTargetSelect').value);
  }
  params.set('level', $('logLevelSelect').value);
  const q = $('logQueryInput').value.trim();
  if (q) {
    params.set('q', q);
    if ($('logRegexToggle').checked) params.set('regex', '1');
  }
  params.set('lines', '200');
  return params;
}

function normalizeLogLevel(level) {
  return ['error', 'warn', 'info', 'debug'].includes(level) ? level : 'info';
}

function buildLogLineHtml(entry) {
  const lvl = normalizeLogLevel(entry.level);
  return `
    <div class="log-line">
      <span class="log-ts">${esc(formatTimeShort(entry.ts))}</span>
      <span class="log-lvl log-lvl-${lvl}">${lvl}</span>
      <span class="log-unit" title="${esc(entry.unit || '')}">${esc(entry.unit || '-')}</span>
      <span class="log-msg">${esc(entry.message || '')}</span>
    </div>
  `;
}

function updateLogSeverityUi(counts) {
  $('logSeverityStats').textContent = `总计 ${counts.total} 条 · ERROR ${counts.error} · WARN ${counts.warn} · INFO ${counts.info} · DEBUG ${counts.debug}`;
  const track = $('logSeverityTrack');
  if (counts.total > 0) {
    const pct = (n) => `${((n / counts.total) * 100).toFixed(1)}%`;
    track.innerHTML = [
      counts.error ? `<span class="sev-seg-err" style="width:${pct(counts.error)}"></span>` : '',
      counts.warn ? `<span class="sev-seg-warn" style="width:${pct(counts.warn)}"></span>` : '',
      counts.info ? `<span class="sev-seg-info" style="width:${pct(counts.info)}"></span>` : '',
      counts.debug ? `<span class="sev-seg-debug" style="width:${pct(counts.debug)}"></span>` : '',
    ].join('');
  } else {
    track.innerHTML = '';
  }
}

function renderLogEntries() {
  const viewport = $('logViewport');
  const entries = state.logEntries;
  const counts = { total: entries.length, error: 0, warn: 0, info: 0, debug: 0 };
  for (const e of entries) {
    counts[normalizeLogLevel(e.level)] += 1;
  }
  state.logSeverityCounts = counts;
  updateLogSeverityUi(counts);

  if (entries.length === 0) {
    viewport.innerHTML = '<div class="log-empty">当前筛选条件下暂无日志记录。</div>';
    return;
  }

  viewport.innerHTML = entries.map((e) => buildLogLineHtml(e)).join('');

  if ($('logAutoScroll').checked) {
    viewport.scrollTop = viewport.scrollHeight;
  }
}

function appendLogEntry(entry) {
  const viewport = $('logViewport');
  const counts = state.logSeverityCounts || { total: 0, error: 0, warn: 0, info: 0, debug: 0 };
  if (state.logEntries.length === 0) {
    const empty = viewport.querySelector('.log-empty');
    if (empty) empty.remove();
  }
  state.logEntries.push(entry);
  counts[normalizeLogLevel(entry.level)] += 1;
  counts.total += 1;

  viewport.insertAdjacentHTML('beforeend', buildLogLineHtml(entry));
  while (state.logEntries.length > 500) {
    const dropped = state.logEntries.shift();
    if (dropped) {
      counts[normalizeLogLevel(dropped.level)] = Math.max(0, counts[normalizeLogLevel(dropped.level)] - 1);
      counts.total = Math.max(0, counts.total - 1);
    }
    if (viewport.firstElementChild) viewport.firstElementChild.remove();
  }
  state.logSeverityCounts = counts;
  updateLogSeverityUi(counts);

  if ($('logAutoScroll').checked) {
    viewport.scrollTop = viewport.scrollHeight;
  }
}

async function runLogQuery() {
  stopLogStream();
  const params = buildLogParams();
  try {
    const data = await apiFetch(`/api/logs?${params.toString()}`);
    state.logEntries = Array.isArray(data.entries) ? data.entries : [];
    renderLogEntries();
    if (data.warning) showToast(data.warning);
  } catch (err) {
    showToast(`日志查询失败：${err.message}`, true);
  }
}

function stopLogStream() {
  if (state.logStream) {
    state.logStream.close();
    state.logStream = null;
  }
  const btn = $('logStreamBtn');
  btn.textContent = '开启实时流';
  const st = $('streamStatusText');
  st.textContent = '静态查询模式';
  st.classList.remove('is-connected');
}

function toggleLogStream() {
  if (state.logStream) {
    stopLogStream();
    return;
  }
  if (state.logSource !== 'journald' && state.logSource !== 'self') {
    showToast('当前日志源仅支持静态查询与导出');
    return;
  }
  const params = buildLogParams();
  const es = new EventSource(`/api/logs/stream?${params.toString()}`);
  state.logStream = es;
  state.logEntries = [];
  renderLogEntries();
  $('logStreamBtn').textContent = '停止实时流';
  const st = $('streamStatusText');
  st.textContent = '正在建立 SSE 流...';

  es.addEventListener('ready', () => {
    st.textContent = '实时流已连接';
    st.classList.add('is-connected');
  });
  es.addEventListener('log', (ev) => {
    try {
      const entry = JSON.parse(ev.data);
      appendLogEntry(entry);
    } catch {
      // ignore malformed frame
    }
  });
  es.addEventListener('warning', (ev) => {
    try {
      const info = JSON.parse(ev.data);
      showToast(info.message || '实时日志流提示', true);
    } catch {
      // ignore
    }
  });
  es.onerror = () => {
    if (!state.logStream) return;
    st.textContent = '流连接重连中...';
    st.classList.remove('is-connected');
  };
}

async function loadMeta() {
  const meta = await apiFetch('/api/meta');
  state.meta = meta;
  document.title = meta.title || 'Ops Console';
  $('brandTitle').textContent = meta.title || 'Ops Console';
  if (meta.subtitle) $('overviewSubtitle').textContent = meta.subtitle;
  $('logoutBtn').hidden = !meta.authEnabled;

  const modeFlags = [];
  if (meta.demo) modeFlags.push('Demo 沙盒');
  if (meta.readOnly) modeFlags.push('只读模式');
  const badge = $('brandMode');
  if (modeFlags.length > 0) {
    badge.textContent = modeFlags.join(' · ');
    badge.hidden = false;
    $('modeBanner').hidden = false;
    $('modeBannerText').textContent = meta.demo
      ? '当前运行于 Demo 沙盒模式：展示模拟全栈数据与合成 SSE 实时日志，所有操作均不会影响宿主机。'
      : '当前运行于只读观测模式：服务启停、定时器变更与脚本触发接口已锁定。';
  } else {
    badge.hidden = true;
    $('modeBanner').hidden = true;
  }
  updateLogSourceButtons();
  populateLogTargets();
}

async function loadSnapshot(force = false) {
  const btn = $('refreshBtn');
  btn.disabled = true;
  try {
    const snap = await apiFetch(`/api/snapshot${force ? '?refresh=1' : ''}`);
    state.snapshot = snap;
    if (Array.isArray(snap.incidents)) {
      state.incidents = snap.incidents;
    }
    $('syncStamp').textContent = `已同步 ${formatClock(snap.collectedAt)}`;
    renderActiveView(snap, { force });
  } catch (err) {
    showToast(`数据同步失败：${err.message}`, true);
  } finally {
    btn.disabled = false;
  }
}

async function loadRemotes(force = false) {
  const btn = $('refreshRemotesBtn');
  btn.disabled = true;
  try {
    const data = await apiFetch(`/api/remotes${force ? '?refresh=1' : ''}`);
    state.remotes = Array.isArray(data.nodes) ? data.nodes : [];
    renderRemotesSection();
  } catch (err) {
    showToast(`远程节点探测失败：${err.message}`, true);
  } finally {
    btn.disabled = false;
  }
}

async function loadAudit() {
  try {
    const data = await apiFetch('/api/audit?limit=80');
    state.audit = Array.isArray(data.items) ? data.items : [];
    renderAudit();
  } catch (err) {
    showToast(`读取审计记录失败：${err.message}`, true);
  }
}

async function loadIncidents() {
  try {
    const data = await apiFetch('/api/incidents?limit=60');
    state.incidents = Array.isArray(data.items) ? data.items : [];
    state.incidentsStorage = data.storage || null;
    renderIncidents();
    if (state.activeView === 'overview') {
      renderOverviewIncidents(state.incidents);
    }
  } catch (err) {
    showToast(`读取状态变更事件失败：${err.message}`, true);
  }
}

function setupPolling() {
  const reset = () => {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
    const ms = Number($('pollInterval').value || 0);
    if (ms > 0) {
      state.pollTimer = setInterval(() => {
        if (!document.hidden) loadSnapshot(false);
      }, ms);
    }
  };
  $('pollInterval').addEventListener('change', reset);
  reset();
}

function bindEvents() {
  window.addEventListener('scroll', () => {
    $('topbar').classList.toggle('is-scrolled', window.scrollY > 4);
  }, { passive: true });

  $('mainNav').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.nav-item');
    if (btn && btn.dataset.view) switchView(btn.dataset.view);
  });

  $('refreshBtn').addEventListener('click', () => loadSnapshot(true));

  $('logoutBtn').addEventListener('click', async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  });

  const graphFilterSeg = $('graphFilterSegment');
  if (graphFilterSeg) {
    graphFilterSeg.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.seg-item');
      if (!btn || !btn.dataset.graphFilter) return;
      state.graphFilter = btn.dataset.graphFilter;
      document.querySelectorAll('#graphFilterSegment .seg-item').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
      ensureOverviewGraph().setFilter(state.graphFilter);
      state.viewSignatures.overview = '';
    });
  }

  $('serviceLayerFilter').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.seg-item');
    if (!btn) return;
    state.serviceLayer = btn.dataset.layer || 'all';
    document.querySelectorAll('#serviceLayerFilter .seg-item').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
    });
    if (state.snapshot) renderServices(state.snapshot);
  });

  $('serviceStatusFilter').addEventListener('change', (ev) => {
    state.serviceStatus = ev.target.value;
    if (state.snapshot) renderServices(state.snapshot);
  });

  $('serviceSearch').addEventListener('input', (ev) => {
    state.serviceQuery = ev.target.value;
    if (state.snapshot) renderServices(state.snapshot);
  });

  $('servicesTableBody').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-jump-log]');
    if (btn) openServiceLogs(btn.dataset.jumpLog);
  });

  $('servicesTableBody').addEventListener('change', (ev) => {
    const sel = ev.target.closest('[data-svc-action]');
    if (!sel || !sel.value) return;
    const action = sel.value;
    const unit = sel.dataset.svcAction;
    const name = sel.dataset.svcName;
    const risk = sel.dataset.svcRisk;
    const isCritical = sel.dataset.svcCritical === '1';
    sel.value = '';
    openConfirm({
      title: `确认对 ${name} 执行 ${action}`,
      body: `目标 unit：${unit}。操作完成后将自动记录到审计日志并刷新状态。`,
      riskNote: risk || (isCritical ? '关键核心服务：将向服务端申请一次性确认令牌后执行。' : ''),
      onConfirm: async () => {
        try {
          let confirmToken = '';
          if (isCritical) {
            const issued = await apiFetch('/api/actions/confirm-token', {
              method: 'POST',
              body: JSON.stringify({ unit, action }),
            });
            confirmToken = issued.confirmToken || '';
          }
          await apiFetch('/api/services/control', {
            method: 'POST',
            body: JSON.stringify(confirmToken ? { unit, action, confirmToken } : { unit, action }),
          });
          showToast(`已对 ${name} 执行 ${action}`);
          await loadSnapshot(true);
        } catch (err) {
          showToast(`操作失败：${err.message}`, true);
        }
      },
    });
  });

  $('memoryProviderSelect').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.seg-item');
    if (!btn) return;
    state.memoryProvider = btn.dataset.provider || 'all';
    document.querySelectorAll('#memoryProviderSelect .seg-item').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
    });
  });

  $('memorySearchForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const q = $('memorySearchInput').value.trim();
    if (!q) return;
    const btn = $('memorySearchBtn');
    const area = $('memorySearchResults');
    btn.disabled = true;
    area.hidden = false;
    area.innerHTML = '<p class="panel-desc">正在通过官方接口召回结果...</p>';
    try {
      const params = new URLSearchParams({ provider: state.memoryProvider, q, limit: '10' });
      const data = await apiFetch(`/api/memory/search?${params.toString()}`);
      const items = data.items || [];
      if (items.length === 0) {
        area.innerHTML = '<p class="panel-desc">未检索到匹配的记忆或上下文条目。</p>';
      } else {
        area.innerHTML = items.map((item) => `
          <div class="search-hit">
            <div class="search-hit-head">
              <span class="search-hit-title">${esc(item.title || item.uri || '未命名条目')}</span>
              <span class="search-hit-meta mono">${esc(item.provider)}${item.score != null ? ` · score ${Number(item.score).toFixed(3)}` : ''}</span>
            </div>
            <p class="search-hit-body">${esc(item.snippet || item.uri || '')}</p>
          </div>
        `).join('');
      }
    } catch (err) {
      area.innerHTML = `<p class="panel-desc">检索失败：${esc(err.message)}</p>`;
    } finally {
      btn.disabled = false;
    }
  });

  $('memoryDoctorBtn').addEventListener('click', async () => {
    const btn = $('memoryDoctorBtn');
    const box = $('memoryDoctorOutput');
    btn.disabled = true;
    box.hidden = false;
    box.innerHTML = '<pre class="code-output mono" style="margin:0;">正在运行 nmem doctor 与 OpenViking 健康诊断...</pre>';
    try {
      const data = await apiFetch('/api/memory/doctor?provider=all');
      box.innerHTML = `<pre class="code-output mono" style="margin:0;">${esc(JSON.stringify(data, null, 2))}</pre>`;
    } catch (err) {
      box.innerHTML = `<pre class="code-output mono" style="margin:0;">诊断失败：${esc(err.message)}</pre>`;
    } finally {
      btn.disabled = false;
    }
  });

  $('agentCategoryFilter').addEventListener('change', (ev) => {
    state.agentCategory = ev.target.value;
    if (state.snapshot) renderAgents(state.snapshot);
  });

  $('refreshRemotesBtn').addEventListener('click', () => loadRemotes(true));

  $('logSourceSegment').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.seg-item');
    if (!btn) return;
    state.logSource = btn.dataset.source;
    updateLogSourceButtons();
    populateLogTargets();
    runLogQuery();
  });

  $('logTargetSelect').addEventListener('change', () => {
    state.logTarget = $('logTargetSelect').value;
    runLogQuery();
  });

  $('logSinceSelect').addEventListener('change', () => runLogQuery());
  $('logLevelSelect').addEventListener('change', () => runLogQuery());
  $('logQueryBtn').addEventListener('click', () => runLogQuery());
  $('logQueryInput').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      runLogQuery();
    }
  });
  $('logStreamBtn').addEventListener('click', () => toggleLogStream());

  $('logExportSelect').addEventListener('change', (ev) => {
    const fmt = ev.target.value;
    ev.target.value = '';
    if (!fmt) return;
    const params = buildLogParams();
    params.set('format', fmt);
    window.location.href = `/api/logs/export?${params.toString()}`;
  });

  $('opsActionPanel').addEventListener('click', async (ev) => {
    if (ev.target.id === 'runHealthBtn') {
      const btn = ev.target;
      btn.disabled = true;
      const out = $('opsCommandOutput');
      out.hidden = false;
      out.textContent = '正在执行全栈健康巡检...';
      try {
        const data = await apiFetch('/api/ops/health', { method: 'POST', body: '{}' });
        out.textContent = data.output || '健康巡检已完成';
        showToast('健康巡检执行完成');
        await Promise.all([loadSnapshot(true), loadAudit()]);
      } catch (err) {
        out.textContent = `巡检失败：${err.message}`;
        showToast(`巡检失败：${err.message}`, true);
      } finally {
        btn.disabled = false;
      }
    } else if (ev.target.id === 'runBackupBtn') {
      openConfirm({
        title: '确认触发后台备份任务',
        body: '将在宿主机后台启动预设备份脚本，执行结果会自动记入审计日志。',
        onConfirm: async () => {
          try {
            const data = await apiFetch('/api/ops/backup', { method: 'POST', body: '{}' });
            showToast(data.message || '后台备份任务已启动');
            await Promise.all([loadSnapshot(true), loadAudit()]);
          } catch (err) {
            showToast(`触发备份失败：${err.message}`, true);
          }
        },
      });
    }
  });

  $('timersTableBody').addEventListener('change', (ev) => {
    const sel = ev.target.closest('[data-timer-action]');
    if (!sel || !sel.value) return;
    const action = sel.value;
    const unit = sel.dataset.timerAction;
    const name = sel.dataset.timerName;
    sel.value = '';
    openConfirm({
      title: `确认对定时任务 ${name} 执行 ${action}`,
      body: `目标 timer：${unit}。变更将即时生效并写入审计日志。`,
      onConfirm: async () => {
        try {
          await apiFetch('/api/timers/control', {
            method: 'POST',
            body: JSON.stringify({ unit, action }),
          });
          showToast(`已对 ${name} 执行 ${action}`);
          await Promise.all([loadSnapshot(true), loadAudit()]);
        } catch (err) {
          showToast(`定时任务操作失败：${err.message}`, true);
        }
      },
    });
  });

  $('refreshAuditBtn').addEventListener('click', () => loadAudit());
  const refreshIncBtn = $('refreshIncidentsBtn');
  if (refreshIncBtn) {
    refreshIncBtn.addEventListener('click', () => loadIncidents());
  }

  // Fleet map & probe controls
  $('mapRegionSegment').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.seg-item');
    if (!btn || !btn.dataset.region) return;
    document.querySelectorAll('#mapRegionSegment .seg-item').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
    });
    ensureMapController().setRegion(btn.dataset.region);
  });

  $('mapZoomIn').addEventListener('click', () => ensureMapController().zoom(0.75));
  $('mapZoomOut').addEventListener('click', () => ensureMapController().zoom(1.33));

  $('fleetTypeFilter').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.seg-item');
    if (!btn || !btn.dataset.type) return;
    state.fleetTypeFilter = btn.dataset.type;
    document.querySelectorAll('#fleetTypeFilter .seg-item').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
    });
    if (state.snapshot) renderFleet(state.snapshot);
  });

  const handleRevokeClick = (btn) => {
    const id = btn.dataset.revokeProbe;
    const name = btn.dataset.revokeName || id;
    openConfirm({
      title: `确认吊销探针 ${name}`,
      body: `节点 ${id} 的推送令牌将立即失效，后续上报请求会被服务端拒绝。`,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/probes/${encodeURIComponent(id)}`, { method: 'DELETE' });
          showToast(`已吊销 ${id} 的探针令牌`);
          await Promise.all([loadEnrolledProbes(), loadSnapshot(true)]);
        } catch (err) {
          showToast(`吊销失败：${err.message}`, true);
        }
      },
    });
  };

  $('fleetTableBody').addEventListener('click', (ev) => {
    const inspectBtn = ev.target.closest('[data-inspect-node]');
    if (inspectBtn) {
      selectFleetNode(inspectBtn.dataset.inspectNode, { focusOnMap: true });
      return;
    }
    const revokeBtn = ev.target.closest('[data-revoke-probe]');
    if (revokeBtn) handleRevokeClick(revokeBtn);
  });

  $('enrolledProbesList').addEventListener('click', (ev) => {
    const revokeBtn = ev.target.closest('[data-revoke-probe]');
    if (revokeBtn) handleRevokeClick(revokeBtn);
  });

  $('enrollCityPreset').addEventListener('change', (ev) => {
    const raw = ev.target.value;
    if (!raw) return;
    const [region, lat, lon] = raw.split('|');
    $('enrollRegion').value = region || '';
    $('enrollLat').value = lat || '';
    $('enrollLon').value = lon || '';
  });

  $('enrollProbeForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = $('enrollProbeBtn');
    btn.disabled = true;
    try {
      const deviceType = $('enrollDeviceType').value;
      const payload = {
        id: $('enrollNodeId').value.trim().toLowerCase(),
        name: $('enrollNodeName').value.trim(),
        deviceType,
        probeMode: deviceType === 'mobile' ? 'checkin' : 'push',
        region: $('enrollRegion').value.trim(),
      };
      if ($('enrollLat').value !== '') payload.lat = Number($('enrollLat').value);
      if ($('enrollLon').value !== '') payload.lon = Number($('enrollLon').value);

      const data = await apiFetch('/api/probes/enroll', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      state.lastEnrollResult = data;
      state.enrollSnippetTab = deviceType === 'laptop'
        ? 'macosLaunchAgent'
        : (deviceType === 'mobile' ? 'mobileCheckinCurl' : 'linuxSystemd');
      renderEnrollSnippet();
      $('enrollProbeForm').reset();
      showToast(`已为 ${data.node.id} 签发一次性探针令牌`);
      await Promise.all([loadEnrolledProbes(), loadSnapshot(true)]);
      selectFleetNode(data.node.id, { focusOnMap: true });
    } catch (err) {
      showToast(`签发失败：${err.message}`, true);
    } finally {
      btn.disabled = Boolean(state.meta?.readOnly);
    }
  });

  $('enrollSnippetTabs').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.seg-item');
    if (!btn || !btn.dataset.snippet) return;
    state.enrollSnippetTab = btn.dataset.snippet;
    renderEnrollSnippet();
  });

  $('copyEnrollSnippetBtn').addEventListener('click', async () => {
    const text = $('enrollSnippetCode').textContent || '';
    if (!text) return;
    try {
      await copyText(text);
      showToast('安装命令已复制到剪贴板');
    } catch {
      showToast('剪贴板复制失败，请手动选中复制', true);
    }
  });

  $('mobileCheckinForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = $('mobileCheckinBtn');
    const notice = $('mobileCheckinResult');
    btn.disabled = true;
    notice.hidden = true;
    try {
      const t0 = performance.now();
      await fetch('/api/ping', { credentials: 'same-origin', cache: 'no-store' });
      const rttMs = Math.max(1, Math.round(performance.now() - t0));

      let battery = null;
      if (typeof navigator.getBattery === 'function') {
        try {
          const b = await navigator.getBattery();
          battery = {
            percent: Math.round((b.level || 0) * 100),
            charging: Boolean(b.charging),
            source: b.charging ? 'AC Power' : 'Battery',
          };
        } catch {
          // Battery API unavailable
        }
      }

      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const network = conn?.effectiveType ? { type: String(conn.effectiveType).toUpperCase() } : null;
      const ua = navigator.userAgent || '';
      const platform = /Android/i.test(ua) ? 'android' : (/iPhone|iPad|iOS/i.test(ua) ? 'ios' : 'mobile-web');

      const nodeId = $('checkinNodeId').value.trim().toLowerCase();
      const data = await apiFetch('/api/probes/checkin', {
        method: 'POST',
        body: JSON.stringify({
          nodeId,
          deviceType: 'mobile',
          platform,
          region: $('checkinRegion').value.trim(),
          note: $('checkinNote').value.trim() || '移动端 Web 签到',
          battery,
          network,
          hubRttMs: rttMs,
        }),
      });
      notice.className = 'inline-notice';
      notice.textContent = `节点 ${data.nodeId} 签到成功（RTT ${rttMs}ms${battery ? `，电量 ${battery.percent}%` : ''}，时间 ${formatClock(data.receivedAt)}）`;
      notice.hidden = false;
      showToast(`移动端节点 ${data.nodeId} 已签到`);
      await loadSnapshot(true);
      selectFleetNode(data.nodeId, { focusOnMap: true });
    } catch (err) {
      notice.className = 'inline-notice is-error';
      notice.textContent = `签到失败：${err.message}`;
      notice.hidden = false;
      showToast(`签到失败：${err.message}`, true);
    } finally {
      btn.disabled = false;
    }
  });

  $('confirmCancel').addEventListener('click', () => {
    state.pendingConfirm = null;
    $('confirmModal').close();
  });

  $('confirmOk').addEventListener('click', async () => {
    const fn = state.pendingConfirm;
    state.pendingConfirm = null;
    $('confirmModal').close();
    if (fn) await fn();
  });
}

async function boot() {
  initTheme();
  bindEvents();
  try {
    await loadMeta();
    await loadSnapshot(false);
    setupPolling();
  } catch (err) {
    showToast(`初始化失败：${err.message}`, true);
  }
}

boot();
