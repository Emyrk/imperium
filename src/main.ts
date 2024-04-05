/* tslint:disable:ordered-imports */

"use strict";
// Import ALL the things! ==============================================================================================
import "declarations/global"; // Global functions accessible from CLI
import "prototypes/Creep"; // Creep prototypes
import "prototypes/RoomObject"; // RoomObject and targeting prototypes
import "prototypes/RoomPosition"; // RoomPosition prototypes
import "prototypes/Room"; // Non-structure room prototypes
import "prototypes/Structures"; // Prototypes for accessed structures
import "prototypes/Miscellaneous"; // Everything else

import { profiler } from "lib/profiler/profile";
import { preTick, reconcileTraffic } from "emyrk-screeps-cartographer";
import { Stats } from "lib/stats/stats";
import { USE_PROFILER } from "config";
import ErrorMapper from "lib/filemap/ErrorMapper";
import { Civis } from "civis/Civis";
import { TaskGoto } from "task/instances/goto";
import "declarations/global";
import { log } from "lib/log/log";
import { TaskHarvest } from "task/instances/harvest";

// @ts-ignore
global.Harvest = function (creepName: string, target: Source): void {
  const creep = Game.creeps[creepName];
  if (!creep) {
    console.log(`No creep with name ${creepName}`);
    return;
  }

  const cs = new Civis(creep);
  cs.assignTask(TaskHarvest.new(target));
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
