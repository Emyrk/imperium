import { Process, ProcessCode } from "kernel/Process";
import { ProgramHeapRoomLogistics } from "../HeapRoomLogistics";
import { profile } from "lib/profiler/decorator";
import { CalcCreepBody, energyCost } from "civis/creep";
import { CivisProgram, CivisProgramData } from "program/SpawnControl/CivisProgram";

export interface ProgramRoomHaulingData extends CivisProgramData {
  spawnPid: number;
  mgrPid?: number;
}

@profile
export class ProgramRoomHauling extends CivisProgram<ProgramRoomHaulingData> {
  public static type = "room-hauling";
  public static new(roomName: string, spawnPid: number) {
    return CivisProgram.newCivisProgram<ProgramRoomHaulingData>(
      ProgramRoomHauling.type,
      `${roomName}_hauling`,
      spawnPid,
      "haul",
      {
        spawnPid,
        roomName
      }
    );
  }

  constructor(pid: number) {
    super(pid);
  }

  logistics(): ProgramHeapRoomLogistics {
    if (!this.scheduled.parent) throw new Error("No parent");
    return Process.get(this.scheduled.parent)! as ProgramHeapRoomLogistics;
  }

  private room(): Room {
    return Game.rooms[this.data.roomName];
  }

  private assignCreepJobs(): void {
    // TODO: I bet we could do this with events as a callback or something...
    _.forEach(this.civis, creep => {
      // The creep is already working, ignore them
      if (creep.task) return;

      this.logistics().assignHaulJob(creep, RESOURCE_ENERGY);
    });
  }

  // maintain creeps
  private maintainCreeps() {
    // We do not need to run this every tick.
    if (Game.time % 10 !== 0) return;
    const cap = this.room().energyCapacityAvailable;

    const boot = "boot";
    // Bootstrap under 300 energy only if no one is alive
    while (this.civis.length === 0 && this.total(boot) < 1) {
      this.requestCreep(
        [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
        {
          role: boot,
          task: undefined
        },
        5,
        "boot"
      );
    }

    const haul = "haul";
    while (this.total(haul) < 1) {
      let body = [MOVE, CARRY];
      let avail = cap - energyCost(body);
      let maxBodySize = 25;
      if (this.room().sources.length === 1) {
        maxBodySize = 18;
      }

      while (avail > 100) {
        body.push(MOVE, CARRY);
        avail -= energyCost([MOVE, CARRY]);
        if (body.length > maxBodySize) break;
      }

      this.requestCreep(
        body,
        {
          role: haul,
          task: undefined
        },
        0,
        "haul"
      );
    }

    const workHaul = "work-haul";
    // TODO: I think this is too many creeps?
    let limit = this.room().sources.length + 1;
    const storage = this.room().storage;
    // This is so bad...
    if (this.room().name != "E11S53" && storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 300000) {
      limit += 1;
    }
    if (this.room().name != "E11S53" && storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 500000) {
      limit += 1;
    }
    if (this.room().name != "E11S53" && storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 800000) {
      limit += 1;
    }

    while (this.total(workHaul) < limit) {
      const body = CalcCreepBody(cap, ProgramRoomHauling.workHaulBodies);
      this.requestCreep(
        body,
        {
          role: workHaul,
          task: undefined
        },
        0,
        "work"
      );
    }
  }

  execute(): ProcessCode {
    this.logistics();
    this.maintainCreeps();
    this.assignCreepJobs();
    super.execute();
    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    super.selfTerminate();
    return ProcessCode.SUCCESS;
  }

  // TODO: improve this:
  public static workHaulBodies: BodyPartConstant[][] = [
    [WORK, CARRY, MOVE, MOVE, CARRY], // 300
    [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], // 500
    [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], // 800
    [
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      WORK,
      WORK,
      WORK,
      WORK,
      WORK,
      WORK,
      CARRY,
      CARRY,
      CARRY,
      CARRY,
      CARRY
    ],
    [
      // 1300
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      MOVE,
      WORK,
      WORK,
      WORK,
      WORK,
      WORK,
      WORK,
      WORK,
      WORK,
      CARRY,
      CARRY,
      CARRY,
      CARRY,
      CARRY
    ] // 1600
  ];
}

Process.register(ProgramRoomHauling.type, ProgramRoomHauling);
