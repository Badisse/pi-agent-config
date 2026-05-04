# Improve Codebase Architecture

!!! quote "One-liner"
    Find deepening opportunities in a codebase — modules with shallow interfaces that should be deeper.

## When to use

- Codebase feels hard to navigate
- Modules have leaky abstractions
- You want to improve testability
- Refactoring for AI-navigability

## How it works

```
> /skill:improve-codebase-architecture
```

The agent:

1. Reads `CONTEXT.md` and `docs/adr/` for domain language and existing decisions
2. Explores the codebase for **shallow modules** (wide interfaces, pass-through abstractions)
3. Proposes **3+ alternative interfaces** per problem module
4. Spawns parallel sub-agents with different design constraints

## Key concepts

| Term | Definition |
|---|---|
| **Module** | Anything with an interface and implementation |
| **Interface** | Everything a caller must know to use the module |
| **Depth** | High leverage — lots of behavior behind a small interface |
| **Seam** | Where an interface lives — a place behavior can be altered |
| **Adapter** | A concrete thing satisfying an interface at a seam |

## The deletion test

> Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.

## Reference files

| File | Content |
|---|---|
| `LANGUAGE.md` | Full glossary of architectural terms |
| `DEEPENING.md` | Deep module design patterns |
| `INTERFACE-DESIGN.md` | Interface design principles |
