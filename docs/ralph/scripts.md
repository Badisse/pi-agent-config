# Ralph Scripts

## `afk.sh` — Docker sandbox loop

Runs Pi autonomously inside Docker containers.

```bash
ralph/afk.sh [iterations] [model]
```

| Argument | Default | Description |
|---|---|---|
| `iterations` | `0` (unlimited) | Max iterations before pausing |
| `model` | `zai/glm-5.1` | Pi model to use |

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

## `afk-local.sh` — Local loop

Same as `afk.sh` but runs Pi directly on the host (no Docker).

```bash
ralph/afk-local.sh [iterations] [model]
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
