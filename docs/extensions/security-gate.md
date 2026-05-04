# Security Gate Extension

!!! info "Source"
    `~/.pi/agent/extensions/security-gate.ts`

Protects against destructive, suspicious, and sensitive bash commands.

## Hard-blocked (always denied, no prompt)

| Pattern | Reason |
|---|---|
| `rm -r`, `rm -rf`, `--recursive` | Recursive delete |
| `sudo` | Privilege escalation |
| `chmod/chown 777` | Permission 777 |
| `git push --force` | Force push |
| `git reset --hard` | Hard reset |

## Prompted (user must approve)

| Category | Examples |
|---|---|
| Disguised destructive | `cp /dev/null`, `truncate`, `dd` |
| Download & execute | `curl ... \| sh` |
| Package installs | `npm install`, `pip install`, `brew install` |
| Network with data upload | `curl -d`, `curl -X POST`, `nc` |
| System modifications | `launchctl`, `defaults write`, `crontab`, `xattr` |
| Git push to main/master | Strong warning, can override |

## Auto-allowed

Everything else — `ls`, `cat`, `grep`, `git status`, etc.

## How it works

The extension hooks into `tool_call` events for the `bash` tool. For each command:

1. Check against hard-blocked patterns → deny immediately
2. Check for `git push` to main → strong warning with select menu
3. Check against prompted patterns → show approval menu
4. All other commands → auto-allow
