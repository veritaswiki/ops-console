import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { $ as RefreshCw, Pt as ExternalLink, X as Save } from "./vendor-ui-DUVxOpTN.js";
import { L as cn, _ as StatusIndicator, _t as fetchLinearState, d as ErrorState, k as formatDateTime, l as Button, m as Panel, qt as syncLinearGithub, sn as updateLinearGithubConfig, t as ModuleFrame, u as EmptyState, x as inputBaseClass, y as ViewSkeleton } from "./app-nZGM7CNZ.js";
import { i as getIssueStatusMeta } from "./linear-projects-LAF1L5Uq.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// web/views/GithubView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function safeGithubHref(url) {
	if (!url) return null;
	const trimmed = String(url).trim();
	if (/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(\/.*)?$/i.test(trimmed)) return trimmed;
	return null;
}
function GithubView({ readOnly = false, onToast }) {
	const [linearState, setLinearState] = import_react.useState(null);
	const [loading, setLoading] = import_react.useState(true);
	const [error, setError] = import_react.useState(null);
	const [savingGithub, setSavingGithub] = import_react.useState(false);
	const [syncingGithub, setSyncingGithub] = import_react.useState(false);
	const [githubDraft, setGithubDraft] = import_react.useState({
		enabled: true,
		owner: "",
		repo: "",
		defaultBranch: "main",
		syncDirection: "bidirectional",
		tokenEnvVar: "GITHUB_TOKEN",
		autoCreatePr: true
	});
	const loadState = import_react.useCallback(async () => {
		setError(null);
		try {
			const lin = await fetchLinearState();
			setLinearState(lin);
			setGithubDraft({
				enabled: lin.githubConfig.enabled,
				owner: lin.githubConfig.owner || "",
				repo: lin.githubConfig.repo || "",
				defaultBranch: lin.githubConfig.defaultBranch || "main",
				syncDirection: lin.githubConfig.syncDirection || "bidirectional",
				tokenEnvVar: lin.githubConfig.tokenEnvVar || "GITHUB_TOKEN",
				autoCreatePr: lin.githubConfig.autoCreatePr
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "加载 GitHub 同步状态失败");
		} finally {
			setLoading(false);
		}
	}, []);
	import_react.useEffect(() => {
		loadState();
	}, [loadState]);
	const handleSaveGithub = async (e) => {
		e.preventDefault();
		if (readOnly) return;
		setSavingGithub(true);
		try {
			await updateLinearGithubConfig({
				enabled: githubDraft.enabled,
				owner: githubDraft.owner.trim(),
				repo: githubDraft.repo.trim(),
				defaultBranch: githubDraft.defaultBranch.trim() || "main",
				syncDirection: githubDraft.syncDirection,
				tokenEnvVar: githubDraft.tokenEnvVar.trim() || "GITHUB_TOKEN",
				autoCreatePr: githubDraft.autoCreatePr
			});
			onToast?.("GitHub 同步配置已保存", "ok");
			await loadState();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "保存 GitHub 配置失败", "err");
		} finally {
			setSavingGithub(false);
		}
	};
	const handleSyncGithub = async () => {
		if (readOnly) return;
		setSyncingGithub(true);
		try {
			const res = await syncLinearGithub(githubDraft.syncDirection);
			onToast?.(res.summary || `GitHub 同步完成 (${res.mode})`, "ok");
			await loadState();
		} catch (err) {
			onToast?.(err instanceof Error ? err.message : "GitHub 同步失败", "err");
		} finally {
			setSyncingGithub(false);
		}
	};
	if (loading && !linearState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ViewSkeleton, {});
	if (error && !linearState) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorState, {
		title: "GitHub 加载失败",
		message: error,
		onRetry: () => void loadState()
	});
	const githubLinkedIssues = (linearState?.issues || []).filter((i) => Boolean(i.github));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ModuleFrame, {
		title: "GitHub",
		description: "配置目标仓库并执行 Issue / Pull Request 双向同步，追踪 Agent 隔离 Worktree 的代码交付。",
		meta: `${linearState?.githubConfig.owner || "example-org"}/${linearState?.githubConfig.repo || "ops-console"} · ${githubLinkedIssues.length} 项已关联`,
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			variant: "primary",
			size: "sm",
			disabled: readOnly || syncingGithub,
			"data-testid": "github-sync-now-btn",
			onClick: () => void handleSyncGithub(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-3.5", syncingGithub && "animate-spin") }), syncingGithub ? "同步中..." : "立即同步 GitHub"]
		}),
		testId: "view-github",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "仓库连接配置",
				description: "访问令牌仅从服务端环境变量读取，绝不明文落盘或暴露给浏览器。",
				className: "lg:col-span-7",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSaveGithub,
					className: "space-y-3.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12.5px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "Owner / Org"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									disabled: readOnly || savingGithub,
									value: githubDraft.owner,
									onChange: (e) => setGithubDraft((g) => ({
										...g,
										owner: e.target.value
									})),
									placeholder: "example-org",
									className: cn("w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]", inputBaseClass)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block space-y-1 text-[12.5px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[var(--ink-muted)]",
									children: "Repository"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									disabled: readOnly || savingGithub,
									value: githubDraft.repo,
									onChange: (e) => setGithubDraft((g) => ({
										...g,
										repo: e.target.value
									})),
									placeholder: "ops-console",
									className: cn("w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]", inputBaseClass)
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-3 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "默认分支"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										disabled: readOnly || savingGithub,
										value: githubDraft.defaultBranch,
										onChange: (e) => setGithubDraft((g) => ({
											...g,
											defaultBranch: e.target.value
										})),
										className: cn("w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]", inputBaseClass)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "同步方向"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										disabled: readOnly || savingGithub,
										value: githubDraft.syncDirection,
										onChange: (e) => setGithubDraft((g) => ({
											...g,
											syncDirection: e.target.value
										})),
										className: cn("ui-select w-full h-10 sm:h-9 pl-3 text-[12.5px] cursor-pointer", inputBaseClass),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "bidirectional",
												children: "双向同步 (Issues + PR)"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "pull",
												children: "仅拉取 Issues"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "push",
												children: "仅推送 PR 状态"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "block space-y-1 text-[12.5px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[var(--ink-muted)]",
										children: "Token 环境变量"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										disabled: readOnly || savingGithub,
										value: githubDraft.tokenEnvVar,
										onChange: (e) => setGithubDraft((g) => ({
											...g,
											tokenEnvVar: e.target.value.toUpperCase()
										})),
										className: cn("w-full h-10 sm:h-9 px-3 font-mono text-[12.5px]", inputBaseClass)
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-5 pt-1 text-[12.5px] text-[var(--ink-muted)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "inline-flex items-center gap-2 cursor-pointer",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									disabled: readOnly,
									checked: githubDraft.enabled,
									onChange: (e) => setGithubDraft((g) => ({
										...g,
										enabled: e.target.checked
									})),
									className: "accent-[var(--accent)]"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "启用双向同步" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "inline-flex items-center gap-2 cursor-pointer",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									disabled: readOnly,
									checked: githubDraft.autoCreatePr,
									onChange: (e) => setGithubDraft((g) => ({
										...g,
										autoCreatePr: e.target.checked
									})),
									className: "accent-[var(--accent)]"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "派发时自动关联 PR" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							variant: "secondary",
							size: "sm",
							disabled: readOnly || savingGithub,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-3.5" }), savingGithub ? "保存中..." : "保存配置"]
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
				title: "同步状态",
				description: "配置服务端 Token 时直连 GitHub REST API；未配置时在本地安全模拟闭环。",
				className: "lg:col-span-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 text-[13px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "目标仓库"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-[12.5px] text-[var(--ink)] truncate",
								children: [
									linearState?.githubConfig.owner,
									"/",
									linearState?.githubConfig.repo
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "连接模式"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
								status: linearState?.githubConfig.hasServerToken ? "healthy" : "standby",
								label: linearState?.githubConfig.hasServerToken ? "Live API" : "本地模拟"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[var(--ink-muted)]",
								children: "最近同步"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[12px] text-[var(--ink-subtle)] tabular-nums",
								children: linearState?.githubConfig.lastSyncedAt ? formatDateTime(linearState.githubConfig.lastSyncedAt) : "尚未同步"
							})]
						}),
						linearState?.githubConfig.lastSyncSummary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "pt-2 border-t border-[var(--border-subtle)] text-[12.5px] text-[var(--ink-muted)]",
							children: linearState.githubConfig.lastSyncSummary
						})
					]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: `关联交付项 (${githubLinkedIssues.length})`,
			description: "所有与 GitHub Issue 或 Pull Request 绑定的任务及对应隔离分支。",
			bodyClassName: "p-0",
			children: githubLinkedIssues.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				title: "暂无关联项",
				message: "点击右上角「立即同步 GitHub」拉取或关联仓库交付项。"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left border-collapse text-[13px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-[var(--border-subtle)] text-[11.5px] text-[var(--ink-subtle)]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-5 font-medium whitespace-nowrap",
								children: "编号"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-4 font-medium",
								children: "任务标题"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-4 font-medium whitespace-nowrap",
								children: "PR / Issue"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-4 font-medium whitespace-nowrap",
								children: "Worktree 分支"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2.5 px-5 font-medium whitespace-nowrap text-right",
								children: "状态"
							})
						]
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
						className: "divide-y divide-[var(--border-subtle)]",
						children: githubLinkedIssues.map((item) => {
							const safeUrl = safeGithubHref(item.github?.url);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "hover:bg-[var(--surface-hover)]/50 transition-colors",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-5 font-mono text-[12px] font-semibold text-[var(--accent)] whitespace-nowrap",
										children: item.identifier
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-4 text-[var(--ink)] font-medium",
										children: item.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-4 font-mono text-[12px] whitespace-nowrap tabular-nums",
										children: safeUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: safeUrl,
											target: "_blank",
											rel: "noopener noreferrer",
											className: "inline-flex items-center gap-1 text-[var(--accent)] hover:underline",
											children: [
												item.github?.repo,
												item.github?.prNumber ? ` #${item.github.prNumber}` : item.github?.issueNumber ? ` #${item.github.issueNumber}` : "",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })
											]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.github?.repo })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-4 font-mono text-[12px] text-[var(--ink-muted)] whitespace-nowrap",
										children: item.github?.branch || item.worktreeBranch || "-"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "py-3 px-5 whitespace-nowrap text-right",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
											status: getIssueStatusMeta(item.status).tone,
											label: getIssueStatusMeta(item.status).label
										})
									})
								]
							}, item.id);
						})
					})]
				})
			})
		})]
	});
}
export { GithubView, GithubView as default };
