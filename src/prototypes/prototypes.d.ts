interface Creep {
  inRampart: boolean;
  isInvader: boolean;
}

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

interface Room {
  print: string;
  my: boolean;
  owner: string | undefined;

  // Some accessors
  towers: StructureTower[];
  spawns: StructureSpawn[];
  links: StructureLink[];
  extensions: StructureExtension[];
  sources: Source[];
  openSpawns: StructureSpawn[];
  hostiles: Creep[];
  minerals: Mineral[];
  ConstructionSites: ConstructionSite[];

  scout(): boolean;
}

interface RoomVisual {
  table(x: number, y: number, rows: string[][]): void;

  box(x: number, y: number, w: number, h: number, style?: LineStyle): RoomVisual;

  infoBox(info: string[], x: number, y: number, opts?: { [option: string]: any }): RoomVisual;

  multitext(textLines: string[], x: number, y: number, opts?: { [option: string]: any }): RoomVisual;

  structure(x: number, y: number, type: string, opts?: { [option: string]: any }): RoomVisual;

  connectRoads(opts?: { [option: string]: any }): RoomVisual | void;

  speech(text: string, x: number, y: number, opts?: { [option: string]: any }): RoomVisual;

  animatedPosition(x: number, y: number, opts?: { [option: string]: any }): RoomVisual;

  resource(type: ResourceConstant, x: number, y: number, size?: number, opacity?: number): number;

  _fluid(type: string, x: number, y: number, size?: number, opacity?: number): void;

  _mineral(type: string, x: number, y: number, size?: number, opacity?: number): void;

  _compound(type: string, x: number, y: number, size?: number, opacity?: number): void;

  test(): RoomVisual;
}
