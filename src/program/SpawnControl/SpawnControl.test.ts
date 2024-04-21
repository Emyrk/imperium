import { describe, expect, it } from "vitest";
import { ProgramSpawnControl } from "./SpawnControl";
import { MockRoom } from "test-utils/mocks/room";
import { mockInstanceOf } from "screeps-jest";
import { Process } from "kernel/Process";

describe("SpawnControl", () => {
  // Make sure the spawned creep pops the first element from the queue.
  it("Pop request", () => {
    const room = MockRoom("test", {
      openSpawns: [
        mockInstanceOf<StructureSpawn>({
          name: "test",
          spawnCreep(body: BodyPartConstant[], name: string, opts?: SpawnOptions): ScreepsReturnCode {
            return OK;
          }
        })
      ],
      energyAvailable: 300
    });
    const proto = ProgramSpawnControl.new("test");
    const pid = Process.launchProcess(proto);
    const spawn = Process.get(pid) as ProgramSpawnControl;

    // Run exec once, make sure it can exec
    spawn.execute();

    // Request 2 creeps
    spawn.requestCreep({
      creep: {
        name: "one",
        bodyParts: [MOVE],
        mem: { role: "" }
      },
      priority: 0,
      onComplete: function (success: boolean): void {
        // noop
      }
    });
    spawn.requestCreep({
      creep: {
        name: "two",
        bodyParts: [MOVE],
        mem: { role: "" }
      },
      priority: -1,
      onComplete: function (success: boolean): void {
        // noop
      }
    });

    spawn.execute();
    // Jank way to assert the sortedQueue does not have "one"
    const queue = Reflect.get(spawn, "sortedQueue");

    expect(queue.length).toBe(1);
    // @ts-ignore
    queue.forEach(request => {
      expect(request.creep.name).not.toBe("one");
    });
  });
});
