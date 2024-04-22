import { Process, ProcessCode } from "kernel/Process";
import { CivisProgram, CivisProgramData } from "program/SpawnControl/CivisProgram";
import ControlFlowLoop from "task/controlflows/Loop/Loop";
import { TaskHarvest } from "task/instances/harvest";
import { TaskTransfer } from "task/instances/transfer";

export interface ProgramHarvestSourceData extends CivisProgramData {
  sourceID: string;
  spawningCreep?: string;
  spawnPid: number;
  mgrPid?: number;
}

export class ProgramHarvestSource extends CivisProgram<ProgramHarvestSourceData> {
  public static type = "harvest-source";

  public static new(source: Source, spawnPid: number) {
    return CivisProgram.newCivisProgram<ProgramHarvestSourceData>(
      ProgramHarvestSource.type,
      `${source.pos.roomName}_harvest_${source.id.substring(-4)}`,
      spawnPid,
      "har",
      {
        roomName: source.room.name,
        sourceID: source.id,
        spawnPid: spawnPid
      }
    );
  }

  private get source(): Source | null {
    return deref(this.data.sourceID) as Source | null;
  }

  public execute(): ProcessCode {
    if (!this.source) {
      // Developer error?  Or source disappeared which seems improbable.
      return ProcessCode.ERROR;
    }

    if (this.total() < 1) {
      this.requestCreep([WORK, MOVE, CARRY], {
        role: "harvest",
        task: ControlFlowLoop.new([TaskHarvest.new(this.source!), TaskTransfer.new(Game.spawns["Spawn1"])])
      });
    }

    super.execute();
    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    super.selfTerminate();
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramHarvestSource.type, ProgramHarvestSource);
