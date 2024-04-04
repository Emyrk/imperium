import { Civis } from "civis/Civis";
import { Task } from "./Task";

type TaskConstructor<T extends TaskData> = new (creep: Civis, protoTask: ProtoTask<T>) => Task<T>;

export class Tasks {
  static tasks: {
    [type: string]: TaskConstructor<any>;
  } = {};

  static initialize<T extends TaskData>(creep: Civis, protoTask: ProtoTask<T>): Task<T> {
    const taskType = protoTask.type;
    if (taskType === "") {
      throw new Error(`Task type on ${creep.name} cannot be empty.`);
    }
    const con = Tasks.tasks[taskType];
    if (con) {
      return new con(creep, protoTask);
    } else {
      throw new Error(`Invalid task type: ${taskType}`);
    }
  }

  static register<T extends TaskData>(type: string, tClass: TaskConstructor<T>) {
    if (type === "") {
      throw new Error("Task type cannot be empty.");
    }
    Tasks.tasks[type] = tClass;
  }
}
