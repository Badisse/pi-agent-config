/**
 * Config loader — reads `.pi/git-workflow.json` from the project root
 * and merges it over the defaults.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULT_CONFIG, type GitWorkflowConfig } from "./config.js";

/**
 * Load git-workflow config for a given working directory.
 * Falls back to defaults when no config file exists.
 */
export function loadConfig(cwd: string): GitWorkflowConfig {
	const configPath = path.join(cwd, ".pi", "git-workflow.json");

	try {
		const raw = fs.readFileSync(configPath, "utf8");
		const parsed = JSON.parse(raw) as Partial<GitWorkflowConfig>;
		return { ...DEFAULT_CONFIG, ...parsed };
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}
