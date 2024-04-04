interface Memory {
  profiler?: ProfilerMemory;
}

interface ProfilerMemory {
  filter?: string;
  disableTick?: number;
  enabledTick: number;
  type: string;
  map: {
    [key: string]: {
      calls: number;
      time: number;
      subs: any;
    };
  };
  totalTime: number;
}
