// RoomVisuals are a noop.
export class RoomVisual {
  roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  line(x1: number, y1: number, x2: number, y2: number, style?: LineStyle): RoomVisual {
    return this;
  }

  circle(x: number, y: number, style?: CircleStyle): RoomVisual {
    return this;
  }

  rect(x: number, y: number, w: number, h: number, style?: PolyStyle): RoomVisual {
    return this;
  }

  poly(points: Array<[number, number] | RoomPosition>, style?: PolyStyle): RoomVisual {
    return this;
  }
  text(text: string, x: number, y: number, style?: TextStyle): RoomVisual {
    return this;
  }

  clear(): RoomVisual {
    return this;
  }

  getSize(): number {
    return 0;
  }

  export(): string {
    return "";
  }

  import(data: string): RoomVisual {
    return this;
  }

  table(x: number, y: number, rows: string[][]): void {}

  box(x: number, y: number, w: number, h: number, style?: LineStyle): RoomVisual {
    return this;
  }

  infoBox(info: string[], x: number, y: number, opts?: { [option: string]: any }): RoomVisual {
    return this;
  }

  multitext(textLines: string[], x: number, y: number, opts?: { [option: string]: any }): RoomVisual {
    return this;
  }

  structure(x: number, y: number, type: string, opts?: { [option: string]: any }): RoomVisual {
    return this;
  }

  connectRoads(opts?: { [option: string]: any }): RoomVisual | void {
    return this;
  }

  speech(text: string, x: number, y: number, opts?: { [option: string]: any }): RoomVisual {
    return this;
  }

  animatedPosition(x: number, y: number, opts?: { [option: string]: any }): RoomVisual {
    return this;
  }

  resource(type: ResourceConstant, x: number, y: number, size?: number, opacity?: number): number {
    return 0;
  }

  _fluid(type: string, x: number, y: number, size?: number, opacity?: number): void {
    return;
  }

  _mineral(type: string, x: number, y: number, size?: number, opacity?: number): void {
    return;
  }

  _compound(type: string, x: number, y: number, size?: number, opacity?: number): void {
    return;
  }
}
