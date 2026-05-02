"""
Screeps defense planner - min-cut based wall placement.
Uses Edmonds-Karp max-flow to find optimal wall positions.
"""
import json
import sys
from collections import deque

WALL = 1
SWAMP = 2
PLAIN = 0

def parse_terrain(s):
    """50x50 grid: terrain[y][x]"""
    grid = [[0]*50 for _ in range(50)]
    for y in range(50):
        for x in range(50):
            grid[y][x] = int(s[y*50+x])
    return grid

def neighbors(x, y):
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if dx == 0 and dy == 0: continue
            nx, ny = x+dx, y+dy
            if 0 <= nx < 50 and 0 <= ny < 50:
                yield nx, ny

def find_exits(terrain):
    """Return list of (x,y) exit tiles on room edges."""
    exits = []
    for i in range(50):
        if terrain[0][i] != WALL:  exits.append((i, 0))
        if terrain[49][i] != WALL: exits.append((i, 49))
        if terrain[i][0] != WALL:  exits.append((0, i))
        if terrain[i][49] != WALL: exits.append((49, i))
    return exits

def min_cut_walls(terrain, protected, exits, buffer=2):
    """
    Find min-cut walls separating exits from protected positions.
    
    Node-splitting trick: each tile (x,y) becomes two nodes 'in' and 'out'
    with capacity 1 between them (the wall). Adjacency edges have inf capacity.
    Min-cut on this graph gives us tiles to wall off.
    
    Tiles within `buffer` of protected are inf-capacity (can't wall there).
    Exits and edge tiles also can't be walled.
    """
    # Build sets
    protected_set = set(protected)
    
    # Mark "no-wall zones": within `buffer` of protected (so we don't wall the spawn itself),
    # plus the exit tiles themselves and 1-tile inside (for hard cap)
    no_wall = set()
    for (px, py) in protected:
        for dx in range(-buffer, buffer+1):
            for dy in range(-buffer, buffer+1):
                nx, ny = px+dx, py+dy
                if 0 <= nx < 50 and 0 <= ny < 50:
                    no_wall.add((nx, ny))
    
    # Each walkable tile = 2 nodes. node_id = (x, y, 0=in / 1=out)
    # Source = super-source connected to all exit 'in' nodes (inf)
    # Sink = super-sink, all protected 'out' nodes connect to it (inf)
    # Edge in->out capacity: 1 if can wall, INF if no_wall or protected
    # out -> neighbor's in: INF
    
    INF = 10**9
    
    # Use dict of {node: {neighbor: capacity}}
    graph = {}
    def add_edge(u, v, cap):
        if u not in graph: graph[u] = {}
        if v not in graph: graph[v] = {}
        graph[u][v] = graph[u].get(v, 0) + cap
        graph[v].setdefault(u, 0)  # reverse edge with 0 cap
    
    SOURCE = ('S',)
    SINK = ('T',)
    
    walkable = [(x, y) for y in range(50) for x in range(50) if terrain[y][x] != WALL]
    walkable_set = set(walkable)
    
    for (x, y) in walkable:
        in_node = (x, y, 0)
        out_node = (x, y, 1)
        # Internal edge — this is the "wall" capacity
        if (x, y) in no_wall or (x, y) in protected_set:
            cap = INF  # can't wall here
        elif x == 0 or x == 49 or y == 0 or y == 49:
            cap = INF  # can't wall room edge
        else:
            cap = 1
        add_edge(in_node, out_node, cap)
        # External edges to neighbors
        for nx, ny in neighbors(x, y):
            if (nx, ny) in walkable_set:
                add_edge(out_node, (nx, ny, 0), INF)
    
    # Connect source to exit tiles (their 'in' node)
    for ex in exits:
        add_edge(SOURCE, (ex[0], ex[1], 0), INF)
    
    # Connect protected tiles 'out' to sink
    for p in protected:
        add_edge((p[0], p[1], 1), SINK, INF)
    
    # Edmonds-Karp BFS max flow
    def bfs_aug():
        parent = {SOURCE: None}
        q = deque([SOURCE])
        while q:
            u = q.popleft()
            if u == SINK:
                # Trace path
                path = []
                cur = SINK
                while parent[cur] is not None:
                    p = parent[cur]
                    path.append((p, cur))
                    cur = p
                return path
            for v, cap in graph.get(u, {}).items():
                if v not in parent and cap > 0:
                    parent[v] = u
                    q.append(v)
        return None
    
    while True:
        path = bfs_aug()
        if not path: break
        # Bottleneck
        bottleneck = min(graph[u][v] for u, v in path)
        for u, v in path:
            graph[u][v] -= bottleneck
            graph[v][u] += bottleneck
    
    # Find min-cut: BFS from source on residual graph
    reachable = {SOURCE}
    q = deque([SOURCE])
    while q:
        u = q.popleft()
        for v, cap in graph.get(u, {}).items():
            if v not in reachable and cap > 0:
                reachable.add(v)
                q.append(v)
    
    # Cut edges go from reachable to non-reachable.
    # We want internal wall edges (in -> out) where in is reachable, out is not.
    walls = []
    for (x, y) in walkable:
        in_node = (x, y, 0)
        out_node = (x, y, 1)
        if in_node in reachable and out_node not in reachable:
            walls.append((x, y))
    
    return walls


def render_ascii(terrain, walls, ramparts, towers, protected, sources):
    """Render room with overlays."""
    walls_set = set(walls)
    ramparts_set = set(ramparts)
    towers_set = set(towers)
    protected_set = set(protected)
    sources_set = set(sources)
    
    lines = []
    header = "    " + "".join(str(x // 10 if x % 10 == 0 else " ") for x in range(50))
    lines.append(header)
    header2 = "    " + "".join(str(x % 10) for x in range(50))
    lines.append(header2)
    for y in range(50):
        row = f"{y:3d} "
        for x in range(50):
            if (x, y) in towers_set:
                row += "T"
            elif (x, y) in ramparts_set:
                row += "R"
            elif (x, y) in walls_set:
                row += "W"
            elif (x, y) in sources_set:
                row += "S"
            elif (x, y) in protected_set:
                row += "P"
            elif terrain[y][x] == WALL:
                row += "#"
            elif terrain[y][x] == SWAMP:
                row += "."
            else:
                row += " "
        lines.append(row)
    return "\n".join(lines)


def plan_room(name, terrain_str, structures):
    """structures: dict with spawn, controller, sources, containers, etc."""
    terrain = parse_terrain(terrain_str)
    
    # Protected positions: spawn, storage, towers, key infrastructure
    protected = []
    if 'spawn' in structures:
        protected.append(structures['spawn'])
    if 'controller' in structures:
        # Controller is near room center, but we don't strictly need to wall it
        # We will protect it but with smaller buffer
        pass
    if 'storage' in structures:
        protected.append(structures['storage'])
    if 'containers' in structures:
        protected.extend(structures['containers'])
    if 'planned_towers' in structures:
        protected.extend(structures['planned_towers'])
    
    exits = find_exits(terrain)
    walls = min_cut_walls(terrain, protected, exits, buffer=3)
    
    # Suggested ramparts: protect spawn, storage, towers (cover them with rampart)
    ramparts = []
    if 'spawn' in structures: ramparts.append(structures['spawn'])
    if 'storage' in structures: ramparts.append(structures['storage'])
    if 'planned_towers' in structures: ramparts.extend(structures['planned_towers'])
    if 'containers' in structures: ramparts.extend(structures['containers'])
    
    return {
        'walls': walls,
        'ramparts': ramparts,
        'towers': structures.get('planned_towers', []),
        'protected': protected,
        'sources': structures.get('sources', []),
        'terrain': terrain,
        'exits': exits,
    }


def plan_to_visual_commands(room_name, plan, profile='primary'):
    """Generate Screeps console commands to render visuals."""
    cmds = []
    # Walls = red
    for (x, y) in plan['walls']:
        cmds.append(f'new RoomVisual("{room_name}").structure({x},{y},"constructedWall",{{opacity:0.7}})')
    # Ramparts = green
    for (x, y) in plan['ramparts']:
        cmds.append(f'new RoomVisual("{room_name}").structure({x},{y},"rampart",{{opacity:0.5}})')
    # Towers = with a circle highlight
    for (x, y) in plan['towers']:
        cmds.append(f'new RoomVisual("{room_name}").structure({x},{y},"tower")')
        cmds.append(f'new RoomVisual("{room_name}").circle({x},{y},{{radius:1,fill:"#ff0000",opacity:0.3}})')
    # Connect with connectRoads to show wall barrier
    if plan['walls']:
        coords = ",".join(f"[{x},{y}]" for x, y in plan['walls'])
    return cmds


if __name__ == "__main__":
    # Test with W22S24
    pass
