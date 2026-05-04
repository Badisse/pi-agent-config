# Security Gate Extension

!!! info "Source"
    `~/.pi/agent/extensions/security-gate.ts`

Protects against destructive, suspicious, and sensitive bash commands, and prevents access to sensitive environment variables.

## Hard-blocked (always denied, no prompt)

| Pattern | Reason |
|---|---|
| `rm -r`, `rm -rf`, `--recursive` | Recursive delete |
| `sudo` | Privilege escalation |
| `chmod/chown 777` | Permission 777 |
| `git push --force` | Force push |
| `git reset --hard` | Hard reset |
| `env`, `printenv`, `export -p` | Environment variable dump |
| `process.env`, `os.environ` | Programmatic env access |
| `$SENSITIVE_VAR` | Access to sensitive env vars (tokens, keys, secrets) |

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

## Auto-allowed

Everything else — `ls`, `cat`, `grep`, `git status`, etc.

## Environment variable protection

The gate blocks both **bulk dumps** and **targeted access** to sensitive env vars.

### Blocked dump commands

| Command | Blocked |
|---|---|
| `env` | ✅ Dumps all vars |
| `printenv` | ✅ Dumps all vars |
| `export -p` / `declare -p` | ✅ Dumps all vars |
| `node -e "...process.env..."` | ✅ Node.js env dump |
| `python -c "...os.environ..."` | ✅ Python env dump |
| `/proc/self/environ` | ✅ Procfs env file |

### Sensitive var patterns

Access via `$VAR`, `${VAR}`, or `printenv VAR` is blocked for any variable matching:

- `*_TOKEN`, `*_KEY`, `*_SECRET`, `*_PASSWORD`, `*_PASS`
- `*_CREDENTIALS`, `*_PRIVATE_KEY`
- `AWS_*`, `OPENAI*`, `ANTHROPIC*`, `GOOGLE_*`
- `STRIPE_*`, `TWILIO_*`, `SLACK_*`, `DISCORD_*`
- `DATABASE_URL`, `SECRET_*`, `MYSQL_*`, `PGPASSWORD`, `MONGO*`, `REDIS*`
- ...and more (see source for full list)

### Explicitly allowed

These vars match sensitive patterns but are needed by Ralph, so they're allowed:

| Variable | Why allowed |
|---|---|
| `GITHUB_TOKEN` | Ralph needs it for issue management |
| `GH_TOKEN` | Alias for GITHUB_TOKEN |
| `RALPH_MODEL` | Ralph model config |
| `RALPH_TIMEOUT` | Ralph timeout config |
| `PI_OFFLINE` | Pi offline mode flag |

## How it works

The extension hooks into `tool_call` events for the `bash` tool. For each command:

1. Check against hard-blocked patterns → deny immediately
2. Check environment variable access → deny if sensitive
3. Check for `git push` to main → strong warning with select menu
4. Check against prompted patterns → show approval menu
5. All other commands → auto-allow
