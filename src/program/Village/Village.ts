import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { GlobalCollector } from "main";
import { ProgramHarvestSource } from "program/HarvestSource/HarvestSource";
import { ProgramHeapRoomLogistics } from "program/HeapRoomLogistics/HeapRoomLogistics";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";
import { ProgramStaticHarvest } from "program/StaticHarvest/StaticHarvest";
import { ProgramTowerDefense } from "program/TowerDefense/TowerDefense";
import { RoomCostMatrix } from "room/RoomCostMatrix";

export interface ProgramVillageData extends ProcessData {
  spawnPid?: number;
  towersPid?: number;
  harvestPids: { [source: string]: number };
  logisticsPid?: number;
}

@profile
export class ProgramVillage extends Process<ProgramVillageData> {
  public static type = "village";

  public constructor(pid: number) {
    super(pid);
    this.room.memory.villagePid = pid;
    GlobalCollector.trackRoom(this.room);
  }

  static getByRoom(roomName: string): ProgramVillage | undefined {
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

    if (terminal.store.getUsedCapacity(RESOURCE_ENERGY) < 50000) {
      return;
    }

    // There is a better way then assuming an 8k transaction cost.
    const avail = terminal.store.getUsedCapacity(RESOURCE_ENERGY) - 8000;

    // Go sell energy!
    // TODO: We should offload this to the golang imo. It is expensive?
    const orders = Game.market.getAllOrders(order => {
      return (
        order.type === ORDER_BUY && order.resourceType === RESOURCE_ENERGY && order.price > 17,
        order.remainingAmount > 20000,
        Game.market.calcTransactionCost(1000, this.room.name, order.roomName!) < 8000
      );
    });
    if (orders.length === 0) return;

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

  public execute(): ProcessCode {
    this.spawn();

    if (!this.data.towersPid) {
      this.data.towersPid = this.launchChildProcess(ProgramTowerDefense.new(this.data.roomName));
    }

    if (!this.data.logisticsPid) {
      this.data.logisticsPid = this.launchChildProcess(
        ProgramHeapRoomLogistics.new(this.data.roomName, this.data.spawnPid!)
      );
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
