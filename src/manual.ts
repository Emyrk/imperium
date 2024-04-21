import { Process } from "kernel/Process";
import { Top as TopF } from "kernel/Top";
import { log } from "lib/log/log";
import { ProgramVillage } from "program/Village/Village";
import { TaskGoto } from "task/instances/goto";
import { vi } from "vitest";

// @ts-ignore
global.Top = function (every?: number): void {
  TopF.requestTop(every);
};

// @ts-ignore
global.print = function (obj: any): void {
  log.printObject(obj);
};

// @ts-ignore
global.scout = function (fromRoom: string, roomName: string): void {
  const from = Game.rooms[fromRoom];
  if (!from) {
    log.error(`Room ${fromRoom} not found to launch a scout.`);
    return;
  }

  if (!from.memory.villagePid) {
    log.error(`Room ${fromRoom} does not have a village process.`);
    return;
  }

  const village = Process.get(from.memory.villagePid) as ProgramVillage;
  village.spawn().requestCreep({
    creep: {
      bodyParts: [MOVE],
      name: `scout_${Game.time}`,
      mem: {
        role: "scout",
        task: TaskGoto.newToRoom(roomName)
      }
    },
    priority: 100,
    onComplete: function (success: boolean): void {
      log.info(`Scout request to ${roomName} was ${success ? "successful" : "unsuccessful"}. Scouting will begin`);
    }
  });
  log.info(`Scout request to ${roomName} was made.`);
};
