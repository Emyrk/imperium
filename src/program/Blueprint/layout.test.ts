import { describe, it } from "vitest";
import { RoomTerrains } from "../../../test/fakes/RoomTerrain";
import { MockRoom } from "test-utils/mocks/room";
import { layoutDense } from "lib/roomplanning/dense";
import { Rooms } from "../../../test/fakes/Rooms";

describe("Layouts", () => {
  it("E11S53", () => {
    const room = Rooms.E11S53();

    const plans = layoutDense(room);
  });
});
