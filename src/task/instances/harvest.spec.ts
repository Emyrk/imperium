import { test, expect, describe, it } from "vitest";
import { TaskHarvest } from "./harvest";
import { mockInstanceOf } from "screeps-jest";
import { Tasks } from "task/Tasks";
import { MockCreep } from "test-utils/mocks/creep";
import { Civis, CivisRunCode } from "civis/Civis";
import { MockSource } from "test-utils/mocks/source";
import { TaskCode } from "task/Task";

describe("Harvest task", () => {
  // Ensure the target can be loaded back out.
  // Verifies the fake game is working.
  it("Basic initialization", () => {
    const source = MockSource();
    const proto = TaskHarvest.new(source);

    const creep = MockCreep([MOVE, WORK]);
    const civis = new Civis(creep);
    const task = Tasks.initialize(civis, proto);
    expect(task.target).toBe(source);
  });

  it("in range", () => {
    const source = MockSource();
    const proto = TaskHarvest.new(source);

    let harvested = false;
    // in range
    const creep = MockCreep([MOVE, MOVE, WORK, CARRY], {
      pos: { ...source.pos, x: source.pos.x + 1 },
      memory: {
        task: null
      },
      harvest: () => {
        harvested = true;
        return OK;
      }
    });
    const civis = new Civis(creep);

    const task = Tasks.initialize(civis, proto);
    expect(task.isValid()).toBe(true);

    // Verify the task is assigned to the creep
    civis.assignTask(task);
    expect(civis.task).toBe(task);

    // Try to run the task
    const ret = civis.run();
    expect(ret).toBe(CivisRunCode.Alive);
    expect(harvested).toBe(true);

    // Run the task again to check the task code.
    const taskRet = task.run();
    expect(taskRet).toBe(TaskCode.WORKING);
  });

  it("out of range", () => {
    const source = MockSource({ pos: { x: 5, y: 5 } });
    const proto = TaskHarvest.new(source);

    let moved = false;
    // in range
    const creep = MockCreep([MOVE, MOVE, WORK, CARRY], {
      pos: { ...source.pos, x: source.pos.x + 5 },
      memory: {
        task: null
      },
      moveTo: () => {
        moved = true;
        return OK;
      }
    });
    const civis = new Civis(creep);

    const task = Tasks.initialize(civis, proto);
    expect(task.isValid()).toBe(true);

    // Verify the task is assigned to the creep
    civis.assignTask(task);
    expect(civis.task).toBe(task);

    // Try to run the task
    civis.run();
    expect(moved).toBe(true);
  });

  it("no carry is invalid", () => {
    const source = MockSource();
    const proto = TaskHarvest.new(source);

    const creep = MockCreep([MOVE, WORK]);
    const civis = new Civis(creep);
    const task = Tasks.initialize(civis, proto);
    expect(task.isValid()).toBe(false);
  });

  it("full store is invalid", () => {
    const source = MockSource();
    const proto = TaskHarvest.new(source);

    const creep = MockCreep([MOVE, WORK, CARRY], {
      store: { getFreeCapacity: () => 0 }
    });
    const civis = new Civis(creep);
    const task = Tasks.initialize(civis, proto);
    expect(task.isValid()).toBe(false);
  });
});
