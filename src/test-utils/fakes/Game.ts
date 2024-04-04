export class Game {
  byID: { [id: string]: RoomObject } = {};
  creeps: { [name: string]: Creep } = {};
  rooms: { [name: string]: Room } = {};
  spawns: { [name: string]: StructureSpawn } = {};
  structures: { [name: string]: Structure } = {};
  time = 100;

  getObjectById(id: string): any {
    const obj =
      this.byID[id] ||
      _.find(this.creeps, c => c.id === id) ||
      _.find(this.spawns, r => r.id === id) ||
      _.find(this.structures, s => s.id === id);
    return obj;
  }
}
