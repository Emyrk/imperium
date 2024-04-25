import { BuildingPlans } from "lib/roomplanning/Planner";
import { candidateRing, layoutDense } from "lib/roomplanning/dense";

export type RoomPlans = BuildingPlans & { center: Coord };

export function layoutDensePlans(room: Room): RoomPlans | undefined {
  const layout = layoutDense(room);
  if (layout instanceof Error) {
    return undefined;
  }

  // plans for the entire room are decided right now.
  const plans = {
    center: layout.center,
    buildings: {
      // [STRUCTURE_ROAD]: [{ pos: layout.center }],
      [STRUCTURE_SPAWN]: [{ pos: layout.spawnCoord }],
      [STRUCTURE_STORAGE]: [{ pos: layout.storageCoord, rcl: 4 }],
      [STRUCTURE_LINK]: [{ pos: layout.freeTiles[1], rcl: 6 }],
      [STRUCTURE_TERMINAL]: [{ pos: layout.freeTiles[2], rcl: 6 }],
      [STRUCTURE_NUKER]: [{ pos: layout.freeTiles[3], rcl: 8 }],
      [STRUCTURE_FACTORY]: [{ pos: layout.freeTiles[4], rcl: 7 }],
      [STRUCTURE_TOWER]: [{ pos: layout.freeTiles[5], rcl: 3 }],
      [STRUCTURE_POWER_SPAWN]: [{ pos: layout.freeTiles[6], rcl: 8, power: true }]
    }
  } as RoomPlans;

  // TODO: Put this back in?
  // const terrain = room.getTerrain();
  // Now lets add roads around the spawn.
  // candidateRing(layout.center, 4).forEach(coord => {
  //   if (terrain.get(coord.x, coord.y) === TERRAIN_MASK_WALL) {
  //     return;
  //   }
  //   plans.buildings[STRUCTURE_ROAD] = [{ pos: coord }];
  // });

  return plans;
}
