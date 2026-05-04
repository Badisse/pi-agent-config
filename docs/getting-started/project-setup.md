# Project Setup

For each new project, run the initialization to create the necessary config files, labels, and directory structure.

## Step 1: Initialize Ralph

```bash
cd ~/Dev/my-project
pi
> /ralph init
```

This creates:

- `ralph/` — symlinked scripts + `prompt.md`
- `docs/agents/` — issue tracker config, triage labels, domain docs
- `.gitignore` entries for `ralph/`, `.ralph-logs/`, `.ralph-worktrees/`
- GitHub labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `in-progress`, `wontfix`

## Step 2: Configure the skills

`/ralph init` creates the scaffolding. Now you need to configure it — this step asks you questions (issue tracker type, labels, domain layout).

```
> /skill:setup-matt-pocock-skills
```

This is a **separate step** on purpose: init is deterministic (files + labels), setup is interactive (your preferences).

It configures:

- Issue tracker type (GitHub / GitLab / local)
- Triage labels
- Domain docs layout (`CONTEXT.md`, `docs/adr/`)

## Step 3: Start a workflow

You're ready to go. Pick a workflow:

| Workflow | When to use |
|---|---|
| [:material-lightbulb: Full Feature](../workflows/full-feature.md) | New feature from idea to deployed code |
| [:material-bug: Quick Bug Fix](../workflows/quick-bugfix.md) | Diagnose and fix a bug |
| [:material-castle: Architecture Day](../workflows/architecture-day.md) | Refactor and deepen module interfaces |
| [:material-fire: Fire and Forget](../workflows/fire-and-forget.md) | Multiple parallel autonomous agents |

## Per-project file map

```
my-project/
├── ralph/                  # Symlinks to global scripts + prompt.md
├── docs/
│   └── agents/             # Skill config
│       ├── issue-tracker.md
│       ├── triage-labels.md
│       └── domain.md
├── CONTEXT.md              # Domain language (created by grill-with-docs)
├── docs/adr/               # Architectural decisions (created by grill-with-docs)
├── .out-of-scope/          # Rejected features (created by triage)
├── AGENTS.md               # Project instructions
├── .ralph-logs/            # Session logs (gitignored)
└── .ralph-worktrees/       # Parallel agent worktrees (gitignored)
```
