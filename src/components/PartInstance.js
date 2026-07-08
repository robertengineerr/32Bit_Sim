import React from 'react';
import { catalog } from '../data/partsCatalog.js';
import { computePinPositions } from '../utils/pinLayout.js';
import Pin from './shared/Pin.js';
import PartBody from './parts/PartBody.js';
export default function PartInstance({
  part,
  resolve,
  selected,
  wireDraftPin,
  onPartMouseDown,
  onPinDown,
  onPinUp,
  onInteract
}) {
  const def = catalog[part.type];
  if (!def) return null;
  const positions = computePinPositions(def);
  const rotation = part.rotation || 0;
  const flipped = !!part.flipped;
  return /*#__PURE__*/React.createElement("g", {
    transform: `translate(${part.x} ${part.y})`
  }, /*#__PURE__*/React.createElement("g", {
    transform: `translate(${def.width / 2} ${def.height / 2}) rotate(${rotation}) scale(${flipped ? -1 : 1} 1) translate(${-def.width / 2} ${-def.height / 2})`
  }, /*#__PURE__*/React.createElement("g", {
    onMouseDown: e => {
      e.stopPropagation();
      onPartMouseDown(part.id, e);
    }
  }, selected && /*#__PURE__*/React.createElement("rect", {
    x: -6,
    y: -6,
    width: def.width + 12,
    height: def.height + 12,
    rx: 8,
    fill: "none",
    stroke: "#3b82f6",
    strokeWidth: 2,
    strokeDasharray: "4 3"
  }), /*#__PURE__*/React.createElement(PartBody, {
    part: part,
    def: def,
    resolve: resolve,
    onInteract: (action, payload) => onInteract(part.id, action, payload)
  }), /*#__PURE__*/React.createElement("text", {
    x: def.width / 2,
    y: -12,
    textAnchor: "middle",
    fontSize: 10,
    fill: "#475569"
  }, part.label || def.label)), def.pins.map(pin => {
    const pos = positions[pin.name];
    const level = resolve ? resolve.levelOf(part.id, pin.name) : null;
    const isEndpoint = wireDraftPin && wireDraftPin.partId === part.id && wireDraftPin.pin === pin.name;
    return /*#__PURE__*/React.createElement(Pin, {
      key: pin.name,
      x: pos.x,
      y: pos.y,
      name: pin.name,
      label: pin.label || pin.name,
      side: pin.side,
      rotation: rotation,
      flipped: flipped,
      level: level,
      isWireEndpoint: isEndpoint,
      onPinDown: name => onPinDown(part.id, name),
      onPinUp: name => onPinUp(part.id, name)
    });
  })));
}
