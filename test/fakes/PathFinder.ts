import { CostMatrix } from "./CostMatrix";
import { RoomPosition } from "./RoomPosition";
import { AStarFinder, Grid } from "pathfinding";

export class PathFinder {
  public static CostMatrix = new CostMatrix();

  // Search is a super naive implementation of pathfinding.
  // It just goes in a straight line to the goal's x position, then the y.
  static search(
    origin: RoomPosition,
    goal:
      | RoomPosition
      | { pos: RoomPosition; range: number }
      | Array<RoomPosition | { pos: RoomPosition; range: number }>,
    opts?: PathFinderOpts
  ): PathFinderPath {
    const cm = new CostMatrix();
    let heuristicWeight = Math.min(9, Math.max(1, opts?.heuristicWeight || 1.2));
    if (Game.rooms) {
      const plains = Math.min(254, Math.max(1, opts?.plainCost || 1));
      const swamps = Math.min(254, Math.max(1, opts?.swampCost || 5));

      // Now we need the CostMatrix for the room if we can find it.
      const room = Game.rooms[origin.roomName];
      if (room && room.getTerrain) {
        const terrain = room.getTerrain();
        for (let x = 0; x < 50; x++) {
          for (let y = 0; y < 50; y++) {
            const terrainType = terrain.get(x, y);
            switch (terrainType) {
              case 0:
                cm.set(x, y, plains);
                break;
              case TERRAIN_MASK_SWAMP:
                cm.set(x, y, swamps);
                break;
              case TERRAIN_MASK_WALL:
                cm.set(x, y, Infinity);
                break;
            }
          }
        }

        // TODO: Add structures to the CostMatrix.
      }
    }

    goal = Array.isArray(goal) ? goal[0] : goal;
    const goalPos = "pos" in goal ? goal.pos : goal;

    const finder = new AStarFinder({
      diagonalMovement: 1,
      weight: heuristicWeight
    });
    finder.findPath(origin.x, origin.y, goalPos.x, goalPos.y, new Grid(cm));

    let path = [];
    while (origin.x != goalPos.x) {
      if (origin.x > goalPos.x) {
        origin.x--;
      } else {
        origin.x++;
      }
      path.push(new RoomPosition(origin.x, origin.y, origin.roomName));
    }

    while (origin.y != goalPos.y) {
      if (origin.y > goalPos.y) {
        origin.y--;
      } else {
        origin.y++;
      }
      path.push(new RoomPosition(origin.x, origin.y, origin.roomName));
    }

    return {
      // @ts-ignore
      path: path,
      ops: path.length,
      cost: 0,
      incomplete: false
    };
  }
}

function cmToGrid(cm: CostMatrix): Grid {
  const grid = new Grid(50, 50);
  for (let x = 0; x < 50; x++) {
    for (let y = 0; y < 50; y++) {
      grid.setWeightAt(x, y, cm.get(x, y));
      grid.setWalkableAt(x, y, cm.get(x, y) < Infinity);
    }
  }
  return grid;
}

interface defaultCostMatrixOpts {
  ignoreDestructibleStructures: boolean;
  ignoreCreeps: boolean;
  ignoreRoads: boolean;
}

interface obstacle {
  isPublic: boolean;
  user: string;
  type: string;
  x: number;
  y: number;
}

function defaultCostMatrix(room: Room, opts: defaultCostMatrixOpts, roomObjects: obstacle[]) {
  if (creep.room.name !== roomId) {
    // disallow movement via unknown terrain
    return false;
  }

  const costs = new CostMatrix();

  let obstacleTypes: string[] = _.clone(OBSTACLE_OBJECT_TYPES);

  if (opts.ignoreDestructibleStructures) {
    obstacleTypes = _.without(
      obstacleTypes,
      "constructedWall",
      "rampart",
      "spawn",
      "extension",
      "link",
      "storage",
      "observer",
      "tower",
      "powerBank",
      "powerSpawn",
      "lab",
      "terminal"
    );
  }
  if (opts.ignoreCreeps) {
    obstacleTypes = _.without(obstacleTypes, "creep");
  }

  _.forEach(roomObjects, function (object) {
    if (
      _.contains(obstacleTypes, object.type) ||
      (!opts.ignoreDestructibleStructures &&
        object.type == "rampart" &&
        !object.isPublic &&
        object.user != creep.owner.username) ||
      (!opts.ignoreDestructibleStructures &&
        object.type == "constructionSite" &&
        object.user == creep.owner.username &&
        _.contains(OBSTACLE_OBJECT_TYPES, object.type))
    ) {
      costs.set(object.x, object.y, Infinity);
    }

    if (object.type == "swamp" && costs.get(object.x, object.y) == 0) {
      costs.set(object.x, object.y, opts.ignoreRoads ? 5 : 10);
    }

    if (!opts.ignoreRoads && object.type == "road" && costs.get(object.x, object.y) < Infinity) {
      costs.set(object.x, object.y, 1);
    }
  });

  return costs;
}
