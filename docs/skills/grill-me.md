# Grill Me

!!! quote "One-liner"
    Interview you relentlessly about a plan or design until reaching shared understanding.

## When to use

- Every time you want to make a change, even a small one
- Stress-test a plan or design decision
- Force clarity before writing code

## How it works

```
> /skill:grill-me
```

The agent:

1. Asks one question at a time about your plan
2. Explores each branch of the decision tree
3. Provides recommended answers for each question
4. If a question can be answered by exploring the codebase, it explores instead of asking

## What you get

- Shared understanding between you and the agent
- Resolved dependencies between decisions
- A clear path forward before any code is written

## See also

- [Grill with Docs](grill-with-docs.md) — same as grill-me but also builds `CONTEXT.md` and `docs/adr/`
