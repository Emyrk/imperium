import { layoutDense } from "lib/roomplanning/dense";
import { extensionBlock } from "./presets/extensionBlock";

function extensionStamp() {
  const block = extensionBlock;
}

export function villagePlan(room: Room) {
  // Find a place to put the basic village stamp
  // close to the controller.
  layoutDense(room);
}
