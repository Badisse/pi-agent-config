# Ralph Architecture

## Components

### Docker sandbox (`afk.sh`)

Runs Pi inside a Docker container with:

- Project directory mounted at the same absolute path
- `~/.pi/agent` mounted for skills/extensions
- `~/.config/gh` mounted read-only for GitHub auth
- `~/.gitconfig` mounted read-only for git config
- `GITHUB_TOKEN` injected as environment variable
- `PI_OFFLINE=1` to skip startup network calls

**Docker image** (`Dockerfile`):
- Based on `node:22-bookworm`
- Installs Pi globally, `gh` CLI, `git`, and `jq`

### Local mode (`afk-local.sh`)

Same as Docker but runs Pi directly on the host. Lighter weight, but no isolation.

### Worktree isolation

For parallel agents, each gets its own git worktree:

```
project/
├── .ralph-worktrees/
│   ├── agent-0/     # Worktree for agent 0
│   └── agent-1/     # Worktree for agent 1
├── src/             # Main working tree (not touched by agents)
└── ...
```

Each worktree has its own branch: `agent/pool-<N>-<timestamp>`.

### tmux sessions

Each agent runs in a tmux session:

- Session name: `ralph-<timestamp>-<index>`
- Output piped to `.ralph-logs/<name>.log`
- Can be monitored with `tmux attach` or `/ralph log`

### Coordination via GitHub labels

Parallel agents coordinate through issue labels:

| Label | Meaning |
|---|---|
| `ready-for-agent` | Available for any agent to pick up |
| `in-progress` | Claimed by an agent (others skip it) |

When an agent starts an issue, it removes `ready-for-agent` and adds `in-progress`. When done, it removes `in-progress` and closes the issue.

## Cleanup

Worktrees are automatically cleaned up when:

- All agents finish
- `/ralph stop` is called
- A parallel agent exits (trap on EXIT)
