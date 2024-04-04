import { Civis, CivisRunCode } from "civis/Civis";
import { log } from "lib/log/log";

const MAX_PID_NUMBER = 99999;
export enum ProcessCode {
  SUCCESS = 0,
  SLEEPING = 1,
  ERROR = 2,
  TERMINATE = 3
}

type ProgramConstructor<T extends ProcessData> = new (pid: number) => Process<T>;
export type NewProcessProto<DataType extends ProcessData> = Omit<ProtoProcess<DataType>, "scheduled">;

// TODO: Somehow manage creeps here.
export abstract class Process<DataType extends ProcessData> {
  public pid: number;
  private _children: (Process<any> | undefined)[];
  private _civis: { [creepName: string]: Civis } = {};

  // When you print "top", you can see the last exec return.
  _lastExec: ProcessCode = ProcessCode.SUCCESS;

  constructor(pid: number) {
    this.pid = pid;
    this._children = this.scheduled.children.map(pid => Process.initializeProgram(pid));
    this.creepNames.filter(name => {
      const creep = Game.creeps[name];
      if (!creep) {
        return false;
      }

      this._civis[name] = new Civis(creep);
      return true;
    });
  }

  public assignCivis(creep: Creep) {
    this._civis[creep.name] = new Civis(creep);
    this.memory.data.creeps.push(creep.name);
  }

  private get creepNames(): string[] {
    return this.memory.data.creeps;
  }

  get memory(): ProtoProcess<DataType> {
    return Memory.processes[this.pid];
  }

  get scheduled(): ScheduledProcess {
    return this.memory.scheduled;
  }

  private removeChild(childPid: number) {
    this._children = this._children.filter(c => c?.pid !== childPid);
    this.scheduled.children = this.scheduled.children.filter(c => c !== childPid);
  }

  public run(): ProcessCode {
    let ret = ProcessCode.SUCCESS;

    // Run the process
    try {
      if (this.scheduled.sleepUntil && this.scheduled.sleepUntil > Game.time) {
        ret = ProcessCode.SLEEPING;
      } else {
        // This can throw an error if your code sucks. Don't bring everything down.
        ret = this.execute();
      }
    } catch (e) {
      const err = e as Error;
      log.error(`${err.name}| Error in process ${this.pid} '${this.memory.label}' on execute: ${e}`);
      if (err.stack) {
        log.error(err.stack);
      }
      ret = ProcessCode.ERROR;
    }

    // Run the creeps
    Object.values(this._civis).forEach(civis => {
      const code = civis.run();
      if (code === CivisRunCode.Dead) {
        delete this._civis[civis.name];
        this.memory.data.creeps = this.memory.data.creeps.filter(name => name !== civis.name);
      }
    });

    // Run the children
    this._children.forEach(child => {
      if (!child) {
        if (Game.time % 15 === 0) {
          log.warning(`Child process not found for ${this.pid}`);
        }
        return;
      }
      const childRet = child.run();
      if (childRet === ProcessCode.TERMINATE) {
        child.terminate();
        // Remove both from the list of children
        this.removeChild(child.pid);
      }
    });

    this._lastExec = ret;
    return ret;
  }

  public terminate(): ProcessCode {
    this._children.forEach(child => {
      if (!child) {
        return;
      }
      child.terminate();
      this.removeChild(child.pid);
    });

    const ret = this.selfTerminate();
    delete Process._processByPid[this.pid];

    return ret;
  }

  public launchChildProcess<ChildDataType extends ProcessData>(newProgram: NewProcessProto<ChildDataType>): number {
    return Process.launchChildProcess(this.pid, newProgram);
  }

  public abstract execute(): ProcessCode;
  abstract selfTerminate(): ProcessCode;

  // *******************
  // *                 *
  // *  Static Methods *
  // *                 *
  // *******************

  // Registered list of processes
  private static programs: { [type: string]: ProgramConstructor<any> } = {};
  static register<T extends ProcessData>(type: string, program: ProgramConstructor<T>) {
    Process.programs[type] = program;
  }

  static _processByPid: { [pid: number]: Process<any> } = {};
  public static initializeProgram(pid: number): Process<any> | undefined {
    const proto = Memory.processes[pid];
    if (!proto) {
      return;
    }

    if (Process._processByPid[pid]) {
      return Process._processByPid[pid];
    }

    const program = Process.programs[proto.type];
    if (!program) {
      log.error(`No program found for process type ${proto.type}`);
      return;
    }

    const process = new program(pid);
    Process._processByPid[pid] = process;
    return process;
  }

  static nextPid() {
    if (!Memory.scheduler.pidCounter || Memory.scheduler.pidCounter >= MAX_PID_NUMBER) {
      Memory.scheduler.pidCounter = 1;
    }
    return Memory.scheduler.pidCounter++;
  }

  public static launchProcess<DataType extends ProcessData>(proto: NewProcessProto<DataType>): number {
    const pid = Process.nextPid();

    Memory.processes[pid] = {
      scheduled: {
        pid: pid,
        parent: null,
        children: []
      },
      ...proto
    };
    return pid;
  }

  public static launchChildProcess<DataType extends ProcessData>(
    parent: number,
    proto: NewProcessProto<DataType>
  ): number {
    const pid = this.launchProcess(proto);
    Memory.processes[parent].scheduled.children.push(pid);
    Memory.processes[pid].scheduled.parent = parent;

    // Also need to push to the heap process.

    return pid;
  }

  public runRootPIDs() {
    Object.values(Memory.processes).forEach(proto => {
      if (proto.scheduled.parent) {
        // The parent will execute this process.
        return;
      }

      const process = Process.initializeProgram(proto.scheduled.pid);
      if (!process) {
        return;
      }
      process.run();
    });
  }
}

// export class ProgramExample extends Process<ProgramExampleData> {
//   /// .....
// }

// Process.register(ProgramExample.type, ProgramExample);
