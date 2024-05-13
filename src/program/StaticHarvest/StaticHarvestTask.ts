import { Civis } from "civis/Civis";
import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { ProgramVillage } from "program/Village/Village";
import { RoomVillage } from "program/Village/interface";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskStaticHarvestData extends TaskData {
  linkSpot?: Coord;
  // Allows calling into the harvest pid from the creep.
  harvestPid: number;
}

interface Site<T extends StructureContainer | StructureLink> {
  coord?: Coord;
  constructionSite?: ConstructionSite;
  structure?: T;
}

@profile
export class TaskStaticHarvest extends Task<TaskStaticHarvestData, null> {
  public static type = "static-harvest";
  private harvestPower?: number;

  public static new(
    target: RoomPosition,
    harvestPid: number,
    linkSpot?: Coord,
    opts: MoveOptsProto = {}
  ): ProtoTask<TaskStaticHarvestData> {
    return Task.newTask<TaskStaticHarvestData>(
      TaskStaticHarvest.type,
      target,
      {
        linkSpot: linkSpot,
        harvestPid: harvestPid
      },
      {
        targetRange: _.min([RANGES.REPAIR, RANGES.BUILD]),
        moveOptions: opts
      }
    );
  }

  constructor(creep: Civis, protoTask: ProtoTask<TaskStaticHarvestData>) {
    super(creep, protoTask);
  }

  isValid(): boolean {
    if (!this.harvestPower) {
      this.harvestPower = this.creep.getBodyparts(WORK) * HARVEST_POWER;
    }

    // If our free capacity is greater than the amount we can harvest,
    // then we should harvest.
    // Said plainly, we should only do this task if harvesting would overflow
    // our carry capacity.
    if (this.creep!.store.getFreeCapacity(RESOURCE_ENERGY) > this.harvestPower) {
      return false;
    }

    return true;
  }

  private checked = false;
  private sites: {
    link: Site<StructureLink>;
    container: Site<StructureContainer>;
  } = {
    link: {},
    container: {}
  };

  private updateContainer(): void {
    this.sites.container = {};

    if (!this.targetPos) {
      return;
    }

    const container = this.targetPos.lookForStructure(STRUCTURE_CONTAINER);
    if (container) {
      this.sites.container.structure = container as StructureContainer;
      return;
    }

    const cs = this.targetPos.lookFor(LOOK_CONSTRUCTION_SITES).filter(cs => cs.structureType === STRUCTURE_CONTAINER);
    if (cs) {
      this.sites.container.constructionSite = cs[0];
      return;
    }
  }

  private updateLink(): void {
    this.sites.link = {};

    if (!this.data.linkSpot) {
      return;
    }

    const pos = new RoomPosition(this.data.linkSpot.x, this.data.linkSpot.y, this.creep.pos.roomName);
    const link = pos.lookForStructure(STRUCTURE_LINK);
    if (link) {
      this.sites.link.structure = link as StructureLink;
      return;
    }

    const cs = pos.lookFor(LOOK_CONSTRUCTION_SITES).filter(cs => cs.structureType === STRUCTURE_LINK);
    if (cs) {
      this.sites.link.constructionSite = cs[0];
      return;
    }
  }

  private updateSites(force?: boolean): void {
    if (!(!this.checked || force || Game.time % 500 === 0)) {
      return;
    }

    this.updateContainer();
    this.updateLink();
    this.checked = true;
  }

  linkWork(): TaskCode {
    if (this.data.linkSpot) {
      if (!this.village) {
        this.village = ProgramVillage.getByRoom(this.creep.pos.roomName);
      }

      if (!this.village) {
        log.error(`StaticHarvest:work:No village found for ${this.creep.pos.roomName}`);
        return TaskCode.NOTHING_DONE;
      }

      if (this.village.primaryLink()) {
        // Transfer to the link.

        return TaskCode.NOTHING_DONE;
      }
    }

    // No link related work done.
    return TaskCode.NOTHING_DONE;
  }

  private village?: RoomVillage;
  work(): TaskCode {
    this.updateSites();

    const energy = this.creep!.store.getUsedCapacity(RESOURCE_ENERGY);
    if (energy === 0) {
      return TaskCode.NOTHING_DONE;
    }

    // Always prioritize keeping the container alive.
    // TODO: At some point, we should just get rid of the container and use the link.
    const container = this.sites.container.structure;

    // Is the container damaged?
    if (container && container.hitsMax - container.hits > REPAIR_POWER * energy) {
      // Repair
      const ret = this.creep?.repair(container);
      if (ret !== OK) {
        log.error(`ContainerSource:repair:${ret} from ${this.creep!.name} on ${container.ref}`);
      }
      return TaskCode.WORKING;
    }

    // Is the container not built?
    if (this.sites.container.constructionSite) {
      const site = this.sites.container.constructionSite;
      if (site.progress < site.progressTotal) {
        const ret = this.creep?.build(site);
        if (ret !== OK) {
          log.error(`ContainerSource:build:${ret} (CONTAINER) from ${this.creep!.name} on ${site.ref}`);
        }
        // Force a recheck of the sites on the next tick.
        // TODO: we can predict this a bit better.
        this.checked = false;
        return TaskCode.WORKING;
      }
    }

    // Is the link built?
    if (this.sites.link.constructionSite) {
      const site = this.sites.link.constructionSite;
      if (site.progress < site.progressTotal) {
        const ret = this.creep?.build(site);
        if (ret !== OK) {
          log.error(`ContainerSource:build:${ret} (LINK) from ${this.creep!.name} on ${site.ref}`);
        }
        // Force a recheck of the sites on the next tick.
        // TODO: we can predict this a bit better.
        this.checked = false;
        return TaskCode.WORKING;
      }
    }

    const link = this.sites.link.structure;
    if (link && link.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      const ret = this.creep.transfer(link, RESOURCE_ENERGY);
      if (ret !== OK) {
        log.error(`ContainerSource:transfer:${ret} from ${this.creep!.name} to LINK ${link.ref}`);
      }
      return TaskCode.WORKING;
    }

    return TaskCode.NOTHING_DONE;
  }

  describe(): string {
    if (!this.targetPos) {
      return `StaticHarvest:no-tgt`;
    }
    return `StaticHarvest:(${this.targetPos.x}, ${this.targetPos.y})`;
  }
}

Tasks.register(TaskStaticHarvest.type, TaskStaticHarvest);
