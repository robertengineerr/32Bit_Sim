import React from 'react';

const KIND_COLOR = {
  gnd: '#374151', vcc: '#ef4444', digital: '#22c55e', pwm: '#a855f7', analog: '#3b82f6', floating: '#94a3b8',
};

export default function Pin({ x, y, name, label, level, isWireEndpoint, onPinDown, onPinUp }) {
  const color = level ? (level.kind === 'digital' && level.value === 'LOW' ? '#6b7280' : KIND_COLOR[level.kind]) : '#94a3b8';
  return (
    <g
      transform={`translate(${x} ${y})`}
      onMouseDown={(e) => { e.stopPropagation(); onPinDown && onPinDown(name); }}
      onMouseUp={(e) => { e.stopPropagation(); onPinUp && onPinUp(name); }}
      style={{ cursor: 'crosshair' }}
    >
      <circle r={9} fill="transparent" />
      <circle r={4} fill={color} stroke={isWireEndpoint ? '#facc15' : '#111827'} strokeWidth={isWireEndpoint ? 2 : 1} />
      <title>{label || name}</title>
    </g>
  );
}
