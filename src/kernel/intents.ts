import { Civis } from "civis/Civis";
import { Intents } from "civis/intents";
import { profile } from "lib/profiler/decorator";

export interface IntentMetric {
  last: number;
  avg: number;
  total: number;
}

@profile
export class IntentMetricCollector {
  private intents: Intents = new Intents();

  private last: Record<string, number> = {};
  constructor() {}

  start(): void {
    this.intents.reset();
  }

  end(): void {
    // Loop through all intents, build the metrics
  }

  include(civis: Civis): void {
    this.intents.merge(civis.intents);
  }

  //   toJSON(): Record<CivisIntents, number> {
  //     return this.last;
  //   }
}
