import { log } from "lib/log/log";
import { Process, ProcessCode } from "./Process";

interface TopRow {
  pid: number;
  label: string;
  depth: number;
  code: ProcessCode;
  lastExecTime: number;
  avgExecTime: number;
  totalExecTime: number;
  ticks: string;

  intentsLast: number;
}

interface TopRowPads {
  pid: number;
  label: number;
  exec: number;
  avgExec: number;
  totalExec: number;
  ticks: number;
}

export class Top {
  private static wantTop?: number;
  private static wantTopEvery?: number;

  static printTop(): void {
    if (Top.wantTop && Top.wantTop === Game.time) {
      const every = Top.wantTopEvery;
      delete Top.wantTop;
      delete Top.wantTopEvery;
      Top.top(every);
    }
  }

  // RequestTop is because top needs to be called after all processes are created and run.
  public static requestTop(every?: number): string {
    log.info("Top requested.");
    Top.wantTop = Game.time + 1;
    if (every) {
      this.wantTopEvery = every;
    } else {
      delete this.wantTopEvery;
    }
    return `Top will be printed at the end of the next tick (${Game.time + 1}).`;
  }

  public static topTable(rows: TopRow[], pads: TopRowPads) {
    // const kernel = Top._kernelRun!;
    // let main = Top._mainRun;
    // if (!main) {
    //   main = {
    //     firstTick: 0,
    //     total: 0,
    //     last: 0,
    //     avg: 0
    //   };
    // }

    const header = ["  ", "PID", "TICKS", "LABEL", "AVG", "LAST", "TOTAL", "INTENTS"];
    const rowPads = [1, pads.pid, pads.ticks, pads.label, pads.avgExec, pads.exec, 4];
    console.log(Top.line(header, rowPads));
    // console.log(
    //   Top.line(
    //     ["🌎", "*", "", "Main", main.avg.toFixed(2), main.last.toFixed(2), Top.formatTotalExecTime(main.total)],
    //     rowPads
    //   )
    // );
    // console.log(
    //   Top.line(
    //     ["🖥️", "*", "", "Kernel", kernel.avg.toFixed(2), kernel.last.toFixed(2), Top.formatTotalExecTime(kernel.total)],
    //     rowPads
    //   )
    // );
    _.forEach(rows, row => {
      let codeStr = "❓";
      switch (row.code) {
        case ProcessCode.SUCCESS:
          codeStr = "✅";
          break;
        case ProcessCode.SLEEPING:
          codeStr = "💤";
          break;
        case ProcessCode.ERROR:
          codeStr = "❌";
          break;
        default:
          codeStr = "❓";
      }

      console.log(
        Top.line(
          [
            codeStr,
            row.pid.toString(),
            row.ticks,
            row.label,
            row.avgExecTime.toFixed(2),
            row.lastExecTime.toFixed(2),
            Top.formatTotalExecTime(row.totalExecTime),
            row.intentsLast.toString()
          ],
          rowPads
        )
      );
    });
  }

  public static line(values: string[], pads: number[]): string {
    let line = "";
    for (let i = 0; i < values.length; i++) {
      line += values[i].padEnd(pads[i]) + "\t";
    }
    return line;
  }

  public static top(every?: number): void {
    let table: TopRow[] = [];
    _.forEach(
      Object.values(Process._processByPid).sort((a, b) => a.pid - b.pid),
      process => {
        if (process.scheduled.parent === null) {
          const rows = Top.topRecurse(process, 0);
          table.push(...rows);
        }
      }
    );

    const pad = table.reduce(
      (acc, row) => {
        return {
          pid: Math.max(acc.pid, `${row.pid}`.length),
          label: Math.max(acc.label, row.label.length),
          exec: Math.max(acc.exec, `${row.lastExecTime.toFixed(2)}`.length),
          avgExec: Math.max(acc.avgExec, `${row.avgExecTime.toFixed(2)}`.length),
          totalExec: Math.max(acc.totalExec, `${row.totalExecTime.toFixed(2)}`.length),
          ticks: Math.max(acc.ticks, `${row.ticks}`.length)
        };
      },
      {
        pid: 3,
        label: 3,
        exec: 3,
        avgExec: 3,
        totalExec: 3
      } as TopRowPads
    );

    Top.topTable(table, pad);
    if (every) {
      Top.wantTop = Game.time + every;
      Top.wantTopEvery = every;
    }
  }

  private static formatTotalExecTime(totalExecTime: number): string {
    return totalExecTime > 1000 ? (totalExecTime / 1000).toFixed(1) + "k" : totalExecTime.toFixed(0);
  }

  private static totalTicks(start: number): string {
    const dur = Game.time - start;
    if (dur > 1000) {
      return (dur / 1000).toFixed(1) + "k";
    }
    return dur.toFixed(0);
  }

  private static topRecurse(me: Process<any>, depth: number): TopRow[] {
    let label = me.label;
    if (depth > 0) {
      label = "  ".repeat(depth) + "└ " + label;
    }

    let rows: TopRow[] = [
      {
        pid: me.pid,
        label: label,
        depth: depth,
        code: me._lastExec,
        lastExecTime: me._processTiming?.last ?? 0,
        avgExecTime: me._processTiming?.avg ?? 0,
        totalExecTime: me._processTiming?.total ?? 0,
        ticks: Top.totalTicks(me._firstTick),
        intentsLast: 0 // defer to the civis row to record intents
      }
    ];

    if (me._processTimingCivis) {
      const creepLabel = "  ".repeat(depth) + "└ " + `${me._processCivisQuantity}_creeps`;
      rows.push({
        pid: me.pid,
        label: creepLabel,
        depth: depth + 1,
        code: ProcessCode.SUCCESS,
        lastExecTime: me._processTimingCivis.last,
        avgExecTime: me._processTimingCivis.avg,
        totalExecTime: me._processTimingCivis.total,
        ticks: Top.totalTicks(me._firstTick),
        intentsLast: -1 //me._processCivisIntents.totalIntents
      });
    }

    _.forEach(me.scheduled.children, child => {
      const process = Process.initializeProgram(child);
      if (process) {
        const childTop = Top.topRecurse(process, depth + 1);
        rows.push(...childTop);
      }
    });
    return rows;
  }
}
