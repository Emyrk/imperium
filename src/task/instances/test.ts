import { Tasks } from "task/Tasks";
import { Task, TaskCode } from "../Task";
import { Civis } from "civis/Civis";

export interface TaskTestData extends TaskData {
  // these should always work
  constantWorkCode?: TaskCode;
  constantIsValid?: boolean;

  // hooks only work if instanced
  isValid?: () => boolean;
  work?: () => TaskCode;
  finally?: () => Error | undefined;
}

export class TaskTest extends Task<TaskTestData, null> {
  public static type = "test";

  public static new(civis: Civis, opts: Omit<TaskTestData, keyof TaskData>): Task<TaskTestData, null> {
    const proto = Task.newTask<TaskTestData>(TaskTest.type, undefined, {
      ...opts
    });
    const instance = new TaskTest(civis, proto);
    return instance;
  }

  public static newProto(opts: Omit<TaskTestData, keyof TaskData>): ProtoTask<TaskTestData> {
    return Task.newTask<TaskTestData>(TaskTest.type, undefined, {
      ...opts
    });
  }

  constructor(civis: Civis, data: ProtoTask<TaskTestData>) {
    // @ts-ignore
    super(civis, data);
  }

  work(): TaskCode {
    if (this.data.work) {
      return this.data.work();
    }

    if (this.data.constantWorkCode) {
      return this.data.constantWorkCode;
    }

    return TaskCode.WORKING;
  }
  isValid(): boolean {
    if (this.data.isValid) {
      return this.data.isValid();
    }

    if (this.data.constantIsValid !== undefined) {
      return this.data.constantIsValid;
    }
    return true;
  }
  finally(): void {
    if (this.data.finally) {
      this.data.finally();
      return;
    }
    super.finally();
  }
  describe(): string {
    return "test-task";
  }
}

Tasks.register(TaskTest.type, TaskTest);
