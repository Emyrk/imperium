import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "emyrk-screeps-cartographer": path.resolve(__dirname, "./test/fakes/emyrk-screeps-cartographer.ts") //"../test/fakes/emyrk-screeps-cartographer.ts"
    },
    // ...
    root: "src",
    globals: true,
    env: {
      // Try to load the nix one, then the default, then noop
      LD_LIBRARY_PATH: process.env.NIX_LD_LIBRARY_PATH || process.env.LD_LIBRARY_PATH || ""
    },

    setupFiles: ["../test/setups/setup_game.ts"],
    environmentMatchGlobs: [
      ["**/*.spec.ts", "../test/environments/vitest-environment-minimal.ts"],
      ["**/*.test.ts", "../test/environments/vitest-environment-fake.ts"]
    ],
    includeSource: ["**/*.{js,ts}"]
  },
  define: {
    "import.meta.vitest": "undefined"
  }
});
