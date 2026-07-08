import React from 'react';
const BUTTONS = [
  { key: 'rotate-ccw', glyph: '↺', title: 'Rotate left' },
  { key: 'rotate-cw', glyph: '↻', title: 'Rotate right' },
  { key: 'flip', glyph: '⇄', title: 'Flip horizontal' },
  { key: 'duplicate', glyph: 'D', title: 'Duplicate' },
  { key: 'delete', glyph: '\xD7', title: 'Delete' }
];
export default function SelectionToolbar({
  x,
  y,
  onRotateCcw,
  onRotateCw,
  onFlip,
  onDuplicate,
  onDelete
}) {
  const handlers = {
    'rotate-ccw': onRotateCcw,
    'rotate-cw': onRotateCw,
    flip: onFlip,
    duplicate: onDuplicate,
    delete: onDelete
  };
  const spacing = 26;
  const startX = x - (spacing * (BUTTONS.length - 1)) / 2;
  return /*#__PURE__*/React.createElement("g", {
    transform: `translate(${startX} ${y})`
  }, BUTTONS.map((b, i) => /*#__PURE__*/React.createElement("g", {
    key: b.key,
    className: b.key === 'delete' ? undefined : 'selection-toolbar-btn',
    transform: `translate(${i * spacing} 0)`,
    onMouseDown: e => {
      e.stopPropagation();
      handlers[b.key] && handlers[b.key]();
    },
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    r: 10,
    fill: b.key === 'delete' ? '#ef4444' : '#1f2937',
    stroke: b.key === 'delete' ? '#b91c1c' : '#475569',
    strokeWidth: 1.5
  }), /*#__PURE__*/React.createElement("text", {
    x: 0,
    y: 4,
    textAnchor: "middle",
    fontSize: 11,
    fill: "white"
  }, b.glyph), /*#__PURE__*/React.createElement("title", null, b.title))));
}
