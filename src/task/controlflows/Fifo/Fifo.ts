import { Civis } from "civis/Civis";
import { log } from "lib/log/log";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface ControlFlowFIFOData extends TaskData {
  tasks: ProtoTask<any>[];
  visualize?: boolean;
}

// FIFO stack is first in, first out. When a task is done, it is removed from the stack.
export default class ControlFlowFIFO extends Task<ControlFlowFIFOData, any> {
  public static type = "fifo";
  public static new(tasks: (ProtoTask<any> | undefined)[], visualize?: boolean): ProtoTask<ControlFlowFIFOData> {
    return Task.newTask<ControlFlowFIFOData>(ControlFlowFIFO.type, undefined, {
      tasks: _.filter(tasks, t => t !== undefined) as ProtoTask<any>[],
      visualize
    });
  }

  private tasks: Task<any, any>[];
  constructor(civis: Civis, protoTask: ProtoTask<ControlFlowFIFOData>) {
    const proto = protoTask as ProtoTask<ControlFlowFIFOData>;
    super(civis, proto);
    // Load all the tasks.
    this.tasks = proto.data.tasks.map(t => Tasks.initialize(civis, t));
  }

  popTask(): void {
    // Pop and finally
    const task = this.tasks.shift()!;
    const err = task.finally();
    if (err !== undefined) {
      log.error(`Task ${task.describe()} finally() failed: ${err}`);
    }
    // Pop from memory
    this.data.tasks.shift()!;
  }

  currentTask(): Task<any, any> | undefined {
    if (this.tasks.length === 0) {
      return undefined;
    }
    return this.tasks[0];
  }

  work(): TaskCode {
    if (this.tasks.length === 0) {
      return TaskCode.DONE_WORKING;
    }

    while (true) {
      const task = this.currentTask();
      if (!task) {
        return TaskCode.DONE_WORKING;
      }

      if (!task.isValid()) {
        this.popTask();
        continue;
      }

      const ret = task.run();
      switch (ret) {
        // Moving or working, we continue with the current task.
        case TaskCode.MOVING:
        case TaskCode.WORKING:
          return ret;
        case TaskCode.DONE_WORKING:
        case TaskCode.INVALID:
        case TaskCode.TIMEOUT:
          this.popTask();
          // If no tasks are left, return the ret code.
          // Otherwise, return keep working, as the next task will
          // continue on the next tick
          return this.data.tasks.length === 0 ? ret : TaskCode.WORKING;
        case TaskCode.NOTHING_DONE:
          this.popTask();
          continue;
      }
    }
  }

  isValid(): boolean {
    if (this.data.tasks.length === 0) {
      return false;
    }

    while (true) {
      // Get the current task
      const task = this.currentTask();
      if (!task) {
        // No task? Not valid
        return false;
      }

      // Check if valid
      if (!task.isValid()) {
        // Throw out invalid
        this.popTask();
        continue;
      }
      return true;
    }
  }

  finally(): void {
    _.forEach(this.tasks, t => {
      t.finally();
    });
  }

  describe(): string {
    return `fifo,n=${this.data.tasks.map(t => t.type).join(",")}`;
  }
}

Tasks.register(ControlFlowFIFO.type, ControlFlowFIFO);
