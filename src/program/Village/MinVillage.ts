import { Process, ProcessCode } from "kernel/Process";
import { profile } from "lib/profiler/decorator";
import { ProgramSpawnControl } from "program/SpawnControl/SpawnControl";
import { ProgramTowerDefense } from "program/TowerDefense/TowerDefense";

export interface ProgramMinimalVillageData extends ProcessData {
  spawnPid?: number;
  towersPid?: number;
  layout?: {
    center: Coord;
  };
}

// WIP:
// ProgramMinimalVillage reduces CPU usage as much as possible.
// Creeps:
//  - Harvester: 6 work, 6 move, 2 Carry = 1000e (20 x 50e extensions)
//  - Maintainer:
@profile
export class ProgramMinimalVillage extends Process<ProgramMinimalVillageData> {
  public static type = "min-village";

  public constructor(pid: number) {
    super(pid);
  }

  public static new(roomName: string) {
    return Process.newProgram<ProgramMinimalVillageData>(ProgramMinimalVillage.type, `${roomName}_min_village`, {
      roomName: roomName
    });
  }

  private get room(): Room {
    return Game.rooms[this.data.roomName];
  }

  public execute(): ProcessCode {
    if (!this.data.spawnPid) {
      this.data.spawnPid = this.launchChildProcess(ProgramSpawnControl.new(this.data.roomName));
    }

    if (!this.data.towersPid) {
      this.data.towersPid = this.launchChildProcess(ProgramTowerDefense.new(this.data.roomName));
    }

    return ProcessCode.SUCCESS;
  }

  public static layout(room: Room): void {}

  public static layoutCenter(room: Room): Coord | undefined {
    // Minimal layout for a village is to surround the controller with:
    //  - Spawn
    //  - Tower
    //  - Storage
    //  - Link
    //  - Terminal

    // Find a 3x3 box of open space to place the creep surrounded by
    // buildings.
    const controller = room.controller!;
    // Check the ring around the controller.
    // Start at the top left.
    let candidates = candidateRing({ x: controller.pos.x, y: controller.pos.y }, 2);
    const terrain = room.getTerrain();

    let index = 0;
    CandidateLoop: for (index; index < candidates.length; index++) {
      // Find a candidate that will work.
      const coord = candidates[index];
      // Check the box
      for (let x = coord.x - 1; x <= coord.x + 1; x++) {
        for (let y = coord.y - 1; y <= coord.y + 1; y++) {
          if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
            continue CandidateLoop;
          }
        }
      }
      break CandidateLoop;
    }

    // return the coord of the candidate that passed.
    if (index < candidates.length) {
      return candidates[index];
    }
    return undefined;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

export function candidateRing(coord: Coord, distance: number): Coord[] {
  // Start is top left. Go right until you hit the wall
  const start = { x: coord.x - distance, y: coord.y - distance };
  let current = start;
  const list = [start];
  // Top row
  for (let i = 0; i < distance * 2; i++) {
    current = { x: current.x + 1, y: current.y };
    list.push(current);
  }
  // Right wall
  for (let i = 0; i < distance * 2; i++) {
    current = { x: current.x, y: current.y + 1 };
    list.push(current);
  }
  // Bottom row
  for (let i = 0; i < distance * 2; i++) {
    current = { x: current.x - 1, y: current.y };
    list.push(current);
  }
  // Left wall
  for (let i = 0; i < distance * 2 - 1; i++) {
    current = { x: current.x, y: current.y - 1 };
    list.push(current);
  }

  return list;
}

Process.register(ProgramMinimalVillage.type, ProgramMinimalVillage);
