import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskHarvestData extends TaskData {
  dropMining: boolean;
}

export class TaskHarvest extends Task<TaskHarvestData, Source> {
  public static type = "harvest";

  public static new(target: Source, dropMining: boolean = false, opts: MoveOptsProto = {}): ProtoTask<TaskHarvestData> {
    return Task.newTask<TaskHarvestData>(
      TaskHarvest.type,
      target,
      {
        dropMining: dropMining
      },
      {
        targetRange: RANGES.HARVEST,
        moveOptions: opts
      }
    );
  }

  isValid(): boolean {
    if (this.data.dropMining) {
      return true;
    }
    return this.target !== null && this.creep.store.getFreeCapacity() > 0;
  }

  work(): TaskCode {
    if (this.target === null) {
      return TaskCode.INVALID;
    }
    const ret = this.creep.harvest(this.target);
    if (ret !== OK && Game.time % 5 === 0) {
      log.error(`${this.creep.name} harvesting error: ${ret}`);
    }
    return TaskCode.WORKING;
  }

  describe(): string {
    if (!this.target) {
      return "hrvst";
    }
    return `hrvst->${this.target.ref.slice(-4)}`;
  }
}

Tasks.register(TaskHarvest.type, TaskHarvest);
