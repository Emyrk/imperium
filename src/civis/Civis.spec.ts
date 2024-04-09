import { MockCreep } from "test-utils/mocks/creep";
import { MockSource } from "test-utils/mocks/source";
import { describe, it, expect, beforeEach } from "vitest";
import { Civis } from "./Civis";

describe("Catch intent", () => {
  it("OK", () => {
    const source = MockSource();
    const creep = MockCreep([WORK], {
      harvest: () => OK
    });
    const civis = new Civis(creep);

    // expect(civis.harvest(source)).toBe(OK);
    // expect(civis.intents.harvest).toBe(1);
  });
});
