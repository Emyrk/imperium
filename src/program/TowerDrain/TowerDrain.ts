import { Civis } from "civis/Civis";
import { Process, ProcessCode } from "kernel/Process";
import { CivisProgramData, CivisProgram } from "program/SpawnControl/CivisProgram";
import { ProgramVillage } from "program/Village/Village";
import { TaskGoto } from "task/instances/goto";
import { vi } from "vitest";

export interface ProgramTowerDrainData extends CivisProgramData {
  targetRoom: string;
  spawnPid?: number;
  spawnMgrPid?: number;

  scoutedInfo?: {
    towers: StructureTower[];
  };
}

export class ProgramTowerDrain extends CivisProgram<ProgramTowerDrainData> {
  public static type = "tower-drain";
  public static new(fromRoom: string, targetRoom: string) {
    const village = ProgramVillage.getByRoom(fromRoom);
    if (!village) {
      throw new Error(`No village for room ${fromRoom}`);
    }
    if (!village.data.spawnPid) {
      throw new Error(`No spawn pid for village ${fromRoom}`);
    }

    return CivisProgram.newCivisProgram<ProgramTowerDrainData>(
      ProgramTowerDrain.type,
      `${fromRoom}_twr_drn_${targetRoom}`,
      village.data.spawnPid,
      "drn",

      {
        roomName: fromRoom,
        targetRoom: targetRoom
      }
    );
  }

  constructor(pid: number) {
    super(pid);
    const village = ProgramVillage.getByRoom(this.data.roomName);
    if (!village) {
      throw new Error(`No village for room ${this.data.roomName}`);
    }
    this.data.spawnPid = village.data.spawnPid;
  }

  private scouted: boolean = false;
  public execute(): ProcessCode {
    // First scout the room. Get the expected damage count.
    if (!this.scouted) {
      this.checkScout();
      return ProcessCode.SUCCESS;
    }

    super.execute();
    return ProcessCode.SUCCESS;
  }

  private checkScout(): void {
    if (this.data.scoutedInfo) {
      this.scouted = true;
      return;
    }

    if (!Game.rooms[this.data.targetRoom]) {
      // We need to scout the room, or we are scouting the room
      if (this.total("scout") === 0) {
        this.requestCreep([MOVE], {
          role: "scout",
          task: TaskGoto.newToRoom(this.data.targetRoom)
        });
      }
      return;
    }

    // Save the scouted info.
    this.data.scoutedInfo = {
      towers: Game.rooms[this.data.targetRoom].find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER
      })
    };

    this.scouted = true;
  }

  selfTerminate(): ProcessCode {
    super.selfTerminate();
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramTowerDrain.type, ProgramTowerDrain);
