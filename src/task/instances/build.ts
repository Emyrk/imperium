import { Civis } from "civis/Civis";
import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskBuildData extends TaskData {}

export class TaskBuild extends Task<TaskBuildData, ConstructionSite> {
  public static type = "build";

  public static new(
    target: ConstructionSite,
    range: number = RANGES.BUILD,
    opts: MoveOptsProto = {}
  ): ProtoTask<TaskBuildData> {
    return Task.newTask<TaskBuildData>(
      TaskBuild.type,
      target,
      {},
      {
        targetRange: range,
        moveOptions: opts
      }
    );
  }

  isValid(): boolean {
    return (
      this.target !== null && this.creep.store.getFreeCapacity() > 0 && this.target.progress < this.target.progressTotal
    );
  }

  work(): TaskCode {
    if (this.target === null) {
      return TaskCode.INVALID;
    }
    const ret = this.creep.build(this.target);
    if (ret !== OK && Game.time % 5 === 0) {
      log.error(`${this.creep.name} build error: ${ret}`);
    }
    return TaskCode.WORKING;
  }

  describe(): string {
    if (!this.target) {
      return "build";
    }
    return `build->${this.target.ref.slice(-4)}`;
  }
}

Tasks.register(TaskBuild.type, TaskBuild);
