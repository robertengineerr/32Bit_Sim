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

const int LED_PIN = 2;
const int BUTTON_PIN = 3;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Serial.println("Ready. Press the button to light the LED.");
}

void loop() {
  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
  delay(20);
}
`;

  return { parts, wires, code };
}

// ── circuit builders ──────────────────────────────────────────────────────────

function buildBlink() {
  const esp = createPart('esp32c3', 420, 60);
  const res = createPart('resistor', 260, 400, { stateArg: '220' });
  const led = createPart('led', 270, 460, { stateArg: 'red' });
  return {
    parts: [esp, res, led],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: 'IO2' }, b: { partId: res.id, pin: 'A' }, color: '#3b82f6' },
      { id: 'w2', a: { partId: res.id, pin: 'B' }, b: { partId: led.id, pin: 'A' }, color: '#f59e0b' },
      { id: 'w3', a: { partId: led.id, pin: 'K' }, b: { partId: esp.id, pin: 'GND1' }, color: '#374151' },
    ],
  };
}

function buildPWMFade() {
  const esp = createPart('esp32c3', 420, 60);
  const res = createPart('resistor', 260, 400, { stateArg: '220' });
  const led = createPart('led', 270, 460, { stateArg: 'green' });
  return {
    parts: [esp, res, led],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: 'IO5' }, b: { partId: res.id, pin: 'A' }, color: '#22c55e' },
      { id: 'w2', a: { partId: res.id, pin: 'B' }, b: { partId: led.id, pin: 'A' }, color: '#f59e0b' },
      { id: 'w3', a: { partId: led.id, pin: 'K' }, b: { partId: esp.id, pin: 'GND1' }, color: '#374151' },
    ],
  };
}

function buildTrafficLight() {
  const esp = createPart('esp32c3', 420, 60);
  const redR  = createPart('resistor', 80,  400, { stateArg: '220' });
  const redL  = createPart('led',      86,  466, { stateArg: 'red' });
  const yelR  = createPart('resistor', 200, 400, { stateArg: '220' });
  const yelL  = createPart('led',      206, 466, { stateArg: 'yellow' });
  const grnR  = createPart('resistor', 320, 400, { stateArg: '220' });
  const grnL  = createPart('led',      326, 466, { stateArg: 'green' });
  return {
    parts: [esp, redR, redL, yelR, yelL, grnR, grnL],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: 'IO4' }, b: { partId: redR.id, pin: 'A' },  color: '#ef4444' },
      { id: 'w2', a: { partId: redR.id, pin: 'B' },  b: { partId: redL.id, pin: 'A' },  color: '#ef4444' },
      { id: 'w3', a: { partId: redL.id, pin: 'K' },  b: { partId: esp.id, pin: 'GND1' }, color: '#374151' },
      { id: 'w4', a: { partId: esp.id, pin: 'IO5' }, b: { partId: yelR.id, pin: 'A' },  color: '#fbbf24' },
      { id: 'w5', a: { partId: yelR.id, pin: 'B' },  b: { partId: yelL.id, pin: 'A' },  color: '#fbbf24' },
      { id: 'w6', a: { partId: yelL.id, pin: 'K' },  b: { partId: esp.id, pin: 'GND1' }, color: '#374151' },
      { id: 'w7', a: { partId: esp.id, pin: 'IO6' }, b: { partId: grnR.id, pin: 'A' },  color: '#22c55e' },
      { id: 'w8', a: { partId: grnR.id, pin: 'B' },  b: { partId: grnL.id, pin: 'A' },  color: '#22c55e' },
      { id: 'w9', a: { partId: grnL.id, pin: 'K' },  b: { partId: esp.id, pin: 'GND1' }, color: '#374151' },
    ],
  };
}

function buildPotSerial() {
  const esp = createPart('esp32c3', 420, 60);
  const pot = createPart('potentiometer', 200, 360);
  return {
    parts: [esp, pot],
    wires: [
      { id: 'w1', a: { partId: pot.id, pin: 'WIPER' }, b: { partId: esp.id, pin: 'IO0' }, color: '#3b82f6' },
      { id: 'w2', a: { partId: pot.id, pin: 'VCC' },   b: { partId: esp.id, pin: '3V3' }, color: '#ef4444' },
      { id: 'w3', a: { partId: pot.id, pin: 'GND' },   b: { partId: esp.id, pin: 'GND1' }, color: '#374151' },
    ],
  };
}

function buildServoSweep() {
  const esp = createPart('esp32c3', 420, 60);
  const servo = createPart('servo', 200, 380);
  return {
    parts: [esp, servo],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: 'IO5' },  b: { partId: servo.id, pin: 'SIG' }, color: '#f59e0b' },
      { id: 'w2', a: { partId: esp.id, pin: '3V3' },  b: { partId: servo.id, pin: 'VCC' }, color: '#ef4444' },
      { id: 'w3', a: { partId: esp.id, pin: 'GND1' }, b: { partId: servo.id, pin: 'GND' }, color: '#374151' },
    ],
  };
}

function buildDht11Oled() {
  const esp  = createPart('esp32c3', 420, 60);
  const dht  = createPart('dht11', 160, 360);
  const oled = createPart('oled', 155, 500);
  return {
    parts: [esp, dht, oled],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: '3V3' },  b: { partId: dht.id,  pin: 'VCC' },  color: '#ef4444' },
      { id: 'w2', a: { partId: esp.id, pin: 'IO4' },  b: { partId: dht.id,  pin: 'DATA' }, color: '#3b82f6' },
      { id: 'w3', a: { partId: esp.id, pin: 'GND1' }, b: { partId: dht.id,  pin: 'GND' },  color: '#374151' },
      { id: 'w4', a: { partId: esp.id, pin: 'IO8' },  b: { partId: oled.id, pin: 'SDA' },  color: '#a855f7' },
      { id: 'w5', a: { partId: esp.id, pin: 'IO9' },  b: { partId: oled.id, pin: 'SCL' },  color: '#06b6d4' },
      { id: 'w6', a: { partId: esp.id, pin: '3V3' },  b: { partId: oled.id, pin: 'VCC' },  color: '#ef4444' },
      { id: 'w7', a: { partId: esp.id, pin: 'GND1' }, b: { partId: oled.id, pin: 'GND' },  color: '#374151' },
    ],
  };
}

function buildUltrasonicBuzzer() {
  const esp    = createPart('esp32c3', 420, 60);
  const ultra  = createPart('ultrasonic', 170, 390);
  const buzzer = createPart('buzzeractive', 660, 330);
  return {
    parts: [esp, ultra, buzzer],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: '3V3' },  b: { partId: ultra.id,  pin: 'VCC' },  color: '#ef4444' },
      { id: 'w2', a: { partId: esp.id, pin: 'GND1' }, b: { partId: ultra.id,  pin: 'GND' },  color: '#374151' },
      { id: 'w3', a: { partId: esp.id, pin: 'IO6' },  b: { partId: ultra.id,  pin: 'TRIG' }, color: '#3b82f6' },
      { id: 'w4', a: { partId: esp.id, pin: 'IO7' },  b: { partId: ultra.id,  pin: 'ECHO' }, color: '#22c55e' },
      { id: 'w5', a: { partId: esp.id, pin: 'IO10' }, b: { partId: buzzer.id, pin: '+' },    color: '#f59e0b' },
      { id: 'w6', a: { partId: esp.id, pin: 'GND2' }, b: { partId: buzzer.id, pin: '-' },    color: '#374151' },
    ],
  };
}

function buildStepper() {
  const esp     = createPart('esp32c3', 420, 60);
  const uln     = createPart('uln2003', 130, 360);
  const stepper = createPart('stepper', 370, 370);
  return {
    parts: [esp, uln, stepper],
    wires: [
      { id: 'w1',  a: { partId: esp.id, pin: 'IO4' },  b: { partId: uln.id, pin: 'IN1' },  color: '#ef4444' },
      { id: 'w2',  a: { partId: esp.id, pin: 'IO5' },  b: { partId: uln.id, pin: 'IN2' },  color: '#3b82f6' },
      { id: 'w3',  a: { partId: esp.id, pin: 'IO6' },  b: { partId: uln.id, pin: 'IN3' },  color: '#22c55e' },
      { id: 'w4',  a: { partId: esp.id, pin: 'IO7' },  b: { partId: uln.id, pin: 'IN4' },  color: '#f59e0b' },
      { id: 'w5',  a: { partId: esp.id, pin: 'GND1' }, b: { partId: uln.id, pin: 'GND' },  color: '#374151' },
      { id: 'w6',  a: { partId: esp.id, pin: '3V3' },  b: { partId: uln.id, pin: 'V+' },   color: '#ef4444' },
      { id: 'w7',  a: { partId: uln.id, pin: 'OUT1' }, b: { partId: stepper.id, pin: 'A' }, color: '#a855f7' },
      { id: 'w8',  a: { partId: uln.id, pin: 'OUT2' }, b: { partId: stepper.id, pin: 'B' }, color: '#06b6d4' },
      { id: 'w9',  a: { partId: uln.id, pin: 'OUT3' }, b: { partId: stepper.id, pin: 'C' }, color: '#ec4899' },
      { id: 'w10', a: { partId: uln.id, pin: 'OUT4' }, b: { partId: stepper.id, pin: 'D' }, color: '#84cc16' },
    ],
  };
}

function buildHC595() {
  const esp = createPart('esp32c3', 420, 60);
  const hc  = createPart('hc595', 140, 380);
  return {
    parts: [esp, hc],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: 'IO4' },  b: { partId: hc.id, pin: 'DS' },    color: '#3b82f6' },
      { id: 'w2', a: { partId: esp.id, pin: 'IO5' },  b: { partId: hc.id, pin: 'SH_CP' }, color: '#22c55e' },
      { id: 'w3', a: { partId: esp.id, pin: 'IO6' },  b: { partId: hc.id, pin: 'ST_CP' }, color: '#f59e0b' },
      { id: 'w4', a: { partId: esp.id, pin: '3V3' },  b: { partId: hc.id, pin: 'VCC' },   color: '#ef4444' },
      { id: 'w5', a: { partId: esp.id, pin: 'GND1' }, b: { partId: hc.id, pin: 'GND' },   color: '#374151' },
    ],
  };
}

function buildIRReceiver() {
  const esp    = createPart('esp32c3', 420, 60);
  const recv   = createPart('irrecv', 190, 390);
  const remote = createPart('irremote', 700, 180);
  return {
    parts: [esp, recv, remote],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: 'IO9' },  b: { partId: recv.id, pin: 'OUT' }, color: '#f59e0b' },
      { id: 'w2', a: { partId: esp.id, pin: '3V3' },  b: { partId: recv.id, pin: 'VCC' }, color: '#ef4444' },
      { id: 'w3', a: { partId: esp.id, pin: 'GND1' }, b: { partId: recv.id, pin: 'GND' }, color: '#374151' },
    ],
  };
}

function buildRFID() {
  const esp  = createPart('esp32c3', 420, 60);
  const rfid = createPart('rc522', 175, 360);
  return {
    parts: [esp, rfid],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: '3V3' },  b: { partId: rfid.id, pin: '3.3V' }, color: '#ef4444' },
      { id: 'w2', a: { partId: esp.id, pin: 'GND1' }, b: { partId: rfid.id, pin: 'GND' },  color: '#374151' },
      { id: 'w3', a: { partId: esp.id, pin: 'IO8' },  b: { partId: rfid.id, pin: 'SDA' },  color: '#3b82f6' },
      { id: 'w4', a: { partId: esp.id, pin: 'IO9' },  b: { partId: rfid.id, pin: 'RST' },  color: '#22c55e' },
    ],
  };
}

function buildDebounce() {
  const esp = createPart('esp32c3', 420, 60);
  const btn = createPart('button', 690, 250);
  return {
    parts: [esp, btn],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: 'IO3' }, b: { partId: btn.id, pin: 'A1' },  color: '#22c55e' },
      { id: 'w2', a: { partId: btn.id, pin: 'A2' },  b: { partId: esp.id, pin: 'GND2' }, color: '#374151' },
    ],
  };
}

function buildI2CScanner() {
  const esp  = createPart('esp32c3', 420, 60);
  const oled = createPart('oled', 160, 370);
  return {
    parts: [esp, oled],
    wires: [
      { id: 'w1', a: { partId: esp.id, pin: 'IO8' },  b: { partId: oled.id, pin: 'SDA' }, color: '#a855f7' },
      { id: 'w2', a: { partId: esp.id, pin: 'IO9' },  b: { partId: oled.id, pin: 'SCL' }, color: '#06b6d4' },
      { id: 'w3', a: { partId: esp.id, pin: '3V3' },  b: { partId: oled.id, pin: 'VCC' }, color: '#ef4444' },
      { id: 'w4', a: { partId: esp.id, pin: 'GND1' }, b: { partId: oled.id, pin: 'GND' }, color: '#374151' },
    ],
  };
}

// ── exported examples list ────────────────────────────────────────────────────

export const EXAMPLES = [
  {
    name: 'Blink (built-in style)',
    build: buildBlink,
    code: `const int LED_PIN = 2;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}
`,
  },
  {
    name: 'PWM LED Fade',
    build: buildPWMFade,
    code: `// Smooth LED brightness fade using analogWrite (PWM)
// LED anode -> 220 ohm resistor -> IO5 (PWM-capable)
const int LED_PIN = 5;

void setup() {
  Serial.begin(115200);
}

void loop() {
  for (int brightness = 0; brightness <= 255; brightness++) {
    analogWrite(LED_PIN, brightness);
    delay(8);
  }
  for (int brightness = 255; brightness >= 0; brightness--) {
    analogWrite(LED_PIN, brightness);
    delay(8);
  }
  Serial.println("fade cycle done");
}
`,
  },
  {
    name: 'Traffic Light FSM',
    build: buildTrafficLight,
    code: `// 3-LED traffic light: IO4=red, IO5=yellow, IO6=green
const int RED = 4, YELLOW = 5, GREEN = 6;

enum State { ST_RED, ST_GREEN, ST_YELLOW };
State state = ST_RED;
unsigned long stateStart = 0;

const unsigned long DURATIONS[] = { 4000, 3000, 1200 }; // red, green, yellow ms

void setLights(bool r, bool g, bool y) {
  digitalWrite(RED, r);
  digitalWrite(GREEN, g);
  digitalWrite(YELLOW, y);
}

void setup() {
  Serial.begin(115200);
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
  setLights(HIGH, LOW, LOW);
  stateStart = millis();
}

void loop() {
  unsigned long elapsed = millis() - stateStart;
  if (elapsed >= DURATIONS[state]) {
    state = (State)((state + 1) % 3);
    stateStart = millis();
    if (state == ST_RED)    { setLights(HIGH, LOW,  LOW);  Serial.println("RED");    }
    if (state == ST_GREEN)  { setLights(LOW,  HIGH, LOW);  Serial.println("GREEN");  }
    if (state == ST_YELLOW) { setLights(LOW,  LOW,  HIGH); Serial.println("YELLOW"); }
  }
}
`,
  },
  {
    name: 'Potentiometer -> Serial',
    build: buildPotSerial,
    code: `const int POT_PIN = 0; // analog-capable GPIO

void setup() {
  Serial.begin(115200);
}

void loop() {
  int v = analogRead(POT_PIN);
  Serial.println("pot = " + String(v));
  delay(200);
}
`,
  },
  {
    name: 'Servo sweep',
    build: buildServoSweep,
    code: `#include <Servo.h>
Servo myServo;

void setup() {
  myServo.attach(5); // SIG pin wired to IO5
}

void loop() {
  for (int a = 0; a <= 180; a += 5) {
    myServo.write(a);
    delay(20);
  }
  for (int a = 180; a >= 0; a -= 5) {
    myServo.write(a);
    delay(20);
  }
}
`,
  },
  {
    name: 'DHT11 + OLED',
    build: buildDht11Oled,
    code: `#include <DHT.h>
#include <Adafruit_SSD1306.h>

#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE); // DATA wired to IO4
Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  dht.begin();
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Temp: " + String(t, 1) + " C");
  display.setCursor(0, 13);
  display.println("Humidity: " + String(h, 0) + " %");
  display.display();
  delay(500);
}
`,
  },
  {
    name: 'Ultrasonic + Buzzer',
    build: buildUltrasonicBuzzer,
    code: `const int TRIG = 6, ECHO = 7, BUZZ = 10;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BUZZ, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duration = pulseIn(ECHO, HIGH);
  float distanceCm = duration / 58.0;
  Serial.println("distance = " + String(distanceCm, 1) + " cm");
  digitalWrite(BUZZ, distanceCm < 10 ? HIGH : LOW);
  delay(150);
}
`,
  },
  {
    name: 'Stepper via ULN2003',
    build: buildStepper,
    code: `// IN1-IN4 wired to IO4-IO7, driving ULN2003 IN1-IN4
int pins[] = {4, 5, 6, 7};
int seq[8][4] = {
  {1,0,0,0},{1,1,0,0},{0,1,0,0},{0,1,1,0},
  {0,0,1,0},{0,0,1,1},{0,0,0,1},{1,0,0,1},
};

void setup() {
  for (int i = 0; i < 4; i++) pinMode(pins[i], OUTPUT);
}

void loop() {
  for (int s = 0; s < 8; s++) {
    for (int i = 0; i < 4; i++) digitalWrite(pins[i], seq[s][i]);
    delay(3);
  }
}
`,
  },
  {
    name: '74HC595 -> LEDs',
    build: buildHC595,
    code: `const int DATA = 4, CLOCK = 5, LATCH = 6;

void setup() {
  pinMode(DATA, OUTPUT);
  pinMode(CLOCK, OUTPUT);
  pinMode(LATCH, OUTPUT);
}

void loop() {
  for (int i = 0; i < 8; i++) {
    digitalWrite(LATCH, LOW);
    shiftOut(DATA, CLOCK, MSBFIRST, 1 << i);
    digitalWrite(LATCH, HIGH);
    delay(120);
  }
}
`,
  },
  {
    name: 'IR Remote receiver',
    build: buildIRReceiver,
    code: `#include <IRremote.h>
IRrecv irrecv(9); // OUT pin wired to IO9
decode_results results;

void setup() {
  Serial.begin(115200);
  irrecv.enableIRIn();
}

void loop() {
  if (irrecv.decode(&results)) {
    Serial.println("IR received: " + String(results.name));
    irrecv.resume();
  }
}
`,
  },
  {
    name: 'RC522 RFID tap',
    build: buildRFID,
    code: `#include <MFRC522.h>
#define SS_PIN 8
#define RST_PIN 9
MFRC522 rfid(SS_PIN, RST_PIN); // SDA wired to IO8

void setup() {
  Serial.begin(115200);
  rfid.PCD_Init();
}

void loop() {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    Serial.print("Card UID:");
    for (int i = 0; i < rfid.uid.size; i++) {
      Serial.print(" ");
      Serial.print(rfid.uid.uidByte[i]);
    }
    Serial.println();
    rfid.PICC_HaltA();
  }
}
`,
  },
  {
    name: 'NeoPixel / WS2812B',
    code: `#include <Adafruit_NeoPixel.h>
// DATA pin of strip wired to IO8; strip has 8 LEDs
#define PIN     8
#define NUMPIXELS 8

Adafruit_NeoPixel strip(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  strip.begin();
  strip.setBrightness(80);
  strip.show();
}

void loop() {
  // Colour wipe: red -> green -> blue
  for (int c = 0; c < 3; c++) {
    for (int i = 0; i < NUMPIXELS; i++) {
      strip.setPixelColor(i,
        c == 0 ? strip.Color(255, 0, 0) :
        c == 1 ? strip.Color(0, 255, 0) :
                 strip.Color(0, 0, 255));
      strip.show();
      delay(80);
    }
  }
  // Rainbow chase
  for (int j = 0; j < 256; j++) {
    for (int i = 0; i < NUMPIXELS; i++) {
      strip.setPixelColor(i, strip.ColorHSV((i * 65536L / NUMPIXELS + j * 256) % 65536));
    }
    strip.show();
    delay(10);
  }
}
`,
  },
  {
    name: 'I2C Scanner',
    build: buildI2CScanner,
    code: `#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Wire.begin(); // SDA=IO8, SCL=IO9 (ESP32-C3 defaults)
  Serial.println("Scanning I2C bus...");

  int found = 0;
  for (int addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("Device at 0x");
      if (addr < 16) Serial.print("0");
      Serial.println(addr, HEX);
      found++;
    }
  }
  Serial.println(found == 0 ? "No devices found." : "Scan complete.");
}

void loop() {}
`,
  },
  {
    name: 'Debounce + Counter',
    build: buildDebounce,
    code: `// Button press counter with hardware debounce logic
// Button between IO3 and GND (INPUT_PULLUP)
const int BTN = 3;

int count = 0;
bool lastState = HIGH;
unsigned long lastChange = 0;
const unsigned long DEBOUNCE_MS = 50;

void setup() {
  Serial.begin(115200);
  pinMode(BTN, INPUT_PULLUP);
  Serial.println("Press button to count.");
}

void loop() {
  bool reading = digitalRead(BTN);
  if (reading != lastState) {
    lastChange = millis();
  }
  if ((millis() - lastChange) > DEBOUNCE_MS) {
    if (reading == LOW && lastState == HIGH) {
      count++;
      Serial.println("Count: " + String(count));
    }
    lastState = reading;
  }
  lastState = reading;
}
`,
  },
];
