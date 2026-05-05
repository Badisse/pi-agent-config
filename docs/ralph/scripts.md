# Ralph Scripts

## `afk.sh` — Docker sandbox loop

Runs Pi autonomously inside Docker containers. Each iteration implements one issue, then a fresh agent reviews the result.

```bash
ralph/afk.sh [iterations] [model] [review]
```

| Argument | Default | Description |
|---|---|---|
| `iterations` | `0` (unlimited) | Max iterations before pausing |
| `model` | `zai/glm-5.1` | Pi model to use |
| `review` | `true` | Pass `noreview` to skip review phase |

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `WORKTREE_DIR` | Project dir | Path to git worktree (set by extension) |
| `RALPH_TIMEOUT` | `1800` | Max seconds per iteration |
| `GITHUB_TOKEN` | `$(gh auth token)` | GitHub authentication |

Features:

- Auto-builds `pi-ralph` Docker image if not found
- Mounts project at same absolute path (worktree-compatible)
- Pipes output through `tee` to log files
- Cleanup trap removes worktrees on exit (parallel mode)

### Review phase

After the implementer commits, `afk.sh` automatically fires a **second Pi session** with `review-prompt.md`. This agent:

- Has no context from the implementer — only sees the diff and the issue
- Checks correctness, test coverage, error handling, dead code, security
- Fixes problems directly (commits + pushes) or reopens the issue if critical
- Outputs `<promise>REVIEW PASSED</promise>` or `<promise>REVIEW FAILED</promise>`

Skip with `ralph/afk.sh 5 zai/glm-5.1 noreview`.

## `afk-local.sh` — Local loop

Same as `afk.sh` but runs Pi directly on the host (no Docker). Includes the same review phase.

```bash
ralph/afk-local.sh [iterations] [model] [review]
```

Same arguments and environment variables. Lighter weight, but no isolation.

## `once.sh` — Single interactive run

Runs a single Pi session with Ralph context injected. Interactive — you can guide the agent.

```bash
ralph/once.sh
```

Context injected:

- Last 5 commits
- `ready-for-agent` issues (with body)
- `in-progress` issues

Starts an interactive Pi session with the initial prompt: "Pick the next AFK issue and implement it."

## `merge.sh` — Batch merge

Merges all `agent/*` branches into a dedicated `agent/merge-batch-<date>` branch. Run after all parallel agents finish.

```bash
ralph/merge.sh [model] [base-branch]
```

| Argument | Default | Description |
|---|---|---|
| `model` | `zai/glm-5.1` | Pi model for the merge agent |
| `base-branch` | Current branch | Branch to base the merge on |

What it does:

1. Creates `agent/merge-batch-<date>` from base branch
2. Spawns a Pi agent that merges each `agent/*` branch one at a time
3. Runs tests after each merge
4. Resolves conflicts, cleans up merged branches
5. Pushes the merge branch to origin

The merge agent **never touches the base branch** or issue state (issues are already closed by implementers).

After running:

```bash
# Review
git checkout agent/merge-batch-2026-05-05
git log --oneline main..HEAD

# Accept into main
git checkout main && git merge agent/merge-batch-2026-05-05
```

## Prompt files

| File | Purpose |
|---|---|
| `prompt.md` | Implementer instructions (task selection, TDD, feedback loops, close issue) |
| `review-prompt.md` | Reviewer instructions (diff review, fix or reopen, never closes) |
| `merge-prompt.md` | Merge agent instructions (merge branches, resolve conflicts, never touches issues) |
