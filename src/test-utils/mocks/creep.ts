import { mockInstanceOf } from "screeps-jest";
import { GenerateID, Store, saveObject } from "test-utils/helpers";
import { mockPos } from "./utils";

export function setStore(creep: Creep, resourceType: ResourceConstant, amount: number): void {
  // @ts-ignore
  creep.store.setStore(resourceType, amount);
}

// MockCreep creates a new creep with the given body parts and optional fields.
// It is a helper to help populate a lot of the usual fields.
export function MockCreep(body: BodyPartConstant[], mockFields: { [name: string]: any } = {}): Creep {
  const id = GenerateID();
  let name = id;
  if (mockFields.name) {
    name = mockFields.name;
  }

  // Custom pos handling
  const pos = mockPos(new RoomPosition(25, 25, "test"), mockFields.pos);
  delete mockFields.pos;

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
    store: Store(body.filter(p => p === CARRY).length * CARRY_CAPACITY, true),
    spawning: false,
    ticksToLive: 1000,
    room: { name: "test" },
    saying: "",
    fatigue: 0,
    say: () => OK,
    ...mockFields
  });

  // Faked are faked fields vs mocked fields.
  // This will override the mocked fields.
  const faked: { [name: string]: any } = {
    pos: pos
  };

  // @ts-ignore
  if (global.Memory) {
    faked.memory = Memory.creeps[creep.name];
  }

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

  // Add the faked fields to the creep.
  Object.keys(faked).forEach(key => {
    if (!mockFields[key]) {
      // @ts-ignore
      creep[key] = faked[key];
    }
  });

  // save it to the game state
  Game.creeps[creep.name] = creep;
  saveObject(creep);

  // @ts-ignore
  if (global.Memory) {
    // @ts-ignore
    Memory.creeps[creep.name] = {
      task: undefined
    };
  }

  return creep;
}

//@ts-ignore
export function Body(body: BodyPartConstant[]): BodyPartDefinition[] {
  return body.map(part => ({ type: part, hits: 100, boost: undefined }));
}
