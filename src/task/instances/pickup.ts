import { RANGES } from "lib/constants/creep";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskPickupData extends TaskData {}

export class TaskPickup extends Task<TaskPickupData, Resource> {
  static type = "pickup";
  public static new(target: Resource): ProtoTask<TaskPickupData> {
    return Task.newTask<TaskPickupData>(
      TaskPickup.type,
      target,
      {},
      {
        targetRange: RANGES.TRANSFER
      }
    );
  }

  get target(): Resource {
    return super.target as Resource;
  }

  work(): TaskCode {
    const ret = this.creep.pickup(this.target);
    return TaskCode.WORKING;
  }

  isValid(): boolean {
    if (!this.target) {
      return false;
    }

    const res = Game.getObjectById(this.target.ref as Id<Resource>);
    if (this.creep.store.getFreeCapacity(res?.resourceType) <= 0) {
      return false;
    }
    return true;
  }

  finally() {
    super.finally();
  }

  describe(): string {
    if (!this.target) {
      return `pick:target-missing`;
    }
    return `pick:${this.target.ref.slice(0, 4)}`;
  }
}

Tasks.register(TaskPickup.type, TaskPickup);
