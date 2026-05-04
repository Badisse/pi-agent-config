# Grill with Docs

!!! quote "One-liner"
    Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates documentation inline.

!!! tip "Most powerful skill"
    This is the single most valuable skill. It creates a shared vocabulary that makes every future session ~30% more token-efficient.

## When to use

- Before implementing any significant feature
- When you want to build/update domain language alongside your plan
- As a replacement for `grill-me` when working on an existing project

## How it works

```
> /skill:grill-with-docs
```

Same relentless interview as [grill-me](grill-me.md), plus:

1. **Reads existing docs** — `CONTEXT.md`, `docs/adr/`, project structure
2. **Builds domain language** — updates `CONTEXT.md` with consistent terminology
3. **Records decisions** — writes ADRs in `docs/adr/` as decisions crystallize
4. **Challenges against existing model** — catches contradictions with prior decisions

## Files created/updated

| File | Purpose |
|---|---|
| `CONTEXT.md` | Domain glossary — project jargon, entity definitions, relationships |
| `docs/adr/` | Architectural Decision Records |

## ADR format

Each ADR includes:

- **Status:** proposed / accepted / deprecated
- **Context:** what is the issue we're seeing
- **Decision:** what we decided to do
- **Consequences:** what becomes easier/harder

## See also

- [Grill Me](grill-me.md) — simpler version without documentation
- [To PRD](to-prd.md) — synthesize the conversation into a PRD
