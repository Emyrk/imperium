declare function deref(ref: string): RoomObject | null;

global.deref = function (ref: string): RoomObject | null {
  // dereference any object from identifier
  const obj = Game.getObjectById<_HasId>(ref) || Game.flags[ref] || Game.creeps[ref] || Game.spawns[ref] || null;
  if (obj) {
    return obj as RoomObject;
  }
  return null;
};

declare function derefRoomPosition(protoPos: ProtoPos): RoomPosition;

global.derefRoomPosition = function (protoPos: ProtoPos): RoomPosition {
  return new RoomPosition(protoPos.x, protoPos.y, protoPos.roomName);
};
