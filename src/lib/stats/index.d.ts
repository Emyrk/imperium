interface Memory {
  // Stats is mainly written to memory segments, but
  // some stats are written to Memory.stats for tracking persistent
  // stats across every tick.
  stats: {
    persistent: {
      avgCPU: number;
      lastGlobalReset: number;
    };
  };
}
