# Git Workflow Extension

!!! info "Source"
    `~/.pi/agent/extensions/git-workflow/`

Provides a structured git workflow for the AI coding agent.
Branch protection (blocking commits/pushes on main) is handled by `security-gate.ts`.

## Features

- **Lazy agent branching** — auto-create branches on first commit, using short random IDs
- **Git checkpoints** — stash snapshots for `/fork restore`
- **Dirty repo guard** — warn on session switch with uncommitted changes
- **Guided conventional commits** — `/commit` command
- **PR summary** — `/pr-summary` generates HTML from branch commits
- **`.gitignore` guard** — warn if missing

## Commands

| Command | What it does |
|---|---|
| `/branch` | Create an agent branch |
| `/commit` | Guided conventional commit |
| `/checkpoint` | Create a git checkpoint (stash snapshot) |
| `/fork restore` | Restore to last checkpoint |
| `/pr-summary` | Generate HTML PR summary from branch commits |
| `/git-status` | Show repo status |

## Configuration

Global defaults in `config.ts`. Per-project overrides in `.pi/git-workflow.json`:

```json
{
  "branchPrefix": "agent",
  "autoBranch": true,
  "checkpoint": false
}
```

## Auto-branching

When `autoBranch` is enabled (default), the extension lazily creates a branch
on the **first commit** of a session (not on session start).

Branch names use a short random ID: `agent/<8-char-id>` (e.g. `agent/a3f7b2c1`).
No session name or task description is leaked into the branch name.

The `/branch` command lets you manually create a branch at any time.
It pre-fills the session branch ID as a suggestion, but you can override it.

## `/commit` flow

The `/commit` command guides you through:

1. Pick commit type (feat, fix, refactor, etc.)
2. Optional scope
3. Commit message
4. **Review files that will be staged** (uses `git add -A`) and confirm

For agent-initiated commits via bash, the conventional commit format is validated
automatically. Flags between `git commit` and `-m` are handled correctly
(e.g. `git commit -a -m "feat: add login"`).

## Conventional commit format

```
type(scope): description

- Key decision made
- Files changed
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
