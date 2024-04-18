interface ProtoSavedStateData<MemArgs> {
  id: string;

  // Inputs
  memory: MemArgs;

  // Last time in game ticks
  lastTouched: number;
  deadline: number;
}

interface SavedStateData<MemArgs, HeapArgs> extends ProtoSavedStateData<MemArgs> {
  // Heap based data
  heap: HeapArgs;
}

interface Memory {
  savedStates: { [key: string]: ProtoSavedStateData<any> };
}
