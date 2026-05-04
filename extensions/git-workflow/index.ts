/**
 * Git Workflow Extension for Pi
 *
 * Provides a structured git workflow for the AI coding agent:
 * - Agent branch management (auto-create branches off protected branches)
 * - Git checkpoints (stash snapshots for /fork restore)
 * - Dirty repo guard (warn on session switch with uncommitted changes)
 * - Protected branch guard (block direct commits to main/master)
 * - Guided conventional commits (/commit command)
 * - Repo status (/git-status command)
 * - PR summary from branch commits (/pr-summary command)
 * - .gitignore guard (warn if missing)
 * - Session naming from branch name
 *
 * Configuration:
 *   Global defaults are defined in config.ts.
 *   Per-project overrides: `.pi/git-workflow.json` in the repo root.
 *
 *   Example `.pi/git-workflow.json`:
 *   {
 *     "branchPrefix": "feature",
 *     "protectedBranches": ["main"],
 *     "checkpoint": false
 *   }
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { GitWorkflowConfig } from "./config.js";
import { loadConfig } from "./config-loader.js";
import { resetBranchState, ensureAgentBranch } from "./branch.js";
import { resetCheckpoints, trackEntry, createCheckpoint, handleForkRestore } from "./checkpoint.js";
import { registerCommitCommand, validateCommitMessage } from "./commit.js";
import { dirtyRepoGuard, blockProtectedBranchCommit } from "./guard.js";
import { registerCommands } from "./commands.js";
import { isGitRepo, getCurrentBranch, fileExists } from "./git-utils.js";
import { cleanupOldSummaries } from "./pr-summary-html.js";

/** Currently loaded config (refreshed on session start). */
let config: GitWorkflowConfig;

export default function gitWorkflowExtension(pi: ExtensionAPI): void {
	// ── Session lifecycle ───────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		config = loadConfig(ctx.cwd);

		if (!config.enabled) return;

		const inRepo = await isGitRepo(pi);
		if (!inRepo) return;

		resetBranchState();
		resetCheckpoints();

		// Sweep old PR summary HTML files (>3 days)
		cleanupOldSummaries();

		if (!ctx.hasUI) return;

		// Notify that the extension is active
		const branch = await getCurrentBranch(pi);
		ctx.ui.notify(`Git workflow active on "${branch}"`, "info");

		// .gitignore guard
		if (config.gitignoreGuard) {
			const hasGitignore = await fileExists(pi, ".gitignore");
			if (!hasGitignore) {
				ctx.ui.notify(
					"No .gitignore found — consider creating one to avoid committing unwanted files",
					"warning",
				);
			}
		}
	});

	// ── Branch management ───────────────────────────────────────

	pi.on("before_agent_start", async (event, ctx) => {
		if (!config.enabled || !config.autoBranch) return;

		await ensureAgentBranch(pi, ctx, config, event.prompt);
	});

	// ── Git checkpoints ─────────────────────────────────────────

	pi.on("tool_result", async (_event, ctx) => {
		if (!config.enabled || !config.checkpoint) return;
		trackEntry(ctx);
	});

	pi.on("turn_start", async () => {
		if (!config.enabled || !config.checkpoint) return;
		await createCheckpoint(pi);
	});

	pi.on("session_before_fork", async (event, ctx) => {
		if (!config.enabled) return;

		// Checkpoint restore first
		if (config.checkpoint) {
			await handleForkRestore(pi, ctx, event.entryId);
		}

		// Then dirty guard
		if (config.dirtyGuard) {
			return dirtyRepoGuard(pi, ctx, "Fork session");
		}
	});

	pi.on("agent_end", async () => {
		if (!config.enabled) return;
		resetCheckpoints();
	});

	// ── Tool call interception ──────────────────────────────────

	pi.on("tool_call", async (event, ctx) => {
		if (!config.enabled) return undefined;

		// Intercept bash commands
		if (event.toolName === "bash") {
			const command = event.input.command as string;
			if (!command) return undefined;

			// 1. Protected branch guard — block git commit on main/master
			if (/\bgit\s+commit\b/.test(command)) {
				const blocked = await blockProtectedBranchCommit(pi, ctx, command, config);
				if (blocked) return blocked;
			}

			// 2. Conventional commit validation — validate git commit -m "..." format
			if (/\bgit\s+commit\s+.*(-m|--message)\b/.test(command)) {
				const invalid = validateCommitMessage(command, config);
				if (invalid) return invalid;
			}
		}

		return undefined;
	});

	// ── Dirty repo guard ────────────────────────────────────────

	pi.on("session_before_switch", async (event, ctx) => {
		if (!config.enabled || !config.dirtyGuard) return undefined;

		const action = event.reason === "new" ? "Start new session" : "Switch session";
		return dirtyRepoGuard(pi, ctx, action);
	});



	// ── Commands ────────────────────────────────────────────────

	registerCommitCommand(pi, () => config);
	registerCommands(pi);
}
