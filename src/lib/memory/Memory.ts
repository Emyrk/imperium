import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";

let lastMemory: any;
let lastTime: number = 0;

const MAX_BUCKET = 10000;
// TODO: Raise this
const BUCKET_RECOVERY = 1000;
const HEAP_CLEAN_FREQUENCY = 200;
const BUCKET_CLEAR_CACHE = 7000;
const BUCKET_CPU_HALT = 4000;

/**
 * This module contains a number of low-level memory clearing and caching functions
 */
@profile
export class Mem {
  static load(): void {
    return;
    // @ts-ignore
    if (lastTime && lastMemory && Game.time == lastTime + 1) {
      // @ts-ignore
      delete global.Memory;
      // @ts-ignore
      global.Memory = lastMemory;
      RawMemory._parsed = lastMemory;
    } else {
      // noinspection BadExpressionStatementJS
      /* tslint:disable:no-unused-expression */
      Memory.rooms; // forces parsing
      /* tslint:enable:no-unused-expression */
      lastMemory = RawMemory._parsed;
      // Memory.stats.persistent.lastMemoryReset = Game.time;
    }
    lastTime = Game.time;
    // Handle global time
    // @ts-ignore
    if (!global.age) {
      // @ts-ignore
      global.age = 0;
    }
    // @ts-ignore
    global.age++;
  }

  // TODO: Review this function
  static shouldRun(): boolean {
    let shouldRun: boolean = true;
    if (Game.cpu.bucket < 500) {
      if (_.keys(Game.spawns).length > 1 && !Memory.resetBucket && !Memory.haltTick) {
        // don't run CPU reset routine at very beginning or if it's already triggered
        log.warning(`CPU bucket is critically low (${Game.cpu.bucket})! Starting CPU reset routine.`);
        Memory.resetBucket = true;
        Memory.haltTick = Game.time + 1; // reset global next tick
      } else {
        log.info(`CPU bucket is too low (${Game.cpu.bucket}). Postponing operation until bucket reaches 500.`);
      }
      shouldRun = false;
    }
    if (Memory.resetBucket) {
      if (Game.cpu.bucket < BUCKET_RECOVERY - Game.cpu.limit) {
        log.info(`Operation suspended until bucket recovery. Bucket: ${Game.cpu.bucket}/${MAX_BUCKET}`);
        shouldRun = false;
      } else {
        delete Memory.resetBucket;
      }
    }
    if (Memory.haltTick) {
      if (Memory.haltTick == Game.time) {
        (<any>Game.cpu).halt(); // TODO: remove any typing when typed-screeps updates to include this method
        shouldRun = false;
      } else if (Memory.haltTick < Game.time) {
        delete Memory.haltTick;
      }
    }
    return shouldRun;
  }

  private static _setDeep(object: any, keys: string[], value: any): void {
    const key = _.first(keys);
    keys = _.drop(keys);
    if (keys.length == 0) {
      // at the end of the recursion
      object[key] = value;
      return;
    } else {
      if (!object[key]) {
        object[key] = {};
      }
      return Mem._setDeep(object[key], keys, value);
    }
  }

  /**
   * Recursively set a value of an object given a dot-separated key, adding intermediate properties as necessary
   * Ex: Mem.setDeep(Memory.colonies, 'E1S1.miningSites.siteID.stats.uptime', 0.5)
   */
  static setDeep(object: any, keyString: string, value: any): void {
    const keys = keyString.split(".");
    return Mem._setDeep(object, keys, value);
  }

  static clean() {
    if (Game.time % 100 === 0) {
      this.cleanFlags();
    }
  }

  private static cleanFlags() {
    // Clear memory for non-existent flags
    for (const name in Memory.flags) {
      if (!Game.flags[name]) {
        delete Memory.flags[name];
        // delete global[name];
      }
    }
  }

  // Wrap is a nice helper function to define memory for custom objects.
  static wrap(memory: any, memName: string | number, defaults = {}, deep = false) {
    if (!memory[memName]) {
      memory[memName] = _.clone(defaults);
    }
    if (deep) {
      _.defaultsDeep(memory[memName], defaults);
    } else {
      _.defaults(memory[memName], defaults);
    }
    return memory[memName];
  }
}
