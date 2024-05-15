import { log } from "lib/log/log";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskRenewData extends TaskData {}

export class TaskRenew extends Task<TaskRenewData, StructureSpawn> {
  static type = "renew";
  public static new(target: StructureSpawn): ProtoTask<TaskRenewData> {
    return Task.newTask<TaskRenewData>(
      TaskRenew.type,
      target,
      {},
      {
        targetRange: 1
      }
    );
  }

  get target(): StructureSpawn | null {
    if (!super.target) {
      return null;
    }
    return super.target as StructureSpawn;
  }

  work(): TaskCode {
    if (!this.target) {
      return TaskCode.DONE_WORKING;
    }

    if (!this.target.hits) {
      return TaskCode.DONE_WORKING;
    }

    const ret = this.target.renewCreep(this.creep.creep);
    if (ret !== OK) {
      log.error(`Renew failed: ${ret}`);
    }
    return TaskCode.WORKING;
  }

  isValid(): boolean {
    if (!this.target) {
      return false;
    }

    if (this.creep.ticksToLive && this.creep.ticksToLive > 1000) {
      return false;
    }

    return true;
  }

  describe(): string {
    return `renew`;
  }
}

Tasks.register(TaskRenew.type, TaskRenew);
