// CostMatrix is exactly the same as the actual cost matrix code.
// It uses a bitmap to store the cost values for each tile in the room.
// This CostMatrix is empty, and needs to be populated with values.
export class CostMatrix {
  private _bits: Uint8Array;

  constructor(bits: Uint8Array = new Uint8Array(2500)) {
    this._bits = bits;
  }

  set(xx: number, yy: number, cost: number): undefined {
    xx = xx | 0;
    yy = yy | 0;
    this._bits[xx * 50 + yy] = Math.min(Math.max(0, cost), 255);
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

  serialize(): number[] {
    return Array.prototype.slice.apply(new Uint32Array(this._bits.buffer));
  }

  deserialize(val: number[]): CostMatrix {
    let instance = Object.create(CostMatrix.prototype);
    instance._bits = new Uint8Array(new Uint32Array(val).buffer);
    return instance;
  }
}
