import { MockCreep } from "test-utils/mocks/creep";
import { test, expect, describe, it } from "vitest";

describe("Mocked Creeps", () => {
  it("No Carry", () => {
    // Verified this is the right behavior on sim
    const creep = MockCreep([MOVE]);
    expect(creep.store.getUsedCapacity()).toBe(null);
    expect(creep.store.getCapacity()).toBe(null);
    expect(creep.store.getFreeCapacity()).toBe(null);
  });

  it("With Carry", () => {
    const creep = MockCreep([MOVE, CARRY]);
    expect(creep.store.getUsedCapacity(RESOURCE_ENERGY)).toBe(0);
    expect(creep.store.getCapacity(RESOURCE_ENERGY)).toBe(50);
    expect(creep.store.getFreeCapacity(RESOURCE_ENERGY)).toBe(50);

    expect(creep.store.getUsedCapacity()).toBe(0);
    expect(creep.store.getCapacity()).toBe(50);
    expect(creep.store.getFreeCapacity()).toBe(50);
  });
});
