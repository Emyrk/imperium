import { CalcCreepBody } from "civis/creep";
import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { CivisProgram, CivisProgramData } from "program/SpawnControl/CivisProgram";
import { TaskTake } from "task/actions/take";
import ControlFlowLoop from "task/controlflows/Loop/Loop";
import { TaskRenew } from "task/instances/renew";
import { TaskTransfer } from "task/instances/transfer";

export interface ProgramHaulSpecificData extends CivisProgramData {
  spawnPid: number;
  from: string;
  to: string;
}

// ProgramHaulSpecific is used to move resources from 1 spot in a room to another.
// The program will self terminate when it is done.
@profile
export class ProgramHaulSpecific extends CivisProgram<ProgramHaulSpecificData> {
  public static type = "haul-specific";

  public static new(roomName: string, spawnPid: number, from: string, to: Structure) {
    return CivisProgram.newCivisProgram<ProgramHaulSpecificData>(
      ProgramHaulSpecific.type,
      `${roomName}_haul_specific`,
      spawnPid,
      "out",
      {
        roomName: roomName,
        spawnPid: spawnPid,
        from: from,
        to: to.id
      }
    );
  }

  private take: TaskTake;
  private task: ProtoTask<any>;
  public constructor(pid: number) {
    super(pid);

    this.take = new TaskTake(this.data.from, RESOURCE_ENERGY);

    this.task = ControlFlowLoop.new([
      // Pickup
      this.take.new(),
      // Transfer.
      TaskTransfer.new(deref(this.data.to)! as AnyStoreStructure, RESOURCE_ENERGY),
      // TODO: REMOVE THIS
      TaskRenew.new(deref("6627df0c52f469c81240d9c2") as StructureSpawn)
    ]);
  }

  private room(): Room {
    return Game.rooms[this.data.roomName];
  }

  public execute(): ProcessCode {
    // TODO: REMOVE THIS
    Game.rooms["E12S53"].observer!.observeRoom("E12S55");

    if (!this.take.isValid()) {
      log.info(`Hauling from ${this.data.from} is empty, job complete!`);
      return ProcessCode.TERMINATE;
    }

    const to = deref(this.data.to)! as AnyStoreStructure;
    if (to.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) {
      log.info(`Hauling to ${this.data.to} is full. Terminating.`);
      return ProcessCode.TERMINATE;
    }

    if (this.total() < 2) {
      this.requestCreep(CalcCreepBody(this.room().energyCapacityAvailable, ProgramHaulSpecific.creepBodies), {
        role: "spec-hauler",
        task: this.task
      });
      return ProcessCode.SUCCESS;
    }

    super.execute();
    return ProcessCode.SUCCESS;
  }

  public selfTerminate(): ProcessCode {
    this.civis.forEach(creep => {
      creep.suicide();
    });

    super.selfTerminate();
    return ProcessCode.SUCCESS;
  }

  private static creepBodies: BodyPartConstant[][] = [
    [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY], // 300
    [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY], // 600
    [
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY,
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY,
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY
    ], // 900
    [
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY,
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY,
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY,
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY,
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY,
      MOVE,
      MOVE,
      MOVE,
      CARRY,
      CARRY,
      CARRY
    ] // 1800
  ];
}

Process.register(ProgramHaulSpecific.type, ProgramHaulSpecific);
