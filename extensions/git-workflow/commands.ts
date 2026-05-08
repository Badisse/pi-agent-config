/**
 * Commands — /git-status and /pr-summary.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { GitWorkflowConfig } from "./config.js";
import {
	isGitRepo,
	getCurrentBranch,
	getDefaultBranch,
	isDirty,
	countChangedFiles,
	getBranchCommits,
	getDiffStat,
	getChangedFiles,
	getDiff,
	branchExists,
	createBranch,
} from "./git-utils.js";
import { generateHtml, writeTempHtml, type PrSummaryData } from "./pr-summary-html.js";
import { getSessionBranchName, getCachedDefaultBranch } from "./branch.js";

/**
 * Register /branch, /git-status and /pr-summary commands.
 */
export function registerCommands(pi: ExtensionAPI, getConfig: () => GitWorkflowConfig): void {
	pi.registerCommand("branch", {
		description: "Create and switch to a new agent branch",
		handler: async (_args, ctx) => {
			await handleBranch(pi, ctx, getConfig());
		},
	});

	pi.registerCommand("git-status", {
		description: "Show a clean summary of the current git repo state",
		handler: async (_args, ctx) => {
			await handleGitStatus(pi, ctx);
		},
	});

	pi.registerCommand("pr-summary", {
		description: "Generate a PR-ready summary and open it in your browser",
		handler: async (_args, ctx) => {
			await handlePrSummary(pi, ctx);
		},
	});
}

async function handleBranch(pi: ExtensionAPI, ctx: ExtensionContext, config: GitWorkflowConfig): Promise<void> {
	const inRepo = await isGitRepo(pi);
	if (!inRepo) {
		ctx.ui.notify("Not in a git repository", "warning");
		return;
	}

	const current = await getCurrentBranch(pi);
	const defaultBranch = getCachedDefaultBranch();

	if (!ctx.hasUI) {
		// AFK mode — auto-branch with session ID if on default
		if (defaultBranch && current === defaultBranch) {
			const branchName = getSessionBranchName(config);
			if (!(await branchExists(pi, branchName))) {
				await createBranch(pi, branchName);
			}
		}
		return;
	}

	// Suggest the session branch ID as default, let user override
	const suggestedName = getSessionBranchName(config);
	const name = await ctx.ui.input("Branch name:", suggestedName);
	if (!name?.trim()) {
		ctx.ui.notify("Branch cancelled", "info");
		return;
	}

	const branchName = name.trim();

	if (await branchExists(pi, branchName)) {
		ctx.ui.notify(`Branch "${branchName}" already exists`, "warning");
		return;
	}

	const created = await createBranch(pi, branchName);
	if (created) {
		ctx.ui.notify(`Created and switched to branch: ${branchName}`, "success");
	} else {
		ctx.ui.notify("Failed to create branch — check git output", "error");
	}
}

async function handleGitStatus(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	const inRepo = await isGitRepo(pi);
	if (!inRepo) {
		ctx.ui.notify("Not in a git repository", "warning");
		return;
	}

	const branch = await getCurrentBranch(pi);
	const dirty = await isDirty(pi);
	const changedFiles = dirty ? await countChangedFiles(pi) : 0;
	const defaultBranch = await getDefaultBranch(pi);
	const branchCommits = await getBranchCommits(pi, defaultBranch);

	const lines: string[] = [
		`Branch: ${branch || "(detached HEAD)"}`,
		`Status: ${dirty ? `${changedFiles} changed file(s)` : "clean"}`,
		`Base:   ${defaultBranch}`,
		`Ahead:  ${branchCommits.length} commit(s)`,
	];

	if (dirty) {
		const { stdout: statusLines } = await pi.exec("git", ["status", "--porcelain"]);
		const files = statusLines.trim().split("\n").filter(Boolean);
		for (const f of files.slice(0, 15)) {
			lines.push(`  ${f}`);
		}
		if (files.length > 15) {
			lines.push(`  ... and ${files.length - 15} more`);
		}
	}

	ctx.ui.notify(lines.join("\n"), "info");
}

async function handlePrSummary(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	const inRepo = await isGitRepo(pi);
	if (!inRepo) {
		ctx.ui.notify("Not in a git repository", "warning");
		return;
	}

	const branch = await getCurrentBranch(pi);
	if (!branch) {
		ctx.ui.notify("Cannot generate summary on detached HEAD", "warning");
		return;
	}

	const defaultBranch = await getDefaultBranch(pi);
	const commits = await getBranchCommits(pi, defaultBranch);

	if (commits.length === 0) {
		ctx.ui.notify(
			`No commits found on "${branch}" that aren't on "${defaultBranch}"`,
			"info",
		);
		return;
	}

	const diffStat = await getDiffStat(pi, defaultBranch);
	const changedFiles = await getChangedFiles(pi, defaultBranch);
	const diff = await getDiff(pi, defaultBranch);

	// Generate and write HTML
	const data: PrSummaryData = { branch, baseBranch: defaultBranch, commits, changedFiles, diffStat, diff };
	const html = generateHtml(data);
	const filePath = writeTempHtml(html);

	// Open in default browser (platform-aware)
	const opener = process.platform === "darwin" ? "open" : "xdg-open";
	await pi.exec(opener, [filePath]);

	ctx.ui.notify(`PR summary opened in browser (${commits.length} commits, ${changedFiles.length} files)`, "info");
}
