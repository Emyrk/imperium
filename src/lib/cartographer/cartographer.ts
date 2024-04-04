/**
 * Cartographer: provides helper methods related to Game.map. A few of these methods have been modified from BonzAI
 * codebase, although I have introduced new methods of my own over time as well.
 */
export class Cartographer {
  /**
   * Lists all rooms up to a given distance away, including roomName
   */
  static findRoomsInRange(roomName: string, depth: number): string[] {
    return _.flatten(_.values(this.recursiveRoomSearch(roomName, depth)));
  }

  /**
   * Lists all rooms up at a given distance away, including roomName
   */
  static findRoomsAtRange(roomName: string, depth: number): string[] {
    return this.recursiveRoomSearch(roomName, depth)[depth];
  }

  /**
   * Recursively enumerate all rooms from a root node using depth first search to a maximum depth
   */
  static recursiveRoomSearch(roomName: string, maxDepth: number): { [depth: number]: string[] } {
    const visitedRooms = this._recursiveRoomSearch(roomName, 0, maxDepth, {});
    const roomDepths: { [depth: number]: string[] } = {};
    for (const room in visitedRooms) {
      const depth = visitedRooms[room];
      if (!roomDepths[depth]) {
        roomDepths[depth] = [];
      }
      roomDepths[depth].push(room);
    }
    return roomDepths;
  }

  /**
   * The recursive part of recursiveRoomSearch. Yields inverted results mapping roomName to depth.
   */
  private static _recursiveRoomSearch(
    roomName: string,
    depth: number,
    maxDepth: number,
    visited: { [roomName: string]: number }
  ): { [roomName: string]: number } {
    if (visited[roomName] == undefined) {
      visited[roomName] = depth;
    } else {
      visited[roomName] = Math.min(depth, visited[roomName]);
    }
    const neighbors = _.values(Game.map.describeExits(roomName)) as string[];
    if (depth < maxDepth) {
      for (const neighbor of neighbors) {
        // Visit the neighbor if not already done or if this would be a more direct route
        if (visited[neighbor] == undefined || depth + 1 < visited[neighbor]) {
          this._recursiveRoomSearch(neighbor, depth + 1, maxDepth, visited);
        }
      }
    }
    return visited;
  }

  /**
   * Find the relative x and y offsets of two rooms
   */
  static findRoomCoordDeltas(origin: string, otherRoom: string): { x: number; y: number } {
    const originCoords = this.getRoomCoordinates(origin);
    const otherCoords = this.getRoomCoordinates(otherRoom);

    let xDelta = otherCoords.x - originCoords.x;
    if (originCoords.xDir !== otherCoords.xDir) {
      xDelta = otherCoords.x + originCoords.x + 1;
    }

    let yDelta = otherCoords.y - originCoords.y;
    if (originCoords.yDir !== otherCoords.yDir) {
      yDelta = otherCoords.y + originCoords.y + 1;
    }

    // normalize direction
    if (originCoords.xDir === "W") {
      xDelta = -xDelta;
    }
    if (originCoords.yDir === "N") {
      yDelta = -yDelta;
    }

    return { x: xDelta, y: yDelta };
  }

  /**
   * Returns the direction (not magnitude) of a room from an origin room
   */
  static findRelativeRoomDir(origin: string, otherRoom: string): DirectionConstant | 0 {
    const coordDeltas = this.findRoomCoordDeltas(origin, otherRoom);
    // noinspection JSSuspiciousNameCombination
    if (Math.abs(coordDeltas.x) == Math.abs(coordDeltas.y)) {
      if (coordDeltas.x > 0) {
        if (coordDeltas.y > 0) {
          var x: DirectionConstant;
          return TOP_RIGHT;
        } else {
          return BOTTOM_RIGHT;
        }
      } else if (coordDeltas.x < 0) {
        if (coordDeltas.y > 0) {
          return TOP_LEFT;
        } else {
          return BOTTOM_LEFT;
        }
      } else {
        return 0;
      }
    } else {
      // noinspection JSSuspiciousNameCombination
      if (Math.abs(coordDeltas.x) > Math.abs(coordDeltas.y)) {
        if (coordDeltas.x > 0) {
          return RIGHT;
        } else {
          return LEFT;
        }
      } else {
        if (coordDeltas.y > 0) {
          return TOP;
        } else {
          return BOTTOM;
        }
      }
    }
  }

  /**
   * Get the coordinates from a room name
   */
  static getRoomCoordinates(roomName: string): RoomCoord {
    const coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
    const match = coordinateRegex.exec(roomName)!;

    const xDir = match[1];
    const x = match[2];
    const yDir = match[3];
    const y = match[4];

    return {
      x: Number(x),
      y: Number(y),
      xDir: xDir,
      yDir: yDir
    };
  }

  /**
   * Get the name of a room offset from the anchor room
   */
  static findRelativeRoomName(roomName: string, xDelta: number, yDelta: number): string {
    const coords = this.getRoomCoordinates(roomName);
    let xDir = coords.xDir;
    if (xDir === "W") {
      xDelta = -xDelta;
    }
    let yDir = coords.yDir;
    if (yDir === "N") {
      yDelta = -yDelta;
    }
    let x = coords.x + xDelta;
    let y = coords.y + yDelta;
    if (x < 0) {
      x = Math.abs(x) - 1;
      xDir = this.oppositeDir(xDir);
    }
    if (y < 0) {
      // noinspection JSSuspiciousNameCombination
      y = Math.abs(y) - 1;
      yDir = this.oppositeDir(yDir);
    }

    return xDir + x + yDir + y;
  }

  /**
   * Return the opposite direction, e.g. "W" => "E"
   */
  static oppositeDir(dir: string): string {
    switch (dir) {
      case "W":
        return "E";
      case "E":
        return "W";
      case "N":
        return "S";
      case "S":
        return "N";
      default:
        return "error";
    }
  }
}
