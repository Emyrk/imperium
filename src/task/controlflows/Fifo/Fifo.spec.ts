import { Tasks } from "task/Initialize";
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
import ControlFlowFIFO from "./Fifo";
import { EPERM } from "constants";

describe("FIFO", () => {
  const sourceID = GenerateID();
  const source = mockInstanceOf<Source>({
    id: sourceID,
    ref: sourceID,
    pos: new RoomPosition(25, 25, "test")
  });

  it("registered", () => {
    const proto = ControlFlowFIFO.new([]);
    const task = Tasks.initializeTask("n0", proto);
    expect(task).toBeInstanceOf(ControlFlowFIFO);
  });

  it("invalid", () => {
    // No carry part, means no capacity to store energy.
    const creep = MockCreep([WORK, MOVE], {});

    const proto = ControlFlowFIFO.new([TaskHarvest.new(source)]);
    const task = new ControlFlowFIFO("n0", proto);
    task.creep = Brain.minion(creep.name);

    expect(task.isValid()).toBe(false);
  });

  it("moveTo with invalid harvest", () => {
    saveObject(source);
    // No carry part, means no capacity to store energy.
    const creep = MockCreep([WORK, MOVE], { pos: new RoomPosition(0, 0, "test") });

    const proto = ControlFlowFIFO.new([TaskHarvest.new(source), TaskGoto.new(new RoomPosition(25, 25, "test"))]);
    const task = new ControlFlowFIFO("n0", proto);
    task.creep = Brain.minion(creep.name);

    expect(task.data.tasks.length).toBe(2);
    expect(task.isValid()).toBe(true);
    expect(task.data.tasks.length).toBe(1);
    // Creep task should be in the Moving state
    expect(task.run()).toBe(TaskCode.MOVING);
  });

  it("go through 3 tasks", () => {
    let count = 0;
    const creep = mockInstanceOf<Creep>({
      name: "n0"
    });
    const task = new ControlFlowFIFO(creep, [
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.NOTHING_DONE;
        }
      }),
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.TIMEOUT;
        }
      }),
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.DONE_WORKING;
        }
      })
    ]);

    expect(task.data.tasks.length).toBe(3);
    // The timeout one is hit, but a task remains, so we keep working
    expect(task.run()).toBe(TaskCode.WORKING);
    expect(task.data.tasks.length).toBe(1);
    expect(count).toBe(2);

    expect(task.run()).toBe(TaskCode.DONE_WORKING);
    expect(task.data.tasks.length).toBe(0);
    expect(count).toBe(3);
  });

  it("1 task, always running", () => {
    let count = 0;
    const creep = mockInstanceOf<Creep>({
      name: "n0"
    });
    const task = new ControlFlowFIFO(creep, [
      TaskTest.new({
        work: () => {
          count++;
          return TaskCode.WORKING;
        }
      })
    ]);

    expect(task.isValid()).toBe(true);
    for (let i = 1; i < 10; i++) {
      const ret = task.run();
      expect(ret).toBe(TaskCode.WORKING);
      expect(count).toBe(i);
    }
  });

  //   it("once and 1 task, done", () => {
  //     let count = 0;
  //     const creep = mockInstanceOf<Creep>({
  //       name: "n0"
  //     });
  //     const task = new ControlFlowLoop(creep, [
  //       TaskTest.new({
  //         work: () => {
  //           count++;
  //           return TaskCode.DONE_WORKING;
  //         }
  //       })
  //     ]);
  //     task.data.once = true;
  //     expect(task.isValid()).toBe(true);

  //     // First run is working
  //     const ret = task.run();
  //     expect(ret).toBe(TaskCode.WORKING);
  //     expect(count).toBe(1);

  //     // Rest are noops
  //     for (let i = 1; i < 5; i++) {
  //       const ret = task.run();
  //       expect(ret).toBe(TaskCode.DONE_WORKING);
  //       expect(count).toBe(1);
  //     }
  //   });
});
