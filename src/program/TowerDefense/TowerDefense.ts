import { Process, ProcessCode } from "kernel/Process";
import { profile } from "lib/profiler/decorator";

export interface ProgramTowerDefenseData extends ProcessData {}

@profile
export class ProgramTowerDefense extends Process<ProgramTowerDefenseData> {
  public static type = "tower-defense";
  public static new(roomName: string) {
    return Process.newProgram<ProgramTowerDefenseData>(ProgramTowerDefense.type, `${roomName}_towers`, {
      roomName: roomName
    });
  }

  constructor(pid: number) {
    super(pid);
  }

  room(): Room | undefined {
    return Game.rooms[this.data.roomName];
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }

  public execute(): ProcessCode {
    const room = this.room();
    if (!room) {
      return ProcessCode.ERROR;
    }

    let attacked = false;
    const attackers = room.find(FIND_HOSTILE_CREEPS);
    const notInvaders = attackers.filter(creep => !creep.isInvader);
    if (attackers.length > 0) {
      // Attack!
      room.towers.forEach(tower => {
        tower.attack(attackers[0]);
      });
      attacked = true;
    }

    if (notInvaders.length > 1) {
      this.safeMode();
    } else if (notInvaders.length == 1 && notInvaders[0].body.length > 10) {
      // Under 10 parts? Maybe the towers can defend enough
      this.safeMode();
    }

    if (!attacked) {
      const minions = room.find(FIND_MY_CREEPS, { filter: c => c.hits < c.hitsMax });
      if (minions.length > 0) {
        room.towers.forEach(tower => {
          tower.heal(minions[0]);
        });
      }
    }

    return ProcessCode.SUCCESS;
  }

  private safeMode(): void {
    const room = this.room();
    if (!room) {
      return;
    }
    room.controller?.activateSafeMode();
    if (!Memory.safeModes) {
      Memory.safeModes = {};
    }
    if (!Memory.safeModes[this.room.name]) {
      Memory.safeModes[this.room.name] = [];
    }
    Memory.safeModes[this.room.name].push(Game.time);
  }
}

Process.register(ProgramTowerDefense.type, ProgramTowerDefense);
