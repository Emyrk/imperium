import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { metrics, sample } from "lib/stats/prometheus";

const MAX_PROMISE_ID = 9999999;

// SavedState allows for different processes to share state.
// I really don't like this... it should be made better.
//
// MemArgs persist to memory, HeapArgs do not. HeapArgs do not survive a global reset.
@profile
export class SavedState<MemArgs, HeapArgs> {
  private static totalCount = metrics.gauge("saved_state_total_count", {});
  public static _byID: { [id: string]: SavedState<any, any> } = {};

  public static get<MemArgs, HeapArgs>(id: string): SavedState<MemArgs, HeapArgs> | null {
    if (!Memory.savedStates[id]) {
      return null;
    }

    if (!SavedState._byID[id]) {
      SavedState._byID[id] = new SavedState(id);
    }
    return SavedState._byID[id];
  }

  public static stats() {
    if (!sample()) {
      return;
    }
    SavedState.totalCount.set(Object.keys(Memory.savedStates).length);
  }

  public static loop() {
    if (Game.time % 25 === 0) {
      SavedState.cleanup();
    }
    SavedState.stats();
  }

  public static cleanup() {
    for (const id in Memory.savedStates) {
      if (!Memory.savedStates[id].deadline) {
        SavedState.cleanupByID(id);
      }
      if (Memory.savedStates[id].deadline <= Game.time) {
        SavedState.cleanupByID(id);
      }
    }
  }

  public static init(): void {
    if (!Memory.savedStates) {
      Memory.savedStates = {};
    }
  }

  public static newSavedState<MemArgs, HeapArgs>(
    argument: MemArgs,
    heap?: HeapArgs,
    timeout: number = 1000
  ): SavedState<MemArgs, HeapArgs> {
    const id = SavedState.nextID;
    Memory.savedStates[id] = {
      id,
      // Inputs
      memory: argument,
      // Info
      lastTouched: Game.time,
      deadline: Game.time + timeout
    };

    return new SavedState(id, heap);
  }

  private static get nextID(): string {
    if (!Memory.nextStateID || Memory.nextStateID > MAX_PROMISE_ID) {
      Memory.nextStateID = 1;
    }
    return `st${Memory.nextStateID++}`;
  }

  public id: string;
  public heap?: HeapArgs;

  constructor(id: string, heapArgs?: HeapArgs) {
    this.id = id;
    this.heap = heapArgs;
    SavedState._byID[id] = this;
  }

  get memory(): MemArgs {
    return Memory.savedStates[this.id].memory;
  }

  set memory(data: MemArgs) {
    Memory.savedStates[this.id].memory = data;
  }

  setTimeout(timeout: number) {
    if (this.deleted()) {
      throw new Error("Cannot extend the timeout of a deleted promise.");
    }
    Memory.savedStates[this.id].deadline += Game.time + timeout;
  }

  deleted(): boolean {
    return !(this.id in Memory.savedStates);
  }

  exists(): boolean {
    return !this.deleted();
  }

  updateMemory(mem: MemArgs) {
    if (this.deleted()) {
      throw new Error("Cannot update saved state arguments after it has been deleted.");
    }
    this.memory = mem;
    Memory.savedStates[this.id].lastTouched = Game.time;
  }

  get lastTouched(): number {
    return Memory.savedStates[this.id].lastTouched;
  }

  static cleanupByID(id: string) {
    delete Memory.savedStates[id];
    delete SavedState._byID[id];
  }

  done() {
    log.debug(`SavedState ${this.id} was deleted (done).`);
    SavedState.cleanupByID(this.id);
  }
}
