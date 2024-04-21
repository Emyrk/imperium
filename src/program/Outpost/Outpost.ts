import { Process, ProcessCode } from "kernel/Process";
import { profile } from "lib/profiler/decorator";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";
import { ProgramTowerDefense } from "program/TowerDefense/TowerDefense";
import { layout } from "./layout";

export interface ProgramOutpostData extends ProcessData {
  spawnPid?: number;
  towersPid?: number;
  layout?: {
    center: Coord;
  };

  invalid?: boolean;

  // position of all buildings
  blueprint?: buildingData;
}

interface buildingData {
  center: Coord;
  spawn: Coord;
  tower: Coord;
  storage: Coord;
  link: Coord;
  terminal: Coord;
}

// WIP:
// ProgramOutpost reduces CPU usage as much as possible and acts as a forward spawn point.
// It should only harvest energy, and attempt to upgrade the controller as little as possible.
// Minimal layout for an outpost is to surround the controller with:
//  - Spawn
//  - Tower
//  - Storage
//  - Link
//  - Terminal
// TODO: Extension filling from storage.
@profile
export class ProgramOutpost extends Process<ProgramOutpostData> {
  public static type = "outpost";

  public constructor(pid: number) {
    super(pid);
  }

  public static new(roomName: string) {
    return Process.newProgram<ProgramOutpostData>(ProgramOutpost.type, `${roomName}_outpost`, {
      roomName: roomName
    });
  }

  private get room(): Room {
    return Game.rooms[this.data.roomName];
  }

  public execute(): ProcessCode {
    if (this.data.invalid) {
      // Nothing to do
      return ProcessCode.ERROR;
    }

    if (!this.data.spawnPid) {
      this.data.spawnPid = this.launchChildProcess(ProgramSpawnControl.new(this.data.roomName));
    }

    if (!this.data.towersPid) {
      this.data.towersPid = this.launchChildProcess(ProgramTowerDefense.new(this.data.roomName));
    }

    return ProcessCode.SUCCESS;
  }

  public static createBlueprint(room: Room): buildingData | undefined {
    const blueprint = layout(room);
    if (!blueprint) {
      return;
    }

    return {
      center: blueprint.center,
      spawn: blueprint.spawnCoord,
      storage: blueprint.storageCoord,
      tower: blueprint.freeTiles[0],
      link: blueprint.freeTiles[1],
      terminal: blueprint.freeTiles[2]
    };
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramOutpost.type, ProgramOutpost);

// @ts-ignore
global.OutpostLayout = function (roomName: string) {
  const room = Game.rooms[roomName];
  if (!room) {
    return `No room with name ${roomName}. It might not be visible?`;
  }

  const blueprint = ProgramOutpost.createBlueprint(room);
  if (!blueprint) {
    return "No valid blueprint found for this room.";
  }

  room.createFlag(blueprint.center.x, blueprint.center.y, `${room.name}_center`, COLOR_WHITE);
  room.createFlag(blueprint.spawn.x, blueprint.spawn.y, `${room.name}_spawn`, COLOR_YELLOW);
  room.createFlag(blueprint.tower.x, blueprint.tower.y, `${room.name}_tower`, COLOR_GREY);
  room.createFlag(blueprint.storage.x, blueprint.storage.y, `${room.name}_storage`, COLOR_ORANGE);
  room.createFlag(blueprint.link.x, blueprint.link.y, `${room.name}_link`, COLOR_CYAN);
  room.createFlag(blueprint.terminal.x, blueprint.terminal.y, `${room.name}_terminal`, COLOR_PURPLE);
};

// interface buildingData {
//     center: Coord;
//     spawn: Coord;
//     tower: Coord;
//     storage: Coord;
//     link: Coord;
//     terminal: Coord;
//   }
