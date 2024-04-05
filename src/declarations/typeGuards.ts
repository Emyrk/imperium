// Type guards library: this allows for instanceof - like behavior for much lower CPU cost. Each type guard
// differentiates an ambiguous input by recognizing one or more unique properties.

import { Civis } from "civis/Civis";

export interface EnergyStructure extends Structure {
  energy: number;
  energyCapacity: number;
}

export interface StoreStructure extends Structure {
  store: StoreDefinition;
}

export function isController(obj: RoomObject): obj is StructureController {
  return (<StructureController>obj).isPowerEnabled != undefined;
}

export function isConstructionSite(obj: RoomObject): obj is ConstructionSite {
  return (<ConstructionSite>obj).progress != undefined;
}

// Energy structures store energy
export function isEnergyStructure(obj: RoomObject): obj is EnergyStructure {
  return (<EnergyStructure>obj).energy != undefined && (<EnergyStructure>obj).energyCapacity != undefined;
}

export function isStoreStructure(obj: RoomObject): obj is StoreStructure {
  return (<StoreStructure>obj).store != undefined && (<StoreStructure>obj).store.getCapacity != undefined;
}

export function isRuin(obj: RoomObject): obj is Ruin {
  return (
    (<Ruin>obj).structure != undefined && (<Ruin>obj).destroyTime != undefined && (<Ruin>obj).ticksToDecay != undefined
  );
}

export function isStructure(obj: RoomObject): obj is Structure {
  return (<Structure>obj).structureType != undefined;
}

export function isOwnedStructure(structure: Structure): structure is OwnedStructure {
  return (<OwnedStructure>structure).owner != undefined;
}

export function isSource(obj: Source | Mineral): obj is Source {
  return (<Source>obj).energy != undefined && (<Source>obj).ticksToRegeneration != undefined;
}

export function isTombstone(obj: RoomObject): obj is Tombstone {
  return (<Tombstone>obj).deathTime != undefined;
}

export function isResource(obj: RoomObject): obj is Resource {
  return (<Resource>obj).amount != undefined;
}

export function hasPos(obj: HasPos | RoomPosition): obj is HasPos {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (<HasPos>obj).pos != undefined;
}

export function isCreep(obj: RoomObject | string): obj is Creep {
  return (<Creep>obj).fatigue != undefined;
}

export function isPowerCreep(obj: RoomObject): obj is PowerCreep {
  return (<PowerCreep>obj).powers != undefined;
}

export function isMinion(creep: Creep | Civis): creep is Civis {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (<Civis>creep).creep != undefined;
}
