import { ProgramRoomRemoteHarvest } from "RoomRemoteHarvest/RoomRemoteHarvest";
import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { GlobalCollector } from "main";
import { BuildingPlans, ProgramBlueprint } from "program/Blueprint/Blueprint";
import { layoutDensePlans } from "program/Blueprint/layouts";
import { ProgramHeapRoomLogistics } from "program/HeapRoomLogistics/HeapRoomLogistics";
import { PriorityMode } from "program/HeapRoomLogistics/LogisticNeeds/priorities";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";
import { ProgramStaticHarvest } from "program/StaticHarvest/StaticHarvest";
import { ProgramTowerDefense } from "program/TowerDefense/TowerDefense";
import { RoomVillage } from "./interface";

export interface ProgramVillageData extends ProcessData {
  spawnPid?: number;
  towersPid?: number;
  harvestPids: { [source: string]: number };
  logisticsPid?: number;
  remotesPid?: number;
  blueprintPid?: number;

  primaryBuildings?: BuildingPlans & { center: Coord };

  // Important buildings.
  primaryLinkPos?: Coord;
}

@profile
export class ProgramVillage extends Process<ProgramVillageData> implements RoomVillage {
  public static type = "village";

  public constructor(pid: number) {
    super(pid);
    this.room.memory.villagePid = pid;
    GlobalCollector.trackRoom(this.room);
  }

  static getByRoom(roomName: string): RoomVillage | undefined {
    const pid = Memory.rooms[roomName].villagePid;
    if (!pid) {
      return undefined;
    }
    return Process.get(pid) as ProgramVillage;
  }

  public static new(roomName: string) {
    return Process.newProgram<ProgramVillageData>(ProgramVillage.type, `${roomName}_village`, {
      roomName: roomName,
      harvestPids: {}
    });
  }

  // Sell excess I guess...
  private marketSell(): void {
    if (Game.time % 500 !== 0) {
      return;
    }

    const terminal = this.room.terminal;
    if (!terminal) {
      return;
    }

    if (terminal.store.getUsedCapacity(RESOURCE_ENERGY) < 200000) {
      return;
    }

    // Never sell more than this.
    const avail = 50000;

    // Go sell energy!
    // TODO: We should offload this to the golang imo. It is expensive?
    const orders = Game.market.getAllOrders(order => {
      return (
        order.roomName !== undefined &&
        order.type === ORDER_BUY &&
        order.resourceType === RESOURCE_ENERGY &&
        order.price > 17 &&
        order.remainingAmount > 20000 &&
        Game.market.calcTransactionCost(Math.min(order.remainingAmount, avail), this.room.name, order.roomName!) < 15000
      );
    });
    if (orders.length === 0) {
      log.info(`No orders to sell energy from ${this.room.name}`);
      return;
    }

    const order = orders[0];
    const ret = Game.market.deal(order.id, avail, this.room.name);
    if (ret != OK) {
      log.error(`Failed to sell energy from ${this.room.name}, order=${order.id}: ${ret}`);
      return;
    }
    log.info(`Sold ${avail} energy for ${order.price} to ${order.roomName} from ${this.room.name}!`);
  }

  private get room(): Room {
    return Game.rooms[this.data.roomName];
  }

  public spawn(): ProgramSpawnControl {
    if (!this.data.spawnPid) {
      this.data.spawnPid = this.launchChildProcess(ProgramSpawnControl.new(this.data.roomName));
    }
    return Process.get(this.data.spawnPid) as ProgramSpawnControl;
  }

  public remotes(): ProgramRoomRemoteHarvest {
    if (!this.data.remotesPid || !Process.get(this.data.remotesPid)) {
      this.data.remotesPid = this.launchChildProcess(
        ProgramRoomRemoteHarvest.new(this.data.roomName, this.data.spawnPid!)
      );
    }
    return Process.get(this.data.remotesPid) as ProgramRoomRemoteHarvest;
  }

  public blueprint(): ProgramBlueprint {
    if (!this.data.blueprintPid) {
      this.data.blueprintPid = this.launchChildProcess(ProgramBlueprint.new(this.data.roomName, true));
    }
    return Process.get(this.data.blueprintPid) as ProgramBlueprint;
  }

  private link?: StructureLink;
  private updatePrimaryLink(force?: Boolean): void {
    if (!force && Game.time % 312 !== 0) {
      return;
    }

    if (!this.data.primaryLinkPos) {
      return;
    }

    if (!this.link) {
      const at = this.room.lookAt(this.data.primaryLinkPos.x, this.data.primaryLinkPos.y);
      const link = at.find(l => l.structure?.structureType === STRUCTURE_LINK)?.structure;
      if (!link) {
        return;
      }

      this.link = link as StructureLink;
      // this.updateSecondaryLinks(true);
    }
  }

  // primaryLink is required for the village API.
  public primaryLink(): StructureLink | undefined {
    return this.link;
  }

  // private updateSecondaryLinks(force: boolean): void {
  //   if (!force && Game.time % 500 !== 0) {
  //     return;
  //   }

  //   if (!this.primaryLink) {
  //     return;
  //   }
  //   this.otherLinks = this.room.links.filter(l => l !== this.primaryLink);
  // }

  public execute(): ProcessCode {
    this.spawn();
    this.remotes();
    this.blueprint();
    this.updatePrimaryLink(!this.executed);

    // This sets up the blueprint for the room.
    if (!this.data.primaryBuildings && !this.executed) {
      const plans = layoutDensePlans(this.room);
      if (!plans) {
        log.error(`Failed to generate plans for ${this.room.name}`);
      } else {
        this.blueprint().add(plans);
        this.data.primaryBuildings = plans;
        // primary link is where we will send energy to.
        this.data.primaryLinkPos = plans.buildings[STRUCTURE_LINK][0].pos;
      }
    }

    if (!this.data.towersPid) {
      this.data.towersPid = this.launchChildProcess(ProgramTowerDefense.new(this.data.roomName));
    }

    if (!this.data.logisticsPid) {
      this.data.logisticsPid = this.launchChildProcess(
        ProgramHeapRoomLogistics.new(this.data.roomName, this.data.spawnPid!)
      );

      if (this.room.name === "E11S53") {
        this.heapLogistics()?.updateNeedsMode(PriorityMode.STORE);
      }
    }

    // Static mine all sources.
    this.room.sources.forEach(source => {
      if (this.data.harvestPids[source.id]) return;

      const harvestProcess = ProgramStaticHarvest.new(source, this.data.spawnPid!);
      this.data.harvestPids[source.id] = this.launchChildProcess(harvestProcess);
    });

    this.marketSell();
    return ProcessCode.SUCCESS;
  }

  public heapLogistics(): ProgramHeapRoomLogistics | undefined {
    if (!this.data.logisticsPid) {
      return undefined;
    }
    return Process.get(this.data.logisticsPid) as ProgramHeapRoomLogistics;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramVillage.type, ProgramVillage);
