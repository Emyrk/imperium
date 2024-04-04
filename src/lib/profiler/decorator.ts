import { USE_PROFILER } from "config";
import { profiler } from "./profile";

// https://github.com/screepers/screeps-typescript-profiler
// @ts-ignore
const ownKeys = (o: Object): (string | symbol)[] => {
  try {
    return Reflect.ownKeys(o);
  } catch (IE) {
    var gOPNs = Object.getOwnPropertyNames;
    var gOPSs = Object.getOwnPropertySymbols;
    // @ts-ignore
    return gOPNs(o).concat(gOPSs ? gOPSs(o) : []);
  }
};

// export {profile} from './profiler';
export function profile(target: Function): void;
export function profile(target: object, key: string | symbol, _descriptor: TypedPropertyDescriptor<Function>): void;
export function profile(
  target: object | Function,
  key?: string | symbol,
  _descriptor?: TypedPropertyDescriptor<Function>
): void {
  if (!USE_PROFILER) {
    return;
  }

  if (key) {
    // case of method decorator
    profiler.registerFN(target, key.toString());
    return;
  }

  // case of class decorator

  const ctor = target as any;
  if (!ctor.prototype) {
    return;
  }

  const standardClassProps = Object.getOwnPropertyNames(class _ {});

  const isOwnStaticMember = (propName: string) => !standardClassProps.includes(propName);

  const staticMembers = Object.getOwnPropertyNames(ctor).filter(isOwnStaticMember);

  const className = ctor.name;

  staticMembers.forEach(k => {
    profiler.registerFN(ctor, k.toString(), className);
  });

  ownKeys(ctor.prototype).forEach((k: PropertyKey) => {
    profiler.registerFN(ctor.prototype, k.toString(), className);
    // wrapFunction(ctor.prototype, k, className);
  });
}
