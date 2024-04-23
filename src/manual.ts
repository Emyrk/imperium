import { isStoreStructure } from "declarations/typeGuards";
import { Process } from "kernel/Process";
import { Top as TopF } from "kernel/Top";
import { log } from "lib/log/log";
import { ProgramHaulSpecific } from "program/HaulSpecific/HaulSpecific";
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
  const name = `scout_${Game.time}`;
  village.spawn().requestCreep({
    creep: {
      bodyParts: [MOVE],
      name: name,
      mem: {
        role: "scout",
        task: TaskGoto.newToRoom(roomName)
      }
    },
    priority: 100,
    onComplete: function (success: boolean): void {
      log.info(`Scout request to ${roomName} was ${success ? "successful" : "unsuccessful"}. Scouting will begin`);
      // Just let the village handle the creep. Hopefully this isn't a problem for their counting.
      village.assignCivis(Game.creeps[name]);
    }
  });
  log.info(`Scout request to ${roomName} was made.`);
};

// @ts-ignore
global.haul = function (fromRef: string, toRef: string): void {
  const from = deref(fromRef);
  const to = deref(toRef);
  if (!from || !to) {
    log.error(`Hauling from ${from} to ${to} failed. One of the objects was not found.`);
    return;
  }

  if (!isStoreStructure(to)) {
    log.error(`Hauling from ${from} to ${to} failed. The target is not a store structure.`);
    return;
  }

  const fromRoom = from.room;
  const toRoom = to.room;

  if (!fromRoom || !toRoom) {
    log.error(`Hauling from ${from} to ${to} failed. One of the objects did not have a room.`);
    return;
  }

  const village = ProgramVillage.getByRoom(fromRoom.name);
  if (!village) {
    log.error(`Hauling from ${from} to ${to} failed. No village process found for ${fromRoom.name}.`);
    return;
  }

  const proto = ProgramHaulSpecific.new(fromRoom.name, village.spawn().pid, fromRef, to);
  const pid = village.launchChildProcess(proto);
  log.info(`Hauling from ${from} to ${to} launched with pid ${pid}`);
};
// global.towerDrain = function (roomName: string): void {};
