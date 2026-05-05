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
- Stale recovery is handled by `/ralph recover` (not by the agent)

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

## Review prompt

After the implementer commits, a fresh agent reviews the code using `review-prompt.md`:

- Has NO implementer context — only sees the diff and the issue
- Evaluates: correctness, test coverage, error handling, dead code, security, naming, complexity
- Fixes real problems directly (commits + pushes) → outputs `<promise>REVIEW PASSED</promise>`
- If critical and unfixable: reverts, reopens the issue, re-labels `ready-for-agent` → outputs `<promise>REVIEW FAILED</promise>`
- Never closes or changes issue state

## Merge prompt

After all agents finish, a merge agent uses `merge-prompt.md`:

- Creates `agent/merge-batch-<date>` from base branch
- Merges all `agent/*` branches one at a time
- Runs tests after each merge
- Resolves conflicts
- Cleans up merged branches
- Never touches the base branch or issue state

## Full prompt

Below is the exact prompt sent to the agent each iteration.

=== "Click to expand the full Ralph prompt"

    ```markdown
    # ISSUES

    You have been provided with:
    1. GitHub issues labeled `ready-for-agent` — in JSON with `number`, `title`, `body`
    2. GitHub issues labeled `in-progress` — being worked on by other agents
    3. The last few commits

    Parse the JSON. The `body` field contains the full description including `## Blocked by` sections.

    If there are no `ready-for-agent` issues, output <promise>NO MORE TASKS</promise>.

    # VERTICAL SLICE VALIDATION

    Before implementing ANY issue, validate it is a vertical slice.

    Apply this test: "If I deploy ONLY this issue's changes, can a user complete a meaningful action end-to-end?"

    - ✅ Vertical: Cuts through ALL layers (route → service → db → UI → test). One complete path.
    - ❌ Horizontal: Only one layer ("add all database models", "write all API endpoints", "style all pages").

    If the issue is HORIZONTAL:
    1. Comment: "⚠️ Horizontal slice — not suitable for autonomous implementation."
    2. Remove `ready-for-agent`, add `needs-triage`
    3. Output <promise>NO MORE TASKS</promise> if no other vertical slices remain
    4. Do NOT implement horizontal issues.

    # TASK SELECTION

    For each `ready-for-agent` issue, check if it is blocked:

    1. Read the issue body. Look for `## Blocked by`.
    2. If it references other issues (e.g. "Blocked by #28"), check if closed:
       ```bash
       gh issue view <blocker-number> --json state -q '.state'
       ```
    3. If ANY blocker is `OPEN`, SKIP this issue.
    4. If no blockers or all blockers are `CLOSED`, the issue is eligible.

    Skip issues labeled `in-progress` (another agent is working on them).

    Among eligible issues, prioritize:
    1. Issues with no blockers (unblock others first)
    2. Critical bugfixes
    3. Development infrastructure
    4. Tracer bullets for new features
    5. Polish and quick wins
    6. Refactors

    If ALL `ready-for-agent` issues are `in-progress` or blocked, output <promise>NO MORE TASKS</promise>.

    # CLAIM THE ISSUE

    Before starting work, claim the issue:

    ```bash
    gh issue edit <number> --add-label "in-progress" --remove-label "ready-for-agent"
    ```

    Do this BEFORE creating a branch or exploring. This is the coordination mechanism for parallel agents.

    # BRANCH

    After claiming, create a branch for this issue:

    ```bash
    git checkout -b agent/<issue-number>-<short-kebab-description>
    ```

    Pull latest changes from the base branch first if needed:

    ```bash
    git fetch origin
    git rebase origin/<base-branch>
    ```

    Do NOT work directly on staging or main.

    # EXPLORATION

    Explore the repo. Check CONTEXT.md for domain language and docs/adr/ for architectural decisions.

    # IMPLEMENTATION

    Use /skill:tdd to complete the task.

    # FEEDBACK LOOPS

    Before committing, run ALL feedback loops:

    - Tests: `npm run test` or `npm test`
    - Type checker: `npm run typecheck` or `npx tsc --noEmit`
    - Build: `npm run build`

    If ANY fail, fix before committing. Do not commit broken code.

    If feedback loops fail and you cannot fix them after 2 attempts:
    1. Comment on the issue explaining the failure
    2. Remove `in-progress`, add back `ready-for-agent`
    3. Output <promise>NO MORE TASKS</promise>
    4. Do NOT leave broken code committed.

    # SELF-REVIEW

    After committing, review your own work:

    1. Read the diff: `git diff HEAD~1`
    2. Check: Dead code? Unused imports? Hardcoded values? Missing error handling?
    3. Verify: Does every acceptance criterion from the issue pass?
    4. Verify: Do the new tests actually test the behavior?

    If issues found: fix with another commit, re-run feedback loops.

    # COMMIT

    Conventional commit format:

    ```
    type(scope): description

    - Key decision made
    - Files changed
    ```

    # PUSH

    Push your branch:

    ```bash
    git push origin agent/<issue-number>-<short-kebab-description>
    ```

    # CLOSE THE ISSUE

    Only close if:
    - Self-review passes
    - All feedback loops pass
    - All acceptance criteria are met

    ```bash
    gh issue close <number> --comment "Implemented in <branch>. Self-review: [summary]"
    ```

    If NOT complete:
    ```bash
    gh issue comment <number> --body "Partial: [what was done]. Remaining: [what's left]."
    gh issue edit <number> --remove-label "in-progress" --add-label "ready-for-agent"
    ```

    # FINAL RULES

    ONLY WORK ON A SINGLE TASK PER ITERATION.
    NEVER IMPLEMENT A HORIZONTAL SLICE.
    ALWAYS CHECK BLOCKERS BEFORE CLAIMING.
    ALWAYS CLAIM THE ISSUE BEFORE STARTING WORK.
    ALWAYS CREATE A BRANCH — NEVER COMMIT ON STAGING/MAIN.
    IF BLOCKED OR NO ELIGIBLE ISSUES, OUTPUT <promise>NO MORE TASKS</promise>.
    ```
