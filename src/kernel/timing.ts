import { exponentialMovingAverage } from "lib/utils/number";

export interface Timing {
  firstTick: number;
  total: number;
  last: number;
  avg: number;
}

export function RecordTiming(start: number, last?: Timing): Timing {
  const first = last ? last.firstTick : Game.time;
  const taken = Game.cpu.getUsed() - start;
  return {
    firstTick: first,
    total: last ? last.total + taken : taken,
    last: taken,
    avg: exponentialMovingAverage(taken, last ? last.avg : taken, 100)
  };
}
