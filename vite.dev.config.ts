import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(rootDir, "demo"),
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
    minify: false,
    cssMinify: false,
    reportCompressedSize: false,
    outDir: resolve(rootDir, "dist/dev"),
    emptyOutDir: true,
    lib: {
      entry: resolve(rootDir, "src/index.ts"),
      name: "PasskeySdk",
      formats: ["es"],
      fileName: () => "passkey.es.js",
    },
  },
});
