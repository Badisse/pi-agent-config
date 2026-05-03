#!/bin/bash
# ralph/afk-local.sh — Run Pi autonomously WITHOUT Docker
# Usage: ralph/afk-local.sh [iterations] [model]
#
# Env vars:
#   WORKTREE_DIR    — Path to a git worktree (set by extension for parallel mode)
#   RALPH_TIMEOUT   — Max seconds per iteration (default: 1800 = 30 min)

set -eo pipefail

ITERATIONS=${1:-0}
MODEL=${2:-zai/glm-5.1}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORKTREE_DIR="${WORKTREE_DIR:-$PROJECT_DIR}"
TIMEOUT="${RALPH_TIMEOUT:-1800}"

IS_PARALLEL=false
if [ "$WORKTREE_DIR" != "$PROJECT_DIR" ]; then
  IS_PARALLEL=true
fi

echo "╔══════════════════════════════════════╗"
echo "║  Ralph — Autonomous AFK Loop (local) ║"
echo "║  Model: $MODEL"
echo "║  Timeout: ${TIMEOUT}s per iteration"
echo "║  Project: $(basename "$PROJECT_DIR")"
if $IS_PARALLEL; then
echo "║  Worktree: $(basename "$WORKTREE_DIR")"
fi
echo "╚══════════════════════════════════════╝"
if [ "$ITERATIONS" -eq 0 ]; then
  echo "  Runs until no more tasks."
else
  echo "  Max $ITERATIONS iterations."
fi

# Cleanup trap (parallel mode)
cleanup() {
  if $IS_PARALLEL && [ -d "$WORKTREE_DIR" ]; then
    echo ""
    echo "Cleaning up worktree $(basename "$WORKTREE_DIR")..."
    cd "$PROJECT_DIR"
    git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
    git worktree prune 2>/dev/null || true
  fi
}
if $IS_PARALLEL; then
  trap cleanup EXIT
fi

# Main loop
i=0
while true; do
  i=$((i + 1))
  if [ "$ITERATIONS" -ne 0 ] && [ "$i" -gt "$ITERATIONS" ]; then
    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║  ⏸  Ralph paused after $ITERATIONS iterations."
    echo "╚══════════════════════════════════════╝"
    exit 0
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ "$ITERATIONS" -eq 0 ]; then
    echo "  Iteration $i"
  else
    echo "  Iteration $i / $ITERATIONS"
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Collect context from main project
  commits=$(cd "$PROJECT_DIR" && git log -n 5 --format="%h %ad %s%n%B---" --date=short 2>/dev/null || echo "No commits found")

  repo_url=$(cd "$PROJECT_DIR" && git remote get-url origin 2>/dev/null || echo "")
  issues=""
  in_progress=""
  if [ -n "$repo_url" ]; then
    issues=$(cd "$PROJECT_DIR" && gh issue list --label ready-for-agent --state open --json number,title,body 2>/dev/null || echo "[]")
    in_progress=$(cd "$PROJECT_DIR" && gh issue list --label in-progress --state open --json number,title 2>/dev/null || echo "[]")
    if [ "$issues" = "[]" ] || [ -z "$issues" ]; then
      issues="No issues labeled ready-for-agent"
    fi
  else
    issues="No git remote configured"
  fi

  prompt=$(cat "$SCRIPT_DIR/prompt.md")

  full_prompt="Previous commits:
$commits

Issues ready-for-agent (JSON with body for blocker check):
$issues

Issues in-progress (other agents working on these):
$in_progress

$prompt"

  # Run Pi headless in worktree
  set +e
  result=$(cd "$WORKTREE_DIR" && timeout "$TIMEOUT" pi --mode text --no-session --model "$MODEL" -p "$full_prompt" 2>&1)
  exit_code=$?
  set -e

  if [ $exit_code -ne 0 ] && [ -z "$result" ]; then
    result="⏰ Iteration timed out after ${TIMEOUT}s — killed by timeout."
  fi

  echo "$result"
  echo ""

  if echo "$result" | grep -q "<promise>NO MORE TASKS</promise>"; then
    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║  ✅ Ralph complete after $i iterations."
    echo "╚══════════════════════════════════════╝"
    exit 0
  fi
done
