import { describe, it, expect, beforeEach } from "vitest";
import { CivisIntentsBit, Intents, intentName } from "./intents";

describe("Intent Counting", () => {
  it("count", () => {
    const intents = new Intents();

    intents.increment(CivisIntentsBit.Build);
    intents.increment(CivisIntentsBit.Build);
    intents.increment(CivisIntentsBit.Build);
    expect(intents.read(CivisIntentsBit.Build)).toBe(3);
  });

  it("name", () => {
    expect(intentName(CivisIntentsBit.Build)).toBe("build");
    expect(intentName(CivisIntentsBit.Harvest)).toBe("harvest");
    expect(intentName(CivisIntentsBit.Move)).toBe("move");
    expect(intentName(CivisIntentsBit.Pickup)).toBe("pickup");
    expect(intentName(CivisIntentsBit.Repair)).toBe("repair");
    expect(intentName(CivisIntentsBit.Transfer)).toBe("transfer");
    expect(intentName(CivisIntentsBit.UpgradeController)).toBe("upgradeController");
    expect(intentName(CivisIntentsBit.Withdraw)).toBe("withdraw");

    expect(intentName(CivisIntentsBit.Attack)).toBe("attack");
    expect(intentName(CivisIntentsBit.AttackController)).toBe("attackController");
    expect(intentName(CivisIntentsBit.Dismantle)).toBe("dismantle");
    expect(intentName(CivisIntentsBit.Heal)).toBe("heal");
    expect(intentName(CivisIntentsBit.RangedAttack)).toBe("rangedAttack");
    expect(intentName(CivisIntentsBit.RangedHeal)).toBe("rangedHeal");
    expect(intentName(CivisIntentsBit.ReserveController)).toBe("reserveController");
    expect(intentName(CivisIntentsBit.SignController)).toBe("signController");
  });

  it("bit boundaries", () => {
    const intents = new Intents();
    // Right before last bit that triggers a negative
    for (let i = 1; i <= 127; i++) {
      intents.increment(CivisIntentsBit.Dismantle);
    }
    expect(intents.read(CivisIntentsBit.Dismantle)).toBe(127);

    // Please do not be negative
    intents.increment(CivisIntentsBit.Dismantle);
    expect(intents.read(CivisIntentsBit.Dismantle)).toBe(128);

    for (let i = 129; i <= 255; i++) {
      intents.increment(CivisIntentsBit.Dismantle);
    }
    expect(intents.read(CivisIntentsBit.Dismantle)).toBe(255);
  });
});

describe("count all by self", () => {
  for (let i = 0; ; i += 8) {
    const exists = CivisIntentsBit[i];
    if (exists === undefined) {
      break;
    }
    const intentBit = i;
    const intents = new Intents();
    it(`${intentName(intentBit)}`, () => {
      for (let i = 1; i <= 255; i++) {
        intents.increment(intentBit);
        expect(intents.read(intentBit)).toBe(i);
      }
    });
  }
});

describe("count all as group self", () => {
  let bits: number[] = [];
  for (let i = 0; ; i += 8) {
    const exists = CivisIntentsBit[i];
    if (exists === undefined) {
      break;
    }
    bits.push(i);
  }

  const intents = new Intents();
  it(`all incrementing`, () => {
    for (let i = 1; i <= 255; i++) {
      for (const bit of bits) {
        intents.increment(bit);
      }
      for (const bit of bits) {
        expect(intents.read(bit)).toBe(i);
      }
    }
  });
});
