# Pi Agent Config Documentation

Welcome to the complete documentation for my [Pi coding agent](https://github.com/mariozechner/pi-coding-agent) configuration.

This repo holds everything I need to use Pi as an autonomous software engineer — skills, extensions, security guards, and the **Ralph loop** for fully autonomous implementation.

## What's inside

| Area | Description |
|---|---|
| **[:material-rocket-launch: Skills](skills/index.md)** | 14 reusable workflow skills (grill-me, TDD, triage, diagnose, etc.) |
| **[:material-puzzle: Extensions](extensions/index.md)** | Pi extensions (Ralph, git-workflow, security-gate, protected-paths) |
| **[:material-robot: Ralph Loop](ralph/index.md)** | Autonomous agent loop — Docker sandboxes, parallel agents, GitHub coordination |
| **[:material-sitemap: Workflows](workflows/index.md)** | End-to-end session patterns you can follow |

## Quick start

```bash
# 1. Clone this repo to ~/.pi/agent
git clone git@github.com:Badisse/pi-agent-config.git ~/.pi/agent

# 2. In any project, initialize
pi
> /ralph init

# 3. Run the setup skill
> /skill:setup-matt-pocock-skills

# 4. Start building
> /skill:grill-with-docs
```

## Philosophy

- **Design interactively, implement autonomously** — I design with Pi in conversation, then let Ralph implement without supervision.
- **Vertical slices only** — every issue is a thin cut through all layers, never a horizontal "do all the backend" task.
- **Security first** — hard-blocked destructive commands, protected paths, no access to secrets.
- **Domain language matters** — `CONTEXT.md` and ADRs create a shared vocabulary between me and the agent.
