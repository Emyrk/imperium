interface Memory {
  scheduler: {
    pidCounter: number;
  };

  processes: { [pid: number]: ProtoProcess<any> };
}

interface ProtoProcess<DataType> {
  scheduled: ScheduledProcess;
  // type so same program types can be identified.
  type: string;
  // label is the human name for the program.
  // Eg: E12S53_heap_logistics
  label: string;

  // TODO: Room name for grouping

  // data is the process data that persists to memory.
  data: DataType;
}

interface ScheduledProcess {
  pid: number;
  // Just the PID of the parent process
  parent: number | null;
  children: number[];
  // Optional sleep to halt process execution until
  // this game tick.
  sleepUntil?: number;
}
