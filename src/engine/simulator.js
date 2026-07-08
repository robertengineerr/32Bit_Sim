import { catalog } from '../data/partsCatalog.js';
import { resolveCircuit } from './netlist.js';
import { levelIsHigh } from './simHelpers.js';

const TICK_MS = 60; // ~16fps, plenty for a teaching sim

// Half-step sequence for a 28BYJ-48 via ULN2003 (8 steps/cycle, 4096 steps/rev)
const STEP_TABLE = [
  [1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0],
  [0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 1], [1, 0, 0, 1],
];
const STEP_ANGLE = 360 / 4096;

function bitsEqual(a, b) {
  return a && b && a.length === b.length && a.every((v, i) => v === b[i]);
}

export class Simulator {
  constructor() {
    this.parts = [];
    this.wires = [];
    this.esp32Id = null;
    this.resolve = null;
    this.listeners = new Set();
    this.snapshot = { tick: 0 };
    this.timer = null;
    this.audio = null; // lazily created AudioContext-backed manager, see audio.js
    this.irBus = null; // { code, name, at }
    this.consoleLines = [];
    this.onConsole = null;
    this.running = false;
  }

  setCircuit(parts, wires) {
    this.parts = parts;
    this.wires = wires;
    this.esp32Id = (parts.find((p) => p.type === 'esp32c3') || {}).id || null;
  }

  getPart(id) {
    return this.parts.find((p) => p.id === id);
  }

  log(line) {
    this.consoleLines.push(line);
    if (this.consoleLines.length > 500) this.consoleLines.shift();
    if (this.onConsole) this.onConsole(line);
  }

  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getSnapshot() {
    return this.snapshot;
  }

  emit() {
    this.snapshot = { tick: this.snapshot.tick + 1 };
    for (const cb of this.listeners) cb();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  emitIrCode(code, name) {
    this.irBus = { code, name, at: performance.now() };
  }

  // Recomputes the netlist right now. Cheap enough to call from digitalRead etc.
  resolveNow() {
    this.resolve = resolveCircuit(this.parts, this.wires, catalog);
    return this.resolve;
  }

  tick() {
    const r = this.resolveNow();
    this.updateSteppers(r);
    this.updateBuzzers(r);
    this.updateFans(r);
    this.updateRelayVisual(r);
    this.emit();
  }

  updateSteppers(r) {
    for (const uln of this.parts.filter((p) => p.type === 'uln2003')) {
      const bits = ['IN1', 'IN2', 'IN3', 'IN4'].map((pin) => (levelIsHigh(r.levelOf(uln.id, pin)) ? 1 : 0));
      // A step sequence is written pin-by-pin (4 separate digitalWrite calls), so we'll
      // observe transient in-between patterns that aren't valid step-table entries.
      // Ignore those rather than treating them as the new "last settled pattern".
      const curIdx = STEP_TABLE.findIndex((p) => bitsEqual(p, bits));
      if (curIdx === -1) continue;
      const prev = uln.state.lastPattern;
      uln.state.lastPattern = bits;
      if (!prev || bitsEqual(prev, bits)) continue;
      const prevIdx = STEP_TABLE.findIndex((p) => bitsEqual(p, prev));
      if (prevIdx === -1) continue;
      let delta = curIdx - prevIdx;
      if (delta > 4) delta -= 8;
      if (delta < -4) delta += 8;
      const stepperEntry = r.findConnected(uln.id, 'OUT1', (e) => this.getPart(e.partId)?.type === 'stepper');
      const stepper = stepperEntry.length ? this.getPart(stepperEntry[0].partId) : null;
      if (stepper) {
        stepper.state.angle = (stepper.state.angle + delta * STEP_ANGLE) % 360;
        if (stepper.state.angle < 0) stepper.state.angle += 360;
      }
    }
  }

  updateBuzzers(r) {
    if (!this.audio) return;
    for (const bz of this.parts.filter((p) => p.type === 'buzzeractive')) {
      const hot = levelIsHigh(r.levelOf(bz.id, '+'));
      const gnd = r.levelOf(bz.id, '-').kind === 'gnd';
      this.audio.setToneActive(bz.id, hot && gnd, 2400);
    }
  }

  updateFans(r) {
    for (const fan of this.parts.filter((p) => p.type === 'fanmotor')) {
      const plus = r.levelOf(fan.id, '+');
      let speed = 0;
      if (plus.kind === 'pwm') speed = plus.value / 255;
      else if (plus.kind === 'digital' && plus.value === 'HIGH') speed = 1;
      else if (plus.kind === 'vcc') speed = 1;
      fan.state.speed = speed;
    }
  }

  updateRelayVisual(r) {
    for (const rel of this.parts.filter((p) => p.type === 'relay')) {
      rel.state.energized = levelIsHigh(r.levelOf(rel.id, 'IN'));
    }
  }

  // ---- low level GPIO API used by the Arduino-style runtime ----

  esp32() {
    return this.getPart(this.esp32Id);
  }

  resetPins() {
    const esp = this.esp32();
    if (!esp) return;
    for (const n of Object.keys(esp.state.pins)) {
      esp.state.pins[n] = { mode: 'INPUT', value: 0, pwmValue: null };
    }
  }

  pinMode(pin, mode) {
    const esp = this.esp32();
    if (!esp) return;
    if (!esp.state.pins[pin]) return;
    esp.state.pins[pin].mode = mode;
    if (mode !== 'OUTPUT') esp.state.pins[pin].pwmValue = null;
  }

  digitalWrite(pin, value) {
    const esp = this.esp32();
    if (!esp || !esp.state.pins[pin]) return;
    if (esp.state.pins[pin].mode !== 'OUTPUT') {
      this.log(`warn: digitalWrite(${pin}) called but pinMode is not OUTPUT`);
    }
    esp.state.pins[pin].value = value ? 1 : 0;
    esp.state.pins[pin].pwmValue = null;
    // Stepper sequences are often driven faster than the render tick, so
    // check for step transitions synchronously on every write (not just on tick)
    // to avoid missing/aliasing fast step patterns.
    if (this.parts.some((p) => p.type === 'uln2003')) {
      this.updateSteppers(this.resolveNow());
    }
  }

  digitalRead(pin) {
    const esp = this.esp32();
    if (!esp || !esp.state.pins[pin]) return 0;
    const r = this.resolveNow();
    const level = r.levelOf(esp.id, `IO${pin}`);
    if (level.kind === 'gnd') return 0;
    if (level.kind === 'vcc') return 1;
    if (level.kind === 'digital') return level.value === 'HIGH' ? 1 : 0;
    if (level.kind === 'pwm') return level.value > 127 ? 1 : 0;
    if (level.kind === 'analog') return level.value > 2048 ? 1 : 0;
    return esp.state.pins[pin].mode === 'INPUT_PULLUP' ? 1 : 0;
  }

  analogWrite(pin, value) {
    const esp = this.esp32();
    if (!esp || !esp.state.pins[pin]) return;
    esp.state.pins[pin].mode = 'OUTPUT';
    esp.state.pins[pin].pwmValue = Math.max(0, Math.min(255, value));
  }

  analogRead(pin) {
    const esp = this.esp32();
    if (!esp || !esp.state.pins[pin]) return 0;
    const r = this.resolveNow();
    const level = r.levelOf(esp.id, `IO${pin}`);
    if (level.kind === 'gnd') return 0;
    if (level.kind === 'vcc') return 4095;
    if (level.kind === 'digital') return level.value === 'HIGH' ? 4095 : 0;
    if (level.kind === 'pwm') return Math.round((level.value / 255) * 4095);
    if (level.kind === 'analog') return level.value;
    return 0;
  }

  // find the single component of `type` whose `compPin` is wired to esp32 gpio `pin`
  findPeripheralOnPin(pin, type, compPin) {
    const esp = this.esp32();
    if (!esp) return null;
    const r = this.resolveNow();
    const matches = r.findConnected(esp.id, `IO${pin}`, (e) => {
      const part = this.getPart(e.partId);
      return part && part.type === type && (compPin ? e.pin === compPin : true);
    });
    return matches.length ? this.getPart(matches[0].partId) : null;
  }

  findAnyPeripheralOnPin(pin, type) {
    return this.findPeripheralOnPin(pin, type, null);
  }
}
