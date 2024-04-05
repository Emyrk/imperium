import { Process, ProcessCode } from "kernel/Process";
import ControlFlowLoop from "task/controlflows/Loop/Loop";
import { TaskHarvest } from "task/instances/harvest";
import { TaskTransfer } from "task/instances/transfer";

export interface ProgramHarvestSourceData extends ProcessData {
  sourceID: string;
  spawningCreep?: string;
}

export class ProgramHarvestSource extends Process<ProgramHarvestSourceData> {
  public static type = "harvest-source";

  public static new(source: Source) {
    return Process.newProgram<ProgramHarvestSourceData>(
      ProgramHarvestSource.type,
      `${source.pos.roomName}_harvest_${source.id.substring(-4)}`,
      {
        roomName: source.room.name,
        sourceID: source.id
      }
    );
  }

  private get source(): Source | null {
    return deref(this.memory.data.sourceID) as Source | null;
  }

  public execute(): ProcessCode {
    if (!this.source) {
      // Developer error?  Or source disappeared which seems improbable.
      return ProcessCode.ERROR;
    }

    const name = this.source.id + "_har";

    if (this.data.spawningCreep) {
      const creep = Game.creeps[this.data.spawningCreep];
      if (!creep) {
        delete this.data.spawningCreep;
        return ProcessCode.ERROR;
      }
      this.assignCivis(creep);
      this.data.spawningCreep = undefined;
    }
    if (this.civis.length <= 0 && !this.data.spawningCreep) {
      const code = Game.spawns["Spawn1"].spawnCreep([WORK, MOVE, CARRY], name, {
        memory: {
          task: ControlFlowLoop.new([TaskHarvest.new(this.source!), TaskTransfer.new(Game.spawns["Spawn1"])])
        }
      });
      this.data.spawningCreep = name;
      if (code !== OK) {
        // TODO
        return ProcessCode.ERROR;
      }
    }
    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    throw new Error("Method not implemented.");
  }
}

Process.register(ProgramHarvestSource.type, ProgramHarvestSource);
