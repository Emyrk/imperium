import { layoutDense } from "lib/roomplanning/dense";
import { BuildingPlans } from "./Blueprint";

export function layoutDensePlans(room: Room): (BuildingPlans & { center: Coord }) | undefined {
  const layout = layoutDense(room);
  if (!layout) {
    return;
  }

  return {
    center: layout.center,
    buildings: {
      [STRUCTURE_ROAD]: [{ pos: layout.center }],
      [STRUCTURE_SPAWN]: [{ pos: layout.spawnCoord }],
      [STRUCTURE_STORAGE]: [{ pos: layout.storageCoord }],
      [STRUCTURE_LINK]: [{ pos: layout.freeTiles[1] }],
      [STRUCTURE_TERMINAL]: [{ pos: layout.freeTiles[2] }]
    }
  };
}
