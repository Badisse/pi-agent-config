# Full Feature Workflow

**Duration:** 1–2 hours (30–45 min interactive, rest autonomous)
**Best for:** New features from idea to deployed code

This is the primary workflow — design interactively with Pi, then let Ralph implement autonomously.

## Step 1: Grill yourself (30–45 min)

```bash
cd ~/Dev/my-project
pi
> /skill:grill-with-docs
```

The agent interviews you relentlessly about your plan, one question at a time. It explores every branch of the decision tree. This builds:

- **`CONTEXT.md`** — shared domain language (project jargon, entity definitions)
- **`docs/adr/`** — architectural decision records

!!! tip "grill-with-docs is the most powerful skill"
    It creates a shared vocabulary that makes every future session ~30% more token-efficient. Always start here.

## Step 2: Write the PRD (5 min)

```
> /skill:to-prd
```

Synthesizes the conversation into a Product Requirements Document and publishes it as a GitHub issue with label `needs-triage`.

The PRD includes:

- Problem statement
- Solution
- User stories (numbered)
- Implementation decisions (modules, interfaces, schema)
- Testing decisions
- Out of scope

## Step 3: Break into issues (10–15 min)

```
> /skill:to-issues
```

Breaks the PRD into **vertical slice** issues (tracer bullets). Each issue is a thin slice through ALL layers. Issues are marked:

- **HITL** — needs human implementation
- **AFK** — agent can do it autonomously

Published as GitHub issues with label `needs-triage`.

!!! warning "No horizontal slices"
    Each issue must be deployable independently. "Add all database models" is horizontal. "User can create an account (route → service → db → UI → test)" is vertical.

## Step 4: Triage (10 min)

```
> /skill:triage
```

Moves issues through the [triage state machine](../reference/triage-state-machine.md):

```
needs-triage → ready-for-agent (AFK, fully specified)
             → ready-for-human (needs a person)
             → needs-info (waiting on reporter)
             → wontfix
```

For each `ready-for-agent` issue, the agent writes an **agent brief** — a behavioral contract for the autonomous loop.

## Step 5: Ralph implements (autonomous)

```bash
# From inside Pi:
/ralph start 20

# Or from a separate terminal:
ralph/afk.sh 20
```

Each Ralph iteration:

1. Injects context (last 5 commits + `ready-for-agent` issues)
2. Picks the highest-priority unblocked issue
3. Explores the repo
4. Implements using `/skill:tdd` (red-green-refactor)
5. Runs feedback loops (tests, typecheck, build)
6. Commits with conventional format
7. Pushes branch and closes the GitHub issue

Monitor progress:

```bash
/ralph status     # Show sessions + issues
/ralph log        # Tail latest session
tmux attach -t ralph-XXXX   # Watch live
```

## Step 6: Review

```bash
pi
> git log --oneline -20
> git diff HEAD~5
# Fix interactively if needed
> git checkout main && git merge staging
```
