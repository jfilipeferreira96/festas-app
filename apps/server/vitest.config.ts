import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: __dirname,
  test: {
    setupFiles: ["./__tests__/setup.ts"],
    // Run test files sequentially to avoid race conditions
    // (all suites share the same test database)
    fileParallelism: false,
    // Only run tests from __tests__/ directory, exclude compiled dist/
    include: ["__tests__/**/*.test.ts"],
    // Increase hook timeout to allow seedTestData to complete
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});