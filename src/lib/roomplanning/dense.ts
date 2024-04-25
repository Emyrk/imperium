import { RANGES } from "lib/constants/creep";
import { coordDistance, equalCoords } from "lib/utils/distance";

export interface ValidDenseLayout {
  // Center is where the spawn should spawn the managing creep.
  center: Coord;
  // Where to place the spawn. This is important for the spawnOut.
  spawnCoord: Coord;
  // Coord where the spawn should spawn non-managing creeps.
  spawnOut: Coord;
  storageCoord: Coord;
  freeTiles: Coord[];
}

// layoutDense finds a 3x3 open area near the controller. The center can
// upgrade the controller.
export function layoutDense(room: Room, terrain: RoomTerrain = room.getTerrain()): ValidDenseLayout | Error {
  const squares = layoutCenter(room);
  if (!squares) {
    // TODO: try again somewhere else?
    return new Error("No center found");
  }

  if (!squares.center) {
    throw new Error("Center is undefined");
  }

  const center = squares.center;

  if (room.sources.length === 0) {
    return new Error("No sources found");
  }

  const source = room.sources[0];
  const path = PathFinder.search(
    new RoomPosition(center.x, center.y, room.name),
    [{ pos: source.pos, range: RANGES.HARVEST }],
    {
      roomCallback: roomName => {
        if (roomName !== room.name) {
          return false;
        }

        const cm = new PathFinder.CostMatrix();
        // The square should be avoided to prefer walking out.
        for (let x = center.x - 1; x <= center.x + 1; x++) {
          for (let y = center.y - 1; y <= center.y + 1; y++) {
            cm.set(x, y, 50);
          }
        }
        return cm;
      }
    }
  );

  let trail = path.path;
  if (trail.length === 0) {
    return new Error("No path found from center to sources");
  }
  if (path.path[0].x === center.x && path.path[0].y === center.y) {
    trail = path.path.slice(1);
  }

  // Ring omitted the reserved squares.
  const spawnCoord = trail[0];
  const spawnOut = trail[1];
  let ring = squares.ring.filter(coord => !(equalCoords(coord, spawnCoord) || equalCoords(coord, spawnOut)));

  let storageCoord: Coord | undefined = ring.find(coord => {
    return coordDistance(coord, spawnOut) === 1;
  });
  if (!storageCoord) {
    return new Error("No storage coord found");
  }

  return {
    center: center,
    spawnCoord: spawnCoord,
    spawnOut: spawnOut,
    storageCoord: storageCoord,
    freeTiles: ring.filter(coord => !equalCoords(coord, storageCoord!))
  };
}

interface layoutRing {
  ring: Coord[];
  center: Coord;
}

// Will find an open 3x3 area that can still upgrade the controller.
export function layoutCenter(room: Room, terrain: RoomTerrain = room.getTerrain()): layoutRing | undefined {
  // Minimal layout for a village is to surround the controller with:
  //  - Spawn
  //  - Tower
  //  - Storage
  //  - Link
  //  - Terminal

  // Find a 3x3 box of open space to place the creep surrounded by
  // buildings.
  const controller = room.controller!;
  // Check the ring around the controller.
  // Start at the top left.
  let candidates = candidateRing({ x: controller.pos.x, y: controller.pos.y }, 3);

  let ring = [];
  let index = 0;
  CandidateLoop: for (index; index < candidates.length; index++) {
    ring = [];
    // Find a candidate that will work.
    const coord = candidates[index];
    // Check the box
    for (let x = coord.x - 1; x <= coord.x + 1; x++) {
      for (let y = coord.y - 1; y <= coord.y + 1; y++) {
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
          continue CandidateLoop;
        }
        // Exclude the center
        if (!(x === coord.x && y === coord.y)) {
          ring.push({ x: x, y: y });
        }
      }
    }

    // This candidate has an open 3x3!
    break CandidateLoop;
  }

  // return the coord of the candidate that passed.
  if (index < candidates.length) {
    return {
      ring: ring,
      center: candidates[index]
    };
  }

  return undefined;
}

export function candidateRing(coord: Coord, distance: number): Coord[] {
  // Start is top left. Go right until you hit the wall
  const start = { x: coord.x - distance, y: coord.y - distance };
  let current = start;
  const list = [start];
  // Top row
  for (let i = 0; i < distance * 2; i++) {
    current = { x: current.x + 1, y: current.y };
    list.push(current);
  }
  // Right wall
  for (let i = 0; i < distance * 2; i++) {
    current = { x: current.x, y: current.y + 1 };
    list.push(current);
  }
  // Bottom row
  for (let i = 0; i < distance * 2; i++) {
    current = { x: current.x - 1, y: current.y };
    list.push(current);
  }
  // Left wall
  for (let i = 0; i < distance * 2 - 1; i++) {
    current = { x: current.x, y: current.y - 1 };
    list.push(current);
  }

  return list;
}
