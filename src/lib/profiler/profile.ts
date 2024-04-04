"use strict";

let usedOnStart = 0;
let enabled = false;
let depth = 0;
let parentFn = "(tick)";

function setupProfiler() {
  if (!Memory.profiler) {
    Memory.profiler = {
      type: "",
      map: {},
      totalTime: 0,
      enabledTick: -1
    };
  }

  depth = 0; // reset depth, this needs to be done each tick.
  // @ts-ignore
  Game.profiler = {
    callgrind() {
      return Profiler.callgrind();
    },
    stream(duration: number, filter: string) {
      setupMemory("stream", duration || 10, filter);
    },
    email(duration: number, filter: string) {
      setupMemory("email", duration || 100, filter);
    },
    profile(duration: number, filter: string) {
      setupMemory("profile", duration || 100, filter);
    },
    background(filter: string) {
      setupMemory("background", false, filter);
    },
    restart() {
      if (!Memory.profiler) {
        throw new Error("Profiler not active, can't restart.");
      }
      if (Profiler.isProfiling()) {
        const filter = Memory.profiler.filter;
        let duration: boolean | number = false;
        if (!!Memory.profiler.disableTick) {
          // Calculate the original duration, profile is enabled on the tick after the first call,
          // so add 1.
          duration = (Memory.profiler.disableTick as number) - Memory.profiler.enabledTick + 1;
        }
        const type = Memory.profiler.type;
        setupMemory(type, duration, filter);
      }
    },
    reset: resetMemory,
    output: Profiler.output
  };

  overloadCPUCalc();
}

function setupMemory(profileType: string, duration: boolean | number, filter: string | undefined) {
  resetMemory();
  const disableTick = Number.isInteger(duration) ? Game.time + (duration as number) : 0;
  if (!Memory.profiler) {
    Memory.profiler = {
      map: {},
      totalTime: 0,
      enabledTick: Game.time + 1,
      disableTick,
      type: profileType,
      filter
    };
  }
}

function resetMemory() {
  delete Memory.profiler;
}

function overloadCPUCalc() {
  if (Game.rooms.sim) {
    usedOnStart = 0; // This needs to be reset, but only in the sim.
    Game.cpu.getUsed = function getUsed() {
      // @ts-ignore
      return performance.now() - usedOnStart;
    };
  }
}

function getFilter(): string | undefined {
  return Memory.profiler?.filter;
}

const functionBlackList = [
  "getUsed", // Let's avoid wrapping this... may lead to recursion issues and should be inexpensive.
  "constructor" // es6 class constructors need to be called with `new`
];

function wrapFunction(obj: object, key: PropertyKey, className?: string) {
  // Was Reflect.getOwnPropertyDescriptor
  const descriptor = Object.getOwnPropertyDescriptor(obj, key);
  if (!descriptor || descriptor.get || descriptor.set) {
    return;
  }

  if (key === "constructor") {
    return;
  }

  const originalFunction = descriptor.value;
  if (!originalFunction || typeof originalFunction !== "function") {
    return;
  }

  // set a key for the object in memory
  if (!className) {
    className = obj.constructor ? `${obj.constructor.name}` : "";
  }
  const memKey = className + `:${String(key)}`;

  // set a tag so we don't wrap a function twice
  const savedName = `__${String(key)}__`;
  if (savedName in obj) {
    return;
  }

  // @ts-ignore
  obj[savedName] = originalFunction;
  //   Reflect.set(obj, savedName, originalFunction);

  ///////////

  // Reflect.set(obj, key,
  // @ts-ignore
  obj[key] = function (this: any, ...args: any[]) {
    if (Profiler.isProfiling() && (!getFilter() || memKey.indexOf(getFilter()!) > -1)) {
      const curParent = parentFn;
      parentFn = memKey;
      depth++;
      const start = Game.cpu.getUsed();
      // Call
      const result = originalFunction.apply(this, args);
      // After
      depth--;
      parentFn = curParent;
      const end = Game.cpu.getUsed();
      // Record
      // TODO: Make parents work
      Profiler.record(memKey, end - start, parentFn);
      return result;
    }
    return originalFunction.apply(this, args);
  };
}
function hookUpPrototypes() {
  Profiler.prototypes.forEach(proto => {
    profileObjectFunctions(proto.val, proto.name);
  });
}

function profileObjectFunctions(object: Object, label: string) {
  // @ts-ignore // TODO: Check this again
  const objectToWrap = object.prototype ? object.prototype : object;

  Object.getOwnPropertyNames(objectToWrap).forEach(functionName => {
    const extendedLabel = `${label}.${functionName}`;

    const isBlackListed = functionBlackList.indexOf(functionName) !== -1;
    if (isBlackListed) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, functionName);
    if (!descriptor) {
      return;
    }

    const hasAccessor = descriptor.get || descriptor.set;
    if (hasAccessor) {
      const configurable = descriptor.configurable;
      if (!configurable) {
        return;
      }

      const profileDescriptor = {};

      if (descriptor.get) {
        const extendedLabelGet = `${extendedLabel}:get`;
        // @ts-ignore
        profileDescriptor.get = profileFunction(descriptor.get, extendedLabelGet);
      }

      if (descriptor.set) {
        const extendedLabelSet = `${extendedLabel}:set`;
        // @ts-ignore
        profileDescriptor.set = profileFunction(descriptor.set, extendedLabelSet);
      }

      Object.defineProperty(objectToWrap, functionName, profileDescriptor);
      return;
    }

    const isFunction = typeof descriptor.value === "function";
    if (!isFunction) {
      return;
    }
    const originalFunction = objectToWrap[functionName];
    objectToWrap[functionName] = profileFunction(originalFunction, extendedLabel);
  });

  return objectToWrap;
}

function profileFunction(fn: any, functionName: string, className?: string) {
  const fnName = functionName || fn.name;
  if (!fnName) {
    console.log("Couldn't find a function name for - ", fn);
    console.log("Will not profile this function.");
    return fn;
  }

  return wrapFunction(fn, fnName, className);
}

const Profiler = {
  printProfile() {
    console.log(Profiler.output());
  },

  emailProfile() {
    Game.notify(Profiler.output(1000));
  },

  callgrind() {
    if (!Memory.profiler) {
      return;
    }
    const elapsedTicks = Game.time - Memory.profiler.enabledTick + 1;
    Memory.profiler.map["(tick)"].calls = elapsedTicks;
    Memory.profiler.map["(tick)"].time = Memory.profiler.totalTime;
    Profiler.checkMapItem("(root)");
    Memory.profiler.map["(root)"].calls = 1;
    Memory.profiler.map["(root)"].time = Memory.profiler.totalTime;
    Profiler.checkMapItem("(tick)", Memory.profiler.map["(root)"].subs);
    Memory.profiler.map["(root)"].subs["(tick)"].calls = elapsedTicks;
    Memory.profiler.map["(root)"].subs["(tick)"].time = Memory.profiler.totalTime;
    let body = `events: ns\nsummary: ${Math.round(Memory.profiler.totalTime * 1000000)}\n`;
    for (const fnName of Object.keys(Memory.profiler.map)) {
      const fn = Memory.profiler.map[fnName];
      let callsBody = "";
      let callsTime = 0;
      for (const callName of Object.keys(fn.subs)) {
        const call = fn.subs[callName];
        const ns = Math.round(call.time * 1000000);
        callsBody += `cfn=${callName}\ncalls=${call.calls} 1\n1 ${ns}\n`;
        callsTime += call.time;
      }
      body += `\nfn=${fnName}\n1 ${Math.round((fn.time - callsTime) * 1000000)}\n${callsBody}`;
    }
    return body;
  },

  output(passedOutputLengthLimit: number = 1000) {
    const outputLengthLimit = passedOutputLengthLimit;
    if (!Memory.profiler || !Memory.profiler.enabledTick) {
      return "Profiler not active.";
    }

    const endTick = Math.min(Memory.profiler.disableTick || Game.time, Game.time);
    const startTick = Memory.profiler.enabledTick + 1;
    const elapsedTicks = endTick - startTick;
    const header = "calls\t\ttime\t\tavg\t\tfunction";
    const footer = [
      `Avg: ${(Memory.profiler.totalTime / elapsedTicks).toFixed(2)}`,
      `Total: ${Memory.profiler.totalTime.toFixed(2)}`,
      `Ticks: ${elapsedTicks}`
    ].join("\t");

    const lines = [header];
    let currentLength = header.length + 1 + footer.length;
    const allLines = Profiler.lines();
    let done = false;
    while (!done && allLines.length) {
      const line = allLines.shift();
      if (!line) {
        break;
      }
      // each line added adds the line length plus a new line character.
      if (currentLength + line.length + 1 < outputLengthLimit) {
        lines.push(line);
        currentLength += line.length + 1;
      } else {
        done = true;
      }
    }
    lines.push(footer);
    return lines.join("\n");
  },

  lines(): string[] {
    if (!Memory.profiler) {
      throw new Error("Memory profiler is not defined");
    }

    const stats = Object.keys(Memory.profiler.map)
      .map(functionName => {
        const functionCalls = Memory.profiler!.map[functionName];
        return {
          name: functionName,
          calls: functionCalls.calls,
          totalTime: functionCalls.time,
          averageTime: functionCalls.time / functionCalls.calls
        };
      })
      .sort((val1, val2) => {
        return val2.totalTime - val1.totalTime;
      });

    const lines = stats.map(data => {
      return [data.calls, data.totalTime.toFixed(1), data.averageTime.toFixed(3), data.name].join("\t\t");
    });

    return lines;
  },

  prototypes: [
    { name: "Game", val: Game }
    // { name: "Room", val: Room },
    // { name: "Structure", val: Structure },
    // { name: "Spawn", val: Spawn },
    // { name: "Creep", val: Creep }
    // { name: "RoomPosition", val: RoomPosition },
    // { name: "Source", val: Source },
    // { name: "Flag", val: Flag }
  ] as { name: string; val: any }[],

  checkMapItem(functionName: string, map: any = Memory.profiler!.map) {
    if (!map[functionName]) {
      // eslint-disable-next-line no-param-reassign
      map[functionName] = {
        time: 0,
        calls: 0,
        subs: {}
      };
    }
  },

  record(functionName: string, time: number, parent: string) {
    if (!Memory.profiler) {
      throw new Error("Memory profiler is not defined");
    }

    // TODO: Fix this, we should not need this here.
    if (!Memory.profiler.map) {
      Memory.profiler.map = {};
    }

    Profiler.checkMapItem(functionName);
    Memory.profiler.map[functionName].calls++;
    Memory.profiler.map[functionName].time += time;
    if (parent) {
      Profiler.checkMapItem(parent);
      Profiler.checkMapItem(functionName, Memory.profiler.map[parent].subs);
      Memory.profiler.map[parent].subs[functionName].calls++;
      Memory.profiler.map[parent].subs[functionName].time += time;
    }

    // if (!Memory.profiler.map[functionName]) {
    //   Memory.profiler.map[functionName] = {
    //     time: 0,
    //     calls: 0
    //   };
    // }
    // Memory.profiler.map[functionName].calls++;
    // Memory.profiler.map[functionName].time += time;
  },

  endTick() {
    if (Game.time >= Memory.profiler!.enabledTick) {
      const cpuUsed = Game.cpu.getUsed();
      Memory.profiler!.totalTime += cpuUsed;
      Profiler.report();
    }
  },

  report() {
    if (Profiler.shouldPrint()) {
      Profiler.printProfile();
    } else if (Profiler.shouldEmail()) {
      Profiler.emailProfile();
    }
  },

  isProfiling() {
    if (!enabled || !Memory.profiler) {
      return false;
    }
    return !Memory.profiler.disableTick || Game.time <= Memory.profiler.disableTick;
  },

  type() {
    return Memory.profiler!.type;
  },

  shouldPrint() {
    const streaming = Profiler.type() === "stream";
    const profiling = Profiler.type() === "profile";
    const onEndingTick = Memory.profiler!.disableTick === Game.time;
    return streaming || (profiling && onEndingTick);
  },

  shouldEmail() {
    return Profiler.type() === "email" && Memory.profiler!.disableTick === Game.time;
  }
};

export module profiler {
  export function wrap(callback: () => any) {
    if (enabled) {
      setupProfiler();
    }

    if (Profiler.isProfiling()) {
      usedOnStart = Game.cpu.getUsed();

      // Commented lines are part of an on going experiment to keep the profiler
      // performant, and measure certain types of overhead.

      // var callbackStart = Game.cpu.getUsed();
      const returnVal = callback();
      // var callbackEnd = Game.cpu.getUsed();
      Profiler.endTick();
      // var end = Game.cpu.getUsed();

      // var profilerTime = (end - start) - (callbackEnd - callbackStart);
      // var callbackTime = callbackEnd - callbackStart;
      // var unaccounted = end - profilerTime - callbackTime;
      // console.log('total-', end, 'profiler-', profilerTime, 'callbacktime-',
      // callbackTime, 'start-', start, 'unaccounted', unaccounted);
      return returnVal;
    }

    return callback();
  }

  export function enable() {
    enabled = true;
    // hookUpPrototypes();
  }

  export const output = Profiler.output;

  // export const registerObject = profileObjectFunctions;
  export const registerFN = profileFunction;
  // export const registerClass = profileObjectFunctions;
}
