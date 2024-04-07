import { color } from "lib/utils/links";

export enum LogLevels {
  ERROR, // log.level = 0
  WARNING, // log.level = 1
  ALERT, // log.level = 2
  INFO, // log.level = 3
  DEBUG // log.level = 4
}

/**
 * Default debug level for log output
 */
export const LOG_LEVEL: number = LogLevels.DEBUG;

/**
 * Prepend log output with current tick number.
 */
export const LOG_PRINT_TICK: boolean = true;

/**
 * Prepend log output with source line.
 */
export const LOG_PRINT_LINES: boolean = false;

/**
 * Load source maps and resolve source lines back to typescript.
 */
export const LOG_LOAD_SOURCE_MAP: boolean = false;

/**
 * Maximum padding for source links (for aligning log output).
 */
export const LOG_MAX_PAD: number = 100;

/**
 * VSC location, used to create links back to source.
 * Repo and revision are filled in at build time for git repositories.
 */
export const LOG_VSC = { repo: "@@_repo_@@", revision: "@@_revision_@@", valid: false };
// export const LOG_VSC = { repo: "@@_repo_@@", revision: __REVISION__, valid: false };

/**
 * URL template for VSC links, this one works for github and gitlab.
 */
export const LOG_VSC_URL_TEMPLATE = (path: string, line: string) => {
  return `${LOG_VSC.repo}/blob/${LOG_VSC.revision}/${path}#${line}`;
};

// <caller> (<source>:<line>:<column>)
const stackLineRe = /([^ ]*) \(([^:]*):([0-9]*):([0-9]*)\)/;
const FATAL = -1;
const fatalColor = "#d65156";

interface SourcePos {
  compiled: string;
  final: string;
  original: string | undefined;
  caller: string | undefined;
  path: string | undefined;
  line: number | undefined;
}

export function resolve(fileLine: string): SourcePos {
  const split = _.trim(fileLine).match(stackLineRe);
  if (!split || !Log.sourceMap) {
    return { compiled: fileLine, final: fileLine } as SourcePos;
  }

  const pos = { column: parseInt(split[4], 10), line: parseInt(split[3], 10) };

  const original = Log.sourceMap.originalPositionFor(pos);
  const line = `${split[1]} (${original.source}:${original.line})`;
  const out = {
    caller: split[1],
    compiled: fileLine,
    final: line,
    line: original.line,
    original: line,
    path: original.source
  };

  return out;
}

function makeVSCLink(pos: SourcePos): string {
  if (!LOG_VSC.valid || !pos.caller || !pos.path || !pos.line || !pos.original) {
    return pos.final;
  }

  return link(vscUrl(pos.path, `L${pos.line.toString()}`), pos.original);
}

function tooltip(str: string, tooltip: string): string {
  return `<abbr title='${tooltip}'>${str}</abbr>`;
}

function vscUrl(path: string, line: string): string {
  return LOG_VSC_URL_TEMPLATE(path, line);
}

function link(href: string, title: string): string {
  return `<a href='${href}' target="_blank">${title}</a>`;
}

function time(): string {
  return color(Game.time.toString(), "gray");
}

/**
 * Log provides methods for displaying pretty-printed text into the Screeps console
 */
export class Log {
  static sourceMap: any;

  static init() {
    if (!Log.useMemory()) {
      return;
    }
    _.defaultsDeep(Memory, {
      log: {
        level: LOG_LEVEL,
        showSource: LOG_PRINT_LINES,
        showTick: LOG_PRINT_TICK
      }
    });
  }

  constructor() {
    Log.init();
  }

  private static useMemory(): boolean {
    // Unit tests should not fail because of this.
    // @ts-ignore
    return Boolean(global.Memory);
  }

  get level(): number {
    if (!Log.useMemory()) {
      return LogLevels.DEBUG;
    }
    return Memory.log.level;
  }

  setLogLevel(value: number) {
    let changeValue = true;
    switch (value) {
      case LogLevels.ERROR:
        console.log(`Logging level set to ${value}. Displaying: ERROR.`);
        break;
      case LogLevels.WARNING:
        console.log(`Logging level set to ${value}. Displaying: ERROR, WARNING.`);
        break;
      case LogLevels.ALERT:
        console.log(`Logging level set to ${value}. Displaying: ERROR, WARNING, ALERT.`);
        break;
      case LogLevels.INFO:
        console.log(`Logging level set to ${value}. Displaying: ERROR, WARNING, ALERT, INFO.`);
        break;
      case LogLevels.DEBUG:
        console.log(`Logging level set to ${value}. Displaying: ERROR, WARNING, ALERT, INFO, DEBUG.`);
        break;
      default:
        console.log(
          `Invalid input: ${value}. Logging level can be set to integers between ` +
            LogLevels.ERROR +
            " and " +
            LogLevels.DEBUG +
            ", inclusive."
        );
        changeValue = false;
        break;
    }
    if (changeValue) {
      Memory.log.level = value;
    }
  }

  get showSource(): boolean {
    if (!Log.useMemory()) {
      return true;
    }
    return Memory.log.showSource;
  }

  set showSource(value: boolean) {
    Memory.log.showSource = value;
  }

  get showTick(): boolean {
    if (!Log.useMemory()) {
      return false;
    }
    return Memory.log.showTick;
  }

  set showTick(value: boolean) {
    Memory.log.showTick = value;
  }

  private _maxFileString: number = 0;

  trace(error: Error): Log {
    if (this.level >= LogLevels.ERROR && error.stack) {
      console.log(this.resolveStack(error.stack));
    }

    return this;
  }

  throw(e: Error) {
    console.log.apply(this, this.buildArguments(FATAL).concat([color(e.toString(), fatalColor)]));
  }

  error(...args: any[]): undefined {
    if (this.level >= LogLevels.ERROR) {
      console.log.apply(this, this.buildArguments(LogLevels.ERROR).concat([].slice.call(args)));
    }
    return undefined;
  }

  warning(...args: any[]): undefined {
    if (this.level >= LogLevels.WARNING) {
      console.log.apply(this, this.buildArguments(LogLevels.WARNING).concat([].slice.call(args)));
    }
    return undefined;
  }

  alert(...args: any[]): undefined {
    if (this.level >= LogLevels.ALERT) {
      console.log.apply(this, this.buildArguments(LogLevels.ALERT).concat([].slice.call(args)));
    }
    return undefined;
  }

  notify(message: string): undefined {
    this.alert(message);
    Game.notify(message);
    return undefined;
  }

  info(...args: any[]): undefined {
    if (this.level >= LogLevels.INFO) {
      console.log.apply(this, this.buildArguments(LogLevels.INFO).concat([].slice.call(args)));
    }
    return undefined;
  }

  debug(...args: any[]) {
    if (this.level >= LogLevels.DEBUG) {
      console.log.apply(this, this.buildArguments(LogLevels.DEBUG).concat([].slice.call(args)));
    }
  }

  getFileLine(upStack = 4): string {
    const stack = new Error("").stack;

    if (stack) {
      const lines = stack.split("\n");

      if (lines.length > upStack) {
        const originalLines = _.drop(lines, upStack).map(resolve);
        const hoverText = _.map(originalLines, "final").join("&#10;");
        return this.adjustFileLine(originalLines[0].final, tooltip(makeVSCLink(originalLines[0]), hoverText));
      }
    }
    return "";
  }

  private buildArguments(level: number): string[] {
    const out: string[] = [];
    switch (level) {
      case LogLevels.ERROR:
        out.push(color("ERR", "red"));
        break;
      case LogLevels.WARNING:
        out.push(color("WRN", "orange"));
        break;
      case LogLevels.INFO:
        out.push(color("INF", "green"));
        break;
      case LogLevels.DEBUG:
        out.push(color("DBG", "gray"));
        break;
      case FATAL:
        out.push(color("FTL", fatalColor));
        break;
      default:
        break;
    }
    if (this.showTick) {
      out.push(time());
    }
    if (this.showSource && level <= LogLevels.ERROR) {
      out.push(this.getFileLine());
    }
    return out;
  }

  private resolveStack(stack: string): string {
    if (!Log.sourceMap) {
      return stack;
    }

    return _.map(stack.split("\n").map(resolve), "final").join("\n");
  }

  private adjustFileLine(visibleText: string, line: string): string {
    const newPad = Math.max(visibleText.length, this._maxFileString);
    this._maxFileString = Math.min(newPad, LOG_MAX_PAD);

    return `|${_.padRight(line, line.length + this._maxFileString - visibleText.length, " ")}|`;
  }
}

export const log = new Log();
