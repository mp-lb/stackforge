import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      zod: fileURLToPath(
        new URL("./node_modules/zod/index.js", import.meta.url),
      ),
      yaml: fileURLToPath(
        new URL("./node_modules/yaml/dist/index.js", import.meta.url),
      ),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
