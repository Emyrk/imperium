import { Civis } from "civis/Civis";
import { profile } from "lib/profiler/decorator";

export interface IntentMetric {
  last: number;
  avg: number;
  total: number;
}

@profile
export class IntentMetricCollector {
  private intents: number = 0;
  private offensiveIntents: number = 0;

  private last: Record<string, number> = {};
  constructor() {}

  start(): void {
    this.intents = 0;
    this.offensiveIntents = 0;
  }

  end(): void {
    // Loop through all intents, build the metrics
    for (let i = 0; i < 64; i++) {}
  }

  include(civis: Civis): void {
    // this.intents += civis.intents;
    // this.offensiveIntents += civis.offensiveIntents;
  }

  //   toJSON(): Record<CivisIntents, number> {
  //     return this.intents;
  //   }
}
