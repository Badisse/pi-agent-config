/**
 * HTML template generator for /docs.
 *
 * Produces a self-contained, dark-themed HTML page showing
 * all pi settings: model, extensions, commands, tools, themes.
 * Uses the same visual style as pr-summary-html.ts.
 */

import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

/** All data needed to render the docs page. */
export interface DocsData {
	generatedAt: string;
	model: ModelInfo | null;
	extensions: ExtensionInfo[];
	commands: CommandInfo[];
	tools: ToolGroup[];
	themes: ThemeInfo[];
}

export interface ModelInfo {
	provider: string;
	id: string;
	name: string;
	contextWindow: number;
	maxTokens: number;
	reasoning: boolean;
}

export interface ExtensionInfo {
	name: string;
	description: string;
	path: string;
	files: string[];
	commands: CommandInfo[];
	tools: ToolInfo[];
}

export interface CommandInfo {
	name: string;
	description: string;
	source: string;
	sourcePath: string;
}

export interface ToolGroup {
	label: string;
	tools: ToolInfo[];
}

export interface ToolInfo {
	name: string;
	description: string;
	active: boolean;
}

export interface ThemeInfo {
	name: string;
	active: boolean;
}

/** Escape HTML special characters. */
function esc(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Truncate a string to maxLen characters. */
function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	return text.slice(0, maxLen - 1) + "…";
}

/** Format a number with commas. */
function fmtNum(n: number): string {
	return n.toLocaleString();
}

/** Render the full HTML page. */
export function generateHtml(data: DocsData): string {
	const title = "Pi Settings Reference";

	const modelSection = data.model
		? renderModelSection(data.model)
		: `<div class="section"><div class="section-body"><p class="dim">No model selected</p></div></div>`;

	const extensionSections = data.extensions
		.map((ext) => renderExtensionSection(ext))
		.join("\n");

	const commandRows = data.commands
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((c) => {
			const sourceBadge = renderBadge(c.source);
			return `<tr>
				<td><code>/${esc(c.name)}</code></td>
				<td>${esc(c.description || "—")}</td>
				<td>${sourceBadge}</td>
			</tr>`;
		})
		.join("\n          ");

	const toolGroups = data.tools
		.map((group) => {
			const rows = group.tools
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((t) => {
					const status = t.active
						? `<span class="badge badge-green">active</span>`
						: `<span class="badge badge-dim">inactive</span>`;
					return `<tr>
						<td><code>${esc(t.name)}</code></td>
						<td>${esc(truncate(t.description || "—", 100))}</td>
						<td>${status}</td>
					</tr>`;
				})
				.join("\n          ");
			return `<div class="section">
				<div class="section-title">${esc(group.label)} (${group.tools.length})</div>
				<div class="section-body">
					<table>
						<thead><tr><th>Name</th><th>Description</th><th>Status</th></tr></thead>
						<tbody>${rows}</tbody>
					</table>
				</div>
			</div>`;
		})
		.join("\n");

	const themeRows = data.themes
		.map((t) => {
			const badge = t.active
				? `<span class="badge badge-green">active</span>`
				: "";
			return `<tr>
				<td><code>${esc(t.name)}</code></td>
				<td>${badge}</td>
			</tr>`;
		})
		.join("\n          ");

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d1117;
      --bg-card:   #161b22;
      --border:    #30363d;
      --text:      #c9d1d9;
      --text-dim:  #8b949e;
      --accent:    #58a6ff;
      --green:     #3fb950;
      --purple:    #a371f7;
      --radius:    8px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem 1rem;
    }

    .container { max-width: 900px; margin: 0 auto; }

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
      margin-bottom: 0.25rem;
    }

    .meta {
      color: var(--text-dim);
      font-size: 0.8rem;
      margin-top: 0.5rem;
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
      min-width: 100px;
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

    /* ── Model card ─────────────────────────────────────── */
    .model-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .model-icon {
      font-size: 2rem;
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(88, 166, 255, 0.1);
      border-radius: var(--radius);
      flex-shrink: 0;
    }

    .model-details h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text);
    }

    .model-meta {
      font-size: 0.85rem;
      color: var(--text-dim);
      margin-top: 0.15rem;
    }

    /* ── Extension cards ────────────────────────────────── */
    .ext-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .ext-icon {
      font-size: 1.2rem;
    }

    .ext-name {
      font-weight: 600;
      color: var(--text);
    }

    .ext-desc {
      color: var(--text-dim);
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
    }

    .ext-path {
      font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
      font-size: 0.75rem;
      color: var(--text-dim);
      background: rgba(0, 0, 0, 0.2);
      padding: 0.35rem 0.75rem;
      border-radius: 4px;
      margin-bottom: 0.75rem;
      word-break: break-all;
    }

    .ext-sub {
      margin-left: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .ext-sub-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.25rem;
    }

    .ext-sub-list {
      list-style: none;
    }

    .ext-sub-list li {
      font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
      font-size: 0.82rem;
      padding: 0.2rem 0;
    }

    .ext-sub-list li .desc {
      font-family: inherit;
      color: var(--text-dim);
      margin-left: 0.5rem;
    }

    .ext-separator {
      border: none;
      border-top: 1px solid var(--border);
      margin: 1.25rem 0;
    }

    /* ── Tables ─────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    th {
      text-align: left;
      font-weight: 600;
      color: var(--text-dim);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    tr:last-child td { border-bottom: none; }

    td code {
      background: rgba(88, 166, 255, 0.1);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: var(--accent);
      font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
      font-size: 0.82rem;
      white-space: nowrap;
    }

    /* ── Badges ─────────────────────────────────────────── */
    .badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.1rem 0.5rem;
      border-radius: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      vertical-align: middle;
    }

    .badge-green { background: rgba(63, 185, 80, 0.15); color: var(--green); }
    .badge-blue  { background: rgba(88, 166, 255, 0.15); color: var(--accent); }
    .badge-purple { background: rgba(163, 113, 247, 0.15); color: var(--purple); }
    .badge-dim   { background: rgba(139, 148, 158, 0.15); color: var(--text-dim); }

    /* ── Footer ─────────────────────────────────────────── */
    footer {
      text-align: center;
      color: var(--text-dim);
      font-size: 0.75rem;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }

    .dim { color: var(--text-dim); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${esc(title)}</h1>
      <div class="meta">Generated ${esc(data.generatedAt)}</div>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="value">${data.extensions.length}</div>
        <div class="label">Extensions</div>
      </div>
      <div class="stat-card">
        <div class="value">${data.commands.length}</div>
        <div class="label">Commands</div>
      </div>
      <div class="stat-card">
        <div class="value">${data.tools.reduce((sum, g) => sum + g.tools.length, 0)}</div>
        <div class="label">Tools</div>
      </div>
      <div class="stat-card">
        <div class="value">${data.themes.length}</div>
        <div class="label">Themes</div>
      </div>
    </div>

    ${modelSection}

    <div class="section">
      <div class="section-title">Extensions</div>
      <div class="section-body">
        ${extensionSections || '<p class="dim">No extensions loaded</p>'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">All Commands</div>
      <div class="section-body">
        <table>
          <thead><tr><th>Command</th><th>Description</th><th>Source</th></tr></thead>
          <tbody>${commandRows}</tbody>
        </table>
      </div>
    </div>

    ${toolGroups}

    ${data.themes.length > 0 ? `<div class="section">
      <div class="section-title">Themes</div>
      <div class="section-body">
        <table>
          <thead><tr><th>Name</th><th>Status</th></tr></thead>
          <tbody>${themeRows}</tbody>
        </table>
      </div>
    </div>` : ""}

    <footer>
      Generated by <strong>/docs</strong> &middot; This file auto-expires in 3 days
    </footer>
  </div>
</body>
</html>`;
}

function renderModelSection(model: ModelInfo): string {
	return `<div class="section">
		<div class="section-title">Current Model</div>
		<div class="section-body">
			<div class="model-card">
				<div class="model-icon">🧠</div>
				<div class="model-details">
					<h2>${esc(model.name || model.id)}</h2>
					<div class="model-meta">
						${esc(model.provider)}/${esc(model.id)} &middot;
						${fmtNum(model.contextWindow)} tokens context &middot;
						${fmtNum(model.maxTokens)} max output
						${model.reasoning ? ' &middot; <span class="badge badge-purple">reasoning</span>' : ""}
					</div>
				</div>
			</div>
		</div>
	</div>`;
}

function renderExtensionSection(ext: ExtensionInfo): string {
	const cmdsHtml = ext.commands.length > 0
		? `<div class="ext-sub">
			<div class="ext-sub-title">Commands</div>
			<ul class="ext-sub-list">
				${ext.commands.map((c) => `<li><code>/${esc(c.name)}</code><span class="dim">— ${esc(c.description || "—")}</span></li>`).join("\n        ")}
			</ul>
		</div>`
		: "";

	const toolsHtml = ext.tools.length > 0
		? `<div class="ext-sub">
			<div class="ext-sub-title">Tools</div>
			<ul class="ext-sub-list">
				${ext.tools.map((t) => `<li><code>${esc(t.name)}</code><span class="dim">— ${esc(truncate(t.description || "—", 80))}</span></li>`).join("\n        ")}
			</ul>
		</div>`
		: "";

	const filesHtml = ext.files.length > 0
		? `<div class="ext-sub">
			<div class="ext-sub-title">Files</div>
			<ul class="ext-sub-list">
				${ext.files.map((f) => `<li>${esc(f)}</li>`).join("\n        ")}
			</ul>
		</div>`
		: "";

	return `<div class="ext-header">
			<span class="ext-icon">🔌</span>
			<span class="ext-name">${esc(ext.name)}</span>
		</div>
		<div class="ext-desc">${esc(ext.description || "No description")}</div>
		<div class="ext-path">${esc(ext.path)}</div>
		${cmdsHtml}
		${toolsHtml}
		${filesHtml}
		<hr class="ext-separator">`;
}

function renderBadge(source: string): string {
	const map: Record<string, string> = {
		extension: "badge-blue",
		prompt: "badge-purple",
		skill: "badge-green",
		builtin: "badge-dim",
	};
	const cls = map[source] ?? "badge-dim";
	return `<span class="badge ${cls}">${esc(source)}</span>`;
}

/** Temp file prefix for discovery and cleanup. */
const FILE_PREFIX = "pi-docs-";

/** Write HTML to a temp file and return the path. */
export function writeTempHtml(html: string): string {
	const tmpDir = os.tmpdir();
	const timestamp = Date.now();
	const filePath = path.join(tmpDir, `${FILE_PREFIX}${timestamp}.html`);
	fs.writeFileSync(filePath, html, "utf8");
	return filePath;
}

/** Sweep old docs HTML files (>3 days) from tmpdir. */
export function cleanupOldDocs(): void {
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
				// File may have been removed already
			}
		}
	} catch {
		// tmpdir may not be readable
	}
}
