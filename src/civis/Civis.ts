import { MoveOpts, moveTo } from "emyrk-screeps-cartographer";
import { log } from "lib/log/log";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export class Civis {
  private creep: Creep; // The creep that this wrapper class will control
  private _cachedTask: Task<TaskData> | null = null;

  constructor(creep: Creep) {
    this.creep = creep;
  }

  private refresh(): void {
    this.creep = Game.creeps[this.creep.name];
  }

  get task(): Task<TaskData> | null {
    if (!this.creep.memory.task) {
      return null;
    }

    if (this._cachedTask) {
      return this._cachedTask;
    }

    return Tasks.initialize(this, this.creep.memory.task);
  }

  assignTask(task: Task<TaskData> | ProtoTask<TaskData> | null, from?: string): void {
    const existingTask = this.task;
    if (existingTask) {
      let fromMsg = "";
      if (from) {
        fromMsg = `From ${from} :: `;
      }

      existingTask.finally();
      log.debug(
        `${fromMsg}${this.creep.name} called 'finally()' on task ${existingTask.describe()}. NewTask: ${
          existingTask.type
        }`
      );
    }

    // Delete the existing task
    this._cachedTask = null;
    // Assign the new task
    if (task === null) {
      delete this.creep.memory.task;
      return;
    } else if ("creep" in task) {
      this.creep.memory.task = task.proto;
      this._cachedTask = task;
    } else {
      this.creep.memory.task = task;
    }
  }

  run(): boolean {
    this.refresh();

    if (this.creep.spawning) {
      return false;
    }

    if (!this.task) {
      this.creep.say("idle");
      return false;
    }

    const ret = this.task.run();
    this.creep.say(ret);
    switch (ret) {
      case TaskCode.INVALID:
      case TaskCode.TIMEOUT:
      case TaskCode.DONE_WORKING:
        this.task.finally();
        // this.assignTask(null, `TaskDone: ${ret}`);
        break;

      // Let the task be
      case TaskCode.WORKING:
      case TaskCode.NOTHING_DONE:
      case TaskCode.MOVING:
    }

    return true;
  }

  // Movement and location -------------------------------------------------------------------------------------------
  goTo(
    destination: RoomPosition | HasPos,
    range: number,
    options: MoveOpts = {}
  ): ERR_NO_PATH | ERR_INVALID_ARGS | ERR_NOT_FOUND | CreepMoveReturnCode {
    if ("pos" in destination) {
      destination = destination.pos;
    }
    options.visualizePathStyle = options.visualizePathStyle ?? { stroke: "#ffffff" };

    return moveTo(this.creep, { pos: destination, range: range }, options);
  }

  // Pass throughs ---------------------------------------------------------------------------------------------------
  get pos(): RoomPosition {
    return this.creep.pos;
  }

  get name(): string {
    return this.creep.name;
  }
}
