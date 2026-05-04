# Write a Skill

!!! quote "One-liner"
    Create new agent skills with proper structure, progressive disclosure, and bundled resources.

## When to use

- You want to codify a workflow as a reusable skill
- Building custom skills for your team or project

## How it works

```
> /skill:write-a-skill
```

The agent:

1. **Gathers requirements** — asks about domain, use cases, scripts needed
2. **Drafts the skill** — creates `SKILL.md` + reference files + utility scripts
3. **Reviews with you** — checks coverage, clarity, detail level

## Skill structure

```
skill-name/
├── SKILL.md           # Main instructions (required)
├── reference.md       # Optional reference material
└── helper.sh          # Optional utility scripts
```

## Design principles

- **Progressive disclosure** — SKILL.md contains instructions; references loaded on demand
- **Keep SKILL.md under 500 lines** — split into referenced files if needed
- **Deterministic operations** as scripts, not instructions
