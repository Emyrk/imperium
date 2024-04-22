import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskHarvestData extends TaskData {
  dropMining: boolean;
}

@profile
export class TaskHarvest extends Task<TaskHarvestData, Source> {
  public static type = "harvest";

  public static new(
    target: Source | ProtoPos,
    dropMining: boolean = false,
    opts: MoveOptsProto = {}
  ): ProtoTask<TaskHarvestData> {
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

  get target(): Source {
    if (super.target) {
      return super.target as Source;
    }

    const src = super.targetPos?.lookFor(LOOK_SOURCES)[0];
    if (!src) {
      throw new Error("No source found at target position for harvest");
    }
    return src;
  }

  isValid(): boolean {
    if (this.data.dropMining) {
      return true;
    }
    return this.targetPos !== null && this.creep.store.getFreeCapacity() > 0;
  }

  work(): TaskCode {
    if (this.targetPos === null) {
      return TaskCode.INVALID;
    }

    if (this.target.energy === 0) {
      return TaskCode.NOTHING_DONE;
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
