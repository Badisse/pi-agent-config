/**
 * Pi Docs Extension
 *
 * Generates a beautiful HTML reference page of all your pi settings:
 * current model, loaded extensions, commands, tools, and themes.
 *
 * Usage: /docs — generates and opens the page in your browser.
 *
 * The HTML file is written to a temp location and auto-deleted after 3 days.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { collectData } from "./data-collector.js";
import { generateHtml, writeTempHtml, cleanupOldDocs } from "./html-template.js";

export default function piDocsExtension(pi: ExtensionAPI): void {
	// ── Cleanup old docs on session start ───────────────────────

	pi.on("session_start", async () => {
		cleanupOldDocs();
	});

	// ── Register /docs command ──────────────────────────────────

	pi.registerCommand("docs", {
		description: "Generate and open an HTML reference of all pi settings",
		handler: async (_args, ctx) => {
			// Collect live data
			const data = collectData(pi, ctx);

			// Generate HTML
			const html = generateHtml(data);

			// Write to temp file
			const filePath = writeTempHtml(html);

			// Open in default browser
			await pi.exec("open", [filePath]);

			ctx.ui.notify(
				`Docs opened in browser (${data.extensions.length} extensions, ${data.commands.length} commands)`,
				"info",
			);
		},
	});
}
