import { GenerateID, saveObject } from "test-utils/helpers";
import { mockPos } from "./utils";
import { mockInstanceOf } from "screeps-jest";

export function MockController(mockFields: { [name: string]: any } = {}): StructureController {
  const id = GenerateID();
  const pos = mockPos(new RoomPosition(25, 25, "test"), mockFields.pos);
  delete mockFields.pos;

  const controller = mockInstanceOf<StructureController>({
    ref: id,
    id: id,
    pos: pos,
    ...mockFields
  });

  saveObject(controller);

  return controller;
}
