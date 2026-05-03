/**
 * HTML template generator for /pr-summary.
 *
 * Generates a self-contained, dark-themed HTML page that looks
 * consistent every time — pragmatic, pretty, no fluff.
 */

import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

/** Data needed to render the PR summary page. */
export interface PrSummaryData {
	branch: string;
	baseBranch: string;
	commits: string[];
	changedFiles: string[];
	diffStat: string;
}

/** Commit type → color mapping for visual scanning. */
const TYPE_COLORS: Record<string, string> = {
	feat: "#3fb950",
	fix: "#f85149",
	refactor: "#a371f7",
	docs: "#79c0ff",
	test: "#d2a8ff",
	chore: "#8b949e",
	perf: "#f0883e",
	ci: "#58a6ff",
	build: "#8b949e",
};

/** Extract commit type from a conventional commit message like "abc1234 feat(auth): add login" */
function extractCommitType(line: string): string {
	const match = line.match(/^\w+\s+(\w+)(?:\(|:)/);
	return match?.[1] ?? "";
}

/** Escape HTML special characters. */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Render a single commit line with color-coded type. */
function renderCommit(line: string): string {
	const escaped = escapeHtml(line);
	const type = extractCommitType(line);
	const color = TYPE_COLORS[type] ?? "#c9d1d9";

	if (type) {
		// Highlight the type token in the commit line
		const typeRegex = new RegExp(`(\\b${type}\\b)`);
		const parts = escaped.split(typeRegex);
		return parts
			.map((part) => {
				if (part === type) {
					return `<span style="color: ${color}; font-weight: 600;">${part}</span>`;
				}
				return part;
			})
			.join("");
	}

	return escaped;
}

/** Generate the full HTML page. */
export function generateHtml(data: PrSummaryData): string {
	const title = `PR: ${data.branch} → ${data.baseBranch}`;
	const now = new Date().toLocaleString();

	const commitRows = data.commits.map((c) => `<li>${renderCommit(c)}</li>`).join("\n          ");

	const fileRows = data.changedFiles
		.map((f) => `<li><code>${escapeHtml(f)}</code></li>`)
		.join("\n          ");

	const diffStatHtml = data.diffStat
		? `<pre class="diff-stat">${escapeHtml(data.diffStat)}</pre>`
		: "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d1117;
      --bg-card:   #161b22;
      --bg-header: #161b22;
      --border:    #30363d;
      --text:      #c9d1d9;
      --text-dim:  #8b949e;
      --accent:    #58a6ff;
      --green:     #3fb950;
      --radius:    8px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 820px;
      margin: 0 auto;
    }

    /* ── Header ─────────────────────────────────────────── */
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }

    header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .branch-label {
      display: inline-block;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 2rem;
      padding: 0.2rem 0.75rem;
      font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
      font-size: 0.85rem;
    }

    .arrow {
      color: var(--text-dim);
      margin: 0 0.4rem;
    }

    .meta {
      color: var(--text-dim);
      font-size: 0.8rem;
      margin-top: 0.75rem;
    }

    /* ── Stats bar ──────────────────────────────────────── */
    .stats {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 1.25rem;
      flex: 1;
      min-width: 120px;
      text-align: center;
    }

    .stat-card .value {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--accent);
    }

    .stat-card .label {
      font-size: 0.75rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.15rem;
    }

    /* ── Sections ───────────────────────────────────────── */
    .section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 1.25rem;
      overflow: hidden;
    }

    .section-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.15);
    }

    .section-body {
      padding: 1rem 1.25rem;
    }

    /* ── Commit list ────────────────────────────────────── */
    .commit-list {
      list-style: none;
    }

    .commit-list li {
      font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
      font-size: 0.85rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--border);
      word-break: break-word;
    }

    .commit-list li:last-child {
      border-bottom: none;
    }

    /* ── File list ──────────────────────────────────────── */
    .file-list {
      list-style: none;
      columns: 2;
      column-gap: 1rem;
    }

    @media (max-width: 600px) {
      .file-list { columns: 1; }
    }

    .file-list li {
      font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
      font-size: 0.82rem;
      padding: 0.3rem 0;
      break-inside: avoid;
    }

    .file-list code {
      background: rgba(56, 139, 253, 0.1);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: var(--accent);
    }

    /* ── Diff stat ──────────────────────────────────────── */
    .diff-stat {
      font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
      font-size: 0.82rem;
      white-space: pre;
      overflow-x: auto;
      color: var(--text-dim);
      margin: 0;
    }

    /* ── Footer ─────────────────────────────────────────── */
    footer {
      text-align: center;
      color: var(--text-dim);
      font-size: 0.75rem;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <div>
        <span class="branch-label">${escapeHtml(data.branch)}</span>
        <span class="arrow">→</span>
        <span class="branch-label">${escapeHtml(data.baseBranch)}</span>
      </div>
      <div class="meta">Generated ${escapeHtml(now)}</div>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="value">${data.commits.length}</div>
        <div class="label">Commits</div>
      </div>
      <div class="stat-card">
        <div class="value">${data.changedFiles.length}</div>
        <div class="label">Files Changed</div>
      </div>
      <div class="stat-card">
        <div class="value">${escapeHtml(data.baseBranch)}</div>
        <div class="label">Base</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Commits</div>
      <div class="section-body">
        <ul class="commit-list">
          ${commitRows}
        </ul>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Files Changed</div>
      <div class="section-body">
        <ul class="file-list">
          ${fileRows}
        </ul>
      </div>
    </div>

    ${diffStatHtml ? `<div class="section">
      <div class="section-title">Diff Stat</div>
      <div class="section-body">
        ${diffStatHtml}
      </div>
    </div>` : ""}

    <footer>
      Generated by <strong>pi git-workflow</strong> · This file auto-expires in 3 days
    </footer>
  </div>
</body>
</html>`;
}

/** Temp file prefix for discovery and cleanup. */
const FILE_PREFIX = "pi-pr-summary-";

/** Write HTML to a temp file and return the path. */
export function writeTempHtml(html: string): string {
	const tmpDir = os.tmpdir();
	const timestamp = Date.now();
	const filePath = path.join(tmpDir, `${FILE_PREFIX}${timestamp}.html`);
	fs.writeFileSync(filePath, html, "utf8");
	return filePath;
}

/** Sweep old PR summary HTML files (>3 days) from tmpdir. */
export function cleanupOldSummaries(): void {
	const tmpDir = os.tmpdir();
	const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
	const cutoff = Date.now() - THREE_DAYS_MS;

	try {
		const entries = fs.readdirSync(tmpDir);
		for (const entry of entries) {
			if (!entry.startsWith(FILE_PREFIX)) continue;
			const fullPath = path.join(tmpDir, entry);
			try {
				const stat = fs.statSync(fullPath);
				if (stat.mtimeMs < cutoff) {
					fs.unlinkSync(fullPath);
				}
			} catch {
				// File may have been removed already, skip
			}
		}
	} catch {
		// tmpdir may not be readable, skip
	}
}
