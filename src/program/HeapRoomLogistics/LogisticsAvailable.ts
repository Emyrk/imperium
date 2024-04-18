// LogisticAvailable will handle sources of energy and resources.
// All sources need to be triggered to update by some external source.
// Data is held in the heap, as it is assumed that the data can be bootstrapped

import { isResource, isRuin, isStoreStructure } from "declarations/typeGuards";
import { Visualizer } from "lib/visualizer/Visualizer";
import { profile } from "lib/profiler/decorator";
import { log } from "lib/log/log";
import { SavedState } from "lib/SharedState/SavedState";

export interface PendingPickup {
  haulerName: string;
  pickupPos: ProtoPos;
  pickupRef: string;
  pickupType: "store" | "resource";
  amount: number;

  complete: boolean;
}

export interface ResourceAvailable {
  // Ref is the reference for the structure or the resource pile.
  ref: string;
  // Where it is.
  pos: ProtoPos;
  // Static number, higher is worse
  decayRate: number;

  // quantity is the total amount of energy available.
  quantity: number;
  // Game tick updated
  lastUpdate: number;
  resourceType: ResourceConstant;

  type: "store" | "resource";

  // pending is the amount of energy a hauling creep is coming
  // to pickup. The number return argument is the tick they
  // picked it up.
  //
  // Each pending number is a promise id
  pending: SavedState<PendingPickup, null>[];
}

// from the game state without memory.
@profile
export class LogisticsAvailable {
  // available is the list of all available energy and resources
  private room: Room;
  private available: { [key: string]: ResourceAvailable } = {};

  constructor(room: Room) {
    this.room = room;
    // TODO: add the announce and update functions to the room.
  }

  public refresh(): void {
    _.forEach(Object.keys(this.available), ref => {
      const available = this.available[ref];
      if (available) {
        this.announceAvailable(ref, available.resourceType);
      }
    });
  }

  public sortedList(pos: RoomPosition): ResourceAvailable[] {
    return Object.values(this.available).sort(
      (a, b) => pos.getRangeToXY(a.pos.x, a.pos.y) - pos.getRangeToXY(b.pos.x, b.pos.y)
    );
  }

  public addPickup(pickup: SavedState<PendingPickup, null>): void {
    if (!this.available[pickup.memory.pickupRef]) {
      log.warning(`Pickup ref ${pickup.memory.pickupRef} not found to add to pending`);
      return;
    }
    this.available[pickup.memory.pickupRef].pending.push(pickup);
  }

  public announceDeath(pos: ProtoPos): void {
    const rp = new RoomPosition(pos.x, pos.y, pos.roomName);
    rp.lookFor(LOOK_RESOURCES).forEach(r => {
      this.announceAvailable(r.ref, r.resourceType);
    });
    // rp.lookFor(LOOK_TOMBSTONES).forEach(r => {
    //   this.announceAvailable(r.ref, r.resourceType);
    // });
  }

  // announcing a new ref indicates a new place to get resources.
  // This will trigger the logistics to update the available resources.
  public announceAvailable(ref: string, resourceType: ResourceConstant): void {
    // Do an update
    const available = this.queryAvailable(ref, resourceType);
    if (available) {
      this.available[ref] = available;
    } else {
      this.removeAvailable(ref);
    }
  }

  removeAvailable(ref: string): void {
    if (!this.available[ref]) {
      return;
    }
    _.forEach(this.available.pending, p => {
      // TODO: callback to notify of cancel
      p.complete = true;
    });
    delete this.available[ref];
  }

  // queryAvailable does the work of getting the available resources.
  // It would be more efficient if the caller gave us more context.
  private queryAvailable(ref: string, resourceType: ResourceConstant): ResourceAvailable | undefined {
    const obj = deref(ref);
    if (!obj) {
      this.removeAvailable(ref);
      return undefined;
    }

    // resource requires "pickup". "store" requires "transfer/withdraw"
    let type: "store" | "resource" = "store";
    let quantity = 0;
    let decayRate = 0;

    // A store can have any number of resources.
    if (isStoreStructure(obj)) {
      quantity = obj.store.getUsedCapacity(resourceType);
      if (isRuin(obj)) {
        decayRate = RUIN_DECAY;
      }
    } else if (isResource(obj)) {
      quantity = obj.amount;
      decayRate = ENERGY_DECAY;
      type = "resource";
      if (obj.resourceType !== resourceType) {
        return undefined;
      }
    }

    const exists = this.available[ref];
    return {
      ref: ref,
      pos: obj.pos,
      lastUpdate: Game.time,
      type: type,
      resourceType: resourceType,

      quantity: quantity,
      decayRate: decayRate,
      pending: exists ? exists.pending.filter(p => p.exists()) : []
    };
  }

  visual(coord: Coord = { x: 29.25, y: 39 }): void {
    const keys = Object.keys(this.available);
    const totalRows = 10;
    const boxCoords = Visualizer.section(
      `Energy Available :: ${keys.length <= totalRows ? keys.length : totalRows}/${keys.length}`,
      { x: coord.x, y: coord.y, roomName: this.room.name },
      10,
      totalRows
    );

    const boxX = boxCoords.x;
    const y = boxCoords.y + 0.25;

    let row = 0;
    keys.slice(0, totalRows).forEach(key => {
      const available = this.available[key];
      let pos = {
        x: boxX,
        y: y + row,
        roomName: this.room.name
      };
      const ref = available.ref.slice(0, 6);
      const color = `#${ref}`;

      const haulers = Object.keys(available.pending).length;
      Visualizer.text(`${haulers}`, pos, 1, { color: haulers > 0 ? "green" : "red" });

      pos.x += Visualizer.textWidth() * 3;
      Visualizer.text(ref, pos, 1, { color: `#${ref}` });

      Visualizer.marker(new RoomPosition(available.pos.x, available.pos.y, available.pos.roomName), {
        color: color,
        sizeStatic: true,
        frames: ref.charCodeAt(0) % 8,
        freeze: ref.charCodeAt(1) % 100,
        radius: 0.5
      });
      // Visualizer.circle(available.pos, color, { opacity: 0.5, radius: 0.4 });

      pos.x += Visualizer.textWidth() * ref.length + Visualizer.textWidth();
      Visualizer.text(` -> ${totalPending(available.pending)}e/${available.quantity.toString()}e`, pos);
      // TODO: Show any pending pickups
      row++;
    });
  }
}

export function totalFree(available: ResourceAvailable): number {
  let pending = totalPending(available.pending);
  return available.quantity - pending;
}

export function totalPending(promises: SavedState<PendingPickup, null>[]): number {
  return promises.reduce((total, promise) => {
    if (promise.exists()) {
      return total + promise.memory.amount;
    }

    return total;
  }, 0);
}
