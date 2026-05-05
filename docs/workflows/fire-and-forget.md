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
4. Issues are closed immediately so blockers resolve for other agents

### Review phase

After each implementer commits, a **fresh agent** reviews the code:

- No implementer context — only sees the diff and the issue
- Checks correctness, test coverage, error handling, dead code, security
- Fixes problems directly or reopens the issue if critical

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

Stopping all sessions automatically cleans up worktrees. Worktrees also auto-clean when agents finish naturally.

## Step 4b: Recover stale issues

If an agent crashed and left issues stuck as `in-progress`:

```
/ralph recover
```

This checks that no agents are still running, then un-claims all stale `in-progress` issues so they can be picked up again.

You can then start new agents:

```
/ralph start 3
```

## Step 5: Merge branches

After all agents finish, merge their branches into a dedicated merge branch:

```
/ralph merge
```

This:

1. Creates `agent/merge-batch-<date>` from your current branch
2. Merges all `agent/*` branches one at a time
3. Runs tests after each merge
4. Resolves conflicts if needed
5. Pushes the merge branch to origin
6. Cleans up merged `agent/*` branches

## Step 6: Review and accept

```bash
# Check what was merged
git checkout agent/merge-batch-2026-05-05
git log --oneline main..HEAD

# Happy? Accept into main
git checkout main
git merge agent/merge-batch-2026-05-05
```

## Full flow diagram

```
main ──────────────────────────────────────────
  \                                               
   ├── agent/42-fix ──┐                           
   ├── agent/50-feat ──┼──→ agent/merge-batch-2026-05-05 ──→ you accept into main
   └── agent/51-ref ──┘                           
```

!!! warning "Never run multiple agents in the same directory"
    Always use `/ralph start N` which sets up worktrees automatically. Each agent gets its own checkout — no file conflicts.
