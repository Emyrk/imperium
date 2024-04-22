import { NewProcessProto, Process, ProcessCode } from "kernel/Process";
import { ProgramSpawnControl, SpawnRequest } from "./SpawnControl";
import { log } from "lib/log/log";
import { energyCost } from "civis/creep";

interface pendingCreep {
  name: string;
  checkAt: number;
}

// BootstrapBody covers the "bootstrap" problem. Where if you run
// out of energy, your requested creep is too expensive to spawn.
// So you need to spawn a cheaper creep to get the energy to spawn
// more.
//
// After X stale time for a request, the body will change to the bootstrapBody
export interface BootstrapBody {
  body: BodyPartConstant[];
  bootstrapBody: BodyPartConstant[];
  staleTime: number;
}

const MAX_CIVIS_ID = 9999999;

export interface CivisProgramData extends ProcessData {
  civisProgram: {
    spawnerPid?: number;
    prefix: string;
    checkAlive: pendingCreep[];
  };
}

// CivisProgram handles managing civis and the spawn controller.
export abstract class CivisProgram<DataType extends CivisProgramData> extends Process<DataType> {
  private queued: { [name: string]: SpawnRequest } = {};
  private bootStrapBodies: { [name: string]: { body: BootstrapBody; req: SpawnRequest } } = {};

  public static newCivisProgram<Data extends CivisProgramData>(
    type: string,
    label: string,
    // You can always set this later
    spawnPid: number | undefined,
    prefix: string,
    data: Omit<Data, keyof CivisProgramData> & { roomName: string }
  ): NewProcessProto<Data> {
    return {
      type: type,
      label: label,
      data: {
        ...data,
        creeps: [],
        civisProgram: {
          spawnerPid: spawnPid,
          prefix: prefix,
          checkAlive: []
        }
        // This is so jank and weird
      } as unknown as Data
    };
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

  public setSpawnPid(pid: number): void {
    this.data.civisProgram.spawnerPid = pid;
  }

  private spawner(): ProgramSpawnControl {
    if (!this.data.civisProgram.spawnerPid) {
      throw new Error("No spawner pid set");
    }
    return Process.get(this.data.civisProgram.spawnerPid) as ProgramSpawnControl;
  }

  constructor(pid: number) {
    super(pid);
  }

  public totalQueued(role?: string): number {
    return Object.values(this.queued).filter(r => !role || r.creep.mem.role === role).length;
  }

  public total(role?: string): number {
    return this.totalQueued(role) + this.alive(role);
  }

  public alive(role?: string): number {
    return this.civis.filter(c => !role || c.creep.memory.role === role).length;
  }

  private onComplete(name: string): (success: boolean) => void {
    return (success: boolean) => {
      // We need to delete the queued request on the next game tick
      if (success) {
        this.data.civisProgram.checkAlive.push({ name, checkAt: Game.time + 1 });
      } else {
        // It failed, so remove from the queue
        delete this.queued[name];
        delete this.bootStrapBodies[name];
      }
    };
  }

  public requestCreep(
    body: BodyPartConstant[] | BootstrapBody,
    mem: CreepMemory,
    priority: number = 0,
    prefix: string = this.data.civisProgram.prefix
  ): string {
    let bodyParts: BodyPartConstant[];
    if ("body" in body) {
      bodyParts = body.body;
    } else {
      bodyParts = body;
    }

    const name = `${prefix}_${CivisProgram.nextID()}`;
    const request: SpawnRequest = {
      creep: {
        mem: mem,
        bodyParts: bodyParts,
        name: name
      },
      priority: priority,
      onComplete: this.onComplete(name),
      requestedAt: Game.time
    };

    // Tracked!
    if ("body" in body) {
      this.bootStrapBodies[name] = { body, req: request };
    }

    this.spawner().requestCreep(request);
    this.queued[request.creep.name] = request;
    return request.creep.name;
  }

  public execute(): ProcessCode {
    const names = _.remove(this.data.civisProgram.checkAlive, c => Game.time >= c.checkAt);
    for (const pending of names) {
      // Always delete from the queue
      delete this.queued[pending.name];
      delete this.bootStrapBodies[pending.name];

      const creep = Game.creeps[pending.name];
      if (!creep) {
        log.error(`Civis ${pending.name} is not alive`);
        continue;
      }
      this.assignCivis(Game.creeps[pending.name]);
    }

    // This does not need to be run every tick.
    if (Game.time % 25 === 0) {
      Object.values(this.bootStrapBodies).forEach(({ body, req }) => {
        if (req.requestedAt + body.staleTime < Game.time) {
          // Oof, we have a stale request we need to update.
          // Cancel the original request
          this.spawner().cancelRequest(req.creep.name);

          // Update the body
          req.creep.bodyParts = body.bootstrapBody;
          // Re-request
          this.spawner().requestCreep(req);
          // Log for later.
          log.warning(
            `Creep ${req.creep.name} is stale, detected bootstrap spawn problem.  Updating body to cost ${energyCost(
              req.creep.bodyParts
            )}`
          );
        }
      });
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
