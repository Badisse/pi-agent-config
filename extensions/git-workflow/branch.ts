/**
 * Branch management — lazily create agent branches on first commit.
 *
 * Instead of eagerly branching on session start (from the task description),
 * we create a branch only when an actual commit is about to happen.
 * Branch names use a short random ID, not the session/task name.
 *
 * The default branch is resolved once on session start and cached,
 * avoiding repeated git calls on every commit.
 */

import { randomUUID } from "node:crypto";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { GitWorkflowConfig } from "./config.js";
import {
	isGitRepo,
	getCurrentBranch,
	getDefaultBranch,
	branchExists,
	createBranch,
	switchBranch,
} from "./git-utils.js";

/** Maximum number of auto-branch retries with new IDs on collision. */
const MAX_BRANCH_RETRIES = 3;

/** Whether we've already created a branch this session. */
let branchedThisSession = false;

/** Short random ID for this session's branch (generated on session start). */
let sessionBranchId: string;

/** Cached default branch name, resolved once per session. */
let cachedDefaultBranch: string | undefined;

/**
 * Initialise branch state for a new session.
 * Resolves and caches the default branch to avoid repeated git calls.
 */
export async function initBranchState(pi: ExtensionAPI): Promise<void> {
	branchedThisSession = false;
	sessionBranchId = randomUUID().slice(0, 8);

	const inRepo = await isGitRepo(pi);
	if (inRepo) {
		cachedDefaultBranch = await getDefaultBranch(pi);
	} else {
		cachedDefaultBranch = undefined;
	}
}

/**
 * Get the branch name that would be created for this session.
 * Format: `<prefix>/<8-char-id>` (e.g. `agent/a3f7b2c1`)
 */
export function getSessionBranchName(config: GitWorkflowConfig): string {
	return `${config.branchPrefix}/${sessionBranchId}`;
}

/**
 * Get the cached default branch name.
 * Returns undefined if not in a repo or not yet initialised.
 */
export function getCachedDefaultBranch(): string | undefined {
	return cachedDefaultBranch;
}

/**
 * Ensure we're on an agent branch before committing.
 * Only triggers when on the default (trunk) branch — does nothing on feature branches.
 *
 * Called lazily from `tool_call` when a `git commit` is detected,
 * or from `/commit` when the user initiates a commit.
 *
 * Returns the branch name if a branch was created/switched, undefined otherwise.
 */
export async function ensureBranchForCommit(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	config: GitWorkflowConfig,
): Promise<string | undefined> {
	if (!config.autoBranch) return undefined;

	const inRepo = await isGitRepo(pi);
	if (!inRepo) return undefined;

	const current = await getCurrentBranch(pi);
	if (!current) return undefined; // detached HEAD

	// Only auto-branch from the default (trunk) branch
	const defaultBranch = cachedDefaultBranch ?? await getDefaultBranch(pi);
	if (current !== defaultBranch) return undefined;

	// Already branched this session — just switch back if needed
	if (branchedThisSession) {
		const branchName = getSessionBranchName(config);
		if (current !== branchName) {
			await switchBranch(pi, branchName);
		}
		return branchName;
	}

	// First commit this session — create the branch
	// Retry with new IDs on collision (extremely unlikely but safe)
	let branchName = getSessionBranchName(config);
	for (let attempt = 0; attempt < MAX_BRANCH_RETRIES; attempt++) {
		if (await branchExists(pi, branchName)) {
			// Collision — generate a new ID
			sessionBranchId = randomUUID().slice(0, 8);
			branchName = getSessionBranchName(config);
			continue;
		}
		break;
	}

	const created = await createBranch(pi, branchName);
	if (created) {
		ctx.ui.notify(`Auto-created branch: ${branchName}`, "info");
	}

	branchedThisSession = true;
	return branchName;
}
