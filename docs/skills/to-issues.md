# To Issues

!!! quote "One-liner"
    Break a plan, spec, or PRD into independently-grabbable issues using tracer-bullet vertical slices.

## When to use

- After [to-prd](to-prd.md) has created a PRD
- When you need to break any plan into implementable chunks

## How it works

```
> /skill:to-issues
```

The agent:

1. **Gathers context** — reads the PRD or plan from the conversation
2. **Explores the codebase** (if not already explored)
3. **Drafts vertical slices** — each issue is a thin cut through ALL layers
4. **Publishes** to GitHub Issues with label `needs-triage`

## Vertical slice rules

- Each slice delivers a narrow but **complete** path through every layer (schema → API → UI → tests)
- A completed slice is **demoable** on its own
- Slices are marked **AFK** (agent can do) or **HITL** (needs human)

!!! danger "No horizontal slices"
    "Add all database models" = horizontal = bad.
    "User can create account (route → service → db → UI → test)" = vertical = good.

## Dependency tracking

Issues can reference blockers:

```markdown
## Blocked by
- #28 (must be closed first)
```

The Ralph loop respects these dependencies — it won't start a blocked issue.

## See also

- [To PRD](to-prd.md) — create the PRD first
- [Triage](triage.md) — label and prepare issues for the agent
