# Slash Commands

## Built-in Pi commands

| Command | What it does |
|---|---|
| `/skill:<name>` | Load and execute a skill |
| `/reload` | Reload extensions, skills, prompts |
| `/settings` | Toggle skill commands, change settings |

## Ralph commands

| Command | What it does |
|---|---|
| `/ralph init` | Initialize ralph + labels + docs/agents/ |
| `/ralph start [N]` | Start N parallel Docker agents |
| `/ralph local [N]` | Start N parallel local agents |
| `/ralph once` | Show ralph context for interactive session |
| `/ralph status` | Show running sessions + issues + worktrees |
| `/ralph log [session]` | Tail session output |
| `/ralph stop [session]` | Stop session(s) + clean worktrees |

## Git workflow commands

| Command | What it does |
|---|---|
| `/branch` | Create agent branch |
| `/commit` | Guided conventional commit |
| `/checkpoint` | Create git checkpoint (stash snapshot) |
| `/fork restore` | Restore to last checkpoint |
| `/pr-summary` | Generate HTML PR summary |
| `/git-status` | Show repo status |
