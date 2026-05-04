# Setup Matt Pocock's Skills

!!! quote "One-liner"
    One-time per-project setup: configure issue tracker, triage labels, domain docs layout.

## When to use

- **Before** first use of `to-issues`, `to-prd`, `triage`, `diagnose`, `tdd`, `improve-codebase-architecture`, or `zoom-out`
- When skills appear to be missing context about the issue tracker or domain docs

## How it works

```
> /skill:setup-matt-pocock-skills
```

The agent:

1. **Explores** the repo — checks for existing `AGENTS.md`, `CONTEXT.md`, `docs/adr/`, `docs/agents/`
2. **Presents findings** — shows what it found and asks for confirmation
3. **Configures** — writes the `## Agent skills` block in `AGENTS.md` and creates `docs/agents/` templates

## What gets configured

| Item | File | Purpose |
|---|---|---|
| Issue tracker | `docs/agents/issue-tracker.md` | GitHub / GitLab / local |
| Triage labels | `docs/agents/triage-labels.md` | Label names and meanings |
| Domain docs | `docs/agents/domain.md` | Where CONTEXT.md and ADRs live |

## Supports multiple trackers

- **GitHub** — uses `gh` CLI for issue management
- **GitLab** — uses `glab` CLI
- **Local** — markdown files in `.scratch/`
