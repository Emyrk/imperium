import { MY_USERNAME } from "config";
import { RANGES } from "lib/constants/creep";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskClaimData extends TaskData {
  targetRoomName: string;
  reserve: boolean;
}

export class TaskClaim extends Task<TaskClaimData, StructureController | null> {
  static type = "claim";
  public static new(targetRoomName: string, reserve: boolean = false): ProtoTask<TaskClaimData> {
    return Task.newTask<TaskClaimData>(
      TaskClaim.type,
      new RoomPosition(25, 25, targetRoomName),
      {
        targetRoomName,
        reserve
      },
      {
        targetRange: 23
      }
    );
  }

  get target(): StructureController | null {
    if (!super.targetPos) {
      throw new Error("No target position for Claim");
    }
    const room = Game.rooms[super.targetPos.roomName];
    if (room) {
      if (!room.controller) {
        return null;
      }
      return room.controller;
    }

    return null;
  }

  work(): TaskCode {
    const controller = this.target;
    if (!controller) {
      return TaskCode.DONE_WORKING;
    }

    // This can happen if just a room is provided at the start. We need to update the
    // target and the range.
    if (this.options.targetRange !== RANGES.TRANSFER) {
      this.updateTarget(controller);
      this.options.targetRange = RANGES.TRANSFER;
    }

    let ret;
    let verb = "attacking";
    if (this.data.reserve) {
      if (controller.reservation && controller.reservation.username !== MY_USERNAME) {
        ret = this.creep?.attackController(controller);
        verb = "attacking";
      } else {
        ret = this.creep?.reserveController(controller);
        verb = "reserving";
      }
    } else {
      ret = this.creep?.claimController(controller);
      verb = "claiming";
    }

    if (ret != OK) {
      console.log(`${this.creep?.name} error ${verb}: ${ret}`);
    }
    return TaskCode.WORKING;
  }

  isValid(): boolean {
    if (!this.creep) {
      return false;
    }
    if (this.creep?.getBodyparts(CLAIM) < 1) {
      return false;
    }

    return true;
  }

  describe(): string {
    return `claim:${this.data.targetRoomName}`;
  }
}

Tasks.register(TaskClaim.type, TaskClaim);
