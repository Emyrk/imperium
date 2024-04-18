import { Civis } from "civis/Civis";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface ControlFlowEphemeralData extends TaskData {}

// ControlFlowEphemeral allows building ephemeral tasks that do not persist through global resets.
export class ControlFlowEphemeral extends Task<ControlFlowEphemeralData, null> {
  public static type = "ephemeral";
  private inner?: Task<any, any>;

  public static new(task: Task<any, any>): ProtoTask<ControlFlowEphemeralData> {
    return Task.newTask<ControlFlowEphemeralData>(ControlFlowEphemeral.type, undefined, {});
  }

  //   public static instance(task: ProtoTask<any>): ControlFlowEphemeral {
  //     return new ControlFlowEphemeral(task.civis, ControlFlowEphemeral.new(task));
  //   }

  public constructor(civis: Civis, protoTask: ProtoTask<ControlFlowEphemeralData>) {
    super(civis, protoTask);
    // Always going to be invalid if we get here.
  }

  isValid(): boolean {
    return this.inner !== undefined;
  }

  work(): TaskCode {
    if (this.inner === undefined) {
      return TaskCode.DONE_WORKING;
    }
    return this.inner.work();
  }

  describe(): string {
    if (this.inner) {
      return "eph::" + this.inner.describe();
    }
    return "eph::invalid";
  }
}

Tasks.register(ControlFlowEphemeral.type, ControlFlowEphemeral);
