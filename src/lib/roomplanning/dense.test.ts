import { describe, expect, it } from "vitest";
import { MockRoom } from "test-utils/mocks/room";
import { MockController } from "test-utils/mocks/controller";
import { RoomTerrain, RoomTerrains } from "../../../test/fakes/RoomTerrain";
import { candidateRing, layoutCenter, layoutDense } from "./dense";
import { sources } from "../../../dist/main.js.map";
import { MockSource } from "test-utils/mocks/source";

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
    const candidate = layoutCenter(room);
    expect(candidate?.center).toEqual({ x: controller.pos.x - 3, y: controller.pos.y - 3 });
  });

  it("no valid candidates", () => {
    const roomName = "test";
    const controller = MockController({ pos: { x: 3, y: 3, roomName: roomName } });
    const room = MockRoom(roomName, {
      getTerrain: () => RoomTerrains.E11S53(),
      controller: controller
    });

    // Empty room should be the first candidate
    const candidate = layoutCenter(room);
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
    const candidate = layoutCenter(room);
    expect(candidate?.center).toEqual({ x: 38, y: 23 });
  });

  it("E12S53", () => {
    const roomName = "test";
    const controller = MockController({
      pos: { x: 28, y: 43, roomName: roomName }
    });
    const room = MockRoom(roomName, {
      getTerrain: () => RoomTerrains.E12S53(),
      controller: controller,
      sources: [
        MockSource({ pos: { x: 29, y: 19, roomName: roomName } }),
        MockSource({ pos: { x: 13, y: 29, roomName: roomName } })
      ]
    });

    // Empty room should be the first candidate
    const candidate = layoutDense(room);
    expect(candidate?.center).toEqual({ x: 31, y: 42 });
    expect(candidate?.spawnCoord).not.toBe(candidate?.storageCoord);
  });

  it("E11S54", () => {
    const roomName = "test";
    const controller = MockController({ pos: { x: 24, y: 42, roomName: roomName } });
    const room = MockRoom(roomName, {
      getTerrain: () => RoomTerrains.E11S54(),
      controller: controller
    });

    // Empty room should be the first candidate
    const candidate = layoutCenter(room);
    expect(candidate?.center).toEqual({ x: 21, y: 42 });
  });
});
