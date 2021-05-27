import { maybe } from "../common/maybe";
import global from "../common/global";

let accessCount = 0;
let needToUndo = false;

if (global && maybe(() => process.env.NODE_ENV) === void 0) {
  const stub = {
    env: {
      NODE_ENV: "production",
    },
  };

  Object.defineProperty(global, "process", {
    get() {
      ++accessCount;
      return stub;
    },
    configurable: true,
    enumerable: false,
    writable: false,
  });

  // We expect this to be true now.
  needToUndo = "process" in global;
}

export function undo() {
  if (needToUndo) {
    delete (global as any).process;
    needToUndo = false;
  }
  return accessCount;
}
