import { MockRoom } from "test-utils/mocks/room";
import { RoomTerrains } from "./RoomTerrain";
import { MockController } from "test-utils/mocks/controller";
import { RoomPosition as FakeRoomPosition } from "./RoomPosition";
import { MockSource } from "test-utils/mocks/source";
import { MockMineral } from "test-utils/mocks/mineral";

export interface RoomOpts {
  level: number;
  power: false;
}

interface RoomConstants {
  controllerPos: Coord;
  sources: Coord[];
  minerals: { pos: Coord; type: ResourceConstant }[];
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
}
