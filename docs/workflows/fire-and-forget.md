# Fire and Forget Workflow

**Duration:** Variable (until all issues are done)
**Best for:** Multiple well-specified issues that can be implemented in parallel
**Autonomous:** Fully — multiple agents working simultaneously

## Step 1: Have issues ready

Make sure you have multiple issues labeled `ready-for-agent`:

```bash
gh issue list --label ready-for-agent --state open
```

## Step 2: Start parallel agents

From inside Pi:

```
/ralph start 3
```

This starts 3 Docker agents, each in its own **git worktree**. No file conflicts.

### How parallel agents coordinate

1. Each agent runs in an isolated worktree (`.ralph-worktrees/agent-0/`, etc.)
2. Coordination happens through **GitHub labels**:
   - Agent claims an issue: removes `ready-for-agent`, adds `in-progress`
   - Agent finishes: removes `in-progress`, closes the issue
3. Agents push to separate branches: `agent/pool-0-<timestamp>`, `agent/pool-1-<timestamp>`
4. You review and merge at the end

## Step 3: Monitor

```
/ralph status       # Show all sessions + issue status
/ralph log          # Tail latest session
/ralph log ralph-1234567-0   # Tail specific agent
```

## Step 4: Stop if needed

```
/ralph stop              # Stop all sessions
/ralph stop ralph-1234   # Stop specific session
```

Stopping all sessions automatically cleans up worktrees.

## Step 5: Review and merge

```bash
# List agent branches
git branch --list 'agent/pool-*'

# Review each
git log agent/pool-0-xxx --oneline
git diff main...agent/pool-0-xxx

# Merge when satisfied
git checkout main
git merge agent/pool-0-xxx
```

!!! warning "Never run multiple agents in the same directory"
    Always use `/ralph start N` which sets up worktrees automatically. Each agent gets its own checkout — no file conflicts.
