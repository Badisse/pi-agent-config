# Architecture Day Workflow

**Duration:** 2–4 hours
**Best for:** Refactoring, deepening module interfaces, improving codebase structure
**Autonomous:** Partially — design is interactive, implementation is autonomous

## Step 1: Analyze the codebase

```bash
pi
> /skill:improve-codebase-architecture
```

The agent:

1. Reads `CONTEXT.md` and `docs/adr/` for existing domain language and decisions
2. Explores the codebase for shallow modules (wide interfaces, leaky abstractions)
3. Proposes 3+ alternative interfaces per module
4. Spawns parallel sub-agents with different design constraints

## Step 2: Create RFCs

Pick the proposals you like and create issues:

```
> /skill:to-issues
> /skill:triage
```

## Step 3: Ralph implements

```bash
/ralph start 10
```

The agent implements the refactors as vertical slices — each issue is one complete module deepening.

## Step 4: Review

```bash
pi
> git log --oneline -20
> /skill:review-commit
```
