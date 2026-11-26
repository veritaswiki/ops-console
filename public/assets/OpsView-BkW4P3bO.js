import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { Bt as Copy, Ft as Download, G as ShieldCheck, Gt as CircleCheck, Ht as CircleX, Jt as Check, Y as Search, an as Archive, at as Play } from "./vendor-ui-DUVxOpTN.js";
import { Ct as fetchPrometheusMetrics, L as cn, Lt as runOpsAction, P as statusLabel, Rt as runRunbook, U as copyToClipboard, _ as StatusIndicator, g as SegmentedFilter, ht as fetchConfigStudio, i as filterAuditEntries, k as formatDateTime, l as Button, lt as executeTimerAction, m as Panel, n as auditEntriesToCsv, pn as validateConfigStudio, t as ModuleFrame, u as EmptyState, wt as fetchRunbooks, x as inputBaseClass } from "./app-nZGM7CNZ.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/OpsView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var AUDIT_OUTCOME_OPTIONS = [
	{
		value: "all",
		label: "全部"
	},
	{
		value: "ok",
		label: "成功"
	},
	{
		value: "fail",
		label: "失败"
	}
];
var OPS_TABS = [
	{
		value: "tasks",
		label: "巡检与定时任务"
	},
	{
		value: "runbooks",
		label: "Runbook 自愈预案"
	},
	{
		value: "studio",
		label: "配置中心与 RBAC"
	}
];
function OpsView({ snapshot, incidents, audit, readOnly, onRefresh, onRefreshOps, onToast, onConfirm }) {
	const [tab, setTab] = import_react.useState("tasks");
	const [opsBusy, setOpsBusy] = import_react.useState(null);
	const [opsOutput, setOpsOutput] = import_react.useState("");
	const [runbooksState, setRunbooksState] = import_react.useState(null);
	const [runningRbId, setRunningRbId] = import_react.useState(null);
	const [latestExecution, setLatestExecution] = import_react.useState(null);
	const [auditQuery, setAuditQuery] = import_react.useState("");
	const [auditOutcome, setAuditOutcome] = import_react.useState("all");
	const [studio, setStudio] = import_react.useState(null);
	const [configDraft, setConfigDraft] = import_react.useState("");
	const [validationResult, setValidationResult] = import_react.useState(null);
	const [validating, setValidating] = import_react.useState(false);
	const [promText, setPromText] = import_react.useState("");
	const [copiedKey, setCopiedKey] = import_react.useState("");
	const timers = snapshot?.services?.timers || snapshot?.timers || [];
	const filteredAudit = import_react.useMemo(() => filterAuditEntries(audit, {
		query: auditQuery,
		outcome: auditOutcome
	}), [
		audit,
		auditQuery,
		auditOutcome
	]);
	const handleExportAuditCsv = async () => {
		if (filteredAudit.length === 0) {
			onToast("当前没有可导出的审计记录", "info");
			return;
		}
		const csv = auditEntriesToCsv(filteredAudit);
		try {
			const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `ops-console-audit-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			onToast(`已导出 ${filteredAudit.length} 条审计记录 CSV`, "ok");
		} catch {
			const ok = await copyToClipboard(csv);
			onToast(ok ? "已复制审计 CSV 到剪贴板" : "导出失败", ok ? "ok" : "err");
		}
	};
	const loadRunbooks = import_react.useCallback(async () => {
		try {
			const res = await fetchRunbooks();
			setRunbooksState(res);
		} catch {}
	}, []);
	const loadStudio = import_react.useCallback(async () => {
		try {
			const [cfgRes, promRes] = await Promise.all([fetchConfigStudio(), fetchPrometheusMetrics().catch(() => "")]);
			setStudio(cfgRes);
			setConfigDraft(JSON.stringify(cfgRes.config, null, 2));
			setPromText(promRes);
		} catch {}
	}, []);
	import_react.useEffect(() => {
		if (tab === "runbooks") loadRunbooks();
		else if (tab === "studio") loadStudio();
	}, [
		tab,
		loadRunbooks,
		loadStudio
	]);
	const handleCopy = async (key, text) => {
		if (await copyToClipboard(text)) {
			setCopiedKey(key);
			onToast("已复制到剪贴板", "ok");
			window.setTimeout(() => setCopiedKey(""), 1800);
		}
	};
	const handleRunOps = (action) => {
		if (readOnly) {
			onToast("只读模式已禁用运维命令执行", "err");
			return;
		}
		const label = action === "health-check" ? "全栈健康巡检" : "配置与状态快照备份";
		onConfirm({
			open: true,
			title: `执行运维任务：${label}`,
			description: `确认在控制面主机执行受限白名单任务「${label}」？执行记录将记入审计日志。`,
			confirmLabel: "确认执行",
			onConfirm: async () => {
				setOpsBusy(action);
				try {
					const res = await runOpsAction(action);
					setOpsOutput(res.output || res.message || `${label} 已完成。`);
					onToast(`${label} 执行完成`, "ok");
					await Promise.all([onRefresh(), onRefreshOps()]);
				} catch (err) {
					onToast(`${label} 失败：${err.message}`, "err");
				} finally {
					setOpsBusy(null);
				}
			}
		});
	};
	const handleTimerAction = (timer, action) => {
		if (!action) return;
		if (readOnly) {
			onToast("只读模式已禁用定时器操作", "err");
			return;
		}
		onConfirm({
			open: true,
			title: `定时器操作：${timer.name || timer.unit}`,
			description: `确认对定时任务 ${timer.unit} 执行 ${action} 操作？`,
			confirmLabel: "确认执行",
			danger: action === "stop" || action === "disable",
			onConfirm: async () => {
				try {
					await executeTimerAction(timer.unit, action);
					onToast(`定时器 ${timer.unit} 已执行 ${action}`, "ok");
					await Promise.all([onRefresh(), onRefreshOps()]);
				} catch (err) {
					onToast(`操作失败：${err.message}`, "err");
				}
			}
		});
	};
	const handleTriggerRunbook = (rbId, rbName) => {
		if (readOnly) {
			onToast("只读模式已禁用 Runbook 执行", "err");
			return;
		}
		onConfirm({
			open: true,
			title: `执行 Runbook：${rbName}`,
			description: "将按编排顺序依次执行白名单诊断与恢复动作，受每小时自动熔断次数约束，并记录完整审计轨迹。",
			confirmLabel: "确认执行预案",
			onConfirm: async () => {
				setRunningRbId(rbId);
				try {
					const res = await runRunbook(rbId);
					setLatestExecution(res.run);
					onToast(`Runbook「${rbName}」执行${res.run.ok ? "成功" : "部分异常"}`, res.run.ok ? "ok" : "err");
					await Promise.all([
						loadRunbooks(),
						onRefreshOps(),
						onRefresh()
					]);
				} catch (err) {
					onToast(`Runbook 执行失败：${err.message}`, "err");
				} finally {
					setRunningRbId(null);
				}
			}
		});
	};
	const handleValidateConfig = async () => {
		setValidating(true);
		try {
			const res = await validateConfigStudio(configDraft);
			setValidationResult({
				valid: res.valid,
				errors: res.errors || []
			});
			onToast(res.valid ? "配置 Schema 校验通过" : `发现 ${res.errors.length} 项配置问题`, res.valid ? "ok" : "err");
		} catch (err) {
			onToast(`校验请求失败：${err.message}`, "err");
		} finally {
			setValidating(false);
		}
	};
	const allIncidents = incidents.length > 0 ? incidents : snapshot?.incidents || [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ModuleFrame, {
		title: "运维、Runbook 与配置治理",
		description: "白名单巡检备份、受控自愈预案 (Runbooks)、配置 Schema 校验、RBAC 权限态势与 Prometheus 指标导出。",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
			value: tab,
			onChange: setTab,
			options: OPS_TABS,
			ariaLabel: "运维子视图切换"
		}),
		children: [
			tab === "tasks" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "md",
							disabled: opsBusy !== null || readOnly,
							onClick: () => handleRunOps("health-check"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, {
								className: "size-4 text-[var(--accent)]",
								strokeWidth: 1.75
							}), opsBusy === "health-check" ? "巡检中..." : "执行全栈健康巡检"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "primary",
							size: "md",
							disabled: opsBusy !== null || readOnly,
							onClick: () => handleRunOps("backup"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, {
								className: "size-4",
								strokeWidth: 1.75
							}), opsBusy === "backup" ? "备份中..." : "触发配置备份"]
						})]
					}),
					opsOutput && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "运维命令输出",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => setOpsOutput(""),
							children: "收起"
						}),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "m-0 rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-4 font-mono text-[12px] overflow-x-auto whitespace-pre-wrap max-h-[260px]",
							children: opsOutput
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "systemd 定时任务",
						description: "自动化备份、索引维护与健康检查计划任务状态。",
						bodyClassName: "p-0",
						children: timers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "尚未配置受管 systemd 定时任务。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-left border-collapse",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 pl-5 sm:pl-6 pr-3",
											children: "定时单元"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "状态"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "下次触发"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "上次运行"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right",
											children: "控制"
										})
									]
								}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
									className: "divide-y divide-[var(--border-subtle)] text-[13px]",
									children: timers.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
												className: "py-2.5 pl-5 sm:pl-6 pr-3 max-w-[260px]",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "font-medium text-[var(--ink)] truncate",
													children: t.name || t.unit
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "font-mono text-[12px] text-[var(--ink-subtle)] truncate",
													children: t.unit
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2.5 px-3 whitespace-nowrap",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, { status: t.status || t.activeState })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
												children: t.nextElapse || "-"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2.5 px-3 font-mono text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
												children: t.lastTrigger || "-"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
													defaultValue: "",
													disabled: readOnly,
													"aria-label": `操作定时器 ${t.unit}`,
													onChange: (e) => {
														const val = e.target.value;
														e.target.value = "";
														if (val) handleTimerAction(t, val);
													},
													className: cn("ui-select h-8 pl-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[12.5px] text-[var(--ink)] transition-colors duration-150 ease-out hover:border-[var(--border-strong)] focus:border-[var(--accent)] disabled:opacity-45 cursor-pointer", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-0"),
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "",
															disabled: true,
															children: "操作"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "start",
															children: "启动"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "stop",
															children: "停止"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "enable",
															children: "启用"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "disable",
															children: "禁用"
														})
													]
												})
											})
										]
									}, t.unit))
								})]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
							title: "持久化状态变更事件",
							description: "记录全栈服务与连接器的健康度漂移历史。",
							children: allIncidents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "暂无持久化状态变更记录。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "divide-y divide-[var(--border-subtle)]",
								children: allIncidents.slice(0, 12).map((inc, idx) => {
									const actor = inc.node || inc.component || inc.target || inc.entityKey || "系统";
									const fromS = inc.fromState || inc.fromStatus || inc.from;
									const toS = inc.toState || inc.toStatus || inc.to;
									const transition = fromS || toS ? `${statusLabel(fromS)} → ${statusLabel(toS)}` : "";
									const detail = inc.detail || inc.message || inc.summary || "";
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-[13px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-baseline gap-1.5 min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-medium text-[var(--ink)] truncate max-w-[180px]",
													title: actor,
													children: actor
												}), transition && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono text-[12px] text-[var(--ink-muted)] whitespace-nowrap",
													children: transition
												})]
											}), detail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-0.5 text-[12px] text-[var(--ink-subtle)] truncate",
												title: detail,
												children: detail
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0",
											children: formatDateTime(inc.ts || inc.timestamp)
										})]
									}, inc.id || `${inc.ts}-${idx}`);
								})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
							title: "不可变操作审计轨迹",
							description: `所有写操作、探针登记与命令触发均留痕可溯，当前匹配 ${filteredAudit.length}/${audit.length} 条。`,
							bodyClassName: "p-0",
							actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "secondary",
								size: "sm",
								disabled: filteredAudit.length === 0,
								onClick: () => void handleExportAuditCsv(),
								"data-testid": "audit-export-csv-btn",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
									className: "size-3.5 text-[var(--ink-muted)]",
									strokeWidth: 1.75
								}), "导出 CSV"]
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "px-5 sm:px-6 py-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative flex-1 min-w-[160px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
										className: "size-3.5 text-[var(--ink-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
										strokeWidth: 1.75
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "search",
										value: auditQuery,
										onChange: (e) => setAuditQuery(e.target.value),
										placeholder: "过滤操作、目标或执行人...",
										"aria-label": "过滤审计记录",
										"data-testid": "audit-search-input",
										className: cn("w-full h-8 pl-8 pr-2.5 sm:text-[12.5px]", inputBaseClass)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedFilter, {
									value: auditOutcome,
									onChange: setAuditOutcome,
									options: AUDIT_OUTCOME_OPTIONS,
									ariaLabel: "按结果筛选审计日志"
								})]
							}), filteredAudit.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
								message: audit.length === 0 ? "暂无操作审计记录。" : "当前筛选条件下无匹配审计记录。",
								action: auditQuery || auditOutcome !== "all" ? {
									label: "重置筛选",
									onClick: () => {
										setAuditQuery("");
										setAuditOutcome("all");
									}
								} : void 0
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "overflow-x-auto",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
									className: "w-full text-left border-collapse",
									"data-testid": "audit-log-table",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-2.5 pl-5 sm:pl-6 pr-3",
												children: "时间"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-2.5 px-3",
												children: "操作与目标"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right",
												children: "结果"
											})
										]
									}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
										className: "divide-y divide-[var(--border-subtle)] text-[13px]",
										children: filteredAudit.slice(0, 20).map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
											className: "hover:bg-[var(--surface-hover)] transition-colors duration-150 ease-out",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap",
													children: formatDateTime(item.ts || item.timestamp)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
													className: "py-2.5 px-3 max-w-[240px] truncate",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-medium text-[var(--ink)]",
														children: item.action || "-"
													}), item.target && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "ml-1.5 font-mono text-[12px] text-[var(--ink-muted)]",
														children: item.target
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right whitespace-nowrap",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
														status: item.ok === false || item.status === "error" ? "failed" : "healthy",
														label: item.ok === false ? "失败" : item.result || "成功"
													})
												})
											]
										}, `${item.ts || idx}-${idx}`))
									})]
								})
							})]
						})]
					})
				]
			}),
			tab === "runbooks" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 lg:grid-cols-3 gap-5",
						children: (runbooksState?.runbooks || []).map((rb) => {
							const quotaUsed = rb.recentRunsLastHour ?? 0;
							const quotaFull = quotaUsed >= rb.maxAutoRunsPerHour;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
								title: rb.name,
								description: rb.description,
								className: "flex flex-col",
								bodyClassName: "flex-1 flex flex-col justify-between gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-[12px] text-[var(--ink-subtle)] font-mono tabular-nums",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: rb.approvalMode === "auto-guarded" ? "受限自动保护" : "人工审批触发" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											"1h 配额 ",
											quotaUsed,
											"/",
											rb.maxAutoRunsPerHour
										] })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
										className: "space-y-1.5 text-[12.5px] text-[var(--ink-muted)] list-decimal pl-4",
										children: rb.steps.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: s.label }, s.id))
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[11.5px] text-[var(--ink-subtle)]",
										children: rb.id
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "primary",
										size: "sm",
										disabled: readOnly || runningRbId !== null || quotaFull,
										onClick: () => handleTriggerRunbook(rb.id, rb.name),
										"data-testid": `run-runbook-${rb.id}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
											className: "size-3.5 translate-x-[1px]",
											strokeWidth: 1.75
										}), runningRbId === rb.id ? "执行中..." : quotaFull ? "已达熔断上限" : "执行预案"]
									})]
								})]
							}, rb.id);
						})
					}),
					latestExecution && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: `执行追踪：${latestExecution.runbookName}`,
						description: `执行 ID ${latestExecution.id} · 开始于 ${formatDateTime(latestExecution.startedAt)} · 耗时 ${latestExecution.durationMs}ms · 触发人 ${latestExecution.actor}`,
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
								status: latestExecution.ok ? "healthy" : "failed",
								label: latestExecution.ok ? "全部步骤通过" : "存在失败步骤"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => setLatestExecution(null),
								children: "收起"
							})]
						}),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "divide-y divide-[var(--border-subtle)]",
							"data-testid": "runbook-trace",
							children: latestExecution.steps.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-[13px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-2.5 min-w-0",
									children: [step.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
										className: "size-4 text-[var(--ok)] shrink-0 mt-0.5",
										strokeWidth: 1.75
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, {
										className: "size-4 text-[var(--err)] shrink-0 mt-0.5",
										strokeWidth: 1.75
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium text-[var(--ink)]",
											children: step.label
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-mono text-[12px] text-[var(--ink-subtle)]",
											children: step.detail
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums shrink-0",
									children: [step.durationMs, "ms"]
								})]
							}, step.id))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
						title: "Runbook 历史执行记录",
						description: "点击任意历史记录行可在上方展开完整的逐步执行追踪与耗时明细。",
						bodyClassName: "p-0",
						children: !runbooksState || runbooksState.runs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "尚未执行过任何自愈 Runbook 预案。" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-left border-collapse",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-[var(--border)] text-[12px] font-medium text-[var(--ink-subtle)]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 pl-5 sm:pl-6 pr-3",
											children: "执行时间"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "预案名称"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "状态"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3 text-right",
											children: "步骤"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right",
											children: "耗时"
										})
									]
								}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
									className: "divide-y divide-[var(--border-subtle)] text-[13px]",
									children: runbooksState.runs.map((run) => {
										const isInspected = latestExecution?.id === run.id;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
											onClick: () => setLatestExecution(run),
											"data-testid": `runbook-history-row-${run.id}`,
											className: cn("cursor-pointer transition-colors duration-150 ease-out", isInspected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-hover)]"),
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-2.5 pl-5 sm:pl-6 pr-3 font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums whitespace-nowrap",
													children: formatDateTime(run.startedAt)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-2.5 px-3 font-medium text-[var(--ink)]",
													children: run.runbookName
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													className: "py-2.5 px-3 whitespace-nowrap",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
														status: run.ok ? "healthy" : "failed",
														label: run.ok ? "通过" : "异常"
													})
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
													className: "py-2.5 px-3 text-right font-mono text-[12px] text-[var(--ink-muted)] tabular-nums",
													children: [
														run.steps.filter((s) => s.ok).length,
														"/",
														run.steps.length
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
													className: "py-2.5 pl-3 pr-5 sm:pr-6 text-right font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums",
													children: [run.durationMs, "ms"]
												})
											]
										}, run.id);
									})
								})]
							})
						})
					})
				]
			}),
			tab === "studio" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
						className: "lg:col-span-7",
						title: "脱敏配置快照与 Schema 预检 (Dry-Run)",
						description: "所有密钥字段已在服务端自动掩码脱敏。编辑 JSON 后可在线执行配置 Schema 校验。",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "primary",
							size: "sm",
							disabled: validating || !configDraft.trim(),
							onClick: () => void handleValidateConfig(),
							"data-testid": "validate-config-btn",
							children: validating ? "校验中..." : "校验配置 Schema"
						}),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: configDraft,
							onChange: (e) => setConfigDraft(e.target.value),
							rows: 14,
							spellCheck: false,
							"aria-label": "配置 JSON 编辑器",
							className: cn("w-full p-3.5 font-mono sm:text-[12px] leading-relaxed resize-y", inputBaseClass)
						}), validationResult && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							"data-testid": "config-validation-result",
							className: cn("mt-3 rounded-lg px-3.5 py-2.5 text-[12.5px] flex items-start gap-2", validationResult.valid ? "bg-[var(--ok)]/[0.08] text-[var(--ok)]" : "bg-[var(--err)]/[0.08] text-[var(--err)]"),
							children: validationResult.valid ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
								className: "size-4 shrink-0 mt-0.5",
								strokeWidth: 1.75
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium",
								children: "Schema 预检通过：未发现结构或端口范围错误。"
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, {
								className: "size-4 shrink-0 mt-0.5",
								strokeWidth: 1.75
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "list-disc pl-4 space-y-1",
								children: validationResult.errors.map((err, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: err }, i))
							})] })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lg:col-span-5 space-y-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
							title: "RBAC 角色与 SSO 鉴权态势",
							description: "细粒度角色权限矩阵与零信任代理头接入能力。",
							children: studio?.config?.rbacPosture ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[12.5px] text-[var(--ink-muted)]",
										children: ["当前会话主体：", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "ml-1.5 font-mono font-medium text-[var(--ink)]",
											children: studio.config.rbacPosture.currentActor
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "divide-y divide-[var(--border-subtle)] text-[13px]",
										children: studio.config.rbacPosture.roles.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "py-2.5 first:pt-0 last:pb-0 space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-medium text-[var(--ink)]",
													children: r.role
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
													status: r.active ? "healthy" : "standby",
													label: r.active ? "已生效" : "可配置"
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-mono text-[11.5px] text-[var(--ink-subtle)]",
												children: r.permissions.join(" · ")
											})]
										}, r.role))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "pt-2 border-t border-[var(--border-subtle)] text-[12px] text-[var(--ink-subtle)]",
										children: ["支持前置鉴权：", studio.config.rbacPosture.ssoAdapters.join(" / ")]
									})
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { message: "正在加载 RBAC 配置..." })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
							title: "最小权限 sudoers 模板",
							description: "仅授予白名单 systemd 单元的 NOPASSWD 启停权限。",
							actions: studio?.sudoersPreview ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "secondary",
								size: "sm",
								onClick: () => void handleCopy("sudoers", studio.sudoersPreview),
								children: [copiedKey === "sudoers" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
									className: "size-3.5 text-[var(--ok)]",
									strokeWidth: 1.75
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
									className: "size-3.5",
									strokeWidth: 1.75
								}), "复制规则"]
							}) : void 0,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
								className: "m-0 rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-3.5 font-mono text-[11.5px] overflow-x-auto whitespace-pre-wrap",
								children: studio?.sudoersPreview || "暂无 system-scope 服务需要 sudoers 授权。"
							})
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Prometheus / OpenMetrics 抓取端点",
					description: "可直接被 Grafana Alloy / Prometheus 拉取的原生指标输出（GET /api/metrics）。",
					actions: promText ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						size: "sm",
						onClick: () => void handleCopy("prom", promText),
						children: [copiedKey === "prom" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
							className: "size-3.5 text-[var(--ok)]",
							strokeWidth: 1.75
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
							className: "size-3.5",
							strokeWidth: 1.75
						}), "复制指标文本"]
					}) : void 0,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						"data-testid": "prometheus-preview",
						className: "m-0 rounded-xl bg-[var(--terminal-bg)] text-[var(--terminal-ink)] border border-white/[0.08] p-4 font-mono text-[11.5px] overflow-x-auto whitespace-pre max-h-[240px]",
						children: promText || "正在抓取 /api/metrics ..."
					})
				})]
			})
		]
	});
}
export { OpsView };
