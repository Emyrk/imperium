export class CostMatrix {
  private _bits: Uint8Array;
  constructor(bits: Uint8Array = new Uint8Array(2500)) {
    this._bits = bits;
  }

  set(xx: number, yy: number, val: number) {
    xx = xx | 0;
    yy = yy | 0;
    this._bits[xx * 50 + yy] = Math.min(Math.max(0, val), 255);
  }

  get(xx: number, yy: number): number {
    xx = xx | 0;
    yy = yy | 0;
    return this._bits[xx * 50 + yy];
  }

  clone(): CostMatrix {
    const newMatrix = new CostMatrix();
    newMatrix._bits = new Uint8Array(this._bits);
    return newMatrix;
  }
}
