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

Three tiers of protection:

| Tier | Behavior | Examples |
|---|---|---|
| **Sensitive vars** | Hard-blocked (no prompt) | `$GITHUB_TOKEN`, `$AWS_SECRET_KEY`, `$OPENAI_API_KEY` |
| **Non-sensitive vars** | Prompted (you decide) | `$HOME`, `$PATH`, `$NODE_ENV` |
| **Env dump commands** | Hard-blocked (no prompt) | `env`, `printenv`, `export -p`, `process.env` |

When the model tries to read a non-sensitive env var, you get a prompt:

```
🔑 Access to env var: NODE_ENV

  echo $NODE_ENV

Allow the model to read this env var?
  [Yes, allow]  [No, block it]
```

This means the model can **never** see any env var value without your explicit approval.

## How it works

The extension hooks into `tool_call` events for the `bash` tool. For each command:

1. Check against hard-blocked patterns → deny immediately
2. Check environment variable access → deny if sensitive
3. Check for `git push` to main → strong warning with select menu
4. Check against prompted patterns → show approval menu
5. All other commands → auto-allow
