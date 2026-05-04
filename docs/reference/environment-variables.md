# Environment Variables

## Ralph

| Variable | Default | Where | Purpose |
|---|---|---|---|
| `GITHUB_TOKEN` | `$(gh auth token)` | Host terminal | GitHub auth for ralph scripts |
| `RALPH_MODEL` | `zai/glm-5.1` | Optional | Override default model |
| `RALPH_TIMEOUT` | `1800` | Optional | Max seconds per iteration |
| `PI_OFFLINE` | — | Docker container | Set to `1` to skip startup network calls |
| `WORKTREE_DIR` | Project dir | Set by extension | Path to git worktree for parallel mode |

## Getting your GitHub token

```bash
export GITHUB_TOKEN=$(gh auth token)
```

This is required for all Ralph operations that interact with GitHub Issues.
