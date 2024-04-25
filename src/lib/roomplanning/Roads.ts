import { kruskal, Edge } from "kruskal-mst";
import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
interface Goal extends Coord {
  range: number;
}

interface POI {
  // type is purely for debugging
  type: string;
  // name must be unique
  name: string;
  goals: Goal[] | Goal;
}

export function roomPOIs(room: Room): POI[] {
  const pois: POI[] = [];
  // Add sources
  room.sources.forEach(source => {
    pois.push({
      goals: { x: source.pos.x, y: source.pos.y, range: RANGES.HARVEST },
      type: "source",
      name: source.id
    });
  });

  // Add the controller
  pois.push({
    goals: { x: room.controller!.pos.x, y: room.controller!.pos.y, range: RANGES.UPGRADE },
    type: "controller",
    name: room.controller!.id
  });

  // Add any minerals
  room.minerals.forEach(mineral => {
    pois.push({
      goals: { x: mineral.pos.x, y: mineral.pos.y, range: RANGES.HARVEST },
      type: "mineral",
      name: mineral.id
    });
  });

  // Add Exits
  const terrain = room.getTerrain();
  for (let i = 0; i < 50; i++) {
    const top: Goal[] = [];
    if (terrain.get(i, 0) !== TERRAIN_MASK_WALL) {
      // Top exit
      // y: 50
      top.push({ x: i, y: 1, range: 0 });
    }
    if (top.length > 0) {
      const name = `top-exit`;
      pois.push({ name: name, type: name, goals: top });
    }

    const bottom: Goal[] = [];
    if (terrain.get(i, 49) !== TERRAIN_MASK_WALL) {
      // Bottom exit
      // y = 49
      bottom.push({ x: i, y: 48, range: 1 });
    }
    if (bottom.length > 0) {
      const name = `bottom-exit`;
      pois.push({ name: name, type: name, goals: bottom });
    }

    const left: Goal[] = [];
    if (terrain.get(0, i) !== TERRAIN_MASK_WALL) {
      // Left exit
      // x = 0
      left.push({ x: 1, y: i, range: 1 });
    }
    if (left.length > 0) {
      const name = `left-exit`;
      pois.push({ name: name, type: name, goals: left });
    }

    const right: Goal[] = [];
    if (terrain.get(49, i) !== TERRAIN_MASK_WALL) {
      // Right exit
      // x = 49
      right.push({ x: 48, y: i, range: 1 });
    }
    if (right.length > 0) {
      const name = `right-exit`;
      pois.push({ name: name, type: name, goals: right });
    }
  }

  // Add custom manual POIs that optimize a room
  manualPOIs(room, pois);
  return pois;
}

// optimizePlanRoads has some fixed manual decisions
export function manualPOIs(room: Room, pois: POI[]): void {
  switch (room.name) {
    case "E12S53":
      pois.push({
        type: "crossroads",
        name: "center-x",
        goals: { x: 15, y: 24, range: 0 }
      });
    // pois.push({
    //   type: "crossroads",
    //   name: "center-min",
    //   goals: { x: 16, y: 17, range: 0 }
    // });
    // pois.push({
    //   type: "crossroads",
    //   name: "center-min-2",
    //   goals: { x: 19, y: 23, range: 0 }
    // });
  }
}

export interface RoadDesign {
  roads: RoomPosition[];
  cost: number;
}

// Optionally add a cost matrix to avoid certain tiles.
// Uses: https://en.wikipedia.org/wiki/Kruskal%27s_algorithm
// TODO: Build a graph such that the controller exists to all nodes.
//    Then build a minimum spanning tree from controller -> all nodes, see if they are faster.
export function planRoads(room: Room, pois: POI[]): RoadDesign {
  const cachedPaths: { [from: string]: { [to: string]: PathFinderPath } } = {};
  const terrain = room.getTerrain();
  // Docs: https://www.npmjs.com/package/kruskal-mst
  const edges = pois
    .map<(Edge<string> | undefined)[]>(poi => {
      cachedPaths[poi.name] = {};

      // Make an edge from this coord to all other coords.
      return pois.map<Edge<string> | undefined>(other => {
        if (poi.name === other.name) {
          return undefined;
        }

        PathFinder.search(new RoomPosition(28, 19, "E12S53"), new RoomPosition(0, 18, "E12S53"), {
          // @ts-ignore
          roomCallback: (roomName: string) => {
            if (roomName !== room.name) {
              return false;
            }
            return {
              set: (x: number, y: number, value: number) => {},
              get: (x: number, y: number) => {
                return Game.rooms[roomName].getTerrain().get(x, y);
              }
            };
          }
        });

        // TODO: how to handle this?? Just choosing the first for now.
        // Example to test in console:
        //  PathFinder.search(new RoomPosition(28, 19, "E12S53"), new RoomPosition(0, 18, "E12S53"))
        // With callback
        // PathFinder.search(new RoomPosition(28, 19, "E12S53"), new RoomPosition(0, 18, "E12S53"), {
        //   roomCallback: (roomName) => {
        //       return {
        //           set: (x, y, value) => {},
        //           get: (x, y) => {
        //               return Game.rooms[roomName].getTerrain().get(x, y);
        //           }
        //       };
        //   }
        // })
        const first = firstGoal(poi.goals);
        const path = PathFinder.search(
          new RoomPosition(first.x, first.y, room.name),
          normalizeGoals(room.name, other.goals),
          {
            // @ts-ignore
            roomCallback: (roomName: string) => {
              if (roomName !== room.name) {
                return false;
              }
              return {
                set: (x: number, y: number, value: number) => {},
                get: (x: number, y: number): number => {
                  const terr = terrain.get(x, y);
                  // You cannot build on edges
                  if (terr === 0 && (x === 0 || x === 49 || y === 0 || y === 49)) {
                    return 255;
                  }
                  return terr;
                }
              };
            }
          }
        );

        // 255 is added because the first tile is a wall. This is because sources/minerals/etc are
        // on walls.
        if (terrain.get(first.x, first.y) === TERRAIN_MASK_WALL) {
          path.cost -= 255;
          // And the first step is free
          path.cost -= 1;
          path.path.shift();
        }

        cachedPaths[poi.name][other.name] = path;
        if (path.path.length === 0) {
          log.warning(
            `[${room.name}] No path from '${poi.type}:${poi.name}' to '${other.type}:${other.name}' when planning roads`
          );
          return undefined;
        }

        return { from: poi.name, to: other.name, weight: path.cost };
      });
    })
    .flat()
    .filter(edge => edge !== undefined) as Edge<string>[];

  const spanningTree = kruskal(edges);

  // Now get the paths again, and build some roads.
  const roads: RoomPosition[] = [];
  let cost = 0;
  spanningTree.forEach(edge => {
    const path = cachedPaths[edge.from][edge.to];
    roads.push(...path.path);
    cost += path.cost;
  });

  return {
    roads: roads,
    cost: cost
  };
}

function firstGoal(goal: Goal[] | Goal): Goal {
  return Array.isArray(goal) ? goal[0] : goal;
}

function normalizeGoals(roomName: string, goals: Goal[] | Goal): { pos: RoomPosition; range: number }[] {
  const arr = Array.isArray(goals) ? goals : [goals];
  return arr.map(goal => {
    return {
      pos: new RoomPosition(goal.x, goal.y, roomName),
      range: goal.range
    };
  });
}
