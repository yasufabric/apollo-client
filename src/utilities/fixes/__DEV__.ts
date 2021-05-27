import global from "../common/global";
import { maybe } from "../common/maybe";

function getDEV() {
  try {
    return Boolean(__DEV__);
  } catch {
    Object.defineProperty(global, "__DEV__", {
      value: maybe(() => process.env.NODE_ENV) !== "production",
      enumerable: false,
      configurable: true,
      writable: true,
    });
    return global.__DEV__;
  }
}

export default getDEV();
