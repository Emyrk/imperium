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

  end(): void {
    // Hard code this list, no loops. I hope this is fast.
    this.endIntent(CivisIntentsBit.Attack);
    this.endIntent(CivisIntentsBit.AttackController);
    this.endIntent(CivisIntentsBit.Build);
    this.endIntent(CivisIntentsBit.Dismantle);
    this.endIntent(CivisIntentsBit.Harvest);
    this.endIntent(CivisIntentsBit.Heal);
    this.endIntent(CivisIntentsBit.Move);
    this.endIntent(CivisIntentsBit.Pickup);
    this.endIntent(CivisIntentsBit.RangedAttack);
    this.endIntent(CivisIntentsBit.RangedHeal);
    this.endIntent(CivisIntentsBit.Repair);
    this.endIntent(CivisIntentsBit.ReserveController);
    this.endIntent(CivisIntentsBit.SignController);
    this.endIntent(CivisIntentsBit.Transfer);
    this.endIntent(CivisIntentsBit.UpgradeController);
    this.endIntent(CivisIntentsBit.Withdraw);
  }

  endIntent(bit: CivisIntentsBit): void {
    const last = this.intents.read(bit);
    this.metrics[intentName(bit)] = {
      last: last,
      avg: exponentialMovingAverage(this.metrics[bit].avg, last, 100),
      total: this.metrics[bit].total + last
    };
  }

  include(civis: Civis): void {
    this.intents.merge(civis.intents);
  }
}
