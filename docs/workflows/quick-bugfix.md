# Quick Bug Fix Workflow

**Duration:** 15–30 min
**Best for:** Diagnosing and fixing a specific bug
**Autonomous:** No — fully interactive

## The loop

```bash
pi
> /skill:diagnose
```

The agent follows a disciplined diagnosis loop:

1. **Reproduce** — confirm the bug exists
2. **Minimize** — find the smallest reproduction case
3. **Hypothesize** — form a theory about root cause
4. **Instrument** — add logging/tests to confirm
5. **Fix** — implement the fix
6. **Regression-test** — ensure the fix doesn't break anything

Then commit:

```
> /skill:tdd
```

Write a regression test first, then fix the bug. This ensures the bug can't reoccur.

Finally:

```
/commit
```

Creates a conventional commit: `fix(scope): description`.

## Tips

- Start by describing the exact symptom and how to reproduce it
- If the bug is in a specific module, mention it — the agent reads `CONTEXT.md` for domain language
- For performance regressions, mention the metric and baseline
