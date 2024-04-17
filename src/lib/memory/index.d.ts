interface RawMemory {
  _parsed: any;
}

interface Memory {
  // Something for Mem
  resetBucket?: boolean;
  haltTick?: number;
  nextID?: number;
  nextPromiseID?: number;
}
