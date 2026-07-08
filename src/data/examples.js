import { createPart } from '../utils/circuitFactory.js';

export function buildDefaultCircuit() {
  const esp = createPart('esp32c3', 420, 60);
  const led = createPart('led', 260, 420, { stateArg: 'red' });
  const resistor = createPart('resistor', 260, 500, { stateArg: '220' });
  const button = createPart('button', 120, 420);

  const parts = [esp, led, resistor, button];
  const wires = [
    { id: 'w1', a: { partId: esp.id, pin: 'IO2' }, b: { partId: resistor.id, pin: 'A' }, color: '#3b82f6' },
    { id: 'w2', a: { partId: resistor.id, pin: 'B' }, b: { partId: led.id, pin: 'A' }, color: '#f59e0b' },
    { id: 'w3', a: { partId: led.id, pin: 'K' }, b: { partId: esp.id, pin: 'GND1' }, color: '#374151' },
    { id: 'w4', a: { partId: button.id, pin: 'A1' }, b: { partId: esp.id, pin: 'IO3' }, color: '#22c55e' },
    { id: 'w5', a: { partId: button.id, pin: 'A2' }, b: { partId: esp.id, pin: 'GND2' }, color: '#374151' },
  ];

  const code = `// Button-controlled LED
// IO2 -> 220 ohm resistor -> LED -> GND
// Button between IO3 and GND (internal pull-up enabled)

const LED_PIN = 2;
const BUTTON_PIN = 3;

function setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Serial.println("Ready. Press the button to light the LED.");
}

async function loop() {
  const pressed = digitalRead(BUTTON_PIN) === LOW;
  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
  await delay(20);
}
`;

  return { parts, wires, code };
}

export const CODE_SNIPPETS = {
  'Blink (built-in style)': `const LED_PIN = 2;

function setup() {
  pinMode(LED_PIN, OUTPUT);
}

async function loop() {
  digitalWrite(LED_PIN, HIGH);
  await delay(500);
  digitalWrite(LED_PIN, LOW);
  await delay(500);
}
`,
  'Potentiometer -> Serial': `const POT_PIN = 0; // analog-capable GPIO

function setup() {
  Serial.begin(115200);
}

async function loop() {
  const v = analogRead(POT_PIN);
  Serial.println("pot = " + v);
  await delay(200);
}
`,
  'Servo sweep': `let myServo = new Servo();

function setup() {
  myServo.attach(5); // SIG pin wired to IO5
}

async function loop() {
  for (let a = 0; a <= 180; a += 5) {
    myServo.write(a);
    await delay(20);
  }
  for (let a = 180; a >= 0; a -= 5) {
    myServo.write(a);
    await delay(20);
  }
}
`,
  'DHT11 + OLED': `let dht = new DHT(4); // DATA wired to IO4
let oled = new OLED();

function setup() {
  dht.begin();
  oled.begin();
}

async function loop() {
  const t = dht.readTemperature();
  const h = dht.readHumidity();
  oled.clearDisplay();
  oled.setCursor(0, 0);
  oled.println("Temp: " + t.toFixed(1) + " C");
  oled.setCursor(0, 13);
  oled.println("Humidity: " + h.toFixed(0) + " %");
  oled.display();
  await delay(500);
}
`,
  'Ultrasonic + Buzzer': `const TRIG = 6, ECHO = 7, BUZZ = 10;

function setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BUZZ, OUTPUT);
  Serial.begin(115200);
}

async function loop() {
  digitalWrite(TRIG, LOW);
  await delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  await delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  const duration = await pulseIn(ECHO, HIGH);
  const distanceCm = duration / 58;
  Serial.println("distance = " + distanceCm.toFixed(1) + " cm");
  digitalWrite(BUZZ, distanceCm < 10 ? HIGH : LOW);
  await delay(150);
}
`,
  'Stepper via ULN2003': `// IN1-IN4 wired to any 4 GPIOs, in that order, driving ULN2003 IN1-IN4
const pins = [4, 5, 6, 7];
const seq = [
  [1,0,0,0],[1,1,0,0],[0,1,0,0],[0,1,1,0],
  [0,0,1,0],[0,0,1,1],[0,0,0,1],[1,0,0,1],
];

function setup() {
  for (const p of pins) pinMode(p, OUTPUT);
}

async function loop() {
  for (const step of seq) {
    for (let i = 0; i < 4; i++) digitalWrite(pins[i], step[i]);
    await delay(3);
  }
}
`,
  '74HC595 -> LEDs': `const DATA = 4, CLOCK = 5, LATCH = 6;

function setup() {
  pinMode(DATA, OUTPUT);
  pinMode(CLOCK, OUTPUT);
  pinMode(LATCH, OUTPUT);
}

async function loop() {
  for (let i = 0; i < 8; i++) {
    digitalWrite(LATCH, LOW);
    shiftOut(DATA, CLOCK, MSBFIRST, 1 << i);
    digitalWrite(LATCH, HIGH);
    await delay(120);
  }
}
`,
  'IR Remote receiver': `let irrecv = new IRrecv(9); // OUT pin wired to IO9

function setup() {
  Serial.begin(115200);
  irrecv.enableIRIn();
}

function loop() {
  const results = irrecv.decode();
  if (results) {
    Serial.println("IR received: " + results.name);
  }
}
`,
  'RC522 RFID tap': `let rfid = new RFID(8); // SDA wired to IO8

function setup() {
  Serial.begin(115200);
  rfid.begin();
}

function loop() {
  const uid = rfid.readUID();
  if (uid) Serial.println("Card UID: " + uid);
}
`,
};
