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
 *   - Environment variable dumps (env, printenv, process.env, os.environ)
 *   - Access to sensitive env vars ($TOKEN, $SECRET, $API_KEY, etc.)
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

// ── Environment variable protection ───────────────────────────
// Commands that dump all environment variables
const ENV_DUMP_BLOCKED: { pattern: RegExp; reason: string }[] = [
	{ pattern: /(^|;|&|\|)\s*env\s*(-|\||$)/m, reason: "Environment variable dump blocked" },
	{ pattern: /(^|;|&|\|)\s*printenv\b/m, reason: "Environment variable dump blocked" },
	{ pattern: /\bexport\s+(-p|--)/, reason: "Environment export dump blocked" },
	{ pattern: /\bdeclare\s+-p\b/, reason: "Environment declare dump blocked" },
	{ pattern: /\/proc\/\w+\/environ/, reason: "Process environment file blocked" },
	{ pattern: /process\.env\b/, reason: "Node.js environment access blocked" },
	{ pattern: /os\.environ\b/, reason: "Python environment access blocked" },
];

// Sensitive env var name patterns — block access to any var matching these
const SENSITIVE_VAR_PATTERNS: RegExp[] = [
	/_TOKEN$/i,
	/_KEY$/i,
	/_SECRET$/i,
	/_PASSWORD$/i,
	/_PASSWD$/i,
	/_PASS$/i,
	/_CREDENTIALS?$/i,
	/_PRIVATE_?KEY$/i,
	/^AWS_/i,
	/^OPENAI/i,
	/^ANTHROPIC/i,
	/^GOOGLE_/i,
	/^CLOUDFLARE_/i,
	/^HEROKU_/i,
	/^DATABASE_URL/i,
	/^SECRET_/i,
	/^MYSQL_/i,
	/^PGPASSWORD/i,
	/^MONGO/i,
	/^REDIS/i,
	/^STRIPE_/i,
	/^TWILIO_/i,
	/^SLACK_/i,
	/^DISCORD_/i,
	/^SENDGRID_/i,
	/^MAILGUN_/i,
	/^GITLAB_/i,
	/^DIGITALOCEAN_/i,
	/^LINODE_/i,
	/^VULTR_/i,
];

// Explicitly allowed even if they match a sensitive pattern (needed by Ralph)
const ALLOWED_ENV_VARS = new Set([
	"RALPH_MODEL",
	"RALPH_TIMEOUT",
	"PI_OFFLINE",
]);

function isSensitiveVar(name: string): boolean {
	if (ALLOWED_ENV_VARS.has(name)) return false;
	return SENSITIVE_VAR_PATTERNS.some((p) => p.test(name));
}

function checkEnvAccess(command: string): { blocked: boolean; prompt?: string; reason?: string } {
	// 1. Block env dump commands (always hard-blocked)
	for (const { pattern, reason } of ENV_DUMP_BLOCKED) {
		if (pattern.test(command)) {
			return { blocked: true, reason };
		}
	}

	// 2. Check $VAR and ${VAR} references
	for (const match of command.matchAll(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g)) {
		if (isSensitiveVar(match[1])) {
			return { blocked: true, reason: `Access to sensitive env var blocked: ${match[1]}` };
		}
		// Non-sensitive var read — prompt user
		return { blocked: false, prompt: `🔑 Access to env var: ${match[1]}` };
	}

	// 3. Check printenv with specific var name
	for (const match of command.matchAll(/\bprintenv\s+([A-Z_][A-Z0-9_]*)/g)) {
		if (isSensitiveVar(match[1])) {
			return { blocked: true, reason: `Access to sensitive env var blocked: ${match[1]}` };
		}
		// Non-sensitive var read — prompt user
		return { blocked: false, prompt: `🔑 Access to env var: ${match[1]}` };
	}

	return { blocked: false };
}

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

		// 2. Environment variable protection
		const envCheck = checkEnvAccess(command);
		if (envCheck.blocked) {
			ctx.ui.notify(`🔒 ${envCheck.reason}: ${truncate(command, 80)}`, "error");
			return { block: true, reason: `${envCheck.reason}: ${command}` };
		}
		if (envCheck.prompt) {
			if (!ctx.hasUI) {
				return { block: true, reason: `${envCheck.prompt} (no UI for confirmation)` };
			}
			const choice = await ctx.ui.select(
				`${envCheck.prompt}:

  ${truncate(command, 200)}

Allow the model to read this env var?`,
				["Yes, allow", "No, block it"],
			);
			if (choice !== "Yes, allow") {
				ctx.ui.notify(`🔒 Blocked env var access`, "warning");
				return { block: true, reason: `Blocked by user: ${command}` };
			}
			return undefined;
		}

		// 3. Git push to main — strong warning
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

		// 4. Prompted categories — user decides
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

		// 5. All other commands — auto-allowed
		return undefined;
	});
}
