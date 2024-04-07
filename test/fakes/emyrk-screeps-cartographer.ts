// The actual cartographer does a lot of stuff on package import.
// It uses 'Game' and 'Memory'. At the end of the day, it is just movement
// logic, which we probably do not need in our tests?

export interface ReconcileTrafficOpts {
  /**
   * Show debug visualizations for troubleshooting traffic
   */
  visualize?: boolean;
}

export type MoveTarget = {
  pos: RoomPosition;
  range: number;
};

export interface MoveOpts extends PathFinderOpts {
  /**
   * Caching strategy to use to save paths. Defaults to HeapCache.
   */
  cache?: CachingStrategy;
  /**
   * Number of ticks to save a cached path before repathing. If undefined,
   * cached path will be reused indefinitely. Default is undefined.
   */
  reusePath?: number;
  /**
   * Number of ticks to wait for a creep to become unstuck before repathing
   * with the fallbackOpts. Default is 3.
   */
  repathIfStuck?: number;
  /**
   * If set, will visualize the path using provided styles.
   */
  visualizePathStyle?: PolyStyle;
  /**
   * If target range would extend out of the target room, trim to keep target in room
   */
  keepTargetInRoom?: boolean;
  /**
   * Automatically populates cost matrix with creep positions.
   */
  avoidCreeps?: boolean;
  /**
   * Automatically populates cost matrix with structure positions.
   */
  avoidObstacleStructures?: boolean;
  /**
   * Always path around Source Keeper-protected resources.
   */
  avoidSourceKeepers?: boolean;
  /**
   * Cost for walking on road positions. The default is 1.
   */
  roadCost?: number;
  /**
   * Cost for walking on plain positions. The default is 2.
   */
  plainCost?: number;
  /**
   * Cost for walking on swamp positions. The default is 10.
   */
  swampCost?: number;
  /**
   * Movement priority (higher-value moves override lower-value moves). The default is 1.
   */
  priority?: number;
  /**
   * Default cost for a room in findRoute callback (may be overridden
   * if routeCallback is provided). Defaults to 2.
   */
  defaultRoomCost?: number;
  /**
   * Cost for a Source Keeper room in findRoute callback (may be overridden
   * if routeCallback is provided). Defaults to 2.
   */
  sourceKeeperRoomCost?: number;
  /**
   * Cost for a highway room in findRoute callback (may be overridden
   * if routeCallback is provided). Defaults to 1.
   */
  highwayRoomCost?: number;
  /**
   * The maximum allowed pathfinding operations per room (if maxOps is higher for a short path, PathFinder will use the lower).
   * You can limit CPU time used for the search based on ratio 1 op ~ 0.001 CPU. The default value is 2000.
   */
  maxOpsPerRoom?: number;
  /**
   * This callback works like the builtin `findRoute` and will override
   * the default values for highway/source keeper room cost unless you
   * return `undefined`.
   */
  routeCallback?: (roomName: string, fromRoomName: string) => number | undefined;
  /**
   * Creep used capacity and body, used to calculate default terrain costs.
   */
  creepMovementInfo?: {
    usedCapacity: number;
    body: Creep["body"];
  };
  /**
   * Targets for dynamic avoidance - will re-route to path around avoidance regions
   * if they intersect with creep's current path
   */
  avoidTargets?: (roomName: string) => MoveTarget[];
  /**
   * Gradient for avoid targets - by default, tiles within an avoidTarget will be
   * set to 254, but if a gradient is set, the cost will decrease by (gradient * range)
   * for each tile away from the target.
   */
  avoidTargetGradient?: number;
  /**
   * By default, portals will be blocked in the cost matrix if we aren't traveling through them
   * to avoid ending up somewhere random. Set this to true to ignore portals in the cost matrix.
   * This does not affect travel through portals.
   */
  ignorePortals?: boolean;
  /**
   * By default, portals are used for travel if they are the shortest path. Set this to true to
   * avoid using portals for travel.
   */
  avoidPortals?: boolean;
}

export function preTick(): void {}
export function reconcileTraffic(opts?: ReconcileTrafficOpts): void {}
export function moveTo(
  creep: Creep | PowerCreep,
  targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[],
  opts?: MoveOpts,
  fallbackOpts?: MoveOpts
): -2 | -10 | CreepMoveReturnCode | -5 {
  if (!Array.isArray(targets)) {
    // Convert single target to array
    if (!("range" in targets)) {
      if ("x" in targets) {
        targets = { pos: targets, range: 0 };
      } else {
        targets = { range: 0, ...targets };
      }
    }
    targets = [targets];
  }

  // convert everything to MoveTarget
  const goals = targets.map(t => {
    if ("range" in t) {
      return t;
    }
    return { pos: t, range: 0 };
  });

  // Are we in range of anything, or already there?
  const inRange = goals.some(g => creep.pos.inRangeTo(g.pos, g.range));
  if (inRange) {
    return OK;
  }

  // Ugh, we need to move. This sucks. Let's do some dumb stuff.
  const closest = goals
    .map(g => {
      return { dist: creep.pos.getRangeTo(g.pos), pos: g.pos, range: g.range };
    })
    .sort((a, b) => a.dist - b.dist);

  // Move to the closest!
  const ret = creep.moveTo(closest[0].pos.x, closest[0].pos.y);
  // @ts-ignore The extra status code returned is INVALID_TARGET
  return ret;
}
