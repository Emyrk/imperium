import { Civis, CivisRunCode } from "civis/Civis";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { RecordTiming, Timing } from "./timing";
import { metrics } from "lib/stats/prometheus";
import { IntentMetricCollector } from "./intents";
import ErrorMapper from "lib/filemap/ErrorMapper";

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
  private _children: (Process<any> | undefined)[] = [];
  private _civis: { [creepName: string]: Civis } = {};
  // Prometheus style metrics. Static group is for all processes.
  private static processMetrics = metrics.group("process");

  // When you print "top", you can see the last exec return.
  _lastExec: ProcessCode = ProcessCode.SUCCESS;

  // Whole time it took to do "run()".
  //  Includes children execution.
  //  Includes civis execution.
  //
  // Process Execution
  // ┌───────────────────────────────────────────────┐
  // │                                               │
  // │ ┌──────────┐ ┌───────────┐ ┌────────────┬───┐ │
  // │ │          │ │           │ │            │|||│ │
  // │ │execute() │ │My Civis() │ │Children()  ||||│ │
  // │ │          │ │           │ │            │|||│ │
  // │ └──────────┘ └───────────┘ └────────────┴───┘ │
  // │                                               │
  // └───────────────────────────────────────────────┘
  //   │          │ │           │                   │
  //   ├──────────┘ └───────────┘                   │
  //   │   Self         Civis                       │
  //   └────────────────────────────────────────────┘
  //                Process
  //
  _processTiming?: Timing; // *Process* execution time.
  // Includes only "execute". No children. No civis.
  _processTimingSelf?: Timing; // *Self* execution time.
  // Includes only civis execution.
  _processTimingCivis?: Timing; // *Civis* execution time.
  _processCivisQuantity: number = 0;
  _processCivisIntents: IntentMetricCollector = new IntentMetricCollector();

  // metrics
  private instanceMetrics;
  private timingProcessMetric;
  private timingCivisMetric;
  private civisCountMetric;
  private timingSelfMetric;
  private civisIntentsMetric;

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

  private reloadChildren() {
    this.scheduled.children.forEach(pid => {
      // If the child already exists, abort
      if (this._children.find(c => c?.pid === pid)) {
        return;
      }
      // No child? Init and push.
      this._children.push(Process.initializeProgram(pid));
    });

    // Remove any children that no longer exist.
    this._children = this._children.filter(c => {
      if (!c) {
        return false;
      }
      return this.scheduled.children.includes(c.pid);
    });
  }

  constructor(pid: number) {
    this.pid = pid;
    this.reloadChildren();
    this.creepNames.filter(name => {
      const creep = Game.creeps[name];
      if (!creep) {
        return false;
      }

      this._civis[name] = new Civis(creep);
      return true;
    });
    this._firstTick = Game.time;

    // Create the instanced metric group for this process.
    this.instanceMetrics = Process.processMetrics.group("instance", {
      room: this.data.roomName || "none",
      type: this.type,
      label: this.label
    });
    this.timingProcessMetric = this.instanceMetrics.object("cpu_process", {});
    this.timingCivisMetric = this.instanceMetrics.object("cpu_civis", {});
    this.timingSelfMetric = this.instanceMetrics.object("cpu_self", {});

    const civisMetrics = this.instanceMetrics.group("civis");
    this.civisCountMetric = civisMetrics.gauge("count");
    this.civisIntentsMetric = civisMetrics.objectKeyLabel("intents", "intent");
  }

  public get civis(): Civis[] {
    return Object.values(this._civis);
  }

  public assignCivis(creep: Creep): void {
    const civis = new Civis(creep);
    this._civis[creep.name] = civis;
    this.memory.data.creeps.push(creep.name);
  }

  private get creepNames(): string[] {
    return this.memory.data.creeps;
  }

  get type(): string {
    return this.memory.type;
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
      const mapped = ErrorMapper.sourceMappedStackTrace(err);
      log.error(mapped);
      ret = ProcessCode.ERROR;
    }
    // Set the executed flag to true.
    this.executed = true;

    this._processTimingSelf = RecordTiming(start, this._processTiming);

    const civisStart = Game.cpu.getUsed();

    // Run the creeps
    this._processCivisIntents.start();
    Object.values(this._civis).forEach(civis => {
      const code = civis.run();
      this._processCivisIntents.include(civis);

      if (code === CivisRunCode.Dead) {
        delete this._civis[civis.name];
        this.memory.data.creeps = this.memory.data.creeps.filter(name => name !== civis.name);
        delete Memory.creeps[civis.name];
        log.info(`Civis ${civis.name} has died, clearing memory.`);
      }
    });

    this._processCivisIntents.end();
    this.civisIntentsMetric.set(this._processCivisIntents.metrics);
    this._processCivisQuantity = this.civis.length;
    if (this.civis.length > 0 || this._processTimingCivis) {
      this._processTimingCivis = RecordTiming(civisStart, this._processTimingCivis);
    }

    // Run the children
    if (this.scheduled.reloadChildren) {
      this.reloadChildren();
      this.scheduled.reloadChildren = false;
    }

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

    // Metrics
    this.timingProcessMetric.set(this._processTiming);
    this.timingCivisMetric.set(this._processTimingCivis);
    this.timingSelfMetric.set(this._processTimingSelf);
    this.civisCountMetric.set(this._processCivisQuantity);
    this.civisIntentsMetric.set(this._processCivisIntents);
    return ret;
  }

  public terminate(): ProcessCode {
    // Ask each child to kill themselves
    this._children.forEach(child => {
      if (!child) {
        return;
      }
      child.terminate();
      this.removeChild(child.pid);
    });

    // Run our own cleanup routine.
    const ret = this.selfTerminate();

    // Remove from our parent.
    if (this.scheduled.parent) {
      Memory.processes[this.scheduled.parent].scheduled.children = Memory.processes[
        this.scheduled.parent
      ].scheduled.children.filter(c => c !== this.pid);
    }

    // Remove from the cache
    delete Process._processByPid[this.pid];

    // Remove this process metrics
    this.instanceMetrics.reset();

    // Remove from memory
    delete Memory.processes[this.pid];

    log.info(`Process ${this.pid} terminated with code ${ret}`);
    return ret;
  }

  public launchChildProcess<ChildDataType extends ProcessData>(newProgram: NewProcessProto<ChildDataType>): number {
    return Process.launchChildProcess(this.pid, newProgram);
  }

  public executed: boolean = false;
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

  static get<Program extends Process<any>>(pid: number): Program | undefined {
    return this.initializeProgram(pid) as Program;
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
      log.error(`[${proto.scheduled.pid}] No program found for process type ${proto.type}`);
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
      Memory.processes = {};
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
    Memory.processes[parent].scheduled.reloadChildren = true;

    return pid;
  }

  public static kill(pid: number): string {
    const process = Process.get(pid);
    if (!process) return `Process '${pid}' not found.`;

    process.terminate();

    return "Killed process.";
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
