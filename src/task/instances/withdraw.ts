import { isStoreStructure } from "declarations/typeGuards";
import { RANGES } from "lib/constants/creep";
import { profile } from "lib/profiler/decorator";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskWithdrawData extends TaskData {
  resourceType: ResourceConstant;
  amount?: number;
}

@profile
export class TaskWithdraw extends Task<TaskWithdrawData, Structure | Tombstone> {
  static type = "withdraw";
  public static new(
    target: Structure | Tombstone,
    rt: ResourceConstant = RESOURCE_ENERGY,
    amount?: number
  ): ProtoTask<TaskWithdrawData> {
    return Task.newTask<TaskWithdrawData>(
      TaskWithdraw.type,
      target,
      {
        resourceType: rt,
        amount
      },
      {
        targetRange: RANGES.TRANSFER
      }
    );
  }

  get target(): Structure | Tombstone {
    return super.target as Structure | Tombstone;
  }

  work(): TaskCode {
    const ret = this.creep.withdraw(this.target, this.data.resourceType, this.data.amount);
    return TaskCode.DONE_WORKING;
  }

  isValid(): boolean {
    if (!this.target) {
      return false;
    }

    if (!isStoreStructure(this.target)) {
      return false;
    }

    if (this.creep!.store.getFreeCapacity(this.data.resourceType) <= 0) {
      return false;
    }

    if (this.target.store.getUsedCapacity(this.data.resourceType) <= 0) {
      return false;
    }

    return true;
  }

  describe(): string {
    return `wthd:${this.target.ref.slice(0, 4)}`;
  }
}

Tasks.register(TaskWithdraw.type, TaskWithdraw);
