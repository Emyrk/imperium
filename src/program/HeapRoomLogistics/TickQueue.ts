export class TickQueue<Data> {
  private values: [Data[], Data[]];
  constructor() {
    this.values = [[], []];
  }

  // queue for the next tick
  public queue(data: Data) {
    this.values[(Game.time + 1) % 2].push(data);
  }

  // read the content for this tick
  public read(): Data[] {
    return this.values[Game.time % 2];
  }

  // clear the content for this tick
  public clearThisTick() {
    this.values[Game.time % 2] = [];
  }
}
