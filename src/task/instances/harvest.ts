import { RANGES } from "lib/constants/creep";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskHarvestData extends TaskData {}

export class TaskHarvest extends Task<TaskHarvestData, Source> {
  public static type = "harvest";

  public static new(
    target: Source,
    range: number = RANGES.HARVEST,
    opts: MoveOptsProto = {}
  ): ProtoTask<TaskHarvestData> {
    return Task.newTask<TaskHarvestData>(
      TaskHarvest.type,
      target,
      {},
      {
        targetRange: range,
        moveOptions: opts
      }
    );
  }

  isValid(): boolean {
    return this.target !== null && this.creep.store.getFreeCapacity() <= 0;
  }

  work(): TaskCode {
    if (this.target === null) {
      return TaskCode.INVALID;
    }
    this.creep.harvest(this.target);
    return TaskCode.DONE_WORKING;
  }

  describe(): string {
    if (!this.target) {
      return "hrvst";
    }
    return `hrvst->${this.target.ref.slice(-4)}`;
  }
}

Tasks.register(TaskHarvest.type, TaskHarvest);
