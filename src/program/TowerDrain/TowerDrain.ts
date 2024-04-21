import { Process, ProcessCode } from "kernel/Process";
import { ProgramCivisManager } from "program/SpawnControl/CivisManager";
import { ProgramVillage } from "program/Village/Village";

export interface ProgramTowerDrainData extends ProcessData {
  targetRoom: string;
  spawnPid?: number;
  spawnMgrPid?: number;
}

export class ProgramTowerDrain extends Process<ProgramTowerDrainData> {
  public static type = "tower-drain";
  public static new(fromRoom: string, targetRoom: string) {
    return Process.newProgram<ProgramTowerDrainData>(ProgramTowerDrain.type, `${fromRoom}_twr_drn_${targetRoom}`, {
      roomName: fromRoom,
      targetRoom: targetRoom
    });
  }

  constructor(pid: number) {
    super(pid);
    const village = ProgramVillage.getByRoom(this.data.roomName);
    if (!village) {
      throw new Error(`No village for room ${this.data.roomName}`);
    }
    this.data.spawnPid = village.data.spawnPid;
  }

  private spawn(): ProgramCivisManager {
    if (!this.data.spawnMgrPid) {
      const proto = ProgramCivisManager.new(this.data.spawnPid!, "drain");
      const spawnMgr = this.launchChildProcess(proto);
      this.data.spawnMgrPid = spawnMgr;
    }
    return Process.get(this.data.spawnMgrPid) as ProgramCivisManager;
  }

  public execute(): ProcessCode {
    if (!this.data.spawnMgrPid) {
      const proto = ProgramCivisManager.new(this.data.spawnPid!, "drain");
      const spawnMgr = this.launchChildProcess(proto);
      this.data.spawnMgrPid = spawnMgr;
    }

    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    throw new Error("Method not implemented.");
  }
}

Process.register(ProgramTowerDrain.type, ProgramTowerDrain);
