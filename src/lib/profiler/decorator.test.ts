import { Process, ProgramExample } from "kernel/Process";
import { describe, it } from "vitest";
import { Banan, profile } from "./decorator";
import { mockGlobal } from "screeps-jest";

describe("Decorator", () => {
  it("should instrument", () => {
    // mockGlobal<RawMemory>("RawMemory", {
    //   segments: new Array(100)
    // });
    // profile(ProgramExample);
    // console.log("---");
    // profile(Process);
    // Banan.instance.init({ autoSaveKey: "banan", maxHistory: 1 });
    // Banan.instance.startTick();
    // const proto = ProgramExample.new();
    // const pid = Process.launchProcess(proto);
    // const prog = Process.get(pid)!;
    // prog.run();
    // Banan.instance.endTick();
    // console.log(Banan.instance.getCurrentTickDump());
  });
});
