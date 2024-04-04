export function saveObject<D extends _HasId>(obj: D): void {
  // @ts-ignore
  Game.byID[obj.id] = obj;
}

export function GenerateID(): string {
  return "xxxxxxxxxxxxxxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CreepFields(body: BodyPartConstant[]): { [fields: string]: any } {
  const id = (Math.random() + 1).toString(36).substring(7);
  return {
    id: GenerateID(),
    name: id,
    fatigue: 0,
    // body: Body(body),
    hits: body.length * 100,
    hitsMax: body.length * 100,
    // memory: {},
    pos: new RoomPosition(25, 25, "test"),
    room: { name: "test" },
    store: Store({ RESOURCE_ENERGY: { max: body.filter(p => p === CARRY).length * CARRY_CAPACITY, current: 0 } }),
    saying: (): string => "",
    spawning: false,
    ticksToLive: 1000
    // Fake fields
    // memory: fake.memory
  };
}

export interface StoreValue {
  max: number;
  current: number;
}

export class FakeStore {
  values: Record<ResourceConstant, StoreValue>;
  constructor() {
    this.values = {} as Record<ResourceConstant, StoreValue>;
  }

  public getFreeCapacity(t: ResourceConstant): number | null {
    if (this.values[t] === undefined) {
      return null;
    }
    const { max, current } = this.values[t];
    return max - current;
  }

  public getUsedCapacity(t: ResourceConstant): number | null {
    if (this.values[t] === undefined) {
      return null;
    }
    const { max, current } = this.values[t];
    return current;
  }

  public getCapacity(t: ResourceConstant): number | null {
    if (this.values[t] === undefined) {
      return null;
    }
    const { max, current } = this.values[t];
    return max;
  }

  public setStore(t: ResourceConstant, current: number, max?: number): void {
    if (max === undefined) {
      max = this.values[t].max;
    }
    this.values[t] = { max, current };
  }
}

// @ts-ignore
export function Store(opts: { [t: ResourceConstant]: StoreValue }): FakeStore {
  const f = new FakeStore();
  Object.keys(opts).forEach(t => {
    // @ts-ignore
    const v = opts[t];
    f.setStore(t as ResourceConstant, v.current, v.max);
  });
  return f;
}
