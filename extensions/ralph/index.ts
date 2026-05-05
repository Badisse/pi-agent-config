/**
 * Ralph Extension — Autonomous ralph loop for Pi.
 *
 * Commands:
 *   /ralph init              — Initialize ralph + labels + docs/agents/
 *   /ralph start [N]         — Start N parallel Docker agents (default 1)
 *   /ralph local [N]         — Same without Docker
 *   /ralph once              — Show ralph context for interactive session
 *   /ralph status            — Show sessions + GitHub issues
 *   /ralph log [session]     — Tail a session's output
 *   /ralph stop [session]    — Stop one or all ralph sessions
 *
 * Parallel agents use git worktrees for filesystem isolation.
 * Each agent works in its own worktree on its own branch.
 * Coordination through GitHub labels (in-progress, ready-for-agent).
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const RALPH_DIR = join(getAgentDir(), "ralph");
const TMUX_PREFIX = "ralph";
const DEFAULT_MODEL = "zai/glm-5.1";
const WORKTREE_BASE = ".ralph-worktrees";

// ── Helpers ─────────────────────────────────────────────────────

function getProjectDir(cwd: string): string {
	let dir = cwd;
	for (let i = 0; i < 20; i++) {
		if (existsSync(join(dir, ".git"))) return dir;
		const parent = join(dir, "..");
		if (parent === dir) break;
		dir = parent;
	}
	return cwd;
}

function getLogDir(projectDir: string): string {
	return join(projectDir, ".ralph-logs");
}

async function run(cmd: string, args: string[], opts?: { cwd?: string; timeout?: number; env?: Record<string, string> }): Promise<{ stdout: string; stderr: string; status: number | null }> {
	const child = spawn(cmd, args, { cwd: opts?.cwd, env: { ...process.env, ...opts?.env }, stdio: ["pipe", "pipe", "pipe"] });
	let stdout = "";
	let stderr = "";
	return new Promise((resolve) => {
		child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
		child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
		child.on("close", (code) => resolve({ stdout, stderr, status: code }));
		if (opts?.timeout) {
			setTimeout(() => { child.kill("SIGKILL"); resolve({ stdout, stderr, status: -1 }); }, opts.timeout);
		}
	});
}

async function getActiveSessions(): Promise<string[]> {
	const r = await run("tmux", ["list-sessions", "-F", "#{session_name}"], { timeout: 3000 });
	if (r.status !== 0) return [];
	return r.stdout.trim().split("\n").filter((s) => s.startsWith(TMUX_PREFIX));
}

async function getGitHubToken(): Promise<string> {
	const env = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
	if (env) return env;
	const r = await run("gh", ["auth", "token"], { timeout: 5000 });
	return r.stdout.trim();
}

function resolveModel(): string {
	return process.env.RALPH_MODEL || DEFAULT_MODEL;
}

function notify(ctx: any, msg: string, type: "info" | "warning" | "error" = "info") {
	ctx.ui.notify(msg, type);
}

async function countAvailableIssues(projectDir: string): Promise<number> {
	const r = await run("gh", ["issue", "list", "--label", "ready-for-agent", "--state", "open", "--json", "number"], { cwd: projectDir, timeout: 10000 });
	if (r.status !== 0 || !r.stdout.trim()) return 0;
	try {
		const issues = JSON.parse(r.stdout);
		return Array.isArray(issues) ? issues.length : 0;
	} catch { return 0; }
}

// ── Worktree management ─────────────────────────────────────────

async function cleanupWorktrees(projectDir: string): Promise<string[]> {
	const cleaned: string[] = [];
	const { stdout } = await run("git", ["worktree", "list", "--porcelain"], { cwd: projectDir, timeout: 5000 });

	for (const line of stdout.trim().split("\n")) {
		if (line.startsWith("worktree ")) {
			const path = line.slice(9);
			if (path.includes(WORKTREE_BASE)) {
				await run("git", ["worktree", "remove", path, "--force"], { cwd: projectDir, timeout: 10000 });
				cleaned.push(path);
			}
		}
	}

	// Prune stale references
	await run("git", ["worktree", "prune"], { cwd: projectDir, timeout: 5000 });

	// Clean up old pool branches
	const branches = await run("git", ["branch", "--list", "agent/pool-*"], { cwd: projectDir, timeout: 5000 });
	for (const branch of branches.stdout.trim().split("\n").map((b) => b.trim()).filter(Boolean)) {
		await run("git", ["branch", "-D", branch], { cwd: projectDir, timeout: 5000 });
	}

	return cleaned;
}

async function createWorktree(projectDir: string, index: number): Promise<string> {
	const worktreeDir = join(projectDir, WORKTREE_BASE, `agent-${index}`);
	const branchName = `agent/pool-${index}-${Date.now()}`;

	// Get current branch to base the worktree on
	const { stdout: currentBranch } = await run("git", ["branch", "--show-current"], { cwd: projectDir, timeout: 3000 });

	// Create worktree on a new branch
	await run("git", ["worktree", "add", worktreeDir, "-b", branchName], { cwd: projectDir, timeout: 10000 });

	return worktreeDir;
}

// ── Init ─────────────────────────────────────────────────────────

async function handleInit(ctx: any, projectDir: string) {
	const ralphDir = join(projectDir, "ralph");
	const docsDir = join(projectDir, "docs", "agents");

	if (!existsSync(ralphDir)) mkdirSync(ralphDir, { recursive: true });

	for (const script of ["afk.sh", "afk-local.sh", "once.sh"]) {
		const link = join(ralphDir, script);
		if (!existsSync(link)) {
			try { symlinkSync(join(RALPH_DIR, script), link); } catch { /* exists */ }
		}
	}
	if (!existsSync(join(ralphDir, "prompt.md"))) {
		writeFileSync(join(ralphDir, "prompt.md"), readFileSync(join(RALPH_DIR, "prompt.md")));
	}

	if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
	const templates: Record<string, string> = {
		"issue-tracker.md": ISSUE_TRACKER_TEMPLATE,
		"triage-labels.md": TRIAGE_LABELS_TEMPLATE,
		"domain.md": DOMAIN_TEMPLATE,
	};
	for (const [file, content] of Object.entries(templates)) {
		if (!existsSync(join(docsDir, file))) writeFileSync(join(docsDir, file), content);
	}

	// Create GitHub labels
	const labels = [
		["needs-triage", "Needs evaluation by maintainer", "EDEDED"],
		["needs-info", "Waiting on reporter for more information", "BFD4F2"],
		["ready-for-agent", "Fully specified, ready for autonomous AFK agent", "0E8A16"],
		["ready-for-human", "Needs human implementation", "FBCA04"],
		["in-progress", "Currently being worked on by an agent", "B60205"],
		["wontfix", "Will not be actioned", "FFFFFF"],
	];
	let labelsCreated = 0;
	for (const [name, desc, color] of labels) {
		const r = await run("gh", ["label", "create", name, "--description", desc, "--color", color, "--force"], { cwd: projectDir, timeout: 10000 });
		if (r.status === 0) labelsCreated++;
	}

	// Update .gitignore
	const gitignore = join(projectDir, ".gitignore");
	const entries = ["ralph/", ".ralph-logs/", ".ralph-worktrees/"];
	if (existsSync(gitignore)) {
		const content = readFileSync(gitignore, "utf-8");
		const missing = entries.filter((e) => !content.includes(e));
		if (missing.length > 0) writeFileSync(gitignore, content + "\n" + missing.join("\n") + "\n");
	} else {
		writeFileSync(gitignore, entries.join("\n") + "\n");
	}

	notify(ctx,
		`✅ Ralph initialized!\n\n` +
		`  Created: ralph/ → scripts + prompt.md\n` +
		`  Created: docs/agents/ → config\n` +
		`  Created: ${labelsCreated} GitHub labels\n` +
		`  Updated: .gitignore (ralph/, .ralph-logs/, .ralph-worktrees/)\n\n` +
		`  Next: /skill:setup-matt-pocock-skills`,
		"info",
	);
}

// ── Start ────────────────────────────────────────────────────────

async function handleStart(ctx: any, projectDir: string, arg: string, local: boolean) {
	const ralphDir = join(projectDir, "ralph");
	if (!existsSync(ralphDir)) {
		notify(ctx, "Ralph not initialized. Run /ralph init first.", "error");
		return;
	}

	const tokenVal = await getGitHubToken();
	if (!tokenVal) {
		notify(ctx, "⚠️ No GitHub token. Run: export GITHUB_TOKEN=$(gh auth token)", "warning");
		return;
	}

	const parsed = parseInt(arg) || 1;
	const availableIssues = await countAvailableIssues(projectDir);

	if (availableIssues === 0) {
		notify(ctx, "📋 No issues labeled ready-for-agent.\n\n  Create issues: /skill:to-issues → /skill:triage", "warning");
		return;
	}

	const agentCount = Math.min(parsed, availableIssues);
	const useWorktrees = agentCount > 1;

	const script = local ? "afk-local.sh" : "afk.sh";
	const scriptPath = existsSync(join(ralphDir, script)) ? join(ralphDir, script) : join(RALPH_DIR, script);
	if (!existsSync(scriptPath)) {
		notify(ctx, `Script not found: ${scriptPath}`, "error");
		return;
	}

	const model = resolveModel();
	const logDir = getLogDir(projectDir);
	mkdirSync(logDir, { recursive: true });

	// ── Worktree setup for parallel mode ─────────────────────

	let worktreeDirs: string[] = [];
	if (useWorktrees) {
		const cleaned = await cleanupWorktrees(projectDir);
		if (cleaned.length > 0) {
			notify(ctx, `🧹 Cleaned ${cleaned.length} stale worktree(s).`, "info");
		}

		for (let i = 0; i < agentCount; i++) {
			try {
				const wt = await createWorktree(projectDir, i);
				worktreeDirs.push(wt);
			} catch (err: any) {
				notify(ctx, `⚠️ Failed to create worktree ${i}: ${err.message}`, "warning");
			}
		}

		if (worktreeDirs.length === 0) {
			notify(ctx, "❌ Could not create any worktrees. Falling back to single agent.", "error");
			return;
		}
	}

	// ── Start tmux sessions ──────────────────────────────────

	const started: { session: string; worktree?: string }[] = [];
	const ts = new Date().toISOString().replace(/[:.]/g, "-");

	for (let i = 0; i < (useWorktrees ? worktreeDirs.length : 1); i++) {
		const logFile = join(logDir, `${agentCount > 1 ? `agent-${i}-` : ""}ralph-${ts}.log`);
		const sessionName = `${TMUX_PREFIX}-${Date.now()}-${i}`;
		const worktreeDir = useWorktrees ? worktreeDirs[i] : undefined;
		const worktreeEnv = worktreeDir ? `WORKTREE_DIR="${worktreeDir}" ` : "";

		const r = await run("tmux", [
			"new-session", "-d", "-s", sessionName, "-c", projectDir,
			`bash -c '${worktreeEnv}GITHUB_TOKEN=${tokenVal} bash ${scriptPath} 0 ${model} 2>&1 | tee ${logFile}; echo "\\nRalph session ended at $(date)"'`,
		], { cwd: projectDir, timeout: 5000 });

		if (r.status === 0) {
			started.push({ session: sessionName, worktree: worktreeDir });
		}
	}

	// ── Notify ───────────────────────────────────────────────

	const mode = local ? "local" : "Docker";
	if (started.length === 1) {
		notify(ctx,
			`🚀 Ralph started (${mode})\n` +
			`   Session: ${started[0].session}\n` +
			`   Model: ${model} | Issues: ${availableIssues} ready\n\n` +
			`   /ralph status | /ralph log | /ralph stop`,
			"info",
		);
	} else {
		notify(ctx,
			`🚀 ${started.length} parallel agents started (${mode})\n` +
			`   Sessions: ${started.map((s) => s.session).join(", ")}\n` +
			`   Model: ${model} | Issues: ${availableIssues} ready\n` +
			`   Worktrees: ${worktreeDirs.map((w) => `agent-${worktreeDirs.indexOf(w)}`).join(", ")}\n\n` +
			`   Each agent has its own git worktree → no file conflicts.\n` +
			`   Coordination via GitHub labels (in-progress / ready-for-agent).\n` +
			`   Agents push branches → you review and merge.\n\n` +
			`   /ralph status | /ralph log | /ralph stop`,
			"info",
		);
	}
}

// ── Once ─────────────────────────────────────────────────────────

async function handleOnce(ctx: any, projectDir: string) {
	const ralphDir = join(projectDir, "ralph");
	if (!existsSync(ralphDir)) { notify(ctx, "Ralph not initialized. Run /ralph init first.", "error"); return; }

	const commitsResult = await run("git", ["log", "-n", "5", "--format=%h %ad %s", "--date=short"], { cwd: projectDir, timeout: 5000 });
	const commits = commitsResult.stdout.trim() || "No commits found";

	let issuesText = "No issues found";
	let inProgressText = "";
	const repoResult = await run("git", ["remote", "get-url", "origin"], { cwd: projectDir, timeout: 3000 });
	if (repoResult.status === 0) {
		const [ready, inProg] = await Promise.all([
			run("gh", ["issue", "list", "--label", "ready-for-agent", "--state", "open", "--json", "number,title"], { cwd: projectDir, timeout: 10000 }),
			run("gh", ["issue", "list", "--label", "in-progress", "--state", "open", "--json", "number,title"], { cwd: projectDir, timeout: 10000 }),
		]);
		try {
			const readyIssues = JSON.parse(ready.stdout);
			issuesText = readyIssues.map((i: any) => `  #${i.number}: ${i.title}`).join("\n");
		} catch { issuesText = ready.stdout.trim() || "None"; }
		try {
			const inProgIssues = JSON.parse(inProg.stdout);
			if (inProgIssues.length > 0) {
				inProgressText = "\n\nIn-progress:\n" + inProgIssues.map((i: any) => `  #${i.number}: ${i.title}`).join("\n");
			}
		} catch { /* ignore */ }
	}

	notify(ctx,
		"📋 Ralph context:\n\n" +
		"Recent commits:\n" + commits.split("\n").map((l: string) => "  " + l).join("\n") + "\n\n" +
		"Ready for agent:\n" + issuesText + inProgressText + "\n\n" +
		"Pick an issue. Remember:\n" +
		"  1. Validate vertical slice\n" +
		"  2. Claim: gh issue edit <N> --add-label in-progress\n" +
		"  3. Branch: git checkout -b agent/<N>-<desc>\n" +
		"  4. Implement with /skill:tdd\n" +
		"  5. Self-review with /skill:review-commit\n" +
		"  6. Push + close only if review passes",
		"info",
	);
}

// ── Status ───────────────────────────────────────────────────────

async function handleStatus(ctx: any, projectDir: string) {
	const sessions = await getActiveSessions();

	let issuesText = "";
	const repoResult = await run("git", ["remote", "get-url", "origin"], { cwd: projectDir, timeout: 3000 });
	if (repoResult.status === 0) {
		const [ready, inProg] = await Promise.all([
			run("gh", ["issue", "list", "--label", "ready-for-agent", "--state", "open"], { cwd: projectDir, timeout: 10000 }),
			run("gh", ["issue", "list", "--label", "in-progress", "--state", "open"], { cwd: projectDir, timeout: 10000 }),
		]);
		if (inProg.stdout.trim()) issuesText += "\n\n🔄 In-progress:\n" + inProg.stdout.trim().split("\n").map((l: string) => "  " + l).join("\n");
		if (ready.stdout.trim()) issuesText += "\n\n📋 Ready for agent:\n" + ready.stdout.trim().split("\n").map((l: string) => "  " + l).join("\n");
		else issuesText += "\n\n📋 No issues ready-for-agent.";
	}

	// Show worktree status
	let worktreeText = "";
	const wtCheck = await run("git", ["worktree", "list", "--porcelain"], { cwd: projectDir, timeout: 3000 });
	for (const line of wtCheck.stdout.trim().split("\n")) {
		if (line.startsWith("worktree ") && line.includes(WORKTREE_BASE)) {
			worktreeText += "\n  " + line.slice(9);
		}
	}
	if (worktreeText) issuesText += "\n\n🌲 Worktrees:" + worktreeText;

	if (sessions.length === 0) {
		const latestLog = getLatestLog(projectDir);
		const logInfo = latestLog ? `\n   Last log: ${latestLog}` : "";
		notify(ctx, `No ralph sessions running.${logInfo}${issuesText}`, "info");
		return;
	}

	let lines = [`📦 Active ralph sessions (${sessions.length}):`];
	for (const session of sessions) {
		const logFile = findSessionLog(projectDir, session);
		let lastLine = "";
		if (logFile && existsSync(logFile)) {
			const content = readFileSync(logFile, "utf-8");
			const logLines = content.trim().split("\n").filter(Boolean);
			lastLine = logLines[logLines.length - 1]?.slice(0, 100) || "";
		}
		lines.push(`  🔄 ${session}${lastLine ? `\n     Last: ${lastLine}` : ""}`);
	}
	notify(ctx, lines.join("\n") + issuesText, "info");
}

// ── Log ──────────────────────────────────────────────────────────

function findSessionLog(projectDir: string, sessionHint: string): string | null {
	const logDir = getLogDir(projectDir);
	if (!existsSync(logDir)) return null;

	// Extract agent index from session name (e.g., ralph-1234567-0)
	const match = sessionHint.match(/-(\d+)-(\d+)$/);
	const files = readdirSync(logDir).filter((f) => f.endsWith(".log")).sort().reverse();

	if (match) {
		const idx = match[2];
		for (const f of files) {
			if (f.includes(`agent-${idx}-`)) return join(logDir, f);
		}
	}
	// Fallback: latest log
	return files.length > 0 ? join(logDir, files[0]) : null;
}

function getLatestLog(projectDir: string): string | null {
	const logDir = getLogDir(projectDir);
	if (!existsSync(logDir)) return null;
	const files = readdirSync(logDir).filter((f) => f.endsWith(".log")).map((f) => ({ name: f, time: statSync(join(logDir, f)).mtimeMs })).sort((a, b) => b.time - a.time);
	return files.length > 0 ? join(logDir, files[0].name) : null;
}

async function handleLog(ctx: any, projectDir: string, sessionArg: string) {
	const logDir = getLogDir(projectDir);
	if (!existsSync(logDir)) { notify(ctx, "No ralph logs found.", "info"); return; }

	const files = readdirSync(logDir).filter((f) => f.endsWith(".log")).sort().reverse();
	if (sessionArg) {
		const logFile = findSessionLog(projectDir, sessionArg);
		if (logFile) {
			const content = readFileSync(logFile, "utf-8");
			notify(ctx, `Last 50 lines of ${logFile}:\n${content.trim().split("\n").slice(-50).join("\n")}`, "info");
			return;
		}
		notify(ctx, `No log found for "${sessionArg}".`, "info");
		return;
	}

	const latest = files[0];
	if (!latest) { notify(ctx, "No ralph logs found.", "info"); return; }
	const content = readFileSync(join(logDir, latest), "utf-8");
	notify(ctx, `Last 50 lines:\n${content.trim().split("\n").slice(-50).join("\n")}`, "info");
}

// ── Merge ────────────────────────────────────────────────────────

async function handleMerge(ctx: any, projectDir: string) {
	const tokenVal = await getGitHubToken();
	if (!tokenVal) {
		notify(ctx, "⚠️ No GitHub token. Run: export GITHUB_TOKEN=$(gh auth token)", "warning");
		return;
	}

	// Find agent/* branches, excluding merge branches
	const branchesResult = await run("git", ["branch", "--list", "agent/*", "--format=%(refname:short)"], { cwd: projectDir, timeout: 5000 });
	const branches = branchesResult.stdout.trim().split("\n").map((b) => b.trim()).filter((b) => b && !b.includes("agent/merge-"));

	if (branches.length === 0) {
		notify(ctx, "No agent/* branches found. Nothing to merge.", "info");
		return;
	}

	const baseBranchResult = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: projectDir, timeout: 3000 });
	const baseBranch = baseBranchResult.stdout.trim();
	const batchDate = new Date().toISOString().slice(0, 10);
	const mergeBranch = `agent/merge-batch-${batchDate}`;
	const model = resolveModel();
	const timeout = process.env.RALPH_TIMEOUT || "1800";

	// Create merge branch from base
	await run("git", ["fetch", "origin", baseBranch], { cwd: projectDir, timeout: 10000 });
	await run("git", ["branch", "-D", mergeBranch], { cwd: projectDir, timeout: 3000 });
	const createResult = await run("git", ["checkout", "-b", mergeBranch, `origin/${baseBranch}`], { cwd: projectDir, timeout: 10000 });
	if (createResult.status !== 0) {
		await run("git", ["checkout", "-b", mergeBranch, baseBranch], { cwd: projectDir, timeout: 10000 });
	}

	notify(ctx,
		`🔀 Merging ${branches.length} branch(es) into ${mergeBranch} (from ${baseBranch})\n` +
		`   Model: ${model}\n` +
		`   Branches:\n${branches.map((b) => `     - ${b}`).join("\n")}`,
		"info",
	);

	// Build branch list and prompt
	const branchList = branches.map((b) => `- ${b}`).join("\\n");
	const mergePromptPath = join(RALPH_DIR, "merge-prompt.md");
	let mergePrompt = readFileSync(mergePromptPath, "utf-8");
	mergePrompt = mergePrompt.replace(/\{\{BRANCHES\}\}/g, branchList);
	mergePrompt = mergePrompt.replace(/\{\{BASE_BRANCH\}\}/g, baseBranch);
	mergePrompt = mergePrompt.replace(/\{\{MERGE_BRANCH\}\}/g, mergeBranch);

	// Ensure Docker image exists
	if (!existsSync(join(RALPH_DIR, "Dockerfile"))) {
		notify(ctx, "No Dockerfile found in ralph/", "error");
		return;
	}
	const imgCheck = await run("docker", ["image", "inspect", "pi-ralph"], { timeout: 3000 });
	if (imgCheck.status !== 0) {
		notify(ctx, "⚠️ Building pi-ralph Docker image...", "info");
		await run("docker", ["build", "-t", "pi-ralph", RALPH_DIR], { timeout: 120000 });
	}

	// Log dir
	const logDir = getLogDir(projectDir);
	mkdirSync(logDir, { recursive: true });
	const logFile = join(logDir, `merge-${batchDate}.log`);

	// Run merge agent in tmux
	const sessionName = `${TMUX_PREFIX}-merge-${Date.now()}`;
	const ts = new Date().toISOString().replace(/[:.]/g, "-");

	const r = await run("tmux", [
		"new-session", "-d", "-s", sessionName, "-c", projectDir,
		`bash -c 'GITHUB_TOKEN=${tokenVal} timeout ${timeout} docker run --rm \
			-v "${projectDir}:${projectDir}" \
			-v "$HOME/.pi/agent:/root/.pi/agent" \
			-v "$HOME/.config/gh:/root/.config/gh:ro" \
			-v "$HOME/.gitconfig:/root/.gitconfig:ro" \
			-e "GITHUB_TOKEN=${tokenVal}" \
			-e "PI_OFFLINE=1" \
			-w "${projectDir}" \
			pi-ralph \
			--mode text --no-session --model ${model} \
			-p ${shellQuote(mergePrompt)} \
			2>&1 | tee ${logFile}; \
		git checkout ${baseBranch} 2>/dev/null; \
		echo "\\nMerge session ended at $(date)"'`,
	], { cwd: projectDir, timeout: 5000 });

	if (r.status !== 0) {
		// Restore base branch on failure
		await run("git", ["checkout", baseBranch], { cwd: projectDir, timeout: 3000 });
		notify(ctx, `❌ Failed to start merge session: ${r.stderr}`, "error");
		return;
	}

	notify(ctx,
		`🔀 Merge agent started\n` +
		`   Session: ${sessionName}\n` +
		`   Merge branch: ${mergeBranch} (from ${baseBranch})\n` +
		`   Merging ${branches.length} branch(es)\n\n` +
		`   /ralph log ${sessionName} | /ralph status`,
		"info",
	);
}

function shellQuote(s: string): string {
	return "'" + s.replace(/'/g, "'\\''") + "'";
}

// ── Recover ────────────────────────────────────────────────────────

async function handleRecover(ctx: any, projectDir: string) {
	const sessions = await getActiveSessions();

	if (sessions.length > 0) {
		notify(ctx,
			`⚠️ ${sessions.length} active session(s) still running:\n` +
			sessions.map((s) => `  - ${s}`).join("\n") +
			"\n\nCannot recover while agents are active. Run /ralph stop first.",
			"warning",
		);
		return;
	}

	// Find in-progress issues
	const repoResult = await run("git", ["remote", "get-url", "origin"], { cwd: projectDir, timeout: 3000 });
	if (repoResult.status !== 0) {
		notify(ctx, "No git remote configured.", "error");
		return;
	}

	const inProgResult = await run("gh", ["issue", "list", "--label", "in-progress", "--state", "open", "--json", "number,title"], { cwd: projectDir, timeout: 10000 });
	if (inProgResult.status !== 0 || !inProgResult.stdout.trim() || inProgResult.stdout.trim() === "[]") {
		notify(ctx, "No stale in-progress issues found. Nothing to recover.", "info");
		return;
	}

	let staleIssues: { number: number; title: string }[];
	try {
		staleIssues = JSON.parse(inProgResult.stdout);
	} catch {
		notify(ctx, "Could not parse issue list.", "error");
		return;
	}

	// No active sessions + in-progress issues = all stale
	const recovered: string[] = [];
	const failed: string[] = [];

	for (const issue of staleIssues) {
		const unclaim = await run("gh", ["issue", "edit", String(issue.number), "--remove-label", "in-progress", "--add-label", "ready-for-agent"], { cwd: projectDir, timeout: 5000 });
		if (unclaim.status === 0) {
			await run("gh", ["issue", "comment", String(issue.number), "--body", "⚠️ Unclaimed: previous agent timed out or crashed. Recovered by /ralph recover."], { cwd: projectDir, timeout: 5000 });
			recovered.push(`#${issue.number}: ${issue.title}`);
		} else {
			failed.push(`#${issue.number}: ${issue.title}`);
		}
	}

	let msg = "";
	if (recovered.length > 0) {
		msg += `✅ Recovered ${recovered.length} issue(s):\n${recovered.map((i) => `  - ${i}`).join("\n")}`;
	}
	if (failed.length > 0) {
		msg += `${recovered.length > 0 ? "\n" : ""}❌ Failed to recover ${failed.length} issue(s):\n${failed.map((i) => `  - ${i}`).join("\n")}`;
	}
	notify(ctx, msg, failed.length > 0 ? "warning" : "info");
}

// ── Stop ─────────────────────────────────────────────────────────

async function handleStop(ctx: any, sessionArg: string, projectDir: string) {
	const sessions = await getActiveSessions();
	if (sessions.length === 0) { notify(ctx, "No ralph sessions running.", "info"); return; }

	const toStop = sessionArg ? sessions.filter((s) => s.includes(sessionArg)) : sessions;
	if (toStop.length === 0) { notify(ctx, `No session matching "${sessionArg}". Running: ${sessions.join(", ")}`, "info"); return; }

	for (const session of toStop) await run("tmux", ["kill-session", "-t", session], { timeout: 3000 });

	// Clean up worktrees after stopping all sessions
	const remaining = await getActiveSessions();
	if (remaining.length === 0) {
		const cleaned = await cleanupWorktrees(projectDir);
		if (cleaned.length > 0) {
			notify(ctx, `✅ Stopped ${toStop.length} session(s). Cleaned ${cleaned.length} worktree(s).`, "info");
			return;
		}
	}

	notify(ctx, `✅ Stopped ${toStop.length} session(s): ${toStop.join(", ")}`, "info");
}

// ── Templates ────────────────────────────────────────────────────

const ISSUE_TRACKER_TEMPLATE = `# Issue Tracker

This project uses **GitHub Issues** as its issue tracker.

## Commands
- List open issues: \`gh issue list --state open\`
- Create issue: \`gh issue create --title "Title" --body "Description"\`
- View issue: \`gh issue view <number>\`
- Close issue: \`gh issue close <number>\`
- Add label: \`gh issue edit <number> --add-label <label>\`
- Remove label: \`gh issue edit <number> --remove-label <label>\`
- Comment: \`gh issue comment <number> --body "Text"\`

## Labels
- \`needs-triage\` — Needs evaluation by maintainer
- \`needs-info\` — Waiting on reporter for more information
- \`ready-for-agent\` — Fully specified, ready for autonomous AFK agent
- \`ready-for-human\` — Needs human implementation
- \`in-progress\` — Currently being worked on by an agent
- \`wontfix\` — Will not be actioned
`;

const TRIAGE_LABELS_TEMPLATE = `# Triage Labels

| Label | Description |
|---|---|
| \`needs-triage\` | Needs evaluation by maintainer |
| \`needs-info\` | Waiting on reporter for more information |
| \`ready-for-agent\` | Fully specified, ready for autonomous AFK agent |
| \`ready-for-human\` | Needs human implementation |
| \`in-progress\` | Currently being worked on by an agent |
| \`wontfix\` | Will not be actioned |
`;

const DOMAIN_TEMPLATE = `# Domain Docs

This project uses a **single-context** layout.

- \`CONTEXT.md\` at the repo root — project domain language and terminology (created by /skill:grill-with-docs)
- \`docs/adr/\` — architectural decision records (created by /skill:grill-with-docs)

The domain glossary is defined in \`CONTEXT.md\`. Skills like \`tdd\`, \`diagnose\`, and \`improve-codebase-architecture\` read it to use consistent terminology.
`;

// ── Main ─────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.registerCommand("ralph", {
		description: "Manage ralph autonomous loops (init, start, local, once, status, log, stop)",
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/);
			const sub = parts[0] || "status";
			const rest = parts.slice(1).join(" ");
			const projectDir = getProjectDir(ctx.cwd);

			switch (sub) {
				case "init": await handleInit(ctx, projectDir); break;
				case "start": await handleStart(ctx, projectDir, rest, false); break;
				case "local": await handleStart(ctx, projectDir, rest, true); break;
				case "merge": await handleMerge(ctx, projectDir); break;
				case "recover": await handleRecover(ctx, projectDir); break;
				case "once": await handleOnce(ctx, projectDir); break;
				case "status": await handleStatus(ctx, projectDir); break;
				case "log": await handleLog(ctx, projectDir, rest); break;
				case "stop": await handleStop(ctx, rest, projectDir); break;
				default:
					notify(ctx,
						"Usage: /ralph <command>\n\n" +
						"  init              Initialize ralph + labels + docs\n" +
						"  start [N]         Start N parallel Docker agents (default 1)\n" +
						"  local [N]         Same without Docker\n" +
						"  merge             Merge all agent/* branches into agent/merge-batch-<date>\n" +
						"  recover           Un-claim stale in-progress issues (only when no agents running)\n" +
						"  once              Show context for interactive session\n" +
						"  status            Show sessions + issues + worktrees\n" +
						"  log [session]     Tail session output\n" +
						"  stop [session]    Stop session(s) + clean worktrees\n\n" +
						"Parallel: /ralph start 3\n" +
						"  Each agent gets its own git worktree (no file conflicts).\n" +
						"  Agents push branches for you to review and merge.\n\n" +
						"Env vars:\n" +
						"  RALPH_MODEL       Model to use (default: zai/glm-5.1)\n" +
						"  RALPH_TIMEOUT     Seconds per iteration (default: 1800 = 30 min)",
						"info",
					);
			}
		},
	});
}
