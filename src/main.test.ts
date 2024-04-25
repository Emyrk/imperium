import { log } from "lib/log/log";
import { describe, expect, it, test } from "vitest";
import { Rooms } from "../test/fakes/Rooms";
import { callback } from "lodash";

// Verify the test environment has some guarantees for the global state in place
test("Test Environment is set up correctly", () => {
  // @ts-ignore
  expect(Game.creeps).toBeDefined();
  log.info("Test Environment is set up correctly");
});

describe("Pathfinder Works", () => {
  const room = Rooms.E11S53();
  const terrain = room.getTerrain();

  it("left -> right", () => {
    const path = PathFinder.search(new RoomPosition(9, 26, room.name), new RoomPosition(38, 25, room.name));
    expectPath(path, room);
    expect(JSON.stringify(path.path)).toMatchSnapshot();
  });

  it("controller to source", () => {
    const path = PathFinder.search(new RoomPosition(38, 23, room.name), new RoomPosition(40, 8, room.name));
    expectPath(path, room);
    expect(JSON.stringify(path.path)).toMatchSnapshot();
  });
});

function expectPath(path: PathFinderPath, room: Room) {
  const terrain = room.getTerrain();
  expect(path.path.length).toBeGreaterThan(0);
  path.path.forEach(pos => {
    expect(pos.roomName).toBe(room.name);
    const terrainType = terrain.get(pos.x, pos.y);
    expect(terrainType).not.toBe(TERRAIN_MASK_WALL);
  });
}
