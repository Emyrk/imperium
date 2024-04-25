import { MockRoom } from "test-utils/mocks/room";
import { RoomTerrains } from "./RoomTerrain";
import { MockController } from "test-utils/mocks/controller";
import { RoomPosition as FakeRoomPosition } from "./RoomPosition";
import { MockSource } from "test-utils/mocks/source";
import { MockMineral } from "test-utils/mocks/mineral";
import { BuildingPlans } from "lib/roomplanning/Planner";
import { expect } from "vitest";
import { GenerateID } from "test-utils/helpers";
export interface RoomOpts {
  level: number;
  power: false;
}

interface RoomConstants {
  controllerPos: Coord;
  sources: Coord[];
  minerals: { pos: Coord; type: ResourceConstant }[];
}

interface RenderData {
  terrain: RenderTerrain[];
  Samples: Sample[];
}

// Sample is just 1 tick of the game.
interface Sample {
  objects: SampleStructure[];
  gameTime: number;
}

interface RenderTerrain {
  room: string;
  x: number;
  y: number;
  type: string;
}

interface SampleStructure {
  _id: string;
  type: string;
  room: string;
  // Optional?
  name?: string;
  hits: number;
  hitsMax: number;
  x: number;
  y: number;
}

export class Rooms {
  public static E11S53(mockFields: { [name: string]: any } = {}, opts: RoomOpts = { level: 0, power: false }): Room {
    return Rooms.room(
      "E11S53",
      RoomTerrains.E11S53(),
      {
        controllerPos: { x: 37, y: 26 },
        sources: [{ x: 39, y: 8 }],
        minerals: [{ pos: { x: 10, y: 43 }, type: RESOURCE_LEMERGIUM }]
      },
      mockFields,
      opts
    );
  }

  public static E12S53(mockFields: { [name: string]: any } = {}, opts: RoomOpts = { level: 0, power: false }): Room {
    return Rooms.room(
      "E12S53",
      RoomTerrains.E12S53(),
      {
        controllerPos: { x: 28, y: 43 },
        sources: [
          { x: 13, y: 29 },
          { x: 28, y: 19 }
        ],
        minerals: [{ pos: { x: 7, y: 12 }, type: RESOURCE_CATALYST }]
      },
      mockFields,
      opts
    );
  }

  public static E16S59(mockFields: { [name: string]: any } = {}, opts: RoomOpts = { level: 0, power: false }): Room {
    return Rooms.room(
      "E16S59",
      RoomTerrains.E16S59(),
      {
        controllerPos: { x: 26, y: 40 },
        sources: [
          { x: 7, y: 16 },
          { x: 3, y: 30 }
        ],
        minerals: [{ pos: { x: 28, y: 30 }, type: RESOURCE_LEMERGIUM }]
      },
      mockFields,
      opts
    );
  }

  private static room(
    name: string,
    terrain: RoomTerrain,
    roomData: RoomConstants,
    mockFields: { [name: string]: any },
    opts: RoomOpts
  ): Room {
    return MockRoom(name, {
      controller: MockController({
        isPowerEnabled: opts.power,
        level: opts.level,
        pos: new FakeRoomPosition(roomData.controllerPos.x, roomData.controllerPos.y, name)
      }),

      sources: roomData.sources.map(coord =>
        MockSource({
          pos: new FakeRoomPosition(coord.x, coord.y, name)
        })
      ),

      minerals: roomData.minerals.map(min =>
        MockMineral({
          pos: new FakeRoomPosition(min.pos.x, min.pos.y, name),
          type: min.type
        })
      ),

      getTerrain: () => terrain,
      ...mockFields
    });
  }

  // TODO: Use renderer to get some really nice visuals.
  public static visualize(room: Room, callback?: (x: number, y: number) => string | undefined): string {
    const terrain = room.getTerrain();
    if (!callback) {
      callback = (x: number, y: number) => undefined;
    }

    return RoomTerrains.visualize(terrain, (x: number, y: number): string | undefined => {
      const override = callback(x, y);
      if (override) {
        return override;
      }

      // TODO: Add objects.
      return undefined;
    });
  }

  public static pathCallback(
    path: PathFinderPath | Coord[],
    callback?: (x: number, y: number) => string | undefined
  ): (x: number, y: number) => string | undefined {
    if (!callback) {
      callback = (x: number, y: number) => undefined;
    }

    const positions = "path" in path ? path.path : path;

    return (x: number, y: number) => {
      const override = callback(x, y);
      if (override) {
        return override;
      }

      return positions.some(pos => pos.x === x && pos.y === y) ? "X" : undefined;
    };
  }

  // Saves to the generated directory for the renderer.
  public static Save(name: string, data: RenderData) {
    const directory = __dirname + "/../../renderer/generated";
    expect(JSON.stringify(data.terrain, null, 2)).toMatchFileSnapshot(`${directory}/${name}/terrain.json`);
    expect(JSON.stringify(data.Samples, null, 2)).toMatchFileSnapshot(`${directory}/${name}/room.json`);
  }

  public static RenderFiles(room: Room, plans: BuildingPlans): RenderData {
    const sample = {
      objects: [],
      gameTime: 1
    } as Sample;

    const renderTerrain: RenderTerrain[] = [];

    const terrain = room.getTerrain();
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        let type = "";
        switch (terrain.get(x, y)) {
          case 0:
            continue;
          case TERRAIN_MASK_WALL:
            type = "wall";
            break;
          case TERRAIN_MASK_WALL:
            type = "swamp";
            break;
          default:
            continue;
        }

        renderTerrain.push({
          room: room.name,
          type: type,
          x: x,
          y: y
        });
      }
    }

    // For each building type, add the type to the sample.
    for (const [type, buildingPlans] of Object.entries(plans.buildings)) {
      for (const plan of buildingPlans) {
        const id = GenerateID();
        sample.objects.push({
          // This should not matter
          hits: 100,
          hitsMax: 100,
          _id: id,
          room: room.name,
          type: type,
          x: plan.pos.x,
          y: plan.pos.y
        });
      }
    }

    return {
      terrain: renderTerrain,
      Samples: [sample]
    };
  }
}
