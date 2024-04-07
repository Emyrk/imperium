export function mockPos(def: ProtoPos, mocked: ProtoPos | undefined): RoomPosition {
  const pos = new RoomPosition(def.x, def.y, def.roomName);
  if (mocked) {
    pos.x = mocked.x;
    pos.y = mocked.y;
    if (mocked.roomName) {
      pos.roomName = mocked.roomName;
    }
  }
  return pos;
}
