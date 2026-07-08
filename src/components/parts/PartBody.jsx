import React from 'react';
import { levelIsHigh } from '../../engine/simHelpers.js';

const LED_COLORS = {
  red: '#ff3b3b', white: '#f5f5f5', blue: '#3b82ff', green: '#37d67a', yellow: '#ffd83b',
};

function twoPinPowered(resolve, part, a = 'A', b = 'K') {
  if (!resolve) return { on: false, brightness: 0 };
  const la = resolve.levelOf(part.id, a);
  const lb = resolve.levelOf(part.id, b);
  const aHot = levelIsHigh(la);
  const bGnd = lb.kind === 'gnd';
  const aVcc = la.kind === 'vcc';
  const bLow = lb.kind === 'gnd' || (lb.kind === 'digital' && lb.value === 'LOW');
  const on = (aHot || aVcc) && (bGnd || bLow);
  let brightness = on ? 1 : 0;
  if (on && la.kind === 'pwm') brightness = la.value / 255;
  return { on, brightness };
}

export default function PartBody({ part, def, resolve, onInteract }) {
  const w = def.width, h = def.height;

  switch (def.render) {
    case 'esp32': {
      const running = part.state.running;
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={6} fill="#1f2937" stroke="#0f172a" strokeWidth={2} />
          <rect x={w / 2 - 30} y={10} width={60} height={40} rx={3} fill="#374151" stroke="#111827" />
          <text x={w / 2} y={34} textAnchor="middle" fontSize={9} fill="#9ca3af">ESP32-C3</text>
          <circle cx={w - 16} cy={16} r={5} fill={running ? '#37d67a' : '#4b5563'} />
          <text x={w / 2} y={h - 12} textAnchor="middle" fontSize={9} fill="#6b7280">USB-C</text>
          <rect x={w / 2 - 14} y={h - 8} width={28} height={10} rx={2} fill="#4b5563" />
        </g>
      );
    }

    case 'oled': {
      const fb = part.state.framebuffer;
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={4} fill="#111827" stroke="#374151" strokeWidth={2} />
          <rect x={10} y={8} width={w - 20} height={h - 26} fill="#001b0f" />
          {fb && fb.text && fb.text.map((line, i) => (
            <text key={i} x={16} y={22 + i * 12} fontSize={10} fill="#39ff88" fontFamily="monospace">{line}</text>
          ))}
          <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={7} fill="#6b7280">SSD1306 128x64</text>
        </g>
      );
    }

    case 'stepper': {
      const angle = part.state.angle || 0;
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={w / 2 - 4} fill="#334155" stroke="#0f172a" strokeWidth={3} />
          <g transform={`rotate(${angle} ${w / 2} ${h / 2})`}>
            <rect x={w / 2 - 3} y={6} width={6} height={h / 2 - 10} fill="#facc15" />
            <circle cx={w / 2} cy={h / 2} r={5} fill="#facc15" />
          </g>
          <text x={w / 2} y={h + 14} textAnchor="middle" fontSize={9} fill="#6b7280">28BYJ-48</text>
        </g>
      );
    }

    case 'servo': {
      const angle = part.state.angle ?? 90;
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={4} fill="#2563eb" stroke="#1e3a8a" strokeWidth={2} />
          <circle cx={w / 2} cy={h / 2 - 6} r={12} fill="#1e3a8a" />
          <g transform={`rotate(${angle - 90} ${w / 2} ${h / 2 - 6})`}>
            <rect x={w / 2 - 2} y={h / 2 - 6 - 22} width={4} height={22} fill="#e5e7eb" />
          </g>
          <text x={w / 2} y={h - 8} textAnchor="middle" fontSize={8} fill="#dbeafe">SG90 {Math.round(angle)}°</text>
        </g>
      );
    }

    case 'fan': {
      const speed = part.state.speed || 0;
      const dur = speed > 0 ? Math.max(0.08, 0.6 / speed) : 0;
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill="#0f172a" />
          <g style={{ transformOrigin: `${w / 2}px ${h / 2}px`, animation: speed > 0 ? `spin ${dur}s linear infinite` : 'none' }}>
            {[0, 90, 180, 270].map((a) => (
              <ellipse key={a} cx={w / 2} cy={h / 2} rx={w / 2 - 8} ry={6} fill="#94a3b8" transform={`rotate(${a} ${w / 2} ${h / 2})`} />
            ))}
          </g>
          <circle cx={w / 2} cy={h / 2} r={6} fill="#334155" />
        </g>
      );
    }

    case 'buzzer': {
      const active = resolve && twoPinPowered(resolve, part, '+', '-').on;
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill={active ? '#f59e0b' : '#78716c'} stroke="#1f2937" strokeWidth={2} />
          <circle cx={w / 2} cy={h / 2} r={6} fill="#1f2937" />
          <text x={w / 2} y={h + 12} textAnchor="middle" fontSize={8} fill="#6b7280">{part.state.variant === 'active' ? 'Active' : 'Passive'}</text>
        </g>
      );
    }

    case 'irremote': {
      const buttons = ['POWER', 'UP', 'DOWN', 'LEFT', 'OK', 'RIGHT', '1', '2', '3'];
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={10} fill="#1f2937" stroke="#0f172a" strokeWidth={2} />
          <circle cx={w / 2} cy={16} r={4} fill="#7f1d1d" />
          {buttons.map((b, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const bx = 14 + col * ((w - 28) / 2);
            const by = 32 + row * 26;
            return (
              <g key={b} onMouseDown={(e) => { e.stopPropagation(); onInteract && onInteract('ir-press', b); }} style={{ cursor: 'pointer' }}>
                <rect x={bx} y={by} width={(w - 28) / 2 - 4} height={20} rx={4} fill="#374151" stroke="#4b5563" />
                <text x={bx + ((w - 28) / 2 - 4) / 2} y={by + 14} textAnchor="middle" fontSize={7} fill="#d1d5db">{b}</text>
              </g>
            );
          })}
        </g>
      );
    }

    case 'joystick': {
      const kx = 10 + (part.state.x ?? 0.5) * (w - 20);
      const ky = 10 + (1 - (part.state.y ?? 0.5)) * (h - 20 - 20);
      return (
        <g>
          <rect x={0} y={0} width={w} height={h - 20} rx={6} fill="#374151" stroke="#111827" strokeWidth={2} />
          <circle
            cx={kx} cy={ky} r={12} fill={part.state.pressed ? '#ef4444' : '#9ca3af'}
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => { e.stopPropagation(); onInteract && onInteract('joystick-drag-start'); }}
          />
        </g>
      );
    }

    case 'rfid': {
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={4} fill="#0ea5e9" stroke="#0369a1" strokeWidth={2} />
          <rect x={12} y={12} width={w - 24} height={h - 40} fill="#0c4a6e" />
          <text
            x={w / 2} y={h - 10} textAnchor="middle" fontSize={9} fill="#e0f2fe" style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onMouseDown={(e) => { e.stopPropagation(); onInteract && onInteract('rfid-tap'); }}
          >
            Tap Card
          </text>
        </g>
      );
    }

    case 'membrane': {
      const pressed = part.state.pressed;
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={6} fill="#0f766e" stroke="#134e4a" strokeWidth={2} />
          {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => {
            const key = `${r},${c}`;
            const bx = 10 + c * ((w - 20) / 4);
            const by = 10 + r * ((h - 20) / 4);
            const labels = ['1','2','3','A','4','5','6','B','7','8','9','C','*','0','#','D'];
            return (
              <g key={key}
                onMouseDown={(e) => { e.stopPropagation(); onInteract && onInteract('membrane-down', key); }}
                onMouseUp={(e) => { e.stopPropagation(); onInteract && onInteract('membrane-up', key); }}
                style={{ cursor: 'pointer' }}
              >
                <rect x={bx} y={by} width={(w - 20) / 4 - 3} height={(h - 20) / 4 - 3} rx={2} fill={pressed.has(key) ? '#22d3ee' : '#115e59'} stroke="#0f172a" />
                <text x={bx + 8} y={by + 14} fontSize={8} fill="#ecfeff">{labels[r * 4 + c]}</text>
              </g>
            );
          }))}
        </g>
      );
    }

    case 'button': {
      const active = part.state.active;
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={6} fill="#78350f" stroke="#451a03" strokeWidth={2} />
          <circle
            cx={w / 2} cy={h / 2} r={w / 2 - 8} fill={active ? '#f87171' : '#e5e7eb'} stroke="#374151" strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onMouseDown={(e) => { e.stopPropagation(); onInteract && onInteract('down'); }}
            onMouseUp={(e) => { e.stopPropagation(); onInteract && onInteract('up'); }}
            onMouseLeave={() => active && onInteract && onInteract('up')}
          />
        </g>
      );
    }

    case 'potentiometer': {
      const val = part.state.value ?? 0.5;
      const angle = -135 + val * 270;
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={6} fill="#1e293b" stroke="#0f172a" strokeWidth={2} />
          <circle cx={w / 2} cy={h / 2 - 6} r={w / 2 - 14} fill="#475569" />
          <g transform={`rotate(${angle} ${w / 2} ${h / 2 - 6})`}>
            <rect x={w / 2 - 2} y={h / 2 - 6 - (w / 2 - 16)} width={4} height={w / 2 - 16} fill="#facc15" />
          </g>
          <foreignObject x={-4} y={h - 14} width={w + 8} height={20}>
            <input
              type="range" min={0} max={100} value={Math.round(val * 100)}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => onInteract && onInteract('set', Number(e.target.value) / 100)}
              style={{ width: '100%' }}
            />
          </foreignObject>
        </g>
      );
    }

    case 'sevenseg1': {
      const segNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
      const segs = {};
      if (resolve) for (const s of segNames) segs[s] = levelIsHigh(resolve.levelOf(part.id, s));
      return <SevenSeg w={w} h={h} digits={[segs]} />;
    }
    case 'sevenseg4': {
      const segNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
      const pattern = {};
      if (resolve) for (const s of segNames) pattern[s] = levelIsHigh(resolve.levelOf(part.id, s));
      const digits = [1, 2, 3, 4].map((n) => {
        const active = resolve && resolve.levelOf(part.id, `D${n}`).kind === 'digital' && resolve.levelOf(part.id, `D${n}`).value === 'LOW';
        return active ? pattern : {};
      });
      return <SevenSeg w={w} h={h} digits={digits} />;
    }

    case 'breadboard': {
      const cols = 30, rows = 10;
      const dots = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        dots.push(<circle key={`${r}-${c}`} cx={16 + c * ((w - 32) / cols)} cy={26 + r * ((h - 52) / rows)} r={1.4} fill="#94a3b8" />);
      }
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={6} fill="#e5e7eb" stroke="#cbd5e1" strokeWidth={2} />
          <rect x={8} y={6} width={w - 16} height={12} fill="#fca5a5" opacity={0.5} />
          <rect x={8} y={h - 18} width={w - 16} height={12} fill="#93c5fd" opacity={0.5} />
          {dots}
        </g>
      );
    }

    case 'resistor': {
      return (
        <g>
          <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="#a8a29e" strokeWidth={2} />
          <rect x={10} y={4} width={w - 20} height={h - 8} rx={3} fill="#e7d8b1" stroke="#78716c" />
          <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fontSize={8} fill="#44403c">{part.state.value}Ω</text>
        </g>
      );
    }

    case 'diode': {
      return (
        <g>
          <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="#a8a29e" strokeWidth={2} />
          <rect x={12} y={4} width={w - 24} height={h - 8} fill="#1f2937" />
          <rect x={w - 16} y={2} width={3} height={h - 4} fill="#d1d5db" />
        </g>
      );
    }

    case 'transistor': {
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={w / 2 - 2} fill="#374151" stroke="#111827" strokeWidth={2} />
          <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fontSize={7} fill="#d1d5db">NPN</text>
        </g>
      );
    }

    case 'sensor2pin': {
      return (
        <g>
          <rect x={4} y={0} width={w - 8} height={h - 16} rx={4} fill="#fde68a" stroke="#a16207" strokeWidth={2} />
          <line x1={w / 2 - 6} y1={h - 16} x2={w / 2 - 6} y2={h} stroke="#a8a29e" strokeWidth={2} />
          <line x1={w / 2 + 6} y1={h - 16} x2={w / 2 + 6} y2={h} stroke="#a8a29e" strokeWidth={2} />
        </g>
      );
    }

    case 'led': {
      const { on, brightness } = resolve ? twoPinPowered(resolve, part) : { on: false, brightness: 0 };
      const color = LED_COLORS[part.state.color] || LED_COLORS.red;
      return (
        <g>
          <path d={`M ${w/2-12} ${h-4} L ${w/2-12} ${h/2} A 12 12 0 1 1 ${w/2+12} ${h/2} L ${w/2+12} ${h-4} Z`}
            fill={on ? color : '#4b5563'} opacity={on ? 0.5 + brightness * 0.5 : 0.5} stroke="#1f2937" strokeWidth={1.5} />
          {on && <circle cx={w / 2} cy={h / 2 - 4} r={16} fill={color} opacity={0.25 * brightness} />}
        </g>
      );
    }

    case 'rgbled': {
      const r = resolve ? twoPinPowered(resolve, part, 'R', 'GND') : { on: false, brightness: 0 };
      const g = resolve ? twoPinPowered(resolve, part, 'G', 'GND') : { on: false, brightness: 0 };
      const b = resolve ? twoPinPowered(resolve, part, 'B', 'GND') : { on: false, brightness: 0 };
      const mix = `rgb(${r.on ? 255 * r.brightness : 30}, ${g.on ? 255 * g.brightness : 30}, ${b.on ? 255 * b.brightness : 30})`;
      return (
        <g>
          <circle cx={w / 2} cy={h / 2} r={w / 2 - 4} fill={mix} stroke="#1f2937" strokeWidth={1.5} />
        </g>
      );
    }

    case 'generic-chip':
    default: {
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={4} fill="#334155" stroke="#0f172a" strokeWidth={2} />
          <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={9} fill="#e2e8f0">{def.label.split(' ')[0]}</text>
        </g>
      );
    }
  }
}

function SevenSeg({ w, h, digits }) {
  const segColor = (on) => (on ? '#ff2b2b' : '#3f1414');
  const digitW = w / digits.length;
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} rx={4} fill="#111827" />
      {digits.map((segs, i) => {
        const ox = i * digitW + digitW * 0.15;
        const sw = digitW * 0.7, sh = h * 0.7, oy = h * 0.12;
        const t = 4;
        return (
          <g key={i}>
            <rect x={ox + t} y={oy} width={sw - 2 * t} height={t} fill={segColor(segs.a)} />
            <rect x={ox + sw - t} y={oy + t} width={t} height={sh / 2 - t} fill={segColor(segs.b)} />
            <rect x={ox + sw - t} y={oy + sh / 2} width={t} height={sh / 2 - t} fill={segColor(segs.c)} />
            <rect x={ox + t} y={oy + sh - t} width={sw - 2 * t} height={t} fill={segColor(segs.d)} />
            <rect x={ox} y={oy + sh / 2} width={t} height={sh / 2 - t} fill={segColor(segs.e)} />
            <rect x={ox} y={oy + t} width={t} height={sh / 2 - t} fill={segColor(segs.f)} />
            <rect x={ox + t} y={oy + sh / 2 - t / 2} width={sw - 2 * t} height={t} fill={segColor(segs.g)} />
            <circle cx={ox + sw + 4} cy={oy + sh} r={2.5} fill={segColor(segs.dp)} />
          </g>
        );
      })}
    </g>
  );
}
