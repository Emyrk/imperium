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
