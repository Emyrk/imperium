import { Civis } from "civis/Civis";
import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskRepairData extends TaskData {}

export class TaskRepair extends Task<TaskRepairData, Structure> {
  public static type = "repair";

  public static new(
    target: Structure,
    range: number = RANGES.BUILD,
    opts: MoveOptsProto = {}
  ): ProtoTask<TaskRepairData> {
    return Task.newTask<TaskRepairData>(
      TaskRepair.type,
      target,
      {},
      {
        targetRange: range,
        moveOptions: opts
      }
    );
  }

  isValid(): boolean {
    return this.target !== null && this.creep.store.getFreeCapacity() > 0 && this.target.hits < this.target.hitsMax;
  }

  work(): TaskCode {
    if (this.target === null) {
      return TaskCode.INVALID;
    }
    const ret = this.creep.repair(this.target);
    if (ret !== OK && Game.time % 5 === 0) {
      log.error(`${this.creep.name} repair error: ${ret}`);
    }
    return TaskCode.WORKING;
  }

  describe(): string {
    if (!this.target) {
      return "repair";
    }
    return `repair->${this.target.ref.slice(-4)}`;
  }
}

Tasks.register(TaskRepair.type, TaskRepair);
