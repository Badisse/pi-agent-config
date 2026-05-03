/**
 * Protected Paths Extension
 *
 * Silently blocks read, write, and edit access to sensitive files.
 * Also checks bash commands for references to protected directories.
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
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as path from "node:path";
import * as os from "node:os";

const homeDir = os.homedir();

// Directories — block any path inside these
const protectedDirs: string[] = [
	path.join(homeDir, ".ssh"),
	path.join(homeDir, ".gnupg"),
	path.join(homeDir, ".aws"),
];

// File basename patterns — block any file whose name matches
const protectedFilePatterns: RegExp[] = [
	/^\.env(\.|$)/i, // .env, .env.local, .env.production
	/\.key$/i, // *.key
	/\.pem$/i, // *.pem
	/\.p12$/i, // *.p12
	/^credentials/i, // credentials*, credentials.json
	/^secrets?(\.|$|-)/i, // secrets, secrets.json, secret.key
	/\.token$/i, // *.token
];

function isProtected(filePath: string): boolean {
	const resolved = path.resolve(filePath);

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

function checkCommandForProtectedPaths(command: string): string | null {
	for (const dir of protectedDirs) {
		if (command.includes(dir)) {
			return dir;
		}
	}
	// Check for ~-expanded paths
	for (const dir of protectedDirs) {
		const tildePath = dir.replace(homeDir, "~");
		if (command.includes(tildePath)) {
			return tildePath;
		}
	}
	return null;
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		// ── read, write, edit tools: check path parameter ──────
		if (event.toolName === "read" || event.toolName === "write" || event.toolName === "edit") {
			const filePath = event.input.path as string;
			if (filePath && isProtected(filePath)) {
				ctx.ui.notify(`🔒 Blocked access to protected path: ${filePath}`, "warning");
				return { block: true, reason: `Path "${filePath}" is protected` };
			}
		}

		// ── bash tool: check command for protected dir references ──
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
