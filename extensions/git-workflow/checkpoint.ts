/**
 * Git checkpoints — create stash snapshots before each agent turn
 * so /fork can restore code state.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { isGitRepo } from "./git-utils.js";

/** Map of entry ID → stash ref for checkpoint restoration. */
const checkpoints = new Map<string, string>();

/** Current entry ID being tracked. */
let currentEntryId: string | undefined;

/** Reset checkpoint state. */
export function resetCheckpoints(): void {
	checkpoints.clear();
	currentEntryId = undefined;
}

/**
 * Track the current entry ID from tool results.
 * Call from `tool_result` event.
 */
export function trackEntry(ctx: ExtensionContext): void {
	const leaf = ctx.sessionManager.getLeafEntry();
	if (leaf) currentEntryId = leaf.id;
}

/**
 * Create a stash checkpoint before the LLM makes changes.
 * Call from `turn_start` event.
 */
export async function createCheckpoint(pi: ExtensionAPI): Promise<void> {
	const inRepo = await isGitRepo(pi);
	if (!inRepo) return;

	const { stdout } = await pi.exec("git", ["stash", "create"]);
	const ref = stdout.trim();
	if (ref && currentEntryId) {
		checkpoints.set(currentEntryId, ref);
	}
}

/**
 * Offer to restore code state when forking.
 * Call from `session_before_fork` event.
 */
export async function handleForkRestore(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	entryId: string,
): Promise<void> {
	const ref = checkpoints.get(entryId);
	if (!ref) return;

	if (!ctx.hasUI) return;

	const choice = await ctx.ui.select("Restore code state to this point?", [
		"Yes, restore code to that checkpoint",
		"No, keep current code",
	]);

	if (choice?.startsWith("Yes")) {
		await pi.exec("git", ["stash", "apply", ref]);
		ctx.ui.notify("Code restored to checkpoint", "info");
	}
}
