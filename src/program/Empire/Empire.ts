import { Process, ProcessCode } from "kernel/Process";
import { ProgramOwnedRoom } from "program/OwnedRoom/OwnedRoom";

export interface ProgramEmpireData extends ProcessData {
  ownedRoomPids: Record<string, number>;
}

export class ProgramEmpire extends Process<ProgramEmpireData> {
  public static type = "empire";

  public static bootstrap() {
    if (Memory.empirePid) {
      return;
    }

    const empireProcess = ProgramEmpire.new();
    Memory.empirePid = Process.launchProcess(empireProcess);
  }

  public static new() {
    return Process.newProgram<ProgramEmpireData>(ProgramEmpire.type, "empire", {
      // No room, it covers all rooms.
      roomName: "",
      ownedRoomPids: {}
    });
  }

  public constructor(pid: number) {
    super(pid);
    this.ownedRooms(true);
  }

  public execute(): ProcessCode {
    return ProcessCode.SUCCESS;
  }

  private ownedRooms(force?: boolean) {
    // No need to do this very often
    if (!force && Game.time % 100 !== 0) {
      return;
    }

    Object.values(Game.rooms).forEach(room => {
      if (this.data.ownedRoomPids[room.name]) return;

      if (!room.spawns.find(s => s.my)) {
        // We don't have a spawn in the room, so ignore it.
        return;
      }

      // Start the room up in a process
      const ownedRoomProcess = ProgramOwnedRoom.new(room.name);
      this.data.ownedRoomPids[room.name] = this.launchChildProcess(ownedRoomProcess);
    });
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramEmpire.type, ProgramEmpire);
