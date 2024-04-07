import { test, expect, describe, it } from "vitest";
import { Tasks } from "task/Tasks";
import { MockCreep } from "test-utils/mocks/creep";
import { Civis } from "civis/Civis";
import { TaskTest } from "./test";

describe("Test Task", () => {
  it("Constant IsValid", () => {
    const proto = TaskTest.newProto({
      constantIsValid: false
    });

    const creep = MockCreep([MOVE, WORK]);
    const civis = new Civis(creep);
    const task = Tasks.initialize(civis, proto);
    expect(task.isValid()).toBe(false);
  });
});
