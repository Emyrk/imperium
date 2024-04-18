import { Process, ProcessCode } from "kernel/Process";
import { ProgramState } from "lib/SharedState/ProgramState";
import { log } from "lib/log/log";
import { ProgramVillage } from "program/Village/Village";

export interface ProgramEmpireData extends ProcessData {
  villagePids: Record<string, number>;
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
      villagePids: {}
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

    Object.values(Game.rooms).forEach(room => {
      if (this.data.villagePids[room.name]) return;

      if (!room.spawns.find(s => s.my)) {
        // We don't have a spawn in the room, so ignore it.
        return;
      }

      // Start the room up in a process
      const villageProcess = ProgramVillage.new(room.name);
      this.data.villagePids[room.name] = this.launchChildProcess(villageProcess);
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
