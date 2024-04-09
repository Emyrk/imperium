export enum CivisIntentsBit {
  Attack = 0,
  AttackController = 8,
  Build = 16,
  Dismantle = 24,
  Harvest = 32,
  Heal = 40,
  Move = 48,
  Pickup = 56,
  RangedAttack = 64,
  RangedHeal = 72,
  Repair = 80,
  ReserveController = 88,
  SignController = 96,
  Transfer = 104,
  UpgradeController = 112,
  Withdraw = 120
}

export function intentName(bit: CivisIntentsBit): string {
  switch (bit) {
    case CivisIntentsBit.Build:
      return "build";
    case CivisIntentsBit.Harvest:
      return "harvest";
    case CivisIntentsBit.Move:
      return "move";
    case CivisIntentsBit.Pickup:
      return "pickup";
    case CivisIntentsBit.Repair:
      return "repair";
    case CivisIntentsBit.Transfer:
      return "transfer";
    case CivisIntentsBit.UpgradeController:
      return "upgradeController";
    case CivisIntentsBit.Withdraw:
      return "withdraw";
    case CivisIntentsBit.Attack:
      return "attack";
    case CivisIntentsBit.AttackController:
      return "attackController";
    case CivisIntentsBit.Dismantle:
      return "dismantle";
    case CivisIntentsBit.Heal:
      return "heal";
    case CivisIntentsBit.RangedAttack:
      return "rangedAttack";
    case CivisIntentsBit.RangedHeal:
      return "rangedHeal";
    case CivisIntentsBit.ReserveController:
      return "reserveController";
    case CivisIntentsBit.SignController:
      return "signController";
    default:
      return "Unknown";
  }
}

export class Intents {
  public intents: Uint32Array = new Uint32Array(4).fill(0);
  public increment(bit: CivisIntentsBit): void {
    switch (true) {
      case bit < 32:
        this.intents[0] += 1 << bit;
        break;
      case bit < 64:
        this.intents[1] += 1 << bit;
        break;
      case bit < 96:
        this.intents[2] += 1 << bit;
        break;
      case bit < 128:
        this.intents[3] += 1 << bit;
        break;
      default:
        throw new Error(`Invalid intent bit: ${bit}`);
    }
  }

  public read(bit: CivisIntentsBit): number {
    let val: number;
    switch (true) {
      case bit < 32:
        val = this.intents[0];
        break;
      case bit < 64:
        val = this.intents[1];
        break;
      case bit < 96:
        val = this.intents[2];
        break;
      case bit < 128:
        val = this.intents[3];
        break;
      default:
        throw new Error(`Invalid intent bit: ${bit}`);
    }

    // This order is important. Right shift first, then bitmask.
    // Bit operators change the unsigned 32 to signed, so if you bitmask
    // first you deal with negatives.
    return (val >> bit) & 255;
  }

  public reset(): void {
    this.intents[0] = 0;
    this.intents[1] = 0;
    this.intents[2] = 0;
    this.intents[3] = 0;
  }

  public merge(intents: Intents): void {
    this.intents[0] += intents.intents[0];
    this.intents[1] += intents.intents[1];
    this.intents[2] += intents.intents[2];
    this.intents[3] += intents.intents[3];
  }
}
