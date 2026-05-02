# Imperium Screeps Bot - AI Agent Guidelines

## Overview

Imperium is a TypeScript-based Screeps bot using a **process-oriented kernel architecture**. The bot manages an empire of rooms through hierarchical processes, with a custom task system for creep behavior and heap-based logistics for resource management.

## Architecture

### Core Concepts

```
┌─────────────────────────────────────────────────────────────┐
│                         Empire                               │
│  (PID 1 - Root process, manages all rooms)                  │
├─────────────────────────────────────────────────────────────┤
│  Village (per owned room)    │   Outpost (per outpost)      │
│   ├── SpawnControl           │    └── Remote harvesting     │
│   ├── StaticHarvest (x2)     │                              │
│   ├── HeapRoomLogistics      │                              │
│   ├── TowerDefense           │                              │
│   ├── Blueprint              │                              │
│   └── RemoteHarvest          │                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Kernel** | `src/kernel/` | Process scheduler, memory management, timing |
| **Process** | `src/kernel/Process.ts` | Base class for all processes (472 lines) |
| **Civis** | `src/civis/Civis.ts` | Creep wrapper with task execution |
| **Task** | `src/task/Task.ts` | Action primitives for creeps |
| **Programs** | `src/program/` | Domain-specific processes |

### Process Hierarchy

1. **Empire** (`program/Empire/`) - Root process, spawns Villages/Outposts
2. **Village** (`program/Village/`) - Per-room manager for owned rooms
3. **SpawnControl** (`program/SpawnControl/`) - Spawn queue management (priority-based)
4. **StaticHarvest** (`program/StaticHarvest/`) - Source mining with container placement
5. **HeapRoomLogistics** (`program/HeapRoomLogistics/`) - Resource logistics coordination
6. **Blueprint** (`program/Blueprint/`) - Room planning and construction

### Memory Structure

```typescript
Memory = {
  empirePid: number,           // Root process PID
  processes: {                 // Process state (keyed by PID)
    [pid]: {
      scheduled: { pid, parent, children, reloadChildren },
      type: string,
      label: string,
      data: ProcessData
    }
  },
  civisID: number,             // Creep name counter
  tasks: { currentID: number }, // Task ID counter
  rooms: { [name]: { villagePid } }
}
```

## Build & Deploy

```bash
# Install dependencies
npm install

# Build only
npm run build

# Deploy to main branch (production)
npm run push-main

# Deploy to private server
npm run push-pserver

# Watch mode (auto-deploy on save)
npm run watch-main

# Run tests
npm test
```

**Deployment Notes:**
- Uses Rollup for bundling with `@rollup/plugin-typescript`
- Config in `rollup.config.js` reads destinations from `screeps.json`
- Token stored in `screeps.json` (keep private!)

## Task System

Tasks are atomic actions creeps perform. Control flows compose them:

### Task Types (`src/task/instances/`)
- `harvest.ts` - Mine sources
- `build.ts` - Construct structures
- `transfer.ts` - Give resources to structures
- `withdraw.ts` - Take resources from structures
- `pickup.ts` - Collect dropped resources
- `repair.ts` - Fix structures
- `upgrade.ts` - Feed controller
- `goto.ts` - Move to position
- `attack.ts` / `claim.ts` - Combat/claiming

### Control Flows (`src/task/controlflows/`)
- **Loop** - Repeat task sequence forever
- **FIFO** - Execute tasks in order, once
- **Ephemeral** - One-shot task

### Task Codes
```typescript
enum TaskCode {
  WORKING = "w",      // Continue next tick
  NOTHING_DONE = "n", // Idle, allow other tasks
  DONE_WORKING = "d", // Task complete
  INVALID = "i",      // Remove task
  MOVING = "m",       // In transit
  TIMEOUT = "t"       // Exceeded deadline
}
```

## Civis (Creep Wrapper)

`Civis` wraps a `Creep` game object with task management:

```typescript
class Civis {
  name: string;
  creep: Creep;
  task: Task | null;      // Current task from memory
  intents: Intents;       // Tracks CPU intents used
  
  assignTask(task): void; // Set new task
  run(): CivisRunCode;    // Execute task, return status
}
```

## Spawn Control

Priority-based spawn queue with bootstrap fallback:

1. Processes call `spawner.requestCreep(request)`
2. Queue sorted by priority (lower = higher priority)
3. If request stales (>150 ticks), body swaps to cheaper "bootstrap" body
4. Callback `onComplete(success)` notifies requester

**Important:** Spawn queue is in-memory (heap), lost on global reset. Processes must re-request each tick if needed.

## Room Planning

`src/lib/roomplanning/` handles base layout:

1. **Roads** (`Roads.ts`) - Pathfind to POIs (sources, controller, minerals)
2. **Dense** (`dense.ts`) - Stamp-based building placement
3. **Planner** (`Planner.ts`) - Coordinates road + building plans

The `Blueprint` program executes the plan, placing construction sites at appropriate RCL.

## Debugging

### Console Commands (via `src/manual.ts`)

```javascript
// Available in game console when assigned to Memory.debug
print()       // Show process tree
Top.printTop() // Show CPU usage per process
scout(room)   // Analyze remote room
```

### Profiler

Enabled via `src/config.ts`:
```typescript
export const USE_PROFILER = true;
```

Decorators in `lib/profiler/decorator.ts` track method timings.

### Logging

```typescript
import { log } from "lib/log/log";
log.info("message");
log.warning("message");
log.error("message");
```

Log level controlled by `Memory.log.level`.

## Testing

Uses Vitest with mocks in `src/test-utils/`:

```bash
npm test              # Run once
npm run test-watch    # Watch mode
npm run test-cov      # With coverage
```

Mock utilities: `src/test-utils/mocks/` (Room, Creep, Structures, etc.)

## Common Modifications

### Adding a New Process

1. Create `src/program/MyProcess/MyProcess.ts`:
```typescript
import { Process, ProcessCode } from "kernel/Process";

export interface MyProcessData extends ProcessData {
  // Custom fields
}

export class MyProcess extends Process<MyProcessData> {
  public static type = "my-process";
  
  public static new(roomName: string) {
    return Process.newProgram<MyProcessData>(
      MyProcess.type, 
      `${roomName}_my_process`,
      { roomName }
    );
  }
  
  public execute(): ProcessCode {
    // Logic here
    return ProcessCode.SUCCESS;
  }
  
  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }
}

Process.register(MyProcess.type, MyProcess);
```

2. Launch from parent (usually Village):
```typescript
this.launchChildProcess(MyProcess.new(this.data.roomName));
```

### Adding a New Task

1. Create `src/task/instances/mytask.ts`:
```typescript
import { Task, TaskCode } from "task/Task";
import { Civis } from "civis/Civis";

interface MyTaskData extends TaskData {
  // Custom fields
}

export class MyTask extends Task<MyTaskData, TargetType> {
  public static type = "my-task";
  
  static new(target: RoomObject): ProtoTask<MyTaskData> {
    return Task.newTask(MyTask.type, target, {});
  }
  
  execute(): TaskCode {
    // Logic here
    return TaskCode.DONE_WORKING;
  }
}

Tasks.register(MyTask.type, MyTask);
```

2. Register in `src/task/Tasks.ts`

### Adding Creep Body Calculation

See `src/program/StaticHarvest/StaticHarvest.ts` lines 269-293 for pattern:
- Calculate parts needed based on game state
- Respect `energyCapacityAvailable`
- Include bootstrap fallback body

## Current State (as of deployment)

- **Room:** W19S33 on shard2
- **RCL:** 1 (spawned recently)
- **Processes:** 13 active (Empire → Village → children)
- **Sources:** 2, with StaticHarvest PIDs 9 and 10
- **Mining spots:** (7,12) and (10,32) with container construction sites
- **Spawn:** Spawn1 at (14,29), 300/300 energy

## Known Issues & TODOs

1. **Spawn queue volatility** - Queue in heap lost on reset; processes re-request but timing can lag
2. **Bootstrap detection** - 150 tick delay before cheap body fallback kicks in
3. **Remote harvesting** - Implemented but needs source room detection logic
4. **Market selling** - Only sells energy >200k at price >17 (line 76-97 in Village.ts)

## MCP Tools Available

When working on this bot, use the Screeps MCP tools:

```
mcp_screeps_get_memory     - Read Memory or path
mcp_screeps_set_memory     - Write Memory (careful!)
mcp_screeps_get_room_objects - Get all objects in a room
mcp_screeps_get_console_output - Read console logs
mcp_screeps_execute_console - Run JS in game console
mcp_screeps_push_code      - Deploy code to branch
mcp_screeps_get_code       - Read current deployed code
mcp_screeps_list_branches  - See available branches
```

## File Structure

```
src/
├── main.ts              # Entry point, game loop
├── config.ts            # Constants (profiler toggle, username)
├── manual.ts            # Console commands
├── kernel/
│   ├── Process.ts       # Base process class
│   ├── Top.ts           # CPU monitoring
│   ├── intents.ts       # Intent tracking
│   └── timing.ts        # Timing utilities
├── civis/
│   ├── Civis.ts         # Creep wrapper
│   ├── creep.ts         # Body utilities
│   └── intents.ts       # Per-creep intent bitmap
├── program/
│   ├── Empire/          # Root process
│   ├── Village/         # Owned room manager
│   ├── SpawnControl/    # Spawn queue
│   ├── StaticHarvest/   # Mining operations
│   ├── HeapRoomLogistics/ # Resource logistics
│   ├── Blueprint/       # Room planning
│   ├── TowerDefense/    # Tower control
│   └── Outpost/         # Remote room management
├── task/
│   ├── Task.ts          # Base task class
│   ├── Tasks.ts         # Task registry
│   ├── instances/       # Specific tasks
│   └── controlflows/    # Task composition
├── lib/
│   ├── memory/          # Memory utilities
│   ├── log/             # Logging
│   ├── roomplanning/    # Base layout algorithms
│   ├── profiler/        # CPU profiler
│   ├── stats/           # Prometheus metrics
│   └── visualizer/      # Room visual helpers
└── prototypes/          # Game object extensions
```

## Style Guidelines

- TypeScript strict mode enabled
- Use `@profile` decorator on classes for CPU tracking
- Prefer `log.info/warning/error` over `console.log`
- Process data interfaces extend `ProcessData`
- Task data interfaces extend `TaskData`
- Register processes with `Process.register(type, Class)`
- Register tasks with `Tasks.register(type, Class)`
