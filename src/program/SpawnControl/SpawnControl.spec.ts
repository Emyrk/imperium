import { SpawnRequest, deleteRequest, insertRequest } from "./SpawnControl";

describe("SpawnControl", () => {
  it.each([
    [
      "empty",
      {
        start: [] as SpawnRequest[],
        insert: {
          creep: {
            bodyParts: [MOVE],
            name: "test",
            mem: {}
          },
          priority: 0
        },
        expected: ["test"]
      }
    ],
    [
      "priority_only",
      {
        start: [
          {
            creep: {
              bodyParts: [MOVE],
              name: "zero",
              mem: {}
            },
            priority: 10
          },
          {
            creep: {
              bodyParts: [MOVE],
              name: "one",
              mem: {}
            },
            priority: 0
          },
          {
            creep: {
              bodyParts: [MOVE],
              name: "two",
              mem: {}
            },
            priority: -5
          }
        ] as SpawnRequest[],
        insert: {
          creep: {
            bodyParts: [MOVE],
            name: "test",
            mem: {}
          },
          priority: 5
        },
        expected: ["zero", "test", "one", "two"]
      }
    ],
    [
      "energy_cost",
      {
        start: [
          {
            creep: {
              bodyParts: [MOVE],
              name: "zero",
              mem: {}
            },
            priority: 10
          },
          {
            creep: {
              bodyParts: [WORK, WORK, WORK],
              name: "equal_super_expensive",
              mem: {}
            },
            priority: 0
          },
          {
            creep: {
              bodyParts: [WORK, WORK],
              name: "equal_expensive",
              mem: {}
            },
            priority: 0
          },
          {
            creep: {
              bodyParts: [MOVE],
              name: "low_prio",
              mem: {}
            },
            priority: -5
          }
        ] as SpawnRequest[],
        insert: {
          creep: {
            bodyParts: [MOVE, WORK],
            name: "cheap",
            mem: {}
          },
          priority: 0
        },
        expected: ["zero", "cheap", "equal_expensive", "equal_super_expensive", "low_prio"]
      }
    ]
  ])("sort(%s)", (_, tdd) => {
    const sorted = [] as SpawnRequest[];
    tdd.start.forEach(request => insertRequest(sorted, request));
    insertRequest(sorted, tdd.insert);

    let expected = tdd.expected.map(name => {
      if (tdd.insert.creep.name === name) {
        return tdd.insert;
      }
      return tdd.start.find(request => request.creep.name === name);
    });
    expect(sorted).toEqual(expected);

    // Try deletes
    while (sorted.length > 0) {
      const del = sorted[Math.floor(Math.random() * sorted.length)];
      deleteRequest(sorted, del.creep.name);

      expected = expected.filter(req => req!.creep.name !== del.creep.name);
      expect(sorted).not.toContain(del);
      expect(sorted).toEqual(expected);
    }
  });
});
