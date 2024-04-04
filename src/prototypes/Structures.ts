// All structure prototypes

Object.defineProperty(Source.prototype, "avgRegenRate", {
  get() {
    return (this as Source).energyCapacity / ENERGY_REGEN_TIME;
  },
  configurable: true
});

// General structure prototypes ========================================================================================

Object.defineProperty(Structure.prototype, "isWalkable", {
  get() {
    return (
      this.structureType == STRUCTURE_ROAD ||
      this.structureType == STRUCTURE_CONTAINER ||
      (this.structureType == STRUCTURE_RAMPART && (<StructureRampart>this.my || <StructureRampart>this.isPublic))
    );
  },
  configurable: true
});

// Container prototypes ================================================================================================

let containers = [
  StructureContainer.prototype,
  StructureExtension.prototype,
  StructureLink.prototype,
  StructureSpawn.prototype,
  StructureStorage.prototype,
  StructureTerminal.prototype,
  StructureTower.prototype
];

for (let proto in containers) {
  Object.defineProperty(containers[proto], "isFull", {
    // if this container-like object is full
    get() {
      return this.store.getFreeCapacity() <= 0;
    },
    configurable: true
  });
  Object.defineProperty(containers[proto], "isEmpty", {
    // if this container-like object is empty
    get() {
      return this.store.getUsedCapacity() <= 0;
    },
    configurable: true
  });
}

let energyStructures = [
  StructureStorage.prototype,
  StructureTerminal.prototype,
  Tombstone.prototype,
  StructureContainer.prototype
];

for (let proto in energyStructures) {
  Object.defineProperty(energyStructures[proto], "energy", {
    // if this container-like object is full
    get() {
      return this.store.getUsedCapacity(RESOURCE_ENERGY);
    },
    configurable: true
  });
}
