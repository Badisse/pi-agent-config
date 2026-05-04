# Caveman

!!! quote "One-liner"
    Ultra-compressed communication mode. Cuts token usage ~75% by dropping filler, articles, and pleasantries.

## When to use

- Long autonomous sessions where token cost matters
- When you say "caveman mode", "talk like caveman", "less tokens", "be brief"
- Best paired with Ralph autonomous loops

## How it works

Once triggered, every response is compressed:

- **Drop:** articles (a/an/the), filler (just/really/basically), pleasantries (sure/certainly/of course), hedging
- **Keep:** exact technical terms, code blocks, error messages
- **Pattern:** `[thing] [action] [reason]. [next step].`

### Example

**Normal:** "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by the token expiry check using `<` instead of `<=`."

**Caveman:** "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"

## Persistence

Stays active for every response until you say "stop caveman" or "normal mode".
