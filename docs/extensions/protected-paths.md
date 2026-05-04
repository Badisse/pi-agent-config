# Protected Paths Extension

!!! info "Source"
    `~/.pi/agent/extensions/protected-paths.ts`

Silently blocks read, write, and edit access to sensitive files.

## Protected directories

All files within these directories are blocked:

- `~/.ssh/`
- `~/.gnupg/`
- `~/.aws/`

## Protected file patterns

Any file whose basename matches these patterns is blocked:

| Pattern | Matches |
|---|---|
| `.env`, `.env.*` | Environment variable files |
| `*.key`, `*.pem`, `*.p12` | Cryptographic keys and certificates |
| `credentials*` | Credential files |
| `secrets*` | Secret files |
| `*.token` | Token files |

## How it works

The extension hooks into `tool_call` events for `read`, `write`, `edit`, and `bash` tools:

- **read/write/edit** — checks the `path` parameter against protected patterns
- **bash** — scans the command string for references to protected directories

All blocks are silent — the agent is notified but never sees the protected content.
