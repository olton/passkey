import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: true,
    outDir: "dist/prod",
    emptyOutDir: true,
    lib: {
      entry: resolve(rootDir, "src/index.ts"),
      name: "PasskeySdk",
      formats: ["es", "cjs"],
      fileName: (format) => `passkey.${format}.js`,
    },
    rollupOptions: {
      treeshake: true,
    },
  },
});
