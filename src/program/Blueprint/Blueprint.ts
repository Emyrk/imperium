import { exists } from "fs";
import { Process, ProcessCode } from "kernel/Process";
import { log } from "lib/log/log";
import { BlueprintPlan, BuildingPlans } from "lib/roomplanning/Planner";
import { equalCoords } from "lib/utils/distance";

export interface BlueprintData extends ProcessData {
  buildings: { [key in STRUCTURE_CONTAINER as string]: BlueprintPlan[] };
  visualOnly: boolean;
}

export class ProgramBlueprint extends Process<BlueprintData> {
  public static type = "blueprint";
  public static new(roomName: string, visualOnly: boolean = false) {
    return Process.newProgram<BlueprintData>(ProgramBlueprint.type, `${roomName}_blueprint`, {
      roomName: roomName,
      buildings: {},
      visualOnly: visualOnly
    });
  }

  constructor(pid: number) {
    super(pid);
  }

  private get room(): Room {
    return Game.rooms[this.data.roomName];
  }

  private refreshSites: boolean = true;
  private checkSites(): void {
    const roomRCL = this.room.controller?.level || 0;
    const power = this.room.controller?.isPowerEnabled || false;

    for (const [type, plans] of Object.entries(this.data.buildings)) {
      for (const plan of plans) {
        if (plan.rcl && plan.rcl > roomRCL) {
          continue;
        }
        if (plan.power && !power) {
          continue;
        }

        const pos = new RoomPosition(plan.pos.x, plan.pos.y, this.room.name);
        const struct = pos.lookForStructure(type as BuildableStructureConstant);
        if (struct) {
          continue;
        }

        const site = pos.lookFor(LOOK_CONSTRUCTION_SITES)[0];
        if (!site) {
          const ret = this.room.createConstructionSite(pos, type as BuildableStructureConstant);
          if (ret !== OK) {
            log.error(`Failed to create construction site for ${type} at ${pos}`);
          }
        }
      }
    }
  }

  public execute(): ProcessCode {
    if (this.data.visualOnly) {
      this.visual();
      return ProcessCode.SUCCESS;
    }

    if (this.refreshSites || Game.time % 500 === 0) {
      this.checkSites();
      this.refreshSites = false;
    }

    return ProcessCode.SUCCESS;
  }

  selfTerminate(): ProcessCode {
    return ProcessCode.SUCCESS;
  }

  public reset(): void {
    this.data.buildings = {};
    this.refreshSites = true;
  }

  public add(plans: BuildingPlans): void {
    for (const [type, plan] of Object.entries(plans.buildings)) {
      if (!this.data.buildings[type]) {
        this.data.buildings[type] = [];
      }

      plan.forEach(plan => {
        const exists = this.data.buildings[type].find(exists => equalCoords(exists.pos, plan.pos));
        if (!exists) {
          this.data.buildings[type].push(plan);
          return;
        }
        log.error(`Blueprint: ${this.room.name} already has a plan for ${type} at ${plan.pos}`);
      });
    }

    this.refreshSites = true;
  }

  public visual(): void {
    for (const [type, plans] of Object.entries(this.data.buildings)) {
      for (const plan of plans) {
        const pos = new RoomPosition(plan.pos.x, plan.pos.y, this.room.name);
        this.room.visual.structure(pos.x, pos.y, type);
      }
    }
  }
}

Process.register(ProgramBlueprint.type, ProgramBlueprint);
