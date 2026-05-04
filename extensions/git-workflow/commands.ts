/**
 * Commands — /git-status and /pr-summary.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
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
} from "./git-utils.js";
import { generateHtml, writeTempHtml, type PrSummaryData } from "./pr-summary-html.js";

/**
 * Register /git-status and /pr-summary commands.
 */
export function registerCommands(pi: ExtensionAPI): void {
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

	// Open in default browser
	await pi.exec("open", [filePath]);

	ctx.ui.notify(`PR summary opened in browser (${commits.length} commits, ${changedFiles.length} files)`, "info");
}
