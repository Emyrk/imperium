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
        minerals: [{ pos: { x: 10, y: 23 }, type: RESOURCE_LEMERGIUM }]
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
}
