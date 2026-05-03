---
name: review-issue
description: Validate that a ready-for-agent issue is a proper vertical slice before autonomous implementation. Checks slice direction, acceptance criteria quality, scope boundedness, and AFK-readiness. Use after triage and before starting the ralph loop.
---

# Review Issue

Validate that a `ready-for-agent` issue is suitable for autonomous implementation. This is a quality gate — bad issues waste agent time.

## Process

### 1. Read the issue

```bash
gh issue view <number> --json title,body,labels
```

### 2. Slice direction test

The most important check. A slice must be **vertical** (end-to-end) not **horizontal** (one layer).

Apply this test:

> "If I deploy ONLY this issue's changes, can a user complete a meaningful action end-to-end?"

Examples:

- ✅ **Vertical**: "User can sign up with email/password" → route + form + validation + service + database + tests. One complete path.
- ✅ **Vertical**: "User can see their order history" → route + query + service + UI list + tests. One complete path.
- ❌ **Horizontal**: "Add all database models" → only schema layer, no routes, no UI, no tests, nothing demoable.
- ❌ **Horizontal**: "Write all API endpoints" → only API layer, no UI, users can't do anything.
- ❌ **Horizontal**: "Style all pages consistently" → only CSS layer, no new functionality.

**If the issue is horizontal, STOP. Do not implement.** Instead:
1. Add a comment on the issue: "⚠️ This is a horizontal slice, not a vertical one. It cannot be implemented autonomously."
2. Remove the `ready-for-agent` label
3. Add the `needs-triage` label
4. Propose vertical-slice alternatives

### 3. Acceptance criteria test

Each criterion must be:
- **Testable**: "Returns 401 for invalid token" not "Handles auth correctly"
- **Independent**: Can be verified without other issues being done
- **Behavioral**: Describes what the system does, not which files to change

Count criteria. If fewer than 3, the issue is underspecified. Flag it.

### 4. Scope test

The issue must be:
- **Bounded**: A single developer could implement it in one sitting
- **No HITL decisions**: No "decide the color" or "choose the API design"
- **No vague directives**: No "improve performance" or "refactor as needed"

If scope is too large (more than ~5 files, more than ~200 lines), suggest splitting.

### 5. Dependency test

Check blocked-by:
- Are all blocking issues actually closed?
- If blocked by an open issue, flag it — agent should skip this one.

### 6. Report

```
Issue #28: Add user signup endpoint

  Slice direction: ✅ VERTICAL (route → service → db → test — one complete signup path)
  Acceptance criteria: ✅ 4 criteria, all testable and behavioral
  Scope: ✅ Bounded (~3 files, ~150 lines estimated)
  Dependencies: ✅ No blockers
  
  Verdict: ✅ READY FOR AGENT
```

or

```
Issue #29: Add all database models

  Slice direction: ❌ HORIZONTAL (only schema layer — no routes, no UI, no user action)
  Acceptance criteria: ⚠️ Only 1 criterion, not testable ("Add all models from spec")
  Scope: ❌ Unbounded (could be 5 models or 50)
  
  Verdict: ❌ NOT READY — needs to be split into vertical slices
  
  Suggested alternatives:
    #29a: "User can sign up" (User model + signup route + test)
    #29b: "User can create a course" (Course model + create route + test)
    #29c: "User can view course list" (Course query + list route + test)
```
