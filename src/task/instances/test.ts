import { Tasks } from "task/Tasks";
import { Task, TaskCode } from "../Task";
import { Civis } from "civis/Civis";

export interface TaskTestData extends TaskData {
  isValid?: () => boolean;
  work?: () => TaskCode;
  finally?: () => Error | undefined;
}

export class TaskTest extends Task<TaskTestData, null> {
  public static type = "test";

  public static new(civis: Civis, funcs: Omit<TaskTestData, keyof TaskData>): Task<TaskTestData, null> {
    const proto = Task.newTask<TaskTestData>(TaskTest.type, undefined, {
      ...funcs
    });
    const instance = new TaskTest(civis, proto);
    return instance;
  }

  constructor(civis: Civis, data: ProtoTask<TaskTestData>) {
    // @ts-ignore
    super(civis, data);
  }

  work(): TaskCode {
    if (this.data.work) {
      return this.data.work();
    }
    return TaskCode.WORKING;
  }
  isValid(): boolean {
    if (this.data.isValid) {
      return this.data.isValid();
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
