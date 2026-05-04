import process from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, loadConfigFromFile } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));
const target = (process.argv[2] ?? "prod").toLowerCase();

const configMap = {
	dev: "vite.dev.config.ts",
	prod: "vite.prod.config.ts",
};

if (!(target in configMap)) {
	console.error(`[build] Unknown target "${target}". Use "dev" or "prod".`);
	process.exitCode = 1;
} else {
	const mode = target === "dev" ? "development" : "production";
	const configPath = resolve(rootDir, configMap[target]);

	try {
		const loaded = await loadConfigFromFile({
			command: "build",
			mode,
		}, configPath);

		if (!loaded) {
			throw new Error(`Cannot load Vite config at ${configPath}.`);
		}

		console.log(`[build] Running ${target} build with ${configMap[target]}.`);
		await build(loaded.config);
		console.log("[build] Completed successfully.");
	} catch (error) {
		console.error("[build] Failed.", error);
		process.exitCode = 1;
	}
}
