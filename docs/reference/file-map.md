# File Map

## Global config (`~/.pi/agent/`)

```
~/.pi/agent/
├── auth.json                           # Pi provider auth (gitignored)
├── settings.json                       # Pi settings
├── extensions/
│   ├── ralph/index.ts                  # /ralph slash commands
│   ├── git-workflow/                   # /branch, /commit, /checkpoint, /pr-summary
│   │   ├── index.ts                    # Entry point
│   │   ├── branch.ts                   # Branch management
│   │   ├── commit.ts                   # Conventional commits
│   │   ├── checkpoint.ts              # Git checkpoints
│   │   ├── guard.ts                    # Dirty repo + protected branch guards
│   │   ├── commands.ts                 # Command registration
│   │   ├── config.ts                   # Default config
│   │   ├── config-loader.ts            # Per-project config loading
│   │   ├── git-utils.ts                # Git utility functions
│   │   └── pr-summary-html.ts          # PR summary HTML generation
│   ├── pi-docs/                        # Codebase doc generation
│   │   ├── index.ts
│   │   ├── data-collector.ts
│   │   └── html-template.ts
│   ├── protected-paths.ts              # Blocks access to secrets
│   └── security-gate.ts                # Blocks destructive commands
├── skills/                             # 14 workflow skills
│   ├── caveman/SKILL.md
│   ├── diagnose/SKILL.md
│   ├── grill-me/SKILL.md
│   ├── grill-with-docs/
│   │   ├── SKILL.md
│   │   ├── ADR-FORMAT.md
│   │   └── CONTEXT-FORMAT.md
│   ├── improve-codebase-architecture/
│   │   ├── SKILL.md
│   │   ├── DEEPENING.md
│   │   ├── INTERFACE-DESIGN.md
│   │   └── LANGUAGE.md
│   ├── review-commit/SKILL.md
│   ├── review-issue/SKILL.md
│   ├── setup-matt-pocock-skills/
│   │   ├── SKILL.md
│   │   ├── domain.md
│   │   ├── issue-tracker-github.md
│   │   ├── issue-tracker-gitlab.md
│   │   ├── issue-tracker-local.md
│   │   └── triage-labels.md
│   ├── tdd/
│   │   ├── SKILL.md
│   │   ├── deep-modules.md
│   │   ├── interface-design.md
│   │   ├── mocking.md
│   │   ├── refactoring.md
│   │   └── tests.md
│   ├── to-issues/SKILL.md
│   ├── to-prd/SKILL.md
│   ├── triage/
│   │   ├── SKILL.md
│   │   ├── AGENT-BRIEF.md
│   │   └── OUT-OF-SCOPE.md
│   ├── write-a-skill/SKILL.md
│   └── zoom-out/SKILL.md
├── ralph/                              # Autonomous loop infrastructure
│   ├── Dockerfile                      # pi-ralph Docker image
│   ├── afk.sh                          # Autonomous Docker loop
│   ├── afk-local.sh                    # Autonomous local loop
│   ├── once.sh                         # Single interactive run
│   └── prompt.md                       # Ralph iteration instructions
└── bin/                                # Bundled binaries (gitignored)
    ├── fd
    └── rg
```

## Per-project files

```
my-project/
├── ralph/                              # Symlinks to global scripts + prompt.md
├── docs/
│   └── agents/                         # Skill config
│       ├── issue-tracker.md
│       ├── triage-labels.md
│       └── domain.md
├── CONTEXT.md                          # Domain language
├── docs/adr/                           # Architectural decisions
├── .out-of-scope/                      # Rejected features
├── AGENTS.md                           # Project instructions
├── .ralph-logs/                        # Session logs (gitignored)
├── .ralph-worktrees/                   # Parallel agent worktrees (gitignored)
└── .pi/
    └── git-workflow.json               # Per-project git config (optional)
```
