/**
 * Protected Paths Extension
 *
 * Silently blocks read, write, and edit access to sensitive files.
 * Also checks bash commands for references to protected paths
 * (directories, file patterns, and redirect targets).
 *
 * Protected directories (and all files within):
 *   ~/.ssh/, ~/.gnupg/, ~/.aws/
 *
 * Protected file patterns (by basename, anywhere):
 *   .env, .env.*        — environment variable files
 *   *.key, *.pem, *.p12 — cryptographic keys and certificates
 *   credentials*        — credential files
 *   secrets*            — secret files
 *   *.token             — token files
 *
 * Configuration:
 *   Per-project overrides in `.pi/protected-paths.json`:
 *   {
 *     "extraDirs": ["./secrets"],
 *     "extraPatterns": ["^\\.vault$"]
 *   }
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

const homeDir = os.homedir();

// ── Default protected paths ───────────────────────────────────

/** Directories — block any path inside these (resolved absolute). */
const defaultProtectedDirs: string[] = [
	path.join(homeDir, ".ssh"),
	path.join(homeDir, ".gnupg"),
	path.join(homeDir, ".aws"),
];

/** File basename patterns — block any file whose name matches. */
const defaultProtectedFilePatterns: RegExp[] = [
	/^\.env(\.|$)/i,       // .env, .env.local, .env.production
	/\.key$/i,             // *.key
	/\.pem$/i,             // *.pem
	/\.p12$/i,             // *.p12
	/^credentials/i,       // credentials*, credentials.json
	/^secrets?(\.|$|-)/i,  // secrets, secrets.json, secret.key
	/\.token$/i,           // *.token
];

// ── Config ────────────────────────────────────────────────────

interface ProtectedPathsConfig {
	extraDirs: string[];
	extraPatterns: string[];
}

let protectedDirs: string[] = defaultProtectedDirs;
let protectedFilePatterns: RegExp[] = defaultProtectedFilePatterns;

function loadConfig(cwd: string): void {
	const configPath = path.join(cwd, ".pi", "protected-paths.json");
	try {
		const raw = fs.readFileSync(configPath, "utf8");
		const parsed = JSON.parse(raw) as ProtectedPathsConfig;

		if (Array.isArray(parsed.extraDirs)) {
			protectedDirs = [
				...defaultProtectedDirs,
				...parsed.extraDirs.map((d: string) => path.resolve(cwd, d)),
			];
		}
		if (Array.isArray(parsed.extraPatterns)) {
			protectedFilePatterns = [
				...defaultProtectedFilePatterns,
				...parsed.extraPatterns.map((p: string) => new RegExp(p, "i")),
			];
		}
	} catch {
		protectedDirs = defaultProtectedDirs;
		protectedFilePatterns = defaultProtectedFilePatterns;
	}
}

// ── Core checks ───────────────────────────────────────────────

/**
 * Check if a file path is protected.
 * Resolves symlinks before checking to prevent symlink escapes.
 */
function isProtected(filePath: string): boolean {
	let resolved = path.resolve(filePath);

	// Resolve symlinks to prevent escape via ./link → ~/.ssh/id_rsa
	try {
		const real = fs.realpathSync(resolved);
		if (real) resolved = real;
	} catch {
		// File doesn't exist yet — check the path as-is
	}

	// Check directory protections
	for (const dir of protectedDirs) {
		if (resolved === dir || resolved.startsWith(dir + path.sep)) {
			return true;
		}
	}

	// Check file basename patterns
	const basename = path.basename(resolved);
	for (const pattern of protectedFilePatterns) {
		if (pattern.test(basename)) {
			return true;
		}
	}

	return false;
}

/**
 * Extract path-like tokens from a bash command.
 * Matches: quoted strings, redirect targets, bare path arguments.
 * Returns deduplicated array of potential file paths.
 */
function extractPathsFromCommand(command: string): string[] {
	const paths: string[] = [];
	const seen = new Set<string>();

	function add(p: string) {
		const trimmed = p.trim();
		if (trimmed && !seen.has(trimmed)) {
			seen.add(trimmed);
			paths.push(trimmed);
		}
	}

	// 1. Redirect targets: > file, >> file, < file
	for (const match of command.matchAll(/[<>]{1,2}\s*([^\s;|&>'"]+)/g)) {
		add(match[1]);
	}

	// 2. Quoted strings (single and double): "path", 'path'
	for (const match of command.matchAll(/["']([^"']+)["']/g)) {
		add(match[1]);
	}

	// 3. Tilde-expanded paths: ~/..., ~user/...
	for (const match of command.matchAll(/(~[a-zA-Z0-9_]*\/[^\s;|&<>'"]+)/g)) {
		const expanded = match[1].replace(/^~/, homeDir);
		add(expanded);
	}

	// 4. Absolute paths: /...
	for (const match of command.matchAll(/(?<=\s|^)(\/[^\s;|&<>'"]+)/g)) {
		add(match[1]);
	}

	return paths;
}

/**
 * Check a bash command for any reference to protected paths.
 * Checks both directory paths and file patterns.
 * Returns the first matched protected path, or null.
 */
function checkCommandForProtectedPaths(command: string): string | null {
	// 1. Quick check: directory paths as substrings (fast path)
	for (const dir of protectedDirs) {
		if (command.includes(dir)) return dir;
		const tildePath = dir.replace(homeDir, "~");
		if (command.includes(tildePath)) return tildePath;
	}

	// 2. Extract path tokens and check each against isProtected
	const paths = extractPathsFromCommand(command);
	for (const p of paths) {
		if (isProtected(p)) return p;
	}

	return null;
}

// ── Extension ─────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		loadConfig(ctx.cwd);
	});

	pi.on("tool_call", async (event, ctx) => {
		// ── read, write, edit tools: check path parameter ──────
		if (event.toolName === "read" || event.toolName === "write" || event.toolName === "edit") {
			const filePath = event.input.path as string;
			if (filePath && isProtected(filePath)) {
				ctx.ui.notify(`🔒 Blocked access to protected path: ${filePath}`, "warning");
				return { block: true, reason: `Path "${filePath}" is protected` };
			}
		}

		// ── bash tool: check command for protected path references ──
		if (event.toolName === "bash") {
			const command = event.input.command as string;
			if (command) {
				const matchedPath = checkCommandForProtectedPaths(command);
				if (matchedPath) {
					ctx.ui.notify(`🔒 Blocked command referencing protected path: ${matchedPath}`, "warning");
					return { block: true, reason: `Command references protected path: ${matchedPath}` };
				}
			}
		}

		return undefined;
	});
}
