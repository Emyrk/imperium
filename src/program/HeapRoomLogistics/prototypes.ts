import { ProgramOwnedRoom } from "program/OwnedRoom/OwnedRoom";

Room.prototype.announceAvailable = function (ref: string, resourceType: ResourceConstant) {
  if (this.memory.ownedRoomPid) {
    const logi = ProgramOwnedRoom.getByRoom(this.name)?.heapLogistics();
    logi?.announceAvailable(ref, resourceType);
  }
};

Room.prototype.announceDeath = function (pos: ProtoPos) {
  if (this.memory.ownedRoomPid) {
    const logi = ProgramOwnedRoom.getByRoom(this.name)?.heapLogistics();
    logi?.announceDeath(pos);
  }
};

Room.prototype.announceNeeded = function (ref: string, needType: LogisticsNeedType, resourceType: ResourceConstant) {
  if (this.memory.ownedRoomPid) {
    const logi = ProgramOwnedRoom.getByRoom(this.name)?.heapLogistics();
    logi?.announceNeeded(ref, needType, resourceType);
  }
};

// Parameter<T> is a helper function that extracts the parameters from a function type.
type Parameter<T> = T extends (...arg: infer T) => any ? T : never;
// wrapPrototype is a helper function that wraps a prototype method with a new function.
// Calling it with the prototype function as the generic type F will ensure type safety
// on the override.
function wrapPrototype<F extends (...arg: any) => any>(
  prototypeObject: any,
  methodName: string,
  onOk: (t: any, ...args: Parameter<F>) => void
) {
  const oldMethod = prototypeObject[methodName];
  prototypeObject[methodName] = function (...args: Parameter<F>) {
    // @ts-ignore
    const returnCode = oldMethod.call(this, ...args);
    // if (returnCode === OK) {
    onOk(this, ...args);
    // }
    return returnCode;
  };
}

// If a creep does a transfer, then we need to update the needed amounts for that thing.
wrapPrototype<typeof Creep.prototype.transfer>(
  Creep.prototype,
  "transfer",
  function (self: Creep, target: AnyCreep | Structure, resourceType: ResourceConstant) {
    self.room.announceNeeded(target.ref, "transfer", resourceType);
  }
);

// When a creep repairs, update the needed to reflect the repair has occurred.
wrapPrototype<typeof Creep.prototype.repair>(Creep.prototype, "repair", function (self: Creep, target: Structure) {
  self.room.announceNeeded(target.ref, "repair", RESOURCE_ENERGY);
});

wrapPrototype<typeof Creep.prototype.pickup>(Creep.prototype, "pickup", function (self: Creep, target: Resource) {
  self.room.announceAvailable(target.ref, target.resourceType);
});

// TODO: If thing does not exists, update the need.
// When a creep does a build action, update the need.
wrapPrototype<typeof Creep.prototype.build>(Creep.prototype, "build", function (self: Creep, target: ConstructionSite) {
  self.room.announceNeeded(target.ref, "build", RESOURCE_ENERGY);
  // TODO: This sucks, but idk a better way atm.
  // Basically if you finish the build, you need to update whatever the heck was built.
  // self.room.memory.refreshNeeds = Game.time + 1;
});

// Spawn triggers extension and spawn needs.
wrapPrototype<typeof Spawn.prototype.spawnCreep>(
  Spawn.prototype,
  "spawnCreep",
  function (self: StructureSpawn, body: BodyPartConstant[], name: string, opts?: SpawnOptions) {
    self.room.announceNeeded(self.ref, "transfer", RESOURCE_ENERGY);
    self.room.extensions.forEach(e => self.room.announceNeeded(e.ref, "transfer", RESOURCE_ENERGY));
  }
);

// Tower triggers transfer needs to iteself.
wrapPrototype<typeof StructureTower.prototype.attack>(
  StructureTower.prototype,
  "attack",
  function (self: StructureTower, target: AnyCreep | Structure) {
    self.room.announceNeeded(self.ref, "transfer", RESOURCE_ENERGY);
  }
);

wrapPrototype<typeof StructureTower.prototype.repair>(
  StructureTower.prototype,
  "repair",
  function (self: StructureTower, target: AnyCreep | Structure) {
    self.room.announceNeeded(self.ref, "transfer", RESOURCE_ENERGY);
  }
);

wrapPrototype<typeof StructureTower.prototype.heal>(
  StructureTower.prototype,
  "heal",
  function (self: StructureTower, target: AnyCreep | Structure) {
    self.room.announceNeeded(self.ref, "transfer", RESOURCE_ENERGY);
  }
);
