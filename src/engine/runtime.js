// Arduino C++ runtime. Sketches are written exactly as in Arduino IDE (typed
// declarations, `void setup()`/`void loop()`, no manual async/await) and
// translated by cpp2js.js into the JS dialect actually executed here: delay()
// etc. still yield to the browser instead of freezing the tab, but that's
// handled transparently by the translation, not by the user. Not a real C++
// compiler - see README "Important simplifications" for the supported subset.

import { translateArduinoCpp } from './cpp2js.js';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

export class RuntimeStopped extends Error {}

// Arduino's String class, shimmed as a dual-callable constructor so both
// `String s = "hi";` (transpiled to `new String("hi")`) and conversions like
// `String(sensorValue)` work. Concatenation via `+` falls back to plain JS
// strings through valueOf/toString (matches string *content* correctly; a
// chained `.length()` call after a `+` would need the wrapper type, which is
// a known limitation - see README).
function ArduinoString(v, arg2) {
  if (!(this instanceof ArduinoString)) return new ArduinoString(v, arg2);
  if (typeof v === 'number' && arg2 !== undefined) {
    // Real Arduino overloads: String(float, decimalPlaces) vs String(int, base).
    // A whole-number float (e.g. 0.0) is indistinguishable from a true int at
    // runtime, so only treat arg2 as a base for the unambiguous, common
    // non-decimal bases - everything else (including 2, a common decimal-
    // places value) defaults to the far-more-common decimal-places reading.
    const looksLikeBase = Number.isInteger(v) && (arg2 === 16 || arg2 === 8);
    this.v = looksLikeBase ? v.toString(arg2) : v.toFixed(arg2);
  } else {
    this.v = v === undefined ? '' : String(v);
  }
}
ArduinoString.prototype.length = function () { return this.v.length; };
ArduinoString.prototype.charAt = function (i) { return this.v.charAt(i); };
ArduinoString.prototype.substring = function (a, b) { return this.v.substring(a, b); };
ArduinoString.prototype.indexOf = function (s) { return this.v.indexOf(s instanceof ArduinoString ? s.v : s); };
ArduinoString.prototype.toInt = function () { return parseInt(this.v, 10) || 0; };
ArduinoString.prototype.toFloat = function () { return parseFloat(this.v) || 0; };
ArduinoString.prototype.equals = function (o) { return this.v === (o instanceof ArduinoString ? o.v : String(o)); };
ArduinoString.prototype.concat = function (o) { return new ArduinoString(this.v + (o instanceof ArduinoString ? o.v : String(o))); };
ArduinoString.prototype.toUpperCase = function () { return new ArduinoString(this.v.toUpperCase()); };
ArduinoString.prototype.toLowerCase = function () { return new ArduinoString(this.v.toLowerCase()); };
ArduinoString.prototype.valueOf = function () { return this.v; };
ArduinoString.prototype.toString = function () { return this.v; };

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

  // Simplified SSD1306-style OLED driver: draws text lines, not real pixel
  // graphics. Constructor/begin() accept and ignore the real Adafruit_SSD1306
  // library's extra constructor/begin args (width, height, &Wire, reset pin,
  // vcc-select, i2c addr) so real tutorial code drops in.
  class OLEDImpl {
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
    setTextColor() {}
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
  }

  function buildEnv() {
    const env = {
      HIGH: 1, LOW: 0,
      INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP',
      LED_BUILTIN: 8,
      MSBFIRST: 'MSBFIRST', LSBFIRST: 'LSBFIRST',
      DHT11: 11, DHT21: 21, DHT22: 22,
      PI: Math.PI, HALF_PI: Math.PI / 2, TWO_PI: Math.PI * 2,
      DEG_TO_RAD: Math.PI / 180, RAD_TO_DEG: 180 / Math.PI,
      SSD1306_SWITCHCAPVCC: 2, SSD1306_WHITE: 1, SSD1306_BLACK: 0,

      String: ArduinoString,
      bitRead: (value, bit) => (value >> bit) & 1,
      bitSet: (value, bit) => value | (1 << bit),
      bitClear: (value, bit) => value & ~(1 << bit),
      bitWrite: (value, bit, bitvalue) => (bitvalue ? (value | (1 << bit)) : (value & ~(1 << bit))),
      bit: (n) => 1 << n,

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
        // No true I2C byte-protocol simulation - stubs so real library code
        // that also calls these (alongside the ESP32-specific begin(sda,scl)
        // above) doesn't crash.
        beginTransmission: () => {},
        write: () => {},
        endTransmission: () => 0,
        requestFrom: () => 0,
        available: () => 0,
        read: () => -1,
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
          return 1;
        }
        write(angle) {
          if (this._part) this._part.state.angle = Math.max(0, Math.min(180, angle));
        }
        writeMicroseconds(us) {
          this.write(((us - 1000) / 1000) * 180);
        }
        read() {
          return this._part ? this._part.state.angle : 0;
        }
        detach() {
          this._part = null;
        }
        attached() {
          return !!this._part;
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
        // Supports both the real IRremote pattern - decode(&results), passed
        // through here as decode(results), mutating it and returning a bool -
        // and the older no-arg simplified form that returns an object|null.
        decode(results) {
          const part = sim.findAnyPeripheralOnPin(this.pin, 'irrecv');
          const bus = part ? sim.irBus : null;
          if (bus && !bus.consumed && performance.now() - bus.at < 500) {
            bus.consumed = true;
            if (results) {
              results.value = bus.code;
              results.name = bus.name;
              return true;
            }
            return { value: bus.code, name: bus.name };
          }
          return results ? false : null;
        }
      },

      decode_results: class decode_results {
        constructor() {
          this.value = 0;
          this.name = '';
        }
      },

      OLED: OLEDImpl,
      Adafruit_SSD1306: OLEDImpl,

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

      // Simplified custom RC522 API, kept for old saved sketches.
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

      // Matches the real, widely-tutorialized MFRC522 library's API shape.
      MFRC522: class MFRC522 {
        constructor(ssPin, rstPin) {
          this.ssPin = ssPin;
          this.rstPin = rstPin;
          this.uid = { uidByte: [], size: 0 };
        }
        PCD_Init() {}
        PICC_IsNewCardPresent() {
          this._part = sim.findPeripheralOnPin(this.ssPin, 'rc522', 'SDA');
          return !!(this._part && this._part.state.tapped);
        }
        PICC_ReadCardSerial() {
          const part = this._part;
          if (!part || !part.state.tapped) return false;
          part.state.tapped = false;
          const bytes = part.state.uid.split(' ').map((h) => parseInt(h, 16));
          this.uid.uidByte = bytes;
          this.uid.size = bytes.length;
          return true;
        }
        PICC_HaltA() {}
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

    let translated;
    try {
      translated = translateArduinoCpp(code);
    } catch (err) {
      sim.log(`ERROR: ${err.message}`);
      if (onError) onError(err);
      running = false;
      const esp = sim.esp32();
      if (esp) esp.state.running = false;
      if (onStop) onStop();
      return;
    }
    for (const warning of translated.warnings) sim.log(`warn: ${warning}`);

    const wrapped = `
      ${translated.js}
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
