import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskAttackData extends TaskData {}

export class TaskAttack extends Task<TaskAttackData, Creep | Structure | null> {
  static type = "Attack";
  public static new(target: Creep | Structure): ProtoTask<TaskAttackData> {
    return Task.newTask<TaskAttackData>(
      TaskAttack.type,
      target,
      {},
      {
        targetRange: 1
      }
    );
  }

  get target(): Structure | Creep | null {
    if (!super.target) {
      return null;
    }
    return super.target as Structure | Creep;
  }

  work(): TaskCode {
    if (!this.target) {
      return TaskCode.DONE_WORKING;
    }

    if (!this.target.hits) {
      return TaskCode.DONE_WORKING;
    }

    const ret = this.creep.attack(this.target);
    return TaskCode.WORKING;
  }

  isValid(): boolean {
    if (!this.target) {
      return false;
    }

    if (this.creep!.getBodyparts(ATTACK) <= 0) {
      return false;
    }

    return true;
  }

  describe(): string {
    if (!this.target) {
      return `attack:unknown`;
    }
    return `att:${this.target.ref.slice(0, 4)}`;
  }
}

Tasks.register(TaskAttack.type, TaskAttack);
