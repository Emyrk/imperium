import { NewProcessProto } from "kernel/Process";
import { ProgramHeapRoomLogistics } from "program/HeapRoomLogistics/HeapRoomLogistics";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";

// RoomVillage is available for any owned room.
export interface RoomVillage {
  spawn(): ProgramSpawnControl;
  // primaryLink is where all the energy should be sent.
  primaryLink(): StructureLink | undefined;
  // exposing this allows spawning children on a village.
  // TODO: Is this a good idea??
  launchChildProcess<ChildDataType extends ProcessData>(newProgram: NewProcessProto<ChildDataType>): number;

  // Extra things I want to change/fix/refactor.
  heapLogistics(): ProgramHeapRoomLogistics | undefined;
}
