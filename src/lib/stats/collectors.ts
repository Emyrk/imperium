import { profile } from "lib/profiler/decorator";
import { Gauge, metrics } from "./prometheus";
import { RecordTiming, Timing } from "kernel/timing";

interface RoomMetrics {
  tick: Gauge;

  controller_rcl_level: Gauge;
  controller_progress: Gauge;
  controller_progress_total: Gauge;

  storage_energy: Gauge;
  storage_used_total: Gauge;
  storage_free_total: Gauge;

  terminal_energy: Gauge;
  terminal_used_total: Gauge;
  terminal_free_total: Gauge;
}

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

  private room;
  private rooms: { [room: string]: RoomMetrics } = {};

  constructor() {
    this.ensureRoomMemory();
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

    // rooms
    this.room = metrics.group("room");

    this.collect(true);
  }

  private cpuUsed?: Timing;
  private collect(force: boolean): void {
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

    // Collect all rooms
    this.collectRooms();
  }

  private collectRooms(): void {
    // Create missing rooms
    const collectRooms = Memory.stats.collectors.rooms;

    for (const roomName of collectRooms) {
      if (this.rooms[roomName] === undefined) {
        // Create it
        const roomMetrics: RoomMetrics = {
          tick: this.room.gauge("tick", { room: roomName }),

          controller_rcl_level: this.room.gauge("controller_rcl_level", { room: roomName }),
          controller_progress: this.room.gauge("controller_progress", { room: roomName }),
          controller_progress_total: this.room.gauge("controller_progress_total", { room: roomName }),

          storage_energy: this.room.gauge("storage_energy", { room: roomName }),
          storage_used_total: this.room.gauge("storage_used_total", { room: roomName }),
          storage_free_total: this.room.gauge("storage_free_total", { room: roomName }),

          terminal_energy: this.room.gauge("terminal_energy", { room: roomName }),
          terminal_used_total: this.room.gauge("terminal_used_total", { room: roomName }),
          terminal_free_total: this.room.gauge("terminal_free_total", { room: roomName })
        };
        this.rooms[roomName] = roomMetrics;
      }
    }
    // TODO: If you delete a room, we should remove it from the collector.
    Object.keys(this.rooms).forEach(roomName => {
      const metrics = this.rooms[roomName];
      const room = Game.rooms[roomName];
      if (!room) {
        // Room is not visible, skip it.
        return;
      }
      metrics.tick.set(Game.time);

      const controller = room.controller;
      if (controller) {
        metrics.controller_rcl_level.set(controller.level);
        metrics.controller_progress.set(controller.progress);
        metrics.controller_progress_total.set(controller.progressTotal);
      }

      const storage = room.storage;
      if (storage) {
        metrics.storage_energy.set(storage.store.energy);
        metrics.storage_used_total.set(storage.store.getUsedCapacity());
        metrics.storage_free_total.set(storage.store.getFreeCapacity());
      }

      const terminal = room.terminal;
      if (terminal) {
        metrics.terminal_energy.set(terminal.store.energy);
        metrics.terminal_used_total.set(terminal.store.getUsedCapacity());
        metrics.terminal_free_total.set(terminal.store.getFreeCapacity());
      }
    });
  }

  private ensureRoomMemory(): void {
    if (Memory.stats === undefined) {
      Memory.stats = {
        persistent: {
          avgCPU: 0,
          lastGlobalReset: Game.time
        },
        collectors: {
          rooms: []
        }
      };
    }

    if (Memory.stats.collectors === undefined) {
      Memory.stats.collectors = {
        rooms: []
      };
    }
  }

  private update: boolean = false;
  trackRoom(room: Room): void {
    if (!Memory.stats.collectors.rooms.includes(room.name)) {
      Memory.stats.collectors.rooms.push(room.name);
      this.update = true;
    }
  }

  loop(): void {
    let force = false;
    if (this.update) {
      force = true;
      this.update = false;
    }
    this.collect(force);

    this.cpuUsed = RecordTiming(0, this.cpuUsed);
  }
}
