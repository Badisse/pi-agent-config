# To PRD

!!! quote "One-liner"
    Turn the current conversation context into a PRD and publish it to the issue tracker.

## When to use

- After [grill-me](grill-me.md) or [grill-with-docs](grill-with-docs.md) has established shared understanding
- When you want to formalize a plan as a Product Requirements Document

## How it works

```
> /skill:to-prd
```

The agent:

1. **Synthesizes** the conversation — no additional interview
2. **Explores** the repo to understand current state
3. **Sketches modules** — identifies what to build/modify using the domain language from `CONTEXT.md`, looks for deep module opportunities
4. **Confirms** modules with you
5. **Writes the PRD** using the template below
6. **Publishes** to GitHub Issues with label `needs-triage`

## PRD template

```markdown
## Problem Statement
(From the user's perspective)

## Solution
(From the user's perspective)

## User Stories
(Long numbered list of concrete scenarios)

## Implementation Decisions
(Modules, interfaces, schema changes)

## Testing Decisions
(Which modules get tests, what kind)

## Out of Scope
(Explicitly excluded)
```

## See also

- [To Issues](to-issues.md) — break the PRD into vertical slice issues
- [Triage](triage.md) — move issues through the state machine
