import { describe, expect, it } from "vitest";
import { FakeRoomTerrain } from "../../test/fakes/RoomTerrain";

describe("RoomTerrain", () => {
  it("empty", () => {
    const terrain = new FakeRoomTerrain("");
    expect(terrain.get(0, 0)).toBe(0);
  });

  it("walls", () => {
    const terrain = new FakeRoomTerrain("wwwwww");
    for (let i = 0; i < 6; i++) {
      expect(terrain.get(i, 0)).toBe(TERRAIN_MASK_WALL);
    }
  });

  it("square", () => {
    const terrain = new FakeRoomTerrain(`
    ...www...
    sssw.wsss
    sssw.wsss
    ...www...
    `);
    // Rows
    const w = TERRAIN_MASK_WALL;
    const s = TERRAIN_MASK_SWAMP;
    expectRow(terrain, 0, 0, [0, 0, 0, w, w, w, 0, 0, 0]);
    expectRow(terrain, 0, 1, [s, s, s, w, 0, w, s, s, s]);
    expectRow(terrain, 0, 2, [s, s, s, w, 0, w, s, s, s]);
    expectRow(terrain, 0, 3, [0, 0, 0, TERRAIN_MASK_WALL, TERRAIN_MASK_WALL, TERRAIN_MASK_WALL, 0, 0, 0]);
  });

  // it("E11S54", () => {
  //   const terrain = RoomTerrains.E11S54();
  //   console.log(RoomTerrains.visualize(terrain));
  // });
});

function expectRow(terrain: RoomTerrain, x: number, y: number, expected: number[]) {
  for (let i = 0; i < expected.length; i++) {
    expect(terrain.get(x + i, y)).toBe(expected[i]);
  }
}
