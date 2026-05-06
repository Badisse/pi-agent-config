# Git Workflow Extension

!!! info "Source"
    `~/.pi/agent/extensions/git-workflow/`

Provides a structured git workflow for the AI coding agent.

## Features

- **Agent branch management** — auto-create branches off protected branches
- **Git checkpoints** — stash snapshots for `/fork restore`
- **Dirty repo guard** — warn on session switch with uncommitted changes
- **Protected branch guard** — prompt before commits on main/master (hard-blocked in AFK mode)
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
  "branchPrefix": "feature",
  "protectedBranches": ["main"],
  "checkpoint": false
}
```

## Conventional commit format

```
type(scope): description

- Key decision made
- Files changed
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
