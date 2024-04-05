import { mockInstanceOf } from "screeps-jest";
import { GenerateID, Store, saveObject } from "test-utils/helpers";

export function setStore(creep: Creep, resourceType: ResourceConstant, amount: number): void {
  // @ts-ignore
  creep.store.setStore(resourceType, amount);
}

export function MockCreep(body: BodyPartConstant[], mockFields: { [name: string]: any } = {}): Creep {
  const id = GenerateID();
  let name = id;
  if (mockFields.name) {
    name = mockFields.name;
  }

  // Custom pos handling
  const pos = new RoomPosition(25, 25, "test");
  if (mockFields.pos) {
    pos.x = mockFields.pos.x;
    pos.y = mockFields.pos.y;
    if (mockFields.pos.roomName) {
      pos.roomName = mockFields.pos.roomName;
    } else {
      pos.roomName = "test";
    }
    delete mockFields.pos;
  }

  let fakeMove = false;
  if (!mockFields.move) {
    fakeMove = true;
  }

  const creep = mockInstanceOf<Creep>({
    id: id,
    name: name,
    body: Body(body),
    hits: body.length * 100,
    hitsMax: body.length * 100,
    store: Store({ energy: { max: body.filter(p => p === CARRY).length * CARRY_CAPACITY, current: 0 } }),
    spawning: false,
    ticksToLive: 1000,
    room: { name: "test" },
    saying: "",
    fatigue: 0,
    ...mockFields
  });

  // @ts-ignore
  Memory.creeps[creep.name] = {
    task: undefined
  };

  const faked: { [name: string]: any } = {
    memory: Memory.creeps[creep.name],
    pos: pos
  };

  if (fakeMove) {
    // Instant move
    faked.move = (dir: DirectionConstant) => {
      if (dir === TOP) {
        pos.y--;
      } else if (dir === BOTTOM) {
        creep.pos.y++;
      } else if (dir === LEFT) {
        creep.pos.x--;
      } else if (dir === RIGHT) {
        creep.pos.x++;
      } else if (dir === TOP_LEFT) {
        creep.pos.x--;
        creep.pos.y--;
      } else if (dir === TOP_RIGHT) {
        creep.pos.x++;
        creep.pos.y--;
      } else if (dir === BOTTOM_LEFT) {
        creep.pos.x--;
        creep.pos.y++;
      } else if (dir === BOTTOM_RIGHT) {
        creep.pos.x++;
        creep.pos.y++;
      }
      return OK;
    };
  }

  Object.keys(faked).forEach(key => {
    if (!mockFields[key]) {
      // @ts-ignore
      creep[key] = faked[key];
    }
  });

  Game.creeps[creep.name] = creep;

  saveObject(creep);
  return creep;
}

//@ts-ignore
export function Body(body: BodyPartConstant[]): BodyPartDefinition[] {
  return body.map(part => ({ type: part, hits: 100, boost: undefined }));
}
