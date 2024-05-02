import { Md5 } from "ts-md5";


// The FakeGame stores all objects in a flat map. If you save the object
// then you will be able to retrieve it with getObjectById or deref.
export function saveObject<D extends _HasId>(obj: D): void {
  if (!Game.testing_byID) {
    Game.testing_byID = {};
  }

  Game.testing_byID[obj.id] = obj;
}

export function saveStructure<D extends Structure>(obj: D): void {
  Game.testing_byID[obj.id] = obj;
  if (!Game.testing_roomObjects[obj.pos.roomName]) {
    Game.testing_roomObjects[obj.pos.roomName] = [];
  }
  Game.testing_roomObjects[obj.pos.roomName].push(obj);
}

export function GenerateDeterministicID(input: string): string{
  return Md5.hashStr(input).slice(0, 24);
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
  const carryCap = body.filter(p => p === CARRY).length * CARRY_CAPACITY;

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
    store: Store(carryCap, true),
    saying: (): string => "",
    spawning: false,
    ticksToLive: 1000
    // Fake fields
    // memory: fake.memory
  };
}

export class FakeStore {
  max: number | null = null;
  values: Record<ResourceConstant, number>;
  // allowAll defaults to using 0 instead of null for all resources.
  all: boolean = false;

  constructor() {
    this.values = {} as Record<ResourceConstant, number>;
  }

  public getFreeCapacity(t?: ResourceConstant): number | null {
    if (!this.max) {
      return null;
    }

    const used = this.getUsedCapacity();
    if (!used) return this.max;
    return this.max - used;
  }

  public getUsedCapacity(t?: ResourceConstant): number | null {
    if (!this.max) {
      return null;
    }

    return this.amount(t);
  }

  public getCapacity(t?: ResourceConstant): number | null {
    return this.max;
  }

  public allowAll(): void {
    this.all = true;
  }

  public setStore(t: ResourceConstant, current: number): void {
    this.values[t] = current;
  }

  public setMax(max: number): void {
    this.max = max;
  }

  private amount(t?: ResourceConstant): number | null {
    if (!t) {
      return _.sum(Object.values(this.values));
    }

    const v = this.values[t];
    if (v === undefined) {
      if (this.all) {
        return 0;
      }
      return null;
    }
    return v;
  }
}

// @ts-ignore
export function Store(max: number, all: boolean, resources?: { [t: ResourceConstant]: number }): FakeStore {
  const f = new FakeStore();
  if (resources) {
    Object.keys(resources).forEach(t => {
      // @ts-ignore
      const v = resources[t];
      f.setStore(t as ResourceConstant, v);
    });
  }
  f.max = max === 0 ? null : max;
  f.all = all;
  return f;
}
