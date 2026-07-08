import { catalog } from '../data/partsCatalog.js';

let counter = 0;
export function newId(type) {
  counter += 1;
  return `${type}_${Date.now().toString(36)}_${counter}`;
}

export function createPart(type, x, y, extra = {}) {
  const def = catalog[type];
  if (!def) throw new Error(`Unknown part type: ${type}`);
  return {
    id: newId(type),
    type,
    x, y,
    label: extra.label || null,
    state: def.initialState ? def.initialState(extra.stateArg) : {},
  };
}
