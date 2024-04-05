import { Civis } from "civis/Civis";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface ControlFlowLoopData extends TaskData {
  tasks: ProtoTask<any>[];
  c: number;
  // alwaysValid is helpful if you expect the creep to be able to idle.
  alwaysValid: boolean;
  // startFrom allows overriding the starting point of the loop.
  // Usually it starts from where it left off, but you can change
  // the behavior to always start from the beginning for example.
  startFrom?: number;
  // once will prevent the loop from running more than once.
  once?: boolean;
  done?: boolean;
}

export type ControlFlowLoopOpts = Omit<ControlFlowLoopData, "tasks" | "c" | keyof TaskData>;

// ControlFlowLoop allows executing tasks 1 by 1 in a loop. Each tick will advance the loop
// by 1 task.
// The options allow several execution modes:
//  startFrom: Always start from the same task. This is helpful say "move here, do that".
//             You always want to "move here" first. If that is "done" already, it does the next action.
//
//  once?: Deprecated. Use ControlFlowFIFO
export default class ControlFlowLoop extends Task<ControlFlowLoopData, null> {
  public static type = "loop";
  public static defaultOpts(): ControlFlowLoopOpts {
    return {
      alwaysValid: false,
      startFrom: undefined
    };
  }

  public static new(
    tasks: (ProtoTask<any> | undefined)[],
    opts: ControlFlowLoopOpts = ControlFlowLoop.defaultOpts()
  ): ProtoTask<ControlFlowLoopData> {
    return Task.newTask<ControlFlowLoopData>(ControlFlowLoop.type, undefined, {
      ...opts,
      tasks: _.filter(tasks, t => t !== undefined) as ProtoTask<any>[],
      c: 0
    });
  }

  private tasks: Task<any, any>[];
  constructor(civi: Civis, protoTask: ProtoTask<ControlFlowLoopData>) {
    const proto = protoTask as ProtoTask<ControlFlowLoopData>;
    super(civi, proto);
    // Load all the tasks.
    this.tasks = proto.data.tasks.map(t => Tasks.initialize(civi, t));
  }

  work(): TaskCode {
    if (this.data.done) {
      return TaskCode.DONE_WORKING;
    }

    if (this.data.once && !this.data.startFrom) {
      // Start from is how we know we hit a full loop.
      this.data.startFrom = 0;
    }
    const start = this.data.startFrom === undefined ? this.data.c : this.data.startFrom;

    let i = start;
    let loopRet = TaskCode.WORKING;

    let first = true;
    TaskLoop: while (true) {
      // If we loop all the way around, we are done.
      if (i === start && !first) {
        break TaskLoop;
      }

      first = false;
      const task = this.tasks[i];
      if (!task.data.loop_execs) {
        task.data.loop_execs = 0;
      }
      // If we are on a 'once', we do not run each task more
      // than once
      if (this.data.once && task.data.loop_execs > 0) {
        loopRet = TaskCode.DONE_WORKING;
        break;
      }

      // Advance is the next task to run.
      let advance = i + 1;
      if (advance >= this.tasks.length) {
        advance = 0;
      }

      if (task.isValid()) {
        const ret = task.run();
        switch (ret) {
          case TaskCode.TIMEOUT:
            task.data.loop_execs++;
            // If anything times out, the loop should time out.
            loopRet = ret;
            break TaskLoop;
          // If the task is working, we should continue with this
          // task on the next tick
          case TaskCode.WORKING:
          case TaskCode.MOVING:
            loopRet = TaskCode.WORKING;
            break TaskLoop;
          case TaskCode.DONE_WORKING:
            task.data.loop_execs++;
            this.data.c = advance;
            break TaskLoop;
          // Run the next task in the sequence
          case TaskCode.INVALID:
          case TaskCode.NOTHING_DONE:
            task.data.loop_execs++;
            i = advance;
            this.data.c = advance;
            continue;
          default:
            throw new Error(`Unhandled in loop return code: ${ret}`);
        }
        // @ts-ignore
        throw new Error(`Loop exited switch: ${loopRet}`);
      } else {
        i = advance;
        this.data.c = advance;
        task.data.loop_execs++;
      }
    }

    return loopRet;
  }

  isValid(): boolean {
    if (this.data.done) {
      return false;
    }

    if (this.data.alwaysValid) {
      return true;
    }
    // If any is valid, the loop is valid.
    return _.any(this.tasks, t => t.isValid());
  }

  finally(): void {
    _.forEach(this.tasks, t => {
      t.finally();
    });
  }

  describe(): string {
    return `loop,n=${this.data.tasks.map(t => t.type).join(",")}`;
  }
}

Tasks.register(ControlFlowLoop.type, ControlFlowLoop);
