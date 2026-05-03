/**
 * Data collector — gathers live data from the pi API
 * and filesystem to feed into the HTML template.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type {
	DocsData,
	ModelInfo,
	ExtensionInfo,
	CommandInfo,
	ToolGroup,
	ToolInfo,
	ThemeInfo,
} from "./html-template.js";

/**
 * Collect all docs data from live API + filesystem.
 */
export function collectData(pi: ExtensionAPI, ctx: ExtensionContext): DocsData {
	const generatedAt = new Date().toLocaleString();

	// ── Model ───────────────────────────────────────────────────
	const model = collectModel(ctx);

	// ── Commands ────────────────────────────────────────────────
	const commands = collectCommands(pi);

	// ── Tools ───────────────────────────────────────────────────
	const toolGroups = collectTools(pi);

	// ── Themes ──────────────────────────────────────────────────
	const themes = collectThemes(ctx);

	// ── Extensions ──────────────────────────────────────────────
	const extensions = collectExtensions(pi, commands, toolGroups);

	return { generatedAt, model, extensions, commands, tools: toolGroups, themes };
}

function collectModel(ctx: ExtensionContext): ModelInfo | null {
	try {
		const m = ctx.model;
		if (!m) return null;
		return {
			provider: m.provider ?? "",
			id: m.id ?? "",
			name: m.name ?? m.id ?? "",
			contextWindow: m.contextWindow ?? 0,
			maxTokens: m.maxTokens ?? 0,
			reasoning: m.reasoning ?? false,
		};
	} catch {
		return null;
	}
}

function collectCommands(pi: ExtensionAPI): CommandInfo[] {
	try {
		const cmds = pi.getCommands();
		return cmds.map((c) => ({
			name: c.name,
			description: c.description ?? "",
			source: c.source,
			sourcePath: c.sourceInfo?.path ?? "",
		}));
	} catch {
		return [];
	}
}

function collectTools(pi: ExtensionAPI): ToolGroup[] {
	try {
		const allTools = pi.getAllTools();
		const activeTools = pi.getActiveTools();
		const activeNames = new Set(activeTools.map((t) => t.name));

		// Group by source
		const builtin: ToolInfo[] = [];
		const extension: ToolInfo[] = [];

		for (const t of allTools) {
			const info: ToolInfo = {
				name: t.name,
				description: t.description ?? "",
				active: activeNames.has(t.name),
			};
			const source = (t.sourceInfo as { source?: string })?.source;
			if (source === "builtin") {
				builtin.push(info);
			} else {
				extension.push(info);
			}
		}

		const groups: ToolGroup[] = [];
		if (builtin.length > 0) groups.push({ label: "Built-in Tools", tools: builtin });
		if (extension.length > 0) groups.push({ label: "Extension Tools", tools: extension });

		return groups;
	} catch {
		return [];
	}
}

function collectThemes(ctx: ExtensionContext): ThemeInfo[] {
	try {
		// getAllThemes returns { name, path }[]
		// No direct "active" info, so we just list them
		const all = ctx.ui.getAllThemes();
		return (all as Array<{ name: string }>).map((t) => ({
			name: t.name,
			active: false, // we'll mark active via theme name comparison if possible
		}));
	} catch {
		return [];
	}
}

/**
 * Scan the filesystem for extensions and group their
 * commands/tools by source path.
 */
function collectExtensions(
	pi: ExtensionAPI,
	allCommands: CommandInfo[],
	toolGroups: ToolGroup[],
): ExtensionInfo[] {
	const extDir = path.join(os.homedir(), ".pi", "agent", "extensions");
	const extensions: ExtensionInfo[] = [];

	// Build lookup: sourcePath → commands
	const cmdsByPath = new Map<string, CommandInfo[]>();
	for (const cmd of allCommands) {
		if (cmd.source !== "extension") continue;
		const key = cmd.sourcePath;
		if (!cmdsByPath.has(key)) cmdsByPath.set(key, []);
		cmdsByPath.get(key)!.push(cmd);
	}

	// Build lookup: tool source → tools
	const extToolsBySource = new Map<string, ToolInfo[]>();
	for (const group of toolGroups) {
		if (group.label !== "Extension Tools") continue;
		// We can't easily map tools to extensions via API,
		// so we'll list them globally per extension later
	}

	// Scan extension directory
	let entries: string[];
	try {
		entries = fs.readdirSync(extDir);
	} catch {
		return [];
	}

	for (const entry of entries) {
		const fullPath = path.join(extDir, entry);
		const stat = fs.statSync(fullPath);

		// Single-file extension (.ts)
		if (stat.isFile() && entry.endsWith(".ts")) {
			const name = entry.replace(/\.ts$/, "");
			const description = readDescription(fullPath);
			const files = [entry];

			// Find commands whose sourcePath contains this file
			const commands = findCommandsForPath(cmdsByPath, fullPath);

			extensions.push({
				name,
				description,
				path: fullPath.replace(os.homedir(), "~"),
				files,
				commands,
				tools: [], // tools don't have easy path mapping
			});
		}

		// Directory extension (has index.ts or package.json)
		if (stat.isDirectory()) {
			const indexPath = path.join(fullPath, "index.ts");
			const pkgPath = path.join(fullPath, "package.json");

			let description = "";
			const files: string[] = [];

			if (fs.existsSync(indexPath)) {
				description = readDescription(indexPath);
			} else if (fs.existsSync(pkgPath)) {
				try {
					const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
					description = pkg.description ?? "";
				} catch {}
			}

			// List .ts files
			try {
				const dirFiles = fs.readdirSync(fullPath);
				for (const f of dirFiles) {
					if (f.endsWith(".ts")) files.push(f);
				}
			} catch {}

			const commands = findCommandsForPath(cmdsByPath, fullPath);

			extensions.push({
				name: entry,
				description,
				path: fullPath.replace(os.homedir(), "~"),
				files,
				commands,
				tools: [],
			});
		}
	}

	return extensions;
}

/**
 * Read the first JSDoc-style description line from a .ts file.
 * Looks for lines like: " * Description text here"
 */
function readDescription(filePath: string): string {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		const lines = content.split("\n");

		// Look for first non-empty line that isn't a comment marker, shebang, or import
		let inJsDoc = false;
		for (const line of lines) {
			const trimmed = line.trim();

			// Skip empty lines, comment openers, shebangs
			if (!trimmed || trimmed === "/**" || trimmed === "*/" || trimmed.startsWith("//") || trimmed.startsWith("#!")) {
				if (trimmed === "/**") inJsDoc = true;
				continue;
			}

			// Inside JSDoc — extract description
			if (inJsDoc) {
				const text = trimmed.replace(/^\*\s?/, "");
				if (text && !text.startsWith("@") && !text.startsWith("http")) {
					return text;
				}
				continue;
			}
		}
	} catch {}
	return "";
}

/**
 * Find commands whose sourcePath matches or is inside the given extension path.
 */
function findCommandsForPath(
	cmdsByPath: Map<string, CommandInfo[]>,
	extPath: string,
): CommandInfo[] {
	const results: CommandInfo[] = [];
	const normalized = extPath.replace(/\/$/, "");

	for (const [sourcePath, cmds] of cmdsByPath) {
		if (sourcePath.startsWith(normalized) || sourcePath.includes(normalized)) {
			results.push(...cmds);
		}
	}

	return results;
}
