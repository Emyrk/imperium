import { RANGES } from "lib/constants/creep";
import { log } from "lib/log/log";
import { profile } from "lib/profiler/decorator";
import { Task, TaskCode } from "task/Task";
import { Tasks } from "task/Tasks";

export interface TaskStaticHarvestData extends TaskData {}

@profile
export class TaskStaticHarvest extends Task<TaskStaticHarvestData, null> {
  public static type = "static-harvest";
  private harvestPower?: number;

  public static new(target: RoomPosition, opts: MoveOptsProto = {}): ProtoTask<TaskStaticHarvestData> {
    return Task.newTask<TaskStaticHarvestData>(
      TaskStaticHarvest.type,
      target,
      {},
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

  work(): TaskCode {
    // TODO: We do not need to do this lookup every tick. We should cache things and "sleep" when
    // we are in repair mode.
    const found = this.targetPos!.look();
    const tgt = _.find(found, look => {
      if (look.constructionSite) {
        return true;
      }
      if (look.structure && look.structure.structureType === STRUCTURE_CONTAINER) {
        return true;
      }
      return false;
    });

    if (!tgt) {
      return TaskCode.NOTHING_DONE;
    }

    if (tgt?.constructionSite) {
      const site = tgt.constructionSite;
      if (site.progress < site.progressTotal) {
        const ret = this.creep?.build(site);
        if (ret !== OK) {
          log.error(`ContainerSource:build:${ret} from ${this.creep!.name} on ${site.ref}`);
        }
        return TaskCode.WORKING;
      }
    }

    if (tgt.structure) {
      const cont = tgt.structure as StructureContainer;
      if (cont.hits < cont.hitsMax) {
        const ret = this.creep?.repair(cont);
        if (ret !== OK) {
          log.error(`ContainerSource:repair:${ret} from ${this.creep!.name} on ${cont.ref}`);
        }
        return TaskCode.WORKING;
      }
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
