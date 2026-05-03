#!/bin/bash
# ralph/once.sh — Run a single Pi iteration (interactive, no Docker)
# Usage: ralph/once.sh
#
# Starts an interactive Pi session with ralph context injected.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Collect context
commits=$(git log -n 5 --format="%h %ad %s" --date=short 2>/dev/null || echo "No commits found")

repo_url=$(git remote get-url origin 2>/dev/null || echo "")
issues="No issues found"
in_progress=""
if [ -n "$repo_url" ]; then
  issues=$(gh issue list --label ready-for-agent --state open --json number,title,body 2>/dev/null || echo "No issues found")
  in_progress=$(gh issue list --label in-progress --state open --json number,title 2>/dev/null || echo "")
  if [ "$issues" = "[]" ] || [ -z "$issues" ]; then
    issues="No issues labeled ready-for-agent"
  fi
fi

prompt=$(cat "$SCRIPT_DIR/prompt.md")

echo "╔══════════════════════════════════════╗"
echo "║  Ralph — Single Interactive Run      ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Recent commits:"
echo "$commits" | sed 's/^/  /'
echo ""
echo "Issues ready-for-agent:"
if [ "$issues" != "No issues found" ] && [ "$issues" != "No issues labeled ready-for-agent" ]; then
  echo "$issues" | jq -r '.[] | "  #\(.number): \(.title)"' 2>/dev/null || echo "  $issues"
else
  echo "  $issues"
fi
echo ""

# Run Pi interactively with context as initial message
full_prompt="Previous commits:
$commits

Issues ready-for-agent (JSON):
$issues

Issues in-progress:
$in_progress

$prompt"

pi --append-system-prompt "$full_prompt" "Pick the next AFK issue and implement it."
