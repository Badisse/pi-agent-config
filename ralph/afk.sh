#!/bin/bash
# ralph/afk.sh — Run Pi autonomously in a Docker sandbox
# Usage: ralph/afk.sh [iterations] [model]
#
# Env vars:
#   WORKTREE_DIR    — Path to a git worktree (set by extension for parallel mode)
#   RALPH_TIMEOUT   — Max seconds per iteration (default: 1800 = 30 min)
#   GITHUB_TOKEN    — GitHub authentication token
#
# If no iterations given, runs until <promise>NO MORE TASKS</promise>.
# Each iteration collects fresh context and runs Pi headless in Docker.

set -eo pipefail

ITERATIONS=${1:-0}
MODEL=${2:-zai/glm-5.1}
REVIEW=${3:-true}  # third arg: "noreview" to skip review phase
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORKTREE_DIR="${WORKTREE_DIR:-$PROJECT_DIR}"
TIMEOUT="${RALPH_TIMEOUT:-1800}"

# ── Pre-flight checks ──────────────────────────────────────────

if ! docker image inspect pi-ralph &>/dev/null; then
  echo "⚠️  Docker image 'pi-ralph' not found. Building..."
  docker build -t pi-ralph "$SCRIPT_DIR" 2>&1 | tail -5
fi

GH_TOKEN_VAL="${GITHUB_TOKEN:-$GH_TOKEN}"
if [ -z "$GH_TOKEN_VAL" ]; then
  GH_TOKEN_VAL=$(gh auth token 2>/dev/null || echo "")
fi
if [ -z "$GH_TOKEN_VAL" ]; then
  echo "⚠️  No GitHub token. Run: export GITHUB_TOKEN=\$(gh auth token)"
  exit 1
fi

# ── Mode detection ──────────────────────────────────────────────

IS_PARALLEL=false
if [ "$WORKTREE_DIR" != "$PROJECT_DIR" ]; then
  IS_PARALLEL=true
fi

echo "╔══════════════════════════════════════╗"
echo "║  Ralph — Autonomous AFK Loop         ║"
echo "║  Model: $MODEL"
echo "║  Timeout: ${TIMEOUT}s per iteration"
echo "║  Project: $(basename "$PROJECT_DIR")"
if $IS_PARALLEL; then
echo "║  Worktree: $(basename "$WORKTREE_DIR")"
fi
echo "╚══════════════════════════════════════╝"
echo ""
if [ "$ITERATIONS" -eq 0 ]; then
  echo "  Runs until no more tasks."
else
  echo "  Max $ITERATIONS iterations."
fi

# ── Cleanup trap (parallel mode) ────────────────────────────────

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

# ── Main loop ───────────────────────────────────────────────────

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

  # ── Collect context (on host, from main project) ──────────────

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

  # ── Run Pi inside Docker ──────────────────────────────────────
  #
  # Mount project at same absolute path so worktree .git files resolve.
  # In single-agent mode, WORKTREE_DIR == PROJECT_DIR.
  # In parallel mode, WORKTREE_DIR is a worktree subdirectory.

  set +e
  result=$(timeout "$TIMEOUT" docker run --rm \
    -v "$PROJECT_DIR:$PROJECT_DIR" \
    -v "$HOME/.pi/agent:/root/.pi/agent" \
    -v "$HOME/.config/gh:/root/.config/gh:ro" \
    -v "$HOME/.gitconfig:/root/.gitconfig:ro" \
    -e "GITHUB_TOKEN=$GH_TOKEN_VAL" \
    -e "PI_OFFLINE=1" \
    -w "$WORKTREE_DIR" \
    pi-ralph \
    --mode text \
    --no-session \
    --model "$MODEL" \
    -p "$full_prompt" \
    2>&1)
  exit_code=$?
  set -e

  if [ $exit_code -ne 0 ] && [ -z "$result" ]; then
    result="⏰ Iteration timed out after ${TIMEOUT}s — killed by timeout."
  fi

  echo "$result"
  echo ""

  # ── Review phase (fresh agent, no implementer context) ─────────

  if [ "$REVIEW" != "noreview" ]; then
    # Check if implementer produced commits on this branch
    current_branch=$(cd "$WORKTREE_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    base_branch=$(cd "$PROJECT_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    new_commits=0
    if [ -n "$current_branch" ] && [ "$current_branch" != "$base_branch" ]; then
      new_commits=$(cd "$WORKTREE_DIR" && git log "$base_branch"..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
    fi

    if [ "$new_commits" -gt 0 ]; then
      issue_num=$(echo "$current_branch" | grep -oE 'agent/([0-9]+)' | grep -oE '[0-9]+' || echo "")
      review_prompt=$(cat "$SCRIPT_DIR/review-prompt.md")
      review_prompt=${review_prompt//\{\{BASE_BRANCH\}\}/$base_branch}
      review_prompt=${review_prompt//\{\{ISSUE_NUMBER\}\}/$issue_num}

      echo "  📋 Running review phase (fresh agent)..."
      echo ""

      set +e
      review_result=$(timeout "$TIMEOUT" docker run --rm \
        -v "$PROJECT_DIR:$PROJECT_DIR" \
        -v "$HOME/.pi/agent:/root/.pi/agent" \
        -v "$HOME/.config/gh:/root/.config/gh:ro" \
        -v "$HOME/.gitconfig:/root/.gitconfig:ro" \
        -e "GITHUB_TOKEN=$GH_TOKEN_VAL" \
        -e "PI_OFFLINE=1" \
        -w "$WORKTREE_DIR" \
        pi-ralph \
        --mode text \
        --no-session \
        --model "$MODEL" \
        -p "$review_prompt" \
        2>&1)
      review_exit=$?
      set -e

      if [ $review_exit -ne 0 ] && [ -z "$review_result" ]; then
        review_result="⏰ Review timed out after ${TIMEOUT}s."
      fi

      echo "$review_result"
      echo ""

      if echo "$review_result" | grep -q "REVIEW PASSED"; then
        echo "  ✅ Review passed."
      else
        echo "  ⚠️  Review made fixes."
      fi
      echo ""
    else
      echo "  ⏭️  No commits to review."
      echo ""
    fi
  fi

  # ── Check completion ──────────────────────────────────────────

  if echo "$result" | grep -q "<promise>NO MORE TASKS</promise>"; then
    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║  ✅ Ralph complete after $i iterations."
    echo "╚══════════════════════════════════════╝"
    exit 0
  fi
done
