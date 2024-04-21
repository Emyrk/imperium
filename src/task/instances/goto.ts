import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskGotoData extends TaskData {}

export class TaskGoto extends Task<TaskGotoData, null> {
  public static type = "goto";

  public static newToRoom(roomName: string, opts: MoveOptsProto = {}): ProtoTask<TaskData> {
    return TaskGoto.new(new RoomPosition(25, 25, roomName), 23, opts);
  }

  public static new(
    target: RoomPosition | RoomObject | ProtoPos,
    range: number = 0,
    opts: MoveOptsProto = {}
  ): ProtoTask<TaskGotoData> {
    return Task.newTask<TaskGotoData>(
      TaskGoto.type,
      target,
      {},
      {
        targetRange: range,
        moveOptions: opts
      }
    );
  }

  isValid(): boolean {
    if (!this.targetPos) {
      return false;
    }

    if (this.creep.pos.inRangeTo(this.targetPos, this.options.targetRange)) {
      return false;
    }

    return true;
  }

  work(): TaskCode {
    return TaskCode.DONE_WORKING;
  }

  describe(): string {
    if (!this.targetPos) {
      return "go";
    }
    return `go->${this.targetPos.name}`;
  }
}

Tasks.register(TaskGoto.type, TaskGoto);
