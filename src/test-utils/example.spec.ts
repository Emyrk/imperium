import { mockGlobal, mockInstanceOf } from "screeps-jest";
import { TaskExample } from "task/instances/taskexample";
import { MockCreep } from "./fakes/Creep";

describe("Example globals", () => {
  it("in range", () => {
    expect(Memory).toBeDefined();
  });

  it("search path", () => {
    const path = PathFinder.search(new RoomPosition(10, 10, "test"), new RoomPosition(10, 5, "test"));
    expect(path.path.length).toBe(5);
    expect(path.path[path.path.length - 1].y).toBe(5);
  });

  // You can always override a fake.
  it("override search", () => {
    mockGlobal<PathFinder>("PathFinder", {
      search: () => null
    });
    const path = PathFinder.search(new RoomPosition(10, 10, "test"), new RoomPosition(10, 5, "test"));
    expect(path).toBeNull();
  });

  it("mocked creep memory --> Memory.creeps", () => {
    const creep = MockCreep([WORK, CARRY, MOVE], { harvest: () => OK });
    // Assign via creep
    creep.memory.task = TaskExample.new();
    expect(creep.memory.task).toEqual(Memory.creeps[creep.name].task);
    expect(creep.memory.task).toBeDefined();

    // Delete via creep
    creep.memory.task = undefined;
    expect(creep.memory.task).toEqual(Memory.creeps[creep.name].task);
    expect(creep.memory.task).toBeUndefined();
  });

  it("Memory.creeps --> mocked creep", () => {
    const creep = MockCreep([WORK, CARRY, MOVE], { harvest: () => OK });
    // Assign via memory
    Memory.creeps[creep.name].task = TaskExample.new();
    expect(creep.memory.task).toEqual(Memory.creeps[creep.name].task);
    expect(creep.memory.task).toBeDefined();

    // Delete via creep
    Memory.creeps[creep.name].task = undefined;
    expect(creep.memory.task).toEqual(Memory.creeps[creep.name].task);
    expect(creep.memory.task).toBeUndefined();
  });
});
