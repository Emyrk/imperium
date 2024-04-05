import { SpawnRequest, deleteRequest, insertRequest } from "./SpawnControl";
import { test, expect } from "vitest";
test("SpawnRequest", () => {});
describe.each([
  // { name: "empty", start: [] as SpawnRequest[], insert: {} as SpawnRequest, expected: [] },
  {
    name: "priority_only",
    start: [
      {
        creep: {
          bodyParts: [MOVE],
          name: "zero",
          mem: { role: "" }
        },
        priority: 10
      },
      {
        creep: {
          bodyParts: [MOVE],
          name: "one",
          mem: { role: "" }
        },
        priority: 0
      },
      {
        creep: {
          bodyParts: [MOVE],
          name: "two",
          mem: { role: "" }
        },
        priority: -5
      }
    ] as SpawnRequest[],
    insert: {
      creep: {
        bodyParts: [MOVE],
        name: "test",
        mem: { role: "" }
      },
      priority: 5
    },
    expected: ["zero", "test", "one", "two"]
  },
  {
    name: "energy_cost",
    start: [
      {
        creep: {
          bodyParts: [MOVE],
          name: "zero",
          mem: { role: "" }
        },
        priority: 10
      },
      {
        creep: {
          bodyParts: [WORK, WORK, WORK],
          name: "equal_super_expensive",
          mem: { role: "" }
        },
        priority: 0
      },
      {
        creep: {
          bodyParts: [WORK, WORK],
          name: "equal_expensive",
          mem: { role: "" }
        },
        priority: 0
      },
      {
        creep: {
          bodyParts: [MOVE],
          name: "low_prio",
          mem: { role: "" }
        },
        priority: -5
      }
    ] as SpawnRequest[],
    insert: {
      creep: {
        bodyParts: [MOVE, WORK],
        name: "cheap",
        mem: { role: "" }
      },
      priority: 0
    },
    expected: ["zero", "cheap", "equal_expensive", "equal_super_expensive", "low_prio"]
  }
])("sort($name)", ({ start, insert, expected }) => {
  test(`returns ${expected}`, () => {
    const sorted = [] as SpawnRequest[];
    start.forEach(request => insertRequest(sorted, request));
    insertRequest(sorted, insert);

    let mappedExpected = expected.map(name => {
      if (insert.creep && insert.creep.name === name) {
        return insert;
      }
      return start.find(request => request.creep.name === name);
    });
    expect(sorted).toEqual(mappedExpected);

    // Try deletes
    while (sorted.length > 0) {
      const del = sorted[Math.floor(Math.random() * sorted.length)];
      deleteRequest(sorted, del.creep.name);

      mappedExpected = mappedExpected.filter(req => req!.creep.name !== del.creep.name);
      expect(sorted).not.toContain(del);
      expect(sorted).toEqual(mappedExpected);
    }
  });
});
