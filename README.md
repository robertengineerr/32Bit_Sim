# 32Bit Sim — ESP32-C3 Circuit Simulator

A Wokwi-style circuit simulator that runs entirely in the browser (plain ES
modules + React, no build step, no Node.js/npm required). Drag components
onto a breadboard canvas, wire them up, write firmware in **real Arduino
C++** — exactly as you'd write it in Arduino IDE, `void setup()`/`void
loop()`, typed variables, real library APIs (`Servo`, `DHT`, `MFRC522`,
`IRremote`, `Adafruit_SSD1306`, …), no manual `async`/`await` anywhere — hit
**Run**, and watch the circuit react live — LEDs light, servos sweep,
displays draw text, buzzers beep, steppers turn, and sensors report
simulated values back to your code.

## Running it locally

There is no build step — `index.html` loads `src/main.js` directly as an ES
module, with React/ReactDOM vendored as static files under `vendor/`. Any
static file server works (ES modules require `http://`, not `file://`, due
to browser CORS rules):

```bash
python -m http.server 8765
```

Then open `http://localhost:8765/`. To host it anywhere else (GitHub Pages,
Netlify, S3, etc.), just copy the whole folder — there is no server-side
component and nothing to compile.

## How it works

- **Canvas** (`src/components/Canvas.js`) — an SVG workspace. Drag a part
  from the left toolbox to place it, drag its body to move it, click a pin
  and then click another pin to draw a wire. Click a wire or part to select
  it and delete with the × badge.
- **Netlist engine** (`src/engine/netlist.js`) — turns wires + parts into
  electrical "nets" each simulation tick, using a small fixed-point iteration
  so that switches/relays/transistors whose state depends on another net
  (e.g. a relay energized by a GPIO pin) resolve correctly.
- **C++ → JS transpiler** (`src/engine/cpp2js.js`) — a hand-written translator
  for the Arduino *sketch* subset of C++ (not a full compiler): strips types,
  turns `void setup()`/`void loop()` into the JS the runtime actually
  executes, converts classes/structs to real JS classes, and transparently
  makes blocking calls like `delay()` non-blocking so the tab never freezes.
  See **Important simplifications** below for exactly what it does and doesn't handle.
- **Firmware runtime** (`src/engine/runtime.js`) — runs the transpiled sketch
  with an Arduino-like global API (`pinMode`, `digitalWrite`, `analogRead`,
  `Servo`, `DHT`, `Wire`, `MFRC522`, `IRremote`'s `IRrecv`, `Adafruit_SSD1306`,
  `shiftOut`, `tone`, `pulseIn`, …).
- **Parts catalog** (`src/data/partsCatalog.js`) — one entry per component
  type: its pins, dimensions, and how it drives/reacts to its nets.

## Included parts

Boards & power: ESP32-C3 Dev Board, Power Supply Module, 9V Battery,
USB-A-to-C cable, 400 tie-point Breadboard (×2 available from the toolbox).

Displays: 0.96" OLED (SSD1306, I2C), 1-digit & 4-digit 7-segment displays.

Sensors: GY-6500 IMU, DHT11, HC-SR04 Ultrasonic, HC-SR501 PIR, RC522 RFID,
Photoresistor, Thermistor.

Input: Joystick, Membrane Switch (4×4), 10K Potentiometer, Push Button (place
as many as you need), Tilt Ball Switch.

Output/actuators: Active & Passive Buzzer, 5V Relay, LEDs (red/white/blue/
green/yellow), RGB LED, Servo SG90, 28BYJ-48 Stepper + ULN2003 driver, Fan
blade + DC motor, L293D motor driver.

Logic & IR: 74HC595 shift register, IR receiver + on-screen IR remote.

Passive: Resistors (10Ω–1MΩ), Diode Rectifier, NPN Transistor (PN2222).

Wires themselves are the wiring tool — click pin → pin to lay down a
dupont-style jumper; there's no separate "wire" part to place.

## Writing firmware

Write it exactly like a real Arduino sketch:

```cpp
const int LED_PIN = 2;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}
```

No `async`/`await` anywhere — `delay()` still yields to the browser instead
of freezing the tab, but that's handled transparently by the translation
layer, not something you write. Real library APIs work too:

```cpp
#include <Servo.h>
Servo myServo;

void setup() { myServo.attach(5); }
void loop() { myServo.write(90); delay(1000); }
```

Use the **"Load code example…"** dropdown in the toolbar for ready-made
snippets (blink, potentiometer, servo sweep, DHT11+OLED, ultrasonic+buzzer,
stepper, 74HC595, IR receive, RFID) — all written in this same real syntax.

### API surface

`pinMode`, `digitalWrite`, `digitalRead`, `analogWrite`/`ledcWrite`,
`analogRead`, `delay`, `delayMicroseconds`, `millis`, `micros`, `map`,
`constrain`, `random`, `bitRead`/`bitWrite`/`bitSet`/`bitClear`/`bit`, `PI`/
`TWO_PI`/`HALF_PI`/`DEG_TO_RAD`/`RAD_TO_DEG`, `Serial.begin/print/println/
printf`, `Wire.begin(sda, scl)`, `shiftOut`, `tone`/`noTone`, `pulseIn`,
Arduino's `String` class, and library classes `Servo`, `DHT` (+ `DHT11`/
`DHT21`/`DHT22` constants), `Wire`, `MFRC522` (the real RC522 library's own
method names — `PCD_Init`, `PICC_IsNewCardPresent`, `PICC_ReadCardSerial`,
`uid.uidByte`, `PICC_HaltA`), `IRrecv`/`decode_results` (real IRremote
`decode(&results)` pattern), `Adafruit_SSD1306` (+ plain `OLED` alias), `IMU`.
An older simplified `RFID` class (`isCardPresent()`/`readUID()`) is also
still available for backward compatibility with sketches written before
this simulator supported real C++.

## Important simplifications

This is a teaching-oriented simulator, not a SPICE-accurate one and not a
real Xtensa/RISC-V emulator running compiled C++ (that's what Wokwi's real
ESP32 support does, via a full CPU emulator + toolchain — out of scope for a
from-scratch browser app). Concretely:

- **Digital, not analog, circuit solving.** Passive parts (resistors,
  diodes, transistors) affect connectivity/gating but current/voltage
  aren't computed — a resistor doesn't limit LED brightness by its value,
  for example.
- **I2C/SPI devices (OLED, GY-6500, RC522) are matched by wiring, not by
  bit-banged protocol.** If you skip `Wire.begin(sda, scl)`, the simulator
  falls back to "the only instance of that part on the canvas," which is
  fine for typical single-sensor circuits.
- **The C++ → JS transpiler covers the Arduino *sketch* subset, not full
  C++.** It's a hand-written translator (`src/engine/cpp2js.js`), not a real
  compiler — templates, multiple inheritance, operator overloading, and
  namespaces aren't supported. Concretely:
  - Typed declarations, `void setup()`/`loop()`, `#include`/`#define`,
    arrays (including multi-dimensional), `for`/`while`/`if`/`switch`, and
    user-defined `class`/`struct` (with constructors, member-init-lists, and
    methods) all translate to real, working JS.
  - Every call is transparently `await`ed under the hood, which is what lets
    `delay()`/`pulseIn()` etc. block *your* code without freezing the tab —
    you never write `async`/`await` yourself.
  - **Primitive reference/pointer out-parameters don't mutate the caller** —
    passing a struct/object by pointer (e.g. IRremote's `decode(&results)`)
    works correctly since JS objects are already reference types, but a
    hypothetical `void increment(int &x)` won't reflect changes back to the
    caller's variable. Rare in real sketches; not detected or warned about.
  - `sizeof(arr)/sizeof(arr[0])` (the common array-length idiom) works;
    other `sizeof` usage is replaced with a placeholder and logged as a
    `warn:` line in the Serial Monitor.
  - Struct/class brace-init (`Point p = {1, 2};`) only works for plain
    structs with no explicit constructor (an implicit positional one is
    generated); mixing it with a hand-written constructor isn't supported.
  - Unrecognized `#include`d headers and other unsupported preprocessor
    directives are ignored, with a `warn:` line logged rather than failing.
- **`MFRC522`, `IRrecv`/`decode_results`, `DHT`, `IMU`, `Adafruit_SSD1306`
  match their real libraries' constructor/method names** for the common,
  basic usage patterns tutorials actually use, but are simplified
  implementations behind those names, not the actual library internals —
  e.g. `Adafruit_SSD1306` still renders as simplified text lines rather than
  real pixel graphics (`drawPixel`/`drawLine`/bitmaps aren't implemented),
  and there's no real I2C/SPI byte-level protocol underneath any of them.

## Project structure

```
src/
  engine/     netlist resolver, simulator tick loop, C++->JS transpiler, Arduino runtime, audio
  data/       parts catalog + example circuits/snippets (+ shared add-time/property variants)
  components/ Canvas, Toolbox, CodeEditor, ConsolePanel, per-part SVG bodies
  utils/      pin layout + rotation/flip math, save/load, part factory
```
