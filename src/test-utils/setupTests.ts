// import { Brain } from "lib/brain/Brain";
// import { Scheduler } from "lib/micro_mind/Scheduler";
// import { MemPromise } from "lib/promise/Promise";
import * as mover from "emyrk-screeps-cartographer";
import { MoveOpts, MoveTarget } from "emyrk-screeps-cartographer";
import "../declarations/global";
import "../prototypes/RoomPosition";

beforeEach(() => {
  // Make sure memory/game/etc are reset for each test.
  // @ts-ignore
  global.reset();
  // Brain.init();
  // Scheduler.init();
  // MemPromise.init();

  mover.moveTo;
  // The move library needs to be mocked
  jest.spyOn(mover, "moveTo").mockImplementation(fakeMoveTo);
});

afterEach(() => {});

function fakeMoveTo(
  creep: Creep | PowerCreep,
  targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[],
  opts?: MoveOpts,
  fallbackOpts?: MoveOpts
): -2 | -10 | CreepMoveReturnCode | -5 {
  let list: _HasRoomPosition[] | RoomPosition[] | MoveTarget[];
  if (!Array.isArray(targets)) {
    // @ts-ignore //idk
    list = [targets];
  } else {
    list = targets;
  }

  let distance: number[] = [];
  for (let i = 0; i < list.length; i++) {
    const tgt = list[i];
    let pos: RoomPosition;
    if ("pos" in tgt) {
      pos = tgt.pos;
    } else {
      pos = tgt;
    }

    let range = 0;
    if ("range" in tgt) {
      range = tgt.range as number;
    }

    if (creep.pos.inRangeToXY(pos.x, pos.y, range)) {
      return OK;
    }

    distance.push(creep.pos.getRangeTo(pos));
  }

  const to = _.findIndex(distance, d => d === _.min(distance));
  const dir = creep.pos.getDirectionTo(list[to]);
  creep.move(dir);

  return OK;
}
