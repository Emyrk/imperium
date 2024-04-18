import { energyCost } from "civis/creep";
import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { BootstrapBody, ProgramCivisManager } from "program/SpawnControl/CivisManager";
import ControlFlowLoop from "task/controlflows/Loop/Loop";
import { TaskGoto } from "task/instances/goto";
import { TaskHarvest } from "task/instances/harvest";
import { TaskStaticHarvest } from "./StaticHarvestTask";
import { ProgramOwnedRoom } from "program/OwnedRoom/OwnedRoom";
import { Civis } from "civis/Civis";

export interface ProgramStaticHarvestData extends ProcessData {
  sourceID: string;
  spawnPid: number;

  // DropMining information
  invalidConstructionSites: Coord[];
  miningSpot?: Coord;
  workParts?: number;
  // freeSpots are places other miners can mine,
  // and still use the container
  freeSpots?: Coord[];

  // ConstructionSite
  constructionSiteRef?: string;
  containerRef?: string;
  lastPileRef?: string;

  // For handling creeps
  mgrPid?: number;
}

export class ProgramStaticHarvest extends Process<ProgramStaticHarvestData> {
  public static type = "static-harvest";
  public static new(source: Source, spawnPid: number) {
    return Process.newProgram<ProgramStaticHarvestData>(
      ProgramStaticHarvest.type,
      `${source.pos.roomName}_static_harvest_${source.id.substring(-4)}`,
      {
        roomName: source.room.name,
        sourceID: source.id,
        spawnPid: spawnPid,

        invalidConstructionSites: []
      }
    );
  }

  public constructor(pid: number) {
    super(pid);
    this.reserveSite();
  }

  private room(): Room {
    return Game.rooms[this.data.roomName];
  }

  // Override
  public get civis(): Civis[] {
    return this.spawn.civis;
  }

  private get spawn(): ProgramCivisManager {
    if (!this.data.mgrPid) {
      this.data.mgrPid = this.launchChildProcess(ProgramCivisManager.new(this.data.spawnPid, "har"));
    }
    return Process.get(this.data.mgrPid!) as ProgramCivisManager;
  }

  private get source(): Source | null {
    return deref(this.data.sourceID) as Source | null;
  }

  private dropPile(): Resource | null {
    if (!this.data.miningSpot) {
      return null;
    }

    const result = this.room().lookForAt(
      LOOK_RESOURCES,
      new RoomPosition(this.data.miningSpot.x, this.data.miningSpot.y, this.data.roomName)
    );
    if (result.length > 0) {
      return result[0];
    }
    return null;
  }

  private container(): StructureContainer | null {
    if (!this.data.containerRef) {
      return null;
    }
    return Game.getObjectById<StructureContainer>(this.data.containerRef as Id<StructureContainer>);
  }

  // existingContainer searches if a container already exists.
  // If the pid is killed, this allows reusing the previous pid's container.
  private existingContainer(): StructureContainer | undefined {
    if (!this.source) {
      return undefined;
    }
    const neighbors = this.source.pos.neighbors;
    for (let i = 0; i < neighbors.length; i++) {
      const cont = neighbors[i]
        .lookFor(LOOK_STRUCTURES)
        .find(structure => structure.structureType === STRUCTURE_CONTAINER);
      if (cont) {
        return cont as StructureContainer;
      }
    }

    return undefined;
  }

  private pickSite(): void {
    if (this.data.miningSpot) {
      return;
    }

    const source = this.source;
    if (!source) {
      return;
    }

    // If a container already exists, use that.
    const existing = this.existingContainer();
    if (existing) {
      this.data.miningSpot = existing.pos;
      this.data.containerRef = existing.ref;
      return;
    }

    const miningSpots = source.pos.availableNeighbors();
    const containerSites = miningSpots.filter(spot => {
      return !_.contains(this.data.invalidConstructionSites, spot);
    });

    if (containerSites.length === 0) {
      log.error(`No container sites found for source ${source.id}`);
      return;
    }

    interface SiteOption {
      pos: Coord;
      workableNeighbors: Coord[];
    }

    // The best one has the most neighbors that can access the source as well.
    const options: SiteOption[] = containerSites.map(spot => ({
      pos: spot,
      workableNeighbors: spot.availableNeighbors().filter(n => n.inRangeToPos(source.pos, 1))
    }));

    const best = options.sort((a, b) => {
      return b.workableNeighbors.length - a.workableNeighbors.length;
    })[0];

    this.data.miningSpot = best.pos;
    this.data.freeSpots = best.workableNeighbors;

    if (!this.data.miningSpot) {
      log.error(`No container site found for source ${source.id}`);
    } else {
      log.info(`Picked a new site for source ${source.id}`);
      this.reserveSite();
    }
  }

  // clac the number of work parts needed to mine the source
  private workNeeded(): number {
    // Always +1 because my miner misses some ticks to repairing.
    return Math.ceil(this.source!.avgRegenRate / HARVEST_POWER) + 1;
  }

  private requestHarvester(): void {
    if (!this.data.miningSpot) {
      return;
    }
    let cap = this.room().energyCapacityAvailable;
    let needWork = this.workNeeded();

    const body = [MOVE, CARRY, WORK, WORK];
    needWork -= 2;
    let addMove = true;
    while (energyCost(body) < cap - 150 && needWork > 0) {
      body.push(WORK);
      if (addMove) {
        body.push(MOVE);
      }
      addMove = !addMove;
      needWork -= 1;
    }

    this.data.workParts = body.filter(part => part === WORK).length;
    const spot = this.data.miningSpot;
    this.spawn.requestCreep(
      {
        body: body,
        staleTime: 150,
        // 300e cost for boostrap body
        bootstrapBody: [MOVE, CARRY, WORK, WORK]
      } as BootstrapBody,
      {
        role: "cont-harvester",
        task: ControlFlowLoop.new(
          [
            // Go to mining spot
            TaskGoto.new(new RoomPosition(spot.x, spot.y, this.data.roomName), 0, {
              priority: 10
            }),
            // Maintain/build the container
            TaskStaticHarvest.new(new RoomPosition(spot.x, spot.y, this.data.roomName)),
            // Drop min harvest
            TaskHarvest.new(this.source!, true)
          ],
          {
            startFrom: 0,
            alwaysValid: true
          }
        )
      },
      10
    );
  }

  private maintainHarvester(): void {
    if (this.spawn.total() === 0) {
      log.info(`No miners for ${this.data.sourceID}.  Requesting one.`);
      this.requestHarvester();
      return;
    }

    // If the civis is alive and none are queued.
    if (this.spawn.civis.length === 1 && this.spawn.totalQueued() === 0) {
      const min = this.spawn.civis[0];
      // The minion will die right as we spawn the new one.
      // TODO: Account for travel time as well!
      if (min && min.ticksToLive && min.ticksToLive < min.body.length * CREEP_SPAWN_TIME) {
        log.info(`Miner ${min.name} is about to die.  Requesting a new one.`);
        this.requestHarvester();
        return;
      }
    }
  }

  // ensureContainer will make sure the constructionSiteRef or containerRef is set.
  // If they are not, it will build the construction site.
  private ensureContainer(): void {
    if (!this.data.miningSpot) {
      return;
    }

    if (this.data.containerRef) {
      // Container exists, we are good!
      return;
    }

    if (!this.data.containerRef) {
      // Is the container built?
      const result = this.room()
        .lookForAt(LOOK_STRUCTURES, this.data.miningSpot.x, this.data.miningSpot.y)
        .find(structure => structure.structureType === STRUCTURE_CONTAINER);
      if (result) {
        this.data.containerRef = result.id;
        log.info(`Container built for ${this.data.sourceID}`);
        return;
      }
    }

    if (!this.data.constructionSiteRef) {
      // Is there a construction site?
      const sites = this.room().lookForAt(LOOK_CONSTRUCTION_SITES, this.data.miningSpot.x, this.data.miningSpot.y);
      if (sites.length > 0) {
        this.data.constructionSiteRef = sites[0].id;
      } else {
        log.info(`Construction site is required for for ${this.data.sourceID}`);
      }
    }

    if (!this.data.constructionSiteRef && !this.data.containerRef) {
      const ret = this.room().createConstructionSite(
        this.data.miningSpot.x,
        this.data.miningSpot.y,
        STRUCTURE_CONTAINER
      );
      if (ret == ERR_INVALID_TARGET) {
        this.data.invalidConstructionSites.push(this.data.miningSpot);
        this.data.miningSpot = undefined;
        this.pickSite();
        log.error(`Container could not be build for ${this.data.sourceID}! Picking a new site.`);
        return;
      }
    }
  }

  private announceResources(): void {
    const core = ProgramOwnedRoom.getByRoom(this.data.roomName);
    if (core) {
      const pile = this.dropPile();
      if (pile && core.heapLogistics()) {
        core.heapLogistics()!.announceAvailable(pile.ref, RESOURCE_ENERGY);
      }
      const container = this.container();
      if (container && core.heapLogistics()) {
        core.heapLogistics()!.announceAvailable(container.ref, RESOURCE_ENERGY);
      }
    }
  }

  public execute(): ProcessCode {
    if (!this.source) {
      // Developer error?  Or source disappeared which seems improbable.
      return ProcessCode.ERROR;
    }

    this.pickSite();
    this.ensureContainer();
    this.maintainHarvester();
    this.announceResources();

    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }

  // Ensures no creep will shove the miner out of the way
  private reserveSite(): void {
    if (!this.data.miningSpot) {
      return;
    }

    this.room().blockSquare!(new RoomPosition(this.data.miningSpot.x, this.data.miningSpot.y, this.data.roomName));
  }
}

Process.register(ProgramStaticHarvest.type, ProgramStaticHarvest);
