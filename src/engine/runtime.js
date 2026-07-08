// Arduino-style JS runtime. Users write setup()/loop() using familiar Arduino
// function names; delay() is `await`-based so it yields to the browser
// instead of freezing the tab. This is a simulation convenience, not a real
// C++ compiler - see the in-app "About this simulator" notes.

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export class RuntimeStopped extends Error {}

export function createRuntime(sim) {
  let running = false;
  let startTime = 0;
  let stopRequested = false;

  function checkStop() {
    if (stopRequested) throw new RuntimeStopped('stopped');
  }

  function findI2CPart(type, sdaPinName) {
    const esp = sim.esp32();
    if (!esp) return null;
    const cfg = esp.state.wireConfig;
    if (cfg) {
      const r = sim.resolveNow();
      const part = sim.parts.find(
        (p) => p.type === type && r.connected(esp.id, `IO${cfg.sda}`, p.id, sdaPinName) && r.connected(esp.id, `IO${cfg.scl}`, p.id, 'SCL')
      );
      if (part) return part;
    }
    // fall back to the only instance of this part on the canvas (common for simple beginner circuits)
    const candidates = sim.parts.filter((p) => p.type === type);
    return candidates.length ? candidates[0] : null;
  }

  function buildEnv() {
    const env = {
      HIGH: 1, LOW: 0,
      INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP',
      LED_BUILTIN: 8,
      MSBFIRST: 'MSBFIRST', LSBFIRST: 'LSBFIRST',

      pinMode: (pin, mode) => sim.pinMode(pin, mode),
      digitalWrite: (pin, value) => sim.digitalWrite(pin, value ? 1 : 0),
      digitalRead: (pin) => sim.digitalRead(pin),
      analogWrite: (pin, value) => sim.analogWrite(pin, value),
      ledcWrite: (pin, value) => sim.analogWrite(pin, value),
      analogRead: (pin) => sim.analogRead(pin),

      delay: async (ms) => {
        checkStop();
        await sleep(ms);
        checkStop();
      },
      delayMicroseconds: async (us) => {
        checkStop();
        await sleep(us / 1000);
        checkStop();
      },
      millis: () => performance.now() - startTime,
      micros: () => (performance.now() - startTime) * 1000,

      map: (x, inMin, inMax, outMin, outMax) => ((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin,
      constrain: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
      random: (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
      abs: Math.abs, min: Math.min, max: Math.max, round: Math.round, floor: Math.floor, ceil: Math.ceil,

      Serial: {
        begin: (baud) => sim.log(`Serial.begin(${baud})`),
        print: (v) => sim.log(String(v)),
        println: (v) => sim.log(v === undefined ? '' : String(v)),
        printf: (fmt, ...args) => sim.log(String(fmt).replace(/%[sd]/g, () => String(args.shift()))),
      },

      Wire: {
        begin: (sda, scl) => {
          const esp = sim.esp32();
          if (esp) esp.state.wireConfig = { sda, scl };
        },
      },

      pulseIn: async (pin, level, timeoutUs = 1000000) => {
        checkStop();
        const part = sim.findPeripheralOnPin(pin, 'ultrasonic', 'ECHO');
        if (!part) {
          await sleep(5);
          return 0;
        }
        const durationUs = Math.round(part.state.distanceCm * 58);
        await sleep(Math.min(30, durationUs / 1000));
        checkStop();
        return durationUs;
      },

      tone: (pin, freq, duration) => {
        const part = sim.findAnyPeripheralOnPin(pin, 'buzzerpassive') || sim.findAnyPeripheralOnPin(pin, 'buzzeractive');
        if (!part || !sim.audio) return;
        if (duration) sim.audio.playTimedTone(part.id, freq, duration);
        else sim.audio.startTone(part.id, freq);
      },
      noTone: (pin) => {
        const part = sim.findAnyPeripheralOnPin(pin, 'buzzerpassive') || sim.findAnyPeripheralOnPin(pin, 'buzzeractive');
        if (part && sim.audio) sim.audio.stopTone(part.id);
      },

      shiftOut: (dataPin, clockPin, bitOrder, value) => {
        const esp = sim.esp32();
        if (!esp) return;
        const r = sim.resolveNow();
        const part = sim.parts.find((p) => {
          if (p.type !== 'hc595') return false;
          return r.connected(esp.id, `IO${dataPin}`, p.id, 'DS') && r.connected(esp.id, `IO${clockPin}`, p.id, 'SH_CP');
        });
        if (!part) return;
        const bits = [];
        for (let i = 0; i < 8; i++) bits.push((value >> i) & 1);
        part.state.bits = bitOrder === 'LSBFIRST' ? bits : bits.reverse();
      },

      Servo: class Servo {
        attach(pin) {
          this._part = sim.findAnyPeripheralOnPin(pin, 'servo');
        }
        write(angle) {
          if (this._part) this._part.state.angle = Math.max(0, Math.min(180, angle));
        }
        read() {
          return this._part ? this._part.state.angle : 0;
        }
      },

      DHT: class DHT {
        constructor(pin) {
          this.pin = pin;
        }
        begin() {}
        readTemperature() {
          const part = sim.findPeripheralOnPin(this.pin, 'dht11', 'DATA');
          return part ? part.state.temperature : NaN;
        }
        readHumidity() {
          const part = sim.findPeripheralOnPin(this.pin, 'dht11', 'DATA');
          return part ? part.state.humidity : NaN;
        }
      },

      IRrecv: class IRrecv {
        constructor(pin) {
          this.pin = pin;
        }
        enableIRIn() {}
        resume() {}
        decode() {
          const part = sim.findAnyPeripheralOnPin(this.pin, 'irrecv');
          if (!part) return null;
          const bus = sim.irBus;
          if (bus && !bus.consumed && performance.now() - bus.at < 500) {
            bus.consumed = true;
            return { value: bus.code, name: bus.name };
          }
          return null;
        }
      },

      // Simplified SSD1306-style OLED driver: draws text lines, not real pixel graphics
      OLED: class OLED {
        constructor() {
          this._lines = ['', '', '', '', ''];
          this._cursorLine = 0;
        }
        begin() {
          this._part = findI2CPart('oled', 'SDA');
          return true;
        }
        clearDisplay() {
          this._lines = ['', '', '', '', ''];
          this._cursorLine = 0;
        }
        setTextSize() {}
        setCursor(x, y) {
          this._cursorLine = Math.max(0, Math.min(4, Math.floor(y / 13)));
        }
        print(t) {
          this._lines[this._cursorLine] = (this._lines[this._cursorLine] || '') + String(t);
        }
        println(t) {
          this.print(t === undefined ? '' : t);
          this._cursorLine = Math.min(4, this._cursorLine + 1);
        }
        display() {
          if (this._part) this._part.state.framebuffer = { text: this._lines.slice() };
        }
      },

      // Simplified GY-6500 (MPU6500-like) IMU: simulated values, not real physics
      IMU: class IMU {
        begin() {
          this._part = findI2CPart('gy6500', 'SDA');
          return true;
        }
        readAccelX() { return +((Math.random() - 0.5) * 0.2).toFixed(3); }
        readAccelY() { return +((Math.random() - 0.5) * 0.2).toFixed(3); }
        readAccelZ() { return +(1 + (Math.random() - 0.5) * 0.05).toFixed(3); }
        readGyroX() { return +((Math.random() - 0.5) * 2).toFixed(3); }
        readGyroY() { return +((Math.random() - 0.5) * 2).toFixed(3); }
        readGyroZ() { return +((Math.random() - 0.5) * 2).toFixed(3); }
      },

      // Simplified RC522 API (not a drop-in for the real MFRC522 library)
      RFID: class RFID {
        constructor(ssPin) {
          this.ssPin = ssPin;
        }
        begin() {}
        isCardPresent() {
          const part = sim.findPeripheralOnPin(this.ssPin, 'rc522', 'SDA');
          return !!(part && part.state.tapped);
        }
        readUID() {
          const part = sim.findPeripheralOnPin(this.ssPin, 'rc522', 'SDA');
          if (part && part.state.tapped) {
            part.state.tapped = false;
            return part.state.uid;
          }
          return null;
        }
      },
    };
    return env;
  }

  async function run(code, { onError, onStop } = {}) {
    if (running) return;
    running = true;
    stopRequested = false;
    startTime = performance.now();
    sim.esp32()?.state && (sim.esp32().state.running = true);
    const env = buildEnv();
    env.__running = () => !stopRequested;

    const wrapped = `
      ${code}
      if (typeof setup === 'function') { await setup(); }
      while ($env.__running()) {
        if (typeof loop === 'function') { await loop(); } else { break; }
        await new Promise((r) => setTimeout(r, 0));
      }
    `;

    try {
      const fn = new AsyncFunction('$env', `with ($env) { ${wrapped} }`);
      await fn(env);
    } catch (err) {
      if (!(err instanceof RuntimeStopped)) {
        sim.log(`ERROR: ${err.message}`);
        if (onError) onError(err);
      }
    } finally {
      running = false;
      const esp = sim.esp32();
      if (esp) esp.state.running = false;
      if (onStop) onStop();
    }
  }

  function stop() {
    stopRequested = true;
  }

  return {
    run,
    stop,
    isRunning: () => running,
  };
}
