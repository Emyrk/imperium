import { Civis } from "civis/Civis";
import { CivisIntentsBit, Intents, intentName } from "civis/intents";
import { profile } from "lib/profiler/decorator";
import { exponentialMovingAverage } from "lib/utils/number";

export interface IntentMetric {
  last: number;
  avg: number;
  total: number;
}

@profile
export class IntentMetricCollector {
  private intents: Intents = new Intents();
  public metrics: Record<string, IntentMetric> = {};

  constructor() {}

  start(): void {
    this.intents.reset();
  }

  end(): number {
    let total = 0;
    // Hard code this list, no loops. I hope this is fast.
    total += this.endIntent(CivisIntentsBit.Attack);
    total += this.endIntent(CivisIntentsBit.AttackController);
    total += this.endIntent(CivisIntentsBit.Build);
    total += this.endIntent(CivisIntentsBit.Dismantle);
    total += this.endIntent(CivisIntentsBit.Harvest);
    total += this.endIntent(CivisIntentsBit.Heal);
    total += this.endIntent(CivisIntentsBit.Move);
    total += this.endIntent(CivisIntentsBit.Pickup);
    total += this.endIntent(CivisIntentsBit.RangedAttack);
    total += this.endIntent(CivisIntentsBit.RangedHeal);
    total += this.endIntent(CivisIntentsBit.Repair);
    total += this.endIntent(CivisIntentsBit.ReserveController);
    total += this.endIntent(CivisIntentsBit.SignController);
    total += this.endIntent(CivisIntentsBit.Transfer);
    total += this.endIntent(CivisIntentsBit.UpgradeController);
    total += this.endIntent(CivisIntentsBit.Withdraw);
    return total;
  }

  endIntent(bit: CivisIntentsBit): number {
    const last = this.intents.read(bit);
    const lastMetric = this.metrics[intentName(bit)];
    if (!lastMetric) {
      this.metrics[intentName(bit)] = { last: last, avg: last, total: last };
    } else {
      this.metrics[intentName(bit)] = {
        last: last,
        avg: exponentialMovingAverage(lastMetric.avg, last, 100),
        total: lastMetric.total + last
      };
    }

    return last;
  }

  include(civis: Civis): void {
    this.intents.merge(civis.intents);
  }
}
