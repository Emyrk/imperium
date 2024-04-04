interface RoomPosition {}

interface RoomObject {
  ref: string;

  serialize(): ProtoRoomObject;
}

interface RoomPosition {
  print: string;
  printPlain: string;
  room: Room | undefined;
  name: string;
  coordName: string;
  isEdge: boolean;
  isVisible: boolean;
  rangeToEdge: number;
  roomCoords: Coord;
  neighbors: RoomPosition[];

  serialize(): ProtoPos;

  lookForStructure(structureType: StructureConstant): Structure | undefined;

  inRangeToPos(pos: RoomPosition, range: number): boolean;

  inRangeToXY(x: number, y: number, range: number): boolean;

  getRangeToXY(x: number, y: number): number;

  getPositionsAtRange(range: number, includeWalls?: boolean, includeEdges?: boolean): RoomPosition[];

  getPositionsInRange(range: number, includeWalls?: boolean, includeEdges?: boolean): RoomPosition[];

  getMultiRoomRangeTo(pos: RoomPosition): number;

  availableNeighbors(ignoreCreeps?: boolean): RoomPosition[];

  isWalkable(ignoreCreeps?: boolean): boolean;

  getOffsetPos(dx: number, dy: number): RoomPosition;

  getPositionAtDirection(direction: DirectionConstant, range?: number): RoomPosition;
}

interface ConstructionSite {
  isWalkable: boolean;
}

interface Structure {
  isWalkable: boolean;
}

interface Source {
  // avgRegenRate is the average amount of energy
  // that will be added to the source every tick.
  avgRegenRate: number;
}
