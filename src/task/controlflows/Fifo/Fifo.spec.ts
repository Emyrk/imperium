import { Civis } from "civis/Civis";
import { MockCreep, setStore } from "test-utils/mocks/creep";
import { describe, expect, it, test, assert } from "vitest";
import ControlFlowFIFO from "./Fifo";
import { Tasks } from "task/Tasks";
import { TaskHarvest } from "task/instances/harvest";
import { MockSource } from "test-utils/mocks/source";
import { Task, TaskCode } from "task/Task";
import { TaskGoto } from "task/instances/goto";
import { TaskTest } from "task/instances/test";

interface testFIFORun {
  before?: (creep: Creep) => void;
  code: TaskCode;
  length: number;
  after?: (creep: Creep) => void;
}

describe("Fifo", () => {
  const source = MockSource({ energy: 10 });

  it("registered", () => {
    const creep = MockCreep([MOVE, WORK]);
    const civis = new Civis(creep);

    const proto = ControlFlowFIFO.new([]);
    const task = Tasks.initialize(civis, proto);
    expect(task).toBeInstanceOf(ControlFlowFIFO);
  });

  it("invalid", () => {
    // No carry part, so harvesting is invalid
    const creep = MockCreep([MOVE, WORK]);
    const civis = new Civis(creep);

    const proto = ControlFlowFIFO.new([TaskHarvest.new(source)]);
    const task = new ControlFlowFIFO(civis, proto);

    expect(task.isValid()).toBe(false);
  });

  it.each([
    {
      name: "empty",
      creepPos: { x: 5, y: 5 },
      tasks: [],
      expectations: []
    },
    {
      // Add a harvest task, run it twice. The second time with a full store.
      // It is in range, so no movement required.
      name: "valid harvest",
      creepFields: {
        harvest: () => OK
      },
      creepPos: { ...source.pos, x: source.pos.x + 1 },
      tasks: [TaskHarvest.new(source)],
      expectations: [
        {
          code: TaskCode.WORKING,
          length: 1,
          after: (creep: Creep) => {
            // Maxed out the capactiy
            setStore(creep, RESOURCE_ENERGY, 50);
          }
        },
        {
          // Invalid because the store is full
          code: TaskCode.INVALID,
          length: 0
        }
      ]
    },
    {
      // Expect moving, then harvesting
      name: "moveTo harvest",
      creepFields: {
        moveTo: () => OK,
        harvest: () => OK
      },
      creepPos: { ...source.pos, x: source.pos.x + 2 },
      tasks: [TaskHarvest.new(source)],
      expectations: [
        {
          code: TaskCode.MOVING,
          length: 1,
          after: (creep: Creep) => {
            // The creep should have called moveTo.
            // So update the position to be at the source.
            creep.pos.x = source.pos.x + 1;
          }
        },
        {
          // Now let it work
          code: TaskCode.WORKING,
          length: 1
        }
      ]
    },
    {
      name: "fifo pop tasks",
      creepFields: {
        moveTo: () => OK,
        harvest: () => OK
      },
      creepPos: { x: 0, y: 0 },
      tasks: [
        TaskGoto.new({ x: 5, y: 5, roomName: source.pos.roomName }),
        TaskGoto.new({ x: 10, y: 10, roomName: source.pos.roomName }),
        TaskGoto.new({ x: 20, y: 20, roomName: source.pos.roomName })
      ],
      expectations: [
        {
          code: TaskCode.MOVING,
          length: 3,
          after: (creep: Creep) => {
            creep.pos.x = 5;
            creep.pos.y = 5;
          }
        },
        {
          code: TaskCode.MOVING,
          length: 2,
          after: (creep: Creep) => {
            creep.pos.x = 10;
            creep.pos.y = 10;
          }
        },
        {
          code: TaskCode.MOVING,
          length: 1,
          after: (creep: Creep) => {
            creep.pos.x = 20;
            creep.pos.y = 20;
          }
        },
        {
          // The last task is invalid because the movement is done, and on the
          // next execute it is invalid. (already there)
          code: TaskCode.INVALID,
          length: 0
        },
        {
          // No tasks left, so  it is invalid
          code: TaskCode.INVALID,
          length: 0
        }
      ]
    },
    {
      name: "skip nothing dones",
      creepFields: {
        // Intentionally keeping a harvest task at the end that never
        // gets run.
        harvest: () => {
          assert.fail("Harvest should never be reached");
        }
      },
      creepPos: { ...source.pos, x: source.pos.x + 1 },
      tasks: [
        // A lot of tasks that get skipped
        TaskTest.newProto({ constantWorkCode: TaskCode.NOTHING_DONE }),
        TaskTest.newProto({ constantWorkCode: TaskCode.NOTHING_DONE }),
        TaskTest.newProto({ constantWorkCode: TaskCode.NOTHING_DONE }),
        TaskTest.newProto({ constantIsValid: false }),
        TaskTest.newProto({ constantWorkCode: TaskCode.DONE_WORKING }),
        TaskTest.newProto({ constantWorkCode: TaskCode.TIMEOUT }),
        TaskTest.newProto({ constantWorkCode: TaskCode.WORKING }),
        TaskHarvest.new(source)
      ],
      expectations: [
        // after first run, timeout, working, and harvest are left
        { code: TaskCode.WORKING, length: 3 },
        // Now timeout fails with a working status code
        { code: TaskCode.WORKING, length: 2 },
        // Now we are stuck working to infinity
        { code: TaskCode.WORKING, length: 2 }
      ]
    },
    {
      name: "timeout at end",
      tasks: [TaskTest.newProto({ constantWorkCode: TaskCode.TIMEOUT })],
      // When the timeout is the last task, it gets raised to the FIFO return status code
      expectations: [{ code: TaskCode.TIMEOUT, length: 0 }]
    }
  ] as { name: string; creepFields?: { [field: string]: any }; body?: BodyPartConstant[]; creepPos: Coord; tasks: ProtoTask<any>[]; expectations: testFIFORun[] }[])(
    `FIFO:$name`,
    ({ name, creepFields, body, creepPos, tasks, expectations }) => {
      const creep = MockCreep(body ?? [MOVE, WORK, CARRY], {
        pos: creepPos,
        ...creepFields
      });

      const civis = new Civis(creep);
      const task = new ControlFlowFIFO(civis, ControlFlowFIFO.new(tasks));
      for (let i = 0; i < expectations.length; i++) {
        const before = expectations[i].before;
        if (before) {
          before(creep);
        }

        const ret = task.run();
        expect(ret).toBe(expectations[i].code);
        expect(task.tasksLeft).toBe(expectations[i].length);

        const after = expectations[i].after;
        if (after) {
          after(creep);
        }
      }
    }
  );
});
