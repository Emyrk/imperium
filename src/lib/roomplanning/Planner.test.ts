import { describe, expect, it } from "vitest";
import { Rooms } from "../../../test/fakes/Rooms";
import { planRoom } from "./Planner";
import { Render } from "../../test-utils/render/render";

var SegfaultHandler = require("segfault-handler");
SegfaultHandler.registerHandler("crash.log");

describe("Rooms", () => {
  it("E11S53", () => {
    const room = Rooms.E11S53();

    const plans = planRoom(room);
    console.log(process.env.LD_LIBRARY_PATH);
    try {
      Render();
    } catch (e) {}
    // console.log(Rooms.visualize(room, Rooms.pathCallback(plans.roads)));
  });

  it("E12S53", () => {
    const room = Rooms.E12S53();
    const plans = planRoom(room);

    // console.log(Rooms.visualize(room, Rooms.pathCallback(plans.roads)));
  });

  it("E16S59", () => {
    const room = Rooms.E16S59();

    const plans = planRoom(room);

    // console.log(Rooms.visualize(room, Rooms.pathCallback(plans.roads)));
  });
});
