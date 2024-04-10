import { Top as TopF } from "kernel/Top";
import { log } from "lib/log/log";

// @ts-ignore
global.Top = function (every?: number): void {
  TopF.requestTop(every);
};

// @ts-ignore
global.print = function (obj: any): void {
  log.printObject(obj);
};
