import { profile } from "lib/profiler/decorator";
import { metrics } from "./prometheus";
import { RecordTiming, Timing } from "kernel/timing";

// BaseCollector populates a lot of the standard metrics to always
// be collected.
@profile
export class BaseCollector {
  public static sampleInterval = 15;
  private time;

  private gcl_progress;
  private gcl_progress_total;
  private gcl_level;

  private cpu_limit;
  private cpu_bucket;
  private cpu_heapStatistics;
  private cpu_used;

  private memory_used;

  constructor() {
    const game = metrics.group("game");

    // game
    // globalReset only needs to be set once.
    game.gauge("global_reset").set(Game.time);
    this.time = game.gauge("time");

    // gcl
    const gcl = game.group("gcl");
    this.gcl_progress = gcl.gauge("progress");
    this.gcl_progress_total = gcl.gauge("progress_total");
    this.gcl_level = gcl.gauge("level");

    // cpu
    const cpu = game.group("cpu");
    this.cpu_limit = cpu.gauge("limit");
    this.cpu_bucket = cpu.gauge("bucket");
    this.cpu_heapStatistics = cpu.object("heap_statistics");
    this.cpu_used = cpu.object("used");

    // memory
    const memory = game.group("memory");
    this.memory_used = memory.gauge("used");
    this.collect(true);
  }

  private cpuUsed?: Timing;
  collect(force: boolean): void {
    if (!force && Game.time % BaseCollector.sampleInterval !== 0) {
      return;
    }

    this.time.set(Game.time);

    this.gcl_level.set(Game.gcl.level);
    this.gcl_progress.set(Game.gcl.progress);
    this.gcl_progress_total.set(Game.gcl.progressTotal);

    this.cpu_limit.set(Game.cpu.limit);
    this.cpu_bucket.set(Game.cpu.bucket);
    if (Game.cpu.getHeapStatistics) {
      this.cpu_heapStatistics.set(Game.cpu.getHeapStatistics());
    }
    this.cpu_used.set(this.cpuUsed);

    this.memory_used.set(RawMemory.get().length);
  }

  loop(): void {
    this.collect(false);

    this.cpuUsed = RecordTiming(0, this.cpuUsed);
  }
}
