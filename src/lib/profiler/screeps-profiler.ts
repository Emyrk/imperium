import { Banan } from "./decorator";

Banan.instance.init({ autoSaveKey: "banan", maxHistory: 1 });

export function enable() {}

export function wrap(f: () => void) {
  Banan.instance.startTick();
  f();

  Banan.instance.endTick();
  // Banan.instance.logInfo();
}
