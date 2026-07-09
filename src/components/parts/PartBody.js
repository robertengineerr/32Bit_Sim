import React from 'react';
import { levelIsHigh } from '../../engine/simHelpers.js';
const LED_COLORS = {
  red: '#ff3b3b',
  white: '#f5f5f5',
  blue: '#3b82ff',
  green: '#37d67a',
  yellow: '#ffd83b'
};
function twoPinPowered(resolve, part, a = 'A', b = 'K') {
  if (!resolve) return {
    on: false,
    brightness: 0
  };
  const la = resolve.levelOf(part.id, a);
  const lb = resolve.levelOf(part.id, b);
  const aHot = levelIsHigh(la);
  const bGnd = lb.kind === 'gnd';
  const aVcc = la.kind === 'vcc';
  const bLow = lb.kind === 'gnd' || lb.kind === 'digital' && lb.value === 'LOW';
  const on = (aHot || aVcc) && (bGnd || bLow);
  let brightness = on ? 1 : 0;
  if (on && la.kind === 'pwm') brightness = la.value / 255;
  return {
    on,
    brightness
  };
}
export default function PartBody({
  part,
  def,
  resolve,
  onInteract
}) {
  const w = def.width,
    h = def.height;
  switch (def.render) {
    case 'esp32':
      {
        const running = part.state.running;
        const bootPressed = part.state.bootPressed;
        const rstPressed = part.state.rstPressed;
        const pressButton = (key, down) => (e) => {
          e.stopPropagation();
          onInteract && onInteract(down ? `${key}-down` : `${key}-up`);
        };
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 6,
          fill: "#1f2937",
          stroke: "#0f172a",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("rect", {
          x: w / 2 - 30,
          y: 10,
          width: 60,
          height: 40,
          rx: 3,
          fill: "#374151",
          stroke: "#111827"
        }), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: 34,
          textAnchor: "middle",
          fontSize: 9,
          fill: "#9ca3af"
        }, "ESP32-C3"), /*#__PURE__*/React.createElement("circle", {
          cx: w - 16,
          cy: 16,
          r: 4,
          fill: running ? '#37d67a' : '#4b5563'
        }), /*#__PURE__*/React.createElement("text", {
          x: w - 16,
          y: 26,
          textAnchor: "middle",
          fontSize: 6,
          fill: "#6b7280"
        }, "LED"), /*#__PURE__*/React.createElement("circle", {
          cx: 16,
          cy: 16,
          r: 4,
          fill: "#ef4444"
        }), /*#__PURE__*/React.createElement("text", {
          x: 16,
          y: 26,
          textAnchor: "middle",
          fontSize: 6,
          fill: "#6b7280"
        }, "PWR"), /*#__PURE__*/React.createElement("g", {
          onMouseDown: pressButton('boot', true),
          onMouseUp: pressButton('boot', false),
          onMouseLeave: () => bootPressed && onInteract && onInteract('boot-up'),
          style: { cursor: 'pointer' }
        }, /*#__PURE__*/React.createElement("rect", {
          x: w / 2 - 34,
          y: h - 34,
          width: 26,
          height: 14,
          rx: 2,
          fill: bootPressed ? '#facc15' : '#4b5563',
          stroke: "#111827"
        }), /*#__PURE__*/React.createElement("text", {
          x: w / 2 - 21,
          y: h - 38,
          textAnchor: "middle",
          fontSize: 6,
          fill: "#9ca3af"
        }, "BOOT")), /*#__PURE__*/React.createElement("g", {
          onMouseDown: pressButton('rst', true),
          onMouseUp: pressButton('rst', false),
          onMouseLeave: () => rstPressed && onInteract && onInteract('rst-up'),
          style: { cursor: 'pointer' }
        }, /*#__PURE__*/React.createElement("rect", {
          x: w / 2 + 8,
          y: h - 34,
          width: 26,
          height: 14,
          rx: 2,
          fill: rstPressed ? '#f87171' : '#4b5563',
          stroke: "#111827"
        }), /*#__PURE__*/React.createElement("text", {
          x: w / 2 + 21,
          y: h - 38,
          textAnchor: "middle",
          fontSize: 6,
          fill: "#9ca3af"
        }, "RST")), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h - 12,
          textAnchor: "middle",
          fontSize: 9,
          fill: "#6b7280"
        }, "USB-C"), /*#__PURE__*/React.createElement("rect", {
          x: w / 2 - 14,
          y: h - 8,
          width: 28,
          height: 10,
          rx: 2,
          fill: "#4b5563"
        }));
      }
    case 'oled':
      {
        const fb = part.state.framebuffer;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 4,
          fill: "#111827",
          stroke: "#374151",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("rect", {
          x: 10,
          y: 8,
          width: w - 20,
          height: h - 26,
          fill: "#001b0f"
        }), fb && fb.text && fb.text.map((line, i) => /*#__PURE__*/React.createElement("text", {
          key: i,
          x: 16,
          y: 22 + i * 12,
          fontSize: 10,
          fill: "#39ff88",
          fontFamily: "monospace"
        }, line)), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h - 6,
          textAnchor: "middle",
          fontSize: 7,
          fill: "#6b7280"
        }, "SSD1306 128x64"));
      }
    case 'stepper':
      {
        const angle = part.state.angle || 0;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: w / 2 - 4,
          fill: "#334155",
          stroke: "#0f172a",
          strokeWidth: 3
        }), /*#__PURE__*/React.createElement("g", {
          transform: `rotate(${angle} ${w / 2} ${h / 2})`
        }, /*#__PURE__*/React.createElement("rect", {
          x: w / 2 - 3,
          y: 6,
          width: 6,
          height: h / 2 - 10,
          fill: "#facc15"
        }), /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: 5,
          fill: "#facc15"
        })), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h + 14,
          textAnchor: "middle",
          fontSize: 9,
          fill: "#6b7280"
        }, "28BYJ-48"));
      }
    case 'servo':
      {
        const angle = part.state.angle ?? 90;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 4,
          fill: "#2563eb",
          stroke: "#1e3a8a",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2 - 6,
          r: 12,
          fill: "#1e3a8a"
        }), /*#__PURE__*/React.createElement("g", {
          transform: `rotate(${angle - 90} ${w / 2} ${h / 2 - 6})`
        }, /*#__PURE__*/React.createElement("rect", {
          x: w / 2 - 2,
          y: h / 2 - 6 - 22,
          width: 4,
          height: 22,
          fill: "#e5e7eb"
        })), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h - 8,
          textAnchor: "middle",
          fontSize: 8,
          fill: "#dbeafe"
        }, "SG90 ", Math.round(angle), "\xB0"));
      }
    case 'fan':
      {
        const speed = part.state.speed || 0;
        const dur = speed > 0 ? Math.max(0.08, 0.6 / speed) : 0;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: w / 2 - 2,
          fill: "#0f172a"
        }), /*#__PURE__*/React.createElement("g", {
          style: {
            transformOrigin: `${w / 2}px ${h / 2}px`,
            animation: speed > 0 ? `spin ${dur}s linear infinite` : 'none'
          }
        }, [0, 90, 180, 270].map(a => /*#__PURE__*/React.createElement("ellipse", {
          key: a,
          cx: w / 2,
          cy: h / 2,
          rx: w / 2 - 8,
          ry: 6,
          fill: "#94a3b8",
          transform: `rotate(${a} ${w / 2} ${h / 2})`
        }))), /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: 6,
          fill: "#334155"
        }));
      }
    case 'buzzer':
      {
        const active = resolve && twoPinPowered(resolve, part, '+', '-').on;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: w / 2 - 2,
          fill: active ? '#f59e0b' : '#78716c',
          stroke: "#1f2937",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: 6,
          fill: "#1f2937"
        }), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h + 12,
          textAnchor: "middle",
          fontSize: 8,
          fill: "#6b7280"
        }, part.state.variant === 'active' ? 'Active' : 'Passive'));
      }
    case 'irremote':
      {
        const buttons = ['POWER', 'UP', 'DOWN', 'LEFT', 'OK', 'RIGHT', '1', '2', '3'];
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 10,
          fill: "#1f2937",
          stroke: "#0f172a",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: 16,
          r: 4,
          fill: "#7f1d1d"
        }), buttons.map((b, i) => {
          const col = i % 3,
            row = Math.floor(i / 3);
          const bx = 14 + col * ((w - 28) / 2);
          const by = 32 + row * 26;
          return /*#__PURE__*/React.createElement("g", {
            key: b,
            onMouseDown: e => {
              e.stopPropagation();
              onInteract && onInteract('ir-press', b);
            },
            style: {
              cursor: 'pointer'
            }
          }, /*#__PURE__*/React.createElement("rect", {
            x: bx,
            y: by,
            width: (w - 28) / 2 - 4,
            height: 20,
            rx: 4,
            fill: "#374151",
            stroke: "#4b5563"
          }), /*#__PURE__*/React.createElement("text", {
            x: bx + ((w - 28) / 2 - 4) / 2,
            y: by + 14,
            textAnchor: "middle",
            fontSize: 7,
            fill: "#d1d5db"
          }, b));
        }));
      }
    case 'joystick':
      {
        const kx = 10 + (part.state.x ?? 0.5) * (w - 20);
        const ky = 10 + (1 - (part.state.y ?? 0.5)) * (h - 20 - 20);
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h - 20,
          rx: 6,
          fill: "#374151",
          stroke: "#111827",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("circle", {
          cx: kx,
          cy: ky,
          r: 12,
          fill: part.state.pressed ? '#ef4444' : '#9ca3af',
          style: {
            cursor: 'grab'
          },
          onMouseDown: e => {
            e.stopPropagation();
            onInteract && onInteract('joystick-drag-start');
          }
        }));
      }
    case 'rfid':
      {
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 4,
          fill: "#0ea5e9",
          stroke: "#0369a1",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("rect", {
          x: 12,
          y: 12,
          width: w - 24,
          height: h - 40,
          fill: "#0c4a6e"
        }), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h - 10,
          textAnchor: "middle",
          fontSize: 9,
          fill: "#e0f2fe",
          style: {
            cursor: 'pointer',
            textDecoration: 'underline'
          },
          onMouseDown: e => {
            e.stopPropagation();
            onInteract && onInteract('rfid-tap');
          }
        }, "Tap Card"));
      }
    case 'membrane':
      {
        const pressed = part.state.pressed;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 6,
          fill: "#0f766e",
          stroke: "#134e4a",
          strokeWidth: 2
        }), [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => {
          const key = `${r},${c}`;
          const bx = 10 + c * ((w - 20) / 4);
          const by = 10 + r * ((h - 20) / 4);
          const labels = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'];
          return /*#__PURE__*/React.createElement("g", {
            key: key,
            onMouseDown: e => {
              e.stopPropagation();
              onInteract && onInteract('membrane-down', key);
            },
            onMouseUp: e => {
              e.stopPropagation();
              onInteract && onInteract('membrane-up', key);
            },
            style: {
              cursor: 'pointer'
            }
          }, /*#__PURE__*/React.createElement("rect", {
            x: bx,
            y: by,
            width: (w - 20) / 4 - 3,
            height: (h - 20) / 4 - 3,
            rx: 2,
            fill: pressed.has(key) ? '#22d3ee' : '#115e59',
            stroke: "#0f172a"
          }), /*#__PURE__*/React.createElement("text", {
            x: bx + 8,
            y: by + 14,
            fontSize: 8,
            fill: "#ecfeff"
          }, labels[r * 4 + c]));
        })));
      }
    case 'button':
      {
        const active = part.state.active;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 6,
          fill: "#78350f",
          stroke: "#451a03",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: w / 2 - 8,
          fill: active ? '#f87171' : '#e5e7eb',
          stroke: "#374151",
          strokeWidth: 2,
          style: {
            cursor: 'pointer'
          },
          onMouseDown: e => {
            e.stopPropagation();
            onInteract && onInteract('down');
          },
          onMouseUp: e => {
            e.stopPropagation();
            onInteract && onInteract('up');
          },
          onMouseLeave: () => active && onInteract && onInteract('up')
        }));
      }
    case 'potentiometer':
      {
        const val = part.state.value ?? 0.5;
        const angle = -135 + val * 270;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 6,
          fill: "#1e293b",
          stroke: "#0f172a",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2 - 6,
          r: w / 2 - 14,
          fill: "#475569"
        }), /*#__PURE__*/React.createElement("g", {
          transform: `rotate(${angle} ${w / 2} ${h / 2 - 6})`
        }, /*#__PURE__*/React.createElement("rect", {
          x: w / 2 - 2,
          y: h / 2 - 6 - (w / 2 - 16),
          width: 4,
          height: w / 2 - 16,
          fill: "#facc15"
        })), /*#__PURE__*/React.createElement("foreignObject", {
          x: -4,
          y: h - 14,
          width: w + 8,
          height: 20
        }, /*#__PURE__*/React.createElement("input", {
          type: "range",
          min: 0,
          max: 100,
          value: Math.round(val * 100),
          onMouseDown: e => e.stopPropagation(),
          onChange: e => onInteract && onInteract('set', Number(e.target.value) / 100),
          style: {
            width: '100%'
          }
        })));
      }
    case 'sevenseg1':
      {
        const segNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
        const segs = {};
        if (resolve) for (const s of segNames) segs[s] = levelIsHigh(resolve.levelOf(part.id, s));
        return /*#__PURE__*/React.createElement(SevenSeg, {
          w: w,
          h: h,
          digits: [segs]
        });
      }
    case 'sevenseg4':
      {
        const segNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
        const pattern = {};
        if (resolve) for (const s of segNames) pattern[s] = levelIsHigh(resolve.levelOf(part.id, s));
        const digits = [1, 2, 3, 4].map(n => {
          const active = resolve && resolve.levelOf(part.id, `D${n}`).kind === 'digital' && resolve.levelOf(part.id, `D${n}`).value === 'LOW';
          return active ? pattern : {};
        });
        return /*#__PURE__*/React.createElement(SevenSeg, {
          w: w,
          h: h,
          digits: digits
        });
      }
    case 'breadboard':
      {
        // New 20-row mini breadboard render
        // Board dimensions: w=360, h=370
        const BB_ROWS = 20;
        const BB_SPACING = 16;
        const BB_Y0 = 32;
        // Left strip columns: a=64, b=82, c=100(skip-pin), d=118, e=136
        // Right strip columns: f=196, g=214, h=232(skip-pin), i=250, j=268
        // Power rails: LP=20, LN=38, RP=322, RN=304
        const leftCols = [64, 82, 100, 118, 136];
        const rightCols = [196, 214, 232, 250, 268];
        const leftColNames = ['a', 'b', 'c', 'd', 'e'];
        const rightColNames = ['f', 'g', 'h', 'i', 'j'];
        // Skip col c (x=100) and col h (x=232) since Pin dot renders there
        const skipLeftX = 100;
        const skipRightX = 232;

        const elements = [];

        // Board background
        elements.push(/*#__PURE__*/React.createElement("rect", {
          key: "board",
          x: 0, y: 0, width: w, height: h,
          rx: 6, fill: "#0a1a08", stroke: "#0f2a0d", strokeWidth: 2
        }));

        // Left power rail + (red strip)
        elements.push(/*#__PURE__*/React.createElement("rect", {
          key: "lrail-plus",
          x: 8, y: 18, width: 20, height: 330,
          fill: "#3f0808"
        }));
        // Left power rail - (blue strip)
        elements.push(/*#__PURE__*/React.createElement("rect", {
          key: "lrail-minus",
          x: 30, y: 18, width: 20, height: 330,
          fill: "#081830"
        }));

        // Left power rail holes
        for (let n = 1; n <= BB_ROWS; n++) {
          const ry = BB_Y0 + (n - 1) * BB_SPACING;
          elements.push(/*#__PURE__*/React.createElement("circle", {
            key: `lp-${n}`, cx: 18, cy: ry, r: 2.5, fill: "#7f1d1d"
          }));
          elements.push(/*#__PURE__*/React.createElement("circle", {
            key: `ln-${n}`, cx: 39, cy: ry, r: 2.5, fill: "#1e3a5f"
          }));
        }

        // Left strip holes (5 cols x 20 rows), skip col c (x=100)
        for (let n = 1; n <= BB_ROWS; n++) {
          const ry = BB_Y0 + (n - 1) * BB_SPACING;
          for (const cx of leftCols) {
            if (cx === skipLeftX) continue; // pin dot renders here
            elements.push(/*#__PURE__*/React.createElement("circle", {
              key: `ls-${n}-${cx}`, cx, cy: ry, r: 2.5, fill: "#1a0e05"
            }));
          }
        }

        // Center trench
        elements.push(/*#__PURE__*/React.createElement("rect", {
          key: "trench",
          x: 148, y: 18, width: 46, height: 330,
          fill: "#050d05"
        }));

        // Right strip holes (5 cols x 20 rows), skip col h (x=232)
        for (let n = 1; n <= BB_ROWS; n++) {
          const ry = BB_Y0 + (n - 1) * BB_SPACING;
          for (const cx of rightCols) {
            if (cx === skipRightX) continue; // pin dot renders here
            elements.push(/*#__PURE__*/React.createElement("circle", {
              key: `rs-${n}-${cx}`, cx, cy: ry, r: 2.5, fill: "#1a0e05"
            }));
          }
        }

        // Right power rail - (blue strip at x=292)
        elements.push(/*#__PURE__*/React.createElement("rect", {
          key: "rrail-minus",
          x: 282, y: 18, width: 20, height: 330,
          fill: "#081830"
        }));
        // Right power rail + (red strip at x=314)
        elements.push(/*#__PURE__*/React.createElement("rect", {
          key: "rrail-plus",
          x: 304, y: 18, width: 20, height: 330,
          fill: "#3f0808"
        }));

        // Right power rail holes
        for (let n = 1; n <= BB_ROWS; n++) {
          const ry = BB_Y0 + (n - 1) * BB_SPACING;
          elements.push(/*#__PURE__*/React.createElement("circle", {
            key: `rn-${n}`, cx: 292, cy: ry, r: 2.5, fill: "#1e3a5f"
          }));
          elements.push(/*#__PURE__*/React.createElement("circle", {
            key: `rp-${n}`, cx: 315, cy: ry, r: 2.5, fill: "#7f1d1d"
          }));
        }

        // Row numbers 1-20
        for (let n = 1; n <= BB_ROWS; n++) {
          const ry = BB_Y0 + (n - 1) * BB_SPACING;
          elements.push(/*#__PURE__*/React.createElement("text", {
            key: `rn-lbl-${n}`, x: 56, y: ry + 4,
            fontSize: 7, fill: "#2d4a2d", textAnchor: "middle"
          }, n));
          elements.push(/*#__PURE__*/React.createElement("text", {
            key: `rn-rlbl-${n}`, x: 278, y: ry + 4,
            fontSize: 7, fill: "#2d4a2d", textAnchor: "middle"
          }, n));
        }

        // Column labels left: a b c d e
        leftCols.forEach((cx, i) => {
          elements.push(/*#__PURE__*/React.createElement("text", {
            key: `lcol-${i}`, x: cx, y: 14,
            fontSize: 7, fill: "#2d4a2d", textAnchor: "middle"
          }, leftColNames[i]));
        });
        // Column labels right: f g h i j
        rightCols.forEach((cx, i) => {
          elements.push(/*#__PURE__*/React.createElement("text", {
            key: `rcol-${i}`, x: cx, y: 14,
            fontSize: 7, fill: "#2d4a2d", textAnchor: "middle"
          }, rightColNames[i]));
        });

        return /*#__PURE__*/React.createElement("g", null, ...elements);
      }
    case 'capacitor':
      {
        // Schematic symbol: two vertical plates with leads
        // w=50, h=40
        const vc = (part.state && part.state.vc != null) ? part.state.vc : 0;
        return /*#__PURE__*/React.createElement("g", null,
          // Dark background
          /*#__PURE__*/React.createElement("rect", {
            x: 0, y: 0, width: w, height: h,
            rx: 3, fill: "#111827", stroke: "#1f2937", strokeWidth: 1
          }),
          // Left lead: x=0,y=h/2 to x=15,y=h/2
          /*#__PURE__*/React.createElement("line", {
            x1: 0, y1: h / 2, x2: 15, y2: h / 2,
            stroke: "#a8a29e", strokeWidth: 2
          }),
          // Left plate (vertical line at x=18)
          /*#__PURE__*/React.createElement("line", {
            x1: 18, y1: 4, x2: 18, y2: h - 4,
            stroke: "#e2e8f0", strokeWidth: 3
          }),
          // Right plate (vertical line at x=32)
          /*#__PURE__*/React.createElement("line", {
            x1: 32, y1: 4, x2: 32, y2: h - 4,
            stroke: "#e2e8f0", strokeWidth: 3
          }),
          // Right lead: x=35,y=h/2 to x=w,y=h/2
          /*#__PURE__*/React.createElement("line", {
            x1: 35, y1: h / 2, x2: w, y2: h / 2,
            stroke: "#a8a29e", strokeWidth: 2
          }),
          // Voltage label
          /*#__PURE__*/React.createElement("text", {
            x: w / 2, y: h - 3,
            textAnchor: "middle", fontSize: 7, fill: "#22c55e"
          }, vc.toFixed(2), "V")
        );
      }
    case 'voltmeter':
      {
        // w=90, h=60
        let voltDisplay = '---';
        if (resolve) {
          const vPlus = resolve.voltageOf(part.id, '+');
          const vMinus = resolve.voltageOf(part.id, '-');
          if (vPlus !== null && vMinus !== null) {
            voltDisplay = (vPlus - vMinus).toFixed(2) + 'V';
          }
        }
        return /*#__PURE__*/React.createElement("g", null,
          // Body background
          /*#__PURE__*/React.createElement("rect", {
            x: 0, y: 0, width: w, height: h,
            rx: 4, fill: "#1a3a1a", stroke: "#0f2a0d", strokeWidth: 2
          }),
          // "V" label
          /*#__PURE__*/React.createElement("text", {
            x: w / 2, y: 14,
            textAnchor: "middle", fontSize: 10, fill: "#22c55e", fontWeight: "bold"
          }, "V"),
          // Display box
          /*#__PURE__*/React.createElement("rect", {
            x: 8, y: 20, width: w - 16, height: 26,
            rx: 3, fill: "#050d05", stroke: "#22c55e", strokeWidth: 1
          }),
          // Voltage reading
          /*#__PURE__*/React.createElement("text", {
            x: w / 2, y: 37,
            textAnchor: "middle", fontSize: 11, fill: "#22c55e", fontFamily: "monospace"
          }, voltDisplay)
        );
      }
    case 'resistor':
      {
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
          x1: 0,
          y1: h / 2,
          x2: w,
          y2: h / 2,
          stroke: "#a8a29e",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("rect", {
          x: 10,
          y: 4,
          width: w - 20,
          height: h - 8,
          rx: 3,
          fill: "#e7d8b1",
          stroke: "#78716c"
        }), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h / 2 + 3,
          textAnchor: "middle",
          fontSize: 8,
          fill: "#44403c"
        }, part.state.value, "\u03A9"));
      }
    case 'diode':
      {
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
          x1: 0,
          y1: h / 2,
          x2: w,
          y2: h / 2,
          stroke: "#a8a29e",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("rect", {
          x: 12,
          y: 4,
          width: w - 24,
          height: h - 8,
          fill: "#1f2937"
        }), /*#__PURE__*/React.createElement("rect", {
          x: w - 16,
          y: 2,
          width: 3,
          height: h - 4,
          fill: "#d1d5db"
        }));
      }
    case 'transistor':
      {
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: w / 2 - 2,
          fill: "#374151",
          stroke: "#111827",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h / 2 + 3,
          textAnchor: "middle",
          fontSize: 7,
          fill: "#d1d5db"
        }, "NPN"));
      }
    case 'sensor2pin':
      {
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 4,
          y: 0,
          width: w - 8,
          height: h - 16,
          rx: 4,
          fill: "#fde68a",
          stroke: "#a16207",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("line", {
          x1: w / 2 - 6,
          y1: h - 16,
          x2: w / 2 - 6,
          y2: h,
          stroke: "#a8a29e",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("line", {
          x1: w / 2 + 6,
          y1: h - 16,
          x2: w / 2 + 6,
          y2: h,
          stroke: "#a8a29e",
          strokeWidth: 2
        }));
      }
    case 'led':
      {
        const {
          on,
          brightness
        } = resolve ? twoPinPowered(resolve, part) : {
          on: false,
          brightness: 0
        };
        const color = LED_COLORS[part.state.color] || LED_COLORS.red;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
          d: `M ${w / 2 - 12} ${h - 4} L ${w / 2 - 12} ${h / 2} A 12 12 0 1 1 ${w / 2 + 12} ${h / 2} L ${w / 2 + 12} ${h - 4} Z`,
          fill: on ? color : '#4b5563',
          opacity: on ? 0.5 + brightness * 0.5 : 0.5,
          stroke: "#1f2937",
          strokeWidth: 1.5
        }), on && /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2 - 4,
          r: 16,
          fill: color,
          opacity: 0.25 * brightness
        }));
      }
    case 'rgbled':
      {
        const r = resolve ? twoPinPowered(resolve, part, 'R', 'GND') : {
          on: false,
          brightness: 0
        };
        const g = resolve ? twoPinPowered(resolve, part, 'G', 'GND') : {
          on: false,
          brightness: 0
        };
        const b = resolve ? twoPinPowered(resolve, part, 'B', 'GND') : {
          on: false,
          brightness: 0
        };
        const mix = `rgb(${r.on ? 255 * r.brightness : 30}, ${g.on ? 255 * g.brightness : 30}, ${b.on ? 255 * b.brightness : 30})`;
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
          cx: w / 2,
          cy: h / 2,
          r: w / 2 - 4,
          fill: mix,
          stroke: "#1f2937",
          strokeWidth: 1.5
        }));
      }
    case 'generic-chip':
    default:
      {
        return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
          x: 0,
          y: 0,
          width: w,
          height: h,
          rx: 4,
          fill: "#334155",
          stroke: "#0f172a",
          strokeWidth: 2
        }), /*#__PURE__*/React.createElement("text", {
          x: w / 2,
          y: h / 2,
          textAnchor: "middle",
          fontSize: 9,
          fill: "#e2e8f0"
        }, def.label.split(' ')[0]));
      }
  }
}
function SevenSeg({
  w,
  h,
  digits
}) {
  const segColor = on => on ? '#ff2b2b' : '#3f1414';
  const digitW = w / digits.length;
  return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: 0,
    y: 0,
    width: w,
    height: h,
    rx: 4,
    fill: "#111827"
  }), digits.map((segs, i) => {
    const ox = i * digitW + digitW * 0.15;
    const sw = digitW * 0.7,
      sh = h * 0.7,
      oy = h * 0.12;
    const t = 4;
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("rect", {
      x: ox + t,
      y: oy,
      width: sw - 2 * t,
      height: t,
      fill: segColor(segs.a)
    }), /*#__PURE__*/React.createElement("rect", {
      x: ox + sw - t,
      y: oy + t,
      width: t,
      height: sh / 2 - t,
      fill: segColor(segs.b)
    }), /*#__PURE__*/React.createElement("rect", {
      x: ox + sw - t,
      y: oy + sh / 2,
      width: t,
      height: sh / 2 - t,
      fill: segColor(segs.c)
    }), /*#__PURE__*/React.createElement("rect", {
      x: ox + t,
      y: oy + sh - t,
      width: sw - 2 * t,
      height: t,
      fill: segColor(segs.d)
    }), /*#__PURE__*/React.createElement("rect", {
      x: ox,
      y: oy + sh / 2,
      width: t,
      height: sh / 2 - t,
      fill: segColor(segs.e)
    }), /*#__PURE__*/React.createElement("rect", {
      x: ox,
      y: oy + t,
      width: t,
      height: sh / 2 - t,
      fill: segColor(segs.f)
    }), /*#__PURE__*/React.createElement("rect", {
      x: ox + t,
      y: oy + sh / 2 - t / 2,
      width: sw - 2 * t,
      height: t,
      fill: segColor(segs.g)
    }), /*#__PURE__*/React.createElement("circle", {
      cx: ox + sw + 4,
      cy: oy + sh,
      r: 2.5,
      fill: segColor(segs.dp)
    }));
  }));
}