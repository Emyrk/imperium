import { MoveOpts, moveTo } from "emyrk-screeps-cartographer";
import { log } from "lib/log/log";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export enum CivisRunCode {
  Spawning = "spawning",
  Alive = "alive",
  Dead = "dead"
}

export class Civis {
  public name: string;
  private creep: Creep; // The creep that this wrapper class will control
  private _cachedTask: Task<TaskData, any> | null = null;

  constructor(creep: Creep) {
    this.creep = creep;
    this.name = creep.name;
  }

  private refresh(): void {
    this.creep = Game.creeps[this.creep.name];
  }

  get task(): Task<TaskData, any> | null {
    if (!this.creep.memory.task) {
      return null;
    }

    if (this._cachedTask) {
      return this._cachedTask;
    }

    return Tasks.initialize(this, this.creep.memory.task);
  }

  assignTask(task: Task<TaskData, any> | ProtoTask<TaskData> | null, from?: string): void {
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

  run(): CivisRunCode {
    this.refresh();

    if (!this.creep) {
      // This creep has died
      this.task?.finally();
      return CivisRunCode.Dead;
    }

    if (this.creep.spawning) {
      return CivisRunCode.Spawning;
    }

    if (!this.task) {
      this.creep.say("idle");
      return CivisRunCode.Alive;
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

    return CivisRunCode.Alive;
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

  // Pass through ---------------------------------------------------------------------------------------------------
  get pos(): RoomPosition {
    return this.creep.pos;
  }
  get store(): StoreDefinition {
    return this.creep.store;
  }

  // Actions
  harvest(source: Source | Mineral) {
    return this.creep.harvest(source);
  }

  pickup(resource: Resource) {
    return this.creep.pickup(resource);
  }

  repair(target: Structure) {
    return this.creep.repair(target);
  }

  reserveController(controller: StructureController) {
    return this.creep.reserveController(controller);
  }

  signController(target: StructureController, text: string) {
    return this.creep.signController(target, text);
  }

  upgradeController(controller: StructureController) {
    return this.creep.upgradeController(controller);
  }

  suicide() {
    return this.creep.suicide();
  }

  transfer(target: Creep | Civis | Structure, resourceType: ResourceConstant = RESOURCE_ENERGY, amount?: number) {
    let result: ScreepsReturnCode;
    if (target instanceof Civis) {
      result = this.creep.transfer(target.creep, resourceType, amount);
    } else {
      result = this.creep.transfer(target, resourceType, amount);
    }
    return result;
  }

  withdraw(target: Structure | Tombstone, resourceType: ResourceConstant = RESOURCE_ENERGY, amount?: number) {
    return this.creep.withdraw(target, resourceType, amount);
  }

  // Body configuration and related data -----------------------------------------------------------------------------

  getActiveBodyparts(type: BodyPartConstant): number {
    return this.creep.getActiveBodyparts(type);
  }

  /* The same as creep.getActiveBodyparts, but just counts bodyparts regardless of condition. */
  getBodyparts(partType: BodyPartConstant): number {
    return _.filter(this.creep.body, (part: BodyPartDefinition) => part.type == partType).length;
  }

  // Extra stuff -----------------------------------------------------------------------------------------------------
}
