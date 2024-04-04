import { profiler } from "lib/profiler/profile";
import { preTick, reconcileTraffic } from "emyrk-screeps-cartographer";
import { Stats } from "lib/stats/stats";
import { USE_PROFILER } from "config";
import ErrorMapper from "lib/filemap/ErrorMapper";
import { Civis } from "civis/Civis";
import { TaskGoto } from "task/instances/goto";
import "declarations/global";
import { log } from "lib/log/log";

// @ts-ignore
global.TravelTo = function (creepName: string, target: RoomPosition): void {
  const creep = Game.creeps[creepName];
  if (!creep) {
    console.log(`No creep with name ${creepName}`);
    return;
  }

  const cs = new Civis(creep);
  cs.assignTask(TaskGoto.new(target));
};

function onGlobalReset(): void {
  log.info("Global reset");
}

// Runs on global resets
onGlobalReset();

function unwrappedLoop(): void {
  preTick();

  // Do all screepy shit

  Object.values(Game.creeps).forEach(creep => {
    const civis = new Civis(Game.creeps[creep.name]);
    civis.run();
  });

  reconcileTraffic();
  Stats.report();
}

function profiledLoop(): void {
  profiler.wrap(unwrappedLoop);
}
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const loop = USE_PROFILER ? ErrorMapper.wrapLoop(profiledLoop) : ErrorMapper.wrapLoop(unwrappedLoop);

export { loop };
