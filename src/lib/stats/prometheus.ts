// Prometheus is built as a nested object. Each level prepends it's name to the key.
// Each level can also have labels that are prepended to all children.
// An example struct:
//
//  {
//   "room{room=E11S53}": {
//     "tick": 100,
//     "controller_level": 6
//   }
// }

import { profile } from "lib/profiler/decorator";

export type Labels = Record<string, string>;

export interface Gauge {
  set(value: number): void;
  clear(): void;
  // Helpful to read the value without setting it
  read(): number | undefined;
}

// Object is dangerous to use, prefer to use gauges
export interface Object {
  set(value: any): void;
}

@profile
class Metrics {
  private _metrics: { [key: string]: any } = {};
  private clear?: () => void;

  group(name: string, labels?: Labels): Metrics {
    const metricName = `${name}${labelsToPairs(labels).asString}`;
    if (!this._metrics[metricName]) {
      this._metrics[metricName] = {};
    }

    return new Metrics(this._metrics[metricName], () => {
      delete this._metrics[metricName];
      this._metrics[metricName] = {};
    });
  }

  gauge(name: string, labels?: Labels): Gauge {
    const metricName = `${name}${labelsToPairs(labels).asString}`;

    return {
      set: (value: number) => {
        this._metrics[metricName] = value;
      },
      clear: () => {
        this._metrics[metricName] = null;
      },
      read: () => {
        return this._metrics[metricName];
      }
    };
  }

  object(name: string, labels?: Labels): Object {
    const metricName = `${name}${labelsToPairs(labels).asString}`;
    if (!this._metrics[metricName]) {
      this._metrics[metricName] = {};
    }

    return {
      set: (value: any) => {
        this._metrics[metricName] = value;
      }
    };
  }

  reset(): void {
    if (!this.clear) {
      throw new Error("Metrics.delete() called without a clear function set");
    }

    this.clear();
  }

  // An instance
  constructor(section: { [key: string]: any }, clear?: () => void) {
    this._metrics = section;
    this.clear = clear;
  }

  json(): string {
    return JSON.stringify(this._metrics);
  }
}

const clearRoot = () => {
  metrics = new Metrics({}, clearRoot);
};

export let metrics = new Metrics({}, clearRoot);

export function reportMetrics(segmentID: number, metrics: Metrics) {
  RawMemory.segments[segmentID] = JSON.stringify(metrics.json());
}

type labelPairs = {
  pairs: { key: string; value: string }[];
  asString: string;
};

function labelsToPairs(labels?: Labels): labelPairs {
  if (!labels) {
    return { pairs: [], asString: "" };
  }
  let first = true;
  const keys = Object.keys(labels);
  if (keys.length === 0) return { pairs: [], asString: "" };
  const pairs = keys.sort().reduce(
    (acc, key) => {
      acc.pairs.push({ key, value: labels[key] });
      if (first) {
        first = false;
      } else {
        acc.asString += ",";
      }
      acc.asString += `${key}=${labels[key]}`;
      return acc;
    },
    {
      pairs: [],
      asString: ""
    } as labelPairs
  );
  pairs.asString = "{" + pairs.asString + "}";
  return pairs;
}
