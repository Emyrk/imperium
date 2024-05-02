import { CostMatrix as FakeCostMatrix } from "./CostMatrix";

export class RoomTerrains {
  // formats the public api terrain to newline seperated.
  public static format(terrain: string): string {
    var result = "";
    while (terrain.length > 0) {
      result += terrain.substring(0, 50) + "\n";
      terrain = terrain.substring(50);
    }
    return result;
  }

  // https://screeps.com/api/game/room-terrain?encoded=1&room=E11S53&shard=shard3
  public static E11S53(): RoomTerrain {
    return RoomTerrains.TerrainFrom("shard3", "E11S53");
  }

  // Main home
  public static E12S53(): RoomTerrain {
    return RoomTerrains.TerrainFrom("shard3", "E12S53");
  }

  // This one you can wall yourself off by accident.
  // https://screeps.com/a/#!/room/shard3/E12S54
  // https://screeps.com/api/game/room-terrain?encoded=1&room=E12S54&shard=shard3
  public static E11S54(): RoomTerrain {
    return RoomTerrains.TerrainFrom("shard3", "E11S54");
  }

  // Random
  // https://screeps.com/a/#!/room/shard3/E16S59
  // https://screeps.com/api/game/room-terrain?encoded=1&room=E16S59&shard=shard3
  public static E16S59(): RoomTerrain {
    return RoomTerrains.TerrainFrom("shard3", "E16S59");
  }

  public static TerrainFrom(shard: string, room: string): RoomTerrain {
    const terrainData = require(`./roomdata/${shard}-${room}/terrain.json`);
    return new FakeRoomTerrain(RoomTerrains.format(terrainData.terrain[0].terrain));
  }

  public static visualizeCharacter(terrain: number): string {
    switch (terrain) {
      case 0:
        return " ";
      case TERRAIN_MASK_WALL:
        return "#";
      case TERRAIN_MASK_SWAMP:
        return ".";
      case TERRAIN_MASK_LAVA:
        return "~";
      default:
        return "?";
    }
  }

  public static visualize(terrain: RoomTerrain, callback?: (x: number, y: number) => string | undefined): string {
    // Header X coords
    var result = "    01234567891111111111222222222233333333334444444444\n";
    result += "    ..........0123456789012345678901234567890123456789\n";
    for (let yy = 0; yy < 50; yy++) {
      // Prefix lines with their y coordinate.
      result += `${yy}:`.padEnd(4);
      for (let xx = 0; xx < 50; xx++) {
        // Callback can override the terrain
        if (callback) {
          const ch = callback(xx, yy);
          if (ch) {
            result += ch;
            continue;
          }
        }
        const ch = terrain.get(xx, yy);
        result += RoomTerrains.visualizeCharacter(ch);
      }
      result += "\n";
    }
    return result;
  }
}

// RoomTerrain just wraps the cost matrix, and expects the values to be in the mask range.
export class FakeRoomTerrain {
  private cm: FakeCostMatrix;
  // Expects a terrain string like:
  //  """
  //  .....www.....
  //  ....w..sw....
  //  ....w..sw....
  //  """
  constructor(terrain: string) {
    this.cm = new FakeCostMatrix();

    const lines = terrain.trim().split("\n");
    for (let yy = 0; yy < lines.length; yy++) {
      const line = lines[yy].trim();
      for (let xx = 0; xx < line.length; xx++) {
        const ch = line[xx];
        if (ch === "w" || ch === "1") {
          this.cm.set(xx, yy, TERRAIN_MASK_WALL);
        } else if (ch === "s" || ch === "2") {
          this.cm.set(xx, yy, TERRAIN_MASK_SWAMP);
        } else if (ch === "l" || ch === "4") {
          this.cm.set(xx, yy, TERRAIN_MASK_LAVA);
        }
      }
    }
  }

  get(xx: number, yy: number): 0 | TERRAIN_MASK_WALL | TERRAIN_MASK_SWAMP {
    return this.cm.get(xx, yy) as 0 | TERRAIN_MASK_WALL | TERRAIN_MASK_SWAMP;
  }
}
