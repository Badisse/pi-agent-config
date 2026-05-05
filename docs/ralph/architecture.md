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

### Review phase

After the implementer commits, a **second Pi session** fires with `review-prompt.md`:

- Fresh agent — no memory of the implementer's reasoning
- Sees only the diff and the issue description
- Evaluates: correctness, test coverage, error handling, dead code, security, naming, complexity
- Fixes real problems directly (commits + pushes)
- If critical issues can't be fixed after 2 attempts: reverts, reopens the issue, re-labels `ready-for-agent`
- Never closes or changes issue state

This eliminates sunk-cost bias — the reviewer has no investment in the code it's reviewing.

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

### Merge phase (`merge.sh` / `/ralph merge`)

After all parallel agents finish, a merge agent:

1. Creates `agent/merge-batch-<date>` from the base branch
2. Merges each `agent/*` branch one at a time
3. Runs tests after each merge
4. Resolves conflicts if needed
5. Pushes the merge branch to origin
6. Cleans up merged `agent/*` branches

The merge agent **never touches the base branch** — you review and accept manually.

```
main ──────────────────────────────────────────
  \                                               
   ├── agent/42-fix ──┐                           
   ├── agent/50-feat ──┼──→ agent/merge-batch-2026-05-05 ──→ you accept into main
   └── agent/51-ref ──┘                           
```

### Coordination via GitHub labels

Parallel agents coordinate through issue labels:

| Label | Meaning |
|---|---|
| `ready-for-agent` | Available for any agent to pick up |
| `in-progress` | Claimed by an agent (others skip it) |

When an agent starts an issue, it removes `ready-for-agent` and adds `in-progress`. When done, it removes `in-progress` and closes the issue.

## Cleanup

Worktrees are automatically cleaned up when:

- All agents finish (EXIT trap in `afk.sh`)
- `/ralph stop` is called
- A new `/ralph start N` is called (cleans stale worktrees first)

## Data flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Implementer │────>│   Reviewer   │────>│ Push + Close │
│  (prompt.md) │     │ (review-     │     │   Issue      │
│              │     │  prompt.md)  │     │              │
└─────────────┘     └──────────────┘     └──────────────┘
                                                   │
                                                   ▼
                                         ┌──────────────────┐
                                         │  Merge Agent     │
                                         │ (merge-prompt.md)│
                                         │                  │
                                         │  agent/* →       │
                                         │  agent/merge-    │
                                         │  batch-<date>    │
                                         └──────────────────┘
```
