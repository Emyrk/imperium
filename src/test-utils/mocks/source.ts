import { GenerateID, saveObject } from "test-utils/helpers";
import { mockPos } from "./utils";
import { mockInstanceOf } from "screeps-jest";

export function MockSource(mockFields: { [name: string]: any } = {}): Source {
  const id = GenerateID();
  const pos = mockPos(new RoomPosition(25, 25, "test"), mockFields.pos);
  delete mockFields.pos;

  const source = mockInstanceOf<Source>({
    ref: id,
    id: id,
    pos: pos,
    energy: 3000,
    ...mockFields
  });

  saveObject(source);

  return source;
}
