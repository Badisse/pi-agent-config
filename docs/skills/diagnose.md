# Diagnose

!!! quote "One-liner"
    Disciplined diagnosis loop for hard bugs: reproduce → minimize → hypothesize → instrument → fix → regression-test.

## When to use

- Something is broken, throwing, or failing
- Performance regressions
- Hard bugs that resist quick fixes

## How it works

```
> /skill:diagnose
```

### Phase 1: Build a feedback loop

!!! tip "This is the skill"
    Everything else is mechanical. If you have a fast, deterministic, pass/fail signal, you will find the cause.

Ways to construct a feedback loop (in order of preference):

1. **Failing test** at whatever seam reaches the bug
2. **Curl/HTTP script** against a running dev server
3. **CLI invocation** with fixture input
4. **Headless browser script** (Playwright/Puppeteer)
5. **Replay a captured trace**
6. **Throwaway harness** — minimal subset of the system
7. **Property/fuzz loop** — 1000 random inputs
8. **Bisection harness** — `git bisect run`
9. **Differential loop** — old vs new version
10. **HITL bash script** — last resort

### Phase 2: Minimize

Strip everything unrelated. Smallest possible reproduction.

### Phase 3: Hypothesize

Form a theory about root cause.

### Phase 4: Instrument

Add logging/tests to confirm the hypothesis.

### Phase 5: Fix

Implement the fix.

### Phase 6: Regression-test

Write a test that proves the fix works and the bug can't reoccur.

## Skip phases

Only skip a phase when explicitly justified — e.g., "the reproduction is already minimal."
