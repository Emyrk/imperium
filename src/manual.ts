import { Top as TopF } from "kernel/Top";

// @ts-ignore
global.Top = function (every?: number): void {
  TopF.requestTop(every);
};
