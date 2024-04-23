import { Civis } from "civis/Civis";
import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskInvalidData extends TaskData {}

@profile
export class TaskInvalid extends Task<TaskInvalidData, null> {
  public static type = "invalid";

  public static new(): ProtoTask<TaskInvalidData> {
    return Task.newTask<TaskInvalidData>(
      TaskInvalid.type,
      undefined,
      {},
      {
        targetRange: 0,
        moveOptions: {}
      }
    );
  }

  isValid(): boolean {
    return false;
  }

  work(): TaskCode {
    return TaskCode.INVALID;
  }

  describe(): string {
    return "invalid";
  }
}

Tasks.register(TaskInvalid.type, TaskInvalid);
