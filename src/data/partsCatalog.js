// The parts catalog: one entry per placeable component type.
//
// Each entry describes:
//   - label / category / dims (px) for the generic renderer
//   - pins: [{ name, side: 'left'|'right'|'top'|'bottom', label? }]
//   - render: which visual component to use (see components/parts/PartRenderer.jsx)
//   - initialState(): the part's mutable runtime state
//   - getPinDrive(part, pinName): what this pin actively drives onto its net (or null)
//   - getConnectors(part, prevLevels, partById): dynamic pin-pairs to short together this tick
//
// This is what makes the sim work without a full SPICE-level circuit solver:
// most components either (a) source a level (power, ESP32 GPIO, sensors) or
// (b) act as a switch that conditionally shorts two of its pins together.

import { GND, VCC, digital, pwm, analog, levelIsHigh, manualSwitchConnectors, controlledSwitchConnectors, readControlLevel } from '../engine/simHelpers.js';

const ESP32_GPIO_MAP = {
  IO0: 0, IO1: 1, IO2: 2, IO3: 3, IO4: 4, IO5: 5, IO6: 6, IO7: 7, IO8: 8, IO9: 9, IO10: 10,
  IO18: 18, IO19: 19, IO20: 20, IO21: 21,
};

function esp32PinDrive(part, pinName) {
  if (pinName === '3V3' || pinName === '5V') return VCC;
  if (pinName.startsWith('GND')) return GND;
  const gpio = ESP32_GPIO_MAP[pinName];
  if (gpio === undefined) return null;
  const p = part.state.pins[gpio];
  if (!p) return null;
  if (p.mode !== 'OUTPUT') return null;
  if (p.pwmValue !== null && p.pwmValue !== undefined) return pwm(p.pwmValue);
  return digital(p.value === 1 ? 'HIGH' : 'LOW');
}

export const catalog = {
  esp32c3: {
    label: 'ESP32-C3 Dev Board',
    category: 'Boards',
    width: 190, height: 260,
    render: 'esp32',
    pins: [
      { name: 'GND1', side: 'left', label: 'GND' },
      { name: '3V3', side: 'left', label: '3V3' },
      { name: 'IO4', side: 'left', label: 'IO4' },
      { name: 'IO5', side: 'left', label: 'IO5' },
      { name: 'IO6', side: 'left', label: 'IO6' },
      { name: 'IO7', side: 'left', label: 'IO7' },
      { name: 'IO8', side: 'left', label: 'IO8 (SDA)' },
      { name: 'IO9', side: 'left', label: 'IO9 (SCL)' },
      { name: 'IO10', side: 'left', label: 'IO10' },
      { name: '5V', side: 'right', label: '5V' },
      { name: 'GND2', side: 'right', label: 'GND' },
      { name: 'EN', side: 'right', label: 'EN' },
      { name: 'IO0', side: 'right', label: 'IO0' },
      { name: 'IO1', side: 'right', label: 'IO1' },
      { name: 'IO2', side: 'right', label: 'IO2' },
      { name: 'IO3', side: 'right', label: 'IO3' },
      { name: 'IO18', side: 'right', label: 'IO18' },
      { name: 'IO19', side: 'right', label: 'IO19' },
      { name: 'IO20', side: 'right', label: 'IO20 (RX)' },
      { name: 'IO21', side: 'right', label: 'IO21 (TX)' },
    ],
    initialState: () => ({
      pins: Object.fromEntries([0,1,2,3,4,5,6,7,8,9,10,18,19,20,21].map((n) => [n, { mode: 'INPUT', value: 0, pwmValue: null }])),
      wireConfig: null, // { sda, scl } set by Wire.begin()
      running: false,
    }),
    getPinDrive: esp32PinDrive,
  },

  oled: {
    label: '0.96" OLED Display (SSD1306, I2C)',
    category: 'Displays',
    width: 130, height: 80,
    render: 'oled',
    pins: [
      { name: 'GND', side: 'bottom' },
      { name: 'VCC', side: 'bottom' },
      { name: 'SCL', side: 'bottom' },
      { name: 'SDA', side: 'bottom' },
    ],
    initialState: () => ({ framebuffer: null, cursorX: 0, cursorY: 0 }),
    getPinDrive: () => null,
  },

  gy6500: {
    label: 'GY-6500 IMU Module (Accel/Gyro)',
    category: 'Sensors',
    width: 90, height: 70,
    render: 'generic-chip',
    pins: [
      { name: 'VCC', side: 'top' },
      { name: 'GND', side: 'top' },
      { name: 'SCL', side: 'bottom' },
      { name: 'SDA', side: 'bottom' },
    ],
    initialState: () => ({ tiltX: 0, tiltY: 0 }),
    getPinDrive: () => null,
  },

  powersupply: {
    label: 'Power Supply Module',
    category: 'Power',
    width: 110, height: 60,
    render: 'generic-chip',
    pins: [
      { name: '5V', side: 'right' },
      { name: '3V3', side: 'right' },
      { name: 'GND', side: 'left' },
    ],
    initialState: () => ({}),
    getPinDrive: (part, pin) => (pin === 'GND' ? GND : VCC),
  },

  battery9v: {
    label: '9V Battery + Snap Clip',
    category: 'Power',
    width: 80, height: 60,
    render: 'generic-chip',
    pins: [
      { name: '+', side: 'right' },
      { name: '-', side: 'left' },
    ],
    initialState: () => ({}),
    getPinDrive: (part, pin) => (pin === '-' ? GND : VCC),
  },

  usbcable: {
    label: 'USB A-to-C Cable (power)',
    category: 'Power',
    width: 90, height: 40,
    render: 'generic-chip',
    pins: [
      { name: '5V', side: 'right' },
      { name: 'GND', side: 'left' },
    ],
    initialState: () => ({}),
    getPinDrive: (part, pin) => (pin === 'GND' ? GND : VCC),
  },

  uln2003: {
    label: 'ULN2003 Stepper Driver',
    category: 'Motor Drivers',
    width: 110, height: 90,
    render: 'generic-chip',
    pins: [
      { name: 'IN1', side: 'left' }, { name: 'IN2', side: 'left' },
      { name: 'IN3', side: 'left' }, { name: 'IN4', side: 'left' },
      { name: 'GND', side: 'left' },
      { name: 'OUT1', side: 'right' }, { name: 'OUT2', side: 'right' },
      { name: 'OUT3', side: 'right' }, { name: 'OUT4', side: 'right' },
      { name: 'V+', side: 'right' },
    ],
    initialState: () => ({}),
    getPinDrive: () => null,
  },

  stepper: {
    label: '28BYJ-48 Stepper Motor',
    category: 'Motors',
    width: 90, height: 90,
    render: 'stepper',
    pins: [
      { name: 'A', side: 'left' }, { name: 'B', side: 'left' },
      { name: 'C', side: 'right' }, { name: 'D', side: 'right' },
    ],
    initialState: () => ({ angle: 0, lastPattern: null }),
    getPinDrive: () => null,
  },

  servo: {
    label: 'Servo Motor SG90',
    category: 'Motors',
    width: 90, height: 80,
    render: 'servo',
    pins: [
      { name: 'GND', side: 'bottom' },
      { name: 'VCC', side: 'bottom' },
      { name: 'SIG', side: 'bottom' },
    ],
    initialState: () => ({ angle: 90 }),
    getPinDrive: () => null,
  },

  relay: {
    label: '5V Relay Module',
    category: 'Actuators',
    width: 110, height: 80,
    render: 'generic-chip',
    pins: [
      { name: 'GND', side: 'left' }, { name: 'VCC', side: 'left' }, { name: 'IN', side: 'left' },
      { name: 'COM', side: 'right' }, { name: 'NO', side: 'right' }, { name: 'NC', side: 'right' },
    ],
    initialState: () => ({}),
    getConnectors: (part, prevLevels) => {
      const energized = levelIsHigh(readControlLevel(prevLevels, part.id, 'IN'));
      return energized ? [['COM', 'NO']] : [['COM', 'NC']];
    },
    getPinDrive: () => null,
  },

  irrecv: {
    label: 'IR Receive Module',
    category: 'IR',
    width: 70, height: 60,
    render: 'generic-chip',
    pins: [
      { name: 'OUT', side: 'bottom' }, { name: 'VCC', side: 'bottom' }, { name: 'GND', side: 'bottom' },
    ],
    initialState: () => ({}),
    getPinDrive: () => null,
  },

  irremote: {
    label: 'IR Remote Control',
    category: 'IR',
    width: 90, height: 160,
    render: 'irremote',
    pins: [],
    initialState: () => ({}),
    getPinDrive: () => null,
  },

  joystick: {
    label: 'Joystick Module',
    category: 'Input',
    width: 100, height: 100,
    render: 'joystick',
    pins: [
      { name: 'GND', side: 'bottom' }, { name: '+5V', side: 'bottom' },
      { name: 'VRX', side: 'bottom' }, { name: 'VRY', side: 'bottom' }, { name: 'SW', side: 'bottom' },
    ],
    initialState: () => ({ x: 0.5, y: 0.5, pressed: false }),
    getConnectors: manualSwitchConnectors('SW', 'GND'),
    getPinDrive: (part, pin) => {
      if (pin === 'VRX') return analog(Math.round(part.state.x * 4095));
      if (pin === 'VRY') return analog(Math.round(part.state.y * 4095));
      return null;
    },
  },

  dht11: {
    label: 'DHT11 Temp/Humidity Sensor',
    category: 'Sensors',
    width: 70, height: 90,
    render: 'generic-chip',
    pins: [
      { name: 'VCC', side: 'left' }, { name: 'DATA', side: 'left' }, { name: 'GND', side: 'left' },
    ],
    initialState: () => ({ temperature: 24, humidity: 50 }),
    getPinDrive: () => null,
  },

  ultrasonic: {
    label: 'HC-SR04 Ultrasonic Sensor',
    category: 'Sensors',
    width: 110, height: 60,
    render: 'generic-chip',
    pins: [
      { name: 'VCC', side: 'bottom' }, { name: 'TRIG', side: 'bottom' },
      { name: 'ECHO', side: 'bottom' }, { name: 'GND', side: 'bottom' },
    ],
    initialState: () => ({ distanceCm: 50 }),
    getPinDrive: () => null,
  },

  fanmotor: {
    label: 'Fan Blade + 3-6V DC Motor',
    category: 'Motors',
    width: 90, height: 90,
    render: 'fan',
    pins: [
      { name: '+', side: 'bottom' }, { name: '-', side: 'bottom' },
    ],
    initialState: () => ({ speed: 0 }),
    getPinDrive: () => null,
  },

  buzzeractive: {
    label: 'Active Buzzer',
    category: 'Output',
    width: 60, height: 60,
    render: 'buzzer',
    pins: [{ name: '+', side: 'bottom' }, { name: '-', side: 'bottom' }],
    initialState: () => ({ variant: 'active' }),
    getPinDrive: () => null,
  },

  buzzerpassive: {
    label: 'Passive Buzzer',
    category: 'Output',
    width: 60, height: 60,
    render: 'buzzer',
    pins: [{ name: '+', side: 'bottom' }, { name: '-', side: 'bottom' }],
    initialState: () => ({ variant: 'passive' }),
    getPinDrive: () => null,
  },

  hc595: {
    label: '74HC595 Shift Register',
    category: 'Logic',
    width: 130, height: 90,
    render: 'generic-chip',
    pins: [
      { name: 'Q0', side: 'top' }, { name: 'Q1', side: 'top' }, { name: 'Q2', side: 'top' }, { name: 'Q3', side: 'top' },
      { name: 'Q4', side: 'top' }, { name: 'Q5', side: 'top' }, { name: 'Q6', side: 'top' }, { name: 'Q7', side: 'top' },
      { name: 'GND', side: 'bottom' }, { name: 'DS', side: 'bottom' }, { name: 'SH_CP', side: 'bottom' },
      { name: 'ST_CP', side: 'bottom' }, { name: 'OE', side: 'bottom' }, { name: 'MR', side: 'bottom' }, { name: 'VCC', side: 'bottom' },
    ],
    initialState: () => ({ bits: [0, 0, 0, 0, 0, 0, 0, 0], shifting: 0 }),
    getPinDrive: (part, pin) => {
      const idx = pin.startsWith('Q') ? Number(pin.slice(1)) : -1;
      if (idx >= 0 && idx <= 7) return digital(part.state.bits[idx] ? 'HIGH' : 'LOW');
      return null;
    },
  },

  l293d: {
    label: 'L293D Motor Driver',
    category: 'Motor Drivers',
    width: 130, height: 90,
    render: 'generic-chip',
    pins: [
      { name: 'EN1', side: 'top' }, { name: 'IN1', side: 'top' }, { name: 'IN2', side: 'top' },
      { name: 'IN3', side: 'bottom' }, { name: 'IN4', side: 'bottom' }, { name: 'EN2', side: 'bottom' },
      { name: 'OUT1', side: 'left' }, { name: 'OUT2', side: 'left' },
      { name: 'OUT3', side: 'right' }, { name: 'OUT4', side: 'right' },
      { name: 'VCC', side: 'left' }, { name: 'GND', side: 'right' },
    ],
    initialState: () => ({}),
    // OUTn is a buffered mirror of INn (enable pins are ignored for simplicity)
    getPinDrive: (part, pin, prevLevels) => {
      const map = { OUT1: 'IN1', OUT2: 'IN2', OUT3: 'IN3', OUT4: 'IN4' };
      const src = map[pin];
      if (!src) return null;
      const level = readControlLevel(prevLevels, part.id, src);
      if (!level) return null;
      if (level.kind === 'gnd') return digital('LOW');
      if (level.kind === 'vcc') return digital('HIGH');
      if (level.kind === 'digital') return digital(level.value);
      if (level.kind === 'pwm') return pwm(level.value);
      return null;
    },
  },

  rc522: {
    label: 'RC522 RFID Module (SPI)',
    category: 'Sensors',
    width: 110, height: 90,
    render: 'rfid',
    pins: [
      { name: '3.3V', side: 'top' }, { name: 'RST', side: 'top' }, { name: 'GND', side: 'top' },
      { name: 'MISO', side: 'bottom' }, { name: 'MOSI', side: 'bottom' }, { name: 'SCK', side: 'bottom' }, { name: 'SDA', side: 'bottom' },
    ],
    initialState: () => ({ tapped: false, uid: 'DE AD BE 02' }),
    getPinDrive: () => null,
  },

  membrane: {
    label: 'Membrane Switch Module (4x4)',
    category: 'Input',
    width: 130, height: 130,
    render: 'membrane',
    pins: [
      { name: 'R1', side: 'left' }, { name: 'R2', side: 'left' }, { name: 'R3', side: 'left' }, { name: 'R4', side: 'left' },
      { name: 'C1', side: 'right' }, { name: 'C2', side: 'right' }, { name: 'C3', side: 'right' }, { name: 'C4', side: 'right' },
    ],
    initialState: () => ({ pressed: new Set() }),
    getConnectors: (part) => {
      const pairs = [];
      for (const key of part.state.pressed) {
        const [r, c] = key.split(',').map(Number);
        pairs.push([`R${r + 1}`, `C${c + 1}`]);
      }
      return pairs;
    },
    getPinDrive: () => null,
  },

  pir: {
    label: 'HC-SR501 PIR Motion Sensor',
    category: 'Sensors',
    width: 90, height: 60,
    render: 'generic-chip',
    pins: [{ name: 'VCC', side: 'bottom' }, { name: 'OUT', side: 'bottom' }, { name: 'GND', side: 'bottom' }],
    initialState: () => ({ motion: false }),
    getPinDrive: (part, pin) => (pin === 'OUT' ? digital(part.state.motion ? 'HIGH' : 'LOW') : null),
  },

  button: {
    label: 'Push Button',
    category: 'Input',
    width: 50, height: 50,
    render: 'button',
    pins: [
      { name: 'A1', side: 'left' }, { name: 'A2', side: 'right' },
    ],
    initialState: () => ({ active: false }),
    getConnectors: manualSwitchConnectors('A1', 'A2'),
    getPinDrive: () => null,
  },

  potentiometer: {
    label: 'Potentiometer 10K',
    category: 'Input',
    width: 70, height: 70,
    render: 'potentiometer',
    pins: [{ name: 'GND', side: 'bottom' }, { name: 'WIPER', side: 'bottom' }, { name: 'VCC', side: 'bottom' }],
    initialState: () => ({ value: 0.5 }),
    getPinDrive: (part, pin) => (pin === 'WIPER' ? analog(Math.round(part.state.value * 4095)) : null),
  },

  sevenseg1: {
    label: '1-Digit 7-Segment Display',
    category: 'Displays',
    width: 60, height: 90,
    render: 'sevenseg1',
    pins: [
      { name: 'a', side: 'top' }, { name: 'b', side: 'top' }, { name: 'c', side: 'top' }, { name: 'd', side: 'top' },
      { name: 'e', side: 'bottom' }, { name: 'f', side: 'bottom' }, { name: 'g', side: 'bottom' }, { name: 'dp', side: 'bottom' },
      { name: 'COM', side: 'right' },
    ],
    initialState: () => ({}),
    getPinDrive: () => null,
  },

  sevenseg4: {
    label: '4-Digit 7-Segment Display',
    category: 'Displays',
    width: 150, height: 90,
    render: 'sevenseg4',
    pins: [
      { name: 'a', side: 'top' }, { name: 'b', side: 'top' }, { name: 'c', side: 'top' }, { name: 'd', side: 'top' },
      { name: 'e', side: 'top' }, { name: 'f', side: 'top' }, { name: 'g', side: 'top' }, { name: 'dp', side: 'top' },
      { name: 'D1', side: 'bottom' }, { name: 'D2', side: 'bottom' }, { name: 'D3', side: 'bottom' }, { name: 'D4', side: 'bottom' },
    ],
    initialState: () => ({}),
    getPinDrive: () => null,
  },

  tilt: {
    label: 'Tilt Ball Switch',
    category: 'Input',
    width: 50, height: 50,
    render: 'button',
    pins: [{ name: 'A1', side: 'left' }, { name: 'A2', side: 'right' }],
    initialState: () => ({ active: false }),
    getConnectors: manualSwitchConnectors('A1', 'A2'),
    getPinDrive: () => null,
  },

  breadboard: {
    label: '400 Tie-Point Breadboard',
    category: 'Prototyping',
    width: 380, height: 130,
    render: 'breadboard',
    pins: [
      { name: 'TOP+', side: 'top' }, { name: 'TOP-', side: 'top' },
      { name: 'BOT+', side: 'bottom' }, { name: 'BOT-', side: 'bottom' },
    ],
    initialState: () => ({}),
    getPinDrive: () => null,
  },

  resistor: {
    label: 'Resistor',
    category: 'Passive',
    width: 60, height: 30,
    render: 'resistor',
    pins: [{ name: 'A', side: 'left' }, { name: 'B', side: 'right' }],
    initialState: (value = '220') => ({ value }),
    getConnectors: (part) => [['A', 'B']],
    getPinDrive: () => null,
  },

  led: {
    label: 'LED',
    category: 'Output',
    width: 40, height: 50,
    render: 'led',
    pins: [{ name: 'A', side: 'bottom', label: '+' }, { name: 'K', side: 'bottom', label: '-' }],
    initialState: (color = 'red') => ({ color }),
    getPinDrive: () => null,
  },

  rgbled: {
    label: 'RGB LED',
    category: 'Output',
    width: 50, height: 50,
    render: 'rgbled',
    pins: [
      { name: 'R', side: 'bottom' }, { name: 'GND', side: 'bottom' },
      { name: 'G', side: 'bottom' }, { name: 'B', side: 'bottom' },
    ],
    initialState: () => ({}),
    getPinDrive: () => null,
  },

  thermistor: {
    label: 'Thermistor',
    category: 'Passive',
    width: 40, height: 50,
    render: 'sensor2pin',
    pins: [{ name: 'A', side: 'bottom' }, { name: 'B', side: 'bottom' }],
    initialState: () => ({ tempC: 24 }),
    getPinDrive: (part, pin) => (pin === 'A' ? analog(Math.round(((part.state.tempC + 20) / 140) * 4095)) : null),
  },

  photoresistor: {
    label: 'Photoresistor (LDR)',
    category: 'Passive',
    width: 40, height: 50,
    render: 'sensor2pin',
    pins: [{ name: 'A', side: 'bottom' }, { name: 'B', side: 'bottom' }],
    initialState: () => ({ light: 0.6 }),
    getPinDrive: (part, pin) => (pin === 'A' ? analog(Math.round(part.state.light * 4095)) : null),
  },

  diode: {
    label: 'Diode Rectifier',
    category: 'Passive',
    width: 50, height: 30,
    render: 'diode',
    pins: [{ name: 'A', side: 'left' }, { name: 'K', side: 'right' }],
    initialState: () => ({}),
    getConnectors: (part, prevLevels) => {
      // conducts anode->cathode only when forward biased (simplified: anode net HIGH-ish)
      const level = readControlLevel(prevLevels, part.id, 'A');
      if (!prevLevels) return [['A', 'K']];
      return levelIsHigh(level) ? [['A', 'K']] : [];
    },
    getPinDrive: () => null,
  },

  transistor: {
    label: 'NPN Transistor (PN2222)',
    category: 'Passive',
    width: 40, height: 50,
    render: 'transistor',
    pins: [{ name: 'B', side: 'left' }, { name: 'C', side: 'top' }, { name: 'E', side: 'bottom' }],
    initialState: () => ({}),
    getConnectors: controlledSwitchConnectors('B', 'C', 'E'),
    getPinDrive: () => null,
  },
};

export const CATEGORY_ORDER = [
  'Boards', 'Power', 'Prototyping', 'Displays', 'Sensors', 'Input', 'Output',
  'Motors', 'Motor Drivers', 'Actuators', 'IR', 'Logic', 'Passive',
];
