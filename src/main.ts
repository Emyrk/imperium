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
import "declarations/global";
import "manual"; // Manual commands

import { preTick, reconcileTraffic } from "emyrk-screeps-cartographer";
import { USE_PROFILER } from "config";
import ErrorMapper from "lib/filemap/ErrorMapper";
import { log } from "lib/log/log";
import { ProgramHarvestSource } from "program/HarvestSource/HarvestSource";
import { Process } from "kernel/Process";
import { Top } from "kernel/Top";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";
import { metrics, reportMetrics } from "lib/stats/prometheus";
import { BaseCollector } from "lib/stats/collectors";
import { ProgramBasicRoom } from "program/BasicRoom/BasicRoom";
import { enable, wrap } from "lib/profiler/screeps-profiler";

var collector = new BaseCollector();
function onGlobalReset(): void {
  log.info("Global reset");
  if (USE_PROFILER) {
    log.info("Profiling enabled");
    enable();
  }
}

// Runs on global resets
onGlobalReset();

function unwrappedLoop(): void {
  preTick();

  // This feels a bit janky to put this here, but works for now.
  Object.values(Game.spawns).forEach(spawn => {
    const room = spawn.room;
    if (room.memory)
      if (!room.memory.roomPid) {
        const proto = ProgramBasicRoom.new(room.name);
        room.memory.roomPid = Process.launchProcess(proto);
      }
  });

  Process.runRootPIDs();

  reconcileTraffic();

  Top.printTop();

  collector.loop();
  // Report metrics to memory segment. These will be exported
  // to prometheus.
  if (Game.time % 20 === 0) {
    reportMetrics(77, metrics);
  }
}

function profiledLoop(): void {
  wrap(unwrappedLoop);
}
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const loop = USE_PROFILER ? ErrorMapper.wrapLoop(profiledLoop) : ErrorMapper.wrapLoop(unwrappedLoop);

export { loop };
