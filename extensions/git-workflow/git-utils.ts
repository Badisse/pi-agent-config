/**
 * Git helper utilities used across the extension modules.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/** Check whether cwd is inside a git repository. */
export async function isGitRepo(pi: ExtensionAPI): Promise<boolean> {
	const { code } = await pi.exec("git", ["rev-parse", "--is-inside-work-tree"]);
	return code === 0;
}

/** Get the current branch name (empty string if detached HEAD). */
export async function getCurrentBranch(pi: ExtensionAPI): Promise<string> {
	const { stdout, code } = await pi.exec("git", ["branch", "--show-current"]);
	return code === 0 ? stdout.trim() : "";
}

/** Get the default branch (main or master). */
export async function getDefaultBranch(pi: ExtensionAPI): Promise<string> {
	const { stdout } = await pi.exec("git", ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"]);
	if (stdout.trim()) return stdout.trim().replace(/^origin\//, "");
	// Fallback: check which branch exists
	const { stdout: branches } = await pi.exec("git", ["branch", "--list", "main", "master"]);
	if (branches.includes("main")) return "main";
	if (branches.includes("master")) return "master";
	return "main";
}

/** Check if working tree has changes (staged or unstaged). */
export async function isDirty(pi: ExtensionAPI): Promise<boolean> {
	const { stdout, code } = await pi.exec("git", ["status", "--porcelain"]);
	return code === 0 && stdout.trim().length > 0;
}

/** Count changed files (staged + unstaged). */
export async function countChangedFiles(pi: ExtensionAPI): Promise<number> {
	const { stdout, code } = await pi.exec("git", ["status", "--porcelain"]);
	if (code !== 0) return 0;
	return stdout.trim().split("\n").filter(Boolean).length;
}

/** Check if a branch exists locally. */
export async function branchExists(pi: ExtensionAPI, name: string): Promise<boolean> {
	const { code } = await pi.exec("git", ["rev-parse", "--verify", name]);
	return code === 0;
}

/** Create and switch to a new branch. */
export async function createBranch(pi: ExtensionAPI, name: string): Promise<boolean> {
	const { code } = await pi.exec("git", ["checkout", "-b", name]);
	return code === 0;
}

/** Switch to an existing branch. */
export async function switchBranch(pi: ExtensionAPI, name: string): Promise<boolean> {
	const { code } = await pi.exec("git", ["checkout", name]);
	return code === 0;
}

/** Check if a file exists. */
export async function fileExists(pi: ExtensionAPI, filePath: string): Promise<boolean> {
	const { code } = await pi.exec("test", ["-f", filePath]);
	return code === 0;
}

/** Stage all changes and commit with a message. */
export async function stageAndCommit(pi: ExtensionAPI, message: string): Promise<boolean> {
	await pi.exec("git", ["add", "-A"]);
	const { code } = await pi.exec("git", ["commit", "-m", message]);
	return code === 0;
}

/**
 * Get a short, filesystem-safe branch name from a description.
 * Converts to kebab-case and truncates to 50 chars.
 */
export function toBranchName(prefix: string, description: string): string {
	const safe = description
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 50);
	return `${prefix}/${safe || "work"}`;
}

/**
 * Get the git user name for commit author info display.
 */
export async function getGitUserName(pi: ExtensionAPI): Promise<string> {
	const { stdout } = await pi.exec("git", ["config", "user.name"]);
	return stdout.trim();
}

/**
 * Get commits on the current branch that are not on the base branch.
 */
export async function getBranchCommits(pi: ExtensionAPI, baseBranch: string): Promise<string[]> {
	const { stdout, code } = await pi.exec("git", [
		"log",
		"--oneline",
		"--no-merges",
		`${baseBranch}..HEAD`,
	]);
	if (code !== 0) return [];
	return stdout.trim().split("\n").filter(Boolean);
}

/**
 * Get the diff stat between base branch and HEAD.
 */
export async function getDiffStat(pi: ExtensionAPI, baseBranch: string): Promise<string> {
	const { stdout, code } = await pi.exec("git", [
		"diff",
		"--stat",
		`${baseBranch}...HEAD`,
	]);
	return code === 0 ? stdout.trim() : "";
}

/**
 * Get files changed on the current branch vs base.
 */
export async function getChangedFiles(pi: ExtensionAPI, baseBranch: string): Promise<string[]> {
	const { stdout, code } = await pi.exec("git", [
		"diff",
		"--name-only",
		`${baseBranch}...HEAD`,
	]);
	if (code !== 0) return [];
	return stdout.trim().split("\n").filter(Boolean);
}
