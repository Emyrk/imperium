import { Civis } from "civis/Civis";
import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskTransferData extends TaskData {
  resourceType: ResourceConstant;
  amount?: number;
}

export class TaskTransfer extends Task<TaskTransferData, AnyStoreStructure | Creep> {
  public static type = "transfer";

  public static new(
    target: AnyStoreStructure,
    resourceType: ResourceConstant = RESOURCE_ENERGY,
    amount: number | undefined = undefined,
    range: number = RANGES.TRANSFER,
    opts: MoveOptsProto = {}
  ): ProtoTask<TaskTransferData> {
    return Task.newTask<TaskTransferData>(
      TaskTransfer.type,
      target,
      {
        resourceType: resourceType,
        amount: amount
      },
      {
        targetRange: range,
        moveOptions: opts
      }
    );
  }

  isValid(): boolean {
    return (
      this.target !== null &&
      this.creep.store.getUsedCapacity(this.data.resourceType) > 0 &&
      (this.target.store.getFreeCapacity(this.data.resourceType) || 0) > 0
    );
  }

  work(): TaskCode {
    if (this.target === null) {
      return TaskCode.INVALID;
    }
    const ret = this.creep.transfer(this.target, this.data.resourceType, this.data.amount);
    if (ret !== OK && Game.time % 5 === 0) {
      log.error(`${this.creep.name} transfer error: ${ret}`);
    }
    return TaskCode.WORKING;
  }

  describe(): string {
    if (!this.target) {
      return "trnsfr";
    }
    return `trnsfr->${this.target.ref.slice(-4)}`;
  }
}

Tasks.register(TaskTransfer.type, TaskTransfer);
