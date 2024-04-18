import { RANGES } from "lib/constants/creep";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskUpgradeData extends TaskData {}

export class TaskUpgrade extends Task<TaskUpgradeData, StructureController> {
  static type = "upgrade";
  public static new(target: StructureController): ProtoTask<TaskUpgradeData> {
    return Task.newTask<TaskUpgradeData>(
      TaskUpgrade.type,
      target,
      {},
      {
        targetRange: RANGES.REPAIR
      }
    );
  }

  get target(): StructureController {
    return super.target as StructureController;
  }

  work(): TaskCode {
    const ret = this.creep.upgradeController(this.target);
    return TaskCode.WORKING;
  }

  isValid(): boolean {
    if (this.creep!.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) {
      return false;
    }
    return true;
  }

  describe(): string {
    return `upgd:${this.target.ref.slice(0, 4)}`;
  }
}

Tasks.register(TaskUpgrade.type, TaskUpgrade);
