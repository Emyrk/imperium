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
