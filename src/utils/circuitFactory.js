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
    rotation: extra.rotation || 0,
    flipped: extra.flipped || false,
    label: extra.label || null,
    state: def.initialState ? def.initialState(extra.stateArg) : {},
  };
}

export function clonePart(part, dx = 24, dy = 24) {
  return {
    id: newId(part.type),
    type: part.type,
    x: part.x + dx,
    y: part.y + dy,
    rotation: part.rotation || 0,
    flipped: part.flipped || false,
    label: part.label,
    state: structuredClone(part.state),
  };
}
