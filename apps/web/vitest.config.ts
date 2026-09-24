import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: __dirname,
  esbuild: {
    // Os testes de componente (.tsx) usam JSX; o tsconfig da app tem
    // "jsx": "preserve" (Next) - aqui transformamos para runtime automático.
    jsx: "automatic",
  },
  test: {
    setupFiles: ["./__tests__/setup.ts"],
    // Run test files sequentially to avoid race conditions
    // (all suites share the same test database)
    fileParallelism: false,
    // Only run tests from __tests__/ directory (.tsx = testes de componente jsdom)
    include: ["__tests__/**/*.test.{ts,tsx}"],
    // Increase hook timeout to allow seedTestData to complete
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
