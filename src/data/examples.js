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

export const CODE_SNIPPETS = {
  'Blink (built-in style)': `const int LED_PIN = 2;

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
  'Potentiometer -> Serial': `const int POT_PIN = 0; // analog-capable GPIO

void setup() {
  Serial.begin(115200);
}

void loop() {
  int v = analogRead(POT_PIN);
  Serial.println("pot = " + String(v));
  delay(200);
}
`,
  'Servo sweep': `#include <Servo.h>
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
  'DHT11 + OLED': `#include <DHT.h>
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
  'Ultrasonic + Buzzer': `const int TRIG = 6, ECHO = 7, BUZZ = 10;

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
  'Stepper via ULN2003': `// IN1-IN4 wired to any 4 GPIOs, in that order, driving ULN2003 IN1-IN4
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
  '74HC595 -> LEDs': `const int DATA = 4, CLOCK = 5, LATCH = 6;

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
  'IR Remote receiver': `#include <IRremote.h>
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
  'RC522 RFID tap': `#include <MFRC522.h>
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
};
