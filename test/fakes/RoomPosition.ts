const TOP = 1;
const TOP_RIGHT = 2;
const RIGHT = 3;
const BOTTOM_RIGHT = 4;
const BOTTOM = 5;
const BOTTOM_LEFT = 6;
const LEFT = 7;
const TOP_LEFT = 8;

export class RoomPosition {
  public x: number;
  public y: number;
  public roomName: string;

  public constructor(x: number, y: number, roomName: string) {
    this.x = x;
    this.y = y;
    this.roomName = roomName;
  }

  inRangeTo(target: RoomPosition | { pos: RoomPosition }, range: number): boolean {
    if ("pos" in target) {
      target = target.pos;
    }

    return (
      this.roomName === target.roomName &&
      (target.x - this.x < 0 ? this.x - target.x : target.x - this.x) <= range &&
      (target.y - this.y < 0 ? this.y - target.y : target.y - this.y) <= range
    );
  }

  isEqualTo(p: RoomPosition) {
    return p.x == this.x && p.y == this.y && p.roomName == this.roomName;
  }

  getRangeTo(b: RoomPosition) {
    const a = this;
    return b.roomName == this.roomName ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : Infinity;
  }

  getDirectionTo(target: RoomPosition | _HasRoomPosition): DirectionConstant | 0;
  getDirectionTo(tx: number, ty: number): DirectionConstant | 0;
  getDirectionTo(tx: number | RoomPosition | _HasRoomPosition, ty?: number): DirectionConstant | 0 {
    let pos: RoomPosition;
    if (isNumber(tx)) {
      pos = new RoomPosition(tx, ty!, this.roomName);
    } else {
      if ("pos" in tx) {
        // @ts-ignore
        pos = tx.pos;
      } else {
        pos = tx;
      }
    }

    const dx = pos.x - this.x;
    const dy = pos.y - this.y;

    var adx = Math.abs(dx),
      ady = Math.abs(dy);

    if (adx > ady * 2) {
      if (dx > 0) {
        return RIGHT;
      } else {
        return LEFT;
      }
    } else if (ady > adx * 2) {
      if (dy > 0) {
        return BOTTOM;
      } else {
        return TOP;
      }
    } else {
      if (dx > 0 && dy > 0) {
        return BOTTOM_RIGHT;
      }
      if (dx > 0 && dy < 0) {
        return TOP_RIGHT;
      }
      if (dx < 0 && dy > 0) {
        return BOTTOM_LEFT;
      }
      if (dx < 0 && dy < 0) {
        return TOP_LEFT;
      }
    }
    return 0;
  }
}

function isNumber(x: any): x is number {
  return typeof x === "number";
}
