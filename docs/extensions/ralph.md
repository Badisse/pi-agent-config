# Ralph Extension

!!! info "Source"
    `~/.pi/agent/extensions/ralph/index.ts`

Manages autonomous Ralph loops — start, monitor, and stop agents from inside Pi.

## Commands

| Command | What it does |
|---|---|
| `/ralph init` | Initialize ralph + labels + docs/agents/ |
| `/ralph start [N]` | Start N parallel Docker agents (default 1) |
| `/ralph local [N]` | Same without Docker |
| `/ralph once` | Show ralph context for interactive session |
| `/ralph status` | Show sessions + GitHub issues + worktrees |
| `/ralph log [session]` | Tail a session's output |
| `/ralph stop [session]` | Stop one or all sessions |

## Parallel mode

When `N > 1`, the extension:

1. Creates **git worktrees** for filesystem isolation (`.ralph-worktrees/agent-0/`, etc.)
2. Each agent runs in its own worktree on its own branch
3. Coordination through GitHub labels (`in-progress` / `ready-for-agent`)
4. On stop, worktrees are automatically cleaned up

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `RALPH_MODEL` | `zai/glm-5.1` | Override the model |
| `RALPH_TIMEOUT` | `1800` (30 min) | Max seconds per iteration |
| `GITHUB_TOKEN` | `$(gh auth token)` | GitHub authentication |

## How it works

The extension:

1. Finds the project root (nearest `.git` directory)
2. Checks for `ready-for-agent` issues via `gh`
3. Creates tmux sessions for each agent
4. Pipes output to `.ralph-logs/` for later review
5. Manages worktree lifecycle for parallel agents

## See also

- [Ralph Loop](../ralph/index.md) — the full loop architecture
- [Fire and Forget workflow](../workflows/fire-and-forget.md) — using parallel agents
