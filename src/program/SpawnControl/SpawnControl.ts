import { ProtoSpawnCreep, energyCost, simpleBodyString } from "civis/creep";
import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { Visualizer } from "lib/visualizer/Visualizer";

export interface SpawnRequest {
  creep: ProtoSpawnCreep;

  // Queue specific fields
  priority: number;
  onComplete: (success: boolean) => void;
  // Tick request was made. For tracking
  requestedAt: number;
}

interface HasSpawn {
  spawn(): ProgramSpawnControl;
}

export interface ProgramSpawnControlData extends ProcessData {
  // blockSpawnDirections prevents spawning in this direction by default.
  blockSpawnDirections: { [ref: string]: DirectionConstant[] };
}

@profile
export class ProgramSpawnControl extends Process<ProgramSpawnControlData> {
  public static type = "spawn";
  private sortedQueue: SpawnRequest[] = [];

  static getByRoom(roomName: string): ProgramSpawnControl | undefined {
    const pid = Memory.rooms[roomName].villagePid;
    if (!pid) {
      return undefined;
    }
    return (Process.get(pid)! as unknown as HasSpawn).spawn();
  }

  constructor(pid: number) {
    super(pid);
  }

  public static new(roomName: string) {
    return Process.newProgram<ProgramSpawnControlData>(ProgramSpawnControl.type, `${roomName}_spawn`, {
      roomName: roomName,
      blockSpawnDirections: {}
    });
  }

  private get room(): Room | null {
    return Game.rooms[this.memory.data.roomName];
  }

  public requestCreep(request: Omit<SpawnRequest, "requestedAt">): void {
    if (request.creep.spawnID) {
      if (!this.room?.spawns.find(spawn => spawn.id === request.creep.spawnID)) {
        log.error(
          `${this.data.roomName} SpawnControl: SpawnID ${request.creep.spawnID} not found, but was requested. Ditching the request.`
        );
        request.onComplete(false);
        return;
      }
    }

    insertRequest(this.sortedQueue, { ...request, requestedAt: Game.time });
    this.resetVisuals();
  }

  public cancelRequest(name: string): void {
    deleteRequest(this.sortedQueue, name);
    this.resetVisuals();
  }

  private cachedSpawnDirections: { [ref: string]: DirectionConstant[] } = {};
  private spawnDirections(spawn: StructureSpawn): DirectionConstant[] {
    if (!this.data.blockSpawnDirections) {
      this.data.blockSpawnDirections = {};
    }

    if (this.cachedSpawnDirections[spawn.id]) {
      return this.cachedSpawnDirections[spawn.id];
    }

    let all = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
    if (this.data.blockSpawnDirections[spawn.id]) {
      this.cachedSpawnDirections[spawn.id] = all.filter(dir => !this.data.blockSpawnDirections[spawn.id].includes(dir));
      return this.cachedSpawnDirections[spawn.id];
    }
    return all;
  }

  public blockSpawnDirection(spawnID: string, dir: DirectionConstant) {
    if (!this.data.blockSpawnDirections[spawnID]) {
      this.data.blockSpawnDirections[spawnID] = [];
    }
    this.data.blockSpawnDirections[spawnID].push(dir);
    delete this.cachedSpawnDirections[spawnID];
  }

  public execute(): ProcessCode {
    // Visual will always be 1 tick behind. :shrug:
    this.visual();
    if (!this.room) {
      return ProcessCode.ERROR;
    } else if (this.sortedQueue.length === 0) {
      return ProcessCode.SLEEPING;
    }

    // Spawns that are not currently spawning
    const spawns = this.room.openSpawns;
    if (!spawns || spawns.length === 0) {
      return ProcessCode.SLEEPING;
    }

    let avail = this.room.energyAvailable;
    for (const spawn of spawns) {
      if (avail <= 0) {
        break;
      }

      let request = this.sortedQueue[0];
      if (request.creep.spawnID && request.creep.spawnID !== spawn.id) {
        // TODO: Allow other spawns to operate. We need to reorder the request, or fix the .shift() below that
        // pops the request off the queue.
        break;
      }
      const requestCreep = request.creep;
      if (energyCost(requestCreep) <= avail) {
        this.resetVisuals();
        const code = spawn.spawnCreep(requestCreep.bodyParts, requestCreep.name, {
          memory: requestCreep.mem,
          directions: requestCreep.spawnDirection ? [requestCreep.spawnDirection] : this.spawnDirections(spawn)
        });
        switch (code) {
          case OK:
            this.sortedQueue.shift();
            avail -= energyCost(requestCreep);
            request.onComplete(true);
            break;
          case ERR_NAME_EXISTS:
            this.sortedQueue.shift();
            log.error(
              `${this.data.roomName} SpawnControl: error name already exists ${requestCreep.name}/${requestCreep.mem.role} :: ${code}`
            );
            request.onComplete(false);
            break;
          case ERR_NOT_ENOUGH_ENERGY:
            // We should have caught this.
            // So throw an error.
            log.error(`${this.data.roomName} SpawnControl: Not enough energy to spawn ${requestCreep.name}`);
          default:
            log.error(`${this.data.roomName} SpawnControl: error spawning ${requestCreep.name} :: ${code}`);
        }
      }
    }

    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    this.sortedQueue.forEach(req => req.onComplete(false));
    this.resetVisuals();
    return ProcessCode.SUCCESS;
  }

  private resetVisuals(): void {
    delete this.savedVisual;
  }

  // visual will cache the last visual and reuse it until it is required to update.
  private savedVisual?: string;
  visual(coord: Coord = { x: 39.5, y: 39 }): void {
    if (this.savedVisual) {
      // This caching saves a lot.
      // From 0.119 per tick to 0.036 per tick.
      this.room!.visual.import(this.savedVisual);
      return;
    }
    const requests = this.sortedQueue;
    const totalRows = 10;
    const rows = requests.slice(0, totalRows).reduce((acc: string[], req) => {
      if (!req) {
        acc.push("-");
        return acc;
      }
      acc.push(
        `${req.priority} ${req.creep.name.slice(0, 6)} | ${simpleBodyString(req.creep)} | ${energyCost(
          req.creep
        ).toString()}`
      );
      return acc;
    }, []);

    const boxCoords = Visualizer.section(
      `Spawn Control :: ${rows.length}/${requests.length}`,
      { x: coord.x, y: coord.y, roomName: this.room!.name },
      10,
      totalRows
    );

    for (let i = 0; i < rows.length; i++) {
      const coords = Visualizer.sectionRow(boxCoords, i);
      Visualizer.text(rows[i], { x: coords.x, y: coords.y, roomName: this.room!.name });
    }
    this.savedVisual = this.room!.visual.export();
  }
}

Process.register(ProgramSpawnControl.type, ProgramSpawnControl);

export function deleteRequest(requests: SpawnRequest[], name: string) {
  for (let i = 0; i < requests.length; i++) {
    if (requests[i].creep.name === name) {
      requests.splice(i, 1);
      return;
    }
  }
}

export function insertRequest(requests: Omit<SpawnRequest, "onComplete">[], request: Omit<SpawnRequest, "onComplete">) {
  let i = 0;
  for (; i < requests.length; i++) {
    const ele = requests[i];
    if (ele.priority > request.priority) {
      continue;
    }

    if (ele.priority === request.priority) {
      if (energyCost(ele.creep) < energyCost(request.creep)) {
        continue;
      }
    }
    break;
  }

  requests.splice(i, 0, request);
}

Process.register(ProgramSpawnControl.type, ProgramSpawnControl);
