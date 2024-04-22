import { Civis } from "civis/Civis";
import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskRepairData extends TaskData {}

@profile
export class TaskRepair extends Task<TaskRepairData, Structure> {
  public static type = "repair";

  public static new(target: Structure | ProtoPos, opts: MoveOptsProto = {}): ProtoTask<TaskRepairData> {
    return Task.newTask<TaskRepairData>(
      TaskRepair.type,
      target,
      {},
      {
        targetRange: RANGES.BUILD,
        moveOptions: opts
      }
    );
  }

  get repairTarget(): Structure | undefined {
    if (!super.target) {
      if (super.targetPos) {
        const sts = super.targetPos.lookFor(LOOK_STRUCTURES);
        if (sts.length > 0) {
          return sts[0];
        }
      }
      return undefined;
    }
    return super.target as Structure;
  }

  isValid(): boolean {
    const target = this.repairTarget;
    if (!target) {
      return false;
    }

    if (target.hits >= target.hitsMax) {
      return false;
    }

    return this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
  }

  work(): TaskCode {
    const target = this.repairTarget;
    if (!target) {
      return TaskCode.INVALID;
    }

    const ret = this.creep.repair(target);
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
