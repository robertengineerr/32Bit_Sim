// Small shared helpers used by partsCatalog.js definitions.

export const GND = { kind: 'gnd' };
export const VCC = { kind: 'vcc' };
export const digital = (value) => ({ kind: 'digital', value }); // 'HIGH' | 'LOW'
export const pwm = (value) => ({ kind: 'pwm', value }); // 0..255
export const analog = (value) => ({ kind: 'analog', value }); // 0..4095

export function levelIsHigh(level) {
  if (!level) return false;
  if (level.kind === 'vcc') return true;
  if (level.kind === 'digital') return level.value === 'HIGH';
  if (level.kind === 'pwm') return level.value > 127;
  if (level.kind === 'analog') return level.value > 2048;
  return false;
}

function pinKey(partId, pin) {
  return `${partId}::${pin}`;
}

// A manual two-pin switch: shorts pinA<->pinB while part.state.active is true.
export function manualSwitchConnectors(pinA, pinB) {
  return (part) => (part.state.active ? [[pinA, pinB]] : []);
}

// A level-triggered switch (relay coil, transistor base/collector-emitter):
// shorts pinA<->pinB while the net on controlPin was HIGH-ish on the previous
// resolution pass. On the very first pass (prevLevels === null) it's treated
// as inactive so the fixed-point iteration has a defined starting point.
export function controlledSwitchConnectors(controlPin, pinA, pinB, { invert = false } = {}) {
  return (part, prevLevels) => {
    if (!prevLevels) return invert ? [[pinA, pinB]] : [];
    const level = prevLevels.get(pinKey(part.id, controlPin));
    const high = levelIsHigh(level);
    const active = invert ? !high : high;
    return active ? [[pinA, pinB]] : [];
  };
}

export function readControlLevel(prevLevels, partId, pin) {
  if (!prevLevels) return null;
  return prevLevels.get(pinKey(partId, pin)) || null;
}
