import React from 'react';
import { Drawer } from 'vaul';
import { Switch, SwitchThumb } from '@ui-sdk/react/switch';
import {
  Activity,
  CheckCircle2,
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Terminal,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import type {
  PluginCatalogItem,
  PluginsResponse,
  PluginTestResult,
  ToastHandler,
} from '../types';
import {
  addCustomPlugin,
  copyToClipboard,
  fetchPlugins,
  removeCustomPlugin,
  testPlugin,
  togglePlugin,
  updatePluginConfig,
} from '../api';
import { cn, FOCUS_RING } from '../lib/cn';
import { extractErrorMessage, guardReadOnly } from '../lib/ux-errors';
import { buildPluginsExportPayload } from '../lib/module-helpers';
import { ModuleFrame } from '../modules/ModuleFrame';
import {
  Button,
  CopyAction,
  type ConfirmModalState,
  EmptyState,
  ErrorState,
  inputBaseClass,
  KpiStrip,
  Panel,
  SegmentedFilter,
  StatusIndicator,
} from '../components/ui';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'enabled', label: '已启用' },
  { value: 'disabled', label: '已停用' },
  { value: 'unhealthy', label: '异常' },
] as const;

type PluginStatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]['value'];

const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'mcp', label: 'MCP' },
  { value: 'agent', label: 'Agent' },
  { value: 'gateway', label: '模型网关' },
  { value: 'memory', label: '记忆引擎' },
  { value: 'network', label: '网络与安全' },
  { value: 'infra', label: '基础设施' },
  { value: 'custom', label: '自定义' },
] as const;

type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]['value'];

const CATEGORY_LABELS: Record<string, string> = {
  mcp: 'MCP 协议',
  agent: 'Agent 运行时',
  gateway: '模型网关',
  memory: '记忆引擎',
  network: '网络与安全',
  infra: '基础设施',
  custom: '自定义服务',
};

const SOURCE_LABELS: Record<string, string> = {
  builtin: '官方内置',
  'user-custom': '自定义接入',
  external: '外部插件',
};

const CUSTOM_KIND_OPTIONS = [
  {
    value: 'mcp' as const,
    label: 'MCP Server',
    protocol: 'MCP 2025-03-26 Streamable HTTP (JSON-RPC 2.0)',
    placeholderUrl: 'http://127.0.0.1:8000/mcp',
    defaultHealthPath: '',
    hint: '将按官方规范发送 initialize、tools/list 与 resources/list 握手请求。',
  },
  {
    value: 'agent' as const,
    label: 'Agent 运行时 (A2A)',
    protocol: 'A2A Agent Card (/.well-known/agent.json) + HTTP /health',
    placeholderUrl: 'http://127.0.0.1:8088',
    defaultHealthPath: '/health',
    hint: '自动发现 /.well-known/agent.json 能力卡片并探测健康端点。',
  },
  {
    value: 'gateway' as const,
    label: 'OpenAI 兼容网关',
    protocol: 'OpenAI REST API (GET /v1/models)',
    placeholderUrl: 'http://127.0.0.1:11434',
    defaultHealthPath: '',
    hint: '兼容 Ollama、vLLM、LiteLLM、LM Studio 与 OpenAI 标准接口。',
  },
  {
    value: 'custom' as const,
    label: '通用 HTTP 服务',
    protocol: 'HTTP/HTTPS Health Probe',
    placeholderUrl: 'http://127.0.0.1:9000',
    defaultHealthPath: '/health',
    hint: '标准 HTTP/HTTPS 健康检查探针，支持可选 Bearer Token。',
  },
];

const CLI_SNIPPETS = [
  {
    label: '列出所有插件与启用状态',
    cmd: 'ops-console plugin list',
  },
  {
    label: '脚手架生成标准外部插件',
    cmd: 'ops-console plugin scaffold my-mcp-server --category mcp',
  },
  {
    label: '启用或停用指定插件',
    cmd: 'ops-console plugin enable mcp-server',
  },
];

export function PluginsView({
  readOnly,
  onSnapshotChanged,
  onToast,
  onConfirm,
}: {
  readOnly: boolean;
  onSnapshotChanged: () => void;
  onToast: ToastHandler;
  onConfirm: (state: ConfirmModalState) => void;
}) {
  const [catalog, setCatalog] = React.useState<PluginsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadError, setLoadError] = React.useState('');
  const [category, setCategory] = React.useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = React.useState<PluginStatusFilter>('all');
  const [query, setQuery] = React.useState('');

  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [batchProgress, setBatchProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [testResults, setTestResults] = React.useState<Record<string, PluginTestResult>>({});

  // Config Drawer state
  const [editingPlugin, setEditingPlugin] = React.useState<PluginCatalogItem | null>(null);
  const lastEditingPluginRef = React.useRef<PluginCatalogItem | null>(null);
  if (editingPlugin) lastEditingPluginRef.current = editingPlugin;
  const activeEditingPlugin = editingPlugin ?? lastEditingPluginRef.current;
  const [configDraft, setConfigDraft] = React.useState<Record<string, unknown>>({});
  const [savingConfig, setSavingConfig] = React.useState(false);

  // Add Custom Service Drawer state
  const [addOpen, setAddOpen] = React.useState(false);
  const [addKind, setAddKind] = React.useState<'mcp' | 'agent' | 'gateway' | 'custom'>('mcp');
  const [addName, setAddName] = React.useState('');
  const [addUrl, setAddUrl] = React.useState('');
  const [addHealthPath, setAddHealthPath] = React.useState('');
  const [addToken, setAddToken] = React.useState('');
  const [addDesc, setAddDesc] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const loadCatalog = React.useCallback(async (force = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRefreshing(true);
    setLoadError('');
    try {
      const data = await fetchPlugins(force, controller.signal);
      if (!controller.signal.aborted) {
        setCatalog(data);
      }
    } catch (err) {
      if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
      const msg = (err as Error).message || '插件目录加载失败';
      setLoadError(msg);
      onToast(`加载插件目录失败：${msg}`, 'err');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [onToast]);

  React.useEffect(() => {
    void loadCatalog(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [loadCatalog]);

  const items = catalog?.items || [];
  const summary = catalog?.summary || { total: 0, enabled: 0, healthy: 0, custom: 0 };

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (statusFilter === 'enabled' && !item.enabled) return false;
      if (statusFilter === 'disabled' && item.enabled) return false;
      if (statusFilter === 'unhealthy' && (!item.enabled || item.reachable)) return false;
      if (!q) return true;
      const haystack = [
        item.id,
        item.name,
        item.description,
        item.category,
        item.officialSpec?.protocol || '',
        ...(item.officialSpec?.endpoints || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, category, statusFilter, query]);

  const handleToggle = async (plugin: PluginCatalogItem, nextEnabled: boolean) => {
    if (guardReadOnly(readOnly, onToast, nextEnabled ? '启用插件' : '停用插件')) return;
    const prevEnabled = plugin.enabled;
    const prevCatalog = catalog;
    if (catalog) {
      const nextItems = catalog.items.map((item) =>
        item.id === plugin.id
          ? {
              ...item,
              enabled: nextEnabled,
              status: nextEnabled ? item.status || 'healthy' : 'disabled',
            }
          : item,
      );
      const nextEnabledCount = nextItems.filter((i) => i.enabled).length;
      const nextHealthyCount = nextItems.filter((i) => i.enabled && i.reachable).length;
      setCatalog({
        ...catalog,
        items: nextItems,
        summary: {
          ...catalog.summary,
          enabled: nextEnabledCount,
          healthy: nextHealthyCount,
        },
      });
    }
    setTogglingId(plugin.id);
    try {
      await togglePlugin(plugin.id, nextEnabled);
      void loadCatalog(true);
      onSnapshotChanged();
      onToast(`${plugin.name} 已${nextEnabled ? '启用' : '停用'}`, 'ok', {
        action: {
          label: '撤销',
          onClick: async () => {
            try {
              await togglePlugin(plugin.id, prevEnabled);
              void loadCatalog(true);
              onSnapshotChanged();
              onToast(`已恢复 ${plugin.name} 为${prevEnabled ? '启用' : '停用'}`, 'info');
            } catch (undoErr) {
              onToast(extractErrorMessage(undoErr, '撤销失败'), 'err');
            }
          },
        },
      });
    } catch (err) {
      if (prevCatalog) setCatalog(prevCatalog);
      onToast(extractErrorMessage(err, '切换插件状态失败'), 'err');
    } finally {
      setTogglingId(null);
    }
  };

  const handleTest = async (plugin: PluginCatalogItem, overrideCfg?: Record<string, unknown>) => {
    setTestingId(plugin.id);
    try {
      const res = await testPlugin(plugin.id, overrideCfg);
      setTestResults((prev) => ({ ...prev, [plugin.id]: res }));
      if (res.ok) {
        onToast(`${plugin.name} 协议握手通过（${res.latencyMs ?? 0}ms）`, 'ok');
      } else {
        onToast(`${plugin.name} 连通性异常：${res.error || res.summary}`, 'err');
      }
    } catch (err) {
      onToast(`测试失败：${(err as Error).message}`, 'err');
    } finally {
      setTestingId(null);
    }
  };

  const handleBatchHealthCheck = async () => {
    const enabledPlugins = items.filter((i) => i.enabled);
    if (enabledPlugins.length === 0) {
      onToast('当前没有已启用的插件可供巡检', 'info');
      return;
    }
    setBatchProgress({ done: 0, total: enabledPlugins.length });
    let passed = 0;
    try {
      await Promise.all(
        enabledPlugins.map(async (plugin) => {
          try {
            const res = await testPlugin(plugin.id);
            if (res.ok) passed += 1;
            setTestResults((prev) => ({ ...prev, [plugin.id]: res }));
          } catch {
            // Leave individual failure silent in batch summary
          } finally {
            setBatchProgress((curr) =>
              curr ? { ...curr, done: Math.min(curr.total, curr.done + 1) } : null,
            );
          }
        }),
      );
      onToast(
        `批量协议巡检完成：${passed}/${enabledPlugins.length} 项握手通过`,
        passed === enabledPlugins.length ? 'ok' : 'info',
      );
    } finally {
      setBatchProgress(null);
    }
  };

  const handleExportManifest = async () => {
    const manifest = buildPluginsExportPayload(items);
    const json = JSON.stringify(manifest, null, 2);
    const copied = await copyToClipboard(json);
    try {
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ops-console-plugins-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Clipboard fallback already executed
    }
    onToast(
      copied
        ? `已导出脱敏插件清单（${manifest.count} 项）并复制到剪贴板`
        : `已导出脱敏插件清单 JSON（${manifest.count} 项）`,
      'ok',
    );
  };

  const openConfigDrawer = (plugin: PluginCatalogItem) => {
    const initial: Record<string, unknown> = {};
    for (const field of plugin.configSchema || []) {
      const raw = plugin.config?.[field.key];
      if (field.type === 'secret' && raw === '••••••••') {
        initial[field.key] = '';
      } else {
        initial[field.key] = raw ?? field.default ?? '';
      }
    }
    setConfigDraft(initial);
    setEditingPlugin(plugin);
  };

  const handleSaveConfig = async (runTestAfter = false) => {
    if (!editingPlugin) return;
    if (readOnly) {
      onToast('只读模式下不可保存插件配置', 'err');
      return;
    }
    const payload: Record<string, unknown> = {};
    for (const field of editingPlugin.configSchema || []) {
      const val = configDraft[field.key];
      if (field.type === 'secret' && val === '') {
        // Keep existing stored secret untouched if user left blank
        continue;
      }
      if (field.type === 'number') {
        const num = Number(val);
        if (Number.isFinite(num)) payload[field.key] = num;
      } else if (field.type === 'boolean') {
        payload[field.key] = Boolean(val);
      } else {
        payload[field.key] = val;
      }
    }

    setSavingConfig(true);
    try {
      await updatePluginConfig(editingPlugin.id, payload);
      onToast(`已保存 ${editingPlugin.name} 配置`, 'ok');
      const target = editingPlugin;
      setEditingPlugin(null);
      await loadCatalog(true);
      onSnapshotChanged();
      if (runTestAfter) {
        await handleTest(target);
      }
    } catch (err) {
      onToast(`保存配置失败：${(err as Error).message}`, 'err');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSelectCustomKind = (nextKind: 'mcp' | 'agent' | 'gateway' | 'custom') => {
    setAddKind(nextKind);
    const meta = CUSTOM_KIND_OPTIONS.find((k) => k.value === nextKind);
    if (meta) {
      setAddHealthPath(meta.defaultHealthPath);
    }
  };

  const handleAddCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      onToast('只读模式下不可新增服务实例', 'err');
      return;
    }
    if (!addName.trim() || !addUrl.trim()) {
      onToast('请填写服务名称与有效的 HTTP/HTTPS 地址', 'err');
      return;
    }
    setAdding(true);
    try {
      const res = await addCustomPlugin({
        name: addName.trim(),
        kind: addKind,
        apiUrl: addUrl.trim(),
        healthPath: addHealthPath.trim() || undefined,
        authToken: addToken.trim() || undefined,
        description: addDesc.trim() || undefined,
      });
      onToast(`已接入自定义服务：${res.plugin?.name || addName.trim()}`, 'ok');
      setAddOpen(false);
      setAddName('');
      setAddUrl('');
      setAddHealthPath('');
      setAddToken('');
      setAddDesc('');
      await loadCatalog(true);
      onSnapshotChanged();
    } catch (err) {
      onToast(`接入失败：${(err as Error).message}`, 'err');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteCustom = (plugin: PluginCatalogItem) => {
    onConfirm({
      open: true,
      title: `移除自定义服务「${plugin.name}」`,
      description: `移除后将停止对该服务（${plugin.id}）的遥测采集，并从持久化配置中删除。`,
      confirmLabel: '确认移除',
      danger: true,
      onConfirm: async () => {
        try {
          await removeCustomPlugin(plugin.id);
          onToast(`已移除 ${plugin.name}`, 'ok');
          await loadCatalog(true);
          onSnapshotChanged();
        } catch (err) {
          onToast(`移除失败：${(err as Error).message}`, 'err');
        }
      },
    });
  };

  const activeKindMeta = CUSTOM_KIND_OPTIONS.find((k) => k.value === addKind) || CUSTOM_KIND_OPTIONS[0];
  const healthyRatioPct = summary.enabled > 0 ? Math.round((summary.healthy / summary.enabled) * 100) : 100;
  const distinctCategories = new Set(items.filter((i) => i.enabled).map((i) => i.category)).size;

  return (
    <ModuleFrame
      testId="plugins-view"
      title="插件与协议接入"
      description="按官方协议规范模块化管理 MCP Server、A2A Agent、OpenAI 网关、记忆引擎与自托管服务，支持热启停与即时握手验证。"
      actions={
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            disabled={batchProgress !== null || summary.enabled === 0}
            onClick={() => void handleBatchHealthCheck()}
            data-testid="plugins-batch-check-btn"
          >
            <Activity className={cn('size-4 text-[var(--accent)]', batchProgress && 'animate-pulse')} strokeWidth={1.75} />
            {batchProgress ? `巡检中 ${batchProgress.done}/${batchProgress.total}` : '批量巡检'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={items.length === 0}
            onClick={() => void handleExportManifest()}
            data-testid="plugins-export-btn"
          >
            <Download className="size-4 text-[var(--ink-muted)]" strokeWidth={1.75} />
            导出清单
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={refreshing}
            onClick={() => void loadCatalog(true)}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} strokeWidth={1.75} />
            刷新目录
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={readOnly}
            onClick={() => setAddOpen(true)}
            data-testid="add-custom-plugin-btn"
          >
            <Plus className="size-4" strokeWidth={1.75} />
            接入自定义服务
          </Button>
        </div>
      }
    >

      {/* Asymmetric KPI Strip */}
      {loading && !catalog ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" role="status" aria-label="正在加载插件概览">
          <div className="lg:col-span-5 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] ui-skeleton" />
          <div className="lg:col-span-7 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] ui-skeleton" />
        </div>
      ) : (
        <KpiStrip
          asymmetric
          cells={[
            {
              label: '已启用插件健康度',
              meta: summary.enabled > 0 ? `${healthyRatioPct}% 在线` : '按需启用',
              value: `${summary.healthy}/${summary.enabled}`,
              numeric: { primary: summary.healthy, denominator: summary.enabled },
              ratioPct: summary.enabled > 0 ? healthyRatioPct : 0,
              sub: `目录共收录 ${summary.total} 个标准协议插件`,
              tone: summary.enabled > 0 && summary.healthy < summary.enabled ? 'warn' : 'ok',
            },
            {
              label: '活跃协议域',
              value: String(distinctCategories),
              numeric: { primary: distinctCategories },
              sub: 'MCP · A2A · OpenAI · 记忆 · 网络',
            },
            {
              label: '自定义与外部插件',
              value: String(summary.custom),
              numeric: { primary: summary.custom },
              sub: '支持 Web 接入与 plugins/ 扩展',
            },
            {
              label: '凭据安全策略',
              value: 'env://',
              sub: '密钥脱敏展示 · 0600 本地落盘',
              tone: 'ok',
            },
          ]}
        />
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 max-w-full">
          <div className="overflow-x-auto max-w-full">
            <SegmentedFilter
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
              ariaLabel="按协议分类筛选插件"
            />
          </div>
          <SegmentedFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
            ariaLabel="按运行状态筛选插件"
          />
        </div>
        <div className="relative w-full sm:w-[260px]">
          <Search
            className="size-4 text-[var(--ink-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索插件名称、协议或端点..."
            aria-label="搜索插件"
            data-testid="plugins-search-input"
            className={cn('w-full h-9 pl-9 pr-3', inputBaseClass)}
          />
        </div>
      </div>

      {/* External plugin load warnings if any */}
      {catalog?.externalLoadErrors && catalog.externalLoadErrors.length > 0 && (
        <div className="rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/5 px-4 py-3 text-[13px] text-[var(--warn)]">
          <div className="font-medium">部分外部插件未能加载：</div>
          <ul className="mt-1 space-y-0.5 font-mono text-[12px]">
            {catalog.externalLoadErrors.map((e) => (
              <li key={e.id}>
                {e.id}: {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Plugin Catalog Grid */}
      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" role="status" aria-label="正在加载插件目录">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] ui-skeleton"
            />
          ))}
        </div>
      ) : loadError && items.length === 0 ? (
        <Panel>
          <ErrorState
            title="插件目录加载失败"
            message={loadError}
            onRetry={() => void loadCatalog(true)}
            retrying={refreshing}
          />
        </Panel>
      ) : filteredItems.length === 0 ? (
        <Panel>
          <EmptyState
            title="未找到匹配的插件"
            message="尝试切换协议分类或运行状态，或点击右上角「接入自定义服务」添加自己的 MCP、Agent 或 HTTP 端点。"
            action={{
              label: '重置筛选',
              onClick: () => {
                setCategory('all');
                setStatusFilter('all');
                setQuery('');
              },
            }}
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" data-testid="plugins-grid">
          {filteredItems.map((plugin) => {
            const testRes = testResults[plugin.id];
            const isToggling = togglingId === plugin.id;
            const isTesting = testingId === plugin.id;
            const metaLine = [
              CATEGORY_LABELS[plugin.category] || plugin.category,
              SOURCE_LABELS[plugin.source] || plugin.source,
              `v${plugin.version}`,
            ].join(' · ');

            return (
              <article
                key={plugin.id}
                data-testid={`plugin-card-${plugin.id}`}
                className={cn(
                  'rounded-2xl border bg-[var(--surface)] shadow-[var(--shadow-card)] p-5 flex flex-col justify-between gap-4 transition-[border-color,opacity] duration-150 ease-out',
                  plugin.enabled
                    ? 'border-[var(--border)]'
                    : 'border-[var(--border-subtle)] opacity-80',
                )}
              >
                <div className="space-y-3.5">
                  {/* Top Row: Name + Metadata + Switch */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <h2 className="text-[15.5px] font-semibold tracking-tight text-[var(--ink)] truncate">
                          {plugin.name}
                        </h2>
                        <StatusIndicator
                          status={plugin.enabled ? plugin.status : 'disabled'}
                          label={plugin.enabled ? undefined : '已停用'}
                        />
                      </div>
                      <p className="mt-1 font-mono text-[11.5px] text-[var(--ink-subtle)] truncate">
                        {plugin.id} · {metaLine}
                      </p>
                    </div>
                    <Switch
                      checked={plugin.enabled}
                      disabled={readOnly || isToggling}
                      onCheckedChange={(checked) => void handleToggle(plugin, Boolean(checked))}
                      aria-label={`启用或停用 ${plugin.name}`}
                      data-testid={`plugin-toggle-${plugin.id}`}
                      className="ui-switch-root shrink-0 mt-0.5"
                    >
                      <SwitchThumb className="ui-switch-thumb" />
                    </Switch>
                  </div>

                  {/* Description */}
                  <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed text-pretty">
                    {plugin.description}
                  </p>

                  {/* Live Metric Summary + Official Protocol — clean hairline dividers, zero nested box */}
                  <div className="pt-3.5 border-t border-[var(--border-subtle)] space-y-2">
                    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                      <span className="text-[var(--ink-subtle)] shrink-0">实时状态</span>
                      <span
                        className="font-mono text-[var(--ink)] tabular-nums truncate text-right"
                        title={plugin.summary}
                      >
                        {plugin.summary}
                        {plugin.enabled && plugin.latencyMs != null ? ` · ${plugin.latencyMs}ms` : ''}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 text-[12px]">
                      <span className="text-[var(--ink-subtle)] shrink-0">官方协议</span>
                      <span
                        className="font-mono text-[var(--ink-muted)] truncate text-right"
                        title={plugin.officialSpec?.protocol}
                      >
                        {plugin.officialSpec?.protocol}
                      </span>
                    </div>
                    {plugin.officialSpec?.endpoints && plugin.officialSpec.endpoints.length > 0 && (
                      <div className="flex items-baseline justify-between gap-3 text-[11.5px]">
                        <span className="text-[var(--ink-subtle)] shrink-0">标准端点</span>
                        <span
                          className="font-mono text-[var(--ink-subtle)] truncate text-right"
                          title={plugin.officialSpec.endpoints.join(' | ')}
                        >
                          {plugin.officialSpec.endpoints.slice(0, 2).join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Inline Protocol Handshake Test Trace — borderless semantic surface tint */}
                  {testRes && (
                    <div
                      data-testid={`plugin-test-result-${plugin.id}`}
                      className={cn(
                        'rounded-lg px-3.5 py-2.5 text-[12px] space-y-1.5',
                        testRes.ok
                          ? 'bg-[var(--ok)]/[0.07]'
                          : 'bg-[var(--err)]/[0.07]',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 font-medium',
                            testRes.ok ? 'text-[var(--ok)]' : 'text-[var(--err)]',
                          )}
                        >
                          {testRes.ok ? (
                            <CheckCircle2 className="size-3.5" strokeWidth={1.75} />
                          ) : (
                            <XCircle className="size-3.5" strokeWidth={1.75} />
                          )}
                          {testRes.ok ? '官方协议握手通过' : '握手未通过'}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--ink-subtle)] tabular-nums">
                          {testRes.latencyMs != null ? `${testRes.latencyMs}ms` : '-'}
                        </span>
                      </div>
                      {testRes.steps.length > 0 ? (
                        <ul className="space-y-1 font-mono text-[11.5px] text-[var(--ink-muted)]">
                          {testRes.steps.map((st, idx) => (
                            <li key={`${st.step}-${idx}`} className="flex items-baseline justify-between gap-2">
                              <span className="truncate">
                                {st.ok ? '✓' : '✕'} {st.step}
                              </span>
                              <span className="text-[var(--ink-subtle)] shrink-0 tabular-nums">
                                {st.detail || (st.status ? `HTTP ${st.status}` : '')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="font-mono text-[11.5px] text-[var(--ink-muted)]">
                          {testRes.error || testRes.summary}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Row */}
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openConfigDrawer(plugin)}
                      data-testid={`plugin-config-${plugin.id}`}
                    >
                      <Settings2 className="size-3.5" strokeWidth={1.75} />
                      配置
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isTesting}
                      onClick={() => void handleTest(plugin)}
                      data-testid={`plugin-test-${plugin.id}`}
                    >
                      <Activity className={cn('size-3.5', isTesting && 'animate-pulse')} strokeWidth={1.75} />
                      {isTesting ? '探测中...' : '测试连通性'}
                    </Button>
                    {plugin.source === 'user-custom' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={readOnly}
                        onClick={() => handleDeleteCustom(plugin)}
                        aria-label={`移除 ${plugin.name}`}
                        data-testid={`plugin-delete-${plugin.id}`}
                        className="text-[var(--err)] hover:text-[var(--err)]"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                        移除
                      </Button>
                    )}
                  </div>

                  {plugin.officialSpec?.docsUrl && (
                    <a
                      href={plugin.officialSpec.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-1 text-[12px] text-[var(--ink-subtle)] hover:text-[var(--ink)] transition-colors duration-150 ease-out rounded px-1 py-0.5',
                        FOCUS_RING,
                      )}
                    >
                      官方手册
                      <ExternalLink className="size-3" strokeWidth={1.75} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Plugin CLI & External SDK Quick Guide — hairline divided columns, zero nested boxes */}
      <Panel
        title="通过 CLI 或独立目录扩展插件"
        description={`将自定义插件放入 ${catalog?.pluginsDir || './plugins'}/<plugin-id>/index.mjs 即可自动发现加载，遵循统一 definePlugin SDK 规范。`}
        bodyClassName="p-0"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
          {CLI_SNIPPETS.map((snippet) => (
            <div
              key={snippet.cmd}
              className="px-5 py-4 flex flex-col justify-between gap-2.5 min-w-0 hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out"
            >
              <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-muted)]">
                <Terminal className="size-3.5 text-[var(--ink-subtle)] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{snippet.label}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-subtle)]/75 px-2.5 py-2">
                <code className="font-mono text-[11.5px] text-[var(--ink)] truncate" title={snippet.cmd}>
                  {snippet.cmd}
                </code>
                <CopyAction
                  variant="icon"
                  size="xs"
                  text={snippet.cmd}
                  ariaLabel={`复制命令：${snippet.cmd}`}
                  onCopied={() => onToast('命令已复制到剪贴板', 'ok')}
                  onError={() => onToast('复制失败，请检查剪贴板权限', 'err')}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Schema-Driven Plugin Configuration Drawer */}
      <Drawer.Root
        open={Boolean(editingPlugin)}
        onOpenChange={(open) => {
          if (!open && !savingConfig) setEditingPlugin(null);
        }}
        direction="right"
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px]" />
          <Drawer.Content
            aria-label="配置插件连接参数"
            data-testid="plugin-config-drawer"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none"
          >
            {activeEditingPlugin && (
              <>
                <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-start justify-between gap-4 shrink-0">
                  <div className="min-w-0">
                    <Drawer.Title className="text-[16px] font-semibold tracking-tight text-[var(--ink)] truncate">
                      配置 {activeEditingPlugin.name}
                    </Drawer.Title>
                    <Drawer.Description className="mt-1 font-mono text-[12px] text-[var(--ink-subtle)] truncate">
                      {activeEditingPlugin.officialSpec?.protocol}
                    </Drawer.Description>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPlugin(null)}
                    aria-label="关闭配置面板"
                    className={cn(
                      'ui-press-icon h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] cursor-pointer shrink-0',
                      FOCUS_RING,
                    )}
                  >
                    <X className="size-4" strokeWidth={1.75} />
                  </button>
                </div>

                <div data-vaul-no-drag className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  {activeEditingPlugin.officialSpec?.auth && (
                    <div className="rounded-lg bg-[var(--surface-subtle)]/75 px-3.5 py-2.5 text-[12px] text-[var(--ink-muted)] leading-relaxed">
                      <span className="font-medium text-[var(--ink)]">官方鉴权说明：</span>
                      {activeEditingPlugin.officialSpec.auth}
                    </div>
                  )}

                  {(activeEditingPlugin.configSchema || []).length === 0 ? (
                    <p className="text-[13px] text-[var(--ink-subtle)]">
                      该插件无需额外连接参数，启用后即按默认官方协议采集。
                    </p>
                  ) : (
                    (activeEditingPlugin.configSchema || []).map((field) => {
                      const val = configDraft[field.key];
                      const existingSecret =
                        field.type === 'secret' &&
                        typeof activeEditingPlugin.config?.[field.key] === 'string' &&
                        Boolean(activeEditingPlugin.config?.[field.key]);
                      return (
                        <div key={field.key} className="space-y-1.5">
                          <label
                            htmlFor={`cfg-${activeEditingPlugin.id}-${field.key}`}
                            className="block text-[13px] font-medium text-[var(--ink)]"
                          >
                            {field.label}
                          </label>
                          {field.type === 'boolean' ? (
                            <label className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-muted)] cursor-pointer">
                              <input
                                id={`cfg-${activeEditingPlugin.id}-${field.key}`}
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={(e) =>
                                  setConfigDraft((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.checked,
                                  }))
                                }
                              />
                              <span>启用此选项</span>
                            </label>
                          ) : (
                            <input
                              id={`cfg-${activeEditingPlugin.id}-${field.key}`}
                              type={field.type === 'number' ? 'number' : 'text'}
                              value={val == null ? '' : String(val)}
                              onChange={(e) =>
                                setConfigDraft((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              placeholder={
                                existingSecret
                                  ? '已配置密钥（留空保持不变，推荐使用 env://VAR_NAME）'
                                  : field.placeholder || String(field.default ?? '')
                              }
                              className={cn(
                                'w-full h-9 px-3',
                                (field.type === 'url' || field.type === 'cli' || field.type === 'secret') && 'font-mono',
                                inputBaseClass,
                              )}
                            />
                          )}
                          {field.type === 'secret' && (
                            <p className="text-[11.5px] text-[var(--ink-subtle)]">
                              推荐使用 <code className="font-mono">env://ENV_VAR</code> 或{' '}
                              <code className="font-mono">file:///path/to/secret</code> 引用密钥，避免明文落盘。
                            </p>
                          )}
                          {field.description && (
                            <p className="text-[11.5px] text-[var(--ink-subtle)]">{field.description}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={savingConfig}
                    onClick={() => setEditingPlugin(null)}
                  >
                    取消
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={savingConfig || readOnly}
                    onClick={() => void handleSaveConfig(true)}
                  >
                    保存并测试
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={savingConfig || readOnly}
                    onClick={() => void handleSaveConfig(false)}
                    data-testid="plugin-config-save"
                  >
                    {savingConfig ? '保存中...' : '保存配置'}
                  </Button>
                </div>
              </>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Add Custom Service Drawer */}
      <Drawer.Root
        open={addOpen}
        onOpenChange={(open) => {
          if (!open && !adding) setAddOpen(false);
        }}
        direction="right"
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px]" />
          <Drawer.Content
            aria-label="接入自定义服务"
            data-testid="add-custom-plugin-drawer"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] bg-[var(--surface-elevated)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none"
          >
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-start justify-between gap-4 shrink-0">
              <div>
                <Drawer.Title className="text-[16px] font-semibold tracking-tight text-[var(--ink)]">
                  接入自定义服务
                </Drawer.Title>
                <Drawer.Description className="mt-1 text-[12.5px] text-[var(--ink-muted)]">
                  选择官方标准协议模板，无需编写代码即可接入任意外部服务。
                </Drawer.Description>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label="关闭新增服务面板"
                className={cn(
                  'h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] cursor-pointer shrink-0',
                  FOCUS_RING,
                )}
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>

            <form data-vaul-no-drag onSubmit={handleAddCustomSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[var(--ink)]">协议类型</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CUSTOM_KIND_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        data-testid={`custom-kind-${opt.value}`}
                        onClick={() => handleSelectCustomKind(opt.value)}
                        className={cn(
                          'px-3 py-2.5 rounded-xl border text-left transition-colors duration-150 ease-out cursor-pointer',
                          FOCUS_RING,
                          addKind === opt.value
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--ink)]'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--border-strong)]',
                        )}
                      >
                        <div className="text-[13px] font-medium">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11.5px] text-[var(--ink-subtle)] pt-0.5">
                    {activeKindMeta.hint}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="custom-plugin-name" className="block text-[13px] font-medium text-[var(--ink)]">
                    服务名称
                  </label>
                  <input
                    id="custom-plugin-name"
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="例如：Local Ollama / Team MCP Hub"
                    data-testid="custom-plugin-name"
                    className={cn('w-full h-9 px-3', inputBaseClass)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="custom-plugin-url" className="block text-[13px] font-medium text-[var(--ink)]">
                    服务地址 (HTTP / HTTPS)
                  </label>
                  <input
                    id="custom-plugin-url"
                    type="url"
                    required
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    placeholder={activeKindMeta.placeholderUrl}
                    data-testid="custom-plugin-url"
                    className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                  />
                </div>

                {(addKind === 'agent' || addKind === 'custom') && (
                  <div className="space-y-1.5">
                    <label htmlFor="custom-plugin-health" className="block text-[13px] font-medium text-[var(--ink)]">
                      健康检查路径
                    </label>
                    <input
                      id="custom-plugin-health"
                      type="text"
                      value={addHealthPath}
                      onChange={(e) => setAddHealthPath(e.target.value)}
                      placeholder="/health"
                      className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="custom-plugin-token" className="block text-[13px] font-medium text-[var(--ink)]">
                    认证凭据（可选，推荐 env:// 引用）
                  </label>
                  <input
                    id="custom-plugin-token"
                    type="text"
                    value={addToken}
                    onChange={(e) => setAddToken(e.target.value)}
                    placeholder="env://MY_SERVICE_TOKEN"
                    className={cn('w-full h-9 px-3 font-mono', inputBaseClass)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="custom-plugin-desc" className="block text-[13px] font-medium text-[var(--ink)]">
                    服务说明（可选）
                  </label>
                  <input
                    id="custom-plugin-desc"
                    type="text"
                    value={addDesc}
                    onChange={(e) => setAddDesc(e.target.value)}
                    placeholder="简要说明该服务的职责与用途"
                    className={cn('w-full h-9 px-3', inputBaseClass)}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2 shrink-0">
                <Button variant="secondary" size="md" disabled={adding} onClick={() => setAddOpen(false)}>
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={adding || readOnly}
                  data-testid="custom-plugin-submit"
                >
                  {adding ? '接入中...' : '确认接入'}
                </Button>
              </div>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </ModuleFrame>
  );
}
