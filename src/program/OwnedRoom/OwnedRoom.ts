import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { ProgramHarvestSource } from "program/HarvestSource/HarvestSource";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";
import { ProgramStaticHarvest } from "program/StaticHarvest/StaticHarvest";
import { RoomCostMatrix } from "room/RoomCostMatrix";

export interface ProgramOwnedRoomData extends ProcessData {
  spawnPid?: number;
  harvestPids: { [source: string]: number };
}

export class ProgramOwnedRoom extends Process<ProgramOwnedRoomData> {
  public static type = "owned-room";

  public constructor(pid: number) {
    super(pid);
  }

  public static new(roomName: string) {
    return Process.newProgram<ProgramOwnedRoomData>(ProgramOwnedRoom.type, roomName, {
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

    // Static mine all sources.
    this.room.sources.forEach(source => {
      if (this.data.harvestPids[source.id]) return;

      const harvestProcess = ProgramStaticHarvest.new(source, this.data.spawnPid!);
      this.data.harvestPids[source.id] = this.launchChildProcess(harvestProcess);
    });
    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramOwnedRoom.type, ProgramOwnedRoom);
