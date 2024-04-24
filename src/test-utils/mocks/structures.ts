import { GenerateID, saveObject, saveStructure } from "test-utils/helpers";
import { mockPos } from "./utils";
import { mockInstanceOf } from "screeps-jest";

export function MockStructure<T extends Structure>(mockFields: { [name: string]: any } = {}): T {
  const id = GenerateID();
  const pos = mockPos(new RoomPosition(25, 25, "test"), mockFields.pos);
  delete mockFields.pos;

  // @ts-ignore
  const st = mockInstanceOf<T>({
    id: id,
    ref: id,
    pos: pos,
    ...mockFields
  });

  saveStructure(st);

  return st;
}

export function MockSpawn(mockFields: { [name: string]: any } = {}): StructureSpawn {
  return MockStructure<StructureSpawn>(mockFields);
}
