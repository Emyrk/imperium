// const TestEnvironment = require("screeps-jest/dist/src/TestEnvironment");

import TestEnvironment from "screeps-jest";
import { RoomPosition as FakeRoomPosition } from "./fakes/RoomPosition";
import { PathFinder as FakePathFinder } from "./fakes/PathFinder";
import { CostMatrix as FakeCostMatrix } from "./fakes/CostMatrix";
import { RoomVisual as FakeRoomVisual } from "./fakes/RoomVisual";
import { Game as FakeGame } from "./fakes/Game";

class ScreepsTestEnvironment extends TestEnvironment {
  constructor(config: any, context: any) {
    super(config);
  }

  async setup() {
    await super.setup();

    this.reset();
    this.global.reset = this.reset;
    this.global.PathFinder = class PathFinder {};

    // TODO: is this correct?
    this.global.RoomPosition = FakeRoomPosition;
    this.global.CostMatrix = FakeCostMatrix;
    this.global.PathFinder = FakePathFinder;
    this.global.RoomVisual = FakeRoomVisual;
  }

  reset() {
    this.global.Memory = {
      creeps: {},
      flags: {},
      rooms: {},
      spawns: {},
      pathFinderData: {}
    };
    // @ts-ignore // Missing a lot of fields I know
    this.global.Game = new FakeGame();
  }
}

module.exports = ScreepsTestEnvironment;
