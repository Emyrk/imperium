import type { Environment } from "vitest";
import { builtinEnvironments } from "vitest/environments";
import setupGlobals from "../setups/constants";
import { Game as FakeGame } from "../fakes/Game";
import { RoomPosition as FakeRoomPosition } from "../fakes/RoomPosition";

export default <Environment>{
  name: "constants",
  transformMode: builtinEnvironments.node.transformMode,
  // optional - only if you support "experimental-vm" pool
  async setupVM() {
    const vm = await import("node:vm");
    const context = vm.createContext();
    return {
      getVmContext() {
        return context;
      },
      teardown() {
        // called after all tests with this env have been run
      }
    };
  },
  setup(global: any, options: Record<string, any>) {
    // custom setup
    setupGlobals(global);
    global.Game = new FakeGame();
    global.RoomPosition = FakeRoomPosition;
    global.Memory = {
      creeps: {},
      flags: {},
      rooms: {},
      spawns: {},
      pathFinderData: {}
    };

    return {
      teardown() {
        // called after all tests with this env have been run
      }
    };
  }
};
