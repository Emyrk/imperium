import { isResource, isStoreStructure } from "declarations/typeGuards";
import { TaskInvalid } from "task/instances/invalid";
import { TaskPickup } from "task/instances/pickup";
import { TaskWithdraw } from "task/instances/withdraw";

// TaskTake figures out how to pull resources from a target
export class TaskTake {
  private target: string;
  private object: AnyStoreStructure | Resource | null = null;
  private objType: "store" | "resource" | "unknown" = "unknown";
  private resourceType: ResourceConstant;

  private resourcesLeft: () => boolean = () => false;
  constructor(target: string, resourceType: ResourceConstant) {
    this.target = target;
    this.resourceType = resourceType;

    this.object = deref(this.target) as AnyStoreStructure | Resource | null;
    if (!this.object) {
      // Invalid
      return;
    }

    // resource requires "pickup". "store" requires "transfer/withdraw"
    if (isStoreStructure(this.object)) {
      this.objType = "store";

      this.resourcesLeft = () => {
        const used = (this.object as AnyStoreStructure).store.getUsedCapacity(resourceType);
        return used !== undefined && used !== null && used >= 0;
      };
    } else if (isResource(this.object)) {
      this.objType = "resource";
      this.resourcesLeft = () => {
        if (deref(target) === null) {
          return false;
        }

        const amount = (this.object as Resource).amount;
        return amount >= 0;
      };
    } else {
      this.objType = "unknown";
    }
  }

  public new(amount?: number): ProtoTask<any> {
    if (this.objType === "unknown") {
      return TaskInvalid.new();
    }

    if (this.objType === "resource") {
      return TaskPickup.new(this.object as Resource);
    }

    return TaskWithdraw.new(this.object as Structure, this.resourceType, amount);
  }

  public isValid(): boolean {
    if (!this.object) {
      return false;
    }

    if (this.objType === "unknown") {
      return false;
    }

    return this.resourcesLeft();
  }
}
