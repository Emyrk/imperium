import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { ProgramHarvestSource } from "program/HarvestSource/HarvestSource";
import { ProgramHeapRoomLogistics } from "program/HeapRoomLogistics/HeapRoomLogistics";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";
import { ProgramStaticHarvest } from "program/StaticHarvest/StaticHarvest";
import { ProgramTowerDefense } from "program/TowerDefense/TowerDefense";
import { RoomCostMatrix } from "room/RoomCostMatrix";

export interface ProgramOwnedRoomData extends ProcessData {
  spawnPid?: number;
  towersPid?: number;
  harvestPids: { [source: string]: number };
  logisticsPid?: number;
}

export class ProgramOwnedRoom extends Process<ProgramOwnedRoomData> {
  public static type = "owned-room";

  public constructor(pid: number) {
    super(pid);
    this.room.memory.ownedRoomPid = pid;
  }

  static getByRoom(roomName: string): ProgramOwnedRoom | undefined {
    const pid = Memory.rooms[roomName].ownedRoomPid;
    if (!pid) {
      return undefined;
    }
    return Process.get(pid) as ProgramOwnedRoom;
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

    if (!this.data.towersPid) {
      this.data.towersPid = this.launchChildProcess(ProgramTowerDefense.new(this.data.roomName));
    }

    if (!this.data.logisticsPid) {
      this.data.logisticsPid = this.launchChildProcess(
        ProgramHeapRoomLogistics.new(this.data.roomName, this.data.spawnPid)
      );
    }

    // Static mine all sources.
    this.room.sources.forEach(source => {
      if (this.data.harvestPids[source.id]) return;

      const harvestProcess = ProgramStaticHarvest.new(source, this.data.spawnPid!);
      this.data.harvestPids[source.id] = this.launchChildProcess(harvestProcess);
    });
    return ProcessCode.SUCCESS;
  }

  public heapLogistics(): ProgramHeapRoomLogistics | undefined {
    if (!this.data.logisticsPid) {
      return undefined;
    }
    return Process.get(this.data.logisticsPid) as ProgramHeapRoomLogistics;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramOwnedRoom.type, ProgramOwnedRoom);
