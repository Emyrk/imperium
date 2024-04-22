import { Civis } from "civis/Civis";
import { SavedState } from "lib/SharedState/SavedState";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";

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

@profile
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
      states: [] as string[],
      data: {
        ...data,
        id: Task.nextID()
      }
    } as ProtoTask<NewTaskData>;
  }

  private static nextID(): string {
    // Unit tests fail if you do not have this check.
    // @ts-ignore
    if (global.Memory === undefined) {
      return "tsk-test";
    }

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

  public get data(): DataType {
    return this.protoTask.data;
  }

  public get states(): string[] {
    if (!this.protoTask.states) {
      return [];
    }
    return this.protoTask.states;
  }

  public get proto(): ProtoTask<DataType> {
    return this.protoTask;
  }

  public get type(): string {
    return this.protoTask.type;
  }

  updateTarget(target: RoomObject | ProtoPos | RoomPosition | undefined): void {
    this.protoTask._target = protoTarget(target);
    this.cachedTarget = null;
  }

  // If someone updates the target, we need to reset this.
  private cachedTarget: Target | null = null;
  public get target(): Target | null {
    if (this.cachedTarget) {
      return this.cachedTarget;
    }

    if (!this.protoTask._target || this.protoTask._target.id === "") {
      return null;
    }

    this.cachedTarget = deref(this.protoTask._target.id) as Target | null;
    return this.cachedTarget;
  }

  public get targetPos(): RoomPosition | null {
    if (!this.protoTask._target) {
      return null;
    }

    if (this.cachedTarget) {
      return this.cachedTarget.pos;
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

  // tracking a state will delete it on "finally()"
  public track(state: SavedState<any, any>): void {
    this.protoTask.states.push(state.id);
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
    if (targetPos && !this.creep.pos.inRangeTo(targetPos, this.options.targetRange)) {
      // Move!
      const ret = this.moveToTarget();
      if (ret !== OK && Game.time % 10 === 0) {
        log.error(`${this.creep.name} moveToTarget(${this.targetPos}) failed with ${ret}`);
      }
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

  public finally(): void {
    // Clean up associated states
    this.states.forEach(state => {
      SavedState.cleanupByID(state);
    });
  }

  abstract isValid(): boolean;
  abstract work(): TaskCode;
  // describe is purely for debugging
  abstract describe(): string;
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
