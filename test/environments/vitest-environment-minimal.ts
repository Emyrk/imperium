import type { Environment } from "vitest";
import { builtinEnvironments } from "vitest/environments";
import setupConstants from "../setups/constants";
import { vi } from "vitest";
import { RoomPosition as FakeRoomPosition } from "../fakes/RoomPosition";
import { Game as FakeGame } from "../fakes/Game";

export default <Environment>{
  name: "minimal",
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
    setupConstants(global);
    // Room Position has nothing to do with global state. It's used a lot,
    // and should be included.
    global.RoomPosition = FakeRoomPosition;
    // FakeGame is pretty much required because we use 'deref' to load from memory.
    // Objects need to be saved to game to be pulled back.
    global.Game = new FakeGame();
    global.UNIT_TESTING = true;

    return {
      teardown() {
        // called after all tests with this env have been run
      }
    };
  }
};
