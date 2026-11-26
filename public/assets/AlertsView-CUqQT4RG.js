import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { $ as RefreshCw, Gt as CircleCheck, Mt as FilePenLine, P as Trash, W as ShieldExclamationPoint, Y as Search, Yt as CheckCheck, en as BellOff, rt as Plus } from "./vendor-ui-DUVxOpTN.js";
import { G as createAlertRule, L as cn, P as statusLabel, Q as deleteAlertRule, R as ackAlert, Ut as setAlertSilence, Vt as saveIncidentNote, Zt as toggleAlertRule, _ as StatusIndicator, a as formatRemainingSilence, d as ErrorState, f as KpiStrip, g as SegmentedFilter, h as ResourceMeter, k as formatDateTime, l as Button, m as Panel, pt as fetchAlerts, t as ModuleFrame, u as EmptyState, v as ToggleSwitch, x as inputBaseClass } from "./app-nZGM7CNZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/AlertsView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var SILENCE_DURATIONS = [
	{
		value: 15,
		label: "15 分钟"
	},
	{
		value: 30,
		label: "30 分钟"
	},
	{
		value: 120,
		label: "2 小时"
	},
	{
		value: 480,
		label: "8 小时"
	}
];
var ALERT_QUEUE_FILTERS = [
	{
		value: "all",
		label: "全部"
	},
	{
		value: "unacked",
		label: "未确认"
	},
	{
		value: "acked",
		label: "已确认"
	}
];
var RULE_STATUS_FILTERS = [
	{
		value: "all",
		label: "全部规则"
	},
	{
		value: "enabled",
		label: "已启用"
	},
	{
		value: "paused",
		label: "已暂停"
	}
];
var METRIC_LABELS = {
	"host.memory.usedPercent": "主机内存占用 (%)",
	"host.load1": "主机 1 分钟负载 (Load1)",
	"host.disk.maxPercent": "磁盘最高使用率 (%)",
	"gateway.latencyMs": "模型网关延迟 (ms)",
	"services.failedCount": "故障服务数量",
	"memory.offlineEngines": "离线记忆引擎数量",
	"fleet.offlineCount": "离线节点数量"
};
var OPERATOR_LABELS = {
	gt: ">",
	gte: "≥",
	lt: "<",
	eq: "="
};
var CHANNEL_LABELS = {
	webhook: "HTTPS Webhook",
	slack: "Slack",
	telegram: "Telegram Bot",
	discord: "Discord",
	feishu: "飞书机器人",
	wecom: "企业微信",
	bark: "Bark 推送",
	email: "Email"
};
function AlertsView({ incidents, readOnly, onRefreshIncidents, onToast, onConfirm }) {
	const [state, setState] = import_react.useState(null);
	const [loading, setLoading] = import_react.useState(true);
	const [loadError, setLoadError] = import_react.useState("");
	const [busyId, setBusyId] = import_react.useState(null);
	const [showCreate, setShowCreate] = import_react.useState(false);
	const [formError, setFormError] = import_react.useState("");
	const [ruleForm, setRuleForm] = import_react.useState({
		name: "",
		metric: "host.memory.usedPercent",
		operator: "gte",
		threshold: "85",
		severity: "warning",
		channel: "webhook",
		channelTarget: "",
		forMinutes: "5",
		cooldownMinutes: "30"
	});
	const [editingIncidentId, setEditingIncidentId] = import_react.useState(null);
	const [noteDraft, setNoteDraft] = import_react.useState("");
	const [savingNote, setSavingNote] = import_react.useState(false);
	const [silenceMinutes, setSilenceMinutes] = import_react.useState(30);
	const [activeSilenceWindowMin, setActiveSilenceWindowMin] = import_react.useState(30);
	const [nowMs, setNowMs] = import_react.useState(() => Date.now());
	const [alertFilter, setAlertFilter] = import_react.useState("all");
	const [ruleQuery, setRuleQuery] = import_react.useState("");
	const [ruleStatusFilter, setRuleStatusFilter] = import_react.useState("all");
	const abortRef = import_react.useRef(null);
	const loadAlerts = import_react.useCallback(async () => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		setLoading(true);
		setLoadError("");
		try {
			const data = await fetchAlerts(controller.signal);
			if (!controller.signal.aborted) setState(data);
		} catch (err) {
			if (controller.signal.aborted || err?.name === "AbortError") return;
			const msg = err.message || "告警中心请求失败";
			setLoadError(msg);
			onToast(`加载告警中心失败：${msg}`, "err");
		} finally {
			if (!controller.signal.aborted) setLoading(false);
		}
	}, [onToast]);
	import_react.useEffect(() => {
		loadAlerts();
		return () => {
			abortRef.current?.abort();
		};
	}, [loadAlerts]);
	import_react.useEffect(() => {
		if (!state?.silenced || !state.silenceUntil) return;
		setNowMs(Date.now());
		const id = window.setInterval(() => setNowMs(Date.now()), 1e3);
		return () => window.clearInterval(id);
	}, [state?.silenced, state?.silenceUntil]);
	const handleSilence = async (minutes) => {
		if (readOnly) {
			onToast("只读模式已禁用告警静默控制", "err");
			return;
		}
		const prevState = state;
		const optimisticUntil = minutes > 0 ? new Date(Date.now() + minutes * 6e4).toISOString() : null;
		if (minutes > 0) {
			setActiveSilenceWindowMin(minutes);
			setNowMs(Date.now());
		}
		if (state) setState({
			...state,
			silenced: minutes > 0,
			silenceUntil: optimisticUntil
		});
		setBusyId("silence");
		try {
			const res = await setAlertSilence(minutes);
			setState((curr) => curr ? {
				...curr,
				silenced: res.silenced,
				silenceUntil: res.silenceUntil
			} : curr);
			onToast(res.silenced ? `已开启全局告警静默 ${minutes} 分钟` : "已解除全局告警静默", "ok");
		} catch (err) {
			if (prevState) setState(prevState);
			onToast(`操作失败：${err.message}`, "err");
		} finally {
			setBusyId(null);
		}
	};
	const handleBulkAck = async () => {
		if (readOnly || !state) {
			if (readOnly) onToast("只读模式已禁用告警确认", "err");
			return;
		}
		const unacked = state.alerts.filter((al) => al.status !== "acked");
		if (unacked.length === 0) return;
		const prevState = state;
		setState({
			...state,
			alerts: state.alerts.map((al) => ({
				...al,
				status: "acked"
			})),
			activeCount: 0
		});
		setBusyId("bulk-ack");
		try {
			await Promise.all(unacked.map((al) => ackAlert(al.id)));
			onToast(`已批量确认 ${unacked.length} 条告警`, "ok");
		} catch (err) {
			setState(prevState);
			onToast(`批量确认失败：${err.message}`, "err");
		} finally {
			setBusyId(null);
		}
	};
	const handleAck = async (alertId) => {
		if (readOnly) {
			onToast("只读模式已禁用告警确认", "err");
			return;
		}
		const prevState = state;
		if (state) {
			const nextAlerts = state.alerts.map((al) => al.id === alertId ? {
				...al,
				status: "acked"
			} : al);
			const nextActive = nextAlerts.filter((al) => al.status !== "acked").length;
			setState({
				...state,
				alerts: nextAlerts,
				activeCount: nextActive
			});
		}
		setBusyId(alertId);
		try {
			await ackAlert(alertId);
			onToast("已确认该告警", "ok");
		} catch (err) {
			if (prevState) setState(prevState);
			onToast(`确认失败：${err.message}`, "err");
		} finally {
			setBusyId(null);
		}
	};
	const handleToggleRule = async (ruleId, nextEnabled) => {
		if (readOnly) {
			onToast("只读模式已禁用规则切换", "err");
			return;
		}
		const prevState = state;
		if (state) setState({
			...state,
			rules: state.rules.map((r) => r.id === ruleId ? {
				...r,
				enabled: nextEnabled
			} : r)
		});
		setBusyId(ruleId);
		try {
			await toggleAlertRule(ruleId, nextEnabled);
			onToast(nextEnabled ? "已启用告警规则" : "已暂停告警规则", "ok");
		} catch (err) {
			if (prevState) setState(prevState);
			onToast(`更新失败：${err.message}`, "err");
		} finally {
			setBusyId(null);
		}
	};
	const handleDeleteRule = (ruleId, name) => {
		if (readOnly) {
			onToast("只读模式已禁用删除规则", "err");
			return;
		}
		onConfirm({
			open: true,
			title: `删除告警规则：${name}`,
			description: "删除后该阈值监控将立即停止评估，历史已触发事件仍保留在记录中。",
			confirmLabel: "确认删除",
			danger: true,
			onConfirm: async () => {
				const prevState = state;
				if (state) setState({
					...state,
					rules: state.rules.filter((r) => r.id !== ruleId)
				});
				try {
					await deleteAlertRule(ruleId);
					onToast(`已删除规则「${name}」`, "ok");
				} catch (err) {
					if (prevState) setState(prevState);
					onToast(`删除失败：${err.message}`, "err");
				}
			}
		});
	};
	const handleCreateRule = async (e) => {
		e.preventDefault();
		setFormError("");
		if (readOnly) {
			onToast("只读模式已禁用新建规则", "err");
			return;
		}
		const trimmedName = ruleForm.name.trim();
		const threshold = Number(ruleForm.threshold);
		if (!trimmedName) {
			setFormError("请输入规则名称");
			return;
		}
		if (!Number.isFinite(threshold)) {
			setFormError("请输入有效的数值阈值");
			return;
		}
		setBusyId("create");
		try {
			await createAlertRule({
				name: trimmedName,
				metric: ruleForm.metric,
				operator: ruleForm.operator,
				threshold,
				severity: ruleForm.severity,
				channel: ruleForm.channel,
				channelTarget: ruleForm.channelTarget.trim(),
				forMinutes: Number(ruleForm.forMinutes) || 0,
				cooldownMinutes: Number(ruleForm.cooldownMinutes) || 15
			});
			setRuleForm((prev) => ({
				...prev,
				name: "",
				channelTarget: ""
			}));
			setShowCreate(false);
			onToast(`告警规则「${trimmedName}」已生效`, "ok");
			await loadAlerts();
		} catch (err) {
			const msg = err.message || "创建失败";
			setFormError(msg);
			onToast(`创建规则失败：${msg}`, "err");
		} finally {
			setBusyId(null);
		}
	};
	const startEditNote = (inc) => {
		setEditingIncidentId(String(inc.id ?? ""));
		setNoteDraft(inc.note || "");
	};
	const handleSaveNote = async (incidentId) => {
		if (readOnly) {
			onToast("只读模式已禁用复盘备注编辑", "err");
			return;
		}
		setSavingNote(true);
		try {
			await saveIncidentNote(incidentId, noteDraft.trim());
			setEditingIncidentId(null);
			onToast("事件复盘备注已保存", "ok");
			await onRefreshIncidents();
		} catch (err) {
			onToast(`保存失败：${err.message}`, "err");
		} finally {
			setSavingNote(false);
		}
	};
	const sla = state?.sla;
	const activeCount = state?.activeCount ?? 0;
	const rules = state?.rules || [];
	const alerts = state?.alerts || [];
	const filteredAlerts = import_react.useMemo(() => {
		if (alertFilter === "unacked") return alerts.filter((al) => al.status !== "acked");
		if (alertFilter === "acked") return alerts.filter((al) => al.status === "acked");
		return alerts;
	}, [alerts, alertFilter]);
	const filteredRules = import_react.useMemo(() => {
		const q = ruleQuery.trim().toLowerCase();
		return rules.filter((r) => {
			if (ruleStatusFilter === "enabled" && !r.enabled) return false;
			if (ruleStatusFilter === "paused" && r.enabled) return false;
			if (!q) return true;
			return [
				r.name,
				r.metric,
				METRIC_LABELS[r.metric] || "",
				r.channel,
				r.severity
			].join(" ").toLowerCase().includes(q);
		});
	}, [
		rules,
		ruleQuery,
		ruleStatusFilter
	]);
	const silenceCountdown = import_react.useMemo(() => formatRemainingSilence(state?.silenceUntil, nowMs, activeSilenceWindowMin), [
		state?.silenceUntil,
		nowMs,
		activeSilenceWindowMin
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ModuleFrame, {
		title: "告警、事件与 SLA 可靠性",
		description: "声明式指标阈值规则、SSRF 防护外发通知、维护静默窗口、30 天可用性与事件复盘记录。",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: [
				state?.silenced ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "secondary",
					size: "sm",
					disabled: busyId === "silence" || readOnly,
					onClick: () => void handleSilence(0),
					"data-testid": "unsilence-alerts-btn",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellOff, {
						className: "size-4 text-[var(--warn)]",
						strokeWidth: 1.75
					}), "解除静默"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "inline-flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: silenceMinutes,
						onChange: (e) => setSilenceMinutes(Number(e.target.value)),
						disabled: busyId === "silence" || readOnly,
						"aria-label": "选择维护静默时长",
						"data-testid": "silence-duration-select",
						className: cn("ui-select h-8 pl-2.5 sm:text-[12.5px] font-mono tabular-nums cursor-pointer", inputBaseClass),
						children: SILENCE_DURATIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: opt.value,
							children: opt.label
						}, opt.value))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						disabled: busyId === "silence" || readOnly,
						onClick: () => void handleSilence(silenceMinutes),
						"data-testid": "silence-alerts-btn",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellOff, {
							className: "size-4 text-[var(--ink-muted)]",
							strokeWidth: 1.75
						}), "开启静默"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "secondary",
					size: "sm",
					disabled: loading,
					onClick: () => void loadAlerts(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, {
						className: cn("size-4 text-[var(--ink-muted)]", loading && "animate-spin"),
						strokeWidth: 1.75
					}), "刷新"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "primary",
					size: "sm",
					disabled: readOnly,
					onClick: () => setShowCreate((v) => !v),
					"data-testid": "toggle-create-rule",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
						className: "size-4",
						strokeWidth: 1.75
					}), "新建规则"]
				})
			]
		}),
		children: [
			loadError && !state && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
				title: "告警中心加载失败",
				message: loadError,
				onRetry: () => void loadAlerts(),
				retrying: loading
			}) }),
			state?.silenced && state.silenceUntil && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				"data-testid": "silence-active-banner",
				className: "rounded-xl bg-[var(--warn)]/[0.08] px-4 py-3 space-y-2 text-[13px] text-[var(--warn)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-medium",
						children: [
							"全局维护静默生效中 · 剩余",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono tabular-nums font-semibold",
								children: silenceCountdown.label
							}),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-[12px] opacity-80 tabular-nums",
								children: [
									"（直至 ",
									formatDateTime(state.silenceUntil),
									"）"
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => void handleSilence(0),
						disabled: readOnly,
						children: "立即恢复通知"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-[3px] w-full rounded-full bg-[var(--warn)]/15 overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full rounded-full bg-[var(--warn)] transition-[width] duration-500 ease-out",
						style: { width: `${silenceCountdown.progressPct}%` }
					})
				})]
			}),
			loading && !state ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-4",
				"aria-busy": "true",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lg:col-span-5 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lg:col-span-7 h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] animate-pulse" })]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiStrip, {
				asymmetric: true,
				cells: [
					{
						label: "30 天全栈 SLA 可用性",
						meta: sla ? `${sla.windowDays}d 滚动窗口` : void 0,
						value: sla ? `${sla.overallUptimePct.toFixed(2)}%` : "-",
						ratioPct: sla?.overallUptimePct ?? 99.9,
						sub: sla ? `MTTR ${sla.mttrMinutes}m · 累计故障时长 ${sla.totalDowntimeMin} 分钟` : "正在计算可用性指标",
						tone: sla && sla.overallUptimePct < 99.5 ? "warn" : "ok"
					},
					{
						label: "活跃未确认告警",
						value: String(activeCount),
						numeric: { primary: activeCount },
						sub: `${alerts.length} 条近期告警记录`,
						tone: activeCount > 0 ? "err" : "ok"
					},
					{
						label: "生效阈值规则",
						value: `${rules.filter((r) => r.enabled).length}/${rules.length}`,
						numeric: {
							primary: rules.filter((r) => r.enabled).length,
							denominator: rules.length
						},
						sub: "每次快照自动评估"
					},
					{
						label: "历史状态事件",
						value: String(incidents.length),
						numeric: { primary: incidents.length },
						sub: `${incidents.filter((i) => Boolean(i.note)).length} 条已附加复盘备注`
					}
				]
			}),
			showCreate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "新建声明式告警规则",
				description: "所有外发 Webhook 地址均强制 HTTPS 并阻断内网回环与元数据地址（SSRF 防护）。",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleCreateRule,
					className: "space-y-4",
					noValidate: true,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 md:grid-cols-3 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "规则名称"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: ruleForm.name,
										onChange: (e) => {
											setRuleForm((s) => ({
												...s,
												name: e.target.value
											}));
											if (formError) setFormError("");
										},
										placeholder: "例如：主机内存高水位预警",
										"data-testid": "alert-rule-name",
										className: cn("w-full h-9 px-3", inputBaseClass)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "监控指标"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: ruleForm.metric,
										onChange: (e) => setRuleForm((s) => ({
											...s,
											metric: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 cursor-pointer", inputBaseClass),
										children: (state?.supportedMetrics || Object.keys(METRIC_LABELS)).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: m,
											children: METRIC_LABELS[m] || m
										}, m))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "条件与阈值"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-5 gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											value: ruleForm.operator,
											onChange: (e) => setRuleForm((s) => ({
												...s,
												operator: e.target.value
											})),
											"aria-label": "比较操作符",
											className: cn("ui-select col-span-2 h-9 pl-2.5 cursor-pointer", inputBaseClass),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "gte",
													children: "≥"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "gt",
													children: ">"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "lt",
													children: "<"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "eq",
													children: "="
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											step: "any",
											value: ruleForm.threshold,
											onChange: (e) => setRuleForm((s) => ({
												...s,
												threshold: e.target.value
											})),
											"aria-label": "告警阈值",
											"data-testid": "alert-rule-threshold",
											className: cn("col-span-3 h-9 px-3 font-mono tabular-nums", inputBaseClass)
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "严重等级"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: ruleForm.severity,
										onChange: (e) => setRuleForm((s) => ({
											...s,
											severity: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 cursor-pointer", inputBaseClass),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "critical",
												children: "Critical（紧急）"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "warning",
												children: "Warning（告警）"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "info",
												children: "Info（提示）"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "通知渠道"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										value: ruleForm.channel,
										onChange: (e) => setRuleForm((s) => ({
											...s,
											channel: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 cursor-pointer", inputBaseClass),
										children: (state?.supportedChannels || Object.keys(CHANNEL_LABELS)).map((ch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: ch,
											children: CHANNEL_LABELS[ch] || ch
										}, ch))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "space-y-1.5 text-[13px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium text-[var(--ink-muted)]",
										children: "通知 Webhook URL（留空仅在控制台告警）"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "url",
										value: ruleForm.channelTarget,
										onChange: (e) => setRuleForm((s) => ({
											...s,
											channelTarget: e.target.value
										})),
										placeholder: "https://hooks.example.com/ops-alerts",
										className: cn("w-full h-9 px-3 font-mono", inputBaseClass)
									})]
								})
							]
						}),
						formError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							role: "alert",
							className: "text-[12.5px] font-medium text-[var(--err)]",
							children: formError
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "secondary",
								size: "sm",
								onClick: () => setShowCreate(false),
								children: "取消"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								variant: "primary",
								size: "sm",
								disabled: busyId === "create",
								"data-testid": "submit-alert-rule",
								children: busyId === "create" ? "保存中..." : "保存并启用"
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: "lg:col-span-7",
					bodyClassName: "p-0",
					title: "活跃告警与处理队列",
					description: "实时汇总触发中的阈值告警，支持按确认状态筛选及批量 Ack 消音。",
					actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
							value: alertFilter,
							onChange: setAlertFilter,
							options: ALERT_QUEUE_FILTERS,
							ariaLabel: "按确认状态筛选告警"
						}), activeCount > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							disabled: busyId === "bulk-ack" || readOnly,
							onClick: () => void handleBulkAck(),
							"data-testid": "bulk-ack-alerts-btn",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckCheck, {
								className: "size-3.5 text-[var(--ok)]",
								strokeWidth: 1.75
							}), busyId === "bulk-ack" ? "确认中..." : `全部确认 (${activeCount})`]
						})]
					}),
					children: filteredAlerts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						title: alerts.length === 0 ? "当前无活跃告警" : "当前筛选下无告警",
						message: alerts.length === 0 ? "所有启用中的阈值规则均处于健康水位。" : "切换状态筛选即可查看其他告警记录。",
						action: alertFilter !== "all" ? {
							label: "显示全部告警",
							onClick: () => setAlertFilter("all")
						} : void 0
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "divide-y divide-[var(--border-subtle)]",
						children: filteredAlerts.map((al) => {
							const isAcked = al.status === "acked";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "px-5 sm:px-6 py-4 flex flex-wrap items-start justify-between gap-4 hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1 space-y-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
												status: isAcked ? "healthy" : al.severity === "critical" ? "failed" : "degraded",
												label: isAcked ? "已确认" : al.severity === "critical" ? "紧急" : "告警"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-medium text-[13.5px] text-[var(--ink)] truncate",
												children: al.ruleName
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[12.5px] text-[var(--ink-muted)] text-pretty",
											children: al.summary
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
											children: [
												METRIC_LABELS[al.metric] || al.metric,
												" · 当前 ",
												al.value,
												"（阈值 ",
												al.threshold,
												"） · 触发于",
												" ",
												formatDateTime(al.firedAt)
											]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "shrink-0",
									children: isAcked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1 font-mono text-[12px] text-[var(--ok)]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
											className: "size-3.5",
											strokeWidth: 1.75
										}), "Ack"]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "secondary",
										size: "sm",
										disabled: busyId === al.id || readOnly,
										onClick: () => void handleAck(al.id),
										"data-testid": `ack-alert-${al.id}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldExclamationPoint, {
											className: "size-3.5 text-[var(--accent)]",
											strokeWidth: 1.75
										}), "确认告警"]
									})
								})]
							}, al.id);
						})
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					className: "lg:col-span-5",
					title: "30 天核心服务 SLA 明细",
					description: "基于持久化故障事件与当前健康探针实时估算可用率。",
					children: !sla || sla.services.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "暂无服务可用性统计数据。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-3.5",
						children: sla.services.slice(0, 7).map((svc) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceMeter, {
							label: svc.name,
							value: svc.uptimePct,
							valueText: `${svc.uptimePct.toFixed(2)}% · ${svc.incidents} 次事件`,
							tone: svc.uptimePct < 99 ? "err" : svc.uptimePct < 99.8 ? "warn" : "ok"
						}, svc.id))
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "声明式告警规则库",
				description: `按需启停内建与自定义阈值策略，当前匹配 ${filteredRules.length}/${rules.length} 条规则。`,
				bodyClassName: "p-0",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2 max-w-full",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative w-full sm:w-52",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							className: "size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
							strokeWidth: 1.75
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "search",
							value: ruleQuery,
							onChange: (e) => setRuleQuery(e.target.value),
							placeholder: "搜索规则名称或指标...",
							"aria-label": "搜索告警规则",
							"data-testid": "alert-rules-search",
							className: cn("w-full h-8 pl-8 pr-2.5 sm:text-[12.5px]", inputBaseClass)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
						value: ruleStatusFilter,
						onChange: setRuleStatusFilter,
						options: RULE_STATUS_FILTERS,
						ariaLabel: "按启用状态筛选规则"
					})]
				}),
				children: filteredRules.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					message: rules.length === 0 ? "尚未定义任何告警规则。" : "未找到匹配的告警规则。",
					action: ruleQuery || ruleStatusFilter !== "all" ? {
						label: "重置筛选",
						onClick: () => {
							setRuleQuery("");
							setRuleStatusFilter("all");
						}
					} : void 0
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left border-collapse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-5 sm:pl-6 pr-3",
									children: "规则名称"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "指标条件"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "级别与通道"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "冷却"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right",
									children: "启用 / 操作"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-[var(--border-subtle)] text-[13px]",
							children: filteredRules.map((rule) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 pl-5 sm:pl-6 pr-3 font-medium text-[var(--ink)] max-w-[240px] truncate",
										title: rule.name,
										children: rule.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-3 px-3 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
										children: [
											METRIC_LABELS[rule.metric] || rule.metric,
											" ",
											OPERATOR_LABELS[rule.operator] || rule.operator,
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[var(--ink)] font-semibold",
												children: rule.threshold
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-3 whitespace-nowrap",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
												status: rule.severity === "critical" ? "failed" : rule.severity === "warning" ? "degraded" : "healthy",
												label: rule.severity
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-[11.5px] text-[var(--ink-subtle)]",
												children: CHANNEL_LABELS[rule.channel] || rule.channel
											})]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-3 px-3 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap",
										children: [rule.cooldownMinutes, "m"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "inline-flex items-center justify-end gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleSwitch, {
												checked: rule.enabled,
												onCheckedChange: (next) => void handleToggleRule(rule.id, next),
												label: rule.enabled ? "启用" : "暂停"
											}), !rule.builtin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												disabled: readOnly,
												onClick: () => handleDeleteRule(rule.id, rule.name),
												"aria-label": `删除规则 ${rule.name}`,
												className: cn("h-7 w-7 inline-flex items-center justify-center rounded-md text-[var(--err)] hover:bg-[var(--err)]/10 transition-colors duration-150 ease-out cursor-pointer disabled:opacity-40", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, {
													className: "size-4",
													strokeWidth: 1.75
												})
											})]
										})
									})
								]
							}, rule.id))
						})]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "事件时间线与复盘备注 (Postmortem)",
				description: "为持久化状态变更事件附加根因分析与处置结论，便于后续回溯。",
				children: incidents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "暂无状态变更事件。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-[var(--border-subtle)]",
					children: incidents.slice(0, 10).map((inc, idx) => {
						const incKey = String(inc.id ?? idx);
						const actor = inc.node || inc.component || inc.target || inc.entityKey || "系统";
						const fromS = inc.fromState || inc.fromStatus || inc.from;
						const toS = inc.toState || inc.toStatus || inc.to;
						const transition = fromS || toS ? `${statusLabel(fromS)} → ${statusLabel(toS)}` : "";
						const isEditing = editingIncidentId === incKey && inc.id != null;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "py-3.5 first:pt-0 last:pb-0 space-y-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-baseline gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-medium text-[13.5px] text-[var(--ink)]",
												children: actor
											}), transition && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-[12px] text-[var(--ink-muted)]",
												children: transition
											})]
										}),
										(inc.detail || inc.message) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-0.5 text-[12.5px] text-[var(--ink-muted)] text-pretty",
											children: inc.detail || inc.message
										}),
										inc.note && !isEditing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1.5 text-[12.5px] text-[var(--ink)] bg-[var(--surface-subtle)]/75 rounded-lg px-3 py-2 text-pretty",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[var(--ink-subtle)] mr-1.5",
												children: "复盘备注"
											}), inc.note]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5 shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums",
										children: formatDateTime(inc.ts || inc.timestamp)
									}), inc.id != null && !isEditing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "ghost",
										size: "sm",
										disabled: readOnly,
										onClick: () => startEditNote(inc),
										"data-testid": `edit-incident-note-${inc.id}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePenLine, {
											className: "size-3.5",
											strokeWidth: 1.75
										}), inc.note ? "编辑复盘" : "添加复盘"]
									})]
								})]
							}), isEditing && inc.id != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-2 pt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: noteDraft,
										onChange: (e) => setNoteDraft(e.target.value),
										placeholder: "输入根因定位、影响面与改进动作...",
										"data-testid": `incident-note-input-${inc.id}`,
										className: cn("flex-1 min-w-[220px] h-9 px-3", inputBaseClass)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "primary",
										size: "sm",
										disabled: savingNote,
										onClick: () => void handleSaveNote(inc.id),
										"data-testid": `save-incident-note-${inc.id}`,
										children: savingNote ? "保存中..." : "保存备注"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => setEditingIncidentId(null),
										children: "取消"
									})
								]
							})]
						}, incKey);
					})
				})
			})
		]
	});
}
export { AlertsView };
