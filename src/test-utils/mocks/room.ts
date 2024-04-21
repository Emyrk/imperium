import { mockInstanceOf } from "screeps-jest";
import { RoomTerrain } from "../../../test/fakes/RoomTerrain";

export function MockRoom(name: string, mockFields: { [name: string]: any } = {}): Room {
  const room = mockInstanceOf<Room>({
    name: name,
    ...mockFields
  });

  // Faked are faked fields vs mocked fields.
  // This will override the mocked fields.
  const faked: { [name: string]: any } = {};

  // @ts-ignore
  if (global.Memory) {
    Memory.rooms[room.name] = {};
    faked.memory = Memory.rooms[room.name];
  }

  // Add the faked fields to the room.
  Object.keys(faked).forEach(key => {
    if (!mockFields[key]) {
      // @ts-ignore
      room[key] = faked[key];
    }
  });

  // save it to the game state
  Game.rooms[room.name] = room;

  return room;
}
