import { Process, ProcessCode } from "kernel/Process";
import { ProgramState } from "lib/SharedState/ProgramState";
import { log } from "lib/log/log";
import { ProgramOutpost } from "program/Outpost/Outpost";
import { ProgramVillage } from "program/Village/Village";

export interface ProgramEmpireData extends ProcessData {
  villagePids: Record<string, number>;
  outpostPids: Record<string, number>;
  statePid?: number;
}

export class ProgramEmpire extends Process<ProgramEmpireData> {
  public static type = "empire";

  public static bootstrap() {
    if (Memory.empirePid) {
      return;
    }

    const empireProcess = ProgramEmpire.new();
    Memory.empirePid = Process.launchProcess(empireProcess);
  }

  public static new() {
    return Process.newProgram<ProgramEmpireData>(ProgramEmpire.type, "empire", {
      // No room, it covers all rooms.
      roomName: "",
      villagePids: {},
      outpostPids: {}
    });
  }

  public constructor(pid: number) {
    super(pid);
  }

  public execute(): ProcessCode {
    this.villages(!this.executed);
    return ProcessCode.SUCCESS;
  }

  private villages(force?: boolean) {
    // No need to do this very often
    if (!force && Game.time % 100 !== 0) {
      return;
    }

    if (!this.data.villagePids) {
      this.data.villagePids = {};
    }
    if (!this.data.outpostPids) {
      this.data.outpostPids = {};
    }

    Object.values(Game.rooms).forEach(room => {
      if (this.data.villagePids[room.name]) return;
      if (this.data.outpostPids[room.name]) return;

      // Spawn must be named something with "Spawn" in it
      if (room.spawns.find(s => s.my && s.name.includes("Spawn"))) {
        // Start the room up in a process
        const villageProcess = ProgramVillage.new(room.name);
        this.data.villagePids[room.name] = this.launchChildProcess(villageProcess);
        return;
      }

      // Spawn must be named something with "Outpost" in it
      if (room.spawns.find(s => s.my && s.name.includes("Outpost"))) {
        const outpostProcess = ProgramOutpost.new(room.name);
        this.data.outpostPids[room.name] = this.launchChildProcess(outpostProcess);
        return;
      }
    });

    if (!this.data.statePid) {
      this.data.statePid = this.launchChildProcess(ProgramState.new());
    }
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramEmpire.type, ProgramEmpire);
