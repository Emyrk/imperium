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

import { profiler } from "lib/profiler/profile";
import { preTick, reconcileTraffic } from "emyrk-screeps-cartographer";
import { Stats } from "lib/stats/stats";
import { USE_PROFILER } from "config";
import ErrorMapper from "lib/filemap/ErrorMapper";
import { Civis } from "civis/Civis";
import { log } from "lib/log/log";
import { ProgramHarvestSource } from "program/HarvestSource/HarvestSource";
import { Process } from "kernel/Process";
import { Top } from "kernel/Top";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";
import { metrics, reportMetrics } from "lib/stats/prometheus";
import { BaseCollector } from "lib/stats/collectors";

// @ts-ignore
global.Harvest = function (target: Source): void {
  const room = Game.rooms[target.pos.roomName];
  if (!room.memory.spawnPid) {
    const proto = ProgramSpawnControl.new(target.pos.roomName);
    room.memory.spawnPid = Process.launchProcess(proto);
  }

  const process = ProgramHarvestSource.new(target, room.memory.spawnPid!);
  Process.launchProcess(process);
};

var collector = new BaseCollector();
function onGlobalReset(): void {
  log.info("Global reset");
}

// Runs on global resets
onGlobalReset();

function unwrappedLoop(): void {
  preTick();

  // Do all screepy shit
  Process.runRootPIDs();

  reconcileTraffic();
  // Report metrics to memory segment. These will be exported
  // to prometheus.
  if (Game.time % 20 === 0) {
    reportMetrics(77, metrics);
  }
  Top.printTop();

  collector.loop();
}

function profiledLoop(): void {
  profiler.wrap(unwrappedLoop);
}
// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const loop = USE_PROFILER ? ErrorMapper.wrapLoop(profiledLoop) : ErrorMapper.wrapLoop(unwrappedLoop);

export { loop };
