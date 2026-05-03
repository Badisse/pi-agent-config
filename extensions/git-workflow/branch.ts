/**
 * Branch management — auto-create agent branches when the agent starts working.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { GitWorkflowConfig } from "./config.js";
import {
	isGitRepo,
	getCurrentBranch,
	branchExists,
	createBranch,
	switchBranch,
	toBranchName,
} from "./git-utils.js";

/** Track whether we've already branched in this session to avoid duplicate branches. */
let branchedThisSession = false;

/** Reset state on new session. */
export function resetBranchState(): void {
	branchedThisSession = false;
}

/**
 * Ensure we're on an agent branch. If on a protected branch and autoBranch is enabled,
 * create/switch to a descriptive agent branch.
 *
 * Called from `before_agent_start` so it runs before the LLM makes changes.
 */
export async function ensureAgentBranch(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	config: GitWorkflowConfig,
	taskDescription: string,
): Promise<void> {
	if (!config.autoBranch || branchedThisSession) return;

	const inRepo = await isGitRepo(pi);
	if (!inRepo) return;

	const current = await getCurrentBranch(pi);
	if (!current) return; // detached HEAD — don't auto-branch

	const isProtected = config.protectedBranches.some(
		(b) => b.toLowerCase() === current.toLowerCase(),
	);

	if (!isProtected) return; // already on a feature/agent branch

	// Generate branch name from the task description
	const branchName = toBranchName(config.branchPrefix, taskDescription);

	if (await branchExists(pi, branchName)) {
		const switched = await switchBranch(pi, branchName);
		if (switched) {
			ctx.ui.notify(`Switched to existing branch: ${branchName}`, "info");
		}
	} else {
		const created = await createBranch(pi, branchName);
		if (created) {
			ctx.ui.notify(`Created branch: ${branchName}`, "info");

			// Auto-name session based on branch
			if (config.sessionNaming) {
				pi.setSessionName(branchName.replace(new RegExp(`^${config.branchPrefix}/`), ""));
			}
		}
	}

	branchedThisSession = true;
}

/**
 * Block commits to protected branches.
 */
export function isProtectedBranch(
	currentBranch: string,
	protectedBranches: string[],
): boolean {
	return protectedBranches.some(
		(b) => b.toLowerCase() === currentBranch.toLowerCase(),
	);
}
