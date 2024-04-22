import { LogisticsAvailable, PendingPickup, ResourceAvailable, totalFree } from "./LogisticsAvailable";
import {
  LogisticNeeds,
  LogisticsNeedPromise,
  LogisticsNeedWaybill,
  LogisticsNeeded,
  totalNeeded
} from "./LogisticNeeds/LogisticNeeds";
import { TickQueue } from "./TickQueue";
import "./prototypes";
import { ProgramRoomLogisticsBootstrap } from "./RoomLogisticsBootstrap";
import { ProgramRoomHauling } from "./RoomHauling/RoomHauling";
import { Priority, PriorityMode, ProgramPriorityManager } from "./LogisticNeeds/priorities";
import { TaskBuild } from "task/instances/build";
import { TaskRepair } from "task/instances/repair";
import { TaskTransfer } from "task/instances/transfer";
import ControlFlowFIFO from "task/controlflows/Fifo/Fifo";
import { profile } from "lib/profiler/decorator";
import { Process, ProcessCode } from "kernel/Process";
import { Civis } from "civis/Civis";
import { TaskWithdraw } from "task/instances/withdraw";
import { TaskUpgrade } from "task/instances/upgrade";
import { log } from "lib/log/log";
import { RANGES } from "lib/constants/creep";
import { TaskPickup } from "task/instances/pickup";
import { SavedState } from "lib/SharedState/SavedState";

export interface ProgramHeapRoomLogisticsData extends ProcessData {
  spawnPid: number;
  // needsPid handles bootstrapping needs
  needsPid?: number;
  haulingPid?: number;
  priorityPid?: number;
}

interface deathQueueItem {
  pos: ProtoPos;
}
interface refQueueItem {
  ref: string;
  resourceType: ResourceConstant;
}

interface needQueueItem extends refQueueItem {
  needType: LogisticsNeedType;
}

@profile
export class ProgramHeapRoomLogistics extends Process<ProgramHeapRoomLogisticsData> {
  private available: LogisticsAvailable;
  private needs: LogisticNeeds;

  // All updates are delayed by 1 tick since actions take 1 tick to take effect.
  private queuedAvailable: TickQueue<refQueueItem>;
  private queuedNeeds: TickQueue<needQueueItem>;
  private deathQueue: TickQueue<deathQueueItem>;

  private get room(): Room {
    return Game.rooms[this.data.roomName];
  }

  public static type = "heap-room-logistics";
  public static new(roomName: string, spawnPid: number) {
    return Process.newProgram<ProgramHeapRoomLogisticsData>(
      ProgramHeapRoomLogistics.type,
      `${roomName}_heap_logistics`,
      {
        roomName,
        spawnPid
      }
    );
  }

  constructor(pid: number) {
    super(pid);
    this.queuedAvailable = new TickQueue<refQueueItem>();
    this.queuedNeeds = new TickQueue<needQueueItem>();
    this.deathQueue = new TickQueue<deathQueueItem>();
    this.available = new LogisticsAvailable(this.room);
    this.needs = new LogisticNeeds(this.room, this.priorities());
  }

  public updateNeedsMode(mode: PriorityMode): void {
    this.needs.setMode(mode);
  }

  // announceDeath will look for dropped resources
  public announceDeath(pos: ProtoPos): void {
    this.deathQueue.queue({ pos: pos });
  }

  public announceAvailable(ref: string, resourceType: ResourceConstant): void {
    this.queuedAvailable.queue({ ref, resourceType });
  }

  public announceNeeded(ref: string, needType: LogisticsNeedType, resourceType: ResourceConstant): void {
    this.queuedNeeds.queue({ ref, needType, resourceType });
  }

  public priorities(): ProgramPriorityManager {
    if (!this.data.priorityPid) {
      const proto = ProgramPriorityManager.new(this.data.roomName);
      this.data.priorityPid = this.launchChildProcess(proto);
    }
    return Process.get(this.data.priorityPid) as ProgramPriorityManager;
  }

  private popQueues(): void {
    const avail = this.queuedAvailable.read();
    _.forEach(avail, a => {
      this.available.announceAvailable(a.ref, a.resourceType);
    });
    this.queuedAvailable.clearThisTick();

    const needs = this.queuedNeeds.read();
    _.forEach(needs, n => {
      this.needs.announceNeeded(n.ref, n.needType, n.resourceType);
    });
    this.queuedNeeds.clearThisTick();

    const deaths = this.deathQueue.read();
    _.forEach(deaths, d => {
      this.available.announceDeath(d.pos);
    });
  }

  private first = true;
  execute(): ProcessCode {
    this.popQueues();
    // TODO: Re-enable visuals. Testing cpu without
    // this.available.visual();
    // this.needs.visual();

    if (!this.data.needsPid) {
      const proto = ProgramRoomLogisticsBootstrap.new(this.data.roomName);
      this.data.needsPid = this.launchChildProcess(proto);
    }

    if (!this.data.haulingPid) {
      const proto = ProgramRoomHauling.new(this.data.roomName, this.data.spawnPid);
      this.data.haulingPid = this.launchChildProcess(proto);
    }

    if (this.first) {
      this.checkForDropped(true);
      this.first = false;
    }
    if (Game.time % 15 === 0) {
      this.checkForDropped(false);
    }
    if (Game.time % 100 === 0) {
      this.available.refresh();
    }
    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }

  // acquireJob will return a task for the minion to do.
  public assignHaulJob(hauler: Civis, resourceType: ResourceConstant): void {
    if (resourceType !== RESOURCE_ENERGY) {
      throw new Error("Only energy is supported right now.");
    }

    // If we have 0 energy, look to do a pickup from non-storage.
    if (hauler.store.getUsedCapacity(resourceType) === 0) {
      // Find the pickup.
      const { tasks, fromStorage } = this.haulerPickup(hauler, resourceType);
      if (tasks.length === 0) {
        const storage = this.room.storage;
        if (storage && storage.store.getUsedCapacity(resourceType) > 0) {
          const energyInStorage = storage.store.getUsedCapacity(resourceType);
          let prio = energyInStorage > 100000 ? Priority.LOW - 50 : Priority.MEDIUM - 50;
          if (energyInStorage > 400000) {
            prio = Priority.NEVER - 50;
          }
          // TODO: If nothing is returned, use the excess to upgrade.
          // If there is no pickup, we check if we can do a dropoff with priority > MEDIUM
          const useStorageDropoff = this.haulerDropoff(
            hauler,
            true,
            resourceType,
            hauler.store.getCapacity(resourceType),
            prio
          );
          if (useStorageDropoff.length > 0) {
            hauler.assignTask(
              ControlFlowFIFO.new([TaskWithdraw.new(this.room.storage!, resourceType), ...useStorageDropoff], true)
            );
            hauler.creep.memory.logiStorage = true;
            return;
          }
          return;
        }
      }

      hauler.assignTask(ControlFlowFIFO.new(tasks, true));
      hauler.creep.memory.logiStorage = fromStorage;
      return;
    }

    // We have some resources, find the best dropoff.
    const dropoff = this.haulerDropoff(hauler, Boolean(hauler.creep.memory.logiStorage), resourceType);
    if (dropoff.length > 0) {
      hauler.assignTask(ControlFlowFIFO.new(dropoff, true));
      return;
    }

    // Ok... can't dropoff, maybe go pickup something?
    if (hauler.store.getFreeCapacity(resourceType) > 0) {
      const { tasks, fromStorage } = this.haulerPickup(hauler, resourceType);
      if (tasks.length === 0) {
        return;
      }
      hauler.assignTask(ControlFlowFIFO.new(tasks, true));
      hauler.creep.memory.logiStorage = fromStorage;
      return;
    }
  }

  private haulerDropoff(
    hauler: Civis,
    preventStorage: boolean,
    resourceType: ResourceConstant,
    amount: number = hauler.store.getUsedCapacity(resourceType),
    minPrority?: number
  ): ProtoTask<any>[] {
    if (resourceType !== RESOURCE_ENERGY) {
      throw new Error("Only energy is supported right now.");
    }

    let list: LogisticsNeedPromise[] = [];
    let pos = hauler.pos;
    let chaining = false;
    while (amount > 0) {
      // TODO: When chaining dropoffs, go by distance!!! Not priority.
      // TODO: When doing a rampart, reinforce the rampart immediately. Otherwise it will just decay and die.
      const dropoff = this.bestDropoff(pos, hauler, preventStorage, resourceType, chaining, minPrority);
      if (!dropoff) {
        break;
      }
      chaining = true;

      const distance = pos.getRangeToXY(dropoff.pos.x, dropoff.pos.y);
      const waybill = {
        haulerName: hauler.name,
        pos: dropoff.pos,
        ref: dropoff.ref,
        type: dropoff.type,
        amount: amount > dropoff.amount ? dropoff.amount : amount,
        complete: false
      } as LogisticsNeedWaybill;
      const prom = SavedState.newSavedState(waybill, null);

      this.needs.addDropoff(prom);
      list.push(prom);
      amount -= dropoff.amount;
      if (amount <= 0) {
        break;
      }
      pos = new RoomPosition(dropoff.pos.x, dropoff.pos.y, dropoff.pos.roomName);

      // no more than 6 at a time. Because it prevents other creeps from
      // doing work. So it is probably better to have 2 creeps do 6 each, than 1 do 12?
      if (list.length >= 6 || dropoff.type === "build") {
        break;
      }
    }

    const tasks = list.map(p => {
      let task: ProtoTask<any> | undefined;
      let extraTask: ProtoTask<any> | undefined;
      switch (p.memory.type) {
        case "build":
          const cs = Game.getObjectById(p.memory.ref as Id<ConstructionSite>)!;
          task = TaskBuild.new(cs);
          if (cs) {
            extraTask = TaskRepair.new(cs.pos);
          }
          break;
        case "transfer":
          task = TaskTransfer.new(Game.getObjectById(p.memory.ref as Id<AnyStoreStructure>)!, RESOURCE_ENERGY);
          break;
        case "repair":
          task = TaskRepair.new(Game.getObjectById(p.memory.ref as Id<Structure>)!);
          break;
        case "upgrade":
          task = TaskUpgrade.new(Game.getObjectById(p.memory.ref as Id<StructureController>)!);
          break;
      }

      // TODO: Handle complete callback
      if (task) {
        task.states = [p.id];
      }
      if (extraTask) {
        return [task, extraTask];
      }
      return [task];
    });
    return tasks.flat().filter(t => t !== undefined) as ProtoTask<any>[];
  }

  // TODO: If we have some resources left over, do the closest job, ignoring priority.
  private bestDropoff(
    pos: RoomPosition,
    hauler: Civis,
    preventStorage: boolean,
    resourceType: ResourceConstant,
    // If chaining is set to true, it means the creep is trying
    // to chain together needs. So we should prefer distance.
    chaining: boolean,
    minPriority?: number
  ): LogisticsNeeded | null {
    const needs = this.needs.sortedList();
    const canWork = hauler.getBodyparts(WORK) > 0;
    // TODO: Do not loop because it is already sorted. Allow exit early.
    return needs.reduce<{ selected: LogisticsNeeded | null; distance: number }>(
      (current, need) => {
        if (minPriority && need.priority < minPriority) {
          return current;
        }

        if (this.room.storage && this.room.storage.ref === need.ref && preventStorage) {
          return current;
        }

        if (need.resourceType !== resourceType) {
          return current;
        }

        if (need.amount === 0) {
          return current;
        }

        const needAmount = totalNeeded(need);
        if (needAmount === 0) {
          return current;
        }

        // If we can't work, we can't do anything but transfer.
        if (need.type !== "transfer" && !canWork) {
          return current;
        }
        const dist = pos.getRangeToXY(need.pos.x, need.pos.y);

        const useNew = {
          selected: need,
          distance: dist
        };

        // If all things are equal, and you can work, prefer a job that requires work.
        if (
          canWork &&
          current.selected &&
          current.selected.type === "transfer" &&
          need.type !== "transfer" &&
          current.selected.priority === need.priority
        ) {
          return useNew;
        }

        if (!current.selected) {
          return useNew;
        }

        // TODO: Should add a case to prefer distance over priority if we have some resources we
        // can drop off real quick. If we are empty, go purely on priority.

        if (need.priority > current.selected.priority) {
          return useNew;
        }

        // Prefer distance
        if (chaining && dist < current.distance && current.selected.priority === need.priority) {
          return useNew;
        }

        // Randomly select something if they are equal based on a coin flip.
        // Use needAmount + Game.time. Not perfect, but it is deterministic, which is good.
        // This will always prefer later elements in the list, since the first has more possibilities
        // to be overwritten. Need to implement a system to move things up/down based on their
        // fulfillment.
        if (current.selected.priority === need.priority && (needAmount + Game.time) % 2 === 0) {
          return useNew;
        }

        return current;
      },
      { selected: null, distance: 1000 }
    ).selected;
  }

  private haulerPickup(
    hauler: Civis,
    resourceType: ResourceConstant
  ): { tasks: (ProtoTask<any> | undefined)[]; fromStorage: boolean } {
    let list: SavedState<PendingPickup, null>[] = [];
    let amount = hauler.store.getFreeCapacity(resourceType);
    let pos = hauler.pos;
    let inRange = false;
    let fromStorage = false;
    while (amount > 0) {
      const pickup = this.bestAvailable(hauler, resourceType, inRange);
      if (!pickup) {
        break;
      }

      if (!deref(pickup.ref)) {
        log.warning(`Pickup ref ${pickup.ref} not found to add to pending`);
        this.available.removeAvailable(pickup.ref);
        continue;
      }

      const distance = pos.getRangeToXY(pickup.pos.x, pickup.pos.y);
      const pickupData = {
        haulerName: hauler.name,
        pickupType: pickup.type,
        pickupRef: pickup.ref,
        pickupPos: { x: pickup.pos.x, y: pickup.pos.y, roomName: pickup.pos.roomName },
        amount: amount > pickup.quantity ? pickup.quantity : amount
      } as PendingPickup;
      const prom = SavedState.newSavedState(pickupData, null);

      // If storage, mark it
      if (this.room.storage && this.room.storage.ref === pickup.ref) {
        fromStorage = true;
      }

      // Add the pending pickup
      this.available.addPickup(prom);
      // Add the promise to the list for the task
      list.push(prom);
      // Try and grab some more if we can.
      amount -= totalFree(pickup);
      if (amount <= 0) {
        break;
      }
      inRange = true;
      pos = new RoomPosition(pickup.pos.x, pickup.pos.y, pickup.pos.roomName);
      // No more than 3 pickups at a time.
      if (list.length >= 3) {
        break;
      }
    }

    const tasks = list.map(p => {
      if (p.deleted()) {
        log.error(`Promise ${p.id} is not pending for haulerpickup.`);
        return undefined;
      }
      let task: ProtoTask<any> | undefined;
      switch (p.memory.pickupType) {
        case "resource":
          task = TaskPickup.new(Game.getObjectById(p.memory.pickupRef as Id<Resource>)!);
          break;
        case "store":
          task = TaskWithdraw.new(Game.getObjectById(p.memory.pickupRef as Id<Structure>)!);
          break;
        default:
          throw new Error(`Unknown pickup type: ${p.memory.pickupType}`);
      }
      task.states = [p.id];
      return task;
    });

    return { tasks: tasks, fromStorage: fromStorage };
  }

  private bestAvailable(min: Civis, resourceType: ResourceConstant, onlyInRange?: boolean): ResourceAvailable | null {
    const amount = min.store.getFreeCapacity(resourceType);
    // Find a pickup first.
    return this.available.sortedList(min.pos).reduce<{
      selected: ResourceAvailable | null;
      distance: number;
      available: number;
    }>(
      (current, next) => {
        const dist = min.pos.getRangeToXY(next.pos.x, next.pos.y);
        if (onlyInRange && dist > RANGES.TRANSFER) {
          return current;
        }

        if (!onlyInRange && next.quantity < 50) {
          return current;
        }
        const avail = totalFree(next);
        if (avail === 0) {
          return current;
        }
        if (avail < 150 && next.decayRate == 0) {
          return current;
        }

        const useNew = {
          selected: next,
          distance: dist,
          available: avail
        };
        if (!current.selected) {
          return useNew;
        }

        if (current.selected && next.decayRate > current.selected.decayRate) {
          // If the option is more than 10 away, just stick with the closer one.
          if (dist - 10 <= current.distance) {
            return useNew;
          }
        }

        if (current.available < amount && current.selected.decayRate > 0) {
          return useNew;
        }

        if (current.available < amount && useNew.available >= amount) {
          return useNew;
        }

        return current;
      },
      {
        selected: null,
        distance: 1000,
        available: 0
      }
    ).selected;
  }

  // TODO: Move this to execute on creep death instead.
  private checkForDropped(force: boolean): void {
    if (!force && Game.time % 25 === 0) {
      return;
    }

    Game.rooms[this.data.roomName].find(FIND_DROPPED_RESOURCES).forEach(resource => {
      if (resource.amount < 50) {
        return;
      }
      this.announceAvailable(resource.ref, resource.resourceType);
    });
    Game.rooms[this.data.roomName].find(FIND_RUINS).forEach(resource => {
      if (resource.store.getUsedCapacity(RESOURCE_ENERGY) < 50) {
        return;
      }
      this.announceAvailable(resource.ref, RESOURCE_ENERGY);
    });
    Game.rooms[this.data.roomName].find(FIND_TOMBSTONES).forEach(resource => {
      if (resource.store.getUsedCapacity(RESOURCE_ENERGY) < 50) {
        return;
      }
      this.announceAvailable(resource.ref, RESOURCE_ENERGY);
    });

    Game.rooms[this.data.roomName].find(FIND_STRUCTURES).forEach(struct => {
      if (struct.structureType === STRUCTURE_CONTAINER) {
        this.announceAvailable(struct.ref, RESOURCE_ENERGY);
      }
    });
  }
}

Process.register(ProgramHeapRoomLogistics.type, ProgramHeapRoomLogistics);
