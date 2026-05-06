/**
 * Guards — dirty repo guard and protected branch guard.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { GitWorkflowConfig } from "./config.js";
import {
	isGitRepo,
	isDirty,
	countChangedFiles,
	getCurrentBranch,
} from "./git-utils.js";
import { isProtectedBranch } from "./branch.js";

/**
 * Check for uncommitted changes and prompt the user.
 * Returns `{ cancel: true }` if the action should be cancelled.
 */
export async function dirtyRepoGuard(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	action: string,
): Promise<{ cancel: boolean } | undefined> {
	const inRepo = await isGitRepo(pi);
	if (!inRepo) return undefined;

	const dirty = await isDirty(pi);
	if (!dirty) return undefined;

	if (!ctx.hasUI) {
		return { cancel: true };
	}

	const changedFiles = await countChangedFiles(pi);

	const choice = await ctx.ui.select(
		`You have ${changedFiles} uncommitted file(s). ${action} anyway?`,
		["Yes, proceed anyway", "No, let me commit first"],
	);

	if (choice !== "Yes, proceed anyway") {
		ctx.ui.notify("Commit your changes first", "warning");
		return { cancel: true };
	}

	return undefined;
}

/**
 * Intercept `git commit` on protected branches and block it.
 */
export async function blockProtectedBranchCommit(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	command: string,
	config: GitWorkflowConfig,
): Promise<{ block: true; reason: string } | undefined> {
	// Only intercept git commit commands
	if (!/\bgit\s+commit\b/.test(command)) return undefined;

	const inRepo = await isGitRepo(pi);
	if (!inRepo) return undefined;

	const currentBranch = await getCurrentBranch(pi);
	if (!currentBranch) return undefined;

	if (isProtectedBranch(currentBranch, config.protectedBranches)) {
		// No UI (AFK mode) — hard block
		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `Direct commits to "${currentBranch}" are not allowed in AFK mode.`,
			};
		}

		// Interactive — ask the user
		const choice = await ctx.ui.select(
			`You're about to commit directly to "${currentBranch}". This is usually not recommended. Proceed anyway?`,
			["Yes, commit on " + currentBranch, "No, switch branch first"],
		);

		if (choice === "Yes, commit on " + currentBranch) {
			ctx.ui.notify(`Overridden — committing on "${currentBranch}".`, "info");
			return undefined; // allow
		}

		ctx.ui.notify("Commit blocked. Switch to an agent branch first.", "warning");
		return {
			block: true,
			reason: `Direct commits to "${currentBranch}" are not allowed. Switch to an agent branch first.`,
		};
	}

	return undefined;
}
