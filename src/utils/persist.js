const STORAGE_KEY = '32bitsim.project.v1';

function replacer(key, value) {
  if (value instanceof Set) return { __set: [...value] };
  return value;
}
function reviver(key, value) {
  if (value && typeof value === 'object' && Array.isArray(value.__set)) return new Set(value.__set);
  return value;
}

export function serializeProject(parts, wires, code) {
  const plainParts = parts.map((p) => ({ id: p.id, type: p.type, x: p.x, y: p.y, label: p.label, state: p.state }));
  return JSON.stringify({ parts: plainParts, wires, code, version: 1 }, replacer);
}

export function deserializeProject(json) {
  return JSON.parse(json, reviver);
}

export function saveToLocalStorage(parts, wires, code) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeProject(parts, wires, code));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? deserializeProject(raw) : null;
  } catch {
    return null;
  }
}

export function downloadProject(parts, wires, code, filename = '32bitsim-project.json') {
  const blob = new Blob([serializeProject(parts, wires, code)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
