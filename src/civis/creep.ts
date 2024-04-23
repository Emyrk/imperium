export interface ProtoSpawnCreep {
  // Creep specific fields
  name: string;
  bodyParts: BodyPartConstant[];
  mem: CreepMemory;
  spawnDirection?: DirectionConstant;
  spawnID?: string;
}

export function simpleBodyString(bodyParts: BodyPartConstant[] | ProtoSpawnCreep): string {
  if ("bodyParts" in bodyParts) {
    // eslint-disable-next-line no-param-reassign
    bodyParts = bodyParts.bodyParts;
  }

  const parts = bodyParts.reduce((acc: Record<string, number>, part) => {
    if (!acc[partString(part)]) acc[partString(part)] = 0;
    acc[partString(part)] += 1;
    return acc;
  }, {});

  return Object.keys(parts)
    .sort()
    .reduce((acc: string, part) => acc + `${part}${parts[part]}`, "");
}

export function partString(part: BodyPartConstant): string {
  switch (part) {
    case MOVE:
      return "M";
    case WORK:
      return "W";
    case CARRY:
      return "C";
    case ATTACK:
      return "A";
    case RANGED_ATTACK:
      return "R";
    case HEAL:
      return "H";
    case CLAIM:
      return "L";
    case TOUGH:
      return "T";
    default:
      return "?";
  }
}

export function energyCost(bodyParts: BodyPartConstant[] | ProtoSpawnCreep): number {
  if ("bodyParts" in bodyParts) {
    // eslint-disable-next-line no-param-reassign
    bodyParts = bodyParts.bodyParts;
  }
  return bodyParts.reduce((acc, part) => acc + BODYPART_COST[part], 0);
}

export function CalcCreepBody(energyAvail: number, options: BodyPartConstant[][]): BodyPartConstant[] {
  for (let i = options.length - 1; i >= 0; i--) {
    const cost = energyCost(options[i]);
    if (cost <= energyAvail) {
      return options[i];
    }
  }
  throw new Error("No valid body found");
}
