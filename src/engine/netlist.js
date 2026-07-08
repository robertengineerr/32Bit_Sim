// Netlist resolution: turns placed parts + wires into a set of electrically
// connected "nets", then assigns each net a logic level for this tick.
//
// This is a deliberately simplified digital/analog hybrid model (not SPICE).
// Passive parts don't attenuate signals; a resistor is just a connector for
// connectivity purposes. What IS modeled: constant power/ground sources,
// ESP32 GPIO output driving, switches that dynamically short two pins
// (buttons, relays, transistors, tilt/PIR/membrane), and analog sensor pins
// that inject a 0-4095 analog value onto their net.

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

  return {
    levelOf(partId, pin) {
      return netLevels.get(pinKey(partId, pin)) || { kind: 'floating', value: null };
    },
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
