import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * [ForgeOS UI] Vitest configuration. Coverage thresholds enforce the
 * spec's "70%+ test coverage" requirement at the CI level, not just as
 * an aspiration.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
      include: ["components/ui/**/*.tsx"],
      exclude: ["components/ui/**/*.stories.tsx", "components/ui/**/__tests__/**"],
    },
  },
});
