# TDD — Test-Driven Development

!!! quote "One-liner"
    Test-driven development with red-green-refactor loop. One test → one implementation → repeat.

## When to use

- Building new features
- Fixing bugs (write regression test first)
- Any time you want code backed by tests

## How it works

```
> /skill:tdd
```

The agent follows **vertical slice TDD**:

1. **RED** — write one failing test for a specific behavior
2. **GREEN** — write the minimum code to make it pass
3. **REFACTOR** — clean up while keeping tests green
4. **Repeat** — next test for the next behavior

## Anti-pattern: horizontal slicing

!!! danger "Do NOT do this"
    Writing all tests first, then all implementation. This produces **crap tests** — they test imagined behavior, not actual behavior.

**Correct approach:** One test → one implementation → repeat. Each test responds to what you learned from the previous cycle.

## What makes good tests

- Verify **behavior through public interfaces**, not implementation details
- Read like a **specification** — "user can checkout with valid cart"
- **Survive refactors** — tests shouldn't break when internals change

## Reference files

The skill bundles these reference documents:

| File | Content |
|---|---|
| `tests.md` | Examples of good vs bad tests |
| `mocking.md` | When and how to mock |
| `interface-design.md` | Designing testable interfaces |
| `refactoring.md` | Refactoring with confidence |
| `deep-modules.md` | Deep module design principles |
