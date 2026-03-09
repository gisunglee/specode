import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/app/api/**/_lib/**", "src/lib/**"],
      exclude: ["src/lib/utils.ts", "src/lib/prisma.ts"],
    },
  },
});
