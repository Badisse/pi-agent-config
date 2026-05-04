# Ralph Prompt

The prompt that drives each Ralph iteration. Located at `ralph/prompt.md` (global) or `ralph/prompt.md` (per-project).

## What the prompt does

The prompt instructs the agent to:

### 1. Parse issues
Read `ready-for-agent` issues (JSON with `number`, `title`, `body`). Check for `## Blocked by` sections.

### 2. Validate vertical slices
Apply the test: *"If I deploy ONLY this issue's changes, can a user complete a meaningful action end-to-end?"*

If horizontal → comment, remove label, skip.

### 3. Task selection
- Skip blocked issues (check if blocker is still OPEN)
- Skip `in-progress` issues (another agent is working)
- Prioritize: no blockers → bugfixes → infrastructure → features → polish → refactors
- Stale recovery: if no `ready-for-agent` but `in-progress` exists, un-claim the oldest

### 4. Claim
```bash
gh issue edit <number> --add-label "in-progress" --remove-label "ready-for-agent"
```

### 5. Branch
```bash
git checkout -b agent/<issue-number>-<short-kebab-description>
```

### 6. Implement with TDD
Use `/skill:tdd` for the implementation.

### 7. Feedback loops
Run ALL before committing:
- Tests: `npm run test`
- Type checker: `npm run typecheck`
- Build: `npm run build`

If any fail, fix before committing. If can't fix after 2 attempts, un-claim the issue.

### 8. Self-review
Read the diff, check for dead code, unused imports, hardcoded values, missing error handling.

### 9. Commit and push
Conventional commit format. Push branch to origin.

### 10. Close issue
Only if self-review passes, feedback loops pass, all acceptance criteria met.

## Exit condition

If no eligible issues remain, output `<promise>NO MORE TASKS</promise>` and the loop exits.

## Full prompt

The full prompt is available in the repo at `ralph/prompt.md`.
