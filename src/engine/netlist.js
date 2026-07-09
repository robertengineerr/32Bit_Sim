// Netlist resolution: turns placed parts + wires into a set of electrically
// connected "nets", then assigns each net a logic level for this tick.
//
// This is a deliberately simplified digital/analog hybrid model (not SPICE).
// Passive parts don't attenuate signals; a resistor is just a connector for
// connectivity purposes. What IS modeled: constant power/ground sources,
// ESP32 GPIO output driving, switches that dynamically short two pins
// (buttons, relays, transistors, tilt/PIR/membrane), and analog sensor pins
// that inject a 0-4095 analog value onto their net.

import { levelToVoltage } from './simHelpers.js';

function pinKey(partId, pin) {
  return `${partId}::${pin}`;
}

class UnionFind {
  constructor() {
    this.parent = new Map();
  }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    let cur = x;
    while (this.parent.get(cur) !== cur) {
      const next = this.parent.get(cur);
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

// Parse resistance from a resistor's value string (e.g. "220", "1k", "10k", "1M")
function parseResistance(valueStr) {
  if (!valueStr) return 1000;
  const s = String(valueStr).trim();
  if (s.endsWith('M') || s.endsWith('m')) return parseFloat(s) * 1e6;
  if (s.endsWith('k') || s.endsWith('K')) return parseFloat(s) * 1e3;
  return parseFloat(s) || 1000;
}

// Second-pass analog voltage solver using Gauss-Seidel relaxation.
// Builds its own union-find that EXCLUDES resistor getConnectors (so resistors
// are conductance edges, not shorts). Returns voltageOf() and analogNets.
function solveAnalogVoltages(parts, wires, catalog, netLevels, partById) {
  // Build a UF that only uses wires (not resistor shorts, not any part connectors)
  // so each resistor terminal is its own "analog net".
  const uf = new UnionFind();

  // Wire-based connections
  for (const w of wires) {
    uf.union(pinKey(w.a.partId, w.a.pin), pinKey(w.b.partId, w.b.pin));
  }

  // Non-resistor part connectors (breadboard rows, closed switches, etc.)
  // This ensures breadboard rows are the same analog net.
  for (const part of parts) {
    if (part.type === 'resistor') continue;
    const def = catalog[part.type];
    if (!def || !def.getConnectors) continue;
    const pairs = def.getConnectors(part, netLevels, partById) || [];
    for (const [pa, pb] of pairs) {
      uf.union(pinKey(part.id, pa), pinKey(part.id, pb));
    }
  }

  // Include all part pins in the UF so isolated pins get a root
  const allPinKeys = new Set();
  for (const w of wires) {
    allPinKeys.add(pinKey(w.a.partId, w.a.pin));
    allPinKeys.add(pinKey(w.b.partId, w.b.pin));
  }
  for (const part of parts) {
    const def = catalog[part.type];
    if (!def) continue;
    for (const pin of def.pins) allPinKeys.add(pinKey(part.id, pin.name));
  }

  // Enumerate nets
  const netRoots = new Set();
  for (const key of allPinKeys) netRoots.add(uf.find(key));

  // Assign net indices
  const netIndex = new Map(); // root -> index
  let ni = 0;
  for (const root of netRoots) netIndex.set(root, ni++);

  const N = netIndex.size;
  const V = new Float64Array(N); // voltage per net, initialized 0
  const fixed = new Uint8Array(N); // 1 if net has a fixed voltage source

  // Helper: net index for a pin key
  function netOf(key) {
    return netIndex.get(uf.find(key));
  }

  // Assign fixed voltages from drives + capacitor state
  for (const part of parts) {
    const def = catalog[part.type];
    if (!def) continue;

    for (const pin of def.pins) {
      const key = pinKey(part.id, pin.name);
      const ni2 = netOf(key);
      if (ni2 === undefined) continue;

      // Check if this part drives this pin (use existing netLevels from logical solver)
      const level = netLevels ? netLevels.get(key) : null;
      const v = levelToVoltage(level);
      if (v !== null) {
        V[ni2] = v;
        fixed[ni2] = 1;
      }

      // Capacitor: its + pin contributes vc as a fixed voltage on the + net
      if (part.type === 'capacitor' && pin.name === '+') {
        const vc = part.state ? part.state.vc : 0;
        if (!fixed[ni2]) {
          V[ni2] = vc || 0;
          // capacitor pin is NOT a hard voltage source — don't set fixed
          // (it participates in Gauss-Seidel relaxation weighted by its internal state)
        }
      }
    }
  }

  // Build resistor conductance edges
  // Each resistor contributes an edge between its two pin nets
  const edges = []; // { netA, netB, G } where G = 1/R
  for (const part of parts) {
    if (part.type !== 'resistor') continue;
    const def = catalog[part.type];
    if (!def) continue;
    const R = parseResistance(part.state && part.state.value);
    const G = 1 / Math.max(R, 1e-6);
    const keyA = pinKey(part.id, 'A');
    const keyB = pinKey(part.id, 'B');
    const nA = netOf(keyA);
    const nB = netOf(keyB);
    if (nA === undefined || nB === undefined || nA === nB) continue;
    edges.push({ netA: nA, netB: nB, G, partId: part.id });
  }

  // Ammeter: treated as 0.01Ω (G=100) in-series measurement
  for (const part of parts) {
    if (part.type !== 'ammeter') continue;
    const nA = netOf(pinKey(part.id, 'A'));
    const nB = netOf(pinKey(part.id, 'B'));
    if (nA === undefined || nB === undefined || nA === nB) continue;
    edges.push({ netA: nA, netB: nB, G: 100, partId: part.id, isAmmeter: true });
  }

  // Gauss-Seidel relaxation: 30 iterations
  for (let iter = 0; iter < 30; iter++) {
    for (let i = 0; i < N; i++) {
      if (fixed[i]) continue;
      let sumGV = 0;
      let sumG = 0;
      for (const e of edges) {
        if (e.netA === i) { sumGV += e.G * V[e.netB]; sumG += e.G; }
        else if (e.netB === i) { sumGV += e.G * V[e.netA]; sumG += e.G; }
      }
      if (sumG > 0) V[i] = sumGV / sumG;
    }
  }

  // Helper to look up net index for a (partId, pin) pair
  function netOfPinKey(partId, pin) {
    const key = pinKey(partId, pin);
    return netIndex.get(uf.find(key));
  }

  return {
    voltageOf(partId, pin) {
      const ni2 = netOfPinKey(partId, pin);
      if (ni2 === undefined) return null;
      return V[ni2];
    },
    analogNets: { netOf: netOfPinKey, edges, V },
  };
}

// Runs the fixed-point resolution described above. `getConnectors(part, prevLevels)`
// is provided by each part definition in the catalog and returns extra pin-pairs
// that should be treated as shorted together this iteration.
export function resolveCircuit(parts, wires, catalog) {
  const partById = new Map(parts.map((p) => [p.id, p]));
  let netLevels = null; // pinKey -> level info, from previous iteration
  let nets = null;
  let netOfPin = null;

  const ITERATIONS = 4;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const uf = new UnionFind();

    // static wires drawn by the user
    for (const w of wires) {
      uf.union(pinKey(w.a.partId, w.a.pin), pinKey(w.b.partId, w.b.pin));
    }

    // dynamic connectors contributed by parts (switches, relays, transistors...)
    for (const part of parts) {
      const def = catalog[part.type];
      if (!def || !def.getConnectors) continue;
      const pairs = def.getConnectors(part, netLevels, partById) || [];
      for (const [pa, pb] of pairs) {
        uf.union(pinKey(part.id, pa), pinKey(part.id, pb));
      }
    }

    // group pins into nets
    const groups = new Map();
    const allPinKeys = new Set();
    for (const w of wires) {
      allPinKeys.add(pinKey(w.a.partId, w.a.pin));
      allPinKeys.add(pinKey(w.b.partId, w.b.pin));
    }
    for (const part of parts) {
      const def = catalog[part.type];
      if (!def) continue;
      for (const pin of def.pins) allPinKeys.add(pinKey(part.id, pin.name));
    }
    for (const key of allPinKeys) {
      const root = uf.find(key);
      if (!groups.has(root)) groups.set(root, new Set());
      groups.get(root).add(key);
    }

    nets = [...groups.values()];
    netOfPin = new Map();
    for (const net of nets) {
      for (const key of net) netOfPin.set(key, net);
    }

    // compute level for each net: GND beats VCC beats digital HIGH beats PWM beats analog beats floating
    const levels = new Map(); // net (Set) -> level object, indexed by representative key too
    for (const net of nets) {
      let level = { kind: 'floating', value: null };
      let hasGnd = false;
      let hasVcc = false;
      let digital = null; // 'HIGH' | 'LOW'
      let pwm = null; // 0..255
      let analog = null; // 0..4095

      for (const key of net) {
        const [partId, pinName] = key.split('::');
        const part = partById.get(partId);
        if (!part) continue;
        const def = catalog[part.type];
        if (!def || !def.getPinDrive) continue;
        const drive = def.getPinDrive(part, pinName, netLevels);
        if (!drive) continue;
        if (drive.kind === 'gnd') hasGnd = true;
        else if (drive.kind === 'vcc') hasVcc = true;
        else if (drive.kind === 'digital') digital = drive.value;
        else if (drive.kind === 'pwm') pwm = drive.value;
        else if (drive.kind === 'analog') analog = drive.value;
      }

      if (hasGnd) level = { kind: 'gnd', value: 0 };
      else if (hasVcc) level = { kind: 'vcc', value: 4095 };
      else if (digital === 'HIGH') level = { kind: 'digital', value: 'HIGH' };
      else if (digital === 'LOW') level = { kind: 'digital', value: 'LOW' };
      else if (pwm !== null) level = { kind: 'pwm', value: pwm };
      else if (analog !== null) level = { kind: 'analog', value: analog };

      for (const key of net) levels.set(key, level);
    }
    netLevels = levels;
  }

  // Run the analog voltage solver as a second pass
  const analogResult = solveAnalogVoltages(parts, wires, catalog, netLevels, partById);

  return {
    levelOf(partId, pin) {
      return netLevels.get(pinKey(partId, pin)) || { kind: 'floating', value: null };
    },
    voltageOf(partId, pin) {
      return analogResult.voltageOf(partId, pin);
    },
    analogNets: analogResult.analogNets,
    connected(partIdA, pinA, partIdB, pinB) {
      const netA = netOfPin.get(pinKey(partIdA, pinA));
      if (!netA) return false;
      return netA.has(pinKey(partIdB, pinB));
    },
    // returns [{partId, pin}] of every pin electrically joined to (partId, pin), matching an optional predicate
    findConnected(partId, pin, predicate) {
      const net = netOfPin.get(pinKey(partId, pin));
      if (!net) return [];
      const out = [];
      for (const key of net) {
        const [pid, pn] = key.split('::');
        if (pid === partId && pn === pin) continue;
        const entry = { partId: pid, pin: pn };
        if (!predicate || predicate(entry)) out.push(entry);
      }
      return out;
    },
    netLevels,
  };
}

export { pinKey };
