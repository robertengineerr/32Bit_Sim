# 32Bit Sim — ESP32-C3 Circuit Simulator

A Wokwi-style circuit simulator that runs entirely in the browser (Vite + React,
no backend). Drag components onto a breadboard canvas, wire them up, write
firmware in a JavaScript flavor of the Arduino API, hit **Run**, and watch the
circuit react live — LEDs light, servos sweep, displays draw text, buzzers
beep, steppers turn, and sensors report simulated values back to your code.

## Running it locally

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:5173` URL. `npm run build` produces a
static `dist/` folder that can be hosted anywhere (GitHub Pages, Netlify,
S3, etc.) — there is no server-side component.

## How it works

- **Canvas** (`src/components/Canvas.jsx`) — an SVG workspace. Drag a part
  from the left toolbox to place it, drag its body to move it, click a pin
  and then click another pin to draw a wire. Click a wire or part to select
  it and delete with the × badge.
- **Netlist engine** (`src/engine/netlist.js`) — turns wires + parts into
  electrical "nets" each simulation tick, using a small fixed-point iteration
  so that switches/relays/transistors whose state depends on another net
  (e.g. a relay energized by a GPIO pin) resolve correctly.
- **Firmware runtime** (`src/engine/runtime.js`) — runs your `setup()` /
  `loop()` JavaScript with an Arduino-like global API (`pinMode`,
  `digitalWrite`, `analogRead`, `Servo`, `DHT`, `Wire`, `shiftOut`, `tone`,
  `pulseIn`, …). See **Important simplifications** below.
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

```js
const LED_PIN = 2;

function setup() {
  pinMode(LED_PIN, OUTPUT);
}

async function loop() {
  digitalWrite(LED_PIN, HIGH);
  await delay(500);
  digitalWrite(LED_PIN, LOW);
  await delay(500);
}
```

Any function that calls `delay`, `pulseIn`, etc. must be declared
`async function` and use `await` — that's what lets the simulator keep the
tab responsive instead of blocking like a real single-threaded MCU would.
`setup()` doesn't need `async` unless it also awaits something.

Use the **"Load code example…"** dropdown in the toolbar for ready-made
snippets (blink, potentiometer, servo sweep, DHT11+OLED, ultrasonic+buzzer,
stepper, 74HC595, IR receive, RFID).

### API surface

`pinMode`, `digitalWrite`, `digitalRead`, `analogWrite`/`ledcWrite`,
`analogRead`, `delay`, `delayMicroseconds`, `millis`, `micros`, `map`,
`constrain`, `random`, `Serial.begin/print/println/printf`,
`Wire.begin(sda, scl)`, `shiftOut`, `tone`/`noTone`, `pulseIn`, and classes
`Servo`, `DHT`, `OLED`, `IMU`, `IRrecv`, `RFID`.

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
- **`await` is required** anywhere you'd block in real Arduino code
  (`delay`, `pulseIn`, etc.), since the simulator runs your sketch as an
  async JS coroutine rather than compiled, preemptible machine code.
- **`RFID`, `IRrecv`, `DHT`, `IMU`, `OLED` are small simplified classes**
  inspired by their real Arduino library counterparts, not drop-in
  replacements for `MFRC522`, `IRremote`, `DHT sensor library`, etc.

## Project structure

```
src/
  engine/     netlist resolver, simulator tick loop, JS "Arduino" runtime, audio
  data/       parts catalog + example circuits/snippets
  components/ Canvas, Toolbox, CodeEditor, ConsolePanel, per-part SVG bodies
  utils/      pin layout math, save/load, part factory
```
