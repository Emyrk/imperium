import { Civis, CivisRunCode } from "civis/Civis";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { RecordTiming, Timing } from "./timing";

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
@profile
export abstract class Process<DataType extends ProcessData> {
  public pid: number;
  private _children: (Process<any> | undefined)[];
  private _civis: { [creepName: string]: Civis } = {};

  // When you print "top", you can see the last exec return.
  _lastExec: ProcessCode = ProcessCode.SUCCESS;
  // Whole time it took to do "run()".
  //  Includes children execution.
  //  Includes civis execution.
  _processTiming?: Timing;
  // Includes only "execute". No children. No civis.
  _processTimingSelf?: Timing;
  // Includes only civis execution.
  _processTimingCivis?: Timing;
  _processCivisQuantity: number = 0;

  // First tick since global reset or spawn
  _firstTick: number = 0;

  public static newProgram<Data extends ProcessData>(
    type: string,
    label: string,
    data: Omit<Data, "creeps">
  ): NewProcessProto<Data> {
    return {
      type: type,
      label: label,
      data: {
        ...data,
        creeps: []
        // This is so jank and weird
      } as unknown as Data
    };
  }

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
    this._firstTick = Game.time;
  }

  public get civis(): Civis[] {
    return Object.values(this._civis);
  }

  public assignCivis(creep: Creep) {
    this._civis[creep.name] = new Civis(creep);
    this.memory.data.creeps.push(creep.name);
  }

  private get creepNames(): string[] {
    return this.memory.data.creeps;
  }

  get label(): string {
    return this.memory.label;
  }

  get data(): DataType {
    return this.memory.data;
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
    const start = Game.cpu.getUsed();
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
    this._processTimingSelf = RecordTiming(start, this._processTiming);

    const civisStart = Game.cpu.getUsed();
    // Run the creeps
    Object.values(this._civis).forEach(civis => {
      const code = civis.run();
      if (code === CivisRunCode.Dead) {
        delete this._civis[civis.name];
        this.memory.data.creeps = this.memory.data.creeps.filter(name => name !== civis.name);
        delete Memory.creeps[civis.name];
      }
    });

    this._processCivisQuantity = this.civis.length;
    if (this.civis.length > 0 || this._processTimingCivis) {
      this._processTimingCivis = RecordTiming(civisStart, this._processTimingCivis);
    }

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
    this._processTiming = RecordTiming(start, this._processTiming);
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
    if (!Memory.scheduler) {
      Memory.scheduler = {
        pidCounter: 1
      };
    }
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

  public static runRootPIDs() {
    if (!Memory.processes) {
      Memory.processes = {};
    }

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
