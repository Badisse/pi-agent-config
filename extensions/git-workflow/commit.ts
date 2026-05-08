/**
 * Commit command — guided conventional commit with type/scope/message picker.
 * Also intercepts `git commit` via bash to validate conventional format when enabled.
 *
 * Protected branch blocking is handled by security-gate.ts.
 * Auto-branching on commit is handled by branch.ts::ensureBranchForCommit().
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { GitWorkflowConfig } from "./config.js";
import {
	isGitRepo,
	isDirty,
	countChangedFiles,
	listChangedFiles,
	stageAndCommit,
} from "./git-utils.js";
import { ensureBranchForCommit } from "./branch.js";

/**
 * Register the /commit command.
 * Accepts a getter function so the handler always reads the latest config
 * (config is loaded asynchronously on session_start, after commands are registered).
 */
export function registerCommitCommand(pi: ExtensionAPI, getConfig: () => GitWorkflowConfig): void {
	pi.registerCommand("commit", {
		description: "Guided conventional commit (type, scope, message)",
		handler: async (_args, ctx) => {
			await handleCommit(pi, ctx, getConfig());
		},
	});
}

/**
 * Intercept `git commit` via bash to validate conventional commit format.
 * Returns a block result if the message doesn't match the expected format.
 *
 * Handles flags between `git commit` and `-m` (e.g. `git commit -a -m "msg"`).
 */
export function validateCommitMessage(
	command: string,
	config: GitWorkflowConfig,
): { block: true; reason: string } | undefined {
	if (!config.conventionalCommits) return undefined;

	// Match git commit [...flags...] -m "..." or --message '...'
	// Allows arbitrary flags (like -a, --amend, etc.) before -m/--message
	const match = command.match(/git\s+commit\s+(?:\s+\S+)*\s*(-m|--message)\s+["'](.+?)["']/);
	if (!match) return undefined; // no inline message, let it through (editor-based commits)

	const message = match[2];
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
 * Interactive commit flow: pick type → optional scope → message → confirm files → commit.
 * Auto-branches if on the default (trunk) branch and autoBranch is enabled.
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

	if (!ctx.hasUI) {
		ctx.ui.notify("Commit requires interactive mode", "warning");
		return;
	}

	// Auto-branch if on default branch (lazy branching)
	await ensureBranchForCommit(pi, ctx, config);

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

	// Step 4: Show files that will be staged and confirm
	const files = await listChangedFiles(pi);
	const fileList = files.slice(0, 20).map((f) => `  ${f}`).join("\n");
	const more = files.length > 20 ? `\n  ... and ${files.length - 20} more` : "";

	const confirmed = await ctx.ui.confirm(
		"Commit?",
		`${fullMessage}\n\nFiles to stage (git add -A):\n${fileList}${more}`,
	);
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
