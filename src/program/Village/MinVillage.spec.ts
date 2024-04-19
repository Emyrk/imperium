import { describe, expect, it } from "vitest";
import { ProgramMinimalVillage, candidateRing } from "./MinVillage";
import { MockRoom } from "test-utils/mocks/room";
import { Process } from "kernel/Process";
import { MockSource } from "test-utils/mocks/source";
import { MockController } from "test-utils/mocks/controller";
import { RoomTerrain, RoomTerrains } from "../../../test/fakes/RoomTerrain";

describe("Ring", () => {
  it("distance 0", () => {
    expect(candidateRing({ x: 0, y: 0 }, 0)).toEqual([{ x: 0, y: 0 }]);
  });

  it("distance 1", () => {
    expect(candidateRing({ x: 0, y: 0 }, 1)).toEqual([
      // Top Row
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      // Right Wall
      { x: 1, y: 0 },
      // Bottom Row
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
      // Left wall
      { x: -1, y: 0 }
    ]);
  });
});

describe("CandidatePosition", () => {
  it("empty room", () => {
    const roomName = "test";
    const controller = MockController({ pos: { x: 25, y: 25, roomName: roomName } });
    const room = MockRoom(roomName, {
      getTerrain: () => new RoomTerrain(""),
      controller: controller
    });

    // Empty room should be the first candidate
    const candidate = ProgramMinimalVillage.layoutCenter(room);
    expect(candidate).toEqual({ x: controller.pos.x - 2, y: controller.pos.y - 2 });
  });

  it("no valid candidates", () => {
    const roomName = "test";
    const controller = MockController({ pos: { x: 3, y: 3, roomName: roomName } });
    const room = MockRoom(roomName, {
      getTerrain: () => RoomTerrains.E11S53(),
      controller: controller
    });

    // Empty room should be the first candidate
    const candidate = ProgramMinimalVillage.layoutCenter(room);
    expect(candidate).toEqual(undefined);
  });

  // Shard 3 1 source room.
  it("E11S53", () => {
    const roomName = "test";
    const controller = MockController({ pos: { x: 37, y: 26, roomName: roomName } });
    const room = MockRoom(roomName, {
      getTerrain: () => RoomTerrains.E11S53(),
      controller: controller
    });

    // Empty room should be the first candidate
    const candidate = ProgramMinimalVillage.layoutCenter(room);
    expect(candidate).toEqual({ x: 39, y: 24 });
  });
});
