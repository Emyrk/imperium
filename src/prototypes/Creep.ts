Object.defineProperty(Creep.prototype, "inRampart", {
  get() {
    return !!this.pos.lookForStructure(STRUCTURE_RAMPART); // this assumes hostile creeps can't stand in my ramparts
  },
  configurable: true
});

Object.defineProperty(Creep.prototype, "isInvader", {
  get() {
    return this.owner.username === "Invader";
  },
  configurable: true
});
