import { CostMatrix } from "./CostMatrix";
import { RoomPosition } from "./RoomPosition";

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
    goal = Array.isArray(goal) ? goal[0] : goal;
    const goalPos = "pos" in goal ? goal.pos : goal;

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

function defaultCostMatrix(roomId: string, opts: defaultCostMatrixOpts, creep: Creep, roomObjects: obstacle[]) {
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
