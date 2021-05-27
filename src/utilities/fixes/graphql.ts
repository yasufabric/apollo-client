import { undo } from './process';
import { isType } from 'graphql';

export function applyFixes() {
  isType(null);
  return undo();
}
