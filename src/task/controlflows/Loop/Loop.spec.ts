import { Tasks } from "task/Initialize";
import ControlFlowLoop from "./Loop";
import { TaskHarvest } from "task/instances/harvest";
import { mockInstanceOf } from "screeps-jest";
import { GenerateID, saveObject } from "test-utils/helpers";
import { MockCreep } from "test-utils/fakes/Creep";
import { Brain } from "lib/brain/Brain";
import { TaskGoto } from "task/instances/goto";
import "../../../declarations/globals";
import "../../../lib/prototypes/RoomPosition";
import { TaskCode } from "task/Task";
import { reconcileTraffic } from "emyrk-screeps-cartographer";
import { TaskTest } from "task/instances/testktask";

describe("Loop", () => {
  const sourceID = GenerateID();
  const source = mockInstanceOf<Source>({
    id: sourceID,
    ref: sourceID,
    pos: new RoomPosition(25, 25, "test")
  });

  it("registered", () => {
    const proto = ControlFlowLoop.new([]);
    const task = Tasks.initializeTask("n0", proto);
    expect(task).toBeInstanceOf(ControlFlowLoop);
  });

  it("invalid", () => {
    // No carry part, means no capacity to store energy.
    const creep = MockCreep([WORK, MOVE], {});

    const proto = ControlFlowLoop.new([TaskHarvest.new(source)]);
    const task = new ControlFlowLoop("n0", proto);
    task.creep = Brain.minion(creep.name);

    expect(task.isValid()).toBe(false);
  });

  it("moveTo with invalid harvest", () => {
    saveObject(source);
    // No carry part, means no capacity to store energy.
    const creep = MockCreep([WORK, MOVE], { pos: new RoomPosition(0, 0, "test") });

    const proto = ControlFlowLoop.new([TaskHarvest.new(source), TaskGoto.new(new RoomPosition(25, 25, "test"))]);
    const task = new ControlFlowLoop("n0", proto);
    task.creep = Brain.minion(creep.name);

    expect(task.isValid()).toBe(true);
    // Moving should never be returned
    expect(task.run()).toBe(TaskCode.WORKING);
    expect(task.data.c).toBe(1);
  });

  it("always start from 0", () => {
    let count = 0;
    const creep = mockInstanceOf<Creep>({
      name: "n0"
    });
    const task = new ControlFlowLoop(creep, [
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.NOTHING_DONE;
        }
      }),
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.WORKING;
        }
      }),
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.NOTHING_DONE;
        }
      })
    ]);
    task.data.startFrom = 0;

    expect(task.data.startFrom).toBe(0);
    expect(task.isValid()).toBe(true);

    // Start from 0, 2 execs per task run
    for (let i = 1; i < 4; i++) {
      task.run();
      expect(count).toBe(i * 2);
    }

    // Only 1 exec per run
    count = 0;
    task.data.startFrom = 1;
    for (let i = 1; i < 4; i++) {
      task.run();
      expect(count).toBe(i * 1);
    }

    // All 3 execs per run
    count = 0;
    task.data.startFrom = 2;
    for (let i = 1; i < 4; i++) {
      task.run();
      expect(count).toBe(i * 3);
    }
  });

  it("once and 1 task, always running", () => {
    let count = 0;
    const creep = mockInstanceOf<Creep>({
      name: "n0"
    });
    const task = new ControlFlowLoop(creep, [
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.WORKING;
        }
      })
    ]);
    task.data.once = true;
    expect(task.isValid()).toBe(true);

    for (let i = 1; i < 10; i++) {
      const ret = task.run();
      expect(ret).toBe(TaskCode.WORKING);
      expect(count).toBe(i);
    }
  });

  it("once and 1 task, done", () => {
    let count = 0;
    const creep = mockInstanceOf<Creep>({
      name: "n0"
    });
    const task = new ControlFlowLoop(creep, [
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.DONE_WORKING;
        }
      })
    ]);
    task.data.once = true;
    expect(task.isValid()).toBe(true);

    // First run is working
    const ret = task.run();
    expect(ret).toBe(TaskCode.WORKING);
    expect(count).toBe(1);

    // Rest are noops
    for (let i = 1; i < 5; i++) {
      const ret = task.run();
      expect(ret).toBe(TaskCode.DONE_WORKING);
      expect(count).toBe(1);
    }
  });
});
