import { Process, ProcessCode } from "kernel/Process";
import { LogisticsNeeded } from "./LogisticNeeds";
import { profile } from "lib/profiler/decorator";
import { log } from "lib/log/log";

// https://wowpedia.fandom.com/wiki/API_GetItemQualityColor#toc
// 0 Poor 9d9d9d
// 1 Common ffffff
// 2 Uncommon 1eff00
// 3 Rare 0070dd
// 4 Epic a335ee
// 5 Legendary ff8000
// 6 Artifact e6cc80
// 7 Heirloom 00ccff
// 8 WoW Token 00ccff

export function PriorityColor(p: number): string {
  const wiggle = 50;
  switch (true) {
    case p >= Priority.EMERGENCY - wiggle:
      return "#e6cc80"; // Artifact
    case p >= Priority.CRITICAL - wiggle:
      return "#ff8000"; // Legendary
    case p >= Priority.IMPORTANT - wiggle:
      return "#a335ee"; // Epic
    case p >= Priority.HIGH - wiggle:
      return "#0070dd"; // Rare
    case p >= Priority.MEDIUM - wiggle:
      return "#1eff00"; // Uncommon
    case p >= Priority.LOW - wiggle:
      return "#ffffff"; // Common
  }
  // Poor
  return "#9d9d9d";
}

export enum Priority {
  // Emergency is reserved for extra critical type needs.
  // This can be used for manual tasks assigned by the human for example.
  // Something that needs to be done above all else.
  EMERGENCY = 1000,
  // Critical is the first automated level for get this done ASAP.
  // Idea is to use it for defense style things?
  // Reserve for adaptive needs.
  CRITICAL = 900,

  IMPORTANT = 800, // Spawn + extensions
  // Repairs are High - Low
  HIGH = 700, // Towers
  MEDIUM = 600, // Construction sites
  // Low prio:
  // - repair that can wait
  // - upgrade that can wait
  LOW = 500,

  NEVER = 0
}

export enum PriorityMode {
  NORMAL
}

export interface ProgramPriorityManagerData extends ProcessData {
  wallTarget: number;
  rampartTarget: number;

  maxWallTarget: number;
  maxRampartTarget: number;
}

// TODO: Allow setting custom priorities for specific structures for a specific amount of time or tasks.
@profile
export class ProgramPriorityManager extends Process<ProgramPriorityManagerData> {
  public static type = "priority-manager";
  public static new(roomName: string) {
    return Process.newProgram<ProgramPriorityManagerData>(ProgramPriorityManager.type, `${roomName}_priority_manager`, {
      roomName: roomName,
      wallTarget: 5000000,
      rampartTarget: 1000000,
      maxWallTarget: 10000000,
      maxRampartTarget: 2000000
    });
  }

  constructor(pid: number) {
    super(pid);
  }

  private get room(): Room {
    return Game.rooms[this.data.roomName];
  }

  public priority(
    need: LogisticsNeeded,
    mode: PriorityMode = PriorityMode.NORMAL,
    obj: Structure | ConstructionSite
  ): number {
    switch (need.type) {
      case "repair":
        return this.repair(need, mode, obj as Structure);
      case "transfer":
        return this.transfer(need, mode, obj as Structure);
      case "upgrade":
        return this.upgrade(mode);
      case "build":
        return this.build(need, mode, obj as ConstructionSite);
      default:
        log.error(`Unknown need type: ${need.type}`);
        return Priority.NEVER;
    }
  }

  public upgrade(mode: PriorityMode): number {
    const controller = this.room.controller;
    if (!controller) {
      // ????
      log.error(`No controller in room ${this.room.name} for priority needs?`);
      return Priority.NEVER;
    }

    const max = CONTROLLER_DOWNGRADE[controller.level];
    const pct = controller.ticksToDowngrade / max;
    if (pct < 0.1) {
      // omg, fix this please. Go go go!
      return Priority.CRITICAL;
    } else if (pct < 0.5) {
      return Priority.IMPORTANT;
    } else if (pct < 0.7) {
      return Priority.HIGH;
    } else if (pct < 0.9) {
      return Priority.MEDIUM;
    }

    return Priority.LOW;
  }

  public build(need: LogisticsNeeded, mode: PriorityMode, obj: ConstructionSite): number {
    switch (need.structureType) {
      case STRUCTURE_EXTENSION:
      case STRUCTURE_SPAWN:
        // I want these built first.
        return Priority.HIGH;
      case STRUCTURE_RAMPART:
      case STRUCTURE_ROAD:
      case STRUCTURE_LINK:
      case STRUCTURE_WALL:
      case STRUCTURE_STORAGE:
      case STRUCTURE_TOWER:
      case STRUCTURE_OBSERVER:
      case STRUCTURE_POWER_SPAWN:
      case STRUCTURE_EXTRACTOR:
      case STRUCTURE_LAB:
      case STRUCTURE_TERMINAL:
      case STRUCTURE_CONTAINER:
      case STRUCTURE_NUKER:
      case STRUCTURE_FACTORY:
        return Priority.MEDIUM;
      default:
        log.error(`Unknown structure type for build: ${need.structureType}`);
        return Priority.NEVER;
    }
  }

  public transfer(need: LogisticsNeeded, mode: PriorityMode, obj: Structure): number {
    switch (need.structureType) {
      // Always need to fill these immediately to allow spawning
      case STRUCTURE_EXTENSION:
      case STRUCTURE_SPAWN:
        return Priority.IMPORTANT;
      case STRUCTURE_TOWER:
        return Priority.HIGH;
      case STRUCTURE_TERMINAL:
      case STRUCTURE_LINK:
      case STRUCTURE_EXTRACTOR:
      case STRUCTURE_LAB:
      case STRUCTURE_CONTAINER:
        // TODO: Handle these better
        return Priority.NEVER;
      // case STRUCTURE_NUKER:
      // case STRUCTURE_FACTORY:
      // case STRUCTURE_OBSERVER:
      // case STRUCTURE_POWER_SPAWN:
      case STRUCTURE_STORAGE:
        const st = obj as StructureStorage;
        switch (need.resourceType) {
          case RESOURCE_ENERGY:
            if (st.store.getUsedCapacity(RESOURCE_ENERGY) > 1000000) {
              return Priority.MEDIUM;
            }
            break;
        }
        // I think making this always low is ok.
        // const upNumber = this.upgrade(mode);
        return Priority.LOW;
      default:
        log.error(`Unknown structure type for transfer: ${need.structureType}`);
        return Priority.NEVER;
    }
  }

  // repair basics:
  //  HIGH: < 40%
  //  MEDIUM: 40% - 60%
  //  LOW: 60-80%
  //  NEVER: > 80%
  public repair(need: LogisticsNeeded, mode: PriorityMode, obj: Structure): number {
    if (obj.hits === obj.hitsMax) {
      return Priority.LOW;
    }

    const pct = obj.hits / obj.hitsMax;
    switch (need.structureType) {
      case STRUCTURE_WALL:
      case STRUCTURE_RAMPART:
        if (obj.hits < 1000) {
          // This is important because when you build a rampart, it can decay to 0
          return Priority.HIGH;
        }

        let lessThanTarget = obj.hits < this.data.wallTarget;
        let aboveMax = obj.hits > this.data.maxWallTarget;
        if (obj.structureType === STRUCTURE_RAMPART) {
          lessThanTarget = obj.hits < this.data.rampartTarget;
          aboveMax = obj.hits > this.data.maxRampartTarget;
        }

        if (obj.hits < 100000) {
          // Same as construction for <100k
          return Priority.MEDIUM;
        }

        // Always repair to target
        if (lessThanTarget) {
          // We do a -1 to do between LOW & MEDIUM
          return Priority.MEDIUM - 1;
        }

        if (aboveMax) {
          return Priority.NEVER;
        }

        const storage = this.room.storage;
        let excess = false;
        if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 500000) {
          excess = true;
        }

        // TODO: If we are under attack, raise this prio.
        const up = this.upgrade(mode);
        if (up <= Priority.LOW) {
          // Upgrade is not a prio, so let's work on repairs.
          // If this soaks repairs... then idk what to do.
          if (excess) {
            return Priority.LOW;
          }
        }

        return Priority.NEVER;
      case STRUCTURE_EXTENSION:
      case STRUCTURE_ROAD:
      case STRUCTURE_SPAWN:
      case STRUCTURE_LINK:
      case STRUCTURE_STORAGE:
      case STRUCTURE_TOWER:
      case STRUCTURE_OBSERVER:
      case STRUCTURE_POWER_SPAWN:
      case STRUCTURE_EXTRACTOR:
      case STRUCTURE_LAB:
      case STRUCTURE_TERMINAL:
      case STRUCTURE_CONTAINER:
      case STRUCTURE_NUKER:
      case STRUCTURE_FACTORY:
        if (pct < 0.4) {
          return Priority.HIGH;
        } else if (pct < 0.6) {
          return Priority.MEDIUM;
        } else if (pct < 0.8) {
          return Priority.LOW;
        }
        return Priority.NEVER;
      default:
        log.error(`Unknown structure type for repair: ${need.structureType}`);
        return Priority.NEVER;
    }
  }

  private adjustTarget() {
    if (Game.time % 100 !== 0) return;

    const storage = this.room.storage;
    if (!storage) {
      this.data.wallTarget = 100000;
      this.data.rampartTarget = 100000;
      return;
    }

    if (storage.store.getUsedCapacity(RESOURCE_ENERGY) > 200000) {
      this.data.wallTarget = 10000000;
      this.data.rampartTarget = 10000000;
      return;
    }

    this.data.wallTarget = 1000000;
    this.data.rampartTarget = 1000000;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
  execute(): ProcessCode {
    this.adjustTarget();
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramPriorityManager.type, ProgramPriorityManager);
