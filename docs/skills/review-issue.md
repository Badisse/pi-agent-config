# Review Issue

!!! quote "One-liner"
    Validate that a ready-for-agent issue is a proper vertical slice before autonomous implementation.

## When to use

- After triage, before starting the Ralph loop
- As a quality gate to prevent bad issues from wasting agent time

## How it works

```
> /skill:review-issue
```

The agent runs 5 validation checks on each `ready-for-agent` issue:

### 1. Slice direction test

> "If I deploy ONLY this issue's changes, can a user complete a meaningful action end-to-end?"

- ✅ Vertical: cuts through ALL layers (route → service → db → UI → test)
- ❌ Horizontal: only one layer ("add all database models")

If horizontal → comment, remove label, suggest vertical alternatives.

### 2. Acceptance criteria test

Each criterion must be:

- **Testable** — "Returns 401 for invalid token" not "Handles auth correctly"
- **Independent** — verifiable without other issues
- **Behavioral** — describes what the system does, not which files to change

Fewer than 3 criteria = underspecified.

### 3. Scope test

- **Bounded** — one developer, one sitting
- **No HITL decisions** — no "decide the color"
- **No vague directives** — no "improve performance"

Too large (>5 files, >200 lines) → suggest splitting.

### 4. Dependency test

- Are all blocking issues actually closed?
- If blocked by an open issue → skip.

### 5. Report

Produces a structured verdict:

```
Issue #28: Add user signup endpoint

  Slice direction: ✅ VERTICAL
  Acceptance criteria: ✅ 4 criteria, all testable
  Scope: ✅ Bounded (~3 files, ~150 lines)
  Dependencies: ✅ No blockers

  Verdict: ✅ READY FOR AGENT
```
