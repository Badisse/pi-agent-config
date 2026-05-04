# Review Commit

!!! quote "One-liner"
    Automated self-review of the last commit. Checks code quality, test coverage, and acceptance criteria.

## When to use

- Inside the Ralph loop after each commit
- Any time you want a quick quality check on recent changes

## How it works

```
> /skill:review-commit
```

### Code quality checks

Reviews the diff for:

- **Dead code** — unused imports, unreachable branches, commented-out code
- **Magic values** — hardcoded strings/numbers that should be constants
- **Missing error handling** — uncaught exceptions, unhandled promise rejections
- **Security concerns** — SQL injection, XSS, exposed secrets, missing input validation
- **Breaking changes** — removed exports, changed function signatures

### Acceptance criteria verification

For each criterion from the issue:

- Does the diff address it?
- Do the new tests actually test the behavior?

### Process

```bash
# Get the commit
git log -1 --format="%H%n%s%n%b"
git diff HEAD~1 --stat
git diff HEAD~1
```

The agent reads the full diff and produces a review summary.
