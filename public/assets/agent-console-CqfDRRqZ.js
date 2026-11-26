import { a as getPriorityMeta } from "./linear-projects-LAF1L5Uq.js";
// web/lib/agent-console.ts
var SIMPLE_BOARD_COLUMNS = [
	{
		id: "queued",
		label: "待执行 / 下一步",
		targetStatus: "todo",
		hint: "待分配、分诊与排期中的任务"
	},
	{
		id: "in_progress",
		label: "执行中",
		targetStatus: "in_progress",
		hint: "Agent 正在处理的活跃任务"
	},
	{
		id: "in_review",
		label: "待评审 / PR",
		targetStatus: "in_review",
		hint: "等待评审或 GitHub PR 合并"
	},
	{
		id: "done",
		label: "已完成",
		targetStatus: "done",
		hint: "已交付验收的任务"
	}
];
function mapStatusToSimpleColumn(status) {
	switch (status) {
		case "triage":
		case "backlog":
		case "todo": return "queued";
		case "in_progress": return "in_progress";
		case "in_review": return "in_review";
		case "done": return "done";
		default: return null;
	}
}
function groupIssuesForSimpleBoard(issues) {
	const buckets = {
		queued: [],
		in_progress: [],
		in_review: [],
		done: []
	};
	for (const item of issues) {
		const col = mapStatusToSimpleColumn(item.status);
		if (!col) continue;
		buckets[col].push(item);
	}
	const sortByUrgency = (a, b) => {
		if (a.status === "triage" && b.status !== "triage") return -1;
		if (b.status === "triage" && a.status !== "triage") return 1;
		return getPriorityMeta(b.priority).weight - getPriorityMeta(a.priority).weight;
	};
	for (const col of Object.keys(buckets)) buckets[col].sort(sortByUrgency);
	return buckets;
}
function shortAgentName(name) {
	const raw = String(name || "").trim();
	if (!raw) return "Agent";
	return raw.replace(/\s*[（(][^）)]*[）)]\s*$/u, "").trim() || raw;
}
export { groupIssuesForSimpleBoard as n, shortAgentName as r, SIMPLE_BOARD_COLUMNS as t };
