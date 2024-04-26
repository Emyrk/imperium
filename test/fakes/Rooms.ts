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
  minerals: { pos: Coord; mineralType: ResourceConstant }[];
}

interface RenderData {
  terrain: RenderTerrain[];
  Samples: Sample[];
}

// Sample is just 1 tick of the game.
interface Sample {
  objects: SampleStructure[];
  gameTime: number;
  users: {
    [name: string]: {
      _id: string;
      username: string;
      badge?: {
        type: number;
        color1: string;
        color2: string;
        color3: string;
        param: number;
        flip: boolean;
      };
    };
  };
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

  // Extra fields for the structure.
  [name: string]: any;
}

export class Rooms {
  public static E11S53(mockFields: { [name: string]: any } = {}, opts: RoomOpts = { level: 0, power: false }): Room {
    return Rooms.room(
      "E11S53",
      RoomTerrains.E11S53(),
      {
        controllerPos: { x: 37, y: 26 },
        sources: [{ x: 39, y: 8 }],
        minerals: [{ pos: { x: 10, y: 43 }, mineralType: RESOURCE_LEMERGIUM }]
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
        minerals: [{ pos: { x: 7, y: 12 }, mineralType: RESOURCE_CATALYST }]
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
        minerals: [{ pos: { x: 28, y: 30 }, mineralType: RESOURCE_LEMERGIUM }]
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
          mineralType: min.mineralType
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
    const user = "TestUser";
    const userID = "5a71934f7037f829c0ba0e11";
    const sample = {
      objects: [],
      gameTime: 1,
      users: {
        Invader: {
          _id: "0",
          username: "Invader"
        },
        "5a71934f7037f829c0ba0e11": {
          _id: userID,
          username: user,
          badge: {
            type: 2,
            color1: "#000000",
            color2: "#028300",
            color3: "#8b5c00",
            param: 0,
            flip: false
          }
        }
      }
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
        // const id = "GenerateID()";
        const id = "should-be-static";
        const obj = {
          // This should not matter
          hits: 100,
          hitsMax: 100,
          nextDecayTime: 100,
          _isDisabled: false,
          _id: id,
          room: room.name,
          type: type,
          x: plan.pos.x,
          y: plan.pos.y,
          notifyWhenAttacked: false,
          user: userID
        } as SampleStructure;

        switch (obj.type) {
          case STRUCTURE_FACTORY:
            obj.storeCapacity = 2000;
            obj.store = {
              energy: 500
            };
          case STRUCTURE_LINK:
            obj.cooldown = 0;
            obj.actionLog = {
              transferEnergy: null
            };
            obj.store = { energy: 200 };
            obj.storeCapacityResource = {
              energy: 800
            };
            break;
          case STRUCTURE_EXTENSION:
            obj.store = { energy: 50 };
            obj.storeCapacityResource = {
              energy: 50
            };
            break;

          case STRUCTURE_SPAWN:
            obj.store = {
              energy: 3000,
              power: 65
            };
            obj.storeCapacityResource = {
              energy: 5000,
              power: 100
            };
            obj.off = false;
            obj.spawning = null;
            break;
          case STRUCTURE_POWER_SPAWN:
            obj.store = {
              energy: 50
            };
            obj.storeCapacityResource = {
              energy: 300
            };
            break;
          case STRUCTURE_STORAGE:
            obj.store = { energy: 400000 };
            obj.storeCapacity = 1000000;
            break;
          case STRUCTURE_NUKER:
            obj.cooldownTime = 100;
            obj.store = { energy: 5000, G: 5000 };
            obj.storeCapacityResource = {
              energy: 300000,
              G: 5000
            };
            break;

          case STRUCTURE_TOWER:
            obj.actionLog = {
              attack: null,
              heal: null,
              repair: null
            };
            obj.store = { energy: 100 };
            obj.storeCapacityResource = {
              energy: 1000
            };
        }

        sample.objects.push(obj);
      }
    }

    // Now push the sources/controllers/minerals
    if ("sources" in room) {
      room.sources.forEach(source => {
        sample.objects.push({
          _id: "should-be-static",
          type: "source",
          room: room.name,
          x: source.pos.x,
          y: source.pos.y,
          energy: 1500,
          energyCapacity: 3000,
          hits: 100,
          hitsMax: 100,
          ticksToRegeneration: 300,
          nextRegenerationTime: 500
        });
      });
    }

    if ("minerals" in room) {
      room.minerals.forEach(mineral => {
        sample.objects.push({
          _id: "should-be-static",
          type: "mineral",
          room: room.name,
          x: mineral.pos.x,
          y: mineral.pos.y,
          hits: 100,
          hitsMax: 100,
          nextRegenerationTime: 300,
          mineralType: mineral.mineralType,
          mineralAmount: 30580,
          density: 3
        });
      });
    }

    if (room.controller) {
      sample.objects.push({
        _id: "should-be-static",
        type: "controller",
        room: room.name,
        x: room.controller.pos.x,
        y: room.controller.pos.y,
        energy: 1500,
        energyCapacity: 3000,
        hits: 100,
        hitsMax: 100,
        level: 8,
        progressTotal: 0,
        progress: 0,
        downgradeTime: 18700000,
        user: userID,
        sign: null
      });
    }

    // Sort so everything is consistent.
    sample.objects.sort((a, b) => {
      if (a.type === b.type) {
        const av = a.y * 100 + a.x;
        const bv = b.y * 100 + b.x;
        return av < bv ? -1 : 1;
      }
      return a.type < b.type ? -1 : 1;
    });
    return {
      terrain: renderTerrain,
      Samples: [sample]
    };
  }
}
