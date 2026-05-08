/**
 * Guards — dirty repo guard.
 * Protected branch blocking is handled by security-gate.ts.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
	isGitRepo,
	isDirty,
	countChangedFiles,
} from "./git-utils.js";

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
