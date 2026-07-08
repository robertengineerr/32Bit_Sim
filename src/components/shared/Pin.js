import React from 'react';
const KIND_COLOR = {
  gnd: '#374151',
  vcc: '#ef4444',
  digital: '#22c55e',
  pwm: '#a855f7',
  analog: '#3b82f6',
  floating: '#94a3b8'
};
const SIDE_LABEL = {
  left: { x: -13, y: 3, anchor: 'end' },
  right: { x: 13, y: 3, anchor: 'start' },
  top: { x: 0, y: -11, anchor: 'middle' },
  bottom: { x: 0, y: 17, anchor: 'middle' }
};
export default function Pin({
  x,
  y,
  name,
  label,
  side,
  rotation,
  flipped,
  level,
  isWireEndpoint,
  onPinDown,
  onPinUp
}) {
  const color = level ? level.kind === 'digital' && level.value === 'LOW' ? '#6b7280' : KIND_COLOR[level.kind] : '#94a3b8';
  const lp = SIDE_LABEL[side] || SIDE_LABEL.bottom;
  return /*#__PURE__*/React.createElement("g", {
    transform: `translate(${x} ${y})`,
    onMouseDown: e => {
      e.stopPropagation();
      onPinDown && onPinDown(name);
    },
    onMouseUp: e => {
      e.stopPropagation();
      onPinUp && onPinUp(name);
    },
    style: {
      cursor: 'crosshair'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    r: 9,
    fill: "transparent"
  }), /*#__PURE__*/React.createElement("circle", {
    r: 4,
    fill: color,
    stroke: isWireEndpoint ? '#facc15' : '#111827',
    strokeWidth: isWireEndpoint ? 2 : 1
  }), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${lp.x} ${lp.y})`,
    style: {
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("g", {
    transform: `scale(${flipped ? -1 : 1} 1) rotate(${-(rotation || 0)})`
  }, /*#__PURE__*/React.createElement("text", {
    textAnchor: lp.anchor,
    fontSize: 7,
    fill: "#94a3b8"
  }, label || name))), /*#__PURE__*/React.createElement("title", null, label || name));
}
