# Pi + Matt Pocock's Engineering Workflow

Complete guide for using Pi with Matt Pocock's skills and the Ralph autonomous loop.

## Setup

### Global (done once)

```bash
# Matt's 12 skills installed to ~/.pi/agent/skills/
# Ralph scripts at ~/.pi/agent/ralph/
# Docker image: pi-ralph (Pi + gh + git + jq)
# Pi extension: ~/.pi/agent/extensions/ralph/ (slash commands from inside Pi)
```

### Per project

```bash
# In any git project:
~/.pi/agent/ralph/init-project.sh

# Then open Pi and run the setup skill:
pi
> /skill:setup-matt-pocock-skills
```

This creates:
- `ralph/` — symlinked scripts + project-specific prompt.md
- `docs/agents/` — issue tracker config, triage labels, domain docs
- GitHub triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`

---

## The Full Workflow

### Phase 1: Design (Interactive — You + Pi)

Open Pi in your project:
```bash
cd ~/Dev/Perso/my-project
pi
```

#### Step 1: Grill yourself

```
/skill:grill-me
```

Relentless interview about your plan. The agent asks one question at a time, exploring every branch of the decision tree. Use this **every time** you want to make a change, even a small one. Forces clarity before code.

**Variant for codebase-aware grilling:**
```
/skill:grill-with-docs
```

Same as grill-me but also:
- Builds a shared domain language in `CONTEXT.md` (project jargon, entity definitions)
- Records architectural decisions in `docs/adr/` (ADR format)
- Challenges your plan against the existing domain model

> 💡 **grill-with-docs** is the single most powerful skill. It creates a shared vocabulary that makes every future session more efficient. The domain language in CONTEXT.md reduces token usage ~30% per session.

#### Step 2: Write the PRD

```
/skill:to-prd
```

Takes the conversation context (what emerged from grilling) and produces a Product Requirements Document. Published as a GitHub issue with label `needs-triage`.

The PRD includes:
- Problem statement
- Solution
- User stories (long, numbered list)
- Implementation decisions (modules, interfaces, schema changes)
- Testing decisions
- Out of scope

#### Step 3: Break into issues

```
/skill:to-issues
```

Breaks the PRD into vertical slice issues (tracer bullets). Each issue is a thin slice through ALL layers — not a horizontal "do all the backend" slice.

Issues are marked **HITL** (needs human) or **AFK** (agent can do it autonomously). Published as GitHub issues with label `needs-triage`.

#### Step 4: Triage

```
/skill:triage
```

Moves issues through the triage state machine:

```
new issue → needs-triage
              ├── needs-info (waiting on reporter)
              ├── ready-for-agent (AFK, fully specified)
              ├── ready-for-human (needs a person)
              └── wontfix
```

For each `ready-for-agent` issue, the agent writes an **agent brief** — a structured comment on the issue that serves as the contract for the autonomous loop. The brief is behavioral (what, not how), durable (no file paths/line numbers), and has concrete acceptance criteria.

> 💡 **triage** also maintains `.out-of-scope/` — a knowledge base of rejected feature requests. When a similar request comes in later, the agent surfaces the prior decision.

### Phase 2: Implement (Autonomous — Ralph Loop)

From a separate terminal (or from inside Pi with the extension):

```bash
# Option A: Docker sandbox (full isolation, can run parallel agents)
ralph/afk.sh 20

# Option B: Local (lighter, single agent)
ralph/afk-local.sh 20

# Option C: From inside Pi
/ralph start 20     # Docker
/ralph local 20     # Local
```

Each iteration:
1. **Context injection** — last 5 commits + GitHub issues labeled `ready-for-agent`
2. **Agent picks** the highest-priority issue (bugfixes → infrastructure → tracer bullets → polish → refactors)
3. **Explores** the repo (reads files, understands structure)
4. **Implements** using `/skill:tdd` (red-green-refactor, vertical slices)
5. **Runs feedback loops** — tests + typecheck before committing
6. **Commits** with conventional commit format
7. **Closes** the GitHub issue via `gh issue close`
8. Checks for `<promise>NO MORE TASKS</promise>` → exits if done

#### Monitoring

```bash
# From terminal:
tmux attach -t ralph-XXXX     # Watch live
tmux list-sessions            # See running sessions

# From inside Pi:
/ralph status                 # Show running sessions
/ralph log                    # Tail latest session output
/ralph stop                   # Kill running session
```

### Phase 3: Review (Interactive — You)

```bash
pi
# Review commits
> git log --oneline -20

# Review changes
> git diff HEAD~5

# If something's wrong, fix interactively with the agent
> The component X doesn't match the acceptance criteria because...

# When satisfied, merge
> git checkout main && git merge staging
```

---

## All 12 Skills Reference

### Productivity Skills

| Skill | Command | What it does |
|---|---|---|
| **grill-me** | `/skill:grill-me` | Interview you relentlessly about a plan, one question at a time. Resolves every branch of the decision tree. |
| **caveman** | `/skill:caveman` | Ultra-compressed communication mode. Cuts token usage ~75% by dropping filler while keeping full technical accuracy. Useful for long autonomous sessions. |
| **write-a-skill** | `/skill:write-a-skill` | Create new skills with proper structure, progressive disclosure, and bundled resources. Use when you want to codify a workflow. |

### Engineering Skills

| Skill | Command | What it does |
|---|---|---|
| **grill-with-docs** | `/skill:grill-with-docs` | Same as grill-me but also builds `CONTEXT.md` (domain language) and `docs/adr/` (architectural decisions). The most powerful skill. |
| **to-prd** | `/skill:to-prd` | Synthesize the conversation into a PRD. No interview — just produces the document from what's already discussed. Publishes to GitHub Issues. |
| **to-issues** | `/skill:to-issues` | Break a PRD/plan into vertical-slice GitHub Issues. Each issue is tracer-bullet thin and independently implementable. |
| **triage** | `/skill:triage` | Manage issues through the triage state machine. Write agent briefs. Maintain `.out-of-scope/` knowledge base. |
| **tdd** | `/skill:tdd` | Test-driven development with red-green-refactor loop. One test → one implementation → repeat. Anti-horizontal-slicing. |
| **diagnose** | `/skill:diagnose` | Disciplined diagnosis loop for hard bugs: reproduce → minimize → hypothesize → instrument → fix → regression-test. |
| **improve-codebase-architecture** | `/skill:improve-codebase-architecture` | Find "deepening" opportunities — modules with shallow interfaces that should be deeper. Spawns parallel sub-agents with different design constraints. |
| **zoom-out** | `/skill:zoom-out` | Tell the agent to step back and explain code in the context of the whole system. Use when you're lost in the weeds. |
| **setup-matt-pocock-skills** | `/skill:setup-matt-pocock-skills` | One-time per project: configure issue tracker, triage labels, domain docs layout. Run before using the other engineering skills. |

### Skill dependency graph

```
setup-matt-pocock-skills  ←── run first, creates docs/agents/ config
  │
  ├── grill-me             ←── no dependencies
  ├── grill-with-docs      ←── reads CONTEXT.md, docs/adr/
  │       │
  │       ├── to-prd       ←── reads CONTEXT.md, docs/adr/
  │       │       │
  │       │       └── to-issues  ←── reads triage labels config
  │       │               │
  │       │               └── triage  ←── reads triage labels, .out-of-scope/
  │       │                       │
  │       └── tdd           ←── reads CONTEXT.md
  │
  ├── diagnose             ←── reads CONTEXT.md
  ├── improve-codebase-architecture  ←── reads CONTEXT.md, docs/adr/
  └── zoom-out             ←── no dependencies
```

---

## Slash Commands Summary

### Built into Pi
- `/skill:name` — Load and execute a skill
- `/reload` — Reload extensions, skills, prompts
- `/settings` — Toggle skill commands, change settings

### From the ralph extension (`~/.pi/agent/extensions/ralph/`)

| Command | What it does |
|---|---|
| `/ralph init` | Initialize ralph/ in current project |
| `/ralph start [N]` | Start Docker ralph loop (default 20 iterations) |
| `/ralph local [N]` | Start local ralph loop (no Docker) |
| `/ralph once` | Show ralph context for current session |
| `/ralph status` | Show running ralph sessions |
| `/ralph log` | Tail latest ralph session output |
| `/ralph stop` | Stop running ralph session |

### From your other extensions

| Command | Extension | What it does |
|---|---|---|
| `/branch` | git-workflow | Create agent branch |
| `/commit` | git-workflow | Conventional commit |
| `/checkpoint` | git-workflow | Git checkpoint |
| `/pr-summary` | git-workflow | Generate HTML PR summary |

---

## Typical Session Patterns

### Pattern 1: Full Feature (Design → Issues → Ralph)

```
pi
> /skill:grill-with-docs
  (30-45 min, you + agent aligning on the feature)

> /skill:to-prd
  (5 min, produces PRD as GitHub issue)

> /skill:to-issues
  (10-15 min, breaks PRD into vertical slices)

> /skill:triage
  (10 min, labels issues, writes agent briefs)

/ralph start 20
  (autonomous, 20 iterations, Docker sandbox)

/ralph log
  (check progress)

/ralph stop
  (if needed)

git log --oneline -20
  (review commits, merge when satisfied)
```

### Pattern 2: Quick Bug Fix (Interactive)

```
pi
> /skill:diagnose
  (reproduce → minimize → hypothesize → fix)

> /skill:tdd
  (write regression test, fix bug)

/commit
```

### Pattern 3: Architecture Day

```
pi
> /skill:improve-codebase-architecture
  (agent explores codebase, finds shallow modules)

  (agent proposes 3+ alternative interfaces per module)

  (you pick one, RFC written as issue)

> /skill:triage
  (triage the RFC issues)

/ralph start 10
  (agent implements the refactors)
```

### Pattern 4: Fire-and-Forget (Multiple Issues)

```
# Terminal 1: Docker sandbox
ralph/afk.sh 20

# Terminal 2: Docker sandbox (parallel agent on different issues)
GITHUB_TOKEN=$(gh auth token) RALPH_MODEL=zai/glm-5.1 \
  docker run --rm \
    -v "$(pwd):/workspace" \
    -v "$HOME/.pi/agent:/root/.pi/agent" \
    -v "$HOME/.agents/skills:/root/.agents/skills:ro" \
    -v "$HOME/.config/gh:/root/.config/gh:ro" \
    -v "$HOME/.gitconfig:/root/.gitconfig:ro" \
    -e "GITHUB_TOKEN=$(gh auth token)" \
    -e "PI_OFFLINE=1" \
    -w /workspace \
    pi-ralph --mode text --no-session --model zai/glm-5.1 \
    -p "Previous commits: $(git log -n 5 --format='%h %s') ... prompt ..."

# Each container works independently on different ready-for-agent issues
```

---

## File Map

```
~/.pi/agent/
├── auth.json                                    # Pi provider auth
├── settings.json                                # Pi settings
├── extensions/
│   ├── ralph/index.ts                           # /ralph slash commands
│   ├── git-workflow/                            # /branch, /commit, /checkpoint, /pr-summary
│   ├── protected-paths.ts                       # Blocks dangerous file operations
│   └── security-gate.ts                         # Security validation
├── skills/                                      # Matt's 12 skills
│   ├── caveman/SKILL.md
│   ├── diagnose/SKILL.md
│   ├── grill-me/SKILL.md
│   ├── grill-with-docs/SKILL.md + references/
│   ├── improve-codebase-architecture/SKILL.md + references/
│   ├── setup-matt-pocock-skills/SKILL.md + templates/
│   ├── tdd/SKILL.md + references/
│   ├── to-issues/SKILL.md
│   ├── to-prd/SKILL.md
│   ├── triage/SKILL.md + references/
│   ├── write-a-skill/SKILL.md
│   └── zoom-out/SKILL.md
└── ralph/                                       # Ralph loop infrastructure
    ├── Dockerfile                               # pi-ralph Docker image
    ├── afk.sh                                   # Autonomous Docker loop
    ├── afk-local.sh                             # Autonomous local loop
    ├── once.sh                                  # Single interactive run
    ├── init-project.sh                          # Initialize project
    └── prompt.md                                # Ralph iteration instructions

Per project:
├── ralph/                                       # Symlinks to global scripts + prompt.md
├── docs/agents/                                 # Matt's skills config
│   ├── issue-tracker.md
│   ├── triage-labels.md
│   └── domain.md
├── CONTEXT.md                                   # Domain language (created by grill-with-docs)
├── docs/adr/                                    # Architectural decisions (created by grill-with-docs)
├── .out-of-scope/                               # Rejected features (created by triage)
├── AGENTS.md                                    # Project instructions + Agent skills block
└── .ralph-logs/                                 # Session logs (gitignored)
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Host terminal | GitHub auth for ralph scripts |
| `RALPH_MODEL` | Optional | Override default model (default: `zai/glm-5.1`) |
| `PI_OFFLINE=1` | Docker container | Skip Pi startup network calls |

Get your token: `export GITHUB_TOKEN=$(gh auth token)`

---

## Performance Reference

| Operation | Time |
|---|---|
| Docker container start | ~3s |
| Pi startup + skill loading | ~2s |
| Simple prompt (no tools) | ~4-6s |
| Full Ralph iteration (Docker) | ~3-4 min |
| Full Ralph iteration (local) | ~2-3 min |
| Matt's Claude Code iteration | ~20-60 min |
