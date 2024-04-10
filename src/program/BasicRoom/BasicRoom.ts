import { Process, ProcessCode } from "kernel/Process";
import { ProgramHarvestSource } from "program/HarvestSource/HarvestSource";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";

export interface ProgramBasicRoomData extends ProcessData {
  spawnPid?: number;
  harvestPids: { [source: string]: number };
}

export class ProgramBasicRoom extends Process<ProgramBasicRoomData> {
  public static type = "Basic-room";

  public static new(roomName: string) {
    return Process.newProgram<ProgramBasicRoomData>(ProgramBasicRoom.type, roomName, {
      roomName: roomName,
      harvestPids: {}
    });
  }

  private get room(): Room {
    return Game.rooms[this.data.roomName];
  }

  public execute(): ProcessCode {
    if (!this.data.spawnPid) {
      this.data.spawnPid = this.launchChildProcess(ProgramSpawnControl.new(this.data.roomName));
    }

    this.room.sources.forEach(source => {
      if (this.data.harvestPids[source.id]) return;

      const harvestProcess = ProgramHarvestSource.new(source, this.data.spawnPid!);
      this.data.harvestPids[source.id] = this.launchChildProcess(harvestProcess);
    });
    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramBasicRoom.type, ProgramBasicRoom);
