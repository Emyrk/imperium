import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // ...
    root: "src",
    globals: true,
    environment: "../test/environments/vitest-environment-constants.ts",
    setupFiles: ["../test/setups/setup_game.ts"]
  }
});
