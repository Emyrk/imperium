import { log } from "lib/log/log";
import { expect, test } from "vitest";
import { Rooms } from "../test/fakes/Rooms";
import { callback } from "lodash";

// Verify the test environment has some guarantees for the global state in place
test("Test Environment is set up correctly", () => {
  // @ts-ignore
  expect(Game.creeps).toBeDefined();
  log.info("Test Environment is set up correctly");
});

test("Pathfinder Works", () => {
  const room = Rooms.E11S53();
  const terrain = room.getTerrain();
  const path = PathFinder.search(new RoomPosition(9, 26, room.name), new RoomPosition(38, 25, room.name));

  expect(path).toBeDefined();
  path.path.forEach(pos => {
    expect(pos.roomName).toBe(room.name);
    const terrainType = terrain.get(pos.x, pos.y);
    expect(terrainType).not.toBe(TERRAIN_MASK_WALL);
  });

  expect(JSON.stringify(path.path)).toMatchSnapshot();
  // console.log(Rooms.visualize(room, Rooms.pathCallback(path)));
});
