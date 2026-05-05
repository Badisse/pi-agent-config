#!/bin/bash
# ralph/merge.sh — Merge all agent branches into a dedicated merge branch
# Usage: ralph/merge.sh [model] [base-branch]
#
# Creates agent/merge-batch-<date> from base-branch, merges all agent/* branches
# into it. Never touches base-branch directly.
#
# Run this AFTER all parallel ralph instances have finished.
#
# Env vars:
#   RALPH_TIMEOUT   — Max seconds for the merge agent (default: 1800)
#   GITHUB_TOKEN    — GitHub authentication token

set -eo pipefail

MODEL=${1:-zai/glm-5.1}
BASE_BRANCH=${2:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TIMEOUT="${RALPH_TIMEOUT:-1800}"
BATCH_DATE=$(date +%Y-%m-%d)
MERGE_BRANCH="agent/merge-batch-${BATCH_DATE}"

# ── Pre-flight ──────────────────────────────────────────────────

GH_TOKEN_VAL="${GITHUB_TOKEN:-$GH_TOKEN}"
if [ -z "$GH_TOKEN_VAL" ]; then
  GH_TOKEN_VAL=$(gh auth token 2>/dev/null || echo "")
fi
if [ -z "$GH_TOKEN_VAL" ]; then
  echo "⚠️  No GitHub token. Run: export GITHUB_TOKEN=\$(gh auth token)"
  exit 1
fi

cd "$PROJECT_DIR"

# Find all agent/* branches (local), excluding merge branches
branches=$(git branch --list 'agent/*' --format='%(refname:short)' | grep -v 'agent/merge-' || true)

if [ -z "$branches" ]; then
  echo "No agent/* branches found (excluding merge branches). Nothing to merge."
  exit 0
fi

echo "╔══════════════════════════════════════╗"
echo "║  Ralph — Batch Merge                 ║"
echo "║  Model: $MODEL"
echo "║  Base: $BASE_BRANCH"
echo "║  Merge branch: $MERGE_BRANCH"
echo "║  Branches to merge:"
for b in $branches; do
  echo "║    $b"
done
echo "╚══════════════════════════════════════╝"
echo ""

# Build branch list for prompt
branch_list=""
for b in $branches; do
  branch_list="${branch_list}- ${b}\n"
done

# Build the merge prompt
merge_prompt=$(cat "$SCRIPT_DIR/merge-prompt.md")
merge_prompt=${merge_prompt//\{\{BRANCHES\}\}/$branch_list}
merge_prompt=${merge_prompt//\{\{BASE_BRANCH\}\}/$BASE_BRANCH}
merge_prompt=${merge_prompt//\{\{MERGE_BRANCH\}\}/$MERGE_BRANCH}

# ── Create the merge branch ────────────────────────────────────

# Start from a clean base
git fetch origin "$BASE_BRANCH" 2>/dev/null || true
git branch -D "$MERGE_BRANCH" 2>/dev/null || true
git checkout -b "$MERGE_BRANCH" "origin/${BASE_BRANCH}" 2>/dev/null || git checkout -b "$MERGE_BRANCH" "$BASE_BRANCH"

echo "Created merge branch: $MERGE_BRANCH (from $BASE_BRANCH)"
echo ""

# ── Ensure Docker image exists ─────────────────────────────────

if ! docker image inspect pi-ralph &>/dev/null; then
  echo "⚠️  Docker image 'pi-ralph' not found. Building..."
  docker build -t pi-ralph "$SCRIPT_DIR" 2>&1 | tail -5
fi

# ── Run merge agent ─────────────────────────────────────────────

set +e
result=$(timeout "$TIMEOUT" docker run --rm \
  -v "$PROJECT_DIR:$PROJECT_DIR" \
  -v "$HOME/.pi/agent:/root/.pi/agent" \
  -v "$HOME/.config/gh:/root/.config/gh:ro" \
  -v "$HOME/.gitconfig:/root/.gitconfig:ro" \
  -e "GITHUB_TOKEN=$GH_TOKEN_VAL" \
  -e "PI_OFFLINE=1" \
  -w "$PROJECT_DIR" \
  pi-ralph \
  --mode text \
  --no-session \
  --model "$MODEL" \
  -p "$merge_prompt" \
  2>&1)
exit_code=$?
set -e

if [ $exit_code -ne 0 ] && [ -z "$result" ]; then
  result="⏰ Merge agent timed out after ${TIMEOUT}s."
fi

echo "$result"
echo ""

# ── Final status ────────────────────────────────────────────────

# Check back to original branch
git checkout "$BASE_BRANCH" 2>/dev/null || true

if echo "$result" | grep -q "MERGE COMPLETE"; then
  echo "╔══════════════════════════════════════╗"
  echo "║  ✅ Merge complete.                  ║"
  echo "║  Branch: $MERGE_BRANCH"
  echo "║                                      ║"
  echo "║  To review:                          ║"
  echo "║    git checkout $MERGE_BRANCH"
  echo "║    git log --oneline $BASE_BRANCH..HEAD"
  echo "║                                      ║"
  echo "║  To accept:                          ║"
  echo "║    git checkout $BASE_BRANCH"
  echo "║    git merge $MERGE_BRANCH"
  echo "║    git branch -d $MERGE_BRANCH"
  echo "╚══════════════════════════════════════╝"
  exit 0
else
  echo "╔══════════════════════════════════════╗"
  echo "║  ⚠️  Merge may be incomplete.         ║"
  echo "║  Check: git checkout $MERGE_BRANCH"
  echo "╚══════════════════════════════════════╝"
  exit 1
fi
