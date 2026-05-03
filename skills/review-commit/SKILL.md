---
name: review-commit
description: Automated self-review of the last commit. Checks code quality, test coverage, acceptance criteria, and produces a review summary. Used inside the ralph loop after each commit.
disable-model-invocation: true
---

# Review Commit

Automated self-review of the last git commit. Run after every commit in the ralph loop to catch issues before moving to the next task.

## Process

### 1. Get the commit

```bash
git log -1 --format="%H%n%s%n%b"
git diff HEAD~1 --stat
git diff HEAD~1
```

### 2. Code quality checks

Review the diff for:

- **Dead code**: Unused imports, unreachable branches, commented-out code
- **Magic values**: Hardcoded strings/numbers that should be constants
- **Missing error handling**: Uncaught exceptions, unhandled promise rejections
- **Security concerns**: SQL injection, XSS, exposed secrets, missing input validation
- **Breaking changes**: Removed exports, changed function signatures, renamed files without updating imports

### 3. Test coverage check

- Did the commit include new tests? If not, flag it.
- Do the tests cover the acceptance criteria from the issue?
- Are the tests testing behavior (good) or implementation details (bad)?

### 4. Acceptance criteria check

Read the issue that was being worked on:

```bash
gh issue view <number>
```

For each acceptance criterion:
- Is it met? (check the code, not just the commit message)
- Can it be verified independently?

### 5. Feedback loop results

```bash
# Run the project's feedback loops
npm run test
npm run typecheck  # or equivalent
npm run build      # or equivalent
```

All must pass. If any fail, the commit is incomplete.

### 6. Summary

Output a review:

```
## Self-Review: <commit-subject>

Files changed: X files (+Y/-Z lines)

✅ Tests: 3 new tests, all passing
✅ Typecheck: clean
✅ Build: passes
✅ Acceptance criteria: 4/4 met
⚠️  Notes: Could extract the validation logic into a reusable helper

Verdict: APPROVED — ready to close issue
```

or

```
## Self-Review: <commit-subject>

Files changed: X files (+Y/-Z lines)

✅ Tests: 2 new tests
❌ Typecheck: 1 error in src/lib/utils.ts:42
⚠️  Acceptance criteria: 2/4 met (missing: criterion 3, criterion 4)

Verdict: NEEDS WORK — do not close issue, add comment with remaining work
```

If verdict is NEEDS WORK, do NOT close the issue. Add a comment with what was done and what remains.
