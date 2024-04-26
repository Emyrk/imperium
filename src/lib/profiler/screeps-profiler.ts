import { metrics } from "lib/stats/prometheus";
import { BANAN_ENABLED, Banan } from "./decorator";

Banan.instance.init({ autoSaveKey: "banan", maxHistory: 1 });
const bananEnabledMetric = metrics.gauge("banan_enabled");

export function enable() {}

export function wrap(f: () => void) {
  // Stop profiling when the bucket is low.
  const profile = Game.cpu.bucket > 9500;
  if (!profile) {
    Banan.instance.resetHistory();
    bananEnabledMetric.set(0);
  }

  if (profile) {
    Banan.instance.startTick();
    bananEnabledMetric.set(1);
  }
  f();

  if (profile) {
    Banan.instance.endTick();
  }
  // Banan.instance.logInfo();
}
