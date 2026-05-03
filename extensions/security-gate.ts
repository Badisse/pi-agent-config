/**
 * Security Gate Extension
 *
 * Protects against destructive, suspicious, and sensitive commands.
 *
 * Hard-blocked (always denied, no prompt):
 *   - Recursive delete (rm -r, rm -rf, --recursive)
 *   - sudo
 *   - chmod/chown 777
 *   - git push --force
 *   - git reset --hard
 *
 * Prompted (select menu, user decides):
 *   - Disguised destructive (cp /dev/null, truncate, dd)
 *   - Download & execute (curl/wget | sh)
 *   - Package installs (npm install, pip install, brew install)
 *   - Outbound network with data upload/mutating methods (curl/wget -d/-X POST/etc., nc)
 *   - System modifications (launchctl, defaults write, crontab, xattr)
 *   - Git push to main/master (strong warning)
 *
 * Auto-allowed:
 *   - Everything else (ls, cat, grep, git status, etc.)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ── Hard-blocked (no prompt, always denied) ───────────────────
const HARDBLOCKED: { pattern: RegExp; reason: string }[] = [
	{ pattern: /\brm\s+-[a-zA-Z]*r|--recursive/i, reason: "Recursive delete is blocked" },
	{ pattern: /\bsudo\b/i, reason: "sudo is blocked" },
	{ pattern: /\b(chmod|chown)\b.*\b777\b/i, reason: "Permission 777 is blocked" },
	{ pattern: /\bgit\s+push\b.*--force/i, reason: "Force push is blocked" },
	{ pattern: /\bgit\s+reset\s+--hard/i, reason: "Hard reset is blocked" },
];

// ── Prompted (user must approve via select menu) ──────────────
const PROMPTED: { pattern: RegExp; label: string }[] = [
	// Disguised destructive
	{ pattern: /\bcp\s+\/dev\/null\b/i, label: "⚠️ Destructive: overwrite with null" },
	{ pattern: /\btruncate\b/i, label: "⚠️ Destructive: truncate file" },
	{ pattern: /\bdd\s+/i, label: "⚠️ Destructive: dd command" },
	// Download & execute
	{ pattern: /\b(curl|wget)\b.*(\|\s*(ba)?sh|&&\s*(ba)?sh)/i, label: "⚠️ Download & execute" },
	// Package installs
	{ pattern: /\b(npm|yarn|pnpm)\s+(install|i|add)\b/i, label: "📦 Package install" },
	{ pattern: /\bpip\s+install\b/i, label: "📦 Package install" },
	{ pattern: /\bbrew\s+install\b/i, label: "📦 Package install" },
	// Outbound network — only block curl/wget with data upload or method flags
	{ pattern: /\b(curl|wget)\b.*\b(-[A-Z]*d|-d|--data|--data-raw|--data-binary|-F|--form|-X\s*(POST|PUT|PATCH|DELETE))\b/i, label: "🌐 Network request (data upload / mutating)" },
	{ pattern: /\bnc\b\s+(-[a-zA-Z]*\s+)*\S+\s+\d+/i, label: "🌐 Network connection (nc)" },
	// System modifications
	{ pattern: /\blaunchctl\b/i, label: "🔧 System modification" },
	{ pattern: /\bdefaults\s+write\b/i, label: "🔧 System modification" },
	{ pattern: /\bcrontab\b/i, label: "🔧 System modification" },
	{ pattern: /\bxattr\b/i, label: "🔧 System modification" },
];

// ── Git push to main (strong warning, can override) ───────────
const GIT_PUSH_MAIN = /\bgit\s+push\b.*\b(main|master)\b/i;

function truncate(text: string, maxLen: number): string {
	return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.notify("🔒 Security gate active", "info");
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;

		const command = event.input.command as string;
		if (!command) return undefined;

		// 1. Hard-blocked — always deny
		for (const { pattern, reason } of HARDBLOCKED) {
			if (pattern.test(command)) {
				ctx.ui.notify(`🚫 ${reason}: ${truncate(command, 80)}`, "error");
				return { block: true, reason: `${reason}: ${command}` };
			}
		}

		// 2. Git push to main — strong warning
		if (GIT_PUSH_MAIN.test(command)) {
			if (!ctx.hasUI) {
				return { block: true, reason: "Push to main/master blocked (no UI)" };
			}
			const choice = await ctx.ui.select(
				`🚨 PUSHING TO MAIN/MASTER BRANCH!\n\n  ${truncate(command, 200)}\n\nThis is usually not recommended.`,
				["No, block it", "Yes, I know what I'm doing"],
			);
			if (choice !== "Yes, I know what I'm doing") {
				ctx.ui.notify("🚫 Push to main blocked", "warning");
				return { block: true, reason: "Push to main blocked by user" };
			}
			return undefined;
		}

		// 3. Prompted categories — user decides
		for (const { pattern, label } of PROMPTED) {
			if (pattern.test(command)) {
				if (!ctx.hasUI) {
					return { block: true, reason: `${label} (no UI for confirmation)` };
				}
				const choice = await ctx.ui.select(
					`${label}:\n\n  ${truncate(command, 200)}\n\nAllow execution?`,
					["Yes, run it", "No, block it"],
				);
				if (choice !== "Yes, run it") {
					ctx.ui.notify(`🚫 Blocked: ${truncate(command, 60)}`, "warning");
					return { block: true, reason: `Blocked by user: ${command}` };
				}
				return undefined;
			}
		}

		// 4. All other commands — auto-allowed
		return undefined;
	});
}
