import { describe, expect, it } from "vitest";
import { Rooms } from "../../../test/fakes/Rooms";
import { planRoom } from "./Planner";

describe("Rooms", () => {
  it("E11S53", () => {
    const room = Rooms.E11S53();

    const plans = planRoom(room);
    if (plans instanceof Error) {
      expect(plans).not.toBeInstanceOf(Error);
      return;
    }
    const output = Rooms.RenderFiles(room, plans);
    Rooms.Save("E11S53", output);
  });

  it("E12S53", () => {
    const room = Rooms.E12S53();

    const plans = planRoom(room);
    if (plans instanceof Error) {
      expect(plans).not.toBeInstanceOf(Error);
      return;
    }
    const output = Rooms.RenderFiles(room, plans);
    Rooms.Save("E12S53", output);
  });

  it("E16S59", () => {
    const room = Rooms.E16S59();

    const plans = planRoom(room);
    if (plans instanceof Error) {
      expect(plans).not.toBeInstanceOf(Error);
      return;
    }
    const output = Rooms.RenderFiles(room, plans);
    Rooms.Save("E16S59", output);
  });
});
