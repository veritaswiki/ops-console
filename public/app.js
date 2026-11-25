const state = {
  meta: null,
  snapshot: null,
  remotes: null,
  audit: [],
  activeView: 'overview',
  serviceLayer: 'all',
  serviceStatus: 'all',
  serviceQuery: '',
  agentCategory: 'all',
  memoryProvider: 'all',
  logSource: 'journald',
  logTarget: 'all',
  logEntries: [],
  logStream: null,
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
    throw new Error(data.error || `Request failed (${res.status})`);
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
    if (state.snapshot) renderTopology(state.snapshot);
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
  }
  if (viewName === 'logs' && state.logEntries.length === 0) {
    runLogQuery();
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

function renderTopology(snap) {
  const wrap = $('topologyWrap');
  const layers = snap.services?.layers || [];
  const items = snap.services?.items || [];
  if (layers.length === 0 || items.length === 0) {
    wrap.innerHTML = '<div class="empty-state">尚未配置分层服务拓扑。</div>';
    return;
  }

  const cs = getComputedStyle(document.documentElement);
  const cSurface = cs.getPropertyValue('--surface').trim();
  const cSubtle = cs.getPropertyValue('--surface-subtle').trim();
  const cBorder = cs.getPropertyValue('--border').trim();
  const cInk = cs.getPropertyValue('--ink').trim();
  const cMuted = cs.getPropertyValue('--muted').trim();
  const cOk = cs.getPropertyValue('--ok').trim();
  const cWarn = cs.getPropertyValue('--warn').trim();
  const cErr = cs.getPropertyValue('--err').trim();

  const width = 1160;
  const leftCol = 164;
  const padX = 16;
  const gapX = 10;
  const gapY = 10;
  const cols = 4;
  const nodeW = Math.floor((width - leftCol - padX * 2 - gapX * (cols - 1)) / cols);
  const nodeH = 52;
  const lanePadY = 14;
  const laneGap = 14;

  let cursorY = 8;
  const laneLayouts = layers.map((layer) => {
    const list = items.filter((s) => s.layer === layer.id);
    const rows = Math.max(1, Math.ceil(list.length / cols));
    const laneH = lanePadY * 2 + rows * nodeH + (rows - 1) * gapY;
    const layout = { layer, list, y: cursorY, h: laneH };
    cursorY += laneH + laneGap;
    return layout;
  });
  const totalH = Math.max(160, cursorY);

  const colorFor = (status) => {
    if (status === 'healthy') return cOk;
    if (status === 'degraded') return cWarn;
    if (status === 'standby') return cMuted;
    return cErr;
  };

  let svg = `<svg class="topology-svg" viewBox="0 0 ${width} ${totalH}" role="img" aria-label="系统四层架构拓扑图">`;

  for (let i = 0; i < laneLayouts.length - 1; i += 1) {
    const cur = laneLayouts[i];
    const nxt = laneLayouts[i + 1];
    const xLine = leftCol + 24;
    svg += `<line x1="${xLine}" y1="${cur.y + cur.h}" x2="${xLine}" y2="${nxt.y}" stroke="${cBorder}" stroke-width="1.5" stroke-dasharray="3 3" />`;
  }

  for (const lane of laneLayouts) {
    svg += `<rect x="1" y="${lane.y}" width="${width - 2}" height="${lane.h}" rx="8" fill="${cSubtle}" stroke="${cBorder}" stroke-width="1" />`;
    svg += `<text x="18" y="${lane.y + 30}" fill="${cInk}" font-size="14" font-weight="600">${esc(lane.layer.label)}</text>`;
    svg += `<text x="18" y="${lane.y + 50}" fill="${cMuted}" font-size="13">${lane.list.filter((s) => s.status === 'healthy').length}/${lane.list.length} 健康</text>`;

    lane.list.forEach((svc, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = leftCol + padX + col * (nodeW + gapX);
      const y = lane.y + lanePadY + row * (nodeH + gapY);
      const stColor = colorFor(svc.status);
      const portText = formatCompactPort(svc.ports, svc.scope || 'user');
      const latText = svc.probe?.latencyMs ? `${svc.probe.latencyMs}ms` : (svc.status === 'standby' ? 'standby' : svc.activeState);
      const shortName = svc.name.length > 17 ? `${svc.name.slice(0, 16)}...` : svc.name;
      const subRaw = `${portText} · ${latText}`;
      const subText = subRaw.length > 26 ? `${subRaw.slice(0, 25)}...` : subRaw;
      svg += `<g class="topo-node" data-unit="${esc(svc.unit)}" tabindex="0" role="button" aria-label="${esc(svc.name)} ${esc(svc.status)}">`;
      svg += `<rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="6" fill="${cSurface}" stroke="${cBorder}" stroke-width="1" />`;
      svg += `<circle cx="${x + 14}" cy="${y + 20}" r="4" fill="${stColor}" />`;
      svg += `<text x="${x + 25}" y="${y + 24}" fill="${cInk}" font-size="13" font-weight="600">${esc(shortName)}</text>`;
      svg += `<text x="${x + 25}" y="${y + 42}" fill="${cMuted}" font-size="13" font-family="IBM Plex Mono, monospace">${esc(subText)}</text>`;
      svg += `</g>`;
    });
  }

  svg += '</svg>';
  wrap.innerHTML = svg;
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
  const modelsTotal = magpie.totalModels ?? 0;
  $('kpiNetwork').textContent = `${tsOnline}/${tsTotal} · ${modelsTotal}`;
  $('kpiNetworkSub').textContent = `Tailscale 在线设备 · Magpie 路由模型数`;

  renderTopology(snap);

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

    const actionCtrl = readOnly
      ? '<span class="cell-sub">只读</span>'
      : `<select class="action-select" data-svc-action="${esc(svc.unit)}" data-svc-name="${esc(svc.name)}" data-svc-risk="${esc(svc.riskNote || '')}" aria-label="控制 ${esc(svc.name)}">
          <option value="">控制...</option>
          <option value="restart">重启</option>
          <option value="start">启动</option>
          <option value="stop">停止</option>
          <option value="reload">重载</option>
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

  renderRemotesSection();
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

function renderLogEntries() {
  const viewport = $('logViewport');
  const entries = state.logEntries;
  const counts = { total: entries.length, error: 0, warn: 0, info: 0, debug: 0 };
  for (const e of entries) {
    if (counts[e.level] !== undefined) counts[e.level] += 1;
    else counts.info += 1;
  }

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

  if (entries.length === 0) {
    viewport.innerHTML = '<div class="log-empty">当前筛选条件下暂无日志记录。</div>';
    return;
  }

  viewport.innerHTML = entries.map((e) => {
    const lvl = ['error', 'warn', 'info', 'debug'].includes(e.level) ? e.level : 'info';
    return `
      <div class="log-line">
        <span class="log-ts">${esc(formatTimeShort(e.ts))}</span>
        <span class="log-lvl log-lvl-${lvl}">${lvl}</span>
        <span class="log-unit" title="${esc(e.unit || '')}">${esc(e.unit || '-')}</span>
        <span class="log-msg">${esc(e.message || '')}</span>
      </div>
    `;
  }).join('');

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
      state.logEntries.push(entry);
      if (state.logEntries.length > 500) {
        state.logEntries.splice(0, state.logEntries.length - 500);
      }
      renderLogEntries();
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
    $('syncStamp').textContent = `已同步 ${formatClock(snap.collectedAt)}`;
    renderOverview(snap);
    renderServices(snap);
    renderMemory(snap);
    renderAgents(snap);
    renderNetwork(snap);
    renderOps(snap);
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

  $('topologyWrap').addEventListener('click', (ev) => {
    const node = ev.target.closest('.topo-node');
    if (node && node.dataset.unit) openServiceLogs(node.dataset.unit);
  });

  $('topologyWrap').addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const node = ev.target.closest('.topo-node');
    if (node && node.dataset.unit) {
      ev.preventDefault();
      openServiceLogs(node.dataset.unit);
    }
  });

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
    sel.value = '';
    openConfirm({
      title: `确认对 ${name} 执行 ${action}`,
      body: `目标 unit：${unit}。操作完成后将自动记录到审计日志并刷新状态。`,
      riskNote: risk,
      onConfirm: async () => {
        try {
          await apiFetch('/api/services/control', {
            method: 'POST',
            body: JSON.stringify({ unit, action }),
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
