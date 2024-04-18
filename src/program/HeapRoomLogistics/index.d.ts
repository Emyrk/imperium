type LogisticsNeedType = "transfer" | "build" | "repair" | "upgrade";

interface Room {
  announceDeath(pos: ProtoPos): void;
  announceAvailable(ref: string, resourceType: ResourceConstant): void;
  announceNeeded(ref: string, type: LogisticsNeedType, resourceType: ResourceConstant): void;
}

interface CreepMemory {
  logiStorage?: boolean;
}

interface RoomMemory {
  refreshNeeds?: number;
}
