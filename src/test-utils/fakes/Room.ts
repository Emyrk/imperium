import { Scheduler } from "lib/micro_mind/Scheduler";
import { ProgramRoomCore } from "programs/RoomCore/RoomCore";
import { mockInstanceOf } from "screeps-jest";
import "../../lib/prototypes/Room";

export function MockRoom(roomName: string, mockFields: { [name: string]: any }): Room {
  const room = mockInstanceOf<Room>({
    name: roomName,
    ...mockFields
  });

  Memory.rooms[roomName] = {
    pid: undefined
  };
  const faked: { [name: string]: any } = {
    memory: Memory.rooms[roomName]
  };

  Object.keys(faked).forEach(key => {
    if (!mockFields[key]) {
      // @ts-ignore
      room[key] = faked[key];
    }
  });
  Game.rooms[roomName] = room;

  return room;
}

export function StartRoomCore(roomName: string): void {
  const proto = ProgramRoomCore.new(roomName);
  const pid = Scheduler.launchProcess(proto);

  Memory.rooms[roomName] = {
    pid: pid
  };
}
