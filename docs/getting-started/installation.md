# Installation

## Clone the config

```bash
git clone git@github.com:Badisse/pi-agent-config.git ~/.pi/agent
```

This places the entire config — skills, extensions, ralph scripts — at `~/.pi/agent/`, which is where Pi looks for agent configuration.

## Verify

```bash
pi
> /reload
> /ralph status
```

You should see Pi load the extensions and report "No ralph sessions running."

## What gets installed

```
~/.pi/agent/
├── extensions/
│   ├── ralph/              # /ralph slash commands
│   ├── git-workflow/       # /branch, /commit, /checkpoint, /pr-summary
│   ├── protected-paths.ts  # Blocks access to secrets
│   └── security-gate.ts    # Blocks destructive commands
├── skills/                 # 14 workflow skills
├── ralph/                  # Autonomous loop scripts
├── settings.json           # Pi settings
└── .gitignore              # Excludes auth.json, sessions, bin/
```

## Security

The following are excluded from git via `.gitignore`:

- `auth.json` — Pi provider API keys
- `sessions/` — session history
- `bin/` — bundled binaries (fd, rg)

The [security gate](../extensions/security-gate.md) and [protected paths](../extensions/protected-paths.md) extensions are active by default.
