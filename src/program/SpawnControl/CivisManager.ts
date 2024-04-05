import { Civis } from "civis/Civis";
import { ProgramSpawnControl, SpawnRequest } from "./SpawnControl";
import { TickQueue } from "lib/tick/TickQueue";
import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";

interface pendingCreep {
  name: string;
  checkAt: number;
}

const MAX_CIVIS_ID = 9999999;
export interface ProgramCivisManagerData extends ProcessData {
  spawnerPid: number;
  prefix: string;
  checkAlive: pendingCreep[];
}

export class ProgramCivisManager extends Process<ProgramCivisManagerData> {
  private queued: { [name: string]: SpawnRequest } = {};
  //   private aliveQueue: TickQueue<string> = new TickQueue();

  public static type = "civis-manager";

  public static new(spawnerPid: number, prefix: string) {
    return Process.newProgram<ProgramCivisManagerData>(ProgramCivisManager.type, "civis_manager", {
      spawnerPid,
      prefix,
      roomName: Process.get(spawnerPid)?.data.roomName,
      checkAlive: []
    });
  }

  private static nextID(): number {
    if (!Memory.civisID) {
      Memory.civisID = 1;
    }

    Memory.civisID++;
    if (Memory.civisID > MAX_CIVIS_ID) {
      Memory.civisID = 1;
    }
    return Memory.civisID;
  }

  constructor(pid: number) {
    super(pid);
  }

  private spawner(): ProgramSpawnControl {
    return Process.get(this.data.spawnerPid) as ProgramSpawnControl;
  }

  //   public alive(role?: string): Civis[] {
  //     return [];
  //   }

  public totalQueued(role?: string): number {
    return Object.values(this.queued).filter(r => !role || r.creep.mem.role === role).length;
  }

  public total(role?: string): number {
    return this.totalQueued(role) + this.civis.filter(c => !role || c.creep.memory.role === role).length;
  }

  private onComplete(name: string): (success: boolean) => void {
    return (success: boolean) => {
      delete this.queued[name];
      if (success) {
        this.data.checkAlive.push({ name, checkAt: Game.time + 1 });
      }
    };
  }

  public requestCreep(
    body: BodyPartConstant[],
    mem: CreepMemory,
    priority: number = 0,
    prefix: string = this.data.prefix
  ): string {
    const name = `${prefix}_${ProgramCivisManager.nextID()}`;
    const request: SpawnRequest = {
      creep: {
        mem: mem,
        bodyParts: body,
        name: name
      },
      priority: priority,
      onComplete: this.onComplete(name)
    };

    this.spawner().requestCreep(request);
    this.queued[request.creep.name] = request;
    return request.creep.name;
  }

  public execute(): ProcessCode {
    const names = _.remove(this.data.checkAlive, c => Game.time >= c.checkAt);
    for (const pending of names) {
      const creep = Game.creeps[pending.name];
      if (!creep) {
        log.error(`Civis ${pending.name} is not alive`);
        continue;
      }
      this.assignCivis(Game.creeps[pending.name]);
    }

    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    Object.keys(this.queued).forEach(name => {
      this.spawner().cancelRequest(name);
    });
    return ProcessCode.SUCCESS;
  }
}

Process.register(ProgramCivisManager.type, ProgramCivisManager);
