// Room prototypes - commonly used room properties and methods

// Logging =============================================================================================================
Object.defineProperty(Room.prototype, "print", {
  get() {
    return '<a href="#!/room/' + Game.shard.name + "/" + this.name + '">' + this.name + "</a>";
  },
  configurable: true
});

// Room properties =====================================================================================================

Object.defineProperty(Room.prototype, "my", {
  get() {
    return this.controller && this.controller.my;
  },
  configurable: true
});

Object.defineProperty(Room.prototype, "owner", {
  get() {
    return this.controller && this.controller.owner ? this.controller.owner.username : undefined;
  },
  configurable: true
});

// Creeps physically in the room
// Hostile structures currently in the room
Object.defineProperty(Room.prototype, "towers", {
  get() {
    return this.find(FIND_STRUCTURES, {
      filter: (s: Structure) => s.structureType == STRUCTURE_TOWER
    });
  },
  configurable: true
});

Object.defineProperty(Room.prototype, "spawns", {
  get() {
    return this.find(FIND_STRUCTURES, {
      filter: (s: Structure) => s.structureType == STRUCTURE_SPAWN
    });
  },
  configurable: true
});

Object.defineProperty(Room.prototype, "extensions", {
  get() {
    return this.find(FIND_STRUCTURES, {
      filter: (s: Structure) => s.structureType == STRUCTURE_EXTENSION
    });
  },
  configurable: true
});

Object.defineProperty(Room.prototype, "sources", {
  get() {
    return this.find(FIND_SOURCES, {});
  },
  configurable: true
});

Object.defineProperty(Room.prototype, "constructionSites", {
  get() {
    return this.find(FIND_CONSTRUCTION_SITES, {});
  },
  configurable: true
});

Object.defineProperty(Room.prototype, "minerals", {
  get() {
    return this.find(FIND_MINERALS, {});
  },
  configurable: true
});

Object.defineProperty(Room.prototype, "openSpawns", {
  get() {
    return this.find(FIND_STRUCTURES, {
      filter: (s: Structure) => s.structureType == STRUCTURE_SPAWN && !(s as StructureSpawn).spawning
    });
  },
  configurable: true
});

Object.defineProperty(Room.prototype, "hostiles", {
  get() {
    if (!this._hostiles) {
      this._hostiles = this.find(FIND_HOSTILE_CREEPS);
    }
    return this._hostiles;
  },
  configurable: true
});
