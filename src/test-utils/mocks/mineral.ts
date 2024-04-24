import { GenerateID, saveObject } from "test-utils/helpers";
import { mockPos } from "./utils";
import { mockInstanceOf } from "screeps-jest";

export function MockMineral(mockFields: { [name: string]: any } = {}): Mineral {
  const id = GenerateID();
  const pos = mockPos(new RoomPosition(25, 25, "test"), mockFields.pos);
  delete mockFields.pos;

  const mineral = mockInstanceOf<Mineral>({
    ref: id,
    id: id,
    pos: pos,
    density: DENSITY_MODERATE,
    ...mockFields
  });

  saveObject(mineral);

  return mineral;
}
