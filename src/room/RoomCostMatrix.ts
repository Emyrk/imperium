import { profile } from "lib/profiler/decorator";

@profile
export class RoomCostMatrix {
  // Because closures cannot work, we use this as the lookup.
  private static roomCostMatrix: { [roomName: string]: RoomCostMatrix } = {};

  public static setupRoom(roomName: string): void {
    if (this.roomCostMatrix[roomName]) {
      return;
    }

    const cm = RoomCostMatrix.roomCostMatrix[roomName] || new RoomCostMatrix(roomName);
    RoomCostMatrix.roomCostMatrix[roomName] = cm;
  }

  static blockSquare(pos: ProtoPos, weight?: number): void {
    const rcm = RoomCostMatrix.roomCostMatrix[pos.roomName];
    if (!rcm || !rcm.csm || !rcm.room) {
      return;
    }

    // No creep should take this position, since we have a stationary minion here.
    if (!weight) {
      weight = 100;
    }
    rcm.csm.set(pos.x, pos.y, weight);
  }

  static callback(roomName: string): boolean | CostMatrix {
    const rcm = RoomCostMatrix.roomCostMatrix[roomName];
    if (!rcm || !rcm.room || !rcm.csm) {
      return false;
    }
    return rcm.csm;
  }

  static loop(force?: boolean) {
    if (force || Game.time % 100 === 0) {
      _.forEach(Game.rooms, room => {
        RoomCostMatrix.setupRoom(room.name);
      });
    }
  }

  private csm?: CostMatrix;
  private room?: Room;
  private id: number;

  constructor(roomName: string) {
    this.room = Game.rooms[roomName];
    this.csm = new PathFinder.CostMatrix();
    this.id = Math.floor(Math.random() * 500);
  }
}
