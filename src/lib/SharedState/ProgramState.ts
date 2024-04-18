import { Process, ProcessCode } from "kernel/Process";
import { SavedState } from "./SavedState";
import { profile } from "lib/profiler/decorator";

export interface ProgramStateData extends ProcessData {}

// ProgramState just manages the saved states
@profile
export class ProgramState extends Process<ProgramStateData> {
  public static type = "state";
  public static new() {
    return Process.newProgram<ProgramStateData>(ProgramState.type, "saved_states", {
      roomName: "none"
    });
  }

  public constructor(pid: number) {
    super(pid);
    if (!Memory.savedStates) {
      Memory.savedStates = {};
    }
  }

  public execute(): ProcessCode {
    SavedState.loop();
    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramState.type, ProgramState);
