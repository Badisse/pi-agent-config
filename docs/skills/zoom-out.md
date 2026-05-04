# Zoom Out

!!! quote "One-liner"
    Tell the agent to step back and explain code in the context of the whole system.

## When to use

- You're lost in the weeds
- Unfamiliar with a section of code
- Need to understand how a module fits into the bigger picture

## How it works

```
> /skill:zoom-out
```

The agent:

1. Goes up a layer of abstraction
2. Maps all relevant modules and callers
3. Uses the project's domain glossary vocabulary from `CONTEXT.md`

## No special configuration

This skill has no references or templates — it's a simple instruction to the agent to give broader context.
