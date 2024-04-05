import ControlFlowLoop from "./Loop";
import { TaskHarvest } from "task/instances/harvest";
import { mockInstanceOf } from "screeps-jest";
import { MockCreep } from "test-utils/fakes/Creep";
import { TaskGoto } from "task/instances/goto";
import { TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";
import { Civis } from "civis/Civis";
import { GenerateID, saveObject } from "test-utils/helpers";

describe("Loop", () => {
  const sourceID = GenerateID();
  const source = mockInstanceOf<Source>({
    id: sourceID,
    ref: sourceID,
    pos: new RoomPosition(25, 25, "test")
  });
  saveObject(source);

  it("registered", () => {
    const creep = MockCreep([WORK, MOVE], {});
    const civis = new Civis(creep);

    const proto = ControlFlowLoop.new([]);
    const task = Tasks.initialize(civis, proto);
    expect(task).toBeInstanceOf(ControlFlowLoop);
  });

  it("invalid", () => {
    // No carry part, means no capacity to store energy.
    const creep = MockCreep([WORK, MOVE], {});
    const civis = new Civis(creep);

    const proto = ControlFlowLoop.new([TaskHarvest.new(source)]);
    const task = new ControlFlowLoop(civis, proto);

    expect(task.isValid()).toBe(false);
  });

  it("moveTo with invalid harvest", () => {
    saveObject(source);
    // No carry part, means no capacity to store energy.
    const creep = MockCreep([WORK, MOVE], { pos: new RoomPosition(0, 0, "test") });
    const civis = new Civis(creep);

    const proto = ControlFlowLoop.new([TaskHarvest.new(source), TaskGoto.new(new RoomPosition(25, 25, "test"))]);
    const task = new ControlFlowLoop(civis, proto);

    expect(task.isValid()).toBe(true);
    // Moving should never be returned
    expect(task.run()).toBe(TaskCode.WORKING);
    expect(task.data.c).toBe(1);
  });
});
