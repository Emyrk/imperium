import { ProtoSpawnCreep, energyCost } from "civis/creep";
import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";

export interface SpawnRequest {
  creep: ProtoSpawnCreep;

  // Queue specific fields
  priority: number;
  onComplete: (success: boolean) => void;
}

export interface ProgramSpawnControlData extends ProcessData {}

export class ProgramSpawnControl extends Process<ProgramSpawnControlData> {
  public static type = "spawn";
  private sortedQueue: SpawnRequest[] = [];

  public static new(roomName: string) {
    return Process.newProgram<ProgramSpawnControlData>(ProgramSpawnControl.type, `${roomName}_spawn`, {
      roomName: roomName
    });
  }

  private get room(): Room | null {
    return Game.rooms[this.memory.data.roomName];
  }

  public requestCreep(request: SpawnRequest): void {
    insertRequest(this.sortedQueue, request);
  }

  public execute(): ProcessCode {
    if (!this.room) {
      return ProcessCode.ERROR;
    } else if (this.sortedQueue.length === 0) {
      return ProcessCode.SLEEPING;
    }

    // Spawns that are not currently spawning
    const spawns = this.room.openSpawns;
    if (spawns.length === 0) {
      return ProcessCode.SLEEPING;
    }

    let avail = this.room.energyAvailable;
    for (const spawn of spawns) {
      if (avail <= 0) {
        break;
      }

      const request = this.sortedQueue[0];
      const requestCreep = request.creep;
      if (energyCost(requestCreep) <= avail) {
        const code = spawn.spawnCreep(requestCreep.bodyParts, requestCreep.name, { memory: requestCreep.mem });
        switch (code) {
          case OK:
            this.sortedQueue.pop();
            avail -= energyCost(requestCreep);
            request.onComplete(true);
            break;
          case ERR_NAME_EXISTS:
            this.sortedQueue.pop();
            log.error(`${this.data.roomName} SpawnControl: error name already exists ${requestCreep.name} :: ${code}`);
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

    return ProcessCode.SLEEPING;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramSpawnControl.type, ProgramSpawnControl);

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
