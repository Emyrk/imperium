function dist(a: RoomPosition | RoomObject, b: RoomPosition | RoomObject) {
  if ("pos" in a) a = a.pos;
  if ("pos" in b) b = b.pos;
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
