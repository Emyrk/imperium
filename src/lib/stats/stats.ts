import { profile } from "lib/profiler/decorator";
import { exponentialMovingAverage, truncateNumber } from "lib/utils/number";
import { setDeep } from "lib/utils/object";

/**
 * Operational statistics, stored in Memory.stats, will be updated every (this many) ticks
 */
export const LOG_STATS_INTERVAL = 8;

@profile
export class Stats {
  static first_load = false;
  // _cached is built from the .log() function, and cleaned by the .report() function.
  static _cached: { [key: string]: any } = {};

  // clean is a helper to reset the stats memory objects.
  static clean() {
    Memory.stats = {
      persistent: {
        avgCPU: 0,
        lastGlobalReset: 0
      }
    };
  }

  static tickWillLog() {
    return Game.time % LOG_STATS_INTERVAL == 0;
  }

  static ensureMemory() {
    if (!Memory.stats || !Memory.stats.persistent) {
      Stats.clean();
    }
  }

  // Logging a metric will convert it to a prometheus metric on the other side of the scraper.
  // Examples:
  // Using '.' to separate namespaces by creating a new object nesting.
  //  Stats.log("cpu.getUsed", Game.cpu.getUsed());
  // Naming with '_' can be used to separate namespaces on the prom end.
  // It has essentially the same effect as '.'.
  //  Stats.log("cpu_getUsed", Game.cpu.getUsed());
  // Nesting the values also works
  //  Stats.log("cpu", { getUsed: Game.cpu.getUsed() });
  // And labels are supported, which works well with nesting
  //  Stats.log("cpu", { getUsed: Game.cpu.getUsed() }, { room: "W1N8" });
  // TODO: @emyrk I would really prefer a more "prometheus client" like api for this.
  //  This implementation just feels very cheap, but it has downsides like if a metric is not
  //  reported on a given tick, it will be lost.
  static log(
    key: string,
    value: number | { [key: string]: number } | undefined,
    labels: { [key: string]: string } = {},
    truncateNumbers = true
  ): void {
    Stats.ensureMemory();

    if (Stats.tickWillLog()) {
      if (truncateNumbers && value != undefined) {
        const decimals = 5;
        if (typeof value == "number") {
          value = truncateNumber(value, decimals);
        } else {
          for (const i in value) {
            value[i] = truncateNumber(value[i], decimals);
          }
        }
      }

      const list = Object.keys(labels).map(label => {
        return `${label}=${labels[label]}`;
      });
      if (list.length) {
        key += `{${list.join(",")}}`;
      }

      setDeep(Stats._cached, key, value);
    }
  }

  static report() {
    if (!Stats.first_load) {
      Stats.ensureMemory();
      Memory.stats.persistent.lastGlobalReset = Game.time;
      Stats.first_load = false;
    }

    if (Stats.tickWillLog()) {
      this.log("cpu.last_global_reset", Memory.stats.persistent.lastGlobalReset);
      // Log memory usage
      this.log("memory.used", RawMemory.get().length);

      this.log("cpu.heapStatistics", (<any>Game.cpu).getHeapStatistics());
      // Log GCL
      this.log("game.time", Game.time);
      this.log("gcl.progress", Game.gcl.progress);
      this.log("gcl.progressTotal", Game.gcl.progressTotal);
      this.log("gcl.level", Game.gcl.level);
      // Log CPU
      this.log("cpu.limit", Game.cpu.limit);
      this.log("cpu.bucket", Game.cpu.bucket);
    }

    //     // Collect room stats
    // for (let roomName in Game.rooms) {
    //   let room = Game.rooms[roomName];
    //   let isMyRoom = (room.controller ? room.controller.my : false);
    //   if (isMyRoom) {
    //     let roomStats = Memory.stats.rooms[roomName] = {};
    //     roomStats.storageEnergy           = (room.storage ? room.storage.store.energy : 0);
    //     roomStats.terminalEnergy          = (room.terminal ? room.terminal.store.energy : 0);
    //     roomStats.energyAvailable         = room.energyAvailable;
    //     roomStats.energyCapacityAvailable = room.energyCapacityAvailable;
    //     roomStats.controllerProgress      = room.controller.progress;
    //     roomStats.controllerProgressTotal = room.controller.progressTotal;
    //     roomStats.controllerLevel         = room.controller.level;
    //   }
    // }

    const used = Game.cpu.getUsed();
    this.log("cpu.getUsed", used);
    if (Memory.stats.persistent.avgCPU) {
      Memory.stats.persistent.avgCPU = used;
    }
    Memory.stats.persistent.avgCPU = exponentialMovingAverage(used, Memory.stats.persistent.avgCPU, 100);

    RawMemory.segments[77] = JSON.stringify(Stats._cached);
  }
}
