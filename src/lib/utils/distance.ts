export function coordDistance(a: Coord, b: Coord) {
  return Math.max(a.x - b.x < 0 ? a.x - b.x : b.x - a.x, b.y - a.y < 0 ? a.y - b.y : b.y - a.y);
}
