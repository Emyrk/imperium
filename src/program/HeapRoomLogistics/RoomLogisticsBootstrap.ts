import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
export interface ProgramRoomLogisticsBootstrapData extends ProcessData {
  lastRoadDecay: number;
}

@profile
export class ProgramRoomLogisticsBootstrap extends Process<ProgramRoomLogisticsBootstrapData> {
  static type = "room-needs";
  static new(roomName: string) {
    return Process.newProgram<ProgramRoomLogisticsBootstrapData>(
      ProgramRoomLogisticsBootstrap.type,
      `${roomName}_needs`,
      {
        roomName,
        lastRoadDecay: Game.time
      }
    );
  }

  private firstTick: number;
  constructor(pid: number) {
    super(pid);
    this.firstTick = Game.time;
  }

  private get room(): Room {
    return Game.rooms[this.data.roomName];
  }

  execute(): ProcessCode {
    if (
      Game.time === this.firstTick ||
      Game.time === this.firstTick + 1 ||
      // @ts-ignore
      (this.room.memory.refreshNeeds && this.room.memory.refreshNeeds <= Game.time)
    ) {
      log.info(`RoomNeeds: ${this.data.roomName} first tick. ${this.room.memory.refreshNeeds && "Refresh needs"}`);
      this.loadAllNeeds();
      delete this.room.memory.refreshNeeds;
    }

    // Maintain tasks
    this.maintainRoads(false);
    this.maintainRemainingStructures(false);
    this.maintainConstructionSites(false);
    this.maintainControllerAndStorage(false);
    this.announceStorage(false);
    this.maintainTerminal(false);
    this.maintainTowers(false);
    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }

  // All needs
  private loadAllNeeds(): void {
    this.extensionEnergy();
    this.spawnEnergy();
    this.towerEnergy();
    this.maintainConstructionSites(true);
    this.maintainControllerAndStorage(true);
    this.maintainRoads(true);
    this.maintainWalls(true);
    this.announceStorage(true);
    this.maintainTerminal(true);
    this.maintainTowers(true);
  }

  private announceStorage(force: boolean): void {
    if (!force && Game.time % 100 !== 0) {
      return;
    }
    if (!this.room.storage) {
      return;
    }
    this.room.announceNeeded(this.room.storage!.ref, "transfer", RESOURCE_ENERGY);
  }

  private maintainTerminal(force: boolean): void {
    // Disable terminal for now
    // if (!force && Game.time % 100 !== 0) {
    //   return; // We do not need to run this often at all
    // }
    // const terminal = this.room.terminal;
    // if (terminal) {
    //   this.room.announceNeeded(terminal.ref, "transfer", RESOURCE_ENERGY);
    // }
  }

  // Storage and controller priorities could get stale if they are not interacted
  // with recently. We need to maintain them as they depend on each other.
  private maintainControllerAndStorage(force: boolean): void {
    if (!force && Game.time % 100 !== 0) {
      return; // We do not need to run this often at all
    }

    const controller = this.room.controller;
    if (controller) {
      this.room.announceNeeded(controller.ref, "upgrade", RESOURCE_ENERGY);
    }
    const storage = this.room.storage;
    if (storage) {
      this.room.announceNeeded(storage.ref, "transfer", RESOURCE_ENERGY);
    }
  }

  private extensionEnergy(): void {
    _.forEach(this.room.extensions, ext => {
      this.room.announceNeeded(ext.ref, "transfer", RESOURCE_ENERGY);
    });
  }

  private spawnEnergy(): void {
    _.forEach(this.room.spawns, ext => {
      this.room.announceNeeded(ext.ref, "transfer", RESOURCE_ENERGY);
    });
  }

  private towerEnergy(): void {
    _.forEach(this.room.towers, ext => {
      this.room.announceNeeded(ext.ref, "transfer", RESOURCE_ENERGY);
    });
  }

  private maintainTowers(force: boolean): void {
    if (!force && Game.time % 100 !== 0) {
      return; // We do not need to run this often at all
    }
    const towers = this.room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_TOWER
    });
    _.forEach(towers, tower => {
      this.room.announceNeeded(tower.ref, "transfer", RESOURCE_ENERGY);
    });
  }

  private maintainConstructionSites(force: boolean): void {
    if (!force && Game.time % 100 !== 0) {
      return; // We do not need to run this often at all
    }
    const sites = this.room.find(FIND_CONSTRUCTION_SITES);
    _.forEach(sites, site => {
      this.room.announceNeeded(site.ref, "build", RESOURCE_ENERGY);
    });
  }

  // maintain roads runs very infrequently
  private maintainRoads(force: boolean): void {
    if (!force && Game.time % 100 !== 0) {
      return; // We do not need to run this often at all
    }
    if (!force && this.data.lastRoadDecay >= Game.time - ROAD_DECAY_TIME * 10) {
      return;
    }
    const roads = this.room.find(FIND_STRUCTURES).filter(s => s.structureType === STRUCTURE_ROAD) as StructureRoad[];
    _.forEach(roads, road => {
      this.room.announceNeeded(road.ref, "repair", RESOURCE_ENERGY);
    });
    this.data.lastRoadDecay = Game.time;
  }

  private maintainWalls(force: boolean): void {
    if (!force && Game.time % 500 !== 0) {
      return; // We do not need to run this often at all
    }
    const roads = this.room
      .find(FIND_STRUCTURES)
      .filter(s => s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) as StructureRoad[];
    _.forEach(roads, road => {
      this.room.announceNeeded(road.ref, "repair", RESOURCE_ENERGY);
    });
  }

  // Until all structures are handled manually, we want to have this incase anything gets damaged.
  private maintainRemainingStructures(force: boolean): void {
    if (!force && Game.time % 500 !== 0) {
      return;
    }
    const repairBuildings = this.room.find(FIND_STRUCTURES).filter(s => {
      const diff = s.hitsMax - s.hits;

      return (
        // More than 20% damaged
        diff > s.hitsMax * 0.2 &&
        s.structureType !== STRUCTURE_ROAD &&
        s.structureType !== STRUCTURE_WALL &&
        s.structureType !== STRUCTURE_RAMPART
      );
    }) as StructureRoad[];
    _.forEach(repairBuildings, building => {
      this.room.announceNeeded(building.ref, "repair", RESOURCE_ENERGY);
    });
  }
}

Process.register(ProgramRoomLogisticsBootstrap.type, ProgramRoomLogisticsBootstrap);
