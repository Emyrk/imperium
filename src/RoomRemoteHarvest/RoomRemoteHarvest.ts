import { CalcCreepBody } from "civis/creep";
import { MY_USERNAME } from "config";
import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { Visualizer } from "lib/visualizer/Visualizer";
import { CivisProgram, CivisProgramData } from "program/SpawnControl/CivisProgram";
import ControlFlowLoop from "task/controlflows/Loop/Loop";
import { TaskAttack } from "task/instances/attack";
import { TaskClaim } from "task/instances/claim";
import { TaskGoto } from "task/instances/goto";
import { TaskHarvest } from "task/instances/harvest";
import { TaskTransfer } from "task/instances/transfer";

interface TargetRoomData {
  roomName: string;
  // Estimate of last time a creep was spawned. If it was killed,
  // do not spawn it again immediately. That could be an energy drain.
  // This could be for example if someone is killing our creeps.
  lastSpawnIsh: { [role: string]: number };
  lastState: string;
}

export interface ProgramRoomRemoteHarvestData extends CivisProgramData {
  roomName: string;
  mgrPid?: number;

  harvestRooms: { [roomName: string]: TargetRoomData };
}

@profile
export class ProgramRoomRemoteHarvest extends CivisProgram<ProgramRoomRemoteHarvestData> {
  public static type = "room-remote-harvest";
  public static new(roomName: string, spawnPid: number) {
    return CivisProgram.newCivisProgram<ProgramRoomRemoteHarvestData>(
      ProgramRoomRemoteHarvest.type,
      `${roomName}_remote_harvest`,
      spawnPid,
      "rmt",
      {
        roomName,
        harvestRooms: {}
      }
    );
  }

  private room(): Room {
    return Game.rooms[this.data.roomName];
  }

  private static creepBodies: BodyPartConstant[][] = [
    [MOVE, MOVE, WORK, CARRY], // 250
    [MOVE, MOVE, MOVE, MOVE, WORK, WORK, CARRY, CARRY], // 500
    [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY] // 1k
  ];

  private flagUpdate(force: boolean): void {
    if (!force && Game.time % 50 !== 0) return;

    const harvestRooms: string[] = [];

    Object.values(Game.flags).forEach(flag => {
      if (
        flag.color === COLOR_YELLOW &&
        flag.secondaryColor === COLOR_YELLOW &&
        flag.name.startsWith(this.data.roomName)
      ) {
        harvestRooms.push(flag.pos.roomName);
      }
    });

    // Delete any rooms that we are no longer harvesting
    Object.values(this.data.harvestRooms).forEach(harvestRoom => {
      // If not in harvest rooms, delete the field.
      if (!harvestRooms.includes(harvestRoom.roomName)) {
        // TODO: Run a delete routine?
        delete this.data.harvestRooms[harvestRoom.roomName];
      }
    });

    // Add all new rooms. Just the name, the rest will be figured out.
    harvestRooms.forEach(roomName => {
      if (!this.data.harvestRooms[roomName]) {
        this.data.harvestRooms[roomName] = {
          roomName,
          lastSpawnIsh: {},
          lastState: "init"
        };
      }
    });
  }

  terminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }

  execute(): ProcessCode {
    this.flagUpdate(false);
    // TODO: Do I really need to do this every tick? Minions run on auto pilot
    // for the most part.
    Object.values(this.data.harvestRooms).forEach(harvestRoom => {
      this.executeHarvestRoom(harvestRoom.roomName);
    });

    this.visual();
    return ProcessCode.SUCCESS;
  }

  private visual(): void {
    Object.values(this.data.harvestRooms).forEach(harvestRoom => {
      const rows = Object.values(harvestRoom.lastSpawnIsh).map(last => {
        if (last) {
          return `${last} - ${Game.time - last}`;
        }
        return ``;
      });
      Visualizer.infoBox(`Remote :: ${harvestRoom.lastState}`, [], { x: 0, y: 1, roomName: harvestRoom.roomName }, 10);
    });
  }

  private executeHarvestRoom(roomName: string): void {
    const targetRoom = Game.rooms[roomName];
    const targetRoomMemory = Memory.rooms[roomName];
    if (!targetRoomMemory || !targetRoomMemory.harvestScouted) {
      if (targetRoom) {
        targetRoom.scout();
        return;
      }
      // We need to scout the room first
      this.scoutRoom(roomName);
      this.data.harvestRooms[roomName].lastState = "scouting";
      return;
    }

    if (!targetRoom) {
      // If we cannot see the room, just go and harvest it.
      // That will grant us vision.
      this.harvestRoom(roomName);
      this.data.harvestRooms[roomName].lastState = "harvesting";
      return;
    }

    // First see if there is any invaders in the room.
    const invaderCores = targetRoom.find(FIND_STRUCTURES, {
      filter: st => st.structureType === STRUCTURE_INVADER_CORE
    });

    if (invaderCores.length > 0) {
      // Spawn an attacker!
      this.attackCore(invaderCores[0] as StructureInvaderCore);
      this.data.harvestRooms[roomName].lastState = "attacking";
      return;
    }

    // If we can see the room, add some additional checks before we try to harvest.
    const controller = targetRoom.controller;
    if (!controller || controller.my || !controller.reservation || controller.reservation.username == MY_USERNAME) {
      // No controller or my controller just harvest then.
      this.harvestRoom(roomName);
      this.data.harvestRooms[roomName].lastState = "harvesting";
      return;
    }

    // If the room is reserved, we cannot harvest it.
    // Spawn a reserver
    if (controller.reservation?.username !== MY_USERNAME) {
      // Spawn a reserver
      this.reserveRoom(controller);
      this.data.harvestRooms[roomName].lastState = "reserving";

      // TODO: this code should probably be removed.
      if (!controller.reservation) {
        this.harvestRoom(roomName);
        this.data.harvestRooms[roomName].lastState = "res+har";
      }
      return;
    }
  }

  private reserveRoom(controller: StructureController): void {
    const roleName = `rsv${controller.pos.roomName}`;
    if (this.total(roleName) > 1) return;
    this.requestCreep(
      [MOVE, CLAIM],
      {
        role: roleName,
        task: ControlFlowLoop.new(
          [TaskGoto.newToRoom(controller.pos.roomName), TaskClaim.new(controller.pos.roomName, true)],
          {
            alwaysValid: true
          }
        )
      },
      -5,
      "rmt-reserve"
    );
  }

  private static attackBodies: BodyPartConstant[][] = [
    [MOVE, ATTACK], // 130
    [MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK], // 390
    [MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK] // 650
  ];

  private attackCore(core: StructureInvaderCore): void {
    const roleName = `att${core.pos.roomName}`;
    let limit = 1;
    if (this.room().energyCapacityAvailable < 500) {
      limit = 2;
    }
    if (this.total(roleName) > limit - 1) return;
    this.requestCreep(
      CalcCreepBody(this.room().energyCapacityAvailable, ProgramRoomRemoteHarvest.attackBodies),
      {
        role: roleName,
        task: ControlFlowLoop.new([TaskGoto.new(core.pos, 1), TaskAttack.new(core)], {
          alwaysValid: true
        })
      },
      -5,
      "rmt-attack"
    );
  }

  private harvestRoom(roomName: string): void {
    const roomMem = Memory.rooms[roomName];
    roomMem.sources?.forEach(source => {
      const roleName = `rmt${source.roomName}:${source.x}:${source.y}`;
      const lastSpawnIsh = this.data.harvestRooms[roomName].lastSpawnIsh[roleName];

      if (this.alive(roleName) > 0) {
        if (!lastSpawnIsh) {
          this.data.harvestRooms[roomName].lastSpawnIsh[roleName] = Game.time;
        }
      }

      if (this.total(roleName) > 0) return;

      if (lastSpawnIsh && lastSpawnIsh + 1450 > Game.time) {
        log.warning(`Skipping spawn of ${roleName} in ${roomName} due to recent death.`);
        return;
      }

      const task = ControlFlowLoop.new([TaskHarvest.new(source), TaskTransfer.new(this.room().storage!)], {
        alwaysValid: true
      });
      this.requestCreep(
        CalcCreepBody(this.room().energyCapacityAvailable, ProgramRoomRemoteHarvest.creepBodies),
        { role: roleName, task: task },
        -5,
        "rmt-harvest"
      );
      delete this.data.harvestRooms[roomName].lastSpawnIsh[roleName];
    });
  }

  private scoutRoom(roomName: string): void {
    const roleName = `sc${roomName}`;
    if (this.total(roleName) > 0) return;
    this.requestCreep(
      [MOVE],
      {
        role: roleName,
        task: ControlFlowLoop.new([TaskGoto.newToRoom(roomName)], {
          alwaysValid: true
        })
      },
      -5,
      `scout-${roomName}`
    );
  }
}

Process.register(ProgramRoomRemoteHarvest.type, ProgramRoomRemoteHarvest);
