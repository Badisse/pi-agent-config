/**
 * Configuration types and defaults for the git-workflow extension.
 *
 * Global defaults can be overridden per-project via `.pi/git-workflow.json`.
 * Branch protection (blocking commits/pushes on main) is handled by security-gate.ts.
 */

/** Default commit types for conventional commits. */
export const DEFAULT_COMMIT_TYPES = [
	"feat",
	"fix",
	"refactor",
	"docs",
	"test",
	"chore",
	"perf",
	"ci",
	"build",
] as const;

export type CommitType = (typeof DEFAULT_COMMIT_TYPES)[number];

/** Extension configuration shape. */
export interface GitWorkflowConfig {
	/** Enable or disable the extension (default: true) */
	enabled: boolean;
	/** Automatically create agent branches on first commit (default: true) */
	autoBranch: boolean;
	/** Prefix for agent branches (default: "agent") */
	branchPrefix: string;
	/** Allow auto-merge to main without user review (default: false) */
	autoMerge: boolean;
	/** Enforce conventional commit format (default: true) */
	conventionalCommits: boolean;
	/** Available commit types for /commit command */
	commitTypes: string[];
	/** Create git stash checkpoints each turn (default: true) */
	checkpoint: boolean;
	/** Warn/block session switches with uncommitted changes (default: true) */
	dirtyGuard: boolean;
	/** Warn if no .gitignore exists when entering a repo (default: true) */
	gitignoreGuard: boolean;
}

/** Sensible defaults applied globally. */
export const DEFAULT_CONFIG: GitWorkflowConfig = {
	enabled: true,
	autoBranch: true,
	branchPrefix: "agent",
	autoMerge: false,
	conventionalCommits: true,
	commitTypes: [...DEFAULT_COMMIT_TYPES],
	checkpoint: true,
	dirtyGuard: true,
	gitignoreGuard: true,
};
