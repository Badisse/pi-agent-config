/**
 * Commit command — guided conventional commit with type/scope/message picker.
 * Also intercepts `git commit` via bash to validate conventional format when enabled.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { GitWorkflowConfig, CommitType } from "./config.js";
import {
	isGitRepo,
	isDirty,
	countChangedFiles,
	getCurrentBranch,
	isProtectedBranch,
	stageAndCommit,
} from "./git-utils.js";

/**
 * Register the /commit command.
 */
export function registerCommitCommand(pi: ExtensionAPI, config: GitWorkflowConfig): void {
	pi.registerCommand("commit", {
		description: "Guided conventional commit (type, scope, message)",
		handler: async (_args, ctx) => {
			await handleCommit(pi, ctx, config);
		},
	});
}

/**
 * Intercept `git commit` via bash to validate conventional commit format.
 * Returns a block result if the message doesn't match the expected format.
 */
export function validateCommitMessage(
	command: string,
	config: GitWorkflowConfig,
): { block: true; reason: string } | undefined {
	if (!config.conventionalCommits) return undefined;

	// Match git commit -m "..." or git commit -m '...'
	const match = command.match(/git\s+commit\s+(?:-m|--message)\s+["'](.+?)["']/);
	if (!match) return undefined; // no inline message, let it through (editor-based commits)

	const message = match[1];
	const pattern = /^(\w+)(?:\(([^)]+)\))?:\s+.+/;

	if (!pattern.test(message)) {
		return {
			block: true,
			reason: `Commit message doesn't follow conventional format: "${message}"\nExpected: type(scope): description\nTypes: ${config.commitTypes.join(", ")}`,
		};
	}

	// Validate type
	const typeMatch = message.match(/^(\w+)/);
	if (typeMatch && !config.commitTypes.includes(typeMatch[1])) {
		return {
			block: true,
			reason: `Unknown commit type: "${typeMatch[1]}"\nAllowed types: ${config.commitTypes.join(", ")}`,
		};
	}

	return undefined;
}

/**
 * Interactive commit flow: pick type → optional scope → message → commit.
 */
async function handleCommit(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	config: GitWorkflowConfig,
): Promise<void> {
	const inRepo = await isGitRepo(pi);
	if (!inRepo) {
		ctx.ui.notify("Not in a git repository", "warning");
		return;
	}

	const dirty = await isDirty(pi);
	if (!dirty) {
		ctx.ui.notify("No changes to commit", "info");
		return;
	}

	const currentBranch = await getCurrentBranch(pi);
	if (currentBranch && isProtectedBranch(currentBranch, config.protectedBranches)) {
		ctx.ui.notify(
			`Cannot commit directly to "${currentBranch}". Switch to an agent branch first.`,
			"warning",
		);
		return;
	}

	if (!ctx.hasUI) {
		ctx.ui.notify("Commit requires interactive mode", "warning");
		return;
	}

	const changedCount = await countChangedFiles(pi);

	// Step 1: Pick commit type
	const typeChoice = await ctx.ui.select(
		`Commit (${changedCount} changed file(s)) — Select type:`,
		config.commitTypes.map((t) => t),
	);
	if (!typeChoice) {
		ctx.ui.notify("Commit cancelled", "info");
		return;
	}

	// Step 2: Optional scope
	const scope = await ctx.ui.input("Scope (optional, press Enter to skip):", "");
	const scopePart = scope?.trim() ? `(${scope.trim()})` : "";

	// Step 3: Commit message
	const message = await ctx.ui.input("Commit message:", "");
	if (!message?.trim()) {
		ctx.ui.notify("Commit cancelled — empty message", "info");
		return;
	}

	const fullMessage = `${typeChoice}${scopePart}: ${message.trim()}`;

	// Step 4: Confirm
	const confirmed = await ctx.ui.confirm("Commit?", fullMessage);
	if (!confirmed) {
		ctx.ui.notify("Commit cancelled", "info");
		return;
	}

	const success = await stageAndCommit(pi, fullMessage);
	if (success) {
		ctx.ui.notify(`Committed: ${fullMessage}`, "success");
	} else {
		ctx.ui.notify("Commit failed — check git output", "error");
	}
}
