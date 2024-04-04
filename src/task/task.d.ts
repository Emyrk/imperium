interface Memory {
  tasks: {
    currentID: number;
  };
}

interface TaskData {
  // ID of the task.
  id: string;
}

interface ProtoTaskTarget {
  id: string;
  pos: ProtoPos;
}

interface TaskOptions {
  moveOptions?: MoveOptsProto;
  // Range of target to switch to work()
  targetRange: number;
  // deadlineTick will tell the task to stop trying after this game tick
  deadlineTick?: number;
}

interface ProtoTask<DataType extends TaskData> {
  type: string;
  _target?: ProtoTaskTarget;
  // tickIssued is the tick the task was assigned
  tickIssued: number;
  // Static options for all tasks
  options: TaskOptions;
  // Task specific data
  data: DataType;
}

// Copied from movement library.
interface MoveOptsProto extends PathFinderOpts {
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
