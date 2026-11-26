import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { $ as deleteBot, K as createBot, L as cn, _ as StatusIndicator, _t as fetchLinearState, an as updateBot, d as ErrorState, f as KpiStrip, k as formatDateTime, l as Button, m as Panel, mt as fetchBots, t as ModuleFrame, tn as triggerBotEvent, u as EmptyState, x as inputBaseClass, y as ViewSkeleton } from "./app-nZGM7CNZ.js";
import { J as Send, P as Trash, Xt as Bot, at as Play, nt as Power, rt as Plus } from "./vendor-ui-DUVxOpTN.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/components/BotSystemSection.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CHANNEL_OPTIONS = [
	{
		value: "github",
		label: "GitHub Webhook / App"
	},
	{
		value: "feishu",
		label: "飞书 / Lark 群机器人"
	},
	{
		value: "telegram",
		label: "Telegram Bot"
	},
	{
		value: "discord",
		label: "Discord Bot"
	},
	{
		value: "slack",
		label: "Slack App"
	},
	{
		value: "webhook",
		label: "通用 Webhook"
	}
];
var ROLE_OPTIONS = [
	{
		value: "commander-bridge",
		label: "总指挥直连桥接 (Commander Bridge)"
	},
	{
		value: "triage-intake",
		label: "需求分诊入队 (Triage Intake)"
	},
	{
		value: "pr-reviewer",
		label: "PR 评审守门员 (PR Reviewer)"
	},
	{
		value: "ops-alerter",
		label: "运维告警建单 (Ops Alerter)"
	},
	{
		value: "custom",
		label: "自定义自动化 Bot"
	}
];
function channelLabel(ch) {
	return CHANNEL_OPTIONS.find((c) => c.value === ch)?.label.split(" ")[0] || ch;
}
function roleLabel(role) {
	return ROLE_OPTIONS.find((r) => r.value === role)?.label.split(" (")[0] || role;
}
function BotSystemSection({ botsState, projects, availableAgents, readOnly = false, onReload, onToast }) {
	const [creating, setCreating] = import_react.useState(false);
	const [busyBotId, setBusyBotId] = import_react.useState(null);
	const [activeTriggerBotId, setActiveTriggerBotId] = import_react.useState(null);
	const [triggerTitle, setTriggerTitle] = import_react.useState("");
	const [triggerMessage, setTriggerMessage] = import_react.useState("");
	const [triggerPriority, setTriggerPriority] = import_react.useState("high");
	const [triggerDispatch, setTriggerDispatch] = import_react.useState(true);
	const [form, setForm] = import_react.useState({
		name: "",
		handle: "",
		channel: "feishu",
		role: "commander-bridge",
		boundAgentId: availableAgents[0]?.id || "",
		defaultProjectId: projects[0]?.id || "",
		webhookEnvVar: "BOT_WEBHOOK_TOKEN",
		triggerKeywords: "/fix, /deploy, @bot",
		description: "",
		autoCreateIssue: true,
		autoDispatchCommander: true
	});
	import_react.useEffect(() => {
		setForm((prev) => ({
			...prev,
			boundAgentId: prev.boundAgentId || availableAgents[0]?.id || "",
			defaultProjectId: prev.defaultProjectId || projects[0]?.id || ""
		}));
	}, [availableAgents, projects]);
	const bots = botsState?.bots || [];
	const activities = botsState?.activities || [];
	const summary = botsState?.summary || {
		total: 0,
		enabled: 0,
		online: 0,
		totalEvents: 0,
		totalIssuesCreated: 0,
		totalTasksDispatched: 0,
		byChannel: {}
	};
	const handleCreateBot = async (e) => {
		e.preventDefault();
		if (readOnly || !form.name.trim()) return;
		setCreating(true);
		try {
			const res = await createBot({
				name: form.name.trim(),
				handle: form.handle.trim() || void 0,
				channel: form.channel,
				role: form.role,
				boundAgentId: form.boundAgentId || void 0,
				defaultProjectId: form.defaultProjectId || void 0,
				webhookEnvVar: form.webhookEnvVar.trim() || void 0,
				triggerKeywords: form.triggerKeywords,
				description: form.description.trim(),
				autoCreateIssue: form.autoCreateIssue,
				autoDispatchCommander: form.autoDispatchCommander
			});
			onToast?.(`已建立 Bot：${res.bot.name} (${res.bot.handle})`, "ok");
			setForm((prev) => ({
				...prev,
				name: "",
				handle: "",
				description: ""
			}));
			await onReload();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "建立 Bot 失败", "err");
		} finally {
			setCreating(false);
		}
	};
	const handleToggleBot = async (bot) => {
		if (readOnly) return;
		setBusyBotId(bot.id);
		try {
			await updateBot(bot.id, { enabled: !bot.enabled });
			onToast?.(`${bot.name} 已${bot.enabled ? "停用" : "启用"}`, "ok");
			await onReload();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "切换 Bot 状态失败", "err");
		} finally {
			setBusyBotId(null);
		}
	};
	const handleDeleteBot = async (bot) => {
		if (readOnly) return;
		setBusyBotId(bot.id);
		try {
			await deleteBot(bot.id);
			if (activeTriggerBotId === bot.id) setActiveTriggerBotId(null);
			onToast?.(`已删除 Bot：${bot.name}`, "info");
			await onReload();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "删除 Bot 失败", "err");
		} finally {
			setBusyBotId(null);
		}
	};
	const handleTrigger = async (e, bot) => {
		e.preventDefault();
		if (readOnly || !triggerMessage.trim()) return;
		setBusyBotId(bot.id);
		try {
			const res = await triggerBotEvent(bot.id, {
				title: triggerTitle.trim() || void 0,
				message: triggerMessage.trim(),
				priority: triggerPriority,
				dispatchCommander: triggerDispatch
			});
			const createdId = res.createdIssue?.identifier ? ` → 已建单 ${res.createdIssue.identifier}` : "";
			const subCount = res.dispatchResult?.createdSubIssues?.length || 0;
			const dispatchedMsg = subCount > 0 ? ` · 总指挥拆解 ${subCount} 个子任务` : "";
			onToast?.(`${bot.name} 已响应事件${createdId}${dispatchedMsg}`, "ok");
			setTriggerTitle("");
			setTriggerMessage("");
			await onReload();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "触发 Bot 事件失败", "err");
		} finally {
			setBusyBotId(null);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		"data-testid": "bot-system-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiStrip, { cells: [
				{
					label: "已注册 Bot",
					value: `${summary.online}/${summary.total}`,
					numeric: {
						primary: summary.online,
						denominator: summary.total
					},
					sub: `启用 ${summary.enabled} 个多渠道自动化 Bot`,
					tone: summary.online > 0 ? "ok" : "muted"
				},
				{
					label: "累计接收事件",
					value: String(summary.totalEvents),
					numeric: { primary: summary.totalEvents },
					sub: "支持 GitHub / 飞书 / Telegram / Webhook"
				},
				{
					label: "自动建 Linear Issue",
					value: String(summary.totalIssuesCreated),
					numeric: { primary: summary.totalIssuesCreated },
					sub: "自动写入项目分诊或待执行队列"
				},
				{
					label: "移交总指挥派发",
					value: String(summary.totalTasksDispatched),
					numeric: { primary: summary.totalTasksDispatched },
					sub: "Bot 触发 → 总指挥拆解 → Worker 执行",
					tone: summary.totalTasksDispatched > 0 ? "ok" : "muted"
				}
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 xl:grid-cols-12 gap-6 items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "建立新 Bot",
					description: "创建绑定总指挥或 Worker Agent 的渠道 Bot，凭证统一通过服务端环境变量注入。",
					className: "xl:col-span-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleCreateBot,
						className: "space-y-3.5",
						"data-testid": "create-bot-form",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "Bot 名称 *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										required: true,
										disabled: readOnly || creating,
										value: form.name,
										onChange: (e) => setForm((f) => ({
											...f,
											name: e.target.value
										})),
										placeholder: "例如：发布值守 Bot",
										"data-testid": "bot-name-input",
										className: cn("w-full h-9 px-3 text-[13px]", inputBaseClass)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "Bot Handle"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										disabled: readOnly || creating,
										value: form.handle,
										onChange: (e) => setForm((f) => ({
											...f,
											handle: e.target.value
										})),
										placeholder: "@release-bot",
										"data-testid": "bot-handle-input",
										className: cn("w-full h-9 px-3 font-mono text-[12.5px]", inputBaseClass)
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "接入渠道"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										disabled: readOnly || creating,
										value: form.channel,
										onChange: (e) => setForm((f) => ({
											...f,
											channel: e.target.value
										})),
										"data-testid": "bot-channel-select",
										className: cn("ui-select w-full h-9 pl-3 text-[12.5px] cursor-pointer", inputBaseClass),
										children: CHANNEL_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: opt.value,
											children: opt.label
										}, opt.value))
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "职责角色"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										disabled: readOnly || creating,
										value: form.role,
										onChange: (e) => setForm((f) => ({
											...f,
											role: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 text-[12.5px] cursor-pointer", inputBaseClass),
										children: ROLE_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: opt.value,
											children: opt.label
										}, opt.value))
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "绑定执行 / 总指挥 Agent"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										disabled: readOnly || creating,
										value: form.boundAgentId,
										onChange: (e) => setForm((f) => ({
											...f,
											boundAgentId: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 text-[12.5px] cursor-pointer", inputBaseClass),
										children: availableAgents.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: a.id,
											children: [
												a.name,
												" (",
												a.role === "lead" ? "总指挥" : a.harness,
												")"
											]
										}, a.id))
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "默认归属项目"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										disabled: readOnly || creating,
										value: form.defaultProjectId,
										onChange: (e) => setForm((f) => ({
											...f,
											defaultProjectId: e.target.value
										})),
										className: cn("ui-select w-full h-9 pl-3 text-[12.5px] cursor-pointer", inputBaseClass),
										children: projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
											value: p.id,
											children: [
												p.key,
												" · ",
												p.name
											]
										}, p.id))
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "服务端凭证环境变量名"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										disabled: readOnly || creating,
										value: form.webhookEnvVar,
										onChange: (e) => setForm((f) => ({
											...f,
											webhookEnvVar: e.target.value.toUpperCase()
										})),
										placeholder: "FEISHU_BOT_WEBHOOK",
										className: cn("w-full h-9 px-3 font-mono text-[12px]", inputBaseClass)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "触发指令 / 关键词"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										disabled: readOnly || creating,
										value: form.triggerKeywords,
										onChange: (e) => setForm((f) => ({
											...f,
											triggerKeywords: e.target.value
										})),
										placeholder: "/fix, /ship, @commander",
										className: cn("w-full h-9 px-3 font-mono text-[12px]", inputBaseClass)
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12.5px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "职责说明"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									disabled: readOnly || creating,
									value: form.description,
									onChange: (e) => setForm((f) => ({
										...f,
										description: e.target.value
									})),
									placeholder: "例如：监听 GitHub PR 评论并自动转交总指挥拆解修复任务",
									className: cn("w-full h-9 px-3 text-[13px]", inputBaseClass)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[12.5px] text-[var(--ink-muted)]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-2 cursor-pointer select-none",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										disabled: readOnly || creating,
										checked: form.autoCreateIssue,
										onChange: (e) => setForm((f) => ({
											...f,
											autoCreateIssue: e.target.checked
										})),
										className: "accent-[var(--accent)]"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "收到事件自动建 Linear Issue" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-2 cursor-pointer select-none",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										disabled: readOnly || creating,
										checked: form.autoDispatchCommander,
										onChange: (e) => setForm((f) => ({
											...f,
											autoDispatchCommander: e.target.checked
										})),
										className: "accent-[var(--accent)]"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "自动移交总指挥拆解派发" })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "pt-1",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "submit",
									variant: "primary",
									size: "md",
									disabled: readOnly || creating || !form.name.trim(),
									"data-testid": "create-bot-submit",
									className: "w-full sm:w-auto",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), creating ? "创建中..." : "建立并激活 Bot"]
								})
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: `Bot 集群 (${bots.length})`,
					description: "启停各渠道 Bot，或直接模拟外部消息验证「Bot 接单 → 自动建 Linear Issue → 总指挥带队派发」全链路。",
					className: "xl:col-span-7",
					bodyClassName: "p-0",
					children: bots.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						title: "暂无已注册 Bot",
						message: "在左侧表单创建一个多渠道 Bot 以接入总指挥编排流水线。"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "divide-y divide-[var(--border-subtle)]",
						children: bots.map((bot) => {
							const isBusy = busyBotId === bot.id;
							const isTriggerOpen = activeTriggerBotId === bot.id;
							const agentName = availableAgents.find((a) => a.id === bot.boundAgentId)?.name || bot.boundAgentId || "未绑定";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								"data-testid": `bot-card-${bot.id}`,
								className: "p-5 space-y-3 hover:bg-[var(--surface-hover)]/45 transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1 space-y-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-center gap-x-2.5 gap-y-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ink)]",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "size-4 text-[var(--accent)] shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: bot.name })]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-mono text-[12px] text-[var(--ink-subtle)]",
														children: bot.handle
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
														status: bot.enabled ? bot.status : "standby",
														label: bot.enabled ? "在线" : "已停用"
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-mono text-[11.5px] text-[var(--ink-subtle)] tabular-nums",
												children: [
													channelLabel(bot.channel),
													" · ",
													roleLabel(bot.role),
													" · 绑定 ",
													agentName,
													" · 凭证 ",
													bot.webhookEnvVar || "无",
													bot.hasServerSecret ? " (已注入)" : " (模拟模式)"
												]
											}),
											bot.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[12.5px] text-[var(--ink-muted)] leading-relaxed",
												children: bot.description
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-[var(--ink-muted)] tabular-nums pt-0.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["事件 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "text-[var(--ink)]",
														children: bot.stats.eventsReceived
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														"aria-hidden": "true",
														children: "·"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["建单 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "text-[var(--ink)]",
														children: bot.stats.issuesCreated
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														"aria-hidden": "true",
														children: "·"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["总指挥派发 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "text-[var(--ink)]",
														children: bot.stats.tasksDispatched
													})] }),
													bot.triggerKeywords.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														"aria-hidden": "true",
														children: "·"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-[var(--ink-subtle)]",
														children: ["指令 ", bot.triggerKeywords.slice(0, 3).join(" / ")]
													})] })
												]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 shrink-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												variant: isTriggerOpen ? "primary" : "secondary",
												size: "sm",
												disabled: readOnly || isBusy || !bot.enabled,
												"data-testid": `bot-trigger-toggle-${bot.id}`,
												onClick: () => {
													if (isTriggerOpen) setActiveTriggerBotId(null);
													else {
														setActiveTriggerBotId(bot.id);
														setTriggerTitle("");
														setTriggerMessage(`@commander 修复 ${channelLabel(bot.channel)} 渠道上报的生产延迟抖动`);
														setTriggerDispatch(bot.autoDispatchCommander);
													}
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-3.5" }), "模拟触发"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												variant: "ghost",
												size: "icon",
												disabled: readOnly || isBusy,
												"aria-label": bot.enabled ? "停用 Bot" : "启用 Bot",
												title: bot.enabled ? "停用 Bot" : "启用 Bot",
												onClick: () => void handleToggleBot(bot),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { className: cn("size-3.5", bot.enabled ? "text-[var(--ok)]" : "text-[var(--ink-subtle)]") })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												variant: "ghost",
												size: "icon",
												disabled: readOnly || isBusy,
												"aria-label": "删除 Bot",
												title: "删除 Bot",
												onClick: () => void handleDeleteBot(bot),
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, { className: "size-3.5 text-[var(--ink-subtle)] hover:text-[var(--err)]" })
											})
										]
									})]
								}), isTriggerOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: (e) => void handleTrigger(e, bot),
									"data-testid": `bot-trigger-form-${bot.id}`,
									className: "mt-2 pt-3 border-t border-[var(--border-subtle)] space-y-2.5 bg-[var(--surface-subtle)]/50 rounded-xl p-3.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 sm:grid-cols-3 gap-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: triggerTitle,
												onChange: (e) => setTriggerTitle(e.target.value),
												placeholder: "可选：自定义 Linear Issue 标题",
												className: cn("sm:col-span-2 h-8 px-2.5 text-[12.5px]", inputBaseClass)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												value: triggerPriority,
												onChange: (e) => setTriggerPriority(e.target.value),
												className: cn("ui-select h-8 pl-2.5 text-[12.5px] cursor-pointer", inputBaseClass),
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "urgent",
														children: "P0 紧急"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "high",
														children: "P1 高"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "medium",
														children: "P2 中"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "low",
														children: "P3 低"
													})
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-col sm:flex-row gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												required: true,
												value: triggerMessage,
												onChange: (e) => setTriggerMessage(e.target.value),
												placeholder: "输入模拟触发指令或外部 Webhook 负载...",
												"data-testid": "bot-trigger-message-input",
												className: cn("flex-1 h-8 px-2.5 text-[12.5px]", inputBaseClass)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												type: "submit",
												variant: "primary",
												size: "sm",
												disabled: isBusy || !triggerMessage.trim(),
												"data-testid": "bot-trigger-submit-btn",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-3.5" }), isBusy ? "执行中..." : "发送触发事件"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "inline-flex items-center gap-2 text-[12px] text-[var(--ink-muted)] cursor-pointer select-none",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: triggerDispatch,
												onChange: (e) => setTriggerDispatch(e.target.checked),
												className: "accent-[var(--accent)]"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "建单后立即调用总指挥拆解子任务并派发至 A2A Worker" })]
										})
									]
								})]
							}, bot.id);
						})
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "Bot 事件与编排动态",
				description: "记录所有 Bot 收到的触发消息、自动生成的 Linear Issue 编号及总指挥派发结果。",
				bodyClassName: "p-0",
				children: activities.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
					title: "暂无触发记录",
					message: "点击任意在线 Bot 的「模拟触发」以观察自动建单与总指挥派发轨迹。"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left border-collapse text-[13px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-[var(--border-subtle)] text-[11.5px] font-medium text-[var(--ink-subtle)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-5 font-medium whitespace-nowrap",
									children: "时间"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-4 font-medium whitespace-nowrap",
									children: "Bot / 渠道"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-4 font-medium",
									children: "触发消息"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-4 font-medium whitespace-nowrap",
									children: "生成 Issue"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-5 font-medium whitespace-nowrap text-right",
									children: "总指挥派发"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-[var(--border-subtle)]",
							children: activities.slice(0, 16).map((act) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "hover:bg-[var(--surface-hover)]/50 transition-colors",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-5 font-mono text-[12px] text-[var(--ink-subtle)] whitespace-nowrap tabular-nums",
										children: formatDateTime(act.ts)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "py-2.5 px-4 whitespace-nowrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium text-[var(--ink)]",
											children: act.botName
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-mono text-[11px] text-[var(--ink-subtle)]",
											children: channelLabel(act.channel)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-4 text-[var(--ink-muted)] max-w-[380px] truncate",
										title: act.message,
										children: act.message
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-4 font-mono text-[12px] text-[var(--accent)] whitespace-nowrap tabular-nums",
										children: act.createdIssueIdentifier || "-"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-2.5 px-5 whitespace-nowrap text-right",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
											status: act.dispatched ? "healthy" : "standby",
											label: act.dispatched ? "已派发拆解" : "仅建单"
										})
									})
								]
							}, act.id))
						})]
					})
				})
			})
		]
	});
}
// web/views/BotsView.tsx
function BotsView({ readOnly = false, onToast }) {
	const [botsState, setBotsState] = import_react.useState(null);
	const [linearState, setLinearState] = import_react.useState(null);
	const [loading, setLoading] = import_react.useState(true);
	const [error, setError] = import_react.useState(null);
	const loadAll = import_react.useCallback(async () => {
		setError(null);
		try {
			const [bots, lin] = await Promise.all([fetchBots(), fetchLinearState()]);
			setBotsState(bots);
			setLinearState(lin);
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载 Bot 列表失败");
		} finally {
			setLoading(false);
		}
	}, []);
	import_react.useEffect(() => {
		loadAll();
	}, [loadAll]);
	if (loading && !botsState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewSkeleton, {});
	if (error && !botsState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
		title: "Bot 加载失败",
		message: error,
		onRetry: () => void loadAll()
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModuleFrame, {
		title: "Bot",
		description: "创建和管理飞书、Telegram、Discord、Slack 与 Webhook 自动化机器人，自动接收消息并派发给 Agent。",
		meta: `${botsState?.summary.online || 0}/${botsState?.summary.total || 0} Bot 在线`,
		testId: "view-bots",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BotSystemSection, {
			botsState,
			projects: linearState?.projects || [],
			availableAgents: linearState?.availableAgents || [],
			readOnly,
			onReload: loadAll,
			onToast
		})
	});
}
export { BotsView, BotsView as default };
