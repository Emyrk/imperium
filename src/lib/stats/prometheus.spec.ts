import { describe, it, expect, beforeEach } from "vitest";
import { metrics } from "./prometheus";

interface Copy_HeapStatistics {
  total_heap_size: number;
  total_heap_size_executable: number;
  total_physical_size: number;
  total_available_size: number;
  used_heap_size: number;
  heap_size_limit: number;
  malloced_memory: number;
  peak_malloced_memory: number;
  does_zap_garbage: 0 | 1;
  externally_allocated_size: number;
}

describe("Prometheus", () => {
  beforeEach(() => {
    metrics.reset();
  });

  it("basic gauge", () => {
    const gauge = metrics.group("room", { room: "E11S53" }).gauge("tick", {});
    gauge.set(100);
    expect(metrics.json()).toMatchSnapshot();
  });

  it("cpu group", () => {
    const cpu = metrics.group("cpu");
    const limit = cpu.gauge("limit").set(10000);
    const heap = cpu.object("heap_statistics").set({
      total_heap_size: 100,
      total_heap_size_executable: 100,
      total_physical_size: 100,
      total_available_size: 100,
      used_heap_size: 100,
      heap_size_limit: 100,
      malloced_memory: 100,
      peak_malloced_memory: 100,
      does_zap_garbage: 0,
      externally_allocated_size: 100
    } as Copy_HeapStatistics);
    expect(metrics.json()).toMatchSnapshot();
  });

  it("nested group", () => {
    const global = metrics.group("global", { foo: "bar" });
    const room = global.group("room", { room: "E11S53" });
    const controller = room.group("controller", { owner: "me" });
    controller.gauge("level").set(100);
    expect(metrics.json()).toMatchSnapshot();
  });

  it("cleared group", () => {
    const global = metrics.group("global", { foo: "bar" });
    const room = global.group("room", { room: "E11S53" });
    const controller = room.group("controller", { owner: "me" });
    controller.gauge("level").set(100);
    room.reset();
    expect(metrics.json()).toMatchSnapshot();
  });

  it("nameless group", () => {
    const room = metrics.group("room");
    const labeledRoom = room.group("", { room: "E11S53" });
    const controller = labeledRoom.group("controller", { owner: "me" });
    controller.gauge("level").set(100);
    expect(metrics.json()).toMatchSnapshot();
  });

  it("object key label", () => {
    const room = metrics.group("room");
    const intents = room.objectKeyLabel("intents", "intent");
    intents.set({
      harvest: 1,
      upgrade: 2
    });

    expect(metrics.json()).toMatchSnapshot();
  });
});
