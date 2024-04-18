import { isStoreStructure, isConstructionSite, isController, isStructure } from "declarations/typeGuards";
import { Visualizer } from "lib/visualizer/Visualizer";
import { PriorityColor, PriorityMode, ProgramPriorityManager } from "./priorities";
import { profile } from "lib/profiler/decorator";
import { SavedState } from "lib/SharedState/SavedState";

export type LogisticsNeedPromise = SavedState<LogisticsNeedWaybill, null>;

// A waybill is a legal document that shows the contents of a shipment, its journey, and instructions for delivery
export interface LogisticsNeedWaybill {
  // haulerName is the creep responsible for this shipment
  haulerName: string;
  // pos is the location to drop off the shipment
  pos: ProtoPos;
  // The reference of the structure to receive the shipment
  ref: string;
  // What action the creep should take on the structure.
  type: LogisticsNeedType;
  // Amount of the resource to deliver
  amount: number;

  // If set to true, this waybill is considered done.
  // It does not guarantee the shipment was successful
  complete: boolean;
}

export interface LogisticsNeeded {
  ref: string;
  pos: ProtoPos;

  structureType: StructureConstant;
  type: LogisticsNeedType;

  amount: number;
  resourceType: ResourceConstant;

  priority: number;

  // pending is the amount of energy a hauling creep is coming
  // to dropoff
  pending: LogisticsNeedPromise[];
}

@profile
export class LogisticNeeds {
  private needs: { [key: string]: LogisticsNeeded } = {};
  private room: Room;
  private priorities: ProgramPriorityManager;

  constructor(room: Room, mgr: ProgramPriorityManager) {
    this.room = room;
    this.priorities = mgr;
  }

  public sortedList(): LogisticsNeeded[] {
    return Object.values(this.needs).sort((a, b) => b.priority - a.priority);
  }

  public addDropoff(dropoff: LogisticsNeedPromise): void {
    const argument = dropoff.memory;
    if (!this.needs[argument.ref]) {
      return;
    }
    if (argument.amount > this.needs[argument.ref].amount) {
      argument.amount = this.needs[argument.ref].amount;
    }
    this.needs[argument.ref].pending.push(dropoff);
  }

  public announceNeeded(ref: string, type: LogisticsNeedType, resourceType: ResourceConstant) {
    const obj = Game.getObjectById(ref as Id<Structure>);
    if (!obj) {
      this.removeNeeded(ref);
      return;
    }
    if ("my" in obj && !obj.my) {
      this.removeNeeded(ref);
      return;
    }

    this.needs[ref] = {
      ref: ref,
      pos: obj.pos,
      type: type,
      priority: 0,
      amount: 0,
      resourceType: resourceType,
      structureType: obj.structureType,
      pending: []
    };

    const needed = this.queryNeeded(ref);
    if (needed) {
      this.needs[ref] = needed;
    }
  }

  public removeNeeded(key: string) {
    if (!this.needs[key]) {
      return;
    }

    _.forEach(this.needs[key].pending, prom => {
      prom.done();
    });
    delete this.needs[key];
  }

  // TODO: handle priorities somehow
  private queryNeeded(ref: string): LogisticsNeeded | undefined {
    const need = this.needs[ref];
    const obj =
      need.type === "build"
        ? Game.getObjectById(ref as Id<ConstructionSite>)
        : Game.getObjectById(ref as Id<Structure>);
    if (!obj) {
      return undefined;
    }

    let priority = this.priorities.priority(need, PriorityMode.NORMAL, obj);
    let quantity = 0;
    switch (need.type) {
      case "transfer":
        if (!isStoreStructure(obj)) {
          return undefined;
        }

        quantity = obj.store.getFreeCapacity(need.resourceType);
        break;
      case "build":
        if (!isConstructionSite(obj)) {
          return undefined;
        }
        quantity = (obj.progressTotal - obj.progress) / BUILD_POWER;
        break;
      case "repair":
        if (!isStructure(obj)) {
          return undefined;
        }
        const diff = obj.hitsMax - obj.hits;
        quantity = diff / REPAIR_POWER;
        break;
      case "upgrade":
        if (!isController(obj)) {
          return undefined;
        }

        // Fixed amount
        quantity = 10000;
        break;
    }
    need.structureType = obj.structureType;
    need.amount = quantity;
    need.priority = priority;
    return need;
  }

  visual(coord: Coord = { x: 19, y: 39 }): void {
    const types: { [key: string]: number } = {};
    const allNeeds = Object.values(this.needs);

    const prios: {
      [prio: number]: {
        quantity: number;
        amount: number;
        priority: number;
        totalPending: number;
        structures: { [key in StructureConstant]?: number };
      };
    } = {};

    for (let i = 0; i < allNeeds.length; i++) {
      const need = allNeeds[i];
      if (need.amount === 0) {
        continue;
      }
      if (!prios[need.priority]) {
        prios[need.priority] = {
          quantity: 0,
          amount: 0,
          priority: need.priority,
          totalPending: 0,
          structures: {}
        };
      }

      prios[need.priority].quantity++;
      // This jacks up the quantities
      if (
        !(
          need.structureType === STRUCTURE_WALL ||
          need.structureType === STRUCTURE_RAMPART ||
          need.structureType === STRUCTURE_CONTROLLER
        )
      ) {
        prios[need.priority].amount += need.amount;
        prios[need.priority].totalPending += totalPending(need.pending);
      }

      let count = 0;
      if (Boolean(prios[need.priority].structures[need.structureType])) {
        count = prios[need.priority].structures[need.structureType]!;
      }
      prios[need.priority].structures[need.structureType] = count + 1;
    }

    const prioCount = Object.keys(prios).length;
    const totalRows = 10;
    const boxCoords = Visualizer.section(
      `Energy Hauling :: ${prioCount <= totalRows ? prioCount : totalRows}/${prioCount}`,
      { x: coord.x, y: coord.y, roomName: this.room.name },
      10,
      totalRows
    );

    const boxX = boxCoords.x;
    const y = boxCoords.y + 0.25;

    let row = 0;
    const sorted = Object.values(prios).sort((a, b) => b.priority - a.priority);
    sorted.slice(0, totalRows).forEach(rowData => {
      let pos = {
        x: boxX,
        y: y + row * 2,
        roomName: this.room.name
      };

      let offset = 0;

      const color = PriorityColor(rowData.priority);

      // Total Quantity
      Visualizer.text(`${rowData.quantity}`, pos, 1, {
        color: color
      });
      pos.x += Visualizer.textWidth() * 4;

      // Total amounts
      let total = `${rowData.amount}e`;
      if (rowData.amount > 1000) {
        total = `${(rowData.amount / 1000).toFixed(0)}ke`;
      }

      Visualizer.text(`${total}`, pos, 1, {
        color: color
      });
      pos.x += Visualizer.textWidth() * 7;

      // Icons
      for (let st of Object.keys(rowData.structures)) {
        this.room.visual.structure(pos.x, pos.y - 0.25, st, { scale: 0.5, opacity: 0.75 });
        // @ts-ignore
        this.room.visual.text(`${rowData.structures[st]!}`, pos.x + 0.1, pos.y - 0.25, { color: color, font: 0.3 });
        pos.x += 0.75;
      }

      pos.y += 1;
      const pct = rowData.amount === 0 ? 1 : rowData.totalPending / rowData.amount;
      Visualizer.barGraph(pct, {
        x: boxX,
        y: pos.y,
        roomName: pos.roomName
      });
      row++;
    });
  }
}

export function totalNeeded(available: LogisticsNeeded): number {
  let pending = totalPending(available.pending);
  return available.amount - pending;
}

export function totalPending(promises: LogisticsNeedPromise[]): number {
  return promises.reduce((total, promise) => {
    if (promise.exists()) {
      return total;
    }

    return total + promise.memory.amount;
  }, 0);
}
