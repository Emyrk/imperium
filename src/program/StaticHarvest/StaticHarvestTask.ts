import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskStaticHarvestData extends TaskData {
  linkSpot?: Coord;
}

@profile
export class TaskStaticHarvest extends Task<TaskStaticHarvestData, null> {
  public static type = "static-harvest";
  private harvestPower?: number;

  public static new(
    target: RoomPosition,
    linkSpot?: Coord,
    opts: MoveOptsProto = {}
  ): ProtoTask<TaskStaticHarvestData> {
    return Task.newTask<TaskStaticHarvestData>(
      TaskStaticHarvest.type,
      target,
      {
        linkSpot: linkSpot
      },
      {
        targetRange: _.min([RANGES.REPAIR, RANGES.BUILD]),
        moveOptions: opts
      }
    );
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
  private containerConstructionSite?: ConstructionSite;
  private container?: StructureContainer;
  private updateConstructionSites(force?: boolean): void {
    if (!force && !this.checked && Game.time % 500 !== 0) {
      return;
    }

    // Reset, this will be updated
    this.container = undefined;
    this.containerConstructionSite = undefined;
    // Look at the spot where we expect a container to be
    const found = this.targetPos!.look();
    const tgt = _.find(found, look => {
      if (look.constructionSite) {
        this.containerConstructionSite = look.constructionSite;
        return true;
      }
      if (look.structure && look.structure.structureType === STRUCTURE_CONTAINER) {
        this.container = look.structure as StructureContainer;
        return true;
      }
      return false;
    });

    this.checked = true;
  }

  work(): TaskCode {
    // Update our cached references.
    this.updateConstructionSites(false);

    if (this.containerConstructionSite) {
      const site = this.containerConstructionSite;
      if (site.progress < site.progressTotal) {
        const ret = this.creep?.build(site);
        if (ret !== OK) {
          log.error(`ContainerSource:build:${ret} from ${this.creep!.name} on ${site.ref}`);
        }
        return TaskCode.WORKING;
      } else {
        this.updateConstructionSites(true);
        // We could keep going, but the next tick will figure it out with the updated sites.
        return TaskCode.NOTHING_DONE;
      }
    }

    // Check if the container needs to be repaired.
    if (this.container) {
      if (this.container.hits < this.container.hitsMax) {
        const ret = this.creep?.repair(this.container);
        if (ret !== OK) {
          log.error(`ContainerSource:repair:${ret} from ${this.creep!.name} on ${this.container.ref}`);
        }
        return TaskCode.WORKING;
      }
    }

    // TODO: Do links!
    // if (this.data.linkSpot) {
    //   // Link code active
    //   // TODO: Disable the container stuff once links can run the show.
    //   const link = this.data.linkSpot.lookFor(LOOK_STRUCTURES)[0] as StructureLink;
    // }

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
