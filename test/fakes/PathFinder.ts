import { AStarFinder, Grid } from "pathfinding";
import { CostMatrix as FakeCostMatrix } from "./CostMatrix";
import { RoomPosition as FakeRoomPosition } from "./RoomPosition";
import { FakeRoomTerrain } from "./RoomTerrain";

export class PathFinder {
  public static CostMatrix = FakeCostMatrix;

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
    let cm = new FakeCostMatrix();
    if (opts?.roomCallback) {
      const newCm = opts.roomCallback(origin.roomName);
      if (newCm instanceof Object && "get" in newCm) {
        // @ts-ignore
        cm = newCm;
      }
    }

    let heuristicWeight = Math.min(9, Math.max(1, opts?.heuristicWeight || 1.2));
    let terrain: RoomTerrain = new FakeRoomTerrain("");
    if (Game.rooms) {
      const plains = Math.min(254, Math.max(1, opts?.plainCost || 1));
      const swamps = Math.min(254, Math.max(1, opts?.swampCost || 5));

      // Now we need the CostMatrix for the room if we can find it.
      const room = Game.rooms[origin.roomName];
      if (room && room.getTerrain) {
        terrain = room.getTerrain();
      }
    }

    goal = Array.isArray(goal) ? goal : [goal];
    const paths = goal.map(goal => {
      const goalPos = "pos" in goal ? goal.pos : goal;
      const goalRange = "range" in goal ? goal.range : 0;

      // Oof, we have to test "EVERY" square in the range.
      if (goalRange > 0) {
        const paths = [];
        for (let x = goalPos.x - goalRange; x <= goalPos.x + goalRange; x++) {
          for (let y = goalPos.y - goalRange; y <= goalPos.y + goalRange; y++) {
            const goalPath = searchPath({ x: origin.x, y: origin.y }, { x: x, y: y }, cm, terrain, heuristicWeight);
            paths.push(goalPath);
          }
        }
        return bestPath(paths, cm, terrain);
      }
      return searchPath({ x: origin.x, y: origin.y }, { x: goalPos.x, y: goalPos.y }, cm, terrain, heuristicWeight);
    });

    const best = bestPath(paths, cm, terrain);

    return {
      // @ts-ignore
      path: best.map(([x, y]) => new FakeRoomPosition(x, y, origin.roomName)),
      ops: 0,
      cost: best.reduce((acc, [x, y]) => acc + cm.get(x, y), 0),
      incomplete: false
    };
  }
}

function searchPath(
  origin: Coord,
  goal: Coord,
  cm: CostMatrix,
  terrain: RoomTerrain,
  heuristicWeight: number
): number[][] {
  const grid = cmToGrid(cm, terrain);
  const finder = new AStarFinder({
    diagonalMovement: 1,
    weight: heuristicWeight
  });
  return finder.findPath(origin.x, origin.y, goal.x, goal.y, grid);
}

function bestPath(paths: number[][][], cm: FakeCostMatrix, terrain: RoomTerrain): number[][] {
  const best = paths.reduce<{ cost: number; path: number[][] }>(
    (acc, path) => {
      if (path.length === 0) {
        return acc;
      }

      const cost = path.reduce((acc, [x, y]) => {
        let cost = cm.get(x, y);
        return acc + (cost === 0 ? terrain.get(x, y) : cost);
      }, 0);
      if (cost < acc.cost) {
        return { cost, path };
      }
      return acc;
    },
    { cost: Infinity, path: [] }
  );
  return best.path;
}

function cmToGrid(cm: CostMatrix, terrain: RoomTerrain): Grid {
  const grid = new Grid(50, 50);
  for (let x = 0; x < 50; x++) {
    for (let y = 0; y < 50; y++) {
      let cost = cm.get(x, y);
      if (cost === 0) {
        cost = terrain.get(x, y);
      }

      // @ts-ignore
      grid.setWeightAt(x, y, cost);
      grid.setWalkableAt(x, y, cost < 255);
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

// function defaultCostMatrix(room: Room, opts: defaultCostMatrixOpts, roomObjects: obstacle[]) {
//   if (creep.room.name !== roomId) {
//     // disallow movement via unknown terrain
//     return false;
//   }

//   const costs = new CostMatrix();

//   let obstacleTypes: string[] = _.clone(OBSTACLE_OBJECT_TYPES);

//   if (opts.ignoreDestructibleStructures) {
//     obstacleTypes = _.without(
//       obstacleTypes,
//       "constructedWall",
//       "rampart",
//       "spawn",
//       "extension",
//       "link",
//       "storage",
//       "observer",
//       "tower",
//       "powerBank",
//       "powerSpawn",
//       "lab",
//       "terminal"
//     );
//   }
//   if (opts.ignoreCreeps) {
//     obstacleTypes = _.without(obstacleTypes, "creep");
//   }

//   _.forEach(roomObjects, function (object) {
//     if (
//       _.contains(obstacleTypes, object.type) ||
//       (!opts.ignoreDestructibleStructures &&
//         object.type == "rampart" &&
//         !object.isPublic &&
//         object.user != creep.owner.username) ||
//       (!opts.ignoreDestructibleStructures &&
//         object.type == "constructionSite" &&
//         object.user == creep.owner.username &&
//         _.contains(OBSTACLE_OBJECT_TYPES, object.type))
//     ) {
//       costs.set(object.x, object.y, Infinity);
//     }

//     if (object.type == "swamp" && costs.get(object.x, object.y) == 0) {
//       costs.set(object.x, object.y, opts.ignoreRoads ? 5 : 10);
//     }

//     if (!opts.ignoreRoads && object.type == "road" && costs.get(object.x, object.y) < Infinity) {
//       costs.set(object.x, object.y, 1);
//     }
//   });

//   return costs;
// }
