import { planRoads, roomPOIs } from "./Roads";
import { candidateRing, layoutDense } from "./dense";

export interface VillagePlans extends BuildingPlans {
  mayorPos: Coord;
}

export interface BuildingPlans {
  buildings: { [key in STRUCTURE_CONTAINER as string]: BlueprintPlan[] };
}

export interface BlueprintPlan {
  // Position of the structure
  pos: Coord;
  // What RCL >= can build it
  rcl?: number;
  // Only build if power enabled
  power?: boolean;
}

// Let's plan an entire room!
export function planRoom(room: Room): VillagePlans | Error {
  const highways = planRoads(room, roomPOIs(room));

  // Got our roads, now can we place a dense layout near the controller?
  const dense = layoutDense(room, {
    get(x: number, y: number): 0 | TERRAIN_MASK_WALL | TERRAIN_MASK_SWAMP {
      if (highways.roads.some(road => road.x === x && road.y === y)) {
        return TERRAIN_MASK_WALL;
      }

      return 0;
    }
  });
  if (dense instanceof Error) {
    return dense;
  }

  const plans = {
    buildings: {},
    mayorPos: dense.center
  } as VillagePlans;

  const terrain = room.getTerrain();

  // Add all the roads
  plans.buildings[STRUCTURE_ROAD] = highways.roads.map(pos => ({ pos }));
  // Add core buildings.
  plans.buildings[STRUCTURE_SPAWN] = [{ pos: dense.spawnCoord }];
  plans.buildings[STRUCTURE_STORAGE] = [{ pos: dense.storageCoord, rcl: 4 }];
  plans.buildings[STRUCTURE_LINK] = [{ pos: dense.freeTiles[0], rcl: 6 }];
  plans.buildings[STRUCTURE_TERMINAL] = [{ pos: dense.freeTiles[1], rcl: 6 }];
  plans.buildings[STRUCTURE_NUKER] = [{ pos: dense.freeTiles[2], rcl: 8 }];
  plans.buildings[STRUCTURE_FACTORY] = [{ pos: dense.freeTiles[3], rcl: 7 }];
  plans.buildings[STRUCTURE_TOWER] = [{ pos: dense.freeTiles[4], rcl: 3 }];
  plans.buildings[STRUCTURE_POWER_SPAWN] = [{ pos: dense.freeTiles[5], rcl: 8, power: true }];
  // Add a ring around the core structures.
  candidateRing(dense.center, 4).forEach(coord => {
    if (terrain.get(coord.x, coord.y) === TERRAIN_MASK_WALL) {
      return;
    }
    plans.buildings[STRUCTURE_ROAD].push({ pos: coord });
  });

  return plans;
}
