declare namespace NodeJS {
  interface Global {
    deref(ref: string): RoomObject | null;

    derefRoomPosition(protoPos: ProtoPos): RoomPosition;
  }
}

type HasPos = { pos: RoomPosition };

interface ProtoPos {
  x: number;
  y: number;
  roomName: string;
}

interface ProtoRoomObject {
  ref: string;
  pos: ProtoPos;
}

type Coord = { x: number; y: number };

// I am not sure why we need RoomCoord
interface RoomCoord {
  x: number;
  y: number;
  xDir: string;
  yDir: string;
}

interface RoomMineral {
  pos: ProtoPos;
  mineralType: MineralConstant;
}

interface RoomMemory {
  roomPid?: number;

  // scouted is set to true if the room has been scouted.
  scouted?: boolean;
  sources?: ProtoPos[];
  controller?: ProtoPos;
  minerals?: RoomMineral[];
}
