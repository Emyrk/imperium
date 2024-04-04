import { Civis } from "civis/Civis";

export enum TaskCode {
  // Return WORKING when the task needs to continue on the next tick.
  WORKING = "w",
  // Return NOTHING_DONE when the task has nothing to do. This helps tell the parent that
  // another task can run this tick.
  NOTHING_DONE = "n",
  // DONE_WORKING is returned when the task is complete and will never return WORKING again.
  DONE_WORKING = "d",
  // INVALID is returned when the task is no longer valid and should be removed.
  INVALID = "i",
  // MOVING is returned if the task cannot be performed because of distance. The task
  // will move towards the target.
  MOVING = "m",
  TIMEOUT = "t"
}

const MAX_TASKS_ID = 9999999;
export abstract class Task<DataType extends TaskData, Target extends RoomObject | null> {
  private protoTask: ProtoTask<DataType>;
  public creep: Civis;

  static newTask<NewTaskData extends TaskData>(
    type: string,
    target: RoomObject | ProtoPos | RoomPosition | undefined,
    // Data is just the fields that are not in the base
    // Task. This is so you only provide your additional data.
    data: Omit<NewTaskData, keyof TaskData>,
    options: TaskOptions = {
      targetRange: 1,
      deadlineTick: 0
    }
  ): ProtoTask<NewTaskData> {
    return {
      type: type,
      _target: protoTarget(target),
      tickIssued: Game.time,
      options: options,
      data: {
        ...data,
        id: Task.nextID()
      }
    } as ProtoTask<NewTaskData>;
  }

  private static nextID(): string {
    if (!Memory.tasks) {
      Memory.tasks = {
        currentID: 1
      };
    }

    Memory.tasks.currentID++;
    if (Memory.tasks.currentID > MAX_TASKS_ID) {
      Memory.tasks.currentID = 1;
    }
    return `tsk${Memory.tasks.currentID}`;
  }

  constructor(creep: Civis, protoTask: ProtoTask<DataType>) {
    this.creep = creep;
    this.protoTask = protoTask;
  }

  public get proto(): ProtoTask<DataType> {
    return this.protoTask;
  }

  public get type(): string {
    return this.protoTask.type;
  }

  public get target(): Target | null {
    if (!this.protoTask._target) {
      return null;
    }

    return deref(this.protoTask._target.id) as Target | null;
  }

  public get targetPos(): RoomPosition | null {
    if (!this.protoTask._target) {
      return null;
    }

    const target = this.target;
    if (target) {
      return target.pos;
    }

    return derefRoomPosition(this.protoTask._target.pos);
  }

  public get options() {
    return this.protoTask.options;
  }

  moveToTarget(range = this.options.targetRange): ReturnType<Civis["goTo"]> {
    if (!this.targetPos) {
      throw new Error("No target position to move to!");
    }

    return this.creep.goTo(this.targetPos, range, this.options.moveOptions);
  }

  run(): TaskCode {
    if (this.options.deadlineTick && Game.time > this.options.deadlineTick) {
      return TaskCode.TIMEOUT;
    }

    if (!this.isValid()) {
      return TaskCode.INVALID;
    }

    // The task should be run!
    // First check if we are in range of the target.
    const targetPos = this.targetPos;
    if (targetPos && this.creep.pos.inRangeTo(targetPos, this.options.targetRange)) {
      // Move!
      this.moveToTarget();
      return TaskCode.MOVING;
    }

    // Always have to call moveToTarget() even if in range.
    // This is to tell cartographer where we want to be.
    // Because if this creep is going to be "shoved", we want to be
    // shoved in a direction that keeps us within range.
    if (this.targetPos) {
      this.moveToTarget();
    }

    // Execute down here
    return this.work();
  }

  public finally(): void {}

  abstract isValid(): boolean;
  abstract work(): TaskCode;
  // describe is purely for debugging
  abstract describe(): void;
}

function protoTarget(tgt: RoomPosition | RoomObject | ProtoPos | undefined): ProtoTaskTarget | undefined {
  if (!tgt) {
    return undefined;
  }

  if ("pos" in tgt) {
    return {
      id: tgt.ref,
      pos: tgt.pos
    };
  }
  return {
    id: "",
    pos: {
      x: tgt.x,
      y: tgt.y,
      roomName: tgt.roomName
    }
  };
}
