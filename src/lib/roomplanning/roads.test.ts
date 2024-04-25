import { describe, expect, it } from "vitest";
import { Rooms } from "../../../test/fakes/Rooms";
import { planRoads, roomPOIs } from "./Roads";

describe("Roads", () => {
  it("E11S53", () => {
    const room = Rooms.E11S53();

    const plans = planRoads(room, roomPOIs(room));
    // console.log(Rooms.visualize(room, Rooms.pathCallback(plans.roads)));
    expect(JSON.stringify(plans.roads)).toMatchSnapshot();
  });

  it("E12S53", () => {
    const room = Rooms.E12S53();

    const plans = planRoads(room, roomPOIs(room));
    console.log(Rooms.visualize(room, Rooms.pathCallback(plans.roads)));
    // expect(JSON.stringify(plans.roads)).toMatchSnapshot();
  });

  it("E16S59", () => {
    const room = Rooms.E16S59();

    const plans = planRoads(room, roomPOIs(room));
    // console.log(Rooms.visualize(room, Rooms.pathCallback(plans.roads)));
    expect(JSON.stringify(plans.roads)).toMatchSnapshot();
  });
});
