# MERGE

You are on the merge branch `{{MERGE_BRANCH}}` (created from `{{BASE_BRANCH}}`).
Issues are already closed by the implementers — you only handle branches.
Do NOT merge into `{{BASE_BRANCH}}` — you are already on `{{MERGE_BRANCH}}`.

# BRANCHES TO MERGE

{{BRANCHES}}

# STEPS

1. Confirm you are on `{{MERGE_BRANCH}}`:
   ```bash
   git branch --show-current
   ```
   If not, stop and output an error.

2. For EACH branch listed above, one at a time:
   ```bash
   git merge <branch> --no-edit
   ```

2. If a merge has conflicts:
   - Read both sides carefully
   - Resolve by keeping the correct logic from both
   - Do NOT just pick one side blindly
   - Stage: `git add -A`
   - Continue: `git merge --continue --no-edit`

3. After EACH successful merge, run feedback loops:
   ```bash
   npm test && npm run typecheck && npm run build
   ```

4. If tests fail after a merge:
   - Fix the issue
   - Re-run feedback loops
   - Commit: `fix(merge): resolve conflict fallout from <branch>`

5. After ALL branches are merged, run a final full check:
   ```bash
   npm test && npm run typecheck && npm run build
   ```

6. Push the merge branch:
   ```bash
   git push origin {{MERGE_BRANCH}}
   ```

7. Clean up merged branches:
   ```bash
   # For each branch that merged cleanly:
   git branch -d <branch>
   git push origin --delete <branch>
   ```

# RULES

You are on `{{MERGE_BRANCH}}`, NOT `{{BASE_BRANCH}}`.
Never checkout or push to `{{BASE_BRANCH}}`.
Merge ONE branch at a time. Run tests after EACH merge.
Do NOT touch issue state — issues are already closed by the implementers.
If a branch cannot be fixed after 2 attempts, SKIP it and note the failure:
  `git merge --abort`
  Continue with the next branch.
Report a summary at the end: which branches merged, which failed.
Output `<promise>MERGE COMPLETE</promise>` when done.
