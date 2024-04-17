import { Process, ProcessCode } from "kernel/Process";
import { ProgramCivisManager } from "program/SpawnControl/CivisManager";
import ControlFlowLoop from "task/controlflows/Loop/Loop";
import { TaskHarvest } from "task/instances/harvest";
import { TaskTransfer } from "task/instances/transfer";

export interface ProgramHarvestSourceData extends ProcessData {
  sourceID: string;
  spawningCreep?: string;
  spawnPid: number;
  mgrPid?: number;
}

export class ProgramHarvestSource extends Process<ProgramHarvestSourceData> {
  public static type = "harvest-source";

  public static new(source: Source, spawnPid: number) {
    return Process.newProgram<ProgramHarvestSourceData>(
      ProgramHarvestSource.type,
      `${source.pos.roomName}_harvest_${source.id.substring(-4)}`,
      {
        roomName: source.room.name,
        sourceID: source.id,
        spawnPid: spawnPid
      }
    );
  }

  private get manager(): ProgramCivisManager {
    if (!this.data.mgrPid) {
      this.data.mgrPid = this.launchChildProcess(ProgramCivisManager.new(this.data.spawnPid, "har"));
    }
    return Process.get(this.data.mgrPid!) as ProgramCivisManager;
  }

  private get source(): Source | null {
    return deref(this.data.sourceID) as Source | null;
  }

  public execute(): ProcessCode {
    if (!this.source) {
      // Developer error?  Or source disappeared which seems improbable.
      return ProcessCode.ERROR;
    }
    this.manager; // Ensure we have a managing civis pid

    if (this.manager.total() < 1) {
      this.manager.requestCreep([WORK, MOVE, CARRY], {
        role: "harvest",
        task: ControlFlowLoop.new([TaskHarvest.new(this.source!), TaskTransfer.new(Game.spawns["Spawn1"])])
      });
    }

    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    throw new Error("Method not implemented.");
  }
}

Process.register(ProgramHarvestSource.type, ProgramHarvestSource);
