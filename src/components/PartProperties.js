import React from 'react';
import { catalog } from '../data/partsCatalog.js';
import { PART_VARIANTS } from '../data/variants.js';
const PROPERTY_FIELDS = {
  dht11: [{
    key: 'temperature',
    label: 'Temperature (°C)',
    min: -10,
    max: 50,
    step: 1
  }, {
    key: 'humidity',
    label: 'Humidity (%)',
    min: 0,
    max: 100,
    step: 1
  }],
  ultrasonic: [{
    key: 'distanceCm',
    label: 'Distance (cm)',
    min: 2,
    max: 400,
    step: 1
  }],
  photoresistor: [{
    key: 'light',
    label: 'Light level',
    min: 0,
    max: 1,
    step: 0.01
  }],
  thermistor: [{
    key: 'tempC',
    label: 'Temperature (°C)',
    min: -20,
    max: 120,
    step: 1
  }],
  potentiometer: [{
    key: 'value',
    label: 'Knob position',
    min: 0,
    max: 1,
    step: 0.01
  }]
};
export default function PartProperties({
  selectedIds,
  simulator,
  bump
}) {
  const count = selectedIds.size;
  if (count === 0) return /*#__PURE__*/React.createElement("div", {
    className: "props-panel dim"
  }, "Select a part to see its properties.");
  if (count > 1) return /*#__PURE__*/React.createElement("div", {
    className: "props-panel dim"
  }, count, " parts selected — use the toolbar above the selection to rotate, flip, duplicate, or delete.");
  const part = simulator.getPart([...selectedIds][0]);
  if (!part) return null;
  const def = catalog[part.type];
  const variant = PART_VARIANTS[part.type];
  const fields = PROPERTY_FIELDS[part.type];
  return /*#__PURE__*/React.createElement("div", {
    className: "props-panel"
  }, /*#__PURE__*/React.createElement("label", {
    className: "props-field"
  }, /*#__PURE__*/React.createElement("span", null, "Name"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: part.label || '',
    placeholder: def.label,
    onChange: e => {
      part.label = e.target.value || null;
      bump();
    }
  })), variant && /*#__PURE__*/React.createElement("label", {
    className: "props-field"
  }, /*#__PURE__*/React.createElement("span", null, "Variant"), /*#__PURE__*/React.createElement("select", {
    value: part.state[variant.key],
    onChange: e => {
      part.state[variant.key] = e.target.value;
      bump();
    }
  }, variant.options.map(v => /*#__PURE__*/React.createElement("option", {
    key: v,
    value: v
  }, variant.formatLabel ? variant.formatLabel(v) : v)))), !fields && !variant && /*#__PURE__*/React.createElement("div", {
    className: "props-hint"
  }, def.label, " — no other adjustable properties."), fields && fields.map(f => /*#__PURE__*/React.createElement("label", {
    key: f.key,
    className: "props-field"
  }, /*#__PURE__*/React.createElement("span", null, f.label, ": ", Number(part.state[f.key]).toFixed(f.step < 1 ? 2 : 0)), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: f.min,
    max: f.max,
    step: f.step,
    value: part.state[f.key],
    onChange: e => {
      part.state[f.key] = Number(e.target.value);
      bump();
    }
  }))));
}
